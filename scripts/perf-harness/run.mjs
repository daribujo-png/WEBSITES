#!/usr/bin/env node
/**
 * Runtime profiler for the 3D scenes of the home page (read-only on the repo).
 *
 *   NODE_PATH=$(npm root -g) node run.mjs --label=baseline \
 *       [--root=/home/user/WEBSITES] [--port=4317] [--base=http://localhost:4317] (skip own server)
 *       [--profiles=desktop,mobile4,mobile6] [--scenarios=load,states,scrub,fallbacks]
 *       [--cpuprofile] [--speed=1200] [--shots]
 *
 * Needs `npm run build` first (serves <root>/out with `npx -y serve@14`).
 * Writes results/<label>/<profile>.json (+ shots/*.png, cpuprofile summaries) and
 * results/<label>/summary.json, and prints a compact table. Compare two labels with compare.mjs.
 *
 * Software WebGL (SwiftShader) is 10–50× slower than a GPU: compare relative numbers only.
 * Draw calls / triangles / programs / shadow + post passes are exact (counted at the GL API).
 */
import fs from "node:fs";
import path from "node:path";
import { spawn, execSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, "").split("=");
    return [k, v.length ? v.join("=") : true];
  }),
);
const ROOT = path.resolve(args.root || "/home/user/WEBSITES");
const LABEL = args.label || "latest";
const OUT = path.resolve(args.out || path.join(HERE, "..", "results", LABEL));
const PORT = Number(args.port || 4317);
const BASE = args.base || `http://localhost:${PORT}`;
const QUICK = !!args.quick;
const PROFILE_NAMES = (args.profiles || (QUICK ? "desktop,mobile4" : "desktop,mobile4,mobile6")).split(",");
// Toggle/hover animations recorded after the scrub (each capped at --maxrec ms; software GL
// renders only a handful of frames in that window, so "frames3d" = throughput).
const ANIMS = (args.anims || (QUICK ? "" : "exploded,day,hero")).split(",").filter(Boolean);
const SCENARIOS = (args.scenarios || "load,states,scrub,fallbacks").split(",");
const SPEED = Number(args.speed || 1200);
const SHOTS = args.shots !== "false";
fs.mkdirSync(path.join(OUT, "shots"), { recursive: true });

const require = createRequire(import.meta.url);
let pw;
try {
  pw = require("playwright");
} catch {
  pw = require(path.join(execSync("npm root -g").toString().trim(), "playwright"));
}
const { chromium } = pw;

const PROFILES = {
  desktop: { viewport: { width: 1440, height: 900 }, dpr: 1, mobile: false, cpu: 1, net: null },
  laptop: { viewport: { width: 1366, height: 768 }, dpr: 1.5, mobile: false, cpu: 2, net: null },
  mobile4: { viewport: { width: 390, height: 844 }, dpr: 3, mobile: true, cpu: 4, net: "fast3g" },
  mobile6: { viewport: { width: 390, height: 844 }, dpr: 3, mobile: true, cpu: 6, net: "fast3g" },
};
// DevTools "Fast 3G" (same numbers as the DevTools preset).
const NET = { fast3g: { offline: false, latency: 562.5, downloadThroughput: (1.44e6 * 0.9) / 8, uploadThroughput: (675e3 * 0.9) / 8 } };
const MOBILE_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36";

const INSTRUMENT = fs.readFileSync(path.join(HERE, "instrument.js"), "utf8");
const REACT_HOOK = `(() => {
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) return;
  const P = (window.__reactCommits = { byRenderer: {}, total: 0 });
  const names = new Map(); let next = 1;
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    supportsFiber: true, isDisabled: false, renderers: new Map(),
    inject(internals) { const id = next++; names.set(id, internals && internals.rendererPackageName || ("r" + id)); return id; },
    onCommitFiberRoot(id) { const n = names.get(id) || id; P.byRenderer[n] = (P.byRenderer[n] || 0) + 1; P.total++; },
    onCommitFiberUnmount() {}, onPostCommitFiberRoot() {}, onScheduleFiberRoot() {}, checkDCE() {},
  };
})();`;

