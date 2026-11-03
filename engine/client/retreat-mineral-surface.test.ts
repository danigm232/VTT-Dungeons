import {describe,it,expect} from 'vitest';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder.js';
import {refineMineralSurface} from '../../campaigns/stormwreck-isle/public/retreat-mineral-surface.js';
describe('Retreat M1 presentation finish',()=>{
 it('preserves topology, metric UV, normals and world placement while adding opaque, deterministic mineral variation',()=>{
  const engine=new NullEngine(),scene=new Scene(engine),mesh=MeshBuilder.CreateBox('Stone_added-envelope',{width:5,height:4,depth:3},scene);mesh.position.set(10,1,20);mesh.metadata={stoneStage:3};
  const saved=Object.fromEntries(['position','normal','uv'].map(k=>[k,Array.from(mesh.getVerticesData(k)!)])),indices=Array.from(mesh.getIndices()!),matrix=Array.from(mesh.computeWorldMatrix(true).m);
  const first=refineMineralSurface(mesh)!;expect(first.vertices).toBe(mesh.getTotalVertices());expect(first.minTone).toBeGreaterThan(.65);expect(first.maxTone).toBeLessThanOrEqual(1);
  for(const k of Object.keys(saved))expect(Array.from(mesh.getVerticesData(k)!)).toEqual(saved[k]);expect(Array.from(mesh.getIndices()!)).toEqual(indices);expect(Array.from(mesh.computeWorldMatrix(true).m)).toEqual(matrix);
  const colors=Array.from(mesh.getVerticesData('color')!);expect(colors.filter((_,i)=>i%4===3).every(v=>v===1)).toBe(true);expect(mesh.hasVertexAlpha).toBe(false);expect(refineMineralSurface(mesh)).toBeNull();expect(Array.from(mesh.getVerticesData('color')!)).toEqual(colors);engine.dispose();
 });
 it('does not change the original cell meshes or unrelated geometry',()=>{
  const engine=new NullEngine(),scene=new Scene(engine);for(const [name,metadata]of [['a1:existing-cell',{stoneStage:3}],['other',{}]]as const){const mesh=MeshBuilder.CreateBox(name,{},scene);mesh.metadata=metadata;expect(refineMineralSurface(mesh)).toBeNull();expect(mesh.getVerticesData('color')).toBeNull();}engine.dispose();
 });
});
