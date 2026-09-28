import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import type { BaseTexture } from '@babylonjs/core/Materials/Textures/baseTexture.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { Facing } from '../shared/protocol.js';
import type { Cell } from '../shared/protocol.js';

export function rowboatYaw(facing: Facing): number {
  return ({ east: 0, 'north-east': Math.PI / 4, north: Math.PI / 2,
    'north-west': 3 * Math.PI / 4, west: Math.PI, 'south-west': -3 * Math.PI / 4,
    south: -Math.PI / 2, 'south-east': -Math.PI / 4 })[facing];
}

/** Keep the *visible* length of the boat outside the ship, not merely its
 * authoritative one-cell navigation point. The latter intentionally remains
 * beside the boarding rail so P01 and old saves keep working. */
export function rowboatHullClearance(x: number, z: number, yaw: number, hullCells: Cell[], tileMeters: number): { x: number; z: number } {
  const halfLength = 2.48 * 1.1 + .09, halfBeam = 1.08 * 1.1 + .09;
  const extentX = Math.abs(Math.cos(yaw)) * halfLength + Math.abs(Math.sin(yaw)) * halfBeam;
  const extentZ = Math.abs(Math.sin(yaw)) * halfLength + Math.abs(Math.cos(yaw)) * halfBeam;
  const occupied = new Set(hullCells.map(cell => `${cell.col},${cell.row}`));
  let clearX = x, clearZ = z;
  for (let pass = 0; pass < 3; pass++) {
    let west = 0, east = 0, north = 0, south = 0;
    for (const cell of hullCells) {
      const minX = cell.col * tileMeters, maxX = minX + tileMeters;
      const minZ = cell.row * tileMeters, maxZ = minZ + tileMeters;
      const overlapsX = clearX + extentX > minX && clearX - extentX < maxX;
      const overlapsZ = clearZ + extentZ > minZ && clearZ - extentZ < maxZ;
      if (overlapsX && clearZ >= maxZ && clearZ - extentZ < maxZ && !occupied.has(`${cell.col},${cell.row + 1}`))
        south = Math.max(south, maxZ + extentZ - clearZ + .04);
      if (overlapsX && clearZ <= minZ && clearZ + extentZ > minZ && !occupied.has(`${cell.col},${cell.row - 1}`))
        north = Math.min(north, minZ - extentZ - clearZ - .04);
      if (overlapsZ && clearX >= maxX && clearX - extentX < maxX && !occupied.has(`${cell.col + 1},${cell.row}`))
        east = Math.max(east, maxX + extentX - clearX + .04);
      if (overlapsZ && clearX <= minX && clearX + extentX > minX && !occupied.has(`${cell.col - 1},${cell.row}`))
        west = Math.min(west, minX - extentX - clearX - .04);
    }
    const dx = east && west ? Math.abs(east) < Math.abs(west) ? east : west : east || west;
    const dz = south && north ? Math.abs(south) < Math.abs(north) ? south : north : south || north;
    if (!dx && !dz) break;
    clearX += dx; clearZ += dz;
  }
  return { x: clearX - x, z: clearZ - z };
}

/** Open, clinker-built rowing boat. Visual only: the server sea cell remains
 * the sole authority for passengers, movement, boarding and collisions. */
