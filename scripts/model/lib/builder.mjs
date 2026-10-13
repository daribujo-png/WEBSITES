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
   */
  hexa(c, color, skip = {}) {
    const [b0, b1, b2, b3, t0, t1, t2, t3] = c;
    const centre = new THREE.Vector3();
    c.forEach((p) => centre.add(p));
    centre.divideScalar(8);
    if (!skip.bottom) this.face([b0, b1, b2, b3], centre, color);
    if (!skip.top) this.face([t0, t1, t2, t3], centre, color);
    this.face([b0, b1, t1, t0], centre, color);
    this.face([b1, b2, t2, t1], centre, color);
    this.face([b2, b3, t3, t2], centre, color);
    this.face([b3, b0, t0, t3], centre, color);
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
