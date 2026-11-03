import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3, Matrix } from '@babylonjs/core/Maths/math.vector.js';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera.js';
import { Camera } from '@babylonjs/core/Cameras/camera.js';
import { Constants } from '@babylonjs/core/Engines/constants.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { WRECK_STRUCTURE as S } from '../shared/wreck-structure.js';
import { WRECK_CAMERA_BASE_ALPHA } from '../shared/wreck-camera-profile.js';

const clamp = (v: number, low: number, high: number) => Math.max(low, Math.min(high, v));
const radians = (degrees: number) => degrees * Math.PI / 180;

/** Ortho rays never converge on a physical horizon. Stabilise its vertical
 * projection at the top of the frame, without a sea-level cylinder masking
 * the ocean. Bearings stay world anchored; only the useful exterior arc is
 * built. These are presentation layers, never island geography or a floor.
 */
export function wreckScenicFrame(camera: ArcRotateCamera) {
  const halfHeight = Math.abs((camera.orthoTop ?? 20) - (camera.orthoBottom ?? -20)) / 2;
  const halfWidth = Math.abs((camera.orthoRight ?? 32) - (camera.orthoLeft ?? -32)) / 2;
  const tilt = Math.PI / 2 - camera.beta;
  const forward = new Vector3(-Math.cos(camera.alpha), 0, -Math.sin(camera.alpha));
  const right = new Vector3(forward.z, 0, -forward.x);
  const up = new Vector3(forward.x * Math.sin(tilt), Math.cos(tilt), forward.z * Math.sin(tilt));
  const facingExterior = Math.cos(camera.alpha - WRECK_CAMERA_BASE_ALPHA) > Math.cos(radians(52));
  return { halfHeight, halfWidth, tilt, forward, right, up, facingExterior };
}

type Ribbon = { mesh: Mesh; material: StandardMaterial };

