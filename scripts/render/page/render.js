/**
 * Browser side of the render harness. Loads the house + permit GLBs and
 * renders "shots" described as plain JSON by scripts/render/shots.mjs.
 * window.renderShot(shot) → PNG data URL.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.localClippingEnabled = true;
renderer.setPixelRatio(1);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 16 / 9, 0.1, 2000);
const pmrem = new THREE.PMREMGenerator(renderer);

let house;
let permits;
let meta;
const orig = new Map(); // mesh → original material
const byName = new Map();
const lights = new THREE.Group();
scene.add(lights);
let sky;
let extrasGroup = new THREE.Group();
scene.add(extrasGroup);

/* ------------------------------------------------------------------------------------------------ */

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
    if (o.isMesh) {
      orig.set(o, o.material);
      const n = o.material.name;
      const env = isEnv(o);
      o.castShadow = !["glass", "hill", "lamp_glow", "plan_line", "string_line"].includes(n);
      o.receiveShadow = !["hill", "lamp_glow"].includes(n);
      if (n === "glass") {
        o.material.depthWrite = false;
        o.renderOrder = 2;
      }
      if (env && n === "hill") o.material.fog = true;
    }
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
  window.__scene = scene; // debug handle for the harness (inspect visibility/clipping from Playwright)
  window.ready = true;
}

function isEnv(o) {
  let p = o;
  while (p) {
    if (p.name && p.name.startsWith("env_")) return true;
    p = p.parent;
  }
  return false;
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
/* Sky + lighting                                                                                    */
/* ------------------------------------------------------------------------------------------------ */

function makeSky({ top, mid, horizon, glow, glowStrength = 0.3, glowDir = [0.3, 0.05, 1], glowWidth = 5, below }) {
  const geo = new THREE.SphereGeometry(1500, 64, 32);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      top: { value: new THREE.Color(top) },
      mid: { value: new THREE.Color(mid || top) },
      horizon: { value: new THREE.Color(horizon) },
      glow: { value: new THREE.Color(glow) },
      below: { value: new THREE.Color(below || horizon) },
      glowDir: { value: new THREE.Vector3(...glowDir).normalize() },
      glowStrength: { value: glowStrength },
      glowWidth: { value: glowWidth },
    },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position.z = gl_Position.w; }`,
    fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 horizon; uniform vec3 glow; uniform vec3 below; uniform vec3 glowDir; uniform float glowStrength; uniform float glowWidth; varying vec3 vDir;
      void main(){
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
      }`,
  });
  return new THREE.Mesh(geo, mat);
}

const TONE = { ACESFilmic: THREE.ACESFilmicToneMapping, AgX: THREE.AgXToneMapping, Neutral: THREE.NeutralToneMapping };

/** Deep merge for plain objects (arrays and primitives replace). */
function merge(a, b) {
  if (!b) return a;
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) {
    out[k] = v && typeof v === "object" && !Array.isArray(v) && a[k] && typeof a[k] === "object" ? merge(a[k], v) : v;
  }
  return out;
}

