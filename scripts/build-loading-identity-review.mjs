import {readFile,writeFile,mkdir,copyFile,readdir} from 'node:fs/promises';
import {resolve,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {visualComparison,visualComparisonAssets} from './lib/visual-comparison.mjs';
const root=resolve(import.meta.dirname,'..'),out=resolve(root,'output/loading-identity-v6');
const proof=resolve(root,'docs/evidence/captures/loading-identities-20261125');
const catalog=JSON.parse(await readFile(resolve(out,'candidate/catalog.json'),'utf8'));
const registry=JSON.parse(await readFile(resolve(root,'prototypes/godot-shared/characters/scopes/loading-identities-v6.candidate.json'),'utf8'));
const native=JSON.parse(await readFile(resolve(out,'native-validation.json'),'utf8'));
if(!native.passed||native.revision!==registry.revision)throw Error('Native evidence is missing or stale');
for(const name of ['before','after','reference'])await mkdir(resolve(proof,name),{recursive:true});
const cases=[['mike','performance','success'],['mike','history','success'],['mike','nature','failure'],['mike','medicine','success'],['mike','sleight-of-hand','success'],['mike','persuasion','ambient'],['mia','persuasion','ambient'],['maria','persuasion','success']];
const hashes=[];
async function record(file){hashes.push({file:relative(root,file).replaceAll('\\','/'),sha256:createHash('sha256').update(await readFile(file)).digest('hex')});}
const pairs=[];
for(const [actor,skill,state]of cases){const name=`${actor}-${skill}-${state}.png`;
 const before=resolve(root,'output/loading-sprite-audit-20261124/before',name),after=resolve(out,'native',name);
 await copyFile(before,resolve(proof,'before',name));await copyFile(after,resolve(proof,'after',name));
 await record(resolve(proof,'before',name));await record(resolve(proof,'after',name));
 pairs.push(visualComparison({before:'before/'+name,after:'after/'+name,title:`${catalog.actors[actor].label} · ${catalog.scenes.find(s=>s.id===skill).name} · ${state}`,width:1280,height:720}));
}
for(const actor of ['mike','mia','maria']){const file=resolve(root,`campaigns/stormwreck-isle/public/art/characters/base-v1/${actor}/idle-01.png`);await copyFile(file,resolve(proof,'reference',actor+'.png'));await record(file);}
for(const name of ['d20-rolling-a','d20-rolling-b','d20-result']){await copyFile(resolve(out,'native',name+'.png'),resolve(proof,'after',name+'.png'));await record(resolve(proof,'after',name+'.png'));}
for(const d of Object.values(registry.animations)){
 await record(resolve(root,d.production.original));
 for(const frame of d.frames)await record(resolve(root,typeof frame==='string'?frame:frame.file));
}
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const edits=new Map();
for(const name of (await readdir(out)).sort((a,b)=>Number(a.startsWith('retry-'))-Number(b.startsWith('retry-'))))if(/^(source|retry)-sw-.*\.json$/.test(name)){const item=JSON.parse(await readFile(resolve(out,name),'utf8'));edits.set(item.id,item);}
const promptSet=Object.values(registry.animations).map(d=>({id:d.id,prompt:d.production.prompt,finalEditPrompt:edits.get(d.id)?.prompt??null,original:d.production.original,sourceSha256:d.production.originalSha256,equipmentState:d.production.equipmentState,extraction:d.production.importReport}));
await writeFile(resolve(proof,'prompts-and-sources.json'),JSON.stringify(promptSet,null,2));
await writeFile(resolve(proof,'manifest.json'),JSON.stringify({scope:registry.scope,revision:registry.revision,native,conditions:{width:1280,height:720,clock:.4,actionElapsed:4,destination:'Auditoría · personaje'},records:hashes},null,2));
const html=`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Correcciones de identidad en cargas Godot</title><style>body{max-width:1150px;margin:auto;padding:24px;background:#10272b;color:#eee1c6;font:16px/1.5 system-ui}a{color:#e7c78c}h1,h2{font-family:Georgia}img{max-width:100%;height:auto}.references{display:flex;gap:20px;align-items:end}.references img{height:220px;width:auto}article{border:1px solid #596f69;padding:16px;margin:12px 0}</style><h1>Correcciones de identidad · cargas Godot</h1><p>Se corrige la familia antigua de Mike y la continuidad del comerciante en Persuasión con los tres protagonistas. Las otras 34 combinaciones de Mía/Trinity y habilidad conservan sus selecciones anteriores. Fondos, objetos, distribución, CD y reglas se mantienen; el texto de Medicina deja de afirmar que el compañero se levanta cuando sigue sentado.</p><p>Once láminas seleccionadas, 88 fotogramas nuevos extraídos a tamaño nativo, con originales conservados. Marcha, carrera, sigilo, salto y reposos se reutilizan del VTT. Las láminas exploratorias descartadas no se instalan. Hay ciclos de seis u ocho fases y bibliotecas de poses sostenidas: no se presentan como ciclos nuevos las poses de desenlace.</p><h2>Referencias de identidad</h2><p>Son las apariencias actuales del VTT, no pares de captura con el mismo estado.</p><div class="references"><img src="reference/mike.png" alt="Mike original"><img src="reference/mia.png" alt="Mía original"><img src="reference/maria.png" alt="Trinity original"></div><h2>Antes y después integrados</h2><p>Capturas reales de Godot Forward+, mismo encuadre 1280×720, reloj de ambiente a 400 ms y tiempo de acción 4 s. Pulsa para superponer sin cambiar encuadre; hay teclado y ampliación. Medicina incluye la corrección deliberada de su texto.</p>${pairs.join('')}<h2>Dado nativo del jugador</h2><p>Cambio de Antigravity incluido: dado pequeño con veinte caras y lanzamiento animado. Estas son capturas actuales del componente; no se inventa una captura anterior.</p>${['d20-rolling-a','d20-rolling-b','d20-result'].map(n=>`<article><img loading="lazy" src="after/${n}.png" alt="${n}"></article>`).join('')}<p>Revisión técnica y visual interna de la candidata. La aceptación artística del usuario y las pruebas físicas siguen pendientes. Los tonos de Interpretación y la partida permanecen sin cambios.</p><p><a href="manifest.json">Originales, hashes y validación nativa</a> · <a href="prompts-and-sources.json">Prompts finales y recursos</a>. Herramienta de producción: image_gen integrada, sin CLI de generación.</p>${visualComparisonAssets()}</html>`;
await writeFile(resolve(proof,'index.html'),html);
await writeFile(resolve(out,'review.json'),JSON.stringify({scope:'loading-identities-v6',revision:registry.revision,technical:'passed',visual:'reviewed',userAcceptance:'pending',nativeReport:'output/loading-identity-v6/native-validation.json',evidence:['docs/evidence/captures/loading-identities-20261125/index.html','docs/evidence/captures/loading-identities-20261125/manifest.json','output/loading-identity-v6/catalog-checks.json'],resourceIds:registry.scope.ids},null,2));
console.log(`Review built: ${pairs.length} matching overlays, 3 native die captures, ${hashes.length} hashes; resource scope only.`);
