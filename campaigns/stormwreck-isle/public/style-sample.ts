import type { Scene } from '@babylonjs/core/scene.js';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh.js';
import type { Material } from '@babylonjs/core/Materials/material.js';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { MultiMaterial } from '@babylonjs/core/Materials/multiMaterial.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';

const libraryBindings = {
 paper_and_parchment: 'archive-paper',
 binding_worn_olive: 'archive-olive',
 binding_worn_ochre: 'archive-ochre',
 binding_worn_russet: 'archive-russet',
} as const;
type Family = 'basalt' | 'oak' | 'oak-structure' | 'oak-endgrain' | 'limestone' | 'paving' | 'ship' | 'ship-structure' | 'ship-wet' | 'iron' | 'rope' | 'pine' | 'pine-sun' | 'olive' | 'sage' | 'grass' | 'grass-light' | 'meadow' | 'bark' | 'linen' | 'lavender' | 'flower-cream' | 'flower-rose' | typeof libraryBindings[keyof typeof libraryBindings];
export type StormwreckFinishScope = 'sample' | 'zones';
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

/** VIS-3 uses the same library, with explicit material/semantic identities.
 * Only the authored Retiro bookcase primitives receive the archive finish. */
export function stormwreckZoneFamily(sceneId: string, mesh: MeshIdentity, materialName: string): Family | null {
 const meta=mesh.metadata??{},n=materialName.toLowerCase(),id=mesh.name;
 if(!['dragon-rest','wreck-ship'].includes(sceneId)||meta.nativeBillboard||/dragon-remains|dragon-bone|skull|bone|skeleton|clyssavar|cr[aá]neo/i.test(id+' '+n+' '+(meta.kind??'')))return null;
 if(/shadow|contact|flame|glow|water|ocean|sea-|grid|glass|portrait|weather|darkness|salt-and-rot/i.test(n)||/waterlogged-book|scroll|chart|wreck:pickup:/.test(id))return null;
 if(sceneId==='dragon-rest'){
  if (/^(?:CANON|Expanded)_(?:North|South|East|West)_Bookcase_/.test(id)) {
   const name = n.replace(/\.\d+$/, '');
   const binding = libraryBindings[name as keyof typeof libraryBindings];
   if (binding) return binding;
   if (/retreat:pbr:wood:planks|wood_oak/.test(name)) return 'oak-structure';
  }
  const foliage:Record<string,Family>={r3_pine_dark:'pine',r3_pine_sun:'pine-sun',r3_olive:'olive',r3_sage:'sage',r3_grass:'grass',r3_grass_light:'grass-light',r3_meadow_base:'meadow',r3_bark:'bark',r3_rope:'rope',r3_lavender:'lavender',r3_flower_cream:'flower-cream',r3_flower_rose:'flower-rose'};
  const plant=foliage[n.replace(/\.\d+$/,'')];if(plant)return plant;
  if(/retreat:pbr:(rock|carved)|retreat:island-shared-low/.test(n))return 'basalt';
  if(/retreat:pbr:wood|wood_|oak-v5/.test(n)){
   if(/endgrain/.test(n))return 'oak-endgrain';
   const role=meta.gltf?.extras?.role??'';
   return /structural|dark-oak/.test(n)||/winch-frame|timber|roof|dock-post|cliff-rail/.test(role)?'oak-structure':'oak';
  }
  if(/retreat:pbr:paving|a1:plaza|stone_floor/.test(n))return 'paving';
  if(/retreat:pbr:limestone|a1:limestone/.test(n))return 'limestone';
  return stormwreckSampleFamily(sceneId,mesh,materialName);
 }
 const surface=meta.deckSurfaceId??meta.surfaceId;
 if(/^c9-iron-chest:(iron-chest|chest-lid|iron-band|iron-end-brace):/.test(id))return 'iron';
 if(/^ship-prop:(canvas|blanket)$/.test(n))return 'linen';
 if(/^(ship-exterior:salt-rope|wreck-rebuild:rope|ship-prop:rope)$/.test(n))return 'rope';
 if(/^(ship-exterior:oxidised-iron|wreck-rebuild:iron|ship-prop:iron)$/.test(n))return 'iron';
 const wood=/wood|oak|timber|plank|ship-hull/.test(n)||/^(wreck-rebuild:(shell|frames|worn-cants|treads)|ship-prop:(timber|edge|dark)|wreck-interior:exposed-grain|terrain-material:exterior-deck)$/.test(n);
 if(!wood)return null;
 if(['lower-deck','hold-air'].includes(surface)||/^c[89]-/.test(id)||/hold-wood|wet-wood|wet-timber/.test(n))return 'ship-wet';
 return /frames|wall-wood|ship-prop:dark/.test(n)?'ship-structure':'ship';
}

