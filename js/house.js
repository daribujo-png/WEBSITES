/**
 * house.js — the hero house for Bygg og Renovering Vest AS (Bergen), v2.
 *
 * A modern Norwegian enebolig on a white "studio table". It draws itself as a
 * blueprint, then builds itself from an empty plot, and finally gets painted
 * with a visible roller sweep. After that, visitors can repaint it.
 *
 * The build state is a PURE FUNCTION of progress p ∈ [0,1] (setBuildProgress),
 * so it can be scrubbed forwards and backwards. play() just drives p by time.
 *   p < 0.92        construction (blueprint → grunnmur → … → tak)
 *   0.92 ≤ p < 1    painting ('maling', then 'ferdig' with the lights coming on)
 *   p = 1           done
 *
 * Public contract (see createHouseScene at the bottom):
 *   play({ duration }) skipToEnd() setBuildProgress(p, immediate)
 *   setPaintColor(hex, { animate }) onStage(cb) onComplete(cb)
 *   setPointer(x, y) setViewShift(x, y) resize() setActive(bool) dispose()
 * Extras (optional): onPaintEnd(cb) ready (Promise) setScrollOut(t) getStage()
 *   getPaintColor() isComplete() getStages(); setViewShift(x, y, region) also
 *   takes the exact region {left, top, right, bottom} (fractions of the canvas)
 *   the house should be fitted into. setMode()/setLoadProgress() are no-ops.
 */
import * as THREE from 'three';
import { RoomEnvironment } from '../vendor/addons/RoomEnvironment.js';

/* ======================================================================= */
/* Stages + pacing                                                         */
/* ======================================================================= */

/** ms = share of the autoplay (scaled to the requested duration) */
const STAGES = [
  { id: 'blueprint', start: 0.0, end: 0.06, ms: 1150, label: 'Tegner huset…' },
  { id: 'grunnmur', start: 0.06, end: 0.16, ms: 650, label: 'Støper grunnmuren…' },
  { id: 'bindingsverk', start: 0.16, end: 0.29, ms: 850, label: 'Reiser bindingsverket…' },
  { id: 'bjelkelag', start: 0.29, end: 0.37, ms: 500, label: 'Legger bjelkelaget…' },
  { id: 'takstoler', start: 0.37, end: 0.48, ms: 750, label: 'Setter opp takstolene…' },
  { id: 'kledning', start: 0.48, end: 0.62, ms: 800, label: 'Setter opp kledningen…' },
  { id: 'vinduer', start: 0.62, end: 0.71, ms: 500, label: 'Setter inn vinduer og dør…' },
  { id: 'tak', start: 0.71, end: 0.92, ms: 950, label: 'Legger taket…' },
  { id: 'maling', start: 0.92, end: 0.985, ms: 1350, label: 'Maler huset…' },
  { id: 'ferdig', start: 0.985, end: 1.0, ms: 500, label: 'Ferdig. Velkommen hjem.' },
];
const ST = {};
for (const s of STAGES) ST[s.id] = s;
/** global progress window from stage-local fractions */
const win = (id, a = 0, b = 1) => {
  const s = ST[id];
  const d = s.end - s.start;
  return [s.start + a * d, s.start + b * d];
};
const PAINT_START = ST.maling.start;
const PAINT_END = ST.maling.end;

const MS_TOTAL = STAGES.reduce((a, s) => a + s.ms, 0);
const T_CUM = new Float32Array(STAGES.length + 1);
for (let i = 0; i < STAGES.length; i++) T_CUM[i + 1] = T_CUM[i] + STAGES[i].ms / MS_TOTAL;
T_CUM[STAGES.length] = 1;

/** autoplay: normalized time u → build progress p (stage-weighted pacing) */
function timeToP(u) {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  let i = 0;
  while (i < STAGES.length - 1 && u >= T_CUM[i + 1]) i++;
  const s = STAGES[i];
  let l = (u - T_CUM[i]) / (T_CUM[i + 1] - T_CUM[i]);
  if (i === 0) l = l * (0.45 + 0.55 * l); // ease in from rest
  else if (i === STAGES.length - 1) l = 1 - (1 - l) * (1 - l); // ease out into the finish
  return s.start + (s.end - s.start) * l;
}
function stageIndexAt(p) {
  if (p >= 1) return STAGES.length - 1;
  for (let i = STAGES.length - 1; i >= 0; i--) if (p >= STAGES[i].start) return i;
  return 0;
}

/** Norwegian house-paint palette (names for swatch labels) */
const PAINT_COLORS = [
  { id: 'falu', name: 'Falurød', hex: '#9B2F22' },
  { id: 'oker', name: 'Oker', hex: '#D9A441' },
  { id: 'fjordbla', name: 'Fjordblå', hex: '#2E5C7A' },
  { id: 'mosegronn', name: 'Mosegrønn', hex: '#56704F' },
  { id: 'kritthvit', name: 'Kritthvit', hex: '#F4F1EA' },
  { id: 'antrasitt', name: 'Antrasitt', hex: '#2B2E2F' },
];
const DEFAULT_PAINT = '#2E5C7A';
const RAW_PINE = 0xe2c9a4;
const ORANGE = 0xff5a1f;

/* ======================================================================= */
/* Small math helpers (no allocation)                                      */
/* ======================================================================= */

const TAU = Math.PI * 2;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const range = (v, a, b) => clamp01((v - a) / (b - a));
const smooth = (t) => t * t * (3 - 2 * t);
const outCubic = (t) => 1 - (1 - t) * (1 - t) * (1 - t);
const inOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
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

/** Paint sweep coordinate: distance along the façade from the front-left
    corner, going both ways round the house (front → glazed gable, and left
    gable → back), so both sweeps meet at the back-right corner. 0..19 m. */
