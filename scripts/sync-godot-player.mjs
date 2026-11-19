import {cp,mkdir,readdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
for(const project of ['godot-pecio','godot-retiro','godot-campamentos']){
 for(const module of ['player','combat']){
  const source=path.join(root,'prototypes/godot-shared',module);
  const target=path.join(root,'prototypes',project,module);
  await mkdir(target,{recursive:true});
  // Only source files, preserving baked art and unrelated current assets.
  for(const file of await readdir(source))if(/\.(gd|gdshader)$/.test(file))await cp(path.join(source,file),path.join(target,file));
 }
}
console.log('Shared player/combat source synchronized in all 3 Godot projects.');
