/**
 * The building shell of Adria: timber frame, wind barrier, cladding, openings,
 * the two loggias (R1 framed gable, R2 west loggia), railings, entrance canopy,
 * sconces and plinth. Everything below each face's `share` height is built once
 * (shared); everything above it is built once per roof form into nodes
 * suffixed "__saltak" / "__flatt" / "__pulttak".
 */
import * as THREE from "three";
import { V, col, SceneNode } from "../builder.mjs";
import { Q } from "../quality.mjs";
import {
  HEADS,
  HX,
  HZ,
  LV,
  R1,
  R2,
  ROOF,
  ROOFS,
  WALL,
  openings,
  r1OpeningTop,
  r1Soffit,
  r2Soffit,
} from "./spec.mjs";
import {
  FRAMES,
  STORE,
  boardTone,
  buildEntryDoor,
  buildReveal,
  buildStorageDoor,
  buildWindow,
  cladZone,
  faceBox,
  faceDefs,
  faceQuad,
  openingHoles,
  panelZone,
} from "./faces.mjs";

const INF = 1e6;

/** Frame top for studs on a heated face (under the roof / parapet). */
function frameTop(faceId, roof, a) {
  if (roof === "saltak") {
    if (faceId === "S" || faceId === "N") return LV.wallTop;
    return ROOF.saltak.under(a) - 0.02;
  }
  if (roof === "flatt") return ROOF.flatt.parapet - ROOF.flatt.coping - 0.02;
  const p = ROOF.pulttak;
  if (faceId === "S") return p.under(HZ);
  if (faceId === "N") return p.under(-HZ);
  if (faceId === "R2back" || faceId === "R2side") return r2Soffit("pulttak");
  return p.under(a) - 0.02;
}

const studTone = (() => {
  let i = 0;
  return () => {
    const t = 0.9 + ((Math.sin(i++ * 12.9898) * 43758.5453) % 1 + 1) % 1 * 0.18;
    return new THREE.Color(t, t * 0.99, t * 0.96);
  };
})();

/* --------------------------------------------------------------------------------------------- */
/* Timber frame (bindingsverk)                                                                    */
/* --------------------------------------------------------------------------------------------- */

const SW = 0.048; // stud width
const [FD0, FD1] = WALL.frame;

/** Studs + plates of one heated face between y0 and yTop(a), with openings framed. */
function studWall(mb, def, roof, y0, yTop, ops, { cc = 0.6 } = {}) {
  const F = FRAMES[def.id];
  const [h0, h1] = def.heated;
  const pos = new Set([h0 + SW / 2, h1 - SW / 2]);
  for (let s = h0 + cc; s < h1 - 0.1; s += cc) pos.add(+s.toFixed(4));
  for (const o of ops) {
    if (o.a1 < h0 || o.a0 > h1) continue;
    pos.add(o.a0 - SW / 2);
    pos.add(o.a1 + SW / 2);
  }
  const studs = [...pos].sort((a, b) => a - b);
  for (const s of studs) {
    // a stud is interrupted by an opening it lies inside
    const cut = ops.filter((o) => s > o.a0 - 1e-3 && s < o.a1 + 1e-3);
    let segs = [[y0, null]];
    for (const o of cut) {
      const next = [];
      for (const [lo, hi] of segs) {
        const top = hi ?? INF;
        if (o.y1 + 0.2 <= lo || o.y0 - 0.05 >= top) {
          next.push([lo, hi]);
          continue;
        }
        if (o.y0 - 0.05 > lo + 0.05) next.push([lo, o.y0 - 0.05]);
        if (o.y1 + 0.2 < top - 0.05) next.push([o.y1 + 0.2, hi]);
      }
      segs = next;
    }
    for (const [lo, hi] of segs) {
      const top = Math.min(hi ?? INF, yTop(s));
      if (top - lo < 0.05) continue;
      faceBox(mb, F, s - SW / 2, s + SW / 2, lo, top, FD0, FD1, studTone(), { top: true, bottom: true });
    }
  }
  // headers and sills
  for (const o of ops) {
    if (o.a1 < h0 || o.a0 > h1 || o.y0 >= yTop(o.a0) || o.y1 < y0) continue;
    faceBox(mb, F, o.a0 - SW, o.a1 + SW, o.y1, o.y1 + 0.2, FD0, FD1, studTone());
    if (o.y0 > y0 + 0.2) faceBox(mb, F, o.a0, o.a1, o.y0 - 0.05, o.y0, FD0, FD1, studTone());
  }
}

