import {WorldRenderer} from '../apps/web/world';
import {oneShotCampaignDefinition} from '../campaigns/one-shot/public/pack';
import type {WorldSnapshot} from '../engine/shared/protocol';
import {AudioDirector} from '../apps/web/audio';
import {Howler} from 'howler';
const stage=location.pathname.split('/')[1]!,host=document.getElementById('world')!,status=document.getElementById('status')!;
const options={cameraRole:'player' as 'player'|'dm'|'projector',showGrid:false,persistCameraPreferences:new URLSearchParams(location.search).has('continuous'),cameraPreferenceNamespace:'continuous-review'};
let renderer=new WorldRenderer(host,oneShotCampaignDefinition,options),errors:string[]=[];
window.addEventListener('error',e=>errors.push(e.message));window.addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
let points:{id:string;snapshot:WorldSnapshot}[]=[],snapshot:WorldSnapshot,index=0,revision=0,grid=false;
let reviewEpoch=0,reviewScene='';
async function applyFresh(value:WorldSnapshot){
 snapshot=structuredClone(value);if(reviewScene!==snapshot.sceneId){reviewScene=snapshot.sceneId;reviewEpoch++;}
 snapshot.sceneEpoch=reviewEpoch;snapshot.revision=++revision;
 const delta=Date.now()-snapshot.serverTime;snapshot.serverTime+=delta;
 for(const entity of snapshot.entities)if(entity.step)entity.step.startedAt+=delta;
 if(snapshot.gameClock)snapshot.gameClock.serverTime+=delta;
 if(!await renderer.applySnapshot(snapshot))throw Error('Review snapshot rejected: '+reviewScene);
 if(renderer.getCameraAudit().scene!==reviewScene)throw Error('Review loaded the wrong scene');
}
const frame=()=>new Promise<void>(r=>setTimeout(r,32));
async function settle(){
 for(let i=0;i<240;i++){renderer.renderCaptureFrame(32,i%12!==0);if(i%12===0)await frame();}
 const deadline=performance.now()+15000;
 while(!renderer.getCameraAudit().ready&&performance.now()<deadline){renderer.renderCaptureFrame(32);await frame();}
 const audit=renderer.getCameraAudit();if(!audit.ready)throw Error('Resources not ready: '+JSON.stringify({scene:audit.scene,textures:audit.pendingTextures,meshes:audit.pendingMeshes,actors:audit.nativeActors}));
}
async function load(i:number){index=i;const value=structuredClone(points[i]!.snapshot);value.environment.timeOfDay='sunset';value.camera={mode:'follow',focusId:'maria'};await applyFresh(value);renderer.setLocalPlayer('maria');renderer.setCameraFocusCell(snapshot.entities.find(e=>e.id==='maria')!.cell);if(!new URLSearchParams(location.search).has('continuous'))renderer.setCameraTiltDegrees(15);renderer.setCameraOrientation(0);renderer.zoomCameraBy(2/renderer.getCameraAudit().zoom);await settle();}
function canvas(){renderer.renderCaptureFrame();const c=document.createElement('canvas');c.width=host.clientWidth;c.height=host.clientHeight;const ctx=c.getContext('2d')!;for(const layer of host.querySelectorAll('canvas'))if(!layer.hidden)ctx.drawImage(layer,0,0,c.width,c.height);return c;}
async function save(name:string,value:HTMLCanvasElement|object){const body=value instanceof HTMLCanvasElement?await new Promise<Blob>(r=>value.toBlob(b=>r(b!),'image/png')):JSON.stringify(value);const res=await fetch(`/evidence?name=${stage}-${name}.${value instanceof HTMLCanvasElement?'png':'json'}`,{method:'POST',body});if(!res.ok)throw Error(await res.text());}
async function matrix(){const rows=[];for(let p=0;p<points.length;p++){await load(p);const sheet=document.createElement('canvas');sheet.width=2000;sheet.height=996;const ctx=sheet.getContext('2d')!;let n=0;for(const tilt of [5,10,15,25])for(const yaw of [-2,-1,0,1,2]){renderer.setCameraTiltDegrees(tilt);renderer.setCameraOrientation(yaw);await settle();const audit=renderer.getCameraAudit(),view=canvas(),id=`${points[p]!.id}-${tilt}-${yaw+2}`;await save(id,view);const x=n%5*400,y=Math.floor(n/5)*249;ctx.fillStyle='#111c26';ctx.fillRect(x,y,400,249);ctx.drawImage(view,x,y+24,400,225);ctx.fillStyle='#eee0b7';ctx.font='13px system-ui';ctx.fillText(`${points[p]!.id} · ${tilt}° / ${yaw*15}° · ${audit.zoom.toFixed(2)}x`,x+8,y+17);rows.push({id,...audit});n++;status.textContent=`${rows.length}/${points.length*20} · ${id}`;}await save(points[p]!.id+'-sheet',sheet);}await save('matrix',{rows,errors,at:new Date().toISOString(),viewport:[1280,720]});status.textContent=`Completado: ${rows.length} vistas; errores ${errors.length}`;}
async function extras(){const rows=[];await load(3);for(const time of ['day','sunset','night','dawn'] as const){snapshot.environment.timeOfDay=time;snapshot.revision=++revision;await renderer.applySnapshot(snapshot);await settle();await save(time,canvas());rows.push({time,...renderer.getCameraAudit()});}for(const [w,h] of [[390,844],[844,390],[1920,1080],[1280,720]])for(const role of ['player','dm','projector'] as const){host.style.width=w+'px';host.style.height=h+'px';options.cameraRole=role;renderer.setLocalPlayer(role==='player'?'maria':null);renderer.refreshLayout();await settle();await save(`${role}-${w}-${h}`,canvas());rows.push({role,w,h,costs:renderer.measureCaptureFrameCosts(),...renderer.getCameraAudit()});}await save('extras',{rows,errors});status.textContent='Luz, tamaños y perfiles medidos';}
const run=(f:()=>Promise<void>)=>void f().catch(e=>{errors.push(String(e));status.textContent=String(e);});
if(new URLSearchParams(location.search).has('immersive')){
 const add=(name:string,action:()=>Promise<void>)=>{const b=document.createElement('button');b.textContent=name;b.onclick=()=>run(action);document.querySelector('header')!.append(b);};
 add('Espejo sin jugadores',async()=>{
  await load(0);const empty=structuredClone(points[0]!.snapshot);empty.entities=[];empty.camera={mode:'follow'};renderer.setLocalPlayer(null);renderer.setCameraFocusCell(null);await applyFresh(empty);await settle();
  const audit=renderer.getCameraAudit();await save('empty-table',canvas());await save('empty-table',{audit,errors});status.textContent='Espejo sin jugadores comprobado';
 });
 add('Cámara · recorrido y giros',async()=>{
  const data=await(await fetch('/movement-fixtures.json')).json();await load(0);renderer.setCameraFocusCell(null);host.style.width='1280px';host.style.height='720px';renderer.refreshLayout();
  const movie=canvas(),ctx=movie.getContext('2d')!,stream=movie.captureStream(24),chunks:Blob[]=[],samples:any[]=[];
  const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8',videoBitsPerSecond:2600000});recorder.ondataavailable=e=>chunks.push(e.data);recorder.start();
  const start=performance.now();let prior=0,phase=-1,lastSample=-Infinity;
  const draw=()=>{const elapsed=performance.now()-start,k=Math.min(4,Math.floor(elapsed/7000));if(k!==phase){phase=k;renderer.setCameraOrientation([0,-2,2,0,1][k]!);renderer.setCameraTiltDegrees([15,10,5,20,25][k]!);}
   ctx.drawImage(canvas(),0,0);if(elapsed-lastSample>100){lastSample=elapsed;const a=renderer.getCameraAudit();samples.push({at:elapsed,tilt:a.tilt,yaw:a.orientation,zoom:a.zoom,pose:a.pose,actors:a.actors,ready:a.ready});}
  };
  for(const item of data.frames){const until=start+item.at;while(performance.now()<until){draw();await frame();}await applyFresh(item.snapshot);draw();prior=item.at;status.textContent=`Cámara: ${(item.at/1000).toFixed(1)} s · giro ${phase}`;}
  const end=performance.now()+1400;while(performance.now()<end){draw();await frame();}
  const stopped=new Promise<void>(r=>recorder.onstop=()=>r());recorder.stop();await stopped;stream.getTracks().forEach(t=>t.stop());await fetch(`/evidence?name=${stage}-camera-motion.webm`,{method:'POST',body:new Blob(chunks,{type:'video/webm'})});await save('camera-motion',{samples,errors,serverFrames:data.frames.length,durationMs:performance.now()-start});status.textContent='Cámara en movimiento guardada';
 });
 add('Sonido · 70 segundos',async()=>{
  const audio=new AudioDirector(oneShotCampaignDefinition.audio),profile=oneShotCampaignDefinition.audio.sceneProfiles!.mirror!,now=Date.now(),events:any[]=[];
  const track=(p:any)=>({assetId:p.id,playing:p.playing,volume:p.volume,offset:0,startedAt:now,loop:true,rate:1,repeats:1});
  audio.apply({music:track(profile.music),layers:Object.fromEntries(Object.entries(profile.layers).map(([k,v])=>[k,track(v)])) as any,sfxLoops:{}});
  const unlocked=await audio.unlock();if(!unlocked)throw Error('Audio requires a browser gesture');
  const context=Howler.ctx,destination=context.createMediaStreamDestination();Howler.masterGain.connect(destination);
  const chunks:Blob[]=[],recorder=new MediaRecorder(destination.stream,{mimeType:'audio/webm;codecs=opus'});recorder.ondataavailable=e=>chunks.push(e.data);
  const start=performance.now(),play=audio.playSfx.bind(audio);audio.playSfx=(id,volume)=>{events.push({id,volume,atMs:performance.now()-start});play(id,volume);};
  audio.setSceneAmbience(points[0]!.snapshot);recorder.start();
  while(performance.now()-start<70000){status.textContent=`Ambiente sonoro: ${Math.floor((performance.now()-start)/1000)}/70 s · ${events.length} incidencias`;await new Promise(r=>setTimeout(r,250));}
  audio.reset();const stopped=new Promise<void>(r=>recorder.onstop=()=>r());recorder.stop();await stopped;Howler.masterGain.disconnect(destination);destination.stream.getTracks().forEach(t=>t.stop());
  for(const sounds of [(audio as any).channels,(audio as any).sfx])for(const sound of sounds.values())sound.unload();
  await fetch(`/evidence?name=${stage}-cave-audio.webm`,{method:'POST',body:new Blob(chunks,{type:'audio/webm'})});await save('cave-audio',{unlocked,contextState:context.state,events,intervalSeconds:profile.ambientCues!.intervalSeconds,errors});status.textContent='Ambiente sonoro grabado · 70 segundos';
 });
}
if(new URLSearchParams(location.search).has('seal-review')){
 const label=new URLSearchParams(location.search).get('seal-review')==='before'?'before':'after';
 const button=document.createElement('button');button.textContent='Sello · 70 vistas';document.querySelector('header')!.append(button);
 button.onclick=()=>run(async()=>{
  const f=await(await fetch('/exit-fixtures.json')).json(),rows=[];
  for(const [name,value] of [['approach',f.closed],['near',f.closedNear]] as const){
   await applyFresh(value);renderer.setLocalPlayer('maria');renderer.setCameraFocusCell(null);renderer.zoomCameraBy(2/renderer.getCameraAudit().zoom);
   const sheet=document.createElement('canvas');sheet.width=2000;sheet.height=1743;const ctx=sheet.getContext('2d')!;let n=0;
   for(const tilt of [5,7.35,10,12.6,15,20,25])for(const yaw of [-2,-1,0,1,2]){
    renderer.setCameraTiltDegrees(tilt);renderer.setCameraOrientation(yaw);await settle();
    const view=canvas(),id=`seal-${label}-${name}-${String(tilt).replace('.','p')}-${yaw+2}`,audit=renderer.getCameraAudit();await save(id,view);
    const x=n%5*400,y=Math.floor(n/5)*249;ctx.fillStyle='#101923';ctx.fillRect(x,y,400,249);ctx.drawImage(view,x,y+24,400,225);ctx.fillStyle='#e5edf2';ctx.font='13px system-ui';ctx.fillText(`${name} · ${tilt}° / ${yaw*15}°`,x+8,y+17);
    rows.push({id,...audit});n++;status.textContent=`Sello ${label}: ${rows.length}/70`;
   }
   await save(`seal-${label}-${name}-sheet`,sheet);
  }
  await save(`seal-${label}-matrix`,{rows,errors});status.textContent=`Sello ${label}: 70 vistas guardadas · ${errors.length} errores`;
 });
 const air=document.createElement('button');air.textContent='Ambiente · 12 segundos';document.querySelector('header')!.append(air);
 air.onclick=()=>run(async()=>{
  await load(3);const movie=canvas(),ctx=movie.getContext('2d')!,stream=movie.captureStream(24),chunks:Blob[]=[];
  const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8',videoBitsPerSecond:2200000});recorder.ondataavailable=e=>chunks.push(e.data);recorder.start();
  const until=performance.now()+12000;while(performance.now()<until){ctx.drawImage(canvas(),0,0);await frame();}
  const stopped=new Promise<void>(r=>recorder.onstop=()=>r());recorder.stop();await stopped;stream.getTracks().forEach(t=>t.stop());
  await fetch(`/evidence?name=${stage}-atmosphere.webm`,{method:'POST',body:new Blob(chunks,{type:'video/webm'})});await save('atmosphere',{audit:renderer.getCameraAudit(),costs:renderer.measureCaptureFrameCosts(),errors});status.textContent='Ambiente guardado';
 });
}
if(new URLSearchParams(location.search).has('icepass')){
 const exit=document.createElement('button');exit.textContent='Salida a Anteros';document.querySelector('header')!.append(exit);
 exit.onclick=()=>run(async()=>{
  const f=await(await fetch('/exit-fixtures.json')).json();await applyFresh(f.closed);renderer.setLocalPlayer('maria');renderer.setCameraFocusCell(null);renderer.setCameraTiltDegrees(15);renderer.setCameraOrientation(0);renderer.zoomCameraBy(2/renderer.getCameraAudit().zoom);await settle();await save('exit-sealed',canvas());
  const movie=canvas(),ctx=movie.getContext('2d')!,stream=movie.captureStream(24),chunks:Blob[]=[];const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8',videoBitsPerSecond:3000000});recorder.ondataavailable=e=>chunks.push(e.data);recorder.start();
  const clip=async(ms:number)=>{const until=performance.now()+ms;while(performance.now()<until){ctx.drawImage(canvas(),0,0);await frame();}};
  const stages=[];await clip(350);const applied=applyFresh(f.open);await clip(170);const crackImage=canvas();stages.push(renderer.getCameraAudit());await clip(430);const burstImage=canvas();stages.push(renderer.getCameraAudit());await applied;await clip(1500);const openImage=canvas();stages.push(renderer.getCameraAudit());
  await applyFresh(f.approaching);await clip(f.approachMs);await applyFresh(f.walking);await clip(f.durationMs);
  const departureSamples=[],strideImages:HTMLCanvasElement[]=[];
  if(f.departure){await applyFresh(f.departure);for(let i=0;i<5;i++){await clip(f.departureMs/5);departureSamples.push(renderer.getCameraAudit());strideImages.push(canvas());}}
  await applyFresh(f.dinner);await settle();await clip(650);await save('exit-dinner',canvas());
  const stopped=new Promise<void>(r=>recorder.onstop=()=>r());recorder.stop();await stopped;stream.getTracks().forEach(t=>t.stop());for(let i=0;i<strideImages.length;i++)await save(`exit-stride-${i+1}`,strideImages[i]!);await save('exit-cracks',crackImage);await save('exit-burst',burstImage);await save('exit-open',openImage);await save('exit-stages',{stages,departureSamples});await fetch(`/evidence?name=${stage}-exit.webm`,{method:'POST',body:new Blob(chunks,{type:'video/webm'})});await save('exit',{errors,serverFixtures:true,arrival:renderer.getCameraAudit(),note:'HP defeat, threshold steps and five-cell timed departure came from GameState; no automatic story choice.'});status.textContent='Salida comprobada: sello, grietas, rotura, recorrido y cena';
 });
 const detail=document.createElement('button');detail.textContent='Detalle reflejos';document.querySelector('header')!.append(detail);detail.onclick=()=>run(async()=>{await load(3);renderer.zoomCameraBy(4/renderer.getCameraAudit().zoom);await settle();await save('reflection-detail',canvas());await save('reflection-detail',renderer.getCameraAudit());status.textContent='Detalle del reflejo guardado';});
}
document.getElementById('capture')!.onclick=()=>run(async()=>{
 host.style.width='1280px';host.style.height='720px';options.cameraRole='player';const rows=[];
 for(const i of [0,3,2]){await load(i);renderer.setGridVisible(false);await settle();await save(points[i]!.id,canvas());rows.push(renderer.getCameraAudit());}
 renderer.frameSceneOverview();await settle();await save('overview',canvas());rows.push(renderer.getCameraAudit());
 await save('checkpoint',{rows,errors});status.textContent=`Avance guardado: ${stage} · ${errors.length} errores`;
});
async function acceptance(onlySequence=false){
 const started=performance.now(),samples:any[]=[],visibility:any[]=[];
 document.addEventListener('visibilitychange',()=>visibility.push({at:performance.now()-started,state:document.visibilityState}));
 const fixtures=await(await fetch('/sequence-fixtures.json')).json();
 const apply=applyFresh;
 const cold=performance.now();await apply(fixtures.cafe);await settle();const cafeCost=renderer.measureCaptureFrameCosts();
 const warm=performance.now();await load(3);const mirrorWarmMs=performance.now()-warm;
 const video=canvas(),ctx=video.getContext('2d')!,stream=video.captureStream(24),chunks:Blob[]=[];
 const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8',videoBitsPerSecond:3000000});
 recorder.ondataavailable=e=>chunks.push(e.data);recorder.start();
 const clip=async(ms:number)=>{const until=performance.now()+ms;while(performance.now()<until){renderer.renderCaptureFrame(32);ctx.drawImage(canvas(),0,0);await frame();}};
 // Replay server-validated safe snapshots, then native turn/attack/fall presentation.
 for(let i=0;i<points.length;i++){await load(i);await clip(450);}
 for(const yaw of [-2,-1,0,1,2,0]){renderer.setCameraOrientation(yaw);await clip(350);}
 await apply(fixtures.before);renderer.frameSceneOverview();await settle();await clip(600);
 await apply(fixtures.after);
 const event={eventId:'isolated-review-'+Date.now(),serverTime:Date.now()};
 renderer.playMirrorTransformation('true-love-mirror','maria',fixtures.reflectionId,[],1600,event);
 renderer.playMirrorTransformation('true-love-mirror','maria',fixtures.reflectionId,[],1600,event);
 await clip(550);await save('activation',canvas());await clip(1300);await save('apparition',canvas());
 renderer.setCombatOverview(true);renderer.setGridVisible(true);renderer.playRangedAttack('maria',fixtures.reflectionId,'arrow',true);await clip(1000);await save('combat',canvas());
 renderer.playTokenAnimation(fixtures.reflectionId,'fall',650);await clip(850);await save('fall',canvas());
 renderer.setCombatOverview(false);renderer.setGridVisible(false);
 const stopped=new Promise<void>(r=>recorder.onstop=()=>r());recorder.stop();await stopped;stream.getTracks().forEach(t=>t.stop());
 await fetch(`/evidence?name=${stage}-presentation.webm`,{method:'POST',body:new Blob(chunks,{type:'video/webm'})});
 await save('sequence',{errors,serverFixtures:true,duplicateEventSubmitted:true,cafeCost,roundTripMs:performance.now()-cold,mirrorWarmMs,note:'Presentation replay; authoritative actions are covered separately by socket integration.'});
 if(onlySequence){status.textContent='Secuencia guardada';return;}
 await matrix();await extras();host.style.width='1280px';host.style.height='720px';renderer.refreshLayout();
 let cycle=0;
 while(performance.now()-started<20*60000){
  await apply(fixtures.cafe);await settle();await load(cycle%points.length);
  samples.push({cycle:++cycle,elapsedMs:performance.now()-started,visibility:document.visibilityState,costs:renderer.measureCaptureFrameCosts(),audit:renderer.getCameraAudit()});
  await save('soak-progress',{samples,errors,visibility});
  const until=performance.now()+45000;while(performance.now()<until){renderer.rotateCameraOrientation(cycle%2?1:-1);await clip(1500);status.textContent=`Sesión sostenida: ${((performance.now()-started)/60000).toFixed(1)} / 20 min · ${cycle} cambios ida/vuelta`;}
 }
 await save('soak',{elapsedMs:performance.now()-started,samples,errors,visibility});status.textContent=`E6 terminada · ${cycle} cambios de escena · ${errors.length} errores`;
}
 document.getElementById('acceptance')!.onclick=()=>run(()=>acceptance());
 document.getElementById('sequence')!.onclick=()=>run(()=>acceptance(true));
 document.getElementById('cleanup')!.onclick=()=>run(async()=>{
  const fixtures=await(await fetch('/sequence-fixtures.json')).json(),samples=[];
  for(let cycle=0;cycle<3;cycle++){await applyFresh(fixtures.cafe);await settle();await load(0);samples.push({cycle:cycle+1,audit:renderer.getCameraAudit(),costs:renderer.measureCaptureFrameCosts()});}
  await save('cleanup',{samples,errors});status.textContent='Limpieza comprobada: 3 cambios ida/vuelta';
 });
