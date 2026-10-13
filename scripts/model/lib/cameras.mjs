/**
 * Camera and lighting presets. One source of truth: the render harness
 * (scripts/render/page/render.js) reads them from house.meta.json, and the
 * live 3D on the site reads the same file, so posters and canvas match.
 *
 * Cameras: world metres, `fov` is vertical in degrees.
 * Lighting: colours are sRGB hex; light intensities follow three.js
 * physically based units (r155+): directional/hemisphere in lux-like
 * units, point lights in candela with `decay: 2`.
 */
export const CAMERAS = {
  // Exterior eye-level views look horizontally (straight verticals, like a shift
  // lens) and frame the house with `shift`: [x, y] as a fraction of the image,
  // applied with camera.setViewOffset(w, h, shift[0] * w, shift[1] * h, w, h).
  // Negative x moves the house to the right, negative y moves it down.
  hero: { position: [-12.4, 1.6, 16.6], target: [-0.6, 1.6, -0.6], fov: 46, shift: [-0.12, -0.1] },
  heroMobile: { position: [-14.5, 1.6, 21.0], target: [-0.3, 1.6, 0.0], fov: 50, shift: [0.0, 0.0] },
  og: { position: [-12.4, 1.6, 16.6], target: [-0.6, 1.6, -0.6], fov: 36, shift: [-0.07, -0.19] },
  stage: { position: [-17, 11, 21], target: [0, 2.8, 0.5], fov: 30 },
  steps: {
    tomt: { position: [-13, 12.5, 16], target: [0.5, 0, 1.4], fov: 32 },
    grunnarbeid: { position: [-14, 9, 15], target: [0, -0.6, 0.5], fov: 30 },
    fundament: { position: [-13, 7.5, 12.5], target: [-1, 0, 0.5], fov: 30 },
    bindingsverk: { position: [-15, 8, 16], target: [0, 3, 0.5], fov: 30 },
    isolasjon: { position: [-6, 6.5, 19], target: [0.5, 3.4, 1.0], fov: 30 },
    tak: { position: [-16, 13, 15], target: [0, 5, 0.5], fov: 30 },
    vinduer: { position: [-9, 4.5, 17.5], target: [0, 2.8, 2], fov: 30 },
    kledning: { position: [-15, 4.5, 15], target: [0, 3.4, 0.5], fov: 30 },
    installasjoner: { position: [-14, 9, 15], target: [0, 3.2, 0], fov: 30 },
    interior: { position: [-6.5, 7.5, 15.5], target: [0, 3.2, 0], fov: 32 },
    nokkelferdig: { position: [4.2, 2.0, 18.5], target: [0.2, 3.9, 1.0], fov: 34 },
  },
};

/** Permit diagrams (permits.glb, each root node centred at the origin). Lighting: "paper". */
const PERMIT_HIGH = { position: [-20.5, 12.5, 24.5], target: [0, 1.6, 0.5], fov: 30 };
const PERMIT_LOW = { position: [-18.5, 8.5, 25.5], target: [0, 0.2, 0.8], fov: 30 };
export const PERMIT_CAMERAS = {
  pabygg: PERMIT_HIGH,
  frittliggende: PERMIT_HIGH,
  tilbygg: PERMIT_HIGH,
  kjeller: PERMIT_LOW,
  garasje: PERMIT_LOW,
};

/**
 * Lighting presets.
 *  toneMapping     "ACESFilmic" | "AgX" | "Neutral"
 *  background      "sky" (draw the sky dome) or a hex colour
 *  sky             gradient dome {top, mid, horizon, below, glow, glowStrength, glowDir, glowWidth};
 *                  also baked into the environment map (PMREM) at envIntensity
 *  fog             {color, near, far} linear fog, or null
 *  hemisphere      {sky, ground, intensity} or null
 *  key / fill      directional lights {color, intensity, position (offset from target), castShadow}
 *  lamps           multiplier for the `lamp_glow` emissive (0 switches the lamps off)
 *  exteriorLights  candela per unit of meta.exteriorLights[].intensity (0 = off)
 *  interiorLights  candela per unit of meta.interiorLights[].intensity (0 = off)
 *  bloom           {strength, radius, threshold} or null
 *  envMaterials    optional: replace environment materials (env_* nodes) with flat
 *                  colours, e.g. the monochrome site model on the dark stage
 */
