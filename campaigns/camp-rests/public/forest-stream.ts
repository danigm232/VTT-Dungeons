import type { Cell } from '../../../engine/shared/campaign.js';
/** The stream keeps its banks west of the large tent's complete footprint. */
export const forestStreamColumn = (row: number) => 2 + Math.min(1, Math.max(0, Math.floor(row / 11)));
export const forestStreamWater = (cell: Cell) => cell.row > 2 && cell.row < 19 && Math.abs(cell.col - forestStreamColumn(cell.row)) <= 1;
export function forestStreamX(z: number) {
  const bend = Math.max(0, Math.min(1, (z / 1.5 - 9.5) / 3));
  return (2.5 + bend * bend * (3 - 2 * bend)) * 1.5 + Math.sin(z * .46) * .13;
}
