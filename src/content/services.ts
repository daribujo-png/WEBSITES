/**
 * The ten services. Copy is rewritten from the service pages on byggrv.no
 * (content-import/byggrv/pages/). Extra pages are folded in:
 * totalrenovering → oppussing-og-renovering, rorlegger-vvs → vvs,
 * tomrer → pabygg-og-tilbygg / ombygging / rehabilitering (+ trades).
 * Never the old shared "Har du tomt, men ikke hus?" paragraph.
 * Display order is set by SERVICE_ORDER below: the premium work first
 * (nybygg, påbygg og tilbygg, tak), then the rest (DIRECTION-adria.md §3).
 */
import type { Service, ServiceSlug } from "./types";

const allServices: Service[] = [
  {
    slug: "ny-bolig",
    title: "Nybygg",
    shortTitle: "Nybygg",
    lede: "Vi bygger huset etter dine ønsker og spesifikasjoner, og leverer det nøkkelferdig til avtalt tid og pris.",
    body: [
      "Vi har lang erfaring med å sette opp hus og andre bygg. Alle fagene er i eget firma. Vi sprenger og graver, støper grunnmuren, reiser bindingsverket og tetter huset med tak, vinduer og kledning.",
      "Hvert hus tilpasses dem som skal bo der. Vi begynner med hvordan du vil bo, og den samme prosjektlederen følger deg fra planlegging til ferdig hus. Byggesøknaden skriver og sender vi.",
      "Elektrikerne og rørleggerne våre legger installasjonene før veggene lukkes. Vi bygger etter gjeldende byggteknisk forskrift (TEK) og foreslår ENØK-tiltak der de passer.",
    ],
    includes: [
      "Planlegging etter dine ønsker",
      "Byggesøknad til kommunen",
      "Sprenging, graving og grunnarbeid",
      "Grunnmur og støp",
      "Bindingsverk, tak, vinduer og kledning",
      "Elektro og VVS",
      "Innvendig ferdigstilling og maling",
    ],
    trades: ["prosjektledelse", "sprenging", "mur-betong", "tomrer", "elektro", "vvs", "maler"],
    permitRelevant: true,
    cta: "Snakk med oss om nybygg",
    metaTitle: "Bygge nytt hus i Bergen",
    metaDescription:
      "Vi bygger ny bolig etter dine spesifikasjoner, fra byggesøknad og sprenging til nøkkelferdig hus. Alle fag i eget firma og én prosjektleder.",
    renderKey: "svc-ny-bolig",
    renderBrief: {
      a: "Det ferdige huset i dagslys, sett fra hagen mellom de to lønnetrærne.",
      b: "Råbygg: grunnmur og bindingsverk reist på tomten, før tak og kledning.",
    },
    photoKeys: [],
    legacyPaths: ["/ny-bolig/"],
  },
  {
    slug: "oppussing-og-renovering",
    title: "Oppussing og renovering",
    shortTitle: "Oppussing",
    lede: "Fra ett rom til hele huset. Vi pusser opp og totalrenoverer for private og offentlige oppdragsgivere i Bergen.",
    body: [
      "Vi tar de fleste typer oppussing: snekkerarbeid, maling, flislegging og gulv. Skal hele huset fornyes, gjør vi en totalrenovering. Da tas vegger, gulv og himlinger ned til de bærende konstruksjonene og bygges opp igjen.",
      "En innvendig totalrenovering gir nye overflater i alle rom, oppgraderte våtrom, nytt kjøkken og et oppgradert el-anlegg. Mange endrer planløsningen eller antall vinduer samtidig. Tar vi også utsiden, er det vanlig å etterisolere, drenere og skifte kledning og tak.",
      "Vil du bevare eller gjenskape originale detaljer i et eldre hus, som stukkatur, krever det ekstra arbeid. Ved større prosjekter kan det være lurt å trekke inn en interiørarkitekt tidlig. Vi bruker moderne utstyr og gjør arbeidet etter gjeldende forskrifter og standarder.",
    ],
    includes: [
      "Oppussing av ett eller flere rom",
      "Snekkerarbeid",
      "Maling og malerarbeid",
      "Flislegging og gulvarbeid",
      "Innvendig totalrenovering: overflater, våtrom, kjøkken og el-anlegg",
      "Utvendig: etterisolering, drenering, kledning og tak",
    ],
    trades: ["prosjektledelse", "tomrer", "elektro", "vvs", "maler", "mur-betong"],
    permitRelevant: false,
    cta: "Snakk med oss om oppussing",
    metaTitle: "Oppussing og totalrenovering i Bergen",
    metaDescription:
      "Oppussing og totalrenovering for private og offentlige oppdragsgivere i Bergen. Snekker, maler, flislegger, rørlegger og elektriker fra samme firma.",
    renderKey: "svc-oppussing-og-renovering",
    renderBrief: {
      a: "Snitt gjennom første etasje med nytt kjøkken og nye overflater.",
      b: "Stue og kjøkken mot hagen med varmt innelys.",
    },
    photoKeys: ["gang-etter", "gang-for"],
    legacyPaths: ["/tjenester/oppussing-og-renovering/", "/tjenester/totalrenovering/"],
  },
  {
    slug: "pabygg-og-tilbygg",
    title: "Påbygg og tilbygg",
    shortTitle: "Påbygg og tilbygg",
    lede: "Mer plass uten å flytte. Vi bygger på, til eller under huset du har, og ordner byggesøknaden.",
    body: [
      "Et påbygg er en ny bygningsdel oppå huset, for eksempel en ekstra etasje. Et tilbygg utvider grunnflaten, så huset tar mer plass på tomten. Underbygg og kjeller utvider huset nedover.",
      "Skal du bygge eller rive et påbygg, må byggesøknaden sendes med hjelp fra fagfolk. Det samme gjelder kjeller under et eksisterende hus. Vi ordner alle søknadene for deg.",
      "Det trengs ikke alltid store grep for å få boligen slik du vil ha den. Vi har lang erfaring med å finne den mest kostnadseffektive løsningen. Vi bygger også garasjer og terrasser.",
    ],
    includes: [
      "Byggesøknad for påbygg, tilbygg og kjeller",
      "Sprenging, grunnarbeid og fundament",
      "Bindingsverk og tak",
      "Tilkobling av el og VVS",
      "Garasjer og terrasser",
      "Kledning og maling, ute og inne",
    ],
    trades: ["prosjektledelse", "sprenging", "mur-betong", "tomrer", "elektro", "vvs", "maler"],
    permitRelevant: true,
    cta: "Snakk med oss om påbygg eller tilbygg",
    metaTitle: "Påbygg og tilbygg i Bergen",
    metaDescription:
      "Påbygg, tilbygg, kjeller og garasje i Bergen og omegn. Vi finner den mest kostnadseffektive løsningen og ordner byggesøknaden for deg.",
    renderKey: "svc-pabygg-og-tilbygg",
    renderBrief: {
      a: "Huset med et nytt tilbygg på siden, markert i eik.",
      b: "Huset med en ny etasje på toppen, markert i eik.",
    },
    photoKeys: ["tilbygg-etter", "tilbygg-for"],
    legacyPaths: ["/tjenester/pabygg-og-tilbygg/"],
  },
  {
    slug: "ombygging",
    title: "Ombygging",
    shortTitle: "Ombygging",
    lede: "Ny planløsning i huset du allerede har. Vi flytter vegger, rom og funksjoner.",
    body: [
      "Ombygging tilpasser boligen til nye behov. Du kan modernisere kjøkkenet, gjøre stuen større, få et ekstra rom eller fornye en hel etasje. På Kjerrgarden var oppdraget å flytte kjøkkenet inn i spisestuen og gjøre det gamle kjøkkenet om til soverom.",
      "Når rom flyttes, må strøm, vann og avløp ofte følge med. Den delen tar elektrikerne og rørleggerne våre. Prosjektlederen planlegger rekkefølgen sammen med deg og holder deg oppdatert underveis.",
      "Vi tilpasser løsningen til smaken og budsjettet ditt og leverer til avtalt tid og pris. Er ombyggingen søknadspliktig, skriver og sender vi søknaden.",
    ],
    includes: [
      "Ny planløsning og flytting av vegger",
      "Nytt eller flyttet kjøkken",
      "Større bad eller et ekstra rom",
      "Omlegging av el, vann og avløp",
      "Overflater, listverk og maling",
      "Byggesøknad når det kreves",
    ],
    trades: ["prosjektledelse", "tomrer", "elektro", "vvs", "maler"],
    permitRelevant: true,
    cta: "Snakk med oss om ombygging",
    metaTitle: "Ombygging og ny planløsning i Bergen",
    metaDescription:
      "Flytt kjøkken, bad og vegger. Vi bygger om boligen din med alle fag i eget firma, til avtalt tid og pris, og søker når det kreves.",
    renderKey: "svc-ombygging",
    renderBrief: {
      a: "Plantegning av første etasje sett ovenfra, med kjøkken, stue og bad.",
      b: "Innvendige vegger i bindingsverk under ombygging.",
    },
    photoKeys: ["gang-for", "gang-etter"],
    legacyPaths: ["/tjenester/ombygging/"],
  },
  {
    slug: "rehabilitering-og-renovering",
    title: "Rehabilitering og renovering",
    shortTitle: "Rehabilitering",
    lede: "Vi setter eldre bygg i stand, innvendig og utvendig, for private og offentlige oppdragsgivere.",
    body: [
      "Oppussing handler som regel om overflatene. Renovering går lenger. Da rives rommet inn til bjelkelaget eller betongen og bygges i praksis opp på nytt, og rør, ventilasjon og el-anlegg oppgraderes.",
      "Vi starter med en befaring og ser på hva bygget faktisk trenger. Noen ganger holder det å reparere. Andre ganger må bygningsdeler skiftes ut, eller føres tilbake til slik de var.",
      "Når bygget likevel åpnes, er det et godt tidspunkt for etterisolering og tetting. Vi foreslår ENØK-tiltak der de passer.",
    ],
    terms: [
      {
        term: "Oppussing",
        definition: "Kosmetisk arbeid, som å male, skifte gulv, sette opp nye gipsplater eller bytte kjøkken.",
      },
      {
        term: "Rehabilitering",
        definition: "Å sette bygningsdeler og komponenter i stand uten å endre hva de brukes til.",
      },
      { term: "Renovering", definition: "Å oppgradere, eller heve standarden til et akseptabelt nivå." },
      { term: "Reparasjon", definition: "Å gjenopprette funksjonen til en bygningsdel som er defekt." },
      { term: "Restaurering", definition: "Å føre noe tilbake til slik det var tidligere." },
    ],
    includes: [
      "Befaring og gjennomgang av bygget",
      "Riving inn til bjelkelag eller betong",
      "Nye rør, ny ventilasjon og nytt el-anlegg",
      "Utskifting av kledning, vinduer og dører",
      "Etterisolering og tetting",
      "Restaurering av eldre detaljer",
    ],
    trades: ["prosjektledelse", "tomrer", "elektro", "vvs", "maler", "mur-betong"],
    permitRelevant: false,
    cta: "Snakk med oss om rehabilitering",
    metaTitle: "Rehabilitering av eldre bygg i Bergen",
    metaDescription:
      "Vi rehabiliterer og renoverer eldre hus og bygg i Bergen og omegn, innvendig og utvendig, for private og offentlige oppdragsgivere.",
    renderKey: "svc-rehabilitering-og-renovering",
    renderBrief: {
      a: "Fasade der deler av kledningen er tatt av og byttes.",
      b: "Vegg åpnet ned til trefiberisolasjon og vindsperre.",
    },
    photoKeys: ["firemannsbolig", "minigraver-skifer", "nytt-tak"],
    legacyPaths: ["/tjenester/rehabilitering-og-renovering/"],
  },
  {
    slug: "takarbeid",
    title: "Takarbeid",
    shortTitle: "Tak",
    lede: "Nytt tak, reparasjon eller inspeksjon. Et tett tak beskytter hele huset mot vær og vind.",
    body: [
      "Vi legger ny taktekking, reparerer skader og vedlikeholder tak. Vi jobber med ulike takmaterialer, og vi bygger takkonstruksjonen på nye hus og påbygg.",
      "Takrenner og nedløp leder vannet bort før det gir fuktskader og råte på tak og fasade. Vi monterer nye og vedlikeholder dem du har.",
      "Er du usikker på taket, kommer vi på inspeksjon. Du får råd ut fra det vi finner, så du kan bestemme hva som skal gjøres. Vi gir garanti på takarbeidet. [MANGLER: garantivilkår]",
    ],
    includes: [
      "Ny taktekking",
      "Reparasjon og vedlikehold",
      "Takstoler og takkonstruksjon",
      "Takrenner og nedløp",
      "Inspeksjon og rådgivning",
      "Byggesøknad ved ny takform",
    ],
    trades: ["prosjektledelse", "tomrer"],
    permitRelevant: true,
    cta: "Snakk med oss om tak",
    metaTitle: "Takarbeid og nytt tak i Bergen",
    metaDescription:
      "Ny taktekking, reparasjoner, takrenner og nedløp, inspeksjon og råd. Vi gjør takarbeid på nye og eldre hus i Bergen og omegn.",
    renderKey: "svc-takarbeid",
    renderBrief: {
      a: "Takstoler på plass over andre etasje, før tekking.",
      b: "Nærbilde av mørkt, falset metalltak mot mønet.",
    },
    photoKeys: ["nytt-tak"],
    legacyPaths: ["/tjenester/takarbeid/"],
  },
  {
    slug: "dorer-og-vinduer",
    title: "Bytte dører og vinduer",
    shortTitle: "Dører og vinduer",
    lede: "Nye vinduer og dører gir mindre trekk og et hus som er lettere å holde varmt.",
    body: [
      "Vinduer varer normalt i 20 til 30 år. Fukt og råte skader ofte karmen, og eldre vinduer slipper ut mye varme. Når du bytter, merker du raskt mindre trekk og et bedre inneklima.",
      "Et godt resultat starter med riktig vindu eller dør, målt så det passer i åpningen du har. Her er det mange fallgruver. Vi hjelper deg å velge, monterer, tetter rundt karmen og avslutter med beslag og lister.",
      "Vil du ha større vindusflater eller en ny døråpning, bygger tømrerne om veggen, og maleren gjør ferdig rundt. Endringer i fasaden kan være søknadspliktige. Da søker vi for deg.",
    ],
    includes: [
      "Hjelp til å velge vinduer og dører",
      "Oppmåling av åpningene du har",
      "Utskifting av vinduer og ytterdører",
      "Tetting, beslag og lister",
      "Nye og større åpninger i veggen",
      "Innvendige dører",
      "Maling rundt nye vinduer og dører",
    ],
    trades: ["prosjektledelse", "tomrer", "maler"],
    permitRelevant: true,
    cta: "Snakk med oss om dører og vinduer",
    metaTitle: "Bytte dører og vinduer i Bergen",
    metaDescription:
      "Nye vinduer og dører gir mindre trekk og bedre inneklima. Vi måler, monterer, tetter og maler ferdig rundt, i Bergen og omegn.",
    renderKey: "svc-dorer-og-vinduer",
    renderBrief: {
      a: "Store vinduer mot hagen, nærbilde av karm og lister.",
      b: "Vindusåpninger i bindingsverket før vinduene settes inn.",
    },
    photoKeys: [],
    legacyPaths: ["/tjenester/bytte-dorer-og-vinduer/"],
  },
  {
    slug: "oppussing-av-bad",
    title: "Oppussing av bad",
    shortTitle: "Bad",
    lede: "Et nytt bad samler mange fag på få kvadratmeter. Hos oss kommer alle fra samme firma.",
    body: [
      "Vi bygger badet i stilen du vil ha, enkelt og moderne eller mer tradisjonelt. Vil du ha mer plass, flytter vi vegger. På Kjerrgarden var oppdraget å pusse opp og utvide badet.",
      "Rørleggerne våre monterer dusj, badekar og toalett, og legger gulvvarme eller vannbåren varme. Vi har godkjenning for byggebransjens våtromsnorm (BVN). Det betyr at vi følger faste retningslinjer for våtrom, og at materialene holder den standarden et tett og trygt bad krever.",
      "Når badet er ferdig, viser vi deg hvordan du bruker og vedlikeholder det. Vi gir garanti på arbeidet. [MANGLER: garantivilkår]",
    ],
    includes: [
      "Riving og nytt underlag",
      "Membran og fall mot sluk",
      "Fliser og murarbeid",
      "Dusj, badekar, toalett og servant",
      "Gulvvarme og vannbåren varme",
      "Elektro og lys",
      "Større bad og ny planløsning",
    ],
    trades: ["prosjektledelse", "tomrer", "mur-betong", "vvs", "elektro", "maler"],
    permitRelevant: false,
    cta: "Snakk med oss om nytt bad",
    metaTitle: "Oppussing av bad i Bergen",
    metaDescription:
      "Nytt bad i Bergen og omegn, bygget etter byggebransjens våtromsnorm (BVN). Rørlegger, elektriker, snekker og flislegger fra samme firma.",
    renderKey: "svc-oppussing-av-bad",
    renderBrief: {
      a: "Badet i snitt med membran, sluk og fliser.",
      b: "Ferdig bad med sanitærutstyr og varmt lys.",
    },
    photoKeys: [],
    legacyPaths: ["/tjenester/oppussing-av-bad/"],
  },
  {
    slug: "vvs",
    title: "VVS",
    shortTitle: "VVS",
    lede: "Vann, avløp, varme og ventilasjon, lagt av egne rørleggere i Bergen og omegn.",
    body: [
      "Rørleggerne våre installerer og reparerer sanitæranlegg, varmeanlegg og andre røranlegg, fra nye vann- og avløpsledninger til kraner, oppvaskmaskin og vaskemaskin. De er en del av samme firma som snekkerne og elektrikerne, så rørføringene planlegges før veggene lukkes.",
      "God ventilasjon gir et sunnere inneklima med mindre fukt og mugg. Vi installerer ventilasjonsanlegg og tar service og vedlikehold.",
      "Vil du bruke mindre energi, ser vi på varmeanlegget og foreslår tiltak som sparer energi. Vi gir råd om valg av varmepumpe og installerer den. Arbeidet dokumenterer vi.",
    ],
    includes: [
      "Vann- og avløpsledninger",
      "Sanitærutstyr, armatur og ledningsnett",
      "Vannbåren varme og gulvvarme",
      "Ventilasjon: installasjon, service og vedlikehold",
      "Råd om og installasjon av varmepumpe",
      "Gass-, sprinkler-, trykkluft- og isvannsanlegg",
      "Servicearbeid og dokumentasjon",
    ],
    trades: ["prosjektledelse", "vvs"],
    permitRelevant: false,
    cta: "Snakk med oss om VVS",
    metaTitle: "Rørlegger og VVS i Bergen",
    metaDescription:
      "Egne rørleggere i Bergen og omegn: vann og avløp, sanitær, vannbåren varme, ventilasjon og varmepumpe. Vi dokumenterer arbeidet.",
    renderKey: "svc-vvs",
    renderBrief: {
      a: "Røntgenvisning av huset med rør og avløp som lysende linjer.",
      b: "Rørføringer i vegg og bjelkelag ved badet.",
    },
    photoKeys: [],
    legacyPaths: ["/tjenester/vvs/", "/tjenester/rorlegger-vvs/"],
  },
  {
    slug: "maling",
    title: "Maling",
    shortTitle: "Maling",
    lede: "Vi maler ute og inne, og gjør forarbeidet som får malingen til å vare.",
    body: [
      "Været i Bergen er hardt mot en fasade. Vi høytrykksvasker og fjerner gammel maling der det trengs, og velger utstyr og maling etter jobben.",
      "Inne maler og tapetserer vi, og vi legger gulvbelegg og fliser. Skal du selge, kan nymalte flater gjøre boligen mer attraktiv for kjøperne.",
      "Trenger kledningen reparasjon før maling, tar tømrerne våre den delen. I et større prosjekt planlegges malingen inn fra start, fordi maleren er en del av samme firma.",
    ],
    includes: [
      "Maling av fasader og bygg",
      "Maling innvendig og tapetsering",
      "Høytrykksvask og malingsfjerning",
      "Sprøytemaling",
      "Gulvbelegg, tepper og flislegging",
      "Våtrom og membran",
      "Muring og murpuss",
    ],
    trades: ["prosjektledelse", "maler", "tomrer", "mur-betong"],
    permitRelevant: false,
    cta: "Snakk med oss om maling",
    metaTitle: "Maling ute og inne i Bergen",
    metaDescription:
      "Maling av fasader og innvendige flater, tapetsering, høytrykksvask og sprøytemaling i Bergen og omegn, med grundig forarbeid.",
    renderKey: "svc-maling",
    renderBrief: {
      a: "Stående trekledning, ubehandlet.",
      b: "Den samme fasaden ferdig malt.",
    },
    photoKeys: [],
    legacyPaths: ["/tjenester/maling/"],
  },
];

