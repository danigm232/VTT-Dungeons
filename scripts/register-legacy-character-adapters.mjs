import {readFile,writeFile,access} from 'node:fs/promises';
const folder='prototypes/godot-shared/characters/definitions/characters/';
const seed=JSON.parse(await readFile(folder+'mike.json','utf8'));
const records=[
 ['maria','Trinity · María Pies Ligeros','rogue','humanoid-small','rogue',['maria','Trinity','María Pies Ligeros','Maria Piesligeros'],['clothing','main_hand','off_hand','waist']],
 ['silverfarben','Silverfarben Hotel','silverfarben','humanoid-dwarf','silverfarben',['aoife','Aoife Sorrel','Silverfarben Hotel','silverfarben-hotel'],['clothing','off_hand','back']],
 ['mia','Mía','cleric','humanoid-dwarf','cleric',['Mia','Mía','cleric'],['clothing','armor','main_hand','off_hand']],
 ['zombie','Zombi marinero','zombie','humanoid-tall','zombie',['zombie','zombie-1'],['clothing']],
 ['zombie-2','Zombi marinero 2','zombie-2','humanoid-tall','zombie',['zombie-2'],['clothing']],
 ['zombie-3','Zombi marinero 3','zombie-3','humanoid-tall','zombie',['zombie-3'],['clothing']],
 ['zombie-4','Zombi marinero 4','zombie-4','humanoid-tall','zombie',['zombie-4'],['clothing']],
 ['harpy','Arpía','harpy','winged','harpy',['harpy','harpia','Arpía'],['clothing','main_hand']],
 ];
for(const [id,name,key,anatomy,statureRef,aliases,embeddedSlots]of records){
 const path=folder+id+'.json';try{await access(path);continue;}catch{}
 const definition={...structuredClone(seed),id,name,anatomy,source:{kind:'legacy-profile',key},aliases,statureRef,embeddedSlots,equipmentSlots:[],safeAnimations:['idle','walk','run','attack'],frameOverrides:{},equipmentPoseOverrides:{},limitations:['Compatibility adapter: existing animations are retained; anatomical seeds are editable and are not approved equipment fitting.','No newly authored animation or clothing is implied.'],migration:{body:'reused',overlays:'current-frame alpha adapter',equipment:'deferred by user; no slots enabled'},review:{technical:'pending current run',visual:'sample review pending',userAcceptance:'pending',evidence:[]}};
 await writeFile(path,JSON.stringify(definition,null,2)+'\n');
}
console.log('Eight existing player/creature adapters registered. Original graphics unchanged.');
