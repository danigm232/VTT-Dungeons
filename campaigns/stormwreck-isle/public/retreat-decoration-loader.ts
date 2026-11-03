import type {Scene} from '@babylonjs/core/scene.js';
import type {Material} from '@babylonjs/core/Materials/material.js';
import {SceneLoader} from '@babylonjs/core/Loading/sceneLoader.js';
import {Mesh} from '@babylonjs/core/Meshes/mesh.js';
import {InstancedMesh} from '@babylonjs/core/Meshes/instancedMesh.js';
import type {AbstractMesh} from '@babylonjs/core/Meshes/abstractMesh.js';
import {Quaternion} from '@babylonjs/core/Maths/math.vector.js';

/** Shared import boundary for scene-owned additive decorations. The existing
 * refinement owner handles update, cutaway, freezing and scene disposal. */
export async function importRetreatDecoration(scene:Scene,materials:ReadonlyMap<string,Material>,url:string,
 metadata:(mesh:AbstractMesh,extras:Record<string,any>)=>Record<string,unknown>,strictMaterials=false){
 const result=await SceneLoader.ImportMeshAsync('',url.slice(0,url.lastIndexOf('/')+1),url.slice(url.lastIndexOf('/')+1),scene);
 const placeholders=new Set<Material>(result.meshes.flatMap(mesh=>mesh.material?[mesh.material]:[])),meshes:Mesh[]=[],instances:InstancedMesh[]=[];
 try{
  if(scene.isDisposed){for(const mesh of result.meshes)mesh.dispose();return {meshes,instances,root:result.meshes[0]};}
  result.meshes[0]!.rotationQuaternion=Quaternion.Identity();result.meshes[0]!.scaling.set(1,1,-1);
  for(const mesh of result.meshes){
   if(!(mesh instanceof Mesh||mesh instanceof InstancedMesh)||!mesh.getTotalVertices())continue;
   let extra:Record<string,any>={};
   for(let node:any=mesh;node;node=node.parent)if(node.metadata?.gltf?.extras){extra=node.metadata.gltf.extras;break;}
   if(mesh instanceof Mesh&&mesh.material){
    const shared=materials.get(mesh.material.name.replace(/\.\d+$/,''));
    if(shared)mesh.material=shared;
    else if(strictMaterials)throw Error('Material decorativo no disponible: '+mesh.material.name);
   }
   mesh.computeWorldMatrix(true);mesh.isPickable=false;mesh.checkCollisions=false;mesh.receiveShadows=true;mesh.hasVertexAlpha=false;
   mesh.metadata={...mesh.metadata,content:'VTT_AMBIENCE',decorativeOnly:true,refinementPhase:8,stoneStage:3,stoneShadowCaster:false,retreatFloor:false,...metadata(mesh,extra)};
   if(mesh instanceof Mesh)meshes.push(mesh);else instances.push(mesh);
  }
  return {meshes,instances,root:result.meshes[0]};
 }catch(error){for(const mesh of result.meshes)mesh.dispose();throw error;}
 finally{for(const material of placeholders)if(!scene.meshes.some(m=>m.material===material))material.dispose(false,false);}
}
