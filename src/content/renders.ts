/**
 * PLACEHOLDER written by the SECTIONS agent so the site builds before the
 * MODEL agent has rendered anything. MODEL overwrites this file with the
 * generated manifest (same export names).
 */
import type { RenderAsset, RenderManifest } from "@/lib/images";

export const renders: RenderManifest = {};

export function getRender(key: string): RenderAsset | null {
  return renders[key] ?? null;
}
