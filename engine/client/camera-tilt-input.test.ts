import {describe,it,expect} from 'vitest';
import {CameraTiltHold} from './camera-tilt-input';
import {stepCameraTilt} from './camera-profile';
describe('continuous vertical input with five-degree landmarks',()=>{
 it('moves a short tap to the next landmark in either direction',()=>{
  expect(stepCameraTilt(7.35,1)).toBe(10);expect(stepCameraTilt(7.35,-1)).toBe(5);
  expect(stepCameraTilt(15,1)).toBe(20);expect(stepCameraTilt(20,1)).toBe(25);
  let value=5;const c=new CameraTiltHold(()=>value,v=>value=v);c.begin(1);c.advance(80);c.end();expect(value).toBe(10);
 });
 it('keeps the exact intermediate angle when releasing a hold',()=>{
  let value=5;const c=new CameraTiltHold(()=>value,v=>value=v);c.begin(1);c.advance(437);c.end();expect(value).toBeCloseTo(7.57);c.advance(1000);expect(value).toBeCloseTo(7.57);
 });
 it('rests at each landmark and then continues smoothly',()=>{
  let value=5;const c=new CameraTiltHold(()=>value,v=>value=v);c.begin(1);c.advance(680);expect(value).toBe(10);c.advance(100);expect(value).toBe(10);c.advance(70);expect(value).toBeCloseTo(10.5);c.end();expect(value).toBeCloseTo(10.5);
 });
 it('reverses from fractional angles and clamps at both ends',()=>{
  let value=7.35;const c=new CameraTiltHold(()=>value,v=>value=v);c.begin(-1);c.advance(280);c.end();expect(value).toBeCloseTo(6.35);
  c.begin(-1);c.advance(20000);c.end();expect(value).toBe(5);c.begin(1);c.advance(20000);c.end();expect(value).toBe(25);
 });
 it('does not create a tap when interrupted by blur or cancellation',()=>{
  let value=7.35;const c=new CameraTiltHold(()=>value,v=>value=v);c.begin(1);c.advance(20);c.end(false);expect(value).toBe(7.35);
 });
});
