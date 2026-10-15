/**
 * "Dette bygger vi": the three lead services, right under the hero. Three rows,
 * each composed differently (drawing / slider / photo), separated by hairlines
 * that draw on. Sprenging, VVS and the other trades are not marketed here;
 * they come later in "Alle fagene i eget firma".
 *
 *   Nybygg              our elevation drawing of Adria, cols 1–7 · text cols 9–12, bottom
 *   Tilbygg og påbygg   text cols 1–5, top · the real tilbygg før/etter slider, cols 7–11
 *   Tak                 own photo with Pust, cols 1–5 · text cols 7–11, middle
 *
 * Phones: every row stacks media, title, body, links.
 */
import type { CSSProperties, ReactNode } from "react";
import { leadServicesCopy, sectionIds, servicesCopy, beforeAfterCopy } from "@/content/site";
import { beforeAfterPairs } from "@/content/references";
import { getPhoto } from "@/content/photos";
import { servicePath } from "@/lib/seo";
import { BeforeAfter, Hairline, MagneticButton, Picture, Pust, RevealText, Section, SectionHeader } from "@/components/ui";
import { cn } from "@/lib/utils";
import { ElevationDrawing } from "./ElevationDrawing";
import { sectionStrings } from "./strings";

function RowText({
  id,
  title,
  body,
  children,
  className,
}: {
  id: string;
  title: string;
  body: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col", className)}>
      <RevealText as="h3" id={id} text={title} className="t-display-m" />
      <p
        data-reveal="up"
        style={{ "--reveal-delay": "140ms" } as CSSProperties}
        className="t-lead mt-5 max-w-[34rem] text-fg-muted lg:mt-7"
      >
        {body}
      </p>
      {children ? (
        <div
          data-reveal="up"
          style={{ "--reveal-delay": "240ms" } as CSSProperties}
          className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-1 lg:mt-8"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

function RowRule({ delay = 0 }: { delay?: number }) {
  return (
    <div className="col-span-full py-14 md:py-16 lg:py-24">
      <Hairline draw delay={delay} />
    </div>
  );
}

export function LeadServices() {
  const c = leadServicesCopy;
  const pair = beforeAfterPairs.find((p) => p.id === c.tilbygg.pairId && p.source === "photo");
  const before = pair?.photoKeys ? getPhoto(pair.photoKeys.before) : null;
  const after = pair?.photoKeys ? getPhoto(pair.photoKeys.after) : null;
  const roof = getPhoto(c.tak.photoKey);
  const pairSizes = "(min-width: 90rem) 33rem, (min-width: 64rem) 38vw, calc(100vw - 2rem)";

  return (
    <Section id={sectionIds.leadServices} tone="paper" labelledBy="dette-bygger-vi-title">
      <SectionHeader id="dette-bygger-vi-title" title={c.title} lede={c.lede} layout="stack" />

      <div className="grid-page mt-16 lg:mt-24">
        {/* Nybygg */}
        <article aria-labelledby="lead-nybygg" className="col-span-full grid-page gap-y-10 lg:items-end">
          <ElevationDrawing
            label={c.nybygg.drawingLabel}
            caption={c.nybygg.drawingCaption}
            sizes="(min-width: 90rem) 49rem, (min-width: 64rem) 55vw, calc(100vw - 2rem)"
            className="col-span-full lg:col-span-7"
          />
          <RowText
            id="lead-nybygg"
            title={c.nybygg.title}
            body={c.nybygg.body}
            className="col-span-full md:col-span-6 lg:col-span-4 lg:col-start-9 lg:pb-12"
          >
            <MagneticButton href={c.nybygg.link.href} variant="ghost" icon="arrow">
              {c.nybygg.link.label}
            </MagneticButton>
            <MagneticButton href={c.nybygg.modelsLink.href} variant="ghost" icon="arrow">
              {c.nybygg.modelsLink.label}
            </MagneticButton>
          </RowText>
        </article>

        <RowRule />

        {/* Tilbygg og påbygg */}
        <article aria-labelledby="lead-tilbygg" className="col-span-full grid-page gap-y-10 lg:items-start">
          {pair && before && after ? (
            <div data-reveal="up" className="col-span-full md:col-span-6 lg:col-span-5 lg:col-start-7 lg:row-start-1">
              <BeforeAfter
                label={pair.sliderLabel}
                beforeLabel={pair.beforeLabel}
                afterLabel={pair.afterLabel}
                aspect={`${after.width} / ${after.height}`}
                before={<Picture asset={before} sizes={pairSizes} fill />}
                after={<Picture asset={after} sizes={pairSizes} fill />}
                caption={
                  <span className="t-caption block">
                    {pair.caption} {beforeAfterCopy.note}
                  </span>
                }
              />
            </div>
          ) : null}
          <RowText
            id="lead-tilbygg"
            title={c.tilbygg.title}
            body={c.tilbygg.body}
            className="col-span-full md:col-span-6 lg:col-span-5 lg:col-start-1 lg:row-start-1 lg:pt-4"
          >
            <MagneticButton href={c.tilbygg.link.href} variant="ghost" icon="arrow">
              {c.tilbygg.link.label}
            </MagneticButton>
            <MagneticButton href={`${servicePath("pabygg-og-tilbygg")}#${sectionIds.permits}`} variant="ghost" icon="arrow">
              {sectionStrings.permitLink}
            </MagneticButton>
          </RowText>
        </article>

        <RowRule />

        {/* Tak */}
        <article aria-labelledby="lead-tak" className="col-span-full grid-page gap-y-10 lg:items-center">
          {roof ? (
            <figure className="col-span-full md:col-span-6 lg:col-span-5">
              <div
                className="relative overflow-hidden bg-paper-deep"
                style={{ aspectRatio: `${roof.width} / ${roof.height}` }}
              >
                <Pust>
                  <Picture asset={roof} sizes="(min-width: 90rem) 33rem, (min-width: 64rem) 38vw, calc(100vw - 2rem)" fill />
                </Pust>
              </div>
              <figcaption className="t-caption mt-3 text-fg-muted">{roof.caption}</figcaption>
            </figure>
          ) : null}
          <RowText
            id="lead-tak"
            title={c.tak.title}
            body={c.tak.body}
            className="col-span-full md:col-span-6 lg:col-span-5 lg:col-start-7"
          >
            <MagneticButton href={c.tak.link.href} variant="ghost" icon="arrow">
              {c.tak.link.label}
            </MagneticButton>
          </RowText>
        </article>

        <RowRule />

        <div className="col-span-full flex flex-col items-start gap-x-10 gap-y-3 md:flex-row md:items-center md:justify-between">
          <p data-reveal="up" className="t-lead">
            {c.closing}
          </p>
          <MagneticButton href={c.allLink.href} variant="ghost" icon="arrow">
            {c.allLink.label || servicesCopy.allLink}
          </MagneticButton>
        </div>
      </div>
    </Section>
  );
}
