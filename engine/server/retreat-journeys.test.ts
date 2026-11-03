import {describe,it,expect,vi,beforeEach,afterEach} from 'vitest';
import {Server} from 'socket.io';
import {stormwreckBundle} from '../../campaigns/stormwreck-isle/server.js';
import {dragonRestPorts,retreatStageActorInteractions,dragonRestScene} from '../../campaigns/stormwreck-isle/public/retreat-runtime.js';
import {retreatJourneyPorts,retreatJourneyInteractions,retreatPreparedDestinations,retreatJourneyReferences} from '../../campaigns/stormwreck-isle/public/retreat-journeys.js';
import {journeyReturnKey,journeyPortLabel} from '../shared/journey.js';
import {PROTOCOL_VERSION,OBJECT_MODEL_VERSION,type DmCommand} from '../shared/protocol.js';
import {surfaceNeighbors} from '../shared/terrain.js';
import {compileCampaignBundle,type MapAddress} from './campaign.js';
import {durablePayloadSchema} from './persistence/schema.js';
import {GameState,GameServer} from './game.js';

const ids=['mike','mia','maria'];
function claim(state:GameState,id='mike'){
 const token=String.fromCharCode(97+ids.indexOf(id)).repeat(32);state.claim(token,'socket-'+id,id);return token;
}
function place(state:GameState,id:string,address:MapAddress){Object.assign(state.characters.get(id)!,{sceneId:address.mapId,surfaceId:address.surfaceId,cell:{...address.cell},step:null,moving:false});}
const where=(state:GameState,id='mike')=>{const c=state.characters.get(id)!;return {sceneId:c.sceneId,surfaceId:c.surfaceId,cell:{...c.cell}};};
const command=(server:GameServer,body:Record<string,unknown>)=>server.applyDmCommand({commandId:crypto.randomUUID(),runtimeEpoch:server.state.runtimeEpoch,sceneEpoch:server.state.sceneEpoch,objectRevision:server.state.objectRevision,...body} as DmCommand);

