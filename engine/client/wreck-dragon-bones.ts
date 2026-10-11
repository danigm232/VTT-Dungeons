import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import { Vector3,Quaternion } from '@babylonjs/core/Maths/math.vector.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { TerrainDefinition } from '../shared/terrain.js';
import { WRECK_STRUCTURE as S } from '../shared/wreck-structure.js';

/** Anatomical remains visible from any azimuth. Existing blocked reef cells
 * bound the geometry; no billboard, new gameplay obstruction or treasure. */
export function buildDragonRemains(scene:Scene,terrain:TerrainDefinition){
  const groups=new Map<StandardMaterial,Mesh[]>();
  const mat=(id:string,c:string)=>{const m=new StandardMaterial(`dragon-remains:${id}`,scene);m.diffuseColor=Color3.FromHexString(c);m.specularColor=Color3.FromHexString('#182120');m.backFaceCulling=false;return m;};
  const ivory=mat('eroded-ivory','#77725e'),worn=mat('salt-cracks','#504f40'),socket=mat('cavities','#252d27');
  const add=(m:Mesh,material=ivory)=>{m.material=material;m.receiveShadows=true;m.isPickable=false;const g=groups.get(material)??[];g.push(m);groups.set(material,g);return m;};
  const ellipsoid=(id:string,p:Vector3,x:number,y:number,z:number,material=ivory)=>{const m=MeshBuilder.CreateIcoSphere(`dragon-remains:${id}`,{radius:1,subdivisions:2},scene);m.position.copyFrom(p);m.scaling.set(x,y,z);return add(m,material);};
  const tube=(id:string,path:Vector3[],radius:number,material=ivory)=>add(MeshBuilder.CreateTube(`dragon-remains:${id}`,{path,radiusFunction:(i)=>radius*(.64+.35*Math.sin(i/Math.max(1,path.length-1)*Math.PI))*(1+.09*Math.sin(i*2.7)),tessellation:9,cap:Mesh.CAP_ALL},scene),material);
  const cone=(id:string,a:Vector3,b:Vector3,r:number)=>{const v=b.subtract(a),m=MeshBuilder.CreateCylinder(`dragon-remains:${id}`,{height:v.length(),diameterBottom:r*2,diameterTop:.016,tessellation:8},scene);m.position.copyFrom(a.add(b).scale(.5));m.rotationQuaternion=Quaternion.FromUnitVectorsToRef(Vector3.Up(),v.normalize(),new Quaternion());return add(m);};
  const cellsFor=(id:string)=>(terrain.obstacles??[]).filter(o=>o.surfaceId==='sea'&&o.obstacleId===id).map(o=>o.cell);
  const skullCells=cellsFor('reef-south-west');
  if(skullCells.length){
    const x=(Math.min(...skullCells.map(c=>c.col))+Math.max(...skullCells.map(c=>c.col))+1)*.75,
      z=(Math.min(...skullCells.map(c=>c.row))+Math.max(...skullCells.map(c=>c.row))+1)*.75,c=new Vector3(x-.1,S.seaHeight+1.65,z);
    // Hollow cranial roof and long nasal bridge, not two solid cartoon balls.
    // The cheek openings expose the sea through actual skeletal arches.
    const section=[[-.9,.18,.26],[-.55,.69,.70],[0,.82,.80],[.48,.44,.64],[1.15,.10,.42],[1.95,-.10,.22]];
    const pos:number[]=[],ind:number[]=[],ns:number[]=[];
    for(let i=0;i<section.length;i++)for(let j=0;j<7;j++){
      const [x,roof,w]=section[i]!,a=.32+j/6*(Math.PI-.64),p=c.add(new Vector3(x!,roof!-w!*.65+w!*.65*Math.sin(a),Math.cos(a)*w!));pos.push(p.x,p.y,p.z);
      if(i<section.length-1&&j<6){const n=i*7+j;ind.push(n,n+7,n+1,n+1,n+7,n+8);}
    }
    const roof=new Mesh('dragon-remains:hollow-skull-roof',scene),d=new VertexData();d.positions=pos;d.indices=ind;d.uvs=[];
    for(let i=0;i<pos.length;i+=3)d.uvs.push(pos[i]!/3,pos[i+2]!/3);
    VertexData.ComputeNormals(pos,ind,ns);d.normals=ns.map(n=>-n);d.applyToMesh(roof);add(roof);
    for(const side of [-1,1]){
      const eye=c.add(new Vector3(.12,.04,side*.69));
      tube(`orbital-arch:${side}`,Array.from({length:19},(_,i)=>eye.add(new Vector3(Math.cos(i/18*Math.PI*2)*.37,Math.sin(i/18*Math.PI*2)*.29,side*.025))),.065);
      tube(`cheekbone:${side}`,[c.add(new Vector3(-.70,.13,side*.56)),c.add(new Vector3(-.32,-.29,side*.73)),c.add(new Vector3(.52,-.25,side*.60)),c.add(new Vector3(1.62,-.40,side*.26))],.105);
      tube(`mandible:${side}`,[c.add(new Vector3(-.55,-.75,side*.61)),c.add(new Vector3(.1,-.85,side*.72)),c.add(new Vector3(1.60,-.65,side*.39))],.16);
      cone(`horn-base:${side}`,c.add(new Vector3(-.4,.56,side*.47)),c.add(new Vector3(-.9,1.04,side*.86)),.22);
      ellipsoid(`broken-horn-core:${side}`,c.add(new Vector3(-.89,1.015,side*.84)),.08,.05,.08,worn);
      for(let i=0;i<5;i++)cone(`tooth:${side}:${i}`,c.add(new Vector3(.40+i*.28,-.51,side*(.53-i*.031))),c.add(new Vector3(.45+i*.28,-.74-(i%2)*.09,side*(.53-i*.031))),.06);
    }
    for(const side of [-1,1])ellipsoid(`nostril:${side}`,c.add(new Vector3(1.95,-.07,side*.25)),.10,.09,.06,socket);
    for(let i=0;i<5;i++)tube(`cranial-fracture:${i}`,[c.add(new Vector3(-.45+i*.18,.72-i*.025,-.32)),c.add(new Vector3(-.37+i*.18,.75-i*.021,-.03)),c.add(new Vector3(-.47+i*.18,.70-i*.019,.28))],.012,worn);
  }
  const ribCells=cellsFor('dragon-bone-stern');
  if(ribCells.length){
    const minX=Math.min(...ribCells.map(c=>c.col))*1.5,minZ=Math.min(...ribCells.map(c=>c.row))*1.5,maxZ=(Math.max(...ribCells.map(c=>c.row))+1)*1.5;
    const c=new Vector3(minX+.75,S.seaHeight+.10,minZ+.45);
    tube('spinal-column',[c,c.add(new Vector3(.02,-.18,(maxZ-minZ)*.80))],.16,worn);
    for(let i=0;i<4;i++){
      const p=c.add(new Vector3(.055*Math.sin(i*2.7),-.1+Math.sin(i)*.08,i*.9));ellipsoid(`vertebra:${i}`,p,.28,.19,.32);
      cone(`spinous-process:${i}`,p,p.add(new Vector3(.06,.47,.05)),.13);
      for(const side of [-1,1]){
        const points=Array.from({length:i===3&&side===1?12:18},(_,j)=>{const t=j/17;return p.add(new Vector3(side*(.04+(.40+i*.025)*Math.sin(t*Math.PI)),Math.sin(t*Math.PI)*(1.70+Math.sin(i*1.9+side)*.35)-t*.65,.1+t*.54));});
        tube(`rib:${i}:${side}`,points,.12+(i%2)*.025);ellipsoid(`rib-head:${i}:${side}`,points[0]!, .18,.13,.20,worn);
      }
    }
  }
  // Clamp any horn/jaw tip to the blocked footprint: artwork must not create
  // a solid-looking obstruction where the swimming route is actually free.
  const allowed=[...skullCells,...ribCells];
  for(const parts of groups.values())for(const m of parts){m.bakeCurrentTransformIntoVertices();const p=m.getVerticesData('position')!;
    for(let i=0;i<p.length;i+=3){const x=p[i]!,z=p[i+2]!;if(!allowed.some(c=>x>=c.col*1.5&&x<=(c.col+1)*1.5&&z>=c.row*1.5&&z<=(c.row+1)*1.5)){
      const c=allowed.reduce((a,b)=>Math.hypot((a.col+.5)*1.5-x,(a.row+.5)*1.5-z)<Math.hypot((b.col+.5)*1.5-x,(b.row+.5)*1.5-z)?a:b);
      p[i]=Math.max(c.col*1.5+.03,Math.min((c.col+1)*1.5-.03,x));p[i+2]=Math.max(c.row*1.5+.03,Math.min((c.row+1)*1.5-.03,z));
    }}m.setVerticesData('position',p);
    const colors:number[]=[];for(let i=0;i<p.length;i+=3){const shade=.77+.13*Math.sin(p[i]!*7.1+p[i+1]!*4.9)*Math.cos(p[i+2]!*5.7);colors.push(shade,shade*.99,shade*.94,1);}m.setVerticesData('color',colors);
  }
  return [...groups].flatMap(([material,parts])=>{const m=Mesh.MergeMeshes(parts,true,true,undefined,false,false);if(!m)return [];m.name=`dragon-remains:batch:${material.name}`;m.metadata={visualOnly:true,kind:'dragon-bone-obstacle',deckSurfaceId:'sea',anatomy:true};m.isPickable=false;m.receiveShadows=true;return [m];});
}
