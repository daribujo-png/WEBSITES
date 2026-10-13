/** Building types we apply for (byggesøknad). Order = display order. */
import type { PermitType, PermitTypeId } from "./types";

export const permitTypes: PermitType[] = [
  {
    id: "pabygg",
    title: "Påbygg",
    body: "En ny bygningsdel oppå en eksisterende konstruksjon, for eksempel en ekstra etasje. Du får mer plass uten å bruke mer av tomten.",
    diagramAlt: "Diagram: eksisterende hus i grått med en ny etasje på toppen, markert i eik.",
  },
  {
    id: "frittliggende",
    title: "Frittliggende bygning",
    body: "Et eget bygg på tomten, adskilt fra huset. Om det må søkes, avhenger blant annet av størrelse og bruk.",
    diagramAlt: "Diagram: eksisterende hus i grått og et nytt, frittstående bygg markert i eik.",
  },
  {
    id: "tilbygg",
    title: "Tilbygg",
    body: "Utvider grunnflaten, så huset tar mer plass på tomten. Fundament, vegger og tak kobles til huset du har.",
    diagramAlt: "Diagram: eksisterende hus i grått med et tilbygg på siden, markert i eik.",
  },
  {
    id: "kjeller",
    title: "Kjeller/Underbygg",
    body: "Utvider huset nedover, med ny kjeller eller underetasje. Det krever ofte utgraving og sprenging, og det gjør vi selv.",
    diagramAlt: "Diagram: eksisterende hus i grått med ny kjeller under, markert i eik.",
  },
  {
    id: "garasje",
    title: "Underbygget garasje",
    body: "En garasje bygget inn under huset. Utgraving, støp og bæring planlegges sammen med huset over.",
    diagramAlt: "Diagram: eksisterende hus i grått med en garasje bygget inn under, markert i eik.",
  },
];

export function getPermitType(id: PermitTypeId): PermitType {
  const found = permitTypes.find((p) => p.id === id);
  if (!found) throw new Error(`Unknown permit type: ${id}`);
  return found;
}
