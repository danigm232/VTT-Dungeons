import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight.js';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight.js';
import { PointLight } from '@babylonjs/core/Lights/pointLight.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import { Constants } from '@babylonjs/core/Engines/constants.js';
import type { PublicSceneDefinition } from '../../../engine/shared/campaign.js';
import type { CampRestPhase, CampRestState } from '../../../engine/shared/camp-rest.js';
import { Scene } from '@babylonjs/core/scene.js';

const CELL = 1.5;
const color = (value: string) => Color3.FromHexString(value);
const cellPoint = (cell: { col: number; row: number }) => new Vector3((cell.col + .5) * CELL, 0, (cell.row + .5) * CELL);

function quad(scene: Scene, root: TransformNode, name: string, points: number[][], material: StandardMaterial) {
  const mesh = new Mesh(name, scene), data = new VertexData(), positions = points.flat(), indices = [0, 1, 2, 0, 2, 3], normals: number[] = [];
  VertexData.ComputeNormals(positions, indices, normals); data.positions = positions; data.indices = indices; data.normals = normals;
  data.uvs = [0, 0, 1, 0, 1, 1, 0, 1]; data.applyToMesh(mesh); mesh.material = material; mesh.parent = root; mesh.isPickable = false; return mesh;
}

export type CampVisuals = { root: TransformNode; update: (elapsedSeconds: number, phase?: CampRestPhase | null, interactions?: CampRestState['interactions']) => void; setInteractionHighlights: (enabled: boolean) => void };

/** Adds only decorative camp geometry to the existing VTT Babylon scene.
 * Movement, grid, camera, characters and collisions stay in the shared runtime. */
