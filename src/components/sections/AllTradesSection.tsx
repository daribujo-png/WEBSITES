/**
 * "Alle fagene i eget firma" (#alle-fag): the calm all-trades mention and an
 * index of all ten services, premium work first. This is the only place on
 * the home page where sprenging, grunnarbeid, VVS, elektro, maling and mur
 * are named. Each row is one link to the service page (title, one-line lede,
 * arrow; hairlines between rows, no numbering). On desktop a 4:3 render of
 * our model follows the row under the pointer or focus. Own photos are not
 * used here: on the home page each own photo appears once, elsewhere.
 */
import Link from "next/link";
import { allTradesCopy, sectionIds, servicesCopy, company, ui } from "@/content/site";
import { services } from "@/content/services";
import type { Service } from "@/content/types";
import { servicePath } from "@/lib/seo";
import { Section, MagneticButton, Picture, Icon, RevealText } from "@/components/ui";
import { resolveMedia, type MediaRef } from "./Media";
import { ServiceIndexHover } from "./ServiceIndexHover";

/** A render of our model for each service (own photos are used once elsewhere on home). */
function previewMedia(service: Service): MediaRef {
  return { kind: "render", key: `${service.renderKey}-a` };
}

export function AllTradesSection() {
  return (
    <Section id={sectionIds.allTrades} tone="paper-deep" labelledBy="alle-fag-title">
      <div className="grid-page gap-y-8 lg:items-end">
        <RevealText as="h2" id="alle-fag-title" text={allTradesCopy.title} className="t-display-l col-span-full lg:col-span-7" />
        <p data-reveal="up" className="t-lead col-span-full max-w-[34rem] md:col-span-6 lg:col-span-5 lg:col-start-8 lg:pb-3">
          {allTradesCopy.body}
        </p>
      </div>

      <ServiceIndexHover className="grid-page mt-14 items-start lg:mt-20">
        <ol aria-label={allTradesCopy.listLabel} className="col-span-full border-b border-line lg:col-span-8">
          {services.map((service) => (
            <li key={service.slug} data-row={service.slug} className="border-t border-line">
              <Link
                href={servicePath(service.slug)}
                className="group grid gap-x-8 gap-y-1 py-4 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)_auto] md:items-baseline md:py-5 lg:py-6"
              >
                <span className="t-display-s transition-colors duration-(--dur-slow) group-hover:text-fg-accent">
                  {service.title}
                </span>
                <span className="t-small text-fg-muted md:pr-4">{service.lede}</span>
                <Icon.ArrowRight
                  size={20}
                  aria-hidden="true"
                  className="hidden self-center transition-transform duration-(--dur-slow) ease-expo group-hover:translate-x-1 group-focus-visible:translate-x-1 md:block"
                />
              </Link>
            </li>
          ))}
        </ol>

        <div aria-hidden="true" className="hidden lg:col-span-4 lg:col-start-9 lg:block lg:self-stretch">
          <div className="sticky top-[calc(var(--header-h)+2.5rem)] ml-auto aspect-[4/3] w-full max-w-[22.5rem] overflow-hidden bg-paper-deep">
            {services.map((service, i) => {
              const media = resolveMedia(previewMedia(service));
              if (!media) return null;
              return (
                <div
                  key={service.slug}
                  data-preview={service.slug}
                  data-on={i === 0 ? "" : undefined}
                  className="absolute inset-0 opacity-0 transition-opacity duration-(--dur-slow) ease-expo data-on:opacity-100 motion-reduce:transition-none"
                >
                  <Picture asset={media.asset} alt="" sizes="22.5rem" fill />
                </div>
              );
            })}
          </div>
        </div>
      </ServiceIndexHover>

      <div className="mt-10 flex flex-col gap-x-10 gap-y-4 lg:mt-12 lg:flex-row lg:items-center lg:justify-between">
        <p className="t-body max-w-[40rem] text-fg-muted">
          <span className="text-fg">{servicesCopy.otherTitle}</span> {servicesCopy.otherBody}
        </p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <MagneticButton href="/tjenester/" variant="ghost" icon="arrow" className="px-0!">
            {allTradesCopy.allLink}
          </MagneticButton>
          <MagneticButton href={company.phoneHref} variant="ghost" icon="phone" aria-label={ui.callLabel} className="px-0!">
            {company.phone}
          </MagneticButton>
        </div>
      </div>
    </Section>
  );
}
