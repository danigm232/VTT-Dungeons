import {readdir,readFile,writeFile,mkdir,copyFile,access,rename} from 'node:fs/promises';
import {resolve,relative,dirname,basename} from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {frameMinimum,capabilityError} from './lib/character-motion.mjs';
export const workspace=resolve(import.meta.dirname,'..');
export const source=resolve(workspace,'prototypes/godot-shared/characters');
const digest=text=>createHash('sha256').update(text).digest('hex');
async function exists(path){try{await access(path);return true;}catch{return false;}}
async function json(path){return JSON.parse(await readFile(path,'utf8'));}
async function list(dir){const files=[];for(const e of await readdir(dir,{withFileTypes:true}).catch(()=>[])){const p=resolve(dir,e.name);if(e.isDirectory())files.push(...await list(p));else if(e.name.endsWith('.json'))files.push(p);}return files.sort();}
export function safePath(path,base=workspace){const full=resolve(base,path);const rel=relative(base,full);if(rel==='..'||rel.startsWith('../')||rel.startsWith('..\\')||/^[A-Za-z]:/.test(rel))throw Error('Path escapes its declared root: '+path);return full;}
export async function definitions(base=source){return Promise.all((await list(resolve(base,'definitions'))).map(async path=>({path,definition:await json(path),sha256:digest(await readFile(path))})));}
function validRestSculpt(sculpt,volume) {
 const inRange=(n,min,max)=>Number.isFinite(n)&&n>=min&&n<=max;
 if(!sculpt||!volume||!Array.isArray(sculpt.nose)||sculpt.nose.length!==2)return false;
 const [noseX,noseY]=sculpt.nose;
 return inRange(sculpt.eyes,.07,.19)&&inRange(noseX,.30,.70)
  &&inRange(noseY,sculpt.eyes+.008,.27)&&inRange(sculpt.jaw,noseY+.018,.31)
  &&inRange(sculpt.faceHalfWidth,.055,.26)&&inRange(sculpt.recline,0,30)
  &&(sculpt.beardEnd===undefined||inRange(sculpt.beardEnd,sculpt.jaw+.04,.39));
}
export async function validate(records=undefined,base=source){
 const rules=await json(resolve(base,'pipeline-rules.json')),anatomies=new Map();
 for(const path of await list(resolve(base,'anatomies'))){const a=await json(path);anatomies.set(a.id,a);}
 const all=records??await definitions(base),errors=[],warnings=[],ids=new Map();
 const motionContractPath=resolve(base,'motion-contracts/stormwreck-isle.json');
 const motionContract=await exists(motionContractPath)?await json(motionContractPath):null;
 const error=(id,message)=>errors.push({id,message});
 for(const [id,a]of anatomies){
  for(const key of a.requiredAnchors??[])if(!a.anchors?.[key])error(id,'Missing anatomical anchor '+key);
  for(const [key,point]of Object.entries(a.anchors??{}))if(!Array.isArray(point)||point.length!==2||point.some(n=>typeof n!=='number'||!Number.isFinite(n)||n<-.25||n>1.25))error(id,'Invalid anatomical point '+key);
 }
 for(const r of all){const d=r.definition,id=d.id??relative(base,r.path??'definition');
  if(typeof d.id!=='string'||!new RegExp(rules.idPattern).test(d.id))error(id,'Unique id must match '+rules.idPattern);
  if(ids.has(id))error(id,'Duplicate id also defined in '+ids.get(id));ids.set(id,r.path??'provided definition');
  if(!rules.kinds.includes(d.kind)){error(id,'Unsupported resource category '+d.kind);continue;}
  for(const field of rules.requiredByKind[d.kind]??[])if(d[field]===undefined||d[field]===null)error(id,'Missing required field: '+field);
  if(d.anatomy&&!anatomies.has(d.anatomy))error(id,'Unknown anatomical profile '+d.anatomy);
  if(d.kind==='character'){
   const a=anatomies.get(d.anatomy);
   if(motionContract){const incompatibility=capabilityError(d,motionContract);if(incompatibility)error(id,incompatibility);}
   if(!Array.isArray(d.equipmentSlots)||!Array.isArray(d.embeddedSlots)||!Array.isArray(d.safeAnimations))error(id,'Character slot and animation declarations must be arrays');
   if(d.source?.kind==='legacy-profile'){
    if(!['wizard','anteros','cleric','rogue','silverfarben','zombie','harpy','zombie-2','zombie-3','zombie-4'].includes(d.source.key))error(id,'Unknown existing animation catalogue profile');
   }
   else if(d.source?.kind==='individual-frames'){
    if(!Array.isArray(d.source.files)||!d.source.files.length)error(id,'Individual frames require at least one source');
    for(const file of d.source.files??[]){try{if(!await exists(safePath(file)))error(id,'Missing source image '+file);}catch(e){error(id,e.message);}}
    if(d.source.minimumDistinctFrames){
     const hashes=[];for(const file of d.source.files??[]){try{hashes.push(digest(await readFile(safePath(file))));}catch{}}
     if(new Set(hashes).size<d.source.minimumDistinctFrames)error(id,'Declared idle/frame contract requires '+d.source.minimumDistinctFrames+' distinct images');
    }
    const minimum=frameMinimum(d,all,rules);
    if(minimum){const hashes=[];for(const file of d.source.files??[]){try{hashes.push(digest(await readFile(safePath(file))));}catch{}}
     if(new Set(hashes).size<minimum)error(id,'New locomotion needs at least '+minimum+' distinct source images, not repeated file copies');}
   }else if(d.source)error(id,'Unknown source adapter '+d.source.kind);
   for(const [key,p]of Object.entries(d.frameOverrides??{})){
    if(typeof p!=='object'||!p){error(id,'Invalid frame correction '+key);continue;}
    for(const [anchor,xy]of Object.entries(p))if(!a?.anchors[anchor]||!Array.isArray(xy)||xy.length!==2||xy.some(n=>typeof n!=='number'||!Number.isFinite(n)||n<-.25||n>1.25))error(id,'Invalid relative anchor '+anchor+' in '+key);
   }
   warnings.push({id,message:'Flattened legacy body retained. Default anchor seeds require visual review; baked slots are not modular by implication.'});
  }
  if(d.kind==='equipment'){
   if(d.source?.kind==='directional-atlas'){
    try{
     const path=safePath(d.source.file,base);
     if(!await exists(path))error(id,'Missing equipment artwork '+d.source.file);
     else{const bytes=await readFile(path);if(bytes.subarray(1,4).toString()!=='PNG'||![4,6].includes(bytes[25]))error(id,'Modular painted layer needs an alpha-capable PNG');}
    }catch(e){error(id,e.message);}
    if(!Number.isInteger(d.source.columns)||!Number.isInteger(d.source.rows)||!Array.isArray(d.source.directions)||d.source.directions.length!==d.source.columns*d.source.rows)error(id,'Equipment directions do not match the declared atlas cells');
   }
   if(!['rear','front'].includes(d.drawOrder))error(id,'Equipment layer must be rear or front');
   if(!Array.isArray(d.scaleRelativeToHeight)||d.scaleRelativeToHeight.length!==3||d.scaleRelativeToHeight.some(n=>typeof n!=='number'||!Number.isFinite(n)||n<=0||n>3))error(id,'Equipment needs three positive relative dimensions');
   for(const anatomy of d.anatomies??[]){const a=anatomies.get(anatomy);if(!a)error(id,'Unknown compatible anatomy '+anatomy);else if(!a.anchors[d.anchor])error(id,anatomy+' has no anatomical anchor '+d.anchor);}
   if((d.occludesEmbedded??[]).length&&!d.replacementMask)error(id,'Replacing baked equipment requires an explicit replacement mask');
  }
  if(d.kind==='overlay'){
   if(!['silhouette-shader','layered-shader'].includes(d.implementation))error(id,'Body effects must declare a supported silhouette implementation');
   if(typeof d.priority!=='number'||d.priority<0||d.priority>100)error(id,'Overlay priority must be 0..100');
   if(!['poisoned','petrified','frosted','burned','cursed','invisible','paralysed','charmed','frightened','blinded','deafened','stunned','unconscious','exhaustion','incapacitated','prone','hidden'].includes(d.shaderEffect??id))error(id,'Overlay must reuse a registered shaderEffect or extend and test its native shader implementation');
  }
  if(d.kind==='binding')for(const [profile,anchors]of Object.entries(d.anchorsByAnatomy??{}))for(const anchor of anchors){if(!anatomies.get(profile)?.anchors[anchor])error(id,profile+' has no binding anchor '+anchor);}
  if(d.kind==='animation'){
   if(!Array.isArray(d.frames)||!d.frames.length)error(id,'Animation has no frames');
   if(!Number.isFinite(d.fps)||d.fps<=0||d.fps>60)error(id,'Animation fps must be in (0,60]');
   if(!Number.isFinite(d.referenceHeight)||d.referenceHeight<=0)error(id,'Animation needs an explicit standing referenceHeight, not pose-envelope normalization');
   if(!Array.isArray(d.pivot)||d.pivot.length!==2||d.pivot.some(v=>typeof v!=='number'||v<0||v>1))error(id,'Animation pivot must contain two normalized coordinates');
   if(d.mirrorHorizontally!==undefined&&typeof d.mirrorHorizontally!=='boolean')error(id,'Horizontal mirroring must be a boolean');
   if(d.soleContact!==undefined&&(!Array.isArray(d.soleContact)||d.soleContact.length!==2||d.soleContact.some(v=>!Number.isFinite(v)||v<0||v>1)||d.soleContact[1]<=d.pivot?.[1]))error(id,'Sole contact must be a normalized point below the pelvis');
   if(d.toolGrip!==undefined&&(!Array.isArray(d.toolGrip)||d.toolGrip.length!==2||d.toolGrip.some(v=>!Number.isFinite(v)||v<0||v>1)))error(id,'Tool grip must be a normalized point inside the frame');
   if(d.restVolume!==undefined){
    const parts=['head','chest','hips','calves','boots'];
    if(!['rest_on_prop','rest_awake'].includes(d.action)||!d.soleContact||!d.restVolume||parts.some(part=>!Number.isFinite(d.restVolume[part])||d.restVolume[part]<=0||d.restVolume[part]>.3))error(id,'Rest volume requires normalized measurements for all five body regions and a sole contact');
   }
   if(d.restBlanket!==undefined){
    const blanket=d.restBlanket;
    const validTint=(value)=>typeof value==='string'&&/^#[\da-f]{6}$/i.test(value);
    if(!d.restVolume||!validTint(blanket?.base)||!validTint(blanket?.trim)||![1,2].includes(blanket?.bands))error(id,'Rest blanket requires a body profile, two hex textile colors and one or two bands');
   }
   if(d.restSculpt!==undefined&&!validRestSculpt(d.restSculpt,d.restVolume)){
    error(id,'Reclining bust needs a body profile and ordered facial landmarks within the top half of the source');
   }
   const minimum=frameMinimum(d,all,rules);
   if(minimum&&(d.frames?.length??0)<minimum)error(id,'Animation has fewer than '+minimum+' phases');
   if(motionContract){const incompatibility=capabilityError(d,motionContract);if(incompatibility)error(id,incompatibility);}
   const hashes=[];
   for(const frame of d.frames??[]){const file=typeof frame==='string'?frame:frame.file;try{const path=safePath(file);if(!await exists(path))error(id,'Missing animation frame '+file);else hashes.push(digest(await readFile(path)));}catch(e){error(id,'Invalid animation frame path: '+e.message);}}
   if(minimum&&new Set(hashes).size<minimum)error(id,'Animation needs '+minimum+' distinct source frames, not repeated file copies');
  }
 }
 for(const r of all){const d=r.definition;for(const dependency of d.dependencies??[])if(!ids.has(dependency))error(d.id,'Missing resource dependency '+dependency);
  if(d.kind==='variant'){
   const base=all.find(r=>r.definition.id===d.base)?.definition;
   if(!base||base.kind!=='character')error(d.id,'Variant has no existing character base');
   for(const [effect,amount]of Object.entries(d.effects??{}))if(!all.some(r=>r.definition.id===effect&&r.definition.kind==='overlay')||typeof amount!=='number'||!Number.isFinite(amount)||amount<0||amount>1)error(d.id,'Unknown or invalid variant effect '+effect);
   for(const [slot,itemId]of Object.entries(d.equipment??{})){
    const item=all.find(r=>r.definition.id===itemId)?.definition;
    if(!item||item.kind!=='equipment')error(d.id,'Unknown equipment '+itemId);
    else if(item.slot!==slot||!item.anatomies.includes(d.anatomy))error(d.id,'Equipment incompatible with variant slot/anatomy '+itemId);
    else if(base?.embeddedSlots?.includes(slot)&&!item.replacementMask)error(d.id,'Variant would stack over baked '+slot+' without a mask');
   }
  }
  if(d.kind==='animation'&&!all.some(r=>r.definition.kind==='character'&&r.definition.id===d.character&&r.definition.anatomy===d.anatomy))error(d.id,'Animation needs a registered compatible character');
 }
 const references=[];
 if(motionContract)references.push({path:relative(workspace,motionContractPath),sha256:digest(await readFile(motionContractPath))});
 references.push({path:'scripts/lib/character-motion.mjs',sha256:digest(await readFile(resolve(workspace,'scripts/lib/character-motion.mjs')))});
 for(const path of await list(resolve(base,'anatomies')))references.push({path:relative(workspace,path),sha256:digest(await readFile(path))});
 async function codeTree(dir){for(const e of await readdir(dir,{withFileTypes:true}).catch(()=>[])){if(e.name==='imported')continue;const path=resolve(dir,e.name);if(e.isDirectory())await codeTree(path);else if(/\.(gd|gdshader|gdshaderinc)$/.test(e.name))references.push({path:relative(workspace,path),sha256:digest(await readFile(path))});}}
 await codeTree(base);
 for(const record of all)for(const file of record.definition.source?.files??[]){try{const path=safePath(file);if(await exists(path))references.push({path:file,sha256:digest(await readFile(path))});}catch{}}
 for(const record of all)if(record.definition.source?.file){try{const path=safePath(record.definition.source.file,base);if(await exists(path))references.push({path:relative(workspace,path),sha256:digest(await readFile(path))});}catch{}}
 for(const record of all)if(record.definition.kind==='animation')for(const frame of record.definition.frames??[]){try{const file=typeof frame==='string'?frame:frame.file,path=safePath(file);if(await exists(path))references.push({path:file,sha256:digest(await readFile(path))});}catch{}}
 for(const file of ['scripts/character-pipeline.mjs','scripts/install-character-modular.mjs','prototypes/godot-shared/characters/pipeline-rules.json','prototypes/godot-shared/sprites/character_stature.json','prototypes/godot-shared/sprites/character_stature.gd','prototypes/godot-shared/sprites/npc_sprite_library.gd'])if(await exists(resolve(workspace,file)))references.push({path:file,sha256:digest(await readFile(resolve(workspace,file)))});
 for(const file of ['prototypes/godot-shared/sprites/frames.json','prototypes/godot-shared/sprites/sprite_library.gd','prototypes/godot-shared/combat/baked-frames.json'])if(await exists(resolve(workspace,file)))references.push({path:file,sha256:digest(await readFile(resolve(workspace,file)))});
 for(const file of ['combat/combat_controller.gd','sprites/npc_condition_visuals.gd','sprites/condition_overlay_picker.gd','inventory/inventory_bridge.gd']){
  const path='prototypes/godot-shared/'+file;if(await exists(resolve(workspace,path)))references.push({path,sha256:digest(await readFile(resolve(workspace,path)))});
 }
 for(const project of ['godot-pecio','godot-retiro','godot-campamentos'])for(const file of ['scripts/player_token.gd','loading/loading_http.gd']){
  const path='prototypes/'+project+'/'+file;if(await exists(resolve(workspace,path)))references.push({path,sha256:digest(await readFile(resolve(workspace,path)))});
 }
 const atlas=await json(resolve(workspace,'prototypes/godot-shared/sprites/frames.json'));
 for(const spec of Object.values(atlas.atlases)){const path=resolve(workspace,'prototypes/godot-shared/sprites',spec.file);if(await exists(path))references.push({path:relative(workspace,path),sha256:digest(await readFile(path))});else error('animation-library','Missing current atlas '+spec.file);}
 references.sort((a,b)=>a.path.localeCompare(b.path));
 return {version:1,errors,warnings,valid:errors.length===0,definitions:all.length,anatomies:anatomies.size,revision:digest(all.map(r=>digest(JSON.stringify(r.definition))).join('\n')+'\n'+JSON.stringify(references)),referencedFiles:references};
}
async function output(value,path){await mkdir(dirname(path),{recursive:true});await writeFile(path,JSON.stringify(value,null,2)+'\n');}
export async function importLibrary({promote=false,reviewFile=null,scope=null,onlyIds=null}={}){
 const all=await definitions();
 if(scope!==null||onlyIds!==null){
  if(typeof scope!=='string'||!/^[a-z][a-z0-9-]{1,63}$/.test(scope)||!Array.isArray(onlyIds)||!onlyIds.length)throw Error('Scoped import requires a safe name and explicit resource IDs');
  const known=new Set(all.map(r=>r.definition.id));
  for(const id of onlyIds)if(!known.has(id))throw Error('Unknown scoped resource: '+id);
 }
 const records=onlyIds?all.filter(r=>onlyIds.includes(r.definition.id)):all,result=await validate(records);if(!result.valid)throw Error('Import blocked: '+JSON.stringify(result.errors));
 let review=null;
 if(promote){if(!reviewFile)throw Error('Production promotion requires current technical and visual review evidence');review=await json(safePath(reviewFile));
  for(const r of records)if(!r.definition.deferred&&!r.definition.review?.deferredByUser&&String(r.definition.review?.visual??'').startsWith('rejected'))throw Error('Production promotion blocked by rejected visual resource '+r.definition.id);
  if(review.revision!==result.revision||review.technical!=='passed'||review.visual!=='reviewed'||!Array.isArray(review.evidence)||!review.evidence.length)throw Error('Review is missing or stale for this exact resource revision');
  for(const file of review.evidence)if(!await exists(safePath(file)))throw Error('Review evidence does not exist: '+file);
  if(!review.nativeReport)throw Error('Native validation report is required for promotion');
  const native=await json(safePath(review.nativeReport));
  if(scope&&(review.scope!==scope||native.scope!==scope))throw Error('Review scope does not match requested resources');
  if(native.revision!==result.revision||native.passed!==true||native.errors?.length||!(native.checks>0))throw Error('Native validation is failed, missing checks or stale');
 }
 const catalogue={version:1,status:promote?'reviewed-candidate':'inspection-only',revision:result.revision,characters:{},variants:{},equipment:{},animations:{},overlays:{},bindings:{},anatomies:{},provenance:[],review};
 for(const path of await list(resolve(source,'anatomies'))){const a=await json(path);catalogue.anatomies[a.id]=a;}
 for(const {definition:d,path,sha256}of records){const def=structuredClone(d);
  if(def.source?.kind==='individual-frames'){
   def.source.frames=[];
   for(const [i,file]of def.source.files.entries()){
    const from=safePath(file),bytes=await readFile(from),local='imported/'+def.id+'/'+String(i).padStart(2,'0')+'-'+basename(file),to=safePath(local,source);
    await mkdir(dirname(to),{recursive:true});await copyFile(from,to);def.source.frames.push('res://characters/'+local);
    catalogue.provenance.push({id:def.id,source:file,derived:'prototypes/godot-shared/characters/'+local,sha256:digest(bytes),operation:'byte-exact source copy; original preserved'});
   }
  }
  if(def.kind==='animation'){
   def.runtimeFrames=[];
   for(const [i,frame]of def.frames.entries()){
    const file=typeof frame==='string'?frame:frame.file,from=safePath(file),bytes=await readFile(from);
    const local='imported/'+def.id+'/'+String(i).padStart(2,'0')+'-'+basename(file),to=safePath(local,source);
    await mkdir(dirname(to),{recursive:true});await copyFile(from,to);
    def.runtimeFrames.push({file:'res://characters/'+local,pivot:typeof frame==='object'?frame.pivot??def.pivot:def.pivot});
    catalogue.provenance.push({id:def.id,source:file,derived:'prototypes/godot-shared/characters/'+local,sha256:digest(bytes),operation:'byte-exact animation source copy; scale uses explicit standing reference height'});
   }
  }
  const bucket={character:'characters',variant:'variants',equipment:'equipment',animation:'animations',overlay:'overlays',binding:'bindings'}[def.kind];
  if(bucket)catalogue[bucket][def.id]=def;
  catalogue.provenance.push({id:def.id,definition:relative(workspace,path).replaceAll('\\','/'),sha256});
 }
 if(scope)catalogue.scope={name:scope,ids:onlyIds};
 const target=resolve(source,scope?'scopes/'+scope+(promote?'':'.candidate')+'.json':promote?'catalogue.json':'candidate-catalogue.json');
 const reportFolder=scope==='loading-identities-v6'?'loading-identity-v6':scope??'character-modular-20261116';
 await output(catalogue,target);
 await output(result,resolve(workspace,'output',reportFolder,'pipeline-validation.json'));
 return {file:relative(workspace,target),...result,referencedFiles:result.referencedFiles.length,status:catalogue.status};
}
async function main(){const [command='validate',...args]=process.argv.slice(2),option=name=>{const i=args.indexOf(name);return i<0?null:args[i+1];};
 if(command==='validate'){
  const path=option('--definition'),all=await definitions();
  const records=path?[...all.filter(r=>resolve(r.path)!==safePath(path)),{path:safePath(path),definition:await json(safePath(path)),sha256:digest(await readFile(safePath(path)))}]:all;
  const result=await validate(records);await output(result,resolve(workspace,'output/character-modular-20261116/pipeline-validation.json'));console.log(JSON.stringify(result));if(!result.valid)process.exitCode=1;
 }else if(command==='import'){console.log(JSON.stringify(await importLibrary({promote:args.includes('--promote'),reviewFile:option('--review'),scope:option('--scope'),onlyIds:option('--only')?.split(',')??null})));}
 else if(command==='templates'){console.log((await list(resolve(source,'templates'))).map(p=>relative(source,p)).join('\n'));}
 else if(command==='reuse'){
  const query=(option('--query')??'').toLowerCase();const audit=await json(resolve(workspace,'output/character-modular-20261116/repository-audit.json'));
  console.log(JSON.stringify({families:audit.families.filter(f=>JSON.stringify(f).toLowerCase().includes(query)),resources:audit.images.filter(f=>(f.path+' '+f.family).toLowerCase().includes(query)).slice(0,35),existing:(await definitions()).filter(r=>JSON.stringify(r.definition).toLowerCase().includes(query)).map(r=>r.definition.id)},null,2));
 }else if(command==='anchors'){
  const edit=await json(safePath(option('--file'))),records=await definitions();
  const record=records.find(r=>r.definition.id===edit.character&&r.definition.kind==='character');
  if(!record||!edit.corrections||typeof edit.corrections!=='object')throw Error('Unknown character or invalid correction file');
  const updated=structuredClone(record.definition);updated.frameOverrides??={};
  for(const [frame,anchors]of Object.entries(edit.corrections))updated.frameOverrides[frame]={...updated.frameOverrides[frame],...anchors};
  const result=await validate(records.map(r=>r===record?{...r,definition:updated}:r));
  if(!result.valid)throw Error('Anchor update blocked: '+JSON.stringify(result.errors));
  await output(updated,record.path);console.log(JSON.stringify(await importLibrary()));
 }else if(command==='adopt'){
  const file=safePath(option('--file')),definition=await json(file),all=await definitions();
  const result=await validate([...all.filter(r=>r.definition.id!==definition.id),{path:file,definition}]);
  if(!result.valid)throw Error('Definition adoption blocked: '+JSON.stringify(result.errors));
  const bucket={character:'characters',variant:'characters',equipment:'equipment',animation:'animations',overlay:'overlays',binding:'bindings'}[definition.kind];
  if(!bucket)throw Error('Unknown resource kind');
  const target=safePath('definitions/'+bucket+'/'+definition.id+'.json',source);
  if(await exists(target))throw Error('Existing definition must be edited and reviewed, not overwritten by adoption');
  await output(definition,target);console.log(JSON.stringify(await importLibrary()));
 }else if(command==='create'){
  const id=option('--id'),kind=option('--kind')??'character',template=option('--template')??'humanoid-tall';
  if(!id||!new RegExp((await json(resolve(source,'pipeline-rules.json'))).idPattern).test(id))throw Error('Supply a valid --id');
  const actualKind=kind==='held-object'?'equipment':kind;
  const target=safePath('drafts/'+id+'.json',source);if(await exists(target)||(await definitions()).some(r=>r.definition.id===id))throw Error('Definition already exists; refusing to overwrite it');
  const seed=await json(safePath('templates/'+kind+'.json',source));seed.id=id;seed.anatomy=template;
  seed.kind=actualKind;
  if(actualKind==='character')seed.equipmentSlots=(await json(safePath('anatomies/'+template+'.json',source))).slots;
  seed.reuseSearch={required:true,command:'node scripts/character-pipeline.mjs reuse --query '+id};
  await output(seed,target);console.log(relative(workspace,target));
 }else throw Error('Commands: validate, import [--promote --review FILE], templates, reuse --query TEXT, create --id ID --kind CATEGORY --template ANATOMY');
}
if(import.meta.url===pathToFileURL(process.argv[1]??'').href)main().catch(error=>{console.error(error.message);process.exitCode=1;});
