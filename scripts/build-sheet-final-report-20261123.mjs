import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync,copyFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {visualComparison,visualComparisonAssets} from './lib/visual-comparison.mjs';

const out='output/ficha-definitiva-20261123';
const baseDir='output/ficha-auditoria-integral';
const codexF0Dir='output/ficha-fase-0';
const digest=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
const esc=v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

// Copy immutable base, codex-f0, and conceptual references into our report folder so all links are self-contained.
mkdirSync(join(out,'phases/base'),{recursive:true});
mkdirSync(join(out,'phases/fase-0-codex'),{recursive:true});
mkdirSync(join(out,'references'),{recursive:true});

const TABS=[
  {key:'resumen',label:'Resumen',base1600:'01-resumen.png',base1366:'10-compacto-resumen.png',base1920:'amplio-resumen.png',ref:'referencia-resumen.jpg'},
  {key:'combate',label:'Combate',base1600:'02-combate.png',base1366:'11-compacto-combate.png',base1920:'amplio-combate.png',ref:'referencia-combate.jpg'},
  {key:'conjuros',label:'Conjuros',base1600:'03-conjuros.png',base1366:'12-compacto-conjuros.png',base1920:'amplio-conjuros.png',ref:'referencia-conjuros.jpg'},
  {key:'inventario',label:'Inventario',base1600:'04-inventario.png',base1366:'13-compacto-inventario.png',base1920:'amplio-inventario.png',ref:'referencia-inventario.jpg'},
  {key:'historia',label:'Historia',base1600:'05-historia.png',base1366:'14-compacto-historia.png',base1920:'amplio-historia.png',ref:'referencia-historia.jpg'}
];

for(const t of TABS){
  copyFileSync(join(baseDir,t.base1600),join(out,'phases/base/1600-'+t.key+'.png'));
  copyFileSync(join(baseDir,t.base1366),join(out,'phases/base/1366-'+t.key+'.png'));
  copyFileSync(join(baseDir,t.base1920),join(out,'phases/base/1920-'+t.key+'.png'));
  copyFileSync(join(codexF0Dir,'1600-'+t.key+'.png'),join(out,'phases/fase-0-codex/1600-'+t.key+'.png'));
  copyFileSync(join(codexF0Dir,t.ref),join(out,'references/'+t.ref));
}

const PHASES=[
  {id:'base',short:'Antes',title:'Base previa (auditoría anterior)'},
  {id:'fase-0-codex',short:'F0 Codex',title:'Fase 0 (punto de partida Codex)'},
  {id:'fase-0',short:'F0 Corregida',title:'Fase 0 corregida (CA, iconos, ayuda y detalle)'},
  {id:'fase-1',short:'Fase 1',title:'Fase 1 · Resumen rápido (sin scroll, 6 acciones, nivel)'},
  {id:'fase-2',short:'Fase 2',title:'Fase 2 · Combate (tabla, reacciones y Libro de acciones)'},
  {id:'fase-3',short:'Fase 3',title:'Fase 3 · Conjuros (repertorio interactivo y filtros)'},
  {id:'fase-4',short:'Fase 4',title:'Fase 4 · Inventario en ficha y mochila sincronizada'},
  {id:'fase-5',short:'Fase 5',title:'Fase 5 · Historia editorial en 3 columnas y capitulares'},
  {id:'fase-7',short:'Fases 6–7',title:'Fases 6–7 · Subida de nivel, edición y validación integral'},
  {id:'fase-8',short:'F8 Pulido',title:'Fase 8 · Pulido artístico (retrato solapado, sombreado, corona oscura, multiply y biografía editable)'}
];

const originals=[];
function registerFile(relPath,label){
  const full=join(out,relPath);
  if(!existsSync(full))throw Error('Falta archivo de informe: '+full);
  const buf=readFileSync(full);
  const isPng=relPath.endsWith('.png');
  const width=isPng?buf.readUInt32BE(16):null;
  const height=isPng?buf.readUInt32BE(20):null;
  originals.push({file:relPath,label,width,height,sha256:digest(full)});
  return {relPath,width,height};
}

