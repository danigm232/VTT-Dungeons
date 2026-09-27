import { validatePublicCampaign, type Cell, type PublicCampaignDefinition, type PublicSceneDefinition } from '../../../engine/shared/campaign.js';
import type { TerrainDefinition } from '../../../engine/shared/terrain.js';
import { A1_BLOCKED, A1_BLOCKED_EDGES, A1_COLS, A1_FIRE_CELL, A1_ROOMS, A1_ROWS, A1_SPAWNS, A1_STATUE_CELL, a1IsWalkable } from './a1-layout.js';

const CELL = 1.5;
const SURFACE = 'ground';
type CampProfile = NonNullable<PublicSceneDefinition['camp']>['visualProfile'];
type PointKind = NonNullable<PublicSceneDefinition['camp']>['interactionPoints'][number]['kind'];
type Point = { id: string; label: string; kind: PointKind; cell: Cell; objectCell?: Cell; description: string; ownerCharacterId?: string };
type Scenario = {
  id: string; title: string; profile: CampProfile; canonStatus: 'canon' | 'vtt-ambience'; safetyNotice: string;
  cols: number; rows: number; materialId: string; background: string;
  walkable: (cell: Cell) => boolean; materialAt?: (cell: Cell) => string;
  blocked?: Array<{ cell: Cell; id: string }>; points: Point[]; spawns: Cell[];
  blockedEdges?: Array<{ from: Cell; to: Cell }>; water?: Cell[]; ambience?: TerrainDefinition['ambience'];
};
const key = (cell: Cell) => `${cell.col},${cell.row}`;
const point = (id: string, label: string, kind: PointKind, cell: Cell, objectCell: Cell, description: string, ownerCharacterId?: string): Point => ({ id, label, kind, cell, objectCell, description, ...(ownerCharacterId ? { ownerCharacterId } : {}) });
const rect = (cell: Cell, c0: number, c1: number, r0: number, r1: number) => cell.col >= c0 && cell.col <= c1 && cell.row >= r0 && cell.row <= r1;
const characterTents = (prefix: string, centers: Cell[]) => {
  const owners = [
    { id: 'mike', name: 'Mike', chest: 'Ropa, componentes y pergaminos de estudio.', item: 'Atril plegable y libro de conjuros; equipo personal de estudio, sin alterar conjuros ni espacios.' },
    { id: 'mia', name: 'Mia', chest: 'Manto de viaje, yesca y un pequeño estuche de suministros.', item: 'Símbolo sagrado y rincón de oración; uso narrativo, sin conceder curación ni beneficios.' },
    { id: 'maria', name: 'Trinity', chest: 'Ropa ligera y pertenencias personales.', item: 'Estuche de ganzúas y banco de mantenimiento; permite revisar herramientas, sin resolver pruebas automáticamente.' }
  ];
  return {
    blocked: centers.flatMap((center, index) => {
      const owner = owners[index]!;
      const walls = [] as Array<{ cell: Cell; id: string }>;
      for (let row = -2; row <= 2; row++) for (let col = -2; col <= 2; col++) {
        if (Math.abs(row) !== 2 && Math.abs(col) !== 2 || row === 2 && col === 0) continue;
        walls.push({ cell: { col: center.col + col, row: center.row + row }, id: `${prefix}-tent-${owner.id}-wall-${col}-${row}` });
      }
      walls.push({ cell: { col: center.col + 1, row: center.row }, id: `${prefix}-chest-${owner.id}` });
      walls.push({ cell: { col: center.col - 1, row: center.row }, id: `${prefix}-kit-${owner.id}` });
      return walls;
    }),
    points: centers.flatMap((center, index): Point[] => {
      const owner = owners[index]!;
      return [
        point(`${prefix}-tent-${owner.id}`, `Tienda amplia · ${owner.name}`, 'tent', { col: center.col, row: center.row + 2 }, center,
          'Interior transitable de 4,5 × 4,5 m, con sitio para el grupo y su equipo.', owner.id),
        point(`${prefix}-chest-${owner.id}`, `Baúl personal · ${owner.name}`, 'chest', { col: center.col, row: center.row + 1 }, { col: center.col + 1, row: center.row },
          `Baúl individual con ${owner.chest}`, owner.id),
        point(`${prefix}-kit-${owner.id}`, `Equipo de ${owner.name}`, 'personal', { col: center.col, row: center.row + 1 }, { col: center.col - 1, row: center.row }, owner.item, owner.id)
      ];
    })
  };
};
const ellipse = (cell: Cell, cols: number, rows: number, rx: number, rz: number, margin = 0) => {
  const x = (cell.col + .5 - cols / 2) / rx, z = (cell.row + .5 - rows / 2) / rz;
  return x * x + z * z <= 1 - margin;
};

