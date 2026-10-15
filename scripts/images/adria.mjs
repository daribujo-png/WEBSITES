#!/usr/bin/env node
/**
 * Supplier images of the house model Adria (Boligpartner).
 *
 *   node scripts/images/adria.mjs            # only (re)builds missing files
 *   node scripts/images/adria.mjs --force    # rebuilds everything
 *
 * Sources (never published as they are):
 *   content-import/adria/orig/<key>.jpg   1920 × 1080, as supplied by Boligpartner
 *   content-import/adria/4k/<key>.jpg     3840 × 2160 EDSR ×2 upscale (optional)
 *
 * The images are shown AS SUPPLIED: this script only resizes and crops. No grade,
 * no sharpening, no retouching (DESIGN.md §5, DIRECTION-adria.md §2.10).
 *
 * Writes public/images/adria/:
 *   <key>-{640,960,1280,1920}.{avif,webp}   always, from the 1920 original
 *   <key>-{2560,3840}.{avif,webp}           only when a 4K source exists (detail page only)
 *   <key>-sq-{480,720,1080}.{avif,webp}     square crop x 470–1550 (images 1 and 2, phone plate)
 * and generates src/content/adria-images.ts (typed manifest).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ORIG = path.join(ROOT, "content-import/adria/orig");
const UP = path.join(ROOT, "content-import/adria/4k");
const OUT = path.join(ROOT, "public/images/adria");
const PUBLIC_BASE = "/images/adria";
const MANIFEST = path.join(ROOT, "src/content/adria-images.ts");
const FORCE = process.argv.includes("--force");

const WIDTHS = [640, 960, 1280, 1920];
const LARGE = [2560, 3840];
const SQUARE = [480, 720, 1080];
/** Square crop of the 1920 × 1080 frame (DIRECTION §2.2): x 470–1550, full height. */
const SQ_CROP = { left: 470, top: 0, width: 1080, height: 1080 };

/** Quality per width: the photos are busy (foliage), so large files get a little less. */
const avifOpts = (w) => ({ quality: w >= 2560 ? 46 : w >= 1280 ? 50 : 54, effort: 6, chromaSubsampling: "4:2:0" });
const webpOpts = (w) => ({ quality: w >= 2560 ? 72 : 76, effort: 5 });

/** Keys in display order, with Norwegian alt text and caption (DIRECTION §3.3). */
const IMAGES = [
  {
    key: "adria-saltak-hage",
    roof: "saltak",
    view: "hage",
    square: true,
    alt: "Husmodellen Adria med saltak, sett fra hagen: toetasjes hus med stående trekledning, sort tak, overbygd balkong og terrasse, plen og solsenger i forgrunnen.",
    caption: "Adria med saltak, hagesiden. Bilde: Boligpartner.",
  },
  {
    key: "adria-flatt-tak-hage",
    roof: "flatt",
    view: "hage",
    square: true,
    alt: "Husmodellen Adria med flatt tak, sett fra hagen fra samme vinkel.",
    caption: "Adria med flatt tak, hagesiden. Bilde: Boligpartner.",
  },
  {
    key: "adria-pulttak-innkjorsel",
    roof: "pulttak",
    view: "innkjorsel",
    square: false,
    alt: "Husmodellen Adria med pulttak, sett fra innkjørselen: inngangsparti, en høy innrammet balkong over en overbygd terrasse, og carport.",
    caption: "Adria med pulttak, inngangssiden. Bilde: Boligpartner.",
  },
  {
    key: "adria-flatt-tak-naer",
    roof: "flatt",
    view: "hage-naer",
    square: false,
    alt: "Husmodellen Adria med flatt tak, sett nærmere fra hagen med pergola og terrasse.",
    caption: "Adria med flatt tak, nærmere hagesiden. Bilde: Boligpartner.",
  },
];

const rel = (p) => path.relative(ROOT, p);
const kb = (bytes) => `${(bytes / 1024).toFixed(0)} KB`;

function fresh(out, src) {
  if (FORCE || !fs.existsSync(out)) return false;
  return fs.statSync(out).mtimeMs >= fs.statSync(src).mtimeMs;
}

async function encode(pipeline, base, w, src, report) {
  const files = [];
  for (const [ext, opts] of [
    ["avif", avifOpts(w)],
    ["webp", webpOpts(w)],
  ]) {
    const out = path.join(OUT, `${base}.${ext}`);
    if (!fresh(out, src)) {
      const img = pipeline.clone();
      await (ext === "avif" ? img.avif(opts) : img.webp(opts)).toFile(out);
    }
    const size = fs.statSync(out).size;
    report.push({ file: rel(out), size });
    files.push({ ext, src: `${PUBLIC_BASE}/${base}.${ext}`, w, size });
  }
  return files;
}

