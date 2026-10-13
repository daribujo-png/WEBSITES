/**
 * Home: the whole story in the order of the brief.
 * Hero → Alt under ett tak → Slik bygger vi (3D) → Tjenester → (photo) → Fra tegning
 * til nøkkel → Byggesøknad → Før og etter → Referanser → Om oss → Kontakt.
 */
import { pageMetadata } from "@/lib/seo";
import { BuildSequence } from "@/components/three";
import {
  AboutSection,
  BeforeAfterSection,
  ContactSection,
  Hero,
  Interlude,
  Intro,
  PermitsSection,
  ProcessSection,
  ReferencesSection,
  ServicesSection,
} from "@/components/sections";

export const metadata = pageMetadata("home");

export default function Home() {
  return (
    <>
      <Hero />
      <Intro />
      <BuildSequence />
      <ServicesSection />
      <Interlude />
      <ProcessSection />
      <PermitsSection />
      <BeforeAfterSection />
      <ReferencesSection />
      <AboutSection />
      <ContactSection />
    </>
  );
}
