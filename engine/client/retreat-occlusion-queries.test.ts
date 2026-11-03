import {afterEach,describe,expect,it} from 'vitest';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder.js';
import {Mesh} from '@babylonjs/core/Meshes/mesh.js';
import {SubMesh} from '@babylonjs/core/Meshes/subMesh.js';
import {VertexData} from '@babylonjs/core/Meshes/mesh.vertexData.js';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial.js';
import {TransformNode} from '@babylonjs/core/Meshes/transformNode.js';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';
import {Ray} from '@babylonjs/core/Culling/ray.js';
import {createRetreatOcclusionQueries} from '../../campaigns/stormwreck-isle/public/retreat-occlusion-queries.js';
const engines:NullEngine[]=[];afterEach(()=>engines.splice(0).forEach(e=>e.dispose()));
function fixture(){const engine=new NullEngine();engines.push(engine);return new Scene(engine);}
describe('Retiro · exact accelerated O1 sight queries',()=>{
 it('matches Babylon on finite rays, misses and nonuniform mirrored/rotated geometry without modifying any render data',()=>{
  const scene=fixture(),root=new TransformNode('gltf-root',scene),mesh=MeshBuilder.CreateSphere('static-rock',{segments:40,diameter:12},scene);root.position.set(17,9,30);root.scaling.set(-1,1.7,.65);root.rotation.set(.1,.4,.2);mesh.parent=root;mesh.material=new StandardMaterial('unchanged',scene);mesh.freezeWorldMatrix(mesh.computeWorldMatrix(true));
  const colors=Array.from({length:mesh.getTotalVertices()},()=>[.3,.4,.5,1]).flat();mesh.setVerticesData('color',colors);const before={positions:Array.from(mesh.getVerticesData('position')!),indices:Array.from(mesh.getIndices()!),normal:Array.from(mesh.getVerticesData('normal')!),uv:Array.from(mesh.getVerticesData('uv')!),geometry:mesh.geometry,material:mesh.material,subMeshes:[...mesh.subMeshes],meshes:scene.meshes.length,geometries:scene.geometries.length};
  const query=createRetreatOcclusionQueries();query.prepare([mesh]);let seed=314159,hits=0,misses=0;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<1200;i++){const origin=new Vector3(17+(random()-.5)*45,9+(random()-.5)*45,30+(random()-.5)*45),target=new Vector3(17+(random()-.5)*16,9+(random()-.5)*20,30+(random()-.5)*13),direction=target.subtract(origin),distance=direction.length(),ray=new Ray(origin,direction.normalize(),i%3===0?distance*.35:distance*1.2);ray.epsilon=i%7===0?.01:.001;const expected=ray.intersectsMesh(mesh,false).hit,actual=query.intersects(ray,mesh);expect(actual,`ray${i}`).toBe(expected);if(expected)hits++;else misses++;}
  expect(hits).toBeGreaterThan(100);expect(misses).toBeGreaterThan(100);expect(query.stats.acceleratedQueries).toBe(1200);expect(query.stats.triangleTests).toBeLessThan(1200*mesh.getTotalIndices()/3/8);expect(scene.meshes.length).toBe(before.meshes);expect(scene.geometries.length).toBe(before.geometries);expect(mesh.geometry).toBe(before.geometry);expect(mesh.material).toBe(before.material);expect(mesh.subMeshes).toEqual(before.subMeshes);for(const [key,expected]of [['position',before.positions],['normal',before.normal],['uv',before.uv],['color',colors]] as const)expect(Array.from(mesh.getVerticesData(key)!)).toEqual(expected);expect(Array.from(mesh.getIndices()!)).toEqual(before.indices);
 });
 it('retains edge epsilon and exact endpoint behavior on very long coplanar triangles',()=>{
  const scene=fixture(),mesh=new Mesh('large-edges',scene),data=new VertexData(),positions:number[]=[],indices:number[]=[];
  for(let i=0;i<600;i++){const n=positions.length/3,x=i*400;positions.push(x,0,0,x+100,0,0,x,0,100);indices.push(n,n+1,n+2);}data.positions=positions;data.indices=indices;data.applyToMesh(mesh);mesh.material=new StandardMaterial('solid',scene);mesh.freezeWorldMatrix();const query=createRetreatOcclusionQueries();
  for(const x of [0,-.05,-.099,50,100.05])for(const length of [9.999,10,10.001]){const ray=new Ray(new Vector3(x,10,50),Vector3.Down(),length);expect(query.intersects(ray,mesh)).toBe(ray.intersectsMesh(mesh,false).hit);}
  for(const triangle of [5,17,36,72,149,299,598])for(const length of [9.999,10,10.001]){const ray=new Ray(new Vector3(triangle*400+100.05,10,.025),Vector3.Down(),length);expect(query.intersects(ray,mesh)).toBe(ray.intersectsMesh(mesh,false).hit);}
  expect(query.stats.acceleratedQueries).toBe(36);
 });
 it('shares the immutable geometry index across instances while honoring each exact world transform',()=>{
  const scene=fixture(),mesh=MeshBuilder.CreateSphere('source',{segments:24,diameter:4},scene);mesh.position.set(0,0,0);mesh.material=new StandardMaterial('same',scene);mesh.freezeWorldMatrix();const instance=mesh.createInstance('instance');instance.position.set(30,10,5);instance.scaling.set(2,.5,-3);instance.freezeWorldMatrix(instance.computeWorldMatrix(true));const query=createRetreatOcclusionQueries();query.prepare([mesh,instance]);expect(query.stats.indexedGeometries).toBe(1);
  for(const target of [new Vector3(0,0,0),new Vector3(30,10,5),new Vector3(27,11,8)])for(const object of [mesh,instance]){const ray=new Ray(target.add(new Vector3(0,0,20)),new Vector3(0,0,-1),22);expect(query.intersects(ray,object)).toBe(ray.intersectsMesh(object,false).hit);}
  expect(query.stats.treeBuilds).toBe(1);query.dispose();expect(query.stats.treeBytes).toBe(0);expect(mesh.getTotalVertices()).toBeGreaterThan(0);
 });
 it('reuses local geometry through moving door-style transforms without stale world bounds',()=>{
  const scene=fixture(),mesh=MeshBuilder.CreateSphere('moving-solid',{segments:24,diameter:4},scene);mesh.material=new StandardMaterial('same',scene);const query=createRetreatOcclusionQueries();
  for(const [x,y,z,scale]of [[0,0,0,1],[30,15,10,.6],[-12,3,5,-2]]){mesh.position.set(x!,y!,z!);mesh.scaling.set(scale!,1,1.5);mesh.rotation.y=x!*.02;mesh.computeWorldMatrix(true);const ray=new Ray(new Vector3(x!,y!,z!+20),new Vector3(0,0,-1),25);expect(query.intersects(ray,mesh)).toBe(ray.intersectsMesh(mesh,false).hit);}
  expect(query.stats.acceleratedQueries).toBe(3);expect(query.stats.treeBuilds).toBe(1);
 });
 it('preserves line-picking thickness instead of treating a large line system as triangles',()=>{
  const scene=fixture(),lines=MeshBuilder.CreateLineSystem('lines',{lines:Array.from({length:900},(_,i)=>[new Vector3(0,0,i*.1),new Vector3(1,0,i*.1)])},scene),query=createRetreatOcclusionQueries(),ray=new Ray(new Vector3(.5,4,5),Vector3.Down(),5);lines.computeWorldMatrix(true);
  expect(query.intersects(ray,lines)).toBe(ray.intersectsMesh(lines,false).hit);expect(query.stats.fallbackQueries).toBe(1);expect(query.stats.treeBuilds).toBe(0);
 });
 it('keeps changing/partial geometry on Babylon and refreshes an index when the immutable position buffer is replaced',()=>{
  const scene=fixture(),mesh=MeshBuilder.CreateSphere('editable',{segments:24,diameter:4,updatable:true},scene);mesh.material=new StandardMaterial('mat',scene);mesh.freezeWorldMatrix();const query=createRetreatOcclusionQueries(),ray=new Ray(new Vector3(0,0,10),new Vector3(0,0,-1),20);expect(query.intersects(ray,mesh)).toBe(ray.intersectsMesh(mesh,false).hit);expect(query.stats.fallbackQueries).toBe(1);
  const p=mesh.getVerticesData('position')!;for(let i=0;i<p.length;i+=3)p[i]!+=30;mesh.setVerticesData('position',p,false);mesh.refreshBoundingInfo();expect(query.intersects(ray,mesh)).toBe(false);expect(query.stats.treeBuilds).toBe(0);
  const shifted=new Ray(new Vector3(30,0,10),new Vector3(0,0,-1),20);expect(query.intersects(shifted,mesh)).toBe(true);expect(query.stats.treeBuilds).toBe(1);
  const changed=mesh.getVerticesData('position')!;for(let i=0;i<changed.length;i+=3)changed[i]!+=30;mesh.setVerticesData('position',changed,false);mesh.refreshBoundingInfo();const second=new Ray(new Vector3(60,0,10),new Vector3(0,0,-1),20);expect(query.intersects(second,mesh)).toBe(true);expect(query.stats.treeBuilds).toBe(2);
  const first=mesh.subMeshes[0]!;first.indexCount=3;expect(query.intersects(second,mesh)).toBe(second.intersectsMesh(mesh,false).hit);expect(query.stats.fallbackQueries).toBe(2);
  mesh.releaseSubMeshes();SubMesh.CreateFromIndices(0,0,mesh.getTotalIndices()/2,mesh);SubMesh.CreateFromIndices(0,mesh.getTotalIndices()/2,mesh.getTotalIndices()/2,mesh);expect(query.intersects(second,mesh)).toBe(second.intersectsMesh(mesh,false).hit);expect(query.stats.fallbackQueries).toBe(3);
 });
});
