/**
 * Environment: Fana terrain with bedrock (svaberg) and boulders, birches,
 * the two old maples and distant ridges. Stylised but calm: smooth-shaded
 * canopy clusters, vertex-coloured ground, no textures.
 */
import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { SceneNode, V, col, makeNoise2D, rng } from "./builder.mjs";
import { outline } from "./house-spec.mjs";

const noise = makeNoise2D(11);
const noise2 = makeNoise2D(23);

export const HOUSE_CENTRE = { x: -0.1, z: 0.4 };
export const PIT_OUT = 1.2; // pit edge offset from the frame face
export const TERRAIN_SIZE = 120;
export const TERRAIN_CELLS = 100;

export const MAPLE_A = { x: 7.2, z: 10.6 };
export const MAPLE_B = { x: -11.4, z: -6.2 };

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Natural ground height (before the pad around the house is flattened). */
function natural(x, z) {
  const north = Math.max(0, -z - 4);
  let h = 0.1 * north + 0.0022 * north * north; // rises behind the house
  h -= 0.06 * Math.max(0, z - 8); // falls gently towards the fjord in the south
  h += 1.6 * noise.fbm(x / 28, z / 28, 4);
  h += 0.25 * noise2.fbm(x / 7, z / 7, 2);
  h += 0.04 * Math.abs(x) * smooth(15, 50, Math.abs(x)); // valley sides
  return h;
}

/** Finished ground height at (x, z). Flat pad at y=0 around the house. */
export function terrainHeight(x, z) {
  const dx = (x - HOUSE_CENTRE.x) / 1.15;
  const dz = z - HOUSE_CENTRE.z;
  const rr = Math.sqrt(dx * dx + dz * dz);
  const k = smooth(10.5, 19, rr);
  return natural(x, z) * k;
}

function groundColor(x, z, h, slope) {
  const dx = x - HOUSE_CENTRE.x;
  const dz = z - HOUSE_CENTRE.z;
  const rr = Math.sqrt(dx * dx + dz * dz);
  const lawn = col("#5f6353");
  const meadow = col("#5c5f4e");
  const moss = col("#4f5345");
  const heather = col("#5d5249");
  const rock = col("#76787a");
  const n = noise2.fbm(x / 9, z / 9, 3);
  const n2 = noise.fbm(x / 4 + 40, z / 4, 2);
  const c = meadow.clone().lerp(moss, smooth(-0.2, 0.3, n));
  c.lerp(heather, smooth(0.15, 0.4, n2) * 0.7);
  const rocky = Math.max(smooth(0.35, 0.75, slope), smooth(0.28, 0.42, noise.fbm(x / 16 + 7, z / 16 - 3, 3)) * smooth(14, 22, rr));
  c.lerp(rock, rocky * 0.85);
  c.lerp(lawn, 1 - smooth(10, 16, rr));
  // subtle brightness variation
  c.multiplyScalar(0.92 + 0.16 * (noise.fbm(x / 2.5, z / 2.5, 2) + 0.5));
  return c;
}

export const LAWN = "#5f6353";

/** Rectangle (grid aligned) removed from the terrain grid and filled with an exact collar. */
function holeRect() {
  const pit = outline(PIT_OUT + 0.05);
  const cell = TERRAIN_SIZE / TERRAIN_CELLS;
  const xs = pit.map((p) => p.x);
  const zs = pit.map((p) => p.z);
  const snap = (v, f) => f(v / cell) * cell;
  return {
    x0: snap(Math.min(...xs) - cell, Math.floor),
    x1: snap(Math.max(...xs) + cell, Math.ceil),
    z0: snap(Math.min(...zs) - cell, Math.floor),
    z1: snap(Math.max(...zs) + cell, Math.ceil),
  };
}

