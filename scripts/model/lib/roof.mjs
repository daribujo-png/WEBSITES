/**
 * Roof: rafters (sperretak) with ridge beam, hip/valley rafters along the
 * mitred joint and collar ties; deck; dark standing-seam metal with seams,
 * ridge cap, flashings, gutters, downpipes and snow guards. Fascia and
 * barge boards go to the cladding layer.
 */
import * as THREE from "three";
import { col, rng } from "./builder.mjs";
import {
  BEND,
  CLAD_OUT,
  EAVE_OVERHANG,
  HW,
  RAFTER_VD,
  ROOF_BUILDUP,
  T,
  VERGE_OVERHANG,
  W,
  WINGS,
  Y,
  rafterTop,
  roofTop,
} from "./house-spec.mjs";

const r = rng(9);
const E = HW + EAVE_OVERHANG;

/** Sloped slab over a wing-side region (u from mitre to uEnd, v from 0 to s·vEnd). */
function roofSlab(mb, wing, s, vEnd, uEnd, off0, off1, color, { v0 = 0 } = {}) {
  const corners = [
    [T * s * v0, s * v0],
    [uEnd, s * v0],
    [uEnd, s * vEnd],
    [T * s * vEnd, s * vEnd],
  ];
  const h = (v) => rafterTop(Math.abs(v));
  const bot = corners.map(([u, v]) => W(wing, u, v, h(v) + off0));
  const top = corners.map(([u, v]) => W(wing, u, v, h(v) + off1));
  mb.hexa([...bot, ...top], color);
}

/** A bar following the slope in v at fixed u (seams, rafters). */
function slopeBar(mb, wing, u0, u1, va, vb, yOff0, yOff1, color, base = rafterTop) {
  const h = (v) => base(Math.abs(v));
  const c = [
    W(wing, u0, va, h(va) + yOff0),
    W(wing, u1, va, h(va) + yOff0),
    W(wing, u1, vb, h(vb) + yOff0),
    W(wing, u0, vb, h(vb) + yOff0),
    W(wing, u0, va, h(va) + yOff1),
    W(wing, u1, va, h(va) + yOff1),
    W(wing, u1, vb, h(vb) + yOff1),
    W(wing, u0, vb, h(vb) + yOff1),
  ];
  mb.hexa(c, color);
}

/** Valid v-interval on side s for a bar spanning u0..u1 (mitre clip). */
function vRange(s, u0, vMax) {
  // need u0 ≥ T·v
  if (s > 0) {
    const lim = u0 / T;
    const hi = Math.min(vMax, lim);
    return hi > 0.02 ? [0, hi] : null;
  }
  // s < 0: T·v ≤ u0 ⇔ v ≥ u0/T  (v negative)
  const lim = u0 / T; // negative when u0 < 0
  const lo = Math.max(-vMax, Math.min(0, lim));
  return lo < -0.02 ? [lo, 0] : null;
}

