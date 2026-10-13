/**
 * Site-wide copy and company facts.
 * Facts come only from the client brief and the imported byggrv.no text
 * (content-import/byggrv/). Missing facts are written as
 * "[MANGLER: …]" tokens; render strings that may contain them with
 * <TextWithMissing> from "@/components/ui".
 */
import type { MissingFact, NavItem, PhotoKey, Trade, Value } from "./types";

/* Company -------------------------------------------------------------------- */

const phone = "94\u00a001\u00a066\u00a010";
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
    clientPhotos: "egne prosjektbilder",
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
  photoNote: "Foto fra eget prosjekt",
  logoAlt: "Bygg & Renovering Vest AS",
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
  /** Supporting photo (own worksite photo over Bergen). */
  photoKey: "arbeid-over-bergen-bred" satisfies PhotoKey,
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
  /** Under services that show renders because no own photo exists yet. */
  imagesNote:
    "Vi har ikke egne bilder av denne typen jobb ennå, så her viser vi gjengivelser fra 3D-modellen. [MANGLER: egne prosjektbilder]",
  photosNote: "Foto fra egne prosjekter.",
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
  lede: "Mange byggeprosjekter må søkes om hos kommunen. Den jobben tar vi: Vi skriver søknaden og sender den for deg.",
  body: "Skal du bygge eller rive et påbygg, eller grave ut kjeller under et eksisterende hus, må søknaden sendes med hjelp fra fagfolk. Om prosjektet ditt er søknadspliktig, avklarer vi før du får tilbudet.",
  /** External link to DiBK (opens in a new tab). */
  exemptLink: {
    label: "Se hva du kan bygge uten å søke",
    href: "https://www.dibk.no/bygge-selv/dette-kan-du-bygge-uten-a-soke/bygg-garasje-uten-a-soke",
    source: "Direktoratet for byggkvalitet",
  },
  listLabel: "Bygg vi søker om",
  dragHint: "Dra for å snu modellen",
  diagramNote: "Grått viser huset du har. Eik viser det nye.",
} as const;

export const beforeAfterCopy = {
  title: "Før og etter",
  lede: "Dra i håndtaket, eller bruk piltastene, for å sammenligne.",
  /** Under the photo pairs (beforeAfterPairs). */
  note: "Foto fra egne prosjekter.",
  /** Under render pairs (renderBeforeAfterPairs). */
  renderNote: "Illustrasjon fra vår 3D-modell, ikke foto fra et ferdig prosjekt.",
} as const;

export const referencesCopy = {
  title: "Referanser",
  lede: "Et utvalg av oppdragene våre: en innvendig rehabilitering, innredning av leiligheter og et nytt bad og kjøkken.",
  scopeLabel: "Arbeid",
  placeLabel: "Sted",
  categoryLabel: "Type oppdrag",
  allLink: "Se alle referansene",
  photosTitle: "Fra prosjektene våre",
  photosLede: "Bilder fra jobber vi har gjort.",
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
  lede: "Bygg og Renovering Vest AS er en gruppe erfarne fagfolk med ulik bakgrunn. Vi har slått oss sammen for å kunne levere hele jobben selv.",
  body: [
    "Vi skreddersyr løsninger for private, bedrifter og offentlige oppdragsgivere i Bergen og omegn, og bygger etter dine spesifikasjoner. Målet er å gjøre byggeprosessen så enkel som mulig for deg.",
    "Alle fagene er samlet i én bedrift: entreprenør, tømrer, elektriker, VVS, maler, mur og betong og sprenging. Firmaene som er slått sammen, har drevet stabilt over tid.",
    "Du får en egen prosjektleder som samordner fagene og følger opp tidsplanen. Vi leverer nøkkelferdig, til avtalt tid og pris.",
  ],
  /** Supporting photo (own worksite photo over Bergen). */
  photoKey: "arbeid-over-bergen" satisfies PhotoKey,
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
    body: "Når vi tar et oppdrag, ser vi etter gode ENØK-tiltak, både i nybygg og når vi pusser opp.",
  },
  {
    id: "miljo",
    title: "Miljøansvar",
    body: "Det vi bygger, skal være bra for miljøet. Det tar vi med i løsningene vi foreslår.",
  },
  {
    id: "fleksibel",
    title: "Fleksible løsninger",
    body: "Vi tilpasser løsningen til dine behov, enten du trenger hele jobben eller bare en del av den.",
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
    body: "Entreprenørtjenester og en egen prosjektleder som samordner fagene og følger opp tidsplanen.",
  },
  {
    id: "tomrer",
    name: "Tømrer",
    body: "Alle typer tømrerarbeid: nybygg, ombygging, tilbygg, garasjer, terrasser, rehabilitering og restaurering.",
  },
  {
    id: "elektro",
    name: "Elektro",
    body: "Nye el-anlegg i nybygg og tilbygg, og oppgradering av eldre anlegg ved renovering.",
  },
  {
    id: "vvs",
    name: "VVS",
    body: "Vann og avløp, sanitær, vannbåren varme, ventilasjon og varmepumpe.",
  },
  {
    id: "maler",
    name: "Maler",
    body: "Maling ute og inne, tapetsering, høytrykksvask og sprøytemaling.",
  },
  {
    id: "mur-betong",
    name: "Mur og betong",
    body: "Grunnmur og støp, flislegging, muring og murpuss.",
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
  contact: "Finner du ikke det du leter etter? Ring oss på 94\u00a001\u00a066\u00a010.",
} as const;