/** Bottom and top plates along a heated face (straight plates; sloped tops get a sloped plate). */
function plates(mb, def, y, roof, { top = false } = {}) {
  const F = FRAMES[def.id];
  const [h0, h1] = def.heated;
  if (!top) {
    faceBox(mb, F, h0, h1, y, y + SW, FD0, FD1, studTone());
    return;
  }
  const ya = frameTop(def.id, roof, h0);
  const yb = frameTop(def.id, roof, h1);
  const kink = (def.kinks || []).find((k) => k > h0 && k < h1);
  const segs = kink !== undefined ? [[h0, kink], [kink, h1]] : [[h0, h1]];
  for (const [a, b] of segs) {
    const y0 = frameTop(def.id, roof, a);
    const y1 = frameTop(def.id, roof, b);
    const c = [F.pt(a, y0 - SW, FD0), F.pt(b, y1 - SW, FD0), F.pt(b, y1 - SW, FD1), F.pt(a, y0 - SW, FD1), F.pt(a, y0, FD0), F.pt(b, y1, FD0), F.pt(b, y1, FD1), F.pt(a, y0, FD1)];
    mb.hexa(c, studTone());
  }
  void ya;
  void yb;
}

export function buildFrame(layer) {
  const shared = layer.group("bindingsverk_vegger", { hideFrom: "interior", note: "wall studs: covered once the inside is lined" });
  const mbS = shared.mb("frame_wood", "bindingsverk_stendere");
  const base = faceDefs("saltak");
  for (const def of base) {
    if (!def.heated) continue;
    const ops = openings("saltak").filter((o) => o.face === def.id);
    // ground storey
    studWall(mbS, def, "saltak", LV.ff0 + SW, () => LV.joistBottom - SW, ops.filter((o) => o.y0 < LV.joistBottom));
    plates(mbS, def, LV.ff0, "saltak");
    faceBox(mbS, FRAMES[def.id], def.heated[0], def.heated[1], LV.joistBottom - SW, LV.joistBottom, FD0, FD1, studTone());
    // upper storey up to the shared wall top (openings framed as in the saltak house)
    studWall(mbS, def, "saltak", LV.joistTop + SW, () => LV.wallTop, ops.filter((o) => o.y1 > LV.joistTop));
    plates(mbS, def, LV.joistTop, "saltak");
  }
  // rim joists and floor joists (span z between the long walls)
  const j = shared.mb("frame_wood", "bindingsverk_bjelkelag");
  const zIn = HZ - FD0;
  for (let x = -HX + FD1 + 0.2; x < R1.x0 - FD1; x += 0.6) {
    const inStair = x > -0.45 && x < 3.05;
    const zs = inStair ? [[-zIn, -0.95], [0.15, zIn]] : [[-zIn, zIn]];
    for (const [z0, z1] of zs) j.aabb(V(x - 0.024, LV.joistBottom, z0), V(x + 0.024, LV.joistTop - 0.02, z1), studTone());
  }
  j.aabb(V(-HX + FD0, LV.joistBottom, -zIn), V(R1.x0 - FD0, LV.joistTop - 0.02, -zIn + 0.048), studTone());
  j.aabb(V(-HX + FD0, LV.joistBottom, zIn - 0.048), V(R1.x0 - FD0, LV.joistTop - 0.02, zIn), studTone());
  // stair trimmers
  j.aabb(V(-0.45, LV.joistBottom, -0.99), V(3.05, LV.joistTop - 0.02, -0.95), studTone());
  j.aabb(V(-0.45, LV.joistBottom, 0.15), V(3.05, LV.joistTop - 0.02, 0.19), studTone());

  // glulam frame of the loggias (columns, band beams), shared part up to the band
  const gl = shared.mb("frame_wood", "bindingsverk_ramme");
  const post = (x0, x1, z0, z1, y1) => gl.aabb(V(x0, LV.ff0, z0), V(x1, y1, z1), studTone());
  post(R1.xCol + 0.06, HX - 0.06, R1.zS + 0.06, HZ - 0.06, LV.bandTop); // SE column
  post(R1.x0 + 0.05, HX - 0.06, -HZ + 0.06, R1.zN - 0.06, LV.bandTop); // R1 north closure
  post(-HX + 0.06, R2.xCol - 0.06, R2.zCol + 0.06, HZ - 0.06, LV.bandTop); // SW column
  // band beams
  gl.aabb(V(R1.x0, LV.bandBottom, HZ - 0.36), V(HX - 0.06, LV.bandTop - 0.04, HZ - 0.06), studTone());
  gl.aabb(V(HX - 0.36, LV.bandBottom, R1.zN), V(HX - 0.06, LV.bandTop - 0.04, HZ - 0.06), studTone());
  gl.aabb(V(-HX + 0.06, LV.bandBottom, HZ - 0.36), V(R2.x1, LV.bandTop - 0.04, HZ - 0.06), studTone());
  gl.aabb(V(-HX + 0.06, LV.bandBottom, R2.z0), V(-HX + 0.36, LV.bandTop - 0.04, HZ - 0.06), studTone());

  // per roof form: upper studs above the shared top, gable studs, frame tops
  for (const roof of ROOFS) {
    const g = layer.group(`bindingsverk_vegger__${roof}`, { hideFrom: "interior", roof });
    const mb = g.mb("frame_wood", `bindingsverk_stendere__${roof}`);
    for (const def of faceDefs(roof)) {
      if (!def.heated) continue;
      const ops = openings(roof).filter((o) => o.face === def.id && o.y1 > 5.0);
      const yFrom = LV.wallTop;
      const top = (a) => frameTop(def.id, roof, a);
      const anyAbove = [def.heated[0], (def.heated[0] + def.heated[1]) / 2, def.heated[1], 0].some((a) => a >= def.heated[0] && a <= def.heated[1] && top(a) > yFrom + 0.05);
      if (!anyAbove) continue;
      studWall(mb, def, roof, yFrom, top, ops);
      plates(mb, def, yFrom, roof, { top: true });
    }
    // loggia frame posts above the band
    const gm = g.mb("frame_wood", `bindingsverk_ramme__${roof}`);
    const H = HEADS[roof];
    const yR1 = Math.max(H.r1, r1OpeningTop(roof, R1.zS));
    gm.aabb(V(R1.xCol + 0.06, LV.bandTop, R1.zS + 0.06), V(HX - 0.06, yR1 + 0.3, HZ - 0.06), studTone());
    gm.aabb(V(R1.x0 + 0.05, LV.bandTop, -HZ + 0.06), V(HX - 0.06, Math.max(r1OpeningTop(roof, R1.zN), r1Soffit(roof, R1.zN)), R1.zN - 0.06), studTone());
    gm.aabb(V(-HX + 0.06, LV.bandTop, R2.zCol + 0.06), V(R2.xCol - 0.06, H.r2 + 0.3, HZ - 0.06), studTone());
    // R1 frame top beam (follows the opening top)
    const zs = roof === "saltak" ? [[R1.zN, 0], [0, R1.zS]] : [[R1.zN, R1.zS]];
    for (const [z0, z1] of zs) {
      const y0 = r1OpeningTop(roof, z0);
      const y1 = r1OpeningTop(roof, z1);
      const c = [V(HX - 0.36, y0, z0), V(HX - 0.06, y0, z0), V(HX - 0.06, y1, z1), V(HX - 0.36, y1, z1)];
      const t = c.map((p) => p.clone().setY(p.y + 0.3));
      gm.hexa([c[0], c[1], c[2], c[3], t[0], t[1], t[2], t[3]], studTone());
    }
  }
}

