"use client";

/**
 * Client hooks shared by SECTIONS and THREE components.
 * Media-query hooks use useSyncExternalStore: no setState-in-effect, and the
 * server snapshot is a safe default (no motion, coarse pointer, not in view).
 */
import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";

const subscribers = new Map<string, (onChange: () => void) => () => void>();

/** Stable subscribe function per query (so the store is not resubscribed each render). */
function subscribeMedia(query: string) {
  let fn = subscribers.get(query);
  if (!fn) {
    fn = (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    };
    subscribers.set(query, fn);
  }
  return fn;
}

const noopSubscribe = () => () => {};

/** Live result of a CSS media query. `serverValue` is used during SSR/hydration. */
export function useMediaQuery(query: string, serverValue = false): boolean {
  return useSyncExternalStore(
    subscribeMedia(query),
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
export const FINE_POINTER_QUERY = "(hover: hover) and (pointer: fine)";
export const DESKTOP_QUERY = "(min-width: 64rem)";

/** True when the visitor prefers reduced motion. SSR default: true (safe). */
export function useReducedMotion(): boolean {
  return useMediaQuery(REDUCED_MOTION_QUERY, true);
}

/** True on devices with a precise, hovering pointer (mouse/trackpad). */
export function useFinePointer(): boolean {
  return useMediaQuery(FINE_POINTER_QUERY, false);
}

/** True at ≥ 1024px (the `lg` breakpoint). */
export function useIsDesktop(): boolean {
  return useMediaQuery(DESKTOP_QUERY, false);
}

/** Non-hook check for imperative code (event handlers, effects). */
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/**
 * IntersectionObserver state for an element.
 * `once` keeps it true after the first intersection (good for lazy mounts).
 */
export function useInView<T extends Element>(
  ref: RefObject<T | null>,
  { rootMargin = "0px", threshold = 0, once = false }: IntersectionObserverInit & { once?: boolean } = {},
): boolean {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.some((e) => e.isIntersecting);
        if (hit && once) {
          setInView(true);
          io.disconnect();
        } else {
          setInView(hit);
        }
      },
      { rootMargin, threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin, threshold, once]);
  return inView;
}

/** Becomes true once the browser is idle (or after `timeout` ms). For lazy 3D mounts. */
export function useIdle(timeout = 2000): boolean {
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => setIdle(true), { timeout });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(() => setIdle(true), Math.min(timeout, 1200));
    return () => window.clearTimeout(t);
  }, [timeout]);
  return idle;
}

/** True when WebGL is available. Checked once on the client. SSR default: true. */
export function useWebGLAvailable(): boolean {
  return useSyncExternalStore(noopSubscribe, webglAvailable, () => true);
}

let webglCache: boolean | null = null;
export function webglAvailable(): boolean {
  if (webglCache !== null) return webglCache;
  try {
    const canvas = document.createElement("canvas");
    webglCache = !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    webglCache = false;
  }
  return webglCache;
}

/** Ref that always holds the latest value (for stable callbacks). */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}
