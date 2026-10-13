/**
 * Lighting for the live canvases, read from house.meta.json (lighting.*), the
 * same presets the posters were rendered with. Presets are "resolved" once
 * into numeric form so the build sequence can blend them per frame (stage →
 * blue hour at the last step, blue hour ↔ day on the toggle) without ever
 * changing the light count or tone mapping (no shader recompiles).
 */
import * as THREE from "three";
import type { LightingPreset, PointLightSpec, SkySpec, Vec3 } from "./meta";

/* -------------------------------------------------------------------------------------------- */
/* AgX tone mapping in JS (mirror of three's shader) — used to find the linear colour that       */
/* lands exactly on a page colour (fjord night) after tone mapping, so the stage melts into the */
/* page with no visible edge.                                                                    */
/* -------------------------------------------------------------------------------------------- */

type RGB = [number, number, number];
type M3 = [RGB, RGB, RGB]; // columns, as GLSL mat3(col0, col1, col2)

const mul = (m: M3, v: RGB): RGB => [
  m[0][0] * v[0] + m[1][0] * v[1] + m[2][0] * v[2],
  m[0][1] * v[0] + m[1][1] * v[1] + m[2][1] * v[2],
  m[0][2] * v[0] + m[1][2] * v[1] + m[2][2] * v[2],
];
const SRGB_TO_REC2020: M3 = [
  [0.6274, 0.0691, 0.0164],
  [0.3293, 0.9195, 0.088],
  [0.0433, 0.0113, 0.8956],
];
const REC2020_TO_SRGB: M3 = [
  [1.6605, -0.1246, -0.0182],
  [-0.5876, 1.1329, -0.1006],
  [-0.0728, -0.0083, 1.1187],
];
const AGX_INSET: M3 = [
  [0.856627153315983, 0.137318972929847, 0.11189821299995],
  [0.0951212405381588, 0.761241990602591, 0.0767994186031903],
  [0.0482516061458583, 0.101439036467562, 0.811302368396859],
];
const AGX_OUTSET: M3 = [
  [1.1271005818144368, -0.1413297634984383, -0.14132976349843826],
  [-0.11060664309660323, 1.157823702216272, -0.11060664309660294],
  [-0.016493938717834573, -0.016493938717834257, 1.2519364065950405],
];
const AGX_MIN_EV = -12.47393;
const AGX_MAX_EV = 4.026069;

function agxContrast(x: number) {
  const x2 = x * x;
  const x4 = x2 * x2;
  return 15.5 * x4 * x2 - 40.14 * x4 * x + 31.96 * x4 - 6.868 * x2 * x + 0.4298 * x2 + 0.1191 * x - 0.00232;
}

function agx(c: RGB, exposure: number): RGB {
  let v: RGB = [c[0] * exposure, c[1] * exposure, c[2] * exposure];
  v = mul(AGX_INSET, mul(SRGB_TO_REC2020, v));
  v = v.map((x) => {
    const n = (Math.log2(Math.max(x, 1e-10)) - AGX_MIN_EV) / (AGX_MAX_EV - AGX_MIN_EV);
    return agxContrast(Math.min(1, Math.max(0, n)));
  }) as RGB;
  v = mul(AGX_OUTSET, v).map((x) => Math.pow(Math.max(0, x), 2.2)) as RGB;
  return mul(REC2020_TO_SRGB, v).map((x) => Math.min(1, Math.max(0, x))) as RGB;
}

/** Linear colour that AgX (at `exposure`) maps onto `css` exactly. */
export function preToneMapped(css: string, exposure: number): THREE.Color {
  const target = new THREE.Color(css); // linear-sRGB working space
  const t: RGB = [target.r, target.g, target.b];
  let x: RGB = [...t];
  for (let i = 0; i < 160; i++) {
    const y = agx(x, exposure);
    x = x.map((xi, k) => Math.max(1e-6, xi * Math.pow(Math.max(t[k], 1e-6) / Math.max(y[k], 1e-6), 0.6))) as RGB;
  }
  return new THREE.Color(x[0], x[1], x[2]);
}

