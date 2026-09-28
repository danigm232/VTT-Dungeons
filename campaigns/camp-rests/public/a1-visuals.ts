import { Color3, Color4 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { PointLight } from '@babylonjs/core/Lights/pointLight.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import { Material } from '@babylonjs/core/Materials/material.js';
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem.js';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator.js';
import { GlowLayer } from '@babylonjs/core/Layers/glowLayer.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { Cell, PublicSceneDefinition } from '../../../engine/shared/campaign.js';
import type { CampRestPhase } from '../../../engine/shared/camp-rest.js';
import { illustratedMaterial, mergeDecoration, updateCutaway, createRestLighting, softPoolMaterial, fracturedStone, worldSurfaceUV } from '../../../engine/client/diorama-kit.js';
import { createCoastalBackdrop } from '../../../engine/client/coastal-backdrop.js';
import type { CampVisuals } from './visuals.js';
import { A1_FIRE_CELL, A1_PLAZA_CELLS, A1_ROOMS, A1_ROOM_CELL_KEYS, A1_STATUE_CELL, A1_TILE_METERS, type A1RoomSpec } from './a1-layout.js';

const darkness: Record<CampRestPhase, number> = { arrival: .12, dusk: .65, night: .95, dawn: .4, finalization: .12 };
const worldCell = (col: number, row: number) => new Vector3((col + .5) * A1_TILE_METERS, 0, (row + .5) * A1_TILE_METERS);
const key = (col: number, row: number) => `${col},${row}`;

/** CANON: six unequal excavated cells, an elongated plaza, the Astalagan
 * statue, four beds and eight hammocks. Surface dressing is VTT_AMBIENCE. */
export function createA1Visuals(scene: Scene, definition: PublicSceneDefinition): CampVisuals {
  const root = new TransformNode(`camp-visuals:${definition.id}`, scene);
  // Keep room for the real key light and contact shadows instead of lifting
  // every material with exposure/emission as if the atlas were a baked render.
  scene.imageProcessingConfiguration.exposure = 1.16;
  scene.imageProcessingConfiguration.contrast = 1.12;
  root.metadata = { content: 'CANON', source: 'Los Dragones de la Isla de las Tempestades, A1', cells: 6, beds: 4, hammocks: 8, openEntrances: 6, statue: 'Astalagan', plazaFire: true, layout: 'official-map' };
  const asset = '/art/a1-hd2d-v1/';
  const painted = (name: string, tint: string, texture?: string, repeat = 1) => {
    const material = illustratedMaterial(scene, `a1:${name}`, tint, texture ? asset + texture : undefined, repeat);
    material.emissiveColor = Color3.FromHexString(tint).scale(.13);
    material.maxSimultaneousLights = 8;
    return material;
  };
  const atlas = (name: string, tint: string) => {
    const material = new StandardMaterial(`a1:${name}`, scene);
    material.diffuseColor = Color3.FromHexString(tint); material.emissiveColor = Color3.FromHexString(tint).scale(.025); material.specularColor = new Color3(.025, .025, .022); material.maxSimultaneousLights = 8;
    if (typeof document !== 'undefined') {
      const textureName = name.includes('carved') ? 'a1-carved-v6.png' : name.includes('coastal-cliff') ? 'a1-cliff-organic-v7.png' : name.includes('cliff') ? 'a1-cliff-v6.png' : name.includes('cell-floor') ? 'a1-cell-v6.png' : 'a1-plaza-v6.png';
      const texture = new Texture(asset + textureName, scene); texture.anisotropicFilteringLevel = 8; material.diffuseTexture = texture;
    }
    return material;
  };
  const M = {
    plaza: atlas('plaza-v6', '#d2c6ae'), carved: atlas('carved-cliff-v6', '#c5c0b1'),
    plazaWarm: atlas('plaza-warm-v6', '#c9b99b'), plazaCool: atlas('plaza-cool-v6', '#b8b9b2'), plazaMoss: atlas('plaza-moss-v6', '#afb59f'),
    cliff: atlas('coastal-cliff-v6', '#aaa9a3'), cellFloor: atlas('cell-floor-v6', '#b2a795'),
    cellWarm: atlas('cell-floor-warm-v6', '#b9aa96'), cellCool: atlas('cell-floor-cool-v6', '#a7aaa4'), cellDark: atlas('cell-floor-dark-v6', '#948b80'),
    limestone: painted('limestone-v5', '#c3bba8', 'limestone-v3.webp'), earth: painted('earth-v6', '#a99271', 'earth.webp', 1.1),
    ashlar: painted('ashlar-v5', '#c9bca4', 'ashlar-v4.webp', 1.15), facade: painted('facade-stone-v5', '#ddd0b8', 'ashlar-v4.webp', 1.28), wood: painted('oak-v5', '#b88455', 'oak-v4.webp'), darkWood: painted('dark-oak-v5', '#62442f', 'oak-v4.webp'),
    linen: painted('linen-v5', '#eadcc7', 'linen-v4.webp', 2), blue: painted('blue-cloth-v5', '#718aa0', 'linen-v4.webp', 2), red: painted('red-cloth-v5', '#b06f61', 'wool-v4.webp', 2), green: painted('green-cloth-v5', '#728067', 'wool-v4.webp', 2),
    metal: painted('iron-v5', '#3e4444'), brass: painted('brass-v5', '#af7e3d'), paper: painted('paper-v5', '#d8bb82'), pottery: painted('pottery-v5', '#93634a'), soil: painted('garden-soil-v5', '#675640', 'earth.webp', 1.2),
    glow: painted('fire-glow-v5', '#ffd084'), flame: painted('fire-core-v5', '#ff9738'), halo: painted('interaction-halo-v5', '#ffe0a0'), shade: softPoolMaterial(scene, 'a1:contact-shadow-v5', '#211d1a', .34)
  };
  M.glow.emissiveColor = Color3.FromHexString('#ffcf79'); M.flame.emissiveColor = Color3.FromHexString('#ff7b25'); M.halo.emissiveColor = Color3.FromHexString('#ffc56b');
  const plazaMaterials = [M.plaza, M.plazaWarm, M.plazaCool, M.plazaMoss];
  const cellMaterials = [M.cellFloor, M.cellWarm, M.cellCool, M.cellDark];
  const readableMaterials = [...plazaMaterials, M.carved, M.cliff, ...cellMaterials, M.limestone, M.earth, M.ashlar, M.facade, M.wood, M.darkWood, M.linen, M.blue, M.red, M.green, M.metal, M.brass, M.paper, M.pottery, M.soil];
  const warmPool = softPoolMaterial(scene, 'a1:warm-bounce-v5', '#ef9d42', .19);
  const backdrop = createCoastalBackdrop(scene, root, asset + 'bay-v3.png');
  const foliageMaterial = (name: string, tint: string) => {
    const material = painted(name, tint);
    if (typeof document !== 'undefined') { const texture = new Texture(asset + 'foliage-atlas-v5.png', scene); texture.hasAlpha = true; texture.anisotropicFilteringLevel = 4; material.diffuseTexture = texture; material.useAlphaFromDiffuseTexture = true; }
    material.transparencyMode = Material.MATERIAL_ALPHATEST; material.backFaceCulling = false; material.twoSidedLighting = true; material.emissiveTexture = material.diffuseTexture;
    return material;
  };
  const foliage = foliageMaterial('painted-foliage-v6', '#ffffff');
  const foliageSage = foliageMaterial('painted-foliage-sage-v6', '#c1c9a8');
  const foliageDark = foliageMaterial('painted-foliage-dark-v6', '#71846d');
  const foliageFlower = foliageMaterial('painted-foliage-flower-v6', '#d6c6ae');
  const foliageVariants = [foliage, foliageSage, foliageDark, foliageFlower];

  const statics: Mesh[] = [], cliffMeshes: Mesh[] = [], flameMeshes: Mesh[] = [], litRoomSurfaces: Mesh[] = [];
  const walls: Array<{ roomId: number; meshes: Mesh[]; normal: Vector3; center: Vector3 }> = [];
  const facades = new Map<number, Mesh[]>();
  const roofs = new Map<number, Mesh[]>();
  const fireLights: PointLight[] = [], candleLights: PointLight[] = [];
  const vfxSystems: ParticleSystem[] = [];
  let bucket = statics;
  function add(mesh: Mesh, at: Vector3, material: StandardMaterial) { mesh.position.copyFrom(at); mesh.material = material; mesh.parent = root; mesh.isPickable = false; mesh.checkCollisions = false; bucket.push(mesh); return mesh; }
  function box(name: string, x: number, y: number, z: number, width: number, height: number, depth: number, material: StandardMaterial) { const mesh = add(MeshBuilder.CreateBox(name, { width, height, depth }, scene), new Vector3(x, y, z), material); if (material.name.includes('-v6')) worldSurfaceUV(mesh, material.name.includes('coastal-cliff') ? 22 : 6.2); return mesh; }
  function sphere(name: string, x: number, y: number, z: number, sx: number, sy: number, sz: number, material: StandardMaterial, segments = 8) { const mesh = add(MeshBuilder.CreateSphere(name, { diameter: 1, segments }, scene), new Vector3(x, y, z), material); mesh.scaling.set(sx, sy, sz); return mesh; }
  function cylinder(name: string, x: number, y: number, z: number, height: number, diameter: number, material: StandardMaterial, tessellation = 10) { return add(MeshBuilder.CreateCylinder(name, { height, diameter, tessellation }, scene), new Vector3(x, y, z), material); }
  function rock(name: string, x: number, y: number, z: number, width: number, height: number, depth: number, seed: number, material = M.cliff) { const mesh = add(fracturedStone(scene, name, width, height, depth, seed), new Vector3(x, y, z), material); mesh.rotation.y = Math.sin(seed * 2.71) * .28; return mesh; }
  function organicBoulder(name: string, x: number, y: number, z: number, width: number, height: number, depth: number, seed: number, material = M.cliff) {
    const mesh = MeshBuilder.CreateIcoSphere(name, { radius: 1, subdivisions: 1 }, scene);
    const positions = mesh.getVerticesData('position')!, indices = mesh.getIndices()!;
    const noise = (value: number) => { const n = Math.sin(value * 127.1 + seed * 311.7) * 43758.5453; return (n - Math.floor(n)) * 2 - 1; };
    for (let i = 0; i < positions.length; i += 3) {
      const px = positions[i]!, py = positions[i + 1]!, pz = positions[i + 2]!;
      const broad = Math.sin(px * 3.1 + seed) * .13 + Math.sin(pz * 4.7 - seed * .7) * .095 + Math.cos(py * 5.2 + px * 2.1) * .07;
      const facet = noise(i * .19 + py * 17) * .075, radius = 1 + broad + facet;
      positions[i] = px * radius;
      positions[i + 1] = py * radius * (py < -.42 ? .82 : 1);
      positions[i + 2] = pz * radius;
    }
    mesh.updateVerticesData('position', positions, false, false);
    const normals: number[] = []; VertexData.ComputeNormals(positions, indices, normals); mesh.updateVerticesData('normal', normals, false, false); mesh.convertToFlatShadedMesh();
    mesh.position.set(x, y, z); mesh.scaling.set(width * .5, height * .5, depth * .5); mesh.material = material; mesh.parent = root; mesh.isPickable = false; mesh.checkCollisions = false;
    mesh.rotation.set(Math.sin(seed * 1.7) * .12, Math.sin(seed * 2.71) * .32, Math.cos(seed * 1.13) * .11);
    bucket.push(mesh); return mesh;
  }
  function organicCliffUV(mesh: Mesh, meters = 24) {
    const positions = mesh.getVerticesData('position'); if (!positions) return;
    const matrix = mesh.computeWorldMatrix(true), uvs: number[] = [];
    for (let i = 0; i < positions.length; i += 3) {
      const p = Vector3.TransformCoordinates(Vector3.FromArray(positions, i), matrix);
      const warpX = Math.sin(p.y * .23 + p.x * .061) * 2.1 + Math.cos(p.y * .47 - p.x * .13) * .72;
      const warpY = Math.sin(p.x * .075 + p.y * .17) * 1.15 + Math.cos(p.x * .19 - p.y * .31) * .38;
      uvs.push((p.x + warpX) / meters, (p.y + warpY) / meters);
    }
    mesh.setVerticesData('uv', uvs, false, 2);
  }
  function shadow(x: number, z: number, width: number, depth: number) { const mesh = add(MeshBuilder.CreateDisc('a1:contact-shadow', { radius: .5, tessellation: 20 }, scene), new Vector3(x, .035, z), M.shade); mesh.rotation.x = Math.PI / 2; mesh.scaling.set(width, depth, 1); return mesh; }
  function plantCard(x: number, y: number, z: number, width: number, height: number, kind: number, angle: number, tilt = 0, material = foliage) { const mesh = add(MeshBuilder.CreatePlane('a1:plant-card', { width, height }, scene), new Vector3(x, y, z), material); const u = (kind % 2) * .5, v = kind < 2 ? .5 : 0; mesh.setVerticesData('uv', [u, v, u + .5, v, u + .5, v + .5, u, v + .5]); mesh.rotation.set(tilt, angle, 0); return mesh; }
  function shrub(x: number, z: number, size: number, seed: number, y = 0) { const material = foliageVariants[Math.abs(seed) % foliageVariants.length]!; for (let layer = 0; layer < 3; layer++) plantCard(x + Math.sin(seed + layer) * size * .12, y + size * .44, z + Math.cos(seed + layer) * size * .1, size * 1.65, size, Math.abs(seed + layer) % 4, seed + layer * Math.PI / 3, 0, material); plantCard(x, y + size * .22, z, size * 1.5, size * .85, 3, seed, -Math.PI * .32, material); }
  function grassTuft(x: number, z: number, size: number, seed: number, y = 0) { const material = foliageVariants[(Math.abs(seed) + 1) % foliageVariants.length]!; for (let card = 0; card < 3; card++) plantCard(x, y + size * .36, z, size * (.44 + card * .08), size, 1 + card % 3, seed + card * Math.PI / 3, 0, material); }
  function flame(name: string, x: number, y: number, z: number, scale = 1) { const previous = bucket; bucket = flameMeshes; const mesh = sphere(name, x, y, z, .18 * scale, .34 * scale, .18 * scale, M.flame, 7); mesh.metadata = { baseX: .18 * scale, baseY: .34 * scale, baseZ: .18 * scale, phase: x * .3 + z * .7 }; bucket = previous; return mesh; }

  box('a1:ledge-base', 36, -.42, 17.2, 96, .8, 19.5, M.cliff);
  box('a1:cliff-plinth', 36, -4.8, 13.4, 102, 9.4, 28, M.cliff);
  for (const cell of A1_PLAZA_CELLS) {
    const p = worldCell(cell.col, cell.row), seed = cell.col * 13 + cell.row * 31;
    const baseMaterial = plazaMaterials[Math.abs(seed) % plazaMaterials.length]!;
    box('a1:plaza-earth-joint', p.x, -.04, p.z, 1.52, .09, 1.52, M.earth);
    const pieces: Array<{ dx: number; dz: number; width: number; depth: number }> = [];
    if (seed % 9 === 0) {
      for (let quarter = 0; quarter < 4; quarter++) pieces.push({ dx: quarter % 2 ? .37 : -.37, dz: quarter > 1 ? .37 : -.37, width: .71 + (quarter % 2) * .07, depth: .69 + (quarter % 3) * .04 });
    } else if (seed % 7 === 0) {
      for (const side of [-1, 1]) pieces.push({ dx: side * .34, dz: (seed % 3 - 1) * .09, width: .78 + (side > 0 ? .08 : 0), depth: 1.34 + (seed % 2) * .08 });
    } else {
      pieces.push({ dx: Math.sin(seed * 1.31) * .07, dz: Math.cos(seed * .83) * .07, width: 1.25 + (Math.abs(seed) % 5) * .045, depth: 1.22 + (Math.abs(seed * 3) % 6) * .04 });
    }
    pieces.forEach((piece, index) => {
      const slab = rock('a1:plaza-irregular-flagstone', p.x + piece.dx, .043 + ((seed + index) % 3) * .018, p.z + piece.dz, piece.width, .085 + ((seed + index) % 2) * .025, piece.depth, seed + index * 19, plazaMaterials[(Math.abs(seed + index * 3)) % plazaMaterials.length]!);
      worldSurfaceUV(slab, 6.2); slab.rotation.set(Math.sin(seed + index) * .018, Math.sin(seed * .71 + index) * .12, Math.cos(seed * 1.17 + index) * .018);
    });
    if (seed % 11 === 0) { const scar = rock('a1:plaza-worn-patch', p.x + .28, .105, p.z - .24, .58, .055, .42, seed + 700, M.earth); scar.rotation.y = seed * .17; }
  }
  for (let i = 0; i < 44; i++) { const x = 3.2 + i * 1.55, z = 23.7 + Math.sin(i * .43) * .22; const slab = box('a1:worn-path-slab', x, .075, z, 1.28, .06, .75, M.plaza); slab.rotation.y = Math.sin(i * 2.2) * .07; }
  for (const side of [-1, 1]) for (let step = 0; step < 7; step++) { const x = side < 0 ? 2.2 - step * 1.05 : 69.8 + step * 1.05, z = 24.3 + step * .62; const stair = box('a1:path-stair', x, .08 - step * .05, z, 1.45, .14, .92, M.plaza); stair.rotation.y = side * .12; }

  bucket = cliffMeshes;
  const coastPaths: Vector3[][] = [];
  const coastY = [.16, -.42, -1.38, -2.5, -3.95, -5.45, -6.85, -8.12, -9.55];
  const coastZ = [25.7, 26.02, 26.32, 26.82, 27.5, 28.15, 28.83, 30.05, 31.85];
  for (let layer = 0; layer < coastY.length; layer++) {
    const path: Vector3[] = [];
    for (let i = 0; i <= 96; i++) {
      const x = -18 + i * 1.125;
      const fracture = Math.sin(i * .31 + layer * 1.7) * .18 + Math.sin(i * .073 - layer * .8) * .34;
      path.push(new Vector3(x, coastY[layer]! + Math.sin(i * .61 + layer) * .22 + fracture * .26, coastZ[layer]! + Math.sin(i * .27 + layer) * .5 + fracture));
    }
    coastPaths.push(path);
  }
  const coastalFace = add(MeshBuilder.CreateRibbon('a1:layered-coastal-face', { pathArray: coastPaths, sideOrientation: Mesh.DOUBLESIDE }, scene), Vector3.Zero(), M.cliff);
  organicCliffUV(coastalFace, 23);
  // Unaligned fractured ledges break the coast silhouette without reading as a row of blocks.
  const cliffRandom = (seed: number) => { const value = Math.sin(seed * 78.233 + 12.9898) * 43758.5453; return value - Math.floor(value); };
  for (let i = 0; i < 23; i++) {
    const seed = 90 + i * 13, x = -12 + cliffRandom(seed) * 101;
    const y = -.55 - cliffRandom(seed + 1) * 7.9;
    const width = 2.1 + cliffRandom(seed + 2) * 4.9, height = .75 + cliffRandom(seed + 3) * 2.3, depth = 1.6 + cliffRandom(seed + 4) * 2.6;
    const z = 26.7 + Math.max(0, -y) * .58 + (cliffRandom(seed + 5) - .5) * 1.25;
    organicBoulder(i % 4 ? 'a1:coastal-stratum' : 'a1:coastal-fracture', x, y, z, width, height, depth, seed);
    if (i % 5 === 1) organicBoulder('a1:tidal-boulder', x + (cliffRandom(seed + 6) - .5) * 2.2, -8.35 + cliffRandom(seed + 7) * .8, 31.5 + (cliffRandom(seed + 8) - .5) * 2.8, 1.8 + cliffRandom(seed + 9) * 1.5, .75 + cliffRandom(seed + 10) * .8, 1.8 + cliffRandom(seed + 11) * 1.4, seed + 500);
  }
  // Inland plateau behind the carved wall: from the canonical south-facing A1
  // ledge the sea remains below the front cliff, never behind the monastery.
  const inlandPlateau = add(MeshBuilder.CreateGround('a1:inland-plateau', { width: 170, height: 90, subdivisions: 32, updatable: true }, scene), new Vector3(36, 21, -74), M.earth);
  const plateauPositions = inlandPlateau.getVerticesData('position')!;
  const plateauHeight = (x: number, z: number) => Math.sin(x * .055 + z * .048) * .42 + Math.sin(x * .13 - z * .09) * .23 + Math.sin(x * .24 + z * .18) * .08;
  for (let i = 0; i < plateauPositions.length; i += 3) plateauPositions[i + 1] = plateauHeight(plateauPositions[i]! + 36, plateauPositions[i + 2]! - 74);
  inlandPlateau.updateVerticesData('position', plateauPositions, false, false);
  const plateauNormals: number[] = [];
  VertexData.ComputeNormals(plateauPositions, inlandPlateau.getIndices()!, plateauNormals);
  inlandPlateau.updateVerticesData('normal', plateauNormals, false, false);
  worldSurfaceUV(inlandPlateau, 5.8);
  for (let i = 0; i < 24; i++) {
    const x = -5 + i * 3.65 + Math.sin(i * 1.7) * 1.25, z = -43 - ((i * 7) % 10) * 4.2 + Math.cos(i) * 1.4;
    const ground = 21 + plateauHeight(x, z);
    shrub(x, z, 2.1 + (i % 3) * .42, 420 + i, ground);
    if (i % 2 === 0) grassTuft(x + 1.3, z - .8, .8 + (i % 3) * .16, 620 + i, ground + .02);
    if (i % 3 === 0) rock('a1:inland-outcrop', x + 1.2, ground + .55, z + .8, 2.8 + (i % 2), 1.45 + (i % 3) * .28, 2.4, 440 + i, M.carved);
  }
  const roomBounds = A1_ROOMS.map(room => {
    const xs = room.cells.map(cell => worldCell(cell.col, cell.row).x);
    return { minX: Math.min(...xs), maxX: Math.max(...xs) };
  }).sort((a, b) => a.minX - b.minX);
  const roomGapCenters = roomBounds.slice(0, -1).map((room, index) => (room.maxX + roomBounds[index + 1]!.minX) * .5);
  const upperPaths: Vector3[][] = [];
  const upperY = [.05, 2.2, 4.7, 7.1, 9.3, 12.8, 16.6, 20.4], upperZ = [3.8, 1.2, -1.4, -4.2, -7.5, -12.4, -20.2, -28.5];
  for (let layer = 0; layer < upperY.length; layer++) {
    const path: Vector3[] = [], y = upperY[layer]!, z = upperZ[layer]!;
    for (let i = 0; i <= 78; i++) {
      const x = -16 + i * 1.35;
      const broadRidge = Math.sin(x * .085 + layer * .63) * 1.05 + Math.sin(x * .22 - layer * .81) * .54 + Math.cos(x * .041 + layer * .9) * 1.2;
      const fracture = Math.sin(x * .31 + layer * 1.3) * .38 + Math.sin(x * .071 - layer) * .62 + Math.cos(x * .49 + layer * 2.4) * .16;
      const carvedRibs = roomGapCenters.reduce((sum, center, index) => sum + Math.exp(-Math.pow((x - center) / (1.35 + index % 2 * .3), 2)) * (1.3 + Math.sin(layer * .82 + index * 1.7) * .5), 0);
      path.push(new Vector3(x, y + Math.sin(x * .54 + layer) * .3 + broadRidge * .16 + carvedRibs * .1, z + broadRidge * .68 + fracture * .72 + carvedRibs));
    }
    upperPaths.push(path);
  }
  const mountainFace = add(MeshBuilder.CreateRibbon('a1:carved-mountainside', { pathArray: upperPaths, sideOrientation: Mesh.DOUBLESIDE }, scene), Vector3.Zero(), M.cliff);
  organicCliffUV(mountainFace, 25);
  // The same mesh swells forward into stone ribs exactly between the six
  // entrances. This keeps their walls joined to the cliff instead of adding
  // detached rocks in front of a flat background.
  for (const side of [-1, 1]) for (let i = 0; i < 7; i++) {
    const seed = 220 + i * 23 + (side > 0 ? 50 : 0), x = side < 0 ? -3 - i * 2.1 - cliffRandom(seed) * 1.8 : 75 + i * 2.1 + cliffRandom(seed) * 1.8, z = 5 + i * 1.8 + (cliffRandom(seed + 1) - .5) * 2;
    organicBoulder('a1:side-cliff-mass', x, 2.3 + cliffRandom(seed + 2) * 2.7, z, 4.3 + cliffRandom(seed + 3) * 4.2, 4.1 + cliffRandom(seed + 4) * 4.6, 4.5 + cliffRandom(seed + 5) * 3.8, seed, M.cliff);
    if (i % 2 === 0) shrub(x - side * .4, z, 1.6 + (i % 3) * .35, i + 40, 5.2);
  }
  bucket = statics;
  for (const [x, width, seed] of [[8, 7, 1], [60, 8, 7]] as const) { box('a1:garden-soil', x, .08, 25.2, width, .12, 1.5, M.soil); for (let i = 0; i < width * 2; i++) { const px = x - width / 2 + .35 + i * .5; if (i % 3 === 0) grassTuft(px, 25.15 + Math.sin(i) * .22, .55 + (i % 2) * .1, seed + i, .12); else shrub(px, 25.15 + Math.sin(i) * .22, .38 + (i % 3) * .08, seed + i, .12); if (i % 4 === 0) sphere('a1:garden-flower', px, .55, 25.1, .07, .07, .07, i % 8 ? M.red : M.blue, 6); } }

  const roomCenters = new Map<number, Vector3>();
  for (const room of A1_ROOMS) {
    const xs = room.cells.map(cell => worldCell(cell.col, cell.row).x), zs = room.cells.map(cell => worldCell(cell.col, cell.row).z);
    const center = new Vector3((Math.min(...xs) + Math.max(...xs)) / 2, 0, (Math.min(...zs) + Math.max(...zs)) / 2); roomCenters.set(room.id, center);
    const roomStatics: Mesh[] = [], roomFloorParts: Mesh[] = []; bucket = roomFloorParts;
    for (const roomCell of room.cells) {
      const p = worldCell(roomCell.col, roomCell.row), seed = roomCell.col * 23 + roomCell.row * 19 + room.id * 17;
      box(`a1:room-${room.id}:grit-joint`, p.x, -.045, p.z, 1.51, .09, 1.51, M.cellDark);
      const pieces: Array<{ dx: number; dz: number; width: number; depth: number }> = [];
      if (seed % 8 === 0) {
        for (let part = 0; part < 4; part++) pieces.push({ dx: part % 2 ? .36 : -.36, dz: part > 1 ? .36 : -.36, width: .69 + (part % 2) * .08, depth: .68 + (part % 3) * .05 });
      } else if (seed % 6 === 0) {
        for (const side of [-1, 1]) pieces.push({ dx: Math.sin(seed) * .05, dz: side * .34, width: 1.31 + (side > 0 ? .08 : 0), depth: .76 + (seed % 2) * .09 });
      } else pieces.push({ dx: Math.sin(seed * 1.23) * .08, dz: Math.cos(seed * .77) * .08, width: 1.21 + (Math.abs(seed) % 6) * .04, depth: 1.18 + (Math.abs(seed * 5) % 6) * .045 });
      pieces.forEach((piece, index) => {
        const tile = rock(`a1:room-${room.id}:irregular-floor-stone`, p.x + piece.dx, .04 + ((seed + index) % 3) * .014, p.z + piece.dz, piece.width, .075 + ((seed + index) % 2) * .022, piece.depth, seed + index * 13, cellMaterials[(seed + index * 3) % cellMaterials.length]!);
        worldSurfaceUV(tile, 6.2); tile.rotation.set(Math.sin(seed + index) * .014, Math.sin(seed * 1.12 + index) * .14, Math.cos(seed * .91 + index) * .014);
      });
      if (seed % 13 === 0) rock(`a1:room-${room.id}:floor-chip`, p.x - .31, .105, p.z + .26, .34, .045, .28, seed + 810, M.earth);
    }
    const roomFloors = mergeDecoration(scene, root, roomFloorParts, `a1:room-${room.id}:lit-floor`, true); litRoomSurfaces.push(...roomFloors); bucket = roomStatics;
    const roomKeys = new Set(room.cells.map(cell => key(cell.col, cell.row)));
    const entry = worldCell(room.entry.col, room.entry.row);
    const directions = [{ dc: 0, dr: -1, normal: new Vector3(0, 0, -1), face: 0 }, { dc: -1, dr: 0, normal: new Vector3(-1, 0, 0), face: 1 }, { dc: 1, dr: 0, normal: new Vector3(1, 0, 0), face: 2 }, { dc: 0, dr: 1, normal: new Vector3(0, 0, 1), face: 3 }];
    for (const direction of directions) {
      const upper: Mesh[] = [];
      for (const roomCell of room.cells) {
        if (roomKeys.has(key(roomCell.col + direction.dc, roomCell.row + direction.dr))) continue;
        if (roomCell.col === room.entry.col && roomCell.row === room.entry.row && direction.dr === 1) continue;
        const p = worldCell(roomCell.col, roomCell.row), x = p.x + direction.dc * .75, z = p.z + direction.dr * .75;
        const horizontal = direction.dr !== 0, width = horizontal ? 1.58 : .42, depth = horizontal ? .42 : 1.58;
        box('a1:wall-foot', x, .28, z, width, .48, depth, M.ashlar);
        const previous = bucket; bucket = upper;
        const wallMaterial = direction.face === 3 ? M.facade : M.carved;
        const segment = box('a1:excavated-wall', x, 1.65, z, width, 2.55, depth, wallMaterial); segment.rotation.y = Math.sin(room.id * 17 + roomCell.col * 7 + roomCell.row) * .012;
        box('a1:wall-coping', x, 2.96, z, width + .12, .17, depth + .12, wallMaterial); bucket = previous;
        if (direction.face !== 3 && (roomCell.col + roomCell.row) % 3 === 0) rock('a1:wall-irregularity', x - direction.dc * .12, 2.25, z - direction.dr * .12, horizontal ? .72 : .38, .72, horizontal ? .38 : .72, room.id * 40 + roomCell.col + roomCell.row, M.carved);
      }
      if (direction.face === 3) {
        const previous = bucket; bucket = upper;
        rock('a1:facade-lintel', entry.x, 2.72, entry.z + .42, 2.15, .48, .58, room.id * 91, M.facade);
        rock('a1:facade-overhang', entry.x, 3.12, entry.z + .2, 2.72, .3, .82, room.id * 93, M.carved);
        bucket = previous;
      }
      if (upper.length) {
        const group = mergeDecoration(scene, root, upper, `a1:room-${room.id}:face-${direction.face}`);
        if (direction.face === 3) facades.set(room.id, group); else walls.push({ roomId: room.id, meshes: group, normal: direction.normal, center });
      }
    }
    const roofParts: Mesh[] = [], previousBucket = bucket; bucket = roofParts;
    const roofCells = room.cells.filter(roomCell => roomCell.col !== room.entry.col || roomCell.row !== room.entry.row);
    const roofXs = roofCells.map(roomCell => worldCell(roomCell.col, roomCell.row).x), roofZs = roofCells.map(roomCell => worldCell(roomCell.col, roomCell.row).z);
    const roofMinX = Math.min(...roofXs), roofMaxX = Math.max(...roofXs), roofMinZ = Math.min(...roofZs), roofMaxZ = Math.max(...roofZs);
    const roofCenterX = (roofMinX + roofMaxX) / 2, roofCenterZ = (roofMinZ + roofMaxZ) / 2, roofWidth = roofMaxX - roofMinX + 2.35, roofDepth = roofMaxZ - roofMinZ + 2.1;
    const ceiling = rock(`a1:room-${room.id}:mountain-ceiling`, roofCenterX, 3.38 + (room.id % 2) * .08, roofCenterZ - .18, roofWidth, .82 + (room.id % 3) * .12, roofDepth, room.id * 101, M.cliff); worldSurfaceUV(ceiling, 22);
    ceiling.rotation.x = Math.sin(room.id * .7) * .018; ceiling.rotation.z = Math.cos(room.id * .9) * .018;
    for (let outcrop = 0; outcrop < 2; outcrop++) { const angle = room.id * 1.7 + outcrop * 2.1, roofRock = rock(`a1:room-${room.id}:roof-outcrop`, roofCenterX + Math.sin(angle) * roofWidth * .28, 3.82 + (outcrop % 2) * .16, roofCenterZ + Math.cos(angle) * roofDepth * .25, 1.5 + (outcrop % 2) * .7, .65 + outcrop * .12, 1.1 + ((room.id + outcrop) % 2) * .5, room.id * 151 + outcrop, M.cliff); worldSurfaceUV(roofRock, 22); }
    roofs.set(room.id, mergeDecoration(scene, root, roofParts, `a1:room-${room.id}:mountain-roof`));
    bucket = previousBucket;
    for (const side of [-1, 1]) { rock('a1:entry-jamb', entry.x + side * .72, .75, entry.z - .15, .48, 1.48, .66, room.id * 10 + side, M.ashlar); rock('a1:entry-shoulder', entry.x + side * .9, 1.85, entry.z - .34, .62, 1.15, .9, room.id * 12 + side, M.carved); }
    for (let step = 0; step < 3; step++) { const stone = rock('a1:worn-threshold', entry.x + Math.sin(room.id + step) * .07, .075, entry.z + .25 + step * .54, 1.22, .09, .5, room.id * 5 + step, M.plaza); stone.rotation.y = Math.sin(room.id * 3 + step) * .06; }
    furnishRoom(room, roomStatics);
    const torchX = entry.x + (room.id % 2 ? .96 : -.96), torchZ = entry.z - 1.3;
    const bracket = box('a1:torch-bracket', torchX, 1.72, torchZ, .12, .12, .62, M.metal); bracket.rotation.x = -.18;
    cylinder('a1:torch-handle', torchX, 1.82, torchZ + .18, .72, .11, M.darkWood, 8).rotation.x = -.28;
    box('a1:torch-wrap', torchX, 2.08, torchZ + .09, .26, .34, .26, M.linen); flame(`a1:room-${room.id}:torch-flame`, torchX, 2.35, torchZ + .03, 1.05);
    const torchLight = new PointLight(`a1:room-${room.id}:torch-light`, new Vector3(torchX, 2.3, torchZ), scene); torchLight.diffuse = Color3.FromHexString('#ff9b43'); torchLight.range = 7.5; torchLight.metadata = { roomId: room.id };
    const perRoomLightTargets = [...roomFloors, ...walls.filter(wall => wall.roomId === room.id).flatMap(wall => wall.meshes)]; torchLight.includedOnlyMeshes = perRoomLightTargets;
    for (const candleLight of candleLights) if (candleLight.metadata?.roomId === room.id) candleLight.includedOnlyMeshes = perRoomLightTargets;
    fireLights.push(torchLight);
    statics.push(...roomStatics); bucket = statics;
  }

  // The canon cells are unequal and leave small pockets of exposed cliff
  // between them. Dress those pockets as carved rock instead of bare dirt.
  const roomAt = new Map(A1_ROOMS.flatMap(room => room.cells.map(cell => [key(cell.col, cell.row), room.id] as const)));
  const roomGapBucket = bucket; bucket = cliffMeshes;
  for (let row = 2; row <= 10; row++) for (let col = 1; col <= 45; col++) {
    if (A1_ROOM_CELL_KEYS.has(key(col, row))) continue;
    const nearbyRooms = new Set<number>();
    for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) {
      if (Math.abs(dc) + Math.abs(dr) > 2) continue;
      const roomId = roomAt.get(key(col + dc, row + dr));
      if (roomId !== undefined) nearbyRooms.add(roomId);
    }
    if (nearbyRooms.size < 2 || (col * 3 + row * 5) % 3 !== 0) continue;
    const p = worldCell(col, row), seed = col * 29 + row * 43;
    const rubble = organicBoulder('a1:cell-gap-outcrop', p.x, .16, p.z, .92 + (seed % 4) * .14, .38 + (seed % 3) * .12, .84 + (seed % 5) * .1, seed, M.cliff);
    rubble.rotation.x = Math.sin(seed) * .08; rubble.rotation.z = Math.cos(seed * .7) * .12;
  }
  bucket = roomGapBucket;

  function shelfUnit(name: string, x: number, z: number, width: number, levels: number, material = M.wood) { for (const dx of [-width / 2, width / 2]) box(`${name}:upright`, x + dx, .95, z, .12, 1.85, .42, material); for (let level = 0; level < levels; level++) box(`${name}:shelf`, x, .18 + level * (1.55 / Math.max(1, levels - 1)), z, width + .12, .11, .52, material); }
  function candlePair(x: number, z: number, roomId: number) { for (const offset of [-.18, .18]) { cylinder('a1:desk-candle', x + offset, .98, z, .22 + (offset > 0 ? .08 : 0), .09, M.linen, 10); flame(`a1:room-${roomId}:candle`, x + offset, 1.14 + (offset > 0 ? .04 : 0), z, .34); } const light = new PointLight(`a1:room-${roomId}:candle-light`, new Vector3(x, 1.3, z), scene); light.diffuse = Color3.FromHexString('#ffd39a'); light.range = 4.1; light.metadata = { roomId }; candleLights.push(light); }
  function furnishRoom(room: A1RoomSpec, roomStatics: Mesh[]) {
    const previous = bucket; bucket = roomStatics;
    const cloth = room.role === 'varnoth' ? M.blue : room.role === 'myla' ? M.red : room.role.includes('kobolds') ? M.green : M.linen;
    for (const item of room.furniture) {
      const p = worldCell(item.cell.col, item.cell.row);
      if (item.kind === 'bed') { box('a1:bed-frame', p.x, .38, p.z, 1.34, .28, 2.1, M.darkWood); sphere('a1:mattress', p.x, .62, p.z, 1.35, .42, 2.02, M.linen); box('a1:blanket', p.x, .87, p.z + .42, 1.28, .09, 1.08, cloth); sphere('a1:pillow', p.x, .87, p.z - .7, .92, .24, .48, M.linen); box('a1:headboard', p.x, .79, p.z - 1.03, 1.42, 1.18, .14, M.wood); shadow(p.x, p.z, 1.65, 2.42); }
      else if (item.kind === 'nightstand') { box('a1:nightstand', p.x, .39, p.z, .72, .72, .66, M.wood); box('a1:nightstand-drawer', p.x, .49, p.z + .34, .58, .21, .035, M.darkWood); sphere('a1:drawer-pull', p.x, .49, p.z + .39, .08, .07, .055, M.brass, 7); }
      else if (item.kind === 'desk') { box('a1:desk-top', p.x, .82, p.z, 1.22, .13, .82, M.wood); for (const dx of [-.5, .5]) for (const dz of [-.31, .31]) box('a1:desk-leg', p.x + dx, .4, p.z + dz, .09, .8, .09, M.darkWood); box('a1:desk-journal', p.x - .25, .91, p.z, .42, .06, .33, cloth); box('a1:desk-parchment', p.x + .26, .905, p.z + .08, .28, .025, .3, M.paper); candlePair(p.x, p.z - .24, room.id); shadow(p.x, p.z, 1.45, 1.08); }
      else if (item.kind === 'chair') { box('a1:chair-seat', p.x, .48, p.z, .64, .11, .64, M.wood); box('a1:chair-back', p.x, .84, p.z + .3, .64, .75, .09, M.wood); for (const dx of [-.24, .24]) for (const dz of [-.24, .24]) box('a1:chair-leg', p.x + dx, .24, p.z + dz, .08, .48, .08, M.darkWood); }
      else if (item.kind === 'hammock') { const path: Vector3[][] = []; for (let step = 0; step <= 12; step++) { const t = step / 12, z = p.z - .68 + t * 1.36, y = 1.2 - Math.sin(t * Math.PI) * .44; path.push([new Vector3(p.x - .38, y, z), new Vector3(p.x + .38, y, z)]); } add(MeshBuilder.CreateRibbon('a1:kobold-hammock', { pathArray: path, sideOrientation: Mesh.DOUBLESIDE }, scene), Vector3.Zero(), cloth); for (const dz of [-.72, .72]) box('a1:hammock-post', p.x, .72, p.z + dz, .08, 1.44, .08, M.darkWood); shadow(p.x, p.z, .98, 1.48); }
      else if (item.kind === 'tools') { box('a1:myla-workbench', p.x, .66, p.z, 1.35, 1.18, 1.06, M.wood); for (let tool = 0; tool < 7; tool++) { const x = p.x - .5 + (tool % 4) * .34, z = p.z - .25 + Math.floor(tool / 4) * .45; const handle = box('a1:myla-tool-handle', x, 1.3, z, .055, .05, .31, M.darkWood); handle.rotation.y = (tool - 3) * .16; if (tool % 2 === 0) box('a1:myla-tool-head', x, 1.32, z - .13, .2, .11, .1, M.metal); else cylinder('a1:myla-gear', x, 1.33, z - .1, .05, .17, M.brass, 8).rotation.z = Math.PI / 2; } }
    }
    const center = roomCenters.get(room.id)!;
    if (room.role === 'free') { shelfUnit('a1:free-linen-shelf', center.x - 2.1, center.z - 2.1, 1.35, 3); for (let i = 0; i < 5; i++) box('a1:free-folded-linen', center.x - 2.55 + i * .23, .55 + (i % 2) * .5, center.z - 1.82, .2, .17, .36, i % 2 ? M.blue : M.linen); box('a1:free-bench', center.x + 1.45, .3, center.z + 1.2, 1.45, .22, .52, M.wood); }
    else if (room.role === 'tarak') { shelfUnit('a1:tarak-herb-shelf', center.x + 1.25, center.z - 3.7, 1.1, 4); for (let i = 0; i < 8; i++) cylinder('a1:tarak-jar', center.x + .82 + (i % 3) * .37, .36 + Math.floor(i / 3) * .49, center.z - 3.38, .28, .2 + (i % 2) * .06, i % 3 ? M.pottery : M.brass, 9); for (let i = 0; i < 4; i++) plantCard(center.x - 1.25 + i * .36, 1.9, center.z - 3.55, .42, .7, i % 2, 0, Math.PI); }
    else if (room.role === 'varnoth') { shelfUnit('a1:varnoth-bookcase', center.x + 2.25, center.z - 2.45, 1.5, 4, M.darkWood); for (let i = 0; i < 11; i++) box('a1:varnoth-book', center.x + 1.65 + (i % 5) * .27, .45 + Math.floor(i / 5) * .52, center.z - 2.15, .2, .38 + (i % 3) * .05, .28, i % 4 === 0 ? M.blue : M.paper); const shield = add(MeshBuilder.CreateDisc('a1:varnoth-shield', { radius: .46, tessellation: 18 }, scene), new Vector3(center.x - 2.45, 1.3, center.z - 1), M.brass); shield.rotation.y = Math.PI / 2; box('a1:varnoth-spear', center.x - 2.37, 1.25, center.z + .45, .07, 2.5, .07, M.darkWood).rotation.x = .12; }
    else if (room.role === 'myla') { shelfUnit('a1:myla-parts-shelf', center.x - 2.25, center.z - 2.7, 1.65, 4); shelfUnit('a1:myla-crate-shelf', center.x + 2.2, center.z - 2.7, 1.25, 3, M.darkWood); for (let i = 0; i < 12; i++) sphere('a1:myla-parts', center.x - 2.86 + (i % 5) * .3, .38 + Math.floor(i / 5) * .54, center.z - 2.4, .13, .12 + (i % 2) * .08, .13, i % 2 ? M.brass : M.metal, 7); for (let i = 0; i < 3; i++) box('a1:myla-crate', center.x + 1.7 + (i % 2) * .67, .3 + Math.floor(i / 2) * .58, center.z + 2.05, .62, .56, .62, M.wood); }
    else if (room.role === 'kobolds-west') { shelfUnit('a1:kobold-west-shelf', center.x, center.z - 4.7, 1.6, 3); for (let i = 0; i < 7; i++) sphere('a1:kobold-bundle', center.x - .62 + (i % 4) * .4, .35 + Math.floor(i / 4) * .42, center.z - 4.36, .34, .2, .28, i % 2 ? M.green : M.linen); for (let i = 0; i < 3; i++) cylinder('a1:kobold-basket', center.x - .7 + i * .7, .31, center.z + 4, .55, .48, M.pottery, 10); }
    else { shelfUnit('a1:kobold-east-cubbies', center.x + 2.7, center.z - 3.5, 1.5, 4, M.darkWood); for (let i = 0; i < 9; i++) box('a1:kobold-keepsake', center.x + 2.12 + (i % 4) * .35, .37 + Math.floor(i / 4) * .48, center.z - 3.18, .24, .22, .24, i % 3 === 0 ? M.brass : M.pottery); box('a1:kobold-low-table', center.x - 2.2, .32, center.z + 2.2, 1.25, .18, .82, M.wood); for (let i = 0; i < 4; i++) cylinder('a1:kobold-stool', center.x - 2.72 + i * .35, .24, center.z + 2.75, .45, .28, M.darkWood, 8); }
    bucket = previous;
  }

  const statue = worldCell(A1_STATUE_CELL.col, A1_STATUE_CELL.row);
  cylinder('a1:astalagan-pedestal', statue.x, .38, statue.z, .76, 1.65, M.ashlar, 8); cylinder('a1:astalagan-plinth', statue.x, .82, statue.z, .22, 1.22, M.limestone, 8);
  sphere('a1:astalagan-body', statue.x, 1.62, statue.z, .82, 1.1, .66, M.limestone, 10).rotation.x = -.16;
  sphere('a1:astalagan-chest', statue.x, 1.95, statue.z - .38, .58, .72, .55, M.limestone, 9);
  sphere('a1:astalagan-neck', statue.x, 2.3, statue.z - .5, .36, .76, .34, M.limestone, 8).rotation.x = -.4;
  sphere('a1:astalagan-head', statue.x, 2.78, statue.z - .78, .48, .37, .64, M.limestone, 9);
  sphere('a1:astalagan-muzzle', statue.x, 2.66, statue.z - 1.2, .36, .25, .43, M.limestone, 7);
  for (const side of [-1, 1]) {
    for (const front of [-1, 1]) {
      const leg = cylinder('a1:astalagan-leg', statue.x + side * .48, 1.3, statue.z + front * .36, .86, .22, M.limestone, 8); leg.rotation.x = front * .16; leg.rotation.z = side * .11;
      sphere('a1:astalagan-claw', statue.x + side * .5, .98, statue.z + front * .48 - .08, .3, .16, .4, M.limestone, 7);
    }
    const wing = add(MeshBuilder.CreateDisc('a1:astalagan-wing', { radius: 1.05, tessellation: 3 }, scene), new Vector3(statue.x + side * .72, 2.08, statue.z + .14), M.limestone);
    wing.scaling.set(1, 1.3, 1); wing.rotation.set(-.1, side * .42, side * .32);
    const rib = cylinder('a1:astalagan-wing-rib', statue.x + side * .63, 2.08, statue.z + .14, 1.45, .11, M.limestone, 7); rib.rotation.z = side * .72;
    const horn = add(MeshBuilder.CreateCylinder('a1:astalagan-horn', { height: .55, diameterTop: .02, diameterBottom: .16, tessellation: 7 }, scene), new Vector3(statue.x + side * .2, 3.08, statue.z - .72), M.limestone); horn.rotation.x = -.32; horn.rotation.z = side * .18;
  }
  const tail = add(MeshBuilder.CreateTorus('a1:astalagan-tail', { diameter: 1.25, thickness: .18, tessellation: 18 }, scene), new Vector3(statue.x, 1.12, statue.z + .43), M.limestone); tail.rotation.x = Math.PI / 2; tail.scaling.z = .65; shadow(statue.x, statue.z, 2.1, 1.8);

  const fire = worldCell(A1_FIRE_CELL.col, A1_FIRE_CELL.row);
  for (let i = 0; i < 12; i++) { const angle = i / 12 * Math.PI * 2; rock('a1:fire-ring-stone', fire.x + Math.cos(angle) * .72, .19, fire.z + Math.sin(angle) * .72, .52, .32, .46, 300 + i, M.limestone); }
  for (const angle of [-.62, .62]) { const log = cylinder('a1:fire-log', fire.x, .32, fire.z, 1.5, .2, M.darkWood, 8); log.rotation.z = Math.PI / 2; log.rotation.y = angle; }
  flame('a1:plaza-fire', fire.x, .72, fire.z, 2.15); const plazaLight = new PointLight('a1:plaza-fire-light', new Vector3(fire.x, 1.1, fire.z), scene); plazaLight.diffuse = Color3.FromHexString('#ff8b36'); plazaLight.range = 14; fireLights.push(plazaLight);
  const firePool = add(MeshBuilder.CreateDisc('a1:plaza-fire-bounce', { radius: 5, tessellation: 28 }, scene), new Vector3(fire.x, .1, fire.z), warmPool); firePool.rotation.x = Math.PI / 2;
  for (const side of [-1, 1]) {
    const benchX = fire.x + side * 3;
    box('a1:fire-bench-seat', benchX, .53, fire.z, 1.18, .2, 2.35, M.wood);
    for (const dz of [-.82, .82]) box('a1:fire-bench-leg', benchX, .27, fire.z + dz, .18, .54, .18, M.darkWood);
    const back = box('a1:fire-bench-back', benchX + side * .48, .94, fire.z, .13, .85, 2.25, M.wood); back.rotation.z = -side * .08;
    shadow(benchX, fire.z, 1.35, 2.65);
  }
  const tripodX = fire.x + 1.15;
  for (let leg = 0; leg < 3; leg++) { const angle = leg / 3 * Math.PI * 2; const pole = cylinder('a1:fire-tripod', tripodX + Math.cos(angle) * .32, .88, fire.z + Math.sin(angle) * .32, 1.8, .07, M.metal, 7); pole.rotation.z = Math.cos(angle) * .18; pole.rotation.x = Math.sin(angle) * .18; }
  const kettle = cylinder('a1:fire-kettle', tripodX, .78, fire.z, .48, .58, M.metal, 12); kettle.scaling.y = .8;
  const kettleHandle = add(MeshBuilder.CreateTorus('a1:fire-kettle-handle', { diameter: .64, thickness: .055, tessellation: 18 }, scene), new Vector3(tripodX, 1.12, fire.z), M.metal); kettleHandle.rotation.x = Math.PI / 2; kettleHandle.scaling.y = .72;
  for (let i = 0; i < 6; i++) { const log = cylinder('a1:woodpile-log', fire.x - 1.3 + (i % 3) * .32, .19 + Math.floor(i / 3) * .18, fire.z + 1.48, .92, .17, M.darkWood, 8); log.rotation.z = Math.PI / 2; log.rotation.y = (i % 3 - 1) * .12; }
  cylinder('a1:fire-water-bucket', fire.x - 1.35, .38, fire.z - 1.45, .64, .58, M.wood, 10);

  if (typeof document !== 'undefined') {
    const particleTexture = (name: string, center: string, edge: string) => {
      const texture = new DynamicTexture(name, { width: 64, height: 64 }, scene, false);
      const context = texture.getContext(); const gradient = context.createRadialGradient(32, 32, 2, 32, 32, 31);
      gradient.addColorStop(0, center); gradient.addColorStop(1, edge); context.fillStyle = gradient; context.fillRect(0, 0, 64, 64); texture.update(); return texture;
    };
    const softParticle = particleTexture('a1:soft-particle-vfx', 'rgba(255,255,255,.95)', 'rgba(255,255,255,0)');
    const smokeParticle = particleTexture('a1:smoke-particle-vfx', 'rgba(105,98,88,.55)', 'rgba(68,72,75,0)');
    const smoke = new ParticleSystem('a1:fire-smoke-vfx', 72, scene); smoke.particleTexture = smokeParticle; smoke.emitter = new Vector3(fire.x, 1.05, fire.z); smoke.minEmitBox = new Vector3(-.22, 0, -.22); smoke.maxEmitBox = new Vector3(.22, .15, .22); smoke.color1 = new Color4(.42, .39, .35, .34); smoke.color2 = new Color4(.27, .3, .32, .22); smoke.colorDead = new Color4(.18, .2, .22, 0); smoke.minSize = .35; smoke.maxSize = 1.3; smoke.minLifeTime = 1.8; smoke.maxLifeTime = 3.8; smoke.emitRate = 12; smoke.direction1 = new Vector3(-.16, .7, -.08); smoke.direction2 = new Vector3(.22, 1.15, .15); smoke.gravity = new Vector3(.03, .055, 0); smoke.updateSpeed = .018; smoke.blendMode = ParticleSystem.BLENDMODE_STANDARD; smoke.start(); vfxSystems.push(smoke);
    const embers = new ParticleSystem('a1:fire-embers-vfx', 42, scene); embers.particleTexture = softParticle; embers.emitter = new Vector3(fire.x, .72, fire.z); embers.minEmitBox = new Vector3(-.3, 0, -.3); embers.maxEmitBox = new Vector3(.3, .2, .3); embers.color1 = new Color4(1, .54, .16, .9); embers.color2 = new Color4(1, .82, .35, .7); embers.colorDead = new Color4(.65, .16, .04, 0); embers.minSize = .025; embers.maxSize = .075; embers.minLifeTime = .65; embers.maxLifeTime = 1.7; embers.emitRate = 8; embers.direction1 = new Vector3(-.18, .55, -.12); embers.direction2 = new Vector3(.18, 1.25, .12); embers.gravity = new Vector3(.08, .1, 0); embers.updateSpeed = .022; embers.blendMode = ParticleSystem.BLENDMODE_ADD; embers.start(); vfxSystems.push(embers);
    const wind = new ParticleSystem('a1:coastal-wind-vfx', 96, scene); wind.particleTexture = softParticle; wind.emitter = new Vector3(36, 2.6, 16); wind.minEmitBox = new Vector3(-38, -.8, -14); wind.maxEmitBox = new Vector3(38, 4.8, 12); wind.color1 = new Color4(.78, .83, .78, .1); wind.color2 = new Color4(.72, .76, .7, .04); wind.colorDead = new Color4(.8, .85, .8, 0); wind.minSize = .015; wind.maxSize = .045; wind.minLifeTime = 4; wind.maxLifeTime = 8; wind.emitRate = 8; wind.direction1 = new Vector3(.65, -.02, .06); wind.direction2 = new Vector3(1.35, .08, .22); wind.updateSpeed = .02; wind.start(); vfxSystems.push(wind);
    for (let wave = 0; wave < 5; wave++) {
      const spray = new ParticleSystem(`a1:wave-break-${wave}-vfx`, 46, scene); spray.particleTexture = softParticle; spray.emitter = new Vector3(5 + wave * 15.5, -8.35 + (wave % 2) * .34, 32.1 + Math.sin(wave) * .5); spray.minEmitBox = new Vector3(-3.1, 0, -.5); spray.maxEmitBox = new Vector3(3.1, .34, .5); spray.color1 = new Color4(.82, .96, 1, .62); spray.color2 = new Color4(.65, .86, .91, .36); spray.colorDead = new Color4(.7, .9, 1, 0); spray.minSize = .18; spray.maxSize = .62; spray.minScaleX = .45; spray.maxScaleX = 1.05; spray.minScaleY = 1.2; spray.maxScaleY = 2.2; spray.minLifeTime = .62; spray.maxLifeTime = 1.5; spray.emitRate = 4; spray.direction1 = new Vector3(-.42, 1.05, -.76); spray.direction2 = new Vector3(.42, 2.2, -.18); spray.gravity = new Vector3(0, -1.02, 0); spray.updateSpeed = .018; spray.start(); vfxSystems.push(spray);
    }
  }

  for (let i = 0; i < 38; i++) { const x = 1.5 + i * 1.82 + Math.sin(i * 1.4) * .38; if (i % 3 === 0) plantCard(x, 2.25 + (i % 4) * .28, 2.85, 1.05, 1.45, 2, 0); shrub(x, 3.05 + Math.sin(i) * .28, .62 + (i % 4) * .12, i + 80, .15); }
  for (let i = 0; i < 34; i++) { const x = 1.5 + i * 2.05 + Math.sin(i * 2.2) * .35; shrub(x, 26.05 + Math.cos(i) * .25, .7 + (i % 3) * .18, i + 110); if (i % 4 === 0) rock('a1:plaza-edge-rock', x, -.05, 26.6, 1.7, .85, 1.55, 350 + i, M.cliff); }

  const merged = mergeDecoration(scene, root, statics, 'a1:static', true), ridge = mergeDecoration(scene, root, cliffMeshes, 'a1:ridge', true);
  plazaLight.includedOnlyMeshes = [...merged, ...ridge];
  const lighting = createRestLighting(scene, definition.id);
  const coastFill = new PointLight('a1:coastal-rim-light', new Vector3(36, 9, 34), scene); coastFill.diffuse = Color3.FromHexString('#89aabc'); coastFill.specular = Color3.FromHexString('#718d9e'); coastFill.range = 64; coastFill.includedOnlyMeshes = [...ridge];
  scene.getLightByName('terrain-ambient')?.setEnabled(false); for (const light of scene.lights) if (light.name.startsWith(`light:${definition.id}-`)) light.setEnabled(false);
  let shadowCache: ShadowGenerator | undefined;
  if (typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches) {
    const shadows = new ShadowGenerator(1536, lighting.sun); shadowCache = shadows; shadows.getShadowMap()!.refreshRate = 0; shadows.usePercentageCloserFiltering = true; shadows.filteringQuality = ShadowGenerator.QUALITY_LOW; shadows.bias = .0025; shadows.normalBias = .027;
    const geometry = [...merged, ...ridge, ...litRoomSurfaces, ...walls.flatMap(wall => wall.meshes), ...facades.values(), ...roofs.values()].flat().filter((mesh, index, all) => all.indexOf(mesh) === index);
    for (const mesh of geometry) { mesh.receiveShadows = true; if (![M.shade, ...foliageVariants, warmPool, M.plaza, M.cellFloor].includes(mesh.material as StandardMaterial)) shadows.addShadowCaster(mesh, false); }
    const glow = new GlowLayer('a1:fire-glow-v5', scene, { mainTextureRatio: .25, blurKernelSize: 24 }); glow.intensity = .42; for (const mesh of flameMeshes) glow.addIncludedOnlyMesh(mesh);
  }
  const interactionPoints = definition.camp!.interactionPoints;
  const rings = interactionPoints.map(point => { const objectCell = point.objectCell ?? point.cell; const ring = MeshBuilder.CreateTorus(`${point.id}:dm-interaction-halo`, { diameter: 1.14, thickness: .055, tessellation: 24 }, scene); ring.position = worldCell(objectCell.col, objectCell.row); ring.position.y = .1; ring.material = M.halo; ring.parent = root; ring.isPickable = false; ring.visibility = 0; return ring; });
  let highlights: boolean | string | null = false, lastTime = 0;
  const update = (time: number, phase?: CampRestPhase | null, _interactions?: unknown, focusCell?: Cell | null) => {
    const dark = darkness[phase ?? 'arrival'], day = 1 - dark, dt = Math.min(.1, Math.max(.016, time - lastTime)); lastTime = time;
    const activeRoom = focusCell ? A1_ROOMS.find(room => room.cells.some(cell => cell.col === focusCell.col && cell.row === focusCell.row))?.id : undefined;
    lighting.update(dark);
    lighting.ambient.intensity *= 1.12 + day * .46;
    lighting.sun.intensity *= .94 + day * .42;
    lighting.ambient.groundColor = Color3.FromHexString(dark > .7 ? '#1b3043' : '#625b4e');
    coastFill.intensity = .11 + dark * .34;
    backdrop.update(time, dark);
    fireLights.forEach((light, index) => { const roomId = Number(light.metadata?.roomId ?? 0); light.intensity = roomId && roomId !== activeRoom ? 0 : .78 + dark * 2.55 + Math.sin(time * 9.2 + index * 2.1) * .11 + Math.sin(time * 14.7 + index) * .045; });
    candleLights.forEach((light, index) => { const roomId = Number(light.metadata?.roomId ?? 0); light.intensity = roomId !== activeRoom ? 0 : .14 + dark * .44 + Math.sin(time * 7.1 + index) * .026; });
    flameMeshes.forEach((mesh, index) => { const roomId = Number(mesh.name.match(/a1:room-(\d+)/)?.[1] ?? 0); mesh.visibility = roomId && roomId !== activeRoom ? 0 : 1; const baseX = Number(mesh.metadata?.baseX ?? .18), baseY = Number(mesh.metadata?.baseY ?? .34), baseZ = Number(mesh.metadata?.baseZ ?? .18), phaseOffset = Number(mesh.metadata?.phase ?? index); const pulse = 1 + Math.sin(time * 10.4 + phaseOffset) * .11 + Math.sin(time * 17.3 + index) * .035; mesh.scaling.x = baseX * pulse; mesh.scaling.y = baseY * (1 + Math.sin(time * 8.2 + phaseOffset) * .16); mesh.scaling.z = baseZ * (2 - pulse); });
    // Atlas textures are albedo, not baked illumination. Low emission preserves
    // warm readability at night while letting occlusion and lamps shape relief.
    const materialLift = .065 + day * .085;
    for (const material of readableMaterials) material.emissiveColor.set(material.diffuseColor.r * materialLift, material.diffuseColor.g * materialLift, material.diffuseColor.b * materialLift);
    warmPool.alpha = .1 + dark * .24;
    foliageVariants.forEach((material, index) => material.emissiveColor.set(.04 + day * (.06 + index * .006), .045 + day * (.07 + index * .004), .035 + day * .055));
    vfxSystems.forEach(system => { if (system.name.includes('smoke')) system.emitRate = 9 + dark * 6; else if (system.name.includes('embers')) system.emitRate = 5 + dark * 7; else if (system.name.includes('wind')) system.emitRate = 5 + dark * 4; else if (system.name.includes('wave-break')) { const index = Number(system.name.match(/wave-break-(\d+)/)?.[1] ?? 0), crest = Math.max(0, Math.sin(time * .92 + index * 1.27)); system.emitRate = 3 + crest * crest * 52; } });
    scene.clearColor.set(.035 + day * .19, .065 + day * .26, .11 + day * .32, 1); scene.fogMode = 0;
    const camera = scene.activeCamera;
    for (const [roomId, meshes] of facades) { const reveal = roomId === activeRoom ? 1 : -1; updateCutaway(meshes, reveal, dt); if (meshes.some(mesh => Math.abs(mesh.scaling.y - (activeRoom === roomId ? .035 : 1)) > .003)) shadowCache?.getShadowMap()?.resetRefreshCounter(); }
    for (const [roomId, meshes] of roofs) { const target = roomId === activeRoom ? 0 : 1; for (const mesh of meshes) { mesh.visibility += (target - mesh.visibility) * Math.min(1, dt * 10); if (mesh.visibility < .01) mesh.visibility = 0; } }
    if (camera) { const position = camera.globalPosition; for (const wall of walls) { const direction = position.subtract(wall.center); direction.y = 0; direction.normalize(); const dot = Vector3.Dot(wall.normal, direction), facing = wall.normal.x !== 0 ? Math.abs(dot) - .13 : dot; updateCutaway(wall.meshes, facing, dt); if (wall.meshes.some(mesh => Math.abs(mesh.scaling.y - (facing > .18 ? .035 : 1)) > .003)) shadowCache?.getShadowMap()?.resetRefreshCounter(); } const behind = position.z < 2.4; for (const mesh of ridge) { if (foliageVariants.includes(mesh.material as StandardMaterial)) mesh.visibility = behind ? 0 : 1; else { mesh.visibility += ((behind ? .05 : 1) - mesh.visibility) * Math.min(1, dt * 9); if (mesh.visibility < .01) mesh.visibility = 0; } } }
    rings.forEach((ring, index) => {
      const pointId = interactionPoints[index]?.id;
      const highlighted = highlights === true || (typeof highlights === 'string' && highlights === pointId);
      ring.visibility = highlighted ? .56 + Math.sin(time * 2 + index) * .07 : 0;
    });
  };
  update(0, 'arrival');
  return { root, update, setInteractionHighlights: target => { highlights = target; } };
}
