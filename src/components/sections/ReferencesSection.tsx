/**
 * "Jobber vi har gjort" on the home page, as "Prosjektark": three loose
 * project sheets on the dark light table (the only night band on home), with
 * our own photos lying between them as clearly separate plates.
 *
 * Honesty rules (DIRECTION-adria.md §4): the sheets hold only the reference
 * text (paraphrased from byggrv.no/referanser/), a schematic sketch captioned
 * "Skisse" and the visible [MANGLER] for the missing project photos. Photos
 * are never put inside a sheet, and a plate is never captioned with a
 * reference's name or place; one line says the photos are from other jobs.
 * When the client sends photos tied to a reference (photoKeys), the first one
 * replaces that sheet's sketch and the [MANGLER] line comes off.
 *
 * Desktop: sheets drift at 0.92× the scroll and plates at 1.06× (Drift),
 * sketches draw on (Strek), photos breathe (Pust), sheets lift on hover.
 * Phones: one column, sheet, plate, sheet, plate; no drift.
 */
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { referencesCopy, sectionIds } from "@/content/site";
import { beforeAfterPairs, references } from "@/content/references";
import { getPhoto, type PhotoKey } from "@/content/photos";
import type { Reference } from "@/content/types";
import { BeforeAfter, Drift, Icon, MagneticButton, Missing, Picture, Pust, RevealText, Section } from "@/components/ui";
import { cn } from "@/lib/utils";
import { lowerFirst } from "./strings";
import { ReferenceSketch } from "./ReferenceSketch";

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

/* Prosjektark (home) ---------------------------------------------------------------------- */

/** The plates between the sheets: own photos from other jobs, each used once on the home page. */
type Plate = { kind: "pair"; pairId: string; caption: string } | { kind: "photo"; key: PhotoKey; caption: string };

const PLATES: Plate[] = [
  { kind: "pair", pairId: "gang", caption: "Ny gang, før og etter." },
  { kind: "photo", key: "firemannsbolig", caption: "Firemannsbolig." },
  { kind: "photo", key: "minigraver-skifer", caption: "Gravearbeid ved inngangen til et hus." },
];

/** Placement per row (tablet and desktop): [sheet, plate] column classes. */
const ROWS = [
  {
    sheet: "md:col-span-6 lg:col-span-5 lg:col-start-1",
    plate: "md:col-span-6 md:col-start-3 lg:col-span-6 lg:col-start-7 lg:mt-28",
  },
  {
    sheet: "md:col-span-6 lg:col-span-5 lg:col-start-8",
    plate: "md:col-span-6 md:col-start-3 lg:col-span-6 lg:col-start-1 lg:row-start-1 lg:mt-20",
  },
  {
    sheet: "md:col-span-6 lg:col-span-5 lg:col-start-2",
    // The portrait photo stays narrower so it never towers over the band.
    plate: "md:col-span-4 md:col-start-5 lg:col-span-4 lg:col-start-8 lg:mt-16",
  },
] as const;

