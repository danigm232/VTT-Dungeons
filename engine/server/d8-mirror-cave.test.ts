import {expect,it} from 'vitest';
import {oneShotBundle} from '../../campaigns/one-shot/server';
import {d8CellToWorld,d8SceneGrid} from '../../campaigns/one-shot/public/pack';
import {mirrorDistanceToWall} from '../../campaigns/one-shot/playground/mirror-cave-layout';
import {GameState} from './game';
import {connectedSpatialCells} from '../shared/spatial-navigation';

it('extends the cave without shifting old cells, hazards, the mirror or saved characters',()=>{
 const state=new GameState(oneShotBundle);state.claim('c'.repeat(32),'cave','maria');state.changeScene('mirror');
 const scene=state.currentScene(),keys=new Set(scene.walkable.map(c=>`${c.col},${c.row}`));
 expect(d8SceneGrid('mirror').worldOrigin).toEqual({x:-15,z:-9.75});
 expect(scene.walkable.length).toBeGreaterThan(260);
 for(let row=0;row<13;row++)for(let col=0;col<20;col++){
  expect(keys.has(`${col},${row}`)).toBe(true);
  expect(d8CellToWorld('mirror',{col,row})).toEqual({x:-15+(col+.5)*1.5,z:-9.75+(row+.5)*1.5});
 }
 expect(scene.movementHazards![0]!.cells).toHaveLength(49);
 expect(scene.props.find(p=>p.id==='true-love-mirror')!.cell).toEqual({col:3,row:4});
 const reached=connectedSpatialCells(scene.terrain!,scene.spawns[0]!);expect(reached).toHaveLength(scene.walkable.length);
 // At least a full body half-width plus ice relief remains beside every cell.
 for(const cell of scene.walkable){const p=d8CellToWorld('mirror',cell);expect(mirrorDistanceToWall(p.x,p.z)).toBeGreaterThan(1.05);}
 const hero=state.characters.get('maria')!;
 for(const cell of [{col:17,row:11},{col:23,row:8},{col:12,row:16}]){
  hero.cell=cell;const now=Date.now(),save=state.captureDurable(now),restored=new GameState(oneShotBundle);restored.restoreDurable(save,now);
  expect(restored.characters.get('maria')!.cell).toEqual(cell);expect(restored.captureDurable(now)).toEqual(save);
 }
});
it('migrates an oldest-format cave save into the historical rectangle before the expansion',()=>{
 const state=new GameState(oneShotBundle);state.claim('c'.repeat(32),'old-save','maria');state.changeScene('mirror');
 const hero=state.characters.get('maria')!;hero.cell={col:4,row:4};const now=Date.now(),save=state.captureDurable(now);save.d8GridVersion=1;
 // Encode the prop in the same legacy coordinate system as the character.
 // Merely changing the version marker on a modern prop would move it onto 2,2.
 save.scenes.find(s=>s.sceneId==='mirror')!.objects.find(p=>p.id==='true-love-mirror')!.cell={col:5,row:7};
 const restored=new GameState(oneShotBundle);restored.restoreDurable(save,now);
 expect(restored.characters.get('maria')!.cell).toEqual({col:2,row:2});
});
