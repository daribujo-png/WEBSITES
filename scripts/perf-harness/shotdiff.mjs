#!/usr/bin/env node
/**
 * Visual regression between two runs' screenshots (same names in results/<label>/shots/).
 *   node shotdiff.mjs <labelA> <labelB> [--root=/home/user/WEBSITES]
 * Prints mean absolute difference (0–255), share of pixels differing by > 24 and the mean
 * luminance of each shot (a darker/brighter scene shows up here), and writes
 * results/<labelB>/shots/diff-<name>.png (amplified ×4). Uses sharp from the project.
 * Hotspot labels / cursor rings can move a few px between runs; judge the canvas, not the overlay.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const pos = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const flags = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith("--")).map((a) => a.slice(2).split("=")));
const ROOT = flags.root || "/home/user/WEBSITES";
const sharp = createRequire(path.join(ROOT, "package.json"))("sharp");
const dir = (l) => path.join(HERE, "..", "results", l, "shots");
const [A, B] = pos;
const names = fs.readdirSync(dir(A)).filter((f) => f.endsWith(".png") && !f.startsWith("diff-") && fs.existsSync(path.join(dir(B), f)));
console.log(`${"shot".padEnd(44)} ${"MAD".padStart(6)} ${">24 %".padStart(7)} ${"lumA".padStart(6)} ${"lumB".padStart(6)}`);
for (const n of names) {
  const a = await sharp(path.join(dir(A), n)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const b = await sharp(path.join(dir(B), n)).removeAlpha().resize(a.info.width, a.info.height, { fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
  const px = a.info.width * a.info.height;
  const d = Buffer.alloc(px * 3);
  let sum = 0;
  let over = 0;
  let la = 0;
  let lb = 0;
  for (let i = 0; i < px; i++) {
    let m = 0;
    for (let c = 0; c < 3; c++) {
      const v = Math.abs(a.data[i * 3 + c] - b.data[i * 3 + c]);
      sum += v;
      if (v > m) m = v;
      d[i * 3 + c] = Math.min(255, v * 4);
    }
    if (m > 24) over++;
    la += 0.2126 * a.data[i * 3] + 0.7152 * a.data[i * 3 + 1] + 0.0722 * a.data[i * 3 + 2];
    lb += 0.2126 * b.data[i * 3] + 0.7152 * b.data[i * 3 + 1] + 0.0722 * b.data[i * 3 + 2];
  }
  await sharp(d, { raw: { width: a.info.width, height: a.info.height, channels: 3 } }).png().toFile(path.join(dir(B), `diff-${n}`));
  console.log(
    `${n.padEnd(44)} ${(sum / (px * 3)).toFixed(2).padStart(6)} ${((over / px) * 100).toFixed(2).padStart(7)} ${(la / px).toFixed(1).padStart(6)} ${(lb / px).toFixed(1).padStart(6)}`,
  );
}
