/**
 * house.js — procedural Three.js scene for Bygg og Renovering Vest AS (Bergen).
 *
 * A modern Norwegian enebolig is built from an empty plot as a PURE FUNCTION of
 * build progress p ∈ [0,1] (scrub forwards and backwards). The same scene also
 * serves the loader (blueprint wireframe tracing itself in), the intro behind
 * the footage reel, and an idle orbit.
 *
 * Public contract (see createHouseScene):
 *   setLoadProgress(p) setBuildProgress(p) setMode(mode) setPointer(x, y)
 *   getStages() resize() setActive(bool) dispose()
 */
import * as THREE from 'three';
import { RoomEnvironment } from '../vendor/addons/RoomEnvironment.js';

/* ======================================================================= */
/* Stages                                                                  */
/* ======================================================================= */

const STAGES = [
  { id: 'tomt', start: 0.0, end: 0.06 },
  { id: 'grunnmur', start: 0.06, end: 0.16 },
  { id: 'bindingsverk', start: 0.16, end: 0.3 },
  { id: 'bjelkelag', start: 0.3, end: 0.38 },
  { id: 'takstoler', start: 0.38, end: 0.5 },
  { id: 'kledning', start: 0.5, end: 0.64 },
  { id: 'vinduer', start: 0.64, end: 0.72 },
  { id: 'tak', start: 0.72, end: 0.84 },
  { id: 'innredning', start: 0.84, end: 0.93 },
  { id: 'nokkelferdig', start: 0.93, end: 1.0 },
];
const ST = {};
for (const s of STAGES) ST[s.id] = s;
/** global progress window from stage-local fractions */
const win = (id, a = 0, b = 1) => {
  const s = ST[id];
  const d = s.end - s.start;
  return [s.start + a * d, s.start + b * d];
};

/* ======================================================================= */
/* Small math helpers (no allocation)                                      */
/* ======================================================================= */

const TAU = Math.PI * 2;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const range = (v, a, b) => clamp01((v - a) / (b - a));
const smooth = (t) => t * t * (3 - 2 * t);
const outCubic = (t) => 1 - (1 - t) * (1 - t) * (1 - t);
const outBack = (t) => {
  const c = 1.15;
  const u = t - 1;
  return 1 + (c + 1) * u * u * u + c * u * u;
};
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (dt, lambda) => 1 - Math.exp(-lambda * dt);
const catmull = (p0, p1, p2, p3, t) => {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
};
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ======================================================================= */
/* House dimensions (metres). Long axis = x, gable ends at ±x.             */
/* ======================================================================= */

const PITCH = (40 * Math.PI) / 180;
const TP = Math.tan(PITCH);
const CP = Math.cos(PITCH);
const SP = Math.sin(PITCH);
const HZ = 3.5; // wall reference line (half width)
const SX = 5.95; // stud outer face, gables
const SZ = 3.45; // stud outer face, long walls
const FT = 0.6; // foundation top = ground floor level
const GF_TOP = 3.3; // top of ground floor wall plates
const JOIST = 0.25;
const UF_BASE = GF_TOP + JOIST + 0.022; // upper floor level
const EH = 6.0; // top of upper wall plates
const HEEL = 0.25;
const EAVE_Z = 3.83; // horizontal reach of roof at the eaves
const GABLE_X = 6.26; // horizontal reach of roof at the gables
const RAFTER = 0.198;
const RV = RAFTER / CP; // vertical depth of a rafter
const yTop = (a) => EH + HEEL + (HZ - a) * TP; // top of rafters at |z| = a
const RIDGE = yTop(0);
const ROOF_T = 0.035;
const CLAD_BASE = 0.52;
const CLAD_TOP = 6.22;
const DECK_X1 = 9.6;
const GLAZE = 2.375;
const glazeTop = (u) => yTop(Math.abs(u)) - 0.3;

/* Openings (u = x on long walls, u = z on gables). Edges sit on the cladding
   grid (k·0.25 + 0.125) so board splits land on seams. */
const OPENINGS = [
  // front (+z): door, ground floor windows, upper floor windows
  { wall: 'front', u0: -4.625, u1: -3.625, y0: FT, y1: 2.85, kind: 'door' },
  { wall: 'front', u0: -2.375, u1: -1.875, y0: 0.9, y1: 3.0 },
  { wall: 'front', u0: -1.625, u1: -1.125, y0: 0.9, y1: 3.0 },
  { wall: 'front', u0: 1.125, u1: 1.875, y0: 0.9, y1: 3.0 },
  { wall: 'front', u0: 3.125, u1: 3.875, y0: 0.9, y1: 3.0 },
  { wall: 'front', u0: -4.375, u1: -3.875, y0: 3.9, y1: 5.75 },
  { wall: 'front', u0: -2.375, u1: -1.875, y0: 3.9, y1: 5.75 },
  { wall: 'front', u0: -0.375, u1: 0.125, y0: 3.9, y1: 5.75 },
  { wall: 'front', u0: 1.625, u1: 2.125, y0: 3.9, y1: 5.75 },
  { wall: 'front', u0: 3.625, u1: 4.125, y0: 3.9, y1: 5.75 },
  // back (-z)
  { wall: 'back', u0: -3.125, u1: -2.625, y0: 0.9, y1: 3.0 },
  { wall: 'back', u0: 0.625, u1: 1.125, y0: 0.9, y1: 3.0 },
  { wall: 'back', u0: 2.875, u1: 3.375, y0: 0.9, y1: 3.0 },
  { wall: 'back', u0: -1.875, u1: -1.375, y0: 3.9, y1: 5.75 },
  { wall: 'back', u0: 1.875, u1: 2.375, y0: 3.9, y1: 5.75 },
  // left gable (-x): stacked slot windows
  { wall: 'left', u0: -0.375, u1: 0.375, y0: 0.9, y1: 3.0 },
  { wall: 'left', u0: -0.375, u1: 0.375, y0: 3.9, y1: 5.75 },
  { wall: 'left', u0: -0.375, u1: 0.375, y0: 6.6, y1: 7.9 },
  // right gable (+x): full-height glazed gable
  { wall: 'right', u0: -GLAZE, u1: GLAZE, y0: 0.65, y1: 9.0, top: glazeTop, kind: 'glaze' },
];
const OPEN = { front: [], back: [], right: [], left: [] };
for (const o of OPENINGS) OPEN[o.wall].push(o);
const WALLS = ['front', 'right', 'back', 'left'];
const WALL = {
  front: { n: 1, gable: false, flip: 1, rot: 0 },
  back: { n: -1, gable: false, flip: -1, rot: Math.PI },
  right: { n: 1, gable: true, flip: -1, rot: Math.PI / 2 },
  left: { n: -1, gable: true, flip: 1, rot: -Math.PI / 2 },
};
const openTop = (o, ua, ub) => (o.top ? Math.max(o.top(ua), o.top(ub)) : o.y1);

/** vertical member at u-range [ua,ub], y-range [ya,yb]: subtract openings → segments */
function cutColumn(wall, ua, ub, ya, yb, padBelow, padAbove, minLen) {
  let segs = [[ya, yb]];
  for (const o of OPEN[wall]) {
    if (!(o.u0 < ub - 1e-4 && o.u1 > ua + 1e-4)) continue;
    const c0 = o.y0 - padBelow;
    const c1 = openTop(o, ua, ub) + padAbove;
    const next = [];
    for (const s of segs) {
      if (c1 <= s[0] || c0 >= s[1]) {
        next.push(s);
        continue;
      }
      if (c0 > s[0]) next.push([s[0], c0]);
      if (c1 < s[1]) next.push([c1, s[1]]);
    }
    segs = next;
  }
  return segs.filter((s) => s[1] - s[0] >= minLen);
}
/** horizontal member at u-range [ua,ub], y-range [ya,yb]: subtract openings → u segments */
function cutRow(wall, ua, ub, ya, yb, pad, minLen) {
  let segs = [[ua, ub]];
  for (const o of OPEN[wall]) {
    const top = o.top ? o.top(o.u0) : o.y1;
    if (!(o.y0 < yb - 1e-4 && top > ya + 1e-4)) continue;
    const c0 = o.u0 - pad;
    const c1 = o.u1 + pad;
    const next = [];
    for (const s of segs) {
      if (c1 <= s[0] || c0 >= s[1]) {
        next.push(s);
        continue;
      }
      if (c0 > s[0]) next.push([s[0], c0]);
      if (c1 < s[1]) next.push([c1, s[1]]);
    }
    segs = next;
  }
  return segs.filter((s) => s[1] - s[0] >= minLen);
}

/* ======================================================================= */
/* Geometry helpers (setup time only)                                      */
/* ======================================================================= */

const V_UP = new THREE.Vector3(0, 1, 0);
const V_X = new THREE.Vector3(1, 0, 0);
const _o1 = new THREE.Vector3();
const _o2 = new THREE.Vector3();
const _o3 = new THREE.Vector3();
const _om = new THREE.Matrix4();

/** quaternion whose local +Y = dir and local +Z ≈ zHint */
function orientQ(dir, zHint, out = new THREE.Quaternion()) {
  const Y = _o1.copy(dir).normalize();
  let h = zHint;
  if (Math.abs(h.dot(Y)) > 0.98) h = Math.abs(V_X.dot(Y)) > 0.9 ? new THREE.Vector3(0, 0, 1) : V_X;
  const Z = _o2.copy(h).addScaledVector(Y, -h.dot(Y)).normalize();
  const X = _o3.crossVectors(Y, Z);
  _om.makeBasis(X, Y, Z);
  return out.setFromRotationMatrix(_om);
}
function boxAt(w, h, d, x, y, z) {
  return new THREE.BoxGeometry(w, h, d).translate(x, y, z);
}
/** box from a→b (centre line), cross-section w (local X) × d (local Z) */
function beamGeo(ax, ay, az, bx, by, bz, w, d, zHint = V_UP) {
  const a = new THREE.Vector3(ax, ay, az);
  const b = new THREE.Vector3(bx, by, bz);
  const dir = b.clone().sub(a);
  const len = dir.length();
  const g = new THREE.BoxGeometry(w, len, d);
  const q = orientQ(dir, zHint);
  const m = new THREE.Matrix4().compose(a.add(b).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1));
  return g.applyMatrix4(m);
}
function paint(g, hex) {
  const c = new THREE.Color(hex);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}
/** merge geometries (position, normal, color) into one indexed geometry */
function merge(list) {
  let nv = 0;
  let ni = 0;
  for (const g of list) {
    nv += g.attributes.position.count;
    ni += g.index ? g.index.count : g.attributes.position.count;
  }
  const pos = new Float32Array(nv * 3);
  const nor = new Float32Array(nv * 3);
  const col = new Float32Array(nv * 3).fill(1);
  const idx = new Uint32Array(ni);
  let vo = 0;
  let io = 0;
  for (const g of list) {
    const p = g.attributes.position;
    pos.set(p.array, vo * 3);
    if (g.attributes.normal) nor.set(g.attributes.normal.array, vo * 3);
    if (g.attributes.color) col.set(g.attributes.color.array, vo * 3);
    if (g.index) {
      const a = g.index.array;
      for (let i = 0; i < a.length; i++) idx[io + i] = a[i] + vo;
      io += a.length;
    } else {
      for (let i = 0; i < p.count; i++) idx[io + i] = vo + i;
      io += p.count;
    }
    vo += p.count;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  out.computeBoundingSphere();
  return out;
}
/** unit box with its base at y = 0 (growth axis = local +Y) */
const baseBox = () => new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);

/* ======================================================================= */
/* Animated instanced parts                                                */
/* ======================================================================= */

const A_GROW = 0; // scale local Y 0 → 1
const A_DROP = 1; // fall from above, settle
const A_POP = 2; // scale around anchor with overshoot
const A_SWING = 3; // drop + rotate about world Z (trusses)

const _m4 = new THREE.Matrix4();
const _pv = new THREE.Vector3();
const _sv = new THREE.Vector3();
const _qa = new THREE.Quaternion();
const _qb = new THREE.Quaternion();
const _AXZ = new THREE.Vector3(0, 0, 1);
const ZERO_M = new THREE.Matrix4().makeScale(0, 0, 0);

/** item helper: position, scale, quaternion (or null), order 0..1, color (or null), anchor (or null) */
const it = (p, s, o, q = null, c = null, a = null) => ({ p, s, o, q, c, a });

