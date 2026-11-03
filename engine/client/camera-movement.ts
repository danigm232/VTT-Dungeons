const INITIAL_ALPHA = -Math.PI / 4;
const ORIENTATION_STEP = Math.PI / 4;
const ORIENTATION_COUNT = 8;
import { CAMERA_MIN_TILT as CAMERA_TILT_MIN_DEGREES, CAMERA_MAX_TILT as CAMERA_TILT_MAX_DEGREES } from './camera-profile';
import {DEFAULT_CAMERA_PROFILE,clampCameraTilt,type CameraTiltProfile} from './camera-profile';
import type { Facing } from '../shared/protocol';
import { WRECK_CAMERA_BASE_ALPHA } from '../shared/wreck-camera-profile.js';

const headings: readonly Facing[] = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
/** Sprite direction in the current camera basis; gameplay heading stays in world space. */
export function cameraRelativeHeading(facing: Facing, alpha: number): Facing {
  const radians = headings.indexOf(facing) * ORIENTATION_STEP;
  const x = Math.sin(radians), z = -Math.cos(radians);
  const right = -Math.sin(alpha) * x + Math.cos(alpha) * z;
  const up = -Math.cos(alpha) * x - Math.sin(alpha) * z;
  return headings[normalizeCameraOrientationStep(Math.round(Math.atan2(right, up) / ORIENTATION_STEP))]!;
}

export function normalizeCameraOrientationStep(step: number) {
  return ((Math.trunc(step) % ORIENTATION_COUNT) + ORIENTATION_COUNT) % ORIENTATION_COUNT;
}

export function cameraAlphaForOrientation(baseAlpha: number, step: number) {
  return baseAlpha + normalizeCameraOrientationStep(step) * ORIENTATION_STEP;
}

export function cameraBetaForTiltDegrees(degrees: number,profile:CameraTiltProfile=DEFAULT_CAMERA_PROFILE) {
  const tilt = clampCameraTilt(degrees,profile);
  return (90 - tilt) * Math.PI / 180;
}

export function cameraTiltDegreesForBeta(beta: number,profile:CameraTiltProfile=DEFAULT_CAMERA_PROFILE) {
  return clampCameraTilt(90-beta*180/Math.PI,profile);
}

/** A1 opens toward the front path. Use the same offset for rendering and input. */
export function sceneOrientationForView(sceneId: string | null, step: number) {
  return (normalizeCameraOrientationStep(step) + (sceneId === 'camp-a1-rooms' ? 3 : 0)) % ORIENTATION_COUNT;
}
/** Open toward the arriving party, not from behind cliffs or the north tent. */
export function terrainCameraBaseAlpha(sceneId: string | null) {
  // At 90° Babylon places the camera on the south (+Z) side, looking north
  // across the arrival beach toward the Retreat's cliff face. Keep horizontal
  // orbit step 0 aligned with that world-space frontage.
  if (sceneId === 'dragon-rest') return Math.PI / 2;
  if (sceneId === 'wreck-ship') return WRECK_CAMERA_BASE_ALPHA;
  return ['camp-wreck-beach', 'camp-cliffs-observatory', 'camp-coastal-refuge'].includes(sceneId ?? '') ? Math.PI / 4 : INITIAL_ALPHA;
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
