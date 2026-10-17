import { CAMERA_DEFAULT_TILT, DEFAULT_CAMERA_PROFILE, snapCameraTilt } from './camera-profile';
export const D8_CAMERA_DEFAULT_TILT = CAMERA_DEFAULT_TILT;

/** Presets run once at a zone/combat transition; manual changes then survive. */
export class D8InteriorCameraTilt {
  private inside: boolean | null = null;
  private combat = false;
  private explorationTilt = CAMERA_DEFAULT_TILT;
  private explorationInside = false;
  reset() { this.inside = null; this.combat = false; this.explorationTilt = CAMERA_DEFAULT_TILT; }
  update(inside: boolean, requestedTilt: number, combat = false,profile=DEFAULT_CAMERA_PROFILE) {
    const requested = snapCameraTilt(requestedTilt,profile);
    if (combat && !this.combat) {
      this.explorationTilt = this.inside === null ? inside ? profile.min : profile.default : requested;
      this.explorationInside = inside; this.inside = inside; this.combat = true;
      return profile.max;
    }
    if (combat) { this.inside = inside; return requested; }
    if (this.combat) {
      this.combat = false; this.inside = inside;
      return inside === this.explorationInside ? this.explorationTilt : inside ? profile.min : profile.default;
    }
    if (inside === this.inside) return requested;
    this.inside = inside;
    return inside ? profile.min : profile.default;
  }
}
