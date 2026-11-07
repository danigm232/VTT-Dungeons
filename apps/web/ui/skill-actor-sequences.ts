import type { ActorAnimation, SkillPhase } from '../../../engine/client/skill-micro-scene';
import atlasMetadata from './art/skill-animation-v3.json';
import extendedMetadata from './art/skill-animation-v5.json';

type SpriteFrame = { url: string; x: number; y: number; width: number; height: number; anchorX: number; anchorY: number; alphaSeeds?: [number,number][] };
type Profile = { url: string; columns: number; rows: number; width: number; height: number; referenceHeight: number; sources: readonly string[]; id: 'cleric' | 'wizard' | 'rogue' };
export type SkillSpriteContext = { skillId: string; phase: SkillPhase; progress: number; success?: boolean;variant?:string };

const profiles: readonly Profile[] = [
  { id: 'cleric', url: new URL('./art/skill-cleric-v2.webp', import.meta.url).href, columns: 4, rows: 6, width: 1024, height: 1536, referenceHeight: 234,
    sources: ['/art/tokens/cleric.png',new URL('../../../campaigns/stormwreck-isle/public/art/tokens/cleric.png',import.meta.url).href] },
  { id: 'wizard', url: new URL('./art/skill-wizard-v2.webp', import.meta.url).href, columns: 4, rows: 6, width: 1024, height: 1536, referenceHeight: 231,
    sources: ['/art/tokens/wizard.png',new URL('../../../campaigns/stormwreck-isle/public/art/tokens/wizard.png',import.meta.url).href] },
  { id: 'rogue', url: new URL('./art/skill-rogue-v2.webp', import.meta.url).href, columns: 4, rows: 6, width: 1024, height: 1536, referenceHeight: 246,
    sources: ['/art/m3/trinity/maria_base.png', '/art/tokens/Maria Trinity D8/maria_base.png',new URL('../../../campaigns/stormwreck-isle/public/art/m3/trinity/maria_base.png',import.meta.url).href] }
];

const roleRows: Record<ActorAnimation, { row: number; fps: number; order?: readonly number[] }> = {
  run_loop: { row: 0, fps: 9 }, walk_loop: { row: 0, fps: 5 },
  idle_read: { row: 1, fps: 3.2 }, idle_inspect: { row: 1, fps: 3.6 },
  idle_talk: { row: 2, fps: 4 }, idle_listen: { row: 2, fps: 2.6, order: [3, 0, 3, 1] },
  idle_listen_away: { row: 2, fps: 2.6, order: [3, 0, 3, 1] },
  idle_breath: { row: 1, fps: 2.5 }, idle_prepare: { row: 3, fps: 4, order: [0, 0, 1, 0] },
  jump: { row: 3, fps: 6 }, slip: { row: 3, fps: 5, order: [1, 2, 3, 3] },
  hang: { row: 3, fps: 3, order: [2, 2, 2, 2] }, climb: { row: 3, fps: 6, order: [2, 1, 0, 3] },
  sneak_loop: { row: 4, fps: 5.5 }, idle_crouch: { row: 5, fps: 3.4 },
  hand_interact: { row: 1, fps: 5 }, reach: { row: 2, fps: 5, order: [0, 1, 2, 1] },
  point: { row: 2, fps: 3.5, order: [0, 1, 1, 2] }, idle_reach: { row: 2, fps: 3, order: [0, 1, 2, 0] },
  idle_play: { row: 1, fps: 6 }, idle_balance: { row: 2, fps: 3.3, order: [0, 1, 2, 3] },
  idle_brace: { row: 2, fps: 3, order: [0, 2, 3, 0] }
};

