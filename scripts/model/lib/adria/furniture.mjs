/**
 * Small furniture kit (indoor and outdoor). Every piece is built in local
 * coordinates (x across, z depth, y up, origin on the floor at the piece's
 * centre) and placed with a yaw. Pieces take a material map
 * `m = { frame, cushion, wood, textile, ... }` of MeshBuilders.
 */
import * as THREE from "three";
import { V } from "../builder.mjs";
import { Q } from "../quality.mjs";

export function placer(x, y, z, rotY = 0) {
  const c = Math.cos(rotY);
  const s = Math.sin(rotY);
  const P = (lx, ly, lz) => V(x + lx * c + lz * s, y + ly, z - lx * s + lz * c);
  const box = (mb, x0, y0, z0, x1, y1, z1, color, skip) =>
    mb.hexa([P(x0, y0, z0), P(x1, y0, z0), P(x1, y0, z1), P(x0, y0, z1), P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1)], color, skip);
  const mat = new THREE.Matrix4().makeRotationY(rotY).premultiply(new THREE.Matrix4().makeTranslation(x, y, z));
  const cyl = (mb, lx, lz, y0, y1, r0, r1 = r0, seg = Q().tubeRadial, color = null, open = false) => {
    const g = new THREE.CylinderGeometry(r1, r0, y1 - y0, seg, 1, open);
    mb.geometry(g, mat.clone().multiply(new THREE.Matrix4().makeTranslation(lx, (y0 + y1) / 2, lz)), color, { flat: false });
    g.dispose();
  };
  const sphere = (mb, lx, ly, lz, rx, ry, rz, color = null, seg = 8) => {
    const g = new THREE.SphereGeometry(1, seg, Math.max(4, seg - 2));
    const m = mat.clone().multiply(new THREE.Matrix4().compose(V(lx, ly, lz), new THREE.Quaternion(), V(rx, ry, rz)));
    mb.geometry(g, m, color, { flat: false });
    g.dispose();
  };
  return { P, box, cyl, sphere, mat };
}

const legs = (pl, mb, w, d, h, t = 0.03, inset = 0.03) => {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = sx * (w / 2 - inset);
    const z = sz * (d / 2 - inset);
    pl.box(mb, x - t / 2, 0, z - t / 2, x + t / 2, h, z + t / 2, null, { bottom: true });
  }
};

/** Dining/side/coffee table: top in `top`, legs in `leg`. */
export function table(m, x, y, z, rot, { w = 2.4, d = 0.95, h = 0.74, t = 0.04, top = "wood", leg = "frame", round = false } = {}) {
  const pl = placer(x, y, z, rot);
  if (round) {
    pl.cyl(m[top], 0, 0, h - t, h, w / 2, w / 2, 16);
    pl.cyl(m[leg], 0, 0, 0, h - t, 0.04, 0.04, 8);
    pl.cyl(m[leg], 0, 0, 0, 0.02, w / 4, w / 4, 12);
    return;
  }
  pl.box(m[top], -w / 2, h - t, -d / 2, w / 2, h, d / 2);
  legs(pl, m[leg], w, d, h - t, 0.05, 0.08);
}

/** Simple chair facing −z (seat, back, legs). */
export function chair(m, x, y, z, rot, { seat = "frame", frame = "frame", h = 0.45, back = 0.82, w = 0.48 } = {}) {
  const pl = placer(x, y, z, rot);
  pl.box(m[seat], -w / 2, h - 0.04, -w / 2, w / 2, h, w / 2);
  pl.box(m[seat], -w / 2, h, w / 2 - 0.04, w / 2, back, w / 2);
  if (Q().interiorDetail) legs(pl, m[frame], w, w, h - 0.04, 0.025, 0.03);
  else pl.box(m[frame], -w / 2 + 0.03, 0, -w / 2 + 0.03, w / 2 - 0.03, h - 0.04, w / 2 - 0.03);
}

