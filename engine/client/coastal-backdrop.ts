import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { illustratedMaterial } from './diorama-kit.js';

/** A world-space bay below the playable terrace, not a camera-fixed backdrop. */
export function createCoastalBackdrop(scene:Scene,root:TransformNode,url:string) {
  const material=illustratedMaterial(scene,'a1:sheltered-bay','#8cafb5',url,18);
  material.specularColor=Color3.FromHexString('#182a30');material.specularPower=64;
  const sea=MeshBuilder.CreateGround('a1:bay-background',{width:360,height:360,subdivisions:1},scene);
  sea.position=new Vector3(28.5,-9.15,22);sea.parent=root;sea.material=material;sea.isPickable=false;sea.checkCollisions=false;
  sea.metadata={content:'VTT_AMBIENCE',decorativeOnly:true,heightBelowTerraceMeters:9.15};
  const texture=material.diffuseTexture;
  const reduced=typeof window!=='undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return {sea,update(time:number,dark:number){
    material.diffuseColor=Color3.Lerp(Color3.FromHexString('#34495d'),Color3.FromHexString('#94bfc1'),1-dark);
    material.emissiveColor=Color3.FromHexString('#133046').scale(.045+dark*.025);
    if(texture && 'uOffset' in texture && 'vOffset' in texture) {
      texture.uOffset=reduced?0:time*.0013;texture.vOffset=reduced?0:Math.sin(time*.025)*.035;
    }
  }};
}
