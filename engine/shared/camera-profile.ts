/** Vertical presets used by both the renderer and shared camera messages. */
export const CAMERA_DEFAULT_TILT = 25;
export const CAMERA_MIN_TILT = 15;
export const CAMERA_MAX_TILT = 35;
export const CAMERA_TILT_STEP = 10;
export type CameraTiltProfile = {min:number;max:number;default:number;step:number};
export const DEFAULT_CAMERA_PROFILE:CameraTiltProfile={min:15,max:35,default:25,step:10};
export const RETREAT_CAMERA_PROFILE:CameraTiltProfile={min:20,max:40,default:30,step:10};
export function cameraProfileForScene(sceneId:string|null):CameraTiltProfile {
  return sceneId==='dragon-rest'?RETREAT_CAMERA_PROFILE:DEFAULT_CAMERA_PROFILE;
}
export function clampCameraTilt(degrees: number,profile=DEFAULT_CAMERA_PROFILE) {
  return Number.isFinite(degrees) ? Math.max(profile.min, Math.min(profile.max, degrees)) : profile.default;
}
export function snapCameraTilt(degrees: number,profile=DEFAULT_CAMERA_PROFILE) {
  return profile.min + Math.round((clampCameraTilt(degrees,profile) - profile.min) / profile.step) * profile.step;
}
export function validCameraTiltForScene(sceneId:string, degrees:unknown):degrees is number {
  return typeof degrees==='number' && Number.isFinite(degrees)
    && degrees===snapCameraTilt(degrees,cameraProfileForScene(sceneId));
}
