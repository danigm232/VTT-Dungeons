import fs from 'node:fs';

const file = 'campaigns/stormwreck-isle/public/pack.ts';
let content = fs.readFileSync(file, 'utf8');

// 1. In tokens: restore zombie token definition
const badTokensZombie = `    zombie: {
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
    },`;

const goodTokensZombie = `    zombie: { url: '/art/m3/zombie/zombie1_base.png', logicalWidth: 96, logicalHeight: 96, worldHeightMeters: 1.8, anchorX: 0.5, anchorY: 0.9 },`;

// Normalize CRLF for matching
content = content.replace(/\r\n/g, '\n');
content = content.replace(badTokensZombie, goodTokensZombie);

// 2. In tokenAnimations: replace old zombie animations with full suite
const oldAnimationsZombie = `    zombie: {
      idle: artCycle('zombie', 'zombie1_idle', 3, 3), moving: artCycle('zombie', 'zombie1_caminar', 4, 6),
      attack: artCycle('zombie', 'zombie1_ataque', 4, 8), hit: { frames: ['/art/m3/zombie/zombie1_hit_01.png'], fps: 6 },
      defeated: { frames: ['/art/m3/zombie/zombie1_muerto.png'], fps: 1 }
    },`;

const fullAnimationsZombie = `    zombie: {
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
    },`;

content = content.replace(oldAnimationsZombie, fullAnimationsZombie);

// Re-convert to CRLF for consistency
content = content.replace(/\n/g, '\r\n');
fs.writeFileSync(file, content, 'utf8');
console.log('Fixed pack.ts perfectly!');
