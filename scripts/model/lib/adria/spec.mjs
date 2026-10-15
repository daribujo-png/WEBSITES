/**
 * Husmodell Adria (Boligpartner), our 3D interpretation: dimensions, levels,
 * openings, roof variants and materials. Single source of truth for every
 * builder in scripts/model/lib/adria/.
 *
 * Sources (docs/DIRECTION-adria.md §1): the four elevation drawings (plan
 * positions, ≈ 58.7 px/m), Boligpartner's images 1–3 (everything visible in
 * them, per roof variant) and the photo camera fits (§1.14). Where the photo
 * and the drawing disagree on something visible, the photo wins.
 *
 * Coordinates: metres, y up. Origin = centre of the main volume's outer
 * cladding footprint at ground-floor finished floor level (FFL ±0.00).
 *   +x = east (the framed R1 gable), −x = west
 *   +z = south (garden side, images 1, 2, 4), −z = north (entrance, image 3)
 */
import * as THREE from "three";

export const deg = THREE.MathUtils.degToRad;

/** Half sizes of the outer cladding footprint: 15.60 × 7.80 m. */
export const HX = 7.8;
export const HZ = 3.9;

/** Levels (absolute y). */
export const LV = {
  terrain: -0.35, // lawn at the deck edge
  drive: -0.3, // level ground north of the house
  plinthBottom: -0.35,
  claddingBottom: -0.05, // boards stop just above the plinth band
  deck: -0.05, // deck top, entrance landing top
  slabTop: -0.1, // concrete slab under the floor build-up
  ff0: 0, // ground floor FFL
  ceil0: 2.7, // ground floor ceiling
  joistBottom: 2.75,
  joistTop: 2.98,
  ff1: 3.05, // upper floor FFL
  wallTop: 5.9, // shared wall top (all roof variants)
  bandBottom: 2.42, // underside of the loggia slab band (top of the ground openings)
  bandTop: 3.2, // top of the loggia slab band (balcony floor edge)
  balconyFloor: 3.14,
  railBottom: 3.22,
  railTop: 4.22,
};

/** Outer wall build-up, measured inwards from the cladding face (d). */
export const WALL = {
  board: 0.021, // cladding board depth (front face at d = 0)
  relief: 0.012, // visible depth of the board sides (high only)
  batten: [0.021, 0.057],
  windbreak: [0.057, 0.069],
  frame: [0.069, 0.267], // 48 × 198 studs
  lining: [0.267, 0.35],
  thickness: 0.35,
};
/** Board module: 125 mm c/c, 12 mm shadow gap. */
export const BOARD = { pitch: 0.125, gap: 0.014 };

/* --------------------------------------------------------------------------------------------- */
/* Recesses (loggias)                                                                             */
/* --------------------------------------------------------------------------------------------- */

/**
 * R1, the east loggia: the framed gable. Back wall (charcoal) at x = +5.83.
 * Open to the east between the frame columns and to the garden between the
 * back wall and the SE corner column. The north side is closed (N4 storage door).
 */
export const R1 = {
  x0: 5.83,
  x1: HX,
  col: 0.42, // frame column / band width
  zN: -3.48, // inner face of the north closure
  zS: 3.48, // inner face of the SE column (east opening z ∈ [zN, zS])
  xCol: 7.38, // inner face of the SE column (garden opening x ∈ [x0, xCol])
};
/** R2, the west loggia at the SW corner. */
export const R2 = {
  x0: -HX,
  x1: -2.96, // east side wall (charcoal)
  z0: 1.6, // back wall (charcoal)
  z1: HZ,
  xCol: -7.41, // inner face of the SW column (garden opening x ∈ [xCol, x1])
  zCol: 3.49, // inner face of the SW column (west opening z ∈ [z0, zCol])
};

/* --------------------------------------------------------------------------------------------- */
/* Roof variants                                                                                  */
/* --------------------------------------------------------------------------------------------- */

