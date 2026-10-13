"use client";

/**
 * The pinned "Slik bygger vi" stage: dark full-bleed canvas, copy panel,
 * progress rail with step names, view controls and hotspots. The stage is
 * CSS-sticky inside a tall wrapper (the pin); GSAP ScrollTrigger, synced
 * with Lenis by the SmoothScroll provider, scrubs the build position over
 * the wrapper. The canvas loads when the stage is near and renders on
 * demand. Until it is ready (or if WebGL fails) the stage shows the static
 * render of the active step.
 */
import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { buildSequenceCopy, buildSteps, hero, referenceHouse, tradeById } from "@/content";
import { getRender } from "@/content/renders";
import { Icon, Picture } from "@/components/ui";
import { getLenis } from "@/components/providers";
import { withGsap } from "@/lib/motion";
import { useFinePointer, useIsDesktop, webglAvailable } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { createStageStore, type StageStore, type StageUi } from "./lib/stageStore";
import { progressToT, stepToProgress, totalUnits } from "./lib/scrollMap";
import { CanvasBoundary } from "./CanvasBoundary";
import { StageHotspots } from "./StageHotspots";

const BuildCanvas = dynamic(() => import("./BuildCanvas"), { ssr: false, loading: () => null });

const N = buildSteps.length;
/** Scroll length per step, in viewport heights. */
const UNIT_DESKTOP = 0.85;
const UNIT_MOBILE = 0.72;
/** Scroll run of the sticky stage (reserved in CSS, so it is in the server HTML). */
const RUN_STYLE = {
  "--stage-run-m": `${(totalUnits(N) * UNIT_MOBILE * 100).toFixed(2)}svh`,
  "--stage-run-d": `${(totalUnits(N) * UNIT_DESKTOP * 100).toFixed(2)}svh`,
} as CSSProperties;

/** Clear area of the stage (not under copy or controls). Shared by posters, canvas framing and hotspots. */
const REGION =
  "left-0 right-0 top-[calc(var(--header-h)+3.5rem)] bottom-[35%] lg:left-[36%] lg:right-[1.5%] lg:top-[calc(var(--header-h)+3.25rem)] lg:bottom-[7rem]";

const btn =
  "pointer-events-auto inline-flex min-h-11 items-center gap-2 border px-3.5 t-small transition-colors duration-(--dur-base) ease-weight focus-visible:outline-offset-2";
const btnIdle = "border-line-strong bg-night/60 text-fg hover:border-fg";
const btnOn = "border-fg bg-fg text-night";

function useStageUi(store: StageStore): StageUi {
  return useSyncExternalStore(store.subscribeUi, store.getUi, store.getUi);
}