class Part {
  constructor(name, geometry, material, items, opts) {
    const n = Math.max(1, items.length);
    const mesh = new THREE.InstancedMesh(geometry, material, n);
    mesh.name = name;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    mesh.castShadow = opts.cast !== false;
    mesh.receiveShadow = opts.receive !== false;
    mesh.visible = false;
    this.mesh = mesh;
    this.n = items.length;
    this.P = new Float32Array(n * 3);
    this.Q = new Float32Array(n * 4);
    this.S = new Float32Array(n * 3);
    this.A = new Float32Array(n * 3);
    this.O = new Float32Array(n);
    this.win = opts.win;
    this.out = opts.out || null;
    this.dur = opts.dur ?? 0.3;
    this.outDur = opts.outDur ?? 0.35;
    this.anim = opts.anim ?? A_GROW;
    this.drop = opts.drop ?? 2;
    this.swing = opts.swing ?? 1.3;
    this.lastL = -1;
    this.lastO = -1;
    this.hideAt = opts.hideAt ?? 2;
    for (let i = 0; i < items.length; i++) {
      const t = items[i];
      this.P.set(t.p, i * 3);
      this.S.set(t.s, i * 3);
      if (t.q) this.Q.set([t.q.x, t.q.y, t.q.z, t.q.w], i * 4);
      else this.Q[i * 4 + 3] = 1;
      this.A.set(t.a || t.p, i * 3);
      this.O[i] = clamp01(t.o);
      if (t.c) mesh.setColorAt(i, t.c);
      mesh.setMatrixAt(i, ZERO_M);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.count = items.length;
  }

  /** deterministic state for global build progress p; returns true if anything changed */
  update(p) {
    if (p >= this.hideAt) {
      const was = this.mesh.visible;
      this.mesh.visible = false;
      this.lastL = -1;
      return was;
    }
    const L = range(p, this.win[0], this.win[1]);
    const Lo = this.out ? range(p, this.out[0], this.out[1]) : 0;
    if (L === this.lastL && Lo === this.lastO) return false;
    this.lastL = L;
    this.lastO = Lo;
    const mesh = this.mesh;
    if (L <= 0 || Lo >= 1 || this.n === 0) {
      mesh.visible = false;
      return true;
    }
    mesh.visible = true;
    const { P, Q, S, A, O, dur, outDur, anim } = this;
    const span = 1 - dur;
    const ospan = 1 - outDur;
    for (let i = 0; i < this.n; i++) {
      let t = clamp01((L - O[i] * span) / dur);
      if (Lo > 0) {
        const r = clamp01((Lo - (1 - O[i]) * ospan) / outDur);
        if (1 - r < t) t = 1 - r;
      }
      if (t <= 0) {
        mesh.setMatrixAt(i, ZERO_M);
        continue;
      }
      const i3 = i * 3;
      const i4 = i * 4;
      _pv.set(P[i3], P[i3 + 1], P[i3 + 2]);
      _sv.set(S[i3], S[i3 + 1], S[i3 + 2]);
      _qa.set(Q[i4], Q[i4 + 1], Q[i4 + 2], Q[i4 + 3]);
      if (anim === A_GROW) {
        _sv.y *= outCubic(t);
      } else if (anim === A_DROP) {
        const e = outBack(t);
        const k = t < 0.22 ? smooth(t / 0.22) : 1;
        _pv.y += (1 - e) * this.drop;
        _sv.multiplyScalar(k);
      } else if (anim === A_POP) {
        const e = Math.max(0.0001, outBack(t));
        _pv.set(A[i3] + (_pv.x - A[i3]) * e, A[i3 + 1] + (_pv.y - A[i3 + 1]) * e, A[i3 + 2] + (_pv.z - A[i3 + 2]) * e);
        _sv.multiplyScalar(e);
      } else if (anim === A_SWING) {
        const e = outCubic(t);
        const k = t < 0.15 ? smooth(t / 0.15) : 1;
        _pv.y += (1 - e) * this.drop;
        _qb.setFromAxisAngle(_AXZ, (1 - e) * this.swing);
        _qa.premultiply(_qb);
        _sv.multiplyScalar(k);
      }
      _m4.compose(_pv, _qa, _sv);
      mesh.setMatrixAt(i, _m4);
    }
    mesh.instanceMatrix.needsUpdate = true;
    return true;
  }
}

/* ======================================================================= */
/* Shaders                                                                 */
/* ======================================================================= */

const BLUEPRINT_VS = /* glsl */ `
attribute vec3 aOther;
attribute float aEnd;
attribute float aOrder;
attribute vec3 color;
uniform float uReveal;
uniform float uWin;
uniform float uOpacity;
uniform vec3 uHot;
varying vec3 vCol;
varying float vA;
void main() {
  float age = uReveal - aOrder;
  float f = clamp(age / uWin, 0.0, 1.0);
  vec3 p = aEnd > 0.5 ? mix(aOther, position, f) : position;
  float hot = (f > 0.0) ? 1.0 - smoothstep(0.0, uWin * 2.5, age - uWin) : 0.0;
  vCol = mix(color, uHot, hot * 0.9);
  vA = step(0.0001, f) * uOpacity * (1.0 + hot * 1.2);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;
const BLUEPRINT_FS = /* glsl */ `
varying vec3 vCol;
varying float vA;
void main() {
  gl_FragColor = vec4(vCol, clamp(vA, 0.0, 1.0));
  #include <colorspace_fragment>
}`;
const NODES_VS = /* glsl */ `
attribute float aOrder;
attribute vec3 color;
uniform float uReveal;
uniform float uWin;
uniform float uOpacity;
uniform float uSize;
uniform vec3 uHot;
varying vec3 vCol;
varying float vA;
void main() {
  float age = uReveal - aOrder;
  float f = clamp(age / uWin, 0.0, 1.0);
  float hot = (f > 0.0) ? 1.0 - smoothstep(0.0, uWin * 3.0, age - uWin) : 0.0;
  vCol = mix(color, uHot, hot);
  vA = step(0.0001, f) * uOpacity;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = uSize * (0.55 + 0.45 * f + hot * 1.4);
  gl_Position = projectionMatrix * mv;
}`;
const NODES_FS = /* glsl */ `
varying vec3 vCol;
varying float vA;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float a = smoothstep(0.5, 0.0, d);
  a = a * a * 0.9 + step(d, 0.13) * 0.6;
  gl_FragColor = vec4(vCol, a * vA);
  #include <colorspace_fragment>
}`;
const RAIN_VS = /* glsl */ `
attribute float aTail;
attribute float aSpeed;
uniform float uTime;
uniform float uH;
uniform float uLen;
uniform float uOpacity;
varying float vA;
void main() {
  float y = mod(position.y - uTime * aSpeed, uH);
  vec3 p = vec3(position.x - y * 0.09, y + aTail * uLen, position.z - y * 0.03);
  p.x += aTail * uLen * 0.2;
  p.z += aTail * uLen * 0.06;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float dist = -mv.z;
  float fade = smoothstep(0.0, 2.0, y) * (1.0 - smoothstep(uH - 4.0, uH, y));
  fade *= smoothstep(1.5, 5.0, dist) * (1.0 - smoothstep(26.0, 46.0, dist));
  vA = uOpacity * fade * (1.0 - aTail * 0.85);
  gl_Position = projectionMatrix * mv;
}`;
const RAIN_FS = /* glsl */ `
uniform vec3 uColor;
varying float vA;
void main() {
  gl_FragColor = vec4(uColor, vA);
  #include <colorspace_fragment>
}`;
const SKY_VS = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = vec4(p.xy, p.w * 0.99999, p.w);
}`;
const SKY_FS = /* glsl */ `
uniform vec3 uTop;
uniform vec3 uHorizon;
uniform vec3 uGlow;
uniform vec3 uGlowDir;
uniform float uLevel;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 col = mix(uHorizon, uTop, smoothstep(-0.01, 0.42, h));
  vec2 hd = normalize(d.xz + 1e-5);
  float g = max(dot(hd, normalize(uGlowDir.xz)), 0.0);
  col += uGlow * pow(g, 3.0) * (1.0 - smoothstep(0.0, 0.3, abs(h)));
  col = mix(col, uTop, smoothstep(0.0, -0.12, h));
  gl_FragColor = vec4(col * uLevel, 1.0);
  #include <colorspace_fragment>
}`;
const MIST_VS = /* glsl */ `
varying float vY;
void main() {
  vY = uv.y;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const MIST_FS = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uLevel;
varying float vY;
void main() {
  float a = pow(1.0 - vY, 2.4) * uOpacity;
  gl_FragColor = vec4(uColor * uLevel, a);
  #include <colorspace_fragment>
}`;

/* ======================================================================= */
/* Camera paths                                                            */
/* ======================================================================= */

// [p, azimuth, camY, radius, lookY, lookX] — azimuth 0 = front (+z), π/2 = glazed gable (+x)
const CAM_KEYS = [
  [0.0, 1.0, 1.8, 24.0, 3.4, 0.6],
  [0.06, 0.92, 2.2, 20.0, 2.0, 0.4],
  [0.16, 0.74, 4.2, 18.5, 1.7, 0.2],
  [0.3, 0.42, 8.5, 20.0, 2.5, 0.0],
  [0.38, 0.2, 13.0, 19.5, 3.0, 0.0],
  [0.5, 0.02, 9.0, 22.5, 4.4, 0.0],
  [0.64, 0.34, 4.8, 22.5, 3.8, 0.3],
  [0.72, 0.8, 4.2, 22.0, 3.7, 0.8],
  [0.84, 0.42, 12.5, 24.5, 4.3, 0.6],
  [0.93, 1.12, 3.0, 20.5, 3.4, 1.6],
  [1.0, 0.84, 4.4, 27.5, 3.8, 1.4],
];
const camParam = new Float32Array(5);
function camAt(p, out) {
  const n = CAM_KEYS.length;
  let i = 0;
  while (i < n - 2 && p > CAM_KEYS[i + 1][0]) i++;
  const k0 = CAM_KEYS[i > 0 ? i - 1 : 0];
  const k1 = CAM_KEYS[i];
  const k2 = CAM_KEYS[i + 1];
  const k3 = CAM_KEYS[i + 2 < n ? i + 2 : n - 1];
  const t = smooth(clamp01((p - k1[0]) / (k2[0] - k1[0])));
  for (let j = 1; j < 6; j++) out[j - 1] = catmull(k0[j], k1[j], k2[j], k3[j], t);
  return out;
}

/* ======================================================================= */
/* createHouseScene                                                        */
/* ======================================================================= */

