/** Arrival/boarding side: the rowboat is at +Z, and the keel runs along X.
 * Babylon alpha +PI/2 looks from that boat side, square onto the broadside.
 * Camera, input, overview fitting and scenic layers must share this front.
 */
export const WRECK_CAMERA_BASE_ALPHA = Math.PI / 2;

/** Door-facing cutaways retain their own front when the exterior changes. */
export function wreckCameraFront(room: string | null = null) {
  if(room==='c4'||room==='c5')return -Math.PI/4;
  if(room==='c6'||room==='c7')return 3*Math.PI/4;
  return WRECK_CAMERA_BASE_ALPHA;
}
