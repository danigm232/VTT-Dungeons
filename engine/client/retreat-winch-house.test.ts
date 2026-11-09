import {afterEach,describe,expect,it} from 'vitest';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder.js';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial.js';
import {TransformNode} from '@babylonjs/core/Meshes/transformNode.js';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';
import {Ray} from '@babylonjs/core/Culling/ray.js';
import {installRetreatWinchHouse} from '../../campaigns/stormwreck-isle/public/retreat-winch-house.js';

const engines:NullEngine[]=[];
afterEach(()=>engines.splice(0).forEach(engine=>engine.dispose()));
function fixture(){
 const engine=new NullEngine();engines.push(engine);const scene=new Scene(engine);
 const wood=new StandardMaterial('Wood_Oiled_Used',scene),trim=new StandardMaterial('Wood_Endgrain',scene),rock=new StandardMaterial('Basalt_Carved_Matte',scene);
 const root=new TransformNode('mirrored-gltf-root',scene);root.scaling.z=-1;
 const definitions=[
  ['East_Wall',163.62,67,.30,4],['North_Wall',161.25,64.88,4.5,.30],['South_Wall',161.25,69.12,4.5,.30],
  ['West_Wall_North',158.88,66.325,.30,2.65],['West_Wall_South',158.88,68.925,.30,.15]
 ] as const;
 const walls=definitions.flatMap(([name,x,z,width,depth])=>['Base','Upper'].map(part=>{
  const lower=part==='Base',mesh=MeshBuilder.CreateBox(`${name}_${part}`,{width,height:lower?.55:2.23,depth},scene);
  mesh.parent=root;mesh.position.set(x,lower?15.255:16.645,-z);mesh.material=rock;mesh.checkCollisions=true;
  mesh.metadata={retreatZone:'a2',gltf:{extras:{globalZone:'a2',role:lower?'wall-base':'wall-upper'}}};mesh.computeWorldMatrix(true);return mesh;
 }));
 return {scene,walls,wood,trim};
}
const shot=(x:number,y:number,z:number,direction:Vector3)=>new Ray(new Vector3(x,y,z),direction,2);

describe('Casa de madera del cabrestante',()=>{
 it('cuts real window and cable openings through the wall while keeping its footprint and collision flag',()=>{
  const f=fixture(),before=f.walls.map(m=>({name:m.name,box:m.getBoundingInfo().boundingBox,collision:m.checkCollisions}));
  const bounds=before.map(({box})=>[...box.minimumWorld.asArray(),...box.maximumWorld.asArray()]);
  const result=installRetreatWinchHouse(f.scene);
  expect(result.installed).toBe(true);expect(result.records).toHaveLength(10);expect(result.meshes).toHaveLength(6);
  for(const [i,wall] of f.walls.entries()){
   expect(wall.material).toBe(f.wood);expect(wall.checkCollisions).toBe(before[i]!.collision);
   const b=wall.getBoundingInfo().boundingBox;
   [...b.minimumWorld.asArray(),...b.maximumWorld.asArray()].forEach((v,j)=>expect(v).toBeCloseTo(bounds[i]![j]!,4));
  }
  const south=f.walls.find(m=>m.name==='South_Wall_Upper')!,east=f.walls.find(m=>m.name==='East_Wall_Upper')!;
  expect(shot(162.3,16.5,70,Vector3.Forward().negate()).intersectsMesh(south).hit).toBe(false);
  expect(shot(160.8,17.315,70,Vector3.Forward().negate()).intersectsMesh(south).hit).toBe(false);
  expect(shot(160.8,16.5,70,Vector3.Forward().negate()).intersectsMesh(south).hit).toBe(true);
  expect(new Ray(new Vector3(160.8,16.5,69.13),Vector3.Right(),.04).intersectsMesh(south).hit).toBe(false);
  expect(shot(160.2,16.5,70,Vector3.Forward().negate()).intersectsMesh(south).hit).toBe(true);
  expect(shot(164.4,16.5,66.5,Vector3.Left()).intersectsMesh(east).hit).toBe(false);
  expect(shot(164.4,16.5,67.5,Vector3.Left()).intersectsMesh(east).hit).toBe(true);
  const glass=f.scene.getMeshByName('retreat:winch-south-window-glass')!;
  expect(shot(162.3,16.5,70,Vector3.Forward().negate()).intersectsMesh(glass).hit).toBe(true);
  expect(glass.isPickable||glass.checkCollisions).toBe(false);
  expect((glass.material as StandardMaterial).specularPower).toBeGreaterThan(64);
  expect((glass.material as StandardMaterial).emissiveFresnelParameters).toBeTruthy();
 });
 it('follows wall cutaway and restores both windows when the wall becomes visible again',()=>{
  const f=fixture(),result=installRetreatWinchHouse(f.scene),wall=f.walls.find(m=>m.name==='South_Wall_Upper')!;
  const south=result.meshes.filter(m=>m.metadata.retreatWinchWindowOwner===wall.name),east=result.meshes.filter(m=>m.metadata.retreatWinchWindowOwner==='East_Wall_Upper');
  wall.isVisible=false;result.sync();expect(south.every(m=>!m.isVisible)).toBe(true);expect(east.every(m=>m.isVisible)).toBe(true);
  wall.isVisible=true;wall.visibility=.18;result.sync();expect(south.every(m=>!m.isVisible)).toBe(true);
  wall.visibility=1;result.sync();expect(south.every(m=>m.isVisible)).toBe(true);
 });
 it('leaves the scene untouched when required source walls are missing',()=>{
  const f=fixture(),wall=f.walls[0]!,original=wall.material;f.walls[1]!.dispose();
  const result=installRetreatWinchHouse(f.scene);
  expect(result.installed).toBe(false);expect(result.meshes).toHaveLength(0);expect(wall.material).toBe(original);
 });
});
