import { validatePublicCampaign, type Cell, type PublicCampaignDefinition } from '../../../engine/shared/campaign.js';
import { D8NIGHT } from '../playground/d8night.config.js';
import { d8MotionAtlases } from './generated-motion-atlases.js';
import { d8DirectionAtlases } from './generated-direction-atlases.js';

export const D8_SCENE_IDS = ['temple', 'cafe', 'dinner', 'garden', 'market', 'mirror'] as const;
export type D8SceneId = typeof D8_SCENE_IDS[number];
export const D8_GRID_METERS = 1.5;

export function d8SceneGrid(sceneId: D8SceneId) {
  const size = D8NIGHT.maps[sceneId].MAP.size as [number, number];
  const cols = Math.max(1, Math.round(size[0] / D8_GRID_METERS));
  const rows = Math.max(1, Math.round(size[1] / D8_GRID_METERS));
  const tileSize = 48;
  return { cols, rows, tileSize, originX: 0, originY: 0, width: cols * tileSize, height: rows * tileSize };
}

export function d8CellToWorld(sceneId: D8SceneId, cell: Cell) {
  const size = D8NIGHT.maps[sceneId].MAP.size as [number, number];
  const grid = d8SceneGrid(sceneId);
  return { x: -size[0] / 2 + (cell.col + 0.5) * size[0] / grid.cols, z: -size[1] / 2 + (cell.row + 0.5) * size[1] / grid.rows };
}

export function d8CellFromWorld(sceneId: D8SceneId, x: number, z: number): Cell {
  const size = D8NIGHT.maps[sceneId].MAP.size as [number, number];
  const grid = d8SceneGrid(sceneId);
  return {
    col: Math.max(0, Math.min(grid.cols - 1, Math.floor((x + size[0] / 2) * grid.cols / size[0]))),
    row: Math.max(0, Math.min(grid.rows - 1, Math.floor((z + size[1] / 2) * grid.rows / size[1])))
  };
}

function d8Walkable(sceneId: D8SceneId): Cell[] {
  const config = D8NIGHT.maps[sceneId], grid = d8SceneGrid(sceneId), size = config.MAP.size as [number, number];
  const nav = config.MAP.navigation ?? {}, zones = nav.zones ?? [];
  const passableTypes = new Set(['walkable', 'entry', 'stairs', 'bridge', 'difficult']);
  const blockedTypes = new Set(['water', 'hazard', 'blocked']);
  const contains = (shape: any, x: number, z: number) => Boolean(shape?.position && shape?.size
    && x >= shape.position[0] - shape.size[0] / 2 && x <= shape.position[0] + shape.size[0] / 2
    && z >= shape.position[1] - shape.size[1] / 2 && z <= shape.position[1] + shape.size[1] / 2);
  const blockers = [...(nav.blockers ?? []), ...(config.MAP.objects ?? []).filter((object: any) => object.asset === 'collider_only')];
  const bounds = nav.bounds as [number, number, number, number] | undefined;
  const result: Cell[] = [];
  for (let row = 0; row < grid.rows; row++) for (let col = 0; col < grid.cols; col++) {
    const { x, z } = d8CellToWorld(sceneId, { col, row });
    if (bounds && (x < bounds[0] || x > bounds[1] || z < bounds[2] || z > bounds[3])) continue;
    const here = zones.filter((zone: any) => contains(zone, x, z));
    const bridge = here.some((zone: any) => zone.type === 'bridge' || zone.type === 'stairs');
    const allowed = here.some((zone: any) => passableTypes.has(zone.type) && !zone.blocking);
    const denied = here.some((zone: any) => (blockedTypes.has(zone.type) || zone.blocking) && !bridge)
      || blockers.some((blocker: any) => contains(blocker, x, z));
    if (allowed && !denied) result.push({ col, row });
  }
  return result;
}

export function d8NearestWalkableCell(sceneId: D8SceneId, x: number, z: number): Cell {
  return nearestWalkable(sceneId, d8CellFromWorld(sceneId, x, z), d8Walkable(sceneId));
}

export function d8AdjacentWalkableCells(sceneId: D8SceneId, center: Cell, count = 4): Cell[] {
  const walkable = d8Walkable(sceneId), used = new Set<string>([`${center.col},${center.row}`]);
  return [...walkable].sort((a, b) => Math.abs(a.col - center.col) + Math.abs(a.row - center.row)
    - Math.abs(b.col - center.col) - Math.abs(b.row - center.row) || a.row - b.row || a.col - b.col)
    .filter(cell => {
      const distance = Math.abs(cell.col - center.col) + Math.abs(cell.row - center.row);
      const key = `${cell.col},${cell.row}`;
      if (!distance || used.has(key)) return false;
      used.add(key); return true;
    }).slice(0, count);
}

function remapLegacyCell(sceneId: D8SceneId, cell: Cell, legacyCols: number, legacyRows: number): Cell {
  const size = D8NIGHT.maps[sceneId].MAP.size as [number, number];
  const x = -size[0] / 2 + (cell.col + 0.5) * size[0] / legacyCols;
  const z = -size[1] / 2 + (cell.row + 0.5) * size[1] / legacyRows;
  return d8CellFromWorld(sceneId, x, z);
}

function nearestWalkable(sceneId: D8SceneId, cell: Cell, walkable: Cell[]): Cell {
  const allowed = new Set(walkable.map(item => `${item.col},${item.row}`));
  if (allowed.has(`${cell.col},${cell.row}`)) return cell;
  return [...walkable].sort((a, b) => Math.abs(a.col - cell.col) + Math.abs(a.row - cell.row)
    - Math.abs(b.col - cell.col) - Math.abs(b.row - cell.row) || a.row - b.row || a.col - b.col)[0] ?? cell;
}

function d8PartySpawns(sceneId: D8SceneId, walkable: Cell[]): Cell[] {
  const config = D8NIGHT.maps[sceneId], center = d8CellFromWorld(sceneId, config.spawn[0], config.spawn[2]);
  const sorted = [...walkable].sort((a, b) => Math.abs(a.col - center.col) + Math.abs(a.row - center.row)
    - Math.abs(b.col - center.col) - Math.abs(b.row - center.row) || a.row - b.row || a.col - b.col);
  const result: Cell[] = [];
  for (const cell of sorted) {
    if (result.some(other => Math.abs(other.col - cell.col) + Math.abs(other.row - cell.row) < 1)) continue;
    result.push(cell);
    if (result.length === 3) break;
  }
  return result.length ? result : [center];
}

