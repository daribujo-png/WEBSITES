# Bygg & Renovering Vest AS: byggrv.no (v2)

A static, single-page site for **Bygg og Renovering Vest AS** (Breistein, Bergen),
written in Norwegian bokmål.

v2 is a white site. The colour comes from graphics, illustrations, buttons and a
Norwegian house-paint palette, not from dark backgrounds. The main message is
**«Vi gjør alt»**: nybygg, tilbygg, påbygg, maling and every other trade, under one roof.

## What's on the page

1. **Hero.** A white hero where the 3D house draws itself as a blueprint, builds itself in
   about 8 seconds (grunnmur, bindingsverk, bjelkelag, takstoler, kledning, vinduer, tak) and
   is painted by a roller that rides along the wet paint edge. A caption beside it says what is
   happening right now («Støper grunnmuren…», «Maler huset i fjordblått…»). Visitors can pick a
   colour (Falurød, Oker, Fjordblå, Mosegrønn, Kritthvit, Antrasitt) at any time and the house is
   repainted; the trims follow the paint (white listverk on a dark house, antrasitt on a light
   one). The brush stroke under «alt.» takes the house colour. «Bygg på nytt» replays the build
   and «Vis ferdig hus» skips it. The hero itself is the loading screen. There is no separate loader.
   The build runs on wall-clock time, so a slow device drops frames instead of stretching the build.
2. **Marquee** listing every service, with a pause button (it also pauses on hover and focus).
   A strip of it peeks in above the fold.
3. **Tjenester («Alt under ett tak»).** Nybygg (large) with Tilbygg and Påbygg beside it, a
   full-width «Vi maler hus» band with paint sample cards, Oppussing og renovering, Bad og VVS
   and Tak, then «Og alt det andre» as compact tiles (Ombygging, Rehabilitering og restaurering,
   Elektro, Tømrerarbeid, Mur og betong, Sprenging og grunnarbeid, Garasje og terrasse, Noe
   annet?) and the «Én prosjektleder for alt» band. Every tile has its own inline SVG
   illustration; the tile title is the link (it covers the whole tile) and pre-ticks the service
   in the contact form. Below is a short glossary (tilbygg, påbygg, rehabilitering and so on).
   Tile colours: five solid tones, four clear tints and white.
4. **Slik jobber vi.** A few plain sentences (befaring, fast pris, tegner, bygger, nøklene)
   next to one drawing. No step numbers, no timeline.
5. **Fra byggeplassen.** A photo gallery driven by `assets/footage/footage.json`. It is
   **hidden until at least three real photos or videos have loaded**, together with its menu
   and footer links, so the page never shows a gallery of work that isn't there. The shipped
   manifest is empty (`[]`). See `assets/footage/README.md`.
6. **Om oss**, **Kontakt** (the form builds a ready-to-send `mailto:` with the services
   that were ticked) and a white footer with a big wordmark.

There is deliberately no numbering anywhere (no «01/02/03», step numbers or counters).
Nav, hero and every section share one container (`--container: 1440px`), so the logo, the
headline, the section titles and the footer wordmark sit on one left edge.

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
assets/favicon.svg, assets/favicon-32.png, assets/apple-touch-icon.png, assets/logo.svg
assets/og.jpg              social preview (1200×630, a render of the finished hero)
assets/footage/            footage.json and your photos and videos (see the README there)
robots.txt, sitemap.xml, vercel.json
```

### How main.js and house.js talk

`main.js` loads `house.js` with a dynamic `import()` (preloaded with `modulepreload`, as are
three and RoomEnvironment) and drives the `<canvas id="hero-canvas">`. The canvas sits inside
the hero and only covers the stage plus a soft fade band (from just left of the house on
desktop, from just above it on phones), so the GPU doesn't draw pixels hidden under the copy:

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
  .setViewShift(x, y, region)      // framing: the house is fitted into .hero__house
  .resize() .setActive(bool) .dispose()
  .setScrollOut(t)                 // optional: the house turns and settles as the hero scrolls away
  .onPaintEnd(cb)                  // optional: a repaint has reached the last board («Ferdig malt i …»)
  .ready                           // optional: a promise, resolved once the shaders are compiled
```

Every call is feature-detected and wrapped in try/catch, so a scene bug never breaks the page.
The render loop pauses when the hero is off-screen or the tab is hidden, and stops asking for
frames once nothing moves (the idle sway after the build fades out after about 20 seconds).
A lost WebGL context is rebuilt on restore (reflections and shadows included); if it doesn't
come back within 2.5 s, the SVG house takes over.

## Fallbacks and accessibility

- **No WebGL**, or `house.js` fails, is slow (over 6 s) or loses its context: the static,
  flat-colour SVG house in `index.html` takes over through the same contract. It builds in
  the same stages, gets painted with a roller, and the colour swatches repaint it.
  The SVG is generated once (isometric projection) and pasted between the
  `<!-- house:start -->` and `<!-- house:end -->` markers.
- **No JavaScript:** everything is readable. The hero shows the finished, painted SVG house,
  the gallery stays hidden and the marquee still scrolls (and pauses on hover). Hidden start
  states are gated behind `html.js`.
- **Reduced motion:** the house appears finished and painted straight away, colours change
  without a sweep, the marquee becomes a static list and reveals are switched off.
- The page has semantic landmarks, a skip link, visible focus styles, an accessible mobile
  menu (focus trap, Esc, `inert`), `aria-pressed` swatches, a pausable marquee and AA contrast.
  The visual build caption is not a live region; one hidden `role="status"` element announces
  only the key moments (the build starts, the house is finished, a repaint is done).
  Small orange text uses `--accent-ink`, not `--accent`. Side gutters respect the iPhone
  notch (`env(safe-area-inset-*)`) in landscape.
- **SEO:** title, description, Open Graph and Twitter cards with `assets/og.jpg`, raster
  favicon and apple-touch-icon, and JSON-LD `GeneralContractor` listing every service.

## Editing content

All copy lives in `index.html`. The build captions are in `LABELS` in `js/main.js`; the
lower-case colour names used inside sentences («malt i fjordblått») are the `data-inline`
attributes on the swatch buttons.
Facts on the page come from the company's existing site. No figures, years, awards,
reviews or project names have been invented. When you add real projects, put them in
`assets/footage/footage.json`.
