import {readdir,readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {resolve,relative,extname,basename} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'..'),out=resolve(root,'output/character-modular-20261116');
const paths=['campaigns/one-shot/public','campaigns/stormwreck-isle/public','campaigns/camp-rests/public','engine/client','engine/shared','prototypes/godot-shared','prototypes/godot-pecio','prototypes/godot-retiro','prototypes/godot-campamentos','scripts'];
const files=[];
async function walk(dir){for(const e of await readdir(dir,{withFileTypes:true}).catch(()=>[])){if(['.git','.godot','node_modules','dist'].includes(e.name))continue;const p=resolve(dir,e.name);if(e.isDirectory())await walk(p);else if(!/\.(?:uid|import|log)$/.test(e.name))files.push(p);}}
for(const path of paths)await walk(resolve(root,path));
const frames=JSON.parse(await readFile(resolve(root,'prototypes/godot-shared/sprites/frames.json'),'utf8'));
const sources=JSON.parse(await readFile(resolve(root,'prototypes/godot-shared/sprites/art-sources.json'),'utf8'));
const manifests=['prototypes/godot-shared/sprites/frames.json','prototypes/godot-shared/sprites/art-sources.json','prototypes/godot-shared/inventory/art-sources.json','prototypes/godot-shared/combat/asset-provenance.json'];
const imageRecords=[],codeRecords=[];
const family=path=>/silverfarben/i.test(path)?'silverfarben':/trinity|maria|rogue/i.test(path)?'trinity':/cleric|\bmia\b/i.test(path)?'mia':/wizard|\bmike\b/i.test(path)?'mike':/anteros/i.test(path)?'anteros':/zomb/i.test(path)?'zombie':/harp|arpia|arpía/i.test(path)?'harpy':/vaca|\/cow/i.test(path)?'cow':/rosas|rose/i.test(path)?'roses':/ben\b/i.test(path)?'ben':/margaret/i.test(path)?'margaret':/fritz/i.test(path)?'fritz':/carnicero|boris/i.test(path)?'boris':/ghoul/i.test(path)?'ghoul':/patron|bartender|aldean/i.test(path)?'villager':'unassigned';
function imageInfo(bytes,extension){
 if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return {format:'png',width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),alphaChannel:[4,6].includes(bytes[25]),pixelTransparency:'not inferred from presence of alpha channel'};
 if(extension==='.svg'){const text=bytes.toString('utf8'),view=text.match(/viewBox=["']([^"']+)["']/)?.[1].trim().split(/[ ,]+/).map(Number);return {format:'svg',width:Number(text.match(/\bwidth=["']([\d.]+)/)?.[1]??view?.[2])||null,height:Number(text.match(/\bheight=["']([\d.]+)/)?.[1]??view?.[3])||null,alphaChannel:true,pixelTransparency:'vector; inspect rendered result'};}
 if(extension==='.webp'&&bytes.toString('ascii',12,16)==='VP8X')return {format:'webp',width:1+bytes.readUIntLE(24,3),height:1+bytes.readUIntLE(27,3),alphaChannel:Boolean(bytes[20]&16)};
 return {format:extension.slice(1),width:null,height:null,alphaChannel:null,dimensionsStatus:'requires image-decoder inspection'};
}
let cursor=0;
await Promise.all(Array.from({length:4},async()=>{while(cursor<files.length){const path=files[cursor++],name=relative(root,path).replaceAll('\\','/'),extension=extname(path).toLowerCase();
 const isImage=['.png','.webp','.svg','.jpg','.jpeg'].includes(extension),relevant=/\/sprites\/|\/tokens\/|\/characters\/|\/m3\/|\/inventory\/|\/combat\/(art|baked|icons)\/|condition|character-motion|sprite|facing|walks|modular/i.test(name);
 if(isImage&&relevant){const bytes=await readFile(path),hash=createHash('sha256').update(bytes).digest('hex'),f=family(name),derived=/\/baked\/|character-motion-v1/.test(name),icon=/\/icons\//.test(name),vfx=/vfx|effect|condition/.test(name);
 const classification=icon||vfx?'A':derived||f!=='unassigned'?'B':'C';
 imageRecords.push({path:name,bytes:bytes.length,sha256:hash,...imageInfo(bytes,extension),family:f,role:icon?'icon':vfx?'effect':derived?'derived-atlas':'source-or-legacy-art',classification,decision:icon||vfx?'Reusable graphic; validate its integration':derived?'Reuse current animation; add frame anchors/masks for modular equipment':'Preserve original; infer no separable equipment layers from a flattened image',equipmentModularity:icon||vfx?'not a character body':'flattened clothing/gear must be analysed; replacement needs an authored mask or a separate base',sourceRelationship:derived?'Referenced by existing frame manifest; originals retained':null});
 }else if(['.gd','.gdshader','.tscn','.godot','.ts','.mjs','.json'].includes(extension)&&(/prototypes\/godot-(?:shared|pecio|retiro|campamentos)\//.test(name)||relevant)){
 const bytes=await readFile(path);if(bytes.length>15_000_000)continue;const text=bytes.toString('utf8');
 if(/Sprite3D|AnimatedSprite3D|char_profile|tokenAnimations|condition|inventory|equip|loading_session|save_local|multiplayer|TCPServer|WebSocket|shader_type/.test(text))codeRecords.push({path:name,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,features:['Sprite3D','AnimatedSprite3D','SubViewport','ShaderMaterial','TCPServer','WebSocket','ENet','multiplayer','store_var','equipment','inventory','condition','char_profile'].filter(k=>text.includes(k))});
 }
}}));
imageRecords.sort((a,b)=>a.path.localeCompare(b.path));codeRecords.sort((a,b)=>a.path.localeCompare(b.path));
const groups=new Map();for(const record of imageRecords){const g=groups.get(record.sha256)??[];g.push(record.path);groups.set(record.sha256,g);}
const duplicateGroups=[...groups].filter(([,g])=>g.length>1).map(([sha256,paths])=>({sha256,paths}));
const atlasRecords=Object.entries(frames.atlases).map(([id,spec])=>({id,file:'prototypes/godot-shared/sprites/'+spec.file,frames:spec.frames.length,referenceHeight:spec.reference_height,referenceUse:'standing calibration, not the envelope of every pose',pivot:'bottom support; floor_offset from preserved frame metadata',scaleRange:[Math.min(...spec.frames.map(f=>f.height_scale)),Math.max(...spec.frames.map(f=>f.height_scale))],directions:/-(walk|run|attack|unarmed|torch|flight|claws|club)$/.test(id)?['n','ne','e','se','s','sw','w','nw']:'action rows; do not invent extra views',classification:'B',modularity:'A as existing animation; B for anchors/overlays; C if replacing baked clothing/weapon pixels'}));
const manualFamilies=[
 {id:'mike',anatomy:'humanoid-tall',base:'B',equipment:'C where robe/staff is baked',pilot:true,reason:'Reuse 8-direction clips; optional armour must respect cloth base, held props require explicit compatibility.'},
 {id:'anteros',anatomy:'humanoid-tall',base:'B',equipment:'C where cloak/weapon is baked',pilot:true,reason:'Visually distinct tiefling with suit/cape; base remains recognisable; mask and anchor declarations are mandatory.'},
 {id:'trinity',anatomy:'humanoid-small',base:'B',equipment:'C',pilot:false,reason:'Existing actions retained; integrated clothing/gear cannot become interchangeable by copying it as another layer.'},
 {id:'silverfarben',anatomy:'humanoid-dwarf',base:'B',equipment:'C',pilot:false,reason:'Preserve Aoife/Silverfarben identity, existing 1.37 m visual calibration; baked shoulder gear/book needs deliberate replacement.'},
 {id:'mia',anatomy:'humanoid-dwarf',base:'B',equipment:'C',pilot:false,reason:'Plate/weapon/shield are baked; reject incompatible armour replacement until masks or clean base are reviewed.'},
 {id:'cow',anatomy:'quadruped',base:'B',equipment:'B for harness/blanket only',pilot:true,reason:'Actual nonhumanoid in D8; no fictitious hand anchors or humanoid helmet requirements.'},
 {id:'harpy',anatomy:'winged-humanoid',base:'B',equipment:'C where weapon/wings overlap',pilot:false,reason:'Two actors share one anatomy; wing span must not determine torso width.'},
 {id:'zombie',anatomy:'humanoid-undead',base:'B',equipment:'C',pilot:false,reason:'Four appearances share anatomical conventions while retaining their own clothes and source frames.'},
 {id:'roses',anatomy:'plant',base:'B',equipment:'not humanoid',pilot:false,reason:'Use growth/root attachment points; no mandatory hands, helmets or boots.'},
 {id:'rejected-generated-collages',anatomy:null,base:'D',equipment:null,pilot:false,reason:'Only previously rejected incomplete/cropped generated attempts are reconstruction candidates; keep originals, never rebuild the whole library by default.'}
];
const report={date:'2026-11-16',method:'Automated path/hash/header/manifest/source inventory plus explicit family decisions. Alpha pixels, anatomical placement and artistic acceptance are separate checks.',scope:{roots:paths,scannedFiles:files.length,excluded:['.godot import cache','node_modules','historical non-Godot prototype snapshots','output/runtime generated evidence']},counts:{images:imageRecords.length,codeFiles:codeRecords.length,atlasCount:atlasRecords.length,atlasFrames:atlasRecords.reduce((n,a)=>n+a.frames,0),duplicateGroups:duplicateGroups.length},images:imageRecords,atlases:atlasRecords,duplicateGroups,code:codeRecords,families:manualFamilies,existingSources:manifests,existingSystemFindings:[
 'Godot 4.7.2 Forward+ in three local prototypes; 2D character Sprite3D with 8-direction camera selection.',
 'Existing shared sprite extraction/frames/install pipeline and inventory/backpack/session/UI must be extended, not replaced.',
 'Current overlays are floating billboard strokes. User rejected all three treatments: no artistic acceptance is carried into the modular system.',
 'Legacy anatomical rigs are proportions, not per-frame anatomical anchors. Equipment follows no permanent multi-slot runtime yet.',
 'Native backpack prepares take/store actions and torch visuals. Native combat save is local; it does not represent campaign cloud persistence.',
 'Native loading TCP/HTTP supports loading mini-scenes. No evidence of full authoritative multiplayer map/gear replication in the native prototype.',
 'A shared CapsuleShape resource is resized on each token instance; per-instance shape ownership requires an isolation regression.',
 'Web campaign/gameplay remains separate; source adapters are not a deployed native multiplayer migration.'
],sourceManifestShape:Object.keys(sources),artisticAcceptance:'previous overlays rejected; new modular candidate pending'};
await mkdir(out,{recursive:true});await writeFile(resolve(out,'repository-audit.json'),JSON.stringify(report,null,2)+'\n');
await writeFile(resolve(out,'asset-inventory.json'),JSON.stringify(imageRecords,null,2)+'\n');
await writeFile(resolve(out,'animation-inventory.json'),JSON.stringify(atlasRecords,null,2)+'\n');
await writeFile(resolve(out,'classification.json'),JSON.stringify(manualFamilies,null,2)+'\n');
console.log(JSON.stringify(report.counts));
