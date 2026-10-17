import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';

/** Occasional distant birds and small insects: two shared draws, no actors,
 * encounters or collisions. Disabled by the reduced-motion preference. */
export function createCampLife(scene:Scene,root:TransformNode,profile:string,width:number,depth:number){
  const reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  const make=(name:string,color:string)=>{
    const mesh=new Mesh('ambient-life:'+name,scene),material=new StandardMaterial(mesh.name,scene);
    material.diffuseColor=Color3.FromHexString(color);material.emissiveColor=material.diffuseColor.scale(.16);material.specularColor=Color3.Black();material.backFaceCulling=false;
    mesh.material=material;mesh.parent=root;mesh.isPickable=false;mesh.checkCollisions=false;mesh.alwaysSelectAsActiveMesh=true;mesh.metadata={content:'VTT_AMBIENCE',decorativeOnly:true};
    const data=new VertexData();data.positions=new Float32Array(4*9);data.indices=Array.from({length:12},(_,i)=>i);data.normals=Array.from({length:12},()=>[0,1,0]).flat();data.applyToMesh(mesh,true);return {mesh,material};
  };
  const birds=make('birds',profile==='forest'?'#53614d':'#a3b2b6'),insects=make('insects','#c9ba81');let last=-Infinity;
  function update(time:number,dark:number){
    if(time-last<1/20)return;last=time;
    birds.mesh.setEnabled(!reduced&&dark<.7);insects.mesh.setEnabled(!reduced);
    for(const [group,isBird] of [[birds,true],[insects,false]] as const){
      const cycle=isBird?83:49,period=(time+(isBird?19:0))%cycle,progress=period/16;
      const fade=Math.max(0,Math.min(1,period/2,(16-period)/2));group.material.alpha=fade*(isBird?.72:dark>.7?.5:.8);
      const positions:number[]=[];
      for(let i=0;i<4;i++){
        const x=isBird?-18+progress*(width+36)+i*1.6:width*(.24+i*.16)+Math.sin(time*.8+i*2)*.8;
        const z=isBird?depth*.14+Math.sin(progress*3+i)*2:depth*.24+Math.cos(time*.65+i)*.7;
        const y=isBird?7.5+i*.24:1.1+Math.sin(time*.9+i)*.28;
        const wing=isBird?.3:.085,flap=Math.sin(time*(isBird?6:19)+i)*wing*.55;
        positions.push(x-wing,y+flap,z-.1,x,y,z+.07,x+wing,y+flap,z-.1);
      }
      group.mesh.updateVerticesData('position',positions,false,false);
    }
  }
  return {update};
}
