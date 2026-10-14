/**
 * Tiny procedural mesh toolkit used by the model scripts.
 *
 * Geometry is accumulated per (part, material) in a MeshBuilder with flat
 * normals and optional vertex colours, then handed to ./gltf.mjs which writes
 * a glTF document. three.js is only used for maths and a few primitive
 * generators (icosahedron, cylinder, earcut) — nothing here needs a DOM.
 */
import * as THREE from "three";

const _v = new THREE.Vector3();
const _n = new THREE.Vector3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();

export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

/** sRGB hex → linear THREE.Color (ColorManagement converts on construction). */
export const col = (hex) => new THREE.Color(hex);

/** Deterministic PRNG (mulberry32). */
export function rng(seed = 1) {
  let s = seed >>> 0;
  const r = () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.range = (a, b) => a + (b - a) * r();
  r.pick = (arr) => arr[Math.floor(r() * arr.length)];
  return r;
}

const sharedRngs = [];

/**
 * Module-level PRNG (same API as rng) that build passes can rewind with
 * resetSharedRngs(), so every pass (high, lite) draws the same sequence.
 */
export function sharedRng(seed) {
  const st = { seed, r: rng(seed) };
  sharedRngs.push(st);
  const f = () => st.r();
  f.range = (a, b) => st.r.range(a, b);
  f.pick = (arr) => st.r.pick(arr);
  return f;
}

/** Rewind every sharedRng to its seed (call before building a scene). */
export function resetSharedRngs() {
  for (const st of sharedRngs) st.r = rng(st.seed);
}

/** Smooth value noise in 2D (deterministic, seeded). */
export function makeNoise2D(seed = 7) {
  const perm = new Uint8Array(512);
  const r = rng(seed);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const grad = (h, x, y) => {
    const g = h & 7;
    const u = g < 4 ? x : y;
    const v = g < 4 ? y : x;
    return (g & 1 ? -u : u) + (g & 2 ? -2 * v : 2 * v);
  };
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const noise = (x, y) => {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const u = fade(x);
    const v = fade(y);
    const a = perm[X] + Y;
    const b = perm[X + 1] + Y;
    const l1 = grad(perm[a], x, y) + u * (grad(perm[b], x - 1, y) - grad(perm[a], x, y));
    const l2 = grad(perm[a + 1], x, y - 1) + u * (grad(perm[b + 1], x - 1, y - 1) - grad(perm[a + 1], x, y - 1));
    return (l1 + v * (l2 - l1)) * 0.25;
  };
  noise.fbm = (x, y, oct = 4) => {
    let amp = 1;
    let f = 1;
    let sum = 0;
    let norm = 0;
    for (let i = 0; i < oct; i++) {
      sum += amp * noise(x * f, y * f);
      norm += amp;
      amp *= 0.5;
      f *= 2.03;
    }
    return sum / norm;
  };
  return noise;
}

export class MeshBuilder {
  constructor(name, material) {
    this.name = name;
    this.material = material;
    this.positions = [];
    this.normals = [];
    this.colors = [];
    this.indices = [];
    this.useColor = false;
  }

  get vertexCount() {
    return this.positions.length / 3;
  }

  _push(p, n, c) {
    this.positions.push(p.x, p.y, p.z);
    this.normals.push(n.x, n.y, n.z);
    if (c) {
      this.useColor = true;
      this.colors.push(c.r, c.g, c.b);
    } else {
      this.colors.push(1, 1, 1);
    }
    return this.vertexCount - 1;
  }

  /** Flat triangle. Normal from winding unless `normal` given. */
  tri(p0, p1, p2, color, normal) {
    const n = normal
      ? _n.copy(normal)
      : _n.copy(_a.subVectors(p1, p0)).cross(_b.subVectors(p2, p0)).normalize();
    const i0 = this._push(p0, n, color);
    const i1 = this._push(p1, n, color);
    const i2 = this._push(p2, n, color);
    this.indices.push(i0, i1, i2);
  }

