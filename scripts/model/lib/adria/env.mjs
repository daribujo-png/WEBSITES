/**
 * Environment of Adria, built to agree with Boligpartner's image 1 (the
 * garden side): terrain and lawn, the dark stone terrace in the foreground,
 * the hedge, birches / broadleaf trees / spruces (instanced leaf-card crowns),
 * the black pool house with its canopy, and a low-poly backdrop (tree band,
 * the forested hillside to the west, a faint far ridge) with aerial
 * perspective baked into the vertex colours. No images, no people.
 *
 * Positions come from back-projecting image 1 with the fitted camera
 * (docs/DIRECTION-adria.md §1.14), then tuned in overlay.
 */
import * as THREE from "three";
import { V, col, makeNoise2D, rng, SceneNode } from "../builder.mjs";
import { Q } from "../quality.mjs";
import { DECK, LV, TERRACE } from "./spec.mjs";
import { readFileSync } from "node:fs";
import { birch, broadleaf, crown, smooth, spruce, card } from "./veg.mjs";
import { TILE } from "./textures.mjs";

const SKYLINE = JSON.parse(readFileSync(new URL("./skyline.json", import.meta.url), "utf8"));
const nz = makeNoise2D(17);
const nz2 = makeNoise2D(29);

/** The pit / construction hole in the lawn (aligned to both lawn grids). */
export const PIT = { x0: -10, x1: 10, z0: -6, z1: 6 };
/** Lawn extent (aligned to 1, 2 and 5 m grids). */
export const LAWN = { x0: -30, x1: 45, z0: -35, z1: 30 };
/** Hole for the foreground terrace (aligned to the grids). */
export const TERRACE_HOLE = { x0: TERRACE.x[0], x1: TERRACE.x[1], z0: TERRACE.z[0], z1: TERRACE.z[1] };

/** Distance from (x, z) to the deck footprint (garden + east deck + house). */
function deckDist(x, z) {
  const rects = [
    [-7.8, 13.5, -4.5, 8.0],
    [-7.8, 7.8, -3.9, 3.9],
  ];
  let best = Infinity;
  for (const [x0, x1, z0, z1] of rects) {
    const dx = Math.max(x0 - x, 0, x - x1);
    const dz = Math.max(z0 - z, 0, z - z1);
    best = Math.min(best, Math.hypot(dx, dz));
  }
  return best;
}

/**
 * Ground height: lawn at −0.35 along the deck, falling gently towards the
 * camera to −1.30 at the foreground terrace; level −0.33 north of the house
 * (the drive) and a soft rise far away.
 */
export function terrainHeight(x, z) {
  const d = deckDist(x, z);
  // fall towards the south-east (the photo camera), none to the north/west
  const k = Math.max(0, (x - 6) * 0.45 + (z - 6) * 0.9) / Math.max(1e-3, Math.hypot(x - 6, z - 6));
  const fall = 0.95 * smooth(0.6, 7.5, d) * smooth(0.0, 0.7, k);
  let h = -0.35 - fall;
  // the drive side is level
  if (z < -3.9) h = -0.33 - 0.02 * smooth(0, 1, (-3.9 - z) / 2);
  // terrace pad: the lawn meets the slabs 4 cm above them
  const dx = Math.max(TERRACE_HOLE.x0 - x, 0, x - TERRACE_HOLE.x1);
  const dzT = Math.max(TERRACE_HOLE.z0 - z, 0, z - TERRACE_HOLE.z1);
  const dT = Math.hypot(dx, dzT);
  h = h + (TERRACE.top + 0.04 - h) * (1 - smooth(0.0, 3.0, dT));
  // gentle undulation far from the house
  const far = smooth(18, 40, Math.hypot(x - 2, z));
  h += far * (0.6 * nz.fbm(x * 0.02 + 3, z * 0.02 - 1, 3));
  return h;
}

/* --------------------------------------------------------------------------------------------- */
/* Lawn colour with baked tree shadows                                                            */
/* --------------------------------------------------------------------------------------------- */