export function buildTerrain(node) {
  const mb = node.mb("terrain", "env_terrain_ground");
  const N = TERRAIN_CELLS;
  const S = TERRAIN_SIZE;
  const cell = S / N;
  const hr = holeRect();
  const idx = (i, j) => i * (N + 1) + j;
  const verts = [];
  for (let i = 0; i <= N; i++) {
    for (let j = 0; j <= N; j++) {
      const x = -S / 2 + j * cell;
      const z = -S / 2 + i * cell;
      verts.push(V(x, terrainHeight(x, z), z));
    }
  }
  // smooth normals from heights
  const normals = verts.map((p) => {
    const e = 0.5;
    const hx = terrainHeight(p.x + e, p.z) - terrainHeight(p.x - e, p.z);
    const hz = terrainHeight(p.x, p.z + e) - terrainHeight(p.x, p.z - e);
    return V(-hx, 2 * e, -hz).normalize();
  });
  const colors = verts.map((p, k) => groundColor(p.x, p.z, p.y, 1 - normals[k].y));
  const base = mb.vertexCount;
  verts.forEach((p, k) => mb._push(p, normals[k], colors[k]));
  const inHole = (x, z) => x > hr.x0 - 1e-6 && x < hr.x1 + 1e-6 && z > hr.z0 - 1e-6 && z < hr.z1 + 1e-6;
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const x = -S / 2 + (j + 0.5) * cell;
      const z = -S / 2 + (i + 0.5) * cell;
      if (inHole(x, z)) continue;
      const a = base + idx(i, j);
      const b = base + idx(i, j + 1);
      const c = base + idx(i + 1, j + 1);
      const d = base + idx(i + 1, j);
      // CCW seen from above (+y): a(x0,z0) → d(x0,z1) → c(x1,z1)
      mb.indices.push(a, d, c, a, c, b);
    }
  }
  // collar between the grid hole and the exact pit outline (flat, y = 0)
  const collar = node.mb("terrain", "env_terrain_ground");
  const rect = [
    { x: hr.x0, z: hr.z0 },
    { x: hr.x1, z: hr.z0 },
    { x: hr.x1, z: hr.z1 },
    { x: hr.x0, z: hr.z1 },
  ];
  // subdivide the rectangle edges so vertices meet the grid (no T-junction cracks)
  const ring = [];
  for (let e = 0; e < 4; e++) {
    const p = rect[e];
    const q = rect[(e + 1) % 4];
    const n = Math.round(Math.hypot(q.x - p.x, q.z - p.z) / cell);
    for (let k = 0; k < n; k++) ring.push({ x: p.x + ((q.x - p.x) * k) / n, z: p.z + ((q.z - p.z) * k) / n });
  }
  const pit = outline(PIT_OUT);
  const lawn = col(LAWN);
  collarSlab(collar, ring, pit, lawn);
  return { holeRect: hr };
}

/** Flat ring at y = 0 (top only), lawn coloured. */
function collarSlab(mb, outer, hole, color) {
  const contour = outer.map((p) => new THREE.Vector2(p.x, p.z));
  const holes = [hole.map((p) => new THREE.Vector2(p.x, p.z))];
  const tris = THREE.ShapeUtils.triangulateShape(contour, holes);
  const all = [...contour, ...holes[0]];
  const up = V(0, 1, 0);
  for (const [a, b, c] of tris) {
    const A = V(all[a].x, 0, all[a].y);
    const B = V(all[b].x, 0, all[b].y);
    const C = V(all[c].x, 0, all[c].y);
    const ny = (B.x - A.x) * (C.z - A.z) - (B.z - A.z) * (C.x - A.x);
    const ca = groundColor(A.x, A.z, 0, 0);
    const cb = groundColor(B.x, B.z, 0, 0);
    const cc = groundColor(C.x, C.z, 0, 0);
    const i0 = mb._push(A, up, ca);
    const i1 = mb._push(B, up, cb);
    const i2 = mb._push(C, up, cc);
    if (ny < 0) mb.indices.push(i0, i1, i2);
    else mb.indices.push(i0, i2, i1);
  }
  void color;
}

/** Displaced icosphere (smooth) appended to mb. */
export function blob(mb, centre, radius, scale, detail, seed, colorFn, rough = 0.18) {
  const raw = new THREE.IcosahedronGeometry(radius, detail);
  raw.deleteAttribute("uv");
  raw.deleteAttribute("normal");
  const geo = mergeVertices(raw, 1e-4);
  raw.dispose();
  const nz = makeNoise2D(seed);
  const pos = geo.attributes.position;
  const p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    const n = p.clone().normalize();
    const d = 1 + rough * nz.fbm(n.x * 2.1 + n.y * 1.3 + 5, n.z * 2.1 - n.y * 0.9, 3) * 2;
    p.copy(n.multiplyScalar(radius * d));
    pos.setXYZ(i, p.x * scale.x, p.y * scale.y, p.z * scale.z);
  }
  geo.computeVertexNormals();
  const m = new THREE.Matrix4().makeTranslation(centre.x, centre.y, centre.z);
  mb.geometry(geo, m, null, { flat: false, colorFn });
  geo.dispose();
}

