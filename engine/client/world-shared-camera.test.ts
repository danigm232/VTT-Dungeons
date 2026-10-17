import { describe, expect, it, vi } from 'vitest';
import { WorldRenderer } from '../../apps/web/world';

function camera(role: 'projector' | 'player' = 'projector') {
  const view = Object.create(WorldRenderer.prototype) as any;
  Object.assign(view, { sceneId:'garden', d8Scene:{}, cameraTiltDegrees:25, cameraOrientationStep:0,
    sharedCameraTilts:new Map(), sharedCameraOrientations:new Map(), sharedCameraFrames:new Map(),
    options:{cameraRole:role, persistCameraPreferences:role==='player', followSharedCameraOrientation:role==='player'},
    cameraTiltChangeHandler:vi.fn() });
  return view;
}

describe('shared camera tilt', () => {
  it('keeps the DM tilt over automatic room/combat presets and releases it on disable', () => {
    const view=camera();
    view.setSharedCameraOrientation('garden',-1.5,35);
    view.applyAutomaticCameraTilt(15);
    expect(view.getCameraTiltDegrees()).toBe(35);
    expect(view.getCameraOrientationStep()).toBe(-1.5);
    view.clearSharedCameraOrientations();
    view.applyAutomaticCameraTilt(15);
    expect(view.getCameraTiltDegrees()).toBe(15);
  });
  it('retains a tilt received before the new scene has finished loading', () => {
    const view=camera();
    view.setSharedCameraOrientation('dragon-rest',1,40);
    expect(view.getCameraTiltDegrees()).toBe(25);
    view.sceneId='dragon-rest';
    view.applyAutomaticCameraTilt(20);
    expect(view.getCameraTiltDegrees()).toBe(40);
  });
  it('lets a player make a local adjustment until the DM shares another view', () => {
    const view=camera('player');
    view.setSharedCameraOrientation('garden',0,35);
    view.setCameraTiltDegrees(15);
    view.applyAutomaticCameraTilt(15);
    expect(view.getCameraTiltDegrees()).toBe(15);
    view.setSharedCameraOrientation('garden',0,25);
    view.applyAutomaticCameraTilt(35);
    expect(view.getCameraTiltDegrees()).toBe(25);
    expect(view.cameraTiltChangeHandler).toHaveBeenCalled();
  });
  it('shares the DM world scale and focal point despite a projector overview fit', () => {
    const view=camera(), frame={halfHeight:4,target:{x:12,y:1,z:8},focusId:'hero'};
    view.setSharedCameraOrientation('garden',0,25,frame);
    expect(view.resolveCameraFraming(30,{x:0,y:4,z:0},null)).toEqual({halfHeight:4,target:frame.target});
    view.clearSharedCameraOrientations();
    expect(view.resolveCameraFraming(30,{x:0,y:4,z:0},null).halfHeight).toBe(30);
  });
  it('buffers projector framing during a scene load and leaves player zoom independent', () => {
    const frame={halfHeight:6,target:{x:100,y:2,z:80},focusId:null};
    const projector=camera(); projector.setSharedCameraOrientation('dragon-rest',0,30,frame);
    expect(projector.resolveCameraFraming(30,{x:0,y:0,z:0},null).halfHeight).toBe(30);
    projector.sceneId='dragon-rest';
    expect(projector.resolveCameraFraming(30,{x:0,y:0,z:0},null).halfHeight).toBe(6);
    const player=camera('player');player.cameraZoom=3;
    player.setSharedCameraOrientation('garden',0,25,frame);
    expect(player.resolveCameraFraming(8,{x:1,y:1,z:1},null).halfHeight).toBe(8);
    expect(player.cameraZoom).toBe(3);
  });
});