/** Bar stool. */
export function stool(m, x, y, z, rot) {
  const pl = placer(x, y, z, rot);
  pl.box(m.frame, -0.2, 0.72, -0.2, 0.2, 0.76, 0.2);
  legs(pl, m.frame, 0.38, 0.38, 0.72, 0.025, 0.02);
}

/**
 * Lounge sofa (outdoor or indoor) facing −z: frame, seat and back cushions.
 * `seats` modules of 0.8 m, optional arms.
 */
export function sofa(m, x, y, z, rot, { seats = 3, depth = 0.9, frame = "frame", cushion = "cushion", arms = true, seatH = 0.42, backH = 0.78 } = {}) {
  const pl = placer(x, y, z, rot);
  const w = seats * 0.8 + (arms ? 0.24 : 0);
  pl.box(m[frame], -w / 2, 0.06, -depth / 2, w / 2, seatH - 0.12, depth / 2);
  pl.box(m[cushion], -w / 2 + (arms ? 0.12 : 0), seatH - 0.12, -depth / 2 + 0.02, w / 2 - (arms ? 0.12 : 0), seatH, depth / 2 - 0.16);
  pl.box(m[cushion], -w / 2 + (arms ? 0.12 : 0), seatH - 0.12, depth / 2 - 0.2, w / 2 - (arms ? 0.12 : 0), backH, depth / 2 - 0.02);
  if (arms) {
    pl.box(m[frame], -w / 2, 0.06, -depth / 2, -w / 2 + 0.12, seatH + 0.14, depth / 2);
    pl.box(m[frame], w / 2 - 0.12, 0.06, -depth / 2, w / 2, seatH + 0.14, depth / 2);
  }
  if (Q().interiorDetail) legs(pl, m[frame], w, depth, 0.06, 0.04, 0.05);
}

/** Sun lounger facing +x (long axis along local x), backrest raised at +x when `raised`. */
export function lounger(m, x, y, z, rot, { raised = false } = {}) {
  const pl = placer(x, y, z, rot);
  const L = 2.0;
  const W = 0.72;
  const h = 0.36;
  // frame: two side rails + legs
  for (const sz of [-1, 1]) pl.box(m.frame, -L / 2, h - 0.08, sz * W / 2 - 0.03, L / 2, h - 0.04, sz * W / 2);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) pl.box(m.frame, sx * (L / 2 - 0.06) - 0.025, 0, sz * (W / 2 - 0.015) - 0.015, sx * (L / 2 - 0.06) + 0.025, h - 0.06, sz * (W / 2 - 0.015) + 0.015);
  // cushions
  const flatEnd = raised ? L / 2 - 0.7 : L / 2;
  pl.box(m.cushion, -L / 2 + 0.02, h - 0.06, -W / 2 + 0.03, flatEnd, h + 0.1, W / 2 - 0.03);
  if (raised) {
    const a = THREE.MathUtils.degToRad(48);
    const x0 = flatEnd;
    const len = 0.72;
    const P = (lx, ly, lz) => pl.P(lx, ly, lz);
    const c = [
      P(x0, h - 0.06, -W / 2 + 0.03),
      P(x0 + Math.cos(a) * len, h - 0.06 + Math.sin(a) * len, -W / 2 + 0.03),
      P(x0 + Math.cos(a) * len, h - 0.06 + Math.sin(a) * len, W / 2 - 0.03),
      P(x0, h - 0.06, W / 2 - 0.03),
      P(x0 - 0.12, h + 0.08, -W / 2 + 0.03),
      P(x0 + Math.cos(a) * len - 0.12, h + 0.08 + Math.sin(a) * len, -W / 2 + 0.03),
      P(x0 + Math.cos(a) * len - 0.12, h + 0.08 + Math.sin(a) * len, W / 2 - 0.03),
      P(x0 - 0.12, h + 0.08, W / 2 - 0.03),
    ];
    m.cushion.hexa([c[0], c[1], c[2], c[3], c[4], c[5], c[6], c[7]]);
    // a pillow and a folded throw
    pl.box(m.cushion, x0 + 0.2, h + 0.3, -0.22, x0 + 0.38, h + 0.46, 0.22);
  }
}

