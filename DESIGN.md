# Bygg og Renovering Vest – design system

**Direction: "Lys papir".** The site reads like an architect's monograph: light paper pages, dark ink, very large serif headlines, thin rules and a lot of air. Only two places are dark: the **hero stage** and the **"Slik bygger vi" build sequence**. These use fjord night and slate, in a blue-hour mood. The site is restrained, Nordic and material, and it is never colourful.

Tokens live in `src/app/globals.css` (Tailwind v4 `@theme`). Never write a raw hex value in a component. If a colour is missing, add a token and note it here.

---

## 1. Colour

### Prompt tokens

| Token (Tailwind) | Role in brief | Hex | Use |
|---|---|---|---|
| `night` (`bg`) | fjord night | `#0E1416` | Hero and build stage backgrounds. Text colour on brass/snow buttons. |
| `slate` (`surface`) | slate | `#1A2226` | Panels and controls on dark stages. |
| `snow` | text | `#F2EFE9` | Text on dark (16.2:1 on night). |
| `mist` (`muted`) | mist | `#9BA5A3` | Secondary text **on dark only** (7.4:1 on night, 6.4:1 on slate). |
| `oak` (`wood`) | oak | `#B08B5E` | Wood in renders, large decorative type on light, text on dark (5.9:1). |
| `brass` (`accent`) | brass | `#C9A86A` | Sparingly: focus ring on dark, one accent button per dark view, selection. |
| `paper` | light section bg | `#EDE8DF` | Default page background. |

### Derived tokens (tints and shades, AA-checked)

| Token | Hex | Contrast | Use |
|---|---|---|---|
| `chalk` | `#F7F5F0` | | Near-white surface: cards, form fields, alternate bands. |
| `paper-deep` | `#E3DDD1` | | Deeper band (footer), image placeholders. |
| `ink` | `#161C1E` | 14.1:1 on paper | All text on light. |
| `ink-soft` | `#4D5654` | 6.2:1 on paper, 5.6:1 on paper-deep | Secondary text on light. |
| `oak-deep` | `#7A5933` | 5.2:1 on paper | Wood-toned text, icons and links on light. |
| `brass-deep` | `#765C29` | 5.2:1 on paper | Brass-toned text and icons on light. |
| `rule` | `#D3CCBF` | decorative | Hairlines on light. |
| `rule-strong` | `#6F7774` | 3.8:1 on paper | UI borders on light, such as inputs and outline buttons (WCAG 1.4.11). |
| `rule-night` | `#2A3437` | decorative | Hairlines on dark. |
| `rule-night-strong` | `#6B7775` | ≥3:1 on night and slate | UI borders on dark. |
| `error` | `#8E3B23` | 6.2:1 on paper | Form errors on light. Always shown with an icon and text, never colour alone. |
| `error-night` | `#E59A7E` | 8.2:1 on night | Form errors on dark. |

**These pairs fail AA for body text and must not be used for it:** oak, brass, mist or rule on paper, chalk or paper-deep. Use them for large decorative type (≥ 24px regular), lines and illustration only. On light backgrounds use `oak-deep` or `brass-deep` instead.

Tailwind's default palette is removed (`--color-*: initial`), so classes like `bg-white` or `text-gray-500` generate nothing. Use `chalk` and `ink-soft`.

### Tones (tone-aware tokens)

Every band sets a tone. Children then use **semantic** classes that adapt automatically.

```tsx
<Section tone="paper | chalk | paper-deep | night | slate">
```

| Semantic class | On light tones | On night/slate |
|---|---|---|
| `bg-tone` | the band colour | the band colour |
| `text-fg` | ink | snow |
| `text-fg-muted` | ink-soft | mist |
| `text-fg-accent` / `bg-fg-accent` | oak-deep | brass |
| `border-line` / `bg-line` | rule | rule-night |
| `border-line-strong` | rule-strong | rule-night-strong |
| `outline-focus` | ink | brass |
| `text-danger` | error | error-night |

`[data-tone]` also paints the background and sets `color-scheme`. Add `data-tone-transparent` to keep a tone's text colours over an image without painting a background.

---

## 2. Typography

| Family | Package | Use | Why |
|---|---|---|---|
| **Newsreader** (variable; shipped trimmed to opsz 20–72, wght 300–400 in `src/fonts/`) | `@fontsource-variable/newsreader` | All headings (`font-display`) | Its optical-size axis turns into a sharp, high-contrast display cut at large sizes, close to the serifs in architecture monographs. At small sizes it stays sturdy. `font-optical-sizing: auto` maps opsz to the font size, so no manual settings are needed. |
| **Schibsted Grotesk** (variable; shipped trimmed to wght 400–600 in `src/fonts/`) | `@fontsource-variable/schibsted-grotesk` | Body, UI, labels (`font-sans`) | A clean, slightly warm grotesk, originally drawn for the Norwegian media group Schibsted. It has good æ ø å, is clear at 15–17px, and is not one of the usual template defaults. |

