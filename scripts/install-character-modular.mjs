import {cp,readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {source,workspace,validate,importLibrary} from './character-pipeline.mjs';
const result=await validate();
if(!result.valid)throw Error('Install blocked by invalid character definitions: '+JSON.stringify(result.errors));
let candidate;
try{candidate=JSON.parse(await readFile(resolve(source,'candidate-catalogue.json'),'utf8'));}catch{}
if(candidate?.revision!==result.revision)await importLibrary();
for(const project of ['godot-pecio','godot-retiro','godot-campamentos']){
 const root=resolve(workspace,'prototypes',project);
 await cp(source,resolve(root,'characters'),{recursive:true,filter:path=>!/\.(uid|import)$/.test(path)});
 await mkdir(resolve(root,'addons/character_workshop'),{recursive:true});
 await cp(resolve(source,'editor'),resolve(root,'addons/character_workshop'),{recursive:true,filter:path=>!/\.(uid|import)$/.test(path)});
 const settings=resolve(root,'project.godot');let text=await readFile(settings,'utf8');
 if(!text.includes('res://addons/character_workshop/plugin.cfg')){
  if(text.includes('[editor_plugins]'))text=text.replace(/(\[editor_plugins\][\s\S]*?enabled=PackedStringArray\()([^)]*)(\))/,'$1$2'+(text.match(/\[editor_plugins\][\s\S]*?enabled=PackedStringArray\(([^)]*)\)/)?.[1]?.trim()?', ':'')+'"res://addons/character_workshop/plugin.cfg"$3');
  else text+='\n[editor_plugins]\n\nenabled=PackedStringArray("res://addons/character_workshop/plugin.cfg")\n';
  await writeFile(settings,text);
 }
}
console.log('Validated modular candidate installed in three prototypes; no production promotion implied.');
