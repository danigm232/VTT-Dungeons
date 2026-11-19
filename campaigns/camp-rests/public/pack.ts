import { validatePublicCampaign, type Cell, type PublicCampaignDefinition, type PublicSceneDefinition } from '../../../engine/shared/campaign.js';
import type { TerrainDefinition } from '../../../engine/shared/terrain.js';
import { A1_BLOCKED, A1_BLOCKED_EDGES, A1_COLS, A1_FIRE_CELL, A1_ROOMS, A1_ROWS, A1_SPAWNS, A1_STATUE_CELL, a1IsWalkable } from './a1-layout.js';
import { forestStreamWater, forestStreamColumn } from './forest-stream.js';

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
type BivouacSpot = { bed: Cell; pack: Cell; kit: Cell };
const BIVOUAC_OWNER_LORE = [
  { id: 'mike', name: 'Mike', packDesc: 'Mochila de cuero gastado con mudas dobladas, bolsa de componentes y rollo de pergaminos.', kitDesc: 'Libro de conjuros abierto y bolsa de componentes junto al petate; notas arcanas, sin alterar espacios.' },
  { id: 'mia', name: 'Mia', packDesc: 'Mochila robusta con manto de viaje, yesquero y estuche de curación.', kitDesc: 'Símbolo sagrado de bronce y pequeña estera de oración; uso narrativo, sin curación automática.' },
  { id: 'maria', name: 'Trinity', packDesc: 'Mochila compacta de lona oscura con cuerda fina y pertenencias de viaje.', kitDesc: 'Estuche enrollable de herramientas, ganzúas y piedra de afilar; permite revisar equipo, sin resolver tiradas.' }
] as const;
const campEquipmentPoints = (
  prefix: string,
  spots: Record<'mike' | 'mia' | 'maria', BivouacSpot>,
  shelter?: { cell: Cell; objectCell: Cell; label: string; description: string }
): Point[] => {
  const pts: Point[] = BIVOUAC_OWNER_LORE.flatMap(owner => {
    const sp = spots[owner.id];
    return [
      point(`${prefix}-bed-${owner.id}`, `Petate · ${owner.name}`, 'bed', sp.bed, sp.bed,
        `Petate extendido, manta de lana y almohada de viaje de ${owner.name}.`, owner.id),
      point(`${prefix}-chest-${owner.id}`, `Mochila · ${owner.name}`, 'chest', sp.bed, sp.pack,
        owner.packDesc, owner.id),
      point(`${prefix}-kit-${owner.id}`, `Objetos personales · ${owner.name}`, 'personal', sp.bed, sp.kit,
        owner.kitDesc, owner.id)
    ];
  });
  if (shelter) pts.unshift(point(`${prefix}-tent-mia`, shelter.label, 'tent', shelter.cell, shelter.objectCell, shelter.description, 'mia'));
  return pts;
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
      'bed', { col: room.objectCell.col + 1, row: room.objectCell.row }, room.objectCell,
      room.id <= 4 ? 'Celda monástica humilde: cama, mesilla, pequeño escritorio y silla.' : 'Cuatro hamacas colgadas: espacio para cuatro kobolds.'
    )),
    point('a1-astalagan-point', 'Estatua de Astalagan', 'guard', { col: 10, row: 13 }, A1_STATUE_CELL,
      'Dragón de piedra que contempla el camino. Una prueba manual de Inteligencia (Conocimiento Arcano) CD 10 permite reconocer un dragón de bronce; el VTT no resuelve la tirada.'),
    point('a1-plaza-fire-point', 'Hoguera de la plaza', 'fire', { col: 24, row: 15 }, A1_FIRE_CELL,
      'Hoguera comunitaria frente a las celdas. El DM conserva la decisión sobre el descanso y sus beneficios.'),
    point('a1-seat-west-point','Banco de la plaza · oeste','seat',{col:22,row:13},{col:22,row:14},'Banco de madera junto a la hoguera.'),
    point('a1-seat-east-point','Banco de la plaza · este','seat',{col:26,row:13},{col:26,row:14},'Banco de madera con vista a la bahía.')
  ],
  blockedEdges: A1_BLOCKED_EDGES,
  spawns: A1_SPAWNS
};

