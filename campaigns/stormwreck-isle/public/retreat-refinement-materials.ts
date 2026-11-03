import type {Scene} from '@babylonjs/core/scene.js';

/** A distant backdrop stays on the shared distant material even when the
 * tactical camera zooms in on a nearby character. Original meshes opt in only. */
export function retreatMeshUsesDetail(near:boolean,metadata?:{preferDistantMaterial?:boolean}|null){return near&&metadata?.preferDistantMaterial!==true;}
import type {Material} from '@babylonjs/core/Materials/material.js';
import {PBRMaterial} from '@babylonjs/core/Materials/PBR/pbrMaterial.js';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial.js';
import {Texture} from '@babylonjs/core/Materials/Textures/texture.js';
import {Color3} from '@babylonjs/core/Maths/math.color.js';
import {worldSurfaceUV} from '../../../engine/client/diorama-kit.js';
import {Mesh} from '@babylonjs/core/Meshes/mesh.js';
import {InstancedMesh} from '@babylonjs/core/Meshes/instancedMesh.js';
import {VertexBuffer} from '@babylonjs/core/Buffers/buffer.js';
import {refineMineralSurface} from './retreat-mineral-surface.js';

/** The exported stone colors have alpha 1. Rebinding glTF meshes to our shared
 * materials must not turn those RGBA streams into transparent, unsorted faces.
 * Mesh visibility still controls the existing foreground fade. */
export function applyRetreatStoneVertexOpacity(mesh:Mesh){mesh.hasVertexAlpha=false;}

