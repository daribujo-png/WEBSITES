/**
 * Site (tomt), groundworks (grunnarbeid) and foundation (fundament).
 */
import * as THREE from "three";
import { V, col, makeNoise2D, rng } from "./builder.mjs";
import { HW, WINGS, Y, outline, wingQuad, WP } from "./house-spec.mjs";
import { LAWN, PIT_OUT, terrainHeight } from "./env.mjs";

const nz = makeNoise2D(5);

/** Flat ribbon on the ground following the terrain, from a to b (plan points). */
function groundLine(mb, a, b, width, lift = 0.025, dash = null, color = null) {
  const len = Math.hypot(b.x - a.x, b.z - a.z);
  const dir = { x: (b.x - a.x) / len, z: (b.z - a.z) / len };
  const nrm = { x: -dir.z * (width / 2), z: dir.x * (width / 2) };
  const step = 0.8;
  const pieces = [];
  if (dash) {
    for (let s = 0; s < len; s += dash[0] + dash[1]) pieces.push([s, Math.min(len, s + dash[0])]);
  } else pieces.push([0, len]);
  for (const [s0, s1] of pieces) {
    const n = Math.max(1, Math.ceil((s1 - s0) / step));
    for (let k = 0; k < n; k++) {
      const t0 = s0 + ((s1 - s0) * k) / n;
      const t1 = s0 + ((s1 - s0) * (k + 1)) / n;
      const p0 = { x: a.x + dir.x * t0, z: a.z + dir.z * t0 };
      const p1 = { x: a.x + dir.x * t1, z: a.z + dir.z * t1 };
      const h = (p) => terrainHeight(p.x, p.z) + lift;
      const q = [
        V(p0.x - nrm.x, h(p0), p0.z - nrm.z),
        V(p1.x - nrm.x, h(p1), p1.z - nrm.z),
        V(p1.x + nrm.x, h(p1), p1.z + nrm.z),
        V(p0.x + nrm.x, h(p0), p0.z + nrm.z),
      ];
      const c = V((q[0].x + q[2].x) / 2, (q[0].y + q[2].y) / 2 - 1, (q[0].z + q[2].z) / 2);
      mb.face(q, c, color);
    }
  }
}

function polyLines(mb, pts, width, lift, dash, closed = true) {
  for (let i = 0; i < pts.length - (closed ? 0 : 1); i++) groundLine(mb, pts[i], pts[(i + 1) % pts.length], width, lift, dash);
}

/** Property boundary (rotated rectangle) used for the site plan. */
export function plotOutline() {
  const ang = THREE.MathUtils.degToRad(6);
  const c = { x: -0.6, z: 1.4 };
  const hw = 17;
  const hd = 15.5;
  return [
    [-hw, -hd],
    [hw, -hd],
    [hw, hd],
    [-hw, hd],
  ].map(([x, z]) => ({
    x: c.x + x * Math.cos(ang) - z * Math.sin(ang),
    z: c.z + x * Math.sin(ang) + z * Math.cos(ang),
  }));
}

