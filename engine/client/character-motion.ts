import type { PublicCampaignDefinition } from '../shared/campaign.js';
import atlasData from './character-motion-frames.json' with { type: 'json' };

type Animation = PublicCampaignDefinition['tokenAnimations'][string][string];
type States = PublicCampaignDefinition['tokenAnimations'][string];
const directions = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'] as const;
export const MINIMUM_MOVEMENT_FRAMES = 8;
const atlases = atlasData.atlases as Record<string, {frames: Array<{x:number;y:number;width:number;height:number;height_scale:number}>}>;
const profiles = new Map<string, States>();

function row(id: string, index: number, fps: number, loop: boolean): Animation | undefined {
  const atlas = atlases[id];
  if (!atlas) return;
  const frames = atlas.frames.slice(index * 8, index * 8 + 8);
  if (frames.length < MINIMUM_MOVEMENT_FRAMES) throw new Error(`Incomplete movement: ${id}/${index}`);
  return {fps, loop, frames:frames.map(frame=>({url:`/art/character-motion-v1/${id}.png`,
    x:frame.x,y:frame.y,width:frame.width,height:frame.height,
    logicalWidth:92*frame.height_scale,logicalHeight:92*frame.height_scale,
    anchorX:.5,anchorY:(frame.height-6)/frame.height}))};
}

function profile(hero:string):States {
  const cached=profiles.get(hero);if(cached)return cached;
  const states:States={};
  for(const [index,direction]of directions.entries()){
    const walk=row(`${hero}-walk`,index,hero==='zombie'?10:12,true);
    const run=row(`${hero}-run`,index,hero==='zombie'?16:18,true);
    const torch=row(`${hero}-torch`,index,12,true);
    const attack=row(`${hero}-attack`,index,10,false);
    const unarmed=row(`${hero}-unarmed`,index,10,false);
    if(walk){
      states[`moving-${direction}`]=walk;
      states[`direction-${direction}`]={...walk,frames:[walk.frames[0]!],fps:1};
    }
    if(run)states[`running-${direction}`]=run;
    if(attack)states[`attack-${direction}`]=attack;
    if(unarmed)states[`attack-unarmed-${direction}`]=unarmed;
    if(torch){
      states[`torch-walk-${direction}`]=torch;
      states[`torch-run-${direction}`]={...torch,fps:18};
      states[`torch-idle-${direction}`]={...torch,frames:[torch.frames[0]!],fps:1};
    }
  }
  const actions=['running','stealth','climb','swim','crawl','jump','attack',hero==='zombie'?'grapple':'interact'];
  actions.forEach((state,index)=>{
    const clip=row(`${hero}-actions`,index,state==='jump'?14.285714:10,['running','stealth','climb','swim','crawl'].includes(state));
    if(!clip)return;
    states[state]=clip;
    if(state==='running'||state==='attack')return;
    if(state!=='climb')for(const direction of directions)states[`${state}-${direction}`]={...clip,flipX:['w','nw','sw'].includes(direction)};
  });
  for(const state of ['moving','running','attack'])if(states[`${state}-s`])states[state]=states[`${state}-s`]!;
  if(states.climb)states.climbing=states.climb;
  if(states.swim)states.swimming=states.swim;
  if(states.jump)states.jumping=states.jump;
  if(states.grapple)states.entangle=states.grapple;
  if(states['attack-unarmed-s'])states['attack-unarmed']=states['attack-unarmed-s']!;
  if(hero.startsWith('zombie')||hero==='harpy')installNpcProfile(hero,states);
  profiles.set(hero,states);return states;
}

function installNpcProfile(hero:string,states:States){
  const zombie=hero.startsWith('zombie');
  for(const [i,direction]of directions.entries()){
    const walk=row(`${hero}-walk`,i,zombie?10:12,true);
    const attack=row(zombie?`${hero}-attack`:'harpy-claws',i,10,false);
    if(walk){
      states[`moving-${direction}`]=walk;
      const rest={...walk,frames:[walk.frames[0]!],fps:1};
      for(const state of ['direction','idle','idle-standing','combat-idle'])states[`${state}-${direction}`]=rest;
    }
    const run=row(zombie?`${hero}-run`:'harpy-flight',i,16,true)??(walk?{...walk,fps:16}:undefined);
    if(run)states[`running-${direction}`]=run;
    if(attack)states[`attack-${direction}`]=attack;
    if(!zombie){
      const club=row('harpy-club',i,10,false);
      if(club)states[`attack-club-${direction}`]=club;
      if(run)states[`fly-${direction}`]=run;
    }
  }
  const names=zombie?['attack-bite','grapple','hit','fall','stand','crawl','fortitude','combat-idle']:['song','takeoff','land','hit','fall','stand','crawl','combat-idle'];
  names.forEach((name,i)=>{
    const clip=row(hero+(zombie?'-reactions':'-utility'),i,name==='combat-idle'?4:10,['crawl','combat-idle','song'].includes(name));
    if(!clip)return;states[name]=clip;
    if(['attack-bite','grapple','crawl'].includes(name))for(const direction of directions)states[`${name}-${direction}`]={...clip,flipX:['w','nw','sw'].includes(direction)};
  });
  for(const name of ['moving','running','attack','attack-club','fly'])if(states[`${name}-s`])states[name]=states[`${name}-s`]!;
  if(states['combat-idle'])states.idle=states['combat-idle'];
  if(states.hit)for(const name of ['hit-physical','hit-fire','hit-arcane'])states[name]=states.hit;
  if(states.fall){
    states.defeated={...states.fall,loop:false};
    states.prone={...states.fall,frames:[states.fall.frames.at(-1)!],fps:1,loop:true};
  }
  if(zombie&&states['attack-bite'])states['attack-secondary']=states['attack-bite'];
  if(states.grapple)states.entangle=states.grapple;
  if(states.song)states.spell=states.song;
}

/** Shared art contract for existing identities only; never adds actors or rules.
 * Runs last so an older API/legacy facing installer cannot restore short cycles. */
export function installCharacterMotion(campaign:PublicCampaignDefinition){
  const candidates:Array<[string,string,string[]]>=[
    ['cleric','cleric',['/art/tokens/cleric.png']],
    ['wizard','wizard',['/art/tokens/wizard.png']],
    ['rogue','rogue',['/art/tokens/Maria Trinity D8/maria_base.png','/art/m3/trinity/maria_base.png']],
    ['silverfarben-hotel','silverfarben',['/art/tokens/Silverfarben Hotel/silverfarben_hotel_base.png']],
    ['zombie','zombie',['/art/m3/zombie/zombie1_base.png']],
    ...[2,3,4].map(n=>[`zombie-${n}`,`zombie-${n}`,[`/art/m3/zombie/zombie${n}_base.png`]] as [string,string,string[]]),
    ['harpy','harpy',['/art/m3/harpy/harpia_base.png']]
  ];
  for(const [token,hero,skins]of candidates){
    if(!skins.includes(campaign.tokens[token]?.url??'')||!campaign.tokenAnimations[token])continue;
    Object.assign(campaign.tokenAnimations[token]!,structuredClone(profile(hero)));
  }
  return campaign;
}
