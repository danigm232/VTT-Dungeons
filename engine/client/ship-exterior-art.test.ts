import { expect, it } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { wreckRuntimeScenes } from '../../campaigns/stormwreck-isle/public/wreck-runtime.js';
import { buildTerrain3D } from './terrain3d.js';

it('dresses C1–C3 while preserving playable surfaces, cabin materials and independent cutaways', () => {
  const engine = new NullEngine(), scene = new Scene(engine);
  try {
    const terrain = wreckRuntimeScenes.find(s => s.id === 'wreck-ship')!.terrain!;
    const original = JSON.stringify(terrain);
    const texture = RawTexture.CreateRGBATexture(new Uint8Array([128, 128, 128, 255]), 1, 1, scene);
    const view = buildTerrain3D(scene, terrain, { shipDeck: true, deckTexture: texture, exteriorDeckTexture: texture,
      sailTexture: texture, boardingDebrisTexture: texture });
    expect(JSON.stringify(terrain)).toBe(original);
    expect(view.camera.radius).toBeGreaterThan(Math.hypot(terrain.cols, terrain.rows) * terrain.tileMeters / 2);
    for (const surface of terrain.surfaces) for (const tile of surface.tiles) {
      const mesh = view.tiles.get(`${surface.id}:${tile.cell.col},${tile.cell.row}`)!;
      expect(mesh.isPickable).toBe(!surface.visualOnly);
      expect(mesh.metadata.address).toEqual({ surfaceId: surface.id, cell: tile.cell });
    }
    expect(view.tiles.get('main:26,15')!.material!.name).toBe('terrain-material:exterior-deck');
    expect(view.tiles.get('main:19,10')!.material!.name).toBe('terrain-material:wood');
    const upper = terrain.surfaces.find(s => s.id === 'c2')!.tiles[0]!;
    const deck = view.tiles.get(`c2:${upper.cell.col},${upper.cell.row}`)!;
    expect((deck.material as StandardMaterial).diffuseTexture).toBe(texture);
    const uv = deck.getVerticesData('uv')!, vertices = deck.getVerticesData('position')!;
    for (let i = 0; i < vertices.length / 3; i++) {
      expect(uv[i * 2]).toBeCloseTo((deck.position.x + vertices[i * 3]!) / 4.5);
      expect(uv[i * 2 + 1]).toBeCloseTo((deck.position.z + vertices[i * 3 + 2]!) / 4.5);
    }
    const dressing = view.deckDetails.filter(m => m.metadata?.kind === 'ship-exterior-art');
    for (const hull of view.deckDetails.filter(m => m.name.startsWith('ship-hull-sides'))) {
      const hullUv = hull.getVerticesData('uv')!;
      for (let face = 0; face < hullUv.length; face += 8)
        expect(Math.abs(hullUv[face]! - hullUv[face + 2]!)).toBeGreaterThan(.1);
      const p = hull.getVerticesData('position')!, n = hull.getVerticesData('normal')!;
      for (let face = 0; face < p.length; face += 12) {
        const dx = p[face + 3]! - p[face]!, dz = p[face + 5]! - p[face + 2]!;
        expect(n[face]! * dz - n[face + 2]! * dx).toBeGreaterThan(0);
      }
    }
    expect(new Set(dressing.map(m => m.metadata.deckSurfaceId))).toEqual(new Set(['main', 'c1-hull', 'c2', 'c3']));
    expect(dressing.every(m => !m.isPickable && !m.checkCollisions)).toBe(true);
    expect(dressing.length).toBeLessThan(24);
    const boarding = view.deckDetails.find(m => m.metadata?.kind === 'ship-exterior-debris');
    expect(boarding?.metadata.deckSurfaceId).toBe('main');
    expect(boarding?.isPickable).toBe(false);
    expect(boarding?.checkCollisions).toBe(false);
    const sails = view.deckDetails.filter(m => m.metadata?.kind === 'ship-exterior-sail');
    expect(sails.every(m => !m.isPickable && !m.checkCollisions && ['main', 'c2'].includes(m.metadata.deckSurfaceId))).toBe(true);
    expect(view.deckDetails.filter(m => m.metadata?.kind === 'cabin-ceiling').map(m => m.metadata.cabinId).sort())
      .toEqual(['c4', 'c5', 'c6', 'c7']);
    expect(view.deckDetails.find(m => m.metadata?.kind === 'cabin-ceiling' && m.metadata?.cabinId === 'c4')!.position.x)
      .toBeCloseTo((18 + 23 + 1) * terrain.tileMeters / 2);
    expect(view.deckDetails.find(m => m.metadata?.kind === 'cabin-ceiling' && m.metadata?.cabinId === 'c4')!.getBoundingInfo().boundingBox.extendSizeWorld.x * 2)
      .toBeGreaterThan(7 * terrain.tileMeters);
    expect(view.deckDetails.filter(m => m.metadata?.kind === 'cabin-ceiling').every(m => m.material?.name === 'terrain-material:exterior-deck'))
      .toBe(true);
    expect(view.deckDetails.filter(m => m.metadata?.kind === 'cabin-darkness')).toHaveLength(4);
    expect(view.deckDetails.filter(m => m.metadata?.kind === 'cabin-roof-edge')).toHaveLength(16);
    expect(view.occluders.filter(m => m.metadata?.decorativeBulkhead).every(m => !m.isPickable && !m.checkCollisions)).toBe(true);
    expect(view.deckDetails.some(m => m.metadata?.kind === 'harmless-crab')).toBe(true);
    expect(view.deckDetails.some(m => m.metadata?.kind === 'c7:shard:0')).toBe(true);
  } finally { scene.dispose(); engine.dispose(); }
});
