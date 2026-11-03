import {describe,it,expect,vi} from 'vitest';
import {WorldRenderer} from '../../apps/web/world';
import {retreatPlayerCameraHalfHeight} from '../../campaigns/stormwreck-isle/public/retreat-camera-composition';
import {explorationCameraSafeArea} from './camera-viewport';
import {boundCameraZoom} from './camera-zoom';

describe('Retreat C2 local player envelope',()=>{
 for(const [width,height] of [[1280,720],[390,844],[1920,1080],[2560,720]])it(`bounds the full ${width}x${height} view including HUD margins`,()=>{
  const safe=explorationCameraSafeArea(width!,height!,true),cap=retreatPlayerCameraHalfHeight(width!,height!,safe.height);
  const half=boundCameraZoom(.0001,{size:{width:180,depth:140,height:33},baseHalfHeight:100,beta:85*Math.PI/180,aspect:safe.width/safe.height,viewportHeight:safe.height,player:true,maxStageHalfHeight:cap}).halfHeight;
  expect(half*2*height!/safe.height).toBeLessThanOrEqual(16.000001);
  expect(half*2*width!/safe.height).toBeLessThanOrEqual(30.000001);
 });
 it('keeps a closer room limit and does not modify the shared zoom controller',()=>{
  const policy={size:{width:4,depth:3,height:3},baseHalfHeight:2,beta:85*Math.PI/180,aspect:2,viewportHeight:616,player:true};
  const before=boundCameraZoom(.0001,policy),after=boundCameraZoom(.0001,{...policy,maxStageHalfHeight:retreatPlayerCameraHalfHeight(1280,720,616)});
  expect(after.halfHeight).toBe(before.halfHeight);
 });
 it('clamps an old wide preference immediately but retains a compliant crossing zoom',()=>{
  const view=Object.create(WorldRenderer.prototype) as any;
  Object.assign(view,{selectedObject:null,cameraZoom:.01,explorationZoomBase:null});
  const cap=retreatPlayerCameraHalfHeight(1280,720,616);
  const policy={size:{width:80,depth:60,height:12},beta:85*Math.PI/180,aspect:2,baseHalfHeight:30,player:true,maxStageHalfHeight:cap};
  expect(view.applyZoomPolicy({...policy})).toBeLessThanOrEqual(cap+1e-9);
  view.cameraZoom=view.explorationZoomBase/3.2;
  expect(view.applyZoomPolicy({...policy,size:{width:8,depth:6,height:3},baseHalfHeight:4})).toBeCloseTo(3.2);
  expect(view.applyZoomPolicy({...policy,size:{width:36,depth:20,height:8},baseHalfHeight:18})).toBeCloseTo(3.2);
 });
 it('makes the existing overview action return to the player without an extra control',()=>{
  const view=Object.create(WorldRenderer.prototype) as any;
  Object.assign(view,{sceneId:'dragon-rest',options:{cameraRole:'player'},localId:'hero',snapshot:{camera:{focusId:'other'},entities:[{id:'hero',cell:{col:69,row:62},surfaceId:'a1'}]},cameraZoom:1,cameraZoomPolicy:{size:{width:32,depth:23,height:12},beta:85*Math.PI/180,aspect:2,baseHalfHeight:20,player:true,maxStageHalfHeight:6.8},setSelectedEntity:vi.fn(),setCameraFocusCell:vi.fn(),saveCameraZoom:vi.fn(),updateCamera:vi.fn(),redrawProjectedOverlays:vi.fn()});
  view.frameSceneOverview();expect(view.sceneOverview).toBe(false);expect(view.setSelectedEntity).toHaveBeenCalledWith('hero');expect(view.setCameraFocusCell).toHaveBeenCalledWith({col:69,row:62},'a1');expect(view.updateCamera).toHaveBeenCalled();
 });
 for(const [scene,role] of [['dragon-rest','dm'],['dragon-rest','projector'],['mirror','player'],['wreck-ship','player']])it(`retains overview for ${scene}/${role}`,()=>{
  const view=Object.create(WorldRenderer.prototype) as any;
  Object.assign(view,{sceneId:scene,options:{cameraRole:role},setSelectedEntity:vi.fn(),setCameraFocusCell:vi.fn(),saveCameraZoom:vi.fn(),updateCamera:vi.fn(),redrawProjectedOverlays:vi.fn()});
  view.frameSceneOverview();expect(view.sceneOverview).toBe(true);expect(view.cameraZoom).toBe(1);expect(view.setSelectedEntity).toHaveBeenCalledWith(null);
 });
});
