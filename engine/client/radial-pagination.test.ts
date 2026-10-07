import {expect,it} from 'vitest';
import {radialPagination,radialRadiusLimit} from './radial-pagination';

it('lets side fans use available height or width instead of squeezing eight labels into the shortest axis',()=>{
  expect(radialRadiusLimit(390,844)).toBe(360);
  expect(radialRadiusLimit(844,390)).toBe(360);
  expect(radialRadiusLimit(320,320)).toBeCloseTo(153.6);
  expect(radialPagination(16,8,1,()=>true)).toEqual({capacity:8,pages:2,page:1});
  expect(radialPagination(16,4,1,()=>true)).toEqual({capacity:4,pages:4,page:1});
});

it('can reach every compact page instead of clamping it to the original wide page size',()=>{
  for(let page=0;page<4;page++)expect(radialPagination(4,4,page,(_start,count)=>count<=1)).toEqual({capacity:1,pages:4,page});
});
it('keeps one capacity across pages with different label sizes and clamps only after resize',()=>{
  const fit=(start:number,count:number)=>start<3?count<=3:count<=2;
  expect(radialPagination(8,8,2,fit)).toEqual({capacity:2,pages:4,page:2});
  expect(radialPagination(8,8,3,()=>true)).toEqual({capacity:8,pages:1,page:0});
});
