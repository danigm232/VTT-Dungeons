import type { Cell } from '../../../engine/shared/campaign.js';

export const A1_TILE_METERS = 1.5;
export const A1_COLS = 48;
export const A1_ROWS = 22;

export type A1RoomRole = 'free' | 'tarak' | 'varnoth' | 'myla' | 'kobolds-west' | 'kobolds-east';
export type A1FurnitureKind = 'bed' | 'nightstand' | 'desk' | 'chair' | 'tools' | 'hammock';

export type A1RoomSpec = {
  id: number;
  role: A1RoomRole;
  label: string;
  cells: Cell[];
  entry: Cell;
  interaction: Cell;
  objectCell: Cell;
  furniture: Array<{ kind: A1FurnitureKind; cell: Cell; id: string }>;
};

const cellKey = (cell: Cell) => `${cell.col},${cell.row}`;
const cellsIn = (col0: number, col1: number, row0: number, row1: number) => {
  const cells: Cell[] = [];
  for (let row = row0; row <= row1; row++) for (let col = col0; col <= col1; col++) cells.push({ col, row });
  return cells;
};
const uniqueCells = (...groups: Cell[][]) => [...new Map(groups.flat().map(cell => [cellKey(cell), cell])).values()];
const furniture = (room: number, entries: Array<[A1FurnitureKind, number, number, string?]>) => entries.map(([kind, col, row, suffix], index) => ({
  kind, cell: { col, row }, id: `a1-${kind}-${room}-${suffix ?? index + 1}`
}));

/**
 * CANON geometry for A1. Each footprint follows the unequal excavated cells in
 * the official map: a small western room, a narrow deep cell, two broad cells,
 * a narrow hammock cell and a larger eastern hammock cell. The one-cell necks
 * are the six open entrances cut into the cliff.
 */
export const A1_ROOMS: A1RoomSpec[] = [
  {
    id: 1, role: 'free', label: 'Habitación libre',
    cells: uniqueCells(cellsIn(3, 7, 7, 10), [{ col: 6, row: 11 }]),
    entry: { col: 6, row: 11 }, interaction: { col: 5, row: 10 }, objectCell: { col: 4, row: 8 },
    furniture: furniture(1, [['bed', 4, 8], ['nightstand', 4, 7], ['desk', 7, 8], ['chair', 7, 9]])
  },
  {
    id: 2, role: 'tarak', label: 'Celda de Tarak',
    cells: uniqueCells(cellsIn(10, 13, 3, 10), [{ col: 12, row: 11 }]),
    entry: { col: 12, row: 11 }, interaction: { col: 11, row: 9 }, objectCell: { col: 10, row: 5 },
    furniture: furniture(2, [['bed', 10, 5], ['nightstand', 10, 4], ['desk', 13, 5], ['chair', 13, 6]])
  },
  {
    id: 3, role: 'varnoth', label: 'Celda de Varnoth',
    cells: uniqueCells(cellsIn(16, 21, 5, 10), [{ col: 19, row: 11 }]),
    entry: { col: 19, row: 11 }, interaction: { col: 18, row: 9 }, objectCell: { col: 17, row: 7 },
    furniture: furniture(3, [['bed', 17, 7], ['nightstand', 17, 6], ['desk', 21, 7], ['chair', 21, 8]])
  },
  {
    id: 4, role: 'myla', label: 'Celda de Myla',
    cells: uniqueCells(cellsIn(24, 29, 4, 10), [{ col: 26, row: 11 }]),
    entry: { col: 26, row: 11 }, interaction: { col: 26, row: 9 }, objectCell: { col: 25, row: 6 },
    furniture: furniture(4, [['bed', 25, 6], ['nightstand', 25, 5], ['desk', 29, 6], ['chair', 29, 7], ['tools', 27, 4]])
  },
  {
    id: 5, role: 'kobolds-west', label: 'Celda de kobolds oeste',
    cells: uniqueCells(cellsIn(32, 34, 3, 10), [{ col: 33, row: 11 }]),
    entry: { col: 33, row: 11 }, interaction: { col: 33, row: 9 }, objectCell: { col: 32, row: 5 },
    furniture: furniture(5, [['hammock', 32, 5, 'a'], ['hammock', 34, 5, 'b'], ['hammock', 32, 7, 'c'], ['hammock', 34, 7, 'd']])
  },
  {
    id: 6, role: 'kobolds-east', label: 'Celda de kobolds este',
    cells: uniqueCells(cellsIn(37, 42, 4, 9), cellsIn(38, 41, 10, 10), [{ col: 39, row: 11 }]),
    entry: { col: 39, row: 11 }, interaction: { col: 39, row: 9 }, objectCell: { col: 38, row: 5 },
    furniture: furniture(6, [['hammock', 38, 5, 'a'], ['hammock', 41, 5, 'b'], ['hammock', 38, 7, 'c'], ['hammock', 41, 7, 'd']])
  }
];

export const A1_PLAZA_CELLS = uniqueCells(
  cellsIn(2, 45, 11, 12),
  cellsIn(1, 46, 13, 14),
  cellsIn(2, 45, 15, 15),
  cellsIn(4, 43, 16, 16),
  cellsIn(5, 42, 17, 17)
);

export const A1_STATUE_CELL: Cell = { col: 9, row: 13 };
export const A1_FIRE_CELL: Cell = { col: 24, row: 14 };
export const A1_ROOM_CELL_KEYS = new Set(A1_ROOMS.flatMap(room => room.cells).map(cellKey));
export const A1_PLAZA_CELL_KEYS = new Set(A1_PLAZA_CELLS.map(cellKey));
export const a1IsWalkable = (cell: Cell) => A1_ROOM_CELL_KEYS.has(cellKey(cell)) || A1_PLAZA_CELL_KEYS.has(cellKey(cell));

export const A1_BLOCKED = [
  ...A1_ROOMS.flatMap(room => room.furniture.map(item => ({ cell: item.cell, id: item.id }))),
  { cell: A1_STATUE_CELL, id: 'a1-astalagan-statue' },
  { cell: A1_FIRE_CELL, id: 'a1-plaza-fire' },
  { cell: { col: 22, row: 14 }, id: 'a1-fire-bench-west' },
  { cell: { col: 26, row: 14 }, id: 'a1-fire-bench-east' }
];

// The plaza touches the full room frontage in the square grid. These edges
// preserve the carved rock wall so movement can cross only each open doorway.
export const A1_BLOCKED_EDGES = A1_ROOMS.flatMap(room => room.cells
  .filter(cell => cell.row === 10 && cell.col !== room.entry.col)
  .map(cell => ({ from: cell, to: { col: cell.col, row: 11 } })));

export const A1_SPAWNS: Cell[] = [
  { col: 18, row: 15 }, { col: 20, row: 15 }, { col: 22, row: 15 },
  { col: 26, row: 15 }, { col: 28, row: 15 }, { col: 30, row: 15 }
];
