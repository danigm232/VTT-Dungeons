import {readdir,copyFile,mkdir} from 'node:fs/promises';
import {resolve,relative} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const source=resolve(root,'prototypes/godot-pecio/loading'),destination=resolve(root,'prototypes/godot-retiro/loading');
if(!relative(root,destination).startsWith('prototypes'))throw Error('Destination outside prototypes');
// Subpaths are normalized explicitly; no filesystem delete or move is needed.
async function sync(sub=''){
 await mkdir(resolve(destination,sub),{recursive:true});
 for(const entry of await readdir(resolve(source,sub),{withFileTypes:true})){
  if(entry.name.endsWith('.import')||entry.name.endsWith('.uid'))continue;
  const child=sub?sub+'/'+entry.name:entry.name;
  if(entry.isDirectory())await sync(child);else await copyFile(resolve(source,child),resolve(destination,child));
 }
}
await sync();
console.log('Native loading module synchronized: Pecio → Retiro (source and packed atlas resources).');