/** Light comes from the south-west (sunHage); shadows fall towards +x, −z. */
const SUN = V(-0.55, 0.72, 0.42).normalize();
/** Shadow blobs on the ground: trees of the scene plus trees out of frame (photo, left). */
let SHADOWS = [];
export function setGroundShadows(list) {
  SHADOWS = list;
}
function shadowAt(x, z) {
  let s = 0;
  for (const b of SHADOWS) {
    const d = Math.hypot((x - b.x) / b.rx, (z - b.z) / b.rz);
    s = Math.max(s, b.k * (1 - smooth(0.55, 1.0, d)));
  }
  return s;
}

const LAWN_A = col("#7a8932");
const LAWN_B = col("#5a6824");
export function lawnColor(x, z) {
  const n = 0.5 + 0.5 * nz.fbm(x * 0.09 + 11, z * 0.09 - 7, 4);
  const n2 = 0.5 + 0.5 * nz2(x * 0.5, z * 0.5);
  const c = LAWN_A.clone().lerp(LAWN_B, Math.min(1, Math.max(0, n * 0.85 + n2 * 0.15)));
  // drier/lighter far away
  c.lerp(col("#7a8535"), smooth(25, 60, Math.hypot(x, z)) * 0.4);
  const sh = shadowAt(x, z);
  c.multiplyScalar(1 - 0.7 * sh);
  return c;
}

/* --------------------------------------------------------------------------------------------- */
/* Lawn grid and ground                                                                           */
/* --------------------------------------------------------------------------------------------- */

function grid(mb, x0, x1, z0, z1, cell, height, color, skip) {
  const nx = Math.round((x1 - x0) / cell);
  const nzc = Math.round((z1 - z0) / cell);
  const idx = new Map();
  const vtx = (i, j) => {
    const k = i * 100000 + j;
    if (idx.has(k)) return idx.get(k);
    const x = x0 + i * cell;
    const z = z0 + j * cell;
    const y = height(x, z);
    // normal from finite differences
    const e = cell * 0.5;
    const n = V(height(x - e, z) - height(x + e, z), 2 * e, height(x, z - e) - height(x, z + e)).normalize();
    const v = mb.vert(V(x, y, z), n, color(x, z));
    idx.set(k, v);
    return v;
  };
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nzc; j++) {
      const cx = x0 + (i + 0.5) * cell;
      const cz = z0 + (j + 0.5) * cell;
      if (skip && skip(cx, cz)) continue;
      const a = vtx(i, j);
      const b = vtx(i + 1, j);
      const c = vtx(i + 1, j + 1);
      const d = vtx(i, j + 1);
      mb.indices.push(a, d, c, a, c, b);
    }
  }
}

const inRect = (r, x, z) => x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1;

export function buildLawn(node) {
  const mb = node.mb("terrain", "env_lawn_gress");
  const cell = Q().lawnCell;
  grid(mb, LAWN.x0, LAWN.x1, LAWN.z0, LAWN.z1, cell, terrainHeight, lawnColor, (x, z) => inRect(PIT, x, z) || inRect(TERRACE_HOLE, x, z));
}

export function buildGround(node) {
  const mb = node.mb("terrain", "env_terrain_mark");
  const far = Q().lawnFar;
  const groundColor = (x, z) => {
    const c = lawnColor(x, z).lerp(col("#56602c"), 0.35);
    return c;
  };
  // medium ring (−100 … 100) around the lawn, cells of `far` metres
  grid(mb, -100, 100, -100, 100, far * 2.5, terrainHeight, groundColor, (x, z) => x > LAWN.x0 && x < LAWN.x1 && z > LAWN.z0 && z < LAWN.z1);
  // far plane to the backdrop (−700 … 700) with a square hole
  const y = -0.6;
  const c = col("#4d5733");
  const R0 = 100;
  const R1 = 700;
  const ring = [
    [V(-R1, y, -R1), V(R1, y, -R1), V(R0, y, -R0), V(-R0, y, -R0)],
    [V(R1, y, -R1), V(R1, y, R1), V(R0, y, R0), V(R0, y, -R0)],
    [V(R1, y, R1), V(-R1, y, R1), V(-R0, y, R0), V(R0, y, R0)],
    [V(-R1, y, R1), V(-R1, y, -R1), V(-R0, y, -R0), V(-R0, y, R0)],
  ];
  for (const q of ring) mb.face(q, V(0, -10, 0), c);
}