/* --------------------------------------------------------------------------------------------- */
/* Envelope: wind barrier (isolasjon), cladding + trims (kledning), openings (vinduer)            */
/* --------------------------------------------------------------------------------------------- */

/** Holes of a face for a roof form (loggia holes + window/door holes). */
const holesOf = (def, roof) => [...def.holes, ...openingHoles(def.id, roof)];
const wbHoles = (holes) => holes.filter((h) => !h.panel);

export function buildEnvelope(layers) {
  const { isolasjon, kledning, vinduer } = layers;
  const wbColor = null;
  // ---- shared zones ----
  const wbS = isolasjon.mb("windbreak", "isolasjon_vindsperre");
  const cladS = kledning.group("kledning_vegger");
  const wood = cladS.mb("cladding_wood", "kledning_bord");
  const char = cladS.mb("cladding_charcoal", "kledning_bord_mork");
  const base = faceDefs("saltak");
  for (const def of base) {
    const holes = holesOf(def, "saltak");
    cladZone(def.wood ? wood : char, def, holes, -INF, def.share);
    panelZone(wbS, def, wbHoles(holes), -INF, def.share, WALL.windbreak[0], wbColor);
  }
  // ---- per roof ----
  for (const roof of ROOFS) {
    const wb = isolasjon.group(`isolasjon_vindsperre__${roof}`, { roof }).mb("windbreak", `isolasjon_vindsperre__${roof}`);
    const g = kledning.group(`kledning_vegger__${roof}`, { roof });
    const w = g.mb("cladding_wood", `kledning_bord__${roof}`);
    const c = g.mb("cladding_charcoal", `kledning_bord_mork__${roof}`);
    const cap = g.mb("interior_cut", `kledning_veggtopp__${roof}`);
    for (const def of faceDefs(roof)) {
      const holes = holesOf(def, roof);
      cladZone(def.wood ? w : c, def, holes, def.share, INF);
      panelZone(wb, def, wbHoles(holes), def.share, INF, WALL.windbreak[0], wbColor);
      if (def.heated) wallCap(cap, def);
    }
  }
  buildLoggias(kledning, layers.vinduer);
  buildOpeningsAll(kledning, vinduer);
  buildCharcoalPanels(kledning);
  buildSconces(kledning);
}

