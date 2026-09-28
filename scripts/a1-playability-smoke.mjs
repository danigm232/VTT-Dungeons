import assert from 'node:assert/strict';
import {io} from 'socket.io-client';
import {writeFile} from 'node:fs/promises';
import {PROTOCOL_VERSION,OBJECT_MODEL_VERSION} from '../dist/server/engine/shared/protocol.js';
const base='http://127.0.0.1:4476',sockets=[];
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const wait=(s,event,p=()=>true)=>new Promise((resolve,reject)=>{const t=setTimeout(()=>{s.off(event,h);reject(Error('Timeout '+event));},8000);const h=v=>{if(p(v)){clearTimeout(t);s.off(event,h);resolve(v);}};s.on(event,h);});
async function connect(role,cookie){const s=io(base,{autoConnect:false,transports:['websocket'],auth:{role,protocolVersion:PROTOCOL_VERSION,objectModelVersion:OBJECT_MODEL_VERSION,...(role==='player'?{sessionToken:'b'.repeat(32)}:{})},...(cookie?{extraHeaders:{cookie}}:{})});sockets.push(s);s.on('world:snapshot',v=>s.latest=v);s.on('player:private',v=>s.private=v);const first=wait(s,'world:snapshot');s.connect();await first;return s;}
async function ack(s,event,fields){const commandId=event==='player:claim'?undefined:crypto.randomUUID();const p=wait(s,'command:result',r=>r.commandId===commandId);s.emit(event,{runtimeEpoch:s.latest.runtimeEpoch,...(commandId?{commandId}:{}),...fields});const result=await p;assert.equal(result.ok,true,JSON.stringify(result));return result;}
async function dmCommand(dm,fields){return ack(dm,'dm:command',{sceneEpoch:dm.latest.sceneEpoch,...fields});}
let seq=1;
async function move(p,x,z,target){const done=wait(p,'world:snapshot',s=>{const e=s.entities.find(e=>e.id==='mia');return e?.cell.col===target.col&&e.cell.row===target.row&&!e.step;});p.emit('input:move',{runtimeEpoch:p.latest.runtimeEpoch,seq:seq++,sceneEpoch:p.latest.sceneEpoch,x,z});p.emit('input:move',{runtimeEpoch:p.latest.runtimeEpoch,seq:seq++,sceneEpoch:p.latest.sceneEpoch,x:0,z:0,end:true});await done;}
function path(scene,from,to){const key=c=>`${c.col},${c.row}`,valid=new Set(scene.walkable.map(key)),queue=[[from]],seen=new Set([key(from)]);while(queue.length){const route=queue.shift(),a=route.at(-1);if(key(a)===key(to))return route.slice(1);for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const b={col:a.col+dx,row:a.row+dz},k=key(b);if(valid.has(k)&&!seen.has(k)){seen.add(k);queue.push([...route,b]);}}}throw Error('Sin ruta');}
try{
  const login=await fetch(base+'/api/dm/login',{method:'POST',headers:{origin:base,'content-type':'application/json'},body:'{}'});assert.equal(login.status,200);
  const dm=await connect('dm',login.headers.get('set-cookie').split(';')[0]);
  if(dm.latest.sceneId!=='camp-a1-rooms'){await dmCommand(dm,{type:'scene',sceneId:'camp-a1-rooms'});await delay(150);}
  const p=await connect('player'),projector=await connect('projector');
  assert.equal(projector.latest.sceneId,'camp-a1-rooms');
  p.emit('scene:ready',{runtimeEpoch:p.latest.runtimeEpoch,sceneEpoch:p.latest.sceneEpoch});
  projector.emit('scene:ready',{runtimeEpoch:projector.latest.runtimeEpoch,sceneEpoch:projector.latest.sceneEpoch});
  projector.emit('projector:ready',{runtimeEpoch:projector.latest.runtimeEpoch,ready:true});
  await ack(p,'player:claim',{characterId:'mia'});await delay(150); assert.equal(p.latest.sceneId,'camp-a1-rooms'); p.emit('scene:ready',{runtimeEpoch:p.latest.runtimeEpoch,sceneEpoch:p.latest.sceneEpoch});
  let steps=0;
  for(const point of p.latest.scene.camp.interactionPoints){
    const from=p.latest.entities.find(e=>e.id==='mia').cell;
    for(const target of path(p.latest.scene,from,point.cell)){const at=p.latest.entities.find(e=>e.id==='mia').cell;await move(p,target.col-at.col,target.row-at.row,target);steps++;}
    await ack(p,'player:camp-interact',{sceneEpoch:p.latest.sceneEpoch,pointId:point.id});
  }
  // The chair beside the middle aisle is an existing blocked cell.
  const at={...p.latest.entities.find(e=>e.id==='mia').cell};
  p.emit('input:move',{runtimeEpoch:p.latest.runtimeEpoch,seq:seq++,sceneEpoch:p.latest.sceneEpoch,x:1,z:0});
  p.emit('input:move',{runtimeEpoch:p.latest.runtimeEpoch,seq:seq++,sceneEpoch:p.latest.sceneEpoch,x:0,z:0,end:true});
  await delay(350);assert.deepEqual(p.latest.entities.find(e=>e.id==='mia').cell,at);
  const hpBefore=p.private?.hp; assert.equal(typeof hpBefore,"number");
  await dmCommand(dm,{type:'camp:rest',sceneId:'camp-a1-rooms',action:'prepare'});
  await dmCommand(dm,{type:'camp:rest',sceneId:'camp-a1-rooms',action:'advance'});
  await dmCommand(dm,{type:'camp:rest',sceneId:'camp-a1-rooms',action:'interrupt',note:'Prueba aislada de interrupción'});
  await dmCommand(dm,{type:'camp:rest',sceneId:'camp-a1-rooms',action:'resume'});
  await dmCommand(dm,{type:'camp:rest',sceneId:'camp-a1-rooms',action:'advance'});
  await dmCommand(dm,{type:'camp:rest',sceneId:'camp-a1-rooms',action:'advance'});
  await dmCommand(dm,{type:'camp:rest',sceneId:'camp-a1-rooms',action:'finalize',completed:true});
  await delay(100);assert.equal(dm.latest.campRest.outcome,'completed');assert.equal(p.private?.hp,hpBefore);
  for(const name of ['cliff','limestone-v3','masonry','flagstone','earth','wood','linen','foliage','foliage-atlas-v4','linen-v4','wool-v4','oak-v4','ashlar-v4','bay-v2'])assert.equal((await fetch(base+'/art/a1-hd2d-v1/'+name+'.webp')).status,200);
  const report={scene:'camp-a1-rooms',navigationSteps:steps,playerInteractions:6,playerAndProjectorAccess:true,collision:true,restPhasesAndInterruption:true,benefitsUnchanged:true,textureRequests:14};
  await writeFile('output/a1-review/playability.json',JSON.stringify(report,null,2));console.log(report);
}finally{sockets.forEach(s=>s.disconnect());}
