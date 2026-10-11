import {io} from 'socket.io-client';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const {PROTOCOL_VERSION,OBJECT_MODEL_VERSION}=await import(pathToFileURL(path.resolve('dist/camps-weather-server/engine/shared/protocol.js')).href);
const base='http://127.0.0.1:4487';
const response=await fetch(base+'/api/dm/login',{method:'POST',headers:{origin:base,'content-type':'application/json'},body:'{}'});
if(!response.ok)throw Error('No se pudo abrir la vista de prueba');
const cookie=response.headers.get('set-cookie').split(';')[0];
const socket=io(base,{autoConnect:false,forceNew:true,transports:['websocket'],auth:{role:'dm',protocolVersion:PROTOCOL_VERSION,objectModelVersion:OBJECT_MODEL_VERSION},extraHeaders:{cookie}});
const snapshot=new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Sin snapshot')),10000);socket.once('world:snapshot',value=>{clearTimeout(timeout);resolve(value);});});
socket.connect();
try{
 const initial=await snapshot;
 socket.emit('scene:ready',{runtimeEpoch:initial.runtimeEpoch,sceneEpoch:initial.sceneEpoch});
 const commandId=crypto.randomUUID();
 const changed=new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('No se cambió la escena')),10000);socket.on('command:result',result=>{if(result.commandId!==commandId)return;clearTimeout(timeout);result.ok?resolve(result):reject(Error(JSON.stringify(result)));});});
 socket.emit('dm:command',{type:'scene',sceneId:'camp-forest-pleamar',commandId,runtimeEpoch:initial.runtimeEpoch,sceneEpoch:initial.sceneEpoch});
 await changed;console.log('Vista de prueba preparada en el bosque.');
}finally{socket.disconnect();}
