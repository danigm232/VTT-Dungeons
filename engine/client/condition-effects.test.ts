import { describe, expect, it } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { WorldBillboards, type BillboardFrame } from './world-billboards';
import { conditionEffectBounds } from './condition-effects';

describe('subtle condition effects on painted characters', () => {
  it('fits the opaque sprite, including lying PNGs with large transparent margins', () => {
    const standing = conditionEffectBounds(92, 92, .5, .84, { anchorY: .95, heightFraction: .9 });
    const fallen = conditionEffectBounds(92, 92, .5, .84, { anchorY: .76, heightFraction: .36 });
    expect(standing.height).toBeCloseTo(82.8); expect(fallen.height).toBeCloseTo(33.12);
    expect(fallen.y + fallen.height).toBeCloseTo((.76 - .84) * 92);
    expect(conditionEffectBounds(184, 184, .5, .84, { anchorY: .76, heightFraction: .36 }).height).toBeCloseTo(fallen.height * 2);
  });
  it('depth-tests VFX with the scenery without writing depth, stealing clicks, or keeping expired overlays visible', () => {
    const engine = new NullEngine(), scene = new Scene(engine), camera = new ArcRotateCamera('camera', -.8, .8, 40, Vector3.Zero(), scene);
    const world = new WorldBillboards(scene, () => new Texture(null, scene));
    const body: BillboardFrame = { url: '/art/actor.png', sourceWidth: 512, sourceHeight: 512, x: 0, y: 0, width: 512, height: 512, worldWidth: .8, worldHeight: 1.6, anchorX: .5, anchorY: .95, offsetX: 0, offsetY: 0, flipX: false, alpha: 1, tint: 0xffffff };
    world.sync('player', Vector3.Zero(), camera, body, null, true, false, [{ ...body, url: '/art/effect.png', alpha: .22 }]);
    const overlay = scene.meshes.find(mesh => mesh.metadata?.conditionOverlay)!;
    expect(overlay.isEnabled()).toBe(true); expect(overlay.isPickable).toBe(false);
    expect(overlay.material!.forceDepthWrite).toBe(false); expect(overlay.material!.disableDepthWrite).toBe(false);
    expect(overlay.metadata.tokenOccluder).toBe(false); expect(overlay.material!.alpha).toBeCloseTo(.22);
    world.sync('player', Vector3.Zero(), camera, body, null, true, false);
    expect(overlay.isEnabled()).toBe(false);
    world.sync('player', Vector3.Zero(), camera, body, null, false, false, [{ ...body, url: '/art/effect.png', alpha: .22 }]);
    expect(overlay.isEnabled()).toBe(false);
    world.remove('player'); expect(scene.meshes.filter(mesh => mesh.metadata?.conditionOverlay)).toHaveLength(0);
    world.dispose(); scene.dispose(); engine.dispose();
  });
});
