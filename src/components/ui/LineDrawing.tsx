import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

export interface Stroke {
  /** SVG path data. */
  d: string;
  /** Place in the drawing order, 0 (first) to 1 (last). */
  o: number;
  /** Optional dash pattern for a stroke that should read as dashed once drawn (e.g. a removed wall). */
  dashed?: boolean;
  /** Optional stroke width multiplier (1 = the drawing's hairline). */
  weight?: number;
}

interface LineDrawingProps {
  viewBox: string;
  strokes: readonly Stroke[];
  /** Hairline width in viewBox units (pick it so it renders at about 1 CSS px). */
  strokeWidth: number;
  /** Accessible name. Omit for a purely decorative drawing (aria-hidden). */
  label?: string;
  /** Total time over which stroke starts are spread, ms (Strek: 1200–2400). */
  span?: number;
  /** How long one stroke takes to draw, ms. */
  strokeDuration?: number;
  /** Delay before the first stroke, ms. */
  delay?: number;
  /** Draw as soon as it mounts instead of on scroll. */
  immediate?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * Strek (line): an ink drawing that draws itself on when it scrolls into view,
 * stroke by stroke in its drawing order (DESIGN.md §4). Server component: the
 * global RevealObserver flips data-revealed and CSS animates
 * stroke-dashoffset (every stroke has pathLength="1"). Without JS, and with
 * reduced motion, the drawing is simply there. Strokes use currentColor, so
 * the drawing takes the text colour of its tone.
 *
 * Dashed strokes (e.g. a wall that is taken down) cannot draw on with a dash
 * offset, so they fade in at their place in the order instead.
 */
export function LineDrawing({
  viewBox,
  strokes,
  strokeWidth,
  label,
  span = 1500,
  strokeDuration = 900,
  delay = 0,
  immediate,
  className,
  style,
}: LineDrawingProps) {
  return (
    <svg
      viewBox={viewBox}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      shapeRendering="geometricPrecision"
      data-reveal="stroke"
      data-reveal-immediate={immediate ? "" : undefined}
      className={cn("block h-auto w-full overflow-visible", className)}
      style={
        {
          "--stroke-span": `${span}ms`,
          "--stroke-dur": `${strokeDuration}ms`,
          "--reveal-delay": `${delay}ms`,
          ...style,
        } as CSSProperties
      }
    >
      {strokes.map((s, i) =>
        s.dashed ? (
          <path
            key={i}
            d={s.d}
            strokeDasharray={`${strokeWidth * 4} ${strokeWidth * 3}`}
            strokeWidth={strokeWidth * (s.weight ?? 1)}
            opacity={0.75}
            data-stroke-fade=""
            style={{ "--o": s.o.toFixed(3) } as CSSProperties}
          />
        ) : (
          <path
            key={i}
            d={s.d}
            pathLength={1}
            data-stroke=""
            strokeWidth={s.weight ? strokeWidth * s.weight : undefined}
            style={{ "--o": s.o.toFixed(3) } as CSSProperties}
          />
        ),
      )}
    </svg>
  );
}
