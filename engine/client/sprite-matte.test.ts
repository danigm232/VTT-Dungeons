import { describe, expect, it } from 'vitest';
import { clearBlackSpriteMatte } from './sprite-matte';

describe('opaque black backgrounds in supplied character PNGs', () => {
  it('removes the border canvas while preserving dark clothing and enclosed black details', () => {
    const pixels = new Uint8ClampedArray(7 * 7 * 4);
    for (let i = 0; i < 49; i++) pixels[i * 4 + 3] = 255;
    for (let y = 2; y <= 4; y++) for (let x = 2; x <= 4; x++) pixels.set([12, 15, 13, 255], (y * 7 + x) * 4);
    pixels.set([0, 0, 0, 255], (3 * 7 + 3) * 4);
    expect(clearBlackSpriteMatte(pixels, 7, 7)).toBe(true);
    expect(pixels[3]).toBe(0); expect(pixels[(2 * 7 + 2) * 4 + 3]).toBe(255);
    expect(pixels[(3 * 7 + 3) * 4 + 3]).toBe(255);
  });
  it('does not change a transparent PNG or an illustrated non-black background', () => {
    for (const rgba of [[0, 0, 0, 0], [35, 40, 45, 255]]) {
      const pixels = new Uint8ClampedArray(4 * 4 * 4);
      for (let i = 0; i < 16; i++) pixels.set(rgba, i * 4);
      const before = new Uint8ClampedArray(pixels);
      expect(clearBlackSpriteMatte(pixels, 4, 4)).toBe(false); expect(pixels).toEqual(before);
    }
  });
});
