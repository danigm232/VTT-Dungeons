import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { worldSurfaceUV } from '../../../engine/client/diorama-kit.js';

type Relief = 'rock' | 'timber' | 'cloth' | 'water';
const normalMaps = new WeakMap<Scene, Map<Relief, RawTexture>>();
const foamMaps = new WeakMap<Scene, RawTexture>();

/** Cellular foam with real transparent gaps, shared by the surf ribbons.
 * Static mask: wave geometry and existing clocks still govern the break. */
export function campFoamTexture(scene: Scene) {
  const existing = foamMaps.get(scene); if (existing) return existing;
  const size = 128, cells = 8, data = new Uint8Array(size * size * 4);
  const random = (x: number, y: number) => {
    const v = Math.sin(((x + cells) % cells) * 127.1 + ((y + cells) % cells) * 311.7) * 43758.5453;
    return v - Math.floor(v);
  };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size * cells, v = y / size * cells, gx = Math.floor(u), gy = Math.floor(v);
    let first = Infinity, second = Infinity;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const px = gx + i + .2 + random(gx + i, gy + j) * .6;
      const py = gy + j + .2 + random(gy + j, gx + i) * .6;
      const d = Math.hypot(u - px, v - py);
      if (d < first) { second = first; first = d; } else if (d < second) second = d;
    }
    const cellEdge = Math.max(0, 1 - (second - first) * 9);
    const fleck = .72 + .28 * Math.sin(x * 1.8 + y * 2.7), index = (y * size + x) * 4;
    data[index] = 237; data[index + 1] = 248; data[index + 2] = 245;
    data[index + 3] = Math.round(cellEdge * fleck * 230);
  }
  const texture = RawTexture.CreateRGBATexture(data, size, size, scene, true, false, Texture.TRILINEAR_SAMPLINGMODE);
  texture.name = 'camp:cellular-surf-foam'; texture.hasAlpha = true; texture.wrapU = texture.wrapV = Texture.WRAP_ADDRESSMODE;
  foamMaps.set(scene, texture); return texture;
}

/** Four small, periodic normal maps, shared by every material in a scene.
 * This is native material detail, independent of artwork and navigation. */
export function campMaterialRelief(scene: Scene, material: StandardMaterial, kind: Relief) {
  let maps = normalMaps.get(scene);
  if (!maps) { maps = new Map(); normalMaps.set(scene, maps); }
  let texture = maps.get(kind);
  if (!texture) {
    const size = 128, data = new Uint8Array(size * size * 4), tau = Math.PI * 2;
    const height = (x: number, y: number) => {
      const u = x / size * tau, v = y / size * tau;
      if (kind === 'cloth') return Math.sin(u * 32) * .022 + Math.sin(v * 32) * .022 + Math.sin(u * 4 + v * 2) * .018;
      if (kind === 'timber') return Math.sin(v * 20 + Math.sin(u * 2) * 1.6) * .075 + Math.sin(v * 43 + Math.sin(u * 3)) * .025;
      if (kind === 'water') return Math.sin(u * 3 + v * 5 + Math.sin(v * 2)) * .04
        + Math.cos(u * 7 - v * 4 + .6*Math.sin(u*2)) * .031
        + Math.sin(u*11+v*9+.9)*.022+Math.cos(u*17-v*13+2.1)*.013;
      const bedding = Math.sin(v * 7 + Math.sin(u * 2) * .8);
      return Math.sin(u * 3 + v * 2) * .13 + Math.cos(u * 7 - v * 9) * .065
        + Math.sin(u * 17 + v * 13) * .022 - Math.pow(Math.max(0, bedding - .72), 2) * .8;
    };
    const strength = kind === 'rock' ? 3 : kind === 'water' ? 2.3 : 1.6;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const dx = (height(x + 1, y) - height(x - 1, y)) * strength;
      const dy = (height(x, y + 1) - height(x, y - 1)) * strength;
      const length = Math.hypot(dx, dy, 1), i = (y * size + x) * 4;
      data[i] = Math.round(127.5 * (1 - dx / length));
      data[i + 1] = Math.round(127.5 * (1 - dy / length));
      data[i + 2] = Math.round(127.5 * (1 + 1 / length)); data[i + 3] = 255;
    }
    texture = RawTexture.CreateRGBATexture(data, size, size, scene, true, false, Texture.TRILINEAR_SAMPLINGMODE);
    texture.name = 'camp:shared-' + kind + '-relief'; texture.wrapU = texture.wrapV = Texture.WRAP_ADDRESSMODE;
    texture.level = kind === 'rock' ? .55 : kind === 'water' ? .65 : .35;
    maps.set(kind, texture);
  }
  material.bumpTexture = texture;
}