function buildPhaseStepper(tab){
  const steps=PHASES.map(p=>{
    const rel=`phases/${p.id}/1600-${tab.key}.png`;
    registerFile(rel,`${tab.label} · ${p.title}`);
    return {id:p.id,short:p.short,title:p.title,src:rel};
  });
  registerFile(`references/${tab.ref}`,`Referencia artística · ${tab.label}`);
  const imgs=steps.map((s,i)=>`<img src="${esc(s.src)}" alt="${esc(tab.label+' — '+s.title)}" width="1600" height="900" loading="${i===0||i===steps.length-1?'eager':'lazy'}" decoding="async" data-step-img="${i}" ${i===steps.length-1?'class="is-active"':''}>`).join('');
  const pills=steps.map((s,i)=>`<button type="button" class="phase-pill" data-step-jump="${i}" aria-pressed="${i===steps.length-1}">${esc(s.short)}</button>`).join('');
  const origLinks=steps.map(s=>`<a href="${esc(s.src)}" target="_blank" rel="noopener">${esc(s.short)}</a>`).join(' · ');
  return `
<article class="stepper-card" data-phase-stepper data-tab="${esc(tab.key)}" data-title="${esc(tab.label+' · Evolución por fases (1600 × 900)')}" data-index="${steps.length-1}" data-count="${steps.length}" data-labels='${esc(JSON.stringify(steps.map(s=>s.title)))}' data-shorts='${esc(JSON.stringify(steps.map(s=>s.short)))}'>
  <header class="stepper-head">
    <h3>${esc(tab.label)} <span class="muted">· 1600 × 900 · Haz clic sobre la imagen para avanzar fase a fase</span></h3>
    <span class="phase-counter" data-step-counter>${steps.length} / ${steps.length}</span>
  </header>
  <button type="button" class="stepper-stage" data-step-next aria-label="Siguiente fase de ${esc(tab.label)}">
    ${imgs}
    <span class="stepper-badge" data-step-badge>${esc(steps[steps.length-1].short)} · ${esc(steps[steps.length-1].title)}</span>
  </button>
  <div class="stepper-pills" role="group" aria-label="Seleccionar fase de ${esc(tab.label)}">${pills}</div>
  <div class="stepper-toolbar">
    <button type="button" data-step-prev>‹ Fase anterior</button>
    <button type="button" data-step-next-btn>Siguiente fase ›</button>
    <button type="button" data-step-toggle-ends>Alternar Antes / Final</button>
    <button type="button" data-step-enlarge>Ampliar / Zoom</button>
    <span class="orig-links">Originales: ${origLinks}</span>
  </div>
  <details class="ref-drawer">
    <summary>Consultar referencia artística de ${esc(tab.label)} (aparte de la comparativa exacta)</summary>
    <figure><img src="references/${esc(tab.ref)}" alt="Referencia conceptual de ${esc(tab.label)}" loading="lazy"><figcaption>Referencia de diseño aportada por el usuario. No se superpone como captura del motor.</figcaption></figure>
  </details>
</article>`;
}

const stepperHtml=TABS.map(buildPhaseStepper).join('\n');

// Multi-resolution exact Before/After comparisons (1366x768 & 1920x1080) using shared scripts/lib/visual-comparison.mjs
const multiResHtml=[1366,1920].map(w=>{
  const h=w===1366?768:1080;
  const cards=TABS.map(t=>{
    const before=`phases/base/${w}-${t.key}.png`;
    const after=`phases/fase-8/${w}-${t.key}.png`;
    registerFile(before,`${t.label} Antes ${w}x${h}`);
    registerFile(after,`${t.label} Final Fase 8 ${w}x${h}`);
    return `<div class="res-item" data-res-width="${w}" data-res-tab="${t.key}">${visualComparison({before,after,title:`${t.label} · ${w} × ${h} (Antes ↔ Fase 8)`,width:w,height:h})}</div>`;
  }).join('');
  return `<div class="res-group" data-res-group="${w}" ${w===1366?'':'hidden'}>${cards}</div>`;
}).join('');

