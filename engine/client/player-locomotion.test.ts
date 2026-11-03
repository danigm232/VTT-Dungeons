import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { oneShotCampaignDefinition as d8 } from '../../campaigns/one-shot/public/pack';
import { publicCampaignDefinition as storm } from '../../campaigns/stormwreck-isle/public/pack';
import { installPlayerLocomotion, locomotionEpoch } from './player-locomotion';
import { playerWalkFrames } from './player-walk-frames';
import { mergeDirectionalArt } from './directional-rest';
import { WorldRenderer } from '../../apps/web/world';
const directions = ['n','ne','e','se','s','sw','w','nw'];

describe('audited player locomotion', () => {
  it('installs eight bounded frames for every heading in both campaigns', () => {
    for (const [campaign, id] of [[d8,'rogue'],[d8,'silverfarben-hotel'],[storm,'rogue']] as const) {
      const states = campaign.tokenAnimations[id]!;
      for (const dir of directions) {
        const walk = states[`moving-${dir}`]!;
        expect(walk.frames).toHaveLength(8); expect(walk.fps).toBe(16);
        const run=states[`running-${dir}`]!;
        if(id==='silverfarben-hotel'){
          expect(run.frames).toHaveLength(6);expect(run.frames).not.toEqual(walk.frames);expect(run.fps).toBe(14);
        }else{expect(run.frames).toEqual(walk.frames);expect(run.fps).toBe(20);}
        if(id==='silverfarben-hotel')expect(JSON.stringify(states[`idle-${dir}`]!.frames)).toContain('silverfarben-v3/model.png');
        else expect(states[`idle-${dir}`]!.frames).toEqual([walk.frames[0]]);
        expect(states[`idle-${dir}`]!.motion).toBeUndefined();
        expect(new Set(walk.frames.map(frame => JSON.stringify(frame))).size).toBe(8);
        for (const frame of walk.frames) {
          if (typeof frame === 'string') throw new Error('Expected isolated atlas frame');
          const png = readFileSync(`campaigns/${campaign === d8 ? 'one-shot' : 'stormwreck-isle'}/public${frame.url}`);
          expect(frame.x + frame.width).toBeLessThanOrEqual(png.readUInt32BE(16));
          expect(frame.y + frame.height).toBeLessThanOrEqual(png.readUInt32BE(20));
          expect(png[25]).toBe(6); expect(frame.anchorY).toBe(1);
          expect(frame.alphaSeeds!.length).toBeGreaterThan(0);
          for (const [x,y] of frame.alphaSeeds!) {
            expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThan(frame.width);
            expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThan(frame.height);
          }
        }
      }
    }
  });
  it('uses correct labelled rear views and exactly two explicit mirror aliases', () => {
    for (const [id, name] of [['rogue','trinity'],['silverfarben-hotel','silverfarben']] as const) {
      const states = d8.tokenAnimations[id]!;
      for (const dir of directions) {
        const alias = name === 'trinity' && dir === 'e' ? 'w' : name === 'silverfarben' && dir === 'sw' ? 'se' : dir;
        expect(JSON.stringify(states[`moving-${dir}`]!.frames)).toContain(`${name}-${alias}-walk-v2.png`);
        expect(states[`moving-${dir}`]!.flipX).toBe(alias !== dir);
      }
    }
  });
  it('keeps original skin size, authored attacks, condition poses and hidden actors untouched', () => {
    const campaign = structuredClone(d8), before = structuredClone(campaign);
    campaign.tokens.rogue!.url = '/art/custom-trinity.png';
    const custom = { frames: ['/art/custom-walk.png'], fps: 5 };
    campaign.tokenAnimations.rogue!['moving-n'] = custom;
    delete campaign.tokens['silverfarben-hotel']; delete campaign.tokenAnimations['silverfarben-hotel'];
    installPlayerLocomotion(campaign);
    expect(campaign.tokenAnimations.rogue!['moving-n']).toBe(custom);
    expect(campaign.tokens['silverfarben-hotel']).toBeUndefined();
    expect(campaign.tokenAnimations['silverfarben-hotel']).toBeUndefined();
    expect(campaign.tokens.rogue!.worldHeightMeters).toBe(before.tokens.rogue!.worldHeightMeters);
    expect(campaign.tokenAnimations.rogue!.attack).toEqual(before.tokenAnimations.rogue!.attack);
    expect(campaign.tokenAnimations.rogue!.poisoned).toEqual(before.tokenAnimations.rogue!.poisoned);
  });
  it('repairs an old server snapshot repeatedly without replacing attacks or reallocating clips', () => {
    const campaign = structuredClone(d8), attack = campaign.tokenAnimations.rogue!.attack;
    campaign.tokenAnimations.rogue = mergeDirectionalArt(campaign.tokenAnimations.rogue!, {
      'moving-n': { frames: ['/art/legacy-walk.png'], fps: 8 }, attack: attack!
    });
    installPlayerLocomotion(campaign);
    const clip = campaign.tokenAnimations.rogue!['moving-n'];
    installPlayerLocomotion(campaign);
    expect(campaign.tokenAnimations.rogue!['moving-n']).toBe(clip);
    expect(campaign.tokenAnimations.rogue!.attack).toBe(attack);
    expect(JSON.stringify(clip)).toContain('trinity-n-walk-v2.png');
  });
  it('retains stride phase through W → W+A, camera changes and sprint speed changes', () => {
    const walk = d8.tokenAnimations.rogue!['moving-n']!, run = d8.tokenAnimations.rogue!['running-ne']!;
    expect(locomotionEpoch('moving-n','moving-nw',100,350,walk,walk)).toBe(100);
    expect(locomotionEpoch('moving-nw','moving-e',100,850,walk,walk)).toBe(600);
    expect(locomotionEpoch('moving-n','running-ne',100,350,walk,run)).toBe(150);
    expect(locomotionEpoch('running-ne','moving-n',150,350,run,walk)).toBe(100);
    for (const state of ['idle-n','sit','camp-sit-n','attack-n','poisoned','defeated']) {
      expect(locomotionEpoch('moving-n',state,100,350,walk,walk)).toBe(350);
      expect(locomotionEpoch(state,'moving-n',100,350,walk,walk)).toBe(350);
    }
    expect(locomotionEpoch(null,'moving-n',100,350,null,walk)).toBe(350);
  });
  it('redirects a generic dash command to the actual moving heading, not the front', () => {
    const renderer = Object.create(WorldRenderer.prototype) as any;
    Object.assign(renderer, { campaign: d8, options: {}, sceneId: 'test', standingActors: new Set(),
      snapshot: { combat: { active: false, participants: [] } }, visualPreview: null,
      cameraOrientationStep: 0, terrainView: null });
    for (const id of ['rogue','silverfarben-hotel']) {
      const view = { entity: { id, tokenId: id, conditions: [], facing: 'north', moving: true,
        cell: { col: 0, row: 0 } }, animationState: 'running', animationUntil: 1000 };
      expect(renderer.activeTokenState(view,100)).toBe('running-n');
      view.entity.facing = 'west'; expect(renderer.activeTokenState(view,100)).toBe('running-w');
      view.animationState = 'attack'; expect(renderer.activeTokenState(view,100)).toBe('attack');
    }
  });
  it('shares identical Trinity PNG bytes, physical scale and crops across campaigns', () => {
    for (const [name, atlas] of Object.entries(playerWalkFrames)) {
      const png = readFileSync(`campaigns/one-shot/public/art/player-walks-v2/${name}.png`);
      expect(png.readUInt32BE(16)).toBe(atlas.size[0]); expect(png.readUInt32BE(20)).toBe(atlas.size[1]);
      for (const frame of atlas.frames) {
        // One per-direction scale; no per-frame stretching to mask movement.
        expect(frame.logicalHeight / frame.height).toBeCloseTo(92 / atlas.referenceHeight,6);
        expect(frame.logicalWidth / frame.width).toBeCloseTo(92 / atlas.referenceHeight,6);
      }
      if (name.startsWith('trinity')) expect(Buffer.compare(readFileSync(`campaigns/stormwreck-isle/public/art/player-walks-v2/${name}.png`),png)).toBe(0);
    }
  });
});
