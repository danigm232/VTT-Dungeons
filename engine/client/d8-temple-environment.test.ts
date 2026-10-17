import { describe, expect, it } from 'vitest';
import { templeEnvironmentLight, TEMPLE_ENVIRONMENT_LAYERS } from '../../campaigns/one-shot/playground/temple-environment';
import { D8NIGHT } from '../../campaigns/one-shot/playground/d8night.config';
import { d8BabylonRuntime } from '../../apps/web/d8-babylon-runtime';
import { d8PublicRendererConfig } from '../../campaigns/one-shot/renderer-config';

describe('temple-only decorative environment', () => {
  it('does not force sunset or mutate the supplied automatic clock/climate/profile', () => {
    const view = { environment: { timeOfDay: 'auto', precipitation: 'snow' }, naturalLight: { phase: 'night', ambient: .13 }, climate: { snowCoverage: .2 }, gameClock: { seconds: 96000 } };
    const before = structuredClone(view), result = templeEnvironmentLight(view);
    expect(result).toBe(view); expect(result.naturalLight.phase).toBe('night');
    expect(result.environment).toBe(view.environment); expect(result.climate).toBe(view.climate); expect(result.gameClock).toBe(view.gameClock); expect(view).toEqual(before);
  });
  it('also preserves the automatic profile after the confirmed ending breaks the loop', () => {
    const view = { environment: { timeOfDay: 'auto' }, story: { d8TimeLoopBroken: true }, naturalLight: { phase: 'night', ambient: .13 } };
    expect(templeEnvironmentLight(view)).toBe(view);
  });
  it('respects explicit DM day/night/dawn controls and a disabled atmosphere layer', () => {
    for (const timeOfDay of ['day', 'night', 'dawn', 'sunset']) { const view = { environment: { timeOfDay } }; expect(templeEnvironmentLight(view)).toBe(view); }
    const view = { environment: { timeOfDay: 'auto' } }; expect(templeEnvironmentLight(view, false)).toBe(view);
  });
  it('defines five independent layers only on the temple configuration', () => {
    expect(TEMPLE_ENVIRONMENT_LAYERS).toEqual(['near', 'village', 'distant', 'panorama', 'atmosphere']);
    for (const [id, map] of Object.entries<any>(D8NIGHT.maps)) expect(Boolean(map.VTT_AMBIENCE.templeEnvironment?.enabled)).toBe(id === 'temple');
  });
  it('registers thin instances in the actual embedded runtime, not just the audit namespace', () => {
    expect(typeof d8BabylonRuntime.Mesh.prototype.thinInstanceSetBuffer).toBe('function');
  });
  it('actually publishes the visual layers to the VTT without exposing CANON', () => {
    const config = d8PublicRendererConfig();
    expect(config.maps.temple!.VTT_AMBIENCE.templeEnvironment.phase).toBe(5);
    expect(config.maps.temple!.VTT_AMBIENCE.templeEnvironment.layers.panorama).toBe(true);
    for (const [id, map] of Object.entries(config.maps)) {
      expect(map).not.toHaveProperty('CANON'); expect(map.VTT_AMBIENCE).not.toHaveProperty('interactables');
      if (id !== 'temple') expect(map.VTT_AMBIENCE).not.toHaveProperty('templeEnvironment');
    }
  });
});
