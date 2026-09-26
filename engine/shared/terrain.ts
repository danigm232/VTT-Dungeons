import { z } from 'zod';
import type { Cell } from './campaign.js';

// Se duplican aquí las dos primitivas para que Campaign pueda componer Terrain
// sin crear un ciclo de inicialización entre schemas Zod.
const idSchema = z.string().regex(/^[a-z0-9][a-z0-9._-]{0,39}$/);
const cellSchema = z.object({ col: z.number().int().min(0).max(255), row: z.number().int().min(0).max(255) }).strict();

const height = z.number().finite().min(-100).max(100);
const edge = z.enum(['north', 'east', 'south', 'west']);
const sameCell = (a: Cell, b: Cell) => a.col === b.col && a.row === b.row;
const tile = z.object({ cell: cellSchema, kind: z.enum(['floor', 'ramp', 'stair', 'bridge']),
  corners: z.tuple([height, height, height, height]), materialId: idSchema,
  /** Coste mínimo de recorrido. Dos representa terreno difícil. */
  movementCost: z.union([z.literal(1), z.literal(2)]).default(1),
  /** El medio es información física; nunca se usa como barrera de privacidad. */
  medium: z.enum(['solid', 'water']).default('solid') }).strict();
const address = z.object({ surfaceId: idSchema, cell: cellSchema }).strict();
type TerrainTile = z.infer<typeof tile>;
function seam(a: TerrainTile, b: TerrainTile) {
  const dx = b.cell.col - a.cell.col, dy = b.cell.row - a.cell.row;
  if (Math.abs(dx) + Math.abs(dy) !== 1) return null;
  const [nw, ne, se, sw] = a.corners, [bnw, bne, bse, bsw] = b.corners;
  return dx === 1 ? [Math.abs(ne - bnw), Math.abs(se - bsw)] : dx === -1 ? [Math.abs(nw - bne), Math.abs(sw - bse)]
    : dy === 1 ? [Math.abs(sw - bnw), Math.abs(se - bne)] : [Math.abs(nw - bsw), Math.abs(ne - bse)];
}
export const terrainSchema = z.object({
  tileMeters: z.number().finite().min(0.1).max(10),
  cols: z.number().int().min(1).max(256), rows: z.number().int().min(1).max(256),
  baseSurfaceId: idSchema,
  surfaces: z.array(z.object({ id: idSchema, tiles: z.array(tile).min(1).max(65_536),
    /** Context geometry is rendered, but cannot be walked, selected or gridded. */
    visualOnly: z.boolean().optional() }).strict()).min(1).max(20),
  transitions: z.array(z.object({ from: address, to: address, mode: z.enum(['ramp', 'stair', 'portal']) }).strict()).max(1000),
  /** Explicit physical breaks in an otherwise adjacent raster surface. */
  blockedEdges: z.array(z.object({ surfaceId: idSchema, from: cellSchema, to: cellSchema }).strict()).max(10_000).optional(),
  /** Source geometry cells rejected by the collision sampler, with provenance for audits. */
  obstacles: z.array(z.object({ surfaceId: idSchema, cell: cellSchema, obstacleId: idSchema }).strict()).max(10_000).optional(),
  /** Gaps through the decorative ship hull, with a bounded vertical opening. */
  hullOpenings: z.array(z.object({ id: idSchema, surfaceId: idSchema, cell: cellSchema, edge,
    bottom: height, top: height }).strict()).max(100).optional(),
  /** Deliberate missing rail segments (e.g. stair landings and boarding point). */
  railGaps: z.array(z.object({ surfaceId: idSchema, cell: cellSchema, edge }).strict()).max(100).optional(),
  occluders: z.array(z.object({ id: idSchema, cell: cellSchema, bottom: height, top: height,
    kind: z.enum(['pillar', 'wall', 'tree', 'arch']), materialId: idSchema,
    axis: z.enum(['x', 'z']).optional() }).strict()).max(1000),
  structures: z.array(z.discriminatedUnion('kind', [
    z.object({ id: idSchema, kind: z.literal('stair'), cell: cellSchema, direction: z.enum(['north', 'south', 'east', 'west']),
      riseMeters: height, baseHeight: height.optional(), runCells: z.number().int().min(1).max(8), steps: z.number().int().min(2).max(32), materialId: idSchema }).strict(),
    z.object({ id: idSchema, kind: z.literal('hatch'), cell: cellSchema, height: height, materialId: idSchema }).strict()
  ])).max(100).optional(),
  lights: z.array(z.object({ id: idSchema, cell: cellSchema, height: height, color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    intensity: z.number().finite().min(0).max(50), radiusMeters: z.number().finite().min(0.1).max(100) }).strict()).max(100),
  ambience: z.array(z.object({ id: idSchema, kind: z.enum(['rain', 'mist', 'leaves', 'embers', 'waves']),
    density: z.number().finite().min(0).max(1) }).strict()).max(20)
}).strict().superRefine((terrain, context) => {
  const surfaceIds = terrain.surfaces.map(surface => surface.id);
  if (new Set(surfaceIds).size !== surfaceIds.length || !surfaceIds.includes(terrain.baseSurfaceId)
    || terrain.surfaces.find(surface => surface.id === terrain.baseSurfaceId)?.visualOnly)
    context.addIssue({ code: 'custom', path: ['surfaces'], message: 'IDs de superficie duplicados o base ausente' });
  const known = new Set<string>();
  const inGrid = (cell: Cell) => cell.col < terrain.cols && cell.row < terrain.rows;
  for (const [surfaceIndex, surface] of terrain.surfaces.entries()) for (const [tileIndex, entry] of surface.tiles.entries()) {
    const key = `${surface.id}:${entry.cell.col},${entry.cell.row}`;
    if (known.has(key) || !inGrid(entry.cell)) context.addIssue({ code: 'custom', path: ['surfaces', surfaceIndex, 'tiles', tileIndex], message: 'Casilla duplicada o fuera del grid' });
    known.add(key);
    if (entry.kind === 'floor' || entry.kind === 'bridge') {
      if (new Set(entry.corners).size !== 1) context.addIssue({ code: 'custom', path: ['surfaces', surfaceIndex, 'tiles', tileIndex, 'corners'], message: 'Superficie plana con desnivel' });
    }
  }
  for (const [index, edge] of terrain.transitions.entries()) {
    const from = `${edge.from.surfaceId}:${edge.from.cell.col},${edge.from.cell.row}`;
    const to = `${edge.to.surfaceId}:${edge.to.cell.col},${edge.to.cell.row}`;
    if (from === to || !known.has(from) || !known.has(to)) context.addIssue({ code: 'custom', path: ['transitions', index], message: 'Transición sin superficies existentes' });
    const origin = terrain.surfaces.find(x => x.id === edge.from.surfaceId)?.tiles.find(x => x.cell.col === edge.from.cell.col && x.cell.row === edge.from.cell.row);
    const destination = terrain.surfaces.find(x => x.id === edge.to.surfaceId)?.tiles.find(x => x.cell.col === edge.to.cell.col && x.cell.row === edge.to.cell.row);
    if (origin && destination) {
      const differences = seam(origin, destination);
      if (edge.mode === 'portal' ? differences !== null || edge.from.cell.col !== edge.to.cell.col || edge.from.cell.row !== edge.to.cell.row
        : !differences || differences.some(value => value > (edge.mode === 'stair' ? 1.6 : 0.1)))
        context.addIssue({ code: 'custom', path: ['transitions', index], message: 'Conexión geométrica incompatible' });
    }
  }
  const blockedEdgeKeys = new Set<string>();
  for (const [index, edge] of (terrain.blockedEdges ?? []).entries()) {
    const fromKey = `${edge.surfaceId}:${edge.from.col},${edge.from.row}`;
    const toKey = `${edge.surfaceId}:${edge.to.col},${edge.to.row}`;
    const delta = Math.abs(edge.from.col - edge.to.col) + Math.abs(edge.from.row - edge.to.row);
    const pairKey = [fromKey, toKey].sort().join('|');
    if (delta !== 1 || !known.has(fromKey) || !known.has(toKey) || blockedEdgeKeys.has(pairKey))
      context.addIssue({ code: 'custom', path: ['blockedEdges', index], message: 'Borde bloqueado sin dos casillas contiguas o duplicado' });
    blockedEdgeKeys.add(pairKey);
  }
  for (const [index, obstacle] of (terrain.obstacles ?? []).entries()) {
    const key = `${obstacle.surfaceId}:${obstacle.cell.col},${obstacle.cell.row}`;
    if (!inGrid(obstacle.cell) || known.has(key))
      context.addIssue({ code: 'custom', path: ['obstacles', index], message: 'Obstáculo fuera de grid o superpuesto a suelo transitable' });
  }
  const neighborForEdge = (cell: Cell, side: z.infer<typeof edge>): Cell => side === 'north' ? { col: cell.col, row: cell.row - 1 }
    : side === 'east' ? { col: cell.col + 1, row: cell.row }
      : side === 'south' ? { col: cell.col, row: cell.row + 1 } : { col: cell.col - 1, row: cell.row };
  const boundaryAddressExists = (surfaceId: string, cell: Cell, side: z.infer<typeof edge>) => {
    const surface = terrain.surfaces.find(candidate => candidate.id === surfaceId);
    return Boolean(surface?.tiles.some(tile => sameCell(tile.cell, cell))
      && !surface.tiles.some(tile => sameCell(tile.cell, neighborForEdge(cell, side))));
  };
  const openingIds = new Set<string>();
  for (const [index, opening] of (terrain.hullOpenings ?? []).entries()) {
    if (openingIds.has(opening.id)) context.addIssue({ code: 'custom', path: ['hullOpenings', index, 'id'], message: 'ID de abertura de casco duplicado' });
    openingIds.add(opening.id);
    if (opening.top <= opening.bottom) context.addIssue({ code: 'custom', path: ['hullOpenings', index], message: 'La abertura del casco debe tener altura' });
    if (!boundaryAddressExists(opening.surfaceId, opening.cell, opening.edge))
      context.addIssue({ code: 'custom', path: ['hullOpenings', index], message: 'La abertura debe estar en un borde libre de su superficie' });
  }
  for (const [index, gap] of (terrain.railGaps ?? []).entries()) if (!boundaryAddressExists(gap.surfaceId, gap.cell, gap.edge))
    context.addIssue({ code: 'custom', path: ['railGaps', index], message: 'La interrupción de barandilla debe estar en un borde libre de su superficie' });
  for (const [index, item] of terrain.occluders.entries()) if (!inGrid(item.cell) || item.top <= item.bottom)
    context.addIssue({ code: 'custom', path: ['occluders', index], message: 'Oclusor fuera de grid o sin altura' });
  for (const [index, item] of (terrain.structures ?? []).entries()) if (!inGrid(item.cell))
    context.addIssue({ code: 'custom', path: ['structures', index], message: 'Estructura fuera de grid' });
  for (const [index, item] of terrain.lights.entries()) if (!inGrid(item.cell))
    context.addIssue({ code: 'custom', path: ['lights', index], message: 'Luz fuera de grid' });
});
export type TerrainDefinition = z.infer<typeof terrainSchema>;
export type SurfaceAddress = z.infer<typeof address>;

