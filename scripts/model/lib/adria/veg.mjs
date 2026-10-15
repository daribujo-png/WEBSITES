/**
 * Vegetation kit: leaf-card crowns, plant clumps, trunks. Everything uses the
 * `leaf` material (alpha-tested atlas, double sided) and `bark`.
 *
 * Cards face outwards from the crown centre, and their vertex normals are
 * blended towards the crown's ellipsoid normal, so a crown shades as one soft
 * volume. Vertex colours carry the tint and a baked occlusion (darker inside
 * and underneath).
 */
import * as THREE from "three";
import { V, col, rng } from "../builder.mjs";
import { Q } from "../quality.mjs";
import { TILE, tileUV } from "./textures.mjs";

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * One card: centre p, size (w, h), facing direction n (front), `up` hint,
 * UVs of `tile`. `nBlend` = normals to use per corner (or one for all).
 */
export function card(mb, p, w, h, n, upHint, tile, color, normal, { flipU = false, anchorBottom = false } = {}) {
  const fwd = n.clone().normalize();
  let right = V().crossVectors(upHint, fwd);
  if (right.lengthSq() < 1e-6) right = V(1, 0, 0);
  right.normalize();
  const up = V().crossVectors(fwd, right).normalize();
  const [u0, v0, u1, v1] = tileUV(tile);
  const ua = flipU ? u1 : u0;
  const ub = flipU ? u0 : u1;
  const yb = anchorBottom ? 0 : -h / 2;
  const yt = anchorBottom ? h : h / 2;
  const c = (sx, sy) => p.clone().addScaledVector(right, sx * w / 2).addScaledVector(up, sy);
  const P = [c(-1, yb), c(1, yb), c(1, yt), c(-1, yt)];
  const nn = normal ? normal.clone() : fwd.clone();
  // image v grows downwards: bottom corners get v1, top corners v0
  const uvs = [
    [ua, v1],
    [ub, v1],
    [ub, v0],
    [ua, v0],
  ];
  const base = mb.vertexCount;
  for (let i = 0; i < 4; i++) mb.vert(P[i], nn, color, uvs[i]);
  mb.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
}

/** Ellipsoid normal of a point relative to centre c with radii r. */
const ellN = (p, c, r) => V((p.x - c.x) / (r.x * r.x), (p.y - c.y) / (r.y * r.y), (p.z - c.z) / (r.z * r.z)).normalize();

/**
 * Crown of leaf cards over ellipsoid lobes [{c, r}] (local space), grouped in
 * clumps: each clump has its own brightness, cards gather around clump centres,
 * and occlusion darkens the inside of the crown and its underside. That reads
 * as foliage masses with light and shade, not as a uniform ball.
 * opts: count, size [min, max], tile, tints [hex], seed, clumps, clumpR (fraction
 * of the lobe radius), droop, bottomDark, normalBlend.
 */
