import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createServer} from 'node:net';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {io} from 'socket.io-client';

// Real server, two player connections and projector. This never touches the
// table's running server or its save directory. Only public snapshots are
// recorded for the optional browser navigation replay.
const root=process.cwd(),build=path.resolve('dist/server'),output=path.resolve(process.env.WRECK_EVIDENCE_DIR??'output/pecio-detail-20261010');
const climbSmoke=process.env.WRECK_CLIMB_SMOKE==='1';
const nestSmoke=process.env.WRECK_NEST_SMOKE==='1';
const load=p=>import(pathToFileURL(path.join(build,p)).href);
const {PROTOCOL_VERSION,OBJECT_MODEL_VERSION}=await load('engine/shared/protocol.js');
const {surfaceNeighbors,terrainTile}=await load('engine/shared/terrain.js');
const {footprintFor}=await load('engine/server/navigation.js');
const {wreckRuntimeScenes,wreckPorts}=await load('campaigns/stormwreck-isle/public/wreck-runtime.js');
const scene=wreckRuntimeScenes[0],terrain=scene.terrain;
const probe=createServer();probe.listen(0,'127.0.0.1');await once(probe,'listening');const port=probe.address().port;await new Promise(r=>probe.close(r));
const base='http://127.0.0.1:'+port,data=await mkdtemp(path.join(tmpdir(),'dungeons-wreck-test-'));
const sockets=[],report=[],replay=[],delay=ms=>new Promise(r=>setTimeout(r,ms));let child,session,seq=1,dm,recording=false,lastPose='',serverLogs='';
const wait=(s,event,p=()=>true,timeout=15000)=>new Promise((resolve,reject)=>{
 const handler=v=>{if(!p(v))return;clearTimeout(timer);s.off(event,handler);resolve(v);};
 const timer=setTimeout(()=>{s.off(event,handler);reject(Error('Timeout '+event));},timeout);s.on(event,handler);
});
async function launch(){
 console.log('Iniciando servidor de prueba aislado.');
 child=spawn(process.execPath,[path.join(build,'apps/server/index.js')],{cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe','ipc'],env:{...process.env,HOST:'127.0.0.1',PORT:String(port),DM_PASSWORD:'',DUNGEONS_DATA_DIR:data,DUNGEONS_WEB_DIR:path.resolve('dist/web'),DUNGEONS_TEST_CHILD:'1',DUNGEONS_CAMPAIGN:'stormwreck-isle'}});
 let logs='';child.stdout.on('data',d=>{logs+=d;serverLogs+=d;});child.stderr.on('data',d=>{logs+=d;serverLogs+=d;});
 for(let i=0;i<100;i++){if(child.exitCode!==null)throw Error(logs);try{if((await fetch(base+'/api/info',{signal:AbortSignal.timeout(5000)})).ok){console.log('Servidor de prueba listo.');return;}}catch{}await delay(100);}throw Error(logs);
}
async function stop(){if(!child)return;const process=child,done=once(process,'exit');process.send('shutdown');
 const timer=setTimeout(()=>process.kill(),25000);try{await done;}finally{clearTimeout(timer);child=undefined;}}
async function login(){const r=await fetch(base+'/api/dm/login',{method:'POST',headers:{origin:base,'content-type':'application/json'},body:'{}',signal:AbortSignal.timeout(5000)});assert.equal(r.status,200);session={cookie:r.headers.get('set-cookie').split(';')[0],...(await r.json())};console.log('DM de prueba autenticado.');}
async function connect(role,id='mike'){
 const s=io(base,{autoConnect:false,transports:['websocket'],forceNew:true,auth:{role,protocolVersion:PROTOCOL_VERSION,objectModelVersion:OBJECT_MODEL_VERSION,...(role==='player'?{sessionToken:(id==='mike'?'a':'b').repeat(32)}:{})},...(role==='dm'?{extraHeaders:{cookie:session.cookie}}:{})});s.actor=id;sockets.push(s);
 s.on('world:snapshot',v=>{s.latest=v;const epoch=v.runtimeEpoch+':'+v.sceneEpoch;
  if(s.readyEpoch!==epoch){s.readyEpoch=epoch;s.emit('scene:ready',{runtimeEpoch:v.runtimeEpoch,sceneEpoch:v.sceneEpoch});if(role==='projector')s.emit('projector:ready',{runtimeEpoch:v.runtimeEpoch,ready:true});}
  if(recording&&role==='dm'&&v.sceneId==='wreck-ship'){
   const e=v.entities.find(e=>e.id==='mike'),pose=JSON.stringify([e.cell,e.surfaceId,e.step?.startedAt,v.props.filter(p=>p.kind==='door').map(p=>p.state)]);
   if(pose!==lastPose){lastPose=pose;replay.push(structuredClone(v));}
  }
 });s.on('player:private',v=>s.latestPrivate=v);const first=wait(s,'world:snapshot');s.connect();await first;console.log('Vista conectada:',role,id);return s;
}
async function ack(s,event,fields){const commandId=event==='player:claim'?undefined:crypto.randomUUID();const done=wait(s,'command:result',r=>r.commandId===commandId||!r.commandId&&r.ok===false);
 s.emit(event,{runtimeEpoch:s.latest.runtimeEpoch,...(commandId?{commandId}:{}),...fields});const r=await done;assert.equal(r.ok,true,JSON.stringify(r));return r;
}
const command=fields=>ack(dm,'dm:command',{sceneEpoch:dm.latest.sceneEpoch,...fields});
const actor=s=>s.latest.entities.find(e=>e.id===s.actor);
const key=a=>a.surfaceId+':'+a.cell.col+','+a.cell.row;
const same=(a,b)=>key(a)===key(b);
function route(s,to,near=false){
 const from=actor(s),blocked=new Set();
 for(const p of dm.latest.props){const blocks=p.structure!=='destroyed'&&(p.kind==='door'?p.state!=='open':p.kind==='wheel'?p.attachment==='detached':true);
  if(blocks)for(const cell of footprintFor(p))blocked.add(key({surfaceId:p.surfaceId,cell}));}
 // C9 canonically calls the harpy back to C1. Its occupied cell must be
 // avoided just like another player, rather than blaming movement for a
 // test route that walks straight into the returned encounter.
 for(const e of dm.latest.entities)if(e.id!==s.actor&&e.id!=='wreck-rowboat')blocked.add(key(e));
 const queue=[[{surfaceId:from.surfaceId,cell:from.cell}]],seen=new Set([key(from)]);
 for(let index=0;index<queue.length;index++){
  const path=queue[index],at=path.at(-1);
  if(near?at.surfaceId===to.surfaceId&&Math.max(Math.abs(at.cell.col-to.cell.col),Math.abs(at.cell.row-to.cell.row))<=1:same(at,to))return path.slice(1);
  for(const b of surfaceNeighbors(terrain,at)){const k=key(b);if(!seen.has(k)&&!blocked.has(k)){seen.add(k);queue.push([...path,b]);}}
 }throw Error('No route '+key(from)+' -> '+key(to)+' '+JSON.stringify({blocked:blocked.has(key(to)),seen:seen.size,doors:dm.latest.props.filter(p=>p.kind==='door').map(p=>[p.id,p.state]),neighbors:surfaceNeighbors(terrain,from)}));
}
let steps=0;
async function step(s,to){const from=actor(s),done=wait(s,'world:snapshot',v=>{const e=v.entities.find(e=>e.id===s.actor);return e&&same(e,to)&&!e.step;});
 s.emit('input:move',{runtimeEpoch:s.latest.runtimeEpoch,sceneEpoch:s.latest.sceneEpoch,seq:seq++,x:Math.sign(to.cell.col-from.cell.col),z:Math.sign(to.cell.row-from.cell.row)});
 s.emit('input:move',{runtimeEpoch:s.latest.runtimeEpoch,sceneEpoch:s.latest.sceneEpoch,seq:seq++,x:0,z:0,end:true});try{await done;}catch(e){throw Error(`Paso ${steps}: ${key(from)} → ${key(to)}; último ${key(actor(s))}; ${e}`);}steps++;
}
async function walk(s,to,near=false){for(const destination of route(s,to,near))await step(s,destination);}
const shipPort=id=>wreckPorts.find(p=>p.id===id);
const c2Link=terrain.transitions.find(t=>t.to.surfaceId==='c2'),c3Link=terrain.transitions.find(t=>t.to.surfaceId==='c3'),c8Link=terrain.transitions.find(t=>t.to.surfaceId==='lower-deck');
const address=p=>({surfaceId:p.surfaceId,cell:p.cell});
async function save(){const body={runtimeEpoch:dm.latest.runtimeEpoch,requestId:crypto.randomUUID()};const r=await fetch(base+'/api/dm/save',{method:'POST',headers:{origin:base,cookie:session.cookie,'content-type':'application/json','x-dungeons-csrf':session.csrfToken,'x-dungeons-runtime-epoch':body.runtimeEpoch},body:JSON.stringify(body)});assert.equal(r.status,200,await r.clone().text());}
try{
 await launch();await login();dm=await connect('dm');let projector=await connect('projector'),p=await connect('player'),other=await connect('player','mia');
 await ack(p,'player:claim',{characterId:'mike'});await ack(other,'player:claim',{characterId:'mia'});
 const shipViews=[p,other,dm,projector].map(s=>wait(s,'world:snapshot',v=>v.sceneId===scene.id&&v.entities.some(e=>e.id===s.actor&&e.sceneId===scene.id)));
 await command({type:'scene',sceneId:'wreck-ship'});await Promise.all(shipViews);
 const stationary=address(actor(other));recording=true;
 if(!climbSmoke){
 const checkpoints=[['C2',c2Link.to],['C3',c3Link.to],['C1', {surfaceId:'main',cell:scene.spawns[0]}]];
 for(const [name,to] of checkpoints){await walk(p,address(to));assert.equal(actor(p).sceneId,scene.id);assert.ok(same(actor(other),stationary));report.push({zone:name,steps});console.log('Recorrido real',name,steps);}
 for(const id of ['c4-barred-door','c5-door','c6-door','c7-door']){
  const door=dm.latest.props.find(p=>p.id===id);await walk(p,address(door),true);
  if(id==='c4-barred-door')assert.equal((await ack(p,'player:interact',{sceneEpoch:p.latest.sceneEpoch,targetId:id})).code,'DOOR_BAR_REMOVED');
  const visibleOpen=wait(dm,'world:snapshot',v=>v.props.find(p=>p.id===id)?.state==='open');
  assert.equal((await ack(p,'player:interact',{sceneEpoch:p.latest.sceneEpoch,targetId:id})).code,'DOOR_OPENED');
  await visibleOpen;await walk(p,{surfaceId:'main',cell:{col:door.cell.col+(id.startsWith('c4')||id.startsWith('c5')?-1:1),row:door.cell.row}});
  report.push({zone:id.slice(0,2).toUpperCase(),playerOpened:true,steps});
 }
 await walk(p,address(c8Link.to));assert.equal(actor(p).surfaceId,'lower-deck');assert.ok(same(actor(other),stationary));
 assert.ok(!p.latest.entities.some(e=>e.id==='mia'));assert.ok(other.latest.entities.some(e=>e.id==='mia'));
 report.push({zone:'C8',steps,individualVisibility:true});console.log('Recorrido real C8',steps);
 const projectorFollows=wait(projector,'world:snapshot',v=>v.camera.focusId==='mike');
 await command({type:'camera',mode:'follow',focusId:'mike'});await projectorFollows;assert.equal(projector.latest.camera.focusId,'mike');assert.ok(same(actor(other),stationary));
 await walk(p,address(shipPort('P14').to));assert.equal(actor(p).surfaceId,'hold-air');report.push({zone:'C9',steps});console.log('Recorrido real C9',steps);
 // Reach the stern through the hold, surface through P16, swim away, then
 // dive back through the same opening with ordinary directional input.
 const breach=shipPort('P16');await walk(p,address(breach.to));await step(p,address(breach.from));
 assert.equal(actor(p).waterMovement,'swim');await step(p,{surfaceId:'sea',cell:{col:breach.from.cell.col-1,row:breach.from.cell.row}});
 await step(p,address(breach.to));assert.equal(actor(p).waterMovement,'dive');
 assert.ok(replay.some(v=>v.entities.find(e=>e.id==='mike')?.step?.movementKind==='dive'));
 report.push({zone:'P16',swimming:true,animatedDive:true,steps});console.log('Natación e inmersión por la brecha',steps);
 await walk(p,address(c8Link.from));
 console.log('Regreso a C1 para subir a la cofa',steps);
 }
 // Ordinary movement reaches the ladder, but cannot bypass the optional DM
 // check. Request, failure and success use the real player/DM connections.
 await walk(p,address(shipPort('P10').from));assert.equal(actor(p).surfaceId,'main');
 const hasAction=v=>v?.availableInteractions?.some(a=>a.targetId==='P10'&&a.surfaceId==='main'&&same({surfaceId:a.surfaceId,cell:a.cell},shipPort('P10').from));
 if(!hasAction(p.latestPrivate))await wait(p,'player:private',hasAction);
 console.log('En la base de la cofa; acción contextual disponible',steps);await ack(p,'player:interact',{sceneEpoch:p.latest.sceneEpoch,targetId:'P10'});
 const failedId=crypto.randomUUID(),failed=wait(dm,'command:result',r=>r.commandId===failedId);
 dm.emit('dm:command',{runtimeEpoch:dm.latest.runtimeEpoch,sceneEpoch:dm.latest.sceneEpoch,commandId:failedId,type:'entity:portal',entityId:'mike',portId:'P10',direction:'forward',checkTotal:9});
 assert.equal((await failed).code,'COFA_CHECK_FAILED');assert.equal(actor(p).surfaceId,'main');
 const arrived=wait(p,'world:snapshot',v=>{const e=v.entities.find(e=>e.id==='mike');return e?.surfaceId==='crow'&&!e.step;},22000);
 await command({type:'entity:portal',entityId:'mike',portId:'P10',direction:'forward',checkTotal:10});console.log('CD 10 autorizada; comprobar subida gradual');await arrived;
 report.push({zone:'Cofa',check:{ability:'Atletismo',dc:10,failedTotal:9,successTotal:10},animatedClimb:replay.some(v=>v.entities.find(e=>e.id==='mike')?.step?.movementKind==='climb'),steps});
 assert.ok(report.at(-1).animatedClimb);assert.ok(same(actor(other),stationary));
 if(nestSmoke){
  const crow=terrain.surfaces.find(s=>s.id==='crow');
  for(const tile of crow.tiles){await walk(p,{surfaceId:'crow',cell:tile.cell});assert.ok(same(actor(other),stationary));}
  const loot=scene.pickups.filter(p=>p.id.startsWith('crow-'));
  for(const item of loot){await walk(p,{surfaceId:'crow',cell:item.cell});const taken=wait(p,'world:snapshot',v=>v.collectedPickups?.includes(item.id));
   assert.equal((await ack(p,'player:interact',{sceneEpoch:p.latest.sceneEpoch,targetId:item.id})).code,'PICKUP_TAKEN');await taken;}
  await walk(p,address(shipPort('P10').to));
  report.push({zone:'Nido',walkingCells:crow.tiles.length,treasures:loot.map(p=>p.id),steps});
  console.log('Nido recorrido: todas las casillas y las cinco piezas recogidas.');
 }
 if(climbSmoke){
  const descended=wait(p,'world:snapshot',v=>{const e=v.entities.find(e=>e.id==='mike');return e?.surfaceId==='main'&&!e.step;},22000);
  if(nestSmoke)assert.equal((await ack(p,'player:interact',{sceneEpoch:p.latest.sceneEpoch,targetId:'P10'})).code,'MOVED');
  else await command({type:'entity:portal',entityId:'mike',portId:'P10',direction:'return'});await descended;
  report.push({zone:'Descenso',withoutCheck:true,animated:true});
 }
 const before=address(actor(p));await save();recording=false;sockets.forEach(s=>s.disconnect());await stop();await launch();await login();dm=await connect('dm');p=await connect('player');other=await connect('player','mia');
 const restoredMike=wait(p,'world:snapshot',v=>v.entities.some(e=>e.id==='mike'&&same(e,before)));
 const restoredMia=wait(other,'world:snapshot',v=>v.entities.some(e=>e.id==='mia'&&same(e,stationary)));
 await ack(p,'player:claim',{characterId:'mike'});await ack(other,'player:claim',{characterId:'mia'});await Promise.all([restoredMike,restoredMia]);
 assert.ok(same(actor(p),before));assert.ok(same(actor(other),stationary));
 if(nestSmoke)assert.equal(dm.latest.collectedPickups.filter(id=>id.startsWith('crow-')).length,5);
 if(!climbSmoke)assert.ok(dm.latest.props.filter(p=>p.kind==='door').every(p=>p.state==='open'));
 await mkdir(output,{recursive:true});await writeFile(path.join(output,climbSmoke?'climb-smoke.json':'playability.json'),JSON.stringify({at:new Date().toISOString(),players:2,projector:true,scene:scene.id,steps,checkpoints:report,persistence:true,independentPositions:true,contextualClimbAction:true},null,2));
 await writeFile(path.join(output,climbSmoke?'climb-smoke-replay.json':'navigation-replay.json'),JSON.stringify({base:replay[0],frames:replay.map(({scene,...frame})=>frame)}));console.log(climbSmoke?'PASS: acción contextual de cofa, CD 10, descenso sin CD y guardado.':'PASS: dos jugadores, proyector, C1–C9, cofa, puertas y guardado.');
}catch(error){
 const status=await fetch(base+'/api/dm/save/status',{headers:{cookie:session?.cookie??''},signal:AbortSignal.timeout(5000)}).then(r=>r.json()).catch(e=>String(e));
 await mkdir(output,{recursive:true});await writeFile(path.join(output,'navigation-failure.json'),JSON.stringify({at:new Date().toISOString(),error:String(error),steps,status,entities:dm?.latest?.entities,serverLogs:serverLogs.slice(-18000)},null,2));throw error;
}finally{sockets.forEach(s=>s.disconnect());await stop();const target=path.resolve(data);if(target.startsWith(path.resolve(tmpdir())+path.sep))await rm(target,{recursive:true,force:true});}
