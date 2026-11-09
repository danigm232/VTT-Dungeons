import type {Scene} from '@babylonjs/core/scene.js';
import {Mesh} from '@babylonjs/core/Meshes/mesh.js';
import {VertexData} from '@babylonjs/core/Meshes/mesh.vertexData.js';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';
import {Ray} from '@babylonjs/core/Culling/ray.js';
import {BoundingInfo} from '@babylonjs/core/Culling/boundingInfo.js';
import {createCoastalAnimationVisibility} from '../../../engine/client/coastal-animation-visibility.js';
import {retreatWaterHeight} from './retreat-contact-surf.js';

/** Fill the sea-facing gap north of the native bay. Trace the existing eastern
 * cliff at water level so this surface starts outside the island. */
export function installRetreatEasternWater(scene:Scene,sea:Mesh){
 const shore:{x:number;z:number}[]=[];
 for(let z=-280;z<=44;z+=4){
  const hit=scene.pickWithRay(new Ray(new Vector3(220,.02,z),new Vector3(-1,0,0),100),
   m=>m.isEnabled()&&/^SAL3_Seaward_Cliff_/.test(m.name));
  if(hit?.pickedPoint)shore.push({x:hit.pickedPoint.x-.2,z});
 }
 if(shore.length<2)return null;
 const positions:number[]=[],normals:number[]=[],uvs:number[]=[],colors:number[]=[],indices:number[]=[];
 const bands=[0,4,40,512,8192],sourceUV=sea.getVerticesData('uv');
 const sourcePositions=sea.getVerticesData('position')!;
 const world=sea.computeWorldMatrix(true),inverse=world.clone().invert(),local=new Vector3();
 const side=Math.round(Math.sqrt(sourcePositions.length/3));
 const stepX=sourcePositions[3]!-sourcePositions[0]!,stepZ=sourcePositions[side*3+2]!-sourcePositions[2]!;
 const du=(sourceUV?.[2]??1)-(sourceUV?.[0]??0),dv=(sourceUV?.[side*2+1]??1)-(sourceUV?.[1]??0);
 for(const p of shore)for(const distance of bands){
  const x=p.x+distance;
  positions.push(x,retreatWaterHeight(sea,x,p.z),p.z);normals.push(0,1,0);
  Vector3.TransformCoordinatesFromFloatsToRef(x,0,p.z,inverse,local);
  uvs.push((sourceUV?.[0]??0)+(local.x-sourcePositions[0]!)*du/stepX,
   (sourceUV?.[1]??0)+(local.z-sourcePositions[2]!)*dv/stepZ);
  colors.push(.23,.43,.57,1);
 }
 for(let row=1;row<shore.length;row++){
  if(shore[row]!.z-shore[row-1]!.z>4.1)continue;
  for(let col=1;col<bands.length;col++){
   const n=row*bands.length+col;
   // Root-space Babylon winding, unlike the mirrored native GLB water root.
   indices.push(n-6,n-5,n,n-6,n,n-1);
  }
 }
 const mesh=new Mesh('retreat:eastern-coastal-water',scene),data=new VertexData();
 Object.assign(data,{positions,normals,uvs,colors,indices});data.applyToMesh(mesh,true);
 mesh.material=sea.material;mesh.hasVertexAlpha=true;mesh.alphaIndex=0;
 mesh.isPickable=false;mesh.checkCollisions=false;mesh.receiveShadows=false;
 mesh.metadata={content:'VTT_AMBIENCE',decorativeOnly:true,permanentBackdrop:true,
  tokenOccluder:false,retreatFloor:false,stoneShadowCaster:false,effect:'eastern-sea-continuity'};
 const bounds=mesh.getBoundingInfo().boundingBox;
 mesh.setBoundingInfo(new BoundingInfo(
  new Vector3(bounds.minimum.x,-7,bounds.minimum.z),
  new Vector3(bounds.maximum.x,7,bounds.maximum.z)));
 const visible=createCoastalAnimationVisibility(scene,[mesh],false);
 let version=-1;
 return {mesh,update(){
  mesh.receiveShadows=false;
  const next=sea.metadata?.coastalGeometryVersion??0;
  if(next===version||!visible())return;
  version=next;
  const sourceColors=sea.getVerticesData('color');
  for(let row=0;row<shore.length;row++){
   const p=shore[row]!,height=retreatWaterHeight(sea,p.x,p.z);
   Vector3.TransformCoordinatesFromFloatsToRef(p.x,0,p.z,inverse,local);
   const x=Math.max(0,Math.min(side-1,Math.round((local.x-sourcePositions[0]!)/stepX)));
   const z=Math.max(0,Math.min(side-1,Math.round((local.z-sourcePositions[2]!)/stepZ)));
   for(let band=0;band<bands.length;band++){
    const vertex=row*bands.length+band,fade=Math.exp(-bands[band]!/70);
    positions[vertex*3+1]=height*fade;
    for(let k=0;k<3;k++)colors[vertex*4+k]=sourceColors?.[(z*side+x)*4+k]??[.23,.43,.57][k]!;
   }
  }
  mesh.updateVerticesData('position',positions);mesh.updateVerticesData('color',colors);
 },stats:{shoreSamples:shore.length,triangles:indices.length/3,sharedWaterMaterial:true}};
}
