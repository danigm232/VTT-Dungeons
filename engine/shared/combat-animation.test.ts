import {expect,it} from 'vitest';
import {combatActionVisualState,combatTargetReactionState,combatVisualFallbackState} from './combat-animation';
it('selects bespoke utility spells, but keeps weapon poses independent of magic damage',()=>{
  expect(combatActionVisualState({id:'fog-cloud',magical:true})).toBe('spell-fog');
  expect(combatActionVisualState({id:'feather-fall',magical:true})).toBe('spell-feather');
  expect(combatActionVisualState({id:'bow',magical:true,animationType:'radiantArrow'})).toBe('attack-arrow');
  expect(combatActionVisualState({id:'dagger',animationType:'thrownWeapon'})).toBe('attack-throw');
});
it('selects the receiver reaction by actual impact and preserves existing campaign clips',()=>{
  expect(combatTargetReactionState({damageType:'fuego'})).toBe('hit-fire');
  expect(combatTargetReactionState({damageType:'fuerza'})).toBe('hit-arcane');
  expect(combatTargetReactionState({damageType:'contundente'})).toBe('hit-physical');
  expect(combatVisualFallbackState('help')).toBe('interact');
  expect(combatVisualFallbackState('spell-feather')).toBe('spell');
  expect(combatVisualFallbackState('hit-fire')).toBe('hit');
  expect(combatVisualFallbackState('unknown')).toBeNull();
});
