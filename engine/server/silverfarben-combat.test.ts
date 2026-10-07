import { afterEach, describe, expect, it, vi } from 'vitest';
import { Server } from 'socket.io';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { oneShotBundle } from '../../campaigns/one-shot/server.js';
import { GameServer, GameState } from './game.js';
import type { BasicCombatAction, DmCommand } from '../shared/protocol.js';

afterEach(() => vi.useRealTimers());

it('has actual nonempty files for the D8 sound library and each automatic combat sound', () => {
  const sounds = oneShotBundle.public.audio.library!.sfx;
  for (const id of ['d8-night-sfx-bow-release', 'd8-night-sfx-arrow-swish', 'd8-night-sfx-arrow-hit', 'd8-night-sfx-spell-fire', 'd8-night-sfx-spell-arcane', 'd8-night-sfx-magic-spark']) expect(sounds.some(sound => sound.id === id), id).toBe(true);
  for (const sound of sounds) {
    const file = path.resolve('campaigns/one-shot/public', sound.url.slice(1));
    expect(existsSync(file), sound.id).toBe(true); expect(statSync(file).size, sound.id).toBeGreaterThan(44);
  }
});

function prepare(state: GameState, sceneId = 'temple', first = 'aoife') {
  state.changeScene(sceneId);
  state.claim('a'.repeat(32), 'silver-test', 'aoife');
  const enemyId = `anteros-${sceneId}`, enemy = state.npcs.get(enemyId)!;
  state.setNpcVisible(enemyId, true);
  expect(state.startCombat()).toBe(true);
  expect(state.setInitiative(state.combat.participantIds.map(id => ({ id, initiative: id === first ? 20 : 0 })))).toBe(true);
  expect(state.setInitiativeOrder(state.combat.order, true)).toBe(true);
  // Fixture placement only: actual attacks, resources, HP and turns remain authoritative.
  const actor = state.characters.get('aoife')!;
  const cells = state.currentScene().walkable.filter(cell => Math.hypot(cell.col - enemy.cell.col, cell.row - enemy.cell.row) <= 1 && (cell.col !== enemy.cell.col || cell.row !== enemy.cell.row));
  let placed = false;
  for (const cell of cells) {
    actor.cell = { ...cell };
    const attacker = first === 'aoife' ? 'aoife' : enemyId, target = first === 'aoife' ? enemyId : 'aoife';
    if (state.declareCombatAction(attacker, target, first === 'aoife' ? 'aoife-dagger' : 'longsword').ok) {
      expect(state.cancelCombatAction(attacker, state.combat.pending!.id).ok).toBe(true); placed = true; break;
    }
  }
  expect(placed, `Melee fixture in ${sceneId}`).toBe(true);
  return { state, enemyId, actor, enemy };
}

function resolve(state: GameState, attacker: string, target: string, action: string, hit = true, diceTotal?: number) {
  const declared = state.declareCombatAction(attacker, target, action);
  expect(declared.ok, `${action}: ${declared.code}`).toBe(true);
  const role = attacker === 'aoife' ? 'player' : 'dm', character = role === 'player' ? attacker : null;
  if (state.combat.pending!.stage === 'attack') {
    expect(state.submitCombatRoll(role, character, 'attack', state.combat.pending!.id, hit ? 19 : 1).ok).toBe(true);
  }
  if (state.combat.pending?.stage === 'damage') {
    const pending = state.combat.pending;
    const max = /^(\d+)d(\d+)/.exec(state.combatEntity(attacker)!.attacks.find(candidate => candidate.id === action)!.damageDice)!;
    expect(state.submitCombatRoll(role, character, 'damage', pending.id, diceTotal ?? Number(max[1]) * Number(max[2])).ok).toBe(true);
  }
}

