import type { Cell } from '../shared/protocol.js';
import { WRECK_SEA_MARGIN_CELLS } from '../../campaigns/stormwreck-isle/public/wreck-runtime.js';

export type WreckCabinId = 'c4' | 'c5' | 'c6' | 'c7';

export const wreckCabins: Record<WreckCabinId, { minCol: number; maxCol: number; minRow: number; maxRow: number }> = {
  c4: { minCol: 12 + WRECK_SEA_MARGIN_CELLS, maxCol: 17 + WRECK_SEA_MARGIN_CELLS,
    minRow: 3 + WRECK_SEA_MARGIN_CELLS, maxRow: 6 + WRECK_SEA_MARGIN_CELLS },
  c5: { minCol: 12 + WRECK_SEA_MARGIN_CELLS, maxCol: 17 + WRECK_SEA_MARGIN_CELLS,
    minRow: 8 + WRECK_SEA_MARGIN_CELLS, maxRow: 12 + WRECK_SEA_MARGIN_CELLS },
  c6: { minCol: 27 + WRECK_SEA_MARGIN_CELLS, maxCol: 32 + WRECK_SEA_MARGIN_CELLS,
    minRow: 3 + WRECK_SEA_MARGIN_CELLS, maxRow: 6 + WRECK_SEA_MARGIN_CELLS },
  c7: { minCol: 27 + WRECK_SEA_MARGIN_CELLS, maxCol: 32 + WRECK_SEA_MARGIN_CELLS,
    minRow: 8 + WRECK_SEA_MARGIN_CELLS, maxRow: 12 + WRECK_SEA_MARGIN_CELLS }
};

export function wreckCabinAt(cell: Cell, surfaceId: string): WreckCabinId | null {
  if (surfaceId !== 'main') return null;
  for (const [id, bounds] of Object.entries(wreckCabins) as Array<[WreckCabinId, typeof wreckCabins[WreckCabinId]]>) {
    if (cell.col >= bounds.minCol && cell.col <= bounds.maxCol && cell.row >= bounds.minRow && cell.row <= bounds.maxRow) return id;
  }
  return null;
}
