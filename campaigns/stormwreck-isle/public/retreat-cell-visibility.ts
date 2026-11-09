import type {Mesh} from '@babylonjs/core/Meshes/mesh.js';
import type {Vector3} from '@babylonjs/core/Maths/math.vector.js';

/** The frontage opens only for the occupied cell; stone, floor, collision and
 * other cells remain unchanged. Side/rear faces retain the existing cutaway. */
export function updateRetreatCellVisibility(walls:readonly Mesh[],occupied:number|undefined,eye:Vector3|undefined,orders:ReadonlyMap<Mesh,number>){
 for(const mesh of walls){
  const match=mesh.name.match(/a1:room-(\d+):face-(\d+)/);if(!match)continue;
  const face=Number(match[2]),active=Number(match[1])===occupied;
  const facing=eye?(face===0?-eye.z:face===1?-eye.x:face===2?eye.x:0):0;
  mesh.isVisible=!(active&&face===3);
  mesh.visibility=active&&facing>.18?.06:1;
  mesh.alphaIndex=mesh.visibility<1?2:orders.get(mesh)??0;
 }
}
