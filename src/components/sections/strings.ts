/**
 * A few UI strings the SECTIONS components need that are not (yet) in
 * src/content. Kept here, in one place, so FOUNDATION can move them into
 * @/content later without hunting through components. Facts never live here.
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
  /** Link from the home "Om oss" band to /om-oss/. */
  aboutLink: "Les mer om oss",
  /** Link from a service page's permit note to the byggesøknad section. */
  permitLink: "Slik ordner vi byggesøknaden",
  /** Link from the hero caption to the reference-house explanation. */
  referenceHouseLink: "Om 3D-huset",
  /** Contact details list heading on the contact band. */
  contactDetailsLabel: "Kontaktinformasjon",
  /** Accessible name of the permit-type tab list. */
  permitTabsLabel: "Velg byggetype",
  /** Accessible name of the process list. */
  processListLabel: "Slik jobber vi med deg",
  /** Service page: heading over the list of tasks. */
  includesTitle: "Dette gjør vi",
  /** Service page: heading over the trades. */
  tradesTitle: "Fagene som deltar",
  /** Service page: heading over the glossary (rehabilitering). */
  termsTitle: "Ordene vi bruker",
  /** Service page: heading over the image set. */
  imagesTitle: "Bilder",
  /** Service page: label of the second image set. */
  moreImagesTitle: "Flere bilder",
  /** Service page: visually hidden heading over the body text. */
  aboutServiceTitle: "Om tjenesten",
  /** Service page: heading over a render before/after slider. */
  illustrationTitle: "Fra råbygg til ferdig",
  /** CTA band on service pages and subpages. */
  ctaBandTitle: "Fortell oss hva du vil bygge",
  ctaBandBody: "Ring, send en e-post eller fyll ut skjemaet. Første samtale er uforpliktende.",
  /** Contact page: heading over the form. */
  formTitle: "Skriv til oss",
  /** References page: section headings. */
  beforeAfterTitle: "Før og etter",
  /** Om oss page: heading over the reference-house section. */
  referenceHouseTitle: "Huset i 3D-modellen",
  /** Om oss page: labels for the reference-house facts. */
  houseLabels: {
    name: "Hus",
    architect: "Arkitekt",
    place: "Sted",
    completed: "Ferdig",
    area: "Areal",
  },
  /** Om oss page: link back to the build sequence. */
  buildLink: "Se huset bygges steg for steg",
  /** Privacy page: table of contents label. */
  tocLabel: "Innhold på siden",
  /** Old byggrv.no addresses that moved. */
  movedTitle: "Siden har flyttet",
  movedBody: "Innholdet finner du nå her:",
  /** Service rows: label for the service list as a whole. */
  servicesListLabel: "Tjenestene våre",
} as const;