/** Ink cap on a heated wall's top (only seen when the roof is lifted). */
function wallCap(mb, def) {
  const F = FRAMES[def.id];
  const [h0, h1] = def.heated;
  const pts = [h0, ...(def.kinks || []).filter((k) => k > h0 && k < h1), h1];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const ya = def.top(a);
    const yb = def.top(b);
    const P = [F.pt(a, ya, 0), F.pt(b, yb, 0), F.pt(b, yb, WALL.thickness), F.pt(a, ya, WALL.thickness)];
    mb.face(P, F.pt((a + b) / 2, (ya + yb) / 2 - 1, 0.17), null);
  }
}

/**
 * Charcoal infill panels on the garden face: upper between U2 and U4 (up to the
 * U4 head of the roof form), ground next to G5. They sit 2 mm proud of the wood
 * boards they replace (the wood boards are cut by the same rectangle).
 */
function buildCharcoalPanels(kledning) {
  const F = FRAMES.S;
  const mkDef = (a0, a1, y0, y1, id) => ({ id: "S", wood: false, a0, a1, bottom: y0, top: () => y1, kinks: [], _id: id });
  // ground panel (shared)
  const sh = kledning.group("kledning_panel");
  // note: the upper panel's top differs per roof form, so it lives in the roof groups
  cladZone(sh.mb("cladding_charcoal", "kledning_panel_mork"), mkDef(2.95, 3.95, LV.claddingBottom, 2.12, "g"), [], -INF, INF);
  for (const roof of ROOFS) {
    const g = kledning.group(`kledning_panel__${roof}`, { roof });
    const head = HEADS[roof].u4;
    cladZone(g.mb("cladding_charcoal", `kledning_panel_mork__${roof}`), mkDef(-1.02, 0.91, LV.ff1 - 0.02, head, "u"), [], -INF, INF);
  }
  void F;
}

/* --------------------------------------------------------------------------------------------- */
/* Openings                                                                                       */
/* --------------------------------------------------------------------------------------------- */

