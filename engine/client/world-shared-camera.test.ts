import { describe, expect, it, vi } from 'vitest';
import { WorldRenderer } from '../../apps/web/world';

function camera(role: 'projector' | 'player' | 'dm' = 'projector') {
  const view = Object.create(WorldRenderer.prototype) as any;
  Object.assign(view, { sceneId:'garden', d8Scene:{}, cameraTiltDegrees:25, cameraOrientationStep:0,
    cameraTiltPreferences:new Map(),cameraTiltZones:new Map(),localCameraTiltOverrides:new Set(),sharedCameraTilts:new Map(), sharedCameraOrientations:new Map(), sharedCameraFrames:new Map(), localCameraOrientationOverrides:new Set(),
    options:{cameraRole:role, persistCameraPreferences:role==='player', followSharedCameraOrientation:role==='player'},
    cameraTiltChangeHandler:vi.fn() });
  return view;
}

describe('shared camera tilt', () => {
  it('persists exact per-scene angles and restores them after recreating a player renderer',()=>{
    const values=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>values.set(k,v)});
    try{
      const view=camera('player');view.campaign={campaignId:'test'};view.sceneId='mirror';view.setCameraTiltDegrees(7.35);view.rememberCameraTiltZone(true);
      view.sceneId='garden';view.setCameraTiltDegrees(12.6);
      const reload=camera('player');reload.campaign=view.campaign;
      expect(reload.readCameraTilt('mirror')).toBe(7.35);expect(reload.readCameraTilt('garden')).toBe(12.6);expect(reload.readCameraTilt('market')).toBeNull();
      reload.sceneId='mirror';expect(reload.preserveCameraTiltInZone(true)).toBe(true);expect(reload.preserveCameraTiltInZone(false)).toBe(false);
      reload.sceneId='mirror';reload.cameraTiltDegrees=7.35;reload.setSharedCameraOrientation('mirror',0,25);expect(reload.getCameraTiltDegrees()).toBe(7.35);
      reload.applyAutomaticCameraTilt(10,true);expect(reload.getCameraTiltDegrees()).toBe(10);expect(reload.readCameraTilt('mirror')).toBe(10);
      expect(reload.readCameraTilt('garden')).toBe(12.6);
    }finally{vi.unstubAllGlobals();}
  });
  for(const role of ['dm','player'] as const)it(`preserves ${role} manual zoom across follow/zone/tilt changes and permits correction`,()=>{
    const view=camera(role);Object.assign(view,{localId:role==='player'?'hero':null,selectedObject:null,cameraZoom:2,explorationZoomBase:null});
    const policy={size:{width:36,depth:27,height:8},beta:75*Math.PI/180,aspect:1.6,baseHalfHeight:24,player:role==='player'};
    const chosen=view.applyZoomPolicy({...policy});
    const room={...policy,size:{width:8,depth:6,height:3},baseHalfHeight:4,beta:85*Math.PI/180};
    expect(view.applyZoomPolicy({...room})).toBe(chosen);
    expect(view.cameraZoom).toBe(2);
    // A new local zoom-out limit must not turn an attempted zoom-out into
    // a forced zoom-in when the previous zoom was retained across a doorway.
    expect(view.limitRequestedZoom(1.8)).toBeLessThanOrEqual(2);
    view.cameraZoom=view.limitRequestedZoom(2.2);
    const closer=view.applyZoomPolicy({...room});expect(closer).toBeLessThan(chosen);
    view.cameraZoom=view.limitRequestedZoom(view.cameraZoom/1.2);
    expect(view.applyZoomPolicy({...room})).toBeGreaterThanOrEqual(closer);
  });
  it('keeps the DM tilt over automatic room/combat presets and releases it on disable', () => {
    const view=camera();
    view.setSharedCameraOrientation('garden',-1.5,10);
    view.applyAutomaticCameraTilt(15);
    expect(view.getCameraTiltDegrees()).toBe(10);
    expect(view.getCameraOrientationStep()).toBe(-1.5);
    view.clearSharedCameraOrientations();
    view.applyAutomaticCameraTilt(15);
    expect(view.getCameraTiltDegrees()).toBe(15);
  });
  it('retains a tilt received before the new scene has finished loading', () => {
    const view=camera();
    view.setSharedCameraOrientation('dragon-rest',1,5);
    expect(view.getCameraTiltDegrees()).toBe(25);
    view.sceneId='dragon-rest';
    view.applyAutomaticCameraTilt(20);
    expect(view.getCameraTiltDegrees()).toBe(5);
  });
  it('keeps the player fractional tilt when the DM shares another view', () => {
    const view=camera('player');
    view.setSharedCameraOrientation('garden',0,10);
    view.setCameraTiltDegrees(7.35);
    view.applyAutomaticCameraTilt(7.35);
    expect(view.getCameraTiltDegrees()).toBe(7.35);
    view.setSharedCameraOrientation('garden',0,25);
    view.applyAutomaticCameraTilt(7.35);
    expect(view.getCameraTiltDegrees()).toBe(7.35);
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
    const projector=camera(); projector.setSharedCameraOrientation('dragon-rest',0,25,frame);
    expect(projector.resolveCameraFraming(30,{x:0,y:0,z:0},null).halfHeight).toBe(30);
    projector.sceneId='dragon-rest';
    expect(projector.resolveCameraFraming(30,{x:0,y:0,z:0},null).halfHeight).toBe(6);
    const player=camera('player');player.cameraZoom=3;
    player.setSharedCameraOrientation('garden',0,25,frame);
    expect(player.resolveCameraFraming(8,{x:1,y:1,z:1},null).halfHeight).toBe(8);
    expect(player.cameraZoom).toBe(3);
  });
});
