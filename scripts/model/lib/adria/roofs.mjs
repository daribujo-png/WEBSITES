/**
 * The three roof forms of Adria (saltak, flatt tak, pulttak). Every node here
 * carries the variant suffix. Per variant:
 *   layer_bindingsverk  bindingsverk_tak__<roof>        rafters / roof joists, ridge
 *   layer_tak           tak__<roof>                     roofing, flashings, gutters,
 *                                                       downpipes, chimney, eave soffits
 *   layer_interior      interior_himling__<roof>__ceiling   upper-floor ceiling (Se inn)
 */
import * as THREE from "three";
import { V } from "../builder.mjs";
import { Q } from "../quality.mjs";
import { CHIMNEY, HX, HZ, IN, INX, LV, R1IN, ROOF, WALL } from "./spec.mjs";

const studTone = (i) => {
  const t = 0.9 + (((Math.sin(i * 12.9898) * 43758.5453) % 1) + 1) % 1 * 0.18;
  return new THREE.Color(t, t * 0.99, t * 0.96);
};

/* --------------------------------------------------------------------------------------------- */
/* Shared helpers                                                                                 */
/* --------------------------------------------------------------------------------------------- */

/** Box between two plan points along a sloped line: bottom y = f(z), height h (vertical), width w in x. */
function slopedBar(mb, x, w, z0, z1, f, h, color) {
  const a = [V(x - w / 2, f(z0), z0), V(x + w / 2, f(z0), z0), V(x + w / 2, f(z1), z1), V(x - w / 2, f(z1), z1)];
  const t = a.map((p) => p.clone().setY(p.y + h));
  mb.hexa([a[0], a[1], a[2], a[3], t[0], t[1], t[2], t[3]], color);
}

/** Vertical tube (flue, downpipe) with optional cap. */
function pipe(mb, x, z, y0, y1, r, radial = Q().tubeRadial) {
  const geo = new THREE.CylinderGeometry(r, r, y1 - y0, radial, 1, true);
  mb.geometry(geo, new THREE.Matrix4().makeTranslation(x, (y0 + y1) / 2, z), null, { flat: false });
  geo.dispose();
}

/** Chimney: stainless flue with a collar, a base flashing cone and a rain cap. */
function chimney(mb, flash, yRoof, yTop) {
  const { x, z, r } = CHIMNEY;
  const rad = Q().tubeRadial + 4;
  // base flashing cone on the roof
  const cone = new THREE.CylinderGeometry(r * 1.15, r * 2.1, 0.32, rad, 1, true);
  flash.geometry(cone, new THREE.Matrix4().makeTranslation(x, yRoof + 0.06, z), null, { flat: false });
  cone.dispose();
  // insulated lower section, then the flue
  const lower = Math.min(yTop - 0.4, yRoof + 0.75);
  pipe(mb, x, z, yRoof - 0.2, lower, r * 1.25, rad);
  const coll = new THREE.CylinderGeometry(r, r * 1.25, 0.12, rad, 1, true);
  mb.geometry(coll, new THREE.Matrix4().makeTranslation(x, lower + 0.06, z), null, { flat: false });
  coll.dispose();
  pipe(mb, x, z, lower + 0.12, yTop - 0.08, r, rad);
  // rain cap
  const cap = new THREE.CylinderGeometry(0.03, 0.17, 0.08, rad, 1, false);
  mb.geometry(cap, new THREE.Matrix4().makeTranslation(x, yTop, z), null, { flat: false });
  cap.dispose();
}

/** Half-round gutter along x at (z, yTop), radius r; opening up. */
function gutterX(mb, x0, x1, z, yTop, r, seg = 6) {
  for (let i = 0; i < seg; i++) {
    const a0 = Math.PI + (i / seg) * Math.PI;
    const a1 = Math.PI + ((i + 1) / seg) * Math.PI;
    const p = (a) => [z + Math.cos(a) * r, yTop + Math.sin(a) * r];
    const [z0, y0] = p(a0);
    const [z1, y1] = p(a1);
    mb.face([V(x0, y0, z0), V(x1, y0, z0), V(x1, y1, z1), V(x0, y1, z1)], V((x0 + x1) / 2, yTop + r * 2, z), null);
  }
  // rim lips
  mb.aabb(V(x0, yTop - 0.01, z - r - 0.01), V(x1, yTop + 0.005, z - r + 0.01));
  mb.aabb(V(x0, yTop - 0.01, z + r - 0.01), V(x1, yTop + 0.005, z + r + 0.01));
  // end caps
  for (const x of [x0, x1]) {
    const pts = [];
    for (let i = 0; i <= seg; i++) {
      const a = Math.PI + (i / seg) * Math.PI;
      pts.push(V(x, yTop + Math.sin(a) * r, z + Math.cos(a) * r));
    }
    mb.face(pts, V(x + (x === x0 ? 1 : -1), yTop - r / 2, z), null);
  }
}

