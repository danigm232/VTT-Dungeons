import {mkdir,readFile,writeFile,copyFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {visualComparison,visualComparisonAssets} from './lib/visual-comparison.mjs';
import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const root=resolve(import.meta.dirname,'..'),out=resolve(root,'output/godot-skill-loading-20261114');
await mkdir(resolve(out,'comparacion'),{recursive:true});
const catalog=JSON.parse(await readFile(resolve(root,'prototypes/godot-pecio/loading/catalog.json'),'utf8'));
const hash=async p=>createHash('sha256').update(await readFile(p)).digest('hex');
const records=[];
const browser=await chromium.launch({executablePath:'C:/Users/User/AppData/Local/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-win64/chrome-headless-shell.exe'});
const pilots=[['athletics','Atletismo'],['arcana','Conocimiento arcano'],['persuasion','Persuasión']];
try{
 const page=await browser.newPage({viewport:{width:1280,height:720},reducedMotion:'no-preference'});
 await page.context().setOffline(true);
 const source=resolve(root,'output/skill-transition/PROBAR-LAS-18-PANTALLAS.html');
 records.push({kind:'web-source',file:source,sha256:await hash(source)});
 await page.goto(pathToFileURL(source).href);await page.waitForTimeout(900);await page.clock.install({time:new Date('2026-11-14T12:00:00Z')});await page.clock.pauseAt(new Date('2026-11-14T12:00:05Z'));
 for(const[id,label]of pilots){
  await page.locator('summary').evaluate(e=>e.parentElement.open=true);await page.locator('[data-actor]').selectOption('mia');await page.locator('summary').evaluate(e=>e.parentElement.open=false);
  const options=await page.locator('[data-skill-select] option').allTextContents();await page.locator('[data-skill-select]').selectOption({label:options.find(text=>text.endsWith(label))});
  await page.waitForTimeout(300);await page.clock.runFor(400);
  const before=resolve(out,'comparacion',id+'-web.png'),after=resolve(out,'comparacion',id+'-godot.png');
  await page.screenshot({path:before});await copyFile(resolve(out,id+'-ambient.png'),after);
  for(const file of[before,after])records.push({kind:'comparison',file,sha256:await hash(file),actor:'mia',skill:id,state:'ambient',timeMs:400,width:1280,height:720});
 }
}finally{await browser.close();}
for(const name of await readdir(out))if(name.endsWith('.png')||name.endsWith('-tests.json')){const file=resolve(out,name);records.push({kind:'evidence',file,sha256:await hash(file)});}
await writeFile(resolve(out,'manifest.json'),JSON.stringify({note:'Web reference versus native Godot port: same side camera, viewport, actor and ambient sample. UI separation is intentional. Not pixel-identical renderer output.',records},null,2));
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const comparisons=pilots.map(([id,label])=>visualComparison({before:'comparacion/'+id+'-web.png',after:'comparacion/'+id+'-godot.png',title:label+' · Web → Godot nativo',width:1280,height:720})).join('');
const cards=catalog.scenes.map((scene,i)=>`<article><h2>${String(i+1).padStart(2,'0')} · ${escape(scene.name)}</h2><img loading="lazy" src="${scene.id}-ambient.png" alt="Ambiente nativo de ${escape(scene.name)}"><p><a href="${scene.id}-success.png">Éxito</a> · <a href="${scene.id}-failure.png">Fallo</a></p></article>`).join('');
await writeFile(resolve(out,'index.html'),`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cargas nativas Godot · 18 habilidades</title><style>body{margin:0;background:#0b2025;color:#efdfbf;font:16px/1.5 system-ui}main{max-width:1150px;margin:auto;padding:24px}h1,h2{font-family:Georgia}a{color:#dfbd7c}img{max-width:100%;height:auto}section.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:16px}article{background:#152f32;padding:14px;border:1px solid #58706a}article h2{font-size:20px}</style><main><h1>Pantallas de carga nativas de Godot</h1><p>18 habilidades, 3 protagonistas, 576 dibujos originales reutilizados en seis atlas y dos demostraciones enfrentadas: equilibrio e interpretación. Abrir <strong>PROBAR-CARGAS-GODOT.cmd</strong> en la raíz de Dungeons para probar las animaciones, no solo estas capturas.</p><p>La presentación aparece al arrancar y en los cambios de mapa del Retiro. La escena se muestra en el proyector; el d20 y Continuar compacto, en los controles personales. Las pruebas de navegador conectan dos clientes al propio Godot, con presencia, propiedad de tirada, reconexión y salida compartida. La integración de cuentas/guardados del VTT web y la aceptación física siguen pendientes.</p><h2>Tres pilotos comparados</h2><p>Mía, cámara lateral fija, ventana 1280×720 y ambiente a 400 ms. La columna original es el visor web; la candidata es el renderer 2D nativo de Godot Forward+. El reparto de controles y la tipografía cambian por el encargo; no se presentan como píxeles o poses idénticos. Pulsa para superponer, usa teclado o amplía.</p>${comparisons}<h2>Controles personales conectados a Godot</h2><section class="grid"><article><h2>Protagonista</h2><img src="mobile-maria.png" alt="Trinity con su dado"></article><article><h2>Observador</h2><img src="mobile-mike.png" alt="Mike sin dado"></article><article><h2>D20 proyectado rodando</h2><img src="mobile-rolling-d20.png" alt="Veinte caras en rotación"></article></section><h2>Dos escenas enfrentadas</h2><section class="grid"><article><img src="contest-acrobatics.png" alt="Duelo de equilibrio"></article><article><img src="contest-performance.png" alt="Duelo musical"></article></section><h2>Catálogo nativo</h2><section class="grid">${cards}</section><p><a href="manifest.json">Originales y hashes</a> · <a href="mobile-tests.json">Comprobaciones de los controles</a> · <a href="integration.json">Integración de arranque y cambio de mapa</a>. Capturas reales del motor; aceptación artística y ensayo con dos teléfonos/proyector físicos pendientes.</p></main>${visualComparisonAssets()}</html>`);
console.log('Native Godot report: three overlays, 18 scene cards, both outcomes, two contests and connected mobile evidence.');
