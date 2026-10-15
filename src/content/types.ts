/**
 * Content types for the Bygg og Renovering Vest site.
 * All copy lives in src/content/*.ts. Components import it; they never
 * duplicate copy. Every claim must trace back to the client facts
 * (the brief and the imported byggrv.no text in content-import/byggrv/).
 */
import type { RenderAsset } from "@/lib/images";
import type { PhotoKey } from "./photos";

export type { PhotoKey };

/* Photos (client images from byggrv.no, see src/content/photos.ts) ------------------------- */

/**
 * own                  The client's own work.
 * stock-suspect        Looks like stock (needs a licence check). Not used.
 * third-party-suspect  Another company's photo, render or diagram. Not used.
 * illustration         Vector clipart or decoration. Not used (design reasons).
 * logo                 Logo files.
 */
export type PhotoOrigin = "own" | "stock-suspect" | "third-party-suspect" | "illustration" | "logo";

/** A published client photo. Same shape as a render, so <Picture asset={…} /> works. */
export interface PhotoAsset extends RenderAsset {
  /** Short Norwegian caption (figcaption). */
  caption: string;
  origin: PhotoOrigin;
  /** Original file, e.g. "/images/byggrv/for.png". */
  file: string;
  /** byggrv.no page the image appeared on, or the media library. */
  sourcePage: string;
  /** Original URL on byggrv.no. */
  sourceUrl: string;
  /** Editorial note (e.g. "confirm with the client"). Not for display. */
  note?: string;
}

export interface ExcludedImage {
  file: string;
  origin: PhotoOrigin;
  /** Why it is not on the site (Norwegian). */
  reason: string;
  sourcePage: string;
}

/** Ids of the in-house trades. */
export type TradeId =
  | "prosjektledelse"
  | "tomrer"
  | "elektro"
  | "vvs"
  | "maler"
  | "mur-betong"
  | "sprenging";

export interface Trade {
  id: TradeId;
  /** Short name used in lists and step panels, e.g. "Tømrer". */
  name: string;
  /** One sentence on what this trade does for the customer. */
  body: string;
}

export type ServiceSlug =
  | "ny-bolig"
  | "oppussing-og-renovering"
  | "pabygg-og-tilbygg"
  | "ombygging"
  | "rehabilitering-og-renovering"
  | "takarbeid"
  | "dorer-og-vinduer"
  | "oppussing-av-bad"
  | "vvs"
  | "maling";

export interface Service {
  slug: ServiceSlug;
  /** Display title, e.g. "Bytte dører og vinduer". */
  title: string;
  /** Short name for menus, selects and chips. */
  shortTitle: string;
  /** One or two sentences under the title (cards + page hero). */
  lede: string;
  /** Specific paragraphs for this service (service page + expanded card). */
  body: string[];
  /** Concrete tasks our own trades do on this kind of job. */
  includes: string[];
  /** Trades that take part. */
  trades: TradeId[];
  /** True when the job often needs a byggesøknad that we handle. */
  permitRelevant: boolean;
  /** Label for the service CTA button. */
  cta: string;
  metaTitle: string;
  metaDescription: string;
  /**
   * Base key in src/content/renders.ts. The manifest holds `${renderKey}-a`
   * and `${renderKey}-b` (two views per service).
   */
  renderKey: string;
  /** What each render should show (Norwegian; usable as alt-text basis). */
  renderBrief: { a: string; b: string };
  /**
   * Own photos from byggrv.no for this service (src/content/photos.ts), best
   * first. Prefer these over the renders; empty when no own photo exists yet.
   */
  photoKeys: PhotoKey[];
  /** Optional glossary shown on the service page (e.g. oppussing vs. renovering). */
  terms?: { term: string; definition: string }[];
  /** Old byggrv.no paths whose content now lives on this page (for redirects). */
  legacyPaths: string[];
}

/** Ids of the model layers (group names in house.glb are `layer_${id}`). */
export type BuildStepId =
  | "tomt"
  | "grunnarbeid"
  | "fundament"
  | "bindingsverk"
  | "isolasjon"
  | "tak"
  | "vinduer"
  | "kledning"
  | "installasjoner"
  | "interior"
  | "nokkelferdig";

export interface Hotspot {
  /** Unique within the step. house.meta.json hotspots[stepId][].id matches it. */
  id: string;
  /** Button label (accessible name), short. */
  label: string;
  /** Popover text, one or two short sentences. */
  text: string;
  /** Model group the hotspot sits on, e.g. "layer_fundament". */
  layer: `layer_${BuildStepId}` | "env_terrain" | "env_maple_a" | "env_maple_b";
}

export interface BuildStep {
  id: BuildStepId;
  /** Full step heading, e.g. "Vindsperre og isolasjon". */
  title: string;
  /** Short name for the progress rail, e.g. "Isolasjon". */
  railLabel: string;
  /** Exactly two sentences. */
  body: string;
  /** In-house trades that act in this step. */
  trades: TradeId[];
  hotspots: Hotspot[];
  /** Alt text for the static render public/renders/step-<id>. */
  renderAlt: string;
}

