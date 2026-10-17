import { describe,it,expect } from 'vitest';
import { GameState } from './game';
import { oneShotBundle } from '../../campaigns/one-shot/server';
import { d8CellFromWorld,d8CellToWorld } from '../../campaigns/one-shot/public/pack';
import { containsSpatialPoint } from '../shared/spatial-navigation';
import { D8NIGHT } from '../../campaigns/one-shot/playground/d8night.config';
import { dmCommandSchema } from '../shared/protocol';
describe('D8 map corrections',()=>{
  it('thin blue ice kills on both physical player movement and DM movement, then restores exactly',()=>{
    for(const controller of ['player','dm']){
      const state=new GameState(oneShotBundle);state.claim('a'.repeat(32),'test-socket','maria');state.changeScene('mirror');
      const scene=state.currentScene(),hazard=scene.movementHazards![0]!;
      const allowed=new Set(scene.walkable.map(c=>`${c.col},${c.row}`));
      const target=hazard.cells.find(c=>allowed.has(`${c.col-1},${c.row}`)&&!hazard.cells.some(h=>h.col===c.col-1&&h.row===c.row))!;
      expect(target).toBeDefined();const maria=state.characters.get('maria')!;maria.cell={col:target.col-1,row:target.row};
      state.concentration.maria={actionId:'test-light',label:'Luz'};
      if(controller==='dm')expect(state.moveEntityOneSquare('maria',target)).toBe('MOVED');else expect(state.startStep(maria,'east')).toBe(true);
      expect(maria.hp).toBe(0);expect(maria.deathSaves.failures).toBe(3);expect(maria.input.held).toBeNull();
      expect(state.conditionsFor('maria')).toContain('inconsciente');
      expect(state.concentration.maria).toBeUndefined();
      const now=Date.now(),save=state.captureDurable(now),restored=new GameState(oneShotBundle);restored.restoreDurable(save,now);
      expect(restored.captureDurable(now)).toEqual(save);expect(restored.startStep(restored.characters.get('maria')!,'east')).toBe(false);
      expect(restored.moveEntityOneSquare('maria',{col:target.col-1,row:target.row})).toBe('MOVED');
      expect(restored.characters.get('maria')!.hp).toBe(0);
      expect(restored.startStep(restored.characters.get('maria')!,'east')).toBe(false);
      const rescued=restored.characters.get('maria')!;
      rescued.step!.startedAt=Date.now()-2000;restored.tick();
      expect(restored.applyHitPoints('maria',1)).toBe(true);
      expect(restored.conditionsFor('maria')).not.toContain('inconsciente');
      const safe=[['north',0,-1],['east',1,0],['south',0,1],['west',-1,0]] as const;
      const moved=safe.some(([facing,dx,dz])=>{
        const destination={col:rescued.cell.col+dx,row:rescued.cell.row+dz};
        return scene.walkable.some(cell=>cell.col===destination.col&&cell.row===destination.row)&&!hazard.cells.some(cell=>cell.col===destination.col&&cell.row===destination.row)&&restored.startStep(rescued,facing);
      });
      expect(moved).toBe(true);
    }
  });
  it('white snowy ice is difficult and blue hazards follow the actual authored outlines',()=>{
    const state=new GameState(oneShotBundle);state.changeScene('mirror');const scene=state.currentScene();
    for(const cell of scene.walkable){const p=d8CellToWorld('mirror',cell),blue=D8NIGHT.maps.mirror.MAP.navigation.zones.some((z:any)=>z.type==='hazard'&&containsSpatialPoint(z,p.x,p.z));
      expect(scene.movementHazards![0]!.cells.some(c=>c.col===cell.col&&c.row===cell.row)).toBe(blue);
    }
    const white=d8CellFromWorld('mirror',-1,-6);expect(scene.difficultCells).toContainEqual(white);
  });
  it('preserves all weather fields and audio with a strict save and supports every requested setting',()=>{
    const state=new GameState(oneShotBundle);
    for(const timeOfDay of ['day','night','sunset','dawn'] as const)for(const precipitation of ['rain','snow'] as const)for(const precipitationLevel of [1,2,3] as const){
      expect(dmCommandSchema.safeParse({type:'environment',sceneEpoch:state.sceneEpoch,commandId:crypto.randomUUID(),storm:false,timeOfDay,precipitation,precipitationLevel,windIntensity:.65}).success).toBe(true);
      state.environment={storm:false,lightning:false,stormIntensity:.5,timeOfDay,precipitation,precipitationLevel,windIntensity:.65};state.applyWeatherAudio();
      expect(state.audio.layers.storm.playing).toBe(true);
      expect(state.audio.layers.storm.assetId).toBe(precipitation==='rain'?'d8-night-loop-rain-drizzle':'d8-night-loop-mirror-icy-wind');
      expect(state.audio.layers.wind.playing).toBe(true);
      const now=Date.now(),save=state.captureDurable(now),restored=new GameState(oneShotBundle);restored.restoreDurable(save,now);expect(restored.captureDurable(now)).toEqual(save);
      state.changeScene('cafe');expect(state.audio.layers.storm.playing).toBe(true);
      expect(state.audio.layers.storm.assetId).toBe(precipitation==='rain'?'d8-night-loop-rain-drizzle':'d8-night-loop-mirror-icy-wind');
    }
  });
  it('prepares a blocked reflection on a free nonfatal tile and transforms the sole mirror',()=>{
    const state=new GameState(oneShotBundle);state.claim('a'.repeat(32),'test-socket','maria');state.changeScene('mirror');
    state.creature!.cell={...state.characters.get('maria')!.cell};state.prepareMirrorEncounter('maria');
    expect(state.creature!.cell).not.toEqual(state.characters.get('maria')!.cell);
    expect(state.currentScene().movementHazards![0]!.cells).not.toContainEqual(state.creature!.cell);
    expect(state.publicSnapshot().props.find(p=>p.id==='true-love-mirror')!.structure).toBe('destroyed');
    const now=Date.now(),save=state.captureDurable(now),restored=new GameState(oneShotBundle);restored.restoreDurable(save,now);expect(restored.captureDurable(now)).toEqual(save);
  });
  it('retains thunder instead of silently replacing a storm with plain rain',()=>{
    const state=new GameState(oneShotBundle);
    state.environment={storm:true,lightning:true,stormIntensity:.7,timeOfDay:'night',precipitation:'rain',precipitationLevel:3};
    state.applyWeatherAudio();expect(state.audio.layers.storm.assetId).toBe('d8-night-loop-storm');expect(state.audio.layers.storm.volume).toBe(.68);
    state.changeScene('market');expect(state.audio.layers.storm.assetId).toBe('d8-night-loop-storm');expect(state.audio.layers.storm.playing).toBe(true);
  });
  it('clears partial road approaches on a DM scene jump, not when restoring a save',()=>{
    const state=new GameState(oneShotBundle);state.progress['road.maria.d8-road-cafe-market.1']=true;
    const now=Date.now(),save=state.captureDurable(now),restored=new GameState(oneShotBundle);restored.restoreDurable(save,now);
    expect(restored.progress['road.maria.d8-road-cafe-market.1']).toBe(true);
    state.changeScene('cafe');expect(state.progress['road.maria.d8-road-cafe-market.1']).toBeUndefined();
  });
});
