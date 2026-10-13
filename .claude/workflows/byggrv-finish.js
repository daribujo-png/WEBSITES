export const meta = {
  name: 'byggrv-finish',
  description: 'Finish the Bygg og Renovering Vest Next.js site: QA + fixes, design & a11y critique, polish, all quality gates, README handover',
  whenToUse: 'Continue the byggrv.no rebuild on branch claude/byggrv-redesign-e1scwk after the build phase is done',
  phases: [
    { title: 'QA', detail: 'build/lint, Playwright 390/768/1440, console, links, form, Lighthouse' },
    { title: 'Critique', detail: 'design-critique + accessibility-review skills' },
    { title: 'Polish', detail: 'apply findings, re-run every quality gate' },
  ],
}

const ROOT = '/home/user/WEBSITES'
const SCR = '/tmp/byggrv-work'
const PROMPT_FILE = '/home/user/WEBSITES/docs/byggrv-prompt.md'

const BRIEF = `
YOU ARE PART OF A TEAM building the new Bygg og Renovering Vest AS website in ${ROOT}.
THE CLIENT SPEC is the user's prompt file: ${PROMPT_FILE} — READ IT FULLY FIRST. Follow it, with these binding decisions/overrides made with the user:

DECISIONS / OVERRIDES (these win over the prompt file):
1. STYLE = "Lys papir": mostly light PAPER (#EDE8DF) and near-white surfaces with dark text; ONLY the hero stage and the "Slik bygger vi" 3D build sequence are dark (fjord night #0E1416 / slate #1A2226, blue-hour mood). Restrained Nordic luxury, architect's monograph — NOT colourful (the user disliked the previous colourful look). Colour only from the prompt tokens: bg #0E1416, surface #1A2226, text(snow) #F2EFE9, muted(mist) #9BA5A3, wood(oak) #B08B5E, accent(brass) #C9A86A sparingly, paper #EDE8DF. You may derive tints/shades (e.g. ink for text on paper, hairline colours) but define them as tokens; every text pair must pass WCAG AA (brass/oak/mist on paper will FAIL for body text — use them only for large text/decoration or darker derived tokens).
2. NO DECORATIVE NUMBERING: the user explicitly hates "01, 02, 03" ("too much AI"). Do not show big index numerals on services, process, build steps or nav. Convey order with semantic <ol>, progress rails, step NAMES, connecting hairlines. (Tiny "Steg x av 11"-style counters are also out.) Also avoid other AI-template tells: eyebrow label over every heading, mono caps spec text, em-dash-heavy copy, buzzword triplets.
3. BLOCKED SOURCES (sandbox network policy): byggrv.no does not resolve, archdaily.com is blocked, AnimatedWebs MCP is unavailable. So: no client photos can be downloaded → every place that needs a client photo uses our own 3D RENDERS (clearly real renders of our model, never fake "photos") and/or an explicit visible "[MANGLER: …]" note; before/after sliders use render pairs (e.g. raw vs finished) labelled as illustrations with "[MANGLER: egne før/etter-bilder]". Image pipeline must still be ready: drop files in /public/images/byggrv/, documented in README.
4. REFERENCE HOUSE: model "House in Bergen" (Kvalbein Korsøen Arkitektur, Fana, 2019, ~130 m², the two large old maples on the site set the size and shape of the house and the openings in its walls; traditional in form, material and technique; timber frame with wood-fibre insulation; a curved dark entry leads into kitchen/living which open to the garden). Drawings could NOT be fetched, so model a faithful INTERPRETATION: compact two-storey gabled timber house (~8.5 × 9 m footprint each floor ≈ 65 m², steep gable roof ~40°), standing wooden cladding (oak/natural tone, can be stained darker), dark standing-seam metal roof, large windows with warm interior light, the volume stepping/bending between two big maples, Fana birch + rock terrain. Present it as "Arkitekttegnet referanse – slik ville vi bygget den" with visible credit "Arkitektur: Kvalbein Korsøen Arkitektur" and an honest note that the model is our interpretation, not built by Bygg RV. No Kvalbein Korsøen photos.
5. FACTS: use ONLY the client facts in the prompt file (and these: Bergen og omegn; private and public clients). Never invent numbers, years, reviews, awards, certifications, team names, guarantee terms. Missing facts get visible [MANGLER: …] placeholders (founding year, org.nr, sentralgodkjenning, mesterbrev, team names, guarantee terms, social links, client photos, before/after photos, privacy policy text owner details, form endpoint).
6. TECH (installed already, Next 16.4 App Router + TS + Tailwind v4 via @tailwindcss/turbopack, output:'export', trailingSlash, images.unoptimized; three@0.186.1, @react-three/fiber@9.8.1, @react-three/drei@10.7.9, gsap@3.15 (+ScrollTrigger), lenis@1.3.26; dev: @gltf-transform/core|extensions|functions, meshoptimizer, sharp, @types/three). IMPORTANT: ${ROOT}/AGENTS.md says Next 16 has breaking changes — read the relevant guides in node_modules/next/dist/docs/ before writing Next-specific code (metadata, fonts, dynamic, generateStaticParams, static export). Fonts must be self-hosted via npm @fontsource / @fontsource-variable packages (no runtime Google Fonts). No CDN scripts, no tracking. lang="nb". Static-export compatible (no server actions, no route handlers that need a server; metadata routes sitemap/robots must be static-exportable).
7. PAGES: / (all sections), /tjenester/ (index) and /tjenester/[slug]/ for each of the 10 services, /referanser/, /om-oss/, /kontakt/, /personvern/, custom 404. Unique meta title + description per page; JSON-LD GeneralContractor (real address/phone/email, areaServed Bergen) site-wide.
8. COPY: Norwegian bokmål, "du"/"vi", calm, confident, concrete, short sentences, no clichés; every claim traceable to the facts. Use the design:ux-copy skill when writing copy (Skill tool).
9. Contact form: fields navn, telefon, e-post, prosjekttype (select of the 10 services + "Annet"), adresse/tomt, melding; per-field validation with clear Norwegian errors (aria-describedby, aria-invalid), success + failure states; posts JSON to process.env.NEXT_PUBLIC_FORM_ENDPOINT (e.g. Formspree) when set, otherwise falls back to opening a prefilled mailto:post@byggrv.no and says so. Map link to Google Maps search for the address (plain link, no embed).
10. Phone (tel:+4794016610) and e-mail always one tap away (sticky header actions on desktop, persistent compact action bar on mobile).

SHARED ARCHITECTURE & FILE OWNERSHIP (stay in your lane; other agents work in parallel):
- FOUNDATION agent owns: src/app/layout.tsx, src/app/globals.css (Tailwind v4 @theme tokens), DESIGN.md, src/content/** (ALL copy + data), src/lib/** (seo/jsonld helpers, utils), src/components/providers/** (SmoothScroll: Lenis + GSAP ScrollTrigger sync, reduced-motion aware), src/components/ui/** (MagneticButton, RevealText, Container, Section, Hairline, Cursor (desktop fine-pointer only), BeforeAfter slider base), src/app/icon.svg, src/app/robots.ts, src/app/sitemap.ts.
- MODEL agent owns: scripts/** (node scripts), public/models/**, public/renders/**, src/content/renders.ts (GENERATED manifest).
- THREE agent owns: src/components/three/** and must export from src/components/three/index.ts: HeroHouse, BuildSequence, PermitDiagram (see contract below).
- SECTIONS agent owns: src/app/page.tsx and all other routes/pages under src/app/** except layout.tsx/globals.css/icon/robots/sitemap, src/components/sections/**, src/components/layout/** (Header, MobileActionBar, Footer), src/components/forms/**.

CONTENT CONTRACT (FOUNDATION writes src/content/site.ts etc.; others import, never duplicate copy):
  company {name, legalName, address{street,postalCode,city}, phone, phoneHref, email, areaServed, missing:{...}}
  nav[], hero{headline, sub, cta}, intro{...}
  services[10] {slug, title, lede, body(paragraphs, specific to that service), includes[] (what Bygg RV's own trades do), metaTitle, metaDescription, renderKey}
    slugs: ny-bolig, oppussing-og-renovering, pabygg-og-tilbygg, ombygging, rehabilitering-og-renovering, takarbeid, dorer-og-vinduer, oppussing-av-bad, vvs, maling
  buildSteps[11] {id, title, body (exactly two sentences), trades[] (which in-house trades act), hotspots[] {id,label,text,layer}}
    ids: tomt, grunnarbeid, fundament, bindingsverk, isolasjon, tak, vinduer, kledning, installasjoner, interior, nokkelferdig
  process[6] {id,title,body}: forste-samtale, befaring, tilbud, byggesoknad, bygging, overlevering
  permitTypes[5] {id,title,body}: pabygg, frittliggende, tilbygg, kjeller, garasje (Påbygg, Frittliggende bygning, Tilbygg, Kjeller/Underbygg, Underbygget garasje)
  references[3] {id,title,place,summary,scope[],quote?(paraphrase, attributed only as the prompt allows: "Svein")}
  about{...}, values[], trades[], referenceHouse{title, credit, note}, missingFacts[] (every [MANGLER] item with where it appears)
  pages meta {home, tjenester, referanser, omOss, kontakt, personvern}

3D MODEL CONTRACT (MODEL writes public/models/house.glb (Meshopt-compressed, < 3 MB total incl. any textures; prefer no textures — procedural/vertex-colour/PBR flat materials), public/models/house.meta.json, public/models/permits.glb):
  house.glb scene: root node "House". Children are LAYER groups named exactly: layer_tomt (site plan lines/plot outline, stakes), layer_grunnarbeid (excavation pit + blasted rock pieces), layer_fundament (ringmur/slab + radon membrane), layer_bindingsverk (studs, plates, joists), layer_isolasjon (wood-fibre insulation boards + vindsperre membrane), layer_tak (roof trusses + roofing: dark standing-seam metal), layer_vinduer (window/door frames + glass with name containing "glass"), layer_kledning (standing cladding boards), layer_installasjoner (el + VVS runs as thin tubes, materials named "el_line" and "vvs_line" for glow), layer_interior (floors, kitchen block, bathroom, stairs, interior walls), layer_nokkelferdig (warm interior light meshes/emissive panels, terrace, lamps), plus env_terrain (Fana rock + ground), env_maple_a, env_maple_b (big maples), env_birch_* (birches). Each layer group: extras/userData {step:<id>, explode:[x,y,z] (unit-ish direction for exploded view)}. Floor heights in meta for plan cut.
  house.meta.json: {units:"m", bbox, floors:[{name:"Underetasje/1. etasje", y}, ...], cutHeights:[...], layers:{<id>:{center:[x,y,z], bbox, explode:[x,y,z]}}, hotspots:{<buildStepId>:[{id, position:[x,y,z]}]} (positions matching the hotspot ids FOUNDATION wrote in src/content — MODEL reads src/content to align), camera:{hero:{position,target,fov}, steps:{<id>:{position,target}}}}
  permits.glb: five root nodes permit_pabygg, permit_frittliggende, permit_tilbygg, permit_kjeller, permit_garasje — each a small diagram: existing house in neutral paper-grey + the new part highlighted in oak/brass.
  Renders (MODEL renders headless via Playwright + three from node_modules, then sharp → AVIF + WebP, widths 480/960/1600/2400 as appropriate) into public/renders/: hero-bluehour, hero-day, poster-build (sequence poster), one per build step (step-<id>), service sets (at least 2 views per service, e.g. svc-<slug>-a/-b, derived from relevant model states/close-ups), before/after pairs (ba-<n>-for/-etter, e.g. raw frame vs finished, unpainted vs painted, old vs new bathroom block), permit-<id>, og-image (1200×630 jpg). src/content/renders.ts exports a typed manifest {key: {alt (Norwegian, descriptive), width, height, sources:{avif:[{src,w}], webp:[...]}, placeholder (tiny base64 or dominant colour)}}.

THREE COMPONENT CONTRACT (src/components/three/index.ts):
  HeroHouse({className?}): blue-hour finished house in Fana landscape; poster <picture> (renders.hero-bluehour) shown first (LCP), canvas mounts lazily after idle/in-view and fades in; on desktop gentle drag inside limits (no free orbit, no zoom), on mobile no drag (scroll only); WebGL failure → keep poster; reduced motion → poster only (or static frame).
  BuildSequence(): the ENTIRE "Slik bygger vi" section (id="slik-bygger-vi"): pinned dark stage, GSAP ScrollTrigger scrubs through the 11 steps (layers appear in real Norwegian build order; installasjoner shown as glowing x-ray lines with other layers ghosted), copy panel per step (title, two sentences, trades), clickable hotspots (accessible buttons with popover text) per step, plus controls: exploded view toggle, floor-plan toggle (clipping plane slices model at floor cut heights to show plans), day/blue-hour toggle. Progress rail with step names (no numerals), keyboard accessible step jumps. Lazy-loads when near viewport; poster while loading; WebGL failure → static step renders (gallery); prefers-reduced-motion → stepped gallery of renders with the same copy (no scroll scrubbing).
  PermitDiagram({type}): small interactive 3D diagram per permit type (gentle auto-rotate on hover/focus only, drag on desktop), lazy, render fallback.
  Performance: dpr clamp [1, 1.75], frameloop 'demand' where idle, one shared GLB load (useGLTF + meshopt decoder from three/examples via drei's useGLTF meshopt support — no CDN decoder: configure local decoder), suspend offscreen, dispose, target 60 fps desktop.
`

