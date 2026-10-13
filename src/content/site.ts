/**
 * Site-wide copy and company facts.
 * Facts come only from the client brief. Missing facts are written as
 * "[MANGLER: …]" tokens; render strings that may contain them with
 * <TextWithMissing> from "@/components/ui".
 */
import type { MissingFact, NavItem, Trade, Value } from "./types";

/* Company -------------------------------------------------------------------- */

const phone = "94 01 66 10";
const email = "post@byggrv.no";
const addressLine = "Breisteinvegen 206, 5111 Breistein";

export const company = {
  name: "Bygg og Renovering Vest",
  legalName: "Bygg og Renovering Vest AS",
  domain: "byggrv.no",
  url: "https://byggrv.no",
  address: {
    street: "Breisteinvegen 206",
    postalCode: "5111",
    city: "Breistein",
    region: "Vestland",
    country: "NO",
  },
  addressLine,
  phone,
  phoneHref: "tel:+4794016610",
  phoneE164: "+4794016610",
  email,
  emailHref: `mailto:${email}`,
  /** Plain Google Maps search link (no embed, opens in a new tab). */
  mapsHref:
    "https://www.google.com/maps/search/?api=1&query=Breisteinvegen%20206%2C%205111%20Breistein",
  areaServed: "Bergen og omegn",
  clients: "private, bedrifter og offentlige oppdragsgivere",
  /** Labels for visible [MANGLER: …] placeholders. */
  missing: {
    foundingYear: "stiftelsesår",
    orgNr: "org.nr.",
    sentralgodkjenning: "sentralgodkjenning",
    mesterbrev: "mesterbrev",
    team: "navn og bilder av teamet",
    guarantee: "garantivilkår",
    social: "lenker til sosiale medier",
    clientPhotos: "egne prosjektbilder fra byggrv.no",
    beforeAfterPhotos: "egne før- og etterbilder",
    privacyOwner: "kontaktperson for personvern",
    privacyApproval: "godkjenning av personvernerklæringen",
    formEndpoint: "adresse til skjematjeneste (NEXT_PUBLIC_FORM_ENDPOINT)",
    clientHouse: "kundens eget hus: tegninger, bilder eller 3D-modell",
  },
} as const;

/* Navigation and shared UI strings ---------------------------------------------- */

export const nav: NavItem[] = [
  { label: "Slik bygger vi", href: "/#slik-bygger-vi" },
  { label: "Tjenester", href: "/tjenester/" },
  { label: "Referanser", href: "/referanser/" },
  { label: "Om oss", href: "/om-oss/" },
  { label: "Kontakt", href: "/kontakt/" },
];

/** Section anchors on the home page (in page order). */
export const sectionIds = {
  hero: "topp",
  intro: "alt-under-ett-tak",
  build: "slik-bygger-vi",
  services: "tjenester",
  process: "fra-tegning-til-nokkel",
  permits: "byggesoknad",
  beforeAfter: "for-og-etter",
  references: "referanser",
  about: "om-oss",
  contact: "kontakt",
} as const;

export const cta = {
  primary: "Book en uforpliktende samtale",
  primaryHref: "/kontakt/",
  /** On the home page the primary CTA scrolls to the contact section. */
  primaryHrefHome: "#kontakt",
  call: `Ring ${phone}`,
  email: "Send e-post",
} as const;

export const ui = {
  skipLink: "Hopp til innholdet",
  homeLabel: "Bygg og Renovering Vest, til forsiden",
  mainNavLabel: "Hovedmeny",
  menuOpen: "Meny",
  menuClose: "Lukk",
  menuOpenLabel: "Åpne menyen",
  menuCloseLabel: "Lukk menyen",
  callLabel: `Ring oss på ${phone}`,
  callShort: "Ring",
  emailLabel: `Send e-post til ${email}`,
  emailShort: "E-post",
  bookShort: "Book samtale",
  actionBarLabel: "Kontakt oss",
  newTab: "(åpnes i ny fane)",
  mapLink: "Vis adressen i Google Maps",
  breadcrumbLabel: "Brødsmulesti",
  breadcrumbHome: "Forside",
  toTop: "Til toppen",
  renderNote: "Gjengivelse fra vår 3D-modell",
  illustrationNote: "Illustrasjon fra vår 3D-modell, ikke foto",
} as const;

/* Home: hero ----------------------------------------------------------------------- */

