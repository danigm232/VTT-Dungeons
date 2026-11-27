/** Candidate builder: original atlas pages are retained; only hero selections change. */
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {resolve,basename} from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import motionData from '../engine/client/character-motion-frames.json';
const sharp=createRequire(import.meta.url)(process.env.DUNGEONS_SHARP_MODULE??'sharp');
const root=resolve(import.meta.dirname,'..'),out=resolve(root,'output/loading-identity-v6'),target=resolve(out,'candidate');
await mkdir(resolve(target,'art'),{recursive:true});
const baseline=resolve(out,'base-catalog.json');
if(!existsSync(baseline))await copyFile(resolve(root,'prototypes/godot-campamentos/loading/catalog.json'),baseline);
const data=JSON.parse(await readFile(baseline,'utf8'));
for(let i=0;i<data.atlasCount;i++)await copyFile(resolve(root,`prototypes/godot-campamentos/loading/art/atlas-${i}.webp`),resolve(target,`art/atlas-${i}.webp`));
for(const name of ['floor','chasm'])await copyFile(resolve(root,`prototypes/godot-campamentos/loading/art/${name}.webp`),resolve(target,`art/${name}.webp`));
const jobs=JSON.parse(await readFile(resolve(out,'production-jobs.json'),'utf8'));
const registry=JSON.parse(await readFile(resolve(root,'prototypes/godot-shared/characters/scopes/loading-identities-v6.candidate.json'),'utf8'));
// Mike's legacy family is rejected. Other heroes retain their working clips;
// only their confirmed merchant-continuity defect is replaced.
const selectedActors=process.argv.includes('--pilot')?['mike']:['mike','mia','maria'];
const decoded=new Map<string,any>(),tiles:any[]=[],records:any[]=[],clips:any={};
const digest=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
async function decode(path:string){if(!decoded.has(path)){const bytes=await readFile(resolve(root,path));decoded.set(path,await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true}));records.push({file:path,sha256:digest(bytes)});}return decoded.get(path);}
async function frame(path:string,box:any,pivot:[number,number],logicalRef:number,referenceCanvasHeight?:number){
 const raw=await decode(path);const b=box??{x:0,y:0,width:raw.info.width,height:raw.info.height};
 const pixels=await sharp(raw.data,{raw:raw.info}).extract({left:b.x,top:b.y,width:b.width,height:b.height}).raw().toBuffer();
 let left=b.width,right=0,top=b.height,bottom=0;
 for(let y=0;y<b.height;y++)for(let x=0;x<b.width;x++)if(pixels[(y*b.width+x)*4+3]>=32){left=Math.min(left,x);right=Math.max(right,x+1);top=Math.min(top,y);bottom=Math.max(bottom,y+1);}
 if(bottom<=top)throw Error('Empty native frame '+path);
 // Use solid soles, not near-transparent residue or moving hands, as the support.
 let floor=Math.min(bottom,Math.round(pivot[1]*b.height));
 if(floor>=bottom-8)for(let y=bottom-1;y>=top;y--){let solid=0;for(let x=left;x<right;x++)if(pixels[(y*b.width+x)*4+3]>=160)solid++;if(solid>=3){floor=y+1;break;}}
 const width=right-left,height=bottom-top,factor=Math.min(1,320/height);
 const input=await sharp(pixels,{raw:{width:b.width,height:b.height,channels:4}}).extract({left,top,width,height}).resize(Math.round(width*factor),Math.round(height*factor)).png().toBuffer();
 const id=data.frames.length;
 data.frames.push({width,height,pivot:b.width*pivot[0]-left,floor:floor-top,source:{file:path,x:b.x,y:b.y,width:b.width,height:b.height,anchorX:pivot[0],anchorY:pivot[1]}});
 tiles.push({id,input,tw:Math.round(width*factor),th:Math.round(height*factor)});
 return id;
}
function clip(frames:number[],referenceHeight:number,fps=4,loop=true,paired=false){const id=data.selections.length;data.selections.push({frames,referenceHeight,fps,loop,mirror:false,paired,identityVersion:6});return id;}
async function authored(id:string){
 const path=`prototypes/godot-shared/characters/definitions/animations/${id}.json`,d=registry.animations[id];
 if(!d)throw Error('Resource is not registered in the validated central scope: '+id);
 if(d.frames?.length!==8||!d.production?.importReport)throw Error('BLOCKED: sheet has not passed extraction: '+id);
 const report=JSON.parse(await readFile(resolve(root,d.production.importReport),'utf8'));
 if(report.errors.length)throw Error('BLOCKED: '+id+': '+report.errors.join('; '));
 const ids=[];for(const f of d.frames)ids.push(await frame(typeof f==='string'?f:f.file,null,(typeof f==='object'?f.pivot:null)??d.pivot,d.referenceHeight));
 return {ids,ref:d.referenceHeight,definition:path,paired:!!d.production.paired};
}
const helpers:any={};
for(const actor of selectedActors){
 const fullIdentity=actor==='mike';
 const a=data.actors[actor],profile={mike:'wizard',mia:'cleric',maria:'rogue'}[actor]!;
 let base=-1;const reused:any={};
 if(fullIdentity){
 const idle=JSON.parse(await readFile(resolve(root,`prototypes/godot-shared/characters/definitions/animations/sw-${actor}-idle8.json`),'utf8'));
 const idleFrames=[];for(const f of idle.frames)idleFrames.push(await frame(typeof f==='string'?f:f.file,null,(typeof f==='object'?f.pivot:null)??idle.pivot,idle.referenceHeight));
 base=clip(idleFrames,idle.referenceHeight,2.5);reused.idle=base;
 }
 async function old(name:string,row:number,fps:number,loop=true){const atlas=(motionData.atlases as any)[name];if(!atlas)throw Error('Missing reusable motion '+name);const ids=[];for(const b of atlas.frames.slice(row*8,row*8+8))ids.push(await frame(`prototypes/godot-shared/sprites/${atlas.file}`,b,[.5,(b.height-6)/b.height],atlas.reference_height));return clip(ids,atlas.reference_height,fps,loop);}
 if(fullIdentity){
 reused.walk=await old(profile+'-walk',3,5).catch(()=>old(profile+'-run',3,5));
 reused.run=await old(profile+'-run',3,8);
 reused.sneak=await old(profile+'-actions',1,4.5);
 reused.jump=await old(profile+'-actions',5,6,false);
 reused.interact=await old(profile+'-actions',7,4,false);
 }
 const library:any={};
 for(const job of jobs.filter((j:any)=>j.actor===actor&&(fullIdentity||j.action==='handshake')))library[job.action]=await authored(job.id);
 const cache=new Map<string,number>();
 function part(action:string,indices:number[],fps=4,loop=false){const key=JSON.stringify([action,indices,fps,loop]);if(!cache.has(key)){const r=library[action];const index=clip(indices.map(i=>r.ids[i]),r.ref,fps,loop,r.paired);data.selections[index].sourceDefinition=r.definition;cache.set(key,index);}return cache.get(key)!;}
 function choose(c:number,role:string,pose?:number){return pose===undefined?{clip:c,role}:{clip:c,role,pose};}
 function item(scene:string,phase:string,p:number,success:boolean,role:string){
  const ambient=['ambient','prepare'].includes(phase),settled=phase.startsWith('settled');
  if(scene==='history'){
   if(ambient)return choose(part('scroll',[phase==='prepare'?1:0]),role);
   if(success&&p<.3&&!settled)return choose(part('scroll-walk',[0,1,2,3,4,5,6,7],5,true),role);
   const index=success?(settled?4:p<.65?3:4):(settled?7:p<.45?5:p<.8?6:7);
   return choose(part('scroll',[index]),role);
  }
  if(scene==='performance')return choose(part('performance',ambient||success?[0,1,2,3,4,5]:[p<.6?6:7],4.8,ambient||success),role);
  if(scene==='deception')return choose(part('deception',ambient||!settled&&p<(success?.35:.14)?[0,1]:[2,3,4,5,6,7],ambient?2.5:7,true),role);
  if(scene==='religion'){const index=ambient?0:success?(settled?4:p<.4?2:p<.8?3:4):(settled?7:p<.45?5:p<.8?6:7);return choose(part('religion',[index]),role);}
  if(scene==='medicine'){const index=ambient?(phase==='prepare'?1:0):success?(settled?4:p<.25?1:p<.55?2:p<.8?3:4):(settled?7:p<.3?1:p<.6?5:p<.85?6:7);return choose(part('medicine',[index]),role);}
  if(scene==='sleight-of-hand'){const index=ambient?0:success?(settled?3:Math.min(3,Math.floor(p*4))):(settled?7:p<.25?1:p<.5?4:p<.7?5:p<.9?6:7);return choose(part('pickpocket',[index]),role);}
  if(scene==='persuasion'){const index=ambient?(phase==='prepare'?1:0):success?(settled?7:p<.22?1:p<.45?4:p<.7?5:p<.9?6:7):(settled?3:p<.55?2:3);return choose(part('handshake',[index]),role);}
  if(scene==='nature'){
   const index=ambient?0:success?(settled?2:p<.45?1:2):(settled?7:p<.23?1:p<.4?3:p<.55?4:p<.72?5:p<.88?6:7);
   return choose(part('nature',[index]),role);
  }
  return null;
 }
 for(const scene of data.scenes){const config=a.scenes[scene.id];
  if(!fullIdentity&&scene.id!=='persuasion')continue;
  function generic(oldChoice:any,phase:string,p:number,success:boolean){const role=oldChoice.role;const special=item(scene.id,phase,p,success,role);if(special)return special;
   if(role==='run_loop')return choose(reused.run,role);
   if(role==='walk_loop')return choose(reused.walk,role);
   if(role==='sneak_loop')return choose(reused.sneak,role);
   if(['jump','slip','hang','climb'].includes(role))return choose(reused.jump,role,oldChoice.pose??p);
   if(role==='idle_crouch')return choose(reused.sneak,role,0);
   if(['point','reach','hand_interact','idle_reach'].includes(role))return choose(reused.interact,role,oldChoice.pose??(success?.45:.15));
   return choose(reused.idle,role);
  }
  for(const phase of ['ambient','prepare','settledSuccess','settledFailure'])config[phase]=generic(config[phase],phase,phase.startsWith('settled')?1:0,phase==='settledSuccess');
  for(const phase of ['success','failure'])config[phase]=config[phase].map((c:any,i:number)=>generic(c,phase,i/128,phase==='success'));
 }
 if(fullIdentity)a.guest={idle:choose(base,'idle_breath'),walk:choose(reused.walk,'walk_loop'),run:choose(reused.run,'run_loop')};
 a.identityVersion=6;a.identityScope=fullIdentity?'all':['persuasion'];helpers[actor]={reused,definitions:jobs.filter((j:any)=>j.actor===actor&&(fullIdentity||j.action==='handshake')).map((j:any)=>j.definition)};
}
let page=data.atlasCount,x=2,y=2,rowHeight=0,composites:any[]=[];
async function flush(){if(!composites.length)return;await sharp({create:{width:2048,height:2048,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(composites).webp({lossless:true}).toFile(resolve(target,`art/atlas-${page}.webp`));page++;x=2;y=2;rowHeight=0;composites=[];}
for(const tile of tiles){if(x+tile.tw+2>2048){x=2;y+=rowHeight+3;rowHeight=0;}if(y+tile.th+2>2048)await flush();data.frames[tile.id].atlas=page;data.frames[tile.id].region=[x,y,tile.tw,tile.th];composites.push({input:tile.input,left:x,top:y});x+=tile.tw+3;rowHeight=Math.max(rowHeight,tile.th);}await flush();
data.atlasCount=page;data.identityVersion=6;data.identityCoverage=selectedActors;
data.identityRegistry={scope:registry.scope.name,revision:registry.revision};
data.scenes.find((s:any)=>s.id==='medicine').successAnimation.caption='Termina el vendaje; el compañero comprueba el brazo y le da las gracias.';
await writeFile(resolve(target,'catalog.json'),JSON.stringify(data));
await writeFile(resolve(out,'candidate-resources.json'),JSON.stringify({actors:helpers,records,framesAdded:tiles.length,atlasCount:page,sourceCatalog:baseline,stage:'inspection-only; not installed'},null,2));
console.log(`Identity candidate: ${selectedActors.join(', ')}; ${tiles.length} frames added, ${page} atlas pages; no live project overwritten.`);
