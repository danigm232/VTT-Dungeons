import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { TerrainDefinition } from '../shared/terrain.js';
import { WRECK_STRUCTURE as S,wreckHullPlan,wreckBeamAt,clipPlanToRect } from '../shared/wreck-structure.js';

/** Close raster margins to the actual interior shell. Decorative strips do
 * not extend navigation; openings and descending stair volumes remain open. */
export function buildWreckFloorClosure(scene:Scene,terrain:TerrainDefinition,timber:StandardMaterial){
  const result:Mesh[]=[],rows=terrain.surfaces.find(s=>s.id==='lower-deck')!.tiles.filter(t=>t.kind!=='stair').map(t=>t.cell.row),north=Math.min(...rows),south=Math.max(...rows);
  const plan=wreckHullPlan().map(p=>({...p,z:S.origin.z+Math.sign(p.z-S.origin.z)*Math.max(.06,Math.abs(p.z-S.origin.z)-.77)}));
  for(const surface of ['lower-deck','hold-air']){
    const parts:Mesh[]=[],floor=terrain.surfaces.find(s=>s.id===surface)!,existing=new Set(floor.tiles.map(t=>`${t.cell.col},${t.cell.row}`));
    const yAt=(z:number)=>surface==='hold-air'?-6.4:-3.5+Math.max(0,Math.min(south-north,z/1.5-north))/(south-north)*.3;
    for(let col=6;col<50;col++)for(let row=6;row<21;row++){
      const x=(col+.5)*1.5-S.origin.x,z=(row+.5)*1.5-S.origin.z;
      if(existing.has(`${col},${row}`)||surface==='lower-deck'&&Math.abs(x+19.5)<1.51&&Math.abs(z+4.5)<.76)continue;
      const s=terrain.structures?.find(s=>s.id==='stairs-c9');
      if(surface==='hold-air'&&s?.kind==='stair'&&row===s.cell.row&&col>=s.cell.col&&col<s.cell.col+s.runCells)continue;
      const p=clipPlanToRect(plan,col*1.5,row*1.5,(col+1)*1.5,(row+1)*1.5);if(p.length<3)continue;
      const m=new Mesh('wreck-interior:margin',scene),v=new VertexData(),ns:number[]=[];
      v.positions=p.flatMap(q=>[q.x,yAt(q.z)-.018,q.z]);v.indices=[];for(let i=1;i<p.length-1;i++)v.indices.push(0,i,i+1);v.uvs=p.flatMap(q=>[q.z/4.5,q.x/4.5]);VertexData.ComputeNormals(v.positions,v.indices,ns);
      if(ns.filter((_,i)=>i%3===1).reduce((a,b)=>a+b,0)<0)for(let i=0;i<ns.length;i++)ns[i]=-ns[i]!;
      v.normals=ns;v.applyToMesh(m);m.material=timber;parts.push(m);
    }
    // End lining closes the stern of C8 and bow of both floors. C9 alone
    // preserves its 2 m submerged stern opening aligned with P16.
    for(const localX of [S.sternX,S.bowX-1.1]){
      const width=Math.max(.12,wreckBeamAt(localX)-.77),opening=surface==='hold-air'&&localX===S.sternX;
      for(const side of opening?[-1,1]:[0]){
        const a=opening?(side<0?-width:1):-width,b=opening?(side<0?-1:width):width,z0=S.origin.z+a,z1=S.origin.z+b,x=S.origin.x+localX,low=yAt(S.origin.z),top=surface==='hold-air'?-3.65:-.13;
        const m=new Mesh('wreck-interior:end-wall',scene),v=new VertexData(),ns:number[]=[];v.positions=[x,low,z0,x,low,z1,x,top,z1,x,top,z0];v.indices=[0,1,2,0,2,3];v.uvs=[0,0,1,0,1,1,0,1];VertexData.ComputeNormals(v.positions,v.indices,ns);v.normals=ns;v.applyToMesh(m);m.material=timber;parts.push(m);
      }
    }
    const m=Mesh.MergeMeshes(parts,true,true,undefined,false,false);if(m){m.name=`wreck-interior:closure:${surface}`;m.metadata={visualOnly:true,deckSurfaceId:surface,kind:'interior-floor-closure'};m.isPickable=false;m.receiveShadows=true;result.push(m);}
  }
  for(const id of ['stairs-c8','stairs-c9']){
    const s=terrain.structures?.find(s=>s.id===id);if(s?.kind!=='stair')continue;
    const m=MeshBuilder.CreateGround(`wreck-interior:stair-bottom:${id}`,{width:s.runCells*1.5+.3,height:1.54},scene);
    m.position.set((s.cell.col+s.runCells/2)*1.5,(s.baseHeight??0)+s.riseMeters-.13,(s.cell.row+.5)*1.5);m.material=timber;m.isPickable=false;m.receiveShadows=true;
    m.metadata={visualOnly:true,deckSurfaceId:id==='stairs-c8'?'main':'lower-deck',kind:'stair-bottom'};result.push(m);
  }
  return result;
}
