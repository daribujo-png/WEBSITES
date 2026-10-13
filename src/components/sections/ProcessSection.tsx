/** "Fra tegning til nøkkel": how working with us goes, first call to handover. */
import { processCopy, sectionIds, cta } from "@/content/site";
import { processSteps } from "@/content/process";
import { Section, SectionHeader, MagneticButton } from "@/components/ui";
import { ProcessTimeline } from "./ProcessTimeline";
import { sectionStrings } from "./strings";

export function ProcessSection({ ctaHref = cta.primaryHrefHome }: { ctaHref?: string }) {
  return (
    <Section id={sectionIds.process} tone="chalk" labelledBy="prosess-title">
      <SectionHeader id="prosess-title" title={processCopy.title} lede={processCopy.lede} />
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
