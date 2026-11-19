import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const [id,path,promptFile]=process.argv.slice(2),file=resolve(import.meta.dirname,'../output/stormwreck-characters-20261117/generated-jobs.json');
if(!id||!path||!promptFile)throw new Error('id, path and prompt required');
let data={};try{data=JSON.parse(await readFile(file,'utf8'));}catch{}
data[id]={path,promptFile};await writeFile(file,JSON.stringify(data,null,2)+'\n');
console.log(JSON.stringify({saved:id}));
