import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createServer} from 'node:net';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {io} from 'socket.io-client';

const root=process.cwd(),build=path.resolve(root,process.env.CAMPS_AUDIT_SERVER_BUILD??'dist/actors-camp-audit-server');
const auditOutput=path.resolve(process.env.CAMPS_AUDIT_OUTPUT??'output/actors-camp-audit-20261007');
const {PROTOCOL_VERSION,OBJECT_MODEL_VERSION}=await import(pathToFileURL(path.join(build,'engine/shared/protocol.js')).href);
const {surfaceNeighbors}=await import(pathToFileURL(path.join(build,'engine/shared/terrain.js')).href);
const {activitiesForCampPoint}=await import(pathToFileURL(path.join(build,'engine/shared/camp-activities.js')).href);
const probe=createServer();probe.listen(0,'127.0.0.1');await once(probe,'listening');const port=probe.address().port;await new Promise(r=>probe.close(r));
const base='http://127.0.0.1:'+port,data=await mkdtemp(path.join(tmpdir(),'dungeons-actors-camp-test-'));
const sockets=[],report=[],delay=ms=>new Promise(r=>setTimeout(r,ms));let child,session,sequence=1;
const wait=(socket,event,predicate=()=>true)=>new Promise((resolve,reject)=>{const handler=value=>{if(!predicate(value))return;clearTimeout(timer);socket.off(event,handler);resolve(value);};const timer=setTimeout(()=>{socket.off(event,handler);reject(Error('Timeout '+event));},10000);socket.on(event,handler);});
async function launch(){
 child=spawn(process.execPath,[path.join(build,'apps/server/index.js')],{cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe','ipc'],env:{...process.env,HOST:'127.0.0.1',PORT:String(port),DM_PASSWORD:'',DUNGEONS_DATA_DIR:data,DUNGEONS_WEB_DIR:path.resolve(process.env.CAMPS_AUDIT_WEB??'output/actors-camp-audit/web'),DUNGEONS_TEST_CHILD:'1',DUNGEONS_CAMPAIGN:'stormwreck-isle'}});
 let logs='';child.stdout.on('data',d=>logs+=d);child.stderr.on('data',d=>logs+=d);
 for(let n=0;n<100;n++){if(child.exitCode!==null)throw Error(logs);try{if((await fetch(base+'/api/info')).ok)return;}catch{}await delay(100);}throw Error('Arranque fallido '+logs);
}
async function stop(){if(!child)return;const finished=once(child,'exit');child.send('shutdown');await finished;child=undefined;}
async function login(){const r=await fetch(base+'/api/dm/login',{method:'POST',headers:{origin:base,'content-type':'application/json'},body:'{}'});assert.equal(r.status,200);session={cookie:r.headers.get('set-cookie').split(';')[0],...(await r.json())};}
async function connect(role,id='mike'){
 const socket=io(base,{autoConnect:false,transports:['websocket'],forceNew:true,auth:{role,protocolVersion:PROTOCOL_VERSION,objectModelVersion:OBJECT_MODEL_VERSION,...(role==='player'?{sessionToken:({mike:'a',mia:'b',maria:'c'}[id]).repeat(32)}:{})},...(role==='dm'?{extraHeaders:{cookie:session.cookie}}:{})});
 sockets.push(socket);socket.actor=id;socket.on('player:private',v=>socket.private=v);
 socket.on('world:snapshot',v=>{socket.latest=v;const epoch=v.runtimeEpoch+':'+v.sceneEpoch;if(socket.readyEpoch!==epoch){socket.readyEpoch=epoch;socket.emit('scene:ready',{runtimeEpoch:v.runtimeEpoch,sceneEpoch:v.sceneEpoch});if(role==='projector')socket.emit('projector:ready',{runtimeEpoch:v.runtimeEpoch,ready:true});}});
 const first=wait(socket,'world:snapshot');socket.connect();await first;return socket;
}
async function ack(socket,event,fields,expected=true){const commandId=event==='player:claim'?undefined:crypto.randomUUID(),p=wait(socket,'command:result',r=>r.commandId===commandId);socket.emit(event,{runtimeEpoch:socket.latest.runtimeEpoch,...(commandId?{commandId}:{}),...fields});const r=await p;assert.equal(r.ok,expected,JSON.stringify(r));return r;}
const dmCommand=(dm,fields)=>ack(dm,'dm:command',{sceneEpoch:dm.latest.sceneEpoch,...fields});
const actor=socket=>socket.latest.entities.find(e=>e.id===socket.actor);
function route(socket,to,near=false){const scene=socket.latest.scene,from=actor(socket).cell,key=c=>c.col+','+c.row,occupied=new Set(socket.latest.entities.filter(e=>e.id!==socket.actor&&e.kind==='player').map(e=>key(e.cell))),queue=[[from]],seen=new Set([key(from)]);while(queue.length){const p=queue.shift(),at=p.at(-1);if(near?Math.max(Math.abs(at.col-to.col),Math.abs(at.row-to.row))<=1:key(at)===key(to))return p.slice(1);for(const b of surfaceNeighbors(scene.terrain,{surfaceId:scene.surfaceId,cell:at})){const k=key(b.cell);if(!seen.has(k)&&!occupied.has(k)){seen.add(k);queue.push([...p,b.cell]);}}}throw Error('No hay ruta: '+scene.id+' '+key(to));}
async function step(socket,target){const at=actor(socket).cell,done=wait(socket,'world:snapshot',v=>{const e=v.entities.find(e=>e.id===socket.actor);return e?.cell.col===target.col&&e.cell.row===target.row&&!e.step;});socket.emit('input:move',{runtimeEpoch:socket.latest.runtimeEpoch,sceneEpoch:socket.latest.sceneEpoch,seq:sequence++,x:target.col-at.col,z:target.row-at.row});socket.emit('input:move',{runtimeEpoch:socket.latest.runtimeEpoch,sceneEpoch:socket.latest.sceneEpoch,seq:sequence++,x:0,z:0,end:true});await done;}
async function api(route,body){const r=await fetch(base+route,{method:'POST',headers:{origin:base,cookie:session.cookie,'content-type':'application/json','x-dungeons-csrf':session.csrfToken,'x-dungeons-runtime-epoch':body.runtimeEpoch},body:JSON.stringify(body)});assert.equal(r.status,200,await r.clone().text());return r.json();}
try{
 await launch();await login();let dm=await connect('dm'),projector=await connect('projector');const players=[];
 for(const id of ['mike','mia','maria']){const p=await connect('player',id);await ack(p,'player:claim',{characterId:id});players.push(p);}
 for(const s of players)if(s.private?.characterId!==s.actor||typeof s.private?.hp!=='number')await wait(s,'player:private',v=>v.characterId===s.actor&&typeof v.hp==='number');
 const p=players[0],hp=players.map(s=>s.private.hp);
 const ids=['camp-a1-rooms','camp-forest-pleamar','camp-wreck-beach','camp-cliffs-observatory','camp-coastal-refuge'];
 for(const id of ids){
  await dmCommand(dm,{type:'scene',sceneId:id});await delay(150);assert.equal(projector.latest.sceneId,id);assert.ok(players.every(s=>s.latest.sceneId===id&&s.private.characterId===s.actor));
  const definition=p.latest.scene;let steps=0,used=0;
  for(const point of definition.camp.interactionPoints.filter(point=>!point.ownerCharacterId||point.ownerCharacterId==='mike')){
   for(const destination of route(p,point.cell)){await step(p,destination);steps++;}
   const applied=point.kind==='seat'?wait(p,'world:snapshot',v=>v.entities.some(e=>e.id===p.actor&&e.seatId===point.id)):point.kind==='chest'?wait(p,'player:private',v=>v.campInteractions.some(i=>i.pointId===point.id&&i.open)):Promise.resolve();
   await ack(p,'player:camp-interact',{sceneEpoch:p.latest.sceneEpoch,pointId:point.id});used++;await applied;
   if(point.kind==='seat'){assert.equal(actor(p).seatId,point.id);const left=wait(p,'world:snapshot',v=>v.entities.some(e=>e.id===p.actor&&!e.seatId));await ack(p,'player:camp-interact',{sceneEpoch:p.latest.sceneEpoch,pointId:point.id});await left;}
   for(const activity of activitiesForCampPoint(point))if(!['sit','chest-toggle'].includes(activity.id)){
    const animation=wait(projector,'scene:animation',event=>event.entityId===p.actor&&event.state===activity.animation);
    await ack(p,'player:camp-interact',{sceneEpoch:p.latest.sceneEpoch,pointId:point.id,activityId:activity.id});await animation;used++;
   }
   if(point.kind==='chest')assert.ok(p.private.campInteractions.some(i=>i.pointId===point.id&&i.open));
  }
  for(const personalPlayer of players.slice(1)){
   const personal=definition.camp.interactionPoints.find(point=>point.kind==='personal'&&point.ownerCharacterId===personalPlayer.actor);
   if(personal){for(const destination of route(personalPlayer,personal.cell)){await step(personalPlayer,destination);steps++;}
    for(const activity of activitiesForCampPoint(personal)){const animation=wait(projector,'scene:animation',event=>event.entityId===personalPlayer.actor&&event.state===activity.animation);await ack(personalPlayer,'player:camp-interact',{sceneEpoch:personalPlayer.latest.sceneEpoch,pointId:personal.id,activityId:activity.id});await animation;used++;}
   }
  }
  const fire=definition.camp.interactionPoints.find(point=>point.kind==='fire');
  for(const destination of route(p,fire.cell)){await step(p,destination);steps++;}
  assert.equal((await ack(p,'player:camp-interact',{sceneEpoch:p.latest.sceneEpoch,pointId:fire.id,activityId:'pray'},false)).code,'CAMP_ACTIVITY_UNAVAILABLE');
  const dmAnimation=wait(projector,'scene:animation',event=>event.entityId===p.actor&&event.state==='camp-tend-fire');
  await dmCommand(dm,{type:'camp:interact',characterId:p.actor,pointId:fire.id,activityId:'tend-fire'});await dmAnimation;used++;
  const own=definition.camp.interactionPoints.find(i=>i.kind==='chest'&&i.ownerCharacterId==='mia');
  if(own){for(const destination of route(p,own.cell,true)){await step(p,destination);steps++;}assert.equal((await ack(p,'player:camp-interact',{sceneEpoch:p.latest.sceneEpoch,pointId:own.id},false)).code,'CAMP_INTERACTION_NOT_YOURS');}
  const obstruction=definition.terrain.obstacles?.find(o=>definition.walkable.some(c=>Math.abs(c.col-o.cell.col)+Math.abs(c.row-o.cell.row)===1));
  if(obstruction){const neighbor=definition.walkable.find(c=>Math.abs(c.col-obstruction.cell.col)+Math.abs(c.row-obstruction.cell.row)===1);for(const destination of route(p,neighbor)){await step(p,destination);steps++;}const before={...actor(p).cell};p.emit('input:move',{runtimeEpoch:p.latest.runtimeEpoch,sceneEpoch:p.latest.sceneEpoch,seq:sequence++,x:obstruction.cell.col-before.col,z:obstruction.cell.row-before.row});p.emit('input:move',{runtimeEpoch:p.latest.runtimeEpoch,sceneEpoch:p.latest.sceneEpoch,seq:sequence++,x:0,z:0,end:true});await delay(220);assert.deepEqual(actor(p).cell,before);}
  await dmCommand(dm,{type:'camp:rest',sceneId:id,action:'prepare'});await dmCommand(dm,{type:'camp:rest',sceneId:id,action:'advance'});
  if(id.includes('forest')){await dmCommand(dm,{type:'camp:rest',sceneId:id,action:'interrupt',note:'Prueba local'});await dmCommand(dm,{type:'camp:rest',sceneId:id,action:'resume'});}
  await dmCommand(dm,{type:'camp:rest',sceneId:id,action:'advance'});await dmCommand(dm,{type:'camp:rest',sceneId:id,action:'advance'});
  // The acknowledgement can arrive before the next world broadcast. Await the
  // completed snapshot rather than assuming every machine broadcasts in 50 ms.
  const completed=wait(dm,'world:snapshot',v=>v.sceneId===id&&v.campRest?.outcome==='completed');
  await dmCommand(dm,{type:'camp:rest',sceneId:id,action:'finalize',completed:true});await completed;
  assert.deepEqual(players.map(s=>s.private.hp),hp);assert.equal(dm.latest.campRest.outcome,'completed');
  report.push({scene:id,steps,interactions:used,players:3,projector:true,collision:true,rest:true,hpUnchanged:true});console.log('Jugable:',id,'pasos',steps,'interacciones',used);
 }
 const last=p.latest.scene,seat=last.seats[0],chest=last.camp.interactionPoints.find(i=>i.kind==='chest'&&i.ownerCharacterId==='mike');
 for(const destination of route(p,chest.cell))await step(p,destination);if(!p.private.campInteractions.find(i=>i.pointId===chest.id)?.open)await ack(p,'player:camp-interact',{sceneEpoch:p.latest.sceneEpoch,pointId:chest.id});
 for(const destination of route(p,seat.cell))await step(p,destination);await ack(p,'player:camp-interact',{sceneEpoch:p.latest.sceneEpoch,pointId:seat.id});
 await api('/api/dm/save',{runtimeEpoch:dm.latest.runtimeEpoch,requestId:crypto.randomUUID()});sockets.forEach(s=>s.disconnect());await stop();await launch();await login();dm=await connect('dm');const reconnected=await connect('player');await ack(reconnected,'player:claim',{characterId:'mike'});await delay(80);assert.equal(reconnected.latest.sceneId,last.id);assert.equal(actor(reconnected).seatId,seat.id);assert.equal(dm.latest.campRest.outcome,'completed');assert.ok(dm.latest.campRest.interactions.some(i=>i.pointId===chest.id&&i.action==='opened'));
 const campaign=await(await fetch(base+'/api/campaign')).json();let assets=0;
 for(const url of new Set([...campaign.audio.library.ambience.map(t=>t.url),...['wizard','cleric','rogue'].map(id=>'/art/camp-seated-v1/'+id+'-seated.png'),'/art/camp-detail-v1/foliage-atlas.png','/art/camp-detail-v1/coastal-rock.png'])){
  const response=await fetch(base+url);assert.equal(response.status,200,url);
  // Consume the body: unread large PNG streams can keep the test server alive
  // during shutdown, and a status alone does not verify a complete transfer.
  assert.ok((await response.arrayBuffer()).byteLength>0,url);assets++;
 }
 await mkdir(auditOutput,{recursive:true});await writeFile(path.join(auditOutput,'playability.json'),JSON.stringify({scenes:report,persistence:true,reconnect:true,assetRequests:assets},null,2));console.log('Cinco campamentos verificados, guardado y reconexión correctos.');
}finally{sockets.forEach(s=>s.disconnect());await stop();const target=path.resolve(data);if(target.startsWith(path.resolve(tmpdir())+path.sep))await rm(target,{recursive:true,force:true});}