/** Broad material variation follows the world surface rather than one stretched photo. */
export function weatherRock(mesh: Mesh, seed: number, damp = false) {
  const p = mesh.getVerticesData('position'), n = mesh.getVerticesData('normal'); if (!p || !n) return;
  const colors: number[] = [];
  for (let i = 0; i < p.length; i += 3) {
    const x = p[i]!, y = p[i + 1]!, z = p[i + 2]!;
    const strata = .86 + Math.sin(y * 3.2 + x * .26 + seed) * .055 + Math.cos(z * .72 + x * .42) * .055;
    const crevice = Math.max(0, -n[i + 1]!) * .16;
    const moss = Math.max(0, Math.sin(x * .47 - z * .38 + seed) - .35) * Math.max(0, n[i + 1]!) * (damp ? .24 : .1);
    colors.push(strata - crevice - moss * .48, strata - crevice - moss * .17, strata - crevice - moss * .67, 1);
  }
  mesh.setVerticesData('color', colors); mesh.useVertexColors = true;
}

/** Local-space cloth retains the pivot expected by the paired interaction system. */
export function campClothSurface(scene: Scene, name: string, width: number, depth: number, loft = .06) {
  const mesh=MeshBuilder.CreateGround(name,{width,height:depth,subdivisions:10,updatable:true},scene),p=mesh.getVerticesData('position')!,normals:number[]=[],colors:number[]=[];
  for(let i=0;i<p.length;i+=3){const x=p[i]!/width+.5,z=p[i+2]!/depth+.5,fold=Math.sin(x*29+z*11)*.012;
    p[i+1]=Math.sin(x*Math.PI)*Math.sin(z*Math.PI)*loft+fold*Math.sin(x*Math.PI);
    const shade=.86+Math.sin(x*Math.PI)*.1+Math.cos(z*17)*.025;colors.push(shade,shade*.985,shade*.95,1);
  }
  mesh.updateVerticesData('position',p);VertexData.ComputeNormals(p,mesh.getIndices()!,normals);mesh.updateVerticesData('normal',normals);mesh.setVerticesData('color',colors);return mesh;
}

type Palette = { wood: StandardMaterial; darkWood: StandardMaterial; metal: StandardMaterial; brass: StandardMaterial; pottery: StandardMaterial; linen: StandardMaterial; paper: StandardMaterial };
type Collect = (mesh: Mesh, at: Vector3, material: StandardMaterial) => Mesh;

/** A feathered, eroded edge replaces square visual trail tiles only.
 * The tile addresses, grid and walking surface stay in the terrain system. */
export function wornCampTrail(scene: Scene, cells: Array<{ col: number; row: number }>, material: StandardMaterial) {
  const keys = new Set(cells.map(c => c.col + ',' + c.row)), positions: number[] = [], indices: number[] = [], uvs: number[] = [], colors: number[] = [], normals: number[] = [];
  const n = 4;
  for (const cell of cells) {
    const west = !keys.has((cell.col - 1) + ',' + cell.row), east = !keys.has((cell.col + 1) + ',' + cell.row);
    const north = !keys.has(cell.col + ',' + (cell.row - 1)), south = !keys.has(cell.col + ',' + (cell.row + 1));
    const base = positions.length / 3;
    for (let z = 0; z <= n; z++) for (let x = 0; x <= n; x++) {
      let wx = (cell.col + x / n) * 1.5, wz = (cell.row + z / n) * 1.5;
      const edge = x === 0 && west || x === n && east || z === 0 && north || z === n && south;
      if (x === 0 && west) wx -= .22 + .12 * Math.sin(wz * 2.4);
      if (x === n && east) wx += .23 + .12 * Math.cos(wz * 2.1);
      if (z === 0 && north) wz -= .23 + .11 * Math.cos(wx * 2.3);
      if (z === n && south) wz += .23 + .12 * Math.sin(wx * 2.7);
      positions.push(wx, .012, wz); uvs.push(wz / 6, wx / 6);
      const shade = .85 + .07 * Math.sin(wx * .72 + wz * .42);
      const borderDistance = Math.min(west ? x : n, east ? n - x : n, north ? z : n, south ? n - z : n);
      const opacity = Math.min(1, borderDistance / 2) * .97;
      colors.push(shade, shade * .96, shade * .9, edge ? 0 : opacity);
      if (x < n && z < n) { const i = base + z * (n + 1) + x; indices.push(i, i + 1, i + n + 1, i + 1, i + n + 2, i + n + 1); }
    }
  }
  VertexData.ComputeNormals(positions, indices, normals);
  const mesh = new Mesh('camp:eroded-forest-trail', scene), data = new VertexData();
  Object.assign(data, { positions, indices, uvs, colors, normals }); data.applyToMesh(mesh); mesh.material = material; mesh.hasVertexAlpha = true;
  return mesh;
}

/** Small assemblies join the caller's existing static or room batch. No extra lights,
 * interactive targets, collision shapes, asset downloads or render observers. */
