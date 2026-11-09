import {afterEach,describe,expect,it} from 'vitest';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder.js';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial.js';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';
import {Ray} from '@babylonjs/core/Culling/ray.js';
import {installRetreatExpeditionSeams} from '../../campaigns/stormwreck-isle/public/retreat-expedition-seams.js';
import {retreatExcavationCutsMesh} from '../../campaigns/stormwreck-isle/public/retreat-local-occlusion.js';

const engines:NullEngine[]=[];
afterEach(()=>engines.splice(0).forEach(engine=>engine.dispose()));
function fixture(){
 const engine=new NullEngine();engines.push(engine);const scene=new Scene(engine);
 for(const name of ['R3_Expedition_Soil_R3_Meadow_Base','R3_Expedition_Meadow_R3_Grass','R3_Expedition_Meadow_R3_Grass_Light','R3_Expedition_Meadow_R3_Flower_Cream','R3_Expedition_Meadow_R3_Lavender','Stone_P3_Sculpted_Carved_Front_2']){
  const mesh=MeshBuilder.CreateBox(name,{size:1},scene);mesh.material=new StandardMaterial(name+':material',scene);
  mesh.metadata={gltf:{extras:{vttInterior:'upper-caves',vttCutaway:'wall',role:'context-rock'}},stoneStage:3};
 }
 return scene;
}
describe('Uniones de la explanada y la cueva A3',()=>{
 it('extends the existing meadow over the visible bare wedge without adding blocking objects',()=>{
  const scene=fixture(),result=installRetreatExpeditionSeams(scene),ground=scene.getMeshByName('retreat:expedition-meadow-edge')!;
  expect(result.meshes).toHaveLength(6);
  expect(ground.material).toBe(scene.getMeshByName('R3_Expedition_Soil_R3_Meadow_Base')!.material);
  expect(ground.metadata.retreatFloor).toBe(true);expect(ground.checkCollisions).toBe(false);
  const hit=new Ray(new Vector3(133,19,63.7),Vector3.Down(),2).intersectsMesh(ground);
  expect(hit.hit).toBe(true);expect(hit.pickedPoint!.y).toBeCloseTo(18.004,3);
  const plants=result.meshes.filter(m=>m.metadata.retreatExpeditionSeam==='grass');
  expect(plants).toHaveLength(4);expect(plants.every(m=>!m.isPickable&&!m.checkCollisions)).toBe(true);
  for(const plant of plants){const normals=plant.getVerticesData('normal')!;for(let i=0;i<normals.length;i+=3)expect(Math.hypot(normals[i]!,normals[i+1]!,normals[i+2]!)).toBeGreaterThan(.9);}
 });
 it('joins rock with the existing A3 cutaway and keeps the torch flame in front of the surface',()=>{
  const scene=fixture();installRetreatExpeditionSeams(scene);
  const wall=scene.getMeshByName('Stone_P3_Sculpted_Carved_Front_A3_Seam')!;
  expect(wall.material).toBe(scene.getMeshByName('Stone_P3_Sculpted_Carved_Front_2')!.material);
  expect(wall.checkCollisions).toBe(false);
  expect(retreatExcavationCutsMesh(wall,'a3',new Vector3(0,.2,1))).toBe(true);
  expect(retreatExcavationCutsMesh(wall,'a4',new Vector3(0,.2,1))).toBe(false);
  const beforeFlame=new Ray(new Vector3(130.2,20.25,63.44),new Vector3(0,0,-1),.09);
  expect(beforeFlame.intersectsMesh(wall).hit).toBe(false);
  const uv=wall.getVerticesData('uv')!,indices=wall.getIndices()!;
  for(let i=0;i<indices.length;i+=3){
   const a=indices[i]!*2,b=indices[i+1]!*2,c=indices[i+2]!*2;
   const area=Math.abs((uv[b]!-uv[a]!)*(uv[c+1]!-uv[a+1]!)-(uv[b+1]!-uv[a+1]!)*(uv[c]!-uv[a]!));
   expect(area).toBeGreaterThan(1e-7);
  }
 });
});
