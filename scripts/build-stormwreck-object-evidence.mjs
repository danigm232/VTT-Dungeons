import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {visualComparison, visualComparisonAssets} from './lib/visual-comparison.mjs';

const out=path.resolve('output/stormwreck-object-finish-20261104');
const read=name=>JSON.parse(fs.readFileSync(path.join(out,name),'utf8'));
const reports=['dragon-rest-comparison.json','wreck-ship-comparison.json'].map(read), manifest=[];
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
function png(file){const b=fs.readFileSync(path.join(out,file));return {file,width:b.readUInt32BE(16),height:b.readUInt32BE(20),bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex')};}
const rows=[];
for(const report of reports){
 assert.equal(report.errors.length,0,JSON.stringify(report.errors));
 assert.equal(report.angles.length,9);assert.deepEqual(report.roles.map(r=>r.role),['dm','player','projector']);
 for(const record of report.records){
  const {before,after}=record;
  assert.ok(before.camera.ready&&after.camera.ready);assert.deepEqual(before.pose,after.pose,'Comparison camera must match');
  assert.deepEqual(before.resources,after.resources,'Switching must not allocate resources');
  assert.deepEqual(before.objectAudit,after.objectAudit,'Original geometry identities and transforms must match');
  assert.ok(after.camera.objectFinish.groups>0,'The finishing pass must be present');
  for(const group of after.objectAudit)for(const axis of ['x','y','z']){
   const value=v=>v[axis]??v['_'+axis]; // Babylon Vector3 JSON exposes backing fields.
   assert.ok(value(group.afterBounds.min)>=value(group.beforeBounds.min)-.0001,group.id+' minimum '+axis);
   assert.ok(value(group.afterBounds.max)<=value(group.beforeBounds.max)+.0001,group.id+' maximum '+axis);
  }
  rows.push({map:report.map,zone:record.zone,time:record.time,sameCamera:true,sameOriginalGeometry:true,boundsInsideOriginal:true,resourcesStable:true,stats:after.camera.objectFinish});
 }
}
function compare(report,record){
 const base=`${report.map}-${record.zone}-${record.time}`,a=png(base+'-before.png'),b=png(base+'-after.png');
 assert.equal(a.width,b.width);assert.equal(a.height,b.height);manifest.push(a,b);
 return visualComparison({before:a.file,after:b.file,title:`${record.zone} · ${record.time==='day'?'día':'noche'} · original / muestra de objetos`,width:a.width,height:a.height});
}
const sections=reports.map(report=>`<section><h2>${report.map==='dragon-rest'?'Retiro del Dragón':'Pecio Rosa de los Vientos'}</h2><p>${report.map==='dragon-rest'?'Mesa larga, dos bancos y una silla: tablones con canto, caballetes, travesaños, uniones y respaldo con huecos. Follaje agrupado en las jardineras 7 y 8; flores, tierra, tallos y plantas colgantes existentes conservados.':'Cantos biselados del timón, balista rota y muebles de C4. Tablero del escritorio dividido en tres tablones; sus tres patas, deterioro, estados y colocación se conservan.'}</p>${report.records.map(r=>`<details ${r.time==='day'?'open':''}><summary>${esc(r.zone)} · ${r.time==='day'?'día':'noche'}</summary>${compare(report,r)}</details>`).join('')}</section>`).join('');
const sources=[
 'engine/client/stormwreck-object-finish.ts','apps/web/world.ts',
 'campaigns/stormwreck-isle/public/art/retreat-modules/retreat_r3_a3.glb',
 'campaigns/stormwreck-isle/public/art/retreat-modules/retreat_r3_landscape_runtime.glb',
 'engine/client/ship-props3d.ts','campaigns/stormwreck-isle/public/style-sample.ts',
 'campaigns/stormwreck-isle/public/retreat-zones/global-layout.json',
 'campaigns/stormwreck-isle/public/retreat-terrain-v2.json',
 'campaigns/stormwreck-isle/public/wreck-runtime-v6.ts'
].map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')}));
const groups=reports.flatMap(r=>r.records[0].after.objectAudit.map(g=>({scene:r.map,...g,owner:'engine/client/stormwreck-object-finish.ts',reference:g.kind==='grouped-herbs'?'REF-02 Witchbrook / REF-07 Sea of Stars':'REF-02 Witchbrook / REF-08 Eastward',VA:g.kind==='grouped-herbs'?['VA-07','VA-08','VA-09']:['VA-05','VA-06','VA-07'],acceptance:'PENDING_USER_REVIEW'})));
const validation={date:'2026-11-04',scope:'Isolated integrated renderer; current material/actor/skull finish enabled in both states. Object geometry sample only.',comparisons:rows,angles:reports.map(r=>({scene:r.map,count:r.angles.length})),roles:reports.map(r=>({scene:r.map,roles:r.roles.map(x=>x.role)})),groups,sources,acceptance:{implemented:true,technical:'PASS_RENDER_AND_GEOMETRY',visualReview:'CAPTURES_INSPECTED_SEPARATELY',user:'PENDING',physical:'PENDING',normalTableInstalled:false,FPS:'NOT_MEASURED'}};
const html=`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Retiro y Pecio · mobiliario y plantas</title><style>*{box-sizing:border-box}body{margin:0;background:#12272e;color:#e8e9dc;font:16px/1.6 system-ui}main{max-width:1440px;margin:auto;padding:28px}h1,h2{font-family:Georgia,serif;color:#ead0a0}a{color:#badbcc}section{padding:22px 0}details{border-bottom:1px solid #526666;padding:12px 0}summary{cursor:pointer}.note{padding:18px;background:#29434a;border-left:4px solid #dab876}table{border-collapse:collapse;width:100%;font-size:13px}td,th{text-align:left;padding:9px;border-bottom:1px solid #526666}.scroll{overflow:auto}</style><main><h1>Retiro y Pecio: mobiliario y plantas</h1><p>04/11/2026 · muestra VIS-2 sobre los mismos mapas · capturas del juego integrado.</p><p class="note"><strong>Candidata jugable separada.</strong> Abre <strong>REVISAR-ACABADO.cmd</strong> desde la carpeta Dungeons. La mesa habitual de 3000 conserva su instalación anterior. Esta muestra sigue pendiente de aceptación artística.</p><p>Pulsa una imagen para superponer el después. Otra pulsación vuelve al antes. También funcionan el teclado y «Ampliar», con zoom hasta el 300 % sin perder el encuadre.</p><p>La dirección toma construcción y agrupación de Witchbrook, objetos de Eastward y coherencia costera de Sea of Stars. Los materiales ilustrados y la luz de personajes del 02/11 están activos en ambos lados: aquí se compara únicamente el nuevo acabado de objetos. No se usan capturas comerciales como recursos del juego.</p>${sections}<section><h2>Verificación y alcance</h2><p>${rows.length} comparativas de día/noche, cámara y resolución iguales; nueve combinaciones de giro/inclinación y tres roles por mapa. Geometría y matrices originales conservadas; candidatas dentro del volumen anterior. No se añaden texturas, materiales ni luces. El mar y reflejos siguen animados, por lo que no se declara igualdad píxel a píxel.</p><div class="scroll"><table><tr><th>Escena</th><th>Grupos de muestra</th><th>Mallas originales / candidatas</th><th>Triángulos originales / candidatos</th></tr>${reports.map(r=>{const s=r.records[0].after.camera.objectFinish;return `<tr><td>${r.map}</td><td>${s.groups}</td><td>${s.sourceMeshes} / ${s.candidateMeshes}</td><td>${s.sourceTriangles} / ${s.candidateTriangles}</td></tr>`;}).join('')}</table></div><p>Los triángulos corresponden solo a los objetos de esta muestra. Los originales permanecen en memoria para comparar. Estos recuentos no acreditan FPS, memoria GPU ni pruebas físicas. Siguen pendientes la aceptación del usuario, móvil/proyector físicos, extensión por zonas y las fases VIS3–5/Q1/M5/M7 aplicables.</p><p><a href="../../docs/evidence/STORMWRECK_OBJECT_FINISH_20261104.md">Informe y parámetros</a> · <a href="validation.json">Auditoría de objetos y materiales</a> · <a href="manifest.json">Originales y hashes</a> · <a href="../../ROADMAP_V1.md">Roadmap maestro</a></p></section></main>${visualComparisonAssets()}</html>`;
fs.writeFileSync(path.join(out,'index.html'),html);
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify(validation,null,2)+'\n');
console.log(JSON.stringify({pairs:rows.length,images:manifest.length,groups:groups.length,validation:'PASS'}));
