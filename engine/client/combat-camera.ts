/**
 * Geometry for the player/DM combat camera. Combat is deliberately a tactical
 * overview: UI panels reserve their own safe rectangle and every visible
 * participant is fitted inside it, so following one token cannot hide another.
 */
export type CombatCameraFrame = { centerX: number; centerY: number; scale: number; safe: { left: number; top: number; width: number; height: number } };

export type CombatBounds = { center: { x: number; y: number; z: number }; size: { width: number; height: number; depth: number } };

/** Apply the safe rectangle to clip space instead of using a partial render
 * viewport. D8's post-processing stays full-canvas; Pixi tokens and picking use
 * this same projection, so the floor and overlays remain aligned. */
export function combatSafeProjection(matrix: ArrayLike<number>, viewport: { width: number; height: number }, safe: CombatCameraFrame['safe'], orthographic: boolean) {
  const result = Array.from(matrix), sx = safe.width / viewport.width, sy = safe.height / viewport.height;
  const dx = (safe.left + safe.width / 2) * 2 / viewport.width - 1, dy = 1 - (safe.top + safe.height / 2) * 2 / viewport.height;
  result[0] = result[0]! * (orthographic ? sx : sy); result[5] = result[5]! * sy;
  result[orthographic ? 12 : 8] = dx; result[orthographic ? 13 : 9] = dy;
  return result;
}
/** Only pass authorized, visible actors. Padding leaves movement/weapon room;
 * the full map remains an explicit overview, not the default on large maps. */
export function combatEncounterBounds(points: Array<{ x: number; y: number; z: number }>, padding: number, fallback: CombatBounds): CombatBounds {
  const visible = points.filter(point => Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z));
  if (!visible.length) return fallback;
  const minX = Math.min(...visible.map(point => point.x)), maxX = Math.max(...visible.map(point => point.x));
  const minY = Math.min(...visible.map(point => point.y)), maxY = Math.max(...visible.map(point => point.y));
  const minZ = Math.min(...visible.map(point => point.z)), maxZ = Math.max(...visible.map(point => point.z));
  return { center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 + 1, z: (minZ + maxZ) / 2 }, size: { width: maxX - minX + padding * 2, depth: maxZ - minZ + padding * 2, height: maxY - minY + 4 } };
}

/** Fits every corner, including token height and perspective depth, not just
 * the ground plane. Angles are Babylon ArcRotateCamera alpha/beta. */
export function combatCamera3DFit(size: { width: number; depth: number; height: number }, alpha: number, beta: number, fov: number, aspect: number) {
  const tanVertical = Math.tan(fov / 2), tanHorizontal = tanVertical * Math.max(.01, aspect);
  let radius = 0, halfHeight = 0;
  for (const x of [-size.width / 2, size.width / 2]) for (const y of [-size.height / 2, size.height / 2]) for (const z of [-size.depth / 2, size.depth / 2]) {
    const horizontal = -Math.sin(alpha) * x + Math.cos(alpha) * z;
    const vertical = -Math.cos(alpha) * Math.cos(beta) * x + Math.sin(beta) * y - Math.sin(alpha) * Math.cos(beta) * z;
    const depth = Math.cos(alpha) * Math.sin(beta) * x + Math.cos(beta) * y + Math.sin(alpha) * Math.sin(beta) * z;
    radius = Math.max(radius, depth + Math.abs(horizontal) / tanHorizontal, depth + Math.abs(vertical) / tanVertical);
    halfHeight = Math.max(halfHeight, Math.abs(vertical), Math.abs(horizontal) / Math.max(.01, aspect));
  }
  return { radius: radius * 1.12, halfHeight: halfHeight * 1.12 };
}

export function combatCameraFrame(grid: { width: number; height: number }, viewport: { width: number; height: number }): CombatCameraFrame {
  const mobile = viewport.width <= 1050;
  const inset = mobile
    ? { left: 8, right: 8, top: 116, bottom: 120 }
    : { left: 16, right: 276, top: 16, bottom: 142 };
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