/** Ceiling polygon facing down over the heated upper floor, following y = f(z). */
function ceiling(mb, f, kinks = []) {
  const x0 = -INX;
  const x1 = R1IN;
  const zs = [-IN, ...kinks.filter((k) => k > -IN && k < IN), IN];
  for (let i = 0; i < zs.length - 1; i++) {
    const a = zs[i];
    const b = zs[i + 1];
    mb.face([V(x0, f(a), a), V(x1, f(a), a), V(x1, f(b), b), V(x0, f(b), b)], V(0, f((a + b) / 2) + 1, (a + b) / 2), null);
  }
}

/* --------------------------------------------------------------------------------------------- */
/* Saltak                                                                                         */
/* --------------------------------------------------------------------------------------------- */

function buildSaltak(layers) {
  const R = ROOF.saltak;
  const zE = HZ + R.eave; // eave edge
  const xV = HX + R.verge; // verge
  const ridge = R.ridge;
  const tak = layers.tak.group("tak__saltak", { roof: "saltak", grow: "wipe-roof" });
  const tile = tak.mb("roof_tile", "tak_takstein__saltak");
  const fl = tak.mb("flashing", "tak_beslag__saltak");
  const steel = tak.mb("chimney_steel", "tak_pipe__saltak");
  const sof = tak.mb("cladding_charcoal", "tak_takutstikk__saltak");

  // ---- roofing: courses of tiles from the eave to the ridge, both slopes ----
  const course = 0.34;
  const slopeLen = zE / Math.cos(R.pitch);
  const nC = Math.ceil(slopeLen / course);
  const tileW = 0.3;
  const nT = Math.round((2 * xV) / tileW);
  const amp = 0.022; // wave amplitude of the double-S tile
  const lip = 0.03; // course step
  for (const side of [1, -1]) {
    const zAt = (s) => side * (zE - s * Math.cos(R.pitch)); // s = distance up the slope from the eave
    const yAt = (s) => R.outer(zE) + s * Math.sin(R.pitch);
    const nrm = V(0, Math.cos(R.pitch), side * Math.sin(R.pitch));
    for (let c = 0; c < nC; c++) {
      const s0 = c * course;
      const s1 = Math.min(slopeLen, (c + 1) * course);
      // each course is tilted a little steeper so its lower edge stands proud by `lip`
      const lift = (s) => (s <= s0 + 1e-6 ? lip : lip * (1 - (s - s0) / (s1 - s0)));
      const tone = 0.92 + (((Math.sin(c * 7.31 + side) * 4375.85) % 1) + 1) % 1 * 0.1;
      const cc = new THREE.Color(tone, tone, tone);
      if (Q().tiles) {
        const segs = 4;
        for (let t = 0; t < nT; t++) {
          for (let k = 0; k < segs; k++) {
            const u0 = -xV + (t + k / segs) * tileW;
            const u1 = -xV + (t + (k + 1) / segs) * tileW;
            const w0 = amp * Math.sin((k / segs) * Math.PI * 2);
            const w1 = amp * Math.sin(((k + 1) / segs) * Math.PI * 2);
            const P = (u, w, s) => V(u, yAt(s) + (w + lift(s)) * nrm.y, zAt(s) + (w + lift(s)) * nrm.z);
            const q = [P(u0, w0, s0), P(u1, w1, s0), P(u1, w1, s1), P(u0, w0, s1)];
            tile.face(q, q[0].clone().sub(nrm), cc);
            // the course lip (front face)
            const L = [V(u0, yAt(s0) + w0 * nrm.y, zAt(s0) + w0 * nrm.z), V(u1, yAt(s0) + w1 * nrm.y, zAt(s0) + w1 * nrm.z), q[1], q[0]];
            tile.face(L, L[0].clone().add(V(0, 0, -side * 0.5)).sub(nrm.clone().multiplyScalar(0.2)), cc.clone().multiplyScalar(0.7));
          }
        }
      } else {
        const P = (u, s) => V(u, yAt(s) + lift(s) * nrm.y, zAt(s) + lift(s) * nrm.z);
        const q = [P(-xV, s0), P(xV, s0), P(xV, s1), P(-xV, s1)];
        tile.face(q, q[0].clone().sub(nrm), cc);
        const L = [V(-xV, yAt(s0), zAt(s0)), V(xV, yAt(s0), zAt(s0)), q[1], q[0]];
        tile.face(L, L[0].clone().add(V(0, 0, -side * 0.5)).sub(nrm.clone().multiplyScalar(0.2)), cc.clone().multiplyScalar(0.7));
      }
    }
    // underside of the roof plane over the eave overhang (soffit), from the wall to the fascia
    const yw = R.under(HZ);
    const ye = R.under(zE);
    sof.face([V(-xV, yw, side * HZ), V(xV, yw, side * HZ), V(xV, ye, side * zE), V(-xV, ye, side * zE)], V(0, yw + 1, side * 4), null);
    // fascia board + gutter
    const yF = R.outer(zE);
    fl.face([V(-xV, ye - 0.04, side * zE), V(xV, ye - 0.04, side * zE), V(xV, yF + 0.01, side * zE), V(-xV, yF + 0.01, side * zE)], V(0, yF, side * (zE - 1)), null);
    gutterX(fl, -xV - 0.02, xV + 0.02, side * (zE + 0.085), yF - 0.03, 0.075);
    // snow-guard hooks (one row, 1 m up the slope)
    for (let x = -xV + 0.6; x < xV - 0.3; x += 1.2) {
      const s = 1.0;
      const p = V(x, yAt(s) + 0.05, zAt(s));
      fl.aabb(V(p.x - 0.015, p.y - 0.02, p.z - 0.03), V(p.x + 0.015, p.y + 0.05, p.z + 0.03));
    }
  }
  // ridge cap
  const rc = new THREE.CylinderGeometry(0.11, 0.11, 2 * xV, Q().tubeRadial, 1, true, 0, Math.PI);
  const m = new THREE.Matrix4().makeRotationZ(Math.PI / 2).premultiply(new THREE.Matrix4().makeTranslation(0, ridge - 0.02, 0));
  tile.geometry(rc, new THREE.Matrix4().makeTranslation(0, ridge - 0.02, 0).multiply(new THREE.Matrix4().makeRotationZ(Math.PI / 2)).multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2)), null, { flat: false });
  rc.dispose();
  void m;
  // verge flashings (both gables): a slim board following the rake, 0.10 thick
  for (const sx of [1, -1]) {
    const x0 = sx * xV;
    const x1 = sx * (xV - 0.1);
    for (const side of [1, -1]) {
      const zA = 0;
      const zB = side * (zE + 0.02);
      const top = (z) => R.outer(z) + 0.045;
      const bot = (z) => R.outer(z) - 0.2;
      const c = [V(x1, bot(zA), zA), V(x0, bot(zA), zA), V(x0, bot(zB), zB), V(x1, bot(zB), zB), V(x1, top(zA), zA), V(x0, top(zA), zA), V(x0, top(zB), zB), V(x1, top(zB), zB)];
      fl.hexa(c, null);
    }
  }
  // downpipes (SW, NW, NE)
  for (const [x, z] of [
    [-HX + 0.12, zE + 0.085],
    [-HX + 0.12, -(zE + 0.085)],
    [HX - 0.12, -(zE + 0.085)],
  ]) {
    pipe(fl, x, z, LV.deck, R.outer(zE) - 0.08, 0.04, Q().tubeRadial);
  }
  // chimney (north slope, just behind the ridge)
  chimney(steel, fl, R.outer(CHIMNEY.z), R.chimneyTop);

  // ---- rafters, ridge board (bindingsverk) ----
  const bv = layers.bindingsverk.group("bindingsverk_tak__saltak", { roof: "saltak", hideFrom: "interior" });
  const raf = bv.mb("frame_wood", "bindingsverk_sperrer__saltak");
  const h = 0.198 / Math.cos(R.pitch);
  let i = 0;
  for (let x = -HX + 0.05; x <= HX - 0.04; x += 0.6) {
    for (const side of [1, -1]) {
      const z0 = side > 0 ? 0.03 : -zE;
      const z1 = side > 0 ? zE : -0.03;
      slopedBar(raf, x, 0.048, z0, z1, (z) => R.under(z) + 0.005, h, studTone(i++));
    }
  }
  raf.aabb(V(-HX, R.under(0) - 0.05, -0.03), V(HX, R.under(0) + h, 0.03), studTone(i++));

  // ---- upper-floor ceiling (Se inn) ----
  const ce = layers.interior.group("interior_himling__saltak__ceiling", { roof: "saltak", ceiling: true });
  ceiling(ce.mb("interior_wall", "interior_himling__saltak__ceiling"), (z) => Math.min(R.under(z) - 0.06, 7.6), [0]);
}

