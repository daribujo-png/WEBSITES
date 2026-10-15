/**
 * Før og etter: one comparison slider per pair. Photo pairs are the real
 * before/after photos from our own projects (/referanser/; on the home page
 * the tilbygg pair sits in "Dette bygger vi" and the gang pair among the
 * reference sheets). Render pairs (illustrations from the 3D model) are used
 * on service pages and always carry the illustration note.
 */
import { beforeAfterCopy } from "@/content/site";
import { getPhoto } from "@/content/photos";
import type { BeforeAfterPair } from "@/content/types";
import type { RenderAsset } from "@/lib/images";
import { BeforeAfter, Picture } from "@/components/ui";
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
            <span className="t-caption mb-3 block">{beforeAfterCopy.lede}</span>
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