/** Mean colour of the frame (flat placeholder: no blurry LQIP in view). */
async function meanColour(src) {
  const { data } = await sharp(src).resize(1, 1, { fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
  return `#${[...data.subarray(0, 3)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function sourcesOf(files) {
  const pick = (ext) => files.filter((f) => f.ext === ext).map((f) => ({ src: f.src, w: f.w }));
  return { avif: pick("avif"), webp: pick("webp") };
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const report = [];
  const entries = [];

  for (const img of IMAGES) {
    const orig = path.join(ORIG, `${img.key}.jpg`);
    if (!fs.existsSync(orig)) throw new Error(`Missing source: ${rel(orig)}`);
    const up = path.join(UP, `${img.key}.jpg`);
    const has4k = fs.existsSync(up);
    const meta = await sharp(orig).metadata();
    if (meta.width !== 1920 || meta.height !== 1080) throw new Error(`${img.key}: expected 1920 × 1080, got ${meta.width} × ${meta.height}`);

    // ≤ 1920 from the original (as supplied); 2560/3840 only from the 4K upscale.
    const files = [];
    for (const w of WIDTHS) {
      const p = sharp(orig).resize({ width: w, kernel: "lanczos3" });
      files.push(...(await encode(p, `${img.key}-${w}`, w, orig, report)));
    }
    const large = [];
    if (has4k) {
      for (const w of LARGE) {
        const p = sharp(up).resize({ width: w, kernel: "lanczos3" });
        large.push(...(await encode(p, `${img.key}-${w}`, w, up, report)));
      }
    }
    const square = [];
    if (img.square) {
      for (const w of SQUARE) {
        const p = sharp(orig).extract(SQ_CROP).resize({ width: w, kernel: "lanczos3" });
        square.push(...(await encode(p, `${img.key}-sq-${w}`, w, orig, report)));
      }
    }
    entries.push({ img, files, large, square, has4k, placeholder: await meanColour(orig) });
  }

  // Remove stale large files when a 4K source was withdrawn.
  for (const f of fs.readdirSync(OUT)) {
    const m = f.match(/^(.*)-(2560|3840)\.(avif|webp)$/);
    if (m && !fs.existsSync(path.join(UP, `${m[1]}.jpg`))) fs.rmSync(path.join(OUT, f));
  }

  const lines = [];
  lines.push("/**");
  lines.push(" * GENERATED by scripts/images/adria.mjs. Do not edit by hand.");
  lines.push(" * Boligpartner's images of the house model Adria, shown as supplied (resized and");
  lines.push(" * cropped only, never graded). Always show them with \"Bilde: Boligpartner\" and the");
  lines.push(" * visible [MANGLER] for the rights agreement (see src/content/house-models.ts).");
  lines.push(" */");
  lines.push('import type { RenderAsset } from "@/lib/images";');
  lines.push("");
  lines.push(`export type AdriaImageKey = ${IMAGES.map((i) => JSON.stringify(i.key)).join(" | ")};`);
  lines.push("");
  lines.push("export interface SupplierImageAsset extends RenderAsset {");
  lines.push("  roof: \"saltak\" | \"flatt\" | \"pulttak\";");
  lines.push("  view: \"hage\" | \"innkjorsel\" | \"hage-naer\";");
  lines.push("  caption: string;");
  lines.push("  /** Never graded (DESIGN.md §5): <Picture> must not apply the own-photo grade. */");
  lines.push("  origin: \"supplier\";");
  lines.push("  /** Square crop x 470–1550 for the phone plate, when one exists. */");
  lines.push("  square: RenderAsset | null;");
  lines.push("  /** Same image with 2560/3840 widths from the 4K source (detail page only), when one exists. */");
  lines.push("  large: RenderAsset | null;");
  lines.push("}");
  lines.push("");
  lines.push("export const adriaImages: Record<AdriaImageKey, SupplierImageAsset> = {");
  for (const e of entries) {
    const { img } = e;
    const regular = sourcesOf(e.files);
    const square = e.square.length ? sourcesOf(e.square) : null;
    const large = e.large.length ? sourcesOf([...e.files.filter((f) => f.w >= 1280), ...e.large]) : null;
    lines.push(`  ${JSON.stringify(img.key)}: {`);
    lines.push(`    alt: ${JSON.stringify(img.alt)},`);
    lines.push(`    caption: ${JSON.stringify(img.caption)},`);
    lines.push(`    roof: ${JSON.stringify(img.roof)},`);
    lines.push(`    view: ${JSON.stringify(img.view)},`);
    lines.push(`    origin: "supplier",`);
    lines.push("    width: 1920,");
    lines.push("    height: 1080,");
    lines.push(`    sources: ${JSON.stringify(regular)},`);
    lines.push(`    placeholder: ${JSON.stringify(e.placeholder)},`);
    lines.push(
      square
        ? `    square: { alt: ${JSON.stringify(img.alt)}, width: 1080, height: 1080, sources: ${JSON.stringify(square)}, placeholder: ${JSON.stringify(e.placeholder)} },`
        : "    square: null,",
    );
    lines.push(
      large
        ? `    large: { alt: ${JSON.stringify(img.alt)}, width: 3840, height: 2160, sources: ${JSON.stringify(large)}, placeholder: ${JSON.stringify(e.placeholder)} },`
        : "    large: null,",
    );
    lines.push("  },");
  }
  lines.push("};");
  lines.push("");
  lines.push("export const adriaImageKeys = Object.keys(adriaImages) as AdriaImageKey[];");
  lines.push("");
  fs.writeFileSync(MANIFEST, lines.join("\n"));

  for (const r of report) console.log(`${kb(r.size).padStart(7)}  ${r.file}`);
  const over = report.filter(
    (r) => (/-1280\.avif$/.test(r.file) && r.size > 150 * 1024) || (/-sq-720\.avif$/.test(r.file) && r.size > 80 * 1024),
  );
  for (const r of over) console.warn(`OVER BUDGET: ${r.file} ${kb(r.size)}`);
  console.log(`Wrote ${rel(MANIFEST)} (${entries.length} images, 4K: ${entries.filter((e) => e.has4k).map((e) => e.img.key).join(", ") || "none"})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
