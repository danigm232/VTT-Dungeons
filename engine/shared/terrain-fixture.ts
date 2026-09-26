import { terrainSchema } from './terrain.js';

// Synthetic traversal only: not inserted into the Stormwreck pack or the Alpha 0.3 save format.
export const bridgeFixture = terrainSchema.parse({
  tileMeters: 1.5, cols: 6, rows: 3, baseSurfaceId: 'ground',
  surfaces: [
    { id: 'ground', tiles: Array.from({ length: 18 }, (_, index) => ({ cell: { col: index % 6, row: Math.floor(index / 6) },
      kind: 'floor', corners: [0, 0, 0, 0], materialId: 'stone' })) },
    { id: 'bridge', tiles: [
      { cell: { col: 1, row: 1 }, kind: 'ramp', corners: [0, 1.25, 1.25, 0], materialId: 'wood' },
      { cell: { col: 2, row: 1 }, kind: 'ramp', corners: [1.25, 2.5, 2.5, 1.25], materialId: 'wood' },
      { cell: { col: 3, row: 1 }, kind: 'bridge', corners: [2.5, 2.5, 2.5, 2.5], materialId: 'wood' },
      { cell: { col: 4, row: 1 }, kind: 'bridge', corners: [2.5, 2.5, 2.5, 2.5], materialId: 'wood' }
    ] }
  ],
  transitions: [{ from: { surfaceId: 'ground', cell: { col: 0, row: 1 } }, to: { surfaceId: 'bridge', cell: { col: 1, row: 1 } }, mode: 'ramp' }],
  occluders: [{ id: 'bridge-pillar', cell: { col: 3, row: 2 }, bottom: 0, top: 3, kind: 'pillar', materialId: 'stone' },
    { id: 'bridge-arch', cell: { col: 3, row: 1 }, bottom: 2.5, top: 3.5, kind: 'arch', materialId: 'wood' }],
  lights: [{ id: 'lantern', cell: { col: 3, row: 1 }, height: 3.3, color: '#ffce83', intensity: 2, radiusMeters: 5 }],
  ambience: [{ id: 'light-rain', kind: 'rain', density: 0.25 }]
});
