/** Sequential visual derivatives. Original authored assets stay on disk. */
import type {Scene} from '@babylonjs/core/scene.js';
import type {Material} from '@babylonjs/core/Materials/material.js';
import {importRetreatDecoration} from './retreat-decoration-loader.js';
import {levelRetreatTempleSideStairs} from './retreat-stair-presentation.js';
export const RETREAT_VISUAL_REVISION=6;
export const retreatRevisionStage=(requested=RETREAT_VISUAL_REVISION)=>Math.max(0,Math.min(RETREAT_VISUAL_REVISION,Math.trunc(requested)));
export function retreatRevisionModules(stage:number){
 return {...stage>=1?{a4:new URL('./art/retreat-modules/retreat_v2_a4.glb',import.meta.url).href}:{},...stage>=2?{a5:new URL('./art/retreat-modules/retreat_v3_a5.glb',import.meta.url).href,roof5:new URL('./art/retreat-modules/retreat_v3_a5_roof.glb',import.meta.url).href}:{},...stage>=5?{a4:new URL('./art/retreat-modules/retreat_round2_a4.glb',import.meta.url).href,a5:new URL('./art/retreat-modules/retreat_round2_a5.glb',import.meta.url).href}:{},...stage>=6?{
  a3:new URL('./art/retreat-modules/retreat_r3_a3.glb',import.meta.url).href,roof3:new URL('./art/retreat-modules/retreat_r3_a3_roof.glb',import.meta.url).href,
  a4:new URL('./art/retreat-modules/retreat_r3_a4.glb',import.meta.url).href,roof4:new URL('./art/retreat-modules/retreat_r3_a4_roof.glb',import.meta.url).href,
  a5:new URL('./art/retreat-modules/retreat_r3_a5.glb',import.meta.url).href}: {}};
}
export async function installRetreatVisualRevisions(scene:Scene,materials:ReadonlyMap<string,Material>,stage:number){
 const meshes=[],shared=new Map(materials);
 for(const material of scene.materials){const name=material.name.replace(/\.\d+$/,'');if(!shared.has(name))shared.set(name,material);}
 if(stage>=1){
  const result=await importRetreatDecoration(scene,shared,new URL('./art/retreat-modules/retreat_v2_garden.glb',import.meta.url).href,()=>({tokenOccluder:false,retreatVisualRevision:1}));meshes.push(...result.meshes);
 }
 if(stage>=2)for(const mesh of scene.meshes)if(/^Finish_A5_(Abacus_Bearing|Timber_Seat)_/.test(mesh.name))mesh.setEnabled(false);
 if(stage>=3){
  for(const material of scene.materials){const name=material.name.replace(/\.\d+$/,'');if(!shared.has(name))shared.set(name,material);}
  const result=await importRetreatDecoration(scene,shared,new URL('./art/retreat-modules/retreat_v4_paths_runtime.glb',import.meta.url).href,()=>({tokenOccluder:false,stoneShadowCaster:true,retreatVisualRevision:3}));meshes.push(...result.meshes);
 }
 if(stage>=4){
  for(const material of scene.materials){const name=material.name.replace(/\.\d+$/,'');if(!shared.has(name))shared.set(name,material);}
  const result=await importRetreatDecoration(scene,shared,new URL('./art/retreat-modules/retreat_v5_coast_runtime.glb',import.meta.url).href,(_mesh,extra)=>({tokenOccluder:false,stoneShadowCaster:false,permanentBackdrop:extra.permanentBackdrop===true,retreatVisualRevision:4}));meshes.push(...result.meshes);
  for(const mesh of scene.meshes)if(/^P5_Refined_Existing_Pine_\d+/.test(mesh.name)){
   mesh.computeWorldMatrix(true);const b=mesh.getBoundingInfo().boundingBox;if(b.minimumWorld.x<26&&b.maximumWorld.z>103&&b.minimumWorld.y<6&&!mesh.metadata?.retreatGroundedShore){mesh.unfreezeWorldMatrix();mesh.position.y+=.18;mesh.computeWorldMatrix(true);mesh.metadata={...mesh.metadata,retreatGroundedShore:true};}
  }
 }
 if(stage>=5){
  // This fixed oak head is an upper part of the entrance wall. At frontal
  // angles it can fall between the sparse body rays, so use the occupied
  // room's existing camera-facing cutaway, retaining the original role.
  const head=scene.getMeshByName('Finish_A4_Fixed_Oak_Head');
  if(head){const gltf=head.metadata?.gltf,extra=gltf?.extras??{};head.metadata={...head.metadata,gltf:{...gltf,extras:{...extra,authoredRole:extra.authoredRole??extra.role,role:'wall-upper',vttInterior:'a4'}}};}
  for(const material of scene.materials){const name=material.name.replace(/\.\d+$/,'');if(!shared.has(name))shared.set(name,material);}
  const result=await importRetreatDecoration(scene,shared,new URL('./art/retreat-modules/retreat_round2_exterior_runtime.glb',import.meta.url).href,(_mesh,extra)=>({tokenOccluder:false,stoneShadowCaster:false,permanentBackdrop:extra.permanentBackdrop===true,retreatVisualRevision:5}));meshes.push(...result.meshes);
  // The new curved continuation is loaded before retiring the old strip.
  if(result.meshes.some(m=>m.name==='R2_Pleamar_Low_Cove_Continuation'))scene.getMeshByName('SAL4_Scenic_Low_Cove_Continuation')?.setEnabled(false);
 }
 if(stage>=6){
  const edges=await importRetreatDecoration(scene,shared,new URL('./art/retreat-modules/retreat_r3_path_edges.glb',import.meta.url).href,(_mesh,e)=>({retreatVisualRevision:6,retreatFloor:e.retreatFloor===true,tokenOccluder:false}));meshes.push(...edges.meshes);
  if(edges.meshes.length)for(const mesh of scene.meshes)if(['G2_Path_island-pleamar-low','G2_Path_island-pleamar-high','G2_Path_island-observatory'].includes(mesh.name))mesh.setEnabled(false);
  for(const mesh of edges.meshes)levelRetreatTempleSideStairs(mesh);
  const shoulder=await importRetreatDecoration(scene,shared,new URL('./art/retreat-modules/retreat_r3_low_shoulder.glb',import.meta.url).href,()=>({retreatVisualRevision:6,tokenOccluder:false}));meshes.push(...shoulder.meshes);
  if(shoulder.meshes.length)scene.getMeshByName('R2_Pleamar_Low_Soil_Shoulder')?.setEnabled(false);
  const result=await importRetreatDecoration(scene,shared,new URL('./art/retreat-modules/retreat_r3_landscape_runtime.glb',import.meta.url).href,(_mesh,e)=>({retreatVisualRevision:6,retreatFloor:e.retreatFloor===true,tokenOccluder:e.role==='tree'||/Planter|Herbs_|Bench/.test(e.r3Group??''),stoneShadowCaster:e.role==='tree'}));meshes.push(...result.meshes);
  for(const material of scene.materials)if(material.name.startsWith('R3_')&&'environmentIntensity' in material)(material as any).environmentIntensity=.35;
  // Retire old crowns only after their volumetric replacements have loaded.
  if(result.meshes.length)for(const mesh of scene.meshes){
   if(/^(P5_Refined_Existing_Pine_|G2_Forest_Reused_Pine_|SAL2_Reused_Pine_|SAL2R_Grove_Pine_|V2_Garden_)/.test(mesh.name))mesh.setEnabled(false);
   // Existing upper railing would stand in the middle of the wider walk.
   if(/Rope|Post|Rail/.test(mesh.name)&&!mesh.name.startsWith('R3_')){mesh.computeWorldMatrix(true);const b=mesh.getBoundingInfo().boundingBox;if(b.minimumWorld.x>=76&&b.maximumWorld.x<=136&&b.minimumWorld.z>=66.7&&b.maximumWorld.z<=69&&b.minimumWorld.y>17.5&&b.maximumWorld.y<20){mesh.setEnabled(false);}}
  }
 }
 return {meshes,stats:{stage,meshes:meshes.length}};
}