/* -------------------------------------------------------------------------------------------- */
/* Sky dome (same shader as scripts/render/page/render.js)                                       */
/* -------------------------------------------------------------------------------------------- */

export interface SkyUniforms {
  top: THREE.Color;
  mid: THREE.Color;
  horizon: THREE.Color;
  below: THREE.Color;
  glow: THREE.Color;
  glowDir: THREE.Vector3;
  glowStrength: number;
  glowWidth: number;
}

const SKY_VERTEX = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position.z = gl_Position.w;
}`;

const SKY_FRAGMENT = /* glsl */ `
uniform vec3 top; uniform vec3 mid; uniform vec3 horizon; uniform vec3 glow; uniform vec3 below;
uniform vec3 glowDir; uniform float glowStrength; uniform float glowWidth;
varying vec3 vDir;
void main() {
  float h = vDir.y;
  float hp = max(h, 0.0);
  vec3 c = mix(horizon, mid, smoothstep(0.0, 0.22, pow(hp, 0.8)));
  c = mix(c, top, smoothstep(0.12, 0.85, hp));
  vec2 az = normalize(vDir.xz + 1e-5);
  float facing = max(dot(az, normalize(glowDir.xz + 1e-5)), 0.0);
  float g = pow(facing, glowWidth) * exp(-hp * 10.0) + 0.1 * pow(facing, 2.0) * exp(-hp * 5.0);
  c = mix(c, glow, clamp(g * glowStrength, 0.0, 1.0));
  if (h < 0.0) c = mix(horizon, below, clamp(-h * 6.0, 0.0, 1.0));
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function createSkyMesh(radius = 1500) {
  const uniforms = {
    top: { value: new THREE.Color() },
    mid: { value: new THREE.Color() },
    horizon: { value: new THREE.Color() },
    below: { value: new THREE.Color() },
    glow: { value: new THREE.Color() },
    glowDir: { value: new THREE.Vector3(0, 0, 1) },
    glowStrength: { value: 0 },
    glowWidth: { value: 5 },
  };
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms,
    vertexShader: SKY_VERTEX,
    fragmentShader: SKY_FRAGMENT,
  });
  material.name = "sky";
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 24), material);
  mesh.name = "sky";
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  return { mesh, uniforms };
}

export function setSkyUniforms(u: ReturnType<typeof createSkyMesh>["uniforms"], s: SkyUniforms) {
  u.top.value.copy(s.top);
  u.mid.value.copy(s.mid);
  u.horizon.value.copy(s.horizon);
  u.below.value.copy(s.below);
  u.glow.value.copy(s.glow);
  u.glowDir.value.copy(s.glowDir);
  u.glowStrength.value = s.glowStrength;
  u.glowWidth.value = s.glowWidth;
}

function skyFromSpec(s: SkySpec): SkyUniforms {
  return {
    top: new THREE.Color(s.top),
    mid: new THREE.Color(s.mid ?? s.top),
    horizon: new THREE.Color(s.horizon),
    below: new THREE.Color(s.below ?? s.horizon),
    glow: new THREE.Color(s.glow),
    glowDir: new THREE.Vector3(...(s.glowDir ?? [0.3, 0.05, 1])).normalize(),
    glowStrength: s.glowStrength ?? 0.3,
    glowWidth: s.glowWidth ?? 5,
  };
}

function flatSky(c: THREE.Color): SkyUniforms {
  return {
    top: c.clone(),
    mid: c.clone(),
    horizon: c.clone(),
    below: c.clone(),
    glow: c.clone(),
    glowDir: new THREE.Vector3(0, 0, 1),
    glowStrength: 0,
    glowWidth: 5,
  };
}

/** PMREM environment from a sky (the IBL matches the visible sky, as in the posters). */
export function skyEnvironment(gl: THREE.WebGLRenderer, sky: SkyUniforms) {
  const pmrem = new THREE.PMREMGenerator(gl);
  const scene = new THREE.Scene();
  const { mesh, uniforms } = createSkyMesh(100);
  setSkyUniforms(uniforms, sky);
  scene.add(mesh);
  const rt = pmrem.fromScene(scene, 0.02);
  mesh.geometry.dispose();
  mesh.material.dispose();
  pmrem.dispose();
  return rt;
}

