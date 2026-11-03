import { describe, it, expect } from 'vitest';
import { clampCameraOrbitStep, limitedCameraAlpha, validCameraOrbitStep, cameraOrbitLabel } from '../shared/camera';
import { CAMERA_MIN_TILT, CAMERA_MAX_TILT, clampCameraTilt } from './camera-profile';
import { D8InteriorCameraTilt } from './interior-camera';
import { cameraZoomLimits, boundCameraZoom } from './camera-zoom';
import { explorationCameraSafeArea } from './camera-viewport';
import { dragonRestCameraCovered } from './camera-zones';
import { cameraBetaForTiltDegrees, screenVectorToWorldAtAlpha } from './camera-movement';

describe('shared VTT camera policy', () => {
  it('limits signed orbit without wrapping and allows fractional mobile steps', () => {
    expect(clampCameraOrbitStep(-8)).toBe(-2); expect(clampCameraOrbitStep(8)).toBe(2);
    expect(clampCameraOrbitStep(.7)).toBe(.7);
    expect(limitedCameraAlpha(Math.PI/4, -2)*180/Math.PI).toBeCloseTo(15);
    expect(limitedCameraAlpha(Math.PI/4, 2)*180/Math.PI).toBeCloseTo(75);
    expect(validCameraOrbitStep(-1.5)).toBe(true);
    for (const value of [NaN,Infinity,-2.1,2.1,'1',null]) expect(validCameraOrbitStep(value)).toBe(false);
    expect(cameraOrbitLabel(-1)).toBe('15° a la izquierda');
  });
  it('shares the 5–25 vertical test range', () => {
    expect(CAMERA_MIN_TILT).toBe(5); expect(CAMERA_MAX_TILT).toBe(25);
    expect(clampCameraTilt(-200)).toBe(5); expect(clampCameraTilt(90)).toBe(25);
    expect(clampCameraTilt(24)).toBe(24);
  });
  it('changes elevation only at interior/exterior boundaries',()=>{
    const preset=new D8InteriorCameraTilt();expect(preset.update(false,25)).toBe(25);
    expect(preset.update(true,7.3)).toBe(10);expect(preset.update(true,7.3)).toBe(7.3);
    expect(preset.update(true,7.3,true)).toBe(7.3);expect(preset.update(true,7.3,false)).toBe(7.3);
    expect(preset.update(false,7.3)).toBe(25);
  });
  it('restores an initial preference and preserves it over reloads in the same zone',()=>{
    const c=new D8InteriorCameraTilt();expect(c.update(true,5,false,undefined,true)).toBe(5);
    c.enterScene();expect(c.update(true,7.35,false,undefined,true)).toBe(7.35);
    c.enterScene();expect(c.update(true,25,false)).toBe(10);
    c.enterScene();expect(c.update(false,7.35,false,undefined,true)).toBe(25);
  });
  it('adapts zoom limits to map, room, viewport and character height', () => {
    const policy={size:{width:80,depth:60,height:8},beta:cameraBetaForTiltDegrees(35),aspect:1.8,baseHalfHeight:30};
    const wide=cameraZoomLimits(policy),portrait=cameraZoomLimits({...policy,aspect:.46});
    expect(portrait.minHalfHeight).toBeGreaterThan(wide.minHalfHeight);
    expect(boundCameraZoom(1e9,policy).halfHeight).toBeCloseTo(wide.minHalfHeight);
    expect(boundCameraZoom(.0001,policy).halfHeight).toBeCloseTo(wide.maxHalfHeight);
    expect(cameraZoomLimits({...policy,size:{width:8,depth:6,height:3}}).maxHalfHeight).toBeLessThan(wide.maxHalfHeight);
    expect(cameraZoomLimits({...policy,actorHeight:8}).minHalfHeight).toBeGreaterThan(wide.minHalfHeight);
  });
  it('retains a readable player and an explicit whole-scene overview', () => {
    const p={size:{width:180,depth:140,height:8},beta:cameraBetaForTiltDegrees(15),aspect:.5,baseHalfHeight:100,player:true,viewportHeight:440};
    const normal=cameraZoomLimits(p),overview=cameraZoomLimits({...p,overview:true});
    expect(normal.maxHalfHeight).toBeLessThan(overview.maxHalfHeight);
    expect(1.65*440/(2*normal.maxHalfHeight)).toBeGreaterThanOrEqual(18);
  });
  it('does not crop combat participants when zooming in', () => {
    const p={size:{width:24,depth:16,height:6},beta:cameraBetaForTiltDegrees(35),aspect:1.6,baseHalfHeight:15,tactical:true};
    expect(cameraZoomLimits(p).minHalfHeight).toBeCloseTo(cameraZoomLimits(p).maxHalfHeight/1.12);
    expect(boundCameraZoom(50,p).halfHeight).toBeCloseTo(cameraZoomLimits(p).minHalfHeight);
  });
  it('allows a modest closer manual combat view without relaxing whole-map/projector overview',()=>{
    const p={size:{width:24,depth:16,height:6},beta:cameraBetaForTiltDegrees(35),aspect:1.6,baseHalfHeight:15,tactical:true};
    const fit=cameraZoomLimits(p),detail=cameraZoomLimits({...p,combatDetail:true});
    expect(detail.minHalfHeight).toBeCloseTo(fit.minHalfHeight/1.35);
    expect(boundCameraZoom(100,{...p,combatDetail:true}).zoom).toBeCloseTo(detail.maxZoom);
    expect(cameraZoomLimits({...p,combatDetail:true,overview:true}).minHalfHeight).toBe(fit.minHalfHeight);
  });
  it('reserves mobile controls and handles small/resized screens', () => {
    for (const [width,height] of [[390,844],[844,390],[1600,900],[160,120]]) {
      const safe=explorationCameraSafeArea(width!,height!,true);
      expect(safe.width).toBeGreaterThan(0);expect(safe.height).toBeGreaterThan(0);
      expect(safe.top+safe.height).toBeLessThan(height!);
    }
    expect(explorationCameraSafeArea(1600,900,false).height).toBe(900);
  });
  it('recognizes Retreat rooms while keeping the arrival and plaza exterior', () => {
    // Global assembly coordinates; the former fixture predated the A1 offset.
    for(const [x,z] of [[80.25,85.5],[90,82.5],[100.5,84],[112.5,83.25],[122.25,82.5],[132,83.25],
      [160.5,67.5],[122.25,61.5],[117.75,59.25],[118.5,57],[102,60]])expect(dragonRestCameraCovered(x!,z!)).toBe(true);
    for(const [x,z] of [[24.75,111.75],[110,96],[42,67.5],[66.8,76.8]])expect(dragonRestCameraCovered(x!,z!)).toBe(false);
  });
  it('keeps movement projected onto the visible camera throughout the limited orbit', () => {
    for(const tilt of [5,10,15,25]) for(let step=-2;step<=2;step+=.2){
      const alpha=limitedCameraAlpha(Math.PI/4,step),beta=cameraBetaForTiltDegrees(tilt),v=screenVectorToWorldAtAlpha(0,1,alpha,beta);
      expect(-Math.sin(alpha)*v.x+Math.cos(alpha)*v.z).toBeCloseTo(0,8);
    }
  });
});
