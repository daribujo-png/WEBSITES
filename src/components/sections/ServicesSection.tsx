/**
 * Tjenester on the home page: a quiet index, one row per service (no
 * numbering). Each row is a single link to the service page: the title on the
 * left, the one-line lede and an arrow on the right, hairlines between rows.
 * On desktop a 4:3 image follows the row under the pointer or focus. The full
 * presentation of each service lives on /tjenester/ and the service pages.
 *
 * Own photos that the before/after sliders already show further down the
 * page are not reused here, so every photo appears once on the home page.
 */
import Link from "next/link";
import { sectionIds, servicesCopy, company, ui } from "@/content/site";
import { services } from "@/content/services";
import type { Service } from "@/content/types";
import { servicePath } from "@/lib/seo";
import { Section, SectionHeader, MagneticButton, Picture, Icon } from "@/components/ui";
import { resolveMedia, type MediaRef } from "./Media";
import { sectionStrings } from "./strings";
import { ServiceIndexHover } from "./ServiceIndexHover";

/** Photos shown by the before/after section on the home page. */
const BEFORE_AFTER_PHOTOS = /^(gang|tilbygg)-/;

function previewMedia(service: Service): MediaRef {
  const photo = service.photoKeys.find((k) => !BEFORE_AFTER_PHOTOS.test(k));
  return photo ? { kind: "photo", key: photo } : { kind: "render", key: `${service.renderKey}-a` };
}

export function ServicesSection() {
  return (
    <Section id={sectionIds.services} tone="paper" labelledBy="tjenester-title">
      <SectionHeader id="tjenester-title" title={servicesCopy.title} lede={servicesCopy.lede} />

      <ServiceIndexHover className="grid-page mt-12 items-start lg:mt-16">
        <ol aria-label={sectionStrings.servicesListLabel} className="col-span-full border-b border-line lg:col-span-8">
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
            {servicesCopy.allLink}
          </MagneticButton>
          <MagneticButton href={company.phoneHref} variant="ghost" icon="phone" aria-label={ui.callLabel} className="px-0!">
            {company.phone}
          </MagneticButton>
        </div>
      </div>
    </Section>
  );
}
