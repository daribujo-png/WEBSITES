# Scripts

Node scripts that produce the site's generated assets. Nothing here runs at request time. The site
is a static export and only reads the files these scripts write.

| Command | What it does | Writes |
| --- | --- | --- |
| `npm run images:build` | Optimises the client's photos (see `scripts/images/`) | `public/images/byggrv/opt/`, `src/content/photos.ts` |
| `npm run model:build` | Builds the reference-house model and the permit diagrams | `public/models/house.glb`, `house.meta.json`, `permits.glb`, `permits.meta.json` |
| `npm run model:render` | Renders every still from the models and encodes them | `public/renders/*`, `src/content/renders.ts` |

Run `model:build` before `model:render` whenever the model changes. Both are deterministic: the same
code gives byte-identical GLBs.

## The 3D model (`scripts/model/`)

`build-house.mjs` builds our **interpretation** of *House in Bergen* by Kvalbein Korsøen Arkitektur
(Fana, 2019, about 130 m²). The architect's drawings could not be fetched, so proportions and plan
are approximate. The house is not built by Bygg og Renovering Vest, and the site says so wherever
the model appears.

The model is a compact two-storey timber house. Its two wings (8.0 m wide, 4.6 m and 4.4 m long)
bend 18° at a mitred joint between two old maples. It has a 40° gable roof in dark standing-seam
metal, standing oak-tone cladding (tømmermannskledning), a curved dark entry niche, and big windows
facing the garden. Everything is procedural geometry with flat PBR materials. There are no
textures. Board-to-board tone variation is stored in vertex colours.

Code layout:

- `lib/house-spec.mjs`: all dimensions, the wing coordinate system (u along the wing, v across it,
  mitre at u = T·v), the openings, the rooms and the materials.
- `lib/walls.mjs`: frame, insulation, windbreak, battens, cladding, trims, windows and doors. All of
  these come from one wall list, so openings line up through every layer.
- `lib/roof.mjs`: rafters, the hip and valley at the joint, the deck, standing seams, flashings,
  gutters and snow guards.
- `lib/site.mjs`: the site plan, the pit, blasted rock, ringmur, the slab with a stepped cut-away
  (EPS / radon membrane / concrete), and the drainage gravel.
- `lib/interior.mjs`: joists, partitions (frame and finished), floors, ceilings, the stair, the
  kitchen, the bathroom and the WC.
- `lib/services.mjs`: el and VVS runs (the x-ray layer), the terrace, lamps, furniture, the path
  and planting.
- `lib/env.mjs`: terrain with an exact pit hole, granite outcrops and boulders, birches, the two
  maples and distant ridges. Tree crowns are built by `canopy()`: soft displaced clumps on the
  outer shell of a few ellipsoid lobes, normals blended towards the crown so each crown shades as
  one volume, and occlusion baked into vertex colours. No loose leaf triangles.
- `lib/gltf.mjs`: converts the scene to glTF, then runs dedup → weld → prune → quantize → Meshopt
  (`EXT_meshopt_compression`).
- `lib/cameras.mjs`: camera and lighting presets, the single source of truth. They are written
  into `house.meta.json`; the render harness reads them from there, and so should the live canvas,
  so posters and canvas match.

### `house.glb` structure

```
House                       (root node; extras: name, architect, note)
├─ layer_tomt               extras { step, order, explode:[x,y,z] }
│   ├─ tomt_situasjonsplan  extras { hideFrom: "bindingsverk" }
│   ├─ tomt_stikning        extras { hideFrom: "fundament" }
│   └─ tomt_mark            extras { hideFrom: "grunnarbeid" }   (ground plug over the unexcavated pit)
├─ layer_grunnarbeid        (pit) └─ grunnarbeid_steinmasser { hideFrom: "bindingsverk" }
├─ layer_fundament … layer_nokkelferdig   (11 layers in Norwegian build order)
├─ env_terrain, env_maple_a, env_maple_b, env_birch_01…11, env_hills
```

Each layer group sits at the origin with an identity transform. Every mesh node has a unique
name for its part and holds one primitive with one material, for example `vinduer_glass` (glass),
`installasjoner_el` (el_line), `kledning_bord` (cladding_wood) or `tak_tekking` (roof_metal). Mesh
nodes may carry quantisation transforms, so never assume an identity transform on a mesh node. The tree
nodes are translated to their trunk base.

