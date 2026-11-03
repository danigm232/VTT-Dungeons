import {describe,expect,it} from 'vitest';
import {VertexData} from '@babylonjs/core/Meshes/mesh.vertexData.js';
import '@babylonjs/core/Meshes/Builders/groundBuilder.js';
import {createCoastalNormalUpdater} from './coastal-normals.js';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {TransformNode} from '@babylonjs/core/Meshes/transformNode.js';
import {createCoastalBackdrop} from './coastal-backdrop.js';

describe('Coastal normals · identical fixed-topology calculation',()=>{
 it.each([36,56])('matches every Float32 normal of %i-subdivision animated water, including deformations on all axes',(subdivisions)=>{
  const data=VertexData.CreateGround({width:360,height:360,subdivisions}),p=Float32Array.from(data.positions!),original=p.slice(),expected=new Float32Array(p.length),actual=new Float32Array(p.length),indices=Uint32Array.from(data.indices!),saved=indices.slice(),updater=createCoastalNormalUpdater(indices,p.length/3);
  for(let step=0;step<32;step++){
   const t=step*.273;
   for(let i=0;i<p.length;i+=3){const x=original[i]!,z=original[i+2]!;p[i]=x+Math.sin(t+x*.1)*.1;p[i+1]=Math.sin(x*.038+z*.082-t*1.45)*2+Math.cos(z*.17+t)*.3;p[i+2]=z+Math.cos(t+z*.1)*.2;}
   VertexData.ComputeNormals(p,indices,expected);updater.update(p,actual);expect(actual).toEqual(expected);
  }
  expect(indices).toEqual(saved);expect(updater.topologyBytes).toBe(indices.byteLength);
 });
 it('retains face order, degenerate faces, disconnected vertices and mirrored winding',()=>{
  const p=Float32Array.from([0,0,0,4,1,0,0,2,3,5,0,4,11,12,13]),indices=[0,1,2,2,1,3,0,0,1,3,1,2],expected=new Float32Array(p.length),actual=new Float32Array(p.length),updater=createCoastalNormalUpdater(indices,p.length/3);
  for(const scale of [1,-1,0,.000001]){for(let i=1;i<p.length;i+=3)p[i]=p[i]!*scale;VertexData.ComputeNormals(p,indices,expected);updater.update(p,actual);expect(actual).toEqual(expected);}
 });
 it('owns only the original topology and refuses changed buffer sizes',()=>{
  const indices=[0,1,2],updater=createCoastalNormalUpdater(indices,3),p=Float32Array.from([0,0,0,1,0,0,0,0,1]),expected=new Float32Array(9),actual=new Float32Array(9);
  VertexData.ComputeNormals(p,indices,expected);indices.reverse();updater.update(p,actual);expect(actual).toEqual(expected);expect(()=>updater.update(new Float32Array(6),actual)).toThrow('buffer size');
 });
 it('preserves the missing foam normal channel and calculates exact normals if that channel is added later',()=>{
  const engine=new NullEngine(),scene=new Scene(engine),root=new TransformNode('root',scene);
  try{
   const backdrop=createCoastalBackdrop(scene,root,''),foam=root.getChildMeshes().find(m=>m.name==='a1:shore-wash')!,stats=backdrop.sea.metadata.coastalAnimation,waterBytes=backdrop.sea.getTotalIndices()*4;
   backdrop.update(1,.2,.8);expect(foam.getVerticesData('normal')).toBeNull();expect(stats.normalTopologyBytes).toBe(waterBytes);
   foam.setVerticesData('normal',new Float32Array(foam.getTotalVertices()*3),true);backdrop.update(2,.2,.8);
   const expected=new Float32Array(foam.getTotalVertices()*3);VertexData.ComputeNormals(foam.getVerticesData('position')!,foam.getIndices()!,expected);
   expect(foam.getVerticesData('normal')).toEqual(expected);expect(stats.normalTopologyBytes).toBe(waterBytes+foam.getTotalIndices()*4);
  }finally{scene.dispose();engine.dispose();}
 });
});
