import type {Scene} from '@babylonjs/core/scene.js';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';
import {Color3} from '@babylonjs/core/Maths/math.color.js';
import {PointLight} from '@babylonjs/core/Lights/pointLight.js';
import {Light} from '@babylonjs/core/Lights/light.js';
import type {DirectionalLight} from '@babylonjs/core/Lights/directionalLight.js';
import type {ArcRotateCamera} from '@babylonjs/core/Cameras/arcRotateCamera.js';
import type {ShadowGenerator} from '@babylonjs/core/Lights/Shadows/shadowGenerator.js';
import type {AbstractMesh} from '@babylonjs/core/Meshes/abstractMesh.js';

/** Exterior stone skins receive light, but do not need to be rendered six times
 * into the small interior flame cube maps. Canonical walls/props remain casters. */
export function retreatStoneShadowCasters<T extends AbstractMesh>(meshes:T[],pointLight=false):T[]{return meshes.filter(mesh=>mesh.metadata?.stoneShadowCaster!==false&&(!pointLight||!mesh.metadata?.stoneStage));}

/** Correct the existing shadow system's world focus after the A1 translation. */
export function refineRetreatLighting(scene:Scene,expanded=true,finishStage=0,polished=false,round2=false){
 const sun=scene.getLightByName('camp-key:camp-a1-rooms') as DirectionalLight|null;
 const ambient=scene.getLightByName('camp-ambient:camp-a1-rooms');
 if(polished&&sun)sun.direction.set(-.68,-1,-.38);
 let lastKey='',lastCasters=-1;
 const lights=[{id:'a3',at:expanded?(round2?new Vector3(118.5,20.4,55.3):new Vector3(118.5,20.2,55)):new Vector3(118.5,20.2,57),range:expanded?11:7},{id:'a4',at:expanded?(round2?new Vector3(103.5,20.5,57.75):new Vector3(104,20.2,57)):new Vector3(105,20.2,60),range:expanded?12:8}].map(({id,at,range})=>{
  const l=new PointLight('retreat:existing-interior-fill:'+id,at,scene);l.diffuse=Color3.FromHexString('#ffdcad');l.specular=Color3.Black();l.intensity=id==='a3'&&finishStage>=2?.36:id==='a4'&&finishStage>=3?.32:.24;l.range=range;l.renderPriority=30;
  if(round2){l.diffuse=Color3.FromHexString('#ffd2a4');l.intensity=id==='a3'?.90:.72;}
  // These are the pre-existing room fills, authored by range. Explicit falloff
  // keeps their reach consistent across the PBR/Standard distance transition.
  if(polished)l.falloffType=Light.FALLOFF_STANDARD;
  l.includedOnlyMeshes=scene.meshes.filter(m=>m.metadata?.retreatZone===id||m.name.startsWith(id.toUpperCase()+'_')||m.metadata?.gltf?.extras?.globalZone===id);
  return l;
 });
 scene.onDisposeObservable.addOnce(()=>lights.forEach(l=>l.dispose()));
 return {update(point:Vector3|null){
  if(ambient)ambient.diffuse=Color3.Lerp(ambient.diffuse,Color3.FromHexString('#c6d5db'),.3);
  // The camp owner resets these base intensities immediately before this
  // update; the maritime balance is applied once, never accumulated.
  if(polished&&ambient)ambient.intensity*=.92;
  if(!sun)return;
  sun.diffuse=Color3.Lerp(sun.diffuse,Color3.FromHexString('#eee1c8'),.25);
  if(polished)sun.intensity*=1.07;
  const camera=scene.activeCamera as ArcRotateCamera|null;if(!camera)return;
  const half=Math.abs(camera.orthoTop??20),focus=half>20?camera.target:point??camera.target;
  const at=new Vector3(Math.round(focus.x*2)/2,Math.round(focus.y*2)/2,Math.round(focus.z*2)/2);
  const span=Math.max(25,Math.min(210,half*2.5));
  sun.position.copyFrom(at.subtract(sun.direction.normalizeToNew().scale(85)));sun.shadowFrustumSize=span;sun.shadowMinZ=.1;sun.shadowMaxZ=200;
  const map=sun.getShadowGenerator() as ShadowGenerator|null,key=at.asArray().join(',')+':'+Math.round(span);
  if(map){map.bias=.0012;map.normalBias=.025;const target=map.getShadowMap();if(target?.renderList&&lastCasters!==scene.meshes.length){target.renderList=retreatStoneShadowCasters(target.renderList).filter(m=>!['sky','water-context'].includes(m.metadata?.gltf?.extras?.role)&&!/bay-background|shore-wash/.test(m.name));lastCasters=scene.meshes.length;}if(lastKey!==key){target?.resetRefreshCounter();lastKey=key;}}
  // CampShadows rebuilds its local list every update; trim only the added stone
  // after that existing owner runs. The sun keeps the exposed cliff silhouette.
  for(const light of scene.lights)if(light instanceof PointLight){const local=(light.getShadowGenerator() as ShadowGenerator|null)?.getShadowMap();if(local?.renderList)local.renderList=retreatStoneShadowCasters(local.renderList,true);}
 },stats:{newShadowMaps:0,interiorFillLights:2,additionalPolishLights:0,consistentInteriorFalloff:polished,worldShadowFocus:true,polished,round2,ambientFactor:polished?.92:1,sunFactor:polished?1.07:1}};
}
