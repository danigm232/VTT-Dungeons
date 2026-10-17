import { describe, expect, it } from 'vitest';
import { conditionOrder } from '../shared/conditions';
import { conditionSpriteAnimation, conditionSpriteEnabled, conditionSpriteMotion, conditionSpriteSelection, persistentConditionState } from './condition-sprites';
import { oneShotCampaignDefinition } from '../../campaigns/one-shot/public/pack';
import { publicCampaignDefinition as stormwreck } from '../../campaigns/stormwreck-isle/public/pack';

describe('persistent condition sprites', () => {
  it('enables new state poses only for Silverfarben and Trinity; NPCs keep overlays and their existing animations', () => {
    expect(Object.keys(oneShotCampaignDefinition.tokens).filter(tokenId => conditionSpriteEnabled(tokenId))).toEqual(['rogue', 'silverfarben-hotel']);
    expect(conditionSpriteEnabled('anteros')).toBe(false); expect(conditionSpriteEnabled('bartender')).toBe(false);
    expect(conditionSpriteEnabled('new-hero', ['new-hero'])).toBe(true); expect(conditionSpriteEnabled('rogue', [])).toBe(false);
  });
  it('keeps each actor identity and exact atlas crop for all supported states in both adventures', () => {
    for (const campaign of [oneShotCampaignDefinition, stormwreck]) for (const [id, asset] of Object.entries(campaign.tokens)) {
      if (id === 'wreck-rowboat') continue;
      const animations = campaign.tokenAnimations[id] ?? {};
      for (const condition of conditionOrder) {
        const sprite = conditionSpriteAnimation(asset, animations, `condition-${condition === 'apresada' ? 'restringida' : condition}`)!;
        expect(sprite.frames.length, `${id}: ${condition}`).toBeGreaterThan(0);
        for (const frame of sprite.frames) expect(frame === asset.url || Object.values(animations).some(clip => clip.frames.includes(frame)), `${id}: ${condition}`).toBe(true);
      }
    }
  });
  it('uses the existing full-body unconscious/prone PNGs rather than a portrait or upright idle', () => {
    const animations = oneShotCampaignDefinition.tokenAnimations.rogue!;
    expect(conditionSpriteSelection(animations, 'inconsciente').animation!.frames).toEqual(animations.defeated!.frames);
    expect(conditionSpriteSelection(animations, 'derribada').animation!.frames).toEqual(animations.prone!.frames);
    expect(conditionSpriteSelection(animations, 'derribada').groundPose).toBe(true);
  });
  it('holds a reaction pose instead of looping a whole hit, with explicit state art taking precedence', () => {
    const animations = { hit: { frames: ['/art/hit-1.png', '/art/hit-2.png', '/art/hit-3.png'], fps: 10 } };
    expect(conditionSpriteSelection(animations, 'envenenada').animation!.frames).toEqual(['/art/hit-2.png']);
    const authored = { frames: ['/art/poison.png'], fps: 2 };
    expect(conditionSpriteSelection({ ...animations, 'condition-envenenada': authored }, 'envenenada').animation).toBe(authored);
  });
  it('lets poisoned/charmed/frightened actors keep attacks and directional movement but immobilizes held poses', () => {
    for (const condition of ['envenenada', 'hechizada', 'asustada', 'invisible', 'oculta'] as const) {
      expect(persistentConditionState([condition], true, false)).toBeNull();
      expect(persistentConditionState([condition], false, true)).toBeNull();
    }
    expect(persistentConditionState(['restringida'], true, false)).toBe('condition-restringida');
    expect(persistentConditionState(['agarrada'], false, true)).toBeNull();
    expect(persistentConditionState(['paralizada'], true, true)).toBe('condition-paralizada');
    expect(persistentConditionState(['inconsciente', 'paralizada'], true, true)).toBe('condition-inconsciente');
    expect(persistentConditionState(['derribada'], true, false)).toBe('crawl');
    expect(persistentConditionState([], false, false)).toBeNull();
  });
  it('does not tip an authored fallen PNG again and honors reduced motion', () => {
    expect(conditionSpriteMotion('condition-inconsciente', 1200, 92, true).lean).toBe(0);
    expect(conditionSpriteMotion('condition-inconsciente', 1200, 92, false).lean).toBeGreaterThan(1);
    expect(conditionSpriteMotion('condition-asustada', 100, 92, true, true).x).toBe(0);
    expect(conditionSpriteMotion('attack-n', 100, 92)).toEqual({ x: 0, y: 0, lean: 0, scaleX: 1, scaleY: 1, tint: 0xffffff });
  });
});
