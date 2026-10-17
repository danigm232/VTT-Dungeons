import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { PointLight } from '@babylonjs/core/Lights/pointLight.js';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';

/** Cheap ground projection: follows real light positions, range and intensity.
 * Local sources excluded from the actor's room never influence its silhouette. */
export function actorShadow(scene: Scene, ground: Vector3, actor: Mesh, height: number) {
  let strength = 0, direction = new Vector3(0, 0, 1), length = .35;
  for (const light of scene.lights) {
    if (!light.isEnabled() || light.intensity <= .01 || light.name.includes('rim-light')) continue;
    if (light.includedOnlyMeshes.length && !light.includedOnlyMeshes.includes(actor)) continue;
    if (light.excludedMeshes.includes(actor)) continue;
    if (light instanceof PointLight) {
      const delta = ground.subtract(light.getAbsolutePosition()), distance = delta.length();
      if (distance >= light.range) continue;
      const score = light.intensity * Math.pow(1 - distance / light.range, 2);
      if (score > strength) { strength = score; direction = delta; length = Math.min(3.5, height * Math.hypot(delta.x, delta.z) / Math.max(.7, light.position.y-ground.y)); }
    } else if (light instanceof DirectionalLight && light.intensity > strength) {
      strength = light.intensity; direction = light.direction.clone();
      length = Math.min(3.5, height * Math.hypot(direction.x, direction.z) / Math.max(.25, Math.abs(direction.y)));
    }
  }
  direction.y = 0; direction.normalize();
  return { direction, length: Math.max(.2, length), alpha: Math.min(.55, strength * .34) };
}
