import type {Scene} from '@babylonjs/core/scene.js';
import type {Material} from '@babylonjs/core/Materials/material.js';
import {Mesh} from '@babylonjs/core/Meshes/mesh.js';
import {VertexData} from '@babylonjs/core/Meshes/mesh.vertexData.js';
import {CreateBoxVertexData} from '@babylonjs/core/Meshes/Builders/boxBuilder.js';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';
import {Color3} from '@babylonjs/core/Maths/math.color.js';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial.js';
import {FresnelParameters} from '@babylonjs/core/Materials/fresnelParameters.js';

type Bounds={x0:number;x1:number;y0:number;y1:number;z0:number;z1:number};
type Aperture={start:number;end:number;bottom:number;top:number;kind:'window'|'cable'|'socket';depthStart?:number;depthEnd?:number};
type Side='east'|'south';
const wallNames=['East_Wall','North_Wall','South_Wall','West_Wall_North','West_Wall_South'];
const extra=(m:Mesh)=>m.metadata?.gltf?.extras??{};

/** Divide a wall into rectangular, full-depth pieces around real apertures.
 * The cable slot is small and high; neither it nor the windows are entrances. */
export function winchWallPieces(box:Bounds,axis:'x'|'z',holes:readonly Aperture[]):Bounds[]{
 let pieces:Bounds[]=[box];
 for(const h of holes){
  const hole=axis==='x'?{x0:h.start,x1:h.end,y0:h.bottom,y1:h.top,z0:h.depthStart??box.z0,z1:h.depthEnd??box.z1}
   :{x0:h.depthStart??box.x0,x1:h.depthEnd??box.x1,y0:h.bottom,y1:h.top,z0:h.start,z1:h.end};
  pieces=pieces.flatMap(p=>{
   const x0=Math.max(p.x0,hole.x0),x1=Math.min(p.x1,hole.x1),y0=Math.max(p.y0,hole.y0),y1=Math.min(p.y1,hole.y1),z0=Math.max(p.z0,hole.z0),z1=Math.min(p.z1,hole.z1);
   if(x1-x0<1e-6||y1-y0<1e-6||z1-z0<1e-6)return [p];
   return [
    {...p,x1:x0},{...p,x0:x1},{...p,x0,x1,y1:y0},{...p,x0,x1,y0:y1},
    {...p,x0,x1,y0,y1,z1:z0},{...p,x0,x1,y0,y1,z0:z1}
   ].filter(v=>v.x1-v.x0>1e-5&&v.y1-v.y0>1e-5&&v.z1-v.z0>1e-5);
  });
 }
 return pieces;
}

/** Boxes are built in world metres and transformed back into the authored
 * mesh's space. UVs stay metric and vertical so planks keep a coherent grain. */
function applyBoxes(mesh:Mesh,boxes:readonly Bounds[]){
 const inverse=mesh.computeWorldMatrix(true).clone().invert();
 const normalToLocal=mesh.getWorldMatrix().clone().transpose();
 const positions:number[]=[],normals:number[]=[],uvs:number[]=[],indices:number[]=[];
 for(const b of boxes){
  const data=CreateBoxVertexData({width:b.x1-b.x0,height:b.y1-b.y0,depth:b.z1-b.z0});
  const p=data.positions!,n=data.normals!,ix=data.indices!,offset=positions.length/3;
  const center=new Vector3((b.x0+b.x1)/2,(b.y0+b.y1)/2,(b.z0+b.z1)/2);
  for(let i=0;i<p.length;i+=3){
   const world=new Vector3(p[i]!+center.x,p[i+1]!+center.y,p[i+2]!+center.z),normal=new Vector3(n[i]!,n[i+1]!,n[i+2]!);
   const local=Vector3.TransformCoordinates(world,inverse),localNormal=Vector3.TransformNormal(normal,normalToLocal).normalize();
   positions.push(local.x,local.y,local.z);normals.push(localNormal.x,localNormal.y,localNormal.z);
   const across=Math.abs(normal.x)>.5?world.z:world.x;
   uvs.push(across/1.35,Math.abs(normal.y)>.5?world.z/1.35:world.y/1.35);
  }
  indices.push(...Array.from(ix,index=>Number(index)+offset));
 }
 mesh.makeGeometryUnique();
 for(const kind of mesh.getVerticesDataKinds())mesh.removeVerticesData(kind);
 const data=new VertexData();Object.assign(data,{positions,normals,uvs,indices});data.applyToMesh(mesh);
 mesh.refreshBoundingInfo();mesh.computeWorldMatrix(true);
}

