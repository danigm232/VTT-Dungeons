const INITIAL_ALPHA = -Math.PI / 4;
const ORIENTATION_STEP = Math.PI / 4;
const ORIENTATION_COUNT = 8;
import { CAMERA_MIN_TILT as CAMERA_TILT_MIN_DEGREES, CAMERA_MAX_TILT as CAMERA_TILT_MAX_DEGREES } from './camera-profile';

export function normalizeCameraOrientationStep(step: number) {
  return ((Math.trunc(step) % ORIENTATION_COUNT) + ORIENTATION_COUNT) % ORIENTATION_COUNT;
}

export function cameraAlphaForOrientation(baseAlpha: number, step: number) {
  return baseAlpha + normalizeCameraOrientationStep(step) * ORIENTATION_STEP;
}

export function cameraBetaForTiltDegrees(degrees: number) {
  const tilt = Math.max(CAMERA_TILT_MIN_DEGREES, Math.min(CAMERA_TILT_MAX_DEGREES, degrees));
  return (90 - tilt) * Math.PI / 180;
}

export function cameraTiltDegreesForBeta(beta: number) {
  return Math.max(CAMERA_TILT_MIN_DEGREES, Math.min(CAMERA_TILT_MAX_DEGREES, 90 - beta * 180 / Math.PI));
}

/** A1 opens toward the front path. Use the same offset for rendering and input. */
export function sceneOrientationForView(sceneId: string | null, step: number) {
  return (normalizeCameraOrientationStep(step) + (sceneId === 'camp-a1-rooms' ? 3 : 0)) % ORIENTATION_COUNT;
}

/** Converts screen-relative controls at a discrete resting orientation. */
export function screenVectorToWorld(x: number, up: number, orientationStep: number, beta: number) {
  const step = ((Math.trunc(orientationStep) % ORIENTATION_COUNT) + ORIENTATION_COUNT) % ORIENTATION_COUNT;
  return screenVectorToWorldAtAlpha(x, up, INITIAL_ALPHA + step * ORIENTATION_STEP, beta);
}

/** Use the visible camera basis during a smooth orbit, including tilt. */
export function screenVectorToWorldAtAlpha(x: number, up: number, alpha: number, beta: number) {
  const verticalScale = 1 / Math.max(0.1, Math.abs(Math.cos(beta)));
  const worldX = -Math.sin(alpha) * x - Math.cos(alpha) * up * verticalScale;
  const worldZ = Math.cos(alpha) * x - Math.sin(alpha) * up * verticalScale;
  const magnitude = Math.max(1, Math.abs(worldX), Math.abs(worldZ));
  return { x: worldX / magnitude, z: worldZ / magnitude };
}

/** The DM's one-cell steps use the player's authoritative direction thresholds. */
export function worldVectorToCellDelta(vector: { x: number; z: number }) {
  return { col: vector.x > .25 ? 1 : vector.x < -.25 ? -1 : 0, row: vector.z > .25 ? 1 : vector.z < -.25 ? -1 : 0 };
}
