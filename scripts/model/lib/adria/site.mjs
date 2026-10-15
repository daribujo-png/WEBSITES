/**
 * Tomt, grunnarbeid and fundament for Adria on a flat site (no blasted rock).
 *
 *   layer_tomt         fx_site (ink site-plan lines, LINES + _ORDER), corner pegs
 *                      and strings (tomt_stikning), the ground plug over the
 *                      future dig (tomt_mark)
 *   layer_grunnarbeid  a shallow, tidy dig with a gravel bed (grunnarbeid_grop)
 *   layer_fundament    ringmur, slab with EPS edge, radon membrane edge, plinth,
 *                      backfill with a drain-gravel strip
 */
import * as THREE from "three";
import { V, col } from "../builder.mjs";
import { HX, HZ, LV } from "./spec.mjs";
import { PIT, lawnColor, terrainHeight } from "./env.mjs";
import { buildPlinth } from "./shell.mjs";

const INK = col("#161c1e");

/** Ground-following quad grid over a rectangle with a rectangular hole, at terrain height (+lift). */
function groundRing(mb, outer, hole, cell, colorFn, lift = 0) {
  const xs = [];
  for (let x = outer.x0; x <= outer.x1 + 1e-6; x += cell) xs.push(+x.toFixed(4));
  for (const x of [hole?.x0, hole?.x1]) if (x !== undefined && !xs.some((q) => Math.abs(q - x) < 1e-4)) xs.push(x);
  xs.sort((a, b) => a - b);
  const zs = [];
  for (let z = outer.z0; z <= outer.z1 + 1e-6; z += cell) zs.push(+z.toFixed(4));
  for (const z of [hole?.z0, hole?.z1]) if (z !== undefined && !zs.some((q) => Math.abs(q - z) < 1e-4)) zs.push(z);
  zs.sort((a, b) => a - b);
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < zs.length - 1; j++) {
      const cx = (xs[i] + xs[i + 1]) / 2;
      const cz = (zs[j] + zs[j + 1]) / 2;
      if (hole && cx > hole.x0 && cx < hole.x1 && cz > hole.z0 && cz < hole.z1) continue;
      const P = (x, z) => V(x, terrainHeight(x, z) + lift, z);
      const q = [P(xs[i], zs[j]), P(xs[i + 1], zs[j]), P(xs[i + 1], zs[j + 1]), P(xs[i], zs[j + 1])];
      const c = colorFn(cx, cz);
      mb.face(q, q[0].clone().setY(q[0].y - 1), c);
    }
  }
}

/* --------------------------------------------------------------------------------------------- */
/* Tomt                                                                                           */
/* --------------------------------------------------------------------------------------------- */

/** Plot boundary (our illustration: a narrow plot, Adria "passer godt på smale tomter"). */
export const PLOT = { x0: -16, x1: 22, z0: -14, z1: 26 };

