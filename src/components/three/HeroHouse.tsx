"use client";

/**
 * Hero stage: the finished reference house at blue hour.
 *
 * The poster <picture> (renders.hero-bluehour, portrait crop on phones) is
 * server-rendered and is the LCP element. On desktop the live canvas mounts
 * once the browser is idle, the hero is in view and the visitor has moved
 * the mouse (or scrolled/typed), then fades in over the poster with
 * identical framing. Fine pointers can drag gently within limits
 * (no free orbit, no zoom). Phones, reduced motion, WebGL failure and GPUs
 * below the "high" tier (lib/gpu-tier: older integrated graphics) keep the
 * poster, which is the same picture at rest (phones still get the scroll
 * drift from the hero section). The house model starts downloading together
 * with the canvas chunk.
 */
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { hero } from "@/content";
import { getRender } from "@/content/renders";
import { Icon } from "@/components/ui";
import { largestSource, placeholderStyle, toSrcSet, type RenderAsset } from "@/lib/images";
import { useFinePointer, useIdle, useInView, useIsDesktop, useReducedMotion } from "@/lib/hooks";
import { gpuInfo } from "@/lib/gpu-tier";
import { cn } from "@/lib/utils";
import { CanvasBoundary } from "./CanvasBoundary";
import { createInputStore } from "./lib/inputStore";
import { prefetchHouse } from "./lib/modelSource";
import type { HeroInputState } from "./HeroCanvas";

const HeroCanvas = dynamic(() => import("./HeroCanvas"), { ssr: false, loading: () => null });

/** <picture> with a portrait poster on phones and the landscape one from 48rem. */
function HeroPoster({ landscape, portrait }: { landscape: RenderAsset; portrait: RenderAsset | null }) {
  const fallback = largestSource(landscape.sources.webp) ?? largestSource(landscape.sources.avif);
  return (
    <picture className="absolute inset-0 block">
      {portrait?.sources.avif.length ? (
        <source media="(max-width: 47.99rem)" type="image/avif" srcSet={toSrcSet(portrait.sources.avif)} sizes="100vw" />
      ) : null}
      {portrait?.sources.webp.length ? (
        <source media="(max-width: 47.99rem)" type="image/webp" srcSet={toSrcSet(portrait.sources.webp)} sizes="100vw" />
      ) : null}
      {landscape.sources.avif.length ? (
        <source type="image/avif" srcSet={toSrcSet(landscape.sources.avif)} sizes="100vw" />
      ) : null}
      {landscape.sources.webp.length ? (
        <source type="image/webp" srcSet={toSrcSet(landscape.sources.webp)} sizes="100vw" />
      ) : null}
      <img
        src={fallback?.src}
        width={landscape.width}
        height={landscape.height}
        alt={landscape.alt}
        sizes="100vw"
        loading="eager"
        fetchPriority="high"
        decoding="async"
        style={placeholderStyle(landscape.placeholder)}
        className="h-full w-full object-cover"
      />
    </picture>
  );
}

/** "static": the device keeps the poster for good (GPU below the high tier). */
type Phase = "poster" | "static" | "loading" | "ready" | "failed";

const ENGAGE_EVENTS = ["pointermove", "pointerdown", "wheel", "keydown", "scroll"] as const;

/**
 * True after the visitor first moves the mouse, scrolls or types. The live
 * hero is pixel-identical to the poster at rest, so it never costs CPU/GPU
 * before someone is actually there to see it move.
 */
function useEngaged() {
  const [engaged, setEngaged] = useState(false);
  useEffect(() => {
    if (engaged) return;
    const on = () => setEngaged(true);
    ENGAGE_EVENTS.forEach((e) => window.addEventListener(e, on, { once: true, passive: true }));
    return () => ENGAGE_EVENTS.forEach((e) => window.removeEventListener(e, on));
  }, [engaged]);
  return engaged;
}

