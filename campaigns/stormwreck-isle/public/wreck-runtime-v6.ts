import type { Cell, PropDefinition, PublicSceneDefinition } from '../../../engine/shared/campaign.js';
import type { PortDefinition } from '../../../engine/server/campaign.js';
import type { TerrainDefinition } from '../../../engine/shared/terrain.js';

const CELL = 1.5, LENGTH = 66, HALF_BEAM = 11.25, HULL_COLS = 44, HULL_ROWS = 20;
// Leave 9 m of real, walkable water around the whole wreck. The authored
// ship coordinates stay local to the historic 44 × 20 footprint and are
// shifted together at the scene boundary below.
export const WRECK_SEA_MARGIN_CELLS = 6;
const COLS = HULL_COLS + WRECK_SEA_MARGIN_CELLS * 2;
const ROWS = HULL_ROWS + WRECK_SEA_MARGIN_CELLS * 2;
const UPPER_DECK_HEIGHT = 3;
const range = (first: number, last: number) => Array.from({ length: Math.max(0, last - first + 1) }, (_, index) => first + index);
const rectangle = (firstCol: number, lastCol: number, firstRow: number, lastRow: number): Cell[] =>
  range(firstRow, lastRow).flatMap(row => range(firstCol, lastCol).map(col => ({ col, row })));
const unique = (cells: Cell[]) => [...new Map(cells.map(cell => [cell.col + ',' + cell.row, cell])).values()];
const cellAtMetersLocal = (x: number, z: number): Cell => ({
  col: Math.max(0, Math.min(HULL_COLS - 1, Math.floor((x + LENGTH / 2) / CELL))),
  row: Math.max(0, Math.min(HULL_ROWS - 1, Math.floor((z + HALF_BEAM) / CELL)))
});
const shiftCell = (cell: Cell): Cell => ({
  col: cell.col + WRECK_SEA_MARGIN_CELLS,
  row: cell.row + WRECK_SEA_MARGIN_CELLS
});
/** Translate an authored cell from the historic ship-local 44 × 20 grid. */
export const wreckCellFromLocal = (col: number, row: number): Cell => shiftCell({ col, row });
/** Convert ship-relative meters into the expanded, public map grid. */
export const wreckCellAtMeters = (x: number, z: number): Cell => shiftCell(cellAtMetersLocal(x, z));
export const wreckRowboatCell = wreckCellAtMeters(3.75, 12);
const metersAtCell = (cell: Cell) => ({ x: -LENGTH / 2 + (cell.col + .5) * CELL, z: -HALF_BEAM + (cell.row + .5) * CELL });
const outline = [[-33, 7], [-31, 9.1], [-27, 10.8], [-18, 11.2], [18, 11.2], [25, 10.7], [29, 8.6], [31, 6.6], [33, .5]] as const;
function beamAt(x: number) {
  if (x <= outline[0]![0]) return outline[0]![1];
  for (let index = 0; index < outline.length - 1; index++) {
    const a = outline[index]!, b = outline[index + 1]!;
    if (x <= b[0]) {
      let t = Math.max(0, Math.min(1, (x - a[0]) / (b[0] - a[0]))); t = t * t * (3 - 2 * t);
      return a[1] + (b[1] - a[1]) * t;
    }
  }
  return outline[outline.length - 1]![1];
}
const insideHull = (x: number, z: number, inset = 0) => x >= -33 && x <= 33 && Math.abs(z) <= beamAt(x) - inset;
const hullCells = rectangle(0, HULL_COLS - 1, 0, 14).filter(cell => {
  const point = metersAtCell(cell);
  return insideHull(point.x, point.z) && !(point.x < -31.5 && Math.abs(point.z) < 2.25);
});
const shaftCells = hullCells.filter(cell => { const p = metersAtCell(cell); return Math.abs(p.x + 10.5) < 1.5 && Math.abs(p.z + 4.5) < 1.5; });
const crowRing = rectangle(0, HULL_COLS - 1, 0, 14).filter(cell => {
  const p = metersAtCell(cell), radius = Math.hypot(p.x, p.z);
  return radius >= 1.2 && radius <= 2.8;
});
const c2Cells = hullCells.filter(cell => cell.col >= 34), c3Cells = hullCells.filter(cell => cell.col <= 9);
const lower = hullCells.filter(cell => { const p = metersAtCell(cell); return p.x >= -31.5 && p.x <= 29 && insideHull(p.x, p.z, 1.65); });
const hold = hullCells.filter(cell => { const p = metersAtCell(cell); return p.x >= -32.5 && p.x <= 29 && insideHull(p.x, p.z, 2.1); });
// The new margin surrounds the full hull; the reef cells below carve readable
// channels through that water while keeping the stern breach reachable.
const hullCellKeys = new Set(hullCells.map(cell => `${cell.col},${cell.row}`));
const seaBounds = rectangle(-WRECK_SEA_MARGIN_CELLS, HULL_COLS + WRECK_SEA_MARGIN_CELLS - 1,
  -WRECK_SEA_MARGIN_CELLS, HULL_ROWS + WRECK_SEA_MARGIN_CELLS - 1)
  .filter(cell => !hullCellKeys.has(`${cell.col},${cell.row}`));
