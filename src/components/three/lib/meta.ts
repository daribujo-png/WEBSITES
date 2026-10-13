/**
 * Typed access to the MODEL agent's metadata (public/models/*.meta.json).
 * Imported statically so it ships inside the lazy 3D chunks only (never in the
 * page bundle): import this file from canvas modules, not from overlays.
 */
import rawHouse from "../../../../public/models/house.meta.json";
import rawPermits from "../../../../public/models/permits.meta.json";
import type { BuildStepId, PermitTypeId } from "@/content/types";

export type Vec3 = [number, number, number];

export interface CameraPreset {
  position: Vec3;
  target: Vec3;
  fov?: number;
  /** Fraction of the frame, applied as camera.setViewOffset (see scripts/README.md). */
  shift?: [number, number];
}

export interface SkySpec {
  top: string;
  mid?: string;
  horizon: string;
  below?: string;
  glow: string;
  glowStrength?: number;
  glowDir?: Vec3;
  glowWidth?: number;
}

export interface DirectionalSpec {
  color: string;
  intensity: number;
  position: Vec3;
  castShadow?: boolean;
}

export interface EnvMaterialSpec {
  color: string;
  roughness?: number;
  castShadow?: boolean;
}

export interface LightingPreset {
  toneMapping: "AgX" | "Neutral" | "ACESFilmic";
  exposure: number;
  /** "sky" (gradient dome) or a solid colour. */
  background: string;
  sky: SkySpec;
  envIntensity: number;
  fog: { color: string; near: number; far: number } | null;
  hemisphere: { sky: string; ground: string; intensity: number } | null;
  key: DirectionalSpec | null;
  fill: DirectionalSpec | null;
  lamps: number;
  exteriorLights: number;
  interiorLights: number;
  interiorColor?: string;
  bloom: { strength: number; radius: number; threshold: number } | null;
  envMaterials?: Record<string, EnvMaterialSpec>;
}

export type LightingName = "bluehour" | "day" | "stage" | "paper";

export interface PointLightSpec {
  position: Vec3;
  color: string;
  intensity: number;
  room?: string;
  name?: string;
}

export interface LayerMeta {
  node: string;
  order: number;
  center: Vec3;
  bbox: { min: Vec3; max: Vec3 };
  explode: Vec3;
}

export interface HouseMeta {
  bbox: { min: Vec3; max: Vec3 };
  floors: { name: string; y: number; cutHeight: number }[];
  cutHeights: number[];
  steps: BuildStepId[];
  layers: Record<BuildStepId, LayerMeta>;
  transient: Record<string, { hideFrom: BuildStepId } | string>;
  hotspots: Record<BuildStepId, { id: string; position: Vec3 }[]>;
  interiorLights: PointLightSpec[];
  exteriorLights: PointLightSpec[];
  materials: {
    cladding_wood: { rawColorFactor: string; stainedColorFactor: string };
  };
  camera: {
    hero: CameraPreset;
    heroMobile: CameraPreset;
    og: CameraPreset;
    stage: CameraPreset;
    steps: Record<BuildStepId, CameraPreset>;
  };
  lighting: Record<LightingName, LightingPreset>;
}

export interface PermitsMeta {
  nodes: string[];
  cameras: Record<PermitTypeId, CameraPreset>;
}

export const houseMeta = rawHouse as unknown as HouseMeta;
export const permitsMeta = rawPermits as unknown as PermitsMeta;

export const HOUSE_GLB = "/models/house.glb";
export const PERMITS_GLB = "/models/permits.glb";
