# Footage: «Fra byggeplassen»

The gallery under «Fra byggeplassen» is built from `footage.json` in this folder, so you
can add or swap photos and videos without touching HTML or JavaScript.

## Quick start

1. Export your photos as JPG or WebP, about **2000 px on the long side** and **under ~400 KB** each.
2. Save them in this folder, for example `01.jpg` … `06.jpg`.
3. In `footage.json`, add a `src` line to the card the photo belongs to:
   `"src": "assets/footage/01.jpg",`
4. Reload the page. That's all.

A card without `src` shows a coloured illustration of the service with the title and
caption on top. The shipped `footage.json` has no `src` lines yet, so the live site makes
no requests for photos that don't exist (no 404s in the console). If a `src` points to a
file that is missing, the card quietly keeps its illustration, so it never looks broken
and visitors don't see a «coming soon» tag.

## footage.json

An array of cards, shown in order:

```json
[
  {
    "type": "image",
    "src": "assets/footage/01.jpg",
    "title": "Nybygg",
    "place": "Bergen",
    "caption": "Fra tomt til nøkkelferdig bolig, til avtalt tid og pris.",
    "alt": "Nytt hus med stående kledning i Åsane",
    "icon": "nybygg",
    "layout": "tall"
  },
  {
    "type": "video",
    "src": "assets/footage/07.mp4",
    "poster": "assets/footage/07-poster.jpg",
    "title": "Takarbeid",
    "caption": "Falset stål på plass før regnet kommer.",
    "icon": "tak"
  }
]
```

| Field     | Required | Notes |
|-----------|----------|-------|
| `type`    | no       | `"image"` (default) or `"video"`. |
| `src`     | yes*     | Path relative to the site root (`index.html`). *A card with only a `title` shows the illustration. |
| `title`   | yes      | Short title (one to three words). |
| `caption` | no       | One short line. |
| `place`   | no       | Added after the caption when it isn't `Bergen`. |
| `alt`     | no       | Alt text for screen readers. Defaults to «title, prosjekt i Bergen og omegn». |
| `poster`  | no       | Video only: still image shown before playback. |
| `icon`    | no       | Which illustration to show until the photo exists: `nybygg`, `tilbygg`, `pabygg`, `maling`, `oppussing`, `bad`, `tak`, `ombygging`, `rehabilitering`, `elektro`, `tomrer`, `mur`, `sprenging`, `garasje`, `prosjektledelse`. If you leave it out, it is guessed from the title. |
| `layout`  | no       | `"tall"` or `"wide"` card. If you leave it out, a pattern is used. For a tidy grid on desktop, the spans should fill rows of three. |

**Video tips:** use MP4 (H.264), keep clips short (5–15 s) and silent, and aim for
**under ~6 MB** each. They play muted and looped while visible. With
*reduced motion* turned on, they don't autoplay and show controls instead.

You can add up to 24 cards.

> Note: `footage.json` is loaded with `fetch()`, so the site must be served over
> http(s) (for example `python3 -m http.server`). If the page is opened as a local
> `file://`, the six built-in cards in `index.html` are used instead. Those cards also
> carry their illustrations in the HTML, so they look right with JavaScript turned off.