document.getElementById('motion')!.onclick=()=>run(async()=>{
 const data=await(await fetch('/movement-fixtures.json')).json();await load(0);renderer.setCameraFocusCell(null);
 const movie=canvas(),ctx=movie.getContext('2d')!,stream=movie.captureStream(24),chunks:Blob[]=[];
 const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8',videoBitsPerSecond:3000000});recorder.ondataavailable=e=>chunks.push(e.data);recorder.start();
 let prior=0;for(const item of data.frames){const until=performance.now()+Math.max(0,item.at-prior);while(performance.now()<until){ctx.drawImage(canvas(),0,0);await frame();}await applyFresh(item.snapshot);ctx.drawImage(canvas(),0,0);prior=item.at;status.textContent=`Movimiento de servidor · ${(item.at/1000).toFixed(1)} s`;}
 const stopped=new Promise<void>(r=>recorder.onstop=()=>r());recorder.stop();await stopped;stream.getTracks().forEach(t=>t.stop());
 await fetch(`/evidence?name=${stage}-walk.webm`,{method:'POST',body:new Blob(chunks,{type:'video/webm'})});await save('walk',{frames:data.frames.length,durationMs:data.durationMs,errors,audit:renderer.getCameraAudit()});status.textContent='Recorrido continuo guardado';
});
document.getElementById('smoke')!.onclick=()=>run(async()=>{const rows=[];for(let i=0;i<points.length;i++){await load(i);await save(points[i]!.id+'-phase',canvas());rows.push(renderer.getCameraAudit());}await save('phase',{rows,errors});status.textContent=`Fase comprobada: ${points.length} posiciones`;});
document.getElementById('matrix')!.onclick=()=>run(matrix);document.getElementById('extra')!.onclick=()=>run(extras);
document.getElementById('left')!.onclick=()=>renderer.rotateCameraOrientation(-1);document.getElementById('right')!.onclick=()=>renderer.rotateCameraOrientation(1);
document.getElementById('near')!.onclick=()=>renderer.zoomCameraBy(1.3);document.getElementById('far')!.onclick=()=>renderer.zoomCameraBy(1/1.3);document.getElementById('grid')!.onclick=()=>renderer.setGridVisible(grid=!grid);
run(async()=>{points=await(await fetch('/safe-snapshots.json')).json();const select=document.getElementById('point') as HTMLSelectElement;select.replaceChildren(...points.map((p,i)=>new Option(p.id,String(i))));select.onchange=()=>run(()=>load(Number(select.value)));await renderer.ready;await load(0);status.textContent='Listo · posiciones obtenidas con movimiento del servidor';});