const reefObstacleGroups = [
  { id: 'reef-north-west', cells: rectangle(7, 9, -5, -4) },
  { id: 'reef-north-east', cells: rectangle(35, 37, -5, -5) },
  { id: 'reef-west-upper', cells: rectangle(-5, -4, 2, 4) },
  { id: 'dragon-bone-stern', cells: rectangle(-5, -5, 7, 9) },
  { id: 'reef-east', cells: rectangle(46, 47, 7, 9) },
  { id: 'reef-south-west', cells: rectangle(8, 10, 22, 23) },
  { id: 'wreckage-south', cells: rectangle(25, 26, 24, 24) },
  { id: 'reef-south-east', cells: rectangle(36, 38, 21, 22) }
];
const seaCellKeys = new Set(seaBounds.map(cell => `${cell.col},${cell.row}`));
const claimedObstacleCells = new Set<string>();
const seaObstacles = reefObstacleGroups.flatMap(group => group.cells
  .filter(cell => seaCellKeys.has(`${cell.col},${cell.row}`) && !claimedObstacleCells.has(`${cell.col},${cell.row}`))
  .map(cell => {
    claimedObstacleCells.add(`${cell.col},${cell.row}`);
    return { surfaceId: 'sea', cell, obstacleId: group.id };
  }));
const blockedSeaCellKeys = new Set(seaObstacles.map(obstacle => `${obstacle.cell.col},${obstacle.cell.row}`));
const outerSea = seaBounds.filter(cell => !blockedSeaCellKeys.has(`${cell.col},${cell.row}`));
const grid = { cols: COLS, rows: ROWS, tileSize: 64, originX: 0, originY: 0, width: COLS * 64, height: ROWS * 64 };

function makeSurface(id: string, cells: Cell[], height: number, materialId: string, movementCost = 1,
  medium: 'solid' | 'water' = 'solid', visualOnly = false): TerrainDefinition['surfaces'][number] {
  return { id, ...(visualOnly ? { visualOnly: true } : {}), tiles: unique(cells).map(cell => ({
    cell, kind: 'floor' as const, corners: [height, height, height, height] as [number, number, number, number],
    materialId, movementCost: movementCost as 1 | 2, medium
  })) };
}
function makeTerrain(baseSurfaceId: string, surfaces: TerrainDefinition['surfaces'], options: Pick<TerrainDefinition, 'occluders' | 'lights' | 'ambience' | 'structures'>
  & Partial<Pick<TerrainDefinition, 'transitions' | 'hullOpenings' | 'railGaps' | 'obstacles'>>): TerrainDefinition {
  return { tileMeters: CELL, cols: COLS, rows: ROWS, baseSurfaceId, surfaces, transitions: [], ...options };
}
type Stair = NonNullable<TerrainDefinition['structures']>[number] & { kind: 'stair' };
const rampCells = (stair: Stair): Cell[] => {
  const horizontal = stair.direction === 'east' || stair.direction === 'west';
  const first = stair.direction === 'west' ? stair.cell.col - stair.runCells + 1 : stair.cell.col;
  const last = stair.direction === 'west' ? stair.cell.col : stair.cell.col + stair.runCells - 1;
  return horizontal ? range(first, last).map(col => ({ col, row: stair.cell.row }))
    : range(stair.direction === 'north' ? stair.cell.row - stair.runCells + 1 : stair.cell.row,
      stair.direction === 'north' ? stair.cell.row : stair.cell.row + stair.runCells - 1).map(row => ({ col: stair.cell.col, row }));
};
function applyStairs(deck: TerrainDefinition['surfaces'][number], stairs: Stair[]) {
  deck.tiles = deck.tiles.map(entry => {
    const match = stairs.map(stair => {
      const horizontal = stair.direction === 'east' || stair.direction === 'west';
      const step = stair.direction === 'east' ? entry.cell.col - stair.cell.col
        : stair.direction === 'west' ? stair.cell.col - entry.cell.col
          : stair.direction === 'south' ? entry.cell.row - stair.cell.row : stair.cell.row - entry.cell.row;
      return { stair, step, crossAxis: horizontal ? entry.cell.row === stair.cell.row : entry.cell.col === stair.cell.col };
    }).find(item => item.crossAxis && item.step >= 0 && item.step < item.stair.runCells);
    if (!match) return entry;
    const { stair, step } = match, base = stair.baseHeight ?? 0;
    const low = base + stair.riseMeters * step / stair.runCells, high = base + stair.riseMeters * (step + 1) / stair.runCells;
    const corners: [number, number, number, number] = stair.direction === 'east' ? [low, high, high, low]
      : stair.direction === 'west' ? [high, low, low, high]
        : stair.direction === 'south' ? [low, low, high, high] : [high, high, low, low];
    return { ...entry, kind: 'stair' as const, corners, materialId: stair.materialId };
  });
}
const stair = (id: string, cell: Cell, direction: 'east' | 'west', riseMeters: number, runCells: number, baseHeight = 0): Stair =>
  ({ id, kind: 'stair', cell, direction, riseMeters, runCells, baseHeight, steps: runCells * 4, materialId: 'stair-wood' });

