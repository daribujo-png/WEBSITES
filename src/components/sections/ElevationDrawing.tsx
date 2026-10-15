/**
 * The garden elevation of our Adria model as ink linework that draws itself on
 * (Strek), read at build time from public/renders/adria-fasade-hage.svg (made
 * by the model builder from our own 3D model, never from the supplier's
 * drawings). Server component: the SVG is parsed here and re-emitted through
 * <LineDrawing>, so every stroke group gets pathLength="1" and its place in
 * the drawing order (data-order).
 *
 * When the SVG has not been built yet, the figure falls back to our render of
 * the finished house, so the row never breaks.
 */
import fs from "node:fs";
import path from "node:path";
import { LineDrawing, type Stroke } from "@/components/ui";
import { cn } from "@/lib/utils";
import { MediaFigure } from "./Media";
import { getRenderAsset } from "./RenderImage";

/** ADRIA_ELEVATION_SVG (absolute path) lets QA preview a drawing before the model builder writes it. */
const SVG_FILE = process.env.ADRIA_ELEVATION_SVG || path.join(process.cwd(), "public", "renders", "adria-fasade-hage.svg");
/** Renders of our finished model to fall back on, best first. */
const FALLBACK_RENDERS = ["adria-twin", "step-nokkelferdig"];

interface ParsedDrawing {
  viewBox: string;
  width: number;
  height: number;
  strokes: Stroke[];
}

function attr(tag: string, name: string): string | undefined {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*"([^"]*)"`));
  return m?.[1];
}

/** Turn <line>/<polyline> into path data so every stroke can draw on the same way. */
function toPathData(tagName: string, tag: string): string | undefined {
  if (tagName === "path") return attr(tag, "d");
  if (tagName === "line") {
    const [x1, y1, x2, y2] = ["x1", "y1", "x2", "y2"].map((k) => attr(tag, k) ?? "0");
    return `M${x1} ${y1}L${x2} ${y2}`;
  }
  const pts = attr(tag, "points")?.trim().split(/[\s,]+/);
  if (!pts || pts.length < 4) return undefined;
  let d = "";
  for (let i = 0; i + 1 < pts.length; i += 2) d += `${i === 0 ? "M" : "L"}${pts[i]} ${pts[i + 1]}`;
  return tagName === "polygon" ? `${d}Z` : d;
}

let cache: ParsedDrawing | undefined;

/** Parse the elevation SVG (once it parses, it is cached). Null when it is missing or unreadable. */
export function readElevation(): ParsedDrawing | null {
  if (cache) return cache;
  try {
    if (!fs.existsSync(SVG_FILE)) return null;
    const src = fs.readFileSync(SVG_FILE, "utf8");
    const viewBox = src.match(/<svg\b[^>]*\sviewBox\s*=\s*"([^"]+)"/)?.[1];
    if (!viewBox) return null;
    const [, , w, h] = viewBox.trim().split(/[\s,]+/).map(Number);
    if (!(w > 0 && h > 0)) return null;

    const raw: { d: string; order?: number; dashed: boolean }[] = [];
    for (const m of src.matchAll(/<(path|line|polyline|polygon)\b([^>]*)\/?>/g)) {
      const d = toPathData(m[1], m[2]);
      if (!d) continue;
      const order = Number(attr(m[2], "data-order"));
      const dash = attr(m[2], "stroke-dasharray");
      raw.push({ d, order: Number.isFinite(order) ? order : undefined, dashed: Boolean(dash && dash !== "none") });
    }
    if (raw.length === 0) return null;

    // data-order may be 0..1 or an index; normalise to 0..1 either way.
    const orders = raw.map((r, i) => r.order ?? i);
    const max = Math.max(...orders, 0);
    const min = Math.min(...orders, 0);
    const strokes = raw.map((r, i) => ({
      d: r.d,
      o: max > min ? (orders[i] - min) / (max - min) : 0,
      dashed: r.dashed,
    }));
    strokes.sort((a, b) => a.o - b.o);
    cache = { viewBox, width: w, height: h, strokes };
    return cache;
  } catch {
    return null;
  }
}

interface ElevationDrawingProps {
  label: string;
  caption: string;
  className?: string;
  /** `sizes` for the render fallback. */
  sizes?: string;
}

export function ElevationDrawing({ label, caption, className, sizes }: ElevationDrawingProps) {
  const drawing = readElevation();
  if (!drawing) {
    const key = FALLBACK_RENDERS.find((k) => getRenderAsset(k));
    if (!key) return null;
    return (
      <MediaFigure
        media={{ kind: "render", key }}
        sizes={sizes}
        aspect="16 / 10"
        pust
        className={className}
      />
    );
  }
  return (
    <figure className={cn("text-fg", className)}>
      <LineDrawing
        viewBox={drawing.viewBox}
        strokes={drawing.strokes}
        // About one CSS pixel at the width it is shown (7 of 12 columns, ~760 px).
        strokeWidth={drawing.width / 760}
        label={label}
        span={1500}
        strokeDuration={900}
        style={{ aspectRatio: `${drawing.width} / ${drawing.height}` }}
      />
      <figcaption className="t-caption mt-4 text-fg-muted">{caption}</figcaption>
    </figure>
  );
}
