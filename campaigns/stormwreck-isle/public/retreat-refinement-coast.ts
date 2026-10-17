import type {Scene} from '@babylonjs/core/scene.js';
import {Mesh} from '@babylonjs/core/Meshes/mesh.js';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial.js';
import {Color3} from '@babylonjs/core/Maths/math.color.js';
import {Texture} from '@babylonjs/core/Materials/Textures/texture.js';

/** Refines the already animated sea and foam, without changing any land surface. */
export function refineRetreatCoast(scene:Scene){
 const sea=scene.getMeshByName('a1:bay-background') as Mesh|null;
 const foam=scene.getMeshByName('a1:shore-wash') as Mesh|null;
 if(sea){sea.scaling.x=sea.scaling.z=3;sea.computeWorldMatrix(true);const m=sea.material as StandardMaterial;m.specularPower=96;if(m.diffuseTexture instanceof Texture){m.diffuseTexture.uScale=m.diffuseTexture.vScale=18;}}
 // The GLB includes the native sea counterpart; the existing VTT sea supplies animation.
 for(const m of scene.meshes){if(m.name==='P7_Extended_Existing_Sea')m.setEnabled(false);if(m.name==='P7_Maritime_Sky_Dome'){
  m.metadata={...m.metadata,tokenOccluder:false};m.isPickable=false;m.receiveShadows=false;m.infiniteDistance=true;
  const mat=new StandardMaterial('retreat:maritime-sky',scene);mat.disableLighting=true;mat.emissiveColor=Color3.White();mat.diffuseColor=Color3.White();mat.backFaceCulling=false;m.material=mat;
 }}
 let last=-Infinity;
 return {update(time:number){
  if(time>=last&&time-last<1/24)return;last=time;
  if(sea){const p=sea.getVerticesData('position'),at=sea.getAbsolutePosition();if(p){for(let i=0;i<p.length;i+=3){const x=p[i]!*3+at.x,z=p[i+2]!*3+at.z;if(x>0&&x<175&&z>43&&z<132)p[i+1]=Math.min(p[i+1]!, .08-at.y);}sea.updateVerticesData('position',p);}}
  if(foam){const p=foam.getVerticesData('position'),at=foam.getAbsolutePosition();if(p){const columns=97;for(let i=0;i<p.length;i+=3){const index=i/3,col=index%columns,row=Math.floor(index/columns),x=64.5+col/96*84.5;const phase=time*1.45+x*.15+row*.17;const shore=102.85+.38*Math.sin(x*.29)+.17*Math.sin(x*.79+1.4);p[i]=x-at.x;p[i+2]=shore+(row/11-.5)*2.4+.11*Math.sin(phase)-at.z;p[i+1]=.07+.045*Math.sin(phase)-at.y;}foam.updateVerticesData('position',p);}}
  if(sea?.material instanceof StandardMaterial){sea.material.diffuseColor=Color3.Lerp(sea.material.diffuseColor,Color3.FromHexString('#587d8b'),.24);sea.material.specularColor.scaleInPlace(.65);}
  scene.fogDensity=Math.max(scene.fogDensity,.00085);
  const sky=scene.getMeshByName('P7_Maritime_Sky_Dome');if(sky?.material instanceof StandardMaterial){const day=Math.max(.12,Math.min(1,(scene.clearColor.r-.035)/.19));sky.material.emissiveColor.set(day,day,day);}
 },stats:{expandedPlayableArea:false,seaSpanMeters:1080,newReflectionPasses:0}};
}
