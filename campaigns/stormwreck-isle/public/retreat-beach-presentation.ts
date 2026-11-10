import type {Scene} from '@babylonjs/core/scene.js';
import {Mesh} from '@babylonjs/core/Meshes/mesh.js';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder.js';
import {VertexData} from '@babylonjs/core/Meshes/mesh.vertexData.js';
import {TransformNode} from '@babylonjs/core/Meshes/transformNode.js';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';
import {Color3} from '@babylonjs/core/Maths/math.color.js';
import {Ray} from '@babylonjs/core/Culling/ray.js';
import {Material} from '@babylonjs/core/Materials/material.js';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial.js';
import {PBRMaterial} from '@babylonjs/core/Materials/PBR/pbrMaterial.js';
import {Texture} from '@babylonjs/core/Materials/Textures/texture.js';
import {DynamicTexture} from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import {PointLight} from '@babylonjs/core/Lights/pointLight.js';
import {retreatWaterSampler} from './retreat-contact-surf.js';
import {organicStone,worldSurfaceUV} from '../../../engine/client/diorama-kit.js';

/**
 * AAA Visual Presentation for Dragon's Rest Zona 1 (Playa, Embarcadero, Pradera Costera y Sendero a Pleamar).
 *
 * Coordinate System in Dragon's Rest:
 * - World X = (col + 0.5) * 1.5, World Z = (row + 0.5) * 1.5
 * - Camera alpha = +Math.PI/2 looks from South (+Z, Sea) toward North (-Z, Inland).
 * - Screen Left = Larger X (X = 20..36, stairs & eastern beach).
 * - Screen Right = Smaller X (X = 18 down to -26, pier, pine meadow & Pleamar low trail).
 *
 * All geometry is strictly decorative (VTT_AMBIENCE): zero collisions, zero pickability,
 * zero navigation or walkability changes.
 */

export interface RetreatBeachPresentationStats {
  sandUpgraded: boolean;
  duneTriangles: number;
  wetSandTriangles: number;
  pebbleCount: number;
  driftwoodCount: number;
  meadowTufts: number;
  pineBushes: number;
  ironBolts: number;
  barnacleClusters: number;
  jettyPiles: number;
  boatRibs: number;
  oarsInstalled: boolean;
  lanternInstalled: boolean;
  cliffSealed: boolean;
  trailGuideposts: number;
  sandWashSamples: number;
  shallowSeabedInstalled: boolean;
}

export interface RetreatBeachPresentation {
  meshes: Mesh[];
  lanternLight: PointLight | null;
  trailLights: PointLight[];
  update: (time: number, interior?: string | null) => void;
  dispose: () => void;
  stats: RetreatBeachPresentationStats;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Interpolates the Z coordinate of the Pleamar low coastal trail for a given X in [-26, 13]. */
function samplePleamarLowTrailZ(x: number): number {
  const pts: ReadonlyArray<readonly [number, number]> = [
    [13.0, 92.0],
    [12.1, 93.5],
    [10.8, 95.1],
    [8.6, 97.2],
    [5.8, 99.0],
    [3.2, 102.1],
    [-1.0, 104.2],
    [-6.0, 106.0],
    [-11.0, 105.8],
    [-16.0, 103.0],
    [-20.0, 99.0],
    [-26.0, 94.5]
  ];
  if (x >= pts[0]![0]) return pts[0]![1];
  if (x <= pts[pts.length - 1]![0]) return pts[pts.length - 1]![1];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    if (x <= a[0] && x >= b[0]) {
      const t = (a[0] - x) / Math.max(1e-4, a[0] - b[0]);
      return a[1] + (b[1] - a[1]) * t;
    }
  }
  return 100.0;
}

/** Partially faceted rock normals (55% smooth / 45% flat face normal) matching SAL1/SAL4 basalt cliffs. */
function computeFacetedRockNormals(
  positions: readonly number[],
  indices: readonly number[],
  uvs: readonly number[],
  colors: readonly number[]
): { positions: number[]; indices: number[]; normals: number[]; uvs: number[]; colors: number[] } {
  const smoothNormals: number[] = [];
  VertexData.ComputeNormals(positions, indices, smoothNormals);

  const outPos: number[] = [];
  const outIdx: number[] = [];
  const outNorm: number[] = [];
  const outUv: number[] = [];
  const outCol: number[] = [];

  const va = new Vector3();
  const vb = new Vector3();
  const vc = new Vector3();
  const faceN = new Vector3();
  const smoothN = new Vector3();

  for (let i = 0; i < indices.length; i += 3) {
    const i0 = indices[i]!;
    const i1 = indices[i + 1]!;
    const i2 = indices[i + 2]!;

    va.set(positions[i0 * 3]!, positions[i0 * 3 + 1]!, positions[i0 * 3 + 2]!);
    vb.set(positions[i1 * 3]!, positions[i1 * 3 + 1]!, positions[i1 * 3 + 2]!);
    vc.set(positions[i2 * 3]!, positions[i2 * 3 + 1]!, positions[i2 * 3 + 2]!);

    Vector3.CrossToRef(vc.subtract(va), vb.subtract(va), faceN);
    if (faceN.lengthSquared() > 1e-8) faceN.normalize();
    else faceN.set(0, 1, 0);

    const base = outPos.length / 3;
    for (const idx of [i0, i1, i2]) {
      outPos.push(positions[idx * 3]!, positions[idx * 3 + 1]!, positions[idx * 3 + 2]!);
      outUv.push(uvs[idx * 2]!, uvs[idx * 2 + 1]!);
      outCol.push(colors[idx * 4]!, colors[idx * 4 + 1]!, colors[idx * 4 + 2]!, colors[idx * 4 + 3]!);

      smoothN.set(smoothNormals[idx * 3]!, smoothNormals[idx * 3 + 1]!, smoothNormals[idx * 3 + 2]!);
      const mixed = Vector3.Lerp(faceN, smoothN, 0.55).normalize();
      outNorm.push(mixed.x, mixed.y, mixed.z);
    }
    outIdx.push(base, base + 1, base + 2);
  }

  return { positions: outPos, indices: outIdx, normals: outNorm, uvs: outUv, colors: outCol };
}

/** Creates a tileable 256x256 coastal golden sand texture with quartz grain & wind ripples. */
function createGoldenSandTexture(scene: Scene): DynamicTexture | null {
  if (typeof document === 'undefined') return null;
  const existing = scene.textures.find(t => t.name === 'retreat:tex:golden-sand-grain');
  if (existing instanceof DynamicTexture) return existing;

  const size = 256;
  const tex = new DynamicTexture('retreat:tex:golden-sand-grain', { width: size, height: size }, scene, true);
  const ctx = tex.getContext();
  const img = ctx.getImageData(0, 0, size, size);
  const data = img.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * Math.PI * 2;
      const v = (y / size) * Math.PI * 2;
      // Seamless periodic wind ripples + fine quartz grain
      const ripple =
        Math.sin(v * 6 + Math.sin(u * 2) * 0.8) * 9 +
        Math.cos(u * 4 - v * 3) * 5;
      const hash = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
      const grain = ((hash - Math.floor(hash)) - 0.5) * 22;
      const shellFleck = ((hash * 13.7 - Math.floor(hash * 13.7)) > 0.96) ? 14 : 0;

      const baseR = 214 + ripple + grain + shellFleck;
      const baseG = 193 + ripple * 0.9 + grain * 0.9 + shellFleck;
      const baseB = 156 + ripple * 0.75 + grain * 0.75 + shellFleck;

      const idx = (y * size + x) * 4;
      data[idx] = Math.max(120, Math.min(250, Math.round(baseR)));
      data[idx + 1] = Math.max(105, Math.min(235, Math.round(baseG)));
      data[idx + 2] = Math.max(80, Math.min(205, Math.round(baseB)));
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  tex.update(false);
  tex.wrapU = Texture.WRAP_ADDRESSMODE;
  tex.wrapV = Texture.WRAP_ADDRESSMODE;
  tex.anisotropicFilteringLevel = 4;
  return tex;
}

function calibratePbr(mat: PBRMaterial, envIntensity = 0.32, roughness = 0.88) {
  (mat as any).environmentBRDFTexture = null;
  mat.environmentIntensity = envIntensity;
  mat.specularIntensity = 0.14;
  mat.directIntensity = 0.86;
  mat.roughness = roughness;
  mat.metallic = 0.0;
  mat.maxSimultaneousLights = 6;
}

function copyCalibratedTextures(source: Material | null | undefined, target: PBRMaterial) {
  if (!source) return false;
  const src = source as any;
  let copied = false;
  if (src.albedoTexture && target.albedoTexture !== src.albedoTexture) {
    target.albedoTexture = src.albedoTexture;
    copied = true;
  } else if (src.diffuseTexture && !target.albedoTexture) {
    target.albedoTexture = src.diffuseTexture;
    copied = true;
  }
  if (src.bumpTexture && target.bumpTexture !== src.bumpTexture) {
    target.bumpTexture = src.bumpTexture;
  }
  if (src.ambientTexture && target.ambientTexture !== src.ambientTexture) {
    target.ambientTexture = src.ambientTexture;
  }
  if (src.microSurfaceTexture && target.microSurfaceTexture !== src.microSurfaceTexture) {
    target.microSurfaceTexture = src.microSurfaceTexture;
  }
  (target as any).environmentBRDFTexture = null;
  return copied;
}

