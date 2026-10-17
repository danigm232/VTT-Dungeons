import {it,expect} from 'vitest';
import {WorldRenderer} from '../../apps/web/world';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';

it('uses the seated pose even after a character previously stood up from prone',()=>{
  const renderer=Object.create(WorldRenderer.prototype) as any;
  Object.assign(renderer,{campaign:{campaignId:'d8-night-private',scenes:[],tokenAnimations:{hero:{sit:{frames:['seat.png'],fps:1},'idle-standing':{frames:['stand.png'],fps:1}}}},standingActors:new Set(['player']),snapshot:{scene:{stageActors:[]},combat:{active:false}},visualPreview:null});
  const entity={id:'player',tokenId:'hero',seatId:'cafe-seat',moving:false,conditions:[]};
  expect(renderer.activeTokenState({entity,animationState:null},1000)).toBe('sit');
  delete (entity as any).seatId;
  expect(renderer.activeTokenState({entity,animationState:null},1000)).toBe('idle-standing');
});
it('uses the actor position for cutaway even when the projector camera aims inside a house',()=>{
  const renderer=Object.create(WorldRenderer.prototype) as any,position=new Vector3(2,0,8);
  Object.assign(renderer,{cameraFocusWorldPoint:{x:7.2,y:0,z:-3},localId:null,selectedEntityId:null,d8Scene:{metadata:{d8Vtt:{config:{spawn:[0,0,20]}}}},interpolatedWorldPosition:()=>position});
  expect(renderer.d8CutawayFocus({id:'hero'})).toEqual(position);expect(renderer.d8CutawayFocus()).toEqual(new Vector3(0,0,20));
});
it('resumes a patron drinking at its home even after a stand animation',()=>{
  const renderer=Object.create(WorldRenderer.prototype) as any;
  Object.assign(renderer,{campaign:{campaignId:'d8-night-private',scenes:[{id:'cafe',stageActors:[{id:'lady',cell:{col:1,row:2},idleAnimation:'drink'}]}],tokenAnimations:{lady:{drink:{frames:['drink.png'],fps:1},'idle-standing':{frames:['stand.png'],fps:1}}}},sceneId:'cafe',standingActors:new Set(['lady']),snapshot:{combat:{active:false}},visualPreview:null,cameraRelativeFacing:()=> 'north'});
  expect(renderer.idleTokenState({entity:{id:'lady',kind:'npc',tokenId:'lady',cell:{col:1,row:2}}})).toBe('drink');
});
