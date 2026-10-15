/**
 * Home, in the order of DIRECTION-adria.md §3:
 * Hero (with the build steps, #slik-bygger-vi) → Dette bygger vi → Jobber vi
 * har gjort (the only night band) → Husmodeller vi bygger → Fra første samtale
 * til overlevering → Alle fagene i eget firma → photo interlude → Om oss →
 * Kontakt. Nybygg, tilbygg/påbygg and tak lead; sprenging, VVS and the other
 * trades are only named from "Alle fagene i eget firma" down.
 */
import { pageMetadata } from "@/lib/seo";
import {
  AboutSection,
  AllTradesSection,
  ContactSection,
  Hero,
  HouseModelsSection,
  Interlude,
  LeadServices,
  ProcessSection,
  ReferencesSection,
} from "@/components/sections";

export const metadata = pageMetadata("home");

export default function Home() {
  return (
    <>
      <Hero />
      <LeadServices />
      <ReferencesSection />
      <HouseModelsSection />
      <ProcessSection />
      <AllTradesSection />
      <Interlude />
      <AboutSection />
      <ContactSection />
    </>
  );
}
