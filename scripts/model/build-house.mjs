#!/usr/bin/env node
/**
 * Builds public/models/house.glb + house.meta.json: our interpretation of
 * "House in Bergen" (Kvalbein Korsøen Arkitektur), assembled as named layer
 * groups in real Norwegian build order, plus Fana terrain, birches and the
 * two old maples. Run: npm run model:build
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as THREE from "three";
import { SceneNode, V } from "./lib/builder.mjs";
import { writeGLB } from "./lib/gltf.mjs";
import {
  BEND,
  CLAD_OUT,
  HW,
  NICHE,
  RAFTER_VD,
  RIDGE_Y,
  STUD_D,
  W,
  WINGS,
  Y,
  materialSpecs,
  outline,
  rafterTop,
  roofTop,
  stainFactor,
  CLADDING_RAW,
  CLADDING_STAIN,
} from "./lib/house-spec.mjs";
import { buildCladding, buildFrame, buildNicheFrame, buildOpenings, wallPanels } from "./lib/walls.mjs";
import { buildRoof } from "./lib/roof.mjs";
import { buildFundament, buildGrunnarbeid, buildTomt } from "./lib/site.mjs";
import { buildInterior, buildJoists, buildPartitionFrames } from "./lib/interior.mjs";
import { buildFinished, buildInstallations } from "./lib/services.mjs";
import {
  MAPLE_A,
  MAPLE_B,
  buildBirch,
  buildHills,
  buildMaple,
  buildRocks,
  buildTerrain,
  terrainHeight,
} from "./lib/env.mjs";
import { CAMERAS, LIGHTING } from "./lib/cameras.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT_DIR = path.join(ROOT, "public/models");

const STEPS = [
  "tomt",
  "grunnarbeid",
  "fundament",
  "bindingsverk",
  "isolasjon",
  "tak",
  "vinduer",
  "kledning",
  "installasjoner",
  "interior",
  "nokkelferdig",
];

const EXPLODE = {
  tomt: [0, -0.1, 0],
  grunnarbeid: [0, -0.9, 0],
  fundament: [0, -0.55, 0],
  bindingsverk: [0, 0, 0],
  isolasjon: [-0.28, 0.08, 0.42],
  tak: [0, 1.15, 0],
  vinduer: [-0.42, 0.1, 0.64],
  kledning: [-0.62, 0.15, 0.95],
  installasjoner: [0.3, 0.45, -0.45],
  interior: [0.18, -0.05, -0.28],
  nokkelferdig: [0, 0, 0],
};

async function main() {
  const house = new SceneNode("House", {
    name: "House in Bergen — vår tolkning",
    architect: "Kvalbein Korsøen Arkitektur",
    note: "Procedural interpretation by Bygg og Renovering Vest's site team. Not built by Bygg RV; drawings were not available.",
    units: "m",
  });
  const layers = {};
  STEPS.forEach((id, i) => {
    layers[id] = house.add(new SceneNode(`layer_${id}`, { step: id, order: i, explode: EXPLODE[id] }));
  });

  // --- environment first (terrain height is used by the site plan) ---
  const terrain = house.add(new SceneNode("env_terrain", { kind: "terrain" }));
  buildTerrain(terrain);
  buildRocks(terrain);
  house.add(buildMaple("env_maple_a", MAPLE_A.x, MAPLE_A.z, 101, { height: 14.5, spread: 6.6 }));
  house.add(buildMaple("env_maple_b", MAPLE_B.x, MAPLE_B.z, 202, { height: 13.5, spread: 6.0 }));
  const birchSpots = [
    [15.5, -1.5],
    [17.8, 3.2],
    [14.2, 7.8],
    [-15.5, 3.5],
    [-18.2, -1.8],
    [-6.5, -15.5],
    [3.8, -16.5],
    [9.5, -13.5],
    [-12.5, -14.0],
    [21.0, -7.5],
    [-22.5, 9.5],
  ];
  birchSpots.forEach(([x, z], i) => house.add(buildBirch(`env_birch_${String(i + 1).padStart(2, "0")}`, x, z, 700 + i * 11)));
  const hills = house.add(new SceneNode("env_hills", { kind: "backdrop" }));
  buildHills(hills);

  // --- build layers in Norwegian build order ---
  buildTomt(layers.tomt);
  const ga = buildGrunnarbeid(layers.grunnarbeid);
  const fu = buildFundament(layers.fundament);
  buildFrame(layers.bindingsverk);
  buildNicheFrame(layers.bindingsverk);
  buildJoists(layers.bindingsverk);
  buildPartitionFrames(layers.bindingsverk);
  // insulation infill everywhere, windbreak everywhere except wing B 2. etasje (south + gable) — work in progress
  wallPanels(layers.isolasjon.mb("wood_fibre", "isolasjon_trefiber"), -STUD_D + 0.008, -0.008, "insulation", null);
  wallPanels(layers.isolasjon.mb("windbreak", "isolasjon_vindsperre"), 0.0, 0.012, "windbreak", null, {
    filter: (wall) => !(wall.wing.id === "B" && (wall.id === "BS" || wall.id === "BG")),
  });
  // the exposed part of wing B gets the windbreak only on the 1. etasje
  wallPanels(layers.isolasjon.mb("windbreak", "isolasjon_vindsperre"), 0.0, 0.012, "windbreak-low", null, {
    filter: (wall) => wall.wing.id === "B" && (wall.id === "BS" || wall.id === "BG"),
  });
  buildRoof(layers.tak, layers.kledning);
  buildOpenings(layers.vinduer);
  buildCladding(layers.kledning);
  const inst = buildInstallations(layers.installasjoner);
  const intr = buildInterior(layers.interior);
  const fin = buildFinished(layers.nokkelferdig);

  // --- hotspots (world positions; ids must match src/content/build.ts) ---
  const A = WINGS.A;
  const B = WINGS.B;
  const v3 = (p) => [round(p.x), round(p.y), round(p.z)];
  const sw = outline(0.05)[0];
  const hotspots = {
    tomt: [
      { id: "situasjonsplan", position: v3(V(sw.x, 0.06, sw.z)) },
      { id: "lonnetraer", position: v3(V(MAPLE_A.x, terrainHeight(MAPLE_A.x, MAPLE_A.z) + 3.2, MAPLE_A.z)) },
    ],
    grunnarbeid: [
      { id: "byggegrop", position: v3(ga.pitCentre) },
      { id: "sprengstein", position: v3(ga.pileAt) },
    ],
    fundament: [
      { id: "ringmur", position: v3(fu.ringmurCorner) },
      { id: "radonsperre", position: v3(fu.radonPoint) },
    ],
    bindingsverk: [
      { id: "stendere", position: v3(W(B, 2.55, HW - 0.1, 1.6)) },
      { id: "bjelkelag", position: v3(W(A, 2.5, HW - 0.35, (Y.top1 + Y.joistTop) / 2)) },
    ],
    isolasjon: [
      { id: "trefiber", position: v3(W(B, 3.4, HW - 0.05, 4.1)) },
      { id: "vindsperre", position: v3(W(A, 4.2, HW + 0.03, 1.5)) },
    ],
    tak: [
      { id: "takstoler", position: v3(W(A, A.L + 0.32, 1.6, rafterTop(1.6) - 0.18)) },
      { id: "falsetak", position: v3(W(B, 2.4, 2.4, roofTop(2.4) + 0.06)) },
    ],
    vinduer: [
      { id: "store-vinduer", position: v3(W(A, 2.4, HW + 0.05, 1.75)) },
      { id: "tetting-karm", position: v3(W(B, 2.36, HW + 0.03, 1.6)) },
    ],
    kledning: [
      { id: "staende-kledning", position: v3(W(B, B.L + CLAD_OUT, -2.6, 2.0)) },
      { id: "luftespalte", position: v3(W(A, A.L + CLAD_OUT, -3.0, 0.42)) },
      { id: "overflate", position: v3(W(B, 3.4, HW + CLAD_OUT, 3.7)) },
    ],
    installasjoner: [
      { id: "el-anlegg", position: v3(inst.fuseBox) },
      { id: "vann-avlop", position: v3(inst.drain) },
    ],
    interior: [
      { id: "bad", position: v3(intr.bath) },
      { id: "kjokken", position: v3(intr.kitchen) },
      { id: "trapp", position: v3(intr.stair) },
    ],
    nokkelferdig: [
      { id: "overlevering", position: v3(fin.entry) },
      { id: "terrasse", position: v3(fin.terrace) },
      { id: "bla-time", position: v3(W(B, B.L + CLAD_OUT, 0, 4.8)) },
    ],
  };
  await checkHotspotIds(hotspots);

  // --- write GLB ---
  await fs.mkdir(OUT_DIR, { recursive: true });
  const stats = await writeGLB([house], materialSpecs(), path.join(OUT_DIR, "house.glb"), { sceneName: "Scene" });

  // --- meta ---
  const bboxOf = (node) => {
    const box = new THREE.Box3();
    const visit = (n, off) => {
      const o = n.translation ? off.clone().add(V(...n.translation)) : off;
      for (const mb of n.parts.values()) {
        for (let i = 0; i < mb.positions.length; i += 3) box.expandByPoint(V(mb.positions[i] + o.x, mb.positions[i + 1] + o.y, mb.positions[i + 2] + o.z));
      }
      n.children.forEach((c) => visit(c, o));
    };
    visit(node, V());
    return box;
  };
  const houseBox = new THREE.Box3();
  const layerMeta = {};
  for (const id of STEPS) {
    const b = bboxOf(layers[id]);
    if (["bindingsverk", "isolasjon", "tak", "vinduer", "kledning"].includes(id)) houseBox.union(b);
    const c = b.getCenter(V());
    layerMeta[id] = {
      node: `layer_${id}`,
      order: STEPS.indexOf(id),
      center: v3(c),
      bbox: { min: v3(b.min), max: v3(b.max) },
      explode: EXPLODE[id],
    };
  }
  const envBox = bboxOf(terrain);
  const meta = {
    generator: "scripts/model/build-house.mjs",
    units: "m",
    up: "+y",
    orientation: "−z is north (road/entry side), +z is south (garden). The joint between the two wings is at the origin.",
    model: {
      name: "House in Bergen — vår tolkning",
      architect: "Kvalbein Korsøen Arkitektur",
      footprint: `two wings, ${2 * HW} m wide (frame), ${A.L} m + ${B.L} m long, bending ${round(THREE.MathUtils.radToDeg(BEND))}° at a mitred joint; ≈ ${Math.round(polyArea(outline(CLAD_OUT)))} m² gross per floor`,
      floorsAboveGround: 2,
      roofPitchDeg: 40,
      ridgeHeight: round(RIDGE_Y),
    },
    bbox: { min: v3(houseBox.min), max: v3(houseBox.max), note: "the building above ground (frame, envelope, roof, cladding)" },
    sceneBbox: { min: v3(envBox.min), max: v3(envBox.max) },
    floors: [
      { name: "1. etasje", y: Y.ff1, cutHeight: round(Y.ff1 + 1.3) },
      { name: "2. etasje", y: Y.ff2, cutHeight: round(Y.ff2 + 1.25) },
    ],
    cutHeights: [round(Y.ff1 + 1.3), round(Y.ff2 + 1.25)],
    steps: STEPS,
    layers: layerMeta,
    transient: {
      note: "Child groups with userData.hideFrom are construction-only: hide them once the active step index ≥ index(hideFrom).",
      tomt_situasjonsplan: { hideFrom: "bindingsverk" },
      tomt_stikning: { hideFrom: "fundament" },
      tomt_mark: { hideFrom: "grunnarbeid" },
      grunnarbeid_steinmasser: { hideFrom: "bindingsverk" },
    },
    hotspots,
    environment: {
      terrain: "env_terrain",
      maples: [
        { node: "env_maple_a", position: v3(V(MAPLE_A.x, terrainHeight(MAPLE_A.x, MAPLE_A.z), MAPLE_A.z)) },
        { node: "env_maple_b", position: v3(V(MAPLE_B.x, terrainHeight(MAPLE_B.x, MAPLE_B.z), MAPLE_B.z)) },
      ],
      birches: birchSpots.map((_, i) => `env_birch_${String(i + 1).padStart(2, "0")}`),
      backdrop: "env_hills",
    },
    materials: {
      glass: "material name 'glass' (alpha blend). Mesh nodes: vinduer_glass, interior_bad_glassvegg, interior_rekkverk_glass.",
      el_line: "emissive, x-ray el runs (layer_installasjoner)",
      vvs_line: "emissive, x-ray VVS runs (layer_installasjoner)",
      lamp_glow: "warm emissive lamps (layer_nokkelferdig); dim/switch off in day mode",
      cladding_wood: {
        note: "vertex colours hold the raw spruce tone per board; material colour is a linear multiply factor",
        rawColorFactor: "#ffffff",
        stainedColorFactor: `#${new THREE.Color().setRGB(...stainFactor(), THREE.LinearSRGBColorSpace).getHexString()}`,
        rawTone: CLADDING_RAW,
        stainedTone: CLADDING_STAIN,
      },
    },
    interiorLights: [
      { room: "kjøkken", position: v3(W(A, 2.7, 1.0, Y.ff1 + 2.2)), color: "#ffc98a", intensity: 1.0 },
      { room: "stue", position: v3(W(B, 2.9, 1.4, Y.ff1 + 2.2)), color: "#ffc68a", intensity: 1.0 },
      { room: "gang", position: v3(W(A, 1.7, -2.2, Y.ff1 + 2.3)), color: "#ffcf96", intensity: 0.6 },
      { room: "soverom", position: v3(W(B, 3.0, 1.0, Y.ff2 + 1.9)), color: "#ffc07e", intensity: 0.7 },
      { room: "soverom 2", position: v3(W(A, 2.9, 1.2, Y.ff2 + 1.9)), color: "#ffc07e", intensity: 0.5 },
      { room: "inngang", position: v3(W(A, (NICHE.u0 + NICHE.u1) / 2, -HW + 0.2, 2.4)), color: "#ffcf96", intensity: 0.8 },
    ],
    exteriorLights: [
      { name: "vegglampe terrasse", position: v3(W(B, 0.66, HW + CLAD_OUT + 0.2, 2.1)), color: "#ffc98a", intensity: 1.0 },
      { name: "vegglampe terrasse 2", position: v3(W(B, 2.55, HW + CLAD_OUT + 0.2, 2.1)), color: "#ffc98a", intensity: 1.0 },
      { name: "vegglampe inngang", position: v3(W(A, 0.62, -(HW + CLAD_OUT + 0.2), 2.1)), color: "#ffc98a", intensity: 1.0 },
      { name: "nisje", position: v3(W(A, (NICHE.u0 + NICHE.u1) / 2, -HW + 0.25, NICHE.y1 - 0.15)), color: "#ffcf96", intensity: 0.8 },
    ],
    footprint: {
      note: "plan polygons (x, z) — frame face and outer cladding face",
      frame: outline(0).map((p) => [round(p.x), round(p.z)]),
      cladding: outline(CLAD_OUT).map((p) => [round(p.x), round(p.z)]),
      bendDeg: round(THREE.MathUtils.radToDeg(BEND)),
      wings: {
        A: { length: A.L, axis: [A.eu.x, A.eu.z] },
        B: { length: B.L, axis: [round(B.eu.x), round(B.eu.z)] },
      },
    },
    camera: CAMERAS,
    lighting: LIGHTING,
    stats,
  };
  await fs.writeFile(path.join(OUT_DIR, "house.meta.json"), JSON.stringify(meta, null, 2) + "\n");
  console.log(`house.glb ${(stats.bytes / 1024).toFixed(0)} KB · meshes ${stats.meshes} · vertices ${stats.vertices} · triangles ${stats.triangles}`);
  void RAFTER_VD;
}

function polyArea(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    a += p.x * q.z - q.x * p.z;
  }
  return Math.abs(a) / 2;
}

function round(x) {
  return Math.round(x * 1000) / 1000;
}

/** Make sure every hotspot id in src/content/build.ts has a position. */
async function checkHotspotIds(hotspots) {
  const src = await fs.readFile(path.join(ROOT, "src/content/build.ts"), "utf8");
  const blocks = src.split(/\n {2}\{\n {4}id: "/).slice(1);
  const problems = [];
  for (const block of blocks) {
    const stepId = block.slice(0, block.indexOf('"'));
    const ids = [...block.matchAll(/\n {8}id: "([^"]+)"/g)].map((m) => m[1]);
    const have = (hotspots[stepId] || []).map((h) => h.id);
    for (const id of ids) if (!have.includes(id)) problems.push(`${stepId}.${id} missing`);
    for (const id of have) if (!ids.includes(id)) problems.push(`${stepId}.${id} not in content`);
  }
  if (problems.length) throw new Error(`Hotspot ids out of sync with src/content/build.ts:\n${problems.join("\n")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