Materials worth knowing about: `glass` (alpha blend), `el_line` and `vvs_line` (emissive x-ray
runs), `lamp_glow` (warm emissive lamps), and `cladding_wood`. In `cladding_wood` the vertex
colours hold the raw spruce tone per board and the material colour is a linear multiply factor.
Set the colour to white for unpainted wood; the stained factor is in the meta.

### `house.meta.json`

| Key | Contents |
| --- | --- |
| `bbox`, `sceneBbox` | the building above ground, and the whole terrain |
| `floors[]`, `cutHeights[]` | `{name, y, cutHeight}`: floor levels and plan-cut heights for clipping planes |
| `steps[]` | the 11 build-step ids in order |
| `layers.<step>` | `{node, order, center, bbox, explode}` |
| `transient` | groups that disappear once a later step is reached (`hideFrom`) |
| `hotspots.<step>[]` | `{id, position}` in world metres. Ids are checked against `src/content/build.ts` at build time, and the build fails if they drift |
| `environment` | maple positions, birch names, backdrop |
| `materials` | material notes, plus the raw and stained cladding factors |
| `interiorLights[]`, `exteriorLights[]` | warm point-light positions for blue hour |
| `footprint` | plan polygons (frame and cladding faces), bend angle, wing axes |
| `camera` | `hero`, `heroMobile`, `og`, `stage` and `steps.<id>`: `{position, target, fov, shift?}`. Eye-level exterior views look horizontally (straight verticals) and frame the house with `shift: [x, y]`, applied as `camera.setViewOffset(w, h, x·w, y·h, w, h)` |
| `lighting` | `bluehour`, `day`, `stage` and `paper`: tone mapping + exposure, sky gradient (also the IBL), fog, hemisphere, key/fill lights, lamp/exterior/interior light levels, bloom and, for `stage`, `envMaterials` (the monochrome slate site model). Field reference at the top of `lib/cameras.mjs` |
| `stats` | GLB bytes, meshes, vertices, triangles |

`permits.glb` has five root nodes: `permit_pabygg`, `permit_frittliggende`, `permit_tilbygg`,
`permit_kjeller` and `permit_garasje`. Each is centred at the origin on a model base. The existing
house uses the `permit_existing*` materials (paper grey), the new part uses `permit_new*` (oak), and
the joints use `permit_accent` (brass). `permits.meta.json` has one camera per diagram (`cameras.<id>`, the same ones the posters use) and they are lit with `lighting.paper` from `house.meta.json`.

## Renders (`scripts/render/`)

`render.mjs` starts a small static server. The server serves `scripts/render/page/`, three.js from
`node_modules` and `public/models`. The script then opens headless Chromium (Playwright, with
SwiftShader WebGL) and renders every shot in `shots.mjs`. Each shot is supersampled, then sharp
encodes it as AVIF and WebP at several widths, plus a tiny blurred WebP placeholder. The script
writes `src/content/renders.ts` and removes stale files from `public/renders/`. `og-image.jpg` is
1200×630.

```bash
npm run model:render                     # everything (~45 min with software WebGL)
npm run model:render -- --only=^hero     # a subset; other manifest entries are kept
npm run model:render -- --preview=/tmp/p # quick 40 % PNG previews only
```

Shots are plain JSON (camera, lighting preset name plus `lightingOverrides`, visible step,
`hideNodes` name prefixes, clip planes, x-ray, clay, extras). Clip planes keep the positive side
(`normal · p + constant ≥ 0`), and several planes on one shot keep their intersection, which is
how the bathroom becomes a cut-away room box.

Playwright is resolved from the project, then from `NODE_PATH`, then from `npm root -g`. Chromium is
taken from `CHROMIUM_PATH`, then from `PLAYWRIGHT_BROWSERS_PATH`, then from `/opt/pw-browsers`.
Otherwise Playwright's default browser is used.

Every render shows our own model. Alt texts are in Norwegian. Build-step alt texts come from
`renderAlt` in `src/content/build.ts`, and permit alt texts from `diagramAlt` in
`src/content/permits.ts`. The before/after pairs `ba-1…3` are labelled as illustrations. The site
shows real before/after photos wherever we have them.
