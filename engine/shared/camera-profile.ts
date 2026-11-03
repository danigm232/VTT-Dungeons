/** Continuous vertical range and five-degree landmarks, shared by every view. */
export const CAMERA_DEFAULT_TILT = 25;
export const CAMERA_MIN_TILT = 5;
export const CAMERA_MAX_TILT = 25;
export const CAMERA_TILT_STOPS = [5,10,15,20,25] as const;
export type CameraTiltProfile = {min:number;max:number;default:number;interior:number;stops:readonly number[]};
export const DEFAULT_CAMERA_PROFILE:CameraTiltProfile={min:5,max:25,default:25,interior:10,stops:CAMERA_TILT_STOPS};
export const RETREAT_CAMERA_PROFILE:CameraTiltProfile={...DEFAULT_CAMERA_PROFILE};
export function cameraProfileForScene(sceneId:string|null):CameraTiltProfile {
  return sceneId==='dragon-rest'?RETREAT_CAMERA_PROFILE:DEFAULT_CAMERA_PROFILE;
}
export function clampCameraTilt(degrees: number,profile=DEFAULT_CAMERA_PROFILE) {
  return Number.isFinite(degrees) ? Math.max(profile.min, Math.min(profile.max, degrees)) : profile.default;
}
/** Nearest UI landmark only; manual/stored angles must use clampCameraTilt. */
export function snapCameraTilt(degrees: number,profile=DEFAULT_CAMERA_PROFILE) {
  const value=clampCameraTilt(degrees,profile);
  return profile.stops.reduce((nearest,stop)=>Math.abs(stop-value)<=Math.abs(nearest-value)?stop:nearest,profile.default);
}
/** A short tap moves to the next five-degree landmark from any angle. */
export function stepCameraTilt(degrees:number,direction:number,profile=DEFAULT_CAMERA_PROFILE) {
  const current=clampCameraTilt(degrees,profile);
  return direction>0 ? profile.stops.find(stop=>stop>current+1e-8)??profile.max
    : direction<0 ? [...profile.stops].reverse().find(stop=>stop<current-1e-8)??profile.min : current;
}
export function validCameraTiltForScene(sceneId:string, degrees:unknown):degrees is number {
  return typeof degrees==='number' && Number.isFinite(degrees)
    && degrees>=cameraProfileForScene(sceneId).min && degrees<=cameraProfileForScene(sceneId).max;
}
