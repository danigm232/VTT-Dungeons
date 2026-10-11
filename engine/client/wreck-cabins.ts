import type { Cell } from '../shared/protocol.js';
import { WRECK_CABINS } from '../shared/wreck-structure.js';

export type WreckCabinId = 'c4' | 'c5' | 'c6' | 'c7';

export const wreckCabins = WRECK_CABINS;

export function wreckCabinAt(cell: Cell, surfaceId: string): WreckCabinId | null {
  if (surfaceId !== 'main') return null;
  for (const [id, bounds] of Object.entries(wreckCabins) as Array<[WreckCabinId, typeof wreckCabins[WreckCabinId]]>) {
    if (cell.col >= bounds.minCol && cell.col <= bounds.maxCol && cell.row >= bounds.minRow && cell.row <= bounds.maxRow) return id;
  }
  return null;
}