// Provisional authoring grid: 48 logical pixels per 1.5m D&D cell. Individual
// walkable borders and furniture still require a DM visual pass before play.
const baseGrid = { cols: 32, rows: 21, tileSize: 48, originX: 0, originY: 8, width: 1536, height: 1024 };
const gardenGrid = { ...baseGrid, cols: 29, width: 1411 };
const rectangle = (left: number, top: number, right: number, bottom: number): Cell[] => {
  const result: Cell[] = [];
  for (let row = top; row <= bottom; row++) for (let col = left; col <= right; col++) result.push({ col, row });
  return result;
};
const without = (source: Cell[], blocked: Cell[]) => {
  const keys = new Set(blocked.map(cell => `${cell.col},${cell.row}`));
  return source.filter(cell => !keys.has(`${cell.col},${cell.row}`));
};
const actor = (id: string, label: string, tokenId: string, col: number, row: number) => ({
  id, label, tokenId, cell: { col, row }
});
const npcToken = (slug: string) => ({ url: `/art/tokens/${slug}.png`, logicalWidth: 76, logicalHeight: 76, anchorX: 0.5, anchorY: 0.8 });
const pcToken = (slug: string, worldHeightMeters = 1.65) => ({ url: `/art/tokens/${slug}.png`, logicalWidth: 92, logicalHeight: 92, worldHeightMeters, anchorX: 0.5, anchorY: 0.84 });
const tokenFrame = (path: string) => `/art/tokens/${path}.png`;
const tokenFrames = (...paths: string[]) => paths.map(tokenFrame);
const tallNpcToken = (path: string) => ({ url: tokenFrame(path), logicalWidth: 76, logicalHeight: 104, anchorX: 0.5, anchorY: 0.9 });
const mariaFrame = (state: string, frame?: number) => tokenFrame(`Maria Trinity D8/maria_${state}${frame === undefined ? '' : `_${String(frame).padStart(2, '0')}`}`);
const mariaFrames = (state: string, count: number) => Array.from({ length: count }, (_item, index) => mariaFrame(state, index + 1));
const mariaAtlasCycle = (atlas: string, row: number, fps: number, flipX = false) => ({
  frames: Array.from({ length: 4 }, (_item, index) => ({
    url: mariaFrame(atlas), x: index * 313, y: row * 627, width: 313, height: 580,
    logicalWidth: 68, logicalHeight: 108, anchorY: 0.9
  })),
  fps,
  ...(flipX ? { flipX: true } : {})
});
const mariaWalkDirections = {
  'direction-n': mariaAtlasCycle('walk_sw_n_sheet', 1, 8),
  'direction-ne': mariaAtlasCycle('walk_w_nw_sheet', 1, 8, true),
  'direction-e': mariaAtlasCycle('walk_w_nw_sheet', 0, 8, true),
  'direction-se': mariaAtlasCycle('walk_sw_n_sheet', 0, 8, true),
  'direction-s': { frames: mariaFrames('caminar', 4), fps: 8 },
  'direction-sw': mariaAtlasCycle('walk_sw_n_sheet', 0, 8),
  'direction-w': mariaAtlasCycle('walk_w_nw_sheet', 0, 8),
  'direction-nw': mariaAtlasCycle('walk_w_nw_sheet', 1, 8)
};
const mariaRunDirections = {
  'running-n': mariaAtlasCycle('run_sw_n_sheet', 1, 10),
  'running-ne': mariaAtlasCycle('run_w_nw_sheet', 1, 10, true),
  'running-e': mariaAtlasCycle('run_w_nw_sheet', 0, 10, true),
  'running-se': mariaAtlasCycle('run_sw_n_sheet', 0, 10, true),
  'running-s': { frames: mariaFrames('correr', 4), fps: 10 },
  'running-sw': mariaAtlasCycle('run_sw_n_sheet', 0, 10),
  'running-w': mariaAtlasCycle('run_w_nw_sheet', 0, 10),
  'running-nw': mariaAtlasCycle('run_w_nw_sheet', 1, 10)
};
const mariaDaggerDirections = {
  'attack-n': mariaAtlasCycle('dagger_sw_n_4x2', 1, 10),
  'attack-ne': mariaAtlasCycle('dagger_w_nw_4x2', 1, 10, true),
  'attack-e': mariaAtlasCycle('dagger_w_nw_4x2', 0, 10, true),
  'attack-se': mariaAtlasCycle('dagger_sw_n_4x2', 0, 10, true),
  'attack-s': { frames: mariaFrames('ataque_daga', 5), fps: 10 },
  'attack-sw': mariaAtlasCycle('dagger_sw_n_4x2', 0, 10),
  'attack-w': mariaAtlasCycle('dagger_w_nw_4x2', 0, 10),
  'attack-nw': mariaAtlasCycle('dagger_w_nw_4x2', 1, 10)
};
const silverfarbenFrame = (state: string, frame?: number) => `/art/tokens/Silverfarben Hotel/silverfarben_hotel_${state}${frame === undefined ? '' : `_${String(frame).padStart(2, '0')}`}.png`;
const silverfarbenFrames = (state: string, count: number) => Array.from({ length: count }, (_item, index) => silverfarbenFrame(state, index + 1));
const silverfarbenAtlases = {
  walk: { state: 'walk_orientations_atlas', width: 1448, height: 1086, rows: 3 },
  run: { state: 'run_orientations_atlas', width: 1122, height: 1402, rows: 5 },
  combat: { state: 'combat_actions_atlas', width: 1448, height: 1086, rows: 3 }
} as const;
const silverfarbenActionAtlasCycle = (row: number, fps: number, flipX = false) => {
  const columns = 4, width = 1024, height = 1536, rows = 6;
  const y = Math.floor(row * height / rows), bottom = Math.floor((row + 1) * height / rows);
  return {
    frames: Array.from({ length: columns }, (_item, column) => {
      const x = Math.floor(column * width / columns), right = Math.floor((column + 1) * width / columns);
      return { url: silverfarbenFrame('exploration_actions_atlas'), x, y, width: right - x, height: bottom - y, logicalWidth: 92, logicalHeight: 92, anchorY: .84 };
    }),
    fps,
    ...(flipX ? { flipX: true } : {})
  };
};
const silverfarbenAtlasCycle = (atlasId: keyof typeof silverfarbenAtlases, row: number, fps: number, flipX = false) => {
  const atlas = silverfarbenAtlases[atlasId], columns = 4;
  const y = Math.floor(row * atlas.height / atlas.rows), bottom = Math.floor((row + 1) * atlas.height / atlas.rows);
  return {
    frames: Array.from({ length: columns }, (_item, column) => {
      const x = Math.floor(column * atlas.width / columns), right = Math.floor((column + 1) * atlas.width / columns);
      return { url: silverfarbenFrame(atlas.state), x, y, width: right - x, height: bottom - y, logicalWidth: 92, logicalHeight: 92, anchorY: .84 };
    }),
    fps,
    ...(flipX ? { flipX: true } : {})
  };
};
const d8NpcAtlasCycle = (path: string, width: number, height: number, rows: number, row: number, fps: number) => {
  const columns = 4, y = Math.floor(row * height / rows), bottom = Math.floor((row + 1) * height / rows);
  return {
    frames: Array.from({ length: columns }, (_item, column) => {
      const x = Math.floor(column * width / columns), right = Math.floor((column + 1) * width / columns);
      return { url: tokenFrame(path), x, y, width: right - x, height: bottom - y, logicalWidth: 76, logicalHeight: 104, anchorY: .9 };
    }),
    fps
  };
};

