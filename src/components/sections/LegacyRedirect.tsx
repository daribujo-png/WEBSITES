/**
 * Static stand-in for an old byggrv.no address that moved. A static export
 * has no server redirects, so the page sends the browser on with a meta
 * refresh (React hoists it into <head>), is marked noindex with a canonical
 * to the new page (see legacyMetadata), and shows a plain link as fallback.
 * Configure real 301s on the host when possible (README).
 */
import Link from "next/link";
import type { Metadata } from "next";
import { Section } from "@/components/ui";
import { absoluteUrl } from "@/lib/seo";
import { sectionStrings } from "./strings";
import { underlined } from "./styles";

export function legacyMetadata(to: string): Metadata {
  return {
    title: sectionStrings.movedTitle,
    robots: { index: false, follow: true },
    alternates: { canonical: absoluteUrl(to) },
  };
}

export function LegacyRedirect({ to, label }: { to: string; label: string }) {
  return (
    <>
      <meta httpEquiv="refresh" content={`0; url=${to}`} />
      <Section tone="paper" className="pt-header" aria-labelledby="sidetittel">
        <h1 id="sidetittel" className="t-display-l pt-10">
          {sectionStrings.movedTitle}
        </h1>
        <p className="t-lead mt-8 max-w-prose text-fg-muted">
          {sectionStrings.movedBody}{" "}
          <Link href={to} className={underlined}>
            {label}
          </Link>
          .
        </p>
      </Section>
    </>
  );
}
