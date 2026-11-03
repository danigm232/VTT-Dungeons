import { WRECK_STRUCTURE as S, wreckListHeight } from '../shared/wreck-structure.js';
import { wreckCabins } from './wreck-cabins.js';
import type { CameraSpace } from './camera-space.js';
import { WRECK_CAMERA_BASE_ALPHA } from '../shared/wreck-camera-profile.js';

// Shared immutable zone data; previously rebuilt on every camera update.
export const WRECK_CAMERA_SPACES: readonly CameraSpace[] = [
  ...Object.entries(wreckCabins).map(([id,b])=>({id,surfaceIds:['main'],bounds:{minX:b.minCol*1.5,maxX:(b.maxCol+1)*1.5,minZ:b.minRow*1.5,maxZ:(b.maxRow+1)*1.5},
    size:{width:(b.maxCol-b.minCol+3)*1.5,depth:(b.maxRow-b.minRow+3)*1.5,height:3.5}})),
  {id:'cofa',surfaceIds:['crow'],size:{width:10,depth:10,height:5}},
  {id:'proa',surfaceIds:['c2'],size:{width:24,depth:20,height:5}},
  {id:'popa',surfaceIds:['c3'],size:{width:24,depth:20,height:5}},
  {id:'bodega',surfaceIds:['hold-air','hold-water'],size:{width:26,depth:18,height:4}},
  {id:'inferior',surfaceIds:['lower-deck','lower-water'],size:{width:28,depth:22,height:4}},
  {id:'exterior',surfaceIds:['main','c2','c3','sea'],size:{width:34,depth:25,height:7}}
];

/** Only the ship belongs to its overview bounds. Ocean margins, island cards
 * and dragon bones cannot move the midpoint between bow and stern. Include
 * the real mast tip and keel so neither is clipped at low camera elevations.
 */
export const WRECK_OVERVIEW_POINTS = S.stations.flatMap(([x,beam])=>[-1,1].flatMap(side=>{
  const z=side*beam;
  return [{x,y:wreckListHeight(S.origin.z+z),z},
    {x,y:-6.55+wreckListHeight(S.origin.z+z*.92),z:z*.92},
    {x,y:(x<=S.sternDeckEnd||x>=S.bowDeckStart?4.1:1.1)+wreckListHeight(S.origin.z+z),z}];
})).concat([{x:0,y:S.keelHeight,z:0},{x:.345,y:23.2,z:-.483}]);

type Overview = { target:{x:number;y:number;z:number}; halfHeight:number };
let cached: {alpha:number;beta:number;aspect:number;frame:Overview}|undefined;
let fitCache:{beta:number;aspect:number;halfHeight:number}|undefined;
function projectedBounds(alpha:number,beta:number){
  const rx=-Math.sin(alpha),rz=Math.cos(alpha),ux=-Math.cos(alpha)*Math.cos(beta),uy=Math.sin(beta),uz=-Math.sin(alpha)*Math.cos(beta);
  let left=Infinity,right=-Infinity,bottom=Infinity,top=-Infinity;
  for(const p of WRECK_OVERVIEW_POINTS){
    const x=p.x*rx+p.z*rz,y=p.x*ux+p.y*uy+p.z*uz;
    left=Math.min(left,x);right=Math.max(right,x);bottom=Math.min(bottom,y);top=Math.max(top,y);
  }
  return {left,right,bottom,top,rx,rz,ux,uy,uz};
}
export function wreckOverviewFrame(alpha:number,beta:number,aspect:number):Overview {
  if(cached&&cached.alpha===alpha&&cached.beta===beta&&cached.aspect===aspect)return cached.frame;
  const {left,right,bottom,top,rx,rz,ux,uy,uz}=projectedBounds(alpha,beta);
  if(!fitCache||fitCache.beta!==beta||fitCache.aspect!==aspect){
    let halfHeight=0;
    // Fit the whole permitted arc once per tilt/viewport, so horizontal orbit
    // never makes the overview breathe or pushes the bow out of frame.
    for(let degrees=-30;degrees<=30;degrees++){
      const b=projectedBounds(WRECK_CAMERA_BASE_ALPHA+degrees*Math.PI/180,beta);
      halfHeight=Math.max(halfHeight,(b.right-b.left)/(2*Math.max(.1,aspect)),(b.top-b.bottom)/2);
    }
    fitCache={beta,aspect,halfHeight:halfHeight*1.10};
  }
  const horizontal=(left+right)/2,vertical=(bottom+top)/2;
  // Translate in the camera plane, also valid for the inspector's top view;
  // dividing by sin(beta) would send its target kilometres above the ship.
  const frame={target:{x:S.origin.x+rx*horizontal+ux*vertical,y:uy*vertical,z:S.origin.z+rz*horizontal+uz*vertical},
    halfHeight:fitCache.halfHeight};
  cached={alpha,beta,aspect,frame};return frame;
}

/** Semi-fixed exterior zones track along the keel instead of the centre of
 * the surrounding swimming grid. Cabins, sea, combat and full follow retain
 * their own policies. Do not mutate the caller's actor position.
 */
export function wreckLongitudinalTarget(surface:string,point:{x:number;y:number;z:number},frame?:{alpha:number;halfHeight:number;aspect:number}) {
  const zone=surface==='c2'?{x:S.origin.x+(S.bowDeckStart+S.bowX)/2,run:4.32}
    :surface==='c3'?{x:S.origin.x+(S.sternX+S.sternDeckEnd)/2,run:4.32}
    :surface==='main'?{x:S.origin.x,run:6.12}:null;
  if(!zone)return null;
  const target={x:Math.max(zone.x-zone.run,Math.min(zone.x+zone.run,point.x)),y:point.y,z:S.origin.z};
  // A narrow phone/manual zoom must still keep the actor visible at the rail.
  if(frame&&Math.abs(-(point.x-target.x)*Math.sin(frame.alpha)+(point.z-target.z)*Math.cos(frame.alpha))>frame.halfHeight*frame.aspect*.70)return {...point};
  return target;
}
