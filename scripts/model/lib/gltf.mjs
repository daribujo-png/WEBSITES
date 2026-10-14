/**
 * SceneNode tree → glTF 2.0 binary, compressed with Meshopt.
 *
 * Two output layouts:
 *  - "parts" (default): one mesh node per part and material, named after the
 *    part (e.g. `interior_bad_glassvegg`). The render harness uses this layout,
 *    because its shots hide and clip parts by name.
 *  - "merged" (the live site): one mesh per material inside each layer group,
 *    each construction-only group (`extras.hideFrom`) and each environment
 *    group. Mesh nodes are named `<group>_<material>` (e.g. `kledning_cladding_wood`,
 *    `tomt_stikning_stake_wood`, `env_birches_birch_leaf`). The eleven birches
 *    become one group, `env_birches`. Every primitive carries COLOR_0 (white
 *    where the material has no vertex colours), so every house material
 *    compiles to the same shader variant.
 *
 * Pipeline: build document → dedup (accessors/meshes) → weld → prune →
 * reorder + quantize + EXT_meshopt_compression.
 */
import { Document, NodeIO, PropertyType } from "@gltf-transform/core";
import { ALL_EXTENSIONS, EXTMeshGPUInstancing, KHRMaterialsEmissiveStrength } from "@gltf-transform/extensions";
import { dedup, meshopt, prune, weld } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptDecoder } from "meshoptimizer";
import * as THREE from "three";
import fs from "node:fs/promises";
import { MeshBuilder, SceneNode, cullBuried } from "./builder.mjs";

/**
 * Material spec (all colours sRGB hex):
 * { color, metallic, roughness, emissive?, emissiveIntensity?, opacity?,
 *   doubleSided?, vertexColors? }
 */
function makeMaterial(doc, name, spec, emissiveExt) {
  const c = new THREE.Color(spec.color ?? "#ffffff"); // linear internally
  const m = doc
    .createMaterial(name)
    .setBaseColorFactor([c.r, c.g, c.b, spec.opacity ?? 1])
    .setMetallicFactor(spec.metallic ?? 0)
    .setRoughnessFactor(spec.roughness ?? 0.8)
    .setDoubleSided(Boolean(spec.doubleSided));
  if (spec.opacity !== undefined && spec.opacity < 1) m.setAlphaMode("BLEND");
  if (spec.emissive) {
    const e = new THREE.Color(spec.emissive);
    m.setEmissiveFactor([e.r, e.g, e.b]);
    const strength = spec.emissiveIntensity ?? 1;
    if (strength !== 1) {
      const ext = emissiveExt.createEmissiveStrength().setEmissiveStrength(strength);
      m.setExtension("KHR_materials_emissive_strength", ext);
    }
  }
  const extras = { ...(spec.extras || {}) };
  if (spec.vertexColors) extras.vertexColors = true;
  if (Object.keys(extras).length) m.setExtras(extras);
  return m;
}

/* ---------------------------------------------------------------------------------------------- */
/* Merged layout                                                                                  */
/* ---------------------------------------------------------------------------------------------- */

const isTransient = (n) => Boolean(n.extras && n.extras.hideFrom);

/** Append `src` (offset by `off` = [x, y, z]) to `dst`. */
function appendInto(dst, src, off) {
  const base = dst.vertexCount;
  const P = src.positions;
  for (let i = 0; i < P.length; i += 3) dst.positions.push(P[i] + off[0], P[i + 1] + off[1], P[i + 2] + off[2]);
  for (const v of src.normals) dst.normals.push(v);
  for (const v of src.colors) dst.colors.push(v);
  for (const i of src.indices) dst.indices.push(base + i);
  dst.useColor ||= src.useColor;
}

/**
 * All parts of `node` and of its descendants (stopping at construction-only
 * groups, which stay separate), offset by their translations, merged per
 * material in first-seen order.
 */
function mergeParts(node, prefix, { into = new Map(), off = [0, 0, 0], stops = [] } = {}) {
  for (const mb of node.parts.values()) {
    if (mb.isEmpty()) continue;
    let dst = into.get(mb.material);
    if (!dst) {
      dst = new MeshBuilder(`${prefix}_${mb.material}`, mb.material);
      into.set(mb.material, dst);
    }
    appendInto(dst, mb, off);
  }
  for (const c of node.children) {
    if (isTransient(c)) {
      stops.push(c);
      continue;
    }
    const t = c.translation || [0, 0, 0];
    mergeParts(c, prefix, { into, off: [off[0] + t[0], off[1] + t[1], off[2] + t[2]], stops });
  }
  return { parts: into, stops };
}

