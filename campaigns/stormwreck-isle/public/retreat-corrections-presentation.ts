import {Mesh} from '@babylonjs/core/Meshes/mesh.js';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';

type Vertex={point:Vector3;values:Record<string,number[]>};
export type RetreatClearance={id:string;bounds:readonly [number,number,number,number,number,number]};
export const RETREAT_R3_CLEARANCES:readonly RetreatClearance[]=[
 {id:'dining-extension',bounds:[128.75,131.3,55.3,63.3,18.015,22.8]},
 {id:'library-extension',bounds:[86.7,93.3,52.25,63.3,18.015,22.8]},
 {id:'upper-apron',bounds:[76.4,135.1,65.2,72.92,17.99,20.5]},
 {id:'garden',bounds:[78.5,87.05,52.65,64.15,17.99,23.5]},
 {id:'boat-berth',bounds:[18.6,21.9,117.45,126,-1.8,4]},
 {id:'winch-shaft',bounds:[158.8,162.8,69.35,110,-1.5,15.1]}
];
function half(polygon:Vertex[],axis:'x'|'y'|'z',value:number,sign:number){
 const out:Vertex[]=[];
 for(let i=0;i<polygon.length;i++){
  const a=polygon[i]!,b=polygon[(i+1)%polygon.length]!,da=(a.point[axis]-value)*sign,db=(b.point[axis]-value)*sign;
  if(da>=-1e-8)out.push(a);
  if(da>1e-8&&db< -1e-8||da< -1e-8&&db>1e-8){const t=da/(da-db);out.push({point:Vector3.Lerp(a.point,b.point,t),values:Object.fromEntries(Object.entries(a.values).map(([k,v])=>[k,v.map((n,j)=>n+(b.values[k]![j]!-n)*t)]))});}
 }
 return out;
}
/** Surgical subtraction of a measured clearance, retaining all attributes.
 * Only decorative geology calls this; no cells, furniture or source GLB edits.
 */
export function clipRetreatRockClearance(mesh:Mesh,clearance:RetreatClearance){
 const [x0,x1,z0,z1,y0,y1]=clearance.bounds,b=mesh.getBoundingInfo().boundingBox;
 if(b.maximumWorld.x<=x0||b.minimumWorld.x>=x1||b.maximumWorld.z<=z0||b.minimumWorld.z>=z1||b.maximumWorld.y<=y0||b.minimumWorld.y>=y1)return null;
 const indices=mesh.getIndices(),positions=mesh.getVerticesData('position');if(!indices||!positions||mesh.subMeshes.length!==1||mesh.instances.length)return null;
 const planes:[axis:'x'|'y'|'z',value:number,sign:number][]=[['x',x0,1],['x',x1,-1],['z',z0,1],['z',z1,-1],['y',y0,1],['y',y1,-1]],world=mesh.computeWorldMatrix(true),kinds=mesh.getVerticesDataKinds(),strides=Object.fromEntries(kinds.map(k=>[k,mesh.getVertexBuffer(k)!.getSize()])),source=Object.fromEntries(kinds.map(k=>[k,mesh.getVerticesData(k)!])),arrays:Record<string,number[]>=Object.fromEntries(kinds.map(k=>[k,[]])),output:number[]=[];
 let affected=0;
 const vertex=(id:number):Vertex=>({point:Vector3.TransformCoordinates(Vector3.FromArray(positions,id*3),world),values:Object.fromEntries(kinds.map(k=>[k,Array.from(source[k]!.slice(id*strides[k]!,(id+1)*strides[k]!))]))});
 function keep(p:Vertex[]){for(let i=1;i<p.length-1;i++){const triangle=[p[0]!,p[i]!,p[i+1]!];if(Vector3.Cross(triangle[1]!.point.subtract(triangle[0]!.point),triangle[2]!.point.subtract(triangle[0]!.point)).lengthSquared()<1e-14)continue;for(const v of triangle){output.push(arrays.position!.length/3);for(const k of kinds)arrays[k]!.push(...v.values[k]!);}}}
 for(let i=0;i<indices.length;i+=3){const triangle=[vertex(indices[i]!),vertex(indices[i+1]!),vertex(indices[i+2]!)];
  if(planes.some(([axis,value,sign])=>triangle.every(v=>(v.point[axis]-value)*sign<=1e-8))){keep(triangle);continue;}
  affected++;let inside=triangle;for(const [axis,value,sign]of planes){keep(half(inside,axis,value,-sign));inside=half(inside,axis,value,sign);if(inside.length<3)break;}
 }
 if(!affected)return null;
 mesh.unfreezeWorldMatrix();mesh.makeGeometryUnique();for(const k of kinds)mesh.setVerticesData(k,arrays[k]!,false,strides[k]);mesh.setIndices(output);mesh.refreshBoundingInfo();
 const result={id:clearance.id,affected,triangles:output.length/3};mesh.metadata={...mesh.metadata,retreatR3Clearances:[...(mesh.metadata?.retreatR3Clearances??[]),result]};return result;
}
export function correctRetreatR3Geology(meshes:readonly Mesh[]){
 const changes=[];
 for(const mesh of meshes){
  if(/^V4_(Rail_upper_|Eroded_Edge_upper_)/.test(mesh.name)){mesh.computeWorldMatrix(true);const result=clipRetreatRockClearance(mesh,{id:'retired-upper-railing',bounds:[76.4,135.1,66.7,69.1,17.5,20]});if(result)changes.push({mesh:mesh.name,...result});continue;}
  if(!mesh.isEnabled()||mesh.metadata?.retreatFloor||!mesh.getTotalVertices()||!/cliff|basalt|rock|stone/i.test(mesh.material?.name??'')||!/^(Stone_|Geography_|G2_|P[367]_|SAL|R2_|V5_|VTT_Shore_Rock)/.test(mesh.name))continue;
  mesh.computeWorldMatrix(true);for(const volume of RETREAT_R3_CLEARANCES){const result=clipRetreatRockClearance(mesh,volume);if(result)changes.push({mesh:mesh.name,...result});}
 }
 return changes;
}
