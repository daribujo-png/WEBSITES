/**
 * Byggesøknad: we write and send the application. Five building types, each
 * with a small interactive 3D diagram (grey = the house you have, oak = new).
 */
import { permitsCopy, sectionIds } from "@/content/site";
import { permitTypes } from "@/content/permits";
import { Section, SectionHeader, SmartLink, Icon } from "@/components/ui";
import { PermitTabs } from "./PermitTabs";
import { sectionStrings } from "./strings";

export function PermitsSection() {
  return (
    <Section id={sectionIds.permits} tone="paper" labelledBy="byggesoknad-title">
      <SectionHeader id="byggesoknad-title" title={permitsCopy.title} lede={permitsCopy.lede} />

      <PermitTabs
        types={permitTypes}
        label={sectionStrings.permitTabsLabel}
        note={permitsCopy.diagramNote}
        dragHint={permitsCopy.dragHint}
      />

      <div className="grid-page mt-16 gap-y-6 border-t border-line pt-10 lg:mt-24">
        <p className="t-body col-span-full max-w-prose lg:col-span-6">{permitsCopy.body}</p>
        <p className="t-small col-span-full lg:col-span-4 lg:col-start-9">
          <SmartLink
            href={permitsCopy.exemptLink.href}
            className="inline-flex min-h-11 items-center gap-2 underline decoration-1 underline-offset-[0.25em] hover:decoration-2"
          >
            {permitsCopy.exemptLink.label}
            <Icon.ArrowUpRight size={16} />
          </SmartLink>
          <span className="t-caption block text-fg-muted">{permitsCopy.exemptLink.source}</span>
        </p>
      </div>
    </Section>
  );
}
