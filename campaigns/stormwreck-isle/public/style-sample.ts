import type { Scene } from '@babylonjs/core/scene.js';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh.js';
import type { Material } from '@babylonjs/core/Materials/material.js';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';

type Family = 'basalt' | 'oak' | 'limestone' | 'ship' | 'iron' | 'rope';
type MeshIdentity = { name: string; metadata?: any };
const images = {
 basalt: new URL('./art/visual-style-v1/basalt-illustrated-v1.png', import.meta.url).href,
 oak: new URL('./art/visual-style-v1/oak-illustrated-v1.png', import.meta.url).href,
 ship: new URL('./art/visual-style-v1/ship-timber-illustrated-v1.png', import.meta.url).href
};

/** Deliberate material-only sample boundaries. Scene/cabin identity prevents a
 * generic name such as "wood" from restyling another campaign or hold. */
export function stormwreckSampleFamily(sceneId: string, mesh: MeshIdentity, materialName: string): Family | null {
 const meta=mesh.metadata??{},name=materialName.toLowerCase();
 // The skull/remains have their own bone material and completion pass.
 // Exclude by mesh, material and semantic role even if timber is shared.
 if(/dragon-remains|dragon-bone|skull|bone|clyssavar|cr[aá]neo/i.test(mesh.name+' '+name+' '+(meta.kind??'')))return null;
 if(meta.nativeBillboard||/shadow|contact|flame|glow|water|ocean|sea-|grid|glass|portrait|weather/i.test(name))return null;
 if(sceneId==='dragon-rest'){
  // The cliff is a shared continuous backdrop. Keeping its photographic
  // albedo behind painted A3 walls creates a rectangular material patch.
  // Reuse the stone family across that backdrop, preserving cell interiors.
  if(!/^a1:room-/.test(mesh.name)&&/retreat:pbr:(rock|carved)/.test(name))return 'basalt';
  const a3=meta.retreatZone==='a3'||meta.gltf?.extras?.globalZone==='a3'||/^(Dining_|Kitchen_|Expanded_(Dining|Hall|Kitchen)_|CANON_(Long_Table|Bench_|Only_Head_Chair)|Finish_A3_|CANON_Global_Threshold_Bridge_a3)/.test(mesh.name);
  if(!a3)return null;
  if(meta.retreatFloor||/walkable-floor/.test(meta.gltf?.extras?.role??''))return 'limestone';
  if(/retreat:pbr:(rock|carved)|basalt/.test(name))return 'basalt';
  if(/retreat:pbr:wood|wood_|oak/.test(name))return 'oak';
  if(/retreat:pbr:(paving|limestone)/.test(name))return 'limestone';
  return null;
 }
 if(sceneId==='wreck-ship'){
  const surface=meta.deckSurfaceId??meta.surfaceId;
  if(['lower-deck','hold-air','crow'].includes(surface)||meta.cabinId&&meta.cabinId!=='c4')return null;
  if(/^terrain-material:(hold-wood|wet-wood)$/.test(name))return null;
  if(/wood|oak|timber|plank|ship-hull/.test(name)||name==='terrain-material:exterior-deck')return 'ship';
  if(/ship-exterior:oxidised-iron/.test(name))return 'iron';
  if(/ship-exterior:salt-rope/.test(name))return 'rope';
 }
 return null;
}

/** Opt-in VIS-2 sample. Existing geometry, UVs, lights and state remain owners.
 * Scene disposal owns all derived materials/samplers. No background polling or
 * per-frame mesh scan: only mesh-count or existing near/distant LOD changes. */
