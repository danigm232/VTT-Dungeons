import {it,expect} from 'vitest';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial.js';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder.js';
import {RainAccumulation,rainShelterCode} from './rain-accumulation.js';
import {wreckFogRange} from './wreck-fog.js';
import {emptyClimateState} from '../shared/game-time.js';
import {wreckRuntimeScenes} from '../../campaigns/stormwreck-isle/public/wreck-runtime.js';
import {campRestsPublicCampaign} from '../../campaigns/camp-rests/public/pack.js';
it('prepara variantes antes del primer dibujo y conserva la misma climatología viva al clonarlas',()=>{
 const engine=new NullEngine(),scene=new Scene(engine);try{
  const base=new StandardMaterial('wood',scene),rain=new RainAccumulation(scene,wreckRuntimeScenes[0]!);
  rain.update(12,{...emptyClimateState(),wetness:.8,puddleCoverage:.4},1);
  const variant=base.clone('style-v1:ship:wood');
  expect(variant.pluginManager?.getPlugin('RainAccumulation')).toBeFalsy();
  rain.prepare();const plugin=variant.pluginManager?.getPlugin('RainAccumulation')!;
  expect(plugin.getCustomCode('fragment')?.CUSTOM_FRAGMENT_BEFORE_FOG).toContain('rainPool');
  const values:any[]=[];const buffer={updateFloat4:(...v:any[])=>values.push(v),updateFloat:(...v:any[])=>values.push(v)};
  (plugin as any).bindForSubMesh(buffer);expect(values[0]).toEqual(['rainSurface',.8,.4,0,12]);
  rain.update(20,{...emptyClimateState(),wetness:.3,puddleCoverage:.1},0);values.length=0;
  (plugin as any).bindForSubMesh(buffer);expect(values[0]).toEqual(['rainSurface',.3,.1,0,0]);
  rain.prepare();expect(variant.pluginManager?.getPlugin('RainAccumulation')).toBe(plugin);
 }finally{scene.dispose();engine.dispose();}
});
it('mantiene visible el centro del barco al alejarse incluso con niebla máxima',()=>{
  for(const radius of [25,80,160,350]){
    const fog=wreckFogRange(radius,1),opacity=(radius-fog.start)/(fog.end-fog.start);
    expect(opacity).toBeLessThan(.3);expect(fog.end).toBeGreaterThan(radius+60);
  }
  expect(wreckFogRange(80,1,true)).toEqual({start:71,end:107});
});
it('usa charcos autoritativos, sin nuevas superficies ni iluminación',()=>{
  const engine=new NullEngine(),scene=new Scene(engine);try{
    const mat=new StandardMaterial('wood',scene),mesh=MeshBuilder.CreateBox('test',{},scene);mesh.material=mat;
    const water=new RainAccumulation(scene,wreckRuntimeScenes[0]!);water.update(12,{...emptyClimateState(),wetness:.8,puddleCoverage:.4},1);
    expect(water.amount.puddles).toBe(.4);expect(scene.meshes).toHaveLength(1);expect(scene.lights).toHaveLength(0);
    const plugin=mat.pluginManager?.getPlugin('RainAccumulation')!;
    expect(plugin.registerForExtraEvents).toBe(false);
    expect(plugin.getCustomCode('fragment')?.CUSTOM_FRAGMENT_BEFORE_FOG).toContain('rainPool');
    water.update(16,{...emptyClimateState(),puddleCoverage:.3},0);
    expect(water.amount.rain).toBe(0);expect(water.amount.puddles).toBe(.3);
  }finally{scene.dispose();engine.dispose();}
});
it('protege camarotes, tiendas, A1 y techos D8 mediante coordenadas reales',()=>{
  const engine=new NullEngine(),scene=new Scene(engine);try{
    expect(rainShelterCode(scene,wreckRuntimeScenes[0]!)).toContain('2.550');
    const a1=campRestsPublicCampaign.scenes.find(s=>s.id==='camp-a1-rooms')!;
    expect(rainShelterCode(scene,a1).match(/rainExposure=0/g)?.length).toBe(12);
    const forest=campRestsPublicCampaign.scenes.find(s=>s.id==='camp-forest-pleamar')!;
    expect(rainShelterCode(scene,forest)).toContain('2.35-abs');
    const roof=MeshBuilder.CreateBox('roof',{height:.2},scene);roof.position.y=3;roof.metadata={interiorRoof:{x:4,z:6,w:8,d:7}};
    expect(rainShelterCode(scene,{...wreckRuntimeScenes[0]!,id:'cafe',camp:undefined})).toContain('2.850');
    roof.metadata.interiorRoof={x:4,z:6,radius:5};
    expect(rainShelterCode(scene,{...wreckRuntimeScenes[0]!,id:'garden',camp:undefined})).toContain('vec2(4.000,6.000))<5.000');
  }finally{scene.dispose();engine.dispose();}
});
it('muestra la nieve acumulada en un terreno exterior que no tiene su propia capa de nieve',()=>{
  const engine=new NullEngine(),scene=new Scene(engine);try{
    const mat=new StandardMaterial('retreat-stone',scene),mesh=MeshBuilder.CreateBox('retreat-ground',{},scene);mesh.material=mat;
    const surfaces=new RainAccumulation(scene,{...wreckRuntimeScenes[0]!,id:'dragon-rest'});
    surfaces.update(0,{...emptyClimateState(),snowCoverage:1,snowDepthCm:3.6},0);
    const plugin=mat.pluginManager?.getPlugin('RainAccumulation')!;
    expect(plugin.getCustomCode('fragment')?.CUSTOM_FRAGMENT_BEFORE_FOG).toContain('snowCover');
    expect(surfaces.amount.snow).toBe(1);expect(scene.meshes).toHaveLength(1);
  }finally{scene.dispose();engine.dispose();}
});
