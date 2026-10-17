import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { WRECK_STRUCTURE as S, wreckListHeight } from '../shared/wreck-structure.js';
import { weatheredBoneMaterial } from './wreck-bone-material.js';

const TAU=Math.PI*2;
const random=(i:number)=>{const n=Math.sin(i*127.1+73.13)*43758.5453;return n-Math.floor(n);};
// Existing cofa walking centres: no new navigation layout.
export const nestWalkingCentres=[[-2.25,-1.5],[-.75,-1.5],[.75,-1.5],[2.25,-1.5],[-2.25,0],[2.25,0],[-2.25,1.5],[-.75,1.5],[.75,1.5],[2.25,1.5]] as const;
const walkingEdges=nestWalkingCentres.flatMap((a,i)=>nestWalkingCentres.slice(i+1).filter(b=>Math.hypot(a[0]-b[0],a[1]-b[1])<=1.501).map(b=>[a,b] as const));
export function nestWalkDistance(x:number,z:number){return Math.min(...walkingEdges.map(([a,b])=>{const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));return Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t);}));}
/** Visual offsets within original pickup cells. Server IDs still own reach,
 * inventory and collection. The basket never creates duplicate treasure. */
export function nestTreasureOffset(id:string){const offsets:Record<string,{x:number;y:number;z:number}>={
  'crow-bracelet':{x:-.18,y:.055,z:-.26},'crow-earring':{x:.21,y:.045,z:.23},
  'crow-tiger-eye-1':{x:.16,y:.045,z:.21},'crow-tiger-eye-2':{x:-.14,y:.05,z:-.25},'crow-heliotrope':{x:-.18,y:.05,z:.24}
};return offsets[id];}

/** Thick irregular basket, woven sides and trampled interior. Dressing follows
 * the leaning mast, leaves P10 open and clears all existing walking edges. */
