/**
 * Home hero: the finished reference house at blue hour on a dark stage.
 * <HeroHouse> (THREE) owns the poster (LCP) and the lazy canvas; this band
 * owns the copy, the CTA, phone/e-mail and the credit for the architect.
 * Desktop: copy sits over the stage on a night scrim. Phone: the house fills
 * the top of the screen and the copy follows below on night.
 */
import Link from "next/link";
import { company, hero, referenceHouse, sectionIds, ui } from "@/content/site";
import { HeroHouse } from "@/components/three";
import { MagneticButton, Icon } from "@/components/ui";
import { IntroText, introUp } from "./IntroText";
import { cn } from "@/lib/utils";
import { sectionStrings } from "./strings";
import { underlineOnHover, underlined } from "./styles";
import { HeroDrift } from "./HeroDrift";

export function Hero() {
  return (
    <section
      id={sectionIds.hero}
      data-tone="night"
      data-header="dark"
      aria-labelledby="hero-title"
      className="relative isolate flex flex-col overflow-hidden lg:min-h-[max(100svh,46rem)] lg:justify-end"
    >
      {/* Stage: the house. In flow on phones, full-bleed behind the copy on desktop. */}
      <div className="relative h-[60svh] min-h-[22rem] w-full lg:absolute lg:inset-0 lg:h-auto lg:min-h-0">
        <HeroDrift className="absolute inset-0">
          <HeroHouse className="absolute inset-0 h-full w-full" />
        </HeroDrift>
        {/* Scrims keep the copy readable (night/70 or darker under text). */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-night via-night/70 to-transparent lg:h-[70%] lg:via-night/75"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-linear-to-b from-night/70 to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 hidden w-2/3 bg-linear-to-r from-night/80 via-night/40 to-transparent lg:block"
        />
        {/* Desktop: the lead sits over the lit facade; a soft local scrim keeps it at 4.5:1 or better. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden bg-[radial-gradient(ellipse_36%_34%_at_80%_58%,color-mix(in_oklab,var(--color-night)_72%,transparent),transparent)] lg:block"
        />
      </div>

      {/* Desktop: the copy overlays the stage, so let pointer events through to the
          house (gentle drag) everywhere except on links and buttons. */}
      <div className="relative z-(--z-raised) container-page -mt-20 pb-10 lg:pointer-events-none lg:mt-0 lg:pt-[calc(var(--header-h)+4rem)] lg:pb-12 lg:[&_a]:pointer-events-auto lg:[&_button]:pointer-events-auto">
        <div className="grid-page gap-y-8 lg:items-end">
          <IntroText
            as="h1"
            id="hero-title"
            text={hero.headline}
            stagger={70}
            className="t-display-xl col-span-full lg:col-span-8"
          />
          <div
            style={introUp(120).style}
            className={cn(introUp(120).className, "col-span-full md:col-span-6 lg:col-span-4 lg:col-start-9")}
          >
            <p className="t-lead text-fg lg:[text-shadow:0_0_1.25rem_var(--color-night),0_0_0.375rem_color-mix(in_oklab,var(--color-night)_70%,transparent)]">{hero.sub}</p>
          </div>
        </div>

        <div
          style={introUp(240).style}
          className={cn(introUp(240).className, "mt-10 flex flex-col gap-6 lg:mt-14 lg:flex-row lg:items-center lg:justify-between")}
        >
          <div className="flex flex-wrap items-center gap-x-8 gap-y-5">
            <MagneticButton href={hero.cta.href} variant="accent" size="lg" icon="arrow">
              {hero.cta.label}
            </MagneticButton>
            <a
              href={hero.secondary.href}
              className={cn("inline-flex min-h-11 items-center gap-2 t-small", underlineOnHover)}
            >
              {hero.secondary.label}
              <Icon.ArrowDown size={16} />
            </a>
          </div>
          <ul className="flex flex-wrap items-center gap-x-8 gap-y-2 t-small">
            <li>
              <a href={company.phoneHref} aria-label={ui.callLabel} className="inline-flex min-h-11 items-center gap-2">
                <Icon.Phone size={17} />
                <span className={underlineOnHover}>{company.phone}</span>
              </a>
            </li>
            <li>
              <a href={company.emailHref} aria-label={ui.emailLabel} className="inline-flex min-h-11 items-center gap-2">
                <Icon.Mail size={17} />
                <span className={underlineOnHover}>{company.email}</span>
              </a>
            </li>
          </ul>
        </div>

        {/* Honest credit: the house is an architect's design we modelled, not one we built. */}
        <p className="t-caption mt-10 max-w-prose border-t border-line pt-5 text-fg-muted lg:mt-12">
          <span className="text-fg">{referenceHouse.title}.</span> {referenceHouse.credit}.{" "}
          {referenceHouse.shortNote}{" "}
          <Link href="/om-oss/#referansehuset" className={cn("inline-flex min-h-6 items-center", underlined)}>
            {sectionStrings.referenceHouseLink}
          </Link>
        </p>
      </div>
    </section>
  );
}