const rooms: Scenario = {
  id: 'camp-a1-rooms', title: '01 · Habitaciones A1', profile: 'rooms', canonStatus: 'canon',
  safetyNotice: 'Representación independiente de las seis habitaciones A1. No carga ni reproduce el resto del monasterio.',
  cols: A1_COLS, rows: A1_ROWS, materialId: 'stone', background: '/art/camp-rests/marker.svg',
  walkable: a1IsWalkable,
  blocked: A1_BLOCKED,
  points: [
    ...A1_ROOMS.map(room => point(
      `a1-room-${room.id}-${room.id <= 4 ? 'bed' : 'hammocks'}`,
      `${room.id <= 4 ? 'Cama' : 'Hamacas'} · ${room.label}`,
      'bed', room.interaction, room.objectCell,
      room.id <= 4 ? 'Celda monástica humilde: cama, mesilla, pequeño escritorio y silla.' : 'Cuatro hamacas colgadas: espacio para cuatro kobolds.'
    )),
    point('a1-astalagan-point', 'Estatua de Astalagan', 'guard', { col: 10, row: 13 }, A1_STATUE_CELL,
      'Dragón de piedra que contempla el camino. Una prueba manual de Inteligencia (Conocimiento Arcano) CD 10 permite reconocer un dragón de bronce; el VTT no resuelve la tirada.'),
    point('a1-plaza-fire-point', 'Hoguera de la plaza', 'fire', { col: 24, row: 16 }, A1_FIRE_CELL,
      'Hoguera comunitaria frente a las celdas. El DM conserva la decisión sobre el descanso y sus beneficios.')
  ],
  blockedEdges: A1_BLOCKED_EDGES,
  spawns: A1_SPAWNS
};

const forest: Scenario = {
  id: 'camp-forest-pleamar', title: '02 · Bosque camino a Pleamar', profile: 'forest', canonStatus: 'vtt-ambience',
  safetyNotice: 'Composición VTT_AMBIENCE: el campamento no es un lugar canónicamente seguro. El DM decide si se puede descansar.',
  cols: 24, rows: 22, materialId: 'moss', background: '/art/camp-rests/marker.svg',
  walkable: cell => ellipse(cell, 24, 22, 11.2, 10.2, .04),
  materialAt: cell => {
    if (Math.abs(cell.col - (4 + Math.floor(cell.row / 8))) <= 1 && cell.row > 2 && cell.row < 19) return 'water';
    const isNorthTrail = cell.col >= 11 && cell.col <= 13 && cell.row >= 2 && cell.row <= 9;
    const isClearing = Math.hypot(cell.col - 12, cell.row - 11) <= 2.8;
    const isEastBranch = cell.row >= 7 && cell.row <= 9 && cell.col >= 13 && cell.col <= 17;
    const isSouthBranch = cell.col >= 11 && cell.col <= 13 && cell.row >= 12 && cell.row <= 16;
    if (isNorthTrail || isClearing || isEastBranch || isSouthBranch) return 'earth';
    return 'moss';
  },
  water: Array.from({ length: 15 }, (_, i) => ({ col: 3 + Math.floor((i + 3) / 7), row: i + 3 })),
  blocked: [
    ...[[2,2],[5,2],[9,2],[14,2],[19,2],[21,5],[21,9],[21,15],[19,19],[15,20],[8,20],[3,18],[2,14],[2,8]].map(([col,row], i) => ({ cell: { col: col!, row: row! }, id: `forest-tree-${i + 1}` })),
    ...characterTents('forest', [{ col: 7, row: 7 }, { col: 17, row: 7 }, { col: 12, row: 16 }]).blocked,
    { cell: { col: 12, row: 11 }, id: 'forest-fire' },
    { cell: { col: 9, row: 14 }, id: 'forest-seat-a' }, { cell: { col: 15, row: 14 }, id: 'forest-seat-b' }
  ],
  points: [
    ...characterTents('forest', [{ col: 7, row: 7 }, { col: 17, row: 7 }, { col: 12, row: 16 }]).points,
    point('forest-fire-point', 'Hoguera del claro', 'fire', { col: 12, row: 13 }, { col: 12, row: 11 }, 'Hoguera baja, rodeada de piedras.'),
    point('forest-seat-a-point', 'Tronco junto al fuego', 'seat', { col: 8, row: 14 }, { col: 9, row: 14 }, 'Asiento de tronco.'),
    point('forest-seat-b-point', 'Asiento del claro', 'seat', { col: 16, row: 14 }, { col: 15, row: 14 }, 'Asiento de madera húmeda.'),
    point('forest-guard-point', 'Puesto de guardia · sendero', 'guard', { col: 12, row: 3 }, { col: 12, row: 2 }, 'Vigila el camino hacia Pleamar.')
  ], spawns: [{ col: 12, row: 12 }, { col: 10, row: 12 }, { col: 14, row: 12 }, { col: 11, row: 10 }, { col: 13, row: 10 }],
  ambience: [{ id: 'ground-mist', kind: 'mist', density: .68 }, { id: 'forest-canopy', kind: 'leaves', density: .8 }]
};

