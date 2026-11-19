import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {visualComparison,visualComparisonAssets} from './lib/visual-comparison.mjs';
const root=path.resolve(import.meta.dirname,'..');
const dir=path.join(root,'output/godot-combat-20261115');
const records=[],sections=[],tests=[];
for(const project of ['pecio','retiro']){
 const frames=JSON.parse(await readFile(path.join(dir,'captures',project+'-originals.json'),'utf8'));
 const before=frames.find(f=>f.image.endsWith('-before-retained-hud.png'));
 const after=frames.find(f=>f.image.endsWith('-after-native-hud.png'));
 if(!before||!after||before.camera!==after.camera||before.orthographic_size!==after.orthographic_size)throw Error('Non-equivalent camera '+project);
 for(const f of frames){
  const bytes=await readFile(path.join(dir,'captures',f.image));
  if(bytes.toString('hex',0,8)!=='89504e470d0a1a0a')throw Error('Invalid PNG');
  const dimensions=[bytes.readUInt32BE(16),bytes.readUInt32BE(20)];
  if(dimensions[0]!==1280||dimensions[1]!==720)throw Error('Unexpected dimensions');
  records.push({...f,dimensions,sha256:createHash('sha256').update(bytes).digest('hex')});
 }
 const log=await readFile(path.join(root,`output/godot-combat-capture-godot-${project}-final.log`),'utf8');
 if(!log.includes('Forward+')||!log.includes('COMBAT CAPTURES '+project+' 5')||/SCRIPT ERROR|^ERROR:/m.test(log))throw Error('Incomplete final capture '+project);
 const title=project==='pecio'?'Pecio':'Retiro';
 sections.push(`<section><h2>${title}</h2>${visualComparison({before:'captures/'+before.image,after:'captures/'+after.image,title:title+' · HUD anterior conservado / interfaz nativa',width:1280,height:720})}<h3>Muestras actuales</h3><div class="samples">${[['physical-dice-cancel','Dado físico y cancelación'],['fog-volume','Niebla de 6 m en el mundo'],['fallen-body','Cuerpo conservado tras el combate']].map(([id,label])=>`<figure><a href="captures/${project}-${id}.png"><img src="captures/${project}-${id}.png" width="1280" height="720" alt="${label}" loading="lazy"></a><figcaption>${label}</figcaption></figure>`).join('')}</div></section>`);
}
for(const name of ['rules','integrated-pecio','integrated-retiro']){
 const log=await readFile(path.join(root,`output/godot-combat-${name}-final.log`),'utf8');
 if(/SCRIPT ERROR|^ERROR:|^FAIL /m.test(log))throw Error('Errors in final suite '+name);
 const result=log.split(/\r?\n/).filter(s=>s.startsWith('{')).map(s=>JSON.parse(s)).find(r=>r.failed===0);
 if(!result)throw Error('Suite did not complete '+name);
 tests.push({...result,suite:name});
}
const total=tests.reduce((sum,t)=>sum+t.passed,0);
const hashes={};
for(const name of ['combat_rules.gd','combat_controller.gd','combat_catalogue.gd','combat_overlay.gd','combat_visuals.gd','combat_turn_line.gd']){
 const bytes=await readFile(path.join(root,'prototypes/godot-shared/combat',name));
 const hash=createHash('sha256').update(bytes).digest('hex'); hashes[name]=hash;
 for(const project of ['godot-pecio','godot-retiro'])if(createHash('sha256').update(await readFile(path.join(root,'prototypes',project,'combat',name))).digest('hex')!==hash)throw Error('Shared module differs: '+project+'/'+name);
}
await mkdir(dir,{recursive:true});
await writeFile(path.join(dir,'evidence.json'),JSON.stringify({date:'2026-11-15',renderer:'Godot 4.7.2 Forward+ / NVIDIA MX350',comparison:'Retained legacy HUD vs native HUD inside current candidate, not historical screenshots',tests,total,sourceHashes:hashes,originals:records,physicalAcceptance:false,webCampaignIntegration:false},null,2));
await writeFile(path.join(dir,'index.html'),`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Combate Godot · revisión integrada</title><style>body{background:#0c1b23;color:#e8e0cd;font:16px/1.6 system-ui;margin:0 auto;padding:28px;max-width:1400px}h1,h2,h3{color:#dfc389}a{color:#9ed4df}section{margin:44px 0}.samples{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px}.samples figure{margin:0}.samples img{display:block;width:100%;height:auto}table{border-collapse:collapse}th,td{padding:8px 18px;border:1px solid #49616b;text-align:left}</style><h1>Combate nativo de Godot</h1><p>${total} comprobaciones automáticas correctas. Seis duelos simulados. Diez capturas reales en Forward+ de Pecio y Retiro.</p><p>El «antes» muestra los controles anteriores conservados dentro de la candidata actual; el «después», la interfaz nativa. Cada par comparte mapa, cámara, posiciones, resolución y reloj detenido. No es una reconstrucción de una versión histórica.</p><p>Pulsa la imagen para superponer el después sin desplazar el encuadre. También puedes usar el teclado y ampliar.</p><table><tr><th>Prueba</th><th>Correctas</th></tr>${tests.map(t=>`<tr><td>${t.suite}</td><td>${t.passed}</td></tr>`).join('')}</table>${sections.join('')}<p>La niebla, el dado y el cuerpo caído son muestras actuales separadas, sin presentarlos como comparativas de estados diferentes. Las pruebas no acreditan móviles físicos, FPS sostenidos ni red/guardado de campañas web.</p><p><a href="evidence.json">Originales, dimensiones, hashes, cámara y resultados</a></p>${visualComparisonAssets()}</html>`);
console.log(JSON.stringify({total,tests:tests.map(t=>({suite:t.suite,passed:t.passed})),captures:records.length,sharedModulesMatch:true,report:dir+'/index.html'}));