export function crown(mb, lobes, { count, size, tile, tints, seed = 1, clumps = 16, clumpR = 0.35, droop = 0.2, bottomDark = 0.5, normalBlend = 0.55, upBias = 0.3, shell = [0.55, 1.0] }) {
  const r = rng(seed);
  const box = new THREE.Box3();
  for (const L of lobes) {
    box.expandByPoint(L.c.clone().sub(L.r));
    box.expandByPoint(L.c.clone().add(L.r));
  }
  const cc = box.getCenter(V());
  const cr = box.getSize(V()).multiplyScalar(0.5);
  const vol = lobes.map((L) => L.r.x * L.r.y * L.r.z);
  const total = vol.reduce((a, b) => a + b, 0);
  const pickLobe = () => {
    let t = r() * total;
    for (let k = 0; k < lobes.length; k++) {
      t -= vol[k];
      if (t <= 0) return lobes[k];
    }
    return lobes[lobes.length - 1];
  };
  const tintC = tints.map((t) => col(t));
  // clump centres on the outer part of the lobes
  const cl = [];
  for (let i = 0; i < clumps; i++) {
    const L = pickLobe();
    let u = r() * 2 - 1;
    if (u < 0) u *= 1 - upBias;
    const th = r() * Math.PI * 2;
    const sq = Math.sqrt(1 - u * u);
    const k = shell[0] + (shell[1] - shell[0]) * Math.sqrt(r());
    const c = V(L.c.x + sq * Math.cos(th) * L.r.x * k, L.c.y + u * L.r.y * k, L.c.z + sq * Math.sin(th) * L.r.z * k);
    cl.push({ c, rad: V(L.r.x * clumpR * (0.7 + 0.6 * r()), L.r.y * clumpR * (0.6 + 0.5 * r()), L.r.z * clumpR * (0.7 + 0.6 * r())), b: 0.72 + 0.4 * r(), tint: tintC[Math.floor(r() * tintC.length)] });
  }
  for (let i = 0; i < count; i++) {
    const C = cl[i % cl.length];
    // gaussian-ish offset inside the clump, biased outwards
    const g = () => (r() + r() + r() - 1.5) / 1.5;
    const p = V(C.c.x + g() * C.rad.x, C.c.y + g() * C.rad.y, C.c.z + g() * C.rad.z);
    const nC = ellN(p, cc, cr);
    const nK = V((p.x - C.c.x) / C.rad.x, (p.y - C.c.y) / C.rad.y, (p.z - C.c.z) / C.rad.z);
    const nKl = nK.length() || 1;
    nK.divideScalar(nKl);
    const n = nC.clone().multiplyScalar(0.6).addScaledVector(nK, 0.4).add(V((r() - 0.5) * 0.9, (r() - 0.5) * 0.7 - droop, (r() - 0.5) * 0.9)).normalize();
    const up = V((r() - 0.5) * 0.6, 1, (r() - 0.5) * 0.6).normalize();
    const sz = size[0] + (size[1] - size[0]) * r();
    // occlusion: depth inside the crown, inside the clump, and the underside
    const depth = Math.sqrt(((p.x - cc.x) / cr.x) ** 2 + ((p.y - cc.y) / cr.y) ** 2 + ((p.z - cc.z) / cr.z) ** 2);
    let ao = 1 - bottomDark + bottomDark * smooth(-0.85, 0.6, nC.y);
    ao *= 0.5 + 0.5 * smooth(0.3, 1.0, depth);
    ao *= 0.75 + 0.25 * smooth(-0.6, 0.8, nK.dot(nC));
    const tint = C.tint.clone().multiplyScalar(C.b * ao * (0.92 + 0.16 * r()));
    const normal = nC.clone().multiplyScalar(normalBlend).addScaledVector(nK, (1 - normalBlend) * 0.6).addScaledVector(n, (1 - normalBlend) * 0.4).normalize();
    card(mb, p, sz, sz, n, up, tile, tint, normal, { flipU: r() < 0.5 });
  }
}

/** Tapered trunk along a polyline (local), smooth normals, colour per vertex via colorFn(p). */
export function trunk(mb, pts, r0, r1, colorFn, radial = Q().tubeRadial) {
  const total = pts.reduce((s, p, i) => (i ? s + p.distanceTo(pts[i - 1]) : 0), 0);
  let acc = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const len = a.distanceTo(b);
    const ra = r0 + (r1 - r0) * (acc / total);
    acc += len;
    const rb = r0 + (r1 - r0) * (acc / total);
    const geo = new THREE.CylinderGeometry(rb, ra, len, radial, 1, true);
    const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize());
    mb.geometry(geo, new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, V(1, 1, 1)), null, { flat: false, colorFn });
    geo.dispose();
  }
}

/* --------------------------------------------------------------------------------------------- */
/* Tree templates (local space, trunk base at the origin)                                        */
/* --------------------------------------------------------------------------------------------- */

