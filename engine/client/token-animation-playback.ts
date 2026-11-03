/** Facing suffixes describe the camera view, not a different action clock. */
export const tokenAnimationRole = (state: string) => state.replace(/-(?:n|ne|e|se|s|sw|w|nw)$/, '');

export function sameAnimationAction(displayed: string | null, commanded: string | null) {
  return Boolean(displayed && commanded && tokenAnimationRole(displayed) === tokenAnimationRole(commanded));
}

export function directedTokenState(state: string, direction: string, exists: (candidate: string) => boolean) {
  const candidate = `${tokenAnimationRole(state)}-${direction}`;
  return exists(candidate) ? candidate : state;
}

/** A movement arc owns the jump clock; one-shot actions hold their final pose. */
export function tokenAnimationFrame(frameCount: number, fps: number, elapsedMs: number, loop: boolean, progress?: number) {
  if (frameCount < 1) return 0;
  const index = progress === undefined
    ? Math.floor(Math.max(0, elapsedMs) * fps / 1000)
    : Math.floor(Math.max(0, Math.min(1, progress)) * frameCount);
  return loop && progress === undefined ? index % frameCount : Math.min(frameCount - 1, index);
}
