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
    formEndpoint: "skjematjeneste",
    clientHouse: "kundens egne nybygg (bilder)",
    boligpartnerRights: "bekreft avtale med Boligpartner om bruk av husmodell og bilder",
  },
} as const;

/* Navigation and shared UI strings ---------------------------------------------- */

export const nav: NavItem[] = [
  { label: "Slik bygger vi", href: "/#slik-bygger-vi" },
  { label: "Tjenester", href: "/tjenester/" },
  { label: "Husmodeller", href: "/husmodeller/" },
  { label: "Referanser", href: "/referanser/" },
  { label: "Om oss", href: "/om-oss/" },
  { label: "Kontakt", href: "/kontakt/" },
];

/** Section anchors on the home page (in page order). */
export const sectionIds = {
  hero: "topp",
  /** The build part of the hero (steps). Old links to /#slik-bygger-vi land here. */
  build: "slik-bygger-vi",
  leadServices: "dette-bygger-vi",
  references: "referanser",
  houseModels: "husmodeller",
  /** Kept from the old "Fra tegning til nøkkel" section so old links still work. */
  process: "fra-tegning-til-nokkel",
  allTrades: "alle-fag",
  about: "om-oss",
  contact: "kontakt",
  /** On /tjenester/pabygg-og-tilbygg/ (moved from the home page). */
  permits: "byggesoknad",
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
  homeLabel: "Bygg og Renovering Vest AS, til forsiden",
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

/**
 * Hero copy (DIRECTION-adria.md §6). The HERO components may keep their own
 * copy in build.ts; these keys stay for compatibility.
 */
export const hero = {
  headline: "Fra tegning til hus.",
  sub: "Vi bygger nye hus, tilbygg, påbygg og tak i Bergen og omegn. Byggesøknaden ordner vi, og én prosjektleder følger jobben til avtalt tid og pris.",
  cta: { label: cta.primary, href: cta.primaryHrefHome },
  secondary: { label: "Se hvordan vi bygger", href: "#slik-bygger-vi" },
  area: "Bergen og omegn",
  credit:
    "Husmodell Adria fra Boligpartner. Bilde: Boligpartner. [MANGLER: bekreft avtale med Boligpartner om bruk av husmodell og bilder]",
  creditLink: { label: "Om Adria", href: "/husmodeller/adria/" },
  posterAlt:
    "Husmodellen Adria med saltak, sett fra hagen: toetasjes hus med stående trekledning, sort tak, overbygd balkong og terrasse, plen og solsenger i forgrunnen.",
  dragHint: "Dra for å se huset fra en annen side",
} as const;

/* Home: full-bleed photo between "Alle fagene i eget firma" and "Om oss" ----------------------- */

export const interlude = {
  photoKey: "arbeid-over-bergen-bred" satisfies PhotoKey,
  caption: "På jobb over Bergen.",
} as const;

/* Home: "Dette bygger vi" (the three lead services) ---------------------------------------- */

export const leadServicesCopy = {
  title: "Dette bygger vi",
  lede: "Nye hus, tilbygg og påbygg, og tak. Vi tar hele jobben, fra søknad til ferdig bygg, med én prosjektleder.",
  nybygg: {
    title: "Nybygg",
    body: "Har du tomt, men ikke hus? Vi har lang erfaring med å sette opp hus, og leverer nøkkelferdig til avtalt tid og pris, etter dine spesifikasjoner.",
    link: { label: "Les om nybygg", href: "/tjenester/ny-bolig/" },
    modelsLink: { label: "Se husmodellene", href: "/husmodeller/" },
    drawingCaption: "Fasadetegning fra vår 3D-modell av husmodellen Adria.",
    drawingLabel: "Fasadetegning av husmodellen Adria sett fra hagen: to etasjer med saltak, store vindusfelt, overbygd balkong og pergola.",
  },
  tilbygg: {
    title: "Tilbygg og påbygg",
    body: "Et tilbygg gir huset større grunnflate. Et påbygg gir deg en ny etasje på huset du har. Byggesøknaden skriver og sender vi.",
    link: { label: "Les om tilbygg og påbygg", href: "/tjenester/pabygg-og-tilbygg/" },
    pairId: "tilbygg",
  },
  tak: {
    title: "Tak",
    body: "Nytt tak, reparasjoner, takrenner og nedløp. Vi ser over taket først og forteller deg hva som må gjøres.",
    link: { label: "Les om takarbeid", href: "/tjenester/takarbeid/" },
    photoKey: "nytt-tak" satisfies PhotoKey,
  },
  closing: "Vi tar også oppussing, bad, ombygging og rehabilitering.",
  allLink: { label: "Se alle tjenestene", href: "/tjenester/" },
} as const;

/* Home: "Alle fagene i eget firma" (the calm all-trades mention + all ten services) -------------- */

export const allTradesCopy = {
  title: "Alle fagene i eget firma",
  body: "Vi er håndverkere fra flere firmaer som er slått sammen til ett. Tømrer, elektriker, rørlegger, maler og murer jobber hos oss, og sprenging og grunnarbeid gjør vi selv. Du får én prosjektleder som samordner fagene.",
  listLabel: "Alle tjenestene våre",
  allLink: "Se alle tjenestene",
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
    "Nye hus, tilbygg og påbygg og tak først, og alt fra ombygging til nytt bad. Alle fagene er i eget firma, og én prosjektleder samordner jobben.",
} as const;

export const processCopy = {
  title: "Fra første samtale til overlevering",
  lede: "Den samme prosjektlederen følger deg hele veien.",
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
  /** Home band ("Prosjektark"). */
  homeTitle: "Jobber vi har gjort",
  homeLede: "Tre oppdrag fra referanselisten vår.",
  homeNote: "Bildene mellom arkene er fra andre jobber vi har gjort.",
  sketchCaption: "Skisse",
  photoNote: "Foto fra eget prosjekt.",
  sheetLink: (title: string) => `Les om ${title.charAt(0).toLowerCase()}${title.slice(1)}`,
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
    "Vi bygger for private, bedrifter og offentlige oppdragsgivere i Bergen og omegn, etter dine spesifikasjoner. Målet er å gjøre byggeprosessen så enkel som mulig for deg.",
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
    title: "Tilpasset jobben",
    body: "Vi tilpasser arbeidet til det du trenger, enten det er hele jobben eller bare en del av den.",
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

/* The house in the 3D model: Adria from Boligpartner ------------------------------------------------ */

/**
 * The hero builds our 3D interpretation of the catalogue house Adria from
 * Boligpartner. Its images are shown as supplied with a visible credit; the
 * supplier's drawings are never published. See src/content/house-models.ts.
 */
export const adriaHouse = {
  name: "Adria",
  supplier: "Boligpartner",
  supplierUrl: "https://boligpartner.no/ferdighus/moderne/adria",
  credit: "Husmodell Adria fra Boligpartner",
  photoCredit: "Bilde: Boligpartner",
  missing: "[MANGLER: bekreft avtale med Boligpartner om bruk av husmodell og bilder]",
  href: "/husmodeller/adria/",
  linkLabel: "Om Adria",
  /** /om-oss/ section. */
  title: "Huset i 3D-modellen",
  body: "Huset du ser bygges på forsiden er vår 3D-modell av husmodellen Adria fra Boligpartner.",
  modelNote:
    "Modellen er vår egen tolkning, laget etter leverandørens bilder og fakta. Interiøret i andre etasje er vår illustrasjon. Alle bilder merket «3D-modell» er gjengivelser av den.",
  shortNote: "3D-huset er vår tolkning av husmodellen.",
} as const;

/**
 * @deprecated Use adriaHouse. Kept so components that still read the old
 * reference house (pre-Adria hero/build sequence) show the Adria credit.
 */
export const referenceHouse = {
  title: adriaHouse.credit,
  name: adriaHouse.name,
  credit: adriaHouse.photoCredit,
  shortNote: adriaHouse.shortNote,
  note: `${adriaHouse.body} ${adriaHouse.missing}`,
} as const;

/* Footer ------------------------------------------------------------------------------------------- */

export const footer = {
  tagline: "Nye hus, tilbygg, påbygg og tak i Bergen og omegn.",
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
    "3D-huset er vår tolkning av husmodellen Adria fra Boligpartner. [MANGLER: bekreft avtale med Boligpartner om bruk av husmodell og bilder]",
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
      "Tjenester uten egne bilder: nybygg, bytte dører og vinduer, VVS og maling (viser 3D-gjengivelser)",
      "Referanser: rekkehus, Vestheim og Kjerrgarden",
    ],
  },
  {
    key: "bathPhotos",
    label: "egne badbilder",
    where: ["Tjenester: oppussing av bad (viser 3D-gjengivelser)"],
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
    label: "skjematjeneste",
    where: ["Kontakt: skjemaet faller tilbake til e-post til den er satt"],
  },
  {
    key: "clientHouse",
    label: "kundens egne nybygg (bilder)",
    where: ["Forside: hero og byggestegene viser husmodellen Adria til egne nybygg kan vises"],
  },
  {
    key: "boligpartnerRights",
    label: "bekreft avtale med Boligpartner om bruk av husmodell og bilder",
    where: ["Forside: hero og husmodeller", "Husmodeller", "Om oss", "Footer"],
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
    topic: "Husmodellen Adria",
    note: "Adria er en ferdighusmodell fra Boligpartner. Bildene vises slik leverandøren leverte dem (bare skalert og beskåret), alltid med «Bilde: Boligpartner». Fakta er hentet fra boligpartner.no; markedsføringspåstander og priser er ikke brukt. Fasadetegningene brukes bare som modelleringsgrunnlag og publiseres ikke. Skriftlig avtale med Boligpartner må på plass før lansering; uten den settes supplierImagesEnabled = false i src/content/house-models.ts.",
  },
  {
    topic: "Bilder",
    note: "Bare egne bilder er brukt. Stock- og tredjepartsbilder er listet i excludedImages (src/content/photos.ts) og i README. arbeid-over-bergen lå bare i mediebiblioteket og bør bekreftes som eget bilde.",
  },
];