export function installRetreatBeachPresentation(
  scene: Scene,
  sea: Mesh | null,
  _revisionStage = 6
): RetreatBeachPresentation | null {
  if (scene.isDisposed) return null;

  const addedMeshes: Mesh[] = [];
  const addedLights: PointLight[] = [];
  const originalMaterials = new Map<Mesh, any>();
  const retiredSceneMeshes: Mesh[] = [];
  const repositionedSceneMeshes: Array<{ mesh: Mesh; pos: Vector3 }> = [];
  const a1PortalCutawayMeshes: Array<{ roomId: number; mesh: Mesh }> = [];
  const a1InteriorMeshes: Array<{ roomId: number; mesh: Mesh }> = [];

  const stats: RetreatBeachPresentationStats = {
    sandUpgraded: false,
    duneTriangles: 0,
    wetSandTriangles: 0,
    pebbleCount: 0,
    driftwoodCount: 0,
    meadowTufts: 0,
    pineBushes: 0,
    ironBolts: 0,
    barnacleClusters: 0,
    jettyPiles: 0,
    boatRibs: 0,
    oarsInstalled: false,
    lanternInstalled: false,
    cliffSealed: false,
    trailGuideposts: 0,
    sandWashSamples: 0,
    shallowSeabedInstalled: false
  };

  const setAmbientMetadata = (mesh: Mesh, isDynamic = false) => {
    mesh.isPickable = false;
    mesh.checkCollisions = false;
    mesh.receiveShadows = !isDynamic;
    mesh.metadata = {
      content: 'VTT_AMBIENCE',
      decorativeOnly: true,
      tokenOccluder: false,
      retreatFloor: false,
      stoneShadowCaster: false,
      retreatDynamic: isDynamic
    };
    addedMeshes.push(mesh);
  };

  // ---------------------------------------------------------------------------
  // Calibrated PBR Material Palette
  // ---------------------------------------------------------------------------
  const existingCliffMesh = (scene.getMeshByName('SAL4_Tidal_Backland_Stone') ??
    scene.getMeshByName('R3_Harbor_Bank_a1_coastal-cliff-v10')) as Mesh | null;
  const existingOakMesh = (scene.getMeshByName('R3_Jetty_Deck_a1_oak-v5') ??
    scene.getMeshByName('R3_Jetty_Piles_a1_dark-oak-v5')) as Mesh | null;
  const existingGrassMesh = (scene.getMeshByName('finish:R3_Harbor_Meadow_R3_Grass') ??
    scene.getMeshByName('R3_Expedition_Meadow_R3_Grass')) as Mesh | null;
  const existingRopeMat =
    scene.getMaterialByName('style-v1:zones:rope:R3_Rope') ?? scene.getMaterialByName('Hemp_Rope_Used');

  const goldenSandTex = createGoldenSandTexture(scene);

  // 1. Warm Golden Coastal Sand (with procedural quartz sand grain + alpha-feathered shoreline)
  let sandMaterial = scene.getMaterialByName('retreat:pbr:beach-sand') as PBRMaterial | null;
  if (!sandMaterial) {
    sandMaterial = new PBRMaterial('retreat:pbr:beach-sand', scene);
    sandMaterial.albedoColor = Color3.FromHexString('#e8d7b9');
    calibratePbr(sandMaterial, 0.32, 0.92);
    sandMaterial.backFaceCulling = false;
    sandMaterial.twoSidedLighting = true;
    sandMaterial.transparencyMode = Material.MATERIAL_ALPHABLEND;
    if (goldenSandTex) {
      sandMaterial.albedoTexture = goldenSandTex;
    }
    const rockNormal = scene.textures.find(t => (t as any).name?.includes('rock-normal'));
    if (rockNormal instanceof Texture) {
      const bump = rockNormal.clone();
      if (bump instanceof Texture) {
        bump.uScale = 5.0;
        bump.vScale = 5.0;
        bump.level = 0.18;
        sandMaterial.bumpTexture = bump;
      }
    }
  } else {
    calibratePbr(sandMaterial, 0.32, 0.92);
  }

  // 2. Reflective Wet Tide Sand
  let wetSandMaterial = scene.getMaterialByName('retreat:pbr:beach-wet-sand') as PBRMaterial | null;
  if (!wetSandMaterial) {
    wetSandMaterial = new PBRMaterial('retreat:pbr:beach-wet-sand', scene);
    wetSandMaterial.albedoColor = Color3.FromHexString('#9c8869');
    calibratePbr(wetSandMaterial, 0.38, 0.32);
    wetSandMaterial.specularIntensity = 0.30;
    wetSandMaterial.backFaceCulling = false;
    wetSandMaterial.twoSidedLighting = true;
    wetSandMaterial.transparencyMode = Material.MATERIAL_ALPHABLEND;
    if (goldenSandTex) {
      wetSandMaterial.albedoTexture = goldenSandTex;
    }
  } else {
    calibratePbr(wetSandMaterial, 0.38, 0.32);
  }

  // 3. Weathered Oak Pier Timber
  let pierTimberMaterial = scene.getMaterialByName('retreat:pbr:pier-timber') as PBRMaterial | null;
  if (!pierTimberMaterial) {
    pierTimberMaterial = new PBRMaterial('retreat:pbr:pier-timber', scene);
    pierTimberMaterial.albedoColor = Color3.FromHexString('#7a6854');
    calibratePbr(pierTimberMaterial, 0.28, 0.88);
    copyCalibratedTextures(existingOakMesh?.material, pierTimberMaterial);
  } else {
    calibratePbr(pierTimberMaterial, 0.28, 0.88);
  }

  // 4. Forged Marine Iron
  let ironMaterial = scene.getMaterialByName('retreat:pbr:marine-iron') as PBRMaterial | null;
  if (!ironMaterial) {
    ironMaterial = new PBRMaterial('retreat:pbr:marine-iron', scene);
    ironMaterial.albedoColor = Color3.FromHexString('#2b3033');
    calibratePbr(ironMaterial, 0.35, 0.48);
    ironMaterial.metallic = 0.72;
  } else {
    calibratePbr(ironMaterial, 0.35, 0.48);
  }

  // 5. Natural Hemp Mooring Rope
  let ropeMaterial = scene.getMaterialByName('retreat:pbr:hemp-rope') as PBRMaterial | null;
  if (!ropeMaterial) {
    ropeMaterial = new PBRMaterial('retreat:pbr:hemp-rope', scene);
    ropeMaterial.albedoColor = Color3.FromHexString('#9e8967');
    calibratePbr(ropeMaterial, 0.26, 0.92);
    copyCalibratedTextures(existingRopeMat, ropeMaterial);
  } else {
    calibratePbr(ropeMaterial, 0.26, 0.92);
  }

  // 6. Basalt Sea Cliff Rock
  let cliffMaterial = scene.getMaterialByName('retreat:pbr:cliff-basalt') as PBRMaterial | null;
  if (!cliffMaterial) {
    const baseCliffMat =
      existingCliffMesh?.material ??
      scene.getMaterialByName('style-v1:zones:basalt:retreat:pbr:rock') ??
      scene.getMaterialByName('retreat:pbr:rock:distant');
    if (baseCliffMat instanceof PBRMaterial) {
      cliffMaterial = baseCliffMat.clone('retreat:pbr:cliff-basalt');
      (cliffMaterial as any).environmentBRDFTexture = null;
      cliffMaterial.backFaceCulling = false;
    } else {
      cliffMaterial = new PBRMaterial('retreat:pbr:cliff-basalt', scene);
      cliffMaterial.albedoColor = Color3.FromHexString('#55605e');
      calibratePbr(cliffMaterial, 0.30, 0.88);
      cliffMaterial.backFaceCulling = false;
      copyCalibratedTextures(baseCliffMat, cliffMaterial);
    }
  } else {
    (cliffMaterial as any).environmentBRDFTexture = null;
  }

  // 7. Coastal Grass & Botanical Understory
  let grassMaterial = scene.getMaterialByName('retreat:pbr:coastal-grass') as PBRMaterial | null;
  if (!grassMaterial) {
    grassMaterial = new PBRMaterial('retreat:pbr:coastal-grass', scene);
    grassMaterial.albedoColor = Color3.FromHexString('#5c783e');
    calibratePbr(grassMaterial, 0.26, 0.88);
    grassMaterial.backFaceCulling = false;
    grassMaterial.twoSidedLighting = true;
    copyCalibratedTextures(
      existingGrassMesh?.material ?? scene.getMaterialByName('R3_Grass'),
      grassMaterial
    );
  } else {
    calibratePbr(grassMaterial, 0.26, 0.88);
  }

  let shrubMaterial = scene.getMaterialByName('retreat:pbr:coastal-shrub') as PBRMaterial | null;
  if (!shrubMaterial) {
    const baseHerbMat =
      scene.getMaterialByName('Refinement_Cliff_Herbs') ??
      scene.getMaterialByName('Refinement_Garden_Leaf') ??
      scene.getMaterialByName('style-v1:zones:pine:R3_Pine_Dark') ??
      scene.getMaterialByName('R3_Pine_Dark');
    shrubMaterial = new PBRMaterial('retreat:pbr:coastal-shrub', scene);
    shrubMaterial.albedoColor = Color3.FromHexString('#3d542e');
    calibratePbr(shrubMaterial, 0.24, 0.90);
    shrubMaterial.backFaceCulling = false;
    shrubMaterial.twoSidedLighting = true;
    copyCalibratedTextures(baseHerbMat, shrubMaterial);
  } else {
    calibratePbr(shrubMaterial, 0.24, 0.90);
  }

  // Upgrade beach walkable floor meshes while preserving their cobblestone/paving texture
  const beachFloorMeshes = scene.meshes.filter(m =>
    /CANON_Global_beach_walkable-floor|A1_APPROACH_floor-shore/i.test(m.name)
  );
  for (const m of beachFloorMeshes) {
    if (m instanceof Mesh) {
      originalMaterials.set(m, m.material);
      if (m.material instanceof PBRMaterial && m.material.albedoTexture) {
        const clonedFloor = m.material.clone('retreat:pbr:beach-sand');
        (clonedFloor as any).environmentBRDFTexture = null;
        clonedFloor.albedoColor = Color3.FromHexString('#dfd0b6');
        clonedFloor.roughness = 0.90;
        m.material = clonedFloor;
      } else {
        m.material = sandMaterial;
      }
      stats.sandUpgraded = true;
    }
  }

  // ===========================================================================
  // SECTION 1: Generous Golden Cove Sand Beach (Alpha-Feathered) & Stair Seal
  // ===========================================================================
  // Extends from Z = 113.2 out to Z = 117.6 (X = 20.4..31.6) with vertex alpha
  // feathering along the outer surf edge and rock borders so it forms a lush,
  // curving golden sandy beach with zero hard polygon edges by day or night!
  const sampleBeachDuneY = (x: number, z: number): number => {
    const arch = Math.sin(clamp01((x - 20.8) / 10.4) * Math.PI);
    const shoreZ = 116.4 + arch * 1.15;

    if (z <= 113.9) {
      return 0.238 + Math.sin(x * 0.7 + z * 0.5) * 0.01;
    } else if (z <= shoreZ) {
      const t = (z - 113.9) / Math.max(0.6, shoreZ - 113.9);
      return 0.238 - t * 0.128 + Math.sin(x * 0.85 + z * 0.6) * 0.012;
    } else {
      const tSea = clamp01((z - shoreZ) / 1.4);
      return 0.11 - tSea * 0.42;
    }
  };

  {
    const duneCols = 32;
    const duneRows = 20;
    const minX = 20.4;
    const maxX = 31.6;
    const minZ = 113.2;
    const maxZ = 118.2;

    const dunePositions: number[] = [];
    const duneNormals: number[] = [];
    const duneUvs: number[] = [];
    const duneColors: number[] = [];
    const duneIndices: number[] = [];

    for (let r = 0; r <= duneRows; r++) {
      const v = r / duneRows;
      const z = minZ + v * (maxZ - minZ);

      for (let c = 0; c <= duneCols; c++) {
        const u = c / duneCols;
        const x = minX + u * (maxX - minX);
        const y = sampleBeachDuneY(x, z);

        const arch = Math.sin(clamp01((x - 20.8) / 10.4) * Math.PI);
        const shoreZ = 116.4 + arch * 1.15;

        // Smooth alpha feathering at west pier edge, east rock edge, and submerged outer edge
        // Keep alpha = 1.0 until well below the wave trough (z > shoreZ + 0.55) so grey harbor
        // rock underneath never peeks through during low wave troughs!
        const westAlpha = smoothstep(20.4, 21.4, x);
        const eastAlpha = 1.0 - smoothstep(30.0, 31.5, x);
        const northAlpha = smoothstep(113.2, 113.85, z);
        const southAlpha = 1.0 - smoothstep(shoreZ + 0.55, shoreZ + 1.35, z);
        const alpha = westAlpha * eastAlpha * northAlpha * southAlpha;

        dunePositions.push(x, y, z);
        duneNormals.push(0, 1, 0);
        duneUvs.push(x / 2.4, z / 2.4);

        const wet = smoothstep(0.185, 0.11, y);
        const grain = 0.96 + Math.sin(x * 1.4 + z * 1.1) * 0.04;
        const rCol = grain * (0.98 - wet * 0.28);
        const gCol = grain * (0.93 - wet * 0.28);
        const bCol = grain * (0.82 - wet * 0.24);
        duneColors.push(rCol, gCol, bCol, alpha);
      }
    }

    for (let r = 0; r < duneRows; r++) {
      for (let c = 0; c < duneCols; c++) {
        const p1 = r * (duneCols + 1) + c;
        const p2 = p1 + 1;
        const p3 = (r + 1) * (duneCols + 1) + c;
        const p4 = p3 + 1;
        duneIndices.push(p1, p3, p2);
        duneIndices.push(p2, p3, p4);
      }
    }

    const duneMesh = new Mesh('retreat:beach-natural-dunes', scene);
    const duneData = new VertexData();
    duneData.positions = dunePositions;
    duneData.indices = duneIndices;
    duneData.uvs = duneUvs;
    duneData.colors = duneColors;
    VertexData.ComputeNormals(dunePositions, duneIndices, duneNormals);
    duneData.normals = duneNormals;
    duneData.applyToMesh(duneMesh, true);
    duneMesh.useVertexColors = true;
    duneMesh.hasVertexAlpha = true;
    duneMesh.material = sandMaterial;
    setAmbientMetadata(duneMesh);
    stats.duneTriangles = duneIndices.length / 3;

    // Seal the coastal rock under Flight 3 (X=29.5..35.0, Z=108.0..114.6) and under
    // Landing 3 / west Flight 2 (X=34.2..41.5, Z=105.0..110.8) using faceted basalt
    // with continuous UVs and vertex colors matching SAL4/Stone_P3 (zero blue-water notches!)
    const buildUnderStairBasaltSkirt = (
      meshName: string,
      tMinX: number,
      tMaxX: number,
      tMinZ: number,
      tMaxZ: number,
      sampleTopY: (x: number) => number,
      stringerZ: number,
      shoreZAtU: (u: number) => number
    ) => {
      const toeCols = 18;
      const toeRows = 14;
      const tPos: number[] = [];
      const tNorm: number[] = [];
      const tUv: number[] = [];
      const tCol: number[] = [];
      const tIdx: number[] = [];
      for (let r = 0; r <= toeRows; r++) {
        const v = r / toeRows;
        const z = tMinZ + v * (tMaxZ - tMinZ);
        for (let c = 0; c <= toeCols; c++) {
          const u = c / toeCols;
          const x = tMinX + u * (tMaxX - tMinX);
          const shoreZ = shoreZAtU(u);
          // Stay flush with the stair underside up to stringerZ, then slope to 0.36m at shoreZ
          const cliffDrop = smoothstep(stringerZ, shoreZ - 0.35, z);
          const topY = sampleTopY(x) * (1.0 - cliffDrop) + 0.36 * cliffDrop;
          const seaDrop = smoothstep(shoreZ - 0.35, shoreZ + 0.45, z);
          const facet =
            Math.abs(Math.sin(x * 0.65 + z * 0.52)) * 0.14 +
            Math.abs(Math.cos(x * 1.1 - z * 0.85)) * 0.08;
          let y = (topY + facet * cliffDrop) * (1.0 - seaDrop) + (-0.55) * seaDrop;
          if (x < 30.25) {
            const westTuck = 1.0 - smoothstep(29.5, 30.25, x);
            y = y * (1.0 - westTuck) + Math.min(y, 0.22) * westTuck;
          }
          tPos.push(x, y, z);
          tUv.push(x / 3.3, (z - y * 0.72) / 3.3);
          const wet = 1.0 - 0.14 * clamp01((1.2 - y) / 1.6);
          tCol.push(0.86 * wet, 0.88 * wet, 0.87 * wet, 1.0);
        }
      }
      for (let r = 0; r < toeRows; r++) {
        for (let c = 0; c < toeCols; c++) {
          const p1 = r * (toeCols + 1) + c;
          const p2 = p1 + 1;
          const p3 = (r + 1) * (toeCols + 1) + c;
          const p4 = p3 + 1;
          tIdx.push(p1, p3, p2, p2, p3, p4);
        }
      }
      VertexData.ComputeNormals(tPos, tIdx, tNorm);
      const toeMesh = new Mesh(meshName, scene);
      const toeData = new VertexData();
      toeData.positions = tPos;
      toeData.indices = tIdx;
      toeData.normals = tNorm;
      toeData.uvs = tUv;
      toeData.colors = tCol;
      toeData.applyToMesh(toeMesh, true);
      toeMesh.useVertexColors = true;
      toeMesh.hasVertexAlpha = false;
      const cliffSrc = scene.getMeshByName('SAL4_Tidal_Backland_Stone');
      toeMesh.material = cliffSrc?.material ?? cliffMaterial;
      setAmbientMetadata(toeMesh);
    };

    buildUnderStairBasaltSkirt(
      'retreat:stair-abutment-rock-0',
      29.5,
      35.2,
      108.1,
      114.6,
      x => 0.23 + clamp01((x - 30.0) / 4.5) * 1.14,
      111.06,
      u => 114.35 - u * 2.85
    );
    buildUnderStairBasaltSkirt(
      'retreat:stair-abutment-rock-1',
      34.2,
      41.4,
      105.1,
      110.8,
      x => (x < 37.5 ? 1.37 : 1.37 + clamp01((x - 37.5) / 7.5) * 2.46),
      108.06,
      u => 110.45 - u * 1.65
    );
  }

  // Reflective Wet Sand Ribbon along the curved cove waterline (X: 21.3..30.3)
  {
    const wetPositions: number[] = [];
    const wetNormals: number[] = [];
    const wetUvs: number[] = [];
    const wetColors: number[] = [];
    const wetIndices: number[] = [];
    const steps = 24;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = 21.3 + t * 9.0;
      const arch = Math.sin(clamp01((x - 20.8) / 10.4) * Math.PI);
      const shoreZ = 115.75 + arch * 1.22;
      const endFade = Math.sin(t * Math.PI);

      const zUpper = shoreZ - 0.65;
      const zMid = shoreZ - 0.10;
      const zLower = shoreZ + 0.45;

      wetPositions.push(x, sampleBeachDuneY(x, zUpper) + 0.005, zUpper);
      wetNormals.push(0, 1, 0);
      wetUvs.push(t * 5.0, 0);
      wetColors.push(0.85, 0.78, 0.66, 0.0);

      wetPositions.push(x, sampleBeachDuneY(x, zMid) + 0.005, zMid);
      wetNormals.push(0, 1, 0);
      wetUvs.push(t * 5.0, 0.5);
      wetColors.push(0.76, 0.68, 0.56, 0.78 * endFade);

      wetPositions.push(x, sampleBeachDuneY(x, zLower) + 0.004, zLower);
      wetNormals.push(0, 1, 0);
      wetUvs.push(t * 5.0, 1.0);
      wetColors.push(0.68, 0.60, 0.48, 0.0);
    }

    for (let i = 0; i < steps; i++) {
      const b = i * 3;
      wetIndices.push(b, b + 3, b + 1);
      wetIndices.push(b + 1, b + 3, b + 4);
      wetIndices.push(b + 1, b + 4, b + 2);
      wetIndices.push(b + 2, b + 4, b + 5);
    }

    const wetMesh = new Mesh('retreat:beach-wet-shore-ribbon', scene);
    const wetData = new VertexData();
    wetData.positions = wetPositions;
    wetData.indices = wetIndices;
    wetData.uvs = wetUvs;
    wetData.colors = wetColors;
    VertexData.ComputeNormals(wetPositions, wetIndices, wetNormals);
    wetData.normals = wetNormals;
    wetData.applyToMesh(wetMesh, true);
    wetMesh.useVertexColors = true;
    wetMesh.hasVertexAlpha = true;
    wetMesh.material = wetSandMaterial;
    setAmbientMetadata(wetMesh);
    stats.wetSandTriangles = wetIndices.length / 3;
  }

  // ===========================================================================
  // SECTION 2: Beach Scatter, Driftwood & Sculpted Basalt Boulders
  // ===========================================================================
  {
    const scatterPositions: number[] = [];
    const scatterNormals: number[] = [];
    const scatterColors: number[] = [];
    const scatterIndices: number[] = [];

    const driftwoodLogs = [
      { x: 23.2, z: 114.8, len: 1.75, rad: 0.085, yaw: 0.28, pitch: 0.03 },
      { x: 27.6, z: 115.1, len: 1.55, rad: 0.08, yaw: -0.35, pitch: -0.02 },
      { x: 29.3, z: 114.3, len: 1.35, rad: 0.085, yaw: 0.52, pitch: 0.03 },
      { x: 22.1, z: 114.3, len: 1.25, rad: 0.075, yaw: -0.18, pitch: 0.02 }
    ];

    for (const log of driftwoodLogs) {
      const logMesh = MeshBuilder.CreateCylinder(
        `retreat:driftwood-${stats.driftwoodCount}`,
        { height: log.len, diameterTop: log.rad * 1.5, diameterBottom: log.rad * 2.0, tessellation: 8 },
        scene
      );
      const y = Math.max(0.14, sampleBeachDuneY(log.x, log.z)) + log.rad * 0.5;
      logMesh.position.set(log.x, y, log.z);
      logMesh.rotation.z = Math.PI / 2 + log.pitch;
      logMesh.rotation.y = log.yaw;
      logMesh.material = pierTimberMaterial;
      setAmbientMetadata(logMesh);
      stats.driftwoodCount++;
    }

    const boulders = [
      { x: 21.8, y: 0.16, z: 114.9, sx: 0.95, sy: 0.48, sz: 0.82, yaw: 0.4, seed: 1.1 },
      { x: 25.6, y: 0.16, z: 115.9, sx: 1.15, sy: 0.54, sz: 0.96, yaw: 1.1, seed: 2.3 },
      { x: 29.6, y: 0.20, z: 114.8, sx: 1.35, sy: 0.66, sz: 1.12, yaw: -0.7, seed: 3.7 },
      { x: 30.4, y: 0.25, z: 113.2, sx: 1.45, sy: 0.72, sz: 1.25, yaw: 0.6, seed: 5.2 },
      { x: 18.2, y: 0.16, z: 114.6, sx: 1.08, sy: 0.54, sz: 0.92, yaw: -0.3, seed: 6.8 },
      { x: 28.4, y: 0.18, z: 115.6, sx: 0.88, sy: 0.44, sz: 0.78, yaw: 0.9, seed: 8.1 }
    ];

    for (let i = 0; i < boulders.length; i++) {
      const b = boulders[i]!;
      const rock = organicStone(scene, `retreat:beach-boulder-${i}`, b.sx, b.sy, b.sz, b.seed);
      rock.position.set(b.x, b.y, b.z);
      rock.rotation.y = b.yaw;
      rock.material = cliffMaterial;
      worldSurfaceUV(rock, 2.8);
      setAmbientMetadata(rock);
    }

    for (let i = 0; i < 72; i++) {
      const seed = i * 137.5;
      const u = (i % 24) / 24;
      const px = 21.8 + u * 8.0 + Math.sin(seed) * 0.32;
      const pz = 114.0 + (Math.cos(seed * 0.7) * 0.5 + 0.5) * 2.1;
      const py = sampleBeachDuneY(px, pz) + 0.006;
      const rad = 0.032 + (i % 4) * 0.015;

      const base = scatterPositions.length / 3;
      scatterPositions.push(px, py + rad * 0.6, pz);
      scatterNormals.push(0, 1, 0);
      scatterColors.push(0.42, 0.44, 0.41, 1);

      for (let s = 0; s < 5; s++) {
        const ang = (s * Math.PI * 2) / 5;
        scatterPositions.push(px + Math.cos(ang) * rad, py, pz + Math.sin(ang) * rad);
        scatterNormals.push(Math.cos(ang), 0.35, Math.sin(ang));
        const isShell = i % 5 === 0;
        if (isShell) {
          scatterColors.push(0.92, 0.88, 0.80, 1);
        } else {
          scatterColors.push(0.36, 0.38, 0.36, 1);
        }
      }

      for (let s = 0; s < 5; s++) {
        const n1 = 1 + s;
        const n2 = 1 + ((s + 1) % 5);
        scatterIndices.push(base, base + n1, base + n2);
      }
      stats.pebbleCount++;
    }

    const scatterMesh = new Mesh('retreat:beach-scatter', scene);
    const scatterData = new VertexData();
    scatterData.positions = scatterPositions;
    scatterData.normals = scatterNormals;
    scatterData.colors = scatterColors;
    scatterData.indices = scatterIndices;
    scatterData.applyToMesh(scatterMesh, true);
    scatterMesh.useVertexColors = true;
    scatterMesh.material = cliffMaterial;
    setAmbientMetadata(scatterMesh);
  }

  // ===========================================================================
  // SECTION 3: Lush 3-Blade Coastal Meadow Tufts & Botanical Understory
  // ===========================================================================
  {
    const meadowPositions: number[] = [];
    const meadowNormals: number[] = [];
    const meadowColors: number[] = [];
    const meadowIndices: number[] = [];

    const addPointedTuft = (gx: number, gy: number, gz: number, seed: number, isFlowering: boolean) => {
      const h = 0.14 + (Math.abs(Math.sin(seed * 3.1)) * 0.18);
      const w = 0.036;
      const tint = 0.84 + 0.16 * Math.abs(Math.cos(seed * 1.7));

      for (let j = 0; j < 3; j++) {
        const a = seed + j * 2.094;
        const dx = Math.cos(a);
        const dz = Math.sin(a);
        const k = meadowPositions.length / 3;

        meadowPositions.push(
          gx - dz * w, gy, gz + dx * w,
          gx + dz * w, gy, gz - dx * w,
          gx + dx * h * 0.28, gy + h, gz + dz * h * 0.28
        );
        meadowNormals.push(0, 1, 0, 0, 1, 0, 0, 1, 0);

        if (isFlowering && j === 2) {
          meadowColors.push(0.42 * tint, 0.56 * tint, 0.32 * tint, 1);
          meadowColors.push(0.42 * tint, 0.56 * tint, 0.32 * tint, 1);
          meadowColors.push(0.94, 0.80, 0.88, 1);
        } else {
          meadowColors.push(0.38 * tint, 0.52 * tint, 0.26 * tint, 1);
          meadowColors.push(0.38 * tint, 0.52 * tint, 0.26 * tint, 1);
          meadowColors.push(0.64 * tint, 0.80 * tint, 0.38 * tint, 1);
        }

        meadowIndices.push(k, k + 1, k + 2, k + 2, k + 1, k);
      }
      stats.meadowTufts++;
    };

    for (let i = 0; i < 320; i++) {
      const seed = i * 31.7 + 1.3;
      const u = ((i * 17) % 113) / 113;
      const v = ((i * 29) % 107) / 107;
      const gx = 1.5 + u * 16.1 + Math.sin(seed) * 0.22;
      let gz = 104.5 + v * 17.8 + Math.cos(seed) * 0.22;

      if (gz > 111.25 && gz < 113.75 && gx > 4.6) {
        gz = gz < 112.5 ? 110.95 - (i % 3) * 0.14 : 114.05 + (i % 3) * 0.14;
      }
      if (gx > 6.3 && gx < 11.7 && gz < 111.2) {
        continue;
      }
      addPointedTuft(gx, 0.252, gz, seed, i % 4 === 0);
    }

    const seamSegments: ReadonlyArray<readonly [number, number, number, number, number]> = [
      [4.5, 114.0, 17.8, 114.05, 36],
      [11.8, 111.0, 17.8, 110.96, 22],
      [1.8, 110.98, 6.2, 110.94, 16],
      [6.02, 104.2, 6.08, 110.8, 18],
      [11.95, 103.5, 12.02, 110.8, 18],
      [17.95, 108.2, 18.05, 114.2, 14]
    ];
    let seamIdx = 0;
    for (const [x0, z0, x1, z1, count] of seamSegments) {
      for (let k = 0; k < count; k++) {
        const t = k / Math.max(1, count - 1);
        const seed = 600 + seamIdx * 19.1;
        const jx = Math.sin(seed) * 0.16;
        const jz = Math.cos(seed * 1.3) * 0.16;
        addPointedTuft(x0 + (x1 - x0) * t + jx, 0.252, z0 + (z1 - z0) * t + jz, seed, seamIdx % 3 === 0);
        seamIdx++;
      }
    }

    const meadowMesh = new Mesh('retreat:coastal-lush-meadow', scene);
    const meadowData = new VertexData();
    meadowData.positions = meadowPositions;
    meadowData.normals = meadowNormals;
    meadowData.colors = meadowColors;
    meadowData.indices = meadowIndices;
    meadowData.applyToMesh(meadowMesh, true);
    meadowMesh.useVertexColors = true;
    meadowMesh.material = grassMaterial;
    setAmbientMetadata(meadowMesh);

    const bushLocations = [
      { x: 5.2, y: 0.25, z: 107.4, rad: 0.48 },
      { x: 10.6, y: 0.25, z: 119.8, rad: 0.50 },
      { x: 16.8, y: 0.25, z: 106.6, rad: 0.46 },
      { x: 2.3, y: 0.25, z: 116.8, rad: 0.48 },
      { x: 4.4, y: 0.25, z: 112.2, rad: 0.44 },
      { x: 14.3, y: 0.25, z: 120.8, rad: 0.46 },
      { x: 7.4, y: 0.25, z: 121.6, rad: 0.46 },
      { x: 2.9, y: 0.25, z: 109.2, rad: 0.44 }
    ];

    for (let i = 0; i < bushLocations.length; i++) {
      const b = bushLocations[i]!;
      const bPos: number[] = [];
      const bNorm: number[] = [];
      const bCol: number[] = [];
      const bIdx: number[] = [];

      const leafCount = 14;
      for (let l = 0; l < leafCount; l++) {
        const ring = l < 8 ? 0 : 1;
        const ang = (l * Math.PI * 2) / (ring === 0 ? 8 : 6) + i * 0.7;
        const len = b.rad * (ring === 0 ? 0.95 : 0.65) * (0.85 + 0.2 * Math.sin(l * 2.3));
        const lift = b.rad * (ring === 0 ? 0.36 : 0.62);
        const w = 0.065;
        const dx = Math.cos(ang);
        const dz = Math.sin(ang);
        const k = bPos.length / 3;

        bPos.push(
          -dz * w, 0.01, dx * w,
          dz * w, 0.01, -dx * w,
          dx * len * 0.55 - dz * w * 0.6, lift * 0.75, dz * len * 0.55 + dx * w * 0.6,
          dx * len * 0.55 + dz * w * 0.6, lift * 0.75, dz * len * 0.55 - dx * w * 0.6,
          dx * len, lift * 0.45, dz * len
        );
        for (let v = 0; v < 5; v++) bNorm.push(0, 1, 0);

        bCol.push(
          0.22, 0.34, 0.18, 1,
          0.22, 0.34, 0.18, 1,
          0.34, 0.48, 0.26, 1,
          0.34, 0.48, 0.26, 1,
          0.44, 0.58, 0.32, 1
        );

        bIdx.push(
          k, k + 1, k + 2,
          k + 1, k + 3, k + 2,
          k + 2, k + 3, k + 4,
          k + 2, k + 1, k,
          k + 2, k + 3, k + 1,
          k + 4, k + 3, k + 2
        );
      }

      const bush = new Mesh(`retreat:pine-grove-bush-${i}`, scene);
      const bushData = new VertexData();
      bushData.positions = bPos;
      bushData.normals = bNorm;
      bushData.colors = bCol;
      bushData.indices = bIdx;
      bushData.applyToMesh(bush, true);
      bush.position.set(b.x, b.y, b.z);
      bush.useVertexColors = true;
      bush.material = shrubMaterial;
      setAmbientMetadata(bush);
      stats.pineBushes++;
    }
  }

  // ===========================================================================
  // SECTION 4: Heavy Timber Pier, Submerged Pilings & Nautical Cargo
  // ===========================================================================
  {
    const pierPileCoords = [
      { x: 19.28, z: 114.2 },
      { x: 21.22, z: 114.2 },
      { x: 19.28, z: 115.6 },
      { x: 21.22, z: 115.6 },
      { x: 19.28, z: 117.1 },
      { x: 21.22, z: 117.1 },
      { x: 18.25, z: 114.1 },
      { x: 22.25, z: 114.1 }
    ];

    for (let i = 0; i < pierPileCoords.length; i++) {
      const p = pierPileCoords[i]!;
      const pile = MeshBuilder.CreateCylinder(
        `retreat:jetty-pile-${i}`,
        { height: 1.75, diameter: 0.26, tessellation: 10 },
        scene
      );
      pile.position.set(p.x, -0.52, p.z);
      pile.material = pierTimberMaterial;
      setAmbientMetadata(pile);
      stats.jettyPiles++;
    }

    const deckPlankCount = 14;
    const boltPositions: number[] = [];
    const boltNormals: number[] = [];
    const boltIndices: number[] = [];

    for (let k = 0; k < deckPlankCount; k++) {
      const pz = 113.5 + k * 0.28;
      const plank = MeshBuilder.CreateBox(
        `retreat:jetty-deck-plank-${k}`,
        { width: 2.22, height: 0.055, depth: 0.22 },
        scene
      );
      plank.position.set(20.25, 0.31, pz);
      plank.material = pierTimberMaterial;
      setAmbientMetadata(plank);

      for (const boltX of [19.32, 21.18]) {
        const baseIdx = boltPositions.length / 3;
        boltPositions.push(boltX - 0.022, 0.374, pz - 0.015);
        boltPositions.push(boltX + 0.022, 0.374, pz - 0.015);
        boltPositions.push(boltX, 0.382, pz + 0.022);
        boltNormals.push(0, 1, 0, 0, 1, 0, 0, 1, 0);
        boltIndices.push(baseIdx, baseIdx + 1, baseIdx + 2);
        stats.ironBolts++;
      }
    }

    const boltsMesh = new Mesh('retreat:jetty-iron-hardware', scene);
    const boltsData = new VertexData();
    boltsData.positions = boltPositions;
    boltsData.normals = boltNormals;
    boltsData.indices = boltIndices;
    boltsData.applyToMesh(boltsMesh, true);
    boltsMesh.material = ironMaterial;
    setAmbientMetadata(boltsMesh);

    for (const sideX of [19.26, 21.24]) {
      const bearer = MeshBuilder.CreateBox(
        `retreat:jetty-bearer-${sideX > 20 ? 'east' : 'west'}`,
        { width: 0.18, height: 0.18, depth: 3.4 },
        scene
      );
      bearer.position.set(sideX, 0.18, 115.6);
      bearer.material = pierTimberMaterial;
      setAmbientMetadata(bearer);
    }

    const barnaclePositions: number[] = [];
    const barnacleNormals: number[] = [];
    const barnacleColors: number[] = [];
    const barnacleIndices: number[] = [];

    for (const p of pierPileCoords) {
      for (let ring = 0; ring < 2; ring++) {
        const ringY = 0.02 + ring * 0.11;
        for (let b = 0; b < 6; b++) {
          const ang = (b * Math.PI * 2) / 6 + p.x;
          const rad = 0.135;
          const bx = p.x + Math.cos(ang) * rad;
          const bz = p.z + Math.sin(ang) * rad;

          const baseIdx = barnaclePositions.length / 3;
          barnaclePositions.push(bx + Math.cos(ang) * 0.028, ringY + 0.025, bz + Math.sin(ang) * 0.028);
          barnacleNormals.push(Math.cos(ang), 0.3, Math.sin(ang));
          barnacleColors.push(0.76, 0.78, 0.72, 1);

          for (let s = 0; s < 4; s++) {
            const sang = (s * Math.PI * 2) / 4;
            barnaclePositions.push(
              bx + Math.cos(ang + sang * 0.45) * 0.018,
              ringY - 0.018,
              bz + Math.sin(ang + sang * 0.45) * 0.018
            );
            barnacleNormals.push(Math.cos(ang), -0.2, Math.sin(ang));
            barnacleColors.push(0.42, 0.46, 0.42, 1);
          }

          for (let s = 0; s < 4; s++) {
            barnacleIndices.push(baseIdx, baseIdx + 1 + s, baseIdx + 1 + ((s + 1) % 4));
          }
          stats.barnacleClusters++;
        }
      }
    }

    const barnaclesMesh = new Mesh('retreat:jetty-pile-marine-life', scene);
    const barnacleData = new VertexData();
    barnacleData.positions = barnaclePositions;
    barnacleData.normals = barnacleNormals;
    barnacleData.colors = barnacleColors;
    barnacleData.indices = barnacleIndices;
    barnacleData.applyToMesh(barnaclesMesh, true);
    barnaclesMesh.useVertexColors = true;
    barnaclesMesh.material = cliffMaterial;
    setAmbientMetadata(barnaclesMesh);

    const crate1 = MeshBuilder.CreateBox('retreat:pier-crate-1', { width: 0.48, height: 0.42, depth: 0.48 }, scene);
    crate1.position.set(18.38, 0.51, 113.25);
    crate1.rotation.y = 0.18;
    crate1.material = pierTimberMaterial;
    setAmbientMetadata(crate1);

    const crate2 = MeshBuilder.CreateBox('retreat:pier-crate-2', { width: 0.38, height: 0.32, depth: 0.38 }, scene);
    crate2.position.set(18.42, 0.88, 113.22);
    crate2.rotation.y = -0.14;
    crate2.material = pierTimberMaterial;
    setAmbientMetadata(crate2);

    const barrel = MeshBuilder.CreateCylinder(
      'retreat:pier-barrel',
      { height: 0.56, diameter: 0.38, tessellation: 12 },
      scene
    );
    barrel.position.set(18.45, 0.58, 113.82);
    barrel.material = pierTimberMaterial;
    setAmbientMetadata(barrel);

    const deckRopeCoords: Vector3[] = [];
    for (let i = 0; i <= 32; i++) {
      const u = i / 32;
      const rad = 0.04 + u * 0.16;
      const ang = u * Math.PI * 2 * 3.5;
      deckRopeCoords.push(new Vector3(19.52 + Math.cos(ang) * rad, 0.38 + u * 0.01, 116.75 + Math.sin(ang) * rad));
    }
    const deckRopeMesh = MeshBuilder.CreateTube(
      'retreat:pier-deck-rope-coil',
      { path: deckRopeCoords, radius: 0.018, tessellation: 6 },
      scene
    );
    deckRopeMesh.material = ropeMaterial;
    setAmbientMetadata(deckRopeMesh);

    const mooringHempPath: Vector3[] = [];
    for (let i = 0; i <= 36; i++) {
      const u = i / 36;
      const rad = 0.135 + Math.sin(u * Math.PI * 6) * 0.012;
      const ang = u * Math.PI * 2 * 3.5;
      const y = 0.58 + u * 0.18;
      mooringHempPath.push(new Vector3(21.2 + Math.cos(ang) * rad, y, 117.1 + Math.sin(ang) * rad));
    }
    const mooringMesh = MeshBuilder.CreateTube(
      'retreat:jetty-mooring-coils',
      { path: mooringHempPath, radius: 0.022, tessellation: 6 },
      scene
    );
    mooringMesh.material = ropeMaterial;
    setAmbientMetadata(mooringMesh);
  }

  // ===========================================================================
  // SECTION 5: Flawless Moored Rowing Boat (Barca de Remos)
  // ===========================================================================
  const boatRig = scene.getTransformNodeByName('retreat:moored-boat');
  let lanternLight: PointLight | null = null;

  if (boatRig) {
    const ribConfigs = [
      { z: -0.55, w: 0.62 },
      { z: 0.0, w: 0.76 },
      { z: 0.55, w: 0.62 }
    ];
    for (let r = 0; r < ribConfigs.length; r++) {
      const rc = ribConfigs[r]!;
      const rib = MeshBuilder.CreateBox(
        `retreat:boat-rib-${r}`,
        { width: rc.w, height: 0.035, depth: 0.055 },
        scene
      );
      rib.position.set(0, 0.055, rc.z);
      rib.parent = boatRig;
      rib.material = pierTimberMaterial;
      setAmbientMetadata(rib, true);
      stats.boatRibs++;
    }

    const thwartConfigs = [
      { z: -0.65, w: 0.96 },
      { z: 0.65, w: 0.88 }
    ];
    for (let s = 0; s < thwartConfigs.length; s++) {
      const tc = thwartConfigs[s]!;
      const thwart = MeshBuilder.CreateBox(
        `retreat:boat-thwart-${s}`,
        { width: tc.w, height: 0.028, depth: 0.22 },
        scene
      );
      thwart.position.set(0, 0.312, tc.z);
      thwart.parent = boatRig;
      thwart.material = pierTimberMaterial;
      setAmbientMetadata(thwart, true);
    }

    const hasGlbOars = Boolean(scene.getMeshByName('P2_VTT_Oar_Shaft_0'));
    for (const sideIdx of [0, 1]) {
      const sideSign = sideIdx === 0 ? -1 : 1;
      const existingPivot = scene.getTransformNodeByName(`retreat:rowing-oar-${sideIdx}`);
      const oarRoot =
        existingPivot ??
        (() => {
          const p = new TransformNode(`retreat:boat-resting-oar-${sideIdx}`, scene);
          p.parent = boatRig;
          p.position.set(sideSign * 0.72, 0.655, -0.15);
          p.rotation.y = sideSign * (Math.PI / 2);
          p.rotation.x = 0.14;
          return p;
        })();

      const shaft = MeshBuilder.CreateCylinder(
        `retreat:oar-shaft-${sideIdx}`,
        hasGlbOars
          ? { height: 0.28, diameter: 0.058, tessellation: 8 }
          : { height: 1.85, diameter: 0.042, tessellation: 8 },
        scene
      );
      shaft.parent = oarRoot;
      shaft.rotation.x = Math.PI / 2;
      shaft.position.set(0, 0, hasGlbOars ? 0.0 : 0.32);
      shaft.material = hasGlbOars ? ropeMaterial : pierTimberMaterial;
      setAmbientMetadata(shaft, true);

      const blade = MeshBuilder.CreateBox(
        `retreat:oar-blade-${sideIdx}`,
        hasGlbOars
          ? { width: 0.15, height: 0.022, depth: 0.12 }
          : { width: 0.15, height: 0.02, depth: 0.56 },
        scene
      );
      blade.parent = oarRoot;
      blade.position.set(0, 0, hasGlbOars ? 1.42 : 1.22);
      blade.material = hasGlbOars ? ironMaterial : pierTimberMaterial;
      setAmbientMetadata(blade, true);
    }
    stats.oarsInstalled = true;

    const bowCoilCoords: Vector3[] = [];
    for (let i = 0; i <= 28; i++) {
      const u = i / 28;
      const rad = 0.025 + u * 0.11;
      const ang = u * Math.PI * 2 * 3.2;
      bowCoilCoords.push(new Vector3(Math.cos(ang) * rad, 0.34 + u * 0.012, -1.22 + Math.sin(ang) * rad * 0.85));
    }
    const bowRopeMesh = MeshBuilder.CreateTube(
      'retreat:boat-bow-rope-coil',
      { path: bowCoilCoords, radius: 0.016, tessellation: 5 },
      scene
    );
    bowRopeMesh.parent = boatRig;
    bowRopeMesh.material = ropeMaterial;
    setAmbientMetadata(bowRopeMesh, true);

    for (const side of [-1, 1]) {
      const oarlock = MeshBuilder.CreateTorus(
        `retreat:boat-oarlock-${side > 0 ? 'stbd' : 'port'}`,
        { diameter: 0.08, thickness: 0.02, tessellation: 8 },
        scene
      );
      oarlock.position.set(side * 0.72, 0.645, -0.15);
      oarlock.rotation.z = Math.PI / 2;
      oarlock.parent = boatRig;
      oarlock.material = ironMaterial;
      setAmbientMetadata(oarlock, true);
    }
  }

  // Pierhead Signal Lantern
  {
    const lanternPostX = 21.2;
    const lanternPostZ = 117.1;
    const lanternY = 0.96;

    const lanternCage = MeshBuilder.CreateCylinder(
      'retreat:jetty-lantern-bracket',
      { height: 0.24, diameterTop: 0.13, diameterBottom: 0.16, tessellation: 6 },
      scene
    );
    lanternCage.position.set(lanternPostX, lanternY + 0.12, lanternPostZ);
    lanternCage.material = ironMaterial;
    setAmbientMetadata(lanternCage);

    const lanternGlass = MeshBuilder.CreateCylinder(
      'retreat:jetty-lantern-glass',
      { height: 0.16, diameter: 0.10, tessellation: 8 },
      scene
    );
    lanternGlass.position.set(lanternPostX, lanternY + 0.12, lanternPostZ);
    const glassMat = scene.getMaterialByName('retreat:pbr:glass') ?? pierTimberMaterial;
    lanternGlass.material = glassMat;
    setAmbientMetadata(lanternGlass);

    lanternLight = new PointLight(
      'retreat:jetty-lantern-light',
      new Vector3(lanternPostX, lanternY + 0.14, lanternPostZ),
      scene
    );
    lanternLight.diffuse = Color3.FromHexString('#ffa84e');
    lanternLight.specular = Color3.FromHexString('#663d19');
    lanternLight.range = 8.5;
    lanternLight.intensity = 0.0;
    addedLights.push(lanternLight);
    stats.lanternInstalled = true;
  }

  // ===========================================================================
  // SECTION 6: Vertex-Locked Basalt Mountain Cliff & Headland (Fixes Image 2)
  // ===========================================================================
  // Reads the world-space vertex buffers and vertex colors of SAL4_Tidal_Backland_Stone
  // and SAL1_Ledge_Talus_01 so our headland continuation starts right at their western cut
  // edge (edgeX ≈ -9..-12), never overlaps X > edgeX + 0.30 north of the trail, locks 100%
  // onto edgeY(z) at u = 1 with zero V-notch, curves organically from the northern cliff
  // out to the Pleamar trail tip (-24.5), and shares SAL4_Tidal_Backland_Stone.material!
  {
    const cols = 38;
    const rows = 32;
    const minZ = 60.5;
    const maxZ = 114.5;

    const cliffVerts: Array<{ x: number; y: number; z: number; r: number; g: number; b: number }> = [];
    const cliffSource = scene.getMeshByName('SAL4_Tidal_Backland_Stone') as Mesh | null;
    const cliffMeshes = ['SAL4_Tidal_Backland_Stone', 'SAL1_Ledge_Talus_01']
      .map(name => scene.getMeshByName(name))
      .filter((m): m is Mesh => m instanceof Mesh && m.isEnabled());

    for (const cm of cliffMeshes) {
      const pos = cm.getVerticesData('position');
      const col = cm.getVerticesData('color');
      const wm = cm.computeWorldMatrix(true);
      const pt = new Vector3();
      if (pos) {
        for (let i = 0, j = 0; i < pos.length; i += 3, j += 4) {
          Vector3.TransformCoordinatesFromFloatsToRef(pos[i]!, pos[i + 1]!, pos[i + 2]!, wm, pt);
          if (pt.x < 1.5 && pt.y > -0.8 && pt.z >= 58.0 && pt.z <= 114.0) {
            cliffVerts.push({
              x: pt.x,
              y: pt.y,
              z: pt.z,
              r: col?.[j] ?? 0.86,
              g: col?.[j + 1] ?? 0.88,
              b: col?.[j + 2] ?? 0.87
            });
          }
        }
      }
    }

    const sampleWesternCutEdge = (z: number) => {
      let minWx = Infinity;
      for (const v of cliffVerts) {
        if (Math.abs(v.z - z) <= 2.8 && v.y > 0.25 && v.x < minWx) {
          minWx = v.x;
        }
      }
      if (!Number.isFinite(minWx)) {
        const fallbackY = Math.max(0.54, Math.min(11.8, (98.5 - z) * 0.34));
        return { x: -9.5, y: fallbackY, r: 0.86, g: 0.88, b: 0.87 };
      }
      let best = { x: minWx, y: 0.54, r: 0.86, g: 0.88, b: 0.87 };
      let maxWy = -Infinity;
      for (const v of cliffVerts) {
        if (Math.abs(v.z - z) <= 2.8 && v.x <= minWx + 1.9 && v.y > maxWy) {
          maxWy = v.y;
          best = v;
        }
      }
      return best;
    };

    const rawPositions: number[] = [];
    const rawNormals: number[] = [];
    const rawUvs: number[] = [];
    const rawColors: number[] = [];
    const rawIndices: number[] = [];

    for (let r = 0; r <= rows; r++) {
      const v = r / rows;
      const z = minZ + v * (maxZ - minZ);
      const edge = sampleWesternCutEdge(z);

      // North of the trail (z < 98.5), span strictly from curved outer coastline rowMinX(z)
      // to edge.x + 0.28 so we NEVER overlap SAL4 or SAL1 east of edge.x!
      // South of the trail (z >= 97.5), bridge across x = -4..6.8 to seal the pocket behind R3_Tree_2!
      const southBlend = smoothstep(97.2, 100.8, z);
      const rowMaxX = (edge.x + 0.28) * (1 - southBlend) + 6.8 * southBlend;

      // Outer western coastline sweeps naturally from edge.x - 1.8 at z = 60.5
      // out to -24.6 around the Pleamar trail headland (z = 96..104)
      const headlandSweep = smoothstep(60.5, 92.0, z);
      const rowMinX = (edge.x - 1.8) * (1 - headlandSweep) + (-24.6) * headlandSweep;

      for (let c = 0; c <= cols; c++) {
        const u = c / cols;
        const x = rowMinX + u * (rowMaxX - rowMinX);
        const trailZ = samplePleamarLowTrailZ(x);
        const dz = z - trailZ;

        const ridge1 = 1.0 - Math.abs(Math.sin(x * 0.48 + z * 0.36));
        const ridge2 = 1.0 - Math.abs(Math.cos(x * 0.82 - z * 0.54));
        const strata = (ridge1 - 0.5) * 0.52 + (ridge2 - 0.5) * 0.32 + Math.sin(x * 1.4 + z * 1.1) * 0.08;

        let y = 0.52;
        if (dz < -1.0) {
          // u = 1 is at the eastern seam (edge.x + 0.28), u = 0 is at the outer sea edge (rowMinX)
          // Lock 100% onto edge.y at u = 1 (zero V-notch!) and slope smoothly down to the sea at u = 0!
          const seamU = clamp01((x - rowMinX) / Math.max(0.8, edge.x - rowMinX));
          const slopeProfile = Math.pow(seamU, 1.35);
          const targetCliffY =
            0.52 + (edge.y - 0.52) * slopeProfile + strata * Math.sin(seamU * Math.PI) * 0.78;
          const seaEdgeDrop = smoothstep(0.0, 0.14, seamU);
          const easternTuck = x > edge.x + 0.08 ? -0.05 : seamU > 0.92 ? 0.03 : 0.0;
          y = -0.95 * (1 - seaEdgeDrop) + targetCliffY * seaEdgeDrop + easternTuck;
        } else if (dz <= 1.2) {
          y = 0.495 + Math.sin(x * 0.8) * 0.012;
          if (x < -21.2) {
            const tip = clamp01((-21.2 - x) / 3.4);
            y = y * (1 - tip) - 1.25 * tip;
          }
        } else {
          const meadowBridge = smoothstep(-13.0, -1.0, x);
          const outerShoreZ = trailZ + 3.6 + meadowBridge * 9.6;
          if (z <= outerShoreZ) {
            const tShelf = clamp01((z - (trailZ + 1.2)) / Math.max(1.4, outerShoreZ - (trailZ + 1.2)));
            const targetEdgeY = meadowBridge > 0.5 ? 0.22 : 0.16;
            y = 0.495 * (1 - tShelf) + targetEdgeY * tShelf + strata * 0.12 * (1 - tShelf * 0.5);
          } else {
            const tDrop = clamp01((z - outerShoreZ) / 3.5);
            y = 0.16 - tDrop * 1.85;
          }
          if (x >= 0.4 && z >= 103.0) {
            y = Math.min(y, 0.20);
          }
          if (x < -21.2) {
            const tip = clamp01((-21.2 - x) / 3.4);
            y = y * (1 - tip) - 1.25 * tip;
          }
        }

        rawPositions.push(x, y, z);
        rawUvs.push(x / 3.3, (z - y * 0.72) / 3.3);

        // Match SAL4/SAL1's exact vertex color at the seam, with subtle tidal darkening near water
        const wet = 1.0 - 0.14 * clamp01((1.6 - y) / 2.0);
        const micro = 0.98 + 0.02 * Math.sin(x * 0.15 + z * 0.11);
        rawColors.push(edge.r * wet * micro, edge.g * wet * micro, edge.b * wet * micro, 1.0);
      }
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const p1 = r * (cols + 1) + c;
        const p2 = p1 + 1;
        const p3 = (r + 1) * (cols + 1) + c;
        const p4 = p3 + 1;
        rawIndices.push(p1, p3, p2);
        rawIndices.push(p2, p3, p4);
      }
    }

    VertexData.ComputeNormals(rawPositions, rawIndices, rawNormals);
    const headlandMesh = new Mesh('retreat:cliff-buttress-seal-0', scene);
    const headlandData = new VertexData();
    headlandData.positions = rawPositions;
    headlandData.indices = rawIndices;
    headlandData.normals = rawNormals;
    headlandData.uvs = rawUvs;
    headlandData.colors = rawColors;
    headlandData.applyToMesh(headlandMesh, true);
    headlandMesh.useVertexColors = true;
    headlandMesh.hasVertexAlpha = false;
    headlandMesh.material = cliffSource?.material ?? cliffMaterial;
    setAmbientMetadata(headlandMesh);
    headlandMesh.metadata = {
      ...headlandMesh.metadata,
      permanentBackdrop: true,
      preferDistantMaterial: true
    };
    for (const light of scene.lights) {
      if (light instanceof PointLight) {
        light.excludedMeshes.push(headlandMesh);
      }
    }

    // =========================================================================
    // SECTION 6B: North Mountain Cliff Continuation Behind Beach & Ascent Stairs
    // (Seals the inland sea trench at X = 13.6..66.5, Z = 81.5..108.0 and adds
    //  Zona 2 stair curbs, post plinths, cliffside flora, and guide lanterns)
    // =========================================================================
    const ascentCliffVerts: { x: number; y: number; z: number; r: number; g: number; b: number }[] = [];
    for (const name of [
      'SAL4_Tidal_Backland_Stone',
      'SAL1_Ledge_Talus_02',
      'SAL1_Ledge_Talus_03',
      'SAL1_Ledge_Talus_04',
      'SAL1_Ledge_Talus_05',
      'SAL1_Ledge_Talus_06',
      'SAL1_Ledge_Talus_07',
      'a1:bedrock-partition:0'
    ]) {
      const m = scene.getMeshByName(name);
      const pos = m?.getVerticesData('position');
      const col = m?.getVerticesData('color');
      if (m && pos) {
        const wm = m.computeWorldMatrix(true);
        const pt = new Vector3();
        for (let i = 0, j = 0; i < pos.length; i += 3, j += 4) {
          Vector3.TransformCoordinatesFromFloatsToRef(pos[i]!, pos[i + 1]!, pos[i + 2]!, wm, pt);
          if (pt.x >= 8.0 && pt.x <= 72.0 && pt.y > 0.2 && pt.z >= 74.0 && pt.z <= 110.0) {
            ascentCliffVerts.push({
              x: pt.x,
              y: pt.y,
              z: pt.z,
              r: col?.[j] ?? 0.86,
              g: col?.[j + 1] ?? 0.88,
              b: col?.[j + 2] ?? 0.87
            });
          }
        }
      }
    }

    const sampleNorthCliffSeam = (
      x: number
    ): { x: number; y: number; r: number; g: number; b: number } => {
      // Between X=32 and X=46 (below A5 Temple), SAL1_Ledge_Talus_05 ended at Z=61.5,
      // so bridge smoothly between SAL1_Ledge_Talus_04 (X=32) and SAL1_Ledge_Talus_06 (X=46)
      if (x > 32.0 && x < 46.0) {
        const t = (x - 32.0) / 14.0;
        const left = sampleNorthCliffSeam(31.8);
        const right = sampleNorthCliffSeam(46.2);
        return {
          x,
          y: left.y * (1 - t) + right.y * t,
          r: left.r * (1 - t) + right.r * t,
          g: left.g * (1 - t) + right.g * t,
          b: left.b * (1 - t) + right.b * t
        };
      }
      let bestScore = Infinity;
      let best = {
        x,
        y: 12.0 + (x - 14.0) * 0.22,
        r: 0.86,
        g: 0.88,
        b: 0.87
      };
      for (const v of ascentCliffVerts) {
        if (v.z >= 75.0 && v.z <= 86.5 && Math.abs(v.x - x) <= 4.5 && v.y > 2.5) {
          const score = Math.abs(v.x - x) + Math.abs(v.z - 82.0) * 0.5;
          if (score < bestScore) {
            bestScore = score;
            best = v;
          }
        }
      }
      return best;
    };

    const sampleWesternSal4Surface = (x: number, z: number, fallbackY: number): number => {
      let bestDistSq = Infinity;
      let bestY = fallbackY;
      for (const v of ascentCliffVerts) {
        const dx = v.x - x;
        const dz = v.z - z;
        const dSq = dx * dx + dz * dz;
        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          bestY = v.y;
        }
      }
      return bestDistSq <= 16.0 ? bestY : fallbackY;
    };

    const sampleSouthToe = (x: number): { z: number; maxZ: number; y: number } => {
      // Smoothly wraps from behind R3_Tree_3 (X=14..18, Z=106.2) along the north edge
      // of CANON_Global_beach_walkable-floor, A1_APPROACH_floor-shore, and all 4 stair flights/landings.
      // Keep maxZ at 108.35 across X=18..34 so A1_APPROACH_floor-shore (Z=106.5..114) has zero corner gap at X=24!
      if (x < 18.0) {
        const t = smoothstep(13.6, 18.0, x);
        const z = 105.6 * (1 - t) + 107.85 * t;
        return { z, maxZ: z + 0.45, y: 0.20 };
      }
      if (x < 23.9) {
        return { z: 107.85, maxZ: 108.35, y: 0.22 };
      }
      if (x < 30.0) {
        return { z: 106.42, maxZ: 108.35, y: 0.22 };
      }
      if (x < 33.9) {
        const t = clamp01((x - 30.0) / 4.5);
        return { z: 107.78, maxZ: 108.35, y: 0.22 + t * 1.15 };
      }
      if (x < 34.5) {
        const t = smoothstep(33.9, 34.5, x);
        const z = 107.78 * (1 - t) + 104.82 * t;
        return { z, maxZ: z + 0.45, y: 1.25 + t * 0.12 };
      }
      if (x < 44.4) {
        const t = clamp01((x - 37.5) / 7.5);
        return { z: 104.82, maxZ: 105.35, y: 1.37 + t * 2.46 };
      }
      if (x < 45.0) {
        const t = smoothstep(44.4, 45.0, x);
        const z = 104.82 * (1 - t) + 101.82 * t;
        return { z, maxZ: z + 0.45, y: 3.72 + t * 0.12 };
      }
      if (x < 54.9) {
        const t = clamp01((x - 48.0) / 7.5);
        return { z: 101.82, maxZ: 102.35, y: 3.84 + t * 2.48 };
      }
      if (x < 55.5) {
        const t = smoothstep(54.9, 55.5, x);
        const z = 101.82 * (1 - t) + 98.82 * t;
        return { z, maxZ: z + 0.45, y: 6.22 + t * 0.12 };
      }
      if (x < 65.3) {
        const t = clamp01((x - 58.5) / 7.5);
        return { z: 98.82, maxZ: 99.35, y: 6.34 + t * 2.50 };
      }
      const t = smoothstep(65.3, 66.1, x);
      const z = 98.82 * (1 - t) + 91.35 * t;
      return { z, maxZ: z + 0.45, y: 8.84 };
    };

    const aCols = 76;
    const aRows = 38;
    const aMinX = 12.2;
    const aMaxX = 66.5;
    const aNorthZ = 75.2;

    const northProfile: { y: number; r: number; g: number; b: number }[] = [];
    for (let c = 0; c <= aCols; c++) {
      const x = aMinX + (c / aCols) * (aMaxX - aMinX);
      const s = sampleNorthCliffSeam(x);
      northProfile.push({ y: s.y, r: s.r, g: s.g, b: s.b });
    }
    for (let pass = 0; pass < 4; pass++) {
      for (let c = 1; c < aCols; c++) {
        northProfile[c]!.y =
          (northProfile[c - 1]!.y + northProfile[c]!.y * 2 + northProfile[c + 1]!.y) * 0.25;
      }
    }

    const aPositions: number[] = [];
    const aNormals: number[] = [];
    const aUvs: number[] = [];
    const aColors: number[] = [];
    const aIndices: number[] = [];

    for (let r = 0; r <= aRows; r++) {
      const v = r / aRows; // v = 0 at north cliff seam (Z=75.2), v = 1 at south toe behind stairs/landing
      for (let c = 0; c <= aCols; c++) {
        const u = c / aCols;
        const x = aMinX + u * (aMaxX - aMinX);
        const north = northProfile[c]!;
        const south = sampleSouthToe(x);
        const maxZ = south.maxZ;
        const z = aNorthZ + v * (maxZ - aNorthZ);

        // Basalt strata & faceted rock relief
        const r1 = 1.0 - Math.abs(Math.sin(x * 0.44 + z * 0.38));
        const r2 = 1.0 - Math.abs(Math.cos(x * 0.78 - z * 0.52));
        const strata = (r1 - 0.5) * 0.58 + (r2 - 0.5) * 0.34 + Math.sin(x * 1.3 + z * 1.1) * 0.09;

        const effV = clamp01((z - aNorthZ) / Math.max(1.0, south.z - aNorthZ));
        const cliffFactor = Math.pow(1.0 - effV, 0.85);
        const midRelief = strata * Math.sin(effV * Math.PI) * 0.95;
        let y = south.y + (north.y - south.y) * cliffFactor + midRelief;

        // Tuck any vertex south of south.z (e.g. under A1_APPROACH_floor-shore Z=106.42..108.35) cleanly below the slab
        if (z > south.z - 0.15) {
          const tuck = smoothstep(south.z - 0.15, south.z + 0.15, z);
          y = y * (1 - tuck) + (south.y - 0.14) * tuck;
        }
        // Blend the western flank (x = 12.2..19.5) smoothly into SAL4_Tidal_Backland_Stone and the upper Pleamar landing
        if (x < 19.5) {
          const westBlend = smoothstep(12.2, 19.5, x);
          const sal4Y =
            z > 90.0 && x < 15.2
              ? 0.24
              : Math.min(y, sampleWesternSal4Surface(x, z, south.y + (1.0 - effV) * 7.5));
          y = sal4Y * (1 - westBlend) + y * westBlend;
        }

        aPositions.push(x, y, z);
        // Continuous slope-compensated UV (never switches axis at ny=0.5, eliminating vertical streaks!)
        aUvs.push(x / 3.3, (z - y * 0.72) / 3.3);

        const wet = 1.0 - 0.12 * clamp01((1.6 - y) / 2.0);
        const micro = 0.98 + 0.02 * Math.sin(x * 0.17 + z * 0.13);
        aColors.push(north.r * wet * micro, north.g * wet * micro, north.b * wet * micro, 1.0);
      }
    }

    for (let r = 0; r < aRows; r++) {
      for (let c = 0; c < aCols; c++) {
        const p1 = r * (aCols + 1) + c;
        const p2 = p1 + 1;
        const p3 = (r + 1) * (aCols + 1) + c;
        const p4 = p3 + 1;
        aIndices.push(p1, p3, p2);
        aIndices.push(p2, p3, p4);
      }
    }

    VertexData.ComputeNormals(aPositions, aIndices, aNormals);
    const ascentCliffMesh = new Mesh('retreat:cliff-buttress-seal-ascent', scene);
    const ascentCliffData = new VertexData();
    ascentCliffData.positions = aPositions;
    ascentCliffData.indices = aIndices;
    ascentCliffData.normals = aNormals;
    ascentCliffData.uvs = aUvs;
    ascentCliffData.colors = aColors;
    ascentCliffData.applyToMesh(ascentCliffMesh, true);
    ascentCliffMesh.useVertexColors = true;
    ascentCliffMesh.hasVertexAlpha = false;
    ascentCliffMesh.material = cliffSource?.material ?? cliffMaterial;
    setAmbientMetadata(ascentCliffMesh);
    ascentCliffMesh.metadata = {
      ...ascentCliffMesh.metadata,
      permanentBackdrop: true,
      preferDistantMaterial: true
    };
    for (const light of scene.lights) {
      if (light instanceof PointLight) {
        light.excludedMeshes.push(ascentCliffMesh);
      }
    }

    // Carved stone curb stringers & post plinths along Zona 2 staircase flights (A1_APPROACH)
    const stairPavingMat =
      scene.getMaterialByName('style-v1:zones:paving:retreat:pbr:paving') ??
      scene.getMaterialByName('retreat:pbr:paving') ??
      cliffMaterial;
    const flightCurbSpecs = [
      // Flight 3 (X=30..34.5, Y=0.25..1.40, Z=108..111)
      { id: 'f3-n', x0: 30.0, y0: 0.28, z0: 107.92, x1: 34.5, y1: 1.42, z1: 107.92 },
      { id: 'f3-s', x0: 30.0, y0: 0.28, z0: 111.08, x1: 34.5, y1: 1.42, z1: 111.08 },
      // Flight 2 (X=37.5..45.0, Y=1.40..3.88, Z=105..108)
      { id: 'f2-n', x0: 37.5, y0: 1.42, z0: 104.92, x1: 45.0, y1: 3.90, z1: 104.92 },
      { id: 'f2-s', x0: 37.5, y0: 1.42, z0: 108.08, x1: 45.0, y1: 3.90, z1: 108.08 },
      // Flight 1 (X=48.0..55.5, Y=3.88..6.38, Z=102..105)
      { id: 'f1-n', x0: 48.0, y0: 3.90, z0: 101.92, x1: 55.5, y1: 6.40, z1: 101.92 },
      { id: 'f1-s', x0: 48.0, y0: 3.90, z0: 105.08, x1: 55.5, y1: 6.40, z1: 105.08 },
      // Flight 0 (X=58.5..66.0, Y=6.38..8.88, Z=99..102)
      { id: 'f0-n', x0: 58.5, y0: 6.40, z0: 98.92, x1: 66.0, y1: 8.90, z1: 98.92 },
      { id: 'f0-s', x0: 58.5, y0: 6.40, z0: 102.08, x1: 66.0, y1: 8.90, z1: 102.08 }
    ];
    for (const c of flightCurbSpecs) {
      const dx = c.x1 - c.x0;
      const dy = c.y1 - c.y0;
      const len = Math.hypot(dx, dy);
      const curb = MeshBuilder.CreateBox(
        `retreat:ascent-curb-${c.id}`,
        { width: len, height: 0.24, depth: 0.26 },
        scene
      );
      curb.position.set((c.x0 + c.x1) * 0.5, (c.y0 + c.y1) * 0.5 - 0.04, c.z0);
      curb.rotation.z = Math.atan2(dy, dx);
      curb.material = stairPavingMat;
      worldSurfaceUV(curb, 2.2);
      setAmbientMetadata(curb);
    }

    // Multi-leaf coastal botanical clusters along the base of the north cliff wall
    const ascentTalusSpecs = [
      { x: 19.4, y: 0.22, z: 107.68, shrub: true },
      { x: 22.8, y: 0.22, z: 107.72, shrub: true },
      { x: 26.2, y: 0.22, z: 106.28, shrub: true },
      { x: 35.8, y: 1.36, z: 104.68, shrub: true },
      { x: 46.4, y: 3.84, z: 101.68, shrub: true },
      { x: 56.8, y: 6.34, z: 98.68, shrub: true }
    ];
    for (let i = 0; i < ascentTalusSpecs.length; i++) {
      const t = ascentTalusSpecs[i]!;
      if (t.shrub) {
        const bPos: number[] = [];
        const bNorm: number[] = [];
        const bCol: number[] = [];
        const bIdx: number[] = [];
        const rad = 0.52;
        for (let l = 0; l < 14; l++) {
          const ring = l < 8 ? 0 : 1;
          const ang = (l * Math.PI * 2) / (ring === 0 ? 8 : 6) + i * 0.7;
          const len = rad * (ring === 0 ? 0.95 : 0.65) * (0.85 + 0.2 * Math.sin(l * 2.3));
          const lift = rad * (ring === 0 ? 0.38 : 0.64);
          const w = 0.068;
          const dx = Math.cos(ang);
          const dz = Math.sin(ang);
          const k = bPos.length / 3;
          bPos.push(
            -dz * w, 0.01, dx * w,
            dz * w, 0.01, -dx * w,
            dx * len * 0.55 - dz * w * 0.6, lift * 0.75, dz * len * 0.55 + dx * w * 0.6,
            dx * len * 0.55 + dz * w * 0.6, lift * 0.75, dz * len * 0.55 - dx * w * 0.6,
            dx * len, lift * 0.45, dz * len
          );
          for (let v = 0; v < 5; v++) bNorm.push(0, 1, 0);
          bCol.push(
            0.22, 0.34, 0.18, 1,
            0.22, 0.34, 0.18, 1,
            0.34, 0.48, 0.25, 1,
            0.34, 0.48, 0.25, 1,
            0.44, 0.58, 0.31, 1
          );
          bIdx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2, k + 2, k + 3, k + 4);
        }
        const bush = new Mesh(`retreat:ascent-cliff-shrub-${i}`, scene);
        const bData = new VertexData();
        bData.positions = bPos;
        bData.normals = bNorm;
        bData.colors = bCol;
        bData.indices = bIdx;
        bData.applyToMesh(bush, true);
        bush.useVertexColors = true;
        bush.position.set(t.x + 0.18, t.y + 0.16, t.z + 0.16);
        bush.material = shrubMaterial;
        setAmbientMetadata(bush);
      }
    }

    // 3 Monastery Guide Lanterns along the Zona 2 Staircase Ascent
    let ascentBulbMat = scene.getMaterialByName('retreat:pbr:ascent-lantern-bulb') as PBRMaterial | null;
    if (!ascentBulbMat) {
      ascentBulbMat = new PBRMaterial('retreat:pbr:ascent-lantern-bulb', scene);
      ascentBulbMat.albedoColor = Color3.FromHexString('#ffd584');
      ascentBulbMat.emissiveColor = Color3.FromHexString('#ff9d2e');
      calibratePbr(ascentBulbMat, 0.25, 0.35);
    }
    const ascentLanternCoords = [
      { id: 'bottom', x: 30.15, y: 0.25, z: 107.72 },
      { id: 'mid', x: 45.35, y: 3.88, z: 101.72 },
      { id: 'top', x: 65.65, y: 8.88, z: 98.72 }
    ];
    for (const l of ascentLanternCoords) {
      const post = MeshBuilder.CreateCylinder(
        `retreat:ascent-lantern-post-${l.id}`,
        { height: 1.45, diameterTop: 0.11, diameterBottom: 0.14, tessellation: 8 },
        scene
      );
      post.position.set(l.x, l.y + 0.72, l.z);
      post.material = pierTimberMaterial;
      setAmbientMetadata(post);

      const arm = MeshBuilder.CreateBox(
        `retreat:ascent-lantern-arm-${l.id}`,
        { width: 0.08, height: 0.08, depth: 0.36 },
        scene
      );
      arm.position.set(l.x, l.y + 1.38, l.z + 0.14);
      arm.material = ironMaterial;
      setAmbientMetadata(arm);

      const cage = MeshBuilder.CreateCylinder(
        `retreat:ascent-lantern-cage-${l.id}`,
        { height: 0.26, diameterTop: 0.18, diameterBottom: 0.14, tessellation: 6 },
        scene
      );
      cage.position.set(l.x, l.y + 1.20, l.z + 0.28);
      cage.material = ironMaterial;
      setAmbientMetadata(cage);

      const bulb = MeshBuilder.CreateSphere(
        `retreat:ascent-lantern-bulb-${l.id}`,
        { diameter: 0.13, segments: 6 },
        scene
      );
      bulb.position.set(l.x, l.y + 1.20, l.z + 0.28);
      bulb.material = ascentBulbMat;
      setAmbientMetadata(bulb);
    }

    // =========================================================================
    // SECTION 6C: Zona 3 — A1: Celdas y Plaza (Portals, Benches, Planters & Interiors)
    // =========================================================================
    // 1. Reposition the two floating bench folded cloths (`a1:bench-folded-cloth`)
    //    from the courtyardSpread offset (104.25/113.25, 92.25) onto the actual
    //    canonical wooden campfire benches (105.75/111.75, 93.75, local 33.75/39.75, 21.75)
    for (const m of scene.meshes) {
      if (m instanceof Mesh && m.name === 'a1:bench-folded-cloth') {
        repositionedSceneMeshes.push({ mesh: m, pos: m.position.clone() });
        const isWest = m.position.x < 36.75;
        m.position.set(isWest ? 33.75 : 39.75, 0.64, 21.75);
        m.computeWorldMatrix(true);
      }
      // 2. Retire superseded flat mud-box strips along the south plaza walkway
      //    (replaced by the 14 sculpted stone R3 planters R3_A1_Trailing_Herbs_0..13)
      if (
        m instanceof Mesh &&
        m.isEnabled() &&
        (m.name === 'a1:static:a1:garden-soil-v5' ||
          m.name === 'a1:static:small-props_primitive3' ||
          m.name === 'a1:static:small-props_primitive4' ||
          m.name === 'E1_Cultivated_Plaza_West' ||
          m.name === 'E1_Cultivated_Plaza_East' ||
          /^P5_Cultivated_Herbs_\d+$/.test(m.name))
      ) {
        retiredSceneMeshes.push(m);
        m.setEnabled(false);
      }
    }

    // 3. Sculpted Architectural Portals, Timber Lintels, Stone Thresholds,
    //    Portal Sconces & Interior Cave Baseboards for All 6 Cells (A1 Rooms 1..6)
    const a1CellSpecs = [
      { id: 1, entryX: 81.75, x0: 76.5, x1: 84.0, z0: 82.5, z1: 88.5 },
      { id: 2, entryX: 90.75, x0: 87.0, x1: 93.0, z0: 76.5, z1: 88.5 },
      { id: 3, entryX: 101.25, x0: 96.0, x1: 105.0, z0: 79.5, z1: 88.5 },
      { id: 4, entryX: 111.75, x0: 108.0, x1: 117.0, z0: 78.0, z1: 88.5 },
      { id: 5, entryX: 122.25, x0: 120.0, x1: 124.5, z0: 76.5, z1: 88.5 },
      { id: 6, entryX: 131.25, x0: 127.5, x1: 136.5, z0: 78.0, z1: 88.5 }
    ];
    const carvedStoneMat =
      scene.getMaterialByName('style-v1:zones:basalt:retreat:pbr:carved') ??
      stairPavingMat;

    for (const cell of a1CellSpecs) {
      // Carved stone threshold slab across each cell doorway
      const thresh = MeshBuilder.CreateBox(
        `retreat:a1-portal-threshold-${cell.id}`,
        { width: 1.92, height: 0.065, depth: 0.82 },
        scene
      );
      thresh.position.set(cell.entryX, 9.032, 88.62);
      thresh.material = stairPavingMat;
      worldSurfaceUV(thresh, 2.2);
      setAmbientMetadata(thresh);

      // Beveled stone portal plinth blocks grounding the left and right jambs
      for (const side of [-1, 1]) {
        const plinth = MeshBuilder.CreateBox(
          `retreat:a1-portal-plinth-${cell.id}-${side > 0 ? 'R' : 'L'}`,
          { width: 0.64, height: 0.42, depth: 0.68 },
          scene
        );
        plinth.position.set(cell.entryX + side * 1.02, 9.21, 88.45);
        plinth.material = stairPavingMat;
        worldSurfaceUV(plinth, 2.2);
        setAmbientMetadata(plinth);
      }

      // Heavy weathered oak timber lintel beam + wrought-iron straps under the portal arch
      // (Fades with the portal cutaway when the player enters this cell)
      const lintelBeam = MeshBuilder.CreateBox(
        `retreat:a1-portal-lintel-${cell.id}`,
        { width: 2.38, height: 0.22, depth: 0.48 },
        scene
      );
      lintelBeam.position.set(cell.entryX, 11.58, 88.42);
      lintelBeam.material = pierTimberMaterial;
      worldSurfaceUV(lintelBeam, 2.0);
      setAmbientMetadata(lintelBeam);
      a1PortalCutawayMeshes.push({ roomId: cell.id, mesh: lintelBeam });

      for (const side of [-1, 1]) {
        const strap = MeshBuilder.CreateBox(
          `retreat:a1-portal-strap-${cell.id}-${side > 0 ? 'R' : 'L'}`,
          { width: 0.08, height: 0.25, depth: 0.52 },
          scene
        );
        strap.position.set(cell.entryX + side * 0.82, 11.58, 88.42);
        strap.material = ironMaterial;
        setAmbientMetadata(strap);
        a1PortalCutawayMeshes.push({ roomId: cell.id, mesh: strap });
      }

      // Exterior Wrought-Iron Monastery Portal Sconce beside each cell entrance
      const sconceX = cell.entryX - 1.18;
      const sconceY = 10.68;
      const sconceZ = 88.62;
      const sArm = MeshBuilder.CreateBox(
        `retreat:a1-portal-sconce-arm-${cell.id}`,
        { width: 0.07, height: 0.08, depth: 0.28 },
        scene
      );
      sArm.position.set(sconceX, sconceY, sconceZ + 0.12);
      sArm.material = ironMaterial;
      setAmbientMetadata(sArm);
      a1PortalCutawayMeshes.push({ roomId: cell.id, mesh: sArm });

      const sCage = MeshBuilder.CreateCylinder(
        `retreat:a1-portal-sconce-cage-${cell.id}`,
        { height: 0.24, diameterTop: 0.16, diameterBottom: 0.12, tessellation: 6 },
        scene
      );
      sCage.position.set(sconceX, sconceY - 0.14, sconceZ + 0.24);
      sCage.material = ironMaterial;
      setAmbientMetadata(sCage);
      a1PortalCutawayMeshes.push({ roomId: cell.id, mesh: sCage });

      const sBulb = MeshBuilder.CreateSphere(
        `retreat:a1-portal-sconce-bulb-${cell.id}`,
        { diameter: 0.11, segments: 6 },
        scene
      );
      sBulb.position.set(sconceX, sconceY - 0.14, sconceZ + 0.24);
      sBulb.material = ascentBulbMat;
      setAmbientMetadata(sBulb);
      a1PortalCutawayMeshes.push({ roomId: cell.id, mesh: sBulb });

      // Interior carved stone baseboards along the rear and side cave walls
      // (grounds the rough-hewn cave wall into the stone floor when inside the cell)
      const rearCurb = MeshBuilder.CreateBox(
        `retreat:a1-room-${cell.id}-baseboard-rear`,
        { width: cell.x1 - cell.x0 + 0.2, height: 0.26, depth: 0.34 },
        scene
      );
      rearCurb.position.set((cell.x0 + cell.x1) * 0.5, 9.12, cell.z0 + 0.12);
      rearCurb.material = carvedStoneMat;
      worldSurfaceUV(rearCurb, 2.5);
      setAmbientMetadata(rearCurb);
      rearCurb.isVisible = false;
      a1InteriorMeshes.push({ roomId: cell.id, mesh: rearCurb });

      for (const side of [-1, 1]) {
        const sideCurb = MeshBuilder.CreateBox(
          `retreat:a1-room-${cell.id}-baseboard-side-${side > 0 ? 'R' : 'L'}`,
          { width: 0.34, height: 0.26, depth: cell.z1 - cell.z0 - 0.8 },
          scene
        );
        sideCurb.position.set(
          side < 0 ? cell.x0 + 0.12 : cell.x1 - 0.12,
          9.12,
          (cell.z0 + cell.z1 - 0.8) * 0.5
        );
        sideCurb.material = carvedStoneMat;
        worldSurfaceUV(sideCurb, 2.5);
        setAmbientMetadata(sideCurb);
        sideCurb.isVisible = false;
        a1InteriorMeshes.push({ roomId: cell.id, mesh: sideCurb });
      }
    }

    // 4. West Plaza / Upper Stair Landing Balustrade & Gateway Lantern (X=66..75, Y=9.0, Z=91..100)
    const westCurb = MeshBuilder.CreateBox(
      'retreat:a1-west-plaza-curb',
      { width: 8.2, height: 0.24, depth: 0.32 },
      scene
    );
    westCurb.position.set(70.1, 9.04, 98.85);
    westCurb.material = stairPavingMat;
    worldSurfaceUV(westCurb, 2.2);
    setAmbientMetadata(westCurb);

    // Gateway lantern crowning the west plaza entrance post (X=73.45, Y=9.0, Z=91.25)
    const gwArm = MeshBuilder.CreateBox(
      'retreat:a1-west-gateway-arm',
      { width: 0.34, height: 0.08, depth: 0.08 },
      scene
    );
    gwArm.position.set(73.60, 10.22, 91.25);
    gwArm.material = ironMaterial;
    setAmbientMetadata(gwArm);

    const gwCage = MeshBuilder.CreateCylinder(
      'retreat:a1-west-gateway-cage',
      { height: 0.26, diameterTop: 0.18, diameterBottom: 0.14, tessellation: 6 },
      scene
    );
    gwCage.position.set(73.74, 10.04, 91.25);
    gwCage.material = ironMaterial;
    setAmbientMetadata(gwCage);

    const gwBulb = MeshBuilder.CreateSphere(
      'retreat:a1-west-gateway-bulb',
      { diameter: 0.13, segments: 6 },
      scene
    );
    gwBulb.position.set(73.74, 10.04, 91.25);
    gwBulb.material = ascentBulbMat;
    setAmbientMetadata(gwBulb);

    // Low coastal rock ledges under the cove neck (Y = 0.16..0.22, Z = 101.5..102.6)
    // Keeping the upper dirt landing (Z = 92..98, Y = 0.56) 100% clear!
    const buttressSpecs = [
      { name: 'retreat:cliff-buttress-seal-1', x: 8.2, y: 0.16, z: 101.8, w: 5.4, h: 0.62, d: 4.0, seed: 2.1 },
      { name: 'retreat:cliff-buttress-seal-2', x: 14.6, y: 0.16, z: 101.4, w: 5.2, h: 0.58, d: 3.8, seed: 4.7 },
      { name: 'retreat:cove-neck-ledge', x: 11.8, y: 0.18, z: 102.4, w: 6.6, h: 0.72, d: 4.6, seed: 6.3 }
    ];
    for (const b of buttressSpecs) {
      const rock = organicStone(scene, b.name, b.w, b.h, b.d, b.seed);
      rock.position.set(b.x, b.y, b.z);
      rock.material = cliffSource?.material ?? cliffMaterial;
      worldSurfaceUV(rock, 3.3);
      setAmbientMetadata(rock);
    }

    const neckBoulders = [
      { x: 9.8, y: 0.24, z: 102.8, w: 1.8, h: 0.64, d: 1.6, seed: 7.4 },
      { x: -3.2, y: 0.44, z: 108.2, w: 2.4, h: 0.92, d: 2.1, seed: 10.2 },
      { x: -8.6, y: 0.40, z: 108.8, w: 2.2, h: 0.85, d: 1.9, seed: 11.6 },
      { x: -14.2, y: 0.38, z: 105.6, w: 2.1, h: 0.82, d: 1.8, seed: 13.1 }
    ];
    for (let i = 0; i < neckBoulders.length; i++) {
      const nb = neckBoulders[i]!;
      const crag = organicStone(scene, `retreat:headland-crag-${i}`, nb.w, nb.h, nb.d, nb.seed);
      crag.position.set(nb.x, nb.y, nb.z);
      crag.material = cliffSource?.material ?? cliffMaterial;
      worldSurfaceUV(crag, 3.3);
      setAmbientMetadata(crag);
    }

    const foamSkirtCoords: Vector3[] = [];
    for (let i = 0; i <= 24; i++) {
      const u = i / 24;
      const x = 0.5 - u * 22.0;
      const trailZ = samplePleamarLowTrailZ(x);
      const meadowBridge = smoothstep(-13.0, -1.0, x);
      const z = trailZ + 3.7 + meadowBridge * 9.8 + Math.sin(u * Math.PI * 3) * 0.35;
      foamSkirtCoords.push(new Vector3(x, 0.11, z));
    }
    const cliffSurfMesh = MeshBuilder.CreateTube(
      'retreat:cliff-base-foam-skirt',
      { path: foamSkirtCoords, radius: 0.26, tessellation: 6 },
      scene
    );
    const foamMat = scene.getMaterialByName('a1:shore-wash-v2') ?? wetSandMaterial;
    cliffSurfMesh.material = foamMat;
    setAmbientMetadata(cliffSurfMesh, true);
    stats.cliffSealed = true;
  }

  // ===========================================================================
  // SECTION 7: Atmospheric Pleamar Low Coastal Trail (X = 10.6 down to -15.8)
  // ===========================================================================
  {
    const guidepostPoints = [
      { x: 10.6, y: 0.56, z: 96.2 },
      { x: 7.4, y: 0.56, z: 98.6 },
      { x: 3.4, y: 0.56, z: 102.8 },
      { x: -1.2, y: 0.56, z: 105.0 },
      { x: -6.2, y: 0.56, z: 106.8 },
      { x: -11.2, y: 0.56, z: 106.5 },
      { x: -15.8, y: 0.56, z: 103.8 }
    ];

    const ropePath: Vector3[] = [];

    for (let i = 0; i < guidepostPoints.length; i++) {
      const gp = guidepostPoints[i]!;
      const post = MeshBuilder.CreateCylinder(
        `retreat:trail-guidepost-${i}`,
        { height: 1.05, diameterTop: 0.12, diameterBottom: 0.15, tessellation: 7 },
        scene
      );
      post.position.set(gp.x, gp.y + 0.48, gp.z);
      post.material = pierTimberMaterial;
      setAmbientMetadata(post);
      stats.trailGuideposts++;

      ropePath.push(new Vector3(gp.x, gp.y + 0.88, gp.z));

      if (i === 2) {
        const trailLanternLight = new PointLight(
          'retreat:trail-lantern-light',
          new Vector3(gp.x, gp.y + 1.15, gp.z),
          scene
        );
        trailLanternLight.diffuse = Color3.FromHexString('#ff9e42');
        trailLanternLight.range = 9.0;
        trailLanternLight.intensity = 0.0;
        addedLights.push(trailLanternLight);
      }
    }

    const trailRopeMesh = MeshBuilder.CreateTube(
      'retreat:trail-safety-rope',
      { path: ropePath, radius: 0.022, tessellation: 6 },
      scene
    );
    trailRopeMesh.material = ropeMaterial;
    setAmbientMetadata(trailRopeMesh);

    for (let k = 0; k < 12; k++) {
      const u = k / 11;
      const tx = 11.2 - u * 25.5;
      const tz = samplePleamarLowTrailZ(tx) + Math.sin(k * 1.9) * 0.16;
      const ty = 0.555;

      const step = MeshBuilder.CreateBox(
        `retreat:trail-step-${k}`,
        { width: 0.58, height: 0.032, depth: 0.42 },
        scene
      );
      step.position.set(tx, ty, tz);
      step.rotation.y = k * 0.45;
      step.material = cliffMaterial;
      setAmbientMetadata(step);
    }
  }

  // ===========================================================================
  // SECTION 8: Dynamic Wave Surf & Submerged Pier Seabed Foundation
  // ===========================================================================
  let sandWashMesh: Mesh | null = null;
  const washPositions: number[] = [];
  const washColors: number[] = [];
  const sandWashBases: Array<{ x: number; z: number; phase: number; sample: any }> = [];

  if (sea && (sea as any).getVerticesData) {
    const foamMat =
      (scene.getMaterialByName('a1:shore-wash-v2') as StandardMaterial | null) ??
      (() => {
        const m = new StandardMaterial('retreat:fallback-surf-foam', scene);
        m.diffuseColor = Color3.FromHexString('#f2f7f7');
        m.emissiveColor = Color3.FromHexString('#4a6268');
        m.alpha = 0.65;
        m.backFaceCulling = false;
        return m;
      })();
    const sampler = (x: number, z: number) => retreatWaterSampler(sea as Mesh, x, z);

    if (foamMat && sampler) {
      const surfSampleCount = 26;
      const washIndices: number[] = [];

      for (let i = 0; i < surfSampleCount; i++) {
        const t = i / (surfSampleCount - 1);
        const x = 21.3 + t * 9.0;
        const arch = Math.sin(clamp01((x - 20.8) / 10.4) * Math.PI);
        const z = 115.75 + arch * 1.22;
        const phase = t * Math.PI * 2.2;
        const sample = sampler(x, z);

        sandWashBases.push({ x, z, phase, sample });

        const baseIdx = washPositions.length / 3;
        washPositions.push(x, 0.145, z - 0.42);
        washColors.push(0.96, 0.99, 0.99, 0.72);

        washPositions.push(x, 0.125, z + 0.42);
        washColors.push(0.96, 0.99, 0.99, 0.0);

        if (i < surfSampleCount - 1) {
          washIndices.push(baseIdx, baseIdx + 2, baseIdx + 1);
          washIndices.push(baseIdx + 1, baseIdx + 2, baseIdx + 3);
        }
      }

      sandWashMesh = new Mesh('retreat:beach-sand-surf', scene);
      const washData = new VertexData();
      washData.positions = washPositions;
      washData.colors = washColors;
      washData.indices = washIndices;
      const washNormals = new Array(washPositions.length).fill(0);
      for (let i = 1; i < washNormals.length; i += 3) washNormals[i] = 1;
      washData.normals = washNormals;
      washData.applyToMesh(sandWashMesh, true);
      sandWashMesh.useVertexColors = true;
      sandWashMesh.hasVertexAlpha = true;
      sandWashMesh.material = foamMat;
      setAmbientMetadata(sandWashMesh, true);
      stats.sandWashSamples = surfSampleCount;
    }
  }

  // Compact Seabed Foundation strictly under the pier pilings
  {
    const seabed = MeshBuilder.CreateGround(
      'retreat:shallow-seabed-bedrock',
      { width: 2.4, height: 3.2, subdivisions: 2 },
      scene
    );
    seabed.position.set(20.25, -1.65, 115.6);
    seabed.material = cliffMaterial;
    setAmbientMetadata(seabed);
    stats.shallowSeabedInstalled = true;
  }

  // ===========================================================================
  // SECTION 9: Frame Update, Late Material Sync & Clean Disposal
  // ===========================================================================
  let lastVersion = -1;
  function update(time: number, interior?: string | null) {
    if (scene.isDisposed) return;

    // Bind all rock & cliff meshes directly to the live material of SAL4_Tidal_Backland_Stone
    // (which switches between style-v1:zones:basalt:retreat:island-shared-low and PBR rock)
    const liveCliffMat = scene.getMeshByName('SAL4_Tidal_Backland_Stone')?.material;
    if (liveCliffMat) {
      for (const m of addedMeshes) {
        if (
          !m.isDisposed() &&
          m.material !== liveCliffMat &&
          /^retreat:(cliff-buttress-seal|cove-neck-ledge|headland-crag|stair-abutment-rock|beach-boulder)/.test(m.name)
        ) {
          m.material = liveCliffMat;
        }
      }
    }
    if (pierTimberMaterial && !pierTimberMaterial.albedoTexture) {
      const sampleOak =
        scene.getMaterialByName('style-v1:zones:oak:retreat:pbr:wood') ??
        scene.getMaterialByName('a1:oak-v5');
      copyCalibratedTextures(sampleOak, pierTimberMaterial);
    }
    if (grassMaterial && !grassMaterial.albedoTexture) {
      const sampleGrass =
        scene.getMaterialByName('style-v1:zones:grass:R3_Grass') ??
        scene.getMaterialByName('R3_Grass');
      copyCalibratedTextures(sampleGrass, grassMaterial);
    }

    // 1. Day / Night Dynamic Lighting (Farol del muelle y Farol del sendero)
    const clearColor = scene.clearColor;
    const isNight = clearColor.r < 0.15 && clearColor.b < 0.25;
    const isSunset = clearColor.r > 0.18 && clearColor.r < 0.45 && clearColor.b < 0.22;
    const targetIntensity = isNight ? 0.85 : isSunset ? 0.45 : 0.0;

    for (const light of addedLights) {
      if (light.isDisposed()) continue;
      if (targetIntensity > 0) {
        if (!light.isEnabled()) light.setEnabled(true);
        const flicker =
          Math.sin(time * 5.2 + light.position.x) * 0.04 +
          Math.cos(time * 8.7 + light.position.z) * 0.02;
        light.intensity = Math.max(0, targetIntensity + flicker);
      } else {
        light.intensity = 0.0;
        light.setEnabled(false);
      }
    }

    // 1B. Zona 3 (A1: Celdas y Plaza) Cutaway Sync & Warm Cave/Hearth Illumination
    const activeRoomMatch = interior?.match(/^room(\d+)$/);
    const activeRoomId = activeRoomMatch ? Number(activeRoomMatch[1]) : 0;

    for (const item of a1PortalCutawayMeshes) {
      if (!item.mesh.isDisposed()) {
        item.mesh.isVisible = item.roomId !== activeRoomId;
      }
    }
    for (const item of a1InteriorMeshes) {
      if (!item.mesh.isDisposed()) {
        item.mesh.isVisible = item.roomId === activeRoomId;
      }
    }

    // Keep the central plaza campfire, Astalagan's votive candles, and the occupied
    // excavated cave cell's torch & desk candle burning warmly by day and night!
    const plazaFireMesh = scene.getMeshByName('a1:plaza-fire');
    if (plazaFireMesh) {
      plazaFireMesh.visibility = 1.0;
    }
    const plazaFireLight = scene.getLightByName('a1:plaza-fire-light') as PointLight | null;
    if (plazaFireLight && !isNight) {
      plazaFireLight.intensity = 0.92 + Math.sin(time * 9.2) * 0.08;
    }
    const votiveFlameMesh = scene.getMeshByName('a1:statue-votive-flame');
    if (votiveFlameMesh) {
      votiveFlameMesh.visibility = 1.0;
    }
    const votiveLight = scene.getLightByName('a1:statue-votive-light') as PointLight | null;
    if (votiveLight && !isNight) {
      votiveLight.intensity = 0.48 + Math.sin(time * 7.5) * 0.03;
    }
    if (activeRoomId >= 1 && activeRoomId <= 6) {
      const torchFlame = scene.getMeshByName(`a1:room-${activeRoomId}:torch-flame`);
      if (torchFlame) torchFlame.visibility = 1.0;
      const candleFlame = scene.getMeshByName(`a1:room-${activeRoomId}:candle`);
      if (candleFlame) candleFlame.visibility = 1.0;
      const torchLight = scene.getLightByName(`a1:room-${activeRoomId}:torch-light`) as PointLight | null;
      if (torchLight && !isNight) {
        torchLight.intensity = 1.18 + Math.sin(time * 8.4 + activeRoomId) * 0.08;
      }
      const candleLight = scene.getLightByName(`a1:room-${activeRoomId}:candle-light`) as PointLight | null;
      if (candleLight && !isNight) {
        candleLight.intensity = 0.52 + Math.sin(time * 6.8 + activeRoomId) * 0.03;
      }
    }

    // 2. Dynamic Surf Wash Animation
    if (sandWashMesh && !sandWashMesh.isDisposed() && sea && (sea as any).getVerticesData) {
      const curVersion = sea.metadata?.coastalGeometryVersion ?? 0;
      if (curVersion !== lastVersion) {
        lastVersion = curVersion;
        const waterPositions = (sea as any).getVerticesData('position');
        if (waterPositions) {
          for (let i = 0; i < sandWashBases.length; i++) {
            const b = sandWashBases[i]!;
            const waterY = typeof b.sample === 'number' ? b.sample : b.sample(waterPositions);
            const surge = Math.sin(time * 1.35 + b.phase);
            washPositions[i * 6 + 1] = Math.max(0.135, waterY + 0.05 + Math.max(0, surge) * 0.03);
            const alpha = Math.max(0, Math.min(0.82, 0.40 + 0.42 * surge));
            washColors[i * 8 + 3] = alpha;
          }
          sandWashMesh.updateVerticesData('position', washPositions);
          sandWashMesh.updateVerticesData('color', washColors);
        }
      }
    }
  }

  function dispose() {
    for (const [m, mat] of originalMaterials) {
      if (!m.isDisposed()) m.material = mat;
    }
    for (const { mesh, pos } of repositionedSceneMeshes) {
      if (!mesh.isDisposed()) {
        mesh.position.copyFrom(pos);
        mesh.computeWorldMatrix(true);
      }
    }
    for (const m of retiredSceneMeshes) {
      if (!m.isDisposed()) m.setEnabled(true);
    }
    for (const m of addedMeshes) {
      if (!m.isDisposed()) m.dispose();
    }
    for (const l of addedLights) {
      if (!l.isDisposed()) l.dispose();
    }
  }

  return {
    meshes: addedMeshes,
    lanternLight,
    trailLights: addedLights,
    update,
    dispose,
    stats
  };
}
