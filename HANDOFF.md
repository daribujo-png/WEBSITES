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

- **Style "Lys papir":** mostly light paper (#EDE8DF) and near-white. Only the hero stage and the "Slik bygger vi" 3D sequence are dark (fjord night #0E1416, blue hour). Restrained, like an architect's monograph, and **not colourful**. Colours come only from the tokens in `docs/byggrv-prompt.md` and `DESIGN.md`.
- **No decorative numbering** (no 01, 02, 03 or "Steg x av 11"). The client finds it "too much AI". Show order with step names, progress rails and hairlines.
- **No AI-template tells:** no label above every heading, no mono caps spec text, no em-dash-heavy copy.
- **Facts only from the client's site** (`content-import/byggrv/`) and `docs/byggrv-prompt.md`. Never invent numbers, reviews, awards, certifications or guarantee terms. Missing facts get a visible `[MANGLER: …]`.
- **Photos:** use the client's own photos, with the real før/etter pairs in the sliders. Images that look like stock or third-party work (shutterstock or freepik-style names, isometric clip-art, other companies' names) are **not used** and are listed in the README for a licence check.
- **Reference house:** our interpretation of "House in Bergen" by Kvalbein Korsøen Arkitektur, credited, labelled "Arkitekttegnet referanse – slik ville vi bygget den", and marked as not built by Bygg RV. No Kvalbein Korsøen photos.
- **Copy:** Norwegian bokmål, "du" / "vi", calm and concrete.

## Deploy

**Vercel:** import `daribujo-png/WEBSITES`, choose branch `claude/byggrv-redesign-e1scwk`, and keep the framework preset Next.js. `output: 'export'` builds a static site.
Set `NEXT_PUBLIC_FORM_ENDPOINT` (for example a Formspree URL) so the contact form sends to post@byggrv.no. Without it the form falls back to `mailto:`.

## Files

- `docs/byggrv-prompt.md`: the client's full build prompt (the spec).
- `docs/byggrv-full-build-workflow.js`: the original multi-agent build workflow, for reference only.
- `.claude/workflows/byggrv-finish.js`: the saved workflow that finishes the job (QA, then critique, then polish).
- `content-import/byggrv/`: the imported byggrv.no text and image index.
