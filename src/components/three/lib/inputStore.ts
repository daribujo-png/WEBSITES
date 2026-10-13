/**
 * Tiny mutable store for pointer/scroll input that a canvas reads every
 * frame. DOM handlers write through `set`, the canvas subscribes to get a
 * frame scheduled (frameloop "demand"). Nothing here re-renders React.
 */
export interface InputStore<T extends object> {
  get: () => Readonly<T>;
  set: (patch: Partial<T>) => void;
  subscribe: (listener: () => void) => () => void;
}

export function createInputStore<T extends object>(initial: T): InputStore<T> {
  const state = { ...initial };
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set(patch) {
      Object.assign(state, patch);
      listeners.forEach((l) => l());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
