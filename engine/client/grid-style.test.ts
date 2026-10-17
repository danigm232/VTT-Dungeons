import { describe, expect, it } from 'vitest';
import { DEFAULT_GRID_STYLE, gridContrastColor, gridMaterialLuminance, gridRgbLuminance, normalizeGridStyle } from './grid-style.js';

describe('preferencias de cuadrícula', () => {
  it('usa una cuadrícula tenue con contraste adaptativo como valor inicial', () => {
    expect(DEFAULT_GRID_STYLE).toEqual({ mode: 'contrast', color: '#c8cec3', opacity: .22, thickness: 1 });
  });

  it('normaliza y limita los ajustes persistidos sin descartar otros campos', () => {
    expect(normalizeGridStyle({ mode: 'fixed', color: '#12aBcD', opacity: 1, thickness: 3 })).toEqual({
      mode: 'fixed', color: '#12aBcD', opacity: .7, thickness: 3
    });
    expect(normalizeGridStyle({ mode: 'invalid', color: 'red', opacity: -1, thickness: 9 })).toEqual({
      ...DEFAULT_GRID_STYLE, opacity: .06
    });
  });

  it('cambia a una línea oscura sobre arena y clara sobre basalto', () => {
    expect(gridContrastColor(gridMaterialLuminance('sand'))).toBe('#202a2b');
    expect(gridContrastColor(gridMaterialLuminance('basalt'))).toBe('#f0e6cd');
    expect(gridContrastColor(null)).toBe(DEFAULT_GRID_STYLE.color);
    expect(gridRgbLuminance(255, 255, 255)).toBeCloseTo(1);
    expect(gridRgbLuminance(0, 0, 0)).toBeCloseTo(0);
  });
});
