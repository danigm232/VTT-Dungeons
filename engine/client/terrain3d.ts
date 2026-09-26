import { Camera } from '@babylonjs/core/Cameras/camera.js';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight.js';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight.js';
import { Layer } from '@babylonjs/core/Layers/layer.js';
import { PointLight } from '@babylonjs/core/Lights/pointLight.js';
import { Material } from '@babylonjs/core/Materials/material.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import type { BaseTexture } from '@babylonjs/core/Materials/Textures/baseTexture.js';
import type { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import type { LinesMesh } from '@babylonjs/core/Meshes/linesMesh.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import { Scene } from '@babylonjs/core/scene.js';
import type { Cell } from '../shared/campaign.js';
import type { TerrainDefinition, SurfaceAddress } from '../shared/terrain.js';
import { surfaceHeight } from '../shared/terrain.js';

export type Terrain3DView = { tiles: Map<string, Mesh>; grid: LinesMesh; grids: Map<string, LinesMesh>; deckDetails: Mesh[]; occluders: Mesh[]; structures: Mesh[]; lights: PointLight[]; camera: ArcRotateCamera };
const addressKey = (surfaceId: string, col: number, row: number) => `${surfaceId}:${col},${row}`;
const shipDeckTextureRepeatMeters = 4.5;
const shipWaterTextureRepeatMeters = 9;
const shipWaterBackdropRepeatMeters = 24;
// The painted texture's boards run vertically. Rotating UVs makes them follow
// the ship's length (world X), while keeping every tile continuous in world space.
const shipDeckUv = (x: number, z: number) => [z / shipDeckTextureRepeatMeters, x / shipDeckTextureRepeatMeters];
// Reuse the same hand-painted plank material on the hull, with board rows
// following the vessel's length and repeating vertically down its side.
const shipHullUv = (x: number, y: number) => [y / shipDeckTextureRepeatMeters, x / shipDeckTextureRepeatMeters];
const shipWaterUv = (x: number, z: number) => [z / shipWaterTextureRepeatMeters, x / shipWaterTextureRepeatMeters];
const shipWaterBackdropUv = (x: number, z: number) => [z / shipWaterBackdropRepeatMeters, x / shipWaterBackdropRepeatMeters];
// Map the scenic ocean once across the whole navigable world. Its underlying
// backdrop plane uses these same world coordinates, so the art remains
// continuous where walkable water meets the non-playable scenery.
const shipSeaArtworkUv = (x: number, z: number, terrain: TerrainDefinition) => [
  z / (terrain.rows * terrain.tileMeters), x / (terrain.cols * terrain.tileMeters)
];
// Let the navigable ocean dissolve into the scenic layer at the edge of the
// authored world, rather than showing a hard rectangular texture boundary.
const shipSeaEdgeAlpha = (x: number, z: number, terrain: TerrainDefinition) => {
  const inset = Math.min(x, z, terrain.cols * terrain.tileMeters - x, terrain.rows * terrain.tileMeters - z);
  return 0.08 + 0.92 * Math.max(0, Math.min(1, inset / (terrain.tileMeters * 3)));
};

/** Provisional, non-playable silhouettes give the mast view a sense of the
 * dragon-bone reef and the other wrecks from chapter 3. Sol can replace these
 * greybox forms with the approved art without changing the walkable ship. */
function addWreckBackdrop(scene: Scene, terrain: TerrainDefinition, tileMeters: number,
  deckTexture?: BaseTexture, hullTexture?: BaseTexture, reefTexture?: BaseTexture,
  paintedOcean = false) {
  if (!terrain.surfaces.some(surface => surface.id === 'c1-hull') || !terrain.surfaces.some(surface => surface.id === 'crow')) return;
  const marginMeters = Math.max(0, (terrain.cols - 44) * tileMeters / 2);
  const colors = {
    wreck: new StandardMaterial('wreck-backdrop:wood', scene),
    hull: new StandardMaterial('wreck-backdrop:hull', scene),
    bone: new StandardMaterial('wreck-backdrop:bone', scene),
    reef: new StandardMaterial('wreck-backdrop:reef', scene),
    seabed: new StandardMaterial('wreck-backdrop:seabed', scene)
  };
  colors.wreck.diffuseColor = Color3.FromHexString('#574331');
  colors.hull.diffuseColor = Color3.FromHexString('#332c29');
  colors.bone.diffuseColor = Color3.FromHexString('#999581');
  colors.reef.diffuseColor = Color3.FromHexString('#374145');
  colors.seabed.diffuseColor = Color3.FromHexString('#14282b');
  if (deckTexture) { colors.wreck.diffuseTexture = deckTexture; colors.wreck.diffuseColor = Color3.FromHexString('#b8ac91'); }
  if (hullTexture) { colors.hull.diffuseTexture = hullTexture; colors.hull.diffuseColor = Color3.FromHexString('#b0b6ad'); }
  if (reefTexture) { colors.reef.diffuseTexture = reefTexture; colors.reef.diffuseColor = Color3.White(); }
  for (const material of Object.values(colors)) material.specularColor = Color3.Black();
  const mark = (mesh: Mesh, kind: string, id: string, material: StandardMaterial) => {
    mesh.material = material; mesh.isPickable = false;
    mesh.metadata = { visualOnly: true, kind, id };
    return mesh;
  };
  const centerX = terrain.cols * tileMeters / 2, centerZ = terrain.rows * tileMeters / 2;
  // Low rocky ledges below the flooded hull hint at the submerged seabed.
  for (const [id, x, z, width, depth] of paintedOcean ? [] : [
    ['west', centerX - 43, centerZ, 18, 10], ['north', centerX, centerZ - 23, 18, 9],
    ['east', centerX + 43, centerZ + 2, 18, 10], ['south', centerX + 4, centerZ + 27, 20, 9]
  ] as const) {
    const ledge = MeshBuilder.CreateBox(`wreck-seabed:${id}`, { width, depth, height: .12 }, scene);
    ledge.position.set(x, -7.92, z); mark(ledge, 'seabed-blockout', id, colors.seabed);
  }
  // Four small, deliberately broken hull silhouettes sit outside the playable
  // vessel. They are background scenery, not another area for token movement.
  const wrecks = [
    { id: 'west', x: centerX - 42, z: centerZ - 2, length: 15, beam: 4.8, yaw: -.18 },
    { id: 'north', x: centerX - 2, z: centerZ - 22, length: 17, beam: 5.1, yaw: .12 },
    { id: 'east', x: centerX + 42, z: centerZ + 2, length: 16, beam: 4.6, yaw: -.22 },
    { id: 'south', x: centerX + 5, z: centerZ + 25, length: 14, beam: 4.3, yaw: .2 }
  ];
  for (const wreck of wrecks) {
    // A broken, tapered hull replaces the old rectangular silhouettes. These
    // meshes stay outside the navigable sea and never register as terrain.
    const outline = [[-.5, 0], [-.39, -.38], [-.25, -.5], [.27, -.5], [.5, 0], [.27, .5], [-.25, .5], [-.39, .38]] as const;
    const hull = new Mesh(`wreck-silhouette:hull:${wreck.id}`, scene), hullData = new VertexData();
    const hullPositions = outline.flatMap(([x, z]) => [x * wreck.length, -.08, z * wreck.beam])
      .concat(outline.flatMap(([x, z]) => [x * wreck.length * .9, -1.5, z * wreck.beam * .7]));
    const hullIndices: number[] = [];
    for (let index = 0; index < outline.length; index++) {
      const next = (index + 1) % outline.length;
      hullIndices.push(index, next, next + outline.length, index, next + outline.length, index + outline.length);
    }
    hullData.positions = hullPositions; hullData.indices = hullIndices;
    hullData.uvs = hullPositions.flatMap((value, index) => index % 3 === 0
      ? [value / 4.5, hullPositions[index + 1]! / 4.5] : []);
    const hullNormals: number[] = []; VertexData.ComputeNormals(hullPositions, hullIndices, hullNormals);
    hullData.normals = hullNormals; hullData.applyToMesh(hull);
    hull.position.set(wreck.x, -2.82, wreck.z); hull.rotation.y = wreck.yaw;
    mark(hull, 'distant-wreck-silhouette', `${wreck.id}:hull`, colors.hull);
    const deck = new Mesh(`wreck-silhouette:deck:${wreck.id}`, scene), deckData = new VertexData();
    deckData.positions = outline.flatMap(([x, z]) => [x * wreck.length, .015, z * wreck.beam]);
    deckData.indices = Array.from({ length: outline.length - 2 }, (_, index) => [0, index + 2, index + 1]).flat();
    deckData.uvs = outline.flatMap(([x, z]) => [z * wreck.beam / 4.5, x * wreck.length / 4.5]);
    const deckNormals: number[] = []; VertexData.ComputeNormals(deckData.positions, deckData.indices, deckNormals);
    deckData.normals = deckNormals; deckData.applyToMesh(deck);
    deck.position.copyFrom(hull.position); deck.rotation.y = wreck.yaw;
    mark(deck, 'distant-wreck-silhouette', `${wreck.id}:deck`, colors.wreck);
    const mast = MeshBuilder.CreateCylinder(`wreck-silhouette:mast:${wreck.id}`,
      { height: wreck.length * .58, diameter: .24, tessellation: 6 }, scene);
    mast.position.set(wreck.x - wreck.length * .08, -2.35, wreck.z + .25); mast.rotation.z = Math.PI / 2;
    mast.rotation.y = wreck.yaw;
    mark(mast, 'distant-wreck-silhouette', `${wreck.id}:mast`, colors.wreck);
    const debris = MeshBuilder.CreateBox(`wreck-silhouette:debris:${wreck.id}`,
      { width: wreck.length * .23, depth: wreck.beam * .4, height: .3 }, scene);
    debris.position.set(wreck.x + wreck.length * .24, -2.55, wreck.z - .28); debris.rotation.y = wreck.yaw + .3;
    mark(debris, 'distant-wreck-silhouette', `${wreck.id}:debris`, colors.wreck);
  }
  // Broken ribs rise above the reef like incomplete arches; their paths are
  // decorative only and never enter the collision or grid data.
  const ribs = [
    { id: 'stern', x: centerX - 27, z: -5 + marginMeters, width: 8, height: 5.5 },
    { id: 'bow', x: centerX + 36, z: -5 + marginMeters, width: 9, height: 6.2 },
    { id: 'south', x: centerX + 2, z: centerZ + 27, width: 11, height: 6.5 }
  ];
  for (const rib of ribs) {
    const path = Array.from({ length: 13 }, (_, index) => {
      const t = index / 12;
      return new Vector3(rib.x - rib.width / 2 + t * rib.width,
        -3.8 + Math.sin(t * Math.PI) * rib.height,
        rib.z + Math.sin(t * Math.PI * 2) * .35);
    });
    const bone = MeshBuilder.CreateTube(`wreck-dragon-bone:${rib.id}`,
      { path, radiusFunction: index => .08 + .24 * Math.sin(Math.PI * index / 12), tessellation: 7 }, scene);
    mark(bone, 'dragon-bone-silhouette', rib.id, colors.bone);
    for (const index of [3, 5, 7, 9]) {
      const anchor = path[index]!;
      const spur = MeshBuilder.CreateTube(`wreck-dragon-bone:${rib.id}:spur:${index}`, {
        path: [anchor, anchor.add(new Vector3((index % 2 ? -1 : 1) * .55, .48, 1.15))],
        radius: .09, tessellation: 6
      }, scene);
      mark(spur, 'dragon-bone-silhouette', `${rib.id}:spur:${index}`, colors.bone);
    }
  }
  const rocks = [
    [-7, 5, 2.3, 2.6], [-5, 19, 1.9, 2.2], [8, -5, 2.6, 2.4], [24, -6, 2.2, 1.9],
    [48, -5, 2.8, 2.6], [69, 3, 2.1, 2.3], [71, 23, 2.7, 2.8], [49, 29, 2.1, 2.0],
    [27, 31, 2.6, 2.4], [7, 28, 2.2, 2.2], [-6, 24, 2.7, 2.3]
  ] as const;
  rocks.forEach(([x, z, width, height], index) => {
    const rock = MeshBuilder.CreatePolyhedron(`wreck-reef-rock:${index + 1}`, { type: 2, size: 1 }, scene);
    rock.scaling.set(width, height, width * .82); rock.position.set(x + marginMeters, -3.55 + height * .38, z + marginMeters);
    rock.rotation.y = index * .73;
    mark(rock, 'reef-rock-silhouette', `reef-${index + 1}`, colors.reef);
  });
}

/** Soft, world-anchored color fields give the ocean backdrop scale and separate
 * the hull from the water. They are presentation-only and sit below every
 * walkable surface. */
function addSeaDepthLayer(scene: Scene, id: string, centerX: number, centerZ: number, y: number,
  width: number, depth: number, opacity: number, material: StandardMaterial) {
  const segments = 48, rings = 6;
  const positions = [centerX, y, centerZ], colors = [1, 1, 1, opacity], indices: number[] = [];
  for (let ring = 1; ring <= rings; ring++) {
    const radius = ring / rings, alpha = opacity * Math.pow(1 - radius, 2.25);
    for (let segment = 0; segment < segments; segment++) {
      const angle = segment / segments * Math.PI * 2;
      positions.push(centerX + Math.cos(angle) * width * radius / 2, y,
        centerZ + Math.sin(angle) * depth * radius / 2);
      colors.push(1, 1, 1, alpha);
    }
  }
  const firstRing = 1;
  for (let segment = 0; segment < segments; segment++) {
    const next = (segment + 1) % segments;
    indices.push(0, firstRing + next, firstRing + segment);
  }
  for (let ring = 1; ring < rings; ring++) {
    const inner = 1 + (ring - 1) * segments, outer = 1 + ring * segments;
    for (let segment = 0; segment < segments; segment++) {
      const next = (segment + 1) % segments;
      const innerCurrent = inner + segment, innerNext = inner + next;
      const outerCurrent = outer + segment, outerNext = outer + next;
      indices.push(innerCurrent, outerNext, outerCurrent, innerCurrent, innerNext, outerNext);
    }
  }
  const mesh = new Mesh(`ship-sea-depth:${id}`, scene), data = new VertexData();
  data.positions = positions; data.indices = indices; data.colors = colors;
  data.normals = Array.from({ length: positions.length / 3 }, () => [0, 1, 0]).flat();
  data.applyToMesh(mesh);
  mesh.material = material; mesh.isPickable = false; mesh.useVertexColors = true; mesh.hasVertexAlpha = true;
  mesh.metadata = { visualOnly: true, kind: 'sea-depth-layer', id };
}

function addWreckSeaDepth(scene: Scene, terrain: TerrainDefinition, tileMeters: number) {
  const centerX = terrain.cols * tileMeters / 2, centerZ = terrain.rows * tileMeters / 2;
  const shadow = new StandardMaterial('ship-sea-depth:shadow-material', scene);
  shadow.diffuseColor = Color3.FromHexString('#07131a'); shadow.specularColor = Color3.Black();
  shadow.disableLighting = true; shadow.transparencyMode = Material.MATERIAL_ALPHABLEND;
  shadow.backFaceCulling = false;
  const glow = new StandardMaterial('ship-sea-depth:glow-material', scene);
  glow.diffuseColor = Color3.FromHexString('#276d82'); glow.specularColor = Color3.Black();
  glow.disableLighting = true; glow.transparencyMode = Material.MATERIAL_ALPHABLEND;
  glow.backFaceCulling = false;
  const y = -8.12;
  addSeaDepthLayer(scene, 'hull-shadow', centerX, centerZ, y, 72, 29, .5, shadow);
  addSeaDepthLayer(scene, 'reef-light-west', centerX - 32, centerZ - 5, y + .008, 25, 18, .32, glow);
  addSeaDepthLayer(scene, 'reef-light-east', centerX + 33, centerZ + 13, y + .012, 24, 17, .26, glow);
  addSeaDepthLayer(scene, 'reef-light-far', centerX + 1, centerZ - 25, y + .016, 31, 15, .2, glow);
}

/** Render the same reef cells omitted from the water raster, so obstacles are
 * legible in the scene and impassable in the movement graph. */
function addNavigableSeaObstacles(scene: Scene, terrain: TerrainDefinition, tileMeters: number,
  deckTexture?: BaseTexture, reefTexture?: BaseTexture) {
  const groups = new Map<string, Cell[]>();
  for (const obstacle of terrain.obstacles ?? []) {
    if (obstacle.surfaceId !== 'sea') continue;
    const cells = groups.get(obstacle.obstacleId) ?? [];
    cells.push(obstacle.cell); groups.set(obstacle.obstacleId, cells);
  }
  if (!groups.size) return;
  const rock = new StandardMaterial('wreck-sea-obstacle:rock', scene);
  rock.diffuseColor = Color3.FromHexString('#394448'); rock.specularColor = Color3.Black();
  if (reefTexture) { rock.diffuseTexture = reefTexture; rock.diffuseColor = Color3.White(); }
  const bone = new StandardMaterial('wreck-sea-obstacle:bone', scene);
  bone.diffuseColor = Color3.FromHexString('#918e7d'); bone.specularColor = Color3.Black();
  const timber = new StandardMaterial('wreck-sea-obstacle:timber', scene);
  timber.diffuseColor = Color3.FromHexString('#57402f'); timber.specularColor = Color3.Black();
  if (deckTexture) { timber.diffuseTexture = deckTexture; timber.diffuseColor = Color3.FromHexString('#bbac8f'); }
  const finish = (mesh: Mesh, id: string, kind: string, material: StandardMaterial) => {
    mesh.material = material; mesh.isPickable = false;
    mesh.metadata = { visualOnly: true, kind, id };
  };
  for (const [id, cells] of groups) {
    const centers = cells.map(cell => ({ x: (cell.col + .5) * tileMeters, z: (cell.row + .5) * tileMeters }));
    const centerX = centers.reduce((sum, point) => sum + point.x, 0) / centers.length;
    const centerZ = centers.reduce((sum, point) => sum + point.z, 0) / centers.length;
    if (id.startsWith('dragon-bone')) {
      const span = Math.max(3.6, cells.length * tileMeters * .9);
      const path = Array.from({ length: 11 }, (_, index) => {
        const t = index / 10;
        return new Vector3(centerX - span / 2 + t * span, -2.45 + Math.sin(t * Math.PI) * 2.6,
          centerZ + Math.sin(t * Math.PI * 2) * .25);
      });
      finish(MeshBuilder.CreateTube(`wreck-sea-bone:${id}`, { path, radius: .3, tessellation: 6 }, scene), id, 'dragon-bone-obstacle', bone);
    } else if (id.startsWith('wreckage')) {
      const width = Math.max(2.1, cells.length * tileMeters * .75);
      const plank = MeshBuilder.CreateBox(`wreck-sea-debris:${id}`, { width, depth: .34, height: .24 }, scene);
      plank.position.set(centerX, -2.24, centerZ); plank.rotation.y = -.38;
      finish(plank, id, 'floating-wreckage-obstacle', timber);
    } else {
      cells.forEach((cell, index) => {
        const boulder = MeshBuilder.CreatePolyhedron(`wreck-sea-rock:${id}:${index}`, { type: 2, size: 1 }, scene);
        const size = 1.25 + (index % 3) * .18;
        boulder.scaling.set(size, .82 + (index % 2) * .22, size * .84);
        boulder.position.set((cell.col + .5) * tileMeters, -2.58 + size * .28, (cell.row + .5) * tileMeters);
        boulder.rotation.y = index * .79;
        finish(boulder, `${id}:${index}`, 'reef-rock-obstacle', rock);
      });
    }
  }
}

/** Build geometry from the *same corner heights* used for movement and selection. */
export function buildTerrain3D(scene: Scene, terrain: TerrainDefinition, options: { ambientIntensity?: number; shipDeck?: boolean; deckTexture?: BaseTexture; hullTexture?: BaseTexture; reefTexture?: BaseTexture; waterTexture?: Texture; floodedDeckTexture?: Texture; waterBackdropTexture?: Texture; scenicWaterTexture?: Texture; foamTexture?: Texture; wreckageTexture?: Texture; contextSurfaceIds?: string[]; renderTiles?: boolean; batchTiles?: boolean } = {}): Terrain3DView {
  const tiles = new Map<string, Mesh>();
  const gridSegments = new Map<string, Vector3[][]>();
  const tileBatches = new Map<string, { materialId: string; surfaceId: string; positions: number[]; indices: number[]; uvs: number[]; colors: number[] }>();
  const deckDetails: Mesh[] = [];
  const materials = new Map<string, StandardMaterial>();
  const contextSurfaces = new Set([...(options.contextSurfaceIds ?? []), ...terrain.surfaces.filter(surface => surface.visualOnly).map(surface => surface.id)]);
  const palette: Record<string, string> = { stone: '#77776f', sand: '#a99b7d', moss: '#365342', basalt: '#373c45', 'cave-rock': '#39494b', wood: '#815c39', 'wet-wood': '#789ba0', 'hold-wood': '#526d7a', 'wall-wood': '#4a392c', 'stair-wood': '#a57947', 'stair-down': '#3b3027', 'stair-edge': '#d5ad63', 'stair-rail': '#282622', hatch: '#17252a', earth: '#6c644b', grass: '#567852', water: '#305d7a' };
  const tileMeters = terrain.tileMeters;
  const materialFor = (id: string) => {
    let material = materials.get(id);
    if (!material) {
      material = new StandardMaterial(`terrain-material:${id}`, scene);
      material.diffuseColor = Color3.FromHexString(palette[id] ?? '#706f69');
      material.specularColor = Color3.Black();
      if ((id === 'wood' || id === 'wet-wood' || id === 'hold-wood') && options.shipDeck && options.deckTexture) {
        material.diffuseTexture = options.deckTexture;
        material.diffuseColor = id === 'wet-wood' ? Color3.FromHexString('#b7d0d2')
          : id === 'hold-wood' ? Color3.FromHexString('#829aa4') : Color3.White();
      }
      if ((id === 'wall-wood' || id === 'ship-hull') && options.shipDeck && options.hullTexture) {
        material.diffuseTexture = options.hullTexture;
        material.diffuseColor = id === 'wall-wood' ? Color3.FromHexString('#b6bbb2') : Color3.White();
      }
      if ((id === 'stair-wood' || id === 'stair-down') && options.shipDeck && options.deckTexture) {
        material.diffuseTexture = options.deckTexture;
        material.diffuseColor = id === 'stair-down' ? Color3.FromHexString('#697779') : Color3.FromHexString('#c3b08c');
      }
      if (id === 'water' && options.shipDeck && options.waterTexture) {
        material.diffuseTexture = options.waterBackdropTexture ?? options.waterTexture;
        material.diffuseColor = Color3.White();
        material.specularColor = Color3.FromHexString(options.waterBackdropTexture ? '#779da5' : '#476c78');
        if (options.scenicWaterTexture && options.waterBackdropTexture)
          material.transparencyMode = Material.MATERIAL_ALPHABLEND;
        if (options.waterBackdropTexture) {
          // The painted panorama gives the playable sea its color and foam;
          // the repeating ripple texture scrolls as a restrained normal map.
          options.waterTexture.uScale = terrain.rows * tileMeters / shipWaterTextureRepeatMeters;
          options.waterTexture.vScale = terrain.cols * tileMeters / shipWaterTextureRepeatMeters;
          options.waterTexture.level = 2.5;
          material.bumpTexture = options.waterTexture;
          material.specularPower = 48;
        }
      }
      // The greybox floor must remain visible from the fixed 3/4 camera even
      // if a tile's winding differs from a later imported art mesh.
      material.backFaceCulling = false;
      materials.set(id, material);
    }
    return material;
  };
  const corner = (address: SurfaceAddress, u: number, v: number, lift = 0) =>
    new Vector3((address.cell.col + u) * tileMeters, surfaceHeight(terrain, address, u, v) + lift, (address.cell.row + v) * tileMeters);
  for (const surface of terrain.surfaces) {
    gridSegments.set(surface.id, []);
    for (const tile of surface.tiles) {
    const address = { surfaceId: surface.id, cell: tile.cell };
    const renderMaterialId = options.shipDeck && tile.materialId === 'wood' && tile.medium === 'water'
      ? surface.id === 'hold-air' ? 'hold-wood' : 'wet-wood'
      : tile.materialId;
    const corners = [corner(address, 0, 0), corner(address, 1, 0), corner(address, 1, 1), corner(address, 0, 1)];
    let mesh: Mesh | null = null;
    if (options.batchTiles && options.renderTiles !== false) {
      const batchKey = `${surface.id}:${renderMaterialId}`;
      let batch = tileBatches.get(batchKey);
      if (!batch) { batch = { materialId: renderMaterialId, surfaceId: surface.id, positions: [], indices: [], uvs: [], colors: [] }; tileBatches.set(batchKey, batch); }
      const offset = batch.positions.length / 3;
      batch.positions.push(...corners.flatMap(position => [position.x, position.y, position.z]));
      if (tile.materialId === 'wood' && options.shipDeck && options.deckTexture)
        batch.uvs.push(...corners.flatMap(position => shipDeckUv(position.x, position.z)));
      else if (tile.materialId === 'water' && options.shipDeck && options.waterTexture)
        batch.uvs.push(...corners.flatMap(position => options.waterBackdropTexture
          ? shipSeaArtworkUv(position.x, position.z, terrain) : shipWaterUv(position.x, position.z)));
      else
        batch.uvs.push(...corners.flatMap(position => [position.z / 6, position.x / 6]));
      if (surface.id === 'sea' && options.scenicWaterTexture && options.waterBackdropTexture)
        batch.colors.push(...corners.flatMap(position => [1, 1, 1, shipSeaEdgeAlpha(position.x, position.z, terrain)]));
      batch.indices.push(offset, offset + 1, offset + 2, offset, offset + 2, offset + 3);
    } else if (options.renderTiles !== false && new Set(tile.corners).size === 1) {
      // Babylon's box builder has reliable front-face winding on both WebGL
      // backends; a thin slab also gives the deck a real visible thickness.
      mesh = MeshBuilder.CreateBox(`tile:${addressKey(surface.id, tile.cell.col, tile.cell.row)}`,
        { width: tileMeters, depth: tileMeters, height: .06 }, scene);
      mesh.position.set((tile.cell.col + .5) * tileMeters, tile.corners[0]! - .03,
        (tile.cell.row + .5) * tileMeters);
      if (tile.materialId === 'wood' && options.shipDeck && options.deckTexture
        || tile.materialId === 'water' && options.shipDeck && options.waterTexture) {
        const positions = mesh.getVerticesData('position')!;
        const uvs: number[] = [];
        for (let index = 0; index < positions.length; index += 3) {
          const x = mesh.position.x + positions[index]!, z = mesh.position.z + positions[index + 2]!;
          uvs.push(...(tile.materialId === 'wood' ? shipDeckUv(x, z)
            : options.waterBackdropTexture ? shipSeaArtworkUv(x, z, terrain) : shipWaterUv(x, z)));
        }
        mesh.setVerticesData('uv', uvs);
        if (surface.id === 'sea' && options.scenicWaterTexture && options.waterBackdropTexture) {
          const colors: number[] = [];
          for (let index = 0; index < positions.length; index += 3)
            colors.push(1, 1, 1, shipSeaEdgeAlpha(mesh.position.x + positions[index]!, mesh.position.z + positions[index + 2]!, terrain));
          mesh.setVerticesData('color', colors); mesh.hasVertexAlpha = true;
        }
      }
    } else if (options.renderTiles !== false) {
      const data = new VertexData();
      data.positions = corners.flatMap(position => [position.x, position.y, position.z]);
      // Babylon computes normals from winding. The opposite order points the
      // broad C8 ramp downwards, leaving the whole lower deck nearly black.
      data.indices = [0, 1, 2, 0, 2, 3];
      if (tile.materialId === 'wood' && options.shipDeck && options.deckTexture)
        data.uvs = corners.flatMap(position => shipDeckUv(position.x, position.z));
      else if (tile.materialId === 'water' && options.shipDeck && options.waterTexture)
        data.uvs = corners.flatMap(position => options.waterBackdropTexture
          ? shipSeaArtworkUv(position.x, position.z, terrain) : shipWaterUv(position.x, position.z));
      if (surface.id === 'sea' && options.scenicWaterTexture && options.waterBackdropTexture)
        data.colors = corners.flatMap(position => [1, 1, 1, shipSeaEdgeAlpha(position.x, position.z, terrain)]);
      const normals: number[] = [];
      VertexData.ComputeNormals(data.positions, data.indices, normals);
      data.normals = normals;
      mesh = new Mesh(`tile:${addressKey(surface.id, tile.cell.col, tile.cell.row)}`, scene);
      data.applyToMesh(mesh);
      if (data.colors?.length) mesh.hasVertexAlpha = true;
    }
    if (mesh) {
    mesh.material = materialFor(renderMaterialId);
    // Context decks complete the ship silhouette in an adjacent floor view,
    // but never become a hidden second route or a target for map clicks.
    mesh.isPickable = !contextSurfaces.has(surface.id);
    mesh.metadata = { address };
    tiles.set(addressKey(surface.id, tile.cell.col, tile.cell.row), mesh);
    }
    // All four borders follow the geometry. Multiple surfaces in one cell have
    // independent borders, so the underpass is never confused with the bridge.
    if (!contextSurfaces.has(surface.id)) for (const [a, b] of [[0, 1], [1, 2], [2, 3], [3, 0]] as [number, number][])
      gridSegments.get(surface.id)!.push([corners[a]!.add(new Vector3(0, 0.012, 0)), corners[b]!.add(new Vector3(0, 0.012, 0))]);
    }
  }
  for (const [batchKey, batch] of tileBatches) {
    const mesh = new Mesh(`terrain-batch:${batchKey}`, scene), data = new VertexData(), normals: number[] = [];
    data.positions = batch.positions; data.indices = batch.indices;
    if (batch.uvs.length) data.uvs = batch.uvs;
    if (batch.colors.length) data.colors = batch.colors;
    VertexData.ComputeNormals(batch.positions, batch.indices, normals); data.normals = normals; data.applyToMesh(mesh);
    if (batch.colors.length) mesh.hasVertexAlpha = true;
    mesh.material = materialFor(batch.materialId); mesh.isPickable = !contextSurfaces.has(batch.surfaceId);
    mesh.metadata = { visualOnly: false, kind: 'terrain-batch', surfaceId: batch.surfaceId, tileCount: batch.indices.length / 6 };
    deckDetails.push(mesh);
  }
  if (options.shipDeck) {
    if (options.scenicWaterTexture) {
      // Screen-space ocean is scenery only, behind every world mesh. The
      // playable sea remains the separate height-aware terrain surface.
      const horizon = new Layer('ship-ocean-backdrop-layer', null, scene, true);
      horizon.texture = options.scenicWaterTexture;
      // A tiny reversible drift reads as distant swell, without moving the
      // playable sea, collision map, foam aligned to tiles or camera.
      const startedAt = performance.now();
      scene.onBeforeRenderObservable.add(() => {
        const elapsed = (performance.now() - startedAt) / 1000;
        options.scenicWaterTexture!.uOffset = Math.sin(elapsed * .14) * .006;
        options.scenicWaterTexture!.vOffset = Math.cos(elapsed * .11) * .005;
      });
    }
    // Distance haze softens far scenery while a cool ground bounce and a
    // directional key light give the hull, rails and wreck silhouettes volume.
    scene.fogMode = Scene.FOGMODE_EXP2;
    scene.fogColor = Color3.FromHexString('#123542');
    scene.fogDensity = 0.0048;
    const backdropWidth = terrain.cols * tileMeters * 6;
    const backdropDepth = terrain.rows * tileMeters * 6;
    const backdropTexture = options.scenicWaterTexture ?? options.waterBackdropTexture ?? options.waterTexture;
    const water = MeshBuilder.CreateGround('ship-water', {
      // Extend past the playable bounds so its edge never forms a visible
      // diamond around the vessel in the orthographic 3/4 view.
      width: backdropWidth, height: backdropDepth
    }, scene);
    water.position.set(terrain.cols * tileMeters / 2, -8.2, terrain.rows * tileMeters / 2);
    const waterMat = materialFor('ship-water'); waterMat.disableLighting = true; waterMat.fogEnabled = false;
    waterMat.diffuseColor = backdropTexture ? Color3.White() : Color3.FromHexString('#07171d');
    if (backdropTexture) {
      waterMat.diffuseTexture = backdropTexture;
      const positions = water.getVerticesData('position')!;
      const uvs: number[] = [];
      for (let index = 0; index < positions.length; index += 3) {
        if (options.scenicWaterTexture || options.waterBackdropTexture) {
          // Scenic, non-playable ocean art is mapped once across the oversized
          // background plane; the near-water tiles keep their own repeatable,
          // animated texture and walkability.
          uvs.push((water.position.z + positions[index + 2]!) / (terrain.rows * tileMeters),
            (water.position.x + positions[index]!) / (terrain.cols * tileMeters));
        } else {
          uvs.push(...shipWaterBackdropUv(water.position.x + positions[index]!, water.position.z + positions[index + 2]!));
        }
      }
      water.setVerticesData('uv', uvs);
    }
    waterMat.emissiveColor = Color3.Black(); water.material = waterMat; water.isPickable = false;
    // The old oversized plane occluded the new full-screen ocean layer with
    // its clamped edge color. Retain it as a fallback for packs lacking art.
    water.isVisible = !options.scenicWaterTexture;
    if (options.foamTexture) {
      // A second, non-pickable skin follows only the *real* sea tiles. Its
      // geometry is derived from their exact corners, so foam never invents a
      // walkable area or hides the flooded hold below the cutaway.
      const positions: number[] = [], indices: number[] = [], uvs: number[] = [];
      const seaSurface = terrain.surfaces.find(surface => surface.id === 'sea');
      for (const tile of seaSurface?.tiles ?? []) {
        const offset = positions.length / 3;
        const address = { surfaceId: 'sea', cell: tile.cell };
        for (const [u, v] of [[0, 0], [1, 0], [1, 1], [0, 1]] as const) {
          const point = corner(address, u, v, .035);
          positions.push(point.x, point.y, point.z);
          uvs.push(point.z / 15, point.x / 15);
        }
        indices.push(offset, offset + 1, offset + 2, offset, offset + 2, offset + 3);
      }
      if (positions.length) {
        const foam = new Mesh('ship-sea-foam-overlay', scene);
        const data = new VertexData(), normals: number[] = [];
        data.positions = positions; data.indices = indices; data.uvs = uvs;
        VertexData.ComputeNormals(positions, indices, normals); data.normals = normals;
        data.applyToMesh(foam);
        const foamMat = new StandardMaterial('ship-sea-foam-material', scene);
        foamMat.diffuseTexture = options.foamTexture;
        foamMat.useAlphaFromDiffuseTexture = true;
        foamMat.diffuseColor = Color3.White();
        foamMat.emissiveColor = Color3.FromHexString('#3e666e');
        foamMat.alpha = .66; foamMat.disableLighting = true; foamMat.backFaceCulling = false;
        foam.material = foamMat; foam.isPickable = false;
        foam.metadata = { visualOnly: true, kind: 'sea-foam', deckSurfaceId: 'sea' };
        deckDetails.push(foam);
        const startedAt = performance.now();
        scene.onBeforeRenderObservable.add(() => {
          const elapsed = (performance.now() - startedAt) / 1000;
          options.foamTexture!.uOffset = (elapsed * .005) % 1;
          options.foamTexture!.vOffset = (elapsed * -.003) % 1;
          foamMat.alpha = .56 + Math.sin(elapsed * 1.25) * .08;
        });
      }
    }
    if (options.floodedDeckTexture) {
      for (const surface of terrain.surfaces.filter(item => item.id === 'lower-deck' || item.id === 'hold-air')) {
        const positions: number[] = [], indices: number[] = [], uvs: number[] = [];
        for (const tile of surface.tiles.filter(item => item.medium === 'water')) {
          const offset = positions.length / 3;
          const address = { surfaceId: surface.id, cell: tile.cell };
          for (const [u, v] of [[0, 0], [1, 0], [1, 1], [0, 1]] as const) {
            const point = corner(address, u, v, .028);
            positions.push(point.x, point.y, point.z);
            uvs.push(point.z / 8, point.x / 8);
          }
          indices.push(offset, offset + 1, offset + 2, offset, offset + 2, offset + 3);
        }
        if (!positions.length) continue;
        const flood = new Mesh(`ship-flooded-deck:${surface.id}`, scene);
        const data = new VertexData(), normals: number[] = [];
        data.positions = positions; data.indices = indices; data.uvs = uvs;
        VertexData.ComputeNormals(positions, indices, normals); data.normals = normals;
        data.applyToMesh(flood);
        const floodMat = new StandardMaterial(`ship-flooded-deck-material:${surface.id}`, scene);
        floodMat.diffuseTexture = options.floodedDeckTexture;
        floodMat.diffuseColor = Color3.FromHexString(surface.id === 'lower-deck' ? '#7db4b7' : '#345f71');
        floodMat.alpha = surface.id === 'lower-deck' ? .25 : .36;
        floodMat.disableLighting = true; floodMat.backFaceCulling = false;
        flood.material = floodMat; flood.isPickable = false;
        flood.metadata = { visualOnly: true, kind: 'flooded-deck-shimmer', deckSurfaceId: surface.id };
        deckDetails.push(flood);
      }
      const startedAt = performance.now();
      scene.onBeforeRenderObservable.add(() => {
        const elapsed = (performance.now() - startedAt) / 1000;
        options.floodedDeckTexture!.uOffset = (elapsed * -.012) % 1;
        options.floodedDeckTexture!.vOffset = (elapsed * .006) % 1;
      });
    }
    // Painted ocean already supplies underwater color and depth. The old
    // radial meshes appear as flat polygons where they extend past the
    // navigable tiles, so keep them only for art-free fallback scenes.
    if (!options.scenicWaterTexture) addWreckSeaDepth(scene, terrain, tileMeters);
    addWreckBackdrop(scene, terrain, tileMeters, options.deckTexture, options.hullTexture, options.reefTexture,
      !!options.scenicWaterTexture);
    addNavigableSeaObstacles(scene, terrain, tileMeters, options.deckTexture, options.reefTexture);
    const deckSurfaces = terrain.surfaces.filter(surface => surface.tiles.some(tile => tile.materialId === 'wood'));
    for (const base of deckSurfaces) {
    const suffix = base.id === terrain.baseSurfaceId ? '' : `:${base.id}`;
    const raisedDeck = base.id === 'c2' || base.id === 'c3' || base.id === 'bridge';
    const drawHull = base.id === 'c1-hull' || raisedDeck || base.id === 'main' && contextSurfaces.has('main')
      || options.shipDeck && !terrain.surfaces.some(surface => surface.id === 'c1-hull') && base.id === terrain.baseSurfaceId;
    const drawRail = drawHull || base.id === 'c2-context' || base.id === 'c3-context' || base.id === 'c2' || base.id === 'c3';
    const occupied = new Set(base.tiles.map(tile => `${tile.cell.col},${tile.cell.row}`));
    const stairwell = new Set<string>();
    if (base.id === 'c1-hull') for (const structure of terrain.structures ?? []) {
      if (structure.kind !== 'stair' || structure.riseMeters >= 0 || Math.abs(structure.baseHeight ?? 0) > .2) continue;
      for (let index = 0; index < structure.runCells; index++) {
        const col = structure.cell.col + (structure.direction === 'east' ? index : structure.direction === 'west' ? -index : 0);
        const row = structure.cell.row + (structure.direction === 'south' ? index : structure.direction === 'north' ? -index : 0);
        stairwell.add(`${col},${row}`);
      }
    }
    const edgeSpecs = [
      { dc: 0, dr: -1, side: 'north' as const, a: [0, 0] as const, b: [1, 0] as const },
      { dc: 1, dr: 0, side: 'east' as const, a: [1, 0] as const, b: [1, 1] as const },
      { dc: 0, dr: 1, side: 'south' as const, a: [1, 1] as const, b: [0, 1] as const },
      { dc: -1, dr: 0, side: 'west' as const, a: [0, 1] as const, b: [0, 0] as const }
    ];
    const edges: { start: Vector3; end: Vector3; outside: Vector3; cell: Cell; side: 'north' | 'east' | 'south' | 'west' }[] = [];
    const hullVertices: number[] = [], hullIndices: number[] = [];
    const addHullBand = (start: Vector3, end: Vector3, top: number, bottom: number) => {
      if (top <= bottom) return;
      const offset = hullVertices.length / 3;
      hullVertices.push(start.x, top, start.z, end.x, top, end.z, end.x, bottom, end.z, start.x, bottom, start.z);
      hullIndices.push(offset, offset + 1, offset + 2, offset, offset + 2, offset + 3);
    };
    const plankLines: Vector3[][] = [];
    for (const tile of base.tiles) {
      const address = { surfaceId: base.id, cell: tile.cell };
      // Fine grain lines run lengthwise with the vessel and sit just above the
      // deck. They are decoration only; the bright cell grid stays independent.
      if (!options.deckTexture) for (const v of [0.32, 0.68]) {
        const start = corner(address, 0.04, v, 0.018), end = corner(address, 0.96, v, 0.018);
        plankLines.push([start, end]);
      }
      for (const edge of edgeSpecs) {
        const neighbor = `${tile.cell.col + edge.dc},${tile.cell.row + edge.dr}`;
        if (occupied.has(neighbor)) continue;
        // An inner stair opening is not the outer hull: no tall wall or rail
        // should be generated across its access from the main deck.
        if (stairwell.has(neighbor)) continue;
        const start = corner(address, edge.a[0], edge.a[1]);
        const end = corner(address, edge.b[0], edge.b[1]);
        edges.push({ start, end, outside: new Vector3(edge.dc, 0, edge.dr), cell: tile.cell, side: edge.side });
        // Upper platforms show the continuous hull below them down to the same
        // waterline as C1; geometry remains decorative, not a walkable surface.
        if (drawHull) {
          const bottom = base.id === 'main' || base.id === 'c1-hull' ? -6.85 : Math.min(0, ...tile.corners) - 1.15;
          const opening = terrain.hullOpenings?.find(item => item.surfaceId === base.id
            && item.cell.col === tile.cell.col && item.cell.row === tile.cell.row && item.edge === edge.side);
          if (opening) {
            addHullBand(start, end, start.y, opening.top);
            addHullBand(start, end, opening.bottom, bottom);
          } else addHullBand(start, end, start.y, bottom);
        }
      }
    }
    if (drawHull) {
      const hull = new Mesh(`ship-hull-sides${suffix}`, scene);
      const hullData = new VertexData(); hullData.positions = hullVertices; hullData.indices = hullIndices;
      if (options.deckTexture) hullData.uvs = Array.from({ length: hullVertices.length / 3 }, (_, index) => {
        const offset = index * 3;
        return shipHullUv(hullVertices[offset]!, hullVertices[offset + 1]!);
      }).flat();
      const hullNormals: number[] = []; VertexData.ComputeNormals(hullVertices, hullIndices, hullNormals);
      hullData.normals = hullNormals; hullData.applyToMesh(hull);
      const hullMat = materialFor('ship-hull');
      hullMat.diffuseColor = options.hullTexture ? Color3.White()
        : options.deckTexture ? Color3.FromHexString('#8b8274') : Color3.FromHexString('#392b25');
      if (options.hullTexture) hullMat.diffuseTexture = options.hullTexture;
      else if (options.deckTexture) hullMat.diffuseTexture = options.deckTexture;
      hull.material = hullMat; hull.isPickable = false; hull.metadata = { visualOnly: true, kind: 'ship-hull', deckSurfaceId: base.id,
        openings: (terrain.hullOpenings ?? []).filter(item => item.surfaceId === base.id).map(item => item.id) };
      deckDetails.push(hull);
    }
    if (plankLines.length) {
      const grain = MeshBuilder.CreateLineSystem(`ship-deck-planks${suffix}`, { lines: plankLines }, scene);
      grain.color = Color3.FromHexString('#694b31'); grain.isPickable = false;
      grain.metadata = { visualOnly: true, kind: 'ship-deck-planks', deckSurfaceId: base.id };
      deckDetails.push(grain);
    }
    if (drawHull) {
      const hullStrakes: Vector3[][] = [];
      for (const { start, end } of edges) for (const drop of [0.35, 0.72]) {
        const y = (start.y + end.y) / 2 - drop;
        hullStrakes.push([new Vector3(start.x, y, start.z), new Vector3(end.x, y, end.z)]);
      }
      const strakes = MeshBuilder.CreateLineSystem(`ship-hull-strakes${suffix}`, { lines: hullStrakes }, scene);
      strakes.color = Color3.FromHexString('#9a7047'); strakes.isPickable = false;
      strakes.metadata = { visualOnly: true, kind: 'ship-hull-strakes', deckSurfaceId: base.id };
      deckDetails.push(strakes);
    }
    // A low rail makes the irregular hull outline legible from the fixed
    // 3/4 camera. It never participates in movement, picking or collision.
    const railMat = materialFor('ship-rail'); railMat.diffuseColor = Color3.FromHexString('#59402d');
    const postMat = materialFor('ship-post'); postMat.diffuseColor = Color3.FromHexString('#765636');
    if (drawRail) edges.forEach(({ start, end, outside, cell, side }, index) => {
      if (terrain.railGaps?.some(gap => gap.surfaceId === base.id && gap.edge === side
        && gap.cell.col === cell.col && gap.cell.row === cell.row)) return;
      const midpoint = start.add(end).scale(0.5);
      if (index % 2 === 0) {
        const post = MeshBuilder.CreateBox(`ship-rail-post:${base.id}:${index}`, { width: 0.11, depth: 0.11, height: 0.72 }, scene);
        post.position.set(midpoint.x - outside.x * 0.04, midpoint.y + 0.38, midpoint.z - outside.z * 0.04);
        post.material = postMat; post.isPickable = false; post.metadata = { kind: 'ship-rail-post', surfaceId: base.id, cell, side, deckSurfaceId: base.id };
        deckDetails.push(post);
      }
      const beam = MeshBuilder.CreateBox(`ship-rail:${base.id}:${index}`, {
        width: Math.abs(end.x - start.x) < 0.001 ? 0.095 : tileMeters + 0.035,
        depth: Math.abs(end.z - start.z) < 0.001 ? 0.095 : tileMeters + 0.035,
        height: 0.09
      }, scene);
      beam.position.set(midpoint.x - outside.x * 0.04, midpoint.y + 0.72, midpoint.z - outside.z * 0.04);
      beam.material = railMat; beam.isPickable = false; beam.metadata = { kind: 'ship-rail', surfaceId: base.id, cell, side, deckSurfaceId: base.id };
      deckDetails.push(beam);
    });
    }
    // Flush, closed deck fittings belong to the art layer: they add the
    // characteristic ship detail without opening a hatch or reserving cells.
    if (terrain.baseSurfaceId === 'main' && terrain.cols === 56 && terrain.rows === 32) {
      const main = terrain.surfaces.find(surface => surface.id === 'main');
      const hasMain = (col: number, row: number) => Boolean(main?.tiles.some(tile => tile.cell.col === col && tile.cell.row === row));
      const iron = new StandardMaterial('ship-deck-fitting-iron', scene);
      iron.diffuseColor = Color3.FromHexString('#242b2b'); iron.specularColor = Color3.Black();
      const rope = new StandardMaterial('ship-deck-fitting-rope', scene);
      rope.diffuseColor = Color3.FromHexString('#b3a075'); rope.specularColor = Color3.Black();
      const addFitting = (mesh: Mesh, kind: string) => {
        mesh.isPickable = false; mesh.metadata = { visualOnly: true, kind, deckSurfaceId: 'main' }; deckDetails.push(mesh);
      };
      for (const [index, col, row] of [[0, 26, 11], [1, 30, 15]] as const) {
        if (!hasMain(col, row)) continue;
        const x = (col + .5) * tileMeters, z = (row + .5) * tileMeters;
        const recess = MeshBuilder.CreateBox(`ship-deck-grate-recess:${index}`, { width: 1.27, depth: .93, height: .018 }, scene);
        recess.position.set(x, .034, z); recess.material = iron; addFitting(recess, 'ship-deck-grate');
        for (const side of [-1, 1]) {
          const frameX = MeshBuilder.CreateBox(`ship-deck-grate-frame-x:${index}:${side}`, { width: 1.45, depth: .12, height: .075 }, scene);
          frameX.position.set(x, .075, z + side * .5); frameX.material = materialFor('stair-wood'); addFitting(frameX, 'ship-deck-grate');
          const frameZ = MeshBuilder.CreateBox(`ship-deck-grate-frame-z:${index}:${side}`, { width: .12, depth: .94, height: .075 }, scene);
          frameZ.position.set(x + side * .69, .075, z); frameZ.material = materialFor('stair-wood'); addFitting(frameZ, 'ship-deck-grate');
        }
        for (let slat = -3; slat <= 3; slat++) {
          const bar = MeshBuilder.CreateBox(`ship-deck-grate-slat:${index}:${slat}`, { width: .08, depth: .91, height: .045 }, scene);
          bar.position.set(x + slat * .18, .071, z); bar.material = materialFor('stair-wood'); addFitting(bar, 'ship-deck-grate');
        }
      }
      for (const [index, col, row] of [[0, 26, 16], [1, 31, 10]] as const) {
        if (!hasMain(col, row)) continue;
        const x = (col + .5) * tileMeters, z = (row + .5) * tileMeters;
        for (const [loop, diameter] of [0.72, 0.5, 0.29].entries()) {
          const coil = MeshBuilder.CreateTorus(`ship-deck-rope-coil:${index}:${loop}`,
            { diameter, thickness: .045, tessellation: 28 }, scene);
          coil.position.set(x, .055 + loop * .025, z); coil.material = rope; addFitting(coil, 'ship-deck-rope-coil');
        }
      }
      // Art-direction sample: one small, traversable C1 vignette. The alpha
      // artwork is independent of the floor/grid and never changes the map.
      if (options.wreckageTexture && [[25, 14], [26, 14], [27, 14], [25, 15], [26, 15], [27, 15],
        [25, 16], [26, 16], [27, 16]].every(([col, row]) => hasMain(col!, row!))) {
        const x = 26.5 * tileMeters, z = 15.5 * tileMeters;
        const stainMaterial = new StandardMaterial('ship-c1-salt-stain-material', scene);
        stainMaterial.diffuseColor = Color3.FromHexString('#18383a');
        stainMaterial.specularColor = Color3.Black(); stainMaterial.disableLighting = true;
        stainMaterial.transparencyMode = Material.MATERIAL_ALPHABLEND;
        stainMaterial.backFaceCulling = false;
        const stainPositions = [x, .003, z], stainColors = [1, 1, 1, .29], stainIndices: number[] = [];
        for (let ring = 0; ring < 2; ring++) for (let index = 0; index < 16; index++) {
          const angle = index * Math.PI / 8;
          const irregular = 1 + Math.sin(index * 2.7) * .09 + Math.cos(index * 4.1) * .05;
          const radius = (ring === 0 ? 1.38 : 2.36) * irregular;
          stainPositions.push(x + Math.cos(angle) * radius, .003, z + Math.sin(angle) * radius * .89);
          stainColors.push(1, 1, 1, ring === 0 ? .18 : 0);
        }
        for (let index = 0; index < 16; index++) {
          const next = (index + 1) % 16;
          stainIndices.push(0, 1 + index, 1 + next);
          stainIndices.push(1 + index, 17 + index, 17 + next, 1 + index, 17 + next, 1 + next);
        }
        const stain = new Mesh('ship-c1-salt-stain', scene), stainData = new VertexData();
        stainData.positions = stainPositions; stainData.indices = stainIndices; stainData.colors = stainColors;
        stainData.normals = Array.from({ length: stainPositions.length / 3 }, () => [0, 1, 0]).flat();
        stainData.applyToMesh(stain); stain.useVertexColors = true; stain.hasVertexAlpha = true;
        stain.material = stainMaterial; addFitting(stain, 'ship-c1-salt-stain');
        const material = new StandardMaterial('ship-c1-wreckage-detail-material', scene);
        material.diffuseTexture = options.wreckageTexture;
        material.useAlphaFromDiffuseTexture = true;
        material.transparencyMode = Material.MATERIAL_ALPHABLEND;
        material.backFaceCulling = false;
        material.specularColor = Color3.Black();
        const detail = MeshBuilder.CreateGround('ship-c1-wreckage-detail',
          { width: 4.45, height: 4.45 }, scene);
        detail.position.set(x, .006, z); detail.rotation.y = .09;
        detail.material = material; addFitting(detail, 'ship-c1-wreckage-detail');
        // A few raised, fractured battens give the painted scatter genuine
        // parallax while remaining shallow enough to walk across.
        for (const [index, dx, dz, length, angle] of [
          [0, -1.25, -.89, .87, -.22], [1, .84, .94, 1.04, .28], [2, -1.05, 1.25, .66, .48]
        ] as const) {
          const batten = MeshBuilder.CreateBox(`ship-c1-wreckage-batten:${index}`,
            { width: length, depth: .13, height: .045 }, scene);
          batten.position.set(x + dx, .047, z + dz); batten.rotation.y = angle;
          batten.material = materialFor('stair-wood'); addFitting(batten, 'ship-c1-wreckage-batten');
        }
      }
    }
  }
  const grids = new Map<string, LinesMesh>();
  for (const [surfaceId, lines] of gridSegments) {
    if (!lines.length) continue;
    const surfaceGrid = MeshBuilder.CreateLineSystem(`terrain-grid:${surfaceId}`, {
      lines,
      // LinesMesh only enables blending when vertex alpha is opted into at
      // creation time; assigning `alpha` alone leaves the grid fully opaque.
      useVertexAlpha: Boolean(options.shipDeck)
    }, scene);
    // Keep the ship's tactical grid legible while integrating it into the
    // painted deck. Other scenes retain their current color and opacity.
    surfaceGrid.color = Color3.FromHexString(options.shipDeck ? '#88968b' : '#dbe6d3');
    surfaceGrid.alpha = options.shipDeck ? surfaceId === 'sea' ? 0.18 : 0.38 : 1;
    surfaceGrid.isPickable = false;
    surfaceGrid.metadata = { surfaceId };
    grids.set(surfaceId, surfaceGrid);
  }
  const grid = grids.get(terrain.baseSurfaceId) ?? [...grids.values()][0]!;
  grid.metadata = { ...(grid.metadata ?? {}), surfaceIds: [...grids.keys()] };
  if (options.shipDeck && options.waterTexture) {
    const startedAt = performance.now();
    scene.onBeforeRenderObservable.add(() => {
      const elapsed = (performance.now() - startedAt) / 1000;
      options.waterTexture!.uOffset = (elapsed * .018) % 1;
      options.waterTexture!.vOffset = (elapsed * .007) % 1;
    });
  }
  const structures: Mesh[] = [];
  const occluders = terrain.occluders.map(item => {
    const height = item.top - item.bottom;
    const wall = item.kind === 'wall';
    const isMast = item.id.includes('mast');
    const brokenMast = item.id === 'c2-mast' || item.id === 'c3-mast';
    const width = wall ? tileMeters * (item.axis === 'z' ? .22 : .96) : item.kind === 'arch' ? tileMeters * .8 : isMast ? .46 : tileMeters * .25;
    const depth = wall ? tileMeters * (item.axis === 'z' ? .96 : .22) : tileMeters * .25;
    const mesh = isMast
      ? MeshBuilder.CreateCylinder(`occluder:${item.id}`, { height, diameter: width, tessellation: 10 }, scene)
      : MeshBuilder.CreateBox(`occluder:${item.id}`, { width, depth, height }, scene);
    mesh.position.set((item.cell.col + 0.5) * tileMeters, (item.top + item.bottom) / 2, (item.cell.row + 0.5) * tileMeters);
    if (brokenMast) mesh.rotation.z = item.id === 'c2-mast' ? -0.72 : 0.22;
    mesh.material = materialFor(item.materialId);
    mesh.isPickable = false;
    mesh.metadata = { occluderId: item.id, kind: item.kind, cell: item.cell, bottom: item.bottom, top: item.top, ...(item.axis ? { axis: item.axis } : {}) };
    if (isMast) {
      const x = (item.cell.col + .5) * tileMeters, z = (item.cell.row + .5) * tileMeters;
      const yardMaterial = materialFor('stair-wood');
      if (item.id === 'c1-mast') {
        // The rope ladder is visible all the way from C1 to the crow's nest;
        // P10 remains the authoritative connection between the two surfaces.
        const ladderX = x + tileMeters, ladderZ = z;
        const lines: Vector3[][] = [
          [new Vector3(ladderX - .38, 0.06, ladderZ - .31), new Vector3(ladderX - .38, 15, ladderZ - .31)],
          [new Vector3(ladderX + .38, 0.06, ladderZ + .31), new Vector3(ladderX + .38, 15, ladderZ + .31)]
        ];
        for (let rung = 0.25; rung < 14.9; rung += .38) lines.push([
          new Vector3(ladderX - .38, rung, ladderZ - .31), new Vector3(ladderX + .38, rung, ladderZ + .31)
        ]);
        const ladder = MeshBuilder.CreateLineSystem('mast-rope-ladder:c1-to-crow', { lines }, scene);
        ladder.color = Color3.FromHexString('#a17b4e'); ladder.isPickable = false;
        ladder.metadata = { visualOnly: true, kind: 'mast-ladder', fromSurfaceId: 'main', toSurfaceId: 'crow' };
        structures.push(ladder);
        // The showcase cluster continues up the mast in real geometry: old
        // iron collars, fraying rope and barnacles catch parallax and light.
        const oldIron = new StandardMaterial('c1-mast-weathered-iron', scene);
        oldIron.diffuseColor = Color3.FromHexString('#252d2b'); oldIron.specularColor = Color3.Black();
        const wetRope = new StandardMaterial('c1-mast-wet-rope', scene);
        wetRope.diffuseColor = Color3.FromHexString('#453e31'); wetRope.specularColor = Color3.Black();
        const barnacle = new StandardMaterial('c1-mast-barnacles', scene);
        barnacle.diffuseColor = Color3.FromHexString('#777b70'); barnacle.specularColor = Color3.Black();
        const addMastWear = (detail: Mesh, kind: string) => {
          detail.isPickable = false;
          detail.metadata = { visualOnly: true, kind, deckSurfaceId: 'main' };
          deckDetails.push(detail);
        };
        for (const [index, rise] of [.44, 1.18, 2.04].entries()) {
          const collar = MeshBuilder.CreateTorus(`c1-mast-iron-collar:${index}`,
            { diameter: .55, thickness: .04, tessellation: 20 }, scene);
          collar.position.set(x, item.bottom + rise, z); collar.material = oldIron;
          addMastWear(collar, 'c1-mast-iron-collar');
        }
        for (const [index, offset] of [-.13, .14].entries()) {
          const path = Array.from({ length: 15 }, (_, step) => {
            const t = step / 14, angle = t * Math.PI * 3.7 + offset * 10;
            return new Vector3(x + Math.cos(angle) * (.3 + t * .05), item.bottom + .18 + t * 1.46,
              z + Math.sin(angle) * (.3 + t * .05));
          });
          const strand = MeshBuilder.CreateTube(`c1-mast-frayed-rope:${index}`,
            { path, radius: .018, tessellation: 6 }, scene);
          strand.material = wetRope; addMastWear(strand, 'c1-mast-frayed-rope');
        }
        for (let index = 0; index < 8; index++) {
          const angle = index * 2.399, radius = .28 + (index % 3) * .06;
          const shell = MeshBuilder.CreateSphere(`c1-mast-barnacle:${index}`,
            { diameter: .07 + (index % 4) * .025, segments: 6 }, scene);
          shell.position.set(x + Math.cos(angle) * radius, item.bottom + .13 + (index % 5) * .085,
            z + Math.sin(angle) * radius);
          shell.material = barnacle; addMastWear(shell, 'c1-mast-barnacle');
        }
      }
      const base = MeshBuilder.CreateBox(`mast-foot:${item.id}`, { width: .9, depth: .9, height: .14 }, scene);
      base.position.set(x, item.bottom + .07, z); base.material = yardMaterial; base.isPickable = false;
      base.metadata = { visualOnly: true, kind: 'mast-foot' }; structures.push(base);
      if (!brokenMast) {
        const yardHeights = height >= 8 ? [.48, .76] : [.64];
        yardHeights.forEach((fraction, index) => {
          const yard = MeshBuilder.CreateBox(`mast-yard:${item.id}:${index}`, { width: item.id === 'c1-mast' ? 5 : 2.4, depth: .16, height: .16 }, scene);
          yard.position.set(x, item.bottom + height * fraction, z); yard.material = yardMaterial; yard.isPickable = false;
          yard.metadata = { visualOnly: true, kind: 'mast-yard' }; structures.push(yard);
        });
        const rigging = MeshBuilder.CreateLineSystem(`mast-rigging:${item.id}`, { lines: [
          [new Vector3(x, item.bottom + height * .9, z), new Vector3(x - 1.8, item.bottom + .25, z)],
          [new Vector3(x, item.bottom + height * .9, z), new Vector3(x + 1.8, item.bottom + .25, z)],
          [new Vector3(x, item.bottom + height * .9, z), new Vector3(x, item.bottom + .25, z - 1.8)],
          [new Vector3(x, item.bottom + height * .9, z), new Vector3(x, item.bottom + .25, z + 1.8)]
        ] }, scene);
        rigging.color = Color3.FromHexString('#765636'); rigging.isPickable = false;
        rigging.metadata = { visualOnly: true, kind: 'mast-rigging' }; structures.push(rigging);
      }
    }
    return mesh;
  });
  for (const feature of terrain.structures ?? []) {
    if (feature.kind === 'hatch') {
      const mesh = MeshBuilder.CreateBox(`structure:${feature.id}`, { width: tileMeters * .82, depth: tileMeters * .82, height: .035 }, scene);
      mesh.position.set((feature.cell.col + .5) * tileMeters, feature.height + .03, (feature.cell.row + .5) * tileMeters);
      mesh.material = materialFor(feature.materialId); mesh.isPickable = false; mesh.metadata = { structureId: feature.id, kind: feature.kind, height: feature.height }; structures.push(mesh);
      continue;
    }
    const axisX = feature.direction === 'east' || feature.direction === 'west';
    const sign = feature.direction === 'west' || feature.direction === 'north' ? -1 : 1;
    const run = feature.runCells * tileMeters;
    const descending = feature.riseMeters < 0;
    const startX = (feature.cell.col + (feature.direction === 'west' ? 1 : feature.direction === 'east' ? 0 : .5)) * tileMeters;
    const startZ = (feature.cell.row + (feature.direction === 'north' ? 1 : feature.direction === 'south' ? 0 : .5)) * tileMeters;
    const stairMetadata = { structureId: feature.id, kind: feature.kind, visualOnly: true };
    for (let index = 0; index < feature.steps; index++) {
      const distance = run * (index + .5) / feature.steps;
      const level = (feature.baseHeight ?? 0) + feature.riseMeters * (index + .5) / feature.steps;
      const mesh = MeshBuilder.CreateBox(`structure:${feature.id}:${index}`, {
        width: axisX ? run / feature.steps * .95 : tileMeters * .82,
        depth: axisX ? tileMeters * .82 : run / feature.steps * .95,
        height: .12
      }, scene);
      mesh.position.set(startX + (axisX ? sign * distance : 0), level + .025,
        startZ + (axisX ? 0 : sign * distance));
      mesh.material = materialFor(descending ? 'stair-down' : feature.materialId); mesh.isPickable = false; mesh.metadata = { ...stairMetadata, step: index, height: level }; structures.push(mesh);
      if (descending) {
        // Contrasting nosings make the down route legible in the greybox; these
        // are decorative meshes and do not change walkability or stair links.
        const nosing = MeshBuilder.CreateBox(`structure:${feature.id}:nosing:${index}`, {
          width: axisX ? tileMeters * .79 : .055,
          depth: axisX ? .055 : tileMeters * .79,
          height: .035
        }, scene);
        const edgeDistance = run * (index + 1) / feature.steps;
        const edgeLevel = (feature.baseHeight ?? 0) + feature.riseMeters * (index + 1) / feature.steps;
        nosing.position.set(startX + (axisX ? sign * edgeDistance : 0), edgeLevel + .052,
          startZ + (axisX ? 0 : sign * edgeDistance));
        nosing.material = materialFor('stair-edge'); nosing.isPickable = false; nosing.metadata = stairMetadata; structures.push(nosing);
      }
    }
    if (descending) {
      // Dark stringers with warm caps frame the full opening so it reads as a
      // stairwell rather than another stretch of deck planking.
      const angle = Math.atan2(feature.riseMeters, sign * run);
      for (const side of [-1, 1]) {
        const rail = MeshBuilder.CreateBox(`structure:${feature.id}:stringer:${side}`, {
          width: Math.hypot(run, feature.riseMeters), depth: .15, height: .24
        }, scene);
        rail.position.set(startX + (axisX ? sign * run / 2 : side * tileMeters * .39),
          (feature.baseHeight ?? 0) + feature.riseMeters / 2 + .14,
          startZ + (axisX ? side * tileMeters * .39 : sign * run / 2));
        if (axisX) rail.rotation.z = angle;
        else rail.rotation.x = -angle;
        rail.material = materialFor('stair-rail'); rail.isPickable = false; rail.metadata = stairMetadata; structures.push(rail);
        const cap = MeshBuilder.CreateBox(`structure:${feature.id}:stringer-cap:${side}`, {
          width: Math.hypot(run, feature.riseMeters), depth: .07, height: .07
        }, scene);
        cap.position.copyFrom(rail.position); cap.position.y += .16;
        if (axisX) cap.rotation.z = angle;
        else cap.rotation.x = -angle;
        cap.material = materialFor('stair-edge'); cap.isPickable = false; cap.metadata = stairMetadata; structures.push(cap);
      }
    }
  }
  const ambientLight = new HemisphericLight('terrain-ambient', new Vector3(0, 1, 0), scene);
  ambientLight.intensity = options.ambientIntensity ?? 0.7;
  ambientLight.metadata = { baseIntensity: ambientLight.intensity };
  if (options.shipDeck) {
    ambientLight.diffuse = Color3.FromHexString('#e8e9df');
    ambientLight.groundColor = Color3.FromHexString('#40545c');
    const keyLight = new DirectionalLight('ship-key-light', new Vector3(-0.42, -1, 0.35), scene);
    keyLight.diffuse = Color3.FromHexString('#eee3cb');
    keyLight.intensity = 0.58;
    keyLight.metadata = { baseIntensity: keyLight.intensity };
  }
  const lights = terrain.lights.map(item => {
    const light = new PointLight(`light:${item.id}`, new Vector3((item.cell.col + 0.5) * tileMeters,
      item.height, (item.cell.row + 0.5) * tileMeters), scene);
    light.diffuse = Color3.FromHexString(item.color);
    light.intensity = item.intensity;
    light.range = item.radiusMeters;
    light.metadata = { kind: 'ship-ambient-light', lightId: item.id, baseIntensity: item.intensity };
    return light;
  });
  const camera = new ArcRotateCamera('terrain-ortho', -Math.PI / 4, options.shipDeck ? 1.02 : Math.PI / 3, 18,
    new Vector3(terrain.cols * tileMeters / 2, 0.8, terrain.rows * tileMeters / 2), scene);
  camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
  const aspect = terrain.cols / terrain.rows;
  camera.orthoTop = terrain.rows * tileMeters * 0.95;
  camera.orthoBottom = -camera.orthoTop;
  camera.orthoLeft = -camera.orthoTop * aspect;
  camera.orthoRight = camera.orthoTop * aspect;
  scene.activeCamera = camera;
  return { tiles, grid, grids, deckDetails, occluders, structures, lights, camera };
}
