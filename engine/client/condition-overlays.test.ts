import { describe, expect, it } from 'vitest';
import { conditionBadgeLayout, drawConditionBadges } from './condition-overlays';
import { conditionDurationLabel, conditionOrder, conditionPresentation, conditionRemainingMs } from '../shared/conditions';
import { Graphics } from 'pixi.js';
describe('minimal condition indicators', () => {
  it('covers every state, including legacy aliases, with a compact overflow count', () => {
    expect(Object.keys(conditionPresentation)).toHaveLength(11);
    expect(conditionBadgeLayout([])).toEqual({ visible: [], extra: 0 });
    expect(conditionBadgeLayout(['apresada', 'restringida']).visible).toEqual(['restringida']);
    const layout = conditionBadgeLayout(conditionOrder); expect(layout.visible).toHaveLength(3); expect(layout.extra).toBe(7);
    expect(layout.visible[0]).toBe('inconsciente');
  });
  it('renders every pictogram and clears obsolete marks without textures', () => {
    const graphics = new Graphics(); for (const condition of conditionOrder) { drawConditionBadges(graphics, [condition], 8, -90); expect(graphics.context.instructions.length).toBeGreaterThan(1); }
    drawConditionBadges(graphics, conditionOrder, 8, -90); expect(graphics.context.instructions.length).toBeGreaterThan(1);
    drawConditionBadges(graphics, [], 8, -90); expect(graphics.context.instructions).toHaveLength(0); graphics.destroy();
  });
  it('shows remaining duration and explicit indefinite/escape semantics', () => {
    expect(conditionDurationLabel({ condition: 'paralizada', remainingMs: 6000, expiryTurn: 'end' })).toBe('1 ronda · final de su turno');
    expect(conditionDurationLabel({ condition: 'envenenada', expiresAt: 72000 }, 1000)).toBe('1 min 11 s');
    expect(conditionDurationLabel({ condition: 'derribada' })).toBe('Sin caducidad automática');
    expect(conditionDurationLabel({ condition: 'restringida', escapeDc: 11 })).toBe('Escapar · CD 11');
    expect(conditionRemainingMs({ condition: 'asustada', durationRounds: 3, appliedAtRound: 2 }, 0, 3)).toBe(12000);
  });
});
