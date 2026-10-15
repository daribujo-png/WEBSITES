/**
 * Wall faces of Adria and the generic "face" geometry: cladding boards, wall
 * panels (windbreak, lining), reveals and window frames, all cut by the same
 * hole list so every layer lines up.
 *
 * A face is a plane with an outward normal and a local frame:
 *   a — along the face (x on S/N-type faces, z on E/W-type faces)
 *   y — absolute height
 *   d — depth inwards from the cladding face (d = 0 is the board front)
 * `pt(a, y, d)` maps it to world space.
 *
 * Holes are vertical-sided polygons { a0, a1, b(a), t(a) } with linear bottom
 * and top lines (piecewise linear when the caller splits at `kinks`).
 */
import * as THREE from "three";
import { V } from "../builder.mjs";
import { Q } from "../quality.mjs";
import {
  BOARD,
  HEADS,
  HX,
  HZ,
  LV,
  R1,
  R2,
  ROOF,
  WALL,
  openings,
  r1OpeningTop,
  r1Soffit,
  r2Soffit,
  wallTop,
} from "./spec.mjs";

/** Storage closet at the north end of the R1 ground terrace (behind door N4). */
export const STORE = { x0: R1.x0, x1: R1.xCol, z0: R1.zN, z1: -2.9, y1: LV.bandBottom };

export const FRAMES = {
  S: { n: V(0, 0, 1), pt: (a, y, d) => V(a, y, HZ - d) },
  N: { n: V(0, 0, -1), pt: (a, y, d) => V(a, y, -HZ + d) },
  E: { n: V(1, 0, 0), pt: (a, y, d) => V(HX - d, y, a) },
  W: { n: V(-1, 0, 0), pt: (a, y, d) => V(-HX + d, y, a) },
  R1back: { n: V(1, 0, 0), pt: (a, y, d) => V(R1.x0 - d, y, a) },
  R1north: { n: V(0, 0, 1), pt: (a, y, d) => V(a, y, R1.zN - d) },
  R1colW: { n: V(-1, 0, 0), pt: (a, y, d) => V(R1.xCol + d, y, a) },
  R1colN: { n: V(0, 0, -1), pt: (a, y, d) => V(a, y, R1.zS + d) },
  R1storeS: { n: V(0, 0, 1), pt: (a, y, d) => V(a, y, STORE.z1 - d) },
  R1storeE: { n: V(1, 0, 0), pt: (a, y, d) => V(STORE.x1 - d, y, a) },
  R2back: { n: V(0, 0, 1), pt: (a, y, d) => V(a, y, R2.z0 - d) },
  R2side: { n: V(-1, 0, 0), pt: (a, y, d) => V(R2.x1 + d, y, a) },
  R2colE: { n: V(1, 0, 0), pt: (a, y, d) => V(R2.xCol - d, y, a) },
  R2colN: { n: V(0, 0, -1), pt: (a, y, d) => V(a, y, R2.zCol + d) },
};

const K = (y) => () => y;
const rect = (a0, a1, y0, y1) => ({ a0, a1, b: K(y0), t: K(y1) });

/**
 * Face definitions for one roof form. `top(a)` is the visible cladding top,
 * `share` the height up to which the face is identical in every roof form,
 * `holes` the loggia openings (no glass), `heated` marks walls with a frame,
 * insulation and lining behind them, `kinks` are a-positions where a top line
 * bends (the saltak apex).
 */
