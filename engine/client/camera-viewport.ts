export type CameraSafeArea = { left: number; top: number; width: number; height: number };
/** Keep the player's top HUD and bottom controls outside the focus rectangle.
 * The host already excludes DM side panels and external page furniture. */
export function explorationCameraSafeArea(width: number, height: number, player: boolean): CameraSafeArea {
  if (!player) return { left: 0, top: 0, width, height };
  const mobile = width <= 1050;
  const top = Math.min(height * .12, mobile ? 56 : 32);
  const bottom = Math.min(height * .25, mobile ? 112 : 72);
  return { left: 8, top, width: Math.max(1, width - 16), height: Math.max(1, height - top - bottom) };
}