/** Gas grill cabinet (1.2 × 0.6 × 1.15) facing −z, lid + side shelves. */
export function grill(m, x, y, z, rot) {
  const pl = placer(x, y, z, rot);
  pl.box(m.frame, -0.4, 0.08, -0.28, 0.4, 0.9, 0.28);
  pl.box(m.frame, -0.4, 0.9, -0.26, 0.4, 1.12, 0.26);
  pl.box(m.frame, -0.62, 0.86, -0.25, -0.4, 0.9, 0.25);
  pl.box(m.frame, 0.4, 0.86, -0.25, 0.62, 0.9, 0.25);
  pl.box(m.steel, -0.3, 1.0, -0.3, 0.3, 1.03, -0.26);
  legs(pl, m.frame, 0.8, 0.56, 0.08, 0.04, 0.04);
}

/** Round planter (anthracite) with a shrub ball (instanced foliage is added separately). */
export function potPlanter(m, x, y, z, { r = 0.3, h = 0.55, plant = true } = {}) {
  const pl = placer(x, y, z, 0);
  pl.cyl(m.pot, 0, 0, 0, h, r * 0.82, r, 12);
  if (plant) pl.sphere(m.plant, 0, h + r * 0.55, 0, r * 0.95, r * 0.8, r * 0.95, null, 7);
}

/** Lantern side table: black steel frame with glass sides and a candle glow. */
export function lantern(m, x, y, z) {
  const pl = placer(x, y, z, 0);
  const s = 0.2;
  const h = 0.55;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) pl.box(m.frame, sx * s - 0.012, 0, sz * s - 0.012, sx * s + 0.012, h, sz * s + 0.012);
  pl.box(m.frame, -s - 0.02, h, -s - 0.02, s + 0.02, h + 0.03, s + 0.02);
  pl.box(m.frame, -s, 0, -s, s, 0.03, s);
  pl.box(m.glass, -s, 0.03, -s, s, h, s);
  pl.cyl(m.glow, 0, 0, 0.03, 0.2, 0.05, 0.05, 8);
}

/** Bed (w × 2.1) facing +z (headboard at −z), linen and pillows. */
export function bed(m, x, y, z, rot, { w = 1.8 } = {}) {
  const pl = placer(x, y, z, rot);
  pl.box(m.textile, -w / 2, 0.05, -1.05, w / 2, 0.35, 1.05);
  pl.box(m.linen, -w / 2 + 0.02, 0.35, -0.95, w / 2 - 0.02, 0.52, 1.03);
  pl.box(m.textile, -w / 2 - 0.05, 0.05, -1.12, w / 2 + 0.05, 1.05, -1.05);
  for (const sx of w > 1.4 ? [-1, 1] : [0]) pl.box(m.linen, sx * w * 0.25 - 0.3, 0.52, -0.98, sx * w * 0.25 + 0.3, 0.66, -0.6);
  pl.box(m.textile, -w / 2 + 0.02, 0.52, 0.45, w / 2 - 0.02, 0.56, 1.03);
}