export const ROOFS = ["saltak", "flatt", "pulttak"];
export const DEFAULT_ROOF = "saltak";

const SALT_PITCH = deg(32.5);
const SALT_TAN = Math.tan(SALT_PITCH);
const PULT_LOW = 5.95; // outer roof surface at the north wall plane
const PULT_HIGH = 7.45; // … at the south wall plane
const PULT_TAN = (PULT_HIGH - PULT_LOW) / (2 * HZ);

/**
 * Roof geometry per variant. `outer(z)` is the top of the roofing at plan
 * position z (saltak, pulttak); `under(z)` the underside of the roof build-up
 * (rafter bottoms / ceiling soffit). Values were fitted to images 1 and 3 (the
 * saltak pitch to the R1 frame's rake and the gutter line, see build notes).
 */
export const ROOF = {
  saltak: {
    pitch: SALT_PITCH,
    tan: SALT_TAN,
    buildUp: 0.27, // vertical
    wallPlaneOuter: 6.17, // roofing top at |z| = HZ
    eave: 0.22, // horizontal eave overhang beyond the cladding (long sides)
    verge: 0.1, // beyond the gables (the R1 frame sits flush under it)
    outer: (z) => 6.17 + (HZ - Math.abs(z)) * SALT_TAN,
    under: (z) => 6.17 - 0.27 + (HZ - Math.abs(z)) * SALT_TAN,
    get ridge() {
      return 6.17 + HZ * SALT_TAN;
    },
    chimneyTop: 9.65,
  },
  flatt: {
    parapet: 7.35, // top of the coping
    coping: 0.06,
    membrane: 7.05,
    chimneyTop: 8.2,
    ceiling: 6.45,
  },
  pulttak: {
    pitch: Math.atan(PULT_TAN),
    tan: PULT_TAN,
    low: PULT_LOW,
    high: PULT_HIGH,
    buildUp: 0.3,
    overhang: 0.15,
    fascia: 0.25,
    outer: (z) => PULT_LOW + (z + HZ) * PULT_TAN,
    under: (z) => PULT_LOW - 0.3 + (z + HZ) * PULT_TAN,
    chimneyTop: 7.6,
  },
};

/** Chimney position in plan, all variants. */
export const CHIMNEY = { x: 5.3, z: -0.2, r: 0.1 };

/**
 * Visible top of the walls per variant along each face (cladding top, under the
 * eaves soffit / coping / fascia). Faces: "S", "N" (long sides, a = x) and "E",
 * "W" (gables, a = z). `R1back` is the loggia back wall at x = R1.x0.
 */
export function wallTop(face, roof, a) {
  if (roof === "saltak") {
    if (face === "S" || face === "N") return ROOF.saltak.under(HZ); // soffit at the wall plane
    return ROOF.saltak.outer(a) - 0.03; // gable cladding runs up under the verge flashing
  }
  if (roof === "flatt") return ROOF.flatt.parapet - ROOF.flatt.coping;
  // pulttak: cladding up to the underside of the fascia band
  const p = ROOF.pulttak;
  if (face === "S") return p.high - p.fascia;
  if (face === "N") return p.low - p.fascia;
  return p.outer(a) - p.fascia;
}

/**
 * Variant-specific heads on the garden face (absolute y). U2 + U4 heads and
 * transoms, the R2 opening top, the R1 garden opening top.
 */
export const HEADS = {
  saltak: { u4: 5.72, u4Transom: null, r2: 5.68, r1: 5.68 },
  flatt: { u4: 6.3, u4Transom: 5.5, r2: 6.08, r1: 6.18 },
  pulttak: { u4: 5.96, u4Transom: 5.23, r2: 6.39, r1: 6.37 },
};