export type ProcessStepId =
  | "forste-samtale"
  | "befaring"
  | "tilbud"
  | "byggesoknad"
  | "bygging"
  | "overlevering";

export interface ProcessStep {
  id: ProcessStepId;
  title: string;
  body: string;
}

export type PermitTypeId = "pabygg" | "frittliggende" | "tilbygg" | "kjeller" | "garasje";

export interface PermitType {
  id: PermitTypeId;
  title: string;
  body: string;
  /** Accessible description of the 3D diagram / render. */
  diagramAlt: string;
}

export interface ReferenceQuote {
  /** Faithful paraphrase of the customer's feedback (not a verbatim quote). */
  text: string;
  attribution: string;
  /** Visible note that this is a paraphrase. */
  note: string;
}

export interface Reference {
  id: string;
  title: string;
  /** Kind of job, as byggrv.no/referanser/ labels it (e.g. "Renovering"). */
  category: string;
  /** Place name, or null when the source gives none. */
  place: string | null;
  summary: string;
  scope: string[];
  quote?: ReferenceQuote;
  /** Own photos of this project (src/content/photos.ts). Empty until the client sends some. */
  photoKeys: PhotoKey[];
  /** [MANGLER] label for the missing project photos. */
  missingPhotos: string;
}

export interface BeforeAfterPair {
  id: string;
  title: string;
  /** Short explanation shown under the slider. */
  caption: string;
  beforeLabel: string;
  afterLabel: string;
  /**
   * "photo": real photos from our own projects; render `photoKeys` from
   * src/content/photos.ts. "render": illustration from the 3D model; render
   * `beforeKey`/`afterKey` from src/content/renders.ts and show the
   * illustration note.
   */
  source: "photo" | "render";
  /** Own photos (source "photo"), otherwise null. */
  photoKeys: { before: PhotoKey; after: PhotoKey } | null;
  /**
   * Render keys in src/content/renders.ts, e.g. "ba-1-for" / "ba-1-etter".
   * Set for source "render"; null for photo pairs.
   */
  beforeKey: string | null;
  afterKey: string | null;
  /** Accessible name for the slider. */
  sliderLabel: string;
}

/** A captioned own photo, e.g. in the "Fra prosjektene våre" grid. */
export interface ProjectPhoto {
  photoKey: PhotoKey;
  /** Short caption; never claims more than the photo shows. */
  caption: string;
  /** Service the photo belongs to, for linking. */
  service?: ServiceSlug;
}

export interface Value {
  id: string;
  title: string;
  body: string;
}

export interface NavItem {
  label: string;
  href: string;
}

export interface PageMeta {
  /** Used with the root title template "%s | Bygg og Renovering Vest". */
  title: string;
  /** When true the title is used as-is (no template). */
  absoluteTitle?: boolean;
  description: string;
  /** Canonical path with trailing slash, e.g. "/om-oss/". */
  path: string;
}

export interface MissingFact {
  key: string;
  /** Text inside the visible placeholder: [MANGLER: <label>] */
  label: string;
  /** Where on the site the placeholder appears. */
  where: string[];
}

/* House models we build (src/content/house-models.ts) ------------------------------------------ */

/** The supplier's three roof forms. Matches the model's node suffixes (__saltak, __flatt, __pulttak). */
export type RoofType = "saltak" | "flatt" | "pulttak";

export interface HouseModelImage {
  /** Key in the generated image manifest, e.g. "adria-saltak-hage" → public/images/adria/<key>-<w>.{avif,webp}. */
  key: string;
  roof: RoofType;
  view: "hage" | "innkjorsel" | "hage-naer";
  /** Size of the largest regular derivative. */
  width: number;
  height: number;
  /** Regular widths (2560/3840 only exist for the detail page's full view). */
  widths: number[];
  alt: string;
  caption: string;
  /**
   * Our own render from the same camera (src/content/renders.ts), used instead
   * of the supplier image when supplierImagesEnabled is false.
   */
  twinRenderKey?: string;
}

export interface HouseModelFact {
  label: string;
  value: string;
  /** External source link (opens in a new tab). */
  href?: string;
}

export interface HouseModel {
  slug: string;
  name: string;
  supplier: { name: string; url: string };
  /** "Husmodell Adria fra Boligpartner" */
  credit: string;
  /** Key into missingFacts; rendered as a visible [MANGLER: …] next to every image. */
  missing: string;
  summary: string;
  facts: HouseModelFact[];
  roofTypes: RoofType[];
  defaultRoof: RoofType;
  images: HouseModelImage[];
  /** True when the home page has the 3D build of this model (/#slik-bygger-vi). */
  has3d: boolean;
  metaTitle: string;
  metaDescription: string;
}
