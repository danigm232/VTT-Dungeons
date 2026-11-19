import {mkdir,readdir,copyFile,readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'..');
const source=join(root,'prototypes/godot-shared/sprites');
async function sync(src,dst){await mkdir(dst,{recursive:true});for(const entry of await readdir(src,{withFileTypes:true})){if(/\.(uid|import)$/.test(entry.name))continue;const from=join(src,entry.name),to=join(dst,entry.name);if(entry.isDirectory())await sync(from,to);else await copyFile(from,to);}}
if(process.argv.includes('--publish-art')){
 const data=JSON.parse(await readFile(join(source,'frames.json'),'utf8'));
 const assets=[];
 for(const [id,atlas]of Object.entries(data.atlases)){
  const from=join(source,atlas.file),bytes=await readFile(from);assets.push({id,file:atlas.file,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),frames:atlas.frames.length});
  for(const campaign of ['stormwreck-isle','one-shot']){const dest=join(root,'campaigns',campaign,'public/art/character-motion-v1',id+'.png');await mkdir(resolve(dest,'..'),{recursive:true});await copyFile(from,dest);}
 }
 await writeFile(join(source,'asset-manifest.json'),JSON.stringify({date:'2026-11-15',minimumMovementFrames:8,originalsPreserved:true,assets},null,2)+'\n');
 await writeFile(join(root,'engine/client/character-motion-frames.json'),JSON.stringify(data)+'\n');
}
for(const project of ['godot-pecio','godot-retiro','godot-campamentos'])await sync(source,join(root,'prototypes',project,'sprites'));
console.log('Shared character sprites installed in Pecio, Retiro and campamentos.');
