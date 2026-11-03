import {describe,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {installRetreatIsland} from '../../campaigns/stormwreck-isle/public/retreat-island.js';
import {retreatMeshUsesDetail} from '../../campaigns/stormwreck-isle/public/retreat-refinement-materials.js';
import {upgradeRetreatMaterials} from '../../campaigns/stormwreck-isle/public/retreat-refinement-materials.js';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder.js';
import {Mesh} from '@babylonjs/core/Meshes/mesh.js';
import {TransformNode} from '@babylonjs/core/Meshes/transformNode.js';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial.js';
import {Texture} from '@babylonjs/core/Materials/Textures/texture.js';
import {SceneLoader} from '@babylonjs/core/Loading/sceneLoader.js';
import {PointLight} from '@babylonjs/core/Lights/pointLight.js';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';
import manifest from '../../campaigns/stormwreck-isle/public/retreat-island.json' with {type:'json'};
function glb(stage:number){const b=readFileSync(`campaigns/stormwreck-isle/public/art/retreat-modules/retreat_island_g2_${stage}_runtime.glb`);return {b,j:JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString())};}
describe('Retreat additive island modules',()=>{
 it('retains linked forest instances with independent occlusion metadata and shared source materials',async()=>{
  const engine=new NullEngine(),scene=new Scene(engine),shared=new StandardMaterial('a1:dark-oak-v5',scene),lamp=new PointLight('existing-lamp',Vector3.Zero(),scene);let phase=0;
  const spy=vi.spyOn(SceneLoader,'ImportMeshAsync').mockImplementation(async()=>{
   phase++;const root=new Mesh('gltf-root-'+phase,scene),group=new TransformNode('authored-'+phase,scene);group.parent=root;group.metadata={gltf:{extras:{islandPhase:phase,role:phase===3?'tree':'permanent-terrain-backdrop'}}};
   const source=MeshBuilder.CreateBox('source-'+phase,{},scene);source.parent=group;source.material=new StandardMaterial('a1:dark-oak-v5',scene);
   const meshes:any[]=[root,source];if(phase===3){const parent=new TransformNode('second-tree',scene);parent.parent=root;parent.metadata=structuredClone(group.metadata);const clone=source.createInstance('linked-pine');clone.parent=parent;meshes.push(clone);}
   return {meshes,particleSystems:[],skeletons:[],animationGroups:[],transformNodes:[group],geometries:[],lights:[],spriteManagers:[]} as any;
  });
  try{const result=await installRetreatIsland(scene,new Map([[shared.name,shared]]),3);expect(result.meshes).toHaveLength(3);expect(result.instances).toHaveLength(1);const clone=result.instances[0]!;expect(clone.metadata.tokenOccluder).toBe(true);expect(clone.metadata.retreatIslandPhase).toBe(3);expect(clone.material).toBe(shared);expect(lamp.excludedMeshes).toContain(clone);const lod=upgradeRetreatMaterials(scene);lod.update();expect(clone.material).toBe(clone.sourceMesh.material);}
  finally{spy.mockRestore();scene.dispose();engine.dispose();}
 });
 it('lights exterior additions with sun and ambient without sampling interior flame shadow maps',async()=>{
  const engine=new NullEngine(),scene=new Scene(engine),shared=new StandardMaterial('island-shared-test',scene),lamp=new PointLight('original-interior-lamp',Vector3.Zero(),scene),original=MeshBuilder.CreateBox('original-architecture',{},scene);
  let index=0;
  const spy=vi.spyOn(SceneLoader,'ImportMeshAsync').mockImplementation(async()=>{
   const root=MeshBuilder.CreateBox('test-glb-root-'+index,{},scene);root.setVerticesData('position',[]);
   const m=MeshBuilder.CreateBox('G2-test-'+index,{},scene);m.parent=root;m.material=new StandardMaterial('island-shared-test',scene);
   m.metadata={gltf:{extras:{islandPhase:++index,retreatFloor:index===2,role:index===2?'walkable-floor':'permanent-terrain-backdrop'}}};
   return {meshes:[root,m],particleSystems:[],skeletons:[],animationGroups:[],transformNodes:[],geometries:[],lights:[],spriteManagers:[]} as any;
  });
  try{const result=await installRetreatIsland(scene,new Map([[shared.name,shared]]),2);expect(result.meshes).toHaveLength(2);expect([...lamp.excludedMeshes]).toEqual(result.meshes);expect(lamp.excludedMeshes).not.toContain(original);expect(result.meshes[1]!.receiveShadows).toBe(true);expect(result.stats.newMaterials).toBe(0);}
  finally{spy.mockRestore();scene.dispose();engine.dispose();}
 });
 it('shares one economical background material and leaves the original stone sampler intact',()=>{
  const engine=new NullEngine(),scene=new Scene(engine),source=new StandardMaterial('a1:coastal-cliff-v10',scene),albedo=new Texture(null,scene);
  albedo.anisotropicFilteringLevel=8;source.diffuseTexture=albedo;
  const meshes=[0,1,2].map(i=>{const m=MeshBuilder.CreateBox('island-test-'+i,{},scene);m.material=source;if(i<2)m.metadata={preferDistantMaterial:true,stoneStage:3};return m;});
  const controller=upgradeRetreatMaterials(scene);controller.update();
  expect(meshes[0]!.material).toBe(meshes[1]!.material);expect(meshes[0]!.material?.name).toBe('retreat:island-shared-low');expect(meshes[2]!.material).not.toBe(meshes[0]!.material);
  expect((meshes[0]!.material as StandardMaterial).diffuseTexture).not.toBe(albedo);expect((meshes[0]!.material as StandardMaterial).diffuseTexture?.anisotropicFilteringLevel).toBe(1);expect(albedo.anisotropicFilteringLevel).toBe(8);
  expect(scene.materials.filter(m=>m.name==='retreat:island-shared-low')).toHaveLength(1);scene.dispose();engine.dispose();
 });
 it('retains existing near material policy and keeps distant island land on the shared low material',()=>{
  expect(retreatMeshUsesDetail(true)).toBe(true);expect(retreatMeshUsesDetail(false)).toBe(false);
  expect(retreatMeshUsesDetail(true,{preferDistantMaterial:true})).toBe(false);expect(retreatMeshUsesDetail(true,{preferDistantMaterial:false})).toBe(true);
 });
 it('keeps an explicit baseline mode without loading geometry or changing scene resources',async()=>{
  const engine=new NullEngine(),scene=new Scene(engine),before=[scene.meshes.length,scene.materials.length,scene.textures.length,scene.lights.length];
  const result=await installRetreatIsland(scene,new Map(),0);expect(result.meshes).toHaveLength(0);expect(result.stats.stage).toBe(0);
  expect([scene.meshes.length,scene.materials.length,scene.textures.length,scene.lights.length]).toEqual(before);scene.dispose();engine.dispose();
 });
 it('uses valid GLB2 containers and shared named materials without embedded images',()=>{
  for(let stage=1;stage<=manifest.availableStage;stage++){const {b,j}=glb(stage);expect(b.readUInt32LE(0)).toBe(0x46546c67);expect(b.readUInt32LE(4)).toBe(2);expect(b.readUInt32LE(8)).toBe(b.length);expect(j.images??[]).toHaveLength(0);expect(j.textures??[]).toHaveLength(0);expect(j.materials.every((m:any)=>m.extras.reuseExistingMaterial===true)).toBe(true);}
 });
 it('separates visual background from future floors and preserves the fixed orientation contract',()=>{
  const {j}=glb(1),nodes=j.nodes.filter((n:any)=>n.extras?.islandPhase===1);expect(nodes.length).toBeGreaterThan(0);
  expect(nodes.every((n:any)=>n.extras.content==='VTT_AMBIENCE'&&n.extras.retreatFloor===false&&n.extras.vttCutaway===false)).toBe(true);
  expect(j.nodes.every((n:any)=>!n.name?.startsWith('a1:'))).toBe(true);expect(manifest.dockRemainsOnRight).toBe(true);expect(manifest.architectureOrientationPreserved).toBe(true);
 });
});
