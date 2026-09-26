import type { TerrainDefinition } from '../shared/terrain.js';

export type ShipWindStreak = { from: { col: number; row: number }; to: { col: number; row: number } };

const interiorSurfaces = new Set(['lower-deck', 'lower-water', 'hold-air', 'hold-water']);

export function shipAmbientLightIntensity(id: string, baseIntensity: number, timeSeconds: number) {
  if (id === 'c8-water-glimmer') return baseIntensity * (0.92 + Math.sin(timeSeconds * 1.15 + 0.4) * 0.08);
  if (id === 'c9-depth-glimmer') return baseIntensity * (0.93 + Math.sin(timeSeconds * 0.72 + 1.7) * 0.07);
  return baseIntensity;
}

export function shipWeatherLighting(storm: boolean, stormIntensity: number, lightning: boolean, timeSeconds: number) {
  const strength = storm ? Math.max(0, Math.min(1, stormIntensity)) : 0;
  const pulse = lightning && strength > 0 ? Math.pow(Math.max(0, Math.sin(timeSeconds * .9 - 1.25)), 8) * strength : 0;
  return {
    ambientScale: 1 - strength * .34 + pulse * .38,
    keyScale: 1 - strength * .55 + pulse * 1.45,
    fogDensity: .0048 + strength * .0045
  };
}

/** Return subtle, moving wind/sea-spray strokes anchored to decorative water.
 * The strokes are presentation-only: they never create tiles or affect picking. */
export function shipWindStreaks(terrain: TerrainDefinition, timeSeconds: number, focusSurfaceId?: string, count = 18): ShipWindStreak[] {
  if (focusSurfaceId && interiorSurfaces.has(focusSurfaceId)) return [];
  const water = terrain.surfaces.find(surface => surface.id === 'sea');
  if (!water || water.visualOnly || !water.tiles.length || count <= 0) return [];
  const amount = Math.min(Math.trunc(count), water.tiles.length);
  return Array.from({ length: amount }, (_, index) => {
    const tile = water.tiles[Math.floor((index + 0.5) * water.tiles.length / amount)]!;
    const phase = timeSeconds * 0.7 + index * 2.399;
    const drift = Math.sin(phase) * 0.12;
    const crosswind = Math.cos(phase * 0.83) * 0.055;
    return {
      from: { col: tile.cell.col + 0.2 + drift, row: tile.cell.row + 0.34 + crosswind },
      to: { col: tile.cell.col + 0.78 + drift, row: tile.cell.row + 0.55 + crosswind }
    };
  });
}
