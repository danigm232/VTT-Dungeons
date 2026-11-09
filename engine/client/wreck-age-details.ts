import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import type { BaseTexture } from '@babylonjs/core/Materials/Textures/baseTexture.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { TerrainDefinition } from '../shared/terrain.js';
import { WRECK_STRUCTURE as S, wreckListHeight, wreckBeamAt } from '../shared/wreck-structure.js';
import { worldSurfaceUV } from './diorama-kit.js';
import { buildHarpyNest } from './wreck-nest.js';
import { wreckSideBreachEnd, wreckStrakeBeam } from './wreck-water-contact.js';

/** Canonical dressing: batched real geometry, grouped by level for cutaways.
 * The nest occupies the non-walkable inner cofa, decay stays off cell centres.
 * Actual treasures remain pickups; these glints are the book's scrap trinkets. */
export function buildWreckAgeDetails(scene:Scene,terrain:TerrainDefinition,hull?:BaseTexture){
  const groups=new Map<string,Mesh[]>(),result:Mesh[]=buildHarpyNest(scene);
  const mat=(name:string,color:string)=>{const m=new StandardMaterial(`wreck-age:${name}`,scene);
    m.diffuseColor=Color3.FromHexString(color);m.specularColor=Color3.FromHexString('#111918');m.backFaceCulling=false;return m;};
  const twig=mat('basket-twigs','#574432'),
    blackwood=mat('rotten-wood','#74644b'),growth=mat('salt-growth','#7e8066'),algae=mat('algae','#334738');
  blackwood.diffuseTexture=hull??null;
  const add=(m:Mesh,surface:string,kind:string,material:StandardMaterial)=>{
    m.material=material;m.isPickable=false;m.receiveShadows=true;m.metadata={visualOnly:true,deckSurfaceId:surface,kind};
    const key=`${surface}:${kind}:${material.name}`,g=groups.get(key)??[];g.push(m);groups.set(key,g);return m;};
  const tube=(id:string,path:Vector3[],radius:number,material:StandardMaterial,surface='crow',kind='harpy-nest')=>
    add(MeshBuilder.CreateTube(`wreck-age:${id}`,{path,radius,tessellation:5},scene),surface,kind,material);
  const at=(x:number,y:number,z:number)=>new Vector3(S.origin.x+x,y+wreckListHeight(S.origin.z+z),S.origin.z+z);
  // Broken binding timber and marine growth follow the waterline of the real
  // hull, with heavier forty-year decay towards the stern impact.
  for(let i=0;i<96;i++){
    const x=S.sternX+2.1+(i%48)*(S.length-5.6)/47+.19*Math.sin(i*2.1),side=i<48?-1:1,y=-2.95+(i%8)*.28;
    if(side>0&&x<wreckSideBreachEnd+.45)continue;
    const z=side*(wreckStrakeBeam(wreckBeamAt(x),y)+.015);
    const p=at(x,y,z),splinter=MeshBuilder.CreateBox('wreck-age:split-strake',{width:.85+(i%3)*.15,height:.09,depth:.10},scene);
    const tangent=(wreckStrakeBeam(wreckBeamAt(x+.35),y)-wreckStrakeBeam(wreckBeamAt(x-.35),y))/.7;
    splinter.position.copyFrom(p);splinter.rotation.y=-Math.atan(side*tangent);splinter.rotation.z=.026*Math.cos(i);worldSurfaceUV(splinter,4.5);add(splinter,'c1-hull','decay-strakes',blackwood);
    for(let k=0;k<3+i%3;k++){
      const dx=k*.13-.18,low=y-.13+Math.sin(k*2.3+i)*.064;
      const shell=MeshBuilder.CreateIcoSphere('wreck-age:limpet',{radius:.046+(k%3)*.014,subdivisions:1},scene);
      shell.position.copyFrom(at(x+dx,low,side*(wreckStrakeBeam(wreckBeamAt(x+dx),low)+.026)));
      shell.scaling.set(1,.72,.45);add(shell,'c1-hull','marine-growth',growth);
    }
    tube(`hull-algae:${i}`,[p,p.add(new Vector3(.08,-.28,side*.06)),p.add(new Vector3(-.03,-.55,side*.09))],.034,algae,'c1-hull','marine-growth');
  }
  // Mainmast is sound, but its ropes are frayed. The fallen foremast's loose
  // canvas/ropes continue to the same reef that breaks the forecastle rail.
  const fallen=terrain.occluders.find(o=>o.id==='c2-mast');
  if(fallen){const p=new Vector3((fallen.cell.col+.5)*1.5+4.3,3.5,(fallen.cell.row+.5)*1.5-5.3);
    for(let i=0;i<5;i++)tube(`fallen-ropes:${i}`,[p.add(new Vector3(0,0,(i-2)*.16)),new Vector3(S.origin.x+33.4,1.0,S.origin.z-6.1+i*.27),new Vector3(S.origin.x+33.0,S.seaHeight+.15,S.origin.z-6.5+i*.30)],.024,twig,'c2','fallen-rigging');}
  for(const [key,group] of groups){const meta={...group[0]!.metadata};const mesh=Mesh.MergeMeshes(group,true,true,undefined,false,false);if(mesh){mesh.name=`wreck-age-batch:${key}`;mesh.metadata=meta;mesh.isPickable=false;mesh.receiveShadows=true;result.push(mesh);}}
  return result;
}
