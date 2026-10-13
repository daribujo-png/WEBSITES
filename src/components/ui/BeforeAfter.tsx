"use client";

/**
 * Before/after comparison. The "before" layer is clipped over the "after"
 * layer; a hairline handle splits them.
 *
 * Accessible: the handle is a focusable role="slider" (←/→ 5 %, PageUp/Down
 * 10 %, Home/End). Pointer: drag anywhere on the image. Touch keeps vertical
 * page scrolling (touch-action: pan-y). Reduced motion: no easing on jumps.
 *
 *   <BeforeAfter
 *     label="Sammenlign råbygg og ferdig hus"
 *     before={<Picture asset={renders["ba-1-for"]} fill />}
 *     after={<Picture asset={renders["ba-1-etter"]} fill />}
 *     beforeLabel="Råbygg" afterLabel="Ferdig"
 *   />
 */
import {
  useCallback,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { clamp, cn } from "@/lib/utils";
import { DragHorizontal } from "./Icons";

interface BeforeAfterProps {
  before: ReactNode;
  after: ReactNode;
  /** Accessible name of the slider. */
  label: string;
  beforeLabel?: string;
  afterLabel?: string;
  /** Start position in percent (0 = all "after", 100 = all "before"). */
  initial?: number;
  /** CSS aspect-ratio of the frame. */
  aspect?: string;
  /** Optional caption under the frame (figcaption). */
  caption?: ReactNode;
  className?: string;
}

export function BeforeAfter({
  before,
  after,
  label,
  beforeLabel = "Før",
  afterLabel = "Etter",
  initial = 50,
  aspect = "16 / 10",
  caption,
  className,
}: BeforeAfterProps) {
  const [pos, setPos] = useState(() => clamp(initial, 0, 100));
  const [dragging, setDragging] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);

  const setFromClientX = useCallback((clientX: number) => {
    const frame = frameRef.current;
    if (!frame) return;
    const r = frame.getBoundingClientRect();
    setPos(clamp(((clientX - r.left) / r.width) * 100, 0, 100));
  }, []);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    setFromClientX(e.clientX);
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setFromClientX(e.clientX);
  };
  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setDragging(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowLeft: -5, ArrowDown: -5, ArrowRight: 5, ArrowUp: 5, PageDown: -10, PageUp: 10 }[
      e.key
    ];
    if (step !== undefined) {
      e.preventDefault();
      setPos((p) => clamp(p + step, 0, 100));
    } else if (e.key === "Home") {
      e.preventDefault();
      setPos(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setPos(100);
    }
  };

  const rounded = Math.round(pos);

  return (
    <figure className={cn("relative", className)}>
      <div
        ref={frameRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        data-cursor-label="Dra"
        className={cn(
          "relative isolate w-full touch-pan-y overflow-hidden bg-paper-deep select-none",
          dragging ? "cursor-grabbing" : "cursor-ew-resize",
        )}
        style={{ aspectRatio: aspect, "--pos": `${pos}%` } as CSSProperties}
      >
        <div className="absolute inset-0">{after}</div>
        <div
          className={cn(
            "absolute inset-0 [clip-path:inset(0_calc(100%-var(--pos))_0_0)]",
            !dragging && "transition-[clip-path] duration-(--dur-base) ease-weight",
          )}
        >
          {before}
        </div>

        {/* Labels */}
        <span
          aria-hidden="true"
          className="t-caption absolute top-3 left-3 bg-night/70 px-2 py-1 text-snow backdrop-blur-sm"
        >
          {beforeLabel}
        </span>
        <span
          aria-hidden="true"
          className="t-caption absolute top-3 right-3 bg-night/70 px-2 py-1 text-snow backdrop-blur-sm"
        >
          {afterLabel}
        </span>

        {/* Divider + handle */}
        <div
          className={cn(
            "pointer-events-none absolute inset-y-0 left-(--pos) w-px -translate-x-1/2 bg-snow",
            !dragging && "transition-[left] duration-(--dur-base) ease-weight",
          )}
        >
          <div
            role="slider"
            tabIndex={0}
            aria-label={label}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={rounded}
            aria-valuetext={`${rounded} % ${beforeLabel.toLowerCase()}, ${100 - rounded} % ${afterLabel.toLowerCase()}`}
            aria-orientation="horizontal"
            onKeyDown={onKeyDown}
            data-tone="night"
            data-tone-transparent=""
            className="pointer-events-auto absolute top-1/2 left-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-snow bg-night/80 text-snow backdrop-blur-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
          >
            <DragHorizontal size={20} />
          </div>
        </div>
      </div>
      {caption ? <figcaption className="t-small mt-4 text-fg-muted">{caption}</figcaption> : null}
    </figure>
  );
}
