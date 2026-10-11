import { it, expect } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { buildTerrain3D } from './terrain3d';
import { interactionParts } from './interaction-animation';
import { CampActivityVisuals } from './camp-activity-visuals';
import { createCampVisuals } from '../../campaigns/camp-rests/public/visuals';
import { campRestsPublicCampaign } from '../../campaigns/camp-rests/public/pack';
import { activitiesForCampPoint } from '../shared/camp-activities';
import type { CampRestState } from '../shared/camp-rest';
import type { PublicEntity } from '../shared/protocol';

const shape=(parts:ReturnType<typeof interactionParts>)=>JSON.stringify(parts.map(p=>[p.mesh.position.asArray(),p.mesh.rotation.asArray(),p.mesh.scaling.asArray(),p.mesh.getVerticesData('position')]));
it('binds and animates every offered action on real objects in all five camps',()=>{
  const engine=new NullEngine();
  try{for(const definition of campRestsPublicCampaign.scenes){
    const scene=new Scene(engine);buildTerrain3D(scene,definition.terrain!,{renderTiles:true,batchTiles:true});
    const scenery=createCampVisuals(scene,definition)!,controller=new CampActivityVisuals(scene,definition);
    let serial=100000;
    for(const point of definition.camp!.interactionPoints){
      const parts=interactionParts(scene,point.id);
      expect(parts.length,`${definition.id}/${point.id}: no fake substitute`).toBeGreaterThan(0);
      for(const activity of activitiesForCampPoint(point)){
        const actor:PublicEntity={id:point.ownerCharacterId??'mike',label:'Actor',tokenId:'wizard',kind:'player',color:'#ffffff',sceneId:definition.id,surfaceId:point.surfaceId,cell:point.cell,facing:'north',moving:false,step:null};
        const entry:CampRestState['interactions'][number]={pointId:point.id,pointLabel:point.label,characterId:actor.id,characterLabel:actor.label,activityId:activity.id,action:activity.id==='chest-toggle'?'opened':'used',at:serial+=10000};
        const position=()=>new Vector3((point.cell.col+.5)*1.5,0,(point.cell.row+.5)*1.5);
        scenery.update(1,'night',[entry],point.cell);
        const before=shape(parts);
        if(activity.id==='sit')actor.seatId=point.id;
        controller.update(entry.at+(activity.id==='chest-toggle'?300:1500),[entry],[actor],position,()=>1.8,false);
        expect(shape(parts),`${point.id}/${activity.id}`).not.toBe(before);
        const character=controller.current(entry.at+300,actor,[entry],false);
        if(activity.id!=='sit')expect(character?.id).toBe(activity.id);
        if(!['warm','cook','tend-fire','chest-toggle','sit'].includes(activity.id))expect(scene.meshes.filter(m=>m.metadata?.campActivity===activity.id)).toHaveLength(0);
        // Cancellation restores objects and cannot restart after moving stops.
        actor.moving=true;delete actor.seatId;
        controller.update(entry.at+1700,[entry],[actor],position,()=>1.8,false);
        actor.moving=false;
        expect(controller.current(entry.at+1800,actor,[entry],false)).toBeNull();
      }
    }
    controller.dispose();scene.dispose();
  }}finally{engine.dispose();}
},30000);

it('does not replay a newly received action which was already cancelled before its first rendered frame',()=>{
  const engine=new NullEngine(),scene=new Scene(engine),definition=campRestsPublicCampaign.scenes.find(s=>s.id==='camp-wreck-beach')!;
  const controller=new CampActivityVisuals(scene,definition),point=definition.camp!.interactionPoints.find(p=>p.kind==='fire')!;
  const actor:PublicEntity={id:'mike',label:'Mike',tokenId:'wizard',kind:'player',color:'#fff',sceneId:definition.id,surfaceId:point.surfaceId,cell:point.cell,facing:'north',moving:true,step:null};
  const entries:CampRestState['interactions']=[{pointId:point.id,pointLabel:point.label,characterId:actor.id,characterLabel:actor.label,activityId:'warm',at:100000}];
  expect(controller.current(100100,actor,entries,false)).toBeNull();actor.moving=false;
  expect(controller.current(100200,actor,entries,false)).toBeNull();
  controller.dispose();scene.dispose();engine.dispose();
});
