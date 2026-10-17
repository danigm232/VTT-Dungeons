import type { Cell } from './campaign.js';

export type JumpMode = 'auto' | 'standing' | 'running';
export type RunUpStep = { cell: Cell; running: boolean };
const directions = [[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]] as const;

/** Two 5-ft grid steps backwards and two forwards. Prefer straight behind,
 * then its two rear diagonals. No character IDs, camera angles or map names. */
export function planJumpRunUp(origin: Cell, landing: Cell, canStep: (from: Cell, to: Cell) => boolean): RunUpStep[] | null {
  if (origin.col === landing.col && origin.row === landing.row) return null;
  const heading = (Math.round(Math.atan2(landing.col - origin.col, origin.row - landing.row) / (Math.PI / 4)) + 8) % 8;
  for (const turn of [4,5,3]) {
    const [dx,dy] = directions[(heading + turn) % 8]!;
    const near = { col: origin.col + dx, row: origin.row + dy };
    const far = { col: origin.col + dx * 2, row: origin.row + dy * 2 };
    const cells = [near,far,near,{...origin}];
    let from = origin;
    if (!cells.every(cell => { const valid = canStep(from,cell); from = cell; return valid; })) continue;
    return cells.map((cell,i) => ({ cell, running: i >= 2 }));
  }
  return null;
}
