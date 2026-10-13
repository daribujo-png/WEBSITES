/**
 * Site footer: address, phone, e-mail, org.nr. [MANGLER], social links
 * [MANGLER], privacy link and the 3D-model credit.
 */
import Link from "next/link";
import { company, footer, nav, ui, contactCopy, cta } from "@/content/site";
import { services } from "@/content/services";
import { servicePath } from "@/lib/seo";
import { Icon, TextWithMissing, MagneticButton } from "@/components/ui";
import { underlineOnHover, underlined } from "@/components/sections/styles";

const YEAR = new Date().getFullYear();

export function Footer() {
  const companyLinks = nav.filter((n) => !n.href.includes("#") && n.href !== "/tjenester/");

  return (
    <footer data-tone="paper-deep" className="relative pt-section-sm pb-10" aria-labelledby="footer-title">
      <div className="container-page">
        <h2 id="footer-title" className="sr-only">
          {company.legalName}
        </h2>

        <div className="grid-page gap-y-10 border-b border-line pb-12 lg:items-end">
          <p className="col-span-full t-display-m lg:col-span-8">{footer.tagline}</p>
          <div className="col-span-full flex flex-wrap gap-3 lg:col-span-4 lg:justify-end">
            <MagneticButton href={cta.primaryHref} icon="arrow">
              {cta.primary}
            </MagneticButton>
          </div>
        </div>

        <div className="grid-page gap-y-12 pt-12">
          <section aria-labelledby="footer-contact" className="col-span-full md:col-span-4 lg:col-span-4">
            <h3 id="footer-contact" className="t-small font-medium text-fg-muted font-sans">
              {footer.contactTitle}
            </h3>
            <ul className="mt-4 grid gap-1 t-body">
              <li>
                <a href={company.phoneHref} aria-label={ui.callLabel} className={`inline-flex min-h-11 items-center gap-3 ${underlineOnHover}`}>
                  <Icon.Phone size={18} className="shrink-0" />
                  {company.phone}
                </a>
              </li>
              <li>
                <a href={company.emailHref} aria-label={ui.emailLabel} className={`inline-flex min-h-11 items-center gap-3 ${underlineOnHover}`}>
                  <Icon.Mail size={18} className="shrink-0" />
                  {company.email}
                </a>
              </li>
              <li className="flex gap-3 pt-2">
                <Icon.MapPin size={18} className="mt-1 shrink-0" />
                <address className="not-italic">
                  {company.address.street}
                  <br />
                  {company.address.postalCode} {company.address.city}
                  <br />
                  <a href={company.mapsHref} target="_blank" rel="noopener noreferrer" className={`inline-flex min-h-11 items-center t-small ${underlined}`}>
                    {contactCopy.mapLink}
                    <span className="sr-only"> {ui.newTab}</span>
                  </a>
                </address>
              </li>
            </ul>
          </section>

          <nav aria-labelledby="footer-services" className="col-span-full md:col-span-4 lg:col-span-4">
            <h3 id="footer-services" className="t-small font-medium text-fg-muted font-sans">
              {footer.servicesTitle}
            </h3>
            <ul className="mt-4 grid grid-cols-1 gap-x-6 t-small sm:grid-cols-2">
              {services.map((s) => (
                <li key={s.slug}>
                  <Link href={servicePath(s.slug)} className={`inline-flex min-h-10 items-center ${underlineOnHover}`}>
                    {s.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <section aria-labelledby="footer-company" className="col-span-full md:col-span-8 lg:col-span-4">
            <h3 id="footer-company" className="t-small font-medium text-fg-muted font-sans">
              {footer.companyTitle}
            </h3>
            <ul className="mt-4 grid gap-0 t-small">
              {companyLinks.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={`inline-flex min-h-10 items-center ${underlineOnHover}`}>
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href={footer.privacy.href} className={`inline-flex min-h-10 items-center ${underlineOnHover}`}>
                  {footer.privacy.label}
                </Link>
              </li>
            </ul>
            <dl className="mt-6 grid gap-3 t-small">
              <div>
                <dt className="text-fg-muted">{footer.orgNrLabel}</dt>
                <dd>
                  <TextWithMissing text={footer.orgNr} />
                </dd>
              </div>
              <div>
                <dt className="text-fg-muted">{footer.socialLabel}</dt>
                <dd>
                  <TextWithMissing text={footer.social} />
                </dd>
              </div>
            </dl>
          </section>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-line pt-6 t-caption text-fg-muted md:flex-row md:justify-between md:gap-10">
          <p>{footer.copyright(YEAR)}</p>
          <p className="max-w-prose md:text-right">{footer.modelCredit}</p>
        </div>
      </div>
    </footer>
  );
}
