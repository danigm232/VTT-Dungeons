import type {Scene} from '@babylonjs/core/scene.js';
import {SceneLoader} from '@babylonjs/core/Loading/sceneLoader.js';
import {Mesh} from '@babylonjs/core/Meshes/mesh.js';
import {Quaternion,Vector3} from '@babylonjs/core/Maths/math.vector.js';
import manifest from './retreat-refinement.json' with {type:'json'};
import replaced from './retreat-refinement-replaced.json' with {type:'json'};
import {upgradeRetreatMaterials} from './retreat-refinement-materials.js';
import {refineRetreatLighting} from './retreat-refinement-lighting.js';
import {refineRetreatCoast} from './retreat-refinement-coast.js';

const phaseUrls={1:new URL('./art/retreat-modules/retreat_refinement_p1_runtime.glb',import.meta.url).href,2:new URL('./art/retreat-modules/retreat_refinement_p2_runtime.glb',import.meta.url).href,3:new URL('./art/retreat-modules/retreat_refinement_p3_runtime.glb',import.meta.url).href,5:new URL('./art/retreat-modules/retreat_refinement_p5_runtime.glb',import.meta.url).href,6:new URL('./art/retreat-modules/retreat_refinement_p6_runtime.glb',import.meta.url).href,7:new URL('./art/retreat-modules/retreat_refinement_p7_runtime.glb',import.meta.url).href,8:new URL('./art/retreat-modules/retreat_refinement_p8_runtime.glb',import.meta.url).href};
const extras=(m:any)=>m.metadata?.gltf?.extras??{};
/** Presentation layers only. Navigation, doors, actors and game state stay owned by the existing systems. */
export async function installRetreatRefinement(scene:Scene,requested=manifest.availablePhase){
 const phase=Math.max(0,Math.min(manifest.availablePhase,requested)),materials=new Map(scene.materials.filter(m=>m.getClassName()==='StandardMaterial').map(m=>[m.name,m])),meshes:Mesh[]=[];
 for(const [n,url] of Object.entries(phaseUrls)){
  if(Number(n)>phase)continue;
  const result=await SceneLoader.ImportMeshAsync('',url.slice(0,url.lastIndexOf('/')+1),url.slice(url.lastIndexOf('/')+1),scene);
  if(scene.isDisposed){for(const mesh of result.meshes)mesh.dispose();break;}
  result.meshes[0]!.rotationQuaternion=Quaternion.Identity();result.meshes[0]!.scaling.set(1,1,-1);
  for(const m of result.meshes){if(!(m instanceof Mesh)||!m.getTotalVertices())continue;m.computeWorldMatrix(true);m.isPickable=true;m.receiveShadows=true;
   if(m.material){const original=materials.get(m.material.name.replace(/\.\d+$/,''));if(original)m.material=original;}
   const floor=extras(m).role==='walkable-floor';m.metadata={...m.metadata,tokenOccluder:!floor,retreatFloor:floor,refinementPhase:Number(n)};meshes.push(m);
  }
 }
 if(phase>=2){for(const m of scene.meshes)if(m.name.startsWith('VTT_Forest_Ground_Pleamar'))m.setEnabled(false);const tree=scene.getTransformNodeByName('VTT_Forest_Quiet_Pine_2')??scene.getMeshByName('VTT_Forest_Quiet_Pine_2');if(tree)tree.position.x-=.7;}
 if(phase>=3)for(const m of scene.meshes)if(replaced.some(name=>m.name===name||m.name.startsWith(name+'_primitive')))m.setEnabled(false);
 if(phase>=5)for(const m of scene.meshes)if(m.name.startsWith('VTT_Forest_Quiet_Pine_'))m.setEnabled(false);
 if(phase>=6){for(const m of scene.meshes){if(['P3_Organic_Upper_Cave_Crown','P3_Cave_Mountain_West','P3_Cave_Mountain_East','P3_Cave_Mountain_North'].includes(m.name))m.setEnabled(false);if(m.material?.name==='Refinement_Pine_Needles')m.material=materials.get('a1:painted-foliage-v6')??m.material;}}
 const materialController=phase>=4?upgradeRetreatMaterials(scene):null;
 const lighting=phase>=6?refineRetreatLighting(scene):null;
 const coast=phase>=7?refineRetreatCoast(scene):null;
 let frozen=0;
 if(phase>=8)for(const m of scene.meshes){
  if(!m.isEnabled()||!m.getTotalVertices()||/bay|shore-wash|weather:|actor:|flame|glow|mist|smoke|ambient-life/.test(m.name))continue;
  let dynamic=false;for(let n:any=m;n;n=n.parent){const e=extras(n);if(/door|pallet|chain|lift/.test(e.role??'')||/Pallet|Chain|Winch_Crank|Hinged/.test(n.name)){dynamic=true;break;}}
  if(!dynamic&&(m.metadata?.retreatZone||m.metadata?.refinementPhase||m.name.startsWith('a1:static:'))){m.freezeWorldMatrix();frozen++;}
 }
 function update(interior:string|null,point:Vector3|null,time=0){
  materialController?.update();
  lighting?.update(point);
  coast?.update(time);
  // The existing ocean animation used to pass over the 25 cm landing and the
  // forest pad. Preserve its offshore swells while keeping the harbor below shore.
  if(phase>=2&&phase<7){const water=scene.getMeshByName('a1:bay-background') as Mesh|null,p=water?.getVerticesData('position');if(water&&p){const at=water.getAbsolutePosition();let changed=false;for(let i=0;i<p.length;i+=3){const x=p[i]!+at.x,z=p[i+2]!+at.z;if(x>0&&x<175&&z>43&&z<132&&p[i+1]!+at.y>.08){p[i+1]=.08-at.y;changed=true;}}if(changed)water.updateVerticesData('position',p);}}
  for(const m of meshes){const e=extras(m),zone=e.vttInterior;const occupied=zone===interior||zone==='upper-caves'&&(interior==='a3'||interior==='a4');m.isVisible=!(occupied&&e.vttCutaway);}
 }
 return {phase,meshes,update,stats:{phase,addedMeshes:meshes.length,materialStats:materialController?.stats??null,lighting:lighting?.stats??null,coast:coast?.stats??null,frozenMatrices:frozen}};
}
