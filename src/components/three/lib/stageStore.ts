/**
 * Shared state between the "Slik bygger vi" DOM overlay (copy panel, rail,
 * controls, hotspots) and the lazily loaded canvas. Scroll writes targets
 * here; the canvas damps towards them in its frame loop. Only discrete UI
 * state goes through React (useSyncExternalStore on `ui`).
 */
import type { BuildStepId } from "@/content/types";

export type LightMode = "bluehour" | "day";

export interface StageTargets {
  /** Build position: 0 … steps−1, eased plateaus (from scroll). */
  t: number;
  exploded: boolean;
  plan: boolean;
  floor: number;
  light: LightMode;
  /** Section on screen: the canvas renders only then. */
  visible: boolean;
  /** Desktop drag offsets (radians), constrained by the overlay. */
  dragAz: number;
  dragEl: number;
  dragging: boolean;
}

export interface StageUi {
  active: number;
  exploded: boolean;
  plan: boolean;
  floor: number;
  light: LightMode;
  /** Canvas has rendered its first frame. */
  ready: boolean;
  /** Canvas failed (WebGL error / context lost). */
  failed: boolean;
  /** Frames stayed too slow even at the lowest quality: the stage shows its still renders. */
  slow: boolean;
  /** Floor names for the plan cut (published by the canvas from house.meta.json). */
  floors: readonly string[];
}

export interface FrameRegion {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface HotspotTarget {
  id: string;
  step: BuildStepId;
  el: HTMLElement;
}

export function createStageStore(stepCount: number) {
  const targets: StageTargets = {
    t: 0,
    exploded: false,
    plan: false,
    floor: 0,
    light: "bluehour",
    visible: false,
    dragAz: 0,
    dragEl: 0,
    dragging: false,
  };
  let ui: StageUi = {
    active: 0,
    exploded: false,
    plan: false,
    floor: 0,
    light: "bluehour",
    ready: false,
    failed: false,
    slow: false,
    floors: [],
  };
  const uiListeners = new Set<() => void>();
  const frameListeners = new Set<() => void>();

  const store = {
    stepCount,
    targets,
    /** Clear region of the stage (canvas px), measured by the overlay. */
    region: { x: 0, y: 0, w: 1, h: 1 } as FrameRegion,
    /** Hotspot buttons of the active step, positioned by the canvas. */
    hotspots: new Map<string, HotspotTarget>(),
    /** Ask the canvas for a frame. */
    invalidate() {
      frameListeners.forEach((l) => l());
    },
    onFrameRequest(l: () => void) {
      frameListeners.add(l);
      return () => {
        frameListeners.delete(l);
      };
    },
    getUi: () => ui,
    subscribeUi(l: () => void) {
      uiListeners.add(l);
      return () => {
        uiListeners.delete(l);
      };
    },
    setUi(patch: Partial<StageUi>) {
      let changed = false;
      for (const k of Object.keys(patch) as (keyof StageUi)[]) {
        if (ui[k] !== patch[k]) changed = true;
      }
      if (!changed) return;
      ui = { ...ui, ...patch };
      targets.exploded = ui.exploded;
      targets.plan = ui.plan;
      targets.floor = ui.floor;
      targets.light = ui.light;
      uiListeners.forEach((l) => l());
      store.invalidate();
    },
    setT(t: number) {
      if (t === targets.t) return;
      targets.t = t;
      const active = Math.max(0, Math.min(stepCount - 1, Math.round(t)));
      if (active !== ui.active) store.setUi({ active });
      store.invalidate();
    },
    setRegion(r: FrameRegion) {
      store.region = r;
      store.invalidate();
    },
    setDrag(az: number, el: number, dragging = targets.dragging) {
      targets.dragAz = az;
      targets.dragEl = el;
      targets.dragging = dragging;
      store.invalidate();
    },
    setVisible(v: boolean) {
      if (targets.visible === v) return;
      targets.visible = v;
      store.invalidate();
    },
  };
  return store;
}

export type StageStore = ReturnType<typeof createStageStore>;
