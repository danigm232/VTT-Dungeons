import type {Scene} from '@babylonjs/core/scene.js';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';
import {Color3} from '@babylonjs/core/Maths/math.color.js';
import {PointLight} from '@babylonjs/core/Lights/pointLight.js';
import type {DirectionalLight} from '@babylonjs/core/Lights/directionalLight.js';
import type {ArcRotateCamera} from '@babylonjs/core/Cameras/arcRotateCamera.js';
import type {ShadowGenerator} from '@babylonjs/core/Lights/Shadows/shadowGenerator.js';

/** Correct the existing shadow system's world focus after the A1 translation. */
export function refineRetreatLighting(scene:Scene){
 const sun=scene.getLightByName('camp-key:camp-a1-rooms') as DirectionalLight|null;
 const ambient=scene.getLightByName('camp-ambient:camp-a1-rooms');
 let lastKey='',lastCasters=-1;
 const lights=[{id:'a3',at:new Vector3(118.5,20.2,57),range:7},{id:'a4',at:new Vector3(105,20.2,60),range:8}].map(({id,at,range})=>{
  const l=new PointLight('retreat:existing-interior-fill:'+id,at,scene);l.diffuse=Color3.FromHexString('#ffdcad');l.specular=Color3.Black();l.intensity=.24;l.range=range;l.renderPriority=30;
  l.includedOnlyMeshes=scene.meshes.filter(m=>m.metadata?.retreatZone===id||m.name.startsWith(id.toUpperCase()+'_')||m.metadata?.gltf?.extras?.globalZone===id);
  return l;
 });
 scene.onDisposeObservable.addOnce(()=>lights.forEach(l=>l.dispose()));
 return {update(point:Vector3|null){
  if(ambient)ambient.diffuse=Color3.Lerp(ambient.diffuse,Color3.FromHexString('#c6d5db'),.3);
  if(!sun)return;
  sun.diffuse=Color3.Lerp(sun.diffuse,Color3.FromHexString('#eee1c8'),.25);
  const camera=scene.activeCamera as ArcRotateCamera|null;if(!camera)return;
  const half=Math.abs(camera.orthoTop??20),focus=half>20?camera.target:point??camera.target;
  const at=new Vector3(Math.round(focus.x*2)/2,Math.round(focus.y*2)/2,Math.round(focus.z*2)/2);
  const span=Math.max(25,Math.min(210,half*2.5));
  sun.position.copyFrom(at.subtract(sun.direction.normalizeToNew().scale(85)));sun.shadowFrustumSize=span;sun.shadowMinZ=.1;sun.shadowMaxZ=200;
  const map=sun.getShadowGenerator() as ShadowGenerator|null,key=at.asArray().join(',')+':'+Math.round(span);
  if(map){map.bias=.0012;map.normalBias=.025;const target=map.getShadowMap();if(target?.renderList&&lastCasters!==scene.meshes.length){target.renderList=target.renderList.filter(m=>!['sky','water-context'].includes(m.metadata?.gltf?.extras?.role)&&!/bay-background|shore-wash/.test(m.name));lastCasters=scene.meshes.length;}if(lastKey!==key){target?.resetRefreshCounter();lastKey=key;}}
 },stats:{newShadowMaps:0,interiorFillLights:2,worldShadowFocus:true}};
}