/* -------------------------------------------------------------------------------------------- */
/* Resolved presets + blending                                                                   */
/* -------------------------------------------------------------------------------------------- */

export interface ResolvedLight {
  color: THREE.Color;
  intensity: number;
  position: THREE.Vector3;
}

export interface ResolvedLighting {
  exposure: number;
  /** Visible dome. */
  sky: SkyUniforms;
  /** Sky used for the IBL. */
  envSky: SkyUniforms;
  envIntensity: number;
  fogColor: THREE.Color;
  fogNear: number;
  fogFar: number;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  hemiIntensity: number;
  key: ResolvedLight;
  fill: ResolvedLight;
  lamps: number;
  exterior: number;
  interior: number;
  interiorColor: THREE.Color;
  bloomStrength: number;
  bloomRadius: number;
  bloomThreshold: number;
  /** 1 = environment uses the preset's monochrome stage materials. */
  stageEnv: number;
}

export interface ResolveOptions {
  /**
   * Exposure every preset is rendered at. One exposure for all presets keeps
   * the AgX curve fixed; each preset's own exposure is folded into its light
   * intensities instead (so blending never re-tone-maps the page colour).
   */
  exposure?: number;
  /** Solid backgrounds land exactly on this colour after tone mapping. */
  matchBackground?: boolean;
}

export function resolvePreset(p: LightingPreset, opts: ResolveOptions = {}): ResolvedLighting {
  const exposure = opts.exposure ?? p.exposure;
  const gain = p.exposure / exposure;
  const solid = p.background !== "sky";
  const bg = solid
    ? opts.matchBackground
      ? preToneMapped(p.background, exposure)
      : new THREE.Color(p.background).multiplyScalar(gain)
    : null;
  const envSky = skyFromSpec(p.sky);
  const sky = bg ? flatSky(bg) : scaleSky(skyFromSpec(p.sky), gain);
  const fogColor = p.fog
    ? solid && opts.matchBackground && p.fog.color.toLowerCase() === p.background.toLowerCase()
      ? bg!.clone()
      : new THREE.Color(p.fog.color).multiplyScalar(gain)
    : (bg ?? sky.horizon).clone();
  const key: ResolvedLight = p.key
    ? { color: new THREE.Color(p.key.color), intensity: p.key.intensity * gain, position: new THREE.Vector3(...p.key.position) }
    : { color: new THREE.Color("#ffffff"), intensity: 0, position: new THREE.Vector3(-20, 30, 20) };
  const fill: ResolvedLight = p.fill
    ? { color: new THREE.Color(p.fill.color), intensity: p.fill.intensity * gain, position: new THREE.Vector3(...p.fill.position) }
    : { color: key.color.clone(), intensity: 0, position: key.position.clone() };
  return {
    exposure,
    sky,
    envSky,
    envIntensity: p.envIntensity * gain,
    fogColor,
    fogNear: p.fog ? p.fog.near : 4000,
    fogFar: p.fog ? p.fog.far : 5000,
    hemiSky: new THREE.Color(p.hemisphere?.sky ?? "#ffffff"),
    hemiGround: new THREE.Color(p.hemisphere?.ground ?? "#000000"),
    hemiIntensity: (p.hemisphere?.intensity ?? 0) * gain,
    key,
    fill,
    lamps: p.lamps * gain,
    exterior: p.exteriorLights * gain,
    interior: p.interiorLights * gain,
    interiorColor: new THREE.Color(p.interiorColor ?? "#ffc98a"),
    bloomStrength: p.bloom?.strength ?? 0,
    bloomRadius: p.bloom?.radius ?? 0.4,
    bloomThreshold: p.bloom?.threshold ?? 1,
    stageEnv: p.envMaterials ? 1 : 0,
  };
}

function scaleSky(s: SkyUniforms, k: number): SkyUniforms {
  if (k === 1) return s;
  s.top.multiplyScalar(k);
  s.mid.multiplyScalar(k);
  s.horizon.multiplyScalar(k);
  s.below.multiplyScalar(k);
  s.glow.multiplyScalar(k);
  return s;
}

