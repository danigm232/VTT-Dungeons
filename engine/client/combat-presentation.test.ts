import { describe, expect, it } from 'vitest';
import { combatActionDescription, combatTurnIndicators, combatRadialOrigin, compactCombatPrompt } from './combat-presentation';
import type { CombatAction, CombatPrompt } from '../shared/protocol';

const action: CombatAction = { id: 'test', label: 'Test', attackBonus: 4, damageDice: '1d10', damageBonus: 0, damageType: 'fuego', range: { kind: 'ranged', normalMeters: 36 } };
const physicalPrompt: CombatPrompt = { id: 'roll', actorId: 'hero', targetId: 'enemy', title: 'Héroe · Daga', instruction: 'Introduce el d20 natural: el sistema añade +4.', stage: 'attack', advantage: 'normal', minimum: 1, maximum: 20 };
describe('compact physical dice cards', () => {
  it('retains actor and action, and asks for the natural d20', () => {
    const compact = compactCombatPrompt(physicalPrompt);
    expect(compact.title).toBe('Héroe · Daga'); expect(compact.instruction).toContain('sin sumar modificadores'); expect(compact.placeholder).toBe('d20');
    expect(compactCombatPrompt({ ...physicalPrompt, title: 'Héroe · Daga · +4 · 1d4+2 · 6/18 m' }).title).toBe('Héroe · Daga');
  });
  it('never hides the dice formula or advantage needed to roll correctly', () => {
    const instruction = 'Introduce solo los dados (2d6); el modificador se añade automáticamente.';
    expect(compactCombatPrompt({ ...physicalPrompt, stage: 'damage', instruction }).instruction).toBe(instruction);
    const advantage = 'Tira el d20 dos veces y anota el mayor. Introduce solo el resultado natural.';
    expect(compactCombatPrompt({ ...physicalPrompt, advantage: 'advantage', instruction: advantage }).instruction).toBe(advantage);
  });
  it('keeps the ability and DC for saves, checks and escape', () => {
    for (const stage of ['save', 'concentration', 'check', 'escape'] as const) {
      const instruction = 'Tira Destreza CD 15 e introduce el total con modificador.';
      expect(compactCombatPrompt({ ...physicalPrompt, stage, instruction }).instruction).toBe(instruction);
    }
  });
  it('does not lose the reaction trigger or ask for a numeric roll', () => {
    const instruction = 'El oponente sale de tu alcance: ¿gastas tu reacción?';
    expect(compactCombatPrompt({ ...physicalPrompt, stage: 'reaction', instruction })).toMatchObject({ label: 'Reacción', instruction });
  });
});
describe('combat presentation shared by both campaigns', () => {
  it('keeps the radial buttons and two-line labels above the mobile/desktop command bars', () => {
    for (const [top, size] of [[630, 46], [280, 40], [620, 42]]) {
      const point = combatRadialOrigin({ left: 300, width: 80 }, top!, size!);
      expect(point.x).toBe(340); expect(point.y + size! / 2 + 6 + 31).toBeLessThan(top!);
    }
    expect(combatActionDescription({ ...action, damageDice: '1d1', damageBonus: -1 })).toContain('Daño 0');
  });
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
  it('explains remaining multiattack or spell projectiles without implying another resource cost', () => {
    expect(combatActionDescription(action, undefined, 2)).toContain('Quedan 2 ataques/proyectiles');
    expect(combatActionDescription(action, undefined, 2)).toContain('sin gastar otra acción ni otro recurso');
    expect(combatActionDescription(action, undefined, 0)).not.toContain('Quedan');
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