/**
 * Top of the R1 east (gable) opening at plan position z, per variant: the inner
 * edge of the 0.42 m frame band. Saltak: parallel to the rake (a pentagon
 * opening); flatt tak: level; pulttak: parallel to the roof, 1.0 m below its edge.
 */
export function r1OpeningTop(roof, z) {
  if (roof === "saltak") return ROOF.saltak.outer(z) - 0.1 - R1.col / Math.cos(SALT_PITCH);
  if (roof === "flatt") return HEADS.flatt.r1;
  return ROOF.pulttak.outer(z) - 1.0;
}

/* --------------------------------------------------------------------------------------------- */
/* Openings                                                                                       */
/* --------------------------------------------------------------------------------------------- */

/**
 * Window and door schedule (§1.5). a0/a1 along the face (x on S/N, z on E/W
 * and on the R1 back wall, x on the R2 back wall), y absolute.
 * kind: window | door | slide | fixed. `cols` = mullion positions (a),
 * `rows` = transom heights (y). `roof` restricts the opening to one variant.
 */
const F1 = LV.ff1;
export function openings(roof) {
  const H = HEADS[roof];
  const list = [
    // ---- garden face (z = +3.9) ----
    { id: "G2", face: "S", a0: -1.85, a1: -1.02, y0: 0.0, y1: 2.12, kind: "window", rows: [1.35] },
    { id: "G3", face: "S", a0: -0.87, a1: 2.61, y0: 0.0, y1: 2.12, kind: "slide", cols: [0.87] },
    { id: "G5", face: "S", a0: 3.95, a1: 4.81, y0: 0.0, y1: 2.12, kind: "window" },
    { id: "U2", face: "S", a0: -1.91, a1: -1.02, y0: F1 + 0.08, y1: H.u4, kind: "window", rows: [H.u4Transom ?? 4.25].filter(Boolean), roof },
    {
      id: "U4",
      face: "S",
      a0: 0.91,
      a1: 4.81,
      y0: F1 + 0.08,
      y1: H.u4,
      kind: "window",
      cols: [2.36, 3.81],
      rows: H.u4Transom ? [H.u4Transom] : [],
      // the narrow right pane has its own transom low down (image 1)
      sub: [{ a0: 3.81, a1: 4.81, rows: [4.35] }],
      roof,
    },
    // ---- R2 back wall (z = +1.6, facing south) ----
    { id: "G1d", face: "R2back", a0: -6.76, a1: -5.84, y0: 0.0, y1: 2.12, kind: "door" },
    { id: "G1f", face: "R2back", a0: -5.6, a1: -4.6, y0: 0.0, y1: 2.12, kind: "fixed" },
    { id: "U1d", face: "R2back", a0: -6.76, a1: -5.86, y0: F1 + 0.1, y1: F1 + 2.6, kind: "door", rows: [F1 + 2.12] },
    { id: "U1w", face: "R2back", a0: -5.8, a1: -4.68, y0: F1 + 0.6, y1: F1 + 2.6, kind: "window", rows: [F1 + 2.12] },
    // ---- entrance face (z = −3.9) ----
    { id: "N1a", face: "N", a0: 1.33, a1: 2.23, y0: 0.0, y1: 2.15, kind: "window", rows: [1.1] },
    { id: "N1b", face: "N", a0: 1.33, a1: 2.23, y0: F1 + 0.07, y1: F1 + 2.15, kind: "window", rows: [F1 + 1.1] },
    { id: "N2", face: "N", a0: -2.68, a1: -1.35, y0: 0.0, y1: 2.13, kind: "entry", cols: [-1.78] },
    { id: "N3", face: "N", a0: -2.22, a1: -1.31, y0: F1 + 0.07, y1: F1 + 2.15, kind: "window", rows: [F1 + 1.1] },
    { id: "N4", face: "N", a0: 5.87, a1: 7.37, y0: 0.0, y1: 2.4, kind: "storage" },
    // ---- west gable (x = −7.8) ----
    { id: "W1a", face: "W", a0: -1.6, a1: -0.73, y0: 0.0, y1: 2.13, kind: "window", rows: [1.1] },
    { id: "W1b", face: "W", a0: -1.6, a1: -0.73, y0: F1, y1: F1 + 2.4, kind: "window", rows: [F1 + 1.2] },
    // ---- R1 back wall (x = +5.83, facing east) ----
    { id: "E1a", face: "R1back", a0: 0.75, a1: 2.67, y0: 0.0, y1: 2.12, kind: "door", cols: [1.71] },
    { id: "E1b", face: "R1back", a0: -2.88, a1: -0.96, y0: 0.0, y1: 2.12, kind: "door", cols: [-1.92] },
    { id: "E3", face: "R1back", a0: 1.6, a1: 2.5, y0: F1 + 0.08, y1: F1 + 2.4, kind: "door", roof },
  ];
  // E2: the tall gable glazing on the R1 back wall, top per roof form
  const e2 = { id: "E2", face: "R1back", a0: -1.2, a1: 1.2, y0: F1 + 0.08, kind: "window", cols: [-0.4, 0.4], roof };
  if (roof === "saltak") {
    // into the apex: a triangle-topped window under the loggia soffit
    e2.y1 = r1Soffit("saltak", 0) - 0.18;
    e2.topAt = (z) => Math.min(e2.y1, r1Soffit("saltak", z) - 0.18);
    e2.rows = [5.45];
  } else if (roof === "flatt") {
    e2.y1 = 6.1;
    e2.rows = [5.45];
  } else {
    e2.y1 = Math.max(r1Soffit("pulttak", -1.2), r1Soffit("pulttak", 1.2)) - 0.15;
    e2.topAt = (z) => r1Soffit("pulttak", z) - 0.15;
    e2.rows = [5.0];
  }
  list.push(e2);
  return list;
}

