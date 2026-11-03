import {describe,it,expect,vi,afterEach} from 'vitest';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {Mesh} from '@babylonjs/core/Meshes/mesh.js';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder.js';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial.js';
import {SceneLoader} from '@babylonjs/core/Loading/sceneLoader.js';
import {installRetreatDepartureLandscape} from '../../campaigns/stormwreck-isle/public/retreat-departure-landscape.js';
const engines:NullEngine[]=[];
afterEach(()=>{vi.restoreAllMocks();engines.splice(0).forEach(e=>e.dispose());});
function setup(){const engine=new NullEngine();engines.push(engine);const scene=new Scene(engine),original=MeshBuilder.CreateBox('G2_Backland_Connected_Volcanic_Island',{},scene),shared=new StandardMaterial('a1:coastal-cliff-v10',scene);return {scene,original,shared};}
function imported(scene:Scene,material='a1:coastal-cliff-v10'){
 const root=new Mesh('test-import-root',scene),mesh=MeshBuilder.CreateBox('SAL1_Backland_Presentation',{},scene);mesh.parent=root;mesh.material=new StandardMaterial(material,scene);mesh.metadata={gltf:{extras:{permanentBackdrop:true}}};
 return {root,mesh,result:{meshes:[root,mesh],particleSystems:[],skeletons:[],animationGroups:[],transformNodes:[],geometries:[],lights:[],spriteManagers:[]} as any};
}
describe('Retiro · paisaje de las salidas',()=>{
 it('keeps baseline presentation and resources when the phase is disabled',async()=>{
  const {scene,original}=setup(),before=[scene.meshes.length,scene.materials.length,scene.textures.length];
  const spy=vi.spyOn(SceneLoader,'ImportMeshAsync');const result=await installRetreatDepartureLandscape(scene,new Map(),0);
  expect(spy).not.toHaveBeenCalled();expect(original.isEnabled()).toBe(true);expect(result.meshes).toHaveLength(0);expect([scene.meshes.length,scene.materials.length,scene.textures.length]).toEqual(before);
 });
 it('replaces presentation only after successful import, sharing materials without a collider or new floor',async()=>{
  const {scene,original,shared}=setup(),originalGeometry=original.geometry,imp=imported(scene),placeholder=imp.mesh.material!;
  vi.spyOn(SceneLoader,'ImportMeshAsync').mockResolvedValue(imp.result);
  const result=await installRetreatDepartureLandscape(scene,new Map([[shared.name,shared]]),1);
  expect(result.stats.error).toBe('');expect(result.meshes).toEqual([imp.mesh]);expect(original.isEnabled()).toBe(false);expect(original.geometry).toBe(originalGeometry);
  expect(imp.root.scaling.asArray()).toEqual([1,1,-1]);expect(imp.mesh.material).toBe(shared);expect(scene.materials).not.toContain(placeholder);expect(scene.materials).toContain(shared);
  expect(imp.mesh.checkCollisions).toBe(false);expect(imp.mesh.isPickable).toBe(false);expect(imp.mesh.metadata).toMatchObject({content:'VTT_AMBIENCE',retreatFloor:false,permanentBackdrop:true,tokenOccluder:false});
 });
 it('retains the original and disposes partial imports when a shared material is missing',async()=>{
  const {scene,original,shared}=setup(),before=scene.materials.length,imp=imported(scene,'missing-material');
  vi.spyOn(SceneLoader,'ImportMeshAsync').mockResolvedValue(imp.result);vi.spyOn(console,'warn').mockImplementation(()=>{});
  const result=await installRetreatDepartureLandscape(scene,new Map([[shared.name,shared]]),1);
  expect(result.stats.error).toContain('Material decorativo');expect(original.isEnabled()).toBe(true);expect(imp.mesh.isDisposed()).toBe(true);expect(imp.root.isDisposed()).toBe(true);expect(scene.materials).toHaveLength(before);expect(result.meshes).toHaveLength(0);
 });
 it('keeps the existing backdrop on a failed asset request',async()=>{
  const {scene,original}=setup();vi.spyOn(SceneLoader,'ImportMeshAsync').mockRejectedValue(Error('network unavailable'));vi.spyOn(console,'warn').mockImplementation(()=>{});
  const result=await installRetreatDepartureLandscape(scene,new Map(),1);expect(result.stats.error).toContain('network unavailable');expect(original.isEnabled()).toBe(true);expect(result.stats.suppressedBackdrops).toEqual([]);
 });
});
