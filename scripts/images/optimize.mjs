#!/usr/bin/env node
/**
 * Client photo pipeline.
 *
 *   npm run images:build            # only (re)builds missing or outdated files
 *   npm run images:build -- --force # rebuilds everything
 *
 * Reads public/images/byggrv/ (originals from byggrv.no) and
 * scripts/images/photos.config.mjs (classification + Norwegian alt text), then:
 *
 *   1. Writes responsive AVIF + WebP files to public/images/byggrv/opt/
 *      (<key>-<width>.avif|webp; widths 480/960/1600/2400, capped at the original).
 *   2. Writes cleaned logo SVGs to public/images/byggrv/opt/logo/.
 *   3. Generates src/content/photos.ts (typed manifest + excluded list) and
 *      src/content/brand.ts (logo path data for inline SVG).
 *
 * It fails if a file in content-import/byggrv/images.json is not classified
 * exactly once, so new images cannot slip onto the site unreviewed.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { photos, excluded, logo } from "./photos.config.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SRC_DIR = path.join(ROOT, "public/images/byggrv");
const OUT_DIR = path.join(SRC_DIR, "opt");
const LOGO_DIR = path.join(OUT_DIR, "logo");
const PUBLIC_BASE = "/images/byggrv";
const IMPORT_DIR = path.join(ROOT, "content-import/byggrv");
const PHOTOS_TS = path.join(ROOT, "src/content/photos.ts");
const BRAND_TS = path.join(ROOT, "src/content/brand.ts");

const WIDTHS = [480, 960, 1600, 2400];
const AVIF = { quality: 52, effort: 5 };
const WEBP = { quality: 76, effort: 5 };
const FORCE = process.argv.includes("--force");

const rel = (p) => path.relative(ROOT, p);

/* Source pages ------------------------------------------------------------------------------ */

const importedImages = JSON.parse(fs.readFileSync(path.join(IMPORT_DIR, "images.json"), "utf8"));
const importedPages = JSON.parse(fs.readFileSync(path.join(IMPORT_DIR, "pages.json"), "utf8"));
const pageUrlBySlug = Object.fromEntries(importedPages.map((p) => [p.slug, p.url]));
pageUrlBySlug.hjem ??= "https://byggrv.no/";
const MEDIA_LIBRARY = "Mediebiblioteket på byggrv.no (ikke brukt på noen side)";

function importInfo(file) {
  const entry = importedImages.find((i) => path.basename(i.file) === file);
  if (!entry) throw new Error(`Not in images.json: ${file}`);
  const pages = (entry.pages ?? []).map((slug) => pageUrlBySlug[slug] ?? slug);
  return { sourceUrl: entry.sourceUrl, sourcePage: pages[0] ?? MEDIA_LIBRARY, sourcePages: pages };
}

/* Coverage check ---------------------------------------------------------------------------- */

function checkCoverage() {
  const classified = [...photos.map((p) => p.file), ...excluded.map((e) => e.file), logo.file];
  const seen = new Map();
  for (const f of classified) seen.set(f, (seen.get(f) ?? 0) + 1);
  const problems = [];
  for (const [f, n] of seen) if (n > 1) problems.push(`classified ${n} times: ${f}`);
  for (const i of importedImages) {
    const f = path.basename(i.file);
    if (!seen.has(f)) problems.push(`not classified: ${f}`);
  }
  for (const f of seen.keys()) {
    if (!fs.existsSync(path.join(SRC_DIR, f))) problems.push(`missing on disk: ${f}`);
  }
  const keys = photos.map((p) => p.key);
  if (new Set(keys).size !== keys.length) problems.push("duplicate photo keys");
  if (problems.length) {
    console.error("Image inventory problems:\n  " + problems.join("\n  "));
    process.exit(1);
  }
  console.log(`Inventory OK: ${classified.length} files (${photos.length} published, ${excluded.length} excluded, 1 logo).`);
}

/* Raster photos ------------------------------------------------------------------------------ */

function widthsFor(original) {
  const list = WIDTHS.filter((w) => w < original * 0.9);
  list.push(original);
  return list;
}

function isFresh(out, src) {
  if (FORCE || !fs.existsSync(out)) return false;
  return fs.statSync(out).mtimeMs >= fs.statSync(src).mtimeMs;
}

