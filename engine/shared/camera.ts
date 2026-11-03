/** Scene renderers whose camera supports the shared, stepped tactical view controls. */
export function supportsCameraOrientation(scene: { renderer?: string; terrain?: unknown } | null | undefined) {
  return scene?.renderer === 'babylon-d8' || (scene?.renderer === 'babylon-hd2d' && Boolean(scene.terrain));
}

/** Signed 15° steps around the authored front. Fractions support touch dragging. */
export const CAMERA_ORBIT_STEP_DEGREES = 15;
export const CAMERA_ORBIT_MAX_STEP = 2;
export const CAMERA_ORBIT_PROFILE = 'limited-hd2d-v2';
export type CameraLocation = {cell:{col:number;row:number};surfaceId:string;point:{x:number;y:number;z:number}};
export type SharedCameraFrame = { halfHeight:number; target:{x:number;y:number;z:number}; focusId:string|null; location?:CameraLocation };
export function validCameraLocation(value:unknown):value is CameraLocation {
  if(!value||typeof value!=='object')return false;
  const location=value as CameraLocation;
  return typeof location.surfaceId==='string'&&/^[a-z0-9][a-z0-9._-]{0,39}$/.test(location.surfaceId)
    && Boolean(location.cell)&&[location.cell.col,location.cell.row].every(n=>Number.isInteger(n)&&n>=0&&n<=255)
    && Boolean(location.point)&&[location.point.x,location.point.y,location.point.z].every(n=>Number.isFinite(n)&&Math.abs(n)<=1e6);
}
export function validSharedCameraFrame(value:unknown):value is SharedCameraFrame {
  if (!value || typeof value !== 'object') return false;
  const frame=value as SharedCameraFrame;
  return Number.isFinite(frame.halfHeight) && frame.halfHeight>=.75 && frame.halfHeight<=10000
    && Boolean(frame.target) && ['x','y','z'].every(axis=>typeof frame.target[axis as 'x'|'y'|'z']==='number'
      && Number.isFinite(frame.target[axis as 'x'|'y'|'z']) && Math.abs(frame.target[axis as 'x'|'y'|'z'])<=1e6)
    && (frame.focusId===null || typeof frame.focusId==='string' && frame.focusId.length<=128)
    && (frame.location===undefined||validCameraLocation(frame.location));
}
export type SharedCameraOrientationEvent = {
  runtimeEpoch:string; sceneEpoch:number; sceneId:string; step:number|null; profile?:string; tilt?:number; frame?:SharedCameraFrame;
};
export function clampCameraOrbitStep(step: number) {
  return Number.isFinite(step) ? Math.max(-CAMERA_ORBIT_MAX_STEP, Math.min(CAMERA_ORBIT_MAX_STEP, step)) : 0;
}
export function validCameraOrbitStep(step: unknown): step is number {
  return typeof step === 'number' && Number.isFinite(step) && Math.abs(step) <= CAMERA_ORBIT_MAX_STEP;
}
export function limitedCameraAlpha(front: number, step: number) {
  return front + clampCameraOrbitStep(step) * CAMERA_ORBIT_STEP_DEGREES * Math.PI / 180;
}
export function cameraOrbitLabel(step: number) {
  const degrees = Math.round(clampCameraOrbitStep(step) * CAMERA_ORBIT_STEP_DEGREES);
  return degrees === 0 ? 'Vista inicial' : `${Math.abs(degrees)}° a la ${degrees < 0 ? 'izquierda' : 'derecha'}`;
}
