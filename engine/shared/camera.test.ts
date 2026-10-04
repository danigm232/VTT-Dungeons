import { describe, expect, it } from 'vitest';
import { supportsCameraOrientation } from './camera.js';

describe('compatibilidad de controles de orientación de cámara', () => {
  it('habilita los dos renderizadores tácticos Babylon y exige terreno en HD2D', () => {
    expect(supportsCameraOrientation({ renderer: 'babylon-d8' })).toBe(true);
    expect(supportsCameraOrientation({ renderer: 'babylon-hd2d', terrain: {} })).toBe(true);
    expect(supportsCameraOrientation({ renderer: 'babylon-hd2d' })).toBe(false);
    expect(supportsCameraOrientation({ renderer: 'pixi' })).toBe(false);
    expect(supportsCameraOrientation(undefined)).toBe(false);
  });
});
