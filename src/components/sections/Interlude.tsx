/**
 * A single wide own photo between "Alle fagene i eget firma" and "Om oss":
 * a pause in the long page, with a short caption only. Capped at the photo's
 * own width (1380 px) so it is never upscaled on large screens. The photo
 * breathes inside its frame (Pust).
 */
import { interlude } from "@/content/site";
import { getPhoto } from "@/content/photos";
import { Picture, Pust } from "@/components/ui";

export function Interlude() {
  const photo = getPhoto(interlude.photoKey);
  if (!photo) return null;
  return (
    <figure data-tone="paper" className="bg-tone pb-section-sm">
      <div className="relative mx-auto h-[62vh] max-h-[50rem] min-h-[18rem] w-full max-w-[86.25rem] overflow-hidden bg-paper-deep">
        <Pust>
          <Picture asset={photo} sizes="(min-width: 86.25rem) 86.25rem, 100vw" fill />
        </Pust>
      </div>
      <figcaption className="t-caption mx-auto mt-3 w-full max-w-[86.25rem] px-gutter text-fg-muted min-[86.25rem]:px-0">
        {interlude.caption}
      </figcaption>
    </figure>
  );
}
