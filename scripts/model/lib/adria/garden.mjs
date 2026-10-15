/**
 * Nøkkelferdig (layer_nokkelferdig): deck and steps, black steel pergola, the
 * steel planter, outdoor furniture, entrance landing and drive, planting beds
 * (instanced, each instance with its own birth time), the loungers and lantern
 * on the foreground terrace, and the framing foliage near the photo camera.
 */
import * as THREE from "three";
import { V, col, rng, SceneNode } from "../builder.mjs";
import { Q } from "../quality.mjs";
import { DECK, HX, HZ, LV, PERGOLA, PLANTER, R1, R2, STAIR, TERRACE } from "./spec.mjs";
import { boardTone } from "./faces.mjs";
import { grill, lantern, lounger, placer, potPlanter, sofa, stool, table, chair } from "./furniture.mjs";
import { domeClump, rosette, uprightClump } from "./veg.mjs";
import { TILE } from "./textures.mjs";
import { terrainHeight } from "./env.mjs";
import { PHOTO_MATCH } from "../cameras.mjs";

/* --------------------------------------------------------------------------------------------- */
/* Deck                                                                                           */
/* --------------------------------------------------------------------------------------------- */

/** Deck boards along x over [x0,x1]×[z0,z1], top at y, with a front fascia down to `yLow`. */
function deckField(top, side, x0, x1, z0, z1, y, id) {
  const p = DECK.board + DECK.gap;
  let k = 0;
  if (Q().deckBoards) {
    for (let z = z0; z < z1 - 1e-4; z += p, k++) {
      const e = Math.min(z1, z + DECK.board);
      const tone = boardTone(id, k, true);
      top.aabb(V(x0, y - 0.03, z), V(x1, y, e), tone);
    }
  } else {
    // lite: one slab with board tones striped through vertex colours (two strips per metre)
    for (let z = z0; z < z1 - 1e-4; z += 0.5, k++) {
      const e = Math.min(z1, z + 0.5);
      top.face([V(x0, y, z), V(x1, y, z), V(x1, y, e), V(x0, y, e)], V(0, y - 1, z), boardTone(id, k, true));
    }
  }
  void side;
}

export function buildDeck(layer) {
  const g = layer.group("nokkelferdig_terrasse");
  const top = g.mb("deck", "nokkelferdig_terrasse_bord");
  const side = g.mb("deck", "nokkelferdig_terrasse_bord");
  const y = LV.deck;
  // garden deck (south) and the east deck
  deckField(top, side, DECK.garden.x[0], DECK.garden.x[1], DECK.garden.z[0], DECK.garden.z[1], y, "dg");
  deckField(top, side, DECK.east.x[0], DECK.east.x[1], DECK.east.z[0], DECK.east.z[1], y, "de");
  // loggia floors at deck level
  deckField(top, side, R1.x0, HX, -2.9, HZ, y, "dr1");
  deckField(top, side, -HX, R2.x1, R2.z0, HZ, y, "dr2");
  // two steps down along the south edge
  const zF = DECK.garden.z[1];
  const xs = [DECK.garden.x[0], DECK.east.x[1]];
  const st = g.mb("deck", "nokkelferdig_terrasse_bord");
  const s1 = y - 0.12;
  const s2 = y - 0.24;
  st.aabb(V(xs[0], s1 - 0.04, zF), V(xs[1], s1, zF + 0.3), col("#e8e2dc"));
  st.aabb(V(xs[0], s2 - 0.04, zF + 0.3), V(xs[1], s2, zF + 0.6), col("#ddd6cf"));
  // fascias (dark edge boards) down into the lawn
  const fz = g.mb("deck", "nokkelferdig_terrasse_bord");
  const low = (x, z) => Math.min(terrainHeight(x, z) - 0.15, y - 0.05);
  const edge = (a, b, inside) => fz.face([V(a.x, low(a.x, a.z), a.z), V(b.x, low(b.x, b.z), b.z), V(b.x, s2 - 0.04, b.z), V(a.x, s2 - 0.04, a.z)], inside, col("#5a524b"));
  edge(V(xs[0], 0, zF + 0.6), V(xs[1], 0, zF + 0.6), V(0, 0, zF));
  for (const [a, b, ins] of [
    [V(DECK.east.x[1], 0, DECK.east.z[0]), V(DECK.east.x[1], 0, zF + 0.6), V(10, 0, 0)],
    [V(DECK.east.x[0], 0, DECK.east.z[0]), V(DECK.east.x[1], 0, DECK.east.z[0]), V(10, 0, 0)],
    [V(-HX, 0, HZ), V(-HX, 0, zF + 0.6), V(0, 0, 5)],
  ]) {
    fz.face([V(a.x, low(a.x, a.z), a.z), V(b.x, low(b.x, b.z), b.z), V(b.x, y - 0.03, b.z), V(a.x, y - 0.03, a.z)], ins, col("#5a524b"));
  }
  // entrance landing (dark concrete, one step) and the paved drive
  const conc = g.mb("plinth", "nokkelferdig_trapp");
  conc.aabb(V(-3.36, LV.drive - 0.1, -HZ - 1.2), V(-0.72, LV.deck, -HZ), col("#5d5b57"));
  conc.aabb(V(-3.36, LV.drive - 0.1, -HZ - 1.5), V(-0.72, LV.deck - 0.13, -HZ - 1.2), col("#5d5b57"));
  const pav = g.mb("pavers", "nokkelferdig_innkjorsel");
  const r = rng(77);
  // drive from the north-east towards the door: a pavers field with per-stone tones
  const d0 = { x0: -3.4, x1: 24, z0: -9.2, z1: -HZ - 1.5 };
  for (let x = d0.x0; x < d0.x1; x += 0.6) {
    for (let z = d0.z0; z < d0.z1; z += 0.3) {
      const zx = Math.min(d0.z1, z + 0.29);
      const xx = Math.min(d0.x1, x + 0.59);
      // keep a lawn strip in front of the west wall
      if (x < -0.5 && z > -5.6) continue;
      const t = 0.9 + r() * 0.16;
      pav.face([V(x, LV.drive, z), V(xx, LV.drive, z), V(xx, LV.drive, zx), V(x, LV.drive, zx)], V(x, LV.drive - 1, z), col("#ffffff").multiplyScalar(t));
    }
  }
}

