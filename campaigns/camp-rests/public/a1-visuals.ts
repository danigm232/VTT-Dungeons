import { seaState, strongWind, precipitationKind, weatherLight } from '../../../engine/shared/weather.js';
import { createA1DragonStatue } from './a1-dragon-statue.js';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color.js';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
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
import { GlowLayer } from '@babylonjs/core/Layers/glowLayer.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { Cell, PublicSceneDefinition } from '../../../engine/shared/campaign.js';
import type { CampRestPhase, CampRestState } from '../../../engine/shared/camp-rest.js';
import type { EnvironmentState } from '../../../engine/shared/protocol.js';
import type { ClimateState, NaturalLightProfile } from '../../../engine/shared/game-time.js';
import { illustratedMaterial, mergeDecoration, updateCutaway, createRestLighting, softPoolMaterial, fracturedStone, organicStone, worldSurfaceUV } from '../../../engine/client/diorama-kit.js';
import { createCoastalBackdrop } from '../../../engine/client/coastal-backdrop.js';
import type { CampVisuals } from './visuals.js';
import { registerInteractionPart, type InteractionPartRole } from '../../../engine/client/interaction-animation.js';
import { A1_FIRE_CELL, A1_PLAZA_CELLS, A1_ROOMS, A1_ROOM_CELL_KEYS, A1_STATUE_CELL, A1_TILE_METERS, type A1RoomSpec } from './a1-layout.js';
import { campMaterialRelief, campClothSurface, campFoamTexture, createCampDetailKit, weatherRock } from './camp-detail-kit.js';
import { CampFire } from './camp-fire.js';
import { createCampLife } from './camp-life.js';
import { CampShadows, createCampCoals, createCampSurfaceEffects, includeCampActors } from './camp-surface-effects.js';
import { createTorchFlame, torchMotion } from '../../../engine/client/torch-flame.js';

const darkness: Record<CampRestPhase, number> = { arrival: .12, dusk: .65, night: .95, dawn: .4, finalization: .12 };
const worldCell = (col: number, row: number) => new Vector3((col + .5) * A1_TILE_METERS, 0, (row + .5) * A1_TILE_METERS);
const key = (col: number, row: number) => `${col},${row}`;

/** CANON: six unequal excavated cave cells carved into a continuous mountain cliff, an elongated plaza,
 * the Astalagan statue, four beds and eight hammocks. Surface dressing is VTT_AMBIENCE. */
