#!/usr/bin/env node
/**
 * Builds Husmodell Adria (Boligpartner), our procedural 3D interpretation, with
 * its garden, as named layer groups in Norwegian build order, three roof forms
 * (saltak, flatt tak, pulttak) and the ink linework of the drawings.
 *
 * Writes
 *   public/models/house.glb               high quality (desktop)
 *   public/models/house-lite.glb          lite quality (phones, tablets, weak GPUs)
 *   public/models/house.meta.json         shared by both (computed from the high build)
 *   public/renders/adria-fasade-hage.svg  the garden elevation as linework (home page)
 *   scripts/render/.cache/house.parts.glb high quality, one node per part (render harness only)
 *
 * Contract (docs/DIRECTION-adria.md §1.13): the runtime's eleven layer groups
 * (layer_<step>), env_* groups, fx_lines; roof-specific nodes end in
 * "__saltak" / "__flatt" / "__pulttak"; upper-floor ceilings end in "__ceiling"
 * (`<name>__<roof>__ceiling`). Test a node with name.includes("__<roof>") and
 * name.endsWith("__ceiling").
 *
 * Run: npm run model:build
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as THREE from "three";
import { SceneNode, V, resetSharedRngs } from "./lib/builder.mjs";
import { describe, writeGLB } from "./lib/gltf.mjs";
import { Q, setQuality } from "./lib/quality.mjs";
import { CAMERAS, LIGHTING, PHOTO_MATCH } from "./lib/cameras.mjs";
import {
  CHIMNEY,
  CLADDING_RAW,
  CLADDING_STAIN,
  DEFAULT_ROOF,
  HX,
  HZ,
  LITE_MATERIAL_CLASSES,
  LV,
  PERGOLA,
  R1,
  R2,
  ROOF,
  ROOFS,
  materialSpecs,
} from "./lib/adria/spec.mjs";
import { buildCanopy, buildEnvelope, buildFrame } from "./lib/adria/shell.mjs";
import { buildRoofs } from "./lib/adria/roofs.mjs";
import { buildInterior } from "./lib/adria/interior.mjs";
import { buildFundament, buildGrunnarbeid, buildTomt } from "./lib/adria/site.mjs";
import { buildDeck, buildOutdoorFurniture, buildPergola, buildPlanting } from "./lib/adria/garden.mjs";
import {
  OUTBUILDING,
  TREES,
  buildBackdrop,
  buildGround,
  buildLawn,
  buildOutbuilding,
  buildTerrace,
  buildTrees,
  hedge,
  setGroundShadows,
  skyNode,
  terrainHeight,
  treeShadowBlobs,
} from "./lib/adria/env.mjs";
import { buildFxLines, gardenElevationSVG } from "./lib/adria/lines.mjs";
import { lawnDetail, leafAtlas } from "./lib/adria/textures.mjs";
import { FRAMES, faceBox } from "./lib/adria/faces.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT_DIR = path.join(ROOT, "public/models");
const PARTS_DIR = path.join(ROOT, "scripts/render/.cache");
const SVG_OUT = path.join(ROOT, "public/renders/adria-fasade-hage.svg");
const VARIANTS = { high: "/models/house.glb", lite: "/models/house-lite.glb" };

export const STEPS = ["tomt", "grunnarbeid", "fundament", "bindingsverk", "isolasjon", "tak", "vinduer", "kledning", "installasjoner", "interior", "nokkelferdig"];

/** Hero build steps (direction §2.5) → layers. */
export const HERO_STEPS = {
  grunnmur: ["tomt", "grunnarbeid", "fundament"],
  reisverk: ["bindingsverk"],
  tett: ["isolasjon", "tak", "vinduer"],
  kledning: ["kledning", "installasjoner", "interior"],
  nokkelferdig: ["nokkelferdig"],
};
const heroStepOf = (id) => Object.keys(HERO_STEPS).find((k) => HERO_STEPS[k].includes(id));

