"use client";

/**
 * Minimal post stack for the desktop canvases: MSAA render → bloom → output
 * (tone mapping + sRGB). Takes over R3F's render loop when enabled; phones
 * render directly (no bloom) instead.
 */
import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

export interface PostStack {
  composer: EffectComposer;
  bloom: UnrealBloomPass;
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
    composer.addPass(new OutputPass());
    return { composer, bloom };
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

  useFrame(
    () => {
      if (stack) stack.composer.render();
    },
    stack ? 1 : 0,
  );

  return stack;
}

/** Set bloom from a resolved lighting state; skips the pass when it would be invisible. */
export function setBloom(stack: PostStack | null, strength: number, radius: number, threshold: number) {
  if (!stack) return;
  stack.bloom.enabled = strength > 0.01;
  stack.bloom.strength = strength;
  stack.bloom.radius = radius;
  stack.bloom.threshold = threshold;
}
