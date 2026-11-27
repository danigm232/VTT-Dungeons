import {readFile, writeFile, access} from 'node:fs/promises';
import {resolve} from 'node:path';

const root = resolve(import.meta.dirname, '..');
const load = async path => JSON.parse(await readFile(resolve(root, path), 'utf8'));
const sprites = await load('prototypes/godot-shared/sprites/frames.json');
const combat = await load('prototypes/godot-shared/combat/catalogue.json');
const registry = await load('prototypes/godot-shared/characters/candidate-catalogue.json');
const conditions = await load('prototypes/godot-shared/sprites/condition-art.json');
const effects = await load('prototypes/godot-shared/combat/visual_profiles.json');
const heroes = {};
const dirs = ['n','ne','e','se','s','sw','w','nw'];
const atlasPath = 'prototypes/godot-shared/sprites/';
const characterNames = {cleric:'Mía',wizard:'Mike',rogue:'Trinity / María',silverfarben:'Silverfarben Hotel',anteros:'Anteros',harpy:'Arpía',zombie:'Zombi', 'zombie-2':'Zombi marinero 2','zombie-3':'Zombi marinero 3','zombie-4':'Zombi marinero 4'};
function add(id, name, action, direction, fps, frames, detail='') {
  if (!frames.length) return;
  heroes[id] ??= {name, clips:[]};
  heroes[id].clips.push({action,direction,fps,frames,detail});
}
function row(id, action, atlas, rowIndex, direction, fps=10) {
  const entry = sprites.atlases[atlas];
  if (!entry) return;
  const frames = entry.frames.slice(rowIndex*8,rowIndex*8+8).map(f => ({url:atlasPath+entry.file,x:f.x,y:f.y,w:f.width,h:f.height,scale:f.height_scale||1}));
  add(id,characterNames[id]||id,action,direction,fps,frames,'Atlas de sprites de Godot');
}
for (const id of ['cleric','wizard','rogue','silverfarben','zombie','zombie-2','zombie-3','zombie-4','harpy']) {
  dirs.forEach((dir,i) => {
    row(id,id==='harpy'?'Garras':'Ataque',id==='harpy'?'harpy-claws':id+'-attack',i,dir);
    row(id,'Golpe sin armas',id+'-unarmed',i,dir);
    if(id==='harpy') row(id,'Porra','harpy-club',i,dir);
  });
  const rows = id==='harpy'?['Canto','Despegar','Aterrizar','Impacto','Caer','Levantarse','Arrastrarse','Guardia']:
    id.startsWith('zombie')?['Mordisco','Agarrar','Impacto','Caer','Levantarse','Arrastrarse','Fortaleza','Guardia']:[];
  rows.forEach((label,i)=>row(id,label,id==='harpy'?'harpy-utility':id+'-reactions',i,'perfil'));
  if (!rows.length) ['Correr','Sigilo','Trepar','Nadar','Arrastrarse','Saltar','Ataque de perfil','Conjurar / interactuar'].forEach((label,i)=>row(id,label,id+'-actions',i,'perfil'));
}
for (const [token, clips] of Object.entries(combat.frames)) {
  const id = token==='silverfarben-hotel'?'silverfarben':token;
  for (const [name, clip] of Object.entries(clips)) {
    if (!/^(attack|spell|hit|fall|stand|defeated|prone|combat-idle|dodge|disengage|help)/.test(name)) continue;
    const match = name.match(/-(n|ne|e|se|s|sw|w|nw)$/);
    const frames = clip.frames.map(f=>({url:f.url.replace('res://combat/','prototypes/godot-shared/combat/'),x:f.x||0,y:f.y||0,w:f.width||0,h:f.height||0,scale:(f.logicalHeight||92)/92,flip:!!clip.flipX}));
    add(id,characterNames[id]||id,name.replace(/-(n|ne|e|se|s|sw|w|nw)$/,''),match?.[1]||'perfil',clip.fps||8,frames,'Catálogo de combate existente');
  }
}
for (const [id, person] of Object.entries(registry.characters||{})) {
  const canonical = {maria:'rogue',mia:'cleric',mike:'wizard'}[id] || id;
  heroes[canonical] ??= {name:person.name||characterNames[canonical]||id,clips:[]};
  if (person.source?.files?.length) {
    add(canonical,person.name||id,'Reposo disponible','perfil',person.source.fps||3,
      person.source.files.map(url=>({url,x:0,y:0,w:0,h:0,scale:1})),'Pose de referencia. La ficha puede utilizar una acción general.');
  }
}
for (const animation of Object.values(registry.animations||{})) {
  if (!/attack|hit|spell|fall|stand|combat|hurt|defeat|dodge|fight|grapple|bite|claw/i.test(animation.action)) continue;
  const id = {maria:'rogue',mia:'cleric',mike:'wizard'}[animation.character] || animation.character;
  add(id,registry.characters?.[animation.character]?.name||id,animation.action,animation.direction||'perfil',animation.fps||8,
    (animation.frames||[]).map(f=>({url:typeof f==='string'?f:f.file,x:0,y:0,w:0,h:0,scale:1,flip:!!animation.mirrorHorizontally})),'Definición modular existente');
}
const missing = new Set();
for(const actor of Object.values(heroes)) for(const clip of actor.clips) for(const frame of clip.frames) {
  try { await access(resolve(root, frame.url)); } catch { missing.add(frame.url); }
}
for(const actor of Object.values(heroes)) actor.clips = actor.clips.filter(clip => clip.frames.every(f=>!missing.has(f.url)));
const effectData = Object.fromEntries(Object.entries(conditions.art).map(([id,value])=>[id,{anchor:value.anchor,variants:value.variants}]));
const payload = JSON.stringify({heroes,effectData,effects}).replaceAll('<','\\u003c');
const html = `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Animaciones y efectos de combate</title>
<style>*{box-sizing:border-box}body{margin:0;background:#101c22;color:#e7e0d3;font:16px/1.5 system-ui}main{max-width:1220px;margin:auto;padding:24px}h1,h2{font-family:Georgia;color:#ead19a}button,select,input{font:inherit;background:#1c3439;color:#f2e8d2;border:1px solid #887957;border-radius:7px;padding:9px}button{cursor:pointer}button[aria-selected=true]{background:#9a7634;color:white}label{display:inline-flex;align-items:center;gap:8px;margin:6px}canvas{width:100%;max-width:860px;height:auto;background:radial-gradient(circle,#304145,#101a20);border:1px solid #56655f;border-radius:12px;display:block;margin:18px auto}a{color:#a9dbe0}section{background:#14262b;border:1px solid #485451;border-radius:12px;padding:20px;margin:18px 0}.muted{color:#bbcac6}img{max-width:100%}nav{display:flex;gap:10px;flex-wrap:wrap}figure{margin:12px 0} .preview{display:flex;flex-wrap:wrap;gap:15px}.preview figure{width:250px}.preview img{border-radius:8px}</style>
<style>.gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(175px,1fr));gap:12px}.gallery-card{margin:0;background:#102025;border:1px solid #455a59;border-radius:9px;padding:8px}.gallery-card canvas{width:100%;margin:0 0 6px;border:0;aspect-ratio:220/190}.gallery-card figcaption{font-size:13px;overflow-wrap:anywhere}h3{color:#dfc996;margin-top:28px}</style>
<main><h1>Animaciones y efectos de combate</h1><p class="muted">Biblioteca local de Godot. Selecciona una ficha, acción y rumbo para reproducir sus fotogramas. El archivo utiliza los recursos existentes de esta carpeta del proyecto.</p>
<nav role="tablist"><button id="tabAll" role="tab" aria-selected="true">Ver todo en una página</button><button id="tabActors" role="tab" aria-selected="false">Personajes y criaturas</button><button id="tabEffects" role="tab" aria-selected="false">Efectos y estados</button></nav>
<section id="all"><p>Las tarjetas muestran las secuencias disponibles, agrupadas por ficha. Los estados y efectos aparecen al final de la página.</p><nav><a href="#allCharacters">Personajes y criaturas</a><a href="#allStates">Overlays y estados</a><a href="#allEffects">Efectos de combate</a></nav><p><button id="pauseGallery">Pausar animaciones</button></p><div id="allCharacters"></div><h2 id="allStates">Overlays y estados</h2><p>Cada tarjeta muestra el recurso de estado aislado en sus tres acabados. En la partida se ajusta al cuerpo de la ficha.</p><div id="statesGrid" class="gallery"></div><h2 id="allEffects">Efectos de combate</h2><p>Los proyectiles y señales se representan en movimiento según sus colores y formas. Las capturas muestran ejemplos reales en Godot.</p><div id="effectsGrid" class="gallery"></div><div class="preview"><figure><a href="output/combat-visual-audit-20261124/review/captures/pecio-flecha-despues.png"><img loading="lazy" src="output/combat-visual-audit-20261124/review/captures/pecio-flecha-despues.png" alt="Flecha en vuelo en Godot"></a><figcaption>Flecha en vuelo</figcaption></figure><figure><a href="output/combat-visual-audit-20261124/review/captures/pecio-niebla-despues.png"><img loading="lazy" src="output/combat-visual-audit-20261124/review/captures/pecio-niebla-despues.png" alt="Nube de niebla en Godot"></a><figcaption>Nube de niebla</figcaption></figure><figure><a href="output/combat-visual-audit-20261124/review/captures/pecio-cono-despues.png"><img loading="lazy" src="output/combat-visual-audit-20261124/review/captures/pecio-cono-despues.png" alt="Cono de fuego en Godot"></a><figcaption>Manos ardientes</figcaption></figure></div><p><a href="output/combat-visual-audit-20261124/index.html">Ver comparativas y capturas en Godot</a></p></section>
<section id="actors" hidden><label>Personaje <select id="person"></select></label><label>Acción <select id="action"></select></label><label>Rumbo <select id="direction"></select></label><label>Velocidad <select id="speed"><option value="1">Normal</option><option value=".5">Mitad</option><option value=".25">Cuarto</option></select></label><button id="play">Pausar</button><button id="step">Siguiente fotograma</button><canvas id="stage" width="900" height="520" aria-label="Animación seleccionada"></canvas><label>Fotograma <input id="frame" type="range" min="0" value="0"><output id="count"></output></label><p id="info" class="muted"></p></section>
<section id="fx" hidden><p>Las muestras de estados usan los recursos vectoriales existentes. La niebla, las áreas y los proyectiles se dibujan en Godot y se muestran en las capturas integradas.</p><label>Estado <select id="condition"></select></label><label>Acabado <select id="style"></select></label><button id="pauseEffect">Pausar</button><canvas id="effectStage" width="900" height="400" aria-label="Efecto seleccionado"></canvas><p id="effectInfo" class="muted"></p><div class="preview"><figure><a href="output/combat-visual-audit-20261124/review/captures/pecio-flecha-despues.png"><img src="output/combat-visual-audit-20261124/review/captures/pecio-flecha-despues.png" alt="Flecha en vuelo"></a><figcaption>Flecha en vuelo</figcaption></figure><figure><a href="output/combat-visual-audit-20261124/review/captures/pecio-niebla-despues.png"><img src="output/combat-visual-audit-20261124/review/captures/pecio-niebla-despues.png" alt="Niebla de combate"></a><figcaption>Nube de niebla</figcaption></figure><figure><a href="output/combat-visual-audit-20261124/review/captures/pecio-cono-despues.png"><img src="output/combat-visual-audit-20261124/review/captures/pecio-cono-despues.png" alt="Área de fuego"></a><figcaption>Manos ardientes</figcaption></figure></div><p id="projectiles"></p><p><a href="output/combat-visual-audit-20261124/index.html">Comparativas y capturas en Godot</a></p></section>
<p class="muted">Las poses etiquetadas como reposo o gesto general no son ataques dibujados específicamente. Los efectos de estado se muestran aislados; el juego los adapta al cuerpo y a la cámara.</p></main>
<script>const D=${payload};const $=x=>document.getElementById(x),ctx=$('stage').getContext('2d'),fx=$('effectStage').getContext('2d'),cache={};let index=0,last=0,paused=false,fxPaused=false,fxIndex=0,lastFx=0;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function options(node,values){node.innerHTML=values.map(([v,n])=>'<option value="'+esc(v)+'">'+esc(n)+'</option>').join('')}
const ids=Object.keys(D.heroes).sort((a,b)=>D.heroes[a].name.localeCompare(D.heroes[b].name,'es')); options($('person'),ids.map(x=>[x,D.heroes[x].name]));
function actions(){let h=D.heroes[$('person').value];let all=[...new Set(h.clips.map(c=>c.action))];options($('action'),all.map(x=>[x,x]));directions()}
function directions(){let clips=D.heroes[$('person').value].clips.filter(c=>c.action===$('action').value);options($('direction'),clips.map((c,i)=>[String(i),c.direction+' · '+c.frames.length+' fotogramas']));index=0;draw()}
function current(){return D.heroes[$('person').value].clips.filter(c=>c.action===$('action').value)[Number($('direction').value)||0]}
function image(url,callback){if(!cache[url]){let img=new Image();img.onload=callback;img.onerror=()=>{$('info').textContent='No se pudo abrir el recurso '+url};img.src=url;cache[url]=img}return cache[url]}
function draw(){ctx.clearRect(0,0,900,520);ctx.strokeStyle='#78918b';ctx.beginPath();ctx.moveTo(80,460);ctx.lineTo(820,460);ctx.stroke();let c=current();if(!c){$('info').textContent='Esta ficha todavía no tiene un clip de combate disponible en los catálogos consultados.';return}let f=c.frames[index%c.frames.length],im=image(f.url,draw);if(im.complete&&im.naturalWidth){let w=f.w||im.naturalWidth,h=f.h||im.naturalHeight,scale=Math.min(380/h,670/w)*Math.min(1.3,Math.max(.55,f.scale||1));ctx.save();ctx.translate(450,460);if(f.flip)ctx.scale(-1,1);ctx.drawImage(im,f.x,f.y,w,h,-w*scale/2,-h*scale,w*scale,h*scale);ctx.restore()}$('frame').max=c.frames.length-1;$('frame').value=index;$('count').textContent=(index+1)+' / '+c.frames.length;$('info').textContent=c.detail+' · '+c.fps+' fps · '+f.url}
function effectChoices(){options($('style'),Object.keys(D.effectData[$('condition').value].variants).map(x=>[x,x]));fxIndex=0;drawFx()}
function drawFx(){fx.clearRect(0,0,900,400);let e=D.effectData[$('condition').value],list=e.variants[$('style').value],svg=list[fxIndex%list.length],url='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg),im=image(url,drawFx);if(im.complete&&im.naturalWidth)fx.drawImage(im,300,35,300,300);$('effectInfo').textContent='Anclaje previsto: '+e.anchor+' · '+list.length+' fotogramas. La colocación final depende de la silueta del personaje.'}
options($('condition'),Object.keys(D.effectData).map(x=>[x,x]));effectChoices();$('person').onchange=actions;$('action').onchange=directions;$('direction').onchange=()=>{index=0;draw()};$('condition').onchange=effectChoices;$('style').onchange=()=>{fxIndex=0;drawFx()};$('play').onclick=()=>{paused=!paused;$('play').textContent=paused?'Reproducir':'Pausar'};$('pauseEffect').onclick=()=>{fxPaused=!fxPaused;$('pauseEffect').textContent=fxPaused?'Reproducir':'Pausar'};$('step').onclick=()=>{paused=true;$('play').textContent='Reproducir';if(current()){index=(index+1)%current().frames.length;draw()}};$('frame').oninput=()=>{paused=true;index=Number($('frame').value);$('play').textContent='Reproducir';draw()};
function tab(name){$('all').hidden=name!=='all';$('actors').hidden=name!=='actors';$('fx').hidden=name!=='fx';for(const [id,value] of [['tabAll','all'],['tabActors','actors'],['tabEffects','fx']])$(id).setAttribute('aria-selected',String(name===value));if(name==='all')buildGallery()}
$('tabAll').onclick=()=>tab('all');$('tabActors').onclick=()=>tab('actors');$('tabEffects').onclick=()=>tab('fx');
let galleryBuilt=false,galleryPaused=false,galleryTime=0;const visibleCards=new Set(),galleryImages={};
const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting)visibleCards.add(entry.target);else visibleCards.delete(entry.target)}},{rootMargin:'150px'});
function galleryCanvas(label){const card=document.createElement('figure');card.className='gallery-card';const canvas=document.createElement('canvas');canvas.width=220;canvas.height=190;canvas.setAttribute('aria-label',label);const caption=document.createElement('figcaption');caption.textContent=label;card.append(canvas,caption);observer.observe(canvas);return {card,canvas}}
function buildGallery(){if(galleryBuilt)return;galleryBuilt=true;const host=$('allCharacters');for(const id of ids){const h=D.heroes[id],group=document.createElement('div'),heading=document.createElement('h3'),grid=document.createElement('div');heading.textContent=h.name;grid.className='gallery';group.append(heading,grid);if(!h.clips.length){let empty=document.createElement('p');empty.className='muted';empty.textContent='Sin secuencia de combate específica en el catálogo.';group.append(empty)}for(const clip of h.clips){const {card,canvas}=galleryCanvas(clip.action+' · '+clip.direction+' · '+clip.frames.length+' fotogramas');canvas._clip=clip;grid.append(card)}host.append(group)}
for(const [id,e] of Object.entries(D.effectData))for(const [style,frames] of Object.entries(e.variants)){const {card,canvas}=galleryCanvas(id+' · '+style);canvas._effect=frames;card.title='Anclaje previsto: '+e.anchor;$('statesGrid').append(card)}
for(const [id,e] of Object.entries(D.effects.projectiles)){const {card,canvas}=galleryCanvas(id+' · proyectil');canvas._projectile=e;$('effectsGrid').append(card)}
for(const [id,color] of Object.entries(D.effects.actionColors)){const {card,canvas}=galleryCanvas(id+' · señal visual');canvas._signal=color;$('effectsGrid').append(card)}
for(const [id,label,color] of [['fog','Nube de niebla','96b5be'],['burning-hands-area','Cono de Manos ardientes','ff9146'],['harpy-song-area','Canto de arpía','e3b8dd'],['detect-magic-area','Detección de magia','b7adff'],['blood','Mancha de sangre','8b242e'],['unconscious','Marcador de inconsciencia','7ba5cc']]){const {card,canvas}=galleryCanvas(label);canvas._signal=color;canvas._area=id;$('effectsGrid').append(card)}}
function drawGallery(canvas,t){const g=canvas.getContext('2d'),w=canvas.width,h=canvas.height;g.clearRect(0,0,w,h);if(canvas._clip){const c=canvas._clip,f=c.frames[Math.floor(t*c.fps/1000)%c.frames.length];let im=galleryImages[f.url];if(!im){im=new Image();im.src=f.url;galleryImages[f.url]=im}if(im.complete&&im.naturalWidth){let fw=f.w||im.naturalWidth,fh=f.h||im.naturalHeight,s=Math.min(160/fh,190/fw)*Math.min(1.3,Math.max(.55,f.scale||1));g.save();g.translate(w/2,h-12);if(f.flip)g.scale(-1,1);g.drawImage(im,f.x,f.y,fw,fh,-fw*s/2,-fh*s,fw*s,fh*s);g.restore()}}
else if(canvas._effect){const frames=canvas._effect,svg=frames[Math.floor(t/150)%frames.length],url='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);let im=galleryImages[url];if(!im){im=new Image();im.src=url;galleryImages[url]=im}if(im.complete&&im.naturalWidth)g.drawImage(im,35,12,150,150)}
else if(canvas._projectile){const p=canvas._projectile,x=35+(t/12)%150;g.strokeStyle='#'+p.color;g.fillStyle='#'+p.color;g.lineWidth=p.shape==='arrow'?3:7;g.beginPath();g.moveTo(x-24,95);g.lineTo(x+20,95);g.stroke();g.beginPath();g.moveTo(x+25,95);g.lineTo(x+14,89);g.lineTo(x+14,101);g.closePath();g.fill()}
else if(canvas._signal){const color='#'+canvas._signal,phase=(t%1200)/1200;g.globalAlpha=.65*(1-phase);g.fillStyle=color;g.beginPath();if(canvas._area==='burning-hands-area'){g.moveTo(30,95);g.lineTo(175,35);g.lineTo(175,155);g.closePath()}else g.ellipse(w/2,h/2,25+phase*48,15+phase*30,0,0,Math.PI*2);g.fill();g.globalAlpha=1}}
$('pauseGallery').onclick=()=>{galleryPaused=!galleryPaused;$('pauseGallery').textContent=galleryPaused?'Reproducir animaciones':'Pausar animaciones'};function galleryTick(t){if(!galleryPaused){galleryTime=t;for(const canvas of visibleCards)if(canvas.isConnected&&!$('all').hidden)drawGallery(canvas,galleryTime)}requestAnimationFrame(galleryTick)}buildGallery();requestAnimationFrame(galleryTick);
$('projectiles').textContent='Familias de proyectiles: '+Object.entries(D.effects.projectiles).map(([id,x])=>id+' ('+x.shape+')').join(' · ');
function tick(t){let c=current();if(!paused&&c&&t-last>1000/c.fps/Number($('speed').value)){last=t;index=(index+1)%c.frames.length;draw()}if(!fxPaused&&t-lastFx>150){lastFx=t;fxIndex++;if(!$('fx').hidden)drawFx()}requestAnimationFrame(tick)}actions();requestAnimationFrame(tick);</script></html>`;
await writeFile(resolve(root,'VISOR-COMBATE.html'),html);
console.log(JSON.stringify({file:'VISOR-COMBATE.html',characters:Object.keys(heroes).length,clips:Object.values(heroes).reduce((n,h)=>n+h.clips.length,0),missing:missing.size,effects:Object.keys(effectData).length}));
