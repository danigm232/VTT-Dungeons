import {readFile,writeFile,readdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {visualComparison,visualComparisonAssets} from './lib/visual-comparison.mjs';
const root=resolve(import.meta.dirname,'..');
const output=join(root,'output/godot-character-sheet-v4-20261116');
const module=join(root,'prototypes/godot-shared/character_sheet');
const sha=b=>createHash('sha256').update(b).digest('hex');
async function png(file){const b=await readFile(join(output,file));return {file,width:b.readUInt32BE(16),height:b.readUInt32BE(20),sha256:sha(b)};}
const captures=[];
for(const file of await readdir(output))if(file.endsWith('.png'))captures.push(await png(file));
const before=captures.find(x=>x.file==='before.png'),after=captures.find(x=>x.file==='mia.png');
if(before.width!==after.width||before.height!==after.height)throw Error('Unequal comparison dimensions');
const source=JSON.parse(await readFile(join(module,'art-sources.json'),'utf8'));
source.font_resources=[];source.code_resources=[];source.current_revision=4;
for(const file of source.extensions||[]){const e=JSON.parse(await readFile(join(module,file),'utf8'));source.assets.push(...e.assets);source.font_resources.push(...e.fonts);source.code_resources.push(...(e.code_resources||[]));}
for(const a of source.assets){const b=await readFile(join(module,a.file));Object.assign(a,{width:b.readUInt32BE(16),height:b.readUInt32BE(20),sha256:sha(b)});}
for(const f of source.font_resources){const b=await readFile(join(module,f.file));Object.assign(f,{bytes:b.length,sha256:sha(b),license_sha256:sha(await readFile(join(module,f.license_file)))});}
for(const c of source.code_resources)c.owner_sha256=sha(await readFile(join(module,c.owner)));
await writeFile(join(module,'asset-manifest.json'),JSON.stringify(source,null,2)+'\n');
const saved=[];
for(const folder of ['source-before','iterations'])for(const file of await readdir(join(output,folder))){const b=await readFile(join(output,folder,file));saved.push({file:folder+'/'+file,sha256:sha(b),...(file.endsWith('.png')?{width:b.readUInt32BE(16),height:b.readUInt32BE(20)}:{})});}
await writeFile(join(output,'originals.json'),JSON.stringify({date:'2026-11-16',engine:'Godot 4.7.2 Forward+',conditions:{scene:'Pecio C1, main.tscn',comparison_resolution:[1600,900],actor:'mia',role:'player',clock:'Day 1, 12:00',weather:'clear',clock_running:false,camera:'Same initial camera; illustrated materials and inventory integration refined. Sprite idle, flames and water phases may differ.',before:'Previously delivered output/godot-character-sheet-v3-20261116/mia.png, copied unchanged',reference:'User artistic reference, study only; separate framing, never used as an exact overlay',dynamic:'Separate isolated test frames: HP 7/11, temp HP 3, spell slot 1/2, concentration Bendición and poisoned condition. Restored before the following capture.',equipment:'Existing torch equipped through InventoryBridge after the inventory closes; shared quantities unchanged; stowed again before the standalone capture.'},captures,saved},null,2)+'\n');
const tests=[];
for(const project of ['pecio','retiro','campamentos']){
 const log=await readFile(join(output,'test-'+project+'.log'),'utf8');const m=log.match(/CHARACTER SHEET TEST (\{[^\n]+\})/);if(!m)throw Error('Missing test '+project);tests.push({suite:'character_sheet',project,...JSON.parse(m[1])});
}
for(const [file,project,suite,pattern] of [
 ['backpack-pecio.log','pecio','backpack',/BACKPACK (\d+) PASS \/ (\d+) FAIL/],
 ['backpack-retiro.log','retiro','backpack',/BACKPACK (\d+) PASS \/ (\d+) FAIL/],
 ['interfaces.log','pecio','interfaces',/VTT INTERFACES TESTS: (\d+) PASS \/ (\d+) FAIL/]
]){const log=await readFile(join(output,file),'utf8'),m=log.match(pattern);if(!m)throw Error('Missing regression '+file);tests.push({suite,project,passed:Number(m[1]),failed:Number(m[2])});}
const combatLog=await readFile(join(output,'combat-rules.log'),'utf8');const combat=combatLog.match(/\{"errors":\[.*\],"failed":\d+,"passed":\d+\}/);if(!combat)throw Error('Missing combat report');tests.push({suite:'combat_rules',project:'pecio',...JSON.parse(combat[0])});
if(tests.some(t=>t.failed))throw Error('Failing tests');
const layout=JSON.parse(await readFile(join(output,'layout.json'),'utf8'));
const rect=s=>s.match(/-?\d+(?:\.\d+)?/g).map(Number);
const geometries=[];
for(const file of ['mia.png','maria.png','mike.png','compact.png','wide.png','dynamic-state.png','dynamic-compact.png']){
 const m=layout[file],body=rect(m.body),window=rect(m.window),capture=captures.find(c=>c.file===file);
 if(window[0]<0||window[1]<0||window[0]+window[2]>capture.width+1||window[1]+window[3]>capture.height+1)throw Error('Window outside '+file);
 for(const key of ['SummarySkills','SummaryMagic','SummaryTraits']){const r=rect(m[key]);if(file!=='dynamic-compact.png'&&(r[1]<body[1]-1||r[1]+r[3]>body[1]+body[3]+1))throw Error('Hidden lower block '+file+'/'+key);}
 if(m.general_scroll!==0)throw Error('Global summary scroll '+file);geometries.push({file,window,lower_blocks_visible:file!=='dynamic-compact.png'?'all':'responsive height',general_scroll:0});
}
const passed=tests.reduce((n,t)=>n+t.passed,0);
await writeFile(join(output,'validation.json'),JSON.stringify({date:'2026-11-16',passed,failed:0,tests,geometries,review:{native:'Actual Forward+ captures inspected and refined in successive passes',browser_interaction:'Not reverified',physical_devices:'Not tested',user_artistic_acceptance:'Pending'}},null,2)+'\n');

const views=[['mia.png','Resumen · Mia'],['combat.png','Combate'],['spells.png','Conjuros'],['inventory.png','Inventario'],['history.png','Historia'],['maria.png','Trinity'],['mike.png','Mike'],['dynamic-state.png','PG y recursos'],['inventory-equipped.png','Antorcha equipada'],['independent-backpack.png','Mochila externa'],['action.png','Acción y costes'],['compact.png','1366 × 768'],['wide.png','1920 × 1080'],['dynamic-compact.png','Estado dinámico · 1366'],['dm.png','Desde el DM']];
const css='body{margin:0;background:#211a16;color:#f4e5c8;font:17px/1.6 Georgia,serif}main{max-width:1560px;margin:auto;padding:30px 24px}h1,h2{color:#dcbb78;font-weight:400}h1{font-size:36px;margin:0}p{max-width:1120px}a{color:#e7c785}nav{display:flex;flex-wrap:wrap;gap:8px;margin:24px 0 14px}nav button{font:16px Georgia;padding:9px 14px;background:#493023;color:#f4e5c8;border:1px solid #96743d;cursor:pointer}nav button[aria-pressed=true]{background:#642f32;border-color:#e5bd6a}nav button:focus-visible{outline:3px solid white}.viewer{background:#100e0c;border:1px solid #896b43}.viewer img{display:block;width:100%;height:auto}.caption{padding:8px 14px;margin:0;background:#493023}small,.note{color:#c6b797}.reference-grid{display:grid;grid-template-columns:1.2fr 1fr;gap:20px}.reference-grid figure{margin:0}.reference-grid img{width:100%;height:auto}table{border-collapse:collapse;width:100%}td,th{text-align:left;padding:9px;border-bottom:1px solid #79633c}@media(max-width:800px){main{padding:20px 12px}.reference-grid{grid-template-columns:1fr}}';
const html=[
'<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Ficha ilustrada e inventario compartido</title><style>'+css+'</style><main><small>DUNGEONS · GODOT NATIVO · 16/11/2026</small><h1>Ilustración artesanal e inventario compartido</h1>',
'<p>Se conserva la distribución de la ficha y se enriquecen cartelas, retrato, estadísticas, iconos y contenido. Cinco pestañas: Resumen, Combate, Conjuros, Inventario e Historia. La nueva pestaña presenta la misma mochila, con los mismos objetos y operaciones.</p>',
'<nav aria-label="Capturas reales">'+views.map(([file,title],i)=>'<button data-view="'+file+'" aria-pressed="'+(i===0)+'">'+title+'</button>').join('')+'</nav><div class="viewer"><img id="native" src="mia.png" alt="Resumen ilustrado de Mia en Godot"><p class="caption" id="caption">Resumen · Mia</p></div>',
'<h2>Antes y después de esta pasada</h2><p class="note">1600 × 900, cámara inicial, C1, Mia, mediodía y despejado. Pulsa para superponer el resultado en el mismo rectángulo. Ampliar conserva zoom y desplazamiento. Las fases de animación pueden variar.</p>',
visualComparison({before:'before.png',after:'mia.png',title:'Ficha anterior → refinamiento ilustrado e Inventario integrado',width:1600,height:900}),
'<h2>Comparación artística</h2><div class="reference-grid"><figure><figcaption>Implementación real</figcaption><img src="mia.png" alt="Resultado actual 16:9"></figure><figure><figcaption>Referencia de materiales y composición</figcaption><img src="reference.png" alt="Referencia artística del usuario"></figure></div><p>Se recuperan pergamino con volumen, madera y latón, marco vegetal del retrato, medallones y motivos heráldicos. Las cabeceras alternan cuero borgoña, pergamino y nogal. Rasgos e historia comparten el pie con un paisaje a tinta/acuarela. El arco y el actor auténtico se conservan.</p>',
'<h2>Inventario y mochila: una sola fuente</h2><p>Se reutiliza la misma instancia de BackpackPanel y el mismo InventoryBridge. Se adapta la presentación dentro de la ficha y se restaura al abrir la mochila externa. Cambiar de pestaña o transferir la vista conserva las acciones preparadas; cerrar termina la sesión y reproduce la animación existente. Las pruebas verifican altas, cambios externos de cantidad, eliminación y sacar/guardar desde ambas presentaciones.</p>',
'<h2>Contenido más preciso</h2><ul><li>Las competencias sin registrar tienen sello propio y explicación. Se distinguen falta de competencia, competencia y pericia; valores alineados y salvaciones separadas.</li><li>La tabla muestra salvación/CD, curación o ausencia de d20; los efectos registrados sustituyen textos genéricos. Misil mágico presenta tres dardos y la reserva distingue espacios de conjuro de usos de clase.</li><li>El detalle indica objetivos, alcance, duración, efecto, coste y reserva. Disponibilidad y ejecución siguen en el controlador real.</li><li>CD y ataque de conjuro tienen iconos y cifras propias. Los espacios representan disponibles/gastados; las categorías respetan los datos preparados/conocidos.</li><li>Historia y rasgos aprovechan dos columnas, categorías e ilustración secundaria. Listas y detalles usan desplazamientos con tonos de pergamino y latón.</li></ul>',
'<h2>Validación actual</h2><table><tr><th>Suite</th><th>Proyecto</th><th>Correctas</th><th>Fallos</th></tr>'+tests.map(t=>'<tr><td>'+t.suite+'</td><td>'+t.project+'</td><td>'+t.passed+'</td><td>'+t.failed+'</td></tr>').join('')+'</table><p><strong>'+passed+' comprobaciones actuales sin fallos.</strong> Mia, Trinity y Mike; 50 acciones, numerosos conjuros, rasgos extensos, PG/recursos/estados, edición, dados físicos, reflejo del sprite/idle/equipo, cinco pestañas e inventario compartido. Capturas a 1600 × 900, 1920 × 1080 y 1366 × 768.</p>',
'<p class="note">Los tres bloques inferiores siguen visibles sin desplazamiento general en 1600 × 900. En alturas menores con estados adicionales, se permite desplazamiento intencionado si hace falta. Las competencias y preparación ausentes no se inventan. Se conservan las operaciones de mochila; no se añade una regla de carga o resolución automática de consumibles inexistente. Interacción del HTML en navegador y dispositivos físicos no revalidados; aceptación artística del usuario pendiente.</p>',
'<p><a href="originals.json">Originales e iteraciones</a> · <a href="validation.json">Pruebas</a> · <a href="layout.json">Medidas nativas</a> · <a href="../../docs/evidence/GODOT_CHARACTER_SHEET_20261116.md">Auditoría y archivos</a> · <a href="../../prototypes/godot-shared/character_sheet/asset-manifest.json">Materiales, prompts y procedencia</a></p></main>',
visualComparisonAssets(),
'<script>for(const b of document.querySelectorAll("[data-view]"))b.addEventListener("click",()=>{for(const other of document.querySelectorAll("[data-view]"))other.setAttribute("aria-pressed",String(other===b));document.querySelector("#native").src=b.dataset.view;document.querySelector("#native").alt=b.textContent+" · captura real de Godot";document.querySelector("#caption").textContent=b.textContent;});</script></html>'
].join('\n');
await writeFile(join(output,'index.html'),html);
console.log(JSON.stringify({passed,failed:0,captures:captures.length,art_assets:source.assets.length,geometry_checks:geometries.length,report:join(output,'index.html')}));