const PW = `PLAYWRIGHT/LIGHTHOUSE: global playwright@1.56 — run node scripts with NODE_PATH=$(npm root -g). Chromium at /opt/pw-browsers (never 'playwright install'); for WebGL headless use args ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] (software GL is slow: judge fps qualitatively, measure on 'frameloop' cost). Serve the static export with 'npx -y serve@14 out -l <free port>' or 'python3 -m http.server --directory out <port>' (background; kill after). Lighthouse: 'npx -y lighthouse@12' with CHROME_PATH pointing at the chromium binary under /opt/pw-browsers (find it), --chrome-flags='--headless=new --no-sandbox', mobile preset (default). Keep scripts, screenshots and reports in ${SCR}/<your-stage>/ — NEVER in the repo. npm registry is reachable; most other hosts are blocked.`

const GATES = `QUALITY GATES (from the prompt): 'npm run build' and 'npm run lint' pass with zero errors and zero type errors; clean browser console on every page; Playwright screenshots at 390, 768, 1440 reviewed (no horizontal scroll, nothing overlaps, text over images readable); 3D lazy below fold, poster while loading, WebGL-fail fallback, reduced-motion stepped gallery; Lighthouse mobile Perf ≥ 90, A11y ≥ 95, Best Practices ≥ 95, SEO ≥ 95, LCP < 2.5 s (software GL in this sandbox can skew Perf — report honestly, and make sure the 3D is not on the LCP critical path); WCAG 2.1 AA; every link and form state tested.`

