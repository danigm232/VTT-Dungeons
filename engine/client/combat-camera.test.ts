import { describe, expect, it } from 'vitest';
import { combatCameraFrame, combatCamera3DFit, combatEncounterBounds, combatSafeProjection } from './combat-camera';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Viewport } from '@babylonjs/core/Maths/math.viewport';

describe('combatCameraFrame', () => {
  it('projects elevated encounter corners inside the HUD-safe rectangle without a partial WebGL viewport', () => {
    for (const viewport of [{ width: 390, height: 844 }, { width: 750, height: 750 }, { width: 1600, height: 900 }, { width: 844, height: 390 }]) {
      const safe = combatCameraFrame({ width: 100, height: 100 }, viewport).safe;
      const size = { width: 20, depth: 30, height: 6 }, alpha = .7, beta = 1, fov = .8;
      const fit = combatCamera3DFit(size, alpha, beta, fov, safe.width / safe.height);
      const eye = new Vector3(Math.cos(alpha) * Math.sin(beta), Math.cos(beta), Math.sin(alpha) * Math.sin(beta)).scale(fit.radius);
      const view = Matrix.LookAtLH(eye, Vector3.Zero(), Vector3.Up());
      for (const orthographic of [false, true]) {
        const base = orthographic ? Matrix.OrthoLH(fit.halfHeight * 2 * safe.width / safe.height, fit.halfHeight * 2, .1, 1000) : Matrix.PerspectiveFovLH(fov, viewport.width / viewport.height, .1, 1000);
        const projection = Matrix.FromArray(combatSafeProjection(base.m, viewport, safe, orthographic));
        for (const x of [-10, 10]) for (const y of [-3, 3]) for (const z of [-15, 15]) {
          const point = Vector3.Project(new Vector3(x, y, z), Matrix.Identity(), view.multiply(projection), new Viewport(0, 0, viewport.width, viewport.height));
          expect(point.x).toBeGreaterThanOrEqual(safe.left); expect(point.x).toBeLessThanOrEqual(safe.left + safe.width);
          expect(point.y).toBeGreaterThanOrEqual(safe.top); expect(point.y).toBeLessThanOrEqual(safe.top + safe.height);
        }
      }
    }
  });
  it('fits all elevated corners in perspective and orthographic cameras at every orientation', () => {
    const size = { width: 46, depth: 31, height: 12 };
    for (const aspect of [.4, 1, 1.8, 3]) for (let step = 0; step < 8; step++) for (const tilt of [20, 45, 65]) {
      const alpha = step * Math.PI / 4, beta = (90 - tilt) * Math.PI / 180, fov = .8;
      const fit = combatCamera3DFit(size, alpha, beta, fov, aspect);
      for (const x of [-23, 23]) for (const y of [-6, 6]) for (const z of [-15.5, 15.5]) {
        const horizontal = -Math.sin(alpha) * x + Math.cos(alpha) * z;
        const vertical = -Math.cos(alpha) * Math.cos(beta) * x + Math.sin(beta) * y - Math.sin(alpha) * Math.cos(beta) * z;
        const depth = Math.cos(alpha) * Math.sin(beta) * x + Math.cos(beta) * y + Math.sin(alpha) * Math.sin(beta) * z;
        expect(Math.abs(horizontal) / ((fit.radius - depth) * Math.tan(fov / 2) * aspect)).toBeLessThan(1);
        expect(Math.abs(vertical) / ((fit.radius - depth) * Math.tan(fov / 2))).toBeLessThan(1);
        expect(Math.abs(horizontal)).toBeLessThan(fit.halfHeight * aspect);
        expect(Math.abs(vertical)).toBeLessThan(fit.halfHeight);
      }
    }
  });
  it('encuadra toda la cuadrícula dentro del espacio que dejan los paneles de combate', () => {
    const grid = { width: 1_440, height: 900 }, viewport = { width: 1_600, height: 1_000 };
    const frame = combatCameraFrame(grid, viewport);
    const mapWidth = grid.width * frame.scale, mapHeight = grid.height * .92 * frame.scale;
    expect(frame.centerX - mapWidth / 2).toBeGreaterThanOrEqual(frame.safe.left);
    expect(frame.centerX + mapWidth / 2).toBeLessThanOrEqual(frame.safe.left + frame.safe.width);
    expect(frame.centerY - mapHeight / 2).toBeGreaterThanOrEqual(frame.safe.top);
    expect(frame.centerY + mapHeight / 2).toBeLessThanOrEqual(frame.safe.top + frame.safe.height);
  });

  it('reserva las barras superior e inferior en móvil sin perder ningún extremo del mapa', () => {
    const grid = { width: 960, height: 720 }, viewport = { width: 390, height: 844 };
    const frame = combatCameraFrame(grid, viewport);
    expect(frame.safe.top).toBe(116);
    expect(frame.safe.height).toBe(608);
    expect(grid.width * frame.scale).toBeLessThanOrEqual(frame.safe.width);
    expect(grid.height * .92 * frame.scale).toBeLessThanOrEqual(frame.safe.height);
  });

  it('uses the full width of a narrow desktop rather than reserving a side panel', () => {
    expect(combatCameraFrame({ width: 1440, height: 900 }, { width: 750, height: 750 }).safe.width).toBe(734);
  });

  it('frames close actors instead of the entire scenario, including elevation and movement endpoints', () => {
    const fallback = { center: { x: 30, y: 5, z: 30 }, size: { width: 60, height: 10, depth: 60 } };
    const points = [{ x: 10, y: 0, z: 10 }, { x: 14, y: 6, z: 16 }, { x: 18, y: 0, z: 10 }];
    const bounds = combatEncounterBounds(points, 3, fallback);
    expect(bounds.center).toEqual({ x: 14, y: 4, z: 13 }); expect(bounds.size).toEqual({ width: 14, height: 10, depth: 12 });
    for (const point of points) { expect(Math.abs(point.x - bounds.center.x)).toBeLessThan(bounds.size.width / 2); expect(Math.abs(point.z - bounds.center.z)).toBeLessThan(bounds.size.depth / 2); expect(Math.abs(point.y - bounds.center.y)).toBeLessThan(bounds.size.height / 2); }
    expect(combatEncounterBounds([], 3, fallback)).toBe(fallback);
    expect(combatEncounterBounds([{ x: NaN, y: 0, z: 0 }], 3, fallback)).toBe(fallback);
  });
});
