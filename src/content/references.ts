/**
 * References from byggrv.no/referanser/ (faithful paraphrase) and the
 * before/after illustration pairs. No client photos are available yet.
 */
import type { BeforeAfterPair, Reference } from "./types";

export const references: Reference[] = [
  {
    id: "rekkehus",
    title: "Rekkehus",
    place: null,
    summary:
      "Full innvendig rehabilitering av et rekkehus. Snekkerarbeid, maling, rør og elektro kom fra oss.",
    scope: ["Snekkerarbeid", "Maling", "Rørlegger", "Elektro"],
    quote: {
      text: "Svein ga ros for det ferdige resultatet og for kommunikasjonen underveis.",
      attribution: "Svein, kunde",
      note: "Gjengitt etter kundens tilbakemelding.",
    },
    missingPhotos: "bilder fra rekkehuset",
  },
  {
    id: "askoy-vestheim",
    title: "Innredning",
    place: "Askøy, Vestheim",
    summary:
      "Innredning av en bolig for seks personer. Vi satte inn vinduer, kledde fasaden, la utvendige lister, isolerte og satte opp gipsplater.",
    scope: ["Vinduer", "Utvendig kledning og lister", "Isolering", "Gipsplater"],
    missingPhotos: "bilder fra Vestheim",
  },
  {
    id: "kjerrgarden",
    title: "Renovering",
    place: "Kjerrgarden",
    summary:
      "Badet ble større og fikk ny utforming. Kjøkkenet flyttet inn i spisestuen, og det gamle kjøkkenet ble gjort om til soverom.",
    scope: ["Bad", "Kjøkken", "Ny planløsning"],
    missingPhotos: "bilder fra Kjerrgarden",
  },
];

export const beforeAfterPairs: BeforeAfterPair[] = [
  {
    id: "ba-1",
    title: "Råbygg og ferdig hus",
    caption: "Bindingsverket på grunnmuren, og det samme huset ferdig med tak, vinduer og kledning.",
    beforeLabel: "Råbygg",
    afterLabel: "Ferdig",
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
    beforeKey: "ba-3-for",
    afterKey: "ba-3-etter",
    sliderLabel: "Sammenlign gammelt og nytt bad",
  },
];
