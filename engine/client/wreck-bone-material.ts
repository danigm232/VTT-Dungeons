import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import type { Scene } from '@babylonjs/core/scene.js';

const cache=new WeakMap<Scene,{diffuse:RawTexture;normal:RawTexture}>();
/** Pitted, salt-eroded bone: real tiled colour/normal textures, not a flat
 * ivory tint. Generated once per scene and shared by every skeletal remain. */
export function weatheredBoneMaterial(scene:Scene,name:string,color='#aaa38c'){
  let textures=cache.get(scene);
  if(!textures){
    const size=256,colour=new Uint8Array(size*size*4),normals=new Uint8Array(size*size*4);
    const sample=(x:number,y:number)=>{
      const u=x/size*Math.PI*2,v=y/size*Math.PI*2;
      const grain=Math.sin(u*53+v*61)*Math.cos(v*43-u*11),vein=Math.abs(Math.sin(u*6+Math.sin(v*4)*1.8));
      const crack=1-Math.min(1,vein*22),pit=grain>.72?.22:0;
      const erosion=.055*Math.sin(u*3+v*2)+.045*Math.cos(v*7-u*5);
      return .83+.08*grain-crack*.32-pit+erosion;
    };
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const i=(y*size+x)*4,n=sample(x,y),salt=.035*Math.sin((x*2+y*3)/size*Math.PI*2);
      colour[i]=Math.round((n+salt)*255);colour[i+1]=Math.round(n*249);colour[i+2]=Math.round(n*228);colour[i+3]=255;
      const dx=(sample(x+1,y)-sample(x-1,y))*.55,dy=(sample(x,y+1)-sample(x,y-1))*.55;
      normals[i]=Math.round((.5-dx)*255);normals[i+1]=Math.round((.5-dy)*255);normals[i+2]=249;normals[i+3]=255;
    }
    const diffuse=RawTexture.CreateRGBATexture(colour,size,size,scene,true,false,Texture.TRILINEAR_SAMPLINGMODE),normal=RawTexture.CreateRGBATexture(normals,size,size,scene,true,false,Texture.TRILINEAR_SAMPLINGMODE);
    diffuse.name='wreck:bone-erosion-colour';normal.name='wreck:bone-erosion-normal';normal.level=.9;
    for(const t of [diffuse,normal]){t.wrapU=t.wrapV=Texture.WRAP_ADDRESSMODE;t.anisotropicFilteringLevel=8;}
    textures={diffuse,normal};cache.set(scene,textures);
  }
  const m=new StandardMaterial(name,scene);m.diffuseColor=Color3.FromHexString(color);m.diffuseTexture=textures.diffuse;m.bumpTexture=textures.normal;
  m.specularColor=Color3.FromHexString('#17201b');m.specularPower=18;m.backFaceCulling=false;return m;
}
