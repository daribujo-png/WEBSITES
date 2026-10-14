/**
 * Floor structure (bjelkelag), interior partitions (frame + finished),
 * floors, ceilings, inner lining, stair, kitchen, bathroom and WC.
 */
import * as THREE from "three";
import { V, col, sharedRng } from "./builder.mjs";
import {
  BATH,
  BEND,
  HW,
  RAFTER_VD,
  STAIR,
  STAIRWELL,
  STUD_D,
  T,
  W,
  WC,
  WINGS,
  WP,
  Y,
  rafterTop,
  wingQuad,
} from "./house-spec.mjs";
import { wallPanels } from "./walls.mjs";

const r = sharedRng(5);
const IN = HW - STUD_D; // inner face of outer walls

/** Box in wing coordinates with optional mitre clamp of the u-start per corner. */
export function wbox(mb, wing, u0, u1, v0, v1, y0, y1, color, { mitre = false, yTop, yBot } = {}) {
  const us = (v) => (mitre ? Math.max(u0, T * v) : u0);
  const top = (u, v) => (yTop ? yTop(u, v) : y1);
  const bot = (u, v) => (yBot ? yBot(u, v) : y0);
  const c = [
    W(wing, us(v0), v0, bot(us(v0), v0)),
    W(wing, u1, v0, bot(u1, v0)),
    W(wing, u1, v1, bot(u1, v1)),
    W(wing, us(v1), v1, bot(us(v1), v1)),
    W(wing, us(v0), v0, top(us(v0), v0)),
    W(wing, u1, v0, top(u1, v0)),
    W(wing, u1, v1, top(u1, v1)),
    W(wing, us(v1), v1, top(us(v1), v1)),
  ];
  mb.hexa(c, color);
}

const studTone = () => {
  const c = col("#d6be92");
  c.multiplyScalar(0.93 + r() * 0.14);
  return c;
};

/* ---------------------------------------------------------------------------------------------- */
/* Floor structure                                                                                */
/* ---------------------------------------------------------------------------------------------- */

export function buildJoists(layer) {
  const mb = layer.mb("frame_wood", "bindingsverk_bjelkelag");
  const vMax = HW - 0.048;
  for (const wid of ["A", "B"]) {
    const wing = WINGS[wid];
    const us = [];
    for (let u = 0.12; u < wing.L - 0.05; u += 0.6) us.push(u);
    us.push(wing.L - 0.072);
    if (wid === "B") us.push(STAIRWELL.u0 - 0.03, STAIRWELL.u1 + 0.03);
    for (const u of us) {
      const u0 = u - 0.024;
      const u1 = u + 0.024;
      // v-range inside mitre: u0 ≥ T·v
      let lo = -vMax;
      let hi = Math.min(vMax, u0 / T);
      if (u0 < 0) lo = Math.max(lo, u0 / T);
      if (hi - lo < 0.1) continue;
      if (wid === "B" && u > STAIRWELL.u0 + 0.01 && u < STAIRWELL.u1 - 0.01) lo = Math.max(lo, STAIRWELL.v1);
      wbox(mb, wing, u0, u1, lo, hi, Y.top1, Y.joistTop, studTone());
    }
    if (wid === "B") {
      // stairwell header
      wbox(mb, wing, STAIRWELL.u0 - 0.06, STAIRWELL.u1 + 0.06, STAIRWELL.v1, STAIRWELL.v1 + 0.096, Y.top1, Y.joistTop, studTone());
    }
  }
  // glulam beam along the mitre
  const g = layer.mb("glulam", "bindingsverk_bjelkelag_limtre");
  const A = WINGS.A;
  const m = new THREE.Vector3(Math.cos(BEND / 2), 0, Math.sin(BEND / 2));
  const pa = WP(A, -T * vMax, -vMax);
  const pb = WP(A, T * vMax, vMax);
  const off = (p, k, y) => V(p.x + m.x * k, y, p.z + m.z * k);
  g.hexa(
    [
      off(pa, -0.06, Y.top1 - 0.2),
      off(pb, -0.06, Y.top1 - 0.2),
      off(pb, 0.06, Y.top1 - 0.2),
      off(pa, 0.06, Y.top1 - 0.2),
      off(pa, -0.06, Y.joistTop),
      off(pb, -0.06, Y.joistTop),
      off(pb, 0.06, Y.joistTop),
      off(pa, 0.06, Y.joistTop),
    ],
    null,
  );
  // subfloor on the joists (2. etasje), with stairwell
  const sub = layer.mb("roof_deck", "bindingsverk_undergulv");
  for (const wid of ["A", "B"]) {
    const wing = WINGS[wid];
    const quad = wingQuad(wing, 0);
    const holes = wid === "B" ? [stairwellPoly(wing)] : [];
    sub.slab(quad, holes, Y.joistTop, Y.sill2, null);
  }
}

