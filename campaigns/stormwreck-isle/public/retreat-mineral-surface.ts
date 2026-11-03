import {Mesh} from '@babylonjs/core/Meshes/mesh.js';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';

/** Broad mineral/salt variation on the added envelopes only. Authored positions,
 * indices, normals and UVs remain intact; original cell geometry is excluded. */
export function refineMineralSurface(mesh:Mesh){
 if(mesh.metadata?.mineralPolish||!mesh.metadata?.stoneStage||mesh.name.startsWith('a1:'))return null;
 const p=mesh.getVerticesData('position');if(!p)return null;
 const original=mesh.getVerticesData('color'),colors=new Float32Array(p.length/3*4),world=mesh.computeWorldMatrix(true),point=new Vector3();
 let min=1,max=0;
 for(let i=0;i<p.length;i+=3){
  Vector3.TransformCoordinatesFromFloatsToRef(p[i]!,p[i+1]!,p[i+2]!,world,point);
  const broad=.94+.035*Math.sin(point.x*.11+point.z*.083)+.025*Math.sin(point.y*.31-point.x*.047),wet=1-.14*Math.max(0,Math.min(1,(2.2-point.y)/2.5)),tone=broad*wet,j=i/3*4;
  min=Math.min(min,tone);max=Math.max(max,tone);
  colors[j]=(original?.[j]??1)*tone;colors[j+1]=(original?.[j+1]??1)*tone;colors[j+2]=(original?.[j+2]??1)*tone;colors[j+3]=1;
 }
 mesh.makeGeometryUnique();mesh.setVerticesData('color',colors);mesh.useVertexColors=true;mesh.hasVertexAlpha=false;mesh.metadata={...mesh.metadata,mineralPolish:true};
 return {mesh:mesh.name,vertices:p.length/3,minTone:min,maxTone:max};
}