const beach: Scenario = {
  id: 'camp-wreck-beach', title: '03 · Playa del pecio', profile: 'wreck-beach', canonStatus: 'vtt-ambience',
  safetyNotice: 'Composición VTT_AMBIENCE separada del pecio C1–C9. No implica seguridad; el DM decide si el grupo puede descansar.',
  cols: 25, rows: 22, materialId: 'sand', background: '/art/camp-rests/marker.svg',
  walkable: cell => cell.row >= 2 && cell.row <= 17 && ellipse(cell, 25, 22, 12.2, 9.3, .02),
  blocked: [
    ...[[2,3],[4,4],[20,3],[22,6],[3,16],[21,16],[6,6],[19,7]].map(([col,row], i) => ({ cell: { col: col!, row: row! }, id: `beach-rock-${i + 1}` })),
    ...characterTents('beach', [{ col: 6, row: 11 }, { col: 18, row: 11 }, { col: 12, row: 5 }]).blocked,
    { cell: { col: 12, row: 10 }, id: 'beach-fire' },
    { cell: { col: 3, row: 6 }, id: 'beach-boat' }, { cell: { col: 9, row: 9 }, id: 'beach-seat' }
  ],
  points: [
    ...characterTents('beach', [{ col: 6, row: 11 }, { col: 18, row: 11 }, { col: 12, row: 5 }]).points,
    point('beach-fire-point', 'Hoguera entre rocas', 'fire', { col: 12, row: 8 }, { col: 12, row: 10 }, 'Hoguera hundida en un abrigo de piedra.'),
    point('beach-seat-point', 'Asiento de deriva', 'seat', { col: 10, row: 8 }, { col: 9, row: 9 }, 'Tronco de naufragio usado como banco.'),
    point('beach-boat-point', 'Bote varado', 'guard', { col: 5, row: 6 }, { col: 3, row: 6 }, 'Bote inutilizado por la marea; sin transición al pecio.'),
    point('beach-guard-point', 'Puesto de guardia · costa', 'guard', { col: 12, row: 2 }, { col: 12, row: 2 }, 'Vigila la rompiente y los accesos entre rocas.')
  ], spawns: [{ col: 12, row: 11 }, { col: 10, row: 11 }, { col: 14, row: 11 }, { col: 11, row: 8 }, { col: 13, row: 8 }],
  ambience: [{ id: 'surf-zone', kind: 'waves', density: .9 }, { id: 'coastal-haze', kind: 'mist', density: .32 }]
};

