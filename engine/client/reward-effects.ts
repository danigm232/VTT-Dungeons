import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';

/** Presentation only: no dice, rewards, conditions or campaign mutations. */
export function rewardStarPose(index:number,progress:number){
  const p=Math.max(0,Math.min(1,progress)),angle=index*Math.PI/4+p*.8,radius=.28+p*.40;
  return{x:Math.cos(angle)*radius,y:1.15+p*.85+Math.sin(angle*2)*.10,z:Math.sin(angle)*radius,alpha:Math.sin(p*Math.PI),scale:.65+Math.sin(p*Math.PI)*.55};
}

export function createInspirationBurst(scene:Scene,anchor:()=>Vector3|null,now=()=>performance.now()){
  const material=new StandardMaterial('rewardInspirationGold',scene);material.disableLighting=true;material.backFaceCulling=false;material.disableDepthWrite=true;material.diffuseColor=material.emissiveColor=new Color3(1,.80,.29);material.specularColor=Color3.Black();
  const stars=Array.from({length:8},(_,index)=>{
    const mesh=new Mesh(`rewardInspirationStar-${index}`,scene),data=new VertexData(),positions=[0,0,0],indices:number[]=[];
    for(let i=0;i<8;i++){const a=i*Math.PI/4,r=i%2?.028:.105;positions.push(Math.cos(a)*r,Math.sin(a)*r,0);indices.push(0,i+1,(i+1)%8+1);}
    const normals:number[]=[];VertexData.ComputeNormals(positions,indices,normals);data.positions=positions;data.indices=indices;data.normals=normals;data.applyToMesh(mesh);
    mesh.material=material;mesh.billboardMode=Mesh.BILLBOARDMODE_ALL;mesh.isPickable=false;mesh.metadata={tokenOccluder:false,rewardEffect:'inspiration'};return mesh;
  });
  const startedAt=now();let disposed=false;
  const dispose=()=>{if(disposed)return;disposed=true;scene.onBeforeRenderObservable.remove(observer);for(const star of stars)star.dispose();material.dispose();};
  const observer=scene.onBeforeRenderObservable.add(()=>{
    const origin=anchor(),progress=(now()-startedAt)/1800;
    if(!origin||progress>=1){dispose();return;}
    for(const [index,star] of stars.entries()){const pose=rewardStarPose(index,progress);star.position.copyFrom(origin).addInPlace(new Vector3(pose.x,pose.y,pose.z));star.visibility=pose.alpha;star.scaling.setAll(pose.scale);star.rotation.z=progress*.8;}
  });
  return{stars,dispose};
}
