/**
 * One image slot that can hold either an own client photo
 * (src/content/photos.ts) or a render of our 3D model (src/content/renders.ts).
 * Photos always win over renders. A render that has not been produced yet
 * becomes a quiet paper placeholder with a visible [MANGLER: …] note, so a
 * missing key never breaks a page.
 */
import type { CSSProperties } from "react";
import { getPhoto, ui, type PhotoKey, type Service } from "@/content";
import type { RenderAsset } from "@/lib/images";
import { Picture, MissingImage } from "@/components/ui";
import { cn } from "@/lib/utils";
import { getRenderAsset } from "./RenderImage";
import { Parallax } from "./Parallax";
import { Curtain } from "./Curtain";

export type MediaRef = { kind: "photo"; key: PhotoKey } | { kind: "render"; key: string };

/** Photos first (best first), then the service's two render views. */
export function serviceMedia(service: Service): MediaRef[] {
  return [
    ...service.photoKeys.map((key) => ({ kind: "photo" as const, key })),
    { kind: "render", key: `${service.renderKey}-a` },
    { kind: "render", key: `${service.renderKey}-b` },
  ];
}

/** True when the service has at least one own photo. */
export function hasOwnPhotos(service: Service): boolean {
  return service.photoKeys.length > 0;
}

interface ResolvedMedia {
  asset: RenderAsset;
  caption: string;
  kind: "photo" | "render";
}

export function resolveMedia(media: MediaRef): ResolvedMedia | null {
  if (media.kind === "photo") {
    const photo = getPhoto(media.key);
    return photo ? { asset: photo, caption: photo.caption, kind: "photo" } : null;
  }
  const asset = getRenderAsset(media.key);
  return asset ? { asset, caption: ui.renderNote, kind: "render" } : null;
}

interface MediaFigureProps {
  media: MediaRef;
  sizes?: string;
  /** CSS aspect-ratio of the frame; the image is cropped to fill it. */
  aspect?: string;
  /** Show the figcaption (photo caption or "Gjengivelse fra vår 3D-modell"). */
  caption?: boolean;
  /** Override the alt text (Norwegian). */
  alt?: string;
  /** LCP image of the page (eager, fetchpriority=high). */
  priority?: boolean;
  /** Curtain reveal on scroll. Default true (never for priority images). */
  reveal?: boolean;
  /** Label inside [MANGLER: …] when the image is missing. */
  missingLabel?: string;
  className?: string;
  frameClassName?: string;
  imgClassName?: string;
  /** Extra attributes for the cursor ring, e.g. data-cursor-label. */
  cursorLabel?: string;
  /** Slow scroll drift of the image inside its frame (off for reduced motion). */
  parallax?: boolean;
  style?: CSSProperties;
}

export function MediaFigure({
  media,
  sizes,
  aspect = "4 / 3",
  caption = true,
  alt,
  priority,
  reveal = true,
  missingLabel = "egne prosjektbilder",
  className,
  frameClassName,
  imgClassName,
  cursorLabel,
  parallax,
  style,
}: MediaFigureProps) {
  const resolved = resolveMedia(media);
  if (!resolved) {
    return (
      <figure className={className} style={style}>
        <MissingImage label={missingLabel} aspect={aspect} className={frameClassName} />
      </figure>
    );
  }
  return (
    <figure className={className} style={style}>
      <div
        data-reveal={reveal && !priority ? "curtain" : undefined}
        data-cursor-label={cursorLabel}
        className={cn("group/frame relative overflow-hidden bg-paper-deep", frameClassName)}
        style={{ aspectRatio: aspect }}
      >
        {reveal && !priority ? <Curtain /> : null}
        {parallax ? (
          <Parallax amount={6} className="absolute inset-x-0 -inset-y-[9%]">
            <Picture asset={resolved.asset} sizes={sizes} alt={alt} priority={priority} fill imgClassName={imgClassName} />
          </Parallax>
        ) : (
          <Picture asset={resolved.asset} sizes={sizes} alt={alt} priority={priority} fill imgClassName={imgClassName} />
        )}
      </div>
      {caption ? (
        <figcaption className="t-caption mt-3 text-fg-muted">{resolved.caption}</figcaption>
      ) : null}
    </figure>
  );
}