export function createCampVisuals(scene: Scene, definition: PublicSceneDefinition): CampVisuals | null {
  const camp = definition.camp;
  if (!camp) return null;
  const root = new TransformNode(`camp-visuals:${definition.id}`, scene);
  const mats: Record<string, StandardMaterial> = {};
  const mat = (id: string, hex: string, options: { emissive?: string; alpha?: number; twoSided?: boolean } = {}) => {
    const value = new StandardMaterial(`camp:${definition.id}:${id}`, scene);
    value.diffuseColor = color(hex); value.specularColor = Color3.FromHexString('#11181b');
    if (options.emissive) value.emissiveColor = color(options.emissive);
    if (options.alpha !== undefined) value.alpha = options.alpha;
    if (options.twoSided) value.backFaceCulling = false;
    mats[id] = value; return value;
  };
  const M = {
    stone: mat('stone', '#76766e'), darkStone: mat('dark-stone', '#343a3d'), lightStone: mat('light-stone', '#969183'),
    bark: mat('bark', '#4d3929'), wood: mat('wood', '#78573a'), canvas: mat('canvas', '#b9a27a', { alpha: .68, twoSided: true }), canvas2: mat('canvas-2', '#7c8c80', { alpha: .68, twoSided: true }),
    canvas3: mat('canvas-3', '#7d738c', { alpha: .68, twoSided: true }), chestWood: mat('chest-wood', '#684426'), brass: mat('brass', '#bd9b59', { emissive: '#30230f' }),
    bed: mat('bed', '#98745d'), cloth: mat('cloth', '#6c7c7d'), leaf: mat('leaf', '#294536'), leaf2: mat('leaf-2', '#416044'), pine: mat('pine', '#263c37'),
    sand: mat('sand', '#a99878'), rock: mat('rock', '#51595b'), sea: mat('sea', '#143848', { alpha: .88 }), foam: mat('foam', '#9bc7c7', { emissive: '#254d53', alpha: .72 }),
    flame: mat('flame', '#ff9b38', { emissive: '#e15b18' }), ember: mat('ember', '#ffd977', { emissive: '#f58c29' }),
    crystal: mat('crystal', '#66b5d1', { emissive: '#1d5570', alpha: .86, twoSided: true }), glow: mat('glow', '#f9bd70', { emissive: '#ae682f' }),
    interactionHalo: mat('interaction-halo', '#e9cf91', { emissive: '#94723a', alpha: .72 }),
    shadow: mat('shadow', '#101a1c', { alpha: .3 })
  };
  const meshes: Mesh[] = [], pointLights: Array<{ light: PointLight; base: number; kind: 'fire' | 'lamp' | 'crystal' | 'watch' }> = [];
  const animatedFlames: Mesh[] = [], animatedDrips: Mesh[] = [], movingWater: Mesh[] = [], animatedFoliage: Mesh[] = [];
  const interactionRings: Mesh[] = [];
  const canopySways: Array<{ node: TransformNode; phase: number }> = [], cloudRoots: TransformNode[] = [], aurora: TransformNode[] = [], chestLids = new Map<string, Mesh>();
  const waterOrigins = new Map<Mesh, Vector3>(), seaVertices = new Map<Mesh, { base: Float32Array; current: Float32Array }>();
  let interactionHighlights = false;
  const add = <T extends Mesh>(mesh: T, at: Vector3, material: StandardMaterial, scale?: Vector3) => {
    mesh.position.copyFrom(at); mesh.material = material; mesh.parent = root; mesh.isPickable = false;
    if (scale) mesh.scaling.copyFrom(scale); meshes.push(mesh); return mesh;
  };
  const box = (name: string, width: number, height: number, depth: number, at: Vector3, material: StandardMaterial, rotation = 0) => {
    const mesh = add(MeshBuilder.CreateBox(name, { width, height, depth }, scene), at, material); mesh.rotation.y = rotation; return mesh;
  };
  const sphere = (name: string, at: Vector3, scale: Vector3, material: StandardMaterial, segments = 7) =>
    add(MeshBuilder.CreateSphere(name, { diameter: 1, segments }, scene), at, material, scale);
  const cylinder = (name: string, top: number, bottom: number, height: number, at: Vector3, material: StandardMaterial, tessellation = 8) =>
    add(MeshBuilder.CreateCylinder(name, { diameterTop: top, diameterBottom: bottom, height, tessellation }, scene), at, material);
  const addPointLight = (light: PointLight, base: number, kind: 'fire' | 'lamp' | 'crystal' | 'watch') => {
    light.intensity = base; pointLights.push({ light, base, kind });
  };
  const pointObjects = camp.interactionPoints.map(point => ({ point, objectAt: cellPoint(point.objectCell ?? point.cell), approachAt: cellPoint(point.cell) }));
  const firePoints = pointObjects.filter(item => item.point.kind === 'fire');
  for (const { point, approachAt } of pointObjects) {
    const ring = MeshBuilder.CreateTorus(`${point.id}:dm-interaction-halo`, { diameter: 1.08, thickness: .055, tessellation: 20 }, scene);
    ring.position.copyFrom(approachAt); ring.position.y = .075; ring.rotation.x = Math.PI / 2;
    ring.material = M.interactionHalo; ring.visibility = 0; ring.parent = root; ring.isPickable = false; meshes.push(ring); interactionRings.push(ring);
  }

  const addFire = (id: string, at: Vector3) => {
    cylinder(`${id}:ash`, 1.6, 1.9, .1, at.add(new Vector3(0, .04, 0)), M.darkStone, 12);
    for (let index = 0; index < 10; index++) {
      const angle = index / 10 * Math.PI * 2;
      sphere(`${id}:ring:${index}`, at.add(new Vector3(Math.cos(angle) * 1.08, .16, Math.sin(angle) * 1.08)),
        new Vector3(.3, .2, .28), index % 2 ? M.stone : M.lightStone, 5);
    }
    for (let index = 0; index < 3; index++) {
      const log = box(`${id}:log:${index}`, 1.5, .19, .24, at.add(new Vector3(0, .22, 0)), M.wood, index * Math.PI / 3);
      log.rotation.z = index === 1 ? .06 : 0;
    }
    for (let index = 0; index < 3; index++) {
      const flame = cylinder(`${id}:flame:${index}`, .04, .4, 1.05 + index % 2 * .18,
        at.add(new Vector3((index - 1) * .18, .83, (1 - index) * .11)), index === 1 ? M.ember : M.flame, 5);
      animatedFlames.push(flame);
    }
    const light = new PointLight(`${id}:light`, at.add(new Vector3(0, 1.2, 0)), scene);
    light.diffuse = color('#ff9d58'); light.range = 15; addPointLight(light, .9, 'fire');
  };
  const addTent = (id: string, at: Vector3, ownerId = 'mike') => {
    const canvas = ownerId === 'mia' ? M.canvas2 : ownerId === 'maria' ? M.canvas3 : M.canvas;
    box(`${id}:raised-floor`, 7.05, .12, 7.05, at.add(new Vector3(0, .05, 0)), M.darkStone);
    box(`${id}:woven-mat`, 4.85, .035, 4.85, at.add(new Vector3(0, .13, -.05)), ownerId === 'mia' ? M.cloth : M.bed);
    // Large A-frame with an open south entrance and translucent roof panels:
    // the 4.5 m square interior and characters remain visible from the camera.
    const roof = (side: -1 | 1) => quad(scene, root, `${id}:roof:${side}`, [
      [at.x + side * 3.35, .44, at.z - 3.25], [at.x, 2.85, at.z - 3.25],
      [at.x, 2.85, at.z + 3.38], [at.x + side * 3.35, .44, at.z + 3.38]
    ], canvas);
    meshes.push(roof(-1), roof(1));
    const back = quad(scene, root, `${id}:rear-flap`, [
      [at.x - 3.3, .12, at.z - 3.22], [at.x + 3.3, .12, at.z - 3.22],
      [at.x + 3.3, 1.8, at.z - 3.22], [at.x - 3.3, 1.8, at.z - 3.22]
    ], canvas);
    meshes.push(back);
    cylinder(`${id}:ridge-pole`, .08, .08, 6.8, at.add(new Vector3(0, 2.82, .04)), M.wood, 5).rotation.x = Math.PI / 2;
    for (const side of [-1, 1]) for (const end of [-1, 1]) {
      const x = side * 3.28, z = end * 3.25;
      box(`${id}:stake`, .11, .18, .11, at.add(new Vector3(x, .12, z)), M.brass);
      const cord = box(`${id}:guyline`, .035, .025, 3.15, at.add(new Vector3(side * 3.25, .08, end * 1.55)), M.canvas2, end * .12);
      cord.isPickable = false;
    }
    box(`${id}:sleeping-bedroll`, 1.25, .19, 2.25, at.add(new Vector3(0, .22, -1.55)), ownerId === 'maria' ? M.canvas3 : M.cloth);
    box(`${id}:pillow`, .8, .18, .58, at.add(new Vector3(0, .35, -2.18)), M.bed);
    const interiorLight = new PointLight(`${id}:lantern`, at.add(new Vector3(0, 1.7, -.65)), scene);
    interiorLight.diffuse = color(ownerId === 'mike' ? '#f0c987' : ownerId === 'mia' ? '#f1dfae' : '#cfaaee');
    interiorLight.range = 5; addPointLight(interiorLight, .1, 'lamp');
  };
  const addPersonalChest = (id: string, at: Vector3, ownerId = 'mike') => {
    const accent = ownerId === 'mia' ? M.brass : ownerId === 'maria' ? M.canvas3 : M.brass;
    box(`${id}:body`, 1.08, .55, .72, at.add(new Vector3(0, .3, 0)), M.chestWood);
    const lid = box(`${id}:lid`, 1.12, .16, .76, at.add(new Vector3(0, .66, -.02)), M.wood);
    chestLids.set(id, lid);
    box(`${id}:front-band`, .12, .62, .08, at.add(new Vector3(0, .35, .38)), accent);
    box(`${id}:latch`, .18, .17, .08, at.add(new Vector3(0, .48, .43)), M.brass);
  };
  const addPersonalItem = (id: string, at: Vector3, ownerId = 'mike') => {
    if (ownerId === 'mike') {
      box(`${id}:desk`, 1.18, .17, .72, at.add(new Vector3(0, .72, 0)), M.wood);
      for (const x of [-.42, .42]) for (const z of [-.23, .23]) box(`${id}:leg`, .1, .7, .1, at.add(new Vector3(x, .36, z)), M.bark);
      box(`${id}:spellbook`, .58, .12, .74, at.add(new Vector3(-.1, .88, -.04)), M.canvas3, -.12);
      box(`${id}:book-clasp`, .07, .15, .09, at.add(new Vector3(.05, .97, .02)), M.brass);
      cylinder(`${id}:inkpot`, .14, .15, .17, at.add(new Vector3(.43, .88, .19)), M.darkStone, 6);
    } else if (ownerId === 'mia') {
      cylinder(`${id}:prayer-plinth`, .86, 1.02, .44, at.add(new Vector3(0, .24, 0)), M.lightStone, 6);
      cylinder(`${id}:reliquary`, .25, .33, .54, at.add(new Vector3(0, .72, 0)), M.brass, 8);
      box(`${id}:holy-symbol-vertical`, .12, .72, .1, at.add(new Vector3(0, 1.03, 0)), M.brass);
      box(`${id}:holy-symbol-crossbar`, .48, .12, .1, at.add(new Vector3(0, 1.07, 0)), M.brass);
      cylinder(`${id}:candle`, .11, .13, .4, at.add(new Vector3(.42, .46, .16)), M.glow, 6);
    } else {
      box(`${id}:tool-roll`, 1.06, .16, .62, at.add(new Vector3(0, .18, 0)), M.canvas3);
      for (let index = 0; index < 4; index++) {
        const pick = box(`${id}:lockpick:${index}`, .04, .035, .5, at.add(new Vector3(-.34 + index * .2, .29, 0)), M.brass, (index - 1.5) * .05);
        pick.isPickable = false;
      }
      box(`${id}:maintenance-block`, .72, .56, .55, at.add(new Vector3(0, .33, -.18)), M.wood);
    }
  };
  const addSeat = (id: string, at: Vector3, rotation = 0) => {
    box(`${id}:seat`, 1.95, .18, .54, at.add(new Vector3(0, .48, 0)), M.wood, rotation);
    box(`${id}:leg-a`, .16, .42, .42, at.add(new Vector3(-.72, .2, 0)), M.bark, rotation);
    box(`${id}:leg-b`, .16, .42, .42, at.add(new Vector3(.72, .2, 0)), M.bark, rotation);
  };
  const addGuardPost = (id: string, at: Vector3) => {
    cylinder(`${id}:post`, .2, .3, 2.7, at.add(new Vector3(0, 1.35, 0)), M.bark, 6);
    cylinder(`${id}:torch`, .04, .22, .46, at.add(new Vector3(0, 2.85, 0)), M.flame, 6);
    const light = new PointLight(`${id}:watch-light`, at.add(new Vector3(0, 2.9, 0)), scene);
    light.diffuse = color('#f5b566'); light.range = 7; addPointLight(light, .28, 'watch');
  };

  if (camp.visualProfile === 'rooms') {
    const wall = mat('room-wall', '#595c5a'), plaster = mat('room-plaster', '#a99f8b'), bedding = mat('room-bedding', '#9d795f');
    const starts = [4, 9, 14, 19, 24, 29];
    starts.forEach((start, index) => {
      const x0 = start * CELL, z0 = 2 * CELL, w = 5 * CELL, d = 6 * CELL;
      const wallH = 2.65, thick = .3, opening = CELL, segment = (w - opening) / 2, centerX = x0 + w / 2;
      box(`room-${index + 1}:stone-floor`, w - .18, .08, d - .18, new Vector3(centerX, -.015, z0 + d / 2), index % 2 ? M.lightStone : M.stone);
      box(`room-${index + 1}:north-wall`, w, wallH, thick, new Vector3(centerX, wallH / 2, z0), wall);
      box(`room-${index + 1}:south-wall-west`, segment, wallH, thick, new Vector3(x0 + segment / 2, wallH / 2, z0 + d), wall);
      box(`room-${index + 1}:south-wall-east`, segment, wallH, thick, new Vector3(x0 + w - segment / 2, wallH / 2, z0 + d), wall);
      box(`room-${index + 1}:west-wall`, thick, wallH, d, new Vector3(x0, wallH / 2, z0 + d / 2), wall);
      box(`room-${index + 1}:east-wall`, thick, wallH, d, new Vector3(x0 + w, wallH / 2, z0 + d / 2), wall);
      // Six open thresholds face the same straight path, as described in A1.
      const openingX = x0 + w / 2, openingZ = z0 + d;
      for (const offset of [-.78, .78]) {
        box(`room-${index + 1}:open-entry-jamb`, .2, wallH, .3, new Vector3(openingX + offset, wallH / 2, openingZ), plaster);
        box(`room-${index + 1}:entry-capstone`, .2, .23, .3, new Vector3(openingX + offset, wallH - .12, openingZ), M.lightStone);
      }
      const bedAt = cellPoint({ col: start + 1, row: 4 });
      if (index < 4) {
        box(`room-${index + 1}:bed-frame`, 2.15, .3, 1.32, bedAt.add(new Vector3(0, .18, 0)), M.wood);
        box(`room-${index + 1}:mattress`, 1.98, .24, 1.17, bedAt.add(new Vector3(0, .45, 0)), bedding);
        box(`room-${index + 1}:cover`, 1.84, .1, .66, bedAt.add(new Vector3(.02, .62, .23)), index === 3 ? M.canvas3 : M.cloth);
        box(`room-${index + 1}:pillow`, .62, .15, .78, bedAt.add(new Vector3(-.08, .64, -.38)), plaster);
        box(`room-${index + 1}:nightstand`, .65, .64, .58, bedAt.add(new Vector3(.84, .34, -1.46)), M.wood);
        cylinder(`room-${index + 1}:lamp-base`, .3, .34, .12, bedAt.add(new Vector3(.84, .73, -1.46)), M.brass, 8);
        sphere(`room-${index + 1}:lamp-glow`, bedAt.add(new Vector3(.84, .92, -1.46)), new Vector3(.22, .28, .22), M.glow, 6);
        box(`room-${index + 1}:writing-desk`, 1.08, .78, .56, bedAt.add(new Vector3(1.54, .4, .76)), M.wood);
        box(`room-${index + 1}:writing-top`, 1.2, .12, .66, bedAt.add(new Vector3(1.54, .84, .76)), M.bark);
        box(`room-${index + 1}:chair-seat`, .58, .18, .55, bedAt.add(new Vector3(1.53, .38, 1.58)), M.bark);
        box(`room-${index + 1}:chair-back`, .58, .72, .13, bedAt.add(new Vector3(1.53, .73, 1.82)), M.wood);
        if (index === 3) {
          box('room-4:myla-tool-chest', .72, .54, .52, bedAt.add(new Vector3(-.5, .29, 1.62)), M.chestWood);
          for (let i = 0; i < 3; i++) cylinder(`room-4:myla-tool`, .04, .07, .6, bedAt.add(new Vector3(-.68 + i * .18, .63, 1.62)), M.brass, 5).rotation.z = .18;
        }
      } else {
        // Four low, rope-slung hammocks in each kobold cell (eight total).
        for (let hammock = 0; hammock < 4; hammock++) {
          const side = hammock % 2 ? 1 : -1, row = hammock < 2 ? -.83 : .86;
          const x = bedAt.x + side * .77, z = bedAt.z + row;
          box(`room-${index + 1}:hammock-rope-a`, .035, .035, .42, new Vector3(x - .45, .68, z), M.bark, -.14);
          box(`room-${index + 1}:hammock-rope-b`, .035, .035, .42, new Vector3(x + .45, .68, z), M.bark, .14);
          box(`room-${index + 1}:hammock`, .78, .09, 1.55, new Vector3(x, .55, z), hammock % 2 ? M.canvas2 : M.cloth);
        }
      }
      const lamp = new PointLight(`room-${index + 1}:warm-lamp`, bedAt.add(new Vector3(.25, 1.6, -.15)), scene);
      lamp.diffuse = color('#ffd19a'); lamp.range = 8; addPointLight(lamp, .36, 'lamp');
    });
    box('a1-straight-path', 51, .045, 4.3, new Vector3(28.5, .025, 14.25), mat('hall-runner', '#857f70'));
    for (let index = 0; index < 6; index++) box(`a1-entry-stone:${index}`, .95, .09, .64, cellPoint({ col: 6 + index * 5, row: 7 }).add(new Vector3(0, .015, .55)), M.lightStone);
  } else {
    const center = new Vector3(definition.terrain!.cols * CELL / 2, 0, definition.terrain!.rows * CELL / 2);
    const seaLevel = camp.visualProfile === 'cliff-observatory' ? -16 : -1.4;
    const water = MeshBuilder.CreateGround(`camp-sea:${definition.id}`, { width: definition.terrain!.cols * CELL * 3.4, height: definition.terrain!.rows * CELL * 3.4, subdivisions: 16, updatable: true }, scene);
    water.position.set(center.x, seaLevel, center.z); water.material = M.sea; water.parent = root; water.isPickable = false; movingWater.push(water);
    const base = new Float32Array([...water.getVerticesData('position')!]); seaVertices.set(water, { base, current: base.slice() });

    if (camp.visualProfile === 'forest') {
      // Dense trunk and canopy ring leaves the playable clearing open. Low-poly
      // ground shadows keep the silhouette readable without a real-time shadow map.
      const trees = [
        [1,2,9],[4,1,8],[7,2,10],[10,1,8],[14,1,10],[18,2,9],[22,4,8],[23,8,10],[22,13,8],[21,18,10],
        [18,20,9],[14,21,8],[10,21,10],[6,20,8],[2,18,10],[1,14,8],[2,9,9],[5,5,7],[19,5,8],[20,16,7]
      ];
      trees.forEach(([col,row,height], index) => {
        const at = cellPoint({ col: col!, row: row! });
        const treeShadow = sphere(`forest:tree-shadow:${index}`, at.add(new Vector3(.72, .035, .25)), new Vector3(3.2, .025, 1.05), M.shadow, 6);
        treeShadow.rotation.y = -.38;
        cylinder(`forest:trunk:${index}`, .34, .52, 3, at.add(new Vector3(0, 1.5, 0)), M.bark, 6);
        const sway = new TransformNode(`forest:canopy-sway:${index}`, scene);
        sway.parent = root; sway.position.set(at.x, 3.45, at.z); canopySways.push({ node: sway, phase: index * 1.73 });
        const canopyMaterial = index % 2 ? M.leaf2 : M.pine;
        const layers = [0, 1, 2].map(layer => {
          const crown = MeshBuilder.CreateCylinder(`forest:crown:${index}:${layer}`, {
            diameterTop: .05, diameterBottom: 2.7 - layer * .48, height: height! / 3, tessellation: 7
          }, scene);
          crown.position.set((layer % 2) * .16, .35 + layer * 1.6, (layer - 1) * .14);
          crown.material = canopyMaterial; crown.isPickable = false; return crown;
        });
        const canopy = Mesh.MergeMeshes(layers, true, true, undefined, false, false);
        if (canopy) { canopy.name = `forest:canopy:${index}`; canopy.parent = sway; canopy.isPickable = false; meshes.push(canopy); }
      });
      for (let index = 0; index < 30; index++) {
        const col = 2 + index % 20, row = 2 + (index * 7) % 18;
        if (Math.hypot(col - 12, row - 11) < 5.3) continue;
        const fern = sphere(`forest:fern:${index}`, cellPoint({ col, row }).add(new Vector3(0, .27, 0)), new Vector3(.65, .48, .72), index % 2 ? M.leaf : M.leaf2, 5);
        if (index % 3 === 0) animatedFoliage.push(fern);
      }
    }
    if (camp.visualProfile === 'wreck-beach') {
      for (let index = 0; index < 34; index++) {
        const col = index % 17 + 3, row = 2 + (index * 7) % 16;
        if (Math.hypot(col - 12, row - 11) < 5.4) continue;
        sphere(`beach:rock:${index}`, cellPoint({ col, row }).add(new Vector3(0, .22, 0)),
          new Vector3(.8 + index % 3 * .37, .32 + index % 4 * .15, .7 + index % 5 * .19), index % 2 ? M.rock : M.darkStone, 4);
      }
      for (let index = 0; index < 13; index++) {
        const foam = box(`beach:foam:${index}`, 1.7 + index % 3, .035, .12, new Vector3(2 + index * 2.9, seaLevel + .14, 28 + Math.sin(index) * 2), M.foam, (index % 4) * .13);
        movingWater.push(foam);
      }
      const boat = cellPoint({ col: 3, row: 6 });
      const hull = box('beach:beached-boat-hull', 4.1, .5, 1.75, boat.add(new Vector3(0, .32, 0)), M.wood, -.38);
      hull.rotation.x = .04;
      box('beach:boat-keel', 3.5, .18, .18, boat.add(new Vector3(0, .05, 0)), M.darkStone, -.38);
      for (const drift of [[-3, 1], [3, -1], [-4, -2], [4, 2]]) box('beach:driftwood', 2.4, .14, .17, boat.add(new Vector3(drift[0]!, .08, drift[1]!)), M.bark, drift[0]! * .16);
    }
    if (camp.visualProfile === 'cliff-observatory') {
      for (const [col, row, height] of [[4,4,9],[20,5,11],[5,16,8],[19,16,10]] as number[][]) {
        const shadow = sphere(`cliff:pillar-shadow:${col}:${row}`, cellPoint({ col: col!, row: row! }).add(new Vector3(.9, .04, .42)), new Vector3(height! * .58, .025, 1.12), M.shadow, 6);
        shadow.rotation.y = -.42;
        cylinder(`cliff:basalt-pillar:${col}:${row}`, 1.9, 2.1, height!, cellPoint({ col: col!, row: row! }).add(new Vector3(0, height! / 2, 0)), M.darkStone, 6);
        cylinder('cliff:pillar-cap', 2.35, 1.95, .38, cellPoint({ col: col!, row: row! }).add(new Vector3(0, height! + .12, 0)), M.rock, 6);
      }
      for (const [col, row, height] of [[8,5,3.3],[17,7,4.1],[8,15,2.8],[17,14,3.5]] as number[][]) {
        const at = cellPoint({ col: col!, row: row! });
        cylinder(`cliff:crystal:${col}:${row}`, .02, .82, height!, at.add(new Vector3(0, height! / 2, 0)), M.crystal, 5).rotation.z = col! % 2 ? .12 : -.16;
        cylinder('cliff:crystal-base', .8, 1.15, .35, at.add(new Vector3(0, .17, 0)), M.darkStone, 6);
        const light = new PointLight(`cliff:crystal-light:${col}:${row}`, at.add(new Vector3(0, height!, 0)), scene);
        light.diffuse = color('#59aeca'); light.range = 7; addPointLight(light, .28, 'crystal');
      }
      for (let index = 0; index < 3; index++) {
        const node = new TransformNode(`cliff:aurora:${index}`, scene); node.parent = root; aurora.push(node);
        const y = 8 + index * 2.3, pathA = [], pathB = [];
        for (let step = 0; step <= 12; step++) {
          const x = 2 + step * 2.8, z = 7 + index * 5 + Math.sin(step * .55 + index) * 2;
          pathA.push(new Vector3(x, y + Math.sin(step * .66 + index) * .75, z)); pathB.push(new Vector3(x, y + Math.sin(step * .66 + index) * .75 + .65, z + 1.1));
        }
        const strip = MeshBuilder.CreateRibbon(`cliff:aurora-ribbon:${index}`, { pathArray: [pathA, pathB], sideOrientation: Mesh.DOUBLESIDE }, scene);
        strip.material = mat(`aurora-${index}`, index === 1 ? '#7a76aa' : '#35728c', { emissive: index === 1 ? '#3e3b70' : '#174c63', alpha: .24, twoSided: true });
        strip.parent = node; strip.isPickable = false;
      }
      for (let index = 0; index < 5; index++) {
        const node = new TransformNode(`cliff:cloud:${index}`, scene); node.parent = root;
        const col = index * 5 + 2;
        for (let puff = 0; puff < 3; puff++) sphere(`cliff:cloud-puff:${index}:${puff}`, new Vector3(col + puff * 1.2, 17 + index % 2, 3 + index * 3), new Vector3(3.3, .85, 1.5), mat(`cloud-${index}-${puff}`, '#53606d', { alpha: .17 }), 6).parent = node;
        cloudRoots.push(node);
      }
    }
    if (camp.visualProfile === 'coastal-refuge') {
      // Broken stone ribs form a wide overhang while leaving the map unroofed.
      for (const [x, z, yaw] of [[3,7,-.44],[33,7,.44],[5,26,.34],[31,27,-.32]] as number[][]) {
        const arch = cylinder(`cove:arch:${x}:${z}`, .35, .8, 19, new Vector3(x!, 8.7, z!), M.darkStone, 6);
        arch.rotation.z = yaw!;
        sphere('cove:overhang-rock', new Vector3(x!, 17.7, z!), new Vector3(7, 2, 4.3), M.rock, 5);
      }
      for (const cell of definition.terrain!.surfaces[0]!.tiles.filter(tile => tile.medium === 'water').map(tile => tile.cell)) {
        const pool = MeshBuilder.CreateGround(`cove:tide-pool:${cell.col}:${cell.row}`, { width: CELL * .9, height: CELL * .9, subdivisions: 2, updatable: true }, scene);
        pool.position.copyFrom(cellPoint(cell)); pool.position.y = .08; pool.material = M.foam; pool.parent = root; pool.isPickable = false; movingWater.push(pool);
      }
      for (let index = 0; index < 14; index++) {
        const x = 6 + (index % 7) * 5, z = 7 + Math.floor(index / 7) * 15;
        const drop = sphere(`cove:drip:${index}`, new Vector3(x, 5 + index % 3, z), new Vector3(.05, .32, .05), M.foam, 5);
        drop.metadata = { initialY: drop.position.y };
        animatedDrips.push(drop);
      }
    }

    if (camp.visualProfile === 'forest' || camp.visualProfile === 'cliff-observatory' || camp.visualProfile === 'coastal-refuge') {
      if (camp.visualProfile === 'forest') {
        for (const cell of definition.terrain!.surfaces[0]!.tiles.filter(tile => tile.medium === 'water').map(tile => tile.cell)) {
          const ripple = box(`forest:stream-ripple:${cell.col}:${cell.row}`, CELL * .72, .025, .12, cellPoint(cell).add(new Vector3(0, .04, 0)), M.foam, .1);
          movingWater.push(ripple);
        }
      }
    }
  }

  for (const item of pointObjects) {
    const { point: target, objectAt } = item;
    if (camp.visualProfile !== 'rooms' && target.kind === 'tent') addTent(target.id, objectAt, target.ownerCharacterId ?? 'mike');
    if (camp.visualProfile !== 'rooms' && target.kind === 'chest') addPersonalChest(target.id, objectAt, target.ownerCharacterId ?? 'mike');
    if (camp.visualProfile !== 'rooms' && target.kind === 'personal') addPersonalItem(target.id, objectAt, target.ownerCharacterId ?? 'mike');
    if (target.kind === 'fire') addFire(target.id, objectAt);
    if (target.kind === 'seat') addSeat(target.id, objectAt, target.id.endsWith('b-point') ? -.36 : .24);
    if (target.kind === 'guard') addGuardPost(target.id, objectAt);
  }

  const ambient = new HemisphericLight(`camp-ambient:${definition.id}`, new Vector3(.1, 1, .2), scene);
  ambient.diffuse = color(camp.visualProfile === 'rooms' ? '#f7dfbf' : '#9cb1b5'); ambient.groundColor = color('#252b30');
  const sun = new DirectionalLight(`camp-key:${definition.id}`, new Vector3(-.5, -1, .25), scene);
  sun.diffuse = color(camp.visualProfile === 'rooms' ? '#ffdda8' : '#b2c3cf'); sun.position.set(24, 42, -28);
  const roomsWarm = camp.visualProfile === 'rooms';
  const initialFog = camp.visualProfile === 'forest' ? .012 : camp.visualProfile === 'coastal-refuge' ? .006 : .0025;
  scene.fogMode = Constants.FOGMODE_EXP2; scene.fogDensity = initialFog;
  const phaseDarkness: Record<string, number> = { arrival: .36, dusk: .68, night: .94, dawn: .53, finalization: .3 };
  const reducedMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let lastWaterUpdate = -Infinity;
  const movingMeshes = new Set([...animatedFlames, ...animatedDrips, ...movingWater, ...animatedFoliage, ...interactionRings, ...chestLids.values()]);
  const staticByMaterial = new Map<StandardMaterial, Mesh[]>();
  for (const mesh of meshes) {
    if (mesh.parent !== root || movingMeshes.has(mesh) || !(mesh.material instanceof StandardMaterial)) continue;
    const bucket = staticByMaterial.get(mesh.material) ?? []; bucket.push(mesh); staticByMaterial.set(mesh.material, bucket);
  }
  for (const [material, group] of staticByMaterial) if (group.length > 1) {
    const merged = Mesh.MergeMeshes(group, true, true, undefined, false, false);
    if (merged) { merged.name = `camp-static:${definition.id}:${material.name}`; merged.parent = root; merged.isPickable = false; }
  }
  movingWater.forEach(mesh => waterOrigins.set(mesh, mesh.position.clone()));
  const update = (elapsedSeconds: number, phase?: CampRestPhase | null, interactions: CampRestState['interactions'] = []) => {
    interactionRings.forEach((ring, index) => {
      const pulse = .6 + Math.sin(elapsedSeconds * 2.2 + index * .37) * .09;
      ring.visibility = interactionHighlights ? pulse : 0;
      ring.scaling.setAll(interactionHighlights ? 1 + Math.sin(elapsedSeconds * 1.6 + index * .37) * .035 : 1);
    });
    // Darkness is a true 0..1 darkening value; light levels therefore move in
    // the expected direction from arrival through night and back at dawn.
    const darkness = phase ? phaseDarkness[phase] ?? .55 : .52;
    const daylight = 1 - darkness;
    const motion = reducedMotion ? .25 : 1;
    ambient.intensity = roomsWarm ? .61 + daylight * .16 : .14 + daylight * .46;
    sun.intensity = roomsWarm ? .025 + daylight * .11 : .025 + daylight * .42;
    pointLights.forEach(({ light, base, kind }, index) => {
      const factor = kind === 'fire' ? .82 + darkness * .55 : kind === 'lamp' ? .48 + darkness * .72 : kind === 'crystal' ? .38 + darkness * .92 : .72 + darkness * .42;
      const flicker = kind === 'fire' || kind === 'lamp' ? .94 + .06 * Math.sin(elapsedSeconds * 8.3 + index) * motion : 1;
      light.intensity = base * factor * flicker;
    });
    for (const [pointId, lid] of chestLids) {
      let latest: CampRestState['interactions'][number]['action'] = undefined;
      for (let index = interactions.length - 1; index >= 0; index--) if (interactions[index]!.pointId === pointId) { latest = interactions[index]!.action; break; }
      lid.rotation.x = latest === 'opened' ? -.92 : 0;
    }
    animatedFlames.forEach((flame, index) => {
      flame.scaling.y = .82 + .18 * Math.sin(elapsedSeconds * 7.7 + index * 1.8) * motion;
      flame.rotation.z = .08 * Math.sin(elapsedSeconds * 3.1 + index) * motion;
    });
    canopySways.forEach(({ node, phase: swayPhase }) => {
      node.rotation.z = Math.sin(elapsedSeconds * .72 + swayPhase) * .035 * motion;
      node.rotation.x = Math.cos(elapsedSeconds * .49 + swayPhase) * .021 * motion;
    });
    animatedFoliage.forEach((leaf, index) => { leaf.rotation.z = Math.sin(elapsedSeconds * 1.25 + index) * .12 * motion; });
    animatedDrips.forEach((drop, index) => {
      const initialY = Number(drop.metadata?.initialY ?? drop.position.y), cycle = (elapsedSeconds * .55 + index * .17) % 1;
      drop.position.y = initialY - cycle * 1.2 * motion;
    });
    if (camp.visualProfile === 'forest') {
      scene.fogDensity = .009 + darkness * .011 + Math.sin(elapsedSeconds * .11) * .0008 * motion;
    } else if (camp.visualProfile === 'coastal-refuge') {
      scene.fogDensity = initialFog + darkness * .004 + Math.sin(elapsedSeconds * .08) * .0004 * motion;
    } else scene.fogDensity = initialFog + darkness * (camp.visualProfile === 'wreck-beach' ? .0022 : .001);
    if (elapsedSeconds - lastWaterUpdate >= (reducedMotion ? .1 : .045)) movingWater.forEach((mesh, index) => {
      const origin = waterOrigins.get(mesh);
      if (mesh.name.includes('foam') && origin) {
        const surfSpeed = camp.visualProfile === 'wreck-beach' ? 1.55 : .55;
        const surfTravel = camp.visualProfile === 'wreck-beach' ? .76 : .35;
        mesh.position.x = origin.x + Math.sin(elapsedSeconds * surfSpeed + index) * surfTravel * motion;
        mesh.position.z = origin.z + Math.cos(elapsedSeconds * surfSpeed * .77 + index) * surfTravel * .28 * motion;
      }
      if (mesh.name.includes('ripple')) mesh.scaling.x = .82 + .16 * Math.sin(elapsedSeconds * 1.8 + index) * motion;
      if (mesh.name.includes('tide-pool')) mesh.scaling.set(.92 + .035 * Math.sin(elapsedSeconds * 1.3 + index) * motion, 1, .92 + .03 * Math.cos(elapsedSeconds * 1.2 + index) * motion);
      if (mesh.name.startsWith('camp-sea')) {
        const vertices = seaVertices.get(mesh);
        if (vertices) {
          const waveHeight = camp.visualProfile === 'wreck-beach' ? .32 : camp.visualProfile === 'coastal-refuge' ? .13 : .08;
          const waveRate = camp.visualProfile === 'wreck-beach' ? 1.9 : .9;
          for (let i = 0; i < vertices.base.length; i += 3) {
            const x = vertices.base[i]!, z = vertices.base[i + 2]!;
            vertices.current[i + 1] = vertices.base[i + 1]! + motion * waveHeight * .5 * (
              Math.sin(x * .13 + z * .04 + elapsedSeconds * waveRate) + Math.sin(z * .15 - x * .035 - elapsedSeconds * waveRate * .77)
            );
          }
          mesh.updateVerticesData('position', vertices.current, false, false);
        }
      }
    });
    if (elapsedSeconds - lastWaterUpdate >= (reducedMotion ? .1 : .045)) lastWaterUpdate = elapsedSeconds;
    cloudRoots.forEach((node, index) => { node.position.x = ((elapsedSeconds * (reducedMotion ? 1.1 : 3.6 + index * .34) + index * 11) % 68) - 18; });
    aurora.forEach((node, index) => {
      node.position.x = Math.sin(elapsedSeconds * .22 + index * 1.6) * 1.5 * motion;
      node.position.z = Math.cos(elapsedSeconds * .18 + index) * .5 * motion;
    });
    if (camp.visualProfile === 'cliff-observatory') {
      const pulse = reducedMotion ? 0 : Math.pow(Math.max(0, Math.sin(elapsedSeconds * .44) - .985) / .015, 2);
      sun.intensity = .025 + daylight * .22 + pulse * .82;
      ambient.intensity += pulse * .2;
      scene.fogDensity = .002 + darkness * .001 + pulse * .002;
      aurora.forEach((node, index) => {
        const glow = .11 + darkness * .12 + (1 + Math.sin(elapsedSeconds * .31 + index * 2.1)) * .035 * motion;
        const material = mats[`aurora-${index}`]; if (material) material.alpha = Math.min(.38, glow + pulse * .12);
      });
    }
    const skyNight = roomsWarm ? color('#231d18') : camp.visualProfile === 'forest' ? color('#09131b') : camp.visualProfile === 'wreck-beach' ? color('#081923') : camp.visualProfile === 'cliff-observatory' ? color('#0b1022') : color('#0d1b20');
    const skyDay = roomsWarm ? color('#746047') : camp.visualProfile === 'forest' ? color('#293831') : camp.visualProfile === 'wreck-beach' ? color('#344852') : camp.visualProfile === 'cliff-observatory' ? color('#333d50') : color('#314044');
    const fogNight = roomsWarm ? color('#352a20') : camp.visualProfile === 'forest' ? color('#1a2827') : camp.visualProfile === 'wreck-beach' ? color('#152c37') : camp.visualProfile === 'cliff-observatory' ? color('#171b36') : color('#1e3033');
    const fogDay = roomsWarm ? color('#887355') : camp.visualProfile === 'forest' ? color('#536454') : camp.visualProfile === 'wreck-beach' ? color('#687b7e') : camp.visualProfile === 'cliff-observatory' ? color('#5d6272') : color('#586961');
    const sky = Color3.Lerp(skyNight, skyDay, roomsWarm ? .42 + daylight * .2 : daylight * .72);
    const fog = Color3.Lerp(fogNight, fogDay, daylight * .68);
    scene.clearColor.set(sky.r, sky.g, sky.b, 1); scene.fogColor.copyFrom(fog);
  };
  update(0, null);
  return { root, update, setInteractionHighlights: enabled => { interactionHighlights = enabled; } };
}
