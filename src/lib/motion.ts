/**
 * Motion tokens for JS (GSAP, R3F) that mirror the CSS tokens in globals.css.
 * Slow and weighty, never bouncy. No elastic/back/bounce eases anywhere.
 * Safe to import from server and client modules (getGsap is a no-op on the server).
 */
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/** CSS cubic-bezier strings (same as --ease-* in globals.css). */
export const EASE_CSS = {
  weight: "cubic-bezier(0.22, 0.61, 0.36, 1)",
  expo: "cubic-bezier(0.16, 1, 0.3, 1)",
  glide: "cubic-bezier(0.65, 0, 0.35, 1)",
} as const;

/** GSAP ease names that match the CSS curves closely. */
export const EASE = {
  weight: "power3.out",
  expo: "expo.out",
  glide: "power2.inOut",
  /** For scroll-scrubbed timelines: let the scroll be the ease. */
  scrub: "none",
} as const;

/** Durations in seconds (CSS: --dur-fast/base/slow/slower). */
export const DURATION = {
  fast: 0.2,
  base: 0.45,
  slow: 0.9,
  slower: 1.4,
} as const;

/** Damping factor for lerped values per frame at 60 fps (camera, cursor). */
export const DAMPING = {
  camera: 0.06,
  cursor: 0.18,
  magnet: 0.22,
} as const;

let registered = false;

/**
 * Register GSAP plugins once (client only). Returns gsap + ScrollTrigger.
 * SmoothScroll already calls this; components may call it again safely.
 */
export function getGsap() {
  if (!registered && typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
    gsap.defaults({ ease: EASE.weight, duration: DURATION.slow });
    registered = true;
  }
  return { gsap, ScrollTrigger };
}

/** Frame-rate independent damping: lerp factor for a given delta (seconds). */
export function damp(current: number, target: number, lambda: number, dt: number) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}