/* --------------------------------------------------------------------------------------------- */
/* Pergola                                                                                        */
/* --------------------------------------------------------------------------------------------- */

export function buildPergola(layer) {
  const g = layer.group("nokkelferdig_pergola");
  const s = g.mb("steel_black", "nokkelferdig_pergola_stal");
  const P = PERGOLA;
  const zPost = P.z1 - 0.05;
  for (const x of P.posts) s.aabb(V(x - 0.05, LV.deck, zPost - 0.05), V(x + 0.05, P.beamBottom, zPost + 0.05));
  s.aabb(V(P.x0 - 0.05, P.beamBottom, zPost - 0.05), V(P.x1 + 0.05, P.beamTop, zPost + 0.05));
  // wall ledger
  s.aabb(V(P.x0 - 0.05, P.beamTop - 0.2, HZ), V(P.x1 + 0.05, P.beamTop, HZ + 0.06));
  // open rafters 60 × 200 at c/c 0.60, projecting 0.15 past the beam
  for (let x = P.x0; x <= P.x1 + 1e-3; x += (P.x1 - P.x0) / Math.round((P.x1 - P.x0) / 0.6)) {
    s.aabb(V(x - 0.03, P.beamTop - 0.2, HZ + 0.06), V(x + 0.03, P.beamTop, P.z1 + 0.15));
  }
}

/* --------------------------------------------------------------------------------------------- */
/* Furniture                                                                                      */
/* --------------------------------------------------------------------------------------------- */

