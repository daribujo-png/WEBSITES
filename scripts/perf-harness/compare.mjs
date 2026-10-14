#!/usr/bin/env node
/**
 * Compare two runs:  node compare.mjs <A summary.json|label> <B summary.json|label> [--filter=regex] [--all]
 * Labels resolve to ../results/<label>/summary.json. Also diffs assets.json when both exist.
 * Prints A, B, Δ% per metric (only changed metrics unless --all).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { flatten } from "./report.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const pos = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const flags = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith("--")).map((a) => a.slice(2).split("=")));
const resolve = (x) => (x.endsWith(".json") ? x : path.join(HERE, "..", "results", x, "summary.json"));
const [A, B] = pos.map(resolve);
const fa = flatten(JSON.parse(fs.readFileSync(A, "utf8")));
const fb = flatten(JSON.parse(fs.readFileSync(B, "utf8")));
const re = flags.filter ? new RegExp(flags.filter) : null;
const keys = [...new Set([...Object.keys(fa), ...Object.keys(fb)])].filter((k) => !re || re.test(k));
console.log(`${"metric".padEnd(62)} ${"A".padStart(10)} ${"B".padStart(10)} ${"Δ%".padStart(8)}`);
for (const k of keys) {
  const a = fa[k];
  const b = fb[k];
  if (!("all" in flags) && a === b) continue;
  const d = typeof a === "number" && typeof b === "number" && a !== 0 ? (((b - a) / Math.abs(a)) * 100).toFixed(0) + "%" : "";
  console.log(`${k.padEnd(62)} ${String(a ?? "-").padStart(10)} ${String(b ?? "-").padStart(10)} ${d.padStart(8)}`);
}

// Asset diff
const aa = path.join(path.dirname(A), "assets.json");
const ab = path.join(path.dirname(B), "assets.json");
if (fs.existsSync(aa) && fs.existsSync(ab)) {
  const x = JSON.parse(fs.readFileSync(aa, "utf8"));
  const y = JSON.parse(fs.readFileSync(ab, "utf8"));
  console.log("\nassets");
  for (const m of new Set([...Object.keys(x.models), ...Object.keys(y.models)])) {
    const p = x.models[m];
    const q = y.models[m];
    const row = (k, f) => console.log(`  ${(m + " " + k).padEnd(40)} ${String(p ? f(p) : "-").padStart(10)} ${String(q ? f(q) : "-").padStart(10)}`);
    row("raw KB", (r) => (r.bytes.raw / 1024).toFixed(0));
    row("gzip KB", (r) => (r.bytes.gzip9 / 1024).toFixed(0));
    row("brotli KB", (r) => (r.bytes.brotli11 / 1024).toFixed(0));
    row("tris", (r) => r.totals.tris);
    row("verts", (r) => r.totals.verts);
    row("primitives", (r) => r.counts.primitives);
    row("materials", (r) => r.counts.materials);
  }
  if (x.chunks && y.chunks) {
    console.log(`  ${"3D JS gzip KB".padEnd(40)} ${(x.chunks.threeRelatedTotals.gzip9 / 1024).toFixed(0).padStart(10)} ${(y.chunks.threeRelatedTotals.gzip9 / 1024).toFixed(0).padStart(10)}`);
  }
}
