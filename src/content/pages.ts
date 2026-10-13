/**
 * Per-page meta. Titles go through the root template
 * "%s | Bygg og Renovering Vest" unless absoluteTitle is set.
 * Service pages take metaTitle/metaDescription from services.ts.
 */
import type { PageMeta } from "./types";

export const pages = {
  home: {
    title: "Bygg og Renovering Vest | Byggefirma i Bergen og omegn",
    absoluteTitle: true,
    description:
      "Ny bolig, tilbygg, renovering, bad og tak i Bergen og omegn. Alle fag i eget firma, én prosjektleder og nøkkelferdig levering til avtalt tid og pris.",
    path: "/",
  },
  tjenester: {
    title: "Tjenester i Bergen og omegn",
    description:
      "Ny bolig, påbygg og tilbygg, ombygging, rehabilitering, tak, dører og vinduer, bad, VVS og maling. Alle fag og én prosjektleder.",
    path: "/tjenester/",
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