function buildOpeningsAll(kledning, vinduer) {
  const kinksOf = (o) => (o.topAt && o.a0 < 0 && o.a1 > 0 ? [0] : []);
  // shared openings
  const trimS = kledning.mb("frame_anthracite", "kledning_lister");
  const fr = vinduer.mb("frame_anthracite", "vinduer_karm");
  const gl = vinduer.mb("glass", "vinduer_glass");
  for (const o of openings("saltak").filter((q) => !q.roof)) addOpening(o, trimS, fr, gl, kledning, kinksOf(o));
  for (const roof of ROOFS) {
    const t = kledning.group(`kledning_lister__${roof}`, { roof }).mb("frame_anthracite", `kledning_lister__${roof}`);
    const g = vinduer.group(`vinduer__${roof}`, { roof });
    const f = g.mb("frame_anthracite", `vinduer_karm__${roof}`);
    const gg = g.mb("glass", `vinduer_glass__${roof}`);
    for (const o of openings(roof).filter((q) => q.roof)) addOpening(o, t, f, gg, kledning, kinksOf(o));
  }
}

function addOpening(o, trim, frame, glass, kledning, kinks) {
  if (o.kind === "storage") {
    buildStorageDoor(kledning.mb("cladding_wood", "kledning_bod_dor"), trim, o);
    return;
  }
  buildReveal(trim, o.face, o, { kinks });
  if (o.kind === "entry") buildEntryDoor(frame, glass, o);
  else buildWindow(frame, glass, o.face, o, { kinks });
}

/* --------------------------------------------------------------------------------------------- */
/* Loggias: bands, soffits, floors, reveals, railings                                             */
/* --------------------------------------------------------------------------------------------- */

/** Horizontal board field (soffit or floor) over [x0,x1]×[z0,z1] at y, boards along `along`. */
export function boardField(mb, x0, x1, z0, z1, y, { along = "x", up = true, pitch = 0.125, gap = 0, wood = false, id = "f" } = {}) {
  const n = up ? 1 : -1;
  const span = along === "x" ? [z0, z1] : [x0, x1];
  let k = 0;
  for (let s = span[0]; s < span[1] - 1e-4; s += pitch, k++) {
    const e = Math.min(span[1], s + pitch - gap);
    const tone = boardTone(id, k, wood);
    const P =
      along === "x"
        ? [V(x0, y, s), V(x1, y, s), V(x1, y, e), V(x0, y, e)]
        : [V(s, y, z0), V(e, y, z0), V(e, y, z1), V(s, y, z1)];
    mb.face(P, V((x0 + x1) / 2, y - n, (z0 + z1) / 2), tone);
  }
}

/** Sloped soffit strip (charcoal boards running up-slope) over x∈[x0,x1], z∈[z0,z1], y = f(z). */
function slopedSoffit(mb, x0, x1, z0, z1, f, id) {
  const pitch = 0.125;
  let k = 0;
  for (let x = x0; x < x1 - 1e-4; x += pitch, k++) {
    const e = Math.min(x1, x + pitch);
    const tone = boardTone(id, k, true).multiplyScalar(0.72);
    const P = [V(x, f(z0), z0), V(e, f(z0), z0), V(e, f(z1), z1), V(x, f(z1), z1)];
    mb.face(P, V((x + e) / 2, (f(z0) + f(z1)) / 2 + 1, (z0 + z1) / 2), tone);
  }
}

