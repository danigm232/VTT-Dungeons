import type { Scene } from '@babylonjs/core/scene.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Ray } from '@babylonjs/core/Culling/ray.js';
import { Material } from '@babylonjs/core/Materials/material.js';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial.js';

type Point = readonly [x: number, z: number];
const trails: { source: string; height: number; destination:string; grade:number; points: Point[] }[] = [
 {source:'SAL1_Decorative_Trail_Continuation',height:21.25,destination:'EXIT_PLEAMAR',grade:.035,points:[[12.75,44.25],[11.896,43.329],[10.92,42.594],[9.825,41.987],[8.585,41.604],[7.224,41.46],[5.8,41.2],[4.284,40.662],[2.922,39.607],[2.211,38.522],[1.9,37.5],[-1,34],[-5,31],[-10,29],[-15,25],[-18,19]]},
 {source:'R2_Pleamar_Low_Cove_Continuation',height:.569,destination:'EXIT_PLEAMAR',grade:0,points:[[12.75,92.25],[12.1,93.5],[10.8,95.1],[8.6,97.2],[5.8,99],[3.2,102.1],[-1,104.2],[-6,106],[-11,105.8],[-16,103],[-20,99]]},
 {source:'SAL2_Scenic_Trail_Continuation',height:37,destination:'EXIT_OBSERVATORIO',grade:.085,points:[[120.75,15.75],[119.8,14.8],[118.8,13.9],[117.5,12.8],[116.5,11.5],[115.5,9.7],[114,6.5],[114.5,3],[116.5,-1],[120,-4],[125,-8],[130,-11]]},
 {source:'SAL3_Scenic_Coast_Continuation',height:32.7,destination:'EXIT_OBSERVATORIO',grade:.045,points:[[159.75,26.25],[160.4,25.45],[161.3,24.7],[162.3,24],[163.6,23.3],[164.7,22.6],[165.4,20],[165.3,16.5],[164.4,13],[162.7,10],[161.5,5.5],[162,0],[164,-5]]},
];

const clamp01 = (value:number) => Math.max(0,Math.min(1,value));

/** Continue the four authored scenic ribbons on shared volcanic shoulders.
 * These are visual geography, never additional support surfaces or colliders
 * for movement. The four existing travel anchors remain authoritative. */
