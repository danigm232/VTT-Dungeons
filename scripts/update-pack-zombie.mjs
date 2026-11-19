import fs from 'node:fs';

const file = 'campaigns/stormwreck-isle/public/pack.ts';
let content = fs.readFileSync(file, 'utf8');

const regex = / {4}zombie:\s*\{[\s\S]*?defeated:[^\n]+\n {4}\},/;

const replacement = `    zombie: {
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

if (!regex.test(content)) {
  console.error('Regex target not matched in pack.ts!');
  process.exit(1);
}

content = content.replace(regex, replacement);
fs.writeFileSync(file, content, 'utf8');
console.log('Successfully updated pack.ts!');
