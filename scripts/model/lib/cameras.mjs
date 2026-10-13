/**
 * Camera presets and lighting presets shared by the renderer
 * (scripts/render) and written into house.meta.json for the live 3D.
 * Positions are world metres; fov is vertical, in degrees.
 */
export const CAMERAS = {
  hero: { position: [-9.5, 1.6, 17.5], target: [-2.5, 4.8, 0.5], fov: 36 },
  heroMobile: { position: [-7.5, 1.5, 19.5], target: [0.2, 5.2, 0.6], fov: 44 },
  og: { position: [-10.5, 1.8, 19], target: [-1.6, 4.6, 0.5], fov: 34 },
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

export const LIGHTING = {
  bluehour: {
    toneMapping: "ACESFilmic",
    exposure: 1.0,
    sky: { top: "#0b1626", horizon: "#3a5068", glow: "#8a6f62", glowStrength: 0.35 },
    fog: { color: "#26364a", near: 40, far: 260 },
    hemisphere: { sky: "#5d7596", ground: "#1d2420", intensity: 0.55 },
    key: { color: "#9db4d6", intensity: 0.35, position: [-30, 40, -20] },
    windows: { color: "#ffc98a", intensity: 1.0 },
  },
  day: {
    toneMapping: "ACESFilmic",
    exposure: 1.0,
    sky: { top: "#a9b8c2", horizon: "#dfe1dc", glow: "#ece6da", glowStrength: 0.2 },
    fog: { color: "#c8cfd1", near: 60, far: 380 },
    hemisphere: { sky: "#dfe6ea", ground: "#55604a", intensity: 1.15 },
    key: { color: "#fff4e4", intensity: 1.6, position: [-25, 45, 30] },
    windows: { color: "#ffc98a", intensity: 0.0 },
  },
  stage: {
    note: "Build-sequence stage: dark background #0E1416, fog to background, model reads like an architectural model on a dark table.",
    background: "#0e1416",
    fog: { color: "#0e1416", near: 30, far: 75 },
  },
};
