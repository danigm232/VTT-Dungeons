import {describe,it,expect} from 'vitest';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder.js';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial.js';
import {restoreRetreatVegetationMaterials} from '../../campaigns/stormwreck-isle/public/retreat-environment.js';
describe('Retreat E1 vegetation finish',()=>{
 it('restores only authored solid pine crowns and SAL scrub, including shared instances, without changing geometry or original cell planting',()=>{
  const engine=new NullEngine(),scene=new Scene(engine),atlas=new StandardMaterial('a1:painted-foliage-sage-v6',scene),needles=new StandardMaterial('Refinement_Pine_Needles',scene),leaf=new StandardMaterial('Refinement_Garden_Leaf',scene);
  const crown=MeshBuilder.CreateBox('SAL2R_Grove_Pine_000_primitive1',{},scene);crown.material=atlas;crown.metadata={tokenOccluder:true,retreatDepartureStage:2};const instance=crown.createInstance('SAL2R_Grove_Pine_001_primitive1');
  const original=MeshBuilder.CreateBox('a1:original-garden',{},scene);original.material=atlas;const trunk=MeshBuilder.CreateBox('SAL2R_Grove_Pine_000_primitive0',{},scene);trunk.material=new StandardMaterial('a1:oak-v5',scene);
  const scrub=MeshBuilder.CreateBox('SAL4_Coastal_Herbs',{},scene);scrub.material=atlas;
  const positions=Array.from(crown.getVerticesData('position')!),count=scene.meshes.length,metadata={...crown.metadata};const stats=restoreRetreatVegetationMaterials(scene);
  expect(crown.material).toBe(needles);expect(instance.material).toBe(needles);expect(scrub.material).toBe(leaf);expect(original.material).toBe(atlas);expect(trunk.material?.name).toBe('a1:oak-v5');
  expect(Array.from(crown.getVerticesData('position')!)).toEqual(positions);expect(crown.metadata).toEqual(metadata);expect(scene.meshes.length).toBe(count);expect(stats).toEqual({crowns:1,scrub:1,newTrees:0,newTextures:1});expect(needles.diffuseTexture?.name).toBe('retreat:e1-shared-needle-surface');const textures=scene.textures.length;restoreRetreatVegetationMaterials(scene);expect(scene.textures.length).toBe(textures);engine.dispose();
 });
 it('keeps the available atlas fallback when authored solid materials are missing',()=>{const engine=new NullEngine(),scene=new Scene(engine),atlas=new StandardMaterial('a1:painted-foliage-v6',scene),m=MeshBuilder.CreateBox('P5_Refined_Existing_Pine_0_primitive1',{},scene);m.material=atlas;expect(restoreRetreatVegetationMaterials(scene).crowns).toBe(0);expect(m.material).toBe(atlas);engine.dispose();});
});