export function faceDefs(roof) {
  const B = LV.claddingBottom;
  const H = HEADS[roof];
  const bandB = LV.bandBottom;
  const bandT = LV.bandTop;
  const defs = [];
  // ---- garden face: R2 opening (west), heated wall, R1 opening (east) ----
  defs.push({
    id: "S",
    wood: true,
    a0: -HX,
    a1: HX,
    bottom: B,
    top: (a) => wallTop("S", roof, a),
    share: 5.2,
    heated: [R2.x1, R1.x0],
    holes: [
      rect(R2.xCol, R2.x1, B - 0.01, bandB),
      rect(R2.xCol, R2.x1, bandT, H.r2),
      rect(R1.x0, R1.xCol, B - 0.01, bandB),
      rect(R1.x0, R1.xCol, bandT, H.r1),
      // charcoal infill panels (cladded separately, wind barrier stays)
      { ...rect(2.95, 3.95, B - 0.01, 2.12), panel: true },
      { ...rect(-1.02, 0.91, LV.ff1 - 0.02, H.u4), panel: true },
    ],
  });
  // ---- entrance face ----
  defs.push({ id: "N", wood: true, a0: -HX, a1: HX, bottom: B, top: (a) => wallTop("N", roof, a), share: 5.7, heated: [-HX, R1.x0], holes: [] });
  // ---- west gable: R2 west opening at the south end ----
  defs.push({
    id: "W",
    wood: true,
    a0: -HZ,
    a1: HZ,
    bottom: B,
    top: (a) => wallTop("W", roof, a),
    share: 5.5,
    heated: [-HZ, R2.z0],
    kinks: roof === "saltak" ? [0] : [],
    holes: [rect(R2.z0, R2.zCol, B - 0.01, bandB), rect(R2.z0, R2.zCol, bandT, H.r2)],
  });
  // ---- east gable = the R1 frame ----
  defs.push({
    id: "E",
    wood: true,
    a0: -HZ,
    a1: HZ,
    bottom: B,
    top: (a) => wallTop("E", roof, a),
    share: bandT,
    kinks: roof === "saltak" ? [0] : [],
    holes: [
      rect(R1.zN, R1.zS, B - 0.01, bandB),
      { a0: R1.zN, a1: R1.zS, b: K(bandT), t: (z) => r1OpeningTop(roof, z) },
    ],
  });
  // ---- R1 loggia (charcoal inside) ----
  defs.push({
    id: "R1back",
    wood: false,
    a0: R1.zN,
    a1: HZ,
    bottom: B,
    top: (z) => r1Soffit(roof, z),
    share: bandT,
    heated: [R1.zN, HZ],
    kinks: roof === "saltak" ? [0] : [],
    holes: [rect(R1.zN, STORE.z1, B - 0.01, STORE.y1)], // the closet stands in front of it
  });
  defs.push({ id: "R1north", wood: false, a0: R1.x0, a1: HX, bottom: STORE.y1, top: () => r1Soffit(roof, R1.zN), share: bandT, holes: [] });
  defs.push({ id: "R1storeS", wood: false, a0: R1.x0, a1: STORE.x1, bottom: B, top: K(STORE.y1), share: STORE.y1, holes: [] });
  defs.push({ id: "R1storeE", wood: false, a0: STORE.z0, a1: STORE.z1, bottom: B, top: K(STORE.y1), share: STORE.y1, holes: [] });
  defs.push({ id: "R1colW", wood: true, a0: R1.zS, a1: HZ, bottom: B, top: K(H.r1), share: bandT, holes: [] });
  defs.push({ id: "R1colN", wood: true, a0: R1.xCol, a1: HX, bottom: B, top: () => r1OpeningTop(roof, R1.zS), share: bandT, holes: [] });
  // ---- R2 loggia ----
  defs.push({ id: "R2back", wood: false, a0: -HX, a1: R2.x1, bottom: B, top: K(r2Soffit(roof)), share: 5.2, heated: [-HX, R2.x1], holes: [] });
  defs.push({ id: "R2side", wood: false, a0: R2.z0, a1: HZ, bottom: B, top: K(r2Soffit(roof)), share: 5.2, heated: [R2.z0, HZ], holes: [] });
  defs.push({ id: "R2colE", wood: true, a0: R2.zCol, a1: HZ, bottom: B, top: K(H.r2), share: 5.2, holes: [] });
  defs.push({ id: "R2colN", wood: true, a0: -HX, a1: R2.xCol, bottom: B, top: K(H.r2), share: 5.2, holes: [] });
  return defs;
}

/** Windows/doors of a face as holes (with their sloped tops). */
export function openingHoles(faceId, roof) {
  return openings(roof)
    .filter((o) => o.face === faceId)
    .map((o) => ({ a0: o.a0, a1: o.a1, b: K(o.y0), t: o.topAt ? o.topAt : K(o.y1), opening: o }));
}

/* --------------------------------------------------------------------------------------------- */
/* Interval maths on a column                                                                     */
/* --------------------------------------------------------------------------------------------- */

const EPS = 1e-6;

