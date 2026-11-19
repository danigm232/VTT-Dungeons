import {readFile,writeFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {validate} from './character-pipeline.mjs';
const root=resolve(import.meta.dirname,'..'),out=resolve(root,'output/stormwreck-characters-20261117'),lib=resolve(root,'prototypes/godot-shared/characters/definitions');
const entries=[];
for(const kind of ['characters','animations'])for(const file of await readdir(resolve(lib,kind))){
 const d=JSON.parse(await readFile(resolve(lib,kind,file),'utf8'));if(d.campaign!=='stormwreck-isle')continue;
 const files=d.frames??d.source.files;const prompts=(await readdir(out)).filter(f=>f.startsWith(d.id.replace(/^sw-/,'').replace(/-idle8$/,'')+'-')&&f.endsWith('.prompt.txt'));
 const hashes=[];for(const file of files)hashes.push(createHash('sha256').update(await readFile(resolve(root,file))).digest('hex'));
 entries.push({id:d.id,owner:'prototypes/godot-shared/characters/definitions/'+kind+'/'+file,before:d.production?.originalIdentity??(d.source?.kind==='legacy-profile'?d.source.key:null),candidate:files,frameHashes:hashes,distinctFrames:new Set(hashes).size,method:d.production?.method??d.production?.operation,original:d.production?.original,originalSha256:d.production?.originalSha256,prompts:prompts.map(p=>'output/stormwreck-characters-20261117/'+p),mechanicalReference:d.mechanicalReference??null,visualGap:['VA-01','VA-03','VA-10'],reference:'REF-01: legibility and figure/light separation; existing Stormwreck identities; user-approved Runara idle sample',acceptance:d.review.userAcceptance??'pending',sourceRegistration:d.production?.supportRegistration??d.production?.importReport??null});
}
const result=await validate();await writeFile(resolve(out,'pipeline-validation.json'),JSON.stringify(result,null,2)+'\n');
await writeFile(resolve(out,'art-change-register.json'),JSON.stringify({date:'2026-11-17',scope:'Stormwreck base-view eight-phase idle cycles; not a full animation or equipment migration',revision:result.revision,entries},null,2)+'\n');
console.log(JSON.stringify({cycles:entries.length,distinctPhases:entries.reduce((s,e)=>s+e.distinctFrames,0),validation:result.valid,errors:result.errors,revision:result.revision}));
if(!result.valid||entries.some(e=>e.distinctFrames!==8))process.exit(1);
