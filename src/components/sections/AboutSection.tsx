/**
 * Om oss on the home page: who we are, three short paragraphs, a link to
 * /om-oss/ and the trades as one sentence. Values and the full trades list
 * (ValuesList, TradesList) live on /om-oss/ only.
 */
import type { CSSProperties } from "react";
import { about, sectionIds, trades, values } from "@/content/site";
import { Section, MagneticButton, RevealText, Hairline } from "@/components/ui";
import { cn } from "@/lib/utils";
import { lowerFirst, sectionStrings } from "./strings";

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

/** "Prosjektledelse, tømrer, elektro, VVS, maler, mur og betong og sprenging." */
function tradeSentence(): string {
  const names = trades.map((t, i) => (i === 0 ? t.name : lowerFirst(t.name)));
  return `${names.slice(0, -1).join(", ")} og ${names[names.length - 1]}.`;
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

      <p data-reveal="up" className="t-lead mt-16 max-w-[52rem] border-t border-line pt-8 lg:mt-24">
        <span className="text-fg-muted">{about.tradesTitle}: </span>
        {tradeSentence()}
      </p>
    </Section>
  );
}
