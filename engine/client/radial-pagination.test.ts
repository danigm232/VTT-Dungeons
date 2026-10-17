import {expect,it} from 'vitest';
import {radialPagination,radialRadiusLimit} from './radial-pagination';

it('lets side fans use available height or width instead of squeezing eight labels into the shortest axis',()=>{
  expect(radialRadiusLimit(390,844)).toBe(360);
  expect(radialRadiusLimit(844,390)).toBe(360);
  expect(radialRadiusLimit(320,320)).toBeCloseTo(153.6);
  expect(radialPagination(16,8,1)).toEqual({capacity:8,pages:2,page:1});
  expect(radialPagination(16,4,1)).toEqual({capacity:4,pages:4,page:1});
});

it('keeps four/eight icons per page independent of caption length',()=>{
  expect(radialPagination(20,4,0)).toEqual({capacity:4,pages:5,page:0});
  expect(radialPagination(20,8,0)).toEqual({capacity:8,pages:3,page:0});
});
it('keeps one capacity across pages with different label sizes and clamps only after resize',()=>{
  expect(radialPagination(24,4,5)).toEqual({capacity:4,pages:6,page:5});
  expect(radialPagination(24,8,5)).toEqual({capacity:8,pages:3,page:2});
  expect(radialPagination(0,8,3)).toEqual({capacity:8,pages:1,page:0});
});
