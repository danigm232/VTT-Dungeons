import {readFile,writeFile,readdir,mkdir,copyFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {visualComparison,visualComparisonAssets} from './lib/visual-comparison.mjs';

const root=resolve(import.meta.dirname,'..');
const output=join(root,'output/godot-character-sheet-v2-20261116');
const module=join(root,'prototypes/godot-shared/character_sheet');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const imageInfo=async file=>{
 const bytes=await readFile(join(output,file));
 return {file,width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),sha256:sha(bytes)};
};
const captures=[];
for(const file of await readdir(output))if(file.endsWith('.png'))captures.push(await imageInfo(file));
const before=captures.find(c=>c.file==='before.png'),after=captures.find(c=>c.file==='mia.png');
if(before.width!==after.width||before.height!==after.height)throw Error('Comparison dimensions differ');
const source=JSON.parse(await readFile(join(module,'art-sources.json'),'utf8'));
source.font_resources=[];
for(const file of source.extensions||[]){
 const extension=JSON.parse(await readFile(join(module,file),'utf8'));
 source.assets.push(...extension.assets);source.font_resources.push(...extension.fonts);source.code_resources=[...(source.code_resources||[]),...(extension.code_resources||[])];
}
for(const asset of source.assets){
 const bytes=await readFile(join(module,asset.file));
 Object.assign(asset,{width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),sha256:sha(bytes)});
}
for(const font of source.font_resources){
 const bytes=await readFile(join(module,font.file)),license=await readFile(join(module,font.license_file));
 Object.assign(font,{bytes:bytes.length,sha256:sha(bytes),license_sha256:sha(license)});
}
await writeFile(join(module,'asset-manifest.json'),JSON.stringify(source,null,2)+'\n');
const savedSources=[];
for(const file of await readdir(join(output,'source-before'))){
 const bytes=await readFile(join(output,'source-before',file));savedSources.push({file:'source-before/'+file,sha256:sha(bytes)});
}
await writeFile(join(output,'originals.json'),JSON.stringify({date:'2026-11-16',engine:'Godot 4.7.2 Forward+',conditions:{scene:'Pecio C1, main.tscn',actor:'mia',role:'player',clock:'Day 1, 12:00',weather:'clear',clock_running:false,comparison_resolution:[before.width,before.height],baseline:'Previously delivered pecio-native.png, copied unchanged. Same camera, scene, actor, time and weather; idle/flame/water phases can differ.',excluded_pair:'before-backpack.png is 1600x1000: documentary only, never overlaid on the 1600x900 candidate.'},captures,source_before:savedSources},null,2)+'\n');
const tests=[];
for(const project of ['pecio','retiro','campamentos']){
 const log=await readFile(join(output,'test-'+project+'.log'),'utf8');
 const match=log.match(/CHARACTER SHEET TEST (\{[^\n]+\})/);
 if(!match)throw Error('Missing sheet result: '+project);
 tests.push({suite:'character_sheet',project,...JSON.parse(match[1])});
}
for(const [file,project,suite,pattern] of [
 ['backpack-pecio.log','pecio','backpack',/BACKPACK (\d+) PASS \/ (\d+) FAIL/],
 ['backpack-retiro.log','retiro','backpack',/BACKPACK (\d+) PASS \/ (\d+) FAIL/],
 ['interfaces.log','pecio','interfaces',/VTT INTERFACES TESTS: (\d+) PASS \/ (\d+) FAIL/]
]){
 const log=await readFile(join(output,file),'utf8'),match=log.match(pattern);
 if(!match)throw Error('Missing regression result: '+file);
 tests.push({suite,project,passed:Number(match[1]),failed:Number(match[2])});
}
if(tests.some(t=>t.failed))throw Error('Cannot publish a passing review with failing tests');
await writeFile(join(output,'validation.json'),JSON.stringify({date:'2026-11-16',tests,review:{native_captures:'Inspected locally',browser_interaction:'Not reverified in this revision',physical_devices:'Not tested',user_artistic_acceptance:'Pending'}},null,2)+'\n');
await mkdir(join(output,'references'),{recursive:true});
await copyFile('C:/Users/User/Downloads/Imagen de ChatGPT 16 nov 2026, 12_49_24-1.png',join(output,'references/art-reference.png'));
const views=[['mia.png','Mia'],['maria.png','Trinity'],['mike.png','Mike'],['backpack.png','Mochila'],['combat.png','Combate'],['spells.png','Conjuros'],['history.png','Historia'],['edit.png','Editar'],['dm.png','Desde el DM'],['compact.png','1280 × 720'],['wide.png','1920 × 1080']];
await writeFile(join(output,'index.html'),`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Ficha RPG · segunda revisión</title><style>body{margin:0;background:#211a16;color:#f4e5c8;font:17px/1.6 Georgia,serif}main{max-width:1560px;margin:auto;padding:30px 24px}h1,h2{color:#dcbb78;font-weight:400}h1{font-size:36px;margin:0}p{max-width:1100px}a{color:#e7c785}nav{display:flex;flex-wrap:wrap;gap:8px;margin:24px 0 14px}nav button{font:16px Georgia;padding:9px 14px;background:#493023;color:#f4e5c8;border:1px solid #96743d;cursor:pointer}nav button[aria-pressed=true]{background:#642f32;border-color:#e5bd6a}nav button:focus-visible{outline:3px solid white}.viewer{background:#100e0c;border:1px solid #896b43}.viewer img{display:block;width:100%;height:auto}.caption{padding:8px 14px;margin:0;background:#493023}small,.note{color:#c6b797}details{margin:24px 0}summary{cursor:pointer;color:#e7c785}.reference{max-width:900px;width:100%}@media(max-width:800px){main{padding:20px 12px}}</style><main><small>DUNGEONS · GODOT NATIVO · 16/11/2026</small><h1>Una ficha más recogida y personal</h1><p>El juego sigue visible alrededor. Mochila, ficha y acciones comparten ventana, materiales y navegación; el contenido largo se desplaza dentro. Los retratos y las plataformas son propios de cada personaje, mientras el visor conserva su sprite real, sus estados y su animación.</p><nav aria-label="Capturas reales">${views.map(([file,title],i)=>`<button data-view="${file}" aria-pressed="${i===0}">${title}</button>`).join('')}</nav><div class="viewer"><img id="native" src="mia.png" alt="Ficha actual de Mia en Godot"><p class="caption" id="caption">Mia</p></div><h2>Comparación con la entrega anterior</h2><p class="note">1600 × 900, misma cámara, escena, personaje, hora y clima. Pulsa para alternar en el mismo rectángulo. La ampliación conserva zoom y desplazamiento. Las fases del reposo, agua y fuego pueden variar.</p>${visualComparison({before:'before.png',after:'mia.png',title:'Ficha entregada → ventana compacta con retrato y plataforma personal',width:before.width,height:before.height})}<h2>Los ocho ajustes</h2><ul><li>Ventana limitada al 82 % de la pantalla, con ancho máximo 1180 y velo exterior suave.</li><li>Mochila integrada como pestaña, reutilizando el inventario existente y sus cantidades. Cambiar de pestaña conserva las acciones preparadas; cerrar la ficha empieza las animaciones.</li><li>Retrato circular, nivel separado, cartelas borgoña y marcos de hojas talladas inspirados en la referencia.</li><li>Mia: capilla y piedra con destellos cálidos. Trinity: calle y adoquines con hojas. Mike: biblioteca y piedra azul con luces arcanas. Son motivos decorativos, sin añadir lugares o hechos a la campaña.</li><li>Tres retratos nuevos ligados a la apariencia actual, también usados por las tarjetas del DM y la selección de personaje.</li><li>24 ilustraciones adicionales para mochila, armas, equipo y magia, además del atlas anterior.</li><li>Cinzel para títulos y Crimson Pro para lectura, incluidas con licencia OFL y soporte de acentos.</li><li>Cenefas propias, esquinas preservadas y separaciones que evitan tapar texto con los adornos.</li></ul><h2>Validación de esta candidata</h2><p>${tests.map(t=>`${t.suite} · ${t.project}: ${t.passed} correctas / ${t.failed} fallos`).join('<br>')}</p><p class="note">Capturas del motor revisadas. HTML y enlaces locales comprobados; interacción del visor en navegador no revalidada en esta revisión. Aceptación artística del usuario y pruebas con dispositivos físicos pendientes. Las competencias y descripciones que faltan en las fuentes siguen sin inventarse.</p><details><summary>Referencia aportada por el usuario</summary><p class="note">Solo estudio visual. No se integra esta captura como recurso del juego ni se presenta como un antes equivalente.</p><img class="reference" src="references/art-reference.png" alt="Referencia RPG aportada por el usuario"></details><p><a href="originals.json">Originales y condiciones</a> · <a href="validation.json">Pruebas</a> · <a href="../../docs/evidence/GODOT_CHARACTER_SHEET_20261116.md">Archivos y límites</a> · <a href="../../prototypes/godot-shared/character_sheet/asset-manifest.json">Recursos, fuentes, prompts y hashes</a></p></main>${visualComparisonAssets()}<script>for(const b of document.querySelectorAll('[data-view]'))b.addEventListener('click',()=>{for(const other of document.querySelectorAll('[data-view]'))other.setAttribute('aria-pressed',String(other===b));document.querySelector('#native').src=b.dataset.view;document.querySelector('#native').alt=b.textContent+' · captura real de Godot';document.querySelector('#caption').textContent=b.textContent;});</script></html>`);
console.log(JSON.stringify({captures:captures.length,art_assets:source.assets.length,fonts:source.font_resources.length,tests,report:join(output,'index.html')}));
