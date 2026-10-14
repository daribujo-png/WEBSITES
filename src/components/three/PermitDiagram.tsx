"use client";

/**
 * Permit diagram for one building type: grey = the house you have, oak = the
 * new part. The render (renders.permit-<type>) is always there; on desktop a
 * small live canvas loads when the diagram is in view and fades in over it,
 * turns slowly on hover/focus and can be dragged. Phones, reduced motion,
 * WebGL failure and devices in the "off" tier (lib/gpu-tier) keep the render.
 */
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { PermitTypeId } from "@/content/types";
import { getRender } from "@/content/renders";
import { Picture } from "@/components/ui";
import { useFinePointer, useInView, useIsDesktop, useReducedMotion } from "@/lib/hooks";
import { gpuInfo } from "@/lib/gpu-tier";
import { cn } from "@/lib/utils";
import { CanvasBoundary } from "./CanvasBoundary";
import { createInputStore } from "./lib/inputStore";
import type { PermitInputState } from "./PermitCanvas";

const PermitCanvas = dynamic(() => import("./PermitCanvas"), { ssr: false, loading: () => null });

type Phase = "poster" | "loading" | "ready" | "failed";

export function PermitDiagram({ type, className }: { type: PermitTypeId; className?: string }) {
  const asset = getRender(`permit-${type}`);
  const reduced = useReducedMotion();
  const desktop = useIsDesktop();
  const fine = useFinePointer();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { rootMargin: "200px 0px" });
  const [phase, setPhase] = useState<Phase>("poster");
  const input = useMemo(() => createInputStore<PermitInputState>({ active: false, yaw: 0, dragging: false }), []);

  const allowed = !reduced && desktop && fine;
  if (phase === "poster" && allowed && inView) {
    const info = gpuInfo();
    setPhase(info.webgl && info.tier !== "off" ? "loading" : "failed");
  }
  const live = allowed && (phase === "loading" || phase === "ready");
  const ready = live && phase === "ready";
  const onReady = useCallback(() => setPhase("ready"), []);
  const onError = useCallback(() => setPhase("failed"), []);

  // Switching type keeps this diagram (and its WebGL context); only the drag pose resets.
  useEffect(() => {
    input.set({ yaw: 0 });
  }, [input, type]);

  // Hover or keyboard focus on the surrounding panel starts the slow turn.
  useEffect(() => {
    const el = ref.current;
    if (!el || !live) return;
    const host = (el.closest('[role="tabpanel"]') as HTMLElement | null) ?? el;
    let hover = false;
    let focus = false;
    const update = () => input.set({ active: hover || focus });
    let timer = 0;
    const enter = () => {
      hover = true;
      update();
    };
    const leave = () => {
      hover = false;
      update();
    };
    const fin = () => {
      focus = host.matches(":focus-within");
      update();
    };
    const fout = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(fin, 0);
    };
    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointerleave", leave);
    host.addEventListener("focusin", fin);
    host.addEventListener("focusout", fout);
    fin();
    return () => {
      window.clearTimeout(timer);
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointerleave", leave);
      host.removeEventListener("focusin", fin);
      host.removeEventListener("focusout", fout);
      input.set({ active: false });
    };
  }, [live, input]);

  const drag = useRef<{ id: number; x: number; yaw: number } | null>(null);
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!ready || e.button !== 0 || e.pointerType === "touch") return;
    drag.current = { id: e.pointerId, x: e.clientX, yaw: input.get().yaw };
    e.currentTarget.setPointerCapture(e.pointerId);
    input.set({ dragging: true });
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    input.set({ yaw: Math.max(-1.2, Math.min(1.2, d.yaw + (e.clientX - d.x) * 0.008)) });
  };
  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current || drag.current.id !== e.pointerId) return;
    drag.current = null;
    input.set({ dragging: false });
  };

  return (
    <div
      ref={ref}
      data-permit={type}
      data-ready={ready ? "" : undefined}
      data-cursor-label={ready ? "Dra" : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className={cn(
        "relative aspect-[4/3] w-full overflow-hidden bg-paper-deep",
        ready && "cursor-grab touch-pan-y select-none active:cursor-grabbing",
        className,
      )}
    >
      {/* The panel's figcaption describes the diagram, so the image is decorative here. */}
      {asset ? (
        <Picture asset={asset} alt="" sizes="(min-width: 64rem) 55vw, calc(100vw - 2rem)" fill imgClassName="object-contain" />
      ) : null}
      {live ? (
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-(--dur-slower) ease-weight",
            ready ? "opacity-100" : "opacity-0",
          )}
        >
          <CanvasBoundary onError={onError}>
            <PermitCanvas type={type} input={input} onReady={onReady} onError={onError} />
          </CanvasBoundary>
        </div>
      ) : null}
    </div>
  );
}
