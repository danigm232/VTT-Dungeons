import {afterEach,it,expect,vi} from 'vitest';
import {GameState} from './game';
import {oneShotBundle} from '../../campaigns/one-shot/server';
import {oneShotCampaignDefinition,d8CellToWorld} from '../../campaigns/one-shot/public/pack';
import {sameCell,cellKey} from '../shared/geometry';
import {surfaceNeighbors} from '../shared/terrain';
import type {Facing} from '../shared/protocol';
import {footprintFor} from '../shared/geometry';
afterEach(()=>vi.restoreAllMocks());
const direction=(a:{col:number;row:number},b:{col:number;row:number})=>(b.col>a.col?'east':b.col<a.col?'west':b.row>a.row?'south':'north') as Facing;
it('never assigns party arrivals to villagers or doors, and keeps the cow and both children together',()=>{
  for(const scene of oneShotCampaignDefinition.scenes){
    const occupied=new Set((scene.stageActors??[]).map(a=>cellKey(a.cell)));
    for(const spawn of scene.spawns)expect(occupied.has(cellKey(spawn))).toBe(false);
    for(const actor of scene.stageActors??[])expect(scene.walkable).toContainEqual(actor.cell);
  }
  const market=oneShotCampaignDefinition.scenes.find(s=>s.id==='market')!,actors=market.stageActors!.filter(a=>['ben-market','margaret-market','cow-market'].includes(a.id));
  expect(new Set(actors.map(a=>cellKey(a.cell))).size).toBe(3);
  const cow=d8CellToWorld('market',actors.find(a=>a.id==='cow-market')!.cell);
  for(const child of actors.filter(a=>a.id!=='cow-market')){const p=d8CellToWorld('market',child.cell);expect(Math.hypot(p.x-cow.x,p.z-cow.z)).toBeLessThanOrEqual(2.2);}
});
it('blocks movement into Fritz even outside combat',()=>{
  const state=new GameState(oneShotBundle);state.claim('a'.repeat(32),'test','maria');state.changeScene('garden');
  const npc=state.npcs.get('fritz-garden')!,p=state.characters.get('maria')!,scene=state.currentScene();
  const from=surfaceNeighbors(scene.terrain!,{cell:npc.cell,surfaceId:scene.surfaceId}).find(n=>n.cell.col===npc.cell.col||n.cell.row===npc.cell.row)!;
  expect(from).toBeDefined();p.cell={...from.cell};expect(state.startStep(p,direction(p.cell,npc.cell))).toBe(false);
});
it('continues steps on their exact clock and survives a short desktop input stall',()=>{
  const clock=vi.spyOn(Date,'now').mockReturnValue(1000),state=new GameState(oneShotBundle);state.claim('a'.repeat(32),'test','maria');state.changeScene('market');
  const p=state.characters.get('maria')!,scene=state.currentScene(),reserved=new Set(state.publicSnapshot().entities.filter(e=>e.id!==p.id).map(e=>cellKey(e.cell)));
  const origin=scene.walkable.find(c=>!reserved.has(cellKey(c))&&scene.walkable.some(b=>b.col===c.col+1&&b.row===c.row&&!reserved.has(cellKey(b)))&&scene.walkable.some(b=>b.col===c.col+2&&b.row===c.row&&!reserved.has(cellKey(b))))!;
  p.cell={...origin};p.input={held:'east',seq:1,updatedAt:1000};expect(state.startStep(p,'east',1000)).toBe(true);
  clock.mockReturnValue(1250);state.tick();expect(p.step!.startedAt).toBe(1220);
  p.input.held='west';clock.mockReturnValue(1460);state.tick();expect(p.step!.startedAt).toBe(1440);
  p.input.held=null;clock.mockReturnValue(1680);state.tick();expect(p.step).toBeNull();expect(p.moving).toBe(false);
});
it('places the reflection on the released mirror cell, not on an arbitrary side of the platform',()=>{
  const state=new GameState(oneShotBundle);state.claim('a'.repeat(32),'test','maria');state.changeScene('mirror');
  const mirror=state.interactionObject('true-love-mirror')!;state.prepareMirrorEncounter('maria');
  expect(sameCell(state.creature!.cell,mirror.cell)).toBe(true);
});
it('opens and closes every playable D8 door from an adjacent cell, with the cabin entry centered on its grid lane',()=>{
  const state=new GameState(oneShotBundle);state.claim('a'.repeat(32),'test','maria');
  for(const scene of oneShotCampaignDefinition.scenes){
    state.changeScene(scene.id);
    for(const definition of scene.props.filter(p=>p.kind==='door')){
      const door=state.interactionObject(definition.id)!,occupied=footprintFor(door.cell,door.rotation,door.baseFootprint);
      const cell=scene.walkable.find(c=>!occupied.some(x=>sameCell(x,c))&&occupied.some(x=>Math.abs(x.col-c.col)+Math.abs(x.row-c.row)===1))!;
      expect(cell).toBeDefined();state.characters.get('maria')!.cell={...cell};
      const result=state.interactNearbyDoor('maria',door.id);expect(result?.ok,`${scene.id}/${door.id}: ${result?.code}`).toBe(true);
      expect(state.interactNearbyDoor('maria',door.id)?.ok).toBe(true);
      if(scene.id==='garden')expect(d8CellToWorld('garden',door.cell).x).toBe(6);
    }
  }
});
