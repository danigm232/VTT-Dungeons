import {readFile,writeFile,readdir,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {visualComparison,visualComparisonAssets} from './lib/visual-comparison.mjs';
const root=path.resolve(import.meta.dirname,'..'),dir=path.join(root,'output/godot-player-audit-20261115');
const projects=['pecio','retiro','campamentos'],originals=[],sections=[],suites=[];
const read=async file=>readFile(path.join(dir,file),'utf8');
for(const project of projects){
 const captureLog=await read(`after-${project}.log`);
 if(!captureLog.includes('Forward+')||!captureLog.includes(`PLAYER AUDIT CAPTURES ${project} after 4`)||/SCRIPT ERROR|^ERROR:/m.test(captureLog))throw Error('Incomplete native capture '+project);
 const before=JSON.parse(await read(`captures/${project}-before.json`)),after=JSON.parse(await read(`captures/${project}-after.json`));
 for(const shot of [...before,...after]){
  const bytes=await readFile(path.join(dir,'captures',shot.image));
  if(bytes.toString('hex',0,8)!=='89504e470d0a1a0a')throw Error('Invalid PNG '+shot.image);
  originals.push({...shot,sha256:createHash('sha256').update(bytes).digest('hex'),dimensions:[bytes.readUInt32BE(16),bytes.readUInt32BE(20)]});
 }
 for(const shot of before){
  const candidate=after.find(s=>s.sample===shot.sample);
  if(!candidate||candidate.camera!==shot.camera||Math.abs(candidate.size-shot.size)>1e-5)throw Error('Camera mismatch '+project+'/'+shot.sample);
 }
 const sceneResult=JSON.parse(await read(`scenes-${project}.json`));
 if(sceneResult.failed)throw Error('Scene suite failed '+project);
 if(/SCRIPT ERROR|^ERROR:|^FAIL /m.test(await read(`player-scenes-${project}.log`)))throw Error('Scene log error '+project);
 for(const scene of sceneResult.scenes)if(scene.capture){const bytes=await readFile(path.join(dir,'captures',scene.capture));originals.push({image:scene.capture,kind:'current map sample, thick-grid setting',scene:scene.scene,gridRadius:35,gridThickness:3,gridHeightOpacity:.2,sha256:createHash('sha256').update(bytes).digest('hex'),dimensions:[bytes.readUInt32BE(16),bytes.readUInt32BE(20)]});}
 suites.push(sceneResult);
 const title={pecio:'Pecio',retiro:'Retiro y destinos',campamentos:'Campamentos'}[project];
 sections.push(`<section><h2>${title}</h2>${before.map(shot=>visualComparison({before:'captures/'+shot.image,after:'captures/'+after.find(s=>s.sample===shot.sample).image,title:{radial:'Rosa circular flotante',spells:'Conjuros y disponibilidad',settings:'Preferencias del jugador',grid:'Cuadrícula caminable y alturas'}[shot.sample],width:1280,height:720})).join('')}<details><summary>Mapas comprobados y muestras actuales</summary><p>Estas muestras ejercitan el ajuste grueso de 3 px, radio 35 m y otras alturas al 20 %. El perfil inicial de los pares anteriores usa 1 px, 50 m y 30 %.</p>${sceneResult.scenes.map(scene=>`<p>${scene.scene}: ${scene.grid.walkable} casillas verificadas, ${scene.grid.chunks} bloques, construcción ${scene.grid.build_ms.toFixed(1)} ms.</p>${scene.capture?`<a href="captures/${scene.capture}"><img loading="lazy" src="captures/${scene.capture}" alt="Muestra actual ${scene.scene}"></a>`:''}`).join('')}</details></section>`);
}
for(const name of ['rules','preferences','navigation','combat-pecio','combat-retiro']){
 const log=await read(`${name}.log`);
 if(/SCRIPT ERROR|^ERROR:|^FAIL /m.test(log))throw Error('Errors '+name);
 const result=log.split(/\r?\n/).filter(l=>l.startsWith('{')).map(l=>JSON.parse(l)).find(r=>r.failed===0);
 if(!result)throw Error('Missing result '+name); suites.push({...result,suite:name});
}
const hashes={};
for(const module of ['player','combat'])for(const name of await readdir(path.join(root,'prototypes/godot-shared',module))){
 if(!/\.(gd|gdshader)$/.test(name))continue;
 const hash=createHash('sha256').update(await readFile(path.join(root,'prototypes/godot-shared',module,name))).digest('hex');hashes[module+'/'+name]=hash;
 for(const p of projects)if(createHash('sha256').update(await readFile(path.join(root,`prototypes/godot-${p}`,module,name))).digest('hex')!==hash)throw Error('Source mismatch '+p+'/'+module+'/'+name);
}
const total=suites.reduce((sum,s)=>sum+s.passed,0),sceneCount=suites.reduce((sum,s)=>sum+(s.scenes?.length??0),0);
await mkdir(dir,{recursive:true});
await writeFile(path.join(dir,'evidence.json'),JSON.stringify({date:'2026-11-15',renderer:'Godot 4.7.2 Forward+ / NVIDIA MX350',total,sceneCount,suites,sourceHashes:hashes,originals,comparison:'Before captured from original code; after from candidate. Identical recorded camera/orthographic size/resolution; deterministic initial scene and frozen campaign clock. Initial sprite settling/poses and ambient animation may differ; not a pixel-identical world frame.',acceptance:{visualUser:false,physicalDevices:false,networkCampaign:false},userDirection:'Circular, floating, animated and minimal; no surrounding window'},null,2));
await writeFile(path.join(dir,'index.html'),`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Combate, grid y preferencias Godot</title><style>body{background:#0b171d;color:#eee7d4;font:16px/1.6 system-ui;max-width:1400px;margin:auto;padding:28px}h1,h2{color:#dcc187}a{color:#a6d8e0}section{margin:48px 0}details img{max-width:100%;height:auto}summary{cursor:pointer}table{border-collapse:collapse}td,th{padding:8px 16px;border:1px solid #3f555d;text-align:left}</style><h1>Rosa, objetivos, cuadrícula y preferencias</h1><p>${total} comprobaciones correctas en ${sceneCount} mapas/escenas actuales de Godot. Rosa circular flotante y animada, sin ventana, según la corrección del usuario.</p><p>Los pares comparten cámara registrada, tamaño ortográfico y resolución. Se reproduce el inicio de la misma escena y se detiene el reloj. El asentamiento inicial de personajes, las poses y el ambiente pueden variar: no se afirma identidad de todos los píxeles del mundo.</p><p>Pulsa o toca para alternar antes/después en el mismo rectángulo. Puedes ampliar y usar el teclado.</p><table><tr><th>Suite</th><th>Correctas</th></tr>${suites.map(s=>`<tr><td>${s.project??s.suite}</td><td>${s.passed}</td></tr>`).join('')}</table>${sections.join('')}<p>El radio se limita a 50 m por defecto (10–100 m); otras alturas reciben 30 % de intensidad (ajustable). Las superficies proceden de los mapas existentes y se comprueban contra sus colisiones. Las marcas de movimiento usan el mismo grafo de apoyo y barrido, sin sustituir los controles manuales.</p><p><a href="action-targets.json">Clasificación completa de acciones</a> · <a href="evidence.json">Originales, cámara, hashes, pruebas y coste de construcción</a></p><p>La importación web requiere el JSON de preferencias; no se afirma acceso automático al almacenamiento privado del navegador. Guardado local de preferencias separado de cuentas y campaña web. Pendientes: aceptación visual, dispositivos físicos y FPS sostenidos.</p>${visualComparisonAssets()}</html>`);
console.log(JSON.stringify({total,sceneCount,comparisons:projects.length*4,originals:originals.length,report:path.join(dir,'index.html')}));