/* --------------------------------------------------------------------------------------------- */
/* Foreground terrace (dark slabs) and the slab path                                              */
/* --------------------------------------------------------------------------------------------- */

export function buildTerrace(node) {
  const slab = node.mb("slab", "env_terrace_heller");
  const base = node.mb("slab", "env_terrace_heller");
  const H = TERRACE_HOLE;
  const y = TERRACE.top;
  const r = rng(91);
  // joints: a dark base plane under the slabs
  base.face([V(H.x0, y - 0.004, H.z0), V(H.x1, y - 0.004, H.z0), V(H.x1, y - 0.004, H.z1), V(H.x0, y - 0.004, H.z1)], V(0, -10, 0), col("#4a4743"));
  // 0.6 × 1.2 slabs, long side along x, stretcher bond
  const j = 0.005;
  let row = 0;
  for (let z = H.z0; z < H.z1 - 1e-3; z += 0.6, row++) {
    const off = row % 2 ? 0.6 : 0;
    for (let x = H.x0 - off; x < H.x1 - 1e-3; x += 1.2) {
      const xa = Math.max(H.x0, x) + j;
      const xb = Math.min(H.x1, x + 1.2) - j;
      if (xb - xa < 0.05) continue;
      const t = 0.88 + r() * 0.2;
      slab.face([V(xa, y, z + j), V(xb, y, z + j), V(xb, y, z + 0.6 - j), V(xa, y, z + 0.6 - j)], V(0, -10, 0), col("#ffffff").multiplyScalar(t));
    }
  }
  // edge band (step) around the terrace down to the lawn
  const edge = node.mb("slab", "env_terrace_heller");
  const low = (x, z) => Math.min(terrainHeight(x, z), y) - 0.25;
  const high = (x, z) => Math.max(terrainHeight(x, z) + 0.02, y);
  const side = (a, b, inside) => {
    const n = 8;
    for (let i = 0; i < n; i++) {
      const p = a.clone().lerp(b, i / n);
      const q = a.clone().lerp(b, (i + 1) / n);
      edge.face([V(p.x, low(p.x, p.z), p.z), V(q.x, low(q.x, q.z), q.z), V(q.x, high(q.x, q.z), q.z), V(p.x, high(p.x, p.z), p.z)], inside, col("#3d3a37"));
    }
  };
  side(V(H.x0, 0, H.z0), V(H.x1, 0, H.z0), V(21, y, 18));
  side(V(H.x1, 0, H.z0), V(H.x1, 0, H.z1), V(21, y, 18));
  side(V(H.x1, 0, H.z1), V(H.x0, 0, H.z1), V(21, y, 18));
  side(V(H.x0, 0, H.z1), V(H.x0, 0, H.z0), V(21, y, 18));
  // a raised step block at the south-west corner of the terrace
  const sb = node.mb("slab", "env_terrace_heller");
  sb.aabb(V(H.x0, y - 0.3, H.z1 - 1.8), V(H.x0 + 3.6, y + 0.16, H.z1), col("#c9c3bb"));
  // a slab path leading west from the terrace's south-west corner
  for (let i = 0; i < 9; i++) {
    const x = H.x0 - 0.8 - i * 1.0;
    const z = H.z1 - 0.9 + Math.sin(i * 0.5) * 0.3;
    const yy = terrainHeight(x, z) + 0.015;
    const t = 0.85 + r() * 0.2;
    slab.face([V(x - 0.6, yy, z - 0.3), V(x + 0.3, yy, z - 0.3), V(x + 0.3, yy, z + 0.3), V(x - 0.6, yy, z + 0.3)], V(0, -10, 0), col("#ffffff").multiplyScalar(t));
  }
}

/* --------------------------------------------------------------------------------------------- */
/* Hedges                                                                                         */
/* --------------------------------------------------------------------------------------------- */

