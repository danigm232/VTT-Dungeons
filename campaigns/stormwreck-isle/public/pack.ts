import { validatePublicCampaign, type Cell, type PublicCampaignDefinition } from '../../../engine/shared/campaign.js';
import { campRestsPublicCampaign } from '../../camp-rests/public/pack.js';
import { wreckRuntimeScenes } from './wreck-runtime.js';
import { dragonRestScene } from './retreat-runtime.js';

const cells = (ranges: Array<[row: number, first: number, last: number]>): Cell[] => {
  const result: Cell[] = [];
  for (const [row, first, last] of ranges) for (let col = first; col <= last; col++) result.push({ col, row });
  return result;
};
const without = (source: Cell[], blocked: Cell[]) => source.filter(cell => !blocked.some(item => item.col === cell.col && item.row === cell.row));
const artCycle = (folder: string, stem: string, count: number, fps: number, flipX = false) => ({
  frames: Array.from({ length: count }, (_, index) => `/art/m3/${folder}/${stem}_${String(index + 1).padStart(2, '0')}.png`), fps,
  ...(flipX ? { flipX: true } : {})
});
const artAtlasCycle = (filename: string, row: number, fps: number, flipX = false) => ({
  frames: Array.from({ length: 4 }, (_, index) => ({
    url: `/art/m3/trinity/${filename}`, x: index * 313, y: row * 627, width: 313, height: 580,
    logicalWidth: 68, logicalHeight: 108, anchorY: .9
  })), fps, ...(flipX ? { flipX: true } : {})
});
const ghoulAtlas = (name: string, y: number, height: number, logicalWidth: number) => ({
  frames: Array.from({ length: 4 }, (_, index) => ({
    url: `/art/m3/ghoul/${name}.png`, x: index * 313, y, width: 313, height,
    logicalWidth, logicalHeight: 106, anchorY: .95
  })), fps: 6
});
const mariaWalkDirections = {
  'direction-n': artAtlasCycle('maria_walk_sw_n_sheet.png', 1, 8),
  'direction-ne': artAtlasCycle('maria_walk_w_nw_sheet.png', 1, 8, true),
  'direction-e': artAtlasCycle('maria_walk_w_nw_sheet.png', 0, 8, true),
  'direction-se': artAtlasCycle('maria_walk_sw_n_sheet.png', 0, 8, true),
  'direction-s': artCycle('trinity', 'maria_caminar', 4, 8),
  'direction-sw': artAtlasCycle('maria_walk_sw_n_sheet.png', 0, 8),
  'direction-w': artAtlasCycle('maria_walk_w_nw_sheet.png', 0, 8),
  'direction-nw': artAtlasCycle('maria_walk_w_nw_sheet.png', 1, 8)
};
const mariaRunDirections = {
  'running-n': artAtlasCycle('maria_run_sw_n_sheet.png', 1, 10),
  'running-ne': artAtlasCycle('maria_run_w_nw_sheet.png', 1, 10, true),
  'running-e': artAtlasCycle('maria_run_w_nw_sheet.png', 0, 10, true),
  'running-se': artAtlasCycle('maria_run_sw_n_sheet.png', 0, 10, true),
  'running-s': artCycle('trinity', 'maria_correr', 4, 10),
  'running-sw': artAtlasCycle('maria_run_sw_n_sheet.png', 0, 10),
  'running-w': artAtlasCycle('maria_run_w_nw_sheet.png', 0, 10),
  'running-nw': artAtlasCycle('maria_run_w_nw_sheet.png', 1, 10)
};
const mariaDaggerDirections = {
  'attack-n': artAtlasCycle('maria_dagger_sw_n_4x2.png', 1, 10),
  'attack-ne': artAtlasCycle('maria_dagger_w_nw_4x2.png', 1, 10, true),
  'attack-e': artAtlasCycle('maria_dagger_w_nw_4x2.png', 0, 10, true),
  'attack-se': artAtlasCycle('maria_dagger_sw_n_4x2.png', 0, 10, true),
  'attack-s': artCycle('trinity', 'maria_ataque_daga', 5, 10),
  'attack-sw': artAtlasCycle('maria_dagger_sw_n_4x2.png', 0, 10),
  'attack-w': artAtlasCycle('maria_dagger_w_nw_4x2.png', 0, 10),
  'attack-nw': artAtlasCycle('maria_dagger_w_nw_4x2.png', 1, 10)
};

const grid = { cols: 32, rows: 21, tileSize: 48, originX: 0, originY: 8, width: 1536, height: 1024 };
const objectGrid = { cols: 12, rows: 9, tileSize: 48, originX: 0, originY: 0, width: 576, height: 432 };
const deckWalkable = without(cells([
  [4, 5, 27], [5, 3, 29], [6, 2, 30], [7, 1, 30], [8, 1, 30], [9, 0, 31],
  [10, 0, 31], [11, 1, 30], [12, 2, 29], [13, 3, 28], [14, 5, 26], [15, 8, 23]
]), [{ col: 3, row: 8 }, { col: 15, row: 9 }, { col: 15, row: 10 }, { col: 21, row: 11 }, { col: 26, row: 8 }]);
const objectWalkable = without(cells([[1, 1, 10], [2, 1, 10], [3, 1, 10], [4, 1, 10], [5, 1, 10], [6, 1, 10], [7, 1, 10]]), [
  { col: 6, row: 1 }, { col: 6, row: 2 }, { col: 6, row: 3 }, { col: 6, row: 5 }, { col: 6, row: 6 }, { col: 6, row: 7 }
]);

