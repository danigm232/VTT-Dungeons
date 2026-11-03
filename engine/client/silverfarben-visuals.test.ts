import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {oneShotCampaignDefinition as campaign} from '../../campaigns/one-shot/public/pack';
import {installSilverfarbenVisuals} from '../../campaigns/one-shot/public/silverfarben-visuals';
import {silverfarbenFramesV3} from '../../campaigns/one-shot/public/silverfarben-frames-v3';
import {silverfarbenFramesV4} from '../../campaigns/one-shot/public/silverfarben-frames-v4';
import {combatActionVisualState} from '../shared/combat-animation';
import {conditionSpriteSelection} from './condition-sprites';
import {WorldRenderer} from '../../apps/web/world';

const states=campaign.tokenAnimations['silverfarben-hotel']!;
const directions=['n','ne','e','se','s','sw','w','nw'];
describe('canonical Silverfarben visual profile',()=>{
  it('uses isolated new six-pose actions and real running art, preserving the eight-frame walk',()=>{
    for(const dir of directions){
      expect(states[`idle-${dir}`]!.frames).toHaveLength(1);
      expect(JSON.stringify(states[`idle-${dir}`]!.frames)).toContain('silverfarben-v3/model.png');
      expect(states[`moving-${dir}`]!.frames).toHaveLength(8);
      expect(states[`running-${dir}`]!.frames).toHaveLength(6);
      expect(states[`running-${dir}`]!.frames).not.toEqual(states[`moving-${dir}`]!.frames);
      expect(states[`disengage-${dir}`]!.frames).toEqual(states[`moving-${dir}`]!.frames);
      for(const role of ['jump','attack','spell']){
        expect(states[`${role}-${dir}`]!.frames).toHaveLength(6);
        expect(states[`${role}-${dir}`]!.loop).toBe(false);
      }
    }
    for(const role of ['help','influence','ready','search','study','interact','use-torch','attack-arrow','attack-throw','attack-unarmed']){
      expect(states[role]!.frames,role).toHaveLength(6);expect(states[role]!.loop).toBe(false);
    }
  });
  it('bounds every crop and component seed inside the actual transparent PNG, with no stretching',()=>{
    for(const atlas of [...Object.values(silverfarbenFramesV3),...Object.values(silverfarbenFramesV4)]){
      const bytes=readFileSync(`campaigns/one-shot/public${atlas.frames[0]!.url}`);
      expect(bytes[25]).toBe(6);
      expect([bytes.readUInt32BE(16),bytes.readUInt32BE(20)]).toEqual(atlas.size);
      for(const frame of atlas.frames){
        expect(frame.x+frame.width).toBeLessThanOrEqual(atlas.size[0]!);
        expect(frame.y+frame.height).toBeLessThanOrEqual(atlas.size[1]!);
        expect(frame.logicalWidth/frame.width).toBeCloseTo(frame.logicalHeight/frame.height,6);
        expect(frame.alphaSeeds.length).toBeGreaterThan(0);
        for(const [x,y] of frame.alphaSeeds){expect(x).toBeGreaterThanOrEqual(0);expect(x).toBeLessThan(frame.width);expect(y).toBeGreaterThanOrEqual(0);expect(y).toBeLessThan(frame.height);}
      }
    }
  });
  it('replaces the five requested conditions with six real poses without flattening upright conditions',()=>{
    const seen=new Set<string>();
    for(const condition of ['envenenada','asustada','paralizada','restringida','agarrada','hechizada','derribada','inconsciente'] as const){
      const pose=conditionSpriteSelection(states,condition);
      expect(pose.authored).toBe(true);
      const replaced=['paralizada','restringida','agarrada','hechizada','derribada'].includes(condition);
      expect(pose.animation!.frames).toHaveLength(replaced?6:3);
      if(replaced)expect(JSON.stringify(pose.animation!.frames)).toContain(`silverfarben-v4/condition-${condition}6.png`);
      expect(pose.groundPose).toBe(['derribada','inconsciente'].includes(condition));
      seen.add(JSON.stringify(pose.animation!.frames));
    }
    expect(seen.size).toBe(8);
  });
  it('uses the new identity-locked cast in all eight camera headings and six poses for locomotion',()=>{
    expect(Object.keys(silverfarbenFramesV4)).toHaveLength(13);
    for(const atlas of Object.values(silverfarbenFramesV4)){
      expect(atlas.frames).toHaveLength(6);
      expect(new Set(atlas.poseHashes).size).toBe(6);
      expect(atlas.phases).toHaveLength(6);
    }
    for(const dir of directions)for(const role of ['spell','spell-fog','spell-feather']){
      const clip=states[`${role}-${dir}`]!;
      expect(clip.frames).toHaveLength(6);expect(clip.loop).toBe(false);
      expect(JSON.stringify(clip.frames)).toContain('silverfarben-v4/spell-');
      expect(clip.flipX).toBe(['sw','w','nw'].includes(dir));
    }
    for(const role of ['climb','climbing','swim','swimming','crawl','prone']){
      expect(states[role]!.frames).toHaveLength(6);expect(states[role]!.loop).toBe(true);
      expect(JSON.stringify(states[role]!.frames)).toContain('silverfarben-v4/');
    }
  });
  it('routes lighting a torch to ignition, never to dagger or spell damage',()=>{
    for(const id of ['light-torch','aoife-light-torch'])expect(combatActionVisualState({id,magical:false,animationType:'melee'})).toBe('use-torch');
    expect(states['use-torch']!.frames).not.toEqual(states.attack!.frames);
  });
  it('is repeatable, does not reveal actors or touch other skins and preserves physical height',()=>{
    const copy=structuredClone(campaign),other=structuredClone(copy.tokenAnimations.rogue);
    const ids=Object.keys(copy.tokens);const height=copy.tokens['silverfarben-hotel']!.worldHeightMeters;
    installSilverfarbenVisuals(copy);const clip=copy.tokenAnimations['silverfarben-hotel']!.spell;
    installSilverfarbenVisuals(copy);expect(copy.tokenAnimations['silverfarben-hotel']!.spell).toBe(clip);
    expect(Object.keys(copy.tokens)).toEqual(ids);expect(copy.tokenAnimations.rogue).toEqual(other);
    expect(copy.tokens['silverfarben-hotel']!.worldHeightMeters).toBe(height);
    copy.tokens['silverfarben-hotel']!.url='/art/my-custom-skin.png';
    const custom={frames:['custom.png'],fps:2};copy.tokenAnimations['silverfarben-hotel']!.spell=custom;
    installSilverfarbenVisuals(copy);expect(copy.tokenAnimations['silverfarben-hotel']!.spell).toBe(custom);
    delete copy.tokens['silverfarben-hotel'];delete copy.tokenAnimations['silverfarben-hotel'];
    installSilverfarbenVisuals(copy);expect(copy.tokens['silverfarben-hotel']).toBeUndefined();
  });
  it('keeps an action aimed at its world target as the camera rotates',()=>{
    const facings=['north','north-east','east','south-east','south','south-west','west','north-west'];
    const renderer=Object.create(WorldRenderer.prototype) as any;
    Object.assign(renderer,{campaign,options:{},sceneId:'test',standingActors:new Set(),snapshot:{combat:{active:false,participants:[]}},visualPreview:null});
    const view={entity:{id:'aoife',tokenId:'silverfarben-hotel',conditions:[],moving:false,facing:'south',cell:{col:0,row:0}},animationState:'spell-n',animationFacing:'north',animationUntil:1000};
    for(let step=0;step<8;step++){
      renderer.terrainView={camera:{alpha:-Math.PI/4+step*Math.PI/4}};
      const index=facings.indexOf(renderer.cameraRelativeFacing('north'));
      expect(renderer.activeTokenState(view,100)).toBe(`spell-${directions[index]}`);
      expect(view.entity.facing).toBe('south');expect(view.animationFacing).toBe('north');
    }
  });
});
