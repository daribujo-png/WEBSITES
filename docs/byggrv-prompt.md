# Build prompt: Bygg og Renovering Vest – luxury 3D website

Paste everything below this line into Claude Code, in an empty project folder.

---

## Role and goal

You are a senior creative developer and copywriter. Build a complete, production-ready website for **Bygg og Renovering Vest AS** (byggrv.no), a builder in Bergen. It must feel like an award-winning site: restrained and luxurious like modusprojects.nl, but Norwegian in material and mood, with an interactive 3D house that shows exactly how the company builds a home.

Work in this order and do not skip a step: research → plan → design system → 3D → sections → copy → verification. Show me the plan and the three template/style options before you build.

## Skills to use

Load and follow these skills at the right moment:

1. `/animatedwebs:browse luxury Nordic architecture, 3D house, dark` – show 6 templates, recommend one.
2. `animatedwebs-site` – pull the chosen template's prompt and adapt it (keep its motion and quality, replace brand, copy and palette).
3. `animatedwebs-style` – turn the palette and type below into tokens (CSS variables + Tailwind theme + DESIGN.md).
4. `animatedwebs-components` – magnetic CTA, text reveal headings, before/after slider, cursor.
5. `animatedwebs-backgrounds` – only if a loop fits (fjord, mist, rain on glass). Never ship a watermarked preview.
6. `frontend-design` – for every layout decision; nothing should look like a template default.
7. `design:ux-copy` – for every heading, button, form label, error and empty state.
8. `design:design-critique` – critique the finished site at 390px and 1440px, then fix what it finds.
9. `design:accessibility-review` – WCAG 2.1 AA audit, then fix every issue.

If the AnimatedWebs connection is not available, say so in one line and continue with the other skills.

## The client (use only these facts, never invent any)

- **Name:** Bygg og Renovering Vest AS
- **Address:** Breisteinvegen 206, 5111 Breistein
- **Phone:** 94 01 66 10
- **Email:** post@byggrv.no
- **Who they are:** A group of experienced tradespeople from merged companies, delivering everything under one roof: general contracting, carpentry, electrical, plumbing (VVS), painting, masonry and concrete, and blasting.
- **Promise:** Tailored total solutions for private customers and businesses; turnkey projects at agreed time and price; built to the customer's specifications.
- **How they work:** One dedicated project manager per customer who coordinates every trade and keeps the schedule. They handle the building application (byggesøknad) for the customer, including extensions, demolition and basement excavation.
- **Values:** Energy efficiency (ENØK), environmental responsibility, flexible solutions, competitive prices. They hold complaint and liability rights for their work.
- **Services (each gets its own section and its own copy):** Ny bolig · Oppussing og renovering · Påbygg og tilbygg · Ombygging · Rehabilitering og renovering · Takarbeid · Bytte dører og vinduer · Oppussing av bad · VVS · Maling
- **References (from /referanser/):**
  - Rekkehus – full interior rehabilitation: carpentry, painting, plumbing, electrical. Client Svein praised the finish and communication.
  - Innredning, Askøy/Vestheim – fit-out of a six-person residence: windows, exterior cladding and trim, insulation, plasterboard.
  - Renovering, Kjerrgarden – bathroom enlarged and redesigned, kitchen moved into the dining room, old kitchen turned into a bedroom.
- **Building types they apply for:** Påbygg, Frittliggende bygning, Tilbygg, Kjeller/Underbygg, Underbygget garasje.

**Missing facts:** founding year, org.nr, sentralgodkjenning, mesterbrev, team names, guarantee terms, social links. Put a visible `[MANGLER: …]` placeholder for each and list them all in your final summary. Do not invent numbers, reviews, awards or certifications.

## Content and images from byggrv.no

Visit every page and download every image into `/public/images/byggrv/`, keeping the original filenames and noting which page each came from:

- https://byggrv.no/
- https://byggrv.no/referanser/
- https://byggrv.no/tjenester/ and every service subpage
- https://byggrv.no/ny-bolig/
- https://byggrv.no/om-oss/
- https://byggrv.no/kontakt/

Then convert the images to AVIF and WebP with responsive sizes, and use every image somewhere on the new site. The current site repeats one placeholder paragraph ("Har du tomt, men ikke hus?") on every service page. Write new, specific copy for each service instead.

## The 3D house

There are two sources, in priority order:

1. **The client's own house:** `[ATTACH: plans / photos / model of the house]`. If this is provided, model it and make it the hero house.
2. **Reference house:** "House in Bergen" by Kvalbein Korsøen Arkitektur, in Fana, finished in 2019, about 130 m², shaped around two old maple trees.
   - Source: https://www.archdaily.com/942477/house-in-bergen-kvalbein-korsoen-arkitektur
   - It publishes a site plan, two floor plans, four elevations and two sections.
   - Model it in 3D from these drawings, taking the proportions from the plans.

Rules for the reference house:
- Bygg RV did not build this house. Present it as an architect-designed reference ("Arkitekttegnet referanse – slik ville vi bygget den") and credit Kvalbein Korsøen Arkitektur next to it.
- Do not use their photos unless I confirm we have written permission. Until then, show only renders of your own 3D model.

