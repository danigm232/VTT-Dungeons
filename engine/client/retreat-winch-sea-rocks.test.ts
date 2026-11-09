import {afterEach,describe,expect,it} from 'vitest';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder.js';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial.js';
import {Ray} from '@babylonjs/core/Culling/ray.js';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';
import {installRetreatWinchSeaRocks,RETREAT_WINCH_SEA_FIN_NAMES,RETREAT_WINCH_SEA_ROCKS} from '../../campaigns/stormwreck-isle/public/retreat-winch-sea-rocks.js';

const engines:NullEngine[]=[];
afterEach(()=>engines.splice(0).forEach(engine=>engine.dispose()));
function fixture(){
 const engine=new NullEngine();engines.push(engine);const scene=new Scene(engine);
 const material=new StandardMaterial('a1:coastal-cliff-v10',scene);
 for(const name of RETREAT_WINCH_SEA_FIN_NAMES){const mesh=MeshBuilder.CreateBox(name,{size:1},scene);mesh.material=material;}
 for(const name of ['Stone_P3_Winch_Embedded_Rock_Headland','Stone_P8_East_Stair_Embedded_Bedrock','CANON_Suspended_Wooden_Pallet_primitive0'])
  MeshBuilder.CreateBox(name,{size:1},scene);
 return {scene,material};
}

describe('Rocas marinas junto al cabrestante A2',()=>{
 it('replaces only the named visual fins with a single non-blocking basalt batch',()=>{
  const {scene,material}=fixture(),result=installRetreatWinchSeaRocks(scene),rocks=scene.getMeshByName('retreat:a2-sea-outcrops')!;
  expect(result.installed).toBe(true);expect(result.retired).toEqual([...RETREAT_WINCH_SEA_FIN_NAMES]);
  for(const name of RETREAT_WINCH_SEA_FIN_NAMES)expect(scene.getMeshByName(name)!.isEnabled()).toBe(false);
  for(const name of ['Stone_P3_Winch_Embedded_Rock_Headland','Stone_P8_East_Stair_Embedded_Bedrock','CANON_Suspended_Wooden_Pallet_primitive0'])expect(scene.getMeshByName(name)!.isEnabled()).toBe(true);
  expect(result.meshes).toHaveLength(1);expect(rocks.material).toBe(material);expect(rocks.subMeshes).toHaveLength(1);
  expect(rocks.isPickable).toBe(false);expect(rocks.checkCollisions).toBe(false);expect(rocks.metadata.retreatFloor).toBe(false);
  expect(rocks.metadata.content).toBe('VTT_AMBIENCE');expect(installRetreatWinchSeaRocks(scene).meshes).toEqual([rocks]);
 });
 it('keeps the complete load shaft clear and lets each rock break the sea surface',()=>{
  const {scene}=fixture();installRetreatWinchSeaRocks(scene);
  const rocks=scene.getMeshByName('retreat:a2-sea-outcrops')!;
  for(let x=159.7;x<=161.9;x+=.2)for(let z=69.4;z<=70.9;z+=.2)
   expect(new Ray(new Vector3(x,15,z),Vector3.Down(),18).intersectsMesh(rocks).hit).toBe(false);
  for(const spec of RETREAT_WINCH_SEA_ROCKS){
   const hit=new Ray(new Vector3(spec.x,6,spec.z),Vector3.Down(),12).intersectsMesh(rocks);
   expect(hit.hit).toBe(true);expect(hit.pickedPoint!.y).toBeGreaterThan(.3);
  }
  const bounds=rocks.getBoundingInfo().boundingBox;expect(bounds.minimumWorld.y).toBeLessThan(-1);expect(bounds.maximumWorld.y).toBeGreaterThan(2);
 });
 it('leaves the original scene intact when a source mesh or material is missing',()=>{
  const {scene}=fixture();scene.getMeshByName(RETREAT_WINCH_SEA_FIN_NAMES[2])!.dispose();
  const result=installRetreatWinchSeaRocks(scene);expect(result.installed).toBe(false);
  expect(scene.getMeshByName(RETREAT_WINCH_SEA_FIN_NAMES[0])!.isEnabled()).toBe(true);
  expect(scene.getMeshByName(RETREAT_WINCH_SEA_FIN_NAMES[1])!.isEnabled()).toBe(true);
  expect(scene.getMeshByName('retreat:a2-sea-outcrops')).toBeNull();
 });
});
