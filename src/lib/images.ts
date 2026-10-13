/**
 * Image types shared with the generated render manifest
 * (src/content/renders.ts, written by the MODEL agent) and the client photo
 * pipeline (public/images/byggrv/). Render with <Picture asset={…} />.
 */

export interface ImageSource {
  /** Public URL, e.g. "/renders/hero-bluehour-1600.avif". */
  src: string;
  /** Intrinsic width of this file in px. */
  w: number;
}

export interface RenderAsset {
  /** Norwegian, descriptive alt text. "" only for purely decorative images. */
  alt: string;
  /** Intrinsic size of the largest variant (sets aspect ratio, prevents CLS). */
  width: number;
  height: number;
  sources: {
    avif: ImageSource[];
    webp: ImageSource[];
  };
  /** Dominant colour ("#1a2226") or tiny base64 data URI for the blur-up. */
  placeholder: string;
}

export type RenderManifest = Record<string, RenderAsset>;

/** "a.avif 480w, b.avif 960w" */
export function toSrcSet(sources: ImageSource[]): string {
  return [...sources]
    .sort((a, b) => a.w - b.w)
    .map((s) => `${s.src} ${s.w}w`)
    .join(", ");
}

/** Largest source (used as the <img> fallback src). */
export function largestSource(sources: ImageSource[]): ImageSource | undefined {
  return [...sources].sort((a, b) => b.w - a.w)[0];
}

/** Source closest to (but not below) a target width. */
export function sourceForWidth(sources: ImageSource[], target: number): ImageSource | undefined {
  const sorted = [...sources].sort((a, b) => a.w - b.w);
  return sorted.find((s) => s.w >= target) ?? sorted[sorted.length - 1];
}

/** CSS background for the placeholder (colour or blurred data URI). */
export function placeholderStyle(placeholder: string): Record<string, string> {
  if (!placeholder) return {};
  if (placeholder.startsWith("data:")) {
    return {
      backgroundImage: `url("${placeholder}")`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }
  return { backgroundColor: placeholder };
}

/** Common `sizes` presets for the page grid. */
export const SIZES = {
  full: "100vw",
  wide: "(min-width: 112rem) 112rem, 100vw",
  page: "(min-width: 90rem) 84rem, calc(100vw - 2rem)",
  half: "(min-width: 64rem) 45vw, calc(100vw - 2rem)",
  third: "(min-width: 64rem) 30vw, (min-width: 48rem) 45vw, calc(100vw - 2rem)",
} as const;