const definition: PublicCampaignDefinition = {
  schemaVersion: 2,
  campaignId: 'stormwreck-isle',
  version: '0.3.2-dev.4',
  title: 'El Rosa de los Vientos',
  initialSceneId: 'dragon-rest',
  scenes: [
    dragonRestScene,
    {
      id: 'wreck-approach', title: 'Aproximación al pecio', surfaceId: 'approach', movementEnabled: false,
      background: '/art/wreck-approach.png', grid, walkable: cells([[17, 12, 19], [18, 11, 20], [19, 10, 21], [20, 10, 21]]),
      spawns: [{ col: 14, row: 19 }, { col: 16, row: 19 }, { col: 18, row: 19 }], props: [], waves: true
    },
    {
      id: 'wreck-objects', title: 'Prueba de objetos del pecio', surfaceId: 'objects-deck', movementEnabled: true,
      background: '/art/objects-v4/wreck-objects-room-v4.png', grid: objectGrid, walkable: objectWalkable,
      spawns: [{ col: 2, row: 4 }, { col: 2, row: 5 }, { col: 3, row: 5 }],
      props: [
        { id: 'practice-door', kind: 'door', label: 'Puerta de práctica', assetId: 'practice-door', cell: { col: 6, row: 4 }, rotation: 0, initialState: 'closed', baseFootprint: [{ col: 0, row: 0 }], allowedRotations: [0], capabilities: { transform: false, detach: false, structure: true }, sourceKind: 'addition', sourceRef: 'Demostración Alpha 0.2' },
        { id: 'practice-crate', kind: 'crate', label: 'Caja de práctica', assetId: 'practice-crate', cell: { col: 3, row: 4 }, rotation: 0, baseFootprint: [{ col: 0, row: 0 }, { col: 1, row: 0 }], allowedRotations: [0, 90], capabilities: { transform: true, detach: false, structure: true }, sourceKind: 'addition', sourceRef: 'Demostración Alpha 0.2' }
      ],
      waves: false
    },
    ...wreckRuntimeScenes
  ],
  roster: [
    { id: 'mike', label: 'Mike', archetype: 'Mago alto elfo', color: '#55b8d8', tokenId: 'wizard' },
    { id: 'mia', label: 'Mia', archetype: 'Clériga enana', color: '#d5a34b', tokenId: 'cleric' },
    { id: 'maria', label: 'Trinity', archetype: 'Pícara mediana', color: '#b66dc4', tokenId: 'rogue' }
  ],
  tokens: {
    wizard: { url: '/art/tokens/wizard.png', logicalWidth: 92, logicalHeight: 92, anchorX: 0.5, anchorY: 0.84 },
    cleric: { url: '/art/tokens/cleric.png', logicalWidth: 92, logicalHeight: 92, anchorX: 0.5, anchorY: 0.84 },
    rogue: { url: '/art/m3/trinity/maria_base.png', logicalWidth: 92, logicalHeight: 92, anchorX: 0.5, anchorY: 0.84 },
    harpy: { url: '/art/m3/harpy/harpia_base.png', logicalWidth: 112, logicalHeight: 112, anchorX: 0.5, anchorY: 0.9 },
    zombie: { url: '/art/m3/zombie/zombie1_base.png', logicalWidth: 96, logicalHeight: 96, anchorX: 0.5, anchorY: 0.9 },
    ghoul: { url: '/art/m3/ghoul/ghoul_base.png', logicalWidth: 100, logicalHeight: 100, anchorX: 0.5, anchorY: 0.92 },
    'npc-runara': { url: '/art/stormwreck/retreat/runara.svg', logicalWidth: 88, logicalHeight: 100, anchorX: 0.5, anchorY: 0.92 },
    'npc-tarak': { url: '/art/stormwreck/retreat/tarak.svg', logicalWidth: 88, logicalHeight: 100, anchorX: 0.5, anchorY: 0.92 },
    'npc-varnoth': { url: '/art/stormwreck/retreat/varnoth.svg', logicalWidth: 88, logicalHeight: 100, anchorX: 0.5, anchorY: 0.92 },
    'retreat-kobold': { url: '/art/stormwreck/retreat/kobold.svg', logicalWidth: 88, logicalHeight: 100, anchorX: 0.5, anchorY: 0.92 },
    'retreat-marker': { url: '/art/stormwreck/retreat/marker.svg', logicalWidth: 72, logicalHeight: 84, anchorX: 0.5, anchorY: 0.92 },
    'wreck-rowboat': { url: '/art/stormwreck/rowboat.svg', logicalWidth: 150, logicalHeight: 84, anchorX: 0.5, anchorY: 0.72 }
  },
  tokenAnimations: {
    rogue: {
      idle: artCycle('trinity', 'maria_idle', 4, 4), moving: artCycle('trinity', 'maria_caminar', 4, 8),
      'combat-idle': artCycle('trinity', 'maria_combate_idle', 3, 4),
      ready: artCycle('trinity', 'maria_combate_idle', 3, 4),
      running: artCycle('trinity', 'maria_correr', 4, 10),
      ...mariaWalkDirections, ...mariaRunDirections,
      attack: artCycle('trinity', 'maria_ataque_daga', 5, 10), ...mariaDaggerDirections,
      'attack-arrow': artCycle('trinity', 'maria_disparo_arco', 6, 10),
      'attack-arrow-mirrored': artCycle('trinity', 'maria_disparo_arco', 6, 10, true),
      'attack-throw': artCycle('trinity', 'maria_lanzar_daga', 3, 10),
      'attack-throw-mirrored': artCycle('trinity', 'maria_lanzar_daga', 3, 10, true),
      talk: artCycle('trinity', 'maria_interactuar', 4, 7), interact: artCycle('trinity', 'maria_interactuar', 4, 7),
      search: artCycle('trinity', 'maria_interactuar', 4, 7), study: artCycle('trinity', 'maria_interactuar', 4, 7),
      spell: artCycle('trinity', 'maria_interactuar', 4, 7),
      dodge: artCycle('trinity', 'maria_sigilo', 4, 7),
      stealth: artCycle('trinity', 'maria_sigilo', 4, 7), climb: artCycle('trinity', 'maria_trepar', 4, 7),
      swim: artCycle('trinity', 'maria_nadar', 4, 7), jump: artCycle('trinity', 'maria_saltar', 3, 8),
      hit: artCycle('trinity', 'maria_hit', 3, 10),
      prone: { frames: ['/art/m3/trinity/maria_07_derribada.png'], fps: 1 },
      crawl: artCycle('trinity', 'maria_arrastrarse', 3, 6),
      defeated: { frames: ['/art/m3/trinity/maria_12_inconsciente.png'], fps: 1 }
    },
    zombie: {
      idle: artCycle('zombie', 'zombie1_idle', 3, 3), moving: artCycle('zombie', 'zombie1_caminar', 4, 6),
      attack: artCycle('zombie', 'zombie1_ataque', 4, 8), hit: { frames: ['/art/m3/zombie/zombie1_hit_01.png'], fps: 6 },
      defeated: { frames: ['/art/m3/zombie/zombie1_muerto.png'], fps: 1 }
    },
    harpy: {
      idle: artCycle('harpy', 'harpia_idle_suelo', 3, 4), moving: artCycle('harpy', 'harpia_caminar', 4, 7),
      running: artCycle('harpy', 'harpia_volar', 4, 8), attack: artCycle('harpy', 'harpia_ataque_garra', 4, 9),
      hit: { frames: ['/art/m3/harpy/harpia_hit_01.png'], fps: 6 }, defeated: { frames: ['/art/m3/harpy/harpia_muerta.png'], fps: 1 }
    },
    ghoul: {
      idle: { frames: ['/art/m3/ghoul/ghoul_base.png', '/art/m3/ghoul/ghoul_idle_01.png'], fps: 2 },
      moving: ghoulAtlas('ghoul_walk_s', 116, 538, 68),
      attack: ghoulAtlas('ghoul_attack_claw_s_bite_w', 96, 568, 72),
      defeated: { frames: ['/art/m3/ghoul/ghoul_dead.png'], fps: 1 }
    },
    'npc-runara': { idle: { frames: ['/art/stormwreck/retreat/runara.svg'], fps: 1 }, talk: { frames: ['/art/stormwreck/retreat/runara.svg'], fps: 1 } },
    'npc-tarak': { idle: { frames: ['/art/stormwreck/retreat/tarak.svg'], fps: 1 }, talk: { frames: ['/art/stormwreck/retreat/tarak.svg'], fps: 1 } },
    'npc-varnoth': { idle: { frames: ['/art/stormwreck/retreat/varnoth.svg'], fps: 1 }, talk: { frames: ['/art/stormwreck/retreat/varnoth.svg'], fps: 1 } },
    'retreat-kobold': { idle: { frames: ['/art/stormwreck/retreat/kobold.svg'], fps: 1 }, talk: { frames: ['/art/stormwreck/retreat/kobold.svg'], fps: 1 } },
    'retreat-marker': { idle: { frames: ['/art/stormwreck/retreat/marker.svg'], fps: 1 }, talk: { frames: ['/art/stormwreck/retreat/marker.svg'], fps: 1 } },
    'wreck-rowboat': { idle: { frames: ['/art/stormwreck/rowboat.svg'], fps: 1 } }
  },
  props: {
    'wheel-mount-v3': { variants: { default: { url: '/art/objects-v3/wheel-mount-v3.png', logicalWidth: 48, logicalHeight: 48, anchorX: 0.5, anchorY: 0.5 } } },
    'wheel-v3': { variants: {
      'attached:intact': { url: '/art/objects-v3/wheel-attached-intact-v3.png', logicalWidth: 48, logicalHeight: 64, anchorX: 0.5, anchorY: 0.75 },
      'attached:damaged': { url: '/art/objects-v3/wheel-attached-damaged-v3.png', logicalWidth: 48, logicalHeight: 64, anchorX: 0.5, anchorY: 0.75 },
      'detached:caught:intact:0': { url: '/art/objects-v3/wheel-caught-intact-0-v3.png', logicalWidth: 48, logicalHeight: 64, anchorX: 0.5, anchorY: 0.75 },
      'detached:caught:intact:90': { url: '/art/objects-v3/wheel-caught-intact-90-v3.png', logicalWidth: 48, logicalHeight: 64, anchorX: 0.5, anchorY: 0.75 },
      'detached:caught:intact:180': { url: '/art/objects-v3/wheel-caught-intact-180-v3.png', logicalWidth: 48, logicalHeight: 64, anchorX: 0.5, anchorY: 0.75 },
      'detached:caught:intact:270': { url: '/art/objects-v3/wheel-caught-intact-270-v3.png', logicalWidth: 48, logicalHeight: 64, anchorX: 0.5, anchorY: 0.75 },
      'detached:caught:damaged:0': { url: '/art/objects-v3/wheel-caught-damaged-0-v3.png', logicalWidth: 48, logicalHeight: 64, anchorX: 0.5, anchorY: 0.75 },
      'detached:caught:damaged:90': { url: '/art/objects-v3/wheel-caught-damaged-90-v3.png', logicalWidth: 48, logicalHeight: 64, anchorX: 0.5, anchorY: 0.75 },
      'detached:caught:damaged:180': { url: '/art/objects-v3/wheel-caught-damaged-180-v3.png', logicalWidth: 48, logicalHeight: 64, anchorX: 0.5, anchorY: 0.75 },
      'detached:caught:damaged:270': { url: '/art/objects-v3/wheel-caught-damaged-270-v3.png', logicalWidth: 48, logicalHeight: 64, anchorX: 0.5, anchorY: 0.75 },
      'detached:fallen:intact:0': { url: '/art/objects-v3/wheel-fallen-intact-0-v3.png', logicalWidth: 48, logicalHeight: 48, anchorX: 0.5, anchorY: 0.5 },
      'detached:fallen:intact:90': { url: '/art/objects-v3/wheel-fallen-intact-90-v3.png', logicalWidth: 48, logicalHeight: 48, anchorX: 0.5, anchorY: 0.5 },
      'detached:fallen:intact:180': { url: '/art/objects-v3/wheel-fallen-intact-180-v3.png', logicalWidth: 48, logicalHeight: 48, anchorX: 0.5, anchorY: 0.5 },
      'detached:fallen:intact:270': { url: '/art/objects-v3/wheel-fallen-intact-270-v3.png', logicalWidth: 48, logicalHeight: 48, anchorX: 0.5, anchorY: 0.5 },
      'detached:fallen:damaged:0': { url: '/art/objects-v3/wheel-fallen-damaged-0-v3.png', logicalWidth: 48, logicalHeight: 48, anchorX: 0.5, anchorY: 0.5 },
      'detached:fallen:damaged:90': { url: '/art/objects-v3/wheel-fallen-damaged-90-v3.png', logicalWidth: 48, logicalHeight: 48, anchorX: 0.5, anchorY: 0.5 },
      'detached:fallen:damaged:180': { url: '/art/objects-v3/wheel-fallen-damaged-180-v3.png', logicalWidth: 48, logicalHeight: 48, anchorX: 0.5, anchorY: 0.5 },
      'detached:fallen:damaged:270': { url: '/art/objects-v3/wheel-fallen-damaged-270-v3.png', logicalWidth: 48, logicalHeight: 48, anchorX: 0.5, anchorY: 0.5 },
      'debris:0': { url: '/art/objects-v3/wheel-debris-v3.png', logicalWidth: 48, logicalHeight: 48, anchorX: 0.5, anchorY: 0.5 },
      'debris:90': { url: '/art/objects-v3/wheel-debris-v3.png', logicalWidth: 48, logicalHeight: 48, anchorX: 0.5, anchorY: 0.5 },
      'debris:180': { url: '/art/objects-v3/wheel-debris-v3.png', logicalWidth: 48, logicalHeight: 48, anchorX: 0.5, anchorY: 0.5 },
      'debris:270': { url: '/art/objects-v3/wheel-debris-v3.png', logicalWidth: 48, logicalHeight: 48, anchorX: 0.5, anchorY: 0.5 }
    } },
    'practice-door': { variants: {
      'intact:closed': { url: '/art/objects-v4/door-intact-closed-v4.png', logicalWidth: 96, logicalHeight: 96, anchorX: 0.25, anchorY: 0.5 },
      'intact:open': { url: '/art/objects-v4/door-intact-open-v4.png', logicalWidth: 96, logicalHeight: 96, anchorX: 0.25, anchorY: 0.5, sortOffsetY: -24 },
      'damaged:closed': { url: '/art/objects-v4/door-damaged-closed-v4.png', logicalWidth: 96, logicalHeight: 96, anchorX: 0.25, anchorY: 0.5 },
      'damaged:open': { url: '/art/objects-v4/door-damaged-open-v4.png', logicalWidth: 96, logicalHeight: 96, anchorX: 0.25, anchorY: 0.5, sortOffsetY: -24 },
      destroyed: { url: '/art/objects-v4/door-destroyed-v4.png', logicalWidth: 96, logicalHeight: 96, anchorX: 0.25, anchorY: 0.5, sortOffsetY: -12 }
    } },
    'practice-crate': { variants: {
      'intact:0': { url: '/art/objects-v2/crate-horizontal-v2.png', logicalWidth: 96, logicalHeight: 48, anchorX: 0.5, anchorY: 0.5 },
      'intact:90': { url: '/art/objects-v2/crate-vertical-v2.png', logicalWidth: 48, logicalHeight: 96, anchorX: 0.5, anchorY: 0.5 },
      'damaged:0': { url: '/art/objects-v3/crate-damaged-0-v3.png', logicalWidth: 96, logicalHeight: 48, anchorX: 0.5, anchorY: 0.5 },
      'damaged:90': { url: '/art/objects-v3/crate-damaged-90-v3.png', logicalWidth: 48, logicalHeight: 96, anchorX: 0.5, anchorY: 0.5 },
      'destroyed:0': { url: '/art/objects-v3/crate-destroyed-0-v3.png', logicalWidth: 96, logicalHeight: 48, anchorX: 0.5, anchorY: 0.5 },
      'destroyed:90': { url: '/art/objects-v3/crate-destroyed-90-v3.png', logicalWidth: 48, logicalHeight: 96, anchorX: 0.5, anchorY: 0.5 }
    } }
  },
  audio: {
    music: '/audio/music-tempest.wav',
    layers: { ocean: '/audio/ambient-ocean.wav', wind: '/audio/ambient-wind.wav', wood: '/audio/ambient-wood.wav', storm: '/audio/ambient-storm.wav' },
    sfx: { thunder: '/audio/stormwreck/sfx/pixabay-thunder.mp3', creak: '/audio/stormwreck/sfx/pixabay-door.mp3', impact: '/audio/stormwreck/sfx/pixabay-sword-hit.mp3' },
    layerLabels: { ocean: 'Mar y oleaje', wind: 'Viento costero', wood: 'Pecio y madera', storm: 'Clima y truenos' },
    library: {
      music: [
        { id: 'stormwreck-music-tempest', label: 'Isla de las Tempestades', description: 'Tema marítimo para navegación y tensión suave.', url: '/audio/music-tempest.wav' },
        { id: 'stormwreck-combat-surf', label: 'Combate · costa y pecio', description: 'Batalla contra no muertos y peligro del mar.', url: '/audio/stormwreck/music/pixabay-battle-epic.mp3' },
        { id: 'stormwreck-combat-heroic', label: 'Combate · dragones y aliados', description: 'Respuesta heroica para Runara y el clímax.', url: '/audio/stormwreck/music/pixabay-heroic-battle.mp3' },
        { id: 'stormwreck-combat-shadow', label: 'Combate · cicatriz dracónica', description: 'Tensión oscura para Sparkrender y magia corrupta.', url: '/audio/stormwreck/music/pixabay-blackout-battle.mp3' },
        { id: 'stormwreck-music-dragon-rest', label: 'Retiro del Dragón · santuario', description: 'Calma solemne para Dragon’s Rest y las conversaciones con Runara.', url: '/audio/stormwreck/ambience/stormwreck-loop-sanctuary.mp3' },
        { id: 'stormwreck-music-rosa-vientos', label: 'El Rosa de los Vientos · pecio', description: 'Oleaje y madera para explorar el barco varado.', url: '/audio/stormwreck/ambience/stormwreck-loop-boat-waves.mp3' }
      ],
      ambience: [
        { id: 'stormwreck-loop-ocean', label: 'Oleaje de la isla', description: 'Mar constante contra las rocas.', url: '/audio/ambient-ocean.wav', category: 'scene', loopable: true },
        { id: 'stormwreck-loop-wind', label: 'Viento costero', description: 'Viento de acantilado y mar abierto.', url: '/audio/ambient-wind.wav', category: 'scene', loopable: true },
        { id: 'stormwreck-loop-wood', label: 'Madera del pecio', description: 'Casco, cubierta y jarcia que crujen.', url: '/audio/ambient-wood.wav', category: 'scene', loopable: true },
        { id: 'stormwreck-loop-storm', label: 'Tormenta de la isla', description: 'Lluvia y viento sostenidos; el trueno intenso se dispara aparte.', url: '/audio/stormwreck/ambience/stormwreck-loop-storm.mp3', category: 'scene', loopable: true },
        { id: 'stormwreck-loop-boat-waves', label: 'Olas contra el casco', description: 'Agua golpeando un barco varado.', url: '/audio/stormwreck/ambience/stormwreck-loop-boat-waves.mp3', category: 'scene', loopable: true },
        { id: 'stormwreck-loop-cliff-wind', label: 'Viento del observatorio', description: 'Aire frío para ruinas elevadas.', url: '/audio/stormwreck/ambience/stormwreck-loop-cliff-wind.ogg', category: 'scene', loopable: true },
        { id: 'stormwreck-loop-rain', label: 'Lluvia costera', description: 'Lluvia fina sin convertir cada escena en una tormenta.', url: '/audio/stormwreck/ambience/stormwreck-loop-rain.mp3', category: 'scene', loopable: true },
        { id: 'stormwreck-loop-forest', label: 'Bosque de la isla', description: 'Vegetación y aves lejanas para las sendas de la isla.', url: '/audio/stormwreck/ambience/stormwreck-loop-forest-night.mp3', category: 'scene', loopable: true },
        { id: 'stormwreck-loop-forest-fire', label: 'Hoguera del bosque', description: 'Fuego bajo y constante para el claro del campamento.', url: '/audio/stormwreck/ambience/stormwreck-loop-forest-fire.mp3', category: 'scene', loopable: true },
        { id: 'stormwreck-loop-forest-river-01', label: 'Arroyo de Pleamar · I', description: 'Agua corriente para el bosque y los caminos de Pleamar.', url: '/audio/stormwreck/ambience/stormwreck-loop-forest-river-01.mp3', category: 'scene', loopable: true },
        { id: 'stormwreck-loop-forest-river-02', label: 'Arroyo de Pleamar · II', description: 'Variante de agua corriente para alternar la capa del arroyo.', url: '/audio/stormwreck/ambience/stormwreck-loop-forest-river-02.mp3', category: 'scene', loopable: true },
        { id: 'stormwreck-loop-sanctuary', label: 'Santuario de Runara', description: 'Calma solemne para Dragon’s Rest y conversaciones importantes.', url: '/audio/stormwreck/ambience/stormwreck-loop-sanctuary.mp3', category: 'scene', loopable: true }
      ],
      sfx: [
        { id: 'd8-night-sfx-step-stone', label: 'Paso sobre basalto', description: 'Senderos, templo y ruinas de la isla.', url: '/audio/stormwreck/sfx/pixabay-footsteps-stone.mp3', category: 'movement', loopable: true, manual: false },
        { id: 'd8-night-sfx-step-wood', label: 'Paso sobre cubierta', description: 'Tablas, muelles, pasarelas y pecio.', url: '/audio/stormwreck/sfx/pixabay-footsteps-wood.mp3', category: 'movement', loopable: true, manual: false },
        { id: 'd8-night-sfx-movement-stone-02', label: 'Paso sobre basalto II', description: 'Variante de piedra para trayectos largos.', url: '/audio/stormwreck/sfx/d8-night-sfx-movement-stone-02.ogg', category: 'movement', loopable: true, manual: false },
        { id: 'd8-night-sfx-movement-wood-02', label: 'Paso sobre cubierta II', description: 'Variante de madera para no repetir la pisada.', url: '/audio/stormwreck/sfx/d8-night-sfx-movement-wood-02.ogg', category: 'movement', loopable: true, manual: false },
        { id: 'd8-night-sfx-movement-gravel', label: 'Paso por senda', description: 'Playa, guijarros y tierra exterior.', url: '/audio/stormwreck/sfx/pixabay-footsteps-gravel.mp3', category: 'movement', loopable: true, manual: false },
        { id: 'd8-night-sfx-movement-sprint', label: 'Carrera o huida', description: 'Correr, escapar o alcanzar cobertura.', url: '/audio/stormwreck/sfx/pixabay-running.mp3', category: 'movement', loopable: true, manual: false },
        { id: 'd8-night-sfx-world-stone-impact', label: 'Caída sobre piedra', description: 'Salto, caída, roca o escombro.', url: '/audio/stormwreck/sfx/pixabay-stone-impact.mp3', category: 'object' },
        { id: 'd8-night-sfx-attack-dagger', label: 'Daga kobold', description: 'Daga, apuñalamiento o amenaza cercana.', url: '/audio/stormwreck/sfx/d8-night-sfx-attack-dagger-slash.ogg', category: 'combat' },
        { id: 'd8-night-sfx-attack-swing', label: 'Ataque cuerpo a cuerpo', description: 'Garra, maza, hacha, pico o arma en movimiento.', url: '/audio/stormwreck/sfx/pixabay-sword-swing.mp3', category: 'combat', manual: false },
        { id: 'd8-night-sfx-attack-hit', label: 'Impacto confirmado', description: 'Golpe de arma, garra, mordisco o proyectil.', url: '/audio/stormwreck/sfx/pixabay-sword-hit.mp3', category: 'combat', manual: false },
        { id: 'd8-night-sfx-combat-blade-parry', label: 'Bloqueo o esquiva', description: 'Parada, armadura o arma que desvía el golpe.', url: '/audio/stormwreck/sfx/d8-night-sfx-combat-blade-parry.ogg', category: 'combat' },
        { id: 'd8-night-sfx-spell-arcane', label: 'Conjuro arcano', description: 'Magia del mago, bruma o energía dracónica.', url: '/audio/stormwreck/sfx/pixabay-magic-arcane.mp3', category: 'magic', manual: false },
        { id: 'd8-night-sfx-spell-fire', label: 'Fuego mágico', description: 'Proyectil de fuego, aliento ígneo o serpiente de fuego.', url: '/audio/stormwreck/sfx/pixabay-magic-fire.mp3', category: 'magic', manual: false },
        { id: 'd8-night-sfx-spell-frost', label: 'Escarcha arcana', description: 'Rayo de escarcha, frío dracónico o suelo congelado.', url: '/audio/stormwreck/sfx/pixabay-magic-frost.mp3', category: 'magic' },
        { id: 'd8-night-sfx-magic-impact', label: 'Impacto mágico', description: 'Onda atronadora, descarga de hechizo o golpe elemental.', url: '/audio/stormwreck/sfx/pixabay-magic-impact.mp3', category: 'magic' },
        { id: 'stormwreck-sfx-thunder', label: 'Trueno y aliento de relámpago', description: 'Tormenta, aliento de dragón de bronce o estallido atronador.', url: '/audio/stormwreck/sfx/pixabay-thunder.mp3', category: 'magic' },
        { id: 'stormwreck-sfx-heavy-thunder', label: 'Trueno intenso · Pleamar', description: 'Impacto de trueno de unos 5 segundos; efecto puntual, no ambiente ni bucle.', url: '/audio/stormwreck/sfx/stormwreck-sfx-heavy-thunder.mp3', category: 'scene' },
        { id: 'd8-night-sfx-magic-spark', label: 'Chispa de magia', description: 'Truco menor, objeto mágico o señal de energía.', url: '/audio/stormwreck/sfx/pixabay-magic-spark.mp3', category: 'magic' },
        { id: 'd8-night-sfx-magic-curse', label: 'Corrupción o maldición', description: 'Energía hostil, amenaza de Sparkrender o presencia inquietante.', url: '/audio/stormwreck/sfx/d8-night-sfx-magic-curse.ogg', category: 'magic' },
        { id: 'd8-night-sfx-magic-ward', label: 'Barrera y protección', description: 'Escudo, defensa divina o resistencia.', url: '/audio/stormwreck/sfx/d8-night-sfx-magic-ward.ogg', category: 'magic' },
        { id: 'd8-night-sfx-magic-heal', label: 'Curación', description: 'Sanar heridas, palabra sanadora o alivio divino.', url: '/audio/stormwreck/sfx/pixabay-magic-heal.mp3', category: 'magic' },
        { id: 'd8-night-sfx-magic-reveal', label: 'Luz o revelación', description: 'Llama sagrada, objeto revelado o descubrimiento.', url: '/audio/stormwreck/sfx/d8-night-sfx-magic-reveal.ogg', category: 'magic' },
        { id: 'd8-night-sfx-magic-ominous', label: 'Canto de arpía', description: 'Aviso mágico para el canto embriagador; úsalo una vez al iniciarlo.', url: '/audio/stormwreck/sfx/d8-night-sfx-magic-ominous.ogg', category: 'magic' },
        { id: 'd8-night-sfx-magic-ritual', label: 'Ritual dracónico', description: 'Cicatriz de dragón, invocación o ritual de Sparkrender.', url: '/audio/stormwreck/sfx/d8-night-sfx-magic-ritual.ogg', category: 'magic' },
        { id: 'd8-night-sfx-magic-teleport', label: 'Ruptura de energía', description: 'Estallido de humo, magia o aparición.', url: '/audio/stormwreck/sfx/d8-night-sfx-magic-teleport.ogg', category: 'magic' },
        { id: 'd8-night-sfx-creature-growl', label: 'Gruñido de bestia', description: 'Oso lechuza, draco de humo o criatura alerta.', url: '/audio/stormwreck/sfx/pixabay-creature-growl.mp3', category: 'creature' },
        { id: 'd8-night-sfx-creature-roar', label: 'Rugido dracónico', description: 'Dragon, oso lechuza o amenaza que entra en escena.', url: '/audio/stormwreck/sfx/pixabay-creature-roar.mp3', category: 'creature' },
        { id: 'd8-night-sfx-creature-roar-02', label: 'Rugido dracónico II', description: 'Variante para Runara en forma de dragón o Sparkrender.', url: '/audio/stormwreck/sfx/d8-night-sfx-creature-roar-02.ogg', category: 'creature' },
        { id: 'd8-night-sfx-creature-hurt', label: 'Criatura herida', description: 'Reacción de una bestia o monstruo al recibir daño.', url: '/audio/stormwreck/sfx/d8-night-sfx-creature-hurt.ogg', category: 'creature' },
        { id: 'd8-night-sfx-creature-defeat', label: 'Criatura derrotada', description: 'Final de una amenaza no muerta o monstruosa.', url: '/audio/stormwreck/sfx/d8-night-sfx-creature-defeat.ogg', category: 'creature' },
        { id: 'stormwreck-sfx-zombie-groan', label: 'Zombi ahogado · gemido', description: 'Entrada o desplazamiento torpe de un marinero ahogado.', url: '/audio/stormwreck/sfx/stormwreck-sfx-zombie-groan-01.wav', category: 'creature' },
        { id: 'stormwreck-sfx-zombie-groan-02', label: 'Zombi ahogado · gemido II', description: 'Variante de no muerto para no repetir la misma voz.', url: '/audio/stormwreck/sfx/stormwreck-sfx-zombie-groan-02.wav', category: 'creature' },
        { id: 'stormwreck-sfx-undead-cry', label: 'No muerto · alarido', description: 'Entrada o ataque de un no muerto.', url: '/audio/stormwreck/sfx/stormwreck-sfx-undead-cry.wav', category: 'creature' },
        { id: 'stormwreck-sfx-undead-defeat', label: 'No muerto · derrota', description: 'Caída final de un no muerto.', url: '/audio/stormwreck/sfx/stormwreck-sfx-undead-defeat.wav', category: 'creature' },
        { id: 'd8-night-sfx-world-door-close', label: 'Puerta · abrir', description: 'Apertura de una puerta, escotilla o entrada del pecio.', url: '/audio/stormwreck/sfx/pixabay-door.mp3', category: 'object' },
        { id: 'd8-night-sfx-world-lock', label: 'Cerradura y herramientas', description: 'Forzar un cierre o usar herramientas de ladrón.', url: '/audio/stormwreck/sfx/d8-night-sfx-world-lock.ogg', category: 'object' },
        { id: 'd8-night-sfx-world-chain', label: 'Cadena y jarcia', description: 'Anclas, aparejos, grilletes o timón.', url: '/audio/stormwreck/sfx/pixabay-chain.mp3', category: 'object' },
        { id: 'd8-night-sfx-world-boat-creak', label: 'Crujido de casco', description: 'Barco dañado, madera bajo tensión o cubierta que cede.', url: '/audio/stormwreck/sfx/d8-night-sfx-world-boat-creak-02.ogg', category: 'object' },
        { id: 'd8-night-sfx-world-wood-impact', label: 'Madera y casco', description: 'Barco, caja, timón o puerta dañada.', url: '/audio/stormwreck/sfx/pixabay-wood-impact.mp3', category: 'object' },
        { id: 'd8-night-sfx-world-book-open', label: 'Diario o pergamino', description: 'Bitácora, pista, mapa o lectura ritual.', url: '/audio/stormwreck/sfx/pixabay-page-turn.mp3', category: 'object', manual: false },
        { id: 'd8-night-sfx-world-leather-pack', label: 'Equipo y sigilo', description: 'Mochila, funda o preparación antes de esconderse.', url: '/audio/stormwreck/sfx/d8-night-sfx-world-leather-pack.ogg', category: 'object', manual: false },
        { id: 'd8-night-sfx-coins', label: 'Tesoro', description: 'Monedas, botín, talismán u objeto encontrado.', url: '/audio/stormwreck/sfx/pixabay-coins.mp3', category: 'object' }
      ]
    },
    sceneProfiles: {
      'dragon-rest': { music: { id: 'stormwreck-music-tempest', playing: true, volume: .1 }, layers: { ocean: { id: 'stormwreck-loop-ocean', playing: true, volume: .31 }, wind: { id: 'stormwreck-loop-sanctuary', playing: true, volume: .22 }, wood: { id: 'stormwreck-loop-wood', playing: false, volume: .1 }, storm: { id: 'stormwreck-loop-storm', playing: false, volume: .2 } }, recommendedSfx: ['d8-night-sfx-world-chain', 'd8-night-sfx-world-door-close', 'stormwreck-sfx-zombie-groan'] },
      'wreck-ship': { music: { id: 'stormwreck-music-tempest', playing: true, volume: .16 }, layers: { ocean: { id: 'stormwreck-loop-boat-waves', playing: true, volume: .29 }, wind: { id: 'stormwreck-loop-wind', playing: true, volume: .23 }, wood: { id: 'stormwreck-loop-wood', playing: true, volume: .16 }, storm: { id: 'stormwreck-loop-storm', playing: false, volume: .25 } }, recommendedSfx: ['d8-night-sfx-world-chain', 'd8-night-sfx-world-boat-creak', 'd8-night-sfx-world-wood-impact', 'd8-night-sfx-magic-ominous', 'd8-night-sfx-creature-roar', 'd8-night-sfx-world-door-close'] },
      'wreck-approach': { music: { id: 'stormwreck-music-tempest', playing: true, volume: .22 }, layers: { ocean: { id: 'stormwreck-loop-ocean', playing: true, volume: .35 }, wind: { id: 'stormwreck-loop-wind', playing: true, volume: .14 }, wood: { id: 'stormwreck-loop-wood', playing: false, volume: .1 }, storm: { id: 'stormwreck-loop-storm', playing: false, volume: .25 } }, recommendedSfx: ['stormwreck-sfx-zombie-groan', 'stormwreck-sfx-zombie-groan-02', 'd8-night-sfx-magic-reveal', 'd8-night-sfx-creature-defeat'] },
      'wreck-objects': { music: { id: 'stormwreck-music-tempest', playing: false, volume: .16 }, layers: { ocean: { id: 'stormwreck-loop-ocean', playing: false, volume: .2 }, wind: { id: 'stormwreck-loop-wind', playing: false, volume: .1 }, wood: { id: 'stormwreck-loop-wood', playing: true, volume: .13 }, storm: { id: 'stormwreck-loop-storm', playing: false, volume: .25 } }, recommendedSfx: ['d8-night-sfx-world-door-close', 'd8-night-sfx-world-lock', 'd8-night-sfx-world-wood-impact', 'd8-night-sfx-coins'] }
    }
  }
};