const supplements = {
  cleric: { objects: new URL('./art/skill-cleric-objects-v3.webp', import.meta.url).href, motion: new URL('./art/skill-cleric-motion-v3.webp', import.meta.url).href },
  wizard: { objects: new URL('./art/skill-wizard-objects-v3.webp', import.meta.url).href, motion: new URL('./art/skill-wizard-motion-v3.webp', import.meta.url).href },
  rogue: { objects: new URL('./art/skill-rogue-objects-v3.webp', import.meta.url).href, motion: new URL('./art/skill-rogue-motion-v3.webp', import.meta.url).href }
};
const equipmentRows: Readonly<Record<string, number>> = { history: 0, performance: 1, medicine: 2, 'sleight-of-hand': 3, deception: 4, religion: 5 };
const clipCache = new Map<string, { frames: SpriteFrame[]; fps: number; loop: boolean }>();
const handshakeUrl=new URL('./art/skill-handshake-v3.webp',import.meta.url).href;
const medicinePairUrl=new URL('./art/skill-medicine-pair-v3.webp',import.meta.url).href;
const animalReachUrl=new URL('./art/skill-animal-reach-v3.webp',import.meta.url).href;
const extendedUrls:Record<string,string>={
  'cleric-reactions':new URL('./art/skill-cleric-reactions-v5.webp',import.meta.url).href,
  'wizard-reactions':new URL('./art/skill-wizard-reactions-v5.webp',import.meta.url).href,
  'rogue-reactions':new URL('./art/skill-rogue-reactions-v5.webp',import.meta.url).href,
  pickpocket:new URL('./art/skill-pickpocket-v5.webp',import.meta.url).href,
  treatment:new URL('./art/skill-treatment-v5.webp',import.meta.url).href,
  'scroll-walk':new URL('./art/skill-scroll-walk-v5.webp',import.meta.url).href
};
type ExtendedAtlas={columns:number;cellWidth:number;referenceHeight:number;heroHeights?:number[];rowHeights:number[];frames:{bounds:number[];pivot:number;alphaSeeds:[number,number][]}[]};
const extensions=extendedMetadata as unknown as Record<string,ExtendedAtlas>;
function extendedClip(id:string,row:number,order:readonly number[],fps=4) {
  const meta=extensions[id];if(!meta)return undefined;
  const key=`v5:${id}:${row}:${order.join(',')}:${fps}`;
  let clip=clipCache.get(key);
  if(!clip){const frames=order.map(column=>{
    const cell=meta.frames[row*meta.columns+column]!;
    const[x,y,width,height]=cell.bounds as [number,number,number,number];
    return {url:extendedUrls[id]!,x,y,width,height,anchorX:(cell.pivot*meta.cellWidth-(x-column*meta.cellWidth))/width,anchorY:1,alphaSeeds:cell.alphaSeeds};
  });clip={frames,fps,loop:true};clipCache.set(key,clip);}
  return {clip,mirror:false,authored:true,referenceHeight:meta.heroHeights?.[row]??meta.rowHeights[id.endsWith('-reactions')?0:row]!};
}

function extendedSequence(profile:Profile,role:ActorAnimation,context:SkillSpriteContext){
  const id=`${profile.id}-reactions`;
  const acting=context.phase==='SUCCESS'||context.phase==='FAILURE';
  const settled=context.phase==='REACTION'||context.phase==='OUTCOME_LOOP';
  const resolved=acting||settled;
  if(context.skillId==='deception'&&resolved&&context.progress>=(context.success ? .35 : .14))
    return extendedClip(id,2,[0,1,2,3,4,5,6,7],context.success?6.2:7.5);
  if(context.skillId==='stealth'){
    const moving=role==='sneak_loop';
    return extendedClip(id,3,moving?[0,1,2,3,4,5,6,7]:[context.success?7:0],moving?4.8:1);
  }
  if(context.skillId==='history'&&resolved){
    if(context.success&&context.progress<.3){
      const walk=extendedClip('scroll-walk',profiles.indexOf(profile),[1,2,3,4,5,6],5);if(walk)return walk;
    }
    const clip=extendedClip(id,context.success?0:1,settled?[context.success?7:7]:[0,1,2,3,4,5,6,7]);
    return clip?{...clip,poseProgress:settled?undefined:context.success?Math.max(0,(context.progress-.3)/.7):context.progress}:undefined;
  }
  if(context.skillId==='religion'&&resolved){
    const clip=extendedClip(id,4,context.success?settled?[3]:[0,1,2,3]:settled?[7]:[4,5,6,7]);
    return clip?{...clip,poseProgress:acting?context.progress:undefined}:undefined;
  }
  if(context.skillId==='nature'&&resolved&&!context.success&&context.progress>=.23){
    const clip=extendedClip(id,5,settled?[7]:[0,1,2,3,4,5,6,7]);
    return clip?{...clip,poseProgress:acting?Math.max(0,(context.progress-.23)/.77):undefined}:undefined;
  }
  return undefined;
}

function animalSequence(source:string,context:SkillSpriteContext) {
  const row=profiles.findIndex(p=>p.sources.includes(source));if(row<0)return undefined;
  const meta=atlasMetadata['animal-reach'];
  const settled=context.phase==='OUTCOME_LOOP'||context.phase==='REACTION';
  const acting=context.phase==='SUCCESS'||context.phase==='FAILURE';
  const order=settled?context.success?[2,3,4,3]:[5]:acting?context.success?[0,1,2,3,4,3]:[0,1,2,5,5,5]:[0,1,0,1];
  const key=`animal-reach:${row}:${settled}:${acting}:${context.success}`;
  let clip=clipCache.get(key);
  if(!clip) {
    const frames=order.map(col=>{
      const f=meta.frames[row*6+col]!;const[x,y,width,height]=f.bounds as [number,number,number,number];
      return {url:animalReachUrl,x,y,width,height,anchorX:(f.pivot*meta.cellWidth-(x-col*meta.cellWidth))/width,anchorY:1,alphaSeeds:f.alphaSeeds as [number,number][]};
    });clip={frames,fps:5,loop:true};clipCache.set(key,clip);
  }
  return {clip,mirror:false,authored:true,referenceHeight:meta.heroHeights[row]!,poseProgress:acting?context.progress:undefined};
}

