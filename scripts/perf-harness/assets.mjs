#!/usr/bin/env node
/**
 * Asset profiler for the 3D models (read-only).
 *
 *   node assets.mjs [--root=/home/user/WEBSITES] [--out=<dir>] [--models=house.glb,permits.glb]
 *
 * Writes <out>/assets.json and prints a compact table. Reports per GLB:
 * bytes raw/gzip/brotli, extensions, node/mesh/primitive/material/texture counts,
 * triangles + vertices per top-level group (layer_*, env_*), per material,
 * decoded GPU vertex/index bytes, attribute formats, and a draw-call estimate.
 * Also sizes the 3D JS chunks in <root>/out (if built) and the meta JSONs.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, "").split("=");
    return [k, v.join("=") || true];
  }),
);
const ROOT = path.resolve(args.root || "/home/user/WEBSITES");
const OUT = path.resolve(args.out || path.join(path.dirname(new URL(import.meta.url).pathname), "..", "results", "latest"));
const MODELS = (args.models || "house.glb,permits.glb").split(",");
fs.mkdirSync(OUT, { recursive: true });

const req = createRequire(path.join(ROOT, "package.json"));
const imp = (m) => import(pathToFileURL(req.resolve(m)).href);
const { NodeIO } = await imp("@gltf-transform/core");
const { ALL_EXTENSIONS } = await imp("@gltf-transform/extensions");
const { MeshoptDecoder } = await imp("meshoptimizer");
await MeshoptDecoder.ready;

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder });

const sizes = (buf) => ({
  raw: buf.byteLength,
  gzip9: zlib.gzipSync(buf, { level: 9 }).byteLength,
  brotli11: zlib.brotliCompressSync(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }).byteLength,
});

function primStats(prim) {
  const pos = prim.getAttribute("POSITION");
  const idx = prim.getIndices();
  const mode = prim.getMode();
  const vcount = pos ? pos.getCount() : 0;
  const icount = idx ? idx.getCount() : vcount;
  const tris = mode === 4 ? icount / 3 : 0;
  let gpuBytes = 0;
  const attrs = {};
  for (const sem of prim.listSemantics()) {
    const a = prim.getAttribute(sem);
    const arr = a.getArray();
    gpuBytes += arr.byteLength;
    attrs[sem] = `${a.getType()}:${arr.constructor.name}${a.getNormalized() ? ":norm" : ""}`;
  }
  if (idx) gpuBytes += idx.getArray().byteLength;
  return { vcount, icount, tris, gpuBytes, attrs, idxType: idx ? idx.getArray().constructor.name : "none", mode };
}

/** Compressed (on-disk, EXT_meshopt) bytes per top-level group and per material, read from the GLB JSON. */
function compressedByGroup(buf) {
  const jl = buf.readUInt32LE(12);
  const j = JSON.parse(buf.subarray(20, 20 + jl).toString());
  const viewBytes = (j.bufferViews || []).map((v) => v.extensions?.EXT_meshopt_compression?.byteLength ?? v.byteLength);
  const viewUsers = {};
  (j.accessors || []).forEach((a, i) => (viewUsers[a.bufferView] = (viewUsers[a.bufferView] || 0) + 1));
  const accBytes = (i) => {
    const a = j.accessors[i];
    return a && a.bufferView !== undefined ? viewBytes[a.bufferView] / viewUsers[a.bufferView] : 0;
  };
  const seen = new Set();
  const byGroup = {};
  const byMaterial = {};
  const visit = (ni, group) => {
    const n = j.nodes[ni];
    const g = group || (/^(layer_|env_|permit_)/.test(n.name || "") ? n.name : null);
    if (n.mesh !== undefined) {
      for (const p of j.meshes[n.mesh].primitives) {
        let bytes = 0;
        for (const ai of [...Object.values(p.attributes), p.indices].filter((x) => x !== undefined)) {
          if (seen.has(ai)) continue;
          seen.add(ai);
          bytes += accBytes(ai);
        }
        byGroup[g || "(root)"] = (byGroup[g || "(root)"] || 0) + bytes;
        const mn = p.material !== undefined ? j.materials[p.material].name : "(none)";
        byMaterial[mn] = (byMaterial[mn] || 0) + bytes;
      }
    }
    for (const c of n.children || []) visit(c, g);
  };
  for (const ni of j.scenes[j.scene || 0].nodes) visit(ni, null);
  const round = (o) => Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, Math.round(v)]));
  return { byGroup: round(byGroup), byMaterial: round(byMaterial), jsonChunkBytes: jl };
}

