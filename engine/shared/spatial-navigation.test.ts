import { describe, expect, it } from 'vitest';
import { connectedSpatialCells, rasterSpatialNavigation, supportHeight } from './spatial-navigation';
import { terrainSchema, surfaceNeighbors } from './terrain';

const base = { size: [6, 6], cols: 4, rows: 4, surfaceId: 'floor', zones: [{ type: 'walkable', position: [0, 0], size: [6, 6] }], obstacles: [], supports: [] };
describe('shared physical navigation compiler', () => {
  it('supports round patios only inside their painted floor, without lifting the surrounding lawn', () => {
    const patio = { position: [0, 0], size: [6, 6], radius: 3, height: .162 };
    expect(supportHeight([patio], 0, 2.5)).toBe(.162);
    expect(supportHeight([patio], 2.5, 2.5)).toBe(0);
  });
  it('blocks a thin wall between two free centers and shares its effect geometry', () => {
    const data = rasterSpatialNavigation({ ...base, obstacles: [{ position: [0,0], size: [.1,6], effects: true }] });
    expect(data.walkable).toHaveLength(16);
    expect(data.effectWalls).toHaveLength(1);
    expect(surfaceNeighbors(data.terrain, { surfaceId: 'floor', cell: { col: 1, row: 1 } })).not.toContainEqual({ surfaceId: 'floor', cell: { col: 2, row: 1 } });
    expect(connectedSpatialCells(data.terrain, { col: 1, row: 1 })).toHaveLength(8);
    expect(terrainSchema.safeParse(data.terrain).success).toBe(true);
  });
  it('keeps water blocked, lets a bridge cross it, and charges difficult terrain', () => {
    const data = rasterSpatialNavigation({ ...base, zones: [...base.zones,
      { type: 'water', position: [0,0], size: [3,6] }, { type: 'bridge', position: [0,.75], size: [6,1] },
      { type: 'difficult', position: [-2.25,-2.25], size: [1,1] }] });
    expect(data.walkable).not.toContainEqual({ col: 1, row: 1 });
    expect(data.walkable).toContainEqual({ col: 1, row: 2 });
    expect(data.terrain.surfaces[0]!.tiles.find(tile => tile.cell.col === 0 && tile.cell.row === 0)?.movementCost).toBe(2);
  });
  it('matches ascending and descending physical steps without connecting a cliff', () => {
    const stair = { position: [0,0], size: [3,3], height: .9, baseHeight: .2, steps: 3, kind: 'stair' as const };
    expect(supportHeight([{ ...stair, ascending: 'north' }], 0, -1.4)).toBeCloseTo(1.1);
    expect(supportHeight([{ ...stair, ascending: 'south' }], 0, -1.4)).toBeCloseTo(.5);
    const cliff = rasterSpatialNavigation({ ...base, supports: [{ position: [-1.5,0], size: [3,6], height: 3 }] });
    // There is no explicit staircase across an arbitrary floor cliff.
    expect(connectedSpatialCells(cliff.terrain, { col: 0, row: 0 }).length).toBeLessThan(16);
  });
});
