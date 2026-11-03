import {describe,it,expect} from 'vitest';
import {cameraProfileForScene,snapCameraTilt,stepCameraTilt,validCameraTiltForScene,RETREAT_CAMERA_PROFILE as profile} from './camera-profile';
import {cameraBetaForTiltDegrees,cameraTiltDegreesForBeta} from './camera-movement';
import {D8InteriorCameraTilt} from './interior-camera';
import {cameraSpaceBeta} from './camera-space';
import {cameraTiltFromTouch,adjustCameraTiltForTouch} from './camera-touch';
describe('shared experimental camera elevations',()=>{
 it('uses exactly 5/10/15/20/25 in D8 and Retreat, including shared messages',()=>{
  for(const scene of ['mirror','garden','dragon-rest','wreck-ship']){
   const p=cameraProfileForScene(scene);expect(p.stops).toEqual([5,10,15,20,25]);
   for(const angle of p.stops)expect(validCameraTiltForScene(scene,angle)).toBe(true);
   for(const angle of [0,4.99,25.01,35,40,NaN,'5',null])expect(validCameraTiltForScene(scene,angle)).toBe(false);
  }
  expect([0,5,10,15,20,90].map(x=>snapCameraTilt(x,profile))).toEqual([5,5,10,15,20,25]);
 });
 it('walks five-degree landmarks in both directions and stops at the limits',()=>{
  let angle=25;const down=[];for(let i=0;i<5;i++){angle=stepCameraTilt(angle,-1,profile);down.push(angle);}expect(down).toEqual([20,15,10,5,5]);
  const up=[];for(let i=0;i<5;i++){angle=stepCameraTilt(angle,1,profile);up.push(angle);}expect(up).toEqual([10,15,20,25,25]);
 });
 it('keeps all four elevations through projection and indoor framing',()=>{for(const tilt of profile.stops){expect(cameraTiltDegreesForBeta(cameraBetaForTiltDegrees(tilt,profile),profile)).toBeCloseTo(tilt);expect(cameraSpaceBeta(tilt,true,profile)).toBeCloseTo((90-tilt)*Math.PI/180);}});
 it('applies the same limits to player touch input',()=>{expect(cameraTiltFromTouch(15,-500,profile)).toBe(25);expect(adjustCameraTiltForTouch(15,500,profile)).toBe(5);});
 it('uses indoor 10 and outdoor 25 without overriding manual/combat input',()=>{
  const c=new D8InteriorCameraTilt();expect(c.update(false,25,false,profile)).toBe(25);expect(c.update(true,25,false,profile)).toBe(10);
  expect(c.update(true,7.35,true,profile)).toBe(7.35);expect(c.update(true,7.35,false,profile)).toBe(7.35);
  for(const scene of ['mirror','dragon-rest'])for(const tilt of [5.01,7.35,12.81,20,24.99])expect(validCameraTiltForScene(scene,tilt)).toBe(true);
 });
});
