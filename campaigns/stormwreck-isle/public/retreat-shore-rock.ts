import { VertexBuffer } from '@babylonjs/core/Buffers/buffer.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';

const clamp01 = (x:number) => Math.min(1,Math.max(0,x));
const ease = (x:number) => { const t=clamp01(x); return t*t*(3-2*t); };

/** The cap and face share this offset at their join. The ramp in x begins
 * beyond the playable landing and stays on the seaward side of the route. */
function seawardRelief(x:number,y:number,z:number) {
 const span=ease((z-3)/5)*ease((41-z)/6);
 const lip=ease((x-163.5)/2.2)*(.57+.49*Math.sin(z*.61)+.24*Math.sin(z*1.39));
 const face=ease((19-y)/8)*ease((y+3.5)/3.5);
 const buttress=.82+.69*Math.sin(z*.62)+.33*Math.sin(z*1.47+y*.31);
 const strata=.23*Math.sin(y*1.31-z*.29);
 return span*(lip+face*(buttress+strata)*ease((x-165)/1.4));
}

/** Same authored rock, with a darker tidal band and relief on the seaward
 * face. All work happens once at load, before the coastal contact trace. */
export function finishRetreatShoreRock(meshes:readonly Mesh[]) {
 for(const mesh of meshes) {
  const cliff=mesh.name==='SAL3_Seaward_Cliff_1';
  const cap=/^SAL3_(Coastal_Backland_(Soil|Headland)|Weathered_Coastal_Shoulder)$/.test(mesh.name)||mesh.name==='SAL4_Tidal_Backland_Stone';
  const cove=/^SAL4_(Cove_Outcrop_\d+|Intertidal_Cove_Shelf)$/.test(mesh.name);
  const apron=/^SAL4_Cove_Outcrop_[12]$/.test(mesh.name);
  if(!mesh.isEnabled()||!cliff&&!cap&&!cove)continue;
  const original=mesh.getVerticesData(VertexBuffer.PositionKind);
  const indices=mesh.getIndices();
  if(!original||!indices?.length)continue;
  const positions=Float32Array.from(original);
  const originalColor=mesh.getVerticesData(VertexBuffer.ColorKind);
  const colors=new Float32Array(positions.length/3*4);
  const world=mesh.computeWorldMatrix(true),inverse=world.clone().invert(),point=new Vector3();
  for(let i=0,j=0;i<positions.length;i+=3,j+=4) {
   Vector3.TransformCoordinatesFromFloatsToRef(positions[i]!,positions[i+1]!,positions[i+2]!,world,point);
   const wet=cap?0:1-ease((point.y-.15-.18*Math.sin(point.z*1.3+point.x))/(cliff?3.8:1.8));
   colors[j]=(originalColor?.[j]??1)*(1-.28*wet);
   colors[j+1]=(originalColor?.[j+1]??1)*(1-.22*wet);
   colors[j+2]=(originalColor?.[j+2]??1)*(1-.15*wet);
   colors[j+3]=1;
   if(cliff||cap||apron) {
    const spread=apron?ease((1.4-point.y)/1.5)*ease((9-point.x)/3):0;
    const shift=seawardRelief(point.x,point.y,point.z);
    if(!shift&&!spread)continue;
    point.x+=shift-1.25*spread;
    point.z+=1.05*spread;
    Vector3.TransformCoordinatesToRef(point,inverse,point);
    point.toArray(positions,i);
   }
  }
  mesh.makeGeometryUnique();
  if(cliff||cap||apron) {
   // The authored split normals carry the smoothing across the GLB's
   // disconnected triangles. Rebuilding them makes the edit boundary visible.
   mesh.setVerticesData(VertexBuffer.PositionKind,positions);
   mesh.refreshBoundingInfo();
   mesh.computeWorldMatrix(true);
  }
  if(!cap){
   mesh.setVerticesData(VertexBuffer.ColorKind,colors);
   mesh.useVertexColors=true;
   mesh.hasVertexAlpha=false;
  }
 }
}
