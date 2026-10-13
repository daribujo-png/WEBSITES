/**
 * The ten services. Each has its own specific copy (never the old shared
 * "Har du tomt, men ikke hus?" paragraph). Order = display order.
 */
import type { Service, ServiceSlug } from "./types";

export const services: Service[] = [
  {
    slug: "ny-bolig",
    title: "Ny bolig",
    shortTitle: "Ny bolig",
    lede: "Vi bygger boligen etter dine ønsker og spesifikasjoner, og leverer den nøkkelferdig til avtalt tid og pris.",
    body: [
      "Et nytt hus starter med tomten. Vi skriver byggesøknaden, gjør tomten klar med graving og sprenging, og støper grunnmuren. Så reiser tømrerne bindingsverket og tetter huset med tak, vinduer og kledning.",
      "Inne legger elektrikerne og rørleggerne våre de tekniske installasjonene før vegger kles, gulv legges og bad bygges. Maleren gjør ferdig til slutt. Alle fagene kommer fra oss, så du har én avtale og én prosjektleder gjennom hele byggingen.",
      "Vi bygger etter gjeldende byggteknisk forskrift (TEK) og foreslår energieffektive løsninger der det passer i prosjektet ditt.",
    ],
    includes: [
      "Byggesøknad til kommunen",
      "Graving, sprenging og grunnarbeid",
      "Grunnmur og støp",
      "Bindingsverk, tak, vinduer og kledning",
      "Elektro og VVS",
      "Innvendig ferdigstilling og maling",
    ],
    trades: ["prosjektledelse", "sprenging", "mur-betong", "tomrer", "elektro", "vvs", "maler"],
    permitRelevant: true,
    cta: "Snakk med oss om ny bolig",
    metaTitle: "Bygge nytt hus i Bergen",
    metaDescription:
      "Vi bygger ny bolig etter dine ønsker, fra byggesøknad og sprenging til nøkkelferdig hus. Alle fag i eget firma og én prosjektleder.",
    renderKey: "svc-ny-bolig",
    renderBrief: {
      a: "Det ferdige huset i dagslys, sett fra hagen mellom de to lønnetrærne.",
      b: "Råbygg: grunnmur og bindingsverk reist på tomten, før tak og kledning.",
    },
  },
  {
    slug: "oppussing-og-renovering",
    title: "Oppussing og renovering",
    shortTitle: "Oppussing",
    lede: "Nytt kjøkken, nye gulv eller et helt hus som skal fornyes. Vi tar ett rom eller alle.",
    body: [
      "Oppussing samler ofte mange fag på kort tid. Snekkeren river og bygger opp, elektrikeren flytter punkter, rørleggeren kobler om og maleren gjør ferdig. Hos oss kommer alle fra samme firma, og prosjektlederen setter dem opp i riktig rekkefølge.",
      "Vi kommer på befaring før du får pris, så du vet hva jobben omfatter. Underveis holder prosjektlederen deg oppdatert på fremdriften.",
      "Når vegger og gulv likevel åpnes, er det et godt tidspunkt for etterisolering og andre ENØK-tiltak. Vi sier fra når vi ser muligheten.",
    ],
    includes: [
      "Riving og oppbygging av vegger, gulv og himling",
      "Nytt kjøkken og nye overflater",
      "Flytting og fornying av el-punkter",
      "Omlegging av rør og avløp",
      "Sparkling og maling",
      "Etterisolering når konstruksjonen er åpen",
    ],
    trades: ["prosjektledelse", "tomrer", "elektro", "vvs", "maler"],
    permitRelevant: false,
    cta: "Snakk med oss om oppussing",
    metaTitle: "Oppussing og renovering i Bergen",
    metaDescription:
      "Oppussing av ett rom eller hele huset. Snekker, elektriker, rørlegger og maler fra samme firma, samordnet av én prosjektleder.",
    renderKey: "svc-oppussing-og-renovering",
    renderBrief: {
      a: "Snitt gjennom første etasje med nytt kjøkken og nye overflater.",
      b: "Stue og kjøkken mot hagen med varmt innelys.",
    },
  },
  {
    slug: "pabygg-og-tilbygg",
    title: "Påbygg og tilbygg",
    shortTitle: "Påbygg og tilbygg",
    lede: "Mer plass uten å flytte. Vi bygger ut eller opp, og ordner byggesøknaden for deg.",
    body: [
      "Et tilbygg utvider huset på bakken. Et påbygg gir en ny etasje eller en ny bygningsdel oppå det du har. Begge krever som regel søknad til kommunen, og den skriver og sender vi.",
      "Det nye skal kobles til det gamle: fundament, bæring, tak, tetting, strøm og vann. Vi har alle fagene selv, så overgangen mellom nytt og eksisterende er vårt ansvar fra start til slutt.",
      "Skal du grave ut kjeller eller bygge garasje under huset, søker vi om det også. Sprenging og grunnarbeid gjør vi i eget firma.",
    ],
    includes: [
      "Byggesøknad for påbygg og tilbygg",
      "Grunnarbeid, sprenging og fundament",
      "Bindingsverk og tak",
      "Tilkobling av el og VVS",
      "Kledning og maling, ute og inne",
    ],
    trades: ["prosjektledelse", "sprenging", "mur-betong", "tomrer", "elektro", "vvs", "maler"],
    permitRelevant: true,
    cta: "Snakk med oss om påbygg eller tilbygg",
    metaTitle: "Påbygg og tilbygg i Bergen",
    metaDescription:
      "Mer plass uten å flytte. Vi bygger påbygg og tilbygg i Bergen og omegn og ordner byggesøknaden for deg.",
    renderKey: "svc-pabygg-og-tilbygg",
    renderBrief: {
      a: "Huset med et nytt tilbygg på siden, markert i eik.",
      b: "Huset med en ny etasje på toppen, markert i eik.",
    },
  },
  {
    slug: "ombygging",
    title: "Ombygging",
    shortTitle: "Ombygging",
    lede: "Ny planløsning i huset du allerede har. Vi flytter vegger, rom og funksjoner.",
    body: [
      "Ombygging endrer hvordan boligen brukes. Et kjøkken kan flytte inn i spisestuen, og det gamle kjøkkenet kan bli et soverom. Det gjorde vi på Kjerrgarden.",
      "Når rom flyttes, må strøm, vann og avløp ofte følge med. Elektrikerne og rørleggerne våre tar den delen, og prosjektlederen planlegger rekkefølgen sammen med deg.",
      "Er ombyggingen søknadspliktig, skriver og sender vi søknaden.",
    ],
    includes: [
      "Ny planløsning og flytting av vegger",
      "Flytting av kjøkken og bad",
      "Omlegging av el, vann og avløp",
      "Overflater, listverk og maling",
      "Byggesøknad når det kreves",
    ],
    trades: ["prosjektledelse", "tomrer", "elektro", "vvs", "maler"],
    permitRelevant: true,
    cta: "Snakk med oss om ombygging",
    metaTitle: "Ombygging og ny planløsning i Bergen",
    metaDescription:
      "Flytt kjøkken, bad og vegger. Vi bygger om boligen din med alle fag i eget firma, og søker når det kreves.",
    renderKey: "svc-ombygging",
    renderBrief: {
      a: "Plantegning av første etasje sett ovenfra, med kjøkken, stue og bad.",
      b: "Innvendige vegger i bindingsverk under ombygging.",
    },
  },
  {
    slug: "rehabilitering-og-renovering",
    title: "Rehabilitering og renovering",
    shortTitle: "Rehabilitering",
    lede: "Vi setter eldre bygg i stand igjen, innvendig og utvendig, for private og offentlige oppdragsgivere.",
    body: [
      "Rehabilitering betyr å reparere og fornye det som er slitt: kledning, vinduer, tak, bad og el-anlegg. Vi starter med en befaring og ser på hva bygget faktisk trenger.",
      "Et av prosjektene våre er en full innvendig rehabilitering av et rekkehus. Snekker, maler, rørlegger og elektriker kom fra oss.",
      "Når bygget likevel åpnes, er det et godt tidspunkt for etterisolering og tetting. Vi foreslår ENØK-tiltak der det passer.",
    ],
    includes: [
      "Befaring og gjennomgang av bygget",
      "Utskifting av kledning, vinduer og dører",
      "Fornying av bad, rør og el-anlegg",
      "Etterisolering og tetting",
      "Maling ute og inne",
    ],
    trades: ["prosjektledelse", "tomrer", "elektro", "vvs", "maler", "mur-betong"],
    permitRelevant: false,
    cta: "Snakk med oss om rehabilitering",
    metaTitle: "Rehabilitering av eldre bygg i Bergen",
    metaDescription:
      "Vi setter eldre hus og bygg i stand, innvendig og utvendig, for private og offentlige oppdragsgivere i Bergen og omegn.",
    renderKey: "svc-rehabilitering-og-renovering",
    renderBrief: {
      a: "Fasade der deler av kledningen er tatt av og byttes.",
      b: "Vegg åpnet ned til trefiberisolasjon og vindsperre.",
    },
  },
  {
    slug: "takarbeid",
    title: "Takarbeid",
    shortTitle: "Tak",
    lede: "Nytt tak, utskifting eller ny takkonstruksjon. Vi gjør jobben fra sperrene og opp.",
    body: [
      "Taket beskytter alt under det. Vi bygger takkonstruksjoner på nye hus og påbygg, legger ny tekking og skifter ut gamle tak som har gjort jobben sin.",
      "Når vi bytter tak, ser vi på hele oppbyggingen: undertak, lekter, lufting og isolasjon. Et tak skal være tett og godt luftet for å vare.",
      "Endrer du takformen eller løfter taket, kan det kreve byggesøknad. Den ordner vi.",
    ],
    includes: [
      "Takstoler og sperrer",
      "Undertak, lekter og tekking",
      "Utskifting av gammelt tak",
      "Etterisolering av tak",
      "Byggesøknad ved ny takform",
    ],
    trades: ["prosjektledelse", "tomrer"],
    permitRelevant: true,
    cta: "Snakk med oss om tak",
    metaTitle: "Takarbeid og nytt tak i Bergen",
    metaDescription:
      "Nytt tak, utskifting og takkonstruksjoner på nye og eldre hus. Vi ordner byggesøknad når takformen endres.",
    renderKey: "svc-takarbeid",
    renderBrief: {
      a: "Takstoler på plass over andre etasje, før tekking.",
      b: "Nærbilde av mørkt, falset metalltak mot mønet.",
    },
  },
  {
    slug: "dorer-og-vinduer",
    title: "Bytte dører og vinduer",
    shortTitle: "Dører og vinduer",
    lede: "Nye vinduer og dører gir lysere rom og et tettere hus.",
    body: [
      "Gamle vinduer og dører er ofte der huset taper mest varme. Når vi bytter dem, monterer vi nye, tetter rundt karmen og avslutter med beslag og lister, ute og inne.",
      "Vil du ha større vindusflater eller en ny døråpning, må veggen bygges om. Det gjør tømrerne våre, og maleren gjør ferdig rundt.",
      "Endringer i fasaden kan være søknadspliktige. Vi sjekker det, og søker for deg når det trengs.",
    ],
    includes: [
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
      "Nye vinduer og dører gir et tettere hus. Vi monterer, tetter og maler ferdig rundt, og lager nye åpninger i veggen.",
    renderKey: "svc-dorer-og-vinduer",
    renderBrief: {
      a: "Store vinduer mot hagen, nærbilde av karm og lister.",
      b: "Vindusåpninger i bindingsverket før vinduene settes inn.",
    },
  },
  {
    slug: "oppussing-av-bad",
    title: "Oppussing av bad",
    shortTitle: "Bad",
    lede: "Et nytt bad samler mange fag på få kvadratmeter. Hos oss kommer alle fra samme firma.",
    body: [
      "Et bad bygges i lag: riving, nytt underlag, fall mot sluk, membran, fliser, rør, sanitærutstyr og elektro. Rørleggeren, elektrikeren, snekkeren og mureren jobber etter samme plan, og prosjektlederen holder rekkefølgen.",
      "Vil du ha et større bad, kan vi flytte vegger og bygge om rundt. På Kjerrgarden gjorde vi badet større og ga det en ny utforming.",
      "Vi bygger badet etter dine ønsker og etter gjeldende krav til våtrom.",
    ],
    includes: [
      "Riving og nytt underlag",
      "Membran og fall mot sluk",
      "Fliser og murarbeid",
      "Rør, sluk og sanitærutstyr",
      "Elektro, varme i gulv og lys",
      "Større bad og ny planløsning",
    ],
    trades: ["prosjektledelse", "tomrer", "mur-betong", "vvs", "elektro", "maler"],
    permitRelevant: false,
    cta: "Snakk med oss om nytt bad",
    metaTitle: "Oppussing av bad i Bergen",
    metaDescription:
      "Nytt bad med rørlegger, elektriker, snekker og murer fra samme firma. Vi kan også gjøre badet større og endre planløsningen.",
    renderKey: "svc-oppussing-av-bad",
    renderBrief: {
      a: "Badet i snitt med membran, sluk og fliser.",
      b: "Ferdig bad med sanitærutstyr og varmt lys.",
    },
  },
  {
    slug: "vvs",
    title: "VVS",
    shortTitle: "VVS",
    lede: "Rør, vann og avløp, lagt av egne rørleggere som jobber tett med resten av byggeprosjektet.",
    body: [
      "VVS står for varme, ventilasjon og sanitær. Vi legger nye rør i nybygg og tilbygg, skifter gamle rør i eldre hus og monterer sanitærutstyr på bad, kjøkken og vaskerom.",
      "Rørleggerne våre er en del av samme firma som snekkerne og elektrikerne. Rørføringene planlegges derfor sammen med resten av bygget, før veggene lukkes.",
      "Vi foreslår gjerne energieffektive løsninger for oppvarming og varmtvann.",
    ],
    includes: [
      "Nye rør i nybygg og tilbygg",
      "Utskifting av gamle rør",
      "Sanitærutstyr på bad, kjøkken og vaskerom",
      "Avløp og sluk",
      "Oppvarming og varmtvann",
    ],
    trades: ["prosjektledelse", "vvs"],
    permitRelevant: false,
    cta: "Snakk med oss om VVS",
    metaTitle: "Rørlegger og VVS i Bergen",
    metaDescription:
      "Egne rørleggere for nye rør, utskifting, sanitærutstyr og varmtvann, planlagt sammen med resten av byggeprosjektet.",
    renderKey: "svc-vvs",
    renderBrief: {
      a: "Røntgenvisning av huset med rør og avløp som lysende linjer.",
      b: "Rørføringer i vegg og bjelkelag ved badet.",
    },
  },
  {
    slug: "maling",
    title: "Maling",
    shortTitle: "Maling",
    lede: "Vi maler ute og inne, på nye og gamle hus.",
    body: [
      "Utvendig maling starter med forarbeidet: vask, skraping og reparasjon av skadet kledning. Deretter grunner og maler vi.",
      "Inne sparkler og maler vi vegger, tak og listverk. Når maleren er en del av samme firma, kan malingen planlegges inn fra start i et større prosjekt.",
      "Trenger kledningen reparasjon før maling, tar tømrerne våre den delen.",
    ],
    includes: [
      "Vask, skraping og forarbeid",
      "Reparasjon av kledning før maling",
      "Grunning og maling av fasade",
      "Sparkling og maling inne",
      "Vinduer, dører og listverk",
    ],
    trades: ["prosjektledelse", "maler", "tomrer"],
    permitRelevant: false,
    cta: "Snakk med oss om maling",
    metaTitle: "Maling ute og inne i Bergen",
    metaDescription:
      "Vi maler fasader, vegger og listverk på nye og gamle hus, med grundig forarbeid og reparasjon av kledning.",
    renderKey: "svc-maling",
    renderBrief: {
      a: "Stående trekledning, ubehandlet.",
      b: "Den samme fasaden ferdig malt.",
    },
  },
];

export const serviceSlugs: ServiceSlug[] = services.map((s) => s.slug);

export function getService(slug: string): Service | undefined {
  return services.find((s) => s.slug === slug);
}

/** Options for the contact form's project type select. */
export const projectTypeOptions: { value: string; label: string }[] = [
  ...services.map((s) => ({ value: s.slug, label: s.title })),
  { value: "annet", label: "Annet" },
];