const definition: PublicCampaignDefinition = {
  schemaVersion: 2, campaignId: 'd8-night-private', version: '0.3.0-dev.3', title: 'D8 Night · mesa privada', initialSceneId: 'temple',
  scenes: [
    { id: 'temple', title: 'Templo de Sylvania · pacto', surfaceId: 'ruins', movementEnabled: true,
      background: '/art/temple.png', grid: baseGrid,
      walkable: without(rectangle(3, 2, 28, 19), rectangle(13, 7, 19, 10)),
      spawns: [{ col: 14, row: 16 }, { col: 16, row: 16 }, { col: 18, row: 16 }], props: [], waves: false,
      stageActors: [actor('anteros-temple', 'Anteros', 'anteros', 23, 11)] },
    { id: 'garden', title: 'Jardín de la señorita Fritz', surfaceId: 'garden', movementEnabled: true,
      background: '/art/garden.png', grid: gardenGrid, walkable: rectangle(2, 4, 26, 18),
      spawns: [{ col: 4, row: 11 }, { col: 5, row: 11 }, { col: 6, row: 11 }], props: [], waves: false,
      stageActors: [actor('fritz-garden', 'Señorita Fritz', 'fritz', 22, 11), actor('rose-garden-1', 'Rosa asesina', 'roses', 16, 9), actor('rose-garden-2', 'Rosa asesina', 'roses', 18, 13)] },
    { id: 'cafe', title: 'Café No-Me-Olvides', surfaceId: 'cafe', movementEnabled: true,
      background: '/art/cafe.png', grid: baseGrid,
      walkable: without(rectangle(3, 3, 29, 18), [...rectangle(7, 3, 23, 7), ...rectangle(19, 10, 23, 15), ...rectangle(8, 9, 11, 12), ...rectangle(14, 12, 17, 14)]),
      spawns: [{ col: 13, row: 17 }, { col: 15, row: 17 }, { col: 17, row: 17 }], props: [], waves: false,
      stageActors: [actor('bartender-cafe', 'Tabernero', 'bartender', 24, 6),
        actor('patron-cafe', 'Parroquiano', 'patron', 26, 12), actor('woman-cafe', 'Aldeana', 'patron-woman', 7, 13)] },
    { id: 'market', title: 'Mercado Nocturno', surfaceId: 'market', movementEnabled: true,
      background: '/art/market.png', grid: baseGrid, walkable: without(rectangle(2, 3, 29, 18), [...rectangle(3, 3, 9, 5), ...rectangle(11, 3, 17, 5), ...rectangle(20, 3, 26, 5), ...rectangle(9, 6, 15, 8), ...rectangle(17, 7, 20, 9), ...rectangle(3, 10, 9, 12), ...rectangle(22, 10, 26, 13), ...rectangle(10, 15, 11, 17)]),
      spawns: [{ col: 13, row: 16 }, { col: 15, row: 16 }, { col: 17, row: 16 }], props: [], waves: false,
      stageActors: [actor('ben-market', 'Ben', 'ben', 18, 6), actor('margaret-market', 'Margaret', 'margaret', 21, 6), actor('cow-market', 'Vaca', 'cow', 17, 13),
        // The old 25,12 placement was inside the green market stall.
        actor('boris-market', 'Boris el Carnicero', 'boris', 20, 13)] },
    { id: 'mirror', title: 'Espejo de plata del amor verdadero', surfaceId: 'ice', movementEnabled: true,
      background: '/art/mirror.png', grid: baseGrid, walkable: rectangle(3, 4, 29, 17),
      spawns: [{ col: 5, row: 11 }, { col: 6, row: 11 }, { col: 7, row: 11 }], props: [
        { id: 'true-love-mirror', kind: 'crate', label: 'Espejo del amor verdadero', assetId: 'true-love-mirror', cell: { col: 17, row: 10 }, rotation: 0, baseFootprint: [{ col: 0, row: 0 }], allowedRotations: [0], capabilities: { transform: true, detach: false, structure: false }, sourceKind: 'official' }
      ], waves: false },
    { id: 'dinner', title: 'Cena con Anteros · desenlace', surfaceId: 'village', movementEnabled: true,
      background: '/art/dinner.png', grid: baseGrid, walkable: rectangle(3, 4, 29, 18),
      spawns: [{ col: 13, row: 14 }, { col: 15, row: 14 }, { col: 17, row: 14 }], props: [], waves: false,
      stageActors: [actor('anteros-dinner', 'Anteros', 'anteros-dinner', 15, 12)] }
  ],
  roster: [
    { id: 'maria', label: 'Maria Piesligeros', archetype: 'Pícara mediana · nivel 1', color: '#b66dc4', tokenId: 'rogue' },
    // Silverfarben Hotel es la identidad visual de la ficha que antes se
    // mostraba como Aoife. Conserva sus estadísticas, no crea un tercer PJ.
    { id: 'aoife', label: 'Silverfarben Hotel', archetype: 'Maga enana de las montañas · nivel 1', color: '#c6ccd9', tokenId: 'silverfarben-hotel' }
  ],
  tokens: {
    wizard: pcToken('wizard'), cleric: pcToken('cleric'),
    // La ficha confirma tamaño Pequeño, pero no rellena la altura individual.
    // El arte de Maria ocupa 96.3% del lienzo: 0.94 m dan una silueta de ~0.9 m
    // sobre una cuadrícula de 1.5 m, sin confundir margen PNG con estatura.
    rogue: pcToken('Maria Trinity D8/maria_base', 0.94),
    'silverfarben-hotel': { ...pcToken('Silverfarben Hotel/silverfarben_hotel_base', 1.37), portraitUrl: tokenFrame('Silverfarben Hotel/silverfarben_hotel_portrait_normal') },
    anteros: { ...tallNpcToken('Anteros/anteros_base'), portraitUrl: tokenFrame('Anteros/anteros_portrait_normal') },
    // La cena usa una pose propia: así Anteros no aparece de pie junto a la mesa.
    'anteros-dinner': { ...tallNpcToken('Anteros/anteros_dinner_idle'), portraitUrl: tokenFrame('Anteros/anteros_portrait_normal') },
    fritz: tallNpcToken('Señorita Fritz/senorita_fritz_base'), roses: tallNpcToken('Rosas asesinas/rosa_asesina_base'),
    patron: tallNpcToken('patron-d8-v3'), bartender: tallNpcToken('bartender-d8-v3'), 'patron-woman': tallNpcToken('Aldeana del café/aldeano_base_sentado'),
    ben: tallNpcToken('Ben, Margaret, Vaca, Carnicero/Ben/ben_base'), margaret: tallNpcToken('Ben, Margaret, Vaca, Carnicero/Margaret/margaret_base'), boris: tallNpcToken('Ben, Margaret, Vaca, Carnicero/Carnicero/boris_base'), cow: { url: tokenFrame('Ben, Margaret, Vaca, Carnicero/Vaca/vaca_base'), logicalWidth: 118, logicalHeight: 92, anchorX: 0.5, anchorY: 0.84 },
    reflection: npcToken('reflection-v2')
  },
  tokenAnimations: {
    rogue: {
      idle: { frames: mariaFrames('idle', 4), fps: 4 },
      moving: { frames: mariaFrames('caminar', 4), fps: 8 },
      'combat-idle': { frames: mariaFrames('combate_idle', 3), fps: 4 },
      ready: { frames: mariaFrames('combate_idle', 3), fps: 4 },
      running: { frames: mariaFrames('correr', 4), fps: 10 },
      ...mariaWalkDirections,
      ...mariaRunDirections,
      attack: { frames: mariaFrames('ataque_daga', 5), fps: 10 },
      ...mariaDaggerDirections,
      'attack-arrow': { frames: mariaFrames('disparo_arco', 6), fps: 10 },
      'attack-arrow-mirrored': { frames: mariaFrames('disparo_arco', 6), fps: 10, flipX: true },
      'attack-throw': { frames: mariaFrames('lanzar_daga', 3), fps: 10 },
      'attack-throw-mirrored': { frames: mariaFrames('lanzar_daga', 3), fps: 10, flipX: true },
      talk: { frames: mariaFrames('interactuar', 4), fps: 7 },
      interact: { frames: mariaFrames('interactuar', 4), fps: 7 },
      search: { frames: mariaFrames('interactuar', 4), fps: 7 },
      study: { frames: mariaFrames('interactuar', 4), fps: 7 },
      spell: { frames: mariaFrames('interactuar', 4), fps: 7 },
      dodge: { frames: mariaFrames('sigilo', 4), fps: 7 },
      stealth: { frames: mariaFrames('sigilo', 4), fps: 7 },
      climb: { frames: mariaFrames('trepar', 4), fps: 7 },
      swim: { frames: mariaFrames('nadar', 4), fps: 7 },
      swimming: { frames: mariaFrames('nadar', 4), fps: 7 },
      jump: { frames: mariaFrames('saltar', 3), fps: 8 },
      jumping: { frames: mariaFrames('saltar', 3), fps: 8 },
      hit: { frames: mariaFrames('hit', 3), fps: 10 },
      prone: { frames: [mariaFrame('07_derribada')], fps: 1 },
      crawl: { frames: mariaFrames('arrastrarse', 3), fps: 6 },
      defeated: { frames: [mariaFrame('12_inconsciente')], fps: 1 }
    },
    'silverfarben-hotel': {
      idle: { frames: silverfarbenFrames('idle', 4), fps: 3 },
      moving: { frames: silverfarbenFrames('caminar', 4), fps: 8 },
      // Los ciclos creados desde sus PNG cubren norte, noreste y perfil; el
      // ciclo original cubre sur y sus dos diagonales delanteras. Se espejan
      // solo las orientaciones oeste para conservar ocho rumbos coherentes.
      'moving-n': silverfarbenAtlasCycle('walk', 0, 8),
      'moving-ne': silverfarbenAtlasCycle('walk', 1, 8),
      'moving-nw': silverfarbenAtlasCycle('walk', 1, 8, true),
      'moving-e': silverfarbenAtlasCycle('walk', 2, 8),
      'moving-w': silverfarbenAtlasCycle('walk', 2, 8, true),
      'moving-s': { frames: silverfarbenFrames('caminar', 4), fps: 8 },
      'moving-se': { frames: silverfarbenFrames('caminar', 4), fps: 8 },
      'moving-sw': { frames: silverfarbenFrames('caminar', 4), fps: 8, flipX: true },
      running: silverfarbenAtlasCycle('run', 0, 10),
      'running-s': silverfarbenAtlasCycle('run', 0, 10),
      'running-se': silverfarbenAtlasCycle('run', 1, 10),
      'running-sw': silverfarbenAtlasCycle('run', 1, 10, true),
      'running-n': silverfarbenAtlasCycle('run', 2, 10),
      'running-ne': silverfarbenAtlasCycle('run', 3, 10),
      'running-nw': silverfarbenAtlasCycle('run', 3, 10, true),
      'running-e': silverfarbenAtlasCycle('run', 4, 10),
      'running-w': silverfarbenAtlasCycle('run', 4, 10, true),
      'combat-idle': { frames: silverfarbenFrames('combate_idle', 3), fps: 4 },
      attack: silverfarbenAtlasCycle('combat', 0, 6),
      'attack-arrow': silverfarbenAtlasCycle('combat', 1, 5),
      'attack-arrow-mirrored': silverfarbenAtlasCycle('combat', 1, 5, true),
      'attack-throw': silverfarbenAtlasCycle('combat', 2, 5.7),
      'attack-throw-mirrored': silverfarbenAtlasCycle('combat', 2, 5.7, true),
      spell: { frames: silverfarbenFrames('hechizo', 4), fps: 11 },
      hit: { frames: silverfarbenFrames('hit', 2), fps: 9 },
      defeated: { frames: [silverfarbenFrame('derrotada')], fps: 1 },
      prone: { frames: [silverfarbenFrame('arrastrarse', 1)], fps: 1 },
      crawl: { frames: silverfarbenFrames('arrastrarse', 4), fps: 4 },
      interact: silverfarbenActionAtlasCycle(3, 5),
      talk: silverfarbenActionAtlasCycle(0, 5),
      search: silverfarbenActionAtlasCycle(1, 5),
      study: silverfarbenActionAtlasCycle(2, 4),
      swimming: { frames: silverfarbenFrames('nadar', 4), fps: 7 },
      swim: { frames: silverfarbenFrames('nadar', 4), fps: 7 },
      jump: { frames: silverfarbenFrames('saltar', 3), fps: 9 },
      jumping: { frames: silverfarbenFrames('saltar', 3), fps: 9 },
      dodge: silverfarbenActionAtlasCycle(4, 10),
      stealth: { frames: silverfarbenFrames('sigilo', 4), fps: 6 },
      ready: silverfarbenActionAtlasCycle(5, 5),
      climbing: { frames: silverfarbenFrames('trepar', 4), fps: 6 },
      climb: { frames: silverfarbenFrames('trepar', 4), fps: 6 },
      'direction-n': silverfarbenAtlasCycle('walk', 0, 6),
      'direction-ne': silverfarbenAtlasCycle('walk', 1, 6),
      'direction-e': silverfarbenAtlasCycle('walk', 2, 6),
      'direction-se': { frames: silverfarbenFrames('caminar', 4), fps: 6 },
      'direction-s': { frames: silverfarbenFrames('caminar', 4), fps: 6 },
      'direction-sw': { frames: silverfarbenFrames('caminar', 4), fps: 6, flipX: true },
      'direction-w': silverfarbenAtlasCycle('walk', 2, 6, true),
      'direction-nw': silverfarbenAtlasCycle('walk', 1, 6, true)
    },
    anteros: {
      idle: { frames: [tokenFrame('Anteros/anteros_base')], fps: 1 },
      moving: d8NpcAtlasCycle('Anteros/anteros_actions_atlas', 1122, 1402, 5, 0, 8),
      'combat-idle': { frames: [tokenFrame('Anteros/anteros_base')], fps: 1 },
      attack: d8NpcAtlasCycle('Anteros/anteros_combat_atlas', 1448, 1086, 3, 0, 7),
      'attack-arrow': d8NpcAtlasCycle('Anteros/anteros_combat_atlas', 1448, 1086, 3, 1, 6),
      spell: d8NpcAtlasCycle('Anteros/anteros_combat_atlas', 1448, 1086, 3, 2, 5),
      talk: d8NpcAtlasCycle('Anteros/anteros_actions_atlas', 1122, 1402, 5, 1, 3),
      sit: d8NpcAtlasCycle('Anteros/anteros_actions_atlas', 1122, 1402, 5, 4, 2),
      react: d8NpcAtlasCycle('Anteros/anteros_actions_atlas', 1122, 1402, 5, 2, 7),
      transform: d8NpcAtlasCycle('Anteros/anteros_actions_atlas', 1122, 1402, 5, 3, 4),
      hit: d8NpcAtlasCycle('Anteros/anteros_actions_atlas', 1122, 1402, 5, 2, 8),
      defeated: { frames: [tokenFrame('Anteros/anteros_defeated')], fps: 1 }
    },
    'anteros-dinner': {
      idle: { frames: [tokenFrame('Anteros/anteros_dinner_idle')], fps: 1 },
      moving: d8NpcAtlasCycle('Anteros/anteros_actions_atlas', 1122, 1402, 5, 0, 8),
      attack: d8NpcAtlasCycle('Anteros/anteros_combat_atlas', 1448, 1086, 3, 0, 7),
      'attack-arrow': d8NpcAtlasCycle('Anteros/anteros_combat_atlas', 1448, 1086, 3, 1, 6),
      spell: d8NpcAtlasCycle('Anteros/anteros_combat_atlas', 1448, 1086, 3, 2, 5),
      talk: d8NpcAtlasCycle('Anteros/anteros_actions_atlas', 1122, 1402, 5, 4, 3),
      sit: d8NpcAtlasCycle('Anteros/anteros_actions_atlas', 1122, 1402, 5, 4, 2),
      react: d8NpcAtlasCycle('Anteros/anteros_actions_atlas', 1122, 1402, 5, 4, 3),
      transform: d8NpcAtlasCycle('Anteros/anteros_actions_atlas', 1122, 1402, 5, 3, 4),
      hit: d8NpcAtlasCycle('Anteros/anteros_actions_atlas', 1122, 1402, 5, 2, 8),
      defeated: { frames: [tokenFrame('Anteros/anteros_defeated')], fps: 1 }
    },
    roses: {
      idle: { frames: [tokenFrame('Rosas asesinas/rosa_asesina_base'), tokenFrame('Rosas asesinas/rosa_asesina_idle_hostil')], fps: 2 },
      moving: { frames: tokenFrames('Rosas asesinas/rosa_asesina_mover_01', 'Rosas asesinas/rosa_asesina_mover_02'), fps: 7 },
      'combat-idle': { frames: [tokenFrame('Rosas asesinas/rosa_asesina_idle_hostil')], fps: 1 },
      attack: { frames: tokenFrames('Rosas asesinas/rosa_asesina_ataque_espinas_01', 'Rosas asesinas/rosa_asesina_ataque_espinas_02'), fps: 9 },
      entangle: { frames: [tokenFrame('Rosas asesinas/rosa_asesina_enredar')], fps: 1 },
      hit: { frames: [tokenFrame('Rosas asesinas/rosa_asesina_hit')], fps: 1 },
      defeated: { frames: [tokenFrame('Rosas asesinas/rosa_asesina_destruida')], fps: 1 }
    },
    fritz: {
      idle: { frames: tokenFrames('Señorita Fritz/senorita_fritz_idle_01', 'Señorita Fritz/senorita_fritz_idle_02'), fps: 2 },
      moving: { frames: tokenFrames('Señorita Fritz/senorita_fritz_caminar_01', 'Señorita Fritz/senorita_fritz_caminar_02'), fps: 7 },
      running: { frames: tokenFrames('Señorita Fritz/senorita_fritz_correr_01', 'Señorita Fritz/senorita_fritz_correr_02'), fps: 10 },
      attack: d8NpcAtlasCycle('Ben, Margaret, Vaca, Carnicero/villager_unarmed_attack_atlas', 1295, 1214, 4, 0, 7),
      hit: { frames: tokenFrames('Señorita Fritz/senorita_fritz_hit_01', 'Señorita Fritz/senorita_fritz_hit_02'), fps: 8 },
      defeated: { frames: [tokenFrame('Señorita Fritz/senorita_fritz_caida_suelo')], fps: 1 }
    },
    'patron-woman': {
      idle: { frames: tokenFrames('Aldeana del café/aldeano_base_sentado', 'Aldeana del café/aldeano_sentado_idle'), fps: 2 },
      moving: d8NpcAtlasCycle('Aldeana del café/aldeano_motion_atlas', 1448, 1086, 3, 1, 8),
      talk: d8NpcAtlasCycle('Aldeana del café/aldeano_motion_atlas', 1448, 1086, 3, 0, 3),
      drink: { frames: tokenFrames('Aldeana del café/aldeano_beber_01', 'Aldeana del café/aldeano_beber_02'), fps: 2 },
      react: d8NpcAtlasCycle('Aldeana del café/aldeano_motion_atlas', 1448, 1086, 3, 2, 4),
      attack: d8NpcAtlasCycle('Aldeana del café/aldeano_unarmed_attack_atlas', 1448, 1086, 3, 0, 7),
      hit: d8NpcAtlasCycle('Aldeana del café/aldeano_motion_atlas', 1448, 1086, 3, 2, 8)
    },
    bartender: {
      idle: d8NpcAtlasCycle('bartender-actions-atlas', 1261, 1247, 4, 0, 2),
      talk: d8NpcAtlasCycle('bartender-actions-atlas', 1261, 1247, 4, 1, 3),
      serve: d8NpcAtlasCycle('bartender-actions-atlas', 1261, 1247, 4, 2, 3),
      react: d8NpcAtlasCycle('bartender-actions-atlas', 1261, 1247, 4, 3, 4),
      attack: d8NpcAtlasCycle('Aldeana del café/aldeano_unarmed_attack_atlas', 1448, 1086, 3, 1, 7),
      hit: d8NpcAtlasCycle('bartender-actions-atlas', 1261, 1247, 4, 3, 8)
    },
    patron: {
      idle: d8NpcAtlasCycle('patron-actions-atlas', 1086, 1448, 4, 0, 2),
      talk: d8NpcAtlasCycle('patron-actions-atlas', 1086, 1448, 4, 1, 3),
      react: d8NpcAtlasCycle('patron-actions-atlas', 1086, 1448, 4, 2, 4),
      moving: d8NpcAtlasCycle('patron-actions-atlas', 1086, 1448, 4, 3, 8),
      attack: d8NpcAtlasCycle('Aldeana del café/aldeano_unarmed_attack_atlas', 1448, 1086, 3, 2, 7),
      hit: d8NpcAtlasCycle('patron-actions-atlas', 1086, 1448, 4, 2, 8)
    },
    ben: {
      idle: { frames: [tokenFrame('Ben, Margaret, Vaca, Carnicero/Ben/ben_idle')], fps: 1 },
      moving: { frames: tokenFrames('Ben, Margaret, Vaca, Carnicero/Ben/ben_caminar_01', 'Ben, Margaret, Vaca, Carnicero/Ben/ben_caminar_02'), fps: 7 },
      talk: { frames: [tokenFrame('Ben, Margaret, Vaca, Carnicero/Ben/ben_hablar')], fps: 1 },
      attack: d8NpcAtlasCycle('Ben, Margaret, Vaca, Carnicero/villager_unarmed_attack_atlas', 1295, 1214, 4, 1, 7),
      argue: { frames: tokenFrames('Ben, Margaret, Vaca, Carnicero/Ben/ben_discutir', 'Ben, Margaret, Vaca, Carnicero/Ben/ben_gesticular'), fps: 3 },
      give: { frames: [tokenFrame('Ben, Margaret, Vaca, Carnicero/Ben/ben_entregar_objeto')], fps: 1 },
      'throw-cow': { frames: tokenFrames('Ben, Margaret, Vaca, Carnicero/Ben/ben_tirar_vaca_01', 'Ben, Margaret, Vaca, Carnicero/Ben/ben_tirar_vaca_02'), fps: 6 }
    },
    margaret: {
      idle: { frames: [tokenFrame('Ben, Margaret, Vaca, Carnicero/Margaret/margaret_idle')], fps: 1 },
      moving: { frames: tokenFrames('Ben, Margaret, Vaca, Carnicero/Margaret/margaret_caminar_01', 'Ben, Margaret, Vaca, Carnicero/Margaret/margaret_caminar_02'), fps: 7 },
      talk: { frames: [tokenFrame('Ben, Margaret, Vaca, Carnicero/Margaret/margaret_hablar')], fps: 1 },
      attack: d8NpcAtlasCycle('Ben, Margaret, Vaca, Carnicero/villager_unarmed_attack_atlas', 1295, 1214, 4, 2, 7),
      argue: { frames: tokenFrames('Ben, Margaret, Vaca, Carnicero/Margaret/margaret_discutir', 'Ben, Margaret, Vaca, Carnicero/Margaret/margaret_gesticular'), fps: 3 },
      give: { frames: [tokenFrame('Ben, Margaret, Vaca, Carnicero/Margaret/margaret_entregar_objeto')], fps: 1 },
      'guide-cow': { frames: tokenFrames('Ben, Margaret, Vaca, Carnicero/Margaret/margaret_guiar_vaca_01', 'Ben, Margaret, Vaca, Carnicero/Margaret/margaret_guiar_vaca_02'), fps: 6 }
    },
    boris: {
      idle: { frames: [tokenFrame('Ben, Margaret, Vaca, Carnicero/Carnicero/boris_idle')], fps: 1 },
      moving: { frames: tokenFrames('Ben, Margaret, Vaca, Carnicero/Carnicero/boris_caminar_01', 'Ben, Margaret, Vaca, Carnicero/Carnicero/boris_caminar_02'), fps: 7 },
      talk: { frames: [tokenFrame('Ben, Margaret, Vaca, Carnicero/Carnicero/boris_hablar')], fps: 1 },
      attack: d8NpcAtlasCycle('Ben, Margaret, Vaca, Carnicero/villager_unarmed_attack_atlas', 1295, 1214, 4, 3, 7),
      negotiate: { frames: [tokenFrame('Ben, Margaret, Vaca, Carnicero/Carnicero/boris_negociar')], fps: 1 },
      'receive-coins': { frames: [tokenFrame('Ben, Margaret, Vaca, Carnicero/Carnicero/boris_recibir_monedas')], fps: 1 },
      'receive-cow': { frames: [tokenFrame('Ben, Margaret, Vaca, Carnicero/Carnicero/boris_recibir_vaca')], fps: 1 },
      'give-beans': { frames: [tokenFrame('Ben, Margaret, Vaca, Carnicero/Carnicero/boris_entregar_judias')], fps: 1 },
      'give-steak': { frames: [tokenFrame('Ben, Margaret, Vaca, Carnicero/Carnicero/boris_entregar_filete')], fps: 1 }
    },
    cow: {
      idle: { frames: tokenFrames('Ben, Margaret, Vaca, Carnicero/Vaca/vaca_idle_01', 'Ben, Margaret, Vaca, Carnicero/Vaca/vaca_idle_02'), fps: 2 },
      moving: { frames: tokenFrames('Ben, Margaret, Vaca, Carnicero/Vaca/vaca_caminar_01', 'Ben, Margaret, Vaca, Carnicero/Vaca/vaca_caminar_02', 'Ben, Margaret, Vaca, Carnicero/Vaca/vaca_caminar_03', 'Ben, Margaret, Vaca, Carnicero/Vaca/vaca_caminar_04'), fps: 8 },
      react: { frames: [tokenFrame('Ben, Margaret, Vaca, Carnicero/Vaca/vaca_reaccion')], fps: 1 },
      hit: { frames: [tokenFrame('Ben, Margaret, Vaca, Carnicero/Vaca/vaca_reaccion')], fps: 1 },
      resist: { frames: tokenFrames('Ben, Margaret, Vaca, Carnicero/Vaca/vaca_resistirse_01', 'Ben, Margaret, Vaca, Carnicero/Vaca/vaca_resistirse_02'), fps: 6 }
    },
    
  },
  props: {
    'true-love-mirror': { variants: {
      '0': { url: tokenFrame('Espejo/espejo_amor_verdadero_base'), logicalWidth: 112, logicalHeight: 142, anchorX: .5, anchorY: .93 },
      'intact:0': { url: tokenFrame('Espejo/espejo_amor_verdadero_base'), logicalWidth: 112, logicalHeight: 142, anchorX: .5, anchorY: .93 }
    } }
  },
  audio: {
    music: '/audio/d8-night/music/d8-night-music-silence.ogg',
    layers: {
      ocean: '/audio/d8-night/ambience/d8-night-ambience-garden-forest.ogg',
      wind: '/audio/d8-night/ambience/d8-night-loop-mirror-icy-wind.ogg',
      wood: '/audio/d8-night/ambience/d8-night-loop-cafe-fireplace.ogg',
      storm: '/audio/d8-night/ambience/d8-night-ambience-storm-thunder.ogg'
    },
    // Fallbacks for saves from the first mixer; the DM-facing soundboard uses the named D8 library below.
    sfx: {
      thunder: '/audio/d8-night/sfx/pixabay-thunder.mp3',
      creak: '/audio/d8-night/sfx/d8-night-sfx-world-boat-creak-02.ogg',
      impact: '/audio/d8-night/sfx/d8-night-sfx-attack-blade-hit.ogg'
    },
    layerLabels: { ocean: 'Ambiente principal', wind: 'Ambiente secundario', wood: 'Textura de escena', storm: 'Clima' },
    library: {
      music: [
        { id: 'd8-night-music-silence', label: 'Sin música · solo ambiente', description: 'Deja que la escena se sostenga con sus capas ambientales y efectos.', url: '/audio/d8-night/music/d8-night-music-silence.ogg' },
        { id: 'd8-night-music-temple', label: 'Templo · celestial', description: 'Calma luminosa y sagrada.', url: '/audio/d8-night/music/d8-night-music-temple-mystery.mp3' },
        { id: 'd8-night-music-mirror', label: 'Espejo · calma helada', description: 'Música tenue sobre aire frío.', url: '/audio/d8-night/music/d8-night-music-mirror-frost.mp3' },
        { id: 'd8-night-music-dinner', label: 'Cena · esperanza', description: 'Desenlace íntimo y luminoso.', url: '/audio/d8-night/music/d8-night-music-dinner-hope.mp3' },
        { id: 'd8-night-combat-heroic', label: 'Combate · templo y jardín', description: 'Impulso heroico para las amenazas abiertas.', url: '/audio/d8-night/music/pixabay-heroic-battle.mp3' },
        { id: 'd8-night-combat-street', label: 'Combate · café y mercado', description: 'Tensión de calle para pelea, persecución o emboscada.', url: '/audio/d8-night/music/pixabay-battle-epic.mp3' },
        { id: 'd8-night-combat-shadow', label: 'Combate · espejo', description: 'Fantasia oscura para el Reflejo y su desenlace.', url: '/audio/d8-night/music/pixabay-blackout-battle.mp3' }
      ],
      ambience: [
        { id: 'd8-night-loop-temple-awe', label: 'Templo · resonancia', description: 'Fondo etéreo muy suave.', url: '/audio/d8-night/ambience/d8-night-ambience-temple-awe.ogg' },
        { id: 'd8-night-loop-garden-forest', label: 'Jardín · bosque', description: 'Bosque sereno en bucle.', url: '/audio/d8-night/ambience/d8-night-ambience-garden-forest.ogg' },
        { id: 'd8-night-loop-cafe-fireplace', label: 'Café · hoguera', description: 'Leña y brasa; no contiene voces.', url: '/audio/d8-night/ambience/d8-night-loop-cafe-fireplace.ogg' },
        { id: 'd8-night-loop-tavern-openfire', label: 'Taberna · hoguera y sala', description: 'Ambiente largo elegido para la taberna; revisar la mezcla antes de una sesión.', url: '/audio/d8-night/ambience/d8-night-loop-tavern-openfire.mp3' },
        { id: 'd8-night-loop-market-crowd', label: 'Mercado · gente', description: 'Charla y bullicio de fondo.', url: '/audio/d8-night/ambience/d8-night-loop-market-crowd.ogg' },
        // ID legado conservado para mezclas guardadas; no debe recuperar el audio de voces del mercado.
        { id: 'd8-night-loop-tavern-voices', label: 'Viento nocturno · compatibilidad', description: 'Alias antiguo conservado para mezclas previas; reproduce aire frío sin voces.', url: '/audio/d8-night/ambience/d8-night-loop-mirror-icy-wind.ogg' },
        { id: 'd8-night-loop-horse-trot', label: 'Cabalgar · trote', description: 'Cadencia de caballo en marcha.', url: '/audio/d8-night/ambience/d8-night-loop-horse-trot.ogg' },
        { id: 'd8-night-loop-boat-waves', label: 'Barco · olas', description: 'Agua golpeando el casco.', url: '/audio/d8-night/ambience/d8-night-loop-boat-waves.ogg' },
        { id: 'd8-night-loop-rain-drizzle', label: 'Llovizna · lluvia fina', description: 'Lluvia discreta, sin trueno.', url: '/audio/d8-night/ambience/d8-night-ambience-rain-steady.ogg' },
        { id: 'd8-night-loop-mirror-icy-wind', label: 'Espejo · aire gélido', description: 'Viento frío y continuo.', url: '/audio/d8-night/ambience/d8-night-loop-mirror-icy-wind.ogg' },
        { id: 'd8-night-loop-storm', label: 'Tormenta · lluvia y trueno', description: 'Clima oscuro de lluvia sostenida.', url: '/audio/d8-night/ambience/d8-night-ambience-storm-thunder.ogg' },
        { id: 'd8-night-loop-tempest', label: 'Temporal · lluvia y viento', description: 'Capa compuesta provisional; en una fase posterior se separarán lluvia, tormenta y viento.', url: '/audio/d8-night/ambience/d8-night-ambience-tempest-rain-wind.mp3' },
      ],
      sfx: [
        { id: 'd8-night-sfx-step-stone', label: 'Pasos de piedra', description: 'Ruinas, templo y superficies duras.', url: '/audio/d8-night/sfx/d8-night-sfx-step-stone-01.ogg', category: 'movement', loopable: true, manual: false },
        { id: 'd8-night-sfx-step-ice', label: 'Pasos sobre hielo', description: 'Paso breve para el suelo helado del espejo.', url: '/audio/d8-night/sfx/d8-night-sfx-step-ice.mp3', category: 'movement', loopable: true, manual: false },
        { id: 'd8-night-sfx-step-wood', label: 'Pasos de madera', description: 'Café, muelles y suelos de madera.', url: '/audio/d8-night/sfx/d8-night-sfx-step-wood-01.ogg', category: 'movement', loopable: true, manual: false },
        { id: 'd8-night-sfx-movement-wood-02', label: 'Paso · madera II', description: 'Variante breve para alternar las pisadas.', url: '/audio/d8-night/sfx/d8-night-sfx-movement-wood-02.ogg', category: 'movement', loopable: true, manual: false },
        { id: 'd8-night-sfx-movement-gravel', label: 'Paso · grava', description: 'Camino, jardín y mercado.', url: '/audio/d8-night/sfx/d8-night-sfx-movement-gravel-01.ogg', category: 'movement', loopable: true, manual: false },
        { id: 'd8-night-sfx-movement-sprint', label: 'Carrera', description: 'Persecución, huida o movimiento urgente.', url: '/audio/d8-night/sfx/d8-night-sfx-movement-sprint-01.ogg', category: 'movement', loopable: true, manual: false },
        { id: 'd8-night-sfx-attack-dagger', label: 'Daga · corte', description: 'Ataque rápido de María.', url: '/audio/d8-night/sfx/d8-night-sfx-attack-dagger-slash.ogg', category: 'combat' },
        { id: 'd8-night-sfx-combat-dagger-draw', label: 'Daga · desenvainar', description: 'Inicio de amenaza o emboscada.', url: '/audio/d8-night/sfx/d8-night-sfx-combat-dagger-draw.ogg', category: 'combat' },
        { id: 'd8-night-sfx-attack-swing', label: 'Arma · barrido', description: 'Daga, espada o ataque de espinas.', url: '/audio/d8-night/sfx/d8-night-sfx-attack-weapon-swing.ogg', category: 'combat', manual: false },
        { id: 'd8-night-sfx-attack-hit', label: 'Golpe de filo', description: 'Impacto físico confirmado.', url: '/audio/d8-night/sfx/d8-night-sfx-attack-blade-hit.ogg', category: 'combat', manual: false },
        { id: 'd8-night-sfx-attack-whip-crack', label: 'Latigazo de espinas', description: 'Chasquido seco para ataques y enredos de las rosas.', url: '/audio/d8-night/sfx/d8-night-sfx-attack-whip-crack.mp3', category: 'combat', manual: false },
        { id: 'd8-night-sfx-bow-release', label: 'Arco · cuerda', description: 'Cuerda al soltar la flecha.', url: '/audio/d8-night/sfx/d8-night-sfx-bow-release.mp3', category: 'combat', manual: false },
        { id: 'd8-night-sfx-arrow-swish', label: 'Flecha · vuelo', description: 'Silbido breve durante el vuelo.', url: '/audio/d8-night/sfx/d8-night-sfx-arrow-swish.mp3', category: 'combat', manual: false },
        { id: 'd8-night-sfx-arrow-hit', label: 'Flecha · impacto', description: 'Impacto solo cuando el ataque acierta.', url: '/audio/d8-night/sfx/d8-night-sfx-arrow-hit.mp3', category: 'combat', manual: false },
        { id: 'd8-night-sfx-combat-blade-parry', label: 'Filo · bloqueo', description: 'Parada o choque de armas.', url: '/audio/d8-night/sfx/d8-night-sfx-combat-blade-parry.ogg', category: 'combat' },
        { id: 'd8-night-sfx-spell-arcane', label: 'Arcano · conjuro', description: 'Preparación de magia.', url: '/audio/d8-night/sfx/d8-night-sfx-spell-arcane-cast.ogg', category: 'magic', manual: false },
        { id: 'd8-night-sfx-spell-fire', label: 'Hechizo · fuego', description: 'Proyectil ígneo.', url: '/audio/d8-night/sfx/d8-night-sfx-spell-firebolt.ogg', category: 'magic', manual: false },
        { id: 'd8-night-sfx-spell-ice', label: 'Hechizo · hielo', description: 'Escarcha y quiebra del espejo.', url: '/audio/d8-night/sfx/d8-night-sfx-spell-ice-snap.ogg', category: 'magic' },
        { id: 'd8-night-sfx-magic-ritual', label: 'Ritual · energía', description: 'Magia sostenida o invocación.', url: '/audio/d8-night/sfx/d8-night-sfx-magic-ritual.ogg', category: 'magic', manual: false },
        { id: 'd8-night-sfx-magic-fire-impact', label: 'Fuego · impacto', description: 'Remate para un proyectil ígneo.', url: '/audio/d8-night/sfx/d8-night-sfx-magic-fire-impact.ogg', category: 'magic' },
        { id: 'd8-night-sfx-magic-spark', label: 'Magia · chispa', description: 'Truco breve o revelación menor.', url: '/audio/d8-night/sfx/d8-night-sfx-magic-spark.ogg', category: 'magic', manual: false },
        { id: 'd8-night-sfx-magic-ward', label: 'Magia · barrera', description: 'Protección, escudo o sello.', url: '/audio/d8-night/sfx/d8-night-sfx-magic-ward.ogg', category: 'magic', manual: false },
        { id: 'd8-night-sfx-magic-teleport', label: 'Magia · traslado', description: 'Desaparición, salto o portal.', url: '/audio/d8-night/sfx/d8-night-sfx-magic-teleport.ogg', category: 'magic', manual: false },
        { id: 'd8-night-sfx-magic-reveal', label: 'Magia · revelación', description: 'Pista, espejo o secreto descubierto.', url: '/audio/d8-night/sfx/d8-night-sfx-magic-reveal.ogg', category: 'magic', manual: false },
        { id: 'd8-night-sfx-magic-heal', label: 'Magia · sanar', description: 'Alivio, bendición o recuperación.', url: '/audio/d8-night/sfx/d8-night-sfx-magic-heal.ogg', category: 'magic' },
        { id: 'd8-night-sfx-magic-ominous', label: 'Magia · presagio', description: 'Advertencia sobrenatural antes del peligro.', url: '/audio/d8-night/sfx/d8-night-sfx-magic-ominous.ogg', category: 'magic' },
        { id: 'd8-night-sfx-creature-hurt', label: 'Criatura · herida', description: 'Rosas o Reflejo alcanzados.', url: '/audio/d8-night/sfx/d8-night-sfx-creature-hurt.ogg', category: 'creature' },
        { id: 'd8-night-sfx-creature-roar', label: 'Criatura · amenaza', description: 'Entrada de peligro o reacción.', url: '/audio/d8-night/sfx/d8-night-sfx-creature-roar.ogg', category: 'creature' },
        { id: 'd8-night-sfx-creature-growl', label: 'Criatura · gruñido', description: 'Bestia o presencia hostil.', url: '/audio/d8-night/sfx/d8-night-sfx-creature-growl.ogg', category: 'creature' },
        { id: 'd8-night-sfx-creature-roar-02', label: 'Criatura · rugido II', description: 'Variante para amenaza intensa.', url: '/audio/d8-night/sfx/d8-night-sfx-creature-roar-02.ogg', category: 'creature' },
        { id: 'd8-night-sfx-creature-defeat', label: 'Criatura · derrota', description: 'Final de una amenaza o rosa asesina.', url: '/audio/d8-night/sfx/d8-night-sfx-creature-defeat.ogg', category: 'creature' },
        { id: 'd8-night-sfx-door', label: 'Puerta · abrir', description: 'Entrada, revelación o cambio de escena.', url: '/audio/d8-night/sfx/d8-night-sfx-action-door-open.ogg', category: 'object' },
        { id: 'd8-night-sfx-world-door-close', label: 'Puerta · cerrar', description: 'Clausura, secreto o despedida.', url: '/audio/d8-night/sfx/d8-night-sfx-world-door-close.ogg', category: 'object' },
        { id: 'd8-night-sfx-book', label: 'Libro · página', description: 'Pista, ritual o consulta.', url: '/audio/d8-night/sfx/d8-night-sfx-action-book-page.ogg', category: 'object' },
        { id: 'd8-night-sfx-world-book-open', label: 'Libro · abrir', description: 'Inicio de lectura o descubrimiento.', url: '/audio/d8-night/sfx/d8-night-sfx-world-book-open.ogg', category: 'object', manual: false },
        { id: 'd8-night-sfx-coins', label: 'Monedas', description: 'Mercado, trato o recompensa.', url: '/audio/d8-night/sfx/d8-night-sfx-action-coins.ogg', category: 'object' },
        { id: 'd8-night-sfx-mirror', label: 'Espejo · grieta', description: 'Quiebre de hielo para el espejo encantado.', url: '/audio/d8-night/sfx/d8-night-sfx-ice-shatter.mp3', category: 'object' },
        { id: 'd8-night-sfx-world-lock', label: 'Cerradura', description: 'Forzar, abrir o descubrir un mecanismo.', url: '/audio/d8-night/sfx/d8-night-sfx-world-lock.ogg', category: 'object' },
        { id: 'd8-night-sfx-world-lock-latch', label: 'Pestillo metálico', description: 'Cierre pequeño, cadena o mecanismo.', url: '/audio/d8-night/sfx/d8-night-sfx-world-lock-latch.ogg', category: 'object' },
        { id: 'd8-night-sfx-world-chain', label: 'Cadena', description: 'Grilletes, reja o elevador viejo.', url: '/audio/d8-night/sfx/d8-night-sfx-world-chain.ogg', category: 'object' },
        { id: 'd8-night-sfx-world-gem', label: 'Gema', description: 'Tesoro, objeto mágico o hallazgo.', url: '/audio/d8-night/sfx/d8-night-sfx-world-gem.ogg', category: 'object' },
        { id: 'd8-night-sfx-world-metal', label: 'Metal', description: 'Armadura, herramienta o puerta pesada.', url: '/audio/d8-night/sfx/d8-night-sfx-world-metal.ogg', category: 'object' },
        { id: 'd8-night-sfx-world-wood-impact', label: 'Madera · impacto', description: 'Barril, puerta, puesto o cubierta.', url: '/audio/d8-night/sfx/d8-night-sfx-world-wood-impact.ogg', category: 'object' },
        { id: 'd8-night-sfx-world-stone-impact', label: 'Piedra · impacto', description: 'Escombro, pared o suelo antiguo.', url: '/audio/d8-night/sfx/d8-night-sfx-world-stone-impact.ogg', category: 'object' },
        { id: 'd8-night-sfx-world-leather-pack', label: 'Cuero · equipo', description: 'Mochila, funda o preparación.', url: '/audio/d8-night/sfx/d8-night-sfx-world-leather-pack.ogg', category: 'object', manual: false },
        { id: 'd8-night-sfx-world-boat-creak', label: 'Barco · crujido', description: 'Casco y cubierta bajo tensión.', url: '/audio/d8-night/sfx/d8-night-sfx-world-boat-creak-02.ogg', category: 'object' },
        { id: 'd8-night-sfx-cafe-chair', label: 'Café · silla', description: 'Madera, patas y asiento que se mueve.', url: '/audio/d8-night/sfx/d8-night-sfx-cafe-chair.ogg', category: 'scene' },
        { id: 'd8-night-sfx-cafe-glass', label: 'Café · vaso', description: 'Cristal sobre una mesa; sin voces.', url: '/audio/d8-night/sfx/d8-night-sfx-cafe-glass.ogg', category: 'scene' },
        { id: 'd8-night-sfx-cafe-drink', label: 'Café · bebida', description: 'Un sorbo puntual para dar vida al local.', url: '/audio/d8-night/sfx/d8-night-sfx-cafe-drink.ogg', category: 'scene' },
        { id: 'd8-night-sfx-market-shout', label: 'Mercado · grito', description: 'Un vendedor llama a distancia.', url: '/audio/d8-night/sfx/pixabay-market-shout.mp3', category: 'scene' },
        { id: 'd8-night-sfx-market-cow-moo', label: 'Mercado · mugido', description: 'Mugido puntual de la vaca; no se repite en bucle.', url: '/audio/d8-night/sfx/d8-night-sfx-market-cow-moo.mp3', category: 'scene' },
        { id: 'd8-night-sfx-thunder', label: 'Trueno · golpe', description: 'Trueno intenso puntual; no es una capa de ambiente.', url: '/audio/d8-night/sfx/pixabay-thunder.mp3', category: 'scene' }
      ]
    },
    sceneProfiles: {
      temple: { music: { id: 'd8-night-music-temple', playing: true, volume: .28 }, layers: { ocean: { id: 'd8-night-loop-temple-awe', playing: true, volume: .12 }, wind: { id: 'd8-night-loop-mirror-icy-wind', playing: false, volume: .1 }, wood: { id: 'd8-night-loop-cafe-fireplace', playing: false, volume: .1 }, storm: { id: 'd8-night-loop-storm', playing: false, volume: .25 } }, recommendedSfx: ['d8-night-sfx-attack-dagger', 'd8-night-sfx-door'] },
      garden: { music: { id: 'd8-night-music-silence', playing: false, volume: .25 }, layers: { ocean: { id: 'd8-night-loop-garden-forest', playing: true, volume: .34 }, wind: { id: 'd8-night-loop-mirror-icy-wind', playing: false, volume: .1 }, wood: { id: 'd8-night-loop-cafe-fireplace', playing: false, volume: .1 }, storm: { id: 'd8-night-loop-storm', playing: false, volume: .25 } }, recommendedSfx: ['d8-night-sfx-attack-dagger', 'd8-night-sfx-creature-hurt', 'd8-night-sfx-creature-defeat', 'd8-night-sfx-magic-ominous', 'd8-night-sfx-world-wood-impact'] },
      cafe: { music: { id: 'd8-night-music-silence', playing: false, volume: .25 }, layers: { ocean: { id: 'd8-night-loop-cafe-fireplace', playing: true, volume: .32 }, wind: { id: 'd8-night-loop-temple-awe', playing: false, volume: .1 }, wood: { id: 'd8-night-loop-cafe-fireplace', playing: false, volume: .08 }, storm: { id: 'd8-night-loop-storm', playing: false, volume: .25 } }, recommendedSfx: ['d8-night-sfx-cafe-chair', 'd8-night-sfx-cafe-glass', 'd8-night-sfx-cafe-drink', 'd8-night-sfx-door', 'd8-night-sfx-world-door-close'] },
      market: { music: { id: 'd8-night-music-silence', playing: false, volume: .25 }, layers: { ocean: { id: 'd8-night-loop-market-crowd', playing: true, volume: .2 }, wind: { id: 'd8-night-loop-market-crowd', playing: false, volume: .18 }, wood: { id: 'd8-night-loop-cafe-fireplace', playing: false, volume: .1 }, storm: { id: 'd8-night-loop-storm', playing: false, volume: .25 } }, recommendedSfx: ['d8-night-sfx-market-shout', 'd8-night-sfx-market-cow-moo', 'd8-night-sfx-coins', 'd8-night-sfx-world-metal', 'd8-night-sfx-world-wood-impact', 'd8-night-sfx-world-chain'] },
      mirror: { music: { id: 'd8-night-music-mirror', playing: true, volume: .25 }, layers: { ocean: { id: 'd8-night-loop-garden-forest', playing: false, volume: .1 }, wind: { id: 'd8-night-loop-mirror-icy-wind', playing: true, volume: .26 }, wood: { id: 'd8-night-loop-cafe-fireplace', playing: false, volume: .1 }, storm: { id: 'd8-night-loop-storm', playing: false, volume: .25 } }, recommendedSfx: ['d8-night-sfx-spell-ice', 'd8-night-sfx-mirror', 'd8-night-sfx-creature-hurt', 'd8-night-sfx-creature-defeat', 'd8-night-sfx-magic-ominous'] },
      dinner: { music: { id: 'd8-night-music-dinner', playing: true, volume: .25 }, layers: { ocean: { id: 'd8-night-loop-cafe-fireplace', playing: false, volume: .1 }, wind: { id: 'd8-night-loop-temple-awe', playing: false, volume: .1 }, wood: { id: 'd8-night-loop-cafe-fireplace', playing: false, volume: .08 }, storm: { id: 'd8-night-loop-storm', playing: false, volume: .25 } }, recommendedSfx: ['d8-night-sfx-cafe-chair', 'd8-night-sfx-cafe-glass', 'd8-night-sfx-cafe-drink', 'd8-night-sfx-door', 'd8-night-sfx-world-door-close', 'd8-night-sfx-coins'] }
    }
  }
};

