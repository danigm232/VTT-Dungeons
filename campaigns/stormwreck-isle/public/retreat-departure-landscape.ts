import type {Scene} from '@babylonjs/core/scene.js';
import type {Material} from '@babylonjs/core/Materials/material.js';
import {Mesh} from '@babylonjs/core/Meshes/mesh.js';
import type {InstancedMesh} from '@babylonjs/core/Meshes/instancedMesh.js';
import {PointLight} from '@babylonjs/core/Lights/pointLight.js';
import {importRetreatDecoration} from './retreat-decoration-loader.js';
import {parseGroveContacts,parseCoastalCairnContact,applyGroveContacts} from './retreat-departure-contacts.js';
import manifest from './retreat-departure-landscape.json' with {type:'json'};

const urls:Record<number,string>={1:new URL('./art/retreat-modules/retreat_departure_sal1_runtime.glb',import.meta.url).href,2:new URL('./art/retreat-modules/retreat_departure_sal2_runtime.glb',import.meta.url).href,2.5:new URL('./art/retreat-modules/retreat_departure_sal2r_runtime.glb',import.meta.url).href,3:new URL('./art/retreat-modules/retreat_departure_sal3_runtime.glb',import.meta.url).href,4:new URL('./art/retreat-modules/retreat_departure_sal4_runtime.glb',import.meta.url).href};
export function retreatDepartureStage(requested=manifest.availableStage){return Number.isFinite(requested)?Math.max(0,Math.min(manifest.authoredStage,Math.floor(requested*2)/2)):0;}
/** Explicit, decorative-only replacement contracts; no floor/architecture IDs. */
export const naturalLandscapeReplacements=[['SAL2_Backland_Presentation','SAL2R_Backland_Presentation_Stone'],...[1,2,3,4].map(i=>[`SAL2_Integrated_Shoulder_${i}`,`SAL2R_Integrated_Shoulder_${i}_Stone`]),['G2_Path_island-observatory','SAL2R_Worn_Observatory_Path_Stone']];
export const coastalLandscapeReplacements=[...['Stone','Soil'].map(s=>[`SAL2R_Backland_Presentation_${s}`,`SAL3_Coastal_Backland_${s}`]),['Geography_G13_Winch_Observatorio_Connected_Headland','SAL3_Coastal_Backland_Headland']];
export const tidalLandscapeReplacements=[['SAL3_Coastal_Backland_Stone','SAL4_Tidal_Backland_Stone']];
/** Visual landscape only; the existing terrain, ports, camera and DM remain
 * authoritative. Historic G2 and finishing stage numbers keep their meaning. */