  /** Flat quad p0→p1→p2→p3 (planar, counter-clockwise seen from the front). */
  quad(p0, p1, p2, p3, color) {
    _n.copy(_a.subVectors(p2, p0)).cross(_b.subVectors(p3, p1)).normalize();
    const n = _n.clone();
    const i0 = this._push(p0, n, color);
    const i1 = this._push(p1, n, color);
    const i2 = this._push(p2, n, color);
    const i3 = this._push(p3, n, color);
    this.indices.push(i0, i1, i2, i0, i2, i3);
  }

  /**
   * Planar convex polygon facing away from `inside` (a point inside the
   * solid it bounds) — winding is fixed automatically.
   */
  face(pts, inside, color) {
    if (pts.length < 3) return;
    const c = new THREE.Vector3();
    pts.forEach((p) => c.add(p));
    c.divideScalar(pts.length);
    // Newell normal (robust for any planar polygon)
    const n = new THREE.Vector3();
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      n.x += (a.y - b.y) * (a.z + b.z);
      n.y += (a.z - b.z) * (a.x + b.x);
      n.z += (a.x - b.x) * (a.y + b.y);
    }
    if (n.lengthSq() < 1e-14) return;
    n.normalize();
    let ordered = pts;
    if (inside && n.dot(_v.subVectors(c, inside)) < 0) {
      ordered = [...pts].reverse();
      n.negate();
    }
    const base = this.vertexCount;
    ordered.forEach((p) => this._push(p, n, color));
    for (let i = 1; i < ordered.length - 1; i++) this.indices.push(base, base + i, base + i + 1);
  }

  /**
   * Hexahedron from 8 corners: bottom ring b0..b3 then top ring t0..t3
   * (same order). Works for boxes, sheared boxes and tapered blocks.
   * `skip` leaves faces out: bottom, top, and the sides b0b1 (back),
   * b1b2 (end), b2b3 (front), b3b0 (start).
   */
  hexa(c, color, skip = {}) {
    const [b0, b1, b2, b3, t0, t1, t2, t3] = c;
    const centre = new THREE.Vector3();
    c.forEach((p) => centre.add(p));
    centre.divideScalar(8);
    if (!skip.bottom) this.face([b0, b1, b2, b3], centre, color);
    if (!skip.top) this.face([t0, t1, t2, t3], centre, color);
    if (!skip.back) this.face([b0, b1, t1, t0], centre, color);
    if (!skip.end) this.face([b1, b2, t2, t1], centre, color);
    if (!skip.front) this.face([b2, b3, t3, t2], centre, color);
    if (!skip.start) this.face([b3, b0, t0, t3], centre, color);
  }

  /** Axis-aligned box from min/max corners. */
  aabb(min, max, color) {
    const { x: x0, y: y0, z: z0 } = min;
    const { x: x1, y: y1, z: z1 } = max;
    this.hexa(
      [V(x0, y0, z0), V(x1, y0, z0), V(x1, y0, z1), V(x0, y0, z1), V(x0, y1, z0), V(x1, y1, z0), V(x1, y1, z1), V(x0, y1, z1)],
      color,
    );
  }

  /**
   * Vertical prism from a convex polygon in plan ([{x,z}] world) between y0
   * and y1. For concave outlines use `slab` instead.
   */
  prism(poly, y0, y1, color, skip = {}) {
    const bottom = poly.map((p) => V(p.x, y0, p.z));
    const top = poly.map((p) => V(p.x, y1, p.z));
    const centre = new THREE.Vector3();
    bottom.forEach((p) => centre.add(p));
    centre.divideScalar(bottom.length);
    centre.y = (y0 + y1) / 2;
    if (!skip.bottom) this.face(bottom, centre, color);
    if (!skip.top) this.face(top, centre, color);
    for (let i = 0; i < poly.length; i++) {
      const j = (i + 1) % poly.length;
      if (skip.sides && skip.sides.includes(i)) continue;
      this.face([bottom[i], bottom[j], top[j], top[i]], centre, color);
    }
  }

  /**
   * Horizontal slab for any simple polygon with optional holes (earcut).
   * outline/holes are arrays of {x,z}. Side walls on the outline (and holes).
   */
  slab(outline, holes, y0, y1, color, { sides = true, bottom = true } = {}) {
    const contour = outline.map((p) => new THREE.Vector2(p.x, p.z));
    const hs = (holes || []).map((h) => h.map((p) => new THREE.Vector2(p.x, p.z)));
    const tris = THREE.ShapeUtils.triangulateShape(contour, hs);
    const all = [...contour, ...hs.flat()];
    const up = V(0, 1, 0);
    const down = V(0, -1, 0);
    for (const [a, b, c] of tris) {
      const pa = all[a];
      const pb = all[b];
      const pc = all[c];
      // top: ensure upward normal
      const A = V(pa.x, y1, pa.y);
      const B = V(pb.x, y1, pb.y);
      const C = V(pc.x, y1, pc.y);
      const nY = (B.x - A.x) * (C.z - A.z) - (B.z - A.z) * (C.x - A.x);
      if (nY < 0) this.tri(A, B, C, color, up);
      else this.tri(A, C, B, color, up);
      if (bottom && y0 !== y1) {
        const A0 = V(pa.x, y0, pa.y);
        const B0 = V(pb.x, y0, pb.y);
        const C0 = V(pc.x, y0, pc.y);
        if (nY < 0) this.tri(A0, C0, B0, color, down);
        else this.tri(A0, B0, C0, color, down);
      }
    }
    if (sides && y0 !== y1) {
      const ring = (pts, outward) => {
        // signed area to know orientation
        let area = 0;
        for (let i = 0; i < pts.length; i++) {
          const p = pts[i];
          const q = pts[(i + 1) % pts.length];
          area += p.x * q.z - q.x * p.z;
        }
        const ccw = area > 0;
        for (let i = 0; i < pts.length; i++) {
          const p = pts[i];
          const q = pts[(i + 1) % pts.length];
          const dx = q.x - p.x;
          const dz = q.z - p.z;
          let nx = dz;
          let nz = -dx;
          if (!ccw) {
            nx = -nx;
            nz = -nz;
          }
          if (!outward) {
            nx = -nx;
            nz = -nz;
          }
          const n = V(nx, 0, nz).normalize();
          const p0 = V(p.x, y0, p.z);
          const p1 = V(q.x, y0, q.z);
          const p2 = V(q.x, y1, q.z);
          const p3 = V(p.x, y1, p.z);
          const base = this.vertexCount;
          [p0, p1, p2, p3].forEach((pp) => this._push(pp, n, color));
          // orient
          const fn = _n.copy(_a.subVectors(p1, p0)).cross(_b.subVectors(p3, p0));
          if (fn.dot(n) >= 0) this.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
          else this.indices.push(base, base + 2, base + 1, base, base + 3, base + 2);
        }
      };
      ring(outline, true);
      (holes || []).forEach((h) => ring(h, false));
    }
  }

  /** Append an indexed three.js BufferGeometry (after transforming by matrix). */
  geometry(geo, matrix, color, { flat = true, colorFn } = {}) {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (matrix) g.applyMatrix4(matrix);
    if (flat) g.computeVertexNormals();
    const pos = g.attributes.position;
    const nor = g.attributes.normal;
    const p = new THREE.Vector3();
    const n = new THREE.Vector3();
    const base = this.vertexCount;
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i);
      n.fromBufferAttribute(nor, i);
      const c = colorFn ? colorFn(p, n, i) : color;
      this._push(p, n, c);
    }
    for (let i = 0; i < pos.count; i++) this.indices.push(base + i);
    g.dispose();
  }

  /** Round tube along a polyline (mitre-free: one cylinder per segment + joints). */
  tube(points, radius, radial = 6, color, { caps = true } = {}) {
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      const len = a.distanceTo(b);
      if (len < 1e-5) continue;
      const geo = new THREE.CylinderGeometry(radius, radius, len, radial, 1, !caps);
      const m = new THREE.Matrix4();
      const dir = _v.subVectors(b, a).normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir);
      m.compose(a.clone().add(b).multiplyScalar(0.5), q, V(1, 1, 1));
      this.geometry(geo, m, color, { flat: false });
      geo.dispose();
    }
    if (caps) {
      for (let i = 1; i < points.length - 1; i++) {
        const geo = new THREE.SphereGeometry(radius, radial, Math.max(3, radial / 2));
        const m = new THREE.Matrix4().makeTranslation(points[i].x, points[i].y, points[i].z);
        this.geometry(geo, m, color, { flat: false });
        geo.dispose();
      }
    }
  }

  isEmpty() {
    return this.indices.length === 0;
  }
}

