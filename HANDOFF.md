# Handoff: byggrv.no rebuild (Bygg og Renovering Vest AS)

Repo `daribujo-png/WEBSITES`, branch **`claude/byggrv-redesign-e1scwk`**.
Next.js 16 (App Router, static export) + TypeScript + Tailwind v4 + React Three Fiber/drei + GSAP/ScrollTrigger + Lenis.

## Status

| Step | State |
|---|---|
| Foundation: design tokens, fonts, `DESIGN.md`, all copy in `src/content`, UI primitives, SEO/JSON-LD | Done |
| Content import: real byggrv.no text (`content-import/byggrv/`) and photos (`public/images/byggrv/`, optimised in `opt/`, manifest `src/content/photos.ts`) | Done |
| Pages/sections: home, `/tjenester/` + 10 service pages, `/ny-bolig/`, `/referanser/`, `/om-oss/`, `/kontakt/` (form), `/personvern/`, 404 | Done |
| 3D: `public/models/house.glb` (reference house, 11 build layers), `permits.glb`, renders in `public/renders/`, scripts in `scripts/` | Done |
| R3F components: `HeroHouse`, `BuildSequence` ("Slik bygger vi"), `PermitDiagram` in `src/components/three/` | Done |
| QA (build, lint, Playwright 390/768/1440, links, form states, Lighthouse) | Partly run, needs finishing |
| Design critique + accessibility review (WCAG 2.1 AA) | To do |
| Polish, final quality gates, README handover | To do |

## How to continue in another session

1. Start a Claude Code session on this repo and check out `claude/byggrv-redesign-e1scwk`.
   The environment needs `byggrv.no` and `www.byggrv.no` under Network access → Allowed domains (only for re-importing; everything is already in the repo).
2. Run `npm install`, then `npm run build` and `npm run lint`.
3. Then paste **one** of these prompts.

**A. With workflows (recommended, multi-agent):**

> Run the saved workflow `byggrv-finish` (in `.claude/workflows/byggrv-finish.js`). Read `HANDOFF.md` first. Commit and push to `claude/byggrv-redesign-e1scwk` when it finishes.

**B. Single session, no workflows:**

> Read `HANDOFF.md`, `docs/byggrv-prompt.md`, `DESIGN.md`, `README.md` and `git log -15`. The build is done. Finish the remaining steps:
> 1. QA. `npm run build` and `npm run lint` must show zero errors. Check every route with Playwright at 390, 768 and 1440: console clean, no horizontal scroll, nothing overlapping, all links work, every form state, keyboard use, reduced motion, the no-WebGL fallback, and lazy 3D. Run Lighthouse mobile on `/`, `/tjenester/ny-bolig/` and `/kontakt/`. Fix everything you find.
> 2. Run the `design:design-critique` and `design:accessibility-review` skills and fix what they find.
> 3. Update `README.md` with the handover list from `docs/byggrv-prompt.md`.
> 4. Commit and push to `claude/byggrv-redesign-e1scwk`.
>
> Keep every decision in `HANDOFF.md`.

## Decisions made with the client (do not undo)

- **Style "Lys papir":** mostly light paper (#EDE8DF) and near-white. The hero is now light (paper, daylight 3D stage); the only dark band on the home page is the references band (fjord night #0E1416). Restrained, like an architect's monograph, and **not colourful**. Colours come only from the tokens in `docs/byggrv-prompt.md` and `DESIGN.md`.
- **No decorative numbering** (no 01, 02, 03 or "Steg x av 11"). The client finds it "too much AI". Show order with step names, progress rails and hairlines.
- **No AI-template tells:** no label above every heading, no mono caps spec text, no em-dash-heavy copy.
- **Facts only from the client's site** (`content-import/byggrv/`) and `docs/byggrv-prompt.md`. Never invent numbers, reviews, awards, certifications or guarantee terms. Missing facts get a visible `[MANGLER: …]`.
- **Photos:** use the client's own photos, with the real før/etter pairs in the sliders. Images that look like stock or third-party work (shutterstock or freepik-style names, isometric clip-art, other companies' names) are **not used** and are listed in the README for a licence check.
- **The house in the hero (replaces the old reference house):** Adria, a catalogue house from Boligpartner. Our 3D model is our interpretation; Boligpartner's four images are shown as supplied with a visible credit ("Bilde: Boligpartner") and `[MANGLER: bekreft avtale med Boligpartner om bruk av husmodell og bilder]`; the drawings are never published. Written permission is still needed (see README). No Kvalbein Korsøen credit remains.
- **Hero: "BEGGE DELER".** A short self-building timelapse when the page opens, then the visitor scrolls through the build steps inside the pinned hero. The old separate "Slik bygger vi" section is merged into the hero (`#slik-bygger-vi` sits on its build part).
- **Three roof types,** as Boligpartner draws Adria: saltak, flatt tak and pulttak. The hero finale and the Husmodeller section let the visitor switch between them.
- **Positioning:** nybygg, tilbygg og påbygg, and tak lead the home page. Sprenging, grunnarbeid, VVS, elektro, maling and mur are only named from "Alle fagene i eget firma" down and on `/tjenester/`.
- **Husmodeller:** a data-driven showcase (`src/content/house-models.ts`, `/husmodeller/`, `/husmodeller/<slug>/`), launched with Adria. More models only from the supplier's own pages, never invented.
- **Copy:** Norwegian bokmål, "du" / "vi", calm and concrete.

## Deploy

**Vercel:** import `daribujo-png/WEBSITES`, choose branch `claude/byggrv-redesign-e1scwk`, and keep the framework preset Next.js. `output: 'export'` builds a static site.
Set `NEXT_PUBLIC_FORM_ENDPOINT` (for example a Formspree URL) so the contact form sends to post@byggrv.no. Without it the form falls back to `mailto:`.

## Files

- `docs/byggrv-prompt.md`: the client's full build prompt (the spec).
- `docs/byggrv-full-build-workflow.js`: the original multi-agent build workflow, for reference only.
- `.claude/workflows/byggrv-finish.js`: the saved workflow that finishes the job (QA, then critique, then polish).
- `content-import/byggrv/`: the imported byggrv.no text and image index.
