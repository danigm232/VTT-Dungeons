import {Mesh} from '@babylonjs/core/Meshes/mesh.js';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder.js';
import {VertexData} from '@babylonjs/core/Meshes/mesh.vertexData.js';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';
import {Color3} from '@babylonjs/core/Maths/math.color.js';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial.js';
import type {Scene} from '@babylonjs/core/scene.js';
const materials=new WeakMap<Scene,{dark:StandardMaterial;grain:StandardMaterial;moss:StandardMaterial}>();

/** Cracks, raised grain and moisture streaks on actual bulkhead triangles.
 * Never draws over a doorway. Merged into each wall's own visibility group,
 * so cutaways cannot leave floating stains or reveal neighbouring cabins. */
export function weatherWreckBulkhead(scene:Scene,wall:Mesh){
  let paint=materials.get(scene);
  if(!paint){const dark=new StandardMaterial('wreck-bulkhead-decay:rot-in-joints',scene),grain=new StandardMaterial('wreck-bulkhead-decay:raised-grain',scene),moss=new StandardMaterial('wreck-bulkhead-decay:damp-streaks',scene);
    dark.diffuseColor=Color3.FromHexString('#252e23');grain.diffuseColor=Color3.FromHexString('#726948');moss.diffuseColor=Color3.FromHexString('#394b30');
    for(const mat of [dark,grain,moss]){mat.specularColor=Color3.FromHexString('#111817');mat.backFaceCulling=false;}
    paint={dark,grain,moss};materials.set(scene,paint);
  }
  const {dark,grain,moss}=paint;
  const p=wall.getVerticesData('position')!,indices=wall.getIndices()!,parts:Mesh[]=[wall];
  for(let i=0;i<indices.length;i+=6){
    const v=[0,1,2].map(n=>Vector3.FromArray(p,indices[i+n]!*3)),n=Vector3.Cross(v[1]!.subtract(v[0]!),v[2]!.subtract(v[0]!)).normalize();
    if(Math.abs(n.y)>.2)continue;
    const center=v[0]!.add(v[1]!).add(v[2]!).scale(1/3).add(n.scale(.018));
    if(center.y<.12||center.y>2.15)continue;
    const tangent=new Vector3(-n.z,0,n.x),length=.13+(i%5)*.028;
    const crack=MeshBuilder.CreateTube(`${wall.name}:weather-split`,{path:[center.subtract(tangent.scale(length)),center.add(new Vector3(0,.025,0)),center.add(tangent.scale(length*.9)).add(new Vector3(0,-.018,0))],radius:.009,tessellation:4},scene);crack.material=dark;parts.push(crack);
    if(i%18!==0)continue;
    const splinter=MeshBuilder.CreateTube(`${wall.name}:lifted-fibre`,{path:[center,center.add(tangent.scale(.16)).add(n.scale(.04)),center.add(tangent.scale(.24)).add(n.scale(.02))],radius:.018,tessellation:5},scene);splinter.material=grain;parts.push(splinter);
    const stain=new Mesh(`${wall.name}:capillary-stain`,scene),d=new VertexData(),ns:number[]=[];
    const a=center.subtract(tangent.scale(.085)),b=center.add(tangent.scale(.06)),c=center.add(tangent.scale(.023)).add(new Vector3(0,-.22,0)),e=center.subtract(tangent.scale(.044)).add(new Vector3(0,-.13,0));
    d.positions=[a,b,c,e].flatMap(v=>[v.x,v.y,v.z]);d.indices=[0,1,2,0,2,3];VertexData.ComputeNormals(d.positions,d.indices,ns);d.normals=ns;d.applyToMesh(stain);stain.material=moss;parts.push(stain);
  }
  // Existing bulkheads carry UVs/vertex colours; new fissures must provide
  // that same attribute set before Babylon can batch them together.
  const kinds=new Set(parts.flatMap(m=>m.getVerticesDataKinds()));
  for(const m of parts)for(const kind of kinds)if(!m.isVerticesDataPresent(kind)){
    const stride=kind==='color'?4:kind.startsWith('uv')?2:3,data:number[]=[];
    for(let i=0;i<m.getTotalVertices();i++)for(let n=0;n<stride;n++)data.push(kind==='color'?1:0);
    m.setVerticesData(kind,data);
  }
  const metadata=wall.metadata,name=wall.name,merged=Mesh.MergeMeshes(parts,true,true,undefined,false,true)!;
  merged.name=name;merged.metadata={...metadata,weatheredBulkhead:true};merged.receiveShadows=true;merged.isPickable=false;return merged;
}
