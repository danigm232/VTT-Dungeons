export type KeyboardMovementAxes = { x: number; up: number };

/** Resolve a simultaneous WASD/arrow-key chord into one screen-relative step. */
export function keyboardMovementAxes(keys: ReadonlySet<string>): KeyboardMovementAxes {
  return {
    x: (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0),
    up: (keys.has('w') || keys.has('arrowup') ? 1 : 0) - (keys.has('s') || keys.has('arrowdown') ? 1 : 0)
  };
}
