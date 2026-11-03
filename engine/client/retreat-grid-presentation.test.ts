import {describe,it,expect} from 'vitest';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder.js';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';
import {createRetreatGridProjector} from '../../campaigns/stormwreck-isle/public/retreat-grid-presentation.js';
import {retreatExcavationCutsMesh,splitRetreatUpperShells} from '../../campaigns/stormwreck-isle/public/retreat-local-occlusion.js';

function fixture(){const engine=new NullEngine(),scene=new Scene(engine);return {scene,dispose:()=>{scene.dispose();engine.dispose();}};}
describe('Retreat grid follows the delivered floor',()=>{
 it('clips empty space and ignores an upper floor at a different elevation',()=>{const f=fixture();try{
  for(const y of [.11,9.95]){const m=MeshBuilder.CreateBox('floor-'+y,{width:3,height:.1,depth:3},f.scene);m.position.y=y;m.metadata={retreatFloor:true};m.computeWorldMatrix(true);}
  const p=createRetreatGridProjector(f.scene),lines=p.project('beach',new Vector3(-2,.16,0),new Vector3(2,.16,0));
  expect(lines.length).toBeGreaterThan(0);for(const line of lines)for(const point of line){expect(Math.abs(point.x)).toBeLessThanOrEqual(1.5001);expect(point.y).toBeCloseTo(.182,5);}
  expect(p.project('beach',new Vector3(4,.16,0),new Vector3(6,.16,0))).toEqual([]);
  expect(p.height(0,0,10)).toBeCloseTo(10,5);
 }finally{f.dispose();}});
 it('draws horizontal treads without joining their levels into a floating ramp',()=>{const f=fixture();try{
  for(let i=0;i<3;i++){const m=MeshBuilder.CreateBox('step-'+i,{width:1,height:.1,depth:2},f.scene);m.position.set(i,i*.25-.05,0);m.metadata={retreatFloor:true};m.computeWorldMatrix(true);}
  const p=createRetreatGridProjector(f.scene),lines=p.project('upper',new Vector3(-.5,0,0),new Vector3(2.5,.5,0));
  expect(lines.length).toBe(3);for(const [a,b]of lines)expect(a.y).toBeCloseTo(b.y,5);
 }finally{f.dispose();}});
});

describe('Retreat coherent room cutaway',()=>{
 it('opens only the occupied front wall and keeps the wall bases and other rooms',()=>{const f=fixture();try{
  const m=MeshBuilder.CreateBox('South_Wall_Upper',{width:18,height:2.3,depth:.3},f.scene);m.position.set(102,19.6,63);m.metadata={gltf:{extras:{role:'wall-upper',globalZone:'a4'}}};m.computeWorldMatrix(true);
  expect(retreatExcavationCutsMesh(m,'a4',new Vector3(0,.2,1))).toBe(true);
  expect(retreatExcavationCutsMesh(m,'a3',new Vector3(0,.2,1))).toBe(false);
  expect(retreatExcavationCutsMesh(m,'a4',new Vector3(0,.2,-1))).toBe(false);
  m.metadata.gltf.extras.role='wall-base';expect(retreatExcavationCutsMesh(m,'a4',new Vector3(0,.2,1))).toBe(false);
 }finally{f.dispose();}});
 it('partitions the shared front rock so entering A4 does not reveal A3',()=>{const f=fixture();try{
  const m=MeshBuilder.CreateBox('Stone_P3_Sculpted_Carved_Front_1',{width:12,height:5,depth:1},f.scene);m.position.set(110,20.5,63.5);m.metadata={gltf:{extras:{vttCutaway:'wall',vttInterior:'upper-caves'}}};m.computeWorldMatrix(true);
  const result=splitRetreatUpperShells([m]);expect(result.parts).toHaveLength(2);expect(m.isEnabled()).toBe(false);
  const a4=result.parts.find(p=>p.metadata.retreatOcclusionPart==='a4')!,a3=result.parts.find(p=>p.metadata.retreatOcclusionPart==='a3')!;
  expect(retreatExcavationCutsMesh(a4,'a4',new Vector3(0,.2,1))).toBe(true);expect(retreatExcavationCutsMesh(a3,'a4',new Vector3(0,.2,1))).toBe(false);
 }finally{f.dispose();}});
});
