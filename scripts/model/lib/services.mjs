/**
 * Installations (el + VVS as thin glowing runs) and the finished state
 * (terrace, lamps, path, planting and a few pieces of furniture).
 */
import * as THREE from "three";
import { V, col, rng } from "./builder.mjs";
import {
  BATH,
  CLAD_OUT,
  HW,
  NICHE,
  STAIR,
  STUD_D,
  T,
  TERRACE,
  W,
  WINGS,
  WP,
  Y,
  roofTop,
} from "./house-spec.mjs";
import { canopy } from "./env.mjs";
import { cullBuried, cullOccluded } from "./builder.mjs";
import { shadowLightDirections } from "./cameras.mjs";
import { Q } from "./quality.mjs";
import { terrainHeight } from "./env.mjs";
import { wbox } from "./interior.mjs";

const IN = HW - STUD_D;
const A = WINGS.A;
const B = WINGS.B;
const pA = (u, v, y) => W(A, u, v, y);
const pB = (u, v, y) => W(B, u, v, y);

export function buildInstallations(layer) {
  const el = layer.mb("el_line", "installasjoner_el");
  const vvs = layer.mb("vvs_line", "installasjoner_vvs");
  const R = 0.014;
  const run = (mb, pts, r = R) => mb.tube(pts, r, Q().tubeRadial, null);

  /* ---- el ---- */
  // fuse box (sikringsskap) inside the north wall of wing A, by the entry
  const fb = { u0: 2.62, u1: 3.0, v0: -IN + 0.02, v1: -IN + 0.16 };
  wbox(el, A, fb.u0, fb.u1, fb.v0, fb.v1, 1.25, 1.95, null);
  const fbTop = pA(2.81, -IN + 0.09, 1.95);
  const fbBot = pA(2.81, -IN + 0.09, 1.25);
  // risers: down to the outlet ring, up to the ceiling and on to the 2. etasje
  const vIn = IN + 0.06; // inside the stud zone
  const yOut1 = Y.ff1 + 0.3;
  const yOut2 = Y.ff2 + 0.3;
  const yCeil1 = Y.top1 + 0.12;
  run(el, [fbBot, pA(2.81, -vIn, 1.25), pA(2.81, -vIn, yOut1)]);
  run(el, [fbTop, pA(2.81, -vIn, 1.95), pA(2.81, -vIn, yCeil1)]);
  run(el, [pA(2.95, -vIn, 1.95), pA(2.95, -vIn, yOut2)]);
  // outlet rings along the outer walls (both floors)
  for (const [y, floor] of [
    [yOut1, 1],
    [yOut2, 2],
  ]) {
    for (const wing of [A, B]) {
      const p = (u, v) => W(wing, u, v, y);
      const uS = T * vIn + 0.05;
      const uN = -T * vIn + 0.05;
      const uE = wing.L - STUD_D - 0.06;
      run(el, [p(uS, vIn), p(uE, vIn), p(uE, -vIn), p(Math.max(uN, 0.05), -vIn)]);
      // outlets (small boxes) every ~1.8 m
      for (let u = 0.8; u < uE; u += 1.8) {
        for (const s of [1, -1]) {
          const c = W(wing, u, s * (IN - 0.02), y);
          el.aabb(V(c.x - 0.05, y - 0.05, c.z - 0.05), V(c.x + 0.05, y + 0.05, c.z + 0.05), null);
        }
      }
      void floor;
    }
  }
  // ceiling runs (in the joist zone) to light points, 1. etasje
  const lights1 = [pA(2.7, 0.8, yCeil1), pA(2.4, 2.7, yCeil1), pA(1.7, -2.1, yCeil1), pA(3.8, -3.1, yCeil1), pB(2.9, 1.4, yCeil1), pB(3.4, -2.2, yCeil1), pB(0.7, -1.0, yCeil1)];
  const hub1 = pA(2.81, -vIn, yCeil1);
  const hubMid = pA(1.2, -0.4, yCeil1);
  run(el, [hub1, pA(2.81, -0.4, yCeil1), hubMid]);
  for (const l of lights1) {
    run(el, [hubMid, V(l.x, yCeil1, hubMid.z), l]);
    el.aabb(V(l.x - 0.09, Y.top1 - 0.06, l.z - 0.09), V(l.x + 0.09, Y.top1 - 0.02, l.z + 0.09), null);
  }
  // 2. etasje: ridge run with drops to ceiling points
  const yRidge = Y.collar - 0.06;
  run(el, [pA(2.95, -vIn, yOut2), pA(2.95, -vIn, 5.2), pA(2.95, -1.6, Y.collar - 0.06), pA(2.95, 0, yRidge)]);
  run(el, [pA(4.1, 0, yRidge), pA(0, 0, yRidge), pB(4.0, 0, yRidge)]);
  for (const [w, u, v] of [
    [A, 2.9, 1.0],
    [A, 2.9, -1.0],
    [B, 3.0, 1.0],
    [B, 3.4, -1.2],
    [B, 0.6, -1.0],
  ]) {
    const l = W(w, u, v, Y.collar - 0.02);
    run(el, [W(w, u, 0, yRidge), l]);
    el.aabb(V(l.x - 0.08, Y.collar - 0.05, l.z - 0.08), V(l.x + 0.08, Y.collar - 0.01, l.z + 0.08), null);
  }
  // floor heating cable in the bathroom (serpentine)
  const fh = [];
  const yF = Y.ff2 - 0.006;
  let flip = false;
  for (let u = BATH.u0 + 0.2; u < BATH.u1 - 0.15; u += 0.18) {
    const vA = BATH.v0 + 0.15;
    const vB = BATH.v1 - 0.2;
    fh.push(pB(u, flip ? vB : vA, yF), pB(u, flip ? vA : vB, yF));
    flip = !flip;
  }
  run(el, fh, 0.008);
  // outdoor lamp feeds
  run(el, [pB(0.95, IN + 0.06, yOut1), pB(0.62, IN + 0.06, 2.3)]);

  /* ---- VVS ---- */
  const RS = 0.012;
  const RD = 0.045;
  // water heater under the stair (teknisk skap)
  const heater = pB(0.72, -3.25, Y.ff1);
  const heaterGeo = new THREE.CylinderGeometry(0.24, 0.24, 1.25, 16);
  vvs.geometry(heaterGeo, new THREE.Matrix4().makeTranslation(heater.x, Y.ff1 + 0.63, heater.z), null, { flat: false });
  heaterGeo.dispose();
  // water inlet from the north (under ground) to the heater
  const inlet = [pB(0.9, -9.5, -0.9), pB(0.9, -HW - 0.3, -0.9), pB(0.9, -3.25, -0.2), pB(0.9, -3.25, Y.ff1 + 0.15), heater.clone().setY(Y.ff1 + 0.15)];
  run(vvs, inlet, 0.02);
  // supply pairs (cold + hot) at floor level to kitchen, WC and up to the bathroom
  const yS = Y.slab - 0.05;
  for (const off of [-0.03, 0.03]) {
    // to the kitchen sink (wing A gable counter)
    run(vvs, [pB(0.72, -3.0 + off, Y.ff1 + 0.4), pB(0.72, -3.0 + off, yS), pA(0.0, -2.0 + off, yS), pA(2.9, -1.2 + off, yS), pA(4.05, 0.95 + off, yS), pA(4.05, 0.95 + off, Y.ff1 + 0.75)], RS);
    // to the WC
    run(vvs, [pA(2.9, -1.2 + off, yS), pA(3.95, -2.95 + off, yS), pA(3.95, -2.95 + off, Y.ff1 + 0.6)], RS);
    // riser to the bathroom
    run(vvs, [pB(0.72, -3.0 + off, yS), pB(2.45, -3.62 + off, yS), pB(2.45, -3.62 + off, Y.ff2 - 0.1), pB(3.9, -3.62 + off, Y.ff2 - 0.1), pB(3.9, -3.62 + off, Y.ff2 + 1.0)], RS);
    run(vvs, [pB(2.45, -3.62 + off, Y.ff2 - 0.1), pB(2.45, -1.95 + off, Y.ff2 - 0.1), pB(3.1, -1.95 + off, Y.ff2 - 0.1), pB(3.1, -1.95 + off, Y.ff2 + 0.6)], RS);
  }
  // drains: shower + basin + toilet to the stack, stack down and out, vent through the roof
  const stack = { u: 2.66, v: -3.55 };
  const yDr = Y.ff2 - 0.12;
  run(vvs, [pB(3.9, -3.3, Y.ff2 - 0.02), pB(3.9, -3.3, yDr), pB(stack.u, stack.v, yDr)], RD * 0.75);
  run(vvs, [pB(3.0, -2.1, Y.ff2 + 0.5), pB(3.0, -2.1, yDr), pB(stack.u, stack.v, yDr)], RD * 0.6);
  run(vvs, [pB(2.75, -2.9, Y.ff2 + 0.3), pB(2.75, -2.9, yDr), pB(stack.u, stack.v, yDr)], RD * 0.9);
  const ventTop = roofTop(Math.abs(stack.v)) + 0.45;
  run(vvs, [pB(stack.u, stack.v, ventTop), pB(stack.u, stack.v, -0.5), pB(stack.u, -7.5, -0.7)], RD);
  // kitchen and WC drains under the slab
  run(vvs, [pA(4.0, 1.1, Y.ff1 + 0.5), pA(4.0, 1.1, 0.1), pA(3.4, -3.0, 0.1), pB(stack.u - 0.1, stack.v, -0.45)], RD * 0.8);
  return {
    fuseBox: pA(2.81, -IN + 0.2, 1.6),
    drain: pB(stack.u, stack.v, 2.2),
  };
}