function mergedGroup(node, name, prefix) {
  const out = new SceneNode(name, node.extras);
  out.translation = node.translation;
  const { parts, stops } = mergeParts(node, prefix);
  for (const [mat, mb] of parts) out.parts.set(`::${mat}`, mb);
  for (const s of stops) out.add(mergedGroup(s, s.name, s.name));
  return out;
}

/**
 * Root → merged tree. Layer groups (`layer_<step>`) keep their name and extras;
 * mesh nodes inside are `<step>_<material>`. A birch grove (`env_birches`)
 * either becomes one merged group (unique trees) or keeps its instanced
 * template nodes, each with its parts merged per material.
 */
export function mergeTree(root) {
  const out = new SceneNode(root.name, root.extras);
  for (const c of root.children) {
    if (c.children.some((t) => t.instances)) {
      const grove = out.add(new SceneNode(c.name, c.extras));
      for (const t of c.children) {
        const node = grove.add(new SceneNode(t.name, t.extras));
        node.instances = t.instances;
        for (const [mat, mb] of mergeParts(t, t.name).parts) node.parts.set(`::${mat}`, mb);
      }
      continue;
    }
    const prefix = c.name.startsWith("layer_") ? c.name.slice(6) : c.name;
    out.add(mergedGroup(c, c.name, prefix));
  }
  return out;
}

/**
 * Lite: move parts whose material belongs to a class onto the class material,
 * with the material's base colour multiplied into the vertex colours (linear).
 */
export function consolidateMaterials(roots, specs, classes) {
  const classOf = new Map();
  for (const [name, c] of Object.entries(classes)) for (const m of c.members) classOf.set(m, name);
  const visit = (n) => {
    for (const mb of n.parts.values()) {
      const cls = classOf.get(mb.material);
      if (!cls) continue;
      const f = new THREE.Color(specs[mb.material].color ?? "#ffffff"); // linear
      for (let i = 0; i < mb.colors.length; i += 3) {
        mb.colors[i] *= f.r;
        mb.colors[i + 1] *= f.g;
        mb.colors[i + 2] *= f.b;
      }
      mb.useColor = true;
      mb.material = cls;
    }
    n.children.forEach(visit);
  };
  roots.forEach(visit);
}

/**
 * True when every triangle is flat shaded (its three vertex normals equal the
 * normal of its winding), so the normals can be left out: three.js then shades
 * the mesh with screen-space derivatives (material.flatShading), and the
 * vertices of a face corner weld into one.
 */
function isFlat(mb) {
  const P = mb.positions;
  const N = mb.normals;
  const I = mb.indices;
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t] * 3;
    const b = I[t + 1] * 3;
    const c = I[t + 2] * 3;
    const ux = P[b] - P[a];
    const uy = P[b + 1] - P[a + 1];
    const uz = P[b + 2] - P[a + 2];
    const vx = P[c] - P[a];
    const vy = P[c + 1] - P[a + 1];
    const vz = P[c + 2] - P[a + 2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz);
    if (len < 1e-12) continue; // degenerate: invisible either way
    nx /= len;
    ny /= len;
    nz /= len;
    for (const k of [a, b, c]) {
      if (nx * N[k] + ny * N[k + 1] + nz * N[k + 2] < 0.9995) return false;
    }
  }
  return true;
}

/** Drop vertices no triangle uses (after culling), keeping order. */
function compact(mb) {
  const n = mb.vertexCount;
  const used = new Int32Array(n).fill(-1);
  let k = 0;
  for (const i of mb.indices) if (used[i] < 0) used[i] = 0;
  for (let i = 0; i < n; i++) if (used[i] === 0) used[i] = k++;
  if (k === n) return;
  const P = [];
  const N = [];
  const C = [];
  for (let i = 0; i < n; i++) {
    if (used[i] < 0) continue;
    P.push(mb.positions[i * 3], mb.positions[i * 3 + 1], mb.positions[i * 3 + 2]);
    N.push(mb.normals[i * 3], mb.normals[i * 3 + 1], mb.normals[i * 3 + 2]);
    C.push(mb.colors[i * 3], mb.colors[i * 3 + 1], mb.colors[i * 3 + 2]);
  }
  mb.positions = P;
  mb.normals = N;
  mb.colors = C;
  mb.indices = mb.indices.map((i) => used[i]);
}