const cliffs: Scenario = {
  id: 'camp-cliffs-observatory', title: '04 · Acantilados del Observatorio', profile: 'cliff-observatory', canonStatus: 'vtt-ambience',
  safetyNotice: 'Meseta VTT_AMBIENCE previa al observatorio. No es un lugar canónico de descanso seguro; decide el DM.',
  cols: 25, rows: 22, materialId: 'basalt', background: '/art/camp-rests/marker.svg',
  walkable: cell => rect(cell, 2, 22, 2, 18) && ellipse(cell, 25, 22, 12, 9.6, .04),
  blocked: [
    ...[[4,4],[20,5],[5,16],[19,16]].map(([col,row], i) => ({ cell: { col: col!, row: row! }, id: `basalt-pillar-${i + 1}` })),
    ...[[8,5],[17,7],[8,15],[17,14]].map(([col,row], i) => ({ cell: { col: col!, row: row! }, id: `arcane-crystal-${i + 1}` })),
    ...characterTents('cliff', [{ col: 7, row: 10 }, { col: 18, row: 10 }, { col: 12, row: 5 }]).blocked,
    { cell: { col: 12, row: 10 }, id: 'cliff-fire' },
    { cell: { col: 3, row: 12 }, id: 'cliff-seat-a' }, { cell: { col: 15, row: 12 }, id: 'cliff-seat-b' }
  ],
  points: [
    ...characterTents('cliff', [{ col: 7, row: 10 }, { col: 18, row: 10 }, { col: 12, row: 5 }]).points,
    point('cliff-fire-point', 'Hoguera protegida', 'fire', { col: 12, row: 8 }, { col: 12, row: 10 }, 'Brasero bajo entre muros de basalto.'),
    point('cliff-seat-a-point', 'Asiento de piedra oeste', 'seat', { col: 4, row: 12 }, { col: 3, row: 12 }, 'Piedra plana orientada a los cristales.'),
    point('cliff-seat-b-point', 'Asiento de piedra este', 'seat', { col: 15, row: 13 }, { col: 15, row: 12 }, 'Piedra plana junto a la senda.'),
    point('cliff-guard-point', 'Puesto de guardia · cornisa', 'guard', { col: 12, row: 2 }, { col: 12, row: 2 }, 'Atalaya de cara a la costa.')
  ], spawns: [{ col: 12, row: 12 }, { col: 10, row: 12 }, { col: 14, row: 12 }, { col: 11, row: 8 }, { col: 13, row: 8 }],
  ambience: [{ id: 'cliff-wind-mist', kind: 'mist', density: .24 }, { id: 'cliff-embers', kind: 'embers', density: .28 }]
};

const cove: Scenario = {
  id: 'camp-coastal-refuge', title: '05 · Refugio costero de Pleamar', profile: 'coastal-refuge', canonStatus: 'vtt-ambience',
  safetyNotice: 'Refugio opcional de VTT_AMBIENCE. No es B6 y no elimina los peligros canónicos de las cuevas; decide el DM.',
  cols: 25, rows: 22, materialId: 'cave-rock', background: '/art/camp-rests/marker.svg',
  walkable: cell => ellipse(cell, 25, 22, 11.7, 9.4, .03),
  materialAt: cell => [[4,7],[5,7],[4,8],[19,8],[20,8],[20,9],[9,16],[10,16]].some(([col,row]) => cell.col === col && cell.row === row) ? 'water' : 'cave-rock',
  water: [{ col: 4, row: 7 }, { col: 5, row: 7 }, { col: 4, row: 8 }, { col: 19, row: 8 }, { col: 20, row: 8 }, { col: 20, row: 9 }, { col: 9, row: 16 }, { col: 10, row: 16 }],
  blocked: [
    ...[[2,3],[5,3],[20,3],[22,6],[3,16],[21,16],[6,6],[18,5]].map(([col,row], i) => ({ cell: { col: col!, row: row! }, id: `cove-rock-${i + 1}` })),
    ...characterTents('cove', [{ col: 7, row: 11 }, { col: 18, row: 11 }, { col: 12, row: 5 }]).blocked,
    { cell: { col: 12, row: 12 }, id: 'cove-fire' },
    { cell: { col: 3, row: 12 }, id: 'cove-seat-a' }, { cell: { col: 15, row: 12 }, id: 'cove-seat-b' }
  ],
  points: [
    ...characterTents('cove', [{ col: 7, row: 11 }, { col: 18, row: 11 }, { col: 12, row: 5 }]).points,
    point('cove-fire-point', 'Hoguera · centro del refugio', 'fire', { col: 12, row: 10 }, { col: 12, row: 12 }, 'Hoguera pequeña con salida de humo al exterior.'),
    point('cove-seat-a-point', 'Asiento junto a la poza oeste', 'seat', { col: 4, row: 13 }, { col: 3, row: 12 }, 'Piedra seca junto a una poza somera.'),
    point('cove-seat-b-point', 'Asiento junto a la poza este', 'seat', { col: 15, row: 13 }, { col: 15, row: 12 }, 'Piedra lisa al abrigo del viento.'),
    point('cove-guard-point', 'Puesto de guardia · boca marina', 'guard', { col: 12, row: 2 }, { col: 12, row: 2 }, 'Vigila la entrada y la marea.')
  ], spawns: [{ col: 12, row: 11 }, { col: 10, row: 11 }, { col: 14, row: 11 }, { col: 11, row: 9 }, { col: 13, row: 9 }],
  ambience: [{ id: 'cove-water', kind: 'waves', density: .36 }, { id: 'cove-mist', kind: 'mist', density: .25 }]
};

