import { describe, expect, it } from 'vitest';
import { formatJumpDistance, jumpDistances, jumpGuidance, jumpSummary, strengthModifier } from './jumping.js';

describe('D&D 2024 jumping distances', () => {
  it('calculates running and standing long/high jumps from Strength', () => {
    expect(jumpDistances(10)).toEqual({ longJumpFeet: 10, standingLongJumpFeet: 5, highJumpFeet: 3, standingHighJumpFeet: 1.5 });
    expect(jumpDistances(8)).toEqual({ longJumpFeet: 8, standingLongJumpFeet: 4, highJumpFeet: 2, standingHighJumpFeet: 1 });
    expect(strengthModifier(7)).toBe(-2);
    expect(jumpDistances(3).highJumpFeet).toBe(0);
  });

  it('formats exact feet and approximate metres for the 1.5 m grid', () => {
    expect(formatJumpDistance(10)).toBe('10 pies (3 m)');
    expect(formatJumpDistance(5)).toBe('5 pies (1,5 m)');
    expect(jumpSummary(10)).toContain('largo 10 pies (3 m) con carrera / 5 pies (1,5 m) en parado');
  });

  it('does not invent a distance when the sheet has no Strength score', () => {
    expect(jumpSummary()).toContain('FUE sin registrar');
    expect(jumpGuidance()).toContain('registrarla antes de calcular distancias');
    expect(jumpGuidance(10)).toContain('Atletismo) CD 10');
    expect(jumpGuidance(10)).toContain('Acrobacias) CD 10');
  });
});
