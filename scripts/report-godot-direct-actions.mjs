import {readFile,writeFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {visualComparison,visualComparisonAssets} from './lib/visual-comparison.mjs';
const root=path.resolve(import.meta.dirname,'..'),dir=path.join(root,'output/godot-combat-direct-20261115');
const read=async name=>readFile(path.join(dir,name),'utf8');
const suites=[];
for(const name of ['rules','preferences','direct-tests','integration-pecio','integration-retiro']){
 const log=await read(name+'.log');
 if(/SCRIPT ERROR|^ERROR:|^FAIL /m.test(log))throw Error('Incomplete suite '+name);
 const result=log.split(/\r?\n/).filter(l=>l.startsWith('{')).map(l=>JSON.parse(l)).find(r=>r.failed===0);
 if(!result)throw Error('Missing result '+name); suites.push({...result,suite:name});
}
const log=await read('same-scene.log');
if(!log.includes('Forward+')||!log.includes('DIRECT ACTION CAPTURES same-scene 8')||/SCRIPT ERROR|^ERROR:/m.test(log))throw Error('Native capture failed');
const before=JSON.parse(await read('captures/before.json')),after=JSON.parse(await read('captures/after.json')),originals=[],pairs=[];
for(const shot of before){
 const candidate=after.find(s=>s.sample===shot.sample);
 if(!candidate||candidate.camera!==shot.camera||candidate.size!==shot.size||JSON.stringify(candidate.party)!==JSON.stringify(shot.party))throw Error('Comparison state mismatch '+shot.sample);
 pairs.push({before:shot.image,after:candidate.image,sample:shot.sample,camera:shot.camera});
}
for(const shot of [...before,...after]){
 const bytes=await readFile(path.join(dir,'captures',shot.image));
 const dimensions=[bytes.readUInt32BE(16),bytes.readUInt32BE(20)];
 if(bytes.toString('hex',0,8)!=='89504e470d0a1a0a'||dimensions.join('x')!=='1280x720')throw Error('Invalid capture '+shot.image);
 originals.push({...shot,dimensions,sha256:createHash('sha256').update(bytes).digest('hex')});
}
const sources={};
for(const file of await readdir(path.join(root,'prototypes/godot-shared/combat'))){
 if(!file.endsWith('.gd'))continue;
 const hash=createHash('sha256').update(await readFile(path.join(root,'prototypes/godot-shared/combat',file))).digest('hex'); sources[file]=hash;
 for(const p of ['pecio','retiro','campamentos'])if(createHash('sha256').update(await readFile(path.join(root,`prototypes/godot-${p}/combat`,file))).digest('hex')!==hash)throw Error('Shared source mismatch '+p+'/'+file);
}
const total=suites.reduce((n,s)=>n+s.passed,0);
const evidence={date:'2026-11-16',total,suites,renderer:'Godot 4.7.2 Forward+ / NVIDIA MX350',comparison:'Retained baseline UI and candidate rendered consecutively in the same current map, camera, party transforms, resolution and frozen campaign clock; not a historical map reconstruction.',baseline:'baseline/ combat sources; review/before_controller.gd uses retained action_rose via resource path substitution only',originals,pairs,sourceHashes:sources,physicalDevices:false,visualUserAcceptance:false};
await writeFile(path.join(dir,'evidence.json'),JSON.stringify(evidence,null,2));
const titles={'right-wheel':'Rueda a la derecha: abre hacia dentro','left-wheel':'Rueda a la izquierda: reflejo automático','mace-selected':'Maza: ventana de objetivo eliminada','area-selected':'Manos ardientes: orientar el cono en el mapa'};
await writeFile(path.join(dir,'index.html'),`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Rueda lateral y acciones directas</title><style>body{background:#0c181e;color:#eee7d7;font:16px/1.6 system-ui;margin:auto;padding:28px;max-width:1400px}h1,h2{color:#dfc28a}a{color:#a7dbe6}section{margin:40px 0}table{border-collapse:collapse}td,th{padding:8px 16px;border:1px solid #45606a;text-align:left}</style><h1>Rueda lateral y selección directa · 16/11/2026</h1><p>La rueda vuelve al control lateral. Se abre como cuarto o medio círculo según su posición, con animación y sin ventana. La acción seleccionada permanece iluminada: otra pulsación la quita.</p><p>La ventana «Elegir objetivo» se sustituye por selección directa en el mapa. Ventaja, no letal y furtivo quedan como opciones discretas. Las áreas se señalan sobre el terreno: cono de 4,5 m desde el personaje, niebla de radio 6 m alrededor del punto, aura personal y zona de búsqueda. Los efectos que resuelve el DM esperan en una franja inferior, sin selector redundante ni un dado ficticio de confirmación.</p><p>${total} comprobaciones correctas, 0 fallos. La captura usa las dos interfaces sobre la misma escena actual, cámara, posiciones, resolución y reloj detenido. El antes conserva el código de interfaz anterior; no representa un mapa histórico distinto.</p><p>Pulsa o toca para superponer el después en el mismo rectángulo. También puedes usar teclado y ampliar sin perder el encuadre.</p><table><tr><th>Suite actual</th><th>Correctas</th></tr>${suites.map(s=>`<tr><td>${s.suite}</td><td>${s.passed}</td></tr>`).join('')}</table>${pairs.map(p=>`<section><h2>${titles[p.sample]}</h2>${visualComparison({before:'captures/'+p.before,after:'captures/'+p.after,title:titles[p.sample],width:1280,height:720})}</section>`).join('')}<p><a href="evidence.json">Pruebas, originales, cámara, posiciones y hashes</a> · <a href="../../docs/evidence/GODOT_PLAYER_AUDIT_20261115.md">Cambios, archivos y límites</a></p><p>Los dados físicos conservan su entrada de valores. Las plantillas son indicaciones tácticas: el DM sigue resolviendo cobertura, afectados, obstáculos y efectos guiados. Dispositivos físicos y aceptación artística permanecen separados.</p>${visualComparisonAssets()}</html>`);
console.log(JSON.stringify({total,captures:originals.length,pairs:pairs.length,sharedSources:Object.keys(sources).length,report:path.join(dir,'index.html')}));
