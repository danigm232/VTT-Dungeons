import { describe, expect, it } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera.js';
import { Camera } from '@babylonjs/core/Cameras/camera.js';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Ray } from '@babylonjs/core/Culling/ray.js';
import { Plane } from '@babylonjs/core/Maths/math.plane.js';
import { d8CameraHalfHeight, d8CameraNearPlane } from './d8-camera';
import { d8PublicRendererConfig } from '../../campaigns/one-shot/renderer-config';
import { sylvaniaEveningView, sylvaniaLightStyle, SYLVANIA_STYLE } from '../../campaigns/one-shot/playground/sylvania-environment';

describe('Sylvania presentation shared by local boards', () => {
  it('publishes the same sky and independent decorative layers without private game data', () => {
    const config = d8PublicRendererConfig();
    expect(config.maps.temple!.VTT_AMBIENCE.horizon.zenith).toBe(SYLVANIA_STYLE.sky[5][1]);
    expect(config.maps.temple!.VTT_AMBIENCE.horizon.horizon).toBe(SYLVANIA_STYLE.sky[2][1]);
    for (const id of ['cafe', 'market', 'garden', 'dinner']) {
      const map = config.maps[id]!; expect(map.VTT_AMBIENCE.sylvaniaEnvironment.enabled).toBe(true);
      expect(map.VTT_AMBIENCE.horizon.zenith).toBe(config.maps.temple!.VTT_AMBIENCE.horizon.zenith);
      expect(map.VTT_AMBIENCE.horizon.horizon).toBe(config.maps.temple!.VTT_AMBIENCE.horizon.horizon);
      expect(map).not.toHaveProperty('CANON'); expect(map.MAP.navigation).not.toHaveProperty('interactions');
    }
    expect(config.maps.mirror!.VTT_AMBIENCE).not.toHaveProperty('sylvaniaEnvironment');
  });
  it('follows automatic time without changing the clock and defers darkness to a confirmed public ending', () => {
    const view = { environment: { timeOfDay: 'auto' }, gameClock: { seconds: 95000 }, naturalLight: { phase: 'night' } }, before = structuredClone(view);
    expect(sylvaniaEveningView(view)).toBe(view); expect(view).toEqual(before);
    expect(sylvaniaEveningView({ ...view, story: { d8TimeLoopBroken: true } }).naturalLight.phase).toBe('night');
    expect(sylvaniaEveningView({ ...view, environment: { timeOfDay: 'day' } })).toEqual({ ...view, environment: { timeOfDay: 'day' } });
    expect(sylvaniaEveningView({ ...view, story: { d8TimeLoopBroken: true, d8EndingVisual: 'darkness' } }).naturalLight.direct).toBe(0);
    const manual = { ...view, environment: { timeOfDay: 'sunset' }, story: { d8EndingVisual: 'darkness' } };
    expect(sylvaniaEveningView(manual)).toBe(manual);
  });
  it('separates golden low sunlight from cool fill and preserves night/day contrast', () => {
    const sunset = sylvaniaLightStyle({ phase: 'sunset', ambient: .43, direct: .18, warmth: .95 });
    expect(sunset.key[0]).toBeGreaterThan(sunset.key[2] * 2);
    expect(sunset.fill[2]).toBeGreaterThan(sunset.fill[0]);
    expect(sunset.ground[2]).toBeGreaterThan(sunset.ground[0]);
    expect(sunset.sunElevation).toBe(15); expect(sunset.sunlight).toBeGreaterThan(.18);
    expect(sunset.sky[2][0]).toBeGreaterThan(sunset.sky[2][2]);
    const night = sylvaniaLightStyle({ phase: 'night', ambient: .13, direct: 0, warmth: .08 });
    expect(night.keyIntensity).toBe(0); expect(night.sunlight).toBe(0);
    const day = sylvaniaLightStyle({ phase: 'midday', ambient: 1, direct: 1, warmth: .08 });
    expect(day.sky[2][2]).toBeGreaterThan(day.sky[2][0]); expect(day.sunElevation).toBeGreaterThan(sunset.sunElevation);
    expect(day.fillIntensity).toBeGreaterThan(sunset.fillIntensity);
  });
  it('changes the horizon with the selected phase even at identical ambient intensity', () => {
    const phase = (p: string) => sylvaniaLightStyle({ phase: p, ambient: .5, direct: .3, warmth: .4 }).sky;
    expect(phase('sunset')).not.toEqual(phase('midday')); expect(phase('night')).not.toEqual(phase('dawn'));
  });
  it('keeps portrait bottom-screen rays above the floor at low tilts without changing camera pose', () => {
    const engine = new NullEngine(), scene = new Scene(engine), camera = new ArcRotateCamera('audit', Math.PI / 2, 1, 62, new Vector3(0, 4, 0), scene);
    try {
      for (const tilt of [15, 20, 30, 40]) {
        camera.mode = Camera.ORTHOGRAPHIC_CAMERA; camera.beta = (90 - tilt) * Math.PI / 180;
        const half = d8CameraHalfHeight({ width: 30, depth: 24, height: 8 }, camera.beta, 720 / 1280);
        camera.orthoTop = half; camera.orthoBottom = -half; camera.orthoLeft = -half * 720 / 1280; camera.orthoRight = half * 720 / 1280;
        camera.minZ = d8CameraNearPlane(camera.radius, camera.beta, half, 4); camera.maxZ = 1800;
        const ray = Ray.CreateNew(360, 1280, 720, 1280, Matrix.Identity(), camera.getViewMatrix(true), camera.getProjectionMatrix(true));
        expect(ray.origin.y).toBeGreaterThan(0);
        expect(ray.intersectsPlane(Plane.FromPositionAndNormal(new Vector3(0, .045, 0), Vector3.Up()))).toBeGreaterThan(0);
        expect(camera.radius).toBe(62); expect(camera.beta).toBeCloseTo((90 - tilt) * Math.PI / 180);
      }
    } finally { scene.dispose(); engine.dispose(); }
  });
});