/** Indexed, welded icosphere templates (unit radius) for foliage clumps. */
const ICO = [0, 1, 2].map((d) => {
  const raw = new THREE.IcosahedronGeometry(1, d);
  raw.deleteAttribute("uv");
  raw.deleteAttribute("normal");
  const g = mergeVertices(raw, 1e-4);
  raw.dispose();
  return { pos: Array.from(g.attributes.position.array), index: Array.from(g.index.array) };
});

/** Point inside the union of ellipsoid lobes deeper than `depth` (0..1 of the radius)? */
function insideLobes(p, lobes, skip, depth) {
  for (let i = 0; i < lobes.length; i++) {
    if (i === skip) continue;
    const L = lobes[i];
    const dx = (p.x - L.c.x) / L.r.x;
    const dy = (p.y - L.c.y) / L.r.y;
    const dz = (p.z - L.c.z) / L.r.z;
    if (dx * dx + dy * dy + dz * dz < depth * depth) return true;
  }
  return false;
}

/**
 * Crown of soft foliage clumps. `lobes` is a list of ellipsoids {c, r}; clumps
 * (displaced icospheres) sit on the outer shell of their union, so the
 * silhouette is calm and leafy instead of a cloud of loose triangles.
 * Normals blend the clump normal with the crown normal, so the whole crown
 * shades as one volume; vertex colours bake occlusion (darker underneath and
 * in the crevices between clumps). Clumps buried inside other lobes are skipped.
 */
