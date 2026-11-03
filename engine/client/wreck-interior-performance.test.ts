import {describe,it,expect,vi} from 'vitest';
import {NullEngine,Scene,Vector3,PointLight} from '@babylonjs/core';
import {buildWreckInterior} from './wreck-interior.js';
import {WRECK_STRUCTURE as S} from '../shared/wreck-structure.js';
import {ShaderMaterial} from '@babylonjs/core/Materials/shaderMaterial.js';

describe('Pecio: animación interior agrupada',()=>{
  it('uses one callback, sleeps on hidden floors, and preserves the original fish/bubble paths and light sources',()=>{
    const engine=new NullEngine(),scene=new Scene(engine);
    const clock=vi.spyOn(performance,'now').mockReturnValue(41000);
    try {
      const before=scene.onBeforeRenderObservable.observers.length,meshes=buildWreckInterior(scene);
      expect(scene.onBeforeRenderObservable.observers.length-before).toBe(1);
      const fishes=meshes.filter(m=>m.metadata?.kind==='submerged-fish'),bubbles=meshes.filter(m=>m.metadata?.kind==='submerged-bubbles');
      expect(fishes).toHaveLength(9);expect(bubbles).toHaveLength(18);
      const skin=meshes.find(m=>m.metadata?.kind==='submerged-caustics')!,water=skin.material as ShaderMaterial;
      const float=vi.spyOn(water,'setFloat'),uniform=vi.spyOn(water,'setVector4');
      for(const mesh of meshes)mesh.isVisible=false;
      scene.onBeforeRenderObservable.notifyObservers(scene);expect(float).not.toHaveBeenCalled();expect(uniform).not.toHaveBeenCalled();
      skin.isVisible=true;for(const mesh of [...fishes,...bubbles])mesh.isVisible=true;
      const light=new PointLight('carried-light:actor',new Vector3(40,-5,20),scene);light.range=12;light.intensity=1.5;
      scene.onBeforeRenderObservable.notifyObservers(scene);
      expect(float).toHaveBeenCalledWith('time',41);
      expect(fishes[0]!.position.x).toBeCloseTo(S.origin.x-14+Math.sin(14.35)*1.2,8);
      expect(fishes[0]!.position.y).toBe(-5.5);expect(fishes[0]!.position.z).toBeCloseTo(S.origin.z+Math.cos(14.35*.7)*3.5,8);
      expect(bubbles[0]!.position.x).toBeCloseTo(S.origin.x-27+Math.sin(6.15)*.09,8);expect(bubbles[0]!.position.y).toBeCloseTo(-5.8375,8);
      expect(uniform.mock.calls.find(([id])=>id==='source0')![1]).toMatchObject({x:40,y:20,z:6,w:1.5});
      skin.isVisible=false;float.mockClear();scene.onBeforeRenderObservable.notifyObservers(scene);expect(float).not.toHaveBeenCalled();
      clock.mockReturnValue(90000);skin.isVisible=true;scene.onBeforeRenderObservable.notifyObservers(scene);
      expect(float).toHaveBeenCalledWith('time',90);
    } finally {clock.mockRestore();engine.dispose();}
  });
});
