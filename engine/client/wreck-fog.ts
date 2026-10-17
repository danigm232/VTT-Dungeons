/** Fog must describe depth beyond the diorama, not distance from a zoomed-out
 * orthographic camera. Otherwise an overview turns every lit mesh into teal. */
export function wreckFogRange(radius:number, density:number, submerged=false) {
  if(submerged)return {start:radius-9,end:radius+27};
  const strength=Math.max(0,Math.min(1,density));
  return {start:Math.max(0,radius-45),end:radius+180-strength*70};
}