/**
 * Timelapse births (desktop seconds, 8.3 s run; direction §2.3) and how each
 * layer grows. Phone timings scale by `phone` (6.4 s run).
 */
const BIRTH = {
  tomt: [2.3, 3.4],
  grunnarbeid: [3.45, 3.6],
  fundament: [3.6, 3.9],
  bindingsverk: [3.75, 4.7],
  isolasjon: [4.7, 5.15],
  tak: [4.85, 5.6],
  vinduer: [5.15, 5.6],
  kledning: [5.6, 6.5],
  installasjoner: [6.2, 6.5],
  interior: [6.0, 6.5],
  nokkelferdig: [6.5, 7.5],
};
const GROW = {
  tomt: "draw",
  grunnarbeid: "up",
  fundament: "up",
  bindingsverk: "wipe-x",
  isolasjon: "wipe-x",
  tak: "wipe-roof",
  vinduer: "scale",
  kledning: "wipe-x",
  installasjoner: "scale",
  interior: "up",
  nokkelferdig: "scale",
};
const EXPLODE = {
  tomt: [0, -0.1, 0],
  grunnarbeid: [0, -0.6, 0],
  fundament: [0, -0.45, 0],
  bindingsverk: [0, 0, 0],
  isolasjon: [0, 0.05, 0.35],
  tak: [0, 1.4, 0],
  vinduer: [0, 0.1, 0.6],
  kledning: [0, 0.15, 0.9],
  installasjoner: [0, 0.3, -0.5],
  interior: [0, -0.05, -0.25],
  nokkelferdig: [0, 0, 0],
};

/** Physical installations only (no glowing runs): heat pump, technical cabinet, vent grille. */
function buildInstallations(layer) {
  const g = layer.mb("plinth", "installasjoner_teknisk");
  const s = layer.mb("steel_black", "installasjoner_stal");
  const F = FRAMES.N;
  // technical cabinet x [−0.30, +0.20], 0 … 1.30, 0.35 deep, standing 0.10 off the wall
  faceBox(g, F, -0.3, 0.2, LV.drive + 0.02, 1.3, -0.45, -0.1, null);
  // vent grille 0.25 × 0.25 at x ≈ +0.50, y ≈ +2.3
  faceBox(s, F, 0.375, 0.625, 2.175, 2.425, -0.02, 0, null, { front: true });
  for (let k = 0; k < 5; k++) faceBox(s, F, 0.385, 0.615, 2.19 + k * 0.045, 2.2 + k * 0.045, -0.035, -0.02, null);
  // heat-pump outdoor unit on wall brackets (north wall, west part)
  const x0 = -5.4;
  faceBox(g, F, x0, x0 + 0.9, 0.45, 1.1, -0.42, -0.1, null);
  faceBox(s, F, x0 + 0.1, x0 + 0.55, 0.55, 1.0, -0.425, -0.42, null);
  for (const dx of [0.12, 0.78]) faceBox(s, F, x0 + dx - 0.02, x0 + dx + 0.02, 0.4, 0.45, -0.45, 0, null);
}

