/** Metres in the existing D8 world coordinates; old cell addresses never move. */
export const MIRROR_CAVE_GRID = {cols:24,rows:17,origin:{x:-15,z:-9.75}};
/** Wall toes stay beyond the whole character footprint of each boundary cell. */
export const MIRROR_WALL_OUTLINE:number[][] = [
 [-16.15,-11.15],[15.6,-11.15],[19,-9.3],[22.15,-5.8],
 [22.15,9.8],[20.4,16.6],[-12.6,16.6],[-16.15,13.2]
];
export const MIRROR_GALLERY = {x:-6.6,z:-11.15,halfWidth:2.75,height:5.15,depth:15};
/** Five visible 1.5m strides into the existing gallery, after its threshold. */
export const MIRROR_DEPARTURE = {durationMs:5000,points:Array.from({length:6},(_,i)=>({x:-6.75,y:.045,z:-9-i*1.5}))};

export function mirrorDistanceToWall(x:number,z:number){
 let distance=Infinity;
 for(let i=0;i<MIRROR_WALL_OUTLINE.length;i++){
  const a=MIRROR_WALL_OUTLINE[i]!,b=MIRROR_WALL_OUTLINE[(i+1)%MIRROR_WALL_OUTLINE.length]!;
  const dx=b[0]!-a[0]!,dz=b[1]!-a[1]!,t=Math.max(0,Math.min(1,((x-a[0]!)*dx+(z-a[1]!)*dz)/(dx*dx+dz*dz)));
  distance=Math.min(distance,Math.hypot(x-a[0]!-dx*t,z-a[1]!-dz*t));
 }
 return distance;
}
