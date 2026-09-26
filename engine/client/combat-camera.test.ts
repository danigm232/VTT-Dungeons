import { describe, expect, it } from 'vitest';
import { combatCameraFrame } from './combat-camera';

describe('combatCameraFrame', () => {
  it('encuadra toda la cuadrícula dentro del espacio que dejan los paneles de combate', () => {
    const grid = { width: 1_440, height: 900 }, viewport = { width: 1_600, height: 1_000 };
    const frame = combatCameraFrame(grid, viewport);
    const mapWidth = grid.width * frame.scale, mapHeight = grid.height * .92 * frame.scale;
    expect(frame.centerX - mapWidth / 2).toBeGreaterThanOrEqual(frame.safe.left);
    expect(frame.centerX + mapWidth / 2).toBeLessThanOrEqual(frame.safe.left + frame.safe.width);
    expect(frame.centerY - mapHeight / 2).toBeGreaterThanOrEqual(frame.safe.top);
    expect(frame.centerY + mapHeight / 2).toBeLessThanOrEqual(frame.safe.top + frame.safe.height);
  });

  it('reserva las barras superior e inferior en móvil sin perder ningún extremo del mapa', () => {
    const grid = { width: 960, height: 720 }, viewport = { width: 390, height: 844 };
    const frame = combatCameraFrame(grid, viewport);
    expect(frame.safe.top).toBe(116);
    expect(frame.safe.height).toBe(656);
    expect(grid.width * frame.scale).toBeLessThanOrEqual(frame.safe.width);
    expect(grid.height * .92 * frame.scale).toBeLessThanOrEqual(frame.safe.height);
  });
});