// Modals & new systems gallery
const MODALS=[
  ['phases/fase-8/1600-ayuda-accion.png','Ayuda breve sobre pergamino (Fase 0.4 + 8)','Tooltip ilustrado con icono, título, separador dorado y posicionamiento sin tapar al héroe.'],
  ['phases/fase-8/1600-detalle-accion.png','Ventana de detalle ornamentada (Fase 0.4 + 8)','Cartela carmesí con relieve, tabla estructurada de reglas y botón dorado «Preparar esta acción».'],
  ['phases/fase-8/1600-libro-acciones.png','Libro de todas las acciones (Fase 2.3 + 8)','Buscador, filtros por categoría (Todas, Ataques, Acciones, Adicionales, Reacciones, Magia) e inspector real conectado al motor.'],
  ['phases/fase-8/1600-historia-editar-bio.png','Biografía editable en línea dentro de Historia (Fase 8)','Botón «Editar» integrado en la cartela de Biografía: permite editar historia personal, motivaciones y notas con guardado directo en el actor.'],
  ['phases/fase-8/1600-progresion.png','Ventana de Progresión (Fase 6.1 + 8)','Abierta desde la medalla Nv. 1 de cabecera: desbloqueos por clase/edición y acceso a subida de nivel.'],
  ['phases/fase-8/1600-asistente-nivel.png','Asistente guiado de subida de nivel (Fase 6.3 + 8)','Reglas D&D 5e 2024/2014, multiclase validada, PG fijo/dado físico, elecciones obligatorias y vista previa Antes → Después.'],
  ['phases/fase-8/1600-editar.png','Edición de mesa DM y crónica (Fase 6 + 8)','Edición autoritativa de CA, velocidad, historia personal, motivaciones, notas, PG y acceso a Progresión.'],
  ['phases/fase-8/1600-mochila-externa.png','Mochila independiente del VTT (Fase 4.4)','Acceso rápido oscuro sincronizado con la misma instancia InventoryBridge e iconografía unificada.']
];
const modalsHtml=MODALS.map(([src,title,desc])=>{
  registerFile(src,title);
  return `<figure class="gallery-card"><a href="${esc(src)}" target="_blank" rel="noopener"><img src="${esc(src)}" alt="${esc(title)}" width="1600" height="900" loading="lazy"></a><figcaption><strong>${esc(title)}</strong><br>${esc(desc)}</figcaption></figure>`;
}).join('');

// Multi-character gallery (Mia & Trinity)
const HEROES=[
  ['phases/fase-8/1600-mia-resumen.png','Mia · Resumen (Clériga enana · D&D 2024 · Fase 8)'],
  ['phases/fase-8/1600-mia-combate.png','Mia · Combate (Maza, Hacha, Llama sagrada, Palabra de curación)'],
  ['phases/fase-8/1600-mia-conjuros.png','Mia · Conjuros (Repertorio divino interactivo)'],
  ['phases/fase-8/1600-mia-historia.png','Mia · Historia (3 columnas editoriales, grabado multiply y biografía editable)'],
  ['phases/fase-8/1600-maria-resumen.png','Trinity · Resumen (Pícara mediana · módulo sin magia adaptable · Fase 8)'],
  ['phases/fase-8/1600-maria-combate.png','Trinity · Combate (Arco corto, dagas, Pericia en Sigilo +7)'],
  ['phases/fase-8/1600-maria-conjuros.png','Trinity · Recursos y capacidades (sin inventar magia)'],
  ['phases/fase-8/1600-maria-historia.png','Trinity · Historia (Crónica criminal, grabado multiply y biografía editable)']
];
const heroesHtml=HEROES.map(([src,title])=>{
  registerFile(src,title);
  return `<figure class="gallery-card"><a href="${esc(src)}" target="_blank" rel="noopener"><img src="${esc(src)}" alt="${esc(title)}" width="1600" height="900" loading="lazy"></a><figcaption><strong>${esc(title)}</strong></figcaption></figure>`;
}).join('');

