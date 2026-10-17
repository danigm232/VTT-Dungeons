import { d8CameraHalfHeight } from './d8-camera';
export type CameraZoomSpace = { width: number; depth: number; height: number };
export type CameraZoomPolicy = { size: CameraZoomSpace; beta: number; aspect: number; baseHalfHeight: number;
  actorHeight?: number; tileMeters?: number; tactical?: boolean; combatDetail?: boolean; focusWidth?: number;
  player?: boolean; overview?: boolean; viewportHeight?: number };

/** Limit the visible world, not an arbitrary multiplier. Keep neighbouring
 * cells and the whole actor; a combat overview retains the whole encounter. */
export function cameraZoomLimits(policy: CameraZoomPolicy) {
  const fit = d8CameraHalfHeight(policy.size, policy.beta, policy.aspect);
  const tile = policy.tileMeters ?? 1.5, actorHeight = policy.actorHeight ?? 1.65;
  const close = Math.max(actorHeight / .6, Math.max(tile * 2, (policy.focusWidth ?? 0) * .7) / Math.max(.05, policy.aspect));
  // Automatic combat framing still starts at fit; manual zoom may approach
  // another 35%. Projector/full-map overview must retain the entire encounter.
  const minHalfHeight = policy.tactical ? policy.combatDetail && !policy.overview ? Math.min(fit,Math.max(close,fit/1.35)) : fit : Math.min(fit, close);
  const height = Math.max(1, policy.viewportHeight ?? 800);
  const readable = actorHeight * height / (2 * Math.max(18, height * .035));
  const maxHalfHeight = Math.max(minHalfHeight, policy.player && !policy.overview && !policy.tactical ? Math.min(fit * 1.12, readable) : fit * 1.12);
  return { minHalfHeight, maxHalfHeight, minZoom: policy.baseHalfHeight / maxHalfHeight, maxZoom: policy.baseHalfHeight / minHalfHeight };
}
export function boundCameraZoom(zoom: number, policy: CameraZoomPolicy) {
  const limits = cameraZoomLimits(policy);
  const value = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  const bounded = Math.max(limits.minZoom, Math.min(limits.maxZoom, value));
  return { ...limits, zoom: bounded, halfHeight: policy.baseHalfHeight / bounded };
}
