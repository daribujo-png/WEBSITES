/**
 * Tjenester on the home page: one repeated, monograph-like row per service
 * (no numbering). Each row: a large image and a smaller offset one (own
 * photos first, renders of our model otherwise), the title, the specific
 * lede, the first tasks we do, and two ways forward: the service page, and
 * the contact form with the project type preselected.
 */
import Link from "next/link";
import type { CSSProperties } from "react";
import { sectionIds, servicesCopy, company, ui } from "@/content/site";
import { services } from "@/content/services";
import type { Service } from "@/content/types";
import { servicePath } from "@/lib/seo";
import { Section, SectionHeader, MagneticButton } from "@/components/ui";
import { PrefillLink } from "@/components/forms/PrefillLink";
import { cn } from "@/lib/utils";
import { MediaFigure, resolveMedia, serviceMedia } from "./Media";
import { sectionStrings } from "./strings";
import { underlineOnHover } from "./styles";

const MAIN_SIZES = "(min-width: 90rem) 50rem, (min-width: 64rem) 55vw, calc(100vw - 2rem)";
const SMALL_SIZES = "(min-width: 64rem) 24vw, (min-width: 48rem) 40vw, 58vw";

function ServiceRow({ service, flip }: { service: Service; flip: boolean }) {
  const [main, second] = serviceMedia(service);
  const titleId = `tjeneste-${service.slug}`;
  const missing = `bilder av ${service.title.toLowerCase()}`;
  // One caption per image, without repeating "Gjengivelse fra vår 3D-modell".
  const captions = [...new Set([main, second].map((m) => resolveMedia(m)?.caption).filter((c): c is string => !!c))];
  return (
    <li className="border-t border-line py-14 lg:py-24">
      <article aria-labelledby={titleId} className="grid-page items-start gap-y-10">
        <div
          className={cn(
            "col-span-full lg:col-span-7 lg:row-start-1",
            flip ? "lg:col-start-6" : "lg:col-start-1",
          )}
        >
          <MediaFigure
            media={main}
            sizes={MAIN_SIZES}
            aspect="4 / 3"
            caption={false}
            parallax
            cursorLabel="Se"
            missingLabel={missing}
          />
          {/* The small image overlaps the large one; the captions sit beside it. */}
          <div className={cn("flex items-start gap-5 md:gap-8", flip && "flex-row-reverse")}>
            <ul className="t-caption min-w-0 flex-1 pt-3 text-fg-muted">
              {captions.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <MediaFigure
              media={second}
              sizes={SMALL_SIZES}
              aspect="1 / 1"
              caption={false}
              missingLabel={missing}
              className="relative -mt-[14%] w-[58%] shrink-0 md:w-[44%]"
              frameClassName="outline-[0.625rem] outline-solid outline-tone"
              style={{ "--reveal-delay": "160ms" } as CSSProperties}
            />
          </div>
        </div>

        <div
          className={cn(
            "col-span-full lg:sticky lg:top-[calc(var(--header-h)+2.5rem)] lg:col-span-4 lg:row-start-1",
            flip ? "lg:col-start-1" : "lg:col-start-9",
          )}
        >
          <h3 id={titleId} className="t-display-m">
            <Link href={servicePath(service.slug)} className={underlineOnHover}>
              {service.title}
            </Link>
          </h3>
          <p data-reveal="up" className="t-lead mt-6">
            {service.lede}
          </p>
          <ul
            data-reveal="up"
            style={{ "--reveal-delay": "120ms" } as CSSProperties}
            aria-label={servicesCopy.includesLabel}
            className="t-small mt-8 border-t border-line text-fg-muted"
          >
            {service.includes.slice(0, 4).map((item) => (
              <li key={item} className="border-b border-line py-3">
                {item}
              </li>
            ))}
          </ul>
          {service.permitRelevant ? (
            <p className="t-small mt-4 text-fg-muted">{servicesCopy.permitNote}</p>
          ) : null}
          <div
            data-reveal="up"
            style={{ "--reveal-delay": "200ms" } as CSSProperties}
            className="mt-8 flex flex-col items-start gap-3"
          >
            <MagneticButton
              href={servicePath(service.slug)}
              icon="arrow"
              className="justify-start text-left whitespace-normal!"
            >
              {sectionStrings.readMore(service.title)}
            </MagneticButton>
            <PrefillLink value={service.slug} variant="ghost" className="justify-start px-0! text-left whitespace-normal!">
              {service.cta}
            </PrefillLink>
          </div>
        </div>
      </article>
    </li>
  );
}

export function ServicesSection() {
  return (
    <Section id={sectionIds.services} tone="paper" labelledBy="tjenester-title">
      <SectionHeader id="tjenester-title" title={servicesCopy.title} lede={servicesCopy.lede} />

      <ul aria-label={sectionStrings.servicesListLabel} className="mt-16 lg:mt-24">
        {services.map((service, i) => (
          <ServiceRow key={service.slug} service={service} flip={i % 2 === 1} />
        ))}
      </ul>

      <div className="grid-page gap-y-8 border-t border-line pt-14 lg:pt-20">
        <div className="col-span-full lg:col-span-6">
          <h3 className="t-display-s">{servicesCopy.otherTitle}</h3>
          <p className="t-body mt-4 max-w-prose text-fg-muted">{servicesCopy.otherBody}</p>
        </div>
        <div className="col-span-full flex flex-wrap items-center gap-x-6 gap-y-4 lg:col-span-5 lg:col-start-8 lg:justify-end">
          <MagneticButton href="/tjenester/" variant="outline" icon="arrow">
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