const northRow = cellAtMetersLocal(0, -9.75).row, southRow = cellAtMetersLocal(0, 9.75).row;
const c3North = stair('stairs-c3-north', cellAtMetersLocal(-16.5, -9.75), 'west', UPPER_DECK_HEIGHT, 2);
const c3South = stair('stairs-c3-south', cellAtMetersLocal(-16.5, 9.75), 'west', UPPER_DECK_HEIGHT, 2);
const c2North = stair('stairs-c2-north', cellAtMetersLocal(15, -9.75), 'east', UPPER_DECK_HEIGHT, 2);
const c2South = stair('stairs-c2-south', cellAtMetersLocal(15, 9.75), 'east', UPPER_DECK_HEIGHT, 2);
const c8Down = stair('stairs-c8', cellAtMetersLocal(-1.5, 5.25), 'east', -3.2, 4);
const c9StairCell = cellAtMetersLocal(12.75, 2.25);
const c9StairTop = -3.5 + (c9StairCell.row + .5) / southRow * .3;
const c9Down = stair('stairs-c9', c9StairCell, 'east', -6.4 - c9StairTop, 4, c9StairTop);
const c1Stairs = [c3North, c3South, c2North, c2South, c8Down];
const c1MastCell = cellAtMetersLocal(0, 0), c2MastCell = cellAtMetersLocal(29.5, .5), c3MastCell = cellAtMetersLocal(-24, 2);

const sameCell = (a: Cell, b: Cell) => a.col === b.col && a.row === b.row;
const cabinDoorCells = {
  c4: { col: 18, row: 4 }, c5: { col: 18, row: 10 },
  c6: { col: 26, row: 4 }, c7: { col: 26, row: 10 }
};
const cabinVerticalWalls = [
  ...range(3, 6).flatMap(row => [{ col: 11, row }, ...(row === cabinDoorCells.c4.row ? [] : [{ col: 18, row }])]),
  ...range(8, 12).flatMap(row => [{ col: 11, row }, ...(row === cabinDoorCells.c5.row ? [] : [{ col: 18, row }])]),
  ...range(3, 6).flatMap(row => [...(row === cabinDoorCells.c6.row ? [] : [{ col: 26, row }]), { col: 33, row }]),
  ...range(8, 12).flatMap(row => [...(row === cabinDoorCells.c7.row ? [] : [{ col: 26, row }]), { col: 33, row }])
];
const cabinHorizontalWalls = unique([
  ...[2, 7].flatMap(row => range(11, 18).map(col => ({ col, row }))),
  ...[7, 13].flatMap(row => range(11, 18).map(col => ({ col, row }))),
  ...[2, 7].flatMap(row => range(26, 33).map(col => ({ col, row }))),
  ...[7, 13].flatMap(row => range(26, 33).map(col => ({ col, row })))
]);
const cabinWallCells = unique([...cabinVerticalWalls, ...cabinHorizontalWalls]);
// The strip immediately behind C3 is not part of the playable C1 passage;
// only its two stair landings remain walkable there.
const mainCells = hullCells.filter(cell => cell.col >= 11 && cell.col <= 33 && !sameCell(cell, c1MastCell)
  && !cabinWallCells.some(wall => sameCell(wall, cell)) && !shaftCells.some(hole => sameCell(hole, cell)));
