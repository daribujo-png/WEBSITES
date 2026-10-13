/**
 * Render a key from the generated render manifest (src/content/renders.ts,
 * written by the MODEL agent). Missing keys never break a page: they become a
 * tasteful paper placeholder with a visible [MANGLER: …] note.
 */
import * as manifestModule from "@/content/renders";
import type { RenderAsset, RenderManifest } from "@/lib/images";
import { Picture, MissingImage } from "@/components/ui";
import { cn } from "@/lib/utils";

const mod = manifestModule as unknown as Record<string, unknown>;
const manifest = (mod.renders ?? mod.renderManifest ?? mod.manifest ?? mod.default ?? {}) as RenderManifest;

/** The manifest entry for `key`, or null when it has not been rendered yet. */
export function getRenderAsset(key: string): RenderAsset | null {
  const asset = manifest[key];
  if (!asset || !asset.sources) return null;
  if (asset.sources.avif.length === 0 && asset.sources.webp.length === 0) return null;
  return asset;
}

interface RenderImageProps {
  renderKey: string;
  sizes?: string;
  /** Override the manifest alt text (Norwegian). */
  alt?: string;
  /** Fallback label inside [MANGLER: …] when the render is missing. */
  missingLabel?: string;
  /** CSS aspect-ratio for the frame (keeps the layout stable). */
  aspect?: string;
  priority?: boolean;
  /** Curtain reveal on scroll. */
  reveal?: boolean;
  /** Fill the parent instead of keeping the frame aspect. */
  fill?: boolean;
  className?: string;
  imgClassName?: string;
}

export function RenderImage({
  renderKey,
  sizes,
  alt,
  missingLabel = "bilde",
  aspect = "4 / 3",
  priority,
  reveal = true,
  fill,
  className,
  imgClassName,
}: RenderImageProps) {
  const asset = getRenderAsset(renderKey);
  if (!asset) {
    return (
      <MissingImage
        label={missingLabel}
        aspect={fill ? undefined : aspect}
        className={cn(fill && "absolute inset-0 h-full w-full", className)}
      />
    );
  }
  return (
    <div
      data-reveal={reveal && !priority ? "media" : undefined}
      className={cn("relative overflow-hidden bg-paper-deep", fill && "absolute inset-0", className)}
      style={fill ? undefined : { aspectRatio: aspect }}
    >
      <Picture
        asset={asset}
        sizes={sizes}
        alt={alt}
        priority={priority}
        fill
        imgClassName={imgClassName}
      />
    </div>
  );
}
