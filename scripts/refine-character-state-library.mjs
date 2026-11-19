import {readFile,writeFile} from 'node:fs/promises';
const root='prototypes/godot-shared/characters/';
const states={poisoned:['Envenenado','envenenada'],petrified:['Petrificado','petrificada'],frosted:['Escarchado',''],burned:['Quemado',''],cursed:['Maldito',''],invisible:['Invisible','invisible'],paralysed:['Paralizado','paralizada'],charmed:['Hechizado','hechizada'],frightened:['Asustado','asustada'],blinded:['Cegado','cegada'],deafened:['Ensordecido','ensordecida'],stunned:['Aturdido','aturdida'],unconscious:['Inconsciente','inconsciente'],exhaustion:['Agotamiento','agotamiento'],incapacitated:['Incapacitado','incapacitada'],prone:['Derribado','derribada'],hidden:['Oculto','oculta']};
const template=JSON.parse(await readFile(root+'definitions/overlays/cursed.json','utf8'));
for(const [id,[name,condition]]of Object.entries(states)){
 const path=root+'definitions/overlays/'+id+'.json';let d;try{d=JSON.parse(await readFile(path,'utf8'));}catch{d=structuredClone(template);d.id=id;d.priority=condition==='inconsciente'?80:45;}
 d.name=name;d.mechanicalCondition=condition;d.zone=['blinded','deafened','stunned','unconscious'].includes(id)?'anatomical head anchor within current alpha silhouette':'current sprite alpha; layered gear can share the same material';
 await writeFile(path,JSON.stringify(d,null,2)+'\n');
}
for(const [id,name]of Object.entries({roots:'Raíces',webs:'Telarañas',chains:'Cadenas','binding-ice':'Hielo inmovilizador','spectral-grasp':'Agarres espectrales','arcane-bindings':'Ataduras arcanas'})){
 const path=root+'definitions/bindings/'+id+'.json',d=JSON.parse(await readFile(path,'utf8'));d.name=name;await writeFile(path,JSON.stringify(d,null,2)+'\n');
}