function terrainFor(spec: Scenario): TerrainDefinition {
  const blockedByCell = new Map((spec.blocked ?? []).map(item => [key(item.cell), item.id]));
  const water = new Set((spec.water ?? []).map(key));
  const tiles: TerrainDefinition['surfaces'][number]['tiles'] = [];
  const obstacles: NonNullable<TerrainDefinition['obstacles']> = [];
  for (let row = 0; row < spec.rows; row++) for (let col = 0; col < spec.cols; col++) {
    const cell = { col, row }, cellKey = key(cell);
    if (!spec.walkable(cell)) continue;
    const blockedId = blockedByCell.get(cellKey);
    if (blockedId) { obstacles.push({ surfaceId: SURFACE, cell, obstacleId: blockedId }); continue; }
    const shallow = water.has(cellKey);
    tiles.push({ cell, kind: 'floor', corners: [0, 0, 0, 0], materialId: spec.materialAt?.(cell) ?? spec.materialId,
      movementCost: shallow ? 2 : 1, medium: shallow ? 'water' : 'solid' });
  }
  const tileKeys = new Set(tiles.map(tile => key(tile.cell)));
  const blockedEdges = (spec.blockedEdges ?? []).filter(edge => tileKeys.has(key(edge.from)) && tileKeys.has(key(edge.to)))
    .map(edge => ({ surfaceId: SURFACE, from: edge.from, to: edge.to }));
  const terrain: TerrainDefinition = {
    tileMeters: CELL, cols: spec.cols, rows: spec.rows, baseSurfaceId: SURFACE,
    surfaces: [{ id: SURFACE, tiles }], transitions: [], blockedEdges, obstacles, occluders: [],
    lights: spec.points.filter(item => item.kind === 'fire' || item.kind === 'bed').map((item, index) => ({
      id: `${spec.id}-glow-${index + 1}`, cell: item.objectCell ?? item.cell, height: item.kind === 'bed' ? 1.4 : .9,
      color: item.kind === 'bed' ? '#ffc982' : '#ff9a48', intensity: item.kind === 'bed' ? .55 : 1.05,
      radiusMeters: item.kind === 'bed' ? 5 : 9
    })),
    ambience: spec.ambience ?? []
  };
  return terrain;
}

const spawnCells = (spec: Scenario) => spec.spawns.filter(cell => spec.walkable(cell) && !(spec.blocked ?? []).some(item => key(item.cell) === key(cell)));
function buildScene(spec: Scenario): PublicSceneDefinition {
  const terrain = terrainFor(spec);
  const background = spec.background;
  return {
    id: spec.id, title: spec.title, surfaceId: SURFACE, movementEnabled: true, background,
    grid: { cols: spec.cols, rows: spec.rows, tileSize: 48, originX: 0, originY: 0, width: spec.cols * 48, height: spec.rows * 48 },
    walkable: terrain.surfaces[0]!.tiles.map(tile => tile.cell), spawns: spawnCells(spec), props: [], waves: false,
    renderer: 'babylon-hd2d', access: 'public', terrain, visibility: { darkness: spec.profile === 'rooms' ? .1 : .55, manualReveal: false },
    camp: { visualProfile: spec.profile, canonStatus: spec.canonStatus, safetyNotice: spec.safetyNotice,
      interactionPoints: spec.points.map(item => ({ ...item, surfaceId: SURFACE })) }
  };
}

