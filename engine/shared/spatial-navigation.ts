import type { Cell } from './campaign.js';
import { surfaceNeighbors, type TerrainDefinition } from './terrain.js';
import { cellKey, segmentCrossesBox } from './geometry.js';

export type SpatialBox = { position: number[]; size: number[]; effects?: boolean; id?: string; outline?: number[][] };
export type SpatialZone = SpatialBox & { type: string; blocking?: boolean };
export type SupportRegion = SpatialBox & { height: number; radius?: number; baseHeight?: number; steps?: number; ascending?: 'north' | 'south'; kind?: 'floor' | 'bridge' | 'stair' };
export const containsSpatialPoint = (box: SpatialBox, x: number, z: number, radius = 0) => {
  const px=x-box.position[0]!,pz=z-box.position[1]!;
  if(!box.outline)return Math.abs(px)<=box.size[0]!/2+radius&&Math.abs(pz)<=box.size[1]!/2+radius;
  let inside=false;
  for(let i=0,j=box.outline.length-1;i<box.outline.length;j=i++){
    const a=box.outline[i]!,b=box.outline[j]!;
    if((a[1]!>pz)!==(b[1]!>pz)&&px<(b[0]!-a[0]!)*(pz-a[1]!)/(b[1]!-a[1]!)+a[0]!)inside=!inside;
  }
  return inside;
};

export function supportHeight(regions: SupportRegion[], x: number, z: number) {
  let height = 0;
  for (const region of regions) if (containsSpatialPoint(region, x, z)
    && (region.radius === undefined || Math.hypot(x - region.position[0]!, z - region.position[1]!) <= region.radius)) {
    if (region.kind !== 'stair') height = Math.max(height, region.height);
    else {
      const t = Math.max(0, Math.min(1, (z - region.position[1]! + region.size[1]! / 2) / region.size[1]!));
      const progress = region.ascending === 'south' ? t : 1 - t;
      height = Math.max(height, (region.baseHeight ?? 0) + region.height * Math.max(1, Math.ceil(progress * (region.steps ?? 1))) / (region.steps ?? 1));
    }
  }
  return height;
}

/** The same authored boxes feed movement edges, effect rays and preview collision.
 * Overhead roofs/awnings never become floor obstacles by mesh-name inference. */
export function rasterSpatialNavigation(options: { size: number[]; cols: number; rows: number; worldOrigin?: {x:number;z:number}; surfaceId: string; zones: SpatialZone[]; obstacles: SpatialBox[]; bounds?: number[]; supports: SupportRegion[] }) {
  const { size, cols, rows, surfaceId, zones, obstacles, bounds, supports } = options;
  const tileMeters = size[0]! / cols;
  const origin=options.worldOrigin??{x:-size[0]!/2,z:-size[1]!/2};
  const point = (col: number, row: number) => ({ x: origin.x + (col + .5) * tileMeters, z: origin.z + (row + .5) * size[1]! / rows });
  const boxes = obstacles.map((box, i) => ({ ...box, id: box.id ?? `obstacle-${i}`, minCol: (box.position[0]! - box.size[0]! / 2 - origin.x) / tileMeters, maxCol: (box.position[0]! + box.size[0]! / 2 - origin.x) / tileMeters, minRow: (box.position[1]! - box.size[1]! / 2 - origin.z) * rows / size[1]!, maxRow: (box.position[1]! + box.size[1]! / 2 - origin.z) * rows / size[1]! }));
  const walkable: Cell[] = [], difficultCells: Cell[] = [], rejected: NonNullable<TerrainDefinition['obstacles']> = [];
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
    const cell = { col, row }, { x, z } = point(col, row);
    if (bounds && (x < bounds[0]! || x > bounds[1]! || z < bounds[2]! || z > bounds[3]!)) continue;
    const here = zones.filter(zone => containsSpatialPoint(zone, x, z));
    const bridge = here.some(zone => zone.type === 'bridge' || zone.type === 'stairs');
    if (!here.some(zone => ['walkable', 'entry', 'difficult', 'stairs', 'bridge'].includes(zone.type) && !zone.blocking)
      || here.some(zone => zone.blocking || ['water', 'hazard', 'blocked'].includes(zone.type) && !bridge)) continue;
    const obstacle = boxes.find(box => containsSpatialPoint(box, x, z, .20));
    if (obstacle) { rejected.push({ surfaceId, cell, obstacleId: obstacle.id }); continue; }
    walkable.push(cell);
    if (here.some(zone => zone.type === 'difficult')) difficultCells.push(cell);
  }
  const allowed = new Set(walkable.map(cellKey)), difficult = new Set(difficultCells.map(cellKey));
  const blockedEdges: NonNullable<TerrainDefinition['blockedEdges']> = [];
  for (const from of walkable) for (const [dx, dz] of [[1, 0], [0, 1]]) {
    const to = { col: from.col + dx!, row: from.row + dz! };
    if (allowed.has(cellKey(to)) && boxes.some(box => segmentCrossesBox(from, to, box))) blockedEdges.push({ surfaceId, from, to });
  }
  const terrain: TerrainDefinition = { tileMeters, cols, rows, baseSurfaceId: surfaceId, transitions: [], occluders: [], blockedEdges, obstacles: rejected, surfaces: [{ id: surfaceId, tiles: walkable.map(cell => {
    const center = point(cell.col, cell.row);
    const onStair = supports.some(region => region.kind === 'stair' && containsSpatialPoint(region, center.x, center.z));
    const corners = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([u, v]) => {
      if (!onStair) return supportHeight(supports, center.x, center.z);
      const { x, z } = point(cell.col + u! - .5, cell.row + v! - .5); return supportHeight(supports, x, z);
    }) as [number, number, number, number];
    return { cell, corners, kind: onStair ? 'stair' : 'floor', materialId: 'stone', movementCost: difficult.has(cellKey(cell)) ? 2 : 1, medium: 'solid' };
  }) }], structures: [], lights: [], ambience: [] };
  // A stair seam can be taller than the automatic half-metre threshold.
  const tiles = terrain.surfaces[0]!.tiles;
  for (const from of tiles) for (const [dx, dz] of [[1, 0], [0, 1]]) {
    const to = tiles.find(tile => tile.cell.col === from.cell.col + dx! && tile.cell.row === from.cell.row + dz!);
    if (to && (from.kind === 'stair' || to.kind === 'stair') && !blockedEdges.some(edge => cellKey(edge.from) === cellKey(from.cell) && cellKey(edge.to) === cellKey(to.cell)))
      terrain.transitions.push({ from: { surfaceId, cell: from.cell }, to: { surfaceId, cell: to.cell }, mode: 'stair' });
  }
  return { walkable, difficultCells, terrain, effectWalls: boxes.filter(box => box.effects).map(({ minCol, maxCol, minRow, maxRow }) => ({ minCol, maxCol, minRow, maxRow })) };
}

export function connectedSpatialCells(terrain: TerrainDefinition, start: Cell) {
  const keys = new Set(terrain.surfaces[0]!.tiles.map(tile => cellKey(tile.cell))), visited = new Set<string>(), result: Cell[] = [];
  if (!keys.has(cellKey(start))) return result;
  result.push(start); visited.add(cellKey(start));
  for (let i = 0; i < result.length; i++) for (const { cell } of surfaceNeighbors(terrain, { surfaceId: terrain.baseSurfaceId, cell: result[i]! })) {
    const key = cellKey(cell);
    if (keys.has(key) && !visited.has(key)) { visited.add(key); result.push(cell); }
  }
  return result;
}
