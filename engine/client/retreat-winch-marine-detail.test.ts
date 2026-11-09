import {describe,it,expect} from 'vitest';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder.js';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial.js';
import {installRetreatWinchSeaRocks,RETREAT_WINCH_SEA_FIN_NAMES} from '../../campaigns/stormwreck-isle/public/retreat-winch-sea-rocks.js';
import {installRetreatWinchMarineDetail} from '../../campaigns/stormwreck-isle/public/retreat-winch-marine-detail.js';

describe('Detalles marinos de A2',()=>{
 it('attaches small decorative batches to the outcrops and reuses the native foam',()=>{
  const engine=new NullEngine(),scene=new Scene(engine),stone=new StandardMaterial('a1:coastal-cliff-v10',scene),foam=new StandardMaterial('a1:shore-wash-v2',scene);
  for(const name of RETREAT_WINCH_SEA_FIN_NAMES){const m=MeshBuilder.CreateBox(name,{},scene);m.material=stone;}
  const rocks=installRetreatWinchSeaRocks(scene).meshes[0]!,sea=MeshBuilder.CreateGround('sea',{width:400,height:400,subdivisions:4,updatable:true},scene);
  const detail=installRetreatWinchMarineDetail(scene,sea,rocks)!;
  expect(detail.meshes).toHaveLength(3);expect(detail.stats.shellTriangles).toBeGreaterThan(0);expect(detail.stats.algaeTriangles).toBeGreaterThan(0);expect(detail.stats.foamPatches).toBeGreaterThan(0);
  expect(detail.meshes[2]!.material).toBe(foam);expect(detail.meshes.every(m=>!m.isPickable&&!m.checkCollisions)).toBe(true);
  detail.update(1);const colors=detail.meshes[2]!.getVerticesData('color')!,positions=detail.meshes[2]!.getVerticesData('position')!;
  expect(colors.some((value,i)=>i%4===3&&value>.1)).toBe(true);expect(positions.some((value,i)=>i%3===1&&value>0)).toBe(true);
  scene.dispose();engine.dispose();
 });
});
