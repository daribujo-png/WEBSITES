/**
 * References, paraphrased from byggrv.no/referanser/ (the source of truth).
 * We describe scope only and never name people or companies the way the
 * source does not (see contentNotes in site.ts for the oddities in the source).
 * Also: the before/after pairs (real photos) and the project photo grid.
 */
import type { BeforeAfterPair, ProjectPhoto, Reference } from "./types";

export const references: Reference[] = [
  {
    id: "rekkehus",
    title: "Rekkehus",
    category: "Innvendig rehabilitering",
    place: null,
    summary:
      "Kunden ba om pris på snekker, maler, rørlegger og elektriker til en innvendig rehabilitering av et rekkehus. Vi leverte snekker- og malerarbeidet.",
    scope: ["Snekkerarbeid", "Malerarbeid"],
    quote: {
      text: "Svein roste sluttresultatet og den gode kommunikasjonen underveis, også med rørlegger og elektriker. Han anbefaler oss sterkt, og trekker fram at vi tok jobben på kort varsel.",
      attribution: "Svein, kunde",
      note: "Gjengitt etter kundens tilbakemelding.",
    },
    photoKeys: [],
    missingPhotos: "bilder fra rekkehuset",
  },
  {
    id: "askoy-vestheim",
    title: "Leiligheter på Askøy",
    category: "Innredning",
    place: "Vestheim, Askøy",
    summary:
      "Innredning av leilighetene i en seksmannsbolig. Oppdraget omfattet montering av vinduer, utvendig kledning og lister, isolering og gips.",
    scope: ["Vinduer", "Utvendig kledning og lister", "Isolering", "Gips"],
    photoKeys: [],
    missingPhotos: "bilder fra Vestheim",
  },
  {
    id: "kjerrgarden",
    title: "Nytt bad og kjøkken",
    category: "Renovering",
    place: "Kjerrgarden",
    summary:
      "Oppdraget var å pusse opp og utvide badet, flytte kjøkkenet inn i spisestuen og gjøre det gamle kjøkkenet om til soverom.",
    scope: ["Større bad", "Kjøkken flyttet til spisestuen", "Nytt soverom"],
    photoKeys: [],
    missingPhotos: "bilder fra Kjerrgarden",
  },
];

/** Before/after sliders on the home page: real photos from our own projects. */
export const beforeAfterPairs: BeforeAfterPair[] = [
  {
    id: "tilbygg",
    title: "Tilbygg med terrasse",
    caption:
      "Bindingsverket til tilbygget reises foran huset. Etterpå har det lys kledning, terrasse på taket og ny belegningsstein foran.",
    beforeLabel: "Før",
    afterLabel: "Etter",
    source: "photo",
    photoKeys: { before: "tilbygg-for", after: "tilbygg-etter" },
    beforeKey: null,
    afterKey: null,
    sliderLabel: "Sammenlign tilbygget før og etter",
  },
  {
    id: "gang",
    title: "Ny gang",
    caption:
      "Nye vegger i bindingsverk og åpne kabelføringer. Etterpå har gangen lyst tregulv, fliser ved inngangen og spotlys i taket.",
    beforeLabel: "Før",
    afterLabel: "Etter",
    source: "photo",
    photoKeys: { before: "gang-for", after: "gang-etter" },
    beforeKey: null,
    afterKey: null,
    sliderLabel: "Sammenlign gangen før og etter",
  },
];

/**
 * Illustration pairs rendered from the 3D model (src/content/renders.ts).
 * Optional, e.g. on service pages without own photos. Always show
 * beforeAfterCopy.renderNote with them.
 */
export const renderBeforeAfterPairs: BeforeAfterPair[] = [
  {
    id: "ba-1",
    title: "Råbygg og ferdig hus",
    caption: "Bindingsverket på grunnmuren, og det samme huset ferdig med tak, vinduer og kledning.",
    beforeLabel: "Råbygg",
    afterLabel: "Ferdig",
    source: "render",
    photoKeys: null,
    beforeKey: "ba-1-for",
    afterKey: "ba-1-etter",
    sliderLabel: "Sammenlign råbygg og ferdig hus",
  },
  {
    id: "ba-2",
    title: "Umalt og malt fasade",
    caption: "Ubehandlet trekledning, og den samme fasaden etter maling.",
    beforeLabel: "Umalt",
    afterLabel: "Malt",
    source: "render",
    photoKeys: null,
    beforeKey: "ba-2-for",
    afterKey: "ba-2-etter",
    sliderLabel: "Sammenlign umalt og malt fasade",
  },
  {
    id: "ba-3",
    title: "Gammelt og nytt bad",
    caption: "Et slitt bad, og det samme rommet etter oppussing.",
    beforeLabel: "Før",
    afterLabel: "Etter",
    source: "render",
    photoKeys: null,
    beforeKey: "ba-3-for",
    afterKey: "ba-3-etter",
    sliderLabel: "Sammenlign gammelt og nytt bad",
  },
];

/** "Fra prosjektene våre": own photos for the references page (best first). */
export const projectPhotos: ProjectPhoto[] = [
  { photoKey: "tilbygg-etter", caption: "Tilbygg med terrasse på taket.", service: "pabygg-og-tilbygg" },
  { photoKey: "gang-etter", caption: "Ny gang etter ombygging.", service: "ombygging" },
  { photoKey: "firemannsbolig", caption: "Firemannsbolig.", service: "rehabilitering-og-renovering" },
  { photoKey: "nytt-tak", caption: "Nytt tak med snøfanger.", service: "takarbeid" },
  {
    photoKey: "minigraver-skifer",
    caption: "Gravearbeid ved inngangen til et hus.",
    service: "rehabilitering-og-renovering",
  },
];