export function buildTomt(layer) {
  // ink site plan as lines (drawn on in the timelapse; _ORDER 0…1)
  const sp = layer.group("tomt_situasjonsplan", { hideFrom: "bindingsverk", note: "fx_site: ink site-plan lines (glTF LINES, _ORDER 0…1)" });
  const ln = sp.mb("line_ink", "fx_site");
  const y = (x, z) => terrainHeight(x, z) + 0.03;
  let order = 0;
  const N = 6;
  const line = (a, b, o0, o1) => ln.seg(V(a[0], y(...a), a[1]), V(b[0], y(...b), b[1]), INK, { _ORDER: [o0, o1] });
  const poly = (pts, o0, o1, { closed = true, dash = null } = {}) => {
    const segs = [];
    for (let i = 0; i < pts.length - (closed ? 0 : 1); i++) segs.push([pts[i], pts[(i + 1) % pts.length]]);
    const total = segs.reduce((s, [a, b]) => s + Math.hypot(b[0] - a[0], b[1] - a[1]), 0);
    let acc = 0;
    for (const [a, b] of segs) {
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const n = dash ? Math.max(1, Math.floor(len / dash)) : Math.max(1, Math.ceil(len / 2));
      for (let k = 0; k < n; k++) {
        if (dash && k % 2) continue;
        const t0 = k / n;
        const t1 = (k + 1) / n;
        const p0 = [a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0];
        const p1 = [a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1];
        line(p0, p1, o0 + (o1 - o0) * ((acc + len * t0) / total), o0 + (o1 - o0) * ((acc + len * t1) / total));
      }
      acc += len;
    }
  };
  const P = PLOT;
  // plot boundary (0–0.3), setback line 4 m inside (dashed, 0.3–0.5), footprint (0.5–0.8), terraces (0.8–1)
  poly([[P.x0, P.z0], [P.x1, P.z0], [P.x1, P.z1], [P.x0, P.z1]], 0, 0.3);
  poly([[P.x0 + 4, P.z0 + 4], [P.x1 - 4, P.z0 + 4], [P.x1 - 4, P.z1 - 4], [P.x0 + 4, P.z1 - 4]], 0.3, 0.5, { dash: 0.6 });
  poly([[-HX, -HZ], [HX, -HZ], [HX, HZ], [-HX, HZ]], 0.5, 0.8);
  poly([[-HX, HZ], [-HX, 7.4], [13.5, 7.4], [13.5, -4.5], [HX, -4.5]], 0.8, 0.95, { closed: false, dash: 0.4 });
  // dimension ticks on the long side
  line([-HX, HZ + 1.6], [HX, HZ + 1.6], 0.95, 1.0);
  for (const x of [-HX, HX]) line([x, HZ + 1.3], [x, HZ + 1.9], 0.97, 1.0);
  void order;
  void N;

  // corner pegs and strings
  const st = layer.group("tomt_stikning", { hideFrom: "fundament" });
  const peg = st.mb("stake_wood", "tomt_stikning_plugg");
  const mark = st.mb("stake_mark", "tomt_stikning_merke");
  const strings = st.mb("line_ink", "tomt_stikning_snor");
  const corners = [[-HX - 1.2, -HZ - 1.2], [HX + 1.2, -HZ - 1.2], [HX + 1.2, HZ + 1.2], [-HX - 1.2, HZ + 1.2]];
  for (const [x, z] of corners) {
    const g = terrainHeight(x, z);
    peg.aabb(V(x - 0.03, g - 0.1, z - 0.03), V(x + 0.03, g + 0.75, z + 0.03));
    mark.aabb(V(x - 0.032, g + 0.62, z - 0.032), V(x + 0.032, g + 0.75, z + 0.032));
  }
  for (const [x, z] of [[-HX, -HZ], [HX, -HZ], [HX, HZ], [-HX, HZ]]) {
    const g = terrainHeight(x, z);
    peg.aabb(V(x - 0.025, g - 0.1, z - 0.025), V(x + 0.025, g + 0.45, z + 0.025));
  }
  const yS = (x, z) => terrainHeight(x, z) + 0.42;
  for (const x of [-HX, HX]) strings.seg(V(x, yS(x, -HZ - 1.2), -HZ - 1.2), V(x, yS(x, HZ + 1.2), HZ + 1.2), INK, { _ORDER: [0.5, 0.8] });
  for (const z of [-HZ, HZ]) strings.seg(V(-HX - 1.2, yS(-HX, z), z), V(HX + 1.2, yS(HX, z), z), INK, { _ORDER: [0.5, 0.8] });

  // ground plug over the future dig (hidden from grunnarbeid on)
  const mk = layer.group("tomt_mark", { hideFrom: "grunnarbeid" });
  groundRing(mk.mb("terrain", "tomt_mark_gress"), PIT, null, 1.0, lawnColor);
}

/* --------------------------------------------------------------------------------------------- */
/* Grunnarbeid                                                                                    */
/* --------------------------------------------------------------------------------------------- */

const PIT_BOTTOM = -0.9;

export function buildGrunnarbeid(layer) {
  const g = layer.group("grunnarbeid_grop", { hideFrom: "fundament", note: "flat site: a shallow, tidy dig with a gravel bed, no blasted rock" });
  const earth = g.mb("earth", "grunnarbeid_jord");
  const gravel = g.mb("gravel", "grunnarbeid_pukk");
  // battered pit walls from the hole edge down to the bottom (1:1 slope)
  const inset = PIT_BOTTOM - LV.terrain; // negative
  const b = { x0: PIT.x0 - inset * 0.8, x1: PIT.x1 + inset * 0.8, z0: PIT.z0 - inset * 0.8, z1: PIT.z1 + inset * 0.8 };
  const top = (x, z) => V(x, terrainHeight(x, z), z);
  const bot = (x, z) => V(x, PIT_BOTTOM, z);
  const c0 = [[PIT.x0, PIT.z0], [PIT.x1, PIT.z0], [PIT.x1, PIT.z1], [PIT.x0, PIT.z1]];
  const c1 = [[b.x0, b.z0], [b.x1, b.z0], [b.x1, b.z1], [b.x0, b.z1]];
  const steps = 10;
  for (let i = 0; i < 4; i++) {
    const [ax, az] = c0[i];
    const [bx, bz] = c0[(i + 1) % 4];
    const [cx, cz] = c1[(i + 1) % 4];
    const [dx, dz] = c1[i];
    for (let k = 0; k < steps; k++) {
      const t0 = k / steps;
      const t1 = (k + 1) / steps;
      const L = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
      const a0 = L([ax, az], [bx, bz], t0);
      const a1 = L([ax, az], [bx, bz], t1);
      const d0 = L([dx, dz], [cx, cz], t0);
      const d1 = L([dx, dz], [cx, cz], t1);
      earth.face([top(...a0), top(...a1), bot(...d1), bot(...d0)], V(0, 5, 0), col("#7a6a55").multiplyScalar(0.9 + 0.15 * ((k * 7 + i * 3) % 5) / 5));
    }
  }
  // gravel bed over the bottom
  gravel.face([bot(b.x0, b.z0), bot(b.x1, b.z0), bot(b.x1, b.z1), bot(b.x0, b.z1)], V(0, -10, 0), col("#a8a297"));
  // a low spoil heap of topsoil at the north-west, outside the pit
  const heap = new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  earth.geometry(heap, new THREE.Matrix4().compose(V(-13, terrainHeight(-13, -8) - 0.05, -8), new THREE.Quaternion(), V(2.6, 0.9, 1.8)), col("#6b5c4a"), { flat: true });
  heap.dispose();
}

