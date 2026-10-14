"use client";
/* eslint-disable react-hooks/immutability -- three.js objects (scene, renderer, camera, model) are
   mutable by design; R3F mutates them in effects and useFrame, outside React's render. */

/**
 * Small permit diagram canvas (lazy chunk): one node of permits.glb on paper,
 * lit with the same "paper" preset and camera as its poster. It turns slowly
 * while hovered or focused, can be dragged on desktop, and eases back to the
 * poster pose when left alone.
 */
import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { PermitTypeId } from "@/content/types";
import { PERMITS_GLB, houseMeta, permitsMeta } from "./lib/meta";
import { useModel } from "./lib/loader";
import { LightRig, createSkyMesh, resolvePreset, setSkyUniforms, skyEnvironment } from "./lib/lighting";
import { coverView, damp } from "./lib/camera";
import type { InputStore } from "./lib/inputStore";
import { useRenderLoop } from "./lib/renderLoop";
import { gpuInfo } from "@/lib/gpu-tier";

export interface PermitInputState {
  /** Hovered or focused: turn slowly. */
  active: boolean;
  /** Drag yaw target (radians). */
  yaw: number;
  dragging: boolean;
}

export type PermitInput = InputStore<PermitInputState>;

export interface PermitCanvasProps {
  type: PermitTypeId;
  input: PermitInput;
  onReady: () => void;
  onError: () => void;
}

const POSTER_ASPECT = 4 / 3;

/** Diagram edges, as on the posters: ink hairlines on the existing house, brass on the new part. */
function addEdges(root: THREE.Object3D) {
  const meshes: THREE.Mesh[] = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    const name = (m.material as THREE.Material | undefined)?.name ?? "";
    if (m.isMesh && /^permit_(existing|new)/.test(name)) meshes.push(m);
  });
  for (const m of meshes) {
    const isNew = (m.material as THREE.Material).name.startsWith("permit_new");
    const line = new THREE.LineSegments(
      new THREE.EdgesGeometry(m.geometry, 30),
      new THREE.LineBasicMaterial({ color: isNew ? "#c9a86a" : "#1d2326", transparent: true, opacity: isNew ? 0.9 : 0.35 }),
    );
    m.add(line);
  }
}

function PermitScene({ type, input, onReady, onError }: PermitCanvasProps) {
  const gltf = useModel(PERMITS_GLB);
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);

  const lit = useMemo(() => resolvePreset(houseMeta.lighting.paper), []);
  // Only the selected diagram is cloned (and gets edge lines); switching type swaps it in this same canvas.
  const model = useMemo(() => {
    const pivot = new THREE.Group();
    const node = gltf.scene.getObjectByName(`permit_${type}`);
    if (!node) return pivot;
    const root = node.clone(true);
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    addEdges(root);
    pivot.add(root);
    return pivot;
  }, [gltf.scene, type]);
  const lights = useMemo(() => {
    const rig = new LightRig({ interior: [], exterior: [], shadowMapSize: 1024, shadowExtent: 12, shadowTarget: [0, 0, 0] });
    rig.apply(lit);
    return rig;
  }, [lit]);
  const sky = useMemo(() => {
    const s = createSkyMesh();
    setSkyUniforms(s.uniforms, lit.sky);
    return s;
  }, [lit]);
  const env = useMemo(() => skyEnvironment(gl, lit.envSky), [gl, lit]);
  const cam = permitsMeta.cameras[type];
  const camTarget = useMemo(() => new THREE.Vector3(...cam.target), [cam]);
  const cur = useRef({ spin: 0, yaw: 0, cont: false });
  /** Shaders are warm: frames may be drawn. */
  const warm = useRef(false);
  useRenderLoop(null, warm);

  useEffect(() => {
    scene.environment = env.texture;
    scene.environmentIntensity = lit.envIntensity;
    scene.background = null;
    scene.fog = null;
    gl.toneMappingExposure = lit.exposure;
    return () => {
      scene.environment = null;
    };
  }, [scene, gl, env, lit]);

  useEffect(() => input.subscribe(() => invalidate()), [input, invalidate]);

  // A new diagram starts in its poster pose.
  useEffect(() => {
    Object.assign(cur.current, { spin: 0, yaw: 0, cont: false });
    invalidate();
  }, [model, invalidate]);

  useEffect(
    () => () =>
      model.traverse((o) => {
        const l = o as THREE.LineSegments;
        if (l.isLineSegments) {
          l.geometry.dispose();
          (l.material as THREE.Material).dispose();
        }
      }),
    [model],
  );

  useEffect(
    () => () => {
      sky.mesh.geometry.dispose();
      sky.mesh.material.dispose();
      env.dispose();
    },
    [sky, env],
  );

  useEffect(() => {
    let cancelled = false;
    const onLost = (e: Event) => {
      e.preventDefault();
      onError();
    };
    gl.domElement.addEventListener("webglcontextlost", onLost);
    (async () => {
      // All five diagrams' materials (as the scene would draw them), so switching tabs never compiles.
      const all = gltf.scene.clone(true);
      all.traverse((o) => {
        o.castShadow = true;
        o.receiveShadow = true;
      });
      try {
        await Promise.all([gl.compileAsync(scene, camera), gl.compileAsync(all, camera, scene)]);
      } catch {
        // optimisation only
      }
      if (cancelled) return;
      warm.current = true;
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
  }, [gl, scene, camera, gltf.scene, invalidate, onReady, onError]);

  useFrame((_, delta) => {
    const c = cur.current;
    // Continuations use the real delta (capped); the first frame after idle a nominal step.
    const dt = c.cont ? Math.min(delta, 0.25) : 1 / 60;
    c.cont = false;
    const inp = input.get();
    // Turntable while hovered/focused; otherwise ease back to the poster pose.
    if (inp.active && !inp.dragging) c.spin += dt * 0.32;
    else c.spin = damp(c.spin, Math.round(c.spin / (Math.PI * 2)) * Math.PI * 2, 2.2, dt);
    c.yaw = damp(c.yaw, inp.yaw, inp.dragging ? 12 : 2.2, dt);
    model.rotation.y = c.spin + c.yaw;
    camera.position.set(...cam.position);
    camera.near = 0.5;
    camera.far = 4000;
    camera.lookAt(camTarget);
    coverView(camera, size.width, size.height, cam, POSTER_ASPECT);
    const settling =
      inp.active ||
      Math.abs(c.yaw - inp.yaw) > 1e-4 ||
      Math.abs(c.spin - Math.round(c.spin / (Math.PI * 2)) * Math.PI * 2) > 1e-4;
    if (settling) {
      c.cont = true;
      invalidate();
    }
  });

  return (
    <>
      <primitive object={model} />
      <primitive object={lights.group} />
      <primitive object={sky.mesh} />
    </>
  );
}

export default function PermitCanvas(props: PermitCanvasProps) {
  // Lower pixel-ratio cap below the high tier (older integrated GPUs).
  const maxDpr = gpuInfo().tier === "high" ? 1.75 : 1.25;
  const glProps = useMemo(
    () => ({
      antialias: true,
      alpha: false,
      stencil: false,
      toneMapping: THREE.NeutralToneMapping,
      toneMappingExposure: houseMeta.lighting.paper.exposure,
    }),
    [],
  );
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, maxDpr]}
      gl={glProps}
      shadows="percentage"
      camera={{ fov: 30, near: 0.5, far: 4000 }}
      style={{ position: "absolute", inset: 0 }}
      aria-hidden="true"
    >
      <Suspense fallback={null}>
        <PermitScene {...props} />
      </Suspense>
    </Canvas>
  );
}