How to build the 3D:
- Use a Three.js scene in React Three Fiber, with a GLB compressed with Draco or Meshopt and KTX2 textures. Keep it under 3 MB.
- Materials: standing wooden cladding, dark metal roof, large windows with warm interior light, and a terrain of Fana birch and rock.
- The camera is controlled by scroll, never by free orbit on mobile. On desktop, allow a gentle drag inside limits.

## "Slik bygger vi" – the scroll-driven build sequence (the centrepiece)

As the user scrolls, the house builds itself layer by layer, following how a house is actually built in Norway. Each step shows a short heading, two sentences of copy, and what Bygg RV's own trades do at that step:

1. **Tomt og byggesøknad** – the plot appears as a site plan; mention that they handle the application.
2. **Grunnarbeid og sprenging** – excavation and blasting.
3. **Fundament** – ringmur or slab on ground, with radon membrane.
4. **Bindingsverk** – the timber frame rises.
5. **Vindsperre og isolasjon** – energy-efficient building envelope (ENØK). Reference the current Norwegian building regulation (TEK) without inventing specific figures.
6. **Tak** – roof structure and roofing.
7. **Vinduer og dører** – openings filled.
8. **Kledning og maling** – exterior finish.
9. **El og VVS** – installations shown as glowing lines in an x-ray view.
10. **Interiør og bad** – interior fit-out.
11. **Nøkkelferdig** – the finished house at blue hour, with lights on.

Extras inside the sequence:
- An exploded view.
- Clickable hotspots on each layer.
- A floor-plan toggle that slices the model to show the plans.
- A day / blue-hour toggle.

## Site structure

1. **Hero:** The finished house at blue hour in the Fana landscape. Use a short, confident headline in bokmål and one primary CTA, "Book en uforpliktende samtale", with phone and email always one tap away.
2. **Intro:** Explain "Alt under ett tak", meaning one project manager and every trade in-house.
3. **Slik bygger vi:** The 3D sequence described above.
4. **Tjenester:** Ten services in a Modus-style repeated pattern: number, title, image set, specific copy, CTA.
5. **Fra tegning til nøkkel:** The process as a numbered timeline: first conversation → befaring → tilbud med fast pris → byggesøknad → bygging med fast prosjektleder → overlevering.
6. **Byggesøknad:** The five building types as small interactive 3D diagrams.
7. **Før og etter:** Sliders using their before/after photos.
8. **Referanser:** The three projects, with the client quotes paraphrased faithfully.
9. **Om oss:** Who they are, their values and the trades they cover.
10. **Kontakt:**
    - A form with fields for name, phone, email, project type (a service dropdown), address/plot and message.
    - Validation and clear errors on every field, and a success state.
    - Wire it to a configurable endpoint that sends to post@byggrv.no.
    - Show the address with a map link.
11. **Footer:** Address, phone, email, org.nr placeholder, social link placeholders, and a privacy link.

## Visual direction: Nordic luxury

Use these colours as design tokens, never as one-off values:

| Token | Colour | Hex |
|---|---|---|
| bg | fjord night | #0E1416 |
| surface | slate | #1A2226 |
| text | snow | #F2EFE9 |
| muted | mist | #9BA5A3 |
| wood | oak | #B08B5E |
| accent | brass | #C9A86A (use sparingly) |
| light section bg | paper | #EDE8DF |

- **Type:** An elegant display serif or high-contrast grotesk for headlines (very large, tight tracking), and a clean grotesk for body text.
- **Layout:** Generous whitespace, thin hairline rules, and large full-bleed images.
- **Motion:** Slow and weighty (Lenis smooth scroll, GSAP ScrollTrigger). No bouncy easing.
- **Mood:** It should feel like an architect's monograph, not a contractor template.

## Copywriting

- All site copy in Norwegian bokmål, addressing the reader as "du" and the company as "vi".
- Tone: calm, confident and concrete. Short sentences, no clichés ("kvalitet i alle ledd" and similar). Every claim must trace back to the client facts above.
- Write a unique meta title and description for every page.
- Add schema.org markup for a LocalBusiness / GeneralContractor with the real address and phone.

## Tech

- Next.js (App Router) + TypeScript, Tailwind v4, React Three Fiber + drei, GSAP + ScrollTrigger, Lenis.
- Static export compatible, with images optimised.
- `lang="nb"`.
- No tracking scripts without consent.

## Quality gates (do not finish until every one passes)

- `npm run build` and `npm run lint` pass with zero errors and zero type errors.
- The browser console is clean on every page.
- Use Playwright to screenshot at 390, 768 and 1440 px and review them yourself:
  - no horizontal scroll at any size
  - nothing overlaps
  - text over images is always readable
- The 3D:
  - holds 60 fps on desktop and stays smooth on a mid-range phone
  - lazy-loads below the fold
  - shows a poster image while loading
  - falls back to static renders if WebGL fails
- `prefers-reduced-motion`: replace the scroll sequence with a stepped gallery of renders.
- Lighthouse mobile scores:
  - Performance ≥ 90
  - Accessibility ≥ 95
  - Best Practices ≥ 95
  - SEO ≥ 95
- LCP under 2.5 s.
- WCAG 2.1 AA: contrast, focus states, keyboard navigation, and alt text in Norwegian on every image.
- Every link and form state has been tested by hand.

## Handover

Finish with:
- how to run and deploy the site
- every `[MANGLER]` placeholder
- where to swap in the client's house model
- what still needs written permission (byggrv.no content, if we are not the client's agency; any Kvalbein Korsøen photos)