for (const scene of definition.scenes) {
  const sceneId = scene.id as D8SceneId;
  const legacy = sceneId === 'garden' ? { cols: 29, rows: 21 } : { cols: 32, rows: 21 };
  const walkable = d8Walkable(sceneId);
  scene.renderer = 'babylon-d8';
  scene.grid = d8SceneGrid(sceneId);
  scene.walkable = walkable;
  scene.spawns = d8PartySpawns(sceneId, walkable);
  scene.stageActors = scene.stageActors?.map(actor => ({ ...actor, cell: nearestWalkable(sceneId,
    remapLegacyCell(sceneId, actor.cell, legacy.cols, legacy.rows), walkable) }));
  scene.props = scene.props.map(prop => {
    const visual = D8NIGHT.maps[sceneId].MAP.objects.find((object: any) => object.asset === 'mirror_frame');
    return { ...prop, cell: sceneId === 'mirror' && prop.id === 'true-love-mirror' && visual
      ? d8NearestWalkableCell(sceneId, visual.position[0], visual.position[1])
      : remapLegacyCell(sceneId, prop.cell, legacy.cols, legacy.rows) };
  });
}

// Real additional PNG poses; combat profiles and rule statistics are untouched.
for (const [tokenId, frames] of Object.entries(d8MotionAtlases)) {
  const states = definition.tokenAnimations[tokenId]!;
  const cycle = (row: number, fps: number) => ({ frames: frames.slice(row * 4, row * 4 + 4), fps });
  const collapse = cycle(1, 7), standing = cycle(2, 7), north = cycle(3, 8), east = cycle(4, 8);
  const run = cycle(tokenId === 'bartender' ? 6 : 5, 11);
  Object.assign(states, { hit: cycle(0, 8), fall: collapse, prone: { frames: collapse.frames.slice(-1), fps: 1 }, defeated: { frames: collapse.frames.slice(-1), fps: 1 }, stand: standing,
    'idle-standing': { frames: standing.frames.slice(-1), fps: 1 }, running: run,
    'direction-n': north, 'direction-ne': north, 'direction-nw': { ...north, flipX: true }, 'direction-e': east, 'direction-w': { ...east, flipX: true },
    'direction-se': east, 'direction-sw': { ...east, flipX: true } });
  if (tokenId === 'bartender') states.moving = cycle(5, 8);
  states['direction-s'] = states.moving!;
  for (const direction of ['n', 'ne', 'nw', 'e', 'w', 'se', 'sw', 's']) states[`running-${direction}`] = direction === 's' ? run : { ...states[`direction-${direction}`]!, fps: 12 };
}
// Visual estimates only: children and a cow do not share adult-human height.
for (const [tokenId, frames] of Object.entries(d8DirectionAtlases)) {
  for (const id of tokenId === 'anteros' ? ['anteros', 'anteros-dinner'] : [tokenId]) {
    const states = definition.tokenAnimations[id]!;
    const north = { frames: frames.slice(0, 4), fps: 8 }, northeast = { frames: frames.slice(4, 8), fps: 8 }, east = { frames: frames.slice(8, 12), fps: 8 };
    Object.assign(states, { 'direction-n': north, 'direction-ne': northeast, 'direction-nw': { ...northeast, flipX: true }, 'direction-e': east, 'direction-w': { ...east, flipX: true }, 'direction-se': east, 'direction-sw': { ...east, flipX: true }, 'direction-s': states.moving });
    for (const direction of ['n', 'ne', 'nw', 'e', 'w', 'se', 'sw', 's']) states[`running-${direction}`] = direction === 's' && states.running ? states.running : { ...states[`direction-${direction}`]!, fps: 12 };
  }
}
definition.tokens.ben!.worldHeightMeters = 1.28;
definition.tokens.margaret!.worldHeightMeters = 1.32;
definition.tokens.cow!.worldHeightMeters = 1.35;
definition.tokenAnimations.roses!.wake = { frames: tokenFrames('Rosas asesinas/rosa_asesina_base', 'Rosas asesinas/rosa_asesina_despertar', 'Rosas asesinas/rosa_asesina_idle_hostil'), fps: 3 };

export const oneShotCampaignDefinition = validatePublicCampaign(definition);
