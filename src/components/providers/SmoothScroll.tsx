"use client";

/**
 * Lenis smooth scrolling driven by the GSAP ticker, synced with ScrollTrigger.
 *
 * - Reduced motion: Lenis is not started (native scrolling); ScrollTrigger
 *   still works. Toggling the OS setting live starts/stops Lenis.
 * - Touch devices keep native scrolling (Lenis syncTouch is off).
 * - In-page hash links (<a href="#kontakt">) are handled by Lenis `anchors`.
 * - On route change ScrollTrigger is refreshed and Lenis resized.
 *
 * Use `useLenis()` to get the instance (null when not running), e.g. to
 * lenis.stop() while a menu overlay is open. Mark inner scroll areas with
 * `data-lenis-prevent`.
 */
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { getGsap } from "@/lib/motion";
import { REDUCED_MOTION_QUERY } from "@/lib/hooks";

/* Tiny external store for the Lenis instance -------------------------------- */
let current: Lenis | null = null;
const listeners = new Set<() => void>();
function setLenis(next: Lenis | null) {
  current = next;
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** The running Lenis instance, or null (SSR, reduced motion, not mounted). */
export function useLenis(): Lenis | null {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
}

/** Non-hook accessor for imperative code. */
export function getLenis(): Lenis | null {
  return current;
}

/**
 * Scroll to an element, selector or y-position. Uses Lenis when running,
 * otherwise native scrolling (instant when reduced motion is preferred).
 */
export function scrollToTarget(target: string | HTMLElement | number, opts: { offset?: number } = {}) {
  const lenis = current;
  if (lenis) {
    lenis.scrollTo(target, { offset: opts.offset ?? 0, duration: 1.4 });
    return;
  }
  const reduce = window.matchMedia(REDUCED_MOTION_QUERY).matches;
  let y: number;
  if (typeof target === "number") y = target;
  else {
    const el = typeof target === "string" ? document.querySelector<HTMLElement>(target) : target;
    if (!el) return;
    y = el.getBoundingClientRect().top + window.scrollY;
  }
  window.scrollTo({ top: y + (opts.offset ?? 0), behavior: reduce ? "auto" : "smooth" });
}

function RouteSync() {
  const pathname = usePathname();
  useEffect(() => {
    const { ScrollTrigger } = getGsap();
    const id = requestAnimationFrame(() => {
      current?.resize();
      ScrollTrigger.refresh();
    });
    return () => cancelAnimationFrame(id);
  }, [pathname]);
  return null;
}

export function SmoothScroll({ children }: { children: ReactNode }) {
  useEffect(() => {
    const { gsap, ScrollTrigger } = getGsap();
    const mql = window.matchMedia(REDUCED_MOTION_QUERY);
    let lenis: Lenis | null = null;
    let tick: ((time: number) => void) | null = null;

    const start = () => {
      if (lenis) return;
      lenis = new Lenis({
        lerp: 0.085,
        smoothWheel: true,
        syncTouch: false,
        anchors: true,
        stopInertiaOnNavigate: true,
      });
      lenis.on("scroll", ScrollTrigger.update);
      const instance = lenis;
      tick = (time: number) => instance.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
      document.documentElement.dataset.smoothScroll = "on";
      setLenis(lenis);
    };

    const stop = () => {
      if (tick) gsap.ticker.remove(tick);
      tick = null;
      lenis?.destroy();
      lenis = null;
      delete document.documentElement.dataset.smoothScroll;
      setLenis(null);
    };

    if (!mql.matches) start();

    const onChange = () => {
      if (mql.matches) stop();
      else start();
      ScrollTrigger.refresh();
    };
    mql.addEventListener("change", onChange);

    // Fonts change line heights: refresh trigger positions once they are in.
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) ScrollTrigger.refresh();
    });

    return () => {
      cancelled = true;
      mql.removeEventListener("change", onChange);
      stop();
    };
  }, []);

  return (
    <>
      <RouteSync />
      {children}
    </>
  );
}
