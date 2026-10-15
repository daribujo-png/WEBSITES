# Direction: Adria hero, "Fra tegning til hus"

Creative direction for the next round of byggrv.no (branch `claude/byggrv-redesign-e1scwk`).
**Revision 2 (UPDATE 2).** This version adds the supplier's three roof types (saltak, flatt tak,
pulttak), the four official Boligpartner images, a second matched camera (the entrance side) and the
data-driven "Husmodeller vi bygger" showcase. It supersedes revision 1 wherever they differ.

It replaces the Kvalbein Korsøen reference house, the blue-hour hero and the separate
"Slik bygger vi" section. Read it together with `DESIGN.md` (tokens, type, rules) and `HANDOFF.md`
(client decisions). Where this file and `DESIGN.md` disagree, this file wins, and the implementer
updates `DESIGN.md` (section 9).

Client brief for this round, in one line: lead with nybygg, tilbygg, påbygg and tak; build the
Adria house and its garden from the photo; use the photo itself; show the house models Bygg RV
builds; make the hero feel alive and unlike anything else on the market, without looking AI-made.

**Design principle for the whole hero: the photo carries realism, the 3D carries construction and
choice.** The supplier render is photoreal; our WebGL twin will never fully match it. So the twin is
only on screen in full colour while it is *doing* something (building, turning, changing roof), and
every rest state lands on a real photo where one exists. That is how the hero can be both honest and
jaw-dropping.

## 0. Decisions at a glance

| Topic | Decision |
|---|---|
| Signature concept | **"Fra tegning til hus."** The page opens on the real Adria photo, mounted as a plate on paper. The photo dissolves into its exact 3D twin. The twin turns into a white paper model and sinks into the page, a pen draws the house in ink straight onto the paper, the lines become timber, and the house and garden build up until they land on the photo again. On scroll the plate opens up into the full world, which is bigger than the picture. In the finale the visitor changes the roof and walks around the house, and wherever Boligpartner has a photo of that exact view and roof, the model lands on the photo again. |
| Hero mood | Daylight, matched to the photo. No blue hour, no day/evening toggle. The hero is on paper (light), not on a dark stage. |
| Hero structure | One pinned section, one WebGL context: intro plate and timelapse (8.3 s desktop, 6.4 s phone), then 5 build steps, then the finale with **Saltak / Flatt tak / Pulttak**, a secondary **Se inn** toggle, and two sides (**Hagen / Innkjørselen**). A paper curtain releases into the page. `#slik-bygger-vi` sits on the build part. |
| Photo landings | Hagen + Saltak = Boligpartner image 1. Hagen + Flatt tak = image 2 (same camera). Innkjørselen + Pulttak = image 3. Every other combination stays 3D, captioned "3D-modell". |
| Positioning | The hero and the first section sell nybygg, tilbygg og påbygg, and tak. Sprenging, grunnarbeid, VVS, elektro, maling and mur appear only in "Alle fagene i eget firma" lower down and on `/tjenester/`. |
| Home order | Hero → Dette bygger vi → Jobber vi har gjort (references) → Husmodeller vi bygger → Fra første samtale til overlevering → Alle fagene i eget firma → photo interlude → Om oss → Kontakt. |
| Husmodeller | New data file `src/content/house-models.ts`, home section `#husmodeller`, routes `/husmodeller/` and `/husmodeller/[slug]/`. Launched with Adria only. No invented models. |
| References | "Prosjektark": three typographic project sheets on a dark night band, loose-sheet parallax, own photos as separate plates between them, and an honest line saying the photos are from other jobs. |
| Dark band | The hero is light now. The single dark band on home is the references band (fjord night). |
| Motion system | Six named behaviours: Pust, Strek, Gardin, Lodd, Blikk, Vær (section 5). |
| Rights | Boligpartner images are shown **as supplied** (resized and cropped only, never graded or retouched), always with "Bilde: Boligpartner" and the visible `[MANGLER: bekreft avtale med Boligpartner om bruk av husmodell og bilder]`. The elevation drawings are never published. One content flag swaps every supplier image for our own renders (2.10). |
| Model contract | `public/models/house.glb` (high) and `house-lite.glb` (lite) of Adria, the runtime's existing 11 layer names, roof suffixes `__saltak` / `__flatt` / `__pulttak`, plus `__ceiling` for Se inn (1.13). |
| Old house | Removed from the whole site. All renders (hero, steps, `svc-*`, `ba-*`, OG image) are re-rendered from Adria, and every Kvalbein Korsøen credit goes. |

### 0.1 What the current site gets wrong (seen at 1440 and 390, build of commit `a65b929`)

Screenshots: `/tmp/claude-0/-home-user-WEBSITES/b52489a3-dfad-5be2-b7ef-4b1d7307930f/scratchpad/adria-run/direction/shots2/` (top and full page) and the
per-section sheets `.../direction/m1440-sheet.png`, `m390-sheet.png`.

1. **First 2 seconds:** a dark blue-hour hero with a generic headline ("Vi bygger hele huset."), a
   brass button and a sub that opens with "Fra sprenging og grunnmur". The eye goes to the toy-like
   blob trees, not the house. Positioning is wrong in the first sentence.
2. The phone and e-mail appear twice in the first viewport (header and hero row).
3. "Slik bygger vi" is 9,857 px of the 23,370 px page at 1440 (42 %): eleven near-identical dark
   blocks with x-ray glow lines. It is the main reason the page feels long and machine-made.
4. "Alt under ett tak" is a three-up claim row, the classic template tell.
5. References are three identical columns of meta lists with `[MANGLER]` tags: a card grid with no photos.
6. Every section header is "title left, lede right". There is no rhythm.

What works and stays: the Newsreader/Schibsted type pairing, the paper palette, hairlines, the
before/after sliders with real photos, the service index list, the contact form.

### 0.2 Sources

| File | What | Published? |
|---|---|---|
| `content-import/adria/orig/adria-saltak-hage.jpg` (= scratch `orig/adria-orig-1.jpg`) | Saltak, garden side, 1920 × 1080 | Yes, with credit |
| `content-import/adria/orig/adria-flatt-tak-hage.jpg` (= `orig-2`) | Flatt tak, garden side, **pixel-identical camera** to image 1 | Yes, with credit |
| `content-import/adria/orig/adria-pulttak-innkjorsel.jpg` (= `orig-3`) | Pulttak, entrance and driveway side, with carport, car and pines | Yes, with credit |
| `content-import/adria/orig/adria-flatt-tak-naer.jpg` (= `orig-4`) | Flatt tak, garden side, closer and lower | Yes, with credit (Husmodeller only) |
| `content-import/adria/4k/*` | EDSR ×2 upscales, 3840 × 2160, if present | Only as the source for 2560/3840 web widths |
| `content-import/adria/tegninger/*` | Elevations: langside (garden), inngang, gavl a/b (pulttak variant) | **Never.** Modelling reference only. |
| boligpartner.no/ferdighus/moderne/adria | Facts: ca. 159 m² BRA-i, 4 soverom, 2 bad, energimerking B, flat tomt, three roof types, passer godt på smale tomter | Facts only, cited "Husmodell Adria fra Boligpartner". No marketing claims, no prices. |

The images contain rendered people (a family at the grill, a couple on the terrace). The 3D twin never
has people; they appear and disappear with the photo, which reads as intended.

---

## 1. Adria model spec (for the modeller)

### 1.1 How the dimensions were derived, and the cross-check

**Scale.** All four elevations are screenshots at the same drawing scale. Three independent checks agree:

1. The garden-side ground-floor door and the entrance door measure 57.5 × 124 px. That is the
   standard 10 × 21 module (1.0 × 2.1 m outer frame), so the scale is **≈ 58.7 px/m**.
2. The vertical cladding lines on the garden elevation repeat every 7.3 px (124 boards across the
   facade). At 58.7 px/m that is a c/c of about 125 mm, which is right for 19 × 148 mm standing boards.
3. The camera fitted to image 1 (1.14) puts the eaves at +6.03 m, and the drawings give 5.8 to 6.1 m
   for the low side of the pulttak.

**Results.** The long side is 913 px, which gives **15.60 m**. The gable is 458 px, which gives
**7.80 m**. Floor to floor is 178 px, which gives **3.05 m**. The pulttak high side is +7.45, the low
side +5.95: a rise of 1.5 m over 7.8 m, so the pulttak pitch is **10.9°**. The camera fit to image 3
independently gives **10.8°**. The saltak pitch is not in the drawings; the camera fit to image 1 gives
**34°** (ridge +8.67). The flatt tak parapet, back-projected from image 2, is at **+7.33**, the same
height as the pulttak high side (the drawing gives +7.36).

**Cross-check against the supplier's area.** Gross footprint 15.60 × 7.80 = 121.7 m². Less the east
loggia R1 (1.97 × 7.80 = 15.4 m²) and the west loggia R2 (4.45 × 2.30 = 10.2 m²) leaves 96.1 m²
enclosed per floor. With 0.35 m outer walls (perimeter 42.9 m, 15.0 m²) that is 81.1 m² inside per
floor, and 2 × 81.1 − 3 m² stair void ≈ **159 m²**: exactly Boligpartner's "ca. 159 m² BRA-i". The
dimensions stand.

**Which source wins.** The drawings win on plan positions. The photos win on everything you can see in
them, per variant: image 1 for saltak, image 2 for flatt tak, image 3 for pulttak (entrance side), the
garden-side drawing for pulttak's garden face. Railings are glass (all photos), not the balusters in
the drawings.

### 1.2 Coordinate system and levels

Metres, y up. The origin is the centre of the main volume's outer cladding footprint at
ground-floor finished floor level (FFL ±0.00).
**+x = east** (the recessed R1 gable). **+z = south**, the garden side images 1, 2 and 4 look at.
**−z = north**, the entrance side image 3 looks at.

| Level | y (m) |
|---|---|
| Terrain at the house (lawn at the deck edge) | −0.35 |
| Plinth band (dark grey render, visible 0.30) | −0.35 … −0.05 |
| Deck top, entrance landing top | −0.05 |
| Ground FFL | ±0.00 |
| Upper FFL | +3.05 |
| **Shared wall top (all variants)** | **+5.90** |
| Saltak eaves (wall top under the roof) | +6.03 |
| Saltak ridge, outer roof surface at the verge | +8.67 (34°, roof build-up 0.30) |
| Saltak chimney top | +9.65 |
| Flatt tak parapet top (coping) | +7.35 |
| Flatt tak membrane (hidden behind the parapet) | +7.05 |
| Flatt tak flue top | +8.20 |
| Pulttak low edge (north, entrance side) | +5.95 |
| Pulttak high edge (south, garden side) | +7.45 |
| Pulttak chimney top | +7.60 |

Chimney position in plan, all variants: **x = +5.30, z = −0.20** (both photo fits agree within 0.1 m).

### 1.3 Volumes

The house reads as **a warm timber frame with dark recesses cut into it**. The outer volume
(15.60 × 7.80 m, two storeys) is clad in natural wood. Two recesses go through both storeys and are
lined in charcoal:

