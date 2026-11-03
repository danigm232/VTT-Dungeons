import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {io} from 'socket.io-client';

// Point only at a disposable instance started by REVISAR-ACABADO.cmd.
const base=process.env.DUNGEONS_REVIEW_URL;
if(!base||new URL(base).hostname!=='127.0.0.1')throw Error('Supply the disposable loopback review URL');
const build=path.resolve('runtime/stormwreck-style-skull-20261102/server');
const {PROTOCOL_VERSION,OBJECT_MODEL_VERSION}=await import(pathToFileURL(path.join(build,'engine/shared/protocol.js')).href);
const sockets=[],checks=[];let cookie,sequence=1;
const record=(name,details={})=>{checks.push({name,ok:true,...details});console.log('PASS '+name);};
function wait(socket,event,predicate=()=>true,timeout=15000){return new Promise((resolve,reject)=>{
 const timer=setTimeout(()=>{socket.off(event,handler);reject(Error('Timeout '+event));},timeout);
 const handler=data=>{if(predicate(data)){clearTimeout(timer);socket.off(event,handler);resolve(data);}};socket.on(event,handler);
});}
async function connect(role,token){
 const socket=io(base,{autoConnect:false,transports:['websocket'],forceNew:true,auth:{role,protocolVersion:PROTOCOL_VERSION,objectModelVersion:OBJECT_MODEL_VERSION,...(token?{sessionToken:token}:{})},...(role==='dm'?{extraHeaders:{cookie}}:{})});sockets.push(socket);
 socket.on('world:snapshot',snapshot=>{socket.latest=snapshot;const key=snapshot.runtimeEpoch+':'+snapshot.sceneEpoch;if(socket.ready!==key){socket.ready=key;socket.emit('scene:ready',{runtimeEpoch:snapshot.runtimeEpoch,sceneEpoch:snapshot.sceneEpoch});}if(role==='projector')socket.emit('projector:ready',{runtimeEpoch:snapshot.runtimeEpoch,ready:true});});
 const first=wait(socket,'world:snapshot');socket.connect();await first;return socket;
}
async function ack(socket,event,fields){const commandId=event==='player:claim'?undefined:crypto.randomUUID();const answer=wait(socket,'command:result',r=>commandId?r.commandId===commandId:!r.commandId);
 socket.emit(event,{runtimeEpoch:socket.latest.runtimeEpoch,...(commandId?{commandId}:{}),...fields});return answer;
}
function entity(snapshot){return snapshot.entities.find(e=>e.id==='mike');}
try{
 const login=await fetch(base+'/api/dm/login',{method:'POST',headers:{origin:base,'content-type':'application/json'},body:'{}'});assert.equal(login.status,200);cookie=login.headers.get('set-cookie').split(';')[0];record('local DM login');
 const dm=await connect('dm'),projector=await connect('projector'),token=crypto.randomUUID().replaceAll('-',''),player=await connect('player',token),other=await connect('player',crypto.randomUUID().replaceAll('-',''));
 assert.equal((await ack(dm,'dm:command',{type:'release',characterId:'mike'})).ok,true);
 assert.equal((await ack(player,'player:claim',{characterId:'mike'})).ok,true);assert.equal((await ack(other,'player:claim',{characterId:'mike'})).code,'CHARACTER_UNAVAILABLE');record('exclusive player claim');
 // The server deliberately ignores DM events from a player rather than
 // acknowledging a privileged operation. Verify no public side effect.
 const oldStorm=projector.latest.environment.storm,revision=projector.latest.revision;
 player.emit('dm:command',{runtimeEpoch:player.latest.runtimeEpoch,sceneEpoch:player.latest.sceneEpoch,commandId:crypto.randomUUID(),type:'environment',storm:!oldStorm});
 const unchanged=wait(projector,'world:snapshot',v=>v.revision>revision);
 assert.equal((await ack(dm,'dm:command',{type:'camera',sceneEpoch:dm.latest.sceneEpoch,mode:'follow',focusId:null})).ok,true);
 assert.equal((await unchanged).environment.storm,oldStorm);record('player cannot change DM weather');
 const catalog=await (await fetch(base+'/api/campaign')).text();assert.ok(!catalog.includes('privateNotes'));assert.equal((await fetch(base+'/campaigns/stormwreck-isle/private/CAMPAIGN_NOTES.md')).status,404);record('private sources remain blocked');
 for(const sceneId of ['dragon-rest','wreck-ship']){
  const epoch=dm.latest.sceneEpoch;
  const snapshots=[dm,player,projector].map(s=>wait(s,'world:snapshot',v=>v.sceneId===sceneId&&v.sceneEpoch>epoch));
  assert.equal((await ack(dm,'dm:command',{type:'scene',sceneEpoch:dm.latest.sceneEpoch,sceneId})).ok,true);
  const synced=await Promise.all(snapshots);assert.ok(synced.every(s=>s.sceneEpoch===synced[0].sceneEpoch));record('scene synchronized',{sceneId});
 }
 let changed=null;
 for(const [x,z]of [[1,0],[0,1],[-1,0],[0,-1]]){
  const initial=structuredClone(entity(player.latest));
  const movement=wait(projector,'world:snapshot',v=>{const e=entity(v);return e&&!e.step&&(e.cell.col!==initial.cell.col||e.cell.row!==initial.cell.row||e.surfaceId!==initial.surfaceId);},2000).catch(()=>null);
  player.emit('input:move',{runtimeEpoch:player.latest.runtimeEpoch,sceneEpoch:player.latest.sceneEpoch,seq:sequence++,x,z});
  player.emit('input:move',{runtimeEpoch:player.latest.runtimeEpoch,sceneEpoch:player.latest.sceneEpoch,seq:sequence++,x:0,z:0,end:true});
  changed=await movement;if(changed)break;
 }
 assert.ok(changed,'At least one free cardinal step at the current spawn must move');record('movement visible on projector',{position:entity(changed).cell,surface:entity(changed).surfaceId});
 const climateWait=wait(projector,'world:snapshot',v=>v.environment.precipitation==='rain');
 assert.equal((await ack(dm,'dm:command',{type:'environment',sceneEpoch:dm.latest.sceneEpoch,precipitation:'rain',precipitationLevel:2})).ok,true);await climateWait;record('weather synchronized without save_unavailable');
 const stopped=entity(player.latest);player.disconnect();const reconnect=await connect('player',token);
 const reclaimed=await ack(reconnect,'player:claim',{characterId:'mike'});assert.equal(reclaimed.ok,true);assert.deepEqual(entity(reconnect.latest).cell,stopped.cell);record('reconnect preserves position');
 for(const asset of ['basalt-illustrated-v1.png','oak-illustrated-v1.png','ship-timber-illustrated-v1.png'])assert.equal((await fetch(base+'/art/visual-style-v1/'+asset)).status,200);
 for(const route of ['dm','player','projector'])assert.equal((await fetch(base+'/'+route)).status,200);record('three interfaces and new art served');
 assert.equal((await ack(dm,'dm:command',{type:'environment',sceneEpoch:dm.latest.sceneEpoch,precipitation:'none'})).ok,true);
 const report={date:new Date().toISOString(),base,scope:'Real sockets against isolated compiled candidate; no physical-device or performance certification',checks};
 fs.writeFileSync('output/stormwreck-style-sample-20261101/network-smoke.json',JSON.stringify(report,null,2)+'\n');console.log('PASS isolated style candidate: '+checks.length+' checks');
}finally{for(const socket of sockets)socket.disconnect();}
