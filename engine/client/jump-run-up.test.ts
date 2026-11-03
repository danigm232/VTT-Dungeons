import { describe, expect, it } from 'vitest';
import { WorldRenderer } from '../../apps/web/world';
import { oneShotCampaignDefinition as campaign } from '../../campaigns/one-shot/public/pack';
describe('jump preparation presentation', () => {
  it('runs only during approach, jumps only during flight and then returns to oriented rest', () => {
    const renderer=Object.create(WorldRenderer.prototype) as any;
    Object.assign(renderer,{campaign,options:{},sceneId:'test',standingActors:new Set(),snapshot:{combat:{active:false,participants:[]}},visualPreview:null,cameraOrientationStep:0,terrainView:null});
    for (const tokenId of ['rogue','silverfarben-hotel']) {
      const view:any={entity:{id:'p',kind:'player',tokenId,facing:'north',conditions:[],moving:true,cell:{col:5,row:5},step:{movementKind:'run-up'}},animationState:null};
      expect(renderer.activeTokenState(view,100)).toBe('running-n');
      view.entity.facing='south-west'; expect(renderer.activeTokenState(view,100)).toBe('running-sw');
      view.entity.step.movementKind='jump'; expect(renderer.activeTokenState(view,100)).toBe(tokenId==='silverfarben-hotel'?'jump-sw':'jump');
      view.entity.step=null; view.entity.moving=false; expect(renderer.activeTokenState(view,100)).toBe('idle-sw');
    }
  });
});
