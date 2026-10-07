import {it,expect} from 'vitest';
import {MovementTimeline} from './movement-timeline';
import type {PublicEntity} from '../shared/protocol';
const entity = (start:number,from:number,to:number) => ({id:'p',cell:{col:to,row:0},moving:true,step:{from:{col:from,row:0},to:{col:to,row:0},startedAt:start,durationMs:220}} as PublicEntity);
const position = (e:PublicEntity,time:number) => e.step ? e.step.from.col+(e.step.to.col-e.step.from.col)*Math.max(0,Math.min(1,(time-e.step.startedAt)/220)) : e.cell.col;
it('keeps the tail of the previous step when the next packet arrives early',()=>{
  const timeline=new MovementTimeline();let p=entity(1000,0,1);timeline.observe([p]);
  p=entity(1220,1,2);timeline.observe([p]);
  expect(position(timeline.sample(p,1250),1170)).toBeCloseTo(170/220);
  expect(position(timeline.sample(p,1310),1230)).toBeCloseTo(1+10/220);
});
it('finishes a stopped step without snapping, and discards a DM teleport',()=>{
  const timeline=new MovementTimeline();let p=entity(1000,0,1);timeline.observe([p]);p={...p,step:null,moving:false};timeline.observe([p]);
  expect(timeline.sample(p,1230).moving).toBe(true);expect(timeline.sample(p,1320).step).toBeNull();
  p={...p,cell:{col:8,row:0}};timeline.observe([p]);expect(timeline.sample(p,1240).cell.col).toBe(8);
});
