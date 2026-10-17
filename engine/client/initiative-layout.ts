export type InitiativePosition = 'right' | 'top' | 'left';
export const INITIATIVE_MARGIN_CM = 1.5;
// CSS reference pixels (96/in); physical size depends on browser/display scaling.
export const INITIATIVE_MARGIN_PX = INITIATIVE_MARGIN_CM * 96 / 2.54;
export function normalizeInitiativePosition(value:unknown):InitiativePosition {
  return value==='left'||value==='top'?value:'right';
}
/** Space occupied by the compact line, not the former full-width HUD panel. */
export function initiativeCameraInsets(position:InitiativePosition){
  const edge=INITIATIVE_MARGIN_PX+96+12;
  return {left:position==='left'?edge:12,right:position==='right'?edge:12,
    top:position==='top'?INITIATIVE_MARGIN_PX+100+12:84,bottom:120};
}
