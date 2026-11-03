import {Mesh} from '@babylonjs/core/Meshes/mesh.js';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';
import {VertexData} from '@babylonjs/core/Meshes/mesh.vertexData.js';

/** Correct the transverse bank of the delivered lateral temple staircase.
 * Its G2 builder flattened each tread along the ascent but retained a lateral
 * terrain gradient. Level the existing tread face at its midpoint height and
 * move matching riser/side vertices with it. X/Z, UVs, indices, landings,
 * navigation and the original GLB remain unchanged. Run once, before freezing. */
export function levelRetreatTempleSideStairs(mesh:Mesh){
 if(!/^G2_Path_island-pleamar-high(?:_R3_primitive0)?$/.test(mesh.name)||mesh.metadata?.retreatLeveledTreads)return null;
 const positions=mesh.getVerticesData('position'),indices=mesh.getIndices();if(!positions||!indices)return null;
 const world=mesh.computeWorldMatrix(true),inverse=world.clone().invert(),points:Vector3[]=[];
 for(let i=0;i<positions.length;i+=3)points.push(Vector3.TransformCoordinates(Vector3.FromArray(positions,i),world));
 const groups=new Map<string,Set<number>>();
 for(let i=0;i<indices.length;i+=3){
  const ids=[indices[i]!,indices[i+1]!,indices[i+2]!],p=ids.map(id=>points[id]!);
  const x0=Math.min(...p.map(p=>p.x)),x1=Math.max(...p.map(p=>p.x)),z0=Math.min(...p.map(p=>p.z)),z1=Math.max(...p.map(p=>p.z));
  if(x0<51-.001||x1>54+.001||z0<55.5-.001||z1>64.5+.001||Math.min(...p.map(p=>p.y))<25.5||z1-z0<.12||z1-z0>.3)continue;
  const normal=Vector3.Cross(p[1]!.subtract(p[0]!),p[2]!.subtract(p[0]!));if(Math.abs(normal.y)<normal.length()*.8)continue;
  const key=z0.toFixed(4)+':'+z1.toFixed(4),group=groups.get(key)??new Set<number>();for(const id of ids)group.add(id);groups.set(key,group);
 }
 const key=(p:Vector3)=>p.asArray().map(v=>v.toFixed(5)).join(','),replacements=new Map<string,number>();let changedTreads=0,maxShift=0;
 for(const ids of groups.values()){
  const ys=[...ids].map(id=>points[id]!.y),low=Math.min(...ys),high=Math.max(...ys);if(high-low<1e-5)continue;
  const height=(low+high)/2;changedTreads++;
  for(const id of ids){const p=points[id]!;maxShift=Math.max(maxShift,Math.abs(p.y-height));replacements.set(key(p),height);}
 }
 if(!changedTreads)return null;
 const output=Array.from(positions);let changedVertices=0;
 points.forEach((p,i)=>{const height=replacements.get(key(p));if(height===undefined)return;const local=Vector3.TransformCoordinates(new Vector3(p.x,height,p.z),inverse);output[i*3]=local.x;output[i*3+1]=local.y;output[i*3+2]=local.z;changedVertices++;});
 mesh.makeGeometryUnique();mesh.setVerticesData('position',output);
 // The imported glTF retains its right-handed winding below the mirrored
 // conversion root. Babylon's default left-handed recomputation inverted the
 // tread normals, lighting the visible steps as undersides. Match the source.
 const normals:number[]=[];VertexData.ComputeNormals(output,indices,normals,{useRightHandedSystem:true});mesh.setVerticesData('normal',normals);mesh.refreshBoundingInfo();
 const report={changedTreads,changedVertices,maxShiftMeters:maxShift,originalFilePreserved:true,navigationChanged:false};mesh.metadata={...mesh.metadata,retreatLeveledTreads:report};return report;
}
