/**
 * Dimensions, plan geometry and materials for our interpretation of
 * "House in Bergen" (Kvalbein Korsøen Arkitektur, Fana 2019).
 *
 * The drawings could not be fetched, so this is an INTERPRETATION:
 * a compact two-storey gabled timber house of about 130 m² whose volume
 * bends 18° between two old maples. Two "wings" share a mitred joint at the
 * origin. Every wing has local coordinates:
 *   u — along the wing, away from the joint (0 = joint, L = gable frame face)
 *   v — across the wing, + towards the garden (south), − towards the entry
 *   y — up (0 = finished ground at the house)
 * The joint is mitred: a point belongs to a wing when u ≥ T·v.
 */
import * as THREE from "three";

export const deg = THREE.MathUtils.degToRad;

export const BEND = deg(18);
export const T = Math.tan(BEND / 2); // mitre slope in wing coordinates
export const HW = 4.0; // half width to the outer face of the timber frame
export const STUD_D = 0.198; // 48×198 studs
export const STUD_W = 0.048;
export const PITCH = deg(40);
export const TANP = Math.tan(PITCH);

export const Y = {
  ground: 0,
  slab: 0.45, // top of ringmur / slab
  ff1: 0.47, // finished floor, 1. etasje
  top1: 3.15, // top plate, 1. etasje
  joistTop: 3.4,
  sill2: 3.42,
  ff2: 3.44, // finished floor, 2. etasje
  eave: 5.42, // top plate, 2. etasje (frame eave)
  collar: 7.4,
};

/** Rafter depth measured vertically (248 mm rafter at 40°). */
export const RAFTER_VD = 0.248 / Math.cos(PITCH);
/** Top of rafters as a function of |v|. */
export const rafterTop = (av) => Y.eave + RAFTER_VD + (HW - av) * TANP;
/** Top of the finished metal roof as a function of |v|. */
export const ROOF_BUILDUP = 0.06; // battens + deck + metal
export const roofTop = (av) => rafterTop(av) + ROOF_BUILDUP;
export const EAVE_OVERHANG = 0.5; // horizontal, beyond the frame face
export const VERGE_OVERHANG = 0.38; // beyond the gable frame face
export const RIDGE_Y = roofTop(0);
/** Gable frame rake (top of gable studs). */
export const rake = (av) => Y.eave + (HW - av) * TANP;

/** Wall build-up outside the frame face (offsets from the frame face). */
export const SKIN = {
  windbreak: [0.0, 0.012], // vindsperre
  battens: [0.012, 0.06], // lekter (krysslekting)
  under: [0.06, 0.079], // underliggere
  over: [0.079, 0.1], // overliggere
  trim: [0.1, 0.122], // belistning around openings
};
export const CLAD_OUT = SKIN.over[1];

export const WINGS = {
  A: {
    id: "A",
    L: 4.6,
    eu: { x: -1, z: 0 },
    ev: { x: 0, z: 1 },
  },
  B: {
    id: "B",
    L: 4.4,
    eu: { x: Math.cos(BEND), z: Math.sin(BEND) },
    ev: { x: -Math.sin(BEND), z: Math.cos(BEND) },
  },
};

/** Wing-local (u, v, y) → world Vector3. */
export function W(wing, u, v, y = 0) {
  return new THREE.Vector3(u * wing.eu.x + v * wing.ev.x, y, u * wing.eu.z + v * wing.ev.z);
}
/** Wing-local (u, v) → plan point {x, z}. */
export function WP(wing, u, v) {
  return { x: u * wing.eu.x + v * wing.ev.x, z: u * wing.eu.z + v * wing.ev.z };
}
/** Smallest u inside the wing at cross position v. */
export const mitreU = (v) => T * v;

/** House outline offset `d` from the frame face (hexagon, plan points). */
export function outline(d) {
  const r = HW + d;
  const { A, B } = WINGS;
  return [
    WP(A, A.L + d, r),
    WP(A, T * r, r),
    WP(B, B.L + d, r),
    WP(B, B.L + d, -r),
    WP(A, -T * r, -r),
    WP(A, A.L + d, -r),
  ];
}