/**
 * Remove triangles that can never be seen because they lie deep inside another
 * closed, opaque volume of the same mesh (tree-crown clumps inside the dark core
 * or inside a neighbouring clump). Volumes are registered in `mb.solids` by the
 * crown builders as {c, inv, inner, start, end}: a point p is inside volume j when
 * |(p − c)·inv| < inner, a region that is surely contained in that volume. A
 * triangle is dropped when all three corners are inside the same other volume
 * (the region is convex, so the whole triangle is). Keeps everything else in
 * order; unused vertices are compacted when the GLB is written.
 */
export function cullBuried(mb) {
  const solids = mb.solids;
  if (!solids || !solids.length) return 0;
  const P = mb.positions;
  // spatial hash over solid bounding boxes
  const cell = 1.5;
  const grid = new Map();
  const key = (i, j, k) => `${i},${j},${k}`;
  solids.forEach((s, si) => {
    const r = [s.inner / s.inv[0], s.inner / s.inv[1], s.inner / s.inv[2]];
    const lo = s.c.map((c, a) => Math.floor((c - r[a]) / cell));
    const hi = s.c.map((c, a) => Math.floor((c + r[a]) / cell));
    for (let i = lo[0]; i <= hi[0]; i++)
      for (let j = lo[1]; j <= hi[1]; j++)
        for (let k = lo[2]; k <= hi[2]; k++) {
          const kk = key(i, j, k);
          if (!grid.has(kk)) grid.set(kk, []);
          grid.get(kk).push(si);
        }
  });
  const inside = (v, s) => {
    const dx = (P[v * 3] - s.c[0]) * s.inv[0];
    const dy = (P[v * 3 + 1] - s.c[1]) * s.inv[1];
    const dz = (P[v * 3 + 2] - s.c[2]) * s.inv[2];
    return dx * dx + dy * dy + dz * dz < s.inner * s.inner;
  };
  const owner = new Int32Array(mb.indices.length / 3).fill(-1);
  solids.forEach((s, si) => {
    for (let t = s.start; t < s.end; t += 3) owner[t / 3] = si;
  });
  const keep = [];
  let dropped = 0;
  for (let t = 0; t < mb.indices.length; t += 3) {
    const a = mb.indices[t];
    const b = mb.indices[t + 1];
    const c = mb.indices[t + 2];
    const own = owner[t / 3];
    let hidden = false;
    if (own >= 0) {
      const cx = (P[a * 3] + P[b * 3] + P[c * 3]) / 3;
      const cy = (P[a * 3 + 1] + P[b * 3 + 1] + P[c * 3 + 1]) / 3;
      const cz = (P[a * 3 + 2] + P[b * 3 + 2] + P[c * 3 + 2]) / 3;
      const list = grid.get(key(Math.floor(cx / cell), Math.floor(cy / cell), Math.floor(cz / cell))) || [];
      for (const si of list) {
        if (si === own) continue;
        const s = solids[si];
        if (inside(a, s) && inside(b, s) && inside(c, s)) {
          hidden = true;
          break;
        }
      }
    }
    if (hidden) dropped++;
    else keep.push(a, b, c);
  }
  mb.indices = keep;
  mb.solids = null;
  return dropped;
}

