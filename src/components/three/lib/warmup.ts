/**
 * Shader and upload warm-up for the live canvases, so the first frames (and
 * the first time a build layer appears mid-scroll) never compile programs or
 * upload geometry on the main thread.
 */
import * as THREE from "three";

/**
 * compileAsync for the target the scene really draws into: programs differ
 * for a render target (the post stack's buffer) and the canvas.
 */
export function compileSceneAsync(
  gl: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  target: THREE.WebGLRenderTarget | null,
): Promise<unknown> {
  const prev = gl.getRenderTarget();
  gl.setRenderTarget(target);
  try {
    return gl.compileAsync(scene, camera);
  } finally {
    gl.setRenderTarget(prev);
  }
}

/**
 * Draw one frame (shadow map included) into a 1-pixel scissor of `target`:
 * every visible object's geometry is uploaded and the shadow pass's depth
 * programs are built, with next to no fill. Call it while the canvas is still
 * hidden, with everything that will ever be shown made visible.
 */
export function warmRender(
  gl: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  target: THREE.WebGLRenderTarget | null,
) {
  const prev = gl.getRenderTarget();
  if (target) {
    target.scissor.set(0, 0, 1, 1);
    target.scissorTest = true;
  } else {
    gl.setScissor(0, 0, 1, 1);
    gl.setScissorTest(true);
  }
  gl.setRenderTarget(target);
  gl.shadowMap.needsUpdate = true;
  try {
    gl.render(scene, camera);
  } finally {
    if (target) {
      target.scissorTest = false;
      target.scissor.set(0, 0, target.width, target.height);
    } else {
      gl.setScissorTest(false);
    }
    gl.setRenderTarget(prev);
  }
}
