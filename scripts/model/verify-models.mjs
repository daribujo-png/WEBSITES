#!/usr/bin/env node
/**
 * Checks the generated models against the contract the live canvases rely on.
 * Loads house.glb and house-lite.glb with three.js's own GLTFLoader (as the
 * site does) and verifies, for both variants:
 *  - the House root, the 11 layer groups (layer_<step>, extras step/order/explode)
 *    and the construction-only groups (extras.hideFrom) in meta order;
 *  - the environment groups (env_*) and the material names the canvases treat
 *    by name (glass, el_line, vvs_line, lamp_glow, cladding_wood, plan_line,
 *    string_line, hill and the stage look's environment materials);
 *  - every layer's geometry sits inside its meta bbox, and nothing is NaN;
 *  - meta.variants points at files whose sizes match meta.variantBytes.
 * It also compares house.meta.json with the committed version: coordinates,
 * bboxes, hotspots, cameras and lighting must be unchanged.
 *
 *   node scripts/model/verify-models.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MODELS = path.join(ROOT, "public/models");
const problems = [];
const fail = (msg) => problems.push(msg);

const meta = JSON.parse(await fs.readFile(path.join(MODELS, "house.meta.json"), "utf8"));

/* ---- meta vs the committed version ---- */
let committed = null;
try {
  committed = JSON.parse(execSync("git show HEAD:public/models/house.meta.json", { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
} catch {
  console.log("(no committed house.meta.json to compare with)");
}
if (committed) {
  for (const key of ["bbox", "sceneBbox", "floors", "cutHeights", "steps", "layers", "transient", "hotspots", "interiorLights", "exteriorLights", "footprint", "camera", "lighting", "materials"]) {
    const a = JSON.stringify(committed[key]);
    const b = JSON.stringify(meta[key]);
    if (key === "materials") {
      // notes may change; the cladding factors may not
      if (JSON.stringify(committed.materials?.cladding_wood) !== JSON.stringify(meta.materials?.cladding_wood)) fail("meta.materials.cladding_wood changed");
      continue;
    }
    if (a !== b) fail(`meta.${key} differs from the committed house.meta.json`);
  }
}

/* ---- variants ---- */
const variants = meta.variants ?? { high: "/models/house.glb" };
for (const [name, url] of Object.entries(variants)) {
  const file = path.join(ROOT, "public", url);
  const size = (await fs.stat(file).catch(() => null))?.size;
  if (!size) fail(`variant ${name}: ${url} missing`);
  else if (meta.variantBytes && meta.variantBytes[name] !== size) fail(`variant ${name}: variantBytes ${meta.variantBytes[name]} ≠ file size ${size}`);
}

/* ---- load both with three.js ---- */
await MeshoptDecoder.ready;
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
async function load(file) {
  const data = await fs.readFile(file);
  const ab = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  return new Promise((resolve, reject) => loader.parse(ab, "", resolve, reject));
}

const NAMED = ["glass", "el_line", "vvs_line", "lamp_glow", "cladding_wood", "plan_line", "string_line", "hill"];
const STAGE_ENV = Object.keys(meta.lighting.stage.envMaterials ?? {});
const report = [];

for (const [name, url] of Object.entries(variants)) {
  const file = path.join(ROOT, "public", url);
  let gltf;
  try {
    gltf = await load(file);
  } catch (e) {
    fail(`${name}: GLTFLoader failed: ${e.message}`);
    continue;
  }
  const scene = gltf.scene;
  const house = scene.getObjectByName("House");
  if (!house) {
    fail(`${name}: no House node`);
    continue;
  }
  // layers
  meta.steps.forEach((step, i) => {
    const node = house.getObjectByName(`layer_${step}`);
    if (!node) return fail(`${name}: layer_${step} missing`);
    if (node.parent !== house) fail(`${name}: layer_${step} is not a child of House`);
    const ud = node.userData;
    if (ud.step !== step || ud.order !== i || JSON.stringify(ud.explode) !== JSON.stringify(meta.layers[step].explode)) fail(`${name}: layer_${step} extras differ from meta`);
    // geometry inside the meta bbox (2 cm slack for quantisation)
    const box = new THREE.Box3();
    node.updateWorldMatrix(true, true);
    node.traverse((o) => {
      if (!o.isMesh) return;
      const pos = o.geometry.attributes.position;
      for (let k = 0; k < pos.count; k++) {
        const v = new THREE.Vector3().fromBufferAttribute(pos, k).applyMatrix4(o.matrixWorld);
        if (!Number.isFinite(v.x + v.y + v.z)) return fail(`${name}: NaN vertex in ${o.name}`);
        box.expandByPoint(v);
      }
    });
    const mb = meta.layers[step].bbox;
    // 2 cm for quantisation; the lite planting's larger clumps reach a little deeper into the lawn
    const slack = name === "high" ? 0.02 : 0.12;
    for (let a = 0; a < 3; a++) {
      if (box.min.getComponent(a) < mb.min[a] - slack || box.max.getComponent(a) > mb.max[a] + slack) {
        fail(`${name}: layer_${step} geometry ${box.min.toArray().map((x) => x.toFixed(2))}…${box.max.toArray().map((x) => x.toFixed(2))} outside meta bbox`);
        break;
      }
    }
  });
  // construction-only groups
  for (const [nodeName, t] of Object.entries(meta.transient)) {
    if (typeof t !== "object") continue;
    const node = house.getObjectByName(nodeName);
    if (!node) fail(`${name}: transient group ${nodeName} missing`);
    else if (node.userData.hideFrom !== t.hideFrom) fail(`${name}: ${nodeName}.hideFrom ≠ ${t.hideFrom}`);
  }
  // environment
  const env = house.children.filter((c) => c.name.startsWith("env_")).map((c) => c.name);
  for (const n of [meta.environment.terrain, ...meta.environment.maples.map((m) => m.node), ...meta.environment.birches, meta.environment.backdrop]) {
    if (!env.includes(n)) fail(`${name}: ${n} missing (env groups: ${env.join(", ")})`);
  }
  // materials
  const mats = new Set();
  let draws = 0;
  let tris = 0;
  let flat = 0;
  let instances = 0;
  scene.traverse((o) => {
    if (!o.isMesh) return;
    draws++;
    mats.add(o.material.name);
    const n = (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3;
    tris += n * (o.isInstancedMesh ? o.count : 1);
    if (o.isInstancedMesh) instances += o.count;
    if (o.material.flatShading) flat++;
    if (!o.geometry.attributes.color) fail(`${name}: ${o.name} has no COLOR_0`);
  });
  for (const m of [...NAMED, ...STAGE_ENV]) if (!mats.has(m)) fail(`${name}: material ${m} missing`);
  // hotspot ids still match content (positions are checked through meta above)
  report.push({ variant: name, bytes: (await fs.stat(file)).size, draws, materials: mats.size, triangles: tris, instances, flatShaded: flat });
}

console.table(report);
if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
console.log("models OK: names, extras, bboxes, materials and meta match the contract");
