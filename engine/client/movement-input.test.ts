import { describe, expect, it } from 'vitest';
import { keyboardMovementAxes } from './movement-input.js';

describe('acordes de movimiento', () => {
  it('combina dos teclas simultáneas en una dirección diagonal', () => {
    expect(keyboardMovementAxes(new Set(['w', 'a']))).toEqual({ x: -1, up: 1 });
    expect(keyboardMovementAxes(new Set(['arrowup', 'arrowright']))).toEqual({ x: 1, up: 1 });
  });

  it('cancela direcciones opuestas y conserva el eje que sigue pulsado', () => {
    expect(keyboardMovementAxes(new Set(['w', 's', 'a']))).toEqual({ x: -1, up: 0 });
    expect(keyboardMovementAxes(new Set(['arrowleft', 'arrowright', 'arrowdown']))).toEqual({ x: 0, up: -1 });
  });
});
