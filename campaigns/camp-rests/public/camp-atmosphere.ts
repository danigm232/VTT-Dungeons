import { Color3, Color4 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { illustratedMaterial } from '../../../engine/client/diorama-kit.js';
import { campFoamTexture, campMaterialRelief } from './camp-detail-kit.js';
import type { CampFireLevel } from './camp-fire.js';

/** Fixed particle/geometry budgets; compact clients use the shared resolution profile. */
export function createCampAtmosphere(scene: Scene, root: TransformNode, profile: string, width: number, depth: number) {
  const compact = typeof matchMedia === 'function' && matchMedia('(pointer: coarse), (max-width: 850px)').matches;
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const systems: Array<{ system: ParticleSystem; rate: number; kind: string; fireId?: string }> = [];
  let lastWater = -Infinity;
  const runtime = typeof document !== 'undefined';
  const dot = runtime ? new DynamicTexture('camp:soft-particle', { width: 64, height: 64 }, scene, false) : null;
  const fireTexture=runtime?new DynamicTexture('camp:painted-flame',{width:64,height:128},scene,false):null;
  if(fireTexture){const ctx=fireTexture.getContext() as CanvasRenderingContext2D;ctx.clearRect(0,0,64,128);const gradient=ctx.createLinearGradient(0,125,0,5);gradient.addColorStop(0,'#fff4bd');gradient.addColorStop(.35,'#ffc369');gradient.addColorStop(.72,'#e95d24');gradient.addColorStop(1,'rgba(210,70,18,0)');ctx.fillStyle=gradient;ctx.beginPath();ctx.moveTo(32,125);ctx.bezierCurveTo(4,100,8,84,24,55);ctx.bezierCurveTo(32,74,46,40,35,5);ctx.bezierCurveTo(65,51,62,74,53,99);ctx.bezierCurveTo(47,120,43,125,32,125);ctx.fill();fireTexture.hasAlpha=true;fireTexture.update();}
  if (dot) {
    const ctx = dot.getContext(), gradient = ctx.createRadialGradient(32, 32, 1, 32, 32, 31);
    gradient.addColorStop(0, 'rgba(255,255,255,.85)'); gradient.addColorStop(.35, 'rgba(255,255,255,.5)'); gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 64, 64); dot.hasAlpha = true; dot.update();
  }
  const particle = (id: string, at: Vector3, kind: string, rate: number, spread: Vector3, fireId?: string) => {
    if (!dot) return null;
    const system = new ParticleSystem(id, compact ? 80 : 140, scene);
    system.particleTexture = dot; system.emitter = at; system.minEmitBox = spread.scale(-1); system.maxEmitBox = spread;
    system.minLifeTime = 1.2; system.maxLifeTime = 3.2; system.minSize = .08; system.maxSize = .22;
    system.color1 = new Color4(.8, .88, .84, .24); system.color2 = new Color4(.68, .8, .84, .15); system.colorDead = new Color4(.68, .8, .84, 0);
    system.direction1 = new Vector3(.2, .1, -.1); system.direction2 = new Vector3(.5, .2, .2); system.gravity = Vector3.Zero();
    system.minEmitPower = .5; system.maxEmitPower = 1.1; system.updateSpeed = .018; system.blendMode = ParticleSystem.BLENDMODE_STANDARD;
    system.emitRate = reduced ? rate * .12 : rate * (compact ? .55 : 1); system.start(); systems.push({ system, rate, kind,fireId }); return system;
  };
  const fire = (id: string, at: Vector3) => {
    const tongues=particle(id+':fire-tongues',at.add(new Vector3(0,.35,0)),'flame',13,new Vector3(.27,.035,.27),id);
    if(tongues&&fireTexture){tongues.particleTexture=fireTexture;tongues.minLifeTime=.32;tongues.maxLifeTime=.78;tongues.minSize=.28;tongues.maxSize=.57;tongues.minScaleY=1.35;tongues.maxScaleY=1.85;tongues.direction1=new Vector3(-.12,.55,-.08);tongues.direction2=new Vector3(.19,1.1,.12);tongues.color1=new Color4(1,.9,.7,.85);tongues.color2=new Color4(1,.74,.43,.65);tongues.colorDead=new Color4(.85,.35,.08,0);tongues.blendMode=ParticleSystem.BLENDMODE_ADD;}
    const smoke = particle(id + ':smoke', at.add(new Vector3(0, 1, 0)), 'smoke', 10, new Vector3(.2, .08, .2),id);
    if (smoke) {
      smoke.minSize = .4; smoke.maxSize = 1.2; smoke.minLifeTime = 2; smoke.maxLifeTime = 4.6;
      smoke.color1 = new Color4(.43, .42, .38, .28); smoke.color2 = new Color4(.32, .36, .39, .15);
      smoke.direction1 = new Vector3(.15, .8, .06); smoke.direction2 = new Vector3(.42, 1.25, .15); smoke.gravity = new Vector3(.035, .06, .015);
    }
    const sparks = particle(id + ':embers', at.add(new Vector3(0, .65, 0)), 'embers', 13, new Vector3(.3, .06, .3),id);
    if (sparks) {
      sparks.minSize = .025; sparks.maxSize = .085; sparks.minLifeTime = .7; sparks.maxLifeTime = 2.2;
      sparks.color1 = new Color4(1, .67, .18, .85); sparks.color2 = new Color4(1, .35, .07, .7); sparks.colorDead = new Color4(.5, .15, .02, 0);
      sparks.direction1 = new Vector3(-.3, .8, -.1); sparks.direction2 = new Vector3(.55, 1.8, .25); sparks.blendMode = ParticleSystem.BLENDMODE_ADD;
    }
  };
  const mist = particle('camp:ground-mist', new Vector3(width / 2, .38, depth / 2), 'mist', profile === 'forest' ? 9 : 3, new Vector3(width * .65, .1, depth * .65));
  if (mist) {
    mist.minSize = 3; mist.maxSize = 6; mist.minLifeTime = 7; mist.maxLifeTime = 11;
    mist.color1 = new Color4(.68, .79, .78, .038); mist.color2 = new Color4(.52, .65, .74, .028); mist.colorDead = new Color4(.52, .65, .74, 0);
    mist.direction1 = new Vector3(.12, 0, .035); mist.direction2 = new Vector3(.3, .01, .08);
  }
  if (profile === 'forest') {
    const motes = particle('forest:air-motes', new Vector3(width / 2, 1.8, depth / 2), 'motes', 7, new Vector3(width * .4, 1.5, depth * .4));
    if (motes) { motes.minSize = .025; motes.maxSize = .065; motes.color1 = new Color4(.89, .88, .49, .3); motes.minLifeTime = 5; motes.maxLifeTime = 8; }
  }
  let sea: Mesh | undefined, seaBase: Float32Array | undefined, seaCurrent: Float32Array | undefined, waterNormals: number[] = [];
  let surf: Mesh | undefined, surfBase: Float32Array | undefined, surfPositions: Float32Array | undefined, surfColors: Float32Array | undefined;
  const waterLevel = profile === 'cliff-observatory' ? -15.5 : -1.3;
  const shoreline=(angle:number,offset:number)=>{
    const radius=1.08+.045*Math.sin(angle*7)+.025*Math.sin(angle*11);
    return new Vector3(width/2+Math.cos(angle)*((width/2+.45)*radius+offset),waterLevel,depth/2+Math.sin(angle)*((depth/2+.45)*radius+offset));
  };
  const seaMaterial = illustratedMaterial(scene, 'camp:sea-surface', '#70aab2', runtime ? '/art/a1-hd2d-v1/bay-v2.webp' : undefined);
  const stormySea = profile === 'wreck-beach' || profile === 'cliff-observatory' || profile === 'coastal-refuge';
  seaMaterial.specularColor = Color3.FromHexString(stormySea ? '#365e6c' : '#4f8393'); seaMaterial.specularPower = 80; seaMaterial.maxSimultaneousLights = 2;
  campMaterialRelief(scene,seaMaterial,'water');
  // A dedicated UV repeat keeps sea relief distinct without changing pool materials.
  if(seaMaterial.bumpTexture){seaMaterial.bumpTexture=seaMaterial.bumpTexture.clone();if(seaMaterial.bumpTexture instanceof Texture)seaMaterial.bumpTexture.uScale=seaMaterial.bumpTexture.vScale=stormySea ? 12 : 32;}
  const texture = seaMaterial.diffuseTexture;
  if (texture instanceof Texture) texture.uScale = texture.vScale = 9;
  if (profile !== 'forest') {
    sea = MeshBuilder.CreateGround('camp:living-ocean', { width: 260, height: 260, subdivisions: compact ? 32 : 48, updatable: true }, scene);
    sea.position.set(width / 2, waterLevel, depth / 2); sea.material = seaMaterial; sea.parent = root; sea.isPickable = false;
    sea.metadata = { content: 'VTT_AMBIENCE', decorativeOnly: true };
    seaBase = new Float32Array(sea.getVerticesData('position')!); seaCurrent = seaBase.slice();
    const foamMaterial = illustratedMaterial(scene, 'camp:breaking-foam', '#e1efde'); foamMaterial.disableLighting = true; foamMaterial.emissiveColor=Color3.FromHexString('#b5cfcd');foamMaterial.backFaceCulling = false; foamMaterial.alpha = .8;
    const foamTexture=campFoamTexture(scene);foamTexture.uScale=12;foamTexture.vScale=2;foamMaterial.diffuseTexture=foamTexture;foamMaterial.useAlphaFromDiffuseTexture=true;
    const positions: number[] = [], uvs: number[] = [], indices: number[] = [], columns = 64, rows = 5;
    for (let r = 0; r < rows; r++) for (let c = 0; c <= columns; c++) {
      const shore=shoreline(.08+c/columns*(Math.PI-.16),1.8+r/(rows-1)*2.6);
      positions.push(shore.x, waterLevel + .12, shore.z); uvs.push(c / columns, r / (rows - 1));
    }
    for (let r = 0; r < rows - 1; r++) for (let c = 0; c < columns; c++) { const a = r * (columns + 1) + c; indices.push(a, a + columns + 1, a + 1, a + 1, a + columns + 1, a + columns + 2); }
    surf = new Mesh('camp:breaking-surf', scene); const data = new VertexData(); data.positions = positions; data.indices = indices; data.uvs = uvs; data.normals = []; VertexData.ComputeNormals(positions, indices, data.normals); data.colors = new Float32Array(positions.length / 3 * 4); data.applyToMesh(surf, true);
    surf.parent = root; surf.material = foamMaterial; surf.isPickable = false; surf.hasVertexAlpha = true; surf.alwaysSelectAsActiveMesh = true;
    surfBase = new Float32Array(positions); surfPositions = surfBase.slice(); surfColors = new Float32Array(positions.length / 3 * 4);
    if (profile !== 'cliff-observatory') for (let i = 0; i < 5; i++) {
      const at=shoreline(.28+i/4*(Math.PI-.56),1.3);at.y=waterLevel+.4;
      const spray = particle('camp:wave-spray-' + i, at, 'spray', profile === 'wreck-beach' ? 12 : 4, new Vector3(.8, .05, .8));
      if (spray) { spray.minSize = .06; spray.maxSize = .24; spray.direction1 = new Vector3(-.4, 2, -.8); spray.direction2 = new Vector3(.5, 3.6, -.3); spray.gravity = new Vector3(.1, -3.2, 0); spray.color1 = new Color4(.84, .96, 1, .5); }
    }
  }
  scene.onDisposeObservable.addOnce(() => { systems.forEach(({system}) => system.dispose()); dot?.dispose();fireTexture?.dispose(); });
  return {
    fire,
    drip(at: Vector3) {
      const drops = particle('cove:ceiling-drips', at, 'drips', 4, new Vector3(2.5, .1, 1.5));
      if (drops) { drops.minSize = .02; drops.maxSize = .05; drops.minLifeTime = .7; drops.maxLifeTime = 1.7; drops.direction1 = drops.direction2 = new Vector3(0, -.3, 0); drops.gravity = new Vector3(0, -3, 0); drops.color1 = new Color4(.64, .83, .9, .48); }
    },
    update(time: number, dark: number, fireLevels?: Map<string,CampFireLevel>) {
      for (const {system,rate,kind,fireId} of systems) {
        const index = Number(system.name.match(/spray-(\d+)/)?.[1] ?? 0);
        const crest = kind === 'spray' ? .16 + Math.pow(Math.max(0, Math.sin(time * 1.55 + index * 1.25)), 3) : 1;
        const level=fireId?fireLevels?.get(fireId):undefined;
        const fireFactor=fireId?(level?(kind==='smoke'?level.smoke:kind==='embers'?level.embers:level.flame):(dark>.2?1:0)):1;
        system.emitRate = rate * (reduced ? .12 : compact ? .55 : 1) * crest * fireFactor * (kind === 'motes' ? .5 + dark : 1);
        if(fireId&&fireFactor===0&&system.getActiveCount())system.reset();
      }
      seaMaterial.emissiveColor = Color3.FromHexString('#244e64').scale(.18 + dark * .05);
      seaMaterial.diffuseColor = Color3.Lerp(Color3.FromHexString('#538d95'), Color3.FromHexString('#2c4961'), dark);
      if (texture instanceof Texture && !reduced) { texture.uOffset = time * .003 % 1; texture.vOffset = time * .007 % 1; }
      if (reduced || time - lastWater < (compact ? 1 / 12 : 1 / 20)) return; lastWater = time;
      const force = profile === 'wreck-beach' ? .42 : profile === 'coastal-refuge' ? .12 : .24;
      if (sea && seaBase && seaCurrent) {
        for (let i = 0; i < seaBase.length; i += 3) { const x = seaBase[i]!, z = seaBase[i + 2]!; seaCurrent[i + 1] = force * (Math.sin(x * .18 + z * .19 - time * 1.5) + .42 * Math.sin(z * .37 - x * .06 - time * 2.1)); }
        sea.updateVerticesData('position', seaCurrent, false, false); VertexData.ComputeNormals(seaCurrent, sea.getIndices()!, waterNormals); sea.updateVerticesData('normal', waterNormals, false, false);
      }
      if (surf && surfBase && surfPositions && surfColors) {
        for (let i = 0; i < surfBase.length; i += 3) {
          const x = surfBase[i]!, r = Math.floor(i / 3 / 65), cross = r / 4, pulse = Math.max(0, Math.sin(time * 1.55 - x * .17));
          surfPositions[i + 1] = waterLevel + (profile === 'wreck-beach' ? .68 : .26) + pulse * (profile === 'wreck-beach' ? .34 : .15) * (1 - cross);
          const dx=surfBase[i]!-width/2,dz=surfBase[i+2]!-depth/2,length=Math.max(1,Math.hypot(dx,dz)),advance=pulse*(profile==='wreck-beach'?1.1:.4);
          surfPositions[i]=surfBase[i]!-dx/length*advance;surfPositions[i+2]=surfBase[i+2]!-dz/length*advance;
          const c = i / 3 * 4; surfColors[c] = .82; surfColors[c + 1] = .94; surfColors[c + 2] = .94; surfColors[c + 3] = Math.sin(cross * Math.PI) * (.1 + pulse * .7) * (.65 + .35 * Math.sin(x * 2.4 + time));
        }
        surf.updateVerticesData('position', surfPositions, false, false); surf.updateVerticesData('color', surfColors, false, false);
      }
    }
  };
}