const forest: Scenario = {
  id: 'camp-forest-pleamar', title: '02 · Bosque camino a Pleamar', profile: 'forest', canonStatus: 'vtt-ambience',
  safetyNotice: 'Composición VTT_AMBIENCE: claro provisional en el camino a Pleamar. El DM decide si es seguro descansar.',
  cols: 24, rows: 22, materialId: 'moss', background: '/art/camp-rests/marker.svg',
  walkable: cell => ellipse(cell, 24, 22, 11.2, 10.2, .04),
  materialAt: cell => {
    if (forestStreamWater(cell)) return 'water';
    const isNorthTrail = cell.col >= 11 && cell.col <= 13 && cell.row >= 2 && cell.row <= 9;
    const isClearing = Math.hypot(cell.col - 11.8, cell.row - 10.8) <= 3.1;
    const isRestNook = Math.hypot(cell.col - 10, cell.row - 8.2) <= 2.3 || (cell.col >= 13 && cell.col <= 16 && cell.row >= 11 && cell.row <= 13);
    const isSouthTrail = cell.col >= 11 && cell.col <= 13 && cell.row >= 12 && cell.row <= 17;
    if (isNorthTrail || isClearing || isRestNook || isSouthTrail) return 'earth';
    return 'moss';
  },
  water: Array.from({ length: 16 }, (_, i) => [-1, 0, 1].map(offset => ({ col: forestStreamColumn(i + 3) + offset, row: i + 3 }))).flat(),
  blocked: [
    ...[[2,2],[5,2],[8,7],[12,7],[16,3],[20,4],[21,9],[20,15],[18,19],[14,20],[8,19],[5,17],[5,14],[4,8]].map(([col,row], i) => ({ cell: { col: col!, row: row! }, id: `forest-tree-${i + 1}` })),
    { cell: { col: 12, row: 11 }, id: 'forest-fire' },
    { cell: { col: 10, row: 12 }, id: 'forest-seat-a' }, { cell: { col: 14, row: 10 }, id: 'forest-seat-b' }
  ],
  points: [
    ...campEquipmentPoints('forest', {
      mia: { bed: { col: 9, row: 8 }, pack: { col: 8, row: 8 }, kit: { col: 9, row: 9 } },
      mike: { bed: { col: 11, row: 8 }, pack: { col: 12, row: 8 }, kit: { col: 11, row: 9 } },
      maria: { bed: { col: 15, row: 12 }, pack: { col: 16, row: 12 }, kit: { col: 14, row: 13 } }
    }, { cell: { col: 10, row: 9 }, objectCell: { col: 10, row: 8 }, label: 'Lona tensada entre árboles', description: 'Toldo ligero de lona cruda (3 × 2,6 m) tensado con cuerdas entre dos troncos sobre los petates.' }),
    point('forest-fire-point', 'Hoguera del claro', 'fire', { col: 12, row: 12 }, { col: 12, row: 11 }, 'Hoguera baja cercada de piedras con olla de hierro y reserva de leña.'),
    point('forest-seat-a-point', 'Tronco caído', 'seat', { col: 10, row: 13 }, { col: 10, row: 12 }, 'Tronco húmedo con musgo usado como asiento junto al fuego.'),
    point('forest-seat-b-point', 'Piedra plana del claro', 'seat', { col: 14, row: 11 }, { col: 14, row: 10 }, 'Roca ancha semienterrada frente a las brasas.'),
    point('forest-guard-point', 'Puesto de vigilancia · sendero', 'guard', { col: 12, row: 4 }, { col: 12, row: 3 }, 'Claro con buena visual hacia la senda de Pleamar; farol portátil en la roca.')
  ], spawns: [{ col: 13, row: 12 }, { col: 10, row: 10 }, { col: 14, row: 12 }, { col: 11, row: 12 }, { col: 13, row: 10 }],
  ambience: [{ id: 'ground-mist', kind: 'mist', density: .58 }, { id: 'forest-canopy', kind: 'leaves', density: .82 }]
};