function stairwellPoly(wing) {
  const { u0, u1, v0, v1 } = STAIRWELL;
  return [WP(wing, u0, v0), WP(wing, u1, v0), WP(wing, u1, v1), WP(wing, u0, v1)];
}

/* ---------------------------------------------------------------------------------------------- */
/* Partitions                                                                                     */
/* ---------------------------------------------------------------------------------------------- */

/**
 * Partition walls (wing-local). axis "u": wall runs along u at fixed v;
 * axis "v": wall runs along v at fixed u. Doors are gaps [a0, a1].
 */
export const PARTITIONS = [
  // 1. etasje
  { wing: "A", floor: 1, axis: "v", at: WC.u0, from: -IN, to: WC.v1, doors: [[-3.45, -2.62]] },
  { wing: "A", floor: 1, axis: "u", at: WC.v1, from: WC.u0, to: WINGS.A.L - STUD_D, doors: [] },
  { wing: "B", floor: 1, axis: "v", at: STAIR.u1 + 0.1, from: -IN, to: -1.1, doors: [] },
  // 2. etasje
  { wing: "A", floor: 2, axis: "u", at: 0, from: 1.3, to: WINGS.A.L - STUD_D, doors: [] },
  { wing: "A", floor: 2, axis: "v", at: 1.3, from: -IN, to: IN, doors: [[-1.25, -0.4], [0.4, 1.25]] },
  { wing: "B", floor: 2, axis: "v", at: BATH.u0, from: -IN, to: BATH.v1, doors: [[-2.6, -1.8]] },
  { wing: "B", floor: 2, axis: "u", at: BATH.v1, from: 1.45, to: WINGS.B.L - STUD_D, doors: [] },
  { wing: "B", floor: 2, axis: "v", at: 1.45, from: BATH.v1, to: IN, doors: [[-1.4, -0.6]] },
];

const ceilingAt = (floor, v) =>
  floor === 1 ? Y.top1 - 0.02 : Math.min(Y.collar, rafterTop(Math.abs(v)) - RAFTER_VD - 0.012);
const floorAt = (floor) => (floor === 1 ? Y.ff1 : Y.ff2);

/** Iterate partition pieces (solid spans between doors, plus headers over doors). */
function partitionPieces(p) {
  const pieces = [];
  let cur = p.from;
  const sorted = [...p.doors].sort((a, b) => a[0] - b[0]);
  for (const [d0, d1] of sorted) {
    if (d0 > cur) pieces.push({ a0: cur, a1: d0, y0: null });
    pieces.push({ a0: d0, a1: d1, y0: floorAt(p.floor) + 2.1 });
    cur = d1;
  }
  if (p.to > cur) pieces.push({ a0: cur, a1: p.to, y0: null });
  return pieces;
}