export const hero = {
  headline: "Vi bygger hele huset.",
  sub: "Fra sprenging og grunnmur til elektro, rør og siste strøk maling. Alle fagene er i eget firma, og én prosjektleder holder i jobben til avtalt tid og pris.",
  cta: { label: cta.primary, href: cta.primaryHrefHome },
  secondary: { label: "Se hvordan vi bygger", href: "#slik-bygger-vi" },
  area: "Bergen og omegn",
  posterAlt:
    "3D-gjengivelse av et arkitekttegnet trehus i blå time, med lys i vinduene, to store lønnetrær, bjørk og fjell i Fana.",
  dragHint: "Dra for å se huset fra en annen side",
} as const;

/* Home: intro ("Alt under ett tak") -------------------------------------------------------- */

export const intro = {
  title: "Alt under ett tak",
  lede: "Vi er erfarne håndverkere fra flere firmaer som er slått sammen til ett. Derfor har vi alle fagene et byggeprosjekt trenger i samme bedrift.",
  body: [
    "Tømrerarbeid, elektro, VVS, maling, mur og betong og sprenging gjør vi selv. Vi tar hele jobben som totalentreprise, eller den delen du trenger.",
    "Du får én prosjektleder. Prosjektlederen samordner fagene, holder tidsplanen og er den du snakker med fra første samtale til overlevering.",
  ],
  points: [
    {
      title: "Én prosjektleder",
      body: "Én person samordner alle fagene og holder tidsplanen for deg.",
    },
    {
      title: "Byggesøknaden ordner vi",
      body: "Også når du skal bygge til, rive eller grave ut kjeller.",
    },
    {
      title: "Avtalt tid og pris",
      body: "Vi leverer nøkkelferdig og bygger etter dine spesifikasjoner.",
    },
  ],
} as const;

/* Home: section headings for the other sections ------------------------------------------------ */

export const servicesCopy = {
  title: "Tjenester",
  lede: "Ti tjenester fra ett firma. Uansett størrelse på jobben får du én prosjektleder og de fagene jobben trenger.",
  includesLabel: "Dette gjør vi",
  tradesLabel: "Fag som deltar",
  permitNote: "Krever jobben byggesøknad, ordner vi den.",
  allLink: "Se alle tjenestene",
  imagesNote: "Bildene er gjengivelser fra vår egen 3D-modell. [MANGLER: egne prosjektbilder fra byggrv.no]",
  otherTitle: "Står ikke jobben din her?",
  otherBody: "Ring eller skriv noen ord om prosjektet, så finner vi ut av det sammen.",
  relatedTitle: "Andre tjenester",
  indexTitle: "Alt vi bygger og fornyer",
  indexLede:
    "Fra nytt hus til nytt bad. Alle fagene er i eget firma, og én prosjektleder samordner jobben.",
} as const;

export const processCopy = {
  title: "Fra tegning til nøkkel",
  lede: "Den samme prosjektlederen følger deg fra første samtale til overlevering.",
} as const;

export const permitsCopy = {
  title: "Byggesøknad",
  lede: "Mange byggeprosjekter må søkes om hos kommunen. Den jobben tar vi: vi skriver søknaden og sender den for deg.",
  body: "Vi søker også om riving og om utgraving av kjeller. Om prosjektet ditt er søknadspliktig, avklarer vi før du får tilbudet.",
  listLabel: "Bygg vi søker om",
  dragHint: "Dra for å snu modellen",
  diagramNote: "Grått viser huset du har. Eik viser det nye.",
} as const;

export const beforeAfterCopy = {
  title: "Før og etter",
  lede: "Dra i håndtaket, eller bruk piltastene, for å sammenligne.",
  note: "Illustrasjoner fra vår 3D-modell, ikke foto fra ferdige prosjekter. [MANGLER: egne før- og etterbilder]",
} as const;

export const referencesCopy = {
  title: "Referanser",
  lede: "Et utvalg av jobbene vi har gjort, fra et nytt bad til innredning av en hel bolig.",
  scopeLabel: "Arbeid",
  placeLabel: "Sted",
  allLink: "Se alle referansene",
} as const;

export const contactCopy = {
  title: "Kontakt",
  headline: "Fortell oss hva du vil bygge",
  lede: "Ring, send en e-post eller fyll ut skjemaet. Første samtale er uforpliktende.",
  phoneLabel: "Telefon",
  emailLabel: "E-post",
  addressLabel: "Adresse",
  areaLabel: "Område",
  area: "Bergen og omegn",
  mapLink: "Vis i Google Maps",
} as const;

