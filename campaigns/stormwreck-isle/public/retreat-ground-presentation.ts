import type {AbstractMesh} from '@babylonjs/core/Meshes/abstractMesh.js';
import {Mesh} from '@babylonjs/core/Meshes/mesh.js';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';

/** Only authored walkable surfaces and the five preserved plaza batches are
 * floors. The continuous bedrock also has vertical faces and stays eligible
 * for the existing wall occlusion system. */
export function isRetreatModuleFloor(zone:string,name:string,role?:string){
 return /walkable-floor|walkable-stair/.test(role??'')
  || /CANON_Floor_|Global_.*walkable|APPROACH_(floor|stair)/.test(name)
  || zone==='a1'&&/^a1:static:a1:(earth|plaza(?:-moss|-warm|-cool)?)-v6$/.test(name);
}

/** glTF COLOR_0 may have four components even when every alpha is one.
 * Shared automatic-mode materials otherwise send this solid ground through
 * the blended queue without writing depth. Preserve real authored alpha,
 * every vertex colour and the existing per-mesh visibility fade. */
export function preserveOpaqueRetreatGround(mesh:AbstractMesh){
 if(!mesh.hasVertexAlpha||!mesh.useVertexColors)return false;
 const colors=mesh.getVerticesData('color');
 if(!colors||colors.length!==mesh.getTotalVertices()*4)return false;
 for(let i=3;i<colors.length;i+=4)if(!Number.isFinite(colors[i])||Math.abs(colors[i]!-1)>1e-6)return false;
 mesh.hasVertexAlpha=false;
 return true;
}

export const RETREAT_PLAZA_CLEARANCE=Object.freeze({minX:64.5,maxX:148.5,minZ:88.25,maxZ:99.15,ceiling:8.96});
type CutVertex={point:Vector3;id?:number;values:Record<string,number[]>};
function halfSpace(polygon:CutVertex[],axis:'x'|'y'|'z',value:number,sign:number){
 const result:CutVertex[]=[];
 for(let i=0;i<polygon.length;i++){
  const a=polygon[i]!,b=polygon[(i+1)%polygon.length]!,da=(a.point[axis]-value)*sign,db=(b.point[axis]-value)*sign;
  if(da>=-1e-8)result.push(a);
  if(da>1e-8&&db< -1e-8||da< -1e-8&&db>1e-8){const t=da/(da-db),values:Record<string,number[]>={};for(const [kind,data]of Object.entries(a.values))values[kind]=data.map((v,k)=>v+(b.values[kind]![k]!-v)*t);result.push({point:Vector3.Lerp(a.point,b.point,t),values});}
 }
 return result;
}

/** The imported exterior ridge crosses the preserved plaza at +9 m. Remove
 * only its triangles inside the floor's clearance volume, splitting boundary
 * faces with interpolated attributes. Cells, floors, furniture, transforms and
 * the source GLB are untouched. The floor covers the cut; the rest of the same
 * coastal rock remains at exactly its authored coordinates. Runs once at load. */
export function clearRetreatPlazaRock(mesh:Mesh){
 if(mesh.name!=='a1:ridge:continuation_primitive0'||mesh.metadata?.retreatPlazaClearance)return null;
 const source=mesh.getIndices(),positions=mesh.getVerticesData('position');if(!source||!positions||mesh.subMeshes.length!==1||mesh.instances.length)return null;
 const b=RETREAT_PLAZA_CLEARANCE,planes:[axis:'x'|'y'|'z',value:number,sign:number][]=[['x',b.minX,1],['x',b.maxX,-1],['z',b.minZ,1],['z',b.maxZ,-1],['y',b.ceiling,1]],world=mesh.computeWorldMatrix(true);
 const kinds=mesh.getVerticesDataKinds(),arrays=Object.fromEntries(kinds.map(kind=>[kind,Array.from(mesh.getVerticesData(kind)!)])),strides=Object.fromEntries(kinds.map(kind=>[kind,mesh.getVertexBuffer(kind)!.getSize()])),cache=new Map<number,CutVertex>(),indices:number[]=[];
 const vertex=(id:number)=>{let v=cache.get(id);if(!v){v={id,point:Vector3.TransformCoordinates(Vector3.FromArray(positions,id*3),world),values:Object.fromEntries(kinds.map(kind=>[kind,arrays[kind]!.slice(id*strides[kind]!,(id+1)*strides[kind]!)]))};cache.set(id,v);}return v;};
 let affected=0;
 function keep(polygon:CutVertex[]){for(let i=1;i<polygon.length-1;i++){const triangle=[polygon[0]!,polygon[i]!,polygon[i+1]!];if(Vector3.Cross(triangle[1]!.point.subtract(triangle[0]!.point),triangle[2]!.point.subtract(triangle[0]!.point)).lengthSquared()<1e-14)continue;for(const v of triangle){if(v.id===undefined){v.id=arrays.position!.length/3;for(const kind of kinds){const data=v.values[kind]!;if(kind==='normal'){const n=Vector3.FromArray(data).normalize();arrays[kind]!.push(n.x,n.y,n.z);}else arrays[kind]!.push(...data);}}indices.push(v.id);}}}
 for(let i=0;i<source.length;i+=3){const triangle=[vertex(source[i]!),vertex(source[i+1]!),vertex(source[i+2]!)];
  if(planes.some(([axis,value,sign])=>triangle.every(v=>(v.point[axis]-value)*sign<=1e-8))){indices.push(source[i]!,source[i+1]!,source[i+2]!);continue;}
  affected++;let inside=triangle;for(const [axis,value,sign]of planes){keep(halfSpace(inside,axis,value,-sign));inside=halfSpace(inside,axis,value,sign);if(inside.length<3)break;}
 }
 if(!affected)return null;
 const report={affectedTriangles:affected,sourceTriangles:source.length/3,resultTriangles:indices.length/3,additionalVertices:arrays.position!.length/3-mesh.getTotalVertices(),clearance:{...b},originalFilePreserved:true};
 mesh.makeGeometryUnique();for(const kind of kinds)mesh.setVerticesData(kind,arrays[kind]!,false,strides[kind]);mesh.setIndices(indices);mesh.refreshBoundingInfo();mesh.metadata={...mesh.metadata,retreatPlazaClearance:report};return report;
}
