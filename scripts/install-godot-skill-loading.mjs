/** Idempotent integration only. Keeps other prototype work and the root Git index intact. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'..'),changes=[];
const hash=s=>createHash('sha256').update(s).digest('hex');
for(const name of ['godot-pecio','godot-retiro']){
 const path=resolve(root,'prototypes',name,'project.godot');const before=await readFile(path,'utf8');let after=before;
 if(!after.includes('run/main_scene="res://loading/loading_boot.tscn"')){
  if(!after.includes('run/main_scene="res://scenes/main.tscn"'))throw Error('Custom bootstrap requires explicit integration: '+path);
  after=after.replace('run/main_scene="res://scenes/main.tscn"','run/main_scene="res://loading/loading_boot.tscn"');
 }
 if(!after.includes('SkillLoading="*res://loading/loading_coordinator.gd"')){
  if(after.includes('SkillLoading='))throw Error('Existing different SkillLoading autoload: '+path);
  after=after.includes('[autoload]')?after.replace('[autoload]','[autoload]\n\nSkillLoading="*res://loading/loading_coordinator.gd"'):after.replace('[display]','[autoload]\n\nSkillLoading="*res://loading/loading_coordinator.gd"\n\n[display]');
 }
 if(after!==before)await writeFile(path,after);
 changes.push({path,before:hash(before),after:hash(after),changed:after!==before});
}
const path=resolve(root,'prototypes/godot-retiro/scripts/map_transition_manager.gd');const before=await readFile(path,'utf8');let after=before;
if(!after.includes('get_node_or_null("/root/SkillLoading")')){
 const marker='func _perform_scene_swap(scene_path: String, dest_label: String, mode: String) -> void:';
 if(!after.includes(marker))throw Error('MapTransition entry point changed; preserve it and integrate explicitly.');
 const hook='\n\tvar loading := get_node_or_null("/root/SkillLoading")\n\tif loading != null:\n\t\tif not is_instance_valid(loading.loaded_map): loading.loaded_map = get_tree().current_scene\n\t\tloading.load_map(scene_path, dest_label, "map")\n\t\tawait loading.map_entered\n\t\tis_transitioning = false\n\t\ttransition_completed.emit(scene_path, pending_spawn_id)\n\t\treturn';
 after=after.replace(marker,marker+hook);await writeFile(path,after);
}
changes.push({path,before:hash(before),after:hash(after),changed:after!==before});
await mkdir(resolve(root,'output/godot-skill-loading-20261114'),{recursive:true});
await writeFile(resolve(root,'output/godot-skill-loading-20261114/integration.json'),JSON.stringify(changes,null,2));
console.log('Verified native bootstrap/autoload and MapTransition integration; existing prototype work preserved.');
