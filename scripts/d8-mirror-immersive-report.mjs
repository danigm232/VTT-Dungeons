import {readFile,writeFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const dir='output/d8-mirror-immersive-20261020';
const json=async name=>JSON.parse(await readFile(`${dir}/${name}.json`,'utf8'));
const [tests,cameraTests,motion,matrix,extras,cleanup,exit,stages,checkpoint,audio,gameplay,fixtures]=await Promise.all(['tests','tests-camera','candidate-camera-motion','candidate-matrix','candidate-extras','candidate-cleanup','candidate-exit','candidate-exit-stages','candidate-checkpoint','candidate-cave-audio','gameplay-invariants','exit-fixtures'].map(json));
for(const test of [tests,cameraTests]){assert.equal(test.numFailedTests,0);assert(test.success);}
for(const evidence of [motion,matrix,extras,cleanup,exit,checkpoint,audio])assert.deepEqual(evidence.errors,[]);
const baseline=await json('baseline-checkpoint');
for(let i=0;i<checkpoint.rows.length;i++){
 const a=baseline.rows[i],b=checkpoint.rows[i];assert.equal(a.tilt,b.tilt);assert.equal(a.orientation,b.orientation);assert.equal(a.zoom,b.zoom);assert(Math.abs(a.pose.halfHeight-b.pose.halfHeight)<.001);
 for(const axis of ['x','y','z'])assert(Math.abs(a.pose.target[axis]-b.pose.target[axis])<.001);
}
assert.equal(matrix.rows.length,160);assert.equal(extras.rows.length,16);assert.equal(cleanup.samples.length,3);
assert(matrix.rows.every(r=>r.ready));assert(extras.rows.every(r=>r.ready));
assert(extras.rows.filter(r=>r.w<600||r.h<600).every(r=>r.presentation.mirror.art.mist.enabled===4));
const hero=a=>a.actors.find(e=>e.id==='maria');
assert(matrix.rows.every(r=>hero(r)?.onScreen&&hero(r)?.rendered));
const empty=await json('candidate-empty-table');assert.deepEqual(empty.errors,[]);assert(empty.audit.ready);assert.equal(empty.audit.actors.length,0);
assert(motion.samples.length>=200);assert(motion.samples.every(a=>a.ready&&hero(a)?.onScreen&&hero(a)?.rendered));
assert.equal(exit.arrival.scene,'dinner');assert.equal(stages.departureSamples.length,5);
const departure=stages.departureSamples.map(a=>({z:hero(a).world.z,screen:hero(a).screen,onScreen:hero(a).onScreen,pose:a.pose}));
assert(departure.every(s=>s.onScreen));assert(Math.abs(departure.at(-1).z+16.5)<.01);
for(let i=1;i<departure.length;i++)assert(departure[i-1].z-departure[i].z>1.2&&departure[i-1].z-departure[i].z<1.8);
const walk=fixtures.departure.entities.find(e=>e.id==='maria').step;
assert.equal(walk.movementKind,'passage');assert.equal(walk.durationMs,5000);assert.equal(walk.passage.points.length,6);
assert.equal(walk.passage.points[0].z-walk.passage.points[5].z,7.5);
assert(audio.unlocked&&audio.contextState==='running');assert.deepEqual(audio.intervalSeconds,[32,58]);
assert(audio.events.some(e=>e.id.startsWith('d8-mirror-drop-')&&e.atMs>=32000&&e.atMs<=59000));
assert(gameplay.pass);assert.equal(gameplay.walkable,399);assert.equal(gameplay.difficult,344);assert.equal(gameplay.hazards,49);
assert.match(await readFile(`${dir}/integration.txt`,'utf8'),/D8 integration PASS/);
const clean=cleanup.samples.map(s=>({meshes:s.costs.meshes,textures:s.costs.textures,textureMiB:s.costs.textureMiBEstimate,drawCalls:s.costs.drawCalls}));
assert(clean.every(c=>c.meshes===clean[0].meshes&&c.textures===clean[0].textures&&Math.abs(c.textureMiB-clean[0].textureMiB)<.01));
const costs=extras.rows.filter(r=>r.costs).map(r=>r.costs);
const sources=['apps/web/world.ts','apps/web/audio.ts','campaigns/one-shot/playground/mirror-art-direction.ts','campaigns/one-shot/playground/mirror-cave-layout.ts','campaigns/one-shot/public/pack.ts','campaigns/one-shot/server.ts','engine/shared/protocol.ts','engine/server/campaign.ts','engine/server/game.ts','engine/client/passage-walk.ts','scripts/generate-mirror-cave-audio.mjs','scripts/d8-mirror-review.ts','scripts/d8-combat-integration.mjs'];
const hashes=Object.fromEntries(await Promise.all(sources.map(async path=>[path,createHash('sha256').update(await readFile(path)).digest('hex')])));
const summary={at:new Date().toISOString(),tests:tests.numPassedTests+cameraTests.numPassedTests,testFiles:tests.testResults.length+cameraTests.testResults.length,camera:{views:matrix.rows.length,samples:motion.samples.length,durationMs:motion.durationMs,serverFrames:motion.serverFrames,offscreen:0,unready:0,errors:0},profiles:extras.rows.length,gameplay:{cells:399,difficult:344,hazards:49},departure:{durationMs:5000,metres:7.5,gridSteps:5,samples:departure},audio,cleanup:clean,drawCalls:[Math.min(...costs.map(r=>r.drawCalls)),Math.max(...costs.map(r=>r.drawCalls))],textureMiB:[Math.min(...costs.map(r=>r.textureMiBEstimate)),Math.max(...costs.map(r=>r.textureMiBEstimate))],hashes,limits:['Browser size simulations are not physical Pixel/projector tests.','Audio recording verifies playback and scheduling, not listening with table voices.','No new 20-minute soak or physical FPS certification.','Art approval and physical performance remain pending.','Normal distribution and real saves untouched; no GitHub publication.']};
if(summary.textureMiB[1]>80)summary.limits.push('1080p texture estimate exceeds the indicative 80 MiB budget.');
await writeFile(`${dir}/summary.json`,JSON.stringify(summary,null,2));
const image=(name,alt)=>`<a href="${name}"><img loading="lazy" src="${name}" alt="${alt}"></a>`;
const html=`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Espejo · bruma, sonido y salida</title>
<style>*{box-sizing:border-box}body{margin:0;background:#0d1924;color:#e2edf2;font:16px/1.55 system-ui}main{max-width:1400px;margin:auto;padding:24px}h1{font-size:32px;margin:0}h2{margin-top:40px}a{color:#bce9ff}img,video{max-width:100%;height:auto;display:block;border-radius:8px}audio{width:100%}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}.strides{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}figure{margin:0;background:#132737;padding:12px;border-radius:10px}figcaption,small{color:#b2cbd8}p{max-width:1050px}nav{display:flex;gap:20px;flex-wrap:wrap;margin:20px 0}details{margin:16px 0;padding:12px;background:#132737}summary{cursor:pointer}.badge{background:#203d50;padding:8px 12px;border-radius:10px;display:inline-block}@media(max-width:750px){.pair{grid-template-columns:1fr}.strides{grid-template-columns:1fr 1fr}main{padding:15px}}</style>
<main><h1>Espejo · bruma, sonido y salida</h1><p>Bruma baja visible y localizada, gotas espaciadas y un recorrido de cinco casillas hacia el fondo antes de llegar a la cena con Anteros. Revisión iniciada el 20 y cerrada el 21/10/2026.</p>
<nav><a href="http://127.0.0.1:59950/dm">Abrir candidata</a><a href="http://127.0.0.1:59950/player">Jugador</a><a href="http://127.0.0.1:59950/projector">Proyector</a><a href="summary.json">Medidas y límites</a></nav>
<p class="badge">${summary.tests} pruebas · ${summary.camera.views} vistas · ${summary.camera.samples} muestras en movimiento · sin pérdida del jugador</p>
<h2>Bruma junto al hielo</h2><p>Antes y después con la misma cámara de referencia, 15° y zoom medio. Dos capas cruzadas por bolsa evitan que la bruma desaparezca al inclinar. En móvil se mantienen las dos bolsas más cercanas; en combate baja la intensidad y movimiento reducido inmoviliza la deriva. La cuarta bolsa aparece dentro de la galería abierta.</p>
<div class="pair"><figure>${image('baseline-arrival.png','Antes: bruma casi imperceptible')}<figcaption>Base de esta revisión.</figcaption></figure><figure>${image('candidate-arrival.png','Después: bruma baja junto al jugador')}<figcaption>Bruma visible, conservando la lectura del terreno.</figcaption></figure></div>
<div class="pair"><figure>${image('candidate-relic.png','Bruma junto a la reliquia')}<figcaption>Reliquia y bolsas localizadas.</figcaption></figure><figure>${image('candidate-player-390-844.png','Perfil móvil vertical')}<figcaption>390×844 simulado, dos bolsas cercanas.</figcaption></figure></div>
<h2>Ambiente sonoro discreto</h2><p>Aire interior a 0,14 y música a 0,13. Una incidencia cada 32–58 segundos: selección ponderada 5:1 entre dos gotas y un asentamiento de hielo más tenue. No hay un goteo constante. El sistema suspende nuevas incidencias durante combate, activación, salida, silencio y cambio de mapa; conserva la salida de audio de la mesa.</p>
<audio controls preload="metadata" src="candidate-cave-audio.webm"></audio><p>Grabación real del mezclador del navegador durante 70 segundos: gota a los ${(audio.events.find(e=>e.id.startsWith('d8-mirror-drop-')).atMs/1000).toFixed(2)} s, sin errores. Audio original sintetizado en el proyecto. La mezcla física con voces y altavoces queda pendiente.</p>
<h2>Cámara durante el movimiento</h2><video controls preload="metadata" src="candidate-camera-motion.webm" poster="candidate-arrival.png"></video><p>${motion.serverFrames} estados de movimiento del servidor, con cambios entre 5°, 10°, 15°, 20° y 25° y giros admitidos. ${motion.samples.length} muestras sin pérdida del jugador ni recursos pendientes. La cámara conserva zoom y preferencias; su margen corporal estable evita pequeñas correcciones causadas por la silueta de cada fotograma y deja espacio bajo los pies en los bordes.</p>
<h2>Cinco pasos dentro de la galería</h2><video controls preload="metadata" src="candidate-exit.webm" poster="candidate-exit-open.png"></video><p>La derrota abre el hielo. Al cruzar el umbral se ven cinco segundos y 7,5 m de avance, sincronizados por el servidor. El encuadre queda en la boca de la galería y el personaje se oscurece al alejarse. La cena carga después del recorrido. No se añaden casillas tácticas al túnel ni decisiones automáticas.</p>
<div class="strides">${Array.from({length:5},(_,i)=>`<figure>${image(`candidate-exit-stride-${i+1}.png`,`Avance hacia el interior, segundo ${i+1}`)}<figcaption>${i+1} s · z=${departure[i].z.toFixed(2)} m</figcaption></figure>`).join('')}</div>
<p>La reconexión durante la marcha conserva el mismo reloj; un guardado restaurado vuelve al umbral seguro, sin repetir automáticamente la secuencia. Red real con DM, dos jugadores y proyector correcta.</p>
<details><summary>Mesa integrada · DM, jugador y proyector</summary><div class="pair"><figure>${image('integrated-dm.png','Mesa DM integrada')}<figcaption>Consola de dirección, sesión temporal.</figcaption></figure><figure>${image('integrated-player.png','Jugador integrado: bruma y exploración')}<figcaption>Jugador después de movimiento y giro.</figcaption></figure></div><figure>${image('integrated-projector.png','Vista integrada de proyector')}<figcaption>Interfaz de proyector en navegador; prueba física pendiente.</figcaption></figure></details>
<h2>Encuadres y perfiles</h2><p>Ocho zonas seguras × cuatro inclinaciones (5°, 10°, 15°, 25°) × cinco giros (−30° a +30°): 160 vistas. Cuatro horas y doce combinaciones de rol/tamaño: 16 perfiles listos. El cierre volumétrico y sus pruebas geométricas anteriores se conservan.</p>
${['arrival','south-bank','north-bank','relic','encounter','east-wall','south-wall','west-wall'].map(p=>`<details><summary>20 vistas · ${p}</summary>${image(`candidate-${p}-sheet.png`,p)}</details>`).join('')}
<h2>Verificación y límites</h2><p>${summary.tests} pruebas en ${summary.testFiles} archivos, tipos y compilaciones aisladas, integración de red, guardado y restauración correctos. Conservadas 399 casillas, 344 difíciles y 49 peligrosas. Tres regresos mantienen ${clean[0].meshes} mallas, ${clean[0].textures} texturas y ${clean[0].textureMiB.toFixed(2)} MiB estimados.</p>
<p>Perfiles medidos: ${summary.drawCalls.join('–')} llamadas de dibujo y ${summary.textureMiB.map(v=>v.toFixed(2)).join('–')} MiB estimados. ${summary.textureMiB[1]>80?'La muestra de 1080p supera el presupuesto orientativo de 80 MiB; requiere ajuste o validación en el equipo objetivo.':''} Son medidas del navegador, no FPS certificados ni memoria total de GPU.</p>
<p>Pendientes: aprobación artística, escucha con voces, Pixel 9a/proyector físicos y sesión física prolongada. Esta revisión enfocada no repite la sesión automatizada de veinte minutos anterior. Distribución habitual y guardados reales conservados; sin publicación.</p><small>Reproducción: scripts/review-d8-mirror.ps1 · versión immersive.</small></main></html>`;
for(const file of new Set([...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map(m=>m[1]).filter(p=>!p.startsWith('http'))))assert((await stat(`${dir}/${file}`)).size>0,file);
await writeFile(`${dir}/index.html`,html);
console.log(JSON.stringify({...summary,hashes:undefined,departure:{durationMs:5000,metres:7.5,gridSteps:5}},null,2));
