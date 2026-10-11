import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import type { Scene } from '@babylonjs/core/scene.js';

const normalMaps=new WeakMap<Scene,RawTexture>();
/** Runtime normal detail, not replacement artwork or navigation geometry.
 * Salt-worn joints and longitudinal grain give the existing painted timber
 * contact-scale relief under moving light. Shared by the rebuilt wreck only. */
export function wornTimberRelief(scene:Scene,material:StandardMaterial){
  let texture=normalMaps.get(scene);
  if(!texture){
    const size=128,data=new Uint8Array(size*size*4);
    const height=(x:number,y:number)=>{
      const seam=(y%8+8)%8,distance=Math.min(seam,8-seam);
      const grain=Math.sin(y*2.1+Math.sin(x*.08))*.035+Math.sin(y*.51+x*.13)*.018;
      return grain-Math.exp(-distance*distance/.65)*.3;
    };
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const dx=(height(x+1,y)-height(x-1,y))*.55,dy=(height(x,y+1)-height(x,y-1))*.55;
      const length=Math.hypot(dx,dy,1),i=(y*size+x)*4;
      data[i]=Math.round(127.5*(1-dx/length));data[i+1]=Math.round(127.5*(1-dy/length));data[i+2]=Math.round(127.5*(1+1/length));data[i+3]=255;
    }
    texture=RawTexture.CreateRGBATexture(data,size,size,scene,true,false,Texture.TRILINEAR_SAMPLINGMODE);
    texture.name='wreck:shared-weathered-timber-normals';texture.wrapU=texture.wrapV=Texture.WRAP_ADDRESSMODE;
    texture.level=.7;normalMaps.set(scene,texture);
  }
  material.bumpTexture=texture;
}
