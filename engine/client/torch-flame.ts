import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import type { Scene } from '@babylonjs/core/scene.js';

const materialName = 'vtt:torch-flame-painted-v1';

/** One small generated colour ramp per scene; no external artwork or new lights. */
function flameMaterial(scene: Scene): StandardMaterial {
  const existing = scene.getMaterialByName(materialName);
  if (existing instanceof StandardMaterial) return existing;

  const height = 64, width = 4, bytes = new Uint8Array(width * height * 4);
  const stops = [
    [0, 255, 156, 42], [.18, 255, 228, 124], [.42, 255, 185, 60],
    [.72, 246, 106, 30], [1, 175, 47, 15],
  ] as const;
  for (let y = 0; y < height; y++) {
    const at = y / (height - 1);
    const hi = Math.max(1, stops.findIndex(stop => stop[0] >= at));
    const a = stops[hi - 1]!, b = stops[hi]!;
    const t = (at - a[0]) / (b[0] - a[0]);
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      for (let channel = 0; channel < 3; channel++) bytes[index + channel] = Math.round(a[channel + 1]! * (1 - t) + b[channel + 1]! * t);
      bytes[index + 3] = 255;
    }
  }
  const texture = RawTexture.CreateRGBATexture(bytes, width, height, scene, false, false, Texture.BILINEAR_SAMPLINGMODE);
  texture.name = 'vtt:torch-flame-generated-gradient-v1';
  texture.wrapU = texture.wrapV = Texture.CLAMP_ADDRESSMODE;
  const material = new StandardMaterial(materialName, scene);
  material.diffuseColor = Color3.Black();
  material.specularColor = Color3.Black();
  material.emissiveColor = Color3.Black();
  material.emissiveTexture = texture;
  material.disableLighting = true;
  return material;
}

/** A low-poly flame with its origin at the wick and height/diameter normalised. */
export function createTorchFlame(scene: Scene, name: string) {
  const shape = [
    [0.08, 0], [.29, .07], [.44, .17], [.50, .32],
    [.44, .50], [.32, .68], [.19, .84], [0, 1],
  ].map(([radius, y]) => new Vector3(radius!, y!, 0));
  const flame = MeshBuilder.CreateLathe(name, { shape, tessellation: 10, updatable: false }, scene);
  const positions = flame.getVerticesData('position')!;
  const uv = flame.getVerticesData('uv')!;
  for (let i = 0; i < positions.length; i += 3) {
    const y = positions[i + 1]!;
    // The upper tongue bends slightly while the base remains on the wick.
    positions[i] = positions[i]! + .10 * y * y;
    uv[(i / 3) * 2 + 1] = y;
  }
  flame.setVerticesData('position', positions);
  flame.setVerticesData('uv', uv);
  flame.material = flameMaterial(scene);
  flame.isPickable = false;
  flame.checkCollisions = false;
  return flame;
}

/** Shared phase lets a flame and its existing lamp flicker together. */
export function torchMotion(time: number, seed: number, reduced: boolean) {
  const pulse = reduced ? 0 : Math.sin(time * 7.4 + seed * 1.9) * .075 + Math.sin(time * 13.8 + seed * 3.1) * .035;
  return {
    pulse,
    width: 1 - pulse * .45,
    height: 1 + pulse,
    sway: reduced ? 0 : Math.sin(time * 5.2 + seed * 1.3) * .04,
  };
}