/* About ---------------------------------------------------------------------------------- */

export const about = {
  title: "Om oss",
  headline: "Håndverkere fra flere firmaer, samlet i ett",
  lede: "Bygg og Renovering Vest AS er en gruppe erfarne håndverkere fra firmaer som er slått sammen. Sammen dekker vi alle fagene et byggeprosjekt trenger.",
  body: [
    "Vi bygger for private, bedrifter og offentlige oppdragsgivere i Bergen og omegn. Løsningene skreddersyr vi etter det du ønsker, og vi bygger etter dine spesifikasjoner.",
    "Hver kunde får én prosjektleder som samordner fagene og holder tidsplanen. Vi leverer nøkkelferdig, til avtalt tid og pris.",
  ],
  valuesTitle: "Dette står vi for",
  tradesTitle: "Fagene våre",
  teamTitle: "Folkene bak",
  teamBody: "[MANGLER: navn og bilder av teamet]",
  factsTitle: "Om firmaet",
  facts: [
    { label: "Firmanavn", value: "Bygg og Renovering Vest AS" },
    { label: "Stiftet", value: "[MANGLER: stiftelsesår]" },
    { label: "Org.nr.", value: "[MANGLER: org.nr.]" },
    { label: "Sentralgodkjenning", value: "[MANGLER: sentralgodkjenning]" },
    { label: "Mesterbrev", value: "[MANGLER: mesterbrev]" },
    { label: "Garanti", value: "[MANGLER: garantivilkår]" },
    { label: "Adresse", value: addressLine },
    { label: "Område", value: "Bergen og omegn" },
  ],
} as const;

export const values: Value[] = [
  {
    id: "enok",
    title: "ENØK",
    body: "Vi foreslår energieffektive løsninger, både når vi bygger nytt og når vi pusser opp.",
  },
  {
    id: "miljo",
    title: "Miljøansvar",
    body: "Vi tar miljøhensyn i løsningene vi foreslår og i måten vi bygger på.",
  },
  {
    id: "fleksibel",
    title: "Fleksible løsninger",
    body: "Vi tilpasser prosjektet til dine behov og ønsker, ikke omvendt.",
  },
  {
    id: "pris",
    title: "Konkurransedyktige priser",
    body: "Du får ett samlet tilbud på hele jobben, til en konkurransedyktig pris.",
  },
  {
    id: "ansvar",
    title: "Reklamasjons- og ansvarsrett",
    body: "Vi har reklamasjons- og ansvarsrett for arbeidet vi gjør.",
  },
];

export const trades: Trade[] = [
  {
    id: "prosjektledelse",
    name: "Prosjektledelse",
    body: "Totalentreprise med én prosjektleder som samordner fagene og holder tidsplanen.",
  },
  {
    id: "tomrer",
    name: "Tømrer",
    body: "Bindingsverk, tak, vinduer, dører, kledning og innvendig snekkerarbeid.",
  },
  {
    id: "elektro",
    name: "Elektro",
    body: "Nye el-anlegg i nybygg og oppgradering av gamle anlegg.",
  },
  {
    id: "vvs",
    name: "VVS",
    body: "Rør, vann, avløp og sanitærutstyr.",
  },
  {
    id: "maler",
    name: "Maler",
    body: "Forarbeid, sparkling og maling, ute og inne.",
  },
  {
    id: "mur-betong",
    name: "Mur og betong",
    body: "Grunnmur, støp og murarbeid.",
  },
  {
    id: "sprenging",
    name: "Sprenging",
    body: "Sprenging og grunnarbeid for hus, kjeller og garasje.",
  },
];

export const tradeById = Object.fromEntries(trades.map((t) => [t.id, t])) as Record<
  Trade["id"],
  Trade
>;

/* Reference house (the 3D model) -------------------------------------------------------------- */