const FIND = {
  type: 'object',
  properties: {
    findings: { type: 'array', items: { type: 'object', properties: {
      severity: { type: 'string', enum: ['critical', 'major', 'minor'] },
      area: { type: 'string' }, problem: { type: 'string' }, fix: { type: 'string' }, file: { type: 'string' }, viewport: { type: 'string' },
    }, required: ['severity', 'area', 'problem', 'fix'] } },
    verdict: { type: 'string' },
  },
  required: ['findings', 'verdict'],
}

const UPDATE = `
=== UPDATE (supersedes decision 3 "BLOCKED SOURCES" above) ===
The client's real site content HAS NOW BEEN IMPORTED into the repo (commit 1bc6a56):
- ${ROOT}/content-import/byggrv/pages/*.md — cleaned Norwegian text of all 18 byggrv.no pages (hjem, tjenester + service subpages incl. tomrer, vvs, rorlegger-vvs, totalrenovering, maling, takarbeid, ombygging, oppussing-av-bad, bytte-dorer-og-vinduer, pabygg-og-tilbygg, rehabilitering-og-renovering, oppussing-og-renovering; ny-bolig, om-oss, kontakt, referanser) + pages.json + README.md
- ${ROOT}/public/images/byggrv/ — 58 original images (15.8 MB) + content-import/byggrv/images.json {file, sourceUrl, pages, alt, width, height}. Includes logos (logo-byggrenovering*.svg, logo-transp.png, iko.png), real before/after pairs (for.png/etter.png, gang-for.png/gang-etter.png), and project/service photos.
- ${ROOT}/content-import/byggrv/site-facts-from-search.md (extra snippets, lower priority).
RULES FOR USING IT:
- Real text is the source of truth for facts (services offered, what each includes, references). Rewrite it into the calm, concrete new voice — never copy the old site's repeated placeholder paragraph. The referanser page text is authoritative for the three references (paraphrase faithfully; only name people/companies exactly as the source does, and treat any oddities — e.g. a different company name in a testimonial, or job-ad wording — conservatively: describe scope, don't invent).
- Photos: build an optimised responsive set (sharp → AVIF + WebP, sensible widths, into public/images/byggrv/opt/) and a typed manifest src/content/photos.ts {key → {alt (Norwegian, descriptive), width, height, sources, placeholder, sourcePage, origin: 'own' | 'stock-suspect' | 'third-party-suspect' | 'illustration' | 'logo'}}. Classify honestly by filename/content (e.g. names containing shutterstock, freepik-style '_1284-', 'isometric', 'vector', other companies' names like OveSkarAS/Statsbygg/rorbu are NOT the client's own work). Use 'own' photos prominently (services, references, before/after sliders with the REAL for/etter pairs, hero/intro supporting imagery where fitting); do not use stock-suspect/third-party-suspect images or the isometric vector clipart on the luxury site (list them in README as needing a licence check / excluded for design reasons). Use the client's real logo (pick the best SVG variant; restyle colour via CSS only if it remains faithful) in header/footer.
- Prefer real photos over 3D renders wherever a photo of their work exists; renders remain for the 3D/reference-house storytelling and wherever no photo exists.
- The old services list on their site may differ slightly from the prompt's 10 services (e.g. separate Tømrer, Totalrenovering, Rørlegger VVS pages). Keep the prompt's 10 service slugs as the main structure, and fold the extra pages' facts into the most fitting services (e.g. totalrenovering → oppussing-og-renovering, rorlegger-vvs → vvs, tomrer → its relevant services) — or add them as extra service pages if clearly distinct, keeping slugs consistent everywhere (content, sitemap, links, form select).
STATUS: Foundation, content import, sections/pages, 3D model + renders and the three R3F components (HeroHouse, BuildSequence, PermitDiagram) are DONE and committed on branch claude/byggrv-redesign-e1scwk. A QA pass may have partially run (see git log). This workflow runs the remaining phases: QA → Critique → Polish. Inspect the existing code first (git log -15, README.md, DESIGN.md, scripts/README.md) and fix/finish — never rebuild from scratch.
`
const BRIEF2 = BRIEF + UPDATE

