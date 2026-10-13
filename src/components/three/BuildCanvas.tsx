"use client";
/* eslint-disable react-hooks/immutability -- three.js objects (scene, renderer, camera, materials) are
   mutable by design; R3F mutates them in effects and useFrame, outside React's render. */

/**
 * The live "Slik bygger vi" canvas (lazy chunk). Reads build position and
 * toggles from the stage store, damps towards them every frame and renders
 * on demand only: nothing runs while the section is off screen or still.
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { buildSteps } from "@/content/build";
import type { BuildStepId } from "@/content/types";
import { HOUSE_GLB, houseMeta, type CameraPreset, type PointLightSpec } from "./lib/meta";
import { useModel } from "./lib/loader";
import { HouseRig } from "./lib/houseRig";
import {
  LightRig,
  cloneResolved,
  createSkyMesh,
  lerpResolved,
  resolvePreset,
  setSkyUniforms,
  skyEnvironment,
} from "./lib/lighting";
import { damp, lerpAngle, regionFit, smoothstep, toSpherical, easeInOutCubic } from "./lib/camera";
import { setBloom, usePostprocessing } from "./lib/postprocessing";
import type { StageStore } from "./lib/stageStore";

export type Quality = "high" | "low";

export interface BuildCanvasProps {
  store: StageStore;
  quality: Quality;
  onReady: () => void;
  onError: () => void;
}

/**
 * Test hook: automated screenshots under software WebGL (a frame can take
 * seconds) set window.__byggrvSnap3d = true to skip the damping.
 */
type TestWindow = Window & { __byggrvSnap3d?: boolean };

/** One exposure for every preset (presets fold their own exposure into light levels). */
const EXPOSURE = 1.2;
/** AgX renders the overcast day preset (authored for Neutral) a touch dull. */
const DAY_GAIN = 1.22;

/** The finished house at eye level (same camera as the step-nokkelferdig render). */
const STEP_CAMERAS: Record<BuildStepId, CameraPreset> = {
  ...houseMeta.camera.steps,
  nokkelferdig: { position: [4.6, 1.6, 19.5], target: [0.4, 1.6, 1.0], fov: 38, shift: [0.02, -0.2] },
};

function pickLights(list: PointLightSpec[], quality: Quality, keep: string[]) {
  if (quality === "high") return list;
  return list.filter((l) => keep.includes(l.room ?? l.name ?? ""));
}

interface CamState {
  sph: THREE.Spherical;
  target: THREE.Vector3;
  fov: number;
  shift: [number, number];
}

function camState(p: CameraPreset): CamState {
  return {
    sph: toSpherical(p.position, p.target),
    target: new THREE.Vector3(...p.target),
    fov: p.fov ?? 30,
    shift: p.shift ?? [0, 0],
  };
}

