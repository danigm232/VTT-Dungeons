import type {Scene} from '@babylonjs/core/scene.js';
import type {Material} from '@babylonjs/core/Materials/material.js';
import {PBRMaterial} from '@babylonjs/core/Materials/PBR/pbrMaterial.js';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial.js';
import {Texture} from '@babylonjs/core/Materials/Textures/texture.js';
import {Color3} from '@babylonjs/core/Maths/math.color.js';
import {worldSurfaceUV} from '../../../engine/client/diorama-kit.js';
import {Mesh} from '@babylonjs/core/Meshes/mesh.js';

/** One shared PBR library for this scene. Existing camp scenes keep their own materials. */
export function upgradeRetreatMaterials(scene:Scene){
 const source=(name:string)=>scene.materials.find(m=>m.name===name&&m.getClassName()==='StandardMaterial') as any;
 const albedo={rock:source('a1:coastal-cliff-v10')?.diffuseTexture,wood:source('a1:oak-v5')?.diffuseTexture,paving:source('a1:limestone-v5')?.diffuseTexture,limestone:source('a1:limestone-v5')?.diffuseTexture};
 const library=new Map<string,PBRMaterial>(),normals=new Map<string,Texture>(),orms=new Map<string,Texture>(),fallbacks=new Map<Material,Material>();let assigned=0;
 const tex=(kind:string,channel:'normal'|'orm')=>{const cache=channel==='normal'?normals:orms;let t=cache.get(kind);if(!t){t=new Texture(`/art/retreat-refinement/${kind}-${channel}-v1.png`,scene,false,false,Texture.TRILINEAR_SAMPLINGMODE);t.gammaSpace=false;t.anisotropicFilteringLevel=8;t.wrapU=t.wrapV=Texture.WRAP_ADDRESSMODE;if(channel==='normal')t.level=kind==='rock'?.45:kind==='wood'?.28:.18;cache.set(kind,t);}return t;};
 function replacement(old:Material|null):Material|null{
  if(!old)return old;
  if('subMaterials' in old){(old as any).subMaterials=(old as any).subMaterials.map((m:Material|null)=>replacement(m));return old;}
  const n=old.name.toLowerCase();if(/bay|water|shore-wash|flame|glow|halo|shadow|coal|glass|existing_vtt|ambient-life|painted-foliage/.test(n))return old;
  const category=/wood_|oak-v5/.test(n)?'wood':/iron|brass/.test(n)?'metal':/stone_floor|plaza|cell-floor/.test(n)?'paving':/stone_bahamut|limestone/.test(n)||n.startsWith('a1:dragon:')&&!/eye|mouth|dark|claw|horn/.test(n)?'limestone':/basalt|carved-cliff/.test(n)?'carved':/coastal-cliff/.test(n)?'rock':null;
  if(!category)return old;const sourceTexture=(old as any).diffuseTexture??(old as any).albedoTexture,cacheKey=category+(category==='paving'?':'+(sourceTexture?.name??'limestone'):'');let p=library.get(cacheKey);if(p)return p;
  const kind=category==='wood'?'wood':category==='metal'?'metal':'rock';p=new PBRMaterial('retreat:pbr:'+category,scene);p.metallic=1;p.roughness=1;p.metallicTexture=tex(kind,'orm');p.bumpTexture=tex(kind,'normal');p.useRoughnessFromMetallicTextureAlpha=false;p.useRoughnessFromMetallicTextureGreen=true;p.useMetallnessFromMetallicTextureBlue=true;p.useAmbientOcclusionFromMetallicTextureRed=true;p.maxSimultaneousLights=4;p.environmentIntensity=.45;
  const color=({rock:'#85918e',carved:'#a1aba3',paving:'#d0cabc',wood:'#b99672',metal:'#565c5d',limestone:'#d4d3c4'} as Record<string,string>)[category]!;p.albedoColor=Color3.FromHexString(color);p.emissiveColor=p.albedoColor.scale(category==='paving'?.025:.012);
  p.albedoTexture=category==='metal'?null:sourceTexture??albedo[category==='carved'?'rock':category as keyof typeof albedo]??null;p.backFaceCulling=false;p.metadata={provenance:'VTT_AMBIENCE',phase:4,category};library.set(cacheKey,p);return p;
 }
 function distant(high:Material|null):Material|null{
  if(!high)return high;const cached=fallbacks.get(high);if(cached)return cached;
  if('subMaterials' in high){const children=(high as any).subMaterials as (Material|null)[],low=children.map(distant);if(low.every((m,i)=>m===children[i]))return high;const clone=high.clone(high.name+':distant') as any;clone.subMaterials=low;fallbacks.set(high,clone);return clone;}
  if(!(high instanceof PBRMaterial)||high.metadata?.phase!==4)return high;
  const m=new StandardMaterial(high.name+':distant',scene);m.diffuseColor=high.albedoColor.clone();m.diffuseTexture=high.albedoTexture;m.emissiveColor=high.emissiveColor.clone();m.specularColor=new Color3(.035,.035,.035);m.specularPower=24;m.backFaceCulling=false;m.twoSidedLighting=true;m.maxSimultaneousLights=4;m.metadata={phase:4,quality:'distant',sameAlbedoAs:high.name};fallbacks.set(high,m);return m;
 }
 const assignments:{mesh:typeof scene.meshes[number];high:Material|null;low:Material|null}[]=[];
 for(const mesh of [...scene.meshes]){if(mesh instanceof Mesh&&/a1:.*(lit-floor|static:a1:plaza)/.test(mesh.name))worldSurfaceUV(mesh,3.3);const old=mesh.material,next=replacement(old);if(next!==old){mesh.material=next;assigned++;}const low=distant(next);if(low!==next)assignments.push({mesh,high:next,low});}
 let detail:boolean|null=null;const stats={materials:library.size,normalMaps:normals.size,roughnessMetallicMaps:orms.size,assignedMeshes:assigned,albedoImagesReused:true,distantMaterialLod:true,quality:'initializing'};
 function update(){const camera=scene.activeCamera as any,near=Math.abs(camera?.orthoTop??8)<16;if(near===detail)return;detail=near;stats.quality=near?'PBR detail':'shared distant materials';for(const a of assignments)a.mesh.material=near?a.high:a.low;}
 return {stats,update};
}