export function buildOutdoorFurniture(layer) {
  const g = layer.group("nokkelferdig_mobler");
  const m = {
    frame: g.mb("steel_black", "nokkelferdig_mobler_stal"),
    steel: g.mb("chimney_steel", "nokkelferdig_mobler_blank"),
    wood: g.mb("furniture_oak", "nokkelferdig_mobler_eik"),
    cushion: g.mb("cushion", "nokkelferdig_puter"),
    pot: g.mb("charcoal", "nokkelferdig_potter"),
    plant: g.mb("plant", "nokkelferdig_potteplanter"),
    glass: g.mb("glass_rail", "nokkelferdig_lykt_glass"),
    glow: g.mb("lamp_glow", "nokkelferdig_lykt_lys"),
  };
  const y = LV.deck;
  // dining under the pergola: oak table 2.40 × 0.95, eight black chairs
  const tx = -0.6;
  const tz = 5.35;
  table(m, tx, y, tz, 0, { w: 2.4, d: 0.95, top: "wood", leg: "frame" });
  for (const dx of [-0.8, 0, 0.8]) {
    chair(m, tx + dx, y, tz - 0.75, 0);
    chair(m, tx + dx, y, tz + 0.75, Math.PI);
  }
  chair(m, tx - 1.55, y, tz, -Math.PI / 2);
  chair(m, tx + 1.55, y, tz, Math.PI / 2);
  // bar table + two stools at the west post
  table(m, -3.0, y, 6.55, 0, { w: 0.6, d: 0.6, h: 1.05, top: "frame", leg: "frame" });
  stool(m, -3.55, y, 6.55, 0);
  stool(m, -3.0, y, 7.05, 0);
  // gas grill cabinet
  grill(m, 1.6, y, 7.0, 0.1);
  // east deck lounge: three-seat sofa, two armchairs, ottoman, coffee table
  sofa(m, 11.0, y, -1.9, Math.PI * 0.5, { seats: 3 });
  sofa(m, 12.3, y, 1.35, Math.PI, { seats: 1 });
  sofa(m, 10.2, y, 1.6, Math.PI * 0.9, { seats: 1 });
  placer(10.1, y, -0.2, 0).box(m.cushion, -0.4, 0.06, -0.4, 0.4, 0.38, 0.4);
  placer(10.1, y, -0.2, 0).box(m.frame, -0.4, 0, -0.4, 0.4, 0.06, 0.4);
  table(m, 11.6, y, -0.3, 0.1, { w: 1.2, d: 0.7, h: 0.36, top: "wood", leg: "frame" });
  potPlanter(m, 12.6, y, -3.9, { r: 0.3, h: 0.6 });
  potPlanter(m, 13.0, y, -2.9, { r: 0.3, h: 0.55 });
  potPlanter(m, 9.0, y, -4.0, { r: 0.3, h: 0.6 });
  // R1 covered terrace (ground): sofa, two armchairs, round table
  sofa(m, 6.8, y, -1.9, -Math.PI / 2 + Math.PI, { seats: 2 });
  sofa(m, 7.2, y, 0.6, Math.PI * 0.75, { seats: 1 });
  table(m, 7.1, y, -0.6, 0, { w: 0.7, round: true, h: 0.45, top: "wood", leg: "frame" });
  // R1 upper balcony: two lounge chairs, small table, black pots with plants
  const yb = LV.balconyFloor;
  sofa(m, 6.5, yb, 1.4, Math.PI / 2 + 0.2, { seats: 1, depth: 0.8 });
  sofa(m, 6.5, yb, -0.6, Math.PI / 2 - 0.2, { seats: 1, depth: 0.8 });
  table(m, 6.9, yb, 0.4, 0, { w: 0.5, round: true, h: 0.5, top: "wood", leg: "frame" });
  potPlanter(m, 7.25, yb, 2.95, { r: 0.22, h: 0.5 });
  potPlanter(m, 6.2, yb, 3.35, { r: 0.2, h: 0.45 });
  potPlanter(m, -4.0, yb, 3.25, { r: 0.22, h: 0.5 });
  potPlanter(m, -6.6, yb, 3.3, { r: 0.18, h: 0.4 });
  // the steel planter box in front of the deck
  const pl = g.mb("steel_black", "nokkelferdig_plantekasse");
  const yP = terrainHeight(3.4, 7.9);
  pl.aabb(V(PLANTER.x[0], yP - 0.1, PLANTER.z[0]), V(PLANTER.x[1], yP + PLANTER.h, PLANTER.z[1]));
  const soil = g.mb("earth", "nokkelferdig_jord");
  soil.face([V(PLANTER.x[0] + 0.04, yP + PLANTER.h - 0.05, PLANTER.z[0] + 0.04), V(PLANTER.x[1] - 0.04, yP + PLANTER.h - 0.05, PLANTER.z[0] + 0.04), V(PLANTER.x[1] - 0.04, yP + PLANTER.h - 0.05, PLANTER.z[1] - 0.04), V(PLANTER.x[0] + 0.04, yP + PLANTER.h - 0.05, PLANTER.z[1] - 0.04)], V(0, -10, 0), null);
  // the foreground terrace: two white loungers (backrest at the east end), lantern side table
  const yT = TERRACE.top;
  lounger(m, 22.2, yT, 20.4, -0.04, { raised: false });
  lounger(m, 22.4, yT, 16.6, -0.02, { raised: true });
  lantern(m, 23.9, yT, 14.6);
  return m;
}

/* --------------------------------------------------------------------------------------------- */
/* Planting (instanced)                                                                           */
/* --------------------------------------------------------------------------------------------- */

const quatY = (a) => {
  const q = new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), a);
  return [q.x, q.y, q.z, q.w];
};

/** House centre for birth times: plants grow by distance from the house. */
const birthOf = (x, z) => 6.5 + 0.95 * Math.min(1, Math.hypot(x - 1, z - 3) / 28);