async function buildPhoto(p) {
  const src = path.join(SRC_DIR, p.file);
  const meta = await sharp(src).rotate().metadata();
  // .rotate() applies EXIF orientation; swap axes when the photo is turned.
  const turned = (meta.orientation ?? 1) >= 5;
  const width = turned ? meta.height : meta.width;
  const height = turned ? meta.width : meta.height;
  const widths = widthsFor(width);
  const sources = { avif: [], webp: [] };
  let bytes = 0;

  for (const w of widths) {
    for (const fmt of ["avif", "webp"]) {
      const name = `${p.key}-${w}.${fmt}`;
      const out = path.join(OUT_DIR, name);
      if (!isFresh(out, src)) {
        const pipeline = sharp(src).rotate().resize({ width: w, withoutEnlargement: true });
        if (fmt === "avif") await pipeline.avif(AVIF).toFile(out);
        else await pipeline.webp(WEBP).toFile(out);
      }
      bytes += fs.statSync(out).size;
      sources[fmt].push({ src: `${PUBLIC_BASE}/opt/${name}`, w });
    }
  }

  // Tiny blurred WebP as blur-up placeholder (~200-400 bytes).
  const tiny = await sharp(src).rotate().resize({ width: 16 }).blur(0.6).webp({ quality: 40 }).toBuffer();
  const placeholder = `data:image/webp;base64,${tiny.toString("base64")}`;

  const info = importInfo(p.file);
  console.log(`  ${p.key.padEnd(26)} ${String(width).padStart(4)}x${String(height).padEnd(4)} ${widths.join("/").padEnd(14)} ${(bytes / 1024).toFixed(0).padStart(5)} kB`);
  return {
    key: p.key,
    asset: {
      alt: p.alt,
      width,
      height,
      sources,
      placeholder,
      caption: p.caption,
      origin: p.origin,
      file: `${PUBLIC_BASE}/${p.file}`,
      sourcePage: info.sourcePage,
      sourceUrl: info.sourceUrl,
      ...(p.note ? { note: p.note } : {}),
    },
  };
}

/* Logo ---------------------------------------------------------------------------------------------- */

const ACCENT = "#C0272D";
const INK = "#333333";
const MARK_MAX_X = 831;

