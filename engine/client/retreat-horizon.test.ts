import {describe,it,expect} from 'vitest';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder.js';
import {TransformNode} from '@babylonjs/core/Meshes/transformNode.js';
import {ArcRotateCamera} from '@babylonjs/core/Cameras/arcRotateCamera.js';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial.js';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';
import {refineRetreatCoast} from '../../campaigns/stormwreck-isle/public/retreat-refinement-coast';

function fixture(){
 const engine=new NullEngine(),scene=new Scene(engine);
 scene.clearColor.set(.225,.325,.43,1);
 const camera=new ArcRotateCamera('camera',Math.PI/2,85*Math.PI/180,280,new Vector3(91,14,80),scene);
 const sea=MeshBuilder.CreateGround('a1:bay-background',{width:360,height:360,subdivisions:8,updatable:true},scene);
 sea.position.set(100.5,-.15,94);sea.material=new StandardMaterial('existing-water',scene);
 const root=new TransformNode('glb-root',scene);root.scaling.z=-1;
 const sky=MeshBuilder.CreateSphere('P7_Maritime_Sky_Dome',{diameter:960,segments:8},scene);
 sky.parent=root;sky.position.set(90,0,-78);sky.infiniteDistance=true;sky.freezeWorldMatrix();
 return {engine,scene,camera,sea,sky,dispose:()=>engine.dispose()};
}
describe('Retreat C1 maritime closure',()=>{
 it('reuses the existing dome, restores an opaque gradient and makes it follow the camera',()=>{
  const f=fixture();try{
   const controller=refineRetreatCoast(f.scene);controller.update(0);
   expect(f.sky.parent).toBeNull();expect(f.sky.isWorldMatrixFrozen).toBe(false);expect(f.sky.infiniteDistance).toBe(true);
   expect(f.scene.meshes.filter(m=>m.name==='P7_Maritime_Sky_Dome')).toEqual([f.sky]);
   const colors=f.sky.getVerticesData('color')!;
   expect(Math.max(...colors.filter((_,i)=>i%4!==3))).toBeLessThan(.7);
   expect(colors.filter((_,i)=>i%4===3).every(a=>a===1)).toBe(true);
   for(const alpha of [Math.PI/3,Math.PI/2,2*Math.PI/3]){
    f.camera.alpha=alpha;f.camera.getViewMatrix(true);
    const center=f.sky.computeWorldMatrix(true).getTranslation();
    expect(Vector3.Distance(center,f.camera.globalPosition)).toBeLessThan(.0001);
   }
   expect(f.sky.checkCollisions).toBe(false);expect(f.sky.isPickable).toBe(false);
  }finally{f.dispose();}
 });
 it('adds one water mesh sharing the native material with an open inland edge',()=>{
  const f=fixture();try{
   const before=f.scene.meshes.length,textures=f.scene.textures.length,lights=f.scene.lights.length;
   const c=refineRetreatCoast(f.scene),skirt=f.scene.getMeshByName('retreat:bay-maritime-skirt')!;
   expect(f.scene.meshes.length-before).toBe(1);expect(skirt.material).toBe(f.sea.material);
   expect(f.scene.textures.length).toBe(textures);expect(f.scene.lights.length).toBe(lights);
   expect(skirt.metadata.inlandEdgeOpen).toBe(true);expect(c.stats.inlandOceanAdded).toBe(false);
   expect(skirt.metadata.stoneShadowCaster).toBe(false);
   expect(skirt.isPickable).toBe(false);expect(skirt.checkCollisions).toBe(false);
   const p=skirt.getVerticesData('position')!,indices=skirt.getIndices()!;
   const [a,b,d]=[indices[0]!,indices[1]!,indices[2]!];
   const crossY=(p[b*3+2]!-p[a*3+2]!)*(p[d*3]!-p[a*3]!)-(p[b*3]!-p[a*3]!)*(p[d*3+2]!-p[a*3+2]!);
   // Babylon's left-handed ground uses clockwise winding viewed from above.
   expect(crossY).toBeLessThan(0);
   for(let i=0;i<indices.length;i+=3){
    const vertices=[indices[i]!,indices[i+1]!,indices[i+2]!];
    // No skirt triangle is placed behind the middle of the northern edge.
    expect(vertices.every(v=>p[v*3+2]! < -86.001 && p[v*3]!>0 && p[v*3]!<175)).toBe(false);
   }
  }finally{f.dispose();}
 });
 it('keeps the landing ceiling and leaves the original offshore waves untouched',()=>{
  const f=fixture();try{
   const c=refineRetreatCoast(f.scene),p=f.sea.getVerticesData('position')!;
   for(let i=1;i<p.length;i+=3)p[i]=1.2+Math.sin(i)*.5;
   f.sea.updateVerticesData('position',p);const original=[...p];c.update(1);
   const result=f.sea.getVerticesData('position')!,world=f.sea.computeWorldMatrix(true);
   for(let i=0;i<result.length;i+=3){
    const point=Vector3.TransformCoordinates(new Vector3(result[i]!,result[i+1]!,result[i+2]!),world);
    if(point.x>=0&&point.x<=175&&point.z>=43&&point.z<=132)expect(point.y).toBeLessThanOrEqual(.080001);
    else expect(result[i+1]).toBe(original[i+1]);
   }
  }finally{f.dispose();}
 });
 it('uses a darker blue sky at night and tolerates unavailable optional meshes',()=>{
  const f=fixture();try{
   const c=refineRetreatCoast(f.scene),material=f.sky.material as StandardMaterial;
   c.update(0);const day=material.emissiveColor.clone();f.scene.clearColor.set(.035,.065,.11,1);c.update(1);
   expect(material.emissiveColor.r).toBeLessThan(day.r);expect(material.emissiveColor.b).toBeGreaterThan(material.emissiveColor.r);
   f.sky.dispose();f.sea.dispose();expect(()=>refineRetreatCoast(f.scene).update(2)).not.toThrow();
  }finally{f.dispose();}
 });
 it('retains provisional scenery for E1 without rendering its triangular faces over the sky',()=>{
  const f=fixture();try{
   const cone=MeshBuilder.CreateCylinder('Scenic_L5_Distant_Peak_North',{diameterTop:0},f.scene);
   const canon=MeshBuilder.CreateBox('A5_CANON_Column',{},f.scene);
   refineRetreatCoast(f.scene);
   expect(cone.isEnabled()).toBe(false);expect(cone.isDisposed()).toBe(false);
   expect(cone.metadata.retreatSuppressedPlaceholder).toBe(true);expect(canon.isEnabled()).toBe(true);
  }finally{f.dispose();}
 });
 it('fades only distant water while keeping the playable coastal footprint opaque',()=>{
  const f=fixture();try{
   const colors=new Float32Array(f.sea.getTotalVertices()*4).fill(1);f.sea.setVerticesData('color',colors,true,4);
   const c=refineRetreatCoast(f.scene);c.update(0);
   const p=f.sea.getVerticesData('position')!,rgba=f.sea.getVerticesData('color')!,world=f.sea.computeWorldMatrix(true);
   const outside:number[]=[];
   for(let i=0;i<p.length;i+=3){const v=Vector3.TransformCoordinates(new Vector3(p[i]!,p[i+1]!,p[i+2]!),world),alpha=rgba[i/3*4+3]!;
    expect(alpha).toBeGreaterThanOrEqual(0);expect(alpha).toBeLessThanOrEqual(1);
    if(v.x>=0&&v.x<=175&&v.z>=43&&v.z<=132)expect(alpha).toBe(1);else outside.push(alpha);
   }
   expect(Math.min(...outside)).toBe(0);expect(f.sea.hasVertexAlpha).toBe(true);
   const skirt=f.scene.getMeshByName('retreat:bay-maritime-skirt')!;expect(skirt.alphaIndex).toBeLessThan(f.sea.alphaIndex);
   skirt.receiveShadows=true;c.update(1);expect(skirt.receiveShadows).toBe(false);
  }finally{f.dispose();}
 });
});
