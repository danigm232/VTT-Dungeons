import { describe,it,expect,vi } from 'vitest';
import { GameState } from './game';
import { oneShotBundle } from '../../campaigns/one-shot/server';
import { d8CellToWorld, d8NearestWalkableCell } from '../../campaigns/one-shot/public/pack';
import { D8NIGHT } from '../../campaigns/one-shot/playground/d8night.config';
import { sameCell } from '../shared/geometry';

function cafe(){const state=new GameState(oneShotBundle);state.claim('a'.repeat(32),'test','maria');state.changeScene('cafe');return state;}
function approach(state:GameState,id:string){
  const actor=state.currentScene().stageActors!.find(actor=>actor.id===id)!,point=actor.seatedAt!;
  const cell=state.currentScene().walkable.find(cell=>{const p=d8CellToWorld('cafe',cell);return !sameCell(cell,actor.cell)&&Math.hypot(p.x-point.x,p.z-point.z)<1.5;})!;
  expect(cell).toBeDefined();state.characters.get('maria')!.cell=cell;state.checkSceneProximity('maria');
  return state.interactions.find(request=>request.status==='pending'&&request.targetId===id)!;
}
describe('D8 cafe and seating corrections',()=>{
  it('all chairs face their nearest table and each scene keeps distinct actor cells',()=>{
    for(const [id,config] of Object.entries(D8NIGHT.maps)){
      const tables=config.MAP.objects.filter((o:any)=>['table_round','long_table'].includes(o.asset));
      for(const chair of config.MAP.objects.filter((o:any)=>o.asset==='chair')){
        const table=[...tables].sort((a:any,b:any)=>Math.hypot(a.position[0]-chair.position[0],a.position[1]-chair.position[1])-Math.hypot(b.position[0]-chair.position[0],b.position[1]-chair.position[1]))[0];
        const dx=table!.position[0]-chair.position[0],dz=table!.position[1]-chair.position[1],length=Math.hypot(dx,dz);
        expect((Math.sin(chair.rotation)*dx+Math.cos(chair.rotation)*dz)/length).toBeCloseTo(1,5);
      }
      const actors=oneShotBundle.public.scenes.find(scene=>scene.id===id)!.stageActors??[];
      expect(new Set(actors.map(actor=>`${actor.cell.col},${actor.cell.row}`)).size).toBe(actors.length);
    }
  });
  it('wine is collected once, enters the inventory and survives restore',()=>{
    const state=cafe(),pickup=state.currentScene().pickups![0]!;state.characters.get('maria')!.cell={...pickup.cell};
    expect(state.takePickup('maria',pickup.id)).toBe('PICKUP_TAKEN');
    expect(state.takePickup('maria',pickup.id)).toBe('ALREADY_TAKEN');
    const now=Date.now(),save=state.captureDurable(now),restored=new GameState(oneShotBundle);restored.restoreDurable(save,now);
    expect(restored.characters.get('maria')!.inventory).toContain('Vino del Café');
    expect(restored.progress['pickup.cafe-wine-bottle']).toBe(true);
  });
  it('allows the player to sit in every unreserved temple and dinner chair',()=>{
    for(const id of ['temple','dinner']){
      const state=cafe();state.changeScene(id);
      const player=state.characters.get('maria')!,seats=state.currentScene().seats!.filter(seat=>!seat.reservedActorId);
      expect(seats.length).toBeGreaterThan(0);
      for(const seat of seats){
        player.cell={...seat.cell};player.surfaceId=seat.surfaceId;
        expect(state.interactSeat('maria',seat.id)).toEqual({ok:true,code:'SEAT_TAKEN'});
        expect(state.seatFor('maria')!.id).toBe(seat.id);
        expect(state.interactSeat('maria',seat.id)).toEqual({ok:true,code:'SEAT_LEFT'});
      }
    }
  });
  it('migrates only old authored NPC positions, preserves moved actors, and adds the horse to old saves',()=>{
    const state=new GameState(oneShotBundle),now=Date.now(),save=state.captureDurable(now);
    const fritzOld=d8NearestWalkableCell('garden',8.25,1.5),cow=save.npcs!.find(npc=>npc.id==='cow-market')!,fritz=save.npcs!.find(npc=>npc.id==='fritz-garden')!;
    fritz.cell={...fritzOld};cow.hp=4;cow.visible=false;
    const moved=save.npcs!.find(npc=>npc.id==='woman-cafe')!;moved.cell=d8NearestWalkableCell('cafe',-9,8);
    save.npcs=save.npcs!.filter(npc=>npc.id!=='horse-cafe');delete save.actorLayoutVersion;
    const restored=new GameState(oneShotBundle);restored.restoreDurable(save,now);
    expect(restored.npcs.get('fritz-garden')!.cell).toEqual(oneShotBundle.public.scenes.find(scene=>scene.id==='garden')!.stageActors!.find(actor=>actor.id==='fritz-garden')!.cell);
    expect(restored.npcs.get('cow-market')).toMatchObject({hp:4,visible:false});
    expect(restored.npcs.get('woman-cafe')!.cell).toEqual(moved.cell);
    expect(restored.npcs.get('horse-cafe')!.cell).toEqual(oneShotBundle.public.scenes.find(scene=>scene.id==='cafe')!.stageActors!.find(actor=>actor.id==='horse-cafe')!.cell);
  });
  it('requests physical stealth rolls, waits for the DM, and passes on 18',()=>{
    const state=cafe(),request=approach(state,'woman-cafe');expect(request.dc).toBe(18);
    expect(state.combat.active).toBe(false);expect(state.startStep(state.characters.get('maria')!,'south')).toBe(false);
    expect(state.resolveSceneCheck(request.id,18)).toBe('CHECK_PASSED');
    expect(state.combat.active).toBe(false);
  });
  it('keeps the drinking horse at the trough rim and migrates only its old default placement',()=>{
    const initial=cafe(),horse=initial.npcs.get('horse-cafe')!,point=d8CellToWorld('cafe',horse.cell);
    expect(Math.abs(point.x-5.6)).toBeLessThan(.8);expect(point.z-10).toBeGreaterThan(.8);expect(point.z-10).toBeLessThan(1.6);
    for(const customized of [false,true]){
      const now=Date.now(),save=initial.captureDurable(now),saved=save.npcs!.find(actor=>actor.id==='horse-cafe')!;
      saved.cell=customized?d8NearestWalkableCell('cafe',-9,8):d8NearestWalkableCell('cafe',5.6,12.4);saved.hp=7;save.actorLayoutVersion=1;
      const restored=new GameState(oneShotBundle);restored.restoreDurable(save,now);
      expect(restored.npcs.get('horse-cafe')!.cell).toEqual(customized?saved.cell:horse.cell);expect(restored.npcs.get('horse-cafe')!.hp).toBe(7);
    }
  });
  it('two distinct disturbed clients alert every visible client and open physical initiative',()=>{
    const state=cafe(),first=approach(state,'woman-cafe');expect(state.resolveSceneCheck(first.id,17)).toBe('CLIENT_DISTURBED');expect(state.combat.active).toBe(false);
    const second=approach(state,'patron-cafe');expect(state.resolveSceneCheck(second.id,12)).toBe('ENCOUNTER_ALERTED');
    expect(state.combat.active).toBe(true);expect(state.combat.initiativePending).toBe(true);
    for(const id of oneShotBundle.proximityEncounter!.actorIds)expect(state.combat.participantIds).toContain(id);
    expect(state.combat.participantIds).not.toContain('horse-cafe');
  });
  it('scaring the horse opens the door and clients walk to distinct exterior destinations',()=>{
    const state=cafe(),rule=oneShotBundle.proximityEncounter!,horse=state.npcs.get('horse-cafe')!;
    state.characters.get('maria')!.cell={col:horse.cell.col-1,row:horse.cell.row};
    expect(state.scareSceneAnimal('maria')).toBe('ANIMAL_STARTLED');
    expect(state.publicSnapshot().props.find(prop=>prop.id==='cafe-entry-door')!.state).toBe('open');
    let now=Date.now();const clock=vi.spyOn(Date,'now').mockImplementation(()=>now);
    try{
      for(let step=0;step<150;step++){now+=400;state.tick();}
      for(const [i,id] of rule.actorIds.entries())expect(state.npcs.get(id)!.cell).toEqual(rule.distraction!.destinations[i]);
      expect(state.combat.active).toBe(false);
    }finally{clock.mockRestore();}
  });
});
