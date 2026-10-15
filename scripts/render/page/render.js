/**
 * Browser side of the render harness. Loads the Adria house (parts layout) and
 * the permit diagrams, and renders "shots" described as plain JSON by
 * scripts/render/shots.mjs. window.renderShot(shot) → PNG data URL.
 *
 * Shot fields (all optional except camera):
 *   camera      {position, target, fov, shift?} or a photo preset
 *               {position, rotation:{y (deg)}, fov, aspect, viewOffset}
 *   crop        override of camera.viewOffset (e.g. the square phone crop)
 *   lighting    preset name in meta.lighting (+ lightingOverrides)
 *   roof        "saltak" | "flatt" | "pulttak"           (default meta.defaultRoof)
 *   seInn       true: no roof, no __ceiling nodes (look into the upper floor)
 *   step        last visible layer id (meta.steps); transient groups follow hideFrom
 *   hideLayers / onlyLayers / hideNodes (prefix) / showNodes (regex)
 *   env         false: hide env_* groups; noTrees, noFraming
 *   fx          true: show fx_lines (ink linework)
 *   clay        {color, highlight[], highlightColor}: white study model
 *   clip        [{normal, constant, layers?, nodes?}]
 *   claddingRaw / materialColors / extras ("tilbygg" | "pabygg") / permit
 *   shadowTarget, shadowExtent, shadowMapSize, ao (false), exposure
 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.localClippingEnabled = true;
renderer.setPixelRatio(1);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 16 / 9, 0.1, 6000);
const pmrem = new THREE.PMREMGenerator(renderer);

let house;
let permits;
let meta;
const orig = new Map(); // mesh → original material
const byName = new Map();
const lights = new THREE.Group();
scene.add(lights);
let sky;
const extrasGroup = new THREE.Group();
scene.add(extrasGroup);

const NO_CAST = /^(env_trees|env_backdrop|env_outbuilding|env_terrain|env_lawn|env_hedge|fx_lines)/;

async function load() {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const [h, p, m] = await Promise.all([
    loader.loadAsync("/models/house.glb"),
    loader.loadAsync("/models/permits.glb").catch(() => null),
    fetch("/models/house.meta.json").then((r) => r.json()),
  ]);
  meta = m;
  house = h.scene.children.find((c) => c.name === "House") || h.scene;
  scene.add(h.scene);
  h.scene.traverse((o) => {
    if (o.name) byName.set(o.name, o);
    if (!o.isMesh && !o.isLine) return;
    orig.set(o, o.material);
    const n = o.material.name;
    const top = topGroup(o);
    o.castShadow = !["glass", "glass_rail", "lamp_glow", "line_ink", "backdrop", "terrain"].includes(n) && !NO_CAST.test(top);
    o.receiveShadow = !["lamp_glow", "line_ink", "backdrop"].includes(n);
    if (n === "glass" || n === "glass_rail") {
      o.material.depthWrite = false;
      o.renderOrder = 2;
    }
    if (n === "leaf") {
      o.material.alphaTest = 0.45;
      o.material.side = THREE.DoubleSide;
      if (o.material.map) o.material.map.anisotropy = 8;
    }
    if (o.isLine) o.renderOrder = 3;
  });
  if (p) {
    permits = p.scene;
    scene.add(permits);
    permits.visible = false;
    permits.traverse((o) => {
      if (o.name) byName.set(o.name, o);
      if (o.isMesh) {
        orig.set(o, o.material);
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    addPermitEdges(permits);
  }
  window.meta = meta;
  window.__scene = scene;
  window.ready = true;
}

function topGroup(o) {
  let p = o;
  let last = o;
  while (p && p !== house) {
    last = p;
    p = p.parent;
  }
  return last ? last.name || "" : "";
}

function layerOf(o) {
  let p = o;
  while (p) {
    if (p.name && p.name.startsWith("layer_")) return p.name.slice(6);
    p = p.parent;
  }
  return null;
}

/* ------------------------------------------------------------------------------------------------ */
/* Sky (gradient + fbm cumulus) and lighting                                                        */
/* ------------------------------------------------------------------------------------------------ */

