"use client";

/**
 * One shared GLB load per URL (drei's useGLTF caches by URL across canvases).
 * Meshopt is decoded with three's own decoder from node_modules (bundled, no
 * CDN; its WASM is inlined), in Web Workers. Draco is off: drei would
 * otherwise point its decoder at gstatic.
 */
import "./threeConsole";
import { useGLTF } from "@react-three/drei";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

type ExtendLoader = NonNullable<Parameters<typeof useGLTF>[3]>;

let workersStarted = false;

/** Decode the compressed buffers in two Web Workers, off the main thread. */
function startDecoderWorkers() {
  if (workersStarted || typeof Worker === "undefined") return;
  const startWorkers = MeshoptDecoder.useWorkers; // not a React hook, despite the name
  startWorkers(2);
  workersStarted = true;
}

const withLocalMeshopt: ExtendLoader = (loader) => {
  startDecoderWorkers();
  // three-stdlib's GLTFLoader accepts the same decoder object as three's.
  (loader as unknown as { setMeshoptDecoder: (d: unknown) => void }).setMeshoptDecoder(MeshoptDecoder);
};

export function useModel(url: string) {
  return useGLTF(url, false, false, withLocalMeshopt);
}

export function preloadModel(url: string) {
  useGLTF.preload(url, false, false, withLocalMeshopt);
}