/** Unit directions spread evenly over the sphere (spherical Fibonacci). */
function sphereDirs(n) {
  const out = [];
  const ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * (i + 0.5)) / n;
    const r = Math.sqrt(1 - y * y);
    out.push([Math.cos(ga * i) * r, y, Math.sin(ga * i) * r]);
  }
  return out;
}

/**
 * Remove triangles that no viewer outside the object can see and that never
 * cast a shadow: a crown seen from outside its convex hull (every camera of the
 * site is far outside the trees).
 *
 * Seen: from the centroid and from three points near the corners of each
 * triangle, rays are cast over the hemisphere it faces (both hemispheres when
 * `doubleSided`). One escaping ray keeps the triangle.
 *
 * Shadows: three.js renders a single-sided material's shadow map with its
 * back faces (shadowSide = BackSide), a double-sided one with all faces. For
 * every shadow light direction in `lights` (unit vectors towards the light), a
 * triangle facing away from the light is kept when the ray from it towards the
 * light meets no other back face, i.e. when it is the surface stored in the
 * shadow map (`doubleSided`: when that ray meets nothing at all).
 *
 * Everything else is hidden from every direction and from every light, and is
 * dropped. `mbs` are the MeshBuilders of one object (e.g. a tree's leaves and
 * bark) in one coordinate frame; they occlude each other and are culled together.
 */
