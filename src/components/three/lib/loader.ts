"use client";

/**
 * GLB loading shared by every canvas: one download (modelSource) and one parse
 * per model, cached for the page's lifetime, so the hero and the build stage
 * share the same house. Meshopt is decoded with three's decoder from
 * node_modules (bundled, no CDN; its WASM is inlined) in two Web Workers.
 * three's own GLTFLoader is used directly (drei's useGLTF would also bundle
 * three-stdlib's loader and a Draco decoder this site never needs).
 */
import "./threeConsole";
import { use } from "react";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { HOUSE_URLS } from "./meta";
import { fetchHouse, fetchModel, releaseModel, type HouseVariant } from "./modelSource";

export type { GLTF };

let loader: GLTFLoader | null = null;

function gltfLoader() {
  if (!loader) {
    if (typeof Worker !== "undefined") {
      const startWorkers = MeshoptDecoder.useWorkers; // not a React hook, despite the name
      startWorkers(2);
    }
    loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  }
  return loader;
}

const parsed = new Map<string, Promise<GLTF>>();
const houses = new Map<HouseVariant, Promise<GLTF>>();

function parseOnce(url: string, data: Promise<ArrayBuffer> | ArrayBuffer): Promise<GLTF> {
  let p = parsed.get(url);
  if (!p) {
    p = Promise.resolve(data)
      .then((buf) => gltfLoader().parseAsync(buf, ""))
      .then((gltf) => {
        releaseModel(url); // the geometry keeps what it needs
        return gltf;
      });
    parsed.set(url, p);
    p.catch(() => parsed.delete(url));
  }
  return p;
}

/** A model by URL, downloaded and parsed once. */
export function loadModel(url: string): Promise<GLTF> {
  return parsed.get(url) ?? parseOnce(url, fetchModel(url));
}

/** The reference house in a variant (lite falls back to the full model if it is missing). */
export function loadHouse(variant: HouseVariant): Promise<GLTF> {
  let p = houses.get(variant);
  if (!p) {
    p = fetchHouse(variant, HOUSE_URLS).then(({ url, data }) => parseOnce(url, data));
    houses.set(variant, p);
    p.catch(() => houses.delete(variant));
  }
  return p;
}

/** Suspends until the model is ready (errors reach the canvas error boundary). */
export function useModel(url: string): GLTF {
  return use(loadModel(url));
}

export function useHouse(variant: HouseVariant): GLTF {
  return use(loadHouse(variant));
}
