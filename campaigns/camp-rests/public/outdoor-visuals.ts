import { strongWind, precipitationKind, weatherLight } from '../../../engine/shared/weather.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Material } from '@babylonjs/core/Materials/material.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight.js';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight.js';
import { PointLight } from '@babylonjs/core/Lights/pointLight.js';
import { GlowLayer } from '@babylonjs/core/Layers/glowLayer.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { Cell, PublicSceneDefinition } from '../../../engine/shared/campaign.js';
import type { CampRestPhase, CampRestState } from '../../../engine/shared/camp-rest.js';
import { fracturedStone, illustratedMaterial, mergeDecoration, organicStone, softPoolMaterial, worldSurfaceUV } from '../../../engine/client/diorama-kit.js';
import { createCampAtmosphere } from './camp-atmosphere.js';
import type { ForestFaunaController } from './forest-fauna.js';
import type { CampVisuals } from './visuals.js';
import { registerInteractionPart, interactionParts, type InteractionPartRole } from '../../../engine/client/interaction-animation.js';
import { campMaterialRelief, campClothSurface, createCampDetailKit, weatherRock, wornCampTrail } from './camp-detail-kit.js';
import type { EnvironmentState } from '../../../engine/shared/protocol.js';
import type { ClimateState, NaturalLightProfile } from '../../../engine/shared/game-time.js';
import { CampFire } from './camp-fire.js';
import { CampShadows, createCampCoals, createCampSurfaceEffects, includeCampActors } from './camp-surface-effects.js';
import { forestStreamX, forestStreamColumn } from './forest-stream.js';
import { createCampLife } from './camp-life.js';

const DARK: Record<CampRestPhase, number> = { arrival: .12, dusk: .63, night: .94, dawn: .36, finalization: .12 };
const C = 1.5, cellAt = (cell: Cell) => new Vector3((cell.col + .5) * C, 0, (cell.row + .5) * C);
const rand = (n: number) => { const value = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return value - Math.floor(value); };

