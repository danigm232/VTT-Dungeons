import { clampCameraTilt } from './camera-profile';

export type CameraTouchAxis = 'orbit' | 'tilt' | 'zoom';
export const CAMERA_TOUCH_PAN_THRESHOLD = 20;

/** Choose once per gesture, after sampling both contacts in the same frame. */
export function cameraTouchAxis(dx: number, dy: number, pinchTravel: number, canOrbit: boolean): CameraTouchAxis | null {
  const pan = Math.hypot(dx, dy), pinch = Math.abs(pinchTravel);
  if (pinch > 16 && pinch > pan * 1.5) return 'zoom';
  if (pan <= CAMERA_TOUCH_PAN_THRESHOLD || !canOrbit) return null;
  return Math.abs(dx) >= Math.abs(dy) ? 'orbit' : 'tilt';
}

/** Up raises the view; down lowers it. Ignore the recognition dead zone so
 * crossing the threshold cannot jump straight to a vertical angle limit. */
export function cameraTiltFromTouch(startDegrees: number, verticalTravel: number) {
  const travel = Math.sign(verticalTravel) * Math.max(0, Math.abs(verticalTravel) - CAMERA_TOUCH_PAN_THRESHOLD);
  return adjustCameraTiltForTouch(startDegrees, travel);
}

export function adjustCameraTiltForTouch(currentDegrees: number, deltaY: number) {
  return clampCameraTilt(currentDegrees - deltaY * .1);
}
