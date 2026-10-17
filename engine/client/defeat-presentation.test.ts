import { describe, expect, it } from 'vitest';
import { defeatGroundStyle } from './defeat-presentation';
describe('persistent ground-state presentation', () => {
  it('keeps blood and nonlethal overlays distinct and clears them on recovery', () => {
    expect(defeatGroundStyle({ defeated: true, defeatStyle: 'blood' })).toBe('blood');
    expect(defeatGroundStyle({ defeated: true, defeatStyle: 'unconscious' })).toBe('unconscious');
    expect(defeatGroundStyle({ conditions: ['inconsciente'] })).toBe('unconscious');
    expect(defeatGroundStyle({ defeated: false, conditions: [] })).toBeUndefined();
  });
});
