/**
 * Før og etter: comparison sliders. On the home page these are the real
 * before/after photos from our own projects. Render pairs (illustrations from
 * the 3D model) are used on service pages and always carry the
 * illustration note.
 */
import { beforeAfterCopy, sectionIds } from "@/content/site";
import { beforeAfterPairs } from "@/content/references";
import { getPhoto } from "@/content/photos";
import type { BeforeAfterPair } from "@/content/types";
import type { RenderAsset } from "@/lib/images";
import { BeforeAfter, Picture, Section, SectionHeader } from "@/components/ui";
import { cn } from "@/lib/utils";
import { getRenderAsset } from "./RenderImage";

function pairAssets(pair: BeforeAfterPair): { before: RenderAsset; after: RenderAsset } | null {
  if (pair.source === "photo" && pair.photoKeys) {
    const before = getPhoto(pair.photoKeys.before);
    const after = getPhoto(pair.photoKeys.after);
    return before && after ? { before, after } : null;
  }
  if (pair.beforeKey && pair.afterKey) {
    const before = getRenderAsset(pair.beforeKey);
    const after = getRenderAsset(pair.afterKey);
    return before && after ? { before, after } : null;
  }
  return null;
}

/** True when both images of the pair exist (photos, or rendered illustrations). */
export function pairAvailable(pair: BeforeAfterPair): boolean {
  return pairAssets(pair) !== null;
}

interface PairProps {
  pair: BeforeAfterPair;
  sizes?: string;
  headingLevel?: "h3" | "h4";
  className?: string;
}

export function BeforeAfterPairFigure({ pair, sizes = "(min-width: 64rem) 45vw, calc(100vw - 2rem)", headingLevel = "h3", className }: PairProps) {
  const assets = pairAssets(pair);
  if (!assets) return null;
  const Heading = headingLevel;
  const aspect = `${assets.after.width} / ${assets.after.height}`;
  return (
    <div className={cn("flex flex-col", className)}>
      <BeforeAfter
        label={pair.sliderLabel}
        beforeLabel={pair.beforeLabel}
        afterLabel={pair.afterLabel}
        aspect={aspect}
        before={<Picture asset={assets.before} sizes={sizes} fill />}
        after={<Picture asset={assets.after} sizes={sizes} fill />}
        caption={
          <>
            <Heading className="t-title block text-fg">{pair.title}</Heading>
            <span className="mt-2 block">{pair.caption}</span>
            <span className="t-caption mt-3 block">
              {pair.source === "photo" ? beforeAfterCopy.note : beforeAfterCopy.renderNote}
            </span>
          </>
        }
      />
    </div>
  );
}

export function BeforeAfterSection() {
  const pairs = beforeAfterPairs.filter(pairAvailable);
  if (pairs.length === 0) return null;
  return (
    <Section id={sectionIds.beforeAfter} tone="chalk" labelledBy="for-etter-title">
      <SectionHeader id="for-etter-title" title={beforeAfterCopy.title} lede={beforeAfterCopy.lede} />
      <div className="grid-page mt-16 gap-y-16 lg:mt-24">
        {pairs.map((pair, i) => (
          <div
            key={pair.id}
            data-reveal="up"
            className={cn("col-span-full md:col-span-4 lg:col-span-6", i % 2 === 1 && "lg:mt-24")}
          >
            <BeforeAfterPairFigure pair={pair} />
          </div>
        ))}
      </div>
    </Section>
  );
}