// Read test suite logs if present
const logDir=join(out,'logs');
const suites=[];
for(const [file,label] of [
  ['pecio-sheet.log','Pecio · Ficha de personaje (Fases 0–8)'],
  ['retiro-sheet.log','Retiro · Ficha de personaje (Fases 0–8)'],
  ['campamentos-sheet.log','Campamentos · Ficha de personaje (Fases 0–8)'],
  ['pecio-backpack.log','Pecio · Mochila compartida'],
  ['retiro-backpack.log','Retiro · Mochila compartida'],
  ['pecio-combat.log','Pecio · Reglas de combate'],
  ['pecio-interfaces.log','Pecio · Interfaces VTT']
]){
  const p=join(logDir,file);
  if(!existsSync(p))continue;
  const txt=readFileSync(p,'utf8');
  let summary='Ejecutado';
  let ok=true;
  const mSheet=txt.match(/CHARACTER SHEET TEST (\{[^\n]+\})/);
  const mBag=txt.match(/BACKPACK (\d+) PASS \/ (\d+) FAIL/);
  const mPass=txt.match(/(\d+)\s+PASS(?:ED)?\s*[,\/]\s*(\d+)\s+FAIL/i);
  const mRules=txt.match(/COMBAT RULES (\d+)\/(\d+)/i);
  if(mSheet){const s=JSON.parse(mSheet[1]);summary=`${s.passed} PASS / ${s.failed} FAIL`;ok=s.failed===0;}
  else if(mBag){summary=`${mBag[1]} PASS / ${mBag[2]} FAIL`;ok=Number(mBag[2])===0;}
  else if(mPass){summary=`${mPass[1]} PASS / ${mPass[2]} FAIL`;ok=Number(mPass[2])===0;}
  else if(mRules){summary=`${mRules[1]}/${mRules[2]} PASS`;ok=mRules[1]===mRules[2];}
  else {
    const last=txt.trim().split(/\r?\n/).filter(l=>/pass|fail|ok|verified/i.test(l)).slice(-1)[0];
    if(last)summary=last.trim();
  }
  suites.push({file:'logs/'+file,label,summary,ok});
}

