import { describe, expect, it } from 'vitest';
import { bridgeFixture } from './terrain-fixture';
import { surfaceHeight, surfaceNeighbors, terrainSchema, terrainTile } from './terrain';

describe('Alpha 0.3.1 terrain foundation', () => {
  it('distinguishes bridge and ground at the same logical D&D cell', () => {
    const cell = { col: 3, row: 1 };
    expect(surfaceHeight(bridgeFixture, { surfaceId: 'ground', cell })).toBe(0);
    expect(surfaceHeight(bridgeFixture, { surfaceId: 'bridge', cell })).toBe(2.5);
    expect(terrainTile(bridgeFixture, { surfaceId: 'bridge', cell })?.kind).toBe('bridge');
    expect(surfaceNeighbors(bridgeFixture, { surfaceId: 'ground', cell })).not.toContainEqual({ surfaceId: 'bridge', cell });
  });
  it('projects grid samples over the two ramp tiles and uses an explicit climb transition', () => {
    expect(surfaceHeight(bridgeFixture, { surfaceId: 'bridge', cell: { col: 1, row: 1 } }, 0, 0.5)).toBe(0);
    expect(surfaceHeight(bridgeFixture, { surfaceId: 'bridge', cell: { col: 1, row: 1 } }, 1, 0.5)).toBe(1.25);
    expect(surfaceHeight(bridgeFixture, { surfaceId: 'bridge', cell: { col: 2, row: 1 } }, 1, 0.5)).toBe(2.5);
    expect(surfaceNeighbors(bridgeFixture, { surfaceId: 'ground', cell: { col: 0, row: 1 } })).toContainEqual({ surfaceId: 'bridge', cell: { col: 1, row: 1 } });
  });
  it('rejects duplicate surface cells and transitions to an absent platform', () => {
    const duplicate = structuredClone(bridgeFixture);
    duplicate.surfaces[1]!.tiles.push(structuredClone(duplicate.surfaces[1]!.tiles[0]!));
    expect(terrainSchema.safeParse(duplicate).success).toBe(false);
    const absent = structuredClone(bridgeFixture);
    absent.transitions[0]!.to.surfaceId = 'missing';
    expect(terrainSchema.safeParse(absent).success).toBe(false);
    const cliff = structuredClone(bridgeFixture);
    cliff.surfaces[0]!.tiles.find(x => x.cell.col === 4 && x.cell.row === 1)!.corners = [2, 2, 2, 2];
    expect(surfaceNeighbors(cliff, { surfaceId: 'ground', cell: { col: 3, row: 1 } })).not.toContainEqual({ surfaceId: 'ground', cell: { col: 4, row: 1 } });
  });
});