/* --------------------------------------------------------------------------------------------- */
/* Flatt tak                                                                                      */
/* --------------------------------------------------------------------------------------------- */

function buildFlatt(layers) {
  const R = ROOF.flatt;
  const tak = layers.tak.group("tak__flatt", { roof: "flatt", grow: "up" });
  const fl = tak.mb("flashing", "tak_beslag__flatt");
  const mem = tak.mb("roof_membrane", "tak_membran__flatt");
  const steel = tak.mb("chimney_steel", "tak_pipe__flatt");
  const yC = R.parapet - R.coping;
  const t = WALL.thickness;
  const lipO = 0.04;
  // coping ring (0.40 wide incl. a 0.04 drip outside), as four boxes
  const ring = [
    [V(-HX - lipO, yC, HZ - t), V(HX + lipO, R.parapet, HZ + lipO)],
    [V(-HX - lipO, yC, -HZ - lipO), V(HX + lipO, R.parapet, -HZ + t)],
    [V(-HX - lipO, yC, -HZ + t), V(-HX + t, R.parapet, HZ - t)],
    [V(HX - t, yC, -HZ + t), V(HX + lipO, R.parapet, HZ - t)],
  ];
  for (const [a, b] of ring) fl.aabb(a, b);
  // drip edges hanging over the cladding
  fl.aabb(V(-HX - lipO, yC - 0.05, HZ), V(HX + lipO, yC, HZ + lipO));
  fl.aabb(V(-HX - lipO, yC - 0.05, -HZ - lipO), V(HX + lipO, yC, -HZ));
  fl.aabb(V(-HX - lipO, yC - 0.05, -HZ), V(-HX, yC, HZ));
  fl.aabb(V(HX, yC - 0.05, -HZ), V(HX + lipO, yC, HZ));
  // membrane + inner upstands
  const xi = HX - t;
  const zi = HZ - t;
  mem.face([V(-xi, R.membrane, -zi), V(xi, R.membrane, -zi), V(xi, R.membrane, zi), V(-xi, R.membrane, zi)], V(0, 0, 0), null);
  const up = (a, b, inside) => mem.face([a, b, b.clone().setY(yC), a.clone().setY(yC)], inside, null);
  up(V(-xi, R.membrane, zi), V(xi, R.membrane, zi), V(0, 7.2, HZ));
  up(V(xi, R.membrane, -zi), V(-xi, R.membrane, -zi), V(0, 7.2, -HZ));
  up(V(-xi, R.membrane, -zi), V(-xi, R.membrane, zi), V(-HX, 7.2, 0));
  up(V(xi, R.membrane, zi), V(xi, R.membrane, -zi), V(HX, 7.2, 0));
  // roof drains
  for (const x of [-3.5, 2.5]) fl.aabb(V(x - 0.12, R.membrane, -0.12), V(x + 0.12, R.membrane + 0.01, 0.12));
  // one downpipe at the NW corner, with a small scupper box
  fl.aabb(V(-HX - 0.16, yC - 0.45, -HZ + 0.25), V(-HX, yC - 0.15, -HZ + 0.55));
  pipe(fl, -HX - 0.08, -HZ + 0.4, LV.deck, yC - 0.4, 0.04);
  // flue
  chimney(steel, fl, R.membrane, R.chimneyTop);

  // ---- roof joists (bindingsverk) ----
  const bv = layers.bindingsverk.group("bindingsverk_tak__flatt", { roof: "flatt", hideFrom: "interior" });
  const raf = bv.mb("frame_wood", "bindingsverk_takbjelker__flatt");
  let i = 0;
  for (let x = -HX + 0.1; x <= HX - 0.05; x += 0.6) raf.aabb(V(x - 0.024, 6.55, -HZ + 0.07), V(x + 0.024, 6.95, HZ - 0.07), studTone(i++));

  // ---- ceiling ----
  const ce = layers.interior.group("interior_himling__flatt__ceiling", { roof: "flatt", ceiling: true });
  ceiling(ce.mb("interior_wall", "interior_himling__flatt__ceiling"), () => R.ceiling);
}