export function buildTomt(layer) {
  const plan = layer.group("tomt_situasjonsplan", { hideFrom: "bindingsverk" });
  const mbPlan = plan.mb("plan_line", "tomt_situasjonsplan_linjer");
  // property boundary (solid) and building limit (dashed, 4 m inside)
  const plot = plotOutline();
  polyLines(mbPlan, plot, 0.14, 0.03, null);
  const inset = (pts, d) => {
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const cz = pts.reduce((s, p) => s + p.z, 0) / pts.length;
    return pts.map((p) => {
      const dx = p.x - cx;
      const dz = p.z - cz;
      const k = 1 - d / Math.hypot(dx, dz) * 1.0;
      return { x: cx + dx * k, z: cz + dz * k };
    });
  };
  polyLines(mbPlan, inset(plot, 5.5), 0.08, 0.03, [0.6, 0.35]);
  // house footprint (dashed) and corner ticks
  polyLines(mbPlan, outline(0.05), 0.1, 0.03, [0.45, 0.22]);
  // stakes and strings (profiles)
  const stakes = layer.group("tomt_stikning", { hideFrom: "fundament" });
  const mbStake = stakes.mb("stake_wood", "tomt_stikker");
  const mbMark = stakes.mb("stake_mark", "tomt_stikker_merke");
  const mbString = stakes.mb("string_line", "tomt_snorer");
  const corners = outline(0.05);
  const pegH = 0.85;
  corners.forEach((p) => {
    const y0 = terrainHeight(p.x, p.z);
    mbStake.aabb(V(p.x - 0.025, y0 - 0.2, p.z - 0.025), V(p.x + 0.025, y0 + pegH, p.z + 0.025), null);
    mbMark.aabb(V(p.x - 0.03, y0 + pegH - 0.12, p.z - 0.03), V(p.x + 0.03, y0 + pegH + 0.005, p.z + 0.03), null);
  });
  for (let i = 0; i < corners.length; i++) {
    const a = corners[i];
    const b = corners[(i + 1) % corners.length];
    const ya = terrainHeight(a.x, a.z) + pegH - 0.06;
    mbString.tube([V(a.x, ya, a.z), V(b.x, ya, b.z)], 0.006, 4, null, { caps: false });
  }
  // ground plug (covers the not-yet-dug pit at step "tomt")
  const plug = layer.group("tomt_mark", { hideFrom: "grunnarbeid" });
  const mbPlug = plug.mb("terrain", "tomt_mark_flate");
  const lawn = col(LAWN);
  mbPlug.slab(outline(PIT_OUT + 0.02), [], -0.02, 0.0, lawn, { sides: false, bottom: false });
  return { plot };
}

/** Pit walls + floor + blasted rock. */
export function buildGrunnarbeid(layer) {
  const mbPit = layer.mb("pit_earth", "grunnarbeid_byggegrop");
  const top = outline(PIT_OUT);
  const bottom = outline(PIT_OUT - 0.55);
  const yb = -1.05;
  const cx = top.reduce((s, p) => s + p.x, 0) / top.length;
  const cz = top.reduce((s, p) => s + p.z, 0) / top.length;
  const earth = col("#5b4a3c");
  const rock = col("#7d7a74");
  const tint = (p) => {
    const c = earth.clone();
    const n = nz.fbm(p.x * 0.6, p.z * 0.6 + p.y, 3);
    // bedrock shows on the north side and at depth
    const rocky = Math.min(1, Math.max(0, (-p.z - 1.0) / 3) + Math.max(0, -p.y - 0.5) * 0.6 + n * 0.8);
    c.lerp(rock, rocky);
    c.multiplyScalar(0.85 + 0.3 * (n + 0.5));
    return c;
  };
  // walls, subdivided so vertex colours vary
  for (let i = 0; i < top.length; i++) {
    const j = (i + 1) % top.length;
    const segs = Math.max(2, Math.round(Math.hypot(top[j].x - top[i].x, top[j].z - top[i].z) / 0.8));
    for (let k = 0; k < segs; k++) {
      const t0 = k / segs;
      const t1 = (k + 1) / segs;
      const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
      const a0 = lerp(top[i], top[j], t0);
      const a1 = lerp(top[i], top[j], t1);
      const b0 = lerp(bottom[i], bottom[j], t0);
      const b1 = lerp(bottom[i], bottom[j], t1);
      const jig = (p, y) => V(p.x + nz(p.x * 2, p.z * 2) * 0.15, y, p.z + nz(p.z * 2, p.x * 2) * 0.15);
      const q = [jig(b0, yb), jig(b1, yb), V(a1.x, 0, a1.z), V(a0.x, 0, a0.z)];
      const behind = V((a0.x + a1.x) / 2 + ((a0.x + a1.x) / 2 - cx) * 0.4, -1.5, (a0.z + a1.z) / 2 + ((a0.z + a1.z) / 2 - cz) * 0.4);
      const before = mb_face_colored(mbPit, q, behind, tint);
      void before;
    }
  }
  // floor
  const floorColor = col("#6c665e");
  mbPit.slab(bottom, [], yb - 0.01, yb, floorColor, { sides: false, bottom: false });
  // blasted rock: pile beside the pit + loose rock on the pit floor (north)
  const pile = layer.group("grunnarbeid_steinmasser", { hideFrom: "bindingsverk" });
  const mbRock = pile.mb("blast_rock", "grunnarbeid_sprengstein");
  const r = rng(31);
  const pileAt = { x: 9.6, z: -6.4 };
  const pileY = terrainHeight(pileAt.x, pileAt.z);
  const rockTone = () => {
    const c = col("#a39c94");
    c.lerp(col("#8a8580"), r());
    c.multiplyScalar(0.9 + r() * 0.2);
    return c;
  };
  const addRock = (mb, x, y, z, s) => {
    const geo = new THREE.DodecahedronGeometry(s, 0);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setXYZ(i, pos.getX(i) * (0.8 + r() * 0.5), pos.getY(i) * (0.6 + r() * 0.4), pos.getZ(i) * (0.8 + r() * 0.5));
    }
    const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(r() * 3, r() * 3, r() * 3)).setPosition(x, y, z);
    mb.geometry(geo, m, rockTone());
    geo.dispose();
  };
  for (let i = 0; i < 70; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * 2.6;
    const h = (1 - d / 2.8) * 1.5;
    addRock(mbRock, pileAt.x + Math.cos(a) * d, pileY + h * r() + 0.15, pileAt.z + Math.sin(a) * d * 0.8, 0.22 + r() * 0.35);
  }
  // loose blasted rock in the north part of the pit
  const loose = layer.mb("blast_rock", "grunnarbeid_sprengstein_grop");
  const bA = WINGS.A;
  for (let i = 0; i < 28; i++) {
    const u = 0.5 + r() * 3.5;
    const v = -(HW + 0.2 + r() * 0.5);
    const p = WP(bA, u, v);
    addRock(loose, p.x, yb + 0.1, p.z, 0.15 + r() * 0.2);
  }
  return { pileAt: V(pileAt.x, pileY + 1.2, pileAt.z), pitCentre: V(cx, yb + 0.2, cz) };
}