const MATRIX=[
  ['Iconos','Ninguno cortado, mal centrado o tapado; CA sin solapar filigrana','Completado','Catálogo 93 símbolos + CA separado con escudo + botones de cabecera en nogal/latón.'],
  ['Pergamino','Material continuo y marcos transparentes con sombra de contacto','Completado','Pliego continuo vellum.jpg + marcos gilt/binding sobre alfa + OptionButton en pergamino.'],
  ['Ilustraciones','Sin fondos rectangulares ni efecto pegatina','Completado','Shader GPU ink_engraving.gdshader (blend_mul + grano de papel + desvanecido orgánico) en Resumen, Combate, Conjuros e Historia.'],
  ['Pulido artístico (Fase 8)','Retrato sobresaliendo, relieve en cenefas, corona oscura de pestañas y Biografía editable','Completado','Medallón solapado sobre la cartela de nombre, sombras 3D en cenefas/marcos, caja de nogal oscuro para pestañas, friso/filigrana y Biografía editable en línea.'],
  ['Tipografía','Títulos, cabeceras y columnas correctamente jerarquizados','Completado','Crimson Pro OpenType (peso real 650/770), encabezados de tabla en negrita.'],
  ['Arco central','Recorte correcto, sprite nítido, idle vivo, sombra y contacto','Completado','Espejo 3D read-only en tiempo real con NEAREST y sombra de contacto.'],
  ['Tooltips y detalles','Ornamentados, legibles, sin tapar al héroe ni tooltips grises','Completado','ManuscriptHint sobre pergamino bajo la fila + SheetDetail con cartela carmesí.'],
  ['Resumen (Fase 1)','Consulta inmediata sin scroll a 1600×900 y 1366×768','Completado','6 acciones sin truncar, Percepción priorizada, nivel interactivo, recursos adaptables.'],
  ['Combate (Fase 2)','Acciones completas, claras, interactivas + Libro de acciones','Completado','Tabla seleccionable por fila completa, 10 acciones generales, Reacciones/Concentración y Libro ampliado.'],
  ['Conjuros (Fase 3)','Repertorio con filtros, inspector completo y acciones reales','Completado','Filtros + búsqueda, escuela/componentes/escalado, Preparar, Lanzar, Ritual y Concentración.'],
  ['Inventario (Fase 4)','Sincronización de datos única con la mochila independiente','Completado','Misma instancia InventoryBridge/BackpackPanel, Equipo en uso, acciones filtradas por tipo.'],
  ['Historia (Fase 5)','Composición editorial en 3 columnas sin inventar lore','Completado','Identidad/Origen + Rasgos por procedencia + Biografía con capitular y estado pendiente honesto.'],
  ['Subida de nivel (Fase 6)','Asistente D&D 2024/2014 con elecciones, vista previa y guardado','Completado','Probado en Mike (1→4, subclase, ASI, multiclase), Mia (+1 Enana, Canalizar), Trinit (Acción astuta), deshacer y persistencia.'],
  ['Validación artística y física','Aceptación subjetiva en mesa y prueba táctil física','Pendiente','Separada de las pruebas técnicas y de la revisión visual en Godot.']
];

const matrixHtml=MATRIX.map(([el,req,st,notes])=>`<tr><td><strong>${esc(el)}</strong></td><td>${esc(req)}</td><td><span class="status status-${st.toLowerCase()}">${esc(st)}</span></td><td>${esc(notes)}</td></tr>`).join('');
const suitesHtml=suites.map(s=>`<tr><td>${esc(s.label)}</td><td><span class="status ${s.ok?'status-completado':'status-parcial'}">${esc(s.summary)}</span></td><td><a href="${esc(s.file)}" target="_blank" rel="noopener">${esc(s.file)}</a></td></tr>`).join('');

writeFileSync(join(out,'originales.json'),JSON.stringify({
  generated_at:new Date().toISOString(),
  conditions:{scene:'prototypes/godot-pecio/scenes/main.tscn',camera:'Inicial C1',time:'Día 1 · 12:00 (pausado)',weather:'Despejado',renderer:'Godot 4.7.2 Forward+ Vulkan (NVIDIA GeForce MX350)'},
  phases:PHASES,
  suites,
  originals
},null,2));