export function createA1Visuals(scene: Scene, definition: PublicSceneDefinition,options:{pauseInvisibleSea?:boolean;omitCellRoofs?:boolean;courtyardSpread?:boolean;retreatTorchMounts?:boolean;cullShadowCasters?:boolean;updateFog?:(density:number)=>void}={}): CampVisuals {
  const root = new TransformNode(`camp-visuals:${definition.id}`, scene);
  const motionPreference = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  scene.imageProcessingConfiguration.exposure = 1.18;
  scene.imageProcessingConfiguration.contrast = 1.14;
  root.metadata = { content: 'CANON', source: 'Los Dragones de la Isla de las Tempestades, A1', cells: 6, beds: 4, hammocks: 8, openEntrances: 6, statue: 'Astalagan', plazaFire: true, layout: 'official-map' };
  const asset = '/art/a1-hd2d-v1/';
  const painted = (name: string, tint: string, texture?: string, repeat = 1) => {
    const material = illustratedMaterial(scene, `a1:${name}`, tint, texture ? texture.startsWith('/')?texture:asset+texture : undefined, repeat);
    material.emissiveColor = Color3.FromHexString(tint).scale(.13);
    material.maxSimultaneousLights = 4;
    return material;
  };
  const atlas = (name: string, tint: string) => {
    const material = new StandardMaterial(`a1:${name}`, scene);
    material.diffuseColor = Color3.FromHexString(tint); material.emissiveColor = Color3.FromHexString(tint).scale(.028); material.specularColor = new Color3(.035, .035, .03); material.maxSimultaneousLights = 4;
    if (typeof document !== 'undefined') {
      const textureName = name.includes('cliff') || name.includes('carved') ? 'a1-cliff-rugged-v8.png' : name.includes('cell-floor') ? 'a1-cell-v6.png' : 'a1-plaza-v6.png';
      const texture = new Texture(asset + textureName, scene); texture.anisotropicFilteringLevel = 8; material.diffuseTexture = texture;
    }
    return material;
  };
  const M = {
    plaza: atlas('plaza-v6', '#d2c6ae'),
    carved: painted('carved-cliff-v10', '#c0bba5', '/art/camp-detail-v1/coastal-rock.png'),
    plazaWarm: atlas('plaza-warm-v6', '#c9b99b'),
    plazaCool: atlas('plaza-cool-v6', '#b8b9b2'),
    plazaMoss: atlas('plaza-moss-v6', '#afb59f'),
    cliff: painted('coastal-cliff-v10', '#a8b6a3', '/art/camp-detail-v1/coastal-rock.png'),
    cellFloor: atlas('cell-floor-v6', '#b2a795'),
    cellWarm: atlas('cell-floor-warm-v6', '#b9aa96'),
    cellCool: atlas('cell-floor-cool-v6', '#a7aaa4'),
    cellDark: atlas('cell-floor-dark-v6', '#948b80'),
    limestone: painted('limestone-v5', '#c3bba8', 'limestone-v3.webp'),
    earth: painted('earth-v6', '#a99271', 'earth.webp', 1.1),
    ashlar: painted('ashlar-v5', '#c9bca4', 'ashlar-v4.webp', 1.15),
    wood: painted('oak-v5', '#b88455', 'oak-v4.webp'),
    darkWood: painted('dark-oak-v5', '#62442f', 'oak-v4.webp'),
    linen: painted('linen-v5', '#eadcc7', 'linen-v4.webp', 2),
    blue: painted('blue-cloth-v5', '#718aa0', 'linen-v4.webp', 2),
    red: painted('red-cloth-v5', '#b06f61', 'wool-v4.webp', 2),
    green: painted('green-cloth-v5', '#728067', 'wool-v4.webp', 2),
    metal: painted('iron-v5', '#3e4444'),
    brass: painted('brass-v5', '#af7e3d'),
    paper: painted('paper-v5', '#d8bb82'),
    pottery: painted('pottery-v5', '#93634a'),
    soil: painted('garden-soil-v5', '#675640', 'earth.webp', 1.2),
    glow: painted('fire-glow-v5', '#ffd084'),
    flame: painted('fire-core-v5', '#ff9738'),
    halo: painted('interaction-halo-v5', '#ffe0a0'),
    shade: softPoolMaterial(scene, 'a1:contact-shadow-v5', '#211d1a', .48)
  };
  [M.carved,M.cliff,M.limestone,...[M.cellFloor,M.cellWarm,M.cellCool,M.cellDark]].forEach(m=>campMaterialRelief(scene,m,'rock'));
  // Ribbons and carved roofs share the rock material. Light both exposed faces
  // consistently when the camera looks at a rear face of the cliff ribbon.
  M.cliff.twoSidedLighting=true;M.cliff.backFaceCulling=false;
  [M.wood,M.darkWood].forEach(m=>campMaterialRelief(scene,m,'timber'));
  [M.linen,M.blue,M.red,M.green].forEach(m=>campMaterialRelief(scene,m,'cloth'));
  [M.linen,M.blue,M.red,M.green].forEach(m=>{m.backFaceCulling=false;m.twoSidedLighting=true;});
  M.glow.emissiveColor = Color3.FromHexString('#ffd78a'); M.flame.emissiveColor = Color3.FromHexString('#ff872b'); M.halo.emissiveColor = Color3.FromHexString('#ffc56b');
  const plazaMaterials = [M.plaza, M.plazaWarm, M.plazaCool, M.plazaMoss];
  const cellMaterials = [M.cellFloor, M.cellWarm, M.cellCool, M.cellDark];
  const readableMaterials = [...plazaMaterials, M.carved, M.cliff, ...cellMaterials, M.limestone, M.earth, M.ashlar, M.wood, M.darkWood, M.linen, M.blue, M.red, M.green, M.metal, M.brass, M.paper, M.pottery, M.soil];
  const warmPool = softPoolMaterial(scene, 'a1:warm-bounce-v5', '#ef9d42', .22);
  const backdrop = createCoastalBackdrop(scene, root, asset + 'bay-v3.png',{pauseOffscreen:options.pauseInvisibleSea});
  // The sea already has animated wave normals from its real geometry. A second
  // high-frequency normal texture caused both distant moiré and a severe GPU
  // slowdown on integrated graphics, so keep the geometric water relief only.
  const surfMaterial=scene.getMaterialByName('a1:shore-wash-v2') as StandardMaterial;
  surfMaterial.diffuseTexture=campFoamTexture(scene);surfMaterial.useAlphaFromDiffuseTexture=true;
  const foliageMaterial = (name: string, tint: string) => {
    const material = painted(name, tint);
    if (typeof document !== 'undefined') { const texture = new Texture('/art/camp-detail-v1/foliage-atlas.png', scene); texture.hasAlpha = true; texture.anisotropicFilteringLevel = 4; material.diffuseTexture = texture; material.useAlphaFromDiffuseTexture = true; }
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
  const roomInteriors = new Map<number, Mesh[]>();
  const bedrockPartitions: Array<{ rooms:number[]; meshes:Mesh[] }> = [];
  const fireLights: PointLight[] = [], candleLights: PointLight[] = [];
  const vfxSystems: ParticleSystem[] = [];
  let bucket = statics;
  const interactiveByRoom = new Map<number, Mesh[]>();
  function keep(id: string, role: InteractionPartRole, mesh: Mesh, roomId?: number, options?: { side?: number; contact?: Vector3 }) {
    const index = bucket.indexOf(mesh); if (index >= 0) bucket.splice(index, 1);
    if (roomId) { const parts = interactiveByRoom.get(roomId) ?? []; parts.push(mesh); interactiveByRoom.set(roomId, parts); }
    return registerInteractionPart(scene, id, role, mesh, options);
  }
  function add(mesh: Mesh, at: Vector3, material: StandardMaterial) { mesh.position.copyFrom(at); mesh.material = material; mesh.parent = root; mesh.isPickable = false; mesh.checkCollisions = false; bucket.push(mesh); return mesh; }
  const detail=createCampDetailKit(scene,{wood:M.wood,darkWood:M.darkWood,metal:M.metal,brass:M.brass,pottery:M.pottery,linen:M.linen,paper:M.paper},add);
  function compound(parts:Mesh[],name:string){
    if(!parts.length)return [];
    if(parts.some(m=>m.isVerticesDataPresent('color')))for(const m of parts)if(!m.isVerticesDataPresent('color'))m.setVerticesData('color',new Float32Array(m.getTotalVertices()*4).fill(1));
    const mesh=Mesh.MergeMeshes(parts,true,true,undefined,false,true);if(!mesh)return [];
    mesh.name=name;mesh.parent=root;mesh.isPickable=false;mesh.checkCollisions=false;mesh.metadata={content:'VTT_AMBIENCE',decorativeOnly:true};return [mesh];
  }
  function box(name: string, x: number, y: number, z: number, width: number, height: number, depth: number, material: StandardMaterial) { const mesh = add(MeshBuilder.CreateBox(name, { width, height, depth }, scene), new Vector3(x, y, z), material); if(material===M.cliff||material===M.carved)worldSurfaceUV(mesh,3.3);else if(material.name.includes('-v8')||material.name.includes('-v6'))worldSurfaceUV(mesh,6.2); return mesh; }
  function sphere(name: string, x: number, y: number, z: number, sx: number, sy: number, sz: number, material: StandardMaterial, segments = 8) { const mesh = add(MeshBuilder.CreateSphere(name, { diameter: 1, segments }, scene), new Vector3(x, y, z), material); mesh.scaling.set(sx, sy, sz); return mesh; }
  function cylinder(name: string, x: number, y: number, z: number, height: number, diameter: number, material: StandardMaterial, tessellation = 10) { return add(MeshBuilder.CreateCylinder(name, { height, diameter, tessellation }, scene), new Vector3(x, y, z), material); }
  function rock(name: string, x: number, y: number, z: number, width: number, height: number, depth: number, seed: number, material = M.cliff) { const mesh = add(fracturedStone(scene, name, width, height, depth, seed), new Vector3(x, y, z), material); mesh.rotation.y = Math.sin(seed * 2.71) * .28;if(material===M.cliff||material===M.carved)weatherRock(mesh,seed);return mesh; }
  function organicBoulder(name: string, x: number, y: number, z: number, width: number, height: number, depth: number, seed: number, material = M.cliff) {
    const mesh=add(organicStone(scene,name,width,height,depth,seed),new Vector3(x,y,z),material);
    mesh.rotation.set(Math.sin(seed*1.7)*.1,Math.sin(seed*2.71)*.35,Math.cos(seed*1.13)*.09);
    weatherRock(mesh,seed);
    return mesh;
  }
  function organicCliffUV(mesh: Mesh, meters = 16) {
    const positions = mesh.getVerticesData('position'); if (!positions) return;
    const matrix = mesh.computeWorldMatrix(true), uvs: number[] = [];
    for (let i = 0; i < positions.length; i += 3) {
      const p = Vector3.TransformCoordinates(Vector3.FromArray(positions, i), matrix);
      const warpX = Math.sin(p.y * .32 + p.x * .085) * 1.6 + Math.cos(p.y * .62 - p.x * .17) * .65;
      const warpY = Math.sin(p.x * .095 + p.y * .22) * 1.25 + Math.cos(p.x * .24 - p.y * .38) * .42;
      uvs.push((p.x + warpX) / meters, (p.y + warpY) / meters);
    }
    mesh.setVerticesData('uv', uvs, false, 2);
  }
  function shadow(x: number, z: number, width: number, depth: number) { const mesh = add(MeshBuilder.CreateDisc('a1:contact-shadow', { radius: .5, tessellation: 20 }, scene), new Vector3(x, .035, z), M.shade); mesh.rotation.x = Math.PI / 2; mesh.scaling.set(width, depth, 1); return mesh; }
  function plantCard(x: number, y: number, z: number, width: number, height: number, kind: number, angle: number, tilt = 0, material = foliage) { const mesh = add(MeshBuilder.CreatePlane('a1:plant-card', { width, height }, scene), new Vector3(x, y, z), material); const u = (kind % 2) * .5, v = kind < 2 ? .5 : 0; mesh.setVerticesData('uv', [u, v, u + .5, v, u + .5, v + .5, u, v + .5]); mesh.rotation.set(tilt, angle, 0); return mesh; }
  function shrub(x: number, z: number, size: number, seed: number, y = 0) { const material = foliageVariants[Math.abs(seed) % foliageVariants.length]!; for (let layer = 0; layer < 3; layer++) plantCard(x + Math.sin(seed + layer) * size * .12, y + size * .44, z + Math.cos(seed + layer) * size * .1, size * 1.65, size, Math.abs(seed + layer) % 4, seed + layer * Math.PI / 3, 0, material); plantCard(x, y + size * .22, z, size * 1.5, size * .85, 3, seed, -Math.PI * .32, material); }
  function grassTuft(x: number, z: number, size: number, seed: number, y = 0) { const material = foliageVariants[(Math.abs(seed) + 1) % foliageVariants.length]!; for (let card = 0; card < 3; card++) plantCard(x, y + size * .36, z, size * (.44 + card * .08), size, 1 + card % 3, seed + card * Math.PI / 3, 0, material); }
  function flame(name: string, x: number, y: number, z: number, scale = 1) {
    const previous = bucket;
    bucket = flameMeshes;
    const retreatTorch = Boolean(options.retreatTorchMounts && /:room-\d+:torch-flame$/.test(name));
    let mesh: Mesh;
    if (retreatTorch) {
      mesh = createTorchFlame(scene, name);
      mesh.position.set(x, y, z);
      mesh.scaling.set(.18 * scale, .34 * scale, .18 * scale);
      mesh.parent = root;
      bucket.push(mesh);
    } else mesh = sphere(name, x, y, z, .18 * scale, .34 * scale, .18 * scale, M.flame, 7);
    if (!retreatTorch && options.retreatTorchMounts && /:room-\d+:candle$|statue-votive-flame/.test(name)) {
      // Scale the flame from the wick, so the base stays seated during a pulse.
      mesh.bakeTransformIntoVertices(Matrix.Translation(0, .5, 0));
    }
    mesh.metadata = { baseX: .18 * scale, baseY: .34 * scale, baseZ: .18 * scale, phase: x * .3 + z * .7 };
    bucket = previous;
    return mesh;
  }

  box('a1:ledge-base', 36, -.42, 17.2, 312, .8, 19.5, M.cliff);
  box('a1:cliff-plinth', 36, -4.8, 13.4, 312, 9.4, 28, M.cliff);

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
  // Continuation beyond the playable boundary; visual terrain only. The rail
  // marks the end of this independent module, while the road keeps its course.
  for (const side of [-1, 1]) {
    const edge = side < 0 ? 1.45 : 70.55;
    for (let step = 0; step < 54; step++) {
      const x=edge+side*(1.05+step*2.1), z=20.9+Math.sin(step*.18)*1.05+step*.018;
      const base=box('a1:continuing-road-bed',x,-.025,z,2.5,.18,3.65,M.earth);
      base.metadata={content:'VTT_AMBIENCE',decorativeOnly:true,continuation:true};
      for(let lane=0;lane<3;lane++) {
        const slab=rock('a1:continuing-road-stone',x+Math.sin(step*3+lane)*.14,.11,z+(lane-1)*1.03,1.95,.14,.92,step*17+lane+(side+1)*90,plazaMaterials[(step+lane)%4]!);
        worldSurfaceUV(slab,6.2);slab.rotation.y=Math.sin(step*1.8+lane)*.12;
      }
      if(step%4===1){shrub(x+side*.45,z+2.3,.55+cliffRandom(step+74)*.5,920+step,.05);grassTuft(x-.6,z-2.15,.65,990+step,.03);}
    }
    for(const z of [19.25,20.9,22.55]) {
      box('a1:road-limit-post',edge,.62,z,.18,1.24,.18,M.darkWood);
      cylinder('a1:road-limit-cap',edge,1.27,z,.1,.24,M.wood,8);
    }
    for(const y of [.54,1])detail.tube('road-limit-rope',[new Vector3(edge,y,19.25),new Vector3(edge,y-.12,20.05),new Vector3(edge,y,20.9),new Vector3(edge,y-.12,21.7),new Vector3(edge,y,22.55)],.047,M.linen);
    const board=box('a1:road-limit-barrier',edge,.8,20.9,.10,.27,1.6,M.wood);board.metadata={content:'VTT_AMBIENCE',decorativeOnly:true,boundary:true};
  }

  // Grounded safety posts and a visibly sagging rope along the real ledge.
  const rail:Vector3[]=[];
  for (let col = 4; col <= 43; col += 3) {
    const row=Math.max(...A1_PLAZA_CELLS.filter(c=>c.col===col).map(c=>c.row));
    const bp=worldCell(col,row);rock('a1:balustrade-grounded-foot',bp.x,-.16,bp.z+.48,.72,.6,.9,col,M.carved);
    box('a1:balustrade-post',bp.x,.53,bp.z+.48,.23,1.06,.23,M.darkWood);
    cylinder('a1:balustrade-cap',bp.x,1.10,bp.z+.48,.1,.29,M.wood,8);
    rail.push(bp.add(new Vector3(0,.98,.48)));
    // Asymmetric pockets, never a uniform line: bare gaps, moss, flowering
    // shrubs and grasses cluster around sheltered stones instead of each post.
    if(col%4!==1)for(let i=0;i<2+col%3;i++){
      const seed=col*41+i*17,x=bp.x+(cliffRandom(seed)-.5)*2.9,z=bp.z-.25+(cliffRandom(seed+1)-.5)*1.3;
      if(i%2)grassTuft(x,z,.45+cliffRandom(seed+2)*.5,seed,.10);
      else shrub(x,z,.42+cliffRandom(seed+3)*.58,seed,.08);
    }
  }
  for(let i=1;i<rail.length;i++){
    const a=rail[i-1]!,b=rail[i]!,mid=Vector3.Lerp(a,b,.5);mid.y-=.21;
    detail.tube('cliff-safety-rope',[a,Vector3.Lerp(a,mid,.5),mid,Vector3.Lerp(mid,b,.5),b],.042,M.linen);
  }


  bucket = cliffMeshes;
  // Natural rugged multi-tiered coastal cliff with organic fractures and jagged profile
  const coastPaths: Vector3[][] = [];
  const coastY = [.22, -.38, -1.25, -2.42, -3.85, -5.35, -6.82, -8.15, -9.65];
  const coastZ = [25.5, 25.85, 26.25, 26.85, 27.65, 28.45, 29.35, 30.65, 32.25];
  for (let layer = 0; layer < coastY.length; layer++) {
    const path: Vector3[] = [];
    for (let i = 0; i <= 96; i++) {
      const x = -120 + i * 3.25;
      const jaggedRidge = Math.sin(x * .12 + layer * .85) * 1.45 + Math.cos(x * .28 - layer * 1.1) * .95 + Math.sin(x * .65 + layer * 2.1) * .45;
      const rockCrag = Math.sin(x * .38 + layer * 1.5) * .55 + Math.cos(x * .82 - layer) * .35;
      const cragHeight = Math.sin(x * .45 + layer * .7) * .48 + Math.cos(x * .18 - layer * 1.4) * .32;
      path.push(new Vector3(x, coastY[layer]! + cragHeight, coastZ[layer]! + jaggedRidge + rockCrag));
    }
    coastPaths.push(path);
  }
  const coastalFace = add(MeshBuilder.CreateRibbon('a1:layered-coastal-face', { pathArray: coastPaths, sideOrientation: Mesh.DOUBLESIDE }, scene), Vector3.Zero(), M.cliff);
  organicCliffUV(coastalFace, 3.3);weatherRock(coastalFace,41,true);

  // Varied jagged rock shelves and sea boulders breaking up linear lines
  function cliffRandom(seed: number) { const value = Math.sin(seed * 78.233 + 12.9898) * 43758.5453; return value - Math.floor(value); }
  for (let i = 0; i < 28; i++) {
    const seed = 90 + i * 13, x = -14 + cliffRandom(seed) * 105;
    const y = -.45 - cliffRandom(seed + 1) * 8.2;
    const width = 2.6 + cliffRandom(seed + 2) * 5.6, height = 1.0 + cliffRandom(seed + 3) * 3.2, depth = 2.0 + cliffRandom(seed + 4) * 3.6;
    const z = 26.5 + Math.max(0, -y) * .62 + (cliffRandom(seed + 5) - .5) * 2.2;
    organicBoulder(i % 4 ? 'a1:coastal-stratum' : 'a1:coastal-fracture', x, y, z, width, height, depth, seed, M.cliff);
    if (i % 3 === 0) organicBoulder('a1:tidal-boulder', x + (cliffRandom(seed + 6) - .5) * 3.2, -8.6 + cliffRandom(seed + 7) * .9, 31.8 + (cliffRandom(seed + 8) - .5) * 3.4, 2.4 + cliffRandom(seed + 9) * 2.1, 1.2 + cliffRandom(seed + 10) * 1.3, 2.3 + cliffRandom(seed + 11) * 1.8, seed + 500, M.cliff);
  }

  const inlandPlateau = add(MeshBuilder.CreateGround('a1:inland-plateau', { width: 312, height: 90, subdivisions: 32, updatable: true }, scene), new Vector3(36, 21, -74), M.cliff);
  const plateauPositions = inlandPlateau.getVerticesData('position')!;
  const plateauHeight = (x: number, z: number) => {
    const rise=Math.min(1,Math.max(0,(-z-30)/18));
    return Math.sin(x*.055+z*.048)*(.42+rise*2.2)+Math.sin(x*.13-z*.09)*(.23+rise*.8)+Math.sin(x*.24+z*.18)*.12;
  };
  for (let i = 0; i < plateauPositions.length; i += 3) plateauPositions[i + 1] = plateauHeight(plateauPositions[i]! + 36, plateauPositions[i + 2]! - 74);
  inlandPlateau.updateVerticesData('position', plateauPositions, false, false);
  const plateauNormals: number[] = [];
  VertexData.ComputeNormals(plateauPositions, inlandPlateau.getIndices()!, plateauNormals);
  inlandPlateau.updateVerticesData('normal', plateauNormals, false, false);
  worldSurfaceUV(inlandPlateau, 3.8);weatherRock(inlandPlateau,91,true);
  for (let i = 0; i < 24; i++) {
    const x = -5 + i * 3.65 + Math.sin(i * 1.7) * 1.25, z = -43 - ((i * 7) % 10) * 4.2 + Math.cos(i) * 1.4;
    const ground = 21 + plateauHeight(x, z);
    shrub(x, z, 2.1 + (i % 3) * .42, 420 + i, ground);
    if (i % 2 === 0) grassTuft(x + 1.3, z - .8, .8 + (i % 3) * .16, 620 + i, ground + .02);
    if (i % 3 === 0) rock('a1:inland-outcrop', x + 1.2, ground + .55, z + .8, 2.8 + (i % 2), 1.45 + (i % 3) * .28, 2.4, 440 + i, M.cliff);
  }

  // Mountain face sculpted as living rock curving over and around excavated cave cells
  const upperPaths: Vector3[][] = [];
  const upperY = [.05, 2.2, 4.7, 7.1, 9.3, 12.8, 16.6, 20.4], upperZ = [3.8, 1.2, -1.4, -4.2, -7.5, -12.4, -20.2, -28.5];
  for (let layer = 0; layer < upperY.length; layer++) {
    const path: Vector3[] = [], y = upperY[layer]!, z = upperZ[layer]!;
    for (let i = 0; i <= 78; i++) {
      const x = -120 + i * 4;
      const broadRidge = Math.sin(x * .085 + layer * .63) * 1.15 + Math.sin(x * .22 - layer * .81) * .62 + Math.cos(x * .041 + layer * .9) * 1.35;
      const fracture = Math.sin(x * .31 + layer * 1.3) * .8 + Math.sin(x * .071 - layer) * 1.1 + Math.cos(x * .49 + layer * 2.4) * .45;
      path.push(new Vector3(x, y + Math.sin(x * .54 + layer) * .35 + broadRidge * .2, z + broadRidge * .75 + fracture * .8));
    }
    upperPaths.push(path);
  }
  const mountainFace = add(MeshBuilder.CreateRibbon('a1:carved-mountainside', { pathArray: upperPaths, sideOrientation: Mesh.DOUBLESIDE }, scene), Vector3.Zero(), M.cliff);
  organicCliffUV(mountainFace, 3.3);weatherRock(mountainFace,67,true);
  // Close the irregular crest against the inland plateau. A fixed straight
  // plateau lip otherwise leaves a visible slit when viewed from behind.
  const crest=upperPaths[upperPaths.length-1]!,plateauJoin=crest.map(p=>new Vector3(p.x,21+plateauHeight(p.x,-33),-33));
  const crestSeal=add(MeshBuilder.CreateRibbon('a1:mountain-crest-seal',{pathArray:[crest,plateauJoin],sideOrientation:Mesh.DOUBLESIDE},scene),Vector3.Zero(),M.cliff);
  worldSurfaceUV(crestSeal,3.8);weatherRock(crestSeal,69,true);
  // Broken ledges and plant pockets interrupt the broad backing face, outside all cell footprints.
  for(let i=0;i<22;i++){
    const x=-10+i*4.6+Math.sin(i*1.7),layer=3+i%4;
    const broad=Math.sin(x*.085+layer*.63)*1.15+Math.sin(x*.22-layer*.81)*.62+Math.cos(x*.041+layer*.9)*1.35;
    const fracture=Math.sin(x*.31+layer*1.3)*.8+Math.sin(x*.071-layer)*1.1+Math.cos(x*.49+layer*2.4)*.45;
    const rear=upperZ[layer]!+broad*.75+fracture*.8+.15,y=upperY[layer]!+Math.sin(x*.54+layer)*.35+broad*.2;
    rock('a1:mountain-bedding-ledge',x,y,rear,4.4+(i%3),.55+(i%2)*.4,2.5,750+i);
    if(i%2===0)shrub(x+.5,rear+.45,1.1+(i%3)*.3,790+i,y+.3);
  }
  // Joined vertical crags give the distant cliff a readable silhouette and
  // contact shadows. All bases are embedded in the backing surface.
  for(let i=0;i<9;i++){
    const x=-12+i*12.1,layer=3+i%2;
    const broad=Math.sin(x*.085+layer*.63)*1.15+Math.sin(x*.22-layer*.81)*.62+Math.cos(x*.041+layer*.9)*1.35;
    const fracture=Math.sin(x*.31+layer*1.3)*.8+Math.sin(x*.071-layer)*1.1+Math.cos(x*.49+layer*2.4)*.45;
    const rear=upperZ[layer]!+broad*.75+fracture*.8-1.2,y=upperY[layer]!+Math.sin(x*.54+layer)*.35+broad*.2;
    organicBoulder('a1:mountain-connected-crag',x,y,rear,6.5+i%3,5.7+(i%3)*.9,4.3,850+i,M.cliff);
    shrub(x+.6,rear+.4,1.2+(i%3)*.3,890+i,y+2.5);
  }

  // SOLID MOUNTAIN BEDROCK PILLARS between cave chambers and on flanks (completely eliminating any gaps)
  const mountainPillars: Array<{ x: number; z: number; w: number; h: number; d: number; seed: number }> = [
    { x: -1.5, z: 9.5, w: 7.2, h: 5.6, d: 13.5, seed: 101 },  // West flank mountain
    { x: 12.75, z: 9.2, w: 2.7, h: 5.4, d: 12.2, seed: 102 }, // Between Cave 1 and Cave 2
    { x: 21.75, z: 9.2, w: 2.8, h: 5.4, d: 12.2, seed: 103 }, // Between Cave 2 and Cave 3
    { x: 33.75, z: 9.2, w: 2.7, h: 5.4, d: 12.2, seed: 104 }, // Between Cave 3 and Cave 4
    { x: 45.75, z: 9.2, w: 2.8, h: 5.4, d: 12.2, seed: 105 }, // Between Cave 4 and Cave 5
    { x: 53.25, z: 9.2, w: 2.7, h: 5.4, d: 12.2, seed: 106 }, // Between Cave 5 and Cave 6
    { x: 69.5, z: 9.5, w: 12.5, h: 5.8, d: 13.5, seed: 107 }  // East flank mountain
  ];
  for (const [index,pillar] of mountainPillars.entries()) {
    const previous=bucket;bucket=[];
    // Retreat-only: ease the irregular dividing rocks back from the interior
    // furniture, keeping their original seeds, height and cave silhouette.
    const innerRetreat=Boolean(options.retreatTorchMounts&&index>0&&index<6);
    const eastRetreat=Boolean(options.retreatTorchMounts&&index===6);
    for(let layer=0;layer<3;layer++)for(let piece=0;piece<4;piece++){
      const dz=(piece-1.5)*pillar.d/4;
      const carvedPiece=(layer+piece)%3===0?organicBoulder:rock;
      carvedPiece('a1:mountain-bedrock-stratum',pillar.x+Math.sin(pillar.seed+layer)*.08,pillar.h*(layer+.5)/3,pillar.z+dz,pillar.w*(innerRetreat?.86:eastRetreat?.84:1.2),pillar.h*.45,pillar.d*.36,pillar.seed+layer*13+piece*7,M.cliff);
    }
    organicBoulder('a1:mountain-buttress-front', pillar.x, 2.2, pillar.z + pillar.d * .42, pillar.w * (innerRetreat?.76:eastRetreat?.72:.95), 4.4, 2.6, pillar.seed, M.cliff);
    for(let plant=0;plant<5;plant++)shrub(pillar.x+Math.sin(plant+pillar.seed)*pillar.w*.25,pillar.z+(plant-2)*pillar.d*.17,.6+(plant%3)*.25,pillar.seed+plant,pillar.h-.4);
    // Each cutaway needs only one foliage material; atlas quadrants retain
    // species variation without four separate foliage draws per partition.
    for(const m of bucket)if(foliageVariants.includes(m.material as StandardMaterial))m.material=foliageSage;
    bedrockPartitions.push({rooms:index===0?[1]:index===6?[6]:[index,index+1],meshes:compound(bucket,'a1:bedrock-partition:'+index)});
    bucket=previous;
  }

  for (const side of [-1, 1]) for (let i = 0; i < 7; i++) {
    const seed = 220 + i * 23 + (side > 0 ? 50 : 0), x = side < 0 ? -3 - i * 2.1 - cliffRandom(seed) * 1.8 : 75 + i * 2.1 + cliffRandom(seed) * 1.8, z = 5 + i * 1.8 + (cliffRandom(seed + 1) - .5) * 2;
    organicBoulder('a1:side-cliff-mass', x, 2.3 + cliffRandom(seed + 2) * 2.7, z, 4.5 + cliffRandom(seed + 3) * 4.2, 4.2 + cliffRandom(seed + 4) * 4.6, 4.8 + cliffRandom(seed + 5) * 3.8, seed, M.cliff);
    if (i % 2 === 0) shrub(x - side * .4, z, 1.6 + (i % 3) * .35, i + 40, 5.2);
  }

  bucket = statics;
  for (const [x, width, seed] of [[8, 7, 1], [60, 8, 7]] as const) {
    box('a1:garden-soil', x, .08, 25.2, width, .12, 1.5, M.soil);
    box('a1:garden-border-timber', x, .14, 24.38, width, .08, .12, M.darkWood);
    for (let i = 0; i < width * 2; i++) {
      const px = x - width / 2 + .35 + i * .5;
      if (i % 3 === 0) grassTuft(px, 25.15 + Math.sin(i) * .22, .55 + (i % 2) * .1, seed + i, .12);
      else shrub(px, 25.15 + Math.sin(i) * .22, .38 + (i % 3) * .08, seed + i, .12);
      if (i % 4 === 0) sphere('a1:garden-flower', px, .55, 25.1, .07, .07, .07, i % 8 ? M.red : M.blue, 6);
    }
  }

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
        const tile = rock(`a1:room-${room.id}:irregular-floor-stone`, p.x + piece.dx, .04 + ((seed + index) % 3) * .014, p.z + piece.dz, piece.width, .075 + ((seed + index) % 2) * .022, piece.depth, seed + index * 13, cellMaterials[room.id % cellMaterials.length]!);
        worldSurfaceUV(tile, 6.2); tile.rotation.set(Math.sin(seed + index) * .014, Math.sin(seed * 1.12 + index) * .14, Math.cos(seed * .91 + index) * .014);
      });
      if (seed % 13 === 0) rock(`a1:room-${room.id}:floor-chip`, p.x - .31, .105, p.z + .26, .34, .045, .28, seed + 810, M.earth);
    }
    const roomFloors = mergeDecoration(scene, root, roomFloorParts, `a1:room-${room.id}:lit-floor`, true); litRoomSurfaces.push(...roomFloors); bucket = roomStatics;
    const roomKeys = new Set(room.cells.map(cell => key(cell.col, cell.row)));
    const entry = worldCell(room.entry.col, room.entry.row);
    const entranceSides:Mesh[]=[];
    const directions = [{ dc: 0, dr: -1, normal: new Vector3(0, 0, -1), face: 0 }, { dc: -1, dr: 0, normal: new Vector3(-1, 0, 0), face: 1 }, { dc: 1, dr: 0, normal: new Vector3(1, 0, 0), face: 2 }, { dc: 0, dr: 1, normal: new Vector3(0, 0, 1), face: 3 }];
    for (const direction of directions) {
      const upper: Mesh[] = [];
      for (const roomCell of room.cells) {
        if (roomKeys.has(key(roomCell.col + direction.dc, roomCell.row + direction.dr))) continue;
        if (roomCell.col === room.entry.col && roomCell.row === room.entry.row && direction.dr === 1) continue;
        const p = worldCell(roomCell.col, roomCell.row), x = p.x + direction.dc * .75, z = p.z + direction.dr * .75;
        const horizontal = direction.dr !== 0, width = horizontal ? 1.6 : .46, depth = horizontal ? .46 : 1.6;
        const previous = bucket; bucket = options.retreatTorchMounts&&roomCell.row>=room.entry.row-1&&direction.dc!==0 ? entranceSides : upper;
        // Natural rough-hewn cave bedrock walls
        const segment = rock('a1:cave-hewn-wall', x, 1.65, z, width, 3.25, depth, room.id*70+roomCell.col*7+roomCell.row, M.carved);
        box('a1:cave-solid-backing',x,1.6,z,width*.99,3.2,depth*.99,M.carved);
        segment.rotation.y = Math.sin(room.id * 17 + roomCell.col * 7 + roomCell.row) * .015;
        if (direction.face !== 3 && (roomCell.col + roomCell.row) % 2 === 0) {
          rock('a1:cave-rock-buttress', x - direction.dc * .12, 1.8, z - direction.dr * .12, horizontal ? .82 : .42, 2.2, horizontal ? .42 : .82, room.id * 40 + roomCell.col + roomCell.row, M.carved);
        }
        bucket = previous;
      }
      if (direction.face === 3) {
        const previous = bucket; bucket = upper;
        // Hewn cave portal arch and overhanging mountain rock canopy
        rock('a1:cave-portal-lintel', entry.x, 2.75, entry.z + .42, 2.4, .65, .75, room.id * 91, M.carved);
        rock('a1:cave-portal-overhang', entry.x, 3.25, entry.z + .25, 2.9, .45, 1.1, room.id * 93, M.cliff);
        bucket = previous;
      }
      if (upper.length) {
        const group = mergeDecoration(scene, root, upper, `a1:room-${room.id}:face-${direction.face}`);
        if (direction.face === 3) facades.set(room.id, group); else walls.push({ roomId: room.id, meshes: group, normal: direction.normal, center });
      }
    }
    if(entranceSides.length){
      const portal=mergeDecoration(scene,root,entranceSides,`a1:room-${room.id}:face-3:portal-sides`);
      facades.set(room.id,[...(facades.get(room.id)??[]),...portal]);
    }
    const roofParts: Mesh[] = [], previousBucket = bucket; bucket = roofParts;
    const roofCells = room.cells.filter(roomCell => roomCell.col !== room.entry.col || roomCell.row !== room.entry.row);
    const roofXs = roofCells.map(roomCell => worldCell(roomCell.col, roomCell.row).x), roofZs = roofCells.map(roomCell => worldCell(roomCell.col, roomCell.row).z);
    const roofMinX = Math.min(...roofXs), roofMaxX = Math.max(...roofXs), roofMinZ = Math.min(...roofZs), roofMaxZ = Math.max(...roofZs);
    const roofCenterX = (roofMinX + roofMaxX) / 2, roofCenterZ = (roofMinZ + roofMaxZ) / 2, roofWidth = roofMaxX - roofMinX + 2.45, roofDepth = roofMaxZ - roofMinZ + 2.3;
    // Cave ceiling contoured seamlessly with the living mountain bedrock
    const ceiling=add(MeshBuilder.CreateGround(`a1:room-${room.id}:mountain-ceiling`,{width:roofWidth,height:roofDepth,subdivisions:9,updatable:true},scene),new Vector3(roofCenterX,3.3,roofCenterZ),M.cliff);
    const roofVertices=ceiling.getVerticesData('position')!,boundary:Array<[number,number,number]>=[];
    for(let n=0;n<roofVertices.length;n+=3){
      const x=roofVertices[n]!,z=roofVertices[n+2]!,rear=(roofDepth*.5-z)/roofDepth;
      const edge=Math.abs(Math.abs(x)-roofWidth*.5)<.01||Math.abs(Math.abs(z)-roofDepth*.5)<.01;
      roofVertices[n]=x+Math.sin(z*1.2+room.id)*.16;
      roofVertices[n+2]=z+Math.cos(x*1.3-room.id)*.18;
      roofVertices[n+1]=rear*2.3+Math.sin(x*.9+room.id)*.28+Math.cos(z*1.2+x*.6)*.19;
      if(edge)boundary.push([roofVertices[n]!,roofVertices[n+1]!,roofVertices[n+2]!]);
    }
    ceiling.updateVerticesData('position',roofVertices);
    const roofNormals:number[]=[];VertexData.ComputeNormals(roofVertices,ceiling.getIndices()!,roofNormals);ceiling.updateVerticesData('normal',roofNormals);worldSurfaceUV(ceiling,3.2);M.cliff.backFaceCulling=false;
    // Seal the raised rock canopy against the cave walls. A closed cell must
    // never expose furniture through a wedge between its roof and rear wall.
    boundary.sort((a,b)=>Math.atan2(a[2],a[0])-Math.atan2(b[2],b[0]));
    const skirtPositions:number[]=[],skirtIndices:number[]=[],skirtNormals:number[]=[],skirtUV:number[]=[];
    boundary.forEach(([x,y,z],i)=>{skirtPositions.push(x,y,z,x,-.33,z);skirtUV.push(i*.3,1,i*.3,0);const n=i*2,next=((i+1)%boundary.length)*2;skirtIndices.push(n,n+1,next,next,n+1,next+1);});
    VertexData.ComputeNormals(skirtPositions,skirtIndices,skirtNormals);
    const roofSkirt=new Mesh('a1:cave-roof-seal',scene),roofSkirtData=new VertexData();Object.assign(roofSkirtData,{positions:skirtPositions,indices:skirtIndices,normals:skirtNormals,uvs:skirtUV});roofSkirtData.applyToMesh(roofSkirt);add(roofSkirt,new Vector3(roofCenterX,3.3,roofCenterZ),M.cliff);worldSurfaceUV(roofSkirt,3.2);
    if (!options.omitCellRoofs) {
    for (let outcrop = 0; outcrop < 6; outcrop++) {
      const angle = room.id * 1.7 + outcrop * 2.1;
      const oz=Math.cos(angle)*roofDepth*.3,ox=Math.sin(angle)*roofWidth*.28;
      organicBoulder(`a1:room-${room.id}:roof-outcrop`,roofCenterX+ox,3.65+(roofDepth*.5-oz)/roofDepth*2.3,roofCenterZ+oz,2.6+(outcrop%2)*1.2,.95+outcrop*.08,1.9+((room.id+outcrop)%2)*.8,room.id*151+outcrop,M.cliff);
      const plantY=3.5+(roofDepth*.5-oz)/roofDepth*2.3;
      for(let side=0;side<3;side++)plantCard(roofCenterX+ox+.5,plantY+.3,roofCenterZ+oz,1.2,.8,outcrop%4,room.id+side*Math.PI/3,0,foliageSage);
    }
    }
    roofs.set(room.id, mergeDecoration(scene, root, roofParts, `a1:room-${room.id}:mountain-roof`));
    bucket = previousBucket;
    for (const side of [-1, 1]) {
      rock('a1:cave-entry-jamb', entry.x + side * .75, .82, entry.z - .12, .55, 1.65, .72, room.id * 10 + side, M.carved);
      rock('a1:cave-entry-shoulder', entry.x + side * .95, 1.95, entry.z - .3, .72, 1.35, .95, room.id * 12 + side, M.cliff);
    }
    for (let step = 0; step < 3; step++) { const stone = rock('a1:worn-threshold', entry.x + Math.sin(room.id + step) * .07, .075, entry.z + .25 + step * .54, 1.22, .09, .5, room.id * 5 + step, M.plaza); stone.rotation.y = Math.sin(room.id * 3 + step) * .06; }
    furnishRoom(room, roomStatics);
    const side = room.id % 2 ? 1 : -1;
    const edgeX = side > 0 ? Math.max(...xs) : Math.min(...xs);
    let torchX = edgeX + side * .43;
    let torchZ = center.z;
    if (options.retreatTorchMounts) {
      const edgeRows = zs.filter((_, index) => xs[index] === edgeX);
      torchZ = edgeRows.reduce((nearest, z) => Math.abs(z - center.z) < Math.abs(nearest - center.z) ? z : nearest, edgeRows[0]!);
      const wallX = edgeX + side * .52;
      torchX = wallX - side * .36;
      box('a1:torch-backplate', wallX, 1.72, torchZ, .09, .31, .16, M.metal);
      box('a1:torch-bracket', wallX - side * .14, 1.72, torchZ, .30, .075, .07, M.metal);
      cylinder('a1:torch-handle', wallX - side * .23, 1.85, torchZ, .68, .10, M.darkWood, 8).rotation.z = side * .31;
      cylinder('a1:torch-collar', torchX, 2.12, torchZ, .14, .18, M.metal, 8);
      flame(`a1:room-${room.id}:torch-flame`, torchX, 2.18, torchZ, .92);
    } else {
      const bracket = box('a1:torch-bracket', torchX, 1.72, torchZ, .12, .12, .62, M.metal);
      bracket.rotation.y = Math.PI / 2;
      bracket.rotation.x = -.18;
      cylinder('a1:torch-handle', torchX, 1.82, torchZ + .18, .72, .11, M.darkWood, 8).rotation.x = -.28;
      box('a1:torch-wrap', torchX, 2.08, torchZ + .09, .26, .34, .26, M.linen);
      flame(`a1:room-${room.id}:torch-flame`, torchX, 2.35, torchZ + .03, 1.05);
    }
    const torchLight = new PointLight(`a1:room-${room.id}:torch-light`, new Vector3(torchX, 2.30, torchZ), scene);
    torchLight.diffuse = Color3.FromHexString('#ffc078');
    torchLight.range = options.retreatTorchMounts ? 5.8 : 7.5;
    torchLight.renderPriority = 85;
    torchLight.metadata = { roomId: room.id };
    // One furniture mesh per cell, with material submeshes. Closed interiors
    // can be culled entirely, and the torch cannot reach another cell's props.
    if(roomStatics.some(mesh=>mesh.isVerticesDataPresent('color')))for(const mesh of roomStatics)if(!mesh.isVerticesDataPresent('color'))mesh.setVerticesData('color',new Float32Array(mesh.getTotalVertices()*4).fill(1));
    const furniture=Mesh.MergeMeshes(roomStatics,true,true,undefined,false,true);
    if(furniture){furniture.name=`a1:room-${room.id}:furniture`;furniture.parent=root;furniture.isPickable=false;furniture.checkCollisions=false;furniture.metadata={content:'CANON',roomId:room.id,decorativeOnly:true};litRoomSurfaces.push(furniture);}
    const interactive = interactiveByRoom.get(room.id) ?? []; litRoomSurfaces.push(...interactive);
    roomInteriors.set(room.id,[...roomFloors,...(furniture?[furniture]:[]),...interactive]);
    const perRoomLightTargets = [...roomFloors, ...(furniture?[furniture]:[]), ...interactive, ...walls.filter(wall => wall.roomId === room.id).flatMap(wall => wall.meshes)]; torchLight.includedOnlyMeshes = perRoomLightTargets;
    for (const candleLight of candleLights) if (candleLight.metadata?.roomId === room.id) candleLight.includedOnlyMeshes = perRoomLightTargets;
    fireLights.push(torchLight);
    bucket = statics;
  }

  function shelfUnit(name: string, x: number, z: number, width: number, levels: number, material = M.wood) {
    for (const dx of [-width / 2, width / 2]) box(`${name}:upright`, x + dx, .95, z, .12, 1.85, .42, material);
    for (let level = 0; level < levels; level++) {const y=.18+level*(1.55/Math.max(1,levels-1));box(`${name}:shelf`,x,y,z,width+.12,.11,.52,material);detail.timberTrim(new Vector3(x,0,z),width+.12,.52,y+.055);}
    // Open herb rack, framed bookcase, tool cabinet and cubbies have distinct silhouettes.
    if(name.includes('bookcase')||name.includes('cubbies')){
      box(name+':back',x,.96,z-.27,width,1.82,.055,M.darkWood);
      box(name+':cornice',x,1.88,z,width+.24,.11,.64,material);
      for(const side of [-1,1])box(name+':base-foot',x+side*width*.4,.11,z,.18,.18,.62,material);
      if(name.includes('cubbies'))for(const side of [-1,1])box(name+':partition',x+side*width*.17,.96,z,.06,1.65,.48,material);
    }else if(name.includes('herb'))detail.tube('herb-rack-brace',[new Vector3(x-width*.45,.2,z-.22),new Vector3(x+width*.45,1.7,z-.22)],.035,M.darkWood);
    else if(name.includes('parts')){box(name+':lower-cabinet',x,.35,z,width,.5,.47,M.darkWood);for(const side of [-1,1]){box(name+':drawer',x+side*width*.25,.4,z+.27,width*.46,.27,.05,M.wood);detail.ring('tool-drawer-pull',new Vector3(x+side*width*.25,.4,z+.31),.09,.016,M.brass).rotation.x=Math.PI/2;}}
  }
  function candlePair(x: number, z: number, roomId: number) {
    cylinder('a1:desk-candle-1', x - .12, .98, z, .22, .09, M.linen, 8);
    cylinder('a1:desk-candle-2', x + .12, .95, z, .16, .08, M.linen, 8);
    detail.bowl(new Vector3(x-.12,.86,z),.085,M.brass);detail.bowl(new Vector3(x+.12,.86,z),.07,M.brass);
    flame(`a1:room-${roomId}:candle`, x - .12, options.retreatTorchMounts ? 1.09 : 1.14, z, .34);
    const light = new PointLight(`a1:room-${roomId}:candle-light`,
      new Vector3(options.retreatTorchMounts ? x - .12 : x, options.retreatTorchMounts ? 1.14 : 1.3, z), scene);
    light.diffuse = Color3.FromHexString('#ffd39a'); light.range = 4.1; light.metadata = { roomId };
    candleLights.push(light);
  }
  function furnishRoom(room: A1RoomSpec, roomStatics: Mesh[]) {
    const previous = bucket; bucket = roomStatics;
    const footprint=new Set(room.cells.map(c=>key(c.col,c.row)));
    const cloth = room.role === 'varnoth' ? M.blue : room.role === 'myla' ? M.red : room.role.includes('kobolds') ? M.green : M.linen;
    const rugMat = room.role === 'varnoth' ? M.blue : room.role === 'myla' ? M.red : M.linen;
    for (const item of room.furniture) {
      const p = worldCell(item.cell.col, item.cell.row);
      // Bed frames and desk trims exceed a half-cell near the carved walls.
      // Inset the actual object, preserving its authoritative interaction cell.
      const halfX=item.kind==='bed'?.71:item.kind==='desk'||item.kind==='tools'?.67:.38;
      const inset=Math.max(0,halfX+(options.retreatTorchMounts?.55:.28)-.75);
      if(!footprint.has(key(item.cell.col-1,item.cell.row)))p.x+=inset;
      if(!footprint.has(key(item.cell.col+1,item.cell.row)))p.x-=inset;
      const point = definition.camp!.interactionPoints.find(point => point.kind === 'bed' && point.objectCell?.col === room.objectCell.col && point.objectCell.row === room.objectCell.row)!;
      if (item.kind === 'bed') {
        box('a1:bed-rug', p.x, .04, p.z, 1.85, .015, 2.65, rugMat);
        box('a1:bed-frame', p.x, .38, p.z, 1.34, .28, 2.1, M.darkWood);
        sphere('a1:mattress', p.x, .62, p.z, 1.35, .42, 2.02, M.linen);
        keep(point.id,'blanket',add(campClothSurface(scene,'a1:blanket',1.28,1.08,.055),p.add(new Vector3(0,.9,.42)),cloth),room.id);
        keep(point.id,'pillow',sphere('a1:pillow', p.x, .87, p.z - .7, .92, .24, .48, M.linen),room.id);
        box('a1:headboard', p.x, .79, p.z - 1.03, 1.42, 1.18, .14, M.wood);
        detail.timberTrim(p,1.4,2.1,.48);
        for(const side of [-1,1]){cylinder('a1:bed-end-post',p.x+side*.61,.57,p.z+.96,.91,.1,M.wood,10);sphere('a1:bed-post-finial',p.x+side*.61,1.03,p.z+.96,.13,.13,.13,M.wood,7);}
        for(let i=0;i<3;i++)box('a1:headboard-panel',p.x+(i-1)*.34,.95,p.z-1.115,.27,.54,.02,M.darkWood);
        shadow(p.x, p.z, 1.65, 2.42);
      }
      else if (item.kind === 'nightstand') {
        box('a1:nightstand', p.x, .39, p.z, .72, .72, .66, M.wood);
        box('a1:nightstand-drawer', p.x, .49, p.z + .34, .58, .21, .035, M.darkWood);
        sphere('a1:drawer-pull', p.x, .49, p.z + .39, .08, .07, .055, M.brass, 7);
        cylinder('a1:nightstand-flask', p.x, .84, p.z, .22, .14, M.pottery, 8);
        detail.timberTrim(p,.72,.66,.77);detail.bowl(p.add(new Vector3(.16,.76,.12)),.12);
      }
      else if (item.kind === 'desk') {
        box('a1:desk-top', p.x, .82, p.z, 1.22, .13, .82, M.wood);
        for (const dx of [-.5, .5]) for (const dz of [-.31, .31]) box('a1:desk-leg', p.x + dx, .4, p.z + dz, .09, .8, .09, M.darkWood);
        box('a1:desk-journal', p.x - .35, .91, p.z, .34, .06, .28, cloth);
        box('a1:desk-parchment', p.x + .32, .905, p.z, .28, .025, .26, M.paper);
        cylinder('a1:desk-inkpot', p.x - .12, .92, p.z - .2, .07, .08, M.metal, 7);
        cylinder('a1:desk-scroll', p.x + .12, .91, p.z - .2, .22, .06, M.paper, 6).rotation.z = Math.PI / 2;
        candlePair(p.x, p.z - .22, room.id);
        detail.timberTrim(p,1.22,.82,.9);detail.tube('desk-quill',[p.add(new Vector3(-.11,.96,-.2)),p.add(new Vector3(.02,1.22,-.15))],.008,M.paper);
        if(room.role==='myla'){detail.ring('myla-small-gear',p.add(new Vector3(.32,.94,.08)),.13,.025,M.brass);detail.bottle(p.add(new Vector3(.49,.9,-.16)),.16,M.brass);}
        shadow(p.x, p.z, 1.45, 1.08);
      }
      else if (item.kind === 'chair') {
        box('a1:chair-seat', p.x, .48, p.z, .64, .11, .64, M.wood);
        box('a1:chair-cushion', p.x, .54, p.z, .58, .05, .58, cloth);
        box('a1:chair-back', p.x, .84, p.z + .3, .64, .75, .09, M.wood);
        for (const dx of [-.24, .24]) for (const dz of [-.24, .24]) box('a1:chair-leg', p.x + dx, .24, p.z + dz, .08, .48, .08, M.darkWood);
        for(const side of [-1,1])box('a1:chair-stretcher',p.x,.2,p.z+side*.24,.54,.055,.055,M.darkWood);
        for(const side of [-1,1])box('a1:chair-back-panel',p.x+side*.16,.9,p.z+.35,.08,.57,.035,M.darkWood);
      }
      else if (item.kind === 'hammock') {
        const path: Vector3[][] = [];
        for (let step = 0; step <= 12; step++) {
          const t = step / 12, z = p.z - .68 + t * 1.36, y = 1.2 - Math.sin(t * Math.PI) * .44;
          path.push([new Vector3(p.x - .38, y, z), new Vector3(p.x + .38, y, z)]);
        }
        // Only the selected hammock responds; the other suspension points stay
        // fixed and keep their original canon arrangement.
        const hammock=add(MeshBuilder.CreateRibbon('a1:kobold-hammock', { pathArray: path, sideOrientation: Mesh.DOUBLESIDE }, scene), Vector3.Zero(), cloth);
        if(item.cell.col===point.objectCell!.col&&item.cell.row===point.objectCell!.row)keep(point.id,'hammock',hammock,room.id,{contact:new Vector3(p.x,.76,p.z)});
        for (const dz of [-.72, .72]) box('a1:hammock-post', p.x, .72, p.z + dz, .08, 1.44, .08, M.darkWood);
        for(const side of [-1,1])for(const dz of [-.72,.72])detail.tube('hammock-suspension',[new Vector3(p.x+side*.32,1.18,p.z+dz*.92),new Vector3(p.x,1.38,p.z+dz)],.018,M.linen);
        shadow(p.x, p.z, .98, 1.48);
      }
      else if (item.kind === 'tools') {
        box('a1:myla-workbench', p.x, .66, p.z, 1.35, 1.18, 1.06, M.wood);
        box('a1:myla-mat', p.x, .04, p.z, 1.75, .015, 1.55, M.red);
        for (let tool = 0; tool < 6; tool++) {
          const x = p.x - .4 + (tool % 3) * .4, z = p.z - .2 + Math.floor(tool / 3) * .4;
          const handle = box('a1:myla-tool-handle', x, 1.3, z, .055, .05, .28, M.darkWood);
          handle.rotation.y = (tool - 2) * .18;
          if (tool % 2 === 0) box('a1:myla-tool-head', x, 1.32, z - .12, .18, .11, .09, M.metal);
          else cylinder('a1:myla-gear', x, 1.33, z - .1, .05, .16, M.brass, 8).rotation.z = Math.PI / 2;
        }
      }
    }
    // Perimeter anchors use the cave footprint; the entrance neck is excluded.
    const cells=room.cells.filter(c=>c.row<11),x0=Math.min(...cells.map(c=>c.col))*1.5,x1=(Math.max(...cells.map(c=>c.col))+1)*1.5,z0=Math.min(...cells.map(c=>c.row))*1.5,z1=(Math.max(...cells.map(c=>c.row))+1)*1.5;
    const rear=z0+(options.retreatTorchMounts?.82:.52),front=z1-.85;
    if(room.role==='free'){
      shelfUnit('a1:free-linen-shelf',x1-2.25,rear,1.15,3);
      for(let i=0;i<4;i++)box('a1:free-folded-linen',x1-2.65+i*.26,.55+(i%2)*.5,rear+.08,.2,.17,.3,i%2?M.blue:M.linen);
      box('a1:free-bench',x1-1.1,.3,front,1.1,.22,.48,M.wood);shadow(x1-1.1,front,1.2,.6);
      box('a1:free-washstand',x0+1,.38,front,.8,.72,.64,M.wood);shadow(x0+1,front,.9,.8);
      detail.bowl(new Vector3(x0+1,.78,front),.22);detail.bottle(new Vector3(x0+1.24,.76,front+.1),.27);
    }else if(room.role==='tarak'){
      shelfUnit('a1:tarak-herb-shelf',x1-1.05,rear,1.1,4);
      for(let i=0;i<8;i++)detail.bottle(new Vector3(x1-1.45+(i%3)*.36,.25+Math.floor(i/3)*.52,rear+.07),.22);
      for(let i=0;i<4;i++)plantCard(x0+.9+i*.38,1.9,rear,.35,.65,i%2,0,Math.PI);
      const p=new Vector3(x0+1,.03,z1-3);box('a1:tarak-mortar-table',p.x,.32,p.z,.68,.64,.68,M.wood);detail.bowl(p.add(new Vector3(0,.66,0)),.16,M.limestone);shadow(p.x,p.z,.8,.8);
    }else if(room.role==='varnoth'){
      shelfUnit('a1:varnoth-bookcase',x1-1.15,rear,1.5,4,M.darkWood);
      for(let i=0;i<10;i++)box('a1:varnoth-book',x1-1.7+(i%5)*.27,.4+Math.floor(i/5)*.53,rear+.08,.2,.36,.28,i%4?M.paper:M.blue);
      const shield=add(MeshBuilder.CreateDisc('a1:varnoth-shield',{radius:.46,tessellation:18},scene),new Vector3(x0+1.1,1.3,rear),M.brass);shield.rotation.y=0;
      box('a1:varnoth-spear',x0+1.85,1.25,rear,.07,2.5,.07,M.darkWood).rotation.z=.12;
    }else if(room.role==='myla'){
      shelfUnit('a1:myla-parts-shelf',x0+1.25,rear,1.65,4);shelfUnit('a1:myla-crate-shelf',x1-1.1,rear,1.25,3,M.darkWood);
      for(let i=0;i<12;i++)detail.round('myla-rivet-tin',new Vector3(x0+.65+(i%5)*.3,.27+Math.floor(i/5)*.52,rear+.08),.12,.1,i%2?M.brass:M.metal);
      for(let i=0;i<3;i++)box('a1:myla-crate',x1-.8,.3+i*.56,z0+3,.62,.56,.62,M.wood);shadow(x1-.8,z0+3,.8,.8);
    }else if(room.role==='kobolds-west'){
      shelfUnit('a1:kobold-west-shelf',(x0+x1)/2,rear,1.6,3);
      for(let i=0;i<6;i++)sphere('a1:kobold-bundle',(x0+x1)/2-.6+(i%3)*.5,.35+Math.floor(i/3)*.5,rear+.05,.34,.2,.28,i%2?M.green:M.linen);
      for(let i=0;i<2;i++)detail.basket(new Vector3(x0+.55+i*(x1-x0-1.1),.02,front-.25),.3);
    }else{
      shelfUnit('a1:kobold-east-cubbies',(x0+x1)/2,rear,1.5,4,M.darkWood);
      for(let i=0;i<8;i++)box('a1:kobold-keepsake',(x0+x1)/2-.5+(i%4)*.35,.3+Math.floor(i/4)*.52,rear+.05,.23,.2,.24,i%3?M.pottery:M.brass);
      const x=x0+1.7,z=front-.3;box('a1:kobold-low-table',x,.28,z,1.15,.18,.7,M.wood);shadow(x,z,1.3,.9);
      for(const dx of [-.9,.9]){cylinder('a1:kobold-stool',x+dx,.22,z,.44,.26,M.darkWood,8);shadow(x+dx,z,.4,.4);}
      detail.bowl(new Vector3(x-.25,.4,z),.12);detail.bottle(new Vector3(x+.25,.38,z),.2);
    }
    for(const item of room.furniture){const p=worldCell(item.cell.col,item.cell.row);if(item.kind==='chair'||item.kind==='nightstand'||item.kind==='tools')shadow(p.x,p.z,item.kind==='tools'?1.4:.8,item.kind==='tools'?1.1:.8);}
    bucket = previous;
  }

  const statue = worldCell(A1_STATUE_CELL.col, A1_STATUE_CELL.row);
  const statueTexture=painted('astalagan-weathered-stone','#b1b5a4','limestone-v3.webp',1.5);
  campMaterialRelief(scene,statueTexture,'rock');readableMaterials.push(statueTexture);
  const dragon=createA1DragonStatue(scene,root,statue,statueTexture,M.carved);
  shadow(statue.x,statue.z,2.1,1.8);
  for(let i=0;i<5;i++){const a=Math.PI*.12+i*Math.PI*.19,x=statue.x+Math.cos(a)*1.35,z=statue.z+Math.sin(a)*1.35;
    detail.bowl(new Vector3(x,.17,z),.15,M.brass);cylinder('a1:astalagan-votive',x,.3,z,.28,.12,M.linen,8);
    const wick=flame('a1:statue-votive-flame',x,options.retreatTorchMounts?.44:.48,z,.32);wick.metadata={...wick.metadata,independentLamp:true};
  }
  const votiveLight=new PointLight('a1:statue-votive-light',statue.add(new Vector3(0,.7,1.2)),scene);votiveLight.diffuse=Color3.FromHexString('#ffc98c');votiveLight.range=4.2;votiveLight.renderPriority=86;
  const wickParts=flameMeshes.filter(m=>m.metadata?.independentLamp);
  const wicks=compound(wickParts,'a1:statue-votive-flame')[0]!;
  wicks.bakeTransformIntoVertices(Matrix.Translation(-statue.x,0,-statue.z));wicks.position.set(statue.x,0,statue.z);
  flameMeshes.splice(0,flameMeshes.length,...flameMeshes.filter(m=>!wickParts.includes(m)),wicks);
  wicks.metadata={independentLamp:true,candleCount:5,baseX:1,baseY:1,baseZ:1};

  // Offering altar in front of Astalagan
  detail.bowl(statue.add(new Vector3(0,.14,1.54)),.27,M.brass);
  cylinder('a1:astalagan-offering',statue.x,.19,statue.z+1.54,.018,.32,M.darkWood,16);

  const fire = worldCell(A1_FIRE_CELL.col, A1_FIRE_CELL.row);
  const firePoint=definition.camp!.interactionPoints.find(p=>p.kind==='fire')!;
  const hearth=new CampFire(firePoint.id),coals=createCampCoals(scene,root,fire,.64);
  cylinder('a1:fire-embers-base', fire.x, .08, fire.z, .12, 1.42, M.glow, 10);
  cylinder('a1:fire-embers-glow', fire.x, .13, fire.z, .06, 1.08, M.glow, 8);

  for (let i = 0; i < 16; i++) {
    const angle = i / 16 * Math.PI * 2;
    rock('a1:fire-ring-stone', fire.x + Math.cos(angle) * .82, .18 + (i % 3) * .02, fire.z + Math.sin(angle) * .82, .48, .3, .42, 300 + i, M.limestone);
  }
  for (const angle of [-.75, -.25, .25, .75]) {
    const log = cylinder('a1:fire-log', fire.x, .32, fire.z, 1.55, .19, M.darkWood, 8);
    log.rotation.z = Math.PI / 2; log.rotation.y = angle;
    keep(firePoint.id,'log',log,undefined,{side:angle<0?-1:1});
  }
  const core=flame('a1:plaza-fire', fire.x, .72, fire.z, 2.15);registerInteractionPart(scene,firePoint.id,'flame',core);
  const plazaLight = new PointLight('a1:plaza-fire-light', new Vector3(fire.x, 1.1, fire.z), scene);
  plazaLight.diffuse = Color3.FromHexString('#ff8b36'); plazaLight.range = 14.5; fireLights.push(plazaLight);
  const firePool = add(MeshBuilder.CreateDisc('a1:plaza-fire-bounce', { radius: 5.2, tessellation: 28 }, scene), new Vector3(fire.x, .1, fire.z), warmPool); firePool.rotation.x = Math.PI / 2;

  for (const side of [-1, 1]) {
    const benchX = fire.x + side * (options.courtyardSpread?4.5:3),benchZ=fire.z-(options.courtyardSpread?1.5:0);
    box('a1:fire-bench-seat', benchX, .53, benchZ, 1.18, .2, 2.35, M.wood);
    for (const dz of [-.82, .82]) box('a1:fire-bench-leg', benchX, .27, benchZ + dz, .18, .54, .18, M.darkWood);
    const back = box('a1:fire-bench-back', benchX + side * .48, .94, benchZ, .13, .85, 2.25, M.wood); back.rotation.z = -side * .08;
    const point=definition.camp!.interactionPoints.find(p=>p.kind==='seat'&&p.objectCell?.col===(side<0?22:26))!;
    keep(point.id,'seat-cloth',box('a1:bench-folded-cloth',benchX,.65,benchZ,.75,.055,.5,M.blue));
    shadow(benchX, benchZ, 1.35, 2.65);
  }
  const tripodX = fire.x + 1.15;
  for (let leg = 0; leg < 3; leg++) { const angle = leg / 3 * Math.PI * 2; const pole = cylinder('a1:fire-tripod', tripodX + Math.cos(angle) * .32, .88, fire.z + Math.sin(angle) * .32, 1.8, .07, M.metal, 7); pole.rotation.z = Math.cos(angle) * .18; pole.rotation.x = Math.sin(angle) * .18; }
  const kettle = cylinder('a1:fire-kettle', tripodX, .78, fire.z, .48, .58, M.metal, 12); kettle.scaling.y = .8;
  keep(firePoint.id,'pot',kettle,undefined,{contact:new Vector3(tripodX,.98,fire.z)});
  const kettleHandle = add(MeshBuilder.CreateTorus('a1:fire-kettle-handle', { diameter: .64, thickness: .055, tessellation: 18 }, scene), new Vector3(tripodX, 1.12, fire.z), M.metal); kettleHandle.rotation.x = Math.PI / 2; kettleHandle.scaling.y = .72;
  keep(firePoint.id,'pot',kettleHandle);
  keep(firePoint.id,'liquid',cylinder('a1:kettle-soup',tripodX,.97,fire.z,.016,.45,M.pottery,16));
  const spoon=cylinder('a1:kettle-spoon',tripodX+.08,1.14,fire.z,.48,.025,M.wood,6);spoon.rotation.z=.35;keep(firePoint.id,'utensil',spoon,undefined,{contact:new Vector3(tripodX,1.02,fire.z)});
  const guard=definition.camp!.interactionPoints.find(p=>p.kind==='guard')!;
  const guardAt=worldCell(guard.cell.col,guard.cell.row);
  const lamp=cylinder('a1:watch-lamp',guardAt.x+.3,.2,guardAt.z,.23,.16,M.brass,8);lamp.metadata={content:'VTT_AMBIENCE'};keep(guard.id,'lantern',lamp);
  for (let i = 0; i < 6; i++) { const log = cylinder('a1:woodpile-log', fire.x - 1.3 + (i % 3) * .32, .19 + Math.floor(i / 3) * .18, fire.z + 1.48, .92, .17, M.darkWood, 8); log.rotation.z = Math.PI / 2; log.rotation.y = (i % 3 - 1) * .12;if(i===5)keep(firePoint.id,'fuel-log',log,undefined,{contact:fire.add(new Vector3(-.3,.32,.1))}); }
  cylinder('a1:fire-water-bucket', fire.x - 1.35, .38, fire.z - 1.45, .64, .58, M.wood, 10);
  detail.bowl(fire.add(new Vector3(-1.35,.68,-1.45)),.26,M.darkWood);
  detail.coil(fire.add(new Vector3(-1.08,.14,1.12)),.28);
  for(const side of [-1,1]){const dx=side*(options.courtyardSpread?4.5:3),dz=options.courtyardSpread?-1.5:0;detail.bowl(fire.add(new Vector3(dx-side*.2,.66,dz+.75)),.13);detail.bottle(fire.add(new Vector3(dx+side*.1,.66,dz-.8)),.23);}

  // Natural irregular coastal rocks and occasional mossy crevices along the terrace edge
  for (let i = 0; i < 14; i++) {
    const x = 3.5 + i * 4.9 + Math.sin(i * 1.7) * .85;
    const z = 26.2 + Math.cos(i * 2.3) * .45;
    rock(`a1:terrace-edge-rock:${i}`, x, .04, z, 1.8 + (i % 3) * .6, .65 + (i % 2) * .35, 1.4 + (i % 4) * .3, 400 + i, M.cliff);
    if (i % 2 === 0) grassTuft(x + .6, z - .3, .65 + (i % 3) * .12, i + 140, .14);
  }

  if (typeof document !== 'undefined') {
    const particleTexture = (name: string, center: string, edge: string) => {
      const texture = new DynamicTexture(name, { width: 64, height: 64 }, scene, false);
      const context = texture.getContext(); const gradient = context.createRadialGradient(32, 32, 2, 32, 32, 31);
      gradient.addColorStop(0, center); gradient.addColorStop(1, edge); context.fillStyle = gradient; context.fillRect(0, 0, 64, 64); texture.update(); return texture;
    };
    const softParticle = particleTexture('a1:soft-particle-vfx', 'rgba(255,255,255,.95)', 'rgba(255,255,255,0)');
    const smokeParticle = particleTexture('a1:smoke-particle-vfx', 'rgba(125,115,102,.62)', 'rgba(68,72,75,0)');
    const foamParticle = particleTexture('a1:foam-particle-vfx', 'rgba(255,255,255,1)', 'rgba(210,235,255,0)');

    const smoke = new ParticleSystem('a1:fire-smoke-vfx', 88, scene); smoke.particleTexture = smokeParticle; smoke.emitter = new Vector3(fire.x, 1.05, fire.z); smoke.minEmitBox = new Vector3(-.22, 0, -.22); smoke.maxEmitBox = new Vector3(.22, .18, .22); smoke.color1 = new Color4(.48, .44, .39, .38); smoke.color2 = new Color4(.32, .35, .37, .24); smoke.colorDead = new Color4(.18, .2, .22, 0); smoke.minSize = .38; smoke.maxSize = 1.45; smoke.minLifeTime = 1.9; smoke.maxLifeTime = 4.1; smoke.emitRate = 14; smoke.minAngularSpeed = -.4; smoke.maxAngularSpeed = .4; smoke.direction1 = new Vector3(-.18, .75, -.10); smoke.direction2 = new Vector3(.24, 1.25, .16); smoke.gravity = new Vector3(.04, .065, 0); smoke.updateSpeed = .02; smoke.blendMode = ParticleSystem.BLENDMODE_STANDARD; smoke.start(); vfxSystems.push(smoke);
    const embers = new ParticleSystem('a1:fire-embers-vfx', 48, scene); embers.particleTexture = softParticle; embers.emitter = new Vector3(fire.x, .72, fire.z); embers.minEmitBox = new Vector3(-.3, 0, -.3); embers.maxEmitBox = new Vector3(.3, .2, .3); embers.color1 = new Color4(1, .54, .16, .9); embers.color2 = new Color4(1, .82, .35, .7); embers.colorDead = new Color4(.65, .16, .04, 0); embers.minSize = .025; embers.maxSize = .075; embers.minLifeTime = .65; embers.maxLifeTime = 1.7; embers.emitRate = 8; embers.direction1 = new Vector3(-.18, .55, -.12); embers.direction2 = new Vector3(.18, 1.25, .12); embers.gravity = new Vector3(.08, .1, 0); embers.updateSpeed = .022; embers.blendMode = ParticleSystem.BLENDMODE_ADD; embers.start(); vfxSystems.push(embers);
    const steam = new ParticleSystem('a1:kettle-steam-vfx', 24, scene); steam.particleTexture = softParticle; steam.emitter = new Vector3(tripodX, 1.05, fire.z); steam.minEmitBox = new Vector3(-.06, 0, -.06); steam.maxEmitBox = new Vector3(.06, .06, .06); steam.color1 = new Color4(1, 1, 1, .4); steam.color2 = new Color4(.88, .9, .92, .18); steam.colorDead = new Color4(.9, .9, .9, 0); steam.minSize = .06; steam.maxSize = .3; steam.minLifeTime = .8; steam.maxLifeTime = 1.6; steam.emitRate = 5; steam.direction1 = new Vector3(-.03, .35, -.03); steam.direction2 = new Vector3(.05, .6, .05); steam.updateSpeed = .016; steam.start(); vfxSystems.push(steam);
    const wind = new ParticleSystem('a1:coastal-wind-vfx', 96, scene); wind.particleTexture = softParticle; wind.emitter = new Vector3(36, 2.6, 16); wind.minEmitBox = new Vector3(-38, -.8, -14); wind.maxEmitBox = new Vector3(38, 4.8, 12); wind.color1 = new Color4(.78, .83, .78, .1); wind.color2 = new Color4(.72, .76, .7, .04); wind.colorDead = new Color4(.8, .85, .8, 0); wind.minSize = .015; wind.maxSize = .045; wind.minLifeTime = 4; wind.maxLifeTime = 8; wind.emitRate = 8; wind.direction1 = new Vector3(.65, -.02, .06); wind.direction2 = new Vector3(1.35, .08, .22); wind.updateSpeed = .02; wind.start(); vfxSystems.push(wind);

    // Dynamic wave impact explosions & surging ocean foam particles
    for (let wave = 0; wave < 8; wave++) {
      const spray = new ParticleSystem(`a1:wave-break-${wave}-vfx`, 64, scene);
      spray.particleTexture = foamParticle;
      spray.emitter = new Vector3(-8 + wave * 12.5, -8.6 + (wave % 2) * .35, 31.8 + Math.sin(wave * 1.6) * .7);
      spray.minEmitBox = new Vector3(-4.5, 0, -1.2); spray.maxEmitBox = new Vector3(4.5, .8, 1.2);
      spray.color1 = new Color4(1, 1, 1, .95); spray.color2 = new Color4(.75, .92, 1, .6); spray.colorDead = new Color4(.85, .96, 1, 0);
      spray.minSize = .14; spray.maxSize = .48;
      spray.minScaleX = .8; spray.maxScaleX = 1.5; spray.minScaleY = .8; spray.maxScaleY = 1.6;
      spray.minLifeTime = .85; spray.maxLifeTime = 2.1; spray.emitRate = 8;
      spray.direction1 = new Vector3(-.6, .9, -.6); spray.direction2 = new Vector3(.6, 2.3, -.2);
      spray.gravity = new Vector3(0, -2.4, 0); spray.updateSpeed = .022; spray.blendMode = ParticleSystem.BLENDMODE_STANDARD;
      spray.start(); vfxSystems.push(spray);
    }
  }

  for (let i = 0; i < 38; i++) { const x = 1.5 + i * 1.82 + Math.sin(i * 1.4) * .38; if (i % 3 === 0) plantCard(x, 2.25 + (i % 4) * .28, 2.85, 1.05, 1.45, 2, 0); shrub(x, 3.05 + Math.sin(i) * .28, .62 + (i % 4) * .12, i + 80, .15); }

  const propMaterials=[M.wood,M.darkWood,M.metal,M.brass,M.pottery,M.paper,M.linen,M.blue,M.red,M.green];
  const propParts=statics.filter(m=>propMaterials.includes(m.material as StandardMaterial)),otherStatics=statics.filter(m=>!propMaterials.includes(m.material as StandardMaterial));
  const props=compound(propParts,'a1:static:small-props');props.forEach(m=>m.freezeWorldMatrix());
  const merged = [...mergeDecoration(scene, root, otherStatics, 'a1:static', true),...props], ridge = compound(cliffMeshes,'a1:ridge:continuation');
  plazaLight.includedOnlyMeshes = [...merged, ...ridge];votiveLight.includedOnlyMeshes=[...merged,...dragon.getChildMeshes()];
  const lighting = createRestLighting(scene, definition.id);
  const coastFill = new PointLight('a1:coastal-rim-light', new Vector3(36, 9, 34), scene); coastFill.diffuse = Color3.FromHexString('#89aabc'); coastFill.specular = Color3.FromHexString('#718d9e'); coastFill.range = 64; coastFill.includedOnlyMeshes = [...ridge,...bedrockPartitions.flatMap(p=>p.meshes)];
  scene.getLightByName('terrain-ambient')?.setEnabled(false); for (const light of scene.lights) if (light.name.startsWith(`light:${definition.id}-`)) light.setEnabled(false);
  const shadowCache=new CampShadows(scene,lighting.sun,typeof matchMedia==='function'&&matchMedia('(pointer: coarse), (max-width:850px)').matches,undefined,false,options.cullShadowCasters),climate=createCampSurfaceEffects(scene,definition),life=createCampLife(scene,root,'a1',72,33);
  if (typeof window !== 'undefined' && window.matchMedia('(pointer: fine) and (min-width: 851px)').matches) {
    const geometry = [...merged, ...ridge,...bedrockPartitions.flatMap(p=>p.meshes), ...litRoomSurfaces, ...walls.flatMap(wall => wall.meshes), ...facades.values(), ...roofs.values()].flat().filter((mesh, index, all) => all.indexOf(mesh) === index);
    for (const mesh of geometry) mesh.receiveShadows = true;
    const glow = new GlowLayer('a1:fire-glow-v5', scene, { mainTextureRatio: .25, blurKernelSize: 24 }); glow.intensity = .42; for (const mesh of flameMeshes) glow.addIncludedOnlyMesh(mesh);
  }
  const interactionPoints = definition.camp!.interactionPoints;
  const rings = interactionPoints.map(point => { const objectCell = point.objectCell ?? point.cell; const ring = MeshBuilder.CreateTorus(`${point.id}:dm-interaction-halo`, { diameter: 1.14, thickness: .055, tessellation: 24 }, scene); ring.position = worldCell(objectCell.col, objectCell.row); ring.position.y = .1; ring.material = M.halo; ring.parent = root; ring.isPickable = false; ring.visibility = 0; return ring; });
  let highlights: boolean | string | null = false, lastTime = 0;
  const update = (time: number, phase?: CampRestPhase | null, interactions:CampRestState['interactions']=[], focusCell?: Cell | null,environment?:EnvironmentState,serverNow=Date.now(),climateState?:ClimateState,light?:NaturalLightProfile) => {
    const dark = light ? 1-light.ambient : darkness[phase ?? 'arrival'], day = 1 - dark, elapsed=Math.min(1,Math.max(0,time-lastTime)),dt=Math.min(.1,elapsed); lastTime = time;
    const fireLevel=hearth.update(elapsed,dark,environment,interactions,serverNow),lamps=dark>.2;
    const votivesLit=lamps&&!(environment&&(strongWind(environment)||precipitationKind(environment)==='rain'&&(environment.precipitationLevel??2)===3));
    coals.update(time,fireLevel.embers);climate.update(elapsed,environment,climateState);life.update(time,dark);
    M.glow.emissiveColor=Color3.FromHexString('#ff782c').scale(fireLevel.embers*.55);M.glow.diffuseColor=Color3.FromHexString(fireLevel.embers>.05?'#ab522b':'#29231e');
    const activeRoom = focusCell ? A1_ROOMS.find(room => room.cells.some(cell => cell.col === focusCell.col && cell.row === focusCell.row))?.id : undefined;
    lighting.update(dark);
    lighting.ambient.intensity *= .88 + day * .12;
    lighting.sun.intensity *= .94 + day * .22;
    const weatherGlow=weatherLight(environment,serverNow/1000,typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches);
    lighting.ambient.intensity*=.75+weatherGlow.cloud*.25;lighting.sun.intensity=lighting.sun.intensity*weatherGlow.cloud+weatherGlow.flash;
    lighting.sun.diffuse=Color3.Lerp(lighting.sun.diffuse,Color3.FromHexString('#bbd6ef'),Math.min(1,weatherGlow.flash));
    lighting.ambient.groundColor = Color3.FromHexString(dark > .7 ? '#1b3043' : '#625b4e');
    coastFill.intensity = .11 + dark * .34;
    backdrop.update(time,dark,seaState(environment,.35));
    const actorMeshes=scene.meshes.filter(m=>m.metadata?.nativeBillboard);
    fireLights.forEach((light, index) => {
      const roomId = Number(light.metadata?.roomId ?? 0);
      includeCampActors(light,m=>{const p=m.getAbsolutePosition(),r=A1_ROOMS.find(r=>r.cells.some(c=>c.col===Math.floor(p.x/1.5)&&c.row===Math.floor(p.z/1.5)));return roomId?r?.id===roomId:!r;},scene,actorMeshes);
      const level = roomId && options.retreatTorchMounts ? .65 + dark * 1.16 : .78 + dark * 2.55;
      const flicker = roomId && options.retreatTorchMounts
        ? torchMotion(time, roomId, Boolean(motionPreference?.matches)).pulse * 1.1
        : Math.sin(time * 9.8 + index * 2.1) * .13 + Math.sin(time * 16.2 + index) * .055;
      light.intensity = !lamps||(roomId && roomId !== activeRoom) ? 0 : (level + flicker)*(roomId?1:fireLevel.flame);
    });
    includeCampActors(votiveLight,m=>Vector3.Distance(m.getAbsolutePosition(),statue)<4.2,scene,actorMeshes);
    votiveLight.intensity=votivesLit?.72+Math.sin(time*8)*.035:0;
    candleLights.forEach((light, index) => {
      const roomId = Number(light.metadata?.roomId ?? 0);
      includeCampActors(light,m=>{const p=m.getAbsolutePosition(),r=A1_ROOMS.find(r=>r.cells.some(c=>c.col===Math.floor(p.x/1.5)&&c.row===Math.floor(p.z/1.5)));return roomId?r?.id===roomId:!r;},scene,actorMeshes);
      light.intensity = !lamps||roomId !== activeRoom ? 0 : .14 + dark * .44 + Math.sin(time * 7.1 + index) * .026;
    });
    flameMeshes.forEach((mesh, index) => {
      const roomId = Number(mesh.name.match(/a1:room-(\d+)/)?.[1] ?? 0);
      mesh.visibility = !lamps||mesh.metadata?.independentLamp&&!votivesLit||(roomId && roomId !== activeRoom) ? 0 : roomId||mesh.metadata?.independentLamp?1:fireLevel.flame;
      const baseX = Number(mesh.metadata?.baseX ?? .18), baseY = Number(mesh.metadata?.baseY ?? .34), baseZ = Number(mesh.metadata?.baseZ ?? .18), phaseOffset = Number(mesh.metadata?.phase ?? index);
      // The five votive flames share a mesh whose origin is the statue. A
      // horizontal scale animated their spacing around it, making them dance
      // away from the candles. Keep X/Z fixed; only a tiny vertical flicker.
      if(mesh.metadata?.independentLamp){mesh.scaling.set(1,1+Math.sin(time*6.1)*.008,1);return;}
      if (options.retreatTorchMounts && /:room-\d+:torch-flame$/.test(mesh.name)) {
        const motion = torchMotion(time, roomId, Boolean(motionPreference?.matches));
        mesh.scaling.set(baseX * motion.width, baseY * motion.height, baseZ * motion.width);
        mesh.rotation.z = motion.sway;
        return;
      }
      const pulse = 1 + Math.sin(time * 11.2 + phaseOffset) * .12 + Math.sin(time * 18.7 + index) * .04;
      mesh.scaling.x = baseX * pulse;
      mesh.scaling.y = baseY * (1 + Math.sin(time * 8.8 + phaseOffset) * .18 + Math.sin(time * 15.3 + index) * .05);
      mesh.scaling.z = baseZ * (2 - pulse);
      mesh.rotation.z = Math.sin(time * 6.2 + phaseOffset) * .06;
    });
    const materialLift = .04 + day * .065;
    for(const [roomId,meshes] of roomInteriors)for(const mesh of meshes)mesh.isVisible=roomId===activeRoom;
    for (const material of readableMaterials) material.emissiveColor.set(material.diffuseColor.r * materialLift, material.diffuseColor.g * materialLift, material.diffuseColor.b * materialLift);
    warmPool.alpha = lamps?.1 + dark * .24:0;firePool.isVisible=fireLevel.flame>.005;
    foliageVariants.forEach((material, index) => material.emissiveColor.set(.04 + day * (.06 + index * .006), .045 + day * (.07 + index * .004), .035 + day * .055));
    vfxSystems.forEach(system => {
      if (system.name.includes('smoke')) system.emitRate = (9 + dark * 6)*fireLevel.smoke;
      else if (system.name.includes('embers')) {system.emitRate = (10 + dark * 12)*fireLevel.embers;system.maxSize=.085;}
      else if (system.name.includes('wind')) system.emitRate = 5 + dark * 4;
      else if (system.name.includes('steam')) system.emitRate = (4 + dark * 3)*fireLevel.flame;
      else if (system.name.includes('wave-break')) {
        const index = Number(system.name.match(/wave-break-(\d+)/)?.[1] ?? 0);
        const crest = Math.max(0, Math.sin(time * 1.45 + index * 1.25));
        system.emitRate = (2 + Math.pow(crest,2.2)*56)*(.15+seaState(environment,.35)*1.4);
      }
      if(!lamps&&/fire-smoke|fire-embers|kettle-steam/.test(system.name)&&system.getActiveCount())system.reset();
    });
    scene.clearColor.set(.035 + day * .19, .065 + day * .26, .11 + day * .32, 1);
    const fogDensity=climateState?.fogDensity??0;
    scene.fogDensity=fogDensity*.018;scene.fogColor=Color3.FromHexString(dark>.7?'#29404d':'#9caeab');
    if(options.updateFog)options.updateFog(fogDensity);
    else scene.fogMode=2;
    const camera = scene.activeCamera;
    for (const [roomId, meshes] of facades) {
      const reveal = roomId === activeRoom ? 1 : -1;
      updateCutaway(meshes, reveal, dt);
      if (meshes.some(mesh => Math.abs(mesh.scaling.y - (activeRoom === roomId ? .035 : 1)) > .003)) shadowCache.invalidate();
    }
    for (const [roomId, meshes] of roofs) {
      const target = roomId === activeRoom ? 0 : 1;
      for (const mesh of meshes) {
        mesh.visibility += (target - mesh.visibility) * Math.min(1, dt * 10);
        if (mesh.visibility < .01) mesh.visibility = 0;
      }
    }
    if (camera) {
      for(const partition of bedrockPartitions){
        const reveal=activeRoom!==undefined&&partition.rooms.includes(activeRoom)&&scene.activeCamera!.globalPosition.z<2.4;
        updateCutaway(partition.meshes,reveal?1:-1,dt);
        if(partition.meshes.some(m=>Math.abs(m.scaling.y-(reveal?.035:1))>.003))shadowCache.invalidate();
      }
      const position = camera.globalPosition;
      for (const wall of walls) {
        const direction = position.subtract(wall.center); direction.y = 0; direction.normalize();
        // Even a slight oblique angle hides a bed against a side wall. The
        // occupied cell uses a complete side cutaway; other cells stay closed.
        const dot=Vector3.Dot(wall.normal,direction);
        // Keep the side walls when entering from the plaza. At oblique/rear
        // views cut only the wall actually between camera and occupied room.
        const facing=wall.roomId===activeRoom ? (wall.normal.x!==0 && Math.abs(direction.x)<.55 ? -1 : dot) : -1;
        updateCutaway(wall.meshes, facing, dt);
        if (wall.meshes.some(mesh => Math.abs(mesh.scaling.y - (facing > .18 ? .035 : 1)) > .003)) shadowCache.invalidate();
      }
      // Only cut the mountain away for an occupied cell viewed from behind.
      // Exterior rotations must keep the enclosing cliff, hiding the plinth.
      const behind = activeRoom !== undefined && position.z < 2.4;
      for (const mesh of ridge) {
        if (foliageVariants.includes(mesh.material as StandardMaterial)) mesh.visibility = behind ? 0 : 1;
        else {
          mesh.visibility += ((behind ? .05 : 1) - mesh.visibility) * Math.min(1, dt * 9);
          if (mesh.visibility < .01) mesh.visibility = 0;
        }
      }
    }
    rings.forEach((ring, index) => {
      const pointId = interactionPoints[index]?.id;
      const highlighted = highlights === true || (typeof highlights === 'string' && highlights === pointId);
      ring.visibility = highlighted ? .56 + Math.sin(time * 2 + index) * .07 : 0;
    });
    shadowCache.update(time,[...fireLights,...candleLights,votiveLight],focusCell?worldCell(focusCell.col,focusCell.row):fire,interactions.some(i=>serverNow-i.at>=0&&serverNow-i.at<8500));
  };
  update(0, 'arrival');
  return { root, update,weatherCovered:climate.covered, setInteractionHighlights: target => { highlights = target; } };
}