export function terrainTile(terrain: TerrainDefinition, address: SurfaceAddress) {
  return terrain.surfaces.find(surface => surface.id === address.surfaceId)?.tiles.find(entry => entry.cell.col === address.cell.col && entry.cell.row === address.cell.row) ?? null;
}

// Corner order: NW, NE, SE, SW. u/v are fractional coordinates within a logical D&D cell.
export function surfaceHeight(terrain: TerrainDefinition, address: SurfaceAddress, u = 0.5, v = 0.5) {
  const entry = terrainTile(terrain, address);
  if (!entry || u < 0 || u > 1 || v < 0 || v > 1) throw new Error('TERRAIN_ADDRESS');
  const [nw, ne, se, sw] = entry.corners;
  return nw * (1 - u) * (1 - v) + ne * u * (1 - v) + se * u * v + sw * (1 - u) * v;
}

export function surfaceNeighbors(terrain: TerrainDefinition, origin: SurfaceAddress): SurfaceAddress[] {
  if (!terrainTile(terrain, origin) || terrain.surfaces.find(surface => surface.id === origin.surfaceId)?.visualOnly) throw new Error('TERRAIN_ADDRESS');
  const result: SurfaceAddress[] = [];
  const blockedEdges = blockedEdgeSet(terrain);
  for (const candidate of [{ col: origin.cell.col - 1, row: origin.cell.row }, { col: origin.cell.col + 1, row: origin.cell.row },
    { col: origin.cell.col, row: origin.cell.row - 1 }, { col: origin.cell.col, row: origin.cell.row + 1 }]) {
    const next = { surfaceId: origin.surfaceId, cell: candidate };
    const destination = terrainTile(terrain, next);
    const edgeKey = [addressKey(origin), addressKey(next)].sort().join('|');
    if (!blockedEdges.has(edgeKey) && destination && !terrain.surfaces.find(surface => surface.id === next.surfaceId)?.visualOnly
      && seam(terrainTile(terrain, origin)!, destination)?.every(value => value <= 0.5)) result.push(next);
  }
  for (const edge of terrain.transitions) {
    const same = (a: SurfaceAddress, b: SurfaceAddress) => a.surfaceId === b.surfaceId && a.cell.col === b.cell.col && a.cell.row === b.cell.row;
    if (same(edge.from, origin) && !terrain.surfaces.find(surface => surface.id === edge.to.surfaceId)?.visualOnly) result.push(edge.to);
    if (same(edge.to, origin) && !terrain.surfaces.find(surface => surface.id === edge.from.surfaceId)?.visualOnly) result.push(edge.from);
  }
  return result;
}

const blockedEdgeCache = new WeakMap<object, Set<string>>();
const addressKey = (address: SurfaceAddress) => `${address.surfaceId}:${address.cell.col},${address.cell.row}`;
function blockedEdgeSet(terrain: TerrainDefinition) {
  let edges = blockedEdgeCache.get(terrain);
  if (!edges) {
    edges = new Set((terrain.blockedEdges ?? []).map(edge => [
      `${edge.surfaceId}:${edge.from.col},${edge.from.row}`,
      `${edge.surfaceId}:${edge.to.col},${edge.to.row}`
    ].sort().join('|')));
    blockedEdgeCache.set(terrain, edges);
  }
  return edges;
}