export function canopy(mb, lobes, opts) {
  const {
    seed,
    count,
    size: [s0, s1],
    tints,
    detail = 1,
    shell = [0.8, 1.0],
    flatten = 0.86,
    core = null,
    variance = 0.1,
    bottomDark = 0.5,
    lift = 0,
    clumpNormal = 0.3,
  } = opts;
  const r = rng(seed);
  const nz = makeNoise2D(seed + 5);
  // crown bounds → overall ellipsoid used for the soft volume normal
  const box = new THREE.Box3();
  lobes.forEach((L) => {
    box.expandByPoint(V(L.c.x - L.r.x, L.c.y - L.r.y, L.c.z - L.r.z));
    box.expandByPoint(V(L.c.x + L.r.x, L.c.y + L.r.y, L.c.z + L.r.z));
  });
  const cc = box.getCenter(V());
  const cr = box.getSize(V()).multiplyScalar(0.5);
  const area = lobes.map((L) => L.r.x * L.r.z + L.r.y * (L.r.x + L.r.z));
  const total = area.reduce((a, b) => a + b, 0);
  const pickLobe = () => {
    let t = r() * total;
    for (let i = 0; i < lobes.length; i++) {
      t -= area[i];
      if (t <= 0) return i;
    }
    return lobes.length - 1;
  };
  const tpl = ICO[detail];
  const nv = tpl.pos.length / 3;
  // dark core so the crown never reads as hollow
  if (core) {
    lobes.forEach((L, i) =>
      blob(mb, L.c, 1, V(L.r.x * core.k, L.r.y * core.k, L.r.z * core.k), 1, seed * 7 + i, (p, n) => {
        const c = col(core.tint);
        c.multiplyScalar(0.55 + 0.45 * smooth(-0.8, 0.8, n.y));
        return c;
      }, 0.14),
    );
  }
  let placed = 0;
  let guard = 0;
  while (placed < count && guard++ < count * 6) {
    const li = pickLobe();
    const L = lobes[li];
    // direction, slightly biased upwards (fewer clumps on the shaded underside)
    let u = r() * 2 - 1;
    u = u < 0 ? u * (0.75 + 0.25 * r()) : u;
    const th = r() * Math.PI * 2;
    const sq = Math.sqrt(1 - u * u);
    const dir = V(sq * Math.cos(th), u, sq * Math.sin(th));
    const k = shell[0] + (shell[1] - shell[0]) * Math.pow(r(), 0.6);
    const p = V(L.c.x + dir.x * L.r.x * k, L.c.y + dir.y * L.r.y * k + lift, L.c.z + dir.z * L.r.z * k);
    if (insideLobes(p, lobes, li, 0.84)) continue;
    placed++;
    const s = s0 + (s1 - s0) * r() * r();
    const tint = col(r.pick(tints));
    tint.multiplyScalar(1 + (r() - 0.5) * 2 * variance);
    const rot = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(r() * 6.28, r() * 6.28, r() * 6.28));
    const base = mb.vertexCount;
    const q = V();
    const nClump = V();
    for (let i = 0; i < nv; i++) {
      q.set(tpl.pos[i * 3], tpl.pos[i * 3 + 1], tpl.pos[i * 3 + 2]).applyMatrix4(rot);
      const d = 1 + 0.22 * nz.fbm(q.x * 1.3 + q.y * 0.7 + placed * 0.37, q.z * 1.3 - q.y * 0.5, 2) * 2;
      nClump.copy(q).normalize();
      const w = V(p.x + q.x * s * d, p.y + q.y * s * d * flatten, p.z + q.z * s * d);
      // crown normal: blend of the lobe ellipsoid and the whole-crown ellipsoid
      const nl = V((w.x - L.c.x) / (L.r.x * L.r.x), (w.y - L.c.y) / (L.r.y * L.r.y), (w.z - L.c.z) / (L.r.z * L.r.z)).normalize();
      const nc = V((w.x - cc.x) / (cr.x * cr.x), (w.y - cc.y) / (cr.y * cr.y), (w.z - cc.z) / (cr.z * cr.z)).normalize();
      const nCrown = nl.multiplyScalar(0.5).add(nc.multiplyScalar(0.5)).normalize();
      const n = nClump.clone().multiplyScalar(clumpNormal).addScaledVector(nCrown, 1 - clumpNormal).normalize();
      // occlusion: underside of the crown, inward-facing clump sides, depth
      const facing = nClump.dot(nCrown); // −1 inward … 1 outward
      const depth = Math.sqrt(((w.x - cc.x) / cr.x) ** 2 + ((w.y - cc.y) / cr.y) ** 2 + ((w.z - cc.z) / cr.z) ** 2);
      let ao = 1 - bottomDark + bottomDark * smooth(-0.9, 0.7, nCrown.y);
      ao *= 0.7 + 0.3 * smooth(-0.6, 0.8, facing);
      ao *= 0.78 + 0.22 * smooth(0.55, 1.0, depth);
      const c = tint.clone().multiplyScalar(ao * (1 + 0.08 * nz(w.x * 0.8 + 3, w.z * 0.8 + w.y * 0.5)));
      mb._push(w, n, c);
    }
    for (const ix of tpl.index) mb.indices.push(base + ix);
  }
}

function flatBlob(mb, centre, radius, scale, detail, seed, colorFn, rough = 0.18) {
  // faceted variant (rocks)
  const geo = new THREE.IcosahedronGeometry(radius, detail);
  const nz = makeNoise2D(seed);
  const pos = geo.attributes.position;
  const p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    const n = p.clone().normalize();
    const d = 1 + rough * nz.fbm(n.x * 1.7 + 3, n.z * 1.7 + n.y, 3) * 2;
    p.copy(n.multiplyScalar(radius * d));
    pos.setXYZ(i, p.x * scale.x, p.y * scale.y, p.z * scale.z);
  }
  const ni = geo.index ? geo.toNonIndexed() : geo.clone();
  ni.computeVertexNormals();
  const m = new THREE.Matrix4().makeTranslation(centre.x, centre.y, centre.z);
  mb.geometry(ni, m, null, { flat: false, colorFn });
  geo.dispose();
  ni.dispose();
}

