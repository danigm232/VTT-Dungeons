import { validatePublicCampaign, type Cell, type PublicCampaignDefinition } from '../../../engine/shared/campaign.js';

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
const silverfarbenFrame = (state: string, frame?: number) => `/art/tokens/Silverfarben Hotel/silverfarben_hotel_${state}${frame === undefined ? '' : `_${String(frame).padStart(2, '0')}`}.png`;
const silverfarbenFrames = (state: string, count: number) => Array.from({ length: count }, (_item, index) => silverfarbenFrame(state, index + 1));

const definition: PublicCampaignDefinition = {
  schemaVersion: 2, campaignId: 'd8-night-private', version: '0.3.0-dev.1', title: 'D8 Night · mesa privada', initialSceneId: 'temple',
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
    wizard: pcToken('wizard'), cleric: pcToken('cleric'), rogue: pcToken('rogue'),
    'silverfarben-hotel': { ...pcToken('Silverfarben Hotel/silverfarben_hotel_base', 1.37), portraitUrl: tokenFrame('Silverfarben Hotel/silverfarben_hotel_portrait_normal') },
    anteros: { ...tallNpcToken('Anteros/anteros_base'), portraitUrl: tokenFrame('Anteros/anteros_portrait_normal') },
    // La cena usa una pose propia: así Anteros no aparece de pie junto a la mesa.
    'anteros-dinner': { ...tallNpcToken('Anteros/sheet-crops/anteros_sentado_idle_01'), portraitUrl: tokenFrame('Anteros/anteros_portrait_normal') },
    fritz: tallNpcToken('Señorita Fritz/senorita_fritz_base'), roses: tallNpcToken('Rosas asesinas/rosa_asesina_base'),
    patron: tallNpcToken('patron-d8-v3'), bartender: tallNpcToken('bartender-d8-v3'), 'patron-woman': tallNpcToken('Aldeana del café/aldeano_base_sentado'),
    ben: tallNpcToken('Ben, Margaret, Vaca, Carnicero/Ben/ben_base'), margaret: tallNpcToken('Ben, Margaret, Vaca, Carnicero/Margaret/margaret_base'), boris: tallNpcToken('Ben, Margaret, Vaca, Carnicero/Carnicero/boris_base'), cow: { url: tokenFrame('Ben, Margaret, Vaca, Carnicero/Vaca/vaca_base'), logicalWidth: 118, logicalHeight: 92, anchorX: 0.5, anchorY: 0.84 },
    reflection: npcToken('reflection-v2')
  },
  tokenAnimations: {
    'silverfarben-hotel': {
      idle: { frames: silverfarbenFrames('idle', 4), fps: 3 },
      moving: { frames: silverfarbenFrames('caminar', 4), fps: 8 },
      running: { frames: silverfarbenFrames('correr', 4), fps: 10 },
      // Los cuatro PNG de carrera son poses con orientaciones distintas, no
      // fotogramas consecutivos. Se elige la pose según la dirección para que
      // Silverfarben no gire de frente a espalda durante una misma carrera.
      'running-n': { frames: [silverfarbenFrame('walk_dir_n')], fps: 1 },
      'running-ne': { frames: [silverfarbenFrame('correr', 1)], fps: 1 },
      'running-e': { frames: [silverfarbenFrame('correr', 1)], fps: 1 },
      'running-se': { frames: [silverfarbenFrame('correr', 4)], fps: 1 },
      'running-s': { frames: [silverfarbenFrame('correr', 3)], fps: 1 },
      'running-sw': { frames: [silverfarbenFrame('correr', 2)], fps: 1 },
      'running-w': { frames: [silverfarbenFrame('correr', 2)], fps: 1 },
      'running-nw': { frames: [silverfarbenFrame('walk_dir_nw')], fps: 1 },
      'combat-idle': { frames: silverfarbenFrames('combate_idle', 3), fps: 4 },
      // El material entregado no incluye arco, daga o puñetazo. Los ataques
      // físicos conservan la guardia y el motor añade el VFX del arma; solo los
      // conjuros usan la secuencia mágica.
      attack: { frames: silverfarbenFrames('combate_idle', 3), fps: 7 },
      spell: { frames: silverfarbenFrames('hechizo', 4), fps: 11 },
      hit: { frames: silverfarbenFrames('hit', 2), fps: 9 },
      defeated: { frames: silverfarbenFrames('arrastrarse', 4), fps: 4 },
      interact: { frames: [silverfarbenFrame('interactuar')], fps: 1 },
      swimming: { frames: silverfarbenFrames('nadar', 4), fps: 7 },
      jumping: { frames: silverfarbenFrames('saltar', 3), fps: 9 },
      stealth: { frames: silverfarbenFrames('sigilo', 4), fps: 6 },
      climbing: { frames: silverfarbenFrames('trepar', 4), fps: 6 },
      'direction-n': { frames: [silverfarbenFrame('walk_dir_n')], fps: 1 },
      'direction-ne': { frames: [silverfarbenFrame('walk_dir_ne')], fps: 1 },
      'direction-e': { frames: [silverfarbenFrame('walk_dir_e')], fps: 1 },
      'direction-se': { frames: [silverfarbenFrame('walk_dir_se')], fps: 1 },
      'direction-s': { frames: [silverfarbenFrame('walk_dir_s')], fps: 1 },
      'direction-sw': { frames: [silverfarbenFrame('walk_dir_sw')], fps: 1 },
      'direction-w': { frames: [silverfarbenFrame('walk_dir_w')], fps: 1 },
      'direction-nw': { frames: [silverfarbenFrame('walk_dir_nw')], fps: 1 }
    },
    anteros: {
      idle: { frames: [tokenFrame('Anteros/anteros_base')], fps: 1 },
      moving: { frames: [tokenFrame('Anteros/sheet-crops/anteros_caminar_01')], fps: 1 },
      'combat-idle': { frames: [tokenFrame('Anteros/anteros_base')], fps: 1 },
      // No se inventa un golpe nuevo: el VFX de espada/flechas acompaña esta
      // silueta estable mientras el motor resuelve el ataque real.
      attack: { frames: [tokenFrame('Anteros/anteros_base')], fps: 1 },
      talk: { frames: tokenFrames('Anteros/sheet-crops/anteros_hablar_01', 'Anteros/sheet-crops/anteros_hablar_02', 'Anteros/sheet-crops/anteros_hablar_03'), fps: 3 },
      sit: { frames: tokenFrames('Anteros/sheet-crops/anteros_sentado_idle_01', 'Anteros/sheet-crops/anteros_sentado_reflexivo_01'), fps: 1 },
      react: { frames: [tokenFrame('Anteros/sheet-crops/anteros_reaccion_01')], fps: 1 },
      transform: { frames: [tokenFrame('Anteros/sheet-crops/anteros_transformacion_01')], fps: 1 },
      hit: { frames: [tokenFrame('Anteros/sheet-crops/anteros_herido_01')], fps: 1 },
      defeated: { frames: [tokenFrame('Anteros/anteros_portrait_inconsciente')], fps: 1 }
    },
    'anteros-dinner': {
      idle: { frames: [tokenFrame('Anteros/sheet-crops/anteros_sentado_idle_01')], fps: 1 },
      attack: { frames: [tokenFrame('Anteros/anteros_base')], fps: 1 },
      talk: { frames: tokenFrames('Anteros/sheet-crops/anteros_hablar_01', 'Anteros/sheet-crops/anteros_hablar_02', 'Anteros/sheet-crops/anteros_hablar_03'), fps: 3 },
      sit: { frames: tokenFrames('Anteros/sheet-crops/anteros_sentado_idle_01', 'Anteros/sheet-crops/anteros_sentado_reflexivo_01'), fps: 1 },
      react: { frames: [tokenFrame('Anteros/sheet-crops/anteros_reaccion_01')], fps: 1 },
      transform: { frames: [tokenFrame('Anteros/sheet-crops/anteros_transformacion_01')], fps: 1 },
      hit: { frames: [tokenFrame('Anteros/sheet-crops/anteros_herido_01')], fps: 1 },
      defeated: { frames: [tokenFrame('Anteros/anteros_portrait_inconsciente')], fps: 1 }
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
      attack: { frames: [tokenFrame('Señorita Fritz/senorita_fritz_idle_02')], fps: 1 },
      hit: { frames: tokenFrames('Señorita Fritz/senorita_fritz_hit_01', 'Señorita Fritz/senorita_fritz_hit_02'), fps: 8 },
      defeated: { frames: [tokenFrame('Señorita Fritz/senorita_fritz_caida_suelo')], fps: 1 }
    },
    'patron-woman': {
      idle: { frames: tokenFrames('Aldeana del café/aldeano_base_sentado', 'Aldeana del café/aldeano_sentado_idle'), fps: 2 },
      moving: { frames: [tokenFrame('Aldeana del café/aldeano_caminar')], fps: 1 },
      talk: { frames: tokenFrames('Aldeana del café/aldeano_beber_01', 'Aldeana del café/aldeano_beber_02'), fps: 2 },
      react: { frames: tokenFrames('Aldeana del café/aldeano_levantarse_01', 'Aldeana del café/aldeano_levantarse_02', 'Aldeana del café/aldeano_levantarse_03'), fps: 4 },
      attack: { frames: [tokenFrame('Aldeana del café/aldeano_ataque')], fps: 1 }
    },
    bartender: {
      idle: { frames: [tokenFrame('bartender-d8-v3')], fps: 1 },
      talk: { frames: [tokenFrame('bartender-d8-v3')], fps: 1 },
      react: { frames: [tokenFrame('bartender-d8-v3')], fps: 1 },
      attack: { frames: [tokenFrame('bartender-d8-v3')], fps: 1 }
    },
    patron: {
      idle: { frames: [tokenFrame('patron-d8-v3')], fps: 1 },
      talk: { frames: [tokenFrame('patron-d8-v3')], fps: 1 },
      react: { frames: [tokenFrame('patron-d8-v3')], fps: 1 },
      attack: { frames: [tokenFrame('patron-d8-v3')], fps: 1 }
    },
    ben: {
      idle: { frames: [tokenFrame('Ben, Margaret, Vaca, Carnicero/Ben/ben_idle')], fps: 1 },
      moving: { frames: tokenFrames('Ben, Margaret, Vaca, Carnicero/Ben/ben_caminar_01', 'Ben, Margaret, Vaca, Carnicero/Ben/ben_caminar_02'), fps: 7 },
      talk: { frames: [tokenFrame('Ben, Margaret, Vaca, Carnicero/Ben/ben_hablar')], fps: 1 },
      attack: { frames: tokenFrames('Ben, Margaret, Vaca, Carnicero/Ben/ben_discutir', 'Ben, Margaret, Vaca, Carnicero/Ben/ben_gesticular'), fps: 7 },
      argue: { frames: tokenFrames('Ben, Margaret, Vaca, Carnicero/Ben/ben_discutir', 'Ben, Margaret, Vaca, Carnicero/Ben/ben_gesticular'), fps: 3 },
      give: { frames: [tokenFrame('Ben, Margaret, Vaca, Carnicero/Ben/ben_entregar_objeto')], fps: 1 },
      'throw-cow': { frames: tokenFrames('Ben, Margaret, Vaca, Carnicero/Ben/ben_tirar_vaca_01', 'Ben, Margaret, Vaca, Carnicero/Ben/ben_tirar_vaca_02'), fps: 6 }
    },
    margaret: {
      idle: { frames: [tokenFrame('Ben, Margaret, Vaca, Carnicero/Margaret/margaret_idle')], fps: 1 },
      moving: { frames: tokenFrames('Ben, Margaret, Vaca, Carnicero/Margaret/margaret_caminar_01', 'Ben, Margaret, Vaca, Carnicero/Margaret/margaret_caminar_02'), fps: 7 },
      talk: { frames: [tokenFrame('Ben, Margaret, Vaca, Carnicero/Margaret/margaret_hablar')], fps: 1 },
      attack: { frames: tokenFrames('Ben, Margaret, Vaca, Carnicero/Margaret/margaret_discutir', 'Ben, Margaret, Vaca, Carnicero/Margaret/margaret_gesticular'), fps: 7 },
      argue: { frames: tokenFrames('Ben, Margaret, Vaca, Carnicero/Margaret/margaret_discutir', 'Ben, Margaret, Vaca, Carnicero/Margaret/margaret_gesticular'), fps: 3 },
      give: { frames: [tokenFrame('Ben, Margaret, Vaca, Carnicero/Margaret/margaret_entregar_objeto')], fps: 1 },
      'guide-cow': { frames: tokenFrames('Ben, Margaret, Vaca, Carnicero/Margaret/margaret_guiar_vaca_01', 'Ben, Margaret, Vaca, Carnicero/Margaret/margaret_guiar_vaca_02'), fps: 6 }
    },
    boris: {
      idle: { frames: [tokenFrame('Ben, Margaret, Vaca, Carnicero/Carnicero/boris_idle')], fps: 1 },
      moving: { frames: tokenFrames('Ben, Margaret, Vaca, Carnicero/Carnicero/boris_caminar_01', 'Ben, Margaret, Vaca, Carnicero/Carnicero/boris_caminar_02'), fps: 7 },
      talk: { frames: [tokenFrame('Ben, Margaret, Vaca, Carnicero/Carnicero/boris_hablar')], fps: 1 },
      attack: { frames: [tokenFrame('Ben, Margaret, Vaca, Carnicero/Carnicero/boris_negociar')], fps: 1 },
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
    music: '/audio/d8-night/music/d8-night-music-temple-mystery.mp3',
    layers: {
      ocean: '/audio/d8-night/ambience/d8-night-ambience-garden-forest.mp3',
      wind: '/audio/d8-night/ambience/d8-night-ambience-temple-awe.mp3',
      wood: '/audio/d8-night/music/d8-night-music-cafe-warm.mp3',
      storm: '/audio/d8-night/ambience/d8-night-ambience-storm-thunder.ogg'
    },
    // Fallbacks for saves from the first mixer; the DM-facing soundboard uses the named D8 library below.
    sfx: {
      thunder: '/audio/d8-night/sfx/pixabay-thunder.mp3',
      creak: '/audio/d8-night/sfx/pixabay-door.mp3',
      impact: '/audio/d8-night/sfx/pixabay-sword-hit.mp3'
    },
    layerLabels: { ocean: 'Ambiente principal', wind: 'Ambiente secundario', wood: 'Textura de escena', storm: 'Clima' },
    library: {
      music: [
        { id: 'd8-night-music-temple', label: 'Templo · celestial', description: 'Calma luminosa y sagrada.', url: '/audio/d8-night/music/d8-night-music-temple-mystery.mp3' },
        { id: 'd8-night-music-garden', label: 'Jardín · sin música', description: 'Reserva este canal para dejar oír el bosque.', url: '/audio/d8-night/music/d8-night-music-garden-enchanted.mp3' },
        { id: 'd8-night-music-cafe', label: 'Café · sin música', description: 'Solo fuego, vajilla y mobiliario; sin voces.', url: '/audio/d8-night/music/d8-night-music-cafe-warm.mp3' },
        { id: 'd8-night-music-market', label: 'Mercado · sin música', description: 'El ritmo nace de pasos, charla y gritos lejanos.', url: '/audio/d8-night/music/d8-night-music-market-nocturne.mp3' },
        { id: 'd8-night-music-mirror', label: 'Espejo · calma helada', description: 'Música tenue sobre aire frío.', url: '/audio/d8-night/music/d8-night-music-mirror-frost.mp3' },
        { id: 'd8-night-music-dinner', label: 'Cena · esperanza', description: 'Desenlace íntimo y luminoso.', url: '/audio/d8-night/music/d8-night-music-dinner-hope.mp3' },
        { id: 'd8-night-combat-heroic', label: 'Combate · templo y jardín', description: 'Impulso heroico para las amenazas abiertas.', url: '/audio/d8-night/music/pixabay-heroic-battle.mp3' },
        { id: 'd8-night-combat-street', label: 'Combate · café y mercado', description: 'Tensión de calle para pelea, persecución o emboscada.', url: '/audio/d8-night/music/pixabay-battle-epic.mp3' },
        { id: 'd8-night-combat-shadow', label: 'Combate · espejo', description: 'Fantasia oscura para el Reflejo y su desenlace.', url: '/audio/d8-night/music/pixabay-blackout-battle.mp3' }
      ],
      ambience: [
        { id: 'd8-night-loop-temple-awe', label: 'Templo · resonancia', description: 'Fondo etéreo muy suave.', url: '/audio/d8-night/ambience/d8-night-ambience-temple-awe.mp3' },
        { id: 'd8-night-loop-garden-forest', label: 'Jardín · bosque', description: 'Bosque sereno en bucle.', url: '/audio/d8-night/ambience/d8-night-ambience-garden-forest.mp3' },
        { id: 'd8-night-loop-cafe-fireplace', label: 'Café · hoguera', description: 'Leña y brasa; no contiene voces.', url: '/audio/d8-night/ambience/d8-night-loop-cafe-fireplace.ogg' },
        { id: 'd8-night-loop-market-footsteps', label: 'Mercado · pasos', description: 'Textura de tránsito entre puestos.', url: '/audio/d8-night/sfx/pixabay-footsteps-wood.mp3' },
        { id: 'd8-night-loop-market-crowd', label: 'Mercado · gente', description: 'Charla y bullicio de fondo.', url: '/audio/d8-night/ambience/d8-night-loop-market-crowd.ogg' },
        { id: 'd8-night-loop-tavern-voices', label: 'Taberna · voces', description: 'Voces, risas y algún grito lejano.', url: '/audio/d8-night/ambience/d8-night-loop-market-crowd.ogg' },
        { id: 'd8-night-loop-tavern-floor', label: 'Taberna · suelo de madera', description: 'Pisadas y movimiento sobre tablas.', url: '/audio/d8-night/sfx/pixabay-footsteps-wood.mp3' },
        { id: 'd8-night-loop-horse-trot', label: 'Cabalgar · trote', description: 'Cadencia de caballo en marcha.', url: '/audio/d8-night/ambience/d8-night-loop-horse-trot.ogg' },
        { id: 'd8-night-loop-boat-waves', label: 'Barco · olas', description: 'Agua golpeando el casco.', url: '/audio/d8-night/ambience/d8-night-loop-boat-waves.mp3' },
        { id: 'd8-night-loop-boat-creak', label: 'Barco · madera', description: 'Crujido del casco y cubierta.', url: '/audio/d8-night/sfx/pixabay-door.mp3' },
        { id: 'd8-night-loop-rain-drizzle', label: 'Llovizna · lluvia fina', description: 'Lluvia discreta, sin trueno.', url: '/audio/d8-night/ambience/d8-night-ambience-rain-steady.mp3' },
        { id: 'd8-night-loop-mirror-icy-wind', label: 'Espejo · aire gélido', description: 'Viento frío y continuo.', url: '/audio/d8-night/ambience/d8-night-loop-mirror-icy-wind.ogg' },
        { id: 'd8-night-loop-storm', label: 'Tormenta · lluvia y trueno', description: 'Clima oscuro de lluvia sostenida.', url: '/audio/d8-night/ambience/d8-night-ambience-storm-thunder.ogg' },
        { id: 'd8-night-loop-rain-tempest', label: 'Temporal · lluvia y trueno', description: 'Lluvia densa, viento y trueno cercano.', url: '/audio/d8-night/ambience/d8-night-ambience-storm-thunder.ogg' }
      ],
      sfx: [
        { id: 'd8-night-sfx-step-stone', label: 'Pasos de piedra', description: 'Ruinas, templo y suelo frío.', url: '/audio/d8-night/sfx/pixabay-footsteps-stone.mp3', category: 'movement', loopable: true },
        { id: 'd8-night-sfx-step-wood', label: 'Pasos de madera', description: 'Café, puestos y cena.', url: '/audio/d8-night/sfx/pixabay-footsteps-wood.mp3', category: 'movement', loopable: true },
        { id: 'd8-night-sfx-movement-stone-02', label: 'Paso · piedra II', description: 'Alternativa de piedra para no repetir una sola pisada.', url: '/audio/d8-night/sfx/pixabay-footsteps-stone.mp3', category: 'movement', loopable: true },
        { id: 'd8-night-sfx-movement-wood-02', label: 'Paso · madera II', description: 'Tablas, muelles y suelos del café.', url: '/audio/d8-night/sfx/pixabay-footsteps-wood.mp3', category: 'movement', loopable: true },
        { id: 'd8-night-sfx-movement-gravel', label: 'Paso · grava', description: 'Camino, mercado y exterior.', url: '/audio/d8-night/sfx/pixabay-footsteps-gravel.mp3', category: 'movement', loopable: true },
        { id: 'd8-night-sfx-movement-sprint', label: 'Carrera', description: 'Persecución, huida o movimiento urgente.', url: '/audio/d8-night/sfx/pixabay-running.mp3', category: 'movement', loopable: true },
        { id: 'd8-night-sfx-attack-dagger', label: 'Daga · corte', description: 'Ataque rápido de María.', url: '/audio/d8-night/sfx/pixabay-sword-swing.mp3', category: 'combat' },
        { id: 'd8-night-sfx-combat-dagger-draw', label: 'Daga · desenvainar', description: 'Inicio de amenaza o emboscada.', url: '/audio/d8-night/sfx/pixabay-sword-swing.mp3', category: 'combat' },
        { id: 'd8-night-sfx-attack-swing', label: 'Arma · barrido', description: 'Golpe, flecha o zarza en vuelo.', url: '/audio/d8-night/sfx/pixabay-sword-swing.mp3', category: 'combat' },
        { id: 'd8-night-sfx-attack-hit', label: 'Golpe de filo', description: 'Impacto físico confirmado.', url: '/audio/d8-night/sfx/pixabay-sword-hit.mp3', category: 'combat' },
        { id: 'd8-night-sfx-combat-blade-parry', label: 'Filo · bloqueo', description: 'Parada o choque de armas.', url: '/audio/d8-night/sfx/pixabay-sword-hit.mp3', category: 'combat' },
        { id: 'd8-night-sfx-spell-arcane', label: 'Arcano · conjuro', description: 'Preparación de magia.', url: '/audio/d8-night/sfx/pixabay-magic-arcane.mp3', category: 'magic' },
        { id: 'd8-night-sfx-spell-fire', label: 'Hechizo · fuego', description: 'Proyectil y estallido ígneo.', url: '/audio/d8-night/sfx/pixabay-magic-fire.mp3', category: 'magic' },
        { id: 'd8-night-sfx-spell-ice', label: 'Hechizo · hielo', description: 'Espejo y escarcha que se quiebra.', url: '/audio/d8-night/sfx/pixabay-magic-frost.mp3', category: 'magic' },
        { id: 'd8-night-sfx-magic-ritual', label: 'Ritual · energía', description: 'Magia sostenida o invocación.', url: '/audio/d8-night/sfx/pixabay-magic-arcane.mp3', category: 'magic' },
        { id: 'd8-night-sfx-magic-fire-impact', label: 'Fuego · impacto', description: 'Remate para un proyectil ígneo.', url: '/audio/d8-night/sfx/pixabay-magic-fire.mp3', category: 'magic' },
        { id: 'd8-night-sfx-magic-spark', label: 'Magia · chispa', description: 'Truco breve o revelación menor.', url: '/audio/d8-night/sfx/pixabay-magic-spark.mp3', category: 'magic' },
        { id: 'd8-night-sfx-magic-ward', label: 'Magia · barrera', description: 'Protección, escudo o sello.', url: '/audio/d8-night/sfx/pixabay-magic-spark.mp3', category: 'magic' },
        { id: 'd8-night-sfx-magic-curse', label: 'Magia · maldición', description: 'Una presencia oscura toma forma.', url: '/audio/d8-night/sfx/pixabay-magic-arcane.mp3', category: 'magic' },
        { id: 'd8-night-sfx-magic-teleport', label: 'Magia · traslado', description: 'Desaparición, salto o portal.', url: '/audio/d8-night/sfx/pixabay-magic-impact.mp3', category: 'magic' },
        { id: 'd8-night-sfx-magic-reveal', label: 'Magia · revelación', description: 'Pista, espejo o secreto descubierto.', url: '/audio/d8-night/sfx/pixabay-magic-spark.mp3', category: 'magic' },
        { id: 'd8-night-sfx-magic-heal', label: 'Magia · sanar', description: 'Alivio, bendición o recuperación.', url: '/audio/d8-night/sfx/pixabay-magic-heal.mp3', category: 'magic' },
        { id: 'd8-night-sfx-magic-ominous', label: 'Magia · presagio', description: 'Advertencia sobrenatural antes del peligro.', url: '/audio/d8-night/sfx/pixabay-magic-arcane.mp3', category: 'magic' },
        { id: 'd8-night-sfx-creature-hurt', label: 'Criatura · herida', description: 'Rosas o Reflejo alcanzados.', url: '/audio/d8-night/sfx/pixabay-sword-hit.mp3', category: 'creature' },
        { id: 'd8-night-sfx-creature-roar', label: 'Criatura · amenaza', description: 'Entrada de peligro o reacción.', url: '/audio/d8-night/sfx/pixabay-creature-roar.mp3', category: 'creature' },
        { id: 'd8-night-sfx-creature-growl', label: 'Criatura · gruñido', description: 'Animal, bestia o presencia hostil.', url: '/audio/d8-night/sfx/pixabay-creature-growl.mp3', category: 'creature' },
        { id: 'd8-night-sfx-creature-roar-02', label: 'Criatura · rugido II', description: 'Variante para amenaza intensa.', url: '/audio/d8-night/sfx/pixabay-creature-roar.mp3', category: 'creature' },
        { id: 'd8-night-sfx-creature-defeat', label: 'Criatura · derrota', description: 'Final de un monstruo o rosa asesina.', url: '/audio/d8-night/sfx/pixabay-magic-impact.mp3', category: 'creature' },
        { id: 'd8-night-sfx-door', label: 'Puerta · abrir', description: 'Entrada, revelación o cambio de escena.', url: '/audio/d8-night/sfx/pixabay-door.mp3', category: 'object' },
        { id: 'd8-night-sfx-world-door-close', label: 'Puerta · cerrar', description: 'Clausura, secreto o despedida.', url: '/audio/d8-night/sfx/pixabay-door.mp3', category: 'object' },
        { id: 'd8-night-sfx-book', label: 'Libro · página', description: 'Pista, ritual o consulta.', url: '/audio/d8-night/sfx/pixabay-page-turn.mp3', category: 'object' },
        { id: 'd8-night-sfx-world-book-open', label: 'Libro · abrir', description: 'Inicio de lectura o descubrimiento.', url: '/audio/d8-night/sfx/pixabay-page-turn.mp3', category: 'object' },
        { id: 'd8-night-sfx-coins', label: 'Monedas', description: 'Mercado, trato o recompensa.', url: '/audio/d8-night/sfx/pixabay-coins.mp3', category: 'object' },
        { id: 'd8-night-sfx-mirror', label: 'Espejo · grieta', description: 'Una verdad se rompe.', url: '/audio/d8-night/sfx/pixabay-magic-frost.mp3', category: 'object' },
        { id: 'd8-night-sfx-world-lock', label: 'Cerradura', description: 'Forzar, abrir o descubrir un mecanismo.', url: '/audio/d8-night/sfx/pixabay-sword-hit.mp3', category: 'object' },
        { id: 'd8-night-sfx-world-lock-latch', label: 'Pestillo metálico', description: 'Cierre pequeño, cadena o mecanismo.', url: '/audio/d8-night/sfx/pixabay-sword-hit.mp3', category: 'object' },
        { id: 'd8-night-sfx-world-chain', label: 'Cadena', description: 'Grilletes, reja o elevador viejo.', url: '/audio/d8-night/sfx/pixabay-chain.mp3', category: 'object' },
        { id: 'd8-night-sfx-world-gem', label: 'Gema', description: 'Tesoro, objeto mágico o hallazgo.', url: '/audio/d8-night/sfx/pixabay-magic-spark.mp3', category: 'object' },
        { id: 'd8-night-sfx-world-metal', label: 'Metal', description: 'Armadura, herramienta o puerta pesada.', url: '/audio/d8-night/sfx/pixabay-sword-hit.mp3', category: 'object' },
        { id: 'd8-night-sfx-world-wood-impact', label: 'Madera · impacto', description: 'Barril, puerta, puesto o cubierta.', url: '/audio/d8-night/sfx/pixabay-wood-impact.mp3', category: 'object' },
        { id: 'd8-night-sfx-world-stone-impact', label: 'Piedra · impacto', description: 'Escombro, pared o suelo antiguo.', url: '/audio/d8-night/sfx/pixabay-stone-impact.mp3', category: 'object' },
        { id: 'd8-night-sfx-world-leather-pack', label: 'Cuero · equipo', description: 'Mochila, funda o preparación.', url: '/audio/d8-night/sfx/pixabay-footsteps-wood.mp3', category: 'object' },
        { id: 'd8-night-sfx-cafe-chair', label: 'Café · silla', description: 'Madera, patas y asiento que se mueve.', url: '/audio/d8-night/sfx/pixabay-wood-impact.mp3', category: 'scene' },
        { id: 'd8-night-sfx-cafe-glass', label: 'Café · vaso', description: 'Cristal sobre una mesa: discreto, sin voz.', url: '/audio/d8-night/sfx/pixabay-glass-clink.mp3', category: 'scene' },
        { id: 'd8-night-sfx-cafe-drink', label: 'Café · bebida', description: 'Un sorbo puntual para dar vida al local.', url: '/audio/d8-night/sfx/pixabay-drink.mp3', category: 'scene' },
        { id: 'd8-night-sfx-market-shout', label: 'Mercado · grito', description: 'Un vendedor llama a distancia.', url: '/audio/d8-night/sfx/pixabay-market-shout.mp3', category: 'scene' }
      ]
    },
    sceneProfiles: {
      temple: { music: { id: 'd8-night-music-temple', playing: true, volume: .28 }, layers: { ocean: { id: 'd8-night-loop-temple-awe', playing: false, volume: .12 }, wind: { id: 'd8-night-loop-temple-awe', playing: false, volume: .1 }, wood: { id: 'd8-night-loop-cafe-fireplace', playing: false, volume: .1 }, storm: { id: 'd8-night-loop-storm', playing: false, volume: .25 } } },
      garden: { music: { id: 'd8-night-music-garden', playing: false, volume: .25 }, layers: { ocean: { id: 'd8-night-loop-garden-forest', playing: true, volume: .34 }, wind: { id: 'd8-night-loop-mirror-icy-wind', playing: false, volume: .1 }, wood: { id: 'd8-night-loop-cafe-fireplace', playing: false, volume: .1 }, storm: { id: 'd8-night-loop-storm', playing: false, volume: .25 } } },
      cafe: { music: { id: 'd8-night-music-cafe', playing: false, volume: .25 }, layers: { ocean: { id: 'd8-night-loop-cafe-fireplace', playing: true, volume: .32 }, wind: { id: 'd8-night-loop-temple-awe', playing: false, volume: .1 }, wood: { id: 'd8-night-loop-market-footsteps', playing: false, volume: .08 }, storm: { id: 'd8-night-loop-storm', playing: false, volume: .25 } } },
      market: { music: { id: 'd8-night-music-market', playing: false, volume: .25 }, layers: { ocean: { id: 'd8-night-loop-market-footsteps', playing: true, volume: .12 }, wind: { id: 'd8-night-loop-market-crowd', playing: true, volume: .18 }, wood: { id: 'd8-night-loop-cafe-fireplace', playing: false, volume: .1 }, storm: { id: 'd8-night-loop-storm', playing: false, volume: .25 } } },
      mirror: { music: { id: 'd8-night-music-mirror', playing: true, volume: .25 }, layers: { ocean: { id: 'd8-night-loop-garden-forest', playing: false, volume: .1 }, wind: { id: 'd8-night-loop-mirror-icy-wind', playing: true, volume: .26 }, wood: { id: 'd8-night-loop-cafe-fireplace', playing: false, volume: .1 }, storm: { id: 'd8-night-loop-storm', playing: false, volume: .25 } } },
      dinner: { music: { id: 'd8-night-music-dinner', playing: true, volume: .25 }, layers: { ocean: { id: 'd8-night-loop-cafe-fireplace', playing: false, volume: .1 }, wind: { id: 'd8-night-loop-temple-awe', playing: false, volume: .1 }, wood: { id: 'd8-night-loop-market-footsteps', playing: false, volume: .08 }, storm: { id: 'd8-night-loop-storm', playing: false, volume: .25 } } }
    }
  }
};

export const oneShotCampaignDefinition = validatePublicCampaign(definition);