export function createHouseScene({ canvas, reducedMotion = false, isMobile = false } = {}) {
  if (!canvas || typeof window === 'undefined') return null;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !isMobile,
      alpha: false,
      powerPreference: 'high-performance',
    });
    if (!renderer.getContext()) throw new Error('no context');
  } catch (err) {
    try {
      renderer && renderer.dispose();
    } catch (e) {
      /* ignore */
    }
    return null;
  }

  const BG = 0x0b0c0c;
  const dprCap = isMobile ? 1.25 : 1.75;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
  renderer.setClearColor(BG, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.FogExp2(BG, 0.0072);

  const camera = new THREE.PerspectiveCamera(35, 16 / 9, 0.3, 900);
  camera.position.set(14, 6, 16);

  const rnd = mulberry32(60425);

  /* ------------------------------------------------------------ env + lights */
  let envTex = null;
  try {
    const pm = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    envTex = pm.fromScene(room, 0.04).texture;
    room.dispose();
    pm.dispose();
  } catch (e) {
    envTex = null;
  }
  scene.environment = envTex;
  const ENV_BASE = 0.3;
  scene.environmentIntensity = ENV_BASE;

  const hemi = new THREE.HemisphereLight(0xc2cfda, 0x221f1b, 1.05);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xdfe8ef, 2.1);
  key.position.set(-15, 15.5, 13);
  key.target.position.set(0.5, 3, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(isMobile ? 1024 : 2048, isMobile ? 1024 : 2048);
  const sc = key.shadow.camera;
  sc.left = -15;
  sc.right = 15;
  sc.top = 14;
  sc.bottom = -12;
  sc.near = 4;
  sc.far = 60;
  key.shadow.bias = -0.00025;
  key.shadow.normalBias = 0.025;
  key.shadow.radius = 3;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0x93aabd, 0.75);
  rim.position.set(16, 9, -14);
  scene.add(rim);
  const LIGHT_BASE = { hemi: hemi.intensity, key: key.intensity, rim: rim.intensity };

  const WARM = 0xffbd80;
  const pGF = new THREE.PointLight(WARM, 0, 11, 2);
  pGF.position.set(1.4, 2.4, 0.2);
  const pUF = new THREE.PointLight(WARM, 0, 11, 2);
  pUF.position.set(-2.2, 5.5, 0);
  const pVoid = new THREE.PointLight(WARM, 0, 10, 2);
  pVoid.position.set(4.7, 4.6, 0);
  const spot = new THREE.SpotLight(WARM, 0, 18, 0.9, 1, 1.4);
  spot.position.set(5.3, 5.4, 0);
  spot.target.position.set(10.5, 0, 0);
  scene.add(pGF, pUF, pVoid, spot, spot.target);

  /* --------------------------------------------------------------- materials */
  const mat = {
    ground: new THREE.MeshStandardMaterial({ color: 0x151817, roughness: 1 }),
    gravel: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 1,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
    concrete: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92 }),
    wood: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }),
    clad: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.72 }),
    wrap: new THREE.MeshStandardMaterial({ color: 0xa7acab, roughness: 0.92 }),
    frame: new THREE.MeshStandardMaterial({ color: 0x18191b, roughness: 0.4, metalness: 0.5 }),
    glass: new THREE.MeshStandardMaterial({
      color: 0x1c2830,
      roughness: 0.05,
      metalness: 0.15,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      emissive: 0xffa35c,
      emissiveIntensity: 0,
    }),
    roof: new THREE.MeshStandardMaterial({ color: 0x2b2f32, roughness: 0.38, metalness: 0.65 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xa3a9ad, roughness: 0.45, metalness: 0.7 }),
    interior: new THREE.MeshStandardMaterial({ color: 0x2b2722, roughness: 0.92, emissive: 0xffb06a, emissiveIntensity: 0 }),
    // (interior colour is blended dark → warm white as the lights come on)
    furn: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82 }),
    lamp: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6, emissive: 0xffb46e, emissiveIntensity: 0 }),
    veg: new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 }),
    crane: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.3 }),
  };
  const gableGlassMat = mat.glass.clone();
  gableGlassMat.side = THREE.DoubleSide;
  // explicitly env-mapped materials (stronger reflections than the scene default)
  const ENV_MATS = [
    [mat.glass, 1.7],
    [gableGlassMat, 1.7],
    [mat.roof, 0.85],
    [mat.frame, 0.7],
    [mat.steel, 0.6],
  ];
  if (envTex) for (const [m, k] of ENV_MATS) {
    m.envMap = envTex;
    m.envMapIntensity = k;
  }

  const col = (hex, jitter = 0, hue = 0) => {
    const c = new THREE.Color(hex);
    if (jitter || hue) c.offsetHSL((rnd() - 0.5) * hue, 0, (rnd() - 0.5) * jitter);
    return c;
  };
  const PINE = 0xd6b88d;
  const PINE_DARK = 0xc7a676;
  const OSB = 0xc6a26a;
  const BLACK = 0x1e1f1f;

  const parts = [];
  const addPart = (name, geo, material, items, opts) => {
    const p = new Part(name, geo, material, items, opts);
    parts.push(p);
    scene.add(p.mesh);
    return p;
  };
  const QW = {};
  for (const w of WALLS) QW[w] = new THREE.Quaternion().setFromAxisAngle(V_UP, WALL[w].rot);
  /** wall-local (u, y, depth) → world position array */
  const wp = (wall, u, y, d) => (WALL[wall].gable ? [WALL[wall].n * d, y, u] : [u, y, WALL[wall].n * d]);
  /** wall-local sizes (along u, y, along normal) → world scale array */
  const ws = (wall, su, sy, sn) => (WALL[wall].gable ? [sn, sy, su] : [su, sy, sn]);
  const wallIndex = (w) => WALLS.indexOf(w);
  const wallHalf = (w) => (WALL[w].gable ? 3.302 : SX);

  const unitBase = baseBox();
  const unitCenter = new THREE.BoxGeometry(1, 1, 1);
  const unitPlane = new THREE.PlaneGeometry(1, 1);

  /* ================================================================= SITE */
  const site = new THREE.Group();
  scene.add(site);

  // ground
  const ground = new THREE.Mesh(new THREE.CircleGeometry(260, 72).rotateX(-Math.PI / 2), mat.ground);
  ground.receiveShadow = true;
  site.add(ground);

  // survey grid (fades radially)
  const gridMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    toneMapped: false,
  });
  {
    const pos = [];
    const cols = [];
    const R = 42;
    const step = 2;
    const base = new THREE.Color(0x9fb2bf);
    const pushV = (x, z, major) => {
      const r = Math.hypot(x, z) / R;
      const f = Math.pow(Math.max(0, 1 - r), 1.6) * (major ? 1 : 0.5);
      pos.push(x, 0.016, z);
      cols.push(base.r * f, base.g * f, base.b * f);
    };
    for (let i = -R; i <= R; i += step) {
      const major = i % 10 === 0;
      for (let j = -R; j < R; j += step) {
        if (Math.hypot(i, j) > R + 2) continue;
        pushV(i, j, major);
        pushV(i, j + step, major);
        pushV(j, i, major);
        pushV(j + step, i, major);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    const grid = new THREE.LineSegments(g, gridMat);
    grid.renderOrder = 1;
    site.add(grid);
  }

  // sky dome
  const skyMat = new THREE.ShaderMaterial({
    uniforms: {
      uTop: { value: new THREE.Color(0x0b0c0c) },
      uHorizon: { value: new THREE.Color(0x1c252c) },
      uGlow: { value: new THREE.Color(0x2c3b46) },
      uGlowDir: { value: new THREE.Vector3(-0.78, 0, -0.62) },
      uLevel: { value: 1 },
    },
    vertexShader: SKY_VS,
    fragmentShader: SKY_FS,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), skyMat);
  sky.renderOrder = -10;
  sky.frustumCulled = false;
  scene.add(sky);

  // layered fjord mountains (ring angle a: x = cos a·R, z = sin a·R)
  const FJORD_A = Math.atan2(-0.62, -0.78) + TAU;
  const mountainMats = [];
  function mountainRing(R, baseH, amp, seed, hex, peaks) {
    const r = mulberry32(seed);
    const waves = [];
    for (let k = 0; k < 11; k++) waves.push({ f: Math.round((2 + r() * 3) * (1 + k * 1.15)), a: (amp / (1 + k * 0.85)) * (0.5 + r() * 0.7), ph: r() * TAU, ridge: k > 3 });
    const peakList = [];
    for (let k = 0; k < peaks; k++) peakList.push({ c: r() * TAU, w: 0.05 + r() * 0.12, h: amp * (0.5 + r() * 0.9) });
    const seg = 240;
    const pos = [];
    const idx = [];
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * TAU;
      let h = baseH;
      for (const w of waves) h += w.ridge ? w.a * (0.5 - Math.abs(Math.sin(w.f * a + w.ph))) * 1.4 : w.a * Math.sin(w.f * a + w.ph);
      for (const pk of peakList) {
        let d = Math.abs(a - pk.c);
        d = Math.min(d, TAU - d);
        h += pk.h * Math.exp(-(d * d) / (2 * pk.w * pk.w));
      }
      // open a fjord gap toward the glow on the horizon
      let dg = Math.abs(a - FJORD_A);
      dg = Math.min(dg, TAU - dg);
      h *= 1 - 0.62 * Math.exp(-(dg * dg) / (2 * 0.22 * 0.22));
      h = Math.max(baseH * 0.2, h);
      const x = Math.cos(a) * R;
      const z = Math.sin(a) * R;
      pos.push(x, -3, z, x, h, z);
      if (i < seg) {
        const b = i * 2;
        idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    const m = new THREE.MeshBasicMaterial({ color: hex, fog: false, side: THREE.DoubleSide });
    m.userData.base = m.color.clone();
    mountainMats.push(m);
    const mesh = new THREE.Mesh(g, m);
    mesh.frustumCulled = false;
    scene.add(mesh);
  }
  mountainRing(250, 30, 22, 11, 0x19222a, 5);
  mountainRing(185, 19, 17, 23, 0x131a1f, 6);
  mountainRing(135, 9, 11, 37, 0x0e1215, 5);

  const mistMats = [];
  function mist(R, H, hex, op) {
    const m = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(hex) }, uOpacity: { value: op }, uLevel: { value: 1 } },
      vertexShader: MIST_VS,
      fragmentShader: MIST_FS,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    });
    mistMats.push(m);
    const g = new THREE.CylinderGeometry(R, R, H, 96, 1, true).translate(0, H / 2 - 2, 0);
    const mesh = new THREE.Mesh(g, m);
    mesh.frustumCulled = false;
    scene.add(mesh);
  }
  mist(160, 30, 0x1a2329, 0.75);
  mist(215, 40, 0x1c252b, 0.6);

  // trees, boulders (vertex-coloured, flat shaded, instanced)
  function spruceGeo() {
    const l = [paint(new THREE.CylinderGeometry(0.09, 0.16, 1.8, 6).translate(0, 0.9, 0), 0x2f241c)];
    const layers = 6;
    for (let i = 0; i < layers; i++) {
      const t = i / (layers - 1);
      const r = lerp(2.1, 0.45, t);
      const h = lerp(2.9, 1.7, t);
      const y = 0.9 + i * 1.25;
      const c = new THREE.Color(0x14211a).lerp(new THREE.Color(0x1f3326), t);
      l.push(paint(new THREE.ConeGeometry(r, h, 7, 1).translate(0, y + h / 2, 0), c));
    }
    return merge(l);
  }
  function birchGeo() {
    const l = [paint(new THREE.CylinderGeometry(0.07, 0.13, 6.4, 6).translate(0, 3.2, 0), 0xd5d0c5)];
    const blobs = [
      [0, 6.3, 0, 1.45, 0x94773a],
      [0.75, 5.1, 0.35, 1.05, 0x7f6630],
      [-0.65, 5.5, -0.4, 1.15, 0xa08038],
      [0.15, 7.35, 0.1, 0.85, 0x8a6e32],
    ];
    for (const b of blobs) l.push(paint(new THREE.IcosahedronGeometry(b[3], 0).scale(1, 1.25, 1).translate(b[0], b[1], b[2]), b[4]));
    return merge(l);
  }
  {
    const spruces = [
      [-15.5, -7, 1.1], [-19.5, -6.5, 0.92], [-16, -13, 1.25], [-7.5, -16.5, 1.05], [-2.5, -18.5, 1.3],
      [4, -17, 0.95], [10, -15, 1.12], [16, -11.5, 1.0], [20.5, -5.5, 0.9], [-22, 7, 1.2],
      [-25, -9, 1.35], [25, -16, 1.25], [-14, 14, 1.0], [-30, 1, 1.4], [30, -24, 1.4], [-6, -27, 1.5],
      [14, -24, 1.35], [-21, -20, 1.3], [-27, 15, 1.2], [36, -8, 1.3],
    ];
    const birches = [
      [-11.5, -3.5, 1.0], [-12.5, 6.5, 0.9], [12.5, -8.5, 1.0], [6.5, -12.5, 0.85], [-5.5, -12.5, 1.0],
      [21, -4, 0.95], [-19, 12, 1.0], [22, -12, 0.9],
    ];
    const mk = (geo, list, seed) => {
      const r = mulberry32(seed);
      const m = new THREE.InstancedMesh(geo, mat.veg, list.length);
      const q = new THREE.Quaternion();
      const c = new THREE.Color();
      list.forEach((t, i) => {
        q.setFromAxisAngle(V_UP, r() * TAU);
        const s = t[2];
        _m4.compose(new THREE.Vector3(t[0], -0.05, t[1]), q, new THREE.Vector3(s * (0.9 + r() * 0.2), s, s * (0.9 + r() * 0.2)));
        m.setMatrixAt(i, _m4);
        m.setColorAt(i, c.setScalar(0.85 + r() * 0.3));
      });
      m.castShadow = true;
      m.receiveShadow = true;
      site.add(m);
    };
    mk(spruceGeo(), spruces, 3);
    mk(birchGeo(), birches, 5);
    const rocks = [
      [8.6, -6.4, 0.9], [-9.2, 5.6, 1.2], [-10.4, -7.6, 1.4], [3.5, -9.6, 0.6],
      [14, -2.5, 1.1], [-12.5, -2.0, 0.8], [-6.8, 9.5, 0.55], [17, 9, 0.5],
    ];
    const rg = paint(new THREE.IcosahedronGeometry(1, 0), 0x3d3e3c);
    const rm = new THREE.InstancedMesh(rg, mat.veg, rocks.length);
    const r = mulberry32(9);
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    rocks.forEach((t, i) => {
      q.setFromEuler(e.set(r() * 3, r() * 3, r() * 3));
      const s = t[2];
      _m4.compose(new THREE.Vector3(t[0], s * 0.15, t[1]), q, new THREE.Vector3(s * (1 + r() * 0.5), s * (0.55 + r() * 0.3), s * (1 + r() * 0.4)));
      rm.setMatrixAt(i, _m4);
      rm.setColorAt(i, new THREE.Color().setScalar(0.8 + r() * 0.4));
    });
    rm.castShadow = true;
    rm.receiveShadow = true;
    site.add(rm);
  }

  // rain
  const RAIN_N = isMobile ? 700 : 1700;
  const rainMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uH: { value: 24 },
      uLen: { value: 0.65 },
      uOpacity: { value: 0 },
      uColor: { value: new THREE.Color(0xa9bfd0) },
    },
    vertexShader: RAIN_VS,
    fragmentShader: RAIN_FS,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  });
  const rain = (() => {
    const pos = new Float32Array(RAIN_N * 6);
    const tail = new Float32Array(RAIN_N * 2);
    const speed = new Float32Array(RAIN_N * 2);
    const r = mulberry32(77);
    for (let i = 0; i < RAIN_N; i++) {
      const x = (r() - 0.5) * 56;
      const z = (r() - 0.5) * 56;
      const y = r() * 24;
      const s = 10 + r() * 6;
      pos.set([x, y, z, x, y, z], i * 6);
      tail[i * 2] = 0;
      tail[i * 2 + 1] = 1;
      speed[i * 2] = speed[i * 2 + 1] = s;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aTail', new THREE.BufferAttribute(tail, 1));
    g.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1));
    const l = new THREE.LineSegments(g, rainMat);
    l.frustumCulled = false;
    l.renderOrder = 5;
    scene.add(l);
    return l;
  })();

  /* ============================================================ BLUEPRINT */
  const blueprintU = {
    uReveal: { value: 0 },
    uWin: { value: 0.07 },
    uOpacity: { value: 1 },
    uHot: { value: new THREE.Color(0xff7a3d) },
  };
  const nodesU = {
    uReveal: blueprintU.uReveal,
    uWin: blueprintU.uWin,
    uOpacity: { value: 1 },
    uSize: { value: 7 },
    uHot: blueprintU.uHot,
  };
  const lineMat = (u) =>
    new THREE.ShaderMaterial({
      uniforms: u,
      vertexShader: BLUEPRINT_VS,
      fragmentShader: BLUEPRINT_FS,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      fog: false,
    });
  function lineGeometry(segs) {
    const n = segs.length;
    const pos = new Float32Array(n * 6);
    const oth = new Float32Array(n * 6);
    const end = new Float32Array(n * 2);
    const ord = new Float32Array(n * 2);
    const cl = new Float32Array(n * 6);
    for (let i = 0; i < n; i++) {
      const s = segs[i];
      pos.set(s.a, i * 6);
      pos.set(s.b, i * 6 + 3);
      oth.set(s.b, i * 6);
      oth.set(s.a, i * 6 + 3);
      end[i * 2 + 1] = 1;
      ord[i * 2] = ord[i * 2 + 1] = s.o;
      cl.set([s.c.r, s.c.g, s.c.b, s.c.r, s.c.g, s.c.b], i * 6);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aOther', new THREE.BufferAttribute(oth, 3));
    g.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
    g.setAttribute('aOrder', new THREE.BufferAttribute(ord, 1));
    g.setAttribute('color', new THREE.BufferAttribute(cl, 3));
    return g;
  }

  const blueprint = (() => {
    const C_MAJOR = new THREE.Color(0xe6edf2);
    const C_MINOR = new THREE.Color(0x5f86ab);
    const C_ACC = new THREE.Color(0xff5a1f);
    const KC = [C_MAJOR, C_MINOR, C_ACC];
    const segs = [];
    const nodes = [];
    let cur = null;
    const group = (o0, o1, fn) => {
      cur = [];
      fn();
      const n = cur.length;
      for (let i = 0; i < n; i++) cur[i].o = o0 + (o1 - o0) * (n > 1 ? i / (n - 1) : 0);
      for (const s of cur) segs.push(s);
    };
    const L = (x1, y1, z1, x2, y2, z2, k = 0) => cur.push({ a: [x1, y1, z1], b: [x2, y2, z2], c: KC[k], o: 0 });
    const N = (x, y, z, o, k = 0) => nodes.push({ p: [x, y, z], o, c: KC[k] });
    const BX = 6.05;
    const BZ = 3.55;
    const gy = (a) => yTop(a) + 0.06;
    const roofY = (a) => yTop(a) + ROOF_T + 0.07;

    // 1 — foundation + ground dims
    group(0.0, 0.12, () => {
      const y0 = 0.02;
      L(-6, y0, 3.5, 6, y0, 3.5);
      L(6, y0, 3.5, 6, y0, -3.5);
      L(6, y0, -3.5, -6, y0, -3.5);
      L(-6, y0, -3.5, -6, y0, 3.5);
      for (const [x, z] of [[-6, 3.5], [6, 3.5], [6, -3.5], [-6, -3.5]]) L(x, y0, z, x, FT, z);
      L(-6, FT, 3.5, 6, FT, 3.5);
      L(6, FT, 3.5, 6, FT, -3.5);
      L(6, FT, -3.5, -6, FT, -3.5);
      L(-6, FT, -3.5, -6, FT, 3.5);
    });
    // 2 — walls box
    group(0.08, 0.3, () => {
      const c = [[-BX, BZ], [BX, BZ], [BX, -BZ], [-BX, -BZ]];
      for (const [x, z] of c) L(x, FT, z, x, CLAD_TOP, z);
      for (let i = 0; i < 4; i++) {
        const a = c[i];
        const b = c[(i + 1) % 4];
        L(a[0], CLAD_TOP, a[1], b[0], CLAD_TOP, b[1]);
      }
      for (let i = 0; i < 4; i++) {
        const a = c[i];
        const b = c[(i + 1) % 4];
        L(a[0], 3.45, a[1], b[0], 3.45, b[1], 1);
      }
    });
    // 3 — stud lines on every wall (minor), skipping openings
    group(0.16, 0.46, () => {
      for (const w of WALLS) {
        const gable = WALL[w].gable;
        const half = gable ? 3.5 : 6;
        const d = gable ? BX : BZ;
        const us = [];
        for (let u = -half + 0.6; u < half - 0.1; u += 0.6) us.push(u);
        for (const u of us) {
          const top = gable ? gy(Math.abs(u)) - 0.04 : CLAD_TOP;
          for (const s of cutColumn(w, u - 0.01, u + 0.01, FT, top, 0, 0, 0.2)) {
            const a = wp(w, u, s[0], d);
            const b = wp(w, u, s[1], d);
            L(a[0], a[1], a[2], b[0], b[1], b[2], 1);
          }
        }
      }
    });
    // 4 — gables + roof outline
    group(0.38, 0.58, () => {
      for (const sx of [-1, 1]) {
        L(sx * BX, CLAD_TOP, -BZ, sx * BX, gy(BZ), -BZ);
        L(sx * BX, CLAD_TOP, BZ, sx * BX, gy(BZ), BZ);
        L(sx * BX, gy(BZ), -BZ, sx * BX, gy(0), 0);
        L(sx * BX, gy(0), 0, sx * BX, gy(BZ), BZ);
      }
      for (const sz of [-1, 1]) {
        L(-GABLE_X, roofY(EAVE_Z), sz * EAVE_Z, GABLE_X, roofY(EAVE_Z), sz * EAVE_Z);
        for (const sx of [-1, 1]) L(sx * GABLE_X, roofY(EAVE_Z), sz * EAVE_Z, sx * GABLE_X, roofY(0), 0);
      }
      L(-GABLE_X, roofY(0), 0, GABLE_X, roofY(0), 0);
    });
    // 5 — roof seams
    group(0.5, 0.72, () => {
      for (let x = -GABLE_X + 0.5; x < GABLE_X - 0.1; x += 0.5) {
        for (const sz of [-1, 1]) L(x, roofY(0), 0, x, roofY(EAVE_Z), sz * EAVE_Z, 1);
      }
    });
    // 6 — openings (with the elevation-drawing "opening" diagonal)
    group(0.6, 0.86, () => {
      for (const o of OPENINGS) {
        const w = o.wall;
        const d = WALL[w].gable ? BX + 0.005 : BZ + 0.005;
        if (o.kind === 'glaze') {
          const P = (u, y) => wp(w, u, y, d);
          const pts = [P(-GLAZE, o.y0), P(GLAZE, o.y0), P(GLAZE, glazeTop(GLAZE)), P(0, glazeTop(0)), P(-GLAZE, glazeTop(GLAZE))];
          for (let i = 0; i < 5; i++) {
            const a = pts[i];
            const b = pts[(i + 1) % 5];
            L(a[0], a[1], a[2], b[0], b[1], b[2]);
          }
          for (const u of [-1.1875, 0, 1.1875]) {
            const a = P(u, o.y0);
            const b = P(u, glazeTop(u));
            L(a[0], a[1], a[2], b[0], b[1], b[2], 1);
          }
          for (const y of [3.45, 6.25]) {
            const a = P(-GLAZE, y);
            const b = P(GLAZE, y);
            L(a[0], a[1], a[2], b[0], b[1], b[2], 1);
          }
          continue;
        }
        const a = wp(w, o.u0, o.y0, d);
        const b = wp(w, o.u1, o.y0, d);
        const c = wp(w, o.u1, o.y1, d);
        const e = wp(w, o.u0, o.y1, d);
        L(a[0], a[1], a[2], b[0], b[1], b[2]);
        L(b[0], b[1], b[2], c[0], c[1], c[2]);
        L(c[0], c[1], c[2], e[0], e[1], e[2]);
        L(e[0], e[1], e[2], a[0], a[1], a[2]);
        L(a[0], a[1], a[2], c[0], c[1], c[2], 1);
      }
    });
    // 7 — deck, dimensions (orange) and figures
    group(0.8, 1.0, () => {
      const y = FT + 0.01;
      L(6.05, y, -3.6, DECK_X1, y, -3.6);
      L(DECK_X1, y, -3.6, DECK_X1, y, 3.6);
      L(DECK_X1, y, 3.6, 6.05, y, 3.6);
      for (let x = 6.55; x < DECK_X1; x += 0.5) L(x, y, -3.6, x, y, 3.6, 1);
      // front dimension 12 000
      const dz = 5.4;
      const g0 = 0.03;
      L(-6, g0, 3.8, -6, g0, dz + 0.3, 2);
      L(6, g0, 3.8, 6, g0, dz + 0.3, 2);
      L(-6, g0, dz, 6, g0, dz, 2);
      for (const x of [-6, 6]) L(x - 0.18, g0, dz + 0.18, x + 0.18, g0, dz - 0.18, 2);
      // height dimension at +x, in the gable centre plane
      const hx = 10.6;
      L(hx, 0.02, 0, hx, RIDGE, 0, 2);
      L(GABLE_X + 0.3, RIDGE, 0, hx + 0.35, RIDGE, 0, 2);
      L(DECK_X1 + 0.3, 0.02, 0, hx + 0.35, 0.02, 0, 2);
      for (const yy of [0.02, RIDGE]) L(hx - 0.18, yy - 0.18, 0, hx + 0.18, yy + 0.18, 0, 2);
      // pitch arc at the front-right eave, gable plane
      const cx = GABLE_X + 0.02;
      const ey = roofY(EAVE_Z);
      const R = 1.4;
      let pz = EAVE_Z - R;
      let py = ey;
      for (let i = 1; i <= 8; i++) {
        const a = (i / 8) * PITCH;
        const nz = EAVE_Z - Math.cos(a) * R;
        const ny = ey + Math.sin(a) * R;
        L(cx, py, pz, cx, ny, nz, 2);
        pz = nz;
        py = ny;
      }
      L(cx, ey, EAVE_Z, cx, ey, EAVE_Z - R - 0.25, 2);
      // figures (stroke font)
      const SEGS = {
        a: [0, 1, 1, 1], b: [1, 1, 1, 0.5], c: [1, 0.5, 1, 0], d: [0, 0, 1, 0], e: [0, 0, 0, 0.5], f: [0, 0.5, 0, 1], g: [0, 0.5, 1, 0.5],
      };
      const GL = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
      const text = (str, o, r, u, h) => {
        const w = h * 0.55;
        let x = 0;
        for (const ch of str) {
          if (ch === '°') {
            const s = h * 0.22;
            const p = [[x, h - s], [x + s, h - s], [x + s, h], [x, h]];
            for (let i = 0; i < 4; i++) {
              const A = p[i];
              const B = p[(i + 1) % 4];
              L(o[0] + r[0] * A[0] + u[0] * A[1], o[1] + r[1] * A[0] + u[1] * A[1], o[2] + r[2] * A[0] + u[2] * A[1],
                o[0] + r[0] * B[0] + u[0] * B[1], o[1] + r[1] * B[0] + u[1] * B[1], o[2] + r[2] * B[0] + u[2] * B[1], 2);
            }
            x += s * 2;
            continue;
          }
          const g = GL[ch];
          if (g) for (const sg of g) {
            const S = SEGS[sg];
            const ax = x + S[0] * w;
            const ay = S[1] * h;
            const bx = x + S[2] * w;
            const by = S[3] * h;
            L(o[0] + r[0] * ax + u[0] * ay, o[1] + r[1] * ax + u[1] * ay, o[2] + r[2] * ax + u[2] * ay,
              o[0] + r[0] * bx + u[0] * by, o[1] + r[1] * bx + u[1] * by, o[2] + r[2] * bx + u[2] * by, 2);
          }
          x += w + h * 0.3;
        }
      };
      text('12 000', [-1.15, 0.03, dz + 0.75], [1, 0, 0], [0, 0, -1], 0.42);
      text('9 190', [hx + 0.55, 3.6, 0], [0, 1, 0], [-1, 0, 0], 0.42);
      text('40°', [cx, ey + 0.35, EAVE_Z - R - 0.95], [0, 0, -1], [0, 1, 0], 0.32);
    });

    // nodes at key corners
    for (const [x, z] of [[-6, 3.5], [6, 3.5], [6, -3.5], [-6, -3.5]]) {
      N(x, 0.02, z, 0.02, 2);
      N(x * (BX / 6), CLAD_TOP, z * (BZ / 3.5), 0.3);
    }
    for (const sx of [-1, 1]) N(sx * GABLE_X, roofY(0), 0, 0.58, 2);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) N(sx * GABLE_X, roofY(EAVE_Z), sz * EAVE_Z, 0.5);
    N(10.6, RIDGE, 0, 0.95, 2);
    N(10.6, 0.02, 0, 0.92, 2);

    const lines = new THREE.LineSegments(lineGeometry(segs), lineMat(blueprintU));
    lines.frustumCulled = false;
    lines.renderOrder = 6;
    scene.add(lines);

    const ng = new THREE.BufferGeometry();
    const np = new Float32Array(nodes.length * 3);
    const no = new Float32Array(nodes.length);
    const nc = new Float32Array(nodes.length * 3);
    nodes.forEach((n, i) => {
      np.set(n.p, i * 3);
      no[i] = n.o;
      nc.set([n.c.r, n.c.g, n.c.b], i * 3);
    });
    ng.setAttribute('position', new THREE.BufferAttribute(np, 3));
    ng.setAttribute('aOrder', new THREE.BufferAttribute(no, 1));
    ng.setAttribute('color', new THREE.BufferAttribute(nc, 3));
    const pts = new THREE.Points(
      ng,
      new THREE.ShaderMaterial({
        uniforms: nodesU,
        vertexShader: NODES_VS,
        fragmentShader: NODES_FS,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        fog: false,
      }),
    );
    pts.frustumCulled = false;
    pts.renderOrder = 7;
    scene.add(pts);
    return { lines, pts };
  })();

  /* ============================================================== TOMT */
  // batter boards ("profiler") at the corners + survey tripod
  {
    const items = [];
    const PX = 7.3;
    const PZ = 4.8;
    let k = 0;
    const corners = [[-1, 1], [1, 1], [1, -1], [-1, -1]];
    corners.forEach(([sx, sz], ci) => {
      const cx = sx * PX;
      const cz = sz * PZ;
      const st = [[cx, cz], [cx - sx * 1.4, cz], [cx, cz - sz * 1.4]];
      for (const [x, z] of st) {
        items.push(it([x, 0, z], [0.06, 0.95, 0.06], ci * 0.25 + (k++ % 3) * 0.04, null, col(PINE_DARK, 0.05)));
        items.push(it([x, 0.93, z], [0.075, 0.1, 0.075], ci * 0.25 + 0.1, null, col(0xff5a1f)));
      }
      items.push(it([cx - sx * 0.7, 0.68, cz], [1.55, 0.12, 0.025], ci * 0.25 + 0.14, null, col(PINE, 0.05)));
      items.push(it([cx, 0.68, cz - sz * 0.7], [0.025, 0.12, 1.55], ci * 0.25 + 0.16, null, col(PINE, 0.05)));
    });
    // survey tripod with total station
    const tx = 8.6;
    const tz = -5.6;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU + 0.4;
      const foot = new THREE.Vector3(tx + Math.cos(a) * 0.55, 0, tz + Math.sin(a) * 0.55);
      const head = new THREE.Vector3(tx, 1.45, tz);
      const dir = head.clone().sub(foot);
      items.push(it(foot.toArray(), [0.035, dir.length(), 0.035], 0.85, orientQ(dir, V_UP), col(0xc9a36a)));
    }
    items.push(it([tx, 1.45, tz], [0.24, 0.3, 0.2], 0.95, null, col(0xe0b13a)));
    addPart('stakes', unitBase, mat.wood, items, { win: win('tomt', 0.08, 0.6), out: win('grunnmur', 0.7, 0.95), dur: 0.3, anim: A_GROW });
  }
  // string lines (orange) — reuse the blueprint tracing shader
  const stringsU = {
    uReveal: { value: 0 },
    uWin: { value: 0.18 },
    uOpacity: { value: 0 },
    uHot: { value: new THREE.Color(0xffd2b8) },
  };
  const strings = (() => {
    const c = new THREE.Color(0xff5a1f);
    const y = 0.74;
    const segs = [
      { a: [-7.3, y, 3.5], b: [7.3, y, 3.5], c, o: 0 },
      { a: [6.0, y, 4.8], b: [6.0, y, -4.8], c, o: 0.27 },
      { a: [7.3, y, -3.5], b: [-7.3, y, -3.5], c, o: 0.54 },
      { a: [-6.0, y, -4.8], b: [-6.0, y, 4.8], c, o: 0.8 },
    ];
    const l = new THREE.LineSegments(lineGeometry(segs), lineMat(stringsU));
    l.frustumCulled = false;
    l.visible = false;
    scene.add(l);
    return l;
  })();

  /* ========================================================== GRUNNMUR */
  addPart('gravel', unitBase, mat.gravel, [it([0.6, 0, 0], [16.4, 0.008, 11.2], 0, null, col(0x2b2a27), [0.6, 0, 0])], {
    win: win('grunnmur', 0, 0.28),
    dur: 1,
    anim: A_POP,
    cast: false,
  });
  {
    const items = [];
    const piles = [[-9.0, -5.6, 1.6], [-7.8, 7.0, 1.2], [6.2, -8.8, 1.0]];
    const ico = paint(new THREE.IcosahedronGeometry(1, 1), 0xffffff);
    piles.forEach(([x, z, s], i) => {
      items.push(it([x, -0.05, z], [s * 1.5, s * 0.55, s * 1.2], i / 2, new THREE.Quaternion().setFromAxisAngle(V_UP, i * 1.7), col(0x3f3b35, 0.06), [x, -0.3, z]));
    });
    const rubbleMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true });
    addPart('rubble', ico, rubbleMat, items, { win: win('grunnmur', 0.04, 0.38), out: win('nokkelferdig', 0.0, 0.5), dur: 0.5, outDur: 0.6, anim: A_POP });
  }
  addPart('footing', unitBase, mat.concrete, [it([0, 0, 0], [12.44, 0.16, 7.44], 0, null, col(0x5d5b57))], {
    win: win('grunnmur', 0.16, 0.4),
    dur: 1,
    anim: A_GROW,
  });
  addPart(
    'plinth',
    unitBase,
    mat.concrete,
    [
      it([0, 0.16, 3.345], [11.94, 0.44, 0.25], 0, null, col(0x6e6b66)),
      it([5.845, 0.16, 0], [0.25, 0.44, 6.44], 0.33, null, col(0x6b6863)),
      it([0, 0.16, -3.345], [11.94, 0.44, 0.25], 0.66, null, col(0x6e6b66)),
      it([-5.845, 0.16, 0], [0.25, 0.44, 6.44], 1, null, col(0x6b6863)),
    ],
    { win: win('grunnmur', 0.32, 0.78), dur: 0.45, anim: A_GROW },
  );
  addPart('slab', unitBase, mat.concrete, [it([0, 0.16, 0], [11.44, 0.438, 6.44], 0, null, col(0x63605b))], {
    win: win('grunnmur', 0.66, 0.92),
    dur: 1,
    anim: A_GROW,
  });

  /* ======================================================= FRAMING */
  /** add studs / plates / headers / sills for one storey of one wall */
  function frameStorey(items, wall, base, top, o0, o1) {
    const gable = WALL[wall].gable;
    const half = wallHalf(wall);
    const d = (gable ? SX : SZ) - 0.074;
    const wi = wallIndex(wall);
    const ord = (u, phase) => o0 + (o1 - o0) * clamp01(phase * 0.12 + 0.75 * ((wi + (u + half) / (2 * half)) / 4) + (phase === 3 ? 0.12 : 0));
    const add = (u0, u1, y0, y1, phase, depth = 0.148, color = PINE) => {
      const u = (u0 + u1) / 2;
      items.push(it(wp(wall, u, y0, d), ws(wall, u1 - u0, y1 - y0, depth), ord(u, phase), null, col(color, 0.06, 0.01)));
    };
    for (const s of cutRow(wall, -half, half, base, base + 0.048, 0, 0.1)) add(s[0], s[1], base, base + 0.048, 0);
    const sb = base + 0.048;
    const stp = top - 0.096;
    const kings = [];
    for (const o of OPEN[wall]) {
      const t = o.top ? o.top(o.u0) : o.y1;
      if (o.y0 < top && t > base) kings.push(o.u0 - 0.026, o.u1 + 0.026);
    }
    const us = [];
    for (let u = -half + 0.024; u < half - 0.35; u += 0.6) us.push(u);
    us.push(half - 0.024);
    for (const u of us) {
      if (kings.some((k) => Math.abs(k - u) < 0.07)) continue;
      for (const s of cutColumn(wall, u - 0.024, u + 0.024, sb, stp, 0.048, 0.2, 0.12)) add(u - 0.024, u + 0.024, s[0], s[1], 1);
    }
    for (const k of kings) if (k > -half && k < half) add(k - 0.024, k + 0.024, sb, stp, 1);
    for (const o of OPEN[wall]) {
      if (o.top) continue;
      if (!(o.y0 < top && o.y1 > base)) continue;
      if (o.y1 + 0.03 < stp) add(o.u0 - 0.05, o.u1 + 0.05, o.y1, Math.min(o.y1 + 0.2, stp), 2, 0.148, PINE_DARK);
      if (o.y0 - 0.048 > sb + 0.05) add(o.u0, o.u1, o.y0 - 0.048, o.y0, 2);
    }
    for (const s of cutRow(wall, -half, half, top - 0.096, top, 0, 0.1)) add(s[0], s[1], top - 0.096, top, 3, 0.148, PINE_DARK);
  }
  {
    const gf = [];
    for (const w of WALLS) frameStorey(gf, w, FT, GF_TOP, 0, 1);
    addPart('framingGF', unitBase, mat.wood, gf, { win: win('bindingsverk', 0, 1), dur: 0.1, anim: A_DROP, drop: 1.6 });
  }
  {
    // rim joists, joists, subfloor sheets
    const items = [];
    for (const w of WALLS) {
      const half = WALL[w].gable ? 3.402 : SX;
      const d = (WALL[w].gable ? SX : SZ) - 0.024;
      if (w === 'right') continue;
      for (const s of cutRow(w, -half, half, GF_TOP, GF_TOP + JOIST, 0, 0.1)) {
        items.push(it(wp(w, (s[0] + s[1]) / 2, GF_TOP, d), ws(w, s[1] - s[0], JOIST, 0.048), wallIndex(w) * 0.03, null, col(PINE_DARK, 0.05)));
      }
    }
    for (const s of cutRow('right', -3.402, 3.402, GF_TOP, GF_TOP + JOIST, 0.05, 0.1)) {
      items.push(it([SX - 0.024, GF_TOP, (s[0] + s[1]) / 2], [0.048, JOIST, s[1] - s[0]], 0.1, null, col(PINE_DARK, 0.05)));
    }
    const jx = [];
    for (let x = -5.55; x <= 3.4; x += 0.6) jx.push(x);
    jx.push(3.55);
    jx.forEach((x, i) => {
      items.push(it([x, GF_TOP, 0], [x === 3.55 ? 0.096 : 0.048, JOIST, 6.804], 0.12 + 0.4 * (i / (jx.length - 1)), null, col(PINE, 0.06)));
    });
    // OSB sheets
    const x0 = -5.95;
    const x1 = 3.6;
    const z0 = -3.45;
    const z1 = 3.45;
    let n = 0;
    const sheets = [];
    for (let x = x0; x < x1 - 0.01; x += 2.4) {
      for (let z = z0; z < z1 - 0.01; z += 1.2) {
        const w = Math.min(2.4, x1 - x) - 0.004;
        const dz = Math.min(1.2, z1 - z) - 0.004;
        sheets.push([x + w / 2, z + dz / 2, w, dz]);
        n++;
      }
    }
    sheets.forEach(([x, z, w, dz], i) => items.push(it([x, GF_TOP + JOIST, z], [w, 0.022, dz], 0.6 + 0.4 * (i / (n - 1)), null, col(OSB, 0.07))));
    addPart('joists', unitBase, mat.wood, items, { win: win('bjelkelag', 0, 0.62), dur: 0.16, anim: A_DROP, drop: 1.2 });
  }
  {
    const uf = [];
    for (const w of WALLS) frameStorey(uf, w, UF_BASE, EH, 0, 1);
    addPart('framingUF', unitBase, mat.wood, uf, { win: win('bjelkelag', 0.5, 1), dur: 0.12, anim: A_DROP, drop: 1.4 });
  }

  /* ======================================================= TAKSTOLER */
  const trussGeo = (withChord, withWebs) => {
    const T = 0.048;
    const yt = (a) => HEEL + (HZ - a) * TP;
    const rc = (a) => yt(a) - RV / 2;
    const l = [];
    for (const s of [-1, 1]) l.push(beamGeo(0, rc(EAVE_Z), s * EAVE_Z, 0, rc(0) + 0.04 * TP, -s * 0.04, T, RAFTER));
    if (withChord) l.push(boxAt(T, 0.148, 2 * SZ, 0, 0.074, 0));
    if (withWebs) {
      for (const s of [-1, 1]) {
        l.push(beamGeo(0, 0.13, s * 1.15, 0, yt(2.35) - RV + 0.02, s * 2.35, T, 0.098));
        l.push(beamGeo(0, 0.13, s * 1.15, 0, yt(0) - RV - 0.05, 0, T, 0.098));
      }
      l.push(boxAt(T + 0.004, 0.3, 0.5, 0, yt(0) - RV - 0.12, 0));
    }
    return merge(l);
  };
  const TRUSS_N = 21;
  const trussX = (i) => -5.926 + (i * 11.852) / (TRUSS_N - 1);
  {
    const items = [];
    for (let i = 1; i < TRUSS_N - 1; i++) items.push(it([trussX(i), EH, 0], [1, 1, 1], i / (TRUSS_N - 1), null, col(0xcfae7d, 0.06)));
    // hidden once the cathedral ceiling is finished (only ever visible through the glazing by then)
    addPart('trusses', trussGeo(true, true), mat.wood, items, { win: win('takstoler', 0, 0.82), dur: 0.16, anim: A_SWING, drop: 2.4, swing: 1.25, hideAt: win('innredning', 0.12)[0] });
    addPart(
      'gableRafters',
      trussGeo(false, false),
      mat.wood,
      [it([trussX(0), EH, 0], [1, 1, 1], 0, null, col(0xcfae7d)), it([trussX(TRUSS_N - 1), EH, 0], [1, 1, 1], 1, null, col(0xcfae7d))],
      { win: win('takstoler', 0, 0.82), dur: 0.16, anim: A_SWING, drop: 2.4, swing: 1.25 },
    );
  }
  {
    // gable studs + −x chord + ridge board
    const items = [];
    items.push(it([-5.926, EH, 0], [0.048, 0.148, 2 * SZ], 0, null, col(PINE_DARK)));
    for (const w of ['left', 'right']) {
      const sx = WALL[w].n;
      const base = w === 'left' ? EH + 0.148 : EH;
      const us = [];
      for (let u = -3.0; u <= 3.01; u += 0.6) us.push(u);
      if (w === 'right') us.push(-GLAZE - 0.026, GLAZE + 0.026);
      if (w === 'left') us.push(-0.401, 0.401);
      const kings = w === 'right' ? [-GLAZE - 0.026, GLAZE + 0.026] : [-0.401, 0.401];
      for (const u of us) {
        if (!kings.includes(u) && kings.some((k) => Math.abs(k - u) < 0.07)) continue;
        const topY = yTop(Math.abs(u) + 0.024) - RV - 0.01;
        for (const s of cutColumn(w, u - 0.024, u + 0.024, base, topY, 0.048, 0.2, 0.18)) {
          items.push(it([sx * 5.926, s[0], u], [0.048, s[1] - s[0], 0.098], 0.15 + 0.85 * ((u + 3.2) / 6.4) * 0.5 + (w === 'right' ? 0.45 : 0), null, col(PINE, 0.06)));
        }
      }
    }
    // header/sill for the top slot window on the left gable
    items.push(it([-5.926, 7.9, 0], [0.048, 0.2, 0.85], 0.6, null, col(PINE_DARK)));
    items.push(it([-5.926, 6.552, 0], [0.048, 0.048, 0.75], 0.55, null, col(PINE)));
    addPart('gableStuds', unitBase, mat.wood, items, { win: win('takstoler', 0.55, 1), dur: 0.2, anim: A_DROP, drop: 1.2 });
  }

  /* ========================================================= KLEDNING */
  // scaffolding (tubes + planks)
  {
    const tubeGeo = new THREE.CylinderGeometry(0.026, 0.026, 1, 6).translate(0, 0.5, 0);
    const tubes = [];
    const planks = [];
    const ring = (hx, hz) => {
      const p = [];
      const nx = 7;
      const nz = 4;
      for (let i = 0; i <= nx; i++) p.push([-hx + (2 * hx * i) / nx, hz]);
      for (let i = 1; i < nz; i++) p.push([hx, hz - (2 * hz * i) / nz]);
      for (let i = 0; i <= nx; i++) p.push([hx - (2 * hx * i) / nx, -hz]);
      for (let i = 1; i < nz; i++) p.push([-hx, -hz + (2 * hz * i) / nz]);
      return p;
    };
    const inner = ring(6.45, 4.06);
    const outer = ring(7.17, 4.78);
    const N = inner.length;
    const lifts = [2.05, 4.05, 6.1];
    const HMAX = 8.0;
    const tube = (a, b, o) => {
      const dir = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      tubes.push(it(a, [1, dir.length(), 1], o / HMAX, orientQ(dir, V_UP), col(0xa9aeb1, 0.06)));
    };
    for (let i = 0; i < N; i++) {
      tube([inner[i][0], 0, inner[i][1]], [inner[i][0], 6.7, inner[i][1]], 0);
      tube([outer[i][0], 0, outer[i][1]], [outer[i][0], 7.3, outer[i][1]], 0);
    }
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N;
      for (const y of lifts) {
        tube([inner[i][0], y, inner[i][1]], [inner[j][0], y, inner[j][1]], y);
        tube([outer[i][0], y, outer[i][1]], [outer[j][0], y, outer[j][1]], y);
        tube([inner[i][0], y, inner[i][1]], [outer[i][0], y, outer[i][1]], y);
        // planks
        const mx0 = (inner[i][0] + outer[i][0]) / 2;
        const mz0 = (inner[i][1] + outer[i][1]) / 2;
        const mx1 = (inner[j][0] + outer[j][0]) / 2;
        const mz1 = (inner[j][1] + outer[j][1]) / 2;
        const dir = new THREE.Vector3(mx1 - mx0, 0, mz1 - mz0);
        planks.push(it([mx0, y + 0.03, mz0], [0.6, dir.length(), 0.04], (y + 0.3) / HMAX, orientQ(dir, V_UP), col(0x9d835d, 0.08)));
      }
      tube([outer[i][0], 7.1, outer[i][1]], [outer[j][0], 7.1, outer[j][1]], 7.1);
      tube([outer[i][0], 6.6, outer[i][1]], [outer[j][0], 6.6, outer[j][1]], 6.6);
      if (i % 2 === 0) tube([outer[i][0], 0.15, outer[i][1]], [outer[j][0], 4.0, outer[j][1]], 2.0);
    }
    const sw = win('kledning', 0, 0.3);
    const so = win('innredning', 0, 0.38);
    addPart('scaffoldTubes', tubeGeo, mat.steel, tubes, { win: sw, out: so, dur: 0.3, outDur: 0.35, anim: A_GROW });
    addPart('scaffoldPlanks', unitBase, mat.wood, planks, { win: sw, out: so, dur: 0.3, outDur: 0.35, anim: A_GROW });
  }
  // wind barrier (vindsperre) — one shape per wall with holes for openings
  function wallShape(wall, topFn, yMax) {
    const f = WALL[wall].flip;
    const gable = WALL[wall].gable;
    const half = gable ? 3.45 : 5.95;
    const s = new THREE.Shape();
    if (gable) {
      s.moveTo(-half, 0);
      s.lineTo(half, 0);
      s.lineTo(half, topFn(half) - FT);
      s.lineTo(0, topFn(0) - FT);
      s.lineTo(-half, topFn(half) - FT);
      s.closePath();
    } else {
      s.moveTo(-half, 0);
      s.lineTo(half, 0);
      s.lineTo(half, yMax - FT);
      s.lineTo(-half, yMax - FT);
      s.closePath();
    }
    for (const o of OPEN[wall]) {
      const a = Math.min(f * o.u0, f * o.u1);
      const b = Math.max(f * o.u0, f * o.u1);
      const h = new THREE.Path();
      if (o.top) {
        h.moveTo(a, o.y0 - FT);
        h.lineTo(a, o.top(GLAZE) - FT);
        h.lineTo(0, o.top(0) - FT);
        h.lineTo(b, o.top(GLAZE) - FT);
        h.lineTo(b, o.y0 - FT);
      } else {
        h.moveTo(a, o.y0 - FT);
        h.lineTo(a, o.y1 - FT);
        h.lineTo(b, o.y1 - FT);
        h.lineTo(b, o.y0 - FT);
      }
      h.closePath();
      s.holes.push(h);
    }
    return new THREE.ShapeGeometry(s);
  }
  WALLS.forEach((w, i) => {
    const g = wallShape(w, (a) => yTop(Math.abs(a)) - 0.25, CLAD_TOP - 0.02);
    const d = (WALL[w].gable ? SX : SZ) + 0.005;
    addPart('wrap-' + w, g, mat.wrap, [it(wp(w, 0, FT, d), [1, 1, 1], 0, QW[w])], {
      win: win('kledning', 0.06 + i * 0.07, 0.34 + i * 0.07),
      dur: 1,
      anim: A_GROW,
    });
  });
  // standing cladding: under-boards + over-boards (tømmermannskledning)
  {
    const under = [];
    const over = [];
    for (const w of WALLS) {
      const gable = WALL[w].gable;
      const wi = wallIndex(w);
      const half = gable ? 3.45 : 5.95;
      const base = gable ? SX : SZ;
      const topAt = (u0, u1) => (gable ? yTop(Math.max(Math.abs(u0), Math.abs(u1))) - 0.03 : CLAD_TOP);
      const ord = (u) => (wi + (u + half) / (2 * half)) / 4;
      for (let k = -30; k <= 30; k++) {
        const u = k * 0.25;
        if (Math.abs(u) + 0.1 > half + 0.01) continue;
        const ua = u - 0.1;
        const ub = u + 0.1;
        for (const s of cutColumn(w, ua, ub, CLAD_BASE, topAt(ua, ub), 0, 0, 0.2)) {
          under.push(it(wp(w, u, s[0], base + 0.0405), ws(w, 0.2, s[1] - s[0], 0.019), ord(u), null, col(BLACK, 0.025, 0.01)));
        }
      }
      for (let k = -30; k <= 30; k++) {
        const u = k * 0.25 + 0.125;
        if (Math.abs(u) + 0.05 > half + 0.01) continue;
        const ua = u - 0.05;
        const ub = u + 0.05;
        for (const s of cutColumn(w, ua, ub, CLAD_BASE, topAt(ua, ub), 0, 0, 0.2)) {
          over.push(it(wp(w, u, s[0], base + 0.0595), ws(w, 0.1, s[1] - s[0], 0.019), ord(u), null, col(0x232424, 0.03, 0.01)));
        }
      }
    }
    // corner boards
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const o = sz > 0 ? (sx > 0 ? 0.25 : 0) : sx > 0 ? 0.5 : 0.75;
        over.push(it([sx * 5.96, CLAD_BASE, sz * 3.5125], [0.12, CLAD_TOP - CLAD_BASE, 0.025], o, null, col(0x1b1c1c)));
        over.push(it([sx * 6.0125, CLAD_BASE, sz * 3.465], [0.025, CLAD_TOP - CLAD_BASE, 0.12], o, null, col(0x1b1c1c)));
      }
    }
    addPart('cladUnder', unitBase, mat.clad, under, { win: win('kledning', 0.26, 0.86), dur: 0.12, anim: A_GROW });
    addPart('cladOver', unitBase, mat.clad, over, { win: win('kledning', 0.38, 1), dur: 0.12, anim: A_GROW });
  }

  /* ========================================================== VINDUER */
  {
    const frames = [];
    const glass = [];
    const doors = [];
    let wi = 0;
    const regular = OPENINGS.filter((o) => !o.top);
    for (const o of regular) {
      const w = o.wall;
      const ord = wi / (regular.length - 1);
      wi++;
      const base = WALL[w].gable ? SX : SZ;
      const uc = (o.u0 + o.u1) / 2;
      const yc = (o.y0 + o.y1) / 2;
      const dC = base + 0.01;
      const anchor = wp(w, uc, yc, dC);
      const bar = (u0, u1, y0, y1, depth = 0.15, dc = dC, color = 0x18191a) =>
        frames.push(it(wp(w, (u0 + u1) / 2, (y0 + y1) / 2, dc), ws(w, u1 - u0, y1 - y0, depth), ord, null, col(color), anchor));
      const t = 0.075;
      const ex = 0.045;
      bar(o.u0 - ex, o.u0 - ex + t, o.y0 - ex, o.y1 + ex);
      bar(o.u1 + ex - t, o.u1 + ex, o.y0 - ex, o.y1 + ex);
      bar(o.u0 - ex + t, o.u1 + ex - t, o.y1 + ex - t, o.y1 + ex);
      if (o.kind === 'door') {
        bar(o.u0 - ex + t, o.u1 + ex - t, o.y0, o.y0 + 0.03, 0.15);
        // slim steel canopy
        bar(o.u0 - 0.35, o.u1 + 0.35, 3.02, 3.07, 0.42, base + 0.22 + 0.06);
        doors.push(it(wp(w, uc, yc - 0.01, base - 0.015), ws(w, o.u1 - o.u0 - 0.06, o.y1 - o.y0 - 0.05, 0.06), ord, null, col(0x8d6a45), anchor));
        // vertical pull handle
        frames.push(it(wp(w, o.u0 + 0.16, yc, base + 0.04), ws(w, 0.035, 1.1, 0.04), ord, null, col(0x9a8f80), anchor));
      } else {
        bar(o.u0 - ex + t, o.u1 + ex - t, o.y0 - ex, o.y0 - ex + t);
        // sill flashing
        bar(o.u0 - ex - 0.02, o.u1 + ex + 0.02, o.y0 - ex - 0.025, o.y0 - ex, 0.2, base + 0.04);
        if (o.y1 - o.y0 > 1.8) bar(o.u0, o.u1, o.y0 + 0.62, o.y0 + 0.67, 0.08, base - 0.01);
        glass.push(
          it(wp(w, uc, yc, base - 0.03), [o.u1 - o.u0, o.y1 - o.y0, 1], ord, QW[w], null, anchor),
        );
      }
    }
    addPart('windowFrames', unitCenter, mat.frame, frames, { win: win('vinduer', 0, 0.8), dur: 0.22, anim: A_POP });
    const gp = addPart('windowGlass', unitPlane, mat.glass, glass, { win: win('vinduer', 0.04, 0.84), dur: 0.22, anim: A_POP, cast: false });
    gp.mesh.renderOrder = 2;
    addPart('door', unitCenter, mat.wood, doors, { win: win('vinduer', 0.45, 0.95), dur: 0.5, anim: A_POP });
  }
  {
    // glazed gable: frame bars grow, glass rises
    const items = [];
    const xC = SX + 0.01;
    const vbar = (z, y0, y1, o) => items.push(it([xC, y0, z], [0.15, y1 - y0, 0.08], o, null, col(0x18191a)));
    vbar(-GLAZE, 0.6, glazeTop(GLAZE) + 0.04, 0);
    vbar(GLAZE, 0.6, glazeTop(GLAZE) + 0.04, 0.1);
    for (const [z, o] of [[-1.1875, 0.25], [0, 0.32], [1.1875, 0.4]]) vbar(z, 0.65, glazeTop(z), o);
    const hbar = (y, o, h = 0.07) => items.push(it([xC, y, -GLAZE], [h, 2 * GLAZE, 0.15], o, orientQ(new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0)), col(0x18191a)));
    hbar(0.64, 0.05, 0.1);
    hbar(3.45, 0.55);
    hbar(6.25, 0.7);
    for (const s of [-1, 1]) {
      const a = new THREE.Vector3(xC, glazeTop(GLAZE), s * GLAZE);
      const b = new THREE.Vector3(xC, glazeTop(0), 0);
      const dir = b.clone().sub(a);
      items.push(it(a.toArray(), [0.08, dir.length() + 0.04, 0.15], 0.85, orientQ(dir, new THREE.Vector3(1, 0, 0)), col(0x18191a)));
    }
    addPart('glazeFrame', unitBase, mat.frame, items, { win: win('vinduer', 0.12, 0.7), dur: 0.3, anim: A_GROW });
    // glass pentagon
    const s = new THREE.Shape();
    s.moveTo(-GLAZE, 0);
    s.lineTo(GLAZE, 0);
    s.lineTo(GLAZE, glazeTop(GLAZE) - 0.65);
    s.lineTo(0, glazeTop(0) - 0.65);
    s.lineTo(-GLAZE, glazeTop(GLAZE) - 0.65);
    s.closePath();
    const gg = addPart('glazeGlass', new THREE.ShapeGeometry(s), gableGlassMat, [it([SX - 0.03, 0.65, 0], [1, 1, 1], 0, QW.right)], {
      win: win('vinduer', 0.35, 0.9),
      dur: 1,
      anim: A_GROW,
      cast: false,
    });
    gg.mesh.renderOrder = 2;
  }

  /* ============================================================== TAK */
  const nPlus = new THREE.Vector3(0, CP, SP);
  const nMinus = new THREE.Vector3(0, CP, -SP);
  const dPlus = new THREE.Vector3(0, -SP, CP);
  const dMinus = new THREE.Vector3(0, -SP, -CP);
  const slopeLen = EAVE_Z / CP;
  /** point on rafter-top plane at horizontal distance a from the ridge, side s, offset along the normal */
  const roofPt = (x, a, s, off) => {
    const n = s > 0 ? nPlus : nMinus;
    return [x + n.x * off, yTop(a) + n.y * off, s * a + n.z * off];
  };
  {
    const ug = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0.5);
    const items = [];
    for (const s of [1, -1]) {
      const p = roofPt(-GABLE_X, 0, s, 0.002);
      const n = s > 0 ? nPlus : nMinus;
      const q = orientQ(new THREE.Vector3(1, 0, 0), n);
      // local X = Y × Z → for +z: x̂ × n+ = d+, for −z: x̂ × n− = −d− (up-slope) → shift origin to the eave
      const origin = s > 0 ? p : roofPt(-GABLE_X, EAVE_Z, s, 0.002);
      const c = s > 0 ? [origin[0], origin[1], origin[2]] : origin;
      items.push(it(c, [slopeLen, 2 * GABLE_X, ROOF_T - 0.004], s > 0 ? 0 : 0.35, q, col(0x1d1f20)));
    }
    // underlay geometry spans local X ∈ [-0.5, 0.5]; shift to [0,1]
    ug.translate(0.5, 0, 0);
    addPart('underlay', ug, mat.frame, items, { win: win('tak', 0, 0.32), dur: 0.7, anim: A_GROW });
  }
  {
    // standing-seam panels: pan + raised seam, base-anchored along the slope
    const pan = new THREE.BoxGeometry(0.5, 1, 0.012).translate(0, 0.5, 0.006);
    const seam = new THREE.BoxGeometry(0.022, 1, 0.045).translate(0.24, 0.5, 0.0225);
    const panelGeo = merge([pan, seam]);
    const items = [];
    const n = Math.round((2 * GABLE_X) / 0.5);
    for (const s of [1, -1]) {
      const q = orientQ(s > 0 ? dPlus : dMinus, s > 0 ? nPlus : nMinus);
      for (let i = 0; i < n; i++) {
        const x = -GABLE_X + 0.25 + i * ((2 * GABLE_X - 0.5) / (n - 1));
        items.push(it(roofPt(x, -0.02, s, ROOF_T), [1, slopeLen + 0.03, 1], i / (n - 1) * 0.92 + (s < 0 ? 0.08 : 0), q, col(0x2b2f32, 0.02)));
      }
    }
    addPart('roofPanels', panelGeo, mat.roof, items, { win: win('tak', 0.14, 0.86), dur: 0.14, anim: A_GROW });
  }
  {
    // trims: ridge, gable fascias, eave fascias, gutters, downpipes, flue
    const items = [];
    const C = col(0x222527);
    const x1 = GABLE_X + 0.02;
    // ridge cap (grows along x)
    items.push(it([-x1, RIDGE + ROOF_T + 0.035, 0], [0.24, 2 * x1, 0.07], 0.15, orientQ(new THREE.Vector3(1, 0, 0), V_UP), C));
    // gable fascias (vindski) along the slopes
    for (const sx of [-1, 1]) {
      for (const s of [1, -1]) {
        const dir = s > 0 ? dPlus : dMinus;
        const n = s > 0 ? nPlus : nMinus;
        const p = roofPt(sx * (GABLE_X + 0.015), -0.03, s, -0.08);
        items.push(it(p, [0.03, slopeLen + 0.06, 0.34], 0.3 + (sx > 0 ? 0.1 : 0), orientQ(dir, n), C));
      }
    }
    // eave fascia + gutter + downpipes
    for (const s of [1, -1]) {
      const ep = roofPt(0, EAVE_Z, s, ROOF_T);
      items.push(it([-x1, ep[1] - 0.17, s * (EAVE_Z + 0.03)], [0.3, 2 * x1, 0.03], 0.5, orientQ(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, s)), C));
      items.push(it([-x1, ep[1] - 0.31, s * 3.69], [0.32, 2 * x1, 0.02], 0.45, orientQ(new THREE.Vector3(1, 0, 0), V_UP), C));
      items.push(it([-x1, ep[1] - 0.2, s * (EAVE_Z + 0.1)], [0.11, 2 * x1, 0.1], 0.62, orientQ(new THREE.Vector3(1, 0, 0), V_UP), C));
      for (const sx of [-1, 1]) {
        items.push(it([sx * 5.7, 0.15, s * (EAVE_Z + 0.1)], [0.08, ep[1] - 0.35, 0.08], 0.78, null, C));
      }
    }
    // square black flue on the back slope
    const fz = -1.6;
    const fy = yTop(1.6) - 0.15;
    items.push(it([-2.6, fy, fz], [0.24, RIDGE + 0.85 - fy, 0.24], 0.9, null, col(0x161718)));
    items.push(it([-2.6, RIDGE + 0.85, fz], [0.32, 0.06, 0.32], 1, null, col(0x161718)));
    addPart('roofTrim', unitBase, mat.roof, items, { win: win('tak', 0.7, 1), dur: 0.3, anim: A_GROW });
  }

  /* ======================================================= INNREDNING */
  // interior shell (inward-facing): floor, long walls, sloped ceiling, −x end wall
  const interior = (() => {
    const pos = [];
    const IX0 = -5.78;
    const IX1 = 5.84;
    const IZ = 3.28;
    const y0 = FT + 0.005;
    const yW = yTop(IZ) - 0.35;
    const yR = yTop(0) - 0.35;
    const quad = (a, b, c, d, n) => {
      const ab = new THREE.Vector3().fromArray(b).sub(new THREE.Vector3().fromArray(a));
      const ac = new THREE.Vector3().fromArray(c).sub(new THREE.Vector3().fromArray(a));
      const flip = ab.cross(ac).dot(n) < 0;
      const tri = flip ? [a, c, b, a, d, c] : [a, b, c, a, c, d];
      for (const v of tri) pos.push(...v);
    };
    quad([IX0, y0, -IZ], [IX1, y0, -IZ], [IX1, y0, IZ], [IX0, y0, IZ], V_UP);
    quad([IX0, y0, IZ], [IX1, y0, IZ], [IX1, yW, IZ], [IX0, yW, IZ], new THREE.Vector3(0, 0, -1));
    quad([IX0, y0, -IZ], [IX1, y0, -IZ], [IX1, yW, -IZ], [IX0, yW, -IZ], new THREE.Vector3(0, 0, 1));
    quad([IX0, yW, IZ], [IX1, yW, IZ], [IX1, yR, 0], [IX0, yR, 0], new THREE.Vector3(0, -CP, -SP));
    quad([IX0, yW, -IZ], [IX1, yW, -IZ], [IX1, yR, 0], [IX0, yR, 0], new THREE.Vector3(0, -CP, SP));
    quad([IX0, y0, -IZ], [IX0, y0, IZ], [IX0, yW, IZ], [IX0, yW, -IZ], new THREE.Vector3(1, 0, 0));
    const tri = [[IX0, yW, -IZ], [IX0, yW, IZ], [IX0, yR, 0]];
    for (const v of tri) pos.push(...v);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat.interior);
    m.receiveShadow = true;
    m.visible = false;
    scene.add(m);
    return m;
  })();
  {
    const items = [];
    const F = FT + 0.005;
    const add = (x, y, z, sx, sy, sz, o, hex, q = null) => items.push(it([x, y, z], [sx, sy, sz], o, q, col(hex), [x, y, z]));
    // living: sofa + rug facing the glazing
    add(4.2, F, 0.0, 2.6, 0.012, 3.0, 0.0, 0x6f675c);
    add(3.75, F, 0.0, 0.95, 0.42, 2.5, 0.2, 0x34363a);
    add(3.35, F, 0.0, 0.2, 0.82, 2.5, 0.25, 0x2f3134);
    add(4.85, F, 0.0, 0.7, 0.36, 0.7, 0.35, 0xb08a5c);
    // dining table + bench
    add(1.6, F + 0.7, 0.4, 1.0, 0.05, 2.2, 0.4, 0xc9a576);
    add(1.6, F, -0.5, 0.9, 0.7, 0.08, 0.38, 0x9b7a50);
    add(1.6, F, 1.3, 0.9, 0.7, 0.08, 0.38, 0x9b7a50);
    // kitchen island
    add(-2.4, F, 0.2, 2.8, 0.92, 0.9, 0.5, 0xe2ddd4);
    add(-2.4, F + 0.92, 0.2, 2.9, 0.04, 1.0, 0.55, 0x3a3836);
    // gallery railing (upper floor edge, black steel)
    add(3.62, UF_BASE + 1.0, 0, 0.04, 0.04, 6.5, 0.6, 0x141414);
    for (let z = -3.0; z <= 3.01; z += 1.0) add(3.62, UF_BASE, z, 0.03, 1.0, 0.03, 0.62, 0x141414);
    // pendant cords
    for (const [x, z, y] of [[4.7, -1.2, 4.4], [4.7, 0, 4.0], [4.7, 1.2, 4.6]]) add(x, y + 0.25, z, 0.012, yTop(Math.abs(z)) - 0.35 - (y + 0.25), 0.012, 0.7, 0x111111);
    for (const z of [0.0, 1.0]) add(1.6, 2.45, z, 0.012, GF_TOP - 2.45, 0.012, 0.72, 0x111111);
    addPart('furniture', unitBase, mat.furn, items, { win: win('innredning', 0.22, 0.72), dur: 0.35, anim: A_POP, cast: false });
    const lamps = [];
    for (const [x, z, y] of [[4.7, -1.2, 4.4], [4.7, 0, 4.0], [4.7, 1.2, 4.6]]) lamps.push(it([x, y, z], [0.34, 0.3, 0.34], 0.2, null, null, [x, y + 0.3, z]));
    for (const z of [0.0, 1.0]) lamps.push(it([1.6, 2.2, z], [0.26, 0.25, 0.26], 0.5, null, null, [1.6, 2.45, z]));
    const lampGeo = new THREE.CylinderGeometry(0.35, 0.5, 1, 14).translate(0, 0.5, 0);
    addPart('lamps', lampGeo, mat.lamp, lamps, { win: win('innredning', 0.2, 0.6), dur: 0.5, anim: A_POP, cast: false });
  }
  {
    // cantilevered pine deck at the glazed gable
    const frame = [];
    const boards = [];
    const along = (dir) => orientQ(dir, V_UP);
    const qX = along(new THREE.Vector3(1, 0, 0));
    const qZ = along(new THREE.Vector3(0, 0, 1));
    for (const z of [-3.2, -1.1, 1.1, 3.2]) frame.push(it([6.0, FT - 0.13, z], [0.06, DECK_X1 - 6.0, 0.2], 0, qX, col(0x1c1d1e)));
    frame.push(it([DECK_X1 - 0.014, FT - 0.1, -3.62], [0.028, 7.24, 0.2], 0.5, qZ, col(0xd2b48a, 0.03)));
    for (const s of [-1, 1]) frame.push(it([6.0, FT - 0.1, s * 3.606], [0.028, DECK_X1 - 6.0, 0.2], 0.4, qX, col(0xd2b48a, 0.03)));
    addPart('deckFrame', unitBase, mat.wood, frame, { win: win('innredning', 0.28, 0.6), dur: 0.5, anim: A_GROW });
    const pitch = 0.132;
    const nb = Math.floor((DECK_X1 - 6.04) / pitch);
    for (let i = 0; i < nb; i++) {
      const x = 6.04 + 0.06 + i * pitch;
      boards.push(it([x, FT - 0.014, -3.6], [0.12, 7.2, 0.028], i / (nb + 2), qZ, col(0xb89a70, 0.08, 0.01)));
    }
    // floating step
    boards.push(it([DECK_X1 + 0.22, 0.3, -1.5], [0.4, 3.0, 0.05], 1, qZ, col(0xb89a70, 0.05)));
    addPart('deckBoards', unitBase, mat.wood, boards, { win: win('innredning', 0.4, 1.0), dur: 0.16, anim: A_GROW });
  }

  /* ===================================================== NØKKELFERDIG */
  {
    const items = [];
    const slabs = [[-4.1, 4.35], [-4.0, 5.2], [-4.15, 6.05], [-3.95, 6.9], [-4.05, 7.75]];
    slabs.forEach(([x, z], i) => items.push(it([x, 0, z], [1.1, 0.05, 0.6], i / (slabs.length - 1), null, col(0x7f7c76, 0.05), [x, 0, z])));
    addPart('path', unitBase, mat.concrete, items, { win: win('nokkelferdig', 0.15, 0.7), dur: 0.4, anim: A_POP });
    const sconceMat = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffbf7a, emissiveIntensity: 0, roughness: 0.5 });
    mat.sconce = sconceMat;
    const sc = [];
    for (const x of [-4.85, -3.4]) sc.push(it([x, 2.15, SZ + 0.08], [0.08, 0.3, 0.06], x < -4 ? 0 : 1, null, null, [x, 2.3, SZ + 0.08]));
    addPart('sconces', unitBase, sconceMat, sc, { win: win('nokkelferdig', 0.25, 0.55), dur: 0.6, anim: A_POP, cast: false });
  }

  /* ============================================================= CRANE */
  const crane = (() => {
    const ORANGE = 0xd5531c;
    const DARK = 0x1f2022;
    const GREY = 0x6b6964;
    const H = 21;
    const mw = 1.5;
    const g = new THREE.Group();
    g.position.set(-15, 0, 1.5);
    const L = [];
    L.push(paint(boxAt(3.4, 0.9, 3.4, 0, 0.45, 0), GREY));
    const c = mw / 2;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) L.push(paint(boxAt(0.1, H - 0.9, 0.1, sx * c, 0.9 + (H - 0.9) / 2, sz * c), ORANGE));
    const sec = 1.5;
    const faces = [[[-c, -c], [c, -c]], [[c, -c], [c, c]], [[c, c], [-c, c]], [[-c, c], [-c, -c]]];
    let flip = 0;
    for (let y = 0.9; y < H - 0.2; y += sec) {
      const y1 = Math.min(H, y + sec);
      for (const [a, b] of faces) {
        L.push(paint(beamGeo(a[0], y, a[1], b[0], y, b[1], 0.05, 0.05), ORANGE));
        const s = flip % 2 ? [a, b] : [b, a];
        L.push(paint(beamGeo(s[0][0], y, s[0][1], s[1][0], y1, s[1][1], 0.045, 0.045), ORANGE));
      }
      flip++;
    }
    const mast = new THREE.Mesh(merge(L), mat.crane);
    g.add(mast);
    const top = new THREE.Group();
    top.position.y = H;
    g.add(top);
    const T = [];
    // slewing unit + cab
    T.push(paint(boxAt(1.9, 0.5, 1.9, 0, 0.25, 0), DARK));
    T.push(paint(boxAt(1.2, 1.3, 1.1, 1.0, -0.4, 1.25), DARK));
    T.push(paint(boxAt(1.22, 0.5, 1.12, 1.0, 0.05, 1.25), 0x8fa3ad));
    // jib (triangular lattice) along +x
    const J0 = 0.9;
    const J1 = 20;
    const jy = 0.5;
    const jh = 1.15;
    const jw = 0.5;
    for (const sz of [-1, 1]) T.push(paint(boxAt(J1 - J0, 0.08, 0.08, (J0 + J1) / 2, jy, sz * jw), ORANGE));
    T.push(paint(boxAt(J1 - J0, 0.08, 0.08, (J0 + J1) / 2, jy + jh, 0), ORANGE));
    let k = 0;
    for (let x = J0; x < J1 - 0.1; x += 1.3) {
      const x1 = Math.min(J1, x + 1.3);
      for (const sz of [-1, 1]) {
        if (k % 2) T.push(paint(beamGeo(x, jy, sz * jw, x1, jy + jh, 0, 0.04, 0.04), ORANGE));
        else T.push(paint(beamGeo(x, jy + jh, 0, x1, jy, sz * jw, 0.04, 0.04), ORANGE));
      }
      T.push(paint(beamGeo(x, jy, -jw, x, jy, jw, 0.035, 0.035, new THREE.Vector3(0, 1, 0)), ORANGE));
      k++;
    }
    // counter-jib + counterweights
    for (const sz of [-1, 1]) T.push(paint(boxAt(6.2, 0.1, 0.1, -3.9, jy, sz * 0.55), ORANGE));
    for (let x = -1.2; x > -7; x -= 1.2) T.push(paint(beamGeo(x, jy, -0.55, x, jy, 0.55, 0.05, 0.05), ORANGE));
    T.push(paint(boxAt(1.4, 1.6, 1.3, -6.0, jy - 0.4, 0), GREY));
    T.push(paint(boxAt(2.4, 0.06, 1.2, -3.8, jy + 0.06, 0), 0x3a3b3c));
    // cat head + pendants
    const CH = 5.2;
    for (const sz of [-1, 1]) {
      T.push(paint(beamGeo(-0.6, 0.5, sz * 0.6, 0, CH, 0, 0.09, 0.09), ORANGE));
      T.push(paint(beamGeo(0.6, 0.5, sz * 0.6, 0, CH, 0, 0.09, 0.09), ORANGE));
    }
    T.push(paint(beamGeo(0, CH, 0, 13.5, jy + jh, 0, 0.035, 0.035), 0x9a9a9a));
    T.push(paint(beamGeo(0, CH, 0, -6.6, jy + 0.1, 0, 0.035, 0.035), 0x9a9a9a));
    const head = new THREE.Mesh(merge(T), mat.crane);
    top.add(head);
    // trolley + hook
    const trolley = new THREE.Group();
    trolley.position.y = jy;
    top.add(trolley);
    trolley.add(new THREE.Mesh(paint(boxAt(0.8, 0.3, 1.1, 0, -0.1, 0), DARK), mat.crane));
    const cable = new THREE.Mesh(paint(boxAt(0.03, 1, 0.03, 0, -0.5, 0), 0x2a2a2a), mat.crane);
    trolley.add(cable);
    const hook = new THREE.Group();
    trolley.add(hook);
    hook.add(new THREE.Mesh(paint(boxAt(0.36, 0.55, 0.26, 0, -0.28, 0), 0xe0a52a), mat.crane));
    // load: a strapped bundle of pine
    const LD = [];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) LD.push(paint(boxAt(0.14, 0.14, 4.2, (i - 1.5) * 0.15, -1.6 + j * 0.15, 0), i % 2 ? 0xd3b385 : 0xc9a676));
    LD.push(paint(beamGeo(-0.25, -0.6, 0, 0, -1.25, -1.5, 0.02, 0.02), 0x222222));
    LD.push(paint(beamGeo(0.25, -0.6, 0, 0, -1.25, 1.5, 0.02, 0.02), 0x222222));
    const load = new THREE.Mesh(merge(LD), mat.crane);
    hook.add(load);
    g.visible = false;
    scene.add(g);
    return { g, top, trolley, cable, hook, load };
  })();

  /* =================================================== state + update */
  const allMaterials = new Set();
  scene.traverse((o) => {
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => allMaterials.add(m));
  });

  let mode = 'loader';
  let bpTarget = 0;
  let bpShown = 0;
  let lpTarget = 0;
  let lpShown = 0;
  let active = true;
  let disposed = false;
  let raf = 0;
  let lastT = 0;
  let clock = 0;
  let modeT = 0;
  let snap = true;
  let buildDirty = true;
  const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  const lvl = { env: 0.3, ghost: 1, rain: 0, grid: 0.25, shiftX: 0, shiftY: 0 };
  let userShift = null;
  const camPos = new THREE.Vector3();
  const camLook = new THREE.Vector3();
  const tgtPos = new THREE.Vector3();
  const tgtLook = new THREE.Vector3();
  const _fwd = new THREE.Vector3();
  const _right = new THREE.Vector3();
  let viewW = 1;
  let viewH = 1;
  let appliedShiftX = 0;
  let appliedShiftY = 0;
  let craneS = 0;
  let craneP = 0;
  let fin = 0;
  let lights = 0;

  const INT_DARK = new THREE.Color(0x2b2722);
  const INT_LIT = new THREE.Color(0xc9baa5);
  function applyBuild(p) {
    let changed = false;
    for (let i = 0; i < parts.length; i++) if (parts[i].update(p)) changed = true;
    const lT = range(p, ST.tomt.start, ST.tomt.end);
    const lG = range(p, ST.grunnmur.start, ST.grunnmur.end);
    const lI = range(p, ST.innredning.start, ST.innredning.end);
    const lN = range(p, ST.nokkelferdig.start, ST.nokkelferdig.end);
    // string lines
    stringsU.uReveal.value = range(lT, 0.42, 1.0) * 1.2;
    stringsU.uOpacity.value = 0.95 * (1 - range(lG, 0.72, 0.95));
    strings.visible = lT > 0.42 && lG < 0.95;
    // interior + lights
    interior.visible = p >= ST.vinduer.start;
    lights = smooth(range(lI, 0.18, 0.8));
    fin = smooth(lN);
    const L = lights * (1 + 0.35 * fin);
    pGF.intensity = 30 * L;
    pUF.intensity = 22 * L;
    pVoid.intensity = 26 * L;
    spot.intensity = 7 * L;
    mat.interior.color.lerpColors(INT_DARK, INT_LIT, lights);
    mat.interior.emissiveIntensity = 0.07 * L;
    mat.lamp.emissiveIntensity = 4 * L;
    mat.glass.emissiveIntensity = 0.08 * L;
    mat.glass.opacity = lerp(0.55, 0.3, lights);
    gableGlassMat.emissiveIntensity = 0.06 * L;
    gableGlassMat.opacity = lerp(0.5, 0.26, lights);
    mat.sconce.emissiveIntensity = 4 * smooth(range(lN, 0.3, 0.7));
    // crane presence (pure function of p)
    craneS = smooth(range(lG, 0.25, 1.0)) * (1 - smooth(range(lN, 0.15, 0.85)));
    craneP = p;
    return changed;
  }

  function updateCrane(t) {
    const s = craneS;
    crane.g.visible = s > 0.002;
    if (!crane.g.visible) return;
    crane.g.scale.setScalar(Math.max(0.001, s));
    const p = craneP;
    const lN = range(p, ST.nokkelferdig.start, ST.nokkelferdig.end);
    const toHouse = Math.atan2(1.5, 15);
    let a = toHouse + 0.85 * Math.sin(p * TAU * 2.3 + 0.6);
    a = lerp(a, toHouse + Math.PI * 0.85, smooth(range(lN, 0, 0.45)));
    if (!reducedMotion) a += Math.sin(t * 0.21) * 0.03;
    crane.top.rotation.y = a;
    crane.trolley.position.x = 11 + 5.5 * (0.5 + 0.5 * Math.sin(p * TAU * 3.1 + 1.0));
    let len = 6.5 + 2.2 * (0.5 + 0.5 * Math.sin(p * TAU * 4.3));
    len = lerp(len, 1.2, smooth(range(lN, 0, 0.4)));
    crane.cable.scale.y = len;
    crane.hook.position.y = -len;
    if (!reducedMotion) crane.hook.rotation.y = Math.sin(t * 0.5) * 0.12;
    crane.load.visible = p > ST.bindingsverk.start && p < ST.tak.start;
  }

  function setCameraTargets() {
    const aspect = camera.aspect || 1;
    const fit = aspect >= 1.25 ? 1 : Math.min(2.1, Math.pow(1.25 / aspect, 0.72));
    const T = reducedMotion ? 0 : clock;
    let az;
    let y;
    let r;
    let ly;
    let lx;
    if (mode === 'loader') {
      az = 0.86 + Math.sin(T * 0.16) * 0.38;
      y = 6.4;
      r = 23;
      ly = 4.2;
      lx = 0.8;
    } else if (mode === 'intro') {
      az = 0.62 + Math.sin(T * 0.045) * 0.3;
      y = 17;
      r = 38;
      ly = 1.6;
      lx = 0.8;
    } else if (mode === 'idle') {
      az = 0.86 + T * 0.035;
      y = 7.0;
      r = 28;
      ly = 3.7;
      lx = 1.2;
    } else {
      camAt(bpShown, camParam);
      az = camParam[0] + (reducedMotion ? 0 : Math.sin(T * 0.08) * 0.025);
      y = camParam[1];
      r = camParam[2];
      ly = camParam[3];
      lx = camParam[4];
    }
    if (fit > 1) {
      r *= fit;
      y = y + (fit - 1) * 2.2;
      ly = ly + (fit - 1) * 0.6;
    }
    tgtPos.set(lx + Math.sin(az) * r, y, Math.cos(az) * r);
    tgtLook.set(lx, ly, 0);
  }

  const MT = new Float32Array(6);
  function modeTargets() {
    const portrait = camera.aspect < 1;
    let env = 1;
    let ghost = 0;
    let rainT = 0.45;
    let grid = 0.14;
    let sx = 0;
    let sy = 0;
    const g = 1 - smooth(range(bpShown, 0.05, 0.72));
    if (mode === 'loader') {
      env = 0.1;
      ghost = 1;
      rainT = 0;
      grid = 0.3;
    } else if (mode === 'intro') {
      ghost = 0.7;
      rainT = 0.45;
      grid = 0.42;
    } else if (mode === 'idle') {
      ghost = 0.5 * g;
      rainT = 0.6;
      grid = lerp(0.14, 0.4, g);
    } else {
      ghost = 0.62 * g;
      rainT = 0.34 + 0.3 * fin;
      grid = lerp(0.13, 0.42, 1 - smooth(range(bpShown, 0.04, 0.32)));
      if (portrait) sy = 0.1;
      else sx = 0.09;
    }
    if (userShift) {
      sx = userShift.x;
      sy = userShift.y;
    }
    MT[0] = env;
    MT[1] = ghost;
    MT[2] = rainT;
    MT[3] = grid;
    MT[4] = sx;
    MT[5] = sy;
    return MT;
  }

  function applyViewShift(force) {
    if (!force && Math.abs(lvl.shiftX - appliedShiftX) < 1e-4 && Math.abs(lvl.shiftY - appliedShiftY) < 1e-4) return;
    appliedShiftX = lvl.shiftX;
    appliedShiftY = lvl.shiftY;
    if (Math.abs(appliedShiftX) < 1e-4 && Math.abs(appliedShiftY) < 1e-4) camera.clearViewOffset();
    else camera.setViewOffset(viewW, viewH, -appliedShiftX * viewW, appliedShiftY * viewH, viewW, viewH);
  }

  function tick(dt) {
    clock += dt;
    modeT += dt;
    // build progress (smoothed toward target; state is a pure function of bpShown)
    const prev = bpShown;
    if (snap) bpShown = bpTarget;
    else {
      bpShown += (bpTarget - bpShown) * damp(dt, reducedMotion ? 14 : 5.5);
      if (Math.abs(bpTarget - bpShown) < 2e-5) bpShown = bpTarget;
    }
    if (bpShown !== prev || buildDirty) {
      if (applyBuild(bpShown)) renderer.shadowMap.needsUpdate = true;
      buildDirty = false;
    }
    // loader reveal
    const lpGoal = mode === 'loader' ? lpTarget : 1;
    lpShown = snap ? lpGoal : lpShown + (lpGoal - lpShown) * damp(dt, mode === 'loader' ? 9 : 3);
    if (Math.abs(lpGoal - lpShown) < 1e-4) lpShown = lpGoal;
    blueprintU.uReveal.value = lpShown * (1 + blueprintU.uWin.value * 4.5);
    // mode-dependent levels
    const mt = modeTargets();
    const envT = mt[0];
    const ghostT = mt[1];
    const rainT = mt[2];
    const gridT = mt[3];
    const sxT = mt[4];
    const syT = mt[5];
    const k = snap ? 1 : damp(dt, 2.4);
    lvl.env += (envT - lvl.env) * k;
    lvl.ghost += (ghostT - lvl.ghost) * (snap ? 1 : damp(dt, 3));
    lvl.rain += (rainT - lvl.rain) * k;
    lvl.grid += (gridT - lvl.grid) * k;
    lvl.shiftX += (sxT - lvl.shiftX) * (snap ? 1 : damp(dt, 2));
    lvl.shiftY += (syT - lvl.shiftY) * (snap ? 1 : damp(dt, 2));
    applyViewShift(false);
    const dusk = 1 - 0.25 * fin;
    hemi.intensity = LIGHT_BASE.hemi * lvl.env * dusk;
    key.intensity = LIGHT_BASE.key * lvl.env * dusk;
    rim.intensity = LIGHT_BASE.rim * lvl.env;
    scene.environmentIntensity = ENV_BASE * lvl.env;
    for (let i = 0; i < ENV_MATS.length; i++) ENV_MATS[i][0].envMapIntensity = ENV_MATS[i][1] * lvl.env;
    const sl = 0.25 + 0.75 * lvl.env;
    skyMat.uniforms.uLevel.value = sl;
    for (let i = 0; i < mountainMats.length; i++) mountainMats[i].color.copy(mountainMats[i].userData.base).multiplyScalar(sl);
    for (let i = 0; i < mistMats.length; i++) mistMats[i].uniforms.uLevel.value = sl;
    blueprintU.uOpacity.value = lvl.ghost;
    nodesU.uOpacity.value = lvl.ghost;
    blueprint.lines.visible = lvl.ghost > 0.003 && lpShown > 0;
    blueprint.pts.visible = blueprint.lines.visible;
    gridMat.opacity = lvl.grid;
    rainMat.uniforms.uOpacity.value = lvl.rain * 0.42;
    rain.visible = !reducedMotion && lvl.rain > 0.01;
    if (!reducedMotion) rainMat.uniforms.uTime.value = clock;
    updateCrane(clock);
    // pointer (smoothed)
    const pk = snap ? 1 : damp(dt, 3.5);
    ptr.x += (ptr.tx - ptr.x) * pk;
    ptr.y += (ptr.ty - ptr.y) * pk;
    // camera
    setCameraTargets();
    if (snap) {
      camPos.copy(tgtPos);
      camLook.copy(tgtLook);
    } else {
      const base = mode === 'build' ? 3.2 : 2.0;
      const lam = lerp(1.25, base, smooth(clamp01(modeT / 2.2)));
      const ck = damp(dt, lam);
      camPos.lerp(tgtPos, ck);
      camLook.lerp(tgtLook, ck);
    }
    _fwd.subVectors(camLook, camPos);
    const dist = _fwd.length();
    _right.set(-_fwd.z, 0, _fwd.x).normalize();
    const par = (reducedMotion ? 0.45 : 1) * dist * 0.035;
    camera.position.copy(camPos).addScaledVector(_right, ptr.x * par);
    camera.position.y += ptr.y * par * 0.55;
    camera.lookAt(camLook.x + _right.x * ptr.x * par * 0.25, camLook.y, camLook.z + _right.z * ptr.x * par * 0.25);
    snap = false;
  }

  function frame(now) {
    raf = 0;
    if (!active || disposed) return;
    raf = requestAnimationFrame(frame);
    let dt = lastT ? (now - lastT) / 1000 : 0.016;
    lastT = now;
    if (dt > 0.1) dt = 0.1;
    if (dt < 0) dt = 0;
    tick(dt);
    renderer.render(scene, camera);
  }
  function start() {
    if (raf || !active || disposed || document.hidden) return;
    lastT = 0;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }
  const onVisibility = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVisibility);
  const onLost = (e) => {
    e.preventDefault();
    stop();
  };
  canvas.addEventListener('webglcontextlost', onLost);
  // keep the drawing buffer in sync even if the host forgets to call resize()
  let ro = null;
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(() => resize());
    ro.observe(canvas);
  }

  function resize() {
    if (disposed) return;
    const w = Math.max(1, canvas.clientWidth || window.innerWidth || 1);
    const h = Math.max(1, canvas.clientHeight || window.innerHeight || 1);
    viewW = w;
    viewH = h;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = camera.aspect < 1 ? 44 : camera.aspect < 1.3 ? 39 : 35;
    camera.updateProjectionMatrix();
    applyViewShift(true);
    nodesU.uSize.value = 7 * renderer.getPixelRatio();
  }

  // compile every program up-front (avoids hitches when parts first appear mid-scroll)
  resize();
  {
    const hidden = [];
    scene.traverse((o) => {
      if (!o.visible) {
        hidden.push(o);
        o.visible = true;
      }
    });
    try {
      renderer.compile(scene, camera);
    } catch (e) {
      /* ignore */
    }
    for (const o of hidden) o.visible = false;
  }
  applyBuild(0);
  for (const p of parts) p.lastL = -1;
  buildDirty = true;
  start();

  /* ================================================================ API */
  const api = {
    /** loader: blueprint edges trace in (0..1) */
    setLoadProgress(p) {
      lpTarget = clamp01(+p || 0);
    },
    /** build state is a pure function of p (internally smoothed). Pass immediate=true to jump. */
    setBuildProgress(p, immediate = false) {
      bpTarget = clamp01(+p || 0);
      if (immediate) {
        bpShown = bpTarget;
        buildDirty = true;
      }
    },
    /** 'loader' | 'intro' | 'build' | 'idle'; opts.immediate snaps camera + levels */
    setMode(m, opts) {
      if (m !== 'loader' && m !== 'intro' && m !== 'build' && m !== 'idle') return;
      if (m !== mode) modeT = 0;
      mode = m;
      if (opts && opts.immediate) snap = true;
    },
    /** normalized pointer -1..1 (x right, y up) */
    setPointer(x, y) {
      ptr.tx = Math.max(-1, Math.min(1, +x || 0));
      ptr.ty = Math.max(-1, Math.min(1, +y || 0));
    },
    getStages() {
      return STAGES.map((s) => ({ id: s.id, start: s.start, end: s.end }));
    },
    resize,
    setActive(on) {
      active = !!on;
      if (active) start();
      else stop();
    },
    /** optional: override the screen-space framing shift (fractions of the viewport; null = default) */
    setViewShift(x, y) {
      userShift = x == null ? null : { x: +x || 0, y: +y || 0 };
    },
    dispose() {
      if (disposed) return;
      stop();
      disposed = true;
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('webglcontextlost', onLost);
      if (ro) ro.disconnect();
      const geos = new Set();
      scene.traverse((o) => {
        if (o.geometry) geos.add(o.geometry);
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => allMaterials.add(m));
      });
      geos.forEach((g) => g.dispose());
      allMaterials.forEach((m) => m.dispose());
      unitBase.dispose();
      unitCenter.dispose();
      unitPlane.dispose();
      if (envTex) envTex.dispose();
      for (const p of parts) p.mesh.dispose();
      renderer.dispose();
    },
  };
  return api;
}

export { STAGES };
