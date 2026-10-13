/**
 * Kontakt: phone, e-mail and address one tap away, plus the form.
 * ContactDetails is reused on /kontakt/.
 */
import { company, contactCopy, sectionIds, ui } from "@/content/site";
import { Section, RevealText, Icon } from "@/components/ui";
import { ContactForm } from "@/components/forms/ContactForm";
import { cn } from "@/lib/utils";
import { sectionStrings } from "./strings";
import { underlineOnHover, underlined } from "./styles";

export function ContactDetails({
  className,
  headingLevel = "h3",
}: {
  className?: string;
  headingLevel?: "h2" | "h3";
}) {
  const Heading = headingLevel;
  return (
    <div className={className}>
      <Heading className="sr-only">
        {sectionStrings.contactDetailsLabel}
      </Heading>
      <dl className="grid grid-cols-2 gap-8 border-t border-line pt-8">
        <div className="col-span-2">
          <dt className="t-small text-fg-muted">{contactCopy.phoneLabel}</dt>
          <dd className="mt-1">
            <a
              href={company.phoneHref}
              aria-label={ui.callLabel}
              className={cn(
                "inline-flex min-h-11 items-center gap-3 t-display-s",
                underlineOnHover,
              )}
            >
              {company.phone}
            </a>
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="t-small text-fg-muted">{contactCopy.emailLabel}</dt>
          <dd className="mt-1">
            <a
              href={company.emailHref}
              aria-label={ui.emailLabel}
              className={cn(
                "inline-flex min-h-11 items-center t-display-s break-all",
                underlineOnHover,
              )}
            >
              {company.email}
            </a>
          </dd>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <dt className="t-small text-fg-muted">{contactCopy.addressLabel}</dt>
          <dd className="t-body mt-1">
            <address className="not-italic">
              {company.address.street}
              <br />
              {company.address.postalCode} {company.address.city}
            </address>
            <a
              href={company.mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "t-small mt-1 inline-flex min-h-11 items-center gap-2",
                underlined,
              )}
            >
              <Icon.MapPin size={16} />
              {contactCopy.mapLink}
              <span className="sr-only"> {ui.newTab}</span>
            </a>
          </dd>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <dt className="t-small text-fg-muted">{contactCopy.areaLabel}</dt>
          <dd className="t-body mt-1">{contactCopy.area}</dd>
        </div>
      </dl>
    </div>
  );
}

export function ContactSection() {
  return (
    <Section id={sectionIds.contact} tone="paper" labelledBy="kontakt-title">
      <div className="grid-page gap-y-16">
        <div className="col-span-full lg:col-span-5">
          <RevealText
            as="h2"
            id="kontakt-title"
            text={contactCopy.headline}
            className="t-display-l"
          />
          <p
            data-reveal="up"
            className="t-lead mt-8 max-w-measure text-fg-muted"
          >
            {contactCopy.lede}
          </p>
          <ContactDetails className="mt-12" />
        </div>
        <div className="col-span-full lg:col-span-6 lg:col-start-7">
          <ContactForm />
        </div>
      </div>
    </Section>
  );
}