/** The camp's public terrain remains authoritative; all dressing is decorative. */
export function createOutdoorVisuals(scene: Scene, definition: PublicSceneDefinition): CampVisuals {
  const profile = definition.camp!.visualProfile, terrain = definition.terrain!, width = terrain.cols * C, depth = terrain.rows * C;
  const root = new TransformNode('camp-visuals:' + definition.id, scene);
  root.metadata = { content: 'VTT_AMBIENCE', version: 'detail-v1', authoritativeTerrain: true };
  scene.imageProcessingConfiguration.exposure = 1.1; scene.imageProcessingConfiguration.contrast = 1.13;
  const compact = typeof matchMedia === 'function' && matchMedia('(pointer: coarse), (max-width:850px)').matches;
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  scene.getLightByName('terrain-ambient')?.setEnabled(false);
  for (const light of scene.lights) if (light.name.startsWith('light:' + definition.id + '-')) light.setEnabled(false);
  const ambient = new HemisphericLight('camp-ambient:' + definition.id, new Vector3(.2, 1, .1), scene);
  ambient.renderPriority = 100; ambient.groundColor = Color3.FromHexString('#435159');
  const sun = new DirectionalLight('camp-key:' + definition.id, new Vector3(-.48, -1, -.28), scene);
  sun.renderPriority = 90; sun.position.set(42, 40, 18); sun.shadowFrustumSize = 62;
  const asset = '/art/a1-hd2d-v1/', allMaterials: StandardMaterial[] = [];
  const paint = (name: string, tint: string, filename?: string, repeat = 1) => {
    const material = illustratedMaterial(scene, 'camp:' + definition.id + ':' + name, tint, filename ? filename.startsWith('/')?filename:asset+filename : undefined, repeat);
    material.maxSimultaneousLights = 6; allMaterials.push(material); return material;
  };
  const M = {
    rock: paint('rock', profile === 'cliff-observatory' ? '#a3b0ba' : '#d5d7c3', '/art/camp-detail-v1/coastal-rock.png'),
    rockDark: paint('rock-dark', profile === 'cliff-observatory' ? '#8194a1' : '#a7beae', '/art/camp-detail-v1/coastal-rock.png'),
    stone: paint('stone', '#cbc7b7', 'limestone-v3.webp'),
    earth: paint('earth', '#bba280', 'earth.webp'),
    moss: paint('moss', '#809169', 'earth.webp'),
    sand: paint('sand', '#c1bda2', 'earth.webp'),
    wood: paint('wood', '#ad8156', 'oak-v4.webp'),
    bark: paint('bark', '#66513b', 'wood.webp'),
    canvas: paint('canvas', '#a89571', 'linen-v4.webp', 2),
    canvas2: paint('canvas-2', '#728170', 'linen-v4.webp', 2),
    canvas3: paint('canvas-3', '#77788d', 'linen-v4.webp', 2),
    cloth: paint('blanket', '#758491', 'wool-v4.webp', 2),
    paper: paint('paper', '#e8d8b2'), metal: paint('iron', '#4a5558'), brass: paint('brass', '#bf9554'),
    pottery: paint('pottery', '#997456'), ember: paint('ember', '#ffe1a1'), flame: paint('flame', '#ffa447'),
    halo: paint('interaction', '#ffe1a4'), crystal: paint('crystal', '#7997ad', 'limestone-v3.webp',1.4)
  };
  const plateauMaterial=paint('plateau-ground','#798594','limestone-v3.webp');
  campMaterialRelief(scene,plateauMaterial,'rock');
  M.sand.diffuseColor=Color3.FromHexString(profile==='coastal-refuge'?'#b1b29e':'#c8bfa6');
  [M.rock,M.rockDark,M.stone].forEach(m=>campMaterialRelief(scene,m,'rock'));
  [M.wood,M.bark].forEach(m=>campMaterialRelief(scene,m,'timber'));
  [M.canvas,M.canvas2,M.canvas3,M.cloth].forEach(m=>campMaterialRelief(scene,m,'cloth'));
  M.cloth.backFaceCulling=false;M.cloth.twoSidedLighting=true;
  M.ember.emissiveColor = Color3.FromHexString('#ffb947'); M.flame.emissiveColor = Color3.FromHexString('#ff782d');
  M.halo.emissiveColor = Color3.FromHexString('#dcb774'); M.crystal.emissiveColor=Color3.FromHexString('#397ea8').scale(.13);campMaterialRelief(scene,M.crystal,'rock');M.crystal.specularColor=Color3.FromHexString('#6d93aa');M.crystal.specularPower=48;
  const shade = softPoolMaterial(scene, 'camp:contact-shadow', '#142025', .43);
  shade.zOffset=-2;
  const groundPaint = profile==='forest'?[]:[paint('ground-gravel', '#a7a38b', 'earth.webp'), paint('ground-worn-stone', '#aaa99e', 'flagstone.webp'), paint('ground-damp', '#677568', 'earth.webp')];
  groundPaint.forEach(m => { m.transparencyMode = Material.MATERIAL_ALPHABLEND; m.backFaceCulling = false; m.alpha = .72; });
  const trailBlend = profile === 'forest' ? softPoolMaterial(scene, 'forest:trail-blend', '#c0a17b', .6) : undefined;
  const plants = ['#ececc8', '#afcbb2', '#879f90'].map((tint, i) => {
    const mat = paint('foliage-' + i, tint);
    if(typeof document!=='undefined')mat.diffuseTexture=new Texture('/art/camp-detail-v1/foliage-atlas.png',scene);
    if (mat.diffuseTexture) mat.diffuseTexture.hasAlpha = true;
    mat.useAlphaFromDiffuseTexture = true; mat.transparencyMode = Material.MATERIAL_ALPHATEST;
    mat.backFaceCulling = false; mat.twoSidedLighting = true; mat.alphaCutOff = .35; return mat;
  });
  let bucket: Mesh[] = [];
  const statics = bucket, tents: Array<{ cell: Cell; entry: Cell; shell: Mesh[]; interior: Mesh[]; light: PointLight }> = [];
  const interactive = new Map<string, Mesh[]>();
  const keep = (id: string, role: InteractionPartRole, mesh: Mesh, options?: { side?: number; contact?: Vector3; grip?: Vector3 }) => {
    const index = bucket.indexOf(mesh); if (index >= 0) bucket.splice(index, 1);
    const parts = interactive.get(id) ?? []; parts.push(mesh); interactive.set(id, parts);
    return registerInteractionPart(scene, id, role, mesh, options);
  };
  const trees: Array<{ node: TransformNode; meshes: Mesh[]; at: Vector3 }> = [], shells: Array<{ meshes: Mesh[]; normal: Vector3 }> = [];
  const flames: Mesh[] = [], lids = new Map<string, Mesh>(), rings: Mesh[] = [], auroras: Array<{ mesh: Mesh; base: Float32Array }> = [], clouds: Mesh[] = [];
  const ripples: Mesh[] = [], lights: Array<{ light: PointLight; intensity: number; kind: string }> = [];
  const hearths: Array<{ id: string; light: PointLight; coals: ReturnType<typeof createCampCoals>; fire: CampFire }> = [];
  let streamTexture:Texture|undefined;
  let streamFlow:Mesh|undefined,streamFlowPositions:Float32Array|undefined,lastFlow=-Infinity;
  let fauna: ForestFaunaController | null = null, disposed = false;
  const fx = createCampAtmosphere(scene, root, profile, width, depth);
  scene.onDisposeObservable.addOnce(() => { disposed = true; fauna?.dispose(); });
  if (profile === 'forest' && typeof document !== 'undefined') void import('./forest-fauna.js').then(({createForestFauna}) => createForestFauna(scene, root, {width,depth})).then(controller => { if (disposed) controller.dispose(); else fauna = controller; }).catch(error => console.warn('No se pudo preparar la fauna del bosque', error));
  function add(mesh: Mesh, at: Vector3, material: StandardMaterial) {
    mesh.position.copyFrom(at); mesh.material = material; mesh.parent = root; mesh.isPickable = false; mesh.checkCollisions = false;
    mesh.metadata = { content: 'VTT_AMBIENCE', decorativeOnly: true }; bucket.push(mesh); return mesh;
  }
  const detail=createCampDetailKit(scene,{wood:M.wood,darkWood:M.bark,metal:M.metal,brass:M.brass,pottery:M.pottery,linen:M.canvas,paper:M.paper},add);
  const assembly=(parts:Mesh[],name:string)=>{
    if(!parts.length)return [];
    if(parts.some(m=>m.isVerticesDataPresent('color')))for(const m of parts)if(!m.isVerticesDataPresent('color'))m.setVerticesData('color',new Float32Array(m.getTotalVertices()*4).fill(1));
    const mesh=Mesh.MergeMeshes(parts,true,true,undefined,false,true);if(!mesh)return [];
    mesh.name=name;mesh.parent=root;mesh.isPickable=false;mesh.checkCollisions=false;mesh.metadata={content:'VTT_AMBIENCE',decorativeOnly:true};return [mesh];
  };
  const box = (name: string, w: number, h: number, d: number, at: Vector3, mat = M.wood, yaw = 0) => { const mesh = add(MeshBuilder.CreateBox(name, {width:w,height:h,depth:d},scene),at,mat); mesh.rotation.y=yaw; worldSurfaceUV(mesh, 1.5); return mesh; };
  const cylinder = (name: string, w: number, h: number, at: Vector3, mat = M.bark, sides = 10, top = w * .83) => add(MeshBuilder.CreateCylinder(name,{diameterTop:top,diameterBottom:w,height:h,tessellation:sides},scene),at,mat);
  const rock = (name: string, at: Vector3, w: number, h: number, d: number, seed: number, mat = M.rock) => { const builder=Math.max(w,h,d)<.6?fracturedStone:organicStone;const mesh=add(builder(scene,name,w,h,d,seed),at,mat); mesh.rotation.y=rand(seed)*6.28;weatherRock(mesh,seed,profile==='coastal-refuge');return mesh; };
  const contact = (at: Vector3, rx: number, rz: number) => { const m=add(MeshBuilder.CreateDisc('camp:contact',{radius:1,tessellation:16},scene),at.add(new Vector3(0,.023,0)),shade); m.rotation.x=Math.PI/2;m.scaling.set(rx,rz,1);return m; };
  function card(name: string, at: Vector3, w: number, h: number, quadrant: number, yaw: number, tint = 0) {
    const mesh=add(MeshBuilder.CreatePlane(name,{width:w,height:h,sideOrientation:Mesh.DOUBLESIDE},scene),at,plants[tint % 3]!);
    const uv=mesh.getVerticesData('uv')!,u=(quadrant%2)*.5,v=quadrant<2?.5:0;
    for(let i=0;i<uv.length;i+=2){uv[i]=u+uv[i]!*.5;uv[i+1]=v+uv[i+1]!*.5;}mesh.setVerticesData('uv',uv);mesh.rotation.y=yaw;return mesh;
  }
  function shrub(at: Vector3, seed: number, size = 1, quadrant = seed % 2) {
    for(let side=0;side<2;side++)card('camp:flora:'+seed+':'+side,at.add(new Vector3(0,size*.43,0)),size*1.4,size,quadrant,seed*.7+side*Math.PI/2,seed);
  }
  // Surface wear stays flat, preserving the authoritative walking surface.
  function weatherFloor(mesh: Mesh) {
    const positions = mesh.getVerticesData('position'); if (!positions) return;
    const matrix = mesh.computeWorldMatrix(true), colors:number[]=[];
    for(let i=0;i<positions.length;i+=3){
      const p=Vector3.TransformCoordinates(Vector3.FromArray(positions,i),matrix);
      const variation=.83+.09*Math.sin(p.x*.24+p.z*.18)+.055*Math.cos(p.x*.57-p.z*.31);
      colors.push(variation,variation*(.975+.025*Math.sin(p.z*.27)),variation*.94,1);
    }
    mesh.setVerticesData('color',colors);mesh.useVertexColors=true;
  }
  function groundPatch(at: Vector3, seed: number, size: number, material: StandardMaterial) {
    const positions:number[]=[at.x,.014,at.z],uvs:number[]=[at.x/2.4,at.z/2.4],colors:number[]=[1,1,1,.7],indices:number[]=[],normals:number[]=[];
    const count=12;
    for(let ring=0;ring<2;ring++)for(let i=0;i<count;i++){
      const a=i/count*Math.PI*2,r=size*(ring===0?.6:1)*(1+.15*Math.sin(seed+i*2.7));
      const x=at.x+Math.cos(a)*r,z=at.z+Math.sin(a)*r*.72;
      positions.push(x,.014,z);uvs.push(x/2.4,z/2.4);colors.push(1,1,1,ring===0?.55:0);
    }
    for(let i=0;i<count;i++){const a=1+i,b=1+(i+1)%count,c=a+count,d=b+count;indices.push(0,a,b,a,c,b,b,c,d);}
    VertexData.ComputeNormals(positions,indices,normals);const mesh=new Mesh('camp:weathered-floor',scene),data=new VertexData();Object.assign(data,{positions,indices,normals,uvs,colors});data.applyToMesh(mesh);mesh.hasVertexAlpha=true;add(mesh,Vector3.Zero(),material);
  }
  function tree(at: Vector3, seed: number, moving: boolean, height = 6) {
    const previous=bucket;bucket=[];
    const slender=seed%4===1, trunk=slender?.36:.62;
    contact(at,1.6,1.2);cylinder('forest:trunk:'+seed,trunk,height*.7,at.add(new Vector3(0,height*.35,0)),slender?M.stone:M.bark,10,trunk*.57);
    for(let b=0;b<3;b++){const a=b*2.09+seed;detail.tube('forest-branch',[at.add(new Vector3(0,height*.45,0)),at.add(new Vector3(Math.cos(a)*.72,height*.58,Math.sin(a)*.72)),at.add(new Vector3(Math.cos(a)*1.55,height*.67,Math.sin(a)*1.55))],.075,M.bark);}
    for(let r=0;r<4;r++){const a=r*1.57+seed;detail.tube('forest-root',[at.add(new Vector3(Math.cos(a)*.16,.24,Math.sin(a)*.16)),at.add(new Vector3(Math.cos(a)*.58,.08,Math.sin(a)*.58)),at.add(new Vector3(Math.cos(a)*1.03,.024,Math.sin(a)*1.03))],.075,M.bark);}
    for(let l=0;l<4;l++)for(let b=0;b<3;b++){
      const a=b*2.09+l*.6+seed,r=(1-l*.12)*(slender?1.1:1.55);card('forest:leaf-cluster',at.add(new Vector3(Math.cos(a)*r,height*.48+l*.85,Math.sin(a)*r)),(slender?2.1:3.05)-l*.25,2.3-l*.17,0,a+Math.PI/2,seed+l);
    }
    if(moving){const treeMeshes=assembly(bucket,'forest:whole-tree:'+seed);bucket=previous;const node=new TransformNode('forest:tree-sway:'+trees.length,scene);node.parent=root;node.position.copyFrom(at);for(const m of treeMeshes){m.parent=node;m.position.subtractInPlace(at);}trees.push({node,meshes:treeMeshes,at});}
    else {previous.push(...bucket);bucket=previous;}
  }
  function island() {
    if(profile==='forest'){
      const ground=add(MeshBuilder.CreateGround('forest:continuous-ground',{width:170,height:170,subdivisions:18},scene),new Vector3(width/2,-.024,depth/2),M.moss);worldSurfaceUV(ground,6);return;
    }
    const count=64,positions:number[]=[width/2,-.025,depth/2],uvs:number[]=[width/12,depth/12],indices:number[]=[],normals:number[]=[],sidePositions:number[]=[],sideUvs:number[]=[],sideIndices:number[]=[];
    const low=profile==='cliff-observatory'?-16:-2.2;
    for(let i=0;i<=count;i++){
      const a=i/count*Math.PI*2,rad=1.08+.045*Math.sin(a*7)+.025*Math.sin(a*11);
      const x=width/2+Math.cos(a)*(width/2+.45)*rad,z=depth/2+Math.sin(a)*(depth/2+.45)*rad;
      positions.push(x,-.026,z);uvs.push(x/6,z/6);if(i>0)indices.push(0,i,i+1);
      const layers=8;
      for(let layer=0;layer<=layers;layer++){
        const t=layer/layers,bulge=t*.035+Math.sin(t*Math.PI)*(.018+.026*Math.sin(a*5+t*9));
        const ridge=(layer===0?0:Math.sin(a*13+layer*1.9)*.55+Math.cos(a*7-layer)*.38);
        sidePositions.push(x+(x-width/2)*bulge,layer===0?-.035:low*t+ridge,z+(z-depth/2)*bulge);
        sideUvs.push(i*.28,t*Math.abs(low)/2.8);
        if(i<count&&layer<layers){const k=i*(layers+1)+layer,next=k+layers+1;sideIndices.push(k,k+1,next,next,k+1,next+1);}
      }
    }
    VertexData.ComputeNormals(positions,indices,normals);const top=new Mesh('camp:organic-ground',scene),data=new VertexData();Object.assign(data,{positions,indices,normals,uvs});data.applyToMesh(top);
    const groundMaterial=profile==='cliff-observatory'?plateauMaterial:M.sand;
    groundMaterial.backFaceCulling=false;
    add(top,Vector3.Zero(),groundMaterial);weatherFloor(top);
    const skirt=new Mesh('camp:eroded-strata',scene),skirtData=new VertexData(),n:number[]=[];VertexData.ComputeNormals(sidePositions,sideIndices,n);Object.assign(skirtData,{positions:sidePositions,indices:sideIndices,normals:n,uvs:sideUvs});skirtData.applyToMesh(skirt);weatherRock(skirt,93,profile==='coastal-refuge');add(skirt,Vector3.Zero(),M.rockDark);
  }
  island();
  if(profile==='wreck-beach'||profile==='coastal-refuge'){
    // Continue the coast inland instead of presenting a circular island.
    // The rise is outside the playable grid; its near lip stays below the floor.
    const inland=add(MeshBuilder.CreateGround('coast:inland-continuation',{width:160,height:110,subdivisions:24},scene),new Vector3(width/2,-.15,-35),profile==='wreck-beach'?M.sand:M.rockDark);
    const positions=inland.getVerticesData('position')!;
    for(let i=0;i<positions.length;i+=3){
      const x=positions[i]!+width/2,z=positions[i+2]!-35,rise=Math.max(0,Math.min(1,(-z-3)/18));
      const relief=profile==='coastal-refuge'
        ? 9.5+Math.sin(x*.11+z*.09)*2.4+Math.cos(x*.23-z*.13)*1.15+Math.sin(x*.39+z*.21)*.45
        : 1.8+Math.sin(x*.11+z*.09)*.9+Math.cos(x*.23-z*.13)*.4;
      positions[i+1]=rise*relief;
    }
    inland.updateVerticesData('position',positions,false,false);
    const normals:number[]=[];VertexData.ComputeNormals(positions,inland.getIndices()!,normals);inland.updateVerticesData('normal',normals,false,false);worldSurfaceUV(inland,4.2);weatherRock(inland,118,profile==='coastal-refuge');
    // Sculpted backing outcrops sit beyond the playable rectangle. They break
    // the evenly spaced shelter ring and continue the land into the distance.
    for(let i=0;i<12;i++){
      const x=-12+i*(width+24)/11+Math.sin(i*2.2)*2.7,z=-4-(i%3)*5.2;
      const h=(profile==='coastal-refuge'?4.5:2.3)+rand(i+810)*3.2;
      const r=Math.max(0,Math.min(1,(-z-3)/18));
      const ground=profile==='coastal-refuge'?r*(9.5+Math.sin(x*.11+z*.09)*2.4+Math.cos(x*.23-z*.13)*1.15):r*1.8;
      rock('coast:backing-outcrop',new Vector3(x,ground+h*.28-.15,z),5.2+rand(i+814)*4.2,h,4.8+rand(i+818)*2.4,i+810,i%2?M.rock:M.rockDark);
      shrub(new Vector3(x+.8,ground+Math.max(0,h*.16),z+1.7),810+i,1.2+rand(i+828)*1.3,i%2);
    }
  }
  // Existing floor batches have meter-based UVs. No changes to terrain/collision data.
  for(const [id,tint,url] of [
    ['moss','#b6c3a0','/art/forest-hd2d-v1/moss.jpg'],['earth','#d0b891','/art/forest-hd2d-v1/path.jpg'],
    ['sand','#c8bfa6',asset+'earth.webp'],['basalt','#798594',asset+'limestone-v3.webp'],['cave-rock','#b1b29e',asset+'earth.webp'],
    ['water','#79adba','/art/forest-hd2d-v1/stream.jpg']
  ]){
    const material=scene.getMaterialByName('terrain-material:'+id) as StandardMaterial|null;
    if(material){material.diffuseColor=Color3.FromHexString(tint!);material.maxSimultaneousLights=6;material.specularColor=Color3.FromHexString(id==='water'?'#426b7b':'#111615');allMaterials.push(material);if(typeof document!=='undefined')material.diffuseTexture=new Texture(url!,scene);if(id==='moss'){M.moss.diffuseTexture=material.diffuseTexture;M.moss.diffuseColor.copyFrom(material.diffuseColor);}if(id==='water')campMaterialRelief(scene,material,'water');else if(id==='basalt')campMaterialRelief(scene,material,'rock');}
  }
  if(profile!=='forest')for(const mesh of scene.meshes)if(mesh.name.startsWith('terrain-batch:')&&mesh.material?.name!=='terrain-material:water')weatherFloor(mesh as Mesh);
  const obstacles=terrain.obstacles??[];
  for(let i=0;i<obstacles.length;i++){
    const obstacle=obstacles[i]!,at=cellAt(obstacle.cell),id=obstacle.obstacleId;
    if(id.includes('tree-'))tree(at,i,true,6.3+rand(i)*2.8);
    else if(id.includes('basalt-pillar')){contact(at,1.1,.9);const h=3.3+rand(i)*2.2;cylinder('cliff:basalt-pillar:'+i,1.17,h,at.add(new Vector3(0,h*.5,0)),M.rockDark,6,1.06);for(let layer=1;layer<5;layer++){const ridge=cylinder('cliff:basalt-bedding',1.22,.045,at.add(new Vector3(0,h*layer/5,0)),M.rock,6,1.16);ridge.rotation.y=.08*Math.sin(layer+i);}rock('cliff:pillar-foot',at.add(new Vector3(0,.22,0)),1.48,.48,1.4,i);}
    else if(id.includes('arcane-crystal')){
      contact(at,1,.8);rock('cliff:crystal-base',at.add(new Vector3(0,.21,0)),1.3,.5,1.3,i);
      for(let j=0;j<3;j++){const h=1.2+rand(i+j)*1.2,m=cylinder('cliff:crystal:'+i+':'+j,.38,h,at.add(new Vector3((j-1)*.38,h*.5+.2,0)),M.crystal,6,.02);m.rotation.z=(j-1)*.22;}
      const light=new PointLight('cliff:crystal-light:'+i,at.add(new Vector3(0,1.4,0)),scene);light.diffuse=Color3.FromHexString('#60b9d2');light.range=3.8;light.renderPriority=70;lights.push({light,intensity:.16,kind:'crystal'});
    }else if(id.includes('rock-')){contact(at,.9,.8);rock('camp:collision-rock:'+i,at.add(new Vector3(0,.54,0)),1.45,1.2,1.42,i);shrub(at.add(new Vector3(.45,0,.35)),i,.6,1);}
  }
  // Low dressing stays under the feet; tall elements sit on existing blocked cells.
  const tiles=terrain.surfaces[0]!.tiles.filter(tile=>tile.medium!=='water');
  for(let i=0;i<190;i++){
    const tile=tiles[Math.floor(rand(i+4)*tiles.length)]!,at=cellAt(tile.cell).add(new Vector3((rand(i+5)-.5)*1.2,0,(rand(i+6)-.5)*1.2));
    if(i%3===0)rock('camp:ground-pebble',at.add(new Vector3(0,.022,0)),.09+rand(i)*.19,.035,.1+rand(i+1)*.15,i,i%2?M.stone:M.rockDark);
    else if(profile==='forest'){const leaf=box('forest:leaf-litter',.08+rand(i)*.12,.008,.12,at.add(new Vector3(0,.018,0)),i%2?M.canvas:M.bark,i);leaf.rotation.z=.08;}
  }
  const center=new Vector3(width/2,0,depth/2);
  if(profile!=='forest')for(let i=0;i<76;i++){
    const tile=tiles[Math.floor(rand(i+701)*tiles.length)]!,at=cellAt(tile.cell);
    groundPatch(at.add(new Vector3((rand(i+705)-.5)*.6,0,(rand(i+706)-.5)*.6)),i,.7+rand(i+702)*1.25,groundPaint[i%3]!);
    if(i%2===0){
      const slab=add(MeshBuilder.CreateCylinder('camp:embedded-stone',{diameterTop:.42+rand(i)*.52,diameterBottom:.64+rand(i)*.5,height:.025,tessellation:7},scene),at.add(new Vector3(.32,.024,-.25)),i%3?M.rockDark:M.stone);
      slab.scaling.z=.65;slab.rotation.y=i*.71;worldSurfaceUV(slab,1.2);
    }
  }
  for(let sector=0;sector<8;sector++){
    const previous=bucket;bucket=[];
    const a=sector/8*Math.PI*2,normal=new Vector3(Math.cos(a),0,Math.sin(a));
    for(let j=0;j<5;j++){
      const b=a+(j-2)*.11+(rand(sector*19+j+9)-.5)*.075,rx=width/2+1.9+(j%2)+rand(sector*17+j+18)*1.6,rz=depth/2+1.7+rand(sector*13+j+26)*1.5;
      const at=center.add(new Vector3(Math.cos(b)*rx,0,Math.sin(b)*rz));
      if(profile==='forest'){tree(at,80+sector*5+j,false,7+rand(j+sector)*3);shrub(at,sector*7+j,1.4,1);}
      else{
        const rear=Math.sin(b)<.15;
        const h=profile==='coastal-refuge'?(rear?6+rand(j+sector)*3:1.2+rand(j)*.7):profile==='cliff-observatory'?(rear?3.4+rand(j+sector)*4:1.5+rand(j)*1.6):rear?3.5+rand(j+sector)*3.2:1.2+rand(j+sector)*1.3;
        const cragAt=at.add(new Vector3(0,h*.32-.5,0)),seed=j+sector*9;
        const crag=seed%3===0?add(fracturedStone(scene,'camp:perimeter-stratum',4.2+rand(seed)*2,h,3.2,seed),cragAt,M.rockDark):rock('camp:perimeter-crag',cragAt,3.5+rand(j)*2,h,3.2,seed,j%2?M.rock:M.rockDark);
        crag.rotation.z=(rand(seed+2)-.5)*.16;
        weatherRock(crag,seed,profile==='coastal-refuge');
        if(profile==='coastal-refuge'&&Math.sin(b)<.3){rock('cove:ledge-strata',at.add(new Vector3(.7,.55,-.7)),4.8,.7,2.8,seed+30,M.rockDark);card('cove:cliff-vine',at.add(new Vector3(.6,2.1,.6)),1.8,2.6,2,seed*.4,seed);}
        if(profile==='cliff-observatory'&&j%3===0)for(let column=0;column<3;column++){
          const ch=h*(.65+rand(seed+column)*.7),ca=at.add(new Vector3((column-1)*.83,ch*.45-.15,(column%2)*.45));
          const col=cylinder('cliff:outer-basalt-cluster',1.03,ch,ca,M.rockDark,6,.94);col.rotation.z=(rand(seed+column+3)-.5)*.11;
          for(let band=1;band<4;band++)cylinder('cliff:column-joint',1.06,.035,ca.add(new Vector3(0,ch*(band/4-.5),0)),M.rock,6,1.02);
        }
        shrub(at.add(new Vector3(.6,0,-.4)),sector*7+j,1.25+rand(seed+4)*.95,profile==='coastal-refuge'?j%2:3);
      }
    }
    const merged=mergeDecoration(scene,root,bucket,'camp:edge-sector-'+sector);bucket=previous;
    if(profile==='coastal-refuge'||profile==='cliff-observatory'||profile==='forest')shells.push({meshes:merged,normal});
  }
  // Forest floor planting, stream banks and ferns; no solid meshes in clear aisles.
  for(let i=0;i<95;i++){
    const a=i*.643+(profile==='forest'?0:(rand(i+307)-.5)*.2),r=profile==='forest'?1.02+(i%3)*.025:1.02+rand(i+308)*.2,at=center.add(new Vector3(Math.cos(a)*width*.46*r,0,Math.sin(a)*depth*.45*r));
    if(profile!=='forest'&&rand(i+309)<.3)continue;
    shrub(at,i+300,profile==='forest'?.65+rand(i)*.75:1.1+rand(i)*1.2,profile==='forest'?i%2:i%3===0?3:i%2);
  }
  if(profile==='forest'){
    const pathMaterial=paint('eroded-path','#c5b28e');pathMaterial.diffuseTexture=scene.getMaterialByName('terrain-material:earth')?.getActiveTextures()[0]??null;
    pathMaterial.transparencyMode=Material.MATERIAL_ALPHABLEND;pathMaterial.backFaceCulling=false;
    const path=wornCampTrail(scene,terrain.surfaces[0]!.tiles.filter(t=>t.materialId==='earth').map(t=>t.cell),pathMaterial);add(path,Vector3.Zero(),pathMaterial);
    for(const mesh of scene.meshes)if(mesh.name.startsWith('terrain-batch:')&&mesh.material?.name==='terrain-material:earth')mesh.isVisible=false;
    const streamMaterial=paint('flowing-stream','#91b7b6');streamMaterial.diffuseTexture=new Texture('/art/forest-hd2d-v1/stream.jpg',scene);streamTexture=streamMaterial.diffuseTexture as Texture;streamMaterial.transparencyMode=Material.MATERIAL_ALPHABLEND;streamMaterial.backFaceCulling=false;streamMaterial.specularColor=Color3.FromHexString('#608d96');campMaterialRelief(scene,streamMaterial,'water');
    const streamPositions:number[]=[],streamUV:number[]=[],streamColors:number[]=[],streamIndices:number[]=[],streamNormals:number[]=[];
    const streamRows=160,streamCols=6;
    for(let r=0;r<=streamRows;r++)for(let c=0;c<=streamCols;c++){
      const z=-80+r/streamRows*200,t=c/streamCols;
      const centerX=forestStreamX(z);
      const half=1.24+Math.sin(z*.8)*.16,x=centerX+(t-.5)*half*2;
      streamPositions.push(x,.017,z);streamUV.push(x/2.4,z/4.8);const edge=Math.sin(t*Math.PI)*Math.min(1,r/2,(streamRows-r)/2);streamColors.push(.76,.87,.87,edge);
      if(r<streamRows&&c<streamCols){const k=r*(streamCols+1)+c;streamIndices.push(k,k+1,k+streamCols+1,k+1,k+streamCols+2,k+streamCols+1);}
    }
    VertexData.ComputeNormals(streamPositions,streamIndices,streamNormals);const stream=new Mesh('forest:organic-stream',scene),streamData=new VertexData();Object.assign(streamData,{positions:streamPositions,indices:streamIndices,uvs:streamUV,colors:streamColors,normals:streamNormals});streamData.applyToMesh(stream);stream.hasVertexAlpha=true;add(stream,Vector3.Zero(),streamMaterial);bucket.pop();
    for(const mesh of scene.meshes)if(mesh.name.startsWith('terrain-batch:')&&mesh.material?.name==='terrain-material:water')mesh.isVisible=false;
    for(const tile of terrain.surfaces[0]!.tiles.filter(t=>t.materialId==='earth')){
      for(const [x,z] of [[-1,0],[1,0],[0,-1],[0,1]]){
        const neighbor=terrain.surfaces[0]!.tiles.find(t=>t.cell.col===tile.cell.col+x!&&t.cell.row===tile.cell.row+z!);
        if(neighbor?.materialId!=='moss')continue;
        const patch=add(MeshBuilder.CreateGround('forest:worn-trail-edge',{width:2.1,height:1.8},scene),cellAt(tile.cell).add(new Vector3(x!*.73,.011,z!*.73)),trailBlend!);
        patch.rotation.y=tile.cell.row*.37+tile.cell.col*.61;
      }
    }
    for(const tile of terrain.surfaces[0]!.tiles.filter(t=>t.medium==='water'&&t.cell.col===forestStreamColumn(t.cell.row))){
      const at=cellAt(tile.cell);at.x=forestStreamX(at.z);for(const side of [-1,1]){rock('forest:river-stone',at.add(new Vector3(side*1.22,.04,0)),.24,.12,.32,tile.cell.row+side,M.stone);shrub(at.add(new Vector3(side*1.53,0,.35)),tile.cell.row+30,.55,1);}
      if(tile.cell.row%2===0){const ripple=add(MeshBuilder.CreateTorus('forest:stream-ripple',{diameter:.58,thickness:.014,tessellation:12},scene),at.add(new Vector3(0,.025,0)),M.paper);ripples.push(ripple);bucket.pop();}
    }
    const flowMaterial=paint('stream-glints','#c7e3de');flowMaterial.disableLighting=true;flowMaterial.emissiveColor=Color3.FromHexString('#779d9c');flowMaterial.transparencyMode=Material.MATERIAL_ALPHABLEND;flowMaterial.backFaceCulling=false;
    const flowData=new VertexData();flowData.positions=new Float32Array(24*6*3);flowData.normals=Array.from({length:24*6},()=>[0,1,0]).flat();flowData.colors=Array.from({length:24*6},(_,i)=>[1,1,1,i%6===2||i%6===3?.34:0]).flat();flowData.indices=[];
    for(let i=0;i<24;i++){const k=i*6;flowData.indices.push(k,k+1,k+2,k+1,k+3,k+2,k+2,k+3,k+4,k+3,k+5,k+4);}
    streamFlow=new Mesh('forest:flow-glints',scene);flowData.applyToMesh(streamFlow,true);streamFlow.hasVertexAlpha=true;streamFlow.alwaysSelectAsActiveMesh=true;add(streamFlow,Vector3.Zero(),flowMaterial);bucket.pop();streamFlowPositions=new Float32Array(flowData.positions);
    // Fallen wood, mushrooms and fern pockets stay at the blocked trunks/outer banks.
    for(let i=0;i<11;i++){
      const at=cellAt({col:i%2?25:-2,row:3+i*1.55});
      const log=cylinder('forest:mossy-fallen-trunk',.48,2.7,at.add(new Vector3(0,.25,0)),M.bark,10,.37);log.rotation.z=Math.PI/2;log.rotation.y=i*.47;
      shrub(at.add(new Vector3(-.7,0,.45)),430+i,.85,1);
      for(let m=0;m<3;m++){const p=at.add(new Vector3(.65+m*.17,.08,.18+Math.sin(m+i)*.16));cylinder('forest:mushroom-stem',.035,.13,p,M.paper,7);const cap=add(MeshBuilder.CreateSphere('forest:mushroom-cap',{diameter:.19,segments:6},scene),p.add(new Vector3(0,.085,0)),i%2?M.pottery:M.canvas);cap.scaling.y=.35;}
    }
    // Several depths of background woods remove the bare, endlessly tiled surround.
    // All additional trunks remain outside the complete tactical rectangle.
    for(let side=0;side<4;side++){
      const previous=bucket;bucket=[];
      for(let i=side;i<42;i+=4){const offset=5+rand(i+981)*13,along=rand(i+982),p=side===0?new Vector3(-offset,0,along*depth):side===1?new Vector3(width+offset,0,along*depth):side===2?new Vector3(along*width,0,-offset):new Vector3(along*width,0,depth+offset);
        tree(p,620+i,false,7.2+rand(i+985)*4.5);shrub(p.add(new Vector3(.8,0,.9)),820+i,1.1,1);}
      const meshes=mergeDecoration(scene,root,bucket,'forest:background-'+side);bucket=previous;
      shells.push({meshes,normal:new Vector3(side===0?-1:side===1?1:0,0,side===2?-1:side===3?1:0)});
    }
  }
  const skirtMaterial=paint('tent-earth-blend',profile==='forest'?'#617454':profile==='cliff-observatory'?'#87909a':'#b4ad91',profile==='forest'?'earth.webp':'earth.webp');
  if(profile==='forest')skirtMaterial.diffuseTexture=M.moss.diffuseTexture;
  skirtMaterial.transparencyMode=Material.MATERIAL_ALPHABLEND;skirtMaterial.backFaceCulling=false;
  function tentCollar(at:Vector3){
    const positions:number[]=[],uvs:number[]=[],colors:number[]=[],indices:number[]=[],normals:number[]=[],n=32;
    for(let ring=0;ring<2;ring++)for(let i=0;i<n;i++){const a=i/n*Math.PI*2,c=Math.cos(a),d=Math.sin(a),r=(ring?3.95:3.02)/(Math.max(Math.abs(c),Math.abs(d))+.03),x=at.x+c*r,z=at.z+d*r;
      positions.push(x,.016,z);uvs.push(x/2.4,z/2.4);colors.push(1,1,1,ring?0:.75);if(ring===0){const j=(i+1)%n;indices.push(i,n+i,j,j,n+i,n+j);}}
    VertexData.ComputeNormals(positions,indices,normals);const m=new Mesh('camp:tent-ground-collar',scene),v=new VertexData();Object.assign(v,{positions,indices,normals,uvs,colors});v.applyToMesh(m);m.hasVertexAlpha=true;add(m,Vector3.Zero(),skirtMaterial);
  }
  function tent(point: NonNullable<PublicSceneDefinition['camp']>['interactionPoints'][number]) {
    const at=cellAt(point.objectCell!),mat=point.ownerCharacterId==='mia'?M.canvas2:point.ownerCharacterId==='maria'?M.canvas3:M.canvas;
    const bedPoint=definition.camp!.interactionPoints.find(p=>p.kind==='bed'&&p.ownerCharacterId===point.ownerCharacterId)??point;
    const previous=bucket;bucket=[];
    bucket=previous;contact(at,3.65,3.58);tentCollar(at);bucket=[];
    box(point.id+':groundsheet',5.95,.025,5.9,at.add(new Vector3(0,.032,0)),M.cloth);
    box(point.id+':woven-carpet',4.5,.02,4.6,at.add(new Vector3(0,.075,0)),mat);
    for(let stripe=0;stripe<7;stripe++)box(point.id+':rug-woven-stripe',4.35,.006,.025,at.add(new Vector3(0,.088,-1.95+stripe*.65)),M.cloth);
    detail.basket(at.add(new Vector3(1.65,.09,-2.2)),.48);
    detail.bottle(at.add(new Vector3(1.96,.12,-2.1)),.32);
    detail.coil(at.add(new Vector3(-1.9,.1,-2.25)),.22);
    // Rolled spare linen fits against the rear, leaving the central entrance aisle open.
    for(let i=0;i<2;i++){const spare=cylinder(point.id+':spare-linen',.23,.7,at.add(new Vector3(-1.35+i*.28,.23,-2.6)),M.canvas,10);spare.rotation.x=Math.PI/2;}
    for(const x of [-.53,.53])box(point.id+':bedroll-seam',.06,.04,2.1,at.add(new Vector3(x,.18,-1.2)),M.canvas);
    box(point.id+':bedroll-underlay',1.1,.13,2.1,at.add(new Vector3(0,.13,-1.3)),M.cloth);
    keep(bedPoint.id,'blanket',add(campClothSurface(scene,point.id+':bedroll',1.1,2.1,.075),at.add(new Vector3(0,.21,-1.3)),M.cloth));
    const rolled=cylinder(point.id+':rolled-blanket',.4,1.03,at.add(new Vector3(0,.29,-2.16)),mat,12);rolled.rotation.z=Math.PI/2;keep(bedPoint.id,'case-lid',rolled);
    const pillow=add(MeshBuilder.CreateSphere(point.id+':pillow',{diameter:1,segments:8},scene),at.add(new Vector3(0,.3,-.48)),M.canvas);pillow.scaling.set(.75,.18,.45);keep(bedPoint.id,'pillow',pillow);
    const interior=[...assembly(bucket,point.id+':interior'),...(interactive.get(bedPoint.id)??[])];bucket=[];
    for(const side of [-1,1]){
      const positions:number[]=[],uvs:number[]=[],indices:number[]=[],normals:number[]=[],colors:number[]=[],segments=7;
      for(let z=0;z<=segments;z++)for(let x=0;x<=segments;x++){
        const t=x/segments,u=z/segments,wx=side*t*3.38,wz=-3.28+u*6.62,wy=2.8-t*2.5-.2*Math.sin(t*Math.PI)*Math.sin(u*Math.PI)+Math.sin(u*31+t*9)*.04*Math.sin(t*Math.PI);
        positions.push(at.x+wx,wy,at.z+wz);uvs.push(t*3,u*5);
        const fabric=.82+.13*Math.sin(t*Math.PI)+.035*Math.cos(u*19);
        colors.push(fabric,fabric*.98,fabric*.95,1);
        if(x<segments&&z<segments){const k=z*(segments+1)+x;indices.push(k,k+1,k+segments+1,k+1,k+segments+2,k+segments+1);}
      }
      if(side<0)for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2]!,indices[i+1]!];
      VertexData.ComputeNormals(positions,indices,normals);const mesh=new Mesh(point.id+':canvas-roof:'+side,scene),data=new VertexData();Object.assign(data,{positions,indices,normals,uvs,colors});data.applyToMesh(mesh);add(mesh,Vector3.Zero(),mat);
      for(const u of [.2,.5,.8]){
        const path=Array.from({length:8},(_,i)=>{const t=i/7;return at.add(new Vector3(side*t*3.38,2.818-t*2.5-.15*Math.sin(t*Math.PI)*Math.sin(u*Math.PI),-3.28+u*6.62));});
        const seam=add(MeshBuilder.CreateTube(point.id+':stitched-canvas',{path,radius:.018,tessellation:4},scene),Vector3.Zero(),mat);
        seam.setVerticesData('color',Array.from({length:seam.getTotalVertices()},()=>[.55,.5,.43,1]).flat());
      }
    }
    const panel=(name:string,p:number[][])=>{const mesh=new Mesh(name,scene),d=new VertexData();d.positions=p.flatMap(v=>[v[0]!+at.x,v[1]!,v[2]!+at.z]);d.indices=[0,1,2];d.uvs=[0,0,1,0,.5,1];d.normals=[];VertexData.ComputeNormals(d.positions,d.indices,d.normals);d.applyToMesh(mesh);return add(mesh,Vector3.Zero(),mat);};
    panel(point.id+':rear',[[-3.3,.12,-3.27],[3.3,.12,-3.27],[0,2.78,-3.27]]);
    // Guy ropes and small repaired panels are part of this tent's cutaway shell.
    for(const side of [-1,1])for(const end of [-1,1]){
      detail.tube('tent-guy-rope',[at.add(new Vector3(side*1.85,1.42,end*3.28)),at.add(new Vector3(side*3.36,.13,end*3.33))],.019,M.canvas);
      detail.round('tent-peg-head',at.add(new Vector3(side*3.35,.12,end*3.32)),.13,.08,M.bark);
    }
    const repair=box(point.id+':canvas-repair',.6,.012,.75,at.add(new Vector3(1.3,1.83,-1.45)),mat===M.canvas3?M.canvas2:M.canvas3);repair.rotation.z=-Math.atan(2.5/3.38);
    for(const side of [-1,1])keep(point.id,'flap',panel(point.id+':entry-flap',[[side*3.3,.12,3.34],[side*.79,.12,3.34],[0,2.78,3.34]]),{side,contact:at.add(new Vector3(side*.65,.87,3.43))});
    for(const side of [-1,1]){
      const rolled=cylinder(point.id+':rolled-door-edge',.12,2.18,at.add(new Vector3(side*.58,1.06,3.37)),mat,8);rolled.rotation.z=side*.39;
      keep(point.id,'tie',box(point.id+':door-tie',.21,.055,.08,at.add(new Vector3(side*.65,.87,3.43)),mat),{side});
    }
    mat.backFaceCulling=false;mat.twoSidedLighting=true;
    const pole=cylinder(point.id+':ridge-pole',.09,6.65,at.add(new Vector3(0,2.79,.03)),M.wood,8);pole.rotation.x=Math.PI/2;
    for(const end of [-1,1]){cylinder(point.id+':support',.095,2.7,at.add(new Vector3(0,1.35,end*3.25)),M.wood,8);for(const side of [-1,1])cylinder(point.id+':peg',.1,.22,at.add(new Vector3(side*3.38,.11,end*3.35)),M.wood,6);}
    const shell=[...assembly(bucket,point.id+':shell'),...(interactive.get(point.id)??[])];bucket=[];
    const lampAt=at.add(new Vector3(.72,.24,-2.65));cylinder(point.id+':lantern-foot',.3,.08,lampAt,M.brass);
    const lantern=box(point.id+':lantern',.19,.3,.19,lampAt.add(new Vector3(0,.21,0)),M.ember);flames.push(lantern);bucket.pop();
    lantern.metadata={...lantern.metadata,fireSource:'lamp'};
    interior.push(...assembly(bucket,point.id+':lamp-base'),lantern);bucket=previous;
    const facing=Math.sign(point.cell.row-point.objectCell!.row)||1;
    const tentNode=new TransformNode(point.id+':structure',scene);tentNode.parent=root;tentNode.position.copyFrom(at);tentNode.rotation.y=facing<0?Math.PI:0;
    for(const mesh of [...shell,...interior]){mesh.parent=tentNode;mesh.position.subtractInPlace(at);}
    for(const id of [point.id,bedPoint.id])for(const part of interactionParts(scene,id)){
      part.position.copyFrom(part.mesh.position);
      for(const contact of [part.contact,part.grip])if(contact&&facing<0){contact.x=2*at.x-contact.x;contact.z=2*at.z-contact.z;}
    }
    if(facing<0){lampAt.x=2*at.x-lampAt.x;lampAt.z=2*at.z-lampAt.z;}
    const light=new PointLight(point.id+':lantern-light',lampAt.add(new Vector3(0,.45,0)),scene);light.diffuse=Color3.FromHexString('#ffda9c');light.range=7.5;light.renderPriority=85;light.includedOnlyMeshes=[...interior,...shell];
    tents.push({cell:point.objectCell!,entry:point.cell,shell,interior,light});
  }
  function chest(point: NonNullable<PublicSceneDefinition['camp']>['interactionPoints'][number]) {
    const at=cellAt(point.objectCell!),id=point.id;contact(at,.68,.49);box(id+':body',1.0,.5,.7,at.add(new Vector3(0,.3,0)),M.wood);
    for(const x of [-.33,.33]){box(id+':iron-band',.055,.51,.715,at.add(new Vector3(x,.31,0)),M.metal);box(id+':foot',.14,.12,.14,at.add(new Vector3(x,.08,.23)),M.bark);}
    detail.timberTrim(at,1,.7,.54);
    for(const x of [-.33,.33])for(const y of [.21,.43])detail.round('chest-rivet',at.add(new Vector3(x,y,.367)),.025,.02,M.brass).rotation.x=Math.PI/2;
    detail.ring('chest-handle',at.add(new Vector3(.51,.34,0)),.15,.025,M.metal).rotation.z=Math.PI/2;
    const lid=MeshBuilder.CreateBox(id+':lid',{width:1.05,height:.15,depth:.73},scene),p=lid.getVerticesData('position')!;
    for(let i=0;i<p.length;i+=3)p[i+2]=p[i+2]!+.365;lid.setVerticesData('position',p);lid.position.copyFrom(at.add(new Vector3(0,.62,-.365)));lid.material=M.wood;lid.parent=root;lid.isPickable=false;lids.set(id,lid);
    keep(id,'chest-lid',lid,{contact:at.add(new Vector3(0,.65,.38))});
    keep(id,'case-lid',box(id+':clasp',.11,.19,.055,at.add(new Vector3(0,.5,.38)),M.brass));
  }
  function personal(point: NonNullable<PublicSceneDefinition['camp']>['interactionPoints'][number]) {
    const at=cellAt(point.objectCell!),id=point.id;contact(at,.66,.5);
    if(point.ownerCharacterId==='mike'){
      box(id+':table',1.12,.09,.72,at.add(new Vector3(0,.74,0)));
      for(const x of [-.4,.4])for(const z of [-.22,.22])box(id+':leg',.08,.7,.08,at.add(new Vector3(x,.36,z)),M.bark);
      const grip=at.add(new Vector3(-.08,.83,0));
      keep(id,'book',box(id+':spellbook',.62,.09,.48,grip,M.canvas3,.12),{grip});
      for(const side of [-1,1])keep(id,'page',box(id+':pages:'+side,.27,.015,.41,at.add(new Vector3(-.08+side*.135,.883,0)),M.paper,.12),{side,grip});
      cylinder(id+':ink',.13,.13,at.add(new Vector3(.4,.86,.18)),M.metal,8);box(id+':scroll',.48,.035,.13,at.add(new Vector3(.18,.81,-.25)),M.paper,.3);
      detail.timberTrim(at,1.12,.72,.805);detail.bottle(at.add(new Vector3(.43,.8,-.22)),.14,M.brass);
      detail.tube('quill',[at.add(new Vector3(.33,.92,.12)),at.add(new Vector3(.48,1.09,.12))],.008,M.paper);
    }else if(point.ownerCharacterId==='mia'){
      rock(id+':prayer-stone',at.add(new Vector3(0,.23,0)),1,.46,.8,42,M.stone);
      const grip=at.add(new Vector3(0,.65,0));
      keep(id,'symbol',box(id+':holy-symbol',.09,.45,.08,grip,M.brass),{grip});keep(id,'symbol',box(id+':holy-symbol-arm',.32,.09,.08,at.add(new Vector3(0,.74,0)),M.brass),{grip});
      for(const side of [-1,1]){cylinder(id+':candle',.1,.23,at.add(new Vector3(side*.3,.56,.12)),M.canvas);const flame=cylinder(id+':candle-flame',.08,.14,at.add(new Vector3(side*.3,.75,.12)),M.ember,7,.01);flame.metadata={fireSource:'candle'};flames.push(flame);keep(id,'flame',flame);}
      detail.bowl(at.add(new Vector3(0,.48,.22)),.12,M.brass);detail.bottle(at.add(new Vector3(.38,.46,-.23)),.2);
    }else{
      keep(id,'case-lid',box(id+':tool-wrap',1.08,.055,.69,at.add(new Vector3(0,.12,0)),M.canvas3));
      for(let i=0;i<5;i++){const grip=at.add(new Vector3(-.4+i*.18,.17,0));keep(id,'tool',box(id+':lockpick',.025,.025,.4,grip,M.metal,(i-2)*.04),{side:i-2,...(i===2?{grip}:{})});}
      box(id+':whetstone',.24,.07,.16,at.add(new Vector3(.3,.2,-.22)),M.stone);
      cylinder(id+':supplies',.38,.47,at.add(new Vector3(-.2,.3,-.14)),M.pottery,9);
      detail.coil(at.add(new Vector3(.4,.15,.16)),.11);detail.bottle(at.add(new Vector3(-.48,.15,-.2)),.16,M.brass);
    }
  }
  function fire(point: NonNullable<PublicSceneDefinition['camp']>['interactionPoints'][number]) {
    const at=cellAt(point.objectCell!),id=point.id;contact(at,1.3,1.2);
    cylinder(id+':ash',2.1,.045,at.add(new Vector3(0,.04,0)),M.rockDark,20);
    for(let i=0;i<15;i++){const a=i/15*Math.PI*2;rock(id+':ring',at.add(new Vector3(Math.cos(a)*1.04,.14,Math.sin(a)*1.04)),.36,.3,.35,i,i%3?M.rock:M.stone);}
    for(let i=0;i<5;i++)keep(id,'log',box(id+':firewood',1.1,.17,.18,at.add(new Vector3(0,.2+i*.025,0)),M.bark,i*.66),{side:i%2?-1:1});
    for(let i=0;i<5;i++){const h=.54+rand(i)*.72,f=cylinder(id+':flame-'+i,.23,h,at.add(new Vector3((rand(i+1)-.5)*.45,h/2+.3,(rand(i+2)-.5)*.45)),i%2?M.ember:M.flame,8,.015);flames.push(f);keep(id,'flame',f);}
    const pot=cylinder(id+':cooking-pot',.48,.33,at.add(new Vector3(.38,.44,.12)),M.metal,12,.54);
    // Recessed contents and a real spoon, registered at this pot's offset.
    keep(id,'pot',pot,{contact:at.add(new Vector3(.38,.61,.12))});
    keep(id,'liquid',cylinder(id+':soup',.43,.018,at.add(new Vector3(.38,.6,.12)),M.pottery,16,.43));
    const spoon=cylinder(id+':spoon',.025,.48,at.add(new Vector3(.48,.76,.12)),M.wood,6);spoon.rotation.z=.35;keep(id,'utensil',spoon,{contact:at.add(new Vector3(.38,.65,.12))});
    cylinder(id+':water-kettle',.28,.38,at.add(new Vector3(-.63,.3,.12)),M.pottery,10);
    box(id+':ration-bundle',.3,.13,.3,at.add(new Vector3(.54,.1,-.52)),M.canvas);
    for(let i=0;i<4;i++){const log=cylinder(id+':spare-wood',.14,.72,at.add(new Vector3(-.69,.11+Math.floor(i/2)*.13,-.4+(i%2)*.16)),M.bark,7);log.rotation.z=Math.PI/2;if(i===3)keep(id,'fuel-log',log,{contact:at.add(new Vector3(-.3,.32,0))});}
    const cup=cylinder(id+':traveller-cup',.12,.13,at.add(new Vector3(.71,.1,.4)),M.brass,10);
    detail.bowl(at.add(new Vector3(-.78,.07,.52)),.16);
    detail.bowl(at.add(new Vector3(-.51,.07,.8)),.12);
    detail.basket(at.add(new Vector3(.75,.04,-.63)),.38);
    for(const side of [-1,1]){const fork=at.add(new Vector3(side*.65,.65,0));detail.tube('cooking-fork',[fork.add(new Vector3(0,-.5,0)),fork,fork.add(new Vector3(.12,.12,0))],.024,M.metal);}
    cup.metadata={content:'VTT_AMBIENCE',decorativeOnly:true};
    const light=new PointLight(id+':light',at.add(new Vector3(0,1.3,0)),scene);light.diffuse=Color3.FromHexString('#ffd09a');light.renderPriority=80;light.range=15;lights.push({light,intensity:2.1,kind:'fire'});fx.fire(id,at);
    hearths.push({id,light,fire:new CampFire(id),coals:createCampCoals(scene,root,at,.73)});
    pot.metadata={content:'VTT_AMBIENCE',decorativeOnly:true};
  }
  for(const point of definition.camp!.interactionPoints){
    const at=cellAt(point.objectCell??point.cell);
    if(point.kind==='tent')tent(point);
    else if(point.kind==='chest'||point.kind==='personal'){
      const saved=bucket;bucket=[];if(point.kind==='chest')chest(point);else personal(point);
      const pieces=[...assembly(bucket,point.id+':furniture'),...(interactive.get(point.id)??[])];bucket=saved;
      const ownerTent=tents.find(t=>point.objectCell&&Math.abs(t.cell.col-point.objectCell.col)<=1&&Math.abs(t.cell.row-point.objectCell.row)<=1);
      if(ownerTent){ownerTent.interior.push(...pieces);ownerTent.light.includedOnlyMeshes.push(...pieces);}
    }else if(point.kind==='fire')fire(point);
    else if(point.kind==='seat'){contact(at,1.1,.5);if(profile==='cliff-observatory'||profile==='coastal-refuge')rock(point.id+':seat',at.add(new Vector3(0,.31,0)),1.42,.58,.66,17,M.stone);else{box(point.id+':seat',1.75,.18,.56,at.add(new Vector3(0,.48,0)));for(const side of [-1,1])box(point.id+':foot',.18,.43,.38,at.add(new Vector3(side*.62,.23,0)),M.bark);}keep(point.id,'seat-cloth',box(point.id+':folded-cloak',.58,.065,.39,at.add(new Vector3(-.32,.59,0)),M.cloth,.16));cylinder(point.id+':water-flask',.17,.28,at.add(new Vector3(.48,.7,0)),M.pottery,10);}
    else if(point.kind==='guard'&&!point.id.includes('boat')){cylinder(point.id+':post',.18,1.95,at.add(new Vector3(.5,.98,0)),M.bark);const torch=cylinder(point.id+':torch',.18,.42,at.add(new Vector3(.5,2.08,0)),M.flame,7,.01);const light=new PointLight(point.id+':torch-light',at.add(new Vector3(.5,2.15,0)),scene);light.diffuse=Color3.FromHexString('#ffc078');light.range=5.5;light.renderPriority=80;lights.push({light,intensity:.72,kind:'torch'});torch.metadata={fireSource:'torch'};flames.push(torch);keep(point.id,'flame',torch);keep(point.id,'lantern',cylinder(point.id+':watch-lamp',.16,.23,at.add(new Vector3(.35,.2,.3)),M.brass,8));}
    else if(point.kind==='guard'){const rope=box(point.id+':mooring-rope',.55,.035,.035,at.add(new Vector3(1.7,.59,0)),M.canvas);keep(point.id,'rope',rope);}
    const ring=MeshBuilder.CreateTorus(point.id+':dm-interaction-halo',{diameter:1.08,thickness:.042,tessellation:20},scene);ring.parent=root;ring.position.copyFrom(at);ring.position.y=.065;ring.material=M.halo;ring.visibility=0;ring.isPickable=false;rings.push(ring);
  }
  if(profile==='wreck-beach'){
    const at=cellAt({col:3,row:6}),boat=new TransformNode('beach:stranded-rowboat',scene);boat.parent=root;boat.position.copyFrom(at);boat.rotation.y=-.38;
    const old=bucket;bucket=[];const ribs:Vector3[][]=[];
    for(let side=0;side<2;side++){const row:Vector3[]=[];for(let i=0;i<9;i++){const t=i/8,x=-1.9+t*3.8;row.push(new Vector3(x,.3+Math.abs(t-.5)*.36,(side?1:-1)*(.16+Math.sin(t*Math.PI)*.67)));}ribs.push(row);}
    const hull=MeshBuilder.CreateRibbon('beach:boat-hull',{pathArray:ribs,sideOrientation:Mesh.DOUBLESIDE},scene);add(hull,Vector3.Zero(),M.wood);
    for(let i=0;i<3;i++)box('beach:boat-thwart',.18,.13,1.16,new Vector3((i-1)*.88,.65,0));
    const pieces=mergeDecoration(scene,root,bucket,'beach:boat');for(const m of pieces)m.parent=boat;bucket=old;
    // Bleached ribs, gunwales and a real curved painter line belong to the stranded boat.
    bucket=[];
    for(const side of [0,1])detail.tube('boat-gunwale',ribs[side]!.map(p=>p.add(new Vector3(0,.1,0))),.055,M.bark);
    for(let i=1;i<8;i+=2){const p=ribs[0]![i]!,q=ribs[1]![i]!;detail.tube('boat-rib',[p,new Vector3(p.x,.15,0),q],.035,M.bark);}
    detail.tube('boat-oar',[new Vector3(-1.3,.71,-.45),new Vector3(1.65,.65,-.42)],.03,M.wood);
    box('beach:oar-blade',.42,.045,.2,new Vector3(1.58,.65,-.42),M.wood);
    const boatDetails=mergeDecoration(scene,root,bucket,'beach:boat-detail');boatDetails.forEach(m=>m.parent=boat);bucket=old;
    detail.coil(at.add(new Vector3(1.65,.075,.57)),.34);
    for(let i=0;i<10;i++){const col=i<5?2:22,row=4+(i%5)*2;box('beach:drift-plank',1.5+rand(i),.1,.18,cellAt({col,row}).add(new Vector3(0,.09,0)),M.bark,i*.75);}
    // Wreckage sits beyond the grid on the high-tide line, separate from C1–C9.
    for(let i=0;i<6;i++){
      const p=new Vector3(-2+i*8.1,.05,depth+1.5+Math.sin(i)*.7);
      detail.tube('storm-wrack',[p,p.add(new Vector3(.45,.04,.2)),p.add(new Vector3(1.7,.09,-.2)),p.add(new Vector3(2.4,.16,.18))],.08,M.bark);
      detail.coil(p.add(new Vector3(.4,.04,.5)),.26);
    }
  }
  if(profile==='cliff-observatory'){
    for(let i=0;i<3;i++){
      const rows=6,columns=48,paths:Vector3[][]=[];
      for(let r=0;r<rows;r++){
        const row:Vector3[]=[],t=r/(rows-1);
        for(let s=0;s<=columns;s++){
          const x=-14+s*(width+28)/columns,fold=Math.sin(s*.37+i)*1.2+Math.sin(s*.81-i)*.3;
          row.push(new Vector3(x,7.3+i*.65+t*(2.8+Math.sin(s*.31+i)*1.1)+Math.sin(s*.22+i)*.6,-7-i*3+fold+t*.45));
        }paths.push(row);
      }
      const mesh=MeshBuilder.CreateRibbon('cliff:aurora:'+i,{pathArray:paths,sideOrientation:Mesh.DOUBLESIDE,updatable:true},scene),mat=paint('aurora-'+i,i===1?'#8276aa':'#53988f');
      mat.disableLighting=true;mat.emissiveColor=mat.diffuseColor.scale(.9);mat.alpha=.3;mat.transparencyMode=Material.MATERIAL_ALPHABLEND;mat.backFaceCulling=false;
      mesh.material=mat;mesh.parent=root;mesh.isPickable=false;mesh.hasVertexAlpha=true;
      const positions=mesh.getVerticesData('position')!,colors:number[]=[];
      for(let n=0;n<positions.length;n+=3){const r=Math.floor(n/3/(columns+1))%rows,t=r/(rows-1),x=positions[n]!;colors.push(.8+.12*Math.sin(x*.37+i),.9,1,Math.pow(Math.sin(t*Math.PI),1.2)*(.65+.25*Math.sin(x*.6)));}
      mesh.setVerticesData('color',colors);auroras.push({mesh,base:new Float32Array(positions)});
    }
    const cloudMat=softPoolMaterial(scene,'camp:fast-cloud','#8fa0b4',.12);
    for(let i=0;i<5;i++){const m=MeshBuilder.CreatePlane('cliff:cloud:'+i,{width:18,height:3.2,sideOrientation:Mesh.DOUBLESIDE},scene);m.material=cloudMat;m.parent=root;m.position.set(i*13-5,8.7+i*.35,-11-i*1.8);m.isPickable=false;clouds.push(m);}
  }
  if(profile==='coastal-refuge'){
    for(let i=0;i<6;i++){const x=4+i*6,at=new Vector3(x,4.6+Math.sin(i*1.8)*.65,-.4);rock('cove:carved-overhang',at,7.5,2.4,6,i,M.rockDark);fx.drip(at.add(new Vector3(0,-.8,3)));
      for(let v=0;v<3;v++)card('cove:overhang-ivy',at.add(new Vector3((v-1)*1.7,-.6,2.7)),1.3,1.6+rand(i+v)*.8,2,i*.43+v*.8,i+v);
      const mineral=add(fracturedStone(scene,'cove:mineral-ledge',5.8,.38,3.9,78+i),at.add(new Vector3(0,-.75,.5)),M.stone);weatherRock(mineral,78+i,true);
    }
    // Round the visible pools while retaining their existing shallow-water cells.
    for(const mesh of scene.meshes)if(mesh.name.startsWith('terrain-batch:')&&mesh.material?.name==='terrain-material:water')mesh.isVisible=false;
    const poolMaterial=scene.getMaterialByName('terrain-material:water') as StandardMaterial;
    poolMaterial.twoSidedLighting=true;poolMaterial.diffuseColor=Color3.FromHexString('#8cafaa');poolMaterial.specularPower=72;poolMaterial.specularColor=Color3.FromHexString('#588c8e');
    for(const tile of terrain.surfaces[0]!.tiles.filter(t=>t.medium==='water')){
      const at=cellAt(tile.cell);const ring=MeshBuilder.CreateTorus('cove:pool-ripple',{diameter:.55,thickness:.012,tessellation:18},scene);ring.position.copyFrom(at.add(new Vector3(0,.02,0)));ring.material=M.paper;ring.parent=root;ring.isPickable=false;ripples.push(ring);
      const pool=add(MeshBuilder.CreateDisc('cove:rounded-pool',{radius:.86,tessellation:24,sideOrientation:Mesh.DOUBLESIDE},scene),at.add(new Vector3(0,.006,0)),poolMaterial);pool.rotation.x=Math.PI/2;pool.scaling.x=1.02;
      const poolPositions=pool.getVerticesData('position')!,matrix=pool.computeWorldMatrix(true),poolUvs:number[]=[];
      for(let i=0;i<poolPositions.length;i+=3){const p=Vector3.TransformCoordinates(Vector3.FromArray(poolPositions,i),matrix);poolUvs.push(p.x/2.3,p.z/2.3);}pool.setVerticesData('uv',poolUvs);
      for(let j=0;j<5;j++)rock('cove:pool-stone',at.add(new Vector3(Math.cos(j*1.26)*.79,.04,Math.sin(j*1.26)*.79)),.28,.12,.36,j+tile.cell.col,M.stone);
      shrub(at.add(new Vector3(.92,0,-.7)),tile.cell.col*10+tile.cell.row,.65,1);
      for(let j=0;j<5;j++){const p=at.add(new Vector3(Math.cos(j*1.9)*.5,.008,Math.sin(j*1.9)*.45));rock('cove:submerged-gravel',p,.14,.015,.17,j+tile.cell.row,M.rockDark);}
    }
  }
  const merged=mergeDecoration(scene,root,statics,'camp:static',true);
  merged.filter(mesh=>groundPaint.includes(mesh.material as StandardMaterial)||(mesh.material as StandardMaterial).transparencyMode===Material.MATERIAL_ALPHABLEND).forEach(mesh=>mesh.hasVertexAlpha=true);
  // Interior lanterns cannot select scenery belonging to another tent.
  for(const t of tents){const own=definition.camp!.interactionPoints.filter(p=>p.objectCell&&Math.abs(p.objectCell.col-t.cell.col)<=1&&Math.abs(p.objectCell.row-t.cell.row)<=1);for(const p of own){const lid=lids.get(p.id);if(lid)t.light.includedOnlyMeshes.push(lid);}}
  const shadow=new CampShadows(scene,sun,compact), climate=createCampSurfaceEffects(scene,definition),life=createCampLife(scene,root,profile,width,depth);
  if(typeof window!=='undefined'&&!compact){
    const glow=new GlowLayer('camp:fire-glow',scene,{mainTextureRatio:.25,blurKernelSize:16});glow.intensity=.27;flames.forEach(m=>glow.addIncludedOnlyMesh(m));
  }
  let highlights:boolean|string|null=false,last=0;
  const update=(time:number,phase?:CampRestPhase|null,interactions:CampRestState['interactions']=[],focusCell?:Cell|null,environment?:EnvironmentState,serverNow=Date.now(),climateState?:ClimateState,light?:NaturalLightProfile)=>{
    const dark=light?1-light.ambient:DARK[phase??'arrival'],day=1-dark,elapsed=Math.min(1,Math.max(0,time-last)),dt=Math.min(.12,elapsed);last=time;
    const fireLevels=new Map(hearths.map(h=>[h.id,h.fire.update(elapsed,dark,environment,interactions,serverNow)]));
    climate.update(elapsed,environment,climateState);
    const exposedExtinguished=Boolean(environment&&(strongWind(environment)||precipitationKind(environment)==='rain'&&(environment.precipitationLevel??2)===3));
    ambient.intensity=.48+day*.25;ambient.diffuse=Color3.Lerp(Color3.FromHexString('#92aec9'),Color3.FromHexString('#e2e3cd'),day);
    sun.intensity=.3+day*.64;sun.diffuse=Color3.Lerp(Color3.FromHexString('#86a9d5'),Color3.FromHexString('#ffe0b7'),day);
    const weatherGlow=weatherLight(environment,serverNow/1000,reduced);ambient.intensity*=.75+weatherGlow.cloud*.25;sun.intensity=sun.intensity*weatherGlow.cloud+weatherGlow.flash;sun.diffuse=Color3.Lerp(sun.diffuse,Color3.FromHexString('#bbd6ef'),Math.min(1,weatherGlow.flash));
    const cameraDirection=scene.activeCamera?.globalPosition.subtract(center).normalize()??new Vector3(0,0,1);
    cameraDirection.y=0;cameraDirection.normalize();
    for(const mat of allMaterials)if(!mat.disableLighting&&![M.flame,M.ember,M.halo,M.crystal].includes(mat))mat.emissiveColor=mat.diffuseColor.scale(.045+day*.045);
    for(const mat of plants)mat.emissiveColor=mat.diffuseColor.scale(.08+day*.13);
    lights.forEach(({light,intensity,kind},i)=>{const strength=kind==='fire'?fireLevels.get(light.name.replace(/:light$/,''))?.flame??0:kind==='torch'?(dark>.2&&!exposedExtinguished?1:0):1;light.intensity=intensity*strength*(kind==='fire'?.48+dark*.92:.48+dark*.82)*(reduced?1:.96+Math.sin(time*9.2+i)*.05+Math.sin(time*15.4+i)*.025);});
    flames.forEach((f,i)=>{const lamp=f.metadata?.fireSource==='lamp',strength=f.metadata?.fireSource?(dark>.2&&(lamp||!exposedExtinguished||climate.covered(f.getAbsolutePosition().x,f.getAbsolutePosition().z))?1:0):[...fireLevels].find(([id])=>f.name.startsWith(id+':'))?.[1].flame??0;f.isVisible=lamp||strength>.005;f.visibility=lamp||strength>.005?1:0;if(lamp)f.material=strength?M.ember:M.brass;f.scaling.y=(reduced?1:.85+Math.sin(time*9.4+i)*.15+Math.sin(time*16.8+i)*.04)*(lamp?1:Math.max(.02,strength));f.scaling.x=(reduced?1:1-Math.sin(time*9.4+i)*.05);f.rotation.z=reduced?0:Math.sin(time*5.2+i)*.065;});
    hearths.forEach(h=>h.coals.update(time,fireLevels.get(h.id)!.embers));
    tents.forEach(t=>{
      const inside=Boolean(focusCell&&((Math.abs(focusCell.col-t.cell.col)<=1&&Math.abs(focusCell.row-t.cell.row)<=1)||(focusCell.col===t.entry.col&&focusCell.row===t.entry.row)));
      for(const mesh of t.shell){if(mesh.isVisible===inside)shadow.invalidate();mesh.isVisible=!inside;mesh.visibility=inside?0:1;}
      for(const mesh of t.interior)mesh.isVisible=Boolean(inside);
      includeCampActors(t.light,m=>{const p=m.getAbsolutePosition();return Math.abs(p.x-cellAt(t.cell).x)<3.35&&Math.abs(p.z-cellAt(t.cell).z)<3.35;},scene);
      t.light.intensity=inside&&dark>.2?.38+dark*1.75:0;
    });
    for(const [id,lid] of lids){const action=[...interactions].reverse().find(a=>a.pointId===id&&(a.action==='opened'||a.action==='closed'))?.action;const target=action==='opened'?-.92:0;lid.rotation.x+=(target-lid.rotation.x)*Math.min(1,dt*10);}
    rings.forEach((r,i)=>{const id=definition.camp!.interactionPoints[i]!.id;r.visibility=highlights===true||highlights===id?.6+Math.sin(time*2+i)*.05:0;});
    trees.forEach((tree,i)=>{
      tree.node.rotation.z=reduced?0:Math.sin(time*.62+i)*.021;
      tree.node.rotation.x=reduced?0:Math.cos(time*.49+i)*.012;
      const player=focusCell?cellAt(focusCell):center,fromPlayer=tree.at.subtract(player),ahead=Vector3.Dot(fromPlayer,cameraDirection);
      const near=fromPlayer.length()<12&&ahead>1,side=Vector3.Cross(fromPlayer,cameraDirection).length();
      for(const m of tree.meshes){const visible=!(near&&side<2.1);if(m.isVisible!==visible)shadow.invalidate();m.isVisible=visible;}
    });
    shells.forEach(s=>{const front=Vector3.Dot(s.normal,cameraDirection)>.4;for(const m of s.meshes){const visible=!(front&&profile==='forest');if(m.isVisible!==visible)shadow.invalidate();m.isVisible=visible;m.visibility=front&&Boolean(focusCell)?(profile==='coastal-refuge'?.24:profile==='forest'?1:.58):1;}});
    ripples.forEach((r,i)=>{const t=(time*.7+i*.37)%1;r.scaling.setAll(.4+t*.95);r.visibility=(1-t)*.3;});
    if(streamTexture&&!reduced){streamTexture.vOffset=(time*.055)%1;streamTexture.uOffset=Math.sin(time*.2)*.018;}
    if(streamFlow&&streamFlowPositions&&time-lastFlow>1/20){lastFlow=time;
      for(let i=0;i<24;i++)for(let row=0;row<3;row++)for(let side=0;side<2;side++){
        const z=((reduced?0:time*.92)+i*5.17)%120-40+(row-1)*(.4+rand(i)*.6),x=forestStreamX(z)+(rand(i+18)-.5)*1.5+(side?1:-1)*(row===1?.045:.008),k=(i*6+row*2+side)*3;
        streamFlowPositions[k]=x;streamFlowPositions[k+1]=.038;streamFlowPositions[k+2]=z;
      }streamFlow.updateVerticesData('position',streamFlowPositions,false,false);streamFlow.visibility=reduced?.3:.55+day*.35;
    }
    auroras.forEach(({mesh,base},i)=>{const pos=mesh.getVerticesData('position')!;for(let n=0;n<pos.length;n+=3){pos[n+1]=base[n+1]!+(reduced?0:Math.sin(time*.38+base[n]!*.15+i)*.42);pos[n+2]=base[n+2]!+(reduced?0:Math.sin(time*.24+base[n]!*.2+i)*.48);}mesh.updateVerticesData('position',pos,false,false);(mesh.material as StandardMaterial).alpha=.05+dark*.36;});
    clouds.forEach((m,i)=>{m.position.x=((time*(reduced?.3:2.1+i*.18)+i*17)%(width+50))-25;});
    if(profile==='cliff-observatory'&&!reduced&&environment?.lightning){const flash=weatherLight(environment,serverNow/1000).flash;sun.intensity+=flash*.55;}
    scene.fogMode=2;scene.fogDensity=(profile==='forest'?.002+dark*.004:profile==='coastal-refuge'?.0018+dark*.002:.0014)+(climateState?.fogDensity??0)*.018;
    scene.fogColor=Color3.Lerp(Color3.FromHexString(profile==='forest'?'#233e3d':'#203b55'),Color3.FromHexString(profile==='forest'?'#6d8270':'#8faaa9'),day);
    const sky=Color3.Lerp(Color3.FromHexString('#102b42'),Color3.FromHexString(profile==='forest'?'#4b6551':'#668795'),day);scene.clearColor.set(sky.r,sky.g,sky.b,1);
    fx.update(time,dark,fireLevels,environment);fauna?.update(time);life.update(time,dark);
    shadow.update(time,[...lights.map(l=>l.light),...tents.map(t=>t.light)],focusCell?cellAt(focusCell):center,interactions.some(i=>serverNow-i.at>=0&&serverNow-i.at<8500));
  };
  update(0,'arrival');
  return {root,update,weatherCovered:climate.covered,setInteractionHighlights:target=>{highlights=target;}};
}