/** Split [a0,a1] at the collar break points so sloped tops stay planar. */
function splitForCeiling(p, a0, a1) {
  if (p.floor === 1 || p.axis === "u") return [[a0, a1]];
  const vc = HW - (Y.collar + 0.012 + RAFTER_VD - (Y.eave + RAFTER_VD)) / Math.tan((40 * Math.PI) / 180);
  const cuts = [-vc, 0, vc].filter((c) => c > a0 + 1e-3 && c < a1 - 1e-3);
  const out = [];
  let s = a0;
  for (const c of cuts) {
    out.push([s, c]);
    s = c;
  }
  out.push([s, a1]);
  return out;
}

/** Box along a partition; yBot/yTop are functions of v (sloped ceilings). */
function pbox(mb, p, a0, a1, d0, d1, yBot, yTop, color) {
  const wing = WINGS[p.wing];
  const opts = { yTop: (u, v) => yTop(v), yBot: (u, v) => yBot(v) };
  for (const [s0, s1] of splitForCeiling(p, a0, a1)) {
    if (p.axis === "u") wbox(mb, wing, s0, s1, p.at + d0, p.at + d1, 0, 0, color, opts);
    else wbox(mb, wing, p.at + d0, p.at + d1, s0, s1, 0, 0, color, opts);
  }
}

function partitionBox(mb, p, a0, a1, d0, d1, y0, color) {
  pbox(mb, p, a0, a1, d0, d1, () => y0, (v) => ceilingAt(p.floor, v), color);
}

export function buildPartitionFrames(layer) {
  const mb = layer.mb("frame_wood", "bindingsverk_innervegger");
  for (const p of PARTITIONS) {
    const y0 = p.floor === 1 ? Y.slab : Y.sill2;
    for (const pc of partitionPieces(p)) {
      if (pc.y0 !== null) {
        partitionHeader(mb, p, pc.a0, pc.a1, floorAt(p.floor) + 2.1);
        continue;
      }
      pbox(mb, p, pc.a0, pc.a1, -0.035, 0.035, () => y0, () => y0 + 0.048, studTone());
      pbox(mb, p, pc.a0, pc.a1, -0.035, 0.035, (v) => ceilingAt(p.floor, v) - 0.078, (v) => ceilingAt(p.floor, v) - 0.03, studTone());
      for (let a = pc.a0 + 0.024; a < pc.a1 - 0.05; a += 0.6) partitionStud(mb, p, a, y0);
      partitionStud(mb, p, pc.a1 - 0.024, y0);
    }
  }
}

function partitionStud(mb, p, a, y0) {
  const wing = WINGS[p.wing];
  if (p.axis === "u") {
    wbox(mb, wing, a - 0.024, a + 0.024, p.at - 0.035, p.at + 0.035, y0 + 0.048, 0, studTone(), {
      yTop: (u, v) => ceilingAt(p.floor, v) - 0.03,
    });
  } else {
    wbox(mb, wing, p.at - 0.035, p.at + 0.035, a - 0.024, a + 0.024, y0 + 0.048, 0, studTone(), {
      yTop: (u, v) => ceilingAt(p.floor, v) - 0.03,
    });
  }
}

function partitionHeader(mb, p, a0, a1, y) {
  const wing = WINGS[p.wing];
  if (p.axis === "u") wbox(mb, wing, a0, a1, p.at - 0.035, p.at + 0.035, y, y + 0.1, studTone());
  else wbox(mb, wing, p.at - 0.035, p.at + 0.035, a0, a1, y, y + 0.1, studTone());
}

/* ---------------------------------------------------------------------------------------------- */
/* Finished interior                                                                              */
/* ---------------------------------------------------------------------------------------------- */