describe('Silverfarben versus Anteros: repeated complete fights', () => {
  for (const scene of ['temple', 'dinner']) for (const action of ['aoife-unarmed', 'aoife-shortbow', 'aoife-dagger', 'aoife-thrown-dagger', 'fire-bolt', 'magic-missile']) {
    it(`finishes ${scene} with ${action}, without a pending-roll deadlock`, () => {
      const { state, enemyId, actor, enemy } = prepare(new GameState(oneShotBundle), scene);
      let rounds = 0, usedRequested = false;
      while (state.combat.active && rounds++ < 80) {
        let selected = action;
        if (selected === 'magic-missile' && actor.combat.resources['spell-slot-1']!.current === 0) selected = 'fire-bolt';
        if (selected === 'aoife-thrown-dagger' && rounds > 4) selected = 'fire-bolt';
        resolve(state, 'aoife', enemyId, selected); usedRequested ||= selected === action;
        while (state.combat.active && state.combat.sequences.aoife?.remaining) resolve(state, 'aoife', enemyId, selected);
        expect(state.combat.pending).toBeNull();
        if (!state.combat.active) break;
        expect(state.nextCombatTurn()).toBe(true);
        resolve(state, enemyId, 'aoife', 'longsword', false);
        resolve(state, enemyId, 'aoife', 'longsword', false);
        expect(state.nextCombatTurn()).toBe(true);
      }
      expect(usedRequested).toBe(true); expect(enemy.hp).toBe(0); expect(actor.hp).toBe(7);
      expect(state.combat.active).toBe(false); expect(state.combat.pending).toBeNull();
      expect(state.combat.lastEvent).toMatchObject({ kind: 'defeat', actorId: 'aoife', targetId: enemyId });
      expect(state.combat.lastEvent?.text).toContain('El combate termina');
    });
  }

  for (const action of ['longsword', 'longbow', 'radiant-arrows']) it(`resolves defeat by ${action} through death saves, not a stuck turn`, () => {
    const { state, enemyId, actor } = prepare(new GameState(oneShotBundle), 'temple', 'anteros-temple');
    resolve(state, enemyId, 'aoife', action, true, 8);
    expect(actor.hp).toBe(0); expect(state.combat.active).toBe(true);
    for (let i = 0; i < 3 && state.combat.active; i++) {
      expect(state.nextCombatTurn()).toBe(true);
      expect(state.combat.pending?.stage).toBe('death-save');
      expect(state.submitCombatRoll('player', 'aoife', 'death-save', state.combat.pending!.id, 2).ok).toBe(true);
      if (state.combat.active) expect(state.nextCombatTurn()).toBe(true);
    }
    expect(actor.deathSaves.failures).toBe(3); expect(state.combat.active).toBe(false);
    expect(state.combat.pending).toBeNull();
  });
});

