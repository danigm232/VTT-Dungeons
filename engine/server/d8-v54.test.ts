import {describe,it,expect,vi} from 'vitest';
import {Server} from 'socket.io';
import {GameServer,GameState} from './game';
import {oneShotBundle} from '../../campaigns/one-shot/server';
import {sameCell} from '../shared/geometry';
const token='b'.repeat(32);
function game(scene='cafe'){const state=new GameState(oneShotBundle);state.claim(token,'test','maria');state.changeScene(scene);return state;}

describe('D8 V54 photographed follow-ups',()=>{
  it('returns all patrons to their original seats after watching every broken window',()=>{
    for(const window of oneShotBundle.sceneWindows!){
      const state=game();state.characters.get('maria')!.cell={...window.outside};
      const homes=oneShotBundle.proximityEncounter!.actorIds.map(id=>({...state.npcs.get(id)!.cell}));state.breakSceneWindow('maria',window.id);
      let now=Date.now();const clock=vi.spyOn(Date,'now').mockImplementation(()=>now);
      try{
        for(let i=0;i<200&&state.storyNotes['cafe.window-phase']!=='watching';i++){now+=400;state.tick();}
        expect(state.storyNotes['cafe.window-phase'],window.id).toBe('watching');
        const saved=state.captureDurable(now),restored=new GameState(oneShotBundle);restored.restoreDurable(saved,now);
        for(let i=0;i<220&&restored.storyNotes['cafe.window-focus'];i++){now+=400;restored.tick();}
        expect(restored.progress['distraction.cafe-stealth']).toBe(false);expect(restored.storyNotes['cafe.window-focus']).toBeUndefined();
        for(const [index,id] of oneShotBundle.proximityEncounter!.actorIds.entries())expect(restored.npcs.get(id)!.cell,`${window.id}/${id}`).toEqual(homes[index]);
      }finally{clock.mockRestore();}
    }
  });
  it('preserves a DM-custom home position when a patron returns',()=>{
    const state=game(),window=oneShotBundle.sceneWindows![0]!,npc=state.npcs.get('patron-cafe')!;
    const authored=oneShotBundle.public.scenes.find(scene=>scene.id==='cafe')!.stageActors!.find(actor=>actor.id==='bartender-cafe')!.cell;
    const custom=state.currentScene().walkable.find(cell=>Math.abs(cell.col-authored.col)<=1&&Math.abs(cell.row-authored.row)<=1&&!state.publicSnapshot().entities.some(actor=>sameCell(actor.cell,cell))&&!state.publicSnapshot().props.some(prop=>sameCell(prop.cell,cell)))!;
    npc.cell={...custom};npc.facing='south-west';state.characters.get('maria')!.cell={...window.outside};state.breakSceneWindow('maria',window.id);
    expect(JSON.parse(state.storyNotes['cafe.window-homes']!)['patron-cafe'].cell).toEqual(custom);
    let now=Date.now();const clock=vi.spyOn(Date,'now').mockImplementation(()=>now);
    try{
      for(let i=0;i<450&&state.storyNotes['cafe.window-focus'];i++){now+=400;state.tick();}
      expect(state.storyNotes['cafe.window-focus']).toBeUndefined();expect(npc.cell).toEqual(custom);expect(npc.facing).toBe('south-west');
    }finally{clock.mockRestore();}
  });
  it('falls back to authored seats for malformed saved window-home notes',()=>{
    const state=game(),homes=Reflect.get(state,'cafeWindowHomes').bind(state),scene=state.currentScene();
    for(const note of ['null','[]','invalid','{"patron-cafe":{"cell":{"col":"bad","row":1},"facing":"up"}}']){
      state.storyNotes['cafe.window-homes']=note;
      for(const id of oneShotBundle.proximityEncounter!.actorIds){const actor=scene.stageActors!.find(actor=>actor.id===id)!;expect(homes()[id]).toEqual({cell:actor.cell,facing:actor.facing??'north'});}
    }
  });
  it('blocks every native cafe door crossing, including diagonal edges, until the door opens',()=>{
    const state=game(),barrier=oneShotBundle.movementDoorEdges!.find(door=>door.propId==='cafe-entry-door')!,scene=state.currentScene();
    expect(barrier.edges.length).toBeGreaterThan(0);expect(barrier.edges.some(edge=>edge.from.col!==edge.to.col&&edge.from.row!==edge.to.row)).toBe(true);
    const destination=Reflect.get(state,'terrainStepDestination').bind(state);
    for(const edge of barrier.edges){expect(destination(scene,scene.surfaceId,edge.from,edge.to)).toBeNull();expect(destination(scene,scene.surfaceId,edge.to,edge.from)).toBeNull();}
    const prop=Reflect.get(state,'objectsFor').call(state,'cafe').find((prop:any)=>prop.id===barrier.propId);prop.state='open';
    expect(barrier.edges.some(edge=>destination(scene,scene.surfaceId,edge.from,edge.to))).toBe(true);
  });
  it('emits inspiration stars only on a DM-approved reward',()=>{
    const io=new Server(),server=new GameServer(io,'dm-test',oneShotBundle),state=server.state,emit=vi.spyOn(io,'emit');
    state.claim(token,'test','maria');state.changeScene('temple');state.characters.get('maria')!.cell={...oneShotBundle.prayerShrine!.cell};state.prayAtShrine('maria');
    const request=state.interactions.find(request=>request.kind==='prayer')!;
    server.applyDmCommand({type:'scene:resolveCheck',requestId:request.id,total:1,sceneEpoch:state.sceneEpoch,commandId:crypto.randomUUID()});
    expect(emit).toHaveBeenCalledWith('scene:reward',expect.objectContaining({entityId:'maria',effect:'inspiration',sceneEpoch:state.sceneEpoch}));
    emit.mockClear();server.applyDmCommand({type:'scene:resolveCheck',requestId:request.id,total:1,sceneEpoch:state.sceneEpoch,commandId:crypto.randomUUID()});expect(emit).not.toHaveBeenCalledWith('scene:reward',expect.anything());
  });
  it('does not award stars when a prayer is denied or cancelled',()=>{
    for(const total of [0,-1,null]){
      const io=new Server(),server=new GameServer(io,'dm-test',oneShotBundle),state=server.state,emit=vi.spyOn(io,'emit');
      state.claim(token,'test','maria');state.changeScene('temple');state.characters.get('maria')!.cell={...oneShotBundle.prayerShrine!.cell};state.prayAtShrine('maria');
      const request=state.interactions.find(request=>request.kind==='prayer')!;
      server.applyDmCommand({type:'scene:resolveCheck',requestId:request.id,total,sceneEpoch:state.sceneEpoch,commandId:crypto.randomUUID()});
      expect(emit).not.toHaveBeenCalledWith('scene:reward',expect.anything());expect(state.progress['prayer.maria.inspiration']).not.toBe(true);
    }
  });
});
