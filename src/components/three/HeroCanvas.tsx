"use client";
/* eslint-disable react-hooks/immutability -- three.js objects (scene, renderer, camera, materials) are
   mutable by design; R3F mutates them in effects and useFrame, outside React's render. */

/**
 * Live hero canvas (lazy chunk, desktop only): the finished reference house
 * at blue hour, framed exactly like the poster underneath it so the fade-in
 * is seamless. Renders on demand: a frame per drag/pointer/scroll change.
 */
import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { HOUSE_GLB, houseMeta } from "./lib/meta";
import { useModel } from "./lib/loader";
import { LightRig, createSkyMesh, resolvePreset, setSkyUniforms, skyEnvironment } from "./lib/lighting";
import { coverView, damp, toSpherical } from "./lib/camera";
import { setBloom, usePostprocessing } from "./lib/postprocessing";
import { createInputStore, type InputStore } from "./lib/inputStore";

export interface HeroInputState {
  /** Drag targets (radians). */
  az: number;
  el: number;
  /** Pointer position over the hero, −1…1. */
  px: number;
  py: number;
  /** Scroll progress through the hero, 0…1. */
  scroll: number;
  dragging: boolean;
  /** Hero on screen; off screen the canvas settles at once and stops. */
  visible: boolean;
}

export type HeroInput = InputStore<HeroInputState>;

export function createHeroInput(): HeroInput {
  return createInputStore<HeroInputState>({ az: 0, el: 0, px: 0, py: 0, scroll: 0, dragging: false, visible: true });
}

export interface HeroCanvasProps {
  input: HeroInput;
  onReady: () => void;
  onError: () => void;
}

const NO_CAST = new Set(["glass", "hill", "lamp_glow", "plan_line", "string_line"]);
const NO_RECEIVE = new Set(["hill", "lamp_glow"]);

/** The finished house: every layer, no construction parts, lines hidden in the walls. */
function prepareFinished(source: THREE.Object3D, lampLevel: number) {
  const root = source.clone(true);
  const owned: THREE.Material[] = [];
  root.traverse((o) => {
    if (o.userData?.hideFrom) o.visible = false;
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    const name = mat.name;
    mesh.castShadow = !NO_CAST.has(name);
    mesh.receiveShadow = !NO_RECEIVE.has(name);
    if (name === "el_line" || name === "vvs_line" || name === "lamp_glow" || name === "glass" || name === "hill") {
      const m = mat.clone();
      owned.push(m);
      if (name === "el_line" || name === "vvs_line") {
        m.emissive.set("#000000");
        m.color.set(name === "el_line" ? "#5a5a58" : "#8d9497");
      }
      if (name === "lamp_glow") m.emissiveIntensity = mat.emissiveIntensity * lampLevel;
      if (name === "glass") {
        m.depthWrite = false;
        mesh.renderOrder = 2;
      }
      if (name === "hill") m.fog = true;
      mesh.material = m;
    }
  });
  return { root, owned };
}