/** Bookshelf / wardrobe block with a few book rows. */
export function shelf(m, x, y, z, rot, { w = 1.9, h = 2.1, d = 0.35, books = true } = {}) {
  const pl = placer(x, y, z, rot);
  pl.box(m.wood, -w / 2, 0, -d / 2, w / 2, 0.04, d / 2);
  pl.box(m.wood, -w / 2, h - 0.04, -d / 2, w / 2, h, d / 2);
  pl.box(m.wood, -w / 2, 0, -d / 2, -w / 2 + 0.03, h, d / 2);
  pl.box(m.wood, w / 2 - 0.03, 0, -d / 2, w / 2, h, d / 2);
  pl.box(m.wood, -w / 2, 0, d / 2 - 0.02, w / 2, h, d / 2);
  const rows = Math.round(h / 0.38);
  for (let i = 1; i < rows; i++) {
    const y0 = (i * h) / rows;
    pl.box(m.wood, -w / 2, y0 - 0.02, -d / 2, w / 2, y0, d / 2);
    if (books && Q().interiorDetail) {
      let bx = -w / 2 + 0.06;
      let k = i * 13;
      while (bx < w / 2 - 0.15) {
        const bw = 0.03 + ((k * 37) % 7) * 0.008;
        const bh = 0.2 + ((k * 53) % 5) * 0.025;
        pl.box(k % 3 ? m.textile : m.linen, bx, y0, -d / 2 + 0.05, bx + bw, y0 + bh, d / 2 - 0.05);
        bx += bw + 0.004;
        k++;
        if (k % 9 === 0) bx += 0.25;
      }
    }
  }
}

/** Floor lamp (thin pole + linen shade + glow). */
export function floorLamp(m, x, y, z) {
  const pl = placer(x, y, z, 0);
  pl.cyl(m.frame, 0, 0, 0, 0.02, 0.15, 0.15, 10);
  pl.cyl(m.frame, 0, 0, 0.02, 1.45, 0.012, 0.012, 6);
  pl.cyl(m.linen, 0, 0, 1.35, 1.65, 0.22, 0.17, 12, null, true);
  pl.cyl(m.glow, 0, 0, 1.37, 1.39, 0.16, 0.16, 10);
}

/** Pendant lamp: cord + black bell + glow disc. */
export function pendant(m, x, yCeil, z, { drop = 0.9, r = 0.18 } = {}) {
  const pl = placer(x, 0, z, 0);
  pl.cyl(m.frame, 0, 0, yCeil - drop + 0.2, yCeil, 0.005, 0.005, 4);
  pl.cyl(m.frame, 0, 0, yCeil - drop, yCeil - drop + 0.22, r, 0.05, 12, null, true);
  pl.cyl(m.glow, 0, 0, yCeil - drop + 0.005, yCeil - drop + 0.015, r * 0.85, r * 0.85, 10);
}

/** Rug: a thin slab. */
export function rug(m, x, y, z, w, d, rot = 0, mat = "textile") {
  placer(x, y, z, rot).box(m[mat], -w / 2, 0.002, -d / 2, w / 2, 0.012, d / 2);
}

/** Kitchen: tall units along the back + an island, with worktop. */
export function kitchen(m, x, y, z, rot, { len = 3.6 } = {}) {
  const pl = placer(x, y, z, rot);
  pl.box(m.front, -len / 2, 0, -0.3, len / 2, 0.88, 0.3);
  pl.box(m.top, -len / 2, 0.88, -0.32, len / 2, 0.92, 0.32);
  pl.box(m.front, -len / 2, 1.45, -0.18, len / 2 - 1.2, 2.3, 0.18);
  pl.box(m.front, len / 2 - 1.2, 0, -0.3, len / 2, 2.3, 0.3);
}
export function island(m, x, y, z, rot, { len = 2.4 } = {}) {
  const pl = placer(x, y, z, rot);
  pl.box(m.front, -len / 2, 0, -0.45, len / 2, 0.88, 0.45);
  pl.box(m.top, -len / 2 - 0.05, 0.88, -0.5, len / 2 + 0.05, 0.92, 0.5);
}

/** Freestanding bathtub (rounded ends approximated by a capsule of cylinders). */
export function bathtub(m, x, y, z, rot) {
  const pl = placer(x, y, z, rot);
  pl.box(m.sanitary, -0.55, 0, -0.38, 0.55, 0.58, 0.38);
  pl.cyl(m.sanitary, -0.55, 0, 0, 0.58, 0.38, 0.38, 12);
  pl.cyl(m.sanitary, 0.55, 0, 0, 0.58, 0.38, 0.38, 12);
}
