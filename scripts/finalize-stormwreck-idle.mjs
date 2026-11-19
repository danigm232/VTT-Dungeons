import {readFile,writeFile,access} from 'node:fs/promises';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const root=resolve(import.meta.dirname,'..'),base=resolve(root,'prototypes/godot-shared/characters');
const py='C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1112-737-0_26.1112.737.0_x64__3k8sg7r9htsxt/dependencies/python/python.exe';
const generated=JSON.parse(await readFile(resolve(root,'output/stormwreck-characters-20261117/generated-jobs.json'),'utf8'));
const jobs=JSON.parse(await readFile(resolve(root,'output/stormwreck-characters-20261117/idle-jobs.json'),'utf8'));
for(const id of process.argv.slice(2)){
 const job=jobs.find(j=>j.id===id),g=generated[id];if(!job||!g)throw new Error('Missing job '+id);
 const r=spawnSync(py,[resolve(root,'scripts/import-stormwreck-idle.py'),'--id',id,'--file',g.path,'--prompt-file',g.promptFile,'--draft',job.definition],{cwd:root,encoding:'utf8'});
 if(r.status){process.stdout.write(r.stdout);process.stderr.write(r.stderr);process.exit(r.status);}
 const key=id+(job.kind==='animation'?'-idle8':'');
 const review=spawnSync(process.execPath,[resolve(root,'scripts/review-stormwreck-idle.mjs'),key],{cwd:root,encoding:'utf8'});
 if(review.status){process.stdout.write(review.stdout);process.stderr.write(review.stderr);process.exit(review.status);}
 const draft=JSON.parse(await readFile(resolve(root,job.definition),'utf8'));
 const canonical=resolve(base,'definitions',draft.kind==='animation'?'animations':'characters',draft.id+'.json');
 const current=JSON.parse(await readFile(canonical,'utf8'));
 // Refresh only fields owned by this explicit asset revision; preserve unrelated edits.
 if(draft.kind==='character')current.source=draft.source;
 else for(const field of ['frames','fps','loop','pivot','referenceHeight','direction'])current[field]=draft[field];
 current.production=draft.production;current.review={...current.review,...draft.review};
 if(id==='varnoth'){current.source.directions=['s'];current.production.idleAtlas.direction='s';}
 await writeFile(canonical,JSON.stringify(current,null,2)+'\n');
 console.log(JSON.stringify({id:current.id,frames:8,imported:true,visual:'sheet internally reviewed; live loop and user acceptance separate'}));
}
