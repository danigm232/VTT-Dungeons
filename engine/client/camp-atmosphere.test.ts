import { describe, expect, it } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { createCampAtmosphere } from '../../campaigns/camp-rests/public/camp-atmosphere.js';

describe('mar de los campamentos', () => {
  it('suaviza solo el reflejo de la playa sin retirar sus olas y espuma', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    try {
      const atmosphere = createCampAtmosphere(scene, new TransformNode('root', scene), 'wreck-beach', 36, 36);
      const sea = scene.getMeshByName('camp:living-ocean')!;
      const material = sea.material as StandardMaterial;
      expect((material.bumpTexture as Texture).uScale).toBe(12);
      expect(material.specularColor.toHexString()).toBe('#365E6C');
      expect(sea.isPickable).toBe(false);
      expect(scene.getMeshByName('camp:breaking-surf')).toBeTruthy();
      const positions = [...sea.getVerticesData('position')!];
      atmosphere.update(1, 0);
      expect([...sea.getVerticesData('position')!]).not.toEqual(positions);
    } finally {
      scene.dispose();
      engine.dispose();
    }
  });

  it('mantiene el mismo relieve moderado alrededor de los acantilados', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    try {
      createCampAtmosphere(scene, new TransformNode('root', scene), 'cliff-observatory', 36, 36);
      const sea = scene.getMeshByName('camp:living-ocean')!;
      const material = sea.material as StandardMaterial;
      expect((material.bumpTexture as Texture).uScale).toBe(12);
      expect(material.specularColor.toHexString()).toBe('#365E6C');
      expect(scene.getMeshByName('camp:breaking-surf')).toBeTruthy();
    } finally {
      scene.dispose();
      engine.dispose();
    }
  });

  it('deja las charcas del refugio al margen del ajuste del mar exterior', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    try {
      createCampAtmosphere(scene, new TransformNode('root', scene), 'coastal-refuge', 36, 36);
      const sea = scene.getMeshByName('camp:living-ocean')!;
      const material = sea.material as StandardMaterial;
      expect((material.bumpTexture as Texture).uScale).toBe(12);
      expect(material.specularColor.toHexString()).toBe('#365E6C');
      expect(scene.getMeshByName('camp:breaking-surf')).toBeTruthy();
    } finally {
      scene.dispose();
      engine.dispose();
    }
  });
});