/** Build the whole scene with the active quality profile. */
function buildScene() {
  resetSharedRngs();
  const house = new SceneNode("House", {
    house: "adria",
    name: "Husmodell Adria fra Boligpartner, vår 3D-tolkning",
    credit: "Husmodell Adria fra Boligpartner",
    note: "Procedural interpretation by Bygg og Renovering Vest from Boligpartner's published images and elevations. Interior and garden are our illustration. [MANGLER: bekreft avtale med Boligpartner om bruk av husmodell og bilder]",
    units: "m",
    roofVariants: ROOFS,
    defaultRoof: DEFAULT_ROOF,
  });
  const layers = {};
  STEPS.forEach((id, i) => {
    layers[id] = house.add(new SceneNode(`layer_${id}`, { step: id, order: i, explode: EXPLODE[id], heroStep: heroStepOf(id), birth: BIRTH[id], grow: GROW[id] }));
  });

  // ---- environment ----
  setGroundShadows(treeShadowBlobs());
  buildLawn(house.add(new SceneNode("env_lawn", { kind: "lawn" })));
  buildGround(house.add(new SceneNode("env_terrain", { kind: "terrain" })));
  buildTerrace(house.add(new SceneNode("env_terrace", { kind: "terrace" })));
  const hedges = house.add(new SceneNode("env_hedge", { kind: "hedge" }));
  hedge(hedges.add(new SceneNode("env_hedge_hage")), { x: -14, z: -33 }, { x: 45, z: -33 }, { h: 1.85, d: 0.9, seed: 3 });
  hedge(hedges.add(new SceneNode("env_hedge_innkjorsel_a")), { x: 6, z: -11.2 }, { x: 30, z: -11.2 }, { h: 1.1, d: 0.8, seed: 4 });
  hedge(hedges.add(new SceneNode("env_hedge_innkjorsel_b")), { x: 15, z: -4.9 }, { x: 30, z: -4.9 }, { h: 1.1, d: 0.8, seed: 5 });
  buildTrees(house.add(new SceneNode("env_trees", { kind: "trees", note: "instanced leaf-card trees; shadows on the lawn are baked into env_lawn's vertex colours" })));
  buildOutbuilding(house.add(new SceneNode("env_outbuilding", { kind: "outbuilding" })));
  buildBackdrop(house.add(new SceneNode("env_backdrop", { kind: "backdrop" })), { camera: PHOTO_MATCH });
  house.add(skyNode());

  // ---- build layers ----
  buildTomt(layers.tomt);
  buildGrunnarbeid(layers.grunnarbeid);
  buildFundament(layers.fundament);
  buildFrame(layers.bindingsverk);
  buildEnvelope(layers);
  buildCanopy(layers.vinduer);
  buildRoofs(layers);
  buildInstallations(layers.installasjoner);
  buildInterior(layers.interior);
  buildDeck(layers.nokkelferdig);
  buildPergola(layers.nokkelferdig);
  buildOutdoorFurniture(layers.nokkelferdig);
  buildPlanting(layers.nokkelferdig);

  // ---- ink linework (timelapse only) ----
  const fx = house.add(new SceneNode("fx_lines", { kind: "lines", timelapseOnly: true, note: "ink linework of the saltak elevations (glTF LINES, line_ink); per-vertex _ORDER 0…1 = drawing order (GLTFLoader exposes it as attribute '_order')" }));
  buildFxLines(fx);
  return { house, layers };
}

/* --------------------------------------------------------------------------------------------- */
/* Meta                                                                                           */
/* --------------------------------------------------------------------------------------------- */

const round = (x) => Math.round(x * 1000) / 1000;
const v3 = (p) => [round(p.x), round(p.y), round(p.z)];

function bboxOf(node, filter = () => true) {
  const box = new THREE.Box3();
  const visit = (n, off) => {
    if (!filter(n)) return;
    const o = n.translation ? off.clone().add(V(...n.translation)) : off;
    for (const mb of n.parts.values()) {
      if (n.instances) {
        for (const inst of n.instances) {
          for (let i = 0; i < mb.positions.length; i += 9) {
            const s = inst.scale[0];
            box.expandByPoint(V(mb.positions[i] * s + inst.translation[0], mb.positions[i + 1] * s + inst.translation[1], mb.positions[i + 2] * s + inst.translation[2]));
          }
        }
        continue;
      }
      for (let i = 0; i < mb.positions.length; i += 3) box.expandByPoint(V(mb.positions[i] + o.x, mb.positions[i + 1] + o.y, mb.positions[i + 2] + o.z));
    }
    n.children.forEach((c) => visit(c, o));
  };
  visit(node, V());
  return box;
}

