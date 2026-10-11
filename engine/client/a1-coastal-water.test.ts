import { describe, expect, it } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { createCampVisuals } from '../../campaigns/camp-rests/public/visuals.js';
import { campRestsPublicCampaign } from '../../campaigns/camp-rests/public/pack.js';

describe('agua de la bahía A1', () => {
  it('conserva olas geométricas sin el relieve que causa trama y ralentización', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    try {
      const definition = campRestsPublicCampaign.scenes.find(item => item.id === 'camp-a1-rooms')!;
      const visuals = createCampVisuals(scene, definition)!;
      const sea = scene.getMeshByName('a1:bay-background')!;
      const material = sea.material as StandardMaterial;
      expect(sea.isPickable).toBe(false);
      expect(sea.checkCollisions).toBe(false);
      expect(sea.getTotalVertices()).toBeGreaterThan(1000);
      expect(material.bumpTexture).toBeNull();
      const initialHeights = sea.getVerticesData('position')!.filter((_, index) => index % 3 === 1);
      visuals.update(1, 'arrival');
      const movedHeights = sea.getVerticesData('position')!.filter((_, index) => index % 3 === 1);
      expect(movedHeights).not.toEqual(initialHeights);
    } finally {
      scene.dispose();
      engine.dispose();
    }
  });
});
