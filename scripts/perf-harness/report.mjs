/**
 * Flatten + print run.mjs results. Imported by run.mjs and compare.mjs.
 *   node report.mjs <results/label/summary.json>      print one run
 */
import fs from "node:fs";

const r1 = (v) => (typeof v === "number" ? +v.toFixed(1) : v);

/** Flat { key: number } map of the headline metrics of one summary.json. */
export function flatten(summary) {
  const f = {};
  const put = (k, v) => {
    if (v !== undefined && v !== null && typeof v !== "object") f[k] = r1(v);
  };
  for (const [p, res] of Object.entries(summary.profiles || {})) {
    const L = res.load;
    if (L && !L.error) {
      put(`${p}.load.lcp_ms`, L.before3dTrigger?.lcp?.t);
      put(`${p}.load.preTrigger_longtask_ms`, L.before3dTrigger?.longtasksTotal);
      put(`${p}.load.js3d_transfer_KB`, L.bytes?.js3d?.transfer / 1024);
      put(`${p}.load.js3d_decoded_KB`, L.bytes?.js3d?.decoded / 1024);
      for (const g of L.bytes?.glb || []) put(`${p}.load.${g.name.split("/").pop()}_transfer_KB`, g.transfer / 1024);
      for (const [k, c] of Object.entries(L.canvases || {})) {
        const rt = c.relToTrigger || {};
        put(`${p}.load.${k}.chunksDone_ms`, rt.chunksDone);
        put(`${p}.load.${k}.glbStart_ms`, rt.glbStart);
        put(`${p}.load.${k}.glbEnd_ms`, rt.glbEnd);
        put(`${p}.load.${k}.sceneMounted_ms`, rt.sceneMounted_compileStart);
        put(`${p}.load.${k}.compileEnd_ms`, rt.compileEnd);
        put(`${p}.load.${k}.compile_ms`, c.compileMs);
        put(`${p}.load.${k}.firstFrame_ms`, rt.firstFrame);
        put(`${p}.load.${k}.firstFrameRender_ms`, c.firstFrameRenderMs);
        put(`${p}.load.${k}.ready_ms`, rt.ready);
        put(`${p}.load.${k}.lt_total_ms`, c.longtasks?.triggerToReady?.total);
        put(`${p}.load.${k}.links_beforeCompile`, c.programLinks?.beforeCompile);
        put(`${p}.load.${k}.links_inCompileAsync`, c.programLinks?.duringCompileAsync);
        put(`${p}.load.${k}.links_afterWarmup_lazy`, (c.programLinks?.afterCompileToReady ?? 0) + (c.programLinks?.afterReady ?? 0));
        put(`${p}.load.${k}.lt_max_ms`, c.longtasks?.triggerToReady?.max);
        put(`${p}.load.${k}.lt_parseMount_ms`, c.longtasks?.glbEndToCompileStart_parseMount?.total);
        put(`${p}.load.${k}.lt_compile_ms`, c.longtasks?.compile?.total);
        put(`${p}.load.${k}.lt_firstFrames_ms`, c.longtasks?.compileEndToReady_firstFrames?.total);
      }
      for (const w of L.webglContexts || []) {
        if (w.kind === "detached") continue;
        put(`${p}.load.ctx.${w.kind}.programsLinked`, w.programsLinked);
        put(`${p}.load.ctx.${w.kind}.bufferMB`, w.bufferMB);
      }
      put(`${p}.load.webglContexts`, (L.webglContexts || []).length);
    }
    const S = res.states;
    if (S && !S.error) {
      const one = (k, m) => {
        if (!m) return;
        const fr = m.mainFrames || Math.max(1, (m.threeInfo?.renders || 1) - (m.threeInfo?.postRenders || 0));
        put(`${p}.state.${k}.gl_draws_perFrame`, m.gl?.draws / fr);
        put(`${p}.state.${k}.gl_tris_perFrame`, m.gl?.tris / fr);
        put(`${p}.state.${k}.gl_useProgram_perFrame`, m.gl?.useProgram / fr);
        put(`${p}.state.${k}.gl_fbBinds_perFrame`, m.gl?.bindFramebuffer / fr);
        put(`${p}.state.${k}.postPasses_perFrame`, (m.threeInfo?.postRenders || 0) / fr);
        put(`${p}.state.${k}.renderCpu_perFrame_ms`, m.renderCpuMs / fr);
        if (m.gpuSyncMs?.length) put(`${p}.state.${k}.gpuSync_ms`, Math.min(...m.gpuSyncMs));
        if (m.frameCpuMs?.length) put(`${p}.state.${k}.frameCpu_ms`, Math.min(...m.frameCpuMs));
        put(`${p}.state.${k}.newPrograms`, m.newPrograms?.length);
        put(`${p}.state.${k}.programs`, m.describe?.programs);
        put(`${p}.state.${k}.visibleMeshes`, m.describe?.scene?.visibleMeshes);
        put(`${p}.state.${k}.castShadowVisible`, m.describe?.scene?.castShadowVisible);
        put(`${p}.state.${k}.transparentVisible`, m.describe?.scene?.transparentVisible);
        put(`${p}.state.${k}.visibleTris`, m.describe?.scene?.visibleTris);
        put(`${p}.state.${k}.materialsVisible`, m.describe?.scene?.materialsVisible);
        put(`${p}.state.${k}.pixelRatio`, m.describe?.pixelRatio);
        put(`${p}.state.${k}.geometries`, m.describe?.memory?.geometries);
      };
      one("hero", S.hero);
      for (const [k, m] of Object.entries(S.build || {})) one(`build.${k}`, m);
      one("permit", S.permit);
    }
    const X = res.scrub;
    if (X && !X.error) {
      for (const k of ["scrub", "explodedAnim", "explodedBack", "planAnim", "planBack", "dayAnim", "blueAnim", "heroPointer"]) {
        const m = X[k];
        if (!m) continue;
        put(`${p}.anim.${k}.raf_median_ms`, m.rafDelta?.median);
        put(`${p}.anim.${k}.raf_p95_ms`, m.rafDelta?.p95);
        put(`${p}.anim.${k}.raf_max_ms`, m.rafDelta?.max);
        put(`${p}.anim.${k}.frames`, m.rafDelta?.n);
        put(`${p}.anim.${k}.over50`, m.framesOver50);
        put(`${p}.anim.${k}.cbCpu_median_ms`, m.rafCallbackCpu?.median);
        put(`${p}.anim.${k}.cbCpu_p95_ms`, m.rafCallbackCpu?.p95);
        put(`${p}.anim.${k}.longtask_total_ms`, m.longtasks?.total);
        const kind = k === "heroPointer" ? "hero" : "build";
        const rr = (m.renderers || []).filter((r) => r.kind === kind);
        const renders = rr.reduce((s, r) => s + r.renders - r.postRenders, 0);
        const cpu = rr.reduce((s, r) => s + r.cpu, 0);
        put(`${p}.anim.${k}.frames3d`, renders);
        put(`${p}.anim.${k}.renderCpu_per3dFrame_ms`, renders ? cpu / renders : null);
        put(`${p}.anim.${k}.draws_per3dFrame`, renders ? m.gl?.draws / renders : null);
        put(`${p}.anim.${k}.reactCommits`, m.reactCommits?.total);
        put(`${p}.anim.${k}.newPrograms`, m.newPrograms?.length);
        put(`${p}.anim.${k}.settled`, m.settled === undefined ? undefined : m.settled ? 1 : 0);
        put(`${p}.anim.${k}.ms`, m.ms);
      }
    }
    const F = res.fallbacks;
    if (F && !F.error) {
      put(`${p}.fallback.reducedMotion.webglContexts`, F.reducedMotion?.webglContexts);
      put(`${p}.fallback.reducedMotion.glbRequested`, F.reducedMotion?.glbRequested ? 1 : 0);
      put(`${p}.fallback.reducedMotion.galleryVisible`, F.reducedMotion?.galleryVisible ? 1 : 0);
      put(`${p}.fallback.noWebGL.glbRequested`, F.noWebGL?.glbRequested ? 1 : 0);
      put(`${p}.fallback.noWebGL.stagePresent`, F.noWebGL?.stagePresent ? 1 : 0);
      put(`${p}.fallback.noWebGL.heroPosterImg`, F.noWebGL?.heroPosterImg ? 1 : 0);
      put(`${p}.fallback.coldIdle.lcp_ms`, F.coldIdle?.lcp?.t);
      put(`${p}.fallback.coldIdle.glbWithoutScroll`, F.coldIdle?.glbRequestedWithoutScroll ? 1 : 0);
      put(`${p}.fallback.coldIdle.webglContextsWithoutScroll`, F.coldIdle?.webglContextsWithoutScroll);
    }
  }
  return f;
}

export function printSummary(summary) {
  const f = flatten(summary);
  const keys = Object.keys(f);
  let prev = "";
  for (const k of keys) {
    const sect = k.split(".").slice(0, 3).join(".");
    if (sect !== prev) {
      console.log("");
      prev = sect;
    }
    console.log(`${k.padEnd(64)} ${String(f[k]).padStart(10)}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  printSummary(JSON.parse(fs.readFileSync(process.argv[2], "utf8")));
}
