/**
 * "Alt under ett tak": one project manager and every trade in-house.
 * Big title, own project photo, two short paragraphs and three points
 * separated by hairlines (no numbering).
 */
import type { CSSProperties } from "react";
import { intro, sectionIds } from "@/content/site";
import { Section, SectionHeader, Hairline } from "@/components/ui";
import { MediaFigure } from "./Media";

export function Intro() {
  return (
    <Section id={sectionIds.intro} tone="paper" labelledBy="intro-title">
      <SectionHeader id="intro-title" title={intro.title} lede={intro.lede} />

      <div className="grid-page mt-16 gap-y-12 lg:mt-24">
        <MediaFigure
          media={{ kind: "photo", key: intro.photoKey }}
          sizes="(min-width: 90rem) 42rem, (min-width: 64rem) 48vw, calc(100vw - 2rem)"
          aspect="4 / 3"
          parallax
          className="col-span-full lg:col-span-6"
        />
        <div className="col-span-full flex flex-col gap-6 md:col-span-6 lg:col-span-4 lg:col-start-9 lg:justify-end lg:pb-10">
          {intro.body.map((p, i) => (
            <p
              key={i}
              data-reveal="up"
              style={{ "--reveal-delay": `${i * 120}ms` } as CSSProperties}
              className={i === 0 ? "t-lead" : "t-body text-fg-muted"}
            >
              {p}
            </p>
          ))}
        </div>
      </div>

      <ul className="grid-page mt-20 gap-y-10 lg:mt-28">
        {intro.points.map((point, i) => (
          <li key={point.title} className="col-span-full md:col-span-4 lg:col-span-4">
            <Hairline draw strong delay={i * 140} />
            <h3
              data-reveal="up"
              style={{ "--reveal-delay": `${120 + i * 140}ms` } as CSSProperties}
              className="t-display-s mt-6"
            >
              {point.title}
            </h3>
            <p
              data-reveal="up"
              style={{ "--reveal-delay": `${200 + i * 140}ms` } as CSSProperties}
              className="t-body mt-3 max-w-[26rem] text-fg-muted"
            >
              {point.body}
            </p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
