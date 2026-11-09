import {describe,it,expect,vi,afterEach} from 'vitest';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {Mesh} from '@babylonjs/core/Meshes/mesh.js';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder.js';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial.js';
import {SceneLoader} from '@babylonjs/core/Loading/sceneLoader.js';
import {installRetreatDepartureLandscape} from '../../campaigns/stormwreck-isle/public/retreat-departure-landscape.js';
import {finishRetreatTrailEnds} from '../../campaigns/stormwreck-isle/public/retreat-trail-ends.js';
import {finishRetreatShoreRock} from '../../campaigns/stormwreck-isle/public/retreat-shore-rock.js';
const engines:NullEngine[]=[];
afterEach(()=>{vi.restoreAllMocks();engines.splice(0).forEach(e=>e.dispose());});
function setup(){const engine=new NullEngine();engines.push(engine);const scene=new Scene(engine),original=MeshBuilder.CreateBox('G2_Backland_Connected_Volcanic_Island',{},scene),shared=new StandardMaterial('a1:coastal-cliff-v10',scene);return {scene,original,shared};}
function imported(scene:Scene,material='a1:coastal-cliff-v10'){
 const root=new Mesh('test-import-root',scene),mesh=MeshBuilder.CreateBox('SAL1_Backland_Presentation',{},scene);mesh.parent=root;mesh.material=new StandardMaterial(material,scene);mesh.metadata={gltf:{extras:{permanentBackdrop:true}}};
 return {root,mesh,result:{meshes:[root,mesh],particleSystems:[],skeletons:[],animationGroups:[],transformNodes:[],geometries:[],lights:[],spriteManagers:[]} as any};
}
describe('Retiro · paisaje de las salidas',()=>{
 it('sculpts the decorative shoreline outside the landing and keeps matching cap and cliff edges together',()=>{
  const {scene}=setup();
  const cap=MeshBuilder.CreateBox('SAL4_Tidal_Backland_Stone',{width:8,height:4,depth:4},scene);
  const cliff=cap.clone('SAL3_Seaward_Cliff_1')!;
  const landing=cap.clone('G2_Path_island-observatory_R3')!;
  for(const mesh of [cap,cliff,landing])mesh.position.set(163,16,22);
  const original=Array.from(cap.getVerticesData('position')!);
  finishRetreatShoreRock([cap,cliff,landing]);
  const result=Array.from(cap.getVerticesData('position')!);
  expect(result).not.toEqual(original);
  expect(Array.from(cliff.getVerticesData('position')!)).toEqual(result);
  expect(Array.from(landing.getVerticesData('position')!)).toEqual(original);
  for(let i=0;i<original.length;i+=3){
   if(original[i]!+163<=163.5)expect(result[i]).toBe(original[i]);
   expect(result[i+1]).toBe(original[i+1]);
  }
 });
 it('feathers only the scenic continuation and preserves the navigable landing',()=>{
  const {scene,shared}=setup();
  const ground=MeshBuilder.CreateGround('SAL4_Tidal_Backland_Stone',{width:16,height:16},scene);
  ground.position.set(8,.54,90);
  const source=MeshBuilder.CreateGround('R2_Pleamar_Low_Cove_Continuation',{width:16,height:16},scene);
  source.position.set(8,.56,90);source.material=shared;
  const landing=MeshBuilder.CreateGround('G2_Path_island-pleamar-low',{},scene);
  for(const mesh of [ground,source,landing])mesh.computeWorldMatrix(true);
  const [tail]=finishRetreatTrailEnds(scene);
  expect(tail?.name).toBe(source.name+':feathered');
  expect(tail?.metadata).toMatchObject({content:'VTT_AMBIENCE',retreatFloor:false,tokenOccluder:false});
  expect(tail?.isPickable).toBe(false);
  expect(tail?.checkCollisions).toBe(false);
  const colors=tail!.getVerticesData('color')!;
  expect(colors[3]).toBe(0);
  expect(colors[15]).toBeGreaterThan(.8);
  expect(colors.at(-1)).toBe(0);
  expect(source.isEnabled()).toBe(false);
  expect(landing.isEnabled()).toBe(true);
  expect(ground.isEnabled()).toBe(true);
  expect(finishRetreatTrailEnds(scene)).toEqual([]);
 });
 it('supports all four scenic branches without changing a landing or inheriting a collapsed coastal face',()=>{
  const {scene,shared}=setup();
  const rock=new StandardMaterial('retreat:pbr:rock:distant',scene);
  const sources=['SAL1_Decorative_Trail_Continuation','R2_Pleamar_Low_Cove_Continuation','SAL2_Scenic_Trail_Continuation','SAL3_Scenic_Coast_Continuation'];
  for(const name of sources){
   const source=MeshBuilder.CreateGround(name,{width:500,height:500},scene);
   source.position.y=-2;source.material=shared;source.computeWorldMatrix(true);
  }
  const landing=MeshBuilder.CreateGround('G2_Path_island-observatory_R3',{},scene);
  landing.material=shared;
  void scene.defaultMaterial;
  const original=Array.from(landing.getVerticesData('position')!);
  const resources=[scene.materials.length,scene.textures.length,scene.lights.length];
  const result=finishRetreatTrailEnds(scene),banks=result.filter(m=>m.name.endsWith(':rock-shoulder'));
  expect(result).toHaveLength(8);expect(banks).toHaveLength(4);
  expect(banks.every(m=>m.material===rock)).toBe(true);
  for(const mesh of result){
   expect(mesh.checkCollisions||mesh.isPickable).toBe(false);
   expect(mesh.metadata).toMatchObject({retreatFloor:false,tokenOccluder:false,content:'VTT_AMBIENCE'});
   expect(Array.from(mesh.getVerticesData('position')!).every(Number.isFinite)).toBe(true);
  }
  const coast=result.find(m=>m.name==='SAL3_Scenic_Coast_Continuation:feathered')!;
  const p=coast.getVerticesData('position')!;
  expect(p[10]).toBeGreaterThan(32);
  for(let i=31;i<p.length;i+=21)expect(Math.abs(p[i]!-p[i-21]!)).toBeLessThan(.04);
  expect(Array.from(landing.getVerticesData('position')!)).toEqual(original);
  expect(landing.isEnabled()).toBe(true);
  expect([scene.materials.length,scene.textures.length,scene.lights.length]).toEqual([resources[0]!+1,resources[1],resources[2]]);
 });
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