/** Template node with instances: kind → geometry builder. */
function species(parent, name, build, spots, { seed = 1 } = {}) {
  const keep = Q().plants;
  const r = rng(seed);
  const inst = [];
  for (const s of spots) {
    if (keep < 1 && r() > keep) continue;
    const sc = s.s ?? 1;
    inst.push({ translation: [s.x, s.y, s.z], rotation: quatY(s.a ?? r() * Math.PI * 2), scale: [sc, sc * (s.sy ?? 1), sc], birth: s.birth ?? birthOf(s.x, s.z) });
  }
  if (!inst.length) return null;
  const node = parent.add(new SceneNode(name, { kind: "plant", instanced: true }));
  node.instances = inst;
  build(node.mb("leaf", `${name}_leaf`));
  return node;
}

/** Scatter n spots in a polygon-ish region given by a sampler. */
function scatter(n, seed, sample) {
  const r = rng(seed);
  const out = [];
  for (let i = 0; i < n; i++) out.push(sample(r, i));
  return out;
}

/* --------------------------------------------------------------------------------------------- */
/* Photo-space placement (image 1): rays of the photo camera                                      */
/* --------------------------------------------------------------------------------------------- */

const PM = PHOTO_MATCH;
const yawPM = (PM.rotation.y * Math.PI) / 180;
const F_PM = V(-Math.sin(yawPM), 0, -Math.cos(yawPM));
const R_PM = V(Math.cos(yawPM), 0, -Math.sin(yawPM));
/** Ray direction through photo pixel (u, v) of image 1 (unnormalised, forward component 1). */
function photoRay(u, v) {
  const [cx, cy] = PM.principalPoint;
  return F_PM.clone().addScaledVector(R_PM, (u - cx) / PM.focalPx).add(V(0, (cy - v) / PM.focalPx, 0));
}
/** World point at forward depth t on the ray through (u, v). */
export function photoPoint(u, v, t) {
  return V(...PM.position).addScaledVector(photoRay(u, v), t);
}
/** Where the ray through (u, v) meets the ground (terrainHeight). */
export function photoGround(u, v) {
  const C = V(...PM.position);
  const d = photoRay(u, v);
  let lo = 0.5;
  let hi = 260;
  const f = (t) => {
    const p = C.clone().addScaledVector(d, t);
    return p.y - terrainHeight(p.x, p.z);
  };
  if (f(hi) > 0) return C.clone().addScaledVector(d, hi);
  for (let i = 0; i < 50; i++) {
    const m = (lo + hi) / 2;
    if (f(m) > 0) lo = m;
    else hi = m;
  }
  const p = C.clone().addScaledVector(d, (lo + hi) / 2);
  p.y = terrainHeight(p.x, p.z);
  return p;
}
/** n ground spots inside a photo-space box [u0,u1]×[v0,v1]. */
function photoSpots(n, seed, [u0, u1], [v0, v1], s = [0.9, 1.3]) {
  const r = rng(seed);
  const out = [];
  for (let i = 0; i < n; i++) {
    const p = photoGround(u0 + (u1 - u0) * ((i + r()) / n), v0 + (v1 - v0) * r());
    out.push({ x: p.x, y: p.y, z: p.z, s: s[0] + (s[1] - s[0]) * r() });
  }
  return out;
}