function buildLoggias(kledning, vinduer) {
  const sh = kledning.group("kledning_losjer");
  const char = sh.mb("cladding_charcoal", "kledning_himling_mork");
  const woodR = sh.mb("cladding_wood", "kledning_ramme_lysning");
  const deck = sh.mb("deck", "kledning_balkonggulv");
  const yb = LV.bandBottom;
  // band undersides (ground loggia ceilings)
  boardField(char, R1.x0, HX, R1.zN, HZ, yb, { along: "z", up: false, id: "r1b" });
  boardField(char, -HX, R2.x1, R2.z0, HZ, yb, { along: "x", up: false, id: "r2b" });
  // balcony floors (upper loggias)
  boardField(deck, R1.x0, HX - 0.02, R1.zN, HZ - 0.02, LV.balconyFloor, { along: "z", id: "r1f", pitch: 0.14 });
  boardField(deck, -HX + 0.02, R2.x1, R2.z0, HZ - 0.02, LV.balconyFloor, { along: "x", id: "r2f", pitch: 0.14 });
  // closet top (under the band, hidden) is not needed; closet front is a face (faces.mjs)

  // railings (glass, base shoe, slim top cap)
  const rail = vinduer.group("vinduer_rekkverk");
  const rg = rail.mb("glass_rail", "vinduer_rekkverk_glass");
  const rs = rail.mb("steel_black", "vinduer_rekkverk_profil");
  const railRun = (p0, p1) => {
    const dir = p1.clone().sub(p0).normalize();
    const nrm = V(-dir.z, 0, dir.x);
    const t = 0.006;
    const corners = (y0, y1, w) => {
      const a = p0.clone().addScaledVector(nrm, -w);
      const b = p1.clone().addScaledVector(nrm, -w);
      const c = p1.clone().addScaledVector(nrm, w);
      const d = p0.clone().addScaledVector(nrm, w);
      return [a, b, c, d].map((q) => q.clone().setY(y0)).concat([a, b, c, d].map((q) => q.clone().setY(y1)));
    };
    rg.hexa(corners(LV.railBottom + 0.06, LV.railTop - 0.01, t));
    rs.hexa(corners(LV.balconyFloor + 0.01, LV.railBottom + 0.07, 0.03));
    rs.hexa(corners(LV.railTop - 0.015, LV.railTop + 0.01, 0.012));
  };
  const inset = 0.22;
  railRun(V(HX - inset, 0, R1.zN + 0.02), V(HX - inset, 0, R1.zS - 0.02));
  railRun(V(R1.x0 + 0.02, 0, HZ - inset), V(R1.xCol - 0.02, 0, HZ - inset));
  railRun(V(R2.xCol + 0.02, 0, HZ - inset), V(R2.x1 - 0.02, 0, HZ - inset));
  railRun(V(-HX + inset, 0, R2.z0 + 0.02), V(-HX + inset, 0, R2.zCol - 0.02));

  // per roof: upper soffits, frame reveals
  for (const roof of ROOFS) {
    const g = kledning.group(`kledning_losjer__${roof}`, { roof });
    const c = g.mb("cladding_charcoal", `kledning_himling_mork__${roof}`);
    const w = g.mb("cladding_wood", `kledning_ramme_lysning__${roof}`);
    const H = HEADS[roof];
    // R2 upper soffit (flat, at the opening top)
    boardField(c, -HX, R2.x1, R2.z0, HZ, r2Soffit(roof), { along: "x", up: false, id: "r2s" });
    // R1 upper soffit
    const sof = (z) => r1Soffit(roof, z);
    // the loggia ceiling is lined with stained wood (image 1: warm planks in shade)
    if (roof === "flatt") boardField(w, R1.x0, HX, R1.zN, HZ, sof(0), { along: "z", up: false, id: "r1s", wood: true });
    else if (roof === "saltak") {
      slopedSoffit(w, R1.x0, R1.xCol, R1.zN, 0, sof, "r1s");
      slopedSoffit(w, R1.x0, R1.xCol, 0, R1.zS, sof, "r1s");
    } else slopedSoffit(w, R1.x0, R1.xCol, R1.zN, R1.zS, sof, "r1s");
    // R1 east frame band: underside (wood) and inner face (charcoal) up to the soffit
    const top = (z) => r1OpeningTop(roof, z);
    const segs = roof === "saltak" ? [[R1.zN, 0], [0, R1.zS]] : [[R1.zN, R1.zS]];
    for (const [z0, z1] of segs) {
      w.face([V(R1.xCol, top(z0), z0), V(HX, top(z0), z0), V(HX, top(z1), z1), V(R1.xCol, top(z1), z1)], V(7.6, top((z0 + z1) / 2) + 1, (z0 + z1) / 2), null);
      if (roof !== "flatt") c.face([V(R1.xCol, top(z0), z0), V(R1.xCol, top(z1), z1), V(R1.xCol, sof(z1), z1), V(R1.xCol, sof(z0), z0)], V(R1.xCol + 1, (top(z0) + sof(z0)) / 2, (z0 + z1) / 2), null);
    }
    // R1 garden header: underside (wood) and inner face (charcoal)
    w.face([V(R1.x0, H.r1, R1.zS), V(R1.xCol, H.r1, R1.zS), V(R1.xCol, H.r1, HZ), V(R1.x0, H.r1, HZ)], V(6.6, H.r1 + 1, 3.7), null);
    const sS = sof(R1.zS);
    if (sS > H.r1 + 0.01) c.face([V(R1.x0, H.r1, R1.zS), V(R1.xCol, H.r1, R1.zS), V(R1.xCol, sS, R1.zS), V(R1.x0, sS, R1.zS)], V(6.6, (H.r1 + sS) / 2, R1.zS + 1), null);
  }
}