export function buildRocks(node) {
  const mb = node.mb("rock", "env_terrain_rock");
  const r = rng(77);
  const granite = (p, n) => {
    const c = col("#7e807d");
    const v = noise.fbm(p.x * 0.9 + 3, p.z * 0.9 + p.y, 3);
    c.lerp(col("#9a9a92"), Math.max(0, v) * 1.4);
    c.lerp(col("#6f7562"), Math.max(0, noise2.fbm(p.x * 0.6, p.z * 0.6 + p.y * 0.5, 2)) * 1.2); // lichen
    c.multiplyScalar(0.7 + 0.3 * Math.max(0, n.y));
    return c;
  };
  const outcrops = [
    [15, -11, 5.5, 1.2, 3.6, 0.6],
    [-17, -12, 4.5, 1.0, 3.0, -0.4],
    [21, 5, 4.0, 0.9, 3.2, 1.1],
    [-23, 7, 5.0, 1.1, 3.5, 0.2],
    [4, -19, 6.0, 1.3, 3.0, 0.3],
    [-8, -22, 4.0, 1.0, 2.6, 1.4],
    [26, -16, 6.0, 1.4, 4.0, -0.8],
    [-30, -4, 5.0, 1.2, 3.4, 0.9],
    [12, 22, 4.5, 0.8, 3.0, 0.5],
  ];
  outcrops.forEach(([x, z, sx, sy, sz, rot], i) => {
    const y = terrainHeight(x, z) - 0.62 * sy;
    const geoCentre = V(0, 0, 0);
    const tmp = new (mb.constructor)("tmp", "rock");
    flatBlob(tmp, geoCentre, 1, V(sx, sy * 0.8, sz), 2, 300 + i, null, 0.3);
    // rotate and place
    const m = new THREE.Matrix4().makeRotationY(rot).setPosition(x, y, z);
    for (let k = 0; k < tmp.positions.length; k += 3) {
      const p = V(tmp.positions[k], tmp.positions[k + 1], tmp.positions[k + 2]).applyMatrix4(m);
      const n = V(tmp.normals[k], tmp.normals[k + 1], tmp.normals[k + 2]).transformDirection(m);
      mb._push(p, n, granite(p, n));
    }
    const base = mb.vertexCount - tmp.positions.length / 3;
    tmp.indices.forEach((ix) => mb.indices.push(base + ix));
  });
  // boulders
  for (let i = 0; i < 26; i++) {
    const ang = r() * Math.PI * 2;
    const dist = 12 + r() * 30;
    const x = HOUSE_CENTRE.x + Math.cos(ang) * dist;
    const z = HOUSE_CENTRE.z + Math.sin(ang) * dist * 0.9;
    const s = 0.3 + r() * r() * 1.1;
    if (z > 5 && Math.abs(x) < 14) continue; // keep the garden lawn clear
    const y = terrainHeight(x, z) + s * 0.15;
    flatBlob(mb, V(x, y, z), s, V(1.2 + r() * 0.5, 0.65 + r() * 0.3, 1), 1, 500 + i, granite, 0.25);
  }
}

/* ---------------------------------------------------------------------------------------------- */
/* Trees                                                                                          */
/* ---------------------------------------------------------------------------------------------- */

function trunk(mb, points, r0, r1, radial, colorFn) {
  // tapered tube along a polyline
  const total = points.reduce((s, p, i) => (i ? s + p.distanceTo(points[i - 1]) : 0), 0);
  let acc = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const len = a.distanceTo(b);
    const ra = r0 + (r1 - r0) * (acc / total);
    acc += len;
    const rb = r0 + (r1 - r0) * (acc / total);
    const geo = new THREE.CylinderGeometry(rb, ra, len, radial, Math.max(1, Math.round(len / 0.6)), false);
    const dir = b.clone().sub(a).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir);
    const m = new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, V(1, 1, 1));
    mb.geometry(geo, m, null, { flat: false, colorFn });
    geo.dispose();
  }
}

