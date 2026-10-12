# Footage — «Fra byggeplassen»

The footage reel is the first thing visitors scroll through after the intro. It is
built from `footage.json` in this folder, so you can add or swap photos and videos
without touching HTML or JavaScript.

## Quick start

1. Export your photos as JPG or WebP, about **2400 px on the long side** and **under ~400 KB** each.
2. Name them `01.jpg` … `06.jpg` and drop them in this folder. They show up straight away, with a slow Ken Burns move.
3. Reload the page. That's all.

Until a file exists, its frame shows a designed placeholder: a big word, duotone
grain and a “Bilde kommer” tag. It never looks broken.

## footage.json

An array of frames, shown left to right:

```json
[
  {
    "type": "image",
    "src": "assets/footage/01.jpg",
    "title": "Nybygg",
    "place": "Bergen",
    "caption": "Fra tomt til nøkkelferdig bolig — til avtalt tid og pris.",
    "alt": "Nytt hus med svart stående kledning i Åsane"
  },
  {
    "type": "video",
    "src": "assets/footage/07.mp4",
    "poster": "assets/footage/07-poster.jpg",
    "title": "Takarbeid",
    "place": "Bergen",
    "caption": "Falset stål på plass før regnet kommer."
  }
]
```

| Field     | Required | Notes |
|-----------|----------|-------|
| `type`    | no       | `"image"` (default) or `"video"`. |
| `src`     | yes*     | Path relative to the site root (`index.html`). *A frame with only a `title` shows the designed placeholder. |
| `title`   | yes      | Big word in the placeholder and the caption title. Keep it short (1–2 words). |
| `place`   | no       | Small mono label, defaults to `Bergen`. |
| `caption` | no       | One short line under the frame. |
| `alt`     | no       | Alt text for screen readers. Defaults to `title — place`. |
| `poster`  | no       | Video only: still image shown before playback. |
| `icon`    | no       | Placeholder line drawing: `nybygg`, `tilbygg`, `vvs`, `rehab`, `tak`, `renovering`, `ombygging`. |
| `layout`  | no       | `"wide"` or `"tall"` frame. If you leave it out, the reel alternates automatically. |

**Video tips:** use MP4 (H.264), keep clips short (5–15 s) and silent, and aim for
**under ~6 MB** each. They play muted and looped while visible. With
*reduced motion* turned on, they don't autoplay and show controls instead.

You can add up to 24 frames. The reel's length adapts automatically.

> Note: `footage.json` is loaded with `fetch()`, so the site must be served over
> http(s) (for example `python3 -m http.server`). If the page is opened
> as a local `file://`, the six built-in frames in `index.html` are used instead.
