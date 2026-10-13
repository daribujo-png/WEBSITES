/**
 * The client's own logo (outlined paths from logo-byggrenovering-vest.svg).
 * Shown in one colour that follows the band (ink on paper, snow on night),
 * the same shapes as the original with the red accent folded into the text
 * colour so it sits in the restrained palette. Set --logo-accent on a parent
 * to bring a second colour back.
 *
 * In the header the small second line ("VEST AS") and the underline rule are
 * hidden below 1024 px, where they would be about 5 px tall; the link around
 * the logo carries the full company name for assistive tech.
 */
import { brandLogo } from "@/content/brand";
import { cn } from "@/lib/utils";

/** ink[18…] are the letters of the second line, "VEST AS"; accent[0] is the underline rule. */
const SECOND_LINE_FROM = 18;
const inkMain = brandLogo.ink.slice(0, SECOND_LINE_FROM).join("");
const inkSecond = brandLogo.ink.slice(SECOND_LINE_FROM).join("");
const accentRule = brandLogo.accent[0];
const accentMain = brandLogo.accent.slice(1).join("");
const markAccent = brandLogo.mark.accent.join("");
const markInk = brandLogo.mark.ink.join("");

interface LogoProps {
  className?: string;
  /** Accessible name. Omit when the parent link already has one (decorative). */
  title?: string;
  /** Only the roof mark, without the letters. */
  markOnly?: boolean;
  /** "header" drops the second line and the rule below lg. */
  variant?: "header" | "footer";
}

export function Logo({ className, title, markOnly, variant = "footer" }: LogoProps) {
  const labelled = Boolean(title);
  const compact = variant === "header" ? "max-lg:hidden" : undefined;
  return (
    <svg
      viewBox={markOnly ? brandLogo.mark.viewBox : brandLogo.viewBox}
      role={labelled ? "img" : undefined}
      aria-label={labelled ? title : undefined}
      aria-hidden={labelled ? undefined : true}
      focusable="false"
      className={cn("block h-7 w-auto shrink-0", className)}
    >
      {markOnly ? (
        <>
          <path d={markAccent} fill="var(--logo-accent, currentColor)" />
          <path d={markInk} fill="currentColor" />
        </>
      ) : (
        <>
          <path d={accentMain} fill="var(--logo-accent, currentColor)" />
          <path d={accentRule} fill="var(--logo-accent, currentColor)" className={compact} />
          <path d={inkMain} fill="currentColor" />
          <path d={inkSecond} fill="currentColor" className={compact} />
        </>
      )}
    </svg>
  );
}
