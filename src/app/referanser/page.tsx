/**
 * /referanser/: the three projects (paraphrased from byggrv.no/referanser/),
 * the before/after photos and a grid of photos from our own projects.
 */
import Link from "next/link";
import type { CSSProperties } from "react";
import { pageMetadata, servicePath } from "@/lib/seo";
import { beforeAfterCopy, referencesCopy } from "@/content/site";
import { beforeAfterPairs, projectPhotos, references } from "@/content/references";
import { getService } from "@/content/services";
import { getPhoto } from "@/content/photos";
import { Section, RevealText, SectionHeader, MissingImage } from "@/components/ui";
import {
  BeforeAfterPairFigure,
  CtaBand,
  MediaFigure,
  PageHero,
  ReferenceMeta,
  ReferenceQuote,
  pairAvailable,
} from "@/components/sections";
import { sectionStrings } from "@/components/sections/strings";
import { underlineOnHover } from "@/components/sections/styles";
import { cn } from "@/lib/utils";

export const metadata = pageMetadata("referanser");

export default function ReferanserPage() {
  const pairs = beforeAfterPairs.filter(pairAvailable);
  return (
    <>
      <PageHero
        title={referencesCopy.title}
        lede={referencesCopy.lede}
        crumbs={[{ name: referencesCopy.title, path: "/referanser/" }]}
      />

      <Section tone="paper" spacing="bottom" aria-label={referencesCopy.title}>
        <ul>
          {references.map((ref, i) => (
            <li key={ref.id} className="border-t border-line py-14 lg:py-20">
              <article aria-labelledby={`ref-${ref.id}`} className="grid-page gap-y-10">
                <div className={cn("col-span-full lg:col-span-6", i % 2 === 1 && "lg:col-start-7 lg:row-start-1")}>
                  {ref.photoKeys.length > 0 ? (
                    <MediaFigure media={{ kind: "photo", key: ref.photoKeys[0] }} aspect="4 / 3" sizes="(min-width: 64rem) 45vw, calc(100vw - 2rem)" />
                  ) : (
                    <MissingImage label={ref.missingPhotos} aspect="4 / 3" />
                  )}
                </div>
                <div
                  className={cn(
                    "col-span-full lg:col-span-5 lg:row-start-1",
                    i % 2 === 1 ? "lg:col-start-1" : "lg:col-start-8",
                  )}
                >
                  <RevealText as="h2" id={`ref-${ref.id}`} text={ref.title} className="t-display-m" />
                  <ReferenceMeta reference={ref} className="mt-8" />
                  <p data-reveal="up" className="t-lead mt-8">
                    {ref.summary}
                  </p>
                  <ReferenceQuote reference={ref} className="mt-10" />
                </div>
              </article>
            </li>
          ))}
        </ul>
      </Section>

      {pairs.length > 0 ? (
        <Section tone="chalk" labelledBy="for-og-etter">
          <SectionHeader id="for-og-etter" title={sectionStrings.beforeAfterTitle} lede={beforeAfterCopy.lede} />
          <div className="grid-page mt-16 gap-y-16 lg:mt-20">
            {pairs.map((pair, i) => (
              <div key={pair.id} className={cn("col-span-full md:col-span-4 lg:col-span-6", i % 2 === 1 && "lg:mt-24")}>
                <BeforeAfterPairFigure pair={pair} />
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      <Section tone="paper" labelledBy="fra-prosjektene">
        <SectionHeader id="fra-prosjektene" title={referencesCopy.photosTitle} lede={referencesCopy.photosLede} />
        <ul className="grid-page mt-16 items-start gap-y-14 lg:mt-20">
          {projectPhotos.map((item, i) => {
            const service = item.service ? getService(item.service) : undefined;
            const wide = i % 3 === 0;
            const photo = getPhoto(item.photoKey);
            const aspect = photo ? `${photo.width} / ${photo.height}` : "4 / 3";
            return (
              <li
                key={item.photoKey}
                data-reveal="up"
                style={{ "--reveal-delay": `${(i % 3) * 100}ms` } as CSSProperties}
                className={cn("col-span-full", wide ? "md:col-span-8 lg:col-span-7" : "md:col-span-4 lg:col-span-5")}
              >
                <MediaFigure
                  media={{ kind: "photo", key: item.photoKey }}
                  aspect={aspect}
                  caption={false}
                  sizes={wide ? "(min-width: 64rem) 55vw, calc(100vw - 2rem)" : "(min-width: 64rem) 40vw, (min-width: 48rem) 45vw, calc(100vw - 2rem)"}
                />
                <p className="t-small mt-3 flex flex-wrap justify-between gap-x-6 gap-y-1">
                  <span>{item.caption}</span>
                  {service ? (
                    <Link href={servicePath(service.slug)} className={cn("text-fg-muted", underlineOnHover)}>
                      {service.title}
                    </Link>
                  ) : null}
                </p>
              </li>
            );
          })}
        </ul>
      </Section>

      <CtaBand />
    </>
  );
}