const rect=(x0:number,x1:number,y0:number,y1:number,z0:number,z1:number):Bounds=>({x0,x1,y0,y1,z0,z1});
function frameBoxes(side:Side,wall:Bounds,h:Aperture){
 const thickness=.09,mid=side==='south'?(wall.z0+wall.z1)/2:(wall.x0+wall.x1)/2,depth=.18;
 const beam=(a:number,b:number,y0:number,y1:number)=>side==='south'
  ?rect(a,b,y0,y1,mid-depth,mid+depth):rect(mid-depth,mid+depth,y0,y1,a,b);
 return [beam(h.start,h.start+thickness,h.bottom,h.top),beam(h.end-thickness,h.end,h.bottom,h.top),
  beam(h.start,h.end,h.bottom,h.bottom+thickness),beam(h.start,h.end,h.top-thickness,h.top),
  beam((h.start+h.end)/2-.026,(h.start+h.end)/2+.026,h.bottom,h.top)];
}
function glassBox(side:Side,wall:Bounds,h:Aperture){
 const mid=side==='south'?(wall.z0+wall.z1)/2:(wall.x0+wall.x1)/2;
 return side==='south'?rect(h.start+.06,h.end-.06,h.bottom+.06,h.top-.06,mid-.012,mid+.012)
  :rect(mid-.012,mid+.012,h.bottom+.06,h.top-.06,h.start+.06,h.end-.06);
}
function reflectionStrips(mesh:Mesh,side:Side,wall:Bounds,h:Aperture){
 const middle=side==='south'?(wall.z0+wall.z1)/2:(wall.x0+wall.x1)/2;
 const positions:number[]=[],normals:number[]=[],indices:number[]=[];
 for(const face of [-1,1])for(const [offset,width] of [[.24,.036],[.50,.018]] as const){
  const u=h.start+offset,y=h.bottom+.17,z=middle+face*.014;
  const points=[[u,y],[u+width,y],[u+.16+width,y+.69],[u+.16,y+.69]];
  const start=positions.length/3;
  for(const [across,height] of points){
   positions.push(...side==='south'?[across!,height!,z]:[z,height!,across!]);
   normals.push(...side==='south'?[0,0,face]:[face,0,0]);
  }
  indices.push(start,start+1,start+2,start,start+2,start+3);
 }
 const data=new VertexData();Object.assign(data,{positions,normals,indices});data.applyToMesh(mesh);
}

/** Refinish only the delivered A2 box walls. Source GLBs, collision footprints,
 * door state, winch transforms and its elevated chain are kept authoritative. */
