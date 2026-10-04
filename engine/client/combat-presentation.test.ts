import { describe, expect, it } from 'vitest';
import { combatActionDescription, combatTurnIndicators } from './combat-presentation';
import type { CombatAction } from '../shared/protocol';

const action: CombatAction = { id: 'test', label: 'Test', attackBonus: 4, damageDice: '1d10', damageBonus: 0, damageType: 'fuego', range: { kind: 'ranged', normalMeters: 36 } };
describe('combat presentation shared by both campaigns', () => {
  it('does not invent attack or damage for guided spells', () => {
    const copy = combatActionDescription({ ...action, resolution: 'guided', targeting: 'point', damageDice: '1d1', damageType: undefined, concentration: true });
    expect(copy).not.toMatch(/Daño|1d1|d20 \+4/); expect(copy).toContain('Concentración'); expect(copy).toContain('elige una casilla');
  });
  it('separates attack against AC from saves against DC', () => {
    expect(combatActionDescription(action, 16)).toContain('d20 +4 contra CA 16');
    const save = combatActionDescription({ ...action, save: { ability: 'dex', dc: 12 } }, 16);
    expect(save).toContain('Destreza'); expect(save).toContain('CD 12'); expect(save).not.toContain('CA 16');
  });
  it('shows automatic-hit damage and sequences rather than an attack bonus', () => {
    const copy = combatActionDescription({ ...action, automaticHit: true, damageDice: '1d4', damageBonus: 1, attackCount: 3 });
    expect(copy).toContain('Daño 1d4+1'); expect(copy).toContain('3 ataques/proyectiles'); expect(copy).toContain('Impacto automático'); expect(copy).not.toContain('d20');
  });
  it('shows condition-only saves without placeholder damage', () => {
    expect(combatActionDescription({ ...action, damageType: undefined, damageDice: '1d1', save: { ability: 'dex', dc: 11, failureCondition: 'restringida' } })).not.toContain('Daño');
  });
  it('does not hide a real fixed-damage weapon or its long range', () => {
    expect(combatActionDescription({ ...action, damageDice: '1d1', range: { kind: 'ranged', normalMeters: 24, longMeters: 96 } })).toContain('Daño 1');
    expect(combatActionDescription({ ...action, range: { kind: 'ranged', normalMeters: 24, longMeters: 96 } })).toContain('96 m con desventaja');
  });
  const turn = { pending: false, incapacitated: false, isTurn: true, remainingSquares: 3, maximumSquares: 6, actionUsed: false, bonusActionUsed: false, reactionUsed: false, hasBonus: true };
  it('shows movement and each distinct turn resource', () => {
    expect(combatTurnIndicators(turn).map(item => item.value)).toEqual(['4.5 / 9.0 m', '1/1', '1/1', '1/1']);
    expect(combatTurnIndicators({ ...turn, actionUsed: true })[1]!.ready).toBe(false);
    expect(combatTurnIndicators({ ...turn, hasBonus: false })[2]!.value).toBe('—');
  });
  it('keeps reactions available outside own turn, not during initiative or incapacitation', () => {
    expect(combatTurnIndicators({ ...turn, isTurn: false })[3]!.ready).toBe(true);
    for (const input of [{ ...turn, pending: true }, { ...turn, incapacitated: true }]) expect(combatTurnIndicators(input).every(item => !item.ready)).toBe(true);
  });
});