export function buildInterior(layer) {
  const wallMat = layer.mb("interior_wall", "interior_vegger");
  const oak = layer.mb("floor_oak", "interior_gulv");
  const ceil = layer.mb("interior_wall", "interior_himling");

  // floors
  for (const wid of ["A", "B"]) {
    const wing = WINGS[wid];
    const quad = wingQuad(wing, -STUD_D);
    oak.slab(quad, [], Y.slab, Y.ff1, null);
    const holes = wid === "B" ? [stairwellPoly(wing)] : [];
    oak.slab(quad, holes, Y.sill2, Y.ff2, null);
    // ceiling 1. etasje
    ceil.slab(quad, holes, Y.top1 - 0.02, Y.top1, null);
  }
  // inner lining on outer walls (both floors)
  wallPanels(wallMat, -STUD_D - 0.014, -STUD_D, "lining", null, { splitAt: [-1.64, 1.64] });
  // sloped ceilings and flat collar ceiling, 2. etasje
  const vc = 1.64;
  for (const wid of ["A", "B"]) {
    const wing = WINGS[wid];
    const uEnd = wing.L - STUD_D;
    const under = (v) => rafterTop(Math.abs(v)) - RAFTER_VD;
    for (const s of [1, -1]) {
      const v0 = s * vc;
      const v1 = s * IN;
      const corners = [
        [T * v0, v0],
        [uEnd, v0],
        [uEnd, v1],
        [T * v1, v1],
      ];
      const bot = corners.map(([u, v]) => W(wing, u, v, under(v) - 0.014));
      const top = corners.map(([u, v]) => W(wing, u, v, under(v)));
      ceil.hexa([...bot, ...top], null);
    }
    const flat = [
      [T * -vc, -vc],
      [uEnd, -vc],
      [uEnd, vc],
      [T * vc, vc],
    ];
    ceil.hexa(
      [...flat.map(([u, v]) => W(wing, u, v, Y.collar - 0.014)), ...flat.map(([u, v]) => W(wing, u, v, Y.collar))],
      null,
    );
  }
  // partitions (finished, 100 mm with lining)
  for (const p of PARTITIONS) {
    const y0 = floorAt(p.floor);
    for (const pc of partitionPieces(p)) {
      partitionBox(wallMat, p, pc.a0, pc.a1, -0.05, 0.05, pc.y0 ?? y0, null);
    }
  }
  const stair = buildStair(layer);
  const kitchen = buildKitchen(layer);
  const bath = buildBath(layer);
  buildWC(layer);
  return { stair, kitchen, bath };
}

function buildStair(layer) {
  const mb = layer.mb("floor_oak", "interior_trapp");
  const steel = layer.mb("window_frame", "interior_trapp_vange");
  const wing = WINGS[STAIR.wing];
  const n = STAIR.steps;
  const rise = (Y.ff2 - Y.ff1) / n;
  const run = (STAIR.vStart - STAIR.vEnd) / n;
  for (let i = 0; i < n - 1; i++) {
    const vHi = STAIR.vStart - i * run;
    const y = Y.ff1 + (i + 1) * rise;
    wbox(mb, wing, STAIR.u0 + 0.06, STAIR.u1 - 0.06, vHi - run - 0.03, vHi, y - 0.045, y, null);
  }
  // stringers (flat steel, dark)
  for (const u of [STAIR.u0 + 0.03, STAIR.u1 - 0.03]) {
    const c = [
      W(wing, u - 0.012, STAIR.vStart, Y.ff1),
      W(wing, u + 0.012, STAIR.vStart, Y.ff1),
      W(wing, u + 0.012, STAIR.vEnd, Y.ff2 - 0.25),
      W(wing, u - 0.012, STAIR.vEnd, Y.ff2 - 0.25),
      W(wing, u - 0.012, STAIR.vStart, Y.ff1 + 0.28),
      W(wing, u + 0.012, STAIR.vStart, Y.ff1 + 0.28),
      W(wing, u + 0.012, STAIR.vEnd, Y.ff2 + 0.02),
      W(wing, u - 0.012, STAIR.vEnd, Y.ff2 + 0.02),
    ];
    steel.hexa(c, null);
  }
  // handrail on the open side
  steel.tube(
    [W(wing, STAIR.u0 + 0.03, STAIR.vStart, Y.ff1 + 0.9), W(wing, STAIR.u0 + 0.03, STAIR.vEnd, Y.ff2 + 0.9)],
    0.02,
    6,
    null,
  );
  // balustrade at the stairwell on the 2. etasje (glass)
  const glass = layer.mb("glass", "interior_rekkverk_glass");
  wbox(glass, wing, STAIRWELL.u1 + 0.02, STAIRWELL.u1 + 0.034, STAIRWELL.v0 + 0.05, STAIRWELL.v1, Y.ff2, Y.ff2 + 0.95, null);
  wbox(glass, wing, STAIRWELL.u0, STAIRWELL.u1, STAIRWELL.v1 - 0.03, STAIRWELL.v1 - 0.016, Y.ff2, Y.ff2 + 0.95, null);
  return W(wing, (STAIR.u0 + STAIR.u1) / 2, (STAIR.vStart + STAIR.vEnd) / 2, (Y.ff1 + Y.ff2) / 2 + 0.3);
}

