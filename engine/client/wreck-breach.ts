import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { Vector3,Quaternion } from '@babylonjs/core/Maths/math.vector.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import type { BaseTexture } from '@babylonjs/core/Materials/Textures/baseTexture.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { WRECK_STRUCTURE as S } from '../shared/wreck-structure.js';
import { worldSurfaceUV } from './diorama-kit.js';
import { wornTimberRelief } from './wreck-materials.js';

/** A short physical reveal of the submerged hold remains visible from sea.
 * Interior cutaway meshes take over once inside. No portal painting, fake
 * treasure or collision: its centre is the existing P16 route. */
export function buildSternBreach(scene:Scene,texture?:BaseTexture){
  const wood=new StandardMaterial('wreck-breach:inner-timber',scene);
  wood.diffuseColor=Color3.FromHexString('#aaa17d');wood.diffuseTexture=texture??null;
  wood.specularColor=Color3.Black();wood.backFaceCulling=false;if(texture)wornTimberRelief(scene,wood);
  const end=wood.clone('wreck-breach:splinter-grain');end.diffuseColor=Color3.FromHexString('#c2ac81');
  const groups=new Map<StandardMaterial,Mesh[]>();
  const at=(x:number,y:number,z:number)=>new Vector3(S.origin.x+x,y,S.origin.z+z);
  const add=(m:Mesh,material=wood)=>{m.material=material;worldSurfaceUV(m,4.5);const g=groups.get(material)??[];g.push(m);groups.set(material,g);return m;};
  const beam=(id:string,a:Vector3,b:Vector3,w:number)=>{const d=b.subtract(a),m=MeshBuilder.CreateBox(`wreck-breach:${id}`,{width:w,depth:w,height:d.length()},scene);m.position.copyFrom(a.add(b).scale(.5));m.rotationQuaternion=Quaternion.FromUnitVectorsToRef(Vector3.Up(),d.normalize(),new Quaternion());return add(m,end);};
  const floor=MeshBuilder.CreateGround('wreck-breach:hold-floor',{width:5.1,height:4.9},scene);
  floor.position.copyFrom(at(S.sternX+2.5,-6.415,0));add(floor);
  for(const side of [-1,1]){
    const wall=MeshBuilder.CreateBox(`wreck-breach:lining:${side}`,{width:4.7,height:2.75,depth:.13},scene);
    wall.position.copyFrom(at(S.sternX+2.4,-5.015,side*2.40));add(wall);
    for(let i=0;i<4;i++)beam(`exposed-frame:${side}:${i}`,at(S.sternX+.2+i*1.2,-6.32,side*2.32),at(S.sternX+.2+i*1.2,-3.76,side*2.32),.16);
    for(let i=0;i<8;i++){
      const y=-6.15+i*.34,z=side*(1.08+.15*Math.sin(i*2.7));
      beam(`torn-edge:${side}:${i}`,at(S.sternX,y,z+side*.65),at(S.sternX-.20-(i%3)*.10,y+.04,z),.075);
    }
  }
  // The lower broken sill sits below the swimming opening, never across it.
  for(let i=0;i<7;i++)beam(`broken-sill:${i}`,at(S.sternX-.02,-6.34,(i-3)*.32),at(S.sternX-.22,-6.13+(i%3)*.035,(i-3)*.32+.06),.055);
  return [...groups].flatMap(([material,parts])=>{const m=Mesh.MergeMeshes(parts,true,true,undefined,false,false);if(!m)return [];
    m.name=`wreck-breach:batch:${material.name}`;m.isPickable=false;m.receiveShadows=true;
    m.metadata={visualOnly:true,deckSurfaceId:'sea',kind:'stern-breach-reveal'};return [m];});
}
