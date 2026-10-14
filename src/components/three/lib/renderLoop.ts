"use client";

/**
 * Takes over R3F's render (useFrame priority 1). Nothing is drawn until the
 * scene's shaders are warm (`gate`), so the first frame never compiles shaders
 * synchronously; then each frame goes through the post stack (if any) or
 * straight to the canvas. Kept apart from postprocessing.ts so canvases
 * without a post stack do not pull it into their chunk.
 */
import type { RefObject } from "react";
import { useFrame } from "@react-three/fiber";

export function useRenderLoop(post: { composer: { render: () => void } } | null, gate: RefObject<boolean>) {
  useFrame(({ gl, scene, camera }) => {
    if (!gate.current) return;
    if (post) post.composer.render();
    else gl.render(scene, camera);
  }, 1);
}