function mb_face_colored(mb, q, behind, tint) {
  const before = mb.vertexCount;
  mb.face(q, behind, null);
  for (let k = before; k < mb.vertexCount; k++) {
    const p = V(mb.positions[k * 3], mb.positions[k * 3 + 1], mb.positions[k * 3 + 2]);
    const c = tint(p);
    mb.colors[k * 3] = c.r;
    mb.colors[k * 3 + 1] = c.g;
    mb.colors[k * 3 + 2] = c.b;
  }
  mb.useColor = true;
  return before;
}

/** Ringmur, footing, gravel, EPS, radon membrane and slab with a stepped cut-away at the west end. */
export function buildFundament(layer) {
  const ring = layer.mb("concrete", "fundament_ringmur");
  ring.slab(outline(0.05), [outline(-0.15)], -0.85, Y.slab, null);
  ring.slab(outline(0.3), [outline(-0.4)], -1.05, -0.85, null);
  const fill = layer.mb("gravel", "fundament_pukk");
  const gravel = col("#8f8a83");
  const inner = -0.15;
  for (const wid of ["A", "B"]) {
    const w = WINGS[wid];
    // stepped cut-away only on wing A's gable end
    const cut = wid === "A";
    fill.prism(wingQuad(w, inner), -0.85, 0.05, gravel);
    layer.mb("eps", "fundament_isolasjon").prism(wingQuad(w, inner, cut ? -0.55 : 0), 0.05, 0.25, null);
    layer.mb("radon_membrane", "fundament_radonsperre").prism(wingQuad(w, inner, cut ? -1.05 : 0), 0.25, 0.262, null);
    layer.mb("concrete", "fundament_plate").prism(wingQuad(w, inner, cut ? -1.75 : 0), 0.262, Y.slab, null);
  }
  // radon membrane lapped up the inside of the ringmur at the cut-away (reads as a sheet)
  // drainage gravel strip around the house (covers the backfilled pit)
  const strip = layer.mb("gravel", "fundament_drenering");
  strip.slab(outline(0.62), [outline(0.05)], -0.06, 0.012, col("#96918a"), { bottom: false });
  strip.slab(outline(PIT_OUT + 0.06), [outline(0.62)], -0.06, 0.004, col(LAWN), { bottom: false });
  const A = WINGS.A;
  return {
    ringmurCorner: (() => {
      const p = WP(A, A.L + 0.05, HW + 0.05);
      return V(p.x, Y.slab + 0.02, p.z);
    })(),
    radonPoint: (() => {
      const p = WP(A, A.L - 1.35, 1.2);
      return V(p.x, 0.27, p.z);
    })(),
  };
}
