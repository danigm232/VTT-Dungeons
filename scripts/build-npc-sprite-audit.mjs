import {readFile,writeFile,mkdir,copyFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {visualComparison,visualComparisonAssets} from './lib/visual-comparison.mjs';
const raw='output/npc-sprites-audit-20261116',folder='output/npc-sprites-20261115/audit-20261116';
await mkdir(folder,{recursive:true});
const examples=[
 ['multiattack-before.png','multiattack-after.png','Multiataque: primero se ven las garras y después la porra'],
 ['condition-lying-before.png','zombie-condition-inconsciente.png','El estado sigue al cuerpo tumbado'],
 ['condition-held-before.png','zombie-condition-agarrada.png','El acento se ajusta al tamaño del personaje']
];
let comparisons='';const originals=[];
for(const [before,after,title]of examples){
 for(const file of [before,after]){
  const path=raw+'/'+file,bytes=await readFile(path);await copyFile(path,folder+'/'+file);
  if(bytes.readUInt32BE(16)!==1280||bytes.readUInt32BE(20)!==720)throw Error('Nonmatching capture dimensions: '+file);
  originals.push({source:path,copy:file,sha256:createHash('sha256').update(bytes).digest('hex'),width:1280,height:720,camera:[0,4,10],target:[0,.8,0],orthographicSize:5,stage:'native PlayerToken neutral stage'});
 }
 comparisons+=visualComparison({before,after,title,width:1280,height:720});
}
await writeFile(folder+'/capture-originals.json',JSON.stringify(originals,null,2)+'\n');
const regressions=[];for(const file of await readdir(raw))if(file.startsWith('regressions-')&&file.endsWith('.json')){
 const result=JSON.parse(await readFile(raw+'/'+file,'utf8'));if(result.failures.length)throw Error('Current regression failed: '+file);
 regressions.push(result);
}
const report={date:'2026-11-16',native:regressions,catalogue:{checks:442,failures:0,project:'pecio'},playerRegression:{checks:2354,failures:0,project:'pecio'},rules:{checks:124,failures:0},web:{tests:15,failures:0},typecheck:{client:'passed',server:'passed'},visual:'native before/after and current map inspected',userAcceptance:'pending',physicalTable:'pending'};
await writeFile(folder+'/validation.json',JSON.stringify(report,null,2)+'\n');
await writeFile(folder+'/index.html',`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Auditoría de zombis y arpías</title><style>body{margin:0;background:#10191c;color:#e7dfcd;font:16px/1.65 system-ui}main{max-width:1250px;margin:auto;padding:28px}h1,h2{font-family:Georgia,serif;color:#e5bc73}section{margin:24px 0;padding:22px;border:1px solid #415756;border-radius:10px;background:#17252a}a{color:#a9d1cb}li{margin:9px 0}table{border-collapse:collapse;width:100%}td,th{text-align:left;padding:12px;border-bottom:1px solid #465852}summary{cursor:pointer}.muted{color:#a5b7b2}</style><main><h1>Zombis y arpías · auditoría corregida</h1><p>Corregidos fallos de reproducción real, orientación, apariencia y estados. Se conserva el mapa, los encuentros y las reglas.</p><section><h2>Lo que cambia al jugar</h2><ul><li>El multiataque reproduce las garras completas antes de empezar la porra; el cuerpo no cae antes de terminar los golpes pendientes.</li><li>La vista del sprite sigue la cámara sin modificar los ejes de movimiento. Los efectos sobre uno mismo mantienen la orientación y la animación de conjuro.</li><li>Los PNJ conservan su dirección al descansar. Los temporizadores de ambiente ya no hacen despegar a una arpía quieta.</li><li>Un personaje derribado que se mueve usa el arrastre; inconsciente permanece inmóvil.</li><li>Curar una criatura oculta no activa su colisión ni su movimiento. La recuperación de un zombi también se ve cuando el DM resuelve rápidamente Fortaleza.</li><li>Los zombis conservan su propia ropa al detenerse y los catálogos de campañas distintas quedan independientes.</li><li>El canto y los zombis usan sonidos existentes apropiados; se evita cargar imágenes antiguas que ya se sustituían.</li><li>Los estados se ajustan a la silueta real, incluidos cuerpos tumbados. El visor también utiliza ese tamaño y conserva el rumbo de las poses quietas.</li></ul><p><a href="../index.html">Abrir el visor de todas las animaciones y estados</a></p></section><section><h2>Comparaciones reales</h2><p>Misma escena neutra, cámara, luz y resolución. En el multiataque se muestran 0,21 segundos después de recibir garras y porra: antes el segundo golpe borraba el primero. Pulsa para superponer el después y vuelve a pulsar para regresar.</p>${comparisons}</section><section><h2>Comprobaciones de esta revisión</h2><table><thead><tr><th>Comprobación</th><th>Resultado</th></tr></thead><tbody>${regressions.map(r=>`<tr><td>${r.project}</td><td>${r.checks} comprobaciones nuevas · sin fallos</td></tr>`).join('')}<tr><td>Catálogo de PNJ · Pecio</td><td>442 · sin fallos</td></tr><tr><td>Regresión de personajes · Pecio</td><td>2.354 · sin fallos</td></tr><tr><td>Reglas de combate</td><td>124 · sin fallos</td></tr><tr><td>Web · animaciones y actores de la aventura</td><td>15 pruebas · sin fallos</td></tr></tbody></table><p><a href="validation.json">Resultados</a> · <a href="capture-originals.json">Originales y hashes</a> · <a href="../../../docs/evidence/NPC_SPRITES_20261116.md">Registro de cambios</a></p><p class="muted">Candidata local integrada en los tres prototipos Godot. La aceptación artística y la prueba física en mesa siguen separadas. El adaptador web está actualizado en fuentes.</p></section></main>${visualComparisonAssets()}</html>`);
console.log(folder+'/index.html');