describe('DM dice dispatch and audiovisual completion', () => {
  function fixture() {
    vi.useFakeTimers();
    const io = new Server(), server = new GameServer(io, 'test-dm', oneShotBundle);
    const emit = vi.spyOn(io, 'emit'), sfx = vi.fn(); vi.spyOn(io, 'to').mockReturnValue({ emit: sfx } as never);
    const socket = { emit: vi.fn() }, internal = server as unknown as { handleDm(socket: { emit: (...args: unknown[]) => void }, raw: unknown): void };
    const encounter = prepare(server.state, 'temple', 'anteros-temple');
    const command = (body: Record<string, unknown>) => ({ runtimeEpoch: server.state.runtimeEpoch, sceneEpoch: server.state.sceneEpoch, commandId: crypto.randomUUID(), ...body });
    return { ...encounter, io, server, emit, sfx, socket, dispatch: (body: Record<string, unknown>) => internal.handleDm(socket, command(body)), internal, command };
  }
  for (const actionId of ['longsword', 'longbow', 'radiant-arrows']) it(`plays ${actionId} only after damage, once even on retry`, () => {
    const f = fixture();
    f.dispatch({ type: 'combat:declare', attackerId: f.enemyId, targetId: 'aoife', actionId });
    expect(f.emit.mock.calls.filter(([event]) => event === 'combat:animation')).toHaveLength(0);
    f.dispatch({ type: 'combat:rollAttack', promptId: f.state.combat.pending!.id, d20: 19 });
    expect(f.state.combat.pending?.stage).toBe('damage');
    expect(f.emit.mock.calls.filter(([event]) => event === 'combat:animation')).toHaveLength(0);
    const raw = f.command({ type: 'combat:rollDamage', promptId: f.state.combat.pending!.id, diceTotal: actionId === 'radiant-arrows' ? 2 : 1 });
    f.internal.handleDm(f.socket, raw); f.internal.handleDm(f.socket, raw);
    expect(f.emit.mock.calls.filter(([event]) => event === 'combat:animation')).toHaveLength(1);
    vi.advanceTimersByTime(500);
    const sounds = f.sfx.mock.calls.filter(([event]) => event === 'sfx:play').map(([, payload]) => payload.sfxId);
    if (actionId !== 'longsword') expect(sounds).toContain('d8-night-sfx-bow-release');
    expect(sounds.length).toBeGreaterThan(0);
  });
  it('animates a miss immediately and never requests damage', () => {
    const f = fixture(); f.dispatch({ type: 'combat:declare', attackerId: f.enemyId, targetId: 'aoife', actionId: 'longsword' });
    f.dispatch({ type: 'combat:rollAttack', promptId: f.state.combat.pending!.id, d20: 1 });
    expect(f.state.combat.pending).toBeNull();
    expect(f.emit).toHaveBeenCalledWith('combat:animation', expect.objectContaining({ hit: false }));
  });
  it('keeps the successful combat result instead of flattening it to APPLIED', () => {
    const f = fixture();
    const declared = f.server.applyDmCommand(f.command({ type: 'combat:declare', attackerId: f.enemyId, targetId: 'aoife', actionId: 'longsword' }) as DmCommand);
    expect(declared.ok).toBe(true);
    const rolled = f.server.applyDmCommand(f.command({ type: 'combat:rollAttack', promptId: f.state.combat.pending!.id, d20: 1 }) as DmCommand);
    expect(rolled.code).toBe('ATTACK_MISSED');
  });
  it('animates fixed unarmed damage after the d20, with no impossible d1 prompt', () => {
    const f = fixture(); expect(f.state.nextCombatTurn()).toBe(true);
    f.dispatch({ type: 'combat:declare', attackerId: 'aoife', targetId: f.enemyId, actionId: 'aoife-unarmed' });
    expect(f.emit.mock.calls.filter(([event]) => event === 'combat:animation')).toHaveLength(0);
    f.dispatch({ type: 'combat:rollAttack', promptId: f.state.combat.pending!.id, d20: 19 });
    expect(f.state.combat.pending).toBeNull(); expect(f.enemy.hp).toBe(70);
    expect(f.emit.mock.calls.filter(([event]) => event === 'combat:animation')).toHaveLength(1);
  });
  for (const accept of [false, true]) it(`persists a real terrain-step opportunity and resumes it after DM ${accept ? 'accepts' : 'declines'}`, () => {
    const f = fixture(); expect(f.state.nextCombatTurn()).toBe(true);
    const origin = { ...f.actor.cell };
    let destination: typeof origin | undefined;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const cell = { col: origin.col + dc!, row: origin.row + dr! };
      if (Math.max(Math.abs(cell.col - f.enemy.cell.col), Math.abs(cell.row - f.enemy.cell.row)) <= 1) continue;
      if (f.state.moveEntityOneSquare('aoife', cell) === 'REACTION_PENDING') { destination = cell; break; }
    }
    expect(destination).toBeTruthy(); expect(f.state.combat.pending?.movement?.destinationSurfaceId).toBe(f.actor.surfaceId);
    const durable = f.state.captureDurable(), restored = new GameState(oneShotBundle);
    restored.restoreDurable(durable);
    expect(restored.combat.pending?.movement?.destinationSurfaceId).toBe(f.actor.surfaceId);
    expect(restored.submitCombatReaction('dm', null, restored.combat.pending!.id, false).ok).toBe(true);
    expect(restored.characters.get('aoife')!.cell).toEqual(destination);
    expect(f.state.combatPromptFor('dm')?.instruction).toContain('un único ataque');
    f.dispatch({ type: 'combat:reaction', promptId: f.state.combat.pending!.id, accept });
    if (accept) {
      expect(f.state.combat.pending?.stage).toBe('attack');
      f.dispatch({ type: 'combat:rollAttack', promptId: f.state.combat.pending!.id, d20: 19 });
      f.dispatch({ type: 'combat:rollDamage', promptId: f.state.combat.pending!.id, diceTotal: 1 });
      expect(f.state.combat.reactionUsed[f.enemyId]).toBe(true);
      expect(f.state.combat.sequences[f.enemyId]).toBeUndefined();
      expect(f.actor.hp).toBe(4);
    }
    expect(f.state.combat.pending).toBeNull(); expect(f.actor.cell).toEqual(destination);
    expect(f.state.combat.actionUsed[f.enemyId]).not.toBe(true);
    expect(() => f.state.captureDurable()).not.toThrow();
  });
});

