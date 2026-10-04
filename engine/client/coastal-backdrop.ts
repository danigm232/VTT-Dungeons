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

/** The bay is modeled as an animated surging body of water with ocean swells crashing into the rocks below A1. */
export function createCoastalBackdrop(scene: Scene, root: TransformNode, url: string) {
  const material = illustratedMaterial(scene, 'a1:sheltered-bay-v2', '#ffffff', url);
  material.specularColor = Color3.FromHexString('#3a7588');
  material.specularPower = 64;
  material.disableLighting = false;
  material.maxSimultaneousLights = 3;

  // Babylon ground for deep animated ocean swells lifting and plunging
  const sea = MeshBuilder.CreateGround('a1:bay-background', { width: 640, height: 640, subdivisions: 96, updatable: true }, scene);
  sea.position = new Vector3(28.5, -9.15, 22);
  sea.parent = root;
  sea.material = material;
  sea.isPickable = false;
  sea.checkCollisions = false;
  sea.receiveShadows = false;
  sea.metadata = { content: 'VTT_AMBIENCE', decorativeOnly: true, heightBelowTerraceMeters: 9.15, effect: 'babylon-vertex-waves' };
  const texture = material.diffuseTexture;
  if (texture instanceof Texture) { texture.uScale = 24; texture.vScale = 24; texture.anisotropicFilteringLevel = 8; }

  const basePositions = sea.getVerticesData('position')!.slice();
  const wavePositions = new Float32Array(basePositions.length);
  const waterColors = new Float32Array(basePositions.length / 3 * 4);
  const indices = sea.getIndices()!;
  sea.setVerticesData('color', waterColors, true, 4);

  // Steepened trochoidal wave function simulating real incoming ocean swells
  const waveHeight = (x: number, z: number, time: number) => {
    // Primary swell train rolling towards the shore (+z)
    const swell1 = Math.sin(x * .038 + z * .082 - time * 1.45);
    const swellPeak1 = (Math.exp(Math.sin(x * .038 + z * .082 - time * 1.45)) - 0.8) * .65;
    // Cross-sea chop and interference
    const swell2 = Math.sin(x * .088 - z * .055 + time * 1.85) * .28;
    const swell3 = Math.sin(x * .14 + z * .042 - time * 2.3) * .14;
    // Shoaling effect: waves grow in height and steepness as they reach the cliffs (z > 22)
    const shoal = 1 + Math.max(0, (z - 18) / 10) * .85;
    return (swellPeak1 + swell2 + swell3) * shoal;
  };

  const foamMaterial = illustratedMaterial(scene, 'a1:shore-wash-v2', '#ffffff');
  foamMaterial.disableLighting = true;
  foamMaterial.backFaceCulling = false;
  foamMaterial.alpha = .78;
  foamMaterial.emissiveColor = Color3.FromHexString('#9ce5eb').scale(.22);

  // Deforming multi-row ribbon for dynamic surf crashing against the rocks
  const columns = 96, rows = 12, foamPositions: number[] = [], foamUvs: number[] = [], foamIndices: number[] = [];
  const foamColors = new Float32Array((columns + 1) * rows * 4);
  const shore = (x: number) => 30.2 + Math.sin(x * .28) * .85 + Math.sin(x * 1.8) * .22;
  for (let row = 0; row < rows; row++) {
    const crossShore = row / (rows - 1) - .5;
    for (let column = 0; column <= columns; column++) {
      const x = -18 + column * 1.2;
      const z = shore(x) + crossShore * 3.8;
      foamPositions.push(x, -9.05, z);
      foamUvs.push(column / columns * 10, row / (rows - 1));
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
      const height = waveHeight(x, z, time), crest = clamp01((height + .25) / .85);
      wavePositions[i] = basePositions[i]!;
      wavePositions[i + 1] = basePositions[i + 1]! + height;
      wavePositions[i + 2] = basePositions[i + 2]!;
      const color = i / 3 * 4;
      // Deep sea navy into bright turquoise crests with foamy highlights
      waterColors[color] = .09 + crest * .28;
      waterColors[color + 1] = .22 + crest * .42;
      waterColors[color + 2] = .32 + crest * .48;
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
      const rowT = row / (rows - 1), envelope = Math.pow(Math.sin(rowT * Math.PI), .55);
      for (let column = 0; column <= columns; column++, vertex++) {
        const x = -18 + column * 1.2, baseZ = shore(x) + (rowT - .5) * 2.2;
        const phase = time * 1.45 + x * .15 + rowT * 1.9;
        const swellPulse = Math.sin(phase);
        const crashPeak = Math.max(0, swellPulse);
        const runup = Math.pow(crashPeak, 1.6) * 1.45 - (1 - crashPeak) * .35;
        const z = baseZ - runup;
        // Dramatic surge climbing up the rocks when waves strike
        const rockSurge = Math.pow(crashPeak, 2.2) * 2.65;
        const y = -9.05 + waveHeight(x + waterX, z + waterZ, time) + rockSurge * (1 - rowT * .6);
        const fleck = .5 + .5 * Math.sin(x * .92 + row * 2.4 - time * 1.8) * Math.sin(x * 1.6 - row * 1.1 + time * .8);
        const breakup = clamp01(.3 + .6 * fleck + .25 * Math.sin(x * .25 - time * .5));
        const crest = clamp01(.2 + crashPeak * .8);
        const alpha = envelope * (.15 + crest * .85) * breakup;
        positions.push(x + Math.sin(phase * .6) * .1, y, z);
        const color = vertex * 4;
        colors[color] = .82 + crest * .18;
        colors[color + 1] = .94 + crest * .06;
        colors[color + 2] = .97 + crest * .03;
        colors[color + 3] = alpha;
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
      material.diffuseColor = Color3.Lerp(Color3.FromHexString('#6faec2'), Color3.FromHexString('#31576d'), dark);
      material.emissiveColor = Color3.Lerp(Color3.FromHexString('#092535'), Color3.FromHexString('#0f2032'), dark);
      material.specularColor = Color3.Lerp(Color3.FromHexString('#5299ad'), Color3.FromHexString('#1c334d'), dark);
      foamMaterial.alpha = .74 - dark * .14;
      if (texture && 'uOffset' in texture && 'vOffset' in texture) {
        texture.uOffset = reduced ? 0 : (time * .012) % 1;
        texture.vOffset = reduced ? 0 : Math.sin(time * .16) * .024;
      }
      if (!reduced && time - lastGeometryTime >= 1 / 24) {
        updateGeometry(time);
        lastGeometryTime = time;
      }
      material.diffuseColor = Color3.Lerp(material.diffuseColor, Color3.FromHexString('#98c7ce'), day * .12);
    }
  };
}
