"use client";

/**
 * Lenis smooth scrolling driven by the GSAP ticker, synced with ScrollTrigger.
 *
 * - Reduced motion: Lenis is not started (native scrolling); ScrollTrigger
 *   still works. Toggling the OS setting live starts/stops Lenis.
 * - Touch-only devices keep native scrolling and never load Lenis (CSS
 *   scroll-behavior handles their in-page links).
 * - GSAP and Lenis load lazily: first interaction or idle (see motionWanted).
 * - In-page hash links (<a href="#kontakt">) are handled by Lenis `anchors`.
 * - On route change ScrollTrigger is refreshed and Lenis resized.
 *
 * Use `useLenis()` to get the instance (null when not running), e.g. to
 * lenis.stop() while a menu overlay is open. Mark inner scroll areas with
 * `data-lenis-prevent`.
 */
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import type Lenis from "lenis";
import { gsapIfLoaded, withGsap } from "@/lib/motion";
import { FINE_POINTER_QUERY, REDUCED_MOTION_QUERY } from "@/lib/hooks";

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

/**
 * Move the keyboard focus starting point to the target of an in-page link,
 * so the next Tab continues inside that section (WCAG 2.4.3). Next's <Link>
 * scrolls same-page hash links itself and leaves focus on the link, and an
 * arrival from another route (/tjenester/ → /#slik-bygger-vi) has no focus
 * at all. The target gets tabindex="-1" and is focused without scrolling.
 */
function focusHashTarget(hash: string) {
  if (!hash || hash === "#") return;
  let el: HTMLElement | null = null;
  try {
    el = document.getElementById(decodeURIComponent(hash.slice(1)));
  } catch {
    return;
  }
  if (!el) return;
  if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
  el.focus({ preventScroll: true });
}

function HashFocus() {
  const pathname = usePathname();
  // Arrivals with a hash (also after a route change).
  useEffect(() => {
    if (!window.location.hash) return;
    const id = window.setTimeout(() => focusHashTarget(window.location.hash), 150);
    return () => window.clearTimeout(id);
  }, [pathname]);
  // Same-page hash links anywhere (header, menu, footer, in-page).
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target instanceof Element ? e.target.closest<HTMLAnchorElement>("a[href*='#']") : null;
      if (!a || a.target === "_blank") return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname !== window.location.pathname || !url.hash) return;
      // After Next/Lenis have started the scroll and any menu has closed.
      window.setTimeout(() => focusHashTarget(url.hash), 150);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  return null;
}

function RouteSync() {
  const pathname = usePathname();
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      current?.resize();
      // Before GSAP has loaded there is nothing to refresh.
      gsapIfLoaded()?.ScrollTrigger.refresh();
    });
    return () => cancelAnimationFrame(id);
  }, [pathname]);
  return null;
}

export function SmoothScroll({ children }: { children: ReactNode }) {
  useEffect(() => {
    // GSAP and Lenis arrive as lazy chunks (first interaction or idle, see
    // motionWanted in @/lib/motion), not in the first page load.
    let LenisCtor: typeof Lenis | null = null;
    let disposed = false;

    const cleanupGsap = withGsap(({ gsap, ScrollTrigger }) => {
      // Lenis only smooths wheel scrolling, so touch-only devices never load it
      // (CSS smooth scrolling handles their in-page links).
      const wheel = window.matchMedia(FINE_POINTER_QUERY).matches;
      const lenisReady = wheel
        ? import("lenis").then((m) => {
            LenisCtor = m.default;
          })
        : Promise.resolve();
      const mql = window.matchMedia(REDUCED_MOTION_QUERY);
      let lenis: Lenis | null = null;
      let tick: ((time: number) => void) | null = null;

      const start = () => {
        if (lenis || !LenisCtor || disposed) return;
        lenis = new LenisCtor({
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

      if (!mql.matches) lenisReady.then(start);

      const onChange = () => {
        if (mql.matches) stop();
        else lenisReady.then(start);
        ScrollTrigger.refresh();
      };
      mql.addEventListener("change", onChange);

      // Fonts change line heights: refresh trigger positions once they are in.
      let cancelled = false;
      document.fonts?.ready.then(() => {
        if (!cancelled) ScrollTrigger.refresh(true); // safe: never interrupts a running scroll
      });

      return () => {
        cancelled = true;
        mql.removeEventListener("change", onChange);
        stop();
      };
    });

    return () => {
      disposed = true;
      cleanupGsap();
    };
  }, []);

  return (
    <>
      <RouteSync />
      <HashFocus />
      {children}
    </>
  );
}
