/**
 * "Slik bygger vi": the eleven build steps in real Norwegian build order.
 * Each body is exactly two sentences. Hotspot ids are matched by
 * public/models/house.meta.json → hotspots[stepId][].id (MODEL agent).
 */
import type { BuildStep, BuildStepId } from "./types";

export const buildSteps: BuildStep[] = [
  {
    id: "tomt",
    title: "Tomt og byggesøknad",
    railLabel: "Tomt",
    body: "Alt starter med situasjonsplanen: hvor huset skal stå, og hvordan det ligger i terrenget. Byggesøknaden skriver og sender vi til kommunen for deg.",
    trades: ["prosjektledelse"],
    hotspots: [
      {
        id: "situasjonsplan",
        label: "Situasjonsplan",
        text: "Viser hvor huset står på tomten, og avstanden til veg og naboer. Den følger med byggesøknaden.",
        layer: "layer_tomt",
      },
      {
        id: "lonnetraer",
        label: "De to lønnetrærne",
        text: "I referansehuset bestemte to gamle lønnetrær husets størrelse og form, og hvor vinduene skulle sitte.",
        layer: "env_maple_a",
      },
    ],
    renderAlt: "Tomten i Fana med situasjonsplan, oppmerkede hjørner og to store lønnetrær.",
  },
  {
    id: "grunnarbeid",
    title: "Grunnarbeid og sprenging",
    railLabel: "Grunnarbeid",
    body: "Byggegropen graves ut, og fjell som står i veien sprenges bort. Sprenging er et av fagene vi har i eget firma.",
    trades: ["sprenging", "prosjektledelse"],
    hotspots: [
      {
        id: "byggegrop",
        label: "Byggegrop",
        text: "Gropen graves ut der grunnmuren skal stå, med plass til drenering rundt.",
        layer: "layer_grunnarbeid",
      },
      {
        id: "sprengstein",
        label: "Sprengt fjell",
        text: "Fjellet sprenges der huset skal stå. Skal huset ha kjeller, sprenges det for den nå.",
        layer: "layer_grunnarbeid",
      },
    ],
    renderAlt: "Utgravd byggegrop med sprengt stein mellom fjell og bjørketrær.",
  },
  {
    id: "fundament",
    title: "Fundament",
    railLabel: "Fundament",
    body: "Vi støper ringmur eller plate på mark, etter hva tomten og huset krever. Under gulvet legges radonsperre, slik byggteknisk forskrift krever.",
    trades: ["mur-betong"],
    hotspots: [
      {
        id: "ringmur",
        label: "Ringmur",
        text: "En støpt mur langs husets ytterkant som bærer veggene og skjermer mot frost.",
        layer: "layer_fundament",
      },
      {
        id: "radonsperre",
        label: "Radonsperre",
        text: "En tett membran under gulvet som hindrer radon fra grunnen i å trenge inn i huset.",
        layer: "layer_fundament",
      },
    ],
    renderAlt: "Støpt ringmur med radonsperre over grunnen.",
  },
  {
    id: "bindingsverk",
    title: "Bindingsverk",
    railLabel: "Bindingsverk",
    body: "Tømrerne reiser veggene i bindingsverk av tre, med bjelkelag mellom etasjene. Nå ser du for første gang hvor store rommene blir.",
    trades: ["tomrer"],
    hotspots: [
      {
        id: "stendere",
        label: "Stendere",
        text: "Loddrette trestendere bærer veggen og gir plass til isolasjon mellom seg.",
        layer: "layer_bindingsverk",
      },
      {
        id: "bjelkelag",
        label: "Bjelkelag",
        text: "Bjelkene mellom etasjene bærer gulvet i andre etasje.",
        layer: "layer_bindingsverk",
      },
    ],
    renderAlt: "Bindingsverk av tre reist i to etasjer på grunnmuren.",
  },
  {
    id: "isolasjon",
    title: "Vindsperre og isolasjon",
    railLabel: "Isolasjon",
    body: "Veggene isoleres og kles med vindsperre, i referansehuset med trefiberisolasjon. Et tett klimaskall etter gjeldende byggteknisk forskrift (TEK) holder på varmen og gir lavere energibruk.",
    trades: ["tomrer"],
    hotspots: [
      {
        id: "trefiber",
        label: "Trefiberisolasjon",
        text: "Isolasjon laget av trefiber. Referansehuset er isolert med det.",
        layer: "layer_isolasjon",
      },
      {
        id: "vindsperre",
        label: "Vindsperre",
        text: "Et tett sjikt på utsiden av isolasjonen. Det stopper trekk og slipper fukt ut.",
        layer: "layer_isolasjon",
      },
    ],
    renderAlt: "Veggene isolert med trefiberplater og dekket med vindsperre.",
  },
  {
    id: "tak",
    title: "Tak",
    railLabel: "Tak",
    body: "Takstolene løftes på plass, og taket tekkes med mørke, falsede metallplater. Med taket på er bygget skjermet mot vestlandsværet, og arbeidet inne kan starte.",
    trades: ["tomrer"],
    hotspots: [
      {
        id: "takstoler",
        label: "Takstoler",
        text: "Trekonstruksjonene som bærer taket. Den bratte vinkelen leder regn og snø raskt av.",
        layer: "layer_tak",
      },
      {
        id: "falsetak",
        label: "Falset metalltak",
        text: "Lange metallplater med stående falser gir et tett tak med rene linjer.",
        layer: "layer_tak",
      },
    ],
    renderAlt: "Takstoler og mørkt, falset metalltak på plass.",
  },
  {
    id: "vinduer",
    title: "Vinduer og dører",
    railLabel: "Vinduer",
    body: "Vinduer og dører settes inn og tettes mot vindsperren. I referansehuset er åpningene plassert etter de to lønnetrærne.",
    trades: ["tomrer"],
    hotspots: [
      {
        id: "store-vinduer",
        label: "Store vindusflater",
        text: "Store glassflater mot hagen gir dagslys langt inn i stue og kjøkken.",
        layer: "layer_vinduer",
      },
      {
        id: "tetting-karm",
        label: "Tetting rundt karmen",
        text: "Overgangen mellom vindu og vegg tettes nøye, så verken varme eller vann slipper gjennom.",
        layer: "layer_vinduer",
      },
    ],
    renderAlt: "Vinduer og dører satt inn i veggene.",
  },
  {
    id: "kledning",
    title: "Kledning og maling",
    railLabel: "Kledning",
    body: "Huset kles med stående trekledning på lekter, slik at det luftes bak. Deretter behandler maleren fasaden i fargen du har valgt.",
    trades: ["tomrer", "maler"],
    hotspots: [
      {
        id: "staende-kledning",
        label: "Stående kledning",
        text: "Loddrette bord lar regnvannet renne raskt av fasaden.",
        layer: "layer_kledning",
      },
      {
        id: "luftespalte",
        label: "Lufting bak kledningen",
        text: "Lektene gir en luftespalte som tørker ut fukt bak kledningen.",
        layer: "layer_kledning",
      },
      {
        id: "overflate",
        label: "Maling og beis",
        text: "Maleren grunner og behandler kledningen, ute og rundt vinduene.",
        layer: "layer_kledning",
      },
    ],
    renderAlt: "Huset kledd med stående trekledning.",
  },
  {
    id: "installasjoner",
    title: "El og VVS",
    railLabel: "El og VVS",
    body: "Elektrikere og rørleggere fra eget firma legger kabler, rør og avløp i vegger og bjelkelag. Alt planlegges før veggene lukkes, så hvert punkt havner der du skal bruke det.",
    trades: ["elektro", "vvs"],
    hotspots: [
      {
        id: "el-anlegg",
        label: "El-anlegg",
        text: "Sikringsskap, kurser og punkter for lys, stikkontakter og varme.",
        layer: "layer_installasjoner",
      },
      {
        id: "vann-avlop",
        label: "Vann og avløp",
        text: "Rør til kjøkken, bad og vaskerom, med avløp og sluk.",
        layer: "layer_installasjoner",
      },
    ],
    renderAlt: "Røntgenvisning av huset med el-anlegg og rør som lysende linjer.",
  },
  {
    id: "interior",
    title: "Interiør og bad",
    railLabel: "Interiør",
    body: "Vegger og himlinger kles, gulv legges, og bad, kjøkken og trapp bygges inn. Til slutt sparkler og maler vi alle flatene.",
    trades: ["tomrer", "mur-betong", "vvs", "elektro", "maler"],
    hotspots: [
      {
        id: "bad",
        label: "Bad",
        text: "Membran, fliser, sanitærutstyr og varme i gulvet. Mange fag på få kvadratmeter.",
        layer: "layer_interior",
      },
      {
        id: "kjokken",
        label: "Kjøkken",
        text: "I referansehuset åpner kjøkken og stue seg mot hagen.",
        layer: "layer_interior",
      },
      {
        id: "trapp",
        label: "Trapp",
        text: "Trappen forbinder de to etasjene.",
        layer: "layer_interior",
      },
    ],
    renderAlt: "Snitt gjennom huset med gulv, kjøkken, bad og trapp.",
  },
  {
    id: "nokkelferdig",
    title: "Nøkkelferdig",
    railLabel: "Nøkkelferdig",
    body: "Vi går gjennom huset sammen med deg og overleverer det nøkkelferdig, til avtalt tid og pris. Vi har reklamasjons- og ansvarsrett for arbeidet vi har gjort.",
    trades: ["prosjektledelse"],
    hotspots: [
      {
        id: "overlevering",
        label: "Overlevering",
        text: "Vi går gjennom huset sammen med deg før du får nøklene.",
        layer: "layer_nokkelferdig",
      },
      {
        id: "terrasse",
        label: "Terrasse",
        text: "Stue og kjøkken åpner seg mot hagen og terrassen.",
        layer: "layer_nokkelferdig",
      },
      {
        id: "bla-time",
        label: "Blå time",
        text: "Det ferdige huset med lys i vinduene. Modellen er vår tolkning av referansehuset.",
        layer: "layer_nokkelferdig",
      },
    ],
    renderAlt: "Det ferdige huset i blå time med lys i vinduene og terrasse mot hagen.",
  },
];

