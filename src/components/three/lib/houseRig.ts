/**
 * The reference house prepared for the build sequence: one clone of the
 * shared GLB with its own materials, so it can be revealed layer by layer,
 * x-rayed, exploded and cut without touching the hero canvas.
 *
 * Every house material gets the same three clipping planes for its whole life
 * (layer sweep, plan cut, section cut) and keeps its side/transparency, so
 * nothing recompiles while scrolling. Planes are "switched off" by moving
 * them far away.
 */
import * as THREE from "three";
import type { BuildStepId } from "@/content/types";
import type { EnvMaterialSpec, HouseMeta } from "./meta";
import { easeInOutCubic, easeOutCubic, smoothstep } from "./camera";
import { makeStageMixable, type StageMixUniforms } from "./lighting";

const FAR = 1e4;

/** How each layer moves into place (metres). */
const MOTION: Record<BuildStepId, { sweep?: boolean; rise?: number; drop?: number; slide?: number }> = {
  tomt: {},
  grunnarbeid: { sweep: true, rise: 0.25 },
  fundament: { rise: 1.25 },
  bindingsverk: { sweep: true, drop: 0.35 },
  isolasjon: { sweep: true, slide: 0.7 },
  tak: { sweep: true, drop: 1.8 },
  vinduer: { sweep: true, slide: 1.3 },
  kledning: { sweep: true, slide: 0.55 },
  installasjoner: { sweep: true },
  interior: { sweep: true, rise: 0.25 },
  nokkelferdig: { sweep: true },
};

/** Construction-only parts sink into the ground when their step is over. */
const TRANSIENT_DEPTH: Record<string, number> = {
  tomt_mark: 1.7,
  tomt_stikning: 1.3,
  tomt_situasjonsplan: 0.35,
  grunnarbeid_steinmasser: 3.2,
};

const NO_CAST = new Set(["glass", "hill", "lamp_glow", "plan_line", "string_line"]);
const NO_RECEIVE = new Set(["hill", "lamp_glow"]);

interface MeshState {
  /** Colour is driven elsewhere (lines, cladding): the layer loop must not reset it. */
  tinted: boolean;
  mesh: THREE.Mesh;
  mat: THREE.MeshStandardMaterial;
  base: THREE.Color;
  baseEmissive: number;
  ghost: THREE.Mesh | null;
  layer: number;
}

interface LayerState {
  id: BuildStepId;
  index: number;
  node: THREE.Object3D;
  explode: THREE.Vector3;
  explodeDir: THREE.Vector3;
  minY: number;
  maxY: number;
  plane: THREE.Plane;
  meshes: MeshState[];
}

interface TransientState {
  node: THREE.Object3D;
  stepIndex: number;
  baseY: number;
  depth: number;
}

interface EnvMaterialState {
  material: THREE.MeshStandardMaterial;
  uniforms: StageMixUniforms;
  meshes: THREE.Mesh[];
  castDefault: boolean;
  castStage: boolean;
}

export interface RigFrame {
  /** Damped build position. */
  t: number;
  /** 0…1 exploded view. */
  explode: number;
  /** 0…1 plan cut, at `planCut` metres. */
  plan: number;
  planCut: number;
  /** 0…1 how much the environment uses the stage materials. */
  stageEnv: number;
  /** Lamp emissive level from the lighting preset. */
  lamps: number;
  /**
   * X-ray line glow. Without bloom (phones) a lower level keeps the brass and
   * cool blue apart instead of clipping both to white.
   */
  lineGain: number;
}

export const EXPLODE_DISTANCE = 2.6;