/** Underside of the R1 loggia ceiling at plan z (the upper balcony's soffit). */
export function r1Soffit(roof, z) {
  if (roof === "saltak") return ROOF.saltak.under(z) - 0.02;
  if (roof === "flatt") return HEADS.flatt.r1;
  return ROOF.pulttak.under(z) - 0.02;
}

/** R2 loggia ceiling (flat) per variant = the opening top. */
export const r2Soffit = (roof) => HEADS[roof].r2;

/* --------------------------------------------------------------------------------------------- */
/* Interior (our illustration: 4 soverom, 2 bad)                                                  */
/* --------------------------------------------------------------------------------------------- */

export const IN = HZ - WALL.thickness; // inner face of the long walls (|z|)
export const INX = HX - WALL.thickness; // inner face of the west gable (−x)
export const R1IN = R1.x0 - WALL.thickness; // inner face of the R1 back wall

export const ROOMS_UP = {
  main: { x: [-INX, -3.0], z: [-IN, 1.5], name: "hovedsoverom" },
  bath: { x: [-3.0, -0.4], z: [-IN, -0.9], name: "bad" },
  stair: { x: [-0.4, 3.0], z: [-0.9, 0.1], name: "trapp og gang" },
  bed2: { x: [1.2, 3.6], z: [-IN, -1.0], name: "soverom 2" },
  bed3: { x: [3.6, R1IN], z: [-IN, -1.0], name: "soverom 3" },
  allrom: { x: [-2.96 + WALL.thickness, R1IN], z: [0.1, IN], name: "allrom" },
};
export const PARTITION_T = 0.1;
/** Interior partitions are cut at this height above upper FFL (ink cut faces). */
export const CUT_UP = 2.5;
export const STAIR = { x0: -0.4, x1: 3.0, z0: -0.9, z1: 0.1, steps: 16 };

/* --------------------------------------------------------------------------------------------- */
/* Garden (§1.7, §1.11)                                                                           */
/* --------------------------------------------------------------------------------------------- */

