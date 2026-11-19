/** Deterministic port of existing data/art. Does not touch a campaign save. */
import {mkdir,writeFile,copyFile,readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {oneShotBundle} from '../campaigns/one-shot/server';
import {stormwreckBundle} from '../campaigns/stormwreck-isle/server';
import {oneShotCampaignDefinition} from '../campaigns/one-shot/public/pack';
import {ACTION_ICON_CATALOGUE,actionIcon} from '../engine/client/action-icons';
const root=path.resolve(import.meta.dirname,'..');
const output=path.join(root,'prototypes/godot-shared/combat');
await mkdir(output,{recursive:true});
const profiles:Record<string,unknown>={};
for(const bundle of [stormwreckBundle,oneShotBundle]){
  for(const [id,p] of Object.entries(bundle.characters))if(p.combat)profiles[id]={...p.combat,maxHp:p.maxHp,resources:p.combatResources??{},explorationActions:p.explorationActions??[],sheet:p.sheet,inventory:p.inventory};
  for(const [id,p] of Object.entries(bundle.combatProfiles??{}))profiles[id]=p;
  for(const p of bundle.privateActors??[])profiles[p.id]=p.profile;
  const c=bundle.encounter?.creature;if(c?.sheet?.combat)profiles[c.id]={...c.sheet.combat,maxHp:c.sheet.maxHp};
}
const frames:Record<string,unknown>={},icons:Record<string,string>={},files=new Map<string,string>();
for(const icon of ACTION_ICON_CATALOGUE){const graphic=actionIcon(icon.id,'');icons[icon.id]=`res://combat/icons/${icon.id}.svg`;await mkdir(path.join(output,'icons'),{recursive:true});await writeFile(path.join(output,'icons',icon.id+'.svg'),graphic.svg.replaceAll('currentColor',graphic.color));}
// Original native additions extend the existing vector family; no stock art.
for(const id of ['sacred-flame','bless','shield-of-faith','zombie-slam','thrown-handaxe'])icons[id]=`res://combat/icons/${id}.svg`;
for(const tokenId of ['silverfarben-hotel','rogue','anteros']){
  const states=oneShotCampaignDefinition.tokenAnimations[tokenId]??{};const tokenFrames:Record<string,unknown>={};
  for(const [state,clip] of Object.entries(states))if(clip){
    tokenFrames[state]={...clip,frames:clip.frames.map(frame=>{
      const f=typeof frame==='string'?{url:frame}:frame;
      const relative=decodeURIComponent(f.url.replace(/^\/art\//,''));
      if(relative.includes('..')||path.isAbsolute(relative))throw Error('Invalid art reference');
      const local='art/'+relative.replaceAll('\\','/');files.set(local,path.join(root,'campaigns/one-shot/public/art',relative));
      return {...f,url:'res://combat/'+local};
    })};
  }
  frames[tokenId]=tokenFrames;
}
const renamed=new Map<string,string>();
for(const [relative,source] of files){
  const header=await readFile(source);
  const actual=header[0]===0xff&&header[1]===0xd8?relative.replace(/\.png$/i,'.jpg'):relative;
  if(actual!==relative)renamed.set('res://combat/'+relative,'res://combat/'+actual);
  const dest=path.join(output,actual);await mkdir(path.dirname(dest),{recursive:true});await copyFile(source,dest);
}
let payload=JSON.stringify({version:1,source:'existing TypeScript campaign profiles and original VTT artwork',profiles,icons,frames},null,2);
for(const [before,after] of renamed)payload=payload.replaceAll(before,after);
await writeFile(path.join(output,'catalogue.json'),payload);
for(const [name,file] of [['weapon','d8-night-sfx-attack-weapon-swing.ogg'],['spell','d8-night-sfx-spell-arcane-cast.ogg']]){
  const source=path.join(root,'campaigns/one-shot/public/audio/d8-night/sfx',file);
  try{await mkdir(path.join(output,'audio'),{recursive:true});await copyFile(source,path.join(output,'audio',name+'.ogg'));}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
}
const provenance=[];
for(const [relative,source] of files){const bytes=await readFile(source);provenance.push({id:relative,source:path.relative(root,source).replaceAll('\\','/'),sha256:createHash('sha256').update(bytes).digest('hex'),operation:'byte-exact copy; JPEG extension corrected when required'});}
for(const name of await readdir(path.join(output,'baked')).catch(()=>[])){const bytes=await readFile(path.join(output,'baked',name));provenance.push({id:'baked/'+name,source:'catalogue.json frame crops, keyed by combat_catalogue.frame_key',sha256:createHash('sha256').update(bytes).digest('hex'),operation:'lossless crop/alpha isolation; no scaling; bake_combat_sprites.gd'});}
await writeFile(path.join(output,'asset-provenance.json'),JSON.stringify({version:1,originalsPreserved:true,reference:'REF-01 (turn reading), original project icon family; no commercial assets',newVectors:['sacred-flame','bless','shield-of-faith','zombie-slam','thrown-handaxe'],audioCredits:'campaigns/one-shot/public/D8_NIGHT_ASSET_CREDITS.md',assets:provenance},null,2));
for(const project of ['godot-pecio','godot-retiro']){
  const dest=path.join(root,'prototypes',project,'combat');await mkdir(dest,{recursive:true});
  const {cp}=await import('node:fs/promises');await cp(output,dest,{recursive:true});
}
console.log(JSON.stringify({profiles:Object.keys(profiles).length,icons:Object.keys(icons).length,images:files.size,projects:2}));