- **R1, east loggia** (the framed gable in images 1, 2 and 3): x ∈ [+5.83, +7.80], the full gable width.
  - The recess back wall is at x = +5.83, so the loggia is 1.97 m deep including the frame.
  - It opens to the east between frame columns, z ∈ [−3.48, +3.47] (6.95 m). Columns are 0.42 × 0.42.
  - It also opens on the garden face, x ∈ [+5.83, +7.38]. The corner column is x ∈ [+7.38, +7.80].
  - The north face is closed. On the ground floor it has a recessed wood door (N4, 1.5).
  - Upper floor: a covered balcony, floor at +3.05, glass railing 1.00 m high along both open sides.
  - Ground floor: a covered terrace at deck level.
  - The **frame** is a 0.42 m natural-wood band around the gable opening. Its top follows the roof
    variant: a triangle under the saltak verge (charcoal triangular soffit inside), a straight band in
    flatt tak (opening top +6.18), a sloped band in pulttak (opening top 1.0 m below the roof edge,
    parallel to it). This frame is the house's signature; get it exactly right in all three.
- **R2, west loggia** (garden side, west end): x ∈ [−7.41, −2.96] (4.45 m), z ∈ [+1.60, +3.90] (2.30 m deep).
  - It opens to the garden and to the west, z ∈ [+1.60, +3.49]. The corner column is
    x ∈ [−7.80, −7.41] × z ∈ [+3.49, +3.90].
  - Upper floor: a loggia with a glass railing (1.00 m). Ground floor: a covered porch.

### 1.4 Cladding zones

| Zone | Material |
|---|---|
| Every outer face of the main volume, the R1 frame and all column faces | Natural wood (`cladding_wood`) |
| Every face inside R1 and R2: back walls, side walls, soffits | Charcoal (`cladding_charcoal`) |
| Garden face, upper: panel x ∈ [−1.02, +0.91], from upper FFL to the U4 head of the variant | Charcoal |
| Garden face, ground: panel x ∈ [+2.95, +3.95], 0.00 … +2.12 | Charcoal |
| Plinth | Dark grey render |

The north facade looks darker in image 3 only because it is in shade. It is the same wood.

Both claddings are standing boards at a 125 mm module with a visible shadow gap. For the gap, use
geometry relief on the high model, or a tiling normal map. Give every board its own tone through
vertex colour: ±7 % value and ±3° hue for wood, ±3 % for charcoal.

### 1.5 Window and door schedule

All frames are slim anthracite: 60 mm face, 40 mm mullions. Glass is set 90 mm back from the cladding
face, with a 40 mm reveal trim in anthracite. Heights are relative to that storey's FFL unless they
start with "+", which means absolute y.

**Garden face (z = +3.90)**, west to east

| Id | Storey | x range | Size / heights | Notes |
|---|---|---|---|---|
| G1 | ground | in R2, on the back wall z = +1.60: door x [−6.76, −5.84], fixed glass x [−5.60, −4.60] | head 2.12 | porch entrance |
| G2 | ground | [−1.85, −1.02] | 0.00 – 2.12, transom at 1.35 | tall window |
| G3 | ground | [−0.87, +2.61] | 0.00 – 2.12, two sliding panels | opens under the pergola |
| G5 | ground | [+3.95, +4.81] | 0.00 – 2.12 | next to the charcoal panel |
| G6 | ground | [+5.83, +7.38] | open | side opening of R1 |
| U1 | upper | in R2, on the back wall: door x [−6.76, −5.86], window x [−5.80, −4.68] | head 2.60, top light 2.12 – 2.60 | loggia access |
| U2 | upper | [−1.91, −1.02] | from 0.00, two panes; head per variant (below) | narrow stack |
| U4 | upper | [+0.91, +4.81] | panes [0.91–2.36], [2.36–3.81], [3.81–4.81]; head and transom per variant | the big window block |
| U6 | upper | [+5.83, +7.38] | open, glass railing | side opening of R1 |

**Variant-specific heads on the garden face** (absolute y). Model the top part of these openings, their
head trims and the cladding above them as variant nodes (1.13); everything below +5.20 is shared.

| Opening | Saltak (image 1) | Flatt tak (image 2) | Pulttak (garden drawing) |
|---|---|---|---|
| U4 and U2 head | +5.79 | +6.30, transom at +5.50 across all panes | +5.96, transom at +5.23 |
| R2 opening top | +5.68 | +6.08 | +6.39 |
| R1 garden opening top | follows the triangular soffit | +6.18 | sloped, 1.0 below the roof edge |
| Wall top | eaves +6.03 | parapet +7.35 | +7.45 |

**Entrance face (z = −3.90)**, confirmed by the inngang drawing and image 3

| Id | Storey | x range | Size / heights | Notes |
|---|---|---|---|---|
| N1 | both | [+1.33, +2.23] | ground 0.00 – 2.15; upper 0.07 – 2.15, two panes each | window stack (image 3 fit: lands within 3 px) |
| N2 | ground | [−2.68, −1.35] | head 2.13 | door 0.90 plus a 0.40 sidelight. The leaf has three small square lights stacked vertically. |
| N3 | upper | [−2.22, −1.31] | 0.07 – 2.15 | above the door |
| N4 | ground | [+5.87, +7.37] | 0.00 – 2.40 | flush door clad in natural wood, recessed 0.20, at the north end of R1 (storage) |
| — | ground | x ≈ +0.50, y ≈ +2.3 | 0.25 × 0.25 | vent grille |
| — | ground | x [−0.30, +0.20], 0 … 1.30, 0.35 deep, standing 0.10 off the wall | | grey technical cabinet |

Entrance canopy (image 3 wins over the drawing): a **glass** plate 0.90 deep, x [−2.75, −1.30],
underside +2.40, held by **two** diagonal black steel rods back to the wall at +3.05.
Entrance landing: x [−3.36, −0.72], 1.20 deep, top −0.05, dark concrete, one step.

**West gable (x = −7.80)**

| Id | Storey | z range | Size / heights | Notes |
|---|---|---|---|---|
| W1 | both | [−1.60, −0.73] | ground 0.00 – 2.13; upper 0.00 – 2.40, two panes each | window stack |
| — | both | [+1.60, +3.49] | open | side opening of R2 |

**East gable, recessed wall (x = +5.83)**

| Id | Storey | z range | Size / heights | Notes |
|---|---|---|---|---|
| E1 | ground | [+0.75, +2.67] and [−2.88, −0.96] | head 2.12 | two pairs of glazed double doors to the covered terrace |
| E2 | upper | [−1.20, +1.20] | from FFL up; top per variant: into the saltak apex (triangular, 3 mullions), level at +6.10 in flatt tak, sloped in pulttak | the tall gable glazing |
| E3 | upper | [+1.60, +2.50] | head 2.40 | door to the balcony |

The rest of the recessed wall is charcoal with two black wall lights.

Wall lights: small black cube sconces (0.12 × 0.20 × 0.10). Positions: either side of G3 at +2.4,
beside U4 at +4.3, beside the R1 openings, and beside N2.

### 1.6 Roof variants

Each variant is its own set of suffixed nodes so the switcher can lift one away and settle another
(2.6). A variant contains its rafters, sarking, roofing, fascia or coping, gutters, downpipes, chimney,
the wall band above +5.90, the variant-specific opening heads (1.5) and the R1 frame top.

| | Saltak (image 1) | Flatt tak (images 2, 4) | Pulttak (image 3, drawings) |
|---|---|---|---|
| Pitch | 34° (keep within 33–36° while camera-matching) | 0° visible (membrane at 1:40 behind the parapet) | 10.9° |
| Top line | Ridge along x at z = 0, +8.67 | Parapet +7.35 all round | Low edge north +5.95, high edge south +7.45 |
| Overhangs | Eaves 0.30 on the long sides; verge 0.10 (the R1 frame sits flush under it) | None. The cladding runs up to a 0.06 black coping | 0.15 all round |
| Roofing | Dark concrete tiles in courses every 0.34 m along the slope, two rows of roof hooks, slight sheen | Dark grey membrane; two roof drains; seen only from high cameras | Dark standing-seam steel, seams every 0.50 m |
| Edges | Black fascia 0.20, black half-round gutters, downpipes at the four corners | Black coping 0.06 × 0.40 wide; one downpipe at the NW corner | Black 0.25 fascia on all sides, gutter and downpipes on the north side |
| Walls added by the variant | +5.90 → +6.03 band, gable triangles (wood on the west gable; the R1 frame plus charcoal soffit on the east) | +5.90 → +7.35 band on all four faces | Sloped band, +5.95 north → +7.45 south, with trapezoid gable infills |
| Chimney | Stainless flue Ø 0.20 with a 0.30 rain cap and a base flashing cone, top +9.65 | Same flue, top +8.20 | Same flue, top +7.60 |
| Ceiling (`__ceiling`) | Upper-floor ceiling under the rafters | Flat ceiling at +6.45 | Sloped ceiling following the roof |

### 1.7 Pergola, deck and outdoor fittings

- **Pergola** (black steel), x ∈ [−2.20, +2.95], z ∈ [+3.90, +6.90].
  - Three posts, 100 × 100, at the front edge: x = −2.20, +0.35, +2.95.
  - Front beam 100 × 250; top +2.80, underside +2.55.
  - Open rafters, 60 × 200 at c/c 0.60, running from a wall ledger to the beam and projecting 0.15
    past it. Their shadows on the facade are part of the look.
- **Deck** (dark brown wood, 120 mm boards with gaps), top −0.05.
  - Garden deck: x [−7.80, +7.80], z [+3.90, +7.40].
  - East deck: x [+7.80, +13.50], z [−4.50, +7.40].
  - Two steps down to the lawn along the south edge.
- **Planter in front of the deck**: black steel box, 0.45 high, x [+0.80, +6.00], z [+7.40, +8.40],
  planted with lavender and ornamental grass.
- **Outdoor furniture**
  - Under the pergola: oak dining table 2.40 × 0.95 with eight black chairs, and a black bar table
    with two stools at the west post.
  - On the deck: a black kettle grill cabinet (1.2 × 0.6 × 1.15) at about (+1.6, +7.0).
  - East deck: a three-seat sofa, two armchairs, an ottoman and a coffee table (white cushions, black
    frames), around (+10, −2) to (+12, +2), plus three round anthracite planters (Ø 0.6) with bushes.
  - R1 upper balcony: two lounge chairs, a small table and black pots with plants.
  - R1 covered terrace (seen from the entrance side, image 3): a sofa, two armchairs and a round table.
- **No people, no car.**

### 1.8 Outbuilding, entrance side, and what is not modelled

**Outbuilding (pool house)**, image 1, west of the house and slightly in front of it. Centre ≈ (−16, ·, +7);
long axis along x; front facing +z.

- An enclosed box, 4.0 (x) × 3.5 (z) × 3.4 m high, at the west end.
- A flat-roofed canopy running east from it to x ≈ −10. The roof edge is at +2.7 with a 0.25 black
  fascia, on three posts.
- A horizontal-slat screen along the back. Slats are 45 mm with 60 mm gaps.
- A raised platform under the canopy with two lounge chairs, a low table and a black planter.
- Its depth is poorly conditioned. Place it by overlay: its left edge must land at image-1 x ≈ 92 and
  its canopy's right end at x ≈ 488 (1920 px frame).

**Entrance side** (image 3), lean: a paved driveway in grey concrete pavers from the north-east
towards N2 (about x [+2, +24], z [−4.5, −9]), a curb and a strip of asphalt road beyond it, two low
clipped hedges either side of the drive, a few low shrubs under N1, and the R1 terrace furniture.

**Not modelled, on purpose:** people, the car, the separate carport and the tall pines of image 3.
The two supplier renders are different scenes; the pines and carport would stand where image 1 shows
open sky. The world is built to agree with image 1. When the camera lands on image 3, the photo's own
carport, car and pines arrive with the photo dissolve, which reads as the reveal of reality.

### 1.9 Upper-floor interior (seen in "Se inn")