export function buildBirch(name, x, z, seed) {
  const r = rng(seed);
  const node = new SceneNode(name, { kind: "birch" });
  const y0 = terrainHeight(x, z);
  node.translation = [x, y0, z];
  const H = 8 + r() * 4;
  const lean = V((r() - 0.5) * 0.5, 0, (r() - 0.5) * 0.5);
  const bark = node.mb("birch_bark", `${name}_stamme`);
  const leaf = node.mb("birch_leaf", `${name}_krone`);
  const pts = [];
  for (let k = 0; k <= 5; k++) {
    const t = k / 5;
    pts.push(V(lean.x * t * t * 2 + (r() - 0.5) * 0.12 * t, t * H, lean.z * t * t * 2 + (r() - 0.5) * 0.12 * t));
  }
  const barkColor = (p) => {
    const c = col("#e6e2d8");
    const band = noise2(p.y * 3.1 + seed, p.x * 6 + p.z * 6);
    if (band > 0.18) c.lerp(col("#2f2b29"), Math.min(1, (band - 0.18) * 4));
    if (p.y < 0.9) c.lerp(col("#3b3531"), (0.9 - p.y) / 0.9 * 0.85);
    return c;
  };
  trunk(bark, pts, 0.16 + r() * 0.05, 0.05, 7, barkColor);
  // a few branches
  const nb = 4 + Math.floor(r() * 3);
  for (let k = 0; k < nb; k++) {
    const t = 0.45 + r() * 0.35;
    const base = pts[Math.floor(t * 5)].clone();
    const ang = r() * Math.PI * 2;
    const tip = base.clone().add(V(Math.cos(ang) * 1.3, 1.4 + r(), Math.sin(ang) * 1.3));
    trunk(bark, [base, tip], 0.05, 0.02, 5, barkColor);
  }
  // crown: a tall, airy ovoid with two small side lobes. Small clumps and no
  // core, so the sky shows through like it does in a real birch.
  const top = pts[5];
  const crown = [
    { y: H * 0.7, rx: 1.5 + r() * 0.45, ry: H * 0.27, off: 0 },
    { y: H * 0.56, rx: 0.95 + r() * 0.3, ry: 1.3, off: 0.85 },
    { y: H * 0.8, rx: 0.85 + r() * 0.3, ry: 1.1, off: 0.75 },
  ];
  const lobes = crown.map((cr) => {
    const ang = r() * Math.PI * 2;
    return {
      c: V(top.x * (cr.y / H) + Math.cos(ang) * cr.off, cr.y, top.z * (cr.y / H) + Math.sin(ang) * cr.off),
      r: V(cr.rx, cr.ry, cr.rx),
    };
  });
  canopy(leaf, lobes, {
    seed: seed * 19,
    count: 230,
    size: [0.22, 0.4],
    tints: ["#6a6f58", "#70745d", "#666b55", "#767a62"],
    detail: 0,
    shell: [0.6, 1.0],
    flatten: 0.78,
    variance: 0.1,
    bottomDark: 0.42,
  });
  return node;
}