/* --------------------------------------------------------------------------------------------- */
/* Pulttak                                                                                        */
/* --------------------------------------------------------------------------------------------- */

function buildPulttak(layers) {
  const R = ROOF.pulttak;
  const o = R.overhang;
  const xV = HX + o;
  const zN = -HZ - o;
  const zS = HZ + o;
  const tak = layers.tak.group("tak__pulttak", { roof: "pulttak", grow: "wipe-roof" });
  const st = tak.mb("roof_steel", "tak_stal__pulttak");
  const fl = tak.mb("flashing", "tak_beslag__pulttak");
  const steel = tak.mb("chimney_steel", "tak_pipe__pulttak");
  const sof = tak.mb("cladding_charcoal", "tak_takutstikk__pulttak");
  // roof surface
  st.face([V(-xV, R.outer(zN), zN), V(xV, R.outer(zN), zN), V(xV, R.outer(zS), zS), V(-xV, R.outer(zS), zS)], V(0, 0, 0), null);
  // standing seams every 0.50 m
  if (Q().seams) {
    for (let x = -xV + 0.25; x < xV - 0.1; x += 0.5) slopedBar(st, x, 0.022, zN + 0.02, zS - 0.02, (z) => R.outer(z) - 0.002, 0.03, null);
  }
  // fascia band all round (0.25 tall, top flush with the roofing)
  const fb = (a, b, inside) => fl.face([a, b, b.clone().setY(b.y - R.fascia), a.clone().setY(a.y - R.fascia)], inside, null);
  fb(V(-xV, R.outer(zS) + 0.02, zS), V(xV, R.outer(zS) + 0.02, zS), V(0, 6, 0));
  fb(V(xV, R.outer(zN) + 0.02, zN), V(-xV, R.outer(zN) + 0.02, zN), V(0, 6, 0));
  fb(V(-xV, R.outer(zN) + 0.02, zN), V(-xV, R.outer(zS) + 0.02, zS), V(0, 6, 0));
  fb(V(xV, R.outer(zS) + 0.02, zS), V(xV, R.outer(zN) + 0.02, zN), V(0, 6, 0));
  // top cap of the fascia (thin)
  // soffits under the overhang (long sides and gables)
  const yu = (z) => R.outer(z) - R.fascia + 0.02;
  sof.face([V(-xV, yu(zS), HZ), V(xV, yu(zS), HZ), V(xV, yu(zS), zS), V(-xV, yu(zS), zS)], V(0, 9, 4), null);
  sof.face([V(-xV, yu(zN), zN), V(xV, yu(zN), zN), V(xV, yu(zN), -HZ), V(-xV, yu(zN), -HZ)], V(0, 9, -4), null);
  for (const sx of [1, -1]) {
    const xa = sx * HX;
    const xb = sx * xV;
    sof.face([V(xa, yu(zN), zN), V(xb, yu(zN), zN), V(xb, yu(zS), zS), V(xa, yu(zS), zS)], V(sx * 7.9, 9, 0), null);
  }
  // gutter + downpipes on the north side
  gutterX(fl, -xV, xV, zN - 0.085, R.outer(zN) - 0.06, 0.075);
  pipe(fl, -HX + 0.15, zN - 0.085, LV.deck, R.outer(zN) - 0.1, 0.04);
  pipe(fl, HX - 0.15, zN - 0.085, LV.deck, R.outer(zN) - 0.1, 0.04);
  // chimney
  chimney(steel, fl, R.outer(CHIMNEY.z), R.chimneyTop);

  // ---- rafters ----
  const bv = layers.bindingsverk.group("bindingsverk_tak__pulttak", { roof: "pulttak", hideFrom: "interior" });
  const raf = bv.mb("frame_wood", "bindingsverk_sperrer__pulttak");
  const h = 0.198 / Math.cos(R.pitch);
  let i = 0;
  for (let x = -HX + 0.05; x <= HX - 0.04; x += 0.6) slopedBar(raf, x, 0.048, zN, zS, (z) => R.under(z) + 0.005, h, studTone(i++));

  // ---- ceiling ----
  const ce = layers.interior.group("interior_himling__pulttak__ceiling", { roof: "pulttak", ceiling: true });
  ceiling(ce.mb("interior_wall", "interior_himling__pulttak__ceiling"), (z) => R.under(z) - 0.06);
}

export function buildRoofs(layers) {
  buildSaltak(layers);
  buildFlatt(layers);
  buildPulttak(layers);
}
