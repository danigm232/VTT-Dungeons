import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import type { BaseTexture } from '@babylonjs/core/Materials/Textures/baseTexture.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { WreckCabinId } from './wreck-cabins.js';
import { WRECK_SEA_MARGIN_CELLS } from '../../campaigns/stormwreck-isle/public/wreck-runtime.js';

/** Canonical, non-interactive set dressing. Secrets and treasures remain in
 * their independent authoritative prop/pickup state. */
export function buildShipCabinDressing(scene: Scene, tileMeters: number, portraitTexture?: BaseTexture): Mesh[] {
  const result: Mesh[] = [];
  const material = (name: string, hex: string) => {
    const mat = new StandardMaterial(`cabin:${name}`, scene);
    mat.diffuseColor = Color3.FromHexString(hex); mat.specularColor = Color3.FromHexString('#171a17');
    mat.backFaceCulling = false; return mat;
  };
  const oldWood = material('old-wood', '#594b39');
  const parchment = material('parchment', '#8b856e');
  const crabShell = material('crab-shell', '#6e4235');
  const brokenGlass = material('broken-glass', '#617879');
  const dish = material('broken-ceramic', '#a29c87');
  const record = (mesh: Mesh, room: WreckCabinId, kind: string, mat: StandardMaterial) => {
    mesh.material = mat; mesh.isPickable = false;
    mesh.metadata = { visualOnly: true, deckSurfaceId: 'main', cabinId: room, kind };
    result.push(mesh); return mesh;
  };
  const block = (name: string, room: WreckCabinId, col: number, row: number,
    offsetX: number, y: number, offsetZ: number, w: number, h: number, d: number, mat: StandardMaterial) => {
    const mesh = record(MeshBuilder.CreateBox(`cabin:${name}`, { width: w, height: h, depth: d }, scene), room, name, mat);
    mesh.position.set((col + WRECK_SEA_MARGIN_CELLS + .5) * tileMeters + offsetX, y,
      (row + WRECK_SEA_MARGIN_CELLS + .5) * tileMeters + offsetZ);
    return mesh;
  };
  // C5: the old headless skeleton is a separate prop. These harmless little
  // crabs explain why it seems to move; they are never combatants.
  for (let i = 0; i < 3; i++) {
    const x = (16.45 + WRECK_SEA_MARGIN_CELLS + i * .22) * tileMeters;
    const z = (10.36 + WRECK_SEA_MARGIN_CELLS + (i % 2) * .25) * tileMeters;
    const body = record(MeshBuilder.CreateSphere(`c5:crab:${i}`, { diameter: .16, segments: 8 }, scene), 'c5', 'harmless-crab', crabShell);
    body.position.set(x, .1, z); body.scaling.set(1, .35, .7);
    for (const side of [-1, 1]) {
      const leg = record(MeshBuilder.CreateTube(`c5:crab-leg:${i}:${side}`, {
        path: [new Vector3(x, .11, z), new Vector3(x + side * .16, .05, z + .1)], radius: .017, tessellation: 5
      }, scene), 'c5', 'harmless-crab-leg', crabShell);
      leg.isPickable = false;
    }
  }
  // C6: scattered crew belongings and the portrait are clues, not invented
  // loot. The hidden plank and 200 gp remain concealed in their own state.
  for (let i = 0; i < 4; i++) {
    const bag = block(`c6:belonging:${i}`, 'c6', 28 + i % 3, 4 + Math.floor(i / 3),
      (i % 2 ? .24 : -.25), .09, -.2 + i * .07, .34, .15, .25, i % 2 ? oldWood : parchment);
    bag.rotation.y = i * .63;
  }
  if (portraitTexture) {
    const artMat = material('aleitha-brastos-painting', '#ffffff');
    artMat.diffuseTexture = portraitTexture;
    const portrait = record(MeshBuilder.CreatePlane('c6:aleitha-brastos-portrait', { width: 1.12, height: 1.12 }, scene),
      'c6', 'canonical-portrait', artMat);
    portrait.position.set((30.5 + WRECK_SEA_MARGIN_CELLS) * tileMeters, 1.57,
      3.99 + WRECK_SEA_MARGIN_CELLS * tileMeters);
    for (const [name, x, y, w, h] of [
      ['top', 0, 2.17, 1.29, .1], ['bottom', 0, .97, 1.29, .1],
      ['left', -.61, 1.57, .1, 1.28], ['right', .61, 1.57, .1, 1.28]
    ] as Array<[string, number, number, number, number]>) {
      const frame = record(MeshBuilder.CreateBox(`c6:portrait-frame:${name}`, { width: w, height: h, depth: .09 }, scene),
        'c6', 'portrait-frame', oldWood);
      frame.position.set(portrait.position.x + x, y, portrait.position.z + .02);
    }
    const label = new DynamicTexture('c6:portrait-inscription', { width: 1024, height: 128 }, scene, false);
    label.hasAlpha = true;
    label.drawText('Aleitha y Brastos: juntos para siempre', 26, 82, '43px Georgia', '#d3bd8d', '#392f25', true);
    const labelMat = material('portrait-label', '#ffffff'); labelMat.diffuseTexture = label;
    const plaque = record(MeshBuilder.CreatePlane('c6:portrait-inscription-plaque', { width: 2.1, height: .26 }, scene),
      'c6', 'canonical-inscription', labelMat);
    plaque.position.set(portrait.position.x, .77, portrait.position.z + .02);
  }
  // C7: broken crockery and glass on the floor around the long dining table.
  for (let i = 0; i < 9; i++) {
    const shard = block(`c7:shard:${i}`, 'c7', 28 + i % 4, 9 + Math.floor(i / 4),
      (i % 3 - 1) * .25, .028, (i % 2 ? .29 : -.28), .11 + i % 3 * .035, .018, .07, i % 3 ? dish : brokenGlass);
    shard.rotation.y = i * 1.27;
  }
  return result;
}
