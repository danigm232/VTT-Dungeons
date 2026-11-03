import {describe,it,expect} from 'vitest';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder.js';
import {retreatBoatPose,retreatShoreCeiling,preserveRetreatDryShore,installRetreatBoatBuoyancy} from '../../campaigns/stormwreck-isle/public/retreat-coastal-presentation.js';
describe('V5 uses the native sea, while preserving shore and mooring',()=>{
 it('keeps a dry clearing with a feathered coastal limit and unmodified offshore waves',()=>{
  expect(retreatShoreCeiling(12,115)).toBe(.08);expect(retreatShoreCeiling(160,100)).toBe(Infinity);expect(retreatShoreCeiling(45,117)).toBeGreaterThan(.08);
  const engine=new NullEngine(),scene=new Scene(engine),sea=MeshBuilder.CreateGround('sea',{width:360,height:360,subdivisions:8,updatable:true},scene);sea.position.set(100,0,94);const p=sea.getVerticesData('position')!;for(let i=1;i<p.length;i+=3)p[i]=1;sea.updateVerticesData('position',p);sea.metadata={coastalGeometryVersion:1};preserveRetreatDryShore(sea);expect(Math.min(...Array.from(sea.getVerticesData('position')!).filter((_,i)=>i%3===1))).toBeCloseTo(.08);expect(Math.max(...Array.from(sea.getVerticesData('position')!).filter((_,i)=>i%3===1))).toBe(1);scene.dispose();engine.dispose();
 });
 it('moves all original boat parts together, keeps the keel submerged and closes the moving mooring',()=>{
  const engine=new NullEngine(),scene=new Scene(engine),sea=MeshBuilder.CreateGround('sea',{width:40,height:40,subdivisions:4,updatable:true},scene);sea.position.set(20.25,0,117);
  const part=MeshBuilder.CreateBox('hull',{width:1.58,height:.78,depth:3.5},scene);part.position.set(20.25,.23,117);part.metadata={gltf:{extras:{role:'watercraft'}}};
  const controller=installRetreatBoatBuoyancy(scene,sea);for(let i=0;i<48;i++){const p=sea.getVerticesData('position')!;for(let j=1;j<p.length;j+=3)p[j]=Math.sin(i/12)*.15;sea.updateVerticesData('position',p);sea.metadata={coastalGeometryVersion:i};controller.update(i/24);}
  expect(controller.stats.updates).toBe(48);expect(controller.stats.keel).toBeLessThan(controller.stats.waterline);expect(controller.stats.mooringGap).toBe(0);expect(part.getAbsolutePosition().x).toBeCloseTo(20.25);expect(part.getAbsolutePosition().z).toBeCloseTo(117);expect(scene.meshes.filter(m=>m.name==='retreat:boat-live-mooring')).toHaveLength(1);scene.dispose();engine.dispose();
 });
 it('limits pitch and roll without substituting an independent oscillation',()=>{const p=retreatBoatPose(.4,-2,3,-2,3);expect(p.height).toBeCloseTo(.34);expect(Math.abs(p.pitch)).toBeLessThanOrEqual(Math.PI/60);expect(Math.abs(p.roll)).toBeLessThanOrEqual(Math.PI/90);});
});