export const buildStepIds: BuildStepId[] = buildSteps.map((s) => s.id);

export function getBuildStep(id: string): BuildStep | undefined {
  return buildSteps.find((s) => s.id === id);
}

/** UI copy for the "Slik bygger vi" section (THREE agent's BuildSequence). */
export const buildSequenceCopy = {
  id: "slik-bygger-vi",
  title: "Slik bygger vi",
  lede: "Bla nedover og se huset reise seg lag for lag, i samme rekkefølge som vi bygger i virkeligheten.",
  reducedLede: "Her er byggingen steg for steg, i samme rekkefølge som vi bygger i virkeligheten.",
  tradesLabel: "Våre fag i dette steget",
  skipLink: "Hopp over byggesekvensen",
  loading: "Laster 3D-modellen",
  webglFallback:
    "3D-visningen kunne ikke vises i nettleseren din. Her er byggingen som bilder i stedet.",
  lowPowerFallback: "Her viser vi byggingen som bilder, slik at siden går raskt på enheten din.",
  rail: {
    label: "Byggesteg",
    jumpTo: (title: string) => `Gå til steget ${title}`,
    previous: "Forrige steg",
    next: "Neste steg",
    keysHint: "Bruk piltastene for å bytte steg.",
  },
  controls: {
    groupLabel: "Visning",
    exploded: "Sprengskisse",
    explodedHint: "Trekk lagene fra hverandre",
    floorPlan: "Plantegning",
    floorPlanHint: "Skjær gjennom huset og se planen",
    floorLabel: "Etasje",
    light: "Lys",
    day: "Dag",
    blueHour: "Blå time",
  },
  hotspots: {
    groupLabel: "Punkter i modellen",
    open: (label: string) => `Vis forklaring: ${label}`,
    close: "Lukk forklaringen",
  },
  xrayNote: "Røntgenvisning: el og VVS lyser, resten av huset er dempet.",
} as const;