function directional(spec, target, shot) {
  const l = new THREE.DirectionalLight(spec.color, spec.intensity);
  l.position.set(...spec.position).add(new THREE.Vector3(...target));
  l.target.position.set(...target);
  if (spec.castShadow) {
    l.castShadow = true;
    l.shadow.mapSize.set(4096, 4096);
    const s = shot.shadowExtent || 18;
    Object.assign(l.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 1, far: 160 });
    l.shadow.bias = -0.0003;
    l.shadow.normalBias = shot.normalBias ?? 0.04;
    l.shadow.radius = 4;
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
  // environment from the sky (sky dome only, so the IBL matches the visible sky)
  const envScene = new THREE.Scene();
  envScene.add(makeSky(P.sky));
  if (currentEnv) currentEnv.dispose();
  currentEnv = pmrem.fromScene(envScene, 0.02).texture;
  scene.environment = currentEnv;
  scene.environmentIntensity = P.envIntensity;
  if (P.background === "sky") {
    scene.background = null;
    scene.add(sky);
  } else {
    scene.background = new THREE.Color(P.background);
  }
  scene.fog = P.fog ? new THREE.Fog(P.fog.color, P.fog.near, P.fog.far) : null;
  renderer.toneMapping = TONE[P.toneMapping] ?? THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = P.exposure;
  const tgt = shot.shadowTarget || [0, 2, 0.5];
  if (P.hemisphere) lights.add(new THREE.HemisphereLight(P.hemisphere.sky, P.hemisphere.ground, P.hemisphere.intensity));
  if (P.key) {
    const k = directional(P.key, tgt, shot);
    lights.add(k, k.target);
  }
  if (P.fill) {
    const f = directional(P.fill, tgt, shot);
    lights.add(f, f.target);
  }
  // lamps (emissive), exterior wall lights and warm interior lights
  for (const [mesh, mat] of orig) {
    if (mat.name !== "lamp_glow") continue;
    mesh.material = mesh.material.clone(); // keeps any clipping set up by the shot
    if (P.lamps > 0) mesh.material.emissiveIntensity = mat.emissiveIntensity * P.lamps;
    else mesh.material.emissive = new THREE.Color("#000000");
  }
  if (P.exteriorLights > 0) {
    for (const l of meta.exteriorLights || []) {
      const pl = new THREE.PointLight(l.color, P.exteriorLights * l.intensity, 5, 2);
      pl.position.set(...l.position);
      lights.add(pl);
    }
  }
  if (P.interiorLights > 0) {
    for (const l of meta.interiorLights) {
      const pl = new THREE.PointLight(P.interiorColor || l.color, P.interiorLights * l.intensity, 9, 2);
      pl.position.set(...l.position);
      lights.add(pl);
    }
    for (const extra of shot.extraLights || []) {
      const pl = new THREE.PointLight(extra.color || P.interiorColor || "#ffc98a", extra.intensity, extra.distance || 8, 2);
      pl.position.set(...extra.position);
      lights.add(pl);
    }
  }
  // environment materials (e.g. the monochrome site model on the dark stage)
  if (P.envMaterials) {
    for (const [mesh, mat] of orig) {
      const spec = P.envMaterials[mat.name];
      if (!spec) continue;
      const m = new THREE.MeshStandardMaterial({ color: spec.color, roughness: spec.roughness ?? 1, metalness: 0 });
      m.name = mat.name;
      m.clippingPlanes = mesh.material.clippingPlanes;
      m.side = mesh.material.side;
      mesh.material = m;
      if (spec.castShadow === false) mesh.castShadow = false;
    }
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
    o.position.set(0, 0, 0);
  });
  // restore node translations (trees)
  house.traverse((o) => {
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

const STEPS = () => meta.steps;

function applyShot(shot) {
  resetState();
  const steps = STEPS();
  const idx = shot.step ? steps.indexOf(shot.step) : steps.length - 1;
  // layers
  for (const id of steps) {
    const node = byName.get(`layer_${id}`);
    node.visible = steps.indexOf(id) <= idx && !(shot.hideLayers || []).includes(id);
    if (shot.onlyLayers) node.visible = shot.onlyLayers.includes(id);
  }
  // transient construction parts
  if (shot.transient !== false) {
    house.traverse((o) => {
      const hf = o.userData && o.userData.hideFrom;
      if (hf && steps.indexOf(hf) <= idx) o.visible = false;
    });
  }
  // hideNodes: node-name prefixes (a part and its sub-parts, e.g. "interior_trapp" also hides "interior_trapp_vange")
  for (const n of shot.hideNodes || []) matchNodes(`^${n}`).forEach((m) => (m.visible = false));
  for (const n of shot.showNodes || []) matchNodes(n).forEach((m) => (m.visible = true));
  // environment
  if (shot.env === false) house.children.filter((c) => c.name.startsWith("env_")).forEach((c) => (c.visible = false));
  if (shot.noTrees) house.children.filter((c) => /env_(maple|birch)/.test(c.name)).forEach((c) => (c.visible = false));
  if (shot.hideTrees) shot.hideTrees.forEach((n) => byName.get(n) && (byName.get(n).visible = false));
  // explode
  if (shot.explode) {
    for (const id of steps) {
      const node = byName.get(`layer_${id}`);
      const e = node.userData.explode || [0, 0, 0];
      node.position.set(e[0] * shot.explode, e[1] * shot.explode, e[2] * shot.explode);
    }
  }
  // material tweaks
  if (shot.claddingRaw) swapMaterial("cladding_wood", (m) => m.color.set("#ffffff"));
  if (shot.claddingColor) swapMaterial("cladding_wood", (m) => m.color.set(shot.claddingColor));
  for (const o of shot.materialColors || []) swapMaterial(o.name, (m) => {
    if (o.color) m.color.set(o.color);
    if (o.roughness !== undefined) m.roughness = o.roughness;
    if (o.vertexColors === false) m.vertexColors = false;
  });
  if (!shot.xray && idx > steps.indexOf("installasjoner")) {
    for (const name of ["el_line", "vvs_line"]) {
      swapMaterial(name, (m) => {
        m.emissive.set("#000000");
        m.color.set(name === "el_line" ? "#5a5a58" : "#8d9497");
      });
    }
  }
  if (shot.xray) applyXray(shot.xray);
  if (shot.clay) applyClay(shot.clay);
  // clipping
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

/** Diagram edges: ink hairlines on the existing house, brass on the new part (same as the live canvas). */
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

function applyXray({ keep = ["installasjoner"], ghostOpacity = 0.05, ghostColor = "#9fb3c8" } = {}) {
  const ghost = new THREE.MeshBasicMaterial({ color: ghostColor, transparent: true, opacity: ghostOpacity, depthWrite: false });
  const edge = new THREE.MeshStandardMaterial({ color: "#2a3b4a", roughness: 1, transparent: true, opacity: 0.18, depthWrite: false });
  for (const [mesh] of orig) {
    if (!mesh.visible) continue;
    const lid = layerOf(mesh);
    if (!lid) continue;
    if (keep.includes(lid)) {
      mesh.material = mesh.material.clone();
      mesh.material.emissiveIntensity *= 1.4;
      continue;
    }
    mesh.material = lid === "fundament" || lid === "bindingsverk" ? edge : ghost;
    mesh.castShadow = false;
  }
}

function applyClay({ color = "#c4bdb0", highlight = [], highlightColor = "#b08b5e", keepEnv = true } = {}) {
  const clay = new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0 });
  const glassClay = new THREE.MeshStandardMaterial({ color: "#c9c4ba", roughness: 0.3, metalness: 0 });
  for (const [mesh, mat] of orig) {
    if (!mesh.visible) continue;
    const lid = layerOf(mesh);
    if (!lid) continue;
    mesh.material = mat.name === "glass" ? glassClay : clay;
  }
  for (const h of highlight) {
    matchNodes(h).forEach((o) =>
      o.traverse((m) => {
        if (m.isMesh) m.material = new THREE.MeshStandardMaterial({ color: highlightColor, roughness: 0.75 });
      }),
    );
  }
  void keepEnv;
}

/* Procedural additions for service diagrams (tilbygg / påbygg). */
function buildExtras(kind) {
  const oak = new THREE.MeshStandardMaterial({ color: "#b08b5e", roughness: 0.72 });
  const oakDark = new THREE.MeshStandardMaterial({ color: "#8e6c45", roughness: 0.62 });
  const brass = new THREE.MeshStandardMaterial({ color: "#c9a86a", roughness: 0.35, metalness: 0.7 });
  const glass = new THREE.MeshStandardMaterial({ color: "#3b4448", roughness: 0.1 });
  const shadowy = (g) =>
    g.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
  const fp = meta.footprint;
  const ang = THREE.MathUtils.degToRad(fp.bendDeg);
  if (kind === "tilbygg") {
    // single-storey extension on the east gable with a flat roof and glazed front
    const g = new THREE.Group();
    const L = 3.8;
    const Wd = 5.6;
    const H = 3.1;
    const body = new THREE.Mesh(new THREE.BoxGeometry(L, H, Wd), oak);
    body.position.set(L / 2, H / 2, 0.9);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(L + 0.4, 0.22, Wd + 0.4), oakDark);
    roof.position.set(L / 2 + 0.1, H + 0.11, 0.9);
    const win = new THREE.Mesh(new THREE.BoxGeometry(L - 0.9, H - 0.9, 0.04), glass);
    win.position.set(L / 2 + 0.1, (H - 0.9) / 2 + 0.25, 0.9 + Wd / 2 + 0.02);
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.04, H, Wd), brass);
    seam.position.set(0.02, H / 2, 0.9);
    g.add(body, roof, win, seam);
    g.rotation.y = -ang;
    const u = fp.wings.B.length + 0.12;
    g.position.set(u * Math.cos(ang), 0, u * Math.sin(ang));
    shadowy(g);
    extrasGroup.add(g);
  }
  if (kind === "pabygg") {
    // lift everything above the eave by one storey and insert a new oak storey
    const cut = 5.42;
    const lift = 2.7;
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
    const shape = new THREE.Shape(fp.cladding.map(([x, z]) => new THREE.Vector2(x, -z)));
    const band = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: lift, bevelEnabled: false }), oak);
    band.rotation.x = -Math.PI / 2;
    band.position.y = cut;
    const seam = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: false }), brass);
    seam.rotation.x = -Math.PI / 2;
    seam.position.y = cut - 0.02;
    extrasGroup.add(band, seam);
    shadowy(extrasGroup);
  }
}

