import {describe,it,expect} from 'vitest';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder.js';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';
import {updateRetreatCellVisibility} from '../../campaigns/stormwreck-isle/public/retreat-cell-visibility.js';

describe('Visibilidad del acceso de las celdas',()=>{
 it('hides the entire occupied frontage and restores it on exit without changing geometry or collision',()=>{
  const engine=new NullEngine(),scene=new Scene(engine);
  const a=MeshBuilder.CreateBox('a1:room-1:face-3:stone',{},scene),b=MeshBuilder.CreateBox('a1:room-2:face-3:stone',{},scene),side=MeshBuilder.CreateBox('a1:room-1:face-1:stone',{},scene),portal=MeshBuilder.CreateBox('a1:room-1:face-3:portal-sides',{},scene);
  a.checkCollisions=true;const points=Array.from(a.getVerticesData('position')!),order=new Map([[a,0],[b,0],[side,0],[portal,0]]);
  updateRetreatCellVisibility([a,b,side,portal],1,new Vector3(-1,0,1),order);
  expect(a.isVisible).toBe(false);expect(portal.isVisible).toBe(false);expect(side.isVisible).toBe(true);expect(b.isVisible).toBe(true);expect(a.checkCollisions).toBe(true);expect(Array.from(a.getVerticesData('position')!)).toEqual(points);
  updateRetreatCellVisibility([a,b,side,portal],undefined,new Vector3(-1,0,1),order);
  expect(a.isVisible).toBe(true);expect(portal.isVisible).toBe(true);expect(side.isVisible).toBe(true);expect(a.visibility).toBe(1);expect(side.visibility).toBe(1);
  scene.dispose();engine.dispose();
 });
});