/* ------------------------------------------------------------------ chunk tags (from out/) */
function chunkTags() {
  const dir = path.join(ROOT, "out/_next/static/chunks");
  const map = {};
  if (!fs.existsSync(dir)) return map;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".js")) continue;
    const s = fs.readFileSync(path.join(dir, f), "latin1");
    const t = [];
    if (s.includes("WebGLRenderer")) t.push("three");
    if (s.includes("__r3f")) t.push("r3f");
    if (s.includes("EXT_meshopt_compression")) t.push("gltf");
    if (/UnrealBloomPass|luminosityThreshold/.test(s)) t.push("postfx");
    if (s.includes("showAllForCompile") || s.includes("__ghost")) t.push("BuildCanvas");
    if (s.includes("permit_existing")) t.push("PermitCanvas");
    if (s.includes("ScrollTrigger")) t.push("gsap");
    if (/lenis/i.test(s)) t.push("lenis");
    if (t.length) map[f] = t;
  }
  return map;
}
const TAGS = chunkTags();
const is3d = (tags) => tags && tags.some((t) => ["three", "r3f", "gltf", "postfx", "BuildCanvas", "PermitCanvas"].includes(t));

/* ------------------------------------------------------------------ server */
async function startServer() {
  if (args.base) return null;
  const proc = spawn("npx", ["-y", "serve@14", path.join(ROOT, "out"), "-l", String(PORT), "--no-port-switching"], {
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });
  for (let i = 0; i < 120; i++) {
    try {
      const r = await fetch(BASE + "/");
      if (r.ok) return proc;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("server did not start");
}
function stopServer(proc) {
  if (!proc) return;
  try {
    process.kill(-proc.pid, "SIGTERM");
  } catch {}
}

/* ------------------------------------------------------------------ browser helpers */
async function newPage(browser, prof, { snap = false, reducedMotion = "no-preference", noWebGL = false } = {}) {
  const ctx = await browser.newContext({
    viewport: prof.viewport,
    deviceScaleFactor: prof.dpr,
    isMobile: prof.mobile,
    hasTouch: prof.mobile,
    userAgent: prof.mobile ? MOBILE_UA : undefined,
    reducedMotion,
  });
  if (noWebGL)
    await ctx.addInitScript(() => {
      const o = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (t, a) {
        if (/webgl/i.test(String(t))) return null;
        return o.call(this, t, a);
      };
    });
  await ctx.addInitScript(REACT_HOOK);
  await ctx.addInitScript(INSTRUMENT);
  if (snap) await ctx.addInitScript(() => (window.__byggrvSnap3d = true));
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 300)));
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") errors.push(`${m.type()}: ${m.text().slice(0, 300)}`);
  });
  if (prof.cpu > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: prof.cpu });
  return { ctx, page, cdp, errors };
}

const pnow = (page) => page.evaluate(() => performance.now());

async function waitMark(page, name, pred, timeout) {
  return page
    .waitForFunction(
      ([n, p]) => window.__perf.marks.find((m) => m.name === n && (!p || (m.detail && m.detail.kind && m.detail.kind.startsWith(p)))),
      [name, pred],
      { timeout, polling: 250 },
    )
    .then(() => true)
    .catch(() => false);
}

/** Wait until no R3F frame is pending and nothing rendered for `ms` (capped at `max`). */
async function quiet(page, ms = 500, max = 120000) {
  return page.evaluate(([ms, max]) => window.__perf.quiet(ms, max), [ms, max]);
}

/**
 * Force `samples` single frames on the canvases of `kind` (state must be settled) and count
 * what they cost: GL calls (exact), three's info, CPU in render(), and a GPU-cost proxy
 * (1-px readPixels right after the frame = time the GPU still needed; SwiftShader → CPU raster).
 * All contexts are drained first; report.mjs uses the MIN sample (least contention).
 */
async function measureFrame(page, kind, samples = Number(args.samples || 2)) {
  await quiet(page, 500);
  return page.evaluate(
    async ([kind, samples]) => {
      const P = window.__perf;
      const recs = P.renderers.filter((r) => P.kindOf(r.r.domElement).startsWith(kind));
      const ctxCounts = () =>
        recs.map((rec) => {
          const c = P.contexts.find((c) => c.canvas === rec.r.domElement);
          return c ? { ...c.counts } : null;
        });
      const before = ctxCounts();
      const progs = P.programKeys();
      P.resetWin();
      P.gpuSamples = [];
      P.gpuProbe = true;
      const t0 = performance.now();
      let n = 0;
      const total = () => recs.reduce((s, r) => s + r.total.renders, 0);
      const drains = [];
      for (let i = 0; i < samples; i++) {
        drains.push(+P.drainGpu().toFixed(1)); // other canvases' queued GPU work must not land in this sample
        const r0 = total();
        for (const rec of recs) {
          const st = P.r3fState(rec);
          if (st) {
            st.invalidate();
            n++;
          }
        }
        const tw = performance.now();
        while (total() === r0 && performance.now() - tw < 90000) await new Promise((r) => setTimeout(r, 20));
        await P.quiet(300, 120000);
      }
      P.gpuProbe = false;
      const after = ctxCounts();
      const newPrograms = P.newPrograms(progs);
      const gpu = P.gpuSamples || [];
      return recs.map((rec, i) => {
        const gl = {};
        if (before[i] && after[i]) for (const k of Object.keys(after[i])) gl[k] = after[i][k] - before[i][k];
        const w = rec.win;
        return {
          kind: P.kindOf(rec.r.domElement),
          invalidated: n,
          wallMs: +(performance.now() - t0).toFixed(1),
          gl,
          mainFrames: Math.max(1, w.renders - w.postRenders),
          threeInfo: { renders: w.renders, postRenders: w.postRenders, mainToTarget: w.mainToTarget, calls: w.calls, triangles: w.triangles, lines: w.lines },
          renderCpuMs: +w.cpu.toFixed(2),
          mainRenderCpuMs: +w.mainCpu.toFixed(2),
          gpuSyncMs: gpu.filter((g) => g.id === rec.id).map((g) => +g.syncMs.toFixed(1)),
          drainMs: drains,
          frameCpuMs: gpu.filter((g) => g.id === rec.id).map((g) => +g.cpuFrameMs.toFixed(1)),
          newPrograms: newPrograms.filter((p) => p.kind === P.kindOf(rec.r.domElement)),
          describe: P.describe(rec),
        };
      });
    },
    [kind, samples],
  );
}

