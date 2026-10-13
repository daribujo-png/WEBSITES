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

byggrv.no could not be reached when the site was built, so it has no client photos yet. Until they arrive, every image is a render of our own 3D model or a visible `[MANGLER: …]` placeholder.

To add photos:

1. Put the original files in `public/images/byggrv/`. Keep the original filenames, and note which byggrv.no page each one came from.
2. Convert them to AVIF and WebP in responsive widths (480/960/1600/2400), using the same shape as `RenderAsset` in `src/lib/images.ts`.
3. Swap the `MissingImage` placeholders for `<Picture asset={…} />`.

## Missing facts

Every missing fact appears on the site as a visible `[MANGLER: …]` placeholder. The full list, with where each one appears, is `missingFacts` in `src/content/site.ts`.

## Permissions still needed

- Written permission to reuse text and images from byggrv.no, if we are not the client's agency.
- Any Kvalbein Korsøen Arkitektur photos. None are used; the 3D house is our own interpretation and is credited on the site.