const mainSurface = makeSurface('main', unique([...mainCells, ...c1Stairs.flatMap(rampCells)]), 0, 'wood');
const c2Surface = makeSurface('c2', c2Cells.filter(cell => !sameCell(cell, c2MastCell)), UPPER_DECK_HEIGHT, 'wood');
const c3Surface = makeSurface('c3', c3Cells.filter(cell => !sameCell(cell, c3MastCell)), UPPER_DECK_HEIGHT, 'wood');
const c8RampCells = rampCells(c8Down);
// The thin hull context is only a silhouette below C1. It must leave the
// descending ramp open, otherwise it visually caps the physical C8 stairs.
const mainHullContext = makeSurface('c1-hull', hullCells.filter(cell => !c8RampCells.some(ramp => sameCell(cell, ramp))), -.12, 'wood', 1, 'solid', true);
applyStairs(mainSurface, c1Stairs);
const sea = makeSurface('sea', outerSea, -2.9, 'water', 2, 'water');
const c9RampCells = rampCells(c9Down);
const lowerCells = lower.filter(cell => !shaftCells.some(hole => sameCell(hole, cell))
  && !c8RampCells.some(rampCell => sameCell(rampCell, cell)));
const lowerDeck = makeSurface('lower-deck', unique([...lowerCells, ...c9RampCells]), -3.2, 'wood', 2, 'water');
// The listed hull sits 15 cm deep on starboard (south) and 45 cm on port
// (north). Keep the whole deck difficult terrain while grading its shared
// floor/grid gently toward the shallow side.
const lowerDeckRows = [...lowerDeck.tiles.map(tile => tile.cell.row)];
const lowerNorthRow = Math.min(...lowerDeckRows), lowerSouthRow = Math.max(...lowerDeckRows);
lowerDeck.tiles = lowerDeck.tiles.map(tile => {
  const heightAtRow = (row: number) => -3.5
    + Math.max(0, Math.min(lowerSouthRow, row) - lowerNorthRow) / (lowerSouthRow - lowerNorthRow) * .3;
  const north = heightAtRow(tile.cell.row), south = heightAtRow(tile.cell.row + 1);
  return { ...tile, kind: 'ramp' as const, corners: [north, north, south, south] as [number, number, number, number] };
});
applyStairs(lowerDeck, [c9Down]);
const lowerWater = makeSurface('lower-water', hullCells.filter(cell => !lowerCells.some(deck => sameCell(deck, cell))), -3.05, 'water', 2, 'water', true);
const holdDeckCells = hold.filter(cell => !c9RampCells.some(rampCell => sameCell(rampCell, cell)));
const holdDeck = makeSurface('hold-air', holdDeckCells, -6.4, 'wood', 2, 'water');
const holdWater = makeSurface('hold-water', lower.filter(cell => !holdDeckCells.some(deck => sameCell(deck, cell))), -6.1, 'water', 2, 'water', true);
const crowSurface = makeSurface('crow', crowRing, 15, 'wood');

const surfaceLink = (fromSurfaceId: string, fromCell: Cell, toSurfaceId: string, toCell: Cell): TerrainDefinition['transitions'][number] => ({
  from: { surfaceId: fromSurfaceId, cell: fromCell }, to: { surfaceId: toSurfaceId, cell: toCell }, mode: 'stair'
});
const c2TopNorth = { col: c2North.cell.col + c2North.runCells, row: northRow }, c2TopSouth = { col: c2South.cell.col + c2South.runCells, row: southRow };
const c3TopNorth = { col: c3North.cell.col - c3North.runCells, row: northRow }, c3TopSouth = { col: c3South.cell.col - c3South.runCells, row: southRow };
const c8Low = { col: c8Down.cell.col + c8Down.runCells - 1, row: c8Down.cell.row };
const c9Low = { col: c9Down.cell.col + c9Down.runCells - 1, row: c9Down.cell.row };
const ladderCell = cellAtMetersLocal(1.5, 0);
const sternBreachCell = cellAtMetersLocal(-30.75, 0);
const boardingCell = { col: 23, row: southRow };
const rowboatLocalCell = cellAtMetersLocal(3.75, 12);
const terrainTransitions: TerrainDefinition['transitions'] = [
  surfaceLink('main', { col: c2North.cell.col + c2North.runCells - 1, row: northRow }, 'c2', c2TopNorth),
  surfaceLink('main', { col: c2South.cell.col + c2South.runCells - 1, row: southRow }, 'c2', c2TopSouth),
  surfaceLink('main', { col: c3North.cell.col - c3North.runCells + 1, row: northRow }, 'c3', c3TopNorth),
  surfaceLink('main', { col: c3South.cell.col - c3South.runCells + 1, row: southRow }, 'c3', c3TopSouth),
  surfaceLink('main', c8Low, 'lower-deck', { col: c8Low.col + 1, row: c8Low.row }),
  surfaceLink('lower-deck', c9Low, 'hold-air', { col: c9Low.col + 1, row: c9Low.row })
];