/** A clipped hedge between two plan points: dark core box + leaf cards on the faces. */
export function hedge(node, a, b, { h = 1.85, d = 0.9, seed = 1 } = {}) {
  const core = node.mb("hedge", `${node.name}_kjerne`);
  const leaf = node.mb("leaf", `${node.name}_blader`);
  const len = Math.hypot(b.x - a.x, b.z - a.z);
  const ux = (b.x - a.x) / len;
  const uz = (b.z - a.z) / len;
  const nx = -uz;
  const nzv = ux;
  const y0 = Math.min(terrainHeight(a.x, a.z), terrainHeight(b.x, b.z)) - 0.1;
  const P = (s, t, y) => V(a.x + ux * s + nx * t, y, a.z + uz * s + nzv * t);
  const inset = 0.12;
  core.hexa([P(0, -d / 2 + inset, y0), P(len, -d / 2 + inset, y0), P(len, d / 2 - inset, y0), P(0, d / 2 - inset, y0), P(0, -d / 2 + inset, y0 + h - inset), P(len, -d / 2 + inset, y0 + h - inset), P(len, d / 2 - inset, y0 + h - inset), P(0, d / 2 - inset, y0 + h - inset)], col("#2f3818"), { bottom: true });
  const r = rng(seed);
  const n = Math.max(4, Math.round(len * Q().hedgeCards));
  const tints = ["#f2f4ea", "#e2e8d6", "#d8dfca"];
  for (let i = 0; i < n; i++) {
    const s = (i + r()) * (len / n);
    // front and back faces
    for (const side of [1, -1]) {
      const p = P(s, side * (d / 2 - 0.02), y0 + h * (0.25 + 0.5 * r()));
      const nrm = V(nx * side, 0.15, nzv * side).normalize();
      card(leaf, p, 1.1 + r() * 0.4, h * 0.95, nrm, V(0, 1, 0), TILE.hedge, col(tints[i % 3]).multiplyScalar(0.85 + 0.2 * r()), nrm);
    }
    // top
    const pt = P(s, (r() - 0.5) * 0.2, y0 + h - 0.05);
    card(leaf, pt, 1.2, d * 1.05, V(0, 1, 0), V(ux, 0, uz), TILE.hedge, col(tints[(i + 1) % 3]), V(0, 1, 0));
  }
}

/* --------------------------------------------------------------------------------------------- */
/* Trees (instanced templates)                                                                    */
/* --------------------------------------------------------------------------------------------- */

/** Tree spots (x, z, height). Birches near the house and the left photo edge, broadleaf + spruce behind the hedge. */
export const TREES = {
  birch: [
    [-1.0, -20, 12.5],
    [5.5, -18, 11.5],
    [-6.5, -23, 13],
    [2.5, -26, 14],
    [8.2, 25.8, 13.5],
    [-28, 14, 12],
  ],
  broad: [
    [-9, -42, 18],
    [-2.5, -45, 19],
    [5.5, -41, 17],
    [-15, -38, 16],
    [-6.0, -52, 20],
    [1.5, -54, 19],
    [-12.5, -50, 17],
    [-30, -18, 15],
  ],
  spruce: [
    [0.5, -37, 16.5],
    [16, -44, 18],
  ],
};

const quatY = (a) => {
  const q = new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), a);
  return [q.x, q.y, q.z, q.w];
};

/** Understorey bushes behind the hedge (instanced), 3–6 m domes of broadleaf cards. */
function buildBushes(node) {
  const r = rng(808);
  const spots = [];
  const n = Q().name === "lite" ? 10 : 22;
  for (let i = 0; i < n; i++) {
    const x = -16 + (i / n) * 46 + r() * 2;
    const z = -35 - r() * 6;
    spots.push({ x, z, s: 0.8 + r() * 0.7 });
  }
  const tn = node.add(new SceneNode("env_trees_busk", { kind: "bush", instanced: true }));
  crown(tn.mb("leaf", "env_trees_busk_leaf"), [{ c: V(0, 2.2, 0), r: V(2.6, 2.2, 2.0) }, { c: V(1.6, 1.6, 0.4), r: V(1.8, 1.6, 1.6) }], {
    count: Q().name === "lite" ? 90 : 200,
    size: [0.9, 1.5],
    tile: TILE.broad,
    tints: ["#aab78c", "#9aa97e", "#b8c298"],
    seed: 99,
    clumps: 12,
    clumpR: 0.5,
    bottomDark: 0.55,
  });
  tn.instances = spots.map((p) => ({ translation: [p.x, terrainHeight(p.x, p.z), p.z], rotation: quatY(r() * Math.PI * 2), scale: [p.s, p.s, p.s] }));
}