/** Wing footprint quad at offset d (convex, plan points). */
export function wingQuad(wing, d, uEndExtra = 0) {
  const r = HW + d;
  return [WP(wing, T * r, r), WP(wing, wing.L + d + uEndExtra, r), WP(wing, wing.L + d + uEndExtra, -r), WP(wing, -T * r, -r)];
}

/**
 * Openings in the outer walls. Eave walls ("S" garden / "N" entry) use u;
 * gables ("G") use v. y is absolute. kind: window | glazing | door | niche.
 */
export const OPENINGS = {
  A: {
    S: [
      { id: "a-s-glazing", a0: 1.0, a1: 3.8, y0: 0.5, y1: 2.85, kind: "glazing", mullions: [2.4], room: "kjokken" },
      { id: "a-s-up", a0: 1.75, a1: 2.85, y0: 4.25, y1: 5.2, kind: "window", room: "sov1" },
    ],
    N: [
      { id: "a-n-entry", a0: 0.9, a1: 2.5, y0: 0.45, y1: 2.75, kind: "niche" },
      { id: "a-n-wc", a0: 3.55, a1: 4.05, y0: 1.5, y1: 2.5, kind: "window", room: "wc" },
      { id: "a-n-up", a0: 1.3, a1: 2.1, y0: 4.3, y1: 5.2, kind: "window", room: "sov2" },
    ],
    G: [
      { id: "a-g-kitchen", a0: -0.6, a1: 2.2, y0: 1.45, y1: 2.45, kind: "window", room: "kjokken" },
      { id: "a-g-up", a0: -0.45, a1: 0.45, y0: 3.95, y1: 5.65, kind: "window", room: "sov1" },
      { id: "a-g-apex", a0: -0.22, a1: 0.22, y0: 6.3, y1: 7.5, kind: "window", room: "loft" },
    ],
  },
  B: {
    S: [
      { id: "b-s-door", a0: 0.95, a1: 2.3, y0: 0.47, y1: 2.75, kind: "door", room: "stue" },
      { id: "b-s-window", a0: 2.8, a1: 4.0, y0: 0.9, y1: 2.75, kind: "window", room: "stue" },
      { id: "b-s-up", a0: 1.6, a1: 2.8, y0: 4.25, y1: 5.2, kind: "window", room: "sov3" },
    ],
    N: [
      { id: "b-n-window", a0: 1.6, a1: 2.6, y0: 1.2, y1: 2.5, kind: "window", room: "stue" },
      { id: "b-n-bath", a0: 3.0, a1: 3.7, y0: 4.55, y1: 5.2, kind: "window", room: "bad" },
    ],
    G: [
      { id: "b-g-glazing", a0: -1.2, a1: 2.4, y0: 0.55, y1: 2.85, kind: "glazing", mullions: [0.6], room: "stue" },
      { id: "b-g-up", a0: -0.45, a1: 0.45, y0: 3.95, y1: 5.65, kind: "window", room: "sov3" },
      { id: "b-g-apex", a0: -0.22, a1: 0.22, y0: 6.3, y1: 7.5, kind: "window", room: "loft" },
    ],
  },
};

/** Entry niche (curved dark entry) in wing A, north wall. */
export const NICHE = { wing: "A", u0: 0.9, u1: 2.5, radius: 0.8, y0: 0.45, y1: 2.75, doorHalf: 0.5 };

/** Stair (wing B): rises from v=+0.45 (south) to v=−3.8 (north). */
export const STAIR = { wing: "B", u0: 0.25, u1: 1.2, vStart: 0.45, vEnd: -3.8, steps: 17 };
/** Stairwell opening in the 2. etasje floor (wing B local). */
export const STAIRWELL = { u0: 0.2, u1: 1.25, v0: -3.8, v1: -0.55 };

