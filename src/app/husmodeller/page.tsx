/**
 * /husmodeller/: the house models we build (src/content/house-models.ts),
 * one row per model, then a way in for people who have their own drawings.
 * Launched with Adria from Boligpartner; more models are added only from the
 * supplier's own pages, never invented.
 */
import { pageMetadata } from "@/lib/seo";
import { houseModels, houseModelsCopy } from "@/content/house-models";
import { cta } from "@/content/site";
import { MagneticButton, RevealText, Section } from "@/components/ui";
import { CtaBand, HouseModelIndex, PageHero } from "@/components/sections";

export const metadata = pageMetadata("husmodeller");

export default function HusmodellerPage() {
  return (
    <>
      <PageHero
        title={houseModelsCopy.title}
        lede={houseModelsCopy.indexLede}
        crumbs={[{ name: houseModelsCopy.title, path: "/husmodeller/" }]}
      />

      <Section tone="paper" spacing="bottom" aria-label={houseModelsCopy.title}>
        <HouseModelIndex models={houseModels} headingLevel="h2" />
      </Section>

      <Section tone="chalk" spacing="sm" labelledBy="egne-tegninger">
        <div className="grid-page gap-y-8 lg:items-end">
          <div className="col-span-full lg:col-span-7">
            <RevealText as="h2" id="egne-tegninger" text={houseModelsCopy.ownDrawingsTitle} className="t-display-m" />
            <p data-reveal="up" className="t-lead mt-6 max-w-prose text-fg-muted">
              {houseModelsCopy.ownDrawingsBody}
            </p>
          </div>
          <div className="col-span-full flex flex-col items-start gap-3 lg:col-span-4 lg:col-start-9">
            <MagneticButton href="/tjenester/ny-bolig/" variant="outline" icon="arrow">
              {houseModelsCopy.ownDrawingsLink}
            </MagneticButton>
          </div>
        </div>
      </Section>

      <CtaBand tone="paper" projectType="ny-bolig" label={cta.primary} />
    </>
  );
}
