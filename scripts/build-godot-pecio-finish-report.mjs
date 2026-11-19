import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {visualComparison} from './lib/visual-comparison.mjs';

const root=path.resolve('output/godot-pecio-layers-20261114');
const read=name=>JSON.parse(fs.readFileSync(path.join(root,name),'utf8').replace(/^\uFEFF/,''));
const profiles=[['day-clear','Día · despejado'],['dusk-clear','Atardecer · despejado'],['night-clear','Noche · despejado'],['day-rain','Día · lluvia'],['day-storm','Día · tormenta'],['day-fog','Día · bruma'],['night-storm','Noche · tormenta']];
const cameras=read('construction/cameras.json');
const envTests=read('environment-tests.json');
const regressions=read('regressions-final.json');
assert.equal(envTests.failures.length,0);
assert(regressions.length===6&&regressions.every(test=>test.exit_code===0&&test.errors===0));
const labels={overview:'Conjunto del barco','stern-breach':'Popa y acceso P16',bow:'Proa',c1:'C1 · cubierta principal',c2:'C2 · castillo de proa',c3:'C3 · castillo de popa',c4:'C4 · capitán',c5:'C5 · cocina',c6:'C6 · literas',c7:'C7 · comedor',c8:'C8 · sentina',c9:'C9 · bodega',cofa:'Cofa',dragon:'Clyssavar',remains:'Restos del marinero'};
const originals=[];
const captureResults=read('capture-results.json');
assert.equal(captureResults.length,profiles.length);
assert(captureResults.every(result=>result.exit_code===0&&result.errors===0));
assert.deepEqual(new Set(captureResults.map(result=>result.profile)),new Set(profiles.map(([profile])=>profile)));
const sourceHashes=read('capture-source-hashes.json');
const sourceProject=read('capture-source-project.json');
for(const source of sourceHashes){
 const current=fs.readFileSync(path.join(sourceProject.project,source.file));
 assert.equal(crypto.createHash('sha256').update(current).digest('hex'),source.sha256,`Capture sources changed: ${source.file}`);
}
for(const view of cameras){
 const file=`construction/${view.view}.png`;
 const bytes=fs.readFileSync(path.join(root,file));
 assert.equal(bytes.readUInt32BE(16),1280);assert.equal(bytes.readUInt32BE(20),720);
 originals.push({file,stage:'construction',sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
}
for(const [profile] of profiles){
 assert.deepEqual(read(`finish/${profile}/cameras.json`),cameras,`Cameras and actor placement: ${profile}`);
 for(const view of cameras){
  const file=`finish/${profile}/${view.view}.png`;
  const bytes=fs.readFileSync(path.join(root,file));
  assert.equal(bytes.readUInt32BE(16),1280);assert.equal(bytes.readUInt32BE(20),720);
  originals.push({file,stage:'finish',sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
 }
}
const oldInventory=read('construction/inventory.json');
const finalInventory=read('finish/day-clear/inventory.json');
// Godot assigns process-wide counters to unnamed nodes. Additional visual
// nodes change those counters, not the identity of the owning collision body.
const collisionRecords=inventory=>inventory.collisions.map(shape=>({...shape,id:shape.id.replace(/(@[A-Za-z_0-9]+)@\d+/g,'$1')}));
assert.deepEqual(collisionRecords(finalInventory),collisionRecords(oldInventory),'Finishing cannot change collision owners, shape classes or local transforms');
const captureCount=profiles.length*cameras.length;
const changes=[
 {id:'mat_bedding',owner:'pbr_material_kit.gd / interiors_builder.gd',previous:'oak atlas, tint #4b463a, normal 0.65',candidate:'linen-reused-v4.webp, 512², 0.75 UV/m, tint #aaa28a, normal 0.16, roughness 0.97',reference:'VA-03/05/06; REF-02/08'},
 {id:'Floor_* / mat_bulkhead',owner:'pbr_material_kit.gd',previous:'old_wood_floor_diff_1k, normal 0.95',candidate:'shared illustrated timber, normal 0.28, AO 0.30',reference:'VA-01/03/05; REF-07'},
 {id:'SternGallery / mat_glass',owner:'hull_builder.gd',previous:'opaque amber, permanently emissive',candidate:'tinted transparent glass, alpha 0.65, non-emissive',reference:'VA-05/11; REF-07'},
 {id:'exterior wet variants / hull / sails / prefab props',owner:'ship_environment.gd / material shaders',previous:'fixed dry appearance',candidate:'shared exterior-only clones, reversible albedo/roughness/specular and rain_wetness, dry restoration tested',reference:'VA-02/05/16; REF-07'},
 {id:'SunLight / WorldEnvironment / actor sprites',owner:'ship_environment.gd',previous:'fixed light and unshaded sprites',candidate:'day/dusk/night; rays from the sky, moderated AO/glow, scene-lit sprites and per-room light masks',reference:'VA-10/11/12; REF-01'},
 {id:'InteriorShadowBlockers / static cabin lamps / CarriedLantern',owner:'ship_environment.gd',previous:'cutaway walls stopped blocking adjacent light; several lamps had no shadows',candidate:'non-colliding shadow-only partitions; shadows and masks per room, lamps follow actors across decks and sea',reference:'VA-11/12/14; REF-01'},
 {id:'C9_* lights / C8_FloodWater / C9_WaterSurface / C9_CausticsOverlay',owner:'ship_environment.gd / flood_water / underwater_caustics',previous:'large cyan fill and opaque bright caustics',candidate:'C9 artificial fills off, breach light follows hour, reduced opacity and caustic intensity; carried light remains',reference:'VA-11/15/16; REF-07'},
 {id:'WeatherRain / zone_emitters / surface_emitters',owner:'vfx_manager.gd',previous:'fixed weather-like effects, hidden emitters still emitting, combined cabin tags',candidate:'clear/rain/storm/fog; seeded rain suppressed indoors, idle hidden emitters, separate C4–C7 tags and gentle effects',reference:'VA-16/17; REF-01/07'},
 {id:'OceanWater / OceanHorizon / Rowboat',owner:'ship_environment.gd / ocean_waves.gd / ocean_water',previous:'finite visible sea edge, fixed swell',candidate:'continuous distant ring with distant shading branch; storm amplitude agrees between shader, CPU and boat; playable bounds unchanged',reference:'VA-13/15/16; REF-07'},
 {id:'OceanWater / OceanHorizon : distant fragment shading',owner:'shaders/ocean_water.gdshader',previous:'linear albedo (0.018, 0.038, 0.056), flat normal, roughness 0.55, specular 0.12',candidate:'linear albedo (0.018, 0.055, 0.075), broad fragment ripples with slope 0.045, roughness 0.38, specular 0.22; existing 75–100 m transition; no added scene-depth reads or displacement changes',reference:'VA-13/15/16; REF-07'},
];
const horizonComparisons=[];
for(const profile of ['day-clear','dusk-clear']){
 assert.deepEqual(read(`horizon-before/${profile}/cameras.json`),read(`finish/${profile}/cameras.json`));
 assert.deepEqual(read(`horizon-before/${profile}/environment.json`),read(`finish/${profile}/environment.json`));
 const file=`horizon-before/${profile}/overview.png`;
 const bytes=fs.readFileSync(path.join(root,file));
 originals.push({file,stage:'horizon-before',sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
 horizonComparisons.push(visualComparison({before:file,after:`finish/${profile}/overview.png`,title:`Horizonte · ${profile==='day-clear'?'día despejado':'atardecer'}`,width:1280,height:720}));
}
const manifest={profiles,captures:captureCount,construction_captures:cameras.length,cameras_equal:true,collisions_before:oldInventory.collisions.length,collisions_after:finalInventory.collisions.length,environment_tests:envTests,regressions,capture_results:captureResults,source_project:sourceProject,source_hashes:sourceHashes,originals,changes,accepted_by_user:false,M7_physical:false,fps_measured:false};
fs.writeFileSync(path.join(root,'finish-manifest.json'),JSON.stringify(manifest,null,2));
fs.writeFileSync(path.join(root,'finish-asset-register.json'),JSON.stringify(changes.map(change=>({...change,acceptance:'built and technically tested; user review pending'})),null,2));
let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(!html.includes('id="finish"'),'Run the base report builder before this builder');
const cards=`<section class="cards" style="margin-top:18px"><article class="card"><div class="num">04</div><h3>Texturas y materiales</h3><p>Lino real de la biblioteca del proyecto, madera coherente, vidrio sin luz propia y materiales exteriores que se mojan y vuelven a secarse.</p></article><article class="card"><div class="num">05</div><h3>Iluminación</h3><p>Día, atardecer y noche; sombras que siguen separando las estancias al recortar paredes; personajes integrados con sus lámparas.</p></article><article class="card"><div class="num">06</div><h3>VFX y clima</h3><p>Despejado, lluvia, tormenta y bruma. Lluvia fuera de interiores, oleaje compartido con la barca y una opción de efectos suaves.</p></article></section>`;
html=html.replace('<h2 id="layout">',cards+'<h2 id="layout">');
html=html.replace('<a href="#audit">','<a href="#finish">04–06 · Acabado y clima</a><a href="#audit">');
const comparisonHTML=cameras.map(view=>visualComparison({before:`construction/${view.view}.png`,after:`finish/day-clear/${view.view}.png`,title:`Capas 4–6 · ${labels[view.view]}`,width:1280,height:720})).join('');
const finish=`<section id="finish"><h2>04–06 · Del volumen al ambiente</h2><p>Comparación de la construcción de las capas 1–3 con el acabado de día despejado. Misma cámara, resolución, personaje y simulación; materiales e iluminación son los cambios que se evalúan.</p><details><summary>Ver las 15 comparativas de materiales e iluminación</summary>${comparisonHTML}</details><h2>Explorar los ambientes</h2><p>En el juego, abre <strong>Ambiente · F6</strong> para elegir hora y clima. <strong>Efectos suaves</strong> reduce partículas y agitación de telas. Las imágenes siguientes muestran estados distintos de la misma escena; no representan cambios de distribución.</p><div class="card"><label>Ambiente <select id="finish-profile" style="padding:10px;margin:8px 18px 18px 8px">${profiles.map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select></label><label>Vista <select id="finish-view" style="padding:10px;margin:8px">${cameras.map(view=>`<option value="${view.view}">${labels[view.view]}</option>`).join('')}</select></label><p id="finish-caption" role="status">Día · despejado / Conjunto del barco</p><a id="finish-original" href="finish/day-clear/overview.png" target="_blank" rel="noopener"><img id="finish-image" src="finish/day-clear/overview.png" width="1280" height="720" alt="Día despejado: conjunto del barco"></a></div><p class="muted">${captureCount} capturas reales: 15 focos en siete ambientes. Matriz técnica independiente de 12 presets × 7 modos de estancia. El oleaje de la barca y del agua coincide; el clima conserva las ${finalInventory.collisions.length} formas de colisión. No son medidas de FPS ni pruebas físicas de M7.</p><p><a href="finish-manifest.json">Originales, hashes, matriz y resultados finales</a> · <a href="finish-asset-register.json">Cambios de las capas 4–6 por ID</a></p></section><script>(()=>{const profile=document.getElementById('finish-profile'),view=document.getElementById('finish-view'),image=document.getElementById('finish-image'),link=document.getElementById('finish-original'),caption=document.getElementById('finish-caption');function update(){const label=profile.selectedOptions[0].text+' / '+view.selectedOptions[0].text;image.src='finish/'+profile.value+'/'+view.value+'.png';image.alt=label;link.href=image.src;caption.textContent=label;}profile.addEventListener('change',update);view.addEventListener('change',update);})();</script>`;
html=html.replace('<h2 id="audit">',finish+'<h2 id="audit">');
html=html.replace('primera pasada integral de construcción naval','candidata por seis capas de construcción y acabado');
html=html.replace('el borde lejano del océano que se aprecia en las tomas elevadas','la integración del horizonte y el agua a distancias y giros extremos');
html=html.replace('Las capas posteriores de luz, agua y ambiente conservan sus criterios y M7 requiere prueba física.','Las capas 4–6 están implementadas y tienen su propia evidencia; el juicio artístico y M7 continúan abiertos.');
html=html.replace('Esta entrega permite revisar las tres primeras capas;','Esta entrega permite revisar las seis capas;');
html=html.replace('<span class="badge">',`<p class="note">Candidata aislada para esta revisión: <code>${sourceProject.project}</code>. Abrir con <strong>ABRIR-PECIO-CAPAS.cmd</strong>. El proyecto compartido conserva cambios de interfaz de otro trabajo que no forman parte de estas capturas.</p><span class="badge">`);
html=html.replace('<h2>Explorar los ambientes</h2>',`<h2>Continuidad del horizonte</h2><p>Ajuste posterior localizado: el mar lejano conserva ondulación y color en lugar de convertirse en una superficie lisa oscura. Mismo encuadre, personaje, simulación y ambiente; el oleaje físico y las colisiones no cambian.</p><details><summary>Ver el ajuste del horizonte de día y al atardecer</summary>${horizonComparisons.join('')}</details><h2>Explorar los ambientes</h2>`);
fs.writeFileSync(path.join(root,'index.html'),html);
console.log(JSON.stringify({report:path.join(root,'index.html'),captures:captureCount,presetZoneCases:envTests.presets*envTests.zones_per_preset,suites:regressions.length}));