/* --------------------------------------------------------------------------------------------- */
/* Sconces                                                                                        */
/* --------------------------------------------------------------------------------------------- */

function buildSconces(kledning) {
  const mb = kledning.mb("steel_black", "kledning_lamper");
  const glow = kledning.mb("lamp_glow", "kledning_lamper_lys");
  const at = (F, a, y) => {
    faceBox(mb, F, a - 0.06, a + 0.06, y - 0.1, y + 0.1, -0.1, 0, null, { front: true });
    faceBox(glow, F, a - 0.045, a + 0.045, y - 0.105, y - 0.095, -0.085, -0.015, null, { top: true });
  };
  at(FRAMES.S, -2.72, 5.15);
  at(FRAMES.S, 5.1, 5.1);
  at(FRAMES.S, -2.75, 1.8);
  at(FRAMES.S, 5.1, 1.75);
  at(FRAMES.R1back, 2.85, 1.9);
  at(FRAMES.R1back, -0.6, 1.9);
  at(FRAMES.R1back, 2.85, 5.0);
  at(FRAMES.R2back, -4.3, 1.9);
  at(FRAMES.N, -2.95, 1.95);
  at(FRAMES.N, 6.62, 2.75);
}

/* --------------------------------------------------------------------------------------------- */
/* Entrance canopy, plinth                                                                        */
/* --------------------------------------------------------------------------------------------- */

export function buildCanopy(vinduer) {
  const g = vinduer.group("vinduer_baldakin");
  const glass = g.mb("glass_rail", "vinduer_baldakin_glass");
  const steel = g.mb("steel_black", "vinduer_baldakin_stag");
  const x0 = -2.75;
  const x1 = -1.3;
  const z0 = -HZ;
  const z1 = -HZ - 0.9;
  glass.aabb(V(x0, 2.4, z1), V(x1, 2.42, z0));
  steel.aabb(V(x0, 2.38, z0 - 0.04), V(x1, 2.43, z0)); // wall profile
  steel.aabb(V(x0, 2.38, z1), V(x1, 2.4, z1 + 0.04)); // front edge
  for (const x of [x0 + 0.12, x1 - 0.12]) steel.tube([V(x, 2.43, z1 + 0.06), V(x, 3.05, z0)], 0.012, Q().tubeRadial >= 8 ? 6 : 4, null);
}

export function buildPlinth(fundament) {
  const mb = fundament.mb("plinth", "fundament_sokkel");
  const y0 = LV.plinthBottom - 0.25;
  const y1 = LV.claddingBottom;
  const d = 0.02;
  // around the heated footprint plus the loggia slabs (outer line)
  const ring = [
    [-HX, -HZ],
    [HX, -HZ],
    [HX, HZ],
    [-HX, HZ],
  ];
  for (let i = 0; i < 4; i++) {
    const [ax, az] = ring[i];
    const [bx, bz] = ring[(i + 1) % 4];
    const dx = Math.sign(bx - ax);
    const dz = Math.sign(bz - az);
    const nx = dz;
    const nz = -dx;
    const p0 = V(ax - nx * d, y0, az - nz * d);
    const p1 = V(bx - nx * d, y0, bz - nz * d);
    mb.face([p0, p1, p1.clone().setY(y1), p0.clone().setY(y1)], V((ax + bx) / 2 - nx, (y0 + y1) / 2, (az + bz) / 2 - nz), null);
  }
}

export { col, SceneNode };
