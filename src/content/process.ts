/**
 * "Fra tegning til nøkkel": the six steps of working with us. Order = <ol> order.
 * Named processSteps (not `process`) so it never shadows Node's global `process`.
 */
import type { ProcessStep } from "./types";

export const processSteps: ProcessStep[] = [
  {
    id: "forste-samtale",
    title: "Første samtale",
    body: "Du forteller hva du ønsker, og vi spør om tomt, hus, tidsplan og budsjett. Samtalen er uforpliktende.",
  },
  {
    id: "befaring",
    title: "Befaring",
    body: "Vi kommer på besøk og ser på tomten eller huset. Da ser vi hva jobben faktisk krever, og hvilke fag som trengs.",
  },
  {
    id: "tilbud",
    title: "Tilbud med fast pris",
    body: "Du får et tilbud med fast pris og avtalt tid. Tilbudet beskriver det du har bedt om, bygget etter dine spesifikasjoner.",
  },
  {
    id: "byggesoknad",
    title: "Byggesøknad",
    body: "Er prosjektet søknadspliktig, skriver og sender vi søknaden til kommunen. Det gjelder også tilbygg, riving og utgraving av kjeller.",
  },
  {
    id: "bygging",
    title: "Bygging med fast prosjektleder",
    body: "Prosjektlederen din samordner alle fagene og holder tidsplanen. Du har én person å forholde deg til hele veien.",
  },
  {
    id: "overlevering",
    title: "Overlevering",
    body: "Vi går gjennom jobben sammen med deg og leverer til avtalt tid og pris. Vi har reklamasjons- og ansvarsrett for arbeidet vårt.",
  },
];
