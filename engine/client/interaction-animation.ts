import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { CampActivityId } from '../shared/camp-activities.js';

/** Map authors bind existing meshes, never mesh names or a particular scene ID.
 * Units are metres, contacts are world coordinates, deformations are local. */
export type InteractionPartRole = 'flame' | 'log' | 'fuel-log' | 'pot' | 'liquid' | 'utensil' | 'blanket' | 'pillow' | 'hammock' | 'flap' | 'tie' | 'page' | 'book' | 'symbol' | 'tool' | 'case-lid' | 'lantern' | 'seat-cloth' | 'chest-lid' | 'rope';
export type InteractionPart = {
  role: InteractionPartRole; mesh: Mesh; contact?: Vector3; grip?: Vector3;
  position: Vector3; rotation: Vector3; scale: Vector3;
  vertices?: Float32Array; normals?: Float32Array; side: number;
};
const bindings = new WeakMap<Scene, Map<string, InteractionPart[]>>();
export function interactionParts(scene: Scene, pointId: string) { return bindings.get(scene)?.get(pointId) ?? []; }
export function registerInteractionPart(scene: Scene, pointId: string, role: InteractionPartRole, mesh: Mesh, options: { contact?: Vector3; side?: number; grip?: Vector3 } = {}) {
  let points = bindings.get(scene);
  if (!points) { points = new Map(); bindings.set(scene, points); scene.onDisposeObservable.addOnce(() => bindings.delete(scene)); }
  const deform = ['page', 'blanket', 'hammock', 'flap', 'seat-cloth'].includes(role);
  const positions = deform ? mesh.getVerticesData('position') : null;
  if (positions) mesh.setVerticesData('position', positions, true);
  const part: InteractionPart = { role, mesh, contact: options.contact?.clone(), grip: options.grip?.clone(), side: options.side ?? 1,
    position: mesh.position.clone(), rotation: mesh.rotation.clone(), scale: mesh.scaling.clone(),
    ...(positions ? { vertices: Float32Array.from(positions), normals: Float32Array.from(mesh.getVerticesData('normal') ?? []) } : {}) };
  mesh.metadata = { ...mesh.metadata, interactionPointId: pointId, interactionRole: role, tokenOccluder: false };
  const parts = points.get(pointId) ?? []; parts.push(part); points.set(pointId, parts);
  mesh.onDisposeObservable.addOnce(() => { const index = parts.indexOf(part); if (index >= 0) parts.splice(index, 1); });
  return mesh;
}
export function interactionContact(scene: Scene, pointId: string, action: CampActivityId) {
  const roles: InteractionPartRole[] = action === 'cook' ? ['utensil', 'liquid', 'pot']
    : action === 'study' ? ['page', 'book'] : action === 'pray' ? ['symbol']
      : action === 'tools' ? ['tool'] : action === 'shelter' ? ['tie', 'flap']
        : action === 'prepare-bed' || action === 'rest' ? ['blanket', 'hammock', 'pillow']
          : action === 'chest-toggle' || action === 'inspect' ? ['chest-lid', 'case-lid', 'book', 'symbol', 'tool']
            : action === 'sit' ? ['seat-cloth'] : action === 'guard' ? ['lantern', 'rope'] : action === 'tend-fire' ? ['fuel-log', 'log', 'flame'] : ['log', 'flame'];
  const parts = interactionParts(scene, pointId);
  for (const role of roles) {
    const part = parts.find(p => p.role === role);
    if (part) {
      part.mesh.parent?.computeWorldMatrix(true);
      // Contacts refer to the object's authored resting position, not its
      // animated position: a lifted book must not drag the actor after itself.
      return part.contact?.clone() ?? Vector3.TransformCoordinates(part.position,part.mesh.parent?.getWorldMatrix()??Matrix.Identity());
    }
  }
  return undefined;
}

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const smooth = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };
/** One clock drives approach, contact, working gesture and release on both sides.
 * Pure sampling permits replay, late joining and deterministic testing. */
export function interactionTiming(elapsedMs: number, durationMs: number) {
  const duration = Math.max(1, durationMs), t = clamp(elapsedMs / duration);
  const reach = smooth(t / .18) * (1 - smooth((t - .8) / .2));
  const work = smooth((t - .16) / .12) * (1 - smooth((t - .72) / .1));
  return { t, seconds: Math.max(0, elapsedMs) / 1000, reach, work, active: elapsedMs >= 0 && elapsedMs < durationMs };
}
export type InteractionTiming = ReturnType<typeof interactionTiming>;
export function restoreInteractionPart(part: InteractionPart) {
  if (part.mesh.isDisposed() || part.role === 'chest-lid') return; // authoritative, persistent lid state
  part.mesh.position.copyFrom(part.position); part.mesh.rotation.copyFrom(part.rotation); part.mesh.scaling.copyFrom(part.scale);
  if (part.vertices) part.mesh.updateVerticesData('position', part.vertices, true);
  if (part.normals?.length) part.mesh.updateVerticesData('normal', part.normals);
}

/** Animate the real scenery. No duplicate book, blanket or tool is spawned.
 * Fixed structures (statues, benches, poles) deliberately never move. */
