# Bygg og Renovering Vest – byggrv.no

A static Next.js 16 site (App Router, TypeScript, Tailwind v4) with a React Three Fiber model of a house that builds itself as you scroll. GSAP ScrollTrigger and Lenis drive the scroll animation.

## Run

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # static export to ./out
npm run lint
```

## Deploy

`next build` writes a fully static site to `out/` (`output: "export"`, trailing slashes). You can upload `out/` to any static host, such as Netlify, Cloudflare Pages, S3/CloudFront or nginx. No server is needed.

### Contact form

Set `NEXT_PUBLIC_FORM_ENDPOINT` at build time (see `.env.example`) to a form service that forwards to post@byggrv.no, for example a Formspree endpoint. The form posts JSON there.

If the variable is not set, the form opens a prefilled e-mail to post@byggrv.no and tells the visitor so.

## Structure

| Path | What |
|---|---|
| `DESIGN.md` | Design system: tokens, type, grid, motion, imagery, do/don't. |
| `src/app/globals.css` | Tailwind v4 `@theme` tokens and global styles. |
| `src/content/` | **All copy and data** (Norwegian), plus `renders.ts` (generated render manifest). |
| `src/lib/` | SEO/JSON-LD helpers, fonts, motion tokens, hooks, contact form logic, image types. |
| `src/components/ui/` | Primitives (Section, RevealText, MagneticButton, BeforeAfter, Picture …). |
| `src/components/providers/` | SmoothScroll (Lenis + ScrollTrigger) and RevealObserver. |
| `src/components/three/` | Hero house, build sequence and permit diagrams (R3F). |
| `src/components/sections/`, `layout/`, `forms/` | Page sections, header/footer/action bar, contact form. |
| `public/models/`, `public/renders/` | Meshopt-compressed GLB model and AVIF/WebP renders. |
| `public/images/byggrv/` | Client photos (see below). |

## Client photos (image pipeline)

The text and images from byggrv.no are imported in `content-import/byggrv/` (page text as Markdown, `images.json` with source URL and page for each image). The 58 original images are in `public/images/byggrv/`, with their original filenames.

```bash
npm run images:build            # only rebuilds missing or outdated files
npm run images:build -- --force # rebuilds everything
```

`scripts/images/optimize.mjs` (sharp) reads the inventory in `scripts/images/photos.config.mjs` and:

1. writes AVIF + WebP files to `public/images/byggrv/opt/` as `<key>-<width>.avif|webp` (480/960/1600/2400, capped at the original width), plus a tiny blurred placeholder;
2. writes cleaned logo SVGs to `public/images/byggrv/opt/logo/` (original colours, ink, snow, and the mark alone);
3. generates `src/content/photos.ts` (typed manifest: alt text in Norwegian, size, sources, placeholder, caption, origin, source page) and `src/content/brand.ts` (logo path data for inline SVG).

Render a photo with `<Picture asset={photos[key]} />`. Services, the before/after pairs and the reference photo grid list their photos as `photoKeys` in `src/content/`.

To add a photo: put the original in `public/images/byggrv/`, add it to `images.json` (or to the inventory only), add an entry with key, Norwegian alt text and caption to `photos` in `photos.config.mjs`, and run `npm run images:build`. The script stops if any image in `images.json` is not classified exactly once, so nothing reaches the site unreviewed.

### What is used

Only the client's own photos (`origin: "own"`) and the outlined logo (`logo-byggrenovering-vest.svg`) are on the site:

| Key | Original | Used for |
|---|---|---|
| `tilbygg-for` / `tilbygg-etter` | `for.png` / `etter.png` | Before/after slider, Påbygg og tilbygg |
| `gang-for` / `gang-etter` | `gang-for.png` / `gang-etter.png` | Before/after slider, Ombygging, Oppussing og renovering |
| `firemannsbolig` | `firemannsbolig-1030x772-1.jpg` | Rehabilitering og renovering, reference photos |
| `nytt-tak` | `div5-1030x579-1.jpg` | Takarbeid, Rehabilitering og renovering |
| `minigraver-skifer` | `skifer-773x1030-1.jpg` | Rehabilitering og renovering, reference photos |
| `arbeid-over-bergen`, `arbeid-over-bergen-bred` | `Uten-navn_2023-02-22-171206_neuf.jpeg`, `1380.jpg` | Intro and Om oss. Only in the old media library: confirm with the client that it is their own photo. |

Ny bolig, Bytte dører og vinduer, Oppussing av bad, VVS and Maling have no own photos yet. They show renders of the 3D model and a visible `[MANGLER: egne prosjektbilder]`.

### Not used (needs a licence check, or excluded for design reasons)

The full list with reasons is `excludedImages` in `src/content/photos.ts`.

- **Stock (licence unknown):** `62b2d48964600ec540889872_shutterstock_1670345596.jpg`, `Flislegging.jpg`, `Ror-1024x683-1.jpg` (could be own; use only if the client confirms), `sl_013020_27540_36.jpg` and its `-scaled` copy.
- **Other companies' photos, renders and diagrams (need permission):** `baderom-medium-img.jpg`, `9993d08e-…jpeg` (three copies of a press photo of roofers), `301-havsule-1320x694-1.jpg`, `rorbu21_web-fullskjerm-desktop.jpg`, `Strengereid_kveld_DSCF8204.jpg`, `Lys_Oppdal_murstein_…jpeg`, `moderne-malt-hus.jpg`, `Moderne-hus-med-dobbelfals-rett-og-fasadeplater.jpg`, `OveSkarAS_redigert-2.jpg`, `Statsbyggintern-7.jpg`, `15224588956_dfe37221cb_o.jpg`, `vindu.jpg` (Natre), `TakInfo.jpg` and `TakInfo-1.jpg`, and the American ADU illustration with its variants (`4e09471a…jpeg`, `Skjermbilde-2024-02-19-…png`, `adu.png`, `mod.png`; replaced by our own 3D permit diagrams).
- **Clipart (excluded for design reasons, licence unknown):** the five isometric stock vectors on the old Tjenester page, the Bryggen vectors (`beer.png`, `bergen.png`, `bryggen.jpg`, `bryggen.png`, `bryggen-1.png`) and the theme overlay `slider-overlay-02-1024x457-1.png`.
- **Logo variants not used:** the variants with the old phone number «Tlf. 922 23 222» (`logo-byggrenovering.svg`, `logo-byggrenovering3.svg`, `logo-transp.png`), text-based variants that depend on a font, the draft `logo-utkast.png`, and `iko.png` / `cropped-iko.png`.
- **Duplicate:** `1380-2.jpg`.

### Facts to confirm with the client

`contentNotes` in `src/content/site.ts` lists oddities in the imported text and how the copy handles them, for example the BVN wet-room approval, another company name («Mesterfag Gruppen», «Bergen Operating Group») in some texts, and job-ad wording in one reference.

## Missing facts

Every missing fact appears on the site as a visible `[MANGLER: …]` placeholder. The full list, with where each one appears, is `missingFacts` in `src/content/site.ts`.

## Permissions still needed

- Written permission to reuse text and images from byggrv.no, if we are not the client's agency.
- A licence or permission for any stock or third-party image above, if the client wants one of them back on the site.
- Any Kvalbein Korsøen Arkitektur photos. None are used; the 3D house is our own interpretation and is credited on the site.