export function skillActorPairedSequence(source:string,context:SkillSpriteContext) {
  const profile=profiles.findIndex(p=>p.sources.includes(source));
  if(profile>=0&&(context.skillId==='sleight-of-hand'||context.skillId==='medicine')){
    const treatment=context.skillId==='medicine';
    const settled=context.phase==='OUTCOME_LOOP'||context.phase==='REACTION';
    const acting=context.phase==='SUCCESS'||context.phase==='FAILURE';
    const row=treatment?profile*2+(context.success===false?1:0):profile;
    const order=treatment?settled?[7]:acting?[0,1,2,3,4,5,6,7]:[0]:
      settled?[context.success?4:7]:acting?context.success?[0,1,2,3,4]:[0,1,2,5,6,7]:[0];
    const clip=extendedClip(treatment?'treatment':'pickpocket',row,order,3.5);
    if(clip)return {...clip,paired:true,poseProgress:acting?context.progress:undefined};
  }
  const medicine=context.skillId==='medicine';
  if(!medicine&&(context.skillId!=='persuasion'||!context.success||
    !(['REACTION','OUTCOME_LOOP'].includes(context.phase)||context.phase==='SUCCESS'&&context.progress>=.22)))return undefined;
  const row=profiles.findIndex(p=>p.sources.includes(source));if(row<0)return undefined;
  const meta=medicine?atlasMetadata['medicine-pair']:atlasMetadata.handshake;
  const url=medicine?medicinePairUrl:handshakeUrl;
  const settled=context.phase==='OUTCOME_LOOP'||context.phase==='REACTION';
  const acting=context.phase==='SUCCESS'||context.phase==='FAILURE';
  const order=medicine?settled?[context.success?3:5]:acting?context.success?[0,1,2,3]:[0,1,4,5]:[0]:settled?[3,4,5,4]:[0,1,2,3,4,5];
  const key=`${medicine?'medicine':'handshake'}:${row}:${settled}:${acting}:${context.success}`;
  let clip=clipCache.get(key);
  if(!clip){
    const frames=order.map(col=>{
      const frame=meta.frames[row*6+col]!;const [x,y,width,height]=frame.bounds as [number,number,number,number];
      return {url,x,y,width,height,anchorX:(frame.pivot*meta.cellWidth-(x-col*meta.cellWidth))/width,anchorY:1,alphaSeeds:frame.alphaSeeds as [number,number][]};
    });
    clip={frames,fps:5,loop:true};clipCache.set(key,clip);
  }
  return {clip,mirror:false,authored:true,referenceHeight:meta.heroHeights[row]!,paired:true,
    poseProgress:settled||medicine&&!acting?undefined:medicine?context.progress:Math.min(1,Math.max(0,(context.progress-.22)/.78))};
}

export function skillActorEquipmentUrls(source: string) {
  const profile = profiles.find(profile => profile.sources.includes(source));
  return profile ? [...Object.values(supplements[profile.id]),extendedUrls[`${profile.id}-reactions`]!,extendedUrls.pickpocket!,extendedUrls.treatment!,extendedUrls['scroll-walk']!,handshakeUrl,medicinePairUrl,animalReachUrl] : [];
}

