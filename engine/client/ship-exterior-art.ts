import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Material } from '@babylonjs/core/Materials/material.js';
import type { BaseTexture } from '@babylonjs/core/Materials/Textures/baseTexture.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { TerrainDefinition } from '../shared/terrain.js';
import { softPoolMaterial, worldSurfaceUV } from './diorama-kit.js';

/** Art mask for the approved V6 hull, in its expanded 56 × 32 coordinates.
 * Cabins, lower decks and the crow's nest retain their existing materials. */
export function isWreckExteriorCell(surfaceId: string, col: number, row: number) {
  return surfaceId === 'c2' || surfaceId === 'c3'
    || surfaceId === 'main' && (col >= 25 && col <= 31 || row <= 7 || row >= 20);
}

/** Separate, batched decoration attached to the actual surface elevations. */
export function buildShipExteriorArt(scene: Scene, terrain: TerrainDefinition, timber: BaseTexture, sailTexture?: BaseTexture, debrisTexture?: BaseTexture): Mesh[] {
  if (terrain.cols !== 56 || terrain.rows !== 32 || terrain.baseSurfaceId !== 'main') return [];
  const groups = new Map<string, Mesh[]>(), result: Mesh[] = [];
  const makeMaterial = (id: string, hex: string, texture = false) => {
    const m = new StandardMaterial(`ship-exterior:${id}`, scene);
    m.diffuseColor = Color3.FromHexString(hex); m.specularColor = Color3.Black();
    if (texture) m.diffuseTexture = timber;
    return m;
  };
  const wood = makeMaterial('oak', '#b1afa0', true), endgrain = makeMaterial('split-oak', '#7d7763', true);
  const iron = makeMaterial('oxidised-iron', '#303b39'), rope = makeMaterial('salt-rope', '#787361');
  const kelp = makeMaterial('kelp', '#405c49');
  const damp = makeMaterial('damp', '#142c2a');
  const contact = softPoolMaterial(scene, 'ship-exterior:contact-shadow', '#071719', .58);
  damp.disableLighting = true; damp.backFaceCulling = false;
  damp.transparencyMode = Material.MATERIAL_ALPHABLEND;
  const m = terrain.tileMeters;
  const add = (mesh: Mesh, surface: string, material: StandardMaterial) => {
    mesh.material = material; mesh.isPickable = false; mesh.checkCollisions = false;
    if (material === wood || material === endgrain) worldSurfaceUV(mesh, 4.5);
    const key = `${surface}|${material.name}`, bucket = groups.get(key) ?? [];
    bucket.push(mesh); groups.set(key, bucket);
    return mesh;
  };
  const box = (surface: string, x: number, y: number, z: number, w: number, h: number, d: number, material: StandardMaterial) => {
    const mesh = MeshBuilder.CreateBox('exterior-detail', { width: w, height: h, depth: d }, scene);
    mesh.position.set(x, y, z); return add(mesh, surface, material);
  };
  const tube = (surface: string, path: Vector3[], radius: number, material = rope) =>
    add(MeshBuilder.CreateTube('exterior-cordage', { path, radius, tessellation: 6 }, scene), surface, material);
  const upperCells = new Set(terrain.surfaces.filter(s => s.id === 'c2' || s.id === 'c3')
    .flatMap(s => s.tiles.map(t => `${t.cell.col},${t.cell.row}`)));
  const sides = [
    { dc: 0, dr: -1, side: 'north' }, { dc: 1, dr: 0, side: 'east' },
    { dc: 0, dr: 1, side: 'south' }, { dc: -1, dr: 0, side: 'west' }
  ] as const;
  for (const surface of terrain.surfaces.filter(s => ['c1-hull', 'c2', 'c3'].includes(s.id))) {
    const occupied = new Set(surface.tiles.map(t => `${t.cell.col},${t.cell.row}`));
    for (const tile of surface.tiles) {
      const { col, row } = tile.cell;
      if (surface.id === 'c1-hull' && upperCells.has(`${col},${row}`)) continue;
      for (const edge of sides) {
        if (occupied.has(`${col + edge.dc},${row + edge.dr}`)) continue;
        // Never dress a stair landing, boarding break, or the inside of a mast hole.
        if (terrain.railGaps?.some(g => g.surfaceId === surface.id && g.cell.col === col && g.cell.row === row && g.edge === edge.side)) continue;
        if (terrain.occluders.some(o => o.id.includes('mast') && o.cell.col === col + edge.dc && o.cell.row === row + edge.dr)) continue;
        // C1 context has an internal cut-out for the descending stairs.
        if (surface.id === 'c1-hull' && col > 17 && col < 39 && row > 7 && row < 20) continue;
        const x = (col + .5 + edge.dc * .47) * m, z = (row + .5 + edge.dr * .47) * m;
        const y = tile.corners[0]!, alongX = edge.dc === 0, seed = col * 7 + row * 13;
        // Substantial lower bulwark, with irregular seams and recessed iron straps.
        box(surface.id, x, y + .29, z, alongX ? m * .96 : .16, .24, alongX ? .16 : m * .96, wood);
        if (seed % 3 === 0) {
          box(surface.id, x, y + .3, z, alongX ? .075 : .185, .29, alongX ? .185 : .075, iron);
          box(surface.id, x, y + .37, z, .215, .74, .215, wood);
          const cap = MeshBuilder.CreateCylinder('exterior-post-cap', { height: .09, diameter: .27, tessellation: 8 }, scene);
          cap.position.set(x, y + .76, z); add(cap, surface.id, iron);
          tube(surface.id, [new Vector3(x - (alongX ? .63 : 0), y + .68, z - (alongX ? 0 : .63)),
            new Vector3(x, y + .48, z), new Vector3(x + (alongX ? .63 : 0), y + .68, z + (alongX ? 0 : .63))], .025);
        }
      }
    }
  }
  // Broken exterior frames descend from the actual c1-hull outline. Their
  // positions follow occupied tile edges, so the boarding gap and stair holes
  // stay clear and the playable footprint is untouched.
  const hull = terrain.surfaces.find(s => s.id === 'c1-hull');
  if (hull) {
    const occupied = new Set(hull.tiles.map(t => `${t.cell.col},${t.cell.row}`));
    for (const tile of hull.tiles) {
      const { col, row } = tile.cell;
      if (col % 4 !== 1) continue;
      for (const side of [-1, 1]) {
        const outer = side < 0 ? !occupied.has(`${col},${row - 1}`) : !occupied.has(`${col},${row + 1}`);
        if (!outer || side < 0 && row > 11 || side > 0 && row < 15) continue;
        const x = (col + .5) * m, z = (row + (side > 0 ? 1 : 0)) * m + side * .12;
        const relief = (col * 17 + row * 11) % 3;
        tube('c1-hull', [new Vector3(x, -.16, z), new Vector3(x + .09, -1.8, z + side * .12),
          new Vector3(x + .12, -3.7 - relief * .22, z + side * .28)], .12, endgrain);
        // Barnacles and a few trailing algae anchor the hull to the waterline.
        for (let i = 0; i < 3; i++) {
          const shell = MeshBuilder.CreateSphere('exterior-hull-barnacle', { diameter: .12 + i * .035, segments: 5 }, scene);
          shell.position.set(x + (i - 1) * .25, -2.55 + i * .19, z + side * .13);
          add(shell, 'c1-hull', endgrain);
        }
        if (relief === 0) tube('c1-hull', [new Vector3(x + .12, -2.3, z + side * .18),
          new Vector3(x + .37, -3.05, z + side * .32), new Vector3(x + .3, -3.9, z + side * .42)], .035, kelp);
      }
    }
  }
  for (const surface of terrain.surfaces.filter(s => ['main', 'c2', 'c3'].includes(s.id))) {
    for (const tile of surface.tiles) {
      const { col, row } = tile.cell, seed = col * 71 + row * 37;
      if (!isWreckExteriorCell(surface.id, col, row) || tile.kind !== 'floor' || seed % 11 !== 0) continue;
      const x = (col + .5) * m, z = (row + .5) * m, y = tile.corners[0]!;
      // Soft irregular salt/wet staining, flat enough to remain fully traversable.
      const positions = [x, y + .008, z], colors = [1, 1, 1, .35], indices: number[] = [];
      for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6, r = .38 + .12 * Math.sin(seed + i * 1.7);
        positions.push(x + Math.cos(a) * r * 1.6, y + .008, z + Math.sin(a) * r);
        colors.push(1, 1, 1, 0); indices.push(0, i + 1, (i + 1) % 12 + 1);
      }
      const stain = new Mesh('exterior-damp-patch', scene), data = new VertexData();
      data.positions = positions; data.indices = indices; data.colors = colors;
      data.normals = Array.from({ length: positions.length / 3 }, () => [0, 1, 0]).flat();
      data.applyToMesh(stain); stain.hasVertexAlpha = true; add(stain, surface.id, damp);
      if (seed % 3 === 0) {
        // Low wood splinters, never a new standing obstacle or a false hole.
        const splinter = box(surface.id, x, y + .027, z, .62, .025, .055, endgrain);
        splinter.rotation.y = Math.sin(seed) * .24;
      }
    }
  }
  for (const mast of terrain.occluders.filter(o => ['c1-mast', 'c2-mast', 'c3-mast'].includes(o.id))) {
    const pool = MeshBuilder.CreateGround('exterior-mast-contact', { width: 2.2, height: 1.7 }, scene);
    pool.position.set((mast.cell.col + .5) * m, mast.bottom + .011, (mast.cell.row + .5) * m);
    add(pool, mast.id === 'c1-mast' ? 'main' : mast.id === 'c2-mast' ? 'c2' : 'c3', contact);
  }
  // P01 is the canonical easy boarding route from the rowboat. Its worn
  // starboard rigging reads as an actual climb, while the server retains the
  // movement link and any decision about a check belongs to the DM.
  const boarding = terrain.railGaps?.find(gap => gap.surfaceId === 'c1-hull' && gap.edge === 'south'
    && gap.cell.col === 29 && gap.cell.row === 20);
  if (boarding) {
    const x = (boarding.cell.col + .5) * m, z = (boarding.cell.row + 1) * m;
    for (const side of [-1, 1]) tube('c1-hull', [
      new Vector3(x + side * .43, .34, z - .28),
      new Vector3(x + side * .53, -1.15, z + .74),
      new Vector3(x + side * .61, -2.78, z + 1.45)
    ], .035);
    for (let rung = 0; rung < 5; rung++) {
      const t = rung / 5;
      tube('c1-hull', [new Vector3(x - .45 - t * .14, .2 - t * 2.8, z + t * 1.55),
        new Vector3(x + .45 + t * .14, .2 - t * 2.8, z + t * 1.55)], .029);
    }
  }
  for (const mast of terrain.occluders.filter(o => o.id === 'c2-mast' || o.id === 'c3-mast')) {
    const surfaceId = mast.id.startsWith('c2') ? 'c2' : 'c3', angle = surfaceId === 'c2' ? -.72 : .22;
    const h = mast.top - mast.bottom, x = (mast.cell.col + .5) * m, z = (mast.cell.row + .5) * m;
    const axis = new Vector3(-Math.sin(angle), Math.cos(angle), 0), center = new Vector3(x, mast.bottom + h / 2, z);
    for (let i = 0; i < 7; i++) {
      const a = i * Math.PI * 2 / 7, length = .22 + .19 * (1 + Math.sin(i * 2.1)) / 2;
      const spike = MeshBuilder.CreateCylinder('exterior-mast-splinter', { height: length, diameterBottom: .095, diameterTop: .008, tessellation: 4 }, scene);
      spike.position.copyFrom(center.add(axis.scale(h / 2 + length * .23)));
      spike.position.x += Math.cos(a) * .13; spike.position.z += Math.sin(a) * .13;
      spike.rotation.z = angle; add(spike, surfaceId, endgrain);
    }
    for (const fraction of [-.3, .08]) {
      const collar = MeshBuilder.CreateTorus('exterior-broken-mast-collar', { diameter: .475, thickness: .052, tessellation: 16 }, scene);
      collar.position.copyFrom(center.add(axis.scale(h * fraction))); collar.rotation.z = angle; add(collar, surfaceId, iron);
    }
    const top = center.add(axis.scale(h * .31));
    tube(surfaceId, [top, top.add(new Vector3(.45, -.7, .18)), new Vector3(x + .4, mast.bottom + .12, z + .28)], .035);
  }
  // Merge only within a surface/material: lower-deck cutaways remain independent.
  for (const [key, meshes] of groups) {
    const merged = Mesh.MergeMeshes(meshes, true, true, undefined, false, false);
    if (!merged) continue;
    const surfaceId = key.split('|')[0]!;
    merged.name = `ship-exterior:${key}`; merged.isPickable = false; merged.checkCollisions = false;
    merged.hasVertexAlpha = key.endsWith(':damp');
    merged.metadata = { visualOnly: true, kind: 'ship-exterior-art', deckSurfaceId: surfaceId };
    merged.freezeWorldMatrix(); result.push(merged);
  }
  if (sailTexture) {
    const clothMaterial = makeMaterial('tattered-linen', '#c3c1af');
    clothMaterial.diffuseTexture = sailTexture; clothMaterial.useAlphaFromDiffuseTexture = true;
    clothMaterial.backFaceCulling = false; clothMaterial.transparencyMode = Material.MATERIAL_ALPHATEST;
    clothMaterial.alphaCutOff = .32;
    for (const mast of terrain.occluders.filter(o => o.id === 'c1-mast' || o.id === 'c2-mast')) {
      const main = mast.id === 'c1-mast', surfaceId = main ? 'main' : 'c2';
      const x = (mast.cell.col + .5) * m + (main ? .7 : .62), z = (mast.cell.row + .5) * m;
      const y = main ? mast.bottom + (mast.top - mast.bottom) * .48 : mast.top - .65;
      const width = main ? 1.7 : 1.05, height = main ? 1.8 : 1.1;
      const positions: number[] = [], uvs: number[] = [], indices: number[] = [], normals: number[] = [];
      for (let row = 0; row <= 6; row++) for (let col = 0; col <= 5; col++) {
        const u = col / 5, v = row / 6;
        positions.push(x + u * width, y - v * height, z + .1 + Math.sin(u * 6) * v * .12);
        uvs.push(u, 1 - v);
        if (row < 6 && col < 5) { const i = row * 6 + col; indices.push(i, i + 1, i + 6, i + 1, i + 7, i + 6); }
      }
      VertexData.ComputeNormals(positions, indices, normals);
      const cloth = new Mesh(`ship-exterior:wind-sail:${surfaceId}`, scene), data = new VertexData();
      data.positions = positions; data.uvs = uvs; data.indices = indices; data.normals = normals; data.applyToMesh(cloth, true);
      cloth.material = clothMaterial; cloth.isPickable = false; cloth.checkCollisions = false;
      cloth.metadata = { visualOnly: true, kind: 'ship-exterior-sail', deckSurfaceId: surfaceId };
      result.push(cloth);
      scene.onBeforeRenderObservable.add(() => {
        if (!cloth.isVisible) return;
        const time = performance.now() / 1000;
        for (let row = 0; row <= 6; row++) for (let col = 0; col <= 5; col++)
          positions[(row * 6 + col) * 3 + 2] = z + .1 + Math.sin(time * 1.4 + col * .9 + row * .35) * (row / 6) * .17;
        cloth.updateVerticesData('position', positions);
      });
    }
  }
  // A single, deliberately placed canonical C1 debris cluster: boots, bones,
  // recent stains, saltweed and loose rigging. It never covers the P01 landing,
  // hatch, doors, mast or pickable floor.
  if (debrisTexture && terrain.surfaces.find(s => s.id === 'main')?.tiles.some(t => t.cell.col === 27 && t.cell.row === 18)) {
    const debris = MeshBuilder.CreateGround('ship-exterior:c1-boarding-debris', { width: 3.25, height: 3.25 }, scene);
    debris.position.set(27.5 * m, .024, 18.5 * m);
    debris.rotation.y = -.19;
    const material = makeMaterial('c1-boarding-debris', '#ccd0c7');
    material.diffuseTexture = debrisTexture; material.useAlphaFromDiffuseTexture = true;
    material.transparencyMode = Material.MATERIAL_ALPHABLEND; material.backFaceCulling = false;
    material.specularColor = Color3.Black();
    debris.material = material; debris.isPickable = false; debris.checkCollisions = false;
    debris.metadata = { visualOnly: true, kind: 'ship-exterior-debris', deckSurfaceId: 'main' };
    result.push(debris);
  }
  return result;
}
