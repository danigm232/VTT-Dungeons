import {readFile,access} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'..'),out=resolve(root,'output/stormwreck-characters-20261117');
const gallery=JSON.parse(await readFile(resolve(out,'idle-gallery-manifest.json'),'utf8'));
const errors=[];
for(const r of gallery.records){
 const hashes=[];
 for(const file of r.frames){const data=await readFile(resolve(out,file));hashes.push(createHash('sha256').update(data).digest('hex'));}
 if(hashes.length!==8||new Set(hashes).size!==8)errors.push(r.id+': missing or duplicate phases');
 for(const file of r.native??[])await access(resolve(out,file));
}
const html=await readFile(resolve(out,'index.html'),'utf8');
for(const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new Function(match[1]);
if(gallery.records.length!==37)errors.push('Stormwreck roster incomplete');
console.log(JSON.stringify({cycles:gallery.records.length,phases:gallery.records.length*8,inlineScripts:'valid',errors}));
if(errors.length)process.exit(1);
