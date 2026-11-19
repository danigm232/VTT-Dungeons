import {cp,mkdir,readdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const source=join(root,'prototypes/godot-shared/character_sheet');
for(const name of ['pecio','retiro','campamentos']) {
 const destination=join(root,'prototypes/godot-'+name,'character_sheet');
 await mkdir(destination,{recursive:true});
 await cp(source,destination,{recursive:true,filter:p=>!p.endsWith('.uid')&&!p.endsWith('.import')});
 await cp(join(root,'prototypes/godot-shared/inventory/backpack_panel.gd'),join(root,'prototypes/godot-'+name,'inventory/backpack_panel.gd'));
 await cp(join(root,'prototypes/godot-shared/inventory/inventory_bridge.gd'),join(root,'prototypes/godot-'+name,'inventory/inventory_bridge.gd'));
 await cp(join(root,'prototypes/godot-shared/dm_style/appearance.gd'),join(root,'prototypes/godot-'+name,'dm_style/appearance.gd'));
 console.log('Character sheet synced:',name);
}
