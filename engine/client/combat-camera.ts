/**
 * Geometry for the player/DM combat camera. Combat is deliberately a tactical
 * overview: UI panels reserve their own safe rectangle and the complete grid
 * is fitted inside it, so focus on one token can never hide an opponent.
 */
export type CombatCameraFrame = { centerX: number; centerY: number; scale: number; safe: { left: number; top: number; width: number; height: number } };

export function combatCameraFrame(grid: { width: number; height: number }, viewport: { width: number; height: number }): CombatCameraFrame {
  const mobile = viewport.width <= 720;
  const compactDesktop = !mobile && viewport.width <= 1050;
  const inset = mobile
    ? { left: 8, right: 8, top: 116, bottom: 72 }
    : compactDesktop
      ? { left: 16, right: 236, top: 16, bottom: 98 }
      : { left: 16, right: 276, top: 16, bottom: 106 };
  const safe = {
    left: inset.left,
    top: inset.top,
    width: Math.max(1, viewport.width - inset.left - inset.right),
    height: Math.max(1, viewport.height - inset.top - inset.bottom)
  };
  // Keep token rings and range outlines visible at the edges too.
  const edge = 28;
  const scale = Math.min(safe.width / (grid.width + edge * 2), safe.height / ((grid.height + edge * 2) * .92));
  return { centerX: safe.left + safe.width / 2, centerY: safe.top + safe.height / 2, scale, safe };
}
