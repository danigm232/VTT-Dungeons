import { describe,it,expect } from 'vitest';
import { GameState } from './game';
import { oneShotBundle,d8VillageRoads } from '../../campaigns/one-shot/server';
import { d8CellToWorld,oneShotCampaignDefinition } from '../../campaigns/one-shot/public/pack';
import { D8NIGHT } from '../../campaigns/one-shot/playground/d8night.config';
import { surfaceNeighbors } from '../shared/terrain';
import { footprintFor,sameCell } from '../shared/geometry';
import { STEP_DURATION_MS,type Facing } from '../shared/protocol';

const setup=()=>{const state=new GameState(oneShotBundle);state.claim('a'.repeat(32),'maria-socket','maria');state.changeScene('cafe');return state;};
describe('V48 player seating, doors and extended roads',()=>{
  it('keeps every old cell at the same world position while adding six real road rows',()=>{
    for(const scene of oneShotCampaignDefinition.scenes){const size=D8NIGHT.maps[scene.id].MAP.size;
      expect(d8CellToWorld(scene.id as any,{col:2,row:3})).toEqual({x:-size[0]/2+3.75,z:-size[1]/2+5.25});
      expect(scene.grid.rows).toBe(size[1]/1.5+(['temple','cafe','market'].includes(scene.id)?6:0));
    }
    for(const port of d8VillageRoads)for(const endpoint of [port.from,port.to])expect(d8CellToWorld(endpoint.mapId as any,endpoint.cell).z).toBeGreaterThan(D8NIGHT.maps[endpoint.mapId].MAP.size[1]/2);
  });
  it('opens and closes the full entrance from either jamb, never over a character',()=>{
    const state=setup(),scene=state.currentScene(),door=state.interactionObject('cafe-entry-door')!,maria=state.characters.get('maria')!;
    const cells=footprintFor(door.cell,door.rotation,door.baseFootprint);
    expect(cells.every(cell=>scene.walkable.some(other=>sameCell(other,cell))&&!scene.spawns.some(other=>sameCell(other,cell)))).toBe(true);
    maria.cell={col:cells[0]!.col,row:cells[0]!.row+1};
    expect(state.interactNearbyDoor('maria',door.id)).toEqual({ok:true,code:'DOOR_CLOSED'});
    expect(state.startStep(maria,'north')).toBe(false);
    expect(state.interactNearbyDoor('maria',door.id)).toEqual({ok:true,code:'DOOR_OPENED'});
    maria.cell={...cells[0]!};expect(state.interactNearbyDoor('maria',door.id)?.ok).toBe(false);
    const restored=new GameState(oneShotBundle);expect(()=>restored.restoreDurable(state.captureDurable())).not.toThrow();
  });
  it('publishes a real seated pose, saves it and stands when walking',()=>{
    const state=setup(),maria=state.characters.get('maria')!,seat=state.currentScene().seats!.find(s=>!s.reservedActorId)!;
    maria.cell={...seat.cell};expect(state.interactSeat('maria',seat.id)).toEqual({ok:true,code:'SEAT_TAKEN'});
    expect(state.publicSnapshot().entities.find(e=>e.id==='maria')!.seatId).toBe(seat.id);
    expect(state.playerPrivate('a'.repeat(32)).availableInteractions).toContainEqual({targetId:seat.id,label:`Levantarte · ${seat.label}`});
    const save=state.captureDurable(),restored=new GameState(oneShotBundle);restored.restoreDurable(save);expect(restored.seatFor('maria')!.id).toBe(seat.id);
    const next=surfaceNeighbors(state.currentScene().terrain!,{surfaceId:maria.surfaceId,cell:maria.cell})[0]!;
    const dx=next.cell.col-maria.cell.col,dy=next.cell.row-maria.cell.row,h=dx>0?'east':dx<0?'west':'',v=dy>0?'south':dy<0?'north':'';
    expect(state.startStep(maria,(h&&v?`${v}-${h}`:h||v) as Facing)).toBe(true);expect(state.seatFor('maria')).toBeNull();
    maria.step!.startedAt=Date.now()-STEP_DURATION_MS-1;state.tick();expect(state.publicSnapshot().entities.find(e=>e.id==='maria')!.seatId).toBeUndefined();
  });
  it('rejects occupied seats and inaccessible remote seating, and supports explicitly standing',()=>{
    const state=setup(),maria=state.characters.get('maria')!,seat=state.currentScene().seats!.find(s=>!s.reservedActorId)!;
    expect(state.interactSeat('maria',seat.id)?.ok).toBe(false);
    maria.cell={...seat.cell};state.interactSeat('maria',seat.id);
    state.claim('b'.repeat(32),'silver-socket','aoife');const silver=state.characters.get('aoife')!;silver.cell={...seat.cell};
    expect(state.interactSeat('aoife',seat.id)).toEqual({ok:false,code:'SEAT_OCCUPIED'});
    expect(state.interactSeat('maria',seat.id)).toEqual({ok:true,code:'SEAT_LEFT'});
    const reserved=state.currentScene().seats!.find(s=>s.reservedActorId)!;maria.cell={...reserved.cell};
    expect(state.interactSeat('maria',reserved.id)).toEqual({ok:false,code:'SEAT_OCCUPIED'});
  });
  it('does not leave seating flags behind after a DM move or scene jump',()=>{
    const state=setup(),maria=state.characters.get('maria')!,seat=state.currentScene().seats!.find(s=>!s.reservedActorId)!;
    maria.cell={...seat.cell};state.interactSeat('maria',seat.id);
    const next=surfaceNeighbors(state.currentScene().terrain!,{surfaceId:maria.surfaceId,cell:maria.cell})[0]!;
    expect(state.moveEntityOneSquare('maria',next.cell)).toBe('MOVED');expect(state.seatFor('maria')).toBeNull();
    maria.step=null;maria.moving=false;maria.cell={...seat.cell};state.interactSeat('maria',seat.id);state.changeScene('dinner');
    expect(Object.keys(state.progress).some(key=>key.startsWith('seat.maria.'))).toBe(false);
  });
  it('allows an adjacent legal approach and stands everyone when combat starts',()=>{
    const state=setup(),maria=state.characters.get('maria')!,seat=state.currentScene().seats!.find(s=>!s.reservedActorId)!;
    const next=surfaceNeighbors(state.currentScene().terrain!,{surfaceId:seat.surfaceId,cell:seat.cell})[0]!;
    maria.cell={...next.cell};expect(state.interactSeat('maria',seat.id)).toEqual({ok:true,code:'SEAT_TAKEN'});
    state.claim('b'.repeat(32),'silver-socket','aoife');
    expect(state.startCombat()).toBe(true);expect(state.seatFor('maria')).toBeNull();
    expect(Object.keys(state.progress).some(key=>key.startsWith('seat.maria.'))).toBe(false);
  });
  it('does not stretch historical saves into the new road extensions',()=>{
    const state=setup(),payload=state.captureDurable(),scene=state.currentScene(),baseRows=D8NIGHT.maps.cafe.MAP.size[1]/1.5;
    payload.d8GridVersion=1;
    const saved=payload.characters.find(c=>c.id==='maria')!;saved.cell={col:16,row:16};
    const intended={col:Math.floor(16.5*scene.grid.cols/32),row:Math.floor(16.5*baseRows/21)};
    const expected=[...scene.walkable].sort((a,b)=>Math.abs(a.col-intended.col)+Math.abs(a.row-intended.row)-Math.abs(b.col-intended.col)-Math.abs(b.row-intended.row)||a.row-b.row||a.col-b.col)[0]!;
    const restored=new GameState(oneShotBundle);restored.restoreDurable(payload);
    expect(restored.characters.get('maria')!.cell).toEqual(expected);
  });
});
