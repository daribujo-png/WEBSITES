/**
 * "Fra første samtale til overlevering": how working with us goes, including
 * byggesøknad. The id stays "fra-tegning-til-nokkel" so old links still work.
 * Centred header (the only one on home), paper tone.
 */
import { processCopy, sectionIds, cta } from "@/content/site";
import { processSteps } from "@/content/process";
import { Section, SectionHeader, MagneticButton, type Tone } from "@/components/ui";
import { ProcessTimeline } from "./ProcessTimeline";
import { sectionStrings } from "./strings";

export function ProcessSection({ ctaHref = cta.primaryHrefHome, tone = "paper" }: { ctaHref?: string; tone?: Tone }) {
  return (
    <Section id={sectionIds.process} tone={tone} labelledBy="prosess-title">
      <SectionHeader id="prosess-title" title={processCopy.title} lede={processCopy.lede} layout="center" />
      <ProcessTimeline steps={processSteps} label={sectionStrings.processListLabel} />
      <div className="grid-page mt-16 lg:mt-20">
        <div className="col-span-full pl-10 lg:col-start-2 lg:pl-0">
          <MagneticButton href={ctaHref} icon="arrow" className="text-left whitespace-normal!">
            {cta.primary}
          </MagneticButton>
        </div>
      </div>
    </Section>
  );
}