export function buildPlanting(layer, { framing = true } = {}) {
  const g = layer.group("nokkelferdig_beplantning");
  const yP = terrainHeight(3.4, 7.9) + PLANTER.h - 0.05;
  // ---- steel planter in front of the deck: lavender along the front, grasses ----
  const planterLav = scatter(16, 3, (r, i) => ({ x: PLANTER.x[0] + 0.3 + (i / 15) * (PLANTER.x[1] - PLANTER.x[0] - 0.6) + (r() - 0.5) * 0.2, y: yP, z: 7.95 + (r() - 0.5) * 0.5, s: 0.9 + r() * 0.35 }));
  const planterGrass = [
    { x: 1.3, y: yP, z: 7.85, s: 1.0 },
    { x: 3.2, y: yP, z: 7.8, s: 1.15 },
    { x: 5.4, y: yP, z: 7.9, s: 0.95 },
  ];
  // ---- beds placed in photo space (image 1) ----
  const wLav = photoSpots(16, 5, [372, 600], [690, 712], [0.9, 1.3]);
  const wGrass = photoSpots(6, 6, [430, 600], [686, 706], [1.0, 1.4]);
  const wShrub = photoSpots(8, 7, [350, 610], [688, 712], [0.7, 1.1]);
  const wHosta = photoSpots(8, 8, [360, 560], [700, 716], [0.8, 1.2]);
  const spiraea = photoSpots(8, 11, [1700, 1915], [790, 870], [1.0, 1.5]);
  const tGrass = [...photoSpots(4, 12, [1560, 1700], [800, 830], [1.1, 1.5]), ...photoSpots(2, 120, [1840, 1915], [760, 800], [1.0, 1.3])];
  const tLav = [...photoSpots(10, 13, [1420, 1680], [1035, 1078], [0.9, 1.3]), ...photoSpots(4, 130, [1520, 1600], [835, 860], [0.8, 1.1])];
  const tBox = photoSpots(8, 14, [470, 790], [1045, 1078], [0.9, 1.4]);
  const tHosta = photoSpots(7, 15, [0, 330], [985, 1075], [0.9, 1.4]);
  const byHouse = [
    { x: 13.9, y: terrainHeight(13.9, 4.8), z: 4.8, s: 1.1 },
    { x: 13.8, y: terrainHeight(13.8, 0.5), z: 0.5, s: 1.0 },
    { x: -8.4, y: terrainHeight(-8.4, 6.8), z: 6.8, s: 1.2 },
    { x: -8.6, y: terrainHeight(-8.6, 3.0), z: 3.0, s: 1.0 },
  ];
  const northShrubs = [
    { x: 1.0, y: LV.drive, z: -4.45, s: 0.8 },
    { x: 2.6, y: LV.drive, z: -4.45, s: 0.7 },
    { x: 3.6, y: LV.drive, z: -4.4, s: 0.6 },
  ];
  const lav = (mb) => uprightClump(mb, { tile: TILE.lavender, n: 5, h: 0.55, w: 0.55, spread: 0.12, seed: 21 });
  const grass = (mb) => uprightClump(mb, { tile: TILE.grass, n: 6, h: 1.0, w: 0.95, spread: 0.18, seed: 22, tilt: 0.3 });
  const shrub = (mb) => domeClump(mb, { tile: TILE.broad, n: 14, rx: 0.55, ry: 0.5, size: 0.5, seed: 23, tints: ["#f2f4ea", "#e2e8d6"] });
  const spir = (mb) => domeClump(mb, { tile: TILE.blossom, n: 16, rx: 0.65, ry: 0.6, size: 0.6, seed: 24 });
  const box = (mb) => domeClump(mb, { tile: TILE.box, n: 9, rx: 0.32, ry: 0.28, size: 0.36, seed: 25 });
  const hosta = (mb) => rosette(mb, { n: 6, size: 0.42, seed: 26, tints: ["#e8f0d8", "#d8e4c4"] });
  species(g, "nokkelferdig_plante_lavendel", lav, [...planterLav, ...wLav, ...tLav], { seed: 31 });
  species(g, "nokkelferdig_plante_gress", grass, [...planterGrass, ...wGrass, ...tGrass], { seed: 32 });
  species(g, "nokkelferdig_plante_busk", shrub, [...wShrub, ...byHouse, ...northShrubs], { seed: 33 });
  species(g, "nokkelferdig_plante_spirea", spir, spiraea, { seed: 34 });
  species(g, "nokkelferdig_plante_buksbom", box, tBox, { seed: 35 });
  species(g, "nokkelferdig_plante_hosta", hosta, [...wHosta, ...tHosta], { seed: 36 });

  // ---- framing foliage near the photo camera (photo space; dithered out when the stage expands) ----
  if (framing) {
    const f = g.group("nokkelferdig_rammeblader", { framing: true, note: "exists only for the photo framing (image 1); fade out when the stage expands" });
    const big = f.mb("leaf", "nokkelferdig_rammeblader_leaf");
    const r = rng(41);
    // large leaves at the right photo edge, ≈ 3.5 m from the camera
    for (let i = 0; i < 7; i++) {
      const p = photoPoint(1800 + r() * 130, 340 + r() * 260, 3.2 + r() * 0.8);
      const n = V(-0.75 + (r() - 0.5) * 0.5, 0.25 + r() * 0.3, -0.6).normalize();
      cardAt(big, p, 0.32 + r() * 0.16, n, TILE.bigleaf, col("#c9dcae").multiplyScalar(0.75 + r() * 0.3));
    }
  }
  return g;
}

import { card } from "./veg.mjs";
function cardAt(mb, p, s, n, tile, c) {
  card(mb, p, s, s, n, V(0, 1, 0), tile, c, n);
}

void STAIR;
