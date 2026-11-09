import type {Scene} from '@babylonjs/core/scene.js';
import type {AbstractMesh} from '@babylonjs/core/Meshes/abstractMesh.js';
import {BoundingInfo} from '@babylonjs/core/Culling/boundingInfo.js';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';

const coastalBounds=new WeakMap<AbstractMesh,BoundingInfo[]>();

/** Disjoint local bounds for water that wraps around an open area. */
export function setCoastalAnimationBounds(mesh:AbstractMesh,bounds:BoundingInfo[]){
 coastalBounds.set(mesh,bounds);
}

/** Conservative main/secondary-camera gate. This does not infer occlusion by
 * land: water below a mountain can remain eligible until the deeper Q1 pass. */
export function createCoastalAnimationVisibility(scene:Scene,water:AbstractMesh[],includeSkirt=true){
 const bounds=new WeakMap<AbstractMesh,BoundingInfo>();let meshCount=-1,meshes=water;
 return ()=>{
  if(meshCount!==scene.meshes.length){meshCount=scene.meshes.length;meshes=[...water,...(includeSkirt?scene.meshes.filter(m=>m.name==='retreat:bay-maritime-skirt'):[])];}
  // A render target can need the water even when the main camera cannot see it.
  if(scene.customRenderTargets.some(t=>!t.renderList||t.renderList.some(m=>meshes.includes(m))))return true;
  const cameras=scene.activeCameras?.length?scene.activeCameras:scene.activeCamera?[scene.activeCamera]:[];
  if(!cameras.length)return true;
  // Read synchronized matrices; forcing a fresh camera projection here would
  // invalidate render caches even when the view has not moved.
  for(const camera of cameras){camera.getViewMatrix();camera.getProjectionMatrix();}
  for(const mesh of meshes){
   if(mesh.isDisposed()||!mesh.isEnabled()||!mesh.isVisible||mesh.visibility<=0)continue;
   if(mesh.alwaysSelectAsActiveMesh||scene.skipFrustumClipping)return true;
   const world=mesh.computeWorldMatrix(true),parts=coastalBounds.get(mesh);
   if(parts){
    for(const part of parts){
     part.update(world);
     if(cameras.some(camera=>camera.isInFrustum(part,true)))return true;
    }
    continue;
   }
   let box=bounds.get(mesh);
   if(!box){const b=mesh.getBoundingInfo().boundingBox;box=new BoundingInfo(b.minimum.subtract(new Vector3(2,20,4)),b.maximum.add(new Vector3(2,20,4)));bounds.set(mesh,box);}
   box.update(world);
   if(cameras.some(camera=>camera.isInFrustum(box,true)))return true;
  }
  return false;
 };
}