phase('QA')
const qa = await agent(`${BRIEF2}
(Build agents' reports are not available in this session — read git log, README.md, DESIGN.md, scripts/README.md and src/components/three/** to understand what was built.)
YOUR ROLE: QA + FIX (integration). ${GATES}
1) Replace any leftover placeholders between agents (renders.ts / three index) — ensure real implementations are wired; npm run build + npm run lint zero errors/warnings that matter (fix them).
2) Serve 'out/' and test EVERY route at 390, 768, 1440: console clean, no horizontal scroll (scrollWidth ≤ innerWidth), nothing overlapping, text over images readable, all internal links resolve (crawl), tel:/mailto:/map links correct, every form state (empty submit → errors, invalid email/phone, valid → success path with endpoint unset → mailto fallback; simulate endpoint set via a local mock server to test success + failure), keyboard navigation + visible focus, hotspots/toggles by keyboard, reduced motion, WebGL disabled fallback, 3D lazy-loading (no GLB request before scrolling near), poster as LCP.
3) Lighthouse mobile on /, /tjenester/ny-bolig/, /kontakt/ — record scores + LCP; fix what you can (font loading, image sizes, unused JS, render-blocking, contrast, meta).
4) LOOK at all screenshots (Read). Fix every defect. Re-run until clean.
${PW} Commit nothing. Return: gate-by-gate status table (pass/fail + numbers), fixes made, remaining issues, and the screenshot directory.`, { label: 'qa-integration', phase: 'QA' })