describe('Silverfarben action economy and spell lifecycle', () => {
  for (const leavingPlayer of [false, true]) it(`ends by withdrawal, not defeat, when ${leavingPlayer ? 'Silverfarben' : 'Anteros'} leaves`, () => {
    const { state, actor, enemy, enemyId } = prepare(new GameState(oneShotBundle), 'dinner');
    expect(state.withdrawCombatant(leavingPlayer ? 'aoife' : enemyId).code).toBe('COMBAT_ENDED');
    expect(state.combat.active).toBe(false); expect(state.combat.pending).toBeNull();
    expect(state.combat.lastEvent?.text).toContain('termina por retirada');
    expect(actor.hp).toBe(7); expect(enemy.hp).toBe(71);
    expect(actor.combat.resources['spell-slot-1']!.current).toBe(2);
  });
  for (const accept of [false, true]) it(`resumes the player's oblique-camera diagonal after opportunity ${accept}`, () => {
    const { state, actor, enemyId } = prepare(new GameState(oneShotBundle), 'dinner');
    actor.cell = { col: 8, row: 6 };
    expect(state.startStep(actor, 'south-west')).toBe(true);
    expect(state.combat.pending?.stage).toBe('reaction');
    expect(state.combat.pending?.movement?.destination).toEqual({ col: 7, row: 7 });
    expect(() => state.captureDurable()).not.toThrow();
    expect(state.submitCombatReaction('dm', null, state.combat.pending!.id, accept).ok).toBe(true);
    if (accept) {
      state.submitCombatRoll('dm', null, 'attack', state.combat.pending!.id, 19);
      state.submitCombatRoll('dm', null, 'damage', state.combat.pending!.id, 1);
      expect(state.combat.reactionUsed[enemyId]).toBe(true);
    }
    expect(state.combat.pending).toBeNull();
    expect(actor.cell).toEqual({ col: 7, row: 7 });
    expect(actor.facing).toBe('south-west');
    expect(state.combat.spentSquares.aoife).toBe(1);
  });
  it('keeps a defeated player incapacitated after returning to exploration, and restores actions after healing', () => {
    const { state, actor } = prepare(new GameState(oneShotBundle), 'dinner'); state.endCombat();
    const action = actor.explorationActions[0]!;
    expect(action).toBeTruthy(); const slots = actor.combat.resources['spell-slot-1']!.current;
    state.applyHitPoints('aoife', -actor.hp);
    expect(state.declareExplorationAction('aoife', undefined, action.id).code).toBe('INCAPACITATED');
    expect(actor.combat.resources['spell-slot-1']!.current).toBe(slots);
    const snapshot = state.playerPrivate('a'.repeat(32));
    expect(snapshot.explorationActions).toEqual([]); expect(snapshot.explorationAttacks).toEqual([]);
    expect(snapshot.explorationBasics).toEqual([]); expect(snapshot.availableInteractions).toEqual([]);
    state.applyHitPoints('aoife', 1);
    expect(state.playerPrivate('a'.repeat(32)).explorationActions.length).toBeGreaterThan(0);
  });
  it('does not offer a toast or conversation with defeated Anteros after combat', () => {
    const { state, enemyId, enemy } = prepare(new GameState(oneShotBundle), 'dinner');
    state.endCombat();
    expect(state.stageActorInteractionFor('aoife', enemyId)).not.toBeNull();
    state.applyHitPoints(enemyId, -enemy.hp);
    expect(state.stageActorInteractionFor('aoife', enemyId)).toBeNull();
    expect(state.playerPrivate('a'.repeat(32)).availableInteractions.some(interaction => interaction.targetId === enemyId)).toBe(false);
    state.applyHitPoints(enemyId, 1);
    expect(state.stageActorInteractionFor('aoife', enemyId)).not.toBeNull();
  });
  for (const d20 of [19, 20]) it(`resolves fixed unarmed damage on ${d20} without a damage roll or critical doubling`, () => {
    const { state, enemyId, enemy } = prepare(new GameState(oneShotBundle));
    expect(state.declareCombatAction('aoife', enemyId, 'aoife-unarmed').ok).toBe(true);
    expect(state.submitCombatRoll('player', 'aoife', 'attack', state.combat.pending!.id, d20).code).toBe('ATTACK_RESOLVED');
    expect(state.combat.pending).toBeNull(); expect(enemy.hp).toBe(70);
    expect(state.combat.actionUsed.aoife).toBe(true);
  });
  it('never heals a target when fixed damage has a negative Strength modifier', () => {
    const { state, enemyId, enemy, actor } = prepare(new GameState(oneShotBundle));
    actor.combat.attacks.find(action => action.id === 'aoife-unarmed')!.damageBonus = -2;
    resolve(state, 'aoife', enemyId, 'aoife-unarmed');
    expect(enemy.hp).toBe(71); expect(state.combat.pending).toBeNull();
  });
  const basics: BasicCombatAction[] = ['dash', 'disengage', 'dodge', 'help', 'hide', 'magic', 'ready', 'use-object', 'search', 'study', 'influence'];
  for (const basic of basics) it(`consumes ${basic} on the first click and respects the turn budget`, () => {
    const { state, enemyId } = prepare(new GameState(oneShotBundle));
    expect(state.useBasicCombatAction('aoife', basic, enemyId).ok).toBe(true);
    expect(state.combat.actionUsed.aoife).toBe(true);
    if (state.combat.pending) expect(state.submitCombatRoll('player', 'aoife', 'check', state.combat.pending.id, 15).ok).toBe(true);
    expect(state.useBasicCombatAction('aoife', basic, enemyId).ok).toBe(false);
    expect(state.combat.pending).toBeNull();
  });
  it('cancels a spell before the dice without spending a slot; rejects cancellation after attack', () => {
    const { state, actor, enemyId } = prepare(new GameState(oneShotBundle));
    expect(state.declareCombatAction('aoife', enemyId, 'magic-missile').ok).toBe(true);
    expect(state.cancelCombatAction('aoife', state.combat.pending!.id).ok).toBe(true);
    expect(actor.combat.resources['spell-slot-1']!.current).toBe(2);
    state.declareCombatAction('aoife', enemyId, 'aoife-dagger'); state.submitCombatRoll('player', 'aoife', 'attack', state.combat.pending!.id, 19);
    expect(state.cancelCombatAction('aoife', state.combat.pending!.id).ok).toBe(false);
    expect(state.nextCombatTurn()).toBe(false);
    state.submitCombatRoll('player', 'aoife', 'damage', state.combat.pending!.id, 1); expect(state.nextCombatTurn()).toBe(true);
  });
  for (const save of [9, 10]) it(`resolves concentration CD 10 with ${save} and persists its pending prompt`, () => {
    const { state, actor, enemyId } = prepare(new GameState(oneShotBundle));
    expect(state.declareCombatAction('aoife', undefined, 'fog-cloud', false, actor.cell).ok).toBe(true);
    expect(actor.combat.resources['spell-slot-1']!.current).toBe(1);
    expect(state.nextCombatTurn()).toBe(true);
    state.declareCombatAction(enemyId, 'aoife', 'longsword'); state.submitCombatRoll('dm', null, 'attack', state.combat.pending!.id, 19);
    state.submitCombatRoll('dm', null, 'damage', state.combat.pending!.id, 1);
    expect(state.combat.pending).toMatchObject({ stage: 'concentration', concentrationDc: 10 });
    const restored = new GameState(oneShotBundle); restored.restoreDurable(state.captureDurable());
    expect(restored.combat.pending?.id).toBe(state.combat.pending!.id);
    expect(state.submitCombatRoll('player', 'aoife', 'concentration', state.combat.pending!.id, save).ok).toBe(true);
    expect(Boolean(state.dmState().combat.concentration.aoife)).toBe(save >= 10);
    expect(state.combat.pending).toBeNull();
  });
  it('allows a slotted reaction on the enemy turn, not a second slot on the same turn', () => {
    const { state, actor, enemyId } = prepare(new GameState(oneShotBundle));
    expect(state.declareCombatAction('aoife', undefined, 'fog-cloud', false, actor.cell).ok).toBe(true);
    expect(state.declareCombatAction('aoife', 'aoife', 'feather-fall').code).toBe('SPELL_SLOT_USED_THIS_TURN');
    expect(state.nextCombatTurn()).toBe(true);
    expect(state.declareCombatAction('aoife', 'aoife', 'feather-fall').code).toBe('GUIDED_RESOLUTION');
    expect(state.combat.reactionUsed.aoife).toBe(true);
    expect(actor.combat.resources['spell-slot-1']!.current).toBe(0);
    expect(state.declareCombatAction('aoife', 'aoife', 'feather-fall').ok).toBe(false);
    expect(state.publicSnapshot().visualEffects?.map(effect => effect.type)).toEqual(expect.arrayContaining(['fog', 'feather']));
    resolve(state, enemyId, 'aoife', 'longsword', false);
    expect(state.nextCombatTurn()).toBe(true); expect(state.combat.reactionUsed.aoife).toBe(false);
  });
  it('spends only one slot across all three missile damage prompts and exhausts thrown daggers', () => {
    const { state, actor, enemyId } = prepare(new GameState(oneShotBundle));
    for (let dart = 0; dart < 3; dart++) {
      resolve(state, 'aoife', enemyId, 'magic-missile');
      expect(actor.combat.resources['spell-slot-1']!.current).toBe(1);
    }
    expect(state.combat.sequences.aoife).toBeUndefined();
    expect(state.declareCombatAction('aoife', enemyId, 'magic-missile').ok).toBe(false);
    for (let dagger = 0; dagger < 4; dagger++) {
      state.nextCombatTurn(); state.nextCombatTurn(); resolve(state, 'aoife', enemyId, 'aoife-thrown-dagger');
    }
    state.nextCombatTurn(); state.nextCombatTurn();
    expect(state.declareCombatAction('aoife', enemyId, 'aoife-thrown-dagger').code).toBe('RESOURCE_DEPLETED');
  });
  it('honors radiant-arrow recharge once per turn and restores its locked target', () => {
    const { state, enemyId } = prepare(new GameState(oneShotBundle), 'temple', 'anteros-temple');
    for (let arrow = 0; arrow < 6; arrow++) resolve(state, enemyId, 'aoife', 'radiant-arrows', false);
    expect(state.combat.recharge[enemyId]!['radiant-arrows']).toBe(false);
    state.nextCombatTurn(); state.nextCombatTurn();
    expect(state.declareCombatAction(enemyId, 'aoife', 'radiant-arrows').code).toBe('RECHARGE_REQUIRED');
    expect(state.rechargeCombatAction(enemyId, 'radiant-arrows', 5)).toBe(true);
    expect(state.rechargeCombatAction(enemyId, 'radiant-arrows', 6)).toBe(false);
    state.nextCombatTurn(); state.nextCombatTurn();
    expect(state.rechargeCombatAction(enemyId, 'radiant-arrows', 6)).toBe(true);
    resolve(state, enemyId, 'aoife', 'radiant-arrows', false);
    const restored = new GameState(oneShotBundle); restored.restoreDurable(state.captureDurable());
    expect(restored.combat.sequences[enemyId]).toMatchObject({ remaining: 5, targetId: 'aoife' });
  });
  it('rejects impossible dice without losing the pending action and preserves the damage prompt on restore', () => {
    const { state, enemyId } = prepare(new GameState(oneShotBundle));
    state.declareCombatAction('aoife', enemyId, 'aoife-dagger'); const id = state.combat.pending!.id;
    expect(state.submitCombatRoll('player', 'aoife', 'attack', id, 21).ok).toBe(false);
    expect(state.combat.pending!.id).toBe(id);
    state.submitCombatRoll('player', 'aoife', 'attack', id, 20);
    expect(state.combat.pending?.critical).toBe(true);
    const damageId = state.combat.pending!.id;
    expect(state.submitCombatRoll('player', 'aoife', 'damage', damageId, 9).ok).toBe(false);
    const restored = new GameState(oneShotBundle); restored.restoreDurable(state.captureDurable());
    expect(restored.combat.pending).toMatchObject({ id: damageId, stage: 'damage', critical: true });
    expect(restored.submitCombatRoll('dm', null, 'damage', damageId, 8).ok).toBe(true);
  });
});

describe('guided combat effects and sounds', () => {
  for (const actionId of ['fog-cloud', 'feather-fall', 'light-torch']) it(`emits ${actionId} once, including a retry and entity targeting`, () => {
    const io = new Server(), server = new GameServer(io, 'test-dm', oneShotBundle), emit = vi.fn();
    vi.spyOn(io, 'to').mockReturnValue({ emit } as never);
    const { state, actor } = prepare(server.state);
    const socket = { emit: vi.fn() }, internal = server as unknown as { handleDm(socket: { emit: (...args: unknown[]) => void }, raw: unknown): void };
    const raw = { type: 'combat:declare', commandId: crypto.randomUUID(), runtimeEpoch: state.runtimeEpoch, sceneEpoch: state.sceneEpoch, attackerId: 'aoife', actionId,
      ...(actionId === 'feather-fall' ? { targetId: 'aoife' } : { targetCell: actor.cell }) };
    internal.handleDm(socket, raw); internal.handleDm(socket, raw);
    expect(emit.mock.calls.filter(([event]) => event === 'sfx:play')).toHaveLength(1);
    expect(state.publicSnapshot().visualEffects).toHaveLength(1);
    expect(state.combat.pending).toBeNull();
  });
});
