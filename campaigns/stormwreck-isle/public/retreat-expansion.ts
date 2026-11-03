/** Approved floor extensions, 22 October 2026. Dimensions are VTT_AMBIENCE.
 * The existing module loader, cutaway controller and movement data remain owners.
 */
export const RETREAT_EXPANDED_BOUNDS={
 a2:[158.6,163.8,64.7,69.3],a3:[113.7,129.3,50.7,65.3],
 a4:[92.28,111.3,52.2,65.3],a5:[33.4,50.25,62.5,76.8]
} as const;
const R3_BOUNDS={...RETREAT_EXPANDED_BOUNDS,a3:[113.7,131.3,50.7,65.3],a4:[86.28,111.3,52.2,65.3]} as const;
export const retreatExpansionModules={
 a2:new URL('./art/retreat-modules/retreat_expanded_a2.glb',import.meta.url).href,
 a3:new URL('./art/retreat-modules/retreat_expanded_a3.glb',import.meta.url).href,
 a4:new URL('./art/retreat-modules/retreat_expanded_a4.glb',import.meta.url).href,
 a5:new URL('./art/retreat-modules/retreat_expanded_a5.glb',import.meta.url).href,
 roof2:new URL('./art/retreat-modules/retreat_expanded_a2_roof.glb',import.meta.url).href,
 roof3:new URL('./art/retreat-modules/retreat_expanded_a3_roof.glb',import.meta.url).href,
 roof4:new URL('./art/retreat-modules/retreat_expanded_a4_roof.glb',import.meta.url).href,
 roof5:new URL('./art/retreat-modules/retreat_expanded_a5_roof.glb',import.meta.url).href
};
export const retreatExpansionPhases={
 1:new URL('./art/retreat-modules/retreat_expanded_p1_runtime.glb',import.meta.url).href,
 3:new URL('./art/retreat-modules/retreat_expanded_p3_runtime.glb',import.meta.url).href,
 6:new URL('./art/retreat-modules/retreat_expanded_p6_runtime.glb',import.meta.url).href,
 7:new URL('./art/retreat-modules/retreat_expanded_p7_runtime.glb',import.meta.url).href
};
export const retreatExpansionStone=new URL('./art/retreat-modules/retreat_expanded_stone_s3_runtime.glb',import.meta.url).href;
export const retreatExpansionGeography=new URL('./art/retreat-modules/retreat_expanded_geography_runtime.glb',import.meta.url).href;
export function retreatExpandedInterior(x:number,z:number,revisionStage=6){
 return (Object.entries(revisionStage>=6?R3_BOUNDS:RETREAT_EXPANDED_BOUNDS).find(([,b])=>x>b[0]&&x<b[1]&&z>b[2]&&z<b[3])?.[0]??null) as keyof typeof RETREAT_EXPANDED_BOUNDS|null;
}
export function retreatExpandedCovered(x:number,z:number,revisionStage=6){
 return [[159,163.5,65,69],[114,revisionStage>=6?131:129,55.5,63],[114,120,51,54],[117,118.5,54,65.25],[revisionStage>=6?87:93,111,52.5,63],[33.6,47.4,62.5,76.8]].some(b=>x>b[0]!&&x<b[1]!&&z>b[2]!&&z<b[3]!);
}
