/**
 * Scroll → build position. The pinned scroll distance is split into units:
 * a short hold on the first step, then one unit per step in which the next
 * layer moves into place (first TRANSITION of the unit) and then holds still
 * so the copy can be read. A final hold keeps the finished house on screen.
 */
import { easeInOutCubic } from "./easing";

export const FIRST_HOLD = 0.5;
export const LAST_HOLD = 0.55;
export const TRANSITION = 0.62;

export function totalUnits(steps: number) {
  return FIRST_HOLD + (steps - 1) + LAST_HOLD;
}

/** Scroll progress 0…1 → build position t (0 … steps−1) with eased plateaus. */
export function progressToT(p: number, steps: number) {
  const r = p * totalUnits(steps) - FIRST_HOLD;
  if (r <= 0) return 0;
  if (r >= steps - 1) return steps - 1;
  const seg = Math.floor(r);
  const f = r - seg;
  return seg + easeInOutCubic(f / TRANSITION);
}

/** Scroll progress where step i sits settled (middle of its hold). */
export function stepToProgress(i: number, steps: number) {
  const total = totalUnits(steps);
  let r: number;
  if (i <= 0) r = -FIRST_HOLD / 2;
  else if (i >= steps - 1) r = steps - 1 + LAST_HOLD * 0.4;
  else r = i - 1 + TRANSITION + (1 - TRANSITION) * 0.5;
  return (r + FIRST_HOLD) / total;
}