export function skillActorSequence(source: string, role: ActorAnimation, context?: SkillSpriteContext) {
  const profile = profiles.find(profile => profile.sources.includes(source));
  if (!profile) return undefined;
  const pair=context?skillActorPairedSequence(source,context):undefined;
  if(pair)return pair;
  const extended=context?extendedSequence(profile,role,context):undefined;
  if(extended)return extended;
  if(context?.skillId==='animal-handling'&&!['walk_loop','run_loop','sneak_loop'].includes(role))return animalSequence(source,context);
  const settled = context?.phase === 'OUTCOME_LOOP' || context?.phase === 'REACTION';
  const acting = context?.phase === 'SUCCESS' || context?.phase === 'FAILURE';
  const equipment = context ? equipmentRows[context.skillId] : undefined;
  let sheet: 'objects' | 'motion' = 'motion', row = 0, order: readonly number[] = [0,1,2,3,4,5,4,3,2,1], fps = 3.8;
  let useSupplement = Boolean(context), poseProgress: number | undefined;
  if (equipment !== undefined) {
    sheet = 'objects'; row = equipment;
    if (context!.skillId === 'medicine') order = acting ? [0,1,2,3,4,5] : settled ? context!.success ? [3,4,3,4] : [5,5,4,5] : [0,1,2,1];
    if (context!.skillId === 'sleight-of-hand') {
      order = acting ? context!.success ? [0,1,2,2,3,4] : [0,1,2,5,5,5] : settled ? context!.success ? [3,4,3,4] : [5] : [0,1,2,1];
    }
    if (context!.skillId === 'deception') order = settled ? context!.success ? [1,2,3,2] : [4,5,4,5] : acting ? [0,1,2,3,4,5] : [0,1,2,1];
    if (context!.skillId === 'religion') order = settled ? context!.success ? [0,1,0,1] : [4,5,4,5] : [0,1,2,3,2,1];
    if (context!.skillId === 'history') order = settled ? context!.success ? [3,4,3,4] : [2,5,2,5] : [1,2,3,2];
    if (context!.skillId === 'performance') { order = settled && !context!.success ? [4,5,4,5] : [0,1,2,3,4,5,4,3,2,1]; fps = 4.8; }
    if (acting && ['medicine','sleight-of-hand','deception'].includes(context!.skillId)) poseProgress = context!.progress;
  } else if (context?.skillId === 'acrobatics' && role === 'walk_loop') {
    row=1;order=[0,1,2,3,4,5];fps=8;
  } else if (['run_loop','walk_loop','sneak_loop'].includes(role)) useSupplement=false;
  else if (context?.skillId === 'nature') {
    row=4;order=acting ? context.success ? [0,1,2,2,1,2] : [0,1,2,3,4,5] : settled ? context.success ? [1,2,1,2] : [4,5,4,5] : [0,1,0,1];
    if(acting) poseProgress=Math.max(0,(context.progress-.25)/.75);
  } else if (context?.skillId === 'animal-handling') {
    row=5;order=settled ? context.success ? [2,3,2,3] : [4,5,4,5] : acting ? context.success ? [0,1,2,3,2,3] : [0,1,2,4,5,5] : [0,1,0,1];
    if(acting)poseProgress=context.progress;
  } else if (context?.skillId === 'persuasion' && (acting || settled) && context.success) {
    row=3;order=settled ? [2,3,4,3] : [0,1,2,3,4,3];if(acting)poseProgress=context.progress;
  } else if (role === 'jump' || role === 'slip' || role === 'hang') {
    row=2; order=role==='jump' ? [0,1,2,4] : role==='hang' ? [3] : [2,3,5];
    if(settled) order=role==='hang' ? [3] : [5];
  } else if(role==='idle_prepare') {row=0;order=[0];fps=1;}
  else if(role==='idle_crouch') {row=4;order=[0,1,0,1];}
  else if (context?.skillId === 'investigation' && (acting || settled)) { row=5;order=[0,1,2,3,2,1]; }
  else {row=0;order=role==='point' ? [2,3,2,3] : role==='idle_brace' ? [3,4,3,4] : role==='idle_listen' ? [0,1,0,1] : [0,1,2,3,4,5,4,3,2,1];}
  if (useSupplement) {
    const key = `${profile.id}-${sheet}` as keyof typeof atlasMetadata;
    const meta = atlasMetadata[key];
    const url = supplements[profile.id][sheet];
    const cacheKey=`${key}:${row}:${order.join(',')}:${fps}`;
    let clip=clipCache.get(cacheKey);
    if(!clip) {
      const frames=order.map(column=>{
        const cell=meta.frames[row*6+column]!;
        const [x,y,width,height]=cell.bounds as [number,number,number,number];
        return {url,x,y,width,height,anchorX:(cell.pivot*meta.cellWidth-(x-column*meta.cellWidth))/width,anchorY:1,alphaSeeds:cell.alphaSeeds as [number,number][]};
      });
      clip={frames,fps,loop:true};clipCache.set(cacheKey,clip);
    }
    return {clip,mirror:role==='idle_listen_away',authored:true,referenceHeight:meta.referenceHeight,poseProgress};
  }
  const baseRole = roleRows[role];
  const width = profile.width / profile.columns, height = profile.height / profile.rows;
  const baseKey=`base:${profile.id}:${role}`;
  let baseClip=clipCache.get(baseKey);
  if(!baseClip) {
    const frames: SpriteFrame[] = (baseRole.order ?? [0,1,2,3]).map(column => ({ url: profile.url, x: column * width, y: baseRole.row * height,
      width, height, anchorX: .5, anchorY: .9 }));
    baseClip={frames,fps:baseRole.fps,loop:role!=='jump'};clipCache.set(baseKey,baseClip);
  }
  return { clip: baseClip, mirror: role === 'idle_listen_away', authored: true,
    referenceHeight: profile.referenceHeight };
}