Boligpartner gives 4 soverom and 2 bad. We do not have the plan, so the interior is **our illustration**,
consistent with those numbers: three bedrooms and one bathroom upstairs, the fourth bedroom and the
second bathroom downstairs. Simple, warm and furnished like a good interior magazine, not a showroom.
Partitions are 0.10 m. Wall tops are cut at +2.50 above upper FFL. Their **cut faces are ink #161C1E**,
which gives a crisp plan-drawing look from above and echoes the drawing concept.

| Room (upper floor) | Extent (x; z) | Contents |
|---|---|---|
| Main bedroom (northwest) | [−7.60, −3.00]; [−3.70, +1.50] | 180 bed with linen, two side tables, a wardrobe wall. Door to the R2 loggia in the wall at z = +1.60. |
| Bathroom | [−3.00, −0.40]; [−3.70, −0.90] | Freestanding tub, double oak vanity, a walk-in shower with a glass screen |
| Stair and hall | stair runs along x from −0.40 to +3.00, z [−0.90, +0.10] | Oak treads, glass balustrade |
| Bedroom 2 | [+1.20, +3.60]; [−3.70, −1.00] | 120 bed, desk |
| Bedroom 3 | [+3.60, +5.63]; [−3.70, −1.00] | 120 bed, shelf |
| Allrom (south, open) | [−2.96, +5.63]; [+0.10, +3.70] | An oak table for six behind U4 (images 1 and 2 show chairs there), a bookshelf behind the charcoal panel, an armchair and floor lamp at U2, and a sofa, rug and coffee table facing E2 |

Palette: oak floor #C9AE88, walls #EEECE6, linen #DCD5C9, warm grey #8E8A84, charcoal #2E3033,
plant green #3E5233, lamps emissive #FFE2B8 (low in daylight).

The ground floor needs only what shows through the glass: a living room behind G3 (sofa, rug, a lamp),
a kitchen island, pendants, ceilings at +2.70. Merge it into one or two meshes.

### 1.10 Materials (sampled from image 1)

The *seen* column is the median sRGB colour in the photo. The *albedo* column is the base colour to
set (sRGB). Tune albedo until the twin's render matches the seen value under the day rig (1.12).
The photos are not graded (2.10), so match the original pixels.

| Material | Seen in photo | Albedo | Roughness / metalness |
|---|---|---|---|
| `cladding_wood` (natural larch/oak stain) | sun #BEA080, shade #8C6C4A | #A57E57 | 0.78 / 0 |
| `cladding_charcoal` | sun #3B3D40, recess #1D1C18 | #2C2E30 | 0.70 / 0 |
| `roof_tile` (saltak) | #464346 | #2B2A2D | 0.55 / 0 |
| `roof_steel` (pulttak) | #3A3B3E | #2A2B2D | 0.45 / 0.4 |
| `roof_membrane` (flatt tak) | | #3A3B3D | 0.85 / 0 |
| `flashing` (fascia, coping, gutters, downpipes) | #67645E (sky reflection) | #1E1F21 | 0.45 / 0.5 |
| `frame_anthracite` (windows, doors) | #524F4B | #2F3032 | 0.50 / 0.2 |
| `glass` | dark with tree reflections | #0E1214, opacity 0.35, env reflections; a dark green band at the horizon of the env (#2F3A25) imitates the reflected treeline | 0.05 / 0 |
| `glass_rail`, canopy glass | | #9FB3A8, opacity 0.18 | 0.05 / 0 |
| `steel_black` (pergola, canopy rods, posts, sconces) | #2E2B27 | #1F1E1C | 0.45 / 0.6 |
| `chimney_steel` | #868A95 | #8C9097 | 0.35 / 0.8 |
| `deck` | #524740 | #5B4A3D | 0.80 / 0 |
| `slab` (terrace stone) | sun #79716C | #56534F | 0.85 / 0 (joints 5 mm, #2B2A28) |
| `pavers` (drive) | #7C7E80 | #6E7072 | 0.90 / 0 |
| `plinth` | | #6A6864 | 0.90 / 0 |
| `lawn` | sun #838B40, far #8C9444, shade #323D18 | #6F7B35, with world-space variation between #7F8B3F and #5E6A2C | 0.95 / 0 |
| `hedge` | #434C23 | #3F4A22 | 0.90 / 0 |
| `birch_crown` / `broadleaf_crown` | #6A7147 / #51592B | #6A7147 / #4E5A2B | 0.90 / 0 |
| `birch_bark` | | #E6E2D8 with black marks in vertex colour | 0.80 / 0 |
| `cushion` | #D9D1CB | #DCD5CE | 0.95 / 0 |
| `outbuilding` | #1A1E16 | #1C1F1A | 0.80 / 0 |
| Planting | | lavender #7A6E96, grass plumes #B9B08A, white shrub blossom #E9ECE4 on #4F5B33, box/green shrubs #3F4D2A, hosta #6E8150 | |

Textures only where they earn their bytes: at most six WebP textures inside the GLB
(`EXT_texture_webp`), each 1024² or smaller (lite: 512²): a cladding groove normal map, a roof course
normal map, a lawn detail texture, a leaf-card atlas, an impostor atlas (lite), and a baked
ground-shadow/AO texture for the trees and the outbuilding, which never move. Everything else is flat
PBR plus vertex colour.

### 1.11 Garden and environment (from image 1, lean)

Positions come from back-projecting the photo with the fitted camera. Terrain heights are assumptions;
tune them in overlay.

- **Terrain.** A gentle fall from the house to the camera. Lawn at −0.35 along the deck, falling to
  −1.30 at the foreground terrace. The lawn runs from x −30 to +45 and z −33 to +28. North of the house
  the ground is level at −0.30 for the drive.
- **Foreground terrace** (dark slabs 0.6 × 1.2): about x [17, 25], z [11, 26], top −1.30. On it:
  two white loungers (black aluminium frames, backrests at the east end) around (22, 14) to (22, 21),
  a black lantern side table at ≈ (23, 14.7), and a dark slab path leading west from its south-west corner.
- **Planting beds.** All plants are instanced; each grows from its own birth time (2.3).
  - Around the foreground terrace, east and south: white spiraea, ornamental grass plumes, lavender,
    hosta and box balls.
  - In front of the deck: the steel planter.
  - A curved bed west of the deck in front of the outbuilding (image-1 x 350–610): lavender spikes,
    grass plumes, low shrubs.
- **Hedge.** About 1.8 m high and 0.9 m deep, along z ≈ −33 from x −5 to +45 (it reads to the right of
  the house in image 1).
- **Trees.** High: 14 instanced trees. Lite: 8, as impostors.
  - 6 birches with white trunks and airy crowns. Some sit near the left photo edge; one stands behind
    the house left of the right-hand trees.
  - 6 broadleaf trees: a large dark group east and north-east behind the hedge, x 18–40, z −45 to −15.
  - 2 spruces (the dark pointed tree at image-1 x ≈ 1750).
  - Crowns are leaf-card clusters with alpha hash, not displaced blobs. The old blob trees read as toys.
- **Framing foliage near the camera.** Large leaves at the right photo edge, ≈ (29.7, 0 … 2, 30.1).
  Tall grass blades and hosta at the bottom-left, ≈ (24, −1.3, 27). They exist only for the photo
  framing; dither them out when the stage expands.
