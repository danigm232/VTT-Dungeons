import type {AbstractMesh} from '@babylonjs/core/Meshes/abstractMesh.js';
import type {Geometry} from '@babylonjs/core/Meshes/geometry.js';
import {Mesh} from '@babylonjs/core/Meshes/mesh.js';
import {InstancedMesh} from '@babylonjs/core/Meshes/instancedMesh.js';
import {Matrix,Vector3} from '@babylonjs/core/Maths/math.vector.js';
import {Ray} from '@babylonjs/core/Culling/ray.js';

type BufferData=NonNullable<ReturnType<Mesh['getVerticesData']>>;
type IndexData=NonNullable<ReturnType<Mesh['getIndices']>>;
type Tree={positions:BufferData;indices:IndexData;positionBuffer:ReturnType<Mesh['getVertexBuffer']>;indexBuffer:ReturnType<Geometry['getIndexBuffer']>;epsilon:number;order:Uint32Array;bounds:Float64Array;nodes:Int32Array;bytes:number};
const MIN_TRIANGLES=512,LEAF_TRIANGLES=24;

/** Unlike Babylon's broad-phase box test, this also rejects boxes beyond the
 * finite body sight segment. Triangle tests keep Babylon's exact semantics. */
function segmentBox(ray:Ray,bounds:Float64Array,at:number){
 let near=0,far=ray.length;
 for(let axis=0;axis<3;axis++){
  const origin=axis===0?ray.origin.x:axis===1?ray.origin.y:ray.origin.z,direction=axis===0?ray.direction.x:axis===1?ray.direction.y:ray.direction.z,min=bounds[at+axis]!,max=bounds[at+axis+3]!;
  if(direction===0){if(origin<min||origin>max)return false;continue;}
  let a=(min-origin)/direction,b=(max-origin)/direction;if(a>b){const swap=a;a=b;b=swap;}near=Math.max(near,a);far=Math.min(far,b);if(near>far)return false;
 }
 return far>=0;
}

/** CPU-only spatial index for the existing O1 yes/no sight queries. No render
 * meshes, submeshes, materials, colliders or GPU buffers are added or changed.
 * Dynamic/deformed geometry and partial material ranges keep Babylon's path. */
