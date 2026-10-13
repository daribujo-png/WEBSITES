/**
 * /om-oss/: who we are, values, trades, the facts we still need from the
 * client ([MANGLER]) and the honest note about the 3D reference house.
 */
import type { CSSProperties } from "react";
import { pageMetadata } from "@/lib/seo";
import { about, referenceHouse } from "@/content/site";
import { Section, RevealText, TextWithMissing, MagneticButton } from "@/components/ui";
import { CtaBand, MediaFigure, PageHero, TradesList, ValuesList } from "@/components/sections";
import { sectionStrings } from "@/components/sections/strings";

export const metadata = pageMetadata("omOss");

export default function OmOssPage() {
  return (
    <>
      <PageHero title={about.headline} lede={about.lede} crumbs={[{ name: about.title, path: "/om-oss/" }]} />

      <Section tone="paper" spacing="bottom" aria-label={about.title}>
        <MediaFigure
          media={{ kind: "photo", key: about.photoKey }}
          priority
          sizes="(min-width: 90rem) 84rem, calc(100vw - 2rem)"
          aspect="1380 / 800"
        />
        <div className="grid-page mt-16 gap-y-6 lg:mt-24">
          {about.body.map((p, i) => (
            <p
              key={i}
              data-reveal="up"
              style={{ "--reveal-delay": `${i * 100}ms` } as CSSProperties}
              className={
                i === 0
                  ? "t-lead col-span-full lg:col-span-6"
                  : "t-body col-span-full text-fg-muted md:col-span-4 lg:col-span-3 lg:mt-1"
              }
            >
              {p}
            </p>
          ))}
        </div>
      </Section>

      <Section tone="chalk" labelledBy="verdier">
        <RevealText as="h2" id="verdier" text={about.valuesTitle} className="t-display-l" />
        <ValuesList className="mt-14 lg:mt-20" />
      </Section>

      <Section tone="paper" labelledBy="fagene">
        <RevealText as="h2" id="fagene" text={about.tradesTitle} className="t-display-l" />
        <TradesList className="mt-14 lg:mt-20" />
      </Section>

      <Section tone="paper" spacing="bottom" labelledBy="fakta">
        <div className="grid-page gap-y-14">
          <div className="col-span-full lg:col-span-5">
            <h2 id="folkene" className="t-display-m">
              {about.teamTitle}
            </h2>
            <p className="t-body mt-6 text-fg-muted">
              <TextWithMissing text={about.teamBody} />
            </p>
          </div>
          <div className="col-span-full lg:col-span-6 lg:col-start-7">
            <h2 id="fakta" className="t-display-m">
              {about.factsTitle}
            </h2>
            <dl className="mt-8 border-t border-line">
              {about.facts.map((fact) => (
                <div key={fact.label} className="grid grid-cols-[9rem_1fr] gap-4 border-b border-line py-4 sm:grid-cols-[12rem_1fr]">
                  <dt className="t-small text-fg-muted">{fact.label}</dt>
                  <dd className="t-small">
                    <TextWithMissing text={fact.value} />
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Section>

      {/* The reference house behind the 3D model: credit + honest note. */}
      <Section id="referansehuset" tone="chalk" labelledBy="referansehuset-tittel">
        <div className="grid-page gap-y-12">
          <div className="col-span-full lg:col-span-7">
            <RevealText as="h2" id="referansehuset-tittel" text={referenceHouse.title} className="t-display-m" />
          </div>
          <MediaFigure
            media={{ kind: "render", key: "hero-day" }}
            missingLabel="3D-gjengivelse av referansehuset"
            sizes="(min-width: 64rem) 55vw, calc(100vw - 2rem)"
            aspect="16 / 10"
            className="col-span-full lg:col-span-7"
          />
          <div className="col-span-full lg:col-span-4 lg:col-start-9">
            <dl className="t-small grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-t border-line pt-5">
              <dt className="text-fg-muted">{sectionStrings.houseLabels.name}</dt>
              <dd>{referenceHouse.name}</dd>
              <dt className="text-fg-muted">{sectionStrings.houseLabels.architect}</dt>
              <dd>{referenceHouse.architect}</dd>
              <dt className="text-fg-muted">{sectionStrings.houseLabels.place}</dt>
              <dd>{referenceHouse.place}</dd>
              <dt className="text-fg-muted">{sectionStrings.houseLabels.completed}</dt>
              <dd>{referenceHouse.completed}</dd>
              <dt className="text-fg-muted">{sectionStrings.houseLabels.area}</dt>
              <dd>{referenceHouse.area}</dd>
            </dl>
            <p className="t-body mt-8">{referenceHouse.description}</p>
            <p className="t-body mt-5 border-l border-fg-accent pl-5">{referenceHouse.note}</p>
            <p className="t-small mt-5 text-fg-muted">
              {referenceHouse.modelNote} {referenceHouse.rendersNote}
            </p>
            <p className="t-caption mt-5 text-fg-muted">{referenceHouse.credit}</p>
            <div className="mt-8">
              <MagneticButton href="/#slik-bygger-vi" variant="outline" icon="arrow">
                {sectionStrings.buildLink}
              </MagneticButton>
            </div>
          </div>
        </div>
      </Section>

      <CtaBand tone="paper" />
    </>
  );
}