export function buildWreckScenicDepth(scene: Scene): Mesh[] {
  const meshes: Mesh[] = [], ribbons: Ribbon[] = [];
  // Angular volcanic crests and cliffs replace the regular cones. The coast
  // tapers towards the seaward edge; no land ring, invented buildings or loot.
  function ribbon(name: string, radius: number, start: number, end: number, layer: number, tint: string, mist = false) {
    const positions: number[] = [], indices: number[] = [], colors: number[] = [];
    const segments = 96, rows = mist ? 4 : 3;
    for (let i = 0; i <= segments; i++) {
      // Preserve the authored panorama relative to the boat-side front. This
      // is a fixed scenery transform, never a per-frame rotation with camera.
      const t = i / segments, angle = radians(start + (end - start) * t) - Math.PI/4 - WRECK_CAMERA_BASE_ALPHA;
      const envelope = Math.sin(Math.PI * t) ** .65;
      const ridge = (.12 + .20 * Math.exp(-(((t - .53) / .10) ** 2))
        + .07 * Math.sin(t * 31 + layer) + .035 * Math.sin(t * 83 + layer * 2)) * envelope;
      const edgeAlpha = clamp(Math.min(t, 1 - t) * 16, 0, 1);
      for (let row = 0; row < rows; row++) {
        const y = mist ? [.34, .47, .59, .70][row]!
          : row === 0 ? .34 : row === 1 ? .55 : .57 + ridge;
        // Profile height is immutable; the camera-dependent vertical shear
        // belongs to a matrix, not a vertex-buffer upload on every orbit frame.
        positions.push(S.origin.x + Math.sin(angle) * radius, y, S.origin.z + Math.cos(angle) * radius);
        const alpha = (mist ? [0, .30, .14, 0][row]! : row === 0 ? 0 : .86) * edgeAlpha;
        const shade = mist ? 1 : row === 2 ? 1.06 : .91;
        colors.push(shade, shade, shade, alpha);
      }
      if (i < segments) for (let row = 0; row < rows - 1; row++) {
        const a = i * rows + row, b = a + rows;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    const normals: number[] = []; VertexData.ComputeNormals(positions, indices, normals);
    const mesh = new Mesh(name, scene), data = new VertexData();
    Object.assign(data, { positions, indices, colors, normals }); data.applyToMesh(mesh);
    mesh.hasVertexAlpha = true;
    const material = new StandardMaterial(`${name}:material`, scene);
    material.disableLighting = true; material.emissiveColor = Color3.FromHexString(tint);
    material.diffuseColor = Color3.Black(); material.specularColor = Color3.Black();
    material.backFaceCulling = false; material.disableDepthWrite = true;
    material.fogEnabled = false; mesh.material = material;
    // Render behind the transparent ocean (index 0), but depth-test against
    // the opaque ship and actors. Water then dissolves into this horizon.
    mesh.alphaIndex = -20 + layer;
    mesh.metadata = { visualOnly: true, tokenOccluder: false, deckSurfaceId: 'sea', scenicLayer: mist ? 6 : 5,
      kind: mist ? 'horizon-mist' : 'distant-island-ridge', baseTint: tint };
    ribbons.push({ mesh, material }); meshes.push(mesh);
  }
  ribbon('wreck:scenic:far-volcanic-crest', 420, -62, 38, 0, '#607579');
  ribbon('wreck:scenic:middle-island-ridge', 350, -57, 34, 1, '#4b6368');
  ribbon('wreck:scenic:near-coastal-cliffs', 285, -52, 30, 2, '#3c555c');
  ribbon('wreck:scenic:horizon-mist', 265, -110, 50, 3, '#74908f', true);

  // Analytic soft reef silhouettes at the extreme foreground. This needs no
  // global depth-of-field pass, blurry ship, texture or extra render target.
  const vertexSource = `precision highp float;
    attribute vec3 position; attribute vec2 uv; uniform mat4 worldViewProjection;
    varying vec2 vUV; void main(){vUV=uv;gl_Position=worldViewProjection*vec4(position,1.);}`;
  const fragmentSource = `precision highp float; varying vec2 vUV;
    uniform float opacity; uniform float lightLevel; uniform float seed;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
      return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
    void main(){vec2 uv=vUV;
      float crest=.18+.60*pow(max(0.,1.-abs(uv.x*2.-1.)),.6)
        +.09*noise(vec2(uv.x*11.,seed))+.045*sin(uv.x*31.+seed);
      float coverage=(1.-smoothstep(crest-.045,crest+.045,uv.y))
        *smoothstep(0.,.09,uv.x)*(1.-smoothstep(.91,1.,uv.x));
      float strata=noise(vec2(uv.x*8.,uv.y*25.+seed));
      vec3 stone=mix(vec3(.055,.095,.105),vec3(.15,.22,.225),strata*.65+uv.y*.20);
      gl_FragColor=vec4(stone*lightLevel,coverage*opacity);}`;
  const foreground = [-1, 1].map((side, i) => {
    const mesh = MeshBuilder.CreatePlane(`wreck:scenic:foreground-reef:${i}`, { size: 1 }, scene);
    mesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
    const material = new ShaderMaterial(`${mesh.name}:material`, scene, { vertexSource, fragmentSource }, {
      attributes: ['position', 'uv'], uniforms: ['worldViewProjection', 'opacity', 'lightLevel', 'seed'], needAlphaBlending: true
    });
    material.backFaceCulling = false; material.disableDepthWrite = true;
    // Foreground is an optical framing layer, confined below -0.8 NDC.
    material.depthFunction = Constants.ALWAYS;
    material.setFloat('seed', i * 7 + 3); material.setFloat('opacity', 0); material.setFloat('lightLevel', 1);
    mesh.material = material; mesh.alphaIndex = 8;
    mesh.metadata = { visualOnly: true, tokenOccluder: false, deckSurfaceId: 'sea', scenicLayer: 1, kind: 'foreground-framing-reef', softEdge: true };
    meshes.push(mesh); return { mesh, material, side };
  });
  for (const mesh of meshes) { mesh.isPickable = false; mesh.checkCollisions = false; mesh.receiveShadows = false; mesh.isVisible = false; }

  const previousPose = new Float64Array(7).fill(NaN), projection = Matrix.Identity();
  let previousLight = -1;
  let ocean: ShaderMaterial | null = null;
  let ambientLight: ReturnType<Scene['getLightByName']> = null;
  const update = () => {
    const camera = scene.activeCamera;
    if(!ocean){const candidate=scene.getMaterialByName('wreck-continuous-ocean');if(candidate instanceof ShaderMaterial){ocean=candidate;candidate.onDisposeObservable.addOnce(()=>{if(ocean===candidate)ocean=null;});}}
    if(!ambientLight || ambientLight.isDisposed())ambientLight=scene.getLightByName('terrain-ambient');
    if (!(camera instanceof ArcRotateCamera) || camera.mode !== Camera.ORTHOGRAPHIC_CAMERA) {
      for (const mesh of meshes) mesh.isVisible = false;
      if(ocean instanceof ShaderMaterial)ocean.setFloat('scenicHorizon',0);
      return;
    }
    const target = camera.target;
    const exterior = scene.metadata?.wreckInterior !== true && Math.cos(camera.alpha - WRECK_CAMERA_BASE_ALPHA)>Math.cos(radians(52));
    if(ocean instanceof ShaderMaterial)ocean.setFloat('scenicHorizon',exterior?1:0);
    for (const mesh of meshes) mesh.isVisible = exterior;
    if (!exterior) return;
    const ambient = ambientLight?.intensity ?? .5;
    const light = clamp(ambient * 1.6, .16, 1);
    if (Math.abs(light - previousLight) > .005) {
      for (const r of ribbons) r.material.emissiveColor = Color3.FromHexString(r.mesh.metadata.baseTint).scale(.36 + light * .64);
      for (const f of foreground) f.material.setFloat('lightLevel', .4 + light * .6);
      previousLight = light;
    }
    const halfHeight=Math.abs((camera.orthoTop??20)-(camera.orthoBottom??-20))/2;
    const halfWidth=Math.abs((camera.orthoRight??32)-(camera.orthoLeft??-32))/2;
    if(previousPose[0]===camera.alpha&&previousPose[1]===camera.beta&&previousPose[2]===halfHeight&&previousPose[3]===halfWidth&&previousPose[4]===target.x&&previousPose[5]===target.y&&previousPose[6]===target.z)return;
    previousPose[0]=camera.alpha;previousPose[1]=camera.beta;previousPose[2]=halfHeight;previousPose[3]=halfWidth;previousPose[4]=target.x;previousPose[5]=target.y;previousPose[6]=target.z;
    const frame = wreckScenicFrame(camera);
    const cos = Math.max(.5, Math.cos(frame.tilt));
    const tan=Math.tan(frame.tilt);
    Matrix.FromValuesToRef(1,-frame.forward.x*tan,0,0, 0,frame.halfHeight/cos,0,0,
      0,-frame.forward.z*tan,1,0, 0,target.y+(target.x*frame.forward.x+target.z*frame.forward.z)*tan,0,1,projection);
    for(const r of ribbons)r.mesh.setPreTransformMatrix(projection);
    const direction = frame.forward.scale(Math.cos(frame.tilt)).add(new Vector3(0, -Math.sin(frame.tilt), 0));
    // Bounded drift opposite camera travel, never across the tactical centre.
    const travel = (target.x - S.origin.x) * frame.right.x + (target.z - S.origin.z) * frame.right.z;
    for (const f of foreground) {
      const drift = clamp(travel * .003, -.045, .045);
      f.mesh.position.copyFrom(target.subtract(direction.scale(80))
        .add(frame.right.scale(frame.halfWidth * (f.side * 1.04 - drift)))
        .add(frame.up.scale(-frame.halfHeight * 1.19)));
      f.mesh.scaling.set(frame.halfWidth * .40, frame.halfHeight * .72, 1);
      // Leave the mobile joystick's corner clear; fade out at close nest zoom.
      const opacity = clamp((frame.halfHeight - 5) / 12, 0, .64) * (frame.halfWidth < frame.halfHeight && f.side < 0 ? 0 : 1);
      f.material.setFloat('opacity', opacity);
    }
  };
  const observer = scene.onBeforeRenderObservable.add(update);
  scene.onDisposeObservable.addOnce(() => scene.onBeforeRenderObservable.remove(observer));
  return meshes;
}