export function createRetreatOcclusionQueries(){
 let cache=new WeakMap<Geometry,Tree>();
 const inverse=Matrix.Identity(),localRay=new Ray(Vector3.Zero(),Vector3.Forward()),a=Vector3.Zero(),b=Vector3.Zero(),c=Vector3.Zero(),stack:number[]=[];
 const stats={queries:0,acceleratedQueries:0,fallbackQueries:0,triangleTests:0,boxTests:0,treeBuilds:0,indexedGeometries:0,treeBytes:0,buildMs:0};
 function eligible(mesh:AbstractMesh){
  const source=mesh instanceof InstancedMesh?mesh.sourceMesh:mesh instanceof Mesh?mesh:null;
  // The index is local to immutable vertices, not to a frozen world matrix.
  // Doors/instances may move: every query uses their current exact transform.
  if(!source||/LinesMesh|GreasedLineMesh/.test(source.getClassName())||source.skeleton||source.morphTargetManager||source.bakedVertexAnimationManager||source.isUnIndexed)return null;
  const buffer=source.getVertexBuffer('position'),indices=source.getIndices(),sub=mesh.subMeshes?.[0];
  if(!buffer||buffer.isUpdatable()||!indices||indices.length%3||indices.length/3<MIN_TRIANGLES||mesh.subMeshes.length!==1||!sub||sub.indexStart!==0||sub.indexCount!==indices.length||sub.getMaterial()?.fillMode!==0)return null;
  return source;
 }
 function build(source:Mesh,epsilon:number){
  const positions=source.getVerticesData('position')!,indices=source.getIndices()!,count=indices.length/3,order=Uint32Array.from({length:count},(_,i)=>i),centers=new Float64Array(count*3),triBounds=new Float64Array(count*6),bounds:number[]=[],nodes:number[]=[];
  for(let t=0;t<count;t++)for(let axis=0;axis<3;axis++){
   const x=positions[indices[t*3]!*3+axis]!,y=positions[indices[t*3+1]!*3+axis]!,z=positions[indices[t*3+2]!*3+axis]!;
   // Babylon accepts barycentric coordinates just beyond triangle edges. Pad
   // the broad phase conservatively by that SAME epsilon, including long faces.
   const pad=2*epsilon*(Math.abs(y-x)+Math.abs(z-x))+1e-7;
   triBounds[t*6+axis]=Math.min(x,y,z)-pad;triBounds[t*6+axis+3]=Math.max(x,y,z)+pad;centers[t*3+axis]=(x+y+z)/3;
  }
  function node(start:number,end:number):number{
   const id=nodes.length/4,min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
   for(let i=start;i<end;i++){const t=order[i]!*6;for(let axis=0;axis<3;axis++){min[axis]=Math.min(min[axis]!,triBounds[t+axis]!);max[axis]=Math.max(max[axis]!,triBounds[t+axis+3]!);}}
   bounds.push(...min,...max);nodes.push(-1,-1,start,end-start);
   if(end-start>LEAF_TRIANGLES){const spans=max.map((v,i)=>v-min[i]!),axis=spans.indexOf(Math.max(...spans)),middle=(start+end)>>>1;order.subarray(start,end).sort((a,b)=>centers[a*3+axis]!-centers[b*3+axis]!);const left=node(start,middle),right=node(middle,end);nodes[id*4]=left;nodes[id*4+1]=right;nodes[id*4+3]=0;}
   return id;
  }
  node(0,count);
  const tree={positions,indices,positionBuffer:source.getVertexBuffer('position'),indexBuffer:source.geometry!.getIndexBuffer(),epsilon,order,bounds:Float64Array.from(bounds),nodes:Int32Array.from(nodes),bytes:0};
  tree.bytes=tree.order.byteLength+tree.bounds.byteLength+tree.nodes.byteLength;
  return tree;
 }
 function treeFor(source:Mesh,epsilon=.001){
  const geometry=source.geometry!,previous=cache.get(geometry);
  if(previous&&previous.positionBuffer===source.getVertexBuffer('position')&&previous.indexBuffer===geometry.getIndexBuffer()&&previous.epsilon>=epsilon)return previous;
  const start=performance.now(),tree=build(source,epsilon);cache.set(geometry,tree);stats.buildMs+=performance.now()-start;stats.treeBuilds++;if(!previous)stats.indexedGeometries++;stats.treeBytes+=tree.bytes-(previous?.bytes??0);return tree;
 }
 function intersects(ray:Ray,mesh:AbstractMesh){
  stats.queries++;const source=eligible(mesh);
  if(!source||!Number.isFinite(ray.epsilon)){stats.fallbackQueries++;return ray.intersectsMesh(mesh,true).hit;}
  stats.acceleratedQueries++;
  mesh.getWorldMatrix().invertToRef(inverse);Ray.TransformToRef(ray,inverse,localRay);
  const bounding=mesh.getBoundingInfo();if(!localRay.intersectsSphere(bounding.boundingSphere)||!localRay.intersectsBox(bounding.boundingBox))return false;
  const tree=treeFor(source,Math.abs(localRay.epsilon));stack.length=0;stack.push(0);
  while(stack.length){const id=stack.pop()!,at=id*6;stats.boxTests++;if(!segmentBox(localRay,tree.bounds,at))continue;
   const n=id*4,left=tree.nodes[n]!;if(left>=0){stack.push(tree.nodes[n+1]!,left);continue;}
   const start=tree.nodes[n+2]!,end=start+tree.nodes[n+3]!;
   for(let i=start;i<end;i++){const triangle=tree.order[i]!*3;Vector3.FromArrayToRef(tree.positions,tree.indices[triangle]!*3,a);Vector3.FromArrayToRef(tree.positions,tree.indices[triangle+1]!*3,b);Vector3.FromArrayToRef(tree.positions,tree.indices[triangle+2]!*3,c);stats.triangleTests++;if(localRay.intersectsTriangle(a,b,c))return true;}
  }
  return false;
 }
 return {intersects,prepare(meshes:AbstractMesh[]){for(const mesh of meshes){if(!mesh.isEnabled())continue;const source=eligible(mesh);if(source)treeFor(source);}},stats,dispose(){cache=new WeakMap();stack.length=0;stats.treeBytes=0;stats.indexedGeometries=0;}};
}