const scenarios = [rooms, forest, beach, cliffs, cove];
// Keep the current player characters and their existing token artwork while
// allowing this pack to load without importing any adventure scene geometry.
const roster = [
  { id: 'mike', label: 'Mike', archetype: 'Mago alto elfo', color: '#55b8d8', tokenId: 'wizard' },
  { id: 'mia', label: 'Mia', archetype: 'Clériga enana', color: '#d5a34b', tokenId: 'cleric' },
  { id: 'maria', label: 'Trinity', archetype: 'Pícara mediana', color: '#b66dc4', tokenId: 'rogue' }
];
const tokens = {
  wizard: { url: '/art/tokens/wizard.png', logicalWidth: 92, logicalHeight: 92, anchorX: .5, anchorY: .84 },
  cleric: { url: '/art/tokens/cleric.png', logicalWidth: 92, logicalHeight: 92, anchorX: .5, anchorY: .84 },
  rogue: { url: '/art/m3/trinity/maria_base.png', logicalWidth: 92, logicalHeight: 92, anchorX: .5, anchorY: .84 }
};
const artCycle = (stem: string, count: number, fps: number) => ({
  frames: Array.from({ length: count }, (_, index) => `/art/m3/trinity/${stem}_${String(index + 1).padStart(2, '0')}.png`), fps
});
const tokenAnimations = { rogue: {
  idle: artCycle('maria_idle', 4, 4), moving: artCycle('maria_caminar', 4, 8), attack: artCycle('maria_ataque_daga', 5, 10)
} };
const props = { 'practice-door': { variants: {
  'intact:closed': { url: '/art/objects-v4/door-intact-closed-v4.png', logicalWidth: 96, logicalHeight: 96, anchorX: .25, anchorY: .5 },
  'intact:open': { url: '/art/objects-v4/door-intact-open-v4.png', logicalWidth: 96, logicalHeight: 96, anchorX: .25, anchorY: .5, sortOffsetY: -24 },
  'damaged:closed': { url: '/art/objects-v4/door-damaged-closed-v4.png', logicalWidth: 96, logicalHeight: 96, anchorX: .25, anchorY: .5 },
  'damaged:open': { url: '/art/objects-v4/door-damaged-open-v4.png', logicalWidth: 96, logicalHeight: 96, anchorX: .25, anchorY: .5, sortOffsetY: -24 },
  destroyed: { url: '/art/objects-v4/door-destroyed-v4.png', logicalWidth: 96, logicalHeight: 96, anchorX: .25, anchorY: .5, sortOffsetY: -12 }
} } };
const audio: PublicCampaignDefinition['audio'] = {
  music: '/audio/music-tempest.wav',
  layers: { ocean: '/audio/ambient-ocean.wav', wind: '/audio/ambient-wind.wav', wood: '/audio/ambient-wood.wav', storm: '/audio/ambient-storm.wav' },
  sfx: { thunder: '/audio/stormwreck/sfx/pixabay-thunder.mp3', creak: '/audio/stormwreck/sfx/pixabay-door.mp3', impact: '/audio/stormwreck/sfx/pixabay-sword-hit.mp3' },
  layerLabels: { ocean: 'Mar y oleaje', wind: 'Viento costero', wood: 'Madera y refugio', storm: 'Clima y truenos' },
  library: {
    music: [{ id: 'camp-rest-music', label: 'Campamentos · ambiente', description: 'Música ambiental tenue para la sesión.', url: '/audio/music-tempest.wav' }],
    ambience: [
      { id: 'stormwreck-loop-ocean', label: 'Oleaje de la isla', description: 'Mar constante contra las rocas.', url: '/audio/ambient-ocean.wav', category: 'scene' as const, loopable: true },
      { id: 'stormwreck-loop-wind', label: 'Viento costero', description: 'Viento exterior y de acantilado.', url: '/audio/ambient-wind.wav', category: 'scene' as const, loopable: true },
      { id: 'stormwreck-loop-wood', label: 'Madera y refugio', description: 'Madera y elementos del campamento.', url: '/audio/ambient-wood.wav', category: 'scene' as const, loopable: true },
      { id: 'stormwreck-loop-storm', label: 'Clima y truenos', description: 'Viento y truenos a distancia.', url: '/audio/ambient-storm.wav', category: 'scene' as const, loopable: true },
      { id: 'stormwreck-loop-boat-waves', label: 'Oleaje contra la costa', description: 'Olas fuertes y espuma junto a las rocas.', url: '/audio/stormwreck/ambience/stormwreck-loop-boat-waves.mp3', category: 'scene' as const, loopable: true },
      { id: 'stormwreck-loop-cliff-wind', label: 'Viento del observatorio', description: 'Aire frío para la meseta de basalto.', url: '/audio/stormwreck/ambience/stormwreck-loop-cliff-wind.ogg', category: 'scene' as const, loopable: true },
      { id: 'stormwreck-loop-forest', label: 'Bosque de la isla', description: 'Vegetación y sonidos nocturnos.', url: '/audio/stormwreck/ambience/stormwreck-loop-forest.mp3', category: 'scene' as const, loopable: true },
      { id: 'stormwreck-loop-sanctuary', label: 'Refugio sereno', description: 'Calma tenue de una zona protegida.', url: '/audio/stormwreck/ambience/stormwreck-loop-sanctuary.mp3', category: 'scene' as const, loopable: true }
    ],
    sfx: [{ id: 'camp-rest-thunder', label: 'Trueno lejano', description: 'Trueno ambiental a distancia.', url: '/audio/stormwreck/sfx/pixabay-thunder.mp3', category: 'scene' as const }]
  }
};
const loopProfile = (wind: string, ocean: string, wood = 'stormwreck-loop-wood', storm = 'stormwreck-loop-storm') => ({
  music: { id: 'camp-rest-music', playing: false, volume: .08 },
  layers: {
    ocean: { id: ocean, playing: ocean !== 'stormwreck-loop-ocean' || wind.includes('coast'), volume: .28 },
    wind: { id: wind, playing: true, volume: .22 }, wood: { id: wood, playing: false, volume: .12 }, storm: { id: storm, playing: false, volume: .16 }
  }
});
const observatoryAudio = loopProfile('stormwreck-loop-cliff-wind', 'stormwreck-loop-ocean');
observatoryAudio.layers.storm = { id: 'stormwreck-loop-storm', playing: true, volume: .11 };
const refugeAudio = loopProfile('stormwreck-loop-sanctuary', 'stormwreck-loop-ocean', 'stormwreck-loop-wood');
refugeAudio.layers.ocean = { id: 'stormwreck-loop-ocean', playing: true, volume: .1 };
refugeAudio.layers.wind = { id: 'stormwreck-loop-sanctuary', playing: true, volume: .13 };
audio.sceneProfiles = {
  'camp-a1-rooms': { ...loopProfile('stormwreck-loop-sanctuary', 'stormwreck-loop-ocean'), layers: { ...loopProfile('stormwreck-loop-sanctuary', 'stormwreck-loop-ocean').layers, ocean: { id: 'stormwreck-loop-ocean', playing: false, volume: .08 }, wind: { id: 'stormwreck-loop-sanctuary', playing: true, volume: .12 } } },
  'camp-forest-pleamar': loopProfile('stormwreck-loop-forest', 'stormwreck-loop-ocean'),
  'camp-wreck-beach': loopProfile('stormwreck-loop-wind', 'stormwreck-loop-boat-waves'),
  'camp-cliffs-observatory': observatoryAudio,
  'camp-coastal-refuge': refugeAudio
};

export const campRestsPublicCampaign = validatePublicCampaign({
  schemaVersion: 2, campaignId: 'camp-rests', version: '1.4.0', title: 'Campamentos Base · Babylon Playground',
  initialSceneId: 'camp-forest-pleamar', scenes: scenarios.map(buildScene), roster, tokens, tokenAnimations,
  props, audio
});

export const campScenarios = scenarios;
