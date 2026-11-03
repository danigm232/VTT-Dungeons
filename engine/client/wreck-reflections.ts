import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { Camera } from '@babylonjs/core/Cameras/camera.js';
import { Matrix } from '@babylonjs/core/Maths/math.vector.js';

const excluded = /actor:|weather:|water|ocean|foam|wake|wash|shimmer|darkness|shadow|stain|decal|algae|bubble|fish|scenic|distant-island|horizon-mist/i;

/** Track actual membership changes, including remove/add with equal counts.
 * Visibility is intentionally not cached: the render target must still follow
 * door states and cutaways without rebuilding the whole membership list.
 */
export function wreckReflectionCandidates(scene: Scene) {
  let dirty = true, meshes: AbstractMesh[] = [];
  const added = scene.onNewMeshAddedObservable.add(() => { dirty = true; });
  const removed = scene.onMeshRemovedObservable.add(() => { dirty = true; });
  return {
    get() {
      if (dirty) {
        meshes = scene.meshes.filter(m => !m.metadata?.nativeBillboard && !excluded.test(m.name) && m.material && m.getTotalVertices() > 0);
        dirty = false;
      }
      return meshes;
    },
    dispose() { scene.onNewMeshAddedObservable.remove(added); scene.onMeshRemovedObservable.remove(removed); meshes = []; }
  };
}

/** A moving camera used to invalidate the planar pass on every frame. Keep a
 * bounded cadence while moving as well; the next pass uses the latest camera,
 * so zoom/rotation need no stale pose snapshots or separate invalidations.
 */
export class WreckReflectionCadence {
  private last = -Infinity;
  private enabled = false;
  private view = Matrix.Identity();
  private projection = Matrix.Identity();
  constructor(private compact: boolean) {}
  update(seconds: number, enabled: boolean, camera: Camera | null = null) {
    if (!enabled) { this.enabled = false; return false; }
    const immediate = !this.enabled;
    this.enabled = true;
    const view = camera?.getViewMatrix(), projection = camera?.getProjectionMatrix();
    const moving = Boolean(view && projection && (!view.equals(this.view) || !projection.equals(this.projection)));
    const interval = moving ? (this.compact ? .12 : 1 / 15) : (this.compact ? .24 : .12);
    if (!immediate && seconds - this.last < interval) return false;
    if(view)this.view.copyFrom(view);if(projection)this.projection.copyFrom(projection);
    this.last = seconds; return true;
  }
}
