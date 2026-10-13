/** /tjenester/: every service as a card, then how we work and a way in. */
import type { CSSProperties } from "react";
import { pageMetadata } from "@/lib/seo";
import { cta, servicesCopy } from "@/content/site";
import { services } from "@/content/services";
import { Section, MagneticButton } from "@/components/ui";
import { CtaBand, PageHero, ProcessSection, ServiceCard } from "@/components/sections";
import { cn } from "@/lib/utils";

export const metadata = pageMetadata("tjenester");

export default function TjenesterPage() {
  return (
    <>
      <PageHero
        title={servicesCopy.indexTitle}
        lede={servicesCopy.indexLede}
        crumbs={[{ name: servicesCopy.title, path: "/tjenester/" }]}
      >
        <MagneticButton href="/kontakt/" icon="arrow" className="text-left whitespace-normal!">
          {cta.primary}
        </MagneticButton>
      </PageHero>

      <Section tone="paper" spacing="bottom">
        <ul className="grid-page gap-y-16 border-t border-line pt-14 md:gap-y-20 lg:pt-20">
          {services.map((service, i) => (
            <li
              key={service.slug}
              // The first card is the LCP element on load: shown at once, not revealed.
              data-reveal={i === 0 ? undefined : "up"}
              style={{ "--reveal-delay": `${(i % 2) * 120}ms` } as CSSProperties}
              className={cn(
                "col-span-full md:col-span-4 lg:col-span-5",
                i % 2 === 0 ? "lg:col-start-1" : "md:mt-24 lg:col-start-8 lg:mt-40",
              )}
            >
              <ServiceCard service={service} headingLevel="h2" priority={i === 0} sizes="(min-width: 90rem) 35rem, (min-width: 64rem) 40vw, (min-width: 48rem) 45vw, calc(100vw - 2rem)" />
            </li>
          ))}
        </ul>
      </Section>

      <ProcessSection ctaHref="/kontakt/" />

      <CtaBand title={servicesCopy.otherTitle} body={servicesCopy.otherBody} projectType="annet" tone="paper" />
    </>
  );
}