export const LIGHTING = {
  bluehour: {
    note: "Blue hour in Fana: sun just below the western horizon, deep blue sky, warm windows.",
    toneMapping: "AgX",
    exposure: 1.35,
    background: "sky",
    sky: {
      top: "#0a1631",
      mid: "#1e3c68",
      horizon: "#6f8bad",
      below: "#1a2533",
      glow: "#e3a77a",
      glowStrength: 0.65,
      glowDir: [0.25, 0, -1],
      glowWidth: 5,
    },
    envIntensity: 1.25,
    fog: { color: "#33496a", near: 35, far: 320 },
    hemisphere: { sky: "#5a77a3", ground: "#1b2420", intensity: 0.9 },
    key: { color: "#a9c0e6", intensity: 0.5, position: [-30, 40, -14], castShadow: true },
    fill: { color: "#d9a07a", intensity: 0.22, position: [36, 6, 14], castShadow: false },
    lamps: 0.55,
    exteriorLights: 2.2,
    interiorLights: 9,
    interiorColor: "#ffb469",
    bloom: { strength: 0.32, radius: 0.45, threshold: 0.9 },
  },
  day: {
    note: "Overcast Nordic daylight: soft, grey, low contrast, low chroma (graded to sit on the paper pages).",
    toneMapping: "Neutral",
    exposure: 0.76,
    background: "sky",
    sky: {
      top: "#b3b9bb",
      mid: "#c9ccc8",
      horizon: "#d9dad5",
      below: "#c4c6c0",
      glow: "#ece8df",
      glowStrength: 0.18,
      glowDir: [-0.4, 0, 0.8],
      glowWidth: 4,
    },
    envIntensity: 1.05,
    fog: { color: "#c9ccc8", near: 40, far: 380 },
    hemisphere: { sky: "#e2e4e2", ground: "#5f6358", intensity: 0.75 },
    key: { color: "#f6efe4", intensity: 2.0, position: [-26, 40, 30], castShadow: true },
    fill: null,
    lamps: 0,
    exteriorLights: 0,
    interiorLights: 0,
    bloom: null,
  },
  stage: {
    note: "Dark build-sequence stage: the house in real materials on a monochrome slate site model; fog fades the site into #0E1416.",
    toneMapping: "AgX",
    exposure: 1.1,
    background: "#0e1416",
    sky: {
      top: "#0d1b2e",
      mid: "#2a4466",
      horizon: "#6d86a3",
      below: "#1b2532",
      glow: "#d6aa84",
      glowStrength: 0.55,
      glowDir: [0.7, 0, 0.6],
      glowWidth: 5,
    },
    envIntensity: 0.9,
    fog: { color: "#0e1416", near: 24, far: 62 },
    hemisphere: { sky: "#9fb2c8", ground: "#1a2226", intensity: 0.55 },
    key: { color: "#f1ece3", intensity: 2.2, position: [-24, 34, 22], castShadow: true },
    fill: { color: "#c9a86a", intensity: 0.35, position: [26, 10, -20], castShadow: false },
    lamps: 0,
    exteriorLights: 0,
    interiorLights: 0,
    bloom: { strength: 0.3, radius: 0.5, threshold: 0.88 },
    envMaterials: {
      terrain: { color: "#2b3438", roughness: 1 },
      rock: { color: "#3a4447", roughness: 0.95 },
      hill: { color: "#161e21", roughness: 1 },
      maple_leaf: { color: "#3b4743", roughness: 0.95, castShadow: false },
      birch_leaf: { color: "#455250", roughness: 0.95, castShadow: false },
      maple_bark: { color: "#2a3133", roughness: 0.95, castShadow: false },
      birch_bark: { color: "#59625f", roughness: 0.9, castShadow: false },
    },
  },
  paper: {
    note: "Light diagrams on paper #EDE8DF (service cut-aways, permit diagrams).",
    toneMapping: "Neutral",
    exposure: 0.9,
    background: "#ede8df",
    sky: {
      top: "#e9e4da",
      mid: "#efebe3",
      horizon: "#f2efe9",
      below: "#ede8df",
      glow: "#ffffff",
      glowStrength: 0.1,
      glowDir: [0, 0, 1],
      glowWidth: 3,
    },
    envIntensity: 0.6,
    fog: null,
    hemisphere: { sky: "#f4f1ea", ground: "#b9b1a3", intensity: 0.6 },
    key: { color: "#fff8ec", intensity: 2.3, position: [-16, 15, 9], castShadow: true },
    fill: { color: "#e6ecf2", intensity: 0.35, position: [14, 8, 12], castShadow: false },
    lamps: 0,
    exteriorLights: 0,
    interiorLights: 0,
    bloom: null,
  },
};