const cabinOccluders = [
  ...cabinVerticalWalls.map((cell, index) => ({ id: `cabin-room-vertical-${index}`, cell, bottom: 0, top: 2.4, kind: 'wall' as const, materialId: 'wall-wood', axis: 'z' as const })),
  ...cabinHorizontalWalls.map((cell, index) => ({ id: `cabin-room-horizontal-${index}`, cell, bottom: 0, top: 2.4, kind: 'wall' as const, materialId: 'wall-wood', axis: 'x' as const }))
];
const mainOccluders = [
  { id: 'c1-mast', cell: c1MastCell, bottom: 0, top: 18, kind: 'pillar' as const, materialId: 'wood' },
  ...cabinOccluders,
  { id: 'c2-mast', cell: c2MastCell, bottom: UPPER_DECK_HEIGHT, top: 6.2, kind: 'pillar' as const, materialId: 'wood' },
  { id: 'c3-mast', cell: c3MastCell, bottom: UPPER_DECK_HEIGHT, top: 4.8, kind: 'pillar' as const, materialId: 'wood' }
];
const mainStructures = [...c1Stairs,
  { id: 'c1-hatch', kind: 'hatch' as const, cell: cellAtMetersLocal(-4.5, -6.75), height: 0, materialId: 'hatch' },
  { id: 'c4-shaft', kind: 'hatch' as const, cell: shaftCells[0]!, height: 0, materialId: 'hatch' }, c9Down
];
const mainTerrain = makeTerrain('main', [mainSurface, mainHullContext, c2Surface, c3Surface, crowSurface, sea,
  lowerDeck, lowerWater, holdDeck, holdWater], {
  obstacles: seaObstacles,
  occluders: [...mainOccluders,
    { id: 'crow-mast', cell: c1MastCell, bottom: 12, top: 23, kind: 'pillar' as const, materialId: 'wood' },
    { id: 'lower-ribs', cell: cellAtMetersLocal(0, 0), bottom: -3.2, top: -.2, kind: 'arch' as const, materialId: 'wood' },
    { id: 'hold-ribs', cell: cellAtMetersLocal(0, 0), bottom: -6.4, top: -3.2, kind: 'arch' as const, materialId: 'wood' }],
  structures: mainStructures, transitions: terrainTransitions,
  hullOpenings: [{ id: 'c9-stern-breach', surfaceId: 'c1-hull', cell: sternBreachCell, edge: 'west', bottom: -5.4, top: -3.2 }],
  railGaps: [
    { surfaceId: 'c1-hull', cell: boardingCell, edge: 'south' },
    { surfaceId: 'c2', cell: c2TopNorth, edge: 'west' }, { surfaceId: 'c2', cell: c2TopSouth, edge: 'west' },
    { surfaceId: 'c3', cell: c3TopNorth, edge: 'east' }, { surfaceId: 'c3', cell: c3TopSouth, edge: 'east' }
  ],
  lights: [
    { id: 'main-daylight', cell: cellAtMetersLocal(0, 0), height: 9, color: '#b9dced', intensity: 1.4, radiusMeters: 24 },
    // Cold, weak bounce stays close to the lower surfaces and does not
    // illuminate the upper deck or imply that the collectible torches are lit.
    { id: 'c8-water-glimmer', cell: cellAtMetersLocal(-1.5, 3), height: -2.45, color: '#78b9c3', intensity: 0.42, radiusMeters: 2.05 },
    { id: 'c9-depth-glimmer', cell: cellAtMetersLocal(-10.5, -4.5), height: -5.9, color: '#477e9c', intensity: 0.2, radiusMeters: 1.8 }
  ],
  ambience: [{ id: 'main-waves', kind: 'waves', density: .35 }, { id: 'main-wind', kind: 'leaves', density: .1 },
    { id: 'upper-rain', kind: 'rain', density: .15 }, { id: 'lower-mist', kind: 'mist', density: .24 },
    { id: 'hold-mist', kind: 'mist', density: .5 }]
});

