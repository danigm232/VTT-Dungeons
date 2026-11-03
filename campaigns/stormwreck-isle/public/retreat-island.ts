import type {Scene} from '@babylonjs/core/scene.js';
import {SceneLoader} from '@babylonjs/core/Loading/sceneLoader.js';
import {Mesh} from '@babylonjs/core/Meshes/mesh.js';
import {InstancedMesh} from '@babylonjs/core/Meshes/instancedMesh.js';
import type {AbstractMesh} from '@babylonjs/core/Meshes/abstractMesh.js';
import type {Material} from '@babylonjs/core/Materials/material.js';
import {Quaternion} from '@babylonjs/core/Maths/math.vector.js';
import {PointLight} from '@babylonjs/core/Lights/pointLight.js';
import manifest from './retreat-island.json' with {type:'json'};
import {levelRetreatTempleSideStairs} from './retreat-stair-presentation.js';
const urls:Record<number,string>={1:new URL('./art/retreat-modules/retreat_island_g2_1_runtime.glb',import.meta.url).href,
 2:new URL('./art/retreat-modules/retreat_island_g2_2_runtime.glb',import.meta.url).href,
 3:new URL('./art/retreat-modules/retreat_island_g2_3_runtime.glb',import.meta.url).href};
function authored(mesh:AbstractMesh):Record<string,unknown>{
 for(let node:any=mesh;node;node=node.parent){const extras=node.metadata?.gltf?.extras;if(extras?.islandPhase!==undefined)return extras;}
 return {};
}
/** Visual modules only. Existing navigation and scene lifecycle remain owners. */
export async function installRetreatIsland(scene:Scene,materials:Map<string,Material>,requested=manifest.availableStage){
 const stage=Number.isFinite(requested)?Math.max(0,Math.min(manifest.availableStage,Math.trunc(requested))):manifest.availableStage;
 const meshes:Mesh[]=[],instances:InstancedMesh[]=[],roots:Mesh[]=[],placeholders=new Set<Material>(),initialMaterials=new Set(scene.materials);
 for(const [key,url] of Object.entries(urls)){
  if(Number(key)>stage)continue;
  const result=await SceneLoader.ImportMeshAsync('',url.slice(0,url.lastIndexOf('/')+1),url.slice(url.lastIndexOf('/')+1),scene);
  if(scene.isDisposed){result.meshes.forEach(m=>m.dispose());break;}
  const root=result.meshes[0] as Mesh;root.rotationQuaternion=Quaternion.Identity();root.scaling.set(1,1,-1);roots.push(root);
  for(const m of result.meshes){
   if(!(m instanceof Mesh||m instanceof InstancedMesh)||!m.getTotalVertices())continue;
   const data=authored(m),tree=data.role==='tree'||data.role==='prop',floor=data.retreatFloor===true,naturalFloor=floor&&/coastal-cliff/.test(m.material?.name??'');
   if(m instanceof Mesh){
    if(m.material){const shared=materials.get(m.material.name.replace(/\.\d+$/,''));if(!shared)throw Error('Material G2 no disponible: '+m.material.name);placeholders.add(m.material);m.material=shared;}
    m.receiveShadows=tree||floor;m.hasVertexAlpha=false;m.useVertexColors=true;meshes.push(m);
   }else instances.push(m);
   m.computeWorldMatrix(true);m.isPickable=false;m.checkCollisions=false;m.cullingStrategy=Mesh.CULLINGSTRATEGY_STANDARD;
   // All G2 pieces are exterior approaches. They use maritime sun/ambient
   // light and the existing sun shadows, not interior flame cube maps.
   for(const light of scene.lights)if(light instanceof PointLight)light.excludedMeshes.push(m);
   m.metadata={...m.metadata,content:'VTT_AMBIENCE',retreatIslandPhase:Number(key),refinementPhase:8,stoneStage:3,decorativeOnly:!floor,retreatFloor:floor,permanentBackdrop:!tree&&!floor,preferDistantMaterial:!tree&&(!floor||naturalFloor),stoneShadowCaster:false,tokenOccluder:tree};
  }
 }
 for(const material of placeholders)if(!initialMaterials.has(material)&&!scene.meshes.some(m=>m.material===material))material.dispose(false,false);
 // Instances stay scene-owned and inherit their source geometry/material. Only
 // source meshes join the existing floor/cutaway owner; O1 scans scene meshes.
 const leveledTreads=meshes.map(levelRetreatTempleSideStairs).filter(Boolean);
 return {meshes,instances,roots,stats:{stage,loadedMeshes:meshes.length,instancedMeshes:instances.length,renderMeshNodes:meshes.length+instances.length,newMaterials:scene.materials.filter(m=>!initialMaterials.has(m)).length,newTextures:0,newLights:0,newShadowMaps:0,originalTransformsModified:false,leveledTreads}};
}