function SheetMeta({ reference }: { reference: Reference }) {
  const rows: [string, string][] = [
    [referencesCopy.categoryLabel, reference.category],
    ...(reference.place ? ([[referencesCopy.placeLabel, reference.place]] as [string, string][]) : []),
    [referencesCopy.scopeLabel, reference.scope.map((item, i) => (i === 0 ? item : lowerFirst(item))).join(", ")],
  ];
  return (
    <dl className="t-small border-t border-line">
      {rows.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[7.5rem_1fr] gap-4 border-b border-line py-2.5">
          <dt className="text-fg-muted">{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Sheet({ reference }: { reference: Reference }) {
  const photo = reference.photoKeys.length > 0 ? getPhoto(reference.photoKeys[0]) : null;
  const titleId = `ark-${reference.id}`;
  return (
    <article
      data-tone="chalk"
      aria-labelledby={titleId}
      className="group/sheet relative border border-rule-strong p-6 transition-transform duration-(--dur-base) ease-weight focus-within:-translate-y-1.5 hover:-translate-y-1.5 motion-reduce:transform-none sm:p-8 lg:p-10"
    >
      <h3 id={titleId} className="t-display-m">
        {/* The whole sheet is the link (stretched over the article). */}
        <Link
          href={`/referanser/#ref-${reference.id}`}
          className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
        >
          {reference.title}
        </Link>
      </h3>

      {photo ? (
        <figure className="mt-8">
          <div className="relative aspect-[4/3] overflow-hidden bg-paper-deep">
            <Picture asset={photo} sizes="(min-width: 64rem) 28rem, calc(100vw - 4rem)" fill />
          </div>
          <figcaption className="t-caption mt-2 text-fg-muted">{photo.caption}</figcaption>
        </figure>
      ) : (
        <figure className="mt-8 max-w-[19rem] text-fg-muted transition-colors duration-(--dur-base) ease-weight group-hover/sheet:text-fg group-focus-within/sheet:text-fg">
          <ReferenceSketch id={reference.id} />
          <figcaption className="t-caption mt-2">{referencesCopy.sketchCaption}</figcaption>
        </figure>
      )}

      <div className="mt-8">
        <SheetMeta reference={reference} />
      </div>
      <ReferenceQuote reference={reference} className="mt-8" />
      {photo ? null : (
        <p className="t-caption mt-8 text-fg-muted">
          <Missing label={reference.missingPhotos} />
        </p>
      )}
      <p aria-hidden="true" className="t-small mt-6 inline-flex items-center gap-2 font-medium">
        <span className="link-draw">{referencesCopy.sheetLink(reference.title)}</span>
        <Icon.ArrowRight size={16} className="transition-transform duration-(--dur-slow) ease-expo group-hover/sheet:translate-x-1" />
      </p>
      {/* Focus ring for the stretched link, drawn on the sheet. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -inset-1 hidden outline-2 outline-offset-2 outline-brass group-has-[a:focus-visible]/sheet:block"
      />
    </article>
  );
}

function PlateFigure({ plate }: { plate: Plate }): ReactNode {
  const note = referencesCopy.photoNote;
  if (plate.kind === "pair") {
    const pair = beforeAfterPairs.find((p) => p.id === plate.pairId && p.source === "photo");
    const before = pair?.photoKeys ? getPhoto(pair.photoKeys.before) : null;
    const after = pair?.photoKeys ? getPhoto(pair.photoKeys.after) : null;
    if (!pair || !before || !after) return null;
    const sizes = "(min-width: 90rem) 40rem, (min-width: 64rem) 46vw, calc(100vw - 2rem)";
    return (
      <BeforeAfter
        label={pair.sliderLabel}
        beforeLabel={pair.beforeLabel}
        afterLabel={pair.afterLabel}
        aspect={`${after.width} / ${after.height}`}
        before={<Picture asset={before} sizes={sizes} fill />}
        after={<Picture asset={after} sizes={sizes} fill />}
        caption={
          <span className="t-caption block">
            {plate.caption} {note}
          </span>
        }
      />
    );
  }
  const photo = getPhoto(plate.key);
  if (!photo) return null;
  return (
    <figure>
      <div className="relative overflow-hidden bg-slate" style={{ aspectRatio: `${photo.width} / ${photo.height}` }}>
        <Pust>
          <Picture asset={photo} sizes="(min-width: 90rem) 40rem, (min-width: 64rem) 46vw, calc(100vw - 2rem)" fill />
        </Pust>
      </div>
      <figcaption className="t-caption mt-3 text-fg-muted">
        {plate.caption} {note}
      </figcaption>
    </figure>
  );
}

export function ReferencesSection() {
  return (
    <Section id={sectionIds.references} tone="night" labelledBy="referanser-title" className="overflow-x-clip">
      <header className="grid-page gap-y-6">
        <RevealText as="h2" id="referanser-title" text={referencesCopy.homeTitle} className="t-display-l col-span-full lg:col-span-8" />
        <div
          data-reveal="up"
          style={{ "--reveal-delay": "160ms" } as CSSProperties}
          className="col-span-full max-w-[36rem] md:col-span-6 lg:col-span-5"
        >
          <p className="t-lead text-fg-muted">{referencesCopy.homeLede}</p>
          <p className="t-small mt-3 text-fg-muted">{referencesCopy.homeNote}</p>
        </div>
      </header>

      <ul className="mt-16 flex flex-col gap-16 md:gap-20 lg:mt-24 lg:gap-40">
        {references.map((reference, i) => {
          const row = ROWS[i % ROWS.length];
          const plate = PLATES[i];
          return (
            <li key={reference.id} className="grid-page gap-y-10 lg:items-start">
              <Drift speed="slow" className={cn("col-span-full", row.sheet)}>
                <div data-reveal="up">
                  <Sheet reference={reference} />
                </div>
              </Drift>
              {plate ? (
                <Drift speed="fast" className={cn("col-span-full", row.plate)}>
                  <div data-reveal="up" style={{ "--reveal-delay": "120ms" } as CSSProperties}>
                    <PlateFigure plate={plate} />
                  </div>
                </Drift>
              ) : null}
            </li>
          );
        })}
      </ul>

      <div className="mt-20 lg:mt-28">
        <MagneticButton href="/referanser/" variant="accent" icon="arrow">
          {referencesCopy.allLink}
        </MagneticButton>
      </div>
    </Section>
  );
}
