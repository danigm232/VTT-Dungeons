import {describe,it,expect,vi} from 'vitest';
import {GameServer,GameState} from './game';
import {Server} from 'socket.io';
import {compileCampaignBundle} from './campaign';
import {oneShotBundle} from '../../campaigns/one-shot/server';
import {d8CellToWorld,d8NearestWalkableCell} from '../../campaigns/one-shot/public/pack';
import {explorationActionSchema} from '../shared/protocol';
const token='a'.repeat(32);
function game(scene='cafe'){const state=new GameState(oneShotBundle);state.claim(token,'test','maria');state.changeScene(scene);return state;}
describe('D8 V52 photographed regressions',()=>{
  it('restores older cafe saves with new windows without losing inventory or DM placements',()=>{
    const state=game(),now=Date.now(),save=state.captureDurable(now);
    save.scenes.find(scene=>scene.sceneId==='cafe')!.objects=save.scenes.find(scene=>scene.sceneId==='cafe')!.objects.filter(object=>!oneShotBundle.sceneWindows!.some(window=>window.id===object.id));
    save.characters.find(character=>character.id==='maria')!.inventory.push('Recuerdo del DM');
    const butcherId=oneShotBundle.public.scenes.find(scene=>scene.id==='market')!.stageActors!.find(actor=>actor.tokenId==='boris')!.id;
    const oldNpc=save.npcs!.find(npc=>npc.id===butcherId)!;const customCell=d8NearestWalkableCell('market',0,10.5);oldNpc.cell={...customCell};save.actorLayoutVersion=2;
    const restored=new GameState(oneShotBundle);expect(restored.restoreDurable(save,now)).toBe(true);
    expect(restored.characters.get('maria')!.inventory).toContain('Recuerdo del DM');expect(restored.npcs.get(butcherId)!.cell).toEqual(customCell);
    for(const window of oneShotBundle.sceneWindows!)expect(restored.publicSnapshot().props.find(prop=>prop.id===window.id)?.structure).toBe('intact');
    restored.claim(token,'test','maria');expect(restored.playerPrivate(token).explorationBasics).toContain('hide');
  });
  it('rejects invalid window destinations and quiet DCs in campaign definitions',()=>{
    const invalid=structuredClone(oneShotBundle);invalid.sceneWindows![0]!.outside={col:-1,row:-1};expect(()=>compileCampaignBundle(invalid)).toThrow('Ventana o destinos inválidos');
    const invalidDc=structuredClone(oneShotBundle);invalidDc.proximityEncounter!.quietDc=19;expect(()=>compileCampaignBundle(invalidDc)).toThrow('CD de modo sigilo inválida');
  });
  it('accepts only the owning player physical total, without resolving the DM decision',()=>{
    const io=new Server(),server=new GameServer(io,'dm-test',oneShotBundle),state=server.state;
    state.claim(token,'test','maria');state.changeScene('cafe');const player=state.characters.get('maria')!,actor=state.currentScene().stageActors!.find(actor=>actor.id==='woman-cafe')!,point=actor.seatedAt!;
    player.cell=state.currentScene().walkable.find(cell=>{const p=d8CellToWorld('cafe',cell);return Math.hypot(p.x-point.x,p.z-point.z)<1.5;})!;state.checkSceneProximity('maria');
    const request=state.interactions.find(request=>request.kind==='proximity-check')!,emit=vi.fn(),socket={id:'test',emit};
    const send=(requestId:string)=>Reflect.get(server,'handleExplorationAction').call(server,socket,token,{runtimeEpoch:state.runtimeEpoch,sceneEpoch:state.sceneEpoch,type:'exploration:check',commandId:crypto.randomUUID(),requestId,total:21});
    send(request.id);expect(request.playerTotal).toBe(21);expect(request.status).toBe('pending');
    request.characterId='darius';request.playerTotal=undefined;send(request.id);expect(request.playerTotal).toBeUndefined();expect(emit).toHaveBeenLastCalledWith('command:result',expect.objectContaining({ok:false,code:'REQUEST_STALE'}));
  });
  it('exposes seats/signs in public geometry and enables the stealth action',()=>{
    const state=game('temple'),player=state.characters.get('maria')!,scene=state.currentScene();
    expect(state.playerPrivate(token).explorationBasics).toContain('hide');
    for(const sign of scene.readableSigns!){player.cell={...sign.cell};expect(state.playerPrivate(token).availableInteractions.some(item=>item.targetId===sign.id)).toBe(true);}
    const seat=scene.seats!.find(seat=>!seat.reservedActorId)!;player.cell={...seat.cell};expect(state.interactSeat('maria',seat.id)?.ok).toBe(true);
  });
  it('offers the agreed quiet-mode cafe DC without changing a check already requested',()=>{
    const state=game(),player=state.characters.get('maria')!;
    expect(state.declareExplorationBasicAction('maria','hide').ok).toBe(true);
    const actor=state.currentScene().stageActors!.find(actor=>actor.id==='woman-cafe')!,point=actor.seatedAt!;
    player.cell=state.currentScene().walkable.find(cell=>{const p=d8CellToWorld('cafe',cell);return Math.hypot(p.x-point.x,p.z-point.z)<1.5;})!;state.checkSceneProximity('maria');
    const request=state.interactions.find(request=>request.kind==='proximity-check')!;expect(request.dc).toBe(16);expect(state.resolveSceneCheck(request.id,16)).toBe('CHECK_PASSED');
    expect(explorationActionSchema.safeParse({type:'exploration:check',commandId:crypto.randomUUID(),sceneEpoch:state.sceneEpoch,requestId:crypto.randomUUID(),total:23}).success).toBe(true);
  });
  it('prayer waits for the DM, grants only one-use inspiration, survives restore and expires after 24 game hours',()=>{
    const state=game('temple'),player=state.characters.get('maria')!;player.cell={...oneShotBundle.prayerShrine!.cell};
    expect(state.prayAtShrine('maria')).toBe('PRAYER_REQUESTED');expect(state.blessingFor('maria')).toBeUndefined();
    const request=state.interactions.find(request=>request.kind==='prayer')!;expect(state.resolveSceneCheck(request.id,1)).toBe('BLESSING_GRANTED');
    const blessing=state.blessingFor('maria')!;expect(blessing.expiresGameSeconds-state.gameClockSnapshot().seconds).toBeCloseTo(86400,0);
    const now=Date.now(),save=state.captureDurable(now),restored=new GameState(oneShotBundle);restored.restoreDurable(save,now);expect(restored.blessingFor('maria')?.label).toBe(blessing.label);
    save.gameClock!.seconds=blessing.expiresGameSeconds+1;const expired=new GameState(oneShotBundle);expired.restoreDurable(save,now);expect(expired.blessingFor('maria')).toBeUndefined();
  });
  it('every cafe window can be broken and keeps authoritative state through a save',()=>{
    expect(oneShotBundle.sceneWindows).toHaveLength(7);
    for(const window of oneShotBundle.sceneWindows!){
      const state=game(),player=state.characters.get('maria')!;player.cell={...window.outside};
      expect(state.breakSceneWindow('maria',window.id)).toBe('WINDOW_BROKEN');expect(state.breakSceneWindow('maria',window.id)).toBe('ALREADY_BROKEN');
      const now=Date.now(),save=state.captureDurable(now),restored=new GameState(oneShotBundle);restored.restoreDurable(save,now);
      expect(restored.publicSnapshot().props.find(prop=>prop.id===window.id)!.structure).toBe('destroyed');expect(restored.storyNotes['cafe.window-focus']).toBe(window.id);
    }
  });
  it('closed windows reject a vault; a broken one permits a real animated crossing',()=>{
    const state=game(),window=oneShotBundle.sceneWindows!.find(window=>window.id==='cafe-window-front-1')!,player=state.characters.get('maria')!;
    player.cell={...window.outside};expect(state.jumpThroughSceneWindow('maria',window.id)).toBe('WINDOW_CLOSED');state.breakSceneWindow('maria',window.id);
    expect(state.jumpThroughSceneWindow('maria',window.id)).toBe('JUMP_COMPLETED');expect(player.cell).toEqual(window.inside);expect(player.step?.movementKind).toBe('jump');
  });
  it('an attack declaration makes the horse flee without enabling a hostile combatant',()=>{
    const state=game(),horse=state.npcs.get('horse-cafe')!,player=state.characters.get('maria')!;player.cell={col:horse.cell.col-1,row:horse.cell.row};
    expect(state.startCombatFromAttack('maria','horse-cafe',player.combat.attacks.find(action=>action.range?.kind==='melee')!.id)).toMatchObject({ok:true,code:'ANIMAL_FLED'});expect(horse.combatEnabled).toBe(false);expect(state.combat.active).toBe(false);
    let now=Date.now();const clock=vi.spyOn(Date,'now').mockImplementation(()=>now);try{for(let i=0;i<160;i++){now+=400;state.tick();}expect(horse.cell).toEqual(oneShotBundle.animalFleeDestination);}finally{clock.mockRestore();}
  });
  it('all three clients reach distinct viewing positions at every broken window',()=>{
    for(const window of oneShotBundle.sceneWindows!){
      expect(new Set(window.destinations.map(cell=>`${cell.col},${cell.row}`)).size).toBe(3);
      const state=game();state.characters.get('maria')!.cell={...window.outside};state.breakSceneWindow('maria',window.id);
      let now=Date.now();const clock=vi.spyOn(Date,'now').mockImplementation(()=>now);try{for(let i=0;i<220&&state.storyNotes['cafe.window-phase']!=='watching';i++){now+=400;state.tick();}for(const [i,id] of oneShotBundle.proximityEncounter!.actorIds.entries())expect(state.npcs.get(id)!.cell,`${window.id} / ${id}`).toEqual(window.destinations[i]);}finally{clock.mockRestore();}
    }
  });
  it('does not freeze an already fleeing horse if combat starts while it is escaping',()=>{
    const state=game(),horse=state.npcs.get('horse-cafe')!;state.fleeSceneAnimal();state.combat.active=true;
    let now=Date.now();const clock=vi.spyOn(Date,'now').mockImplementation(()=>now);try{for(let i=0;i<160;i++){now+=400;state.tick();}expect(horse.cell).toEqual(oneShotBundle.animalFleeDestination);expect(horse.combatEnabled).toBe(false);}finally{clock.mockRestore();}
  });
  it('moves a legal standing jump, but explains the halfling run-up requirement',()=>{
    const state=game('market'),player=state.characters.get('maria')!;player.cell=d8NearestWalkableCell('market',0,10.5);
    const target={col:player.cell.col,row:player.cell.row-1};expect(state.declareExplorationBasicAction('maria','jump',undefined,target,'standing')).toMatchObject({ok:false,code:'JUMP_NEEDS_RUN_UP'});
    player.sheet!.strengthScore=10;expect(state.declareExplorationBasicAction('maria','jump',undefined,target).ok).toBe(true);expect(player.cell).toEqual(target);expect(player.step?.movementKind).toBe('jump');
  });
});
