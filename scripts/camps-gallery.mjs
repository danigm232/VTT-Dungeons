import {mkdir,writeFile,readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
const folder=path.resolve(process.env.CAMPS_REVIEW_OUTPUT??'output/camps-final');
const detail=folder.includes('camps-detail-20261011');
const scenes=[
 ['camp-a1-rooms','01 · Habitaciones A1'],
 ['camp-forest-pleamar','02 · Bosque camino a Pleamar'],
 ['camp-wreck-beach','03 · Playa del pecio'],
 ['camp-cliffs-observatory','04 · Acantilados del Observatorio'],
 ['camp-coastal-refuge','05 · Refugio costero de Pleamar']
];
const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
let report=[];try{report=JSON.parse(await readFile(path.join(folder,'visual-report.json'),'utf8'));}catch{}
const captures=await readdir(folder);
const capture=(id,phase,version='after')=>captures.find(file=>file===`${version}-${id}-${phase}-0-outside.png`||file===`${version}-${id}-${phase}-0-outside.jpg`);
const figure=(file,label)=>file?`<figure><a href="${esc(file)}"><img loading="lazy" src="${esc(file)}" alt="${esc(label)}"></a><figcaption>${esc(label)}</figcaption></figure>`:'';
const ownerLabel=file=>/mike/.test(file)?'Mike':/mia-/.test(file)?'Mia':/maria/.test(file)?'Trinity':
 ['Habitación libre','Tarak','Varnoth','Myla','Kobolds · oeste','Kobolds · este'][Number(file.match(/room-(\d)/)?.[1])-1]??'Celda';
const interiors=id=>'<details><summary>Detalle de interiores</summary><div class="pair">'+captures.filter(file=>file.startsWith('after-'+id+'-')&&file.endsWith('-interior.png')).map(file=>figure(file,ownerLabel(file)+(/-bed-/.test(file)?' · lecho':''))).join('')+'</div></details>';
const sections=scenes.map(([id,title])=>{
 const before=capture(id,'arrival','before');
 const comparison=before?figure(before,detail?'Antes · comienzo de esta revisión':'Antes · captura conservada'):'';
 const nightBefore=capture(id,'night','before');
 const phases=['dusk','dawn'].map((p,i)=>figure(capture(id,p),i?'Amanecer':'Anochecer')).join('');
 return `<section id="${id}"><h2>${title}</h2><div class="pair">${comparison}${figure(capture(id,'arrival'),'Ahora · día')}</div><details><summary>Luz de noche</summary><div class="pair">${figure(nightBefore,'Antes · noche')}${figure(capture(id,'night'),'Ahora · noche')}</div></details>${phases?'<details><summary>Transición de la luz</summary><div class="pair">'+phases+'</div></details>':''}${interiors(id)}<details><summary>Ocho ángulos de cámara</summary><div class="angles">${Array.from({length:8},(_,a)=>`<a href="after-${id}-night-${a}-outside.png">Vista ${a+1}</a>`).join('')}</div></details><a class="review" href="/scripts/camps-review.html?scene=${id}&amp;revision=after">Explorar este campamento</a></section>`;
}).join('');
const html=`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Campamentos · revisión de detalle</title><style>body{margin:0;background:#111c21;color:#ebe1c9;font:16px system-ui}main{max-width:1400px;margin:auto;padding:28px}h1,h2{font-family:Georgia,serif}h1{margin-bottom:8px}p{color:#bac5c4;line-height:1.6}nav,.angles{display:flex;gap:14px;flex-wrap:wrap}a{color:#e4bc77}section{padding:28px 0;border-top:1px solid #344448;margin-top:30px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}figure{margin:0;background:#1d3037;border:1px solid #405257;border-radius:8px;overflow:hidden}img{width:100%;display:block}figcaption{padding:12px}details{margin-top:18px}summary{cursor:pointer;padding:10px;background:#24363b}.angles{padding:16px}.review{display:inline-block;margin-top:20px}@media(max-width:720px){main{padding:16px}.pair{grid-template-columns:1fr}}</style><main><h1>Los cinco campamentos · detalle</h1><p>Comparaciones del render real de Babylon.js${detail?' · revisión del 11 de octubre de 2026':''}. Las vistas exteriores comparan el mismo encuadre antes y después. Los interiores se muestran más cerca para apreciar el mobiliario.</p><nav>${scenes.map(([id,title])=>`<a href="#${id}">${title}</a>`).join('')}<a href="playability.json">Prueba de juego</a><a href="visual-report.json">Datos de la revisión</a></nav>${sections}<p>${report.length} muestras exteriores registradas. Recursos, cuadrícula y navegación se comprueban por separado; estas imágenes muestran el resultado visual.</p></main></html>`;
await mkdir(folder,{recursive:true});await writeFile(path.join(folder,'gallery.html'),html);
console.log('Galería: http://127.0.0.1:4482/evidence/gallery.html');