const css=`
*{box-sizing:border-box}
body{margin:0;background:#191512;color:#f4e8d4;font:16px/1.5 Georgia,"Times New Roman",serif}
main{max-width:1520px;margin:auto;padding:28px clamp(16px,3.5vw,44px) 72px}
h1,h2,h3{color:#f5d08a;line-height:1.18}
h1{font-size:clamp(28px,4.2vw,48px);margin:0 0 8px}
h2{font-size:26px;margin:38px 0 12px;border-bottom:1px solid #6a5136;padding-bottom:6px}
h3{font-size:20px;margin:0}
p{max-width:86ch}
a{color:#f3cf88}
.muted{color:#c9b493;font-weight:normal;font-size:15px}
.topnav{display:flex;flex-wrap:wrap;gap:10px;margin:16px 0 24px}
.topnav a{text-decoration:none;background:#2f241c;border:1px solid #7d5f3c;padding:7px 14px;border-radius:5px;color:#f5e4c6}
.topnav a:hover{background:#5d2628;border-color:#e0b562}
.stepper-card{background:#241d17;border:1px solid #6e5437;border-radius:8px;padding:16px;margin:22px 0;box-shadow:0 6px 24px #0006}
.stepper-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:10px;flex-wrap:wrap}
.phase-counter{background:#5d2628;color:#fff0cf;border:1px solid #cfa04c;padding:3px 10px;border-radius:12px;font:700 13px/1.3 system-ui}
.stepper-stage{position:relative;display:block;width:100%;padding:0;border:2px solid #8c6b42;border-radius:5px;background:#0e0c0a;cursor:pointer;overflow:hidden;touch-action:manipulation}
.stepper-stage img{display:block;width:100%;height:auto;position:absolute;inset:0;opacity:0;pointer-events:none}
.stepper-stage img:first-child{position:relative}
.stepper-stage img.is-active{opacity:1;z-index:2}
.stepper-badge{position:absolute;right:12px;bottom:12px;z-index:4;background:#140d0ae8;color:#ffebc2;border:1px solid #d4a652;border-radius:4px;padding:6px 12px;font:700 13px/1.35 system-ui;pointer-events:none}
.stepper-pills{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0 8px}
button{font:14px/1.3 system-ui,sans-serif;background:#33261d;color:#f4e5c8;border:1px solid #846540;border-radius:4px;padding:7px 12px;cursor:pointer}
button:hover{background:#4b3525;border-color:#c99c4a}
button[aria-pressed="true"]{background:#73292c;border-color:#ebb95e;color:#fff5dd;font-weight:700}
button:focus-visible,a:focus-visible{outline:3px solid #f0c975;outline-offset:2px}
.stepper-toolbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:8px}
.orig-links{font:13px/1.4 system-ui;color:#cab696;margin-left:auto}
.ref-drawer{margin-top:12px;border-top:1px solid #4d3b28;padding-top:8px}
.ref-drawer summary{cursor:pointer;color:#edd098;font-weight:600}
.ref-drawer img{max-width:100%;height:auto;border:1px solid #7d5f3c;border-radius:4px;margin-top:10px}
.grid-2{display:grid;grid-template-columns:repeat(auto-fit,minmax(460px,1fr));gap:18px;margin-top:14px}
.gallery-card{margin:0;background:#241d17;border:1px solid #6a5136;border-radius:6px;padding:10px}
.gallery-card img{width:100%;height:auto;border-radius:3px;display:block}
.gallery-card figcaption{margin-top:8px;font-size:14px;color:#e7d5b7}
table{width:100%;border-collapse:collapse;margin:14px 0;background:#221b15;border:1px solid #6a5136}
th,td{padding:10px 12px;border-bottom:1px solid #493827;text-align:left;vertical-align:top;font-size:15px}
th{background:#34261c;color:#f6d490}
.status{display:inline-block;padding:3px 9px;border-radius:10px;font:700 12px/1.3 system-ui;text-transform:uppercase}
.status-completado{background:#23452d;color:#c9f2d3;border:1px solid #539a68}
.status-parcial{background:#523e18;color:#fae0a2;border:1px solid #b88a35}
.status-pendiente{background:#3a2f2a;color:#dfcbb8;border:1px solid #8a7262}
.res-controls{display:flex;gap:8px;margin:10px 0 14px}
.zoom-modal{width:min(97vw,1820px);max-width:none;padding:16px;background:#1c1612;color:#f4e8d4;border:1px solid #9c7948;border-radius:8px}
.zoom-modal::backdrop{background:#070504eb}
.zoom-modal header{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-bottom:10px}
.zoom-modal h2{margin:0;border:none;padding:0;font-size:20px;flex:1}
.zoom-pan{overflow:auto;max-height:78vh}
@media(max-width:720px){.grid-2{grid-template-columns:1fr}.orig-links{margin-left:0}}
`;