/** Premium work first: nybygg, påbygg og tilbygg and tak lead every list of services. */
const SERVICE_ORDER: ServiceSlug[] = [
  "ny-bolig",
  "pabygg-og-tilbygg",
  "takarbeid",
  "ombygging",
  "oppussing-og-renovering",
  "rehabilitering-og-renovering",
  "dorer-og-vinduer",
  "oppussing-av-bad",
  "vvs",
  "maling",
];

export const services: Service[] = SERVICE_ORDER.map((slug) => {
  const service = allServices.find((s) => s.slug === slug);
  if (!service) throw new Error(`Unknown service in SERVICE_ORDER: ${slug}`);
  return service;
});

export const serviceSlugs: ServiceSlug[] = services.map((s) => s.slug);

export function getService(slug: string): Service | undefined {
  return services.find((s) => s.slug === slug);
}

/**
 * Old byggrv.no paths that moved (for static redirect pages or host rules).
 * Paths that stay the same are left out.
 */
export const legacyRedirects: { from: string; to: string }[] = [
  ...services.flatMap((s) =>
    s.legacyPaths
      .filter((from) => from !== `/tjenester/${s.slug}/`)
      .map((from) => ({ from, to: `/tjenester/${s.slug}/` })),
  ),
  // "Tømrer" covered several services; its facts are folded into them.
  { from: "/tjenester/tomrer/", to: "/tjenester/" },
];

/** Options for the contact form's project type select. */
export const projectTypeOptions: { value: string; label: string }[] = [
  ...services.map((s) => ({ value: s.slug, label: s.title })),
  { value: "annet", label: "Annet" },
];
