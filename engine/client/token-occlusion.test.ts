import { describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera.js';
import { Camera } from '@babylonjs/core/Cameras/camera.js';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Viewport } from '@babylonjs/core/Maths/math.viewport.js';
import { WorldRenderer } from '../../apps/web/world';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder.js';
import { Ray } from '@babylonjs/core/Culling/ray.js';
import { D8OcclusionIndex } from './d8-occlusion-index.js';

function fixture(alpha = -.8, beta = .7, anchorY = .84) {
  const engine = new NullEngine(), scene = new Scene(engine);
  const position = new Vector3(2, 1.2, 3);
  const camera = new ArcRotateCamera('camera', alpha, beta, 50, position, scene);
  camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
  camera.orthoLeft = -10; camera.orthoRight = 10; camera.orthoTop = 10; camera.orthoBottom = -10;
  scene.activeCamera = camera; camera.getViewMatrix(true); camera.getProjectionMatrix(true);
  const renderer = Object.create(WorldRenderer.prototype) as any;
  Object.assign(renderer, { d8Scene: scene, tokenOcclusionCache: new Map(),
    campaign: { tokens: { token: { worldHeightMeters: 2, logicalHeight: 100 } } },
    interpolatedWorldPosition: () => position, snapshot: { combat: { active: true } } });
  const mask = { clear: vi.fn(), rect: vi.fn(), fill: vi.fn(), visible: false };
  mask.rect.mockReturnValue(mask); mask.fill.mockReturnValue(mask);
  const view = { entity: { id: 'actor', tokenId: 'token', hp: 8, maxHp: 9 },
    sprite: { width: 60, height: 100, anchor: { x: .45, y: anchorY } }, body: { x: 3, y: -4, mask: null },
    occlusionMask: mask, ring: { visible: true }, health: { visible: true }, states: { visible: true }, conditionIcon: { visible: true } };
  return { renderer, scene, camera, view, position, dispose: () => { scene.dispose(); engine.dispose(); } };
}

