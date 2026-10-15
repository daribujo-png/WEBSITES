/**
 * Procedural textures, drawn as SVG and rasterised with sharp (WebP with alpha).
 *
 * leaf_atlas: a 3 × 3 atlas of leaf cards for alpha-tested vegetation.
 *   0 birch      1 broadleaf   2 conifer
 *   3 grass      4 lavender    5 blossom (spiraea)
 *   6 big leaf   7 hedge       8 small-leaf shrub (box)
 * Transparent pixels carry the tile's mean colour at alpha 1/255, so mipmaps
 * never bleed dark fringes into the alpha-tested edges.
 */
import sharp from "sharp";
import { rng } from "../builder.mjs";

export const ATLAS = { cols: 3, rows: 3 };
export const TILE = { birch: 0, broad: 1, conifer: 2, grass: 3, lavender: 4, blossom: 5, bigleaf: 6, hedge: 7, box: 8 };

/** UV rectangle of a tile: [u0, v0, u1, v1] (glTF: v down from the top of the image). */
export function tileUV(tile, inset = 0.004) {
  const c = tile % ATLAS.cols;
  const r = Math.floor(tile / ATLAS.cols);
  return [c / ATLAS.cols + inset, r / ATLAS.rows + inset, (c + 1) / ATLAS.cols - inset, (r + 1) / ATLAS.rows - inset];
}

const hex = (r, g, b) => `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")}`;
function jitter(base, r, amt) {
  const [R, G, B] = base;
  const k = 1 + (r() - 0.5) * amt;
  const h = (r() - 0.5) * amt * 0.6;
  return hex(R * k * (1 + h), G * k, B * k * (1 - h));
}

/** A pointed leaf path centred at (0,0), length l, width w, pointing +y. */
const leafPath = (l, w) => `M0 ${l / 2} C ${w / 2} ${l / 4} ${w / 2} ${-l / 4} 0 ${-l / 2} C ${-w / 2} ${-l / 4} ${-w / 2} ${l / 4} 0 ${l / 2} Z`;

function tileBirch(S, r) {
  // twigs with small pale-green ovate leaves, airy
  let s = "";
  const twigs = 7;
  for (let t = 0; t < twigs; t++) {
    const x0 = S * (0.2 + 0.6 * r());
    const y0 = S * (0.95 - 0.1 * r());
    const x1 = x0 + S * (r() - 0.5) * 0.7;
    const y1 = S * (0.08 + 0.3 * r());
    s += `<path d="M${x0} ${y0} Q ${(x0 + x1) / 2 + S * (r() - 0.5) * 0.2} ${(y0 + y1) / 2} ${x1} ${y1}" stroke="#5b4f3a" stroke-width="${S * 0.006}" fill="none"/>`;
    const n = 22;
    for (let i = 0; i < n; i++) {
      const tt = i / n;
      const x = x0 + (x1 - x0) * tt + (r() - 0.5) * S * 0.12;
      const y = y0 + (y1 - y0) * tt + (r() - 0.5) * S * 0.08;
      const l = S * (0.055 + 0.03 * r());
      s += `<path d="${leafPath(l, l * 0.72)}" transform="translate(${x} ${y}) rotate(${r() * 360})" fill="${jitter([118, 140, 64], r, 0.32)}"/>`;
    }
  }
  return s;
}

function tileBroad(S, r) {
  // dense broadleaf cluster, larger darker leaves
  let s = "";
  const n = 120;
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2;
    const rad = Math.sqrt(r()) * S * 0.42;
    const x = S / 2 + Math.cos(a) * rad;
    const y = S / 2 + Math.sin(a) * rad * 0.9;
    const l = S * (0.08 + 0.05 * r());
    const shade = 0.75 + 0.35 * (1 - (y / S));
    s += `<path d="${leafPath(l, l * 0.62)}" transform="translate(${x} ${y}) rotate(${r() * 360})" fill="${jitter([78 * shade, 98 * shade, 42 * shade], r, 0.3)}"/>`;
  }
  return s;
}

function tileConifer(S, r) {
  // drooping spruce branch: a central stem with needle strokes
  let s = "";
  const branches = 5;
  for (let b = 0; b < branches; b++) {
    const y = S * (0.15 + 0.17 * b);
    const x0 = S * 0.08;
    const x1 = S * 0.92;
    s += `<path d="M${x0} ${y} Q ${S / 2} ${y + S * 0.05} ${x1} ${y + S * 0.1}" stroke="#2f2a20" stroke-width="${S * 0.008}" fill="none"/>`;
    for (let i = 0; i < 60; i++) {
      const t = r();
      const x = x0 + (x1 - x0) * t;
      const yy = y + S * 0.05 * t * 2 * (1 - t) + S * 0.1 * t * t;
      const len = S * (0.04 + 0.03 * r()) * (1 - Math.abs(t - 0.5));
      const ang = (r() > 0.5 ? 1 : -1) * (30 + 40 * r());
      s += `<line x1="${x}" y1="${yy}" x2="${x + Math.sin((ang * Math.PI) / 180) * len}" y2="${yy + Math.cos((ang * Math.PI) / 180) * len}" stroke="${jitter([40, 58, 34], r, 0.35)}" stroke-width="${S * 0.012}" stroke-linecap="round"/>`;
    }
  }
  return s;
}

