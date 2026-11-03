import type {Scene} from '@babylonjs/core/scene.js';
import {RawTexture} from '@babylonjs/core/Materials/Textures/rawTexture.js';
import {Texture} from '@babylonjs/core/Materials/Textures/texture.js';

/** One small, opaque needle surface for the existing solid crowns. A periodic
 * raster of branchlets avoids the unrelated flower-card atlas. No animation,
 * downloads, per-tree textures or camera-facing scenery are involved. */
export function createRetreatNeedleSurface(scene:Scene){
 const size=256,pixels=new Uint8Array(size*size*3);let seed=261026;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const n=5*Math.sin(x*Math.PI/32)*Math.sin(y*Math.PI/64)+(random()-.5)*6,i=(y*size+x)*3;pixels[i]=33+n;pixels[i+1]=49+n;pixels[i+2]=24+n*.5;}
 function stroke(x:number,y:number,angle:number,length:number,bright:boolean){
  for(let s=0;s<length;s+=.7){const xx=((Math.round(x+Math.cos(angle)*s)%size)+size)%size,yy=((Math.round(y+Math.sin(angle)*s)%size)+size)%size,i=(yy*size+xx)*3,t=s/length;
   pixels[i]=bright?47-t*12:22;pixels[i+1]=bright?70-t*17:36;pixels[i+2]=bright?31-t*8:19;
  }
 }
 for(let branch=0;branch<280;branch++){const x=random()*size,y=random()*size,angle=random()*Math.PI*2;for(let k=0;k<8;k++){const px=x+Math.cos(angle)*k,py=y+Math.sin(angle)*k;for(const side of [-1,1])stroke(px,py,angle+side*.82,3+random()*4,branch%3!==0);}}
 const texture=RawTexture.CreateRGBTexture(pixels,size,size,scene,true,false,Texture.TRILINEAR_SAMPLINGMODE);texture.name='retreat:e1-shared-needle-surface';texture.gammaSpace=true;texture.wrapU=texture.wrapV=Texture.WRAP_ADDRESSMODE;texture.anisotropicFilteringLevel=8;texture.uScale=2;texture.vScale=3;return texture;
}