- **Backdrop.** Three low-poly silhouette layers with aerial perspective (fog towards #DCE6EE), no images:
  a deciduous tree band at about 250 m, the forested hillside rising to the west (left in image 1) at
  1.5–2.5 km, and a faint far ridge. The hillside also shows behind the house in image 3, right of centre.
- **Sky.** A shader dome, no texture: gradient zenith #7FA1D2, mid #A6C5EB, horizon #EEF3F8; fbm
  cumulus clouds, white with soft blue-grey bases, roughly where image 1 has them; clouds drift
  (behaviour Vær). The same shader produces the PMREM environment once at load.

### 1.12 Light rig (day only, two sun presets)

The supplier rendered the two sides with different suns, so the rig has two presets and the finale
swings between them as the camera walks around the house.

| Preset | Matches | Direction *from* the sun | Read |
|---|---|---|---|
| `sunHage` | images 1, 2 | normalize(−0.55, 0.72, +0.42): south-west, about 46° high | garden face lit, east gable in soft shade, pergola shadows falling diagonally down to the right |
| `sunInnkjorsel` | image 3 | normalize(+0.78, 0.57, +0.26): east-south-east, about 35° high | R1 frame and east gable lit, north facade in shade |

- **Sun:** one directional light, warm white #FFF4E2.
- **Fill:** hemisphere light, sky #BBD3EE, ground #6C7040, plus IBL from the sky PMREM.
- **Tone mapping:** AgX or ACES, whichever matches the photo histogram.
- **No point lights.** Interior lamps are emissive only.
- **Shadows:** one 2048² map (1024² on lite) with a tight frustum of ±14 m around house, deck and pergola,
  updated only on change (section 8). While the sun swings in the finale orbit, update it every third
  frame on high and once at the end on lite. Trees and the outbuilding get their shadows from the baked
  ground texture.

### 1.13 File contract (matches the runtime)

Output: `public/models/house.glb` (high), `public/models/house-lite.glb` (lite), `public/models/house.meta.json`.
Keep the builder procedural and deterministic, in `scripts/model/`. The old house is replaced, not kept.

**Layers.** Keep the runtime's eleven layer group names. This is what goes in each for Adria:

| Layer | Adria contents | Hero step (2.5) |
|---|---|---|
| `layer_tomt` | site-plan lines on the lawn (footprint, setback dashes) as `fx_site`, corner pegs | Grunnmur |
| `layer_grunnarbeid` | a shallow, tidy dig with a gravel bed (flat site: **no blasted rock**) | Grunnmur |
| `layer_fundament` | ringmur/slab, plinth, radon-membrane edge | Grunnmur |
| `layer_bindingsverk` | studs, plates, joists, and the roof structure per variant (`__saltak` rafters, `__flatt` joists, `__pulttak` rafters), pale spruce #D8C29E | Reisverk |
| `layer_isolasjon` | wind barrier (#232425, slight sheen) | Tett hus |
| `layer_tak` | roofing, fascia/coping, gutters, downpipes, chimney, wall bands: all suffixed per variant | Tett hus |
| `layer_vinduer` | windows, doors, glass railings, entrance canopy; variant heads suffixed | Tett hus |
| `layer_kledning` | both claddings, trims, the R1 frame (top suffixed), sconces | Kledning |
| `layer_installasjoner` | physical objects only: heat-pump outdoor unit on the north wall, technical cabinet, vent grille. **No glowing runs**, no `el_line` / `vvs_line` materials. | Kledning |
| `layer_interior` | floors, partitions, furniture on both floors; ceilings as `*__ceiling` | Kledning |
| `layer_nokkelferdig` | deck, steps, pergola, planter, outdoor furniture, planting beds, loungers, side table, framing foliage, drive and entrance landing | Nøkkelferdig |
| `env_*` | `env_terrain`, `env_lawn`, `env_trees` (instanced), `env_hedge`, `env_outbuilding`, `env_terrace`, `env_backdrop`, `env_sky` | always |
| `fx_lines` | ink linework of the **saltak** elevations, generated from the model (1.15) | timelapse only |

**Suffixes.** Every node that belongs to one roof form ends in `__saltak`, `__flatt` or `__pulttak`.
A node needed by two variants is duplicated (they are small). Nodes without a suffix are shared.
Upper-floor ceilings end in `__ceiling`. Their shape differs per roof, so name them
`<name>__<roof>__ceiling` (for example `ceiling_upper__pulttak__ceiling`). The runtime therefore tests
the roof with `includes("__<roof>")` and Se inn with `endsWith("__ceiling")`.

**Extras.** Each layer node carries `extras { step, birth: [t0, t1], grow: "up" | "wipe-x" | "wipe-roof" | "scale" }`.
Instanced plants carry a per-instance `aBirth` attribute.

**`house.meta.json`.** Keep every key the runtime reads today and add:

```json
{
  "house": "adria",
  "roofVariants": ["saltak", "flatt", "pulttak"],
  "defaultRoof": "saltak",
  "variants": { "high": "/models/house.glb", "lite": "/models/house-lite.glb" },
  "bytes": { "high": 0, "lite": 0 },
  "camera": {
    "photoMatch": { "...": "1.14, images 1 and 2" },
    "photoMatchInnkjorsel": { "...": "1.14, image 3" },
    "steps": { "grunnmur": {"desktop": {}, "mobile": {}}, "reisverk": {}, "tett": {}, "kledning": {}, "nokkelferdig": {} },
    "seInn": { "desktop": {}, "mobile": {} }
  },
  "lighting": { "sunHage": {}, "sunInnkjorsel": {} },
  "photos": {
    "photoMatch": { "saltak": "adria-saltak-hage", "flatt": "adria-flatt-tak-hage" },
    "photoMatchInnkjorsel": { "pulttak": "adria-pulttak-innkjorsel" }
  },
  "stats": { "triangles": 0, "drawCalls": 0, "programs": 0 }
}
```

Each camera preset holds `position`, `rotation` (or `target`), `fov` (vertical, of the virtual full
frame), `aspect`, and `viewOffset: { fullWidth, fullHeight, x, y, width, height }` in photo pixels.

### 1.14 The camera match (the modeller must finish this)

Scripts and overlays: `/tmp/claude-0/-home-user-WEBSITES/b52489a3-dfad-5be2-b7ef-4b1d7307930f/scratchpad/adria-run/direction/camsolve2/`
(`solve1.py`, `solve3.py`, `place3.py`, `overlay1.png`, `overlay2.png`, `overlay3.png`). The earlier
crop (`adria-render-crop.png`) maps onto image 1 by a pure scale of 1.52192 and an offset of
(+1.49, −98.07) px (SIFT, 1,242 inliers); the control points below are already converted.

**`photoMatch`: images 1 and 2** (identical framing; mean abs diff in the sky 0.7/255)

| Parameter | Value |
|---|---|
| Position | (31.24, 0.87, 34.11) |
| Rotation | yaw (rotation.y) **+43.28°**, pitch 0, roll 0. The photos are two-point perspective, so verticals stay vertical. |
| Focal length | 2180.8 px at 1920 wide (≈ 41 mm full-frame) |
| Principal point | (960.0, 651.9). The optical axis is **below** the image centre: the render uses lens shift. |
| three.js | virtual full frame 1920 × 1303.9 centred on the axis: `fov = 33.29`, `aspect = 1.4725`, `setViewOffset(1920, 1303.9, 0, 0, 1920, 1080)` |
| Fitted heights | eaves +6.03, saltak ridge +8.67 (34.1°) |
| Fit quality | 10 points, RMS 4.7 px; worst is the near deck corner (−12 px in x), where the deck level is ambiguous |

Control points (1920 px frame, ±4 px as measured):

| Point | World | Image 1 |
|---|---|---|
| Near corner, eaves | (+7.80, eaves, +3.90) | (1164, 361) |
| Near corner, deck | (+7.80, −0.05, +3.90) | (1181, 699) |
| West corner, eaves | (−7.80, eaves, +3.90) | (616, 418) |
| West corner, deck | (−7.80, −0.05, +3.90) | (618, 701) |
| East gable far corner, eaves | (+7.80, eaves, −3.90) | (1409, 393) |
| East gable far corner, deck | (+7.80, −0.05, −3.90) | (1405, 693) |
| Gable apex (outer verge) | (+7.80, ridge, 0) | (1295, 238) |
| Ridge, west end | (−7.90, ridge, 0) | (749, 321) |
| Pergola west post, base / top | (−2.20, −0.05 / +2.80, +6.85) | (670, 701) / (664, 555) |
| Image 2 parapet, near / west / far corner | (+7.80 / −7.80 / +7.80, +7.33, +3.90 / +3.90 / −3.90) | (1165, 283) / (617, 362) / (1410, 335) |

**`photoMatchInnkjorsel`: image 3** (first estimate, 6 points, RMS 2.9 px; `overlay3.png` shows the
entrance door and N1 landing on the photo)

| Parameter | Value |
|---|---|
| Position | (40.83, 2.41, −20.67) |
| Rotation | yaw **+118.0°**, pitch 0, roll 0 |
| Focal length | 2648 px at 1920 wide (≈ 50 mm full-frame) |
| Principal point | (960.0, 574.4) |
| three.js | `fov = 24.48`, `aspect = 1.6713`, `setViewOffset(1920, 1148.8, 0, 0, 1920, 1080)` |
| Fitted heights | pulttak high +7.20, low +5.71: 0.25 m under the drawings, so this view's ground reference sits about 0.25 m lower (the drive). Re-solve with the base points at −0.30 and the heights fixed to +7.45/+5.95. |

Control points (image 3, 1920 px): SE frame top (+7.80, high, +3.90) → (557.5, 262.5); NE top
(+7.80, low, −3.90) → (1010, 337.5); NW top (−7.80, low, −3.90) → (1380, 402.5); SE base → (558, 742);
NE base → (1010, 745); NW base (−7.80, −0.20, −3.90) → (1377, 707); chimney top → (872, 257).

**Procedure**

1. Render the twin at 1920 × 1080 with the photo camera, roof variant to match.
2. Overlay it at 50 % on the photo and run an edge diff (`perf3d/harness/shotdiff.mjs`, or a small
   Canny script).
3. Iterate camera position, yaw, focal length and principal point first. Only then nudge the free
   heights within the ranges in 1.2 and 1.6.

**Acceptance (1920 px frame)**

- `photoMatch`, saltak against image 1 **and** flatt tak against image 2: house edges ≤ 3 px RMS and
  ≤ 6 px max on the control points; pergola and deck ≤ 9 px; garden elements within about 30 px.
- `photoMatchInnkjorsel`, pulttak against image 3: house edges ≤ 5 px RMS. The environment only needs
  to be plausible (1.8).
- Colour, image 1 vs twin, mean CIEDE2000: ≤ 8 on the house, ≤ 10 on the lawn, ≤ 8 on the sky.

When those hold, the photo dissolve does not pop. Write the result into `house.meta.json`.

### 1.15 Linework (`fx_lines`) and the elevation SVG

- `fx_lines` is one `LineSegments` mesh: outlines, openings, every fourth cladding board, roof and
  chimney of the **saltak** house as seen in the four elevations, plus the site outline. A per-vertex
  `_ORDER` (0..1) sets the drawing order: footprint, walls from the ground up, openings, cladding, roof,
  chimney. Lite keeps outlines and openings only.
- Also export `public/renders/adria-fasade-hage.svg`: the garden elevation in the same linework
  (≤ 40 KB, `stroke="currentColor"`, no fills, one `<path>` per stroke group with `data-order`). The home
  page draws it on in "Dette bygger vi" (3.1). It is our own drawing from our model, not the supplier's.

---

## 2. Hero choreography

### 2.1 Architecture

**One canvas for the whole hero.** One full-viewport `<canvas>` sits inside the sticky inner wrapper
of a tall pinned section (`#topp`).

- In the intro and in the finale's photo landings, the photo is a **plate**: a fixed 16:9 rect.
  The camera maps the photo frame onto the plate rect with `setViewOffset`: the virtual full frame is
  scaled by `s = plate CSS width / 1920` and positioned so the photo frame coincides with the plate.
- In the intro the renderer draws only inside the plate (`setScissor`/`setViewport`), so pixel cost
  scales with what is visible. Expanding the stage means growing that clip rect to the viewport;
  because the frustum stays the same, the world outside the photo's edges simply appears.
- States, in order: `PHOTO`, `TWIN`, `TIMELAPSE`, `REST` (photo on top), `LIVE` (pointer on the plate),
  `EXPAND`, `STEPS`, `FINALE`, `RELEASED`.
- The render loop only runs while something changes or a behaviour is active. It stops in `REST`
  when the photo is fully opaque, and whenever the hero is off screen.

### 2.2 First paint (LCP-safe, no JavaScript needed)

Desktop at 1440 × 900:

```
| logo            Slik bygger vi  Tjenester  Husmodeller  Referanser  Om oss  Kontakt   tel |
|                                                                                           |
| Fra tegning til hus.                                                   (H1, one line)     |
|                                                                                           |
| sub (3 lines)              ┌──────────────────────────────────────────────────────┐       |
|                            │                                                      │       |
| [Book en uforpliktende     │   PLATE: Adria, saltak, hagesiden                    │       |
|  samtale  →]               │   cols 5–12, 880 × 495, 16:9                         │       |
| Se hvordan vi bygger ↓     │                                                      │       |
|                            └──────────────────────────────────────────────────────┘       |
|                            credit line + "Om Adria"                  status · Pause      |
```

- **Background:** paper #EDE8DF. Header in its light variant (ink on paper).
- **H1:** "Fra tegning til hus." Newsreader 300, one line from 1024 px up,
  `font-size: clamp(3.25rem, min(8.2vw, 13.5svh), 7.75rem)` (about 118 px at 1440 × 900), tracking
  −0.035em. On phones two lines: "Fra tegning / til hus." Words rise with the existing `IntroText`
  (`immediate`, 700 ms ease-expo, 60 ms stagger); the text is never hidden for LCP purposes.
- **Plate**
  - Columns 5–12, 16:9. At 1440 that is 880 × 495. Its height is also capped at
    `100svh − header − H1 block − 7rem`, with the width derived from the aspect, so the caption stays
    above the fold on a 1280 × 720 laptop.
  - A 1px `rule` passepartout line 10px outside the photo gives the mounted-print, tactile feel.
  - Fixed aspect box, so CLS is 0.
- **Photo:** `<picture>` of `adria-saltak-hage` with AVIF/WebP at 640, 960, 1280 and 1920 (2560 only
  from a 4K source). `sizes="(min-width: 1440px) 880px, (min-width: 1024px) 61vw, 100vw"`. Preload the AVIF with
  `imagesrcset` and `fetchpriority="high"`. It is the LCP element. No CSS filter.
- **Left column (cols 1–4), top-aligned with the plate:** the sub, the primary CTA (solid ink button;
  brass is not used on paper) and the secondary link "Se hvordan vi bygger".
- **Under the plate:** on the left, the credit line, always visible: "Husmodell Adria fra Boligpartner.
  Bilde: Boligpartner. [MANGLER: bekreft avtale med Boligpartner om bruk av husmodell og bilder]" and
  the link "Om Adria" (`/husmodeller/adria/`). On the right, the caption rail (empty until the
  timelapse runs) and the Pause button.
- **Removed from the hero:** the phone/e-mail row (the header already has both), all scrims and
  gradients, and the old architect credit.
- **Tablet (768–1023):** H1 on two lines; the plate spans 8 columns; the sub and CTAs sit below it.
- **Phone (< 768)**
  - Header 64. H1 two lines.
  - The plate is the **square crop** of image 1 (x 470–1550, full height) at content width
    (358 × 358 at 390), capped at `min(100vw − 32px, 46svh)`. Files `adria-saltak-hage-sq-{480,720,1080}`.
  - Below it: the credit, the sub, the primary CTA (solid ink, full width), "Se hvordan vi bygger".

### 2.3 The self-building timelapse (desktop 8.3 s)

**Start** when all of these hold: the 3D is ready (GLB parsed and every program compiled, section 8);
at least 900 ms have passed since LCP; the hero is in view and the tab visible; the page has not
scrolled more than 10 % of the viewport; reduced motion is not set.

If the 3D is not ready 6 s after LCP, skip the timelapse. The photo stays and the 3D attaches
quietly for scrolling.

**Interruptions.** If the visitor scrolls during the timelapse, fast-forward the rest in 400 ms to the
finished state, then hand over to `EXPAND`. If the tab is hidden, pause. The **Pause** button is
mandatory (WCAG 2.2.2: the motion runs over 5 s next to other content).

The timelapse always builds the **saltak** house, because it lands on image 1. Every material gets two
injected uniforms through `onBeforeCompile`, at no program cost: `uReal` (0 = clay/paper,
1 = real material) and a world-space wipe, so material changes never swap programs.

| t (s) | Phase | World | Camera | UI |
|---|---|---|---|---|
| 0.00–0.70 | **Tvilling** | The photo dithers away over the identical 3D twin: a 64² blue-noise threshold flips pixels instead of a soft fade. The people in the photo go with it. Clouds start drifting and leaves start moving. | `photoMatch` | — |
| 0.70–1.60 | **Til papir** | `uReal` 1 → 0 as a top-down wipe (roof first, ease-glide). House and garden become a white study model (#EAE5DC). The sky lerps to paper #EDE8DF, the ground to paper-deep #E3DDD1. Shadow intensity drops to 0.35. From 1.2 s the passepartout fades: **the plate dissolves into the page**. | `photoMatch` | the caption rail line starts drawing |
| 1.40–2.30 | **Tilbake** | The model sinks into the page in reverse build order: nøkkelferdig, interior, kledning, tak, vinduer, isolasjon, bindingsverk, fundament. Each layer scales Y to 0 from its base over 120 ms, staggered 90 ms (power3.in). Plants shrink from far to near. Trees and hills stay as pale silhouettes at 25 % contrast. | — | — |
| 2.30–3.60 | **Tegningen** | `fx_site`, then `fx_lines`, draw on in ink (#161C1E at 85 %, 1px hairlines), following `_ORDER` (sine.inOut). A pen **drawing the elevations straight onto the website's own paper**. | 3 % push-in, linear | "Tegningen" |
| 3.60–4.70 | **Reisverket** | `layer_fundament` rises 0.3 m. Studs grow from the sill plates along the drawn lines, staggered west to east over 0.6 s (ease-expo). Joists slide in, rafters rise from eaves to ridge. The pale spruce is `uReal` 1 for the frame only. The ink lines fade as members cover them. | holds | "Reisverket" |
| 4.70–5.60 | **Taket** | The wind barrier wraps the facades (a wipe around the perimeter). Roofing sweeps from eaves to ridge (`wipe-roof`). The chimney rises. Windows appear, and a single specular glint crosses the glass (env rotated 8°). | holds | "Taket" |
| 5.60–6.50 | **Kledningen** | The cladding wipes across the facades west to east (ease-glide), charcoal 120 ms behind. Railings, fascia and gutters follow. The sky returns from paper to blue (900 ms). The passepartout returns. | holds | "Kledningen" |
| 6.50–7.50 | **Hagen** | The lawn colour spreads out from the house (radius 0 → 60 m, ease-expo). Deck boards stagger in. Pergola rafters settle from 60 mm above (ease-weight, no bounce). Plants grow by distance from the house. Furniture settles. Shadow intensity returns to 1. The shadow map renders once at 7.3 s. | holds | "Hagen" |
| 7.50–8.30 | **Virkeligheten** | The photo dithers back in (blue-noise threshold, 800 ms, ease-weight). | eases onto the exact photo camera | the rail completes and the caption crossfades to the credit. "Se det igjen" fades in (450 ms). |

The text column never moves during the timelapse. Only the plate and its caption rail change.

**After the timelapse (`REST` / `LIVE`, desktop with a fine pointer only).** Behind the feature flag
`liveTwinOnHover`, which is switched on **only if the twin meets the colour acceptance in 1.14**:
when the pointer enters the plate, the photo dithers out over 300 ms and the live twin follows the
pointer (Blikk); when it leaves, the camera eases back in 900 ms and the photo returns over 400 ms. A
photograph that turns its head when you look at it. Touch devices stay on the photo until they scroll.

**Phones (6.4 s, lite model):** Tvilling 0–0.5, Til papir 0.5–1.2, Tilbake 1.0–1.7, Tegningen 1.7–2.7
(outlines and openings only), Reisverket 2.7–3.5, Taket 3.5–4.2, Kledningen 4.2–4.9, Hagen 4.9–5.7
(40 % of plant instances), Virkeligheten 5.7–6.4.

### 2.4 Expansion: the world is bigger than the picture

Scroll range 0–60 vh of the pinned section (phones 0–50 vh).

| Range | What happens |
|---|---|
| first 50 % | The photo dithers out within the first 5 %. The clip rect grows from the plate to the full viewport (corners stay square) and the frustum stays put, so the garden continues past the photo's edges. The H1, sub and CTAs move up 40 vh and fade (they are not pinned). The credit fades. The framing foliage dithers out. The header gains a paper background and a bottom hairline. |
| last 50 % | The house **rewinds to step 1**: layers retract in reverse, scrubbed. The camera rises to the Grunnmur view. The skip link "Hopp over byggingen" becomes reachable. **`#slik-bygger-vi` anchors here.** |

### 2.5 Pinned build steps (five)

Each step gets 80 vh on desktop and 70 vh on phones. In the first 40 % of a step's range the camera
travels; in the first 60 % its layers scrub in; the last 40 % holds still for reading.

The steps are a semantic `<ol>` in the DOM. The current step is visible; the others stay in the
accessibility tree.

**Step panel (desktop):** a solid chalk panel, columns 1–4, 2rem from the bottom-left, no blur, no
shadow. Contents: the rail of step names, the title (`t-display-s`), the two-sentence body and the
skip link. The rail is the five names in a row: the current one ink, the others ink-soft, a 1px ink
hairline gliding under the current name (450 ms ease-glide). Each name is a button that scrolls to its
step (Lenis `scrollTo`, 1.2 s). Step text changes with a crossfade and a 12px rise, 450 ms ease-weight.

**Phones:** the panel is a chalk bottom sheet over the lowest 40 % of the stage, the rail one line of
five names at 13px. The stage frames the house in the upper 60 % with a view offset.

| Step (rail label) | Layers | Desktop camera (pos → target, vertical fov) | Phone camera |
|---|---|---|---|
| Søknad og grunnmur (Grunnmur) | `layer_tomt`, `layer_grunnarbeid`, `layer_fundament`. Lawn, trees and hedge stay; no planting or deck yet. | (16, 22, 22) → (0, 0, 0), fov 35, high 3/4 | (20, 30, 28) → (0, 0, 0), fov 45 |
| Reisverket (Reisverk) | `layer_bindingsverk` | (−18, 3.5, −20) → (0, 3.5, 0), fov 40: north-west, the frame against the sky | (−24, 5, −27) → (0, 4, 0), fov 50 |
| Tett hus | `layer_isolasjon`, `layer_tak`, `layer_vinduer` | (22, 2.0, 8) → (6, 4.2, 0), fov 40: low on the R1 gable | (27, 3, 12) → (5, 4.5, 0), fov 50 |
| Kledning og innredning (Kledning) | `layer_kledning`, `layer_installasjoner`, `layer_interior` | lateral dolly along the garden facade from (−6, 2.5, 14) to (4, 3, 13), target 2 m ahead on the facade at y 3, fov 38 | (−4, 3, 20) → (2, 3, 0), fov 48 |
| Nøkkelferdig | `layer_nokkelferdig` | glides onto `photoMatch` (the finale starts here) | `photoMatch` with the phone plate (2.6) |

Camera moves are scrubbed with GSAP ScrollTrigger (`scrub: 0.6` on desktop). On touch devices,
damp them in the render loop instead (lerp `1 − e^(−dt/0.25 s)`) so native scrolling stays smooth.

### 2.6 The finale: roof, sides, and landing on reality

Pinned for 140 vh on desktop, 120 vh on phones. It is the hero's first composition again, in reverse:
text panel on the left, the house in a plate on the right, but now the world around the plate is
live and the visitor is in control.

**Layout (desktop).** The stage stays full-viewport. The plate rect is the intro's plate rect
(cols 5–12, 16:9), and the active photo camera maps onto it, so the world continues seamlessly around
it. The chalk panel holds, top to bottom:

1. Title "Nøkkelferdig" and the body.
2. **Tak**: a segmented `radiogroup` with three native radios, each 44px tall: **Saltak · Flatt tak · Pulttak**.
   The thumb glides between them (450 ms ease-glide). Default Saltak.
3. **Side**: two text buttons in the rail style, **Hagen · Innkjørselen**, which scroll to the two
   ends of the orbit. The current side is underlined.
4. **Se inn**: one toggle button (`aria-pressed`).
5. The CTA "Book en uforpliktende samtale" (solid ink) and the link "Om Adria".
6. The status line under the plate: "Bilde: Boligpartner" when a photo is showing, "3D-modell" otherwise,
   plus the credit and `[MANGLER]` (2.2).

A polite live region announces each change. Arrow keys move within the radio group.

**Scroll inside the finale (the walk around the house).**

| Finale range | Camera | Sun |
|---|---|---|
| 0–35 % | holds `photoMatch` (side Hagen) | `sunHage` |
| 35–70 % | orbits round the R1 gable to `photoMatchInnkjorsel`: azimuth around the house centre from +47.5° to −26.9°, radius 46.3 → 45.8 m, eye height 0.87 → 2.41, focal length and principal point interpolated, ease-glide, scrubbed | lerps `sunHage` → `sunInnkjorsel`; shadows per 1.12 |
| 70–100 % | holds `photoMatchInnkjorsel` (side Innkjørselen) | `sunInnkjorsel` |

**Photo landings.** Whenever the camera is at rest on a matched pose and the roof has a photo there
(1.13 `photos`), the photo dithers in over the plate in 600 ms and the passepartout line draws round
it. When anything starts to change (scroll, roof, Se inn), the photo dithers out in 250 ms first, so
the 3D is always what moves. Hagen + Saltak = image 1, Hagen + Flatt tak = image 2, Innkjørselen +
Pulttak = image 3. Every other combination stays 3D and says "3D-modell".

**Roof transitions.** Like a model-maker swapping roofs on an architectural model: no hard swaps and no
transparency sorting. Fades use `alphaHash` dithering; every transition is interruptible (the newest
choice wins and retargets from the current state); the shadow map re-renders once at the end.

| From → to | Total | What happens |
|---|---|---|
| Saltak ↔ Pulttak | 1100 ms | The outgoing roof lifts 0.8 m and dithers out (0–600 ms, ease-expo) while the incoming roof settles from +0.8 m (300–1100 ms, ease-weight). The wall bands and the R1 frame top morph with it (scaleY on the band, 300–900 ms). |
| any → Flatt tak | 1100 ms | The pitched roof lifts 0.8 m and dithers out; the parapet band grows up from +5.90 to +7.35 (300–900 ms, ease-weight); the coping settles last (900–1100 ms). |
| Flatt tak → any | 1100 ms | The coping lifts and dithers, the band sinks to the new top, the new roof settles from +0.8 m. |

In the Hagen pose, image 1 and image 2 share the camera, so Saltak ↔ Flatt tak reads: photo out
(250 ms), the 3D roof change (1100 ms), the other photo in (600 ms). The visitor sees the supplier's
two real images connected by our own construction.

**Se inn** (any side, any roof): the current roof group and its `__ceiling` nodes lift +1.2 m in
500 ms (ease-expo), keep rising to +2.5 m and dither out by 1100 ms; the camera rises to `seInn`
(desktop (18, 16, 20) → (0, 4, 0); phone (22, 22, 26) → (0, 4, 0)), so you look down into the
furnished upper floor with its ink-cut wall tops. The plate frame and any photo go. Pressing it again
reverses everything to the side pose. Changing the roof while Se inn is on changes the roof that will
come back, and the switcher still works.

**Phones.** The chalk sheet holds the three radios (full width, 44px), Side and Se inn on one line,
and the CTA. The plate is 16:9 at full content width (358 × 201) in the upper area; the world fills
the rest of the stage above the sheet.

### 2.7 Release into the page (behaviour Gardin)

After the finale, the stage stays sticky for 100 vh (phones 80 vh) while the next paper section
("Dette bygger vi") slides up over it. Underneath, the stage scales 1 → 0.96 and a 15 % paper overlay
dims it, scrubbed. Once covered, the canvas stops rendering; it is disposed after 2 s off screen and
restored on the way back up.

Total pinned length: desktop 60 + 5 × 80 + 140 + 100 = **700 vh**; phones 50 + 5 × 70 + 120 + 80 =
**600 vh**. Today's hero plus "Slik bygger vi" is about 1,200 vh at 1440.

### 2.8 Reduced motion, low tier, no WebGL

Keep the tier names in `src/lib/gpu-tier.ts` (`high | low | off`) but change what `low` gets: **phones
and weak GPUs now get the live hero** with the lite model.

| Case | Hero | Build part | Finale |
|---|---|---|---|
| `prefers-reduced-motion` | The static photo plate and credit. Not pinned. No dissolve, no timelapse. | A stepped gallery: five stills of our model from the step cameras (desktop 1600 × 1000, phone 900 × 1200), each with title and body, same `<ol>` | The three radios swap three **photos** with a 200 ms opacity crossfade: Saltak → image 1, Flatt tak → image 2, Pulttak → image 3 (caption says it is the entrance side). Se inn shows the still `adria-se-inn`. |
| Tier `off` (no WebGL, software GL, Save-Data, 2G, ≤ 1 GB memory, very old GPU) | Same as reduced motion | Same | Same |
| Tier `low` (phones, tablets, weak integrated GPUs) | Lite model, full choreography with phone timing | Full | Full; shadows update once at the end of the orbit |
| Tier `high` | High model | Full | Full |

Behaviours Pust, Strek, Lodd and the scroll reveals still run under tier `off`.

### 2.9 Mobile choreography in one paragraph

Paper, H1 on two lines, the square photo plate, credit, sub, CTA. After 900 ms the 6.4 s timelapse
runs inside the square. Scrolling dithers out the photo and opens the square to the full stage, the
H1 block slides away, the house rewinds, five steps run with a bottom sheet (70 vh each), the camera
returns to the photo pose with a 16:9 plate above the sheet, the visitor flips roofs and walks to the
entrance side, and "Dette bygger vi" slides up over the stage. No hover states, no Blikk except a slow
idle drift in the finale.

### 2.10 Images: files, sizes and the rights switch

- **Source:** the 4K JPG in `content-import/adria/4k/` when present (commit it there, never in
  `public/`), otherwise `content-import/adria/orig/`. Never put 4K PNGs in `public/`.
- **Files:** `public/images/adria/<key>-<w>.{avif,webp}` for the four keys `adria-saltak-hage`,
  `adria-flatt-tak-hage`, `adria-pulttak-innkjorsel`, `adria-flatt-tak-naer`.
  - Widths 640, 960, 1280, 1920 always; 2560 and 3840 only when a 4K source exists, and used only on
    the Husmodeller detail page (lead image and full-screen view).
  - Phone square crops of images 1 and 2 (x 470–1550, full height): `-sq-{480,720,1080}`.
  - Budget: 1280 AVIF ≤ 150 KB; 720² AVIF ≤ 80 KB.
- **As supplied.** Resize and crop only. No grade, no retouching, no removal of people. Document this
  in `DESIGN.md` §5 as the rule for supplier images (they are exempt from the render-chroma rule
  because they are not ours to change).
- **Alt texts:** in 3.3. The canvas is `aria-hidden`.
- **Rights switch.** `supplierImagesEnabled` in `src/content/site.ts` (or on the model entry in
  `house-models.ts`), default `true`.
  - With `false`, every supplier image is replaced by our own render from the same camera, rendered at
    2× by the harness: `adria-twin` (saltak, `photoMatch`), `adria-twin-flatt` and
    `adria-twin-pulttak-innkjorsel`. Captions then read "Illustrasjon fra vår 3D-modell" and the photo
    landings land on our renders. The concept still works.
  - The OG image is always our own render, never the supplier's.

---

## 3. Home: section order and purpose

| # | Section (id) | Tone | Purpose | Build |
|---|---|---|---|---|
| 1 | Hero (`topp`, build part `slik-bygger-vi`) | paper → day stage | Positioning, the signature, how we build a house | **New** `Hero` with the plate, copy and controls; one stage component and one canvas; steps and finale DOM. Reuse from `three/lib`: `loader`, `modelSource`, `warmup`, `renderLoop`, `inputStore`, `camera`, `scrollMap`, `stageStore`. Retire `HeroHouse`, `HeroCanvas`, `BuildSequence`, `BuildStage`, `BuildCanvas`, `StageHotspots`, `postprocessing`. `BuildGallery` becomes the stills fallback. |
| 2 | Dette bygger vi (`dette-bygger-vi`) | paper | The three lead services | **New** `LeadServices` (3.1). Reuse `BeforeAfter`, `Picture`, `Hairline`, `MagneticButton`. New `ElevationDrawing`. |
| 3 | Jobber vi har gjort (`referanser`) | **night** | Proof, high on the page | **Rebuild** as "Prosjektark" (section 4). Reuse `ReferenceMeta`, `ReferenceQuote`, `Missing`, `BeforeAfter`. |
| 4 | Husmodeller vi bygger (`husmodeller`) | chalk | House models, starting with Adria | **New** `HouseModelsSection` (3.3) |
| 5 | Fra første samtale til overlevering (`fra-tegning-til-nokkel` stays as the id so old links work) | paper | Process, including byggesøknad | **Reuse** `ProcessSection` and `ProcessTimeline`, new title and lede, centred header |
| 6 | Alle fagene i eget firma (`alle-fag`) | paper-deep | The calm all-trades mention plus an index of all ten services | **Reuse** `ServiceIndexHover`. The old `Intro` copy moves here, rewritten. Hover previews use own photos or Adria renders. |
| 7 | Interlude photo | full-bleed, capped at 1380 | Breathing room | **Reuse** `Interlude` |
| 8 | Om oss (`om-oss`) | paper | Who we are | **Reuse** `AboutSection` |
| 9 | Kontakt (`kontakt`) | paper | Conversion | **Reuse** `ContactSection` |

**Removed from home:** `Intro` with its three-up row; the separate "Slik bygger vi" section;
`BeforeAfterSection` (the tilbygg pair moves into Dette bygger vi, the gang pair into references);
`PermitsSection`, which moves to `/tjenester/pabygg-og-tilbygg/` and must reuse **one** WebGL context
across tab switches.

**Header nav:** Slik bygger vi · Tjenester · Husmodeller · Referanser · Om oss · Kontakt. Check it fits
at 1024 to 1279 px; if not, drop "Slik bygger vi" from the bar there (it stays in the menu).
**Tjenester index** order, premium first: Ny bolig (shown as "Nybygg"), Påbygg og tilbygg, Takarbeid,
then Ombygging, Oppussing og renovering, Rehabilitering og renovering, Bytte dører og vinduer,
Oppussing av bad, VVS, Maling. Slugs stay.

Section headers vary their layout, so no more than two neighbours share one: hero one-line H1;
LeadServices stacked; references full-width on night; Husmodeller split with the model name as the
display line; process centred; all-trades split; about split.

### 3.1 LeadServices ("Dette bygger vi")

Three rows, each composed differently, separated by hairlines that draw on (Strek).

| Row | Media | Text |
|---|---|---|
| **Nybygg** | `ElevationDrawing`: the inlined `adria-fasade-hage.svg` (1.15), read at build time in a server component, cols 1–7. It draws on over 2.4 s as it enters: ground line, outline, openings, cladding hints. Caption: "Fasadetegning fra vår 3D-modell av husmodellen Adria." Fallback if the SVG is missing: the Nøkkelferdig step still. | cols 9–12, bottom-aligned, with the links "Les om nybygg" and "Se husmodellene" |
| **Tilbygg og påbygg** | The real tilbygg before/after slider, cols 7–11 (the 885 px source caps it at 5 columns, DESIGN §5) | cols 1–5, top-aligned, with the permit note and the link |
| **Tak** | The `nytt-tak` photo, cols 1–5, with Pust | cols 7–11, middle-aligned, with the link |

Under the rows one line, "Vi tar også oppussing, bad, ombygging og rehabilitering.", and the link
"Se alle tjenestene". On phones each row stacks: media, title, body, link.

Each own photo appears once on home: tilbygg pair and `nytt-tak` in Dette bygger vi; gang pair,
`firemannsbolig` and `minigraver-skifer` in references; `arbeid-over-bergen-bred` in the interlude;
`arbeid-over-bergen` in Om oss.

### 3.2 Husmodeller: data

`src/content/house-models.ts`, typed in `types.ts`:

```ts
type RoofType = "saltak" | "flatt" | "pulttak";
interface HouseModelImage {
  key: string;              // "adria-saltak-hage" → public/images/adria/<key>-<w>.{avif,webp}
  roof: RoofType;
  view: "hage" | "innkjorsel" | "hage-naer";
  width: number; height: number;   // largest available derivative
  widths: number[];                  // e.g. [640, 960, 1280, 1920]
  alt: string; caption: string;
}
interface HouseModel {
  slug: string;             // "adria"
  name: string;             // "Adria"
  supplier: { name: string; url: string };   // "Boligpartner", "https://boligpartner.no/ferdighus/moderne/adria"
  credit: string;           // "Husmodell Adria fra Boligpartner"
  missing: string;          // key into missingFacts → "[MANGLER: bekreft avtale med Boligpartner om bruk av husmodell og bilder]"
  summary: string;
  facts: { label: string; value: string }[];
  roofTypes: RoofType[];
  defaultRoof: RoofType;
  images: HouseModelImage[];
  has3d: boolean;           // true: link to /#slik-bygger-vi
}
```

Adria facts (exact wording): Bruksareal: "ca. 159 m² BRA-i" · Soverom: "4" · Bad: "2" ·
Energimerking: "B" · Tomt: "Flat tomt. Passer godt på smale tomter." · Taktyper: "Flatt tak, pulttak
eller saltak" · Kilde: "boligpartner.no" (external link). Render them as a `<dl>` with hairlines.

### 3.3 Husmodeller: home section, index and detail page

**Home section `#husmodeller` (chalk).** Built to look complete with one model and to grow.

- **One model** (now), desktop: cols 1–4 hold the H2 "Husmodeller vi bygger", the lede, then the model
  name "Adria" in `t-display-l`, the credit line with `[MANGLER]`, the facts `<dl>`, the **Taktype**
  radiogroup (Saltak / Flatt tak / Pulttak, each with a tiny 1px ink roof glyph drawn from our model's
  silhouettes) and the links "Se Adria" and "Snakk med oss om Adria". Cols 5–12 hold one 16:9 image
  (880 wide) that follows the radio: Saltak → image 1, Flatt tak → image 2, Pulttak → image 3.
  Images 1 and 2 share the camera, so Saltak ↔ Flatt tak is a plain 600 ms opacity crossfade
  (ease-glide) of two stacked `<picture>`s: only the roof appears to change, which reads as a morph.
  Pulttak changes view, so it crossfades in 600 ms while the incoming image settles from scale 1.02
  to 1.00. No canvas on this section. Caption under the image: "Adria med saltak, hagesiden. Bilde: Boligpartner."
- **Two or more models** (later): the same section becomes an index: one row per model (name in
  `t-display-m`, supplier, three facts, a 4:3 thumbnail that follows the hover), like the service index.
- Phones: name, image, radios, facts, links.

**`/husmodeller/`** (paper): `PageHero` "Husmodeller vi bygger" with the lede, then the model index
(rows as above, even with one model), then a closing band "Har du egne tegninger? Vi bygger etter dem."
linking to `/tjenester/ny-bolig/`.

**`/husmodeller/[slug]/`**, static params from the data:

1. Breadcrumbs (Husmodeller › Adria). H1 "Adria". Credit line with `[MANGLER]`.
2. The lead image with the Taktype radios (same component as home), at up to 1280 CSS px wide.
3. Facts `<dl>` and the summary.
4. "Bilder": all four images in a two-column grid (image 4 included), each with its caption; a
   click opens a native `<dialog>` with the 2560/3840 version when available. Focus is trapped and Esc
   closes.
5. If `has3d`: a link band "Se huset bygges, steg for steg" → `/#slik-bygger-vi`. No second WebGL
   context on this page.
6. CTA band "Snakk med oss om Adria" using `PrefillLink` (prosjekttype nybygg, melding "Adria").
7. JSON-LD: `BreadcrumbList` and `WebPage`. No `Product`, no price.

Alt texts and captions:

| Key | Alt | Caption |
|---|---|---|
| `adria-saltak-hage` | Husmodellen Adria med saltak, sett fra hagen: toetasjes hus med stående trekledning, sort tak, overbygd balkong og terrasse, plen og solsenger i forgrunnen. | Adria med saltak, hagesiden. Bilde: Boligpartner. |
| `adria-flatt-tak-hage` | Husmodellen Adria med flatt tak, sett fra hagen fra samme vinkel. | Adria med flatt tak, hagesiden. Bilde: Boligpartner. |
| `adria-pulttak-innkjorsel` | Husmodellen Adria med pulttak, sett fra innkjørselen: inngangsparti, en høy innrammet balkong over en overbygd terrasse, og carport. | Adria med pulttak, inngangssiden. Bilde: Boligpartner. |
| `adria-flatt-tak-naer` | Husmodellen Adria med flatt tak, sett nærmere fra hagen med pergola og terrasse. | Adria med flatt tak, nærmere hagesiden. Bilde: Boligpartner. |

More models are added only from a real crawl of boligpartner.no (pending network access). Never invent one.

---

## 4. References: "Prosjektark"

**Concept.** Three loose project sheets on a dark light table. The text of each reference is the
object, and own photos lie between the sheets as clearly separate plates. Nothing is attributed to a
reference unless the sources tie it.

**Desktop mechanics.** The band is tone `night`, about 180 vh.

- **Header:** H2 "Jobber vi har gjort" (`t-display-l`, snow); the lede below it, max 36rem, mist; one
  honest line in t-small mist: "Bildene mellom arkene er fra andre jobber vi har gjort."
- **Sheet** (`article`, chalk #F7F5F0, ink text, a 1px rule-strong border, no shadow, `rounded-none`):
  - the title (`t-display-m`);
  - a **sketch glyph**: a 1px ink SVG, 4:3, schematic only, captioned "Skisse". Rekkehus: three gabled
    units in elevation. Leiligheter på Askøy: a three-storey, six-unit block outline with window grid.
    Nytt bad og kjøkken: a plan with the old wall dashed, the new wall solid, and a small arrow from
    kitchen to dining room;
  - `ReferenceMeta` as a hairline list;
  - the paraphrased quote, Rekkehus only, with its note;
  - the visible `[MANGLER: bilder fra …]` line;
  - the whole sheet links to `/referanser/#<id>`.
- **Layout on 12 columns**

  | Row | Sheet | Plate |
  |---|---|---|
  | 1 | Rekkehus, cols 1–5 | the gang before/after slider, cols 7–12, offset down 8rem |
  | 2 | Leiligheter på Askøy, cols 8–12 | `firemannsbolig`, cols 1–6 |
  | 3 | Nytt bad og kjøkken, cols 2–6 | `minigraver-skifer` (portrait), cols 8–11 |

  Each plate has its own caption ending "Foto fra eget prosjekt."
- **Motion:** sheets drift at 0.92× scroll speed and plates at 1.06× (±6 vh, scrubbed): loose sheets on
  a table. Sketch strokes draw on as a sheet enters (Strek, 1.2 s). Photos breathe (Pust). On hover or
  focus, a sheet lifts 6px (450 ms ease-weight) and its strokes darken from ink-soft to ink.
- **CTA:** "Se alle referansene", the one place on home where brass is allowed (accent button on night).

**Phones.** One column alternating sheet, plate, sheet, plate. No parallax; reveal-up and sketch
draw-on remain. The slider is full width.

**Honesty rules:** never put a photo inside a sheet; never caption a plate with a reference's name or
place; the `[MANGLER]` lines stay visible; when the client sends photos tied to a reference, they
replace that sheet's sketch (through `photoKeys`) and the line comes off.

---

## 5. The "alive" motion system

Six named behaviours. Nothing else moves. All six are off under reduced motion, apart from the
instant state changes they already provide.

| Name | What it does | Timing and easing | Where it applies |
|---|---|---|---|
| **Pust** (breath) | A photo inside its frame scales 1.06 → 1.00 and moves ±4 % in Y from entering to leaving the viewport | Scroll-linked, `EASE.scrub` | Own photos in Dette bygger vi, the references plates, the interlude, Om oss, Husmodeller images below the fold. **Not** on the hero LCP photo. |
| **Strek** (line) | Hairlines draw (`scaleX` 0 → 1). SVG strokes draw on (`stroke-dashoffset`). Headings rise word by word (`RevealText`). | Lines 900 ms ease-expo, 80 ms stagger. Words 700 ms ease-expo, 60 ms stagger. Drawings 1.2–2.4 s, `sine.inOut`. | Section rules, the timelapse caption rail, `ElevationDrawing`, reference sketches, the roof glyphs, the step rail underline |
| **Gardin** (curtain) | A paper section slides over a pinned stage, which scales to 0.96 and dims 15 % | Scrubbed over 100 vh | Hero release only, so it stays special |
| **Lodd** (weight) | Magnetic CTAs (within 24px, max offset 6px). Button fill wipes up from the bottom. Underlines draw. Segmented-control thumbs glide. Sheets lift on hover. | Return 450 ms ease-weight; thumb 450 ms ease-glide | Every interactive element. Magnetism only on fine pointers. |
| **Blikk** (gaze) | The 3D camera orbits its target, following the pointer within ±3.5° yaw and ±1.2° pitch, critically damped (`1 − e^(−dt/0.35 s)`). With no pointer it idles: ±1.0° yaw over 14 s. While a photo is showing, Blikk is off (the photo cannot turn). | continuous | Hero `LIVE` (if enabled) and the finale when no photo shows (desktop, fine pointer). Phones: idle drift in the finale only. |
| **Vær** (weather) | Clouds drift (sky UV 0.004/s). Tree crowns sway 1.5–4 cm and grass tips 2–6 cm, with 4–7 s periods phased by world position, all in the vertex shader. | continuous | Anywhere the 3D renders. Stops when the canvas is off screen. |

Never: bounce, elastic or overshoot; parallax on text; auto-rotating turntables; pulsing hotspots;
scroll-hint chevrons; cursor trails beyond the existing ring.

---

## 6. Copy (bokmål)

"Du/vi", calm and concrete. Every claim traces to `content-import/byggrv/` or the Boligpartner facts in
0.2. No em dashes in the copy. Load `design:ux-copy` before finalising.

### Hero

| Element | Copy |
|---|---|
| H1 | **Fra tegning til hus.** |
| Sub | Vi bygger nye hus, tilbygg, påbygg og tak i Bergen og omegn. Byggesøknaden ordner vi, og én prosjektleder følger jobben til avtalt tid og pris. |
| Primary CTA | Book en uforpliktende samtale |
| Secondary | Se hvordan vi bygger |
| Credit | Husmodell Adria fra Boligpartner. Bilde: Boligpartner. [MANGLER: bekreft avtale med Boligpartner om bruk av husmodell og bilder] |
| Credit link | Om Adria |
| Timelapse captions | Tegningen · Reisverket · Taket · Kledningen · Hagen |
| Controls | Pause · Spill av · Se det igjen (aria: "Sett byggingen på pause", "Spill av byggingen", "Se huset bygges igjen") |
| Skip link | Hopp over byggingen |
| Rail `aria-label` | Byggesteg |

### Build steps

| Rail | Title | Body (two sentences) |
|---|---|---|
| Grunnmur | Søknad og grunnmur | Byggesøknaden skriver og sender vi til kommunen for deg. Når den er godkjent, støper vi grunnmuren og legger radonsperre under gulvet. |
| Reisverk | Reisverket | Tømrerne reiser vegger, bjelkelag og takstoler i tre. Nå ser du hvor store rommene blir. |
| Tett hus | Tett hus | Taket legges, og vinduer og dører settes inn. Med vindsperre og isolasjon etter byggteknisk forskrift (TEK) blir huset tett og holder på varmen. |
| Kledning | Kledning og innredning | Kledningen kommer opp, og inne gjør fagene ferdig rom for rom. Alle fagene er i eget firma, og én prosjektleder samordner dem. |
| Nøkkelferdig | Nøkkelferdig | Vi leverer nøkkelferdig, til avtalt tid og pris og etter dine ønsker. Velg tak, og gå rundt huset. |

### Finale controls

| Element | Copy |
|---|---|
| Roof legend | Tak |
| Roof options | Saltak · Flatt tak · Pulttak |
| Side legend / options | Side · Hagen · Innkjørselen |
| Se inn | Se inn (aria-pressed; `aria-label` "Løft av taket og se inn i andre etasje") |
| Helper | Samme hus med tre taktyper. |
| Status under the plate | "Bilde: Boligpartner" · "3D-modell" |
| Live region | "Viser saltak." · "Viser flatt tak." · "Viser pulttak." · "Viser hagesiden." · "Viser inngangssiden." · "Taket er løftet av." · "Taket er på igjen." |
| Credit | as the hero credit |
| Reduced-motion lede | Her er byggingen steg for steg. |

### Sections

| Section | Copy |
|---|---|
| Dette bygger vi | H2 **Dette bygger vi**. Lede: "Nye hus, tilbygg og påbygg, og tak. Vi tar hele jobben, fra søknad til ferdig bygg, med én prosjektleder." |
| – Nybygg | "Har du tomt, men ikke hus? Vi har lang erfaring med å sette opp hus, og leverer nøkkelferdig til avtalt tid og pris, etter dine spesifikasjoner." Links: "Les om nybygg" · "Se husmodellene" |
| – Tilbygg og påbygg | "Et tilbygg gir huset større grunnflate. Et påbygg gir deg en ny etasje på huset du har. Byggesøknaden skriver og sender vi." Link: "Les om tilbygg og påbygg" |
| – Tak | "Nytt tak, reparasjoner, takrenner og nedløp. Vi ser over taket først og forteller deg hva som må gjøres." Link: "Les om takarbeid" |
| – Closing line | "Vi tar også oppussing, bad, ombygging og rehabilitering." Link: "Se alle tjenestene" |
| References | H2 **Jobber vi har gjort**. Lede: "Tre oppdrag fra referanselisten vår." Note: "Bildene mellom arkene er fra andre jobber vi har gjort." Sketch caption: "Skisse". Plate captions end "Foto fra eget prosjekt." CTA: "Se alle referansene" |
| Husmodeller | H2 **Husmodeller vi bygger**. Lede: "Vil du ha et hus som allerede er tegnet? Her er husmodeller vi bygger, med fakta fra leverandøren. Har du egne tegninger, bygger vi etter dem." Radio legend: "Taktype". Links: "Se Adria" · "Snakk med oss om Adria" |
| Process | H2 **Fra første samtale til overlevering**. Lede: "Den samme prosjektlederen følger deg hele veien." Steps unchanged (`process.ts`). |
| All trades | H2 **Alle fagene i eget firma**. Body: "Vi er håndverkere fra flere firmaer som er slått sammen til ett. Tømrer, elektriker, rørlegger, maler og murer jobber hos oss, og sprenging og grunnarbeid gjør vi selv. Du får én prosjektleder som samordner fagene." Then the service index. Link: "Se alle tjenestene" |
| Interlude, Om oss, Kontakt | Unchanged |

### Meta

| Page | Title | Description |
|---|---|---|
| `/` | Nybygg, tilbygg og tak i Bergen \| Bygg og Renovering Vest | Vi bygger nye hus, tilbygg, påbygg og tak i Bergen og omegn. Byggesøknaden ordner vi, og én prosjektleder følger jobben til avtalt tid og pris. |
| `/husmodeller/` | Husmodeller vi bygger \| Bygg og Renovering Vest | Ferdig tegnede husmodeller vi bygger i Bergen og omegn, med fakta og bilder fra leverandøren. Vi bygger også etter dine egne tegninger. |
| `/husmodeller/adria/` | Adria, husmodell fra Boligpartner \| Bygg og Renovering Vest | Husmodellen Adria fra Boligpartner: ca. 159 m² BRA-i, 4 soverom og 2 bad, tegnet med flatt tak, pulttak eller saltak. Snakk med oss om å bygge den. |

### Site-wide replacements

| Where | Change |
|---|---|
| `referenceHouse` in `site.ts` | Becomes `adriaHouse` (name, supplier, credit, missing key, link `/husmodeller/adria/`). The `/om-oss/` section becomes "Huset i 3D-modellen": "Huset du ser bygges på forsiden er vår 3D-modell av husmodellen Adria fra Boligpartner." plus `[MANGLER]`. |
| `footer.modelCredit` | "3D-huset er vår tolkning av husmodellen Adria fra Boligpartner. [MANGLER: bekreft avtale med Boligpartner om bruk av husmodell og bilder]" |
| `missingFacts` | Add `{ key: "boligpartnerRights", label: "bekreft avtale med Boligpartner om bruk av husmodell og bilder", where: ["Forside: hero og husmodeller", "Husmodeller", "Om oss", "Footer"] }`. Rephrase `clientHouse` as "kundens egne nybygg (bilder)". |

---

## 7. Anti-AI checklist for this site

Remove or avoid, and check each one at review:

1. The hero sub "Fra sprenging og grunnmur til elektro, rør og siste strøk maling…". It puts sprenging
   at the top and is a trade list.
2. "Vi bygger hele huset." It is a generic claim.
3. The hero phone/e-mail row that duplicates the header.
4. Scrims, gradients and the radial glow behind hero text. The new hero is on paper.
5. The three-up feature row ("Én prosjektleder / Byggesøknaden ordner vi / Avtalt tid og pris").
6. Every section using the same "title left, lede right" header. Vary them (section 3).
7. The 11-step dark build section with identical alternating image/text blocks, its pulsing hotspots
   and x-ray glow lines (`el_line`, `vvs_line`).
8. Toy blob trees and visible blurry LQIP placeholders in the hero.
9. Three identical reference columns with identical meta lists, which read as a card grid.
10. Small labels above headings (eyebrows), mono or caps spec text, pill tags, "01/02/03" or
    "Steg 2 av 5" counters, decorative numerals. Facts are a `<dl>`, not a row of "159 m² · 4 · 2" chips.
11. Glass/blur panels over 3D. Panels are solid chalk.
12. Scroll-hint chevrons, bouncing arrows, "scroll to explore" text and loading spinners. If 3D is not
    ready, the photo simply stays.
13. Banned words: skreddersydd, kvalitet i alle ledd, drømmehjem, i høysetet, sømløs, helhetlig,
    unik, "vi brenner for", "løsninger" as filler, exclamation marks, buzzword triplets, em dashes in copy.
14. Every Kvalbein Korsøen mention and "Arkitekttegnet referanse – slik ville vi bygget den".
15. Brass more than once per view, and brass on paper.
16. Fake stats, years, reviews, awards or guarantee terms. Boligpartner's marketing ("VG testvinner"),
    prices and slogans. The `[MANGLER]` lines stay.
17. Supplier images that are graded, retouched or shown without "Bilde: Boligpartner".
18. A 3D twin left on screen in a rest state where a real photo exists for that view.

---

## 8. Performance budget

| Item | High (desktop GPU, fine pointer) | Low (phones, tablets, weak iGPU) |
|---|---|---|
| GLB transfer (brotli), geometry + textures, all three roofs | ≤ 1.3 MB (textures ≤ 400 KB) | ≤ 450 KB (textures ≤ 150 KB, 512² max) |
| Triangles, everything visible incl. garden | ≤ 300 k | ≤ 90 k |
| Draw calls, finished scene | ≤ 110 | ≤ 55 |
| Shader programs, incl. depth/shadow variants | ≤ 14 | ≤ 10 |
| Lights | 1 directional with shadow, hemisphere, IBL | same |
| Shadow map | 2048², `autoUpdate = false`, re-rendered on change only (end of each layer animation, roof transition, step change; once at 7.3 s in the timelapse; per 1.12 during the orbit) | 1024², same rule, once at the end of the orbit |
| AA and post | Canvas MSAA at DPR ≤ 1.5, none above; **no bloom, no post stack** | none |
| DPR | adaptive 1.0–1.75 (`PerformanceMonitor`) | adaptive 0.9–1.5 |
| GPU memory | ≤ 150 MB | ≤ 70 MB |
| 3D JS chunk | ≤ 280 KB brotli: three + R3F; drei only for small helpers, no `Environment` or HDR files | same |
| GLB fetch | After LCP, at idle: probe the tier, then start `fetch(GLB)` and `import()` of the 3D chunk **in parallel** from the page bundle (`modelSource`). Meshopt decoding with `MeshoptDecoder.useWorkers(2)`. | same |
| Shader warm-up | `compileAsync` against the real render target with **every** layer, all three roof variants, `fx_lines`, alpha-hash and shadow variants visible, during `PHOTO`, before T=0. No program may link after the timelapse starts. | same |
| Time to 3D ready (nav start → compiled first frame) | ≤ 1.8 s (cable) | ≤ 3.5 s (mid phone, 4× CPU, fast 4G) |
| Frame time in timelapse, steps and orbit | p95 ≤ 16.7 ms | p95 ≤ 22 ms (≥ 45 fps) |
| Long tasks while the timelapse runs | none > 50 ms | none > 120 ms |
| Hero LCP (the photo) | ≤ 1.2 s | ≤ 2.2 s (Lighthouse mobile, simulated) |
| CLS | 0 | 0 |
| Lighthouse mobile `/` | Perf ≥ 90, A11y 100, BP ≥ 95, SEO 100 | |
| WebGL contexts on home | exactly 1 | 1 |
| Off screen | render loop stopped; canvas disposed after 2 s and restored on return | same |

Measure with the harness (`perf3d/harness/run-all.sh <label>`, then `compare.mjs baseline <label>`).
Report the deltas for GLB bytes, draw calls, programs linked, time-to-ready and long tasks against
`baseline`. The house changed, so compare costs, not pixels.

---

## 9. Files to update alongside the code

**`DESIGN.md`**

- §Direction: the hero is now a light paper hero with a daylight 3D stage; the references band is the
  only dark band on home.
- §4 Motion: add the six behaviours from section 5.
- §5 Imagery: supplier images shown as supplied, credited "Bilde: Boligpartner", exempt from the
  render-chroma rule; the Adria credit rule, replacing the Kvalbein Korsøen one; the plate sizes.
- §7 Do/Don't: merge the anti-AI checklist (section 7).

**`HANDOFF.md`**

- Replace the reference-house decision with: "Adria: catalogue house from Boligpartner. Our 3D model is
  our interpretation; Boligpartner's four images are shown as supplied with a visible credit; the
  drawings are never published."
- Record "BEGGE DELER" (timelapse plus scroll) and the three roof types as client decisions.

**`README.md`**

- Under "Permissions still needed": "**Husmodellen Adria (Boligpartner):** written permission to
  publish the four images (`public/images/adria/`), the facts and a 3D interpretation of the house, on
  the home page and under `/husmodeller/`. The elevation drawings are used only as modelling reference.
  If permission is refused, set `supplierImagesEnabled = false`."
- Remove the Kvalbein Korsøen item once no old render remains.
- Model section: the Adria builder, the layer and suffix contract (1.13), the camera match (1.14).
- How to add a house model to `house-models.ts`.

**`scripts/README.md`:** the Adria builder, `fx_lines` and the SVG export, `uReal`, the two photo cameras.

**Renders.** Re-render from Adria, then delete the old house assets: the five step stills (desktop and
portrait), `adria-se-inn`, `adria-twin`, `adria-twin-flatt`, `adria-twin-pulttak-innkjorsel`, the
`svc-*` and `ba-*` pairs (keep their keys), and `og-image`.

---

## 10. Acceptance (what "done" looks like)

1. Open `/` at 1440 and 390.
   - The first paint is the photo plate and the H1, with no layout shift.
   - The timelapse runs and lands back on the photo without a visible pop (meets 1.14). Pause works.
2. Scroll the hero.
   - The plate opens into the full garden. Five steps, each with its own camera. `/#slik-bygger-vi`
     lands on the build part.
   - In the finale: Saltak ↔ Flatt tak at Hagen lands on image 1 and image 2; walking to Innkjørselen
     with Pulttak lands on image 3; every other combination shows "3D-modell".
   - Roof transitions are smooth, interruptible, keyboard-operable and announced. Se inn shows the
     furnished upper floor.
   - The curtain releases the page.
3. Reduced motion and `?3d=off`: static plate, stills gallery, photo-based roof switcher, same copy.
4. Sprenging, VVS, elektro, maling and mur do not appear above "Alle fagene i eget firma".
5. `/husmodeller/` and `/husmodeller/adria/` build from `house-models.ts`; the home section works with
   one model; every supplier image carries "Bilde: Boligpartner" and the `[MANGLER]` line is visible.
6. Every item in the anti-AI checklist is gone. Kvalbein Korsøen is gone everywhere.
7. Budgets in section 8 are met and reported. `npm run build` and `npm run lint` show 0 errors. The
   console is clean.