function HeroScene({ input, onReady, onError }: HeroCanvasProps) {
  const gltf = useModel(HOUSE_GLB);
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);

  const preset = houseMeta.lighting.bluehour;
  const lit = useMemo(() => resolvePreset(preset), [preset]);
  const model = useMemo(() => prepareFinished(gltf.scene, lit.lamps), [gltf.scene, lit.lamps]);
  const lights = useMemo(() => {
    const rig = new LightRig({
      interior: houseMeta.interiorLights,
      exterior: houseMeta.exteriorLights,
      shadowMapSize: 2048,
      shadowExtent: 16,
    });
    rig.apply(lit);
    return rig;
  }, [lit]);
  const sky = useMemo(() => {
    const s = createSkyMesh();
    setSkyUniforms(s.uniforms, lit.sky);
    return s;
  }, [lit]);
  const env = useMemo(() => skyEnvironment(gl, lit.envSky), [gl, lit]);
  const fog = useMemo(() => new THREE.Fog(lit.fogColor, lit.fogNear, lit.fogFar), [lit]);
  const post = usePostprocessing(true);

  const base = useMemo(() => {
    const c = houseMeta.camera.hero;
    return { sph: toSpherical(c.position, c.target), target: new THREE.Vector3(...c.target), preset: c };
  }, []);
  const cur = useRef({ az: 0, el: 0, px: 0, py: 0, scroll: 0, cont: false });
  const tmp = useMemo(() => ({ sph: new THREE.Spherical(), v: new THREE.Vector3() }), []);

  useEffect(() => {
    scene.fog = fog;
    scene.environment = env.texture;
    scene.environmentIntensity = lit.envIntensity;
    scene.background = null;
    gl.toneMappingExposure = lit.exposure;
    // The scene is static: render the shadow map once, not every frame.
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
    return () => {
      scene.fog = null;
      scene.environment = null;
    };
  }, [scene, gl, fog, env, lit]);

  useEffect(() => input.subscribe(() => invalidate()), [input, invalidate]);

  useEffect(
    () => () => {
      model.owned.forEach((m) => m.dispose());
      sky.mesh.geometry.dispose();
      sky.mesh.material.dispose();
      env.dispose();
    },
    [model, sky, env],
  );

  useEffect(() => {
    let cancelled = false;
    const onLost = (e: Event) => {
      e.preventDefault();
      onError();
    };
    gl.domElement.addEventListener("webglcontextlost", onLost);
    (async () => {
      try {
        await gl.compileAsync(scene, camera);
      } catch {
        // optimisation only
      }
      if (cancelled) return;
      gl.shadowMap.needsUpdate = true;
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
  }, [gl, scene, camera, invalidate, onReady, onError]);

  useEffect(() => {
    setBloom(post, lit.bloomStrength, lit.bloomRadius, lit.bloomThreshold);
  }, [post, lit]);

  useFrame((_, delta) => {
    const c = cur.current;
    // Continuations use the real delta (capped); the first frame after idle a nominal step.
    const dt = c.cont ? Math.min(delta, 0.25) : 1 / 60;
    c.cont = false;
    const inp = input.get();
    if (!inp.visible || (window as Window & { __byggrvSnap3d?: boolean }).__byggrvSnap3d) {
      Object.assign(c, { az: inp.az, el: inp.el, px: inp.px, py: inp.py, scroll: inp.scroll });
    }
    const lambda = inp.dragging ? 9 : 3;
    c.az = damp(c.az, inp.az, lambda, dt);
    c.el = damp(c.el, inp.el, lambda, dt);
    c.px = damp(c.px, inp.px, 2.5, dt);
    c.py = damp(c.py, inp.py, 2.5, dt);
    c.scroll = damp(c.scroll, inp.scroll, 6, dt);
    const moving =
      Math.abs(c.az - inp.az) > 1e-4 ||
      Math.abs(c.el - inp.el) > 1e-4 ||
      Math.abs(c.px - inp.px) > 1e-3 ||
      Math.abs(c.py - inp.py) > 1e-3 ||
      Math.abs(c.scroll - inp.scroll) > 1e-3;

    const sph = tmp.sph.copy(base.sph);
    sph.theta += c.az + c.px * 0.025 + c.scroll * 0.07;
    sph.phi = Math.min(1.64, Math.max(0.9, sph.phi - c.el - c.py * 0.012 - c.scroll * 0.05));
    camera.position.copy(base.target).add(tmp.v.setFromSpherical(sph));
    camera.near = 0.5;
    camera.far = 4000;
    camera.lookAt(base.target);
    coverView(camera, size.width, size.height, base.preset);
    camera.updateMatrixWorld();
    if (moving) {
      c.cont = true;
      invalidate();
    }
  });

  return (
    <>
      <primitive object={model.root} />
      <primitive object={lights.group} />
      <primitive object={sky.mesh} />
    </>
  );
}

export default function HeroCanvas(props: HeroCanvasProps) {
  const glProps = useMemo(
    () => ({
      antialias: false,
      alpha: false,
      stencil: false,
      powerPreference: "high-performance" as const,
      toneMapping: THREE.AgXToneMapping,
      toneMappingExposure: houseMeta.lighting.bluehour.exposure,
    }),
    [],
  );
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 1.5]}
      gl={glProps}
      shadows="percentage"
      camera={{ fov: 46, near: 0.5, far: 4000, position: houseMeta.camera.hero.position }}
      style={{ position: "absolute", inset: 0 }}
      aria-hidden="true"
    >
      <Suspense fallback={null}>
        <HeroScene {...props} />
      </Suspense>
    </Canvas>
  );
}
