import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {resolve,basename} from 'node:path';
import {createHash} from 'node:crypto';
import {visualComparison,visualComparisonAssets} from './lib/visual-comparison.mjs';
const root=resolve(import.meta.dirname,'..');
const input=resolve(root,'output/character-modular-20261116');
const output=resolve(root,'output/npc-sprites-20261115/modular-progress-20261116');
await mkdir(resolve(output,'images'),{recursive:true});
const catalogue=JSON.parse(await readFile(resolve(root,'prototypes/godot-shared/characters/candidate-catalogue.json'),'utf8'));
const captures=JSON.parse(await readFile(resolve(input,'modular-captures.json'),'utf8'));
const names={mike:'Mike',anteros:'Anteros',cow:'Vaca de Margaret'};
const examples=[['base','Sin estado'],...Object.entries(catalogue.overlays).map(([id,d])=>[id,d.name]),...Object.entries(catalogue.bindings).map(([id,d])=>[id,d.name])];
const originals=[];
for(const id of Object.keys(names))for(const [effect]of examples){
 const file=id+'-'+effect+'.png',bytes=await readFile(resolve(input,file));
 await copyFile(resolve(input,file),resolve(output,'images',file));
 const metadata=captures.find(c=>c.file===file);
 originals.push({file:'images/'+file,source:'output/character-modular-20261116/'+file,sha256:createHash('sha256').update(bytes).digest('hex'),width:1280,height:720,metadata});
}
await copyFile(resolve(input,'inspector-proof.png'),resolve(output,'images/inspector-proof.png'));
const data={version:1,date:'2026-11-16',revision:catalogue.revision,scope:'Native review stage: three source characters. Not a capture of a campaign map or a finished art delivery.',names,examples,originals};
await writeFile(resolve(output,'originals.json'),JSON.stringify(data,null,2)+'\n');
const html=`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Personajes · avance real y límites</title><style>
:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#101b20;color:#e8e4d8;font:16px/1.6 system-ui}main{max-width:1100px;margin:auto;padding:28px 22px 70px}h1,h2{font-family:Georgia,serif;color:#e7c98d;line-height:1.2}h1{font-size:32px}h2{margin-top:34px;font-size:24px}p{max-width:78ch}a{color:#b6d9e0}label{display:inline-flex;flex-direction:column;gap:6px;margin:0 18px 12px 0}select,button{font:inherit;padding:9px 12px;border:1px solid #73817d;background:#1d3035;color:#f2eddd;border-radius:4px}.notice{padding:16px 20px;background:#382b24;border-left:4px solid #d6a66c}.limits{background:#1b2a2e;padding:18px 22px}table{width:100%;border-collapse:collapse;font-size:15px}td,th{text-align:left;padding:11px;border-bottom:1px solid #405153;vertical-align:top}th{color:#e7c98d}details{margin:18px 0}summary{cursor:pointer;color:#e7c98d}img{max-width:100%;height:auto}.caption{font-size:14px;color:#b9c7c5}.revision{font-size:12px;overflow-wrap:anywhere;color:#98a9aa}.vtt-comparison-stage{max-height:none}.vtt-comparison figcaption{font-family:Georgia,serif;font-size:21px}
</style><main>
<h1>Lo que hay ahora</h1><p class="notice"><strong>Prototipo en revisión. El acabado visual no está conseguido.</strong> Las raíces parecen cuerdas y algunos estados dependen demasiado del contorno o la desaturación. La ropa y el equipo nuevos quedan aplazados por petición del usuario.</p>
<p>Estas son capturas reales de Godot en el banco de personajes. Puedes elegir un estado y alternar entre el mismo personaje sin el efecto y con él. No es una comparación entre dos versiones del juego.</p>
<label>Personaje<select id="actor">${Object.entries(names).map(([id,name])=>`<option value="${id}">${name}</option>`).join('')}</select></label>
<label>Estado o sujeción<select id="effect">${examples.map(([id,name])=>`<option value="${id}" ${id==='poisoned'?'selected':''}>${name}</option>`).join('')}</select></label>
${visualComparison({before:'images/mike-base.png',after:'images/mike-poisoned.png',title:'Mike · sin estado / Envenenado',width:1280,height:720})}
<p id="assessment" class="limits"></p>
<h2>Qué se ha implementado</h2>
<table><thead><tr><th>Fase</th><th>Resultado comprobable</th><th>Estado</th></tr></thead><tbody>
<tr><td>1 · Auditoría</td><td>Inventario de 5.898 imágenes relacionadas; 37 atlas y 2.368 fotogramas. Conserva los originales y clasifica cuerpos con equipo ya pintado.</td><td>Inventario ejecutado; revisión artística por muestras.</td></tr>
<tr><td>2 · Arquitectura</td><td>Sprites existentes dentro del mundo 3D; seis anatomías, anclajes relativos y correcciones por fotograma. Once adaptadores de personajes/criaturas.</td><td>Implementada; los anclajes de plantilla no certifican cada pose.</td></tr>
<tr><td>3–4 · Estados</td><td>17 tratamientos corporales y seis sujeciones físicas. La máscara usa el fotograma actual; controles de intensidad y causa visual de restricción.</td><td>Funcionan como prototipos. Calidad visual pendiente.</td></tr>
<tr><td>5 · Vestimenta</td><td>Pruebas anteriores conservadas fuera del equipo disponible en partida.</td><td>Aplazada por el usuario.</td></tr>
<tr><td>6–7 · Herramientas</td><td>Definiciones, plantillas, importador, validadores, visor y edición de anclajes. 14 pruebas de validación superadas. El menú del editor está creado; falta comprobar su manejo completo.</td><td>Herramientas ejecutables; no equivale a arte aprobado.</td></tr>
<tr><td>8–9 · Integración</td><td>Adaptadores existentes; piloto Mike, Anteros y vaca. Variante de muestra reutilizando un efecto. Guardado local probado en Retiro y campamentos: 21 comprobaciones sin fallos en cada mapa.</td><td>Recorrido parcial. La adaptación artística de toda la biblioteca sigue abierta.</td></tr>
<tr><td>10 · Calidad</td><td>4.951 comprobaciones nativas en la revisión actual. Prueba gráfica anterior: 152 comprobaciones. Prueba de apariencia por localhost anterior: 28. No acreditan multijugador completo.</td><td>Pruebas técnicas separadas de aceptación visual.</td></tr>
<tr><td>11 · Aceptación</td><td>No se ha promovido esta candidata a biblioteca revisada ni se declara calidad final.</td><td>Abierta.</td></tr>
</tbody></table>
<h2>Qué sigue sin estar bien</h2><ul><li>Raíces y algunos vínculos tienen aspecto de cuerdas o piezas superpuestas.</li><li>Veneno y piedra necesitan un acabado más convincente y menos uniforme.</li><li>Los estados pequeños de cabeza necesitan más lectura a distancia de juego.</li><li>Falta la revisión artística de todos los fotogramas y anatomías; hay correcciones de plantilla pendientes.</li></ul>
<h2>Visor que se ha construido</h2><p>Permite seleccionar personaje, animación, dirección, fotograma y zoom; mostrar y arrastrar anclajes; aplicar estados y comparar con el dibujo original. La captura es una prueba del visor, no una entrega de arte final.</p><details><summary>Ver la captura del visor</summary><img src="images/inspector-proof.png" alt="Visor nativo de personajes con anclajes y controles"><p class="caption">Captura del visor anterior a la última revisión del catálogo.</p></details>
<p><a href="originals.json">Originales, hashes y condiciones de captura</a></p><p class="revision">Revisión de la candidata: ${catalogue.revision}</p>
</main>${visualComparisonAssets()}<script>
const names=${JSON.stringify(names)},labels=Object.fromEntries(${JSON.stringify(examples)});
const notes={poisoned:'No está acabado: el contorno verde domina demasiado y la toxicidad parece dibujada encima.',petrified:'No está acabado: la desaturación y las grietas existen, pero falta una apariencia mineral más convincente.',roots:'No está acabado: las ramas siguen pareciendo cuerdas. El ajuste de anclajes mejora su posición; no resuelve el acabado.',webs:'No está acabado: la red es demasiado fina en algunas vistas y pierde lectura.',chains:'Prototipo de eslabones con profundidad. El ajuste a brazos y torso necesita revisión por pose.','spectral-grasp':'Prototipo de manos procedurales; la forma y el agarre no tienen todavía la calidad necesaria.'};
const actor=document.querySelector('#actor'),effect=document.querySelector('#effect'),figure=document.querySelector('[data-vtt-comparison]');
function update(){if(figure.dataset.after==='true')figure.querySelector('[data-compare-toggle]').click();const id=actor.value,state=effect.value,title=names[id]+' · sin estado / '+labels[state];figure.dataset.title=title;figure.querySelector('figcaption').textContent=title;const imgs=figure.querySelectorAll('.vtt-comparison-stage img');imgs[0].src='images/'+id+'-base.png';imgs[1].src='images/'+id+'-'+state+'.png';imgs[0].alt=names[id]+' sin estado';imgs[1].alt=names[id]+' con '+labels[state];const links=figure.querySelectorAll('.vtt-comparison-controls a');links[0].href=imgs[0].src;links[1].href=imgs[1].src;document.querySelector('#assessment').textContent=notes[state]||'Muestra técnica de un estado. Tiene seguimiento de silueta, pero la revisión artística y de todas las poses sigue pendiente.';}
actor.addEventListener('change',update);effect.addEventListener('change',update);update();
</script></html>`;
await writeFile(resolve(output,'index.html'),html);
console.log(JSON.stringify({report:output+'/index.html',images:originals.length,revision:catalogue.revision,artisticAcceptance:'not achieved'}));