Both fonts are loaded with `next/font/local` straight from the npm packages (see `src/lib/fonts.ts`). They are self-hosted and preloaded, use a metric-matched fallback, load only the Latin subset, and make no Google Fonts requests at runtime.

### Scale (fluid, 390px → 1440px+)

| Utility | Size | Line height / tracking | Use |
|---|---|---|---|
| `t-display-xl` | 52 → 156px | 0.90 / −0.035em, wght 300 | Hero headline only. |
| `t-display-l` | 42 → 108px | 0.95 / −0.03em | Section openings. |
| `t-display-m` | 33 → 70px | 1.0 / −0.025em | Page titles, large card titles. |
| `t-display-s` | 26 → 42px | 1.08 / −0.018em, wght 350 | Sub-headings, step titles. |
| `t-title` | 20 → 25px | 1.25, Grotesk 500 | Small headings in UI and lists. |
| `t-lead` | 18 → 22px | 1.5 | Ledes under headings. |
| `t-body` | 16 → 17px | 1.65 | Running text (default on `<body>`). |
| `t-small` | 15px | 1.55 | Meta, buttons, nav. |
| `t-caption` | 13px | 1.45 | Captions, credits, image notes. |

The raw sizes also exist as `text-display-xl` and so on, if you need to combine them with other font settings.

Rules:

- Headings use `text-wrap: balance`; paragraphs use `pretty`. Running text is at most `max-w-prose` (40rem) wide.
- The display face appears only in headings and very large statements, never in buttons or labels.
- **No mono font. No ALL-CAPS spec labels.** Labels are sentence case in Grotesk.
- No italics in display type (the italic is not loaded).
- Numbers that are information, like phone numbers, are fine. Decorative numerals are not (see § 7).

---

## 3. Layout, grid, spacing

- **Frame:** `container-page`: max 1440px (`max-w-page` = 90rem) with fluid side gutters `px-gutter` (16px on phones up to 48px). `container-wide` (112rem) is for full-bleed media rows.
- **Grid:** `grid-page`: 4 columns on phones, 8 from `md`, 12 from `lg`, with gap = gutter. Typical splits:
  - heading 7 columns and lede 4 columns, starting at column 9
  - media 7 columns and text 4 columns
- **Vertical rhythm:** `py-section` (88 → 192px) between bands, and `py-section-sm` for compact bands. Inside a band, use Tailwind's own spacing scale.
- **Header offset:** the header is fixed and `--header-h` tall (64px, or 76px from `lg`). A page that doesn't open with a dark full-bleed stage adds `pt-header`.
- **Mobile action bar:** below `lg`, `<body>` is already padded by `--actionbar-h` plus the safe area.
- **Hairlines** instead of boxes: `<Hairline />` or `border-line`. Cards rarely need a fill. When one does, use `bg-chalk` with no shadow.
- **Radii:** architectural. Use `rounded-none` (default), `rounded-xs` (1px) or `rounded-sm` (2px). `rounded-full` is only for circular handles and the cursor ring. No pill buttons.
- **Shadows:** none. Depth comes from tone changes and imagery.
- **z-layers (CSS vars):** `z-(--z-raised)` 10, `--z-sticky` 30, `--z-header` 40, `--z-actionbar` 45, `--z-overlay` 60, `--z-menu` 70, `--z-toast` 80, `--z-cursor` 90, `--z-skip` 100.
- No horizontal scroll at any width. `body` has `overflow-x: clip`, and headings wrap long compounds on phones.

---

## 4. Motion

Motion is slow and weighty. It glides and settles, and it never bounces, overshoots or springs.

| Token | Value | Use |
|---|---|---|
| `ease-weight` | `cubic-bezier(.22,.61,.36,1)` | Colour, opacity and small UI moves. |
| `ease-expo` | `cubic-bezier(.16,1,.3,1)` | Reveals, curtains, big moves. |
| `ease-glide` | `cubic-bezier(.65,0,.35,1)` | Symmetric state changes (toggles). |
| `--dur-fast/base/slow/slower` | 200 / 450 / 900 / 1400ms | `duration-(--dur-slow)` |
| GSAP (`@/lib/motion`) | `EASE.weight` = power3.out, `EASE.expo` = expo.out, `EASE.glide` = power2.inOut, `EASE.scrub` = none | Never `back`, `elastic` or `bounce`. |

