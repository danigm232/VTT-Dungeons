import type {Scene} from '@babylonjs/core/scene.js';
import {Mesh} from '@babylonjs/core/Meshes/mesh.js';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder.js';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';
import {worldSurfaceUV} from '../../../engine/client/diorama-kit.js';
import {WINCH_JUNCTION} from './retreat-winch-junction-navigation.js';

// The landscape was intentionally packed into broad, shared material batches.
// These are the exact original vertex ranges for R3_Stair_Rope_upper_12/13/14;
// all other handrails, their materials and the source GLB are preserved.
const INNER_RAIL_BATCHES=[
 {name:'R3_Rail_Batch_12_5_a1_oak-v5',vertices:756,indices:1296,start:546,removed:360},
 {name:'R3_Rail_Batch_12_5_a1_coastal-cliff-v10',vertices:432,indices:648,start:312,removed:180},
 {name:'R3_Rail_Batch_12_5_R3_Rope',vertices:2912,indices:4992,start:2240,removed:1152},
] as const;

type Vertex={x:number;attributes:Record<string,number[]>};
function lerp(a:Vertex,b:Vertex,t:number):Vertex{
 const attributes:Record<string,number[]>={};
 for(const key of Object.keys(a.attributes))attributes[key]=a.attributes[key]!.map((v,i)=>v+(b.attributes[key]![i]!-v)*t);
 return {x:a.x+(b.x-a.x)*t,attributes};
}
function clip(vertices:Vertex[],boundary:number,lower:boolean){
 const inside=(v:Vertex)=>lower?v.x>=boundary-1e-6:v.x<=boundary+1e-6;
 const out:Vertex[]=[];
 for(let i=0;i<vertices.length;i++){
  const a=vertices[i]!,b=vertices[(i+1)%vertices.length]!,aIn=inside(a),bIn=inside(b);
  if(aIn)out.push(a);
  if(aIn!==bIn)out.push(lerp(a,b,(boundary-a.x)/(b.x-a.x)));
 }
 return out;
}

/** Copy the immediately adjoining original paving, clipped at its stone edges.
 * Its texture, normals and tangent data are retained; the original stays put. */
function extendPaving(source:Mesh):Mesh{
 const kinds=source.getVerticesDataKinds().filter(kind=>['position','normal','uv','uv2','color','tangent'].includes(kind));
 const data=new Map(kinds.map(kind=>[kind,{values:source.getVerticesData(kind)!,size:source.getVertexBuffer(kind)!.getSize()}]));
 const position=data.get('position'),indices=source.getIndices();
 if(!position||!indices||!source.parent)throw Error('Retiro A2: falta el pavimento original');
 const world=source.computeWorldMatrix(true),point=new Vector3(),output=new Map(kinds.map(kind=>[kind,[] as number[]])),outIndices:number[]=[];
 const read=(index:number):Vertex=>{
  const attributes:Record<string,number[]>={};
  for(const [kind,{values,size}] of data)attributes[kind]=Array.from(values.slice(index*size,(index+1)*size));
  const p=attributes.position!;Vector3.TransformCoordinatesFromFloatsToRef(p[0]!,p[1]!,p[2]!,world,point);
  return {x:point.x,attributes};
 };
 const right=WINCH_JUNCTION.floor.originalMinX,sourceEnd=right+(right-WINCH_JUNCTION.floor.minX);
 for(let i=0;i<indices.length;i+=3){
  const clipped=clip(clip([read(indices[i]!),read(indices[i+1]!),read(indices[i+2]!)],right,true),sourceEnd,false);
  for(let j=1;j+1<clipped.length;j++)for(const vertex of [clipped[0]!,clipped[j]!,clipped[j+1]!]){
   outIndices.push(outIndices.length);
   for(const kind of kinds)output.get(kind)!.push(...vertex.attributes[kind]!);
  }
 }
 if(outIndices.length<3)throw Error('Retiro A2: no se pudo prolongar el pavimento');
 const mesh=source.clone('retreat:a2-junction-paving',source.parent,true);
 if(!mesh)throw Error('Retiro A2: no se pudo copiar el pavimento');
 mesh.makeGeometryUnique();mesh.unfreezeWorldMatrix();
 for(const kind of kinds)mesh.setVerticesData(kind,output.get(kind)!);
 mesh.setIndices(outIndices);mesh.position.x-=right-WINCH_JUNCTION.floor.minX;mesh.computeWorldMatrix(true);
 mesh.isPickable=true;mesh.checkCollisions=false;mesh.receiveShadows=true;
 mesh.metadata={...source.metadata,content:'VTT_AMBIENCE',retreatZone:'a2',retreatFloor:true,tokenOccluder:false,retreatJunction:'paving'};
 return mesh;
}

