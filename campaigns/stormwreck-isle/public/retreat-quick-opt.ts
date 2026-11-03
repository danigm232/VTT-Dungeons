import type {Scene} from '@babylonjs/core/scene.js';
import type {TransformNode} from '@babylonjs/core/Meshes/transformNode.js';
import {Mesh} from '@babylonjs/core/Meshes/mesh.js';
import {InstancedMesh} from '@babylonjs/core/Meshes/instancedMesh.js';
import {naturalLandscapeReplacements,coastalLandscapeReplacements,tidalLandscapeReplacements} from './retreat-departure-landscape.js';

/** Authored hierarchies finish loading before they become immutable. Actor and
 * temporary O1 hierarchies do not use this cache. */
export function authoredMeshLookup(ready:()=>boolean){
 const cache=new WeakMap<TransformNode,ReturnType<TransformNode['getChildMeshes']>>();
 return (node:TransformNode)=>{if(!ready())return node.getChildMeshes(false);let children=cache.get(node);if(!children){children=node.getChildMeshes(false);cache.set(node,children);}return children;};
}

/** Release only explicitly approved, replaced and disabled landscape meshes.
 * All source GLBs stay on disk; a failed replacement retains its live fallback.
 * Materials/textures and any shared geometry stay under Babylon's owners. */
export function releaseReplacedRetreatBackdrops(scene:Scene,owned:Mesh[]){
 const released:{name:string;triangles:number;estimatedGeometryBytes:number}[]=[];
 for(const [oldName,newName]of [['G2_Backland_Connected_Volcanic_Island','SAL1_Backland_Presentation'],['SAL1_Backland_Presentation','SAL2_Backland_Presentation'],...naturalLandscapeReplacements,...coastalLandscapeReplacements,...tidalLandscapeReplacements]){
  const mesh=scene.getMeshByName(oldName!),replacement=scene.getMeshByName(newName!);
  // SAL-1 may itself already be disabled by SAL-2; it is nevertheless validated
  // by the successful sequential loader before either fallback is released.
  if(!(mesh instanceof Mesh)||!replacement||mesh.isEnabled()||mesh.instances.length||mesh.getChildMeshes(false).length)continue;
  const vertexBuffers=mesh.geometry?.getVertexBuffers(),bytes=Object.values(vertexBuffers??{}).reduce((n,b)=>{const data=b.getData();return n+(Array.isArray(data)?data.length*4:data?.byteLength??0);},0)+(mesh.getIndices()?.length??0)*4;
  released.push({name:mesh.name,triangles:mesh.getTotalIndices()/3,estimatedGeometryBytes:bytes});
  for(const light of scene.lights){light.excludedMeshes=light.excludedMeshes.filter(m=>m!==mesh);light.includedOnlyMeshes=light.includedOnlyMeshes.filter(m=>m!==mesh);const map=light.getShadowGenerator()?.getShadowMap();if(map?.renderList)map.renderList=map.renderList.filter(m=>m!==mesh);}
  mesh.dispose(true,false);
 }
 // R3 replaces these complete visual owners. Release their GPU/CPU geometry
 // only after the new trees exist; keep all files and any live fallback.
 if(scene.meshes.some(m=>m.isEnabled()&&m.name.startsWith('R3_Tree_')&&m.metadata?.retreatVisualRevision===6)){
  const retired=scene.meshes.filter(m=>/^(P5_Refined_Existing_Pine_|G2_Forest_Reused_Pine_|SAL2_Reused_Pine_|SAL2R_Grove_Pine_|V2_Garden_)/.test(m.name)&&!m.isEnabled()&&m.getTotalVertices()>0).sort((a,b)=>Number(b instanceof InstancedMesh)-Number(a instanceof InstancedMesh));
  for(const mesh of retired){
   if(mesh.getChildMeshes(false).length||mesh instanceof Mesh&&mesh.instances.length)continue;
   const geometry=mesh instanceof Mesh?mesh.geometry:null,shared=geometry?.meshes.some(m=>m!==mesh&&!m.isDisposed()),bytes=shared?0:Object.values(geometry?.getVertexBuffers()??{}).reduce((n,b)=>{const d=b.getData();return n+(Array.isArray(d)?d.length*4:d?.byteLength??0);},0)+(geometry?.getIndices()?.length??0)*4;
   released.push({name:mesh.name,triangles:mesh.getTotalIndices()/3,estimatedGeometryBytes:bytes});
   for(const light of scene.lights){light.excludedMeshes=light.excludedMeshes.filter(m=>m!==mesh);light.includedOnlyMeshes=light.includedOnlyMeshes.filter(m=>m!==mesh);const map=light.getShadowGenerator()?.getShadowMap();if(map?.renderList)map.renderList=map.renderList.filter(m=>m!==mesh);}
   mesh.dispose(true,false);
  }
 }
 for(let i=owned.length-1;i>=0;i--)if(owned[i]!.isDisposed())owned.splice(i,1);
 return {releasedMeshes:released.length,estimatedGeometryBytes:released.reduce((n,m)=>n+m.estimatedGeometryBytes,0),released,originalFilesPreserved:true};
}
