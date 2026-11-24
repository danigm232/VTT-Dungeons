import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {visualComparison,visualComparisonAssets} from './lib/visual-comparison.mjs';

const out='output/ficha-fase-0';
const original='output/ficha-auditoria-integral';
const art='prototypes/godot-shared/character_sheet/art/foundation';
const digest=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
const json=file=>JSON.parse(readFileSync(join(out,file),'utf8'));
const result=json('resultado.json'), icons=json('simbolos.json'), positions=json('geometria.json'), hint=json('ayuda.json');
if(result.failures.length||result.views!==15||hint.card[3]>=200||hint.card[1]+hint.card[3]>900)throw Error('Revisar los resultados en Godot');
const labels=['Resumen','Combate','Conjuros','Inventario','Historia'];
const sources=[], panels=[];
for(const size of [1600,1366,1920]){
  const height={1600:900,1366:768,1920:1080}[size];
  labels.forEach((name,i)=>{
    const page=name.toLowerCase();
    const old=size===1600?'0'+(i+1)+'-'+page:size===1366?(10+i)+'-compacto-'+page:'amplio-'+page;
    const id=size+'-'+page, prior=join(original,old+'.png'), current=join(out,id+'.png');
    for(const file of [prior,current]){
      const png=readFileSync(file);
      if(png.readUint32BE(16)!==size||png.readUint32BE(20)!==height)throw Error('Encuadre incompatible '+file);
      sources.push({file,width:size,height,sha256:digest(file)});
    }
    panels.push(`<section class="capture" data-page="${page}" data-width="${size}" ${size===1600&&i===0?'':'hidden'}>${visualComparison({before:'../ficha-auditoria-integral/'+old+'.png',after:id+'.png',title:name+' · '+size+' × '+height,width:size,height})}</section>`);
    if(!positions[id])throw Error('Falta medida '+id);
  });
}
const suites=['pecio','retiro','campamentos'].map(name=>{
  const log=readFileSync(join(out,'ficha-'+name+'.log'),'utf8');
  const stats=JSON.parse(log.match(/CHARACTER SHEET TEST (\{[^\n]+\})/)[1]);
  if(stats.failed)throw Error(name);
  return {name,...stats};
});
const linked=['lamina-iconos.png','grabados.jpg','estados.png','ayuda-accion.png','ayuda-detalle.png','detalle-accion.png','simbolos.json','geometria.json'];
for(const file of linked)if(!existsSync(join(out,file)))throw Error('Falta '+file);
const copies={};
for(const file of ['skin.gd','sheet_widgets.gd','illuminated_materials.gd','sheet_symbols.gd','manuscript_controls.gd','manuscript_hint.gd','header_finish.gd','character_sheet.gd','action_icons.gd','summary_composer.gd',...['binding.png','catalogue.json','gilt.png','symbols.png','vellum.jpg','transfer.svg','arrows.svg','rations.svg','robe.svg','ink.svg',...['coast','forest','keep','library','mountains','ruins','temple'].map(k=>'ink-'+k+'.png')].map(f=>'art/foundation/'+f)]){
  const sha=digest('prototypes/godot-shared/character_sheet/'+file);
  for(const {name} of suites)if(digest('prototypes/godot-'+name+'/character_sheet/'+file)!==sha)throw Error('Copia distinta '+name+' '+file);
  copies[file]=sha;
}
const inv='inventory/backpack_panel.gd';
for(const {name} of suites)if(digest('prototypes/godot-'+name+'/'+inv)!==digest('prototypes/godot-shared/'+inv))throw Error('Inventario distinto '+name);
const checks=[
 ['0.1','Un solo pergamino','El pliego y los paneles comparten coordenadas, fibra y variación de tono. El marco exterior y las cartelas conservan únicamente la ornamentación sobre alfa. Una sombra corta marca el contacto con el papel.'],
 ['0.2','Iconografía',`${icons.length} identificadores en la lámina, con comprobación del margen de cada textura. Las formas pintadas se recortan por su silueta. La daga y el hacha arrojadas tienen variantes propias. Se incluyen los indicadores nativos y los cuatro estados de navegación.`],
 ['0.3','Grabados','Biblioteca, castillo, costa, bosque, templo, montaña y ruinas. Una tinta castaña con densidad variable conserva el grano del pliego. Se verificaron los cuatro bordes transparentes en las siete imágenes.'],
 ['0.4','Ayudas y detalles',`La ayuda de la espada se abre al señalar la fila y cabe en ${Math.round(hint.card[2])} × ${Math.round(hint.card[3])} píxeles. Godot comprueba que deja libre la fila original. El clic abre el detalle persistente de la acción.`],
 ['0.5','Tipografía','Crimson Pro local. Ocho funciones tipográficas para identidad, títulos, subtítulos, encabezados, acciones, descripciones, números y estados. Los seis encabezados de la tabla llevan el peso de título.'],
 ['0.6','Estabilidad','En cada tamaño se midieron el marco, la cabecera, la navegación y las estadísticas al recorrer las cinco pestañas. Los cuatro rectángulos conservaron sus coordenadas y dimensiones.']
];
writeFileSync(join(out,'originales.json'),JSON.stringify({conditions:{scene:'Pecio main.tscn',actor:'Mike',role:'Jugador',time:'Día 1, mediodía, reloj pausado',weather:'Despejado',note:'Captor de Godot. El mar, el personaje en reposo y el corazón pueden encontrarse en otro fotograma.'},captures:sources,references:json('referencias.json'),families:copies,native:suites,assets:JSON.parse(readFileSync(join(art,'catalogue.json'),'utf8')),checks},null,2));
const css=`*{box-sizing:border-box}body{margin:0;background:#201c18;color:#f5ead8;font:17px/1.5 Georgia,serif}main{max-width:1500px;margin:auto;padding:32px clamp(16px,4vw,52px) 65px}h1,h2{line-height:1.12;color:#ffdfa0}h1{font-size:clamp(32px,5vw,57px);margin:4px 0 12px}h2{margin:36px 0 10px;font-size:28px}h3{color:#f0cd8c;margin:0}p{max-width:78ch}a{color:#f4d395}nav,fieldset{display:flex;align-items:center;flex-wrap:wrap;gap:8px}fieldset{border:none;padding:0;margin:16px 0}legend{font-size:15px;color:#d4b990}button,select{font:inherit;color:#f3e4cc;background:#392c23;border:1px solid #896a43;border-radius:5px;padding:6px 12px;cursor:pointer}button[aria-pressed=true]{background:#792f2b;border-color:#deb45f}button:focus-visible,a:focus-visible,select:focus-visible{outline:3px solid #eac675;outline-offset:2px}.pair{display:grid;gap:20px;grid-template-columns:1fr 1fr}figure{margin:0}img{max-width:100%;height:auto}.item{border-top:1px solid #6a543b;padding:14px 0}.item p{margin:5px 0}small{color:#e3c9a2}summary{cursor:pointer;font-weight:bold;color:#efd3a6;padding:10px 0}figcaption{margin:6px 0;color:#ebd7b6}.sample{background:#312720;padding:12px;border:1px solid #685239;border-radius:6px}.sample img{display:block;margin:auto}.vtt-comparison-controls a{color:#f4d395}footer{margin:24px 0;color:#e3c9a2}hr{border:0;border-top:1px solid #6a543b;margin:22px 0}@media(max-width:700px){.pair{grid-template-columns:1fr}}`;
const html=`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ficha de personaje · Fase 0</title><style>${css}</style><main><h1>Ficha de personaje</h1><p>Fase 0 · Materiales y controles compartidos de Godot</p>
<nav aria-label="Índice"><a href="#ficha">Capturas</a><a href="#ayuda">Ayuda y detalle</a><a href="#iconos">Iconografía</a><a href="#criterios">Verificación</a></nav>
<h2 id="ficha">La ficha de Mike en el Pecio</h2><p>Elige una pestaña y una resolución. Pulsa la imagen para alternar entre la versión anterior y la candidata con el mismo encuadre.</p>
<fieldset><legend>Pestaña</legend>${labels.map((n,i)=>`<button data-pick="${n.toLowerCase()}" aria-pressed="${i===0}">${n}</button>`).join('')}</fieldset>
<label>Resolución <select id="resolution"><option value="1600">1600 × 900</option><option value="1366">1366 × 768</option><option value="1920">1920 × 1080</option></select></label>
${panels.join('')}
<details><summary>Consultar tu referencia artística de esta pestaña</summary><figure><img id="reference" src="referencia-resumen.jpg" alt="Referencia artística de Resumen facilitada por el usuario"><figcaption>Referencia de diseño facilitada por el usuario. La captura jugable se muestra arriba.</figcaption></figure></details>
<h2 id="ayuda">De la ayuda breve al detalle</h2><div class="pair"><figure class="sample"><a href="ayuda-accion.png"><img src="ayuda-detalle.png" alt="Ayuda de Espada corta sobre pergamino"></a><figcaption>La ayuda aparece al señalar la fila. Pulsa para ver su posición dentro del juego.</figcaption></figure><figure class="sample"><a href="detalle-accion.png"><img src="detalle-accion.png" alt="Detalle persistente de Espada corta abierto en Godot"></a><figcaption>El clic abre el detalle con alcance, objetivo y daño.</figcaption></figure></div>
<h2 id="iconos">Grabados e iconografía</h2><a href="grabados.jpg"><img src="grabados.jpg" alt="Siete grabados impresos sobre el mismo papel"></a><p><a href="lamina-iconos.png">Abrir la lámina completa con nombres e identificadores</a> · <a href="simbolos.json">Consultar el origen y margen de cada símbolo</a></p><details><summary>Ver la lámina de símbolos</summary><img loading="lazy" src="lamina-iconos.png" alt="Catálogo de iconos pintados y vectoriales, seis indicadores y seis fotogramas del corazón"></details><figure><img loading="lazy" src="estados.png" alt="Pestaña en reposo, señalada, seleccionada y deshabilitada"></figure>
<h2 id="criterios">Verificación de los seis apartados</h2>${checks.map(([id,name,desc])=>`<section class="item"><h3>${id} · ${name}</h3><p>${desc}</p><small>Comprobado en la candidata</small></section>`).join('')}
<p>${suites.map(s=>s.name[0].toUpperCase()+s.name.slice(1)+' · '+s.passed+' comprobaciones').join(' / ')}. Cero fallos en las suites de ficha. La comparativa visual se capturó en Pecio. La valoración artística corresponde a la revisión en mesa.</p>
<footer><a href="geometria.json">Medidas de las quince vistas</a> · <a href="originales.json">Originales y procedencia</a> · <a href="../../docs/evidence/GODOT_CHARACTER_SHEET_20261116.md#fase-0-de-la-auditoría-crítica">Registro de la fase</a></footer></main>
${visualComparisonAssets()}<script>let page='resumen';const resolution=document.querySelector('#resolution');function update(){const ref=document.querySelector('#reference');ref.src='referencia-'+page+'.jpg';ref.alt='Referencia artística de '+page;document.querySelectorAll('.capture').forEach(s=>s.hidden=s.dataset.width!==resolution.value||s.dataset.page!==page);document.querySelectorAll('[data-pick]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.pick===page)))}resolution.onchange=update;document.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{page=b.dataset.pick;update()});document.querySelectorAll('.vtt-comparison-stage').forEach(button=>button.click());</script></html>`;
writeFileSync(join(out,'index.html'),html);
console.log(out+'/index.html',icons.length,'símbolos',suites.reduce((sum,s)=>sum+s.passed,0),'pruebas');
