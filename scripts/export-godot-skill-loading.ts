/** Native Godot data/atlas export. Reuses the actual web clip resolver and alpha isolation. */
import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import {resolve,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {skillMicroScenes} from '../apps/web/ui/skill-scenes';
import {skillActorSequence} from '../apps/web/ui/skill-actor-sequences';
import {isolateAtlasRGBA} from '../engine/client/atlas-isolation';
import {clearBlackSpriteMatte} from '../engine/client/sprite-matte';
import v3 from '../apps/web/ui/art/skill-animation-v3.json';
import v5 from '../apps/web/ui/art/skill-animation-v5.json';
import {publicCampaignDefinition as campaign} from '../campaigns/stormwreck-isle/public/pack';
const sharp=createRequire(import.meta.url)(process.env.DUNGEONS_SHARP_MODULE??'sharp');
const root=resolve(import.meta.dirname,'..'), target=resolve(root,'prototypes/godot-pecio/loading');
await mkdir(resolve(target,'art'),{recursive:true});
const frames:any[]=[],selections:any[]=[],frameKeys=new Map<string,number>(),selectionKeys=new Map<string,number>();
const register=(f:any)=>{const key=JSON.stringify(f);if(!frameKeys.has(key)){frameKeys.set(key,frames.length);frames.push({...f});}return frameKeys.get(key)!;};
function selection(source:string,role:any,skill:string,phase:any,success=false,progress=0){
 const s=skillActorSequence(source,role,{skillId:skill,phase,success,progress})!;
 if(!s)throw Error(`Missing sequence ${source}/${skill}/${role}`);
 const clip={frames:s.clip.frames.map(register),fps:s.clip.fps,loop:s.clip.loop,mirror:s.mirror,referenceHeight:s.referenceHeight,paired:'paired'in s&&s.paired};
 const key=JSON.stringify(clip);if(!selectionKeys.has(key)){selectionKeys.set(key,selections.length);selections.push(clip);}
 return {clip:selectionKeys.get(key),pose:'poseProgress'in s?s.poseProgress:undefined,role};
}
const actors:any={};
for(const {id,label,tokenId} of campaign.roster){
 const {url,worldHeightMeters:height=1.65}=campaign.tokens[tokenId]!;
 const scenes:any={};
 for(const scene of skillMicroScenes){
  const entry:any={ambient:selection(url,scene.ambientAnimation,scene.id,'AMBIENT_LOOP'),prepare:selection(url,scene.preparationAnimation,scene.id,'ACTION_PREPARE')};
  for(const success of [true,false]){
   const action=success?scene.successAnimation:scene.failureAnimation;
   entry[success?'success':'failure']=Array.from({length:129},(_,n)=>{const p=n/128;let role=action.animation;let start=0,end=1;for(const [at,r]of action.beats??[]){if(at>p){end=at;break;}role=r;start=at;}
    const s=selection(url,role,scene.id,success?'SUCCESS':'FAILURE',success,p);
    if(s.pose===undefined&&['jump','slip'].includes(role))s.pose=Math.min(1,(p-start)/Math.max(.01,end-start));return s;
   });
   entry[success?'settledSuccess':'settledFailure']=selection(url,action.settledAnimation??'idle_breath',scene.id,'OUTCOME_LOOP',success,1);
  }scenes[scene.id]=entry;
 }
 actors[id]={label,height:108*height/1.65,scenes,guest:{idle:selection(url,'idle_breath','perception-visitor','AMBIENT_LOOP'),walk:selection(url,'walk_loop','perception-visitor','SUCCESS'),run:selection(url,'run_loop','perception-visitor','FAILURE')}};
}
const groups:any={};
for(const [id,meta] of Object.entries({...v3,...v5})as any){
 if(!['environment','people','horse','npcs','creatures','tracks'].includes(id))continue;
 const version=id in v5?'v5':'v3';
 groups[id]={referenceHeight:meta.referenceHeight,rowHeights:meta.rowHeights,frames:meta.frames.map((f:any,i:number)=>{const[x,y,width,height]=f.bounds;return register({url:resolve(root,`apps/web/ui/art/skill-${id}-${version}.webp`),x,y,width,height,anchorX:(f.pivot*meta.cellWidth-(x-i%meta.columns*meta.cellWidth))/width,anchorY:1,alphaSeeds:f.alphaSeeds});})};
}
const bounds=[[76,17,234,343],[403,94,300,238],[754,126,311,175],[1115,46,306,302],[35,429,313,233],[405,486,298,119],[854,407,95,254],[1144,487,240,124],[32,779,316,248],[446,756,215,269],[743,747,325,285],[1159,789,207,213]];
groups.objects={frames:bounds.map(([x,y,width,height])=>register({url:resolve(root,'apps/web/ui/art/skill-props-v2.webp'),x,y,width,height,anchorX:.5,anchorY:1}))};
// Audit mode maps installed native IDs back to originals without repacking art.
if(process.argv.includes('--audit-only')){
 const installed=JSON.parse(await readFile(resolve(target,'catalog.json'),'utf8'));
 if(JSON.stringify(installed.selections.slice(0,selections.length))!==JSON.stringify(selections)||installed.frames.length<frames.length)throw Error('Installed legacy clip IDs differ; refusing to attribute stale resources');
 const auditDir=resolve(root,installed.identityVersion>=6?'output/loading-identity-v6/audit':'output/loading-sprite-audit-20261124');await mkdir(auditDir,{recursive:true});
 const appended=installed.frames.slice(frames.length).map((f:any,index:number)=>{if(!f.source)throw Error('Unattributed appended frame '+(frames.length+index));return{id:frames.length+index,...f.source,url:resolve(root,f.source.file)};});
 await writeFile(resolve(auditDir,'frame-sources.json'),JSON.stringify({frames:[...frames.map((frame,id)=>({id,...frame})),...appended],actors:installed.actors,selections:installed.selections},null,2));
 console.log(`Audited ${frames.length} legacy and ${appended.length} registered native frames; no atlas rewritten.`);
 process.exit(0);
}
const sources=new Map<string,any>(),provenance:any[]=[];
const tiles:any[]=[],nativeFrames:any[]=[];
for(const f of frames){
 const path=f.url.startsWith('file:')?fileURLToPath(f.url):f.url;
 if(!sources.has(path)){const bytes=await readFile(path);sources.set(path,await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true}));provenance.push({source:path,sha256:createHash('sha256').update(bytes).digest('hex')});}
 const source=sources.get(path),w=f.width,h=f.height;
 const data=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)data.set(source.data.subarray(((f.y+y)*source.info.width+f.x)*4,((f.y+y)*source.info.width+f.x+w)*4),y*w*4);
 if(f.alphaSeeds)data.set(isolateAtlasRGBA(data,w,h,f.alphaSeeds));else clearBlackSpriteMatte(data,w,h);
 let left=w,right=0,top=h,bottom=0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(data[(y*w+x)*4+3]>=48){left=Math.min(left,x);right=Math.max(right,x+1);top=Math.min(top,y);bottom=Math.max(bottom,y+1);}
 if(bottom<=top)throw Error('Empty frame '+JSON.stringify(f));
 let floor=bottom;for(let y=bottom-1;y>=top;y--){let count=0;for(let x=left;x<right;x++)if(data[(y*w+x)*4+3]>=160)count++;if(count>=2){floor=y+1;break;}}
 const width=right-left,height=bottom-top,scale=Math.min(1,256/height),tw=Math.max(1,Math.round(width*scale)),th=Math.max(1,Math.round(height*scale));
 const tile=await sharp(Buffer.from(data),{raw:{width:w,height:h,channels:4}}).extract({left,top,width,height}).resize(tw,th).png().toBuffer();
 tiles.push({input:tile,tw,th});nativeFrames.push({width,height,pivot:w*f.anchorX-left,floor:floor-top});
}
let page=0,x=2,y=2,rowHeight=0;let composites:any[]=[];
async function flush(){if(!composites.length)return;await sharp({create:{width:2048,height:2048,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(composites).webp({quality:94,alphaQuality:100}).toFile(resolve(target,`art/atlas-${page}.webp`));page++;composites=[];x=2;y=2;rowHeight=0;}
for(let i=0;i<tiles.length;i++){const tile=tiles[i];if(x+tile.tw+2>2048){x=2;y+=rowHeight+3;rowHeight=0;}if(y+tile.th+2>2048)await flush();nativeFrames[i].atlas=page;nativeFrames[i].region=[x,y,tile.tw,tile.th];composites.push({input:tile.input,left:x,top:y});x+=tile.tw+3;rowHeight=Math.max(rowHeight,tile.th);}await flush();
for(const name of ['floor','chasm'])await copyFile(resolve(root,`apps/web/ui/art/skill-${name}.webp`),resolve(target,`art/${name}.webp`));
await writeFile(resolve(target,'catalog.json'),JSON.stringify({version:1,scenes:[...skillMicroScenes].sort((a,b)=>a.name.localeCompare(b.name,'es')),actors,selections,frames:nativeFrames,groups,atlasCount:page}));
await writeFile(resolve(target,'SOURCE_MANIFEST.json'),JSON.stringify({exporter:'scripts/export-godot-skill-loading.ts',generatedAt:new Date().toISOString(),sources:provenance,notes:'Existing VTT art; alpha isolation, crop and atlas packing only. Original prompts and credits retained in docs/design/SKILL_ANIMATION_V5_PROMPTS_20261107.json.'},null,2));
console.log(`Exported ${skillMicroScenes.length} scenes, ${Object.keys(actors).length} characters, ${frames.length} frames into ${page} native atlases.`);
await import('./export-godot-skill-die.mjs');
