import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {visualComparison,visualComparisonAssets} from './lib/visual-comparison.mjs';
const out='output/godot-sheet-finish-20261117';
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const sourceFile='prototypes/godot-shared/character_sheet/art/v8/sources.json';
const source=JSON.parse(fs.readFileSync(sourceFile));
source.owners=['character_sheet/character_sheet.gd','character_sheet/sheet_widgets.gd','character_sheet/summary_composer.gd','character_sheet/illuminated_materials.gd','inventory/backpack_panel.gd'].map(file=>({file,sha256:hash('prototypes/godot-shared/'+file)}));
source.reused_v7_sha256=hash('prototypes/godot-shared/character_sheet/art/v7/royal-controls.png');
fs.writeFileSync(sourceFile,JSON.stringify(source,null,2));
const shots=fs.readdirSync(out).filter(f=>f.startsWith('after-')&&f.endsWith('.png'));
const originals=[];
const pairs=shots.map(after=>{
 const before=after.replace('after-','before-');
 for(const file of [before,after]){const p=path.join(out,file),b=fs.readFileSync(p);originals.push({file,width:b.readUInt32BE(16),height:b.readUInt32BE(20),sha256:hash(p)});}
 const item=originals.at(-1);
 return visualComparison({before,after,title:after.replace('after-','').replace('.png',''),width:item.width,height:item.height});
});
fs.writeFileSync(path.join(out,'originals.json'),JSON.stringify(originals,null,2));
fs.writeFileSync(path.join(out,'index.html'),`<!doctype html><html lang="es"><meta charset="utf-8"><title>Ficha RPG · acabado conjunto</title><style>body{max-width:1500px;margin:30px auto;padding:0 24px;background:#142126;color:#f3e1bc;font:17px/1.5 system-ui}h1{font-family:Georgia}a{color:#efcd89}</style><h1>Ficha RPG · acabado conjunto</h1><p>Extensión de los materiales de la cabecera y la vida a estadísticas, marcos, títulos, filas de acciones, atributos e inventario. Personajes y reglas conservados. Candidata para revisión artística.</p><p>Capturas nativas a igual resolución, cámara inicial, personaje, hora y clima. Las fases animadas pueden variar. Pulsa la imagen para alternar sin cambiar el encuadre; ampliación y teclado disponibles.</p>${pairs.join('')}<p><a href="originals.json">Originales y hashes</a> · <a href="../../../prototypes/godot-shared/character_sheet/art/v8/sources.json">Recursos reutilizados y propietarios</a></p>${visualComparisonAssets()}</html>`);
console.log('Full sheet review built: '+shots.length+' pairs');