const js=`
(function(){
  function setStep(card, idx){
    const count = Number(card.dataset.count);
    const next = ((idx % count) + count) % count;
    card.dataset.index = String(next);
    const labels = JSON.parse(card.dataset.labels);
    const shorts = JSON.parse(card.dataset.shorts);
    card.querySelectorAll('[data-step-img]').forEach(img => {
      img.classList.toggle('is-active', Number(img.dataset.stepImg) === next);
    });
    card.querySelectorAll('[data-step-jump]').forEach(btn => {
      btn.setAttribute('aria-pressed', String(Number(btn.dataset.stepJump) === next));
    });
    const badge = card.querySelector('[data-step-badge]');
    if(badge) badge.textContent = shorts[next] + ' · ' + labels[next];
    const counter = card.querySelector('[data-step-counter]');
    if(counter) counter.textContent = (next + 1) + ' / ' + count;
  }

  let zoomModal;
  function openZoom(card){
    if(!zoomModal){
      zoomModal = document.createElement('dialog');
      zoomModal.className = 'zoom-modal';
      zoomModal.innerHTML = '<header><h2></h2><label>Zoom <input type="range" min="100" max="250" step="25" value="100"><output>100 %</output></label><button type="button" data-zoom-close>Cerrar</button></header><div class="zoom-pan"></div>';
      document.body.append(zoomModal);
      zoomModal.querySelector('[data-zoom-close]').onclick = () => zoomModal.close();
      zoomModal.querySelector('input').oninput = e => {
        const v = e.target.value;
        zoomModal.querySelector('output').textContent = v + ' %';
        const inner = zoomModal.querySelector('.zoom-pan .stepper-card');
        if(inner) inner.style.width = v + '%';
      };
    }
    zoomModal.querySelector('h2').textContent = card.dataset.title;
    const clone = card.cloneNode(true);
    clone.style.width = '100%';
    clone.style.margin = '0';
    const enl = clone.querySelector('[data-step-enlarge]');
    if(enl) enl.remove();
    const ref = clone.querySelector('.ref-drawer');
    if(ref) ref.remove();
    clone.querySelectorAll('img').forEach(img => img.loading = 'eager');
    zoomModal.querySelector('.zoom-pan').replaceChildren(clone);
    zoomModal.querySelector('input').value = '100';
    zoomModal.querySelector('output').textContent = '100 %';
    zoomModal.showModal();
    clone.querySelector('.stepper-stage').focus();
  }

  document.addEventListener('click', e => {
    const resBtn = e.target.closest('[data-res-pick]');
    if(resBtn){
      const w = resBtn.dataset.resPick;
      document.querySelectorAll('[data-res-pick]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.resPick === w)));
      document.querySelectorAll('[data-res-group]').forEach(g => g.hidden = g.dataset.resGroup !== w);
      return;
    }
    const card = e.target.closest('[data-phase-stepper]');
    if(!card) return;
    const cur = Number(card.dataset.index);
    const count = Number(card.dataset.count);
    if(e.target.closest('[data-step-enlarge]')){ openZoom(card); return; }
    if(e.target.closest('[data-step-next], [data-step-next-btn]')){ setStep(card, cur + 1); return; }
    if(e.target.closest('[data-step-prev]')){ setStep(card, cur - 1); return; }
    if(e.target.closest('[data-step-toggle-ends]')){ setStep(card, cur === 0 ? count - 1 : 0); return; }
    const jump = e.target.closest('[data-step-jump]');
    if(jump){ setStep(card, Number(jump.dataset.stepJump)); return; }
  });

  document.addEventListener('keydown', e => {
    const active = document.activeElement;
    const card = active && active.closest ? active.closest('[data-phase-stepper]') : null;
    if(!card) return;
    const cur = Number(card.dataset.index);
    if(e.key === 'ArrowRight'){ e.preventDefault(); setStep(card, cur + 1); }
    else if(e.key === 'ArrowLeft'){ e.preventDefault(); setStep(card, cur - 1); }
  });
})();
`;

