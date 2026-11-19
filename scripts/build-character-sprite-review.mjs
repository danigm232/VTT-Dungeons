import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {visualComparison,visualComparisonAssets} from './lib/visual-comparison.mjs';
import {playerWalkFrames} from '../engine/client/player-walk-frames.ts';
const root=resolve(import.meta.dirname,'..'),folder=join(root,'output/sprite-audit-20261115');
await mkdir(folder,{recursive:true});
const data=JSON.parse(await readFile(join(root,'prototypes/godot-shared/sprites/frames.json'),'utf8'));
const characters={cleric:'Mía',rogue:'Trinity',wizard:'Mike',silverfarben:'Silverfarben Hotel',zombie:'Zombi ahogado'};
const dirs=['n','ne','e','se','s','sw','w','nw'];
const motion={};
for(const hero of Object.keys(characters)){
 const clips={};
 function row(id,index){const atlas=data.atlases[id];if(!atlas)return;return atlas.frames.slice(index*8,index*8+8).map(frame=>({...frame,url:`../../prototypes/godot-shared/sprites/${atlas.file}`,logicalHeight:92*frame.height_scale,anchorX:.5,anchorY:(frame.height-6)/frame.height}));}
 for(const [i,dir]of dirs.entries()){
  const walking=row(hero+'-walk',i);
  if(walking)clips['walk-'+dir]=walking;
  else if(['rogue','silverfarben'].includes(hero)){
   const name=hero==='rogue'?'trinity':'silverfarben';
   const source=name==='trinity'&&dir==='e'?'w':name==='silverfarben'&&dir==='sw'?'se':dir;
   const key=`${name}-${source}-walk-v2`;
   clips['walk-'+dir]=playerWalkFrames[key].frames.map(f=>({...f,url:`../../campaigns/one-shot/public/art/player-walks-v2/${key}.png`,flip_h:source!==dir}));
  }
  for(const mode of ['run','attack','torch','unarmed']){const frames=row(hero+'-'+mode,i);if(frames)clips[mode+'-'+dir]=frames;}
 }
 const names=['run-profile','stealth','climb','swim','crawl','jump','melee-profile',hero==='zombie'?'grapple':hero==='cleric'||hero==='wizard'?'spell':'interact'];
 names.forEach((name,index)=>{const frames=row(hero+'-actions',index);if(frames)clips[name]=frames;});
 motion[hero]=clips;
}
let comparisons='';const originals=[];
for(const [id,label]of [['walk-n','Caminar de espaldas'],['walk-e','Caminar hacia la derecha'],['walk-s','Caminar hacia delante'],['walk-w','Caminar hacia la izquierda'],['climb','Trepar'],['swim','Nadar'],['crawl','Arrastrarse'],['jump','Saltar']]){
 const before=`pecio/${id}-before.png`,after=`pecio/${id}-after.png`;
 await access(join(folder,before));await access(join(folder,after));
 comparisons+=visualComparison({before,after,title:label+' · mismos actores, cámara y luz',width:1600,height:900});
 for(const file of [before,after]){const bytes=await readFile(join(folder,file));originals.push({file,sha256:createHash('sha256').update(bytes).digest('hex'),pixels:[1600,900],kind:'native PlayerToken on neutral 3D review stage',camera:[0,7,19],target:[0,.65,0],orthographicSize:13.5});}
}
await writeFile(join(folder,'capture-originals.json'),JSON.stringify(originals,null,2)+'\n');
let integrated='';
for(const name of ['playertoken','roguetoken']){const file=`pecio/integrated-${name}.png`;try{await access(join(folder,file));integrated+=`<img src="${file}" alt="Sprites en la escena jugable actual del Pecio">`;}catch{}}
const html=`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Sprites · Zombis y jugadores</title><style>
*{box-sizing:border-box}body{margin:0;background:#10191c;color:#e5dec9;font:16px/1.6 system-ui}main{max-width:1480px;margin:auto;padding:30px}h1,h2{font-family:Georgia,serif;color:#e5bc73}a{color:#95d1d0}.muted{color:#a6b7b6}section{padding:24px;border:1px solid #354a4b;border-radius:14px;margin:24px 0;background:#162225}label{display:inline-flex;gap:8px;align-items:center;margin:5px}select,button,input{font:inherit;background:#213336;color:inherit;border:1px solid #65716b;border-radius:6px;padding:7px}button{cursor:pointer}canvas{display:block;width:100%;max-width:850px;aspect-ratio:16/9;background:#18282d;border-radius:12px;margin:20px auto}.controls{text-align:center}img{max-width:100%;height:auto}summary{cursor:pointer;font-size:1.2em}.vtt-comparison{max-width:100%}code{color:#e8ca8a}
</style><main><h1>Zombis y jugadores · revisión de sprites</h1><p>Mínimo de <strong>8 imágenes distintas por ciclo de desplazamiento</strong>. Se conservan identidades, talla física, equipo y reglas. 22 atlas candidatos nuevos con 1.408 poses; las caminatas anteriores de Trinity y Silverfarben se reutilizan.</p><section><h2>Reproductor de fotogramas</h2><div class="controls"><label>Personaje <select id="hero">${Object.entries(characters).map(([id,name])=>`<option value="${id}">${name}</option>`).join('')}</select></label><label>Acción <select id="action"></select></label><label>Rumbo <select id="direction">${dirs.map(d=>`<option>${d}</option>`).join('')}</select></label><label>Velocidad <select id="speed"><option value="1">Normal</option><option value="0.5">½</option><option value="0.25">¼</option></select></label><button id="pause">Pausar</button><button id="step">Avanzar un fotograma</button></div><canvas id="view" width="1200" height="675" aria-label="Reproducción de los sprites reales importados"></canvas><div class="controls"><label>Fotograma <input id="frame" type="range" min="0" max="7" value="0"><output id="counter">1 / 8</output></label></div><p id="details" class="muted"></p><p class="muted">Caminar, correr y atacar tienen ocho rumbos. Trepar se dibuja desde atrás; nado, gateo y salto usan su perfil de acción. Las poses de reposo y los cuerpos quietos pueden tener una sola imagen. Este visor muestra los recursos; las capturas inferiores muestran el reproductor nativo de Godot.</p></section>
<section><h2>Comparación en el motor</h2><p>Antes y después capturados con los mismos actores, cámara, resolución y luz en un escenario neutro. Pulsa la imagen para alternar, o amplíala para revisar pies y recortes. El escenario de revisión no es un mapa de aventura.</p>${comparisons}</section>${integrated?`<section><h2>Escena jugable del Pecio</h2>${integrated}</section>`:''}<section><h2>Comprobaciones y fuentes</h2><p><a href="pecio/after.json">Auditoría del catálogo activo</a> · <a href="pecio/tests.json">Pruebas del reproductor</a> · <a href="capture-originals.json">Originales de las comparativas</a> · <a href="../../prototypes/godot-shared/sprites/art-sources.json">Prompts y procedencia</a> · <a href="../../docs/evidence/CHARACTER_SPRITES_20261115.md">Ficha de entrega</a></p><p class="muted">Candidata local revisada técnicamente. La aceptación artística del usuario y la prueba en mesa física se registran por separado.</p></section></main>${visualComparisonAssets()}<script>
const DATA=${JSON.stringify(motion)},DIRS=${JSON.stringify(dirs)};const LABELS={walk:"Caminar",run:"Correr",attack:"Atacar",torch:"Con antorcha",unarmed:"Golpe sin armas",stealth:"Sigilo",climb:"Trepar",swim:"Nadar",crawl:"Arrastrarse",jump:"Saltar",spell:"Conjurar",interact:"Interactuar",grapple:"Agarrar"};const $=id=>document.getElementById(id);const ctx=$('view').getContext('2d'),images={};let paused=false,index=0,time=0;
function choices(){const previous=$('action').value;const names=[...new Set(Object.keys(DATA[$('hero').value]).map(k=>k.replace(/-(n|ne|e|se|s|sw|w|nw)$/,'')))].filter(n=>!n.endsWith('-profile'));$('action').innerHTML=names.map(n=>'<option value="'+n+'">'+(LABELS[n]||n)+'</option>').join('');if(names.includes(previous))$('action').value=previous;index=0;draw();}
function clip(){const set=DATA[$('hero').value],name=$('action').value;return set[name+'-'+$('direction').value]||set[name]||[];}
function draw(){const frames=clip(),f=frames[index%Math.max(1,frames.length)];ctx.fillStyle='#18282d';ctx.fillRect(0,0,1200,675);ctx.strokeStyle='#49605e';ctx.beginPath();ctx.moveTo(100,590);ctx.lineTo(1100,590);ctx.stroke();if(!f)return;if(!images[f.url]){const im=new Image();im.src=f.url;im.onload=draw;images[f.url]=im;}const im=images[f.url];if(im.complete&&im.naturalWidth){const scale=320*(f.logicalHeight||92)/92/f.height,w=f.width*scale,h=f.height*scale;ctx.save();ctx.translate(600,590);if(f.flip_h)ctx.scale(-1,1);ctx.drawImage(im,f.x,f.y,f.width,f.height,-w*(f.anchorX??.5),-h*(f.anchorY??1),w,h);ctx.restore();}$('frame').value=index;$('counter').value=(index+1)+' / '+frames.length;$('details').textContent=$('hero').selectedOptions[0].text+' · '+$('action').selectedOptions[0].text+' · '+frames.length+' imágenes · espacio transparente y escala constantes.';}
$('hero').onchange=choices;$('action').onchange=()=>{index=0;draw();};$('direction').onchange=draw;$('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'Reproducir':'Pausar';};$('step').onclick=()=>{paused=true;$('pause').textContent='Reproducir';index=(index+1)%Math.max(1,clip().length);draw();};$('frame').oninput=()=>{paused=true;index=Number($('frame').value);$('pause').textContent='Reproducir';draw();};function tick(now){const fps=$('action').value==='run'?18:10;if(!paused&&now-time>1000/fps/Number($('speed').value)){time=now;index=(index+1)%Math.max(1,clip().length);draw();}requestAnimationFrame(tick);}choices();requestAnimationFrame(tick);
</script></html>`;
await writeFile(join(folder,'index.html'),html);
console.log(join(folder,'index.html'));
