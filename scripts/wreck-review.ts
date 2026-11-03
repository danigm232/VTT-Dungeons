import { WorldRenderer } from '../apps/web/world';
import { publicCampaignDefinition } from '../campaigns/stormwreck-isle/public/pack';
import { wreckPorts } from '../campaigns/stormwreck-isle/public/wreck-runtime';
import { PROTOCOL_VERSION,OBJECT_MODEL_VERSION,type WorldSnapshot,type PublicProp,type PublicEntity } from '../engine/shared/protocol';
import { terrainTile } from '../engine/shared/terrain';
import { wreckCabins, wreckCabinAt } from '../engine/client/wreck-cabins';
import { advanceClimate,emptyClimateState } from '../engine/shared/game-time';
const $=(id:string)=>document.getElementById(id)!;
const evidenceFolder=location.port==='4616'?'pecio-straw-scale-20261012':location.port==='4615'?'pecio-nest-20261012':location.port==='4613'?'pecio-rain-detail-20261012':location.port==='4612'?'pecio-atmosphere-20261012':'pecio-detail-20261010';
let busy=false;
const setBusy=(value:boolean)=>{busy=value;for(const control of document.querySelectorAll<HTMLButtonElement|HTMLSelectElement|HTMLInputElement>('button,select,input'))control.disabled=value;};
const campaign=structuredClone(publicCampaignDefinition),scene=campaign.scenes.find(s=>s.id==='wreck-ship')!;
const renderer=new WorldRenderer($('world'),campaign,{showGrid:false,persistCameraPreferences:false,showStairMarker:false});
const errors:string[]=[];window.addEventListener('error',e=>errors.push(e.message));window.addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
const entities:PublicEntity[]=campaign.roster.map((a,i)=>({...a,kind:'player',cell:scene.spawns[i%scene.spawns.length]!,surfaceId:'main',facing:'south',moving:false,step:null,sceneId:scene.id,hp:10,maxHp:10}));
entities.push(...(scene.stageActors??[]).map(a=>({...a,kind:'npc' as const,color:'#a89669',surfaceId:a.surfaceId??'main',facing:'east' as const,moving:false,step:null,sceneId:scene.id})));
const props=scene.props.map(p=>({...p,surfaceId:p.surfaceId??scene.surfaceId,footprint:p.baseFootprint,structure:'intact',state:p.kind==='door'?p.initialState:'upright',attachment:'attached',...(p.kind==='wheel'?{mount:p.mount}:{})})) as PublicProp[];
const snapshot:WorldSnapshot={v:PROTOCOL_VERSION,objectModelVersion:OBJECT_MODEL_VERSION,revision:1,serverTime:Date.now(),sceneId:scene.id,scene,sceneEpoch:1,runtimeEpoch:'isolated-wreck-review',entities,
  gameClock:{seconds:43200,serverTime:Date.now(),running:false,pauseReason:'dm',mode:'paused'},climate:emptyClimateState(43200),
  tokenAssets:{tokens:campaign.tokens,tokenAnimations:campaign.tokenAnimations},props,camera:{mode:'fixed',focusId:null},environment:{storm:false,lightning:false,stormIntensity:0,timeOfDay:'day',precipitation:'none',precipitationLevel:1,windIntensity:.2},
  combat:{active:false,round:0,currentId:null,movement:null,participants:[],lastEvent:null}};
async function settle(){
  for(let i=0;i<80;i++)renderer.renderCaptureFrame(32,true);
  // A room/weather change recompiles lighting variants after camera-only
  // damping. Yield real event-loop frames before reading the colour buffer;
  // otherwise the first interior capture can contain only the clear colour.
  for(let i=0;i<4;i++){renderer.renderCaptureFrame(16);await new Promise<void>(resolve=>setTimeout(resolve,32));}
  renderer.renderCaptureFrame(16);
}
async function capture(name:string,settleBefore=true){
  if(settleBefore)await settle();else renderer.renderCaptureFrame(16);
  const host=$('world'),canvas=document.createElement('canvas');canvas.width=host.clientWidth;canvas.height=host.clientHeight;
  const ctx=canvas.getContext('2d')!;for(const layer of host.querySelectorAll('canvas'))if(!layer.hidden)ctx.drawImage(layer,0,0,canvas.width,canvas.height);
  const blob=await new Promise<Blob>(r=>canvas.toBlob(b=>r(b!),'image/png'));await fetch(`/__wreck_capture?name=wreck-${name}.png`,{method:'POST',body:blob});
}
const positions:Record<string,{col:number;row:number}>={main:scene.spawns[0]!,c2:{col:43,row:14},c3:{col:14,row:13},crow:wreckPorts.find(p=>p.id==='P10')!.to.cell,
  breach:wreckPorts.find(p=>p.id==='P16')!.from.cell,bones:{col:17,row:28},
  boat:scene.stageActors?.find(a=>a.tokenId==='wreck-rowboat')?.cell??{col:30,row:21},
  'lower-deck':{col:19,row:16},'hold-air':wreckPorts.find(p=>p.id==='P14')?.to.cell??{col:33,row:18}};
