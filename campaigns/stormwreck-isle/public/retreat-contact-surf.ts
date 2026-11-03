import type {Scene} from '@babylonjs/core/scene.js';
import {Mesh} from '@babylonjs/core/Meshes/mesh.js';
import {VertexData} from '@babylonjs/core/Meshes/mesh.vertexData.js';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';
import {Ray} from '@babylonjs/core/Culling/ray.js';
import {createCoastalAnimationVisibility} from '../../../engine/client/coastal-animation-visibility.js';

/** Sample the actual native wave grid in world coordinates, including the A1
 * translation. The same vertices already contain the dry-landing ceiling. */
function waterSample(sea:Mesh,x:number,z:number){
 const p=sea.getVerticesData('position');if(!p)return -.15;
 const n=Math.round(Math.sqrt(p.length/3));if(n*n*3!==p.length)return -.15;
 const world=sea.computeWorldMatrix(true),local=Vector3.TransformCoordinates(new Vector3(x,0,z),world.clone().invert());
 const u=Math.max(0,Math.min(n-1,(local.x-p[0]!)/(p[3]!-p[0]!))),v=Math.max(0,Math.min(n-1,(local.z-p[2]!)/(p[n*3+2]!-p[2]!))),i=Math.min(n-2,Math.floor(u)),j=Math.min(n-2,Math.floor(v)),a=u-i,b=v-j;
 const ids=[(j*n+i)*3+1,(j*n+i+1)*3+1,((j+1)*n+i)*3+1,((j+1)*n+i+1)*3+1],weights=[(1-a)*(1-b),a*(1-b),(1-a)*b,a*b],base=world.m[1]!*local.x+world.m[9]!*local.z+world.m[13]!,scale=world.m[5]!;
 return (positions:ArrayLike<number>)=>base+scale*(positions[ids[0]!]!*weights[0]!+positions[ids[1]!]!*weights[1]!+positions[ids[2]!]!*weights[2]!+positions[ids[3]!]!*weights[3]!);
}
export function retreatWaterHeight(sea:Mesh,x:number,z:number){const sample=waterSample(sea,x,z);return typeof sample==='number'?sample:sample(sea.getVerticesData('position')!);}

export function traceRetreatWaterline(scene:Scene,accepts:(mesh:any)=>boolean,xMin=4,xMax=176){
 const points:{point:Vector3;out:Vector3;rock:string}[]=[];
 for(let x=xMin;x<=xMax;x+=2){
  const hit=scene.pickWithRay(new Ray(new Vector3(x,.02,155),new Vector3(0,0,-1),220),accepts);
  if(!hit?.hit||!hit.pickedPoint)continue;
  const out=hit.getNormal(true)??new Vector3(0,0,1);out.y=0;if(out.lengthSquared()<.01)out.set(0,0,1);out.normalize();if(out.z<0)out.scaleInPlace(-1);
  points.push({point:hit.pickedPoint.clone(),out,rock:hit.pickedMesh!.name});
 }
 return points;
}

/** A narrow water ribbon follows real coast intersections. Reuses native foam
 * material/texture, wave heights and the existing Q0 visibility/cadence gate. */
export function installRetreatContactSurf(scene:Scene,sea:Mesh){
 const material=scene.getMaterialByName('a1:shore-wash-v2');if(!material)return null;
 const samples=traceRetreatWaterline(scene,m=>m.isEnabled()&&m.isVisible&&m.getTotalVertices()>0&&!m.metadata?.retreatFloor&&!m.infiniteDistance&&(m.metadata?.stoneStage||['rock','carved'].includes(m.material?.metadata?.category)));
 const segments=samples.slice(1).flatMap((p,i)=>{const previous=samples[i]!;return p.point.x-previous.point.x<2.1&&Math.abs(p.point.z-previous.point.z)<5?[[previous,p]]:[];});if(!segments.length)return null;
 const positions:number[]=[],uvs:number[]=[],normals:number[]=[],indices:number[]=[],bases:{sample:ReturnType<typeof waterSample>;fade:number;phase:number}[]=[],colors:number[]=[];
 const distances=[.04,.35,.8,1.35];
 for(const [a,b]of segments){const start=bases.length;
  for(let row=0;row<4;row++)for(const sample of [a!,b!]){const d=distances[row]!,x=sample.point.x+sample.out.x*d,z=sample.point.z+sample.out.z*d;positions.push(x,retreatWaterHeight(sea,x,z)+.025,z);normals.push(0,1,0);uvs.push(sample.point.x/3,row/3);colors.push(.85,.95,.96,0);bases.push({sample:waterSample(sea,x,z),fade:Math.sin(row/3*Math.PI),phase:sample.point.x*.47+sample.point.z*.31});}
  for(let row=0;row<3;row++){const i=start+row*2;indices.push(i,i+2,i+1,i+1,i+2,i+3);}
 }
 const mesh=new Mesh('retreat:contact-surf',scene),data=new VertexData();data.positions=positions;data.indices=indices;data.uvs=uvs;data.normals=normals;data.colors=colors;data.applyToMesh(mesh,true);mesh.material=material;mesh.hasVertexAlpha=true;mesh.alphaIndex=2;mesh.isPickable=false;mesh.checkCollisions=false;mesh.receiveShadows=false;
 mesh.metadata={content:'VTT_AMBIENCE',decorativeOnly:true,tokenOccluder:false,retreatFloor:false,stoneShadowCaster:false,effect:'contact-surf',retreatPolishStage:3};
 const visible=createCoastalAnimationVisibility(scene,[mesh],false);let lastVersion=-1;
 function update(time:number){mesh.receiveShadows=false;const version=sea.metadata?.coastalGeometryVersion??0;if(version===lastVersion||!visible())return;lastVersion=version;
  const water=sea.getVerticesData('position')!;
  for(let i=0;i<bases.length;i++){const p=bases[i]!,pulse=.5+.5*Math.sin(time*1.45+p.phase);positions[i*3+1]=(typeof p.sample==='number'?p.sample:p.sample(water))+.025;colors[i*4+3]=p.fade*(.10+.32*pulse)*(.6+(sea.metadata?.seaIntensity??.35)*.4);}
  mesh.updateVerticesData('position',positions);mesh.updateVerticesData('color',colors);
 }
 return {mesh,update,stats:{samples:samples.length,segments:segments.length,vertices:bases.length,newDrawBatches:1,reusedFoamTexture:true,shoreTraceHeight:.02,maxWidth:1.35,sourceRocks:[...new Set(samples.map(s=>s.rock))]}};
}
