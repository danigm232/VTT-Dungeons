import { describe, expect, it } from 'vitest';
import { wreckRuntimeScenes } from '../../campaigns/stormwreck-isle/public/wreck-runtime.js';
import { surfaceHeight, terrainTile } from '../shared/terrain.js';
import { shipAmbientLightIntensity, shipWeatherLighting, shipWindStreaks } from './ship-ambience.js';

describe('Rosa de los Vientos · brisa visual', () => {
  const terrain = wreckRuntimeScenes[0]!.terrain!;

  it('anima trazos discretos anclados en casillas de mar sin invadir interiores', () => {
    const initial = shipWindStreaks(terrain, 1, 'main');
    const later = shipWindStreaks(terrain, 2, 'crow');
    const sea = terrain.surfaces.find(surface => surface.id === 'sea')!;
    expect(initial).toHaveLength(18);
    expect(later).toHaveLength(18);
    expect(later).not.toEqual(initial);
    for (const streak of initial) {
      const cell = { col: Math.floor(streak.from.col), row: Math.floor(streak.from.row) };
      expect(sea.tiles.some(tile => tile.cell.col === cell.col && tile.cell.row === cell.row)).toBe(true);
      expect(Math.floor(streak.to.col)).toBe(cell.col);
      expect(Math.floor(streak.to.row)).toBe(cell.row);
    }
    expect(shipWindStreaks(terrain, 1, 'lower-deck')).toEqual([]);
    expect(shipWindStreaks(terrain, 1, 'hold-air')).toEqual([]);
  });

  it('mantiene las luces frías localizadas en C8/C9, separadas de las antorchas apagadas', () => {
    const c8 = terrain.lights.find(light => light.id === 'c8-water-glimmer')!;
    const c9 = terrain.lights.find(light => light.id === 'c9-depth-glimmer')!;
    expect(terrainTile(terrain, { surfaceId: 'lower-deck', cell: c8.cell })).toBeTruthy();
    expect(terrainTile(terrain, { surfaceId: 'hold-air', cell: c9.cell })).toBeTruthy();
    expect(c8.radiusMeters).toBeLessThan(terrain.tileMeters * 2);
    expect(c9.radiusMeters).toBeLessThan(terrain.tileMeters * 2);
    expect(Math.abs(c8.height - surfaceHeight(terrain, { surfaceId: 'main', cell: c8.cell }))).toBeGreaterThan(c8.radiusMeters);
    const lowerDeck = terrain.surfaces.find(surface => surface.id === 'lower-deck')!;
    const nearestC8Distance = Math.min(...lowerDeck.tiles.map(tile => {
      const cellDistance = Math.hypot(tile.cell.col - c9.cell.col, tile.cell.row - c9.cell.row) * terrain.tileMeters;
      return Math.hypot(cellDistance, c9.height - surfaceHeight(terrain, { surfaceId: 'lower-deck', cell: tile.cell }));
    }));
    expect(nearestC8Distance).toBeGreaterThan(c9.radiusMeters);
    expect(shipAmbientLightIntensity(c8.id, c8.intensity, 0)).not.toBe(shipAmbientLightIntensity(c8.id, c8.intensity, 2));
    expect(shipAmbientLightIntensity(c9.id, c9.intensity, 0)).not.toBe(shipAmbientLightIntensity(c9.id, c9.intensity, 2));
    expect(shipAmbientLightIntensity('main-daylight', 1.4, 2)).toBe(1.4);
    expect(wreckRuntimeScenes[0]!.pickups?.filter(pickup => pickup.kind === 'unlit-torch')).toHaveLength(4);
  });
  it('oscurece la escena durante una tormenta y devuelve la luz normal al cesar', () => {
    const clear = shipWeatherLighting(false, 1, false, 0);
    const storm = shipWeatherLighting(true, 1, false, 0);
    expect(clear).toEqual({ ambientScale: 1, keyScale: 1, fogDensity: .0048 });
    expect(storm.ambientScale).toBeLessThan(clear.ambientScale);
    expect(storm.keyScale).toBeLessThan(clear.keyScale);
    expect(storm.fogDensity).toBeGreaterThan(clear.fogDensity);
    expect(shipWeatherLighting(true, 1, true, (Math.PI / 2 + 1.25) / .9).keyScale).toBeGreaterThan(storm.keyScale);
  });
});