export function createCampDetailKit(scene: Scene, palette: Palette, collect: Collect) {
  const block = (name: string, at: Vector3, w: number, h: number, d: number, mat = palette.wood, yaw = 0) => {
    const mesh = collect(MeshBuilder.CreateBox('camp:detail:' + name, { width: w, height: h, depth: d }, scene), at, mat);
    mesh.rotation.y = yaw; worldSurfaceUV(mesh, 1.2); return mesh;
  };
  const tube = (name: string, path: Vector3[], radius: number, mat = palette.linen) =>
    collect(MeshBuilder.CreateTube('camp:detail:' + name, { path, radius, tessellation: 5, cap: Mesh.CAP_ALL }, scene), Vector3.Zero(), mat);
  const round = (name: string, at: Vector3, w: number, h: number, mat = palette.pottery, top = w) =>
    collect(MeshBuilder.CreateCylinder('camp:detail:' + name, { diameterBottom: w, diameterTop: top, height: h, tessellation: 12 }, scene), at, mat);
  const ring = (name: string, at: Vector3, diameter: number, thickness: number, mat = palette.metal) =>
    collect(MeshBuilder.CreateTorus('camp:detail:' + name, { diameter, thickness, tessellation: 16 }, scene), at, mat);
  function bowl(at: Vector3, radius = .16, mat = palette.pottery) {
    const profile = [new Vector3(0, 0, 0), new Vector3(radius * .55, 0, 0), new Vector3(radius, radius * .42, 0), new Vector3(radius * .88, radius * .45, 0), new Vector3(radius * .5, radius * .1, 0), new Vector3(0, radius * .1, 0)];
    return collect(MeshBuilder.CreateLathe('camp:detail:open-bowl', { shape: profile, tessellation: 12, sideOrientation: Mesh.DOUBLESIDE }, scene), at, mat);
  }
  function coil(at: Vector3, radius = .32) {
    const path = Array.from({ length: 49 }, (_, i) => { const a = i / 48 * Math.PI * 6, r = radius * (.3 + i / 48 * .7); return at.add(new Vector3(Math.cos(a) * r, .012 * Math.sin(a * .7), Math.sin(a) * r)); });
    tube('coiled-rope', path, .024);
  }
  function basket(at: Vector3, size = .58) {
    round('basket-body', at.add(new Vector3(0, size * .3, 0)), size * .7, size * .6, palette.wood, size);
    for (let i = 0; i < 5; i++) ring('basket-weave', at.add(new Vector3(0, size * (.09 + i * .12), 0)), size * (.71 + i * .056), .025, palette.darkWood);
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; tube('basket-rib', [at.add(new Vector3(Math.cos(a) * size * .35, .02, Math.sin(a) * size * .35)), at.add(new Vector3(Math.cos(a) * size * .49, size * .6, Math.sin(a) * size * .49))], .014); }
    bowl(at.add(new Vector3(0, size * .53, 0)), size * .43, palette.darkWood);
  }
  function bottle(at: Vector3, size = .25, mat = palette.pottery) {
    const shape = [new Vector3(0, 0, 0), new Vector3(size * .3, 0, 0), new Vector3(size * .39, size * .5, 0), new Vector3(size * .16, size * .75, 0), new Vector3(size * .15, size, 0), new Vector3(0, size, 0)];
    collect(MeshBuilder.CreateLathe('camp:detail:flask', { shape, tessellation: 12 }, scene), at, mat);
    round('flask-stopper', at.add(new Vector3(0, size * 1.01, 0)), size * .25, size * .08, palette.darkWood);
  }
  function crate(at: Vector3, size = .7, yaw = 0) {
    block('crate-core', at.add(new Vector3(0, size * .45, 0)), size, size * .86, size, palette.darkWood, yaw);
    for (let i = 0; i < 4; i++) {
      const y = size * (.12 + i * .21);
      for (const side of [-1, 1]) {
        block('crate-board', at.add(new Vector3(0, y, side * size * .51)), size * 1.04, size * .17, .028, palette.wood, yaw);
        block('crate-board-end', at.add(new Vector3(side * size * .51, y, 0)), .028, size * .17, size, palette.wood, yaw);
      }
    }
    for (const x of [-1, 1]) for (const z of [-1, 1]) block('crate-corner', at.add(new Vector3(x * size * .43, size * .45, z * size * .51)), .07, size * .89, .045, palette.wood);
  }
  function stool(at: Vector3, size = .46) {
    round('stool-seat', at.add(new Vector3(0, size, 0)), size * 1.2, .09, palette.wood);
    for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3; tube('stool-leg', [at.add(new Vector3(Math.cos(a) * size * .39, .02, Math.sin(a) * size * .39)), at.add(new Vector3(Math.cos(a) * size * .28, size, Math.sin(a) * size * .28))], .04, palette.darkWood); }
  }
  function timberTrim(at: Vector3, w: number, d: number, y: number) {
    for (const side of [-1, 1]) block('furniture-edge', at.add(new Vector3(0, y, side * d * .48)), w * 1.02, .04, .035);
    for (const x of [-1, 1]) for (const z of [-1, 1]) round('iron-nail', at.add(new Vector3(x * w * .42, y + .032, z * d * .4)), .024, .012, palette.metal);
  }
  return { block, tube, round, ring, bowl, coil, basket, bottle, crate, stool, timberTrim };
}
