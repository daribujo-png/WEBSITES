# Bygg & Renovering Vest AS: byggrv.no (v2)

A static, single-page site for **Bygg og Renovering Vest AS** (Breistein, Bergen),
written in Norwegian bokmål.

v2 is a white site. The colour comes from graphics, illustrations, buttons and a
Norwegian house-paint palette, not from dark backgrounds. The main message is
**«Vi gjør alt»**: nybygg, tilbygg, påbygg, maling and every other trade, under one roof.

## What's on the page

1. **Hero.** A full-screen white hero. The 3D house draws itself as a blueprint, builds
   itself in about 8 seconds (grunnmur, bindingsverk, bjelkelag, takstoler, kledning,
   vinduer, tak) and gets painted with a roller sweep. A caption beside it says what is
   happening right now («Støper grunnmuren…»). When the house is finished, visitors can pick
   a colour (Falurød, Oker, Fjordblå, Mosegrønn, Kritthvit, Antrasitt) and the house is
   repainted. «Bygg på nytt» replays the build, and «Vis ferdig hus» skips it.
   The hero itself is the loading screen. There is no separate loader.
2. **Marquee** listing every service.
3. **Tjenester («Alt under ett tak»).** A colourful grid of 15 services, each with its own
   inline SVG illustration and a small hover animation: Nybygg, Tilbygg, Påbygg, Maling,
   Oppussing & renovering, Bad & VVS, Tak, Ombygging, Rehabilitering & restaurering,
   Elektro, Tømrerarbeid, Mur & betong, Sprenging & grunnarbeid, Garasje & terrasse,
   and Prosjektledelse/totalentreprise. «Spør om …» links pre-tick the service in the
   contact form. Below the grid is a short glossary (tilbygg, påbygg, rehabilitering and so on).
4. **Slik jobber vi.** Befaring, fast pris, planlegging, bygging, overlevering. Plain prose
   with icons.
5. **Fra byggeplassen.** A gallery driven by `assets/footage/footage.json`. Until real photos
   exist, each card shows a coloured illustration, so it never looks broken. The shipped
   manifest has no `src` lines yet, so the site requests no missing photos (no 404s);
   add `"src"` to a card when its photo is in the folder (see `assets/footage/README.md`).
6. **Om oss**, **Kontakt** (the form builds a ready-to-send `mailto:` with the services
   that were ticked) and a white footer with a big wordmark.

There is deliberately no numbering anywhere (no «01/02/03», step numbers or counters).

## Run it

No build step and no dependencies to install.

```bash
cd WEBSITES
python3 -m http.server 8000
# open http://localhost:8000
# open http://localhost:8000/?svg to force the SVG house (no WebGL)
```

Any static host works: Vercel (see `vercel.json`), Netlify, S3, nginx or Apache.
`footage.json` is loaded with `fetch()`, so serve the site over http(s) rather than opening it as `file://`.

## Structure

```
index.html                 markup, all copy, SEO (meta, OG, JSON-LD GeneralContractor),
                           importmap, inline service illustrations, static SVG house
css/style.css              all styles; design tokens and the paint palette on :root
js/main.js                 UI and hero orchestration (ES module), SVG house controller
js/house.js                Three.js hero house: builds itself, then gets painted
vendor/three.module.min.js three r170 (self-hosted, no CDN)
vendor/addons/RoomEnvironment.js
assets/favicon.svg, assets/logo.svg
assets/footage/            footage.json and your photos and videos (see the README there)
robots.txt, sitemap.xml, vercel.json
```

### How main.js and house.js talk

`main.js` loads `house.js` with a dynamic `import()` and drives the
`<canvas id="hero-canvas">`, which sits inside the hero (`position: absolute; inset: 0`):

```js
createHouseScene({ canvas, reducedMotion, isMobile }) // → null without WebGL
  .play({ duration: 8000 })        // auto-build from an empty plot to a painted house
  .skipToEnd()                     // jump to the finished, painted house
  .setBuildProgress(p, immediate)  // 0..1 (p ≥ 0.92 is the painting phase)
  .setPaintColor(hex, { animate }) // repaint the walls with a roller sweep
  .onStage(cb)                     // cb({ id, label }) for blueprint, grunnmur, bindingsverk, bjelkelag,
                                   //   takstoler, kledning, vinduer, tak, maling, ferdig
  .onComplete(cb)                  // after the build and the paint are finished
  .setPointer(x, y)                // -1..1, gentle tilt
  .setViewShift(x, y)              // framing shift, measured from .hero__house
  .resize() .setActive(bool) .dispose()
  .setScrollOut(t)                 // optional: the house turns and settles as the hero scrolls away
```

Every call is feature-detected and wrapped in try/catch, so a scene bug never breaks the page.
The render loop pauses when the hero is off-screen or the tab is hidden.

## Fallbacks and accessibility

- **No WebGL**, or `house.js` fails, is slow (over 6 s) or loses its context: the static,
  flat-colour SVG house in `index.html` takes over through the same contract. It builds in
  the same stages, gets painted with a roller, and the colour swatches repaint it.
  The SVG is generated once (isometric projection) and pasted between the
  `<!-- house:start -->` and `<!-- house:end -->` markers.
- **No JavaScript:** everything is readable. The hero shows the finished, painted SVG house,
  the gallery shows its built-in illustrated cards and the marquee still scrolls. Hidden start states are
  gated behind `html.js`.
- **Reduced motion:** the house appears finished and painted straight away, colours change
  without a sweep, the marquee becomes a static list and reveals are switched off.
- The page has semantic landmarks, a skip link, visible focus styles, an accessible mobile
  menu (focus trap, Esc, `inert`), an `aria-live` caption for the build, `aria-pressed`
  swatches and AA contrast. Small orange text uses `--accent-ink`, not `--accent`.

## Editing content

All copy lives in `index.html`. The build captions are in `LABELS` in `js/main.js`.
Facts on the page come from the company's existing site. No figures, years, awards,
reviews or project names have been invented. When you add real projects, put them in
`assets/footage/footage.json`.