export function cullOccluded(mbs, { doubleSided = false, dirs = 160, cell = 0.35, lights = [] } = {}) {
  // gather triangles
  const tris = [];
  for (let m = 0; m < mbs.length; m++) {
    const { positions: P, indices: I } = mbs[m];
    for (let t = 0; t < I.length; t += 3) {
      const a = I[t] * 3;
      const b = I[t + 1] * 3;
      const c = I[t + 2] * 3;
      tris.push([P[a], P[a + 1], P[a + 2], P[b], P[b + 1], P[b + 2], P[c], P[c + 1], P[c + 2], m, t]);
    }
  }
  if (!tris.length) return 0;
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (const T of tris)
    for (let k = 0; k < 9; k++) {
      lo[k % 3] = Math.min(lo[k % 3], T[k]);
      hi[k % 3] = Math.max(hi[k % 3], T[k]);
    }
  for (let a = 0; a < 3; a++) {
    lo[a] -= 1e-3;
    hi[a] += 1e-3;
  }
  const dim = [0, 1, 2].map((a) => Math.max(1, Math.ceil((hi[a] - lo[a]) / cell)));
  const cells = new Map();
  const cid = (i, j, k) => (i * dim[1] + j) * dim[2] + k;
  tris.forEach((T, ti) => {
    const c0 = [0, 1, 2].map((a) => Math.floor((Math.min(T[a], T[a + 3], T[a + 6]) - lo[a]) / cell));
    const c1 = [0, 1, 2].map((a) => Math.floor((Math.max(T[a], T[a + 3], T[a + 6]) - lo[a]) / cell));
    for (let i = c0[0]; i <= c1[0]; i++)
      for (let j = c0[1]; j <= c1[1]; j++)
        for (let k = c0[2]; k <= c1[2]; k++) {
          const id = cid(i, j, k);
          let list = cells.get(id);
          if (!list) cells.set(id, (list = []));
          list.push(ti);
        }
  });
  const stamp = new Int32Array(tris.length).fill(-1);
  let rayId = 0;
  // Möller–Trumbore, both faces, t > eps
  const hitTri = (T, o, d) => {
    const e1x = T[3] - T[0], e1y = T[4] - T[1], e1z = T[5] - T[2];
    const e2x = T[6] - T[0], e2y = T[7] - T[1], e2z = T[8] - T[2];
    const px = d[1] * e2z - d[2] * e2y, py = d[2] * e2x - d[0] * e2z, pz = d[0] * e2y - d[1] * e2x;
    const det = e1x * px + e1y * py + e1z * pz;
    if (Math.abs(det) < 1e-12) return false;
    const inv = 1 / det;
    const tx = o[0] - T[0], ty = o[1] - T[1], tz = o[2] - T[2];
    const u = (tx * px + ty * py + tz * pz) * inv;
    if (u < 0 || u > 1) return false;
    const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x;
    const v = (d[0] * qx + d[1] * qy + d[2] * qz) * inv;
    if (v < 0 || u + v > 1) return false;
    return (e2x * qx + e2y * qy + e2z * qz) * inv > 1e-4;
  };
  // does the ray from o along d hit any triangle except `self` (and accepted by `only`)? (3D DDA through the grid)
  const blocked = (o, d, self, only = null) => {
    rayId++;
    const cellIdx = [0, 1, 2].map((a) => Math.min(dim[a] - 1, Math.max(0, Math.floor((o[a] - lo[a]) / cell))));
    const step = [0, 0, 0];
    const tMax = [Infinity, Infinity, Infinity];
    const tDelta = [Infinity, Infinity, Infinity];
    for (let a = 0; a < 3; a++) {
      if (d[a] > 0) {
        step[a] = 1;
        tMax[a] = (lo[a] + (cellIdx[a] + 1) * cell - o[a]) / d[a];
        tDelta[a] = cell / d[a];
      } else if (d[a] < 0) {
        step[a] = -1;
        tMax[a] = (lo[a] + cellIdx[a] * cell - o[a]) / d[a];
        tDelta[a] = -cell / d[a];
      }
    }
    for (;;) {
      const list = cells.get(cid(cellIdx[0], cellIdx[1], cellIdx[2]));
      if (list) {
        for (const ti of list) {
          if (ti === self || stamp[ti] === rayId) continue;
          stamp[ti] = rayId;
          if (only && !only(ti)) continue;
          if (hitTri(tris[ti], o, d)) return true;
        }
      }
      const a = tMax[0] < tMax[1] ? (tMax[0] < tMax[2] ? 0 : 2) : tMax[1] < tMax[2] ? 1 : 2;
      cellIdx[a] += step[a];
      if (cellIdx[a] < 0 || cellIdx[a] >= dim[a]) return false;
      tMax[a] += tDelta[a];
    }
  };
  const D = sphereDirs(dirs);
  const normals = tris.map((T) => {
    const e1 = [T[3] - T[0], T[4] - T[1], T[5] - T[2]];
    const e2 = [T[6] - T[0], T[7] - T[1], T[8] - T[2]];
    const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const len = Math.hypot(n[0], n[1], n[2]);
    return len < 1e-12 ? null : [n[0] / len, n[1] / len, n[2] / len];
  });
  const drop = new Set();
  tris.forEach((T, ti) => {
    const n = normals[ti];
    if (!n) return;
    const c = [(T[0] + T[3] + T[6]) / 3, (T[1] + T[4] + T[7]) / 3, (T[2] + T[5] + T[8]) / 3];
    const origins = [c];
    for (let k = 0; k < 3; k++) origins.push([0, 1, 2].map((a) => T[k * 3 + a] * 0.85 + c[a] * 0.15));
    const sides = doubleSided ? [1, -1] : [1];
    for (const side of sides) {
      for (const d of D) {
        const dn = (d[0] * n[0] + d[1] * n[1] + d[2] * n[2]) * side;
        if (dn <= 0.02) continue;
        for (const p of origins) {
          const o = [p[0] + n[0] * side * 2e-3, p[1] + n[1] * side * 2e-3, p[2] + n[2] * side * 2e-3];
          if (!blocked(o, d, ti)) return; // seen from somewhere: keep
        }
      }
    }
    // shadow casters
    for (const L of lights) {
      const nl = n[0] * L[0] + n[1] * L[1] + n[2] * L[2];
      const backFace = nl < 0;
      if (!backFace && !doubleSided) continue; // front faces are not drawn into the shadow map
      const s = nl < 0 ? -1 : 1;
      const only = doubleSided ? null : (tj) => {
        const m = normals[tj];
        return m && m[0] * L[0] + m[1] * L[1] + m[2] * L[2] < 0;
      };
      for (const p of origins) {
        const o = [p[0] + n[0] * s * 2e-3, p[1] + n[1] * s * 2e-3, p[2] + n[2] * s * 2e-3];
        if (!blocked(o, L, ti, only)) return; // stored in the shadow map: keep
      }
      if (doubleSided && backFace) {
        // the single-sided shadow pass (hero canvas) stores the nearest back face
        for (const p of origins) {
          const o = [p[0] - n[0] * 2e-3, p[1] - n[1] * 2e-3, p[2] - n[2] * 2e-3];
          const onlyBack = (tj) => {
            const m = normals[tj];
            return m && m[0] * L[0] + m[1] * L[1] + m[2] * L[2] < 0;
          };
          if (!blocked(o, L, ti, onlyBack)) return;
        }
      }
    }
    drop.add(ti);
  });
  // rebuild index lists
  const byMesh = mbs.map(() => new Set());
  for (const ti of drop) byMesh[tris[ti][9]].add(tris[ti][10]);
  mbs.forEach((mb, m) => {
    if (!byMesh[m].size) return;
    const keep = [];
    for (let t = 0; t < mb.indices.length; t += 3) if (!byMesh[m].has(t)) keep.push(mb.indices[t], mb.indices[t + 1], mb.indices[t + 2]);
    mb.indices = keep;
  });
  return drop.size;
}

