/**
 * /personvern/: draft privacy statement (from src/content/privacy.ts).
 * Honest about what the form collects, where it goes and that there is no
 * tracking. Owner details still missing are shown as [MANGLER: …].
 */
import { pageMetadata } from "@/lib/seo";
import { privacy } from "@/content/privacy";
import { Section, TextWithMissing } from "@/components/ui";
import { PageHero } from "@/components/sections";
import { sectionStrings } from "@/components/sections/strings";
import { underlineOnHover } from "@/components/sections/styles";

export const metadata = pageMetadata("personvern");

export default function PersonvernPage() {
  return (
    <>
      <PageHero title={privacy.title} lede={privacy.lede} crumbs={[{ name: privacy.title, path: "/personvern/" }]} />

      <Section tone="paper" spacing="bottom">
        <div className="grid-page gap-y-12 border-t border-line pt-12">
          <nav aria-label={sectionStrings.tocLabel} className="col-span-full lg:col-span-3">
            <ul className="t-small grid gap-1 lg:sticky lg:top-[calc(var(--header-h)+2.5rem)]">
              {privacy.sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className={`inline-flex min-h-10 items-center ${underlineOnHover}`}>
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="col-span-full max-w-prose lg:col-span-7 lg:col-start-5">
            {privacy.sections.map((s) => (
              <section key={s.id} id={s.id} aria-labelledby={`${s.id}-tittel`} className="border-b border-line py-10 first:pt-0">
                <h2 id={`${s.id}-tittel`} className="t-display-s">
                  {s.title}
                </h2>
                {s.body.map((p, i) => (
                  <p key={i} className="t-body mt-4 text-fg-muted">
                    <TextWithMissing text={p} />
                  </p>
                ))}
              </section>
            ))}
            <p className="t-small mt-10 text-fg-muted">
              <TextWithMissing text={privacy.updated} />
            </p>
          </div>
        </div>
      </Section>
    </>
  );
}
