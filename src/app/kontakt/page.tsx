/** /kontakt/: phone, e-mail, address with a map link, and the form. */
import { pageMetadata } from "@/lib/seo";
import { contactCopy } from "@/content/site";
import { Section } from "@/components/ui";
import { ContactForm } from "@/components/forms/ContactForm";
import { ContactDetails, PageHero, ProcessSection } from "@/components/sections";

export const metadata = pageMetadata("kontakt");

export default function KontaktPage() {
  return (
    <>
      <PageHero title={contactCopy.headline} lede={contactCopy.lede} crumbs={[{ name: contactCopy.title, path: "/kontakt/" }]} />

      <Section id="kontakt" tone="paper" spacing="bottom">
        <div className="grid-page gap-y-16">
          <ContactDetails headingLevel="h2" className="col-span-full lg:col-span-4" />
          <div className="col-span-full lg:col-span-7 lg:col-start-6">
            <ContactForm headingLevel="h2" className="border-t border-line pt-8" />
          </div>
        </div>
      </Section>

      <ProcessSection ctaHref="#kontaktskjema" />
    </>
  );
}
