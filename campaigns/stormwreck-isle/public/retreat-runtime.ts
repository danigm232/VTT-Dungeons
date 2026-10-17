import { terrainSchema, type TerrainDefinition } from '../../../engine/shared/terrain.js';
import type { Cell, PublicSceneDefinition } from '../../../engine/shared/campaign.js';
import type { PortDefinition, StageActorInteractionDefinition } from '../../../engine/server/campaign.js';
import terrainJson from './retreat-terrain-v2.json' with { type: 'json' };
import assembly from './retreat-zones/global-layout.json' with {type:'json'};
import { wreckRowboatCell } from './wreck-runtime.js';

/** CANON is recorded in authored floors, walls, locations and official props; VTT_AMBIENCE is rendered as its own mesh batch. */
export const retreatTerrain: TerrainDefinition = terrainSchema.parse(terrainJson);
const CELL = retreatTerrain.tileMeters;
const bySurface = new Map(retreatTerrain.surfaces.map(surface => [surface.id, surface.tiles]));
const centerX = (cell: Cell) => (cell.col + .5) * CELL - 72;
const centerZ = (cell: Cell) => (cell.row + .5) * CELL - 72;
export const RETREAT_GRID_VERSION=2;
export const retreatLandmarks=assembly.landmarks;

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

const stageActor = (id: string, label: string, tokenId: string, landmark: keyof typeof retreatLandmarks) => ({id,label,interactionOnly:tokenId==='retreat-marker'||tokenId==='wreck-rowboat',tokenId:tokenId==='wreck-rowboat'?tokenId:'retreat-site-point',...retreatLandmarks[landmark]});
const actors = [
  stageActor('retreat-runara', 'Runara', 'npc-runara', 'runara'),
  stageActor('retreat-tarak', 'Tarak', 'npc-tarak', 'tarak'),
  stageActor('retreat-varnoth', 'Varnoth', 'npc-varnoth', 'varnoth'),
  stageActor('retreat-myla', 'Myla', 'retreat-kobold', 'myla'),
  stageActor('retreat-kobold-west', 'Kobolds · celdas del oeste', 'retreat-kobold', 'kobold-west'),
  stageActor('retreat-kobold-east', 'Kobolds · celdas del este', 'retreat-kobold', 'kobold-east'),
  stageActor('retreat-winch', 'Cabrestante · A2', 'retreat-marker', 'winch'),
  stageActor('retreat-community', 'Comedor y descanso · A3', 'retreat-marker', 'community'),
  stageActor('retreat-library', 'Biblioteca e investigación · A4', 'retreat-marker', 'library'),
  stageActor('retreat-temple', 'Templo de Bahamut · A5', 'retreat-marker', 'temple'),
  stageActor('exit-pleamar', 'EXIT_PLEAMAR · Cuevas de Pleamar', 'retreat-marker', 'pleamar'),
  stageActor('exit-observatorio', 'EXIT_OBSERVATORIO · Observatorio del Acantilado', 'retreat-marker', 'observatorio'),
  stageActor('travel-pecio-boat', 'Barca de la expedición · Rosa de los Vientos', 'wreck-rowboat', 'boat')
];

export const retreatStageActorInteractions: StageActorInteractionDefinition[] = actors.map(actor => {
  const context: Record<string, { label: string; notice: string }> = {
    'retreat-runara': { label: 'Hablar con Runara', notice: 'Runara está disponible para conversar, descansar y preparar expediciones. El DM dirige la escena.' },
    'retreat-tarak': { label: 'Hablar con Tarak', notice: 'Tarak puede conversar sobre las Cuevas de Pleamar y su trabajo en el claustro. El DM adjudica la conversación.' },
    'retreat-varnoth': { label: 'Hablar con Varnoth', notice: 'Varnoth puede hablar de su pasado, del naufragio y de las consecuencias de la aventura. El DM dirige la conversación.' },
    'retreat-myla': {label:'Hablar con Myla',notice:'Myla está disponible para conversar sobre su trabajo y preparar expediciones. El DM dirige la conversación y las pruebas.'},
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
  spawns: [retreatLandmarks.spawn.cell,retreatCellAtMeters('beach',-51,39),retreatCellAtMeters('beach',-51,37.5)],
  props: (['a2','a4'] as const).map(zone=>({ id: zone==='a2'?'a2-winch-door':'a4-library-door', kind: 'door', label: zone==='a2'?'Puerta de madera · A2':'Puerta de roble y hierro · A4', assetId: 'practice-door',
    cell: retreatLandmarks[`${zone}-door`].cell, surfaceId: zone, rotation: 0, initialState: 'closed',
    baseFootprint: [{ col: 0, row: 0 }], allowedRotations: [0],
    capabilities: { transform: false, detach: false, structure: true }, sourceKind: 'official', sourceRef: `Aventura Los Dragones de la Isla de las Tempestades, p. 10 · ${zone.toUpperCase()}` })),
  waves: false, renderer: 'babylon-hd2d', terrain: retreatTerrain,
  visibility: { darkness: 0, manualReveal: false }, stageActors: actors
};

export const dragonRestPorts: PortDefinition[] = [{
  id: 'travel-pecio-boat',
  from: { mapId: 'dragon-rest', zoneId: 'port', surfaceId: 'beach', cell: retreatLandmarks.boat.cell },
  to: { mapId: 'wreck-ship', zoneId: 'sea', surfaceId: 'sea', cell: wreckRowboatCell },
  mode: 'swim', return: 'adjudicated', autoDirection: 'manual', travelSeconds: 6_000
}];