export function buildHarpyNest(scene:Scene){
  const groups=new Map<StandardMaterial,Mesh[]>();
  const material=(id:string,color:string,pattern:'bark'|'fibres'|'cloth')=>{
    const m=new StandardMaterial(`harpy-nest:${id}`,scene);m.diffuseColor=Color3.FromHexString(color);m.specularColor=Color3.FromHexString('#10120f');m.specularPower=8;m.backFaceCulling=false;
    const size=128,data=new Uint8Array(size*size*4),normal=new Uint8Array(size*size*4);
    const sample=(x:number,y:number)=>{const u=x/size*TAU,v=y/size*TAU,fibre=Math.abs(Math.sin(u*29+v*17+Math.sin(u*4)*3)),grain=pattern==='cloth'?Math.sin(u*48)*Math.sin(v*48)*.045:pattern==='bark'?Math.sin(u*22+Math.sin(v*3))*.17:.07*Math.sin(u*19+v*5+Math.sin(v*7))-.20*Math.max(0,1-fibre*13);return .80+grain+.10*Math.sin(u*3+v*2)*Math.cos(v*4-u);};
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=(y*size+x)*4,n=sample(x,y);data[i]=Math.round(n*255);data[i+1]=Math.round(n*245);data[i+2]=Math.round(n*220);data[i+3]=255;
      normal[i]=Math.round((.5-(sample(x+1,y)-sample(x-1,y))*.35)*255);normal[i+1]=Math.round((.5-(sample(x,y+1)-sample(x,y-1))*.35)*255);normal[i+2]=250;normal[i+3]=255;}
    m.diffuseTexture=RawTexture.CreateRGBATexture(data,size,size,scene,true,false,Texture.TRILINEAR_SAMPLINGMODE);m.bumpTexture=RawTexture.CreateRGBATexture(normal,size,size,scene,true,false,Texture.TRILINEAR_SAMPLINGMODE);m.bumpTexture.level=.55;
    for(const t of [m.diffuseTexture,m.bumpTexture]){t.name=`${m.name}:${t===m.diffuseTexture?'colour':'normal'}`;t.wrapU=t.wrapV=Texture.WRAP_ADDRESSMODE;t.anisotropicFilteringLevel=4;}return m;
  };
  const earth=material('packed-fibres','#78664e','fibres'),wood=material('weathered-twigs','#715c42','bark'),straw=material('dry-grass','#9a8966','fibres'),
    dark=material('hair-and-shadow','#423b32','fibres'),cloth=material('sail-rags','#aaa38b','cloth'),bone=weatheredBoneMaterial(scene,'harpy-nest:old-bones','#e5e1d3'),feathers=material('feathers','#63665b','fibres');
  // The substrate is dirt/matted fibres, not a regular fabric-like lattice.
  earth.bumpTexture!.level=.16;(earth.diffuseTexture as Texture).uScale=(earth.diffuseTexture as Texture).vScale=.4;
  const add=(m:Mesh,mat:StandardMaterial)=>{m.material=mat;const g=groups.get(mat)??[];g.push(m);groups.set(mat,g);return m;};
  const mast={x:S.crowHeight*.015,z:-S.crowHeight*.021};
  const radius=(a:number)=>2.80+.025*Math.sin(a*3+.4)+.025*Math.sin(a*7-1.2);
  const at=(x:number,y:number,z:number)=>new Vector3(S.origin.x+x,S.crowHeight+y+wreckListHeight(S.origin.z+z),S.origin.z+z);
  const entrance=(a:number)=>1-Math.exp(-Math.pow(Math.atan2(Math.sin(a+.10),Math.cos(a+.10))/.42,4));
  const bedHeight=(x:number,z:number)=>{const r=Math.hypot(x,z),a=Math.atan2(z,x),rim=Math.min(1,Math.max(0,(r-2.15)/.66)),core=.16*Math.exp(-Math.pow((r-1.07)/.36,2));
    const h=.025+core+(.79+.12*Math.sin(a*3+.8))*Math.pow(rim,1.7)*entrance(a),clearance=Math.min(1,Math.max(0,(nestWalkDistance(x,z)-.28)/.24));return Math.min(h,.045+(h-.045)*clearance);};
  const tube=(id:string,path:Vector3[],r:number,mat:StandardMaterial)=>add(MeshBuilder.CreateTube(`harpy-nest:${id}`,{path,radius:r,radiusFunction:i=>r*(.62+.38*Math.sin(i/(path.length-1)*Math.PI)),tessellation:6,cap:Mesh.CAP_ALL},scene),mat);
  const surface=(id:string,points:Vector3[],indices:number[],mat:StandardMaterial,uv?:number[],shades?:number[])=>{const m=new Mesh(`harpy-nest:${id}`,scene),d=new VertexData(),ns:number[]=[];
    d.positions=points.flatMap(p=>[p.x,p.y,p.z]);d.indices=indices;d.uvs=uv??points.flatMap(p=>[(p.x-S.origin.x)*3,(p.z-S.origin.z)*3]);if(shades)d.colors=shades.flatMap(n=>[n,n,n,1]);VertexData.ComputeNormals(d.positions,indices,ns);
    // Babylon's left-handed winding must face upward on horizontal bedding.
    // Repair indices (not just normals), so the final batch recompute is safe.
    if(id!=='basket-thick-skirt'&&ns.filter((_,i)=>i%3===1).reduce((a,b)=>a+b,0)<0){for(let i=0;i<indices.length;i+=3){const swap=indices[i+1]!;indices[i+1]=indices[i+2]!;indices[i+2]=swap;}VertexData.ComputeNormals(d.positions,indices,ns);}
    d.normals=ns;d.applyToMesh(m);return add(m,mat);};
  // Bowl + closed thick skirt; the central aperture surrounds the leaned mast.
  const sectors=96,rings=18,points:Vector3[]=[],indices:number[]=[],shades:number[]=[];
  for(let ring=0;ring<=rings;ring++)for(let i=0;i<=sectors;i++){const a=i/sectors*TAU,t=ring/rings,r=radius(a),x=(mast.x+Math.cos(a)*.40)*(1-t)+Math.cos(a)*r*t,z=(mast.z+Math.sin(a)*.40)*(1-t)+Math.sin(a)*r*t;
    points.push(at(x,bedHeight(x,z),z));shades.push(.67+.28*t+random(i+ring*77)*.055);if(ring<rings&&i<sectors){const n=ring*(sectors+1)+i;indices.push(n,n+1,n+sectors+1,n+1,n+sectors+2,n+sectors+1);}}
  surface('basket-interior',points,indices,earth,undefined,shades);
  const sides:Vector3[]=[],sideIndices:number[]=[];
  for(let i=0;i<=sectors;i++){const a=i/sectors*TAU,r=radius(a),x=Math.cos(a)*r,z=Math.sin(a)*r;sides.push(at(x,bedHeight(x,z),z),at(x*.97,-.23-.05*Math.sin(a*5),z*.97));if(i<sectors){const n=i*2;sideIndices.push(n,n+1,n+2,n+2,n+1,n+3);}}
  surface('basket-thick-skirt',sides,sideIndices,earth,undefined,sides.map((_,i)=>i%2?.53:.91));
  // Tangled thick forked sticks, not yellow strokes.
  for(let i=0;i<96;i++){
    const a=random(i+2091)*TAU;if(entrance(a)<.6)continue;
    const fraction=.12+random(i+2371)*.78,path=Array.from({length:6},(_,j)=>{const angle=a+(j/5-.5)*(.20+random(i+2441)*.12),r=radius(angle)-.015,x=Math.cos(angle)*r,z=Math.sin(angle)*r;
      return at(x,-.17+(bedHeight(x,z)+.19)*fraction+Math.sin(j*.9+i)*.03,z);});
    tube(`side-weave:${i}`,path,.026+random(i+2511)*.022,i%7?wood:dark);
  }
  for(let i=0;i<260;i++){const a=random(i+17)*TAU,r=2.22+random(i+401)*.56;if(entrance(a)<.6)continue;const span=.35+random(i+81)*.68,twist=a+Math.PI/2+(random(i+611)-.5)*1.1;
    const path=Array.from({length:5},(_,j)=>{const t=j/4-.5,x=Math.cos(a)*r+Math.cos(twist)*span*t,z=Math.sin(a)*r+Math.sin(twist)*span*t;return at(x,bedHeight(x,z)+.025+.06*random(i+29)+Math.sin(j*.9+i)*.018,z);});
    const thickness=.028+random(i+222)*.030;tube(`woven-branch:${i}`,path,thickness,i%6===0?dark:wood);if(i%4===0){const p=path[2]!,q=p.add(new Vector3(Math.cos(twist+.8)*.22,.06,Math.sin(twist+.8)*.22));tube(`fork:${i}`,[p,q],thickness*.55,wood);}}
  // Clustered grass bundles and curled shavings supply bedding volume.
  let grassBladeCount=0;
  for(let i=0;i<440;i++){const a=random(i+771)*TAU,r=i<120?.58+random(i+991)*.97:Math.sqrt(.48*.48+random(i+991)*(2.73*2.73-.48*.48)),x=Math.cos(a)*r,z=Math.sin(a)*r;if(Math.hypot(x-mast.x,z-mast.z)<.60)continue;
    for(let j=0;j<6;j++){const angle=a+random(i*7+j+1181)*TAU,len=.33+random(i+j+1261)*.32,p:Vector3[]=[],idx:number[]=[],shade:number[]=[];
      for(let n=0;n<=3;n++){const t=n/3,px=x+Math.cos(angle)*len*(t-.5),pz=z+Math.sin(angle)*len*(t-.5),h=bedHeight(px,pz)+.035+Math.sin(t*Math.PI)*(.035+random(i+9)*.045),w=(.021+random(i+1141)*.017)*Math.pow(1-t,.6);
        p.push(at(px-Math.sin(angle)*w,h,pz+Math.cos(angle)*w),at(px,h+.015*(1-t),pz),at(px+Math.sin(angle)*w,h,pz-Math.cos(angle)*w));shade.push(...Array(3).fill(.78+random(i*6+j+1301)*.22));if(n<3){const k=n*3;idx.push(k,k+3,k+1,k+1,k+3,k+4,k+1,k+4,k+2,k+2,k+4,k+5);}}
      surface(`grass-bundle:${i}:${j}`,p,idx,j===5?earth:straw,undefined,shade);
      grassBladeCount++;
    }
    if(i%3===0){const p:Vector3[]=[],idx:number[]=[];for(let j=0;j<9;j++){const t=j/8,angle=t*TAU*.85+i,px=x+Math.cos(angle)*(.08+t*.05),pz=z+Math.sin(angle)*(.08+t*.05),h=bedHeight(px,pz)+.025+t*.06;p.push(at(px,h,pz),at(px+.025,h+.009,pz+.02));if(j<8){const n=j*2;idx.push(n,n+1,n+2,n+1,n+3,n+2);}}surface(`curled-shaving:${i}`,p,idx,wood);}}
  // Folded sailcloth: real holes, ragged edges and raised creases.
  for(let i=0;i<10;i++){const a=1.1+i*1.91,r=i<6?1.0+(i%3)*.38:2.63,cx=Math.cos(a)*r,cz=Math.sin(a)*r,p:Vector3[]=[],idx:number[]=[],uv:number[]=[],shade:number[]=[];
    for(let row=0;row<=6;row++)for(let col=0;col<=5;col++){const u=col/5,v=row/6,dx=(u-.5)*(.38+random(i+2)*.23),dz=(v-.5)*(.50+random(i+31)*.32)*(row===6?.72+.22*Math.sin(col*3+i):1),x=cx+Math.cos(a)*dx-Math.sin(a)*dz,z=cz+Math.sin(a)*dx+Math.cos(a)*dz,h=bedHeight(x,z)+.045+Math.pow(Math.sin(u*Math.PI*3+v+i),2)*.11;
      p.push(at(x,h,z));uv.push(u*2,v*3);shade.push(.70+.26*Math.abs(Math.sin(u*3+v+i)));if(row<6&&col<5&&!(row===3&&col===2)&&!(row>4&&col===(i%5))){const n=row*6+col;idx.push(n,n+6,n+1,n+1,n+6,n+7);}}
    surface(`folded-torn-sail:${i}`,p,idx,cloth,uv,shade);}
  // Five low scraps conceal part of the real pickup, leaving a small glint.
  // Removing loot never leaves a static duplicate jewel in the basket.
  for(const [id,x,z] of [['crow-bracelet',.75,-1.5],['crow-earring',.75,1.5],['crow-tiger-eye-1',2.25,1.5],['crow-tiger-eye-2',-.75,-1.5],['crow-heliotrope',-.75,1.5]] as const){
    const o=nestTreasureOffset(id)!,cx=x+o.x,cz=z+o.z;
    surface(`treasure-cover:${id}`,[at(cx-.14,.108,cz-.04),at(cx+.05,.115,cz-.11),at(cx+.09,.092,cz+.07),at(cx-.10,.10,cz+.11)],[0,2,1,0,3,2],cloth,[0,0,1,0,1,1,0,1],[.76,.88,.73,.81]);
  }
  for(let i=0;i<11;i++){const a=i*2.39+.9,r=.85+(i%3)*.22,x=Math.cos(a)*r,z=Math.sin(a)*r;if(Math.hypot(x-mast.x,z-mast.z)<.65)continue;
    const p=at(x,bedHeight(x,z)+.095,z),end=p.add(new Vector3(Math.cos(a)*(.25+(i%3)*.10),.035,Math.sin(a)*(.25+(i%3)*.10)));tube(`victim-bone:${i}`,[p,p.add(end).scale(.5).add(new Vector3(0,.035,0)),end],.032,bone);
    for(const q of [p,end]){const joint=MeshBuilder.CreateIcoSphere(`harpy-nest:bone-joint:${i}`,{radius:.063,subdivisions:1},scene);joint.position.copyFrom(q);joint.scaling.set(1.25,.7,1);add(joint,bone);}
    if(i%2===0)for(let j=0;j<4;j++){const angle=a+j*.12,path=Array.from({length:7},(_,n)=>p.add(new Vector3(Math.cos(angle)*n*.018,Math.sin(n/6*Math.PI)*.12,Math.sin(angle)*n*.018)));tube(`hair-clump:${i}:${j}`,path,.017,dark);}
    if(i===4||i===8){const skull=MeshBuilder.CreateIcoSphere(`harpy-nest:victim-skull:${i}`,{radius:.16,subdivisions:2},scene);skull.position.copyFrom(p.add(new Vector3(0,.035,0)));skull.scaling.set(.83,.74,1.08);add(skull,bone);for(const side of [-1,1]){const socket=MeshBuilder.CreateIcoSphere(`harpy-nest:skull-socket:${i}:${side}`,{radius:.047,subdivisions:1},scene);socket.position.copyFrom(p.add(new Vector3(side*.065,.09,.12)));socket.scaling.z=.35;add(socket,dark);}}}
  for(let i=0;i<32;i++){const a=i*2.39,r=.73+random(i+41)*1.78,x=Math.cos(a)*r,z=Math.sin(a)*r;if(Math.hypot(x-mast.x,z-mast.z)<.68)continue;const len=.19+random(i+62)*.20,p:Vector3[]=[],idx:number[]=[];
    for(let j=0;j<7;j++){const t=j/6,w=Math.sin(t*Math.PI)*.045,px=x+Math.cos(a)*len*t,pz=z+Math.sin(a)*len*t,h=bedHeight(px,pz)+.06+Math.sin(t*Math.PI)*.045;p.push(at(px-Math.sin(a)*w,h,pz+Math.cos(a)*w),at(px,h+.018,pz),at(px+Math.sin(a)*w*.78,h,pz-Math.cos(a)*w*.78));if(j<6){const n=j*3;idx.push(n,n+3,n+1,n+1,n+3,n+4,n+1,n+4,n+2,n+2,n+4,n+5);}}surface(`fallen-feather:${i}`,p,idx,i%3?feathers:dark);}
  return [...groups].flatMap(([mat,parts])=>{
    // Babylon merges only matching attribute sets. Colour-modulated cloth and
    // bowl meshes share batches with tubes, which need neutral vertex colours.
    for(const part of parts)if(!part.isVerticesDataPresent('color'))part.setVerticesData('color',new Array(part.getTotalVertices()*4).fill(1));
    const m=Mesh.MergeMeshes(parts,true,true,undefined,false,false);if(!m)return [];const p=m.getVerticesData('position')!;
    for(let i=0;i<p.length;i+=3){let x=p[i]!-S.origin.x,z=p[i+2]!-S.origin.z,r=Math.hypot(x,z);if(r>S.nestRadius){x=x/r*S.nestRadius;z=z/r*S.nestRadius;p[i]=S.origin.x+x;p[i+2]=S.origin.z+z;}
      const dx=x-mast.x,dz=z-mast.z,mr=Math.hypot(dx,dz);if(mr<.38){x=mast.x+dx/Math.max(mr,.001)*.38;z=mast.z+dz/Math.max(mr,.001)*.38;p[i]=S.origin.x+x;p[i+2]=S.origin.z+z;}
      if(nestWalkDistance(x,z)<.30)p[i+1]=Math.min(p[i+1]!,S.crowHeight+wreckListHeight(p[i+2]!)+.13);
      if(x>1.7&&z> -1.10&&z<.65)p[i+1]=Math.min(p[i+1]!,S.crowHeight+wreckListHeight(p[i+2]!)+.12);}
    m.setVerticesData('position',p);const ns:number[]=[];VertexData.ComputeNormals(p,m.getIndices()!,ns);m.setVerticesData('normal',ns);m.refreshBoundingInfo();m.name=`harpy-nest:batch:${mat.name}`;m.isPickable=false;m.receiveShadows=true;m.metadata={visualOnly:true,deckSurfaceId:'crow',kind:'harpy-nest',bowl:true,canonicalMaterials:true,grassBladeCount};return [m];});
}
