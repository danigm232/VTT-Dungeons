import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {visualComparison, visualComparisonAssets} from './lib/visual-comparison.mjs';

const root = path.resolve('output/godot-pecio-layers-20261114');
const read = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8').replace(/^\uFEFF/, ''));
const before = read('before/cameras.json');
const after = read('after/cameras.json');
assert.equal(after.length, before.length);
let maxActorDelta = 0;
for (let i=0; i<before.length; i++) {
  const {player_feet: previousFeet, ...previous} = before[i];
  const {player_feet: candidateFeet, ...candidate} = after[i];
  assert.deepEqual(candidate, previous, 'Before/after cameras and frozen simulation must match');
  const coordinates = value => value.match(/-?\d+(?:\.\d+)?/g).map(Number);
  const p=coordinates(previousFeet), c=coordinates(candidateFeet);
  assert.equal(p.length,3); assert.equal(c.length,3);
  const delta=Math.hypot(...p.map((v,index)=>v-c[index]));
  assert(delta<=0.00001, `Actor placement differs in ${before[i].view}: ${delta} m`);
  maxActorDelta=Math.max(maxActorDelta,delta);
}
const inventoryBefore = read('before/inventory.json');
const inventoryAfter = read('after/inventory.json');
const tests = read('construction-tests.json');
const regressions = read('regressions.json');
assert.equal(tests.failures.length, 0);
assert(regressions.every(test => test.exit_code === 0 && test.errors === 0));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const originals = [];
for (const view of before) {
  for (const stage of ['before', 'after', 'greybox']) {
    const name = `${stage}/${view.view}.png`;
    const file = path.join(root, name);
    const png = fs.readFileSync(file);
    assert.equal(png.readUInt32BE(16), view.width);
    assert.equal(png.readUInt32BE(20), view.height);
    originals.push({file: name, sha256: hash(file), width: view.width, height: view.height, stage});
  }
}
const rows = [
  ['Casco y restos', 'HullStrakes / HullStrakes_Front / Frames', 'Cuadernas planas; fondo entre tracas sin cierre; brecha sin espesor', 'Cuadernas de sección cerrada; quilla y aparadura; cintones y testas astilladas; límite de brecha en x = −24 m', 'hull_builder.gd + ship_construction.gd', 'VA-05/07 · REF-07'],
  ['Cubiertas C1–C3', 'Deck_C1 / Deck_C2 / Deck_C3', 'Superficies sin canto; dibujo de madera pequeño y relieve dominante', 'Cantos de 18 cm, cara inferior, trancaniles; albedo existente, repetición 8 × 4 m, normal 0,22, rugosidad 0,96', 'hull_builder.gd + pbr_material_kit.gd', 'VA-03/04/05 · REF-07'],
  ['Camarotes C4–C7', 'Floor_AftCabins / Floor_ForeCabins / Bulkhead_* / HullInner_*', 'Tableros y mamparos sin todas sus testas; forro sin costillas interiores', 'Suelo de 18 cm; mamparos cerrados con pies derechos y soleras; cuadernas y cartabones en forros', 'interiors_builder.gd', 'VA-05/06/07 · REF-02/08'],
  ['Sentina C8 y bodega C9', 'Deck_C8 / Deck_C9 / HullLowerStanchions_C8 / HullHoldStanchions_C9', 'Tarimas sin canto y puntales sin cartabones', 'Cantos de 20 / 22 cm, UV de C9 y apoyos de carpintería; huecos conservados', 'interiors_builder.gd', 'VA-05/07/14 · REF-07'],
  ['Arboladura', 'MainYard / TopYard / TatteredSails / FallenForemast_C2', 'Vergas longitudinales; velas desalineadas; dos juegos de trinquete roto', 'Vergas y paños transversales, ligadas de envergue, zunchos; un único trinquete con testas fracturadas', 'rigging_builder.gd + ship_construction.gd', 'VA-05/07/13 · REF-07'],
  ['Jarcia y cabos', 'Chainwales_Port / Chainwales_Front / RopeCoil_*', 'Obenques anclados a mitad de cubierta; adujas con forma de aro macizo', 'Anclaje en mesas de guarnición, ocho pares de vigotas y acolladores; adujas espirales con cabo continuo', 'rigging_builder.gd + ship_construction.gd + deck_dressing_builder.gd', 'VA-06/07/14 · REF-07'],
  ['Cofa', 'CrowsNestFloor / CrowRimAndKnees', 'Suelo sin canto; borde de cesta plano', 'Plataforma de 18 cm, remate perimetral y ocho cartabones bajo la plataforma; arpía y nido conservados', 'rigging_builder.gd + ship_construction.gd', 'VA-05/07 · REF-02/07'],
  ['Utilería C1', 'MastFifeRail / CargoHatch_C1 / SailorRemains_C1', 'Bancada y brazola como bloques; cuerpo del marinero como cápsula', 'Carpintería abierta y marco hueco, costillas/columna/extremidades del marinero dentro de su ancla; interacción conservada', 'deck_dressing_builder.gd', 'VA-06/07 · REF-08'],
  ['Balista C2', 'NavalBallista_C2', 'Brazo completo, cuerda tensada y mensaje de virote listo, pese al contrato de balista inutilizable', 'Brazo partido, cuerda caída, virote depositado, afuste arriostrado y herrajes; mismo objeto y colisionador', 'deck_dressing_builder.gd + ship_construction.gd', 'VA-06 · REF-08 / inventario M5'],
  ['Restos de Clyssavar', 'GoldDragonSkull / OrbitalCavities / mat_bone_gold', 'Bóveda y mandíbula abiertas; material con tablones y clavos del atlas de roble', 'Bóveda con volumen, órbitas hundidas, mandíbula conectada y dentición asentada; hueso mate #c0b7a4, rugosidad 0,88; misma ancla, límites y colisión anterior', 'dragon_bones_builder.gd + pbr_material_kit.gd', 'VA-03/05/07 · REF-07 / anatomía existente'],
  ['Elementos conservados', 'Puertas, escaleras, timón, bitácora, cañón, muebles, botín, barca, arrecifes, Clyssavar, actores', 'Sistemas y recursos ya implementados', 'Inventariados por ID, material, geometría y propietario; no se declaran remodelados ni artísticamente aceptados', 'before/inventory.json + after/inventory.json', 'VA-17/18 · conservación'],
];
const labels = {overview:'Conjunto del barco', 'stern-breach':'Espejo de popa y acceso submarino', bow:'Proa y bauprés', c1:'C1 · Cubierta principal', c2:'C2 · Castillo de proa', c3:'C3 · Castillo de popa', c4:'C4 · Camarote del capitán', c5:'C5 · Cocina', c6:'C6 · Literas', c7:'C7 · Comedor', c8:'C8 · Cubierta inundada', c9:'C9 · Bodega sumergida', cofa:'Cofa y aparejos',dragon:'Clyssavar · cráneo y mandíbula',remains:'C1 · Restos del marinero'};