/** Named anchors (world metres) for hotspots, captions and camera targets. */
function anchors() {
  const S = ROOF.saltak;
  return {
    situasjonsplan: [-HX, terrainHeight(-HX, HZ) + 0.05, HZ + 1.6],
    byggegrop: [0, -0.8, 4.6],
    jordhaug: [-13, -0.1, -8],
    ringmur: [HX - 0.2, -0.3, HZ - 0.2],
    radonsperre: [2, -0.2, 0],
    stendere: [-3.5, 1.6, -HZ + 0.15],
    bjelkelag: [-2, 2.9, 0],
    vindsperre: [-HX + 0.06, 1.6, -1.8],
    takstoler: [-4, S.under(1.8) + 0.1, 1.8],
    takstein: [-3, S.outer(2.0), 2.0],
    pipe: [CHIMNEY.x, S.chimneyTop - 0.4, CHIMNEY.z],
    "store-vinduer": [2.85, 4.4, HZ + 0.02],
    "r1-ramme": [HX + 0.02, ROOF.saltak.outer(0) - 0.4, 0],
    balkong: [6.8, LV.balconyFloor + 0.6, 2.0],
    "losje-vest": [-5.2, 4.0, HZ],
    kledning: [-4.0, 2.0, HZ + 0.02],
    "panel-mork": [-0.05, 4.2, HZ + 0.02],
    pergola: [0.35, PERGOLA.beamTop, PERGOLA.z1],
    terrasse: [10.5, LV.deck + 0.4, 2.0],
    plantekasse: [3.4, 0.2, 7.9],
    inngang: [-2.0, 1.2, -HZ - 0.05],
    baldakin: [-2.0, 2.45, -HZ - 0.5],
    varmepumpe: [-4.95, 0.8, -HZ - 0.3],
    "teknisk-skap": [-0.05, 0.7, -HZ - 0.3],
    bad: [-1.8, LV.ff1 + 0.8, -2.4],
    kjokken: [3.75, 1.0, -0.4],
    trapp: [1.3, 1.6, -0.4],
    allrom: [2.8, LV.ff1 + 0.9, 2.0],
    hovedsoverom: [-5.3, LV.ff1 + 0.7, -1.1],
    bjork: [TREES.birch[0][0], terrainHeight(TREES.birch[0][0], TREES.birch[0][1]) + 4, TREES.birch[0][1]],
    utebod: [OUTBUILDING.x + 2.2, 2.0, OUTBUILDING.z - 0.8],
  };
}

/** Legacy hotspot ids (pre-Adria src/content/build.ts) → anchors. */
const LEGACY_HOTSPOT = {
  situasjonsplan: "situasjonsplan",
  lonnetraer: "bjork",
  byggegrop: "byggegrop",
  sprengstein: "jordhaug",
  ringmur: "ringmur",
  radonsperre: "radonsperre",
  stendere: "stendere",
  bjelkelag: "bjelkelag",
  trefiber: "stendere",
  vindsperre: "vindsperre",
  takstoler: "takstoler",
  falsetak: "takstein",
  "store-vinduer": "store-vinduer",
  "tetting-karm": "store-vinduer",
  "staende-kledning": "kledning",
  luftespalte: "kledning",
  overflate: "panel-mork",
  "el-anlegg": "teknisk-skap",
  "vann-avlop": "bad",
  bad: "bad",
  kjokken: "kjokken",
  trapp: "trapp",
  overlevering: "inngang",
  terrasse: "terrasse",
  "bla-time": "r1-ramme",
};

