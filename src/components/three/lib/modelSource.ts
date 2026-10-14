/**
 * GLB bytes, fetched once per URL and shared by every canvas. No three.js
 * here, so the page-side overlays (HeroHouse, BuildStage) can start the model
 * download together with the 3D chunk instead of after it has loaded and run.
 *
 * The house comes in two variants (house.meta.json "variants"): `high` for
 * desktop GPUs and `lite` for phones and weak GPUs. A missing lite file falls
 * back to the full model, so the site works before the lite model exists.
 */
export type HouseVariant = "high" | "lite";

export const HOUSE_HIGH_URL = "/models/house.glb";
export const HOUSE_LITE_URL = "/models/house-lite.glb";
export const PERMITS_URL = "/models/permits.glb";

/** Defaults; the canvases pass the URLs from house.meta.json when it lists them. */
export const DEFAULT_HOUSE_URLS: Record<HouseVariant, string> = { high: HOUSE_HIGH_URL, lite: HOUSE_LITE_URL };

const bytes = new Map<string, Promise<ArrayBuffer>>();
const houses = new Map<string, Promise<{ url: string; data: ArrayBuffer }>>();
/** Parsed and released: prefetches skip these (the parsed model is cached by the loader). */
const parsed = new Set<string>();
/** Answered 404 or similar: a lite prefetch goes straight to the full model. */
const missing = new Set<string>();

/** Fetch a model once (later callers share the same request). */
export function fetchModel(url: string): Promise<ArrayBuffer> {
  let p = bytes.get(url);
  if (!p) {
    p = fetch(url, { credentials: "same-origin" }).then((r) => {
      if (!r.ok) {
        missing.add(url);
        throw new Error(`${url}: HTTP ${r.status}`);
      }
      return r.arrayBuffer();
    });
    bytes.set(url, p);
    // A failed request may be retried later (e.g. after going back online).
    p.catch(() => bytes.delete(url));
  }
  return p;
}

/** Drop the compressed bytes once a model is parsed (the geometry holds what it needs). */
export function releaseModel(url: string) {
  bytes.delete(url);
  parsed.add(url);
}

/** Bytes of a house variant, with the URL they came from (lite falls back to high). */
export function fetchHouse(variant: HouseVariant, urls: Record<HouseVariant, string> = DEFAULT_HOUSE_URLS) {
  const key = `${variant}|${urls.high}|${urls.lite}`;
  let p = houses.get(key);
  if (!p) {
    const own = urls[variant];
    p = fetchModel(own)
      .then((data) => ({ url: own, data }))
      .catch((err: unknown) => {
        if (own === urls.high) throw err;
        return fetchModel(urls.high).then((data) => ({ url: urls.high, data }));
      });
    houses.set(key, p);
    // Only de-duplicates requests in flight; the bytes themselves stay in `bytes` until parsed.
    const drop = () => houses.delete(key);
    p.then(drop, drop);
  }
  return p;
}

/** Start downloading a house variant now (fire and forget; nothing happens if it is already loaded). */
export function prefetchHouse(variant: HouseVariant, urls: Record<HouseVariant, string> = DEFAULT_HOUSE_URLS) {
  const url = missing.has(urls[variant]) ? urls.high : urls[variant];
  if (parsed.has(url)) return;
  fetchHouse(variant, urls).catch(() => {
    // the canvas reports load errors when it mounts
  });
}