const door = (id: string, label: string, cell: Cell, sourceRef: string): PropDefinition => ({
  id, kind: 'door', label, assetId: 'practice-door', cell, rotation: 0, initialState: 'closed',
  baseFootprint: [{ col: 0, row: 0 }], allowedRotations: [0],
  capabilities: { transform: false, detach: false, structure: true }, sourceKind: 'adaptation', sourceRef
});
const crate = (id: string, label: string, cell: Cell, sourceRef: string): PropDefinition => ({
  id, kind: 'crate', label, assetId: 'practice-crate', cell, rotation: 0,
  baseFootprint: [{ col: 0, row: 0 }, { col: 1, row: 0 }], allowedRotations: [0, 90],
  capabilities: { transform: true, detach: false, structure: true }, sourceKind: 'adaptation', sourceRef
});
const fixture = (id: string, label: string, cell: Cell, surfaceId: string, width: number, depth: number, sourceRef: string): PropDefinition => ({
  id, kind: 'crate', label, assetId: 'practice-crate', cell, surfaceId, rotation: 0,
  baseFootprint: rectangle(0, width - 1, 0, depth - 1), allowedRotations: [0],
  capabilities: { transform: true, detach: false, structure: true }, sourceKind: 'adaptation', sourceRef
});
const shiftTerrain = (terrain: TerrainDefinition): TerrainDefinition => ({
  ...terrain,
  surfaces: terrain.surfaces.map(surface => ({
    ...surface, tiles: surface.tiles.map(tile => ({ ...tile, cell: shiftCell(tile.cell) }))
  })),
  transitions: terrain.transitions.map(link => ({
    ...link,
    from: { ...link.from, cell: shiftCell(link.from.cell) },
    to: { ...link.to, cell: shiftCell(link.to.cell) }
  })),
  ...(terrain.obstacles ? { obstacles: terrain.obstacles.map(obstacle => ({ ...obstacle, cell: shiftCell(obstacle.cell) })) } : {}),
  ...(terrain.hullOpenings ? { hullOpenings: terrain.hullOpenings.map(opening => ({ ...opening, cell: shiftCell(opening.cell) })) } : {}),
  ...(terrain.railGaps ? { railGaps: terrain.railGaps.map(gap => ({ ...gap, cell: shiftCell(gap.cell) })) } : {}),
  occluders: terrain.occluders.map(item => ({ ...item, cell: shiftCell(item.cell) })),
  structures: terrain.structures?.map(item => ({ ...item, cell: shiftCell(item.cell) })),
  lights: terrain.lights.map(item => ({ ...item, cell: shiftCell(item.cell) }))
});
const shiftProp = (prop: PropDefinition): PropDefinition => {
  const mount = 'mount' in prop ? prop.mount : undefined;
  return { ...prop, cell: shiftCell(prop.cell), ...(mount ? { mount: { ...mount, cell: shiftCell(mount.cell) } } : {}) };
};
const scene = (id: string, title: string, surfaceId: string, background: string, terrainDefinition: TerrainDefinition,
  spawns: Cell[], props: PropDefinition[] = [], darkness = 0, manualReveal = false): PublicSceneDefinition => {
  const publicTerrain = shiftTerrain(terrainDefinition);
  const publicProps = props.map(shiftProp);
  const pickups: NonNullable<PublicSceneDefinition['pickups']> = id === 'wreck-ship' ? [
    { id: 'torch-c1-a', label: 'Antorcha apagada · C1', cell: cellAtMetersLocal(3, -1.5), surfaceId: 'main', item: 'Antorcha', kind: 'unlit-torch' },
    { id: 'torch-c4', label: 'Antorcha apagada · C4', cell: { col: 14, row: 3 }, surfaceId: 'main', item: 'Antorcha', kind: 'unlit-torch', unlockObjectId: 'c4-barred-door' },
    { id: 'torch-c7', label: 'Antorcha apagada · C7', cell: cellAtMetersLocal(12, 4.5), surfaceId: 'main', item: 'Antorcha', kind: 'unlit-torch' },
    { id: 'torch-c2', label: 'Antorcha apagada · C2', cell: cellAtMetersLocal(24, -1.5), surfaceId: 'c2', item: 'Antorcha', kind: 'unlit-torch' },
    { id: 'crow-bracelet', label: 'Pulsera de oro · 25 po', cell: { col: 22, row: 6 }, surfaceId: 'crow', item: 'Pulsera de oro (25 po)', kind: 'treasure' },
    { id: 'crow-earring', label: 'Pendiente de oro · 25 po', cell: { col: 22, row: 8 }, surfaceId: 'crow', item: 'Pendiente de oro (25 po)', kind: 'treasure' },
    { id: 'crow-tiger-eye-1', label: 'Ojo de tigre · 10 po', cell: { col: 23, row: 8 }, surfaceId: 'crow', item: 'Gema ojo de tigre (10 po)', kind: 'treasure' },
    { id: 'crow-tiger-eye-2', label: 'Ojo de tigre · 10 po', cell: { col: 21, row: 6 }, surfaceId: 'crow', item: 'Gema ojo de tigre (10 po)', kind: 'treasure' },
    { id: 'crow-heliotrope', label: 'Heliotropo · 50 po', cell: { col: 21, row: 8 }, surfaceId: 'crow', item: 'Heliotropo (50 po)', kind: 'treasure' },
    { id: 'c4-gold', label: 'Bolsa con 50 po · C4', cell: { col: 15, row: 5 }, surfaceId: 'main', item: '50 po', kind: 'treasure', unlockObjectId: 'c4-barred-door' },
    { id: 'c4-cartographer-tools', label: 'Herramientas de cartógrafo · C4', cell: { col: 14, row: 5 }, surfaceId: 'main', item: 'Herramientas de cartógrafo', kind: 'treasure', unlockObjectId: 'c4-barred-door' },
    { id: 'c4-dagger', label: 'Daga · C4', cell: { col: 17, row: 5 }, surfaceId: 'main', item: 'Daga', kind: 'treasure', unlockObjectId: 'c4-barred-door' },
    { id: 'c4-compass', label: 'Brújula · 25 po · C4', cell: { col: 15, row: 3 }, surfaceId: 'main', item: 'Brújula (25 po)', kind: 'treasure', unlockObjectId: 'c4-barred-door' }
  ] : [];
  return {
    id, title, surfaceId, movementEnabled: true, background, grid,
    walkable: unique(publicTerrain.surfaces.filter(item => !item.visualOnly).flatMap(item => item.tiles.map(tile => tile.cell))),
    spawns: spawns.map(shiftCell), props: publicProps, waves: id === 'wreck-ship', renderer: 'babylon-hd2d', access: 'authorized', terrain: publicTerrain,
    stageActors: id === 'wreck-ship' ? [{ id: 'wreck-rowboat', label: 'Barca de la expedición', tokenId: 'wreck-rowboat', cell: wreckRowboatCell, surfaceId: 'sea' }] : undefined,
    pickups: pickups.map(pickup => ({ ...pickup, cell: shiftCell(pickup.cell) })),
    visibility: { darkness, manualReveal }
  };
};

