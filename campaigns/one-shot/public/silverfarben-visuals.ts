import type { PublicCampaignDefinition } from '../../../engine/shared/campaign.js';
import { silverfarbenFramesV3 } from './silverfarben-frames-v3.js';
import { silverfarbenFramesV4 } from './silverfarben-frames-v4.js';

type Animation = PublicCampaignDefinition['tokenAnimations'][string][string];
type Frame = Exclude<Animation['frames'][number], string>;
type Atlas = { columns: number; frames: Array<Omit<Frame,'alphaSeeds'> & {alphaSeeds: number[][]}> };
const atlases = silverfarbenFramesV3 as Record<string, Atlas>;
const replacements = silverfarbenFramesV4 as Record<string, Atlas>;
const directions = ['n','ne','e','se','s','sw','w','nw'] as const;
const sourceRows = [0,1,2,3,4,3,2,1];
let cached: PublicCampaignDefinition['tokenAnimations'][string] | undefined;

function profile() {
  if (cached) return cached;
  const states: PublicCampaignDefinition['tokenAnimations'][string] = {};
  const row = (name: string, index: number, fps: number, loop: boolean, count?: number): Animation | undefined => {
    const atlas = atlases[name]; if (!atlas) return;
    count??=atlas.columns;
    const frames = atlas.frames.slice(index*count,(index+1)*count);
    if (frames.length !== count) throw new Error(`Incomplete Silverfarben atlas: ${name}/${index}`);
    return { frames: frames.map(frame => ({ ...frame,
      alphaSeeds: frame.alphaSeeds.map(seed => [seed[0]!,seed[1]!] as [number,number]) })), fps, loop };
  };
  const directional = (name: string, roles: string[], fps: number, loop = false) => {
    for (const [index,dir] of directions.entries()) {
      const clip = row(name,sourceRows[index]!,fps,loop); if (!clip) continue;
      clip.flipX = index > 4;
      for (const role of roles) states[`${role}-${dir}`] = clip;
    }
    for (const role of roles) if (states[`${role}-s`]) states[role] = states[`${role}-s`]!;
  };
  // A real planted-foot rest, rather than freezing a raised boot mid-stride.
  const restRows=[4,3,2,1,0,1,2,3];
  for(const [index,dir] of directions.entries()){
    const rest=row('model',restRows[index]!,1,true,1);if(!rest)continue;
    rest.flipX=index>4;
    for(const role of ['idle','idle-standing','combat-idle'])states[`${role}-${dir}`]=rest;
  }
  for(const role of ['idle','idle-standing','combat-idle'])if(states[`${role}-s`])states[role]=states[`${role}-s`]!;
  for(const [index,dir] of directions.entries()){
    const source=directions[sourceRows[index]!]!;
    const clip=row(`run-${source}6`,0,14,true,6);if(clip)states[`running-${dir}`]={...clip,flipX:index>4};
  }
  if(states['running-s'])states.running=states['running-s']!;
  directional('spell6',['spell','spell-fog','spell-feather'],9);
  directional('jump6',['jump','jumping'],8);
  directional('dagger6',['attack'],9);
  for(const [name,role] of [['bow6','attack-arrow'],['unarmed6','attack-unarmed'],['throw6','attack-throw']] as const){
    const clip=row(name,0,9,false,6);if(!clip)continue;
    states[role]=clip;
    if(role!=='attack-unarmed')states[`${role}-mirrored`]={...clip,flipX:true};
  }
  for (const [name,roles] of [
    ['gestures6',['talk','help','influence']],
    ['utility6',['search','study','interact']],
    ['reactions6',['dodge','hit','ready']]
  ] as const) roles.forEach((role,index) => { const clip=row(name,index,9,false); if(clip)states[role]=clip; });
  const torch=atlases.torch6;
  if(torch)states['use-torch']={frames:torch.frames.map(frame=>({...frame,alphaSeeds:frame.alphaSeeds.map(seed=>[seed[0]!,seed[1]!] as [number,number])})),fps:8,loop:false};
  for (const role of ['hit-physical','hit-fire','hit-arcane']) if(states.hit)states[role]=states.hit;
  ['envenenada','asustada','paralizada','restringida','agarrada','hechizada','derribada','inconsciente'].forEach((condition,index) => {
    const clip=row('conditions3',index,2,true,3); if(clip)states[`condition-${condition}`]=clip;
  });
  if(states['condition-derribada'])states.prone={...states['condition-derribada']!,frames:[states['condition-derribada']!.frames[0]!],fps:1};
  if(states['condition-inconsciente'])states.defeated={...states['condition-inconsciente']!,frames:[states['condition-inconsciente']!.frames[0]!],fps:1};
  // V4 replaces only the nine reviewed actions. Keep the same physical height,
  // source-art proportions and one uniform, isotropic scale per source atlas.
  const replacement=(name:string,fps:number,loop:boolean):Animation=>{
    const atlas=replacements[name];
    if(!atlas||atlas.frames.length<6)throw new Error(`Incomplete Silverfarben replacement: ${name}`);
    return {frames:atlas.frames.map(frame=>({...frame,alphaSeeds:frame.alphaSeeds.map(seed=>[seed[0]!,seed[1]!] as [number,number])})),fps,loop};
  };
  for(const [index,dir] of directions.entries()){
    const source=directions[sourceRows[index]!]!;
    const clip={...replacement(`spell-${source}6`,9,false),flipX:index>4};
    for(const role of ['spell','spell-fog','spell-feather'])states[`${role}-${dir}`]=clip;
  }
  for(const role of ['spell','spell-fog','spell-feather'])states[role]=states[`${role}-s`]!;
  for(const [name,roles,fps] of [
    ['climb6',['climb','climbing'],7],['swim6',['swim','swimming'],8],['crawl6',['crawl'],7]
  ] as const){
    const clip=replacement(name,fps,true);
    for(const role of roles)states[role]=clip;
  }
  for(const [condition,fps] of [['paralizada',2],['restringida',4],['agarrada',4],['hechizada',3],['derribada',3]] as const)
    states[`condition-${condition}`]=replacement(`condition-${condition}6`,fps,true);
  states.prone=states['condition-derribada']!;
  cached=states; return states;
}

/** Character-local art, reusable by every map. No actors, stats, movement
 * budgets or physical height are added/changed. Safe on old server catalogues. */
export function installSilverfarbenVisuals(campaign: PublicCampaignDefinition) {
  const id='silverfarben-hotel';
  if(campaign.tokens[id]?.url!=='/art/tokens/Silverfarben Hotel/silverfarben_hotel_base.png')return campaign;
  const states=campaign.tokenAnimations[id]; if(!states)return campaign;
  Object.assign(states,profile());
  // Disengaging uses the current isolated stride, never the obsolete collage.
  for(const dir of directions)if(states[`moving-${dir}`])states[`disengage-${dir}`]=states[`moving-${dir}`]!;
  const sit=states.sit?.frames[0];
  if(sit&&typeof sit!=='string'&&sit.url==='/art/tokens/Silverfarben Hotel/silverfarben_seated_v48.png'&&(sit.width>1254||sit.height>1254))
    states.sit={frames:[{...sit,width:1254,height:1254}],fps:1};
  return campaign;
}
