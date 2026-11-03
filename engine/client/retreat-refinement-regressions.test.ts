import {describe,it,expect,afterEach} from 'vitest';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {TransformNode} from '@babylonjs/core/Meshes/transformNode.js';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder.js';
import {ArcRotateCamera} from '@babylonjs/core/Cameras/arcRotateCamera.js';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';
import {keepRetreatLandingDry,refineRetreatCoast} from '../../campaigns/stormwreck-isle/public/retreat-refinement-coast.js';
import {installRetreatScenicDepth} from '../../campaigns/stormwreck-isle/public/retreat-scenic-depth.js';
import {retreatViewSize,RETREAT_ZONE_VIEWS} from '../../campaigns/stormwreck-isle/public/retreat-camera-composition.js';
import {cameraProfileForScene} from '../shared/camera-profile.js';
import {terrainCameraBaseAlpha} from './camera-movement.js';
import {PBRMaterial} from '@babylonjs/core/Materials/PBR/pbrMaterial.js';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial.js';
import {applyRetreatStoneVertexOpacity} from '../../campaigns/stormwreck-isle/public/retreat-refinement-materials.js';
import {retreatStoneShadowCasters} from '../../campaigns/stormwreck-isle/public/retreat-refinement-lighting.js';
const engines:NullEngine[]=[];afterEach(()=>engines.splice(0).forEach(e=>e.dispose()));
function setup(){const engine=new NullEngine();engines.push(engine);return new Scene(engine);}
describe('Retiro · regresiones de presentación',()=>{
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