function removeInteriorRails(scene:Scene){
 const selected=INNER_RAIL_BATCHES.map(spec=>{
  const mesh=scene.getMeshByName(spec.name);
  if(!(mesh instanceof Mesh))throw Error(`Retiro A2: falta la barandilla ${spec.name}`);
  const indices=mesh.getIndices(),positions=mesh.getVerticesData('position');
  if(!indices||!positions||mesh.getTotalVertices()!==spec.vertices||indices.length!==spec.indices)throw Error(`Retiro A2: cambió el lote ${spec.name}`);
  const world=mesh.computeWorldMatrix(true),point=new Vector3();
  for(let i=spec.start;i<spec.vertices;i++){
   Vector3.TransformCoordinatesFromFloatsToRef(positions[3*i]!,positions[3*i+1]!,positions[3*i+2]!,world,point);
   if(point.x<152.8||point.x>154.8||point.z<65.7||point.z>69.3||point.y<14.8||point.y>16.7)throw Error(`Retiro A2: barandilla fuera del cruce ${spec.name}`);
  }
  const kept:number[]=[];let removed=0;
  for(let i=0;i<indices.length;i+=3){
   const triangle=[indices[i]!,indices[i+1]!,indices[i+2]!],inside=triangle.filter(index=>index>=spec.start).length;
   if(inside!==0&&inside!==3)throw Error(`Retiro A2: lote mezclado ${spec.name}`);
   if(inside)removed+=3;else kept.push(...triangle);
  }
  if(removed!==spec.removed)throw Error(`Retiro A2: tramo inesperado ${spec.name}`);
  return {mesh,kept,removed};
 });
 for(const {mesh,kept,removed} of selected){
  mesh.makeGeometryUnique();mesh.setIndices(kept);
  mesh.metadata={...mesh.metadata,retreatJunctionRemovedIndices:removed};
 }
 return selected.map(({mesh,removed})=>({name:mesh.name,removedIndices:removed,remainingIndices:mesh.getTotalIndices()}));
}

function offsetClone(source:Mesh,name:string,offset:Vector3){
 if(!source.parent)throw Error('Retiro A2: falta el padre del pavimento');
 const clone=source.clone(name,source.parent,true);if(!clone)throw Error('Retiro A2: no se pudo ampliar el pavimento');
 clone.makeGeometryUnique();clone.unfreezeWorldMatrix();
 clone.position.addInPlace(Vector3.TransformNormal(offset,source.parent.computeWorldMatrix(true).clone().invert()));
 clone.computeWorldMatrix(true);worldSurfaceUV(clone,3.3);
 clone.metadata={...source.metadata,retreatFloor:true,tokenOccluder:false,retreatJunction:'paving'};
 return clone;
}

