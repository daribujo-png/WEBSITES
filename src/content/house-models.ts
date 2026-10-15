/**
 * "Husmodeller vi bygger": ready-drawn house models from suppliers that we
 * build. Launched with Adria from Boligpartner. Add a model by adding an entry
 * here (and its images through scripts/images/): the home section, /husmodeller/
 * and /husmodeller/<slug>/ build from this list.
 *
 * Facts come only from the supplier's own page (cited as the source). No
 * marketing claims, no prices, no invented models. Supplier images are shown
 * as supplied, always with "Bilde: <supplier>" and the visible [MANGLER] for
 * the rights agreement. If the agreement is refused, set
 * supplierImagesEnabled = false: every supplier image is then replaced by our
 * own render from the same camera (twinRenderKey), captioned as such.
 */
import { adriaImages, type AdriaImageKey, type SupplierImageAsset } from "./adria-images";
import * as renderModule from "./renders";
import type { RenderAsset, RenderManifest } from "@/lib/images";
import type { HouseModel, HouseModelImage, RoofType } from "./types";

/** Rights switch for every supplier image on the site (DIRECTION-adria.md §2.10). */
export const supplierImagesEnabled = true;

export const roofLabels: Record<RoofType, string> = {
  saltak: "Saltak",
  flatt: "Flatt tak",
  pulttak: "Pulttak",
};

/** "Viser saltak." etc. for live regions. */
export const roofAnnouncements: Record<RoofType, string> = {
  saltak: "Viser saltak.",
  flatt: "Viser flatt tak.",
  pulttak: "Viser pulttak.",
};

const TWIN: Partial<Record<AdriaImageKey, string>> = {
  "adria-saltak-hage": "adria-twin",
  "adria-flatt-tak-hage": "adria-twin-flatt",
  "adria-pulttak-innkjorsel": "adria-twin-pulttak-innkjorsel",
};

function imageFromManifest(key: AdriaImageKey): HouseModelImage {
  const a = adriaImages[key];
  return {
    key,
    roof: a.roof,
    view: a.view,
    width: a.width,
    height: a.height,
    widths: a.sources.avif.map((s) => s.w),
    alt: a.alt,
    caption: a.caption,
    twinRenderKey: TWIN[key],
  };
}

export const houseModels: HouseModel[] = [
  {
    slug: "adria",
    name: "Adria",
    supplier: { name: "Boligpartner", url: "https://boligpartner.no/ferdighus/moderne/adria" },
    credit: "Husmodell Adria fra Boligpartner",
    missing: "boligpartnerRights",
    summary:
      "Adria er et hus i to etasjer med stående trekledning og innrammede, overbygde balkonger. Leverandøren har tegnet det med tre taktyper, og det passer godt på smale tomter.",
    facts: [
      { label: "Bruksareal", value: "ca. 159 m² BRA-i" },
      { label: "Soverom", value: "4" },
      { label: "Bad", value: "2" },
      { label: "Energimerking", value: "B" },
      { label: "Tomt", value: "Flat tomt. Passer godt på smale tomter." },
      { label: "Taktyper", value: "Flatt tak, pulttak eller saltak" },
      { label: "Kilde", value: "boligpartner.no", href: "https://boligpartner.no/ferdighus/moderne/adria" },
    ],
    roofTypes: ["saltak", "flatt", "pulttak"],
    defaultRoof: "saltak",
    images: (["adria-saltak-hage", "adria-flatt-tak-hage", "adria-pulttak-innkjorsel", "adria-flatt-tak-naer"] as const).map(
      imageFromManifest,
    ),
    has3d: true,
    metaTitle: "Adria, husmodell fra Boligpartner",
    metaDescription:
      "Husmodellen Adria fra Boligpartner: ca. 159 m² BRA-i, 4 soverom og 2 bad, tegnet med flatt tak, pulttak eller saltak. Snakk med oss om å bygge den.",
  },
];

export function getHouseModel(slug: string): HouseModel | undefined {
  return houseModels.find((m) => m.slug === slug);
}

/** Three short facts for index rows ("ca. 159 m² BRA-i", "4 soverom", "2 bad"). */
export function shortFacts(model: HouseModel): string[] {
  const v = (label: string) => model.facts.find((f) => f.label === label)?.value;
  return [
    v("Bruksareal"),
    v("Soverom") ? `${v("Soverom")} soverom` : undefined,
    v("Bad") ? `${v("Bad")} bad` : undefined,
  ].filter((x): x is string => Boolean(x));
}