export function buildMaple(name, x, z, seed, { height = 14, spread = 6.4 } = {}) {
  const r = rng(seed);
  const node = new SceneNode(name, { kind: "maple" });
  const y0 = terrainHeight(x, z);
  node.translation = [x, y0, z];
  const bark = node.mb("maple_bark", `${name}_stamme`);
  const leaf = node.mb("maple_leaf", `${name}_krone`);
  const barkColor = (p) => {
    const c = col("#4b433b");
    c.multiplyScalar(0.8 + 0.4 * (noise.fbm(p.y * 2 + seed, p.x * 3 + p.z * 3, 2) + 0.5));
    return c;
  };
  // trunk with root flare
  const forkY = 2.6 + r() * 0.5;
  trunk(bark, [V(0, -0.2, 0), V(0, 0.5, 0)], 0.85, 0.55, 10, barkColor);
  trunk(bark, [V(0, 0.4, 0), V(0.08, forkY * 0.6, -0.05), V(0.05, forkY, 0.04)], 0.55, 0.42, 10, barkColor);
  // main limbs
  const limbs = 5 + Math.floor(r() * 2);
  const tips = [];
  for (let k = 0; k < limbs; k++) {
    const ang = (k / limbs) * Math.PI * 2 + r() * 0.5;
    const out = spread * (0.45 + r() * 0.25);
    const up = height * (0.45 + r() * 0.15);
    const mid = V(Math.cos(ang) * out * 0.45, forkY + up * 0.45, Math.sin(ang) * out * 0.45);
    const tip = V(Math.cos(ang) * out, forkY + up * 0.85, Math.sin(ang) * out);
    trunk(bark, [V(0.05, forkY - 0.2, 0.04), mid, tip], 0.3, 0.07, 8, barkColor);
    tips.push(tip);
    // secondary branches
    for (let b = 0; b < 2; b++) {
      const a2 = ang + (r() - 0.5) * 1.4;
      const t2 = mid.clone().add(V(Math.cos(a2) * 1.8, 1.4 + r() * 1.2, Math.sin(a2) * 1.8));
      trunk(bark, [mid, t2], 0.12, 0.04, 6, barkColor);
      tips.push(t2);
    }
  }
  // canopy: a broad dome of lobes around the limb tips, built from soft clumps
  // with a dark core, plus a fringe of small clumps that softens the outline
  const cy = height * 0.66;
  const centres = [];
  const nL = 11;
  for (let i = 0; i < nL; i++) {
    const a = i * 2.399963 + r() * 0.4;
    const rad = i === 0 ? 0 : spread * (0.42 + r() * 0.3);
    const yy = cy + (i === 0 ? height * 0.12 : (r() - 0.35) * height * 0.2);
    centres.push(V(Math.cos(a) * rad, yy, Math.sin(a) * rad));
  }
  tips.forEach((t) => {
    if (r() < 0.5) centres.push(t.clone().add(V(0, 0.8, 0)));
  });
  const lobes = centres.map((c) => {
    const rx = 2.4 + r() * 1.2;
    return { c, r: V(rx, rx * (0.72 + r() * 0.15), rx) };
  });
  const tints = ["#4a5445", "#505a4a", "#475043", "#565f4d", "#4d5647"];
  canopy(leaf, lobes, {
    seed: seed * 31,
    count: 430,
    size: [0.55, 1.0],
    tints,
    detail: 1,
    clumpNormal: 0.22,
    shell: [0.78, 0.98],
    flatten: 0.82,
    core: { k: 0.74, tint: "#30372f" },
    variance: 0.08,
  });
  canopy(leaf, lobes, {
    seed: seed * 37,
    count: 320,
    size: [0.24, 0.45],
    tints,
    detail: 0,
    shell: [0.95, 1.07],
    flatten: 0.8,
    variance: 0.1,
  });
  return node;
}

/** Distant ridges (backdrop), vertex coloured with aerial perspective. */
export function buildHills(node) {
  const mb = node.mb("hill", "env_hills_rygger");
  const bands = [
    { R: 150, base: 16, amp: 26, color: "#2d3a35", seed: 3, south: 0.25 },
    { R: 240, base: 30, amp: 40, color: "#3c4a4c", seed: 5, south: 0.35 },
    { R: 360, base: 50, amp: 60, color: "#53626a", seed: 9, south: 0.5 },
  ];
  for (const b of bands) {
    const nz = makeNoise2D(b.seed);
    const segs = 180;
    const top = [];
    const bot = [];
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      const x = Math.cos(a) * b.R;
      const z = Math.sin(a) * b.R;
      // lower towards the south (+z) where the fjord opens
      const southK = 1 - (1 - b.south) * smooth(-0.2, 0.9, Math.sin(a));
      const h = (b.base + b.amp * (0.55 + nz.fbm(Math.cos(a) * 3 + 10, Math.sin(a) * 3, 4))) * southK;
      top.push(V(x, h, z));
      bot.push(V(x, -12, z));
    }
    const c = col(b.color);
    const cLow = c.clone().multiplyScalar(0.85);
    for (let i = 0; i < segs; i++) {
      const centre = V(0, 0, 0); // faces point inwards (towards the house)
      mb.face([bot[i], bot[i + 1], top[i + 1], top[i]], V(top[i].x * 2, 0, top[i].z * 2), null);
      // colour the face vertices: replace last 4 colours (gradient)
      const n = mb.colors.length;
      const set = (k, cc) => {
        mb.colors[n - 12 + k * 3] = cc.r;
        mb.colors[n - 12 + k * 3 + 1] = cc.g;
        mb.colors[n - 12 + k * 3 + 2] = cc.b;
      };
      void centre;
      // order may be reversed by face(); use y to choose colour
      for (let k = 0; k < 4; k++) {
        const y = mb.positions[mb.positions.length - 12 + k * 3 + 1];
        set(k, y > 0 ? c : cLow);
      }
      mb.useColor = true;
    }
  }
}
