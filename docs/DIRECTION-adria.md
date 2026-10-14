# Direction: Adria hero, "Fra tegning til hus"

Creative direction for the next round of byggrv.no (branch `claude/byggrv-redesign-e1scwk`).
It replaces the Kvalbein Korsøen reference house, the blue-hour hero and the separate
"Slik bygger vi" section. Read it together with `DESIGN.md` (tokens, type, rules) and `HANDOFF.md`
(client decisions). Where this file and `DESIGN.md` disagree, this file wins, and the implementer
updates `DESIGN.md` (see section 9).

Client brief for this round, in one line: lead with nybygg, tilbygg, påbygg and tak; build the
Adria house and its garden from the photo; use the photo itself; make the hero feel alive and
unlike anything else on the market, without looking AI-made.

## 0. Decisions at a glance

| Topic | Decision |
|---|---|
| Signature concept | **"Fra tegning til hus."** The page opens on the real Adria photo, mounted as a plate on paper. The photo dissolves into its exact 3D twin. The twin turns into a white paper model and sinks into the page, a pen draws the house in ink straight onto the paper, the lines become timber, and the house and garden build up until they land on the photo again. On scroll the plate opens up into the full world, which is bigger than the picture. |
| Hero mood | Daylight, matched to the photo. No blue hour, no day/evening toggle. The hero is on paper (light), not on a dark stage. |
| Hero structure | One pinned section with one WebGL context: intro plate and timelapse (8.3 s desktop, 6.4 s phone), then 4 build steps and a finale with the roof switcher **Saltak / Pulttak / Uten tak**, then a paper curtain releases into the page. `#slik-bygger-vi` sits on the build part. |
| Positioning | Hero and the first section sell nybygg, tilbygg og påbygg, and tak. Sprenging, grunnarbeid, VVS, elektro, maling and mur appear only in "Alle fagene i eget firma" lower down and on `/tjenester/`. |
| Home order | Hero → Dette bygger vi → Jobber vi har gjort (references) → Fra første samtale til overlevering → Alle fagene i eget firma → photo interlude → Om oss → Kontakt. |
| References | "Prosjektark": three typographic project sheets on a dark night band, loose-sheet parallax, with own photos as separate plates between them and an honest line saying the photos are from other jobs. |
| Dark band | The hero is light now. The single dark band on home is the references band (fjord night). |
| Motion system | Six named behaviours: Pust, Strek, Gardin, Lodd, Blikk, Vær (section 5). |
| Rights | The supplier render goes on the site with a visible credit and `[MANGLER: leverandør og avtale om bruk]`. The drawings are never published. A content flag swaps the photo for our own render of the twin if permission is refused (section 2.9). |
| Old house | Removed from the whole site. All renders (hero, steps, `svc-*`, `ba-*`, OG image) are re-rendered from the Adria model, and every Kvalbein Korsøen credit goes. |

---

## 1. Adria model spec (for the modeller)

### 1.1 Sources and how the dimensions were derived

Reference images (scratchpad, never published): `adria-render-saltak.jpg` and the clean crop
`adria-render-crop.png` (1260 × 816), and four pulttak elevations: `adria-fasade-langside.jpg`
(garden), `adria-fasade-inngang.jpg` (entrance), `adria-fasade-gavl-pulttak-a.jpg` (west gable) and
`-b.jpg` (east gable, the recessed one). My measurement crops and the camera fit are in
`/tmp/claude-0/-home-user-WEBSITES/b52489a3-dfad-5be2-b7ef-4b1d7307930f/scratchpad/adria-run/direction/measure/` and `.../direction/camsolve/`
(`solve.py`, `overlay.png`, `place.py`).

**Scale.** All four elevations are screenshots at the same drawing scale. Three independent checks agree:

1. The garden-side ground-floor door and the entrance door measure 57.5 × 124 px. That is the
   standard 10 × 21 module (1.0 × 2.1 m outer frame), so the scale is **≈ 58.7 px/m**.
2. The vertical cladding lines on the garden elevation repeat every 7.3 px (124 boards across the
   facade). At 58.7 px/m that is a c/c of about 125 mm, which is right for 19 × 148 mm standing boards.
3. The fitted camera (1.4) puts the eaves at +6.03 m, and the drawings give 5.8 to 6.1 m for the
   low side of the pulttak.

**Results.** The long side is 913 px, which gives **15.60 m**. The gable is 458 px, which gives
**7.80 m**. Floor to floor is 178 px, which gives **3.05 m**. The pulttak high side is 446 px above
the terrain (**7.6 m**) and the low side is 357 px (**6.1 m**). The rise is 1.5 m over 7.8 m, so the
pulttak pitch is **10.9°**.
The saltak pitch is not in the drawings. The camera fit to the render gives **34°** (ridge +8.67).
Footprint: 15.6 × 7.8 = 121.7 m² gross per floor, less the two loggias. That gives about
**175–185 m² BRA** over two floors, consistent with a catalogue house of this size.

The drawings win on plan positions and the render wins on the saltak look. Where they differ
(railings: vertical balusters in the drawings, glass in the render), use the render, because
the hero matches the render.

### 1.2 Coordinate system and levels

Metres, y up. The origin is the centre of the main volume's outer cladding footprint at
ground-floor finished floor level (FFL ±0.00).
**+x = east**, towards the recessed gable. **+z = south**, which is the garden side the photo looks at.
**−z = north**, the entrance side.

| Level | y (m) |
|---|---|
| Terrain at the house (lawn at the deck edge) | −0.35 |
| Plinth band (dark grey render, visible 0.30) | −0.35 … −0.05 |
| Deck top, entrance landing top | −0.05 |
| Ground FFL | ±0.00 |
| Upper FFL | +3.05 |
| Top of wall / eaves line (both variants share the walls up to here) | +6.00 (fit +6.03) |
| Saltak ridge, outer roof surface at the verge | +8.65 (34°, roof build-up 0.30) |
| Saltak chimney top | +9.75 |
| Pulttak low edge (north, entrance side) | +5.95 |
| Pulttak high edge (south, garden side) | +7.45 |
| Pulttak chimney top | +7.60 |

### 1.3 Volumes

The house reads as **a warm timber frame with dark recesses cut into it**. The outer volume
(15.60 × 7.80 m, two storeys) is clad in natural wood. Two recesses go through both storeys and are
lined in charcoal:

