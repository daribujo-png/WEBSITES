/**
 * Per-page meta. Titles go through the root template
 * "%s | Bygg og Renovering Vest" unless absoluteTitle is set.
 * Service pages take metaTitle/metaDescription from services.ts.
 */
import type { PageMeta } from "./types";

export const pages = {
  home: {
    title: "Nybygg, tilbygg og tak i Bergen | Bygg og Renovering Vest",
    absoluteTitle: true,
    description:
      "Vi bygger nye hus, tilbygg, påbygg og tak i Bergen og omegn. Byggesøknaden ordner vi, og én prosjektleder følger jobben til avtalt tid og pris.",
    path: "/",
  },
  tjenester: {
    title: "Tjenester i Bergen og omegn",
    description:
      "Nybygg, påbygg og tilbygg og takarbeid, og ombygging, oppussing, rehabilitering, dører og vinduer, bad, VVS og maling. Alle fag og én prosjektleder.",
    path: "/tjenester/",
  },
  husmodeller: {
    title: "Husmodeller vi bygger",
    description:
      "Ferdig tegnede husmodeller vi bygger i Bergen og omegn, med fakta og bilder fra leverandøren. Vi bygger også etter dine egne tegninger.",
    path: "/husmodeller/",
  },
  referanser: {
    title: "Referanser",
    description:
      "Innvendig rehabilitering av et rekkehus, innredning av leiligheter på Askøy og nytt bad og kjøkken på Kjerrgarden. Se bilder fra prosjektene våre.",
    path: "/referanser/",
  },
  omOss: {
    title: "Om oss",
    description:
      "Erfarne fagfolk fra sammenslåtte firmaer: tømrer, elektriker, VVS, maler, mur og betong og sprenging i samme bedrift, og én prosjektleder per kunde.",
    path: "/om-oss/",
  },
  kontakt: {
    title: "Kontakt oss",
    description:
      "Ring 94 01 66 10, send e-post til post@byggrv.no eller fyll ut skjemaet. Vi holder til i Breisteinvegen 206, 5111 Breistein.",
    path: "/kontakt/",
  },
  personvern: {
    title: "Personvern",
    description:
      "Slik behandler Bygg og Renovering Vest AS opplysningene du sender oss. Ingen sporing og ingen analyseverktøy.",
    path: "/personvern/",
  },
  notFound: {
    title: "Siden finnes ikke",
    description: "Siden du leter etter finnes ikke. Gå til forsiden eller se tjenestene våre.",
    path: "/404/",
  },
} satisfies Record<string, PageMeta>;

export type PageKey = keyof typeof pages;
