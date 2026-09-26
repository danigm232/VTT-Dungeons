import type { Cell } from '../../engine/shared/campaign';

type Point = { x: number; y: number };
const shipScenes = new Set(['wreck-upper', 'wreck-main', 'wreck-lower', 'wreck-hold', 'wreck-crow']);
const SHIP_COLS = 44, SHIP_ROWS = 20;

export function hasWreckProjection(sceneId: string): boolean { return shipScenes.has(sceneId); }

export function projectWreckPoint(sceneId: string, col: number, row: number, width: number, height: number): Point | null {
  if (!shipScenes.has(sceneId)) return null;
  return { x: col / SHIP_COLS * width, y: row / SHIP_ROWS * height };
}

export function nearestWreckCell(sceneId: string, point: Point, cells: Cell[], width: number, height: number): Cell | null {
  let best: Cell | null = null, distance = Infinity;
  for (const cell of cells) {
    const center = projectWreckPoint(sceneId, cell.col + .5, cell.row + .5, width, height); if (!center) continue;
    const d = Math.hypot(point.x - center.x, point.y - center.y);
    if (d < distance) { distance = d; best = cell; }
  }
  return distance <= Math.max(width / 20, height / 13) ? best : null;
}
