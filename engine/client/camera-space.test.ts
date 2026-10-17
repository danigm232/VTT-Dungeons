import { describe,expect,it } from 'vitest';
import { cameraSpaceTiltDegrees,cameraSpaceBeta } from './camera-space';
import { D8CameraMotion } from './d8-camera';
describe('layered interior camera framing',()=>{
  it('uses the shared manual tilt range without overriding interiors every frame',()=>{
    expect(cameraSpaceTiltDegrees(30,true)).toBe(30);
    expect(cameraSpaceTiltDegrees(30,false)).toBe(30);
    expect(90-cameraSpaceBeta(20,true)*180/Math.PI).toBeCloseTo(20);
    const rig=new D8CameraMotion(),pose={alpha:0,beta:cameraSpaceBeta(40,false),halfHeight:10,target:{x:0,y:1,z:0}};
    rig.update(pose,16);
    for(let i=0;i<90;i++)rig.update({...pose,beta:cameraSpaceBeta(20,true)},16);
    expect(90-rig.update({...pose,beta:cameraSpaceBeta(20,true)},16).beta*180/Math.PI).toBeCloseTo(20,2);
    expect(90-rig.update(pose,16).beta*180/Math.PI).toBeLessThan(40);
    for(let i=0;i<90;i++)rig.update(pose,16);
    expect(90-rig.update(pose,16).beta*180/Math.PI).toBeCloseTo(35,2);
  });
  it('clamps old steeper preferences to 35 degrees',()=>expect(cameraSpaceTiltDegrees(65,true)).toBe(35));
});
