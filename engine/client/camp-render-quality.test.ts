import { describe, expect, it } from 'vitest';
import { campTerrainHardwareScalingLevel } from './camp-render-quality.js';

describe('resolución del decorado de campamentos', () => {
  it('no degrada los personajes y limita el coste de alta densidad', () => {
    expect(campTerrainHardwareScalingLevel(true, true)).toBe(1);
    expect(campTerrainHardwareScalingLevel(true, false)).toBe(1);
    expect(campTerrainHardwareScalingLevel(false, true)).toBe(1);
    expect(campTerrainHardwareScalingLevel(true, true, 3)).toBe(.8);
    expect(campTerrainHardwareScalingLevel(false, false, 2)).toBeCloseTo(2 / 3);
  });
});
