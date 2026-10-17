import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { Material } from '@babylonjs/core/Materials/material.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { TerrainDefinition } from '../shared/terrain.js';
import type { BaseTexture } from '@babylonjs/core/Materials/Textures/baseTexture.js';
import { WRECK_STRUCTURE as S,wreckBeamAt,wreckListHeight } from '../shared/wreck-structure.js';
import { wreckCabinAt } from './wreck-cabins.js';
import { worldSurfaceUV } from './diorama-kit.js';
import { weatheredBoneMaterial } from './wreck-bone-material.js';

/** Chapter 3 dressing, not new furniture/loot: algae, split boards, rope,
 * boots, recent blood and skeletal fragments. Walking cell centres stay clear. */
export function buildWreckDeckDressing(scene:Scene,terrain:TerrainDefinition,wood?:BaseTexture){
  const groups=new Map<string,Mesh[]>(),materials=new Map<string,StandardMaterial>();
  const paint=(id:string,c:string)=>{const m=new StandardMaterial(`wreck-dressing:${id}`,scene);m.diffuseColor=Color3.FromHexString(c);m.specularColor=Color3.Black();m.backFaceCulling=false;materials.set(id,m);return m;};
  const moss=paint('wet-algae','#3e5940'),rot=paint('split-black-wood','#675d42'),rope=paint('abandoned-rope','#746b4f'),leather=paint('old-boots','#423a2a'),blood=paint('recent-blood','#462321'),bone=weatheredBoneMaterial(scene,'wreck-dressing:prey-bone','#969080');rot.diffuseTexture=wood??null;
  const size=64,pixels=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const dx=(x+.5)/size*2-1,dz=(y+.5)/size*2-1,r=Math.hypot(dx,dz),grain=Math.sin(x*1.8+y*2.3)*Math.cos(y*.91-x*.83),i=(y*size+x)*4;
    pixels[i]=39+Math.round((grain+1)*5);pixels[i+1]=52+Math.round((grain+1)*8);pixels[i+2]=35+Math.round((grain+1)*6);pixels[i+3]=Math.round(Math.max(0,Math.min(1,(1-r+grain*.14)*3.2))*(.5+grain*.18)*255);
  }
  const colony=RawTexture.CreateRGBATexture(pixels,size,size,scene,true,false,Texture.TRILINEAR_SAMPLINGMODE);colony.name='wreck:algae-colony';colony.hasAlpha=true;colony.wrapU=colony.wrapV=Texture.CLAMP_ADDRESSMODE;
  moss.diffuseTexture=colony;moss.diffuseColor=Color3.White();moss.useAlphaFromDiffuseTexture=true;moss.transparencyMode=Material.MATERIAL_ALPHABLEND;moss.alpha=.9;moss.zOffset=-1;
  const add=(mesh:Mesh,surface:string,kind:string,mat:StandardMaterial)=>{mesh.material=mat;mesh.receiveShadows=true;mesh.isPickable=false;mesh.metadata={visualOnly:true,deckSurfaceId:surface,kind,canonicalDressing:true};const key=`${surface}:${kind}:${mat.name}`,g=groups.get(key)??[];g.push(mesh);groups.set(key,g);return mesh;};
  const patch=(p:Vector3,rx:number,rz:number,surface:string,kind:string,mat:StandardMaterial,seed:number)=>{
    const m=new Mesh(`wreck-dressing:${kind}`,scene),d=new VertexData(),positions=[p.x,p.y+.012,p.z],indices:number[]=[],normals:number[]=[],colours=[.84,1,.82,1];
    for(let i=0;i<=16;i++){const a=i/16*Math.PI*2,r=.80+.14*Math.sin(a*5+seed)+.06*Math.cos(a*9);positions.push(p.x+Math.cos(a)*rx*r,p.y+.012+Math.sin(a*3+seed)*.008,p.z+Math.sin(a)*rz*r);colours.push(.70+(i%3)*.1,.82+(i%2)*.1,.65,1);if(i>0)indices.push(0,i,i+1);}
    d.uvs=[.5,.5];for(let i=0;i<=16;i++){const a=i/16*Math.PI*2;d.uvs.push(.5+Math.cos(a)*.5,.5+Math.sin(a)*.5);}
    Object.assign(d,{positions,indices,colors:colours});VertexData.ComputeNormals(positions,indices,normals);d.normals=normals.map((n,i)=>i%3===1?Math.abs(n):n);d.applyToMesh(m);return add(m,surface,kind,mat);
  };
  for(const surface of ['main','c2','c3']){
    const tiles=terrain.surfaces.find(s=>s.id===surface)?.tiles??[];
    for(let i=0;i<tiles.length;i++){
      const t=tiles[i]!,x=(t.cell.col+.5)*1.5,z=(t.cell.row+.5)*1.5,lx=x-S.origin.x,lz=z-S.origin.z;
      if(t.kind==='stair'||surface==='main'&&wreckCabinAt(t.cell,'main'))continue;
      const edgeDistance=wreckBeamAt(lx)-Math.abs(lz),rail=edgeDistance<2.2;
      if((rail&&i%2===0)||i%17===0){
        const side=lz<0?-1:1,p=new Vector3(x,(surface==='main'?0:3)+wreckListHeight(z),z+side*.43);
        patch(p,.62+(i%4)*.18,.24+(i%3)*.07,surface,'deck-algae',moss,i);
        if(i%2===0){const plank=MeshBuilder.CreateBox('wreck-dressing:raised-splinter',{width:.58+(i%4)*.16,height:.038,depth:.075},scene);plank.position.copyFrom(p).addInPlace(new Vector3(.08,.055,-side*.04));plank.rotation.y=.17+Math.sin(i)*.32;plank.rotation.z=.07*Math.sin(i);worldSurfaceUV(plank,4.5);add(plank,surface,'broken-deck-plank',rot);}
        if(rail&&i%7===0){
          for(let k=0;k<4;k++){
            const split=MeshBuilder.CreateTube('wreck-dressing:rotted-end-grain',{path:[p.add(new Vector3(-.32,k*.006,-.07+k*.037)),p.add(new Vector3(.02,k*.006,.02+k*.025)),p.add(new Vector3(.24+.035*k,k*.006,.01+k*.027))],radius:.006,tessellation:4},scene);add(split,surface,'weather-splits',leather);
          }
          const end=MeshBuilder.CreateCylinder('wreck-dressing:corroded-fastener',{height:.025,diameter:.047,tessellation:6},scene);end.position.copyFrom(p).addInPlace(new Vector3(.22,.037,.055));add(end,surface,'corroded-deck-iron',leather);
        }
      }
      if(rail&&i%29===0){const p=new Vector3(x,(surface==='main'?0:3)+wreckListHeight(z)+.03,z+(lz<0?-.37:.37));
        const path=Array.from({length:29},(_,n)=>p.add(new Vector3(Math.cos(n*.44)*(.14+n*.003),.006*n/29,Math.sin(n*.44)*(.14+n*.003))));add(MeshBuilder.CreateTube('wreck-dressing:frayed-coil',{path,radius:.015,tessellation:5},scene),surface,'rope-coil',rope);}
    }
  }
  // Boot soles and uppers near the existing C1 debris, not arbitrary whole
  // corpses. Recent predation contrasts with the forty-year-old ship.
  const c=new Vector3(41.25,0,27.75);
  for(let i=0;i<3;i++){
    const p=c.add(new Vector3((i-1)*.48,wreckListHeight(c.z)+.045,(i%2)*.30));
    const sole=MeshBuilder.CreateBox('wreck-dressing:boot-sole',{width:.31,height:.035,depth:.12},scene);sole.position.copyFrom(p);sole.rotation.y=i*.67;add(sole,'main','canonical-boot',leather);
    const upper=MeshBuilder.CreateIcoSphere('wreck-dressing:boot-upper',{radius:1,subdivisions:1},scene);upper.scaling.set(.14,.075,.055);upper.position.copyFrom(p).addInPlace(new Vector3(-.025,.06,0));add(upper,'main','canonical-boot',leather);
    patch(p.add(new Vector3(.14,-.035,-.21)),.28,.095,'main','canonical-blood',blood,i);
  }
  for(let i=0;i<9;i++){
    const p=c.add(new Vector3(-.9+(i%3)*.45,wreckListHeight(c.z)+.045,.55+Math.floor(i/3)*.18)),path=[p,p.add(new Vector3(.20+Math.sin(i)*.06,.018,.11))];
    add(MeshBuilder.CreateTube('wreck-dressing:prey-bone',{path,radius:.021,tessellation:6,cap:Mesh.CAP_ALL},scene),'main','canonical-prey-remains',bone);
    for(const end of path){const joint=MeshBuilder.CreateIcoSphere('wreck-dressing:prey-joint',{radius:.035,subdivisions:1},scene);joint.position.copyFrom(end);add(joint,'main','canonical-prey-remains',bone);}
  }
  return [...groups].flatMap(([key,parts])=>{const meta={...parts[0]!.metadata},m=Mesh.MergeMeshes(parts,true,true,undefined,false,false);if(!m)return [];m.name=`wreck-dressing:batch:${key}`;m.metadata=meta;m.isPickable=false;m.receiveShadows=true;return [m];});
}
