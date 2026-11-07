import { skillTimings, type SkillMicroScenePlayback } from './skill-micro-scene';

type Frame=ReturnType<SkillMicroScenePlayback['frame']>;
const clamp=(x:number)=>Math.min(1,Math.max(0,x));
const smooth=(x:number)=>{const t=clamp(x);return t*t*(3-2*t);};

/** Continuous world motion through die roll, anticipation and takeoff. */
export function skillRunningGround(frame:Frame,reduced=false) {
  const lead=skillTimings.pressed+skillTimings.roll+skillTimings.prepare;
  const takeoff=lead+skillTimings.action*.16;
  const fadeEnd=takeoff+480;
  const elapsed=frame.rollElapsedMs??0;
  const reveal=smooth(elapsed/lead);
  const opacity=frame.rollElapsedMs===undefined?1:reduced?0:1-smooth((elapsed-takeoff)/(fadeEnd-takeoff));
  return {
    edge:1280-888*reveal,
    travel:reduced?0:(frame.ambientMs+elapsed)*.12,
    opacity,
    feather:frame.rollElapsedMs===undefined?0:48*reveal
  };
}
