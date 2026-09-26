import { describe, expect, it } from 'vitest';
import { campTerrainHardwareScalingLevel } from './camp-render-quality.js';

describe('resolución del decorado de campamentos', () => {
  it('reduce píxeles en pantallas compactas y conserva escritorio/proyector', () => {
    expect(campTerrainHardwareScalingLevel(true, true)).toBe(1.35);
    expect(campTerrainHardwareScalingLevel(true, false)).toBe(1);
    expect(campTerrainHardwareScalingLevel(false, true)).toBe(1);
  });
});