async function stageGeom(page) {
  return page.evaluate(() => {
    const wrap = document.querySelector('#slik-bygger-vi div[style*="--stage-run"]');
    if (!wrap) return null;
    const r = wrap.getBoundingClientRect();
    const start = r.top + window.scrollY;
    return { start, end: start + wrap.offsetHeight - window.innerHeight, h: window.innerHeight };
  });
}

function stepY(g, i, N = 11) {
  const FH = 0.5;
  const LH = 0.55;
  const TR = 0.62;
  const total = FH + (N - 1) + LH;
  let r;
  if (i <= 0) r = -FH / 2;
  else if (i >= N - 1) r = N - 1 + LH * 0.4;
  else r = i - 1 + TR + (1 - TR) * 0.5;
  return g.start + (g.end - g.start) * ((r + FH) / total);
}

async function scrollToY(page, y) {
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), Math.round(y));
}

async function activeStep(page) {
  return page.evaluate(() => {
    for (const ol of document.querySelectorAll("#slik-bygger-vi nav ol")) {
      const bs = [...ol.querySelectorAll("button")];
      const i = bs.findIndex((b) => b.getAttribute("aria-current") === "step");
      if (i >= 0) return i;
    }
    return -1;
  });
}

async function gotoStep(page, i) {
  const g = await stageGeom(page);
  await scrollToY(page, stepY(g, i));
  await page.waitForFunction(
    (i) => {
      for (const ol of document.querySelectorAll("#slik-bygger-vi nav ol")) {
        const bs = [...ol.querySelectorAll("button")];
        if (bs.findIndex((b) => b.getAttribute("aria-current") === "step") === i) return true;
      }
      return false;
    },
    i,
    { timeout: 30000, polling: 100 },
  ).catch(() => null);
  return activeStep(page);
}

const SEL = {
  exploded: 'button[aria-describedby="bygg-hint-sprengskisse"]',
  plan: 'button[aria-describedby="bygg-hint-plan"]',
};
async function setToggles(page, { exploded = false, plan = false, day = false }) {
  for (const [k, want] of [
    ["exploded", exploded],
    ["plan", plan],
  ]) {
    const b = page.locator(`#slik-bygger-vi ${SEL[k]}`).first();
    if ((await b.count()) === 0) continue;
    const pressed = (await b.getAttribute("aria-pressed")) === "true";
    if (pressed !== want) await b.click({ force: true });
  }
  const light = page.locator('#slik-bygger-vi [role="group"] [role="group"]').filter({ has: page.locator("button") }).first();
  const btns = light.locator("button");
  if ((await btns.count()) >= 2) {
    const target = btns.nth(day ? 0 : 1);
    if ((await target.getAttribute("aria-pressed")) !== "true") await target.click({ force: true });
  }
}

async function shot(page, name, selector) {
  if (!SHOTS) return null;
  const file = path.join(OUT, "shots", `${name}.png`);
  try {
    if (selector) await page.locator(selector).first().screenshot({ path: file, timeout: 30000 });
    else await page.screenshot({ path: file, timeout: 30000 });
    return path.relative(OUT, file);
  } catch (e) {
    return "failed: " + String(e).slice(0, 120);
  }
}

