import type { AttackAnimationType, CombatAction } from './protocol.js';

/** Body pose is independent of damage type: a radiant arrow still uses a bow. */
export function combatActionVisualState(action: Pick<CombatAction, 'id' | 'magical' | 'animationType'>, type: AttackAnimationType = action.animationType ?? (action.magical ? 'magicalProjectile' : 'melee')) {
  if (action.id === 'entangle') return 'entangle';
  if (/(^|-)unarmed($|-)/.test(action.id)) return 'attack-unarmed';
  if (type === 'arrow' || type === 'radiantArrow') return 'attack-arrow';
  if (type === 'thrownWeapon') return 'attack-throw';
  if (action.magical || type === 'fireProjectile' || type === 'magicalProjectile') return 'spell';
  return 'attack';
}
