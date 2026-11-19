import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const jobs=JSON.parse(await readFile(resolve(root,'output/stormwreck-characters-20261117/idle-jobs.json'),'utf8'));
const selected=[];
for(const id of process.argv.slice(2)){
 const job=jobs.find(j=>j.id===id);if(!job)throw new Error('Unknown idle job: '+id);
 selected.push({...job,prompt:await readFile(resolve(root,job.promptFile),'utf8'),references:job.references.map(f=>resolve(root,f))});
}
console.log(JSON.stringify(selected));