if(new URLSearchParams(location.search).has('cameraTest')){
 const header=document.querySelector('header')!;
 const report=()=>{const a=renderer.getCameraAudit();status.textContent=JSON.stringify({tilt:a.tilt,orientation:a.orientation,zoom:a.zoom,halfHeight:a.pose?.halfHeight,target:a.pose?.target,actors:a.actors,errors},null,2);};
 for(const tilt of [5,10,15,25]){const button=document.createElement('button');button.textContent=tilt+'° vertical';button.onclick=()=>run(async()=>{renderer.setCameraTiltDegrees(tilt);await settle();report();});header.append(button);}
 for(const role of ['dm','player'] as const){const button=document.createElement('button');button.textContent='Vista '+role;button.onclick=()=>run(async()=>{options.cameraRole=role;renderer.setLocalPlayer(role==='player'?'maria':null);renderer.setSelectedEntity('maria');await settle();report();});header.append(button);}
 const walk=document.createElement('button');walk.textContent='Comprobar zoom junto al borde';header.append(walk);
 walk.onclick=()=>run(async()=>{const rows=[];const before=renderer.getCameraAudit().pose!.halfHeight;for(const p of points){const value=structuredClone(p.snapshot);value.camera={mode:'follow',focusId:'maria'};await applyFresh(value);await settle();const a=renderer.getCameraAudit();rows.push({id:p.id,halfHeight:a.pose!.halfHeight,zoom:a.zoom,tilt:a.tilt});}await save('camera-fixed-zoom',{before,rows,errors});status.textContent=JSON.stringify({before,rows,errors},null,2);});
 for(const [id,factor] of [['near',1.3],['far',1/1.3]] as const)document.getElementById(id)!.onclick=()=>run(async()=>{renderer.zoomCameraBy(factor);await settle();report();});
}