/** Birch: white trunk with dark marks, tall airy drooping crown. */
export function birch(node, seed, { h = 13 } = {}) {
  const r = rng(seed);
  const bark = node.mb("bark", `${node.name}_bark`);
  const leaf = node.mb("leaf", `${node.name}_leaf`);
  const lean = V((r() - 0.5) * 0.8, 0, (r() - 0.5) * 0.8);
  const pts = [V(0, -0.3, 0), V(lean.x * 0.3, h * 0.35, lean.z * 0.3), V(lean.x * 0.7, h * 0.7, lean.z * 0.7), V(lean.x, h * 0.97, lean.z)];
  const markFn = (p) => {
    const band = Math.sin(p.y * 9.0 + Math.sin(p.y * 2.3) * 2 + seed) > 0.72 || (p.y < 1.2 && Math.sin(p.x * 30 + p.z * 30) > 0.2);
    return band ? col("#2a2723") : col("#e6e2d8").multiplyScalar(0.85 + 0.15 * Math.sin(p.y * 3.1));
  };
  trunk(bark, pts, h * 0.017, h * 0.004, markFn);
  for (let b = 0; b < 7; b++) {
    const y = h * (0.32 + 0.085 * b);
    const a = r() * Math.PI * 2;
    const base = pts[1].clone().lerp(pts[3], Math.max(0, (y - h * 0.35) / (h * 0.62)));
    base.y = y;
    const tip = base.clone().add(V(Math.cos(a) * h * 0.16, h * 0.08, Math.sin(a) * h * 0.16));
    trunk(bark, [base, tip], h * 0.005, h * 0.0015, () => col("#3b3732"), 4);
  }
  const L = (x, y, z, rx, ry) => ({ c: V(lean.x * (y / h) + x, y, lean.z * (y / h) + z), r: V(rx, ry, rx) });
  const lobes = [
    L(0, h * 0.46, 0, h * 0.2, h * 0.22),
    L(h * 0.05, h * 0.68, -h * 0.03, h * 0.18, h * 0.2),
    L(-h * 0.06, h * 0.58, h * 0.05, h * 0.16, h * 0.18),
    L(0, h * 0.85, 0, h * 0.12, h * 0.13),
    L(h * 0.08, h * 0.32, h * 0.06, h * 0.15, h * 0.12),
    L(-h * 0.07, h * 0.27, -h * 0.05, h * 0.12, h * 0.1),
  ];
  crown(leaf, lobes, { count: Q().trees.cardsBirch, size: [h * 0.075, h * 0.12], tile: TILE.birch, tints: ["#c8d0a4", "#b6c290", "#d3d8ae", "#a9b884"], seed: seed * 3, clumps: 26, clumpR: 0.5, droop: 0.5, bottomDark: 0.45, upBias: 0, shell: [0.3, 1.0] });
  return node;
}

/** Broadleaf (maple/oak/lime): big rounded dark crown on a short trunk. */
export function broadleaf(node, seed, { h = 16 } = {}) {
  const r = rng(seed);
  const bark = node.mb("bark", `${node.name}_bark`);
  const leaf = node.mb("leaf", `${node.name}_leaf`);
  const pts = [V(0, -0.3, 0), V(0.2, h * 0.28, 0.1), V(0.1, h * 0.5, -0.1)];
  trunk(bark, pts, h * 0.028, h * 0.013, () => col("#4a443b"));
  for (let b = 0; b < 5; b++) {
    const a = (b / 5) * Math.PI * 2 + r();
    const base = V(0.15, h * (0.28 + 0.05 * b), 0);
    trunk(bark, [base, base.clone().add(V(Math.cos(a) * h * 0.2, h * 0.2, Math.sin(a) * h * 0.2))], h * 0.011, h * 0.004, () => col("#4a443b"), 5);
  }
  const lobes = [];
  const n = 6;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + r();
    const y = h * (0.5 + 0.12 * r());
    lobes.push({ c: V(Math.cos(a) * h * 0.17, y, Math.sin(a) * h * 0.17), r: V(h * 0.2, h * 0.17, h * 0.2) });
  }
  lobes.push({ c: V(0, h * 0.74, 0), r: V(h * 0.22, h * 0.19, h * 0.22) });
  lobes.push({ c: V(h * 0.05, h * 0.38, -h * 0.04), r: V(h * 0.2, h * 0.12, h * 0.2) });
  crown(leaf, lobes, { count: Q().trees.cardsBroad, size: [h * 0.09, h * 0.14], tile: TILE.broad, tints: ["#b9c39b", "#a8b48b", "#c4caa4", "#97a57c"], seed: seed * 5, clumps: 26, clumpR: 0.5, droop: 0.12, bottomDark: 0.6 });
  return node;
}

