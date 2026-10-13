/**
 * Shared class strings for SECTIONS/layout components (no copy, no colours
 * outside the tokens).
 */

/** Text link whose 1px underline draws in from the left on hover/focus. */
export const underlineOnHover =
  "bg-[linear-gradient(currentColor,currentColor)] bg-no-repeat [background-position:0_100%] [background-size:0%_1px] transition-[background-size] duration-(--dur-slow) ease-expo hover:[background-size:100%_1px] focus-visible:[background-size:100%_1px]";

/** Text link that is always underlined (body copy, contact details). */
export const underlined = "underline decoration-1 underline-offset-[0.25em] hover:decoration-2";
