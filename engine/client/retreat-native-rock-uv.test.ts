import {afterEach,describe,expect,it} from 'vitest';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder.js';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial.js';
import {upgradeRetreatMaterials} from '../../campaigns/stormwreck-isle/public/retreat-refinement-materials.js';

const engines:NullEngine[]=[];
afterEach(()=>engines.splice(0).forEach(e=>e.dispose()));
describe('Retiro · UV nativas de la roca A1',()=>{
 it('preserves authored seam UVs and physical geometry while leaving other projections and the comparison baseline intact',()=>{
  const make=(round2:boolean)=>{
   const engine=new NullEngine();engines.push(engine);const scene=new Scene(engine);
   const native=MeshBuilder.CreateBox('a1:room-1:carved-wall',{},scene);
   const imported=MeshBuilder.CreateBox('imported-rock',{},scene);
   native.material=new StandardMaterial('a1:coastal-cliff-v10',scene);
   imported.material=native.material;native.position.set(7,3,11);imported.position.copyFrom(native.position);
   const before={uv:Array.from(native.getVerticesData('uv')!),position:Array.from(native.getVerticesData('position')!),normal:Array.from(native.getVerticesData('normal')!),indices:Array.from(native.getIndices()!),matrix:Array.from(native.computeWorldMatrix(true).asArray())};
   upgradeRetreatMaterials(scene,1,false,true,round2);
   return {native,imported,before};
  };
  const current=make(true),baseline=make(false);
  expect(Array.from(current.native.getVerticesData('uv')!)).toEqual(current.before.uv);
  expect(Array.from(current.imported.getVerticesData('uv')!)).not.toEqual(current.before.uv);
  expect(Array.from(baseline.native.getVerticesData('uv')!)).not.toEqual(baseline.before.uv);
  for(const sample of [current,baseline]){
   for(const kind of ['position','normal'] as const)expect(Array.from(sample.native.getVerticesData(kind)!)).toEqual(sample.before[kind]);
   expect(Array.from(sample.native.getIndices()!)).toEqual(sample.before.indices);
   expect(Array.from(sample.native.computeWorldMatrix(true).asArray())).toEqual(sample.before.matrix);
  }
 });
});
