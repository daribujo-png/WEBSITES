/**
 * "Husmodeller vi bygger": ready-drawn house models we build, from
 * src/content/house-models.ts (launched with Adria from Boligpartner).
 *
 * - <HouseModelsSection>  home band (#husmodeller, chalk). One model: the
 *   model name as the display line, the facts, a Taktype radio that swaps the
 *   supplier's images. Two or more: the same band becomes an index.
 * - <HouseModelIndex>     one row per model (home with 2+ models, /husmodeller/).
 * - <ModelFacts>          the facts as a <dl> with hairlines.
 * - viewerImages()        the images for <HouseModelViewer>, honouring the rights switch.
 *
 * Every supplier image carries "Bilde: <supplier>" in its caption and the
 * visible [MANGLER] for the rights agreement.
 */
import Link from "next/link";
import type { CSSProperties } from "react";
import {
  houseModels,
  houseModelsCopy,
  imageForRoof,
  resolveModelImage,
  roofLabels,
} from "@/content/house-models";
import { company, sectionIds } from "@/content/site";
import type { HouseModel } from "@/content/types";
import { houseModelPath } from "@/lib/seo";
import { Icon, MagneticButton, Picture, RevealText, Section, SmartLink, TextWithMissing } from "@/components/ui";
import { PrefillLink } from "@/components/forms/PrefillLink";
import { cn } from "@/lib/utils";
import { HouseModelViewer, type ViewerImage } from "./HouseModelViewer";

/** "Husmodell Adria fra Boligpartner. [MANGLER: …]" */
export function modelCredit(model: HouseModel): string {
  return `${model.credit}. [MANGLER: ${company.missing[model.missing as keyof typeof company.missing] ?? model.missing}]`;
}

/** The [MANGLER] line alone, for captions that already name the source. */
export function modelMissing(model: HouseModel): string {
  return `[MANGLER: ${company.missing[model.missing as keyof typeof company.missing] ?? model.missing}]`;
}

/** One image per roof type (the lead view of each), resolved through the rights switch. */
export function viewerImages(model: HouseModel): ViewerImage[] {
  const defaultView = imageForRoof(model, model.defaultRoof)?.view;
  return model.roofTypes.flatMap((roof) => {
    const image = imageForRoof(model, roof);
    const resolved = image ? resolveModelImage(image) : null;
    if (!image || !resolved) return [];
    return [
      {
        roof,
        asset: resolved.asset,
        alt: resolved.alt,
        caption: resolved.caption,
        otherView: image.view !== defaultView,
      },
    ];
  });
}

