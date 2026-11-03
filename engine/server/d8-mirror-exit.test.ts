import {expect,it} from 'vitest';
import {GameState} from './game';
import {oneShotBundle} from '../../campaigns/one-shot/server';
const passage='galeria-espejo-cena',seal='mirror-ice-seal';
function setup(){const s=new GameState(oneShotBundle);s.claim('f'.repeat(32),'exit','maria');s.changeScene('mirror');return s;}
it('blocks movement and manual traversal while sealed; hiding a live reflection does not unlock it',()=>{
 const s=setup(),hero=s.characters.get('maria')!;hero.cell={col:5,row:1};
 expect(s.startStep(hero,'north')).toBe(false);expect(s.interactNearbyDoor('maria',seal)?.code).toBe('DOOR_LOCKED');
 s.prepareMirrorEncounter('maria');s.creature!.visible=false;s.tick();hero.cell={col:5,row:0};
 expect(s.traversePort('maria',passage,'forward')).toBe('PORT_CONDITION_BLOCKED');
 expect(s.publicSnapshot().props.find(p=>p.id===seal)!.structure).toBe('intact');
});
it('opens once after real defeat, preserves stats and story choices, and walking through reaches Anteros',()=>{
 const s=setup(),hero=s.characters.get('maria')!,other=s.characters.get('silverfarben-hotel')??s.characters.get('aoife');
 const before={hp:hero.hp,maxHp:hero.maxHp,inventory:[...hero.inventory],sheet:structuredClone(hero.sheet)},story=structuredClone(s.progress),otherScene=other?.sceneId;
 s.prepareMirrorEncounter('maria');s.applyHitPoints(s.creature!.id,-s.creature!.maxHp);
 expect(s.publicSnapshot().props.find(p=>p.id===seal)!.structure).toBe('destroyed');
 const revision=s.objectRevision;s.tick();s.tick();expect(s.objectRevision).toBe(revision);
 expect(s.progress).toEqual(story);hero.cell={col:5,row:1};expect(s.startStep(hero,'north')).toBe(true);
 hero.step!.startedAt=Date.now()-3000;s.tick();expect(hero.sceneId).toBe('mirror');expect(hero.step!.movementKind).toBe('passage');
 expect(hero.step!.passage!.points).toHaveLength(6);expect(hero.step!.passage!.points[0]!.z-hero.step!.passage!.points[5]!.z).toBe(7.5);
 expect(s.startStep(hero,'south')).toBe(false);hero.step!.startedAt=Date.now()-5100;s.tick();expect(hero.sceneId).toBe('dinner');
 expect(s.publicSnapshot().scene.stageActors?.some(a=>a.id==='anteros-dinner')).toBe(true);
 expect({hp:hero.hp,maxHp:hero.maxHp,inventory:hero.inventory,sheet:hero.sheet}).toEqual(before);
 if(other)expect(other.sceneId).toBe(otherScene);
});
it('persists the open passage, migrates older saves and does not replay defeat on reconnect',()=>{
 const s=setup();s.prepareMirrorEncounter('maria');s.applyHitPoints(s.creature!.id,-s.creature!.maxHp);
 const now=Date.now(),save=s.captureDurable(now),r=new GameState(oneShotBundle);r.restoreDurable(save,now);
 expect(r.captureDurable(now)).toEqual(save);r.changeScene('mirror');expect(r.publicSnapshot().props.find(p=>p.id===seal)!.structure).toBe('destroyed');
 const old=setup().captureDurable(now);old.scenes.find(p=>p.sceneId==='mirror')!.objects=old.scenes.find(p=>p.sceneId==='mirror')!.objects.filter(p=>p.id!==seal);
 r.restoreDurable(old,now);r.changeScene('mirror');expect(r.publicSnapshot().props.find(p=>p.id===seal)!.structure).toBe('intact');
});
it('checks the gate on automatic traversal even if an actor was already on its threshold',()=>{
 const s=setup(),hero=s.characters.get('maria')!;hero.cell={col:5,row:1};
 hero.step={from:{col:5,row:1},to:{col:5,row:0},startedAt:Date.now()-3000,durationMs:100,fromSurfaceId:'ice',toSurfaceId:'ice'} as any;
 s.tick();expect(hero.sceneId).toBe('mirror');
});
it('repairs only a pre-passage save stranded inside the new seal, retaining HP and inventory',()=>{
 const s=setup(),h=s.characters.get('maria')!;h.cell={col:5,row:0};const now=Date.now(),old=s.captureDurable(now);old.scenes.find(p=>p.sceneId==='mirror')!.objects=old.scenes.find(p=>p.sceneId==='mirror')!.objects.filter(p=>p.id!==seal);
 const r=new GameState(oneShotBundle);r.restoreDurable(old,now);const restored=r.characters.get('maria')!;expect(restored.cell).toEqual({col:5,row:1});expect(restored.hp).toBe(h.hp);expect(restored.inventory).toEqual(h.inventory);
});
it('opens a pre-passage save with an already defeated prepared reflection before its first snapshot',()=>{
 const s=setup();s.prepareMirrorEncounter('maria');s.applyHitPoints(s.creature!.id,-s.creature!.maxHp);const now=Date.now(),old=s.captureDurable(now);old.scenes.find(p=>p.sceneId==='mirror')!.objects=old.scenes.find(p=>p.sceneId==='mirror')!.objects.filter(p=>p.id!==seal);
 const r=new GameState(oneShotBundle);r.restoreDurable(old,now);expect(r.publicSnapshot().props.find(p=>p.id===seal)!.structure).toBe('destroyed');
});
it('uses the same departure for an explicit entrance and restores a mid-walk save at the safe threshold',()=>{
 const s=setup(),hero=s.characters.get('maria')!;s.prepareMirrorEncounter('maria');s.applyHitPoints(s.creature!.id,-s.creature!.maxHp);hero.cell={col:5,row:0};
 expect(s.traversePort(hero.id,passage,'forward')).toBe('MOVED');expect(hero.sceneId).toBe('mirror');expect(hero.step?.movementKind).toBe('passage');
 hero.step!.startedAt=Date.now()-2500;s.tick();expect(hero.sceneId).toBe('mirror');
 const now=Date.now(),save=s.captureDurable(now),r=new GameState(oneShotBundle);r.restoreDurable(save,now);const restored=r.characters.get(hero.id)!;
 expect(restored.cell).toEqual({col:5,row:0});expect(restored.step).toBeNull();r.tick();expect(restored.sceneId).toBe('mirror');
 expect(r.traversePort(hero.id,passage,'forward')).toBe('MOVED');expect(restored.step!.durationMs).toBe(5000);
});