export function buildTrees(node) {
  buildBushes(node);
  const T = Q().trees.templates;
  const r = rng(55);
  const groups = [
    { kind: "bjork", spots: TREES.birch, nominal: 12, make: (n, s) => birch(n, s, { h: 12 }) },
    { kind: "lauv", spots: TREES.broad, nominal: 17, make: (n, s) => broadleaf(n, s, { h: 17 }) },
    { kind: "gran", spots: TREES.spruce, nominal: 17, make: (n, s) => spruce(n, s, { h: 17 }) },
  ];
  const lite = Q().name === "lite";
  for (const g of groups) {
    let spots = g.spots;
    if (lite) spots = spots.filter((_, i) => i % 3 !== 2); // 8–9 trees on lite
    const nT = Math.min(T, spots.length, g.kind === "gran" ? 1 : T);
    for (let t = 0; t < nT; t++) {
      const mine = spots.filter((_, i) => i % nT === t);
      if (!mine.length) continue;
      const tn = node.add(new SceneNode(`env_trees_${g.kind}_${String.fromCharCode(97 + t)}`, { kind: "tree", instanced: true }));
      g.make(tn, 300 + t * 41 + g.kind.length);
      tn.instances = mine.map(([x, z, h]) => {
        const s = h / g.nominal;
        return { translation: [x, terrainHeight(x, z), z], rotation: quatY(r() * Math.PI * 2), scale: [s, s, s] };
      });
    }
  }
}

/** Ground shadows of the trees for the lawn bake (plus out-of-frame trees, photo left). */
export function treeShadowBlobs() {
  const out = [];
  const push = (x, z, h, rr, k = 0.75) => {
    const hc = h * 0.65;
    out.push({ x: x + (-SUN.x / SUN.y) * hc, z: z + (-SUN.z / SUN.y) * hc, rx: rr * 1.15, rz: rr * 1.4, k });
  };
  for (const [x, z, h] of [...TREES.birch, ...TREES.broad, ...TREES.spruce]) push(x, z, h, h * 0.28, 0.6);
  // trees south-west of the photo camera (out of frame) shade the lawn's left half
  out.push({ x: 4.0, z: 22.5, rx: 7.0, rz: 3.6, k: 0.6 });
  out.push({ x: -2.0, z: 18.5, rx: 5.0, rz: 2.8, k: 0.5 });
  return out;
}

/* --------------------------------------------------------------------------------------------- */
/* Outbuilding (pool house) with canopy, slat screen and lounge chairs                            */
/* --------------------------------------------------------------------------------------------- */

/**
 * Pool house, placed by overlay on image 1 (left edge at x ≈ 92, canopy end at x ≈ 488):
 * front-left corner, yaw (front faces the camera side), box and canopy sizes.
 */
export const OUTBUILDING = { x: -23.8, z: 8.4, yaw: 21, boxW: 4.5, boxD: 3.6, boxH: 5.2, canopyL: 7.6, canopyD: 3.4, canopyH: 3.5 };