/* Missing facts --------------------------------------------------------------------------------------- */

/**
 * Every visible [MANGLER: …] placeholder and where it appears.
 * Resolved by the byggrv.no import: before/after photos (real pairs now) and
 * some project photos (see src/content/photos.ts).
 */
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
  {
    key: "guarantee",
    label: "garantivilkår",
    where: ["Om oss: fakta om firmaet", "Tjenester: takarbeid", "Tjenester: oppussing av bad"],
  },
  { key: "social", label: "lenker til sosiale medier", where: ["Footer"] },
  {
    key: "clientPhotos",
    label: "egne prosjektbilder",
    where: [
      "Tjenester uten egne bilder: ny bolig, bytte dører og vinduer, oppussing av bad, VVS og maling (viser 3D-gjengivelser)",
      "Referanser: rekkehus, Vestheim og Kjerrgarden",
    ],
  },
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

/* Editorial notes (handover only, never rendered) -------------------------------------------------- */

/**
 * Oddities in the imported byggrv.no text and how the copy handles them.
 * The client should confirm these before launch.
 */
export const contentNotes: { topic: string; note: string }[] = [
  {
    topic: "Referanser: rekkehus",
    note: "Kildeteksten nevner ikke navnet Svein (det kommer fra briefen). Den nevner «Adrian» og anbefaler «Bergen Operating Group», som tok jobben på kort varsel. Vi gjengir bare det briefen bekrefter: fornøyd med sluttresultatet og kommunikasjonen. Anbefalingen og «kort varsel» er utelatt fordi de står under et annet firmanavn. Bekreft at referansen gjelder Bygg og Renovering Vest, og at kunden godtar å bli sitert med fornavn.",
  },
  {
    topic: "Referanser: rekkehus, omfang",
    note: "Kunden ba om pris på snekker, maler, rørlegger og elektriker, men ifølge teksten leverte firmaet snekker- og malerarbeidet. Vi oppgir bare det.",
  },
  {
    topic: "Referanser: Vestheim, Askøy",
    note: "Kildeteksten har ordlyd fra en stillingsannonse («Fast pris på jobben, eller delenterprise pr leilighet», «Mulighet for fast ansettelse i firma»). Vi beskriver bare arbeidet. «6 mannsbolig» er tolket som seksmannsbolig (seks boenheter), ikke en bolig for seks personer.",
  },
  {
    topic: "Referanser: Kjerrgarden",
    note: "Stedsnavnet kommer fra briefen. Kildeteksten sier bare «Renovering» og beskriver ønsket arbeid, så vi skriver «Oppdraget var å …».",
  },
  {
    topic: "Maling og Rørlegger VVS",
    note: "Kildetekstene bruker firmanavnet «Mesterfag Gruppen (AS)». Navnet er ikke brukt; fakta om tjenestene er brukt.",
  },
  {
    topic: "Oppussing av bad",
    note: "Kildeteksten sier at firmaet har godkjenning for byggebransjens våtromsnorm (BVN). Bekreft godkjenningen før lansering.",
  },
  {
    topic: "Takarbeid og bad",
    note: "Kildetekstene lover garanti, men oppgir ikke vilkår. Vist med [MANGLER: garantivilkår].",
  },
  {
    topic: "Om oss",
    note: "«Vi er den eneste tilbyder i Bergen av vårt slag» og «godt rykte» er ikke brukt, fordi påstandene ikke kan dokumenteres på siden.",
  },
  {
    topic: "VVS",
    note: "Kildeteksten forklarer VVS som «vann, ventilasjon og sanitær». Vi lister tjenestene i stedet for å forklare forkortelsen.",
  },
  {
    topic: "Logo",
    note: "Logovarianter med «Tlf. 922 23 222» er ikke brukt, fordi nummeret avviker fra 94 01 66 10.",
  },
  {
    topic: "Bilder",
    note: "Bare egne bilder er brukt. Stock- og tredjepartsbilder er listet i excludedImages (src/content/photos.ts) og i README. arbeid-over-bergen lå bare i mediebiblioteket og bør bekreftes som eget bilde.",
  },
];
