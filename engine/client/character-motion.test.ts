import { describe, expect, it } from 'vitest';
import { installCharacterMotion } from './character-motion.js';
import type { PublicCampaignDefinition } from '../shared/campaign.js';

function fixture(){
  return {tokens:{zombie:{url:'/art/m3/zombie/zombie1_base.png'},cleric:{url:'/art/tokens/cleric.png'},wizard:{url:'/art/tokens/wizard.png'},rogue:{url:'/art/m3/trinity/maria_base.png'},'silverfarben-hotel':{url:'/art/tokens/Silverfarben Hotel/silverfarben_hotel_base.png'}},
    tokenAnimations:Object.fromEntries(['zombie','cleric','wizard','rogue','silverfarben-hotel'].map(id=>[id,{moving:{frames:['old.png'],fps:1},'condition-poisoned':{frames:['state.png'],fps:1}}]))} as unknown as PublicCampaignDefinition;
}
describe('shared character movement contract',()=>{
  it('upgrades an old API catalogue in all directions, with eight authored run and attack poses',()=>{
    const campaign=fixture();installCharacterMotion(campaign);
    for(const id of Object.keys(campaign.tokens))for(const direction of ['n','ne','e','se','s','sw','w','nw'])for(const state of ['running','attack']){
      const clip=campaign.tokenAnimations[id]![`${state}-${direction}`]!;
      expect(clip.frames.length).toBeGreaterThanOrEqual(8);
      expect(new Set(clip.frames.map(f=>typeof f==='string'?f:JSON.stringify([f.url,f.x,f.y]))).size).toBeGreaterThanOrEqual(8);
      expect(clip.loop).toBe(state==='running');
    }
  });
  it('preserves conditions, actor roster and replacement skins',()=>{
    const campaign=fixture();campaign.tokens.wizard!.url='/custom/wizard-new-outfit.png';
    const before=structuredClone(campaign);installCharacterMotion(campaign);installCharacterMotion(campaign);
    expect(campaign.tokens).toEqual(before.tokens);
    expect(campaign.tokenAnimations.wizard).toEqual(before.tokenAnimations.wizard);
    expect(campaign.tokenAnimations.zombie!['condition-poisoned']).toEqual(before.tokenAnimations.zombie!['condition-poisoned']);
    expect(Object.keys(campaign.tokenAnimations)).toEqual(Object.keys(before.tokenAnimations));
  });
  it('uses eight real crawl/jump/swim poses and distinct dagger/unarmed clips for Silverfarben',()=>{
    const campaign=fixture();installCharacterMotion(campaign);
    for(const id of Object.keys(campaign.tokens))for(const state of ['climb','crawl','swim','jump','stealth'])expect(campaign.tokenAnimations[id]![state]!.frames).toHaveLength(8);
    expect(campaign.tokenAnimations['silverfarben-hotel']!['attack-unarmed']!.frames[0]).not.toEqual(campaign.tokenAnimations['silverfarben-hotel']!.attack!.frames[0]);
  });
  it('keeps each sailor appearance and separates bite, grapple, claw, club and song clips',()=>{
    const campaign=fixture();
    for(const n of [2,3,4]){
      campaign.tokens[`zombie-${n}`]={...campaign.tokens.zombie!,url:`/art/m3/zombie/zombie${n}_base.png`};
      campaign.tokenAnimations[`zombie-${n}`]={};
    }
    campaign.tokens.harpy={...campaign.tokens.zombie!,url:'/art/m3/harpy/harpia_base.png'};
    campaign.tokenAnimations.harpy={};installCharacterMotion(campaign);
    for(const id of ['zombie','zombie-2','zombie-3','zombie-4']){
      const clips=campaign.tokenAnimations[id]!;
      for(const state of ['attack-bite','grapple','hit','fall','stand','crawl','fortitude'])expect(clips[state]!.frames).toHaveLength(8);
      expect(clips['attack-bite']!.frames[0]).not.toEqual(clips.grapple!.frames[0]);
      expect(clips.prone!.frames[0]).toEqual(clips.fall!.frames[7]);
    }
    const harpy=campaign.tokenAnimations.harpy!;
    for(const direction of ['n','ne','e','se','s','sw','w','nw'])for(const state of ['moving','fly','attack','attack-club'])expect(harpy[`${state}-${direction}`]!.frames).toHaveLength(8);
    expect(harpy.attack!.frames[0]).not.toEqual(harpy['attack-club']!.frames[0]);
    for(const state of ['song','takeoff','land','hit','fall','stand','crawl'])expect(harpy[state]!.frames).toHaveLength(8);
  });
  it('does not share mutable clips between two loaded campaigns',()=>{
    const a=fixture(),b=fixture();installCharacterMotion(a);installCharacterMotion(b);
    a.tokenAnimations.zombie!.attack!.fps=99;
    const frame=a.tokenAnimations.zombie!.attack!.frames[0]!;
    if(typeof frame!=='string')frame.url='/other-campaign.png';
    expect(b.tokenAnimations.zombie!.attack!.fps).toBe(10);
    expect(b.tokenAnimations.zombie!.attack!.frames[0]).not.toEqual(frame);
  });
  it('keeps the same sailor outfit and last direction when stopping',()=>{
    const campaign=fixture();
    for(const n of [2,3,4]){
      const id=`zombie-${n}`;
      campaign.tokens[id]={...campaign.tokens.zombie!,url:`/art/m3/zombie/zombie${n}_base.png`};
      campaign.tokenAnimations[id]={'idle-n':{frames:['zombie-one.png'],fps:1},'combat-idle-w':{frames:['zombie-one.png'],fps:1}};
    }
    installCharacterMotion(campaign);
    for(const id of ['zombie','zombie-2','zombie-3','zombie-4'])for(const direction of ['n','ne','e','se','s','sw','w','nw'])for(const state of ['direction','idle','combat-idle']){
      const clip=campaign.tokenAnimations[id]![`${state}-${direction}`]!;
      expect(clip.frames).toHaveLength(1);
      expect(clip.frames[0]).toEqual(campaign.tokenAnimations[id]![`moving-${direction}`]!.frames[0]);
    }
  });
});