/** Bathroom 2. etasje (wing B local) and WC 1. etasje (wing A local). */
export const BATH = { wing: "B", u0: 2.55, u1: 4.4 - STUD_D, v0: -(HW - STUD_D), v1: -1.55 };
export const WC = { wing: "A", u0: 3.1, u1: 4.6 - STUD_D, v0: -(HW - STUD_D), v1: -2.45 };

/** Terrace in the concave garden corner (both wings, wing-local). */
export const TERRACE = { A: { u1: 3.95 }, B: { u1: 3.6 }, v0: HW + CLAD_OUT + 0.02, v1: HW + 3.1, top: 0.42 };

/* --------------------------------------------------------------------------------------------- */
/* Materials (sRGB hex). Cladding/frame use vertex colours (per-board tone) × a factor.           */
/* --------------------------------------------------------------------------------------------- */

const lin = (hex) => new THREE.Color(hex);
/** Raw spruce tone used in cladding vertex colours. */
export const CLADDING_RAW = "#cfbd99";
/** Finished (stained oak) tone the cladding should read as. */
export const CLADDING_STAIN = "#76624f";
/** Linear multiply factor that turns raw vertex colours into the stained tone. */
export function stainFactor() {
  const r = lin(CLADDING_RAW);
  const s = lin(CLADDING_STAIN);
  return [s.r / r.r, s.g / r.g, s.b / r.b];
}
function linToHex(rgb) {
  const c = new THREE.Color();
  c.setRGB(rgb[0], rgb[1], rgb[2], THREE.LinearSRGBColorSpace);
  return `#${c.getHexString()}`;
}

/**
 * Lite model only: plain materials that differ from each other only in colour
 * (and slightly in roughness) share one material per class. Their colour is
 * multiplied into COLOR_0, the class material is white. Materials the live
 * canvas treats by name (glass, el_line, vvs_line, lamp_glow, plan_line,
 * string_line, cladding_wood, hill) and the environment materials the stage
 * look replaces by name (terrain, rock, maple_*, birch_*) are never merged.
 */
export const LITE_MATERIAL_CLASSES = {
  plain_rough: {
    spec: { color: "#ffffff", roughness: 0.94, vertexColors: true },
    members: ["pit_earth", "blast_rock", "gravel", "concrete", "eps", "wood_fibre", "roof_deck", "interior_wall", "textile", "paving", "shrub"],
  },
  plain_wood: {
    spec: { color: "#ffffff", roughness: 0.8, vertexColors: true },
    members: ["stake_wood", "frame_wood", "deck_wood", "glulam"],
  },
  plain_satin: {
    spec: { color: "#ffffff", roughness: 0.56, metallic: 0.06, vertexColors: true },
    members: ["stake_mark", "windbreak", "seal_tape", "window_frame", "door_wood", "entry_dark", "floor_oak", "kitchen_front", "bath_membrane", "furniture_wood"],
  },
  plain_gloss: {
    spec: { color: "#ffffff", roughness: 0.32, vertexColors: true },
    members: ["worktop", "tile_floor", "tile_wall", "sanitary", "radon_membrane"],
  },
  plain_metal: {
    spec: { color: "#ffffff", roughness: 0.3, metallic: 1, vertexColors: true },
    members: ["steel", "brass"],
  },
};

