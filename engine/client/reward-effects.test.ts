import {describe,it,expect} from 'vitest';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';
import {createInspirationBurst,rewardStarPose} from './reward-effects';
describe('reusable inspiration presentation',()=>{
  it('keeps eight star trajectories finite, fades and rises without changing gameplay',()=>{
    for(let i=0;i<8;i++)for(const p of [0,.25,.5,.75,1]){const pose=rewardStarPose(i,p);expect(Object.values(pose).every(Number.isFinite)).toBe(true);expect(pose.alpha).toBeGreaterThanOrEqual(0);expect(pose.alpha).toBeLessThanOrEqual(1);}
    expect(rewardStarPose(0,1).y).toBeGreaterThan(rewardStarPose(0,0).y);
  });
  it('follows an actor and disposes meshes/materials after 1.8 seconds',()=>{
    const engine=new NullEngine(),scene=new Scene(engine);let now=0;const anchor=new Vector3(4,0,5),effect=createInspirationBurst(scene,()=>anchor,()=>now);
    now=900;scene.onBeforeRenderObservable.notifyObservers(scene);expect(effect.stars).toHaveLength(8);expect(effect.stars[0]!.position.x).toBeGreaterThan(4);expect(effect.stars[0]!.visibility).toBeCloseTo(1);
    now=1800;scene.onBeforeRenderObservable.notifyObservers(scene);expect(effect.stars.every(star=>star.isDisposed())).toBe(true);expect(scene.getMaterialByName('rewardInspirationGold')).toBeNull();scene.dispose();engine.dispose();
  });
});