function tileGrass(S, r) {
  // ornamental grass: arching blades with pale plumes at the top
  let s = "";
  for (let i = 0; i < 70; i++) {
    const x0 = S * (0.35 + 0.3 * r());
    const x1 = x0 + (r() - 0.5) * S * 0.8;
    const y1 = S * (0.05 + 0.4 * r());
    const c = jitter([120, 132, 72], r, 0.35);
    s += `<path d="M${x0} ${S} Q ${(x0 + x1) / 2} ${S * 0.5} ${x1} ${y1}" stroke="${c}" stroke-width="${S * (0.008 + 0.006 * r())}" fill="none" stroke-linecap="round"/>`;
  }
  for (let i = 0; i < 16; i++) {
    const x = S * (0.15 + 0.7 * r());
    const y = S * (0.1 + 0.25 * r());
    s += `<ellipse cx="${x}" cy="${y}" rx="${S * 0.018}" ry="${S * 0.07}" transform="rotate(${(r() - 0.5) * 40} ${x} ${y})" fill="${jitter([200, 190, 150], r, 0.15)}"/>`;
  }
  return s;
}

function tileLavender(S, r) {
  let s = "";
  for (let i = 0; i < 26; i++) {
    const x0 = S * (0.3 + 0.4 * r());
    const x1 = x0 + (r() - 0.5) * S * 0.6;
    const y1 = S * (0.06 + 0.3 * r());
    s += `<path d="M${x0} ${S} Q ${(x0 + x1) / 2} ${S * 0.6} ${x1} ${y1}" stroke="${jitter([96, 110, 78], r, 0.2)}" stroke-width="${S * 0.007}" fill="none"/>`;
    for (let k = 0; k < 9; k++) {
      const t = k / 9;
      const x = x1 + (x0 - x1) * t * 0.25;
      const y = y1 + S * 0.03 * k;
      s += `<ellipse cx="${x}" cy="${y}" rx="${S * 0.014}" ry="${S * 0.02}" fill="${jitter([118, 104, 160], r, 0.25)}"/>`;
    }
  }
  // grey-green foliage at the base
  for (let i = 0; i < 40; i++) {
    const x = S * (0.2 + 0.6 * r());
    const y = S * (0.78 + 0.2 * r());
    s += `<path d="${leafPath(S * 0.07, S * 0.02)}" transform="translate(${x} ${y}) rotate(${(r() - 0.5) * 70})" fill="${jitter([110, 124, 98], r, 0.2)}"/>`;
  }
  return s;
}

function tileBlossom(S, r) {
  let s = "";
  for (let i = 0; i < 90; i++) {
    const a = r() * Math.PI * 2;
    const rad = Math.sqrt(r()) * S * 0.44;
    const x = S / 2 + Math.cos(a) * rad;
    const y = S / 2 + Math.sin(a) * rad;
    s += `<path d="${leafPath(S * 0.06, S * 0.035)}" transform="translate(${x} ${y}) rotate(${r() * 360})" fill="${jitter([80, 92, 52], r, 0.25)}"/>`;
  }
  for (let i = 0; i < 130; i++) {
    const a = r() * Math.PI * 2;
    const rad = Math.sqrt(r()) * S * 0.42;
    const x = S / 2 + Math.cos(a) * rad;
    const y = S / 2 + Math.sin(a) * rad * 0.9 - S * 0.03;
    s += `<circle cx="${x}" cy="${y}" r="${S * (0.012 + 0.012 * r())}" fill="${jitter([236, 238, 230], r, 0.06)}"/>`;
  }
  return s;
}

function tileBigLeaf(S, r) {
  let s = "";
  for (let i = 0; i < 7; i++) {
    const x = S * (0.25 + 0.5 * r());
    const y = S * (0.3 + 0.45 * r());
    const l = S * (0.35 + 0.2 * r());
    const c = jitter([92, 122, 64], r, 0.25);
    s += `<path d="${leafPath(l, l * 0.55)}" transform="translate(${x} ${y}) rotate(${(r() - 0.5) * 120})" fill="${c}"/>`;
  }
  return s;
}

