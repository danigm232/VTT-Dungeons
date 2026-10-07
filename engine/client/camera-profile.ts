/** The supported art is drawn for an oblique view. Keep the vertical angle
 * within that composition while retaining all eight horizontal orientations. */
export const CAMERA_DEFAULT_TILT = 45;
export const CAMERA_MIN_TILT = 25;
export const CAMERA_MAX_TILT = 50;
export function clampCameraTilt(degrees: number) {
  return Number.isFinite(degrees) ? Math.max(CAMERA_MIN_TILT, Math.min(CAMERA_MAX_TILT, degrees)) : CAMERA_DEFAULT_TILT;
}
