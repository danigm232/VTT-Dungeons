import type { CombatAction } from '../shared/protocol';

const abilities = { str: 'Fuerza', dex: 'Destreza', con: 'Constitución', int: 'Inteligencia', wis: 'Sabiduría', cha: 'Carisma' };
const signed = (value: number) => `${value >= 0 ? '+' : ''}${value}`;

/** Shared player/DM copy. Placeholder dice on guided effects are never damage. */
export function combatActionDescription(action: CombatAction, armorClass?: number) {
  const cost = action.actionCost === 'reaction' ? 'Reacción' : action.actionCost === 'bonus' ? 'Acción adicional' : 'Acción';
  const range = action.range ? `${action.range.normalMeters}${action.range.longMeters && action.range.longMeters > action.range.normalMeters ? `/${action.range.longMeters}` : ''} m` : 'no indicado';
  const guided = action.resolution === 'guided';
  const conditionOnly = Boolean(action.save?.failureCondition && !action.damageType);
  const damage = guided || conditionOnly ? '' : `Daño ${action.damageDice === '1d1' ? '1' : action.damageDice}${action.damageBonus ? signed(action.damageBonus) : ''}${action.damageType ? ` ${action.damageType}` : ''}`;
  const resolution = guided
    ? action.targeting === 'point' ? 'Área: elige una casilla; el DM resuelve el efecto. No es una tirada de ataque.' : 'Efecto guiado: el DM comprueba el desencadenante y resuelve el efecto. No es una tirada de ataque.'
    : action.save ? `Salvación de ${abilities[action.save.ability]}: el objetivo debe obtener CD ${action.save.dc} o más.${action.save.failureCondition ? ` Si falla: ${action.save.failureCondition}.` : ''}`
    : action.automaticHit || action.resolution === 'automatic-damage' ? 'Impacto automático: no se tira ataque ni se supera CA.'
    : `Ataque: d20 ${signed(action.attackBonus)} contra ${armorClass === undefined ? 'la CA del objetivo' : `CA ${armorClass}`}; impacta con un total igual o mayor.`;
  const bands = action.range?.longMeters && action.range.longMeters > action.range.normalMeters ? ` Alcance normal ${action.range.normalMeters} m; hasta ${action.range.longMeters} m con desventaja.` : '';
  return `${cost} · Alcance ${range}${damage ? ` · ${damage}` : ''}${action.attackCount && action.attackCount > 1 ? ` · ${action.attackCount} ataques/proyectiles` : ''}${action.concentration ? ' · Concentración' : ''}. ${resolution}${bands}${action.guidance ? ` ${action.guidance}` : ''}`;
}

export function combatTurnIndicators(input: { pending: boolean; incapacitated: boolean; isTurn: boolean; remainingSquares?: number; maximumSquares?: number; actionUsed: boolean; bonusActionUsed: boolean; reactionUsed: boolean; hasBonus: boolean }) {
  const blocked = input.pending || input.incapacitated;
  const movement = input.isTurn && !blocked ? `${((input.remainingSquares ?? 0) * 1.5).toFixed(1)} / ${((input.maximumSquares ?? 0) * 1.5).toFixed(1)} m` : input.pending ? 'Pendiente' : input.incapacitated ? '0 m' : 'En espera';
  return [
    { label: 'Movimiento', value: movement, ready: input.isTurn && !blocked && Boolean(input.remainingSquares) },
    { label: 'Acción', value: blocked ? '—' : input.actionUsed ? '0/1' : '1/1', ready: !blocked && input.isTurn && !input.actionUsed },
    { label: 'Adicional', value: blocked || !input.hasBonus ? '—' : input.bonusActionUsed ? '0/1' : '1/1', ready: !blocked && input.isTurn && input.hasBonus && !input.bonusActionUsed },
    { label: 'Reacción', value: blocked ? '—' : input.reactionUsed ? '0/1' : '1/1', ready: !blocked && !input.reactionUsed }
  ];
}