export function buildOutbuilding(node) {
  const O = OUTBUILDING;
  const dark = node.mb("outbuilding", "env_outbuilding_bygg");
  const steel = node.mb("steel_black", "env_outbuilding_stal");
  const cush = node.mb("cushion", "env_outbuilding_puter");
  const glass = node.mb("glass", "env_outbuilding_glass");
  const deck = node.mb("deck", "env_outbuilding_plattform");
  const y0 = terrainHeight(O.x, O.z) - 0.08;
  const a = (O.yaw * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  // local: lx along the front (towards the canopy), lz towards the front (+), back is −lz
  const P = (lx, ly, lz) => V(O.x + lx * c + lz * s, y0 + ly, O.z - lx * s + lz * c);
  const box = (mb, x0, y0b, z0, x1, y1, z1, color) =>
    mb.hexa([P(x0, y0b, z0), P(x1, y0b, z0), P(x1, y0b, z1), P(x0, y0b, z1), P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1)], color);
  // enclosed box with a glazed band near the top
  box(dark, 0, 0, -O.boxD, O.boxW, O.boxH, 0);
  box(glass, 0.3, O.boxH - 1.3, 0, O.boxW - 0.3, O.boxH - 0.5, 0.02);
  box(dark, -0.02, O.boxH - 0.12, -O.boxD - 0.02, O.boxW + 0.02, O.boxH, 0.02);
  // canopy: flat roof on posts, 0.25 fascia
  const x0 = O.boxW;
  const x1 = O.boxW + O.canopyL;
  box(steel, x0, O.canopyH - 0.25, -O.canopyD, x1, O.canopyH, 0.25);
  for (const x of [x0 + 2.6, x0 + 5.1, x1 - 0.12]) box(steel, x - 0.06, 0, 0.05, x + 0.06, O.canopyH - 0.25, 0.17);
  // horizontal slat screen along the back (45 mm slats, 60 mm gaps)
  for (let y = 0.35; y < O.canopyH - 0.3; y += 0.105) box(dark, x0, y, -O.canopyD, x1, y + 0.045, -O.canopyD + 0.04);
  // raised platform
  box(deck, x0, 0, -O.canopyD, x1, 0.3, 0.3, col("#6a5d52"));
  // two lounge chairs, a low table, a black planter
  for (const x of [x0 + 1.2, x0 + 2.4]) {
    box(steel, x - 0.36, 0.3, -1.4, x + 0.36, 0.48, -0.5);
    box(cush, x - 0.34, 0.48, -1.38, x + 0.34, 0.64, -0.52);
    box(cush, x - 0.34, 0.48, -1.5, x + 0.34, 1.0, -1.3);
  }
  box(steel, x0 + 3.6, 0.3, -1.2, x0 + 4.4, 0.65, -0.6);
  box(steel, x0 + 5.6, 0.3, -1.4, x0 + 6.2, 0.95, -0.8);
}

/* --------------------------------------------------------------------------------------------- */
/* Backdrop                                                                                       */
/* --------------------------------------------------------------------------------------------- */

const HAZE = col("#dce6ee");
/** Aerial perspective: mix towards the haze colour by distance (metres). */
const aerial = (c, dist) => c.clone().lerp(HAZE, 1 - Math.exp(-dist / 5200));

/**
 * Backdrop silhouettes around the site. `skyline` (optional) lifts the
 * hillside to a traced photo silhouette: [{az, elev}] in radians seen from
 * the photo camera.
 */