const beach: Scenario = {
  id: 'camp-wreck-beach', title: '03 · Playa del pecio', profile: 'wreck-beach', canonStatus: 'vtt-ambience',
  safetyNotice: 'Composición VTT_AMBIENCE separada del pecio C1–C9. Refugio provisional por encima de la pleamar; decide el DM.',
  cols: 25, rows: 22, materialId: 'sand', background: '/art/camp-rests/marker.svg',
  walkable: cell => cell.row >= 2 && cell.row <= 16 && ellipse(cell, 25, 22, 12.2, 9.3, .02),
  materialAt: cell => cell.row >= 13 ? 'sand-wet' : 'sand',
  blocked: [
    ...[[2,3],[5,4],[9,6],[13,6],[17,7],[21,5],[22,10],[19,14],[7,13],[3,15],[20,16]].map(([col,row], i) => ({ cell: { col: col!, row: row! }, id: `beach-rock-${i + 1}` })),
    { cell: { col: 13, row: 9 }, id: 'beach-fire' },
    { cell: { col: 4, row: 13 }, id: 'beach-boat' }, { cell: { col: 11, row: 10 }, id: 'beach-seat' }
  ],
  points: [
    ...campEquipmentPoints('beach', {
      mia: { bed: { col: 10, row: 8 }, pack: { col: 9, row: 8 }, kit: { col: 10, row: 9 } },
      mike: { bed: { col: 12, row: 7 }, pack: { col: 12, row: 6 }, kit: { col: 13, row: 7 } },
      maria: { bed: { col: 15, row: 9 }, pack: { col: 16, row: 8 }, kit: { col: 15, row: 10 } }
    }, { cell: { col: 11, row: 8 }, objectCell: { col: 11, row: 7 }, label: 'Lona paraviento costera', description: 'Lona corta y baja sujeta entre rocas y maderos contra el viento del mar.' }),
    point('beach-fire-point', 'Hoguera entre rocas', 'fire', { col: 13, row: 10 }, { col: 13, row: 9 }, 'Fuego hundido en arena seca al abrigo de las rocas costeras.'),
    point('beach-seat-point', 'Madero de deriva', 'seat', { col: 11, row: 11 }, { col: 11, row: 10 }, 'Tronco blanqueado por la sal usado como asiento.'),
    point('beach-boat-point', 'Bote varado', 'guard', { col: 6, row: 12 }, { col: 4, row: 13 }, 'Bote astillado varado en la franja húmeda; sin transición al pecio.'),
    point('beach-guard-point', 'Puesto de guardia · rompiente', 'guard', { col: 17, row: 12 }, { col: 18, row: 13 }, 'Roca costera con vista abierta sobre la rompiente y los accesos.')
  ], spawns: [{ col: 14, row: 10 }, { col: 11, row: 9 }, { col: 15, row: 11 }, { col: 12, row: 10 }, { col: 14, row: 8 }],
  ambience: [{ id: 'surf-zone', kind: 'waves', density: .9 }, { id: 'coastal-haze', kind: 'mist', density: .30 }]
};