export function ModelFacts({ model, className }: { model: HouseModel; className?: string }) {
  return (
    <dl className={cn("t-small border-t border-line", className)}>
      {model.facts.map((fact) => (
        <div key={fact.label} className="grid grid-cols-[8.5rem_1fr] gap-4 border-b border-line py-2.5 sm:grid-cols-[10rem_1fr]">
          <dt className="text-fg-muted">{fact.label}</dt>
          <dd>
            {fact.href ? (
              <SmartLink href={fact.href} className="underline decoration-1 underline-offset-[0.25em] hover:decoration-2">
                {fact.value}
              </SmartLink>
            ) : (
              fact.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** A row per model: image, name, supplier and three facts. The whole row links to the model page. */
export function HouseModelIndex({ models, headingLevel = "h3" }: { models: readonly HouseModel[]; headingLevel?: "h2" | "h3" }) {
  const Heading = headingLevel;
  return (
    <ul className="border-b border-line">
      {models.map((model, i) => {
        const lead = imageForRoof(model, model.defaultRoof);
        const resolved = lead ? resolveModelImage(lead) : null;
        const facts = model.facts.filter((f) => ["Bruksareal", "Soverom", "Bad"].includes(f.label));
        const titleId = `modell-${model.slug}`;
        return (
          <li
            key={model.slug}
            data-reveal="up"
            style={{ "--reveal-delay": `${(i % 2) * 100}ms` } as CSSProperties}
            className="group/row relative grid-page gap-y-6 border-t border-line py-10 lg:items-center lg:py-14"
          >
            {resolved ? (
              <figure className="col-span-full md:col-span-4 lg:col-span-6">
                <div className="relative aspect-[4/3] overflow-hidden bg-paper-deep">
                  <Picture
                    asset={resolved.asset}
                    sizes="(min-width: 90rem) 40rem, (min-width: 64rem) 46vw, (min-width: 48rem) 45vw, calc(100vw - 2rem)"
                    fill
                    imgClassName="transition-transform duration-(--dur-slower) ease-expo group-hover/row:scale-[1.02] motion-reduce:transition-none"
                  />
                </div>
                <figcaption className="t-caption mt-3 text-fg-muted">
                  {resolved.caption} <TextWithMissing text={modelMissing(model)} />
                </figcaption>
              </figure>
            ) : null}
            <div className="col-span-full md:col-span-4 lg:col-span-5 lg:col-start-8">
              <Heading id={titleId} className="t-display-m">
                <Link href={houseModelPath(model.slug)} className="after:absolute after:inset-0 after:content-['']">
                  {model.name}
                </Link>
              </Heading>
              <p className="t-small mt-3 text-fg-muted">
                {houseModelsCopy.supplierLabel}: {model.supplier.name}
              </p>
              <dl className="t-small mt-6 border-t border-line">
                {facts.map((f) => (
                  <div key={f.label} className="grid grid-cols-[8.5rem_1fr] gap-4 border-b border-line py-2.5">
                    <dt className="text-fg-muted">{f.label}</dt>
                    <dd>{f.value}</dd>
                  </div>
                ))}
              </dl>
              <p aria-hidden="true" className="t-small mt-6 inline-flex items-center gap-2 font-medium">
                <span className="link-draw">{houseModelsCopy.seeModel(model.name)}</span>
                <Icon.ArrowRight size={16} className="transition-transform duration-(--dur-slow) ease-expo group-hover/row:translate-x-1" />
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function SingleModel({ model }: { model: HouseModel }) {
  const images = viewerImages(model);
  return (
    <HouseModelViewer
      name={`taktype-${model.slug}`}
      legend={houseModelsCopy.roofLegend}
      roofLabels={roofLabels}
      roofTypes={model.roofTypes}
      defaultRoof={model.defaultRoof}
      images={images}
      credit={modelMissing(model)}
      sizes="(min-width: 90rem) 55rem, (min-width: 64rem) 62vw, calc(100vw - 2rem)"
      intro={
        <div>
          <RevealText as="h2" id="husmodeller-title" text={houseModelsCopy.title} className="t-display-s" />
          <p data-reveal="up" className="t-body mt-5 text-fg-muted">
            {houseModelsCopy.lede}
          </p>
          <h3 id={`modell-${model.slug}`} className="t-display-l mt-10 lg:mt-14">
            {model.name}
          </h3>
          <p className="t-small mt-3">
            <TextWithMissing text={modelCredit(model)} />
          </p>
        </div>
      }
      details={<ModelFacts model={model} />}
      actions={
        <div className="flex flex-col items-start gap-3">
          <PrefillLink
            value="ny-bolig"
            message={houseModelsCopy.prefillMessage(model.name)}
            variant="solid"
            className="text-left whitespace-normal!"
          >
            {houseModelsCopy.talkAbout(model.name)}
          </PrefillLink>
          <MagneticButton href={houseModelPath(model.slug)} variant="ghost" icon="arrow">
            {houseModelsCopy.seeModel(model.name)}
          </MagneticButton>
        </div>
      }
    />
  );
}

export function HouseModelsSection() {
  if (houseModels.length === 0) return null;
  return (
    <Section id={sectionIds.houseModels} tone="chalk" labelledBy="husmodeller-title">
      {houseModels.length === 1 ? (
        <SingleModel model={houseModels[0]} />
      ) : (
        <>
          <div className="grid-page gap-y-6 lg:items-end">
            <RevealText as="h2" id="husmodeller-title" text={houseModelsCopy.title} className="t-display-l col-span-full lg:col-span-7" />
            <p data-reveal="up" className="t-lead col-span-full max-w-measure text-fg-muted md:col-span-6 lg:col-span-4 lg:col-start-9 lg:pb-3">
              {houseModelsCopy.lede}
            </p>
          </div>
          <div className="mt-14 lg:mt-20">
            <HouseModelIndex models={houseModels} />
          </div>
        </>
      )}
    </Section>
  );
}