export function materialSpecs() {
  return {
    // site plan
    plan_line: { color: "#ede8df", roughness: 0.9, emissive: "#ede8df", emissiveIntensity: 0.25 },
    stake_wood: { color: "#c9b083", roughness: 0.85 },
    stake_mark: { color: "#c9a86a", roughness: 0.6, metallic: 0.1 },
    string_line: { color: "#f2efe9", roughness: 0.7, emissive: "#f2efe9", emissiveIntensity: 0.3 },
    // groundworks
    pit_earth: { color: "#ffffff", roughness: 1, vertexColors: true },
    blast_rock: { color: "#ffffff", roughness: 0.92, vertexColors: true },
    gravel: { color: "#ffffff", roughness: 1, vertexColors: true },
    // foundation
    concrete: { color: "#a19e97", roughness: 0.92 },
    eps: { color: "#e9e7e1", roughness: 0.95 },
    radon_membrane: { color: "#2d3438", roughness: 0.38, metallic: 0.05 },
    // frame
    frame_wood: { color: "#ffffff", roughness: 0.78, vertexColors: true },
    glulam: { color: "#d7bd8e", roughness: 0.7 },
    // envelope
    wood_fibre: { color: "#c49e6c", roughness: 1 },
    windbreak: { color: "#d9d7d0", roughness: 0.62 },
    seal_tape: { color: "#3e4a52", roughness: 0.5 },
    // roof
    roof_deck: { color: "#bf9f6c", roughness: 0.9 },
    roof_metal: { color: "#363d42", roughness: 0.34, metallic: 0.7 },
    // openings
    window_frame: { color: "#2a2724", roughness: 0.55, metallic: 0.15 },
    glass: { color: "#1f2b31", roughness: 0.04, metallic: 0.1, opacity: 0.32 },
    door_wood: { color: "#3a2b1f", roughness: 0.6 },
    brass: { color: "#c9a86a", roughness: 0.3, metallic: 1 },
    // cladding: per-board raw tones in vertex colours × stain factor
    cladding_wood: {
      color: linToHex(stainFactor()),
      roughness: 0.82,
      vertexColors: true,
      extras: { rawColorFactor: "#ffffff", stainedColorFactor: linToHex(stainFactor()), note: "base colour = linear multiply factor over raw-spruce vertex colours" },
    },
    entry_dark: { color: "#2a221c", roughness: 0.7 },
    // installations (x-ray)
    el_line: { color: "#e2b25c", roughness: 0.4, emissive: "#e8b660", emissiveIntensity: 2.2 },
    vvs_line: { color: "#8cc7e0", roughness: 0.4, emissive: "#8fcbe6", emissiveIntensity: 2.2 },
    // interior
    interior_wall: { color: "#ebe7df", roughness: 0.92 },
    floor_oak: { color: "#b49470", roughness: 0.55 },
    kitchen_front: { color: "#3b3631", roughness: 0.5 },
    worktop: { color: "#cdc9c1", roughness: 0.35 },
    tile_floor: { color: "#8d8f8b", roughness: 0.4 },
    tile_wall: { color: "#c3c4bf", roughness: 0.3 },
    bath_membrane: { color: "#4a6476", roughness: 0.45 },
    sanitary: { color: "#f3f2ee", roughness: 0.18 },
    steel: { color: "#9a9c9c", roughness: 0.3, metallic: 1 },
    // finished
    deck_wood: { color: "#8c7c69", roughness: 0.8 },
    lamp_glow: { color: "#ffe2b0", roughness: 0.5, emissive: "#ffcf8a", emissiveIntensity: 6 },
    textile: { color: "#bdb5a8", roughness: 0.95 },
    furniture_wood: { color: "#a3835f", roughness: 0.6 },
    paving: { color: "#ffffff", roughness: 0.9, vertexColors: true },
    shrub: { color: "#ffffff", roughness: 0.95, vertexColors: true },
    // environment
    terrain: { color: "#ffffff", roughness: 0.97, vertexColors: true },
    rock: { color: "#ffffff", roughness: 0.88, vertexColors: true },
    birch_bark: { color: "#ffffff", roughness: 0.8, vertexColors: true },
    birch_leaf: { color: "#ffffff", roughness: 0.9, vertexColors: true },
    maple_bark: { color: "#ffffff", roughness: 0.9, vertexColors: true },
    maple_leaf: { color: "#ffffff", roughness: 0.9, vertexColors: true },
    hill: { color: "#ffffff", roughness: 1, vertexColors: true },
  };
}
