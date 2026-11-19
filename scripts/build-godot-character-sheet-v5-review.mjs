import {readFile,writeFile,readdir,access} from 'node:fs/promises';
import {resolve,join,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {Script} from 'node:vm';
import {visualComparison,visualComparisonAssets} from './lib/visual-comparison.mjs';
const root=resolve(import.meta.dirname,'..'),out=join(root,'output/godot-character-sheet-v5-20261117');
const source=join(root,'prototypes/godot-shared/character_sheet');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const checklist=[
 [1,'Retrato y cabecera','Implementado','Retrato +21 %, recorte de cara y hombros, medallón de nivel y marco heráldico.'],
 [2,'Pergamino','Implementado','Material nuevo por capas, fibras, variación orgánica y base opaca; texto sobre zonas tranquilas.'],
 [3,'Marcos y cartelas','Implementado','Madera/latón exterior con remates, talla de secciones y contenedores secundarios discretos.'],
 [4,'Estadísticas','Implementado','PG borgoña con barra proporcional y temporales; CA dentro del escudo; unidades y valores reales.'],
 [5,'Iconos específicos','Implementado','Catálogo semántico estable; doce pictogramas nuevos y reutilización de armas, curación y equipo.'],
 [6,'Personaje central','Implementado','Ventana realmente arqueada, ajuste por silueta, plataforma/sombra y reflejo del actor, reposo, equipo y efectos actuales.'],
 [7,'Acciones','Implementado','Columnas legibles y nombres destacados; Resumen y Combate consultan los mismos campos y disponibilidad.'],
 [8,'Habilidades y salvaciones','Implementado','Sellos de competencia/pericia, seis salvaciones y procedencia. Percepción élfica de Mike aplicada desde su rasgo explícito.'],
 [9,'Magia','Implementado','Tarjetas adaptables, CD/ataque, reservas disponibles/gastadas y categorías reales. Misil mágico conserva el mismo nombre.'],
 [10,'Rasgos e ilustraciones','Implementado','Seis dibujos a tinta transparentes: montañas, fortaleza, ruinas, bosque, biblioteca y costa. Elección estable por trasfondo.'],
 [11,'Inventario','Parcial','Presentación y operaciones existentes verificadas: misma mochila, cantidades, selección y sacar/guardar al cerrar. El motor nativo no dispone de consumo automático ni transferencia entre inventarios personales; no se han inventado esas reglas.'],
 [12,'Historia','Implementado','Página editorial que se adapta al contenido, categorías, títulos, ilustración y lectura continua; amplía o desplaza si el texto es largo.']
].map(([id,name,status,result])=>({id,name,status,result,artisticAcceptance:'Pendiente del usuario'}));
const tests=[];
for(const [file,suite,project]of [
 ['sheet-pecio.log','Ficha y mochila integrada','Pecio'],['sheet-retiro.log','Ficha y mochila integrada','Retiro'],['sheet-campamentos.log','Ficha y mochila integrada','Campamentos'],
 ['combat-rules.log','Reglas de combate','Pecio'],['interfaces.log','Interfaces y roles','Pecio']]){
 const log=await readFile(join(out,file),'utf8');
 if(/SCRIPT ERROR|SHADER ERROR|Parse Error|^ERROR:/m.test(log))throw Error('Error in '+file);
 const objects=[...log.matchAll(/\{[^\r\n]*\}/g)].flatMap(m=>{try{return [JSON.parse(m[0])]}catch{return []}});
 let result=objects.filter(o=>Number.isFinite(o.passed)&&Number.isFinite(o.failed)).at(-1);
 if(!result){const match=log.match(/VTT INTERFACES TESTS:\s*(\d+) PASS \/ (\d+) FAIL/);if(match)result={passed:Number(match[1]),failed:Number(match[2])};}
 if(!result||result.failed)throw Error('Missing/failed results '+file);
 tests.push({suite,project,passed:result.passed,failed:result.failed,log:file});
}
const pipeline=JSON.parse(await readFile(join(out,'pipeline-validation.json'),'utf8'));
if(!pipeline.valid||pipeline.errors.length)throw Error('Character pipeline validation failed');
const tap=await readFile(join(out,'pipeline-tests.log'),'utf8');
const tapPass=Number(tap.match(/(?:#|ℹ)\s+pass (\d+)/)?.[1]),tapFail=Number(tap.match(/(?:#|ℹ)\s+fail (\d+)/)?.[1]);
if(!tapPass||tapFail!==0)throw Error('Pipeline regression tests incomplete');
tests.push({suite:'Validación y casos negativos del pipeline',project:'Compartido',passed:tapPass,failed:tapFail,log:'pipeline-tests.log'});
const captureLog=await readFile(join(out,'capture-final.log'),'utf8');
if(!captureLog.includes('CHARACTER SHEET V5 CAPTURE DONE')||/SCRIPT ERROR|SHADER ERROR|Parse Error|^ERROR:/m.test(captureLog))throw Error('Native capture incomplete');
const captures=[];
for(const file of await readdir(out))if(file.endsWith('.png')){
 const bytes=await readFile(join(out,file));captures.push({file,width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),sha256:sha(bytes)});
}
const before=captures.find(c=>c.file==='before-mike.png'),after=captures.find(c=>c.file==='mike.png');
if(before.width!==after.width||before.height!==after.height)throw Error('Comparison must retain its rectangle');
const layouts=JSON.parse(await readFile(join(out,'layout.json'),'utf8'));
function rect(value){const n=value.match(/-?\d+(?:\.\d+)?/g).map(Number);return{x:n[0],y:n[1],w:n[2],h:n[3]};}
const geometry=[];
for(const name of ['mia.png','maria.png','mike.png','compact.png','wide.png','dynamic-state.png','dynamic-compact.png']){
 const l=layouts[name],box=rect(l.body);
 for(const key of ['SummarySkills','SummaryMagic','SummaryTraits']){const r=rect(l[key]);if(r.y<box.y-.1||r.y+r.h>box.y+box.h+.1)throw Error('Lower section clipped '+name+' '+key);}
 if(l.general_scroll!==0)throw Error('Unexpected general summary scroll '+name);
 geometry.push({file:name,lowerPanelsVisible:true,generalScroll:l.general_scroll});
}
const saved=[];
for(const folder of ['source-before','iterations'])for(const file of await readdir(join(out,folder))){const bytes=await readFile(join(out,folder,file));saved.push({file:folder+'/'+file,sha256:sha(bytes)});}
const manifest=JSON.parse(await readFile(join(source,'asset-manifest.json'),'utf8'));
const originals={date:'2026-11-17',engine:'Godot 4.7.2 Forward+',conditions:{scene:'Pecio main.tscn, initial camera',actor:'Mike',role:'player',clock:'Día 1, 12:00, paused',weather:'clear',resolution:[1600,900],before:'V4 mike.png copied unchanged',reference:'User infographic, separate artistic study; never treated as an exact screenshot overlay',animation:'Idle, fire and water phases may differ. Camera, resolution and initial scene are preserved.',isolation:'runtime/sheet-review-appdata; no live campaign saves modified',sizes:'All five tabs captured at 1366×768, 1600×900 and 1920×1080'},captures,saved,assets:manifest.assets};
const passed=tests.reduce((n,t)=>n+t.passed,0);
await writeFile(join(out,'originals.json'),JSON.stringify(originals,null,2)+'\n');
await writeFile(join(out,'validation.json'),JSON.stringify({date:'2026-11-17',passed,failed:0,tests,pipeline:{valid:pipeline.valid,revision:pipeline.revision,definitions:pipeline.definitions,warnings:pipeline.warnings},geometry,physicalDevices:'not tested',userArtAcceptance:'pending'},null,2)+'\n');
await writeFile(join(out,'twelve-improvements.json'),JSON.stringify(checklist,null,2)+'\n');
const views=[['mike.png','Resumen · Mike'],['combat.png','Combate'],['spells.png','Conjuros'],['inventory.png','Inventario'],['history.png','Historia'],['mia.png','Resumen · Mia'],['maria.png','Resumen · Trinity'],['compact.png','1366 · Resumen'],...['combat','spells','inventory','history'].map(p=>['compact-'+p+'.png','1366 · '+p]),['wide.png','1920 · Resumen'],...['combat','spells','inventory','history'].map(p=>['wide-'+p+'.png','1920 · '+p]),['dynamic-state.png','PG, estados y reservas'],['dynamic-compact.png','Estados · 1366'],['inventory-equipped.png','Equipo tras cerrar'],['independent-backpack.png','Mochila externa'],['dm.png','Consulta privada DM'],['action.png','Detalle de acción']];
const css='*{box-sizing:border-box}body{margin:0;background:#171612;color:#eee2cc;font:17px/1.55 Georgia,serif}main{max-width:1720px;margin:auto;padding:30px 24px}h1,h2{color:#e6c581;font-weight:400}h1{font-size:36px;margin:0}p{max-width:1220px}a{color:#f0cc86}nav{display:flex;flex-wrap:wrap;gap:7px;margin:20px 0 12px}button,select{font:16px Georgia;padding:8px 12px;background:#493023;color:#f4e5c8;border:1px solid #96743d;cursor:pointer}button[aria-pressed=true]{background:#642f32;border-color:#e5bd6a}button:focus-visible{outline:3px solid white}.viewer{border:1px solid #896b43;background:#100e0c}.viewer img{display:block;width:100%;height:auto}.caption{padding:8px 14px;margin:0;background:#493023}.note{color:#c7b79a}.reference{display:grid;grid-template-columns:1.2fr 1fr;gap:20px}.reference figure{margin:0}.reference img{width:100%;height:auto}table{border-collapse:collapse;width:100%;font-size:16px}td,th{text-align:left;vertical-align:top;padding:9px;border-bottom:1px solid #6e5936}td:nth-child(3){white-space:nowrap}.partial{color:#f1cb78}@media(max-width:800px){main{padding:20px 12px}.reference{grid-template-columns:1fr}table{font-size:14px}}';
const html=[
 '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Ficha de personaje · doce mejoras</title><style>'+css+'</style><main><small>DUNGEONS · GODOT NATIVO · 17/11/2026</small><h1>La ficha como un libro de aventuras</h1>',
 '<p>Refinamiento sobre la ficha existente: Resumen, Combate, Conjuros, Inventario e Historia. Retrato mayor, pergamino con fibras, talla jerarquizada, salud borgoña, escudo numérico, iconos específicos y personaje vivo dentro de un arco real.</p>',
 '<nav aria-label="Las cinco pestañas">'+views.slice(0,5).map(([file,title],i)=>'<button data-view="'+file+'" aria-pressed="'+(i===0)+'">'+title+'</button>').join('')+'</nav><label for="extra">Otros personajes, tamaños y estados </label><select id="extra"><option value="">Selecciona una captura</option>'+views.slice(5).map(([f,t])=>'<option value="'+f+'">'+esc(t)+'</option>').join('')+'</select>',
 '<div class="viewer"><img id="native" src="mike.png" alt="Resumen actual de Mike en Godot"><p class="caption" id="caption">Resumen · Mike · 1600 × 900</p></div>',
 '<p>'+views.slice(0,5).map(([f,t])=>'<a href="'+f+'">'+esc(t)+'</a>').join(' · ')+'</p>',
 '<h2>Antes y después de esta pasada</h2><p class="note">Misma escena inicial, cámara, personaje, hora y resolución. Pulsa o toca para superponer el resultado en el mismo rectángulo; otro clic vuelve al antes. Admite teclado y ampliación conservando zoom y desplazamiento. Las fases de reposo, fuego y mar pueden variar.</p>',
 visualComparison({before:'before-mike.png',after:'mike.png',title:'Mike · V4 → refinamiento de las doce mejoras',width:1600,height:900}),
 '<h2>Contraste con la guía</h2><div class="reference"><figure><figcaption>Resultado real integrado en Godot</figcaption><img src="mike.png" alt="Implementación actual"></figure><figure><figcaption>Guía del usuario: objetivo artístico, sin copiar datos</figcaption><img src="reference.png" alt="Guía comparativa de personaje fantástico"></figure></div>',
 '<h2>Las doce mejoras</h2><table><thead><tr><th>N.º</th><th>Área</th><th>Estado</th><th>Resultado y límite</th></tr></thead><tbody>'+checklist.map(c=>'<tr><td>'+c.id+'</td><td>'+c.name+'</td><td class="'+(c.status==='Parcial'?'partial':'')+'">'+c.status+'</td><td>'+c.result+'</td></tr>').join('')+'</tbody></table>',
 '<h2>Datos y funcionamiento</h2><p>Los valores proceden del actor y del combate existentes. No se copia el ejemplo de la infografía. Misil mágico usa un único nombre; la competencia explícita en Percepción del alto elfo llega a habilidades con su procedencia. Competencias y preparación ausentes permanecen sin registrar. CD, curación, impactos sin d20, concentración y espacios usan los campos reales.</p>',
 '<p>El visor refleja sprites, materiales, transformaciones, estados, luces y partículas del personaje original. La máscara recorta la ventana de presentación; no sustituye el cuerpo ni superpone otra armadura. Conserva los perfiles anatómicos y atlas registrados. El inventario usa la misma instancia y sesión; las acciones empiezan al cerrar.</p>',
 '<h2>Comprobaciones de esta candidata</h2><table><tr><th>Suite</th><th>Proyecto</th><th>Correctas</th><th>Fallos</th></tr>'+tests.map(t=>'<tr><td>'+t.suite+'</td><td>'+t.project+'</td><td>'+t.passed+'</td><td>'+t.failed+'</td></tr>').join('')+'</table><p><strong>'+passed+' comprobaciones actuales, cero fallos.</strong> Las cinco pestañas tienen capturas en las tres resoluciones solicitadas. Incluye personajes de distinta estatura, fichas extensas, PG temporales, reservas, edición, dados físicos, inventario compartido y privacidad del DM.</p>',
 '<p class="note">Revisadas visualmente las capturas nativas. Los tres bloques inferiores del Resumen siguen visibles sin desplazamiento general a 1600 × 900; listas largas y páginas extensas usan desplazamiento interior. Validación estructural del pipeline sin errores; conserva las limitaciones de los cuerpos históricos. La aceptación artística del usuario, dispositivos físicos, sincronización completa de campaña y consumo/transferencia nativos quedan diferenciados. El informe HTML usa el comparador común; su interacción no se ha revalidado en un navegador en esta sesión.</p>',
 '<p><a href="originals.json">Originales, fases y hashes</a> · <a href="validation.json">Resultados actuales</a> · <a href="layout.json">Medidas nativas</a> · <a href="twelve-improvements.json">Doce estados</a> · <a href="../../docs/evidence/GODOT_CHARACTER_SHEET_20261116.md">Auditoría y archivos modificados</a> · <a href="../../prototypes/godot-shared/character_sheet/art/v5/sources.json">Arte, prompts y procedencia</a></p></main>',
 visualComparisonAssets(),
 '<script>const names='+JSON.stringify(Object.fromEntries(views))+';function show(file){if(!file)return;for(const b of document.querySelectorAll("[data-view]"))b.setAttribute("aria-pressed",String(b.dataset.view===file));document.querySelector("#native").src=file;document.querySelector("#native").alt=names[file]+" · captura real de Godot";document.querySelector("#caption").textContent=names[file];}for(const b of document.querySelectorAll("[data-view]"))b.addEventListener("click",()=>show(b.dataset.view));document.querySelector("#extra").addEventListener("change",e=>show(e.target.value));</script></html>'
].join('\n');
await writeFile(join(out,'index.html'),html);
let scripts=0;for(const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g)){new Script(m[1]);scripts++;}
const links=new Set([...html.matchAll(/(?:href|src)="([^"]+)"/g)].map(m=>m[1]).filter(s=>!s.startsWith('#')&&!/^https?:/.test(s)));
for(const link of links)await access(resolve(out,link));
let copies=0;async function files(folder){const result=[];for(const entry of await readdir(folder,{withFileTypes:true})){const path=join(folder,entry.name);if(entry.isDirectory())result.push(...await files(path));else if(!path.endsWith('.uid')&&!path.endsWith('.import'))result.push(path);}return result;}
for(const file of await files(source))for(const project of ['pecio','retiro','campamentos']){const copy=join(root,'prototypes/godot-'+project,'character_sheet',relative(source,file));if(sha(await readFile(file))!==sha(await readFile(copy)))throw Error('Stale installed resource '+copy);copies++;}
for(const name of ['backpack_panel.gd','inventory_bridge.gd'])for(const project of ['pecio','retiro','campamentos'])if(sha(await readFile(join(root,'prototypes/godot-shared/inventory',name)))!==sha(await readFile(join(root,'prototypes/godot-'+project,'inventory',name))))throw Error('Stale inventory '+project);
await writeFile(join(out,'review-checks.json'),JSON.stringify({scriptsParsed:scripts,localLinks:links.size,installedResourcesCompared:copies,comparisonDimensions:[before.width,before.height],nativeCaptures:captures.length-2,geometryChecks:geometry.length,pipelineValid:true},null,2)+'\n');
console.log(JSON.stringify({report:join(out,'index.html'),passed,failed:0,captures:captures.length-2,art:manifest.assets.length,checklist:checklist.length}));