if(new URLSearchParams(location.search).has('continuous')){
 const header=document.querySelector('header')!,input=document.createElement('input');input.type='number';input.min='5';input.max='25';input.step='0.01';input.value='7.35';input.setAttribute('aria-label','Ángulo vertical de prueba');header.append(input);
 const report=()=>{const a=renderer.getCameraAudit();status.textContent=JSON.stringify({tilt:a.tilt,zoom:a.zoom,halfHeight:a.pose?.halfHeight,renderedTilt:a.pose?90-a.pose.beta*180/Math.PI:null,actors:a.actors,errors},null,2);};
 const button=(label:string,action:()=>Promise<void>)=>{const b=document.createElement('button');b.textContent=label;b.onclick=()=>run(action);header.append(b);};
 button('Leer cámara',async()=>{await settle();report();});
 button('Aplicar ángulo exacto',async()=>{renderer.setCameraTiltDegrees(Number(input.value));await settle();report();});
 button('Recrear pantalla del jugador',async()=>{const value=structuredClone(snapshot);renderer.dispose();renderer=new WorldRenderer(host,oneShotCampaignDefinition,options);renderer.setLocalPlayer('maria');await renderer.ready;await applyFresh(value);await settle();report();await save('continuous-restored',renderer.getCameraAudit());});
 button('Comprobar combate sin cambiar inclinación',async()=>{const f=await(await fetch('/sequence-fixtures.json')).json();const angle=renderer.getCameraTiltDegrees();await applyFresh(f.after);await settle();const combat=renderer.getCameraAudit();await applyFresh(points[index]!.snapshot);await settle();const after=renderer.getCameraAudit();await save('continuous-combat',{angle,combat:{tilt:combat.tilt,pose:combat.pose},after:{tilt:after.tilt,pose:after.pose},errors});report();});
}