export const DECK = {
  garden: { x: [-HX, HX], z: [HZ, 7.4] },
  east: { x: [HX, 13.5], z: [-4.5, 7.4] },
  board: 0.12,
  gap: 0.008,
};
export const PERGOLA = { x0: -2.2, x1: 2.95, z0: HZ, z1: 6.9, posts: [-2.2, 0.35, 2.95], beamTop: 2.8, beamBottom: 2.55 };
export const PLANTER = { x: [0.8, 6.0], z: [7.4, 8.4], h: 0.45 };
/** Foreground terrace (dark slabs), back edge along x ≈ 21 traced from image 1. */
export const TERRACE = { x: [21.0, 30.0], z: [11.0, 27.0], top: -1.3 };

/* --------------------------------------------------------------------------------------------- */
/* Materials (sRGB). Albedos from §1.10, tuned against image 1 under the day rig.                */
/* --------------------------------------------------------------------------------------------- */

/** Untreated (fresh) and treated cladding tones; vertex colours carry ±7 % per board. */
export const CLADDING_RAW = "#cdb48f";
export const CLADDING_STAIN = "#a3805e";

export function materialSpecs() {
  return {
    // ---- linework and site ----
    line_ink: { color: "#161c1e", roughness: 1, extras: { note: "fx_lines / fx_site (glTF LINES). Ink #161C1E, drawn at 85 % in the hero." } },
    plan_line: { color: "#2a3033", roughness: 0.9 },
    stake_wood: { color: "#c9b083", roughness: 0.85 },
    stake_mark: { color: "#d8553f", roughness: 0.6 },
    // ---- groundworks + foundation ----
    earth: { color: "#6f6150", roughness: 1 },
    gravel: { color: "#9a958c", roughness: 1 },
    concrete: { color: "#a19e97", roughness: 0.92 },
    eps: { color: "#e9e7e1", roughness: 0.95 },
    radon_membrane: { color: "#2d3438", roughness: 0.38, metallic: 0.05 },
    plinth: { color: "#6a6864", roughness: 0.9 },
    // ---- frame ----
    frame_wood: { color: "#d8c29e", roughness: 0.78 },
    // ---- envelope ----
    windbreak: { color: "#232425", roughness: 0.55 },
    // ---- roofs ----
    roof_tile: { color: "#2b2a2d", roughness: 0.55 },
    roof_steel: { color: "#2a2b2d", roughness: 0.45, metallic: 0.4 },
    roof_membrane: { color: "#3a3b3d", roughness: 0.85 },
    roof_underlay: { color: "#3b4249", roughness: 0.7 },
    flashing: { color: "#1e1f21", roughness: 0.45, metallic: 0.5 },
    chimney_steel: { color: "#8c9097", roughness: 0.35, metallic: 0.8 },
    // ---- openings ----
    frame_anthracite: { color: "#3a3b3d", roughness: 0.5, metallic: 0.15 },
    glass: { color: "#0e1214", roughness: 0.05, metallic: 0, opacity: 0.2, extras: { note: "alpha blend; env reflections (dark green treeline band in the env, §1.10)" } },
    glass_rail: { color: "#9fb3a8", roughness: 0.05, opacity: 0.18 },
    steel_black: { color: "#1f1e1c", roughness: 0.45, metallic: 0.6 },
    // ---- cladding ----
    cladding_wood: {
      color: CLADDING_STAIN,
      roughness: 0.78,
      vertexColors: true,
      extras: {
        rawColorFactor: CLADDING_RAW,
        stainedColorFactor: CLADDING_STAIN,
        note: "base colour = albedo; vertex colours hold the per-board variation (±7 % value, ±3° hue). Swap to rawColorFactor for untreated wood.",
      },
    },
    cladding_charcoal: { color: "#3a3a3b", roughness: 0.72, vertexColors: true },
    // ---- interior ----
    interior_wall: { color: "#eeece6", roughness: 0.92 },
    interior_cut: { color: "#161c1e", roughness: 0.9, extras: { note: "ink cut faces on partition tops (Se inn)" } },
    floor_oak: { color: "#c9ae88", roughness: 0.55 },
    furniture_oak: { color: "#b8956a", roughness: 0.6 },
    linen: { color: "#dcd5c9", roughness: 0.95 },
    textile_grey: { color: "#8e8a84", roughness: 0.95 },
    charcoal: { color: "#2e3033", roughness: 0.8 },
    sanitary: { color: "#f3f2ee", roughness: 0.18 },
    tile: { color: "#b9b6ae", roughness: 0.35 },
    plant: { color: "#3e5233", roughness: 0.9 },
    lamp_glow: { color: "#ffe2b8", roughness: 0.5, emissive: "#ffe2b8", emissiveIntensity: 0.6 },
    // ---- garden ----
    deck: { color: "#5b4a3d", roughness: 0.8, vertexColors: true },
    slab: { color: "#56534f", roughness: 0.85, vertexColors: true },
    pavers: { color: "#6e7072", roughness: 0.9, vertexColors: true },
    cushion: { color: "#dcd5ce", roughness: 0.95 },
    // ---- environment ----
    terrain: {
      color: "#ffffff",
      roughness: 0.95,
      vertexColors: true,
      map: "lawn_detail",
      uv: { worldXZ: 0.4 },
      extras: { note: "lawn and ground colours in vertex colours (world-space variation, baked tree shadows) × a tiling grass detail map (world-space UVs, 2.5 m tile)" },
    },
    hedge: { color: "#ffffff", roughness: 0.9, vertexColors: true },
    leaf: {
      color: "#ffffff",
      roughness: 0.85,
      vertexColors: true,
      map: "leaf_atlas",
      alphaMode: "MASK",
      alphaCutoff: 0.5,
      doubleSided: true,
      extras: { note: "leaf-card atlas (birch, broadleaf, conifer, grass, lavender, blossom); tint in COLOR_0. Use alphaHash at runtime for dithered fades." },
    },
    bark: { color: "#ffffff", roughness: 0.85, vertexColors: true },
    outbuilding: { color: "#1c1f1a", roughness: 0.8 },
    backdrop: { color: "#ffffff", roughness: 1, vertexColors: true, extras: { note: "low-poly silhouette layers; fog/aerial perspective baked into COLOR_0" } },
  };
}

