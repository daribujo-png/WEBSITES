import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { largestSource, placeholderStyle, toSrcSet, type RenderAsset } from "@/lib/images";

interface PictureProps {
  asset: RenderAsset;
  /** `sizes` attribute; see SIZES in @/lib/images. */
  sizes?: string;
  /** Override the manifest alt text. Pass "" only for decorative images. */
  alt?: string;
  /** LCP image: eager + fetchpriority=high. Use once per page at most. */
  priority?: boolean;
  /** Fill the parent (object-cover) instead of intrinsic aspect ratio. */
  fill?: boolean;
  className?: string;
  imgClassName?: string;
  style?: CSSProperties;
}

/**
 * Responsive <picture> with AVIF + WebP sources from the render manifest
 * (or the client photo pipeline). Static-export friendly (no next/image
 * optimiser). Width/height are always set, so there is no layout shift.
 */
export function Picture({
  asset,
  sizes = "100vw",
  alt,
  priority,
  fill,
  className,
  imgClassName,
  style,
}: PictureProps) {
  const fallback = largestSource(asset.sources.webp) ?? largestSource(asset.sources.avif);
  return (
    <picture className={cn(fill ? "absolute inset-0 block" : "block", className)} style={style}>
      {asset.sources.avif.length > 0 ? (
        <source type="image/avif" srcSet={toSrcSet(asset.sources.avif)} sizes={sizes} />
      ) : null}
      {asset.sources.webp.length > 0 ? (
        <source type="image/webp" srcSet={toSrcSet(asset.sources.webp)} sizes={sizes} />
      ) : null}
      <img
        src={fallback?.src}
        width={asset.width}
        height={asset.height}
        alt={alt ?? asset.alt}
        sizes={sizes}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        style={placeholderStyle(asset.placeholder)}
        className={cn(fill ? "h-full w-full object-cover" : "h-auto w-full", imgClassName)}
      />
    </picture>
  );
}
