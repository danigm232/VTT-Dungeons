import { describe,it,expect } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { WorldWeather,weatherParticleBudget } from './world-weather';
describe('shared world weather',()=>{
  it('keeps rain and snow outside roofs even when the focus is indoors',()=>{
    const engine=new NullEngine(),scene=new Scene(engine),weather=new WorldWeather(scene);
    for(const precipitation of ['rain','snow'] as const){
      const environment={storm:false,lightning:false,stormIntensity:0,precipitation,precipitationLevel:3 as const};
      weather.update(environment,Vector3.Zero(),true,16,24,(x,z)=>x<0);
      const visible=scene.meshes.filter(m=>m.isVisible);
      expect(visible.length).toBeGreaterThan(0);expect(visible.length).toBeLessThan(192);expect(visible.every(mesh=>mesh.position.x>=0)).toBe(true);
      weather.update(environment,Vector3.Zero(),true,16,24,()=>true);expect(scene.meshes.filter(m=>m.isVisible)).toHaveLength(0);
    }
    weather.dispose();scene.dispose();engine.dispose();
  });
  it('renders three bounded intensities of rain and snow, hides indoors, disposes all meshes',()=>{
    const engine=new NullEngine(),scene=new Scene(engine),weather=new WorldWeather(scene);
    for(const precipitation of ['rain','snow'] as const)for(const precipitationLevel of [1,2,3] as const){
      const environment={storm:false,lightning:false,stormIntensity:0,precipitation,precipitationLevel,windIntensity:.8};
      weather.update(environment,Vector3.Zero(),false,16);
      expect(scene.meshes.filter(m=>m.isVisible&&m.name.startsWith(`weather:${precipitation==='rain'?'drop':'flake'}`))).toHaveLength(weatherParticleBudget(precipitationLevel));
      weather.update(environment,Vector3.Zero(),true,16);expect(scene.meshes.filter(m=>m.isVisible)).toHaveLength(0);
    }
    weather.update({storm:false,lightning:false,stormIntensity:0,precipitation:'none'},Vector3.Zero(),false,16);
    expect(scene.meshes.filter(m=>m.isVisible)).toHaveLength(0);weather.dispose();expect(scene.meshes).toHaveLength(0);scene.dispose();engine.dispose();
  });
  it('covers an overview instead of raining only around an offscreen player and keeps the same particle budget',()=>{
    const engine=new NullEngine(),scene=new Scene(engine),weather=new WorldWeather(scene);
    weather.update({storm:false,lightning:false,stormIntensity:0,precipitation:'rain',precipitationLevel:3},new Vector3(10,0,20),false,16,90);
    const drops=scene.meshes.filter(m=>m.isVisible);expect(drops).toHaveLength(192);
    expect(drops.some(m=>Math.abs(m.position.x-10)>30)).toBe(true);expect(drops.every(m=>m.scaling.x===90/24)).toBe(true);
    weather.dispose();scene.dispose();engine.dispose();
  });
});