async function engageHero(page, prof) {
  if (prof.mobile) return null;
  const t = await pnow(page);
  await page.mouse.move(prof.viewport.width * 0.5, prof.viewport.height * 0.5);
  await page.mouse.move(prof.viewport.width * 0.55, prof.viewport.height * 0.52, { steps: 4 });
  return t;
}

async function collect(page) {
  return page.evaluate(() => {
    const P = window.__perf;
    const res = performance.getEntriesByType("resource").map((e) => ({
      name: e.name.replace(location.origin, ""),
      start: +e.startTime.toFixed(1),
      end: +e.responseEnd.toFixed(1),
      transfer: e.transferSize,
      encoded: e.encodedBodySize,
      decoded: e.decodedBodySize,
    }));
    return {
      marks: P.marks.map((m) => ({ ...m, t: +m.t.toFixed(1) })),
      longtasks: P.longtasks.map((l) => ({ start: +l.start.toFixed(1), dur: +l.dur.toFixed(1) })),
      lcp: P.lcp,
      fcp: P.fcp,
      workers: { ...P.workers, log: undefined },
      contexts: P.contexts.map((c) => ({ id: c.id, type: c.type, t: +c.t.toFixed(1), attrs: c.attrs, kind: P.kindOf(c.canvas), counts: c.counts })),
      links: (P.links || []).map((l) => ({ t: +l.t.toFixed(1), ctx: l.ctx, kind: P.contexts[l.ctx] ? P.kindOf(P.contexts[l.ctx].canvas) : "?" })),
      renderers: P.describeAll(),
      resources: res,
      reactCommits: window.__reactCommits ? { ...window.__reactCommits } : null,
      threeRevision: P.threeRevision || null,
      docTitle: document.title,
    };
  });
}

function ltIn(lts, a, b) {
  if (a == null || b == null) return null;
  const xs = lts.filter((l) => l.start >= a && l.start < b);
  return { n: xs.length, total: +xs.reduce((s, l) => s + l.dur, 0).toFixed(1), max: xs.length ? Math.max(...xs.map((l) => l.dur)) : 0 };
}

function timeline(c, kind, trigger) {
  const m = (name) => c.marks.find((x) => x.name === name && x.detail && x.detail.kind && x.detail.kind.startsWith(kind));
  const glbName = kind.startsWith("permit") ? "/models/permits.glb" : "/models/house.glb";
  const glb = c.resources.find((r) => r.name.startsWith(glbName));
  const chunkRes = c.resources.filter((r) => r.name.includes("/_next/static/chunks/") && is3d(TAGS[path.basename(r.name)]));
  const chunks = chunkRes
    .filter((r) => r.start >= (trigger ?? 0) - 50 || kind === "hero")
    .map((r) => ({ file: path.basename(r.name), tags: TAGS[path.basename(r.name)], start: r.start, end: r.end, transfer: r.transfer, decoded: r.decoded }));
  const cs = m("compileAsync-start");
  const ce = m("compileAsync-end");
  const ff = m("first-frame-after-compile");
  const rd = m("canvas-ready");
  const rel = (t) => (t == null || trigger == null ? null : +(t - trigger).toFixed(1));
  const out = {
    trigger,
    chunks,
    glb: glb ? { start: glb.start, end: glb.end, transfer: glb.transfer, encoded: glb.encoded, decoded: glb.decoded, cached: glb.transfer === 0 } : null,
    compileStart: cs ? cs.t : null,
    compileEnd: ce ? ce.t : null,
    compileMs: ce ? ce.detail.ms : null,
    firstFrame: ff ? ff.t : null,
    firstFrameRenderMs: ff ? ff.detail.ms : null,
    ready: rd ? rd.t : null,
  };
  out.relToTrigger = {
    chunksDone: chunks.length ? rel(Math.max(...chunks.map((x) => x.end))) : null,
    glbStart: rel(out.glb?.start),
    glbEnd: rel(out.glb?.end),
    sceneMounted_compileStart: rel(out.compileStart),
    compileEnd: rel(out.compileEnd),
    firstFrame: rel(out.firstFrame),
    ready: rel(out.ready),
  };
  const lk = (c.links || []).filter((l) => l.kind.startsWith(kind));
  const cnt = (a, b) => lk.filter((l) => (a == null || l.t >= a) && (b == null || l.t < b)).length;
  out.programLinks = {
    beforeCompile: cnt(null, out.compileStart),
    duringCompileAsync: cnt(out.compileStart, out.compileEnd),
    afterCompileToReady: cnt(out.compileEnd, out.ready),
    afterReady: cnt(out.ready, null),
  };
  const lt = c.longtasks;
  out.longtasks = {
    triggerToGlbEnd: ltIn(lt, trigger, out.glb?.end ?? out.compileStart),
    glbEndToCompileStart_parseMount: ltIn(lt, out.glb?.end ?? trigger, out.compileStart),
    compile: ltIn(lt, out.compileStart, out.compileEnd),
    compileEndToReady_firstFrames: ltIn(lt, out.compileEnd, out.ready ?? out.compileEnd + 3000),
    triggerToReady: ltIn(lt, trigger, out.ready),
  };
  return out;
}