export function BuildStage({ onNoWebGL }: { onNoWebGL: () => void }) {
  const store = useMemo(() => createStageStore(N), []);
  const ui = useStageUi(store);
  const desktop = useIsDesktop();
  const fine = useFinePointer();
  const dragEnabled = desktop && fine && ui.ready && !ui.failed;

  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const regionRef = useRef<HTMLDivElement>(null);
  const fillRefs = useRef<(HTMLDivElement | null)[]>([]);
  const triggerRef = useRef<{ start: number; end: number } | null>(null);
  const [near, setNear] = useState(false);

  /*
   * Scrub. The stage is CSS-sticky inside a wrapper whose scroll length is
   * already in the server HTML, so nothing re-lays out when this attaches
   * (no pin spacer, no page-wide ScrollTrigger refresh during hydration).
   */
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const sync = (p: number) => {
      const t = progressToT(p, N);
      store.setT(t);
      const frac = (t + 0.5) / N;
      fillRefs.current.forEach((el) => {
        if (el) el.style.transform = `scaleX(${frac.toFixed(4)})`;
      });
    };
    return withGsap(({ ScrollTrigger }) => {
      const st = ScrollTrigger.create({
        trigger: wrap,
        start: "top top",
        end: "bottom bottom",
        invalidateOnRefresh: true,
        onUpdate: (self) => sync(self.progress),
        onRefresh: (self) => {
          triggerRef.current = { start: self.start, end: self.end };
          sync(self.progress);
        },
      });
      triggerRef.current = { start: st.start, end: st.end };
      sync(st.progress);
      return () => {
        st.kill();
        triggerRef.current = null;
      };
    });
  }, [store]);

  /* Load the canvas one viewport ahead; render only while on screen. */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const ahead = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          ahead.disconnect();
          if (webglAvailable()) setNear(true);
          else onNoWebGL();
        }
      },
      { rootMargin: "120% 0px 120% 0px" },
    );
    const onScreen = new IntersectionObserver((entries) => store.setVisible(entries.some((e) => e.isIntersecting)));
    ahead.observe(el);
    onScreen.observe(el);
    return () => {
      ahead.disconnect();
      onScreen.disconnect();
    };
  }, [store, onNoWebGL]);

  /* Measure the clear region (CSS decides the layout; the canvas follows). */
  useEffect(() => {
    const stage = stageRef.current;
    const region = regionRef.current;
    if (!stage || !region) return;
    const measure = () => {
      const s = stage.getBoundingClientRect();
      const r = region.getBoundingClientRect();
      store.setRegion({ x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    ro.observe(region);
    return () => ro.disconnect();
  }, [store]);

  /* A new step resets any drag. */
  useEffect(() => {
    store.setDrag(0, 0);
  }, [store, ui.active]);

  const jumpTo = useCallback(
    (i: number) => {
      const tr = triggerRef.current;
      if (!tr) return;
      const target = Math.max(0, Math.min(N - 1, i));
      const y = tr.start + (tr.end - tr.start) * stepToProgress(target, N);
      const lenis = getLenis();
      const distance = Math.abs(target - store.getUi().active);
      if (lenis) lenis.scrollTo(y, { duration: Math.min(2.4, 0.9 + 0.16 * distance) });
      else window.scrollTo({ top: y, behavior: "smooth" });
    },
    [store],
  );

  const onReady = useCallback(() => store.setUi({ ready: true }), [store]);
  const onError = useCallback(() => store.setUi({ failed: true, ready: false }), [store]);

  /* Desktop: gentle, constrained drag (no free orbit, no zoom). */
  const drag = useRef<{ id: number; x: number; y: number; az: number; el: number } | null>(null);
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragEnabled || e.button !== 0 || (e.pointerType !== "mouse" && e.pointerType !== "pen")) return;
    if ((e.target as HTMLElement).closest("button, a, [data-no-drag]")) return;
    const { dragAz, dragEl } = store.targets;
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, az: dragAz, el: dragEl };
    e.currentTarget.setPointerCapture(e.pointerId);
    store.setDrag(dragAz, dragEl, true);
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    store.setDrag(
      Math.max(-0.38, Math.min(0.38, d.az - (e.clientX - d.x) * 0.0042)),
      Math.max(-0.14, Math.min(0.1, d.el + (e.clientY - d.y) * 0.0024)),
    );
  };
  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current || drag.current.id !== e.pointerId) return;
    drag.current = null;
    store.setDrag(store.targets.dragAz, store.targets.dragEl, false);
  };

  const step = buildSteps[ui.active];
  const quality = desktop ? "high" : "low";

  return (
    <>
      <a
        href="#slik-bygger-vi-slutt"
        className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:left-gutter focus-visible:z-(--z-overlay) focus-visible:inline-flex focus-visible:min-h-11 focus-visible:items-center focus-visible:bg-snow focus-visible:px-4 focus-visible:text-night"
      >
        {buildSequenceCopy.skipLink}
      </a>

      {/* All steps and model points for screen readers (the visual panel below is decorative). */}
      <ol className="sr-only">
        {buildSteps.map((s) => (
          <li key={s.id}>
            <h3>{s.title}</h3>
            <p>{s.body}</p>
            <p>
              {buildSequenceCopy.tradesLabel}: {s.trades.map((id) => tradeById[id].name).join(", ")}
            </p>
            <dl>
              {s.hotspots.map((h) => (
                <div key={h.id}>
                  <dt>{h.label}</dt>
                  <dd>{h.text}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ol>

      <div
        ref={wrapRef}
        style={RUN_STYLE}
        className="relative [--stage-h:calc(100svh_-_var(--actionbar-h)_-_env(safe-area-inset-bottom,0px))] h-[calc(var(--stage-h)_+_var(--stage-run-m))] lg:[--stage-h:100svh] lg:h-[calc(var(--stage-h)_+_var(--stage-run-d))]"
      >
        <div
          ref={stageRef}
          data-stage=""
          data-cursor-label={dragEnabled ? "Dra" : undefined}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className={cn(
            "sticky top-0 isolate h-(--stage-h) w-full overflow-hidden bg-night select-none",
            dragEnabled && "cursor-grab active:cursor-grabbing",
          )}
        >
          <div ref={regionRef} aria-hidden="true" className={cn("pointer-events-none absolute", REGION)} />

          {/* Static renders: while the model loads, and as the fallback. */}
          {!ui.ready ? <StepPosters active={ui.active} /> : null}

          {near && !ui.failed ? (
            <div
              className={cn(
                "absolute inset-0 transition-opacity duration-[1400ms] ease-weight",
                ui.ready ? "opacity-100" : "opacity-0",
              )}
            >
              <CanvasBoundary onError={onError}>
                <BuildCanvas store={store} quality={quality} onReady={onReady} onError={onError} />
              </CanvasBoundary>
            </div>
          ) : null}

          {/* Melt the stage into the page above and below, and keep copy readable. */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[15%] bg-linear-to-b from-night via-night/70 to-transparent lg:h-[22%]" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[30%] bg-linear-to-t from-night to-transparent lg:h-[24%] lg:via-night/60" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 hidden w-[48%] bg-linear-to-r from-night via-night/75 to-transparent lg:block" />

          <StageHotspots store={store} step={step} active={ui.active} ready={ui.ready && !ui.failed} />

          {/* Top bar: credit (desktop) and view controls. */}
          <div className="pointer-events-none absolute inset-x-0 top-[calc(var(--header-h)+0.75rem)] z-(--z-raised) lg:top-[calc(var(--header-h)+1.25rem)]">
            <div className="container-page flex items-start justify-between gap-6">
              <p className="t-caption hidden max-w-[26rem] text-fg-muted lg:block">
                <span className="text-fg">{referenceHouse.credit}.</span> {referenceHouse.shortNote}
              </p>
              {ui.ready && !ui.failed ? <StageControls store={store} ui={ui} /> : null}
              {ui.failed ? (
                <p role="status" className="t-caption max-w-[22rem] text-fg-muted lg:text-right">
                  {buildSequenceCopy.webglFallback}
                </p>
              ) : null}
            </div>
          </div>

          {/* Copy panel (decorative duplicate of the sr-only list above). */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-(--z-raised) lg:inset-y-0 lg:right-auto lg:w-[38%]">
            <div className="flex h-full flex-col justify-end bg-linear-to-t from-night from-78% to-transparent px-gutter pt-16 pb-3 lg:justify-center lg:bg-none lg:pt-[calc(var(--header-h)+4.5rem)] lg:pr-0 lg:pb-[7rem] lg:pl-[max(var(--spacing-gutter),calc((100vw_-_90rem)/2_+_var(--spacing-gutter)))]">
              <StepCopy active={ui.active} />
              <MobileRail active={ui.active} onJump={jumpTo} fillRef={(el) => (fillRefs.current[0] = el)} />
            </div>
          </div>

          {/* Desktop rail. */}
          <div className="absolute inset-x-0 bottom-0 z-(--z-raised) hidden pb-7 lg:block">
            <div className="container-page">
              <DesktopRail active={ui.active} onJump={jumpTo} fillRef={(el) => (fillRefs.current[1] = el)} />
              {dragEnabled ? (
                <p className="t-caption mt-3 flex items-center justify-end gap-2 text-fg-muted" aria-hidden="true">
                  <Icon.DragHorizontal size={14} />
                  {hero.dragHint}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      <div id="slik-bygger-vi-slutt" tabIndex={-1} className="outline-none" />
    </>
  );
}

/* ------------------------------------------------------------------------------------------------ */

function StepPosters({ active }: { active: number }) {
  // Mount the active render and its neighbours; keep what has been shown.
  const [seen, setSeen] = useState<Set<number>>(() => new Set([0, 1]));
  const want = [active - 1, active, active + 1].filter((i) => i >= 0 && i < N);
  if (want.some((i) => !seen.has(i))) {
    const next = new Set(seen);
    want.forEach((i) => next.add(i));
    setSeen(next);
  }
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute [mask-composite:intersect] [mask-image:linear-gradient(to_right,transparent,#000_22%,#000_86%,transparent),linear-gradient(to_bottom,transparent,#000_14%,#000_84%,transparent)]",
        REGION,
      )}
    >
      {buildSteps.map((s, i) => {
        if (!seen.has(i)) return null;
        const asset = getRender(`step-${s.id}`);
        if (!asset) return null;
        return (
          <div
            key={s.id}
            className={cn(
              "absolute inset-0 transition-opacity duration-(--dur-slow) ease-weight",
              i === active ? "opacity-100" : "opacity-0",
            )}
          >
            <Picture asset={asset} alt="" sizes="(min-width: 64rem) 62vw, 100vw" fill />
          </div>
        );
      })}
    </div>
  );
}

function StepCopy({ active }: { active: number }) {
  return (
    <div aria-hidden="true" className="grid max-w-[32rem]">
      {buildSteps.map((s, i) => {
        const on = i === active;
        return (
          <div
            key={s.id}
            style={{ gridArea: "1 / 1" }}
            className={cn(
              "transition-[opacity,transform] ease-weight",
              on
                ? "translate-y-0 opacity-100 duration-(--dur-slower) delay-100"
                : "translate-y-3 opacity-0 duration-(--dur-base)",
            )}
          >
            <p className="t-display-s text-fg lg:t-display-m">{s.title}</p>
            <p className="t-small mt-2.5 text-fg-muted lg:t-lead lg:mt-5">{s.body}</p>
            <p className="t-caption mt-2.5 lg:t-small lg:mt-6">
              <span className="text-fg-muted">{buildSequenceCopy.tradesLabel}: </span>
              <span className="text-fg">{s.trades.map((id) => tradeById[id].name).join(", ")}</span>
            </p>
            {s.id === "installasjoner" ? (
              <p className="t-caption mt-2 text-fg-muted lg:mt-4">{buildSequenceCopy.xrayNote}</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/* Rails: step names (desktop) / segments (phone). Roving tabindex, arrows jump. */

function useRailKeys(active: number, onJump: (i: number) => void) {
  return (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const map: Record<string, number> = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: N - 1 };
    if (!(e.key in map)) return;
    e.preventDefault();
    const next = Math.max(0, Math.min(N - 1, map[e.key]));
    onJump(next);
    const list = e.currentTarget.closest("ol");
    // preventScroll: a focus scroll would cancel the smooth jump that just started.
    list?.querySelectorAll<HTMLButtonElement>("button")[next]?.focus({ preventScroll: true });
    void active;
  };
}

interface RailProps {
  active: number;
  onJump: (i: number) => void;
  fillRef: (el: HTMLDivElement | null) => void;
}

function DesktopRail({ active, onJump, fillRef }: RailProps) {
  const onKey = useRailKeys(active, onJump);
  return (
    <nav aria-label={buildSequenceCopy.rail.label} className="pointer-events-auto">
      <div aria-hidden="true" className="relative h-px bg-line">
        <div ref={fillRef} className="absolute inset-0 origin-left bg-brass" style={{ transform: "scaleX(0.045)" }} />
      </div>
      <ol className="grid grid-cols-11">
        {buildSteps.map((s, i) => {
          const on = i === active;
          return (
            <li key={s.id} className="relative flex justify-center">
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-[-3px] left-1/2 size-[7px] -translate-x-1/2 rounded-full border transition-colors duration-(--dur-base)",
                  i <= active ? "border-brass bg-brass" : "border-line-strong bg-night",
                )}
              />
              <button
                type="button"
                onClick={() => onJump(i)}
                onKeyDown={(e) => onKey(e, i)}
                tabIndex={on ? 0 : -1}
                aria-label={buildSequenceCopy.rail.jumpTo(s.title)}
                aria-current={on ? "step" : undefined}
                className={cn(
                  "mt-1 min-h-11 px-1 pt-3 text-center text-[0.75rem] leading-tight transition-colors duration-(--dur-base) xl:t-caption",
                  on ? "text-fg" : "text-fg-muted hover:text-fg",
                )}
              >
                {s.railLabel}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function MobileRail({ active, onJump, fillRef }: RailProps) {
  const onKey = useRailKeys(active, onJump);
  return (
    <nav aria-label={buildSequenceCopy.rail.label} className="pointer-events-auto mt-2 -mx-2 flex items-center gap-1 lg:hidden">
      <button
        type="button"
        onClick={() => onJump(active - 1)}
        disabled={active === 0}
        aria-label={buildSequenceCopy.rail.previous}
        className="inline-flex size-11 shrink-0 items-center justify-center text-fg disabled:text-fg-muted/50"
      >
        <Icon.ChevronLeft size={20} />
      </button>
      <div className="relative flex-1">
        <div aria-hidden="true" className="absolute inset-x-0 top-1/2 h-px bg-line">
          <div ref={fillRef} className="absolute inset-0 origin-left bg-brass" style={{ transform: "scaleX(0.045)" }} />
        </div>
        <ol className="relative grid grid-cols-11">
          {buildSteps.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onJump(i)}
                onKeyDown={(e) => onKey(e, i)}
                tabIndex={i === active ? 0 : -1}
                aria-label={buildSequenceCopy.rail.jumpTo(s.title)}
                aria-current={i === active ? "step" : undefined}
                className="flex h-11 w-full items-center justify-center"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "block rounded-full transition-[background-color,width,height] duration-(--dur-base)",
                    i === active ? "size-2.5 bg-brass" : i < active ? "size-1.5 bg-fg" : "size-1.5 bg-line-strong",
                  )}
                />
              </button>
            </li>
          ))}
        </ol>
      </div>
      <button
        type="button"
        onClick={() => onJump(active + 1)}
        disabled={active === N - 1}
        aria-label={buildSequenceCopy.rail.next}
        className="inline-flex size-11 shrink-0 items-center justify-center text-fg disabled:text-fg-muted/50"
      >
        <Icon.ChevronRight size={20} />
      </button>
    </nav>
  );
}

/* View controls: exploded view, plan cut (+ floor), day / blue hour. */

function StageControls({ store, ui }: { store: StageStore; ui: StageUi }) {
  const c = buildSequenceCopy.controls;
  return (
    <div className="pointer-events-auto flex flex-col items-end gap-2" data-no-drag="">
      <div role="group" aria-label={c.groupLabel} className="flex flex-wrap justify-end gap-1.5 lg:gap-2">
        <button
          type="button"
          aria-pressed={ui.exploded}
          aria-describedby="bygg-hint-sprengskisse"
          onClick={() => store.setUi({ exploded: !ui.exploded })}
          className={cn(btn, "max-lg:t-caption max-lg:gap-1.5 max-lg:px-2.5", ui.exploded ? btnOn : btnIdle)}
        >
          <Icon.Layers size={18} />
          {c.exploded}
        </button>
        <span id="bygg-hint-sprengskisse" className="sr-only">
          {c.explodedHint}
        </span>
        <button
          type="button"
          aria-pressed={ui.plan}
          aria-describedby="bygg-hint-plan"
          onClick={() => store.setUi({ plan: !ui.plan })}
          className={cn(btn, "max-lg:t-caption max-lg:gap-1.5 max-lg:px-2.5", ui.plan ? btnOn : btnIdle)}
        >
          <Icon.Plan size={18} />
          {c.floorPlan}
        </button>
        <span id="bygg-hint-plan" className="sr-only">
          {c.floorPlanHint}
        </span>
        <div role="group" aria-label={c.light} className="flex">
          <button
            type="button"
            aria-pressed={ui.light === "day"}
            onClick={() => store.setUi({ light: "day" })}
            className={cn(btn, "max-lg:px-3", ui.light === "day" ? btnOn : btnIdle)}
          >
            <Icon.Sun size={18} />
            <span className="max-lg:sr-only">{c.day}</span>
          </button>
          <button
            type="button"
            aria-pressed={ui.light === "bluehour"}
            onClick={() => store.setUi({ light: "bluehour" })}
            className={cn(btn, "-ml-px max-lg:px-3", ui.light === "bluehour" ? btnOn : btnIdle)}
          >
            <Icon.Moon size={18} />
            <span className="max-lg:sr-only">{c.blueHour}</span>
          </button>
        </div>
      </div>
      {ui.plan && ui.floors.length > 1 ? (
        <div role="group" aria-label={c.floorLabel} className="flex items-center gap-1.5">
          <span aria-hidden="true" className="t-caption mr-1 text-fg-muted">
            {c.floorLabel}
          </span>
          {ui.floors.map((name, i) => (
            <button
              key={name}
              type="button"
              aria-pressed={ui.floor === i}
              onClick={() => store.setUi({ floor: i })}
              className={cn(btn, "min-h-10 px-3", ui.floor === i ? btnOn : btnIdle)}
            >
              {name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