function tileHedge(S, r) {
  let s = `<rect x="${S * 0.04}" y="${S * 0.04}" width="${S * 0.92}" height="${S * 0.92}" rx="${S * 0.08}" fill="#3a4420"/>`;
  for (let i = 0; i < 380; i++) {
    const x = S * (0.03 + 0.94 * r());
    const y = S * (0.03 + 0.94 * r());
    const l = S * (0.035 + 0.025 * r());
    s += `<path d="${leafPath(l, l * 0.7)}" transform="translate(${x} ${y}) rotate(${r() * 360})" fill="${jitter([70, 82, 36], r, 0.4)}"/>`;
  }
  return s;
}

function tileBox(S, r) {
  let s = "";
  s += `<circle cx="${S / 2}" cy="${S / 2}" r="${S * 0.36}" fill="#34431f"/>`;
  for (let i = 0; i < 420; i++) {
    const a = r() * Math.PI * 2;
    const rad = Math.sqrt(r()) * S * 0.45;
    const x = S / 2 + Math.cos(a) * rad;
    const y = S / 2 + Math.sin(a) * rad;
    const l = S * (0.035 + 0.02 * r());
    s += `<path d="${leafPath(l, l * 0.7)}" transform="translate(${x} ${y}) rotate(${r() * 360})" fill="${jitter([62, 80, 40], r, 0.35)}"/>`;
  }
  return s;
}

const PAINTERS = [tileBirch, tileBroad, tileConifer, tileGrass, tileLavender, tileBlossom, tileBigLeaf, tileHedge, tileBox];
const MEAN = ["#6f8440", "#4e6129", "#2c3a22", "#7f8a50", "#706a8a", "#a8ae98", "#5d7a40", "#47521f", "#3f5228"];

/** The leaf atlas as WebP (size × size). */
export async function leafAtlas(size = 1024) {
  const S = Math.floor(size / ATLAS.cols);
  let body = "";
  for (let t = 0; t < 9; t++) {
    const c = t % ATLAS.cols;
    const r = Math.floor(t / ATLAS.cols);
    const rr = rng(1000 + t * 17);
    body += `<g transform="translate(${c * S} ${r * S})">`;
    body += `<rect width="${S}" height="${S}" fill="${MEAN[t]}" fill-opacity="0.004"/>`;
    body += `<svg width="${S}" height="${S}" overflow="hidden">${PAINTERS[t](S, rr)}</svg>`;
    body += `</g>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${body}</svg>`;
  const data = await sharp(Buffer.from(svg)).resize(size, size).webp({ quality: 82, alphaQuality: 90, effort: 6, smartSubsample: true }).toBuffer();
  return { data, name: "leaf_atlas", svg };
}

/**
 * lawn_detail: a tileable grass texture, near-neutral (mean ≈ 0.85) so it
 * multiplies the lawn's vertex colours. Short blades in light and dark tones,
 * wrapped at the edges so the tile repeats without seams.
 */
export async function lawnDetail(size = 512) {
  const S = size;
  const r = rng(4242);
  let body = `<rect width="${S}" height="${S}" fill="#d3d8bc"/>`;
  // soft patches
  for (let i = 0; i < 40; i++) {
    const x = r() * S;
    const y = r() * S;
    const rad = S * (0.05 + 0.12 * r());
    const c = r() < 0.5 ? "#c2c8a8" : "#e2e6cc";
    for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) body += `<circle cx="${x + dx}" cy="${y + dy}" r="${rad}" fill="${c}" fill-opacity="0.35"/>`;
  }
  const n = Math.round(S * S * 0.028);
  for (let i = 0; i < n; i++) {
    const x = r() * S;
    const y = r() * S;
    const len = S * (0.012 + 0.03 * r());
    const a = -Math.PI / 2 + (r() - 0.5) * 1.2;
    const x2 = x + Math.cos(a) * len;
    const y2 = y + Math.sin(a) * len;
    const t = r();
    const c = t < 0.35 ? jitter([168, 178, 130], r, 0.12) : t < 0.8 ? jitter([222, 228, 196], r, 0.08) : jitter([244, 246, 226], r, 0.05);
    const w = S * (0.0025 + 0.002 * r());
    for (const dx of [-S, 0, S]) {
      for (const dy of [-S, 0, S]) {
        const X = x + dx;
        const Y = y + dy;
        if (X < -len || X > S + len || Y < -len || Y > S + len) continue;
        body += `<line x1="${X.toFixed(1)}" y1="${Y.toFixed(1)}" x2="${(x2 + dx).toFixed(1)}" y2="${(y2 + dy).toFixed(1)}" stroke="${c}" stroke-width="${w.toFixed(2)}" stroke-linecap="round"/>`;
      }
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${body}</svg>`;
  const data = await sharp(Buffer.from(svg)).resize(S, S).webp({ quality: 78, effort: 6 }).toBuffer();
  return { data, name: "lawn_detail" };
}
