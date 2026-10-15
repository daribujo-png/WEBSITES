/**
 * Metadata helpers. Every page exports `metadata` built with pageMetadata()
 * so canonical URLs, Open Graph and Twitter tags stay consistent.
 */
import type { Metadata } from "next";
import { company } from "@/content/site";
import { pages, type PageKey } from "@/content/pages";
import { services } from "@/content/services";
import { houseModels } from "@/content/house-models";
import type { Service } from "@/content/types";

export const SITE_URL = company.url;
export const SITE_NAME = company.name;
export const TITLE_TEMPLATE = `%s | ${SITE_NAME}`;
/** Open Graph image rendered by the MODEL agent (1200×630). */
export const OG_IMAGE = {
  url: "/renders/og-image.jpg",
  width: 1200,
  height: 630,
  alt: "Gjengivelse fra vår 3D-modell av husmodellen Adria: toetasjes hus med stående trekledning og saltak, sett fra hagen.",
};
/** Date stamped into the sitemap. Update when content changes materially. */
export const CONTENT_UPDATED = "2026-10-15";

/** Absolute URL for a site path ("/om-oss/" → "https://byggrv.no/om-oss/"). */
export function absoluteUrl(path = "/"): string {
  return new URL(path, SITE_URL).toString();
}

interface BuildMetaInput {
  title: string;
  description: string;
  path: string;
  absoluteTitle?: boolean;
  /** Override the OG image (path under /public). */
  image?: { url: string; width?: number; height?: number; alt?: string };
  noIndex?: boolean;
}

export function buildMetadata({
  title,
  description,
  path,
  absoluteTitle,
  image,
  noIndex,
}: BuildMetaInput): Metadata {
  const ogImage = image ?? OG_IMAGE;
  const fullTitle = absoluteTitle ? title : TITLE_TEMPLATE.replace("%s", title);
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "nb_NO",
      siteName: company.legalName,
      url: path,
      title: fullTitle,
      description,
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [ogImage.url],
    },
    ...(noIndex ? { robots: { index: false, follow: true } } : {}),
  };
}

/** Metadata for a named page from src/content/pages.ts. */
export function pageMetadata(key: PageKey): Metadata {
  const p = pages[key];
  return buildMetadata({
    title: p.title,
    description: p.description,
    path: p.path,
    absoluteTitle: "absoluteTitle" in p ? p.absoluteTitle : false,
    noIndex: key === "notFound",
  });
}

/** Metadata for /tjenester/[slug]/. */
export function serviceMetadata(service: Service): Metadata {
  return buildMetadata({
    title: service.metaTitle,
    description: service.metaDescription,
    path: servicePath(service.slug),
  });
}

export const servicePath = (slug: string) => `/tjenester/${slug}/`;
export const houseModelPath = (slug: string) => `/husmodeller/${slug}/`;

/** Every indexable route, with trailing slashes (used by sitemap.ts). */
export function allRoutes(): string[] {
  return [
    pages.home.path,
    pages.tjenester.path,
    ...services.map((s) => servicePath(s.slug)),
    pages.husmodeller.path,
    ...houseModels.map((m) => houseModelPath(m.slug)),
    pages.referanser.path,
    pages.omOss.path,
    pages.kontakt.path,
    pages.personvern.path,
  ];
}