const SKY_VERT = `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position.z = gl_Position.w; }`;
const SKY_FRAG = `
uniform vec3 top; uniform vec3 mid; uniform vec3 horizon; uniform vec3 glow; uniform vec3 below;
uniform vec3 glowDir; uniform float glowStrength; uniform float glowWidth;
uniform float cloudCover; uniform float cloudScale; uniform vec3 cloudColor; uniform vec3 cloudShadow; uniform vec2 cloudOffset;
uniform vec3 treeline; uniform float treelineH; uniform float envMode;
uniform float focusAz; uniform float focusW; uniform float focusBoost;
varying vec3 vDir;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y); }
float fbm(vec2 p){ float s = 0.0; float a = 0.5; for (int i = 0; i < 6; i++){ s += a*noise(p); p = p*2.03 + vec2(17.1, 9.2); a *= 0.5; } return s; }
void main(){
  vec3 d = normalize(vDir);
  float h = d.y; float hp = max(h, 0.0);
  vec3 c = mix(horizon, mid, smoothstep(0.0, 0.22, pow(hp, 0.8)));
  c = mix(c, top, smoothstep(0.12, 0.85, hp));
  vec2 az = normalize(d.xz + 1e-5);
  float facing = max(dot(az, normalize(glowDir.xz + 1e-5)), 0.0);
  float g = pow(facing, glowWidth) * exp(-hp * 6.0);
  c = mix(c, glow, clamp(g * glowStrength, 0.0, 1.0));
  if (cloudCover > 0.0 && h > 0.0) {
    vec2 uv = d.xz / (h + 0.12) * cloudScale * 400.0 + cloudOffset;
    float n = fbm(uv);
    float n2 = fbm(uv * 3.1 + 5.0);
    float daz = atan(sin(atan(d.z, d.x) - focusAz), cos(atan(d.z, d.x) - focusAz));
    float cov = cloudCover + focusBoost * exp(-(daz * daz) / (focusW * focusW)) * (1.0 - smoothstep(0.05, 0.35, h));
    float dens = n * 0.8 + n2 * 0.3;
    float k = smoothstep(1.0 - cov, 1.0 - cov + 0.06, dens);
    // lit tops, blue-grey bases: compare density a little "below" (towards the horizon)
    float below = fbm(uv * 1.0 + normalize(d.xz + 1e-5) * 0.25) * 0.8 + n2 * 0.3;
    float base = smoothstep(-0.05, 0.12, below - dens);
    vec3 cc = mix(cloudColor, cloudShadow, clamp(base * 0.85 + (1.0 - smoothstep(1.0 - cov, 1.0 - cov + 0.35, dens)) * 0.35, 0.0, 1.0));
    c = mix(c, cc, k * smoothstep(0.0, 0.08, h));
  }
  if (h < 0.0) c = mix(horizon, below, clamp(-h * 6.0, 0.0, 1.0));
  if (envMode > 0.5) c = mix(c, treeline, smoothstep(-0.02, 0.0, h) * (1.0 - smoothstep(treelineH * 0.6, treelineH, h)));
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

function makeSky(spec, { env = false } = {}) {
  const cl = spec.clouds || null;
  const tl = spec.envTreeline || null;
  const geo = new THREE.SphereGeometry(4500, 64, 32);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      top: { value: new THREE.Color(spec.top) },
      mid: { value: new THREE.Color(spec.mid || spec.top) },
      horizon: { value: new THREE.Color(spec.horizon) },
      glow: { value: new THREE.Color(spec.glow) },
      below: { value: new THREE.Color(spec.below || spec.horizon) },
      glowDir: { value: new THREE.Vector3(...(spec.glowDir || [0, 0, 1])).normalize() },
      glowStrength: { value: spec.glowStrength ?? 0.2 },
      glowWidth: { value: spec.glowWidth ?? 5 },
      cloudCover: { value: cl && !env ? cl.coverage : cl ? cl.coverage * 0.6 : 0 },
      cloudScale: { value: cl ? cl.scale : 0.003 },
      cloudColor: { value: new THREE.Color(cl ? cl.color : "#ffffff") },
      cloudShadow: { value: new THREE.Color(cl ? cl.shadow : "#cccccc") },
      cloudOffset: { value: new THREE.Vector2(cl?.offset?.[0] ?? 3.1, cl?.offset?.[1] ?? 7.7) },
      treeline: { value: new THREE.Color(tl ? tl.color : "#2f3a25") },
      treelineH: { value: tl ? tl.height : 0.05 },
      envMode: { value: env && tl ? 1 : 0 },
      focusAz: { value: THREE.MathUtils.degToRad(cl?.focusAzimuthDeg ?? 0) },
      focusW: { value: THREE.MathUtils.degToRad(cl?.focusWidthDeg ?? 30) },
      focusBoost: { value: cl?.focusBoost ?? 0 },
    },
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
  });
  return new THREE.Mesh(geo, mat);
}

const TONE = { ACESFilmic: THREE.ACESFilmicToneMapping, AgX: THREE.AgXToneMapping, Neutral: THREE.NeutralToneMapping };

function merge(a, b) {
  if (!b) return a;
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = v && typeof v === "object" && !Array.isArray(v) && a[k] && typeof a[k] === "object" ? merge(a[k], v) : v;
  return out;
}

function directional(spec, target, shot, P) {
  const l = new THREE.DirectionalLight(spec.color, spec.intensity);
  l.position.set(...spec.position).add(new THREE.Vector3(...target));
  l.target.position.set(...target);
  if (spec.castShadow) {
    l.castShadow = true;
    const size = shot.shadowMapSize || 4096;
    l.shadow.mapSize.set(size, size);
    const s = shot.shadowExtent || P.shadow?.frustum || 18;
    Object.assign(l.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 1, far: 220 });
    l.shadow.bias = shot.shadowBias ?? P.shadow?.bias ?? -0.0003;
    l.shadow.normalBias = shot.normalBias ?? P.shadow?.normalBias ?? 0.03;
    l.shadow.radius = 3;
  }
  return l;
}

let currentEnv = null;
function setLighting(name, shot) {
  const P = merge(meta.lighting[name], shot.lightingOverrides);
  if (!P) throw new Error(`Unknown lighting preset ${name}`);
  lights.clear();
  if (sky) scene.remove(sky);
  sky = makeSky(P.sky);
  const envScene = new THREE.Scene();
  envScene.add(makeSky(P.sky, { env: true }));
  if (currentEnv) currentEnv.dispose();
  currentEnv = pmrem.fromScene(envScene, 0.02).texture;
  scene.environment = currentEnv;
  scene.environmentIntensity = P.envIntensity;
  if (P.background === "sky") {
    scene.background = null;
    scene.add(sky);
  } else scene.background = new THREE.Color(P.background);
  scene.fog = P.fog ? new THREE.Fog(P.fog.color, P.fog.near, P.fog.far) : null;
  renderer.toneMapping = TONE[P.toneMapping] ?? THREE.AgXToneMapping;
  renderer.toneMappingExposure = shot.exposure ?? P.exposure;
  const tgt = shot.shadowTarget || [2, 1.5, 2];
  if (P.hemisphere) lights.add(new THREE.HemisphereLight(P.hemisphere.sky, P.hemisphere.ground, P.hemisphere.intensity));
  if (P.key) {
    const k = directional(P.key, tgt, shot, P);
    lights.add(k, k.target);
  }
  if (P.fill) {
    const f = directional(P.fill, tgt, shot, P);
    lights.add(f, f.target);
  }
  for (const [mesh, mat] of orig) {
    if (mat.name !== "lamp_glow") continue;
    mesh.material = mesh.material.clone();
    mesh.material.emissiveIntensity = mat.emissiveIntensity * (P.lamps ?? 0);
  }
  return P;
}

/* ------------------------------------------------------------------------------------------------ */
/* Shot state                                                                                        */
/* ------------------------------------------------------------------------------------------------ */

function resetState() {
  for (const [mesh, mat] of orig) {
    mesh.material = mat;
    mesh.visible = true;
    if (mesh.userData.__cast !== undefined) mesh.castShadow = mesh.userData.__cast;
  }
  house.traverse((o) => {
    if (o !== house) o.visible = true;
    if (o.userData && o.userData.__pos) o.position.copy(o.userData.__pos);
  });
  extrasGroup.clear();
  if (permits) permits.visible = false;
  house.visible = true;
}

function rememberPositions() {
  house.traverse((o) => {
    o.userData.__pos = o.position.clone();
    if (o.isMesh) o.userData.__cast = o.castShadow;
  });
}

function matchNodes(pattern) {
  const out = [];
  const re = new RegExp(pattern);
  house.traverse((o) => {
    if (o.name && re.test(o.name)) out.push(o);
  });
  return out;
}

function swapMaterial(name, fn) {
  for (const [mesh, mat] of orig) {
    if (mat.name !== name) continue;
    if (mesh.material === mat) mesh.material = mat.clone();
    fn(mesh.material);
  }
}

function applyShot(shot) {
  resetState();
  const steps = meta.steps;
  const idx = shot.step ? steps.indexOf(shot.step) : steps.length - 1;
  for (const id of steps) {
    const node = byName.get(`layer_${id}`);
    node.visible = steps.indexOf(id) <= idx && !(shot.hideLayers || []).includes(id);
    if (shot.onlyLayers) node.visible = shot.onlyLayers.includes(id);
  }
  if (shot.transient !== false) {
    house.traverse((o) => {
      const hf = o.userData && o.userData.hideFrom;
      if (hf && steps.indexOf(hf) <= idx) o.visible = false;
    });
  }
  // roof form, Se inn
  const roof = shot.roof || meta.defaultRoof;
  const others = meta.roofVariants.filter((r) => r !== roof);
  house.traverse((o) => {
    if (!o.name) return;
    if (others.some((r) => o.name.includes(`__${r}`))) o.visible = false;
    if (shot.seInn && o.name.endsWith("__ceiling")) o.visible = false;
    if (shot.seInn && o.name.includes(`__${roof}`) && layerOf(o) === "tak") o.visible = false;
  });
  // fx lines
  const fx = byName.get("fx_lines");
  if (fx) fx.visible = Boolean(shot.fx);
  for (const n of shot.hideNodes || []) matchNodes(`^${n}`).forEach((m) => (m.visible = false));
  for (const n of shot.showNodes || []) matchNodes(n).forEach((m) => (m.visible = true));
  if (shot.env === false) house.children.filter((c) => c.name.startsWith("env_")).forEach((c) => (c.visible = false));
  if (shot.noTrees) byName.get("env_trees") && (byName.get("env_trees").visible = false);
  if (shot.noFraming) matchNodes("^nokkelferdig_rammeblader").forEach((m) => (m.visible = false));
  if (shot.claddingRaw) swapMaterial("cladding_wood", (m) => m.color.set(meta.materials.cladding_wood.rawColorFactor));
  for (const o of shot.materialColors || []) {
    swapMaterial(o.name, (m) => {
      if (o.color) m.color.set(o.color);
      if (o.roughness !== undefined) m.roughness = o.roughness;
    });
  }
  if (shot.clay) applyClay(shot.clay);
  if (shot.clip) {
    const planes = shot.clip.map((c) => new THREE.Plane(new THREE.Vector3(...c.normal).normalize(), c.constant));
    for (const [mesh] of orig) {
      if (!mesh.visible) continue;
      const lid = layerOf(mesh);
      if (!lid && !shot.clipEnv) continue;
      const appl = shot.clip
        .filter((c) => (!c.layers || c.layers.includes(lid)) && (!c.nodes || new RegExp(c.nodes).test(mesh.name)) && (!c.notNodes || !new RegExp(c.notNodes).test(mesh.name)))
        .map((c) => planes[shot.clip.indexOf(c)]);
      if (!appl.length) continue;
      if (mesh.material === orig.get(mesh)) mesh.material = mesh.material.clone();
      mesh.material.clippingPlanes = appl;
      mesh.material.clipShadows = true;
      mesh.material.side = THREE.DoubleSide;
    }
  }
  if (shot.extras) buildExtras(shot.extras);
  if (shot.permit) {
    house.visible = false;
    permits.visible = true;
    permits.children.forEach((c) => (c.visible = c.name === `permit_${shot.permit}`));
  }
}

function addPermitEdges(root) {
  const meshes = [];
  root.traverse((o) => {
    if (o.isMesh && /^permit_(existing|new)/.test(o.material.name)) meshes.push(o);
  });
  for (const m of meshes) {
    const isNew = m.material.name.startsWith("permit_new");
    const line = new THREE.LineSegments(
      new THREE.EdgesGeometry(m.geometry, 30),
      new THREE.LineBasicMaterial({ color: isNew ? "#c9a86a" : "#1d2326", transparent: true, opacity: isNew ? 0.9 : 0.35 }),
    );
    line.name = `${m.name}_kant`;
    m.add(line);
  }
}

/** White study model: every house layer in clay (env optionally in paper tones). */
function applyClay({ color = "#eae5dc", ground = null, highlight = [], highlightColor = "#b08b5e", env = false } = {}) {
  const clay = new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0 });
  const glassClay = new THREE.MeshStandardMaterial({ color: "#d9d4ca", roughness: 0.35, metalness: 0 });
  const leafClay = new THREE.MeshStandardMaterial({ color, roughness: 0.95, alphaTest: 0.45, side: THREE.DoubleSide });
  const groundClay = ground ? new THREE.MeshStandardMaterial({ color: ground, roughness: 1 }) : null;
  for (const [mesh, mat] of orig) {
    if (!mesh.visible || mesh.isLine) continue;
    const lid = layerOf(mesh);
    const isEnv = !lid;
    if (isEnv && !env) continue;
    if (mat.name === "leaf") {
      const m = leafClay.clone();
      m.map = mat.map;
      mesh.material = m;
    } else if (isEnv && groundClay && (mat.name === "terrain" || mat.name === "slab")) mesh.material = groundClay;
    else mesh.material = mat.name === "glass" || mat.name === "glass_rail" ? glassClay : clay;
  }
  for (const h of highlight) {
    matchNodes(h).forEach((o) =>
      o.traverse((m) => {
        if (m.isMesh) m.material = new THREE.MeshStandardMaterial({ color: highlightColor, roughness: 0.75 });
      }),
    );
  }
}

/** Service diagrams on the Adria footprint (tilbygg on the west gable, påbygg = one more storey). */
function buildExtras(kind) {
  const oak = new THREE.MeshStandardMaterial({ color: "#b08b5e", roughness: 0.72 });
  const oakDark = new THREE.MeshStandardMaterial({ color: "#8e6c45", roughness: 0.62 });
  const brass = new THREE.MeshStandardMaterial({ color: "#c9a86a", roughness: 0.35, metalness: 0.7 });
  const glass = new THREE.MeshStandardMaterial({ color: "#3b4448", roughness: 0.1 });
  const shadowy = (g) => g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  const HX = 7.8;
  const HZ = 3.9;
  if (kind === "tilbygg") {
    const g = new THREE.Group();
    const L = 4.2;
    const Wd = 5.4;
    const H = 3.2;
    const body = new THREE.Mesh(new THREE.BoxGeometry(L, H, Wd), oak);
    body.position.set(-HX - L / 2, H / 2 - 0.05, -0.6);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(L + 0.3, 0.2, Wd + 0.3), oakDark);
    roof.position.set(-HX - L / 2 - 0.1, H + 0.05, -0.6);
    const win = new THREE.Mesh(new THREE.BoxGeometry(L - 0.9, H - 1.0, 0.04), glass);
    win.position.set(-HX - L / 2, (H - 1.0) / 2 + 0.3, -0.6 + Wd / 2 + 0.02);
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.05, H, Wd), brass);
    seam.position.set(-HX - 0.02, H / 2 - 0.05, -0.6);
    g.add(body, roof, win, seam);
    shadowy(g);
    extrasGroup.add(g);
  }
  if (kind === "pabygg") {
    const cut = 5.9;
    const lift = 2.8;
    const lower = new THREE.Plane(new THREE.Vector3(0, -1, 0), cut);
    const upper = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(cut + lift));
    const clones = new THREE.Group();
    for (const id of meta.steps) {
      const node = byName.get(`layer_${id}`);
      if (!node.visible) continue;
      const c = node.clone(true);
      c.traverse((o) => {
        if (o.isMesh) {
          o.material = o.material.clone();
          o.material.clippingPlanes = [upper];
          o.material.side = THREE.DoubleSide;
        }
      });
      clones.add(c);
      node.traverse((o) => {
        if (o.isMesh) {
          if (o.material === orig.get(o)) o.material = o.material.clone();
          o.material.clippingPlanes = [lower];
          o.material.side = THREE.DoubleSide;
        }
      });
    }
    clones.position.y = lift;
    extrasGroup.add(clones);
    const band = new THREE.Mesh(new THREE.BoxGeometry(2 * HX, lift, 2 * HZ), oak);
    band.position.set(0, cut + lift / 2, 0);
    const seam = new THREE.Mesh(new THREE.BoxGeometry(2 * HX + 0.04, 0.05, 2 * HZ + 0.04), brass);
    seam.position.set(0, cut, 0);
    extrasGroup.add(band, seam);
    shadowy(extrasGroup);
  }
}

/* ------------------------------------------------------------------------------------------------ */
/* Camera + render                                                                                   */
/* ------------------------------------------------------------------------------------------------ */

function setCamera(cam, W, H, crop) {
  camera.clearViewOffset();
  camera.near = cam.near || 0.15;
  camera.far = cam.far || 6000;
  camera.position.set(...cam.position);
  const vo = crop || cam.viewOffset;
  if (cam.rotation && vo) {
    // photo camera: yaw only, lens shift via the virtual full frame
    camera.rotation.set(0, 0, 0, "YXZ");
    camera.rotation.y = THREE.MathUtils.degToRad(cam.rotation.y);
    camera.rotation.x = THREE.MathUtils.degToRad(cam.rotation.x || 0);
    camera.fov = cam.fov;
    camera.aspect = vo.fullWidth / vo.fullHeight;
    camera.setViewOffset(vo.fullWidth, vo.fullHeight, vo.x, vo.y, vo.width, vo.height);
  } else {
    camera.fov = cam.fov || 30;
    camera.aspect = W / H;
    camera.lookAt(new THREE.Vector3(...cam.target));
    if (cam.shift) camera.setViewOffset(W, H, cam.shift[0] * W, cam.shift[1] * H, W, H);
  }
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}

window.renderShot = async (shot) => {
  const W = shot.width;
  const H = shot.height;
  renderer.setSize(W, H, false);
  applyShot(shot);
  setCamera(shot.camera, W, H, shot.crop);
  const P = setLighting(shot.lighting || "sunHage", shot);
  const target = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, target);
  composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  if (shot.ao !== false) {
    const ao = new GTAOPass(scene, camera, W, H);
    ao.output = GTAOPass.OUTPUT.Default;
    ao.blendIntensity = shot.aoIntensity ?? 0.7;
    ao.updateGtaoMaterial({ radius: 0.5, distanceExponent: 1.2, thickness: 1.0, scale: 1.0, samples: 16 });
    ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
    composer.addPass(ao);
  }
  composer.addPass(new OutputPass());
  composer.render();
  const url = renderer.domElement.toDataURL("image/png");
  composer.dispose();
  target.dispose();
  void P;
  return url;
};

window.cameraInfo = () => ({ position: camera.position.toArray(), fov: camera.fov });

load()
  .then(rememberPositions)
  .catch((e) => {
    console.error(e);
    window.loadError = String(e && e.stack ? e.stack : e);
  });
