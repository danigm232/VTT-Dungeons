import { describe, expect, it } from 'vitest';
import { combatActionVisualState } from '../shared/combat-animation.js';
import { combatProjectileTexture, d8CombatProjectileTextures } from './combat-vfx';
import { existsSync } from 'node:fs';
import path from 'node:path';

describe('combat body-animation routing', () => {
  it('uses existing preloaded D8 particle textures, never D8-only assets in Stormwreck', () => {
    for (const type of ['fireProjectile', 'magicalProjectile']) {
      const url = combatProjectileTexture('d8-night-private', type)!;
      expect(Object.values(d8CombatProjectileTextures)).toContain(url);
      expect(existsSync(path.resolve('campaigns/one-shot/public', url.slice(1)))).toBe(true);
      expect(combatProjectileTexture('stormwreck-isle', type)).toBeNull();
    }
    expect(combatProjectileTexture('d8-night-private', 'arrow')).toBeNull();
  });
  it('keeps radiant arrows on the bow and Enredar on the vine pose', () => {
    expect(combatActionVisualState({ id: 'radiant-arrows', magical: true, animationType: 'radiantArrow' })).toBe('attack-arrow');
    expect(combatActionVisualState({ id: 'entangle', magical: true, animationType: 'vine' })).toBe('entangle');
  });
  it('distinguishes bare hands, daggers and thrown weapons without changing damage', () => {
    for (const id of ['unarmed', 'aoife-unarmed', 'villager-unarmed', 'villager-unarmed-bonus']) expect(combatActionVisualState({ id, animationType: 'melee' })).toBe('attack-unarmed');
    expect(combatActionVisualState({ id: 'dagger', animationType: 'melee' })).toBe('attack');
    expect(combatActionVisualState({ id: 'thrown-dagger', animationType: 'thrownWeapon' })).toBe('attack-throw');
    expect(combatActionVisualState({ id: 'fire-bolt', magical: true, animationType: 'fireProjectile' })).toBe('spell');
  });
});