describe('G2.4 · viajes manuales del Retiro',()=>{
 beforeEach(()=>vi.spyOn(Date,'now').mockReturnValue(1792836000000));
 afterEach(()=>vi.restoreAllMocks());
 it('compila seis paradas optativas y cuatro anclas sin sustituir actores ni el puerto del pecio',()=>{
  const c=compileCampaignBundle(stormwreckBundle);
  expect(retreatJourneyPorts).toHaveLength(6);expect(retreatJourneyInteractions).toHaveLength(4);
  expect(c.stageActorInteractions).toHaveLength(retreatStageActorInteractions.length+4);
  expect(c.public.scenes.find(s=>s.id==='dragon-rest')!.stageActors).toEqual(dragonRestScene.stageActors);
  expect(c.ports!.find(p=>p.id==='travel-pecio-boat')).toEqual(dragonRestPorts.find(p=>p.id==='travel-pecio-boat'));
  expect(retreatJourneyPorts.every(p=>p.return==='adjudicated'&&p.autoDirection==='manual'&&p.rememberReturn&&!p.travelSeconds)).toBe(true);
  expect(retreatPreparedDestinations.filter(d=>d.status==='prepared').every(d=>d.mapId===null)).toBe(true);
  expect(retreatJourneyReferences.wreckBoat.seconds).toBe(6000);
 });
 it('rechaza un ancla de lugar aplicada a Runara y destinos inexistentes',()=>{
  const b=structuredClone(stormwreckBundle);b.stageActorInteractions!.find(i=>i.targetId==='retreat-runara')!.siteAnchor=true;
  expect(()=>compileCampaignBundle(b)).toThrow(/Ancla de lugar/);
  const bad=structuredClone(stormwreckBundle);bad.ports!.find(p=>p.rememberReturn)!.to.mapId='missing-destination';
  expect(()=>compileCampaignBundle(bad)).toThrow();
 });
 it('guarda claves booleanas compactas, únicas para los 18 pares de personaje y ruta',()=>{
  const keys=ids.flatMap(id=>retreatJourneyPorts.map(p=>journeyReturnKey(id,p.id)));
  expect(new Set(keys).size).toBe(18);expect(keys.every(k=>k.length<=40&&/^[a-z0-9._-]+$/.test(k))).toBe(true);
  expect(journeyReturnKey('mike',retreatJourneyPorts[0]!.id)).toBe(keys[0]);
  expect(journeyPortLabel(retreatJourneyPorts[0]!,'forward')).toContain('opcional');
  expect(journeyPortLabel(dragonRestPorts.find(p=>p.id==='travel-pecio-boat')!,'forward')).toContain('Rosa de los Vientos');
 });
 for(const port of retreatJourneyPorts){
  it(port.id+' · solicita, cancela, cruza y vuelve con tres personajes sin reloj ni solapes',()=>{
   const server=new GameServer(new Server(),'dm-test',stormwreckBundle),s=server.state;
   const clock=s.gameClockSnapshot().seconds,environment=structuredClone(s.environment);
   for(const id of ids){claim(s,id);place(s,id,port.from);
    const before=where(s,id);expect(s.requestManualJourney(id,port.interactionTargetId!)).toBe('REQUESTED');
    expect(where(s,id)).toEqual(before);expect(s.gameClockSnapshot().seconds).toBe(clock);
    if(port.interactionTargetId!=='travel-pecio-boat')expect(s.playerPrivate(s.characters.get(id)!.sessionToken!).availableInteractions.find(a=>a.targetId===port.interactionTargetId)).toMatchObject({cell:port.from.cell,surfaceId:port.from.surfaceId});
    expect(s.requestManualJourney(id,port.interactionTargetId!)).toBe('INTERACTION_PENDING');
    const r=s.interactions.find(r=>r.characterId===id&&r.status==='pending')!;
    expect(s.interactionRequestValid(r)).toBe(true);
    expect(command(server,{type:'resolveInteraction',requestId:r.id,result:'cancelled'}).ok).toBe(true);
    expect(where(s,id)).toEqual(before);
    expect(s.traversePort(id,port.id,'forward')).toBe('PORT_REQUIRES_ADJUDICATION');
    expect(s.traversePort(id,port.id,'forward',true)).toBe('MOVED');
    expect(s.characters.get(id)!.step).toBeNull();expect(s.progress[journeyReturnKey(id,port.id)]).toBe(true);
   }
   expect(new Set(ids.map(id=>JSON.stringify(where(s,id)))).size).toBe(3);
   for(const id of ids){place(s,id,port.to);expect(s.manualJourneyOptions(id,'manual-journey-return')).toEqual([{portId:port.id,direction:'return'}]);
    expect(s.playerPrivate(s.characters.get(id)!.sessionToken!).availableInteractions.find(a=>a.targetId==='manual-journey-return')).toMatchObject({cell:port.to.cell,surfaceId:port.to.surfaceId});
    expect(s.traversePort(id,port.id,'return',true)).toBe('MOVED');expect(s.progress[journeyReturnKey(id,port.id)]).toBe(false);
   }
   expect(new Set(ids.map(id=>JSON.stringify(where(s,id)))).size).toBe(3);
   expect(s.gameClockSnapshot().seconds).toBe(clock);expect(s.environment).toEqual(environment);expect(s.campRest).toBeNull();
  });
  it(port.id+' · persiste el regreso incluso lejos de la entrada y no teletransporta desde allí',()=>{
   const s=new GameState(stormwreckBundle);claim(s);place(s,'mike',port.from);expect(s.traversePort('mike',port.id,'forward',true)).toBe('MOVED');
   const actor=s.characters.get('mike')!,scene=s.campaign.public.scenes.find(x=>x.id===port.to.mapId)!;
   const next=surfaceNeighbors(scene.terrain!,{surfaceId:actor.surfaceId,cell:actor.cell})[0]!;actor.cell={...next.cell};
   s.progress['story-sentinel']=true;actor.hp=3;actor.inventory.push('G2.4 sentinel');
   const saved=durablePayloadSchema.parse(s.captureDurable()),r=new GameState(stormwreckBundle);r.restoreDurable(saved);claim(r);
   expect(r.progress[journeyReturnKey('mike',port.id)]).toBe(true);expect(r.progress['story-sentinel']).toBe(true);
   expect(r.characters.get('mike')!.hp).toBe(3);expect(r.characters.get('mike')!.inventory).toContain('G2.4 sentinel');
   expect(r.manualJourneyOptions('mike','manual-journey-return')).toEqual([]);
   place(r,'mike',port.to);expect(r.manualJourneyOptions('mike','manual-journey-return')).toEqual([{portId:port.id,direction:'return'}]);
  });
 }
 it('no confunde la barca con el camino si cada personaje usó un medio distinto',()=>{
  const s=new GameState(stormwreckBundle),road=retreatJourneyPorts[0]!,boat=retreatJourneyPorts[4]!;
  for(const [id,p]of [['mike',road],['mia',boat]]as const){claim(s,id);place(s,id,p.from);expect(s.traversePort(id,p.id,'forward',true)).toBe('MOVED');}
  place(s,'mike',boat.to);place(s,'mia',road.to);
  expect(s.manualJourneyOptions('mike','manual-journey-return')).toEqual([]);expect(s.manualJourneyOptions('mia','manual-journey-return')).toEqual([]);
  place(s,'mike',road.to);expect(s.manualJourneyOptions('mike','manual-journey-return')[0]!.portId).toBe(road.id);
 });
 it('los guardados anteriores sin registro conservan el retorno manual desde el ancla',()=>{
  const s=new GameState(stormwreckBundle),p=retreatJourneyPorts[0]!;claim(s);place(s,'mike',p.to);
  expect(s.manualJourneyOptions('mike','manual-journey-return')).toEqual([{portId:p.id,direction:'return'}]);
 });
 it('la barca original sigue llevando y devolviendo tres viajeros sin solaparlos',()=>{
  const s=new GameState(stormwreckBundle),p=dragonRestPorts.find(p=>p.id==='travel-pecio-boat')!;
  for(const dir of ['forward','return']as const){for(const id of ids){claim(s,id);place(s,id,dir==='forward'?p.from:p.to);expect(s.traversePort(id,p.id,dir,true)).toBe('MOVED');const actor=s.characters.get(id)!;if(actor.step?.passage){actor.step.startedAt=Date.now()-actor.step.durationMs-1;s.tick();}expect(actor.sceneId).toBe(dir==='forward'?p.to.mapId:p.from.mapId);}
   expect(new Set(ids.map(id=>JSON.stringify(where(s,id)))).size).toBe(3);
  }
 });
 it('valida la escena real del personaje aunque el DM mire otro mapa',()=>{
  const s=new GameState(stormwreckBundle),p=retreatJourneyPorts[1]!;claim(s);place(s,'mike',p.from);s.focusScene('camp-coastal-refuge');
  expect(s.stageActorInteractionFor('mike',p.interactionTargetId!)).not.toBeNull();expect(s.requestManualJourney('mike',p.interactionTargetId!)).toBe('REQUESTED');
  expect(s.interactionRequestValid(s.interactions.at(-1)!)).toBe(true);
 });
 for(const invalid of ['remote','hidden','dead-target','wrong-target-scene','dead-player','unconscious','paralysed','disconnected','combat']as const){
  it('rechaza la interacción '+invalid,()=>{
   const s=new GameState(stormwreckBundle),p=retreatJourneyPorts[0]!;claim(s);place(s,'mike',p.from);const c=s.characters.get('mike')!,n=s.npcs.get(p.interactionTargetId!)!;
   if(invalid==='remote')c.cell={col:3,row:74};if(invalid==='hidden')n.visible=false;if(invalid==='dead-target')n.hp=0;
   if(invalid==='wrong-target-scene')n.sceneId='camp-coastal-refuge';if(invalid==='dead-player')c.hp=0;
   if(invalid==='unconscious')s.conditions[c.id]=['inconsciente'];if(invalid==='paralysed')s.conditions[c.id]=['paralizada'];
   if(invalid==='disconnected')c.socketId=null;if(invalid==='combat')s.combat.active=true;
   expect(s.manualJourneyOptions(c.id,p.interactionTargetId!)).toEqual([]);expect(s.requestManualJourney(c.id,p.interactionTargetId!)).toBe('TOO_FAR');
  });
 }
 it('moverse y desconectar invalidan solicitudes; no se aceptan resultados propios del timón',()=>{
  const server=new GameServer(new Server(),'dm-test',stormwreckBundle),s=server.state,p=retreatJourneyPorts[0]!;claim(s);place(s,'mike',p.from);
  expect(s.requestManualJourney('mike',p.interactionTargetId!)).toBe('REQUESTED');const request=s.interactions.at(-1)!;
  expect(command(server,{type:'resolveInteraction',requestId:request.id,result:'caught',cell:p.from.cell,rotation:0}).code).toBe('INVALID_TRANSITION');
  s.characters.get('mike')!.cell={col:p.from.cell.col,row:p.from.cell.row+1};expect(s.interactionRequestValid(request)).toBe(false);
  place(s,'mike',p.from);s.characters.get('mike')!.socketId=null;expect(s.interactionRequestValid(request)).toBe(false);
 });
 it('caminar hasta el límite no activa viajes, y una llegada ocupada por mobiliario busca suelo libre',()=>{
  const s=new GameState(stormwreckBundle),p=retreatJourneyPorts[0]!;claim(s);place(s,'mike',p.from);
  s.tick();expect(where(s).sceneId).toBe('dragon-rest');expect(s.interactions).toHaveLength(0);
  const b=structuredClone(stormwreckBundle),q=b.ports!.find(x=>x.id===p.id)!,camp=b.public.scenes.find(x=>x.id===q.to.mapId)!;
  const seed=b.public.scenes.flatMap(x=>x.props).find(x=>x.kind==='crate')!;
  const obstacle={...structuredClone(seed),id:'journey-test-crate',surfaceId:q.to.surfaceId,cell:{...q.to.cell},baseFootprint:[{col:0,row:0}],rotation:0};
  camp.props.push(obstacle);const blocked=new GameState(b);claim(blocked);place(blocked,'mike',q.from);
  expect(blocked.traversePort('mike',q.id,'forward',true)).toBe('MOVED');expect(blocked.characters.get('mike')!.cell).not.toEqual(obstacle.cell);
 });
 it('un PNJ real conserva la restricción de planta y los proyectores no reciben comandos del DM',()=>{
  const s=new GameState(stormwreckBundle),interaction=retreatStageActorInteractions.find(i=>i.targetId==='retreat-runara')!;
  claim(s);Object.assign(s.characters.get('mike')!,{sceneId:interaction.sceneId,surfaceId:interaction.surfaceId,cell:{...interaction.cells[0]!}});
  expect(s.stageActorInteractionFor('mike','retreat-runara')).not.toBeNull();s.npcs.get('retreat-runara')!.surfaceId='beach';
  expect(s.stageActorInteractionFor('mike','retreat-runara')).toBeNull();
  const server=new GameServer(new Server(),'dm-test',stormwreckBundle),handlers=new Map<string,Function>();
  (server as any).connect({id:'projector',handshake:{auth:{role:'projector',protocolVersion:PROTOCOL_VERSION,objectModelVersion:OBJECT_MODEL_VERSION,sessionToken:'z'.repeat(32)},headers:{cookie:''}},data:{},emit:vi.fn(),join:vi.fn(),on:vi.fn((e:string,h:Function)=>handlers.set(e,h)),disconnect:vi.fn()});
  expect(handlers.has('dm:command')).toBe(false);expect(handlers.has('player:interact')).toBe(false);
 });
 it('un cliente real del servidor solicita; DM confirma; repetir el mensaje no duplica el viaje',()=>{
  const io=new Server(),server=new GameServer(io,'dm-test',stormwreckBundle),s=server.state,p=retreatJourneyPorts[0]!,emit=vi.fn();
  vi.spyOn(io,'to').mockReturnValue({emit}as never);
  // The current DM browser has a private scene context, so state goes to its
  // connected socket rather than the old shared DM room.
  io.sockets.sockets.set('dm-test-socket',{data:{role:'dm'},emit} as never);
  const handlers=new Map<string,Function>(),token='a'.repeat(32),socket={id:'socket-mike',handshake:{auth:{role:'player',protocolVersion:PROTOCOL_VERSION,objectModelVersion:OBJECT_MODEL_VERSION,sessionToken:token},headers:{cookie:''}},data:{sceneReadyEpoch:s.sceneEpoch},emit:vi.fn(),join:vi.fn(),on:vi.fn((e:string,h:Function)=>handlers.set(e,h)),disconnect:vi.fn()};
  (server as any).connect(socket);claim(s);place(s,'mike',p.from);socket.data.sceneReadyEpoch=s.sceneEpoch;
  expect(handlers.has('dm:command')).toBe(false);
  const raw={commandId:crypto.randomUUID(),runtimeEpoch:s.runtimeEpoch,sceneEpoch:s.sceneEpoch,targetId:p.interactionTargetId};
  handlers.get('player:interact')!(raw);handlers.get('player:interact')!(raw);
  expect(s.interactions.filter(r=>r.kind==='journey'&&r.status==='pending')).toHaveLength(1);
  expect(where(s).sceneId).toBe('dragon-rest');expect(emit.mock.calls.some(([e])=>e==='dm:state')).toBe(true);
  const travel={type:'entity:portal',entityId:'mike',portId:p.id,direction:'forward',adjudicate:true};
  expect(command(server,travel).ok).toBe(true);expect(where(s).sceneId).toBe(p.to.mapId);
  expect(s.interactions.filter(r=>r.status==='pending')).toHaveLength(0);expect(command(server,travel).code).toBe('PORT_ORIGIN_MISMATCH');
 });
});