for(const [id,b] of Object.entries(wreckCabins))positions[id]={col:b.maxCol-1,row:b.maxRow-1};
async function focus(surface:string){const actor=entities[0]!;const preferred=positions[surface]!;
  const actualSurface=/^c[4-7]$/.test(surface)?'main':['breach','bones','boat'].includes(surface)?'sea':surface;
  renderer.frameSceneOverview();
  actor.cell=terrainTile(scene.terrain!,{surfaceId:actualSurface,cell:preferred})?preferred:scene.terrain!.surfaces.find(s=>s.id===actualSurface)!.tiles[0]!.cell;
  actor.surfaceId=actualSurface;actor.carriedLightRadiusMeters=($('carried-light') as HTMLInputElement).checked?6:undefined;
  snapshot.environment!.timeOfDay=($('night') as HTMLInputElement).checked?'night':'day';
  snapshot.camera={mode:'follow',focusId:actor.id};snapshot.revision++;snapshot.serverTime=Date.now();renderer.setSelectedEntity(actor.id);
  await renderer.applySnapshot(structuredClone(snapshot));await settle();
  $('status').textContent=`Vista ${surface} · ${actor.carriedLightRadiusMeters?'con luz portada':'sin luz portada'} · visor aislado.`;
}
async function overview(){snapshot.camera={mode:'fixed',focusId:null};renderer.setSelectedEntity(null);renderer.setLocalPlayer(null);snapshot.revision++;await renderer.applySnapshot(structuredClone(snapshot));renderer.frameSceneOverview();await settle();}
$('left').onclick=()=>renderer.rotateCameraOrientation(-1);$('right').onclick=()=>renderer.rotateCameraOrientation(1);
$('closer').onclick=()=>renderer.zoomCameraBy(1.4);$('farther').onclick=()=>renderer.zoomCameraBy(1/1.4);
$('overview').onclick=()=>void overview();$('focus').onclick=()=>void focus(($('location') as HTMLSelectElement).value);
if($('scenic-tilt'))$('scenic-tilt').onchange=()=>renderer.setCameraTiltDegrees(Number(($('scenic-tilt') as HTMLSelectElement).value));
$('carried-light').onchange=$('night').onchange=()=>void focus(($('location') as HTMLSelectElement).value);
if($('reflections'))$('reflections').onchange=()=>renderer.setWreckReflectionsEnabled(($('reflections') as HTMLInputElement).checked);
if($('dense-fog'))$('dense-fog').onchange=async()=>{snapshot.climate.fogDensity=($('dense-fog') as HTMLInputElement).checked?1:0;snapshot.environment!.fogTarget=snapshot.climate.fogDensity;snapshot.revision++;await renderer.applySnapshot(structuredClone(snapshot));await settle();};
if($('sight-audit'))$('sight-audit').onclick=async()=>{await capture(`sight-${($('location') as HTMLSelectElement).value}`);const diagnostics={kind:'sight',audit:renderer.getCameraAudit(),cost:renderer.measureCaptureFrameCosts()};$('status').textContent=JSON.stringify(diagnostics);await fetch('/__wreck_sight',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(diagnostics)});};
function setClimate(kind:'none'|'rain'|'snow',level:number,hours:number){
  Object.assign(snapshot.environment!,{precipitation:kind,precipitationLevel:level,temperatureC:kind==='snow'?-4:10,windIntensity:kind==='rain'?.55:.2});
  const seconds=43200+hours*3600;
  snapshot.climate=advanceClimate(emptyClimateState(43200),snapshot.environment!,seconds);snapshot.gameClock={seconds,serverTime:Date.now(),running:false,pauseReason:'dm',mode:'paused'};
}
if($('apply-weather'))$('apply-weather').onclick=async()=>{
  if(busy)return;setBusy(true);try{setClimate(($('precipitation') as HTMLSelectElement).value as 'none'|'rain'|'snow',Number(($('weather-level') as HTMLSelectElement).value),Number(($('weather-hours') as HTMLInputElement).value));await focus(($('location') as HTMLSelectElement).value);}finally{setBusy(false);}
};
if($('capture'))$('capture').onclick=async()=>{if(busy)return;setBusy(true);try{await capture(`manual-${($('location') as HTMLSelectElement).value}-${snapshot.environment!.precipitation}-${($('night') as HTMLInputElement).checked?'night':'day'}`);$('status').textContent='Vista guardada.';}finally{setBusy(false);}};
async function replay(climbOnly=false){
  if(busy)return;setBusy(true);
  try{
    const recordingFile=climbOnly&&location.port==='4615'?'climb-smoke-replay.json':'navigation-replay.json';
    const response=await fetch(`/output/${evidenceFolder}/${recordingFile}`);
    if(!response.ok)throw new Error('Primero ejecuta la prueba de navegación.');
    const recording=await response.json() as {base:WorldSnapshot;frames:Array<Omit<WorldSnapshot,'scene'>>};
    const climbIndex=recording.frames.findIndex(f=>f.entities.find(e=>e.id==='mike')?.step?.movementKind==='climb');
    if(climbOnly&&climbIndex<0)throw new Error('La grabación no incluye escalada.');
    const frames=climbOnly?recording.frames.slice(Math.max(0,climbIndex-1)):recording.frames;
    let previous=frames[0]!.serverTime,climbing=false,extraPause=0;const captured=new Set<string>(),reviewEpoch=crypto.randomUUID();
    const orientation=climbOnly?renderer.getCameraAudit().orientation:0;
    renderer.setLocalPlayer('mike');renderer.setSelectedEntity(null);renderer.setCameraTiltDegrees(35);renderer.setCameraOrientation(orientation);
    for(const frame of frames){
      const gap=frame.serverTime-previous,elapsed=Math.max(0,(climbing?gap:Math.min(1600,gap))-extraPause);
      await new Promise(r=>setTimeout(r,elapsed));previous=frame.serverTime;extraPause=0;
      // Replaying again is a fresh isolated runtime, not an out-of-order
      // packet returning an already-arrived actor to the same ladder cell.
      const view={...structuredClone(recording.base),...structuredClone(frame),runtimeEpoch:reviewEpoch,camera:{mode:'follow',focusId:'mike'}} as WorldSnapshot;
      const offset=Date.now()-view.serverTime;view.serverTime+=offset;
      for(const entity of view.entities){if(entity.step)entity.step.startedAt+=offset;if(entity.id==='mike')entity.carriedLightRadiusMeters=6;}
      await renderer.applySnapshot(view);
      $('status').textContent=`Reproducción de la prueba real · ${view.entities.find(e=>e.id==='mike')?.surfaceId} · pasos y alturas del servidor.`;
      const actor=view.entities.find(e=>e.id==='mike')!;climbing=Boolean(actor.step?.movementKind);
      if(climbing&&!captured.has(`${actor.step!.movementKind}-middle`)){
        extraPause=actor.step!.durationMs*.5;await new Promise(r=>setTimeout(r,extraPause));
        await capture(`walk-${actor.step!.movementKind}-middle`,false);captured.add(`${actor.step!.movementKind}-middle`);
      }
      if(!actor.step){const zone=wreckCabinAt(actor.cell,actor.surfaceId)??actor.surfaceId;
        if(!captured.has(zone)){await capture(`walk-${zone}`,false);captured.add(zone);}}
    }
    await capture('navigation-finish');$('status').textContent=climbOnly?'Escalada comprobada: subida gradual de 15 m a la cofa. Grabación del servidor.':'Recorrido comprobado: C1–C9 y cofa. La grabación no modifica partidas.';
  }catch(e){$('status').textContent=String(e);errors.push(String(e));}finally{setBusy(false);}
}
$('replay').onclick=()=>void replay();$('replay-climb').onclick=()=>void replay(true);
if($('refine-audit'))$('refine-audit').onclick=async()=>{if(busy)return;setBusy(true);try{
  const results=[];setClimate('none',1,0);($('night') as HTMLInputElement).checked=false;($('carried-light') as HTMLInputElement).checked=true;
  renderer.setCameraTiltDegrees(35);await overview();renderer.setTerrainAuditView(90);await capture('refine-hull-top');results.push({name:'hull-top',...renderer.getCameraAudit()});renderer.setTerrainAuditView(null);
  for(const i of [0,2,4,6]){renderer.setCameraOrientation(i);await capture(`refine-hull-${i}`);results.push({name:`hull-${i}`,...renderer.getCameraAudit()});}
  for(const zone of ['main','c2','c3','lower-deck','hold-air','breach']){renderer.setCameraOrientation(0);await focus(zone);await capture(`refine-${zone}`);results.push({name:zone,...renderer.getCameraAudit()});}
  await focus('crow');renderer.zoomCameraBy(1.65);
  for(let i=0;i<8;i++){renderer.setCameraOrientation(i);await capture(`refine-nest-${i}`);results.push({name:`nest-${i}`,...renderer.getCameraAudit()});$('status').textContent=`Paja y huesos: vista ${i+1}/8 guardada.`;}
  renderer.zoomCameraBy(1/1.65);for(const i of [0,4]){renderer.setCameraOrientation(i);await capture(`refine-nest-far-${i}`);results.push({name:`nest-far-${i}`,...renderer.getCameraAudit()});}
  renderer.zoomCameraBy(1.65);renderer.setCameraOrientation(3);
  await fetch('/__wreck_report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'straw-scale',results,errors})});$('status').textContent=`Proporciones y paja: ${results.length} vistas, ${errors.length} errores. Visor aislado.`;
}catch(e){errors.push(String(e));$('status').textContent=String(e);}finally{setBusy(false);}};
if($('nest-looted'))$('nest-looted').onchange=async()=>{
  snapshot.collectedPickups=($('nest-looted') as HTMLInputElement).checked?scene.pickups!.filter(p=>p.id.startsWith('crow-')).map(p=>p.id):[];
  snapshot.revision++;await renderer.applySnapshot(structuredClone(snapshot));await settle();
};
if($('nest-audit'))$('nest-audit').onclick=async()=>{if(busy)return;setBusy(true);try{
  const results=[];setClimate('none',1,0);($('night') as HTMLInputElement).checked=false;($('carried-light') as HTMLInputElement).checked=false;
  ($('location') as HTMLSelectElement).value='crow';snapshot.collectedPickups=[];($('nest-looted') as HTMLInputElement).checked=false;
  renderer.setCameraTiltDegrees(35);await focus('crow');renderer.zoomCameraBy(1.4);
  for(let i=0;i<8;i++){renderer.setCameraOrientation(i);await capture(`nest-close-${i}`);results.push({name:`nest-close-${i}`,...renderer.getCameraAudit()});$('status').textContent=`Nido: vista cercana ${i+1}/8 guardada.`;}
  renderer.setTerrainAuditView(90);await capture('nest-top');results.push({name:'nest-top',...renderer.getCameraAudit()});renderer.setTerrainAuditView(null);
  renderer.setCameraTiltDegrees(35);renderer.zoomCameraBy(1/1.4);
  for(let i=0;i<8;i++){renderer.setCameraOrientation(i);await capture(`nest-far-${i}`);results.push({name:`nest-far-${i}`,...renderer.getCameraAudit()});}
  renderer.zoomCameraBy(1.4);renderer.setCameraOrientation(3);snapshot.collectedPickups=scene.pickups!.filter(p=>p.id.startsWith('crow-')).map(p=>p.id);snapshot.revision++;
  await renderer.applySnapshot(structuredClone(snapshot));await capture('nest-looted');results.push({name:'nest-looted',...renderer.getCameraAudit()});
  snapshot.collectedPickups=[];($('night') as HTMLInputElement).checked=true;($('carried-light') as HTMLInputElement).checked=true;await focus('crow');renderer.zoomCameraBy(1.4);await capture('nest-night-lamp');results.push({name:'nest-night-lamp',...renderer.getCameraAudit()});
  ($('night') as HTMLInputElement).checked=false;await focus('crow');renderer.zoomCameraBy(1.4);renderer.setCameraOrientation(3);
  await fetch('/__wreck_report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'nest-only',results,errors})});
  $('status').textContent=`Nido revisado: ${results.length} vistas, ${errors.length} errores. No se han modificado partidas.`;
}catch(e){errors.push(String(e));$('status').textContent=String(e);}finally{setBusy(false);}};
$('audit').onclick=async()=>{if(busy)return;setBusy(true);try{
  $('status').textContent='Auditoría en curso…';setClimate('none',1,0);($('night') as HTMLInputElement).checked=false;($('carried-light') as HTMLInputElement).checked=true;await focus('main');await overview();const results=[];
  renderer.setTerrainAuditView(90);await capture('top');results.push({name:'top',...renderer.getCameraAudit()});
  renderer.setTerrainAuditView(45,true);await capture('structure');
  renderer.setTerrainAuditView(null);renderer.setCameraTiltDegrees(35);
  for(let i=0;i<8;i++){renderer.setCameraOrientation(i);await capture(`exterior-${i}`);results.push({name:`exterior-${i}`,...renderer.getCameraAudit()});}
  for(const surface of ['main','c2','c3','crow','c4','c5','c6','c7','lower-deck','hold-air','breach','bones','boat']){
    renderer.setCameraOrientation(0);await focus(surface);await capture(`detail-${surface}`);results.push({name:`detail-${surface}`,...renderer.getCameraAudit()});
    if(/^c[4-7]$/.test(surface))for(let i=1;i<8;i++){renderer.setCameraOrientation(i);await capture(`${surface}-angle-${i}`);results.push({name:`${surface}-angle-${i}`,...renderer.getCameraAudit()});}
    if(['crow','bones','breach','lower-deck','hold-air'].includes(surface)){
      if(surface==='crow')renderer.zoomCameraBy(2);
      if(surface==='bones')renderer.zoomCameraBy(2.5);
      if(surface==='breach'){renderer.zoomCameraBy(1.4);renderer.setCameraTiltDegrees(25);}
      for(let i=0;i<8;i++){renderer.setCameraOrientation(i);await capture(`${surface}-angle-${i}`);results.push({name:`${surface}-angle-${i}`,...renderer.getCameraAudit()});}
      renderer.setCameraTiltDegrees(35);
    }
  }
  ($('carried-light') as HTMLInputElement).checked=false;await focus('hold-air');await capture('c9-without-light');
  ($('night') as HTMLInputElement).checked=true;await focus('main');await capture('night-unlit');
  ($('carried-light') as HTMLInputElement).checked=true;await focus('main');await capture('night-carried-light');
  ($('night') as HTMLInputElement).checked=false;await focus('main');
  if(['4612','4613'].includes(location.port)){
    await focus('boat');renderer.zoomCameraBy(1.8);renderer.setWreckReflectionsEnabled(false);await capture('boat-reflections-off');renderer.setWreckReflectionsEnabled(true);await capture('boat-reflections-on');
    for(const kind of ['rain','snow'] as const){setClimate(kind,3,1);for(const zone of ['main','c2','c3','crow','c4','lower-deck','hold-air','boat']){
      renderer.setCameraOrientation(0);await focus(zone);await capture(`${kind}-${zone}`);results.push({name:`${kind}-${zone}`,...renderer.getCameraAudit()});
    }}
    setClimate('none',1,0);
    snapshot.climate.fogDensity=1;snapshot.environment!.fogTarget=1;await overview();await capture('dense-fog-overview');results.push({name:'dense-fog-overview',...renderer.getCameraAudit()});
    snapshot.climate.fogDensity=0;snapshot.environment!.fogTarget=0;
  }
  renderer.setTerrainAuditView(null);await overview();renderer.setCameraOrientation(0);
  const frameCosts=[];for(const zone of ['main','c4','lower-deck','hold-air']){await focus(zone);frameCosts.push({zone,...renderer.measureCaptureFrameCosts()});}
  await overview();
  await fetch('/__wreck_report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({at:new Date().toISOString(),errors,results,frameCosts})});
  $('status').textContent=`Auditoría guardada: ${results.length} vistas; errores: ${errors.length}.`;
}catch(e){errors.push(String(e));$('status').textContent=String(e);}finally{setBusy(false);}};
setBusy(true);
await renderer.ready;await renderer.applySnapshot(snapshot);renderer.setCameraTiltDegrees(25);
// Assets may finish asynchronously, but do not strand the whole inspector
// behind background-tab timer throttling. Readiness is recorded per capture.
for(let i=0;i<80;i++)renderer.renderCaptureFrame(32,true);
await overview();renderer.setCameraOrientation(0);$('status').textContent='Pecio reconstruido · visor aislado (no modifica partidas).';setBusy(false);
