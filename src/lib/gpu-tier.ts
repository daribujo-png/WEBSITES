/**
 * Device tier for the 3D scenes. No three.js here: this ships in the page
 * bundle and decides, before any 3D chunk loads, what a device gets.
 *
 *   high  desktop-class GPU with a fine pointer: full model, shadows, bloom.
 *   low   phones, tablets, older or weak integrated GPUs, slow networks or
 *         little memory: the lite model, cheaper lighting, no live hero.
 *   off   no WebGL, software rendering, Save-Data, 2G, ≤ 1 GB memory or a
 *         very old GPU: the still renders (gallery and posters) instead.
 *
 * The WebGL probe creates (and at once releases) one context, so it runs
 * lazily on first use (when a scene comes near), never during hydration.
 *
 * Test override: `?3d=high|low|off` in the URL or `window.__byggrv3dTier`.
 * An override also switches off the runtime fallback (see BuildCanvas),
 * because software WebGL in automated tests is always "slow".
 */
export type GpuTier = "high" | "low" | "off";

export interface GpuInfo {
  /** A WebGL context can be created at all. */
  webgl: boolean;
  tier: GpuTier;
  /** Why this tier (for debugging; never shown verbatim). */
  reason: string;
  /** Renderer string, as far as the browser tells it. */
  renderer: string;
  maxTextureSize: number;
  /** Tier forced by the test override. */
  override: boolean;
}

type TierWindow = Window & { __byggrv3dTier?: string };
type NavigatorExtra = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean; effectiveType?: string };
};

const TIERS: readonly GpuTier[] = ["high", "low", "off"];

/** Software rasterisers: every frame is drawn by the CPU. */
const SOFTWARE = /swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic|mesa offscreen/i;

/**
 * Integrated and mobile GPUs that draw the full scene too slowly: older Intel
 * HD/UHD, Mali up to G76, Adreno up to 64x, PowerVR, early Radeon/GeForce
 * mobile parts and old Apple SoCs. Intel Iris Xe and newer stay "high".
 */
const WEAK =
  /Intel\(R\) (?:HD|UHD) Graphics|Intel HD Graphics|Iris(?:\((?:R|TM)\))? (?:Pro |Plus )?Graphics (?:[56]\d{3}|6\d\d)\b|GMA|Mali-(?:[34]\d\d|T\d+|G(?:31|51|52|57|68|71|72|76)\b)|Adreno(?: \(TM\))? (?:[1-5]\d\d|6[0-4]\d)\b|PowerVR|SGX|VideoCore|Tegra|GeForce (?:GT \d{3}|MX ?\d{3}|\d{3}M)\b|Radeon(?:\(TM\))? (?:R[2-5]|HD [5-8]\d{3})|Apple A(?:[7-9]|1[01])\b/i;

/** Discrete and recent integrated GPUs: a modest CPU count or memory does not demote these. */
const STRONG = /GeForce (?:GTX|RTX)|Quadro|RTX A\d|Radeon (?:RX|Pro)|Apple M\d|Iris\(R\) Xe|Intel\(R\) Arc|Arc\(TM\)/i;

let cached: GpuInfo | null = null;

function readOverride(): GpuTier | null {
  try {
    const q = new URLSearchParams(window.location.search).get("3d");
    const w = (window as TierWindow).__byggrv3dTier;
    const v = (q ?? w ?? "").toLowerCase();
    return (TIERS as readonly string[]).includes(v) ? (v as GpuTier) : null;
  } catch {
    return null;
  }
}

function probe(): { webgl: boolean; caveat: boolean; renderer: string; maxTextureSize: number } {
  const out = { webgl: false, caveat: false, renderer: "", maxTextureSize: 0 };
  const context = (type: "webgl2" | "webgl", attrs?: WebGLContextAttributes) =>
    document.createElement("canvas").getContext(type, attrs) as WebGLRenderingContext | null;
  try {
    const strict = { failIfMajorPerformanceCaveat: true };
    let gl = context("webgl2", strict) ?? context("webgl", strict);
    if (!gl) {
      // Refused for performance (software rendering, blocklisted GPU) or no WebGL at all.
      gl = context("webgl2") ?? context("webgl");
      out.caveat = !!gl;
    }
    if (!gl) return out;
    out.webgl = true;
    out.maxTextureSize = Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)) || 0;
    let renderer = String(gl.getParameter(gl.RENDERER) ?? "");
    // Safari reports a generic string; its debug extension is the only source there.
    // (Firefox already returns the real one and warns when the extension is used.)
    if (!renderer || /^webkit webgl$/i.test(renderer)) {
      const dbg = gl.getExtension("WEBGL_debug_renderer_info");
      if (dbg) renderer = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) ?? renderer);
    }
    out.renderer = renderer;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    // treated as "no WebGL"
  }
  return out;
}

function classify(): GpuInfo {
  const override = readOverride();
  const p = probe();
  const base = { webgl: p.webgl, renderer: p.renderer, maxTextureSize: p.maxTextureSize };
  if (!p.webgl) return { ...base, tier: "off", reason: "no-webgl", override: false };
  if (override) return { ...base, tier: override, reason: "override", override: true };

  const nav = navigator as NavigatorExtra;
  const net = nav.connection;
  const mem = nav.deviceMemory ?? 0;
  const cores = nav.hardwareConcurrency ?? 0;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const small = Math.min(window.screen?.width ?? 0, window.screen?.height ?? 0) < 768 || window.innerWidth < 1024;
  const off = (reason: string): GpuInfo => ({ ...base, tier: "off", reason, override: false });
  const low = (reason: string): GpuInfo => ({ ...base, tier: "low", reason, override: false });

  if (net?.saveData) return off("save-data");
  if (net?.effectiveType === "slow-2g" || net?.effectiveType === "2g") return off("2g");
  if (SOFTWARE.test(p.renderer) || p.caveat) return off("software");
  if (mem > 0 && mem < 2) return off("memory");
  if (p.maxTextureSize > 0 && p.maxTextureSize < 4096) return off("old-gpu");
  if (cores > 0 && cores <= 2 && coarse) return off("cores");

  if (coarse && small) return low("phone");
  if (small) return low("small-screen");
  if (net?.effectiveType === "3g") return low("3g");
  if (p.maxTextureSize > 0 && p.maxTextureSize < 8192) return low("texture-size");
  if (WEAK.test(p.renderer)) return low("weak-gpu");
  if (!STRONG.test(p.renderer)) {
    if (mem > 0 && mem <= 4) return low("memory");
    if (cores > 0 && cores <= 4) return low("cores");
  }
  return { ...base, tier: "high", reason: "desktop", override: false };
}

/** The device's tier (probed once, on first call; client only). */
export function gpuInfo(): GpuInfo {
  if (cached) return cached;
  if (typeof window === "undefined") return { webgl: false, tier: "off", reason: "server", renderer: "", maxTextureSize: 0, override: false };
  cached = classify();
  return cached;
}
