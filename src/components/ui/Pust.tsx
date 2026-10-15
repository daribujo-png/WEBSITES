import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Pust (breath): the photo inside a frame settles from scale 1.06 to 1.00 and
 * drifts ±4 % in Y while the frame crosses the viewport (DESIGN.md §4).
 *
 * Put it inside a frame that is `relative overflow-hidden` with a fixed
 * aspect ratio, and give it a `fill` image:
 *
 *   <div className="relative aspect-[4/3] overflow-hidden">
 *     <Pust><Picture asset={photo} fill /></Pust>
 *   </div>
 *
 * Pure CSS (scroll-driven animation in globals.css): no JS, no scroll
 * listeners, runs on the compositor. Off for reduced motion and in browsers
 * without `animation-timeline`, where the photo simply rests. Never on the
 * hero's LCP photo.
 */
export function Pust({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("pust absolute inset-x-0 -inset-y-[5%]", className)}>{children}</div>;
}

/**
 * Drift: a loose sheet or plate on a light table. `speed="slow"` lags the
 * scroll (0.92×), `"fast"` leads it (1.06×), ±6 vh. Desktop only, off for
 * reduced motion. Never put it on the same element as a `data-reveal`
 * (both use transform): wrap instead.
 */
export function Drift({
  children,
  speed,
  className,
}: {
  children: ReactNode;
  speed: "slow" | "fast";
  className?: string;
}) {
  return <div className={cn(speed === "slow" ? "drift-slow" : "drift-fast", className)}>{children}</div>;
}
