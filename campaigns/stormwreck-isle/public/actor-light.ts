import type { Scene } from '@babylonjs/core/scene.js';
import { PointLight } from '@babylonjs/core/Lights/pointLight.js';
import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { PublicEntity } from '../../../engine/shared/protocol.js';
import { A1_ROOMS } from '../../camp-rests/public/a1-layout.js';
import { wreckCabinAt } from '../../../engine/client/wreck-cabins.js';

type ActorAddress = Pick<PublicEntity, 'surfaceId' | 'cell'>;
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));

/** Logical rooms, rather than camera cutaway or height, separate painted light.
 * In particular C2/C3 above a cabin must not receive its carried torch. */
export function stormwreckActorLightRegion(sceneId: string, actor: ActorAddress): string {
  if (sceneId === 'wreck-ship') return wreckCabinAt(actor.cell, actor.surfaceId) ??
    (['lower-deck', 'hold-air'].includes(actor.surfaceId) ? actor.surfaceId : 'exterior');
  if (['a2', 'a3', 'a4'].includes(actor.surfaceId)) return actor.surfaceId;
  if (actor.surfaceId === 'a1') {
    const room = A1_ROOMS.find(room => room.cells.some(cell =>
      cell.col === actor.cell.col - 48 && cell.row === actor.cell.row - 48));
    if (room) return `room-${room.id}`;
  }
  return 'exterior';
}

/** A conservative colour response for the existing painted sprites. Reuses live
 * sun/sky/fixtures, including weather, flicker and extinguished sources. This
 * adds no lights, textures, shadows, geometry, visibility or D&D vision rules. */
export function sampleStormwreckActorLight(scene: Scene, sceneId: string, point: Vector3, actor: ActorAddress) {
  const region = stormwreckActorLightRegion(sceneId, actor), interior = region !== 'exterior';
  const wreck = sceneId === 'wreck-ship';
  const ambient = scene.getLightByName(wreck ? 'terrain-ambient' : 'camp-ambient:camp-a1-rooms');
  const key = scene.getLightByName(wreck ? 'ship-key-light' : 'camp-key:camp-a1-rooms');
  const sky = ambient?.isEnabled() ? clamp(ambient.intensity, 0, 1.5) * (interior ? .28 : .62) : 0;
  const sun = !interior && key?.isEnabled() ? clamp(key.intensity, 0, 2) * .30 : 0;
  // A small cool readability floor preserves the player's own silhouette.
  // The existing visibility owner still decides whether any actor is shown.
  let r = interior ? .24 : .30, g = interior ? .27 : .35, b = interior ? .32 : .43;
  if (ambient) { r += sky * ambient.diffuse.r; g += sky * ambient.diffuse.g; b += sky * ambient.diffuse.b; }
  if (key) { r += sun * key.diffuse.r; g += sun * key.diffuse.g; b += sun * key.diffuse.b; }
  for (const light of scene.lights) {
    if (!(light instanceof PointLight) || !light.isEnabled() || light.intensity <= 0) continue;
    let sourceRegion: string | undefined;
    if (wreck) {
      if (light.name.startsWith('carried-light:')) sourceRegion = light.metadata?.actorLightRegion;
    } else if (light.name.startsWith('retreat:existing-interior-fill:')) {
      sourceRegion = light.name.slice('retreat:existing-interior-fill:'.length);
    } else if (/^a1:room-\d+:(torch|candle)-light$/.test(light.name)) {
      sourceRegion = `room-${light.metadata?.roomId}`;
    } else if (light.name.startsWith('retreat:r3-wall-lamp-') && point.z >= light.metadata?.minReceiverZ) {
      sourceRegion = light.metadata?.actorLightRegion;
    } else if (['a1:plaza-fire-light', 'a1:statue-votive-light'].includes(light.name)) sourceRegion = 'exterior';
    // Decorative coastal rim/fake water bounce and other rooms are excluded.
    if (sourceRegion !== region || !Number.isFinite(light.range) || light.range <= 0) continue;
    const source = light.getAbsolutePosition();
    const distance = Math.hypot(source.x - point.x, source.y - point.y - 1, source.z - point.z);
    const reach = clamp(1 - distance / light.range, 0, 1);
    const amount = Math.min(1.5, light.intensity) * reach * reach * .58;
    r += amount * light.diffuse.r; g += amount * light.diffuse.g; b += amount * light.diffuse.b;
  }
  // Preserve the palette's ratios under strong daylight; only the warm local
  // contribution can add a small highlight beyond the neutral painted albedo.
  return { r: clamp(r, .18, 1.04), g: clamp(g, .18, 1.04), b: clamp(b, .18, 1.04) };
}
