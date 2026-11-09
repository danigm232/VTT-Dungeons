import { describe, it, expect, vi } from 'vitest';
import { NullEngine, Scene, ArcRotateCamera, Camera, Vector3, MeshBuilder, StandardMaterial, DirectionalLight, ShaderMaterial } from '@babylonjs/core';
import { buildWreckOceanGrid } from './wreck-ocean-grid.js';
import { buildWreckOcean } from './wreck-ocean.js';
import { wreckReflectionCandidates, WreckReflectionCadence } from './wreck-reflections.js';
import { createWreckEnvironment } from './wreck-environment.js';
import { emptyClimateState } from '../shared/game-time.js';
import { wreckRuntimeScenes } from '../../campaigns/stormwreck-isle/public/wreck-runtime.js';

describe('Pecio: optimización sin recortar el área jugable', () => {
  it('keeps a connected 1600 m ocean, upward faces and no internal open edges', () => {
    const e=new NullEngine(),s=new Scene(e);
    try {
      const m=buildWreckOceanGrid(s),p=m.getVerticesData('position')!,idx=m.getIndices()!,normals=m.getVerticesData('normal')!;
      expect(m.getTotalVertices()).toBeLessThan(1100);
      expect(idx.length/3).toBeLessThan(2100);
      const edges=new Map<string,number>(); let area=0;
      for(let i=0;i<idx.length;i+=3){
        const a=Vector3.FromArray(p,idx[i]!*3),b=Vector3.FromArray(p,idx[i+1]!*3),c=Vector3.FromArray(p,idx[i+2]!*3);
        const n=Vector3.Cross(b.subtract(a),c.subtract(a));expect(n.y).toBeLessThan(0);area-=n.y/2;
        for(const [u,v] of [[idx[i]!,idx[i+1]!],[idx[i+1]!,idx[i+2]!],[idx[i+2]!,idx[i]!]]){
          const key=u!<v!?`${u}:${v}`:`${v}:${u}`;edges.set(key,(edges.get(key)??0)+1);
        }
      }
      expect(area).toBeCloseTo(1600*1600,4);
      for(const [edge,count] of edges){expect(count).toBeLessThanOrEqual(2);if(count===1){
        const [a,b]=edge.split(':').map(Number);
        const pa=Vector3.FromArray(p,a!*3),pb=Vector3.FromArray(p,b!*3);
        expect((Math.abs(pa.x)===800&&pa.x===pb.x)||(Math.abs(pa.z)===800&&pa.z===pb.z)).toBe(true);
      }}
      for(let i=1;i<normals.length;i+=3)expect(normals[i]).toBeCloseTo(1,5);
      // Playable water is inside the high-density core, rather than coarse
      // distant bands. Its sampling is finer than the former 12.5 m grid.
      expect(p.slice(0,625*3).filter((_,i)=>i%3!==1).every(v=>Math.abs(v)<=48)).toBe(true);
      expect(m.getBoundingInfo().boundingBox.minimum.y).toBeLessThan(-.047);
    } finally {e.dispose();}
  });

  it('bounds reflection passes during continuous rotation and zoom, and refreshes immediately after interiors', () => {
    for(const compact of [false,true]){
      const e=new NullEngine(),s=new Scene(e);
      try {
        const c=new ArcRotateCamera('camera',-.7,1.1,100,Vector3.Zero(),s);c.mode=Camera.ORTHOGRAPHIC_CAMERA;
        c.orthoTop=20;c.orthoBottom=-20;c.orthoLeft=-30;c.orthoRight=30;
        const cadence=new WreckReflectionCadence(compact);let passes=0;
        for(let frame=0;frame<120;frame++){c.alpha+=.002;c.orthoTop!+=.001;if(cadence.update(frame/120,true,c))passes++;}
        expect(passes).toBeGreaterThan(compact?6:12);expect(passes).toBeLessThanOrEqual(compact?9:15);
        expect(cadence.update(1,false,c)).toBe(false);expect(cadence.update(1.001,true,c)).toBe(true);
        const idle=new WreckReflectionCadence(compact);let idlePasses=0;
        for(let frame=0;frame<120;frame++)if(idle.update(frame/120,true,c))idlePasses++;
        expect(idlePasses).toBeLessThanOrEqual(compact?5:9);
      } finally {e.dispose();}
    }
  });

  it('updates the ocean and its foam independently when the cutaway reveals them', () => {
    const e=new NullEngine(),s=new Scene(e);
    try {
      new ArcRotateCamera('camera',.5,1,100,Vector3.Zero(),s);
      const terrain=wreckRuntimeScenes.find(scene=>scene.id==='wreck-ship')!.terrain!;
      const meshes=buildWreckOcean(s,terrain),water=meshes.find(m=>m.name==='wreck-ocean')!;
      const foam=meshes.filter(m=>m.metadata?.kind==='contact-foam');
      const waterUniforms=vi.spyOn(water.material as ShaderMaterial,'setFloat');
      const foamUniforms=vi.spyOn(foam[0]!.material as ShaderMaterial,'setFloat');
      water.isVisible=false;
      for(const mesh of foam)mesh.isVisible=false;
      s.onBeforeRenderObservable.notifyObservers(s);
      expect(waterUniforms.mock.calls.some(([name])=>name==='time')).toBe(false);
      expect(foamUniforms.mock.calls.some(([name])=>name==='time')).toBe(false);
      water.isVisible=true;
      s.onBeforeRenderObservable.notifyObservers(s);
      expect(waterUniforms.mock.calls.some(([name])=>name==='time')).toBe(true);
      expect(foamUniforms.mock.calls.some(([name])=>name==='time')).toBe(false);
      foam[0]!.isVisible=true;
      s.onBeforeRenderObservable.notifyObservers(s);
      expect(foamUniforms.mock.calls.some(([name])=>name==='time')).toBe(true);
    } finally {e.dispose();}
  });

  it('reuses reflection membership and detects equal-count replacements; leaves visibility live', () => {
    const e=new NullEngine(),s=new Scene(e);
    try {
      const mat=new StandardMaterial('wood',s),a=MeshBuilder.CreateBox('hull',{},s);a.material=mat;
      const water=MeshBuilder.CreateGround('wreck-ocean',{},s);water.material=mat;
      const list=wreckReflectionCandidates(s),initial=list.get();expect(initial).toEqual([a]);expect(list.get()).toBe(initial);
      a.isVisible=false;expect(list.get()).toBe(initial);a.dispose();
      const b=MeshBuilder.CreateBox('boat',{},s);b.material=mat;
      expect(list.get()).toEqual([b]);expect(list.get()).not.toBe(initial);list.dispose();
    } finally {e.dispose();}
  });

  it('prepares late furniture weather without rescanning existing materials or shadowing scenic cards', async () => {
    const e=new NullEngine(),s=new Scene(e);
    try {
      new DirectionalLight('ship-key-light',new Vector3(-1,-1,1),s);
      const scenic=MeshBuilder.CreatePlane('wreck:scenic:horizon',{},s);scenic.metadata={scenicLayer:6};scenic.receiveShadows=false;
      const original=new StandardMaterial('old wood',s),environment=createWreckEnvironment(s);
      const added=new StandardMaterial('late furniture',s),climate={...emptyClimateState(),wetness:.8,snowCoverage:.4};
      // Babylon queues material-added notifications after construction.
      await new Promise<void>(resolve=>setTimeout(resolve,0));
      environment.update(0,1,{storm:false,lightning:false,stormIntensity:0},climate,Vector3.Zero(),[]);
      expect(original.pluginManager?.getPlugin('WreckSurfaceWeather')).toBeTruthy();expect(added.pluginManager?.getPlugin('WreckSurfaceWeather')).toBeTruthy();
      expect(environment.amount.wet).toBe(.8);expect(environment.amount.snow).toBe(.4);expect(scenic.receiveShadows).toBe(false);
    } finally {e.dispose();}
  });
});
