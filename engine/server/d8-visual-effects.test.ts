import { afterEach, describe, expect, it, vi } from 'vitest';
import { oneShotBundle } from '../../campaigns/one-shot/server.js';
import { GameState } from './game.js';
import { dmCommandSchema, playerCombatSchema } from '../shared/protocol.js';

afterEach(() => vi.useRealTimers());
const game = () => {
  const state = new GameState(oneShotBundle);
  state.claim('a'.repeat(32), 'socket-a', 'aoife');
  state.claim('b'.repeat(32), 'socket-b', 'maria');
  return state;
};
const fog = (state: GameState) => state.declareExplorationAction('aoife', undefined, 'fog-cloud-exploration', state.characters.get('aoife')!.cell);

describe('authoritative D8 visual effects', () => {
  it('keeps the actual fog radius and remaining duration through snapshots and a save/restart', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-04T12:00:00Z'));
    const state = game(); expect(fog(state).ok).toBe(true);
    const effect = state.publicSnapshot(true).visualEffects![0]!;
    expect(effect.type).toBe('fog'); expect(effect.radiusMeters).toBe(6);
    vi.advanceTimersByTime(10_000);
    expect(state.publicSnapshot(true).visualEffects).toEqual([effect]);
    const saved = state.captureDurable(), restored = game(); restored.restoreDurable(saved);
    expect(restored.publicSnapshot(true).visualEffects).toEqual([effect]);
    expect(JSON.stringify(restored.publicSnapshot(true).visualEffects)).not.toMatch(/ownerId|actionId|concentration/);
    expect(restored.publicSnapshot(true, 'cafe').visualEffects).toEqual([]);
    vi.advanceTimersByTime(3_600_000); restored.tick();
    expect(restored.publicSnapshot().visualEffects).toEqual([]); expect(restored.concentration.aoife).toBeUndefined();
  });
  it('removes old concentration effects on recast, incapacitation and voluntary cancellation', () => {
    const state = game(); expect(fog(state).ok).toBe(true); const first = state.publicSnapshot().visualEffects![0]!.id;
    expect(fog(state).ok).toBe(true); expect(state.publicSnapshot().visualEffects).toHaveLength(1);
    expect(state.publicSnapshot().visualEffects![0]!.id).not.toBe(first);
    expect(state.stopConcentration('aoife')).toBe(true); expect(state.publicSnapshot().visualEffects).toEqual([]);
    state.characters.get('aoife')!.combat.resources['spell-slot-1']!.current = 1;
    expect(fog(state).ok).toBe(true);
    state.setCombatCondition('aoife', 'inconsciente', true);
    expect(state.publicSnapshot().visualEffects).toEqual([]);
  });
  it('does not create VFX for invalid actions and saves short cues with their expiry', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-04T12:00:00Z'));
    const state = game();
    expect(state.declareExplorationAction('maria', undefined, 'prestidigitation', state.characters.get('maria')!.cell).ok).toBe(false);
    expect(state.publicSnapshot().visualEffects).toEqual([]);
    expect(state.declareExplorationAction('aoife', undefined, 'prestidigitation', state.characters.get('aoife')!.cell).ok).toBe(true);
    expect(state.publicSnapshot().visualEffects![0]!.type).toBe('spark');
    const saved = state.captureDurable(); vi.advanceTimersByTime(2_000);
    const restored = game(); restored.restoreDurable(saved);
    expect(restored.publicSnapshot().visualEffects).toEqual([]);
  });
  it('attaches feather fall to the selected creature, including off-turn reaction and a save', () => {
    const state = game(); expect(state.startCombat()).toBe(true);
    expect(state.setInitiative(state.combat.participantIds.map(id => ({ id, initiative: id === 'maria' ? 20 : 0 })))).toBe(true);
    expect(state.setInitiativeOrder(state.combat.order, true)).toBe(true);
    expect(state.declareCombatAction('aoife', 'maria', 'feather-fall').ok).toBe(true);
    const cue = state.publicSnapshot().visualEffects!.find(effect => effect.type === 'feather')!;
    expect(cue.entityId).toBe('maria'); expect(cue.expiresAt - cue.startedAt).toBe(60_000);
    const restored = game(); restored.restoreDurable(state.captureDurable());
    restored.claim('a'.repeat(32), 'socket-a', 'aoife'); restored.claim('b'.repeat(32), 'socket-b', 'maria');
    expect(restored.publicSnapshot().visualEffects).toContainEqual(cue);
  });
  it('accepts explicit concentration cancellation without exposing another owner to the player command', () => {
    const command = { type: 'combat:endConcentration', commandId: crypto.randomUUID(), sceneEpoch: 1 };
    expect(playerCombatSchema.safeParse(command).success).toBe(true);
    expect(playerCombatSchema.safeParse({ ...command, entityId: 'maria' }).success).toBe(false);
    expect(dmCommandSchema.safeParse({ ...command, entityId: 'maria' }).success).toBe(true);
  });
  it('rejects contradictory visual metadata before changing the world', () => {
    const state = game(); expect(fog(state).ok).toBe(true);
    const now = Date.now(), before = state.captureDurable(now);
    for (const alter of [
      (saved: typeof before) => { saved.visualEffects![0]!.visual.radiusMeters = 60; },
      (saved: typeof before) => { saved.visualEffects![0]!.visual.type = 'spark'; },
      (saved: typeof before) => { saved.visualEffects![0]!.visual.surfaceId = 'unknown-surface'; },
      (saved: typeof before) => { saved.visualEffects!.push(structuredClone(saved.visualEffects![0]!)); }
    ]) {
      const invalid = structuredClone(before); alter(invalid);
      expect(() => state.restoreDurable(invalid)).toThrow('SAVE_VISUAL_EFFECT');
      expect(state.captureDurable(now)).toEqual(before);
    }
  });
});
