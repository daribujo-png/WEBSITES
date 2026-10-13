/**
 * Closing call to action on subpages: book a conversation (optionally with
 * the project type preselected), or call / e-mail straight away.
 */
import { company, cta, ui } from "@/content/site";
import { Section, RevealText, MagneticButton, type Tone } from "@/components/ui";
import { PrefillLink } from "@/components/forms/PrefillLink";
import { sectionStrings } from "./strings";

interface CtaBandProps {
  title?: string;
  body?: string;
  /** Preselect this project type in the contact form. */
  projectType?: string;
  label?: string;
  tone?: Tone;
  id?: string;
}

export function CtaBand({
  title = sectionStrings.ctaBandTitle,
  body = sectionStrings.ctaBandBody,
  projectType,
  label = cta.primary,
  tone = "chalk",
  id = "cta-tittel",
}: CtaBandProps) {
  return (
    <Section tone={tone} spacing="sm" labelledBy={id}>
      <div className="grid-page gap-y-10 lg:items-end">
        <div className="col-span-full lg:col-span-7">
          <RevealText as="h2" id={id} text={title} className="t-display-m" />
          <p data-reveal="up" className="t-lead mt-6 max-w-prose text-fg-muted">
            {body}
          </p>
        </div>
        <div className="col-span-full flex flex-col items-start gap-3 lg:col-span-4 lg:col-start-9">
          {projectType ? (
            <PrefillLink value={projectType} variant="solid" className="text-left whitespace-normal!">
              {label}
            </PrefillLink>
          ) : (
            <MagneticButton href="/kontakt/" icon="arrow" className="text-left whitespace-normal!">
              {label}
            </MagneticButton>
          )}
          <MagneticButton href={company.phoneHref} variant="ghost" icon="phone" aria-label={ui.callLabel} className="px-0!">
            {company.phone}
          </MagneticButton>
          <MagneticButton href={company.emailHref} variant="ghost" icon="mail" aria-label={ui.emailLabel} className="px-0!">
            {company.email}
          </MagneticButton>
        </div>
      </div>
    </Section>
  );
}
