/**
 * Interior of Adria: our illustration, consistent with Boligpartner's
 * "4 soverom, 2 bad" (three bedrooms and one bathroom upstairs, bedroom 4 and
 * bathroom 2 downstairs). Partitions are 0.10 m, cut at +2.50 above the upper
 * floor with ink cut faces (the plan-drawing look from above in "Se inn").
 * The ground floor only carries what shows through the glass.
 *
 * Layer: layer_interior. Ceilings of the upper floor live in roofs.mjs
 * (interior_himling__<roof>__ceiling).
 */
import * as THREE from "three";
import { V } from "../builder.mjs";
import { Q } from "../quality.mjs";
import { CUT_UP, HX, HZ, IN, INX, LV, PARTITION_T, R1, R1IN, R2, ROOFS, STAIR, WALL, openings } from "./spec.mjs";
import { FRAMES, faceDefs, openingHoles, panelZone } from "./faces.mjs";
import { bathtub, bed, chair, floorLamp, island, kitchen, pendant, rug, shelf, sofa, table, placer } from "./furniture.mjs";

const INF = 1e6;

/** Horizontal polygon (with holes) facing up or down. */
export function hpoly(mb, outline, holes, y, up = true, color = null) {
  const contour = outline.map(([x, z]) => new THREE.Vector2(x, z));
  const hs = (holes || []).map((h) => h.map(([x, z]) => new THREE.Vector2(x, z)));
  const tris = THREE.ShapeUtils.triangulateShape(contour, hs);
  const all = [...contour, ...hs.flat()];
  const n = V(0, up ? 1 : -1, 0);
  for (const [a, b, c] of tris) {
    const A = V(all[a].x, y, all[a].y);
    const B = V(all[b].x, y, all[b].y);
    const C = V(all[c].x, y, all[c].y);
    const nY = (B.x - A.x) * (C.z - A.z) - (B.z - A.z) * (C.x - A.x);
    if ((nY < 0) === up) mb.tri(A, B, C, color, n);
    else mb.tri(A, C, B, color, n);
  }
}

/** Heated footprint inside the outer walls (L-shape around R2). */
function innerOutline() {
  const t = WALL.thickness;
  return [
    [-INX, -IN],
    [R1IN, -IN],
    [R1IN, IN],
    [R2.x1 + t, IN],
    [R2.x1 + t, R2.z0 - t],
    [-INX, R2.z0 - t],
  ];
}

/** A partition wall between plan points, cut at yTop, with door gaps [[a0, a1], …] along it. */
function partition(walls, cuts, x0, z0, x1, z1, y0, yTop, doors = []) {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const ux = (x1 - x0) / len;
  const uz = (z1 - z0) / len;
  const nx = -uz * (PARTITION_T / 2);
  const nz = ux * (PARTITION_T / 2);
  let pieces = [[0, len]];
  for (const [d0, d1] of doors) {
    const next = [];
    for (const [a, b] of pieces) {
      if (d1 <= a || d0 >= b) next.push([a, b]);
      else {
        if (d0 > a) next.push([a, d0]);
        if (d1 < b) next.push([d1, b]);
      }
    }
    pieces = next;
  }
  const P = (a, y, s) => V(x0 + ux * a + nx * s, y, z0 + uz * a + nz * s);
  for (const [a, b] of pieces) {
    walls.hexa([P(a, y0, -1), P(b, y0, -1), P(b, y0, 1), P(a, y0, 1), P(a, yTop, -1), P(b, yTop, -1), P(b, yTop, 1), P(a, yTop, 1)], null, { top: true, bottom: true });
    cuts.face([P(a, yTop, -1), P(b, yTop, -1), P(b, yTop, 1), P(a, yTop, 1)], P((a + b) / 2, yTop - 1, 0), null);
  }
  // door heads (lintels) over the gaps
  for (const [d0, d1] of doors) {
    if (yTop <= y0 + 2.1) continue;
    walls.hexa([P(d0, y0 + 2.1, -1), P(d1, y0 + 2.1, -1), P(d1, y0 + 2.1, 1), P(d0, y0 + 2.1, 1), P(d0, yTop, -1), P(d1, yTop, -1), P(d1, yTop, 1), P(d0, yTop, 1)], null, { top: true });
    cuts.face([P(d0, yTop, -1), P(d1, yTop, -1), P(d1, yTop, 1), P(d0, yTop, 1)], P((d0 + d1) / 2, yTop - 1, 0), null);
  }
}

