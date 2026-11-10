import type {Scene} from '@babylonjs/core/scene.js';
import {installRetreatWallTorches} from './retreat-wall-torches.js';
import {sculptRetreatCornice} from './retreat-cornice.js';
import {releaseReplacedRetreatBackdrops} from './retreat-quick-opt.js';
import {SceneLoader} from '@babylonjs/core/Loading/sceneLoader.js';
import {Mesh} from '@babylonjs/core/Meshes/mesh.js';
import {Quaternion,Vector3} from '@babylonjs/core/Maths/math.vector.js';
import manifest from './retreat-refinement.json' with {type:'json'};
import replaced from './retreat-refinement-replaced.json' with {type:'json'};
import {upgradeRetreatMaterials,applyRetreatStoneVertexOpacity} from './retreat-refinement-materials.js';
import {refineRetreatLighting} from './retreat-refinement-lighting.js';
import {refineRetreatCoast,keepRetreatLandingDry} from './retreat-refinement-coast.js';

import {splitRetreatUpperShells,retreatRoofCutsMesh,retreatExcavationCutsMesh} from './retreat-local-occlusion.js';
import {installRetreatScenicDepth} from './retreat-scenic-depth.js';
import stoneManifest from './retreat-stone.json' with {type:'json'};
import stoneReplaced from './retreat-stone-replaced.json' with {type:'json'};
import geographyManifest from './retreat-geography.json' with {type:'json'};
import {retreatExpansionPhases,retreatExpansionStone,retreatExpansionGeography} from './retreat-expansion.js';
import {installRetreatIsland} from './retreat-island.js';
import {installRetreatZoneFinishes} from './retreat-zone-finishes.js';
import {installRetreatDepartureLandscape} from './retreat-departure-landscape.js';
import {finishRetreatTrailEnds} from './retreat-trail-ends.js';
import {finishRetreatShoreRock} from './retreat-shore-rock.js';
import polishManifest from './retreat-polish.json' with {type:'json'};
import {installRetreatEnvironment} from './retreat-environment.js';
import {installRetreatVisualRevisions} from './retreat-visual-revisions.js';
import {correctRetreatR3Geology} from './retreat-corrections-presentation.js';
import {installRetreatWinchHouse} from './retreat-winch-house.js';
import {installRetreatWinchJunction} from './retreat-winch-junction.js';
import {installRetreatExpeditionSeams} from './retreat-expedition-seams.js';
import {installRetreatWinchSeaRocks} from './retreat-winch-sea-rocks.js';
import {installRetreatWinchMarineDetail} from './retreat-winch-marine-detail.js';
import {installRetreatBeachPresentation} from './retreat-beach-presentation.js';

