/**
 * Camera framing helpers shared by the canvases.
 *
 * - coverView: frames a canvas exactly like an object-fit: cover poster that
 *   was rendered at `refAspect` with the same camera (hero ↔ poster match).
 * - regionFit: keeps the subject inside a clear region of the canvas (the
 *   part not covered by copy panels) by shifting the view and dollying back.
 */
import * as THREE from "three";
import type { CameraPreset } from "./meta";

export const POSTER_ASPECT = 16 / 9;

export function coverView(
  camera: THREE.PerspectiveCamera,
  width: number,
  height: number,
  preset: CameraPreset,
  refAspect = POSTER_ASPECT,
  extraShift: [number, number] = [0, 0],
) {
  let fullW: number;
  let fullH: number;
  if (width / height > refAspect) {
    fullW = width;
    fullH = width / refAspect;
  } else {
    fullH = height;
    fullW = height * refAspect;
  }
  const shift = preset.shift ?? [0, 0];
  camera.fov = preset.fov ?? 30;
  camera.aspect = fullW / fullH;
  camera.setViewOffset(
    fullW,
    fullH,
    (fullW - width) / 2 + (shift[0] + extraShift[0]) * fullW,
    (fullH - height) / 2 + (shift[1] + extraShift[1]) * fullH,
    width,
    height,
  );
  camera.updateProjectionMatrix();
}

export interface Region {
  /** Clear region in canvas pixels. */
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Fit a shot composed for a full 16:9 frame into `region` of a
 * `width`×`height` canvas: shift the view onto the region and widen the
 * framing by `k`, split between a wider lens (up to `maxFov`) and dollying
 * back (`distScale`). Callers scale fog by `distScale` so a phone in portrait
 * sees the house as clearly as a desktop. `coverage` < 1 accepts that the
 * subject does not fill the preset's full width.
 */
export function regionFit(
  width: number,
  height: number,
  region: Region,
  fovDeg: number,
  shift: [number, number] = [0, 0],
  coverage = 0.72,
  maxFov = 48,
) {
  const rw = Math.max(1, region.w);
  const rh = Math.max(1, region.h);
  const ra = rw / rh;
  const tanF = Math.tan(THREE.MathUtils.degToRad(fovDeg) / 2);
  const needRegionTan = Math.max(tanF, ((tanF * POSTER_ASPECT) / ra) * coverage);
  // The camera's vertical fov spans the whole canvas; the region only rh of it.
  const k = Math.min(4, Math.max(1, (needRegionTan * (height / rh)) / tanF));
  const tanMax = Math.max(tanF, Math.tan(THREE.MathUtils.degToRad(maxFov) / 2));
  const tanFit = Math.min(tanMax, tanF * Math.sqrt(k));
  const distScale = (tanF * k) / tanFit;
  const cx = region.x + rw / 2;
  const cy = region.y + rh / 2;
  return {
    fov: THREE.MathUtils.radToDeg(2 * Math.atan(tanFit)),
    distScale,
    offsetX: width / 2 - cx + shift[0] * rw,
    offsetY: height / 2 - cy + shift[1] * rh,
  };
}

export { damp, smoothstep, easeInOutCubic, easeOutCubic, easeOutExpo } from "./easing";

/** Spherical offset of `position` around `target`. */
export function toSpherical(position: THREE.Vector3Tuple, target: THREE.Vector3Tuple) {
  const v = new THREE.Vector3(position[0] - target[0], position[1] - target[1], position[2] - target[2]);
  return new THREE.Spherical().setFromVector3(v);
}

/** Shortest-path angle lerp. */
export function lerpAngle(a: number, b: number, t: number) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