const SWEEP_LEN = 19;
function sweepD(x, z) {
  const ex = Math.abs(x) - 5.9;
  const ez = Math.abs(z) - 3.4;
  if (ez > ex) return z > 0 ? x + 6 : 13 + x; // front 0..12 · back 7..19
  return x > 0 ? 15.5 - z : 3.5 - z; // right gable 12..19 · left gable 0..7
}

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
  const c = hex instanceof THREE.Color ? hex : new THREE.Color(hex);
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
    // strike: 'drop' = each piece is lowered a little and the part fades out (scaffolding);
    // default = the in-animation played backwards
    this.outMode = opts.outMode || null;
    this.outDrop = opts.outDrop ?? 0.6;
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
    const strike = this.outMode === 'drop';
    if (strike && mesh.material.transparent) mesh.material.opacity = 1 - smooth(Lo);
    for (let i = 0; i < this.n; i++) {
      let t = clamp01((L - O[i] * span) / dur);
      let lower = 0;
      if (Lo > 0) {
        const r = clamp01((Lo - (1 - O[i]) * ospan) / outDur);
        if (strike) {
          if (r >= 1) t = 0;
          else lower = smooth(r) * this.outDrop;
        } else if (1 - r < t) t = 1 - r;
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
      if (lower) _pv.y -= lower;
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

// Blueprint lines on white: each segment grows from one end; the drawing tip
// glows orange, then settles to its ink colour.
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
  vCol = mix(color, uHot, hot * 0.85);
  vA = step(0.0001, f) * uOpacity;
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
  gl_PointSize = uSize * (0.6 + 0.4 * f + hot * 0.9);
  gl_Position = projectionMatrix * mv;
}`;
const NODES_FS = /* glsl */ `
varying vec3 vCol;
varying float vA;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float ring = smoothstep(0.5, 0.4, d) * smoothstep(0.24, 0.32, d);
  float dot_ = smoothstep(0.17, 0.1, d);
  float a = max(ring * 0.9, dot_);
  if (a < 0.01) discard;
  gl_FragColor = vec4(vCol, a * vA);
  #include <colorspace_fragment>
}`;

/* ======================================================================= */
/* Camera path                                                             */
/* ======================================================================= */

// [p, azimuth, elevation, lookY offset, distance multiplier]
// azimuth 0 = front (+z), π/2 = glazed gable (+x). Distance is fitted to the
// finished house, so the framing never jumps while it grows.
// dm > 1 while the crane stands, so its jib stays inside the frame (and clear of the nav bar);
// the camera settles in on the finished house as the crane sinks away. The fit itself also
// grows upwards while the crane stands (see fitDistance's `top`).
const CAM_KEYS = [
  [0.0, 1.02, 0.7, -1.4, 1.0],
  [0.06, 0.96, 0.54, -1.1, 1.08],
  [0.16, 0.88, 0.42, -0.7, 1.22],
  [0.29, 0.8, 0.34, -0.25, 1.22],
  [0.37, 0.72, 0.38, 0.0, 1.22],
  [0.48, 0.64, 0.3, 0.0, 1.22],
  [0.62, 0.62, 0.24, 0.0, 1.22],
  [0.71, 0.7, 0.32, 0.0, 1.05],
  [0.92, 0.64, 0.2, 0.0, 0.98],
  [1.0, 0.7, 0.2, 0.0, 0.98],
];
const camParam = new Float32Array(4);
function camAt(p, out) {
  const n = CAM_KEYS.length;
  let i = 0;
  while (i < n - 2 && p > CAM_KEYS[i + 1][0]) i++;
  const k0 = CAM_KEYS[i > 0 ? i - 1 : 0];
  const k1 = CAM_KEYS[i];
  const k2 = CAM_KEYS[i + 1];
  const k3 = CAM_KEYS[i + 2 < n ? i + 2 : n - 1];
  const t = smooth(clamp01((p - k1[0]) / (k2[0] - k1[0])));
  for (let j = 1; j < 5; j++) out[j - 1] = catmull(k0[j], k1[j], k2[j], k3[j], t);
  return out;
}
// framing box of the finished house (deck + flue included)
const FRAME_BOX = [-6.45, 10.0, 0.0, 9.9, -4.0, 4.0];
const TARGET_X = 1.75;
const TARGET_Y = 4.5;
const TARGET_Z = 0;
/** exact pinhole fit: distance that keeps the box (top edge = `top`) inside ±tanH/±tanV */
function fitDistance(az, el, ty, tanH, tanV, top = FRAME_BOX[3]) {
  const ca = Math.cos(az);
  const sa = Math.sin(az);
  const ce = Math.cos(el);
  const se = Math.sin(el);
  let D = 0;
  for (let i = 0; i < 8; i++) {
    const x = (i & 1 ? FRAME_BOX[1] : FRAME_BOX[0]) - TARGET_X;
    const y = (i & 2 ? top : FRAME_BOX[2]) - ty;
    const z = (i & 4 ? FRAME_BOX[5] : FRAME_BOX[4]) - TARGET_Z;
    const px = x * ca - z * sa; // · right
    const py = -x * se * sa + y * ce - z * se * ca; // · up
    const pz = x * sa * ce + y * se + z * ca * ce; // · toward camera
    const dx = Math.abs(px) / tanH + pz;
    const dy = Math.abs(py) / tanV + pz;
    if (dx > D) D = dx;
    if (dy > D) D = dy;
  }
  return D;
}

/* ======================================================================= */
/* createHouseScene                                                        */
/* ======================================================================= */

/** three r170 needs WebGL2; probe quietly so a missing GPU doesn't spam the console */
function hasWebGL2() {
  try {
    if (!window.WebGL2RenderingContext) return false;
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return false;
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
    return true;
  } catch (e) {
    return false;
  }
}

export function createHouseScene({ canvas, reducedMotion = false, isMobile = false } = {}) {
  if (!canvas || typeof window === 'undefined' || !hasWebGL2()) return null;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: isMobile ? 'default' : 'high-performance',
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

  const BG = 0xffffff;
  const dprCap = isMobile ? 1.5 : 1.75;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
  renderer.setClearColor(BG, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  // linear fog to pure white; near/far follow the camera distance each frame
  scene.fog = new THREE.Fog(BG, 60, 160);

  const camera = new THREE.PerspectiveCamera(32, 16 / 9, 1, 500);
  camera.position.set(24, 12, 28);

  const rnd = mulberry32(60425);

  /* ------------------------------------------------------------ env + lights */
  /** studio reflections (re-made after a lost WebGL context is restored) */
  const makeEnv = () => {
    try {
      const pm = new THREE.PMREMGenerator(renderer);
      const room = new RoomEnvironment();
      const tex = pm.fromScene(room, 0.04).texture;
      room.dispose();
      pm.dispose();
      return tex;
    } catch (e) {
      return null;
    }
  };
  let envTex = makeEnv();
  scene.environment = envTex;
  scene.environmentIntensity = 0.5;

  // daylight: soft sky fill + warm key from front-left + cool kicker
  const hemi = new THREE.HemisphereLight(0xf2f6fa, 0xd6cdbf, 1.45);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xfff2e0, 2.55);
  key.position.set(-12, 21, 16);
  key.target.position.set(1.5, 2.5, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(isMobile ? 1024 : 2048, isMobile ? 1024 : 2048);
  const sc = key.shadow.camera;
  sc.left = -24;
  sc.right = 24;
  sc.top = 21;
  sc.bottom = -19;
  sc.near = 5;
  sc.far = 80;
  key.shadow.bias = -0.0003;
  key.shadow.normalBias = 0.03;
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight(0xdfe9f3, 0.55);
  fill.position.set(18, 7, 4);
  scene.add(fill);

  const WARM = 0xffbd80;
  const pGF = new THREE.PointLight(WARM, 0, 11, 2);
  pGF.position.set(1.4, 2.4, 0.2);
  const pUF = new THREE.PointLight(WARM, 0, 11, 2);
  pUF.position.set(-2.2, 5.5, 0);
  const pVoid = new THREE.PointLight(WARM, 0, 10, 2);
  pVoid.position.set(4.7, 4.6, 0);
  scene.add(pGF, pUF, pVoid);

  /* --------------------------------------------------------------- materials */
  const mat = {
    gravel: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 1,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
    concrete: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }),
    wood: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.78 }),
    clad: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.66 }),
    wrap: new THREE.MeshStandardMaterial({ color: 0xbfcad1, roughness: 0.88 }),
    frame: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.42, metalness: 0.3 }),
    glass: new THREE.MeshStandardMaterial({
      color: 0x253540,
      roughness: 0.06,
      metalness: 0.2,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      emissive: 0xffa35c,
      emissiveIntensity: 0,
    }),
    roof: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.46, metalness: 0.35 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xaab0b4, roughness: 0.45, metalness: 0.55 }),
    interior: new THREE.MeshStandardMaterial({ color: 0x3a352f, roughness: 0.92, emissive: 0xffb06a, emissiveIntensity: 0 }),
    furn: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82 }),
    lamp: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6, emissive: 0xffb46e, emissiveIntensity: 0 }),
    veg: new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.92 }),
    crane: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.15 }),
  };
  const gableGlassMat = mat.glass.clone();
  gableGlassMat.side = THREE.DoubleSide;
  if (envTex) {
    for (const [m, k] of [
      [mat.glass, 1.5],
      [gableGlassMat, 1.5],
      [mat.roof, 0.8],
      [mat.frame, 0.6],
      [mat.steel, 0.6],
    ]) {
      m.envMap = envTex;
      m.envMapIntensity = k;
    }
  }

  /* ---------------------------------- ground: white studio table + shadows */
  // The table itself is pure white (unlit, not tone mapped), so it melts into
  // the page. Shadows come from a separate shadow-catcher that fades out
  // radially, so no edge or horizon line is ever visible.
  mat.ground = new THREE.MeshBasicMaterial({ color: BG, toneMapped: false, fog: false });
  const shadowU = { uFadeC: { value: new THREE.Vector2(1.5, 0) }, uFadeIn: { value: 13.0 }, uFadeOut: { value: 25.0 } };
  const shadowMat = new THREE.ShadowMaterial({ color: 0x2c241b, opacity: 0.24, depthWrite: false, fog: false });
  shadowMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, shadowU);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vGroundXZ;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvGroundXZ = (modelMatrix * vec4(transformed, 1.0)).xz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vGroundXZ;\nuniform vec2 uFadeC;\nuniform float uFadeIn;\nuniform float uFadeOut;')
      .replace(
        '#include <fog_fragment>',
        `#include <fog_fragment>
        gl_FragColor.a *= 1.0 - smoothstep(uFadeIn, uFadeOut, length((vGroundXZ - uFadeC) * vec2(0.8, 1.0)));`,
      );
  };
  shadowMat.customProgramCacheKey = () => 'brv-shadow-catcher';

  /* ------------------------------- paint: layered roller sweep on the panel */
  const RAW_C = new THREE.Color(RAW_PINE);
  const paintU = {
    uPaintBase: { value: new THREE.Color(RAW_PINE) },
    uPaintC: { value: [new THREE.Color(), new THREE.Color(), new THREE.Color(), new THREE.Color()] },
    uPaintE: { value: new Float32Array([-1, -1, -1, -1]) },
    uPaintWetW: { value: 0.055 },
  };
  mat.clad.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, paintU);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 aPaint;\nvarying vec2 vPaint;\nvarying float vPaintY;')
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        vPaint = aPaint;
        {
          vec4 pw = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            pw = instanceMatrix * pw;
          #endif
          vPaintY = (modelMatrix * pw).y;
        }`,
      );
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform vec3 uPaintBase;
        uniform vec3 uPaintC[4];
        uniform float uPaintE[4];
        uniform float uPaintWetW;
        varying vec2 vPaint;
        varying float vPaintY;
        // top-down per board, boards in order along the façade, slightly ragged
        vec3 brvPaint(out float wet) {
          float q = vPaint.x + (9.4 - vPaintY) * 0.0085 + (vPaint.y - 0.5) * 0.016;
          float aa = max(fwidth(q), 1e-4);
          vec3 c = uPaintBase;
          wet = 0.0;
          for (int i = 0; i < 4; i++) {
            float e = uPaintE[i];
            float m = 1.0 - smoothstep(e - aa, e + aa, q);
            c = mix(c, uPaintC[i], m);
            float w = m * (1.0 - smoothstep(0.0, uPaintWetW, e - q));
            wet = max(wet * (1.0 - m), w);
          }
          return c;
        }`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float paintWet = 0.0;
        vec3 paintCol = brvPaint(paintWet);
        diffuseColor.rgb *= mix(paintCol, paintCol * 1.1 + 0.015, paintWet);`,
      )
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.16, paintWet);');
  };
  mat.clad.customProgramCacheKey = () => 'brv-clad-paint';

  /* ------------------ trims: white listverk on a dark house, antrasitt on a light one */
  // Window frames, corner boards and barge/fascia boards follow the paint (Kritthvit trims on
  // a dark colour, Antrasitt on a light one) and change in the same sweep as the walls. The
  // sweep position comes from the world position, so long boards are painted along their length.
  const trimU = {
    uTrimBase: { value: new THREE.Color(0xf4f1ea) },
    uTrimRaw: { value: new THREE.Color(RAW_PINE) },
    uTrimC: { value: [new THREE.Color(), new THREE.Color(), new THREE.Color(), new THREE.Color()] },
  };
  const trimPatch = (sh) => {
    Object.assign(sh.uniforms, trimU);
    sh.uniforms.uPaintE = paintU.uPaintE;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vTrimW;').replace(
      '#include <project_vertex>',
      `#include <project_vertex>
        {
          vec4 tw = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            tw = instanceMatrix * tw;
          #endif
          vTrimW = (modelMatrix * tw).xyz;
        }`,
    );
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform vec3 uTrimBase;
        uniform vec3 uTrimRaw;
        uniform vec3 uTrimC[4];
        uniform float uPaintE[4];
        varying vec3 vTrimW;
        float brvSweepD(vec2 p) {
          float ex = abs(p.x) - 5.9;
          float ez = abs(p.y) - 3.4;
          if (ez > ex) return p.y > 0.0 ? p.x + 6.0 : 13.0 + p.x;
          return p.x > 0.0 ? 15.5 - p.y : 3.5 - p.y;
        }
        vec3 brvTrim() {
          float q = clamp(brvSweepD(vTrimW.xz) / ${SWEEP_LEN.toFixed(1)}, 0.0, 1.0) + (9.4 - vTrimW.y) * 0.0085;
          float aa = max(fwidth(q), 1e-4);
          #ifdef BRV_TRIM_RAW
            vec3 c = uTrimRaw;
          #else
            vec3 c = uTrimBase;
          #endif
          for (int i = 0; i < 4; i++) c = mix(c, uTrimC[i], 1.0 - smoothstep(uPaintE[i] - aa, uPaintE[i] + aa, q));
          return c;
        }`,
      )
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= brvTrim();');
  };
  // pre-finished trims (window frames): trim colour from the start
  mat.trim = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0.05 });
  mat.trim.onBeforeCompile = trimPatch;
  mat.trim.customProgramCacheKey = () => 'brv-trim';
  // site-painted trims (corner boards, barge boards): raw pine until the painters get there
  mat.trimRaw = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.62 });
  mat.trimRaw.defines = { BRV_TRIM_RAW: '' };
  mat.trimRaw.onBeforeCompile = trimPatch;
  mat.trimRaw.customProgramCacheKey = () => 'brv-trim-raw';

  const col = (hex, jitter = 0, hue = 0) => {
    const c = new THREE.Color(hex);
    if (jitter || hue) c.offsetHSL((rnd() - 0.5) * hue, 0, (rnd() - 0.5) * jitter);
    return c;
  };
  const PINE = 0xd8b989;
  const PINE_DARK = 0xc9a674;
  const OSB = 0xcda873;
  const FRAME_C = 0xffffff; // tone only: the trim shader supplies the colour

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

  const ground = new THREE.Mesh(new THREE.CircleGeometry(150, 48).rotateX(-Math.PI / 2), mat.ground);
  ground.receiveShadow = false;
  site.add(ground);
  const shadowCatcher = new THREE.Mesh(new THREE.PlaneGeometry(64, 64).rotateX(-Math.PI / 2), shadowMat);
  shadowCatcher.position.set(1.5, 0.003, 0);
  shadowCatcher.receiveShadow = true;
  shadowCatcher.renderOrder = 1;
  site.add(shadowCatcher);

  // soft contact shadow ("ambient occlusion" blob) under the footprint
  const aoTex = (() => {
    const N = 64;
    const data = new Uint8Array(N * N * 4);
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const u = Math.abs((i + 0.5) / N * 2 - 1);
        const v = Math.abs((j + 0.5) / N * 2 - 1);
        const dx = Math.max(0, u - 0.55) / 0.45;
        const dy = Math.max(0, v - 0.45) / 0.55;
        const d = Math.min(1, Math.hypot(dx, dy));
        const a = Math.pow(1 - d, 2.2);
        const k = (j * N + i) * 4;
        data[k] = data[k + 1] = data[k + 2] = Math.round(a * 255);
        data[k + 3] = 255;
      }
    }
    const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearFilter;
    t.needsUpdate = true;
    return t;
  })();
  const aoMat = new THREE.MeshBasicMaterial({
    color: 0x2b241d,
    alphaMap: aoTex,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
  const ao = new THREE.Mesh(unitPlane, aoMat);
  ao.rotation.x = -Math.PI / 2;
  ao.position.set(1.2, 0.012, 0);
  ao.scale.set(19.5, 11.5, 1);
  ao.renderOrder = 1;
  ao.visible = false;
  site.add(ao);

  // survey grid on the plot: drafting paper that fades radially
  const gridMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    toneMapped: false,
  });
  const grid = (() => {
    const pos = [];
    const cols = [];
    const R = 30;
    const step = 1.5;
    const base = new THREE.Color(0x6f97b3);
    const pushV = (x, z, major) => {
      const r = Math.hypot(x - 1.5, z) / R;
      const f = Math.pow(Math.max(0, 1 - r), 1.4) * (major ? 0.55 : 0.28);
      pos.push(x, 0.018, z);
      cols.push(base.r, base.g, base.b, f);
    };
    for (let i = -R; i <= R; i += step) {
      const major = Math.abs(i % 6) < 1e-6;
      for (let j = -R; j < R; j += step) {
        if (Math.hypot(i, j) > R + 2) continue;
        pushV(i + 1.5, j, major);
        pushV(i + 1.5, j + step, major);
        pushV(j + 1.5, i, major);
        pushV(j + step + 1.5, i, major);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 4));
    const l = new THREE.LineSegments(g, gridMat);
    l.renderOrder = 2;
    l.visible = false;
    site.add(l);
    return l;
  })();

  // trees + boulders: flat-shaded, coloured like a model railway landscape
  function spruceGeo() {
    const l = [paint(new THREE.CylinderGeometry(0.09, 0.16, 1.4, 6).translate(0, 0.7, 0), 0x6b4e36)];
    const layers = 5;
    for (let i = 0; i < layers; i++) {
      const t = i / (layers - 1);
      const r = lerp(1.85, 0.45, t);
      const h = lerp(2.5, 1.6, t);
      const y = 0.8 + i * 1.1;
      const c = new THREE.Color(0x3c5a42).lerp(new THREE.Color(0x5f8058), t);
      l.push(paint(new THREE.ConeGeometry(r, h, 7, 1).translate(0, y + h / 2, 0), c));
    }
    return merge(l);
  }
  function birchGeo(crown) {
    const l = [paint(new THREE.CylinderGeometry(0.07, 0.12, 5.2, 6).translate(0, 2.6, 0), 0xefece4)];
    const blobs = [
      [0, 5.3, 0, 1.35, 0],
      [0.7, 4.3, 0.35, 1.0, 1],
      [-0.6, 4.6, -0.4, 1.1, 2],
      [0.15, 6.2, 0.1, 0.8, 1],
    ];
    for (const b of blobs) l.push(paint(new THREE.IcosahedronGeometry(b[3], 0).scale(1, 1.2, 1).translate(b[0], b[1], b[2]), crown[b[4]]));
    return merge(l);
  }
  // The landscape pops up around the plot while the blueprint finishes, so the
  // intro starts as clean lines on white.
  {
    // Every prop stands behind or beside the plot and, seen from the camera, inside the
    // left/right edges of the finished house's frame (placed in screen space, then mapped
    // back to the ground), so nothing is ever sliced by the edge of the canvas.
    const spruces = [
      [-9.8, -2.3, 0.95], [-9.1, -8.0, 1.0], [-6.4, -12.7, 1.1], [-1.0, -12.5, 0.9], [-13.3, -8.5, 1.05], [-0.7, -14.7, 0.95],
    ];
    const birchesGreen = [[2.1, -10.5, 0.8], [-7.8, 2.4, 0.8], [-6.1, -9.1, 0.75]];
    const birchesOchre = [[-1.8, -10.6, 0.72], [-8.8, -4.4, 0.8]];
    const W0 = win('blueprint', 0.62, 1)[0];
    const W1 = win('grunnmur', 0, 0.9)[1];
    const mk = (name, geo, list, seed) => {
      const r = mulberry32(seed);
      const items = list.map((t) => {
        const q = new THREE.Quaternion().setFromAxisAngle(V_UP, r() * TAU);
        const s = t[2];
        const sc = [s * (0.9 + r() * 0.2), s, s * (0.9 + r() * 0.2)];
        const c = new THREE.Color().setScalar(0.9 + r() * 0.2);
        // nearest to the plot first, with a little randomness
        const o = clamp01((Math.hypot(t[0] - 1.5, t[1]) - 8) / 14) * 0.7 + r() * 0.3;
        return it([t[0], -0.05, t[1]], sc, o, q, c, [t[0], -0.05, t[1]]);
      });
      addPart(name, geo, mat.veg, items, { win: [W0, W1], dur: 0.35, anim: A_POP });
    };
    mk('spruces', spruceGeo(), spruces, 3);
    mk('birchesGreen', birchGeo([0x8fa95a, 0x7d9a4c, 0xa3b968]), birchesGreen, 5);
    mk('birchesOchre', birchGeo([0xd9a441, 0xc98f2e, 0xe2b65a]), birchesOchre, 7);
    const rocks = [
      [4.1, -7.6, 0.7], [-3.7, 6.3, 0.85], [-1.3, -8.4, 0.55], [-8.4, 1.0, 0.8],
      [-2.4, -13.0, 0.8], [3.4, 7.0, 0.5], [-10.9, -2.1, 0.7], [2.7, -10.3, 0.6],
    ];
    const r = mulberry32(9);
    const e = new THREE.Euler();
    const items = rocks.map((t, i) => {
      const q = new THREE.Quaternion().setFromEuler(e.set(r() * 3, r() * 3, r() * 3));
      const s = t[2];
      const sc = [s * (1 + r() * 0.5), s * (0.55 + r() * 0.3), s * (1 + r() * 0.4)];
      return it([t[0], s * 0.15, t[1]], sc, i / (rocks.length - 1), q, new THREE.Color().setScalar(0.85 + r() * 0.3), [t[0], 0, t[1]]);
    });
    addPart('rocks', paint(new THREE.IcosahedronGeometry(1, 0), 0xb4aea4), mat.veg, items, { win: [W0, W1], dur: 0.4, anim: A_POP });
  }

  /* ============================================================ BLUEPRINT */
  const INK = new THREE.Color(0x2e5c7a); // fjordblå
  const INK_LIGHT = new THREE.Color(0x86a9c1);
  const INK_ACC = new THREE.Color(ORANGE);
  const blueprintU = {
    uReveal: { value: 0 },
    uWin: { value: 0.07 },
    uOpacity: { value: 1 },
    uHot: { value: new THREE.Color(ORANGE) },
  };
  const nodesU = {
    uReveal: blueprintU.uReveal,
    uWin: blueprintU.uWin,
    uOpacity: { value: 1 },
    uSize: { value: 9 },
    uHot: blueprintU.uHot,
  };
  const lineMat = (u) =>
    new THREE.ShaderMaterial({
      uniforms: u,
      vertexShader: BLUEPRINT_VS,
      fragmentShader: BLUEPRINT_FS,
      transparent: true,
      depthWrite: false,
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
    const KC = [INK, INK_LIGHT, INK_ACC];
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

    // foundation outline
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
    // wall box
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
    // stud lines on every wall, skipping openings
    group(0.16, 0.46, () => {
      for (const w of WALLS) {
        const gable = WALL[w].gable;
        const half = gable ? 3.5 : 6;
        const d = gable ? BX : BZ;
        for (let u = -half + 0.6; u < half - 0.1; u += 0.6) {
          const top = gable ? gy(Math.abs(u)) - 0.04 : CLAD_TOP;
          for (const s of cutColumn(w, u - 0.01, u + 0.01, FT, top, 0, 0, 0.2)) {
            const a = wp(w, u, s[0], d);
            const b = wp(w, u, s[1], d);
            L(a[0], a[1], a[2], b[0], b[1], b[2], 1);
          }
        }
      }
    });
    // gables + roof outline
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
    // roof seams
    group(0.5, 0.72, () => {
      for (let x = -GABLE_X + 0.5; x < GABLE_X - 0.1; x += 0.5) {
        for (const sz of [-1, 1]) L(x, roofY(0), 0, x, roofY(EAVE_Z), sz * EAVE_Z, 1);
      }
    });
    // openings (with the elevation-drawing diagonal)
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
    // deck + dimension lines (orange, ticks only)
    group(0.8, 1.0, () => {
      const y = FT + 0.01;
      L(6.05, y, -3.6, DECK_X1, y, -3.6);
      L(DECK_X1, y, -3.6, DECK_X1, y, 3.6);
      L(DECK_X1, y, 3.6, 6.05, y, 3.6);
      for (let x = 6.55; x < DECK_X1; x += 0.5) L(x, y, -3.6, x, y, 3.6, 1);
      const dz = 5.4;
      const g0 = 0.03;
      L(-6, g0, 3.8, -6, g0, dz + 0.3, 2);
      L(6, g0, 3.8, 6, g0, dz + 0.3, 2);
      L(-6, g0, dz, 6, g0, dz, 2);
      for (const x of [-6, 6]) L(x - 0.18, g0, dz + 0.18, x + 0.18, g0, dz - 0.18, 2);
      const hx = 10.6;
      L(hx, 0.02, 0, hx, RIDGE, 0, 2);
      L(GABLE_X + 0.3, RIDGE, 0, hx + 0.35, RIDGE, 0, 2);
      L(DECK_X1 + 0.3, 0.02, 0, hx + 0.35, 0.02, 0, 2);
      for (const yy of [0.02, RIDGE]) L(hx - 0.18, yy - 0.18, 0, hx + 0.18, yy + 0.18, 0, 2);
      // pitch arc at the front-right eave
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
    });

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
    lines.visible = false;
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
        toneMapped: false,
        fog: false,
      }),
    );
    pts.frustumCulled = false;
    pts.renderOrder = 7;
    pts.visible = false;
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
        items.push(it([x, 0.93, z], [0.075, 0.1, 0.075], ci * 0.25 + 0.1, null, col(ORANGE)));
      }
      items.push(it([cx - sx * 0.7, 0.68, cz], [1.55, 0.12, 0.025], ci * 0.25 + 0.14, null, col(PINE, 0.05)));
      items.push(it([cx, 0.68, cz - sz * 0.7], [0.025, 0.12, 1.55], ci * 0.25 + 0.16, null, col(PINE, 0.05)));
    });
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
    addPart('stakes', unitBase, mat.wood, items, { win: win('blueprint', 0.35, 1.0), out: win('grunnmur', 0.7, 1.0), dur: 0.3, anim: A_GROW });
  }
  // string lines (orange) — reuse the blueprint tracing shader
  const stringsU = {
    uReveal: { value: 0 },
    uWin: { value: 0.18 },
    uOpacity: { value: 0 },
    uHot: { value: new THREE.Color(0xffb38f) },
  };
  const strings = (() => {
    const c = new THREE.Color(ORANGE);
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
    l.renderOrder = 6;
    scene.add(l);
    return l;
  })();

  /* ========================================================== GRUNNMUR */
  addPart('gravel', unitBase, mat.gravel, [it([0.9, 0, 0], [17.2, 0.008, 11.6], 0, null, col(0xdcd6cc), [0.9, 0, 0])], {
    win: win('grunnmur', 0, 0.28),
    dur: 1,
    anim: A_POP,
    cast: false,
  });
  {
    const items = [];
    const piles = [[-9.0, -5.4, 1.5], [-8.2, 7.0, 1.1], [6.2, -8.6, 0.95]];
    const ico = paint(new THREE.IcosahedronGeometry(1, 1), 0xffffff);
    piles.forEach(([x, z, s], i) => {
      items.push(it([x, -0.05, z], [s * 1.5, s * 0.55, s * 1.2], i / 2, new THREE.Quaternion().setFromAxisAngle(V_UP, i * 1.7), col(0xa48d74, 0.05), [x, -0.3, z]));
    });
    const soilMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true });
    addPart('soil', ico, soilMat, items, { win: win('grunnmur', 0.04, 0.38), out: win('tak', 0.62, 0.95), dur: 0.5, outDur: 0.6, anim: A_POP });
  }
  addPart('footing', unitBase, mat.concrete, [it([0, 0, 0], [12.44, 0.16, 7.44], 0, null, col(0xa9a6a0))], {
    win: win('grunnmur', 0.16, 0.4),
    dur: 1,
    anim: A_GROW,
  });
  addPart(
    'plinth',
    unitBase,
    mat.concrete,
    [
      it([0, 0.16, 3.345], [11.94, 0.44, 0.25], 0, null, col(0xbdbab3)),
      it([5.845, 0.16, 0], [0.25, 0.44, 6.44], 0.33, null, col(0xb8b5ae)),
      it([0, 0.16, -3.345], [11.94, 0.44, 0.25], 0.66, null, col(0xbdbab3)),
      it([-5.845, 0.16, 0], [0.25, 0.44, 6.44], 1, null, col(0xb8b5ae)),
    ],
    { win: win('grunnmur', 0.32, 0.78), dur: 0.45, anim: A_GROW },
  );
  addPart('slab', unitBase, mat.concrete, [it([0, 0.16, 0], [11.44, 0.438, 6.44], 0, null, col(0xb2afa8))], {
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
    for (let i = 1; i < TRUSS_N - 1; i++) items.push(it([trussX(i), EH, 0], [1, 1, 1], i / (TRUSS_N - 1), null, col(0xd2b07c, 0.06)));
    // hidden once the roof is closed (then only ever seen through the glazing)
    addPart('trusses', trussGeo(true, true), mat.wood, items, { win: win('takstoler', 0, 0.82), dur: 0.16, anim: A_SWING, drop: 2.4, swing: 1.25, hideAt: win('tak', 0.45)[0] });
    addPart(
      'gableRafters',
      trussGeo(false, false),
      mat.wood,
      [it([trussX(0), EH, 0], [1, 1, 1], 0, null, col(0xd2b07c)), it([trussX(TRUSS_N - 1), EH, 0], [1, 1, 1], 1, null, col(0xd2b07c))],
      { win: win('takstoler', 0, 0.82), dur: 0.16, anim: A_SWING, drop: 2.4, swing: 1.25 },
    );
  }
  {
    // gable studs + −x chord
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
    items.push(it([-5.926, 7.9, 0], [0.048, 0.2, 0.85], 0.6, null, col(PINE_DARK)));
    items.push(it([-5.926, 6.552, 0], [0.048, 0.048, 0.75], 0.55, null, col(PINE)));
    addPart('gableStuds', unitBase, mat.wood, items, { win: win('takstoler', 0.55, 1), dur: 0.2, anim: A_DROP, drop: 1.2 });
  }

  /* ========================================================= KLEDNING */
  // scaffolding (tubes + planks); comes down before the painters start
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
      tubes.push(it(a, [1, dir.length(), 1], o / HMAX, orientQ(dir, V_UP), col(0xb3b9bd, 0.05)));
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
        const mx0 = (inner[i][0] + outer[i][0]) / 2;
        const mz0 = (inner[i][1] + outer[i][1]) / 2;
        const mx1 = (inner[j][0] + outer[j][0]) / 2;
        const mz1 = (inner[j][1] + outer[j][1]) / 2;
        const dir = new THREE.Vector3(mx1 - mx0, 0, mz1 - mz0);
        planks.push(it([mx0, y + 0.03, mz0], [0.6, dir.length(), 0.04], (y + 0.3) / HMAX, orientQ(dir, V_UP), col(0xc29a62, 0.08)));
      }
      tube([outer[i][0], 7.1, outer[i][1]], [outer[j][0], 7.1, outer[j][1]], 7.1);
      tube([outer[i][0], 6.6, outer[i][1]], [outer[j][0], 6.6, outer[j][1]], 6.6);
      if (i % 2 === 0) tube([outer[i][0], 0.15, outer[i][1]], [outer[j][0], 4.0, outer[j][1]], 2.0);
    }
    // struck in two steps once the roof is on: planks first, then the tubes. Each piece is
    // lowered a little while the whole rig fades, like a crew taking it down.
    const sw = win('kledning', 0, 0.3);
    const scafSteel = mat.steel.clone();
    scafSteel.transparent = true;
    const scafWood = mat.wood.clone();
    scafWood.transparent = true;
    addPart('scaffoldTubes', tubeGeo, scafSteel, tubes, { win: sw, out: win('tak', 0.75, 1.0), dur: 0.3, outDur: 0.5, anim: A_GROW, outMode: 'drop', outDrop: 0.6 });
    addPart('scaffoldPlanks', unitBase, scafWood, planks, { win: sw, out: win('tak', 0.55, 0.8), dur: 0.3, outDur: 0.5, anim: A_GROW, outMode: 'drop', outDrop: 0.6 });
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
  // standing cladding: under-boards + over-boards (tømmermannskledning).
  // Instance colour = subtle per-board variation; the paint colour comes from
  // the shader (raw pine → painted), and aPaint = (sweep position, jitter).
  {
    const under = [];
    const over = [];
    const tone = (v, j) => new THREE.Color().setScalar(v + (rnd() - 0.5) * j);
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
        const c = tone(0.86, 0.05);
        for (const s of cutColumn(w, ua, ub, CLAD_BASE, topAt(ua, ub), 0, 0, 0.2)) {
          under.push(it(wp(w, u, s[0], base + 0.0405), ws(w, 0.2, s[1] - s[0], 0.019), ord(u), null, c));
        }
      }
      for (let k = -30; k <= 30; k++) {
        const u = k * 0.25 + 0.125;
        if (Math.abs(u) + 0.05 > half + 0.01) continue;
        const ua = u - 0.05;
        const ub = u + 0.05;
        const c = tone(0.98, 0.05);
        for (const s of cutColumn(w, ua, ub, CLAD_BASE, topAt(ua, ub), 0, 0, 0.2)) {
          over.push(it(wp(w, u, s[0], base + 0.0595), ws(w, 0.1, s[1] - s[0], 0.019), ord(u), null, c));
        }
      }
    }
    // corner boards: trim colour (see mat.trimRaw)
    const corners = [];
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const o = sz > 0 ? (sx > 0 ? 0.25 : 0) : sx > 0 ? 0.5 : 0.75;
        corners.push(it([sx * 5.96, CLAD_BASE, sz * 3.5125], [0.12, CLAD_TOP - CLAD_BASE, 0.025], o, null, tone(0.97, 0)));
        corners.push(it([sx * 6.0125, CLAD_BASE, sz * 3.465], [0.025, CLAD_TOP - CLAD_BASE, 0.12], o, null, tone(0.97, 0)));
      }
    }
    addPart('cornerBoards', unitBase, mat.trimRaw, corners, { win: win('kledning', 0.38, 1), dur: 0.12, anim: A_GROW });
    const withPaint = (items) => {
      const g = baseBox();
      const a = new Float32Array(Math.max(1, items.length) * 2);
      items.forEach((t, i) => {
        a[i * 2] = clamp01(sweepD(t.p[0], t.p[2]) / SWEEP_LEN);
        a[i * 2 + 1] = rnd();
      });
      g.setAttribute('aPaint', new THREE.InstancedBufferAttribute(a, 2));
      return g;
    };
    addPart('cladUnder', withPaint(under), mat.clad, under, { win: win('kledning', 0.26, 0.86), dur: 0.12, anim: A_GROW });
    addPart('cladOver', withPaint(over), mat.clad, over, { win: win('kledning', 0.38, 1), dur: 0.12, anim: A_GROW });
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
      const bar = (u0, u1, y0, y1, depth = 0.15, dc = dC, color = FRAME_C) =>
        frames.push(it(wp(w, (u0 + u1) / 2, (y0 + y1) / 2, dc), ws(w, u1 - u0, y1 - y0, depth), ord, null, col(color), anchor));
      const t = 0.075;
      const ex = 0.045;
      bar(o.u0 - ex, o.u0 - ex + t, o.y0 - ex, o.y1 + ex);
      bar(o.u1 + ex - t, o.u1 + ex, o.y0 - ex, o.y1 + ex);
      bar(o.u0 - ex + t, o.u1 + ex - t, o.y1 + ex - t, o.y1 + ex);
      if (o.kind === 'door') {
        bar(o.u0 - ex + t, o.u1 + ex - t, o.y0, o.y0 + 0.03, 0.15);
        bar(o.u0 - 0.35, o.u1 + 0.35, 3.02, 3.07, 0.42, base + 0.22 + 0.06);
        doors.push(it(wp(w, uc, yc - 0.01, base - 0.015), ws(w, o.u1 - o.u0 - 0.06, o.y1 - o.y0 - 0.05, 0.06), ord, null, col(0x9a7550), anchor));
        doors.push(it(wp(w, o.u0 + 0.16, yc, base + 0.04), ws(w, 0.035, 1.1, 0.04), ord, null, col(0xb7ab98), anchor));
      } else {
        bar(o.u0 - ex + t, o.u1 + ex - t, o.y0 - ex, o.y0 - ex + t);
        bar(o.u0 - ex - 0.02, o.u1 + ex + 0.02, o.y0 - ex - 0.025, o.y0 - ex, 0.2, base + 0.04);
        if (o.y1 - o.y0 > 1.8) bar(o.u0, o.u1, o.y0 + 0.62, o.y0 + 0.67, 0.08, base - 0.01);
        glass.push(it(wp(w, uc, yc, base - 0.03), [o.u1 - o.u0, o.y1 - o.y0, 1], ord, QW[w], null, anchor));
      }
    }
    addPart('windowFrames', unitCenter, mat.trim, frames, { win: win('vinduer', 0, 0.8), dur: 0.22, anim: A_POP });
    const gp = addPart('windowGlass', unitPlane, mat.glass, glass, { win: win('vinduer', 0.04, 0.84), dur: 0.22, anim: A_POP, cast: false });
    gp.mesh.renderOrder = 3;
    addPart('door', unitCenter, mat.wood, doors, { win: win('vinduer', 0.45, 0.95), dur: 0.5, anim: A_POP });
  }
  {
    // glazed gable: frame bars grow, glass rises
    const items = [];
    const xC = SX + 0.01;
    const vbar = (z, y0, y1, o) => items.push(it([xC, y0, z], [0.15, y1 - y0, 0.08], o, null, col(FRAME_C)));
    vbar(-GLAZE, 0.6, glazeTop(GLAZE) + 0.04, 0);
    vbar(GLAZE, 0.6, glazeTop(GLAZE) + 0.04, 0.1);
    for (const [z, o] of [[-1.1875, 0.25], [0, 0.32], [1.1875, 0.4]]) vbar(z, 0.65, glazeTop(z), o);
    const hbar = (y, o, h = 0.07) => items.push(it([xC, y, -GLAZE], [h, 2 * GLAZE, 0.15], o, orientQ(new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0)), col(FRAME_C)));
    hbar(0.64, 0.05, 0.1);
    hbar(3.45, 0.55);
    hbar(6.25, 0.7);
    for (const s of [-1, 1]) {
      const a = new THREE.Vector3(xC, glazeTop(GLAZE), s * GLAZE);
      const b = new THREE.Vector3(xC, glazeTop(0), 0);
      const dir = b.clone().sub(a);
      items.push(it(a.toArray(), [0.08, dir.length() + 0.04, 0.15], 0.85, orientQ(dir, new THREE.Vector3(1, 0, 0)), col(FRAME_C)));
    }
    addPart('glazeFrame', unitBase, mat.trim, items, { win: win('vinduer', 0.12, 0.7), dur: 0.3, anim: A_GROW });
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
    gg.mesh.renderOrder = 3;
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
      const origin = s > 0 ? p : roofPt(-GABLE_X, EAVE_Z, s, 0.002);
      items.push(it([origin[0], origin[1], origin[2]], [slopeLen, 2 * GABLE_X, ROOF_T - 0.004], s > 0 ? 0 : 0.35, q, col(0x26292b)));
    }
    ug.translate(0.5, 0, 0);
    addPart('underlay', ug, mat.frame, items, { win: win('tak', 0, 0.22), dur: 0.7, anim: A_GROW });
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
        items.push(it(roofPt(x, -0.02, s, ROOF_T), [1, slopeLen + 0.03, 1], (i / (n - 1)) * 0.92 + (s < 0 ? 0.08 : 0), q, col(0x3a3f42, 0.02)));
      }
    }
    addPart('roofPanels', panelGeo, mat.roof, items, { win: win('tak', 0.08, 0.56), dur: 0.14, anim: A_GROW });
  }
  {
    // trims: ridge, soffits, gutters, downpipes, flue (metal, one step lighter than the roof)
    // + barge boards and eave fascias (painted wood: trim colour, see mat.trimRaw)
    const items = [];
    const fascia = [];
    const C = col(0x4a4f52);
    const SOFFIT = col(0x3a3e40);
    const x1 = GABLE_X + 0.02;
    items.push(it([-x1, RIDGE + ROOF_T + 0.035, 0], [0.24, 2 * x1, 0.07], 0.15, orientQ(new THREE.Vector3(1, 0, 0), V_UP), C));
    for (const sx of [-1, 1]) {
      for (const s of [1, -1]) {
        const dir = s > 0 ? dPlus : dMinus;
        const n = s > 0 ? nPlus : nMinus;
        const p = roofPt(sx * (GABLE_X + 0.015), -0.03, s, -0.08);
        fascia.push(it(p, [0.03, slopeLen + 0.06, 0.34], 0.3 + (sx > 0 ? 0.1 : 0), orientQ(dir, n), col(0xffffff)));
      }
    }
    for (const s of [1, -1]) {
      const ep = roofPt(0, EAVE_Z, s, ROOF_T);
      fascia.push(it([-x1, ep[1] - 0.17, s * (EAVE_Z + 0.03)], [0.3, 2 * x1, 0.03], 0.5, orientQ(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, s)), col(0xffffff)));
      items.push(it([-x1, ep[1] - 0.31, s * 3.69], [0.32, 2 * x1, 0.02], 0.45, orientQ(new THREE.Vector3(1, 0, 0), V_UP), SOFFIT));
      items.push(it([-x1, ep[1] - 0.2, s * (EAVE_Z + 0.1)], [0.11, 2 * x1, 0.1], 0.62, orientQ(new THREE.Vector3(1, 0, 0), V_UP), C));
      for (const sx of [-1, 1]) {
        const yNeck = ep[1] - 0.62;
        items.push(it([sx * 5.7, 0.15, s * 3.6], [0.08, yNeck - 0.15, 0.08], 0.78, null, C));
        const a = new THREE.Vector3(sx * 5.7, yNeck - 0.03, s * 3.6);
        const dir = new THREE.Vector3(0, ep[1] - 0.24 - a.y, s * (EAVE_Z + 0.1) - a.z);
        items.push(it(a.toArray(), [0.08, dir.length(), 0.08], 0.8, orientQ(dir, V_X), C));
      }
    }
    const fz = -1.6;
    const fy = yTop(1.6) - 0.15;
    items.push(it([-2.6, fy, fz], [0.24, RIDGE + 0.85 - fy, 0.24], 0.9, null, col(0x1d1e1f)));
    items.push(it([-2.6, RIDGE + 0.85, fz], [0.32, 0.06, 0.32], 1, null, col(0x1d1e1f)));
    addPart('roofTrim', unitBase, mat.roof, items, { win: win('tak', 0.42, 0.66), dur: 0.3, anim: A_GROW });
    addPart('fascia', unitBase, mat.trimRaw, fascia, { win: win('tak', 0.42, 0.66), dur: 0.3, anim: A_GROW });
  }

  /* ======================================================= INTERIOR */
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
    const add = (x, y, z, sx, sy, sz, o, hex) => items.push(it([x, y, z], [sx, sy, sz], o, null, col(hex), [x, y, z]));
    add(4.2, F, 0.0, 2.6, 0.012, 3.0, 0.0, 0x8a7f70);
    add(3.75, F, 0.0, 0.95, 0.42, 2.5, 0.2, 0x3f4a52);
    add(3.35, F, 0.0, 0.2, 0.82, 2.5, 0.25, 0x37424a);
    add(4.85, F, 0.0, 0.7, 0.36, 0.7, 0.35, 0xb08a5c);
    add(1.6, F + 0.7, 0.4, 1.0, 0.05, 2.2, 0.4, 0xc9a576);
    add(1.6, F, -0.5, 0.9, 0.7, 0.08, 0.38, 0x9b7a50);
    add(1.6, F, 1.3, 0.9, 0.7, 0.08, 0.38, 0x9b7a50);
    add(-2.4, F, 0.2, 2.8, 0.92, 0.9, 0.5, 0xe2ddd4);
    add(-2.4, F + 0.92, 0.2, 2.9, 0.04, 1.0, 0.55, 0x3a3836);
    add(3.62, UF_BASE + 1.0, 0, 0.04, 0.04, 6.5, 0.6, 0x141414);
    for (let z = -3.0; z <= 3.01; z += 1.0) add(3.62, UF_BASE, z, 0.03, 1.0, 0.03, 0.62, 0x141414);
    for (const [x, z, y] of [[4.7, -1.2, 4.4], [4.7, 0, 4.0], [4.7, 1.2, 4.6]]) add(x, y + 0.25, z, 0.012, yTop(Math.abs(z)) - 0.35 - (y + 0.25), 0.012, 0.7, 0x111111);
    for (const z of [0.0, 1.0]) add(1.6, 2.45, z, 0.012, GF_TOP - 2.45, 0.012, 0.72, 0x111111);
    addPart('furniture', unitBase, mat.furn, items, { win: win('tak', 0.3, 0.62), dur: 0.35, anim: A_POP, cast: false });
    const lamps = [];
    for (const [x, z, y] of [[4.7, -1.2, 4.4], [4.7, 0, 4.0], [4.7, 1.2, 4.6]]) lamps.push(it([x, y, z], [0.34, 0.3, 0.34], 0.2, null, null, [x, y + 0.3, z]));
    for (const z of [0.0, 1.0]) lamps.push(it([1.6, 2.2, z], [0.26, 0.25, 0.26], 0.5, null, null, [1.6, 2.45, z]));
    const lampGeo = new THREE.CylinderGeometry(0.35, 0.5, 1, 14).translate(0, 0.5, 0);
    addPart('lamps', lampGeo, mat.lamp, lamps, { win: win('tak', 0.36, 0.6), dur: 0.5, anim: A_POP, cast: false });
  }
  {
    // cantilevered pine deck at the glazed gable
    const frame = [];
    const boards = [];
    const along = (dir) => orientQ(dir, V_UP);
    const qX = along(new THREE.Vector3(1, 0, 0));
    const qZ = along(new THREE.Vector3(0, 0, 1));
    for (const z of [-3.2, -1.1, 1.1, 3.2]) frame.push(it([6.0, FT - 0.13, z], [0.06, DECK_X1 - 6.0, 0.2], 0, qX, col(0x2a2b2c)));
    frame.push(it([DECK_X1 - 0.014, FT - 0.1, -3.62], [0.028, 7.24, 0.2], 0.5, qZ, col(0xd6b88c, 0.03)));
    for (const s of [-1, 1]) frame.push(it([6.0, FT - 0.1, s * 3.606], [0.028, DECK_X1 - 6.0, 0.2], 0.4, qX, col(0xd6b88c, 0.03)));
    addPart('deckFrame', unitBase, mat.wood, frame, { win: win('tak', 0.55, 0.75), dur: 0.5, anim: A_GROW });
    const pitch = 0.132;
    const nb = Math.floor((DECK_X1 - 6.04) / pitch);
    for (let i = 0; i < nb; i++) {
      const x = 6.04 + 0.06 + i * pitch;
      boards.push(it([x, FT - 0.014, -3.6], [0.12, 7.2, 0.028], i / (nb + 2), qZ, col(0xc9a777, 0.08, 0.01)));
    }
    boards.push(it([DECK_X1 + 0.22, 0.3, -1.5], [0.4, 3.0, 0.05], 1, qZ, col(0xc9a777, 0.05)));
    addPart('deckBoards', unitBase, mat.wood, boards, { win: win('tak', 0.62, 1.0), dur: 0.16, anim: A_GROW });
  }

  /* ===================================================== FINISHING */
  {
    const items = [];
    const slabs = [[-4.1, 4.35], [-4.0, 5.2], [-4.15, 6.05], [-3.95, 6.9], [-4.05, 7.75]];
    slabs.forEach(([x, z], i) => items.push(it([x, 0, z], [1.1, 0.05, 0.6], i / (slabs.length - 1), null, col(0xa8a49c, 0.05), [x, 0, z])));
    addPart('path', unitBase, mat.concrete, items, { win: win('maling', 0.45, 1.0), dur: 0.4, anim: A_POP });
    const sconceMat = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffbf7a, emissiveIntensity: 0, roughness: 0.5 });
    mat.sconce = sconceMat;
    const sc2 = [];
    for (const x of [-4.85, -3.4]) sc2.push(it([x, 2.15, SZ + 0.08], [0.08, 0.3, 0.06], x < -4 ? 0 : 1, null, null, [x, 2.3, SZ + 0.08]));
    addPart('sconces', unitBase, sconceMat, sc2, { win: win('vinduer', 0.6, 1.0), dur: 0.6, anim: A_POP, cast: false });
  }

  /* ============================================================= CRANE */
  const CRANE_X = -11.5;
  const CRANE_Z = -8.0;
  const CRANE_H = 10.6;
  const crane = (() => {
    const DARK = 0x2b2e2f;
    const GREY = 0x8d8b86;
    const H = CRANE_H;
    const mw = 1.4;
    const g = new THREE.Group();
    g.position.set(CRANE_X, 0, CRANE_Z);
    const L = [];
    L.push(paint(boxAt(3.2, 0.8, 3.2, 0, 0.4, 0), GREY));
    const c = mw / 2;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) L.push(paint(boxAt(0.1, H - 0.8, 0.1, sx * c, 0.8 + (H - 0.8) / 2, sz * c), ORANGE));
    const sec = 1.4;
    const faces = [[[-c, -c], [c, -c]], [[c, -c], [c, c]], [[c, c], [-c, c]], [[-c, c], [-c, -c]]];
    let flip = 0;
    for (let y = 0.8; y < H - 0.2; y += sec) {
      const y1 = Math.min(H, y + sec);
      for (const [a, b] of faces) {
        L.push(paint(beamGeo(a[0], y, a[1], b[0], y, b[1], 0.05, 0.05), ORANGE));
        const s = flip % 2 ? [a, b] : [b, a];
        L.push(paint(beamGeo(s[0][0], y, s[0][1], s[1][0], y1, s[1][1], 0.045, 0.045), ORANGE));
      }
      flip++;
    }
    const mast = new THREE.Mesh(merge(L), mat.crane);
    mast.castShadow = true;
    g.add(mast);
    const top = new THREE.Group();
    top.position.y = H;
    g.add(top);
    const T = [];
    T.push(paint(boxAt(1.8, 0.5, 1.8, 0, 0.25, 0), DARK));
    T.push(paint(boxAt(1.1, 1.2, 1.0, 0.95, -0.35, 1.15), ORANGE));
    T.push(paint(boxAt(1.12, 0.45, 1.02, 0.95, 0.05, 1.15), 0x9fb6c4));
    const J0 = 0.9;
    const J1 = 17;
    const jy = 0.5;
    const jh = 1.1;
    const jw = 0.48;
    for (const sz of [-1, 1]) T.push(paint(boxAt(J1 - J0, 0.08, 0.08, (J0 + J1) / 2, jy, sz * jw), ORANGE));
    T.push(paint(boxAt(J1 - J0, 0.08, 0.08, (J0 + J1) / 2, jy + jh, 0), ORANGE));
    let k = 0;
    for (let x = J0; x < J1 - 0.1; x += 1.25) {
      const x1 = Math.min(J1, x + 1.25);
      for (const sz of [-1, 1]) {
        if (k % 2) T.push(paint(beamGeo(x, jy, sz * jw, x1, jy + jh, 0, 0.04, 0.04), ORANGE));
        else T.push(paint(beamGeo(x, jy + jh, 0, x1, jy, sz * jw, 0.04, 0.04), ORANGE));
      }
      T.push(paint(beamGeo(x, jy, -jw, x, jy, jw, 0.035, 0.035, new THREE.Vector3(0, 1, 0)), ORANGE));
      k++;
    }
    for (const sz of [-1, 1]) T.push(paint(boxAt(5.6, 0.1, 0.1, -3.6, jy, sz * 0.52), ORANGE));
    for (let x = -1.2; x > -6.4; x -= 1.2) T.push(paint(beamGeo(x, jy, -0.52, x, jy, 0.52, 0.05, 0.05), ORANGE));
    T.push(paint(boxAt(1.3, 1.5, 1.2, -5.6, jy - 0.4, 0), GREY));
    T.push(paint(boxAt(2.2, 0.06, 1.1, -3.5, jy + 0.06, 0), 0x4a4c4d));
    const CH = 4.6;
    for (const sz of [-1, 1]) {
      T.push(paint(beamGeo(-0.6, 0.5, sz * 0.55, 0, CH, 0, 0.09, 0.09), ORANGE));
      T.push(paint(beamGeo(0.6, 0.5, sz * 0.55, 0, CH, 0, 0.09, 0.09), ORANGE));
    }
    T.push(paint(beamGeo(0, CH, 0, 11.5, jy + jh, 0, 0.035, 0.035), 0x7a7a7a));
    T.push(paint(beamGeo(0, CH, 0, -6.0, jy + 0.1, 0, 0.035, 0.035), 0x7a7a7a));
    const head = new THREE.Mesh(merge(T), mat.crane);
    head.castShadow = true;
    top.add(head);
    const trolley = new THREE.Group();
    trolley.position.y = jy;
    top.add(trolley);
    trolley.add(new THREE.Mesh(paint(boxAt(0.8, 0.3, 1.0, 0, -0.1, 0), DARK), mat.crane));
    const cable = new THREE.Mesh(paint(boxAt(0.03, 1, 0.03, 0, -0.5, 0), 0x2a2a2a), mat.crane);
    trolley.add(cable);
    const hook = new THREE.Group();
    trolley.add(hook);
    hook.add(new THREE.Mesh(paint(boxAt(0.34, 0.5, 0.24, 0, -0.26, 0), 0xf2b630), mat.crane));
    const LD = [];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) LD.push(paint(boxAt(0.14, 0.14, 4.0, (i - 1.5) * 0.15, -1.55 + j * 0.15, 0), i % 2 ? 0xdcbc8c : 0xd0ad7a));
    LD.push(paint(beamGeo(-0.25, -0.55, 0, 0, -1.2, -1.4, 0.02, 0.02), 0x333333));
    LD.push(paint(beamGeo(0.25, -0.55, 0, 0, -1.2, 1.4, 0.02, 0.02), 0x333333));
    const load = new THREE.Mesh(merge(LD), mat.crane);
    load.castShadow = true;
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

  let bpTarget = 0;
  let bpShown = 0;
  let active = true;
  let inView = true;
  let disposed = false;
  let raf = 0;
  let lastT = 0;
  let clock = 0;
  let snap = true;
  let buildDirty = true;
  let renderDirty = true;
  // autoplay: driven by wall-clock time, so a slow GPU drops frames instead of stretching the build
  let playing = false;
  let playStart = 0;
  let playDur = 8000;
  let rewinding = false;
  let rewindFrom = 0;
  let rewindStart = 0;
  let rewindDur = 1100;
  // stages / completion
  let stageIdx = -1;
  let completeFired = false;
  const stageCbs = new Set();
  const completeCbs = new Set();
  // camera
  const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  // framing: centre shift (sx, sy) and the share of the canvas (aw, ah) the house is fitted into
  const view = { sx: 0, sy: 0, tsx: 0, tsy: 0, aw: 1, ah: 1, taw: 1, tah: 1, scroll: 0, tscroll: 0 };
  let paintZoom = 0;
  const cam = { az: 0, el: 0, ly: 0, d: 40 };
  let idleT = 0;
  let idleBlend = 0;
  let viewW = 1;
  let viewH = 1;
  let appliedShiftX = 0;
  let appliedShiftY = 0;
  let tanHalfV = Math.tan((camera.fov * Math.PI) / 360);
  let craneS = 0;
  let fin = 0;
  const lastCam = new Float32Array(6);

  /* ------------------------------------------------------------- paint */
  const SWEEP_MS = 1600; // one repaint, front-left corner to back-right corner
  const wallNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const paintColor = new THREE.Color(DEFAULT_PAINT); // what the visitor picked
  const paintAlbedo = new THREE.Color(); // what the shader gets
  /** Daylight brightens the sunlit façade, so darker/saturated paints are
      toned down a little to make the lit wall read like the swatch. */
  const toAlbedo = (src, out) => {
    const lum = 0.2126 * src.r + 0.7152 * src.g + 0.0722 * src.b; // linear
    const k = 0.8 + 0.2 * smooth(range(lum, 0.3, 0.75));
    return out.setRGB(src.r * k, src.g * k, src.b * k);
  };
  toAlbedo(paintColor, paintAlbedo);
  const KRITT = new THREE.Color(0xf4f1ea);
  const ANTRASITT = new THREE.Color(0x2b2e2f);
  const _srgb = new THREE.Color();
  /** hvite listverk: Kritthvit trims on a dark paint, Antrasitt on a light one (sRGB luma) */
  const trimFor = (src, out) => {
    _srgb.copy(src).convertLinearToSRGB();
    const luma = 0.2126 * _srgb.r + 0.7152 * _srgb.g + 0.0722 * _srgb.b;
    return out.copy(luma < 0.5 ? KRITT : ANTRASITT);
  };
  const paintTrim = trimFor(paintColor, new THREE.Color());
  let paintHex = DEFAULT_PAINT;
  const layerPool = [0, 1, 2, 3].map(() => ({ c: new THREE.Color(), tc: new THREE.Color(), t0: 0 }));
  const layers = [];
  let paintDone = false; // repaint queue owns the paint (build finished)
  const paintEndCbs = new Set();
  const edgeOf = (t) => -0.05 + 1.27 * t;

  /* the roller: rides the newest paint edge along the front and onto the glazed gable */
  const roller = (() => {
    const g = new THREE.Group();
    const handleMat = new THREE.MeshStandardMaterial({ color: ORANGE, roughness: 0.45, transparent: true });
    const yokeMat = new THREE.MeshStandardMaterial({ color: 0x2b2e2f, roughness: 0.4, metalness: 0.5, transparent: true });
    const sleeveMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.38, transparent: true });
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.55, 12).rotateZ(Math.PI / 2), sleeveMat);
    sleeve.position.set(0, 0, 0.15);
    const yoke = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.14, 6).rotateZ(Math.PI / 2), yokeMat);
    yoke.position.set(0.335, 0, 0.15);
    const dir = new THREE.Vector3(0, -1.22, 0.68).normalize();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.4, 6).translate(0, -0.7, 0), handleMat);
    handle.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
    handle.position.set(0.4, 0, 0.15);
    g.add(sleeve, yoke, handle);
    // a touch larger than life, so the tool reads at hero size
    g.scale.setScalar(1.35);
    g.visible = false;
    g.renderOrder = 4;
    scene.add(g);
    const FRONT_Z = SZ + 0.069;
    const GABLE_XF = SX + 0.069;
    const GLAZE_D = 12 + (3.45 - GLAZE); // where the glazing starts on the gable
    let shown = false;
    /** edge in sweep space (null hides), t = sweep progress 0..1, colour = incoming paint */
    function set(edge, t, color) {
      if (edge == null || reducedMotion) {
        const was = shown;
        g.visible = shown = false;
        return was;
      }
      const y = lerp(CLAD_BASE + 0.5, EH - 0.3, 0.5 + 0.5 * Math.sin(edge * TAU * 6));
      const d = Math.max(0, Math.min(SWEEP_LEN, (edge - (9.4 - y) * 0.0085) * SWEEP_LEN));
      const a = smooth(clamp01(t / 0.04)) * smooth(clamp01((1 - t) / 0.04)) * (1 - smooth(range(d, GLAZE_D - 0.6, GLAZE_D - 0.1)));
      if (a <= 0.003) {
        const was = shown;
        g.visible = shown = false;
        return was;
      }
      if (d <= 12) {
        g.position.set(d - 6, y, FRONT_Z);
        g.rotation.y = 0;
      } else {
        g.position.set(GABLE_XF, y, 15.5 - d);
        g.rotation.y = Math.PI / 2;
      }
      sleeveMat.color.copy(color);
      handleMat.opacity = yokeMat.opacity = sleeveMat.opacity = a;
      g.visible = shown = true;
      return true;
    }
    return { g, set };
  })();

  function emitPaintEnd() {
    const ev = { color: paintHex };
    paintEndCbs.forEach((cb) => {
      try {
        cb(ev);
      } catch (e) {
        /* ignore listener errors */
      }
    });
  }

  function updatePaint() {
    const E = paintU.uPaintE.value;
    const C = paintU.uPaintC.value;
    const TC = trimU.uTrimC.value;
    if (bpShown < 1) {
      paintDone = false;
      layers.length = 0;
      paintU.uPaintBase.value.copy(RAW_C);
      trimU.uTrimBase.value.copy(paintTrim);
      trimU.uTrimRaw.value.copy(RAW_C);
      const t = range(bpShown, PAINT_START, PAINT_END);
      C[0].copy(paintAlbedo);
      TC[0].copy(paintTrim);
      E[0] = t > 0 ? edgeOf(t) : -1;
      E[1] = E[2] = E[3] = -1;
      roller.set(t > 0 && t < 1 ? E[0] : null, t, paintAlbedo);
      return false;
    }
    if (!paintDone) {
      paintDone = true;
      paintU.uPaintBase.value.copy(paintAlbedo);
      trimU.uTrimBase.value.copy(paintTrim);
      layers.length = 0;
    }
    const now = wallNow();
    let ended = false;
    while (layers.length && now - layers[0].t0 >= SWEEP_MS) {
      paintU.uPaintBase.value.copy(layers[0].c);
      trimU.uTrimBase.value.copy(layers[0].tc);
      layers.shift();
      if (!layers.length) ended = true;
    }
    trimU.uTrimRaw.value.copy(trimU.uTrimBase.value);
    for (let i = 0; i < 4; i++) {
      if (i < layers.length) {
        C[i].copy(layers[i].c);
        TC[i].copy(layers[i].tc);
        E[i] = edgeOf(clamp01((now - layers[i].t0) / SWEEP_MS));
      } else E[i] = -1;
    }
    let rollerMoved;
    if (layers.length) {
      const top = layers[layers.length - 1];
      const tl = clamp01((now - top.t0) / SWEEP_MS);
      rollerMoved = roller.set(edgeOf(tl), tl, top.c);
    } else rollerMoved = roller.set(null);
    if (ended) emitPaintEnd();
    return layers.length > 0 || ended || rollerMoved;
  }
  /** '#9B2F22' | '9B2F22' | '#abc' | 0x9b2f22 | THREE.Color → Color, or null if invalid */
  function parsePaint(v) {
    if (v && v.isColor) return v.clone();
    if (typeof v === 'number' && isFinite(v)) return new THREE.Color(v & 0xffffff);
    if (typeof v !== 'string') return null;
    let h = v.trim().replace(/^#/, '');
    if (/^[0-9a-f]{3}$/i.test(h)) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (!/^[0-9a-f]{6}$/i.test(h)) return null;
    return new THREE.Color(parseInt(h, 16));
  }
  function pushPaintLayer(color, trim) {
    if (layers.length === 4) {
      paintU.uPaintBase.value.copy(layers[0].c);
      trimU.uTrimBase.value.copy(layers[0].tc);
      layers.shift();
    }
    // reuse a pooled layer object that is not in use
    let slot = null;
    for (const l of layerPool) if (!layers.includes(l)) slot = l;
    slot.c.copy(color);
    slot.tc.copy(trim);
    slot.t0 = wallNow();
    layers.push(slot);
  }
  /** drop any running sweep and show `paintAlbedo` / `paintTrim` everywhere */
  function paintInstant() {
    layers.length = 0;
    paintU.uPaintBase.value.copy(paintAlbedo);
    trimU.uTrimBase.value.copy(paintTrim);
    trimU.uTrimRaw.value.copy(paintTrim);
  }

  /* ------------------------------------------------------------- build */
  const INT_DARK = new THREE.Color(0x3a352f);
  const INT_LIT = new THREE.Color(0x8a7f71);
  function applyBuild(p) {
    let changed = false;
    for (let i = 0; i < parts.length; i++) if (parts[i].update(p)) changed = true;
    const lB = range(p, ST.blueprint.start, ST.blueprint.end);
    const lG = range(p, ST.grunnmur.start, ST.grunnmur.end);
    const lT = range(p, ST.tak.start, ST.tak.end);
    const lF = range(p, ST.ferdig.start - 0.02, 1);
    // blueprint: draws during the blueprint stage, fades as the frame goes up
    blueprintU.uReveal.value = range(lB, 0, 0.92) * (1 + blueprintU.uWin.value * 4.5);
    const ghost = 1 - smooth(range(p, ST.grunnmur.start + 0.02, ST.takstoler.end));
    blueprintU.uOpacity.value = ghost;
    nodesU.uOpacity.value = ghost;
    blueprint.lines.visible = p > 0 && ghost > 0.003;
    blueprint.pts.visible = blueprint.lines.visible;
    // survey grid: fades in with the drawing, out as the house rises
    const gridA = smooth(range(lB, 0, 0.35)) * (1 - smooth(range(p, ST.grunnmur.start, ST.bjelkelag.end)));
    gridMat.opacity = gridA;
    grid.visible = gridA > 0.003;
    // string lines
    stringsU.uReveal.value = range(lB, 0.55, 1.0) * 1.2 + range(lG, 0, 0.2) * 0.3;
    stringsU.uOpacity.value = 0.95 * (1 - range(lG, 0.72, 0.95));
    strings.visible = lB > 0.55 && lG < 0.95;
    // contact shadow under the footprint
    aoMat.opacity = 0.3 * smooth(range(lG, 0.15, 0.9));
    ao.visible = aoMat.opacity > 0.002;
    // interior + lights
    interior.visible = p >= ST.vinduer.start;
    const lights = smooth(lF);
    fin = lights;
    pGF.intensity = 20 * lights;
    pUF.intensity = 14 * lights;
    pVoid.intensity = 18 * lights;
    mat.interior.color.lerpColors(INT_DARK, INT_LIT, lights);
    mat.interior.emissiveIntensity = 0.06 * lights;
    mat.lamp.emissiveIntensity = 3.5 * lights;
    mat.glass.emissiveIntensity = 0.05 * lights;
    gableGlassMat.emissiveIntensity = 0.04 * lights;
    gableGlassMat.opacity = lerp(0.78, 0.66, lights);
    mat.glass.opacity = lerp(0.8, 0.7, lights);
    mat.sconce.emissiveIntensity = 3 * lights;
    // crane: rises with the foundations, sinks away once the roof is on
    craneS = smooth(range(lG, 0.1, 0.85)) * (1 - smooth(range(lT, 0.62, 0.98)));
    return changed;
  }

  function updateCrane(t) {
    const s = craneS;
    crane.g.visible = s > 0.002;
    if (!crane.g.visible) return false;
    crane.g.position.y = -(1 - s) * (CRANE_H + 6);
    const p = bpShown;
    const lT = range(p, ST.tak.start, ST.tak.end);
    const toHouse = Math.atan2(-(0 - CRANE_Z), 1.5 - CRANE_X);
    let a = toHouse + 0.55 * Math.sin(p * TAU * 2.3 + 0.6);
    // rises with the jib turned away from the plot, then slews in over it
    a = lerp(toHouse + 2.2, a, smooth(range(p, ST.grunnmur.start + 0.04, ST.bindingsverk.start + 0.02)));
    a = lerp(a, toHouse - 1.3, smooth(range(lT, 0.45, 0.8)));
    if (!reducedMotion) a += Math.sin(t * 0.21) * 0.025;
    crane.top.rotation.y = a;
    crane.trolley.position.x = 9.5 + 4.5 * (0.5 + 0.5 * Math.sin(p * TAU * 3.1 + 1.0));
    let len = 1.0 + 0.8 * (0.5 + 0.5 * Math.sin(p * TAU * 4.3));
    len = lerp(len, 0.8, smooth(range(lT, 0.3, 0.7)));
    crane.cable.scale.y = len;
    crane.hook.position.y = -len;
    if (!reducedMotion) crane.hook.rotation.y = Math.sin(t * 0.5) * 0.12;
    crane.load.visible = p > ST.bindingsverk.start && p < ST.tak.start + 0.03;
    return true;
  }

  /* ------------------------------------------------------------ camera */
  function updateCamera(dt) {
    camAt(bpShown, camParam);
    let az = camParam[0];
    let el = camParam[1];
    let ly = camParam[2];
    let dm = camParam[3];
    // dolly in a little while the painters work (build and every repaint), ease back after
    const painting = (bpShown >= PAINT_START && bpShown < ST.ferdig.start) || layers.length > 0;
    paintZoom += ((painting ? 1 : 0) - paintZoom) * (snap ? 1 : damp(dt, painting ? 2.2 : 1.4));
    if (Math.abs(paintZoom - (painting ? 1 : 0)) < 1e-4) paintZoom = painting ? 1 : 0;
    if (!reducedMotion) dm *= 1 - 0.06 * smooth(paintZoom);
    // idle orbit after completion: one gentle sway that fades out after ~20 s (WCAG 2.2.2)
    if (bpShown >= 1 && !playing && !rewinding) {
      if (!reducedMotion && idleT < 30) idleT += dt;
      idleBlend = Math.min(1, idleBlend + dt * 0.5);
    } else {
      idleT = 0;
      idleBlend = 0;
    }
    if (!reducedMotion) {
      const sway = smooth(idleBlend) * (1 - smooth(range(idleT, 20, 26)));
      az += sway * (Math.sin(idleT * 0.12) * 0.2);
      el += sway * (Math.sin(idleT * 0.085) * 0.025);
      az += ptr.x * 0.16;
      el += ptr.y * 0.045;
      az += view.scroll * 0.42;
      el += view.scroll * 0.1;
    }
    if (el < 0.06) el = 0.06;
    // fit the finished house (and the crane while it stands) into the framing region
    const aw = Math.max(0.2, view.aw);
    const ah = Math.max(0.2, view.ah);
    const margin = 1.1;
    const tanV = (tanHalfV * ah) / margin;
    const tanH = (tanHalfV * camera.aspect * aw) / margin;
    const d = fitDistance(az, el, TARGET_Y + ly, tanH, tanV, FRAME_BOX[3] + 3.0 * craneS) * dm;
    if (snap) {
      cam.az = az;
      cam.el = el;
      cam.ly = ly;
      cam.d = d;
    } else {
      const k = damp(dt, playing || rewinding ? 2.6 : 2.0);
      cam.az += (az - cam.az) * k;
      cam.el += (el - cam.el) * k;
      cam.ly += (ly - cam.ly) * k;
      // back off faster than we close in, so a turn never overfills the frame for a moment
      cam.d += (d - cam.d) * damp(dt, d > cam.d ? 3.4 : 1.6);
    }
    const ce = Math.cos(cam.el);
    const ty = TARGET_Y + cam.ly;
    camera.position.set(TARGET_X + Math.sin(cam.az) * ce * cam.d, ty + Math.sin(cam.el) * cam.d, TARGET_Z + Math.cos(cam.az) * ce * cam.d);
    camera.lookAt(TARGET_X, ty, TARGET_Z);
    scene.fog.near = cam.d + 14;
    scene.fog.far = cam.d + 80;
    // did anything move enough to need a new frame?
    const moved =
      Math.abs(lastCam[0] - cam.az) > 1e-5 ||
      Math.abs(lastCam[1] - cam.el) > 1e-5 ||
      Math.abs(lastCam[2] - cam.d) > 1e-4 ||
      Math.abs(lastCam[3] - cam.ly) > 1e-5;
    lastCam[0] = cam.az;
    lastCam[1] = cam.el;
    lastCam[2] = cam.d;
    lastCam[3] = cam.ly;
    return moved;
  }

  function applyViewShift(force) {
    if (!force && Math.abs(view.sx - appliedShiftX) < 1e-4 && Math.abs(view.sy - appliedShiftY) < 1e-4) return false;
    appliedShiftX = view.sx;
    appliedShiftY = view.sy;
    if (Math.abs(appliedShiftX) < 1e-4 && Math.abs(appliedShiftY) < 1e-4) camera.clearViewOffset();
    // positive x → house moves right, positive y → house moves down
    else camera.setViewOffset(viewW, viewH, -appliedShiftX * viewW, -appliedShiftY * viewH, viewW, viewH);
    return true;
  }

  /* ------------------------------------------------------------ events */
  function emitStage(i) {
    if (i === stageIdx) return;
    stageIdx = i;
    const s = STAGES[i];
    const ev = { id: s.id, label: s.label };
    stageCbs.forEach((cb) => {
      try {
        cb(ev);
      } catch (e) {
        /* ignore listener errors */
      }
    });
  }
  function checkComplete() {
    if (bpShown >= 1) {
      if (!completeFired) {
        completeFired = true;
        completeCbs.forEach((cb) => {
          try {
            cb();
          } catch (e) {
            /* ignore */
          }
        });
      }
    } else if (bpShown < 1 - 1e-6) completeFired = false;
  }

  /* -------------------------------------------------------------- tick */
  function tick(dt) {
    clock += dt;
    let anim = false;
    // drive progress
    if (rewinding) {
      const t = clamp01((wallNow() - rewindStart) / rewindDur);
      bpTarget = bpShown = rewindFrom * (1 - inOutCubic(t));
      buildDirty = true;
      anim = true;
      if (t >= 1) {
        rewinding = false;
        playing = true;
        playStart = wallNow();
      }
    } else if (playing) {
      const u = clamp01((wallNow() - playStart) / playDur);
      bpTarget = bpShown = timeToP(u);
      buildDirty = true;
      anim = true;
      if (u >= 1) playing = false;
    } else {
      const prev = bpShown;
      if (snap) bpShown = bpTarget;
      else {
        bpShown += (bpTarget - bpShown) * damp(dt, reducedMotion ? 16 : 6);
        if (Math.abs(bpTarget - bpShown) < 2e-5) bpShown = bpTarget;
      }
      if (bpShown !== prev) buildDirty = true;
    }
    if (buildDirty) {
      if (applyBuild(bpShown)) renderer.shadowMap.needsUpdate = true;
      buildDirty = false;
      anim = true;
      if (!rewinding) emitStage(stageIndexAt(bpShown));
    }
    if (updatePaint()) anim = true;
    if (updateCrane(clock)) {
      renderer.shadowMap.needsUpdate = true;
      anim = true;
    }
    // pointer + framing (smoothed)
    const pk = snap ? 1 : damp(dt, 3.2);
    const rm = reducedMotion ? 0 : 1;
    ptr.x += (ptr.tx * rm - ptr.x) * pk;
    ptr.y += (ptr.ty * rm - ptr.y) * pk;
    if (Math.abs(ptr.tx * rm - ptr.x) < 1e-4) ptr.x = ptr.tx * rm;
    if (Math.abs(ptr.ty * rm - ptr.y) < 1e-4) ptr.y = ptr.ty * rm;
    const vk = snap ? 1 : damp(dt, 3);
    view.sx += (view.tsx - view.sx) * vk;
    view.sy += (view.tsy - view.sy) * vk;
    view.aw += (view.taw - view.aw) * vk;
    view.ah += (view.tah - view.ah) * vk;
    view.scroll += (view.tscroll - view.scroll) * (snap ? 1 : damp(dt, 4));
    if (Math.abs(view.tsx - view.sx) < 1e-5) view.sx = view.tsx;
    if (Math.abs(view.tsy - view.sy) < 1e-5) view.sy = view.tsy;
    if (Math.abs(view.taw - view.aw) < 1e-5) view.aw = view.taw;
    if (Math.abs(view.tah - view.ah) < 1e-5) view.ah = view.tah;
    if (Math.abs(view.tscroll - view.scroll) < 1e-5) view.scroll = view.tscroll;
    if (applyViewShift(false)) anim = true;
    if (updateCamera(dt)) anim = true;
    checkComplete();
    snap = false;
    return anim;
  }

  let frameNo = 0;
  let compiling = true;
  function frame(now) {
    raf = 0;
    if (!active || !inView || disposed || compiling) return;
    // the slow idle orbit only needs ~30 fps
    if (lastT && !renderDirty && !playing && !rewinding && bpShown >= 1 && !layers.length && frameNo++ & 1) {
      raf = requestAnimationFrame(frame);
      return;
    }
    let dt = lastT ? (now - lastT) / 1000 : 0.016;
    lastT = now;
    if (dt > 0.1) dt = 0.1;
    if (dt < 0) dt = 0;
    const moving = tick(dt);
    if (moving || renderDirty) {
      renderer.render(scene, camera);
      renderDirty = false;
    }
    // idle: nothing moved and nothing is queued, so stop asking for frames until an input
    // (play, paint, pointer, scroll, resize, framing) calls start() again
    if (moving || playing || rewinding || layers.length || buildDirty || bpShown !== bpTarget) raf = requestAnimationFrame(frame);
    else lastT = 0;
  }
  function start() {
    if (raf || !active || !inView || disposed || compiling || document.hidden) return;
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
  // three re-creates its GL state on restore; render targets (reflections, shadows) are refilled here
  const onRestored = () => {
    if (disposed) return;
    const old = envTex;
    envTex = makeEnv();
    scene.environment = envTex;
    scene.traverse((o) => {
      if (!o.material) return;
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
        if (old && m.envMap === old) m.envMap = envTex;
        m.needsUpdate = true;
      });
    });
    if (old) old.dispose();
    renderer.shadowMap.needsUpdate = true;
    for (const p of parts) p.lastL = -1;
    buildDirty = true;
    renderDirty = true;
    snap = true;
    lastT = 0;
    start();
  };
  canvas.addEventListener('webglcontextrestored', onRestored);
  let ro = null;
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(() => resize());
    ro.observe(canvas);
  }
  // belt and braces: never render while the canvas is scrolled away
  let io = null;
  if (typeof IntersectionObserver !== 'undefined') {
    io = new IntersectionObserver((entries) => {
      const e = entries[entries.length - 1];
      inView = !!(e && e.isIntersecting);
      if (inView) start();
      else stop();
    });
    io.observe(canvas);
  }

  function resize() {
    if (disposed) return;
    const w = Math.max(1, canvas.clientWidth || (canvas.parentElement && canvas.parentElement.clientWidth) || window.innerWidth || 1);
    const h = Math.max(1, canvas.clientHeight || (canvas.parentElement && canvas.parentElement.clientHeight) || window.innerHeight || 1);
    viewW = w;
    viewH = h;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = camera.aspect < 0.8 ? 38 : camera.aspect < 1.3 ? 34 : 30;
    tanHalfV = Math.tan((camera.fov * Math.PI) / 360);
    camera.updateProjectionMatrix();
    applyViewShift(true);
    nodesU.uSize.value = 9 * renderer.getPixelRatio();
    renderDirty = true;
    start();
  }

  // Compile every program up-front (avoids hitches when parts first appear). compileAsync
  // lets the driver link in parallel (KHR_parallel_shader_compile) instead of one long task.
  // Hidden parts are made visible for the compile and hidden again before the first frame.
  resize();
  if (reducedMotion) bpTarget = bpShown = 1;
  const ready = (() => {
    const hidden = [];
    scene.traverse((o) => {
      if (!o.visible) {
        hidden.push(o);
        o.visible = true;
      }
    });
    let job;
    try {
      const parallel = typeof renderer.compileAsync === 'function' && renderer.extensions.has('KHR_parallel_shader_compile');
      job = parallel ? renderer.compileAsync(scene, camera) : renderer.compile(scene, camera);
    } catch (e) {
      job = null;
    }
    return Promise.resolve(job)
      .catch(() => {})
      .then(() => {
        for (const o of hidden) o.visible = false;
        compiling = false;
        if (disposed) return false;
        applyBuild(bpShown);
        for (const p of parts) p.lastL = -1;
        buildDirty = true;
        renderDirty = true;
        snap = true;
        start();
        return true;
      });
  })();

  function finishNow() {
    playing = false;
    rewinding = false;
    bpTarget = bpShown = 1;
    buildDirty = true;
    snap = true;
    layers.length = 0;
    paintDone = false; // base re-seeded from the current colour on the next tick
    renderDirty = true;
    start();
  }

  /* ================================================================ API */
  const api = {
    /** resolves once the shaders are compiled and the first frame can be drawn */
    ready,
    /** auto-build from 0 → built → painted. Restarts (with a quick rewind) if called again. */
    play({ duration = 8000, rewind = true } = {}) {
      if (disposed) return;
      if (reducedMotion) {
        finishNow();
        return;
      }
      playDur = Math.max(1000, +duration || 8000);
      completeFired = false;
      layers.length = 0;
      if (rewind && bpShown > 0.08) {
        rewinding = true;
        rewindFrom = bpShown;
        rewindStart = wallNow();
        rewindDur = 650 + 650 * bpShown;
        playing = false;
        idleBlend = 0;
        stageIdx = -1;
        emitStage(0);
      } else {
        rewinding = false;
        playing = true;
        playStart = wallNow();
        bpTarget = bpShown = 0;
        buildDirty = true;
        stageIdx = -1;
      }
      start();
    },
    /** jump to the finished, painted house */
    skipToEnd() {
      if (disposed) return;
      finishNow();
    },
    /** build state is a pure function of p (smoothed unless immediate). Cancels autoplay. */
    setBuildProgress(p, immediate = false) {
      playing = false;
      rewinding = false;
      bpTarget = clamp01(+p || 0);
      if (immediate) {
        bpShown = bpTarget;
        buildDirty = true;
        snap = true;
      }
      start();
    },
    /** repaint the walls with a roller sweep (instant if !animate or reduced motion) */
    setPaintColor(hex, { animate = true } = {}) {
      if (disposed) return;
      const c = parsePaint(hex);
      if (!c) return;
      if (c.equals(paintColor)) {
        // same colour again: nothing to do, unless an instant finish was asked for
        if (!animate && layers.length) {
          paintInstant();
          renderDirty = true;
          start();
        }
        return;
      }
      paintColor.copy(c);
      toAlbedo(c, paintAlbedo);
      trimFor(c, paintTrim);
      paintHex = '#' + c.getHexString().toUpperCase();
      if (paintDone && bpShown >= 1) {
        if (animate && !reducedMotion) pushPaintLayer(paintAlbedo, paintTrim);
        else paintInstant();
      }
      renderDirty = true;
      start();
    },
    /** cb({ id, label }) on every stage change; returns an unsubscribe function */
    onStage(cb) {
      if (typeof cb !== 'function') return () => {};
      stageCbs.add(cb);
      return () => stageCbs.delete(cb);
    },
    /** cb() once the build + paint is finished (again after each replay) */
    onComplete(cb) {
      if (typeof cb !== 'function') return () => {};
      completeCbs.add(cb);
      return () => completeCbs.delete(cb);
    },
    /** cb({ color }) when a repaint sweep (after the build) has reached the last board */
    onPaintEnd(cb) {
      if (typeof cb !== 'function') return () => {};
      paintEndCbs.add(cb);
      return () => paintEndCbs.delete(cb);
    },
    /** normalized pointer -1..1 (x right, y up) */
    setPointer(x, y) {
      ptr.tx = Math.max(-1, Math.min(1, +x || 0));
      ptr.ty = Math.max(-1, Math.min(1, +y || 0));
      start();
    },
    /** screen-space framing shift in fractions of the canvas (x>0 → right, y>0 → down).
        The house is refitted into what is left (from 2x to the far edge). null resets.
        Optional `region` {left, top, right, bottom} (fractions of the canvas) gives the exact
        area to fit the house into; it then decides both the shift and the fit. */
    setViewShift(x, y, region) {
      const ok = region && [region.left, region.top, region.right, region.bottom].every((v) => Number.isFinite(+v));
      if (ok) {
        const l = Math.max(-0.5, Math.min(1, +region.left));
        const r = Math.max(l + 0.1, Math.min(1.5, +region.right));
        const t = Math.max(-0.5, Math.min(1, +region.top));
        const b = Math.max(t + 0.1, Math.min(1.5, +region.bottom));
        view.tsx = (l + r) / 2 - 0.5;
        view.tsy = (t + b) / 2 - 0.5;
        view.taw = r - l;
        view.tah = b - t;
      } else {
        view.tsx = x == null ? 0 : Math.max(-0.35, Math.min(0.35, +x || 0));
        view.tsy = y == null ? 0 : Math.max(-0.35, Math.min(0.35, +y || 0));
        view.taw = 1 - 2 * Math.abs(view.tsx);
        view.tah = 1 - 2 * Math.abs(view.tsy);
      }
      start();
    },
    /** optional: 0 = hero fully in view … 1 = scrolled out; the house turns and settles */
    setScrollOut(t) {
      view.tscroll = clamp01(+t || 0);
      start();
    },
    getStage() {
      const s = STAGES[stageIdx >= 0 ? stageIdx : stageIndexAt(bpShown)];
      return { id: s.id, label: s.label };
    },
    getStages() {
      return STAGES.map((s) => ({ id: s.id, label: s.label, start: s.start, end: s.end }));
    },
    getPaintColor() {
      return paintHex;
    },
    isComplete() {
      return bpShown >= 1;
    },
    resize,
    setActive(on) {
      active = !!on;
      if (active) {
        renderDirty = true;
        start();
      } else stop();
    },
    /** v1 leftovers, kept as harmless no-ops */
    setMode() {},
    setLoadProgress() {},
    dispose() {
      if (disposed) return;
      stop();
      disposed = true;
      stageCbs.clear();
      completeCbs.clear();
      paintEndCbs.clear();
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      if (ro) ro.disconnect();
      if (io) io.disconnect();
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
      aoTex.dispose();
      if (envTex) envTex.dispose();
      for (const p of parts) p.mesh.dispose();
      renderer.dispose();
    },
  };
  return api;
}

export { STAGES, PAINT_COLORS, DEFAULT_PAINT };
