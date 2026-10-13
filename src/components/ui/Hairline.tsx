import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

interface HairlineProps {
  orientation?: "x" | "y";
  /** Draw in when scrolled into view (from the left / from the top). */
  draw?: boolean;
  /** UI-strength line (≥3:1) instead of the quiet decorative rule. */
  strong?: boolean;
  delay?: number;
  className?: string;
}

/**
 * 1px architectural rule in the current tone (`bg-line`). Decorative:
 * aria-hidden. For a semantic separator use <hr className="border-line" />.
 */
export function Hairline({ orientation = "x", draw, strong, delay = 0, className }: HairlineProps) {
  return (
    <span
      aria-hidden="true"
      data-reveal={draw ? "draw" : undefined}
      data-orientation={orientation}
      style={draw ? ({ "--reveal-delay": `${delay}ms` } as CSSProperties) : undefined}
      className={cn(
        "block shrink-0",
        strong ? "bg-line-strong" : "bg-line",
        orientation === "x" ? "h-px w-full origin-left" : "h-full w-px origin-top",
        className,
      )}
    />
  );
}