/**
 * Vertical intervals of a column [ca, cb] between `bottom` and `top(a)`,
 * clipped to [z0, z1] (absolute heights or functions) and minus `holes`.
 * Every interval is { lo: [y(ca), y(cb)], hi: [y(ca), y(cb)] }.
 */
function columnIntervals(ca, cb, bottom, top, holes, z0, z1) {
  const at = (f, a) => (typeof f === "function" ? f(a) : f);
  const lo = [Math.max(at(bottom, ca), at(z0, ca)), Math.max(at(bottom, cb), at(z0, cb))];
  const hi = [Math.min(at(top, ca), at(z1, ca)), Math.min(at(top, cb), at(z1, cb))];
  let pieces = [{ lo, hi }];
  for (const h of holes) {
    if (h.a0 > ca + EPS || h.a1 < cb - EPS) continue;
    const hb = [h.b(ca), h.b(cb)];
    const ht = [h.t(ca), h.t(cb)];
    const next = [];
    for (const p of pieces) {
      const low = { lo: p.lo, hi: [Math.min(p.hi[0], hb[0]), Math.min(p.hi[1], hb[1])] };
      const up = { lo: [Math.max(p.lo[0], ht[0]), Math.max(p.lo[1], ht[1])], hi: p.hi };
      if (ht[0] <= p.lo[0] + EPS && ht[1] <= p.lo[1] + EPS) {
        next.push(p); // hole entirely below
        continue;
      }
      if (hb[0] >= p.hi[0] - EPS && hb[1] >= p.hi[1] - EPS) {
        next.push(p); // hole entirely above
        continue;
      }
      next.push(low, up);
    }
    pieces = next;
  }
  return pieces.filter((p) => p.hi[0] - p.lo[0] > 0.004 || p.hi[1] - p.lo[1] > 0.004).map((p) => ({ lo: p.lo, hi: [Math.max(p.hi[0], p.lo[0]), Math.max(p.hi[1], p.lo[1])] }));
}

/** Column edges: board grid + hole edges + kinks, inside [a0, a1]. */
function columnEdges(a0, a1, holes, kinks = [], pitch = BOARD.pitch) {
  const xs = new Set([a0, a1]);
  for (let k = Math.ceil(a0 / pitch); k * pitch < a1; k++) xs.add(+(k * pitch).toFixed(6));
  for (const h of holes) {
    if (h.a0 > a0 && h.a0 < a1) xs.add(h.a0);
    if (h.a1 > a0 && h.a1 < a1) xs.add(h.a1);
  }
  for (const k of kinks) if (k > a0 && k < a1) xs.add(k);
  return [...xs].sort((p, q) => p - q).filter((x, i, arr) => i === 0 || x - arr[i - 1] > 1e-5);
}

/* --------------------------------------------------------------------------------------------- */
/* Board tones                                                                                    */
/* --------------------------------------------------------------------------------------------- */

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

/** Per-board tone multiplier (vertex colour), identical in every zone of the same board. */
export function boardTone(faceId, k, wood) {
  const v = hash(`${faceId}:${k}`);
  const w = hash(`${faceId}:${k}:h`);
  if (!wood) {
    const f = 1 + (v - 0.5) * 0.06;
    return new THREE.Color(f, f, f);
  }
  const val = 1 + (v - 0.5) * 0.14; // ±7 %
  const hue = (w - 0.5) * 2; // −1 … 1 → about ±3°
  return new THREE.Color(val * (1 + 0.035 * hue), val * (1 + 0.004 * hue), val * (1 - 0.05 * hue));
}

/* --------------------------------------------------------------------------------------------- */
/* Emitters                                                                                       */
/* --------------------------------------------------------------------------------------------- */

/** Quad on a face at depth d: corners (a0, y00)-(a1, y01)-(a1, y11)-(a0, y10), facing outwards. */
export function faceQuad(mb, F, a0, a1, lo, hi, d, color, { flip = false } = {}) {
  const P = [F.pt(a0, lo[0], d), F.pt(a1, lo[1], d), F.pt(a1, hi[1], d), F.pt(a0, hi[0], d)];
  const inside = F.pt((a0 + a1) / 2, (lo[0] + hi[1]) / 2, d + (flip ? -1 : 1));
  mb.face(P, inside, color);
}

