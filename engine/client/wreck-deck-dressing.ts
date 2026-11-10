import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import { Vector3, Quaternion } from '@babylonjs/core/Maths/math.vector.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { Material } from '@babylonjs/core/Materials/material.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { TerrainDefinition } from '../shared/terrain.js';
import type { BaseTexture } from '@babylonjs/core/Materials/Textures/baseTexture.js';
import { WRECK_STRUCTURE as S, wreckBeamAt, wreckListHeight } from '../shared/wreck-structure.js';
import { wreckCabinAt } from './wreck-cabins.js';
import { worldSurfaceUV } from './diorama-kit.js';
import { weatheredBoneMaterial } from './wreck-bone-material.js';

/** Persistent storage key for map elements deposited by seagulls (bird droppings) */
const SEAGULL_POOP_STORAGE_KEY = 'dnd-wreck-gull-poop';

type StoredPoop = { x: number; y: number; z: number; r: number };

function loadStoredPoop(): StoredPoop[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(SEAGULL_POOP_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePoopToMap(poop: StoredPoop) {
  try {
    if (typeof localStorage === 'undefined') return;
    const list = loadStoredPoop();
    if (list.length >= 2) return; // at most 1 or 2 as requested
    list.push(poop);
    localStorage.setItem(SEAGULL_POOP_STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

/**
 * 50-year-old stranded shipwreck deck dressing:
 * - Rotting, splintered deck planks and 2 large rotted deck collapses revealing flooded C8 below.
 * - 6 overturned / split barrels with rusted hoops & moss, and 4 burst cargo crates.
 * - 2 full weathered sailor skeletons (skull, eye orbits, ribcage, spine, pelvis, femurs).
 * - Marine fauna:
 *    - 5 articulated rock crabs with animated idle & reactive scuttling/fleeing into cover when approached.
 *    - 4 seagulls perched on railings with animated head glances, reactive takeoff flight when approached,
 *      and occasional persistent droppings recorded as map elements.
 *    - 36 limpet & sea shells along scuppers.
 * - 4 hanging timbers swaying continuously in the wind, broken railings.
 * - Inoperable secondary companionway stair with ripped treads.
 */
export function buildWreckDeckDressing(scene: Scene, terrain: TerrainDefinition, wood?: BaseTexture) {
  const groups = new Map<string, Mesh[]>();
  const animatedMeshes: Mesh[] = [];
  const materials = new Map<string, StandardMaterial>();

  const paint = (id: string, hex: string, roughness = 0.8) => {
    const m = new StandardMaterial(`wreck-dressing:${id}`, scene);
    m.diffuseColor = Color3.FromHexString(hex);
    m.specularColor = Color3.FromHexString('#141816');
    m.specularPower = Math.round((1 - roughness) * 64) + 4;
    m.backFaceCulling = false;
    materials.set(id, m);
    return m;
  };

  const moss = paint('wet-algae', '#3e5940', 0.95);
  const rot = paint('split-black-wood', '#574d39', 0.85);
  const rope = paint('abandoned-rope', '#746b4f', 0.9);
  const leather = paint('old-boots', '#423a2a', 0.8);
  const blood = paint('recent-blood', '#462321', 0.6);
  const iron = paint('rusted-iron', '#282a27', 0.7);
  const crabMat = paint('crab-chitin', '#6d3c26', 0.5);
  const crabEyeMat = paint('crab-eye', '#1a1410', 0.2);
  const shellMat = paint('sea-shell', '#cdc7b8', 0.6);
  const voidMat = paint('hold-void', '#080c0d', 1.0);
  const gullBody = paint('gull-body', '#e0e4e6', 0.75);
  const gullWing = paint('gull-wing', '#505a60', 0.75);
  const gullBeak = paint('gull-beak', '#d18617', 0.5);
  const guanoMat = paint('gull-guano', '#edf0f2', 0.95);
  guanoMat.specularColor = Color3.FromHexString('#1c201e');
  const bone = weatheredBoneMaterial(scene, 'wreck-dressing:prey-bone', '#969080');

  rot.diffuseTexture = wood ?? null;

  // Procedural algae colony texture
  const size = 64, pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (x + .5) / size * 2 - 1, dz = (y + .5) / size * 2 - 1, r = Math.hypot(dx, dz);
    const grain = Math.sin(x * 1.8 + y * 2.3) * Math.cos(y * .91 - x * .83), i = (y * size + x) * 4;
    pixels[i] = 39 + Math.round((grain + 1) * 5);
    pixels[i + 1] = 52 + Math.round((grain + 1) * 8);
    pixels[i + 2] = 35 + Math.round((grain + 1) * 6);
    pixels[i + 3] = Math.round(Math.max(0, Math.min(1, (1 - r + grain * .14) * 3.2)) * (.5 + grain * .18) * 255);
  }
  const colony = RawTexture.CreateRGBATexture(pixels, size, size, scene, true, false, Texture.TRILINEAR_SAMPLINGMODE);
  colony.name = 'wreck:algae-colony';
  colony.hasAlpha = true;
  colony.wrapU = colony.wrapV = Texture.CLAMP_ADDRESSMODE;
  moss.diffuseTexture = colony;
  moss.diffuseColor = Color3.White();
  moss.useAlphaFromDiffuseTexture = true;
  moss.transparencyMode = Material.MATERIAL_ALPHABLEND;
  moss.alpha = .9;
  moss.zOffset = -1;

  const add = (mesh: Mesh, surface: string, kind: string, mat: StandardMaterial) => {
    mesh.material = mat;
    mesh.receiveShadows = true;
    mesh.isPickable = false;
    mesh.metadata = { visualOnly: true, deckSurfaceId: surface, kind, canonicalDressing: true };
    const key = `${surface}:${kind}:${mat.name}`;
    const g = groups.get(key) ?? [];
    g.push(mesh);
    groups.set(key, g);
    return mesh;
  };

  const addSolo = (mesh: Mesh, surface: string, kind: string, mat: StandardMaterial) => {
    mesh.material = mat;
    mesh.receiveShadows = true;
    mesh.isPickable = false;
    mesh.metadata = { visualOnly: true, deckSurfaceId: surface, kind, canonicalDressing: true };
    animatedMeshes.push(mesh);
    return mesh;
  };

  const patch = (p: Vector3, rx: number, rz: number, surface: string, kind: string, mat: StandardMaterial, seed: number) => {
    const m = new Mesh(`wreck-dressing:${kind}`, scene);
    const d = new VertexData(), positions = [p.x, p.y + .012, p.z], indices: number[] = [], normals: number[] = [], colours = [.84, 1, .82, 1];
    for (let i = 0; i <= 16; i++) {
      const a = i / 16 * Math.PI * 2, r = .80 + .14 * Math.sin(a * 5 + seed) + .06 * Math.cos(a * 9);
      positions.push(p.x + Math.cos(a) * rx * r, p.y + .012 + Math.sin(a * 3 + seed) * .008, p.z + Math.sin(a) * rz * r);
      colours.push(.70 + (i % 3) * .1, .82 + (i % 2) * .1, .65, 1);
      if (i > 0) indices.push(0, i, i + 1);
    }
    d.uvs = [.5, .5];
    for (let i = 0; i <= 16; i++) {
      const a = i / 16 * Math.PI * 2;
      d.uvs.push(.5 + Math.cos(a) * .5, .5 + Math.sin(a) * .5);
    }
    Object.assign(d, { positions, indices, colors: colours });
    VertexData.ComputeNormals(positions, indices, normals);
    d.normals = normals.map((n, i) => i % 3 === 1 ? Math.abs(n) : n);
    d.applyToMesh(m);
    return add(m, surface, kind, mat);
  };

  // Helper to query runtime actor positions passed from WorldRenderer
  const getActorPositions = (): Vector3[] => {
    const list = (scene.metadata?.characterPositions as Vector3[]) ?? [];
    return list;
  };

  // 1. Existing moss, algae, split wood and ropes across deck tiles
  for (const surface of ['main', 'c2', 'c3']) {
    const tiles = terrain.surfaces.find(s => s.id === surface)?.tiles ?? [];
    for (let i = 0; i < tiles.length; i++) {
      const t = tiles[i]!;
      const x = (t.cell.col + .5) * 1.5, z = (t.cell.row + .5) * 1.5, lx = x - S.origin.x, lz = z - S.origin.z;
      if (t.kind === 'stair' || (surface === 'main' && wreckCabinAt(t.cell, 'main'))) continue;
      const edgeDistance = wreckBeamAt(lx) - Math.abs(lz), rail = edgeDistance < 2.2;
      if ((rail && i % 2 === 0) || i % 17 === 0) {
        const side = lz < 0 ? -1 : 1, p = new Vector3(x, (surface === 'main' ? 0 : 3) + wreckListHeight(z), z + side * .43);
        patch(p, .62 + (i % 4) * .18, .24 + (i % 3) * .07, surface, 'deck-algae', moss, i);
        if (i % 2 === 0) {
          const plank = MeshBuilder.CreateBox('wreck-dressing:raised-splinter', { width: .58 + (i % 4) * .16, height: .038, depth: .075 }, scene);
          plank.position.copyFrom(p).addInPlace(new Vector3(.08, .055, -side * .04));
          plank.rotation.y = .17 + Math.sin(i) * .32;
          plank.rotation.z = .07 * Math.sin(i);
          worldSurfaceUV(plank, 4.5);
          add(plank, surface, 'broken-deck-plank', rot);
        }
        if (rail && i % 7 === 0) {
          for (let k = 0; k < 4; k++) {
            const split = MeshBuilder.CreateTube('wreck-dressing:rotted-end-grain', {
              path: [p.add(new Vector3(-.32, k * .006, -.07 + k * .037)), p.add(new Vector3(.02, k * .006, .02 + k * .025)), p.add(new Vector3(.24 + .035 * k, k * .006, .01 + k * .027))],
              radius: .006, tessellation: 4
            }, scene);
            add(split, surface, 'weather-splits', leather);
          }
          const end = MeshBuilder.CreateCylinder('wreck-dressing:corroded-fastener', { height: .025, diameter: .047, tessellation: 6 }, scene);
          end.position.copyFrom(p).addInPlace(new Vector3(.22, .037, .055));
          add(end, surface, 'corroded-deck-iron', leather);
        }
      }
      if (rail && i % 29 === 0) {
        const p = new Vector3(x, (surface === 'main' ? 0 : 3) + wreckListHeight(z) + .03, z + (lz < 0 ? -.37 : .37));
        const path = Array.from({ length: 29 }, (_, n) => p.add(new Vector3(Math.cos(n * .44) * (.14 + n * .003), .006 * n / 29, Math.sin(n * .44) * (.14 + n * .003))));
        add(MeshBuilder.CreateTube('wreck-dressing:frayed-coil', { path, radius: .015, tessellation: 5 }, scene), surface, 'rope-coil', rope);
      }
    }
  }

  // 2. Canonical prey remains & boots
  const c = new Vector3(41.25, 0, 27.75);
  for (let i = 0; i < 3; i++) {
    const p = c.add(new Vector3((i - 1) * .48, wreckListHeight(c.z) + .045, (i % 2) * .30));
    const sole = MeshBuilder.CreateBox('wreck-dressing:boot-sole', { width: .31, height: .035, depth: .12 }, scene);
    sole.position.copyFrom(p);
    sole.rotation.y = i * .67;
    add(sole, 'main', 'canonical-boot', leather);
    const upper = MeshBuilder.CreateIcoSphere('wreck-dressing:boot-upper', { radius: 1, subdivisions: 1 }, scene);
    upper.scaling.set(.14, .075, .055);
    upper.position.copyFrom(p).addInPlace(new Vector3(-.025, .06, 0));
    add(upper, 'main', 'canonical-boot', leather);
    patch(p.add(new Vector3(.14, -.035, -.21)), .28, .095, 'main', 'canonical-blood', blood, i);
  }
  for (let i = 0; i < 9; i++) {
    const p = c.add(new Vector3(-.9 + (i % 3) * .45, wreckListHeight(c.z) + .045, .55 + Math.floor(i / 3) * .18));
    const path = [p, p.add(new Vector3(.20 + Math.sin(i) * .06, .018, .11))];
    add(MeshBuilder.CreateTube('wreck-dressing:prey-bone', { path, radius: .021, tessellation: 6, cap: Mesh.CAP_ALL }, scene), 'main', 'canonical-prey-remains', bone);
    for (const end of path) {
      const joint = MeshBuilder.CreateIcoSphere('wreck-dressing:prey-joint', { radius: .035, subdivisions: 1 }, scene);
      joint.position.copyFrom(end);
      add(joint, 'main', 'canonical-prey-remains', bone);
    }
  }

  // =========================================================================
  // 3. ROTTED DECK HOLES REVEALING LOWER DECK / FLOODED HOLD (C8)
  // 50-year-old organic collapse: jagged, splintered longitudinal strakes
  // terminating at irregular lengths, broken plank ends sagging downward
  // into the hold (18°–32°), heavy weathered transverse oak carlings underneath,
  // and dark flooded water at -3.15m visible below.
  // =========================================================================
  const holdWaterMat = paint('hold-flooded-water', '#071b22', 0.25);
  const oakBeamMat = paint('oak-master-carling', '#362b1e', 0.9);
  oakBeamMat.diffuseTexture = wood ?? null;

  // Hole 1: Midship-starboard on C1 (col 24-25, row 14)
  const hole1Center = new Vector3(37.5, wreckListHeight(21.0), 21.0);

  // Flooded hold water visible below at -3.15m
  const holdWater1 = MeshBuilder.CreateGround('wreck-dressing:hole-flooded-hold', { width: 3.2, height: 2.4 }, scene);
  holdWater1.position.set(hole1Center.x, -3.15, hole1Center.y);
  add(holdWater1, 'main', 'deck-hole-water', holdWaterMat);

  // Structural oak master carling / deck beam crossing transversely underneath at X = 37.2
  const masterBeam1 = MeshBuilder.CreateBox('wreck-dressing:hole1-master-beam', { width: 0.28, height: 0.35, depth: 2.35 }, scene);
  masterBeam1.position.set(37.2, hole1Center.y - 0.18, hole1Center.z);
  masterBeam1.rotation.z = -0.02;
  worldSurfaceUV(masterBeam1, 4.5);
  add(masterBeam1, 'main', 'deck-hole-framing', oakBeamMat);

  // Second broken carling stub on port side of the collapse
  const stubBeam1 = MeshBuilder.CreateBox('wreck-dressing:hole1-stub-beam', { width: 0.24, height: 0.32, depth: 0.95 }, scene);
  stubBeam1.position.set(38.6, hole1Center.y - 0.20, hole1Center.z - 0.70);
  stubBeam1.rotation.y = 0.08;
  stubBeam1.rotation.z = 0.06;
  worldSurfaceUV(stubBeam1, 4.5);
  add(stubBeam1, 'main', 'deck-hole-framing', oakBeamMat);

  // Broken deck strakes running longitudinally along X across the hole
  // Staggered breaks, splintered tips, and 4 drooping / sagging planks
  const strakeZOffsets1 = [-0.95, -0.70, -0.45, -0.22, 0.02, 0.25, 0.48, 0.72, 0.95];
  strakeZOffsets1.forEach((dz, sIdx) => {
    const strakeZ = hole1Center.z + dz;
    const strakeDeckY = wreckListHeight(strakeZ);

    // West side plank projecting into hole
    const westLen = 0.55 + ((sIdx * 7) % 5) * 0.16 + (sIdx % 2) * 0.12;
    const westX = hole1Center.x - 1.45 + westLen * 0.5;
    const isSaggingWest = sIdx === 1 || sIdx === 4 || sIdx === 6;
    const sagAngleWest = isSaggingWest ? -0.28 - (sIdx % 3) * 0.08 : -0.03;
    const sagDropWest = isSaggingWest ? Math.sin(Math.abs(sagAngleWest)) * westLen * 0.45 : 0;

    const westPlank = MeshBuilder.CreateBox(`wreck-dressing:hole1-west-strake:${sIdx}`, {
      width: westLen, height: 0.042, depth: 0.19
    }, scene);
    westPlank.position.set(westX, strakeDeckY - 0.02 - sagDropWest, strakeZ);
    westPlank.rotation.z = sagAngleWest;
    westPlank.rotation.y = (sIdx % 3 - 1) * 0.03;
    worldSurfaceUV(westPlank, 4.5);
    add(westPlank, 'main', 'deck-hole-opening', rot);

    // Jagged splintered tip on west plank
    const westTip = MeshBuilder.CreateCylinder(`wreck-dressing:hole1-west-tip:${sIdx}`, {
      diameterTop: 0.01, diameterBottom: 0.17, height: 0.22, tessellation: 4
    }, scene);
    westTip.position.set(westX + westLen * 0.5 + 0.08, strakeDeckY - 0.02 - sagDropWest * 1.5, strakeZ);
    westTip.rotation.z = 1.57 + sagAngleWest;
    add(westTip, 'main', 'deck-hole-splinters', rot);

    // East side plank projecting into hole
    const eastLen = 0.60 + ((sIdx * 11) % 6) * 0.14;
    const eastX = hole1Center.x + 1.45 - eastLen * 0.5;
    const isSaggingEast = sIdx === 2 || sIdx === 5;
    const sagAngleEast = isSaggingEast ? 0.32 + (sIdx % 2) * 0.07 : 0.02;
    const sagDropEast = isSaggingEast ? Math.sin(sagAngleEast) * eastLen * 0.42 : 0;

    const eastPlank = MeshBuilder.CreateBox(`wreck-dressing:hole1-east-strake:${sIdx}`, {
      width: eastLen, height: 0.042, depth: 0.19
    }, scene);
    eastPlank.position.set(eastX, strakeDeckY - 0.02 - sagDropEast, strakeZ);
    eastPlank.rotation.z = sagAngleEast;
    eastPlank.rotation.y = (sIdx % 2 === 0 ? 0.02 : -0.02);
    worldSurfaceUV(eastPlank, 4.5);
    add(eastPlank, 'main', 'deck-hole-opening', rot);

    // Splintered tip on east plank
    const eastTip = MeshBuilder.CreateCylinder(`wreck-dressing:hole1-east-tip:${sIdx}`, {
      diameterTop: 0.01, diameterBottom: 0.17, height: 0.20, tessellation: 4
    }, scene);
    eastTip.position.set(eastX - eastLen * 0.5 - 0.07, strakeDeckY - 0.02 - sagDropEast * 1.4, strakeZ);
    eastTip.rotation.z = -1.57 + sagAngleEast;
    add(eastTip, 'main', 'deck-hole-splinters', rot);

    // Wet rot & algae patch at break margin
    if (sIdx % 2 === 0) {
      patch(new Vector3(westX - westLen * 0.3, strakeDeckY, strakeZ), 0.35, 0.22, 'main', 'deck-hole-rot', moss, sIdx);
    }
  });

  // Hanging splintered shreds dangling down into C8 hold
  for (let sh = 0; sh < 5; sh++) {
    const shX = hole1Center.x - 0.5 + sh * 0.26;
    const shZ = hole1Center.z + (sh % 2 === 0 ? -0.4 : 0.4);
    const shPath = [
      new Vector3(shX, hole1Center.y - 0.04, shZ),
      new Vector3(shX + (sh % 2 === 0 ? 0.04 : -0.04), hole1Center.y - 0.35 - sh * 0.08, shZ + (sh % 2 === 0 ? 0.03 : -0.03)),
      new Vector3(shX + (sh % 2 === 0 ? 0.07 : -0.06), hole1Center.y - 0.72 - sh * 0.12, shZ + 0.01)
    ];
    const shred = MeshBuilder.CreateTube(`wreck-dressing:hole1-hanging-shred:${sh}`, {
      path: shPath, radius: 0.018 - sh * 0.002, tessellation: 4
    }, scene);
    add(shred, 'main', 'deck-hole-splinters', rot);
  }

  // Hole 2: Fore-transition area on C1 (col 30, row 11)
  const hole2Center = new Vector3(46.2, wreckListHeight(17.2), 17.2);

  // Flooded hold water visible below at -3.15m
  const holdWater2 = MeshBuilder.CreateGround('wreck-dressing:hole2-flooded-hold', { width: 2.6, height: 2.0 }, scene);
  holdWater2.position.set(hole2Center.x, -3.15, hole2Center.z);
  add(holdWater2, 'main', 'deck-hole-water', holdWaterMat);

  // Transverse oak carling beam crossing under Hole 2 at X = 46.0
  const masterBeam2 = MeshBuilder.CreateBox('wreck-dressing:hole2-master-beam', { width: 0.26, height: 0.32, depth: 1.85 }, scene);
  masterBeam2.position.set(46.0, hole2Center.y - 0.17, hole2Center.z);
  worldSurfaceUV(masterBeam2, 4.5);
  add(masterBeam2, 'main', 'deck-hole-framing', oakBeamMat);

  // Organic longitudinal strakes breaking across Hole 2
  const strakeZOffsets2 = [-0.70, -0.45, -0.22, 0.02, 0.25, 0.48, 0.70];
  strakeZOffsets2.forEach((dz, sIdx) => {
    const strakeZ = hole2Center.z + dz;
    const strakeDeckY = wreckListHeight(strakeZ);

    // West plank
    const westLen = 0.48 + ((sIdx * 5) % 4) * 0.15;
    const westX = hole2Center.x - 1.15 + westLen * 0.5;
    const isSagging = sIdx === 1 || sIdx === 3 || sIdx === 5;
    const sagAngle = isSagging ? -0.26 - (sIdx % 2) * 0.09 : -0.02;
    const sagDrop = isSagging ? Math.sin(Math.abs(sagAngle)) * westLen * 0.4 : 0;

    const westPlank = MeshBuilder.CreateBox(`wreck-dressing:hole2-west-strake:${sIdx}`, {
      width: westLen, height: 0.040, depth: 0.18
    }, scene);
    westPlank.position.set(westX, strakeDeckY - 0.02 - sagDrop, strakeZ);
    westPlank.rotation.z = sagAngle;
    worldSurfaceUV(westPlank, 4.5);
    add(westPlank, 'main', 'deck-hole-opening', rot);

    const westTip = MeshBuilder.CreateCylinder(`wreck-dressing:hole2-west-tip:${sIdx}`, {
      diameterTop: 0.01, diameterBottom: 0.15, height: 0.18, tessellation: 4
    }, scene);
    westTip.position.set(westX + westLen * 0.5 + 0.06, strakeDeckY - 0.02 - sagDrop * 1.4, strakeZ);
    westTip.rotation.z = 1.57 + sagAngle;
    add(westTip, 'main', 'deck-hole-splinters', rot);

    // East plank
    const eastLen = 0.52 + ((sIdx * 9) % 5) * 0.13;
    const eastX = hole2Center.x + 1.15 - eastLen * 0.5;
    const isSaggingEast = sIdx === 2 || sIdx === 4;
    const sagAngleEast = isSaggingEast ? 0.30 : 0.02;
    const sagDropEast = isSaggingEast ? Math.sin(sagAngleEast) * eastLen * 0.38 : 0;

    const eastPlank = MeshBuilder.CreateBox(`wreck-dressing:hole2-east-strake:${sIdx}`, {
      width: eastLen, height: 0.040, depth: 0.18
    }, scene);
    eastPlank.position.set(eastX, strakeDeckY - 0.02 - sagDropEast, strakeZ);
    eastPlank.rotation.z = sagAngleEast;
    worldSurfaceUV(eastPlank, 4.5);
    add(eastPlank, 'main', 'deck-hole-opening', rot);

    const eastTip = MeshBuilder.CreateCylinder(`wreck-dressing:hole2-east-tip:${sIdx}`, {
      diameterTop: 0.01, diameterBottom: 0.15, height: 0.17, tessellation: 4
    }, scene);
    eastTip.position.set(eastX - eastLen * 0.5 - 0.06, strakeDeckY - 0.02 - sagDropEast * 1.4, strakeZ);
    eastTip.rotation.z = -1.57 + sagAngleEast;
    add(eastTip, 'main', 'deck-hole-splinters', rot);
  });

  // =========================================================================
  // 4. OVERTURNED, BROKEN & SPLIT BARRELS WITH RUSTED HOOPS (6 BARRELS)
  // Perfectly grounded on deck: C1 uses wreckListHeight(Z), C2/C3 use 3 + list.
  // Staves and bottom edges firmly touch the wooden deck planks without hovering.
  // =========================================================================
  const barrelPositions = [
    // Barrel 1: C1 Midship starboard (upright rotted with moss)
    { p: new Vector3(43.5, wreckListHeight(23.2), 23.2), rot: 0.2, type: 'upright-rotted', surf: 'main' },
    // Barrel 2: C1 Midship port (toppled split with iron hoops)
    { p: new Vector3(38.8, wreckListHeight(16.5), 16.5), rot: 1.4, type: 'toppled-split', surf: 'main' },
    // Barrel 3: C1 Starboard boarding area (shattered staves)
    { p: new Vector3(45.2, wreckListHeight(22.8), 22.8), rot: -0.6, type: 'shattered', surf: 'main' },
    // Barrel 4: C2 Forecastle deck (X=60.5 > 55.5) firmly grounded on upper deck
    { p: new Vector3(60.5, 3.0 + wreckListHeight(22.5), 22.5), rot: 0.8, type: 'toppled-split', surf: 'c2' },
    // Barrel 5: C3 Quarterdeck (X=22.5 < 28.5) firmly grounded on upper deck
    { p: new Vector3(22.5, 3.0 + wreckListHeight(22.0), 22.0), rot: 0.1, type: 'upright-rotted', surf: 'c3' },
    // Barrel 6: C1 Port near mast (shattered flat staves)
    { p: new Vector3(34.8, wreckListHeight(17.0), 17.0), rot: 2.1, type: 'shattered', surf: 'main' }
  ];

  barrelPositions.forEach((b, idx) => {
    if (b.type === 'upright-rotted') {
      const staveHeight = 0.76;
      for (let s = 0; s < 10; s++) {
        if (s % 3 === 1) continue; // missing broken staves
        const a = (s / 10) * Math.PI * 2;
        const curHeight = staveHeight - (s % 2) * 0.18;
        const stave = MeshBuilder.CreateBox(`wreck-dressing:barrel-stave:${idx}:${s}`, {
          width: 0.14, height: curHeight, depth: 0.035
        }, scene);
        // Stave bottom rests firmly on deck (b.p.y):
        stave.position.set(b.p.x + Math.cos(a) * 0.36, b.p.y + curHeight * 0.5, b.p.z + Math.sin(a) * 0.36);
        stave.rotation.y = -a + 1.57;
        worldSurfaceUV(stave, 4.5);
        add(stave, b.surf, 'decayed-barrel', rot);
      }
      for (const h of [0.14, 0.58]) {
        const hoop = MeshBuilder.CreateTorus(`wreck-dressing:barrel-hoop:${idx}:${h}`, {
          diameter: 0.74, thickness: 0.022, tessellation: 12
        }, scene);
        hoop.position.set(b.p.x, b.p.y + h, b.p.z);
        add(hoop, b.surf, 'corroded-barrel-iron', iron);
      }
      patch(b.p.add(new Vector3(0.1, 0.015, 0)), 0.42, 0.35, b.surf, 'barrel-moss', moss, idx);
    } else if (b.type === 'toppled-split') {
      const barrelRadius = 0.34;
      // When toppled on its side, the bottom of the barrel staves rests on b.p.y:
      for (let s = 0; s < 10; s++) {
        const a = (s / 10) * Math.PI * 2;
        if (s > 6) continue; // upper staves smashed off
        const stave = MeshBuilder.CreateBox(`wreck-dressing:toppled-stave:${idx}:${s}`, {
          width: 0.13, height: 0.82, depth: 0.032
        }, scene);
        // Positioned so the lowest staves touch the deck surface:
        stave.position.set(
          b.p.x + Math.sin(a) * barrelRadius,
          b.p.y + barrelRadius + Math.cos(a) * (barrelRadius - 0.04),
          b.p.z
        );
        stave.rotation.x = 1.57;
        stave.rotation.z = a;
        worldSurfaceUV(stave, 4.5);
        add(stave, b.surf, 'decayed-barrel', rot);
      }
      const hoop = MeshBuilder.CreateTorus(`wreck-dressing:toppled-hoop:${idx}`, {
        diameter: 0.70, thickness: 0.02, tessellation: 12
      }, scene);
      hoop.position.set(b.p.x, b.p.y + barrelRadius, b.p.z + 0.28);
      hoop.rotation.x = 1.57;
      add(hoop, b.surf, 'corroded-barrel-iron', iron);
      patch(b.p.add(new Vector3(0, 0.012, 0.2)), 0.48, 0.32, b.surf, 'barrel-moss', moss, idx);
    } else {
      for (let s = 0; s < 5; s++) {
        const stave = MeshBuilder.CreateBox(`wreck-dressing:shattered-stave:${idx}:${s}`, {
          width: 0.12, height: 0.028, depth: 0.75
        }, scene);
        stave.position.set(b.p.x + (s - 2) * 0.14, b.p.y + 0.015, b.p.z + (s % 2) * 0.08);
        stave.rotation.y = b.rot + s * 0.22;
        stave.rotation.z = (s % 2 === 0 ? 0.05 : -0.04);
        worldSurfaceUV(stave, 4.5);
        add(stave, b.surf, 'decayed-barrel', rot);
      }
      const hoopPiece = MeshBuilder.CreateTube(`wreck-dressing:broken-hoop:${idx}`, {
        path: [b.p.add(new Vector3(-0.35, 0.015, -0.2)), b.p.add(new Vector3(0, 0.035, 0.28)), b.p.add(new Vector3(0.38, 0.015, -0.15))],
        radius: 0.012, tessellation: 5
      }, scene);
      add(hoopPiece, b.surf, 'corroded-barrel-iron', iron);
    }
  });

  // =========================================================================
  // 5. SMASHED CARGO CRATES WITH SPLINTERED PLANKS (4 CRATES)
  // Firmly resting on deck with posts and bottom slats touching deck level.
  // =========================================================================
  const cratePositions = [
    { p: new Vector3(40.2, wreckListHeight(22.6), 22.6), s: 0.85, surf: 'main' },
    { p: new Vector3(48.5, wreckListHeight(21.2), 21.2), s: 0.75, surf: 'main' },
    { p: new Vector3(33.0, wreckListHeight(18.2), 18.2), s: 0.90, surf: 'main' },
    // Crate 4 on C2 Forecastle (X=61.2 > 55.5) firmly grounded on upper deck
    { p: new Vector3(61.2, 3.0 + wreckListHeight(18.0), 18.0), s: 0.70, surf: 'c2' }
  ];

  cratePositions.forEach((cr, idx) => {
    const half = cr.s * 0.5;
    for (const cx of [-half, half]) for (const cz of [-half, half]) {
      const post = MeshBuilder.CreateBox(`wreck-dressing:crate-post:${idx}:${cx}:${cz}`, {
        width: 0.08, height: cr.s, depth: 0.08
      }, scene);
      // Post rests directly on deck surface:
      post.position.set(cr.p.x + cx, cr.p.y + half, cr.p.z + cz);
      worldSurfaceUV(post, 4.5);
      add(post, cr.surf, 'smashed-crate', rot);
    }
    for (let side = 0; side < 4; side++) {
      if (side === idx % 4) continue; // blown-out shattered wall
      for (let sl = 0; sl < 3; sl++) {
        const slat = MeshBuilder.CreateBox(`wreck-dressing:crate-slat:${idx}:${side}:${sl}`, {
          width: cr.s * 0.92, height: 0.14, depth: 0.028
        }, scene);
        const y = cr.p.y + 0.10 + sl * (cr.s * 0.32);
        if (side === 0) slat.position.set(cr.p.x, y, cr.p.z + half);
        else if (side === 1) slat.position.set(cr.p.x, y, cr.p.z - half);
        else if (side === 2) { slat.position.set(cr.p.x + half, y, cr.p.z); slat.rotation.y = 1.57; }
        else { slat.position.set(cr.p.x - half, y, cr.p.z); slat.rotation.y = 1.57; }
        slat.rotation.z = (sl % 2 === 0 ? 0.05 : -0.04);
        worldSurfaceUV(slat, 4.5);
        add(slat, cr.surf, 'smashed-crate', rot);
      }
    }
    const lid = MeshBuilder.CreateBox(`wreck-dressing:crate-lid:${idx}`, {
      width: cr.s * 0.95, height: 0.035, depth: cr.s * 0.7
    }, scene);
    lid.position.set(cr.p.x + half + 0.18, cr.p.y + 0.22, cr.p.z);
    lid.rotation.z = -0.65;
    lid.rotation.y = 0.22;
    worldSurfaceUV(lid, 4.5);
    add(lid, cr.surf, 'smashed-crate', rot);
  });

  // =========================================================================
  // 6. MARINE FAUNA: ANIMATED & REACTIVE SHORE CRABS (5 CRABS)
  // Perfectly grounded: legs contact the deck surface without hovering.
  // Reactive scuttling logic updates Y to follow the deck gradient as they flee.
  // =========================================================================
  const crabLocs = [
    { origin: new Vector3(36.8, wreckListHeight(22.2), 22.2), hideOffset: new Vector3(-0.85, 0, -0.65), surf: 'main', seed: 1.1 },
    { origin: new Vector3(44.2, wreckListHeight(23.6), 23.6), hideOffset: new Vector3(0.45, 0, 0.95), surf: 'main', seed: 2.3 },
    { origin: new Vector3(39.5, wreckListHeight(15.8), 15.8), hideOffset: new Vector3(0.35, 0, -0.85), surf: 'main', seed: 3.7 },
    { origin: new Vector3(47.8, wreckListHeight(16.5), 16.5), hideOffset: new Vector3(-0.65, 0, -0.75), surf: 'main', seed: 4.4 },
    // Crab 5 on C3 Quarterdeck (X=23.5 < 28.5) grounded on upper deck:
    { origin: new Vector3(23.5, 3.0 + wreckListHeight(22.0), 22.0), hideOffset: new Vector3(-0.90, 0, 0.55), surf: 'c3', seed: 5.2 }
  ];

  crabLocs.forEach((cDef, idx) => {
    // Crab root mesh container
    const crabRoot = new Mesh(`wreck-dressing:crab-root:${idx}`, scene);
    crabRoot.position.copyFrom(cDef.origin);
    crabRoot.isPickable = false;
    crabRoot.checkCollisions = false;
    crabRoot.metadata = { visualOnly: true, deckSurfaceId: cDef.surf, kind: 'marine-fauna-crab', canonicalDressing: true };
    animatedMeshes.push(crabRoot);

    // Carapace
    const shell = MeshBuilder.CreateIcoSphere(`wreck-dressing:crab-shell:${idx}`, { radius: 0.08, subdivisions: 2 }, scene);
    shell.scaling.set(1.25, 0.45, 0.95);
    shell.position.set(0, 0.035, 0);
    shell.material = crabMat;
    shell.parent = crabRoot;
    shell.receiveShadows = true;
    shell.isPickable = false;

    // Eyestalks
    for (const side of [-1, 1]) {
      const eye = MeshBuilder.CreateCylinder(`wreck-dressing:crab-eye:${idx}:${side}`, { diameter: 0.016, height: 0.03, tessellation: 6 }, scene);
      eye.position.set(0.08, 0.065, side * 0.025);
      eye.rotation.z = -0.35;
      eye.material = crabEyeMat;
      eye.parent = crabRoot;
    }

    // Articulated Pincers / Claws
    const claws: Mesh[] = [];
    for (const side of [-1, 1]) {
      const claw = MeshBuilder.CreateBox(`wreck-dressing:crab-claw:${idx}:${side}`, { width: 0.065, height: 0.026, depth: 0.04 }, scene);
      claw.position.set(0.09, 0.032, side * 0.08);
      claw.rotation.y = side * 0.45;
      claw.material = crabMat;
      claw.parent = crabRoot;
      claws.push(claw);
    }

    // Walking legs (3 on each side)
    const legs: Mesh[] = [];
    for (const side of [-1, 1]) {
      for (let leg = 0; leg < 3; leg++) {
        const legTube = MeshBuilder.CreateTube(`wreck-dressing:crab-leg:${idx}:${side}:${leg}`, {
          path: [new Vector3((leg - 1) * 0.035, 0.025, side * 0.06), new Vector3((leg - 1) * 0.045, 0.04, side * 0.12), new Vector3((leg - 1) * 0.05, 0.005, side * 0.16)],
          radius: 0.008, tessellation: 4
        }, scene);
        legTube.material = crabMat;
        legTube.parent = crabRoot;
        legs.push(legTube);
      }
    }

    // Crab State & Animation Logic:
    let fleeProgress = 0; // 0: resting at origin, 1: hidden in hideOffset
    let fleeTarget = 0;

    scene.onBeforeRenderObservable.add(() => {
      if (!crabRoot.isEnabled()) return;
      const t = performance.now() / 1000;
      const actors = getActorPositions();

      // Check proximity to any player/actor
      let minDist = 999;
      for (const pos of actors) {
        const d = Math.hypot(pos.x - crabRoot.position.x, pos.z - crabRoot.position.z);
        if (d < minDist) minDist = d;
      }

      // Reactive flee if a character approaches within 2.8m
      if (minDist < 2.8) {
        fleeTarget = 1; // Scuttle quickly towards cover!
      } else if (minDist > 4.8) {
        fleeTarget = 0; // Slowly creep back out
      }

      // Smooth scuttle transition
      const speed = fleeTarget === 1 ? 2.8 : 0.6; // flee fast, return slow
      fleeProgress += (fleeTarget - fleeProgress) * Math.min(1, 0.04 * speed);

      // Interpolate position between origin and hideout
      crabRoot.position.x = cDef.origin.x + cDef.hideOffset.x * fleeProgress;
      crabRoot.position.z = cDef.origin.z + cDef.hideOffset.z * fleeProgress;
      const baseDeck = cDef.surf === 'c3' ? 3.0 : 0.0;
      crabRoot.position.y = baseDeck + wreckListHeight(crabRoot.position.z) - fleeProgress * 0.02;

      // Dynamic leg flutter and claw animations
      const isMoving = Math.abs(fleeTarget - fleeProgress) > 0.02;
      const flutterFreq = isMoving ? 24.0 : 4.0;
      const legBob = Math.sin(t * flutterFreq + cDef.seed) * (isMoving ? 0.08 : 0.02);

      // Sideways body roll while scuttling
      crabRoot.rotation.z = isMoving ? Math.sin(t * flutterFreq * 0.5) * 0.06 : 0;
      crabRoot.rotation.y = cDef.seed + (isMoving ? Math.sin(t * 8) * 0.15 : 0);

      // Claw defensive snapping / waving
      claws.forEach((claw, cIdx) => {
        const side = cIdx === 0 ? -1 : 1;
        claw.rotation.y = side * (0.45 + Math.sin(t * 3.5 + cDef.seed + side) * (isMoving ? 0.35 : 0.08));
        claw.position.y = 0.032 + Math.abs(legBob);
      });
    });
  });

  // Sea shells & limpets encrusted along deck scuppers and bulwarks (36 shells)
  for (let s = 0; s < 36; s++) {
    const x = 32.0 + (s % 18) * 1.35 + (s % 3) * 0.15;
    const side = s < 18 ? 1 : -1;
    const z = S.origin.z + side * (wreckBeamAt(x - S.origin.x) - 0.35 - (s % 4) * 0.08);
    const p = new Vector3(x, wreckListHeight(z) + 0.015, z);
    const shell = MeshBuilder.CreateCylinder(`wreck-dressing:deck-limpet:${s}`, { diameterTop: 0.01, diameterBottom: 0.055 + (s % 3) * 0.018, height: 0.032, tessellation: 6 }, scene);
    shell.position.copyFrom(p);
    shell.rotation.z = (s % 2 === 0 ? 0.15 : -0.12);
    shell.rotation.y = s * 0.7;
    add(shell, 'main', 'sea-shells', shellMat);
  }

  // =========================================================================
  // 7. WEATHERED 50-YEAR-OLD SAILOR SKELETONS (2 COMPLETE SKELETONS)
  // =========================================================================
  // Skeleton 1: Pinned near port bulwark (x=39.5, z=16.2)
  const skel1Pos = new Vector3(39.5, wreckListHeight(16.2) + 0.03, 16.2);
  const skull1 = MeshBuilder.CreateIcoSphere('wreck-dressing:sailor-skull:1', { radius: 0.105, subdivisions: 2 }, scene);
  skull1.scaling.set(0.85, 0.95, 1.15);
  skull1.position.set(skel1Pos.x - 0.65, skel1Pos.y + 0.09, skel1Pos.z);
  skull1.rotation.y = 0.55;
  skull1.rotation.z = 0.25;
  add(skull1, 'main', 'sailor-skeleton', bone);
  for (const ey of [-0.035, 0.035]) {
    const eye = MeshBuilder.CreateBox(`wreck-dressing:skull-orbit:1:${ey}`, { width: 0.035, height: 0.035, depth: 0.035 }, scene);
    eye.position.set(skull1.position.x + 0.07, skull1.position.y + 0.015, skull1.position.z + ey);
    add(eye, 'main', 'sailor-skeleton', voidMat);
  }
  for (let r = 0; r < 6; r++) {
    const rx = skel1Pos.x - 0.45 + r * 0.12;
    for (const side of [-1, 1]) {
      const rib = MeshBuilder.CreateTube(`wreck-dressing:skeleton-rib:1:${r}:${side}`, {
        path: [new Vector3(rx, skel1Pos.y + 0.06, skel1Pos.z), new Vector3(rx, skel1Pos.y + 0.12, skel1Pos.z + side * 0.14), new Vector3(rx + 0.03, skel1Pos.y + 0.02, skel1Pos.z + side * 0.11)],
        radius: 0.011, tessellation: 5
      }, scene);
      add(rib, 'main', 'sailor-skeleton', bone);
    }
  }
  const pelvis1 = MeshBuilder.CreateBox('wreck-dressing:skeleton-pelvis:1', { width: 0.14, height: 0.06, depth: 0.24 }, scene);
  pelvis1.position.set(skel1Pos.x + 0.32, skel1Pos.y + 0.04, skel1Pos.z);
  add(pelvis1, 'main', 'sailor-skeleton', bone);
  for (const side of [-1, 1]) {
    const femur = MeshBuilder.CreateTube(`wreck-dressing:skeleton-femur:1:${side}`, {
      path: [pelvis1.position.add(new Vector3(0, 0, side * 0.09)), pelvis1.position.add(new Vector3(0.42, -0.01, side * 0.16))],
      radius: 0.016, tessellation: 5
    }, scene);
    add(femur, 'main', 'sailor-skeleton', bone);
    const arm = MeshBuilder.CreateTube(`wreck-dressing:skeleton-arm:1:${side}`, {
      path: [new Vector3(skel1Pos.x - 0.4, skel1Pos.y + 0.07, skel1Pos.z + side * 0.12), new Vector3(skel1Pos.x - 0.15, skel1Pos.y + 0.02, skel1Pos.z + side * 0.28)],
      radius: 0.013, tessellation: 5
    }, scene);
    add(arm, 'main', 'sailor-skeleton', bone);
  }

  // Skeleton 2: Under broken companionway spar near quarterdeck (x=33.5, z=20.5)
  const skel2Pos = new Vector3(33.5, wreckListHeight(20.5) + 0.03, 20.5);
  const skull2 = MeshBuilder.CreateIcoSphere('wreck-dressing:sailor-skull:2', { radius: 0.10, subdivisions: 2 }, scene);
  skull2.position.set(skel2Pos.x, skel2Pos.y + 0.08, skel2Pos.z + 0.45);
  skull2.rotation.z = 0.45;
  add(skull2, 'main', 'sailor-skeleton', bone);
  for (const ey of [-0.032, 0.032]) {
    const eye = MeshBuilder.CreateBox(`wreck-dressing:skull-orbit:2:${ey}`, { width: 0.032, height: 0.032, depth: 0.032 }, scene);
    eye.position.set(skull2.position.x + 0.065, skull2.position.y + 0.012, skull2.position.z + ey);
    add(eye, 'main', 'sailor-skeleton', voidMat);
  }
  for (let r = 0; r < 5; r++) {
    const rx = skel2Pos.x + (r - 2) * 0.11;
    const rib = MeshBuilder.CreateTube(`wreck-dressing:skeleton-rib:2:${r}`, {
      path: [new Vector3(rx, skel2Pos.y + 0.05, skel2Pos.z + 0.25), new Vector3(rx, skel2Pos.y + 0.11, skel2Pos.z + 0.12), new Vector3(rx, skel2Pos.y + 0.02, skel2Pos.z)],
      radius: 0.012, tessellation: 5
    }, scene);
    add(rib, 'main', 'sailor-skeleton', bone);
  }
  const pelvis2 = MeshBuilder.CreateBox('wreck-dressing:skeleton-pelvis:2', { width: 0.13, height: 0.05, depth: 0.22 }, scene);
  pelvis2.position.set(skel2Pos.x + 0.28, skel2Pos.y + 0.035, skel2Pos.z);
  add(pelvis2, 'main', 'sailor-skeleton', bone);
  for (const side of [-1, 1]) {
    const femur2 = MeshBuilder.CreateTube(`wreck-dressing:skeleton-femur:2:${side}`, {
      path: [pelvis2.position.add(new Vector3(0, 0, side * 0.08)), pelvis2.position.add(new Vector3(0.38, -0.01, side * 0.14))],
      radius: 0.015, tessellation: 5
    }, scene);
    add(femur2, 'main', 'sailor-skeleton', bone);
  }

  // =========================================================================
  // 8. SWAYING WOODEN PLANKS HANGING IN THE WIND (4 PLANKS)
  // Firmly anchored to genuine ship structural elements (rail stanchions / bulwarks)
  // Hanging cord descends vertically, timber hangs vertically and sways as a pendulum.
  // =========================================================================
  const swayingPlankDefs = [
    // Anchor 1: Forecastle companionway break stanchion (Starboard)
    {
      anchor: new Vector3(54.8, 3.0 + wreckListHeight(29.6) + 1.05, 29.6),
      cordLen: 0.38, plankLen: 1.15, plankWidth: 0.16, seed: 1.2, surf: 'c2'
    },
    // Anchor 2: Quarterdeck companionway rail stanchion (Port)
    {
      anchor: new Vector3(29.0, 3.0 + wreckListHeight(10.6) + 1.05, 10.6),
      cordLen: 0.42, plankLen: 1.25, plankWidth: 0.17, seed: 2.7, surf: 'c3'
    },
    // Anchor 3: C1 Starboard rail break near boarding area
    {
      anchor: new Vector3(41.8, wreckListHeight(30.45) + 1.05, 30.45),
      cordLen: 0.35, plankLen: 1.30, plankWidth: 0.18, seed: 0.8, surf: 'main'
    },
    // Anchor 4: C1 Port bulwark stanchion
    {
      anchor: new Vector3(35.5, wreckListHeight(10.15) + 1.05, 10.15),
      cordLen: 0.38, plankLen: 1.20, plankWidth: 0.16, seed: 3.4, surf: 'main'
    }
  ];

  swayingPlankDefs.forEach((sp, idx) => {
    // Vertical hanging cord from structural rail cap
    const cordEnd = sp.anchor.add(new Vector3(0, -sp.cordLen, 0));
    const cord = MeshBuilder.CreateTube(`wreck-dressing:plank-rope:${idx}`, {
      path: [sp.anchor, cordEnd],
      radius: 0.012, tessellation: 4
    }, scene);
    add(cord, sp.surf, 'swaying-plank-rope', rope);

    // Weathered timber hanging vertically below cord
    const plank = MeshBuilder.CreateBox(`wreck-dressing:swaying-plank:${idx}`, {
      width: 0.045, height: sp.plankLen, depth: sp.plankWidth
    }, scene);
    plank.position.set(cordEnd.x, cordEnd.y - sp.plankLen * 0.5, cordEnd.z);
    worldSurfaceUV(plank, 4.5);
    addSolo(plank, sp.surf, 'swaying-plank', rot);

    scene.onBeforeRenderObservable.add(() => {
      if (!plank.isEnabled() || !plank.isVisible) return;
      const t = performance.now() / 1000;
      // Pendulum swing: natural angular displacement around top anchor point
      const sway = Math.sin(t * 1.5 + sp.seed) * 0.11;
      const swayRoll = Math.cos(t * 1.1 + sp.seed * 1.4) * 0.04;
      plank.rotation.z = sway;
      plank.rotation.x = swayRoll;
    });
  });

  // =========================================================================
  // 9. PERCHING SEAGULLS, REACTIVE TAKEOFF FLIGHT & PERSISTENT POOP
  // Sitting firmly on the wooden top rail caps with little clawed feet.
  // 1: C1 Starboard rail (X=40.5, Z=30.49, Y=1.20)
  // 2: C1 Port rail (X=46.5, Z=10.01, Y=0.90)
  // 3: C2 Forecastle Starboard rail (X=61.5, Z=30.32, Y=4.20)
  // 4: C3 Quarterdeck Port rail (X=21.0, Z=10.41, Y=3.90)
  // =========================================================================
  const buildPoopSplatMesh = (x: number, y: number, z: number, r: number = 0.14) => {
    const splat = MeshBuilder.CreateDisc(`wreck-dressing:gull-poop-splat:${x.toFixed(2)}:${z.toFixed(2)}`, {
      radius: r,
      tessellation: 12
    }, scene);
    splat.position.set(x, y + 0.015, z);
    splat.rotation.x = Math.PI / 2;
    splat.material = guanoMat;
    splat.receiveShadows = true;
    splat.isPickable = false;
    splat.metadata = { visualOnly: true, deckSurfaceId: 'main', kind: 'seagull-guano-map-element', canonicalDressing: true };
    animatedMeshes.push(splat);
    return splat;
  };

  const storedPoop = loadStoredPoop();
  for (const sp of storedPoop) {
    buildPoopSplatMesh(sp.x, sp.y, sp.z, sp.r);
  }

  const seagullPositions = [
    // Gull 1: C1 Starboard top rail cap
    { p: new Vector3(40.5, 1.20, 30.49), yaw: -1.57, seed: 1.1, surf: 'main', flyDir: new Vector3(0.3, 0.7, 0.7) },
    // Gull 2: C1 Port top rail cap
    { p: new Vector3(46.5, 0.90, 10.01), yaw: 1.57, seed: 2.5, surf: 'main', flyDir: new Vector3(0.2, 0.7, -0.7) },
    // Gull 3: C2 Forecastle Starboard top rail cap
    { p: new Vector3(61.5, 4.20, 30.32), yaw: -0.85, seed: 4.2, surf: 'c2', flyDir: new Vector3(0.8, 0.6, 0.3) },
    // Gull 4: C3 Quarterdeck Port top rail cap
    { p: new Vector3(21.0, 3.90, 10.41), yaw: 0.95, seed: 3.1, surf: 'c3', flyDir: new Vector3(-0.7, 0.6, -0.4) }
  ];

  let totalPoopEvents = storedPoop.length;

  seagullPositions.forEach((gull, idx) => {
    // Seagull container node resting precisely on the wooden rail cap
    const gullRoot = new Mesh(`wreck-dressing:gull-root:${idx}`, scene);
    gullRoot.position.copyFrom(gull.p);
    gullRoot.rotation.y = gull.yaw;
    gullRoot.isPickable = false;
    gullRoot.checkCollisions = false;
    gullRoot.metadata = { visualOnly: true, deckSurfaceId: gull.surf, kind: 'marine-fauna-seagull', canonicalDressing: true };
    animatedMeshes.push(gullRoot);

    // Clawed perching feet touching the rail cap surface directly
    for (const side of [-1, 1]) {
      const leg = MeshBuilder.CreateCylinder(`wreck-dressing:gull-leg:${idx}:${side}`, {
        diameterTop: 0.012, diameterBottom: 0.012, height: 0.065, tessellation: 5
      }, scene);
      leg.position.set(side * 0.035, 0.032, 0);
      leg.material = gullBeak;
      leg.isPickable = false;
      leg.checkCollisions = false;
      leg.parent = gullRoot;
    }

    // Streamlined body above legs
    const body = MeshBuilder.CreateIcoSphere(`wreck-dressing:gull-body:${idx}`, { radius: 0.12, subdivisions: 2 }, scene);
    body.scaling.set(0.7, 0.8, 1.4);
    body.position.set(0, 0.15, 0);
    body.material = gullBody;
    body.parent = gullRoot;
    body.receiveShadows = true;
    body.isPickable = false;

    // Articulated Wings (can fold against body or spread and flap in flight)
    const wings: Mesh[] = [];
    for (const side of [-1, 1]) {
      const wing = MeshBuilder.CreateBox(`wreck-dressing:gull-wing:${idx}:${side}`, { width: 0.035, height: 0.09, depth: 0.28 }, scene);
      wing.position.set(side * 0.08, 0.17, 0);
      wing.rotation.y = side * 0.08;
      wing.rotation.x = 0.25;
      wing.material = gullWing;
      wing.parent = gullRoot;
      wings.push(wing);
    }

    // Head and glancing beak
    const head = MeshBuilder.CreateIcoSphere(`wreck-dressing:gull-head:${idx}`, { radius: 0.065, subdivisions: 2 }, scene);
    head.position.set(0, 0.24, 0.16);
    head.material = gullBody;
    head.parent = gullRoot;

    const beak = MeshBuilder.CreateCylinder(`wreck-dressing:gull-beak:${idx}`, { diameterTop: 0.002, diameterBottom: 0.035, height: 0.09, tessellation: 6 }, scene);
    beak.position.set(0, 0.24, 0.23);
    beak.rotation.x = 1.57;
    beak.material = gullBeak;
    beak.parent = gullRoot;

    // Seagull state: 'perched' | 'flying'
    let flightState: 'perched' | 'flying' = 'perched';
    let flightTime = 0;
    let flightDistance = 0;
    let poopScheduledAt = 10.0 + gull.seed * 7.0;
    let poopFired = false;

    scene.onBeforeRenderObservable.add(() => {
      if (!gullRoot.isEnabled()) return;
      const t = performance.now() / 1000;
      const actors = getActorPositions();

      let minDist = 999;
      for (const pos of actors) {
        const d = Math.hypot(pos.x - gullRoot.position.x, pos.z - gullRoot.position.z);
        if (d < minDist) minDist = d;
      }

      // If a character approaches within 3.8m, take off and fly away
      if (flightState === 'perched' && minDist < 3.8) {
        flightState = 'flying';
        flightTime = 0;
      }

      if (flightState === 'perched') {
        // Idle head glance and breathing
        const cycle = Math.sin(t * 0.8 + gull.seed);
        const twitch = cycle > 0.65 ? Math.sin(t * 5.0) * 0.35 : 0;
        head.rotation.y = twitch;
        beak.rotation.y = twitch;
        body.position.y = 0.15 + Math.sin(t * 2.2 + gull.seed) * 0.005;

        // Wings folded snugly
        wings[0]!.rotation.set(0.25, -0.08, 0);
        wings[1]!.rotation.set(0.25, 0.08, 0);

        // Seagull poop mechanic (at most 1 or 2 times total)
        if (!poopFired && totalPoopEvents < 2 && t > poopScheduledAt) {
          poopFired = true;
          totalPoopEvents++;

          // Dropping lands on the deck directly below the rail
          const dropY = gull.p.y - 1.05;
          const dropPos = { x: gull.p.x + (gull.yaw < 0 ? -0.15 : 0.15), y: dropY, z: gull.p.z + (gull.p.z > 20 ? -0.25 : 0.25), r: 0.13 + Math.random() * 0.04 };
          buildPoopSplatMesh(dropPos.x, dropPos.y, dropPos.z, dropPos.r);
          savePoopToMap(dropPos);
        }
      } else {
        // Flight state: wings spread out and flap rapidly!
        flightTime += 0.016;
        const flap = Math.sin(t * 26.0) * 0.75;
        wings[0]!.rotation.set(0, 0, flap);
        wings[1]!.rotation.set(0, 0, -flap);
        wings[0]!.scaling.set(1.8, 0.4, 1.2);
        wings[1]!.scaling.set(1.8, 0.4, 1.2);

        // Ascend and fly away in an arced trajectory over the sea
        const flySpeed = 4.5;
        flightDistance += 0.016 * flySpeed;
        gullRoot.position.x = gull.p.x + gull.flyDir.x * flightDistance;
        gullRoot.position.y = gull.p.y + gull.flyDir.y * flightDistance + Math.sin(flightTime * 2.0) * 0.3;
        gullRoot.position.z = gull.p.z + gull.flyDir.z * flightDistance;
        gullRoot.rotation.x = -0.22;

        if (flightDistance > 45 && minDist > 8.0 && flightTime > 60) {
          flightState = 'perched';
          gullRoot.position.copyFrom(gull.p);
          gullRoot.rotation.set(0, gull.yaw, 0);
          wings[0]!.scaling.set(1, 1, 1);
          wings[1]!.scaling.set(1, 1, 1);
        }
      }
    });
  });

  // =========================================================================
  // 10. INOPERABLE / COLLAPSED COMPANIONWAY SECONDARY STAIR SECTION
  // =========================================================================
  const stairPos = new Vector3(34.2, wreckListHeight(17.8), 17.8);
  for (let step = 0; step < 4; step++) {
    const tread = MeshBuilder.CreateBox(`wreck-dressing:broken-step:${step}`, { width: 0.38, height: 0.07, depth: 1.1 }, scene);
    tread.position.set(stairPos.x + step * 0.32, stairPos.y + step * 0.28 - (step === 2 ? 0.18 : 0), stairPos.z);
    tread.rotation.z = (step === 2 ? 0.38 : step === 1 ? -0.18 : 0.05);
    tread.rotation.y = 0.12 * step;
    worldSurfaceUV(tread, 4.5);
    add(tread, 'main', 'broken-stairs', rot);
  }
  const beamBlock = MeshBuilder.CreateBox('wreck-dressing:stair-block-beam', { width: 0.14, height: 0.14, depth: 1.35 }, scene);
  beamBlock.position.set(stairPos.x + 0.65, stairPos.y + 0.85, stairPos.z);
  beamBlock.rotation.x = 0.18;
  beamBlock.rotation.z = -0.32;
  worldSurfaceUV(beamBlock, 4.5);
  add(beamBlock, 'main', 'broken-stairs', rot);

  // =========================================================================
  // 11. BATCH STATIC MESHES & RETURN
  // =========================================================================
  const batched = [...groups].flatMap(([key, parts]) => {
    const meta = { ...parts[0]!.metadata };
    const m = Mesh.MergeMeshes(parts, true, true, undefined, false, false);
    if (!m) return [];
    m.name = `wreck-dressing:batch:${key}`;
    m.metadata = meta;
    m.isPickable = false;
    m.receiveShadows = true;
    return [m];
  });

  return [...batched, ...animatedMeshes];
}
