import { CAMERA_DEFAULT_TILT, DEFAULT_CAMERA_PROFILE, clampCameraTilt } from './camera-profile';
export const D8_CAMERA_DEFAULT_TILT = CAMERA_DEFAULT_TILT;

/** Only crossing an indoor/outdoor boundary changes a chosen elevation.
 * Scene reloads restore their own angle; combat never overrides it. */
export class D8InteriorCameraTilt {
  private inside: boolean | null = null;
  private newScene = true;
  zoneChanged = false;
  reset() { this.inside = null; this.newScene = true; this.zoneChanged = false; }
  enterScene() { this.newScene = true; }
  update(inside: boolean, requestedTilt: number, _combat = false,profile=DEFAULT_CAMERA_PROFILE,preserveInitial=false) {
    const requested = clampCameraTilt(requestedTilt,profile);
    this.zoneChanged = false;
    const boundary=this.inside!==null&&inside!==this.inside;
    const initialize=this.inside===null||this.newScene;
    this.inside = inside;
    this.newScene=false;
    if(boundary||initialize&&!preserveInitial){this.zoneChanged=true;return inside?profile.interior:profile.default;}
    return requested;
  }
}