/** Hotspots for whatever ids src/content/build.ts lists today (warns instead of failing). */
async function hotspotsFromContent(A) {
  const out = Object.fromEntries(STEPS.map((s) => [s, []]));
  let src = "";
  try {
    src = await fs.readFile(path.join(ROOT, "src/content/build.ts"), "utf8");
  } catch {
    return out;
  }
  const blocks = src.split(/\n {2}\{\n {4}id: "/).slice(1);
  for (const block of blocks) {
    const stepId = block.slice(0, block.indexOf('"'));
    const ids = [...block.matchAll(/\n {8}id: "([^"]+)"/g)].map((m) => m[1]);
    for (const id of ids) {
      const key = A[id] ? id : LEGACY_HOTSPOT[id];
      if (!key) {
        console.warn(`hotspot ${stepId}.${id}: no anchor (add one to anchors() in build-house.mjs)`);
        continue;
      }
      const layer = out[stepId] ? stepId : HERO_STEPS[stepId]?.[HERO_STEPS[stepId].length - 1];
      if (!layer) continue;
      out[layer].push({ id, position: A[key], anchor: key });
    }
  }
  return out;
}

async function main() {
  setQuality("high");
  const { house, layers } = buildScene();

  const layerMeta = {};
  const houseBox = new THREE.Box3();
  for (const id of STEPS) {
    const shared = bboxOf(layers[id], (n) => !n.name.includes("__") || n.name.includes("__saltak"));
    if (["bindingsverk", "isolasjon", "tak", "vinduer", "kledning"].includes(id)) houseBox.union(shared);
    const all = bboxOf(layers[id]);
    layerMeta[id] = {
      node: `layer_${id}`,
      order: STEPS.indexOf(id),
      heroStep: heroStepOf(id),
      center: v3(shared.getCenter(V())),
      bbox: { min: v3(all.min), max: v3(all.max) },
      explode: EXPLODE[id],
      birth: BIRTH[id],
      grow: GROW[id],
    };
  }
  const sceneBox = new THREE.Box3();
  for (const n of house.children) if (n.name === "env_lawn") sceneBox.union(bboxOf(n));
  // transient (construction-only) groups and roof/ceiling groups
  const transient = { note: "Child groups with extras.hideFrom are construction-only or enclosed: hide them once the active step index ≥ index(hideFrom)." };
  const roofNodes = { saltak: [], flatt: [], pulttak: [], ceiling: [] };
  const walk = (n) => {
    if (n.extras?.hideFrom) transient[n.name] = { hideFrom: n.extras.hideFrom };
    for (const r of ROOFS) if (n.name.includes(`__${r}`) && !n.name.endsWith("__ceiling")) roofNodes[r].push(n.name);
    if (n.name.endsWith("__ceiling")) roofNodes.ceiling.push(n.name);
    n.children.forEach(walk);
  };
  walk(house);

  const A = anchors();
  const hotspots = await hotspotsFromContent(A);
  const anchorMeta = Object.fromEntries(Object.entries(A).map(([k, p]) => [k, p.map(round)]));

  const meta = {
    generator: "scripts/model/build-house.mjs",
    house: "adria",
    units: "m",
    up: "+y",
    orientation: "Origin = centre of the main volume's outer cladding footprint at ground FFL. +x east (framed R1 gable), +z south (garden, images 1, 2, 4), −z north (entrance, image 3).",
    model: {
      name: "Adria",
      supplier: "Boligpartner",
      credit: "Husmodell Adria fra Boligpartner",
      url: "https://boligpartner.no/ferdighus/moderne/adria",
      facts: { braI: "ca. 159 m² BRA-i", soverom: 4, bad: 2, energimerking: "B", tomt: "flat tomt, passer godt på smale tomter", taktyper: ["flatt tak", "pulttak", "saltak"] },
      rights: "[MANGLER: bekreft avtale med Boligpartner om bruk av husmodell og bilder]",
      note: "Our 3D interpretation from Boligpartner's published images and elevations; the elevation drawings are never published. Interior and garden are our illustration.",
      footprint: { length: 2 * HX, depth: 2 * HZ, gross: round(4 * HX * HZ), wallThickness: 0.35 },
      levels: { ...LV },
      roofs: {
        saltak: { pitchDeg: round((ROOF.saltak.pitch * 180) / Math.PI), ridge: round(ROOF.saltak.ridge), wallPlaneOuter: ROOF.saltak.wallPlaneOuter, eaveOverhang: ROOF.saltak.eave, chimneyTop: ROOF.saltak.chimneyTop },
        flatt: { parapet: ROOF.flatt.parapet, membrane: ROOF.flatt.membrane, chimneyTop: ROOF.flatt.chimneyTop, ceiling: ROOF.flatt.ceiling },
        pulttak: { pitchDeg: round((ROOF.pulttak.pitch * 180) / Math.PI), low: ROOF.pulttak.low, high: ROOF.pulttak.high, chimneyTop: ROOF.pulttak.chimneyTop },
      },
      loggias: { R1, R2 },
      chimney: CHIMNEY,
    },
    roofVariants: ROOFS,
    defaultRoof: DEFAULT_ROOF,
    suffixes: {
      roof: "__saltak | __flatt | __pulttak (test name.includes(`__${roof}`))",
      ceiling: "<name>__<roof>__ceiling (test name.endsWith('__ceiling'))",
      shared: "nodes without a suffix are shared by all roof forms",
      seInn: "Se inn: lift + hide the current roof's layer_tak group and its __ceiling nodes; layer_bindingsverk roof groups are hidden from 'interior' on (hideFrom)",
    },
    roofNodes,
    variants: VARIANTS,
    bbox: { min: v3(houseBox.min), max: v3(houseBox.max), note: "the building above ground (frame, envelope, saltak roof, cladding)" },
    sceneBbox: { min: v3(sceneBox.min), max: v3(sceneBox.max), note: "the lawn" },
    floors: [
      { name: "1. etasje", y: LV.ff0, cutHeight: round(LV.ff0 + 1.3) },
      { name: "2. etasje", y: LV.ff1, cutHeight: round(LV.ff1 + 1.25) },
    ],
    cutHeights: [round(LV.ff0 + 1.3), round(LV.ff1 + 1.25)],
    steps: STEPS,
    heroSteps: HERO_STEPS,
    layers: layerMeta,
    timeline: {
      note: "Layer births in seconds of the desktop timelapse (8.3 s). Phones: multiply by 6.4 / 8.3. Instanced plants carry a per-instance _BIRTH (exposed by GLTFLoader as the instanced attribute '_BIRTH'); rename to aBirth in the shader.",
      desktop: 8.3,
      phone: 6.4,
      phases: {
        tvilling: [0, 0.7],
        tilPapir: [0.7, 1.6],
        tilbake: [1.4, 2.3],
        tegningen: [2.3, 3.6],
        reisverket: [3.6, 4.7],
        taket: [4.7, 5.6],
        kledningen: [5.6, 6.5],
        hagen: [6.5, 7.5],
        virkeligheten: [7.5, 8.3],
      },
      shadowRenderAt: 7.3,
    },
    transient,
    hotspots,
    anchors: anchorMeta,
    environment: {
      groups: ["env_lawn", "env_terrain", "env_terrace", "env_hedge", "env_trees", "env_outbuilding", "env_backdrop", "env_sky"],
      trees: TREES,
      outbuilding: OUTBUILDING,
      framingFoliage: "nokkelferdig_rammeblader (in layer_nokkelferdig/nokkelferdig_beplantning): only for the photo framing; dither out when the stage expands",
      note: "Trees, hedge and the outbuilding never move: their ground shadows are baked into env_lawn's vertex colours. Do not let env_trees, env_backdrop or env_outbuilding cast shadows.",
    },
    materials: {
      note: "Material names the runtime treats specially: glass, glass_rail (alpha blend), leaf (alpha mask, double sided, map leaf_atlas), line_ink (LINES), lamp_glow (emissive), cladding_wood (vertex colours × factor), terrain (vertex colours).",
      cladding_wood: { rawColorFactor: CLADDING_RAW, stainedColorFactor: CLADDING_STAIN, note: "material colour = stained factor (albedo); vertex colours carry per-board variation. Set rawColorFactor for untreated wood." },
      clay: LIGHTING.paper.clay,
    },
    interiorLights: [],
    exteriorLights: [],
    footprint: {
      note: "plan polygons (x, z) at the outer cladding face",
      cladding: [[-HX, -HZ], [HX, -HZ], [HX, HZ], [-HX, HZ]].map((p) => p.map(round)),
      heated: [[-HX, -HZ], [R1.x0, -HZ], [R1.x0, HZ], [R2.x1, HZ], [R2.x1, R2.z0], [-HX, R2.z0]].map((p) => p.map(round)),
      R1,
      R2,
      bendDeg: 0,
      wings: { A: { length: 2 * HX, axis: [1, 0] }, B: { length: 0, axis: [1, 0] } },
    },
    camera: {
      ...CAMERAS,
      steps: { ...CAMERAS.steps, ...CAMERAS.legacySteps },
    },
    lighting: LIGHTING,
    photos: {
      photoMatch: { saltak: "adria-saltak-hage", flatt: "adria-flatt-tak-hage" },
      photoMatchInnkjorsel: { pulttak: "adria-pulttak-innkjorsel" },
      note: "Boligpartner images (public/images/adria/<key>-<w>.{avif,webp}). Without permission (supplierImagesEnabled = false) use our renders adria-twin, adria-twin-flatt, adria-twin-pulttak-innkjorsel.",
    },
  };

  // ---- textures ----
  const texHigh = await leafAtlas(Q().leafAtlas);
  const lawnHigh = await lawnDetail(512);
  // ---- write GLBs ----
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.mkdir(PARTS_DIR, { recursive: true });
  const specs = materialSpecs();
  const parts = await writeGLB([house], specs, path.join(PARTS_DIR, "house.parts.glb"), { layout: "parts", textures: { leaf_atlas: texHigh, lawn_detail: lawnHigh } });
  const high = await writeGLB([house], specs, path.join(OUT_DIR, "house.glb"), { layout: "merged", textures: { leaf_atlas: texHigh, lawn_detail: lawnHigh } });
  setQuality("lite");
  const lite0 = buildScene();
  const texLite = await leafAtlas(Q().leafAtlas);
  const lawnLite = await lawnDetail(256);
  const lite = await writeGLB([lite0.house], specs, path.join(OUT_DIR, "house-lite.glb"), {
    layout: "merged",
    materialClasses: LITE_MATERIAL_CLASSES,
    textures: { leaf_atlas: texLite, lawn_detail: lawnLite },
  });
  setQuality("high");

  // ---- SVG elevation ----
  await fs.mkdir(path.dirname(SVG_OUT), { recursive: true });
  const svg = gardenElevationSVG();
  await fs.writeFile(SVG_OUT, svg);

  meta.bytes = { high: high.bytes, lite: lite.bytes };
  meta.variantBytes = meta.bytes;
  meta.textures = {
    leaf_atlas: { high: texHigh.data.length, lite: texLite.data.length, size: { high: 1024, lite: 512 } },
    lawn_detail: { high: lawnHigh.data.length, lite: lawnLite.data.length, size: { high: 512, lite: 256 }, uv: "world XZ × 0.4 (2.5 m tile)" },
  };
  meta.stats = {
    note: "File totals (every node, all three roofs). Per-state draw calls / triangles / programs are measured by scripts/model/verify-models.mjs and written to stats.states.",
    high: pick(high),
    lite: pick(lite),
  };
  await fs.writeFile(path.join(OUT_DIR, "house.meta.json"), JSON.stringify(meta, null, 2) + "\n");
  console.log(describe("house.glb", high));
  console.log(describe("house-lite.glb", lite));
  console.log(describe("house.parts.glb (render harness)", parts));
  console.log(`adria-fasade-hage.svg ${(svg.length / 1024).toFixed(1)} KB`);
}

function pick(s) {
  return { bytes: s.bytes, meshes: s.meshes, materials: s.materials, vertices: s.vertices, triangles: s.triangles, instancedTriangles: s.instancedTriangles, lines: s.lines, textures: s.textures };
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