/* ------------------------------------------------------------------ CPU profile summary */
function summarizeProfile(profile) {
  const self = new Map();
  const byNode = new Map(profile.nodes.map((n) => [n.id, n]));
  const dt = profile.timeDeltas;
  const tot = new Map();
  for (let i = 0; i < profile.samples.length; i++) {
    const n = byNode.get(profile.samples[i]);
    const d = (dt[i] || 0) / 1000;
    const cf = n.callFrame;
    const file = cf.url ? cf.url.split("/").pop() : "";
    const key = `${cf.functionName || "(anon)"} ${file}:${cf.lineNumber}:${cf.columnNumber}`;
    self.set(key, (self.get(key) || 0) + d);
    const cat = !cf.url ? cf.functionName || "(native)" : TAGS[file] ? `${file} [${TAGS[file].join(",")}]` : file;
    tot.set(cat, (tot.get(cat) || 0) + d);
  }
  const top = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([k, v]) => ({ fn: k, selfMs: +v.toFixed(1) }));
  const byFile = [...tot.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k, v]) => ({ file: k, selfMs: +v.toFixed(1) }));
  return { top, byFile };
}

/* ------------------------------------------------------------------ scenarios */
async function scenarioLoad(browser, name, prof) {
  const { ctx, page, cdp, errors } = await newPage(browser, prof);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  if (prof.net) await cdp.send("Network.emulateNetworkConditions", NET[prof.net]);
  const navStart = Date.now();
  await page.goto(BASE + "/", { waitUntil: "load", timeout: 180000 });
  const loadWall = Date.now() - navStart;
  await page.waitForTimeout(1500);
  const out = { profile: name, loadEventWallMs: loadWall, canvases: {} };
  // Was anything 3D fetched before any interaction?
  const pre = await collect(page);
  out.before3dTrigger = {
    glbRequested: pre.resources.some((r) => r.name.includes(".glb")),
    threeChunksRequested: pre.resources.filter((r) => is3d(TAGS[path.basename(r.name)])).map((r) => path.basename(r.name)),
    webglContexts: pre.contexts.length,
    lcp: pre.lcp,
    fcp: pre.fcp,
    longtasksTotal: +pre.longtasks.reduce((s, l) => s + l.dur, 0).toFixed(1),
  };
  if (args.cpuprofile) {
    await cdp.send("Profiler.enable");
    await cdp.send("Profiler.setSamplingInterval", { interval: 250 });
    await cdp.send("Profiler.start");
  }
  // Hero (desktop only): idle + engaged + in view.
  if (!prof.mobile) {
    const t = await engageHero(page, prof);
    const ok = await waitMark(page, "canvas-ready", "hero", 240000);
    const c = await collect(page);
    out.canvases.hero = { ok, ...timeline(c, "hero", t) };
  }
  // Build stage: scroll to the top of the pinned run.
  const g = await stageGeom(page);
  const tb = await pnow(page);
  await scrollToY(page, g.start);
  const okB = await waitMark(page, "canvas-ready", "build", 300000);
  let c = await collect(page);
  out.canvases.build = { ok: okB, ...timeline(c, "build", tb) };
  if (args.cpuprofile) {
    const { profile } = await cdp.send("Profiler.stop");
    out.cpuProfile = summarizeProfile(profile);
    fs.writeFileSync(path.join(OUT, `${name}-load.cpuprofile`), JSON.stringify(profile));
  }
  // Permit diagrams (desktop + fine pointer only).
  if (!prof.mobile) {
    const tp = await pnow(page);
    await page.evaluate(() => document.querySelector("[data-permit]")?.scrollIntoView({ block: "center", behavior: "instant" }));
    const okP = await waitMark(page, "canvas-ready", "permit", 180000);
    c = await collect(page);
    out.canvases.permit = { ok: okP, ...timeline(c, "permit", tp) };
  }
  c = await collect(page);
  const js3d = c.resources.filter((r) => is3d(TAGS[path.basename(r.name)]));
  out.bytes = {
    js3d: { files: js3d.map((r) => path.basename(r.name)), transfer: js3d.reduce((s, r) => s + r.transfer, 0), decoded: js3d.reduce((s, r) => s + r.decoded, 0) },
    glb: c.resources.filter((r) => r.name.includes(".glb")).map((r) => ({ name: r.name, transfer: r.transfer, decoded: r.decoded, ms: +(r.end - r.start).toFixed(0) })),
    allTransfer: c.resources.reduce((s, r) => s + r.transfer, 0),
  };
  out.webglContexts = c.contexts.map((x) => ({ id: x.id, kind: x.kind, attrs: x.attrs, draws: x.counts.draws, programsLinked: x.counts.linkProgram, shadersCompiled: x.counts.compileShader, bufferMB: +(x.counts.bufferBytes / 1048576).toFixed(2), texUploads: x.counts.texUploads }));
  out.renderers = c.renderers.map((r) => ({ kind: r.kind, frameloop: r.frameloop, dpr: r.pixelRatio, drawingBuffer: r.drawingBuffer, antialias: r.antialias, shadowMap: r.shadowMap, programs: r.programs, memory: r.memory, compiles: r.compiles, total: r.total }));
  out.workers = c.workers;
  out.reactCommits = c.reactCommits;
  out.longtasksAll = { n: c.longtasks.length, total: +c.longtasks.reduce((s, l) => s + l.dur, 0).toFixed(1), max: c.longtasks.length ? Math.max(...c.longtasks.map((l) => l.dur)) : 0 };
  out.errors = errors;
  await ctx.close();
  return out;
}

