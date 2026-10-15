/**
 * schema.org JSON-LD builders. Render with <JsonLd data={…} /> from
 * "@/components/ui". Only real client facts go in here (no invented
 * opening hours, ratings, founding year or coordinates).
 */
import { company } from "@/content/site";
import { services } from "@/content/services";
import type { Service } from "@/content/types";
import { absoluteUrl, OG_IMAGE, servicePath } from "./seo";

export const ORG_ID = absoluteUrl("/#firma");

export type JsonLdObject = Record<string, unknown>;

export function generalContractorJsonLd(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "GeneralContractor",
    "@id": ORG_ID,
    name: company.legalName,
    alternateName: company.name,
    url: absoluteUrl("/"),
    image: absoluteUrl(OG_IMAGE.url),
    logo: absoluteUrl("/icon.svg"),
    description:
      "Byggefirma i Bergen og omegn. Vi bygger nye hus, tilbygg, påbygg og tak, med alle fagene i eget firma, én prosjektleder per kunde og nøkkelferdig levering til avtalt tid og pris.",
    telephone: company.phoneE164,
    email: company.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: company.address.street,
      postalCode: company.address.postalCode,
      addressLocality: company.address.city,
      addressRegion: company.address.region,
      addressCountry: company.address.country,
    },
    areaServed: [
      { "@type": "City", name: "Bergen" },
      { "@type": "AdministrativeArea", name: company.areaServed },
    ],
    knowsAbout: [
      "Nybygg",
      "Tilbygg",
      "Påbygg",
      "Takarbeid",
      "Totalentreprise",
      "Tømrerarbeid",
      "Elektro",
      "VVS",
      "Maling",
      "Mur og betong",
      "Sprenging",
      "Byggesøknad",
      "ENØK",
    ],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Tjenester",
      itemListElement: services.map((s) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: s.title,
          description: s.lede,
          url: absoluteUrl(servicePath(s.slug)),
        },
      })),
    },
  };
}

export function serviceJsonLd(service: Service): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.title,
    description: service.lede,
    url: absoluteUrl(servicePath(service.slug)),
    serviceType: service.title,
    provider: { "@id": ORG_ID },
    areaServed: { "@type": "AdministrativeArea", name: company.areaServed },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/** A plain WebPage (e.g. a house model page), part of the site and about the company's work. */
export function webPageJsonLd({ name, description, path, image }: { name: string; description: string; path: string; image?: string }): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name,
    description,
    url: absoluteUrl(path),
    inLanguage: "nb-NO",
    isPartOf: { "@type": "WebSite", name: company.legalName, url: absoluteUrl("/") },
    publisher: { "@id": ORG_ID },
    ...(image ? { primaryImageOfPage: { "@type": "ImageObject", url: absoluteUrl(image) } } : {}),
  };
}

/** Serialise for a <script type="application/ld+json"> (escapes "<"). */
export function serializeJsonLd(data: JsonLdObject | JsonLdObject[]): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
