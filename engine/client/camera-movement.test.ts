import { describe, expect, it } from 'vitest';
import { screenVectorToWorld, sceneOrientationForView } from './camera-movement.js';

describe('movimiento relativo a la cámara', () => {
  it('usa el mismo frente A1 para cámara y WASD sin cambiar las otras escenas', () => {
    for(let step=0;step<8;step++) {
      expect(sceneOrientationForView('camp-a1-rooms',step)).toBe((step+3)%8);
      expect(sceneOrientationForView('camp-forest-pleamar',step)).toBe(step);
      expect(sceneOrientationForView('dragon-rest',step)).toBe(step);
    }
    const up=screenVectorToWorld(0,1,sceneOrientationForView('camp-a1-rooms',0),Math.PI/4);
    expect(up.x).toBeCloseTo(0);expect(up.z).toBeCloseTo(-1);
  });
  it('mantiene las cuatro direcciones de pantalla en los ocho giros', () => {
    for (let step = 0; step < 8; step++) {
      const up = screenVectorToWorld(0, 1, step, Math.PI / 3);
      const right = screenVectorToWorld(1, 0, step, Math.PI / 3);
      expect(Math.max(Math.abs(up.x), Math.abs(up.z))).toBeLessThanOrEqual(1);
      expect(Math.max(Math.abs(right.x), Math.abs(right.z))).toBeLessThanOrEqual(1);
      expect(up.x * right.x + up.z * right.z).toBeCloseTo(0, 8);
      const down = screenVectorToWorld(0, -1, step, Math.PI / 3), left = screenVectorToWorld(-1, 0, step, Math.PI / 3);
      expect(down.x).toBeCloseTo(-up.x, 8); expect(down.z).toBeCloseTo(-up.z, 8);
      expect(left.x).toBeCloseTo(-right.x, 8); expect(left.z).toBeCloseTo(-right.z, 8);
    }
  });

  it('no cambia la dirección mientras la cámara anima entre ángulos', () => {
    const northWestView = screenVectorToWorld(0, 1, 0, Math.PI / 3);
    expect(northWestView.x).toBeCloseTo(-1, 8); expect(northWestView.z).toBeCloseTo(1, 8);
    expect(screenVectorToWorld(0, 1, 0, Math.PI / 3)).toEqual(northWestView);
    const nextView = screenVectorToWorld(0, 1, 1, Math.PI / 3);
    expect(nextView.x).toBeCloseTo(-1, 8); expect(nextView.z).toBeCloseTo(0, 8);
  });
});
