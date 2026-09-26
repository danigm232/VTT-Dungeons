import { terrainSchema, type TerrainDefinition } from '../../../engine/shared/terrain.js';
import type { Cell, PublicSceneDefinition } from '../../../engine/shared/campaign.js';
import type { PortDefinition, StageActorInteractionDefinition } from '../../../engine/server/campaign.js';
import terrainJson from './retreat-terrain.json' with { type: 'json' };
import { wreckRowboatCell } from './wreck-runtime.js';

/** CANON is recorded in authored floors, walls, locations and official props; VTT_AMBIENCE is rendered as its own mesh batch. */
export const retreatTerrain: TerrainDefinition = terrainSchema.parse(terrainJson);
const CELL = retreatTerrain.tileMeters;
const bySurface = new Map(retreatTerrain.surfaces.map(surface => [surface.id, surface.tiles]));
const centerX = (cell: Cell) => (cell.col - 63.5) * CELL;
const centerZ = (cell: Cell) => (cell.row - 60.5) * CELL;

export function retreatCellAtMeters(surfaceId: string, x: number, z: number): Cell {
  const tiles = bySurface.get(surfaceId);
  if (!tiles?.length) throw new Error(`Dragon's Rest: superficie desconocida ${surfaceId}`);
  let nearest = tiles[0]!.cell, distance = Infinity;
  for (const tile of tiles) {
    const next = Math.hypot(centerX(tile.cell) - x, centerZ(tile.cell) - z);
    if (next < distance) { nearest = tile.cell; distance = next; }
  }
  return { ...nearest };
}

function nearbyCells(surfaceId: string, cell: Cell) {
  const walkable = new Set((bySurface.get(surfaceId) ?? []).map(tile => `${tile.cell.col},${tile.cell.row}`));
  return [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]
    .map(([dc, dr]) => ({ col: cell.col + dc!, row: cell.row + dr! }))
    .filter(candidate => walkable.has(`${candidate.col},${candidate.row}`));
}

const stageActor = (id: string, label: string, tokenId: string, surfaceId: string, x: number, z: number) => ({
  id, label, tokenId, surfaceId, cell: retreatCellAtMeters(surfaceId, x, z)
});
const actors = [
  stageActor('retreat-runara', 'Runara', 'npc-runara', 'a5', -39.75, -31.5),
  stageActor('retreat-tarak', 'Tarak', 'npc-tarak', 'a1', -23.5, -14.25),
  stageActor('retreat-varnoth', 'Varnoth', 'npc-varnoth', 'a1', -17.8, -14.25),
  stageActor('retreat-kobold-west', 'Kobolds · celdas del oeste', 'retreat-kobold', 'a1', -6.4, -14.25),
  stageActor('retreat-kobold-east', 'Kobolds · celdas del este', 'retreat-kobold', 'a1', -0.7, -14.25),
  stageActor('retreat-winch', 'Cabrestante · A2', 'retreat-marker', 'a2', 38.25, -20.25),
  stageActor('retreat-community', 'Comedor y descanso · A3', 'retreat-marker', 'a3', 24.75, -34),
  stageActor('retreat-library', 'Biblioteca e investigación · A4', 'retreat-marker', 'a4', 9.5, -35.5),
  stageActor('retreat-temple', 'Templo de Bahamut · A5', 'retreat-marker', 'a5', -44, -30),
  stageActor('exit-pleamar', 'EXIT_PLEAMAR · Cuevas de Pleamar', 'retreat-marker', 'pleamar', -68.25, -27.75),
  stageActor('exit-observatorio', 'EXIT_OBSERVATORIO · Observatorio del Acantilado', 'retreat-marker', 'observatorio', 71.25, -45.75),
  stageActor('travel-pecio-boat', 'Barca de la expedición · Rosa de los Vientos', 'wreck-rowboat', 'beach', -47.25, 20.25)
];