function analyse(file) {
  const buf = fs.readFileSync(file);
  return io.readBinary(new Uint8Array(buf)).then((doc) => {
    const root = doc.getRoot();
    const scene = root.getDefaultScene() || root.listScenes()[0];
    const out = {
      file: path.relative(ROOT, file),
      bytes: sizes(buf),
      compressed: compressedByGroup(buf),
      extensionsUsed: root.listExtensionsUsed().map((e) => e.extensionName),
      extensionsRequired: root.listExtensionsRequired().map((e) => e.extensionName),
      counts: {
        nodes: root.listNodes().length,
        meshNodes: root.listNodes().filter((n) => n.getMesh()).length,
        meshes: root.listMeshes().length,
        primitives: root.listMeshes().reduce((s, m) => s + m.listPrimitives().length, 0),
        materials: root.listMaterials().length,
        textures: root.listTextures().length,
        accessors: root.listAccessors().length,
        bufferViews: root.listBuffers().length,
      },
      totals: { tris: 0, verts: 0, gpuBytes: 0 },
      attributeFormats: {},
      groups: {},
      materials: {},
      vertexColorPrims: 0,
      uint32IndexPrims: 0,
      doubleSidedMaterials: [],
      blendMaterials: [],
      emissiveMaterials: [],
      largestMeshes: [],
    };
    for (const m of root.listMaterials()) {
      if (m.getDoubleSided()) out.doubleSidedMaterials.push(m.getName());
      if (m.getAlphaMode() === "BLEND") out.blendMaterials.push(m.getName());
      const e = m.getEmissiveFactor();
      if (e && (e[0] || e[1] || e[2])) out.emissiveMaterials.push(m.getName());
    }
    const meshRows = [];
    // Walk the scene; group = first child under the root "House"/scene root whose name starts with layer_/env_/permit_.
    const visit = (node, group, worldInstances) => {
      const name = node.getName();
      let g = group;
      if (!g && /^(layer_|env_|permit_)/.test(name)) g = name;
      const mesh = node.getMesh();
      if (mesh) {
        for (const prim of mesh.listPrimitives()) {
          const s = primStats(prim);
          const mat = prim.getMaterial()?.getName() || "(none)";
          const gk = g || "(root)";
          out.groups[gk] ??= { meshNodes: 0, prims: 0, tris: 0, verts: 0, gpuBytes: 0, materials: {} };
          const G = out.groups[gk];
          G.prims += 1;
          G.tris += s.tris;
          G.verts += s.vcount;
          G.gpuBytes += s.gpuBytes;
          G.materials[mat] = (G.materials[mat] || 0) + 1;
          out.materials[mat] ??= { prims: 0, tris: 0, verts: 0 };
          out.materials[mat].prims += 1;
          out.materials[mat].tris += s.tris;
          out.materials[mat].verts += s.vcount;
          out.totals.tris += s.tris;
          out.totals.verts += s.vcount;
          out.totals.gpuBytes += s.gpuBytes;
          for (const [k, v] of Object.entries(s.attrs)) out.attributeFormats[`${k}=${v}`] = (out.attributeFormats[`${k}=${v}`] || 0) + 1;
          if (prim.getAttribute("COLOR_0")) out.vertexColorPrims++;
          if (s.idxType === "Uint32Array") out.uint32IndexPrims++;
          meshRows.push({ node: name, group: gk, material: mat, tris: s.tris, verts: s.vcount });
        }
        if (g) out.groups[g].meshNodes += 1;
      }
      for (const c of node.listChildren()) visit(c, g, worldInstances);
    };
    for (const n of scene.listChildren()) {
      // Descend through a single wrapper root (e.g. "House").
      if (!/^(layer_|env_|permit_)/.test(n.getName()) && n.listChildren().some((c) => /^(layer_|env_|permit_)/.test(c.getName()))) {
        if (n.getMesh()) visit(n, null);
        else for (const c of n.listChildren()) visit(c, null);
      } else visit(n, null);
    }
    out.largestMeshes = meshRows.sort((a, b) => b.tris - a.tris).slice(0, 25);
    out.meshCount = meshRows.length;
    // Material-sharing potential: prims per (group, material) → how many draw calls a per-layer-per-material merge would leave.
    let mergedCalls = 0;
    for (const G of Object.values(out.groups)) mergedCalls += Object.keys(G.materials).length;
    out.drawCallEstimate = {
      allPrimsVisible: meshRows.length,
      ifMergedPerGroupPerMaterial: mergedCalls,
    };
    // Hidden-at-finish construction parts (hideFrom extras)
    out.transientNodes = root
      .listNodes()
      .filter((n) => n.getExtras()?.hideFrom)
      .map((n) => ({ name: n.getName(), hideFrom: n.getExtras().hideFrom }));
    return out;
  });
}

