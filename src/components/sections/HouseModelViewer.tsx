"use client";

/**
 * One house model, one image, three roofs. A "Taktype" radio group swaps the
 * supplier's images: saltak and flatt tak share the camera (garden side), so
 * that change is a plain 600 ms crossfade and only the roof seems to change;
 * pulttak shows the entrance side, so it crossfades while the incoming image
 * settles from 1.02 to 1.00. No canvas.
 *
 * The incoming image fades in on top of the outgoing one (which stays opaque
 * underneath until it is covered), so there is never a light dip mid-fade.
 *
 * Layout "split" (home): intro, radios, details and actions in a column at
 * the left, the 16:9 image sticky at the right. On phones the image moves up
 * under the intro (visual order only; it holds nothing focusable).
 * Layout "stack" (/husmodeller/<slug>/): radios above a wide image.
 */
import { useState, type ReactNode } from "react";
import type { RenderAsset } from "@/lib/images";
import type { RoofType } from "@/content/types";
import { Picture, Segmented, TextWithMissing } from "@/components/ui";
import { cn } from "@/lib/utils";
import { RoofGlyph } from "./RoofGlyph";

export interface ViewerImage {
  roof: RoofType;
  asset: RenderAsset;
  alt: string;
  caption: string;
  /** True when this image shows another side than the default one (settles in). */
  otherView: boolean;
}

interface HouseModelViewerProps {
  /** Radio group name, unique on the page. */
  name: string;
  legend: string;
  roofLabels: Record<RoofType, string>;
  roofTypes: readonly RoofType[];
  defaultRoof: RoofType;
  images: readonly ViewerImage[];
  /** Credit line under the image, e.g. "[MANGLER: …]" (rendered with TextWithMissing). */
  credit: string;
  sizes: string;
  /** Eager-load the default image (when it is the page's LCP). */
  priority?: boolean;
  layout?: "split" | "stack";
  /** Split layout: content above the radios (heading, lede, model name). */
  intro?: ReactNode;
  /** Split layout: content under the radios (facts). */
  details?: ReactNode;
  /** Split layout: links at the end of the column. */
  actions?: ReactNode;
  className?: string;
}

export function HouseModelViewer({
  name,
  legend,
  roofLabels,
  roofTypes,
  defaultRoof,
  images,
  credit,
  sizes,
  priority,
  layout = "split",
  intro,
  details,
  actions,
  className,
}: HouseModelViewerProps) {
  const available = roofTypes.filter((r) => images.some((i) => i.roof === r));
  const [state, setState] = useState<{ current: RoofType; previous: RoofType | null }>({
    current: available.includes(defaultRoof) ? defaultRoof : (available[0] ?? defaultRoof),
    previous: null,
  });
  const current = images.find((i) => i.roof === state.current) ?? images[0];

  const select = (roof: RoofType) =>
    setState((s) => (s.current === roof ? s : { current: roof, previous: s.current }));

  const radios =
    available.length > 1 ? (
      <Segmented
        name={name}
        legend={legend}
        value={state.current}
        onChange={select}
        options={available.map((r) => ({ value: r, label: roofLabels[r], icon: <RoofGlyph roof={r} /> }))}
      />
    ) : null;

  const figure = current ? (
    <figure>
      <div className="relative aspect-video overflow-hidden bg-paper-deep">
        {images.map((img) => {
          const isCurrent = img.roof === state.current;
          const isPrevious = img.roof === state.previous;
          return (
            <div
              key={img.roof}
              aria-hidden={isCurrent ? undefined : true}
              className={cn(
                "absolute inset-0 ease-glide motion-reduce:transition-none",
                isCurrent
                  ? "z-[2] scale-100 opacity-100 transition-[opacity,transform] duration-[600ms]"
                  : isPrevious
                    ? "z-[1] scale-100 opacity-100"
                    : cn("z-0 opacity-0", img.otherView ? "scale-[1.02]" : "scale-100"),
              )}
            >
              <Picture
                asset={img.asset}
                alt={isCurrent ? img.alt : ""}
                sizes={sizes}
                priority={priority && img.roof === defaultRoof}
                fill
              />
            </div>
          );
        })}
      </div>
      <figcaption className="t-caption mt-3 text-fg-muted">
        <span className="block text-fg">{current.caption}</span>
        <span className="mt-1 block">
          <TextWithMissing text={credit} />
        </span>
      </figcaption>
    </figure>
  ) : null;

  if (layout === "stack") {
    return (
      <div className={cn("flex flex-col gap-6", className)}>
        {radios ? <div className="max-w-[30rem]">{radios}</div> : null}
        {figure}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-10 lg:grid-page lg:items-start lg:gap-y-0", className)}>
      <div className="contents lg:col-span-4 lg:flex lg:flex-col lg:gap-10">
        {intro ? <div className="order-1">{intro}</div> : null}
        {radios ? <div className="order-3">{radios}</div> : null}
        {details ? <div className="order-4">{details}</div> : null}
        {actions ? <div className="order-5">{actions}</div> : null}
      </div>
      <div className="order-2 lg:sticky lg:top-[calc(var(--header-h)+2.5rem)] lg:col-span-8 lg:col-start-5">
        {figure}
      </div>
    </div>
  );
}
