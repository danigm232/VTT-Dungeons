import { describe,it,expect } from 'vitest';
import { d8BabylonRuntime } from '../../apps/web/d8-babylon-runtime';
describe('embedded D8 runtime',()=>{
  it('exposes finite native sight rays used by the roof/architecture cutaway',()=>{
    const B=d8BabylonRuntime,ray=new B.Ray(B.Vector3.Zero(),new B.Vector3(0,0,1),5);
    expect(ray.length).toBe(5);expect(typeof ray.intersectsMesh).toBe('function');
  });
});
