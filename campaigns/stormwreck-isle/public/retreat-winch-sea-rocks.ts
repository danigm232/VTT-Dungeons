import type {Scene} from '@babylonjs/core/scene.js';
import {Mesh} from '@babylonjs/core/Meshes/mesh.js';
import {organicStone} from '../../../engine/client/diorama-kit.js';

// These three decorative exports form the disconnected offshore fins. The
// headland under the house and P8 bedrock under the stairs are separate meshes.
export const RETREAT_WINCH_SEA_FIN_NAMES=[
 'V5_Eastern_Cliff_Continuous_Spine',
 'Stone_Foreground_East',
 'Stone_P3_Eastern_Cliff_Continuous_Backing',
] as const;

// World metres. Each boulder is partially submerged, varied, and outside the
// suspended load (x 159.7–161.9, z 69.4–70.9) and the walkable stairs.
export const RETREAT_WINCH_SEA_ROCKS=[
 {x:164.6,y:.25,z:74.8,width:3.3,height:3.2,depth:2.5,angle:.18,seed:1.2},
 {x:167.0,y:.5,z:77.5,width:4.2,height:4.5,depth:3.6,angle:-.34,seed:2.9},
 {x:163.8,y:0,z:81.3,width:2.3,height:2.3,depth:2.5,angle:.68,seed:4.5},
 {x:166.9,y:.5,z:84.7,width:5.0,height:4.4,depth:3.3,angle:.21,seed:6.3},
 {x:163.1,y:-.1,z:90.2,width:3.1,height:2.8,depth:2.8,angle:-.56,seed:8.4},
 {x:168.0,y:.4,z:93.2,width:3.9,height:4.0,depth:3.7,angle:.5,seed:10.1},
 {x:163.8,y:-.1,z:97.6,width:3.0,height:2.4,depth:2.8,angle:-.22,seed:11.8},
] as const;

/** Presentation only: keep all source assets on disk and commit the removal
 * only after every original and its shared basalt material are available. */
export function installRetreatWinchSeaRocks(scene:Scene){
 const existing=scene.getMeshByName('retreat:a2-sea-outcrops');
 if(existing instanceof Mesh)return {installed:true,meshes:[existing],retired:[...RETREAT_WINCH_SEA_FIN_NAMES]};
 const originals=RETREAT_WINCH_SEA_FIN_NAMES.map(name=>scene.getMeshByName(name));
 if(originals.some(mesh=>!(mesh instanceof Mesh)||!mesh.isEnabled())||!originals[0]?.material)
  return {installed:false,meshes:[] as Mesh[],retired:[] as string[]};
 const material=originals[0]!.material,parts:Mesh[]=[];
 try{
  for(const [index,rock] of RETREAT_WINCH_SEA_ROCKS.entries()){
   const part=organicStone(scene,`retreat:a2-sea-outcrop-${index}`,rock.width,rock.height,rock.depth,rock.seed);
   part.position.set(rock.x,rock.y,rock.z);part.rotation.y=rock.angle;part.material=material;
   part.computeWorldMatrix(true);parts.push(part);
  }
  const mesh=Mesh.MergeMeshes(parts,true,true,undefined,false,false);
  if(!mesh)throw Error('No se pudieron agrupar las rocas del cabrestante');
  mesh.name='retreat:a2-sea-outcrops';mesh.material=material;
  mesh.isPickable=false;mesh.checkCollisions=false;mesh.receiveShadows=true;
  mesh.metadata={content:'VTT_AMBIENCE',decorativeOnly:true,tokenOccluder:false,retreatFloor:false,
   stoneStage:3,stoneShadowCaster:false,refinementPhase:8,retreatWinchSeaRocks:true};
  mesh.computeWorldMatrix(true);
  for(const original of originals)original!.setEnabled(false);
  return {installed:true,meshes:[mesh],retired:[...RETREAT_WINCH_SEA_FIN_NAMES]};
 }catch(error){
  for(const part of parts)if(!part.isDisposed())part.dispose();
  console.warn('Retiro A2: se conserva el acantilado anterior.',error);
  return {installed:false,meshes:[] as Mesh[],retired:[] as string[]};
 }
}
