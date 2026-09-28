import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { illustratedMaterial } from './diorama-kit.js';

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

/** The bay is modeled as a small, animated body of water below A1, not as a static image. */
export function createCoastalBackdrop(scene: Scene, root: TransformNode, url: string) {
  const material = illustratedMaterial(scene, 'a1:sheltered-bay-v2', '#ffffff', url);
  material.specularColor = Color3.FromHexString('#24434e');
  material.specularPower = 72;
  material.disableLighting = false;
  material.maxSimultaneousLights = 2;

  // The 49 x 49 Babylon ground is inexpensive, yet lets long swells lift and
  // lower the actual silhouette where the water meets the cliff.
  const sea = MeshBuilder.CreateGround('a1:bay-background', { width: 640, height: 640, subdivisions: 84, updatable: true }, scene);
  sea.position = new Vector3(28.5, -9.15, 22);
  sea.parent = root;
  sea.material = material;
  sea.isPickable = false;
  sea.checkCollisions = false;
  sea.receiveShadows = false;
  sea.metadata = { content: 'VTT_AMBIENCE', decorativeOnly: true, heightBelowTerraceMeters: 9.15, effect: 'babylon-vertex-waves' };
  const texture = material.diffuseTexture;
  if (texture instanceof Texture) { texture.uScale = 26; texture.vScale = 26; texture.anisotropicFilteringLevel = 8; }

  const basePositions = sea.getVerticesData('position')!.slice();
  const wavePositions = new Float32Array(basePositions.length);
  const waterColors = new Float32Array(basePositions.length / 3 * 4);
  const indices = sea.getIndices()!;
  sea.setVerticesData('color', waterColors, true, 4);
  const waveHeight = (x: number, z: number, time: number) =>
    Math.sin(x * .042 + z * .035 - time * .72) * .46 +
    Math.sin(x * .093 - z * .073 + time * 1.08) * .23 +
    Math.sin(x * .15 + z * .044 - time * .91) * .1;

  const foamMaterial = illustratedMaterial(scene, 'a1:shore-wash-v2', '#d8f3eb');
  foamMaterial.disableLighting = true;
  foamMaterial.backFaceCulling = false;
  foamMaterial.alpha = .62;
  foamMaterial.emissiveColor = Color3.FromHexString('#75bfc2').scale(.12);

  // One low-cost deforming ribbon makes broken surf travel up and down the
  // rock edge. Vertex alpha keeps it a wash of spray, not a white outline.
  const columns = 96, rows = 9, foamPositions: number[] = [], foamUvs: number[] = [], foamIndices: number[] = [];
  const foamColors = new Float32Array((columns + 1) * rows * 4);
  const shore = (x: number) => 30.65 + Math.sin(x * .31) * .72 + Math.sin(x * 2.1) * .13;
  for (let row = 0; row < rows; row++) {
    const crossShore = row / (rows - 1) - .5;
    for (let column = 0; column <= columns; column++) {
      const x = -16 + column * 1.15;
      const z = shore(x) + crossShore * 2.7;
      foamPositions.push(x, -9.05, z);
      foamUvs.push(column / columns * 8, row / (rows - 1));
    }
  }
  for (let row = 0; row < rows - 1; row++) for (let column = 0; column < columns; column++) {
    const a = row * (columns + 1) + column, b = a + 1, c = a + columns + 1, d = c + 1;
    foamIndices.push(a, c, b, b, c, d);
  }
  const foam = new Mesh('a1:shore-wash', scene);
  const foamData = new VertexData();
  foamData.positions = foamPositions; foamData.indices = foamIndices; foamData.uvs = foamUvs;
  foamData.colors = Array.from(foamColors);
  foamData.applyToMesh(foam, true);
  foam.hasVertexAlpha = true;
  foam.material = foamMaterial;
  foam.parent = root;
  foam.isPickable = false;
  foam.checkCollisions = false;
  foam.metadata = { content: 'VTT_AMBIENCE', decorativeOnly: true, effect: 'animated-shore-break' };

  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let lastGeometryTime = -Infinity;
  const updateGeometry = (time: number) => {
    const waterX = sea.position.x, waterZ = sea.position.z;
    for (let i = 0; i < basePositions.length; i += 3) {
      const x = basePositions[i]! + waterX, z = basePositions[i + 2]! + waterZ;
      const height = waveHeight(x, z, time), crest = clamp01((height + .32) / .78);
      wavePositions[i] = basePositions[i]!; wavePositions[i + 1] = basePositions[i + 1]! + height; wavePositions[i + 2] = basePositions[i + 2]!;
      const color = i / 3 * 4;
      waterColors[color] = .13 + crest * .13;
      waterColors[color + 1] = .28 + crest * .23;
      waterColors[color + 2] = .38 + crest * .28;
      waterColors[color + 3] = 1;
    }
    sea.updateVerticesData('position', wavePositions, false, false);
    const normals: number[] = [];
    VertexData.ComputeNormals(wavePositions, indices, normals);
    sea.updateVerticesData('normal', normals, false, false);
    sea.updateVerticesData('color', waterColors, false, false);

    const positions: number[] = [], colors = new Float32Array((columns + 1) * rows * 4);
    let vertex = 0;
    for (let row = 0; row < rows; row++) {
      const rowT = row / (rows - 1), envelope = Math.pow(Math.sin(rowT * Math.PI), .62);
      for (let column = 0; column <= columns; column++, vertex++) {
        const x = -16 + column * 1.15, baseZ = shore(x) + (rowT - .5) * 1.48;
        const phase = time * 1.22 + x * .12 + rowT * 1.6;
        const pulse = Math.sin(phase) * .67 + Math.sin(time * .71 + x * .043) * .33;
        const runup = pulse * .48;
        const z = baseZ - runup;
        const y = -9.15 + waveHeight(x + waterX, z + waterZ, time) + .1;
        const fleck = .5 + .5 * Math.sin(x * .71 + row * 2.1 - time * 1.45) * Math.sin(x * 1.43 - row * .9 + time * .58);
        const breakup = clamp01(.35 + .55 * fleck + .22 * Math.sin(x * .19 - time * .42));
        const crest = clamp01(.16 + pulse * .84);
        const alpha = envelope * (.08 + crest * .78) * breakup;
        positions.push(x + Math.sin(phase * .55) * .07, y, z);
        const color = vertex * 4;
        colors[color] = .72 + crest * .19; colors[color + 1] = .91 + crest * .09; colors[color + 2] = .92 + crest * .08; colors[color + 3] = alpha;
      }
    }
    foam.updateVerticesData('position', positions, false, false);
    foam.updateVerticesData('color', colors, false, false);
    const foamNormals: number[] = [];
    VertexData.ComputeNormals(positions, foamIndices, foamNormals);
    foam.updateVerticesData('normal', foamNormals, false, false);
  };
  updateGeometry(0);

  return {
    sea,
    update(time: number, dark: number) {
      const day = 1 - dark;
      material.diffuseColor = Color3.Lerp(Color3.FromHexString('#92b8c1'), Color3.FromHexString('#4d7186'), dark);
      material.emissiveColor = Color3.Lerp(Color3.FromHexString('#0b3042'), Color3.FromHexString('#152a40'), dark);
      material.specularColor = Color3.Lerp(Color3.FromHexString('#3d7582'), Color3.FromHexString('#243953'), dark);
      foamMaterial.alpha = .57 - dark * .11;
      if (texture && 'uOffset' in texture && 'vOffset' in texture) {
        texture.uOffset = reduced ? 0 : (time * .008) % 1;
        texture.vOffset = reduced ? 0 : Math.sin(time * .12) * .018;
      }
      if (!reduced && time - lastGeometryTime >= 1 / 24) {
        updateGeometry(time);
        lastGeometryTime = time;
      }
      // Keep the painted swells legible even under the colder night palette.
      material.diffuseColor = Color3.Lerp(material.diffuseColor, Color3.FromHexString('#a8c5c8'), day * .08);
    }
  };
}
