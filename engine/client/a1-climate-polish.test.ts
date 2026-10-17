import {describe,expect,it} from 'vitest';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {ArcRotateCamera} from '@babylonjs/core/Cameras/arcRotateCamera.js';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';
import {createCampVisuals} from '../../campaigns/camp-rests/public/visuals.js';
import {campRestsPublicCampaign} from '../../campaigns/camp-rests/public/pack.js';
import {A1_PLAZA_CELLS,A1_ROOMS,a1IsWalkable} from '../../campaigns/camp-rests/public/a1-layout.js';
describe('A1: continuidad, escultura, laterales y mar',()=>{
 it('prolonga el pavimento, conserva límites y mantiene laterales desde el frente',()=>{
  const engine=new NullEngine(),scene=new Scene(engine);
  try{
   const camera=new ArcRotateCamera('test',Math.PI/2,Math.PI/4,20,new Vector3(8,0,13),scene);scene.activeCamera=camera;
   const v=createCampVisuals(scene,campRestsPublicCampaign.scenes[0]!)!;
   const room=A1_ROOMS[0]!;camera.setPosition(new Vector3(10,15,32));camera.getViewMatrix(true);
   for(let i=0;i<100;i++)v.update(i/20,'night',[],room.interaction);
   for(const side of [1,2])for(const m of scene.meshes.filter(m=>m.name.startsWith(`a1:room-1:face-${side}`)))expect(m.scaling.y).toBeGreaterThan(.95);
   const front=scene.meshes.filter(m=>m.name.startsWith('a1:room-1:face-3:'));expect(front.length).toBeGreaterThan(0);expect(front.every(m=>m.scaling.y<.1)).toBe(true);
   expect(a1IsWalkable({col:0,row:13})).toBe(false);expect(a1IsWalkable({col:48,row:13})).toBe(false);
   expect(A1_PLAZA_CELLS.length).toBeGreaterThan(200);
   expect(scene.getMeshByName('a1:astalagan-sculpted-stone')!.getTotalVertices()).toBeGreaterThan(3000);
   expect(scene.getLightByName('a1:statue-votive-light')!.includedOnlyMeshes.some(m=>m.name==='a1:astalagan-sculpted-stone')).toBe(true);
  }finally{scene.dispose();engine.dispose();}
 },30000);
 it('cambia altura del oleaje sin elevar el nivel del mar a la terraza',()=>{
  const engine=new NullEngine(),scene=new Scene(engine);
  try{const v=createCampVisuals(scene,campRestsPublicCampaign.scenes[0]!)!,sea=scene.getMeshByName('a1:bay-background')!;
   const env={storm:false,lightning:false,stormIntensity:0};
   v.update(1,'arrival',[],null,{...env,seaIntensity:0});const calm=sea.getVerticesData('position')!.filter((_,i)=>i%3===1);
   v.update(2,'arrival',[],null,{...env,seaIntensity:1});const rough=sea.getVerticesData('position')!.filter((_,i)=>i%3===1);
   expect(Math.max(...rough)-Math.min(...rough)).toBeGreaterThan((Math.max(...calm)-Math.min(...calm))*4);
   expect(sea.position.y).toBeLessThan(-8);expect(sea.metadata.seaIntensity).toBe(1);
  }finally{scene.dispose();engine.dispose();}
 },30000);
});
