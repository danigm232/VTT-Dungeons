import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Server } from 'socket.io';
import { io } from 'socket.io-client';

const build=path.resolve(process.env.DUNGEONS_SERVER_BUILD||'dist/server');
const moduleAt=p=>import(pathToFileURL(path.join(build,p)).href);
const {GameServer}=await moduleAt('engine/server/game.js');
const {PROTOCOL_VERSION,OBJECT_MODEL_VERSION}=await moduleAt('engine/shared/protocol.js');
const {oneShotBundle}=await moduleAt('campaigns/one-shot/server.js');
const {stormwreckBundle}=await moduleAt('campaigns/stormwreck-isle/server.js');
const wait=(socket,event)=>new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{socket.off(event,done);reject(new Error(`Timeout: ${event}`));},5000);
  const done=value=>{clearTimeout(timer);resolve(value);}; socket.once(event,done);
});
for(const [bundle,high,low,invalid] of [[oneShotBundle,35,15,45],[stormwreckBundle,40,20,35]]){
  const httpServer=http.createServer(),server=new Server(httpServer),game=new GameServer(server,'camera-test',bundle),clients=[];
  game.start(); await new Promise(resolve=>httpServer.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${httpServer.address().port}`;
  const client=role=>{const socket=io(base,{autoConnect:false,transports:['websocket'],reconnection:false,
    auth:{role,protocolVersion:PROTOCOL_VERSION,objectModelVersion:OBJECT_MODEL_VERSION},
    ...(role==='dm'?{extraHeaders:{Cookie:'dnd_dm=camera-test'}}:{})});clients.push(socket);return socket;};
  try{
    const dm=client('dm'),projector=client('projector');
    const snapshot=wait(dm,'world:snapshot'),projected=wait(projector,'world:snapshot');dm.connect();projector.connect();
    const world=await snapshot;await projected;
    const message={runtimeEpoch:world.runtimeEpoch,sceneEpoch:world.sceneEpoch,sceneId:world.sceneId,step:-1.5,profile:'limited-hd2d-v2'};
    const frame={halfHeight:4,target:{x:12,y:1,z:8},focusId:null};
    const first=wait(projector,'camera:orientation');dm.emit('camera:orientation',{...message,tilt:high,frame});
    const shared=await first;assert.equal(shared.tilt,high);assert.deepEqual(shared.frame,frame);
    const returning=client('projector'),remembered=wait(returning,'camera:orientation');returning.connect();
    const replay=await remembered;assert.equal(replay.tilt,high);assert.deepEqual(replay.frame,frame);
    const updates=[];projector.on('camera:orientation',event=>updates.push(event));
    dm.emit('camera:orientation',{...message,tilt:invalid});
    dm.emit('camera:orientation',{...message,tilt:low,frame:{...frame,halfHeight:0}});
    dm.emit('camera:orientation',{...message,tilt:low,frame:{...frame,target:{x:'12',y:1,z:8}}});
    dm.emit('camera:orientation',{...message,runtimeEpoch:'stale',tilt:low});
    const valid=wait(projector,'camera:orientation');dm.emit('camera:orientation',{...message,tilt:low});
    assert.equal((await valid).tilt,low);assert.equal(updates.length,1);
    const stopped=wait(projector,'camera:orientation');dm.emit('camera:orientation',{...message,step:null});
    assert.equal((await stopped).step,null);
    const independent=client('projector'),afterDisable=[];independent.on('camera:orientation',event=>afterDisable.push(event));
    const ready=wait(independent,'world:snapshot');independent.connect();await ready;
    const enabled=wait(independent,'camera:orientation');dm.emit('camera:orientation',{...message,tilt:high});
    assert.equal((await enabled).tilt,high);assert.equal(afterDisable.length,1);
    console.log(`${bundle.public.campaignId}: shared tilt/zoom/focus, reconnect, validation and disable PASS`);
  }finally{for(const client of clients)client.disconnect();game.stop();await new Promise(resolve=>server.close(resolve));}
}
