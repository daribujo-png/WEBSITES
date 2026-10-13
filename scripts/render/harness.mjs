/**
 * Static server + headless Chromium for the render harness.
 * Serves scripts/render/page/, three from node_modules and public/models.
 * Playwright is resolved from NODE_PATH (global install), e.g.
 *   NODE_PATH=$(npm root -g) node scripts/render/render.mjs
 */
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PAGE = path.join(ROOT, "scripts/render/page");
const THREE_DIR = path.join(ROOT, "node_modules/three");
const MODELS = path.join(ROOT, "public/models");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".glb": "model/gltf-binary",
  ".wasm": "application/wasm",
};

export async function startServer() {
  const server = http.createServer(async (req, res) => {
    const url = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (url === "/favicon.ico") {
      res.writeHead(204).end();
      return;
    }
    let file;
    if (url.startsWith("/three/")) file = path.join(THREE_DIR, url.slice(7));
    else if (url.startsWith("/models/")) file = path.join(MODELS, url.slice(8));
    else file = path.join(PAGE, url === "/" ? "index.html" : url.slice(1));
    const base = [THREE_DIR, MODELS, PAGE].find((b) => file.startsWith(b));
    if (!base) {
      res.writeHead(403).end();
      return;
    }
    try {
      const body = await fs.readFile(file);
      res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream", "cache-control": "no-store" });
      res.end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  return { server, url: `http://127.0.0.1:${port}/` };
}

function globalRoot() {
  try {
    return execSync("npm root -g", { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

function loadPlaywright() {
  const require = createRequire(import.meta.url);
  const tries = [
    "playwright",
    ...(process.env.NODE_PATH || "").split(path.delimiter).filter(Boolean).map((p) => path.join(p, "playwright")),
  ];
  const g = globalRoot();
  if (g) tries.push(path.join(g, "playwright"));
  for (const t of tries) {
    try {
      return require(t);
    } catch {
      /* next */
    }
  }
  throw new Error("Playwright not found. Run with NODE_PATH=$(npm root -g) or install playwright.");
}

async function findChromium() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const roots = [process.env.PLAYWRIGHT_BROWSERS_PATH, "/opt/pw-browsers"].filter(Boolean);
  for (const r of roots) {
    try {
      const dirs = (await fs.readdir(r)).filter((d) => /^chromium-\d+/.test(d)).sort().reverse();
      for (const d of dirs) {
        for (const sub of ["chrome-linux/chrome", "chrome-linux64/chrome"]) {
          const p = path.join(r, d, sub);
          try {
            await fs.access(p);
            return p;
          } catch {
            /* next */
          }
        }
      }
    } catch {
      /* next */
    }
  }
  return undefined; // let Playwright pick its default
}

export async function startBrowser() {
  const { chromium } = loadPlaywright();
  const executablePath = await findChromium();
  const browser = await chromium.launch({
    executablePath,
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-sandbox"],
  });
  return browser;
}

/** Open the harness page and wait for the models. */
export async function openHarness(browser, url) {
  const page = await browser.newPage({ viewport: { width: 800, height: 450 } });
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") console.log(`[page ${m.type()}] ${m.text()}`);
  });
  page.on("pageerror", (e) => console.log(`[page error] ${e.message}`));
  await page.goto(url);
  await page.waitForFunction(() => window.ready || window.loadError, null, { timeout: 180000 });
  const err = await page.evaluate(() => window.loadError);
  if (err) throw new Error(err);
  return page;
}

export async function renderPNG(page, shot) {
  const dataUrl = await page.evaluate((s) => window.renderShot(s), shot);
  return Buffer.from(dataUrl.split(",")[1], "base64");
}
