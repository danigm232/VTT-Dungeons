import { Ray } from '@babylonjs/core/Culling/ray.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';

/** Actual orthographic sight intersections, not a bounding-box fade of an
 * entire scene. The caller retains visibility and authoritative collisions. */
export function structureObscuresFocus(mesh:Mesh,feet:Vector3,towardsEye:Vector3){
  const side=Vector3.Cross(towardsEye,Vector3.Up());
  if(side.lengthSquared()<.00001)side.copyFrom(Vector3.Right());else side.normalize();
  return [-.3,0,.3].some(offset=>[.08,.45,.95,1.4].some(lift=>
    new Ray(feet.add(side.scale(offset)).add(new Vector3(0,lift,0)),towardsEye,180).intersectsMesh(mesh,false).hit));
}
