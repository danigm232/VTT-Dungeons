import {afterEach,describe,expect,it} from 'vitest';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder.js';
import {PBRMaterial} from '@babylonjs/core/Materials/PBR/pbrMaterial.js';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial.js';
import {ArcRotateCamera} from '@babylonjs/core/Cameras/arcRotateCamera.js';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';
import {isRetreatModuleFloor,preserveOpaqueRetreatGround,clearRetreatPlazaRock,RETREAT_PLAZA_CLEARANCE} from '../../campaigns/stormwreck-isle/public/retreat-ground-presentation.js';
import {createRetreatLocalOcclusion} from '../../campaigns/stormwreck-isle/public/retreat-local-occlusion.js';
const engines:NullEngine[]=[];afterEach(()=>engines.splice(0).forEach(e=>e.dispose()));
function fixture(){const engine=new NullEngine();engines.push(engine);return new Scene(engine);}
describe('Retiro · suelo estable delante de las celdas',()=>{
 it('gives the preserved opaque plaza depth in both material levels without changing its data or disabling visibility fade',()=>{
  const scene=fixture(),floor=MeshBuilder.CreateGround('a1:static:a1:plaza-v6',{},scene),colors=Array.from({length:floor.getTotalVertices()},()=>[.3,.4,.5,1]).flat();
  floor.setVerticesData('color',colors);const positions=Array.from(floor.getVerticesData('position')!),indices=Array.from(floor.getIndices()!);
  for(const material of [new PBRMaterial('detail',scene),new StandardMaterial('distant',scene)]){
   floor.material=material;floor.visibility=1;floor.hasVertexAlpha=true;
   expect(material.needAlphaBlendingForMesh(floor)).toBe(true);
   expect(preserveOpaqueRetreatGround(floor)).toBe(true);
   expect(material.needAlphaBlendingForMesh(floor)).toBeFalsy();
   floor.visibility=.25;expect(material.needAlphaBlendingForMesh(floor)).toBe(true);
  }
  expect(Array.from(floor.getVerticesData('color')!)).toEqual(colors);
  expect(Array.from(floor.getVerticesData('position')!)).toEqual(positions);
  expect(Array.from(floor.getIndices()!)).toEqual(indices);
 });
 it('keeps genuine vertex transparency intact',()=>{
  const scene=fixture(),ground=MeshBuilder.CreateGround('authored-alpha',{},scene),colors=Array.from({length:ground.getTotalVertices()},()=>[1,1,1,1]).flat();colors[3]=.4;
  ground.setVerticesData('color',colors);ground.hasVertexAlpha=true;
  expect(preserveOpaqueRetreatGround(ground)).toBe(false);expect(ground.hasVertexAlpha).toBe(true);
 });
 it('keeps the five plaza batches outside wall cutaway while a real foreground wall still fades',()=>{
  const scene=fixture();scene.activeCamera=new ArcRotateCamera('camera',Math.PI/2,Math.PI/2,100,new Vector3(110,19,60),scene);scene.activeCamera.getViewMatrix(true);
  const meshes=['earth','plaza','plaza-moss','plaza-warm','plaza-cool'].map((name,i)=>{const m=MeshBuilder.CreateBox(`a1:static:a1:${name}-v6`,{},scene);m.position.set(110,19,65+i);const floor=isRetreatModuleFloor('a1',m.name,'existing-context');m.metadata={retreatFloor:floor,tokenOccluder:!floor};m.computeWorldMatrix(true);return m;});
  const wall=MeshBuilder.CreateBox('front-wall',{},scene);wall.position.set(110,19,72);wall.metadata={tokenOccluder:true};wall.computeWorldMatrix(true);
  const occlusion=createRetreatLocalOcclusion(scene);occlusion.update(new Vector3(110,18,60),1.65,0);
  expect(meshes.every(m=>m.metadata.retreatFloor&&m.visibility===1)).toBe(true);expect(wall.visibility).toBeLessThan(1);occlusion.dispose();
 });
 it('does not turn vertical bedrock, gardens, furniture or other scenes into floors',()=>{
  for(const name of ['P3_Continuous_Plaza_Bedrock','Stone_P6_Continuous_Lower_Bedrock_Core','a1:garden-soil','a1:room-1:furniture'])expect(isRetreatModuleFloor('a1',name,'existing-context')).toBe(false);
  expect(isRetreatModuleFloor('a3','a1:static:a1:plaza-v6','existing-context')).toBe(false);
  expect(isRetreatModuleFloor('a3','DiningFloor','walkable-floor')).toBe(true);
 });
 it('clips only exterior rock intruding through the plaza, preserves shared source geometry and interpolates its surface attributes',()=>{
  const scene=fixture(),rock=MeshBuilder.CreateBox('a1:ridge:continuation_primitive0',{width:2,height:2,depth:2},scene);rock.position.set(100,9,88);rock.setVerticesData('color',Array.from({length:rock.getTotalVertices()},()=>[.3,.4,.5,1]).flat());
  const original=rock.clone('original-reference')!,geometry=original.geometry,positions=Array.from(original.getVerticesData('position')!),indices=Array.from(original.getIndices()!),report=clearRetreatPlazaRock(rock)!;
  expect(report.affectedTriangles).toBeGreaterThan(0);expect(rock.geometry).not.toBe(geometry);expect(original.geometry).toBe(geometry);expect(Array.from(original.getVerticesData('position')!)).toEqual(positions);expect(Array.from(original.getIndices()!)).toEqual(indices);expect(rock.position.asArray()).toEqual([100,9,88]);
  const p=rock.getVerticesData('position')!,ix=rock.getIndices()!,world=rock.computeWorldMatrix(true),b=RETREAT_PLAZA_CLEARANCE;
  for(let i=0;i<ix.length;i+=3){const points=[0,1,2].map(k=>Vector3.TransformCoordinates(Vector3.FromArray(p,ix[i+k]!*3),world)),center=points.reduce((v,a)=>v.add(a),Vector3.Zero()).scale(1/3);expect(center.x>b.minX+1e-6&&center.x<b.maxX-1e-6&&center.z>b.minZ+1e-6&&center.z<b.maxZ-1e-6&&center.y>b.ceiling+1e-6).toBe(false);}
  const colors=rock.getVerticesData('color')!;for(let i=0;i<colors.length;i+=4){expect(colors[i]).toBeCloseTo(.3);expect(colors[i+3]).toBe(1);}expect(clearRetreatPlazaRock(rock)).toBeNull();expect(clearRetreatPlazaRock(original)).toBeNull();
 });
});
