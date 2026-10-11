import { expect, it } from 'vitest';
import { carriedLightRadiusMeters } from './carried-light.js';

it('keeps ship torches dark unless a carried source is explicitly lit', () => {
  expect(carriedLightRadiusMeters(['Antorcha', 'Antorchas ×10'])).toBe(0);
  expect(carriedLightRadiusMeters(['Antorcha encendida'])).toBe(6);
  expect(carriedLightRadiusMeters(['Farol encendido'])).toBe(9);
  expect(carriedLightRadiusMeters(['Luz mágica'])).toBe(6);
  expect(carriedLightRadiusMeters(['Antorchas encendidas ×2'])).toBe(6);
  expect(carriedLightRadiusMeters(['Antorcha encendida ×0'])).toBe(0);
  expect(carriedLightRadiusMeters(['Faroles encendidos ×2'])).toBe(9);
});
