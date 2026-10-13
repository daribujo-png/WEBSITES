/** Custom 404 (exported as out/404.html). */
import { pageMetadata } from "@/lib/seo";
import { company, notFoundCopy, ui } from "@/content/site";
import { Section, MagneticButton } from "@/components/ui";
import { IntroText } from "@/components/sections/IntroText";
import { underlined } from "@/components/sections/styles";

export const metadata = pageMetadata("notFound");

export default function NotFound() {
  // Turn the phone number inside the sentence into a tel: link.
  const [before, after = ""] = notFoundCopy.contact.split(company.phone);
  return (
    <Section tone="paper" className="pt-header" aria-labelledby="sidetittel">
      <div className="grid-page gap-y-10 pt-10 lg:pt-16">
        <div className="col-span-full lg:col-span-9">
          <IntroText as="h1" id="sidetittel" text={notFoundCopy.title} className="t-display-xl" />
        </div>
        <div className="col-span-full max-w-prose lg:col-span-6">
          <p className="t-lead text-fg-muted">{notFoundCopy.body}</p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <MagneticButton href={notFoundCopy.home.href} icon="arrow">
              {notFoundCopy.home.label}
            </MagneticButton>
            <MagneticButton href={notFoundCopy.services.href} variant="outline">
              {notFoundCopy.services.label}
            </MagneticButton>
          </div>
          <p className="t-body mt-12 border-t border-line pt-6">
            {before}
            <a href={company.phoneHref} aria-label={ui.callLabel} className={`${underlined} whitespace-nowrap`}>
              {company.phone}
            </a>
            {after}
          </p>
        </div>
      </div>
    </Section>
  );
}