describe('camera-facing token occlusion', () => {
  it('shows a cached native combat cue through scenery, but never for unknown actors or exploration', () => {
    const f = fixture();
    try {
      f.renderer.combatOcclusionCache = new Map();
      f.renderer.snapshot.combat.participants = [{ id: 'actor' }];
      const scenery = CreateSphere('combat-wall', { diameter: 4 }, f.scene);
      scenery.metadata = { tokenOccluder: true };
      scenery.position.copyFrom(f.position.add(new Vector3(0, 1, 0)).subtract(f.camera.getForwardRay().direction.scale(5)));
      scenery.computeWorldMatrix(true);
      const pick = vi.spyOn(f.scene, 'pickWithRay');
      expect(f.renderer.nativeCombatActorOccluded(f.view.entity, 100)).toBe(true);
      expect(pick).toHaveBeenCalledTimes(3);
      expect(f.renderer.nativeCombatActorOccluded(f.view.entity, 200)).toBe(true);
      expect(pick).toHaveBeenCalledTimes(3);
      f.renderer.snapshot.combat.participants = [];
      expect(f.renderer.nativeCombatActorOccluded(f.view.entity, 250)).toBe(false);
      f.renderer.snapshot.combat.active = false;
      expect(f.renderer.nativeCombatActorOccluded(f.view.entity, 300)).toBe(false);
    } finally { f.dispose(); }
  });
  it('uses Babylon geometry to distinguish scenery in front, behind and partially covering a token', () => {
    const f = fixture();
    try {
      const direction = f.camera.getForwardRay().direction, up = f.camera.getDirection(Vector3.Up());
      const scenery = CreateSphere('occluder', { diameter: 4 }, f.scene);
      scenery.metadata = { tokenOccluder: true };
      const center = f.position.add(up.scale(.68));
      scenery.position.copyFrom(center.subtract(direction.scale(5))); scenery.computeWorldMatrix(true);
      expect(f.renderer.applyTokenOcclusion(f.view, 100)).toBe(true);
      scenery.position.copyFrom(center.add(direction.scale(5))); scenery.computeWorldMatrix(true);
      expect(f.renderer.applyTokenOcclusion(f.view, 200)).toBe(false);
      expect(f.view.body.mask).toBeNull();
      scenery.scaling.setAll(.35); scenery.position.copyFrom(f.position.add(up.scale(1.1)).subtract(direction.scale(5))); scenery.computeWorldMatrix(true);
      expect(f.renderer.applyTokenOcclusion(f.view, 300)).toBe(false);
      expect(f.view.body.mask).toBe(f.view.occlusionMask);
      const visiblePatches = f.view.occlusionMask.rect.mock.calls.length;
      expect(visiblePatches).toBeGreaterThan(0); expect(visiblePatches).toBeLessThan(18);
      scenery.isVisible = false;
      expect(f.renderer.applyTokenOcclusion(f.view, 400)).toBe(false); expect(f.view.body.mask).toBeNull();
    } finally { f.dispose(); }
  });
  it('samples exactly the rendered sprite across feet pivots, orbit and tilt', () => {
    for (const anchor of [.84, .9, 1]) for (const beta of [.35, .8, 1.2]) for (let orientation = 0; orientation < 8; orientation++) {
      const f = fixture(orientation * Math.PI / 4, beta, anchor);
      try {
        const targets: Vector3[] = [];
        vi.spyOn(f.scene, 'pickWithRay').mockImplementation((ray: any, predicate: any) => {
          expect(predicate({ metadata: { tokenOccluder: true }, isVisible: true, isEnabled: () => true })).toBe(true);
          expect(predicate({ metadata: {}, isVisible: true, isEnabled: () => true })).toBe(false);
          targets.push(ray.origin.add(ray.direction.scale(ray.length + .06))); return { hit: false } as any;
        });
        expect(f.renderer.applyTokenOcclusion(f.view, 100)).toBe(false);
        const matrix = f.camera.getViewMatrix().multiply(f.camera.getProjectionMatrix());
        const viewport = new Viewport(0, 0, 1000, 1000);
        const foot = Vector3.Project(f.position, Matrix.Identity(), matrix, viewport);
        expect(targets).toHaveLength(18);
        targets.forEach((target, index) => {
          const point = Vector3.Project(target, Matrix.Identity(), matrix, viewport);
          expect(point.x - foot.x).toBeCloseTo((3 + 60 * ((index % 3 + .5) / 3 - .45)) * 1, 4);
          expect(point.y - foot.y).toBeCloseTo((-4 + 100 * ((Math.floor(index / 3) + .5) / 6 - anchor)) * 1, 4);
        });
        expect(f.view.body.mask).toBeNull();
      } finally { f.dispose(); }
    }
  });
  it('masks only hidden body patches and keeps visible head/status information', () => {
    const f = fixture();
    try {
      let index = 0;
      vi.spyOn(f.scene, 'pickWithRay').mockImplementation(() => ({ hit: index++ >= 9 }) as any);
      expect(f.renderer.applyTokenOcclusion(f.view, 100)).toBe(false);
      expect(f.view.occlusionMask.rect).toHaveBeenCalledTimes(9);
      expect(f.view.body.mask).toBe(f.view.occlusionMask);
      expect(f.view.ring.visible).toBe(false); expect(f.view.health.visible).toBe(true); expect(f.view.states.visible).toBe(true);
      index = 18;
      expect(f.renderer.applyTokenOcclusion(f.view, 200)).toBe(true);
      expect(f.view.health.visible).toBe(false); expect(f.view.states.visible).toBe(false);
    } finally { f.dispose(); }
  });
  it('invalidates cached rays immediately when a fallen frame changes dimensions', () => {
    const f = fixture();
    try {
      const pick = vi.spyOn(f.scene, 'pickWithRay').mockReturnValue({ hit: false } as any);
      f.renderer.applyTokenOcclusion(f.view, 100); f.renderer.applyTokenOcclusion(f.view, 101);
      expect(pick).toHaveBeenCalledTimes(18);
      f.view.sprite.width = 90; f.renderer.applyTokenOcclusion(f.view, 102);
      expect(pick).toHaveBeenCalledTimes(36);
    } finally { f.dispose(); }
  });
  it('keeps an unchanged partial-occlusion mask instead of rebuilding its graphics each frame', () => {
    const f = fixture();
    try {
      let index = 0;
      const pick = vi.spyOn(f.scene, 'pickWithRay').mockImplementation(() => ({ hit: index++ % 18 >= 9 }) as any);
      f.renderer.applyTokenOcclusion(f.view, 100);
      f.renderer.applyTokenOcclusion(f.view, 101);
      expect(pick).toHaveBeenCalledTimes(18);
      expect(f.view.occlusionMask.rect).toHaveBeenCalledTimes(9);
      expect(f.view.occlusionMask.clear).toHaveBeenCalledTimes(1);
    } finally { f.dispose(); }
  });
  it('uses the spatial index for frozen scenery and checks dynamic scenery separately', () => {
    const f = fixture();
    try {
      const direction = f.camera.getForwardRay().direction, up = f.camera.getDirection(Vector3.Up());
      const scenery = CreateSphere('occluder', { diameter: 4 }, f.scene);
      scenery.metadata = { tokenOccluder: true };
      const center = f.position.add(up.scale(.68));
      scenery.position.copyFrom(center.subtract(direction.scale(5))); scenery.computeWorldMatrix(true); scenery.freezeWorldMatrix();
      const bounds = scenery.getBoundingInfo().boundingBox;
      const index = new D8OcclusionIndex<typeof scenery>();
      index.add({ minX: bounds.minimumWorld.x, maxX: bounds.maximumWorld.x, minZ: bounds.minimumWorld.z, maxZ: bounds.maximumWorld.z }, scenery);
      f.renderer.d8OcclusionIndex = index;
      f.renderer.d8DynamicOccluders = [];
      f.renderer.d8OcclusionIndexReady = true;
      const ray = Ray.CreateNewFromTo(center.subtract(direction.scale(10)), center);
      expect(f.renderer.d8RayHitsOccluder(ray)).toBe(true);
      index.clear();
      expect(f.renderer.d8RayHitsOccluder(ray)).toBe(false);
      f.renderer.d8DynamicOccluders = [scenery];
      expect(f.renderer.d8RayHitsOccluder(ray)).toBe(true);
    } finally { f.dispose(); }
  });
});