/* ---------------------------------------------------------------------------------------------- */
/* Finished                                                                                       */
/* ---------------------------------------------------------------------------------------------- */

export function buildFinished(layer) {
  const r = rng(61);
  const deck = layer.mb("deck_wood", "nokkelferdig_terrasse");
  const tone = () => {
    const c = col("#ffffff");
    c.multiplyScalar(0.9 + r() * 0.2);
    return c;
  };
  // terrace: boards along each wing, mitred at the joint
  for (const [wid, wing] of [
    ["A", A],
    ["B", B],
  ]) {
    const u1 = TERRACE[wid].u1;
    const { v0, v1, top } = TERRACE;
    for (let v = v0; v < v1 - 0.05; v += 0.13) {
      const va = v;
      const vb = Math.min(v1, v + 0.122);
      wbox(deck, wing, 0, u1, va, vb, top - 0.028, top, null, { mitre: true });
    }
    // skirt and step along the outer edge and the end
    wbox(deck, wing, 0, u1, v1 - 0.03, v1, 0.0, top - 0.028, null, { mitre: true });
    wbox(deck, wing, u1 - 0.03, u1, v0, v1, 0.0, top - 0.028, null);
    wbox(deck, wing, 0.6, u1 - 0.4, v1, v1 + 0.36, 0.17, 0.21, null);
  }
  void tone;
  // lamps
  const glow = layer.mb("lamp_glow", "nokkelferdig_lys");
  const dark = layer.mb("window_frame", "nokkelferdig_lamper");
  // niche downlight
  const nc = W(A, (NICHE.u0 + NICHE.u1) / 2, -HW + 0.3, 0);
  const lamp = Q().lamp;
  const disc = new THREE.CylinderGeometry(0.11, 0.11, 0.02, lamp.disc);
  glow.geometry(disc, new THREE.Matrix4().makeTranslation(nc.x, NICHE.y1 - 0.012, nc.z), null, { flat: false });
  // wall lamps by the terrace door and the entry
  for (const [w, u, s] of [
    [B, 0.66, 1],
    [B, 2.55, 1],
    [A, 0.62, -1],
  ]) {
    const v = s * (HW + CLAD_OUT + 0.07);
    wbox(dark, w, u - 0.06, u + 0.06, v - 0.06, v + 0.06, 2.2, 2.42, null);
    wbox(glow, w, u - 0.05, u + 0.05, v - 0.05, v + 0.05, 2.18, 2.2, null);
  }
  // pendants (kitchen island, dining) and ceiling lights
  const pendants = [
    pA(2.35, 0.82, Y.ff1 + 1.75),
    pA(3.0, 0.82, Y.ff1 + 1.75),
    pA(2.5, 2.75, Y.ff1 + 1.6),
    pB(2.9, 1.6, Y.ff1 + 1.9),
  ];
  for (const p of pendants) {
    const shade = new THREE.CylinderGeometry(0.06, 0.16, 0.18, lamp.shade, 1, true);
    dark.geometry(shade, new THREE.Matrix4().makeTranslation(p.x, p.y + 0.09, p.z), null, { flat: false });
    shade.dispose();
    glow.geometry(new THREE.SphereGeometry(0.07, lamp.sphere[0], lamp.sphere[1]), new THREE.Matrix4().makeTranslation(p.x, p.y + 0.02, p.z), null, { flat: false });
    dark.tube([V(p.x, p.y + 0.18, p.z), V(p.x, Y.top1 - 0.02, p.z)], 0.004, 4, null, { caps: false });
  }
  const ceilingLights = [pA(1.7, -2.1, 0), pA(2.9, 1.0, 0), pA(2.9, -1.0, 0), pB(3.0, 1.0, 0), pB(3.4, -2.6, 0), pB(0.7, -2.0, 0)];
  ceilingLights.forEach((p, i) => {
    const y = i === 0 ? Y.top1 - 0.03 : Y.collar - 0.025;
    glow.geometry(disc, new THREE.Matrix4().makeTranslation(p.x, y, p.z), null, { flat: false });
  });
  disc.dispose();
  // furniture: dining table + bench, sofa, rug, beds
  const wood = layer.mb("furniture_wood", "nokkelferdig_mobler");
  const textile = layer.mb("textile", "nokkelferdig_tekstil");
  const f1 = Y.ff1;
  wbox(wood, A, 1.55, 3.45, 2.35, 3.25, f1 + 0.72, f1 + 0.76, null);
  for (const [u, v] of [
    [1.65, 2.45],
    [3.35, 2.45],
    [1.65, 3.15],
    [3.35, 3.15],
  ])
    wbox(wood, A, u - 0.03, u + 0.03, v - 0.03, v + 0.03, f1, f1 + 0.72, null);
  wbox(wood, A, 1.7, 3.3, 3.42, 3.72, f1 + 0.42, f1 + 0.46, null);
  wbox(wood, A, 1.7, 3.3, 1.75, 2.0, f1 + 0.42, f1 + 0.46, null);
  wbox(textile, B, 2.5, 4.05, 2.55, 3.45, f1, f1 + 0.42, null);
  wbox(textile, B, 2.5, 4.05, 3.25, 3.55, f1 + 0.42, f1 + 0.8, null);
  wbox(textile, B, 2.2, 4.0, 0.4, 2.3, f1, f1 + 0.008, col("#9f978a"));
  wbox(wood, B, 2.9, 3.6, 0.9, 1.7, f1 + 0.38, f1 + 0.42, null);
  const f2 = Y.ff2;
  wbox(textile, A, 2.6, 4.2, 1.2, 2.8, f2, f2 + 0.48, null); // bed sov1
  wbox(textile, B, 2.4, 4.1, 0.2, 1.9, f2, f2 + 0.48, null); // bed sov3
  // stone path from the north to the entry niche
  const pave = layer.mb("paving", "nokkelferdig_heller");
  const path = [];
  for (let k = 0; k < 11; k++) {
    const t = k / 10;
    const u = 1.7 + Math.sin(t * 2.2) * 0.9 * t;
    const v = -(HW + 0.75 + k * 0.82);
    path.push(WP(A, u, v));
  }
  path.forEach((p, k) => {
    const y = Math.max(terrainHeight(p.x, p.z), 0) + 0.03;
    const s = 0.42 + r() * 0.06;
    const c = col("#6e6c68").multiplyScalar(0.9 + r() * 0.2);
    const rot = new THREE.Matrix4().makeRotationY(r() * 0.3 - 0.15);
    const geo = new THREE.BoxGeometry(s * 2.2, 0.06, s * 1.4);
    geo.applyMatrix4(rot);
    pave.geometry(geo, new THREE.Matrix4().makeTranslation(p.x, y - 0.02, p.z), c);
    geo.dispose();
    void k;
  });
  // low planting along the house and terrace
  const shrub = layer.mb("shrub", "nokkelferdig_beplantning");
  const spots = [
    pA(4.4, HW + 0.9, 0),
    pA(4.9, HW + 0.6, 0),
    pB(4.2, HW + 3.6, 0),
    pB(4.7, HW + 0.8, 0),
    pB(4.95, -1.0, 0),
    pA(5.1, -2.0, 0),
    pA(3.6, -HW - 0.9, 0),
    pB(3.2, -HW - 0.9, 0),
    pB(1.4, -HW - 1.0, 0),
    pA(-0.2, HW + 3.6, 0),
  ];
  spots.forEach((p, i) => {
    const n = 2 + Math.floor(r() * 3);
    const lobes = [];
    for (let k = 0; k < n; k++) {
      const rad = 0.32 + r() * 0.25;
      lobes.push({ c: V(p.x + (r() - 0.5) * 0.9, 0.16, p.z + (r() - 0.5) * 0.9), r: V(rad * 1.2, rad * 0.75, rad * 1.2) });
    }
    canopy(shrub, lobes, {
      seed: 900 + i * 7,
      count: Q().shrub.perLobe * n,
      size: Q().shrub.size,
      tints: ["#4b5447", "#50584a", "#565d4c"],
      detail: 0,
      coreDetail: Q().shrub.coreDetail,
      shell: [0.6, 0.95],
      flatten: 0.85,
      core: { k: 0.72, tint: "#31382f" },
      variance: 0.1,
    });
  });
  // the clumps no one can see: buried in the core or a neighbour, under the lawn,
  // or hidden from every side (the layer is drawn double-sided)
  if (Q().cullHidden) {
    cullBuried(shrub);
    const keep = [];
    for (let t = 0; t < shrub.indices.length; t += 3) {
      const under = [0, 1, 2].every((k) => shrub.positions[shrub.indices[t + k] * 3 + 1] < -0.01);
      if (!under) keep.push(shrub.indices[t], shrub.indices[t + 1], shrub.indices[t + 2]);
    }
    shrub.indices = keep;
    cullOccluded([shrub], { doubleSided: true, cell: 0.15, lights: shadowLightDirections() });
  }
  return {
    entry: W(A, (NICHE.u0 + NICHE.u1) / 2, -HW - 0.6, 1.6),
    terrace: W(B, 0.4, (TERRACE.v0 + TERRACE.v1) / 2, TERRACE.top + 0.1),
    pendants,
  };
}

export { STAIR };