export const referenceHouse = {
  title: "Arkitekttegnet referanse – slik ville vi bygget den",
  name: "House in Bergen",
  architect: "Kvalbein Korsøen Arkitektur",
  credit: "Arkitektur: Kvalbein Korsøen Arkitektur",
  place: "Fana, Bergen",
  completed: "2019",
  area: "ca. 130 m²",
  description:
    "Et tradisjonelt trehus i form, materialer og teknikk. To gamle lønnetrær på tomten bestemte husets størrelse og form, og hvor åpningene i veggene skulle sitte. Bindingsverket er isolert med trefiber, og en buet, mørk inngang leder inn til kjøkken og stue som åpner seg mot hagen.",
  note: "3D-modellen er vår egen tolkning av House in Bergen, tegnet av Kvalbein Korsøen Arkitektur. Bygg og Renovering Vest har ikke bygget dette huset. Vi bruker det for å vise, steg for steg, hvordan vi ville bygget et arkitekttegnet hus.",
  modelNote:
    "Arkitektens tegninger var ikke tilgjengelige da modellen ble laget. Proporsjoner og planløsning er derfor tilnærmet.",
  shortNote: "Vår tolkning. Huset er ikke bygget av oss.",
  rendersNote: "Alle bilder av huset er gjengivelser av vår egen 3D-modell.",
} as const;

/* Footer ------------------------------------------------------------------------------------------- */

export const footer = {
  tagline: "Alle fag under ett tak. Bygg og renovering i Bergen og omegn.",
  servicesTitle: "Tjenester",
  contactTitle: "Kontakt",
  companyTitle: "Firma",
  orgNrLabel: "Org.nr.",
  orgNr: "[MANGLER: org.nr.]",
  socialLabel: "Sosiale medier",
  social: "[MANGLER: lenker til sosiale medier]",
  privacy: { label: "Personvern", href: "/personvern/" },
  copyright: (year: number) => `© ${year} Bygg og Renovering Vest AS`,
  modelCredit:
    "3D-huset er vår tolkning av House in Bergen. Arkitektur: Kvalbein Korsøen Arkitektur.",
} as const;

/* 404 ----------------------------------------------------------------------------------------------- */

export const notFoundCopy = {
  title: "Siden finnes ikke",
  body: "Lenken kan være gammel, eller adressen kan ha en skrivefeil.",
  home: { label: "Til forsiden", href: "/" },
  services: { label: "Se tjenestene", href: "/tjenester/" },
  contact: "Finner du ikke det du leter etter? Ring oss på 94 01 66 10.",
} as const;

/* Missing facts --------------------------------------------------------------------------------------- */

export const missingFacts: MissingFact[] = [
  { key: "foundingYear", label: "stiftelsesår", where: ["Om oss: fakta om firmaet"] },
  {
    key: "orgNr",
    label: "org.nr.",
    where: ["Footer", "Om oss: fakta om firmaet", "Personvern: behandlingsansvarlig"],
  },
  { key: "sentralgodkjenning", label: "sentralgodkjenning", where: ["Om oss: fakta om firmaet"] },
  { key: "mesterbrev", label: "mesterbrev", where: ["Om oss: fakta om firmaet"] },
  { key: "team", label: "navn og bilder av teamet", where: ["Om oss: folkene bak"] },
  { key: "guarantee", label: "garantivilkår", where: ["Om oss: fakta om firmaet"] },
  { key: "social", label: "lenker til sosiale medier", where: ["Footer"] },
  {
    key: "clientPhotos",
    label: "egne prosjektbilder fra byggrv.no",
    where: ["Tjenester (forside og tjenestesider)", "Referanser"],
  },
  { key: "beforeAfterPhotos", label: "egne før- og etterbilder", where: ["Forside: før og etter"] },
  {
    key: "privacyOwner",
    label: "kontaktperson for personvern",
    where: ["Personvern: behandlingsansvarlig"],
  },
  { key: "privacyRetention", label: "lagringstid for henvendelser", where: ["Personvern: lagring"] },
  {
    key: "privacyProcessor",
    label: "navn på skjematjeneste og databehandleravtale",
    where: ["Personvern: hvem som får tilgang"],
  },
  {
    key: "privacyApproval",
    label: "godkjenning av personvernerklæringen",
    where: ["Personvern: sist oppdatert"],
  },
  {
    key: "formEndpoint",
    label: "adresse til skjematjeneste (NEXT_PUBLIC_FORM_ENDPOINT)",
    where: ["Kontakt: skjemaet faller tilbake til e-post til den er satt"],
  },
  {
    key: "clientHouse",
    label: "kundens eget hus: tegninger, bilder eller 3D-modell",
    where: ["Hero og Slik bygger vi bruker referansehuset til dette finnes"],
  },
];