/** Opt-in VIS-2 sample and VIS-3 families. Existing geometry, UVs, lights and state remain owners.
 * Scene disposal owns all derived materials/samplers. No background polling or
 * per-frame mesh scan: only mesh-count or existing near/distant LOD changes. */
export function createStormwreckStyleSample(scene: Scene, sceneId: string,
 makeTexture=(url:string)=>new Texture(url,scene,false,false,Texture.TRILINEAR_SAMPLINGMODE),prepareMaterials=()=>{},initialScope:StormwreckFinishScope='sample',sourcesReady=()=>true) {
 if(!['dragon-rest','wreck-ship'].includes(sceneId))return null;
 const bindings=new Map<AbstractMesh,{base:Material;candidate:Material;family:Family}>();
 const variants=new Map<Material,Map<string,Material>>(),ownedMaterials=new Set<Material>(),ownedTextures=new Set<Texture>();
 const textures=new Map<string,Texture>(),normalSamplers=new Map<Texture,Map<number,Texture>>();
 let enabled=true,disposed=false,lastCount=-1,lastMaterials=-1,lastNear:boolean|null=null,scope=initialScope;
 const stats={sceneId,scope,enabled:true,meshes:0,materials:0,albedoImages:0,scans:0};
 const texture=(family:'basalt'|'oak'|'ship')=>{
  let value=textures.get(family);if(value)return value;
  value=makeTexture(images[family]);value.wrapU=value.wrapV=Texture.WRAP_ADDRESSMODE;value.anisotropicFilteringLevel=8;
  textures.set(family,value);ownedTextures.add(value);stats.albedoImages=[...textures.keys()].filter(k=>!k.startsWith('zones:')).length;return value;
 };
 function albedo(family:'basalt'|'oak'|'ship'){
  const base=texture(family);if(scope==='sample')return base;
  const key='zones:'+family;let sampler=textures.get(key);if(sampler)return sampler;
  sampler=base.clone();sampler.name='style-zones:'+family;sampler.uScale=sampler.vScale=family==='basalt'?.46:family==='ship'?.82:1;
  textures.set(key,sampler);ownedTextures.add(sampler);stats.albedoImages=[...textures.keys()].filter(k=>!k.startsWith('zones:')).length;return sampler;
 }
 function normal(source:Texture|null,level:number){
  if(!source)return null;let levels=normalSamplers.get(source);if(!levels){levels=new Map();normalSamplers.set(source,levels);}let sampler=levels.get(level);if(sampler)return sampler;
  const image=source.getInternalTexture();if(!image)return source;
  image.incrementReferences();sampler=new Texture(null,scene,{internalTexture:image,noMipmap:false,invertY:source.invertY,samplingMode:source.samplingMode});
  sampler.name='style-v1:normal:'+source.name;sampler.level=level;sampler.uScale=source.uScale;sampler.vScale=source.vScale;
  sampler.wrapU=source.wrapU;sampler.wrapV=source.wrapV;sampler.anisotropicFilteringLevel=source.anisotropicFilteringLevel;
  sampler.gammaSpace=source.gammaSpace;sampler.coordinatesIndex=source.coordinatesIndex;
  sampler.uOffset=source.uOffset;sampler.vOffset=source.vOffset;sampler.uAng=source.uAng;sampler.vAng=source.vAng;sampler.wAng=source.wAng;
  levels.set(level,sampler);ownedTextures.add(sampler);return sampler;
 }
 function variant(base:Material,family:Family){
  let cache=variants.get(base);if(!cache){cache=new Map();variants.set(base,cache);}const key=scope+':'+family,previous=cache.get(key);if(previous)return previous;
  const before=new Set(scene.textures),material=base.clone('style-v1:'+scope+':'+family+':'+base.name)!;
  if(!material)return base;
  ownedMaterials.add(material);for(const added of scene.textures)if(!before.has(added)&&added instanceof Texture)ownedTextures.add(added);
  const pbr=material instanceof PBRMaterial,standard=material instanceof StandardMaterial;
  const image=family==='basalt'?albedo('basalt'):family.startsWith('oak')?albedo('oak'):family.startsWith('ship')?albedo('ship'):null;
  const stone=family==='basalt'||family==='limestone'||family==='paving';
  const colour=Color3.FromHexString(({basalt:'#B2BAB3',oak:'#C7B9A2','oak-structure':'#94816A','oak-endgrain':'#AE9678',limestone:'#C7BC9E',paving:'#C5BEA8',ship:'#DEDFCA','ship-structure':'#8D9A8B','ship-wet':'#A1B2A4',iron:'#3A4647',rope:'#A79D79',pine:'#325737','pine-sun':'#627D38',olive:'#607C37',sage:'#789A58',grass:'#5A7735','grass-light':'#8C9D45',lavender:'#A46AC6','flower-cream':'#F5DA86','flower-rose':'#D48299',meadow:'#596446',bark:'#463D2D',linen:'#C6C2A9','archive-paper':'#938162','archive-olive':'#505C48','archive-ochre':'#896640','archive-russet':'#74443B'} as const)[family]);
  // The R3 GLTF foliage was authored at 40% of its palette swatch to balance
  // linear PBR daylight. Preserve that calibration rather than whitening it.
  if(['pine','pine-sun','olive','sage','grass','grass-light'].includes(family))colour.scaleInPlace(.40);
  if(family==='meadow')colour.copyFrom(Color3.FromHexString('#AAB981'));
  let floorTexture:Texture|null=null;
  if(family==='limestone'&&scope==='sample'){
   const source=scene.materials.find(m=>m.name==='a1:limestone-v5') as StandardMaterial|undefined;
   floorTexture=(source?.diffuseTexture as Texture|null)??null;
  }
  if(pbr){
   if(image||floorTexture)material.albedoTexture=image??floorTexture;
   material.albedoColor.copyFrom(colour);material.emissiveColor.set(0,0,0);
   material.roughness=family==='iron'?.78:family==='oak'?.92:.95;material.metallic=family==='iron'?.8:0;
   material.bumpTexture=normal(base instanceof PBRMaterial?base.bumpTexture as Texture:null,scope==='zones'&&stone?.10:stone?.18:.24);
  }else if(standard){
   // DynamicTexture.clone creates an empty canvas. The authored linen is
   // unchanged by this family, so share its live texture instead of that copy.
   if(family==='linen'&&base instanceof StandardMaterial&&material.diffuseTexture!==base.diffuseTexture){
    const emptyCopy=material.diffuseTexture as Texture|null;
    material.diffuseTexture=base.diffuseTexture;
    if(emptyCopy&&ownedTextures.delete(emptyCopy))emptyCopy.dispose();
   }
   if(image||floorTexture)material.diffuseTexture=image??floorTexture;
   if(scope==='zones'&&family==='iron')material.diffuseTexture=null;
   material.diffuseColor.copyFrom(colour);material.specularColor=Color3.FromHexString(family==='iron'?'#30383A':'#161E1C');
   material.specularPower=family==='iron'?48:family==='ship-wet'?40:24;
   material.bumpTexture=normal(base instanceof StandardMaterial?base.bumpTexture as Texture:null,sceneId==='wreck-ship'?(scope==='zones'?.32:.50):scope==='zones'&&stone?.10:stone?.18:.24);
  }
  material.metadata={...base.metadata,styleSampleV1:true,scope,family,sourceMaterial:base.name};cache.set(key,material);stats.materials=ownedMaterials.size;
  return material;
 }
 function refresh(force=false){
  if(disposed||!enabled||!sourcesReady())return;
  const near=Math.abs((scene.activeCamera as any)?.orthoTop??8)<16;
  if(!force&&lastCount===scene.meshes.length&&lastMaterials===scene.materials.length&&near===lastNear)return;
  lastCount=scene.meshes.length;lastNear=near;stats.scans++;
  for(const mesh of bindings.keys())if(mesh.isDisposed())bindings.delete(mesh);
  for(const mesh of scene.meshes){
   if(mesh.isAnInstance||!mesh.material||mesh.material.metadata?.styleSampleV1)continue;
   if(mesh.material instanceof MultiMaterial && scope==='zones'){
    const base=mesh.material;
    const families=base.subMaterials.map(material=>material?stormwreckZoneFamily(sceneId,mesh,material.name):null);
    const family=families.find(value=>value!==null);if(!family)continue;
    const key='zones:composite:'+families.join(',');
    let cache=variants.get(base);if(!cache){cache=new Map();variants.set(base,cache);}
    let candidate=cache.get(key) as MultiMaterial|undefined;
    if(!candidate){
     candidate=new MultiMaterial('style-v1:'+key+':'+base.name,scene);
     candidate.subMaterials=base.subMaterials.map((material,index)=>material&&families[index]?variant(material,families[index]!):material);
     candidate.metadata={...base.metadata,styleSampleV1:true,scope,sourceMaterial:base.name};
     ownedMaterials.add(candidate);cache.set(key,candidate);stats.materials=ownedMaterials.size;
    }
    bindings.set(mesh,{base,candidate,family});mesh.material=candidate;continue;
   }
   if(!(mesh.material instanceof PBRMaterial||mesh.material instanceof StandardMaterial))continue;
   const family=(scope==='zones'?stormwreckZoneFamily:stormwreckSampleFamily)(sceneId,mesh,mesh.material.name);if(!family)continue;
   const base=mesh.material,candidate=variant(base,family);bindings.set(mesh,{base,candidate,family});mesh.material=candidate;
  }
  stats.meshes=bindings.size;lastMaterials=scene.materials.length;prepareMaterials();
 }
 const observer=scene.onBeforeRenderObservable.add(()=>refresh());
 const addedMesh=scene.onNewMeshAddedObservable.add(()=>{lastCount=-1;});
 const removedMesh=scene.onMeshRemovedObservable.add(()=>{lastCount=-1;});
 function setEnabled(value:boolean){
  enabled=value;stats.enabled=value;
  if(!value){for(const [mesh,binding]of bindings)if(mesh.material===binding.candidate)mesh.material=binding.base;}
  if(value)refresh(true);
 }
 function setScope(value:StormwreckFinishScope){
  if(scope===value)return;for(const [mesh,b]of bindings)if(mesh.material===b.candidate)mesh.material=b.base;
  bindings.clear();scope=value;stats.scope=value;lastCount=-1;if(enabled)refresh(true);
 }
 function dispose(){
  if(disposed)return;setEnabled(false);disposed=true;scene.onBeforeRenderObservable.remove(observer);scene.onNewMeshAddedObservable.remove(addedMesh);scene.onMeshRemovedObservable.remove(removedMesh);
  for(const material of ownedMaterials)material.dispose(false,false);
  for(const texture of ownedTextures)texture.dispose();bindings.clear();variants.clear();
 }
 scene.onDisposeObservable.addOnce(dispose);
 const parameters=(m:any):any=>({name:m.name,type:m.getClassName(),color:(m.albedoColor??m.diffuseColor)?.asArray(),roughness:m.roughness,metallic:m.metallic,specularPower:m.specularPower,albedo:(m.albedoTexture??m.diffuseTexture)?.name,albedoSize:(m.albedoTexture??m.diffuseTexture)?.getSize(),sampler:{u:(m.albedoTexture??m.diffuseTexture)?.uScale,v:(m.albedoTexture??m.diffuseTexture)?.vScale},normalLevel:m.bumpTexture?.level,subMaterials:m.subMaterials?.map((child:any)=>child?parameters(child):null)});
 return {stats,refresh,setEnabled,setScope,dispose,ready:()=>[...textures.values()].every(t=>t.isReady()),
  audit:()=>[...bindings].map(([mesh,b])=>({mesh:mesh.name,family:b.family,source:b.base.name,candidate:b.candidate.name,active:mesh.material===b.candidate,
   before:parameters(b.base),after:parameters(b.candidate),geometry:(mesh as any).geometry?.uniqueId,vertices:mesh.getTotalVertices(),indices:mesh.getTotalIndices(),matrix:mesh.getWorldMatrix().asArray()}))};
}
