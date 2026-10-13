/**
 * three.js routes its warnings through setConsoleFunction. @react-three/fiber
 * 9 (latest stable) still constructs THREE.Clock internally, which three r183+
 * reports as deprecated on every canvas. That message is about the library,
 * not this site, so it is dropped; every other three.js message passes through.
 * Remove this when @react-three/fiber switches to THREE.Timer.
 */
import { setConsoleFunction } from "three";

const DROPPED = ["THREE.Clock: This module has been deprecated"];

type Level = "log" | "warn" | "error";

setConsoleFunction((level: Level, message: unknown, ...params: unknown[]) => {
  if (typeof message === "string" && DROPPED.some((d) => message.startsWith(d))) return;
  const out = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  out(message, ...params);
});