export async function installRetreatDepartureLandscape(scene:Scene,materials:ReadonlyMap<string,Material>,requested?:number,revisionStage=0){
 const stage=retreatDepartureStage(requested),meshes:Mesh[]=[],instances:InstancedMesh[]=[],suppressedBackdrops:string[]=[],byStage:Record<string,{meshes:number;instances:number}>={};
 const stats={stage,loadedMeshes:0,instancedMeshes:0,newNavigationSurfaces:0,newColliders:0,newInteractives:0,newTextures:0,newLights:0,suppressedBackdrops,byStage,contacts:null as ReturnType<typeof applyGroveContacts>|null,coastalContacts:null as ReturnType<typeof applyGroveContacts>|null,error:''};
 const selectedUrls=revisionStage>=3?{...urls,1:new URL('./art/retreat-modules/retreat_v4_sal1_runtime.glb',import.meta.url).href}:urls;
 for(const [index,url]of Object.entries(selectedUrls).sort(([a],[b])=>Number(a)-Number(b))){
  const phase=Number(index);if(phase>stage||scene.isDisposed)break;
  let added:Awaited<ReturnType<typeof importRetreatDecoration>>|null=null;
  try{
  added=await importRetreatDecoration(scene,materials,url,(mesh,extra)=>{
   const backdrop=extra.permanentBackdrop===true;
   mesh.cullingStrategy=Mesh.CULLINGSTRATEGY_STANDARD;if(mesh instanceof Mesh)mesh.useVertexColors=true;
   return {retreatDeparturePhase:phase===2.5?'SAL-2R':'SAL-'+phase,retreatDepartureStage:phase,retreatZone:phase===1?'departure-pleamar-high':phase===3?'departure-observatory-coast':phase===4?'departure-pleamar-low':'departure-observatory-inland',retreatFloor:extra.visualFloorCopy===true,permanentBackdrop:backdrop,preferDistantMaterial:extra.role==='backland-presentation',tokenOccluder:!backdrop,groveContacts:phase===2&&extra.contactPlan!==undefined?parseGroveContacts(extra.contactPlan):null,coastalContact:phase===3&&extra.coastalContactPlan!==undefined?parseCoastalCairnContact(extra.coastalContactPlan):null};
  },true);
  if(scene.isDisposed)break;
  const replacement=added.meshes.find(m=>m.name===`SAL${phase}_Backland_Presentation`),original=scene.getMeshByName(phase===1?'G2_Backland_Connected_Volcanic_Island':'SAL1_Backland_Presentation');
  if(phase===2){
   if(!replacement||!original?.isEnabled())throw Error('Falta la presentación base de SAL-1');
   stats.contacts=applyGroveContacts(scene,replacement.metadata.groveContacts??{trees:[],cairn:null});
  }
  if(phase===2.5){
   const swaps=naturalLandscapeReplacements.map(([oldName,newName])=>({old:scene.getMeshByName(oldName!),next:added!.meshes.find(m=>m.name===newName)}));
   if(swaps.some(p=>!p.old?.isEnabled()||!p.next))throw Error('Paisaje natural incompleto; se conserva SAL-2');
   for(const pair of swaps){pair.old!.setEnabled(false);suppressedBackdrops.push(pair.old!.name);}
  }
  if(phase===3){
   const swaps=coastalLandscapeReplacements.map(([oldName,newName])=>({old:scene.getMeshByName(oldName!),next:added!.meshes.find(m=>m.name===newName)}));
   if(swaps.some(p=>!p.old?.isEnabled()||!p.next))throw Error('Costa incompleta; se conserva el fondo anterior');
   const contact=added.meshes.find(m=>m.metadata?.coastalContact)?.metadata.coastalContact;
   if(!contact)throw Error('Falta el contacto costero validado');
   stats.coastalContacts=applyGroveContacts(scene,contact);
   for(const pair of swaps){pair.old!.setEnabled(false);suppressedBackdrops.push(pair.old!.name);}
  }
  if(phase===4){
   const original=scene.getMeshByName('SAL3_Coastal_Backland_Stone'),replacement=added.meshes.find(m=>m.name==='SAL4_Tidal_Backland_Stone');
   if(!original?.isEnabled()||!replacement)throw Error('Falta el relieve de la cala; se conserva SAL-3');
   original.setEnabled(false);suppressedBackdrops.push(original.name);
  }
  // Keep prior assets untouched and retain the previous presentation on error.
  if(replacement&&original){original.setEnabled(false);suppressedBackdrops.push(original.name);}
  for(const mesh of [...added.meshes,...added.instances])for(const light of scene.lights)if(light instanceof PointLight)light.excludedMeshes.push(mesh);
  meshes.push(...added.meshes);instances.push(...added.instances);byStage[index]={meshes:added.meshes.length,instances:added.instances.length};
  }catch(error){added?.root?.dispose(false,false);stats.error+=(stats.error?'; ':'')+String(error);console.warn('No se pudo cargar SAL-'+phase+'; se conserva el paisaje anterior.',error);break;}
 }
 stats.loadedMeshes=meshes.length;stats.instancedMeshes=instances.length;
 return {meshes,instances,stats};
}