const cliffs: Scenario = {
  id: 'camp-cliffs-observatory', title: '04 · Acantilados del Observatorio', profile: 'cliff-observatory', canonStatus: 'vtt-ambience',
  safetyNotice: 'Meseta VTT_AMBIENCE previa al observatorio. Vivac austero y expuesto; decide el DM.',
  cols: 25, rows: 22, materialId: 'basalt', background: '/art/camp-rests/marker.svg',
  walkable: cell => rect(cell, 2, 22, 2, 18) && ellipse(cell, 25, 22, 12, 9.6, .04),
  blocked: [
    ...[[4,4],[20,5],[5,16],[19,16]].map(([col,row], i) => ({ cell: { col: col!, row: row! }, id: `basalt-pillar-${i + 1}` })),
    ...[[7,5],[18,7],[7,15],[18,14]].map(([col,row], i) => ({ cell: { col: col!, row: row! }, id: `arcane-crystal-${i + 1}` })),
    ...[[9,7],[10,7],[13,7],[8,9],[16,9]].map(([col,row], i) => ({ cell: { col: col!, row: row! }, id: `cliff-windbreak-${i + 1}` })),
    { cell: { col: 12, row: 10 }, id: 'cliff-fire' },
    { cell: { col: 11, row: 11 }, id: 'cliff-seat-a' }, { cell: { col: 14, row: 9 }, id: 'cliff-seat-b' }
  ],
  points: [
    ...campEquipmentPoints('cliff', {
      mia: { bed: { col: 9, row: 9 }, pack: { col: 9, row: 8 }, kit: { col: 10, row: 9 } },
      mike: { bed: { col: 11, row: 8 }, pack: { col: 12, row: 7 }, kit: { col: 11, row: 9 } },
      maria: { bed: { col: 14, row: 11 }, pack: { col: 15, row: 11 }, kit: { col: 13, row: 12 } }
    }, { cell: { col: 10, row: 9 }, objectCell: { col: 10, row: 8 }, label: 'Lona baja lastrada con rocas', description: 'Toldo muy bajo amarrado con cuerdas y piedras de anclaje contra el vendaval.' }),
    point('cliff-fire-point', 'Hoguera protegida', 'fire', { col: 12, row: 11 }, { col: 12, row: 10 }, 'Brasa recogida tras los bloques de basalto, con olla y poca leña.'),
    point('cliff-seat-a-point', 'Laja de basalto oeste', 'seat', { col: 10, row: 12 }, { col: 11, row: 11 }, 'Piedra plana natural al resguardo del viento.'),
    point('cliff-seat-b-point', 'Piedra plana este', 'seat', { col: 15, row: 9 }, { col: 14, row: 9 }, 'Laja oscura junto al rescoldo.'),
    point('cliff-guard-point', 'Cornisa del acantilado', 'guard', { col: 12, row: 3 }, { col: 12, row: 2 }, 'Saliente natural de basalto hacia el mar y las auroras.')
  ], spawns: [{ col: 13, row: 11 }, { col: 10, row: 11 }, { col: 15, row: 10 }, { col: 11, row: 12 }, { col: 14, row: 12 }],
  ambience: [{ id: 'cliff-wind-mist', kind: 'mist', density: .26 }, { id: 'cliff-embers', kind: 'embers', density: .25 }]
};

