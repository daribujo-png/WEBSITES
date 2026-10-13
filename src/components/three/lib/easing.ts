/**
 * Easing and damping helpers with no three.js dependency, so DOM-side code
 * (scroll mapping, overlays) can use them without pulling three into the
 * page bundle.
 */

/** Frame-rate independent exponential damping. */
export function damp(current: number, target: number, lambda: number, dt: number) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

export const smoothstep = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

export const easeInOutCubic = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

export const easeOutCubic = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
export const easeOutExpo = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
};