const BUILD_STATES = [
  { id: "s00-tomt", step: 0 },
  { id: "s03-bindingsverk", step: 3 },
  { id: "s05-tak", step: 5 },
  { id: "s08-installasjoner-xray", step: 8 },
  { id: "s09-interior-section", step: 9 },
  { id: "s10-nokkelferdig", step: 10 },
  { id: "s10-exploded", step: 10, exploded: true },
  { id: "s10-plan", step: 10, plan: true },
  { id: "s10-day", step: 10, day: true },
  { id: "s03-exploded", step: 3, exploded: true },
];

const QUICK_STATES = ["s00-tomt", "s08-installasjoner-xray", "s10-nokkelferdig", "s10-exploded", "s10-plan"];

async function scenarioStates(browser, name, prof) {
  const { ctx, page, errors } = await newPage(browser, prof, { snap: true });
  await page.goto(BASE + "/", { waitUntil: "load", timeout: 180000 });
  await page.waitForTimeout(1500);
  const out = { profile: name, hero: null, build: {}, permit: null };
  if (!prof.mobile) {
    await engageHero(page, prof);
    if (await waitMark(page, "canvas-ready", "hero", 240000)) {
      await page.waitForTimeout(1800); // fade-in
      await measureFrame(page, "hero", 1); // warm-up
      out.hero = (await measureFrame(page, "hero"))[0] ?? null;
      if (out.hero) out.hero.shot = await shot(page, `${name}-hero`);
    }
  }
  const g = await stageGeom(page);
  await scrollToY(page, g.start);
  const ok = await waitMark(page, "canvas-ready", "build", 300000);
  out.buildReady = ok;
  if (ok) {
    await page.waitForTimeout(1600);
    await measureFrame(page, "build", 1); // warm-up: first frames after ready upload/compile leftovers
    for (const st of BUILD_STATES.filter((x) => !QUICK || QUICK_STATES.includes(x.id))) {
      await setToggles(page, { exploded: false, plan: false, day: false });
      const step = await gotoStep(page, st.step);
      await setToggles(page, st);
      await quiet(page, 600);
      const m = (await measureFrame(page, "build"))[0] ?? null;
      if (m) {
        m.step = step;
        m.shot = await shot(page, `${name}-build-${st.id}`, "#slik-bygger-vi [data-stage]");
      }
      out.build[st.id] = m;
    }
    await setToggles(page, { exploded: false, plan: false, day: false });
  }
  if (!prof.mobile) {
    await page.evaluate(() => document.querySelector("[data-permit]")?.scrollIntoView({ block: "center", behavior: "instant" }));
    if (await waitMark(page, "canvas-ready", "permit", 180000)) {
      await page.waitForTimeout(1500);
      out.permit = (await measureFrame(page, "permit"))[0] ?? null;
      if (out.permit) out.permit.shot = await shot(page, `${name}-permit`, "[data-permit][data-ready]");
    }
  }
  const c = await collect(page);
  out.webglContexts = c.contexts.map((x) => ({ id: x.id, kind: x.kind, attrs: x.attrs, programsLinked: x.counts.linkProgram, bufferMB: +(x.counts.bufferBytes / 1048576).toFixed(2) }));
  out.errors = errors;
  await ctx.close();
  return out;
}