function buildKitchen(layer) {
  const front = layer.mb("kitchen_front", "interior_kjokken");
  const top = layer.mb("worktop", "interior_kjokken_benk");
  const wing = WINGS.A;
  const uIn = wing.L - STUD_D;
  // counter along the gable
  wbox(front, wing, uIn - 0.62, uIn, -1.5, 2.7, Y.ff1 + 0.1, Y.ff1 + 0.88, null);
  wbox(front, wing, uIn - 0.58, uIn, -1.5, 2.7, Y.ff1, Y.ff1 + 0.1, col("#1f1c1a"));
  wbox(top, wing, uIn - 0.64, uIn, -1.52, 2.72, Y.ff1 + 0.88, Y.ff1 + 0.91, null);
  // tall cabinets at the north end
  wbox(front, wing, uIn - 0.62, uIn, -2.4, -1.52, Y.ff1, Y.ff1 + 2.3, null);
  // island
  wbox(front, wing, 2.0, 3.35, 0.35, 1.2, Y.ff1 + 0.1, Y.ff1 + 0.88, null);
  wbox(top, wing, 1.95, 3.4, 0.3, 1.45, Y.ff1 + 0.88, Y.ff1 + 0.92, null);
  // sink and tap
  const steel = layer.mb("steel", "interior_kjokken_stal");
  wbox(steel, wing, uIn - 0.5, uIn - 0.12, 0.6, 1.3, Y.ff1 + 0.905, Y.ff1 + 0.915, null);
  steel.tube([W(wing, uIn - 0.08, 0.95, Y.ff1 + 0.91), W(wing, uIn - 0.08, 0.95, Y.ff1 + 1.2), W(wing, uIn - 0.25, 0.95, Y.ff1 + 1.22)], 0.012, 6, null);
  return W(wing, 2.7, 0.8, Y.ff1 + 1.0);
}

