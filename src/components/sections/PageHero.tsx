/**
 * Opening of every subpage: breadcrumb trail, one h1 and a lede on paper.
 * The header is fixed, so the band starts below it (pt-header).
 * Breadcrumb JSON-LD is emitted alongside the visible trail.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { ui } from "@/content/site";
import { breadcrumbJsonLd } from "@/lib/jsonld";
import { JsonLd, TextWithMissing } from "@/components/ui";
import { IntroText, introUp } from "./IntroText";
import { cn } from "@/lib/utils";
import { underlineOnHover } from "./styles";

export interface Crumb {
  name: string;
  path: string;
}

export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  const trail = [{ name: ui.breadcrumbHome, path: "/" }, ...items];
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(trail)} />
      <nav aria-label={ui.breadcrumbLabel} className={cn("t-small text-fg-muted", className)}>
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {trail.map((item, i) => {
            const last = i === trail.length - 1;
            return (
              <li key={item.path} className="flex items-center gap-2">
                {last ? (
                  <span aria-current="page" className="text-fg">
                    {item.name}
                  </span>
                ) : (
                  <>
                    <Link href={item.path} className={cn("inline-flex min-h-11 items-center", underlineOnHover)}>
                      {item.name}
                    </Link>
                    <span aria-hidden="true" className="text-line-strong">
                      /
                    </span>
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}

interface PageHeroProps {
  title: string;
  lede?: string;
  crumbs: Crumb[];
  /** Content under the lede (buttons, meta). */
  children?: ReactNode;
  /** Optional content in the right column on desktop. */
  aside?: ReactNode;
  className?: string;
}

export function PageHero({ title, lede, crumbs, children, aside, className }: PageHeroProps) {
  return (
    <section data-tone="paper" aria-labelledby="sidetittel" className={cn("pt-header", className)}>
      <div className="container-page pt-8 pb-section-sm lg:pt-12">
        <Breadcrumbs items={crumbs} />
        <div className="grid-page mt-10 gap-y-8 lg:mt-16 lg:items-end">
          <div className={cn("col-span-full", aside ? "lg:col-span-7" : "lg:col-span-10")}>
            <IntroText as="h1" id="sidetittel" text={title} className="t-display-l" />
          </div>
          {aside ? (
            <div className="col-span-full lg:col-span-4 lg:col-start-9">{aside}</div>
          ) : null}
        </div>
        {lede || children ? (
          <div className="grid-page mt-8 gap-y-8 lg:mt-12">
            {lede ? (
              <p
                style={introUp(120).style}
                className={cn(introUp(120).className, "t-lead col-span-full max-w-prose text-fg-muted md:col-span-6 lg:col-span-6")}
              >
                <TextWithMissing text={lede} />
              </p>
            ) : null}
            {children ? (
              <div
                style={introUp(220).style}
                className={cn(introUp(220).className, "col-span-full flex flex-wrap items-center gap-x-6 gap-y-4 lg:col-span-5 lg:col-start-8 lg:justify-end lg:self-end")}
              >
                {children}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
