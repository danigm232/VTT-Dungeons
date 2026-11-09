import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { BoundingInfo } from '@babylonjs/core/Culling/boundingInfo.js';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { illustratedMaterial } from './diorama-kit.js';
import {createCoastalAnimationVisibility,setCoastalAnimationBounds} from './coastal-animation-visibility.js';
import {createCoastalNormalUpdater} from './coastal-normals.js';

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

/** The bay is modeled as an animated surging body of water with ocean swells crashing into the rocks below A1. */
export function createCoastalBackdrop(scene: Scene, root: TransformNode, url: string,options:{pauseOffscreen?:boolean}={}) {
  const material = illustratedMaterial(scene, 'a1:sheltered-bay-v2', '#ffffff', url);
  material.specularColor = Color3.FromHexString('#3a7588');
  material.specularPower = 64;
  material.disableLighting = false;
  material.maxSimultaneousLights = 3;

  // Babylon ground for deep animated ocean swells lifting and plunging
  const compact = typeof matchMedia === 'function' && matchMedia('(pointer: coarse), (max-width: 850px)').matches;
  const sea = MeshBuilder.CreateGround('a1:bay-background', { width: 360, height: 360, subdivisions: compact ? 36 : 56, updatable: true }, scene);
  sea.position = new Vector3(28.5, -9.15, 22);
  sea.parent = root;
  sea.material = material;
  sea.isPickable = false;
  sea.checkCollisions = false;
  sea.receiveShadows = false;
  sea.metadata = { content: 'VTT_AMBIENCE', decorativeOnly: true, heightBelowTerraceMeters: 9.15, effect: 'babylon-vertex-waves' };
  const texture = material.diffuseTexture;
  // Keep the painted swell readable at distant, grazing camera angles. The
  // previous 24 repeats compressed its fine strokes into a visible moiré grid.
  if (texture instanceof Texture) { texture.uScale = 12; texture.vScale = 12; texture.anisotropicFilteringLevel = 16; }

  const basePositions = sea.getVerticesData('position')!.slice();
  const wavePositions = new Float32Array(basePositions.length);
  const waterNormals = new Float32Array(basePositions.length);
  const waterColors = new Float32Array(basePositions.length / 3 * 4);
  const indices = sea.getIndices()!;
  const waterNormalUpdater=createCoastalNormalUpdater(indices,basePositions.length/3);
  sea.setVerticesData('color', waterColors, true, 4);

  // Steepened trochoidal wave function simulating real incoming ocean swells
  let seaIntensity = .35;
  const wavePhases = new Float64Array(basePositions.length / 3 * 4);
  let phaseX = NaN, phaseZ = NaN;

  const foamMaterial = illustratedMaterial(scene, 'a1:shore-wash-v2', '#ffffff');
  foamMaterial.disableLighting = true;
  foamMaterial.backFaceCulling = false;
  foamMaterial.alpha = .78;
  foamMaterial.emissiveColor = Color3.FromHexString('#9ce5eb').scale(.22);

  // Deforming multi-row ribbon for dynamic surf crashing against the rocks
  const columns = 96, rows = 12, foamPositions: number[] = [], foamUvs: number[] = [], foamIndices: number[] = [];
  const foamColors = new Float32Array((columns + 1) * rows * 4);
  const shore = (x: number) => 30.2 + Math.sin(x * .28) * .85 + Math.sin(x * 1.8) * .22;
  const shoreByColumn = Array.from({ length: columns + 1 }, (_, column) => shore(-18 + column * 1.2));
  for (let row = 0; row < rows; row++) {
    const crossShore = row / (rows - 1) - .5;
    for (let column = 0; column <= columns; column++) {
      const x = -18 + column * 1.2;
      const z = shoreByColumn[column]! + crossShore * 3.8;
      foamPositions.push(x, -9.05, z);
      foamUvs.push(column / columns * 10, row / (rows - 1));
    }
  }
  for (let row = 0; row < rows - 1; row++) for (let column = 0; column < columns; column++) {
    const a = row * (columns + 1) + column, b = a + 1, c = a + columns + 1, d = c + 1;
    foamIndices.push(a, c, b, b, c, d);
  }
  const foam = new Mesh('a1:shore-wash', scene);
  const foamData = new VertexData();
  foamData.positions = foamPositions; foamData.indices = foamIndices; foamData.uvs = foamUvs;
  foamData.colors = Array.from(foamColors);
  foamData.applyToMesh(foam, true);
  foam.hasVertexAlpha = true;
  foam.material = foamMaterial;
  foam.parent = root;
  foam.isPickable = false;
  foam.checkCollisions = false;
  foam.metadata = { content: 'VTT_AMBIENCE', decorativeOnly: true, effect: 'animated-shore-break' };
  const animatedFoamPositions=new Float32Array(foamPositions.length),animatedFoamColors=new Float32Array(foamColors.length),foamNormals=new Float32Array(foamPositions.length);
  let foamNormalUpdater:ReturnType<typeof createCoastalNormalUpdater>|null=null;
  const animationStats={geometryUpdates:0,foamUpdates:0,skippedOffscreenUpdates:0,skippedFoamUpdates:0,pauseOffscreen:options.pauseOffscreen===true,normalTopologyBytes:waterNormalUpdater.topologyBytes};sea.metadata.coastalAnimation=animationStats;
  if(options.pauseOffscreen){
    // Maximum swell is under 5.5 m at the strongest sea state. The surf
    // adds at most 3.82 m of spray runup and moves less than 4 m across shore.
    const foamBox=foam.getBoundingInfo().boundingBox;
    setCoastalAnimationBounds(foam,[new BoundingInfo(foamBox.minimum.subtract(new Vector3(.11,3,4)),foamBox.maximum.add(new Vector3(.11,10,4)))]);
  }
  const contributes=options.pauseOffscreen?createCoastalAnimationVisibility(scene,[sea]):null;
  const foamContributes=options.pauseOffscreen?createCoastalAnimationVisibility(scene,[foam],false):null;

  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let lastGeometryTime = -Infinity;
  const updateGeometry = (time: number,waterVisible=true,foamVisible=true) => {
    const waterX = sea.position.x, waterZ = sea.position.z;
    const swellTime = time * 1.45, chopTime = time * 1.85, rippleTime = time * 2.3;
    const amplitude = .12 + seaIntensity * 1.65;
    const waveHeight = (swell: number, chop: number, ripple: number, shoal: number) => {
      const swellPeak = (Math.exp(Math.sin(swell - swellTime)) - .8) * .65;
      return (swellPeak + Math.sin(chop + chopTime) * .28 + Math.sin(ripple - rippleTime) * .14) * shoal * amplitude;
    };
    if(waterVisible){
    // Cache only the stationary terms in Float64, keeping the phase, vertex
    // arithmetic and CPU buffers that the shore and rowboat already sample.
    if(phaseX!==waterX||phaseZ!==waterZ){
      for(let i=0,at=0;i<basePositions.length;i+=3,at+=4){
        const x=basePositions[i]!+waterX,z=basePositions[i+2]!+waterZ;
        wavePhases[at]=x*.038+z*.082;
        wavePhases[at+1]=x*.088-z*.055;
        wavePhases[at+2]=x*.14+z*.042;
        wavePhases[at+3]=1+clamp01((z-18)/10)*.85;
      }
      phaseX=waterX;phaseZ=waterZ;
    }
    for (let i = 0, color = 0; i < basePositions.length; i += 3, color += 4) {
      const height = waveHeight(wavePhases[color]!,wavePhases[color+1]!,wavePhases[color+2]!,wavePhases[color+3]!);
      const crest = clamp01((height + .25) / .85);
      wavePositions[i] = basePositions[i]!;
      wavePositions[i + 1] = basePositions[i + 1]! + height;
      wavePositions[i + 2] = basePositions[i + 2]!;
      // Deep sea navy into bright turquoise crests with foamy highlights
      waterColors[color] = .09 + crest * .28;
      waterColors[color + 1] = .22 + crest * .42;
      waterColors[color + 2] = .32 + crest * .48;
      waterColors[color + 3] = 1;
    }
    sea.updateVerticesData('position', wavePositions, false, false);
    waterNormalUpdater.update(wavePositions,waterNormals);
    sea.updateVerticesData('normal', waterNormals, false, false);
    sea.updateVerticesData('color', waterColors, false, false);
    sea.metadata.coastalGeometryVersion=++animationStats.geometryUpdates;
    }

    if(foamVisible){
    const positions=animatedFoamPositions,colors=animatedFoamColors;
    let vertex = 0;
    for (let row = 0; row < rows; row++) {
      const rowT = row / (rows - 1), envelope = Math.pow(Math.sin(rowT * Math.PI), .55);
      for (let column = 0; column <= columns; column++, vertex++) {
        const x = -18 + column * 1.2, baseZ = shoreByColumn[column]! + (rowT - .5) * 2.2;
        const phase = time * 1.45 + x * .15 + rowT * 1.9;
        const swellPulse = Math.sin(phase);
        const crashPeak = Math.max(0, swellPulse);
        const runup = Math.pow(crashPeak, 1.6) * ( .22+seaIntensity*2.2) - (1 - crashPeak) * .35;
        const z = baseZ - runup;
        // Dramatic surge climbing up the rocks when waves strike
        const rockSurge = Math.pow(crashPeak, 2.2) * (.12+seaIntensity*3.7);
        const wx=x+waterX,wz=z+waterZ;
        const y = -9.05 + waveHeight(wx*.038+wz*.082,wx*.088-wz*.055,wx*.14+wz*.042,1+clamp01((wz-18)/10)*.85) + rockSurge * (1 - rowT * .6);
        const fleck = .5 + .5 * Math.sin(x * .92 + row * 2.4 - time * 1.8) * Math.sin(x * 1.6 - row * 1.1 + time * .8);
        const breakup = clamp01(.3 + .6 * fleck + .25 * Math.sin(x * .25 - time * .5));
        const crest = clamp01(.2 + crashPeak * .8);
        const alpha = envelope * (.15 + crest * .85) * breakup;
        positions[vertex*3]=x+Math.sin(phase*.6)*.1;positions[vertex*3+1]=y;positions[vertex*3+2]=z;
        const color = vertex * 4;
        colors[color] = .82 + crest * .18;
        colors[color + 1] = .94 + crest * .06;
        colors[color + 2] = .97 + crest * .03;
        colors[color + 3] = alpha*(.18+seaIntensity*.82);
      }
    }
    foam.updateVerticesData('position', positions, false, false);
    foam.updateVerticesData('color', colors, false, false);
    // updateVerticesData does not create a missing attribute. The unlit native
    // ribbon has none, so its previous normal calculation was discarded.
    if(foam.isVerticesDataPresent('normal')){
      if(!foamNormalUpdater){foamNormalUpdater=createCoastalNormalUpdater(foamIndices,foamPositions.length/3);animationStats.normalTopologyBytes+=foamNormalUpdater.topologyBytes;}
      foamNormalUpdater.update(positions,foamNormals);
      foam.updateVerticesData('normal', foamNormals, false, false);
    }
    animationStats.foamUpdates++;
    }
  };
  updateGeometry(0);

  return {
    sea,
    update(time: number, dark: number, intensity = .35) {
      seaIntensity=clamp01(intensity);sea.metadata.seaIntensity=seaIntensity;
      const day = 1 - dark;
      material.diffuseColor = Color3.Lerp(Color3.FromHexString('#6faec2'), Color3.FromHexString('#31576d'), dark);
      material.emissiveColor = Color3.Lerp(Color3.FromHexString('#092535'), Color3.FromHexString('#0f2032'), dark);
      material.specularColor = Color3.Lerp(Color3.FromHexString('#5299ad'), Color3.FromHexString('#1c334d'), dark);
      foamMaterial.alpha = .74 - dark * .14;
      if (texture && 'uOffset' in texture && 'vOffset' in texture) {
        texture.uOffset = reduced ? 0 : (time * .012) % 1;
        texture.vOffset = reduced ? 0 : Math.sin(time * .16) * .024;
      }
      if (!reduced && time - lastGeometryTime >= 1 / 24) {
        const waterVisible=!contributes||contributes(),foamVisible=!foamContributes||foamContributes();
        if(waterVisible||foamVisible){updateGeometry(time,waterVisible,foamVisible);lastGeometryTime=time;}
        if(!waterVisible)animationStats.skippedOffscreenUpdates++;
        if(!foamVisible)animationStats.skippedFoamUpdates++;
      }
      material.diffuseColor = Color3.Lerp(material.diffuseColor, Color3.FromHexString('#98c7ce'), day * .12);
    }
  };
}