// Exact profile from the active Godot structure; this is a layout diagram,
// not an artistic comparison or a substitute for the integrated renderer.
const structureSource = fs.readFileSync('prototypes/godot-pecio/scripts/wreck_structure.gd', 'utf8');
const stations = [...structureSource.matchAll(/Vector2\((-?[\d.]+),\s*([\d.]+)\)/g)].map(match => [+match[1]*41/42, +match[2]*41/42]);
assert.equal(stations.length, 12);
const beam = x => {
  for (let i = 1; i < stations.length; ++i) if (x <= stations[i][0]) {
    const [a,b] = [stations[i-1],stations[i]]; return a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]);
  }
  return stations.at(-1)[1];
};
const sx = x => 100+(x+30.75)*18;
const sy = (z,cy) => cy+z*7;
const profile = (lo,hi,factor,cy) => {
  const xs = [lo,...stations.map(p=>p[0]).filter(x=>x>lo && x<hi),hi];
  return [...xs.map(x=>`${sx(x)},${sy(-beam(x)*factor,cy)}`),...xs.reverse().map(x=>`${sx(x)},${sy(beam(x)*factor,cy)}`)].join(' ');
};
const rect = (x0,x1,z0,z1,cy,color) => `<rect x="${sx(x0)}" y="${sy(z0,cy)}" width="${(x1-x0)*18}" height="${(z1-z0)*7}" fill="${color}" stroke="#eddab5" stroke-width="1.3"/>`;
let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1400 1030" role="img" aria-labelledby="title desc"><title id="title">Pecio · distribución conservada</title><desc id="desc">Perfil de doce estaciones, eslora 61,5 metros, cubiertas C1 a C9, cofa y conexiones físicas.</desc><style>text{font-family:system-ui;fill:#e7e8dc;font-size:17px}.small{font-size:14px}.label{font-size:22px;font-weight:600}</style><rect width="1400" height="1030" fill="#10232b"/><text x="40" y="42" class="label">01 · Distribución y estructura de referencia</text><text x="40" y="72">61,5 m de eslora · escala de casilla 1,5 m · 12 estaciones de manga · cotas locales del barco</text>`;
for (const [cy,title,lo,hi,factor,color] of [[210,'C1 / castillos C2–C3 · +0 / +3 m',-30.75,30.75,1,'#65624f'],[435,'Camarotes C4–C7 · +0 m',-30.75,30.75,0.98,'#4c5c58'],[660,'C8 · sentina −3,50..−3,20 m',-29,26.5,0.88,'#315964'],[870,'C9 · bodega −6,40 m',-30.75,27.5,0.82,'#24434f']]) {
  svg += `<text x="40" y="${cy-100}" class="label">${title}</text><polygon points="${profile(lo,hi,factor,cy)}" fill="${color}" stroke="#b8baaa" stroke-width="2"/>`;
  for (let x=-30; x<=30; x+=1.5) if (x>=lo && x<=hi) svg+=`<line x1="${sx(x)}" y1="${sy(-beam(x)*factor,cy)}" x2="${sx(x)}" y2="${sy(beam(x)*factor,cy)}" stroke="#d7ded7" opacity=".14"/>`;
  svg += `<text x="${sx(lo)}" y="${cy+96}" class="small">popa ${lo} m</text><text x="${sx(hi)-70}" y="${cy+96}" class="small">proa +${hi} m</text>`;
}
svg += `<path d="M${sx(-13.5)} 137V283 M${sx(13.5)} 137V283" stroke="#e8d1a5" stroke-width="2"/><text x="${sx(-25)}" y="216">C3</text><text x="${sx(-8)}" y="216">C1</text><text x="${sx(21)}" y="216">C2</text>`;
for(const side of [-1,1]) for(const end of [-1,1]) svg += rect(end<0?-13.5:10.2,end<0?-10.2:13.5,side*3.5-.75,side*3.5+.75,210,'#b28d61');
svg += rect(-1.5,4.5,4.35,6.15,210,'#132028');
svg += `<text x="${sx(1.5)}" y="${sy(7.7,210)}" class="small">↓ C8</text><circle cx="${sx(0.35)}" cy="${sy(-0.48,210)}" r="9" fill="#b8915c"/><text x="${sx(0.35)+16}" y="${sy(-0.48,210)-10}" class="small">cofa +15 m</text>`;
svg += `<path d="M${sx(-30.75)} 435H${sx(-13.5)}V365 M${sx(-13.5)} 435V505 M${sx(13.5)} 365V505 M${sx(13.5)} 435H${sx(30.75)}" stroke="#e8d1a5" stroke-width="2"/>`;
for(const [x,z,label] of [[-22,-4,'C4'],[-22,4,'C5'],[22,-4,'C6'],[22,4,'C7']])svg+=`<text x="${sx(x)}" y="${sy(z,435)}">${label}</text>`;
for(const [x,z] of [[-13.5,-5.2],[-13.5,1.8],[13.5,-1.8],[13.5,1.8]])svg+=`<circle cx="${sx(x)}" cy="${sy(z,435)}" r="5" fill="#f0c787"/>`;
for(const cy of [435,660])svg+=rect(-18.3,-16.7,-4,-2.4,cy,'#132028');
svg += rect(12.75,18.75,1.35,3.15,660,'#132028');
svg += `<text x="${sx(12)}" y="${sy(6.8,660)}" class="small">↓ C9</text><text x="${sx(-18.3)}" y="${sy(-6,660)}" class="small">P13</text><path d="M55 870H105" stroke="#f0c787" stroke-width="5"/><text x="40" y="840" class="small">P16</text><text x="40" y="1000" class="small">Ocre: escaleras y anclas · oscuro: huecos conservados · puntos dorados: cuatro puertas actuales. No es arte final.</text></svg>`;
fs.writeFileSync(path.join(root,'layout.svg'), svg);