/**
 * A node in the output scene: named group with optional translation, extras
 * and geometry parts (one MeshBuilder per material, each becomes a child
 * node "<node>_<part>" holding a single mesh primitive).
 */
export class SceneNode {
  constructor(name, extras = {}) {
    this.name = name;
    this.extras = extras;
    this.children = [];
    this.parts = new Map();
    this.translation = null;
  }

  add(child) {
    this.children.push(child);
    return child;
  }

  /** Child node that is itself a part group (for sub-assemblies). */
  group(name, extras = {}) {
    return this.add(new SceneNode(name, extras));
  }

  /** MeshBuilder for `material` inside sub-part `partName` (default: node name). */
  mb(material, partName) {
    const key = `${partName || ""}::${material}`;
    if (!this.parts.has(key)) {
      const nodeName = partName || `${this.name}_${material}`;
      this.parts.set(key, new MeshBuilder(nodeName, material));
    }
    return this.parts.get(key);
  }
}

/** Planar point helpers for the bent plan. */
export function P(x, z) {
  return { x, z };
}

/** Clip a 1D interval [a,b] to [lo,hi]; returns null if empty. */
export function clip1(a, b, lo, hi) {
  const s = Math.max(a, lo);
  const e = Math.min(b, hi);
  return e - s > 1e-6 ? [s, e] : null;
}

