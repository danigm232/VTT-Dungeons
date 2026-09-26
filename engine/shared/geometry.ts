import type { Cell, Rotation } from './campaign.js';

export const cellKey = (cell: Cell) => `${cell.col},${cell.row}`;
export const sameCell = (a: Cell, b: Cell) => a.col === b.col && a.row === b.row;

export function footprintFor(cell: Cell, rotation: Rotation, base: readonly Cell[]) {
  let offsets = base.map(offset => ({ ...offset }));
  for (let turn = 0; turn < rotation / 90; turn++) {
    const height = Math.max(...offsets.map(offset => offset.row)) + 1;
    offsets = offsets.map(offset => ({ col: height - 1 - offset.row, row: offset.col }));
  }
  const minCol = Math.min(...offsets.map(offset => offset.col));
  const minRow = Math.min(...offsets.map(offset => offset.row));
  return offsets.map(offset => ({ col: cell.col + offset.col - minCol, row: cell.row + offset.row - minRow }));
}
