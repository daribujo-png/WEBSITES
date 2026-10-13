/**
 * /tjenester/<slug>/: one page per service, prerendered for every slug in
 * src/content/services.ts. Own photos come first; renders of our 3D model
 * fill in where we have no photo yet (and say so).
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { company, servicesCopy, tradeById, ui } from "@/content/site";
import { getService, legacyRedirects, services } from "@/content/services";
import { renderBeforeAfterPairs } from "@/content/references";
import type { ServiceSlug } from "@/content/types";
import { serviceMetadata, servicePath } from "@/lib/seo";
import { serviceJsonLd } from "@/lib/jsonld";
import { JsonLd, MagneticButton, Section, TextWithMissing, Hairline, RevealText } from "@/components/ui";
import { PrefillLink } from "@/components/forms/PrefillLink";
import {
  BeforeAfterPairFigure,
  CtaBand,
  LegacyRedirect,
  legacyMetadata,
  MediaFigure,
  PageHero,
  ServiceCard,
  hasOwnPhotos,
  pairAvailable,
  resolveMedia,
  serviceMedia,
} from "@/components/sections";
import { lowerFirst, sectionStrings } from "@/components/sections/strings";
import { underlined } from "@/components/sections/styles";

export const dynamicParams = false;

/** Old /tjenester/<slug>/ addresses on byggrv.no that now live elsewhere. */
const legacyBySlug = new Map(
  legacyRedirects
    .filter((r) => r.from.startsWith("/tjenester/"))
    .map((r) => [r.from.split("/")[2], r.to] as const),
);

export function generateStaticParams() {
  return [...services.map((s) => ({ slug: s.slug })), ...[...legacyBySlug.keys()].map((slug) => ({ slug }))];
}

export async function generateMetadata({ params }: PageProps<"/tjenester/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const legacyTo = legacyBySlug.get(slug);
  if (legacyTo) return legacyMetadata(legacyTo);
  const service = getService(slug);
  return service ? serviceMetadata(service) : {};
}

function legacyLabel(to: string) {
  const target = services.find((s) => servicePath(s.slug) === to);
  return target ? target.title : servicesCopy.indexTitle;
}

/** Render illustrations that fit a service without own photos. */
const ILLUSTRATION_FOR: Partial<Record<ServiceSlug, string>> = {
  "ny-bolig": "ba-1",
  maling: "ba-2",
  "oppussing-av-bad": "ba-3",
};

function relatedServices(slug: ServiceSlug, count = 3) {
  const i = services.findIndex((s) => s.slug === slug);
  return Array.from({ length: count }, (_, k) => services[(i + k + 1) % services.length]);
}

