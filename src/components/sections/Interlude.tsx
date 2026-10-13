/**
 * A single wide own photo between Tjenester and "Fra tegning til nøkkel":
 * a pause in the long page, with a short caption only. Capped at the photo's
 * own width (1380 px) so it is never upscaled on large screens.
 */
import { interlude } from "@/content/site";
import { getPhoto } from "@/content/photos";
import { Picture } from "@/components/ui";
import { Parallax } from "./Parallax";

export function Interlude() {
  const photo = getPhoto(interlude.photoKey);
  if (!photo) return null;
  return (
    <figure data-tone="paper" className="bg-tone pb-section-sm">
      <div className="relative mx-auto h-[62vh] max-h-[50rem] min-h-[18rem] w-full max-w-[86.25rem] overflow-hidden bg-paper-deep">
        <Parallax amount={6} className="absolute inset-x-0 -inset-y-[9%]">
          <Picture asset={photo} sizes="(min-width: 86.25rem) 86.25rem, 100vw" fill />
        </Parallax>
      </div>
      <figcaption className="t-caption mx-auto mt-3 w-full max-w-[86.25rem] px-gutter text-fg-muted min-[86.25rem]:px-0">
        {interlude.caption}
      </figcaption>
    </figure>
  );
}