const html=`<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ficha de personaje definitiva — Fases 0 a 8 (VTT Godot)</title>
<style>${css}</style>
${visualComparisonAssets()}
</head>
<body>
<main>
  <h1>Ficha de personaje definitiva · Fases 0–8</h1>
  <p>Implementación completa en Godot 4.7.2 Forward+ sincronizada en <strong>Pecio</strong>, <strong>Retiro del Dragón</strong> y <strong>Campamentos</strong>, incluyendo la <strong>Fase 8 de pulido artístico</strong> (retrato solapado, relieve y sombreado en cenefas, pestañas integradas en la corona oscura exterior, shader GPU <em>multiply</em> para grabados y Biografía editable en línea). En cada pestaña puedes <strong>hacer clic sobre la imagen</strong> (o usar los botones de fase / flechas del teclado) para avanzar fase a fase desde el <em>Antes</em> hasta <em>F8 Pulido</em> conservando exactamente el mismo encuadre.</p>
  <nav class="topnav">
    <a href="#fases">Evolución clic a fase (5 pestañas)</a>
    <a href="#modales">Modales, Biografía editable y Subida de nivel</a>
    <a href="#personajes">Tres personajes (Mike, Mia y Trinity)</a>
    <a href="#resoluciones">1366×768 y 1920×1080</a>
    <a href="#matriz">Matriz de aceptación y pruebas</a>
  </nav>

  <section id="fases">
    <h2>1. Evolución clic a fase por pestaña (1600 × 900)</h2>
    <p>Cada bloque agrupa las capturas reales de Godot con la misma cámara, escena (Pecio C1), actor (Mike), mediodía y clima despejado: <strong>Antes → Fase 0 (Codex) → Fase 0 (corregida) → Fase 1 → Fase 2 → Fase 3 → Fase 4 → Fase 5 → Fases 6–7 → Fase 8 (Pulido artístico)</strong>.</p>
    ${stepperHtml}
  </section>

  <section id="modales">
    <h2>2. Ayudas, ventanas ampliadas, edición y asistente de subida de nivel</h2>
    <div class="grid-2">${modalsHtml}</div>
  </section>

  <section id="personajes">
    <h2>3. Adaptación sin escenas específicas · Mia (Clériga) y Trinity (Pícara)</h2>
    <p>La misma ficha se adapta automáticamente a los datos reales de cada personaje: lanzador arcano (Mike), lanzadora divina Enana de las colinas (Mia) y clase marcial sin magia con Pericia (Trinity).</p>
    <div class="grid-2">${heroesHtml}</div>
  </section>

  <section id="resoluciones">
    <h2>4. Comparativa Antes ↔ Final en 1366 × 768 y 1920 × 1080</h2>
    <div class="res-controls">
      <button type="button" data-res-pick="1366" aria-pressed="true">1366 × 768 (compacto)</button>
      <button type="button" data-res-pick="1920" aria-pressed="false">1920 × 1080 (amplio)</button>
    </div>
    ${multiResHtml}
  </section>

  <section id="matriz">
    <h2>5. Matriz de aceptación (Fase 7.1) y suites ejecutadas</h2>
    <table>
      <thead><tr><th>Elemento</th><th>Exigencia</th><th>Estado</th><th>Evidencia</th></tr></thead>
      <tbody>${matrixHtml}</tbody>
    </table>
    <h3>Comprobaciones automatizadas en Godot</h3>
    <table>
      <thead><tr><th>Suite y prototipo</th><th>Resultado</th><th>Registro</th></tr></thead>
      <tbody>${suitesHtml}</tbody>
    </table>
    <p class="muted">Manifiesto completo con huellas SHA-256 de todos los originales: <a href="originales.json" target="_blank" rel="noopener">originales.json</a> · Ficha de evidencia: <a href="../../docs/evidence/GODOT_CHARACTER_SHEET_20261116.md" target="_blank" rel="noopener">GODOT_CHARACTER_SHEET_20261116.md</a>.</p>
  </section>
</main>
<script>${js}</script>
</body>
</html>`;

writeFileSync(join(out,'index.html'),html,'utf8');
console.log('FINAL REPORT BUILT:',join(out,'index.html'),'originals=',originals.length,'suites=',suites.length);
