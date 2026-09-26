/** Resolution scale for the decorative 3D layer; other scenes keep the default. */
export function campTerrainHardwareScalingLevel(isCamp: boolean, compactDisplay: boolean) {
  return isCamp && compactDisplay ? 1.35 : 1;
}