const mergeById = <T extends { id: string }>(primary: readonly T[] | undefined, extra: readonly T[] | undefined): T[] => {
  const result = [...(primary ?? [])], seen = new Set(result.map(item => item.id));
  for (const item of extra ?? []) if (!seen.has(item.id)) { result.push(item); seen.add(item.id); }
  return result;
};
const primaryAudio = definition.audio.library, campAudio = campRestsPublicCampaign.audio.library;
const campAnimations = campRestsPublicCampaign.tokenAnimations;
const primaryAnimations = definition.tokenAnimations;

/** Camp scenes are part of the Stormwreck campaign, not a separate save slot.
 * Keep the standalone source pack available for its focused tests, while the
 * launchable campaign owns the combined scenes, assets and ambience profiles. */
export const publicCampaignDefinition = validatePublicCampaign({
  ...definition,
  title: 'Los Dragones de la Isla de las Tempestades',
  version: '0.3.3-dev.1',
  scenes: [...definition.scenes, ...campRestsPublicCampaign.scenes],
  tokens: { ...campRestsPublicCampaign.tokens, ...definition.tokens },
  tokenAnimations: Object.fromEntries([...new Set([...Object.keys(campAnimations), ...Object.keys(primaryAnimations)])].map(tokenId => [
    tokenId, { ...(campAnimations[tokenId] ?? {}), ...(primaryAnimations[tokenId] ?? {}) }
  ])),
  props: { ...campRestsPublicCampaign.props, ...definition.props },
  audio: {
    ...definition.audio,
    library: {
      music: mergeById(primaryAudio?.music, campAudio?.music),
      ambience: mergeById(primaryAudio?.ambience, campAudio?.ambience),
      sfx: mergeById(primaryAudio?.sfx, campAudio?.sfx)
    },
    sceneProfiles: { ...(campRestsPublicCampaign.audio.sceneProfiles ?? {}), ...(definition.audio.sceneProfiles ?? {}) }
  }
} satisfies PublicCampaignDefinition);