const mainSpawns = [cellAtMetersLocal(3, -1.5), cellAtMetersLocal(3, 1.5), cellAtMetersLocal(-1.5, 0)];
const allShipProps: PropDefinition[] = [
  { id: 'wheel', kind: 'wheel', label: 'Timón del pecio', assetId: 'wheel-v3', cell: cellAtMetersLocal(-27, 0), surfaceId: 'c3', rotation: 0,
    baseFootprint: [{ col: 0, row: 0 }], allowedRotations: [0, 90, 180, 270], initialState: 'upright',
    capabilities: { transform: true, detach: true, structure: true }, mount: { cell: cellAtMetersLocal(-27, 0), footprint: [{ col: 0, row: 0 }], assetId: 'wheel-mount-v3' },
    sourceKind: 'adaptation', sourceRef: 'Stormwreck Isle, cubierta C3' },
  { ...crate('c2-flotsam', 'Restos del palo de C2', cellAtMetersLocal(25.5, 6), 'Stormwreck Isle, C2'), surfaceId: 'c2' },
  fixture('c2-ballista-blockout', 'Balista oxidada de C2', cellAtMetersLocal(21, -3), 'c2', 3, 2, 'Stormwreck Isle, C2'),
  fixture('c2-bowsprit-blockout', 'Bauprés roto de C2', cellAtMetersLocal(30.75, 0), 'c2', 1, 1, 'Stormwreck Isle, C2'),
  door('c4-barred-door', 'Puerta atrancada de C4', cabinDoorCells.c4, 'Stormwreck Isle, C4'),
  door('c5-door', 'Puerta de C5', cabinDoorCells.c5, 'Stormwreck Isle, C5'),
  door('c6-door', 'Puerta de C6', cabinDoorCells.c6, 'Stormwreck Isle, C6'),
  door('c7-door', 'Puerta de C7', cabinDoorCells.c7, 'Stormwreck Isle, C7'),
  fixture('c4-bookshelf-blockout', 'Estantería de C4', cellAtMetersLocal(-15, -6), 'main', 1, 1, 'Stormwreck Isle, C4'),
  fixture('c4-desk-blockout', 'Escritorio y brújula de C4', cellAtMetersLocal(-15, -4.5), 'main', 2, 1, 'Stormwreck Isle, C4'),
  fixture('c4-bed-blockout', 'Cama de C4', cellAtMetersLocal(-9, -1.5), 'main', 2, 1, 'Stormwreck Isle, C4'),
  fixture('c5-counter-blockout', 'Encimera de cocina de C5', cellAtMetersLocal(-15, 3), 'main', 3, 1, 'Stormwreck Isle, C5'),
  fixture('c5-skeleton-blockout', 'Esqueleto sin cabeza de C5', cellAtMetersLocal(-7.5, 3), 'main', 1, 1, 'Stormwreck Isle, C5'),
  ...[
    ['c6-bunk-01', 27, 3], ['c6-bunk-02', 29, 3], ['c6-bunk-03', 31, 3],
    ['c6-bunk-04', 27, 6], ['c6-bunk-05', 29, 6], ['c6-bunk-06', 31, 6]
  ].map(([id, col, row], index) => fixture(String(id), `Litera ${index + 1} de C6`, { col: Number(col), row: Number(row) }, 'main', 1, 1, 'Stormwreck Isle, C6')),
  fixture('c7-table-blockout', 'Mesa del comedor de C7', cellAtMetersLocal(10.5, 4.5), 'main', 2, 1, 'Stormwreck Isle, C7'),
  ...[
    ['c7-chair-01', 28, 9], ['c7-chair-02', 32, 9], ['c7-chair-03', 28, 11], ['c7-chair-04', 32, 11]
  ].map(([id, col, row], index) => fixture(String(id), `Silla ${index + 1} de C7`, { col: Number(col), row: Number(row) }, 'main', 1, 1, 'Stormwreck Isle, C7')),
  crate('c6-trapped-stash', 'Tablón del alijo de C6', cellAtMetersLocal(12, -4.5), 'Stormwreck Isle, C6'),
  ...[
    ['c8-container-01', 'Contenedor de C8 · 1', -20, -6],
    ['c8-container-02', 'Contenedor de C8 · 2', -16, 5],
    ['c8-container-03', 'Contenedor de C8 · 3', 21, 4]
  ].map(([id, label, x, z]) => ({ ...crate(String(id), String(label), cellAtMetersLocal(Number(x), Number(z)), 'Stormwreck Isle, C8'), surfaceId: 'lower-deck' })),
  ...[
    ['c8-barrel-01', -26, -7.5], ['c8-barrel-02', -23, 7.5], ['c8-barrel-03', 0, -7.5], ['c8-barrel-04', 25.5, -4.5]
  ].map(([id, x, z], index) => fixture(String(id), `Barril podrido ${index + 1} de C8`, cellAtMetersLocal(Number(x), Number(z)), 'lower-deck', 1, 1, 'Stormwreck Isle, C8')),
  { ...crate('c9-iron-chest', 'Cofre de hierro de C9 · bajo la brecha de C4/C8', cellAtMetersLocal(-10.5, -4.5), 'Stormwreck Isle, C9'), surfaceId: 'hold-air' },
  fixture('c9-debris-01', 'Escombros de carga de C9', cellAtMetersLocal(-24, -4.5), 'hold-air', 1, 1, 'Stormwreck Isle, C9'),
  fixture('c9-debris-02', 'Carga rota de C9', cellAtMetersLocal(22.5, 3), 'hold-air', 1, 1, 'Stormwreck Isle, C9')
];
export const wreckRuntimeScenes: PublicSceneDefinition[] = [
  scene('wreck-ship', 'Rosa de los Vientos · barco explorable C1–C9 y cofa', 'main', '/art/m26/wreck-main-m26.png', mainTerrain, mainSpawns, allShipProps)
];

