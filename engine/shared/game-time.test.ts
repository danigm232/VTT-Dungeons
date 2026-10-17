import { describe, expect, it } from 'vitest';
import {
  SECONDS_PER_HOUR, advanceClimate, climateUsesDifficultTerrain, emptyClimateState,
  formatGameClock, gameClockAt, naturalLightProfile,initialGameTimeSeconds
} from './game-time.js';

describe('reloj global y luz natural', () => {
  it('mantiene una hora autoritativa y extrapola sólo mientras está en marcha', () => {
    const running = { seconds: 28_800, serverTime: 10_000, running: true, mode: 'exploration' as const, pauseReason: null };
    expect(gameClockAt(running, 12_500)).toBe(28_802.5);
    expect(gameClockAt({ ...running, running: false, mode: 'paused', pauseReason: 'dm' }, 12_500)).toBe(28_800);
    expect(formatGameClock(86_400 + 13 * 3_600 + 7 * 60 + 9)).toMatchObject({ day: 2, text: 'Día 2 · 13:07:09' });
  });

  it('pasa por fases solares con intensidad continua y acepta la hora impuesta por el DM', () => {
    const dawn = naturalLightProfile(6 * SECONDS_PER_HOUR);
    const midday = naturalLightProfile(12 * SECONDS_PER_HOUR);
    const night = naturalLightProfile(1 * SECONDS_PER_HOUR);
    expect(dawn.phase).toBe('dawn');
    expect(midday.phase).toBe('midday');
    expect(dawn.ambient).toBeGreaterThan(night.ambient);
    expect(midday.direct).toBeGreaterThan(dawn.direct);
    expect(naturalLightProfile(6 * SECONDS_PER_HOUR, 'night').phase).toBe('night');
  });
  it('abre una nueva partida D8 en golden hour y conserva el comienzo matinal de Stormwreck',()=>{
    expect(naturalLightProfile(initialGameTimeSeconds('d8-night-private')).phase).toBe('sunset');
    expect(initialGameTimeSeconds('stormwreck-isle')).toBe(8*SECONDS_PER_HOUR);
  });
});

describe('evolución determinista del clima', () => {
  const snow = (level: 1 | 2 | 3) => ({ precipitation: 'snow' as const, precipitationLevel: level, storm: false, stormIntensity: 0, temperatureC: -4, fogTarget: 0, floodTarget: 0 });

  it.each([
    [1, 3 * SECONDS_PER_HOUR], [2, SECONDS_PER_HOUR], [3, 20 * 60]
  ] as const)('cubre el terreno al ritmo de nieve %i', (level, seconds) => {
    const result = advanceClimate(emptyClimateState(), snow(level), seconds);
    expect(result.snowCoverage).toBe(1);
    expect(result.snowDepthCm).toBeGreaterThan(0);
  });

  it('conserva nieve tras parar la precipitación y separa espesor de cobertura', () => {
    const snowy = advanceClimate(emptyClimateState(), snow(3), 10 * 60);
    const dryCold = advanceClimate(snowy, { ...snow(3), precipitation: 'none' }, 20 * 60);
    expect(dryCold.snowCoverage).toBe(snowy.snowCoverage);
    expect(dryCold.snowDepthCm).toBe(snowy.snowDepthCm);
    expect(climateUsesDifficultTerrain(dryCold, false)).toBe(false);
    expect(climateUsesDifficultTerrain({ ...dryCold, snowDepthCm: 15 }, true)).toBe(true);
  });

  it('avanza lluvia, charcos, niebla e inundación y los disipa gradualmente', () => {
    const rain = { precipitation: 'rain' as const, precipitationLevel: 2 as const, storm: true, stormIntensity: 1, windIntensity: .2, temperatureC: 10, fogTarget: .8, floodTarget: .7 };
    const wet = advanceClimate(emptyClimateState(), rain, 45 * 60);
    expect(wet.wetness).toBeGreaterThan(.9);
    expect(wet.puddleCoverage).toBe(1);
    expect(wet.fogDensity).toBeGreaterThan(0);
    expect(wet.floodLevel).toBeGreaterThan(0);
    const cleared = advanceClimate(wet, { ...rain, precipitation: 'none', fogTarget: 0, floodTarget: 0 }, 3 * SECONDS_PER_HOUR);
    expect(cleared.wetness).toBeLessThan(wet.wetness);
    expect(cleared.puddleCoverage).toBeLessThan(wet.puddleCoverage);
    expect(cleared.fogDensity).toBeLessThan(wet.fogDensity);
    expect(cleared.floodLevel).toBeLessThan(wet.floodLevel);
  });
});
