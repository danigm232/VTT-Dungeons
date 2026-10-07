import { describe, expect, it } from 'vitest';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Viewport } from '@babylonjs/core/Maths/math.viewport.js';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera.js';
import { Camera } from '@babylonjs/core/Cameras/camera.js';
import { D8NIGHT } from '../../campaigns/one-shot/playground/d8night.config';
import { d8SceneGrid, d8SpatialNavigation } from '../../campaigns/one-shot/public/pack';
import { combatCameraFrame, combatSafeProjection } from './combat-camera';
import { cameraBetaForTiltDegrees } from './camera-movement';
import { D8CameraMotion, d8CameraBaseAlpha, d8CameraHalfHeight, d8CellWorldPoint, d8FocusHeight, d8PickCell, type D8CameraPose } from './d8-camera';

const start: D8CameraPose = { alpha: -Math.PI / 4, beta: Math.PI / 4, halfHeight: 20, target: { x: 0, y: 4, z: 0 } };

describe('D8 2.5D camera', () => {
  it('selects raised stair cells at their actual projected height in every camera direction', () => {
    const terrain = d8SpatialNavigation('temple').terrain, grid = d8SceneGrid('temple'), size = D8NIGHT.maps.temple.MAP.size as [number,number];
    const stairs = terrain.surfaces[0]!.tiles.filter(tile => tile.kind === 'stair');
    expect(stairs.length).toBeGreaterThan(0);
    for (const tile of stairs) for (let orientation = 0; orientation < 8; orientation++) {
      const floor = d8CellWorldPoint(tile.cell, size, grid, terrain);
      expect(floor.y).toBeGreaterThan(.23);
      const center = new Vector3(floor.x, floor.y, floor.z), angle = orientation * Math.PI / 4;
      const eye = center.add(new Vector3(Math.cos(angle), 1, Math.sin(angle)).scale(100));
      const view = Matrix.LookAtLH(eye, center, Vector3.Up()), projection = Matrix.OrthoLH(24, 16, .1, 1000);
      const viewport = { width: 1200, height: 800 }, screen = Vector3.Project(center, Matrix.Identity(), view.multiply(projection), new Viewport(0,0,1200,800));
      expect(d8PickCell(screen, viewport, view, projection, size, grid, terrain)).toEqual(tile.cell);
    }
  });
  it('copies Babylon vector coordinates when initializing the camera', () => {
    const point = new Vector3(12, 4, -8), motion = new D8CameraMotion();
    const pose = motion.update({ ...start, target: point }, 0);
    expect(pose.target).toEqual({ x: 12, y: 4, z: -8 });
    point.x = 99;
    expect(pose.target.x).toBe(12);
    expect(motion.update({ ...start, target: new Vector3(5, 2, -3) }, 16).target.x).toBeGreaterThan(5);
  });

  it('keeps motion continuous across network snapshots, wraps and rapid direction changes', () => {
    const motion = new D8CameraMotion();
    motion.update(start, 0);
    let pose = motion.update({ ...start, alpha: start.alpha + Math.PI / 4, target: { x: 12, y: 1, z: -8 } }, 16);
    expect(pose.alpha).toBeGreaterThan(start.alpha);
    expect(pose.alpha).toBeLessThan(start.alpha + .05);
    const beforePacket = structuredClone(pose);
    pose = motion.update({ ...start, alpha: start.alpha + Math.PI * 7 / 4 }, 0);
    expect(pose).toEqual(beforePacket);
    for (let frame = 0; frame < 180; frame++) {
      const before = structuredClone(pose);
      pose = motion.update({ ...start, alpha: start.alpha + Math.PI * 7 / 4 }, 1000 / 60);
      expect(Math.abs(pose.alpha - before.alpha)).toBeLessThan(.12);
      expect(pose.halfHeight).toBe(20);
    }
    expect(pose.alpha).toBeCloseTo(start.alpha - Math.PI / 4, 4);
    expect(pose.target).toEqual(start.target);
    const results = [30, 60, 120].map(fps => {
      const rig = new D8CameraMotion(); rig.update(start, 0);
      let pose = start;
      for (let frame = 0; frame < fps; frame++) pose = rig.update({ ...start, alpha: start.alpha + Math.PI / 4, halfHeight: 5, target: { x: 5, y: 1, z: 8 } }, 1000 / fps);
      return pose;
    });
    for (const result of results) { expect(result.alpha).toBeCloseTo(results[0]!.alpha, 5); expect(result.target.x).toBeCloseTo(results[0]!.target.x, 5); }
  });

  it('fits every map throughout an orbit without changing scale or perspective depth', () => {
    for (const map of Object.values(D8NIGHT.maps) as any[]) for (const aspect of [.46, 1, 1.78]) for (const tilt of [25,35,45,50]) {
      const [width, depth] = map.MAP.size, beta = cameraBetaForTiltDegrees(tilt);
      const halfHeight = d8CameraHalfHeight({ width, depth, height: 8 }, beta, aspect);
      const projection = Matrix.OrthoLH(halfHeight * aspect * 2, halfHeight * 2, .1, 1000);
      for (let step = 0; step < 32; step++) {
        const alpha = d8CameraBaseAlpha(map.camera.alpha) + step * Math.PI / 16;
        const center = new Vector3(0, 4, 0), eye = center.add(new Vector3(Math.cos(alpha) * Math.sin(beta), Math.cos(beta), Math.sin(alpha) * Math.sin(beta)).scale(200));
        const view = Matrix.LookAtLH(eye, center, Vector3.Up());
        for (const x of [-width / 2, width / 2]) for (const z of [-depth / 2, depth / 2]) for (const y of [0, 8]) {
          const p = Vector3.Project(new Vector3(x, y, z), Matrix.Identity(), view.multiply(projection), new Viewport(0, 0, 1000 * aspect, 1000));
          expect(p.x).toBeGreaterThan(0); expect(p.x).toBeLessThan(1000 * aspect);
          expect(p.y).toBeGreaterThan(0); expect(p.y).toBeLessThan(1000);
        }
        // Equal billboard height anywhere on the map, including near/far edges.
        expect(projection.m[5]).toBeCloseTo(1 / halfHeight, 6);
      }
    }
  });

  it('picks the projected cell and centers an upright sprite at every tilt and screen shape', () => {
    for (const viewport of [{ width: 390, height: 844 }, { width: 1600, height: 900 }]) for (const tactical of [false, true]) for (const tilt of [25,35,45,50]) for (let step = 0; step < 8; step++) {
      const size: [number, number] = [52, 68], grid = { cols: 80, rows: 104 };
      const cell = { col: 55, row: 70 }, floor = d8CellWorldPoint(cell, size, grid), beta = cameraBetaForTiltDegrees(tilt), alpha = -Math.PI / 4 + step * Math.PI / 4;
      const center = new Vector3(floor.x, floor.y + d8FocusHeight(1.8, .9, beta), floor.z);
      const eye = center.add(new Vector3(Math.cos(alpha) * Math.sin(beta), Math.cos(beta), Math.sin(alpha) * Math.sin(beta)).scale(100));
      const view = Matrix.LookAtLH(eye, center, Vector3.Up());
      const safe = tactical ? combatCameraFrame({ width: size[0], height: size[1] }, viewport).safe : { left: 0, top: 0, ...viewport };
      const halfHeight = 10, base = Matrix.OrthoLH(halfHeight * 2 * safe.width / safe.height, halfHeight * 2, .1, 1000);
      const projection = tactical ? Matrix.FromArray(combatSafeProjection(base.m, viewport, safe, true)) : base;
      const screen = Vector3.Project(new Vector3(floor.x, floor.y, floor.z), Matrix.Identity(), view.multiply(projection), new Viewport(0, 0, viewport.width, viewport.height));
      expect(d8PickCell(screen, viewport, view, projection, size, grid)).toEqual(cell);
      const pixelsPerMeter = viewport.height * projection.m[5]! / 2;
      const spriteCenterY = screen.y + (.5 - .9) * 1.8 * pixelsPerMeter;
      expect(spriteCenterY).toBeCloseTo(safe.top + safe.height / 2, 3);
      expect(screen.x).toBeCloseTo(safe.left + safe.width / 2, 3);
    }
  });

  it('keeps Babylon and the motion controller within the same tilt limits after rendering', () => {
    const engine = new NullEngine(), scene = new Scene(engine), camera = new ArcRotateCamera('d8', 0, Math.PI / 4, 100, Vector3.Zero(), scene);
    camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
    camera.lowerBetaLimit = cameraBetaForTiltDegrees(50); camera.upperBetaLimit = cameraBetaForTiltDegrees(35);
    for (const tilt of [35, 50]) {
      const rig = new D8CameraMotion(), target = { ...start, beta: cameraBetaForTiltDegrees(tilt) };
      for (let frame = 0; frame < 120; frame++) {
        const pose = rig.update(target, 1000 / 60); camera.alpha = pose.alpha; camera.beta = pose.beta;
        camera._checkInputs();
        expect(camera.beta).toBe(pose.beta);
      }
    }
    scene.dispose(); engine.dispose();
  });
});