/* --------------------------------------------------------------------------------------------- */
/* Fundament                                                                                      */
/* --------------------------------------------------------------------------------------------- */

export function buildFundament(layer) {
  const conc = layer.mb("concrete", "fundament_ringmur");
  const eps = layer.mb("eps", "fundament_isolasjon");
  const radon = layer.mb("radon_membrane", "fundament_radonsperre");
  const t = 0.25;
  const yb = PIT_BOTTOM + 0.15;
  const yt = LV.slabTop - 0.02;
  // ringmur: four walls just inside the cladding line
  const o = 0.06;
  conc.aabb(V(-HX + o, yb, -HZ + o), V(HX - o, yt, -HZ + o + t));
  conc.aabb(V(-HX + o, yb, HZ - o - t), V(HX - o, yt, HZ - o));
  conc.aabb(V(-HX + o, yb, -HZ + o + t), V(-HX + o + t, yt, HZ - o - t));
  conc.aabb(V(HX - o - t, yb, -HZ + o + t), V(HX - o, yt, HZ - o - t));
  // foundation footing
  conc.aabb(V(-HX - 0.1, PIT_BOTTOM, -HZ - 0.1), V(HX + 0.1, yb, -HZ + 0.5));
  conc.aabb(V(-HX - 0.1, PIT_BOTTOM, HZ - 0.5), V(HX + 0.1, yb, HZ + 0.1));
  conc.aabb(V(-HX - 0.1, PIT_BOTTOM, -HZ + 0.5), V(-HX + 0.5, yb, HZ - 0.5));
  conc.aabb(V(HX - 0.5, PIT_BOTTOM, -HZ + 0.5), V(HX + 0.1, yb, HZ - 0.5));
  // slab (top −0.10) with EPS under and a radon membrane lapped over the ringmur edge
  const x0 = -HX + o + t;
  const x1 = HX - o - t;
  const z0 = -HZ + o + t;
  const z1 = HZ - o - t;
  eps.aabb(V(x0, LV.slabTop - 0.4, z0), V(x1, LV.slabTop - 0.12, z1));
  radon.aabb(V(-HX + o - 0.01, LV.slabTop - 0.125, -HZ + o - 0.01), V(HX - o + 0.01, LV.slabTop - 0.1, HZ - o + 0.01));
  conc.aabb(V(x0, LV.slabTop - 0.1, z0), V(x1, LV.slabTop, z1));
  // EPS edge insulation outside the ringmur
  eps.aabb(V(-HX + o - 0.1, yb, -HZ + o - 0.1), V(HX - o + 0.1, LV.plinthBottom, -HZ + o));
  eps.aabb(V(-HX + o - 0.1, yb, HZ - o), V(HX - o + 0.1, LV.plinthBottom, HZ - o + 0.1));
  // backfill around the house, at terrain height, with a drain-gravel strip along the plinth
  const fill = layer.group("fundament_tilbakefylling");
  const gm = fill.mb("terrain", "fundament_tilbakefylling");
  groundRing(gm, PIT, { x0: -HX, x1: HX, z0: -HZ, z1: HZ }, 0.5, (x, z) => {
    const d = Math.max(Math.abs(x) - HX, Math.abs(z) - HZ);
    return d < 0.45 ? col("#8f8a80") : lawnColor(x, z);
  });
  buildPlinth(layer);
}
