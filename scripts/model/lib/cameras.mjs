/**
 * Camera and lighting presets for the Adria model. Single source of truth:
 * written into public/models/house.meta.json, read by the render harness and
 * by the live hero, so stills and canvas match.
 *
 * Cameras: world metres, `fov` vertical in degrees. Photo-matched cameras
 * (photoMatch, photoMatchInnkjorsel) use lens shift: a virtual full frame
 * centred on the optical axis, of which the photo is the top part:
 *
 *   camera.fov = fov; camera.aspect = aspect;
 *   camera.setViewOffset(vo.fullWidth, vo.fullHeight, vo.x, vo.y, vo.width, vo.height)
 *
 * (units are photo pixels; scale them freely, e.g. to a plate rect). The
 * rotation is a pure yaw (pitch 0, roll 0): the photos are two-point
 * perspective, verticals stay vertical. `target` = position + forward · 46 m.
 *
 * Lighting: colours sRGB hex; three.js physical units (r155+).
 */

const deg = Math.PI / 180;
const r3 = (v) => v.map((x) => Math.round(x * 1000) / 1000);

/**
 * Pinhole camera from the photo fit (1920 × 1080 frame): position, yaw (rotation.y),
 * focal length in px, principal point (cx, cy).
 */
function photoCamera({ position, yaw, f, cx = 960, cy, note }) {
  const fullH = 2 * cy;
  const fwd = [-Math.sin(yaw * deg), 0, -Math.cos(yaw * deg)];
  const target = r3([position[0] + fwd[0] * 46, position[1], position[2] + fwd[2] * 46]);
  return {
    position,
    rotation: { order: "YXZ", x: 0, y: Math.round(yaw * 1e4) / 1e4, z: 0, unit: "deg" },
    target,
    fov: Math.round(((2 * Math.atan(cy / f)) / deg) * 1e4) / 1e4,
    aspect: Math.round((1920 / fullH) * 1e5) / 1e5,
    focalPx: f,
    principalPoint: [cx, cy],
    viewOffset: { fullWidth: 1920, fullHeight: Math.round(fullH * 10) / 10, x: 0, y: 0, width: 1920, height: 1080 },
    photo: { width: 1920, height: 1080 },
    note,
  };
}

/**
 * The photo fits (docs/DIRECTION-adria.md §1.14), refined against overlays of
 * our own renders (scripts/model/README: camera match).
 */
export const PHOTO_MATCH = photoCamera({
  position: [31.24, 0.87, 34.11],
  yaw: 43.28,
  f: 2180.8,
  cy: 651.9,
  note: "Boligpartner images 1 (saltak) and 2 (flatt tak), garden side, identical framing",
});
export const PHOTO_MATCH_INNKJORSEL = photoCamera({
  position: [40.83, 2.41, -20.67],
  yaw: 118.0,
  f: 2648,
  cy: 574.4,
  note: "Boligpartner image 3 (pulttak), entrance and driveway side",
});

/** Square phone crop of images 1/2 (x 470–1550, full height) on the same camera. */
export const PHOTO_MATCH_SQUARE = {
  ...PHOTO_MATCH,
  viewOffset: { ...PHOTO_MATCH.viewOffset, x: 470, width: 1080, height: 1080 },
  note: "square crop x 470–1550 of images 1/2 (phone plate)",
};

/** Simple look-at preset. */
const look = (position, target, fov) => ({ position, target, fov });