/** Spruce: conical, whorls of hanging conifer cards. */
export function spruce(node, seed, { h = 17 } = {}) {
  const r = rng(seed);
  const bark = node.mb("bark", `${node.name}_bark`);
  const leaf = node.mb("leaf", `${node.name}_leaf`);
  trunk(bark, [V(0, -0.3, 0), V(0, h, 0)], h * 0.018, h * 0.003, () => col("#3d342b"), 6);
  const n = Q().trees.cardsSpruce;
  for (let i = 0; i < n; i++) {
    const t = Math.pow(r(), 0.8); // more cards low down
    const y = h * (0.12 + 0.86 * t);
    const rad = h * 0.24 * (1 - t) * (0.55 + 0.45 * r()) + 0.15;
    const a = r() * Math.PI * 2;
    const p = V(Math.cos(a) * rad, y, Math.sin(a) * rad);
    const out = V(Math.cos(a), -0.35, Math.sin(a)).normalize();
    const nrm = V(Math.cos(a), 0.6, Math.sin(a)).normalize();
    const s = h * (0.05 + 0.09 * (1 - t)) * (0.8 + 0.4 * r());
    const ao = 0.55 + 0.45 * smooth(0, 0.9, rad / (h * 0.24 * (1 - t) + 0.2));
    // card hangs along the branch: facing up-ish, running outwards
    const fwd = V(-Math.sin(a), 0.25, Math.cos(a)).normalize();
    const c = col(r() < 0.5 ? "#b9c4b0" : "#a9b6a0").multiplyScalar(ao);
    card(leaf, p, s * 1.4, s, fwd, out, TILE.conifer, c, nrm);
  }
  return node;
}

/* --------------------------------------------------------------------------------------------- */
/* Plant clump templates (local, base at the origin)                                              */
/* --------------------------------------------------------------------------------------------- */

/** Crossed upright cards around the centre (grasses, lavender). */
export function uprightClump(mb, { tile, n = 6, h = 0.6, w = 0.6, spread = 0.15, tints = ["#ffffff"], seed = 1, tilt = 0.15 }) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI + r() * 0.4;
    const off = V((r() - 0.5) * spread, 0, (r() - 0.5) * spread);
    const fwd = V(Math.cos(a), 0, Math.sin(a));
    const up = V((r() - 0.5) * tilt, 1, (r() - 0.5) * tilt).normalize();
    const nrm = V(fwd.x * 0.3, 1, fwd.z * 0.3).normalize();
    const c = col(tints[Math.floor(r() * tints.length)]).multiplyScalar(0.85 + 0.25 * r());
    card(mb, off, w * (0.8 + 0.4 * r()), h * (0.8 + 0.4 * r()), fwd, up, tile, c, nrm, { anchorBottom: true, flipU: r() < 0.5 });
  }
}

/** Dome of cards (shrubs, box balls, spiraea). */
export function domeClump(mb, { tile, n = 14, rx = 0.5, ry = 0.5, size = 0.45, tints = ["#ffffff"], seed = 1, lift = 0 }) {
  crown(mb, [{ c: V(0, ry * 0.85 + lift, 0), r: V(rx, ry, rx) }], { count: n, size: [size * 0.8, size * 1.2], tile, tints, seed, shell: [0.5, 1.0], droop: 0.05, bottomDark: 0.35, upBias: 0.6 });
}

/** Low rosette of big leaves (hosta). */
export function rosette(mb, { tile = TILE.bigleaf, n = 6, r0 = 0.35, size = 0.45, tints = ["#ffffff"], seed = 1 }) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + r() * 0.5;
    const p = V(Math.cos(a) * r0 * 0.5, size * 0.42, Math.sin(a) * r0 * 0.5);
    const fwd = V(Math.cos(a) * 1.2, 0.8, Math.sin(a) * 1.2).normalize();
    const up = V(Math.cos(a), 0.4, Math.sin(a)).normalize();
    card(mb, p, size, size, fwd, up, tile, col(tints[i % tints.length]).multiplyScalar(0.85 + 0.2 * r()), V(0, 1, 0));
  }
}

export { smooth };