export function buildBackdrop(node, { camera } = {}) {
  const mb = node.mb("backdrop", "env_backdrop_lag");
  const segs = Q().backdropSegments;
  const C = V(...camera.position);
  const quad = (p0, p1, h0, h1, cTop, cBot) => {
    const y0 = -3;
    const q = [V(p0.x, y0, p0.z), V(p1.x, y0, p1.z), V(p1.x, h1, p1.z), V(p0.x, h0, p0.z)];
    const out = V((p0.x + p1.x) / 2, 0, (p0.z + p1.z) / 2).sub(C).multiplyScalar(2).add(C); // beyond the band
    const base = mb.vertexCount;
    mb.face(q, out, null);
    // vertex colours: bottom → top
    const cs = [cBot, cBot, cTop, cTop];
    for (let i = 0; i < 4; i++) {
      mb.colors[(base + i) * 3] = cs[i].r;
      mb.colors[(base + i) * 3 + 1] = cs[i].g;
      mb.colors[(base + i) * 3 + 2] = cs[i].b;
    }
    mb.useColor = true;
  };
  // (1) the tree belt at 170–320 m: a low solid band plus crown cards facing the photo camera
  const R = 240;
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2;
    const a1 = ((i + 1) / segs) * Math.PI * 2;
    const p0 = V(C.x + Math.cos(a0) * R, 0, C.z + Math.sin(a0) * R);
    const p1 = V(C.x + Math.cos(a1) * R, 0, C.z + Math.sin(a1) * R);
    const h = (a) => 7 + 3 * (0.5 + 0.5 * nz.fbm(a * 14 + 3, 3, 4));
    quad(p0, p1, h(a0), h(a1), aerial(col("#3c5426"), 700), aerial(col("#26371a"), 700));
  }
  const belt = node.mb("leaf", "env_backdrop_trebelte");
  const rb = rng(77);
  const nCards = Q().name === "lite" ? 150 : 380;
  for (let i = 0; i < nCards; i++) {
    const a = rb() * Math.PI * 2;
    const rad = 215 + rb() * 120;
    const p = V(C.x + Math.cos(a) * rad, -3, C.z + Math.sin(a) * rad);
    const ht = 10 + rb() * 9;
    const w = ht * (1.0 + rb() * 0.6);
    const toC = V(C.x - p.x, 0, C.z - p.z).normalize();
    const tint = aerial(col(rb() < 0.5 ? "#a9b88c" : "#94a67a").multiplyScalar(0.75 + 0.4 * rb()), rad * 2.2);
    card(belt, p, w, ht + 3, toC, V(0, 1, 0), rb() < 0.18 ? TILE.conifer : TILE.box, tint, V(toC.x * 0.6, 0.8, toC.z * 0.6).normalize(), { anchorBottom: true, flipU: rb() < 0.5 });
  }
  // (2) the forested hillside, traced from image 1's skyline (photo pixels → rays of the photo camera)
  const yaw = (camera.rotation.y * Math.PI) / 180;
  const F = V(-Math.sin(yaw), 0, -Math.cos(yaw));
  const Rr = V(Math.cos(yaw), 0, -Math.sin(yaw));
  const f = camera.focalPx;
  const [cx, cy] = camera.principalPoint;
  const D = 1900;
  const pts = SKYLINE.points.filter(([u]) => u >= 76 && u <= 604);
  // extend beyond the left photo edge (rising gently) and behind the house (falling to the tree band)
  const first = pts[0];
  const last = pts[pts.length - 1];
  const ext = [];
  for (let u = -700; u < first[0]; u += 24) ext.push([u, first[1] - (first[0] - u) * 0.06]);
  const tail = [];
  for (let u = last[0] + 24; u <= 1500; u += 24) tail.push([u, last[1] + Math.min(28, (u - last[0]) * 0.05)]);
  const all = [...ext, ...pts, ...tail];
  const world = all.map(([u, v]) => {
    const dir = F.clone().addScaledVector(Rr, (u - cx) / f);
    const len = dir.length();
    dir.normalize();
    const tanE = (cy - v) / f / len;
    return { p: V(C.x + dir.x * D, 0, C.z + dir.z * D), h: C.y + D * tanE };
  });
  for (let i = 0; i < world.length - 1; i++) {
    const g = 0.85 + 0.3 * (0.5 + 0.5 * nz.fbm(i * 0.37, 7, 3));
    quad(world[i].p, world[i + 1].p, world[i].h, world[i + 1].h, aerial(col("#4a6a33").multiplyScalar(g), 1100), aerial(col("#3a5428").multiplyScalar(g), 1100));
  }
  // (3) a faint far ridge all round
  const R3 = 4200;
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2;
    const a1 = ((i + 1) / segs) * Math.PI * 2;
    const p0 = V(C.x + Math.cos(a0) * R3, 0, C.z + Math.sin(a0) * R3);
    const p1 = V(C.x + Math.cos(a1) * R3, 0, C.z + Math.sin(a1) * R3);
    const h = (a) => 35 + 45 * (0.5 + 0.5 * nz2.fbm(a * 4 + 2, 3, 3));
    quad(p0, p1, h(a0), h(a1), aerial(col("#6f8276"), 9000), aerial(col("#6a7c70"), 9000));
  }
}

/** The sky is a shader dome built at runtime (meta.lighting.*.sky); this node marks it in the tree. */
export function skyNode() {
  return new SceneNode("env_sky", { kind: "sky", note: "Runtime shader dome. Gradient + fbm cumulus, see house.meta.json lighting.day.sky. No geometry in the GLB." });
}

void DECK;
void LV;
