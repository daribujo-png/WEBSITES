# Bygg & Renovering Vest AS — byggrv.no

A static, single-page site for **Bygg og Renovering Vest AS** (Breistein, Bergen),
written in Norwegian bokmål.

The page tells one story, from top to bottom:

1. **Loader.** A blueprint wireframe of a house draws itself in 3D while a % counter runs. You can skip it with *Esc*, a click or the button, and it is skipped automatically under *reduced motion*.
2. **Intro.** *«Har du tomt, men ikke hus?»* is set over the blueprint.
3. **Fra byggeplassen.** A pinned, horizontally scrolling reel of the company's own photos and films. It is data-driven; see `assets/footage/README.md`.
4. **Byggeprosessen.** About 760 vh of scroll builds a Norwegian house from an empty plot to a turnkey home in 10 stages, with Norwegian copy for each stage. Scrolling back takes it apart again. A rail lets you jump straight to any stage.
5. Tjenester, Alle fag under ett tak, Slik jobber vi, Om oss, Kontakt (the form builds a ready-to-send `mailto:`), and a footer where the finished house glows behind the wordmark.

## Run it

No build step and no dependencies to install.

```bash
cd WEBSITES
python3 -m http.server 8000
# open http://localhost:8000
```

Any static host works: Netlify, Vercel static, S3, nginx or Apache.
`footage.json` is loaded with `fetch()`, so serve the site over http(s) rather than opening it as `file://`.

## Structure

```
index.html                 markup, SEO (meta, OG, JSON-LD GeneralContractor), importmap
css/style.css              all styles; design tokens on :root
js/main.js                 UI + scroll orchestration (ES module), SVG fallback scene
js/house.js                Three.js scene: the house, built as a pure function of scroll progress
vendor/three.module.min.js three r170 (self-hosted, no CDN)
vendor/addons/RoomEnvironment.js
assets/favicon.svg, assets/logo.svg
assets/footage/            footage.json + your photos and videos (see README there)
robots.txt, sitemap.xml
```

### How the pieces talk

`main.js` loads `house.js` with a dynamic `import()` and drives one fixed
`<canvas id="scene">` through this API:

```js
createHouseScene({ canvas, reducedMotion, isMobile }) // → null without WebGL
  .setLoadProgress(p)   // loader: blueprint draw-in, 0..1
  .setBuildProgress(p)  // build state, 0..1 (pure function of p, smoothed internally)
  .setMode(m)           // 'loader' | 'intro' | 'build' | 'idle'
  .setPointer(x, y)     // -1..1, x to the right, y upwards
  .getStages()          // [{ id, start, end }] × 10
  .resize() .setActive(bool) .dispose()
  .setViewShift(x, y)   // optional framing nudge (used for the hero)
```

A single rAF-throttled scroll handler maps section progress to the reel's
`translateX`, to `setBuildProgress`, and to the canvas opacity and mode. When the
canvas isn't visible or the tab is hidden, the render loop pauses.

## Fallbacks and accessibility

- **No WebGL**, or `house.js` fails to load: the same API is backed by an SVG line-drawn axonometric house in `main.js`. It is driven by the same scroll progress and the same stages.
- **No JavaScript:** every piece of content is readable. The reel scrolls horizontally, and the build stages show as a list. Hidden start states are gated behind `html.js`.
- **Reduced motion:** the loader is skipped, auto-motion (camera drift, marquee, Ken Burns, grain) is switched off, and the build can still be scrubbed.
- The page has semantic landmarks, a skip link, visible focus styles, an accessible mobile menu (focus trap, Esc, `inert`), and an `aria-live` region for build stages. Contrast is tuned to AA.

## Editing content

All copy lives in `index.html`. The build-stage text is in
`#build-stages > li[data-stage]`. Keep the `data-stage` ids in sync with
`house.js`: `tomt`, `grunnmur`, `bindingsverk`, `bjelkelag`, `takstoler`,
`kledning`, `vinduer`, `tak`, `innredning`, `nokkelferdig`.

Facts on the page come from the company's existing site, and no figures, awards or
references have been invented. When you add real projects, put them in
`assets/footage/footage.json`.
