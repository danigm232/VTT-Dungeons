import type { Cell, Facing, PublicProp } from '../shared/protocol.js';
import type { SceneDefinition } from './campaign.js';
import { cellKey, footprintFor as rotatedFootprint, sameCell } from '../shared/geometry.js';

export const isWalkable = (scene: SceneDefinition, cell: Cell, props: readonly PublicProp[] = []) =>
  scene.terrainWalkable.has(cellKey(cell)) && !props.some(prop => {
    const blocks = prop.structure !== 'destroyed' && (prop.kind === 'wheel' ? prop.attachment === 'detached' : prop.kind === 'door' ? prop.state !== 'open' : true);
    return blocks && footprintFor(prop).some(blocked => sameCell(blocked, cell));
  });

export function footprintFor(prop: { cell: Cell; rotation?: 0 | 90 | 180 | 270; footprint?: readonly Cell[]; baseFootprint?: readonly Cell[] }) {
  const base = prop.footprint?.length ? prop.footprint : prop.baseFootprint ?? [{ col: 0, row: 0 }];
  return rotatedFootprint(prop.cell, prop.rotation ?? 0, base);
}

export function directionFromVector(x: number, z: number): Facing | null {
  if (Math.hypot(x, z) < 0.2) return null;
  const horizontal = x > 0.25 ? 'east' : x < -0.25 ? 'west' : null;
  const vertical = z > 0.25 ? 'south' : z < -0.25 ? 'north' : null;
  if (horizontal && vertical) return `${vertical}-${horizontal}` as Facing;
  return horizontal ?? vertical;
}

export function adjacentCell(cell: Cell, facing: Facing): Cell {
  const delta: Record<Facing, Cell> = {
    north: { col: 0, row: -1 }, 'north-east': { col: 1, row: -1 }, east: { col: 1, row: 0 }, 'south-east': { col: 1, row: 1 },
    south: { col: 0, row: 1 }, 'south-west': { col: -1, row: 1 }, west: { col: -1, row: 0 }, 'north-west': { col: -1, row: -1 }
  };
  return { col: cell.col + delta[facing].col, row: cell.row + delta[facing].row };
}

export function resolveStep(scene: SceneDefinition, current: Cell, facing: Facing, props: readonly PublicProp[] = []): Cell | null {
  if (!scene.movementEnabled) return null;
  const next = adjacentCell(current, facing);
  const blockedByTerrain = scene.terrain?.blockedEdges?.some(edge =>
    edge.surfaceId === scene.surfaceId
    && ((sameCell(edge.from, current) && sameCell(edge.to, next)) || (sameCell(edge.from, next) && sameCell(edge.to, current))));
  if (blockedByTerrain) return null;
  return isWalkable(scene, next, props) ? next : null;
}