function chunkReport() {
  const dir = path.join(ROOT, "out/_next/static/chunks");
  if (!fs.existsSync(dir)) return null;
  const rows = [];
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".js")) continue;
    const buf = fs.readFileSync(path.join(dir, f));
    const s = buf.toString("latin1");
    const tags = [];
    if (s.includes("WebGLRenderer")) tags.push("three");
    if (/UnrealBloomPass|EffectComposer|luminosityThreshold/.test(s)) tags.push("postfx");
    if (s.includes("EXT_meshopt_compression")) tags.push("gltf-loader");
    if (s.includes("__r3f")) tags.push("r3f");
    if (s.includes("ScrollTrigger")) tags.push("gsap-st");
    if (/lenis/i.test(s)) tags.push("lenis");
    if (s.includes("showAllForCompile") || s.includes("__ghost")) tags.push("BuildCanvas");
    if (s.includes("permit_existing")) tags.push("PermitCanvas");
    if (s.includes("cutHeights") && s.includes("interiorLights")) tags.push("house.meta.json");
    if (s.includes("tonemapping_fragment") && s.includes("glowStrength")) tags.push("lighting.ts");
    rows.push({ file: f, ...sizes(buf), tags });
  }
  rows.sort((a, b) => b.raw - a.raw);
  const three = rows.filter((r) => r.tags.some((t) => ["three", "r3f", "postfx", "BuildCanvas", "PermitCanvas", "house.meta.json", "gltf-loader"].includes(t)));
  const sum = (rs, k) => rs.reduce((s, r) => s + r[k], 0);
  // Which chunks are in the home page's initial HTML.
  const html = fs.existsSync(path.join(ROOT, "out/index.html")) ? fs.readFileSync(path.join(ROOT, "out/index.html"), "utf8") : "";
  const initial = [...new Set([...html.matchAll(/_next\/static\/chunks\/([^"']+\.js)/g)].map((m) => m[1]))];
  const initialRows = rows.filter((r) => initial.includes(r.file));
  return {
    all: rows,
    threeRelated: three.map((r) => r.file),
    threeRelatedTotals: { raw: sum(three, "raw"), gzip9: sum(three, "gzip9"), brotli11: sum(three, "brotli11") },
    homeInitialHtmlChunks: initial,
    homeInitialTotals: { raw: sum(initialRows, "raw"), gzip9: sum(initialRows, "gzip9"), brotli11: sum(initialRows, "brotli11") },
    threeInInitialHtml: three.filter((r) => initial.includes(r.file)).map((r) => r.file),
  };
}

const result = { when: new Date().toISOString(), root: ROOT, models: {}, meta: {}, chunks: chunkReport() };
for (const m of MODELS) {
  const f = path.join(ROOT, "public/models", m);
  if (fs.existsSync(f)) result.models[m] = await analyse(f);
}
for (const m of fs.readdirSync(path.join(ROOT, "public/models")).filter((f) => f.endsWith(".meta.json"))) {
  const buf = fs.readFileSync(path.join(ROOT, "public/models", m));
  const j = JSON.parse(buf);
  result.meta[m] = {
    ...sizes(buf),
    interiorLights: j.interiorLights?.length,
    exteriorLights: j.exteriorLights?.length,
    topKeys: Object.keys(j),
  };
}
fs.writeFileSync(path.join(OUT, "assets.json"), JSON.stringify(result, null, 2));

// ---- console summary
const kb = (n) => (n / 1024).toFixed(1) + "K";
for (const [name, r] of Object.entries(result.models)) {
  console.log(`\n== ${name}  raw ${kb(r.bytes.raw)}  gz ${kb(r.bytes.gzip9)}  br ${kb(r.bytes.brotli11)}  ext=[${r.extensionsUsed.join(",")}]`);
  console.log(`   counts ${JSON.stringify(r.counts)}  tris ${r.totals.tris}  verts ${r.totals.verts}  gpu ${kb(r.totals.gpuBytes)}`);
  console.log(`   drawCallEstimate ${JSON.stringify(r.drawCallEstimate)}  vcolPrims ${r.vertexColorPrims}  u32idx ${r.uint32IndexPrims}`);
  console.log(`   blend=[${r.blendMaterials}] doubleSided=[${r.doubleSidedMaterials}]`);
  const rows = Object.entries(r.groups).sort((a, b) => b[1].tris - a[1].tris);
  console.log("   group                       prims     tris    verts   gpuKB  glbKB  mats");
  for (const [g, s] of rows)
    console.log(
      `   ${g.padEnd(26)} ${String(s.prims).padStart(6)} ${String(s.tris).padStart(8)} ${String(s.verts).padStart(8)} ${kb(s.gpuBytes).padStart(7)} ${kb(r.compressed.byGroup[g] || 0).padStart(6)}  ${Object.keys(s.materials).length}`,
    );
  console.log("   glb bytes by material (top 8): " + Object.entries(r.compressed.byMaterial).slice(0, 8).map(([k, v]) => `${k} ${kb(v)}`).join(", "));
}
if (result.chunks) {
  console.log(`\n== JS chunks (3D-related): ${result.chunks.threeRelated.length}  raw ${kb(result.chunks.threeRelatedTotals.raw)}  gz ${kb(result.chunks.threeRelatedTotals.gzip9)}  br ${kb(result.chunks.threeRelatedTotals.brotli11)}`);
  for (const r of result.chunks.all.filter((r) => r.tags.length))
    console.log(`   ${r.file.padEnd(28)} ${kb(r.raw).padStart(8)} gz ${kb(r.gzip9).padStart(7)} br ${kb(r.brotli11).padStart(7)}  ${r.tags.join(",")}`);
  console.log(`   home initial HTML chunks: ${result.chunks.homeInitialHtmlChunks.length}  gz ${kb(result.chunks.homeInitialTotals.gzip9)}  3D in initial: [${result.chunks.threeInInitialHtml}]`);
}
console.log(`\nwrote ${path.join(OUT, "assets.json")}`);
