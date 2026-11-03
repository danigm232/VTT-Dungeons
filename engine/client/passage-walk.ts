import type {StepState} from '../shared/protocol';
/** Distance-based interpolation of a server-authored, non-interactive exit. */
export function passageWalkPosition(step:StepState,progress:number){
 const points=step.movementKind==='passage'?step.passage?.points:undefined;if(!points?.length)return null;
 const lengths=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i]!.x,p.y-points[i]!.y,p.z-points[i]!.z));
 let distance=lengths.reduce((a,b)=>a+b,0)*Math.max(0,Math.min(1,progress));
 for(let i=0;i<lengths.length;i++){const length=lengths[i]!;if(distance<=length||i===lengths.length-1){const a=points[i]!,b=points[i+1]!,t=length?Math.min(1,distance/length):0;return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t};}distance-=length;}
 return {...points[0]!};
}
