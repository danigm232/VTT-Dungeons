import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import type { Scene } from '@babylonjs/core/scene.js';

const cache=new WeakMap<Scene,{diffuse:RawTexture;normal:RawTexture}>();
/** Deeply cracked, sea-mossy, salt-corroded Gold Dragon bone texture.
 * Procedurally generated once per scene and shared (WeakMap cache) by every skeletal remain.
 * Diffuse: fossilised gold base (#c4a85a) + deep cracks + marine moss + brine corrosion.
 * Normal: high-amplitude crack relief + barnacle/coral micro-roughness.
 * Constraints: size=256, bump name contains 'erosion-normal', cache shared. */
export function weatheredBoneMaterial(scene:Scene,name:string,color='#c4a85a'){
  let textures=cache.get(scene);
  if(!textures){
    const size=256,colour=new Uint8Array(size*size*4),normals=new Uint8Array(size*size*4);

    // Primary crack/grain field — same low-freq basis, but deeper crack shadow
    const sample=(x:number,y:number)=>{
      const u=x/size*Math.PI*2,v=y/size*Math.PI*2;
      const grain=Math.sin(u*53+v*61)*Math.cos(v*43-u*11);
      const vein=Math.abs(Math.sin(u*6+Math.sin(v*4)*1.8));
      // Sharpened crack (vein*30) + darker shadow (crack*.55)
      const crack=1-Math.min(1,vein*30),pit=grain>.72?.22:0;
      const erosion=.055*Math.sin(u*3+v*2)+.045*Math.cos(v*7-u*5);
      return .83+.08*grain-crack*.55-pit+erosion;
    };

    // High-freq barnacle/coral micro-roughness for normal only
    const micro=(x:number,y:number)=>{
      const u=x/size*Math.PI*14,v=y/size*Math.PI*14;
      return .08*(Math.sin(u*2.3+v*1.7)*Math.cos(v*3.1-u*2.9));
    };

    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const i=(y*size+x)*4;
      const n=sample(x,y);
      // Crack depth: pixels below 0.50 are deeply in a crack → add marine moss/algae
      const isCrack=n<0.50;
      const crackDepth=Math.max(0,(0.50-n)/0.50);
      // Salt crust: lighten ridges
      const salt=.030*Math.sin((x*2+y*3)/size*Math.PI*2);

      // --- Fossilised gold base: warm ocre (#c4a85a = 196,168,90) ---
      let rr=196/255,gg=168/255,bb=90/255;
      // Modulate by surface height
      rr*=n+salt; gg*=n; bb*=n*0.95;

      // --- Deep marine moss in crack zones: #4a6b45 = 74,107,69 ---
      if(isCrack){
        const mossFactor=crackDepth*0.78;
        rr=rr*(1-mossFactor)+(74/255)*mossFactor;
        gg=gg*(1-mossFactor)+(107/255)*mossFactor;
        bb=bb*(1-mossFactor)+(69/255)*mossFactor;
      }

      // --- Brine corrosion patches: brownish-red #7a4f2e = 122,79,46 in mid-range ---
      const corrodeNoise=Math.sin((x*7+y*13)/size*Math.PI*4)*Math.cos((x*11-y*5)/size*Math.PI*3);
      if(!isCrack && corrodeNoise>0.62){
        const cf=(corrodeNoise-0.62)/0.38*0.32;
        rr=rr*(1-cf)+(122/255)*cf;
        gg=gg*(1-cf)+(79/255)*cf;
        bb=bb*(1-cf)+(46/255)*cf;
      }

      colour[i]  =Math.min(255,Math.round(rr*255));
      colour[i+1]=Math.min(255,Math.round(gg*255));
      colour[i+2]=Math.min(255,Math.round(bb*255));
      colour[i+3]=255;

      // Normal map: high-amplitude cracks (×1.2) + micro barnacle layer
      const dx=(sample(x+1,y)-sample(x-1,y))*1.2+micro(x+1,y)-micro(x-1,y);
      const dy=(sample(x,y+1)-sample(x,y-1))*1.2+micro(x,y+1)-micro(x,y-1);
      normals[i]  =Math.round((.5-dx)*255);
      normals[i+1]=Math.round((.5-dy)*255);
      normals[i+2]=245;normals[i+3]=255;
    }

    const diffuse=RawTexture.CreateRGBATexture(colour,size,size,scene,true,false,Texture.TRILINEAR_SAMPLINGMODE);
    const normal =RawTexture.CreateRGBATexture(normals,size,size,scene,true,false,Texture.TRILINEAR_SAMPLINGMODE);
    diffuse.name='wreck:bone-erosion-colour';
    normal.name='wreck:bone-erosion-normal'; // test requires 'erosion-normal' in name
    normal.level=1.2; // amplified bump relief for dramatic cracks
    for(const t of [diffuse,normal]){t.wrapU=t.wrapV=Texture.WRAP_ADDRESSMODE;t.anisotropicFilteringLevel=8;}
    textures={diffuse,normal};cache.set(scene,textures);
  }
  const m=new StandardMaterial(name,scene);
  m.diffuseColor=Color3.FromHexString(color);
  m.diffuseTexture=textures.diffuse;
  m.bumpTexture=textures.normal;
  // Subdued specular — wet ancient bone, not shiny
  m.specularColor=Color3.FromHexString('#1a2218');
  m.specularPower=28;
  m.backFaceCulling=false;
  return m;
}