/**
 * Snap normals and colours to a fine grid (far below the 8-bit output
 * precision), so vertices that differ only by float noise (the coplanar
 * triangles of a face, each with its own computed normal) weld into one.
 */
function snap(mb) {
  const q = (v) => Math.round(v * 4096) / 4096;
  for (let i = 0; i < mb.normals.length; i++) mb.normals[i] = q(mb.normals[i]);
  for (let i = 0; i < mb.colors.length; i++) mb.colors[i] = q(mb.colors[i]);
}

/** Cull buried crown triangles, snap attributes and compact every part of the tree (in place). */
export function finalizeTree(roots) {
  const visit = (n) => {
    for (const mb of n.parts.values()) {
      cullBuried(mb);
      snap(mb);
      compact(mb);
    }
    n.children.forEach(visit);
  };
  roots.forEach(visit);
}

/* ---------------------------------------------------------------------------------------------- */
/* Writer                                                                                         */
/* ---------------------------------------------------------------------------------------------- */

/**
 * @param roots SceneNode roots
 * @param opts.layout "parts" | "merged" | "flat" (each root merged per material, e.g. the permit diagrams)
 * @param opts.allColors give every primitive COLOR_0 (one shader variant for all)
 * @param opts.quantize {position, normal, color} bits
 * @param opts.materialClasses lite: merge plain materials per class (see LITE_MATERIAL_CLASSES)
 * @param opts.flatWithoutNormals lite: leave NORMAL out of meshes that are entirely flat shaded
 *   (true, or { keep: [material names that always keep their normals] })
 */
export async function writeGLB(
  roots,
  materialSpecs,
  outPath,
  {
    sceneName = "Scene",
    layout = "parts",
    allColors = layout === "merged",
    quantize = {},
    materialClasses = null,
    flatWithoutNormals = false,
  } = {},
) {
  finalizeTree(roots);
  if (materialClasses) {
    consolidateMaterials(roots, materialSpecs, materialClasses);
    materialSpecs = { ...materialSpecs };
    for (const [name, c] of Object.entries(materialClasses)) materialSpecs[name] = c.spec;
  }
  const tree = layout === "merged" ? roots.map(mergeTree) : layout === "flat" ? roots.map((r) => mergedGroup(r, r.name, r.name)) : roots;

  const doc = new Document();
  doc.createBuffer();
  const emissiveExt = doc.createExtension(KHRMaterialsEmissiveStrength);
  const scene = doc.createScene(sceneName);
  const materials = new Map();
  const getMat = (name) => {
    if (!materials.has(name)) {
      const spec = materialSpecs[name];
      if (!spec) throw new Error(`Missing material spec: ${name}`);
      materials.set(name, makeMaterial(doc, name, spec, emissiveExt));
    }
    return materials.get(name);
  };

  const stats = { meshes: 0, vertices: 0, triangles: 0, instancedTriangles: 0, flatMeshes: 0 };
  let instancing = null;

  const makePrim = (mb) => {
    const vc = mb.vertexCount;
    const prim = doc.createPrimitive();
    prim.setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(new Float32Array(mb.positions)));
    const keepNormals = Array.isArray(flatWithoutNormals?.keep) && flatWithoutNormals.keep.includes(mb.material);
    if (flatWithoutNormals && !keepNormals && isFlat(mb)) stats.flatMeshes++;
    else prim.setAttribute("NORMAL", doc.createAccessor().setType("VEC3").setArray(new Float32Array(mb.normals)));
    const spec = materialSpecs[mb.material];
    if (allColors || mb.useColor || spec?.vertexColors) {
      prim.setAttribute("COLOR_0", doc.createAccessor().setType("VEC3").setArray(new Float32Array(mb.colors)));
    }
    const idx = vc > 65535 ? new Uint32Array(mb.indices) : new Uint16Array(mb.indices);
    prim.setIndices(doc.createAccessor().setType("SCALAR").setArray(idx));
    prim.setMaterial(getMat(mb.material));
    stats.meshes++;
    stats.triangles += mb.indices.length / 3;
    return prim;
  };

  const visit = (sn) => {
    const node = doc.createNode(sn.name);
    if (sn.translation) node.setTranslation(sn.translation);
    if (sn.rotation) node.setRotation(sn.rotation);
    if (sn.extras && Object.keys(sn.extras).length) node.setExtras(sn.extras);
    const parts = [...sn.parts.values()].filter((mb) => !mb.isEmpty());
    if (sn.instances) {
      // one mesh (a primitive per material) drawn once per instance
      const mesh = doc.createMesh(sn.name);
      for (const mb of parts) {
        mesh.addPrimitive(makePrim(mb));
        stats.instancedTriangles += (mb.indices.length / 3) * (sn.instances.length - 1);
      }
      instancing ??= doc.createExtension(EXTMeshGPUInstancing).setRequired(true);
      const attr = (key, type) =>
        doc
          .createAccessor()
          .setType(type)
          .setArray(new Float32Array(sn.instances.flatMap((i) => i[key])));
      const batch = instancing
        .createInstancedMesh()
        .setAttribute("TRANSLATION", attr("translation", "VEC3"))
        .setAttribute("ROTATION", attr("rotation", "VEC4"))
        .setAttribute("SCALE", attr("scale", "VEC3"));
      node.setMesh(mesh).setExtension("EXT_mesh_gpu_instancing", batch);
    } else {
      for (const mb of parts) {
        const mesh = doc.createMesh(mb.name).addPrimitive(makePrim(mb));
        node.addChild(doc.createNode(mb.name).setMesh(mesh));
      }
    }
    for (const c of sn.children) node.addChild(visit(c));
    return node;
  };
  for (const r of tree) scene.addChild(visit(r));

  await MeshoptEncoder.ready;
  await MeshoptDecoder.ready;
  await doc.transform(
    dedup({ propertyTypes: [PropertyType.ACCESSOR, PropertyType.MESH] }),
    weld(),
    prune({ keepLeaves: true, keepAttributes: true }),
    meshopt({
      encoder: MeshoptEncoder,
      level: "high",
      quantizePosition: quantize.position ?? 14,
      quantizeNormal: quantize.normal ?? 8,
      quantizeColor: quantize.color ?? 8,
    }),
  );

  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
    "meshopt.encoder": MeshoptEncoder,
    "meshopt.decoder": MeshoptDecoder,
  });
  const glb = packMeshoptViews(await io.writeBinary(doc));
  await fs.writeFile(outPath, glb);
  stats.vertices = doc
    .getRoot()
    .listMeshes()
    .reduce((s, m) => s + m.listPrimitives().reduce((a, p) => a + p.getAttribute("POSITION").getCount(), 0), 0);
  return { bytes: glb.byteLength, ...stats, materials: materials.size };
}