/** Hero build steps (direction §2.5): desktop + phone. */
const STEPS5 = {
  grunnmur: { desktop: look([16, 22, 22], [0, 0, 0], 35), mobile: look([20, 30, 28], [0, 0, 0], 45) },
  reisverk: { desktop: look([-18, 3.5, -20], [0, 3.5, 0], 40), mobile: look([-24, 5, -27], [0, 4, 0], 50) },
  tett: { desktop: look([22, 2.0, 8], [6, 4.2, 0], 40), mobile: look([27, 3, 12], [5, 4.5, 0], 50) },
  kledning: {
    desktop: { ...look([-6, 2.5, 14], [-4, 3, 3.9], 38), dolly: { from: [-6, 2.5, 14], to: [4, 3, 13], targetAhead: 2, targetY: 3, targetZ: 3.9 } },
    mobile: look([-4, 3, 20], [2, 3, 0], 48),
  },
  nokkelferdig: { desktop: { photoMatch: true, ...PHOTO_MATCH }, mobile: { photoMatch: true, ...PHOTO_MATCH } },
};

export const CAMERAS = {
  // ---- photo-matched ----
  photoMatch: PHOTO_MATCH,
  photoMatchInnkjorsel: PHOTO_MATCH_INNKJORSEL,
  photoMatchSquare: PHOTO_MATCH_SQUARE,
  // ---- hero timeline ----
  intro: { ...PHOTO_MATCH, note: "intro plate + timelapse (Tvilling … Virkeligheten): photoMatch" },
  finale: { ...PHOTO_MATCH, note: "finale rest pose, side Hagen" },
  roofSwitch: {
    hagen: { ...PHOTO_MATCH, photos: { saltak: "adria-saltak-hage", flatt: "adria-flatt-tak-hage" } },
    innkjorselen: { ...PHOTO_MATCH_INNKJORSEL, photos: { pulttak: "adria-pulttak-innkjorsel" } },
  },
  /** Finale orbit between the two photo cameras (azimuth from +x towards +z around the house centre). */
  orbit: {
    centre: [0, 0, 0],
    from: { azimuthDeg: 47.5, radius: 46.3, eyeY: 0.87, focalPx: 2180.8, principalY: 651.9 },
    to: { azimuthDeg: -26.9, radius: 45.8, eyeY: 2.41, focalPx: 2648, principalY: 574.4 },
    note: "yaw follows the azimuth so the house stays framed; interpolate focal length and principal point",
  },
  steps: STEPS5,
  seInn: { desktop: look([18, 16, 20], [0, 4, 0], 34), mobile: look([22, 22, 26], [0, 4, 0], 44) },
  // ---- legacy keys (pre-Adria runtime), mapped onto Adria views ----
  hero: { ...look([24.5, 1.6, 27.5], [-0.4, 3.0, 0.4], 36), shift: [0, -0.06] },
  heroMobile: { ...look([28, 1.6, 31], [0.6, 3.2, 0.2], 50), shift: [0, 0] },
  og: { ...look([27.5, 1.2, 30.5], [-0.3, 3.0, 0.2], 31), shift: [0, -0.05] },
  stage: look([22, 14, 26], [0, 3, 0], 32),
  legacySteps: {
    tomt: look([16, 22, 22], [0, 0, 0], 35),
    grunnarbeid: look([16, 14, 20], [0, -0.4, 0], 36),
    fundament: look([15, 11, 19], [0, 0, 0], 34),
    bindingsverk: look([-18, 3.5, -20], [0, 3.5, 0], 40),
    isolasjon: look([18, 6, 18], [0, 3.4, 0], 36),
    tak: look([20, 12, 18], [0, 5.5, 0], 36),
    vinduer: look([22, 2.0, 8], [6, 4.2, 0], 40),
    kledning: look([4, 2.8, 15], [0, 3.2, 3.9], 40),
    installasjoner: look([-14, 2.2, -16], [0, 2.2, -3.9], 36),
    interior: look([18, 16, 20], [0, 4, 0], 34),
    nokkelferdig: { ...PHOTO_MATCH },
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

/* --------------------------------------------------------------------------------------------- */
/* Lighting                                                                                       */
/* --------------------------------------------------------------------------------------------- */

const norm = (v) => {
  const l = Math.hypot(...v);
  return v.map((x) => x / l);
};
/** Unit vectors towards the sun (direction §1.12). */
export const SUN_HAGE = norm([-0.55, 0.72, 0.42]);
export const SUN_INNKJORSEL = norm([0.78, 0.57, 0.26]);
const sunPos = (d, dist = 60) => r3(d.map((x) => x * dist));

/** Day sky (shader dome + PMREM): gradient + fbm cumulus. */
const DAY_SKY = {
  top: "#7fa1d2",
  mid: "#a6c5eb",
  horizon: "#eef3f8",
  below: "#cfd8c8",
  glow: "#fff6e6",
  glowStrength: 0.25,
  glowDir: SUN_HAGE,
  glowWidth: 6,
  clouds: {
    coverage: 0.3,
    scale: 0.0048,
    focusAzimuthDeg: -150,
    focusWidthDeg: 22,
    focusBoost: 0.3,
    color: "#ffffff",
    shadow: "#b7c3d3",
    driftMps: 1.2,
    note: "fbm cumulus, white with soft blue-grey bases, roughly where image 1 has them (upper left, a band over the hill)",
  },
  envTreeline: { color: "#2f3a25", height: 0.16, note: "dark green band at the env horizon: the reflected treeline in the glass (PMREM only, not the visible sky)" },
};

const dayPreset = (sun, note) => ({
  note,
  toneMapping: "Neutral",
  exposure: 0.92,
  background: "sky",
  sky: { ...DAY_SKY, glowDir: sun },
  envIntensity: 0.45,
  fog: { color: "#dce6ee", near: 160, far: 5200 },
  hemisphere: { sky: "#bbd3ee", ground: "#6c7040", intensity: 0.7 },
  key: { color: "#fff4e2", intensity: 6.0, position: sunPos(sun), castShadow: true },
  fill: null,
  lamps: 0.15,
  exteriorLights: 0,
  interiorLights: 0,
  bloom: null,
  shadow: { mapSize: 2048, mapSizeLite: 1024, frustum: 14, bias: -0.0004, normalBias: 0.03, autoUpdate: false },
});

export const LIGHTING = {
  sunHage: dayPreset(SUN_HAGE, "Summer daylight matched to Boligpartner images 1 and 2: sun from the south-west, about 46° high; garden face lit, east gable in soft shade."),
  sunInnkjorsel: dayPreset(SUN_INNKJORSEL, "Matched to image 3: sun from the east-south-east, about 35° high; R1 frame and east gable lit, north facade in shade."),
  paper: {
    note: "Light study model on paper #EDE8DF ('Til papir' in the timelapse, service diagrams, permit diagrams).",
    toneMapping: "Neutral",
    exposure: 0.9,
    background: "#ede8df",
    sky: { top: "#e9e4da", mid: "#efebe3", horizon: "#f2efe9", below: "#ede8df", glow: "#ffffff", glowStrength: 0.1, glowDir: [0, 0, 1], glowWidth: 3 },
    envIntensity: 0.6,
    fog: null,
    hemisphere: { sky: "#f4f1ea", ground: "#b9b1a3", intensity: 0.6 },
    key: { color: "#fff8ec", intensity: 2.3, position: [-16, 15, 9], castShadow: true },
    fill: { color: "#e6ecf2", intensity: 0.35, position: [14, 8, 12], castShadow: false },
    lamps: 0,
    exteriorLights: 0,
    interiorLights: 0,
    bloom: null,
    clay: { color: "#eae5dc", ground: "#e3ddd1", note: "white study model colour and paper-deep ground (uReal = 0)" },
  },
};
// legacy preset names used by the pre-Adria runtime: all daylight now (no blue hour)
LIGHTING.day = { ...LIGHTING.sunHage, note: "alias of sunHage (legacy name)" };
LIGHTING.bluehour = { ...LIGHTING.sunHage, note: "legacy name; Adria has no blue hour, this is sunHage" };
LIGHTING.stage = { ...LIGHTING.sunHage, note: "legacy name for the old dark build stage; now sunHage" };