/**
 * Cladding boards of one zone of a face. `z0`/`z1` clip the zone (numbers or
 * functions of a). Board sides (shadow gaps) on the high model.
 */
export function cladZone(mb, def, holes, z0, z1, { relief = Q().boardRelief, d = 0 } = {}) {
  const F = FRAMES[def.id];
  const edges = columnEdges(def.a0, def.a1, holes, def.kinks);
  const p = BOARD.pitch;
  const g = BOARD.gap / 2;
  for (let i = 0; i < edges.length - 1; i++) {
    const ca = edges[i];
    const cb = edges[i + 1];
    const k = Math.floor((ca + cb) / 2 / p);
    const bA = Math.max(ca, k * p + g);
    const bB = Math.min(cb, (k + 1) * p - g);
    if (bB - bA < 0.004) continue;
    const ivs = columnIntervals(bA, bB, def.bottom, def.top, holes, z0, z1);
    if (!ivs.length) continue;
    const tone = boardTone(def.id, k, def.wood);
    for (const iv of ivs) {
      faceQuad(mb, F, bA, bB, iv.lo, iv.hi, d, tone);
      if (!relief) continue;
      const sideTone = tone.clone().multiplyScalar(0.55);
      if (bA > ca + 1e-6) {
        const P = [F.pt(bA, iv.lo[0], d), F.pt(bA, iv.lo[0], d + WALL.relief), F.pt(bA, iv.hi[0], d + WALL.relief), F.pt(bA, iv.hi[0], d)];
        mb.face(P, F.pt(bA + 0.01, (iv.lo[0] + iv.hi[0]) / 2, d + 0.005), sideTone);
      }
      if (bB < cb - 1e-6) {
        const P = [F.pt(bB, iv.lo[1], d), F.pt(bB, iv.lo[1], d + WALL.relief), F.pt(bB, iv.hi[1], d + WALL.relief), F.pt(bB, iv.hi[1], d)];
        mb.face(P, F.pt(bB - 0.01, (iv.lo[1] + iv.hi[1]) / 2, d + 0.005), sideTone);
      }
    }
  }
}

/** Plain panel (windbreak, lining, battens backing) of a zone at depth d, minus holes. */
export function panelZone(mb, def, holes, z0, z1, d, color, { a0 = def.a0, a1 = def.a1, flip = false } = {}) {
  const F = FRAMES[def.id];
  // columns only at hole edges + kinks (no board grid)
  const xs = new Set([a0, a1]);
  for (const h of holes) {
    if (h.a0 > a0 && h.a0 < a1) xs.add(h.a0);
    if (h.a1 > a0 && h.a1 < a1) xs.add(h.a1);
  }
  for (const k of def.kinks || []) if (k > a0 && k < a1) xs.add(k);
  const edges = [...xs].sort((p, q) => p - q);
  for (let i = 0; i < edges.length - 1; i++) {
    const ca = edges[i];
    const cb = edges[i + 1];
    if (cb - ca < 1e-4) continue;
    for (const iv of columnIntervals(ca, cb, def.bottom, def.top, holes, z0, z1)) faceQuad(mb, F, ca, cb, iv.lo, iv.hi, d, color, { flip });
  }
}

/** Axis-aligned box in face space [a0,a1]×[y0,y1]×[d0,d1]; `skip` faces like MeshBuilder.hexa. */
export function faceBox(mb, F, a0, a1, y0, y1, d0, d1, color, skip = {}) {
  const c = [F.pt(a0, y0, d0), F.pt(a1, y0, d0), F.pt(a1, y0, d1), F.pt(a0, y0, d1), F.pt(a0, y1, d0), F.pt(a1, y1, d0), F.pt(a1, y1, d1), F.pt(a0, y1, d1)];
  mb.hexa(c, color, skip);
}

/** Box with sloped top/bottom: bottom line (yb0 at a0, yb1 at a1), top line (yt0, yt1). */
export function faceSlopedBox(mb, F, a0, a1, yb, yt, d0, d1, color) {
  const c = [F.pt(a0, yb[0], d0), F.pt(a1, yb[1], d0), F.pt(a1, yb[1], d1), F.pt(a0, yb[0], d1), F.pt(a0, yt[0], d0), F.pt(a1, yt[1], d0), F.pt(a1, yt[1], d1), F.pt(a0, yt[0], d1)];
  mb.hexa(c, color);
}

