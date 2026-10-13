/**
 * PLACEHOLDER written by the SECTIONS agent so the site builds before the
 * THREE agent delivers. THREE overwrites this file (same export names).
 * (No JSX here so the file can stay index.ts as the contract says.)
 */
import { createElement } from "react";
import { buildSequenceCopy, type PermitTypeId } from "@/content";
import { cn } from "@/lib/utils";

export function HeroHouse({ className }: { className?: string }) {
  return createElement("div", { "aria-hidden": "true", className: cn("bg-night", className) });
}

export function BuildSequence() {
  return createElement(
    "section",
    {
      id: buildSequenceCopy.id,
      "data-tone": "night",
      "aria-labelledby": "slik-bygger-vi-title",
      className: "py-section",
    },
    createElement(
      "div",
      { className: "container-page" },
      createElement("h2", { id: "slik-bygger-vi-title", className: "t-display-l" }, buildSequenceCopy.title),
      createElement("p", { className: "t-lead mt-6 max-w-measure text-fg-muted" }, buildSequenceCopy.reducedLede),
      createElement("div", { className: "mt-12 aspect-[16/9] w-full bg-slate" }),
    ),
  );
}

export function PermitDiagram({ type, className }: { type: PermitTypeId; className?: string }) {
  return createElement("div", {
    "aria-hidden": "true",
    "data-permit": type,
    className: cn("aspect-[4/3] w-full bg-paper-deep", className),
  });
}
