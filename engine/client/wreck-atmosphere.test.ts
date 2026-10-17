import {describe,it,expect} from 'vitest';
import {NullEngine,Scene,DirectionalLight,Vector3,MeshBuilder,StandardMaterial} from '@babylonjs/core';
import {weatheredBoneMaterial} from './wreck-bone-material.js';
import {buildDistantDragonBones} from './wreck-dragon-bones.js';
import {buildShipRowboat} from './ship-rowboat3d.js';
import {buildShipPropVisual} from './ship-props3d.js';
import {createWreckEnvironment,wreckWeatherCovered} from './wreck-environment.js';
import {wreckRuntimeScenes} from '../../campaigns/stormwreck-isle/public/wreck-runtime.js';
import {WRECK_STRUCTURE as S} from '../shared/wreck-structure.js';
import {emptyClimateState} from '../shared/game-time.js';
import type {PublicProp} from '../shared/protocol.js';

describe('pecio: luz, clima y detalle canónico',()=>{
  it('protege C4–C9 sin impedir nieve en C2/C3/cofa ni gotas sobre el techo',()=>{
    expect(wreckWeatherCovered(20,16,'main',1)).toBe(true);
    expect(wreckWeatherCovered(20,16,'main',4)).toBe(false);
    for(const surface of ['c2','c3','crow','sea'])expect(wreckWeatherCovered(20,16,surface,1)).toBe(false);
    for(const surface of ['lower-deck','hold-air'])expect(wreckWeatherCovered(42,20,surface,6)).toBe(true);
  });
  it('comparte texturas de erosión y relieve entre los huesos',()=>{
    const e=new NullEngine(),s=new Scene(e);try{
      const a=weatheredBoneMaterial(s,'a'),b=weatheredBoneMaterial(s,'b');
      expect(a.diffuseTexture).toBe(b.diffuseTexture);expect(a.bumpTexture).toBe(b.bumpTexture);
      expect(a.diffuseTexture?.getSize().width).toBe(256);expect(a.bumpTexture?.name).toContain('erosion-normal');
      const bones=buildDistantDragonBones(s);expect(bones).toHaveLength(1);expect(bones[0]!.metadata.outsideNavigation).toBe(true);expect(bones[0]!.isPickable).toBe(false);
    }finally{s.dispose();e.dispose();}
  });
  it('recibe clima autoritativo sin añadir lámparas encendidas',()=>{
    const e=new NullEngine(),s=new Scene(e);try{
      new DirectionalLight('ship-key-light',new Vector3(-.42,-1,.35),s);
      const wood=new StandardMaterial('wood',s);MeshBuilder.CreateBox('fixture',{},s).material=wood;
      const environment=createWreckEnvironment(s),climate={...emptyClimateState(),snowCoverage:.7,wetness:.4};
      environment.update(0,1,{storm:false,lightning:false,stormIntensity:0,precipitation:'snow'},climate,Vector3.Zero(),[]);
      expect(environment.amount.snow).toBe(.7);expect(environment.amount.wet).toBe(.4);expect(s.lights).toHaveLength(1);
      expect(wood.pluginManager?.getPlugin('WreckSurfaceWeather')).toBeTruthy();
    }finally{s.dispose();e.dispose();}
  });
  it('el nido llena la cofa manteniendo la exclusión interior original',()=>{
    expect(S.nestRadius/S.crowRadius).toBeGreaterThan(.98);
    const crow=wreckRuntimeScenes[0]!.terrain!.surfaces.find(s=>s.id==='crow')!;
    for(const t of crow.tiles)expect(Math.hypot((t.cell.col+.5)*1.5-S.origin.x,(t.cell.row+.5)*1.5-S.origin.z)).toBeGreaterThan(S.nestCoreRadius);
  });
  it('añade espuma y spray al bote sin convertirlos en obstáculos',()=>{
    const e=new NullEngine(),s=new Scene(e);try{
      const boat=buildShipRowboat(s),children=boat.getChildMeshes();
      expect(children.some(m=>m.metadata?.kind==='rowboat-contact-vfx')).toBe(true);
      expect(children.filter(m=>m.metadata?.kind==='rowboat-spray')).toHaveLength(8);
      expect(children.every(m=>!m.checkCollisions&&!m.isPickable)).toBe(true);
    }finally{s.dispose();e.dispose();}
  });
  it('C4 representa dos cajones y pergaminos; C5 sigue sin utensilios inventados',()=>{
    const e=new NullEngine(),s=new Scene(e);try{
      const prop=(id:string)=>{const p=wreckRuntimeScenes[0]!.props.find(p=>p.id===id)!;return {...p,footprint:p.baseFootprint,structure:'intact'} as PublicProp;};
      expect(buildShipPropVisual(s,prop('c4-desk-blockout'),3,1.5).getChildMeshes().filter(m=>m.name.includes('drawer-front'))).toHaveLength(2);
      expect(buildShipPropVisual(s,prop('c4-bookshelf-blockout'),1.5,1.5).getChildMeshes().filter(m=>m.name.includes('waterlogged-scroll'))).toHaveLength(4);
      expect(buildShipPropVisual(s,prop('c5-counter-blockout'),4.5,1.5).getChildMeshes().some(m=>m.name.includes('cooking-pot'))).toBe(false);
    }finally{s.dispose();e.dispose();}
  });
});
