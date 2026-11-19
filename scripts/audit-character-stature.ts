import {writeFile,readFile} from 'node:fs/promises';
import {oneShotCampaignDefinition} from '../campaigns/one-shot/public/pack';
import {publicCampaignDefinition as stormwreckCampaignDefinition} from '../campaigns/stormwreck-isle/public/pack';
const folder='output/npc-sprites-20261115/overlays-options-20261116';
const entries=[];
for(const [campaign,definition]of [['d8',oneShotCampaignDefinition],['stormwreck',stormwreckCampaignDefinition]]as const){
 for(const [id,token]of Object.entries(definition.tokens)){
  const marker=id.startsWith('npc-')||id.startsWith('retreat-');
  const prop=id==='wreck-rowboat';
  entries.push({campaign,id,url:token.url,heightSettingMeters:token.worldHeightMeters??null,meaning:prop?'prop':marker?'marker display height; not physical stature':'visual calibration; exact individual height not verified',individualCanonicalHeightMeters:null,animationStates:Object.keys(definition.tokenAnimations[id]??{}).length});
 }
}
const atlas=JSON.parse(await readFile('prototypes/godot-shared/sprites/frames.json','utf8'));
const atlasRows=Object.entries(atlas.atlases).map(([id,value])=>{
 const spec=value as {reference_height:number;frames:Array<{height_scale:number;source_bounds:number[]}>};
 return {id,frames:spec.frames.length,referenceHeightPixels:spec.reference_height,minSilhouetteHeightRatio:Math.min(...spec.frames.map(f=>f.source_bounds[3]!/spec.reference_height)),maxSilhouetteHeightRatio:Math.max(...spec.frames.map(f=>f.source_bounds[3]!/spec.reference_height)),note:'Pose envelope changes with crouching, lying, jumping or raised arms; not an individual height change.'};
});
await writeFile(folder+'/stature-source-audit.json',JSON.stringify({date:'2026-11-16',basis:'Current campaign token settings; source comments distinguish visual estimates and markers. Original premade sheets p2 ask the player to choose height, weight, age and appearance.',entries,atlases:atlasRows,exactIndividualHeightsVerified:0},null,2)+'\n');
console.log(JSON.stringify({tokenSettings:entries.length,atlases:atlasRows.length,frames:atlasRows.reduce((n,a)=>n+a.frames,0),exactHeights:'not asserted'}));
