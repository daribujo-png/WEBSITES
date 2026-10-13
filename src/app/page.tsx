/**
 * PLACEHOLDER written by the FOUNDATION agent. The SECTIONS agent replaces
 * this file with the full home page (hero, intro, Slik bygger vi, …).
 */
import { pageMetadata } from "@/lib/seo";
import { hero } from "@/content";
import { Section, RevealText } from "@/components/ui";

export const metadata = pageMetadata("home");

export default function Home() {
  return (
    <Section tone="night" className="pt-header">
      <RevealText as="h1" text={hero.headline} immediate className="t-display-xl" />
      <p className="t-lead mt-8 max-w-measure text-fg-muted">{hero.sub}</p>
    </Section>
  );
}