/** Subtract a list of [s,e] intervals from [a,b]. Returns remaining pieces. */
export function subtractIntervals(a, b, cuts) {
  let pieces = [[a, b]];
  for (const [s, e] of cuts) {
    const next = [];
    for (const [p, q] of pieces) {
      if (e <= p || s >= q) {
        next.push([p, q]);
        continue;
      }
      if (s > p) next.push([p, s]);
      if (e < q) next.push([e, q]);
    }
    pieces = next;
  }
  return pieces.filter(([p, q]) => q - p > 1e-4);
}

/**
 * Decompose a wall rectangle [u0,u1]×[y0,y1] minus rectangular openings into
 * non-overlapping rectangles (vertical strips split by openings).
 */
export function rectMinusOpenings(u0, u1, y0, y1, openings) {
  const xs = new Set([u0, u1]);
  for (const o of openings) {
    if (o.u1 <= u0 || o.u0 >= u1) continue;
    xs.add(Math.max(u0, o.u0));
    xs.add(Math.min(u1, o.u1));
  }
  const sorted = [...xs].sort((a, b) => a - b);
  const rects = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (b - a < 1e-4) continue;
    const mid = (a + b) / 2;
    const cuts = openings.filter((o) => o.u0 < mid && o.u1 > mid).map((o) => [o.y0, o.y1]);
    for (const [s, e] of subtractIntervals(y0, y1, cuts)) rects.push({ u0: a, u1: b, y0: s, y1: e });
  }
  return rects;
}