export default async function ServicePage({ params }: PageProps<"/tjenester/[slug]">) {
  const { slug } = await params;
  const legacyTo = legacyBySlug.get(slug);
  if (legacyTo) return <LegacyRedirect to={legacyTo} label={legacyLabel(legacyTo)} />;
  const service = getService(slug);
  if (!service) notFound();

  const media = serviceMedia(service);
  const [lead, second] = media;
  const gallery = media.slice(2).filter((m) => resolveMedia(m) !== null);
  const ownPhotos = hasOwnPhotos(service);
  const illustrationId = ILLUSTRATION_FOR[service.slug];
  const illustration = illustrationId
    ? renderBeforeAfterPairs.find((p) => p.id === illustrationId && pairAvailable(p))
    : undefined;
  const [firstParagraph, ...restParagraphs] = service.body;
  const missingLabel = `bilder av ${service.title.toLowerCase()}`;
  const leadIsLarge = (resolveMedia(lead)?.asset.width ?? 0) >= 1400;
  const imagesNote =
    service.slug === "oppussing-av-bad"
      ? servicesCopy.imagesNote.replace("[MANGLER: egne prosjektbilder]", "[MANGLER: egne badbilder]")
      : servicesCopy.imagesNote;

  return (
    <>
      <JsonLd data={serviceJsonLd(service)} />
      <PageHero
        title={service.title}
        lede={service.lede}
        crumbs={[
          { name: servicesCopy.title, path: "/tjenester/" },
          { name: service.title, path: servicePath(service.slug) },
        ]}
      >
        <PrefillLink value={service.slug} variant="solid" className="text-left whitespace-normal!">
          {service.cta}
        </PrefillLink>
        <MagneticButton href={company.phoneHref} variant="ghost" icon="phone" aria-label={ui.callLabel} className="px-0!">
          {company.phone}
        </MagneticButton>
      </PageHero>

      {/* Image set. Sources narrower than 1600 px (all photos so far) stay at
          5 of 12 columns so they are never shown larger than they are. */}
      <Section tone="paper" spacing="none" aria-label={`${sectionStrings.imagesTitle} av ${lowerFirst(service.title)}`}>
        <div className="grid-page gap-y-8 lg:items-end">
          <MediaFigure
            media={lead}
            priority
            sizes={
              leadIsLarge
                ? "(min-width: 90rem) 49rem, (min-width: 64rem) 55vw, calc(100vw - 2rem)"
                : "(min-width: 90rem) 34rem, (min-width: 64rem) 40vw, calc(100vw - 2rem)"
            }
            aspect="4 / 3"
            missingLabel={missingLabel}
            className={leadIsLarge ? "col-span-full lg:col-span-7" : "col-span-full md:col-span-6 lg:col-span-5"}
          />
          <MediaFigure
            media={second}
            sizes="(min-width: 90rem) 26rem, (min-width: 64rem) 30vw, 60vw"
            aspect="4 / 5"
            missingLabel={missingLabel}
            className={
              leadIsLarge
                ? "col-span-3 col-start-2 md:col-span-4 md:col-start-5 lg:col-span-4 lg:col-start-9"
                : "col-span-3 col-start-2 md:col-span-4 md:col-start-5 lg:col-span-4 lg:col-start-8"
            }
          />
        </div>
        {!ownPhotos ? (
          <p className="t-small mt-6 max-w-prose text-fg-muted">
            <TextWithMissing text={imagesNote} />
          </p>
        ) : null}
      </Section>

      {/* What we do */}
      <Section tone="paper" labelledBy="om-tjenesten">
        <div className="grid-page gap-y-14">
          <div className="col-span-full lg:col-span-7 lg:col-start-6 lg:row-start-1">
            <h2 id="om-tjenesten" className="sr-only">
              {sectionStrings.aboutServiceTitle}
            </h2>
            <p data-reveal="up" className="t-lead">
              <TextWithMissing text={firstParagraph} />
            </p>
            {restParagraphs.map((p, i) => (
              <p
                key={i}
                data-reveal="up"
                style={{ "--reveal-delay": `${(i + 1) * 100}ms` } as CSSProperties}
                className="t-body mt-6 max-w-prose text-fg-muted"
              >
                <TextWithMissing text={p} />
              </p>
            ))}
            {service.permitRelevant ? (
              <p className="t-body mt-8 max-w-prose border-l border-fg-accent pl-5">
                {servicesCopy.permitNote}{" "}
                <Link href="/#byggesoknad" className={underlined}>
                  {sectionStrings.permitLink}
                </Link>
              </p>
            ) : null}

            {service.terms ? (
              <div className="mt-16">
                <h2 className="t-display-s">{sectionStrings.termsTitle}</h2>
                <dl className="mt-6 border-t border-line">
                  {service.terms.map((t) => (
                    <div key={t.term} className="grid gap-1 border-b border-line py-4 sm:grid-cols-[11rem_1fr] sm:gap-6">
                      <dt className="t-small font-medium">{t.term}</dt>
                      <dd className="t-small text-fg-muted">{t.definition}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}
          </div>

          <aside className="col-span-full lg:col-span-4 lg:col-start-1 lg:row-start-1" aria-label={sectionStrings.includesTitle}>
            <div className="lg:sticky lg:top-[calc(var(--header-h)+2.5rem)]">
              <h2 className="t-display-s">{sectionStrings.includesTitle}</h2>
              <ul className="t-body mt-6 border-t border-line">
                {service.includes.map((item) => (
                  <li key={item} className="border-b border-line py-3">
                    {item}
                  </li>
                ))}
              </ul>
              <h2 className="t-title mt-12 font-sans">{sectionStrings.tradesTitle}</h2>
              <ul className="t-small mt-4 grid grid-cols-2 gap-x-6 border-t border-line">
                {service.trades.map((id) => (
                  <li key={id} className="border-b border-line py-2.5 text-fg-muted">
                    {tradeById[id].name}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </Section>

      {/* More images (photos beyond the first two, then renders) */}
      {gallery.length > 0 ? (
        <Section tone="paper" spacing="bottom" aria-label={sectionStrings.moreImagesTitle}>
          <Hairline className="mb-14" />
          <div className="grid-page gap-y-12">
            {gallery.map((m, i) => (
              <MediaFigure
                key={`${m.kind}-${m.key}`}
                media={m}
                sizes="(min-width: 64rem) 45vw, calc(100vw - 2rem)"
                aspect="4 / 3"
                className={i % 2 === 0 ? "col-span-full md:col-span-4 lg:col-span-6" : "col-span-full md:col-span-4 lg:col-span-5 lg:col-start-8 lg:mt-24"}
              />
            ))}
          </div>
        </Section>
      ) : null}

      {/* Illustration slider for services without own before/after photos */}
      {illustration ? (
        <Section tone="chalk" spacing="sm" labelledBy="illustrasjon-tittel">
          <div className="grid-page gap-y-10">
            <div className="col-span-full lg:col-span-4">
              <RevealText as="h2" id="illustrasjon-tittel" text={sectionStrings.illustrationTitle} className="t-display-m" />
            </div>
            <div className="col-span-full lg:col-span-7 lg:col-start-6">
              <BeforeAfterPairFigure pair={illustration} />
            </div>
          </div>
        </Section>
      ) : null}

      {/* Related services */}
      <Section tone="paper" spacing="sm" labelledBy="andre-tjenester">
        <div className="flex flex-wrap items-end justify-between gap-6 border-t border-line pt-12">
          <h2 id="andre-tjenester" className="t-display-m">
            {servicesCopy.relatedTitle}
          </h2>
          <MagneticButton href="/tjenester/" variant="ghost" icon="arrow" className="px-0!">
            {servicesCopy.allLink}
          </MagneticButton>
        </div>
        <ul className="grid-page mt-12 gap-y-14">
          {relatedServices(service.slug).map((s) => (
            <li key={s.slug} className="col-span-full md:col-span-4 lg:col-span-4">
              <ServiceCard service={s} headingLevel="h3" />
            </li>
          ))}
        </ul>
      </Section>

      <CtaBand projectType={service.slug} label={service.cta} />
    </>
  );
}
