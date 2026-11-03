import {describe,it,expect,vi,afterEach} from 'vitest';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {Mesh} from '@babylonjs/core/Meshes/mesh.js';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder.js';
import {TransformNode} from '@babylonjs/core/Meshes/transformNode.js';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial.js';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';
import {SceneLoader} from '@babylonjs/core/Loading/sceneLoader.js';
import {applyGroveContacts,parseGroveContacts} from '../../campaigns/stormwreck-isle/public/retreat-departure-contacts.js';
import {installRetreatDepartureLandscape} from '../../campaigns/stormwreck-isle/public/retreat-departure-landscape.js';
const engines:NullEngine[]=[];afterEach(()=>{vi.restoreAllMocks();engines.splice(0).forEach(e=>e.dispose());});
function setup(){const e=new NullEngine();engines.push(e);return new Scene(e);}
function imported(scene:Scene,phase:number,bad=false){
 const root=new Mesh('gltf-test-root-'+phase,scene),backdrop=MeshBuilder.CreateBox(`SAL${phase}_Backland_Presentation`,{},scene);backdrop.parent=root;backdrop.material=new StandardMaterial(bad?'missing-rock':'a1:coastal-cliff-v10',scene);backdrop.metadata={gltf:{extras:{permanentBackdrop:true,role:'backland-presentation'}}};
 const meshes:any[]=[root,backdrop];let tree:Mesh|null=null,instance:any=null;
 if(phase===2){tree=MeshBuilder.CreateBox('SAL2_native-pine-source',{},scene);tree.parent=root;tree.material=new StandardMaterial('a1:dark-oak-v5',scene);tree.metadata={gltf:{extras:{role:'tree'}}};const group=new TransformNode('SAL2_second-pine',scene);group.parent=root;group.metadata={gltf:{extras:{role:'tree'}}};instance=tree.createInstance('SAL2_linked-pine');instance.parent=group;meshes.push(tree,instance);}
 return {root,backdrop,tree,instance,result:{meshes,particleSystems:[],skeletons:[],animationGroups:[],transformNodes:[],geometries:[],lights:[],spriteManagers:[]} as any};
}
describe('Retiro · SAL-2 grounded sparse groves',()=>{
 it('rejects contacts targeting architecture or the coastal cairn group area',()=>{
  expect(()=>parseGroveContacts({trees:[{id:'a4-door',x:120,z:16,targetY:37}]})).toThrow();
  expect(()=>parseGroveContacts({trees:[],cairn:{id:'G2_Wayfinding_Cairns_3',bounds:[110,170,3,30],deltaY:-6}})).toThrow();
 });
 it('corrects only world height through a mirrored parent and retains native geometry, scale and X/Z',()=>{
  const scene=setup(),root=new TransformNode('native-gltf-root',scene);root.position.set(100,0,0);root.scaling.set(1,1,-1);
  const tree=MeshBuilder.CreateBox('G2_Forest_Reused_Pine_1',{},scene);tree.parent=root;tree.position.set(26.75,42.28,-18.75);tree.scaling.set(.88,.88,.88);const geometry=tree.geometry,vertices=Array.from(tree.getVerticesData('position')!);tree.computeWorldMatrix(true);tree.freezeWorldMatrix();
  const result=applyGroveContacts(scene,parseGroveContacts({trees:[{id:tree.name,x:126.75,z:18.75,targetY:36.75}]}));
  expect(tree.getAbsolutePosition().asArray()).toEqual([126.75,36.75,18.75]);expect(tree.scaling.asArray()).toEqual([.88,.88,.88]);expect(tree.parent).toBe(root);expect(tree.geometry).toBe(geometry);expect(Array.from(tree.getVerticesData('position')!)).toEqual(vertices);expect(result.trees[0]!.deltaY).toBeCloseTo(-5.53);
 });
 it('preflights every existing tree before changing any contact',()=>{
  const scene=setup(),one=new TransformNode('G2_Forest_Reused_Pine_1',scene),two=new TransformNode('G2_Forest_Reused_Pine_2',scene);one.position.set(126.75,42,18.75);two.position.set(115.75,43,15.75);
  expect(()=>applyGroveContacts(scene,parseGroveContacts({trees:[{id:one.name,x:126.75,z:18.75,targetY:37},{id:two.name,x:114.75,z:15.75,targetY:37}]}))).toThrow(/cambió/);expect(one.position.y).toBe(42);expect(two.position.y).toBe(43);
 });
 it('grounds the existing interior stones while leaving the coast, UVs and indices untouched',()=>{
  const scene=setup(),root=new TransformNode('mirrored-root',scene);root.scaling.set(1,1,-1);const cairn=new Mesh('G2_Wayfinding_Cairns_3',scene);cairn.parent=root;
  const p=[116.8,43,-15.5,117.3,43,-15.5,117.1,43.8,-16,156,40,-26,156.5,40,-26,156.25,40.8,-26.5],uv=[0,0,1,0,.5,1,0,0,1,0,.5,1],indices=[0,1,2,3,4,5];cairn.setVerticesData('position',p);cairn.setVerticesData('uv',uv);cairn.setIndices(indices);
  const result=applyGroveContacts(scene,parseGroveContacts({trees:[],cairn:{id:cairn.name,bounds:[116.5,118,15,16.6],deltaY:-6}}));const actual=Array.from(cairn.getVerticesData('position')!);
  for(let i=0;i<actual.length;i++)expect(actual[i]).toBeCloseTo(p[i]!-(i<9&&i%3===1?6:0),4);
  expect(Array.from(cairn.getVerticesData('uv')!)).toEqual(uv);expect(Array.from(cairn.getIndices()!)).toEqual(indices);expect(result.cairn!.adjustedVertices).toBe(3);
 });
 it('imports linked pine instances with independent O1 metadata and shared existing material',async()=>{
  const scene=setup(),rock=new StandardMaterial('a1:coastal-cliff-v10',scene),wood=new StandardMaterial('a1:dark-oak-v5',scene);MeshBuilder.CreateBox('G2_Backland_Connected_Volcanic_Island',{},scene);const first=imported(scene,1),second=imported(scene,2);let n=0;
  vi.spyOn(SceneLoader,'ImportMeshAsync').mockImplementation(async()=>[first.result,second.result][n++]);
  const result=await installRetreatDepartureLandscape(scene,new Map([[rock.name,rock],[wood.name,wood]]),2);
  expect(result.stats.error).toBe('');expect(result.instances).toContain(second.instance);expect(second.instance.metadata).toMatchObject({retreatDepartureStage:2,tokenOccluder:true,retreatFloor:false});expect(second.tree!.material).toBe(wood);expect(second.instance.material).toBe(wood);expect(first.backdrop.isEnabled()).toBe(false);expect(second.backdrop.isEnabled()).toBe(true);
 });
 it('retains SAL-1 and native contacts when the new phase has an unavailable material',async()=>{
  const scene=setup(),rock=new StandardMaterial('a1:coastal-cliff-v10',scene);MeshBuilder.CreateBox('G2_Backland_Connected_Volcanic_Island',{},scene);const native=new TransformNode('G2_Forest_Reused_Pine_1',scene);native.position.set(126.75,42.28,18.75);const first=imported(scene,1),second=imported(scene,2,true);let n=0;
  vi.spyOn(SceneLoader,'ImportMeshAsync').mockImplementation(async()=>[first.result,second.result][n++]);vi.spyOn(console,'warn').mockImplementation(()=>{});
  const result=await installRetreatDepartureLandscape(scene,new Map([[rock.name,rock]]),2);
  expect(result.stats.error).toContain('Material decorativo');expect(first.backdrop.isEnabled()).toBe(true);expect(second.root.isDisposed()).toBe(true);expect(native.position.y).toBe(42.28);expect(result.stats.suppressedBackdrops).toEqual(['G2_Backland_Connected_Volcanic_Island']);
 });
});
