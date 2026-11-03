import type {Scene} from '@babylonjs/core/scene.js';
import {Mesh} from '@babylonjs/core/Meshes/mesh.js';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';
import {VertexBuffer} from '@babylonjs/core/Buffers/buffer.js';

type TreeContact={id:string;x:number;z:number;targetY:number};
type CairnContact={id:string;bounds:number[];deltaY:number};
export type GroveContacts={trees:TreeContact[];cairn:CairnContact|null};
/** GLB extras describe contact repairs, never navigation or arbitrary nodes. */
export function parseGroveContacts(raw:unknown):GroveContacts{
 if(raw===undefined)return {trees:[],cairn:null};
 const value=typeof raw==='string'?JSON.parse(raw):raw;
 if(!value||!Array.isArray(value.trees))throw Error('Contactos del bosquete inválidos');
 const trees=value.trees as TreeContact[];
 if(new Set(trees.map(t=>t.id)).size!==trees.length||trees.some(t=>!/^G2_Forest_Reused_Pine_[123]$/.test(t.id)||![t.x,t.z,t.targetY].every(Number.isFinite)||t.x<110||t.x>154||t.z<0||t.z>55||t.targetY<15||t.targetY>50))throw Error('Contacto de árbol fuera de reserva');
 const cairn=value.cairn??null;
 if(cairn&&(cairn.id!=='G2_Wayfinding_Cairns_3'||!Array.isArray(cairn.bounds)||cairn.bounds.length!==4||!cairn.bounds.every(Number.isFinite)||cairn.bounds[0]<110||cairn.bounds[1]>130||cairn.bounds[2]<3||cairn.bounds[3]>30||cairn.bounds[0]>=cairn.bounds[1]||cairn.bounds[2]>=cairn.bounds[3]||!Number.isFinite(cairn.deltaY)||Math.abs(cairn.deltaY)>15))throw Error('Contacto de hito inválido');
 return {trees,cairn};
}
/** Separate reserve for the coastal stones; the interior parser stays strict. */
export function parseCoastalCairnContact(raw:unknown):GroveContacts{
 const value=typeof raw==='string'?JSON.parse(raw):raw,cairn=value?.cairn;
 if(!value||!Array.isArray(value.trees)||value.trees.length||!cairn||cairn.id!=='G2_Wayfinding_Cairns_3'||!Array.isArray(cairn.bounds)||cairn.bounds.length!==4||!cairn.bounds.every(Number.isFinite)||cairn.bounds[0]<155||cairn.bounds[1]>158||cairn.bounds[2]<24||cairn.bounds[3]>28||cairn.bounds[0]>=cairn.bounds[1]||cairn.bounds[2]>=cairn.bounds[3]||!Number.isFinite(cairn.deltaY)||Math.abs(cairn.deltaY)>15)throw Error('Contacto costero fuera de reserva');
 return {trees:[],cairn};
}
/** Only Y is corrected. Original trees retain X/Z, geometry, scale and parent;
 * the interior cairn retains its individual stones and the coastal part. */
export function applyGroveContacts(scene:Scene,plan:GroveContacts){
 const pending=plan.trees.flatMap(t=>{
  const node=scene.getTransformNodeByName(t.id)??scene.getMeshByName(t.id);if(!node)return [];
  node.computeWorldMatrix(true);const before=node.getAbsolutePosition().clone();
  if(Math.abs(before.x-t.x)>.002||Math.abs(before.z-t.z)>.002)throw Error('El árbol ya cambió de posición: '+t.id);
  return [{node,before,target:new Vector3(before.x,t.targetY,before.z)}];
 });
 const cairn=plan.cairn,mesh=cairn?scene.getMeshByName(cairn.id):null;let positions:number[]|null=null,adjustedVertices=0;
 if(cairn&&mesh instanceof Mesh){
  const source=mesh.getVerticesData(VertexBuffer.PositionKind);if(!source)throw Error('Hito sin posiciones');
  positions=Array.from(source);const matrix=mesh.computeWorldMatrix(true),inverse=matrix.clone().invert(),[x0,x1,z0,z1]=cairn.bounds;
  for(let i=0;i<positions.length;i+=3){const p=Vector3.TransformCoordinates(Vector3.FromArray(positions,i),matrix);
   if(p.x<x0!||p.x>x1!||p.z<z0!||p.z>z1!)continue;
   p.y+=cairn.deltaY;const local=Vector3.TransformCoordinates(p,inverse);positions[i]=local.x;positions[i+1]=local.y;positions[i+2]=local.z;adjustedVertices++;
  }
  if(!adjustedVertices)throw Error('La reserva del hito no coincide');
 }
 const trees=pending.map(({node,before,target})=>{node.unfreezeWorldMatrix();node.setAbsolutePosition(target);node.computeWorldMatrix(true);return {id:node.name,x:before.x,z:before.z,beforeY:before.y,afterY:target.y,deltaY:target.y-before.y};});
 if(positions&&mesh instanceof Mesh){mesh.makeGeometryUnique();mesh.setVerticesData(VertexBuffer.PositionKind,positions,true);mesh.refreshBoundingInfo();}
 return {trees,cairn:adjustedVertices?{...cairn,adjustedVertices}:null};
}
