/*
 * In-page instrumentation (Playwright addInitScript). Renderer-agnostic and
 * read-only: it observes, never changes behaviour.
 *
 *  - window.__THREE_DEVTOOLS__ (three's own hook) → every WebGLRenderer and
 *    Scene instance; render()/compile()/compileAsync() are wrapped to time
 *    them and accumulate renderer.info per call.
 *  - WebGL(2)RenderingContext.prototype draw/program/texture/buffer calls are
 *    counted (true GPU submissions incl. shadow, bloom, PMREM passes).
 *  - Worker messages (meshopt decoder workers), long tasks, LCP, rAF callback
 *    CPU per frame, and canvas "ready" (wrapper fades to opacity-100 /
 *    [data-ready]) are timestamped in page time (performance.now()).
 *
 * Everything lives on window.__perf.
 */
(() => {
  if (window.__perf) return;
  const now = () => performance.now();
  const P = (window.__perf = {
    marks: [],
    longtasks: [],
    lcp: null,
    fcp: null,
    renderers: [],
    scenes: [],
    contexts: [],
    workers: { created: 0, posted: 0, messages: 0, firstPost: null, lastMessage: null, log: [] },
    rec: null,
  });
  const mark = (name, detail) => P.marks.push({ name, t: now(), detail: detail ?? null });
  P.mark = mark;

  /* ---------- paint / long tasks ---------- */
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) P.longtasks.push({ start: e.startTime, dur: e.duration });
    }).observe({ type: "longtask", buffered: true });
  } catch {}
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) P.lcp = { t: e.startTime, size: e.size, tag: e.element ? e.element.tagName : null, url: e.url || null };
    }).observe({ type: "largest-contentful-paint", buffered: true });
  } catch {}
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) if (e.name === "first-contentful-paint") P.fcp = e.startTime;
    }).observe({ type: "paint", buffered: true });
  } catch {}

  /* ---------- GL call counters ---------- */
  const C = () => ({ draws: 0, tris: 0, instances: 0, useProgram: 0, linkProgram: 0, compileShader: 0, texUploads: 0, bufferData: 0, bufferBytes: 0, bindFramebuffer: 0, clears: 0 });
  P.glTotal = C();
  P.glWin = C();
  const ctxIds = new WeakMap();
  const canvasOf = new WeakMap();
  const origGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, attrs) {
    const ctx = origGetContext.call(this, type, attrs);
    if (ctx && /webgl/i.test(String(type)) && !ctxIds.has(ctx)) {
      const id = P.contexts.length;
      ctxIds.set(ctx, id);
      canvasOf.set(ctx, this);
      P.contexts.push({ id, type, t: now(), attrs: attrs ? { ...attrs } : null, counts: C(), canvas: this });
      mark("webgl-context", { id, type });
    }
    return ctx;
  };
  const bump = (ctx, k, n = 1) => {
    P.glTotal[k] += n;
    P.glWin[k] += n;
    const id = ctxIds.get(ctx);
    if (id !== undefined) P.contexts[id].counts[k] += n;
  };
  const tri = (mode, count, inst = 1) => (mode === 4 ? (count / 3) * inst : mode === 5 || mode === 6 ? Math.max(0, count - 2) * inst : 0);
  const wrap = (proto, name, fn) => {
    const o = proto && proto[name];
    if (typeof o !== "function") return;
    proto[name] = function (...a) {
      try {
        fn(this, a);
      } catch {}
      return o.apply(this, a);
    };
  };
  for (const proto of [window.WebGLRenderingContext && WebGLRenderingContext.prototype, window.WebGL2RenderingContext && WebGL2RenderingContext.prototype]) {
    if (!proto) continue;
    wrap(proto, "drawElements", (c, [m, n]) => (bump(c, "draws"), bump(c, "tris", tri(m, n))));
    wrap(proto, "drawArrays", (c, [m, , n]) => (bump(c, "draws"), bump(c, "tris", tri(m, n))));
    wrap(proto, "drawRangeElements", (c, [m, , , n]) => (bump(c, "draws"), bump(c, "tris", tri(m, n))));
    wrap(proto, "drawElementsInstanced", (c, [m, n, , , i]) => (bump(c, "draws"), bump(c, "instances", i), bump(c, "tris", tri(m, n, i))));
    wrap(proto, "drawArraysInstanced", (c, [m, , n, i]) => (bump(c, "draws"), bump(c, "instances", i), bump(c, "tris", tri(m, n, i))));
    wrap(proto, "useProgram", (c) => bump(c, "useProgram"));
    wrap(proto, "linkProgram", (c) => {
      bump(c, "linkProgram");
      const id = ctxIds.get(c);
      (P.links = P.links || []).push({ t: now(), ctx: id === undefined ? -1 : id });
    });
    wrap(proto, "compileShader", (c) => bump(c, "compileShader"));
    for (const t of ["texImage2D", "texSubImage2D", "texStorage2D", "texImage3D", "texStorage3D"]) wrap(proto, t, (c) => bump(c, "texUploads"));
    wrap(proto, "bufferData", (c, [, d]) => (bump(c, "bufferData"), bump(c, "bufferBytes", typeof d === "number" ? d : d && d.byteLength ? d.byteLength : 0)));
    wrap(proto, "bufferSubData", (c, [, , d]) => bump(c, "bufferBytes", d && d.byteLength ? d.byteLength : 0));
    wrap(proto, "bindFramebuffer", (c) => bump(c, "bindFramebuffer"));
    wrap(proto, "clear", (c) => bump(c, "clears"));
  }

  /* ---------- Workers (meshopt decoder) ---------- */
  const OrigWorker = window.Worker;
  if (OrigWorker) {
    window.Worker = function (...a) {
      const w = new OrigWorker(...a);
      P.workers.created++;
      mark("worker-created");
      const op = w.postMessage.bind(w);
      w.postMessage = (...m) => {
        P.workers.posted++;
        if (P.workers.firstPost === null) P.workers.firstPost = now();
        return op(...m);
      };
      w.addEventListener("message", () => {
        P.workers.messages++;
        P.workers.lastMessage = now();
      });
      return w;
    };
    window.Worker.prototype = OrigWorker.prototype;
  }

  /* ---------- three.js devtools hook ---------- */
  const kindOf = (canvas) => {
    if (!canvas || !canvas.isConnected) return "detached";
    if (canvas.closest("#slik-bygger-vi")) return "build";
    const p = canvas.closest("[data-permit]");
    if (p) return "permit:" + p.getAttribute("data-permit");
    return "hero";
  };
  P.kindOf = kindOf;
  const W = () => ({ renders: 0, sceneRenders: 0, postRenders: 0, mainToTarget: 0, calls: 0, triangles: 0, lines: 0, points: 0, cpu: 0, cpuMax: 0, mainCpu: 0 });
  const countObjects = (o) => {
    let n = 0;
    o.traverse(() => n++);
    return n;
  };
  function hookRenderer(r) {
    const rec = { id: P.renderers.length, r, created: now(), mainScene: null, mainSize: 0, firstMainRender: null, firstMainAfterCompile: null, compiles: [], total: W(), win: W(), kind: null };
    P.renderers.push(rec);
    mark("renderer-created", { id: rec.id });
    const oRender = r.render;
    r.render = function (scene, camera) {
      const t0 = now();
      const res = oRender.call(this, scene, camera);
      const d = now() - t0;
      const info = this.info.render;
      let isMain = false;
      if (scene && scene.isScene) {
        if (scene === rec.mainScene) isMain = true;
        else if (scene.children.length >= 2) {
          const n = countObjects(scene);
          if (n > rec.mainSize) {
            rec.mainSize = n;
            rec.mainScene = scene;
            isMain = true;
          }
        }
      }
      for (const w of [rec.total, rec.win]) {
        w.renders++;
        if (scene && scene.isScene) w.sceneRenders++;
        if (!isMain) w.postRenders++;
        w.calls += info.calls;
        w.triangles += info.triangles;
        w.lines += info.lines;
        w.points += info.points;
        w.cpu += d;
        if (d > w.cpuMax) w.cpuMax = d;
        if (isMain) {
          w.mainCpu += d;
          if (this.getRenderTarget && this.getRenderTarget() !== null) w.mainToTarget++;
        }
      }
      if (P.gpuProbe && !rec.probeQueued) {
        rec.probeQueued = true;
        const gl = this.getContext();
        const r0 = performance.now();
        queueMicrotask(() => {
          const t1 = performance.now();
          try {
            gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
          } catch {}
          const t2 = performance.now();
          rec.probeQueued = false;
          (P.gpuSamples = P.gpuSamples || []).push({ id: rec.id, cpuFrameMs: t1 - r0, syncMs: t2 - t1 });
        });
      }
      if (isMain) {
        if (rec.firstMainRender === null) {
          rec.firstMainRender = t0;
          mark("first-main-render", { id: rec.id, kind: kindOf(this.domElement) });
        }
        if (rec.firstMainAfterCompile === null && rec.compiles.some((c) => c.end !== null)) {
          rec.firstMainAfterCompile = { t: t0, dur: d };
          mark("first-frame-after-compile", { id: rec.id, kind: kindOf(this.domElement), ms: d });
        }
      }
      return res;
    };
    // The composer renders the main scene to a target via RenderPass; it still counts as main.
    const oCompileAsync = r.compileAsync;
    if (typeof oCompileAsync === "function") {
      r.compileAsync = async function (...a) {
        const c = { start: now(), end: null, syncMs: null, programsBefore: this.info.programs ? this.info.programs.length : 0, programsAfter: null };
        rec.compiles.push(c);
        mark("compileAsync-start", { id: rec.id, kind: kindOf(this.domElement) });
        try {
          return await oCompileAsync.apply(this, a);
        } finally {
          c.end = now();
          c.programsAfter = this.info.programs ? this.info.programs.length : null;
          mark("compileAsync-end", { id: rec.id, kind: kindOf(this.domElement), ms: c.end - c.start });
        }
      };
    }
    const oCompile = r.compile;
    if (typeof oCompile === "function") {
      r.compile = function (...a) {
        const t0 = now();
        const res = oCompile.apply(this, a);
        const c = rec.compiles[rec.compiles.length - 1];
        if (c && c.syncMs === null) c.syncMs = now() - t0;
        return res;
      };
    }
  }
  const dev = new EventTarget();
  try {
    Object.defineProperty(window, "__THREE_DEVTOOLS__", { value: dev, configurable: true, writable: true });
  } catch {
    window.__THREE_DEVTOOLS__ = dev;
  }
  dev.addEventListener("observe", (e) => {
    const o = e.detail;
    if (!o) return;
    if (o.isWebGLRenderer) hookRenderer(o);
    else if (o.isScene) P.scenes.push(o);
    else if (o.manager !== undefined && typeof o.load === "function") mark("loader-created", { type: o.constructor && o.constructor.name });
  });
  dev.addEventListener("register", (e) => (P.threeRevision = e.detail && e.detail.revision));

  /* ---------- canvas ready (wrapper → opacity-100, permit [data-ready]) ---------- */
  const readySeen = new Set();
  const checkReady = (el) => {
    if (!(el instanceof Element)) return;
    let kind = null;
    if (el.hasAttribute("data-permit") && el.hasAttribute("data-ready")) kind = "permit:" + el.getAttribute("data-permit");
    else if (el.classList.contains("opacity-100") && el.classList.contains("absolute")) {
      const cv = el.querySelector("canvas");
      if (cv) kind = kindOf(cv);
    }
    if (kind && !readySeen.has(kind)) {
      readySeen.add(kind);
      mark("canvas-ready", { kind });
    }
  };
  const startMO = () => {
    new MutationObserver((recs) => {
      for (const m of recs) if (m.type === "attributes") checkReady(m.target);
    }).observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ["class", "data-ready"] });
  };
  if (document.documentElement) startMO();
  else document.addEventListener("DOMContentLoaded", startMO);

  /* ---------- rAF callback CPU per frame ---------- */
  const oRaf = window.requestAnimationFrame.bind(window);
  let frame = null;
  window.requestAnimationFrame = (cb) =>
    oRaf((ts) => {
      const t0 = now();
      try {
        cb(ts);
      } finally {
        if (P.rec) {
          if (!frame || frame.ts !== ts) {
            frame = { ts, cpu: 0, cbs: 0 };
            P.rec.cbFrames.push(frame);
          }
          frame.cpu += now() - t0;
          frame.cbs++;
        }
      }
    });

  /* ---------- measurement windows ---------- */
  P.resetWin = () => {
    for (const k of Object.keys(P.glWin)) P.glWin[k] = 0;
    for (const rec of P.renderers) rec.win = W();
  };
  /** Start recording vsync deltas + per-frame rAF CPU. */
  P.startRec = () => {
    P.resetWin();
    const rec = { start: now(), deltas: [], last: null, cbFrames: [], stop: false, progs: P.programKeys() };
    P.rec = rec;
    const loop = (ts) => {
      if (rec.stop) return;
      if (rec.last !== null) rec.deltas.push(ts - rec.last);
      rec.last = ts;
      oRaf(loop);
    };
    oRaf(loop);
    return true;
  };
  const q = (arr, p) => {
    if (!arr.length) return null;
    const s = [...arr].sort((a, b) => a - b);
    return +s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))].toFixed(2);
  };
  P.stats = (arr) => ({ n: arr.length, median: q(arr, 0.5), p95: q(arr, 0.95), max: arr.length ? +Math.max(...arr).toFixed(2) : null, mean: arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : null });
  P.stopRec = () => {
    const rec = P.rec;
    if (!rec) return null;
    rec.stop = true;
    P.rec = null;
    const end = now();
    const lt = P.longtasks.filter((l) => l.start >= rec.start && l.start <= end);
    const cbCpu = rec.cbFrames.map((f) => f.cpu);
    return {
      ms: +(end - rec.start).toFixed(1),
      rafDelta: P.stats(rec.deltas),
      framesOver33: rec.deltas.filter((d) => d > 33.4).length,
      framesOver50: rec.deltas.filter((d) => d > 50).length,
      rafCallbackCpu: P.stats(cbCpu),
      longtasks: { n: lt.length, total: +lt.reduce((s, l) => s + l.dur, 0).toFixed(1), max: lt.length ? +Math.max(...lt.map((l) => l.dur)).toFixed(1) : 0 },
      gl: { ...P.glWin },
      renderers: P.renderers.map((r) => ({ id: r.id, kind: kindOf(r.r.domElement), ...roundW(r.win) })),
      newPrograms: P.newPrograms(rec.progs),
    };
  };
  const roundW = (w) => Object.fromEntries(Object.entries(w).map(([k, v]) => [k, typeof v === "number" ? +v.toFixed(2) : v]));

  /** Program cache keys per renderer (to list programs compiled lazily inside a window). */
  P.programKeys = () => P.renderers.map((rec) => (rec.r.info.programs || []).map((p) => p.cacheKey));
  P.newPrograms = (before) =>
    P.renderers.flatMap((rec, i) => {
      const old = new Set((before && before[i]) || []);
      return (rec.r.info.programs || []).filter((p) => !old.has(p.cacheKey)).map((p) => ({ kind: kindOf(rec.r.domElement), name: p.name, key: String(p.cacheKey).slice(0, 160) }));
    });

  /** Frames R3F still owes (demand loop): 0 everywhere = nothing scheduled. */
  P.pendingFrames = () => {
    let n = 0;
    for (const sc of P.scenes) {
      const st = sc.__r3f && sc.__r3f.root && sc.__r3f.root.getState && sc.__r3f.root.getState();
      if (st && st.internal && st.internal.active) n += st.frameloop === "always" ? 1 : st.internal.frames || 0;
    }
    return n;
  };
  P.totalRenders = () => P.renderers.reduce((s, r) => s + r.total.renders, 0);
  /** Resolve once no R3F frame is pending and nothing rendered for `ms` (or after `max`). */
  P.quiet = async (ms = 500, max = 60000) => {
    const t0 = now();
    let last = P.totalRenders();
    let since = now();
    while (now() - t0 < max) {
      await new Promise((r) => setTimeout(r, 50));
      const n = P.totalRenders();
      if (n !== last || P.pendingFrames() > 0) {
        last = n;
        since = now();
      } else if (now() - since >= ms) break;
    }
    return now() - t0;
  };

  /** Block until every live context has finished its queued GPU work (1-px readPixels each). */
  P.drainGpu = () => {
    const t0 = now();
    for (const rec of P.renderers) {
      try {
        const gl = rec.r.getContext();
        if (gl.isContextLost && gl.isContextLost()) continue;
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
      } catch {}
    }
    return now() - t0;
  };

  /** Ask every R3F root for a frame (frameloop "demand"). */
  P.invalidateAll = () => {
    let n = 0;
    for (const s of P.scenes) {
      const st = s.__r3f && s.__r3f.root && s.__r3f.root.getState && s.__r3f.root.getState();
      if (st && st.invalidate) {
        st.invalidate();
        n++;
      }
    }
    return n;
  };
  P.r3fState = (rec) => {
    for (const s of P.scenes) {
      const st = s.__r3f && s.__r3f.root && s.__r3f.root.getState && s.__r3f.root.getState();
      if (st && st.gl === rec.r) return st;
    }
    return null;
  };

  /** Static description of what a renderer is drawing right now. */
  P.describe = (rec) => {
    const r = rec.r;
    const scene = rec.mainScene;
    const st = P.r3fState(rec);
    const gl = r.getContext();
    const attrs = gl.getContextAttributes ? gl.getContextAttributes() : {};
    const s = { objects: 0, meshes: 0, visibleMeshes: 0, castShadowVisible: 0, receiveShadowVisible: 0, transparentVisible: 0, ghostVisible: 0, doubleSideVisible: 0, clippedVisible: 0, visibleTris: 0, lineSegmentsVisible: 0, materialsAll: 0, materialsVisible: 0, geometries: 0, lights: {}, lightsVisible: {}, shadowCasters: [], fog: !!(scene && scene.fog), environment: !!(scene && scene.environment) };
    if (scene) {
      const mats = new Set();
      const vmats = new Set();
      const geos = new Set();
      const walk = (o, vis) => {
        s.objects++;
        const v = vis && o.visible;
        if (o.isLight) {
          s.lights[o.type] = (s.lights[o.type] || 0) + 1;
          if (v) s.lightsVisible[o.type] = (s.lightsVisible[o.type] || 0) + 1;
          if (o.castShadow && v && o.shadow) s.shadowCasters.push({ type: o.type, mapSize: o.shadow.mapSize.x, radius: o.shadow.radius, autoUpdate: o.shadow.autoUpdate });
        }
        if (o.isMesh || o.isLine || o.isPoints) {
          s.meshes++;
          const ms = Array.isArray(o.material) ? o.material : [o.material];
          ms.forEach((m) => mats.add(m));
          geos.add(o.geometry);
          if (v) {
            if (o.isLineSegments) s.lineSegmentsVisible++;
            s.visibleMeshes++;
            ms.forEach((m) => {
              vmats.add(m);
            });
            if (ms.some((m) => m.clippingPlanes && m.clippingPlanes.length)) s.clippedVisible++;
            if (ms.some((m) => m.side === 2)) s.doubleSideVisible++;
            if (o.castShadow) s.castShadowVisible++;
            if (o.receiveShadow) s.receiveShadowVisible++;
            if (ms.some((m) => m.transparent)) s.transparentVisible++;
            if (o.name && o.name.endsWith("__ghost")) s.ghostVisible++;
            if (o.isMesh && o.geometry) {
              const g = o.geometry;
              const n = g.index ? g.index.count : g.attributes.position ? g.attributes.position.count : 0;
              s.visibleTris += n / 3;
            }
          }
        }
        for (const c of o.children) walk(c, v);
      };
      walk(scene, true);
      s.materialsAll = mats.size;
      s.materialsVisible = vmats.size;
      s.geometries = geos.size;
      s.visibleTris = Math.round(s.visibleTris);
    }
    const programs = r.info.programs || [];
    const progNames = {};
    for (const p of programs) progNames[p.name] = (progNames[p.name] || 0) + 1;
    return {
      id: rec.id,
      kind: kindOf(r.domElement),
      frameloop: st ? st.frameloop : null,
      r3fDpr: st ? st.viewport && st.viewport.dpr : null,
      r3fDprRange: st ? st.performance && null : null,
      size: st ? { w: st.size.width, h: st.size.height } : null,
      pixelRatio: r.getPixelRatio(),
      drawingBuffer: { w: gl.drawingBufferWidth, h: gl.drawingBufferHeight },
      antialias: attrs.antialias,
      webgl2: typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext,
      toneMapping: r.toneMapping,
      shadowMap: { enabled: r.shadowMap.enabled, type: r.shadowMap.type, autoUpdate: r.shadowMap.autoUpdate },
      localClippingEnabled: r.localClippingEnabled,
      programs: programs.length,
      programNames: progNames,
      memory: { ...r.info.memory },
      scene: s,
      compiles: rec.compiles.map((c) => ({ ms: c.end ? +(c.end - c.start).toFixed(1) : null, syncMs: c.syncMs !== null ? +c.syncMs.toFixed(1) : null, programsBefore: c.programsBefore, programsAfter: c.programsAfter })),
      total: roundW(rec.total),
    };
  };
  P.describeAll = () => P.renderers.map((r) => P.describe(r));
})();
