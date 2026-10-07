import { describe, expect, it, vi } from 'vitest';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Camera } from '@babylonjs/core/Cameras/camera.js';
import { WorldRenderer } from '../../apps/web/world.js';

function fixture(hits: boolean[]) {
  const mask: any = { clear: vi.fn(), rect: vi.fn(() => mask), fill: vi.fn(() => mask), visible: false };
  const view: any = { entity: { id: 'test', tokenId: 'test', hp: 5, maxHp: 10 }, sprite: { width: 92, height: 92, anchor: { x: .5, y: 1 } }, body: { x: 0, y: 0, mask: null }, occlusionMask: mask, ring: { visible: true }, health: { visible: true }, states: { visible: true }, conditionIcon: { visible: true } };
  const camera = { mode: Camera.ORTHOGRAPHIC_CAMERA, position: new Vector3(0, 2, -10), getForwardRay: () => ({ direction: new Vector3(0, 0, 1) }), getDirection: () => Vector3.Right() };
  const pick = vi.fn().mockImplementationOnce(() => null);
  pick.mockReset(); for (const hit of hits) pick.mockReturnValueOnce(hit ? { hit: true } : null);
  const renderer: any = Object.create(WorldRenderer.prototype);
  Object.assign(renderer, { d8Scene: { activeCamera: camera, pickWithRay: pick }, campaign: { tokens: { test: { logicalHeight: 92, worldHeightMeters: 1.37 } } }, snapshot: { combat: { active: true } }, tokenOcclusionCache: new Map(), interpolatedWorldPosition: () => Vector3.Zero() });
  return { renderer, view, mask, pick };
}

describe('partial token occlusion', () => {
  it('places D8 opaque boots above the 3D floor instead of using the flat-map sorting anchor', () => {
    const renderer: any = Object.create(WorldRenderer.prototype);
    renderer.campaign = { tokens: { maria: { logicalHeight: 92, worldHeightMeters: 1.6 } } };
    renderer.billboardSourceUrls = new Map([[7, '/maria.png']]);
    const view: any = { entity: { tokenId: 'maria' }, body: { x: 0, y: 0 }, sprite: { height: 92 } };
    const sprite: any = { visible: true, texture: { source: { uid: 7, width: 1024, height: 1024 }, frame: { x: 0, y: 0, width: 1024, height: 1024 } },
      width: 92, height: 92, anchor: { x: .5, y: .84 }, x: 0, y: 0, scale: { x: 1 }, alpha: 1, tint: 0xffffff };
    view.root = { alpha: 1 }; view.body.alpha = 1;
    renderer.d8Scene = {};
    expect(renderer.nativeTokenFrame(view, sprite).anchorY).toBe(1);
    renderer.d8Scene = null;
    expect(renderer.nativeTokenFrame(view, sprite).anchorY).toBe(.84);
  });
  it('masks only covered body regions, keeping the visible portion and ground ring', () => {
    const { renderer, view, mask, pick } = fixture([...Array(9).fill(true), ...Array(9).fill(false)]);
    expect(renderer.applyTokenOcclusion(view, 100)).toBe(false);
    expect(view.body.mask).toBe(mask); expect(mask.rect).toHaveBeenCalledTimes(9);
    expect(view.ring.visible).toBe(true); expect(view.health.visible).toBe(false);
    renderer.applyTokenOcclusion(view, 120); expect(pick).toHaveBeenCalledTimes(18);
  });
  it('hides the whole actor only if every sampled region is covered', () => {
    const { renderer, view, mask } = fixture(Array(18).fill(true));
    expect(renderer.applyTokenOcclusion(view, 100)).toBe(true);
    expect(mask.rect).not.toHaveBeenCalled(); expect(view.ring.visible).toBe(false);
  });
  it('keeps physical token scale unchanged when a crop falls or stands', () => {
    const { renderer, view } = fixture([]);
    renderer.d8MapConfig = {}; renderer.app = { screen: { height: 600 } };
    renderer.d8Scene.activeCamera.orthoTop = 5; renderer.d8Scene.activeCamera.orthoBottom = -5;
    renderer.d8Scene.activeCamera.getProjectionMatrix = () => Matrix.OrthoLH(10,
      renderer.d8Scene.activeCamera.orthoTop - renderer.d8Scene.activeCamera.orthoBottom, .1, 100);
    const scale = renderer.terrainTokenScale(view); view.sprite.height = 32;
    expect(renderer.terrainTokenScale(view)).toBe(scale);
    renderer.d8Scene.activeCamera.orthoTop = 10; renderer.d8Scene.activeCamera.orthoBottom = -10;
    expect(renderer.terrainTokenScale(view)).toBe(scale / 2);
  });
});
