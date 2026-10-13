/**
 * Content types for the Bygg og Renovering Vest site.
 * All copy lives in src/content/*.ts. Components import it; they never
 * duplicate copy. Every claim must trace back to the client facts.
 */

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
  /** Place name, or null when the source gives none. */
  place: string | null;
  summary: string;
  scope: string[];
  quote?: ReferenceQuote;
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
  /** Render keys in src/content/renders.ts, e.g. "ba-1-for" / "ba-1-etter". */
  beforeKey: string;
  afterKey: string;
  /** Accessible name for the slider. */
  sliderLabel: string;
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