function cloneSky(s: SkyUniforms): SkyUniforms {
  return {
    top: s.top.clone(),
    mid: s.mid.clone(),
    horizon: s.horizon.clone(),
    below: s.below.clone(),
    glow: s.glow.clone(),
    glowDir: s.glowDir.clone(),
    glowStrength: s.glowStrength,
    glowWidth: s.glowWidth,
  };
}

export function cloneResolved(r: ResolvedLighting): ResolvedLighting {
  return {
    ...r,
    sky: cloneSky(r.sky),
    envSky: cloneSky(r.envSky),
    fogColor: r.fogColor.clone(),
    hemiSky: r.hemiSky.clone(),
    hemiGround: r.hemiGround.clone(),
    key: { color: r.key.color.clone(), intensity: r.key.intensity, position: r.key.position.clone() },
    fill: { color: r.fill.color.clone(), intensity: r.fill.intensity, position: r.fill.position.clone() },
    interiorColor: r.interiorColor.clone(),
  };
}

const lerpN = (a: number, b: number, t: number) => a + (b - a) * t;

function lerpSky(out: SkyUniforms, a: SkyUniforms, b: SkyUniforms, t: number) {
  out.top.lerpColors(a.top, b.top, t);
  out.mid.lerpColors(a.mid, b.mid, t);
  out.horizon.lerpColors(a.horizon, b.horizon, t);
  out.below.lerpColors(a.below, b.below, t);
  out.glow.lerpColors(a.glow, b.glow, t);
  out.glowDir.lerpVectors(a.glowDir, b.glowDir, t).normalize();
  out.glowStrength = lerpN(a.glowStrength, b.glowStrength, t);
  out.glowWidth = lerpN(a.glowWidth, b.glowWidth, t);
}

/** out = a·(1−t) + b·t (out may not alias a or b). */
export function lerpResolved(out: ResolvedLighting, a: ResolvedLighting, b: ResolvedLighting, t: number) {
  out.exposure = lerpN(a.exposure, b.exposure, t);
  lerpSky(out.sky, a.sky, b.sky, t);
  lerpSky(out.envSky, a.envSky, b.envSky, t);
  out.envIntensity = lerpN(a.envIntensity, b.envIntensity, t);
  out.fogColor.lerpColors(a.fogColor, b.fogColor, t);
  // Fog distances blend in log space so "no fog" (thousands of metres) eases in gently.
  out.fogNear = Math.exp(lerpN(Math.log(a.fogNear), Math.log(b.fogNear), t));
  out.fogFar = Math.exp(lerpN(Math.log(a.fogFar), Math.log(b.fogFar), t));
  out.hemiSky.lerpColors(a.hemiSky, b.hemiSky, t);
  out.hemiGround.lerpColors(a.hemiGround, b.hemiGround, t);
  out.hemiIntensity = lerpN(a.hemiIntensity, b.hemiIntensity, t);
  out.key.color.lerpColors(a.key.color, b.key.color, t);
  out.key.intensity = lerpN(a.key.intensity, b.key.intensity, t);
  out.key.position.lerpVectors(a.key.position, b.key.position, t);
  out.fill.color.lerpColors(a.fill.color, b.fill.color, t);
  out.fill.intensity = lerpN(a.fill.intensity, b.fill.intensity, t);
  out.fill.position.lerpVectors(a.fill.position, b.fill.position, t);
  out.lamps = lerpN(a.lamps, b.lamps, t);
  out.exterior = lerpN(a.exterior, b.exterior, t);
  out.interior = lerpN(a.interior, b.interior, t);
  out.interiorColor.lerpColors(a.interiorColor, b.interiorColor, t);
  out.bloomStrength = lerpN(a.bloomStrength, b.bloomStrength, t);
  out.bloomRadius = lerpN(a.bloomRadius, b.bloomRadius, t);
  out.bloomThreshold = lerpN(a.bloomThreshold, b.bloomThreshold, t);
  out.stageEnv = lerpN(a.stageEnv, b.stageEnv, t);
  return out;
}

/* -------------------------------------------------------------------------------------------- */
/* Light rig: a fixed set of lights whose values follow a resolved preset                        */
/* -------------------------------------------------------------------------------------------- */

