import {it,expect} from 'vitest';
import {advanceD8WeatherSurface} from '../../campaigns/one-shot/playground/renderer';
it('accumulates slowly, proportionally to intensity and independently for wetness and snow',()=>{
  const light=advanceD8WeatherSurface(0,0,'rain',1/3,1),heavy=advanceD8WeatherSurface(0,0,'rain',1,1);
  expect(light.wet*3).toBeCloseTo(heavy.wet);expect(heavy.wet).toBe(.05);expect(heavy.snow).toBe(0);
  expect(advanceD8WeatherSurface(.6,.5,'none',0,1)).toEqual({wet:.6-1/120,snow:.5-1/240});
  expect(advanceD8WeatherSurface(.99,.99,'snow',1,1).snow).toBe(1);
});
it('uses elapsed time rather than frame count for deposition',()=>{
  for(const fps of [10,30,60]){
    let wet=0,snow=0;
    for(let frame=0;frame<fps*12;frame++)({wet,snow}=advanceD8WeatherSurface(wet,snow,'snow',.5,1/fps));
    expect(snow).toBeCloseTo(.1,8);expect(wet).toBe(0);
  }
});
