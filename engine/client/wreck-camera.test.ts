import {describe,it,expect,vi} from 'vitest';
import {WRECK_STRUCTURE as S} from '../shared/wreck-structure.js';
import {WRECK_CAMERA_SPACES,WRECK_OVERVIEW_POINTS,wreckOverviewFrame,wreckLongitudinalTarget} from './wreck-camera.js';
import {cameraSpaceAt} from './camera-space.js';
import {WorldRenderer} from '../../apps/web/world.js';
import {WRECK_CAMERA_BASE_ALPHA,wreckCameraFront} from '../shared/wreck-camera-profile.js';
import {terrainCameraBaseAlpha,screenVectorToWorldAtAlpha} from './camera-movement.js';
import {wreckRuntimeScenes} from '../../campaigns/stormwreck-isle/public/wreck-runtime.js';
import {limitedCameraAlpha} from '../shared/camera.js';
import {ArcRotateCamera,Camera,NullEngine,Scene,Vector3} from '@babylonjs/core';

describe('Pecio: cámara centrada sobre el barco',()=>{
  it('opens square onto the broadside from the actual rowboat side, with coherent controls and limited orbit',()=>{
    const engine=new NullEngine(),scene=new Scene(engine);
    try {
      const boat=wreckRuntimeScenes[0]!.stageActors!.find(a=>a.tokenId==='wreck-rowboat')!;
      const boatZ=(boat.cell.row+.5)*S.tileMeters;
      const alpha=terrainCameraBaseAlpha('wreck-ship');expect(alpha).toBeCloseTo(Math.PI/2);
      const camera=new ArcRotateCamera('boat-front',alpha,65*Math.PI/180,121,new Vector3(S.origin.x,1,S.origin.z),scene);
      camera.mode=Camera.ORTHOGRAPHIC_CAMERA;camera.getViewMatrix(true);
      expect(boatZ).toBeGreaterThan(S.origin.z);expect(camera.position.z).toBeGreaterThan(boatZ);
      expect(camera.position.x).toBeCloseTo(S.origin.x,8);
      const projectedStern=Vector3.TransformCoordinates(new Vector3(S.origin.x+S.sternX,0,S.origin.z),camera.getViewMatrix());
      const projectedBow=Vector3.TransformCoordinates(new Vector3(S.origin.x+S.bowX,0,S.origin.z),camera.getViewMatrix());
      expect(projectedBow.y).toBeCloseTo(projectedStern.y,8);expect(Math.abs(projectedBow.x-projectedStern.x)).toBeCloseTo(S.length,8);
      const up=screenVectorToWorldAtAlpha(0,1,alpha,camera.beta),right=screenVectorToWorldAtAlpha(1,0,alpha,camera.beta);
      expect(up.x).toBeCloseTo(0);expect(up.z).toBe(-1);expect(right.x).toBe(-1);expect(right.z).toBeCloseTo(0);
      for(const step of [-2,-1,0,1,2]){const a=limitedCameraAlpha(alpha,step);expect(a).toBeGreaterThanOrEqual(Math.PI/3);expect(a).toBeLessThanOrEqual(2*Math.PI/3);}
    }finally{engine.dispose();}
  });
  it('retains the door-facing cabin fronts independently of the exterior boarding side',()=>{
    expect(wreckCameraFront()).toBe(WRECK_CAMERA_BASE_ALPHA);
    for(const room of ['c4','c5'])expect(Math.cos(wreckCameraFront(room))).toBeGreaterThan(0);
    for(const room of ['c6','c7'])expect(Math.cos(wreckCameraFront(room))).toBeLessThan(0);
  });
  it('starts at the new boat-side front instead of restoring a saved offset from the previous profile',()=>{
    const values=new Map<string,string>([['dungeons.camera-orientation.v2:stormwreck-isle:wreck-ship','2']]);
    vi.stubGlobal('localStorage',{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value)});
    try {
      const view=Object.create(WorldRenderer.prototype) as any;
      Object.assign(view,{campaign:{campaignId:'stormwreck-isle',scenes:[{id:'wreck-ship',renderer:'babylon-hd2d'}]},options:{persistCameraPreferences:true},sharedCameraOrientations:new Map(),localCameraOrientationOverrides:new Set()});
      expect(view.readCameraOrientation('wreck-ship')).toBe(0);
      view.saveCameraOrientation('wreck-ship',1);
      expect(view.readCameraOrientation('wreck-ship')).toBe(1);
      expect(values.get('dungeons.camera-orientation.v2:stormwreck-isle:wreck-ship')).toBe('2');
    } finally {vi.unstubAllGlobals();}
  });
  it('balances bow and stern, keel and mast in landscape/portrait throughout the permitted arc',()=>{
    for(const aspect of [.5,1,16/9,2.4])for(const tilt of [5,10,15,20,25,90]){
      let initial=0;
      for(let degrees=-30;degrees<=30;degrees+=3){
        const alpha=WRECK_CAMERA_BASE_ALPHA+degrees*Math.PI/180,beta=(90-tilt)*Math.PI/180,frame=wreckOverviewFrame(alpha,beta,aspect);
        const rx=-Math.sin(alpha),rz=Math.cos(alpha),ux=-Math.cos(alpha)*Math.cos(beta),uy=Math.sin(beta),uz=-Math.sin(alpha)*Math.cos(beta);
        let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
        for(const p of WRECK_OVERVIEW_POINTS){
          const dx=p.x+S.origin.x-frame.target.x,dy=p.y-frame.target.y,dz=p.z+S.origin.z-frame.target.z;
          const x=(dx*rx+dz*rz)/(frame.halfHeight*aspect),y=(dx*ux+dy*uy+dz*uz)/frame.halfHeight;
          minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
        }
        expect(minX+maxX).toBeCloseTo(0,8);expect(minY+maxY).toBeCloseTo(0,8);
        expect(Math.abs(frame.target.y)).toBeLessThan(30);
        expect(Math.max(Math.abs(minX),Math.abs(maxX),Math.abs(minY),Math.abs(maxY))).toBeLessThan(.92);
        if(initial)expect(frame.halfHeight).toBe(initial);initial=frame.halfHeight;
      }
    }
  });
  it('tracks longitudinal deck centres without moving the actor, and leaves interiors/sea to their own policy',()=>{
    const actor={x:70,y:4,z:29},before={...actor};
    for(const surface of ['main','c2','c3']){
      const target=wreckLongitudinalTarget(surface,actor)!;expect(target.z).toBe(S.origin.z);expect(target.y).toBe(actor.y);
      if(surface==='c2')expect(target.x).toBeGreaterThan(S.origin.x+S.bowDeckStart);
      if(surface==='c3')expect(target.x).toBeLessThan(S.origin.x+S.sternDeckEnd);
    }
    expect(actor).toEqual(before);
    expect(wreckLongitudinalTarget('main',actor,{alpha:-Math.PI/4,halfHeight:6,aspect:.5})).toEqual(actor);
    for(const surface of ['sea','crow','lower-deck','hold-air'])expect(wreckLongitudinalTarget(surface,actor)).toBeNull();
    expect(cameraSpaceAt(WRECK_CAMERA_SPACES,'main',{x:60,z:15})?.id).toBe('c6');
  });
  it('overview discards prior pan and DM interior navigation instead of adding their offset to the ship centre',()=>{
    const view=Object.create(WorldRenderer.prototype) as any;
    Object.assign(view,{sceneId:'wreck-ship',campaign:{scenes:[{id:'wreck-ship',surfaceId:'main'}]},options:{cameraRole:'dm'},dmLocation:{surfaceId:'hold-air'},dmFollowId:'actor',terrainCameraOffset:{x:8,y:3,z:-10},cameraOffset:{x:90,y:-40},selectedEntityId:'actor',cameraOrientationStep:1.3,cameraTiltDegrees:18,saveCameraZoom:vi.fn(),updateCamera:vi.fn(),redrawProjectedOverlays:vi.fn()});
    view.frameSceneOverview();expect(view.terrainCameraOffset).toEqual({x:0,y:0,z:0});expect(view.cameraOffset).toEqual({x:0,y:0});
    expect(view.dmLocation).toBeNull();expect(view.dmFollowId).toBeNull();expect(view.selectedEntityId).toBeNull();expect(view.sceneOverview).toBe(true);expect(view.cameraZoom).toBe(1);
    expect(view.updateCamera).toHaveBeenCalled();
    expect(view.cameraOrientationStep).toBe(1.3);expect(view.cameraTiltDegrees).toBe(18);
  });
});
