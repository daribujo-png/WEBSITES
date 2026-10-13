/**
 * SceneNode tree → glTF 2.0 binary, compressed with Meshopt.
 * Pipeline: build document → dedup (accessors/meshes) → weld → prune →
 * reorder + quantize + EXT_meshopt_compression.
 */
import { Document, NodeIO, PropertyType } from "@gltf-transform/core";
import { ALL_EXTENSIONS, KHRMaterialsEmissiveStrength } from "@gltf-transform/extensions";
import { dedup, meshopt, prune, weld } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptDecoder } from "meshoptimizer";
import * as THREE from "three";
import fs from "node:fs/promises";

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

export async function writeGLB(roots, materialSpecs, outPath, { sceneName = "Scene" } = {}) {
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

  const stats = { meshes: 0, vertices: 0, triangles: 0 };

  const visit = (sn) => {
    const node = doc.createNode(sn.name);
    if (sn.translation) node.setTranslation(sn.translation);
    if (sn.rotation) node.setRotation(sn.rotation);
    if (sn.extras && Object.keys(sn.extras).length) node.setExtras(sn.extras);
    for (const mb of sn.parts.values()) {
      if (mb.isEmpty()) continue;
      const vc = mb.vertexCount;
      const prim = doc.createPrimitive();
      prim.setAttribute(
        "POSITION",
        doc.createAccessor().setType("VEC3").setArray(new Float32Array(mb.positions)),
      );
      prim.setAttribute("NORMAL", doc.createAccessor().setType("VEC3").setArray(new Float32Array(mb.normals)));
      const spec = materialSpecs[mb.material];
      if (mb.useColor || spec?.vertexColors) {
        prim.setAttribute("COLOR_0", doc.createAccessor().setType("VEC3").setArray(new Float32Array(mb.colors)));
      }
      const idx = vc > 65535 ? new Uint32Array(mb.indices) : new Uint16Array(mb.indices);
      prim.setIndices(doc.createAccessor().setType("SCALAR").setArray(idx));
      prim.setMaterial(getMat(mb.material));
      const mesh = doc.createMesh(mb.name).addPrimitive(prim);
      const child = doc.createNode(mb.name).setMesh(mesh);
      node.addChild(child);
      stats.meshes++;
      stats.vertices += vc;
      stats.triangles += mb.indices.length / 3;
    }
    for (const c of sn.children) node.addChild(visit(c));
    return node;
  };
  for (const r of roots) scene.addChild(visit(r));

  await MeshoptEncoder.ready;
  await doc.transform(
    dedup({ propertyTypes: [PropertyType.ACCESSOR, PropertyType.MESH] }),
    weld(),
    prune({ keepLeaves: true, keepAttributes: true }),
    meshopt({ encoder: MeshoptEncoder, level: "high", quantizeNormal: 8, quantizeColor: 8, quantizePosition: 14 }),
  );

  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
    "meshopt.encoder": MeshoptEncoder,
    "meshopt.decoder": MeshoptDecoder,
  });
  const glb = await io.writeBinary(doc);
  await fs.writeFile(outPath, glb);
  return { bytes: glb.byteLength, ...stats };
}
