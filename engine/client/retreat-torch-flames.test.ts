import { afterEach, describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { campRestsPublicCampaign } from '../../campaigns/camp-rests/public/pack.js';
import { createA1Visuals } from '../../campaigns/camp-rests/public/a1-visuals.js';
import { installRetreatWallTorches } from '../../campaigns/stormwreck-isle/public/retreat-wall-torches.js';
import { buildTerrain3D } from './terrain3d.js';

const engines: NullEngine[] = [];
afterEach(() => { vi.unstubAllGlobals(); for (const engine of engines.splice(0)) engine.dispose(); });
function setup() { const engine = new NullEngine(); engines.push(engine); return new Scene(engine); }

describe('Retiro: llamas y luces de antorchas', () => {
  function corridor(scene: Scene) {
    const wall = MeshBuilder.CreateBox('Dining_South_Upper', { width: 55, height: 5, depth: .5 }, scene);
    wall.position.set(109, 19.7, 63);
    for (let index = 0; index < 5; index++) MeshBuilder.CreateBox(`R3_Upper_Torch_${index}_R3_Lamp`, {}, scene);
    scene.meshes.forEach(mesh => mesh.computeWorldMatrix(true));
    return { wall, torches: installRetreatWallTorches(scene) };
  }

  it('mantiene las cinco mechas fijas y sincroniza cada llama con su luz', () => {
    const scene = setup(), { wall, torches } = corridor(scene);
    const flames = [0, 1, 2, 3, 4].map(i => scene.getMeshByName(`retreat:torch:${i}:flame`)!);
    expect(flames.every(Boolean)).toBe(true);
    expect(new Set(flames.map(flame => flame.material)).size).toBe(1);
    expect((flames[0]!.material as StandardMaterial).emissiveTexture).toBeTruthy();
    const anchors = flames.map(flame => flame.position.clone());
    torches.update(1.37, 1);
    for (let i = 0; i < flames.length; i++) {
      const flame = flames[i]!, light = scene.getLightByName(`retreat:r3-wall-lamp-${i}`)!;
      const pulse = flame.scaling.y / .36 - 1;
      expect(flame.position.equalsWithEpsilon(anchors[i]!)).toBe(true);
      expect(flame.isPickable || flame.checkCollisions).toBe(false);
      expect(light.intensity).toBeCloseTo(.92 + pulse * 1.1, 5);
    }
    torches.update(2, 0);
    expect(flames.every(flame => !flame.isVisible)).toBe(true);
    torches.update(3, 1); wall.isVisible = false; torches.update(4, 1);
    expect(flames.every(flame => !flame.isVisible)).toBe(true);
    expect([0, 1, 2, 3, 4].every(i => !scene.getLightByName(`retreat:r3-wall-lamp-${i}`)!.isEnabled())).toBe(true);
  });

  it('deja la llama y su luz quietas con movimiento reducido', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const scene = setup(), { torches } = corridor(scene);
    const flame = scene.getMeshByName('retreat:torch:0:flame')!, light = scene.getLightByName('retreat:r3-wall-lamp-0')!;
    torches.update(.31, 1); const scale = flame.scaling.clone(), intensity = light.intensity;
    torches.update(2.61, 1);
    expect(flame.scaling.equalsWithEpsilon(scale)).toBe(true);
    expect(flame.rotation.z).toBe(0);
    expect(light.intensity).toBe(intensity);
  });

  it('conserva las seis antorchas de celdas, sus estados y la luz sincronizada', () => {
    const scene = setup(), definition = campRestsPublicCampaign.scenes.find(s => s.id === 'camp-a1-rooms')!;
    buildTerrain3D(scene, definition.terrain!, { batchTiles: true });
    const visuals = createA1Visuals(scene, definition, { retreatTorchMounts: true });
    const flames = [1, 2, 3, 4, 5, 6].map(i => scene.getMeshByName(`a1:room-${i}:torch-flame`)!);
    expect(flames.every(Boolean)).toBe(true);
    expect(new Set(flames.map(flame => flame.material)).size).toBe(1);
    const flame = flames[2]!, light = scene.getLightByName('a1:room-3:torch-light')!;
    const base = flame.position.clone();
    visuals.update(1, 'night', [], { col: 18, row: 9 });
    const firstScale = flame.scaling.y, firstIntensity = light.intensity;
    visuals.update(1.31, 'night', [], { col: 18, row: 9 });
    expect(flame.visibility).toBe(1);
    expect(flame.position.equalsWithEpsilon(base)).toBe(true);
    expect(light.intensity).toBeGreaterThan(0);
    expect(Math.sign(flame.scaling.y - firstScale)).toBe(Math.sign(light.intensity - firstIntensity));
    expect(flames.filter(other => other !== flame).every(other => other.visibility === 0)).toBe(true);
    visuals.update(2, 'arrival', [], { col: 18, row: 9 });
    expect(flame.visibility).toBe(0);
    expect(light.intensity).toBe(0);
  });
});
