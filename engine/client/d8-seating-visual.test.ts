import {it,expect} from 'vitest';
import {WorldRenderer} from '../../apps/web/world';

it('uses the seated pose even after a character previously stood up from prone',()=>{
  const renderer=Object.create(WorldRenderer.prototype) as any;
  Object.assign(renderer,{campaign:{campaignId:'d8-night-private',tokenAnimations:{hero:{sit:{frames:['seat.png'],fps:1},'idle-standing':{frames:['stand.png'],fps:1}}}},standingActors:new Set(['player']),snapshot:{scene:{stageActors:[]},combat:{active:false}},visualPreview:null});
  const entity={id:'player',tokenId:'hero',seatId:'cafe-seat',moving:false,conditions:[]};
  expect(renderer.activeTokenState({entity,animationState:null},1000)).toBe('sit');
  delete (entity as any).seatId;
  expect(renderer.activeTokenState({entity,animationState:null},1000)).toBe('idle-standing');
});
