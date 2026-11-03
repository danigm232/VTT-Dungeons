import type {Scene} from '@babylonjs/core/scene.js';
import type {Material} from '@babylonjs/core/Materials/material.js';
import {Mesh} from '@babylonjs/core/Meshes/mesh.js';
import {InstancedMesh} from '@babylonjs/core/Meshes/instancedMesh.js';
import {importRetreatDecoration} from './retreat-decoration-loader.js';
import {createRetreatNeedleSurface} from './retreat-needle-surface.js';
import {PBRMaterial} from '@babylonjs/core/Materials/PBR/pbrMaterial.js';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial.js';
import {Color3} from '@babylonjs/core/Maths/math.color.js';

/** Native solid pine crowns had inherited the flower-card atlas. Restore their
 * authored needles without replacing, moving or multiplying any tree. The low
 * garden/card plants in the original cells keep their own atlas. */
export function restoreRetreatVegetationMaterials(scene:Scene){
 const needles=scene.getMaterialByName('Refinement_Pine_Needles'),leaf=scene.getMaterialByName('Refinement_Garden_Leaf');let crowns=0,scrub=0;
 for(const mesh of scene.meshes){
  if(!(mesh instanceof Mesh||mesh instanceof InstancedMesh)||!mesh.material?.name.startsWith('a1:painted-foliage-'))continue;
  const owner=mesh instanceof InstancedMesh?mesh.sourceMesh:mesh;
  if(needles&&/^(P5_Refined_Existing_Pine_|SAL2R_Grove_Pine_|SAL2_Reused_Pine_|G2_Forest_Reused_Pine_)/.test(mesh.name)){owner.material=needles;crowns++;}
  else if(leaf&&/^(SAL1_Low_Coastal_Scrub|SAL2_Understory_Herb_Clusters|SAL2R_Forest_Understory|SAL3_Salt_Scrub|SAL4_Coastal_Herbs)$/.test(mesh.name)){owner.material=leaf;scrub++;}
 }
 if(crowns&&needles&&!needles.metadata?.retreatNeedles){
  const texture=createRetreatNeedleSurface(scene);
  if(needles instanceof PBRMaterial){needles.albedoTexture=texture;needles.albedoColor=Color3.White();needles.roughness=.96;}
  else if(needles instanceof StandardMaterial){needles.diffuseTexture=texture;needles.diffuseColor=Color3.White();}
  needles.metadata={...needles.metadata,retreatNeedles:true};
 }
 return {crowns,scrub,newTrees:0,newTextures:crowns?1:0};
}

/** Scene-owned, additive dressing. Grounding is authored against the original
 * garden meshes; the existing owner retains disposal, visibility and movement. */
export async function installRetreatEnvironment(scene:Scene,materials:ReadonlyMap<string,Material>){
 const foliage=restoreRetreatVegetationMaterials(scene),shared=new Map(materials),leaf=scene.getMaterialByName('Refinement_Garden_Leaf');if(leaf)shared.set('Refinement_Garden_Leaf',leaf);
 const url=new URL('./art/retreat-modules/retreat_environment_e1_runtime.glb',import.meta.url).href;
 const result=await importRetreatDecoration(scene,shared,url,()=>({retreatPolishStage:2,tokenOccluder:false,stoneShadowCaster:false}),true);
 return {meshes:result.meshes,stats:{...foliage,plants:25,batches:result.meshes.length,newColliders:0,newNavigationSurfaces:0,newInteractives:0}};
}