export function buildRoof(layer, cladLayer) {
  const mbFrame = layer.mb("frame_wood", "tak_takstoler");
  const mbGlulam = layer.mb("glulam", "tak_takstoler_limtre");
  const mbDeck = layer.mb("roof_deck", "tak_undertak");
  const mbMetal = layer.mb("roof_metal", "tak_tekking");
  const mbFascia = cladLayer.mb("cladding_wood", "kledning_vindski");
  const raft = () => {
    const c = col("#d6be92");
    c.multiplyScalar(0.93 + r() * 0.14);
    return c;
  };

  for (const wid of ["A", "B"]) {
    const wing = WINGS[wid];
    const uEnd = wing.L + VERGE_OVERHANG;
    // rafters
    const us = [];
    for (let u = 0.3; u < wing.L - 0.05; u += 0.6) us.push(u);
    us.push(wing.L - 0.024);
    us.push(wing.L + VERGE_OVERHANG - 0.06); // verge rafter carried by outlookers
    us.forEach((u, idx) => {
      for (const s of [1, -1]) {
        const vr = vRange(s, u - 0.024, E - 0.04);
        if (!vr) continue;
        const [va, vb] = vr;
        slopeBar(mbFrame, wing, u - 0.024, u + 0.024, va, vb, -RAFTER_VD, 0, raft());
      }
      // collar ties on every other rafter (inside the walls only)
      if (idx % 2 === 0 && u < wing.L - 0.1 && u > 0.2) {
        const a = 1.45;
        mbFrame.hexa(
          [
            W(wing, u + 0.024, -a, Y.collar),
            W(wing, u + 0.072, -a, Y.collar),
            W(wing, u + 0.072, a, Y.collar),
            W(wing, u + 0.024, a, Y.collar),
            W(wing, u + 0.024, -a, Y.collar + 0.198),
            W(wing, u + 0.072, -a, Y.collar + 0.198),
            W(wing, u + 0.072, a, Y.collar + 0.198),
            W(wing, u + 0.024, a, Y.collar + 0.198),
          ],
          raft(),
        );
      }
    });
    // ridge beam (mitred start)
    const rb = 0.045;
    const ry0 = rafterTop(0) - RAFTER_VD - 0.32;
    const ry1 = rafterTop(rb) - RAFTER_VD + 0.02;
    mbGlulam.hexa(
      [
        W(wing, T * -rb, -rb, ry0),
        W(wing, uEnd - 0.04, -rb, ry0),
        W(wing, uEnd - 0.04, rb, ry0),
        W(wing, T * rb, rb, ry0),
        W(wing, T * -rb, -rb, ry1),
        W(wing, uEnd - 0.04, -rb, ry1),
        W(wing, uEnd - 0.04, rb, ry1),
        W(wing, T * rb, rb, ry1),
      ],
      null,
    );
    // gable-end ridge beam support post (inside the gable)
    // deck + metal, seams, ridge cap, flashings
    for (const s of [1, -1]) {
      roofSlab(mbDeck, wing, s, E, uEnd, 0.012, 0.035, null);
      roofSlab(mbMetal, wing, s, E, uEnd, 0.035, ROOF_BUILDUP, null);
      // standing seams every 0.55 m
      const seamStart = s > 0 ? 0.18 : -T * E + 0.12;
      for (let u = seamStart; u < uEnd - 0.08; u += 0.55) {
        if (s > 0 && u < 0.05) continue;
        const vr = vRange(s, u - 0.012, E - 0.01);
        if (!vr) continue;
        const [va, vb] = vr;
        slopeBar(mbMetal, wing, u - 0.011, u + 0.011, va, vb, ROOF_BUILDUP - 0.002, ROOF_BUILDUP + 0.038, null);
      }
      // verge flashing
      slopeBar(mbMetal, wing, uEnd - 0.012, uEnd + 0.018, 0, s * E, 0.0, ROOF_BUILDUP + 0.03, null);
      // gutter along the eave
      const gy = roofTop(E) - 0.05;
      const gv0 = s * (E + 0.0);
      const gv1 = s * (E + 0.13);
      const uStart = T * gv1;
      mbMetal.hexa(
        [
          W(wing, Math.min(T * gv0, uStart), gv0, gy - 0.1),
          W(wing, uEnd + 0.02, gv0, gy - 0.1),
          W(wing, uEnd + 0.02, gv1, gy - 0.1),
          W(wing, uStart, gv1, gy - 0.1),
          W(wing, Math.min(T * gv0, uStart), gv0, gy),
          W(wing, uEnd + 0.02, gv0, gy),
          W(wing, uEnd + 0.02, gv1, gy),
          W(wing, uStart, gv1, gy),
        ],
        null,
      );
      // downpipe at the outer end of each eave
      const dpU = wing.L - 0.35;
      const vOut = s * (E + 0.065);
      const vWall = s * (HW + CLAD_OUT + 0.06);
      mbMetal.tube(
        [W(wing, dpU, vOut, gy - 0.08), W(wing, dpU, vOut, gy - 0.3), W(wing, dpU, vWall, gy - 0.65), W(wing, dpU, vWall, 0.12)],
        0.04,
        8,
        null,
      );
      // snow guards: two tubes ~0.5 m up from the wall line
      const sgv = s * (HW - 0.15);
      const sgStart = s > 0 ? T * sgv + 0.15 : 0.15;
      for (const dy of [0.05, 0.11]) {
        mbMetal.tube([W(wing, sgStart, sgv, roofTop(Math.abs(sgv)) + dy), W(wing, uEnd - 0.15, sgv, roofTop(Math.abs(sgv)) + dy)], 0.014, 6, null, {
          caps: false,
        });
      }
      for (let u = sgStart + 0.1; u < uEnd - 0.15; u += 1.0) {
        slopeBar(mbMetal, wing, u - 0.01, u + 0.01, sgv - s * 0.04, sgv + s * 0.03, ROOF_BUILDUP, ROOF_BUILDUP + 0.13, null);
      }
      // fascia board along the eave (wood) and barge board at the verge
      const fv0 = s * (E - 0.025);
      const fv1 = s * E;
      mbFascia.hexa(
        [
          W(wing, T * fv0, fv0, rafterTop(E) - 0.2),
          W(wing, uEnd, fv0, rafterTop(E) - 0.2),
          W(wing, uEnd, fv1, rafterTop(E) - 0.2),
          W(wing, T * fv1, fv1, rafterTop(E) - 0.2),
          W(wing, T * fv0, fv0, rafterTop(E) + 0.035),
          W(wing, uEnd, fv0, rafterTop(E) + 0.035),
          W(wing, uEnd, fv1, rafterTop(E) + 0.035),
          W(wing, T * fv1, fv1, rafterTop(E) + 0.035),
        ],
        col("#c6b08a"),
      );
      slopeBar(mbFascia, wing, uEnd - 0.03, uEnd, 0, s * E, -0.2, 0.035, col("#c9b38c"));
    }
    // ridge cap
    const rc = 0.14;
    const capTop = roofTop(0) + 0.05;
    mbMetal.hexa(
      [
        W(wing, T * -rc, -rc, roofTop(rc) + 0.01),
        W(wing, uEnd + 0.02, -rc, roofTop(rc) + 0.01),
        W(wing, uEnd + 0.02, rc, roofTop(rc) + 0.01),
        W(wing, T * rc, rc, roofTop(rc) + 0.01),
        W(wing, 0, -0.03, capTop),
        W(wing, uEnd + 0.02, -0.03, capTop),
        W(wing, uEnd + 0.02, 0.03, capTop),
        W(wing, 0, 0.03, capTop),
      ],
      null,
    );
  }

  // hip (north, convex) and valley (south, concave) along the mitre
  const A = WINGS.A;
  const m = new THREE.Vector3(Math.cos(BEND / 2), 0, Math.sin(BEND / 2));
  for (const s of [1, -1]) {
    const pa = W(A, 0, 0, 0);
    const pb = W(A, T * s * (E - 0.02), s * (E - 0.02), 0);
    const ya = rafterTop(0);
    const yb = rafterTop(E - 0.02);
    const off = (p, k, y) => new THREE.Vector3(p.x + m.x * k, y, p.z + m.z * k);
    const w = 0.06;
    mbGlulam.hexa(
      [
        off(pa, -w, ya - 0.34),
        off(pb, -w, yb - 0.34),
        off(pb, w, yb - 0.34),
        off(pa, w, ya - 0.34),
        off(pa, -w, ya - 0.01),
        off(pb, -w, yb - 0.01),
        off(pb, w, yb - 0.01),
        off(pa, w, ya - 0.01),
      ],
      null,
    );
    // flashing strip on top
    const pb2 = W(A, T * s * E, s * E, 0);
    const yt0 = roofTop(0) + 0.004;
    const yt1 = roofTop(E) + 0.004;
    const fw = 0.16;
    mbMetal.hexa(
      [
        off(pa, -fw, yt0),
        off(pb2, -fw, yt1),
        off(pb2, fw, yt1),
        off(pa, fw, yt0),
        off(pa, -fw, yt0 + 0.018),
        off(pb2, -fw, yt1 + 0.018),
        off(pb2, fw, yt1 + 0.018),
        off(pa, fw, yt0 + 0.018),
      ],
      null,
    );
  }
}

export const ROOF_E = E;
