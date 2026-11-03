import {expect,it} from 'vitest';
import {passageWalkPosition} from './passage-walk';
import {MIRROR_DEPARTURE} from '../../campaigns/one-shot/playground/mirror-cave-layout';
import {MovementTimeline} from './movement-timeline';
const step={from:{col:5,row:0},to:{col:5,row:0},startedAt:1000,durationMs:5000,movementKind:'passage' as const,passage:{portId:'galeria-espejo-cena',points:MIRROR_DEPARTURE.points}};
it('walks five metres-scaled cells continuously while the logical threshold stays valid',()=>{
 for(let i=0;i<=5;i++)expect(passageWalkPosition(step,i/5)).toEqual({x:-6.75,y:.045,z:-9-i*1.5});
 expect(passageWalkPosition(step,-1)).toEqual(step.passage.points[0]);expect(passageWalkPosition(step,2)).toEqual(step.passage.points[5]);
});
it('resumes at authoritative age after reconnect, with no repeated departure start',()=>{
 const timeline=new MovementTimeline(),entity={id:'maria',cell:step.to,step,moving:true} as any;timeline.observe([entity]);
 const resumed=timeline.sample(entity,3580);expect(passageWalkPosition(resumed.step!,.5)!.z).toBe(-12.75);expect(resumed.step!.startedAt).toBe(1000);
 expect(passageWalkPosition({...step,movementKind:undefined},.5)).toBeNull();
});