export interface LightRigOptions {
  interior: PointLightSpec[];
  exterior: PointLightSpec[];
  shadowMapSize: number;
  shadowExtent?: number;
  shadowTarget?: Vec3;
}

export class LightRig {
  readonly group = new THREE.Group();
  readonly hemi = new THREE.HemisphereLight();
  readonly key = new THREE.DirectionalLight();
  readonly fill = new THREE.DirectionalLight();
  readonly interior: { light: THREE.PointLight; spec: PointLightSpec }[] = [];
  readonly exterior: { light: THREE.PointLight; spec: PointLightSpec }[] = [];
  private target: THREE.Vector3;

  constructor(opts: LightRigOptions) {
    this.target = new THREE.Vector3(...(opts.shadowTarget ?? [0, 2, 0.5]));
    this.group.name = "lights";
    this.group.add(this.hemi, this.key, this.key.target, this.fill, this.fill.target);
    const k = this.key;
    k.castShadow = opts.shadowMapSize > 0;
    if (k.castShadow) {
      const s = opts.shadowExtent ?? 18;
      k.shadow.mapSize.set(opts.shadowMapSize, opts.shadowMapSize);
      Object.assign(k.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 1, far: 160 });
      k.shadow.camera.updateProjectionMatrix();
      k.shadow.bias = -0.0003;
      k.shadow.normalBias = 0.04;
      k.shadow.radius = 3;
    }
    for (const spec of opts.interior) {
      const light = new THREE.PointLight(spec.color, 0, 9, 2);
      light.position.set(...spec.position);
      this.interior.push({ light, spec });
      this.group.add(light);
    }
    for (const spec of opts.exterior) {
      const light = new THREE.PointLight(spec.color, 0, 5, 2);
      light.position.set(...spec.position);
      this.exterior.push({ light, spec });
      this.group.add(light);
    }
  }

  /** `interiorOverride` lifts the warm interior lights (e.g. the section view). */
  apply(r: ResolvedLighting, interiorOverride = 0) {
    this.hemi.color.copy(r.hemiSky);
    this.hemi.groundColor.copy(r.hemiGround);
    this.hemi.intensity = r.hemiIntensity;
    this.key.color.copy(r.key.color);
    this.key.intensity = r.key.intensity;
    this.key.position.copy(r.key.position).add(this.target);
    this.key.target.position.copy(this.target);
    this.fill.color.copy(r.fill.color);
    this.fill.intensity = r.fill.intensity;
    this.fill.position.copy(r.fill.position).add(this.target);
    this.fill.target.position.copy(this.target);
    const interior = Math.max(r.interior, interiorOverride);
    for (const { light, spec } of this.interior) {
      light.color.copy(r.interiorColor);
      light.intensity = interior * spec.intensity;
      light.visible = true;
    }
    for (const { light, spec } of this.exterior) {
      light.intensity = r.exterior * spec.intensity;
    }
  }
}

/* -------------------------------------------------------------------------------------------- */
/* Environment materials (monochrome slate site on the dark stage ↔ real colours)               */
/* -------------------------------------------------------------------------------------------- */

export interface StageMixUniforms {
  uStageColor: { value: THREE.Color };
  uStageRough: { value: number };
  uStageMix: { value: number };
}

/**
 * Patch a material so it can blend towards a flat stage colour (preset
 * envMaterials) with one uniform. Same patch for every material, so they all
 * share programs.
 */
export function makeStageMixable(material: THREE.MeshStandardMaterial, color: string, roughness: number) {
  const uniforms: StageMixUniforms = {
    uStageColor: { value: new THREE.Color(color) },
    uStageRough: { value: roughness },
    uStageMix: { value: 0 },
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform vec3 uStageColor;\nuniform float uStageRough;\nuniform float uStageMix;",
      )
      .replace("#include <color_fragment>", "#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, uStageColor, uStageMix);")
      .replace(
        "#include <roughnessmap_fragment>",
        "#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, uStageRough, uStageMix);",
      );
  };
  material.customProgramCacheKey = () => "stage-mix";
  return uniforms;
}