/** One shared PBR library for this scene. Existing camp scenes keep their own materials. */
export function upgradeRetreatMaterials(scene:Scene,stoneStage=0,polished=false,consistentBackfaces=false,round2=false,round3=false){
 const source=(name:string)=>scene.materials.find(m=>m.name===name&&m.getClassName()==='StandardMaterial') as any;
 const albedo={rock:source('a1:coastal-cliff-v10')?.diffuseTexture,wood:source('a1:oak-v5')?.diffuseTexture,paving:source('a1:limestone-v5')?.diffuseTexture,limestone:source('a1:limestone-v5')?.diffuseTexture};
 const basalt=stoneStage>=1?new Texture(new URL('./art/retreat-stone/basalt-coastal-albedo-v1.webp',import.meta.url).href,scene,false,false,Texture.TRILINEAR_SAMPLINGMODE):null;
 if(basalt){basalt.anisotropicFilteringLevel=8;basalt.wrapU=basalt.wrapV=Texture.WRAP_ADDRESSMODE;if(polished)basalt.uScale=basalt.vScale=.34;}
 const library=new Map<string,PBRMaterial>(),normals=new Map<string,Texture>(),orms=new Map<string,Texture>(),fallbacks=new Map<Material,Material>();let assigned=0,islandLow:StandardMaterial|null=null;
 const tex=(kind:string,channel:'normal'|'orm')=>{const cache=channel==='normal'?normals:orms;let t=cache.get(kind);if(!t){t=new Texture(`/art/retreat-refinement/${kind}-${channel}-v1.png`,scene,false,false,Texture.TRILINEAR_SAMPLINGMODE);t.gammaSpace=false;t.anisotropicFilteringLevel=8;t.wrapU=t.wrapV=Texture.WRAP_ADDRESSMODE;if(channel==='normal')t.level=kind==='rock'?(polished?.24:.45):kind==='wood'?.28:.18;if(polished&&kind==='rock')t.uScale=t.vScale=1.4;cache.set(kind,t);}return t;};
 function replacement(old:Material|null,sculptedStone=false,woodRole=''):Material|null{
  if(!old)return old;
  if('subMaterials' in old){(old as any).subMaterials=(old as any).subMaterials.map((m:Material|null)=>replacement(m,sculptedStone,woodRole));return old;}
  const n=old.name.toLowerCase();if(/bay|water|shore-wash|flame|glow|halo|shadow|coal|glass|existing_vtt|ambient-life|painted-foliage/.test(n))return old;
  const category=sculptedStone?'sculpture':polished&&/earth-v6/.test(n)?'soil':/wood_|oak-v5/.test(n)?'wood':/iron|brass/.test(n)?'metal':/stone_floor|plaza|cell-floor/.test(n)?'paving':/stone_bahamut|limestone/.test(n)||n.startsWith('a1:dragon:')&&!/eye|mouth|dark|claw|horn/.test(n)?'limestone':/basalt|carved-cliff/.test(n)?'carved':/coastal-cliff/.test(n)?'rock':null;
  if(!category)return old;
  // Three finishes share the existing wood images and ORM/normal maps. Keep
  // the original camp's oak material on its legacy finish so canonical cell
  // furniture is not recoloured as a side effect of the imported-room pass.
  const woodFinish=round2&&category==='wood'&&/^wood_/.test(n)?/endgrain/.test(n)?'endgrain':/winch|timber|roof|dock-post|cliff-rail|cargo/.test(woodRole)?'structural':'planks':'';
  const sourceTexture=(old as any).diffuseTexture??(old as any).albedoTexture,cacheKey=category+(category==='paving'?':'+(sourceTexture?.name??'limestone'):'')+(woodFinish?':'+woodFinish:'');let p=library.get(cacheKey);if(p)return p;
  const kind=category==='wood'?'wood':category==='metal'?'metal':'rock';p=new PBRMaterial('retreat:pbr:'+category+(woodFinish?':'+woodFinish:''),scene);p.metallic=1;p.roughness=woodFinish==='planks'?.93:woodFinish==='structural'?.98:1;p.metallicTexture=tex(kind,'orm');p.bumpTexture=tex(kind,'normal');p.useRoughnessFromMetallicTextureAlpha=false;p.useRoughnessFromMetallicTextureGreen=true;p.useMetallnessFromMetallicTextureBlue=true;p.useAmbientOcclusionFromMetallicTextureRed=true;p.maxSimultaneousLights=4;p.environmentIntensity=round2&&category==='sculpture'?.32:.45;
  const naturalStone=category==='rock'||category==='carved';
  const color=woodFinish?({planks:'#b28f67',endgrain:'#927052',structural:'#a3815e'} as Record<string,string>)[woodFinish]!:round2&&category==='sculpture'?'#b7ae97':basalt&&naturalStone?(category==='carved'?(polished?'#b2b8af':'#bdc0c3'):(polished?'#aab4ad':'#b6bcc1')):({rock:'#85918e',carved:'#a1aba3',paving:polished?'#b9b6a7':'#d0cabc',wood:'#b99672',metal:'#565c5d',limestone:'#d4d3c4',sculpture:'#ddd3b9',soil:'#bbbba1'} as Record<string,string>)[category]!;p.albedoColor=Color3.FromHexString(color);p.emissiveColor=p.albedoColor.scale(category==='paving'?(polished?.006:.025):.012);
  if(category==='soil'){p.metallic=0;p.roughness=.98;p.metallicTexture=null;p.bumpTexture=null;}
  // Sculptures need fine stone relief; a paving pattern across the face masks
  // its anatomy. Keep the shared normal/roughness maps and warm mineral tint.
  p.albedoTexture=category==='metal'||category==='sculpture'?null:basalt&&naturalStone?basalt:woodFinish?albedo.wood??sourceTexture??null:sourceTexture??albedo[category==='carved'?'rock':category as keyof typeof albedo]??null;p.backFaceCulling=false;p.twoSidedLighting=consistentBackfaces;p.metadata={provenance:'VTT_AMBIENCE',phase:4,category,stoneStage:basalt&&naturalStone?1:0,...round2?{woodFinish:woodFinish||null,visualRound2:true}:{}};library.set(cacheKey,p);return p;
 }
 function distant(high:Material|null):Material|null{
  if(!high)return high;const cached=fallbacks.get(high);if(cached)return cached;
  if('subMaterials' in high){const children=(high as any).subMaterials as (Material|null)[],low=children.map(distant);if(low.every((m,i)=>m===children[i]))return high;const clone=high.clone(high.name+':distant') as any;clone.subMaterials=low;fallbacks.set(high,clone);return clone;}
  if(!(high instanceof PBRMaterial)||high.metadata?.phase!==4)return high;
  const m=new StandardMaterial(high.name+':distant',scene);m.diffuseColor=high.albedoColor.clone();m.diffuseTexture=high.albedoTexture;m.emissiveColor=high.emissiveColor.clone();m.specularColor=new Color3(.035,.035,.035);m.specularPower=24;m.backFaceCulling=false;m.twoSidedLighting=true;m.maxSimultaneousLights=4;m.metadata={phase:4,quality:'distant',sameAlbedoAs:high.name};fallbacks.set(high,m);return m;
 }
 function islandBackdrop(high:Material|null){
  const low=distant(high);if(!(low instanceof StandardMaterial))return low;
  if(!islandLow){
   islandLow=low.clone('retreat:island-shared-low')!;islandLow.maxSimultaneousLights=2;
   // Keep the same cached GPU albedo image. Only the large backdrop's sampler
   // wrapper reduces grazing-angle anisotropy; original stone stays at 8x.
   if(low.diffuseTexture instanceof Texture){islandLow.diffuseTexture=low.diffuseTexture.clone();islandLow.diffuseTexture.name='retreat:island-shared-albedo-sampler';islandLow.diffuseTexture.anisotropicFilteringLevel=1;}
   islandLow.metadata={phase:4,quality:'island-background',sharedAlbedoImage:true};
  }
  return islandLow;
 }
 const assignments:{mesh:typeof scene.meshes[number];high:Material|null;low:Material|null}[]=[],mineralRecords:NonNullable<ReturnType<typeof refineMineralSurface>>[]=[];
 for(const mesh of [...scene.meshes]){
  if(mesh instanceof InstancedMesh)continue;
  if(mesh instanceof Mesh&&/a1:.*(lit-floor|static:a1:plaza)/.test(mesh.name))worldSurfaceUV(mesh,3.3);
  const templeStone=mesh.metadata?.retreatAuthoredRevision==='V3'||round2&&mesh.metadata?.retreatZone==='a5';
  const sculpted=templeStone&&(/CANON_Bahamut_Kind_Elder|CANON_Canary_V3_|CANON_Column_/.test(mesh.name)||round2&&/CANON_Bahamut_Pedestal/.test(mesh.name));
  const role=mesh.metadata?.gltf?.extras?.role??mesh.parent?.metadata?.gltf?.extras?.role??'';
  const old=mesh.material,next=replacement(old,sculpted,role);if(next!==old){mesh.material=next;assigned++;}
  if(round2&&sculpted&&mesh instanceof Mesh&&!mesh.metadata?.retreatRound2FineStone){
   const sourceUV=mesh.getVerticesData(VertexBuffer.UVKind);
   if(sourceUV){mesh.makeGeometryUnique();const uv=new Float32Array(sourceUV.length);for(let i=0;i<uv.length;i++)uv[i]=sourceUV[i]!*4;mesh.setVerticesData(VertexBuffer.UVKind,uv);mesh.removeVerticesData(VertexBuffer.TangentKind);mesh.metadata={...mesh.metadata,retreatRound2FineStone:true};}
  }
  // Native A1 organic stones already carry seam-split per-face UVs. Choosing
  // a different projection from each vertex normal destroys that mapping on
  // curved roofs/outcrops and produces the visible grey striped ribbons.
  const preserveNativeRockUV=round2&&mesh.name.startsWith('a1:')||round3&&/^(P3_Organic_Forest_Ground_|G2_Path_.*_R3)/.test(mesh.name);
  if(basalt&&mesh instanceof Mesh&&!mesh.metadata?.stoneStage&&(next?.metadata?.category==='rock'||next?.metadata?.category==='carved')&&!preserveNativeRockUV){worldSurfaceUV(mesh,3.3);mesh.removeVerticesData(VertexBuffer.TangentKind);}
  const low=mesh.metadata?.preferDistantMaterial?islandBackdrop(next):distant(next);if(low!==next)assignments.push({mesh,high:next,low});
 }
 if(polished)for(const mesh of scene.meshes)if(mesh instanceof Mesh&&['rock','carved'].includes(mesh.material?.metadata?.category)){const record=refineMineralSurface(mesh);if(record)mineralRecords.push(record);}
 let detail:boolean|null=null;const stats={materials:library.size,normalMaps:normals.size,roughnessMetallicMaps:orms.size,assignedMeshes:assigned,albedoImagesReused:!basalt,stoneStage,sharedBasaltTextures:basalt?1:0,distantMaterialLod:true,mineralPolish:polished,consistentBackfaces,mineralMeshes:mineralRecords.length,albedoRepeatScale:polished?.34:1,normalRepeatScale:polished?1.4:1,round2,woodFinishes:[...library.keys()].filter(k=>k.startsWith('wood:')),fineSculptureGrain:round2,quality:'initializing'};
 function update(){const camera=scene.activeCamera as any,near=Math.abs(camera?.orthoTop??8)<16;if(near===detail)return;detail=near;stats.quality=near?'PBR detail':'shared distant materials';for(const a of assignments)a.mesh.material=retreatMeshUsesDetail(near,a.mesh.metadata)?a.high:a.low;}
 return {stats,update};
}