/* --------------------------------------------------------------------------------------------- */
/* Openings: reveals, frames, glass                                                               */
/* --------------------------------------------------------------------------------------------- */

export const SETBACK = 0.09; // glass/frame set back from the cladding face
const FW = 0.06; // frame face width
const MW = 0.04; // mullion width
const FD = 0.07; // frame depth

/** Top of an opening at a (sloped tops via topAt). */
const topOf = (o, a) => (o.topAt ? o.topAt(a) : o.y1);

/** Break points of an opening's top line (a positions incl. kinks). */
function topPoints(o, kinks = []) {
  const pts = [o.a0, ...kinks.filter((k) => k > o.a0 && k < o.a1), o.a1];
  return pts.map((a) => [a, topOf(o, a)]);
}

/**
 * Reveal lining (anthracite) of an opening: jambs, head (sloped if needed)
 * and sill, from the cladding face back to the frame.
 */
export function buildReveal(mb, faceId, o, { kinks = [], depth = SETBACK, color = null } = {}) {
  const F = FRAMES[faceId];
  const tp = topPoints(o, kinks);
  // jambs (facing into the opening)
  const jamb = (a, yTop, dir) => {
    const P = [F.pt(a, o.y0, 0), F.pt(a, o.y0, depth), F.pt(a, yTop, depth), F.pt(a, yTop, 0)];
    mb.face(P, F.pt(a + dir * 0.05, (o.y0 + yTop) / 2, depth / 2), color);
  };
  jamb(o.a0, tp[0][1], -1);
  jamb(o.a1, tp[tp.length - 1][1], 1);
  // head (facing down)
  for (let i = 0; i < tp.length - 1; i++) {
    const [a0, y0] = tp[i];
    const [a1, y1] = tp[i + 1];
    const P = [F.pt(a0, y0, 0), F.pt(a1, y1, 0), F.pt(a1, y1, depth), F.pt(a0, y0, depth)];
    mb.face(P, F.pt((a0 + a1) / 2, (y0 + y1) / 2 + 0.05, depth / 2), color);
  }
  // sill (facing up), a little outward slope
  if (o.y0 > 0.05) {
    const P = [F.pt(o.a0, o.y0 - 0.02, -0.03), F.pt(o.a1, o.y0 - 0.02, -0.03), F.pt(o.a1, o.y0, depth), F.pt(o.a0, o.y0, depth)];
    mb.face(P, F.pt((o.a0 + o.a1) / 2, o.y0 - 0.2, depth / 2), color);
  }
}

/**
 * Window/door frame + glass. Frame ring, mullions (o.cols), transoms (o.rows),
 * sub-area transoms (o.sub), glass at mid depth. Sloped tops follow topAt.
 */
export function buildWindow(frameMb, glassMb, faceId, o, { kinks = [], setback = SETBACK } = {}) {
  const F = FRAMES[faceId];
  const d0 = setback;
  const d1 = setback + FD;
  const tp = topPoints(o, kinks);
  const top = (a) => topOf(o, a);
  // stiles
  faceBox(frameMb, F, o.a0, o.a0 + FW, o.y0, top(o.a0 + FW), d0, d1, null);
  faceBox(frameMb, F, o.a1 - FW, o.a1, o.y0, top(o.a1 - FW), d0, d1, null);
  // bottom rail (doors get a slim threshold)
  const bh = o.kind === "door" || o.kind === "slide" || o.kind === "entry" ? 0.04 : FW;
  faceBox(frameMb, F, o.a0 + FW, o.a1 - FW, o.y0, o.y0 + bh, d0, d1, null);
  // top rail, per top segment
  for (let i = 0; i < tp.length - 1; i++) {
    const [a0, y0] = tp[i];
    const [a1, y1] = tp[i + 1];
    faceSlopedBox(frameMb, F, a0, a1, [y0 - FW, y1 - FW], [y0, y1], d0, d1, null);
  }
  // mullions
  for (const c of o.cols || []) faceBox(frameMb, F, c - MW / 2, c + MW / 2, o.y0 + bh, top(c) - FW, d0, d1, null);
  // transoms
  for (const r of o.rows || []) {
    if (r <= o.y0 + 0.1 || r >= Math.min(top(o.a0), top(o.a1)) - 0.05) continue;
    faceBox(frameMb, F, o.a0 + FW, o.a1 - FW, r - MW / 2, r + MW / 2, d0, d1, null);
  }
  for (const s of o.sub || []) for (const r of s.rows || []) faceBox(frameMb, F, s.a0 + MW / 2, s.a1 - FW, r - MW / 2, r + MW / 2, d0, d1, null);
  // sliding door: the second leaf's frame sits in a parallel track
  if (o.kind === "slide") {
    for (const c of o.cols || []) faceBox(frameMb, F, c - 0.06, c + 0.06, o.y0, o.y1 - FW, d0 + 0.02, d1 + 0.02, null);
  }
  // glass: one polygon over the opening
  const gd = d0 + FD / 2;
  const pts = [F.pt(o.a0, o.y0, gd), F.pt(o.a1, o.y0, gd), ...[...tp].reverse().map(([a, y]) => F.pt(a, y, gd))];
  glassMb.face(pts, F.pt((o.a0 + o.a1) / 2, o.y0 + 0.5, gd + 1), null);
}

