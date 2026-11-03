import type {StepState} from '../shared/protocol.js';
import {passageWalkPosition} from './passage-walk.js';
/** Read the existing server-authorised passage; no local travel decision. */
export function retreatBoatDeparture(step:StepState|null|undefined,progress:number){
 if(step?.passage?.portId!=='travel-pecio-boat')return null;
 const actor=passageWalkPosition(step,progress);if(!actor)return null;
 return {actor,boat:{x:20.25,z:Math.max(119.4,actor.z)},seated:actor.z>=119.15,rowing:actor.z>119.4,stroke:Math.max(0,(actor.z-119.4))*Math.PI*1.8};
}
