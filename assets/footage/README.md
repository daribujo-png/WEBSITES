# Footage: «Fra byggeplassen»

The «Fra byggeplassen» gallery is built from `footage.json` in this folder, so you can
add photos and videos without touching HTML or JavaScript.

**The section is hidden until there are real photos.** It only appears (together with
its links in the menu and the footer) once at least **three** photos or videos have
actually loaded. There are no placeholder cards and no illustrations standing in for
projects, so visitors never see a gallery of work that isn't there. The shipped
`footage.json` is an empty list (`[]`), so the live site requests no photos at all.

## Quick start

1. Export your photos as JPG or WebP, about **2000 px on the long side** and **under ~400 KB** each.
2. Save them in this folder, for example `tilbygg-aasane.jpg`.
3. Add one card per photo to `footage.json` (see below). Use at least three.
4. Reload the page. The section and its menu link appear by themselves.

A card whose file is missing or broken is simply left out. If fewer than three load,
the section stays hidden.

## footage.json

An array of cards, shown in order:

```json
[
  {
    "type": "image",
    "src": "assets/footage/tilbygg-aasane.jpg",
    "title": "Tilbygg",
    "caption": "Nytt soverom og vaskerom på bakkeplan.",
    "place": "Åsane",
    "alt": "Nytt tilbygg i oker med store vinduer mot hagen",
    "layout": "tall"
  },
  {
    "type": "video",
    "src": "assets/footage/tak.mp4",
    "poster": "assets/footage/tak-poster.jpg",
    "title": "Takarbeid",
    "caption": "Falset stål på plass før regnet kommer."
  }
]
```

Write captions about the actual job (what was done, where), not sales lines.

| Field     | Required | Notes |
|-----------|----------|-------|
| `type`    | no       | `"image"` (default) or `"video"`. |
| `src`     | yes      | Path relative to the site root (`index.html`). Cards without `src` are ignored. |
| `title`   | yes      | Short title (one to three words). |
| `caption` | no       | One short line. |
| `place`   | no       | Added after the caption when it isn't `Bergen`. |
| `alt`     | no       | Alt text for screen readers. Defaults to «title, fra en jobb i Bergen og omegn». |
| `poster`  | no       | Video only: still image shown before playback. |
| `layout`  | no       | `"tall"` or `"wide"` card. If you leave it out, a pattern is used. For a tidy grid on desktop, the spans should fill rows of three. |

**Video tips:** use MP4 (H.264), keep clips short (5–15 s) and silent, and aim for
**under ~6 MB** each. They play muted and looped while visible. With
*reduced motion* turned on, they don't autoplay and show controls instead.

You can add up to 24 cards.

> Note: `footage.json` is loaded with `fetch()`, so the site must be served over
> http(s) (for example `python3 -m http.server`). Opened as a local `file://`, or with
> JavaScript turned off, the section stays hidden.
