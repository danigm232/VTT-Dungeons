import fs from 'node:fs';

let content = fs.readFileSync('engine/client/wreck-ocean.ts', 'utf8');

const target = `float horizon=1.-scenicHorizon*smoothstep(73.,185.,length(ship))*smoothstep(.34,.81,reflectionClip.y/reflectionClip.w);`;
const replacement = `float horizon=1.-scenicHorizon*smoothstep(20.,55.,length(ship))*smoothstep(.30,.76,reflectionClip.y/reflectionClip.w);`;

if (!content.includes(target)) {
  throw new Error('target string not found in wreck-ocean.ts');
}

content = content.replace(target, replacement);
fs.writeFileSync('engine/client/wreck-ocean.ts', content, 'utf8');
console.log('Successfully updated wreck-ocean.ts horizon');