/* ---------------------------------------------------------------------------------------------- */
/* GLB repacking                                                                                  */
/* ---------------------------------------------------------------------------------------------- */

/**
 * glTF-Transform writes one Meshopt buffer view per attribute and primitive,
 * and each costs ~220 bytes of JSON. This joins all compressed vertex buffer
 * views that share mode, filter and stride into one (accessors then point into
 * it with byteOffset), which is plain glTF and loads the same. The joined
 * stream is re-encoded from the undecoded (still filtered) bytes, so the
 * vertex data is bit-identical.
 */
export function packMeshoptViews(glb) {
  const buf = Buffer.from(glb.buffer, glb.byteOffset, glb.byteLength);
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString("utf8"));
  const binStart = 20 + jsonLen + 8;
  const bin = buf.subarray(binStart, binStart + buf.readUInt32LE(20 + jsonLen));
  const EXT = "EXT_meshopt_compression";
  const views = json.bufferViews;
  const binBuffer = json.buffers.findIndex((b) => !b.uri && !b.extensions?.[EXT]?.fallback);
  const fallback = json.buffers.findIndex((b) => b.extensions?.[EXT]?.fallback);
  if (fallback < 0) return glb;
  // decode (without filters) and group the compressed vertex views
  const groups = new Map();
  views.forEach((v, i) => {
    const e = v.extensions?.[EXT];
    if (!e || e.mode !== "ATTRIBUTES") return;
    const raw = new Uint8Array(e.count * e.byteStride);
    MeshoptDecoder.decodeGltfBuffer(raw, e.count, e.byteStride, bin.subarray(e.byteOffset ?? 0, (e.byteOffset ?? 0) + e.byteLength), e.mode);
    const key = [v.target, e.mode, e.filter ?? "NONE", e.byteStride].join(":");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ index: i, raw, count: e.count });
  });
  // new view list: untouched views first, then one view per group
  const remap = new Map(); // old view index → { view, offset }
  const out = [];
  const chunks = []; // [viewIndex, compressed bytes]
  views.forEach((v, i) => {
    const e = v.extensions?.[EXT];
    if (e && e.mode === "ATTRIBUTES") return;
    const ni = out.length;
    remap.set(i, { view: ni, offset: 0 });
    if (e) {
      const data = bin.subarray(e.byteOffset ?? 0, (e.byteOffset ?? 0) + e.byteLength);
      out.push({ ...v, extensions: { ...v.extensions, [EXT]: { ...e } } });
      chunks.push([ni, "ext", data]);
    } else {
      out.push({ ...v });
      chunks.push([ni, "plain", bin.subarray(v.byteOffset ?? 0, (v.byteOffset ?? 0) + v.byteLength)]);
    }
  });
  for (const members of groups.values()) {
    const first = views[members[0].index];
    const e = first.extensions[EXT];
    const ni = out.length;
    let offset = 0;
    for (const m of members) {
      remap.set(m.index, { view: ni, offset });
      offset += m.raw.byteLength;
    }
    const raw = new Uint8Array(offset);
    let o = 0;
    for (const m of members) {
      raw.set(m.raw, o);
      o += m.raw.byteLength;
    }
    const count = offset / e.byteStride;
    const data = MeshoptEncoder.encodeGltfBuffer(raw, count, e.byteStride, e.mode);
    out.push({
      buffer: fallback,
      byteLength: offset,
      byteStride: first.byteStride,
      target: first.target,
      extensions: { [EXT]: { buffer: e.buffer, byteLength: data.byteLength, mode: e.mode, ...(e.filter ? { filter: e.filter } : {}), byteStride: e.byteStride, count } },
    });
    chunks.push([ni, "ext", data]);
  }
  for (const a of json.accessors) {
    if (a.bufferView === undefined) continue;
    const r = remap.get(a.bufferView);
    a.bufferView = r.view;
    a.byteOffset = (a.byteOffset ?? 0) + r.offset;
    if (!a.byteOffset) delete a.byteOffset;
  }
  // lay out the binary buffer and the fallback buffer again
  const parts = [];
  let binLen = 0;
  let fallbackLen = 0;
  const pad4 = (n) => (n + 3) & ~3;
  for (const [ni, kind, data] of chunks.sort((a, b) => a[0] - b[0])) {
    const v = out[ni];
    if (kind === "ext") {
      v.extensions[EXT].byteOffset = binLen;
      v.byteOffset = fallbackLen;
      fallbackLen += pad4(v.byteLength);
    } else {
      v.byteOffset = binLen;
    }
    parts.push(data);
    binLen += data.byteLength;
    const pad = pad4(binLen) - binLen;
    if (pad) parts.push(new Uint8Array(pad));
    binLen += pad;
  }
  for (const v of out) {
    if (!v.byteOffset) delete v.byteOffset;
    if (v.extensions?.[EXT] && !v.extensions[EXT].byteOffset) delete v.extensions[EXT].byteOffset;
  }
  json.bufferViews = out;
  json.buffers[binBuffer].byteLength = binLen;
  json.buffers[fallback].byteLength = fallbackLen;
  // GLB container
  let jsonBytes = Buffer.from(JSON.stringify(json), "utf8");
  const jsonPad = pad4(jsonBytes.length) - jsonBytes.length;
  jsonBytes = Buffer.concat([jsonBytes, Buffer.alloc(jsonPad, 0x20)]);
  const binBytes = Buffer.concat(parts.map((p) => Buffer.from(p.buffer, p.byteOffset, p.byteLength)));
  const total = 12 + 8 + jsonBytes.length + 8 + binBytes.length;
  const head = Buffer.alloc(12);
  head.writeUInt32LE(0x46546c67, 0);
  head.writeUInt32LE(2, 4);
  head.writeUInt32LE(total, 8);
  const jh = Buffer.alloc(8);
  jh.writeUInt32LE(jsonBytes.length, 0);
  jh.writeUInt32LE(0x4e4f534a, 4);
  const bh = Buffer.alloc(8);
  bh.writeUInt32LE(binBytes.length, 0);
  bh.writeUInt32LE(0x004e4942, 4);
  return new Uint8Array(Buffer.concat([head, jh, jsonBytes, bh, binBytes]));
}

/** Readable one-line summary of writeGLB's stats. */
export function describe(name, s) {
  const inst = s.instancedTriangles ? ` (+${s.instancedTriangles} instanced)` : "";
  const flat = s.flatMeshes ? ` · ${s.flatMeshes} flat meshes without normals` : "";
  return `${name} ${(s.bytes / 1024).toFixed(0)} KB · meshes ${s.meshes} · materials ${s.materials} · vertices ${s.vertices} · triangles ${s.triangles}${inst}${flat}`;
}
