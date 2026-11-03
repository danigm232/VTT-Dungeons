import {describe,it,expect} from 'vitest';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder.js';
import {ArcRotateCamera} from '@babylonjs/core/Cameras/arcRotateCamera.js';
import {Vector3,Quaternion} from '@babylonjs/core/Maths/math.vector.js';
import {MultiMaterial} from '@babylonjs/core/Materials/multiMaterial.js';
import {SubMesh} from '@babylonjs/core/Meshes/subMesh.js';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial.js';
import {PBRMaterial} from '@babylonjs/core/Materials/PBR/pbrMaterial.js';
import {Material} from '@babylonjs/core/Materials/material.js';
import {createRetreatLocalOcclusion,separateRetreatCellStructure,keepRetreatCellWallsStable,splitRetreatUpperShells,retreatRoofCutsMesh,retreatOcclusionOpacity,retreatExcavationCutsMesh} from '../../campaigns/stormwreck-isle/public/retreat-local-occlusion';

function fixture(){const engine=new NullEngine(),scene=new Scene(engine),camera=new ArcRotateCamera('camera',Math.PI/2,Math.PI/2,100,new Vector3(110,19,60),scene);scene.activeCamera=camera;camera.getViewMatrix(true);return {scene,camera,dispose:()=>{scene.dispose();engine.dispose();}};}
function area(mesh:any){const p=mesh.getVerticesData('position'),ix=mesh.getIndices(),world=mesh.computeWorldMatrix(true);let sum=0;for(let i=0;i<ix.length;i+=3){const v=[0,1,2].map(k=>Vector3.TransformCoordinates(Vector3.FromArray(p,ix[i+k]*3),world));sum+=Vector3.Cross(v[1]!.subtract(v[0]!),v[2]!.subtract(v[0]!)).length()/2;}return sum;}
describe('Retreat O1 local occlusion',()=>{
 it('opens the kitchen from its own centre while retaining the rear walls of both connected cavities',()=>{
  const f=fixture();try{
   const wall=(name:string,x:number,z:number)=>{const m=MeshBuilder.CreateBox(name,{width:5,height:2.5,depth:.3},f.scene);m.position.set(x,19.5,z);m.metadata={gltf:{extras:{role:'wall-upper',globalZone:'a3'}}};m.computeWorldMatrix(true);return m;};
   const front=wall('kitchen-front',117,54),back=wall('kitchen-back',117,51),diningBack=wall('dining-back',124,55.5),eye=new Vector3(0,.3,1).normalize();
   expect(retreatExcavationCutsMesh(front,'a3',eye)).toBe(true);expect(retreatExcavationCutsMesh(back,'a3',eye)).toBe(false);expect(retreatExcavationCutsMesh(diningBack,'a3',eye)).toBe(false);expect(retreatExcavationCutsMesh(diningBack,'a3',eye,new Vector3(117,18,53.25))).toBe(true);expect(retreatExcavationCutsMesh(front,null,eye)).toBe(false);
  }finally{f.dispose();}
 });
 it('lets an opaque glTF book material honor one mesh fade while unfaded siblings remain opaque and restores its exact mode',()=>{
  const f=fixture();try{
   const material=new PBRMaterial('original-glTF-paper',f.scene);material.environmentBRDFTexture=null;material.transparencyMode=Material.MATERIAL_OPAQUE;
   const front=MeshBuilder.CreateBox('front-book',{width:2,height:2,depth:.12},f.scene),other=MeshBuilder.CreateBox('unrelated-book',{},f.scene);
   front.position.set(110,19,65);other.position.set(130,19,65);for(const mesh of [front,other]){mesh.material=material;mesh.hasVertexAlpha=false;mesh.metadata={tokenOccluder:true};mesh.computeWorldMatrix(true);}
   expect(material.needAlphaBlendingForMesh(front)).toBe(false);
   const c=createRetreatLocalOcclusion(f.scene,{coherentPrimitives:true});c.update(new Vector3(110,18,60),1.8,0,'hero');
   expect(front.material).toBe(material);expect(other.material).toBe(material);expect(material.needAlphaBlendingForMesh(front)).toBe(true);expect(material.needAlphaBlendingForMesh(other)).toBe(false);expect(other.visibility).toBe(1);
   c.restore();expect(material.transparencyMode).toBe(Material.MATERIAL_OPAQUE);expect(material.needAlphaBlendingForMesh(front)).toBe(false);c.dispose();
  }finally{f.dispose();}
 });
 it('fades the books and wood of only the intersecting GLB shelf even when a narrow book primitive misses all body rays',()=>{
  for(const coherentPrimitives of [false,true]){
   const f=fixture();try{
    const wood=MeshBuilder.CreateBox('Library_Shelf_primitive0',{width:1.8,height:2,depth:.12},f.scene),books=MeshBuilder.CreateBox('Library_Shelf_primitive1',{width:.10,height:.3,depth:.12},f.scene),other=MeshBuilder.CreateBox('Other_Shelf_primitive1',{width:.10,height:.3,depth:.12},f.scene);
    wood.position.set(110,19,65);books.position.set(110.7,19.35,65);other.position.set(130,19.35,65);
    for(const mesh of [wood,books,other]){mesh.metadata={tokenOccluder:true,gltf:{extras:{role:'freestanding-shelf'}}};mesh.computeWorldMatrix(true);}
    const c=createRetreatLocalOcclusion(f.scene,{coherentPrimitives});c.update(new Vector3(110,18,60),1.8,0,'hero');
    expect(wood.visibility).toBeLessThan(1);expect(books.visibility<1).toBe(coherentPrimitives);expect(other.visibility).toBe(1);expect(books.isVisible).toBe(true);
    c.restore();expect([wood.visibility,books.visibility,other.visibility]).toEqual([1,1,1]);c.dispose();
   }finally{f.dispose();}
  }
 });
 it('keeps independent cached sight rays for several combatants and restores their presentation together',()=>{
  const f=fixture();try{
   const walls=[110,130].map((x,i)=>{const m=MeshBuilder.CreateBox('combat-wall-'+i,{width:2,height:2,depth:.1},f.scene);m.position.set(x,19,65);m.metadata={tokenOccluder:true};m.computeWorldMatrix(true);return m;});
   const a=MeshBuilder.CreateBox('actor:first:body',{},f.scene),b=MeshBuilder.CreateBox('actor:second:body',{},f.scene),c=createRetreatLocalOcclusion(f.scene);
   c.update(new Vector3(110,18,60),1.8,0,'first');c.update(new Vector3(130,18,60),1.05,0,'second');
   expect(walls.every(w=>w.visibility<1&&w.isVisible)).toBe(true);expect(a.renderingGroupId).toBe(1);expect(b.renderingGroupId).toBe(1);expect(c.stats.rays).toBe(24);
   c.restore();c.update(new Vector3(110,18,60),1.8,.1,'first');c.update(new Vector3(130,18,60),1.05,.1,'second');expect(c.stats.rays).toBe(0);expect(walls.every(w=>w.visibility<1)).toBe(true);
   c.dispose();expect(walls.every(w=>w.visibility===1)).toBe(true);expect(a.renderingGroupId).toBe(0);expect(b.renderingGroupId).toBe(0);
  }finally{f.dispose();}
 });
 it('partitions only the approved decorative shells and preserves their surface, UVs, shared material and original source',()=>{
  const f=fixture();try{
   const m=MeshBuilder.CreateBox('Stone_P6_Joined_Excavated_Mountain_Crest',{width:44,height:3,depth:24},f.scene);m.position.set(110,23,52);m.rotationQuaternion=Quaternion.Identity();m.metadata={gltf:{extras:{vttInterior:'upper-caves',vttCutaway:'roof'}},refinementPhase:8,stoneStage:3,tokenOccluder:true};m.material=new StandardMaterial('shared',f.scene);
   const positions=Array.from(m.getVerticesData('position')!),uvs=Array.from(m.getVerticesData('uv')!),matrix=Array.from(m.computeWorldMatrix(true).asArray()),before=area(m),meshes=[m],result=splitRetreatUpperShells(meshes);
   expect(result.sources).toEqual([m]);expect(result.parts).toHaveLength(3);expect(result.additionalMeshes).toBe(2);expect(m.isEnabled()).toBe(false);expect(m.isDisposed()).toBe(false);
   expect(Array.from(m.getVerticesData('position')!)).toEqual(positions);expect(Array.from(m.getVerticesData('uv')!)).toEqual(uvs);expect(Array.from(m.computeWorldMatrix(true).asArray())).toEqual(matrix);
   expect(result.parts.reduce((sum,p)=>sum+area(p),0)).toBeCloseTo(before,3);
   for(const p of result.parts){expect(p.material).toBe(m.material);expect(p.checkCollisions).toBe(false);expect(Array.from(p.computeWorldMatrix(true).asArray())).toEqual(matrix);for(const u of p.getVerticesData('uv')!)expect(u).toBeGreaterThanOrEqual(-1e-6);}
   const back=result.parts.find(p=>p.metadata.retreatOcclusionPart==='backing')!;expect(back.metadata.permanentBackdrop).toBe(true);expect(back.metadata.tokenOccluder).toBe(false);expect(retreatRoofCutsMesh(back,'a4')).toBe(false);
  }finally{f.dispose();}
 });
 it('preserves the exact authored cell wall matrix while the camp animation settles, without editing vertex data',()=>{const f=fixture();try{const wall=MeshBuilder.CreateBox('a1:room-1:face-0:stone',{},f.scene);wall.position.set(80,10,82);const matrix=Array.from(wall.computeWorldMatrix(true).asArray()),vertices=Array.from(wall.getVerticesData('position')!);expect(keepRetreatCellWallsStable([wall])).toEqual([wall]);wall.scaling.y=.035;expect(Array.from(wall.computeWorldMatrix(true).asArray())).toEqual(matrix);expect(Array.from(wall.getVerticesData('position')!)).toEqual(vertices);}finally{f.dispose();}});
 it('separates existing stone submeshes from furniture using shared geometry/materials, without changing vertices or indices',()=>{const f=fixture();try{const m=MeshBuilder.CreateBox('a1:room-1:furniture',{},f.scene),stone=new StandardMaterial('a1:carved-cliff-v10',f.scene),wood=new StandardMaterial('a1:wood',f.scene),multi=new MultiMaterial('original',f.scene);multi.subMaterials=[stone,wood];m.material=multi;m.subMeshes=[];new SubMesh(0,0,m.getTotalVertices(),0,18,m);new SubMesh(1,0,m.getTotalVertices(),18,18,m);const vertices=Array.from(m.getVerticesData('position')!),indices=Array.from(m.getIndices()!),matrix=Array.from(m.computeWorldMatrix(true).asArray()),original=[...m.subMeshes],controller=separateRetreatCellStructure(f.scene,[m]);expect(controller.pairs).toHaveLength(1);const p=controller.pairs[0]!.proxy;expect(p.geometry).toBe(m.geometry);expect(p.material).toBe(m.material);expect(Array.from(m.getVerticesData('position')!)).toEqual(vertices);expect(Array.from(m.getIndices()!)).toEqual(indices);expect(Array.from(p.computeWorldMatrix(true).asArray())).toEqual(matrix);expect(m.subMeshes).toHaveLength(1);expect(m.subMeshes[0]!.getMaterial()).toBe(wood);expect(p.subMeshes).toHaveLength(1);expect(p.subMeshes[0]!.getMaterial()).toBe(stone);m.isVisible=false;controller.sync();expect(p.isVisible).toBe(false);controller.dispose();expect(m.subMeshes).toEqual(original);expect(p.isDisposed()).toBe(true);expect(Array.from(m.getIndices()!)).toEqual(indices);}finally{f.dispose();}});
 it('does not divide canonical furniture or unrelated scenery',()=>{const f=fixture();try{const m=MeshBuilder.CreateBox('a1:room-1:furniture',{},f.scene);const result=splitRetreatUpperShells([m]);expect(result.parts).toEqual([]);expect(m.isEnabled()).toBe(true);}finally{f.dispose();}});
 it('lifts only a local occupied roof while retaining walls and permanent backing',()=>{const f=fixture();try{const m=MeshBuilder.CreateBox('roof',{},f.scene);m.metadata={gltf:{extras:{vttInterior:'a4',vttCutaway:'roof'}}};expect(retreatRoofCutsMesh(m,'a4')).toBe(true);expect(retreatRoofCutsMesh(m,'a3')).toBe(false);m.metadata.gltf.extras.vttCutaway='wall';expect(retreatRoofCutsMesh(m,'a4')).toBe(false);m.metadata.permanentBackdrop=true;m.metadata.gltf.extras.vttCutaway='roof';expect(retreatRoofCutsMesh(m,'a4')).toBe(false);}finally{f.dispose();}});
 it('keeps an occluding furniture batch recognizable and restores its exact visibility/order on exit',()=>{
  const f=fixture();try{
   const m=MeshBuilder.CreateBox('a1:room-1:furniture',{width:2,height:2,depth:1},f.scene);m.position.set(110,19,65);m.metadata={tokenOccluder:true};m.computeWorldMatrix(true);const ix=Array.from(m.getIndices()!),matrix=Array.from(m.getWorldMatrix().asArray()),order=m.alphaIndex,c=createRetreatLocalOcclusion(f.scene);
   c.update(new Vector3(110,18,60),1.65,0);expect(m.isVisible).toBe(true);expect(m.visibility).toBeCloseTo(.38);expect(m.alphaIndex).toBe(2);expect(c.stats.hiddenFurniture).toBe(0);expect(Array.from(m.getIndices()!)).toEqual(ix);expect(Array.from(m.getWorldMatrix().asArray())).toEqual(matrix);
   c.restore();expect(m.visibility).toBe(1);expect(m.isVisible).toBe(true);expect(m.alphaIndex).toBe(order);c.update(null,1.65,1);expect(m.visibility).toBe(1);
  }finally{f.dispose();}
 });
 it('retains the silhouette of a foreground column, ignores a rear column and never changes collision',()=>{const f=fixture();try{const a=MeshBuilder.CreateBox('front',{},f.scene),b=MeshBuilder.CreateBox('rear',{},f.scene);for(const [m,z] of [[a,65],[b,55]] as const){m.position.set(110,19,z);m.metadata={tokenOccluder:true,gltf:{extras:{role:'column'}}};m.checkCollisions=true;m.computeWorldMatrix(true);}const c=createRetreatLocalOcclusion(f.scene);c.update(new Vector3(110,18,60),1.65,0);expect(a.isVisible).toBe(true);expect(a.visibility).toBeCloseTo(.3);expect(b.visibility).toBe(1);expect(a.checkCollisions).toBe(true);expect(b.checkCollisions).toBe(true);}finally{f.dispose();}});
 it('does not reveal furniture in an unoccupied cell, or fade nonoccluding permanent terrain',()=>{const f=fixture();try{const a=MeshBuilder.CreateBox('a1:room-2:furniture',{},f.scene),b=MeshBuilder.CreateBox('backing',{},f.scene);for(const m of [a,b]){m.position.set(110,19,65);m.metadata={tokenOccluder:true};m.computeWorldMatrix(true);}a.isVisible=false;b.metadata.permanentBackdrop=true;const c=createRetreatLocalOcclusion(f.scene);c.update(new Vector3(110,18,60),1.65,0);expect(a.isVisible).toBe(false);expect(b.visibility).toBe(1);}finally{f.dispose();}});
 it('attenuates one GLB instance through a temporary shared-geometry proxy without fading its siblings',()=>{const f=fixture();try{const source=MeshBuilder.CreateBox('source',{},f.scene);source.position.set(200,19,65);source.metadata={tokenOccluder:false};const front=source.createInstance('front-instance'),other=source.createInstance('other-instance');front.position.set(110,19,65);other.position.set(130,19,65);front.metadata={tokenOccluder:true,gltf:{extras:{role:'column'}}};other.metadata={tokenOccluder:false};for(const m of [source,front,other])m.computeWorldMatrix(true);const matrix=Array.from(front.getWorldMatrix().asArray()),c=createRetreatLocalOcclusion(f.scene);c.update(new Vector3(110,18,60),1.65,0);const proxy=f.scene.meshes.find(m=>m.metadata?.retreatOcclusionProxy) as any;expect(front.isVisible).toBe(false);expect(source.visibility).toBe(1);expect(other.visibility).toBe(1);expect(other.isVisible).toBe(true);expect(proxy.geometry).toBe(source.geometry);expect(proxy.material).toBe(source.material);expect(proxy.visibility).toBeCloseTo(.3);expect(Array.from(proxy.getWorldMatrix().asArray())).toEqual(matrix);c.restore();expect(front.isVisible).toBe(true);expect(proxy.isVisible).toBe(false);c.dispose();expect(proxy.isDisposed()).toBe(true);expect(source.isDisposed()).toBe(false);}finally{f.dispose();}});
 it('shares an object opacity budget across overlapping GLB material primitives',()=>{const f=fixture();try{const meshes=Array.from({length:6},(_,i)=>{const m=MeshBuilder.CreateBox('Shelf_primitive'+i,{width:2,height:2,depth:.02},f.scene);m.position.set(110,19,65+i*.03);m.metadata={tokenOccluder:true,gltf:{extras:{role:'wall-shelf'}}};m.computeWorldMatrix(true);return m;});const c=createRetreatLocalOcclusion(f.scene);c.update(new Vector3(110,18,60),1.65,0);const opacity=1-meshes.reduce((v,m)=>v*(1-m.visibility),1);expect(opacity).toBeCloseTo(.3,6);expect(meshes.every(m=>m.isVisible)).toBe(true);c.restore();expect(meshes.every(m=>m.visibility===1)).toBe(true);}finally{f.dispose();}});
 it('limits cumulative foreground opacity through many walls without hiding their geometry',()=>{const f=fixture();try{const meshes=Array.from({length:10},(_,i)=>{const m=MeshBuilder.CreateBox('wall-'+i,{width:2,height:2,depth:.02},f.scene);m.position.set(110,19,65+i*.03);m.metadata={tokenOccluder:true};m.computeWorldMatrix(true);return m;});const c=createRetreatLocalOcclusion(f.scene);c.update(new Vector3(110,18,60),1.65,0);expect(1-meshes.reduce((v,m)=>v*(1-m.visibility),1)).toBeLessThanOrEqual(.450001);expect(meshes.every(m=>m.isVisible&&m.visibility>0)).toBe(true);}finally{f.dispose();}});
 it('composes only the known focus after translucent scenery and keeps the opaque depth buffer',()=>{const f=fixture();try{const body=MeshBuilder.CreateBox('actor:hero:body',{},f.scene),other=MeshBuilder.CreateBox('actor:other:body',{},f.scene),original={...f.scene.getAutoClearDepthStencilSetup(1)},c=createRetreatLocalOcclusion(f.scene);c.update(new Vector3(110,18,60),1.65,0,'hero');expect(body.renderingGroupId).toBe(1);expect(other.renderingGroupId).toBe(0);expect(f.scene.getAutoClearDepthStencilSetup(1).autoClear).toBe(false);c.restore();expect(body.renderingGroupId).toBe(0);c.dispose();expect(f.scene.getAutoClearDepthStencilSetup(1)).toEqual(original);}finally{f.dispose();}});
 it('reuses cached rays but invalidates after a door state or camera change',()=>{const f=fixture();try{const m=MeshBuilder.CreateBox('door',{},f.scene);m.position.set(110,19,65);m.metadata={tokenOccluder:true,gltf:{extras:{role:'hinged-door'}}};m.computeWorldMatrix(true);const c=createRetreatLocalOcclusion(f.scene),point=new Vector3(110,18,60);c.update(point,1.65,0);expect(c.stats.rays).toBe(12);c.restore();c.update(point,1.65,.1);expect(c.stats.rays).toBe(0);c.restore();c.invalidate();c.update(point,1.65,.11);expect(c.stats.rays).toBe(12);expect(retreatOcclusionOpacity(m)).toBe(.3);}finally{f.dispose();}});
});
