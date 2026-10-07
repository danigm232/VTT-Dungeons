import type { Cell, Rotation } from './campaign.js';

export const cellKey = (cell: Cell) => `${cell.col},${cell.row}`;
export const sameCell = (a: Cell, b: Cell) => a.col === b.col && a.row === b.row;

/** Segment/AABB clipping, including thin walls and diagonal corners. */
export function segmentCrossesBox(from: Cell, to: Cell, box: { minCol: number; maxCol: number; minRow: number; maxRow: number }) {
  let enter = 0, leave = 1;
  for (const [start, delta, min, max] of [
    [from.col + .5, to.col - from.col, box.minCol, box.maxCol],
    [from.row + .5, to.row - from.row, box.minRow, box.maxRow]
  ]) {
    if (Math.abs(delta!) < 1e-9) { if (start! < min! || start! > max!) return false; }
    else {
      const a = (min! - start!) / delta!, b = (max! - start!) / delta!;
      enter = Math.max(enter, Math.min(a, b)); leave = Math.min(leave, Math.max(a, b));
      if (enter > leave) return false;
    }
  }
  return leave > 1e-6 && enter < 1 - 1e-6;
}

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
