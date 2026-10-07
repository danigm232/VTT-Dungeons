import {describe,it,expect} from 'vitest';
import {isolateAtlasRGBA} from './atlas-isolation';
import {SnapshotClock} from './snapshot-clock';
describe('atlas and movement regressions',()=>{
  it('excludes a neighbouring boot inside the crop while retaining the detached book',()=>{
    const pixels=new Uint8ClampedArray(10*8*4),paint=(x:number,y:number)=>{pixels[(y*10+x)*4+3]=255;};
    for(let y=1;y<6;y++)for(let x=1;x<4;x++)paint(x,y);paint(6,3);paint(8,7);
    const isolated=isolateAtlasRGBA(pixels,10,8,[[1,1],[6,3]]);
    expect(isolated[(8*7+7)*4+3]).toBe(0);expect(isolated[(7*10+8)*4+3]).toBe(0);expect(isolated[(3*10+6)*4+3]).toBe(255);expect(isolated[(5*10+3)*4+3]).toBe(255);
  });
  it('does not rewind motion when later broadcasts arrive with different latency',()=>{
    const clock=new SnapshotClock();clock.observe(1000,1040);expect(clock.now(1090)).toBe(1050);
    clock.observe(1050,1120);expect(clock.now(1130)).toBe(1090);clock.observe(1100,1120);expect(clock.now(1140)).toBe(1120);
    expect(clock.now(1130)).toBe(1120);clock.reset();clock.observe(20,2000);expect(clock.now(2000)).toBe(20);
  });
});