/** The only new rail follows the exposed outside edge, past the junction. */
function createPerimeterRail(scene:Scene){
 const oak=scene.getMeshByName(INNER_RAIL_BATCHES[0].name)?.material,stone=scene.getMeshByName(INNER_RAIL_BATCHES[1].name)?.material,rope=scene.getMeshByName(INNER_RAIL_BATCHES[2].name)?.material;
 if(!oak||!stone||!rope)throw Error('Retiro A2: faltan los materiales de la barandilla');
 const posts:Mesh[]=[],feet:Mesh[]=[],ropes:Mesh[]=[],xs=[156.12,157.43,158.74],z=69.10,y=WINCH_JUNCTION.floor.height;
 for(const x of xs){
  const post=MeshBuilder.CreateCylinder('retreat:a2-edge-post-part',{height:1.03,diameter:.13,tessellation:7},scene);post.position.set(x,y+.515,z);posts.push(post);
  const foot=MeshBuilder.CreateBox('retreat:a2-edge-foot-part',{width:.24,depth:.24,height:.12},scene);foot.position.set(x,y+.035,z);feet.push(foot);
 }
 for(let i=1;i<xs.length;i++){
  const points=Array.from({length:9},(_,k)=>{const t=k/8;return new Vector3(xs[i-1]!+(xs[i]!-xs[i-1]!)*t,y+.87-.14*Math.sin(Math.PI*t),z);});
  ropes.push(MeshBuilder.CreateTube('retreat:a2-edge-rope-part',{path:points,radius:.028,tessellation:5},scene));
 }
 const merge=(parts:Mesh[],name:string,material:NonNullable<Mesh['material']>)=>{
  const mesh=Mesh.MergeMeshes(parts,true,true);if(!mesh)throw Error(`Retiro A2: no se pudo crear ${name}`);
  mesh.name=name;mesh.material=material;mesh.isPickable=false;mesh.checkCollisions=false;
  mesh.metadata={content:'VTT_AMBIENCE',decorativeOnly:true,retreatZone:'a2',refinementPhase:8,retreatFloor:false,tokenOccluder:false,stoneShadowCaster:false,retreatJunction:'perimeter'};
  return mesh;
 };
 return [merge(posts,'retreat:a2-edge-posts',oak),merge(feet,'retreat:a2-edge-feet',stone),merge(ropes,'retreat:a2-edge-ropes',rope)];
}

/** Repair only the A2 junction. The native geometry is never overwritten on disk. */
export function installRetreatWinchJunction(scene:Scene){
 const original=scene.getMeshByName('CANON_Floor_West_Path_primitive1'),foundation=scene.getMeshByName('CANON_Floor_West_Path_primitive0'),stair=scene.getMeshByName('CANON_Global_upper_walkable-stair');
 if(!(original instanceof Mesh)||!(foundation instanceof Mesh)||!(stair instanceof Mesh)||!stair.material)throw Error('Retiro A2: no se encuentra la pasarela o escalera original');
 // Match the stone used on the adjacent staircase, not just its colour.
 original.makeGeometryUnique();original.material=stair.material;worldSurfaceUV(original,3.3);
 const paving=extendPaving(original);
 const f=WINCH_JUNCTION.floor;
 worldSurfaceUV(paving,3.3);
 const north=offsetClone(original,'retreat:a2-junction-north-paving',new Vector3(0,0,-1.5));
 const northWest=offsetClone(paving,'retreat:a2-junction-north-west-paving',new Vector3(0,0,-1.5));
 const makeBase=(name:string,minX:number,maxX:number,minZ:number,maxZ:number)=>{
  const base=MeshBuilder.CreateBox(name,{width:maxX-minX,depth:maxZ-minZ,height:.32},scene);
  base.position.set((minX+maxX)/2,f.height-.185,(minZ+maxZ)/2);base.material=foundation.material;
  base.isPickable=true;base.checkCollisions=false;base.receiveShadows=true;
  base.metadata={content:'VTT_AMBIENCE',retreatZone:'a2',retreatFloor:true,tokenOccluder:false,retreatJunction:'foundation'};
  worldSurfaceUV(base,3.3);return base;
 };
 const westBase=makeBase('retreat:a2-junction-foundation',f.minX,f.originalMinX,f.originalMinZ,f.maxZ);
 const northBase=makeBase('retreat:a2-junction-north-foundation',f.minX,f.maxX,f.minZ,f.originalMinZ);
 const rails=removeInteriorRails(scene);
 const perimeter=createPerimeterRail(scene);
 return {meshes:[westBase,northBase,paving,north,northWest,...perimeter],rails};
}
