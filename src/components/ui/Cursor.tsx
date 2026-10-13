"use client";

/**
 * Quiet cursor companion: a thin ring that trails the pointer and widens
 * over interactive elements. Desktop fine pointers only, never with reduced
 * motion. The native cursor is NEVER hidden, so every control keeps its
 * normal pointer, text caret and focus behaviour.
 *
 * Optional label: <div data-cursor-label="Dra">…</div> shows a short word
 * in the ring (e.g. over the 3D canvas). Keep it to one word.
 */
import { useEffect, useRef } from "react";
import { useFinePointer, useReducedMotion } from "@/lib/hooks";

const INTERACTIVE = "a, button, [role='button'], [role='slider'], input, select, textarea, label, summary, [data-cursor]";

export function Cursor() {
  const fine = useFinePointer();
  const reduced = useReducedMotion();
  const enabled = fine && !reduced;

  const ringRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const ring = ringRef.current;
    const labelEl = labelRef.current;
    if (!enabled || !ring || !labelEl) return;

    let raf = 0;
    let x = -100;
    let y = -100;
    let tx = -100;
    let ty = -100;
    let visible = false;

    const loop = () => {
      x += (tx - x) * 0.2;
      y += (ty - y) * 0.2;
      ring.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      raf = Math.abs(tx - x) > 0.1 || Math.abs(ty - y) > 0.1 ? requestAnimationFrame(loop) : 0;
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      tx = e.clientX;
      ty = e.clientY;
      if (!visible) {
        visible = true;
        x = tx;
        y = ty;
        ring.dataset.visible = "true";
      }
      const target = e.target instanceof Element ? e.target : null;
      const labelHost = target?.closest<HTMLElement>("[data-cursor-label]");
      const interactive = target?.closest(INTERACTIVE);
      const label = labelHost?.dataset.cursorLabel ?? "";
      ring.dataset.state = label ? "label" : interactive ? "hover" : "idle";
      if (labelEl.textContent !== label) labelEl.textContent = label;
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const onLeave = () => {
      visible = false;
      ring.dataset.visible = "false";
    };
    const onDown = () => (ring.dataset.pressed = "true");
    const onUp = () => (ring.dataset.pressed = "false");

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      ref={ringRef}
      aria-hidden="true"
      data-visible="false"
      data-state="idle"
      className="group/cursor pointer-events-none fixed top-0 left-0 z-(--z-cursor) opacity-0 mix-blend-difference transition-opacity duration-(--dur-base) data-[visible=true]:opacity-100 print:hidden"
    >
      <div className="-translate-x-1/2 -translate-y-1/2">
        <div className="flex size-7 items-center justify-center rounded-full border border-snow transition-[width,height,background-color] duration-(--dur-slow) ease-expo group-data-[pressed=true]/cursor:scale-90 group-data-[state=hover]/cursor:size-12 group-data-[state=label]/cursor:size-16 group-data-[state=label]/cursor:bg-snow">
          <span
            ref={labelRef}
            className="t-caption font-medium text-night opacity-0 transition-opacity duration-(--dur-base) group-data-[state=label]/cursor:opacity-100"
          />
        </div>
      </div>
    </div>
  );
}
