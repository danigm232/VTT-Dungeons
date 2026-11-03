import type {Scene} from '@babylonjs/core/scene.js';
import type {Material} from '@babylonjs/core/Materials/material.js';
import {Mesh} from '@babylonjs/core/Meshes/mesh.js';
import type {TransformNode} from '@babylonjs/core/Meshes/transformNode.js';
import manifest from './retreat-zone-finishes.json' with {type:'json'};
import {importRetreatDecoration} from './retreat-decoration-loader.js';

const urls:Record<number,string>={1:new URL('./art/retreat-modules/retreat_finish_a1_runtime.glb',import.meta.url).href,2:new URL('./art/retreat-modules/retreat_finish_a3_runtime.glb',import.meta.url).href,3:new URL('./art/retreat-modules/retreat_finish_a4_runtime.glb',import.meta.url).href,4:new URL('./art/retreat-modules/retreat_finish_a2_runtime.glb',import.meta.url).href,5:new URL('./art/retreat-modules/retreat_finish_a5_runtime.glb',import.meta.url).href};
/** Production defaults to the last validated stage. Explicit review copies
 * may inspect the current authored candidate without publishing it early. */
export function retreatFinishStage(requested=manifest.availableStage){return Number.isFinite(requested)?Math.max(0,Math.min(manifest.authoredStage??manifest.availableStage,Math.floor(requested))):0;}

/** Only supplies already resting on this pallet join its existing transform.
 * Keep their exact world pose, including the glTF root's mirrored Z. */
export function bindRetreatWinchCargo(pallet:TransformNode,candidates:readonly TransformNode[]){
 pallet.computeWorldMatrix(true);const anchor=pallet.getAbsolutePosition();let bound=0;
 for(const cargo of candidates){
  cargo.computeWorldMatrix(true);const at=cargo.getAbsolutePosition();
  if(cargo.parent===pallet||Math.abs(at.x-anchor.x)>1.2||Math.abs(at.z-anchor.z)>.9||Math.abs(at.y-anchor.y)>1.5)continue;
  cargo.setParent(pallet);cargo.computeWorldMatrix(true);cargo.metadata={...cargo.metadata,retreatLiftPayload:true};bound++;
 }
 return bound;
}

/** Additive joints only. Existing scene owns materials, cutaway, disposal,
 * navigation, fixtures and game state; no alternate movement or control. */
export async function installRetreatZoneFinishes(scene:Scene,materials:ReadonlyMap<string,Material>,requested?:number,revisionStage=0){
 const stage=retreatFinishStage(requested),meshes:Mesh[]=[],byZone:Record<string,number>={};
 const selected=revisionStage>=6?{...urls,2:new URL('./art/retreat-modules/retreat_r3_finish_a3_runtime.glb',import.meta.url).href,3:new URL('./art/retreat-modules/retreat_r3_finish_a4_runtime.glb',import.meta.url).href}:urls;
 for(const [index,url] of Object.entries(selected)){
  if(Number(index)>stage)continue;
  const additions=await importRetreatDecoration(scene,materials,url,(_mesh,extra)=>({retreatFinishStage:Number(index),retreatFinishZone:extra.finishZone,retreatZone:extra.finishZone,tokenOccluder:true}));
  for(const mesh of additions.meshes){meshes.push(mesh);const zone=mesh.metadata.retreatFinishZone;byZone[zone]=(byZone[zone]??0)+1;}
  if(scene.isDisposed)break;
 }
 return {meshes,stats:{stage,byZone,meshes:meshes.length,newNavigationSurfaces:0,newColliders:0,newInteractives:0}};
}
