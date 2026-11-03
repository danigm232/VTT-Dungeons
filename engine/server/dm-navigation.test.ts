import {afterEach,describe,expect,it} from 'vitest';
import {Server} from 'socket.io';
import {io as client,type Socket as ClientSocket} from 'socket.io-client';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {stormwreckBundle} from '../../campaigns/stormwreck-isle/server';
import {GameState,GameServer} from './game';
import {PROTOCOL_VERSION,OBJECT_MODEL_VERSION,type WorldSnapshot,type DmState} from '../shared/protocol';
import {footprintFor} from '../shared/geometry';

function destination(state:GameState,sceneId:string,surfaceId:string){
  const scene=state.sceneById(sceneId),props=state.publicObjectProps(sceneId);
  return scene.terrain!.surfaces.find(s=>s.id===surfaceId)!.tiles.find(tile=>
    !props.some(p=>p.surfaceId===surfaceId&&p.structure!=='destroyed'&&(p.kind!=='door'||p.state!=='open')&&footprintFor(p.cell,p.rotation,p.footprint).some(c=>c.col===tile.cell.col&&c.row===tile.cell.row))
    &&![...state.characters.values(),...state.npcs.values()].some(e=>e.sceneId===sceneId&&e.surfaceId===surfaceId&&e.cell.col===tile.cell.col&&e.cell.row===tile.cell.row))!.cell;
}
describe('DM exploration and placement',()=>{
  it('places an offline player across scenes without movement costs, hazards, inventory or camera changes, and rejects an invalid floor atomically',()=>{
    const s=new GameState(stormwreckBundle),hero=s.characters.get('mike')!,sceneId=s.sceneId,epoch=s.sceneEpoch;s.applyClockControl('pause');
    const resources=structuredClone(hero.combat),inventory=[...hero.inventory],clock=s.gameClockSnapshot().seconds,camera={...s.camera},hp=hero.hp;
    const cell=destination(s,'wreck-ship','lower-deck');
    expect(s.placeEntity(hero.id,'wreck-ship','lower-deck',cell)).toBe('PLACED');
    expect(hero).toMatchObject({sceneId:'wreck-ship',surfaceId:'lower-deck',cell,step:null,moving:false,hp});
    expect(hero.combat).toEqual(resources);expect(hero.inventory).toEqual(inventory);expect(s.camera).toEqual(camera);
    expect(s.sceneId).toBe(sceneId);expect(s.sceneEpoch).toBe(epoch);expect(s.gameClockSnapshot().seconds).toBe(clock);
    const at=Date.now(),before=s.captureDurable(at);expect(s.placeEntity(hero.id,'wreck-ship','missing',cell)).toBe('BLOCKED_CELL');expect(s.captureDurable(at)).toEqual(before);
    const other=s.characters.get('mia')!;expect(s.placeEntity(hero.id,other.sceneId,other.surfaceId,other.cell)).toBe('OCCUPIED_CELL');
    expect(s.publicSnapshot(false,'wreck-ship',undefined,true).entities.some(e=>e.id===hero.id)).toBe(true);
    expect(s.publicSnapshot(true,'wreck-ship').entities.some(e=>e.id===hero.id)).toBe(false);
  });
  it('moves a PNJ between floors, persists it and scopes DM objects to the viewed map',()=>{
    const s=new GameState(stormwreckBundle),npc=s.npcs.get('retreat-runara')!,cell=destination(s,'wreck-ship','hold-air');
    expect(s.placeEntity(npc.id,'wreck-ship','hold-air',cell)).toBe('PLACED');
    const restored=new GameState(stormwreckBundle);restored.restoreDurable(s.captureDurable());
    expect(restored.npcs.get(npc.id)).toMatchObject({sceneId:'wreck-ship',surfaceId:'hold-air',cell});
    const view=s.dmState('wreck-ship');expect(view.sceneId).toBe('wreck-ship');expect(view.tableSceneId).toBe(s.sceneId);
    expect(view.npcs.some(n=>n.id===npc.id)).toBe(true);expect(view.objects.some(o=>o.surfaceId==='hold-air')).toBe(true);
  });
  it('keeps two DM views and the projector independent, rejects player preview requests, shares on request and undoes placement',async()=>{
    const http=createServer(),io=new Server(http),game=new GameServer(io,'test-dm',stormwreckBundle),sockets:ClientSocket[]=[];
    game.start();http.listen(0,'127.0.0.1');await once(http,'listening');const port=(http.address() as {port:number}).port;
    const open=async(role:string,token?:string)=>{
      const socket=client('http://127.0.0.1:'+port,{autoConnect:false,reconnection:false,transports:['websocket'],extraHeaders:{Cookie:'dnd_dm=test-dm'},auth:{role,sessionToken:token,protocolVersion:PROTOCOL_VERSION,objectModelVersion:OBJECT_MODEL_VERSION}});sockets.push(socket);
      const snapshot=once(socket,'world:snapshot');socket.connect();return {socket,snapshot:(await snapshot)[0] as WorldSnapshot};
    };
    try{
      const dm=await open('dm'),second=await open('dm'),projector=await open('projector'),player=await open('player','a'.repeat(32));
      game.state.applyClockControl('pause');const at=Date.now(),saved=game.state.captureDurable(at),initial=game.state.sceneId;
      let p=once(dm.socket,'world:snapshot');dm.socket.emit('dm:view',{runtimeEpoch:game.state.runtimeEpoch,sceneId:'wreck-ship'});expect((await p)[0].sceneId).toBe('wreck-ship');
      game['broadcastSnapshot']();const other=game['snapshotForSocket'](io.sockets.sockets.get(second.socket.id!)!);expect(other.sceneId).toBe(initial);
      expect(game['snapshotForSocket'](io.sockets.sockets.get(projector.socket.id!)!).sceneId).toBe(initial);expect(game.state.captureDurable(at)).toEqual(saved);
      player.socket.emit('dm:view',{runtimeEpoch:game.state.runtimeEpoch,sceneId:'wreck-ship'});expect(game['snapshotForSocket'](io.sockets.sockets.get(player.socket.id!)!).sceneId).toBe(player.snapshot.sceneId);
      const send=async(body:Record<string,unknown>)=>{const result=once(dm.socket,'command:result');dm.socket.emit('dm:command',{runtimeEpoch:game.state.runtimeEpoch,...(body.type==='game:undo'?{}:{sceneEpoch:game.state.sceneEpoch}),commandId:crypto.randomUUID(),...body});return (await result)[0];};
      const hero=game.state.characters.get('mike')!,before={sceneId:hero.sceneId,surfaceId:hero.surfaceId,cell:{...hero.cell}},cell=destination(game.state,'wreck-ship','lower-deck');
      expect(await send({type:'entity:place',entityId:hero.id,sceneId:'wreck-ship',surfaceId:'lower-deck',cell})).toMatchObject({ok:true});
      expect(hero.sceneId).toBe('wreck-ship');expect((await send({type:'game:undo'})).ok).toBe(true);expect(game.state.characters.get(hero.id)).toMatchObject(before);
      expect((await send({type:'view:focus',sceneId:'wreck-ship'})).ok).toBe(true);expect(game['snapshotForSocket'](io.sockets.sockets.get(projector.socket.id!)!).sceneId).toBe('wreck-ship');
      const privateState=game['dmState'](io.sockets.sockets.get(dm.socket.id!)!) as DmState;expect(privateState.sceneId).toBe('wreck-ship');
    }finally{for(const socket of sockets)socket.disconnect();game.stop();await io.close();http.close();}
  },30000);
});
