/**
 * Self-hosted fonts from npm (@fontsource-variable/*), loaded through
 * next/font/local so they are fingerprinted, preloaded and get a metric-
 * matched fallback (no layout shift). No runtime Google Fonts.
 *
 * - Newsreader (opsz + wght variable): display headlines. Optical size follows
 *   font-size automatically, so large headings get the high-contrast cut.
 * - Schibsted Grotesk (wght variable): body and UI.
 * Latin subset only (covers æ ø å é).
 *
 * The files in src/fonts/ are the Fontsource latin files trimmed to the axis
 * ranges the site uses (scripts/fonts/instance-fonts.py): Newsreader wght
 * 300–400 / opsz 20–72, Schibsted Grotesk wght 400–600. That keeps ~70 KB off
 * the first load. Widen the ranges there if the type scale changes.
 */
import localFont from "next/font/local";

export const newsreader = localFont({
  src: "../fonts/newsreader-latin-display.woff2",
  weight: "300 400",
  style: "normal",
  display: "swap",
  variable: "--font-newsreader",
  adjustFontFallback: "Times New Roman",
  fallback: ["Iowan Old Style", "Times New Roman", "serif"],
});

export const schibsted = localFont({
  src: "../fonts/schibsted-grotesk-latin-text.woff2",
  weight: "400 600",
  style: "normal",
  display: "swap",
  variable: "--font-schibsted",
  adjustFontFallback: "Arial",
  fallback: ["ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "Arial", "sans-serif"],
});

export const fontVariables = `${newsreader.variable} ${schibsted.variable}`;