/** The image a roof type leads with: the garden view for saltak/flatt, the entrance view for pulttak. */
export function imageForRoof(model: HouseModel, roof: RoofType): HouseModelImage | undefined {
  const order: HouseModelImage["view"][] = ["hage", "innkjorsel", "hage-naer"];
  return [...model.images]
    .filter((i) => i.roof === roof)
    .sort((a, b) => order.indexOf(a.view) - order.indexOf(b.view))[0];
}

/* Resolving an image to something <Picture> can draw ----------------------------------------- */

const mod = renderModule as unknown as Record<string, unknown>;
const renderManifest = (mod.renders ?? mod.renderManifest ?? mod.default ?? {}) as RenderManifest;

export interface ResolvedModelImage {
  asset: RenderAsset;
  /** Phone square crop (supplier images 1 and 2 only). */
  square: RenderAsset | null;
  /** 2560/3840 version for the full view on the detail page. */
  large: RenderAsset | null;
  alt: string;
  caption: string;
  /** "Bilde: Boligpartner" or "Illustrasjon fra vår 3D-modell". */
  source: "supplier" | "render";
}

const RENDER_CAPTION = "Illustrasjon fra vår 3D-modell.";

/**
 * The asset to show for a model image: the supplier image, or (with the rights
 * switch off) our render from the same camera. Null when neither exists, so the
 * slot can hide or show a [MANGLER] instead.
 */
export function resolveModelImage(image: HouseModelImage): ResolvedModelImage | null {
  if (supplierImagesEnabled) {
    const a = (adriaImages as Record<string, SupplierImageAsset | undefined>)[image.key];
    if (!a) return null;
    return { asset: a, square: a.square, large: a.large, alt: a.alt, caption: a.caption, source: "supplier" };
  }
  const r = image.twinRenderKey ? renderManifest[image.twinRenderKey] : undefined;
  if (!r || !r.sources || (r.sources.avif.length === 0 && r.sources.webp.length === 0)) return null;
  const view = image.view === "innkjorsel" ? "inngangssiden" : "hagesiden";
  return {
    asset: r,
    square: null,
    large: null,
    alt: r.alt,
    caption: `Adria med ${roofLabels[image.roof].toLowerCase()}, ${view}. ${RENDER_CAPTION}`,
    source: "render",
  };
}

/* Copy ------------------------------------------------------------------------------------------- */

export const houseModelsCopy = {
  title: "Husmodeller vi bygger",
  lede: "Vil du ha et hus som allerede er tegnet? Her er husmodeller vi bygger, med fakta fra leverandøren. Har du egne tegninger, bygger vi etter dem.",
  roofLegend: "Taktype",
  factsLabel: "Fakta om",
  seeModel: (name: string) => `Se ${name}`,
  talkAbout: (name: string) => `Snakk med oss om ${name}`,
  /** Message prefilled in the contact form from "Snakk med oss om …". */
  prefillMessage: (name: string) => `Jeg vil gjerne høre mer om å bygge husmodellen ${name}.`,
  supplierLabel: "Leverandør",
  /** /husmodeller/ */
  indexLede:
    "Ferdig tegnede husmodeller vi bygger i Bergen og omegn, med fakta og bilder fra leverandøren. Vi bygger også etter dine egne tegninger.",
  ownDrawingsTitle: "Har du egne tegninger? Vi bygger etter dem.",
  ownDrawingsBody: "Har du tomt og tegninger, eller bare en idé, tar vi jobben derfra. Byggesøknaden ordner vi.",
  ownDrawingsLink: "Les om nybygg",
  /** /husmodeller/<slug>/ */
  imagesTitle: "Bilder",
  openImage: "Vis større",
  closeImage: "Lukk",
  previousImage: "Forrige bilde",
  nextImage: "Neste bilde",
  build3dTitle: "Se huset bygges, steg for steg",
  build3dBody: "På forsiden bygger vi huset i 3D, fra grunnmur til nøkkelferdig, og du kan bytte tak.",
  build3dLink: "Se huset bygges",
  photoSourceNote: "Bilde: Boligpartner",
  renderNote: "3D-modell",
} as const;