const phaseUrls={1:new URL('./art/retreat-modules/retreat_refinement_p1_runtime.glb',import.meta.url).href,2:new URL('./art/retreat-modules/retreat_refinement_p2_runtime.glb',import.meta.url).href,3:new URL('./art/retreat-modules/retreat_refinement_p3_runtime.glb',import.meta.url).href,5:new URL('./art/retreat-modules/retreat_refinement_p5_runtime.glb',import.meta.url).href,6:new URL('./art/retreat-modules/retreat_refinement_p6_runtime.glb',import.meta.url).href,7:new URL('./art/retreat-modules/retreat_refinement_p7_runtime.glb',import.meta.url).href,8:new URL('./art/retreat-modules/retreat_refinement_p8_runtime.glb',import.meta.url).href};
const stoneUrls={2:new URL('./art/retreat-modules/retreat_stone_s2_runtime.glb',import.meta.url).href,3:new URL('./art/retreat-modules/retreat_stone_s3_runtime.glb',import.meta.url).href};
const geographyUrl=new URL('./art/retreat-modules/retreat_geography_g11_runtime.glb',import.meta.url).href;
const geographyWestUrl=new URL('./art/retreat-modules/retreat_geography_g12_runtime.glb',import.meta.url).href;
const geographyEastUrl=new URL('./art/retreat-modules/retreat_geography_g13_runtime.glb',import.meta.url).href;
const geographyCoastUrl=new URL('./art/retreat-modules/retreat_geography_g14_runtime.glb',import.meta.url).href;
const extras=(m:any)=>m.metadata?.gltf?.extras??{};
/** Presentation layers only. Navigation, doors, actors and game state stay owned by the existing systems. */
export async function installRetreatRefinement(scene:Scene,requested=manifest.availablePhase,requestedStone=stoneManifest.availableStage,expanded=true,islandStage?:number,finishStage?:number,departureStage?:number,requestedPolish=polishManifest.availableStage,revisionStage=0){
 const polishStage=Number.isFinite(requestedPolish)?Math.max(0,Math.min(polishManifest.authoredStage,Math.trunc(requestedPolish))):0;
 const stoneStage=Math.max(0,Math.min(stoneManifest.availableStage,requestedStone));
 const phase=Math.max(0,Math.min(manifest.availablePhase,requested)),materials=new Map(scene.materials.filter(m=>m.getClassName()==='StandardMaterial').map(m=>[m.name,m])),meshes:Mesh[]=[];
 const selectedPhases=expanded?{...phaseUrls,...retreatExpansionPhases,...revisionStage>=5?{5:new URL('./art/retreat-modules/retreat_round2_p5_runtime.glb',import.meta.url).href}:{}}:phaseUrls;
 for(const [n,url] of Object.entries(selectedPhases)){
  if(Number(n)>phase)continue;
  const result=await SceneLoader.ImportMeshAsync('',url.slice(0,url.lastIndexOf('/')+1),url.slice(url.lastIndexOf('/')+1),scene);
  if(scene.isDisposed){for(const mesh of result.meshes)mesh.dispose();break;}
  result.meshes[0]!.rotationQuaternion=Quaternion.Identity();result.meshes[0]!.scaling.set(1,1,-1);
  for(const m of result.meshes){if(!(m instanceof Mesh)||!m.getTotalVertices())continue;m.computeWorldMatrix(true);m.isPickable=true;m.receiveShadows=true;
   if(m.material){const original=materials.get(m.material.name.replace(/\.\d+$/,''));if(original)m.material=original;}
   const forestFloor=/^P3_Organic_Forest_Ground_(Pleamar|Observatorio)_primitive1$/.test(m.name);
   const floor=extras(m).role==='walkable-floor'||forestFloor;m.metadata={...m.metadata,tokenOccluder:!floor,retreatFloor:floor,refinementPhase:Number(n)};meshes.push(m);
  }
 }
 if(phase>=2){for(const m of scene.meshes)if(m.name.startsWith('VTT_Forest_Ground_Pleamar'))m.setEnabled(false);const tree=scene.getTransformNodeByName('VTT_Forest_Quiet_Pine_2')??scene.getMeshByName('VTT_Forest_Quiet_Pine_2');if(tree)tree.position.x-=.7;}
 if(phase>=3)for(const m of scene.meshes)if(replaced.some(name=>m.name===name||m.name.startsWith(name+'_primitive')))m.setEnabled(false);
 if(phase>=5)for(const m of scene.meshes)if(m.name.startsWith('VTT_Forest_Quiet_Pine_'))m.setEnabled(false);
 if(phase>=6){for(const m of scene.meshes){if(['P3_Organic_Upper_Cave_Crown','P3_Cave_Mountain_West','P3_Cave_Mountain_East','P3_Cave_Mountain_North'].includes(m.name))m.setEnabled(false);if(m.material?.name==='Refinement_Pine_Needles')m.material=materials.get('a1:painted-foliage-v6')??m.material;}}
 // Replacement presentation meshes inherit the delivered cutaway metadata.
 // Import first: an unavailable refinement must never remove the original cliff.
 let stoneMeshes=0;
 if(phase>=8&&stoneStage>=2){
  const stoneUrl=expanded?retreatExpansionStone:stoneStage>=3?stoneUrls[3]:stoneUrls[2];
  const result=await SceneLoader.ImportMeshAsync('',stoneUrl.slice(0,stoneUrl.lastIndexOf('/')+1),stoneUrl.slice(stoneUrl.lastIndexOf('/')+1),scene);
  if(scene.isDisposed){for(const mesh of result.meshes)mesh.dispose();}
  else{
   result.meshes[0]!.rotationQuaternion=Quaternion.Identity();result.meshes[0]!.scaling.set(1,1,-1);
   for(const m of result.meshes){
    if(!(m instanceof Mesh)||!m.getTotalVertices())continue;
    m.computeWorldMatrix(true);m.isPickable=true;m.checkCollisions=false;m.receiveShadows=true;applyRetreatStoneVertexOpacity(m);
    if(m.material){const original=materials.get(m.material.name.replace(/\.\d+$/,''));if(original)m.material=original;}
    const internalBacking=/Stone_(P6_Continuous_Lower_Bedrock_Core|P3_Continuous_Upper_Basalt_Plateau|P6_Crest_Front_Transition|P7_Cave_Exterior_Edge_Closures)$/.test(m.name);
    m.metadata={...m.metadata,tokenOccluder:true,refinementPhase:8,stoneStage,stoneShadowCaster:!internalBacking};meshes.push(m);stoneMeshes++;
   }
   for(const m of scene.meshes)if(stoneReplaced.some(name=>m.name===name||m.name.startsWith(name+'_primitive')))m.setEnabled(false);
  }
 }
 // Permanent rear terrain is separate from the roofs that lift over A3/A4.
 // It reuses the original inland surface and never supplies floors or colliders.
 const geography={stage:geographyManifest.availableStage,meshes:0,loaded:false,error:''};
 if(phase>=8&&geographyManifest.availableStage>=1){
  const backings=[{url:expanded?retreatExpansionGeography:geographyUrl,stage:1,subphase:'G1.1'},
   {url:geographyWestUrl,stage:2,subphase:'G1.2'},
   {url:geographyEastUrl,stage:3,subphase:'G1.3'},
   {url:geographyCoastUrl,stage:4,subphase:'G1.4'}];
  for(const {url,stage,subphase} of backings){
   if(stage>geographyManifest.availableStage)continue;
  try{
   const result=await SceneLoader.ImportMeshAsync('',url.slice(0,url.lastIndexOf('/')+1),url.slice(url.lastIndexOf('/')+1),scene);
   if(scene.isDisposed){for(const mesh of result.meshes)mesh.dispose();}
   else{
    result.meshes[0]!.rotationQuaternion=Quaternion.Identity();result.meshes[0]!.scaling.set(1,1,-1);
    const placeholders=new Set<NonNullable<Mesh['material']>>();
    for(const m of result.meshes){
     if(!(m instanceof Mesh)||!m.getTotalVertices())continue;
     if(m.material){const shared=materials.get(m.material.name.replace(/\.\d+$/,''));if(shared){placeholders.add(m.material);m.material=shared;}}
     m.computeWorldMatrix(true);m.isPickable=false;m.checkCollisions=false;m.receiveShadows=true;
     // The long inland piece has a broad bounding sphere. Use its box as well
     // so a temple/cell view does not draw terrain lying outside the frame.
     m.cullingStrategy=Mesh.CULLINGSTRATEGY_STANDARD;applyRetreatStoneVertexOpacity(m);
     m.metadata={...m.metadata,content:'VTT_AMBIENCE',decorativeOnly:true,permanentBackdrop:true,retreatGeographyPhase:subphase,refinementPhase:8,stoneStage,stoneShadowCaster:false,tokenOccluder:false,retreatFloor:false};
     meshes.push(m);geography.meshes++;
    }
    for(const material of placeholders)if(!scene.meshes.some(m=>m.material===material))material.dispose(false,false);
    geography.loaded=true;
   }
  }catch(error){geography.error=String(error);console.warn('No se pudo cargar el respaldo '+subphase+'; se conserva el escenario anterior.',error);}
  }
 }
 // Reused forest pieces can introduce named materials after the initial camp
 // library was built. Keep original entries authoritative and add only live
 // existing materials before importing G2's empty material placeholders.
 for(const material of scene.materials){const name=material.name.replace(/\.\d+$/,'');if(!materials.has(name)&&material.getClassName()==='StandardMaterial'&&scene.meshes.some(m=>m.material===material))materials.set(name,material);}
 const island=phase>=8?await installRetreatIsland(scene,materials,islandStage):null;
 if(island)meshes.push(...island.meshes);
 const finishing=phase>=8&&expanded?await installRetreatZoneFinishes(scene,materials,finishStage,revisionStage):null;
 if(finishing)meshes.push(...finishing.meshes);
 const departures=phase>=8&&expanded?await installRetreatDepartureLandscape(scene,materials,departureStage,revisionStage):null;
 if(departures)meshes.push(...departures.meshes);
 const environment=phase>=8&&expanded&&polishStage>=2?await installRetreatEnvironment(scene,materials):null;
 if(environment)meshes.push(...environment.meshes);
 const visualRevisions=expanded?await installRetreatVisualRevisions(scene,materials,revisionStage):null;
 if(visualRevisions)meshes.push(...visualRevisions.meshes);
 const winchJunction=expanded&&phase>=8&&revisionStage>=6?installRetreatWinchJunction(scene):null;
 if(winchJunction)meshes.push(...winchJunction.meshes);
 const retainingStrip=meshes.find(mesh=>mesh.name==='R3_Upper_Retaining_Rock_a1_coastal-cliff-v10');
 if(retainingStrip)meshes.push(sculptRetreatCornice(retainingStrip));
 const r3Geology=revisionStage>=6?correctRetreatR3Geology(meshes):[];
 const winchSeaRocks=expanded&&phase>=8&&revisionStage>=6?installRetreatWinchSeaRocks(scene):null;
 if(winchSeaRocks)meshes.push(...winchSeaRocks.meshes);
 const expeditionSeams=expanded&&phase>=8&&revisionStage>=6?installRetreatExpeditionSeams(scene):null;
 if(expeditionSeams)meshes.push(...expeditionSeams.meshes);
 const localShells=phase>=8?splitRetreatUpperShells(meshes):{sources:[],parts:[],records:[],additionalMeshes:0};
 const quickOptimization=phase>=8?releaseReplacedRetreatBackdrops(scene,meshes):null;
 const scenicDepth=phase>=3?installRetreatScenicDepth(scene):null;
 const torches=revisionStage>=6?installRetreatWallTorches(scene):null;
 if(torches)meshes.push(...torches.meshes);
 const winchHouse=expanded&&phase>=8&&revisionStage>=6?installRetreatWinchHouse(scene):null;
 if(winchHouse)meshes.push(...winchHouse.meshes);
 const materialController=phase>=4?upgradeRetreatMaterials(scene,stoneStage,polishStage>=1,polishStage>=3,revisionStage>=5,revisionStage>=6):null;
 if(departures&&revisionStage>=6){
  finishRetreatShoreRock(departures.meshes);
  meshes.push(...finishRetreatTrailEnds(scene));
 }
 const lighting=phase>=6?refineRetreatLighting(scene,expanded,finishing?.stats.stage??0,polishStage>=3,revisionStage>=5):null;
 const coast=phase>=7?refineRetreatCoast(scene,polishStage>=3,revisionStage):null;
 const sea=scene.getMeshByName('a1:bay-background'),outcrops=scene.getMeshByName('retreat:a2-sea-outcrops');
 // The separate marine sample remains in the development review until its
 // foam is visually resolved. Do not ship that unfinished sample with the
 // unrelated cell correction; its source and review remain available.
 const marineDetail=(import.meta as ImportMeta & {env:{DEV:boolean}}).env.DEV&&sea instanceof Mesh&&outcrops instanceof Mesh?installRetreatWinchMarineDetail(scene,sea,outcrops):null;
 if(marineDetail)meshes.push(...marineDetail.meshes);
 const disableBeach=(scene.metadata as any)?.disableBeachPresentation===true||(typeof window!=='undefined'&&new URLSearchParams(window.location?.search??'').get('pass')==='before');
 const beach=expanded&&phase>=8&&revisionStage>=6&&!disableBeach?installRetreatBeachPresentation(scene,sea instanceof Mesh?sea:null,revisionStage):null;
 if(beach)meshes.push(...beach.meshes);
 let frozen=0;
 if(phase>=8)for(const m of scene.meshes){
  if(m.infiniteDistance||!m.isEnabled()||!m.getTotalVertices()||m.metadata?.retreatDynamic||/bay|shore-wash|weather:|actor:|flame|glow|mist|smoke|ambient-life/.test(m.name))continue;
  let dynamic=false;for(let n:any=m;n;n=n.parent){const e=extras(n);if(/door|pallet|chain|lift/.test(e.role??'')||/Pallet|Chain|Winch_Crank|Hinged/.test(n.name)){dynamic=true;break;}}
  if(!dynamic&&(m.metadata?.retreatZone||m.metadata?.refinementPhase||m.name.startsWith('a1:static:'))){m.freezeWorldMatrix();frozen++;}
 }
 // Static vegetation, floors and ropes have no cutaway state. O1 restores its
 // own changes before this update; only architectural candidates need a pass.
 const cutawayMeshes=meshes.filter(m=>{const e=extras(m);return !m.isDisposed()&&Boolean(e.vttCutaway||e.vttInterior||e.globalZone&&['wall-upper','wall-shelf','fixed-door-reveal'].includes(e.role));});
 const cellJambs=meshes.flatMap(mesh=>{const match=mesh.name.match(/^(?:P1_A1_(\d+)_Carved_Jamb_|Finish_A1_(\d+)_Rock_Shoulder_)/);return match?[{mesh,interior:`room${match[1]??match[2]}`}]:[];});
 function update(interior:string|null,point:Vector3|null,time=0){
  scenicDepth?.update(time,scene.activeCamera as any,point);
  materialController?.update();
  lighting?.update(point);
  coast?.update(time);
  marineDetail?.update(time);
   beach?.update(time, interior);
  // The existing ocean animation used to pass over the 25 cm landing and the
  // forest pad. Preserve its offshore swells while keeping the harbor below shore.
  if(phase>=2&&phase<7)keepRetreatLandingDry(scene.getMeshByName('a1:bay-background') as Mesh|null);
  const eye=scene.activeCamera?.getForwardRay().direction.scale(-1);
  for(const m of cutawayMeshes){const e=extras(m),zone=e.vttInterior;const occupied=zone===interior||zone==='upper-caves'&&(interior==='a3'||interior==='a4');m.isVisible=phase>=8?!(retreatRoofCutsMesh(m,interior)||eye&&retreatExcavationCutsMesh(m,interior,eye,point)):!(occupied&&e.vttCutaway);}
  // The A1 entrance jambs are decorative duplicates of the carved portal;
  // they belong to the occupied room's front, not its permanent side rock.
  for(const {mesh,interior:zone} of cellJambs)mesh.isVisible=interior!==zone;
 }
 return {phase,stoneStage,meshes,scenicDepth,update,updateFixtures:torches?.update,syncWinchHouse:winchHouse?.sync,stats:{phase,stoneStage,polishStage,stoneMeshes,quickOptimization,geography,island:island?.stats??null,finishing:finishing?.stats??null,departures:departures?.stats??null,environment:environment?.stats??null,visualRevisions:visualRevisions?.stats??null,winchSeaRocks:winchSeaRocks?{installed:winchSeaRocks.installed,retired:winchSeaRocks.retired}:null,winchHouse:winchHouse?{installed:winchHouse.installed,records:winchHouse.records}:null,occlusionShells:{additionalMeshes:localShells.additionalMeshes,records:localShells.records},addedMeshes:meshes.length,scenicDepth:scenicDepth?.stats??null,materialStats:materialController?.stats??null,lighting:lighting?.stats??null,coast:coast?.stats??null,beach:beach?.stats??null,frozenMatrices:frozen}};
}
