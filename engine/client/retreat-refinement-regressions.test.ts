import {describe,it,expect,afterEach,vi} from 'vitest';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {TransformNode} from '@babylonjs/core/Meshes/transformNode.js';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder.js';
import {VertexData} from '@babylonjs/core/Meshes/mesh.vertexData.js';
import {ArcRotateCamera} from '@babylonjs/core/Cameras/arcRotateCamera.js';
import {Matrix,Vector3} from '@babylonjs/core/Maths/math.vector.js';
import {DirectionalLight} from '@babylonjs/core/Lights/directionalLight.js';
import {CampShadows} from '../../campaigns/camp-rests/public/camp-surface-effects.js';
import {keepRetreatLandingDry,refineRetreatCoast} from '../../campaigns/stormwreck-isle/public/retreat-refinement-coast.js';
import {installRetreatScenicDepth} from '../../campaigns/stormwreck-isle/public/retreat-scenic-depth.js';
import {retreatViewSize,RETREAT_ZONE_VIEWS} from '../../campaigns/stormwreck-isle/public/retreat-camera-composition.js';
import {cameraProfileForScene} from '../shared/camera-profile.js';
import {terrainCameraBaseAlpha} from './camera-movement.js';
import {PBRMaterial} from '@babylonjs/core/Materials/PBR/pbrMaterial.js';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial.js';
import {applyRetreatStoneVertexOpacity} from '../../campaigns/stormwreck-isle/public/retreat-refinement-materials.js';
import {retreatStoneShadowCasters} from '../../campaigns/stormwreck-isle/public/retreat-refinement-lighting.js';
import {installRetreatWallTorches} from '../../campaigns/stormwreck-isle/public/retreat-wall-torches.js';
import {sculptRetreatCornice} from '../../campaigns/stormwreck-isle/public/retreat-cornice.js';
import {installRetreatEasternWater} from '../../campaigns/stormwreck-isle/public/retreat-eastern-water.js';
const engines:NullEngine[]=[];afterEach(()=>engines.splice(0).forEach(e=>e.dispose()));
function setup(){const engine=new NullEngine();engines.push(engine);return new Scene(engine);}
describe('Retiro · regresiones de presentación',()=>{
 it('continues the eastern sea outside the traced cliff using the native water material',()=>{
  const scene=setup();
  const sea=MeshBuilder.CreateGround('native water',{width:360,height:360,subdivisions:4},scene);
  sea.material=new StandardMaterial('existing sea',scene);
  const cliff=MeshBuilder.CreateBox('SAL3_Seaward_Cliff_1',{width:2,height:20,depth:24},scene);
  cliff.position.set(165,0,20);cliff.isPickable=false;cliff.computeWorldMatrix(true);
  const result=installRetreatEasternWater(scene,sea)!;
  expect(result).not.toBeNull();
  expect(result.mesh.material).toBe(sea.material);
  expect(result.mesh.isPickable).toBe(false);
  expect(result.mesh.checkCollisions).toBe(false);
  const positions=Array.from(result.mesh.getVerticesData('position')!);
  for(let i=0;i<positions.length;i+=3){
   expect(positions[i]).toBeGreaterThanOrEqual(165.79);
   expect(positions[i+2]).toBeGreaterThanOrEqual(8);
   expect(positions[i+2]).toBeLessThanOrEqual(32);
  }
  result.update();
  expect(Array.from(result.mesh.getVerticesData('position')!).every(Number.isFinite)).toBe(true);
  const geometricNormals:number[]=[];
  VertexData.ComputeNormals(result.mesh.getVerticesData('position')!,result.mesh.getIndices()!,geometricNormals);
  expect(geometricNormals.filter((_,i)=>i%3===1).every(y=>y>.99)).toBe(true);
  expect(scene.materials.filter(m=>m.name==='existing sea')).toHaveLength(1);
 });
 it('breaks the visible cliff edge below the walkway without creating a collider', () => {
  const scene = setup();
  const source = MeshBuilder.CreateBox('retaining rock', { width: 59, height: 8.7, depth: 1.1 }, scene);
  source.position.set(105.75, 13.45, 72.4);
  const rock = sculptRetreatCornice(source);
  const vertices = rock.getVerticesData('position')!;
  const lip = Array.from({length: 30}, (_, i) => vertices[(i * 8 + 1) * 3 + 1]!);
  expect(Math.max(...lip) - Math.min(...lip)).toBeGreaterThan(.25);
  expect(rock.getBoundingInfo().boundingBox.maximumWorld.y).toBeLessThan(18);
  expect(rock.checkCollisions).toBe(false);
  expect(rock.isPickable).toBe(false);
  expect(source.isEnabled()).toBe(false);
 });
 it('keeps the corridor torch light at its wick and switches it off with its wall', () => {
  const scene = setup();
  const wall = MeshBuilder.CreateBox('Dining_South_Upper', { width: 4, height: 4, depth: .5 }, scene);
  wall.position.set(121.5, 19.7, 63);
  const original = MeshBuilder.CreateBox('R3_Upper_Torch_3_R3_Lamp', {}, scene);
  const floor = MeshBuilder.CreateBox('corridor', { width: 4, height: .12, depth: 3 }, scene);
  floor.position.set(121.5, 18, 66);
  floor.metadata = { retreatFloor: true };
  const room = MeshBuilder.CreateBox('room', { width: 4, height: .12, depth: 3 }, scene);
  room.position.set(121.5, 18, 61);
  room.metadata = { retreatFloor: true };
  scene.meshes.forEach(mesh => mesh.computeWorldMatrix(true));

  const torches = installRetreatWallTorches(scene);
  const light = scene.getLightByName('retreat:r3-wall-lamp-3')!;
  const flame = scene.getMeshByName('retreat:torch:3:flame')!;
  expect(original.isEnabled()).toBe(false);
  expect(Vector3.Distance(light.getAbsolutePosition(), flame.position)).toBeLessThan(.14);
  expect(light.includedOnlyMeshes.map(mesh => mesh.name)).toEqual([wall.name, floor.name]);
  torches.update(1, 0);
  expect(light.isEnabled()).toBe(false);
  torches.update(2, 1);
  expect(light.isEnabled()).toBe(true);
  expect(flame.isVisible).toBe(true);
  wall.isVisible = false;
  torches.update(3, 1);
  expect(light.intensity).toBe(0);
  expect(light.isEnabled()).toBe(false);
  expect(torches.meshes.every(mesh => !mesh.isVisible)).toBe(true);
 });
 it('clips only static casters outside the light view while retaining the original projection list',()=>{
  const scene=setup(),sun=new DirectionalLight('sun',new Vector3(0,-1,1),scene);
  const box=(name:string,x:number,updatable=false)=>{
   const mesh=MeshBuilder.CreateBox(name,{size:1,updatable},scene);
   mesh.position.set(x,0,4);mesh.computeWorldMatrix(true);return mesh;
  };
  const center=box('center',0),edge=box('normal-bias-edge',2.03),far=box('offscreen',6),moving=box('moving',6,true);
  const hidden=box('hidden',0);hidden.setEnabled(false);
  vi.stubGlobal('window',{});
  try {
   new CampShadows(scene,sun,false,undefined,false,true);
   const target=sun.getShadowGenerator()!.getShadowMap()!,casters=target.renderList!;
   scene.setTransformMatrix(Matrix.Identity(),Matrix.OrthoOffCenterLH(-1.5,1.5,-1.5,1.5,.1,20));
   const names=(meshes:typeof casters|null)=>meshes?.map(mesh=>mesh.name);
   expect(names(target.getCustomRenderList!(0,casters,casters.length))).toEqual([center.name,edge.name,moving.name]);
   expect(names(target.renderList)).toEqual([center.name,edge.name,far.name,moving.name,hidden.name]);
   far.position.x=.5;
   scene.incrementRenderId();
   expect(names(target.getCustomRenderList!(0,casters,casters.length))).toEqual([center.name,edge.name,far.name,moving.name]);
  } finally { vi.unstubAllGlobals(); }
 });
 it('keeps canonical casters and the sun silhouette without stone in flame cube maps',()=>{const scene=setup(),table=MeshBuilder.CreateBox('original-table',{},scene),shell=MeshBuilder.CreateBox('stone-shell',{},scene),core=MeshBuilder.CreateBox('stone-core',{},scene);shell.metadata={stoneStage:3,stoneShadowCaster:true};core.metadata={stoneStage:3,stoneShadowCaster:false};expect(retreatStoneShadowCasters([table,shell,core])).toEqual([table,shell]);expect(retreatStoneShadowCasters([table,shell,core],true)).toEqual([table]);});
 it('renders opaque RGBA stone with depth while retaining visibility fading',()=>{const scene=setup(),mesh=MeshBuilder.CreateBox('stone',{},scene);for(const material of [new PBRMaterial('pbr',scene),new StandardMaterial('distant',scene)]){mesh.material=material;mesh.visibility=1;mesh.hasVertexAlpha=true;expect(material.needAlphaBlendingForMesh(mesh)).toBe(true);applyRetreatStoneVertexOpacity(mesh);expect(material.needAlphaBlendingForMesh(mesh)).toBeFalsy();mesh.visibility=.25;expect(material.needAlphaBlendingForMesh(mesh)).toBe(true);}});
 it('keeps the landing dry after every native wave update and preserves offshore swell',()=>{
  const scene=setup(),root=new TransformNode('source-offset',scene);root.position.set(72,9,72);
  const sea=MeshBuilder.CreateGround('a1:bay-background',{width:360,height:360,subdivisions:36,updatable:true},scene);sea.parent=root;sea.position.set(28.5,-9.15,22);
  const raw=sea.getVerticesData('position')!;
  for(const height of [.5,1.9,4.95,-.8]){for(let i=1;i<raw.length;i+=3)raw[i]=height;sea.updateVerticesData('position',raw);keepRetreatLandingDry(sea);const p=sea.getVerticesData('position')!,world=sea.computeWorldMatrix(true);let offshore=0,protectedCount=0;
   for(let i=0;i<p.length;i+=3){const v=Vector3.TransformCoordinates(new Vector3(p[i]!,p[i+1]!,p[i+2]!),world);if(v.x>=0&&v.x<=175&&v.z>=43&&v.z<=132){expect(v.y).toBeLessThanOrEqual(.080001);protectedCount++;}else if(height>.5&&v.y>.5)offshore++;}
   expect(protectedCount).toBeGreaterThan(100);if(height>.5)expect(offshore).toBeGreaterThan(100);
  }
 });
 it('reports the real sea width without adding reflections',()=>{const scene=setup();MeshBuilder.CreateGround('a1:bay-background',{width:360,height:360},scene);expect(refineRetreatCoast(scene).stats.seaSpanMeters).toBe(360);});
 it('includes foreground rocks in the existing occlusion policy',()=>{const scene=setup();scene.activeCamera=new ArcRotateCamera('camera',Math.PI/2,1,100,Vector3.Zero(),scene);const depth=installRetreatScenicDepth(scene);const rocks=scene.meshes.filter(m=>m.metadata?.scenicLayer===1);expect(rocks).toHaveLength(3);expect(rocks.every(m=>m.metadata?.tokenOccluder===true&&m.metadata?.content==='VTT_AMBIENCE')).toBe(true);expect(depth.stats.totalMeshes).toBe(7);});
 it('toggles existing meshes without reparenting or losing disabled states',()=>{const scene=setup(),root=new TransformNode('authored-owner',scene);const mesh=MeshBuilder.CreateBox('a1:existing-wall',{},scene);mesh.parent=root;const disabled=MeshBuilder.CreateBox('a1:already-disabled',{},scene);disabled.setEnabled(false);const depth=installRetreatScenicDepth(scene);expect(depth.stats.existingSceneMeshes).toBe(2);depth.setLayerVisible(2,false);expect(mesh.isEnabled()).toBe(false);depth.setLayerVisible(2,true);expect(mesh.isEnabled()).toBe(true);expect(disabled.isEnabled()).toBe(false);expect(mesh.parent).toBe(root);expect(depth.stats.totalMeshes).toBe(7);});
 it('reuses the authored foreground without duplicate boxes or changing its parent',()=>{
  const scene=setup(),root=new TransformNode('gltf-axis-conversion',scene);root.position.set(12,3,8);root.scaling.set(1,1,-1);
  const rocks=['SW','Harbor','East'].map((key,i)=>{const m=MeshBuilder.CreateBox('Stone_Foreground_'+key,{},scene);m.parent=root;m.position.set(i*3,4,7);m.metadata={stoneStage:2};return m;});
  const before=rocks.map(m=>m.getAbsolutePosition().clone()),depth=installRetreatScenicDepth(scene);
  expect(scene.meshes.filter(m=>m.name.startsWith('FG_Rock_'))).toHaveLength(0);expect(depth.stats.foregroundElements).toBe(3);expect(depth.stats.totalMeshes).toBe(7);
  for(const [i,rock] of rocks.entries()){expect(rock.parent).toBe(root);expect(rock.getAbsolutePosition().equals(before[i]!)).toBe(true);expect(rock.metadata).toMatchObject({stoneStage:2,tokenOccluder:true,scenicLayer:1});}
  depth.setLayerVisible(1,false);expect(rocks.every(m=>!m.isEnabled())).toBe(true);depth.setLayerVisible(1,true);expect(rocks.every(m=>m.isEnabled())).toBe(true);
 });
 it('shares existing view sizes and keeps the current camera policy authoritative',()=>{expect(retreatViewSize('a3')).toEqual({width:15,depth:14,height:5});expect(retreatViewSize('a5')).toEqual(RETREAT_ZONE_VIEWS.a5!.size);expect(retreatViewSize(undefined,true)).toEqual({width:160,depth:76,height:33});expect(cameraProfileForScene('dragon-rest').stops).toEqual([5,10,15,20,25]);expect(terrainCameraBaseAlpha('dragon-rest')).toBeCloseTo(Math.PI/2);});
});
