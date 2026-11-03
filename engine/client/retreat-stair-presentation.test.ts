import {describe,it,expect} from 'vitest';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {Mesh} from '@babylonjs/core/Meshes/mesh.js';
import {VertexData} from '@babylonjs/core/Meshes/mesh.vertexData.js';
import {levelRetreatTempleSideStairs} from '../../campaigns/stormwreck-isle/public/retreat-stair-presentation.js';
describe('Temple side staircase tread repair',()=>{
 it('levels a banked tread and its duplicated riser seam without changing the route, indices or UVs',()=>{
  const engine=new NullEngine(),scene=new Scene(engine);try{
   const m=new Mesh('G2_Path_island-pleamar-high',scene),data=new VertexData();
   data.positions=[51,28,60,52.5,27.7,60,52.5,27.7,60.25,51,28,60.25,51,28,60,52.5,27.7,60,51,27.5,60];
   data.indices=[0,1,2,0,2,3,4,6,5];data.uvs=[0,0,1,0,1,1,0,1,0,0,1,0,0,1];data.applyToMesh(m);
   const xz=data.positions.filter((_,i)=>i%3!==1),ix=Array.from(m.getIndices()!),uv=Array.from(m.getVerticesData('uv')!),result=levelRetreatTempleSideStairs(m);
   expect(result?.changedTreads).toBe(1);expect(result?.maxShiftMeters).toBeCloseTo(.15,5);
   const p=Array.from(m.getVerticesData('position')!);for(const i of [0,1,2,3,4,5])expect(p[i*3+1]).toBeCloseTo(27.85,5);
   expect(p[19]).toBe(27.5);expect(p.filter((_,i)=>i%3!==1)).toEqual(xz);expect(Array.from(m.getIndices()!)).toEqual(ix);expect(Array.from(m.getVerticesData('uv')!)).toEqual(uv);
   expect(levelRetreatTempleSideStairs(m)).toBeNull();
  }finally{scene.dispose();engine.dispose();}
 });
 it('keeps the recalculated tread normals facing upward beneath the glTF mirrored root',()=>{
  const engine=new NullEngine(),scene=new Scene(engine);try{
   const m=new Mesh('G2_Path_island-pleamar-high',scene),data=new VertexData();
   // Right-handed authored top face, exactly as in the delivered glTF.
   m.scaling.z=-1;
   data.positions=[51,28,-60,54,27.5,-60,54,27.5,-60.25,51,28,-60.25];
   data.indices=[0,1,2,0,2,3];data.uvs=[0,0,1,0,1,1,0,1];data.applyToMesh(m);
   expect(levelRetreatTempleSideStairs(m)?.changedTreads).toBe(1);
   const normals=m.getVerticesData('normal')!;
   for(let i=1;i<normals.length;i+=3)expect(normals[i]).toBeGreaterThan(.999);
  }finally{scene.dispose();engine.dispose();}
 });
});
