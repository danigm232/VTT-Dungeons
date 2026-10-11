/** Native actors share this layer: don't undersample them on compact displays.
 * Cap high-DPI rendering to keep rain/foliage affordable on phones. */
export function campTerrainHardwareScalingLevel(_isCamp: boolean, compactDisplay: boolean, pixelRatio = 1) {
  return 1 / Math.max(1, Math.min(pixelRatio, compactDisplay ? 1.25 : 1.5));
}
