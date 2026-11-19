import {readFile,writeFile,access} from 'node:fs/promises';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const root=resolve(import.meta.dirname,'..'),library=resolve(root,'prototypes/godot-shared/characters');
for(const key of process.argv.slice(2)){
 if(!/^[a-z0-9-]+$/.test(key))throw new Error('Unsafe id');
 const file=resolve(library,'drafts','sw-'+key+'.json');
 const d=JSON.parse(await readFile(file,'utf8'));
 if(!d.production.importReport)throw new Error('No successful extraction; review blocked for '+key);
 const report=JSON.parse(await readFile(resolve(root,d.production.importReport),'utf8'));
 if(!report.passed||report.distinctPhases!==8)throw new Error('Blocked extraction: '+key);
 d.review.visual='internally reviewed: complete isolated phases, stable identity and anatomy; live-loop and user acceptance tracked separately';
 d.review.userAcceptance='pending';
 d.review.evidence=[...new Set([...(d.review.evidence??[]),d.production.importReport,d.production.original])];
 if(key==='myla'){d.source.directions=['sw'];d.production.idleAtlas.direction='sw';}
 d.orientation='Eight idle phases in one authored base view ('+(d.source?.directions?.[0]??d.direction)+'); no other views or locomotion claimed';
 await writeFile(file,JSON.stringify(d,null,2)+'\n');
 const canonical=resolve(library,'definitions',d.kind==='animation'?'animations':'characters',d.id+'.json');
 let exists=false;try{await access(canonical);exists=true;}catch{}
 if(exists){console.log(JSON.stringify({id:d.id,status:'already adopted; no implicit overwrite'}));continue;}
 const r=spawnSync(process.execPath,[resolve(root,'scripts/character-pipeline.mjs'),'adopt','--file',file],{cwd:root,encoding:'utf8'});
 process.stdout.write(r.stdout);process.stderr.write(r.stderr);if(r.status)process.exit(r.status);
}
