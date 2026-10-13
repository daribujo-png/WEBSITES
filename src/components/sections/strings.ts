/**
 * A few UI strings the SECTIONS components need that are not (yet) in
 * src/content. Kept here, in one place, so FOUNDATION can move them into
 * @/content later without hunting through components.
 */

/** "Ny bolig" → "ny bolig"; keeps acronyms such as "VVS". */
export function lowerFirst(title: string): string {
  const first = title.split(/\s+/)[0] ?? "";
  if (first.length > 1 && first === first.toUpperCase()) return title;
  return title.charAt(0).toLowerCase() + title.slice(1);
}

export const sectionStrings = {
  /** Link from a service row/card to its own page. */
  readMore: (title: string) => `Les mer om ${lowerFirst(title)}`,
  /** Sticky list of service names next to the service rows (desktop). */
  servicesIndexLabel: "Tjenestene",
  /** Link from the home "Om oss" band to /om-oss/. */
  aboutLink: "Les mer om oss",
  /** Link from a service page's permit note to the byggesøknad section. */
  permitLink: "Slik ordner vi byggesøknaden",
  /** Link from the hero caption to the reference-house explanation. */
  referenceHouseLink: "Om modellen",
  /** Contact details list heading on the contact band. */
  contactDetailsLabel: "Kontaktinformasjon",
  /** Accessible name of the permit-type tab list. */
  permitTabsLabel: "Velg byggetype",
  /** Accessible name of the process list. */
  processListLabel: "Slik jobber vi med deg",
} as const;