function buildBath(layer) {
  const wing = WINGS[BATH.wing];
  const { u0, u1, v0, v1 } = BATH;
  const membrane = layer.mb("bath_membrane", "interior_bad_membran");
  const tileF = layer.mb("tile_floor", "interior_bad_flis_gulv");
  const tileW = layer.mb("tile_wall", "interior_bad_flis_vegg");
  const san = layer.mb("sanitary", "interior_bad_sanitar");
  const steel = layer.mb("steel", "interior_bad_stal");
  const glass = layer.mb("glass", "interior_bad_glassvegg");
  const oak = layer.mb("furniture_wood", "interior_bad_innredning");
  const f = Y.ff2;
  // membrane (lapped up the walls 0.15 m) under the floor tiles
  wbox(membrane, wing, u0 + 0.05, u1, v0, v1 - 0.05, f - 0.012, f + 0.002, null);
  // floor tiles (raise slightly above the oak floor)
  wbox(tileF, wing, u0 + 0.05, u1, v0, v1 - 0.05, f + 0.002, f + 0.014, null);
  // wall tiles: on the four walls, 2.2 m high
  const tH = Math.min(f + 2.2, Y.eave);
  const t = 0.012;
  wbox(tileW, wing, u1 - t, u1, v0, v1 - 0.05, f + 0.014, tH, null); // gable
  wbox(tileW, wing, u0 + 0.05, u1, v0, v0 + t, f + 0.014, tH, null, {}); // north (outer) wall
  wbox(tileW, wing, u0 + 0.05, u0 + 0.05 + t, v0, -2.62, f + 0.014, tH, null);
  wbox(tileW, wing, u0 + 0.05, u1, v1 - 0.05 - t, v1 - 0.05, f + 0.014, tH, null);
  // shower corner (north-east): drain, glass wall, shower head
  const su0 = u1 - 1.0;
  const sv1 = v0 + 1.0;
  steel.hexa(
    [
      W(wing, su0 + 0.42, v0 + 0.42, f + 0.0145),
      W(wing, su0 + 0.58, v0 + 0.42, f + 0.0145),
      W(wing, su0 + 0.58, v0 + 0.58, f + 0.0145),
      W(wing, su0 + 0.42, v0 + 0.58, f + 0.0145),
      W(wing, su0 + 0.42, v0 + 0.42, f + 0.018),
      W(wing, su0 + 0.58, v0 + 0.42, f + 0.018),
      W(wing, su0 + 0.58, v0 + 0.58, f + 0.018),
      W(wing, su0 + 0.42, v0 + 0.58, f + 0.018),
    ],
    null,
  );
  wbox(glass, wing, su0 - 0.01, su0 + 0.0, v0 + 0.02, sv1, f + 0.02, f + 2.0, null);
  steel.tube([W(wing, u1 - 0.03, v0 + 0.5, f + 1.0), W(wing, u1 - 0.03, v0 + 0.5, f + 2.05), W(wing, u1 - 0.25, v0 + 0.5, f + 2.05)], 0.012, 6, null);
  // vanity (oak) with basin on the south wall
  wbox(oak, wing, u0 + 0.35, u0 + 1.15, v1 - 0.55, v1 - 0.07, f + 0.45, f + 0.85, null);
  wbox(san, wing, u0 + 0.45, u0 + 1.05, v1 - 0.5, v1 - 0.12, f + 0.85, f + 0.92, null);
  // mirror
  wbox(glass, wing, u0 + 0.4, u0 + 1.1, v1 - 0.075, v1 - 0.065, f + 1.1, f + 1.9, null);
  // wall-hung toilet against the partition
  wbox(san, wing, u0 + 0.07, u0 + 0.6, -3.1, -2.72, f + 0.38, f + 0.44, null);
  wbox(san, wing, u0 + 0.07, u0 + 0.16, -3.12, -2.7, f + 0.44, f + 1.0, null);
  return W(wing, (u0 + u1) / 2, (v0 + v1) / 2, f + 1.0);
}

function buildWC(layer) {
  const wing = WINGS[WC.wing];
  const { u0, u1, v0, v1 } = WC;
  const tileF = layer.mb("tile_floor", "interior_wc_flis");
  const san = layer.mb("sanitary", "interior_wc_sanitar");
  wbox(tileF, wing, u0 + 0.05, u1, v0, v1 - 0.05, Y.ff1, Y.ff1 + 0.012, null);
  wbox(san, wing, u1 - 0.55, u1 - 0.02, v0 + 0.6, v0 + 0.98, Y.ff1 + 0.38, Y.ff1 + 0.44, null);
  wbox(san, wing, u1 - 0.12, u1 - 0.02, v0 + 0.58, v0 + 1.0, Y.ff1 + 0.44, Y.ff1 + 1.0, null);
  wbox(san, wing, u0 + 0.3, u0 + 0.8, v0 + 0.02, v0 + 0.4, Y.ff1 + 0.8, Y.ff1 + 0.9, null);
}
