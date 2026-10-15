/**
 * Tiny 1px ink glyph of a roof form, drawn from our Adria model's gable-end
 * silhouette (7.80 m wide): saltak eaves +6.03 / ridge +8.67, flatt tak
 * parapet +7.35, pulttak +5.95 → +7.45. Decorative (the radio label names the
 * roof), so it is always aria-hidden.
 */
import type { RoofType } from "@/content/types";
import { cn } from "@/lib/utils";

const OUTLINE: Record<RoofType, string> = {
  saltak: "M-3.9 0V-6.03L0 -8.67L3.9 -6.03V0",
  flatt: "M-3.9 0V-7.35H3.9V0",
  pulttak: "M-3.9 0V-5.95L3.9 -7.45V0",
};

export function RoofGlyph({ roof, className }: { roof: RoofType; className?: string }) {
  return (
    <svg
      viewBox="-4.6 -9.1 9.2 9.4"
      aria-hidden="true"
      focusable="false"
      className={cn("h-[1.15rem] w-auto", className)}
      fill="none"
      stroke="currentColor"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      <path d={OUTLINE[roof]} strokeWidth={1} vectorEffect="non-scaling-stroke" />
      <path d="M-4.6 0H4.6" strokeWidth={1} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