const MAX_REC_MS = Number(args.maxrec || 30000);
async function rec(page, fn, { cdp = null, maxMs = MAX_REC_MS } = {}) {
  const r0 = await page.evaluate(() => {
    window.__reactCommits && (window.__reactCommits.mark = window.__reactCommits.total, window.__reactCommits.markBy = { ...window.__reactCommits.byRenderer });
    window.__perf.startRec();
    return window.__perf.renderers.reduce((s, r) => s + r.total.renders, 0);
  });
  if (cdp) {
    await cdp.send("Profiler.enable");
    await cdp.send("Profiler.setSamplingInterval", { interval: 250 });
    await cdp.send("Profiler.start");
  }
  const t0 = Date.now();
  await fn();
  // Wait for the first frame the action causes (software GL can lag seconds), then for quiet.
  await page
    .waitForFunction((r0) => window.__perf.renderers.reduce((s, r) => s + r.total.renders, 0) > r0, r0, { timeout: 30000, polling: 50 })
    .catch(() => null);
  const left = Math.max(1000, maxMs - (Date.now() - t0));
  const waited = await quiet(page, 1000, left);
  const settled = waited < left - 50;
  let prof = null;
  if (cdp) {
    const { profile } = await cdp.send("Profiler.stop");
    prof = summarizeProfile(profile);
  }
  return page.evaluate(([settled, prof]) => {
    const r = window.__perf.stopRec();
    r.settled = settled;
    if (prof) r.cpuProfile = prof;
    const rc = window.__reactCommits;
    if (rc) {
      const by = {};
      for (const [k, v] of Object.entries(rc.byRenderer)) by[k] = v - ((rc.markBy && rc.markBy[k]) || 0);
      r.reactCommits = { total: rc.total - (rc.mark || 0), byRenderer: by };
    }
    return r;
  }, [settled, prof]);
}

async function scenarioScrub(browser, name, prof) {
  const { ctx, page, cdp, errors } = await newPage(browser, prof);
  await page.goto(BASE + "/", { waitUntil: "load", timeout: 180000 });
  await page.waitForTimeout(1500);
  const out = { profile: name, speedPxPerS: SPEED };
  // Load motion libs (first interaction) without starting the hero canvas: use a key press, not the mouse.
  await page.keyboard.press("Shift");
  await page.waitForTimeout(1500);
  const g = await stageGeom(page);
  await scrollToY(page, g.start);
  out.buildReady = await waitMark(page, "canvas-ready", "build", 300000);
  if (!out.buildReady) {
    out.errors = errors;
    await ctx.close();
    return out;
  }
  await page.waitForTimeout(1800);
  await gotoStep(page, 0);
  await quiet(page, 800);
  const dist = g.end - stepY(g, 0) - 10;
  out.scrollDistancePx = Math.round(dist);
  out.scrub = await rec(
    page,
    async () => {
    await cdp.send("Input.synthesizeScrollGesture", {
      x: Math.round(prof.viewport.width / 2),
      y: Math.round(prof.viewport.height / 2),
      yDistance: -Math.round(dist),
      speed: SPEED,
      // Headless touch gestures do not scroll; wheel gestures do (phones keep native scroll: no Lenis on coarse pointers).
      gestureSourceType: "mouse",
      preventFling: true,
    });
    },
    { cdp: args.cpuprofile ? cdp : null, maxMs: Number(args.maxscrub || 120000) },
  );
  out.scrub.endStep = await activeStep(page);
  // Toggle transitions at the finished house.
  await gotoStep(page, 10);
  await quiet(page, 800);
  for (const t of ["exploded", "plan"].filter((x) => ANIMS.includes(x))) {
    out[`${t}Anim`] = await rec(page, async () => {
      await page.locator(`#slik-bygger-vi ${SEL[t]}`).first().click({ force: true });
    });
    out[`${t}Back`] = await rec(page, async () => {
      await page.locator(`#slik-bygger-vi ${SEL[t]}`).first().click({ force: true });
    });
  }
  if (ANIMS.includes("day")) {
    out.dayAnim = await rec(page, async () => setToggles(page, { day: true }));
    out.blueAnim = await rec(page, async () => setToggles(page, { day: false }));
  }
  // Hero pointer parallax (desktop): canvas renders per pointer move.
  if (!prof.mobile && ANIMS.includes("hero")) {
    await scrollToY(page, 0);
    await page.waitForTimeout(800);
    await page.mouse.move(prof.viewport.width * 0.5, prof.viewport.height * 0.5);
    if (await waitMark(page, "canvas-ready", "hero", 240000)) {
      await page.waitForTimeout(1800);
      await quiet(page, 800);
      out.heroPointer = await rec(page, async () => {
        for (let i = 0; i < 12; i++) await page.mouse.move(prof.viewport.width * (0.3 + 0.4 * (i / 12)), prof.viewport.height * (0.45 + 0.1 * Math.sin(i / 2)));
      });
    }
  }
  out.errors = errors;
  await ctx.close();
  return out;
}