- **Smooth scroll:** Lenis runs on the GSAP ticker and is synced with ScrollTrigger (`SmoothScroll` provider). Touch devices keep native scrolling. Hash links are handled. `useLenis()` returns the instance, so you can call `lenis.stop()` while the menu is open. Mark inner scroll areas with `data-lenis-prevent`.
- **Reveals:** add attributes, not JS: `data-reveal="text|up|fade|draw|media"`, plus optional `data-reveal-immediate` and `style={{"--reveal-delay":"120ms"}}`. You can also use `<RevealText>`, `<Reveal>` or `<Hairline draw>`. A single global observer handles them all.
- **Reduced motion** (`prefers-reduced-motion: reduce`):
  - Lenis is off, and every reveal shows immediately.
  - Transitions are near-instant.
  - The build sequence becomes a stepped gallery of renders.
  - The hero shows the poster only.
- **No JS:** hidden pre-reveal states only apply under `html.js`, so nothing is ever stuck invisible.
- **Cursor:** a thin trailing ring, only on fine pointers. It never hides the native cursor.
- **Magnetic buttons:** only on fine pointers without reduced motion. Everywhere else they are plain buttons.
- **Hero LCP:** don't hide the LCP poster image behind an animation. Text reveals on the hero use `immediate`.

---

## 5. Imagery

- **No client photos are available yet** (byggrv.no could not be reached). Every image is a **render of our own 3D model**, never a fake photo, or a visible `[MANGLER: …]` placeholder (`<MissingImage>`).
- Renders come from `src/content/renders.ts`, a manifest generated by the MODEL agent. Render them with `<Picture asset={renders[key]} sizes={SIZES.half} />`, which outputs AVIF and WebP with width and height set.
- Before/after sliders use pairs of renders. Each one is labelled "Illustrasjon fra vår 3D-modell, ikke foto" and shows `[MANGLER: egne før- og etterbilder]`.
- The reference house is always credited: **"Arkitekttegnet referanse – slik ville vi bygget den"** and **"Arkitektur: Kvalbein Korsøen Arkitektur"**, with the note that the model is our interpretation and that the house was not built by Bygg og Renovering Vest (`referenceHouse` in `@/content`). Do not use Kvalbein Korsøen photos.
- Client photos go into `public/images/byggrv/` (see README), keeping the same `RenderAsset` shape.
- Alt text is always in Norwegian and describes what is shown. Use `alt=""` only for purely decorative images.
- Text over images needs a solid night panel or a scrim made from `night/70` or darker. Check it at 390px.
- Colour grading: blue-hour renders are cool night with warm interior light (oak/brass). Day renders are soft overcast Bergen light. No saturated skies.

---

## 6. Components (`@/components/ui`)

| Primitive | Purpose |
|---|---|
| `Section`, `SectionHeader` | Toned band plus container; monograph heading with lede (no eyebrow, no number). |
| `Container` | `page`, `wide` or `full` frame. |
| `RevealText`, `Reveal` | Word-by-word heading rise, and block reveals (server components). |
| `Hairline` | 1px rule; can draw in on scroll. |
| `MagneticButton`, `buttonClasses()` | CTA in the variants `solid`, `outline`, `ghost` and `accent` (brass, dark only, once per view). |
| `SmartLink` | Picks next/link, `tel:`, `mailto:` or an external link with a new-tab notice. |
| `BeforeAfter` | Accessible comparison slider (role="slider", keyboard, touch-friendly). |
| `Picture` | AVIF + WebP `<picture>` for manifest assets. |
| `Missing`, `TextWithMissing`, `MissingImage` | Visible `[MANGLER: …]` placeholders. |
| `Icon.*` | Thin line icons (arrow, phone, mail, map pin, layers, plan, sun, moon, gable mark …). |
| `JsonLd` | Structured data script. |
| `Cursor` | Trailing ring (mounted once in the layout). |

Focus is a 2px outline in `--tone-focus` (ink on light, brass on dark) with a 3px offset. Never remove it without a visible replacement. Touch targets are at least 44px for primary actions.

---

## 7. Do / Don't

**Do**
- Use generous whitespace, very large type, thin rules, and full-bleed renders.
- Show order with semantic `<ol>`, a progress rail with **step names**, and connecting hairlines.
- Write short, concrete sentences in bokmål with "du" and "vi". Every claim must trace back to the client facts.
- Show a visible `[MANGLER: …]` wherever a fact is missing.

**Don't**
- **No decorative numbering.** No "01 / 02 / 03" on services, process, build steps or nav. No "Steg 3 av 11" counters and no big index numerals.
- No eyebrow labels above headings. No mono or caps "spec" text. No pill tags.
- No em-dash-heavy copy, no buzzword triplets, no clichés ("kvalitet i alle ledd").
- No colourful accents, gradients, glows or shadows. Brass appears at most once per view.
- No invented numbers, years, reviews, awards, certifications, team names or guarantee terms.
- No CDN scripts, tracking, Google Fonts or map embeds.
