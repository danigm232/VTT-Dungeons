import type {Scene} from '@babylonjs/core/scene.js';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';
import type {Terrain3DView,GridSegmentProjector} from '../../../engine/client/terrain3d.js';

type Triangle={ax:number;az:number;ay:number;bx:number;bz:number;by:number;cx:number;cz:number;cy:number;den:number};
const bucketSize=1.5;
/** Index only the delivered walkable art, after all refinements have loaded.
 * Movement still uses the authoritative terrain. This corrects its decorative
 * grid at eroded edges and individual treads without adding a walkable cell. */
export function createRetreatGridProjector(scene:Scene){
 const buckets=new Map<string,Triangle[]>(),point=new Vector3();let triangles=0,samples=0,clipped=0;
 for(const mesh of scene.meshes){
  if(!mesh.isEnabled()||mesh.metadata?.retreatFloor!==true)continue;
  const positions=mesh.getVerticesData('position'),indices=mesh.getIndices();if(!positions||!indices)continue;
  const matrix=mesh.computeWorldMatrix(true),world=new Float64Array(positions.length);
  for(let i=0;i<positions.length;i+=3){Vector3.TransformCoordinatesFromFloatsToRef(positions[i]!,positions[i+1]!,positions[i+2]!,matrix,point);world.set(point.asArray(),i);}
  for(let i=0;i<indices.length;i+=3){
   const a=indices[i]!*3,b=indices[i+1]!*3,c=indices[i+2]!*3;
   const t:Triangle={ax:world[a]!,ay:world[a+1]!,az:world[a+2]!,bx:world[b]!,by:world[b+1]!,bz:world[b+2]!,cx:world[c]!,cy:world[c+1]!,cz:world[c+2]!,den:0};
   t.den=(t.bz-t.cz)*(t.ax-t.cx)+(t.cx-t.bx)*(t.az-t.cz);
   // Vertical risers and wall sides cannot support a grid line.
   if(Math.abs(t.den)<1e-8)continue;
   triangles++;
   for(let x=Math.floor((Math.min(t.ax,t.bx,t.cx)-.025)/bucketSize);x<=Math.floor((Math.max(t.ax,t.bx,t.cx)+.025)/bucketSize);x++)for(let z=Math.floor((Math.min(t.az,t.bz,t.cz)-.025)/bucketSize);z<=Math.floor((Math.max(t.az,t.bz,t.cz)+.025)/bucketSize);z++){
    const key=x+','+z,list=buckets.get(key)??[];list.push(t);buckets.set(key,list);
   }
  }
 }
 const height=(x:number,z:number,expected:number)=>{
  samples++;let result:number|undefined;
  for(const t of buckets.get(Math.floor(x/bucketSize)+','+Math.floor(z/bucketSize))??[]){
   const a=((t.bz-t.cz)*(x-t.cx)+(t.cx-t.bx)*(z-t.cz))/t.den,b=((t.cz-t.az)*(x-t.cx)+(t.ax-t.cx)*(z-t.cz))/t.den,c=1-a-b;
   if(Math.min(a,b,c)<-1e-5)continue;
   const y=a*t.ay+b*t.by+c*t.cy;
   if(y<expected-.65||y>expected+.28)continue;
   if(result===undefined||y>result)result=y;
  }
  return result;
 };
 const project:GridSegmentProjector=(surfaceId,a,b)=>{
  // Keep the deliberate uniform grid lift of the preserved plaza/interiors.
  // Exterior G2 stairs also need their individual treads, rather than chords.
  if(/^a[1-5]$/.test(surfaceId))return [[a,b]];
  const count=Math.max(1,Math.ceil(Vector3.Distance(a,b)/.1)),out:[Vector3,Vector3][]=[];
  let previous:Vector3|undefined;
  for(let i=0;i<=count;i++){
   const p=Vector3.Lerp(a,b,i/count),y=height(p.x,p.z,p.y);
   if(y===undefined){previous=undefined;clipped++;continue;}
   p.y=y+.022;
   // A grid follows the horizontal tread, not a long diagonal chord above
   // several steps. Do not join separate levels across a vertical riser.
   if(previous&&Math.abs(previous.y-p.y)<.095){
    const last=out[out.length-1];
    if(last&&last[1]===previous&&Vector3.Cross(last[1].subtract(last[0]),p.subtract(previous)).lengthSquared()<1e-9)last[1]=p;
    else out.push([previous,p]);
   }
   previous=p;
  }
  return out;
 };
 return {project,height,stats:()=>({triangles,buckets:buckets.size,samples,unsupportedSamples:clipped})};
}

export function conformRetreatGrid(scene:Scene,view:Terrain3DView){
 const started=performance.now(),projection=createRetreatGridProjector(scene);view.setGridProjection(projection.project);
 const stats={...projection.stats(),loadMs:Math.round(performance.now()-started),perFrameWork:false,changesNavigation:false};
 scene.metadata={...scene.metadata,retreatGridPresentation:stats};return stats;
}
