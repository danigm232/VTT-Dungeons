import { describe, expect, it } from 'vitest';
import { alphaGrounding, actorDetailZoom } from './actor-grounding';
import { campActivityMotion } from './camp-activity-motion';
describe('grounding and readable actor framing', () => {
  it('grounds opaque feet, ignores stray alpha and excludes transparent margins from height', () => {
    const rgba = new Uint8Array(20 * 20 * 4);
    for (let y = 3; y < 17; y++) for (let x = 6; x < 12; x++) rgba[(y * 20 + x) * 4 + 3] = 255;
    rgba[(19 * 20 + 1) * 4 + 3] = 255;
    expect(alphaGrounding(rgba, 20, 20)).toEqual({ anchorY: .85, heightFraction: .7 });
    expect(alphaGrounding(new Uint8Array(16), 2, 2)).toEqual({ anchorY: 1, heightFraction: 1 });
  });
  it('zooms further for a halfling than an elf without changing their physical scale', () => {
    const elf = actorDetailZoom(1.8, 12, 500, 1.8, Math.PI / 4);
    const halfling = actorDetailZoom(1.8, 12, 500, 1.05, Math.PI / 4);
    expect(halfling).toBeGreaterThan(elf);
    expect(actorDetailZoom(1, 80, 300, .01, Math.PI / 4)).toBe(24);
  });
  it('uses distinct bounded gestures and returns to the ground at both ends', () => {
    const motions = ['warm', 'cook', 'tend-fire', 'prepare-bed', 'rest', 'study', 'pray', 'tools', 'guard', 'inspect', 'shelter'];
    for (const action of motions) {
      for (const time of [0, 5000]) {
        const gesture = campActivityMotion(`camp-${action}`, time, 5000, 92);
        expect(Math.abs(gesture.lean) + Math.abs(gesture.x) + Math.abs(gesture.y)).toBeLessThan(1e-8);
      }
      const gesture = campActivityMotion(`camp-${action}`, 1800, 5000, 92);
      expect(Math.abs(gesture.lean)).toBeLessThan(.15);
      expect(Math.abs(gesture.lean) + Math.abs(gesture.x) + Math.abs(gesture.y)).toBeGreaterThan(0);
    }
  });
});