/** Fallbacks must keep working: reduced motion → gallery, no WebGL → gallery, poster LCP, no GLB before need. */
async function scenarioFallbacks(browser, name, prof) {
  const res = {};
  {
    const { ctx, page } = await newPage(browser, prof, { reducedMotion: "reduce" });
    await page.goto(BASE + "/", { waitUntil: "load", timeout: 180000 });
    await page.waitForTimeout(1200);
    await page.mouse.move(200, 200);
    const g = await stageGeom(page);
    if (g) await scrollToY(page, g.start);
    await page.evaluate(() => document.querySelector("#slik-bygger-vi")?.scrollIntoView({ behavior: "instant" }));
    await page.waitForTimeout(2500);
    const c = await collect(page);
    res.reducedMotion = {
      webglContexts: c.contexts.length,
      glbRequested: c.resources.some((r) => r.name.includes(".glb")),
      galleryVisible: await page.evaluate(() => {
        const s = document.querySelector("#slik-bygger-vi");
        return !!s && !s.querySelector("[data-stage]") && s.querySelectorAll("img").length > 0;
      }),
    };
    await ctx.close();
  }
  {
    const { ctx, page } = await newPage(browser, prof, { noWebGL: true });
    await page.goto(BASE + "/", { waitUntil: "load", timeout: 180000 });
    await page.waitForTimeout(1200);
    await page.mouse.move(300, 300);
    await page.waitForTimeout(3000);
    await page.evaluate(() => document.querySelector("#slik-bygger-vi")?.scrollIntoView({ behavior: "instant" }));
    await page.waitForTimeout(3000);
    const c = await collect(page);
    res.noWebGL = {
      glbRequested: c.resources.some((r) => r.name.includes(".glb")),
      stagePresent: await page.evaluate(() => !!document.querySelector("#slik-bygger-vi [data-stage]")),
      fallbackNote: await page.evaluate(() => (document.querySelector("#slik-bygger-vi")?.textContent || "").length),
      heroPosterImg: await page.evaluate(() => !!document.querySelector("picture img[fetchpriority=high]")),
    };
    await ctx.close();
  }
  {
    const { ctx, page } = await newPage(browser, prof);
    await page.goto(BASE + "/", { waitUntil: "load", timeout: 180000 });
    await page.waitForTimeout(2500);
    const c = await collect(page);
    res.coldIdle = {
      lcp: c.lcp,
      fcp: c.fcp,
      glbRequestedWithoutScroll: c.resources.some((r) => r.name.includes(".glb")),
      threeChunksWithoutScroll: c.resources.filter((r) => is3d(TAGS[path.basename(r.name)])).map((r) => path.basename(r.name)),
      webglContextsWithoutScroll: c.contexts.length,
    };
    await ctx.close();
  }
  return res;
}

/* ------------------------------------------------------------------ main */
const server = await startServer();
const browser = await chromium.launch({
  executablePath: args.chromium || undefined,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl"],
});
const summary = { label: LABEL, when: new Date().toISOString(), base: BASE, profiles: {} };
try {
  const ua = await browser.version();
  summary.chromium = ua;
  for (const name of PROFILE_NAMES) {
    const prof = PROFILES[name];
    if (!prof) throw new Error("unknown profile " + name);
    const result = { profile: name, config: prof };
    for (const sc of SCENARIOS) {
      const t0 = Date.now();
      process.stdout.write(`[${name}] ${sc} … `);
      try {
        if (sc === "load") result.load = await scenarioLoad(browser, name, prof);
        else if (sc === "states") result.states = await scenarioStates(browser, name, prof);
        else if (sc === "scrub") result.scrub = await scenarioScrub(browser, name, prof);
        else if (sc === "fallbacks") result.fallbacks = await scenarioFallbacks(browser, name, prof);
        console.log(`${((Date.now() - t0) / 1000).toFixed(0)}s`);
      } catch (e) {
        console.log("FAILED", String(e).slice(0, 300));
        result[sc] = { error: String(e).slice(0, 1000) };
      }
      fs.writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify(result, null, 2));
    }
    summary.profiles[name] = result;
  }
} finally {
  await browser.close();
  stopServer(server);
}
fs.writeFileSync(path.join(OUT, "summary.json"), JSON.stringify(summary, null, 2));
const { printSummary } = await import("./report.mjs");
printSummary(summary);
console.log(`\nwrote ${OUT}`);
