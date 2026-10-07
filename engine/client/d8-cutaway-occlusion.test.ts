import {expect,it,vi} from 'vitest';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';
import {WorldRenderer} from '../../apps/web/world';

it('does not hide interior tokens behind faded static or dynamic cutaway walls',()=>{
  const wall={isVisible:true,visibility:.06,isEnabled:()=>true,isDisposed:()=>false};
  const ray={origin:Vector3.Zero(),direction:Vector3.Right(),length:10,intersectsMesh:vi.fn(()=>({hit:true}))};
  const renderer:any=Object.create(WorldRenderer.prototype);
  for(const dynamic of [false,true]){
    renderer.d8OcclusionIndex={segmentCandidates:()=>dynamic?[]:[wall]};renderer.d8DynamicOccluders=dynamic?[wall]:[];
    wall.visibility=.06;expect(renderer.d8RayHitsOccluder(ray)).toBe(false);
    wall.visibility=.35;expect(renderer.d8RayHitsOccluder(ray)).toBe(false);
    wall.visibility=1;expect(renderer.d8RayHitsOccluder(ray)).toBe(true);
  }
});