function BuildScene({ store, quality, onReady, onError, onSlow }: BuildCanvasProps & { onSlow: () => void }) {
  const gltf = useModel(HOUSE_GLB);
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const invalidate = useThree((s) => s.invalidate);
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);
  const perf = useRef({ sum: 0, n: 0 });

  const steps = houseMeta.steps;
  const N = steps.length;
  const L = houseMeta.lighting;

  const rig = useMemo(() => new HouseRig(gltf.scene, houseMeta, L.stage.envMaterials), [gltf.scene, L.stage.envMaterials]);
  const lights = useMemo(
    () =>
      new LightRig({
        interior: pickLights(houseMeta.interiorLights, quality, ["kjøkken", "stue", "soverom"]),
        exterior: pickLights(houseMeta.exteriorLights, quality, ["vegglampe terrasse", "vegglampe inngang"]),
        shadowMapSize: quality === "high" ? 2048 : 1024,
        shadowExtent: 17,
      }),
    [quality],
  );
  const sky = useMemo(() => createSkyMesh(), []);
  const fog = useMemo(() => new THREE.Fog("#000000", 30, 300), []);
  const presets = useMemo(() => {
    const day = resolvePreset({ ...L.day, exposure: L.day.exposure * DAY_GAIN }, { exposure: EXPOSURE });
    return {
      stage: resolvePreset(L.stage, { exposure: EXPOSURE, matchBackground: true }),
      blue: resolvePreset(L.bluehour, { exposure: EXPOSURE }),
      day,
    };
  }, [L]);
  const work = useMemo(() => ({ a: cloneResolved(presets.stage), b: cloneResolved(presets.stage) }), [presets]);
  const envMaps = useMemo(
    () => ({
      stage: skyEnvironment(gl, presets.stage.envSky),
      blue: skyEnvironment(gl, presets.blue.envSky),
      day: skyEnvironment(gl, presets.day.envSky),
    }),
    [gl, presets],
  );
  const post = usePostprocessing(quality === "high");

  const cams = useMemo(() => steps.map((id) => camState(STEP_CAMERAS[id])), [steps]);
  const hotspotLayers = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of buildSteps) for (const h of s.hotspots) m.set(`${s.id}:${h.id}`, h.layer);
    return m;
  }, []);

  // Scratch objects (no allocation per frame).
  const tmp = useMemo(
    () => ({
      target: new THREE.Vector3(),
      sph: new THREE.Spherical(),
      planSph: toSpherical([-6.5, 17.5, 9.5], [0, 0, 0]),
      offset: new THREE.Vector3(),
      p: new THREE.Vector3(),
      layerOff: new THREE.Vector3(),
    }),
    [],
  );

  const cur = useRef({
    t: store.targets.t,
    explode: 0,
    plan: 0,
    floorCut: houseMeta.cutHeights[0],
    day: store.targets.light === "day" ? 1 : 0,
    az: 0,
    el: 0,
    snap: true,
    last: 0,
    cont: false,
  });

  useEffect(() => {
    const prevFog = scene.fog;
    scene.fog = fog;
    scene.background = null;
    return () => {
      scene.fog = prevFog;
      scene.environment = null;
    };
  }, [scene, fog]);

  useEffect(() => store.onFrameRequest(() => invalidate()), [store, invalidate]);

  useEffect(
    () => () => {
      rig.dispose();
      sky.mesh.geometry.dispose();
      sky.mesh.material.dispose();
      envMaps.stage.dispose();
      envMaps.blue.dispose();
      envMaps.day.dispose();
    },
    [rig, sky, envMaps],
  );

  // Warm up every shader (ghosts and all layers included) before showing the canvas.
  useEffect(() => {
    let cancelled = false;
    const onLost = (e: Event) => {
      e.preventDefault();
      onError();
    };
    gl.domElement.addEventListener("webglcontextlost", onLost);
    (async () => {
      rig.showAllForCompile();
      try {
        await gl.compileAsync(scene, camera);
      } catch {
        // compileAsync is an optimisation; the first frame compiles anyway.
      }
      if (cancelled) return;
      store.setUi({ floors: houseMeta.floors.map((fl) => fl.name) });
      cur.current.snap = true;
      invalidate();
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (!cancelled) onReady();
        }),
      );
    })();
    return () => {
      cancelled = true;
      gl.domElement.removeEventListener("webglcontextlost", onLost);
    };
  }, [gl, scene, camera, rig, store, invalidate, onReady, onError]);

  useFrame((_, delta) => {
    const tg = store.targets;
    const c = cur.current;
    // Demand frameloop: the first frame after a pause gets a nominal step, not the whole pause.
    const now = performance.now();
    const consecutive = c.cont && now - c.last < 120;
    // A frame that continues an animation uses the real delta (capped); the
    // first frame after an idle pause gets a nominal step instead.
    const dt = c.cont ? Math.min(delta, 0.25) : 1 / 60;
    c.last = now;
    c.cont = false;
    // Adaptive resolution: if animated frames run slower than ~42 fps, step the pixel ratio down.
    if (consecutive) {
      perf.current.sum += delta;
      perf.current.n += 1;
      if (perf.current.n >= 45) {
        if (perf.current.sum / perf.current.n > 1 / 42 && dpr > 1) onSlow();
        perf.current = { sum: 0, n: 0 };
      }
    }
    if ((window as TestWindow).__byggrvSnap3d) c.snap = true;
    const planCutTarget = houseMeta.cutHeights[tg.floor] ?? houseMeta.cutHeights[0];
    if (c.snap) {
      c.t = tg.t;
      c.explode = tg.exploded ? 1 : 0;
      c.plan = tg.plan ? 1 : 0;
      c.floorCut = planCutTarget;
      c.day = tg.light === "day" ? 1 : 0;
      c.az = tg.dragAz;
      c.el = tg.dragEl;
      c.snap = false;
    }
    c.t = damp(c.t, tg.t, quality === "high" ? 4.2 : 5, dt);
    c.explode = damp(c.explode, tg.exploded ? 1 : 0, 2.6, dt);
    c.plan = damp(c.plan, tg.plan ? 1 : 0, 2.6, dt);
    c.floorCut = damp(c.floorCut, planCutTarget, 3.2, dt);
    c.day = damp(c.day, tg.light === "day" ? 1 : 0, 2.4, dt);
    c.az = damp(c.az, tg.dragAz, tg.dragging ? 10 : 2.2, dt);
    c.el = damp(c.el, tg.dragEl, tg.dragging ? 10 : 2.2, dt);
    const moving =
      Math.abs(c.t - tg.t) > 2e-4 ||
      Math.abs(c.explode - (tg.exploded ? 1 : 0)) > 1e-3 ||
      Math.abs(c.plan - (tg.plan ? 1 : 0)) > 1e-3 ||
      Math.abs(c.floorCut - planCutTarget) > 1e-3 ||
      Math.abs(c.day - (tg.light === "day" ? 1 : 0)) > 1e-3 ||
      Math.abs(c.az - tg.dragAz) > 1e-4 ||
      Math.abs(c.el - tg.dragEl) > 1e-4;

    /* Lighting: stage → blue hour as the house is finished; day on the toggle. */
    const nk = smoothstep(c.t - (N - 2));
    lerpResolved(work.a, presets.stage, presets.blue, nk);
    lerpResolved(work.b, work.a, presets.day, smoothstep(c.day));
    const lit = work.b;

    /* Model. */
    const frame = rig.update({
      t: c.t,
      explode: c.explode,
      plan: c.plan,
      planCut: c.floorCut,
      stageEnv: lit.stageEnv,
      lamps: lit.lamps,
      lineGain: quality === "high" ? 1 : 0.45,
    });
    // The section view is lit from inside (as in the step render).
    lights.apply(lit, 4 * (L.stage.exposure / EXPOSURE) * frame.section);
    setSkyUniforms(sky.uniforms, lit.sky);
    fog.color.copy(lit.fogColor);
    const wStage = (1 - nk) * (1 - c.day);
    const wBlue = nk * (1 - c.day);
    scene.environment = c.day >= Math.max(wStage, wBlue) ? envMaps.day.texture : wBlue > wStage ? envMaps.blue.texture : envMaps.stage.texture;
    scene.environmentIntensity = lit.envIntensity;
    gl.toneMappingExposure = lit.exposure;
    setBloom(
      post,
      lit.bloomStrength + (0.55 - lit.bloomStrength) * frame.xray,
      lit.bloomRadius + (0.45 - lit.bloomRadius) * frame.xray,
      lit.bloomThreshold + (0.6 - lit.bloomThreshold) * frame.xray,
    );

    /* Camera: glide between step presets on a sphere around the target. */
    const i0 = Math.min(N - 1, Math.max(0, Math.floor(c.t)));
    const i1 = Math.min(N - 1, i0 + 1);
    const f = c.t - i0;
    const A = cams[i0];
    const B = cams[i1];
    const target = tmp.target.lerpVectors(A.target, B.target, f);
    const sph = tmp.sph;
    sph.radius = A.sph.radius + (B.sph.radius - A.sph.radius) * f;
    sph.theta = lerpAngle(A.sph.theta, B.sph.theta, f);
    sph.phi = A.sph.phi + (B.sph.phi - A.sph.phi) * f;
    let fov = A.fov + (B.fov - A.fov) * f;
    let shiftX = A.shift[0] + (B.shift[0] - A.shift[0]) * f;
    let shiftY = A.shift[1] + (B.shift[1] - A.shift[1]) * f;

    const ex = easeInOutCubic(c.explode);
    sph.radius *= 1 + 0.24 * ex;
    target.y += 0.9 * ex;

    const pl = easeInOutCubic(c.plan);
    if (pl > 0) {
      const ps = tmp.planSph;
      sph.radius += (ps.radius * (1 + 0.15 * ex) - sph.radius) * pl;
      sph.theta = lerpAngle(sph.theta, ps.theta, pl);
      sph.phi += (ps.phi - sph.phi) * pl;
      target.x += (0.4 - target.x) * pl;
      target.y += (c.floorCut - 1.6 - target.y) * pl;
      target.z += (0.6 - target.z) * pl;
      fov += (32 - fov) * pl;
      shiftX *= 1 - pl;
      shiftY *= 1 - pl;
    }

    sph.theta += c.az;
    sph.phi = Math.min(1.52, Math.max(0.12, sph.phi - c.el));

    const fit = regionFit(size.width, size.height, store.region, fov, [shiftX, shiftY]);
    sph.radius *= fit.distScale;
    // Fog keeps its density relative to the house when the camera dollies back.
    fog.near = lit.fogNear * fit.distScale;
    fog.far = lit.fogFar * fit.distScale;
    camera.position.copy(target).add(tmp.offset.setFromSpherical(sph));
    camera.fov = fit.fov;
    camera.aspect = size.width / Math.max(1, size.height);
    camera.near = 0.5;
    camera.far = 4000;
    camera.setViewOffset(size.width, size.height, fit.offsetX, fit.offsetY, size.width, size.height);
    camera.lookAt(target);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();

    /* Hotspots of the active step (DOM buttons positioned in canvas pixels). */
    const active = store.getUi().active;
    const stepId = steps[active];
    const settled = Math.abs(c.t - active) < 0.16 && c.plan < 0.05;
    const r = store.region;
    for (const h of houseMeta.hotspots[stepId] ?? []) {
      const hs = store.hotspots.get(h.id);
      if (!hs || hs.step !== stepId) continue;
      const layer = hotspotLayers.get(`${stepId}:${h.id}`) ?? "";
      const p = tmp.p.set(...h.position);
      if (layer.startsWith("layer_")) p.add(rig.layerOffset(layer.slice(6) as BuildStepId, tmp.layerOff));
      p.project(camera);
      const x = ((p.x + 1) / 2) * size.width;
      const y = ((1 - p.y) / 2) * size.height;
      const inside = p.z < 1 && x > r.x - 8 && x < r.x + r.w + 8 && y > r.y - 8 && y < r.y + r.h + 8;
      hs.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      hs.el.dataset.visible = settled && inside ? "true" : "false";
    }

    // Off screen: settle at once on the next frame instead of animating unseen.
    if (!tg.visible) c.snap = true;
    else if (moving) {
      c.cont = true;
      invalidate();
    }
  });

  return (
    <>
      <primitive object={rig.root} />
      <primitive object={lights.group} />
      <primitive object={sky.mesh} />
    </>
  );
}

export default function BuildCanvas(props: BuildCanvasProps) {
  const { quality } = props;
  // Upper pixel-ratio bound; the scene lowers it when animated frames run slow.
  const [maxDpr, setMaxDpr] = useState(quality === "high" ? 1.75 : 1.5);
  const onSlow = useCallback(() => setMaxDpr((d) => Math.max(1, d - 0.25)), []);
  const glProps = useMemo(
    () => ({
      antialias: quality === "low",
      alpha: false,
      stencil: false,
      powerPreference: "high-performance" as const,
      toneMapping: THREE.AgXToneMapping,
      toneMappingExposure: EXPOSURE,
      localClippingEnabled: true,
    }),
    [quality],
  );
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, maxDpr]}
      gl={glProps}
      shadows="percentage"
      camera={{ fov: 30, near: 0.5, far: 4000, position: [-13, 12.5, 16] }}
      style={{ position: "absolute", inset: 0 }}
      aria-hidden="true"
    >
      <Suspense fallback={null}>
        <BuildScene {...props} onSlow={onSlow} />
      </Suspense>
    </Canvas>
  );
}
