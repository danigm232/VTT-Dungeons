import fs from 'node:fs';

const file = 'campaigns/stormwreck-isle/public/pack.ts';
let content = fs.readFileSync(file, 'utf8');

// Normalize CRLF to LF
content = content.replace(/\r\n/g, '\n');

// Find start of tokens: {
const tokensIdx = content.indexOf('  tokens: {');
// Find start of props: {
const propsIdx = content.indexOf('  props: {');

if (tokensIdx === -1 || propsIdx === -1) {
  console.error('Could not find tokens or props index');
  process.exit(1);
}

const beforeTokens = content.slice(0, tokensIdx);
const fromProps = content.slice(propsIdx);

const correctTokensAndAnimations = `  tokens: {
    // Visual stature estimates; these do not change size categories/reach/rules.
    wizard: { url: '/art/tokens/wizard.png', logicalWidth: 92, logicalHeight: 92, worldHeightMeters: 1.8, anchorX: 0.5, anchorY: 0.84 },
    cleric: { url: '/art/tokens/cleric.png', logicalWidth: 92, logicalHeight: 92, worldHeightMeters: 1.3, anchorX: 0.5, anchorY: 0.84 },
    rogue: { url: '/art/m3/trinity/maria_base.png', logicalWidth: 92, logicalHeight: 92, worldHeightMeters: 1.05, anchorX: 0.5, anchorY: 0.84 },
    harpy: { url: '/art/m3/harpy/harpia_base.png', logicalWidth: 112, logicalHeight: 112, worldHeightMeters: 1.7, anchorX: 0.5, anchorY: 0.9 },
    zombie: { url: '/art/m3/zombie/zombie1_base.png', logicalWidth: 96, logicalHeight: 96, worldHeightMeters: 1.8, anchorX: 0.5, anchorY: 0.9 },
    ghoul: { url: '/art/m3/ghoul/ghoul_base.png', logicalWidth: 100, logicalHeight: 100, worldHeightMeters: 1.7, anchorX: 0.5, anchorY: 0.92 },
    // These are portrait markers, not full-body art: do not turn a face into
    // a human-height disk. Their display height is not a character statistic.
    'npc-runara': { url: '/art/stormwreck/retreat/runara.svg', logicalWidth: 88, logicalHeight: 100, worldHeightMeters: .85, anchorX: 0.5, anchorY: 0.92 },
    'npc-tarak': { url: '/art/stormwreck/retreat/tarak.svg', logicalWidth: 88, logicalHeight: 100, worldHeightMeters: .85, anchorX: 0.5, anchorY: 0.92 },
    'npc-varnoth': { url: '/art/stormwreck/retreat/varnoth.svg', logicalWidth: 88, logicalHeight: 100, worldHeightMeters: .85, anchorX: 0.5, anchorY: 0.92 },
    'retreat-kobold': { url: '/art/stormwreck/retreat/kobold.svg', logicalWidth: 88, logicalHeight: 100, worldHeightMeters: .6, anchorX: 0.5, anchorY: 0.92 },
    'retreat-marker': { url: '/art/stormwreck/retreat/marker.svg', logicalWidth: 72, logicalHeight: 84, worldHeightMeters: .9, anchorX: 0.5, anchorY: 0.92 },
    'retreat-site-point': {url:'/art/stormwreck/retreat/site-point.svg',logicalWidth:48,logicalHeight:48,worldHeightMeters:.32,anchorX:.5,anchorY:.8},
    'wreck-rowboat': { url: '/art/stormwreck/rowboat.svg', logicalWidth: 150, logicalHeight: 84, anchorX: 0.5, anchorY: 0.72 }
  },
  tokenAnimations: {
    'retreat-site-point':{idle:{frames:['/art/stormwreck/retreat/site-point.svg'],fps:1},talk:{frames:['/art/stormwreck/retreat/site-point.svg'],fps:1}},
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
      idle: { frames: ['/art/m3/zombie/zombie1_idle_01.png', '/art/m3/zombie/zombie1_idle_02.png', '/art/m3/zombie/zombie1_idle_03.png', '/art/m3/zombie/zombie1_tambaleo.png'], fps: 3 },
      'combat-idle': { frames: ['/art/m3/zombie/zombie1_acecho.png', '/art/m3/zombie/zombie1_amenaza.png', '/art/m3/zombie/zombie1_pausa.png', '/art/m3/zombie/zombie1_acecho.png'], fps: 4 },
      moving: artCycle('zombie', 'zombie1_caminar', 4, 6),
      running: artCycle('zombie', 'zombie1_moverse_rapido', 4, 8),
      attack: artCycle('zombie', 'zombie1_ataque', 4, 8),
      'attack-secondary': artCycle('zombie', 'zombie1_ataque2', 4, 8),
      'attack-bite': artCycle('zombie', 'zombie1_ataque2', 4, 8),
      grapple: artCycle('zombie', 'zombie1_agarrar', 4, 6),
      entangle: artCycle('zombie', 'zombie1_agarrar', 4, 6),
      hit: { frames: ['/art/m3/zombie/zombie1_hit_01.png', '/art/m3/zombie/zombie1_hit_02.png', '/art/m3/zombie/zombie1_herido.png', '/art/m3/zombie/zombie1_hit_01.png'], fps: 8 },
      'hit-physical': { frames: ['/art/m3/zombie/zombie1_hit_01.png', '/art/m3/zombie/zombie1_hit_02.png', '/art/m3/zombie/zombie1_herido.png', '/art/m3/zombie/zombie1_hit_01.png'], fps: 8 },
      'hit-fire': { frames: ['/art/m3/zombie/zombie1_hit_01.png', '/art/m3/zombie/zombie1_herido.png', '/art/m3/zombie/zombie1_hit_02.png', '/art/m3/zombie/zombie1_herido.png'], fps: 8 },
      'hit-arcane': { frames: ['/art/m3/zombie/zombie1_hit_02.png', '/art/m3/zombie/zombie1_herido.png', '/art/m3/zombie/zombie1_hit_01.png', '/art/m3/zombie/zombie1_herido.png'], fps: 8 },
      fall: { frames: ['/art/m3/zombie/zombie1_levantarse_04.png', '/art/m3/zombie/zombie1_levantarse_03.png', '/art/m3/zombie/zombie1_levantarse_02.png', '/art/m3/zombie/zombie1_levantarse_01.png'], fps: 7 },
      prone: { frames: ['/art/m3/zombie/zombie1_arrastrarse_01.png', '/art/m3/zombie/zombie1_arrastrarse_02.png', '/art/m3/zombie/zombie1_arrastrarse_03.png', '/art/m3/zombie/zombie1_arrastrarse_02.png'], fps: 3 },
      crawl: artCycle('zombie', 'zombie1_arrastrarse', 4, 5),
      stand: artCycle('zombie', 'zombie1_levantarse', 4, 6),
      flee: { frames: ['/art/m3/zombie/zombie1_herido.png', '/art/m3/zombie/zombie1_tambaleo.png', '/art/m3/zombie/zombie1_caminar_02.png', '/art/m3/zombie/zombie1_caminar_04.png'], fps: 6 },
      defeated: { frames: ['/art/m3/zombie/zombie1_hit_02.png', '/art/m3/zombie/zombie1_levantarse_02.png', '/art/m3/zombie/zombie1_arrastrarse_01.png', '/art/m3/zombie/zombie1_muerto.png'], fps: 4 }
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
`;

const finalContent = (beforeTokens + correctTokensAndAnimations + fromProps).replace(/\n/g, '\r\n');
fs.writeFileSync(file, finalContent, 'utf8');
console.log('Restored and updated pack.ts cleanly!');