phase('Critique')
const crit = await parallel([
  () => agent(`${BRIEF2}\nQA report:\n${String(qa).slice(0, 3500)}\nYOUR ROLE: DESIGN CRITIC. Load the 'design:design-critique' skill with the Skill tool and follow it. Do NOT edit repo files. Build is in ${ROOT}/out (run npm run build first if missing). Take your own screenshots at 390 and 1440 of every home section and each route type, plus the build sequence at several scroll points, into ${SCR}/critic-design/, LOOK at them, and critique against: Lys papir Nordic luxury / architect's monograph (modusprojects.nl restraint), the user's dislikes (too colourful, AI-looking numbering/eyebrows), hierarchy, typography scale/tracking, whitespace rhythm, image use, 3D beauty and choreography, mobile experience, copy tone. Concrete fixes with exact values. Top 15 by impact. ${PW}`, { label: 'critic-design', phase: 'Critique', schema: FIND }),
  () => agent(`${BRIEF2}\nQA report:\n${String(qa).slice(0, 3500)}\nYOUR ROLE: ACCESSIBILITY AUDITOR. Load the 'design:accessibility-review' skill with the Skill tool and follow it (WCAG 2.1 AA). Do NOT edit repo files. Audit ${ROOT} source + the built site (serve out/, run axe-core via npm in the scratchpad injected with Playwright on every route at 390 and 1440, plus manual keyboard/screen-reader-semantics checks of the build sequence, hotspots, toggles, BeforeAfter slider, form, mobile action bar, menus), contrast of every token pair actually used, focus visibility, reduced motion, alt text in Norwegian, headings order, landmarks, link purpose, target sizes. Only verified issues with concrete fixes. ${PW}`, { label: 'critic-a11y', phase: 'Critique', schema: FIND }),
])
const findings = crit.filter(Boolean).flatMap(c => c.findings)
log(`${findings.length} findings (${findings.filter(f => f.severity === 'critical').length} critical, ${findings.filter(f => f.severity === 'major').length} major)`)