export function installRetreatWinchHouse(scene:Scene){
 const walls=wallNames.flatMap(name=>['Base','Upper'].map(part=>scene.meshes.find(m=>m instanceof Mesh&&m.name===`${name}_${part}`&&m.metadata?.retreatZone==='a2') as Mesh|undefined));
 const wood=scene.materials.find(m=>/^Wood_Oiled_Used(?:\.\d+)?$/.test(m.name));
 const trim=scene.materials.find(m=>/^Wood_Endgrain(?:\.\d+)?$/.test(m.name))??wood;
 if(walls.some(w=>!w)||!wood||!trim)return {meshes:[] as Mesh[],records:[],sync:()=>{},installed:false};
 const glass=new StandardMaterial('retreat:winch-window-glass',scene);
 glass.diffuseColor=Color3.FromHexString('#78989d');glass.specularColor=Color3.FromHexString('#627d82');glass.specularPower=96;
 glass.emissiveColor=Color3.FromHexString('#213e49');glass.alpha=.68;glass.backFaceCulling=false;
 glass.emissiveFresnelParameters=new FresnelParameters();glass.emissiveFresnelParameters.leftColor=Color3.FromHexString('#879fa5');glass.emissiveFresnelParameters.rightColor=Color3.FromHexString('#263d42');glass.emissiveFresnelParameters.power=3;
 glass.metadata={content:'VTT_AMBIENCE',description:'Shared glazed panes with lighting and view-dependent sky-coloured glint'};
 const glint=new StandardMaterial('retreat:winch-window-glass-reflection',scene);
 glint.diffuseColor=Color3.FromHexString('#9ebbc0');glint.emissiveColor=Color3.FromHexString('#334a50');
 glint.specularColor=Color3.Black();glint.alpha=.16;glint.backFaceCulling=false;
 glint.metadata={content:'VTT_AMBIENCE',description:'Subtle stylized sky highlight; no additional reflection render pass'};
 const meshes:Mesh[]=[],owners:{owner:Mesh;parts:Mesh[]}[]=[],records:any[]=[];
 for(const wall of walls as Mesh[]){
  const bound=wall.computeWorldMatrix(true)&&wall.getBoundingInfo().boundingBox;
  const box=rect(bound.minimumWorld.x,bound.maximumWorld.x,bound.minimumWorld.y,bound.maximumWorld.y,bound.minimumWorld.z,bound.maximumWorld.z);
  const upper=wall.name.endsWith('_Upper'),side:Side|null=wall.name==='South_Wall_Upper'?'south':wall.name==='East_Wall_Upper'?'east':null;
  const axis=side==='east'||wall.name.startsWith('West_')?'z':'x',holes:Aperture[]=[];
  if(side){
   const start=side==='south'?161.85:66.05;
   holes.push({start,end:start+.94,bottom:15.98,top:17.04,kind:'window'});
  }
  // The existing feed crosses the south face at x=160.8, y=17.315.
  if(wall.name==='South_Wall_Upper'){
   holes.push({start:160.62,end:160.98,bottom:17.16,top:17.48,kind:'cable'});
   // Recess the existing timber support within the wall, without punching a
   // second opening through its outside face or shifting the lift assembly.
   holes.push({start:160.705,end:160.895,bottom:16.00,top:17.61,kind:'socket',depthStart:69.055,depthEnd:69.215});
  }
  const originalMaterial=wall.material?.name??null,pieces=winchWallPieces(box,axis,holes);
  applyBoxes(wall,pieces);wall.material=wood;
  wall.metadata={...wall.metadata,retreatWinchTimber:true,retreatWinchSourceMaterial:originalMaterial,retreatWinchHoles:holes};
  const parts:Mesh[]=[];
  if(upper&&side){
   const aperture=holes.find(h=>h.kind==='window')!;
   for(const [name,paint,boxes] of [
    ['frame',trim,frameBoxes(side,box,aperture)],
    ['glass',glass,[glassBox(side,box,aperture)]]
   ] as [string,Material,Bounds[]][]){
    const mesh=new Mesh(`retreat:winch-${side}-window-${name}`,scene);applyBoxes(mesh,boxes);mesh.material=paint;
    mesh.isPickable=false;mesh.checkCollisions=false;mesh.receiveShadows=true;
    mesh.metadata={content:'VTT_AMBIENCE',retreatZone:'a2',retreatFloor:false,tokenOccluder:false,retreatWinchWindowOwner:wall.name};
    parts.push(mesh);meshes.push(mesh);
   }
   const reflection=new Mesh(`retreat:winch-${side}-window-reflection`,scene);reflectionStrips(reflection,side,box,aperture);reflection.material=glint;
   reflection.isPickable=false;reflection.checkCollisions=false;reflection.receiveShadows=false;
   reflection.metadata={content:'VTT_AMBIENCE',retreatZone:'a2',retreatFloor:false,tokenOccluder:false,retreatWinchWindowOwner:wall.name};
   parts.push(reflection);meshes.push(reflection);
   owners.push({owner:wall,parts});
  }
  records.push({id:wall.name,from:originalMaterial,to:wood.name,bounds:box,holes,woodPieces:pieces.length});
 }
 return {meshes,records,installed:true,sync:()=>{
  for(const {owner,parts} of owners)for(const part of parts){
   // The panes and frames disappear with their owning wall during cutaway.
   part.isVisible=owner.isEnabled()&&owner.isVisible&&owner.visibility>.5;
  }
 }};
}
