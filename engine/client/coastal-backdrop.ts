import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { illustratedMaterial } from './diorama-kit.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';

/** A world-space bay below the playable terrace, not a camera-fixed backdrop. */
export function createCoastalBackdrop(scene:Scene,root:TransformNode,url:string) {
  const material=illustratedMaterial(scene,'a1:sheltered-bay','#8cafb5',url,18);
  material.specularColor=Color3.FromHexString('#182a30');material.specularPower=64;
  // The broad sea plane sits below the cliff and must not fall into the
  // mountain's shadow; its phase tint supplies the distant atmospheric value.
  material.disableLighting=true;
  const sea=MeshBuilder.CreateGround('a1:bay-background',{width:360,height:360,subdivisions:1},scene);
  sea.position=new Vector3(28.5,-9.15,22);sea.parent=root;sea.material=material;sea.isPickable=false;sea.checkCollisions=false;
  sea.metadata={content:'VTT_AMBIENCE',decorativeOnly:true,heightBelowTerraceMeters:9.15};
  const texture=material.diffuseTexture;
  // Thin broken shore wash, in world space at the cliff foot. A single extra batch.
  const foamMaterial=illustratedMaterial(scene,'a1:shore-wash','#c4e4df');
  foamMaterial.disableLighting=true;foamMaterial.backFaceCulling=false;foamMaterial.alpha=.48;
  const strips:Mesh[]=[];
  for(let section=0;section<17;section++){
    const paths:Vector3[][]=[];
    for(let row=0;row<3;row++){
      const points:Vector3[]=[];
      for(let i=0;i<=12;i++){
        const x=-14+section*5.2+i*.38;
        points.push(new Vector3(x,-9.06,30.65+Math.sin(x*.31)*.72+Math.sin(x*2.1)*.13+row*.42));
      }
      paths.push(points);
    }
    const strip=MeshBuilder.CreateRibbon('a1:shore-wash-strip',{pathArray:paths},scene),colors:number[]=[];
    for(let row=0;row<3;row++)for(let i=0;i<=12;i++)colors.push(1,1,1,row===1?Math.sin(i/12*Math.PI)*(.5+.5*Math.sin(i*2+section)**2):0);
    strip.setVerticesData('color',colors);strip.hasVertexAlpha=true;strip.material=foamMaterial;strips.push(strip);
  }
  const foam=Mesh.MergeMeshes(strips,true,true)!;foam.name='a1:shore-wash';foam.parent=root;foam.isPickable=false;foam.checkCollisions=false;
  foam.metadata={content:'VTT_AMBIENCE',decorativeOnly:true};
  const reduced=typeof window!=='undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return {sea,update(time:number,dark:number){
    material.diffuseColor=Color3.Lerp(Color3.FromHexString('#34495d'),Color3.FromHexString('#94bfc1'),1-dark);
    material.emissiveColor=Color3.Lerp(Color3.FromHexString('#071725'),Color3.FromHexString('#284f5c'),1-dark);
    foamMaterial.alpha=(.34+(reduced?0:Math.sin(time*.72)*.09))*(1-dark*.48);
    foam.position.z=reduced?0:Math.sin(time*.72)*.34;
    foam.scaling.z=reduced?1:1+Math.sin(time*.72+.9)*.08;
    if(texture && 'uOffset' in texture && 'vOffset' in texture) {
      texture.uOffset=reduced?0:time*.0013;texture.vOffset=reduced?0:Math.sin(time*.025)*.035;
    }
  }};
}