export class HouseRig {
  readonly root: THREE.Object3D;
  readonly layers: LayerState[] = [];
  readonly steps: BuildStepId[];
  readonly planPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), FAR);
  readonly sectionPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), FAR);
  private transients: TransientState[] = [];
  private env: EnvMaterialState[] = [];
  private lines: { ms: MeshState; grey: THREE.Color; baseColor: THREE.Color }[] = [];
  private lamps: MeshState[] = [];
  private cladding: MeshState[] = [];
  private cladRaw: THREE.Color;
  private cladStained: THREE.Color;
  private ghostMat: THREE.MeshBasicMaterial;
  private edgeMat: THREE.MeshStandardMaterial;
  private idx: Record<BuildStepId, number>;
  private materials = new Set<THREE.Material>();

  constructor(source: THREE.Object3D, meta: HouseMeta, stageEnv: Record<string, EnvMaterialSpec> | undefined) {
    this.root = source.clone(true);
    this.steps = meta.steps;
    this.idx = Object.fromEntries(meta.steps.map((s, i) => [s, i])) as Record<BuildStepId, number>;
    this.cladRaw = new THREE.Color(meta.materials.cladding_wood.rawColorFactor);
    this.cladStained = new THREE.Color(meta.materials.cladding_wood.stainedColorFactor);

    this.ghostMat = new THREE.MeshBasicMaterial({
      color: "#9fb3c8",
      transparent: true,
      opacity: 0.05,
      depthWrite: false,
      clippingPlanes: [this.planPlane, this.sectionPlane],
    });
    this.edgeMat = new THREE.MeshStandardMaterial({
      color: "#2a3b4a",
      roughness: 1,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
      clippingPlanes: [this.planPlane, this.sectionPlane],
    });
    this.materials.add(this.ghostMat).add(this.edgeMat);

    // Environment colours that blend to the stage's slate site model: one
    // clone per material name and use (environment, or a layer that uses
    // terrain), so layer clipping never cuts the surrounding landscape.
    const envByKey = new Map<string, EnvMaterialState>();
    const envMat = (orig: THREE.MeshStandardMaterial, layer: LayerState | null): THREE.MeshStandardMaterial | null => {
      const spec = stageEnv?.[orig.name];
      if (!spec) return null;
      const key = `${orig.name}|${layer?.id ?? "env"}`;
      let st = envByKey.get(key);
      if (!st) {
        const material = orig.clone();
        this.materials.add(material);
        const uniforms = makeStageMixable(material, spec.color, spec.roughness ?? 1);
        if (layer) {
          material.clippingPlanes = [layer.plane, this.planPlane, this.sectionPlane];
          material.clipShadows = true;
          material.side = THREE.DoubleSide;
        }
        st = { material, uniforms, meshes: [], castDefault: true, castStage: spec.castShadow !== false };
        envByKey.set(key, st);
        this.env.push(st);
      }
      return st.material;
    };

    meta.steps.forEach((id, index) => {
      const node = this.root.getObjectByName(`layer_${id}`);
      if (!node) return;
      const lm = meta.layers[id];
      const layer: LayerState = {
        id,
        index,
        node,
        explode: new THREE.Vector3(...((node.userData.explode as [number, number, number]) ?? lm.explode)),
        explodeDir: new THREE.Vector3(),
        minY: lm.bbox.min[1],
        maxY: lm.bbox.max[1],
        plane: new THREE.Plane(new THREE.Vector3(0, -1, 0), FAR),
        meshes: [],
      };
      layer.explodeDir.copy(layer.explode).normalize();
      const ghostable = id !== "installasjoner";
      const ghostKind = id === "fundament" || id === "bindingsverk" ? this.edgeMat : this.ghostMat;
      const meshes: THREE.Mesh[] = [];
      node.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh);
      });
      for (const mesh of meshes) {
        const orig = mesh.material as THREE.MeshStandardMaterial;
        const name = orig.name;
        const shared = envMat(orig, layer);
        let mat: THREE.MeshStandardMaterial;
        if (shared) {
          mat = shared;
          envByKey.get(`${name}|${id}`)!.meshes.push(mesh);
        } else {
          mat = orig.clone();
          this.materials.add(mat);
          mat.clippingPlanes = [layer.plane, this.planPlane, this.sectionPlane];
          mat.clipShadows = true;
          if (name === "glass") {
            mat.depthWrite = false;
            mesh.renderOrder = 2;
          } else {
            mat.side = THREE.DoubleSide;
          }
        }
        mesh.material = mat;
        mesh.castShadow = !NO_CAST.has(name);
        mesh.receiveShadow = !NO_RECEIVE.has(name);
        let ghost: THREE.Mesh | null = null;
        if (ghostable && name !== "glass" && mesh.parent) {
          ghost = new THREE.Mesh(mesh.geometry, ghostKind);
          ghost.name = `${mesh.name}__ghost`;
          ghost.position.copy(mesh.position);
          ghost.quaternion.copy(mesh.quaternion);
          ghost.scale.copy(mesh.scale);
          ghost.visible = false;
          ghost.castShadow = false;
          ghost.receiveShadow = false;
          ghost.renderOrder = 3;
          mesh.parent.add(ghost);
        }
        const ms: MeshState = {
          tinted: name === "el_line" || name === "vvs_line" || name === "cladding_wood",
          mesh,
          mat,
          base: mat.color.clone(),
          baseEmissive: mat.emissiveIntensity,
          ghost,
          layer: index,
        };
        layer.meshes.push(ms);
        if (name === "el_line" || name === "vvs_line") {
          this.lines.push({ ms, grey: new THREE.Color(name === "el_line" ? "#5a5a58" : "#8d9497"), baseColor: mat.color.clone() });
        }
        if (name === "lamp_glow") this.lamps.push(ms);
        if (name === "cladding_wood") this.cladding.push(ms);
      }
      this.layers.push(layer);
    });

    // Construction-only groups.
    this.root.traverse((o) => {
      const hideFrom = o.userData?.hideFrom as BuildStepId | undefined;
      if (!hideFrom || !(hideFrom in this.idx)) return;
      this.transients.push({
        node: o,
        stepIndex: this.idx[hideFrom],
        baseY: o.position.y,
        depth: TRANSIENT_DEPTH[o.name] ?? 1,
      });
    });

    // Environment meshes (terrain, rock, trees, hills).
    const house = this.root.getObjectByName("House") ?? this.root;
    for (const child of [...house.children]) {
      if (!child.name.startsWith("env_")) continue;
      child.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        const orig = mesh.material as THREE.MeshStandardMaterial;
        const name = orig.name;
        const m = envMat(orig, null);
        if (m) {
          mesh.material = m;
          envByKey.get(`${name}|env`)!.meshes.push(mesh);
        }
        mesh.castShadow = !NO_CAST.has(name);
        mesh.receiveShadow = !NO_RECEIVE.has(name);
        if (name === "hill") (mesh.material as THREE.MeshStandardMaterial).fog = true;
      });
    }
    for (const st of this.env) st.castDefault = st.meshes.some((m) => m.castShadow);
  }

  stepIndex(id: BuildStepId) {
    return this.idx[id];
  }

  /** Presence of layer i at build position t (0 = not there, 1 = in place). */
  presence(i: number, t: number) {
    return i === 0 ? 1 : Math.min(1, Math.max(0, t - (i - 1)));
  }

  /** Make everything visible once (shader warm-up before the first frame). */
  showAllForCompile() {
    for (const l of this.layers) {
      l.node.visible = true;
      for (const ms of l.meshes) {
        ms.mesh.visible = true;
        if (ms.ghost) ms.ghost.visible = true;
      }
    }
    for (const tr of this.transients) tr.node.visible = true;
  }

  /** Current layer offset (for hotspots that sit on a layer). */
  layerOffset(id: BuildStepId, out: THREE.Vector3) {
    const l = this.layers[this.idx[id]];
    return l ? out.copy(l.node.position) : out.set(0, 0, 0);
  }

  update(f: RigFrame) {
    const { t } = f;
    const k = EXPLODE_DISTANCE * easeInOutCubic(f.explode);
    const iInst = this.idx.installasjoner;
    const iInt = this.idx.interior;
    const iKled = this.idx.kledning;

    // X-ray around the installations step; section cut around the interior step.
    const xray = smoothstep(1 - Math.abs(t - iInst) * 1.15);
    const section = smoothstep(1 - Math.abs(t - iInt) * 1.1);

    this.planPlane.constant = f.plan > 0.001 ? 12 + (f.planCut - 12) * easeInOutCubic(f.plan) : FAR;
    this.sectionPlane.constant = section > 0.001 ? 14 + (1.35 - 14) * easeInOutCubic(section) : FAR;

    for (const layer of this.layers) {
      const a = this.presence(layer.index, t);
      const visible = a > 0.0005;
      layer.node.visible = visible;
      if (!visible) continue;
      const m = MOTION[layer.id];
      const e = easeOutCubic(a);
      const pos = layer.node.position;
      pos.copy(layer.explode).multiplyScalar(k);
      if (m.rise) pos.y -= (1 - e) * m.rise;
      if (m.drop) pos.y += (1 - e) * m.drop;
      if (m.slide) pos.addScaledVector(layer.explodeDir, (1 - e) * m.slide);
      layer.plane.constant =
        m.sweep && a < 0.999 ? layer.minY - 0.05 + (layer.maxY + 0.35 - layer.minY) * easeInOutCubic(a) + pos.y : FAR;

      const ghosted = xray > 0.001 && layer.index !== iInst;
      for (const ms of layer.meshes) {
        if (ghosted && ms.ghost) {
          const dark = smoothstep(xray / 0.5);
          ms.mat.color.copy(ms.base).multiplyScalar(1 - 0.85 * dark);
          ms.mesh.visible = xray < 0.5;
          ms.ghost.visible = true;
        } else {
          if (ms.ghost) ms.ghost.visible = false;
          ms.mesh.visible = true;
          if (!ms.tinted) ms.mat.color.copy(ms.base);
        }
      }
    }
    // Ghost opacity follows the x-ray amount.
    this.ghostMat.opacity = 0.05 * Math.min(1, xray * 1.6);
    this.edgeMat.opacity = 0.18 * Math.min(1, xray * 1.6);

    // El (brass) and VVS (cool) lines glow in the x-ray, then go dark inside the walls.
    const after = smoothstep((t - iInst - 0.25) / 0.6);
    for (const { ms, grey, baseColor } of this.lines) {
      ms.mat.emissiveIntensity = ms.baseEmissive * f.lineGain * (1 + 0.5 * xray) * (1 - after);
      ms.mat.color.copy(baseColor).lerp(grey, after);
    }

    // Cladding: raw spruce while it goes up, then the painter's stain.
    const stain = smoothstep((t - (iKled - 1) - 0.55) / 0.45);
    for (const ms of this.cladding) {
      ms.mat.color.copy(this.cladRaw).lerp(this.cladStained, stain);
      if (xray > 0.001) ms.mat.color.multiplyScalar(1 - 0.85 * smoothstep(xray / 0.5));
    }

    // Lamps.
    for (const ms of this.lamps) ms.mat.emissiveIntensity = ms.baseEmissive * f.lamps;

    // Transient construction parts.
    for (const tr of this.transients) {
      const s = Math.min(1, Math.max(0, t - (tr.stepIndex - 1)));
      tr.node.visible = s < 0.999;
      tr.node.position.y = tr.baseY - s * s * tr.depth;
    }

    // Environment: stage monochrome ↔ real colours.
    const castStage = f.stageEnv > 0.5;
    for (const st of this.env) {
      st.uniforms.uStageMix.value = f.stageEnv;
      for (const mesh of st.meshes) mesh.castShadow = castStage ? st.castDefault && st.castStage : st.castDefault;
    }

    return { xray, section };
  }

  dispose() {
    this.materials.forEach((m) => m.dispose());
    this.materials.clear();
  }
}
