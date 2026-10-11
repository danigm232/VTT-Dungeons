import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { WRECK_STRUCTURE as S, wreckListHeight } from '../shared/wreck-structure.js';

/** Packed asymmetric bowl, not concentric torus rings or sticks floating on
 * the walking ring. Everything fits the non-walkable inner cofa footprint. */
export function buildHarpyNest(scene:Scene){
  const groups=new Map<StandardMaterial,Mesh[]>();
  const material=(id:string,color:string)=>{const m=new StandardMaterial(`harpy-nest:${id}`,scene);m.diffuseColor=Color3.FromHexString(color);m.specularColor=Color3.Black();m.backFaceCulling=false;return m;};
  const earth=material('packed-fibres','#69593b'),wood=material('weathered-twigs','#65543a'),straw=material('dry-grass','#80714a'),
    dark=material('hair-and-shadow','#483b28'),cloth=material('sail-rags','#756f57'),bone=material('old-bones','#898474'),metal=material('scraps','#a78952');
  const add=(m:Mesh,mat:StandardMaterial)=>{m.material=mat;const g=groups.get(mat)??[];g.push(m);groups.set(mat,g);return m;};
  const random=(i:number)=>{const n=Math.sin(i*127.1+73.13)*43758.5453;return n-Math.floor(n);};
  const radius=(a:number)=>1.00+.078*Math.sin(a*3+.4)+.046*Math.sin(a*7-1.2);
  const at=(x:number,y:number,z:number)=>new Vector3(S.origin.x+x-.035,S.crowHeight+y+wreckListHeight(S.origin.z+z),S.origin.z+z+.055);
  const bowlY=(r:number,a:number)=>.036+.30*Math.pow(r,2.8)+.05*r*Math.sin(a*3+.8);
  const tube=(id:string,path:Vector3[],r:number,mat:StandardMaterial)=>add(MeshBuilder.CreateTube(`harpy-nest:${id}`,{path,radius:r,tessellation:5},scene),mat);
  const pos:number[]=[],indices:number[]=[],normals:number[]=[],colors:number[]=[],uvs:number[]=[];
  const sectors=48,rings=6;
  for(let ring=0;ring<=rings;ring++)for(let i=0;i<=sectors;i++){
    const a=i/sectors*Math.PI*2,t=ring/rings,r=radius(a)*t,p=at(Math.cos(a)*r,bowlY(t,a),Math.sin(a)*r);
    pos.push(p.x,p.y,p.z);uvs.push(p.x*2,p.z*2);const shade=.68+.27*t+random(i+ring*77)*.08;colors.push(shade,shade,shade,1);
    if(ring<rings&&i<sectors){const n=ring*(sectors+1)+i;indices.push(n,n+1,n+sectors+1,n+1,n+sectors+2,n+sectors+1);}
  }
  const bed=new Mesh('harpy-nest:packed-bowl',scene),d=new VertexData();Object.assign(d,{positions:pos,indices,uvs,colors});VertexData.ComputeNormals(pos,indices,normals);
  if(normals.filter((_,i)=>i%3===1).reduce((a,b)=>a+b,0)<0)for(let i=0;i<normals.length;i++)normals[i]=-normals[i]!;
  d.normals=normals;d.applyToMesh(bed);add(bed,earth);
  // Short curved branches cross one another at unrelated angles; each has
  // variable length/height rather than repeating a perfect basket circle.
  for(let i=0;i<260;i++){
    const a=random(i+17)*Math.PI*2,t=.54+random(i+401)*.47,r=radius(a)*t,span=.20+random(i+81)*.42,twist=a+Math.PI/2+(random(i+611)-.5)*1.9;
    const p=at(Math.cos(a)*r,bowlY(t,a)+.012+random(i+29)*.075,Math.sin(a)*r),v=new Vector3(Math.cos(twist)*span,0,Math.sin(twist)*span);
    tube(`woven-branch:${i}`,[p.subtract(v.scale(.5)),p.add(new Vector3(.03,random(i+99)*.045,-.02)),p.add(v.scale(.5))],.010+random(i+222)*.015,i%5===0?dark:wood);
  }
  for(let i=0;i<500;i++){
    const a=random(i+771)*Math.PI*2,t=Math.sqrt(random(i+991))*.94,r=radius(a)*t,p=at(Math.cos(a)*r,bowlY(t,a)+.038,Math.sin(a)*r),v=new Vector3(Math.cos(a+.7)*.15,.025,Math.sin(a+.7)*.15);
    tube(`grass:${i}`,[p.subtract(v),p,p.add(v.scale(1.2))],.0045+random(i+1141)*.004,i%8===0?dark:straw);
  }
  for(let i=0;i<5;i++){
    const a=i*1.93,t=.48+(i%2)*.22,p=at(Math.cos(a)*t,bowlY(t,a)+.062,Math.sin(a)*t),m=new Mesh(`harpy-nest:crumpled-rag:${i}`,scene),v=new VertexData(),ns:number[]=[];
    const points=[[-.19,0,-.09],[.13,.025,-.16],[.21,-.015,.03],[.08,.01,.16],[-.2,.035,.1]].map(([x,y,z])=>p.add(new Vector3(x!,y!,z!)));
    v.positions=points.flatMap(q=>[q.x,q.y,q.z]);v.indices=[0,1,2,0,2,3,0,3,4];VertexData.ComputeNormals(v.positions,v.indices,ns);v.normals=ns;v.applyToMesh(m);add(m,cloth);
  }
  for(let i=0;i<7;i++){
    const a=i*2.39,r=.36+(i%3)*.16,p=at(Math.cos(a)*r,bowlY(r,a)+.08,Math.sin(a)*r),end=p.add(new Vector3(Math.cos(a)*.20,.007,Math.sin(a)*.20));
    tube(`prey-bone:${i}`,[p,end],.018,bone);
    for(const q of [p,end]){const joint=MeshBuilder.CreateIcoSphere(`harpy-nest:prey-joint:${i}`,{radius:.032,subdivisions:1},scene);joint.position.copyFrom(q);joint.scaling.set(1.4,.65,1);add(joint,bone);}
    if(i%3===0){const scrap=MeshBuilder.CreateTorus(`harpy-nest:metal:${i}`,{diameter:.09,thickness:.014,tessellation:10},scene);scrap.position.copyFrom(p);add(scrap,metal);}
  }
  return [...groups].flatMap(([mat,parts])=>{const m=Mesh.MergeMeshes(parts,true,true,undefined,false,false);if(!m)return [];
    const points=m.getVerticesData('position')!;
    for(let i=0;i<points.length;i+=3){const dx=points[i]!-S.origin.x,dz=points[i+2]!-S.origin.z,r=Math.hypot(dx,dz);if(r>1.17){points[i]=S.origin.x+dx/r*1.17;points[i+2]=S.origin.z+dz/r*1.17;}}
    m.setVerticesData('position',points);m.name=`harpy-nest:batch:${mat.name}`;m.isPickable=false;m.receiveShadows=true;m.metadata={visualOnly:true,deckSurfaceId:'crow',kind:'harpy-nest',bowl:true};return [m];});
}
