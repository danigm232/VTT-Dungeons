import { describe, expect, it } from 'vitest';
import { combatTimeline, combatWheelTurnKey } from './combat-timeline';
import type { CombatParticipant } from '../shared/protocol';
const actor = (id: string, active = true) => ({ id, active }) as CombatParticipant;
describe('seven-position combat preview', () => {
  it('shows the current actor, three next actors and later turns across rounds', () => {
    const actors = ['a', 'b', 'c', 'd'].map(id => actor(id));
    const turns = combatTimeline(actors, actors, 'c', 2);
    expect(turns.map(turn => turn.participant.id)).toEqual(['c', 'd', 'a', 'b', 'c', 'd', 'a']);
    expect(turns.map(turn => turn.round)).toEqual([2, 2, 3, 3, 3, 3, 4]);
    expect(turns.map(turn => turn.horizon)).toEqual(['current', 'next', 'next', 'next', 'later', 'later', 'later']);
  });
  it('preserves DM ties, skips defeated actors and caps any requested limit at seven', () => {
    const actors = [actor('b'), actor('dead', false), actor('a')];
    expect(combatTimeline(actors, actors, 'b', 1, 20).map(turn => turn.participant.id)).toEqual(['b', 'a', 'b', 'a', 'b', 'a', 'b']);
    expect(combatTimeline(actors, actors, null, 0)).toEqual([]);
    expect(combatTimeline([], actors, 'b', 1)).toEqual([]);
  });
  it('opens the wheel only for a ready own turn and supplies a stable latch key', () => {
    const input = { active: true, pending: false, isTurn: true, blocked: false, runtimeEpoch: 'r', sceneEpoch: 2, round: 1, actorId: 'a' };
    expect(combatWheelTurnKey(input)).toBe('r:2:1:a');
    for (const change of [{ active: false }, { pending: true }, { isTurn: false }, { blocked: true }]) expect(combatWheelTurnKey({ ...input, ...change })).toBeNull();
    expect(combatWheelTurnKey({ ...input, round: 2 })).not.toBe(combatWheelTurnKey(input));
  });
});
