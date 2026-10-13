/**
 * Self-hosted fonts from npm (@fontsource-variable/*), loaded through
 * next/font/local so they are fingerprinted, preloaded and get a metric-
 * matched fallback (no layout shift). No runtime Google Fonts.
 *
 * - Newsreader (opsz + wght variable): display headlines. Optical size follows
 *   font-size automatically, so large headings get the high-contrast cut.
 * - Schibsted Grotesk (wght variable): body and UI.
 * Latin subset only (covers æ ø å é).
 */
import localFont from "next/font/local";

export const newsreader = localFont({
  src: "../../node_modules/@fontsource-variable/newsreader/files/newsreader-latin-opsz-normal.woff2",
  weight: "200 800",
  style: "normal",
  display: "swap",
  variable: "--font-newsreader",
  adjustFontFallback: "Times New Roman",
  fallback: ["Iowan Old Style", "Times New Roman", "serif"],
});

export const schibsted = localFont({
  src: "../../node_modules/@fontsource-variable/schibsted-grotesk/files/schibsted-grotesk-latin-wght-normal.woff2",
  weight: "400 900",
  style: "normal",
  display: "swap",
  variable: "--font-schibsted",
  adjustFontFallback: "Arial",
  fallback: ["ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "Arial", "sans-serif"],
});

export const fontVariables = `${newsreader.variable} ${schibsted.variable}`;
