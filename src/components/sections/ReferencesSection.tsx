/**
 * Referanser: the three projects from byggrv.no/referanser/, paraphrased.
 * Scope only; the customer feedback is a marked paraphrase. Missing project
 * photos are shown as visible [MANGLER: …] notes, never as stand-in images.
 */
import type { CSSProperties } from "react";
import { referencesCopy, sectionIds } from "@/content/site";
import { references } from "@/content/references";
import type { Reference } from "@/content/types";
import { Section, SectionHeader, MagneticButton, Missing, Hairline } from "@/components/ui";
import { cn } from "@/lib/utils";
import { lowerFirst } from "./strings";

export function ReferenceQuote({ reference, className }: { reference: Reference; className?: string }) {
  if (!reference.quote) return null;
  return (
    <figure className={cn("border-l border-fg-accent pl-5", className)}>
      <blockquote className="font-display text-[1.375rem] leading-[1.35] font-light tracking-[-0.01em]">
        <p>{reference.quote.text}</p>
      </blockquote>
      <figcaption className="t-caption mt-3 text-fg-muted">
        {reference.quote.attribution}. {reference.quote.note}
      </figcaption>
    </figure>
  );
}

export function ReferenceMeta({ reference, className }: { reference: Reference; className?: string }) {
  return (
    <dl className={cn("t-small grid grid-cols-[auto_1fr] gap-x-6 gap-y-1", className)}>
      <dt className="text-fg-muted">{referencesCopy.categoryLabel}</dt>
      <dd>{reference.category}</dd>
      {reference.place ? (
        <>
          <dt className="text-fg-muted">{referencesCopy.placeLabel}</dt>
          <dd>{reference.place}</dd>
        </>
      ) : null}
      <dt className="text-fg-muted">{referencesCopy.scopeLabel}</dt>
      <dd>{reference.scope.map((item, i) => (i === 0 ? item : lowerFirst(item))).join(", ")}</dd>
    </dl>
  );
}

export function ReferencesSection() {
  return (
    <Section id={sectionIds.references} tone="paper" labelledBy="referanser-title">
      <SectionHeader id="referanser-title" title={referencesCopy.title} lede={referencesCopy.lede} />

      <ul className="grid-page mt-16 gap-y-14 lg:mt-24">
        {references.map((ref, i) => (
          <li
            key={ref.id}
            className="col-span-full flex flex-col md:col-span-4 lg:col-span-4"
            data-reveal="up"
            style={{ "--reveal-delay": `${i * 120}ms` } as CSSProperties}
          >
            <article aria-labelledby={`ref-${ref.id}`} className="flex h-full flex-col">
              <Hairline strong />
              <h3 id={`ref-${ref.id}`} className="t-display-s mt-6">
                {ref.title}
              </h3>
              <ReferenceMeta reference={ref} className="mt-5" />
              <p className="t-body mt-5 text-fg-muted">{ref.summary}</p>
              <ReferenceQuote reference={ref} className="mt-6" />
              <p className="t-caption mt-auto pt-6 text-fg-muted">
                <Missing label={ref.missingPhotos} />
              </p>
            </article>
          </li>
        ))}
      </ul>

      <div className="mt-16 lg:mt-20">
        <MagneticButton href="/referanser/" variant="outline" icon="arrow">
          {referencesCopy.allLink}
        </MagneticButton>
      </div>
    </Section>
  );
}
