/**
 * /om-oss/: who we are, values, trades, the facts we still need from the
 * client ([MANGLER]) and the honest note about the house in the 3D model
 * (our interpretation of Adria from Boligpartner).
 */
import { Fragment, type CSSProperties } from "react";
import { pageMetadata } from "@/lib/seo";
import { about, adriaHouse } from "@/content/site";
import { getHouseModel } from "@/content/house-models";
import { Section, RevealText, TextWithMissing, MagneticButton, SmartLink } from "@/components/ui";
import { CtaBand, MediaFigure, PageHero, TradesList, ValuesList } from "@/components/sections";
import { getRenderAsset } from "@/components/sections/RenderImage";
import { sectionStrings } from "@/components/sections/strings";
import { underlined } from "@/components/sections/styles";

export const metadata = pageMetadata("omOss");

/** Our own render of the finished Adria (never a supplier image here: this section is about the model). */
const TWIN_KEYS = ["adria-twin", "step-nokkelferdig"];

export default function OmOssPage() {
  const twinKey = TWIN_KEYS.find((k) => getRenderAsset(k) !== null);
  const adria = getHouseModel("adria");
  return (
    <>
      <PageHero title={about.headline} lede={about.lede} crumbs={[{ name: about.title, path: "/om-oss/" }]} />

      <Section tone="paper" spacing="bottom">
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

      {/* The house in the 3D model: our interpretation of Adria from Boligpartner. */}
      <Section id="huset-i-3d" tone="chalk" labelledBy="huset-i-3d-tittel">
        {/* Old links to /om-oss/#referansehuset land here. */}
        <span id="referansehuset" aria-hidden="true" />
        <div className="grid-page gap-y-12">
          <div className="col-span-full lg:col-span-7">
            <RevealText as="h2" id="huset-i-3d-tittel" text={adriaHouse.title} className="t-display-m" />
          </div>
          {twinKey ? (
            <MediaFigure
              media={{ kind: "render", key: twinKey }}
              sizes="(min-width: 64rem) 55vw, calc(100vw - 2rem)"
              aspect="16 / 9"
              className="col-span-full lg:col-span-7"
            />
          ) : null}
          <div className={twinKey ? "col-span-full lg:col-span-4 lg:col-start-9" : "col-span-full lg:col-span-6"}>
            <dl className="t-small grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-t border-line pt-5">
              <dt className="text-fg-muted">{sectionStrings.houseLabels.model}</dt>
              <dd>{adriaHouse.name}</dd>
              <dt className="text-fg-muted">{sectionStrings.houseLabels.supplier}</dt>
              <dd>
                <SmartLink href={adriaHouse.supplierUrl} className={underlined}>
                  {adriaHouse.supplier}
                </SmartLink>
              </dd>
              {adria
                ? adria.facts
                    .filter((f) => f.label === "Bruksareal" || f.label === "Taktyper")
                    .map((f) => (
                      <Fragment key={f.label}>
                        <dt className="text-fg-muted">{f.label}</dt>
                        <dd>{f.value}</dd>
                      </Fragment>
                    ))
                : null}
            </dl>
            <p className="t-body mt-8">
              {adriaHouse.body} <TextWithMissing text={adriaHouse.missing} />
            </p>
            <p className="t-small mt-5 text-fg-muted">{adriaHouse.modelNote}</p>
            <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3">
              <MagneticButton href="/#slik-bygger-vi" variant="outline" icon="arrow">
                {sectionStrings.buildLink}
              </MagneticButton>
              <MagneticButton href={adriaHouse.href} variant="ghost" icon="arrow" className="px-0!">
                {adriaHouse.linkLabel}
              </MagneticButton>
            </div>
          </div>
        </div>
      </Section>

      <CtaBand tone="paper" />
    </>
  );
}
