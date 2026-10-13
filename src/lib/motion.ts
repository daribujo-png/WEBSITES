/**
 * Motion tokens for JS (GSAP, R3F) that mirror the CSS tokens in globals.css.
 * Slow and weighty, never bouncy. No elastic/back/bounce eases anywhere.
 * Safe to import from server and client modules.
 *
 * GSAP + ScrollTrigger are loaded on demand (separate chunks fetched on the
 * first interaction or when idle after load, see motionWanted), so they are
 * not part of the first page load. Use withGsap() in effects; it returns a
 * cleanup that also cancels a setup that has not run yet.
 */
import type { gsap as GsapCore } from "gsap";
import type { ScrollTrigger as ScrollTriggerType } from "gsap/ScrollTrigger";

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

export interface GsapBundle {
  gsap: typeof GsapCore;
  ScrollTrigger: typeof ScrollTriggerType;
}

let bundle: GsapBundle | null = null;
let pending: Promise<GsapBundle> | null = null;

let wanted: Promise<void> | null = null;
let lastScroll = -Infinity;
let scrollWatch = false;

/**
 * Resolves once the page has not scrolled for `quiet` ms. Setting up
 * ScrollTrigger (and Lenis) while a smooth in-page scroll is running would
 * cancel that scroll, so initialisation waits for it to finish.
 */
function scrollSettled(quiet = 220): Promise<void> {
  if (!scrollWatch) {
    scrollWatch = true;
    window.addEventListener("scroll", () => (lastScroll = performance.now()), { passive: true });
  }
  return new Promise((resolve) => {
    const check = () => {
      const since = performance.now() - lastScroll;
      if (since >= quiet) resolve();
      else window.setTimeout(check, quiet - since + 16);
    };
    check();
  });
}

/**
 * Idle-until-urgent gate for the motion libraries: resolves on the first
 * scroll, wheel, touch, pointer or key event, or when the browser is idle a
 * little after load, whichever comes first. Scroll-driven motion is only
 * visible once someone scrolls, so GSAP and Lenis stay off the critical path
 * (and out of the main-thread work while the page becomes interactive).
 * Setup itself then waits for any running scroll to settle (scrollSettled).
 */
export function motionWanted(): Promise<void> {
  if (wanted) return wanted;
  scrollSettled(0); // start watching scroll activity now
  wanted = new Promise<void>((resolve) => {
    const events = ["scroll", "wheel", "touchstart", "pointerdown", "pointermove", "keydown"] as const;
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      events.forEach((e) => window.removeEventListener(e, go));
      resolve();
    };
    events.forEach((e) => window.addEventListener(e, go, { passive: true }));
    // Opened mid-page (restored scroll position or a #hash link): load now.
    if (window.scrollY > 0 || window.location.hash) {
      go();
      return;
    }
    const idle = () => {
      const w = window as Window & {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      };
      if (w.requestIdleCallback) w.requestIdleCallback(go, { timeout: 3000 });
      else window.setTimeout(go, 1500);
    };
    const afterLoad = () => window.setTimeout(idle, 4000);
    if (document.readyState === "complete") afterLoad();
    else window.addEventListener("load", afterLoad, { once: true });
  });
  return wanted;
}

/** Load GSAP + ScrollTrigger once (client only) and register the plugin. */
export function loadGsap(): Promise<GsapBundle> {
  if (bundle) return Promise.resolve(bundle);
  if (!pending) {
    pending = motionWanted()
      .then(() => Promise.all([import("gsap"), import("gsap/ScrollTrigger")]))
      .then(async (mods) => {
        await scrollSettled();
        return mods;
      })
      .then(([core, st]) => {
        core.gsap.registerPlugin(st.ScrollTrigger);
        core.gsap.defaults({ ease: EASE.weight, duration: DURATION.slow });
        bundle = { gsap: core.gsap, ScrollTrigger: st.ScrollTrigger };
        return bundle;
      });
  }
  return pending;
}

/** GSAP if it has already loaded, otherwise null (never triggers a load). */
export function gsapIfLoaded(): GsapBundle | null {
  return bundle;
}

/**
 * Run `setup` as soon as GSAP is available (immediately if it already is).
 * Returns a cleanup for useEffect: it runs setup's own cleanup, or cancels
 * the setup if GSAP has not arrived yet.
 */
export function withGsap(setup: (g: GsapBundle) => void | (() => void)): () => void {
  let cleanup: void | (() => void);
  let cancelled = false;
  if (bundle) cleanup = setup(bundle);
  else
    loadGsap().then((g) => {
      if (!cancelled) cleanup = setup(g);
    });
  return () => {
    cancelled = true;
    if (typeof cleanup === "function") cleanup();
  };
}

/** Frame-rate independent damping: lerp factor for a given delta (seconds). */
export function damp(current: number, target: number, lambda: number, dt: number) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}
