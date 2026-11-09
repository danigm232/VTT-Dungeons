import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { visualComparison, visualComparisonAssets } from './lib/visual-comparison.mjs';

const output = path.resolve('output/stormwreck-zone-finish-20261104');
const read = name => JSON.parse(fs.readFileSync(path.join(output, name), 'utf8'));
const reports = ['dragon-rest', 'wreck-ship'].map(id => read(id + '-comparison.json'));
const states = ['dragon-rest', 'wreck-ship'].map(id => read(id + '-states.json'));
const objectStates = read('wreck-ship-object-states.json');
const network = read('network-smoke.json');
const deploymentFile = 'deployment-3000-20261105.json';
const installed = fs.existsSync(path.join(output, deploymentFile)) && read(deploymentFile).installed === true;
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const manifest = [], checks = [], objects = [], materials = [];
const objectRecipes = {
  'dining-joinery': { VA:['VA-06','VA-07'], bevelMaxMeters:.016, boardGapMeters:.006 },
  'ship-chamfers': { VA:['VA-05','VA-06','VA-07'], bevelMaxMeters:.012, c4DeskBoardGapMeters:.007 },
  'grouped-herbs': { VA:['VA-07','VA-08'], soilLipOffsetMeters:.0075, retainedTrailingGeometry:true },
  'grouped-meadow': { VA:['VA-07','VA-08'], heightFactor:[.30,1], tintFactor:[.84,1], retainedRoots:true },
  'foliage-depth': { VA:['VA-09','VA-12'], interiorTintFactor:[.5016,1], retainedLeafVertices:true }
};
const titles = { a1:'A1 · celdas',a2:'A2 · cabrestante',a3:'A3 · comedor',a4:'A4 · biblioteca',a5:'A5 · templo',umbral:'Paseo superior',jardin:'Jardín',bosquete:'Bosquete del puerto',expedicion:'Claro de expedición',costa:'Costa',c1:'C1 · cubierta',c2:'C2 · balista',c3:'C3 · timón',c4:'C4 · camarote',c5:'C5 · cocina',c6:'C6 · literas',c7:'C7 · comedor',c8:'C8 · cubierta inundada',c9:'C9 · bodega',cofa:'Cofa' };
function png(file) {
  const bytes = fs.readFileSync(path.join(output,file));
  const result = {file,width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),bytes:bytes.length,sha256:hash(bytes)};
  manifest.push(result); return result;
}
const sections = reports.map(report => {
  assert.deepEqual(report.errors,[]); assert.deepEqual(report.consoleErrors,[]);
  assert.equal(report.records.length,20);
  for (const group of report.objects) {
    for (const axis of ['x','y','z']) {
      const value = vector => vector[axis] ?? vector['_'+axis];
      assert.ok(value(group.afterBounds.min)>=value(group.beforeBounds.min)-.0001,group.id+' min '+axis);
      assert.ok(value(group.afterBounds.max)<=value(group.beforeBounds.max)+.0001,group.id+' max '+axis);
    }
    const sourceFile=report.map==='wreck-ship'?'engine/client/ship-props3d.ts':group.kind==='dining-joinery'?'campaigns/stormwreck-isle/public/art/retreat-modules/retreat_r3_a3.glb':'campaigns/stormwreck-isle/public/art/retreat-modules/retreat_r3_landscape_runtime.glb';
    objects.push({scene:report.map,...group,sourceFile,owner:'engine/client/stormwreck-object-finish.ts',candidate:objectRecipes[group.kind],reference:/foliage|meadow|herb/.test(group.kind)?'REF-02 / REF-07':'REF-02 / REF-08',acceptance:'PENDING_USER'});
  }
  materials.push(...report.materials.map(item=>({scene:report.map,...item,owner:'campaigns/stormwreck-isle/public/style-sample.ts',VA:['VA-01','VA-02','VA-03','VA-04','VA-05'],reference:'REF-02 / REF-07',acceptance:'PENDING_USER'})));
  const pairs = report.records.map(record => {
    assert.ok(record.before.ready && record.after.ready);
    assert.deepEqual(record.before.pose,record.after.pose);
    assert.deepEqual(record.before.resources,record.after.resources);
    assert.ok(record.after.actors.every(actor=>actor.onScreen && actor.rendered));
    if(report.map==='wreck-ship'){
      const faded=record.after.stairs.filter(stair=>stair.visible&&stair.opacity<.5).length;
      if(['c4','c8'].includes(record.zone))assert.ok(faded>0,'Selective stair fade '+record.zone);
      if(record.zone==='c1')assert.equal(faded,0,'Deck stair opacity restored');
    }
    const base=report.map+'-'+record.zone+'-'+record.time;
    const before=png(base+'-before.png'),after=png(base+'-after.png');
    assert.equal(before.width,after.width); assert.equal(before.height,after.height);
    checks.push({scene:report.map,zone:record.zone,time:record.time,camera:'MATCH',resources:'STABLE',ready:true});
    const title=titles[record.zone]+' · '+(record.time==='day'?'día':'noche');
    return `<details ${record.time==='day'?'open':''}><summary>${title}</summary>${visualComparison({before:before.file,after:after.file,title,width:before.width,height:before.height})}</details>`;
  }).join('');
  return `<section id="${report.map}"><h2>${report.map==='dragon-rest'?'Retiro del Dragón':'Pecio Rosa de los Vientos'}</h2>${pairs}</section>`;
}).join('');
for (const report of states) {
  assert.deepEqual(report.errors,[]); assert.deepEqual(report.consoleErrors,[]);
  assert.equal(report.results.length,50); assert.equal(report.roles.length,3);
  for (const result of [...report.results,...report.roles]) {
    assert.ok(result.ready);
    assert.ok(result.lightSources.every(light=>typeof light.intensity==='number'&&Number.isFinite(light.intensity)));
    assert.ok([result.pose.alpha,result.pose.beta,...result.pose.target,...result.pose.ortho].every(Number.isFinite));
  }
}
const climateImages=fs.readdirSync(output).filter(file=>file.endsWith('-rain.png')).map(png);
assert.equal(climateImages.length,20);
assert.deepEqual(objectStates.errors,[]);assert.deepEqual(objectStates.consoleErrors,[]);
assert.equal(objectStates.records.length,6);assert.ok(objectStates.restored.ready);
for(const state of ['open','closed']){
  const records=objectStates.records.filter(record=>record.state===state);
  assert.equal(records.length,3);
  for(const record of records){
    assert.ok(record.ready);
    assert.deepEqual(record.resources,records[0].resources);
    assert.equal(record.objects.groups,records[0].objects.groups);
    assert.equal(record.materials.meshes,records[0].materials.meshes);
  }
}
assert.equal(network.checks.length,10);assert.ok(network.checks.every(check=>check.ok));
const sourcePaths=[
 'engine/client/stormwreck-object-finish.ts','engine/client/stormwreck-foliage-finish.ts',
 'campaigns/stormwreck-isle/public/style-sample.ts','apps/web/world.ts',
 'campaigns/camp-rests/public/camp-surface-effects.ts',
 'campaigns/stormwreck-isle/public/art/retreat-modules/retreat_r3_a3.glb',
 'campaigns/stormwreck-isle/public/art/retreat-modules/retreat_r3_landscape_runtime.glb',
 'campaigns/stormwreck-isle/public/retreat-zones/global-layout.json',
 'campaigns/stormwreck-isle/public/retreat-terrain-v2.json','campaigns/stormwreck-isle/public/wreck-runtime-v6.ts',
 'engine/client/ship-props3d.ts',
 ...['basalt','oak','ship-timber'].map(id=>'campaigns/stormwreck-isle/public/art/visual-style-v1/'+id+'-illustrated-v1.png')
];
const sources=sourcePaths.map(file=>({file,sha256:hash(fs.readFileSync(file))}));
const buildRoot='runtime/stormwreck-zone-finish-20261105/web';
const compiledFiles=new Set();
for(const route of ['dm','dm-mobile','player','projector']){
  const file=`${buildRoot}/apps/web/${route}.html`;
  compiledFiles.add(file);
  const html=fs.readFileSync(file,'utf8');
  for(const [,asset] of html.matchAll(/(?:src|href)="(\/assets\/[^"?#]+)"/g))compiledFiles.add(buildRoot+asset);
}
const compiledEntries=[...compiledFiles].map(file=>({file,sha256:hash(fs.readFileSync(file))}));
const validation={date:'2026-11-05',checks,states:states.map(report=>({scene:report.map,checks:report.results.length,roles:report.roles.map(r=>r.role)})),objectStates:{cycles:3,stableResources:true,report:'wreck-ship-object-states.json'},network:{checks:10,report:'network-smoke.json'},objects,materials,sourceHashContext:'Workspace files at report generation. Render evidence and compiled entrypoints have separate records.',sources,compiledEntries,acceptance:{technical:'PASS',artistic:'PENDING_USER',physical:'PENDING',Q1:'PENDING',M7:'PENDING',installed3000:installed}};
const html=`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Retiro y Pecio · acabado por zonas</title><style>*{box-sizing:border-box}body{margin:0;background:#14272e;color:#ececdf;font:16px/1.6 system-ui}main{max-width:1440px;margin:auto;padding:28px}h1,h2{font-family:Georgia,serif;color:#ead0a0}a{color:#badbcc}details{border-bottom:1px solid #526666;padding:12px 0}summary{cursor:pointer}.note{padding:18px;background:#29434a;border-left:4px solid #dab876}</style><main><h1>Retiro y Pecio</h1><p>Acabado por zonas · candidata del 5 de noviembre de 2026</p><p class="note">${installed?'El acabado está instalado en la mesa habitual. Abre <a href="http://localhost:3000/dm">DM en el puerto 3000</a> o ejecuta <strong>INICIAR.cmd</strong> y elige Stormwreck.':'Abre <strong>REVISAR-ACABADO.cmd</strong> para jugar la candidata con una partida temporal.'} La aceptación artística y las pruebas físicas siguen pendientes.</p><p>Se comparan la base de materiales del 02/11 y el acabado actual de piedra, madera, plantas y objetos. Pulsa cada imagen para alternar antes y después. «Ampliar» permite revisar detalles con zoom y teclado.</p><p>El Retiro reúne A1–A5, paseo, jardín, bosquete, expedición y costa. El Pecio reúne C1–C9 y cofa. Las capturas usan la misma cámara, resolución, hora y posición por pareja. El agua y los elementos flotantes conservan su animación.</p><nav aria-label="Ir a una sección"><a href="#dragon-rest">Retiro</a> · <a href="#wreck-ship">Pecio</a> · <a href="#registro">Registro</a></nav>${sections}<section id="registro"><h2>Registro de revisión</h2><p>40 pares de día y noche. 100 comprobaciones de ocaso, giro, luz portada y lluvia, más tres roles por mapa. Procedencia y parámetros por objeto y material disponibles en el registro.</p><p><a href="validation.json">Objetos, materiales y validación</a> · <a href="manifest.json">Capturas originales y hashes</a> · <a href="../../docs/evidence/STORMWRECK_ZONE_FINISH_20261105.md">Informe de la candidata</a></p><p>Referencias de estudio empleadas por categoría según la biblioteca del proyecto, Witchbrook, Sea of Stars, Eastward y Octopath. Los recursos del juego proceden de la biblioteca local y sus derivados propios.</p></section></main>${visualComparisonAssets()}</html>`;
fs.writeFileSync(path.join(output,'index.html'),html);
fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
fs.writeFileSync(path.join(output,'validation.json'),JSON.stringify(validation,null,2)+'\n');
console.log(JSON.stringify({pairs:checks.length,images:manifest.length,objects:objects.length,materials:materials.length,states:100,result:'PASS'}));
