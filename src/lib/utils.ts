/** Small, dependency-free helpers shared by all components. */

type ClassValue = string | number | false | null | undefined | ClassValue[];

/** Join class names, skipping falsy values. `cn("a", cond && "b", ["c"])`. */
export function cn(...values: ClassValue[]): string {
  const out: string[] = [];
  for (const v of values) {
    if (!v && v !== 0) continue;
    if (Array.isArray(v)) {
      const nested = cn(...v);
      if (nested) out.push(nested);
    } else {
      out.push(String(v));
    }
  }
  return out.join(" ");
}

export const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Map v from [inMin, inMax] to [outMin, outMax], clamped. */
export function mapRange(v: number, inMin: number, inMax: number, outMin = 0, outMax = 1) {
  const t = clamp((v - inMin) / (inMax - inMin || 1));
  return lerp(outMin, outMax, t);
}

/** True for http(s) links that leave the site. */
export function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href) && !/^https?:\/\/(www\.)?byggrv\.no/i.test(href);
}

/** True for tel:, mailto:, sms: and in-page hash links. */
export function isProtocolOrHash(href: string): boolean {
  return /^(tel:|mailto:|sms:|#)/i.test(href);
}

/** True for internal route links that should use next/link. */
export function isInternalRoute(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//");
}

export type MissingPart = { type: "text"; value: string } | { type: "missing"; label: string };

/**
 * Split a content string into plain text and "[MANGLER: …]" parts.
 * Used by <TextWithMissing>.
 */
export function splitMissing(text: string): MissingPart[] {
  const parts: MissingPart[] = [];
  const re = /\[MANGLER: ([^\]]+)\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push({ type: "text", value: text.slice(last, m.index) });
    parts.push({ type: "missing", label: m[1] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ type: "text", value: text.slice(last) });
  return parts;
}

/** Strip "[MANGLER: …]" tokens (for meta tags, alt text, JSON-LD). */
export function stripMissing(text: string): string {
  return text
    .replace(/\s*\[MANGLER: [^\]]+\]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