export const retreatStageActorInteractions: StageActorInteractionDefinition[] = actors.map(actor => {
  const context: Record<string, { label: string; notice: string }> = {
    'retreat-runara': { label: 'Hablar con Runara', notice: 'Runara está disponible para conversar, descansar y preparar expediciones. El DM dirige la escena.' },
    'retreat-tarak': { label: 'Hablar con Tarak', notice: 'Tarak puede conversar sobre las Cuevas de Pleamar y su trabajo en el claustro. El DM adjudica la conversación.' },
    'retreat-varnoth': { label: 'Hablar con Varnoth', notice: 'Varnoth puede hablar de su pasado, del naufragio y de las consecuencias de la aventura. El DM dirige la conversación.' },
    'retreat-kobold-west': { label: 'Interactuar con los kobolds', notice: 'Los kobolds pueden ofrecer conversación y vida cotidiana del monasterio. El DM adjudica la interacción.' },
    'retreat-kobold-east': { label: 'Interactuar con los kobolds', notice: 'Los kobolds pueden ofrecer conversación y vida cotidiana del monasterio. El DM adjudica la interacción.' },
    'retreat-winch': { label: 'Usar el cabrestante', notice: 'A2: el DM adjudica la plataforma, el descenso de 15 m y la subida de 3 m por acción.' },
    'retreat-community': { label: 'Comer o descansar', notice: 'A3: el DM dirige comida, descanso, curación e investigación sin automatizar sus resultados.' },
    'retreat-library': { label: 'Investigar en A4', notice: 'El DM dirige la búsqueda, lectura y descubrimiento de información en la biblioteca.' },
    'retreat-temple': { label: 'Visitar el templo', notice: 'A5: el DM aplica manualmente las reglas de descanso y el aura del templo.' },
    'exit-pleamar': { label: 'Preparar expedición · Pleamar', notice: 'EXIT_PLEAMAR está preparado. El mapa de destino aún no está cargado; el DM decide cuándo cambiar de escena.' },
    'exit-observatorio': { label: 'Preparar expedición · Observatorio', notice: 'EXIT_OBSERVATORIO está preparado. El mapa de destino aún no está cargado; el DM decide cuándo cambiar de escena.' },
    'travel-pecio-boat': { label: 'Preparar viaje en barca', notice: 'Son 4 km (aprox. 1 h 40 min) en barca; el DM confirma la llegada. La entrada normal es atar la barca a la jarcia caída de estribor y subir a C1. Alternativa: nadar hasta la brecha de popa y entrar en C9.' }
  };
  const details = context[actor.id]!;
  return { sceneId: 'dragon-rest', targetId: actor.id, surfaceId: actor.surfaceId,
    cells: nearbyCells(actor.surfaceId, actor.cell), nearbyLabel: details.label,
    responseAnimation: actor.id === 'travel-pecio-boat' ? 'idle' : 'talk', notice: details.notice };
});

export const dragonRestScene: PublicSceneDefinition = {
  id: 'dragon-rest', title: 'Retiro del Dragón', surfaceId: 'beach', movementEnabled: true,
  background: '/art/stormwreck/retreat/marker.svg',
  grid: { cols: retreatTerrain.cols, rows: retreatTerrain.rows, tileSize: 64, originX: 0, originY: 0,
    width: retreatTerrain.cols * 64, height: retreatTerrain.rows * 64 },
  walkable: (bySurface.get('beach') ?? []).map(tile => tile.cell),
  spawns: [retreatCellAtMeters('beach', -42.75, 14.25), retreatCellAtMeters('beach', -45, 15), retreatCellAtMeters('beach', -40.5, 15)],
  props: [{ id: 'a4-library-door', kind: 'door', label: 'Puerta de roble y hierro · A4', assetId: 'practice-door',
    cell: retreatCellAtMeters('a4', 8.25, -30.75), surfaceId: 'a4', rotation: 0, initialState: 'closed',
    baseFootprint: [{ col: 0, row: 0 }], allowedRotations: [0],
    capabilities: { transform: false, detach: false, structure: true }, sourceKind: 'official', sourceRef: 'Aventura Los Dragones de la Isla de las Tempestades, p. 10 · A4' }],
  waves: false, renderer: 'babylon-hd2d', terrain: retreatTerrain,
  visibility: { darkness: 0, manualReveal: false }, stageActors: actors
};

export const dragonRestPorts: PortDefinition[] = [{
  id: 'travel-pecio-boat',
  from: { mapId: 'dragon-rest', zoneId: 'port', surfaceId: 'beach', cell: retreatCellAtMeters('beach', -47.25, 20.25) },
  to: { mapId: 'wreck-ship', zoneId: 'sea', surfaceId: 'sea', cell: wreckRowboatCell },
  mode: 'swim', return: 'adjudicated', autoDirection: 'manual'
}];
