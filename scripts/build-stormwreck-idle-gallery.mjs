import {readFile,writeFile,readdir,access,mkdir,copyFile} from 'node:fs/promises';
import {constants} from 'node:fs';
import {resolve,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {visualComparison,visualComparisonAssets} from './lib/visual-comparison.mjs';
const root=resolve(import.meta.dirname,'..'),out=resolve(root,'output/stormwreck-characters-20261117');
const lib=resolve(root,'prototypes/godot-shared/characters/definitions');
const chars=[],animations=[];
for(const file of await readdir(resolve(lib,'characters')))chars.push(JSON.parse(await readFile(resolve(lib,'characters',file),'utf8')));
for(const file of await readdir(resolve(lib,'animations')))animations.push(JSON.parse(await readFile(resolve(lib,'animations',file),'utf8')));
const ids=new Set(chars.filter(c=>c.campaign==='stormwreck-isle').map(c=>c.id));
for(const a of animations)if(a.campaign==='stormwreck-isle')ids.add(a.character);
const url=file=>relative(out,resolve(root,file)).replaceAll('\\','/');
const exists=async file=>{try{await access(file);return true;}catch{return false;}};
let proof={records:[],failures:['native run pending']};try{proof=JSON.parse(await readFile(resolve(out,'native/idle-verified.json'),'utf8'));}catch{try{proof=JSON.parse(await readFile(resolve(out,'native/idle-proof.json'),'utf8'));}catch{}}
const current=JSON.parse(await readFile(resolve(root,'prototypes/godot-shared/characters/candidate-catalogue.json'),'utf8'));
if(proof.revision!==current.revision)proof={...proof,records:[],failures:['Native proof pending for the current revision']};
let nativeFolder='native';
if(proof.records.length===37&&!proof.failures.length){
 const beforeHashes=[];
 for(const record of proof.records){const file=resolve(out,'native',record.id+'-before.png');if(await exists(file))beforeHashes.push(createHash('sha256').update(await readFile(file)).digest('hex'));}
 const batch=createHash('sha256').update(JSON.stringify(proof)+beforeHashes.join('')).digest('hex').slice(0,12);
 nativeFolder='native-reviewed/'+proof.revision.slice(0,12)+'-'+batch;
 await mkdir(resolve(out,nativeFolder),{recursive:true});
 for(const record of proof.records)for(const file of [...Object.keys(record.captureFileHashes??{}),record.id+'-before.png']){
  const src=resolve(out,'native',file),dest=resolve(out,nativeFolder,file);if(!await exists(src))continue;
  try{await copyFile(src,dest,constants.COPYFILE_EXCL);}catch(e){if(e.code!=='EEXIST')throw e;if(Buffer.compare(await readFile(src),await readFile(dest))!==0)throw new Error('Frozen evidence differs: '+dest);}
 }
 await writeFile(resolve(out,nativeFolder,'proof.json'),JSON.stringify(proof,null,2)+'\n');
}
const records=[],originals=[];
for(const id of ids){
 const c=chars.find(c=>c.id===id),a=animations.find(a=>a.character===id&&a.campaign==='stormwreck-isle'&&a.action==='idle');
 const files=a?.frames??c.source.files;
 if(files.length!==8)throw new Error(id+' does not have eight phases');
 const hashes=[];
 for(const file of files){const hash=createHash('sha256').update(await readFile(resolve(root,file))).digest('hex');hashes.push(hash);originals.push({character:id,file,sha256:hash});}
 if(new Set(hashes).size!==8)throw new Error(id+' has duplicate phases');
 const native=Array.from({length:8},(_,i)=>nativeFolder+'/'+id+'-idle-'+String(i+1).padStart(2,'0')+'.png');
 const verified=proof.records.some(r=>r.id===id)&&!proof.failures.some(f=>f.startsWith(id+':'));
 const complete=verified&&(await Promise.all(native.map(f=>exists(resolve(out,f))))).every(Boolean);
 const before=nativeFolder+'/'+id+'-before.png';const comparable=verified&&await exists(resolve(out,before));
 if(comparable)for(const f of [before,native[0]])originals.push({file:'output/stormwreck-characters-20261117/'+f,sha256:createHash('sha256').update(await readFile(resolve(out,f))).digest('hex')});
 records.push({id,name:c.name.replace(' · reposo ocho fases',''),group:['mike','mia','maria'].includes(id)?'Jugadores':/sw-(runara$|tarak|varnoth|myla|agga|blepp|frub|kilnip|laylee|mumpo|rix|zark|mek|minn|sinensa)/.test(id)?'PNJ':'Criaturas',frames:files.map(url),native:complete?native:null,fps:a?.fps??c.source.fps??2.5,direction:a?.direction??c.source.directions?.[0]??'s',height:proof.records.find(r=>r.id===id)?.heightMeters??c.heightMeters??null,comparison:comparable?visualComparison({before,after:native[0],title:c.name+' · misma cámara y apoyo',width:1280,height:720}):'',source:a?.production??c.production,userAcceptance:c.review?.userAcceptance??'pending'});
}
const order=id=>{const i=['mike','mia','maria'].indexOf(id);return i<0?99:i;};
records.sort((a,b)=>order(a.id)-order(b.id)||a.name.localeCompare(b.name,'es'));
const payload=JSON.stringify(records).replaceAll('<','\\u003c');
const html=`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Stormwreck · Reposos</title><style>
:root{color-scheme:dark;--gold:#d6b779;--ink:#eee6d4;--muted:#b0bcb8}*{box-sizing:border-box}body{margin:0;background:#101c20;color:var(--ink);font:16px system-ui}header{padding:22px 30px;border-bottom:1px solid #415053}h1{font:30px Georgia;margin:0 0 8px;color:#e4d3ac}p{margin:8px 0;color:var(--muted);line-height:1.5}main{display:grid;grid-template-columns:280px 1fr;min-height:calc(100vh - 132px)}aside{border-right:1px solid #415053;padding:18px;max-height:calc(100vh - 132px);overflow:auto}input,select,button{font:inherit;color:inherit;background:#21343a;border:1px solid #596b69;border-radius:7px;padding:9px 12px}button{cursor:pointer}button:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid var(--gold);outline-offset:3px}input[type=search],select{width:100%;margin:0 0 12px}.actor{display:block;width:100%;text-align:left;margin:5px 0;border-color:transparent;background:transparent}.actor[aria-pressed=true]{border-color:var(--gold);background:#293c3d;color:#f4dca7}.group{font:18px Georgia;margin:20px 0 9px;color:var(--gold)}article{padding:24px;min-width:0}h2{font:27px Georgia;margin:0}.stage{display:grid;place-items:center;height:clamp(360px,58vh,640px);overflow:auto;background:#142024;border:1px solid #35484b;border-radius:12px;margin:18px 0}.stage img{height:90%;width:auto;max-width:95%;object-fit:contain;transform-origin:center 86%}.tools{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.tools label{display:flex;align-items:center;gap:8px}.phase{font-variant-numeric:tabular-nums;color:var(--gold)}details{margin-top:24px;border-top:1px solid #415053;padding-top:16px}summary{cursor:pointer;color:var(--gold)}a{color:#dcc393}small{display:block;color:var(--muted);margin-top:12px}#compare:empty{display:none}@media(max-width:800px){main{grid-template-columns:1fr}aside{max-height:220px;border-right:0;border-bottom:1px solid #415053}article{padding:18px}.stage{height:470px}header{padding:18px}h1{font-size:25px}}
</style><header><h1>Stormwreck · Reposos</h1><p>${records.length} ciclos · ${records.length*8} fotogramas · Ocho fases consecutivas por animación, en una misma vista.</p></header><main><aside><input id="search" type="search" placeholder="Buscar personaje…" aria-label="Buscar personaje"><select id="group" aria-label="Filtrar grupo"><option>Todos</option><option>Jugadores</option><option>PNJ</option><option>Criaturas</option></select><nav id="actors" aria-label="Personajes"></nav></aside><article><h2 id="title"></h2><p id="description"></p><div class="stage"><img id="sprite" alt="Animación en reposo"></div><div class="tools"><button id="play">Pausar</button><button id="step">Un fotograma</button><span class="phase" id="phase"></span><button id="native">Ver en el motor</button></div><div class="tools" style="margin-top:14px"><label>Velocidad <input id="speed" type="range" min="1" max="8" step=".5" value="2.5"><output id="rate">2,5 fps</output></label><label>Ampliación <input id="zoom" type="range" min="1" max="2" step=".1" value="1"></label></div><small>La vista de sprites ajusta el dibujo al recuadro para revisar detalles. Las alturas visuales individuales son estimaciones cuando la aventura solo define la categoría de tamaño.</small><details id="compare"><summary>Comparar la pose anterior y la candidata</summary><div id="comparison"></div></details><details><summary>Alcance de esta entrega</summary><p>Ciclos de reposo de ocho fases. Se conservan las demás direcciones y acciones existentes; cada ciclo nuevo tiene una vista base declarada. Los micónidos secundarios comparten el ciclo de adulto o brote, manteniendo sus nombres. Las dos arpías pueden reutilizar su apariencia actual.</p><p>La muestra de Runara está aprobada. Los demás ciclos quedan disponibles para revisión visual.</p><a href="native/idle-proof.json">Comprobación de reproducción en el motor</a> · <a href="idle-gallery-manifest.json">Procedencia de imágenes</a></details></article></main><script>
const data=${payload};let selected,frame=0,playing=true,native=false,timer,images=[];const $=s=>document.querySelector(s);
function navigation(){const text=$('#search').value.toLocaleLowerCase('es'),group=$('#group').value;$('#actors').replaceChildren();for(const g of ['Jugadores','PNJ','Criaturas']){const rows=data.filter(a=>a.group===g&&(group==='Todos'||group===g)&&a.name.toLocaleLowerCase('es').includes(text));if(!rows.length)continue;const h=document.createElement('div');h.className='group';h.textContent=g;$('#actors').append(h);for(const a of rows){const b=document.createElement('button');b.className='actor';b.textContent=a.name;b.setAttribute('aria-pressed',String(selected?.id===a.id));b.onclick=()=>choose(a);$('#actors').append(b)}}}
function draw(){if(!selected)return;const list=native?selected.native:selected.frames;$('#sprite').src=list[frame];$('#phase').textContent='Fotograma '+(frame+1)+' / 8';$('#sprite').alt=selected.name+' en reposo · fotograma '+(frame+1)}
function clock(){clearInterval(timer);timer=setInterval(()=>{if(playing&&selected){frame=(frame+1)%8;draw()}},1000/Number($('#speed').value))}
function choose(a){selected=a;frame=0;native=false;$('#title').textContent=a.name;$('#description').textContent='Reposo · ocho fases · vista base '+a.direction.toUpperCase()+(a.height?' · altura visual '+a.height.toLocaleString('es')+' m':'');$('#native').disabled=!a.native;$('#native').textContent='Ver en el motor';$('#comparison').innerHTML=a.comparison;$('#compare').hidden=!a.comparison;images=[...a.frames,...(a.native??[])].map(path=>{const i=new Image();i.src=path;return i});$('#speed').value=a.fps;$('#rate').textContent=String(a.fps).replace('.',',')+' fps';navigation();clock();draw()}
$('#play').onclick=()=>{playing=!playing;$('#play').textContent=playing?'Pausar':'Reproducir'};$('#step').onclick=()=>{playing=false;$('#play').textContent='Reproducir';frame=(frame+1)%8;draw()};$('#native').onclick=()=>{native=!native;$('#native').textContent=native?'Ver sprites':'Ver en el motor';draw()};$('#speed').oninput=()=>{$('#rate').textContent=$('#speed').value.replace('.',',')+' fps';clock()};$('#zoom').oninput=()=>{$('#sprite').style.transform='scale('+$('#zoom').value+')'};$('#search').oninput=navigation;$('#group').onchange=navigation;choose(data.find(a=>a.id==='mike')??data[0]);
</script>${visualComparisonAssets()}</html>`;
await writeFile(resolve(out,'index.html'),html);
await writeFile(resolve(out,'idle-gallery-manifest.json'),JSON.stringify({date:'2026-11-17',cycles:records.length,frames:records.length*8,nativeProof:proof.revision??null,nativeFailures:proof.failures,records:records.map(({comparison,...r})=>r),originals},null,2)+'\n');
console.log(JSON.stringify({cycles:records.length,frames:records.length*8,nativeComplete:records.filter(r=>r.native).length,comparisons:records.filter(r=>r.comparison).length,file:resolve(out,'index.html')}));