/** Entrance door N2: dark leaf with three small square lights, glazed sidelight. */
export function buildEntryDoor(frameMb, glassMb, o) {
  const F = FRAMES.N;
  const d0 = SETBACK;
  const leafA1 = o.cols[0];
  faceBox(frameMb, F, o.a0, o.a1, o.y1 - FW, o.y1, d0, d0 + FD, null);
  faceBox(frameMb, F, o.a0, o.a0 + FW, o.y0, o.y1, d0, d0 + FD, null);
  faceBox(frameMb, F, o.a1 - FW, o.a1, o.y0, o.y1, d0, d0 + FD, null);
  faceBox(frameMb, F, leafA1 - MW / 2, leafA1 + MW / 2, o.y0, o.y1, d0, d0 + FD, null);
  // leaf with three lights (holes filled with glass)
  const lights = [0.95, 1.25, 1.55].map((y) => rect(o.a0 + 0.2, o.a0 + 0.36, y, y + 0.16));
  const leaf = { id: "N2leaf", a0: o.a0 + FW, a1: leafA1 - MW / 2, bottom: o.y0, top: () => o.y1 - FW };
  const pseudo = { ...leaf, kinks: [] };
  const Fpt = F;
  const edges = columnEdges(pseudo.a0, pseudo.a1, lights, [], 10);
  for (let i = 0; i < edges.length - 1; i++) {
    for (const iv of columnIntervals(edges[i], edges[i + 1], pseudo.bottom, pseudo.top, lights, -10, 10)) faceQuad(frameMb, Fpt, edges[i], edges[i + 1], iv.lo, iv.hi, d0 + 0.02, null);
  }
  for (const l of lights) faceQuad(glassMb, F, l.a0, l.a1, [l.b(), l.b()], [l.t(), l.t()], d0 + 0.04, null);
  // sidelight glass
  faceQuad(glassMb, F, leafA1 + MW / 2, o.a1 - FW, [o.y0, o.y0], [o.y1 - FW, o.y1 - FW], d0 + FD / 2, null);
  // handle: a slim vertical bar
  faceBox(frameMb, F, leafA1 - 0.12, leafA1 - 0.1, 0.8, 1.5, d0 - 0.06, d0 + 0.02, null);
}

/** N4: flush storage door clad in vertical boards, recessed 0.20. */
export function buildStorageDoor(woodMb, revealMb, o) {
  const F = FRAMES.N;
  const def = { id: "N", wood: true, a0: o.a0, a1: o.a1, bottom: o.y0, top: () => o.y1, kinks: [] };
  cladZone(woodMb, def, [], -10, 10, { d: 0.2 });
  buildReveal(revealMb, "N", o, { depth: 0.2 });
}

/* --------------------------------------------------------------------------------------------- */
/* Helpers used by the shell                                                                      */
/* --------------------------------------------------------------------------------------------- */

export { columnIntervals, columnEdges, rect, K, ROOF };
export const ALL_FACE_IDS = Object.keys(FRAMES);
void r1Soffit;