export function animateInteractionPart(part: InteractionPart, action: CampActivityId, timing: InteractionTiming, hand?: Vector3) {
  if (part.mesh.isDisposed()) return;
  restoreInteractionPart(part);
  const mesh = part.mesh, { reach, work, seconds: s } = timing, wave = Math.sin(s * 4.5);
  const bed = action === 'prepare-bed' || action === 'rest';
  if (part.role === 'flame' && ['warm', 'tend-fire', 'pray', 'guard'].includes(action)) {
    mesh.scaling.y = part.scale.y * (1 + reach * (action === 'tend-fire' ? .3 + wave * .09 : .05 * wave));
  } else if (part.role === 'fuel-log' && action === 'tend-fire') {
    const parent=mesh.parent?.getWorldMatrix()??Matrix.Identity(), inverse=Matrix.Invert(parent);
    const resting=Vector3.TransformCoordinates(part.position,parent);
    const destination=part.contact??resting;
    const lifted=hand??resting.add(new Vector3(0,.7,0));
    const carry=smooth(timing.t/.25), deposit=smooth((timing.t-.45)/.22);
    const delivered=Vector3.Lerp(Vector3.Lerp(resting,lifted,carry),destination,deposit);
    // One existing log is picked up and laid on the hearth. The woodpile is
    // scenery: its later reset does not spend inventory or automate survival.
    mesh.position.copyFrom(Vector3.Lerp(part.position,Vector3.TransformCoordinates(delivered,inverse),1-smooth((timing.t-.88)/.12)));
    mesh.rotation.y+=deposit*.65;
  } else if (part.role === 'log' && action === 'tend-fire') {
    mesh.rotation.y += work * .09 * part.side * wave; mesh.position.y += work * .025 * Math.abs(wave);
  } else if (part.role === 'utensil' && action === 'cook') {
    mesh.position.x += work * Math.sin(s * 5) * .08; mesh.position.z += work * Math.cos(s * 5) * .08;
    mesh.rotation.z += reach * .28 + work * Math.sin(s * 5) * .14; mesh.position.y += reach * .1;
  } else if (part.role === 'liquid' && action === 'cook') {
    mesh.position.y += work * .008 * wave; mesh.scaling.x *= 1 + work * .025 * wave;
  } else if ((part.role === 'page' || part.role === 'book') && ['study', 'inspect'].includes(action)) {
    if (part.role === 'book') mesh.rotation.x += reach * .035;
  } else if (part.role === 'symbol' && ['pray', 'inspect'].includes(action)) {
    mesh.rotation.z += work * .035 * wave; mesh.position.y += reach * .035;
  } else if (part.role === 'tool' && ['tools', 'inspect'].includes(action)) {
    mesh.position.y += reach * .06 + work * .025 * wave;
    mesh.rotation.y += work * .2 * wave * part.side;
  } else if (part.role === 'pillow' && bed) {
    mesh.position.z += action === 'prepare-bed' ? work * .055 * wave : 0;
    mesh.scaling.y *= 1 - reach * (action === 'rest' ? .12 : .05);
  } else if ((part.role === 'case-lid' || part.role === 'tie') && ['inspect', 'tools', 'shelter'].includes(action)) {
    mesh.rotation.z += work * .1 * wave * part.side;
  } else if (['lantern', 'rope'].includes(part.role) && action === 'guard') {
    mesh.rotation.z += work * .035 * Math.sin(s * 1.7);
  }
  if(hand&&part.grip&&['study','pray','tools','inspect'].includes(action)){
    const parent=mesh.parent?.getWorldMatrix()??Matrix.Identity();
    const rest=Vector3.TransformCoordinates(part.position,parent);
    const held=hand.add(rest.subtract(part.grip));
    mesh.position.copyFrom(Vector3.Lerp(part.position,Vector3.TransformCoordinates(held,Matrix.Invert(parent)),reach));
  }
  if (!part.vertices) return;
  const vertices = part.vertices.slice();
  // Local extents let the same cloth/page clip work on future scaled models.
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < vertices.length; i += 3) { minX = Math.min(minX, vertices[i]!); maxX = Math.max(maxX, vertices[i]!); minZ = Math.min(minZ, vertices[i + 2]!); maxZ = Math.max(maxZ, vertices[i + 2]!); }
  const width = Math.max(.01, maxX - minX), depth = Math.max(.01, maxZ - minZ);
  for (let i = 0; i < vertices.length; i += 3) {
    const x = vertices[i]!, z = vertices[i + 2]!, along = (z - minZ) / depth;
    if (part.role === 'page' && ['study', 'inspect'].includes(action)) {
      const hinge = part.side < 0 ? maxX : minX, angle = work * (1 - Math.cos(s * 3.4)) * .65 * part.side;
      vertices[i] = hinge + (x - hinge) * Math.cos(angle); vertices[i + 1] = vertices[i + 1]! + (x - hinge) * Math.sin(angle);
    } else if (part.role === 'blanket' && bed) {
      vertices[i + 1] = vertices[i + 1]! + (action === 'prepare-bed' ? work * (.2 + .8 * along) * Math.sin(s * 4 + along * 3) * depth * .04 : reach * (.2 + .8 * along) * depth * .004 * Math.sin(s * 2));
    } else if (part.role === 'hammock' && bed) {
      // The suspension ends stay attached; only the middle sways/sags.
      vertices[i] = vertices[i]! + reach * Math.sin(along * Math.PI) * width * .06 * Math.sin(s * 2);
      vertices[i + 1] = vertices[i + 1]! - reach * Math.sin(along * Math.PI) * depth * .045;
    } else if (part.role === 'flap' && action === 'shelter') {
      vertices[i + 2] = vertices[i + 2]! + work * width * .035 * Math.sin(s * 3 + x / width) * part.side;
    } else if (part.role === 'seat-cloth' && action === 'sit') vertices[i + 1] = vertices[i + 1]! - reach * .012;
  }
  mesh.updateVerticesData('position', vertices, true);
  if(part.normals?.length){const normals:number[]=[];VertexData.ComputeNormals(vertices,mesh.getIndices()!,normals);mesh.updateVerticesData('normal',normals);}
}
