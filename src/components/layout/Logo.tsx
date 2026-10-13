/**
 * The client's own logo (outlined paths from logo-byggrenovering-vest.svg).
 * Shown in one colour that follows the band (ink on paper, snow on night),
 * the same shapes as the original with the red accent folded into the text
 * colour so it sits in the restrained palette. Set --logo-accent on a parent
 * to bring a second colour back.
 */
import { brandLogo } from "@/content/brand";
import { cn } from "@/lib/utils";

const accentPath = brandLogo.accent.join("");
const inkPath = brandLogo.ink.join("");
const markAccent = brandLogo.mark.accent.join("");
const markInk = brandLogo.mark.ink.join("");

interface LogoProps {
  className?: string;
  /** Accessible name. Omit when the parent link already has one (decorative). */
  title?: string;
  /** Only the roof mark, without the letters. */
  markOnly?: boolean;
}

export function Logo({ className, title, markOnly }: LogoProps) {
  const labelled = Boolean(title);
  return (
    <svg
      viewBox={markOnly ? brandLogo.mark.viewBox : brandLogo.viewBox}
      role={labelled ? "img" : undefined}
      aria-label={labelled ? title : undefined}
      aria-hidden={labelled ? undefined : true}
      focusable="false"
      className={cn("block h-7 w-auto shrink-0", className)}
    >
      <path d={markOnly ? markAccent : accentPath} fill="var(--logo-accent, currentColor)" />
      <path d={markOnly ? markInk : inkPath} fill="currentColor" />
    </svg>
  );
}