const address = (mapId: string, zoneId: string, surfaceId: string, cell: Cell) => ({ mapId, zoneId, surfaceId, cell });
const shaftApproach = cellAtMetersLocal(-13.5, -4.5);
const localWreckPorts: PortDefinition[] = [
  // Board at the outer rail, not at the mast-ladder cell: both connections
  // share a scene now, so overlapping portal landings would chain by mistake.
  { id: 'P01', from: address('wreck-ship', 'exterior', 'sea', { col: rowboatLocalCell.col - 1, row: rowboatLocalCell.row }), to: address('wreck-ship', 'c1', 'main', { col: rowboatLocalCell.col - 1, row: rowboatLocalCell.row - 1 }), mode: 'rigging', return: 'explicit', autoDirection: 'forward' },
  { id: 'P10', from: address('wreck-ship', 'c1', 'main', ladderCell), to: address('wreck-ship', 'c1-crow', 'crow', ladderCell), mode: 'rope-ladder', return: 'explicit' },
  { id: 'P12', from: address('wreck-ship', 'c1', 'main', cellAtMetersLocal(-4.5, -6.75)), to: address('wreck-ship', 'c8', 'lower-deck', cellAtMetersLocal(-4.5, -6.75)), mode: 'hatch', return: 'adjudicated' },
  { id: 'P13', from: address('wreck-ship', 'c4', 'main', shaftApproach), to: address('wreck-ship', 'c8', 'lower-deck', shaftApproach), mode: 'hole', return: 'adjudicated' },
  { id: 'P14', from: address('wreck-ship', 'c8', 'lower-deck', shaftApproach), to: address('wreck-ship', 'c9', 'hold-air', shaftApproach), mode: 'hole', return: 'adjudicated' },
  { id: 'P16', from: address('wreck-ship', 'exterior', 'sea', { col: sternBreachCell.col - 1, row: sternBreachCell.row }), to: address('wreck-ship', 'c9', 'hold-air', sternBreachCell), mode: 'swim', return: 'explicit', autoDirection: 'forward' }
];
export const wreckPorts: PortDefinition[] = localWreckPorts.map(port => ({
  ...port,
  from: { ...port.from, cell: shiftCell(port.from.cell) },
  to: { ...port.to, cell: shiftCell(port.to.cell) }
}));