export function createStormwreckStyleSample(scene: Scene, sceneId: string,
 makeTexture=(url:string)=>new Texture(url,scene,false,false,Texture.TRILINEAR_SAMPLINGMODE),prepareMaterials=()=>{}) {
 if(!['dragon-rest','wreck-ship'].includes(sceneId))return null;
 const bindings=new Map<AbstractMesh,{base:Material;candidate:Material;family:Family}>();
 const variants=new Map<Material,Map<Family,Material>>(),ownedMaterials=new Set<Material>(),ownedTextures=new Set<Texture>();
 const textures=new Map<string,Texture>(),normalSamplers=new Map<Texture,Texture>();
 let enabled=true,disposed=false,lastCount=-1,lastMaterials=-1,lastNear:boolean|null=null;
 const stats={sceneId,scope:sceneId==='dragon-rest'?'A3/umbral + familia de piedra continua compartida':'cubierta/C4; lotes de madera compartidos',enabled:true,meshes:0,materials:0,albedoImages:0,scans:0};
 const texture=(family:'basalt'|'oak'|'ship')=>{
  let value=textures.get(family);if(value)return value;
  value=makeTexture(images[family]);value.wrapU=value.wrapV=Texture.WRAP_ADDRESSMODE;value.anisotropicFilteringLevel=8;
  textures.set(family,value);ownedTextures.add(value);stats.albedoImages=textures.size;return value;
 };
 function normal(source:Texture|null,level:number){
  if(!source)return null;let sampler=normalSamplers.get(source);if(sampler)return sampler;
  const image=source.getInternalTexture();if(!image)return source;
  image.incrementReferences();sampler=new Texture(null,scene,{internalTexture:image,noMipmap:false,invertY:source.invertY,samplingMode:source.samplingMode});
  sampler.name='style-v1:normal:'+source.name;sampler.level=level;sampler.uScale=source.uScale;sampler.vScale=source.vScale;
  sampler.wrapU=source.wrapU;sampler.wrapV=source.wrapV;sampler.anisotropicFilteringLevel=source.anisotropicFilteringLevel;
  sampler.gammaSpace=source.gammaSpace;sampler.coordinatesIndex=source.coordinatesIndex;
  sampler.uOffset=source.uOffset;sampler.vOffset=source.vOffset;sampler.uAng=source.uAng;sampler.vAng=source.vAng;sampler.wAng=source.wAng;
  normalSamplers.set(source,sampler);ownedTextures.add(sampler);return sampler;
 }
 function variant(base:Material,family:Family){
  let cache=variants.get(base);if(!cache){cache=new Map();variants.set(base,cache);}const previous=cache.get(family);if(previous)return previous;
  const before=new Set(scene.textures),material=base.clone('style-v1:'+family+':'+base.name)!;
  if(!material)return base;
  ownedMaterials.add(material);for(const added of scene.textures)if(!before.has(added)&&added instanceof Texture)ownedTextures.add(added);
  const pbr=material instanceof PBRMaterial,standard=material instanceof StandardMaterial;
  const image=family==='basalt'||family==='oak'||family==='ship'?texture(family):null;
  const stone=family==='basalt'||family==='limestone';
  const colour=Color3.FromHexString(({basalt:'#B2BAB3',oak:'#C7B9A2',limestone:'#C7BC9E',ship:'#DEDFCA',iron:'#3A4647',rope:'#A79D79'} as const)[family]);
  let floorTexture:Texture|null=null;
  if(family==='limestone'){
   const source=scene.materials.find(m=>m.name==='a1:limestone-v5') as StandardMaterial|undefined;
   floorTexture=(source?.diffuseTexture as Texture|null)??null;
  }
  if(pbr){
   if(image||floorTexture)material.albedoTexture=image??floorTexture;
   material.albedoColor.copyFrom(colour);material.emissiveColor.set(0,0,0);
   material.roughness=family==='iron'?.78:family==='oak'?.92:.95;material.metallic=family==='iron'?.8:0;
   material.bumpTexture=normal(base instanceof PBRMaterial?base.bumpTexture as Texture:null,stone?.18:.24);
  }else if(standard){
   if(image||floorTexture)material.diffuseTexture=image??floorTexture;
   material.diffuseColor.copyFrom(colour);material.specularColor=Color3.FromHexString(family==='iron'?'#30383A':'#161E1C');
   material.specularPower=family==='iron'?48:24;
   material.bumpTexture=normal(base instanceof StandardMaterial?base.bumpTexture as Texture:null,sceneId==='wreck-ship'?.50:stone?.18:.24);
  }
  material.metadata={...base.metadata,styleSampleV1:true,family,sourceMaterial:base.name};cache.set(family,material);stats.materials=ownedMaterials.size;
  return material;
 }
 function refresh(force=false){
  if(disposed||!enabled)return;
  const near=Math.abs((scene.activeCamera as any)?.orthoTop??8)<16;
  if(!force&&lastCount===scene.meshes.length&&lastMaterials===scene.materials.length&&near===lastNear)return;
  lastCount=scene.meshes.length;lastNear=near;stats.scans++;
  for(const mesh of scene.meshes){
   if(mesh.isAnInstance||!mesh.material||mesh.material.metadata?.styleSampleV1)continue;
   if(!(mesh.material instanceof PBRMaterial||mesh.material instanceof StandardMaterial))continue;
   const family=stormwreckSampleFamily(sceneId,mesh,mesh.material.name);if(!family)continue;
   const base=mesh.material,candidate=variant(base,family);bindings.set(mesh,{base,candidate,family});mesh.material=candidate;
  }
  stats.meshes=bindings.size;lastMaterials=scene.materials.length;prepareMaterials();
 }
 const observer=scene.onBeforeRenderObservable.add(()=>refresh());
 function setEnabled(value:boolean){
  enabled=value;stats.enabled=value;
  if(!value){for(const [mesh,binding]of bindings)if(mesh.material===binding.candidate)mesh.material=binding.base;}
  if(value)refresh(true);
 }
 function dispose(){
  if(disposed)return;setEnabled(false);disposed=true;scene.onBeforeRenderObservable.remove(observer);
  for(const material of ownedMaterials)material.dispose(false,false);
  for(const texture of ownedTextures)texture.dispose();bindings.clear();variants.clear();
 }
 scene.onDisposeObservable.addOnce(dispose);
 return {stats,refresh,setEnabled,dispose,ready:()=>[...textures.values()].every(t=>t.isReady()),
  audit:()=>[...bindings].map(([mesh,b])=>({mesh:mesh.name,family:b.family,source:b.base.name,candidate:b.candidate.name,active:mesh.material===b.candidate,
   geometry:(mesh as any).geometry?.uniqueId,vertices:mesh.getTotalVertices(),indices:mesh.getTotalIndices(),matrix:mesh.getWorldMatrix().asArray()}))};
}
