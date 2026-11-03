import type { AttackAnimationType, CombatAction } from './protocol.js';
import type { PublicCampaignDefinition } from './campaign.js';

/** Body pose is independent of damage type: a radiant arrow still uses a bow. */
export function combatActionVisualState(action: Pick<CombatAction, 'id' | 'magical' | 'animationType'>, type: AttackAnimationType = action.animationType ?? (action.magical ? 'magicalProjectile' : 'melee')) {
  if (/(^|-)light-torch$|(^|-)encender-antorcha$/.test(action.id)) return 'use-torch';
  if (action.id === 'entangle') return 'entangle';
  if (action.id === 'fog-cloud') return 'spell-fog';
  if (action.id === 'feather-fall') return 'spell-feather';
  if (/(^|-)unarmed($|-)/.test(action.id)) return 'attack-unarmed';
  if (type === 'arrow' || type === 'radiantArrow') return 'attack-arrow';
  if (type === 'thrownWeapon') return 'attack-throw';
  if (action.magical || type === 'fireProjectile' || type === 'magicalProjectile') return 'spell';
  return 'attack';
}

/** Semantic clips keep older campaigns working while D8 supplies bespoke art. */
export function combatVisualFallbackState(state:string):string|null {
  if(state==='use-torch')return 'interact';
  if(state==='help'||state==='influence')return 'interact';
  if(state==='spell-fog'||state==='spell-feather')return 'spell';
  if(state==='hit-physical'||state==='hit-fire'||state==='hit-arcane')return 'hit';
  return null;
}
export function installCombatVisualFallbacks(campaign:PublicCampaignDefinition){
  for(const states of Object.values(campaign.tokenAnimations))for(const state of ['help','influence','spell-fog','spell-feather','hit-physical','hit-fire','hit-arcane','use-torch']){
    const fallback=combatVisualFallbackState(state);
    if(fallback&&states[fallback])states[state]??=states[fallback]!;
  }
}
export function combatTargetReactionState(action:Pick<CombatAction,'damageType'|'magical'|'animationType'>){
  return action.damageType==='fuego'||action.animationType==='fireProjectile' ? 'hit-fire'
    : action.damageType==='fuerza'||action.animationType==='magicalProjectile' ? 'hit-arcane' : 'hit-physical';
}