phase('Polish')
const polish = await agent(`${BRIEF2}
YOUR ROLE: POLISH. Apply these findings in ${ROOT} — all critical/major and every clearly-correct cheap minor; skip wrong ones with a reason (check code first).
FINDINGS:\n${JSON.stringify(findings, null, 1)}
VERDICTS:\n${crit.filter(Boolean).map(c => c.verdict).join('\n---\n')}
Then re-run EVERY quality gate end-to-end. ${GATES}
Save final screenshots to ${SCR}/final/ named final-<route>-<width>.png (+ final-build-<step>-1440.png for 4 representative steps, final-home-full-1440.png and final-home-full-390.png stitched/full-page) and LOOK at them; fix regressions. Final Lighthouse mobile on /, /tjenester/ny-bolig/, /kontakt/ (save JSON/HTML reports in ${SCR}/final/lighthouse/). Write/refresh README.md in ${ROOT} (handover: run, build, deploy to Vercel (static export; framework preset Next.js), env NEXT_PUBLIC_FORM_ENDPOINT, how to regenerate model/renders, where to swap in the client's own house model (exact file + layer naming contract), how to drop real photos into public/images/byggrv/ and wire them, full [MANGLER] list, what needs written permission (byggrv.no content if not their agency; Kvalbein Korsøen — we used no photos, only our interpretation, still ask), and gate results). Ensure git status shows only intended project files (no screenshots/scripts from tests, no .env). Commit nothing. ${PW}
Return: applied/skipped list, final gate table with numbers, final screenshot paths, remaining honest caveats.`, { label: 'polish+gates', phase: 'Polish' })

return { qa, findings: findings.length, polish }
