import type {Scene} from '@babylonjs/core/scene.js';
import {Mesh} from '@babylonjs/core/Meshes/mesh.js';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder.js';
import {TransformNode} from '@babylonjs/core/Meshes/transformNode.js';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';
import {BoundingInfo} from '@babylonjs/core/Culling/boundingInfo.js';
import {retreatWaterHeight} from './retreat-contact-surf.js';
import {createCoastalAnimationVisibility} from '../../../engine/client/coastal-animation-visibility.js';
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
/** Lowest dry shores plus one native water-cell margin; offshore swells remain.
 * A feathered ceiling avoids painting the low clearing and tree roots blue. */
export function retreatShoreCeiling(x:number,z:number){
 const d=Math.hypot(Math.max(-10-x,0,x-43),Math.max(80-z,0,z-140));
 if(d>=9)return Infinity;const t=d/9;return .08+6*t*t*(3-2*t);
}
const dryCache=new WeakMap<Mesh,{world:import('@babylonjs/core/Maths/math.vector.js').Matrix;version:number;caps:[number,number][]}>();
export function preserveRetreatDryShore(sea:Mesh){
 const positions=sea.getVerticesData('position');if(!positions)return;
 const world=sea.computeWorldMatrix(true),version=sea.metadata?.coastalGeometryVersion??0;let cache=dryCache.get(sea);if(cache?.world.equals(world)&&cache.version===version)return;
 if(!cache||!cache.world.equals(world)){const inverse=world.clone().invert(),p=new Vector3(),caps:[number,number][]=[];for(let i=0;i<positions.length;i+=3){Vector3.TransformCoordinatesFromFloatsToRef(positions[i]!,positions[i+1]!,positions[i+2]!,world,p);const cap=retreatShoreCeiling(p.x,p.z);if(Number.isFinite(cap)){p.y=cap;Vector3.TransformCoordinatesToRef(p,inverse,p);caps.push([i+1,p.y]);}}cache={world:world.clone(),version:-1,caps};dryCache.set(sea,cache);}
 cache.version=version;let changed=false;for(const [i,cap] of cache.caps)if(positions[i]!>cap){positions[i]=cap;changed=true;}
 if(changed)sea.updateVerticesData('position',positions);
}
export function retreatBoatPose(center:number,bow:number,stern:number,port:number,starboard:number){
 return {height:center-.06,pitch:clamp(-Math.atan2(stern-bow,2.7),-Math.PI/60,Math.PI/60),roll:clamp(Math.atan2(starboard-port,1.2),-Math.PI/90,Math.PI/90)};
}
/** Same native sampled sea as contact foam. One moored boat, no new travel. */
export function installRetreatBoatBuoyancy(scene:Scene,sea:Mesh,jetty=false){
 const parts=scene.meshes.filter(m=>(m.metadata?.gltf?.extras?.role??m.parent?.metadata?.gltf?.extras?.role)==='watercraft');
 const stats={parts:parts.length,updates:0,skippedOffscreenUpdates:0,waterline:0,height:0,pitch:0,roll:0,keel:0,draft:.22,mooringGap:0,usesNativeWaveGrid:true};
 if(!parts.length)return {update:(_time:number)=>{},stats};
 const visible=createCoastalAnimationVisibility(scene,parts,false);
 const rig=new TransformNode('retreat:moored-boat',scene);rig.position.set(20.25,0,117);
 for(const m of parts){m.unfreezeWorldMatrix();m.setParent(rig,true);m.metadata={...m.metadata,retreatDynamic:true};}
 if(jetty)rig.position.z=119.4;
 const oars:TransformNode[]=[];
 if(jetty)for(const side of [0,1]){
  const pivot=new TransformNode('retreat:rowing-oar-'+side,scene);pivot.parent=rig;pivot.position.set(side===0?-.38:.38,.43,-.2);
  for(const part of parts.filter(m=>new RegExp('Oar_(Shaft|Blade)_'+side+'$').test(m.name)))part.setParent(pivot,true);
  // Existing oars are stored fore/aft; rotate the pair out through the oarlocks.
  pivot.rotation.y=side===0?Math.PI/2:-Math.PI/2;oars.push(pivot);
 }
 const original=scene.getMeshByName('P2_VTT_Functional_Mooring');original?.setEnabled(false);
 const fixed=jetty?new Vector3(21.2,.82,117.1):new Vector3(17.55,.88,115.35),endLocal=new Vector3(0,.62,-1.7),end=new Vector3(),path=Array.from({length:9},()=>new Vector3());
 let rope:Mesh|undefined,lastVersion=-1,lastTime=NaN;
 function update(time:number){
  const departure=jetty?scene.metadata?.retreatBoatDeparture:null,version=sea.metadata?.coastalGeometryVersion??0;
  if(!departure&&!visible()){stats.skippedOffscreenUpdates++;return;}
  if(version===lastVersion&&!departure)return;lastVersion=version;
  const x=departure?.boat.x??20.25,z=departure?.boat.z??(jetty?119.4:117);rig.position.x=x;rig.position.z=z;
  const center=retreatWaterHeight(sea,x,z),target=retreatBoatPose(center,retreatWaterHeight(sea,x,z-1.35),retreatWaterHeight(sea,x,z+1.35),retreatWaterHeight(sea,x-.6,z),retreatWaterHeight(sea,x+.6,z));
  for(const [side,pivot]of oars.entries()){pivot.rotation.y=(side===0?1:-1)*(Math.PI/2+(departure?.rowing?Math.sin(departure.stroke)*.52:0));pivot.rotation.x=departure?.rowing?Math.cos(departure.stroke)*.17:0;}
  const alpha=Number.isFinite(lastTime)?1-Math.exp(-clamp(time-lastTime,0,.25)/.08):1;lastTime=time;
  rig.position.y+=(target.height-rig.position.y)*alpha;rig.rotation.x+=(target.pitch-rig.rotation.x)*alpha;rig.rotation.z+=(target.roll-rig.rotation.z)*alpha;rig.computeWorldMatrix(true);
  Vector3.TransformCoordinatesToRef(endLocal,rig.getWorldMatrix(),end);
  for(let i=0;i<path.length;i++){const u=i/(path.length-1);Vector3.LerpToRef(fixed,end,u,path[i]!);path[i]!.y-=.09*4*u*(1-u);}
  rope=MeshBuilder.CreateTube('retreat:boat-live-mooring',{path,radius:.022,tessellation:7,updatable:true,instance:rope},scene);
  rope.material=scene.getMaterialByName('Hemp_Rope_Used')??original?.material??null;rope.isPickable=false;rope.checkCollisions=false;rope.metadata={decorativeOnly:true,tokenOccluder:false,retreatFloor:false,stoneShadowCaster:false,retreatDynamic:true};
  rope.setEnabled(!departure?.rowing);
  Object.assign(stats,{updates:stats.updates+1,waterline:center,height:rig.position.y,pitch:rig.rotation.x,roll:rig.rotation.z,keel:rig.position.y-.16,mooringGap:Vector3.Distance(path.at(-1)!,end)});
 }
 // Dynamic waves exceed the original zero-thickness ground bounds. Extend Y
 // once so low cameras do not cull a visible swell; Q0 frustum gating survives.
 const b=sea.getBoundingInfo().boundingBox;sea.setBoundingInfo(new BoundingInfo(new Vector3(b.minimum.x,-7,b.minimum.z),new Vector3(b.maximum.x,7,b.maximum.z)));
 scene.metadata={...scene.metadata,retreatBuoyancy:stats};return {update,stats};
}
