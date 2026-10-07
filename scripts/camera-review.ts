import { WorldRenderer } from '../apps/web/world';
import { oneShotCampaignDefinition,d8NearestWalkableCell } from '../campaigns/one-shot/public/pack';
import { publicCampaignDefinition } from '../campaigns/stormwreck-isle/public/pack';
import { PROTOCOL_VERSION, OBJECT_MODEL_VERSION, type WorldSnapshot, type PublicEntity, type PublicProp, type CameraMode } from '../engine/shared/protocol';
import { footprintFor } from '../engine/shared/geometry';
const $=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const campaignKey=new URLSearchParams(location.search).get('campaign')==='storm'?'storm':'d8';
const campaign=structuredClone(campaignKey==='d8'?oneShotCampaignDefinition:publicCampaignDefinition);
const map=$<HTMLSelectElement>('map'),actor=$<HTMLSelectElement>('actor'),mode=$<HTMLSelectElement>('mode'),status=$('status');
$<HTMLSelectElement>('campaign').value=campaignKey;
$('campaign').addEventListener('change',()=>location.search=`?campaign=${$<HTMLSelectElement>('campaign').value}`);
for(const scene of campaign.scenes)if(scene.renderer==='babylon-hd2d'||scene.renderer==='babylon-d8')map.add(new Option(scene.title,scene.id));
let snapshot:WorldSnapshot,revision=0,loading=false,selected:string|null=null,movementGeneration=0;
const renderer=new WorldRenderer($('world'),campaign,{showGrid:false,persistCameraPreferences:false,showStairMarker:false});
const errors:string[]=[];window.addEventListener('error',e=>errors.push(e.message));window.addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
renderer.setMapClick((cell,id)=>{selected=id??null;renderer.setSelectedEntity(selected);renderer.setCameraFocusCell(cell);if(id)actor.value=id;});
function poseDistance(a:ReturnType<typeof renderer.getCameraAudit>['pose'],b:ReturnType<typeof renderer.getCameraAudit>['pose']){
  if(!a||!b)return Infinity;return Math.max(Math.abs(a.alpha-b.alpha),Math.abs(a.beta-b.beta),Math.abs(a.halfHeight-b.halfHeight),...(['x','y','z'] as const).map(k=>Math.abs(a.target[k]-b.target[k])));
}
const frame=()=>new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
async function settle(){let stable=0,previous=renderer.getCameraAudit().pose;const deadline=performance.now()+90000;
  while(stable<12){await frame();const current=renderer.getCameraAudit();stable=current.ready&&poseDistance(previous,current.pose)<1e-6?stable+1:0;previous=current.pose;if(performance.now()>deadline)throw new Error('La cámara no se estabilizó');}
}
async function update(){snapshot.revision=++revision;snapshot.serverTime=Date.now();await renderer.applySnapshot(snapshot);}
async function capture(name:string){
  const host=$('world'),canvas=document.createElement('canvas');canvas.width=host.clientWidth;canvas.height=host.clientHeight;
  const context=canvas.getContext('2d')!;context.fillStyle='#172635';context.fillRect(0,0,canvas.width,canvas.height);
  renderer.renderCaptureFrame();
  for(const layer of host.querySelectorAll('canvas'))if(!layer.hidden)context.drawImage(layer,0,0,canvas.width,canvas.height);
  const blob=await new Promise<Blob>(resolve=>canvas.toBlob(blob=>resolve(blob!),'image/png'));
  await fetch(`/__camera_capture?name=${name}`,{method:'POST',body:blob});
}
async function load(){loading=true;movementGeneration++;status.textContent='Cargando mapa…';
  document.querySelectorAll<HTMLButtonElement|HTMLSelectElement>('header button,header select').forEach(control=>{control.disabled=true;});
  // Let the selection event finish before building thousands of Babylon meshes.
  // Otherwise a browser automation deadline can interrupt the synchronous build.
  await frame();
  const scene=campaign.scenes.find(s=>s.id===map.value)!;
  const entities:PublicEntity[]=campaign.roster.map((a,i)=>({...a,kind:'player',cell:scene.spawns[i%scene.spawns.length]!,surfaceId:scene.surfaceId,facing:'south',moving:false,step:null,sceneId:scene.id,hp:10,maxHp:10}));
  entities.push(...(scene.stageActors??[]).map(a=>({...a,kind:'npc' as const,color:'#b5ae91',surfaceId:a.surfaceId??scene.surfaceId,facing:'south' as const,moving:false,step:null,sceneId:scene.id})));
  const props=scene.props.map(p=>({...p,surfaceId:p.surfaceId??scene.surfaceId,footprint:p.baseFootprint,structure:'intact',state:p.kind==='door'?p.initialState:'upright',attachment:'attached',
    ...(p.kind==='wheel'?{mount:p.mount}:{})})) as PublicProp[];
  snapshot={v:PROTOCOL_VERSION,objectModelVersion:OBJECT_MODEL_VERSION,revision:++revision,serverTime:Date.now(),sceneId:scene.id,scene,sceneEpoch:revision,runtimeEpoch:'isolated-camera-review',entities,tokenAssets:{tokens:campaign.tokens,tokenAnimations:campaign.tokenAnimations},props,camera:{mode:mode.value as CameraMode,focusId:entities[0]!.id},environment:{storm:false,lightning:false,stormIntensity:0,timeOfDay:$<HTMLSelectElement>('weather-time').value as 'day',precipitation:$<HTMLSelectElement>('weather-kind').value as 'none',precipitationLevel:Number($<HTMLSelectElement>('weather-level').value) as 1,windIntensity:Number($<HTMLInputElement>('weather-wind').value)},combat:{active:false,round:0,currentId:null,movement:null,participants:[],lastEvent:null}};
  actor.replaceChildren(...entities.map(a=>new Option(a.label,a.id)));selected=null;renderer.setSelectedEntity(null);renderer.setLocalPlayer(null);renderer.setCameraFocusCell(null);
  await renderer.applySnapshot(snapshot);renderer.setCameraTiltDegrees(Number($<HTMLSelectElement>('tilt').value));await settle();loading=false;updatePoseList();
  document.querySelectorAll<HTMLButtonElement|HTMLSelectElement>('header button,header select').forEach(control=>{control.disabled=false;});
}
map.addEventListener('change',()=>void load().catch(fail));
const fail=(error:unknown)=>{errors.push(String(error));loading=false;status.textContent=String(error);document.querySelectorAll<HTMLButtonElement|HTMLSelectElement>('header button,header select').forEach(control=>{control.disabled=false;});};
for(const [id,delta] of [['left',-1],['right',1]] as const)$(id).addEventListener('click',()=>renderer.rotateCameraOrientation(delta));
$('reset').addEventListener('click',()=>{const tilt=campaignKey==='d8'?25:45;renderer.resetCameraOrientation();renderer.setCameraTiltDegrees(tilt);$<HTMLSelectElement>('tilt').value=String(tilt);});
$('tilt').addEventListener('change',()=>renderer.setCameraTiltDegrees(Number($<HTMLSelectElement>('tilt').value)));
$('zoom-in').addEventListener('click',()=>renderer.zoomCameraBy(1.5));$('zoom-out').addEventListener('click',()=>renderer.zoomCameraBy(1/1.5));
$('grid').addEventListener('change',()=>renderer.setGridVisible($<HTMLInputElement>('grid').checked));
$('focus').addEventListener('click',()=>{selected=actor.value;renderer.setSelectedEntity(selected);const a=snapshot.entities.find(a=>a.id===selected)!;renderer.setCameraFocusCell(a.cell,a.surfaceId);});
function updatePoseList(){const a=snapshot.entities.find(a=>a.id===actor.value)!;$<HTMLSelectElement>('test-pose').replaceChildren(...Object.keys(campaign.tokenAnimations[a.tokenId]??{}).map(name=>new Option(name,name)));}
actor.addEventListener('change',()=>{$('focus').click();updatePoseList();});
$('test-position').addEventListener('change',async()=>{
  const a=snapshot.entities.find(a=>a.id===actor.value)!,scene=snapshot.scene,value=$<HTMLSelectElement>('test-position').value;
  const seat=scene.seats?.find(s=>!s.reservedActorId&&(value!=='chair'||s.label==='Silla'));delete a.seatId;
  const road=scene.id==='temple'?{west:[-4,40.5],east:[4,40.5]}:scene.id==='cafe'?{west:[-12,19.5],east:[12,19.5]}:{west:[-10,17.5],east:[10,17.5]};
  const inside:Record<string,[number,number]>={garden:[6,-1.5],dinner:[-3.36,-4.5],temple:[0,-2],cafe:[0,1]};
  if((value==='seat'||value==='chair')&&seat)a.cell={...seat.cell};else if(value==='inside'){const p=inside[scene.id]??[0,1];a.cell=d8NearestWalkableCell(scene.id as any,...p);}else if(value.endsWith('road')){const p=value==='west-road'?road.west:road.east;a.cell=d8NearestWalkableCell(scene.id as any,p[0]!,p[1]!);}else a.cell={...scene.spawns[0]!};
  a.step=null;a.moving=false;renderer.setLocalPlayer(a.id);await update();$('focus').click();
});
$('test-seat').addEventListener('click',async()=>{const a=snapshot.entities.find(a=>a.id===actor.value)!,seat=snapshot.scene.seats?.filter(s=>!s.reservedActorId).sort((x,y)=>Math.abs(x.cell.col-a.cell.col)+Math.abs(x.cell.row-a.cell.row)-Math.abs(y.cell.col-a.cell.col)-Math.abs(y.cell.row-a.cell.row))[0];if(!seat)return;if(a.seatId)delete a.seatId;else{a.seatId=seat.id;a.cell={...seat.cell};}await update();$('focus').click();});
$('test-animation').addEventListener('click',()=>renderer.playTokenAnimation(actor.value,$<HTMLSelectElement>('test-pose').value,12000));
$('test-door').addEventListener('click',async()=>{for(const p of snapshot.props)if(p.kind==='door')p.state=p.state==='closed'?'open':'closed';await update();});
$('test-mirror').addEventListener('click',async()=>{const mirror=snapshot.props.find(p=>p.id==='true-love-mirror'),source=snapshot.entities.find(a=>a.id===actor.value);if(!mirror||!source)return;renderer.setLocalPlayer(null);renderer.setCameraFocusCell(mirror.cell,mirror.surfaceId);renderer.zoomCameraBy(3/renderer.getCameraAudit().zoom);await settle();const id='reflection';snapshot.entities=snapshot.entities.filter(a=>a.id!==id);snapshot.entities.push({...source,id,label:'Reflejo de prueba',kind:'npc',cell:{...mirror.cell},step:null,moving:false});mirror.structure='destroyed';await update();renderer.playMirrorTransformation(mirror.id,source.id,id,[]);const start=performance.now();for(const moment of [.25,.8,1.8]){while(performance.now()-start<moment*1000)await frame();await capture(`d8-mirror-reveal-${Math.round(moment*100)}.png`);}});
mode.addEventListener('change',()=>{snapshot.camera.mode=mode.value as CameraMode;snapshot.camera.focusId=actor.value;void update();});
$('night').addEventListener('change',()=>{snapshot.environment.timeOfDay=$<HTMLInputElement>('night').checked?'night':'day';void update();});
for(const id of ['weather-time','weather-kind','weather-level','weather-wind'])$(id).addEventListener('change',()=>{
  snapshot.environment={...snapshot.environment,timeOfDay:$<HTMLSelectElement>('weather-time').value as 'day',precipitation:$<HTMLSelectElement>('weather-kind').value as 'none',precipitationLevel:Number($<HTMLSelectElement>('weather-level').value) as 1,windIntensity:Number($<HTMLInputElement>('weather-wind').value)};void update();
});
$('condition').addEventListener('change',()=>{const a=snapshot.entities.find(a=>a.id===actor.value)!;a.conditions=$<HTMLSelectElement>('condition').value?[$<HTMLSelectElement>('condition').value as 'derribada']:[];void update();});
$('move').addEventListener('click',async()=>{const generation=++movementGeneration,a=snapshot.entities.find(a=>a.id===actor.value)!,origin={...a.cell};
  const destination=snapshot.scene.walkable.find(c=>Math.abs(c.col-origin.col)+Math.abs(c.row-origin.row)===1);if(!destination)return;
  let start=Date.now();
  for(let n=0;n<18&&generation===movementGeneration;n++){const from={...a.cell},to=n%2?origin:destination;a.cell=to;a.facing=to.col>from.col?'east':to.col<from.col?'west':to.row>from.row?'south':'north';a.moving=true;a.step={from,to,startedAt:start,durationMs:220};await update();start+=220;while(Date.now()<start)await frame();}
  if(generation===movementGeneration){a.moving=false;a.step=null;await update();}
});
$('test-combat').addEventListener('click',async()=>{
  snapshot.combat.active=!snapshot.combat.active;
  snapshot.combat.round=snapshot.combat.active?1:0;
  snapshot.combat.currentId=snapshot.combat.active?actor.value:null;
  snapshot.combat.participants=snapshot.combat.active?snapshot.entities.map(entity=>({id:entity.id,label:entity.label,kind:entity.kind,controller:entity.kind==='player'?'player':'dm',initiative:0,initiativeSubmitted:true,active:true,hp:entity.hp??71,maxHp:entity.maxHp??71,armorClass:16,speedMeters:9,attacks:[],conditions:[]})):[];
  renderer.setLocalPlayer(actor.value); await update(); await settle();
  await capture(`${campaignKey}-${map.value}-combat-frame.png`);
});
async function audit(all:boolean){const rows:unknown[]=[];const savedMap=map.value;const maps=all?Array.from(map.options).map(o=>o.value):[savedMap];
  renderer.zoomCameraBy(1/renderer.getCameraAudit().zoom);
  for(const id of maps){map.value=id;await load();const positions=JSON.stringify(snapshot.entities.map(a=>[a.id,a.cell,a.surfaceId]));
    for(const tilt of [25,35,45,50]){renderer.setCameraTiltDegrees(tilt);for(let step=0;step<8;step++){renderer.setCameraOrientation(step);await settle();const first=renderer.getCameraAudit();let jitter=0;
      for(let n=0;n<30;n++){await frame();jitter=Math.max(jitter,poseDistance(first.pose,renderer.getCameraAudit().pose));}
      rows.push({...first,jitter,positionsUnchanged:positions===JSON.stringify(snapshot.entities.map(a=>[a.id,a.cell,a.surfaceId]))});
      if(tilt===25||tilt===45)await capture(`${campaignKey}-${id}-tilt-${tilt}-angle-${step}.png`);
      $('report').textContent=`Revisando ${id}, inclinación ${tilt}°, orientación ${step+1}/8 · ${rows.length} vistas`;
    }}
  }
  const report={campaign:campaignKey,views:rows.length,errors,rows};$('report').textContent=JSON.stringify(report,null,2);await fetch('/__camera_report',{method:'POST',body:JSON.stringify(report)});
  map.value=savedMap;await load();renderer.resetCameraOrientation();renderer.setCameraTiltDegrees(Number($<HTMLSelectElement>('tilt').value));
}
$('audit').addEventListener('click',()=>void audit(false).catch(fail));$('all').addEventListener('click',()=>void audit(true).catch(fail));
$('capture').addEventListener('click',()=>void capture(`${campaignKey}-${map.value}-weather-${$<HTMLSelectElement>('weather-time').value}-${$<HTMLSelectElement>('weather-kind').value}-${$<HTMLSelectElement>('weather-level').value}.png`).catch(fail));
async function auditFocusModes(){
  await load(); const entity=snapshot.entities[0]!, origin={...entity.cell}, rows:unknown[]=[];
  const other=snapshot.scene.walkable.find(c=>Math.abs(c.col-origin.col)+Math.abs(c.row-origin.row)===1);
  if(!other)throw new Error('No hay casilla vecina para comprobar el seguimiento');
  renderer.setSelectedEntity(null);renderer.setLocalPlayer(null);renderer.setCameraFocusCell(null);
  renderer.zoomCameraBy(.4/renderer.getCameraAudit().zoom);
  for(const cameraMode of ['fixed','semiFixed','follow'] as const){
    snapshot.camera={mode:cameraMode,focusId:entity.id}; entity.cell={...origin}; await update();await settle();
    const before=renderer.getCameraAudit();entity.cell={...other};await update();await settle();const after=renderer.getCameraAudit();
    const oldActor=before.actors.find(a=>a.id===entity.id)!.world,newActor=after.actors.find(a=>a.id===entity.id)!.world;
    const delta={x:newActor.x-oldActor.x,z:newActor.z-oldActor.z},targetDelta={x:after.pose!.target.x-before.pose!.target.x,z:after.pose!.target.z-before.pose!.target.z};
    const correct=cameraMode==='fixed'?Math.hypot(targetDelta.x,targetDelta.z)<1e-6:cameraMode==='follow'
      ?Math.hypot(targetDelta.x-delta.x,targetDelta.z-delta.z)<1e-6
      :Math.abs(targetDelta.x)<=Math.abs(delta.x)+1e-6&&Math.abs(targetDelta.z)<=Math.abs(delta.z)+1e-6;
    rows.push({mode:cameraMode,correct,delta,targetDelta});
    for(const candidate of snapshot.entities.filter(a=>a.kind==='player')){
      renderer.setSelectedEntity(candidate.id);renderer.setCameraFocusCell(candidate.cell,candidate.surfaceId);await settle();
      const current=renderer.getCameraAudit(),ground=current.actors.find(a=>a.id===candidate.id)!.world;
      rows.push({mode:cameraMode,selection:candidate.id,correct:Math.hypot(current.pose!.target.x-ground.x,current.pose!.target.z-ground.z)<1e-6});
    }
    renderer.setSelectedEntity(null);renderer.setCameraFocusCell(null);
  }
  renderer.setSelectedEntity(entity.id);renderer.setCameraFocusCell(entity.cell,entity.surfaceId);renderer.zoomCameraBy(1000);await settle();
  const close=renderer.getCameraAudit(); rows.push({zoom:close.zoom,correct:close.zoom===24&&close.pose!.halfHeight>=.75});
  entity.cell=origin;renderer.setCameraFocusCell(origin,entity.surfaceId);await update();await settle();
  renderer.setSelectedEntity(null);renderer.setCameraFocusCell(null);
  for(const candidate of snapshot.entities.filter(a=>a.kind==='player'))for(const cameraMode of ['fixed','semiFixed','follow'] as const){
    renderer.setLocalPlayer(candidate.id);snapshot.camera={mode:cameraMode,focusId:null};await update();await settle();
    const current=renderer.getCameraAudit(),ground=current.actors.find(a=>a.id===candidate.id)!.world;
    rows.push({mode:cameraMode,playerZoom:candidate.id,zoom:current.zoom,correct:Math.hypot(current.pose!.target.x-ground.x,current.pose!.target.z-ground.z)<1e-6});
  }
  renderer.setLocalPlayer(null);
  const report={kind:'focus',campaign:campaignKey,scene:map.value,errors,rows};$('report').textContent=JSON.stringify(report,null,2);
  await fetch('/__camera_report',{method:'POST',body:JSON.stringify(report)});
}
$('focus-audit').addEventListener('click',()=>void auditFocusModes().catch(fail));
let lastStatusAt=0;
function show(){
  requestAnimationFrame(show);if(performance.now()-lastStatusAt<250)return;lastStatusAt=performance.now();
  const a=renderer.getCameraAudit();
  status.textContent=`${loading?'Cargando · ':''}${a.scene} · ${a.nativeActors} fichas 3D · ${a.tilt}° · giro ${a.orientation+1}/8 · zoom ${a.zoom.toFixed(2)} · ${a.ready?'Listo':'Cargando texturas'} · selección ${selected??'ninguna'}\nHORIZONTE: ${JSON.stringify(a.horizon)}\n${JSON.stringify(a.pose)}\nRENDIMIENTO: ${JSON.stringify(a.performance)}\nMALLAS: ${JSON.stringify(a.meshGroups)}\nAMBIENTE: ${JSON.stringify(a.presentation)}\nFICHAS: ${JSON.stringify(a.actors)}\nARQUITECTURA: ${JSON.stringify(a.architecture)}\nPendientes: ${a.pendingTextures.join(', ')} / ${a.pendingMeshes.join(', ')}${errors.length?'\nERRORES: '+errors.join(' | '):''}`;
}show();
await load().catch(fail);
updatePoseList();
