/** Reusable framing policy for layered worlds. The existing camera damper
 * interpolates these targets; this policy never moves an actor or snaps a pose. */
export type CameraSpace = { id: string; surfaceIds: readonly string[]; bounds?: {minX:number;maxX:number;minZ:number;maxZ:number}; size: {width:number;depth:number;height:number} };
export function cameraSpaceAt(spaces: readonly CameraSpace[], surfaceId: string, position: {x:number;z:number}) {
  return spaces.find(space=>space.surfaceIds.includes(surfaceId) && (!space.bounds || position.x>=space.bounds.minX && position.x<=space.bounds.maxX
    && position.z>=space.bounds.minZ && position.z<=space.bounds.maxZ));
}

/** First follow view from outside a tall enclosure. Only an arrival hint;
 * callers apply once, so all manual orbit angles remain available afterwards. */
export function exteriorArrivalOrientation(position:{x:number;z:number},center:{x:number;z:number},halfSize:{x:number;z:number},baseAlpha:number){
  const dx=position.x-center.x,dz=position.z-center.z;
  if(Math.abs(dx)<=halfSize.x&&Math.abs(dz)<=halfSize.z)return undefined;
  const alpha=Math.abs(dx)/halfSize.x>Math.abs(dz)/halfSize.z ? dx<0?Math.PI:0 : dz<0?-Math.PI/2:Math.PI/2;
  return ((Math.round((alpha-baseAlpha)/(Math.PI/4))%8)+8)%8;
}