function attr(tag, name) {
  const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`));
  return m ? m[1] : null;
}

const fmtNum = (n) => String(Math.round(n * 1000) / 1000);

/** Parse the Illustrator SVG into path data split by colour. */
function parseLogo(svg) {
  const viewBox = attr(svg.match(/<svg[^>]*>/)[0], "viewBox");
  const [, , vbW, vbH] = viewBox.split(/\s+/).map(Number);
  const accent = [];
  const ink = [];
  const markAccent = [];
  const markInk = [];
  let markWidth = 0;

  for (const m of svg.matchAll(/<(rect|polygon|path)\b[^>]*>/g)) {
    const [tag, kind] = m;
    const fill = (attr(tag, "fill") ?? "").toUpperCase();
    let d;
    let maxX;
    if (kind === "rect") {
      const x = +attr(tag, "x");
      const y = +attr(tag, "y");
      const w = +attr(tag, "width");
      const h = +attr(tag, "height");
      d = `M${fmtNum(x)} ${fmtNum(y)}h${fmtNum(w)}v${fmtNum(h)}h${fmtNum(-w)}Z`;
      maxX = x + w;
    } else if (kind === "polygon") {
      const pts = attr(tag, "points").trim().split(/\s+/).map((pair) => pair.split(",").map(Number));
      d = "M" + pts.map(([x, y]) => `${fmtNum(x)} ${fmtNum(y)}`).join("L") + "Z";
      maxX = Math.max(...pts.map(([x]) => x));
    } else {
      d = attr(tag, "d").replace(/\s+/g, " ").trim();
      maxX = Infinity; // letters never belong to the mark
    }
    const isAccent = fill === ACCENT;
    if (!isAccent && fill !== INK) throw new Error(`Unexpected logo colour ${fill}`);
    (isAccent ? accent : ink).push(d);
    if (maxX <= MARK_MAX_X) {
      (isAccent ? markAccent : markInk).push(d);
      markWidth = Math.max(markWidth, maxX);
    }
  }
  const markBox = `0 0 ${fmtNum(markWidth)} ${fmtNum(vbH)}`;
  return { viewBox, width: vbW, height: vbH, accent, ink, markAccent, markInk, markBox };
}

function svgFile({ viewBox, title, groups }) {
  const body = groups
    .filter((g) => g.paths.length)
    .map((g) => `<path fill="${g.fill}" d="${g.paths.join("")}"/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-label="${title}"><title>${title}</title>${body}</svg>\n`;
}

function buildLogo() {
  const svg = fs.readFileSync(path.join(SRC_DIR, logo.file), "utf8");
  const parsed = parseLogo(svg);
  const title = logo.alt.replace(/&/g, "&amp;");
  const variants = {
    "byggrv-logo.svg": { viewBox: parsed.viewBox, groups: [{ fill: ACCENT, paths: parsed.accent }, { fill: INK, paths: parsed.ink }] },
    "byggrv-logo-ink.svg": { viewBox: parsed.viewBox, groups: [{ fill: "#161C1E", paths: [...parsed.accent, ...parsed.ink] }] },
    "byggrv-logo-snow.svg": { viewBox: parsed.viewBox, groups: [{ fill: "#F2EFE9", paths: [...parsed.accent, ...parsed.ink] }] },
    "byggrv-mark.svg": { viewBox: parsed.markBox, groups: [{ fill: ACCENT, paths: parsed.markAccent }, { fill: INK, paths: parsed.markInk }] },
  };
  for (const [name, v] of Object.entries(variants)) {
    fs.writeFileSync(path.join(LOGO_DIR, name), svgFile({ ...v, title }));
  }
  console.log(`  logo → ${rel(LOGO_DIR)}/ (${Object.keys(variants).join(", ")})`);
  return { ...parsed, files: Object.keys(variants) };
}

/* Code generation ------------------------------------------------------------------------------------ */

const HEADER = (what) =>
  `/**\n * GENERATED by scripts/images/optimize.mjs. Do not edit by hand.\n * ${what}\n * Edit scripts/images/photos.config.mjs, then run \`npm run images:build\`.\n */\n`;

const json = (v) => JSON.stringify(v, null, 2);

function writePhotosTs(built) {
  const keys = built.map((b) => b.key);
  const manifest = Object.fromEntries(built.map((b) => [b.key, b.asset]));
  const excludedOut = excluded.map((e) => {
    const info = importInfo(e.file);
    return { file: `${PUBLIC_BASE}/${e.file}`, origin: e.origin, reason: e.reason, sourcePage: info.sourcePage };
  });
  const ts =
    HEADER("Client photos from byggrv.no: optimised AVIF/WebP sets + the list of excluded images.") +
    `import type { ExcludedImage, PhotoAsset } from "./types";\n\n` +
    `/** Keys of the published photos (all origin "own"). */\n` +
    `export type PhotoKey =\n${keys.map((k) => `  | ${JSON.stringify(k)}`).join("\n")};\n\n` +
    `/** Published photos. Render with <Picture asset={photos[key]} /> from "@/components/ui". */\n` +
    `export const photos: Record<PhotoKey, PhotoAsset> = ${json(manifest)};\n\n` +
    `export const photoKeys = Object.keys(photos) as PhotoKey[];\n\n` +
    `export function getPhoto(key: string): PhotoAsset | null {\n  return (photos as Record<string, PhotoAsset>)[key] ?? null;\n}\n\n` +
    `/**\n * Imported images that are NOT used on the site, with the reason\n * (stock or third-party suspects need a licence check; clipart is excluded for design reasons).\n */\n` +
    `export const excludedImages: ExcludedImage[] = ${json(excludedOut)};\n`;
  fs.writeFileSync(PHOTOS_TS, ts);
  console.log(`  manifest → ${rel(PHOTOS_TS)}`);
}

function writeBrandTs(l) {
  const files = Object.fromEntries(
    l.files.map((f) => [f.replace(/^byggrv-|\.svg$/g, "").replace(/-([a-z])/g, (_, c) => c.toUpperCase()), `${PUBLIC_BASE}/opt/logo/${f}`]),
  );
  const brand = {
    name: logo.alt,
    viewBox: l.viewBox,
    width: l.width,
    height: l.height,
    colors: { accent: ACCENT, ink: INK },
    accent: l.accent,
    ink: l.ink,
    mark: { viewBox: l.markBox, accent: l.markAccent, ink: l.markInk },
    files,
  };
  const ts =
    HEADER("The client's logo (logo-byggrenovering-vest.svg, outlined letters) as path data.") +
    `/**\n * Render inline so colour can follow the band (e.g. fill="currentColor"):\n *   <svg viewBox={brandLogo.viewBox} role="img" aria-label={brandLogo.name}>\n *     <path d={brandLogo.accent.join("")} fill="var(--logo-accent, currentColor)" />\n *     <path d={brandLogo.ink.join("")} fill="currentColor" />\n *   </svg>\n * accent = roof line, ampersand and underline (red ${ACCENT} in the original);\n * ink = windows and letters (${INK} in the original).\n * Ready-made files: brandLogo.files (original colours, ink, snow, and the mark alone).\n */\n` +
    `export const brandLogo = ${json(brand)} as const;\n`;
  fs.writeFileSync(BRAND_TS, ts);
  console.log(`  brand → ${rel(BRAND_TS)}`);
}

/* Main ---------------------------------------------------------------------------------------------------- */

checkCoverage();
fs.mkdirSync(LOGO_DIR, { recursive: true });

console.log("Photos:");
const built = [];
for (const p of photos) built.push(await buildPhoto(p));

// Remove stale outputs (renamed keys, dropped widths).
const expected = new Set(built.flatMap((b) => [...b.asset.sources.avif, ...b.asset.sources.webp].map((s) => path.basename(s.src))));
for (const f of fs.readdirSync(OUT_DIR)) {
  const full = path.join(OUT_DIR, f);
  if (fs.statSync(full).isFile() && !expected.has(f)) {
    fs.unlinkSync(full);
    console.log(`  removed stale ${f}`);
  }
}

console.log("Logo:");
const builtLogo = buildLogo();

writePhotosTs(built);
writeBrandTs(builtLogo);

const total = fs
  .readdirSync(OUT_DIR, { recursive: true })
  .map((f) => path.join(OUT_DIR, String(f)))
  .filter((f) => fs.statSync(f).isFile())
  .reduce((n, f) => n + fs.statSync(f).size, 0);
console.log(`Done. ${rel(OUT_DIR)} = ${(total / 1024).toFixed(0)} kB`);
