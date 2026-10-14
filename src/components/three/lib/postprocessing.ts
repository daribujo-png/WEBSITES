"use client";

/**
 * Post stack for the desktop canvases: MSAA render → bloom → output (tone
 * mapping + sRGB). Phones render directly (no bloom) instead. The canvas
 * draws through it with useRenderLoop (renderLoop.ts).
 */
import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

export interface PostStack {
  composer: EffectComposer;
  bloom: UnrealBloomPass;
  output: OutputPass;
  /** Adaptive quality can switch bloom off; setBloom then keeps it off. */
  bloomAllowed: boolean;
}

export function usePostprocessing(enabled: boolean): PostStack | null {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);

  const stack = useMemo(() => {
    if (!enabled) return null;
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    const composer = new EffectComposer(gl, target);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.3, 0.45, 0.9);
    composer.addPass(bloom);
    const output = new OutputPass();
    composer.addPass(output);
    return { composer, bloom, output, bloomAllowed: true };
  }, [enabled, gl, scene, camera]);

  useEffect(() => {
    if (!stack) return;
    stack.composer.setPixelRatio(dpr);
    stack.composer.setSize(size.width, size.height);
  }, [stack, size.width, size.height, dpr]);

  useEffect(
    () => () => {
      if (!stack) return;
      stack.bloom.dispose();
      stack.composer.dispose();
    },
    [stack],
  );

  return stack;
}

/** The render target the scene's materials draw into (programs differ for canvas vs target). */
export function sceneTarget(post: PostStack | null): THREE.WebGLRenderTarget | null {
  return post ? post.composer.readBuffer : null;
}

/** The defines OutputPass sets on its first render for this renderer (same program key). */
function outputDefines(gl: THREE.WebGLRenderer) {
  const d: Record<string, string> = {};
  if (THREE.ColorManagement.getTransfer(gl.outputColorSpace) === THREE.SRGBTransfer) d.SRGB_TRANSFER = "";
  const tm: Partial<Record<THREE.ToneMapping, string>> = {
    [THREE.LinearToneMapping]: "LINEAR_TONE_MAPPING",
    [THREE.ReinhardToneMapping]: "REINHARD_TONE_MAPPING",
    [THREE.CineonToneMapping]: "CINEON_TONE_MAPPING",
    [THREE.ACESFilmicToneMapping]: "ACES_FILMIC_TONE_MAPPING",
    [THREE.AgXToneMapping]: "AGX_TONE_MAPPING",
    [THREE.NeutralToneMapping]: "NEUTRAL_TONE_MAPPING",
    [THREE.CustomToneMapping]: "CUSTOM_TONE_MAPPING",
  };
  const name = tm[gl.toneMapping];
  if (name) d[name] = "";
  return d;
}

/**
 * Compile the post passes' shaders (bloom mips, composite, output) without
 * blocking, like compileAsync does for the scene, so the first composed frame
 * links nothing. OutputPass later rebuilds the same defines: a program cache hit.
 */
export function compilePostAsync(gl: THREE.WebGLRenderer, post: PostStack, camera: THREE.Camera): Promise<unknown> {
  // Same attributes as three's FullScreenQuad (position + uv, no normals: normals change the program key).
  const quad = new THREE.BufferGeometry();
  quad.setAttribute("position", new THREE.Float32BufferAttribute([-1, 3, 0, -1, -1, 0, 3, -1, 0], 3));
  quad.setAttribute("uv", new THREE.Float32BufferAttribute([0, 2, 0, 0, 2, 0], 2));
  const sceneOf = (materials: THREE.Material[]) => {
    const s = new THREE.Scene();
    for (const m of materials) {
      const mesh = new THREE.Mesh(quad, m);
      mesh.frustumCulled = false;
      s.add(mesh);
    }
    return s;
  };
  const b = post.bloom;
  post.output.material.defines = outputDefines(gl);
  const prev = gl.getRenderTarget();
  gl.setRenderTarget(post.composer.readBuffer);
  const inTargets = gl.compileAsync(
    sceneOf([b.materialHighPassFilter, ...b.separableBlurMaterials, b.compositeMaterial, b.blendMaterial]),
    camera,
  );
  gl.setRenderTarget(null);
  const toScreen = gl.compileAsync(sceneOf([post.output.material]), camera);
  gl.setRenderTarget(prev);
  const done = Promise.all([inTargets, toScreen]);
  const free = () => quad.dispose();
  done.then(free, free);
  return done;
}

/** Set bloom from a resolved lighting state; skips the pass when it would be invisible. */
export function setBloom(stack: PostStack | null, strength: number, radius: number, threshold: number) {
  if (!stack) return;
  stack.bloom.enabled = stack.bloomAllowed && strength > 0.01;
  stack.bloom.strength = strength;
  stack.bloom.radius = radius;
  stack.bloom.threshold = threshold;
}
