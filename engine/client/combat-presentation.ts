import type { CombatAction, CombatPrompt } from '../shared/protocol';

/** The required roll stays explicit; rules and arithmetic belong in Details. */
export function compactCombatPrompt(prompt: CombatPrompt) {
  const instruction = prompt.stage === 'attack' || prompt.stage === 'death-save'
    ? 'Introduce el d20 natural, sin sumar modificadores.'
    : prompt.stage === 'damage' ? 'Introduce la suma de los dados, sin modificadores.'
    : prompt.stage === 'reaction' ? prompt.instruction
    : prompt.stage === 'check' || prompt.stage === 'escape' ? 'Introduce el total de la prueba, con modificadores.' : 'Introduce el total de tu salvación, con modificadores.';
  // Dice formula and ability/DC are essential, not optional explanatory text.
  const essential = prompt.stage === 'damage' || prompt.stage === 'save' || prompt.stage === 'concentration' || prompt.stage === 'check' || prompt.stage === 'escape';
  return {
    title: prompt.title.split(' · ').slice(0, 2).join(' · '),
    instruction: essential || /ventaja|dos d20|2d20|menor|mayor|crítico/i.test(prompt.instruction) ? prompt.instruction : instruction,
    placeholder: prompt.stage === 'attack' || prompt.stage === 'death-save' ? 'd20' : prompt.stage === 'damage' ? 'Dados' : 'Total',
    label: prompt.stage === 'damage' ? 'Daño' : prompt.stage === 'reaction' ? 'Reacción' : 'Tirada',
  };
}

/** Keep the fan and its labels above the command/resource bars, not behind them. */
export function combatRadialOrigin(anchor: { left: number; width: number }, occupiedTop: number, nodeSize: number) {
  return { x: anchor.left + anchor.width / 2, y: Math.max(nodeSize / 2 + 44, occupiedTop - nodeSize / 2 - 50) };
}

const abilities = { str: 'Fuerza', dex: 'Destreza', con: 'Constitución', int: 'Inteligencia', wis: 'Sabiduría', cha: 'Carisma' };
const signed = (value: number) => `${value >= 0 ? '+' : ''}${value}`;

/** Shared player/DM copy. Placeholder dice on guided effects are never damage. */
export function combatActionDescription(action: CombatAction, armorClass?: number, remaining?: number) {
  const cost = action.actionCost === 'reaction' ? 'Reacción' : action.actionCost === 'bonus' ? 'Acción adicional' : 'Acción';
  const range = action.range ? `${action.range.normalMeters}${action.range.longMeters && action.range.longMeters > action.range.normalMeters ? `/${action.range.longMeters}` : ''} m` : 'no indicado';
  const guided = action.resolution === 'guided';
  const conditionOnly = Boolean(action.save?.failureCondition && !action.damageType);
  const damageAmount = action.damageDice === '1d1' ? String(Math.max(0, 1 + (action.damageBonus ?? 0))) : `${action.damageDice}${action.damageBonus ? signed(action.damageBonus) : ''}`;
  const damage = guided || conditionOnly ? '' : `Daño ${damageAmount}${action.damageType ? ` ${action.damageType}` : ''}`;
  const resolution = guided
    ? action.targeting === 'point' ? 'Área: elige una casilla; el DM resuelve el efecto. No es una tirada de ataque.' : 'Efecto guiado: el DM comprueba el desencadenante y resuelve el efecto. No es una tirada de ataque.'
    : action.save ? `Salvación de ${abilities[action.save.ability]}: el objetivo debe obtener CD ${action.save.dc} o más.${action.save.failureCondition ? ` Si falla: ${action.save.failureCondition}.` : ''}`
    : action.automaticHit || action.resolution === 'automatic-damage' ? 'Impacto automático: no se tira ataque ni se supera CA.'
    : `Ataque: d20 ${signed(action.attackBonus)} contra ${armorClass === undefined || armorClass <= 0 ? 'la CA del objetivo' : `CA ${armorClass}`}; impacta con un total igual o mayor.`;
  const bands = action.range?.longMeters && action.range.longMeters > action.range.normalMeters ? ` Alcance normal ${action.range.normalMeters} m; hasta ${action.range.longMeters} m con desventaja.` : '';
  const sequence = remaining && remaining > 0 ? ` Quedan ${remaining} ataques/proyectiles de esta misma acción: continúa sin gastar otra acción ni otro recurso.` : '';
  return `${cost} · Alcance ${range}${damage ? ` · ${damage}` : ''}${action.attackCount && action.attackCount > 1 ? ` · ${action.attackCount} ataques/proyectiles` : ''}${action.concentration ? ' · Concentración' : ''}. ${resolution}${bands}${action.guidance ? ` ${action.guidance}` : ''}${sequence}`;
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
