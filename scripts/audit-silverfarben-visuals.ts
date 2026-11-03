/** Read-only catalogue audit: no sockets and no persistent game state. */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { oneShotCampaignDefinition as campaign } from '../campaigns/one-shot/public/pack.js';
import { oneShotBundle } from '../campaigns/one-shot/server.js';
import { GameState } from '../engine/server/game.js';
import { conditionSpriteSelection } from '../engine/client/condition-sprites.js';
import { combatActionVisualState } from '../engine/shared/combat-animation.js';
import { explorationBasicActionCatalogue, basicCombatActionAnimationStates } from '../engine/shared/protocol.js';
import { silverfarbenFramesV4 } from '../campaigns/one-shot/public/silverfarben-frames-v4.js';
import type { CombatCondition } from '../engine/shared/protocol.js';

const out = path.resolve(process.argv[2] ?? 'output/silverfarben-audit-20261020');
const tokenId = 'silverfarben-hotel', states = campaign.tokenAnimations[tokenId]!;
const state = new GameState(oneShotBundle), actor = state.characters.get('aoife')!;
const conditions = ['inconsciente','paralizada','restringida','agarrada','asustada','envenenada','hechizada','derribada','invisible','oculta'] as CombatCondition[];
const conditionPoses = Object.fromEntries(conditions.map(condition => [condition, conditionSpriteSelection(states,condition)]));
const required = [...new Set(['idle','moving','running','jump','climb','swim','crawl','fall','stand','sit',
  ...Object.values(basicCombatActionAnimationStates), ...Object.values(explorationBasicActionCatalogue).map(a => a.animation),
  ...actor.combat.attacks.map(a => combatActionVisualState(a))])];
const missing = required.filter(role => !states[role]?.frames.length);
const urls = [...new Set(Object.values(states).flatMap(clip => clip.frames.map(f => typeof f === 'string' ? f : f.url)))];
const missingFiles = urls.filter(url => !existsSync(path.resolve('campaigns/one-shot/public',url.slice(1))));
const sizes = new Map(urls.filter(url=>!missingFiles.includes(url)).map(url=>{
  const bytes=readFileSync(path.resolve('campaigns/one-shot/public',url.slice(1)));
  return [url,[bytes.readUInt32BE(16),bytes.readUInt32BE(20)] as const] as const;
}));
const invalidFrames = Object.entries(states).flatMap(([state,clip])=>clip.frames.flatMap((frame,index)=>{
  if(typeof frame==='string')return [];
  const size=sizes.get(frame.url);
  return !size||frame.x+frame.width>size[0]||frame.y+frame.height>size[1] ? [{state,index,frame,size}] : [];
}));
const report = { tokenId, asset: campaign.tokens[tokenId], required, missing, missingFiles, invalidFrames,
  attacks: actor.combat.attacks.map(a => ({id:a.id,label:a.label,state:combatActionVisualState(a)})),
  states, conditionPoses, counts: {clips:Object.keys(states).length,frames:Object.values(states).reduce((n,c)=>n+c.frames.length,0),pngs:urls.length} };
mkdirSync(out,{recursive:true});
writeFileSync(path.join(out,'catalogue.json'),JSON.stringify(report,null,2)+'\n');
if(process.argv.includes('--publish-preview')){
  const phaseLabels=Object.fromEntries(Object.entries(silverfarbenFramesV4).map(([name,atlas])=>[
    name.startsWith('spell-')?'spell':name.replace(/6$/,''),atlas.phases
  ]));
  writeFileSync(path.resolve('campaigns/one-shot/public/art/silverfarben-v3/catalogue.json'),JSON.stringify({asset:report.asset,states,phaseLabels,revision:'v4'})+'\n');
}
console.log(JSON.stringify({out, ...report.counts,missing,missingFiles,invalidFrames,attacks:report.attacks}));
if(missing.length || missingFiles.length || invalidFrames.length) process.exitCode = 1;