export function HeroHouse({ className }: { className?: string }) {
  const landscape = getRender("hero-bluehour");
  const portrait = getRender("hero-bluehour-portrait");
  const reduced = useReducedMotion();
  const desktop = useIsDesktop();
  const fine = useFinePointer();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  const idle = useIdle(2500);
  const engaged = useEngaged();
  const [phase, setPhase] = useState<Phase>("poster");
  const input = useMemo(
    () => createInputStore<HeroInputState>({ az: 0, el: 0, px: 0, py: 0, scroll: 0, dragging: false, visible: false }),
    [],
  );

  const allowed = !reduced && desktop;
  // WebGL and the GPU tier are probed only now (after idle, desktop, in view), never during hydration.
  if (phase === "poster" && allowed && idle && engaged && inView) {
    const info = gpuInfo();
    setPhase(!info.webgl ? "failed" : info.tier === "high" ? "loading" : "static");
  }
  const live = allowed && (phase === "loading" || phase === "ready");
  const dragEnabled = live && phase === "ready" && fine;

  const onReady = useCallback(() => setPhase("ready"), []);
  const onError = useCallback(() => setPhase("failed"), []);

  useEffect(() => {
    input.set({ visible: inView });
  }, [input, inView]);

  // The model downloads alongside the canvas chunk (not after it has loaded and run).
  useEffect(() => {
    if (phase === "loading") prefetchHouse("high");
  }, [phase]);

  // Scroll drift: the camera rises and turns a little as the hero scrolls away.
  useEffect(() => {
    if (!live || !inView) return;
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      const h = el.getBoundingClientRect().height || 1;
      input.set({ scroll: Math.min(1, Math.max(0, window.scrollY / h)) });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [live, inView, input]);

  const drag = useRef<{ id: number; x: number; y: number; az: number; el: number } | null>(null);
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragEnabled || e.button !== 0 || (e.pointerType !== "mouse" && e.pointerType !== "pen")) return;
    const { az, el } = input.get();
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, az, el };
    e.currentTarget.setPointerCapture(e.pointerId);
    input.set({ dragging: true });
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragEnabled || e.pointerType !== "mouse") return;
    const d = drag.current;
    if (d && d.id === e.pointerId) {
      input.set({
        az: Math.max(-0.22, Math.min(0.22, d.az - (e.clientX - d.x) * 0.0035)),
        el: Math.max(-0.05, Math.min(0.09, d.el + (e.clientY - d.y) * 0.0018)),
      });
    } else {
      const r = e.currentTarget.getBoundingClientRect();
      input.set({ px: ((e.clientX - r.left) / r.width) * 2 - 1, py: ((e.clientY - r.top) / r.height) * 2 - 1 });
    }
  };
  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current || drag.current.id !== e.pointerId) return;
    drag.current = null;
    input.set({ dragging: false });
  };

  return (
    <div
      ref={ref}
      data-cursor-label={dragEnabled ? "Dra" : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className={cn(
        "relative overflow-hidden bg-night",
        dragEnabled && "cursor-grab select-none active:cursor-grabbing",
        className,
      )}
    >
      {landscape ? <HeroPoster landscape={landscape} portrait={portrait} /> : null}
      {live ? (
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-[1600ms] ease-weight",
            phase === "ready" ? "opacity-100" : "opacity-0",
          )}
        >
          <CanvasBoundary onError={onError}>
            <HeroCanvas input={input} onReady={onReady} onError={onError} />
          </CanvasBoundary>
        </div>
      ) : null}
      {dragEnabled ? (
        <p
          aria-hidden="true"
          className="t-caption pointer-events-none absolute top-[calc(var(--header-h)+1.5rem)] right-gutter z-(--z-raised) flex items-center gap-2 text-fg-muted"
        >
          <Icon.DragHorizontal size={14} />
          {hero.dragHint}
        </p>
      ) : null}
    </div>
  );
}