/**
 * Lite: plain materials that differ only in colour share one material per
 * class (colour multiplied into COLOR_0). Materials the runtime treats by name
 * (glass, glass_rail, line_ink, leaf, lamp_glow, cladding_wood) are never merged.
 */
export const LITE_MATERIAL_CLASSES = {
  plain_rough: {
    spec: { color: "#ffffff", roughness: 0.92, vertexColors: true },
    members: [
      "earth",
      "gravel",
      "concrete",
      "eps",
      "plinth",
      "frame_wood",
      "roof_membrane",
      "interior_wall",
      "interior_cut",
      "linen",
      "textile_grey",
      "charcoal",
      "plant",
      "cushion",
      "outbuilding",
      "stake_wood",
      "stake_mark",
      "plan_line",
      "cladding_charcoal",
      "deck",
      "slab",
      "pavers",
      "bark",
      "hedge",
      "backdrop",
    ],
  },
  plain_satin: {
    spec: { color: "#ffffff", roughness: 0.55, metallic: 0.15, vertexColors: true },
    members: ["windbreak", "roof_tile", "roof_underlay", "frame_anthracite", "floor_oak", "furniture_oak", "tile", "radon_membrane"],
  },
  plain_metal: {
    spec: { color: "#ffffff", roughness: 0.42, metallic: 0.55, vertexColors: true },
    members: ["roof_steel", "flashing", "steel_black", "chimney_steel", "sanitary"],
  },
};