export function buildInterior(layer) {
  const m = {
    wall: layer.mb("interior_wall", "interior_vegger"),
    cut: layer.mb("interior_cut", "interior_snitt"),
    floor: layer.mb("floor_oak", "interior_gulv"),
    wood: layer.mb("furniture_oak", "interior_mobler_eik"),
    linen: layer.mb("linen", "interior_tekstil_lys"),
    textile: layer.mb("textile_grey", "interior_tekstil"),
    frame: layer.mb("charcoal", "interior_mobler_mork"),
    cushion: layer.mb("linen", "interior_tekstil_lys"),
    sanitary: layer.mb("sanitary", "interior_sanitar"),
    tile: layer.mb("tile", "interior_flis"),
    glass: layer.mb("glass_rail", "interior_glass"),
    glow: layer.mb("lamp_glow", "interior_lys"),
    plant: layer.mb("plant", "interior_planter"),
    pot: layer.mb("charcoal", "interior_mobler_mork"),
    front: layer.mb("charcoal", "interior_mobler_mork"),
    top: layer.mb("tile", "interior_flis"),
  };
  const t = WALL.thickness;
  const yUp = LV.ff1;
  const yCut = yUp + CUT_UP;

  // ---- floors ----
  hpoly(m.floor, innerOutline(), [], LV.ff0 + 0.001, true);
  const stairHole = [
    [STAIR.x0, STAIR.z0],
    [STAIR.x1, STAIR.z0],
    [STAIR.x1, STAIR.z1],
    [STAIR.x0, STAIR.z1],
  ];
  hpoly(m.floor, innerOutline(), [stairHole], yUp, true);
  // ground floor ceiling (facing down) and the floor slab edge at the stair
  hpoly(m.wall, innerOutline(), [stairHole], LV.ceil0, false);

  // ---- lining of the outer walls (inside faces), shared up to each face's share height ----
  for (const def of faceDefs("saltak")) {
    if (!def.heated) continue;
    const holes = [...openingHoles(def.id, "saltak")];
    panelZone(m.wall, { ...def, top: () => INF }, holes, LV.ff0, LV.ceil0, t, null, { a0: def.heated[0], a1: def.heated[1], flip: true });
    panelZone(m.wall, { ...def, top: () => INF }, holes, yUp, Math.min(def.share, yCut + 0.4), t, null, { a0: def.heated[0], a1: def.heated[1], flip: true });
  }
  for (const roof of ROOFS) {
    const g = layer.group(`interior_vegger__${roof}`, { roof });
    const mb = g.mb("interior_wall", `interior_vegger__${roof}`);
    for (const def of faceDefs(roof)) {
      if (!def.heated) continue;
      const holes = [...openingHoles(def.id, roof)];
      const lim = def.share < yCut + 0.4 ? yCut + 0.4 : def.share;
      if (def.share >= lim) continue;
      panelZone(mb, { ...def, top: () => yCut + 0.4 }, holes, def.share, INF, t, null, { a0: def.heated[0], a1: def.heated[1], flip: true });
    }
  }

  // ---- partitions ----
  // ground floor: north rooms (bedroom 4, bath 2, hall), kitchen along the north-east
  const g0 = LV.ff0;
  const gTop = LV.ceil0;
  partition(m.wall, m.cut, -INX, -1.0, -0.4, -1.0, g0, gTop, [[1.0, 1.9], [5.0, 5.9]]);
  partition(m.wall, m.cut, -4.4, -IN, -4.4, -1.0, g0, gTop);
  partition(m.wall, m.cut, -2.9, -IN, -2.9, -1.0, g0, gTop);
  partition(m.wall, m.cut, -INX, 0.3, -3.6, 0.3, g0, gTop, [[2.6, 3.5]]);
  // upper floor (cut at +2.50, ink tops)
  partition(m.wall, m.cut, -3.0, -IN, -3.0, R2.z0 - t, yUp, yCut, [[3.2, 4.1]]);
  partition(m.wall, m.cut, -3.0, -0.9, R1IN, -0.9, yUp, yCut, [[0.6, 1.4], [2.9, 3.7], [4.95, 5.75], [7.0, 7.8]]);
  partition(m.wall, m.cut, -0.4, -IN, -0.4, -0.9, yUp, yCut);
  partition(m.wall, m.cut, 1.2, -IN, 1.2, -0.9, yUp, yCut);
  partition(m.wall, m.cut, 3.6, -IN, 3.6, -0.9, yUp, yCut);
  // wardrobe wall in the main bedroom
  shelf(m, -5.25, yUp, -IN + 0.32, 0, { w: 3.6, h: 2.4, d: 0.6, books: false });

  // ---- stair (oak treads, glass balustrade) ----
  const rise = yUp / STAIR.steps;
  const run = (STAIR.x1 - STAIR.x0 - 0.2) / STAIR.steps;
  for (let i = 0; i < STAIR.steps; i++) {
    const x = STAIR.x1 - 0.1 - (i + 1) * run;
    m.wood.aabb(V(x, rise * (i + 1) - 0.04, STAIR.z0 + 0.05), V(x + run + 0.03, rise * (i + 1), STAIR.z1 - 0.05));
  }
  m.frame.face([V(STAIR.x0 + 0.1, 0.05, STAIR.z0 + 0.04), V(STAIR.x1 - 0.1, yUp - 0.3, STAIR.z0 + 0.04), V(STAIR.x1 - 0.1, yUp - 0.05, STAIR.z0 + 0.04), V(STAIR.x0 + 0.1, 0.3, STAIR.z0 + 0.04)], V(1, 1, 0), null);
  m.glass.aabb(V(STAIR.x0, yUp, STAIR.z1 - 0.01), V(STAIR.x1, yUp + 1.0, STAIR.z1 + 0.01));
  m.glass.aabb(V(STAIR.x0, yUp, STAIR.z0 - 0.01), V(STAIR.x0 + 0.02, yUp + 1.0, STAIR.z1));

  // ---- upper floor furniture ----
  // main bedroom
  bed(m, -5.3, yUp, -1.1, 0, { w: 1.8 });
  for (const sx of [-1, 1]) table(m, -5.3 + sx * 1.2, yUp, -2.1, 0, { w: 0.45, d: 0.4, h: 0.5, top: "wood", leg: "wood" });
  rug(m, -5.3, yUp, -0.4, 2.6, 1.8, 0, "linen");
  // bathroom: tub, double vanity, walk-in shower
  hpoly(m.tile, [[-3.0 + 0.05, -IN], [-0.45, -IN], [-0.45, -0.95], [-3.0 + 0.05, -0.95]], [], yUp + 0.004, true);
  bathtub(m, -2.0, yUp, -1.55, 0);
  table(m, -1.7, yUp, -IN + 0.3, 0, { w: 1.4, d: 0.5, h: 0.86, top: "wood", leg: "wood" });
  for (const sx of [-0.33, 0.33]) placer(-1.7 + sx, yUp, -IN + 0.3, 0).cyl(m.sanitary, 0, 0, 0.86, 0.98, 0.17, 0.2, 12);
  m.glass.aabb(V(-0.95, yUp, -IN), V(-0.94, yUp + 2.0, -1.9));
  // bedrooms 2 and 3
  bed(m, 2.4, yUp, -2.4, Math.PI / 2, { w: 1.2 });
  table(m, 1.75, yUp, -1.35, 0, { w: 1.0, d: 0.5, h: 0.74, top: "wood", leg: "frame" });
  bed(m, 4.6, yUp, -2.4, -Math.PI / 2, { w: 1.2 });
  shelf(m, 4.5, yUp, -1.15, Math.PI, { w: 1.6, h: 1.8, d: 0.32 });
  // allrom: dining table for six behind U4, bookshelf behind the charcoal panel,
  // armchair + floor lamp at U2, sofa + rug + coffee table facing E2
  table(m, 2.85, yUp, 2.0, 0, { w: 2.0, d: 0.9, h: 0.74, top: "wood", leg: "wood" });
  for (const [dx, dz, r] of [
    [-0.55, -0.7, 0],
    [0.55, -0.7, 0],
    [-0.55, 0.7, Math.PI],
    [0.55, 0.7, Math.PI],
    [-1.25, 0, -Math.PI / 2],
    [1.25, 0, Math.PI / 2],
  ]) {
    chair(m, 2.85 + dx, yUp, 2.0 + dz, r, { seat: "wood", frame: "wood" });
  }
  pendant(m, 2.55, yUp + 2.75, 2.0, { drop: 0.95 });
  pendant(m, 3.15, yUp + 2.75, 2.0, { drop: 0.95 });
  shelf(m, -0.05, yUp, IN - 0.2, Math.PI, { w: 1.8, h: 2.2, d: 0.32 });
  sofa(m, -1.55, yUp, IN - 0.75, Math.PI, { seats: 1, frame: "textile", cushion: "linen" });
  floorLamp(m, -2.35, yUp, IN - 0.4);
  sofa(m, 4.4, yUp, 0.65, -Math.PI / 2, { seats: 3, frame: "textile", cushion: "textile" });
  rug(m, 3.35, yUp, 0.8, 2.2, 1.8, 0, "linen");
  table(m, 3.3, yUp, 0.8, 0, { w: 1.0, d: 0.6, h: 0.38, top: "wood", leg: "frame" });

  // ---- ground floor (what shows through the glass) ----
  sofa(m, 0.85, 0, 1.2, Math.PI, { seats: 3, frame: "textile", cushion: "linen" });
  rug(m, 0.85, 0, 2.15, 3.0, 2.0, 0, "linen");
  table(m, 0.85, 0, 2.3, 0, { w: 1.1, d: 0.6, h: 0.38, top: "wood", leg: "frame" });
  floorLamp(m, -0.6, 0, 1.0);
  kitchen(m, 4.2, 0, -IN + 0.32, 0, { len: 3.4 });
  island(m, 4.05, 0, -0.1, 0, { len: 2.4 });
  for (const x of [3.5, 4.6]) pendant(m, x, LV.ceil0, -0.1, { drop: 0.85, r: 0.15 });
  table(m, -1.6, 0, 2.6, Math.PI / 2, { w: 1.6, d: 0.9, h: 0.74, top: "wood", leg: "frame" });
  for (const dz of [-0.45, 0.45]) {
    chair(m, -2.15, 0, 2.6 + dz, -Math.PI / 2, { seat: "frame", frame: "frame" });
    chair(m, -1.05, 0, 2.6 + dz, Math.PI / 2, { seat: "frame", frame: "frame" });
  }
  sofa(m, -5.2, 0, -0.1, 0, { seats: 3, frame: "textile", cushion: "textile" });
  rug(m, -5.2, 0, 0.9, 2.8, 1.8, 0, "linen");
  bed(m, -6.0, 0, -2.4, Math.PI / 2, { w: 1.4 });
  // plants (indoor)
  const potAt = (x, y, z, r = 0.22) => {
    const pl = placer(x, y, z, 0);
    pl.cyl(m.pot, 0, 0, 0, 0.45, r * 0.8, r, 10);
    pl.sphere(m.plant, 0, 0.45 + r * 1.2, 0, r * 1.2, r * 1.6, r * 1.2, null, 7);
  };
  potAt(5.2, yUp, 3.2);
  potAt(-2.5, 0, 3.2);
  potAt(5.3, 0, 2.9);
  void HX;
  void HZ;
  void R1;
  void openings;
  void FRAMES;
  void Q;
}
