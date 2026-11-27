import {readFile,writeFile,readdir,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'..'),out=resolve(root,'output/loading-identity-v6');
const python='C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe';
const jobs=JSON.parse(await readFile(resolve(out,'production-jobs.json'),'utf8'));
const generated=JSON.parse(await readFile(resolve(out,'generated-sources.json'),'utf8'));
for(const name of (await readdir(out)).sort((a,b)=>Number(a.startsWith('retry-'))-Number(b.startsWith('retry-'))))if((name.startsWith('source-sw-')||name.startsWith('retry-sw-'))&&name.endsWith('.json')){
 const item=JSON.parse(await readFile(resolve(out,name),'utf8'));
 const index=generated.findIndex(g=>g.id===item.id);
 if(index<0)generated.push(item);else generated[index]=item;
}
await writeFile(resolve(out,'generated-sources.json'),JSON.stringify(generated,null,2));
const reports=[];
await mkdir(resolve(out,'imports'),{recursive:true});
for(const item of generated){
 const job=jobs.find(j=>j.id===item.id);if(!job||(job.actor!=='mike'&&job.action!=='handshake'))continue;
 const definition=JSON.parse(await readFile(resolve(root,job.definition),'utf8'));
 const sourceHash=createHash('sha256').update(await readFile(item.path)).digest('hex');
 if(definition.production.originalSha256!==sourceHash||definition.production.minimumAlpha!==24)definition.frames=[];
 // Contact/story poses share a sole line; walking keeps a fixed sole registration.
 definition.action=job.action==='scroll-walk'?'walk':'retreat_loading_'+job.action.replaceAll('-','_');
 if(!definition.frames.length){
  await writeFile(resolve(root,job.definition),JSON.stringify(definition,null,2)+'\n');
  const args=[resolve(root,'scripts/import-stormwreck-motion-detail.py'),job.id,item.path,'--format','webp','--minimum-alpha','24'];
  if(definition.production.standingReferenceExplicit)args.push('--reference-height',String(definition.production.standingReferenceExplicit));
  const result=spawnSync(python,args,{cwd:root,encoding:'utf8'});
  let report;try{report=JSON.parse(result.stdout.trim());}catch{report={id:job.id,errors:[result.stderr||result.stdout||'Extraction failed']};}
  reports.push(report);await writeFile(resolve(out,'imports',job.id+'.json'),JSON.stringify(report,null,2));
  console.log(job.id+': '+(result.status===0?'8 native phases extracted':'BLOCKED '+report.errors.join('; ')));
 }else{const report=JSON.parse(await readFile(resolve(root,definition.production.importReport),'utf8'));reports.push(report);}
}
await writeFile(resolve(out,'extraction-summary.json'),JSON.stringify(reports,null,2));
console.log(`${reports.filter(r=>!r.errors.length).length}/${reports.length} sheets passed extraction. Blocked sheets are not adopted.`);