export function finishRetreatTrailEnds(scene: Scene): Mesh[] {
 const ground = scene.meshes.filter(mesh => mesh.isEnabled() && mesh.getTotalVertices() > 0 &&
  /^(SAL[1234].*(Ledge_Talus|Integrated_Shoulder|Backland|Weathered_Coastal_Shoulder)|V4_Pleamar_Continuous_Rock_Ledge|R2_Pleamar_Low_Cove_Continuation_Support|R3_.*Shoulder)/.test(mesh.name))
  .map(mesh => ({mesh,box:mesh.getBoundingInfo().boundingBox}));
 const finished: Mesh[] = [];
 let material: Material | null = null;
 const rock=scene.getMaterialByName('retreat:pbr:rock:distant')??
  ground.find(({mesh})=>mesh.material?.metadata?.category==='rock')?.mesh.material;
 const ray = new Ray(Vector3.Zero(),new Vector3(0,-1,0),100);
 for (const trail of trails) {
  const source = scene.getMeshByName(trail.source);
  if (!source?.isEnabled() || !source.material) continue;
  const positions:number[]=[], normals:number[]=[], uvs:number[]=[], colors:number[]=[], indices:number[]=[];
  const samples:Point[]=[];
  for (const [i,a] of trail.points.entries()) {
   const b=trail.points[i+1];
   const divisions=b?Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.23):1;
   for(let j=0;j<divisions;j++)samples.push(b?[a[0]+(b[0]-a[0])*j/divisions,a[1]+(b[1]-a[1])*j/divisions]:a);
  }
  const first=samples[0]!,next=samples[1]!;
  const lead=Math.hypot(next[0]-first[0],next[1]-first[1]);
  samples.unshift([first[0]-(next[0]-first[0])*.6/lead,first[1]-(next[1]-first[1])*.6/lead]);
  for(let pass=0;pass<3;pass++){
   const previous=[...samples];
   for(let i=2;i<samples.length-1;i++){
    const a=previous[i-1]!,b=previous[i]!,c=previous[i+1]!;
    samples[i]=[(a[0]+2*b[0]+c[0])/4,(a[1]+2*b[1]+c[1])/4];
   }
  }
  const lanes=[-1,-.68,-.33,0,.33,.68,1];
  const bankPositions:number[]=[],bankIndices:number[]=[],bankUVs:number[]=[],bankNormals:number[]=[],bankColors:number[]=[];
  let lastHeight=trail.height,distance=0;
  for (const [i,[x,z]] of samples.entries()) {
   if(i)distance+=Math.hypot(x-samples[i-1]![0],z-samples[i-1]![1]);
   const a=samples[Math.max(0,i-1)]!,b=samples[Math.min(samples.length-1,i+1)]!;
   const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
   ray.origin.set(x,100,z);
   const original=ray.intersectsMesh(source).pickedPoint;
   // The low route follows dry shore rather than pointing into the rock wall.
   // The other branches retain the authored strip before continuing round a bend.
   const low=trail.source==='R2_Pleamar_Low_Cove_Continuation';
   const measured=original?.y??(lastHeight+trail.grade*.23);
   // A historic coast ribbon ends with a triangle descending to the seabed.
   // Bound the scenic grade instead of inheriting that collapsed last face.
   const base=low?trail.height:i?Math.max(lastHeight-.035,Math.min(lastHeight+.035,measured)):trail.height;
   lastHeight=base;
   for (const [j,lane] of lanes.entries()) {
    const width=.78+.08*Math.sin(i*.57+lane*2)+.045*Math.sin(i*1.63);
    const px=x-lane*width*dz/length,pz=z+lane*width*dx/length;
    ray.origin.set(px,base+1.25,pz);
    let height=-Infinity;
    for (const {mesh,box} of ground) {
     if(px<box.minimumWorld.x||px>box.maximumWorld.x||pz<box.minimumWorld.z||pz>box.maximumWorld.z)continue;
     const hit=ray.intersectsMesh(mesh).pickedPoint;
     if(hit&&hit.y>base-.12&&hit.y<base+.12)height=Math.max(height,hit.y);
    }
    const t=i/(samples.length-1), edge=clamp01((1-Math.abs(lane))/.47);
    const end=clamp01((1-t)/.06), grain=.94+.06*Math.sin(i*.79+j*1.2);
    const grounded=Number.isFinite(height);
    const alpha=edge*end*grain;
    positions.push(px,i<2?base+.024:Math.max(base-.12,grounded?height:base)+.026,pz);
    uvs.push(px/1.7,pz/1.7);
    colors.push(.94,.91,.84,alpha);
    if(i&&j){const n=i*lanes.length+j;indices.push(n-8,n-7,n,n-8,n,n-1);}
   }
   if(rock){
    // A continuous rocky shoulder supports the scenic tread. The outer rows
    // descend into the existing hillside or below the sea in the tidal branch.
    const widths=[-3.1,-1.55,-.72,.72,1.55,3.1];
    for(const [j,lane] of widths.entries()){
     const variation=1+.12*Math.sin(distance*.73+j*.7)+.06*Math.sin(distance*1.91);
     const offset=lane*variation,px=x-offset*dz/length,pz=z+offset*dx/length;
     const drop=Math.abs(lane)<1?.07:Math.abs(lane)<2?.20:low?2.0:2.7+.42*Math.sin(distance*.57);
     bankPositions.push(px,base-drop,pz);
     bankUVs.push(px/3,pz/3);
     // Match the weathered vertex tint of the neighbouring volcanic outcrops.
     // A white strip reads as a newly cut retaining slab against those rocks.
     const mineral=.94+.06*Math.sin(distance*.47+j*1.7);
     bankColors.push(.70*mineral,.74*mineral,.72*mineral,1);
     if(i&&j){const n=i*widths.length+j;bankIndices.push(n-7,n-6,n,n-7,n,n-1);}
    }
   }
  }
  if (!material) {
   material=source.material.clone('retreat:feathered-trail-soil');
   if(!material) continue;
   material.backFaceCulling=false;
   if(material instanceof PBRMaterial && source.material instanceof PBRMaterial){
    material.albedoTexture=source.material.albedoTexture;
    material.transparencyMode=Material.MATERIAL_ALPHABLEND;
   }
  }
  VertexData.ComputeNormals(positions,indices,normals);
  // Match the lit face of the terrain regardless of the handedness of the route.
  if(normals.some((value,index)=>index%3===1&&value<-.5)){
   for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2]!,indices[i+1]!];
   VertexData.ComputeNormals(positions,indices,normals);
  }
  const mesh=new Mesh(source.name+':feathered',scene);
  const data=new VertexData();
  Object.assign(data,{positions,indices,normals,uvs,colors});
  data.applyToMesh(mesh);
  mesh.material=material;
  mesh.hasVertexAlpha=true;
  mesh.receiveShadows=source.receiveShadows;
  mesh.isPickable=false;
  mesh.checkCollisions=false;
  mesh.metadata={...source.metadata,content:'VTT_AMBIENCE',tokenOccluder:false,retreatFloor:false};
  source.setEnabled(false);
  finished.push(mesh);
  mesh.metadata.retreatDestinationIntent=trail.destination;
  if(rock&&bankPositions.length){
   VertexData.ComputeNormals(bankPositions,bankIndices,bankNormals);
   if(bankNormals.some((value,index)=>index%3===1&&value<-.5)){
    for(let i=0;i<bankIndices.length;i+=3)[bankIndices[i+1],bankIndices[i+2]]=[bankIndices[i+2]!,bankIndices[i+1]!];
    VertexData.ComputeNormals(bankPositions,bankIndices,bankNormals);
   }
   const bank=new Mesh(source.name+':rock-shoulder',scene),data=new VertexData();
   Object.assign(data,{positions:bankPositions,indices:bankIndices,normals:bankNormals,uvs:bankUVs,colors:bankColors});
   data.applyToMesh(bank);
   bank.material=rock;
   bank.isPickable=false;bank.checkCollisions=false;bank.receiveShadows=source.receiveShadows;
   bank.metadata={...mesh.metadata,permanentBackdrop:true,preferDistantMaterial:true};
   finished.push(bank);
  }
 }
 return finished;
}