export function buildShipRowboat(scene: Scene, woodTexture?: BaseTexture): TransformNode {
  const root = new TransformNode('wreck-rowboat-3d', scene);
  root.metadata = { visualOnly: true, kind: 'ship-rowboat' };
  root.scaling.setAll(1.1);
  const mat = (name: string, hex: string, texture = false) => {
    const result = new StandardMaterial(`rowboat:${name}`, scene);
    result.diffuseColor = Color3.FromHexString(hex);
    result.specularColor = Color3.FromHexString('#181d1b');
    if (texture && woodTexture) result.diffuseTexture = woodTexture;
    result.backFaceCulling = false;
    return result;
  };
  const hullMat = mat('salt-worn-hull', '#c3b698', true);
  const insideMat = mat('dark-interior', '#2a2923');
  const floorboardMat = mat('interior-floorboards', '#aa9571', true);
  const trimMat = mat('worn-gunwale', '#d0b98e', true);
  const oarMat = mat('oar-wood', '#b99b6e');
  const ironMat = mat('rowlock-iron', '#343c3a');
  const add = (mesh: Mesh, material: StandardMaterial) => {
    mesh.parent = root; mesh.material = material; mesh.isPickable = false;
    mesh.metadata = { visualOnly: true, kind: 'ship-rowboat-detail' };
    return mesh;
  };
  const box = (name: string, x: number, y: number, z: number, w: number, h: number, d: number, material: StandardMaterial) => {
    const mesh = add(MeshBuilder.CreateBox(`rowboat:${name}`, { width: w, height: h, depth: d }, scene), material);
    mesh.position.set(x, y, z); return mesh;
  };
  const tube = (name: string, path: Vector3[], radius: number, material: StandardMaterial) =>
    add(MeshBuilder.CreateTube(`rowboat:${name}`, { path, radius, tessellation: 7, cap: Mesh.CAP_ALL }, scene), material);

  // Five longitudinal profiles make a tapered, genuinely hollow hull. The
  // top gunwales flare wider than the chine; no filled deck image is used.
  const sections = 18, profiles = 5, positions: number[] = [], indices: number[] = [];
  const halfBeam = (t: number) => .96 * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(t), 1.9)), .62) + .08;
  for (let i = 0; i <= sections; i++) {
    const t = -1 + i * 2 / sections, x = t * 2.48, beam = halfBeam(t);
    const rise = Math.pow(Math.abs(t), 2.3) * .18;
    const row: Array<[number, number]> = [[-beam, .39 + rise], [-beam * .8, -.17 + rise], [0, -.45 + rise],
      [beam * .8, -.17 + rise], [beam, .39 + rise]];
    for (const [z, y] of row) positions.push(x, y, z);
  }
  for (let i = 0; i < sections; i++) for (let j = 0; j < profiles - 1; j++) {
    const a = i * profiles + j, b = (i + 1) * profiles + j;
    indices.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const hull = add(new Mesh('rowboat:curved-hull', scene), hullMat);
  const normals: number[] = [];
  VertexData.ComputeNormals(positions, indices, normals);
  const data = new VertexData(); data.positions = positions; data.indices = indices; data.normals = normals;
  data.uvs = Array.from({ length: sections + 1 }, (_, i) => Array.from({ length: profiles }, (_, j) => [i / sections * 2, j / (profiles - 1)])).flat(2);
  data.applyToMesh(hull);
  const inner = add(MeshBuilder.CreateGround('rowboat:inside-floor', { width: 3.75, height: 1.13 }, scene), insideMat);
  inner.position.y = -.24;
  // Opaque fitted floorboards prevent the sea from showing through the open
  // cockpit. Their short ends follow the hull taper instead of forming a
  // rectangular deck that protrudes beyond the curved sides.
  for (let x = -1.95; x <= 1.96; x += .39) {
    const beam = halfBeam(x / 2.48);
    box('cockpit-floorboard', x, -.19, 0, .345, .055, beam * 1.43, floorboardMat);
  }
  for (const side of [-1, 1]) {
    const gunwale: Vector3[] = [];
    for (let i = 0; i <= sections; i++) {
      const t = -1 + i * 2 / sections;
      gunwale.push(new Vector3(t * 2.48, .4 + Math.pow(Math.abs(t), 2.3) * .18, side * halfBeam(t)));
    }
    tube(side < 0 ? 'port-gunwale' : 'starboard-gunwale', gunwale, .065, trimMat);
    for (const x of [-1.48, -.72, 0, .72, 1.48]) {
      const beam = halfBeam(x / 2.48);
      tube('inside-rib', [new Vector3(x, .28, side * beam * .9),
        new Vector3(x, -.21, side * beam * .69), new Vector3(x, -.29, 0)], .032, trimMat);
    }
    box('rowlock', -.12, .42, side * .92, .16, .15, .2, ironMat);
    const oar = tube('oar', [new Vector3(.27, .42, side * .12), new Vector3(-.12, .47, side * .94),
      new Vector3(-.55, .37, side * 2.12)], .055, oarMat);
    oar.metadata = { visualOnly: true, kind: 'ship-rowboat-oar' };
    const blade = box('oar-blade', -.62, .33, side * 2.27, .37, .045, .62, oarMat);
    blade.rotation.y = side * .24;
  }
  for (const x of [-1.13, .02, 1.15]) {
    const beam = halfBeam(x / 2.48);
    box('thwart', x, .15, 0, .3, .11, beam * 1.7, trimMat);
    box('thwart-support', x, -.02, -.38, .1, .33, .11, hullMat);
    box('thwart-support', x, -.02, .38, .1, .33, .11, hullMat);
  }
  tube('bow-stem', [new Vector3(2.12, -.14, 0), new Vector3(2.48, .57, 0)], .09, trimMat);
  tube('stern-stem', [new Vector3(-2.1, -.14, 0), new Vector3(-2.48, .57, 0)], .09, trimMat);
  for (const side of [-1, 1]) tube('stern-transom', [new Vector3(-2.36, .5, 0),
    new Vector3(-2.18, .35, side * .44)], .055, trimMat);
  return root;
}
