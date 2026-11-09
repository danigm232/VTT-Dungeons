import type {Scene} from '@babylonjs/core/scene.js';
import {Mesh} from '@babylonjs/core/Meshes/mesh.js';
import {VertexData} from '@babylonjs/core/Meshes/mesh.vertexData.js';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';
import {Color3} from '@babylonjs/core/Maths/math.color.js';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial.js';
import {Ray} from '@babylonjs/core/Culling/ray.js';
import {createCoastalAnimationVisibility} from '../../../engine/client/coastal-animation-visibility.js';
import {retreatWaterSampler} from './retreat-contact-surf.js';
import {RETREAT_WINCH_SEA_ROCKS} from './retreat-winch-sea-rocks.js';

/** Small, non-blocking marine growth and a low-cost animated contact wash.
 * Rays attach the growth to the actual 3D rocks. The wash samples the native
 * waves, uses the existing foam material and suspends updates off screen. */
export function installRetreatWinchMarineDetail(scene:Scene,sea:Mesh,rock:Mesh){
 const foamMaterial=scene.getMaterialByName('a1:shore-wash-v2');if(!foamMaterial)return null;
 const makeMaterial=(name:string,color:string)=>{const m=new StandardMaterial(name,scene);m.diffuseColor=Color3.FromHexString(color);m.specularColor=Color3.FromHexString('#202722');m.backFaceCulling=false;return m;};
 const shellMaterial=makeMaterial('retreat:a2-marine-shell','#a8aa93'),algaeMaterial=makeMaterial('retreat:a2-marine-algae','#526947');
 type Buffer={positions:number[];indices:number[];normals:number[]};
 const shells:Buffer={positions:[],indices:[],normals:[]},algae:Buffer={positions:[],indices:[],normals:[]};
 function tri(b:Buffer,a:Vector3,c:Vector3,d:Vector3){const n=Vector3.Cross(c.subtract(a),d.subtract(a)).normalize();const k=b.positions.length/3;for(const p of [a,c,d]){b.positions.push(p.x,p.y,p.z);b.normals.push(n.x,n.y,n.z);}b.indices.push(k,k+1,k+2);}
 const samples:{x:number;z:number;phase:number;sample:ReturnType<typeof retreatWaterSampler>}[]=[];
 for(const [index,spec] of RETREAT_WINCH_SEA_ROCKS.entries())for(let j=0;j<14;j++){
  const angle=j*Math.PI*2/14+index*.29,dir=new Vector3(Math.cos(angle),0,Math.sin(angle));
  const origin=new Vector3(spec.x+dir.x*spec.width,spec.y+.36+(j%3)*.22,spec.z+dir.z*spec.depth);
  const hit=new Ray(origin,dir.scale(-1),Math.max(spec.width,spec.depth)*2).intersectsMesh(rock);
  if(!hit.hit||!hit.pickedPoint)continue;
  const p=hit.pickedPoint,normal=(hit.getNormal(true)??dir).normalize(),tangent=Vector3.Cross(Vector3.Up(),normal).normalize(),up=Vector3.Cross(normal,tangent).normalize();
  if(tangent.lengthSquared()<.1)continue;
  // Tiny tapered shell clusters, embedded in the stone rather than floating.
  for(let n=0;n<3;n++){
   const center=p.add(tangent.scale((n-1)*.085)).add(up.scale((n%2)*.055)).add(normal.scale(.014)),radius=.035+((j+n+index)%3)*.014,tip=center.add(normal.scale(.05));
   for(let k=0;k<5;k++){const a=k*Math.PI*2/5,b=(k+1)*Math.PI*2/5;tri(shells,center.add(tangent.scale(Math.cos(a)*radius)).add(up.scale(Math.sin(a)*radius)),center.add(tangent.scale(Math.cos(b)*radius)).add(up.scale(Math.sin(b)*radius)),tip);}
  }
  if(j%4===0){
   // Two asymmetrical tapered fronds lie close to the damp rock face.
   for(let n=0;n<2;n++){const root=p.add(tangent.scale((n-.5)*.13)).add(normal.scale(.025)),length=.24+((index+j+n)%4)*.06,tip=root.add(up.scale(-length)).add(tangent.scale((n?1:-1)*.08));tri(algae,root.add(tangent.scale(-.035)),root.add(tangent.scale(.035)),tip);}
  }
  // Short discontinuous arcs prevent a uniform white ring around each rock.
  if(j%3!==0){const x=p.x+dir.x*.48,z=p.z+dir.z*.48;samples.push({x,z,phase:angle+index*1.7,sample:retreatWaterSampler(sea,x,z)});}
 }
 function staticBatch(name:string,b:Buffer,material:StandardMaterial){
  const mesh=new Mesh(name,scene),data=new VertexData();data.positions=b.positions;data.indices=b.indices;data.normals=b.normals;data.applyToMesh(mesh);mesh.material=material;mesh.isPickable=false;mesh.checkCollisions=false;mesh.metadata={content:'VTT_AMBIENCE',decorativeOnly:true,tokenOccluder:false,retreatFloor:false,stoneShadowCaster:false,refinementPhase:8};return mesh;
 }
 const shell=staticBatch('retreat:a2-barnacles',shells,shellMaterial),kelp=staticBatch('retreat:a2-algae',algae,algaeMaterial);
 const positions:number[]=[],indices:number[]=[],normals:number[]=[],colors:number[]=[],uvs:number[]=[];
 for(const [i,s] of samples.entries()){
  const r=.43,base=i*5;positions.push(s.x,0,s.z,s.x-r,0,s.z-r,s.x+r,0,s.z-r,s.x+r,0,s.z+r,s.x-r,0,s.z+r);
  indices.push(base,base+2,base+1,base,base+3,base+2,base,base+4,base+3,base,base+1,base+4);for(let k=0;k<5;k++){normals.push(0,1,0);colors.push(.9,.96,.95,0);uvs.push(k===2||k===3?1:0,k>=3?1:0);}
 }
 const wash=new Mesh('retreat:a2-rock-contact-foam',scene),data=new VertexData();Object.assign(data,{positions,indices,normals,colors,uvs});data.applyToMesh(wash,true);wash.material=foamMaterial;wash.hasVertexAlpha=true;wash.alphaIndex=2;wash.isPickable=false;wash.checkCollisions=false;wash.metadata={content:'VTT_AMBIENCE',decorativeOnly:true,tokenOccluder:false,retreatDynamic:true,stoneShadowCaster:false};
 const visible=createCoastalAnimationVisibility(scene,[wash],false);let version=-1;
 function update(time:number){const next=sea.metadata?.coastalGeometryVersion??0;if(next===version||!visible())return;version=next;const water=sea.getVerticesData('position');if(!water)return;
  for(const [i,s] of samples.entries()){const y=typeof s.sample==='number'?s.sample:s.sample(water),pulse=.5+.5*Math.sin(time*1.3+s.phase),alpha=.18+.35*pulse;for(let k=0;k<5;k++){positions[(i*5+k)*3+1]=y+.045;colors[(i*5+k)*4+3]=k===0?alpha:0;}}
  wash.updateVerticesData('position',positions);wash.updateVerticesData('color',colors);
 }
 return {meshes:[shell,kelp,wash],update,stats:{shellTriangles:shells.indices.length/3,algaeTriangles:algae.indices.length/3,foamPatches:samples.length,materials:2,reusedFoam:true}};
}