- **R1, east loggia** (the render's framed gable): x ∈ [+5.83, +7.80], the full gable width.
  The recess back wall is at x = +5.83, so the loggia is 1.97 m deep including the frame.
  - It opens to the east between frame columns, z ∈ [−3.48, +3.47] (6.95 m). Columns are 0.42 × 0.42.
  - It also opens on the garden face, x ∈ [+5.83, +7.38]. The corner column is x ∈ [+7.38, +7.80].
  - The entrance (north) side is closed.
  - Upper floor: a covered balcony, floor at +3.05, with a glass railing 1.00 m high along both open sides.
  - Ground floor: a covered terrace at deck level.
  - In saltak, the frame follows the gable outline as a 0.42 m wood band under the verge (the
    "picture frame" in the render). The triangular soffit inside it is charcoal.
- **R2, west loggia** (garden side, west end): x ∈ [−7.41, −2.96] (4.45 m), z ∈ [+1.60, +3.90] (2.30 m deep).
  - It opens to the garden and to the west, z ∈ [+1.60, +3.49]. The corner column is
    x ∈ [−7.80, −7.41] × z ∈ [+3.49, +3.90].
  - Upper floor: a loggia with a glass railing (1.00 m).
  - Ground floor: a covered porch.

### 1.4 Cladding zones

| Zone | Material |
|---|---|
| Every outer face of the main volume, the R1 gable frame and all four column faces | Natural wood (`cladding_wood`) |
| Every face inside R1 and R2: back walls, side walls, soffits | Charcoal (`cladding_charcoal`) |
| Garden face, upper: panel x ∈ [−1.02, +0.91], from upper FFL to the window head (+5.65) | Charcoal |
| Garden face, ground: panel x ∈ [+2.95, +3.95], 0.00 … +2.12 | Charcoal |
| Plinth | Dark grey render |

Both claddings are standing boards at a 125 mm module with a visible shadow gap. For the gap, use
geometry relief on the high model, or a tiling normal map. Give every board its own tone through
vertex colour, ±7 % value and ±3° hue for wood, ±3 % for charcoal.

### 1.5 Window and door schedule

All frames are slim anthracite: 60 mm face, 40 mm mullions. Glass is set 90 mm back from the cladding
face, with a 40 mm reveal trim in anthracite. Sill and head heights are relative to that storey's FFL.

**Garden face (z = +3.90)**, west to east

| Id | Storey | x range | Size / heights | Notes |
|---|---|---|---|---|
| G1 | ground | in R2, on the back wall z = +1.60: door x [−6.76, −5.84], fixed glass x [−5.60, −4.60] | head 2.12 | porch entrance |
| G2 | ground | [−1.85, −1.02] | 0.00 – 2.12, transom at 1.35 | tall window |
| G3 | ground | [−0.87, +2.61] | 0.00 – 2.12, two sliding panels | opens under the pergola |
| G5 | ground | [+3.95, +4.81] | 0.00 – 2.12 | next to the charcoal panel |
| G6 | ground | [+5.83, +7.38] | open | side opening of R1 |
| U1 | upper | in R2, on the back wall: door x [−6.76, −5.86], window x [−5.80, −4.68] | head 2.60, top light 2.12 – 2.60 | loggia access |
| U2 | upper | [−1.91, −1.02] | 0.00 – 2.60, two panes | narrow stack |
| U4 | upper | [+0.91, +4.81] | 0.00 – 2.60; panes [0.91–2.36], [2.36–3.81], [3.81–4.81] with a transom at 1.90 | the big window block |
| U6 | upper | [+5.83, +7.38] | open, glass railing | side opening of R1 |

**Entrance face (z = −3.90)**

| Id | Storey | x range | Size / heights | Notes |
|---|---|---|---|---|
| N1 | both | [+1.33, +2.23] | ground 0.00 – 2.15; upper 0.07 – 2.15, two panes each | window stack |
| N2 | ground | [−2.68, −1.35] | head 2.13 | door 0.90 plus a 0.40 sidelight. The leaf has three small square lights stacked vertically. |
| N3 | upper | [−2.22, −1.31] | 0.07 – 2.15 | above the door |
| — | ground | x ≈ +2.83, y ≈ +2.3 | 0.25 × 0.25 | vent grille |
| — | ground | x [+0.13, +0.56], 0 … 1.35 | | dark technical cabinet on the wall (optional) |

Entrance canopy: x [−2.75, −1.30], 0.90 deep, underside at +2.40. It is a black steel plate 60 mm
thick, with one diagonal tie rod back to the wall at +3.05.
Entrance landing: x [−3.36, −0.72], 1.20 deep, top −0.05, dark concrete, with one step.

**West gable (x = −7.80)**

| Id | Storey | z range | Size / heights | Notes |
|---|---|---|---|---|
| W1 | both | [−1.60, −0.73] | ground 0.00 – 2.13; upper 0.00 – 2.40, two panes each | window stack |
| — | both | [+1.60, +3.49] | open | side opening of R2 |

**East gable, recessed wall (x = +5.83)**

| Id | Storey | z range | Size / heights | Notes |
|---|---|---|---|---|
| E1 | ground | [+0.75, +2.67] and [−2.88, −0.96] | head 2.12 | two pairs of glazed double doors to the covered terrace |
| E2 | upper | [−1.20, +1.20] | from FFL up into the saltak apex, triangular top following the soffit, 3 mullions | the render's tall gable glazing. In pulttak the top follows the 10.9° slope instead. |
| E3 | upper | [+1.60, +2.50] | | door to the balcony |

The rest of the recessed wall is charcoal with two black wall lights.

Wall lights: small black cube sconces (0.12 × 0.20 × 0.10), as in the render.
Positions: either side of G3 at +2.4, beside U4 at +4.3, beside the R1 openings, and beside N2.

### 1.6 Roof variants

Each roof is its own group so the switcher can lift it away (section 2.6). Each group holds its rafters,
sarking, roofing, fascia, gutters, chimney and the upper-floor ceiling.

| | Saltak (hero, matches the render) | Pulttak (matches the drawings) |
|---|---|---|
| Pitch | 34° (fit; keep within 33–36° while camera-matching) | 10.9° |
| Ridge / edges | Ridge along x at z = 0, +8.65 | Low edge north +5.95, high edge south +7.45 |
| Overhangs | Eaves 0.30 on the long sides; verge 0.10 (the R1 frame sits flush under it) | 0.15 all round |
| Roofing | Dark concrete tiles, profiled in courses every 0.34 m along the slope, slight sheen | Dark standing-seam steel, seams every 0.50 m |
| Edges | Black fascia 0.20, black half-round gutter, black downpipes at the four corners, roof hooks in two rows | Black 0.25 fascia/parapet flashing on all sides, gutter and downpipes on the north side |
| Walls added by the variant | Gable triangles, wood on the west gable and the R1 frame plus charcoal soffit on the east | The wall band on the garden side rises from +6.00 to +7.45, plus trapezoid gable infills (pulttak group, wood) |
| Chimney | Stainless flue Ø 0.20 with a 0.30 rain cap and a base flashing cone, x = +5.5, z = −0.2, top +9.75 | Same plan position, top +7.60 |

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
- **Planter in front of the deck**: black steel box, 0.45 high, x [+0.80, +6.00], z [+7.40, +8.40].
  Planted with lavender and ornamental grass.
- **Outdoor furniture**
  - Under the pergola: oak dining table 2.40 × 0.95 with eight black chairs.
  - On the deck: a black kettle grill cabinet (1.2 × 0.6 × 1.15) at about (+1.6, +7.0).
  - East deck: a three-seat sofa, two armchairs, an ottoman and a coffee table (white cushions, black
    frames), around (+10, −2) to (+12, +2), plus three round anthracite planters (Ø 0.6) with bushes.
  - R1 upper balcony: two lounge chairs, a small table and black pots with plants.
- **No people.** The photo has rendered people; the 3D twin never does.

### 1.8 Outbuilding (pool house)

A black-stained timber building west of the house and slightly in front of it. Centre ≈ (−16, ·, +7);
long axis along x; front facing +z.

- An enclosed box, 4.0 (x) × 3.5 (z) × 3.4 m high, at the west end.
- A flat-roofed canopy running east from it to x ≈ −10. The roof edge is at +2.7 with a 0.25 black
  fascia, on three posts.
- A horizontal-slat screen along the back. Slats are 45 mm with 60 mm gaps.
- A raised platform under the canopy with two lounge chairs, a low table and a black planter.

This element sits near the horizon in the photo, so its depth is poorly conditioned. Place it by
overlay: its left edge must land at crop x ≈ 60 and its canopy's right end at x ≈ 320.

### 1.9 Upper-floor interior (seen in "Uten tak")

Simple, warm and furnished like a good interior magazine, not a showroom. Partitions are 0.10 m.
Wall tops are cut at +2.50 above upper FFL. Their **cut faces are ink #161C1E**, which gives a crisp
plan-drawing look from above and echoes the drawing concept.

| Room | Extent (x; z) | Contents |
|---|---|---|
| Main bedroom (northwest) | [−7.60, −3.00]; [−3.70, +1.50] | 180 bed with linen, two side tables, a wardrobe wall. Door to the R2 loggia in the wall at z = +1.60. |
| Bathroom | [−3.00, −0.40]; [−3.70, −0.90] | Freestanding tub, double oak vanity, a walk-in shower with a glass screen |
| Stair and hall | stair runs along x from −0.40 to +3.00, z [−0.90, +0.10] | Oak treads, glass balustrade |
| Bedroom 2 | [+1.20, +3.60]; [−3.70, −1.00] | 120 bed, desk |
| Bedroom 3 / office | [+3.60, +5.63]; [−3.70, −1.00] | Daybed, shelf |
| Allrom (south, open) | [−2.96, +5.63]; [+0.10, +3.70] | An oak table for six behind U4 (the render shows chairs there), a bookshelf behind the charcoal panel, an armchair and floor lamp at U2, and a sofa, rug and coffee table facing the E2 glazing |

Palette:

| Element | Colour |
|---|---|
| Oak floor | #C9AE88 |
| Walls | #EEECE6 |
| Linen | #DCD5C9 |
| Warm grey | #8E8A84 |
| Charcoal | #2E3033 |
| Plant green | #3E5233 |
| Lamps | emissive #FFE2B8, low in daylight |

The ground floor only needs what shows through the glass: a living room behind G3 (sofa, rug, a lamp),
a kitchen island, pendants, and ceilings at +2.70. Merge it into one or two meshes.

### 1.10 Materials (sampled from the render)

The *seen* column is the median sRGB colour in the photo. The *albedo* column is the base colour to
set (sRGB). Tune albedo until the twin's render matches the seen value under the day rig (section 1.12).

| Material | Seen in photo | Albedo | Roughness / metalness |
|---|---|---|---|
| `cladding_wood` (natural larch/oak stain) | sun #BEA080, shade #8C6C4A | #A57E57 | 0.78 / 0 |
| `cladding_charcoal` | sun #3B3D40, recess #1D1C18 | #2C2E30 | 0.70 / 0 |
| `roof_tile` | #464346 | #2B2A2D | 0.55 / 0 |
| `roof_steel` (pulttak) | | #2A2B2D | 0.45 / 0.4 |
| `flashing` (fascia, gutters, downpipes) | #67645E (sky reflection) | #1E1F21 | 0.45 / 0.5 |
| `frame_anthracite` (windows, doors) | #524F4B | #2F3032 | 0.50 / 0.2 |
| `glass` | dark with tree reflections | #0E1214, opacity 0.35, env reflections; a dark green band at the horizon of the env (#2F3A25) imitates the reflected treeline | 0.05 / 0 |
| `glass_rail` | | #9FB3A8, opacity 0.18 | 0.05 / 0 |
| `steel_black` (pergola, canopy, posts, sconces) | #2E2B27 | #1F1E1C | 0.45 / 0.6 |
| `chimney_steel` | #868A95 | #8C9097 | 0.35 / 0.8 |
| `deck` | #524740 | #5B4A3D | 0.80 / 0 |
| `slab` (terrace stone) | sun #79716C | #56534F | 0.85 / 0 (joints 5 mm, #2B2A28) |
| `plinth` | | #6A6864 | 0.90 / 0 |
| `lawn` | sun #838B40, far #8C9444, shade #323D18 | #6F7B35, with world-space variation between #7F8B3F and #5E6A2C | 0.95 / 0 |
| `hedge` | #434C23 | #3F4A22 | 0.90 / 0 |
| `birch_crown` / `broadleaf_crown` | #6A7147 / #51592B | #6A7147 / #4E5A2B | 0.90 / 0 |
| `birch_bark` | | #E6E2D8 with black marks in vertex colour | 0.80 / 0 |
| `cushion` | #D9D1CB | #DCD5CE | 0.95 / 0 |
| `outbuilding` | #1A1E16 | #1C1F1A | 0.80 / 0 |
| Planting | | lavender #7A6E96 (keep it low-chroma), grass plumes #B9B08A, white shrub blossom #E9ECE4 on #4F5B33, box/green shrubs #3F4D2A, hosta #6E8150 | |

Textures are allowed only where they earn their bytes. Budget: at most six WebP textures inside the GLB
(`EXT_texture_webp`), each 1024² or smaller:

- a cladding groove normal map
- a roof course normal map
- a lawn detail texture
- a leaf-card atlas
- an impostor atlas (lite)
- a baked ground-shadow and AO texture for the trees and the outbuilding, which never move

Everything else is flat PBR plus vertex colour, as before.

### 1.11 Garden and environment (from the photo, lean)

Positions come from back-projecting the photo with the fitted camera. Terrain heights are assumptions,
so tune them in overlay.

- **Terrain.** A gentle fall from the house to the camera. Lawn at −0.35 along the deck, falling to
  −1.30 at the foreground terrace. The lawn runs from x −30 to +45 and z −33 to +28.
- **Foreground terrace** (dark slabs 0.6 × 1.2): about x [17, 25], z [11, 26], top −1.30. On it:
  - two white loungers (black aluminium frames, backrests at the east end) around (22, 14) to (22, 21)
  - a black lantern side table at ≈ (23, 14.7)
  - a dark slab path leading west from its south-west corner
- **Planting beds.** All plants are instanced; each one grows from its own birth time (section 2.3).
  - Around the foreground terrace, east and south: white spiraea, ornamental grass plumes, lavender,
    hosta and box balls.
  - In front of the deck: the steel planter.
  - A curved bed west of the deck in front of the outbuilding (photo x 230–400): lavender spikes,
    grass plumes, low shrubs.
- **Hedge.** About 1.8 m high and 0.9 m deep, along z ≈ −33 from x −5 to +45 (behind the house to the
  north-east; it reads to the right of the house in the photo).
- **Trees.** High: 14 instanced trees. Lite: 8, as impostors.
  - 6 birches with white trunks and airy crowns. Some sit near the left photo edge; one stands behind
    the house left of the right-hand trees.
  - 6 broadleaf trees: a large dark group east and north-east behind the hedge, x 18–40, z −45 to −15.
  - 2 spruces (the dark pointed tree at photo x ≈ 1150).
  - Crowns are leaf-card clusters with alpha hash, not displaced blobs. The old blob trees read as toys.
- **Framing foliage near the camera.** Large leaves at the right photo edge, ≈ (29.7, 0 … 2, 30.1).
  Tall grass blades and hosta at the bottom-left, ≈ (24, −1.3, 27). These exist only for the photo
  framing; fade them out when the stage expands.
- **Backdrop.** Three low-poly silhouette layers with aerial perspective (fog towards #DCE6EE), no images:
  1. a deciduous tree band at about 250 m
  2. the forested hillside rising to the west (left in the photo) at 1.5–2.5 km
  3. a faint far ridge
- **Sky.** A shader dome, no texture:
  - gradient zenith #7FA1D2, mid #A6C5EB, horizon #EEF3F8
  - fbm cumulus clouds, white with soft blue-grey bases, roughly where the photo has them
  - clouds drift (behaviour Vær)
  - the same shader produces the PMREM environment once at load

### 1.12 Light rig (day only)

- **Sun:** directional, warm white #FFF4E2. Direction *from* the sun ≈ normalize(−0.55, 0.72, +0.42),
  i.e. from the south-west, about 46° high. That lights the garden face and leaves the east gable in
  soft shade, as in the photo. The pergola shadows fall diagonally down to the right on the facade.
- **Fill:** hemisphere light, sky #BBD3EE, ground #6C7040, plus IBL from the sky PMREM.
- **Tone mapping:** AgX or ACES. Pick the one that matches the photo histogram after grading (section 2.9).
- **No point lights.** Interior lamps are emissive only.
- **Shadows:** one 2048² map (1024² on lite) with a tight frustum of ±14 m around house, deck and pergola,
  updated only on change (section 8). Trees and the outbuilding get their shadows from the baked
  ground texture.

### 1.13 Build layers and file contract

Output files: `public/models/adria.glb` (high), `adria-lite.glb` and `adria.meta.json`.
Keep the builder procedural and deterministic, as `scripts/model/` is today. Add `scripts/model/adria/`.
Once nothing references the old `house*.glb`, delete them.

| Group (node) | Contents | Used by |
|---|---|---|
| `env_*` | terrain, lawn, hills, trees (instanced), hedge, outbuilding, foreground terrace | always (outbuilding and terrace also join the garden phase) |
| `draw_site` | site-plan lines: footprint outline, dashed setback lines | timelapse and step 1. Hidden from step 2. |
| `draw_lines` | ink linework of all four elevations, generated from the model. Outlines, openings, every fourth cladding board, roof and chimney. A per-vertex `_ORDER` (0..1) sets the drawing order: footprint, then walls from the ground up, openings, cladding, roof, chimney. Lite keeps outlines and openings only. | timelapse |
| `layer_grunnmur` | ringmur/slab, plinth, radon-membrane edge | step 1 |
| `layer_reisverk` | studs, plates, joists, saltak rafters (pale spruce #D8C29E) | step 2 |
| `layer_tett` | wind barrier (#232425, slight sheen), windows, doors | step 3 |
| `roof_saltak`, `roof_pulttak` | see 1.6 | step 3 and the finale |
| `layer_kledning` | both claddings, trims, railings, sconces, entrance canopy | step 4 |
| `layer_interior` | floors, partitions, furniture on both floors | step 4 |
| `layer_ute` | deck, steps, pergola, planter, outdoor furniture | finale |
| `layer_hage` | planting (instanced), loungers, side table, framing foliage | finale |

Each layer node carries `extras { birth: [t0, t1] }` for the timelapse and
`extras { grow: "up" | "wipe-x" | "wipe-roof" | "scale" }` for how it appears.
Instanced plants carry a per-instance `aBirth` attribute.

`adria.meta.json` holds:

- `bbox`
- `floors`
- the solved `camera.photo` (section 1.14)
- `camera.steps.<id>.{desktop,mobile}` and `camera.finale`, `camera.finaleUtenTak`
- the light rig
- `stats` (bytes, triangles, draw calls)
- `variants` (high/lite URLs)

### 1.14 The camera match (the modeller must solve this)

First estimate, a least-squares fit over 10 points, RMS 3.1 px (`camsolve/overlay.png` shows the
wireframe on the photo):

| Parameter | Value |
|---|---|
| Position | (31.24, 0.87, 34.11) |
| Rotation | yaw (rotation.y) **+43.27°**, pitch 0, roll 0. The photo is a two-point perspective, so verticals are vertical. |
| Focal length | 1432.9 px for the 1260 px-wide crop, about 41 mm on full frame |
| Principal point | (630.0, 492.8) in crop pixels. The crop is the top 816 px of a virtual 1260 × 985.6 frame centred on the optical axis. The screenshot cut the render at the bottom. |
| three.js | `fov = 37.95` (vertical, full virtual frame), `aspect = 1.2784`, `setViewOffset(1260, 985.6, 0, 0, 1260, 816)` |
| Fitted heights | eaves +6.03, saltak ridge +8.67 |

Control points (crop pixels, ±3 px as measured):

| Point | World | Photo |
|---|---|---|
| Near corner, eaves | (+7.80, eaves, +3.90) | (764, 301.5) |
| Near corner, deck | (+7.80, −0.05, +3.90) | (775, 524) |
| West corner, eaves | (−7.80, eaves, +3.90) | (404, 339) |
| West corner, deck | (−7.80, −0.05, +3.90) | (405, 525) |
| East gable far corner, eaves | (+7.80, eaves, −3.90) | (925, 322.5) |
| East gable far corner, deck | (+7.80, −0.05, −3.90) | (922, 520) |
| Gable apex (outer verge) | (+7.80, ridge, 0) | (850, 221) |
| Ridge, west end | (−7.90, ridge, 0) | (491, 275) |
| Pergola west post, base / top | (−2.20, −0.05 / +2.80, +6.85) | (439, 525) / (435, 429) |
| Chimney top | (+5.5, +9.75, −0.2) | (786, 194) |
| Checks that already line up | R2 opening, R1 side opening, window block U4 | (410–497), (710–755), (583–683) |

Procedure:

1. Render the twin at 1260 × 816 with the photo camera.
2. Overlay it at 50 % on the photo and run an edge diff (`perf3d/harness/shotdiff.mjs`, or a small
   Canny script).
3. Iterate camera position, yaw, focal length and principal point first. Only then nudge the free
   heights (eaves, pitch, chimney) within the ranges in 1.2 and 1.6.

**Acceptance:**

- House edges ≤ 2 px RMS and ≤ 4 px max on the control points.
- Pergola and deck ≤ 6 px.
- Garden elements in the same places to within about 20 px.
- Mean CIEDE2000 between the graded photo and the twin render: ≤ 8 on the house, ≤ 10 on the lawn,
  ≤ 8 on the sky.

When those hold, the photo crossfade does not pop. Write the result into `adria.meta.json` as `camera.photo`.

---

## 2. Hero choreography

### 2.1 Architecture

**One canvas for the whole hero.** One full-viewport `<canvas>` sits inside the sticky inner wrapper
of a tall pinned section (`#topp`). Visible area:

- In the intro, the visible area is a **clip rect** (the plate). The renderer uses
  `setScissor`/`setViewport` to that rect, so the pixel cost scales with what is visible.
- The camera maps the plate rect to the photo frame with `setViewOffset`. The virtual full frame is
  `1260·s × 985.6·s`, where `s` = plate CSS width / 1260 (or the crop width on phones). It is
  positioned so the photo frame coincides with the plate.
- Expanding the stage means growing the clip rect to the viewport. Because the frustum is the same,
  the world outside the photo's edges simply appears.

States, in order:

1. `PHOTO`
2. `TWIN`
3. `TIMELAPSE`
4. `REST` (photo on top)
5. `LIVE` (pointer on the plate)
6. `EXPAND`
7. `STEPS`
8. `FINALE`
9. `RELEASED`

The render loop only runs while something changes or a behaviour is active. It stops in `REST`
when the photo is fully opaque, and whenever the hero is off screen.

### 2.2 First paint (LCP-safe, no JavaScript needed)

Desktop at 1440 × 900:

```
| logo                    nav                                    phone  mail |
|                                                                             |
| Fra tegning til hus.                                        (H1, one line)  |
|                                                                             |
| sub (3 lines)            ┌──────────────────────────────────────────────┐   |
|                          │                                              │   |
| [Book en uforpliktende   │   PLATE: the Adria photo, 880 x 570          │   |
|  samtale  →]             │   (cols 5-12, aspect 1260:816)               │   |
| Se hvordan vi bygger ↓   │                                              │   |
|                          └──────────────────────────────────────────────┘   |
|                          caption rail / credit line            Pause / Se igjen |
```

- **Background:** paper #EDE8DF. Header in its light variant (ink on paper).
- **H1:** "Fra tegning til hus." Newsreader 300, one line from 1024 px up
  (`clamp(3.25rem, 8.2vw, 7.75rem)`, about 118 px at 1440), tracking −0.035em. On phones it breaks
  into two lines: "Fra tegning / til hus." The hero reveal uses the existing `IntroText` with
  `immediate`: words rise 700 ms ease-expo with a 60 ms stagger. The text is never hidden behind
  the reveal for LCP purposes.
- **Plate**
  - Columns 5–12, 880 px max (the container caps at 1440, so the plate never exceeds 880 CSS px). At
    DPR 2 that is 1.4× the 1260 source, which is acceptable for a soft photoreal render. It never
    grows beyond this; the 3D takes over at larger sizes.
  - A 1px `rule` passepartout line 10px outside the photo gives the mounted-print, tactile feel.
  - The plate has a fixed aspect box, so CLS is 0.
- **Photo:** `<picture>` with AVIF/WebP at 640, 960 and 1260. On phones a square crop at 480 and 816.
  `fetchpriority="high"` and a preload. The photo is graded once at encode time (2.9), with no CSS
  filter. It is the LCP element.
- **Left column (cols 1–4), top-aligned with the plate:** the sub, the primary CTA (solid ink button;
  brass is not used on paper) and the secondary link "Se hvordan vi bygger".
- **Under the plate:** the caption rail (empty until the timelapse runs) and the credit line, always
  visible: "Illustrasjon: husmodellen Adria. [MANGLER: leverandør og avtale om bruk]".
- **Removed from the hero:** the phone/e-mail row (the header already has both), all scrims and
  gradients, and the old architect credit.
- **Tablet (768–1023):** the H1 takes two lines; the plate spans 8 columns at full photo aspect; the
  sub and CTAs sit below it.
- **Phone (< 768)**
  - Header 64.
  - H1 two lines.
  - The plate is the **square crop** (photo x 250–1066, full height) at full content width
    (358 × 358 at 390), capped at `min(100vw − 32px, 46svh)`.
  - Below it: the caption and credit, the sub, then "Se hvordan vi bygger".
  - The primary CTA lives in the existing mobile action bar.

### 2.3 The self-building timelapse (desktop 8.3 s)

**Start** when all of these hold:

- the 3D is ready (GLB parsed and every program compiled, see 8)
- at least 900 ms have passed since LCP
- the hero is in view and the tab is visible
- the page has not scrolled more than 10 % of the viewport
- reduced motion is not set

If the 3D is not ready 6 s after LCP, skip the timelapse. The photo stays and the 3D attaches
quietly for scrolling.

**Interruptions**

- If the visitor scrolls during the timelapse, fast-forward the remaining timeline in 400 ms to the
  finished state, then hand over to `EXPAND`.
- If the tab is hidden, pause.
- The **Pause** button is mandatory (WCAG 2.2.2, because the motion runs over 5 s next to other content).

T = 0 is the start. "Ease" names refer to DESIGN.md tokens. Every material gets two injected
uniforms through `onBeforeCompile`, at no program cost:

- `uReal` (0 = clay/paper, 1 = real material)
- a world-space wipe, so material changes never swap programs

| t (s) | Phase | World | Camera | UI |
|---|---|---|---|---|
| 0.00–0.70 | **Tvilling** | The photo dithers away over the identical 3D twin. A 64² blue-noise threshold flips pixels instead of a soft fade. Clouds start drifting and leaves start moving. | photo camera | — |
| 0.70–1.60 | **Til papir** | `uReal` 1 → 0 as a top-down wipe (roof first, ease-glide). The house and garden become a white study model (#EAE5DC). The sky lerps to paper #EDE8DF and the ground to paper-deep #E3DDD1. Shadow intensity drops to 0.35. From 1.2 s the passepartout line fades out, so **the plate dissolves into the page**. | photo camera | the caption rail line starts drawing; "Tegningen" fades in at 1.3 s |
| 1.40–2.30 | **Tilbake** | The model sinks into the page in reverse build order: hage, ute, interior, kledning, roof, tett, reisverk. Each layer scales Y to 0 from its base over 120 ms, staggered 90 ms (power3.in). Plants shrink from far to near. Trees and hills stay as pale silhouettes at 25 % contrast. | — | — |
| 2.30–3.60 | **Tegningen** | `draw_site` and then `draw_lines` draw on in ink (#161C1E at 85 %, 1px hairlines), following `_ORDER` (sine.inOut). It looks like a pen **drawing the elevations straight onto the website's own paper**. | 3 % push-in, linear | — |
| 3.60–4.70 | **Reisverket** | `layer_grunnmur` rises 0.3 m. Studs grow from the sill plates along the drawn lines, staggered west to east over 0.6 s (ease-expo). Joists slide in and rafters rise from eaves to ridge. The pale spruce is `uReal` 1 for the frame only. The ink lines fade as members cover them. | holds | "Reisverket" |
| 4.70–5.60 | **Taket** | The wind barrier wraps the facades (a wipe around the perimeter). Roofing sweeps from eaves to ridge (`wipe-roof`). The chimney rises. Windows appear, and a single specular glint crosses the glass (env rotated 8°). | holds | "Taket" |
| 5.60–6.50 | **Kledningen** | The cladding wipes across the facades west to east (ease-glide), with charcoal following 120 ms behind. Railings, fascia and gutters come next. The sky returns from paper to blue (900 ms). The passepartout line returns. | holds | "Kledningen" |
| 6.50–7.50 | **Hagen** | The lawn colour spreads out from the house (radius 0 → 60 m, ease-expo). Deck boards stagger in. Pergola rafters settle from 60 mm above (ease-weight, no bounce). Plants grow by distance from the house. Furniture settles. Shadow intensity returns to 1. The shadow map renders once at 7.3 s. | holds | "Hagen" |
| 7.50–8.30 | **Virkeligheten** | The photo dithers back in (blue-noise threshold, 800 ms, ease-weight). | eases onto the exact photo camera | the rail completes and the caption crossfades to the credit line. "Se det igjen" fades in (450 ms). |

The text column never moves during the timelapse. Only the plate and its caption rail change.

**After the timelapse (`REST` / `LIVE`, desktop with a fine pointer only)**

- When the pointer enters the plate, the photo fades out over 300 ms and the live twin takes over.
  It follows the pointer (behaviour **Blikk**).
- When the pointer leaves, the camera eases back to the photo pose in 900 ms and the photo fades in
  over 400 ms.
- The effect is a photograph that turns its head when you look at it.
- Touch devices stay on the photo until they scroll.

**Phones (6.4 s, lite model)**

| t (s) | Phase |
|---|---|
| 0–0.5 | Tvilling |
| 0.5–1.2 | Til papir |
| 1.0–1.7 | Tilbake |
| 1.7–2.7 | Tegningen (outlines and openings only) |
| 2.7–3.5 | Reisverket |
| 3.5–4.2 | Taket and windows |
| 4.2–4.9 | Kledningen and sky |
| 4.9–5.7 | Hagen (40 % of plant instances) |
| 5.7–6.4 | Virkeligheten |

### 2.4 Expansion: the world is bigger than the picture

Scroll range 0–80 vh of the pinned section.

| Range | What happens |
|---|---|
| 0–40 vh | The photo fades out within the first 5 %. The clip rect grows from the plate to the full viewport (corners stay square) and the frustum stays put, so the garden continues past the photo's edges. The H1, sub and CTAs move up 40 vh and fade (they are not pinned). The caption and credit fade. The framing foliage fades out. |
| 40–80 vh | The house **rewinds to step 1**: layers retract in reverse, scrubbed. The camera rises to the step-1 view. The skip link "Hopp over byggingen" becomes reachable here. **`#slik-bygger-vi` anchors at 40 vh.** |

### 2.5 Pinned build steps (four plus the finale)

Each step gets 90 vh on desktop and 70 vh on phones.

- In the first 40 % of a step's range the camera travels.
- In the first 60 % the layer is scrubbed in.
- The last 40 % holds still for reading.

The steps are a semantic `<ol>` in the DOM. The current step is visible; the others stay in the
accessibility tree.

Step panel (desktop):

- A solid chalk label: columns 1–4, 2rem from the bottom-left, no blur and no shadow.
- Contents: the rail of step names, then the title (`t-display-s`), the two-sentence body and the skip link.
- The rail is the five step names in a row. The current one is ink and the others ink-soft. A 1px
  ink hairline glides under the current name (450 ms ease-glide). Each name is a button that scrolls
  to its step (Lenis `scrollTo`, 1.2 s).
- Step text changes with a crossfade and a 12px rise, 450 ms ease-weight.

Phones: the panel is a chalk bottom sheet covering the lowest 40 % of the stage, with the rail as one
line of five names in 13px. The stage frames the house in the upper 60 % using a view offset.

| Step (rail label) | Layers | Desktop camera (pos → target, vertical fov) | Phone camera |
|---|---|---|---|
| Søknad og grunnmur (Grunnmur) | `draw_site` on the lawn, `layer_grunnmur`. The garden stays: lawn, trees, hedge, but no planting or deck yet. | (16, 22, 22) → (0, 0, 0), fov 35, high 3/4 | (20, 30, 28) → (0, 0, 0), fov 45 |
| Reisverket (Reisverk) | `layer_reisverk` | (−18, 3.5, −20) → (0, 3.5, 0), fov 40, north-west, entrance side, frame against the sky | (−24, 5, −27) → (0, 4, 0), fov 50 |
| Tett hus | `layer_tett`, `roof_saltak` | (22, 2.0, 8) → (6, 4.2, 0), fov 40, low on the recessed east gable | (27, 3, 12) → (5, 4.5, 0), fov 50 |
| Kledning og innredning (Kledning) | `layer_kledning`, `layer_interior` | a lateral dolly along the garden facade from (−6, 2.5, 14) to (4, 3, 13), target 2 m ahead on the facade at y 3, fov 38 | (−4, 3, 20) → (2, 3, 0), fov 48 |
| Nøkkelferdig | `layer_ute`, `layer_hage` | (26, 7, 30) → (0, 3, 0), fov 38, the hero 3/4 but closer and higher than the photo | (30, 10, 38) → (0, 3.5, 0), fov 46 |

Camera moves are scrubbed with GSAP ScrollTrigger (`scrub: 0.6` on desktop). On touch devices,
damp them in the render loop instead (lerp `1 − e^(−dt/0.25 s)`) so native scrolling stays smooth.

### 2.6 The finale: roof switcher

Pinned for 120 vh (desktop) or 100 vh (phone), so there is time to play.

**Panel contents**

1. Title "Nøkkelferdig" and the body.
2. The switcher: a segmented `radiogroup` with legend "Tak" and three native radios, each 44px tall:
   **Saltak · Pulttak · Uten tak**. The thumb glides between them (450 ms ease-glide).
3. The helper line.
4. The CTA "Book en uforpliktende samtale" (solid ink).
5. The credit: "Illustrasjon basert på husmodellen Adria, ikke foto fra et ferdig prosjekt.
   [MANGLER: leverandør og avtale om bruk]".

A polite live region announces each change. Arrow keys move between options.

**Transitions.** They feel like a model-maker lifting the roof off an architectural model: no hard
swaps, and no transparency sorting.

- Fades use `alphaHash` dithering.
- Every transition is interruptible: the newest choice wins and retargets from the current state.
- The shadow map re-renders once at the end of each transition.

| From → to | Total | What happens |
|---|---|---|
| Saltak → Uten tak | 1100 ms | 0–500 ms: the roof group, ceiling included, lifts +1.2 m (ease-expo). 350–1100 ms: it keeps rising to +2.5 m and dithers out. The camera rises to (18, 16, 20) → (0, 4, 0) with ease-glide, so you look down into the furnished upper floor with its ink-cut wall tops. Phone camera: (22, 22, 26) → (0, 4, 0). |
| Uten tak → Pulttak | 1000 ms | The pulttak wall band grows from +6.00 (scaleY 0 → 1, 300–900 ms, ease-weight). The pulttak roof descends from +2.0 m and settles (ease-weight). The camera returns to the finale pose. |
| Saltak ↔ Pulttak | 1100 ms | The outgoing roof lifts 0.8 m and dithers out while the incoming roof settles from +0.8 m (300–1100 ms, ease-weight). The wall band and gable triangles grow or shrink with it. |

Default: Saltak, which matches the photo.

### 2.7 Release into the page (behaviour Gardin)

After the finale hold, the stage stays sticky for 100 vh while the next paper section ("Dette bygger
vi") slides up over it. Underneath, the stage scales 1 → 0.96 and a 15 % paper overlay dims it,
scrubbed. Once the stage is covered, the canvas stops rendering. It is disposed after 2 s off screen
and restored on the way back up.

### 2.8 Reduced motion, low tier, no WebGL

| Case | Hero | Build part | Finale |
|---|---|---|---|
| `prefers-reduced-motion` | The static photo plate and credit. Not pinned. No dissolve or timelapse. | A stepped gallery: five still renders of the Adria model from the step cameras (desktop 1600 × 1000, phone 900 × 1200, AVIF and WebP), each with its title and body. Same `<ol>`. | The three radios swap three stills (saltak, pulttak, uten tak) with a 200 ms opacity crossfade. |
| Tier `off` (no WebGL, software GL, Save-Data, 2G, ≤ 2 GB memory, very old GPU) | Same as reduced motion | Same as reduced motion | Same as reduced motion |
| Tier `mid` (phones, tablets, weak integrated GPUs) | Lite model, full choreography as in 2.3 (phone timing) | Full choreography | Full choreography |

Behaviours Pust, Strek, Lodd and the scroll reveals still run under tier `off`.

`lib/gpu-tier.ts` becomes `high | mid | off`. Today's `low` maps to `mid`, and **phones get the live
hero**. They did not before.

### 2.9 The photo: files, grade and the rights switch

- **Files:** `public/images/adria/`
  - `adria-render-{640,960,1260}.{avif,webp}`
  - `adria-render-sq-{480,816}.{avif,webp}` (crop x 250–1066)
  - Never upscale beyond the 1260 source.
  - Budget: 1260 AVIF ≤ 140 KB, 816² AVIF ≤ 80 KB.
- **Grade:** apply one grade at encode time: saturation 0.90, a slight warm highlight, blacks lifted
  2 %. That brings the photo into the monograph palette. The twin's tone mapping and exposure are then
  tuned to the *graded* photo. Document this grade in `DESIGN.md` §5 as the only exception to the
  render-chroma rule.
- **Alt text:** "Illustrasjon av husmodellen Adria: et toetasjes trehus med saltak og stående
  trekledning, sett fra hagen med plen, terrasse og solsenger." The canvas is `aria-hidden`.
- **Rights switch.** Add `adria.photoEnabled` in `src/content/site.ts`, default `true`.
  - With `false`, the plate shows `adria-twin` instead: our own render of the twin from the photo
    camera, rendered at 2× by the harness. The credit then reads only "Illustrasjon basert på
    husmodellen Adria. [MANGLER: leverandør og avtale om bruk]".
  - The whole concept still works this way: it lands on our own render instead of the photo.
  - The OG image is always our own render, never the supplier's.

---

## 3. Home: section order and purpose

| # | Section (id) | Tone | Purpose | Build |
|---|---|---|---|---|
| 1 | Hero (`topp`, build part `slik-bygger-vi`) | paper → day stage | Positioning, the signature, how we build a house | **New**: `AdriaHero` (plate, copy, controls) plus `AdriaStage` (one canvas) and `AdriaSteps` (DOM). Reuse from `three/lib`: `loader`, `modelSource`, `warmup`, `renderLoop`, `inputStore`, `camera`, `scrollMap`. Retire `HeroHouse`, `HeroCanvas`, `BuildSequence`, `BuildStage`, `BuildCanvas` and `StageHotspots`. `BuildGallery` becomes the stills fallback. |
| 2 | Dette bygger vi (`dette-bygger-vi`) | paper | The three lead services | **New** `LeadServices` (see below). Reuse `BeforeAfter`, `MediaFigure`, `Picture`, `Hairline`, `MagneticButton`. New `ElevationDrawing` (an SVG that draws on). |
| 3 | Jobber vi har gjort (`referanser`) | **night** | Proof, high on the page | **Rebuild** as "Prosjektark" (section 4). Reuse `ReferenceMeta`, `ReferenceQuote`, `Missing`, `BeforeAfter`. |
| 4 | Fra første samtale til overlevering (`fra-tegning-til-nokkel` stays as the id so old links work) | paper | Process, including byggesøknad | **Reuse** `ProcessSection` and `ProcessTimeline`, new title and lede |
| 5 | Alle fagene i eget firma (`alle-fag`) | chalk | The calm all-trades mention, plus an index of all ten services | **Reuse** `ServicesSection`'s `ServiceIndexHover` list. The copy from the old `Intro` moves here and is rewritten. Hover previews use own photos or Adria renders. |
| 6 | Interlude photo | full-bleed, capped at 1380 | Breathing room | **Reuse** `Interlude` |
| 7 | Om oss (`om-oss`) | paper | Who we are | **Reuse** `AboutSection` |
| 8 | Kontakt (`kontakt`) | paper-deep | Conversion | **Reuse** `ContactSection` |

**Removed from home**

- `Intro`, including the three-up "Én prosjektleder / Byggesøknaden ordner vi / Avtalt tid og pris" row.
- The separate "Slik bygger vi" section (merged into the hero).
- `BeforeAfterSection`. The tilbygg pair moves into Dette bygger vi and the gang pair into references.
- `PermitsSection`. It moves to `/tjenester/pabygg-og-tilbygg/` and must reuse **one** WebGL context
  across tabs (today it creates a context on every switch).

Section headers vary their layout, so no more than two neighbours share one. The pattern for home is:
hero one-line H1; LeadServices stacked; references full-width on night; process centred;
all-trades split; about split.

**LeadServices (`Dette bygger vi`) layout, desktop.** Three rows, each with a different composition.
Rows are separated by hairlines that draw on (Strek).

| Row | Media | Text |
|---|---|---|
| **Nybygg** | `ElevationDrawing` of the Adria garden elevation, cols 1–7. Our own linework exported from `draw_lines`, ≤ 40 KB SVG. It draws on over 2.4 s as it enters: ground line, outline, openings, cladding hints. Caption: "Fasadetegning fra vår 3D-modell av husmodellen Adria." | cols 9–12, bottom-aligned, with the link "Les om nybygg" |
| **Tilbygg og påbygg** | The real tilbygg before/after slider, cols 7–11. The 885 px source caps it at 5 columns (DESIGN §5). | cols 1–5, top-aligned, with the permit note and the link |
| **Tak** | The `nytt-tak` photo, cols 1–5, with Pust | cols 7–11, middle-aligned, with the link |

Under the rows, one line: "Vi tar også oppussing, bad, ombygging og rehabilitering." and the link
"Se alle tjenestene".
On phones, each row stacks: media, then title, body and link.

Each own photo appears once on home:

| Photo | Where |
|---|---|
| tilbygg pair | Dette bygger vi |
| `nytt-tak` | Dette bygger vi |
| gang pair, `firemannsbolig`, `minigraver-skifer` | References |
| `arbeid-over-bergen-bred` | Interlude |
| `arbeid-over-bergen` | Om oss |

---

## 4. References: "Prosjektark"

**Concept.** Three loose project sheets on a dark light table. The text of each reference is the
object, and own photos lie between the sheets as clearly separate plates. Nothing is attributed to a
reference unless the sources tie it.

**Desktop mechanics.** The band is tone `night`, about 180 vh.

- **Header**
  - H2 "Jobber vi har gjort" (`t-display-l`, snow).
  - The lede sits below it, max 36rem, mist.
  - One honest line in t-small mist: "Bildene mellom arkene er fra andre jobber vi har gjort."
- **Sheet** (`article`, chalk #F7F5F0, ink text, a 1px rule-strong border, no shadow, `rounded-none`)
  - The title (`t-display-m`).
  - A **sketch glyph**: a 1px ink SVG, 4:3, schematic only, captioned "Skisse".
    - Rekkehus: three gabled units in elevation.
    - Leiligheter på Askøy: a three-storey, six-unit block outline with window grid.
    - Nytt bad og kjøkken: a plan showing the old wall dashed, the new wall solid, and a small arrow
      from kitchen to dining room.
  - `ReferenceMeta` as a hairline list.
  - The paraphrased quote, Rekkehus only, with its note.
  - The visible `[MANGLER: bilder fra …]` line.
  - The whole sheet links to `/referanser/#<id>`.
- **Layout on 12 columns**

  | Row | Sheet | Plate |
  |---|---|---|
  | 1 | Rekkehus, cols 1–5 | the gang before/after slider, cols 7–12, offset down 8rem |
  | 2 | Leiligheter på Askøy, cols 8–12 | `firemannsbolig`, cols 1–6 |
  | 3 | Nytt bad og kjøkken, cols 2–6 | `minigraver-skifer` (portrait), cols 8–11 |

  Each plate has its own caption ending "Foto fra eget prosjekt."
- **Motion**
  - Sheets drift at 0.92× scroll speed and plates at 1.06× (±6 vh, scrubbed): loose sheets on a table.
  - Sketch strokes draw on as a sheet enters (Strek, 1.2 s).
  - Photos breathe (Pust).
  - On hover or focus, a sheet lifts 6px (450 ms ease-weight) and its strokes darken from ink-soft
    to ink.
- **CTA:** "Se alle referansene". This is the one place on home where brass is allowed, as an accent
  button on night.

**Phones.** One column alternating sheet, plate, sheet, plate. No parallax; reveal-up and sketch
draw-on remain. The slider is full width.

**Honesty rules**

- Never put a photo inside a sheet.
- Never caption a plate with a reference's name or place.
- The `[MANGLER]` lines stay visible.
- When the client sends photos tied to a reference, they replace that sheet's sketch (through
  `photoKeys`) and the line comes off.

---

## 5. The "alive" motion system

Six named behaviours. Nothing else moves. All six are off under reduced motion, apart from the
instant state changes they already provide.

| Name | What it does | Timing and easing | Where it applies |
|---|---|---|---|
| **Pust** (breath) | A photo inside its frame scales 1.06 → 1.00 and moves ±4 % in Y from entering to leaving the viewport | Scroll-linked, `EASE.scrub` | Own photos in Dette bygger vi, the references plates, the interlude, Om oss. **Not** on the hero LCP photo. |
| **Strek** (line) | Hairlines draw (`scaleX` 0 → 1). SVG strokes draw on (`stroke-dashoffset`). Headings rise word by word (existing `RevealText`). | Lines 900 ms ease-expo with an 80 ms stagger. Words 700 ms ease-expo with a 60 ms stagger. Drawings 1.2–2.4 s, ease `sine.inOut`. | Section rules, the timelapse caption rail, `ElevationDrawing`, references sketches, step rail underline |
| **Gardin** (curtain) | A paper section slides over a pinned stage, which scales to 0.96 and dims 15 % | Scrubbed over 100 vh | Hero release only, so it stays special |
| **Lodd** (weight) | Magnetic CTAs (within 24px, max offset 6px). Button fill wipes up from the bottom. Underlines draw. The segmented-control thumb glides. Sheets lift on hover. | Return 450 ms ease-weight; thumb 450 ms ease-glide | Every interactive element. Magnetism only on fine pointers. |
| **Blikk** (gaze) | The 3D camera orbits its target, following the pointer within ±3.5° yaw and ±1.2° pitch, critically damped (`1 − e^(−dt/0.35 s)`). With no pointer it idles: ±1.0° yaw over 14 s. | continuous | Hero `LIVE` state and the finale (desktop, fine pointer). Phones: idle drift in the finale only. |
| **Vær** (weather) | Clouds drift (sky UV 0.004/s). Tree crowns sway 1.5–4 cm and grass tips 2–6 cm, with 4–7 s periods phased by world position, all in the vertex shader. | continuous | Anywhere the 3D renders. It stops when the canvas is off screen. |

Never: bounce, elastic or overshoot; parallax on text; auto-rotating turntables; pulsing hotspots;
scroll-hint chevrons; cursor trails beyond the existing ring.

---

## 6. Copy (bokmål)

Write everything in "du/vi" and keep it calm and concrete. Every claim traces to `content-import/byggrv/`.
No em dashes in the copy.

### Hero

| Element | Copy |
|---|---|
| H1 | **Fra tegning til hus.** |
| Sub | Vi bygger nye hus, tilbygg, påbygg og tak i Bergen og omegn. Byggesøknaden ordner vi, og én prosjektleder følger jobben til avtalt tid og pris. |
| Primary CTA | Book en uforpliktende samtale |
| Secondary | Se hvordan vi bygger |
| Photo credit | Illustrasjon: husmodellen Adria. [MANGLER: leverandør og avtale om bruk] |
| Timelapse captions | Tegningen · Reisverket · Taket · Kledningen · Hagen |
| Controls | Pause · Spill av · Se det igjen (aria: "Sett byggingen på pause", "Spill av byggingen", "Se huset bygges igjen") |
| Skip link | Hopp over byggingen |
| Rail label (`aria-label`) | Byggesteg |

### Build steps

| Rail | Title | Body (two sentences) |
|---|---|---|
| Grunnmur | Søknad og grunnmur | Byggesøknaden skriver og sender vi til kommunen for deg. Når den er godkjent, støper vi grunnmuren og legger radonsperre under gulvet. |
| Reisverk | Reisverket | Tømrerne reiser vegger, bjelkelag og takstoler i tre. Nå ser du hvor store rommene blir. |
| Tett hus | Tett hus | Taket legges, og vinduer og dører settes inn. Med vindsperre og isolasjon etter byggteknisk forskrift (TEK) blir huset tett og holder på varmen. |
| Kledning | Kledning og innredning | Kledningen kommer opp, og inne gjør fagene ferdig rom for rom. Alle fagene er i eget firma, og én prosjektleder samordner dem. |
| Nøkkelferdig | Nøkkelferdig | Vi leverer nøkkelferdig, til avtalt tid og pris og etter dine ønsker. Bytt tak og se hvordan huset endrer seg. |

### Roof switcher

| Element | Copy |
|---|---|
| Legend | Tak |
| Options | Saltak · Pulttak · Uten tak |
| Helper | Samme hus, to taktyper. Uten tak ser du rett ned i andre etasje. |
| Live region | "Viser saltak." · "Viser pulttak." · "Viser huset uten tak." |
| Credit | Illustrasjon basert på husmodellen Adria, ikke foto fra et ferdig prosjekt. [MANGLER: leverandør og avtale om bruk] |
| Reduced-motion lede | Her er byggingen steg for steg. |

### Sections

| Section | Copy |
|---|---|
| Dette bygger vi | H2 **Dette bygger vi**. Lede: "Nye hus, tilbygg og påbygg, og tak. Vi tar hele jobben, fra søknad til ferdig bygg, med én prosjektleder." |
| – Nybygg | "Har du tomt, men ikke hus? Vi bygger etter tegningene og spesifikasjonene dine, og leverer nøkkelferdig til avtalt tid og pris." Link: "Les om nybygg" |
| – Tilbygg og påbygg | "Et tilbygg gir huset større grunnflate. Et påbygg gir deg en ny etasje på huset du har. Byggesøknaden skriver og sender vi." Link: "Les om tilbygg og påbygg" |
| – Tak | "Nytt tak, reparasjoner, takrenner og nedløp. Vi ser over taket først og forteller deg hva som må gjøres." Link: "Les om takarbeid" |
| – Closing line | "Vi tar også oppussing, bad, ombygging og rehabilitering." Link: "Se alle tjenestene" |
| References | H2 **Jobber vi har gjort**. Lede: "Tre oppdrag fra referanselisten vår." Note: "Bildene mellom arkene er fra andre jobber vi har gjort." Sketch caption: "Skisse". Plate captions end "Foto fra eget prosjekt." CTA: "Se alle referansene" |
| Process | H2 **Fra første samtale til overlevering**. Lede: "Den samme prosjektlederen følger deg hele veien." Steps unchanged (`process.ts`). |
| All trades | H2 **Alle fagene i eget firma**. Body: "Vi er håndverkere fra flere firmaer som er slått sammen til ett. Tømrer, elektriker, rørlegger, maler og murer jobber hos oss, og sprenging og grunnarbeid gjør vi selv. Du får én prosjektleder som samordner fagene." Then the service index. Link: "Se alle tjenestene" |
| Interlude, Om oss, Kontakt | Unchanged |

### Home meta

- **Title:** Nybygg, tilbygg og tak i Bergen | Bygg og Renovering Vest
- **Description:** Vi bygger nye hus, tilbygg, påbygg og tak i Bergen og omegn. Byggesøknaden ordner
  vi, og én prosjektleder følger jobben til avtalt tid og pris.

### Site-wide replacements

| Where | Change |
|---|---|
| `referenceHouse` in `site.ts` | Becomes `adriaHouse`. The `/om-oss/` section becomes "Huset i 3D-modellen", with the illustration note and `[MANGLER]`. |
| `footer.modelCredit` | "3D-huset er vår tolkning av husmodellen Adria. [MANGLER: leverandør og avtale om bruk]" |
| `missingFacts` | Add `{ key: "adriaRights", label: "leverandør og avtale om bruk av husmodellen Adria", where: ["Forside: hero og byggesteg", "Om oss", "Footer"] }`. Retire the `clientHouse` entry, or rephrase it as "kundens egne nybygg (bilder)". |

---

## 7. Anti-AI checklist for this site

Remove or avoid, and check each one at review:

1. The hero sub "Fra sprenging og grunnmur til elektro, rør og siste strøk maling…". It puts sprenging
   at the top and is a trade list.
2. "Vi bygger hele huset." It is a generic claim.
3. The hero phone/e-mail row that duplicates the header.
4. Scrims, gradients and the radial glow behind hero text. The new hero is on paper.
5. The three-up feature row with hairline, title and one sentence ("Én prosjektleder / Byggesøknaden
   ordner vi / Avtalt tid og pris"). It is the classic template tell.
6. Every section using the same "title left, lede right" header. Vary them (section 3).
7. The 11-step dark build section with identical alternating image/text blocks, and its pulsing
   hotspots and x-ray glow lines.
8. Toy blob trees and visible blurry LQIP placeholders in the hero.
9. Three identical reference columns with identical meta lists, which read as a card grid.
10. Small labels above headings (eyebrows), mono or caps spec text, pill tags, "01/02/03" or
    "Steg 2 av 5" counters, and decorative numerals.
11. Glass/blur panels over 3D. Panels are solid chalk.
12. Scroll-hint chevrons, bouncing arrows, "scroll to explore" text and loading spinners. If 3D is not
    ready, the photo simply stays.
13. Banned words: skreddersydd, kvalitet i alle ledd, drømmehjem, i høysetet, sømløs, helhetlig,
    unik, "vi brenner for", "løsninger" as filler, exclamation marks, buzzword triplets, and em dashes
    in copy.
14. The en-dash credit "Arkitekttegnet referanse – slik ville vi bygget den" and every Kvalbein
    Korsøen mention.
15. Brass more than once per view, and brass on paper.
16. Fake stats, years, reviews, awards or guarantee terms. The `[MANGLER]` lines stay.

---

## 8. Performance budget

| Item | High (desktop GPU, fine pointer) | Mid (phones, tablets, weak iGPU) |
|---|---|---|
| GLB transfer (brotli), geometry + textures | ≤ 1.4 MB (textures ≤ 400 KB) | ≤ 550 KB (textures ≤ 150 KB, 512² max) |
| Triangles, everything visible incl. garden | ≤ 300 k | ≤ 90 k |
| Draw calls, finished scene | ≤ 110 | ≤ 55 |
| Shader programs, incl. depth/shadow variants | ≤ 14 | ≤ 10 |
| Lights | 1 directional with shadow, hemisphere, IBL | same |
| Shadow map | 2048², `autoUpdate = false`, re-rendered on change only (end of each layer animation, roof transition, step change; once at 7.3 s in the timelapse) | 1024², same rule |
| AA and post | Canvas MSAA at DPR ≤ 1.5, none above; **no bloom, no post stack** | none |
| DPR | adaptive 1.0–1.75 (`PerformanceMonitor`) | adaptive 0.9–1.5 |
| GPU memory | ≤ 150 MB | ≤ 70 MB |
| 3D JS chunk | ≤ 280 KB brotli. three + R3F; drei only for small helpers, no `Environment` or HDR files. | same |
| GLB fetch | Starts in parallel with the 3D chunk, from the page bundle (`modelSource`), right after LCP and at idle. Meshopt decoding uses `MeshoptDecoder.useWorkers(2)`. | same |
| Shader warm-up | `compileAsync` with **every** layer, roof variant, line material, alpha-hash and shadow variant visible, in the photo phase before T=0. No program may link after the timelapse starts. | same |
| Time to 3D ready (nav start → compiled first frame) | ≤ 1.8 s (cable) | ≤ 3.5 s (mid phone, 4× CPU, fast 4G) |
| Frame time in timelapse and steps | p95 ≤ 16.7 ms | p95 ≤ 22 ms (≥ 45 fps) |
| Long tasks while the timelapse runs | none > 50 ms | none > 120 ms |
| Hero LCP | ≤ 1.2 s | ≤ 2.2 s (Lighthouse mobile, simulated) |
| CLS | 0 | 0 |
| Lighthouse mobile `/` | Perf ≥ 90, A11y 100, BP ≥ 95, SEO 100 | |
| WebGL contexts on home | exactly 1 | 1 |
| Off screen | render loop stopped; canvas disposed after 2 s and restored on return | same |

Measure with the existing harness (`perf3d/harness/run-all.sh <label>`, then `compare.mjs baseline <label>`).
Report the deltas for GLB bytes, draw calls, programs linked, time-to-ready and long tasks against
`baseline`.

---

## 9. Files to update alongside the code

**`DESIGN.md`**

- §Direction: the hero is now a light paper hero with a daylight 3D stage. The references band is the
  only dark band on home.
- §4 Motion: add the six behaviours from section 5.
- §5 Imagery:
  - the Adria photo grade and its exception to the render-chroma rule
  - the Adria credit rule, replacing the Kvalbein Korsøen one
  - the plate-size cap for the 1260 px photo
- §7 Do/Don't: merge the anti-AI checklist (section 7).

**`HANDOFF.md`**

- Replace the reference-house decision with: "Adria: illustration based on a supplier's catalogue
  house; our 3D model is our interpretation; photo used with a visible credit; drawings never
  published."
- Record "BEGGE DELER" (timelapse plus scroll) as the client's hero choice.

**`README.md`**

- Under "Permissions still needed", add a new item: "**Husmodellen Adria (leverandør ukjent):**
  written permission to publish the render (`public/images/adria/`) and to show a 3D interpretation
  of the house. The elevation drawings are used only as modelling reference and are not published. If
  permission is refused, set `adria.photoEnabled = false`."
- Remove the Kvalbein Korsøen item once no old render remains.
- Update the model section to describe the Adria builder, the layer contract (1.13) and the camera
  match (1.14).

**`scripts/README.md`:** document the Adria builder, `draw_lines`, `uReal`, and the photo-camera solve.

**Renders.** Re-render all of these from Adria, then delete the old house assets:

- the step stills, roof stills and `adria-twin`
- the `svc-*` and `ba-*` pairs
- `og-image`

---

## 10. Acceptance (what "done" looks like)

1. Open `/` at 1440 and 390.
   - The first paint is the photo plate and the H1, with no layout shift.
   - The timelapse runs and lands back on the photo without a visible pop (meets 1.14).
   - Pause works.
   - On desktop, hovering the plate brings the live twin.
2. Scroll the hero.
   - The plate opens into the full garden.
   - Four steps and the finale, each with its own camera.
   - The roof switcher transitions are smooth, interruptible and keyboard-operable, and announced.
   - The curtain releases the page.
   - `/#slik-bygger-vi` lands on the build part.
3. Reduced motion and `?3d=off` both give the static plate, the stills gallery and the stills roof
   switcher, all with the same copy.
4. Sprenging, VVS, elektro, maling and mur do not appear above "Alle fagene i eget firma".
5. Every item in the anti-AI checklist is gone.
6. Only the Adria credit remains; Kvalbein Korsøen is gone everywhere.
7. Budgets in section 8 are met and reported. `npm run build` and `npm run lint` show 0 errors. The
   console is clean.
