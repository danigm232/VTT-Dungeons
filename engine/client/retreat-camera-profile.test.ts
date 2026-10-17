import {describe,it,expect} from 'vitest';
import {cameraProfileForScene,snapCameraTilt,RETREAT_CAMERA_PROFILE as profile} from './camera-profile';
import {cameraBetaForTiltDegrees,cameraTiltDegreesForBeta} from './camera-movement';
import {D8InteriorCameraTilt} from './interior-camera';
import {cameraSpaceBeta} from './camera-space';
import {cameraTiltFromTouch,adjustCameraTiltForTouch} from './camera-touch';
describe('Retiro camera policy',()=>{
 it('uses 20/30/40 and preserves legacy scenes',()=>{expect(cameraProfileForScene('dragon-rest')).toBe(profile);expect(cameraProfileForScene('d8')).toEqual({min:15,max:35,default:25,step:10});expect([0,20,30,40,90].map(x=>snapCameraTilt(x,profile))).toEqual([20,20,30,40,40]);});
 it('keeps all three elevations through projection and indoor framing',()=>{for(const tilt of [20,30,40]){expect(cameraTiltDegreesForBeta(cameraBetaForTiltDegrees(tilt,profile),profile)).toBeCloseTo(tilt);expect(cameraSpaceBeta(tilt,true,profile)).toBeCloseTo((90-tilt)*Math.PI/180);}});
 it('applies the same limits to player touch input',()=>{expect(cameraTiltFromTouch(30,-500,profile)).toBe(40);expect(adjustCameraTiltForTouch(30,500,profile)).toBe(20);});
 it('enters combat at 40 and restores exploration, preserving manual input',()=>{const c=new D8InteriorCameraTilt();expect(c.update(false,30,false,profile)).toBe(30);expect(c.update(true,30,false,profile)).toBe(20);expect(c.update(true,30,false,profile)).toBe(30);expect(c.update(true,30,true,profile)).toBe(40);expect(c.update(true,20,true,profile)).toBe(20);expect(c.update(true,20,false,profile)).toBe(30);});
});
