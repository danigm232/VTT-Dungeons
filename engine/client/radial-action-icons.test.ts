import { expect, it } from 'vitest';
import { radialActionGlyph } from './radial-action-icons';

it('distinguishes punches from blades without changing the other action categories', () => {
  expect(radialActionGlyph('combat-action', 'Golpe sin armas')).toBe('✊');
  expect(radialActionGlyph('aoife-unarmed', 'Puñetazo')).toBe('✊');
  expect(radialActionGlyph('combat-action', 'Daga')).toBe('🗡');
  expect(radialActionGlyph('combat-action', 'Lanzar daga')).toBe('🗡');
  expect(radialActionGlyph('combat-action', 'Arco corto de entrenamiento')).toBe('🏹');
  expect(radialActionGlyph('combat-action', 'Proyectil de fuego')).toBe('🔥');
  expect(radialActionGlyph('combat-action', 'Misil mágico')).toBe('✦');
  expect(radialActionGlyph('basic', 'Correr')).toBe('➤');
  expect(radialActionGlyph('basic', 'Esquivar')).toBe('↝');
});
