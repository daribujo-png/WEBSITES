/**
 * Om oss on the home page: who we are, what we stand for and the trades we
 * have in-house. Shared blocks (values, trades) are reused on /om-oss/.
 */
import type { CSSProperties } from "react";
import { about, sectionIds, trades, values } from "@/content/site";
import { Section, MagneticButton, RevealText, Hairline } from "@/components/ui";
import { cn } from "@/lib/utils";
import { sectionStrings } from "./strings";

export function ValuesList({ headingLevel = "h3", className }: { headingLevel?: "h3" | "h4"; className?: string }) {
  const Heading = headingLevel;
  return (
    <ul className={cn("grid-page gap-y-10", className)}>
      {values.map((value, i) => (
        <li
          key={value.id}
          data-reveal="up"
          style={{ "--reveal-delay": `${(i % 3) * 110}ms` } as CSSProperties}
          className="col-span-full md:col-span-4 lg:col-span-4"
        >
          <Hairline />
          <Heading className="t-title mt-5 font-sans">{value.title}</Heading>
          <p className="t-body mt-2 max-w-[28rem] text-fg-muted">{value.body}</p>
        </li>
      ))}
    </ul>
  );
}

export function TradesList({ headingLevel = "h3", className }: { headingLevel?: "h3" | "h4"; className?: string }) {
  const Heading = headingLevel;
  return (
    <ul className={cn("border-t border-line", className)}>
      {trades.map((trade) => (
        <li key={trade.id} data-reveal="up" className="grid-page gap-y-2 border-b border-line py-6 lg:py-7">
          <Heading className="t-display-s col-span-full md:col-span-3 lg:col-span-4">{trade.name}</Heading>
          <p className="t-body col-span-full max-w-prose text-fg-muted md:col-span-5 lg:col-span-6 lg:col-start-6 lg:pt-1.5">
            {trade.body}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function AboutSection() {
  return (
    <Section id={sectionIds.about} tone="chalk" labelledBy="om-oss-title">
      <div className="grid-page gap-y-10 lg:items-end">
        <div className="col-span-full lg:col-span-7">
          <RevealText as="h2" id="om-oss-title" text={about.headline} className="t-display-l" />
        </div>
        <div className="col-span-full md:col-span-6 lg:col-span-4 lg:col-start-9 lg:pb-3">
          <p data-reveal="up" className="t-lead">
            {about.lede}
          </p>
        </div>
      </div>
      <div className="grid-page mt-12 gap-y-8 lg:mt-16">
        {about.body.map((p, i) => (
          <p
            key={i}
            data-reveal="up"
            style={{ "--reveal-delay": `${i * 110}ms` } as CSSProperties}
            className="t-body col-span-full max-w-prose text-fg-muted md:col-span-4 lg:col-span-4"
          >
            {p}
          </p>
        ))}
      </div>
      <div className="mt-10">
        <MagneticButton href="/om-oss/" variant="outline" icon="arrow">
          {sectionStrings.aboutLink}
        </MagneticButton>
      </div>

      <h3 className="t-display-m mt-24 lg:mt-36">{about.valuesTitle}</h3>
      <ValuesList headingLevel="h4" className="mt-10 lg:mt-14" />

      <h3 className="t-display-m mt-24 lg:mt-36">{about.tradesTitle}</h3>
      <TradesList headingLevel="h4" className="mt-10 lg:mt-14" />
    </Section>
  );
}