/* ------------------------------------------------------------------------------------------------ */
/* Render                                                                                            */
/* ------------------------------------------------------------------------------------------------ */

window.renderShot = async (shot) => {
  const W = shot.width;
  const H = shot.height;
  renderer.setSize(W, H, false);
  camera.aspect = W / H;
  camera.fov = shot.camera.fov || 30;
  camera.position.set(...shot.camera.position);
  camera.lookAt(new THREE.Vector3(...shot.camera.target));
  if (shot.camera.shift) camera.setViewOffset(W, H, shot.camera.shift[0] * W, shot.camera.shift[1] * H, W, H);
  else camera.clearViewOffset();
  camera.near = shot.camera.near || 0.1;
  camera.updateProjectionMatrix();
  applyShot(shot);
  const P = setLighting(shot.lighting || "bluehour", shot);
  const target = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, target);
  composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  if (shot.ao !== false) {
    const ao = new GTAOPass(scene, camera, W, H);
    ao.output = GTAOPass.OUTPUT.Default;
    ao.blendIntensity = shot.aoIntensity ?? 0.85;
    ao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.2, thickness: 1.0, scale: 1.0, samples: 16 });
    ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
    composer.addPass(ao);
  }
  const bloom = shot.bloom === false ? null : shot.bloom ? { strength: shot.bloom[0], radius: shot.bloom[1], threshold: shot.bloom[2] } : P.bloom;
  if (bloom) composer.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), bloom.strength, bloom.radius, bloom.threshold));
  composer.addPass(new OutputPass());
  composer.render();
  const url = renderer.domElement.toDataURL("image/png");
  composer.dispose();
  target.dispose();
  return url;
};

window.cameraInfo = () => ({ position: camera.position.toArray(), fov: camera.fov });

load()
  .then(rememberPositions)
  .catch((e) => {
    console.error(e);
    window.loadError = String(e && e.stack ? e.stack : e);
  });
