import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {Script} from 'node:vm';

const root=process.cwd(),out=path.resolve(root,'output/visual-reference-library-20261030');
const catalogPath=path.resolve(root,'docs/design/VISUAL_REFERENCE_CATALOG.json');
const libraryPath=path.resolve(root,'docs/design/VISUAL_REFERENCE_LIBRARY.md');
const catalog=JSON.parse(fs.readFileSync(catalogPath,'utf8'));
if(catalog.references.length!==12||catalog.references.some((r,i)=>r.id!==`REF-${String(i+1).padStart(2,'0')}`||r.year<2018||!/^https:\/\//.test(r.source)))throw Error('Invalid modern-reference catalog');
fs.mkdirSync(path.join(out,'refs'),{recursive:true});
const copies=[
 ['output/d8-mirror-octopath-audit-20261018/refs/octopath-pueblo-relieve.png','octopath-town-user-reference.png'],
 ['output/d8-dinner-octopath-audit-20261020/refs/actual-20261020.png','our-dinner-20261020.png'],
 ['output/d8-dinner-octopath-audit-20261020/refs/actual-detalle-20261018.png','our-dinner-detail-20261018.png'],
 ['output/retreat-corrections3-20261028/evidence/opt-after-a3.png','our-retreat-dining-20261029.png'],
 ['output/retreat-corrections3-20261028/evidence/opt-after-grove.png','our-retreat-grove-20261029.png'],
 ['output/d8-mirror-immersive-20261020/candidate-arrival.png','our-mirror-20261021.png']
];
for(const [source,name] of copies)fs.copyFileSync(path.resolve(root,source),path.join(out,'refs',name));
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const visual=catalog.references.filter(r=>r.image);
const referenceMd=[
 '# Biblioteca de referencias visuales modernas del VTT','',
 'Revisión: 01/11/2026. Encargo iniciado el 30/10. Selección de 2018 en adelante; se cita la edición moderna, no la fecha de un port sin cambios de arte. Witchbrook se mantiene como material de desarrollo/promoción, no como juego publicado.','',
 'Leer junto a [dirección artística común](VISUAL_ART_DIRECTION.md), [roadmap visual](../VISUAL_ROADMAP.md) y [auditoría VA-01–VA-18](../audits/VISUAL_GAP_AUDIT_20261101.md). [Galería local](../../output/visual-reference-library-20261030/index.html). Los textos y enlaces están en el repositorio; la galería no es requisito para recuperar las instrucciones.','',
 '## Cómo usar las referencias','',
 'Cada referencia tiene una función. Elegir una principal por aspecto, comparar una imagen concreta y escribir qué se toma y qué se conserva. No producir un collage de estilos ni copiar mapas, assets o reglas. Las lecturas artísticas son nuestras inferencias de imágenes; las afirmaciones técnicas se limitan a lo que indica la fuente primaria.','',
 'Cinco familias tienen imágenes examinadas y evidencias disponibles (Octopath, Witchbrook, FFTactics 2025, Sea of Stars y Eastward); las otras siete son referencias documentales de estudio, no una revisión visual completa. No afirmar que se ha jugado, medido o inspeccionado todo un título.','',
 '## Selección moderna','',
 '| ID | Juego y edición | Función de referencia | Alcance de revisión |',
 '| --- | --- | --- | --- |',
 ...catalog.references.map(r=>`| ${r.id} | [${r.title}](${r.source}) · ${r.edition} | ${r.areas.join(', ')} | ${r.image?'Visual seleccionada':'Documental; detalle visual pendiente'} |`),'',
 ...catalog.references.flatMap(r=>[
  `## ${r.id} — ${r.title}`,'',
  `**Edición:** ${r.edition}. **Clasificación:** ${r.class}.`,'',
  `**Qué se ha comprobado:** ${r.review}.`,'',
  `**Qué estudiar:** ${r.study}`,'',
  `**Aplicación en nuestro VTT:** ${r.apply}`,'',
  `**Límite de la referencia:** ${r.avoid}`,'',
  `**Fuente primaria:** [página del desarrollador/editor o plataforma oficial](${r.source}).${r.releaseSource?` [Fecha de edición en ficha editorial](${r.releaseSource}).`:''}`,'',
  ...(r.image?[`**Evidencia local:** \\output\\visual-reference-library-20261030\\${r.image.replaceAll('/','\\')}. Captura de estudio; no recurso para el juego.`,'']:[])
 ]),
 '## Selección excluida y límites','',
 'Final Fantasy IX no forma parte de la selección principal moderna: se conserva únicamente como antecedente de la conversación anterior. Final Fantasy Tactics se estudia en la edición Enhanced 2025 y Live A Live en su remake 2022, sin atribuir a las versiones originales el acabado actual. Star Ocean y Sea of Stars tienen técnicas distintas: la biblioteca no llama HD-2D a todos los títulos.','',
 'Las fuentes oficiales, imágenes comerciales y capturas del usuario no son assets CC0. No se han incorporado a public/art ni al runtime; esta entrega no descarga un kit comercial para usarlo en el juego. Nuevos recursos propios/reutilizados requieren su registro de procedencia y licencia. La biblioteca no demuestra el rendimiento o implementación interna de un juego por una captura.',''
].join('\n');
fs.writeFileSync(libraryPath,referenceMd);

const docFiles=['docs/design/VISUAL_ART_DIRECTION.md','docs/VISUAL_ROADMAP.md','docs/audits/VISUAL_GAP_AUDIT_20261101.md'];
const masterPath=path.resolve(root,'ROADMAP_V1.md');
const masterSource=fs.readFileSync(masterPath,'utf8');
const historyMarker='## 7. Contratos del Pecio y registro de entregas anteriores';
if(!masterSource.includes(historyMarker))throw Error('Missing active/master roadmap boundary');
const masterActive=masterSource.split(historyMarker)[0];
const relativeDoc=(url,source)=>/^(https?:|#)/.test(url)?url:path.relative(out,path.resolve(path.dirname(source),decodeURI(url))).replaceAll('\\','/');
function markdown(content,source){
 // The gallery's plan is a view of the canonical master, never a second
 // hand-maintained phase table. Keep the visual annex as a linked concordance.
 if(path.resolve(source)===path.resolve(root,docFiles[1])){content=masterActive;source=masterPath;}
 const lines=content.split(/\r?\n/),html=[];let para=[],list=null;
 const inline=s=>s.split(/(`[^`]+`|\[[^\]]+\]\([^\)]+\)|\*\*[^*]+\*\*)/g).map(t=>{
  if(t.startsWith('`'))return `<code>${esc(t.slice(1,-1))}</code>`;
  if(t.startsWith('**'))return `<strong>${esc(t.slice(2,-2))}</strong>`;
  const m=t.match(/^\[([^\]]+)\]\(([^\)]+)\)$/);return m?`<a href="${esc(relativeDoc(m[2],source))}">${esc(m[1])}</a>`:esc(t);
 }).join('');
 const flush=()=>{if(para.length){html.push(`<p>${inline(para.join(' '))}</p>`);para=[];}};
 const end=()=>{if(list){html.push(`</${list}>`);list=null;}};
 for(let i=0;i<lines.length;i++){
  const line=lines[i];if(!line.trim()){flush();end();continue;}
  const h=line.match(/^(#{1,3}) (.+)$/);if(h){flush();end();const id=h[2].match(/^(VA-\d+)/)?.[1]?.toLowerCase();html.push(`<h${h[1].length+1}${id?` id="${id}"`:''}>${inline(h[2])}</h${h[1].length+1}>`);continue;}
  if(line.startsWith('|')&&lines[i+1]?.match(/^\|[\s:|\-]+\|$/)){
   flush();end();const cells=s=>s.trim().replace(/^\||\|$/g,'').split('|').map(t=>t.trim()),head=cells(line),rows=[];i++;while(lines[i+1]?.startsWith('|'))rows.push(cells(lines[++i]));
   html.push(`<div class="scroll"><table><thead><tr>${head.map(c=>`<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);continue;
  }
  const item=line.match(/^(?:([-*]) |\d+\. )(.+)$/);if(item){flush();const type=item[1]?'ul':'ol';if(list!==type){end();list=type;html.push(`<${type}>`);}html.push(`<li>${inline(item[2])}</li>`);continue;}
  end();para.push(line);
 }
 flush();end();return html.join('\n');
}
const figure=(src,caption)=>`<figure><a href="${esc(src)}" target="_blank" rel="noopener"><img loading="lazy" src="${esc(src)}" alt="${esc(caption)}"></a><figcaption>${caption}</figcaption></figure>`;
const gallery=catalog.references.map(r=>`<article class="ref" data-search="${esc([r.title,...r.areas,r.id].join(' ').toLowerCase())}"><div class="ref-head"><small>${r.id} · ${esc(r.edition)}</small><h3>${esc(r.title)}</h3><span class="badge">${r.image?'Imagen examinada':'Referencia documental · estudio visual pendiente'}</span></div>${r.image?figure(r.image,`${r.id} · Evidencia de estudio. ${esc(r.review)}.`):'<p class="pending">Consulta la fuente oficial para elegir una escena comparable antes de aplicar un criterio artístico específico. No se muestra una captura inventada.</p>'}<div class="ref-body"><p><b>Clasificación:</b> ${esc(r.class)}.</p><p><b>Qué estudiar:</b> ${esc(r.study)}</p><p><b>Aplicar:</b> ${esc(r.apply)}</p><p><b>Conservar / evitar:</b> ${esc(r.avoid)}</p><a href="${esc(r.source)}" target="_blank" rel="noopener">Abrir fuente primaria</a></div></article>`).join('');
const html=`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Referencias modernas y roadmap visual compartido</title><style>
:root{color-scheme:dark;--bg:#111b20;--panel:#1a2a30;--line:#405358;--ink:#e8eeea;--muted:#b2c4bf;--gold:#edc78e;--link:#95d7ce}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.65 system-ui,Segoe UI,sans-serif}header{padding:42px max(22px,5vw);background:linear-gradient(110deg,#263c38,#1b2436);border-bottom:1px solid var(--line)}header p{max-width:1060px;color:var(--muted)}h1{font:clamp(30px,5vw,50px)/1.13 Georgia,serif;max-width:1150px;margin:15px 0 23px}small,.eyebrow{color:var(--gold);font-size:12px;letter-spacing:.06em}main{max-width:1540px;margin:auto;padding:25px clamp(18px,4vw,58px) 60px}h2{font:30px/1.25 Georgia,serif;color:var(--gold);margin:40px 0 18px}h3{font-size:22px;color:#bfe3d4;margin:12px 0}h4{font-size:19px;color:#bfe3d4;margin:28px 0 12px}a{color:var(--link);text-underline-offset:3px}p{max-width:1180px}code{font:13px/1.5 Consolas,monospace;background:#2b3b41;padding:2px 4px;overflow-wrap:anywhere}strong,b{color:#fff0d4}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px}.ref{background:var(--panel);border:1px solid var(--line);border-radius:9px;overflow:hidden}.ref-head,.ref-body{padding:18px 20px}.ref-body{font-size:14px}.ref figure{border:none;border-radius:0}.ref p{margin:10px 0}.badge{display:inline-block;font-size:12px;border:1px solid #73978c;padding:4px 9px;border-radius:5px;color:var(--muted)}figure{margin:0;border:1px solid var(--line);background:#122127;border-radius:8px;overflow:hidden}figure img{display:block;width:100%;height:auto;max-height:420px;object-fit:contain;background:#0d1519}figcaption{font-size:13px;padding:12px 15px;color:var(--muted)}.pending{padding:18px 20px;color:var(--muted);border-top:1px solid var(--line);border-bottom:1px solid var(--line);background:#132329}.note{padding:16px 20px;border-left:3px solid var(--gold);background:#26352f;margin:20px 0}.toolbar{display:flex;gap:12px;flex-wrap:wrap;margin:22px 0}.toolbar a{padding:7px 12px;border:1px solid #75938b;border-radius:5px;text-decoration:none}label{display:block;font-size:14px;color:var(--muted);margin:20px 0}input{display:block;padding:10px 13px;max-width:650px;width:100%;font:inherit;background:#22383d;color:var(--ink);border:1px solid #6d8f85;border-radius:5px;margin-top:8px}.scroll{overflow:auto;margin:20px 0 28px;border:1px solid var(--line);border-radius:7px}table{width:100%;border-collapse:collapse;font-size:14px}th,td{padding:12px;text-align:left;vertical-align:top;border-bottom:1px solid var(--line)}th{background:#29413f;color:#ffe8bf}td{min-width:130px}li{margin:8px 0}.document{border-top:1px solid var(--line);padding-top:10px;margin-top:35px}.document>h2:first-child{font-size:32px}.ref[hidden]{display:none!important}footer{border-top:1px solid var(--line);padding-top:22px;margin-top:40px;color:var(--muted);font-size:14px}@media(max-width:800px){.grid{grid-template-columns:1fr}header{padding:28px 20px}main{padding:20px 16px 40px}.ref-head,.ref-body{padding:16px}}
</style><header><div class="eyebrow">D&D Immersive Engine · investigación iniciada el30/10 · revisión01/11/2026</div><h1>Referencias modernas para mejorar nuestros mapas, conservándolos</h1><p>Doce juegos/ediciones de2018en adelante. Cada uno aporta un criterio concreto: materiales, plantas, muebles, luz, profundidad, personajes o lectura táctica. La biblioteca se conecta con el roadmap que leen los chats.</p><span class="badge">Investigación y planificación · sin gráficos nuevos desplegados</span></header><main><div class="note"><b>La prioridad es una familia visual coherente.</b> Validar suelo, muro, mueble, plantas, personaje y luz juntos en una pequeña parte de la escena existente. Mantener distribución, funciones y trabajo ya aprobado. No sustituir mapas por una reinterpretación.</div><div class="toolbar"><a href="#biblioteca">12 referencias</a><a href="#comparacion">Qué vemos en nuestro juego</a><a href="#roadmap">Roadmap compartido</a><a href="#direccion">Dirección artística</a><a href="#auditoria">18 puntos de mejora</a></div><section id="comparacion"><h2>Comparación con nuestra base disponible</h2><div class="grid">${figure('refs/our-retreat-dining-20261029.png','NUESTRO · Retiro/comedor, captura del pase documentado el29/10. Convivencia de personaje ilustrado, muebles simples y piedra detallada. El mapa conserva sus avances; esta foto no es una auditoría de todos los ángulos.')}${figure('refs/witchbrook-interior-preview-2026.png','REFERENCIA · Witchbrook, imagen oficial de decoración examinada en navegador. Estudiamos muebles, objetos agrupados y familia de materiales; no se propone cambiar nuestro comedor por su casa.')}${figure('refs/our-retreat-grove-20261029.png','NUESTRO · Bosquete reciente del Retiro. La vegetación ya existe; se revisan masas, escala de detalle y contactos, sin repetir su construcción.')}${figure('refs/witchbrook-garden-preview-2026.png','REFERENCIA · Witchbrook, jardín promocional. Estudiamos bordes y agrupación de plantas; el Retiro conserva el carácter mediterráneo autorizado.')}</div><details><summary>Otras muestras nuestras, conservadas con su fecha</summary><div class="grid">${figure('refs/our-dinner-20261020.png','Cena ·20/10. El patio y su distribución son la base a mejorar.')}${figure('refs/our-dinner-detail-20261018.png','Cena ·18/10. Detalle histórico; revalidar contra la candidata actual.')}${figure('refs/our-mirror-20261021.png','Espejo ·21/10. Cueva y ambiente implementados; no se declara que este encuadre represente todos los focos.')}</div></details></section><section id="biblioteca"><h2>Biblioteca moderna y función de cada referencia</h2><p>Cinco familias con imágenes seleccionadas examinadas; siete identificadas documentalmente, con estudio visual detallado pendiente. Las clasificaciones técnicas confirmadas se atribuyen a su fuente; las lecturas artísticas son observaciones/propuestas nuestras. Witchbrook sigue identificado como material promocional.</p><label>Buscar juego o aspecto<input type="search" id="refSearch" placeholder="Ej.: madera, vegetación, Final Fantasy, iluminación"></label><div class="grid" id="refGrid">${gallery}</div><p class="note">Las imágenes de otros juegos permanecen en esta evidencia de estudio local, con fuente. No se han añadido a los recursos del VTT ni se consideran libres. Las ediciones antiguas no se etiquetan como modernas por un port.</p></section><section id="roadmap" class="document">${markdown(fs.readFileSync(path.resolve(root,docFiles[1]),'utf8'),path.resolve(root,docFiles[1]))}</section><section id="direccion" class="document">${markdown(fs.readFileSync(path.resolve(root,docFiles[0]),'utf8'),path.resolve(root,docFiles[0]))}</section><section id="auditoria" class="document">${markdown(fs.readFileSync(path.resolve(root,docFiles[2]),'utf8'),path.resolve(root,docFiles[2]))}</section><footer>Fuentes primarias en cada ficha; evidencias nuestras fechadas y procedencia conservada. No hay un después generado, nueva ejecución del juego, benchmark o aceptación física/artística. La guía no reordena el roadmap técnico del Retiro ni sustituye los contratos de Cena/Pecio.</footer><script>const normalizeText=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();document.getElementById('refSearch').addEventListener('input',event=>{const query=normalizeText(event.target.value.trim());for(const card of document.querySelectorAll('.ref'))card.hidden=!normalizeText(card.textContent).includes(query);});</script></main></html>`;
fs.writeFileSync(path.join(out,'index.html'),html);

const links=[],ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
for(const m of html.matchAll(/\b(?:src|href)="([^"]+)"/g)){
 const url=m[1].replaceAll('&amp;','&');if(/^https?:/.test(url))continue;
 links.push({url,exists:url.startsWith('#')?ids.includes(url.slice(1)):fs.existsSync(path.resolve(out,decodeURI(url.split('#')[0])))});
}
for(const file of [libraryPath,...docFiles.map(p=>path.resolve(root,p)),masterPath])for(const m of (file===masterPath?masterActive:fs.readFileSync(file,'utf8')).matchAll(/\[[^\]]+\]\(([^\)]+)\)/g)){
 const url=m[1];if(/^(https?:|#)/.test(url))continue;links.push({document:path.relative(root,file),url,exists:fs.existsSync(path.resolve(path.dirname(file),decodeURI(url.split('#')[0])))});
}
const checks={revision:catalog.revision,generatedAt:new Date().toISOString(),references:catalog.references.length,modern2018Plus:catalog.references.every(r=>r.year>=2018),visualFamilies:visual.length,documentaryFamilies:catalog.references.length-visual.length,auditItems:[...html.matchAll(/id="va-\d+"/g)].length,images:[...html.matchAll(/<img /g)].length,localLinks:links.length,brokenLinks:links.filter(l=>!l.exists),duplicateIds:ids.filter((id,i)=>ids.indexOf(id)!==i),scope:'Documentation, primary-source research, existing images and browser observations only. No game tests, deployment, new game art, physical-device or artistic acceptance.'};
for(const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new Script(m[1]);
const manifest=fs.readdirSync(path.join(out,'refs')).map(name=>{const bytes=fs.readFileSync(path.join(out,'refs',name));return{name,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};});
fs.writeFileSync(path.join(out,'image-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify(checks,null,2)+'\n');
if(checks.brokenLinks.length||checks.duplicateIds.length||checks.auditItems!==18)throw Error(JSON.stringify(checks));
console.log(JSON.stringify(checks,null,2));
