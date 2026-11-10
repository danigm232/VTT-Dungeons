import type {SkillMicroScene} from '../../../engine/client/skill-micro-scene';
import type {SkillActor} from './skill-scene-sprite';
import {silverfarbenFramesV3} from '../../../campaigns/one-shot/public/silverfarben-frames-v3';

export const skillPerceptionVariants=[
  {id:'owl',label:'Lechuza'}, {id:'goblin',label:'Trasgo'}, {id:'mouse',label:'Ratón'}, {id:'kobold',label:'Kobold'},
  {id:'trinity',label:'Trinity'}, {id:'mia',label:'Mía'}, {id:'silverfarben',label:'Silverfarben'}, {id:'mike',label:'Mike'}
] as const;

export const skillGuestSources={
  mia:new URL('../../../campaigns/stormwreck-isle/public/art/tokens/cleric.png',import.meta.url).href,
  mike:new URL('../../../campaigns/stormwreck-isle/public/art/tokens/wizard.png',import.meta.url).href,
  trinity:new URL('../../../campaigns/stormwreck-isle/public/art/m3/trinity/maria_base.png',import.meta.url).href
};

/** Each entry chooses one visitor. It never changes while a roll is playing. */
export function withPerceptionVariant(scene:SkillMicroScene,requested?:string,random=Math.random):SkillMicroScene {
  if(scene.id!=='perception')return scene;
  const variant=skillPerceptionVariants.find(v=>v.id===requested)??skillPerceptionVariants[Math.min(7,Math.floor(random()*8))]!;
  const owl=variant.id==='owl';
  const guest=['trinity','mia','silverfarben','mike'].includes(variant.id);
  return {...scene,variant:variant.id,prompt:`Escucha y descubre quién se esconde tras el arbusto.`,
    successAnimation:{...scene.successAnimation,caption:`Oye el ruido y descubre a ${variant.label} detrás del arbusto.`},
    failureAnimation:{...scene.failureAnimation,caption:`Mira en la dirección equivocada mientras ${variant.label} escapa por detrás.`,settledAnimation:'idle_listen_away'},
    props:scene.props.map(prop=>prop.id!=='hidden-owl'?prop:{...prop,id:'hidden-visitor',art:guest?'perception-guest':variant.id,y:owl?178:202,
      success:[[0,{opacity:0}],[.26,{opacity:0}],[.3,{opacity:1}],[.62,{x:owl?22:83,y:owl?-40:0,cue:.5}],[1,{x:owl?22:83,y:owl?-40:0,cue:.5}]],
      failure:[[0,{opacity:0}],[.28,{opacity:0}],[.32,{opacity:1,facing:owl?-1:1}],[.6,{x:owl?85:115,y:owl?-67:0,cue:1,facing:owl?-1:1}],[.95,{x:365,y:owl?-125:0,cue:1,facing:owl?-1:1}],[1,{x:400,y:owl?-130:0,cue:1,opacity:0,facing:owl?-1:1}]]})};
}

export function perceptionGuest(id:string|undefined):SkillActor|undefined {
  if(id==='silverfarben'){
    const model=new URL('../../../campaigns/one-shot/public/art/silverfarben-v3/model.png',import.meta.url).href;
    const run=new URL('../../../campaigns/one-shot/public/art/silverfarben-v3/run-e6.png',import.meta.url).href;
    const frames=(key:'model'|'run-e6',url:string)=>silverfarbenFramesV3[key].frames.map(frame=>({...frame,url,alphaSeeds:frame.alphaSeeds.map(pair=>[...pair] as [number,number])}));
    const idle=frames('model',model)[2]!;
    return {asset:{url:model,logicalWidth:80,logicalHeight:96,anchorX:.5,anchorY:1,worldHeightMeters:1.37},animations:{
      'idle-standing-e':{frames:[idle],fps:1,loop:true},
      'moving-e':{frames:frames('run-e6',run),fps:5,loop:true},
      'running-e':{frames:frames('run-e6',run),fps:7,loop:true}}};
  }
  const key=id as keyof typeof skillGuestSources;
  const url=skillGuestSources[key];
  if(!url)return undefined;
  return {asset:{url,logicalWidth:80,logicalHeight:108,anchorX:.5,anchorY:1,worldHeightMeters:key==='mia'?1.3:key==='trinity'?1.05:1.8},animations:{}};
}