const cove: Scenario = {
  id: 'camp-coastal-refuge', title: '05 · Refugio costero de Pleamar', profile: 'coastal-refuge', canonStatus: 'vtt-ambience',
  safetyNotice: 'Refugio natural bajo bóveda rocosa. Sin lonas; las pozas de marea y los peligros de la costa siguen vigentes.',
  cols: 25, rows: 22, materialId: 'cave-rock', background: '/art/camp-rests/marker.svg',
  walkable: cell => ellipse(cell, 25, 22, 11.7, 9.4, .03),
  materialAt: cell => [[4,7],[5,7],[4,8],[19,8],[20,8],[20,9],[9,16],[10,16]].some(([col,row]) => cell.col === col && cell.row === row) ? 'water' : (cell.row >= 5 && cell.row <= 9 && cell.col >= 8 && cell.col <= 16 ? 'stone' : 'cave-rock'),
  water: [{ col: 4, row: 7 }, { col: 5, row: 7 }, { col: 4, row: 8 }, { col: 19, row: 8 }, { col: 20, row: 8 }, { col: 20, row: 9 }, { col: 9, row: 16 }, { col: 10, row: 16 }],
  blocked: [
    ...[[2,3],[5,3],[20,3],[22,6],[3,16],[21,16],[6,6],[18,5],[8,4],[17,4]].map(([col,row], i) => ({ cell: { col: col!, row: row! }, id: `cove-rock-${i + 1}` })),
    { cell: { col: 12, row: 10 }, id: 'cove-fire' },
    { cell: { col: 10, row: 10 }, id: 'cove-seat-a' }, { cell: { col: 14, row: 11 }, id: 'cove-seat-b' }
  ],
  points: [
    ...campEquipmentPoints('cove', {
      mia: { bed: { col: 9, row: 6 }, pack: { col: 8, row: 5 }, kit: { col: 9, row: 7 } },
      mike: { bed: { col: 12, row: 6 }, pack: { col: 12, row: 5 }, kit: { col: 11, row: 7 } },
      maria: { bed: { col: 15, row: 7 }, pack: { col: 16, row: 6 }, kit: { col: 14, row: 8 } }
    }),
    point('cove-fire-point', 'Hoguera junto a la boca', 'fire', { col: 12, row: 11 }, { col: 12, row: 10 }, 'Fuego contenido en depresión de roca con tiro de humo hacia el mar.'),
    point('cove-seat-a-point', 'Roca lisa interior', 'seat', { col: 10, row: 11 }, { col: 10, row: 10 }, 'Bloque seco de piedra junto a la zona elevada.'),
    point('cove-seat-b-point', 'Piedra cerca de la entrada', 'seat', { col: 14, row: 12 }, { col: 14, row: 11 }, 'Piedra plana seca al abrigo de la bóveda.'),
    point('cove-guard-point', 'Boca marina del refugio', 'guard', { col: 12, row: 14 }, { col: 13, row: 15 }, 'Vigilancia frente al oleaje de la entrada y las pozas.')
  ], spawns: [{ col: 13, row: 11 }, { col: 10, row: 12 }, { col: 14, row: 9 }, { col: 11, row: 11 }, { col: 11, row: 9 }],
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
    seats: spec.points.filter(item => item.kind === 'seat').map(item => ({
      id: item.id, label: item.label, cell: item.cell, surfaceId: SURFACE,
      position: { x: ((item.objectCell ?? item.cell).col + .5) * 1.5, z: ((item.objectCell ?? item.cell).row + .5) * 1.5, height: .56 },
      facing: 'south' as const
    })),
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
  wizard: { url: '/art/tokens/wizard.png', logicalWidth: 92, logicalHeight: 92, worldHeightMeters: 1.8, anchorX: .5, anchorY: .84 },
  cleric: { url: '/art/tokens/cleric.png', logicalWidth: 92, logicalHeight: 92, worldHeightMeters: 1.3, anchorX: .5, anchorY: .84 },
  rogue: { url: '/art/m3/trinity/maria_base.png', logicalWidth: 92, logicalHeight: 92, worldHeightMeters: 1.05, anchorX: .5, anchorY: .84 }
};
const artCycle = (stem: string, count: number, fps: number) => ({
  frames: Array.from({ length: count }, (_, index) => `/art/m3/trinity/${stem}_${String(index + 1).padStart(2, '0')}.png`), fps
});
const seated = (id: string) => ({ frames: [{ url: '/art/camp-seated-v1/' + id + '-seated.png', x: 0, y: 0, width: 1254, height: 1254, logicalWidth: 92, logicalHeight: 72, anchorX: .5, anchorY: .94 }], fps: 1 });
const campPoses = (id: string) => Object.fromEntries(
  ['warm', 'cook', 'tend-fire', 'prepare-bed', 'rest', 'study', 'pray', 'tools', 'guard', 'inspect', 'shelter'].map(action => [
    `camp-${action}`, action === 'rest' ? seated(id)
      : id === 'rogue' ? artCycle('maria_interactuar', 4, 7)
        : { frames: [`/art/tokens/${id}.png`], fps: 1 }
  ])
);
const tokenAnimations = { wizard: { sit: seated('wizard'), ...campPoses('wizard') }, cleric: { sit: seated('cleric'), ...campPoses('cleric') }, rogue: {
  ...campPoses('rogue'),
  sit: seated('rogue'),
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
    music: [
      { id: 'camp-rest-music', label: 'Campamentos · ambiente', description: 'Música ambiental tenue para la sesión.', url: '/audio/music-tempest.wav' },
      { id: 'camp-a1-music', label: 'Habitaciones A1 · santuario', description: 'Ambiente sereno para las habitaciones y el descanso.', url: '/audio/stormwreck/ambience/stormwreck-loop-sanctuary.mp3' },
      { id: 'camp-forest-pleamar-music', label: 'Bosque camino a Pleamar · campamento', description: 'Noche de bosque, arroyo y hoguera del claro.', url: '/audio/stormwreck/ambience/stormwreck-loop-forest-night.mp3' },
      { id: 'camp-wreck-beach-music', label: 'Playa del pecio · campamento', description: 'Oleaje y aire salino junto a la costa.', url: '/audio/stormwreck/ambience/stormwreck-loop-boat-waves.mp3' },
      { id: 'camp-cliffs-observatory-music', label: 'Acantilados del Observatorio · campamento', description: 'Viento frío y tormenta lejana en la meseta.', url: '/audio/stormwreck/ambience/stormwreck-loop-cliff-wind.ogg' },
      { id: 'camp-coastal-refuge-music', label: 'Refugio costero de Pleamar · campamento', description: 'Un respiro tranquilo bajo la protección del refugio.', url: '/audio/stormwreck/ambience/stormwreck-loop-sanctuary.mp3' }
    ],
    ambience: [
      { id: 'stormwreck-loop-ocean', label: 'Oleaje de la isla', description: 'Mar constante contra las rocas.', url: '/audio/ambient-ocean.wav', category: 'scene' as const, loopable: true },
      { id: 'stormwreck-loop-wind', label: 'Viento costero', description: 'Viento exterior y de acantilado.', url: '/audio/ambient-wind.wav', category: 'scene' as const, loopable: true },
      { id: 'stormwreck-loop-wood', label: 'Madera y refugio', description: 'Madera y elementos del campamento.', url: '/audio/ambient-wood.wav', category: 'scene' as const, loopable: true },
      { id: 'stormwreck-loop-storm', label: 'Clima y tormenta', description: 'Lluvia y viento sostenidos; el trueno intenso se dispara aparte.', url: '/audio/stormwreck/ambience/stormwreck-loop-storm.mp3', category: 'scene' as const, loopable: true },
      { id: 'stormwreck-loop-boat-waves', label: 'Oleaje contra la costa', description: 'Olas fuertes y espuma junto a las rocas.', url: '/audio/stormwreck/ambience/stormwreck-loop-boat-waves.mp3', category: 'scene' as const, loopable: true },
      { id: 'stormwreck-loop-cliff-wind', label: 'Viento del observatorio', description: 'Aire frío para la meseta de basalto.', url: '/audio/stormwreck/ambience/stormwreck-loop-cliff-wind.ogg', category: 'scene' as const, loopable: true },
      { id: 'stormwreck-loop-forest', label: 'Bosque de la isla', description: 'Vegetación y aves lejanas para las sendas de la isla.', url: '/audio/stormwreck/ambience/stormwreck-loop-forest-night.mp3', category: 'scene' as const, loopable: true },
      { id: 'stormwreck-loop-forest-fire', label: 'Hoguera del bosque', description: 'Fuego bajo y constante para el claro del campamento.', url: '/audio/stormwreck/ambience/stormwreck-loop-forest-fire.mp3', category: 'scene' as const, loopable: true },
      { id: 'stormwreck-loop-forest-river-01', label: 'Arroyo de Pleamar · I', description: 'Agua corriente para el bosque y los caminos de Pleamar.', url: '/audio/stormwreck/ambience/stormwreck-loop-forest-river-01.mp3', category: 'scene' as const, loopable: true },
      { id: 'stormwreck-loop-forest-river-02', label: 'Arroyo de Pleamar · II', description: 'Variante de agua corriente para alternar la capa del arroyo.', url: '/audio/stormwreck/ambience/stormwreck-loop-forest-river-02.mp3', category: 'scene' as const, loopable: true },
      { id: 'stormwreck-loop-sanctuary', label: 'Refugio sereno', description: 'Calma tenue de una zona protegida.', url: '/audio/stormwreck/ambience/stormwreck-loop-sanctuary.mp3', category: 'scene' as const, loopable: true },
      { id: 'camp-loop-drips-v1', label: 'Goteos del abrigo', description: 'Gotas espaciadas y humedad bajo la roca. Ambiente original.', url: '/audio/camp-final-v1/sheltered-drips.wav', category: 'scene' as const, loopable: true },
      { id: 'camp-loop-thunder-v1', label: 'Truenos lejanos', description: 'Retumbo tenue detrás del viento. Ambiente original.', url: '/audio/camp-final-v1/distant-thunder.wav', category: 'scene' as const, loopable: true }
    ],
    sfx: [{ id: 'stormwreck-sfx-heavy-thunder', label: 'Trueno intenso · Pleamar', description: 'Impacto de trueno de unos 5 segundos; efecto puntual, no ambiente ni bucle.', url: '/audio/stormwreck/sfx/stormwreck-sfx-heavy-thunder.mp3', category: 'scene' as const }]
  }
};
const loopProfile = (wind: string, ocean: string, wood = 'stormwreck-loop-forest-fire', storm = 'stormwreck-loop-storm') => ({
  music: { id: 'camp-rest-music', playing: false, volume: .08 },
  layers: {
    ocean: { id: ocean, playing: ocean !== 'stormwreck-loop-ocean' || wind.includes('coast'), volume: .28 },
    wind: { id: wind, playing: true, volume: .22 }, wood: { id: wood, playing: true, volume: .1 }, storm: { id: storm, playing: false, volume: .16 }
  }
});
const observatoryAudio = loopProfile('stormwreck-loop-cliff-wind', 'stormwreck-loop-ocean');
observatoryAudio.layers.storm = { id: 'stormwreck-loop-storm', playing: true, volume: .11 };
observatoryAudio.layers.ocean = { id: 'camp-loop-thunder-v1', playing: true, volume: .17 };
const forestPleamarAudio = loopProfile('stormwreck-loop-forest', 'stormwreck-loop-forest-river-01', 'stormwreck-loop-forest-fire');
forestPleamarAudio.layers.ocean = { id: 'stormwreck-loop-forest-river-01', playing: true, volume: .16 };
forestPleamarAudio.layers.wind = { id: 'stormwreck-loop-forest', playing: true, volume: .19 };
forestPleamarAudio.layers.wood = { id: 'stormwreck-loop-forest-fire', playing: true, volume: .09 };
const refugeAudio = loopProfile('stormwreck-loop-sanctuary', 'stormwreck-loop-ocean');
refugeAudio.layers.ocean = { id: 'stormwreck-loop-ocean', playing: true, volume: .1 };
refugeAudio.layers.wind = { id: 'stormwreck-loop-sanctuary', playing: true, volume: .13 };
refugeAudio.layers.storm = { id: 'camp-loop-drips-v1', playing: true, volume: .12 };
audio.sceneProfiles = {
  'camp-a1-rooms': { ...loopProfile('stormwreck-loop-sanctuary', 'stormwreck-loop-ocean'), layers: { ...loopProfile('stormwreck-loop-sanctuary', 'stormwreck-loop-ocean').layers, ocean: { id: 'stormwreck-loop-ocean', playing: false, volume: .08 }, wind: { id: 'stormwreck-loop-sanctuary', playing: true, volume: .12 } } },
  'camp-forest-pleamar': { ...forestPleamarAudio, recommendedSfx: ['stormwreck-sfx-heavy-thunder'] },
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