const totals = inventory => ({meshes:inventory.meshes.length,triangles:inventory.meshes.reduce((n,m)=>n+m.triangles,0),collisions:inventory.collisions.length});
const summary = {date:'2026-11-14',engine:tests.engine,before:totals(inventoryBefore),after:totals(inventoryAfter),tests,regressions,originals,cameras_equal:true,max_actor_delta_metres:maxActorDelta,actor_tolerance_metres:0.00001,artistic_acceptance:false,physical_M7:false,network_migration:false};
fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify(summary,null,2));
fs.writeFileSync(path.join(root,'asset-register.json'),JSON.stringify(rows.map(([area,id,previous,candidate,owner,reference])=>({area,id,owner,previous,candidate,reference,acceptance:'candidate, user review pending'})),null,2));
const table = rows.map(row=>`<tr>${row.map(cell=>`<td>${escape(cell)}</td>`).join('')}</tr>`).join('');
const comparisons = before.map(view=>visualComparison({before:`before/${view.view}.png`,after:`after/${view.view}.png`,title:labels[view.view],width:view.width,height:view.height})).join('');
const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pecio · construcción por capas</title><style>
:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#0b1920;color:#e7e8dd;font:16px/1.6 system-ui}main{max-width:1320px;margin:auto;padding:38px 28px 80px}header{border-bottom:1px solid #3b5456;padding-bottom:26px;margin-bottom:28px}.eyebrow{color:#c6b389;font-size:13px;letter-spacing:.15em;text-transform:uppercase}h1{font:500 clamp(32px,5vw,56px)/1.1 Georgia;margin:16px 0}h2{font:500 30px/1.2 Georgia;margin:42px 0 16px}h3{margin:0 0 10px;font-size:20px}p{max-width:980px}a{color:#e8ca92}.muted{color:#aabcb9}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.card{padding:22px;border:1px solid #415957;background:#132a32}.num{color:#dbbd84;font-size:32px}.badge{display:inline-block;padding:4px 10px;border:1px solid #637e6c;border-radius:3px;color:#d5e4cd;font-size:13px}img{max-width:100%;height:auto}table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;border-bottom:1px solid #3b5358;padding:14px 10px;vertical-align:top}th{color:#d8c499;background:#142a32}.scroll{overflow:auto}.layout{background:#10232b;border:1px solid #3b5358}.grey{display:grid;grid-template-columns:repeat(2,1fr);gap:20px}figure{margin:0}figcaption{margin-bottom:8px;color:#d4d9cb}.note{border-left:3px solid #b69b68;padding:10px 20px;background:#13262d}.metrics{display:flex;gap:22px;flex-wrap:wrap;margin-top:20px}.metrics strong{font-size:24px;display:block}details{border:1px solid #3b5358;padding:16px;margin-top:22px}summary{cursor:pointer}nav{display:flex;gap:18px;flex-wrap:wrap;margin:20px 0}.vtt-comparison{margin-top:32px!important}@media(max-width:760px){main{padding:24px 14px}.cards,.grey{grid-template-columns:1fr}table{min-width:1050px}}
</style>${visualComparisonAssets()}</head><body><main><header><div class="eyebrow">Rosa de los Vientos · Godot Forward+ · 14 noviembre 2026</div><h1>Un pecio construido,<br>capa a capa.</h1><p>Auditoría del prototipo y primera pasada integral de construcción naval: casco, cubiertas, mamparos, aparejos y restos. Se conserva su distribución y se refina la geometría existente.</p><span class="badge">Candidata construida · aceptación artística pendiente</span><div class="metrics"><div><strong>13</strong>vistas comparables</div><div><strong>${tests.passed}</strong>comprobaciones nuevas</div><div><strong>4 / 4</strong>suites existentes sin errores</div><div><strong>61,5 m</strong>eslora conservada</div></div><nav><a href="#layout">01 · Diseño</a><a href="#greybox">02 · Volumen</a><a href="#art">03 · Geometría y arte</a><a href="#audit">Inventario y pruebas</a></nav></header>
<section class="cards"><article class="card"><div class="num">01</div><h3>Concepto y distribución</h3><p>Perfil y plantas contrastados con el código actual. Se mantienen estaciones, escala, escora, salas, puertas y conexiones.</p></article><article class="card"><div class="num">02</div><h3>Blockout / Greybox</h3><p>Vistas de diagnóstico del mismo barco sin texturas. Apoyos, huecos y escaleras se comprueban con consultas físicas.</p></article><article class="card"><div class="num">03</div><h3>Geometría y arte base</h3><p>Carpintería con volumen, cantos, cierres, roturas y aparejos unidos. Materiales existentes con escala de lectura más tranquila.</p></article></section>
<h2 id="layout">01 · La distribución que se conserva</h2><img class="layout" src="layout.svg" alt="Plantas del Pecio C1 a C9 y conexiones conservadas"><p class="muted">Plano derivado de <code>wreck_structure.gd</code>; puertas contrastadas por la suite de alineación. Es un diagrama de diseño, no un render ni un después artístico.</p>
<h2 id="greybox">02 · Revisar la construcción sin el acabado</h2><div class="grey">${['overview','c4','c8','cofa'].map(view=>`<figure><figcaption>${labels[view]} · diagnóstico de volumen</figcaption><a href="greybox/${view}.png"><img src="greybox/${view}.png" alt="Greybox ${labels[view]}" loading="lazy"></a></figure>`).join('')}</div>
<h2 id="art">03 · Antes / después integrado</h2><p>Haz clic o toca la imagen para alternar; usa <strong>Ampliar</strong> para revisar hasta el 300 %. Los botones admiten teclado. Cada par conserva cámara, resolución, semilla, estado y tiempo de simulación congelado.</p>${comparisons}
<h2 id="audit">Qué se ha auditado y cambiado</h2><div class="scroll"><table><thead><tr><th>Conjunto</th><th>ID</th><th>Antes</th><th>Candidata</th><th>Propietario</th><th>VA / referencia</th></tr></thead><tbody>${table}</tbody></table></div>
<h2>Pruebas y alcance de la migración</h2><p>${tests.passed} comprobaciones nuevas: volumen cerrado de vigas, espesores sin nuevos obstáculos, apoyos físicos en siete superficies, tres huecos, cuatro tramos de la escalera C1–C8, entrada P16 y recorte/restauración de detalles. Suites existentes: integridad del Pecio, cuatro puertas, paridad de cámara y animaciones.</p><div class="scroll"><table><thead><tr><th>Medida de inventario completo</th><th>Antes</th><th>Después</th></tr></thead><tbody>${[['Mallas',summary.before.meshes,summary.after.meshes],['Triángulos',summary.before.triangles,summary.after.triangles],['Formas de colisión',summary.before.collisions,summary.after.collisions]].map(row=>`<tr>${row.map(cell=>`<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="muted">Recuento de recursos, no medición de FPS. Se eliminan los dos colisionadores del trinquete duplicado; sus piezas y colisiones canónicas de C2 se conservan. Los detalles añadidos no incorporan colisiones.</p>
<div class="note"><strong>Godot continúa siendo una candidata local.</strong><p>Movimiento, cámara, actores, puertas y mochila existen. No se encontró integración con el servidor de partidas del VTT ni guardado persistente en los scripts de este prototipo. Exportaciones, dispositivos físicos y rendimiento sostenido no quedan certificados por estas capturas.</p></div>
<h2>Revisión pendiente</h2><p>Esta entrega permite revisar las tres primeras capas; no declara perfecto ni aceptado el barco. Quedan por juzgar el detalle de todos los muebles y restos, la lectura de C8/C9 con agua, el cráneo de Clyssavar, la correspondencia narrativa de bauprés/elementos añadidos y el borde lejano del océano que se aprecia en las tomas elevadas. Las capas posteriores de luz, agua y ambiente conservan sus criterios y M7 requiere prueba física.</p>
<details><summary>Originales, procedencia y registros</summary><p>Geometría nueva original y reproducible en GDScript. Se reutilizan los materiales del proyecto, incluida <code>ship-timber-illustrated-v1.png</code>, cuya procedencia consta en <code>LICENSES_AND_CREDITS.md</code> y en el manifiesto visual del 02/11. No se importan imágenes comerciales ni recursos nuevos de terceros. Los modelos heredados del prototipo mantienen pendiente la reconciliación de su procedencia con los créditos generales.</p><ul><li><a href="manifest.json">Manifiesto, hashes y pruebas</a></li><li><a href="asset-register.json">Registro de cambios por conjunto e ID</a></li><li><a href="before/inventory.json">Inventario completo anterior</a> · <a href="after/inventory.json">Inventario completo candidato</a></li><li><a href="construction-tests.json">Pruebas nuevas</a> · <a href="regressions.json">Regresiones</a></li><li><a href="before/cameras.json">Cámaras originales</a> · <a href="after/cameras.json">Cámaras candidatas</a></li></ul></details><p class="muted">Referencias de construcción/material: REF-07 Sea of Stars (2023), REF-02 Witchbrook (material promocional), REF-08 Eastward (2021), según la biblioteca local. Se toman legibilidad, familia de materiales y apoyos; no se copian sus mapas o assets.</p></main></body></html>`;
fs.writeFileSync(path.join(root,'index.html'),html.replace('<strong>13</strong>',`<strong>${before.length}</strong>`).replace('el cráneo de Clyssavar, ',''));
console.log(JSON.stringify({report:path.join(root,'index.html'),before:summary.before,after:summary.after,comparisons:before.length,originals:originals.length,checks:tests.passed}));
