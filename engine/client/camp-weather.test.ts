import { describe, expect, it } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { campRestsPublicCampaign } from '../../campaigns/camp-rests/public/pack.js';
import { CampFire } from '../../campaigns/camp-rests/public/camp-fire.js';
import { campCovered, createCampSurfaceEffects } from '../../campaigns/camp-rests/public/camp-surface-effects.js';
import { createCampVisuals } from '../../campaigns/camp-rests/public/visuals.js';
import { buildTerrain3D } from './terrain3d.js';
import type { EnvironmentState } from '../shared/protocol.js';
import { campRestsBundle } from '../../campaigns/camp-rests/server.js';
import { GameState } from '../server/game.js';

const rain=(level:1|2|3):EnvironmentState=>({storm:false,lightning:false,stormIntensity:0,precipitation:'rain',precipitationLevel:level});
describe('campamentos: fuego, clima y recortes completos',()=>{
  it('apaga toda emisión diurna y conserva brasas al apagarse la llama con lluvia fuerte',()=>{
    const fire=new CampFire('fire');expect(fire.update(.1,.12,rain(1))).toMatchObject({flame:0,embers:0,smoke:0});
    let result=fire.update(0,.95,rain(3));for(let i=0;i<70;i++)result=fire.update(.1,.95,rain(3));
    expect(result.flame).toBe(0);expect(result.embers).toBeGreaterThan(.7);expect(result.smoke).toBeGreaterThan(1);
  });
  it('mantiene fuego con lluvia débil y exige avivar el fuego con lluvia media',()=>{
    const weak=new CampFire('fire');let result=weak.update(0,.95,rain(1));for(let i=0;i<120;i++)result=weak.update(1,.95,rain(1));
    expect(result.flame).toBeCloseTo(.85);expect(result.smoke).toBeGreaterThan(1);
    const medium=new CampFire('fire');for(let i=0;i<47;i++)medium.update(1,.95,rain(2));
    expect(medium.fuel).toBe(0);
    const interaction={pointId:'fire',pointLabel:'Hoguera',characterId:'mike',characterLabel:'Mike',at:1000,activityId:'tend-fire' as const};
    expect(medium.update(.1,.95,rain(2),[interaction],1100).flame).toBeGreaterThan(.6);
    expect(medium.update(1,.95,rain(2),[interaction],1200).flame).toBeLessThan(.62);
  });
  it('protege el fuego bajo abrigo y no vuelve a encender solo un fuego apagado',()=>{
    const sheltered=new CampFire('fire',true),exposed=new CampFire('fire');
    for(let i=0;i<10;i++){sheltered.update(1,.95,rain(3));exposed.update(1,.95,rain(3));}
    expect(sheltered.fuel).toBe(1);expect(exposed.update(1,.95).flame).toBe(0);
  });
  it('aplica una leña recibida tarde una sola vez y espera una marca de tiempo futura',()=>{
    const fire=new CampFire('fire');fire.fuel=0;
    const entry={pointId:'fire',pointLabel:'Hoguera',characterId:'mike',characterLabel:'Mike',at:1000,activityId:'tend-fire' as const};
    expect(fire.update(0,.95,rain(2),[entry],20000).flame).toBe(.62);
    fire.fuel=0;expect(fire.update(0,.95,rain(2),[entry],21000).flame).toBe(0);
    const future={...entry,at:30000};expect(fire.update(0,.95,rain(2),[future],29000).flame).toBe(0);
    expect(fire.update(0,.95,rain(2),[future],30000).flame).toBe(.62);
  });
  it('orienta la entrada hacia el fuego, con hueco transitable y lecho al fondo',()=>{
    for(const def of campRestsPublicCampaign.scenes.filter(s=>s.camp!.visualProfile!=='rooms')){
      const fire=def.camp!.interactionPoints.find(p=>p.kind==='fire')!;
      for(const tent of def.camp!.interactionPoints.filter(p=>p.kind==='tent')){
        const facing=Math.sign(fire.objectCell!.row-tent.objectCell!.row)||1;
        expect(tent.cell.row-tent.objectCell!.row).toBe(facing*2);
        expect(def.walkable.some(c=>c.col===tent.cell.col&&c.row===tent.cell.row)).toBe(true);
        const bed=def.camp!.interactionPoints.find(p=>p.kind==='bed'&&p.ownerCharacterId===tent.ownerCharacterId)!;
        expect(bed.objectCell!.row-tent.objectCell!.row).toBe(-facing);
      }
    }
  });
  it('oculta también postes y travesaño, apaga lámparas diurnas y registra sombras en todos los objetos',()=>{
    const engine=new NullEngine();
    try{for(const def of campRestsPublicCampaign.scenes){
      const scene=new Scene(engine);buildTerrain3D(scene,def.terrain!,{batchTiles:true});const visuals=createCampVisuals(scene,def)!;
      const point=def.camp!.interactionPoints.find(p=>p.kind==='tent'||p.kind==='bed')!;
      visuals.update(1,'night',[],point.objectCell);
      if(def.camp!.visualProfile!=='rooms'){
        const shell=scene.meshes.filter(m=>m.name.startsWith(point.id+':shell')||m.metadata?.interactionPointId===point.id);
        expect(shell.length).toBeGreaterThan(0);expect(shell.every(m=>!m.isVisible)).toBe(true);
        expect(scene.meshes.some(m=>m.name.endsWith(':ridge-pole')||m.name.endsWith(':support'))).toBe(false);
        expect(scene.getLightByName(point.id+':lantern-light')!.intensity).toBeGreaterThan(0);
      }
      visuals.update(2,'arrival',[],point.objectCell);
      expect(scene.lights.filter(l=>/torch-light|candle-light|plaza-fire-light|fire-point:light|lantern-light/.test(l.name)).every(l=>l.intensity===0)).toBe(true);
      expect(scene.meshes.filter(m=>/chest.*lid|camp:static|a1:static|:interior/.test(m.name)&&!/contact|bounce|flame|embers|water|stream|glow/i.test(m.name)).filter(m=>!m.receiveShadows).map(m=>m.name)).toEqual([]);
      if(def.camp!.visualProfile!=='rooms'){
        const mia=def.camp!.interactionPoints.find(p=>p.kind==='tent'&&p.ownerCharacterId==='mia')!;
        const candles=scene.meshes.filter(m=>m.metadata?.fireSource==='candle');
        visuals.update(3,'night',[],mia.objectCell);expect(candles).toHaveLength(2);expect(candles.every(m=>m.isVisible&&m.visibility===1)).toBe(true);
        visuals.update(4,'arrival',[],mia.objectCell);expect(candles.every(m=>m.visibility===0)).toBe(true);
        visuals.update(5,'night',[],null);expect(candles.every(m=>!m.isVisible)).toBe(true);
      }
      for(let second=6;second<=14;second++)visuals.update(second,'night',[],null,rain(3));
      const hearth=scene.lights.find(l=>/plaza-fire-light|fire-point:light/.test(l.name))!;
      expect(hearth.intensity,def.id+' apaga su hoguera expuesta').toBe(0);
      const firePoint=def.camp!.interactionPoints.find(p=>p.kind==='fire')!;
      visuals.update(15,'night',[{pointId:firePoint.id,pointLabel:firePoint.label,characterId:'mike',characterLabel:'Mike',at:1000,activityId:'tend-fire',action:'used'}],null,rain(2),20000);
      expect(hearth.intensity,def.id+' recupera fuego tras una leña recibida tarde').toBeGreaterThan(0);
      scene.dispose();
    }}finally{engine.dispose();}
  },30000);
  it('recorta árboles completos, incluye troncos en cada grupo y los restaura al girar',()=>{
    const engine=new NullEngine(),scene=new Scene(engine);
    try{const def=campRestsPublicCampaign.scenes.find(s=>s.id==='camp-forest-pleamar')!,view=buildTerrain3D(scene,def.terrain!,{batchTiles:true}),visuals=createCampVisuals(scene,def)!;
      const trees=scene.meshes.filter(m=>m.name.startsWith('forest:whole-tree:'));expect(trees).toHaveLength(def.terrain!.obstacles!.filter(o=>o.obstacleId.includes('tree-')).length);
      for(const m of trees){const p=m.getVerticesData('position')!;expect(Math.max(...p.filter((_,i)=>i%3===1))-Math.min(...p.filter((_,i)=>i%3===1))).toBeGreaterThan(5);}
      expect(scene.meshes.some(m=>m.name.startsWith('forest:trunk:'))).toBe(false);
      view.camera.setPosition(new Vector3(18,18,-20));view.camera.getViewMatrix(true);visuals.update(1,'night',[],{col:9,row:3});
      const hidden=trees.filter(t=>!t.isVisible);expect(hidden.length).toBeGreaterThan(0);
      view.camera.setPosition(new Vector3(18,18,50));view.camera.getViewMatrix(true);visuals.update(2,'night',[],{col:9,row:3});
      expect(hidden.some(t=>t.isVisible)).toBe(true);
    }finally{scene.dispose();engine.dispose();}
  });
  it('mantiene el río fuera de las tiendas, prolonga sus extremos y conserva corriente animada',()=>{
    const engine=new NullEngine(),scene=new Scene(engine);
    try{const def=campRestsPublicCampaign.scenes.find(s=>s.id==='camp-forest-pleamar')!;buildTerrain3D(scene,def.terrain!,{batchTiles:true});const visuals=createCampVisuals(scene,def)!;
      const water=def.terrain!.surfaces[0]!.tiles.filter(t=>t.materialId==='water');expect(water.length).toBeGreaterThan(20);expect(water.every(t=>t.medium==='water'&&t.movementCost===2)).toBe(true);
      const positions=scene.getMeshByName('forest:organic-stream')!.getVerticesData('position')!;
      expect(Math.min(...positions.filter((_,i)=>i%3===2))).toBe(-80);expect(Math.max(...positions.filter((_,i)=>i%3===2))).toBe(120);
      for(const tent of def.camp!.interactionPoints.filter(p=>p.kind==='tent'))for(let i=0;i<positions.length;i+=3)expect(Math.abs(positions[i]!-(tent.objectCell!.col+.5)*1.5)>3.4||Math.abs(positions[i+2]!-(tent.objectCell!.row+.5)*1.5)>3.4).toBe(true);
      visuals.update(1,'night');const flow=scene.getMeshByName('forest:flow-glints')!,before=[...flow.getVerticesData('position')!];visuals.update(2,'night');expect(flow.getVerticesData('position')).not.toEqual(before);
    }finally{scene.dispose();engine.dispose();}
  });
  it('acumula nieve con tiempo real y excluye los interiores de precipitación',()=>{
    const engine=new NullEngine(),scene=new Scene(engine);
    try{const def=campRestsPublicCampaign.scenes.find(s=>s.id==='camp-forest-pleamar')!;buildTerrain3D(scene,def.terrain!,{batchTiles:true});const layer=createCampSurfaceEffects(scene,def),before=layer.amount.snow;
      for(let i=0;i<600;i++)layer.update(.1,{storm:false,lightning:false,stormIntensity:0,precipitation:'snow',precipitationLevel:3});
      expect(layer.amount.snow-before).toBeCloseTo(1);const tent=def.camp!.interactionPoints.find(p=>p.kind==='tent')!;
      expect(layer.covered((tent.objectCell!.col+.5)*1.5,(tent.objectCell!.row+.5)*1.5)).toBe(true);expect(layer.covered(18,18)).toBe(false);
      const a1=campRestsPublicCampaign.scenes[0]!;expect(campCovered(a1,16.5,9)).toBe(true);expect(campCovered(a1,36,22.5)).toBe(false);
    }finally{scene.dispose();engine.dispose();}
  });
  it('reubica guardados antiguos en el antiguo acceso de la tienda sin alterar PG ni mapa',()=>{
    const state=new GameState(campRestsBundle);state.changeScene('camp-forest-pleamar');const save=state.captureDurable(),mike=save.characters.find(c=>c.id==='mike')!;
    mike.sceneId='camp-forest-pleamar';mike.surfaceId='ground';mike.cell={col:12,row:18};const hp=mike.hp;
    const restored=new GameState(campRestsBundle);expect(()=>restored.restoreDurable(save)).not.toThrow();
    const actor=restored.characters.get('mike')!;expect(actor.sceneId).toBe(mike.sceneId);expect(actor.hp).toBe(hp);expect(actor.cell).not.toEqual(mike.cell);
  });
});
