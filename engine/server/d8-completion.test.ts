import { describe, expect, it } from 'vitest';
import { oneShotBundle } from '../../campaigns/one-shot/server.js';
import { adventureView, choiceFlag, endingFlag } from '../shared/adventure.js';
import { segmentCrossesBox } from '../shared/geometry.js';
import { GameState } from './game.js';

const token = 'a'.repeat(32), secondToken = 'b'.repeat(32);
const game = () => { const state = new GameState(oneShotBundle); state.claim(token, 'socket-maria', 'maria'); return state; };
const start = (state: GameState, first = 'maria') => {
  expect(state.startCombat()).toBe(true);
  expect(state.setInitiative(state.combat.participantIds.map(id => ({ id, initiative: id === first ? 20 : 0 })))).toBe(true);
  expect(state.setInitiativeOrder(state.combat.order, true)).toBe(true);
};

describe('D8 adventure closure', () => {
  for (const endingId of ['ending1', 'ending2', 'ending3']) it(`plays the four objectives, six scenes and ${endingId}, then restores the exact world`, () => {
    const state = game();
    state.claim(secondToken, 'socket-aoife', 'aoife');
    const definition = state.campaign.adventure!;
    for (const goal of definition.objectives) {
      expect(state.changeScene(goal.sceneId)).toBe(true);
      const choice = goal.choices.find(choice => choice.endingId === endingId)!;
      expect(state.resolveAdventureChoice(goal.id, choice.id, 'Decisión presencial del DM')).toBe('APPLIED');
      expect(state.changeScene('temple')).toBe(true);
    }
    expect(state.changeScene('dinner')).toBe(true);
    expect(state.resolveAdventureEnding(endingId, 'Mayor puntuación')).toBe('APPLIED');
    const view = state.dmState().adventure!;
    expect(view.inventory).toHaveLength(4);
    expect(view.endings.find(ending => ending.id === endingId)?.score).toBe(4);
    expect(view.endings.filter(ending => ending.selected).map(ending => ending.id)).toEqual([endingId]);
    expect(JSON.stringify(state.playerPrivate(token))).not.toContain('Decisión presencial');
    expect(JSON.stringify(state.publicSnapshot(true))).not.toContain('Mayor puntuación');
    const now = Date.now(), saved = state.captureDurable(now);
    const restored = game(); restored.restoreDurable(saved, now);
    expect(restored.captureDurable(now)).toEqual(saved);
    expect(restored.dmState().adventure).toEqual(view);
  });

  it('changes a decision rather than duplicating its points, and clears an obsolete ending', () => {
    const state = game();
    for (const goal of state.campaign.adventure!.objectives) expect(state.resolveAdventureChoice(goal.id, goal.choices[0]!.id, '')).toBe('APPLIED');
    expect(state.resolveAdventureEnding('ending1', '')).toBe('APPLIED');
    expect(state.resolveAdventureChoice('rose', 'protect', 'Cambió el desenlace')).toBe('APPLIED');
    expect(state.resolveAdventureChoice('rose', 'protect', 'Cambió el desenlace')).toBe('APPLIED');
    expect(state.dmState().adventure!.endings.map(ending => ending.score)).toEqual([3, 1, 0]);
    expect(state.dmState().adventure!.endings.some(ending => ending.selected)).toBe(false);
  });

  it('requires mirror prerequisites, documents shortcuts and gives the DM a tie decision', () => {
    const state = game();
    expect(state.resolveAdventureChoice('mirror', 'peace', '')).toBe('STORY_PREREQUISITES');
    expect(state.resolveAdventureChoice('mirror', 'peace', '', true)).toBe('STORY_PREREQUISITES');
    expect(state.resolveAdventureChoice('mirror', 'peace', 'Atajo acordado en mesa', true)).toBe('APPLIED');
    state.resolveAdventureChoice('rose', 'peace', ''); state.resolveAdventureChoice('wine', 'one', ''); state.resolveAdventureChoice('steak', 'buy', '');
    expect(state.dmState().adventure!.candidates).toEqual(['ending1', 'ending2']);
    expect(state.resolveAdventureEnding('ending1', '')).toBe('STORY_TIE_REASON');
    expect(state.resolveAdventureEnding('ending2', 'Empate: el DM elige aceptación')).toBe('APPLIED');
    expect(state.resolveAdventureEnding('ending3', '')).toBe('STORY_PREREQUISITES');
    expect(state.resolveAdventureEnding('ending3', 'Rechazó la misión y sobrevivió tres rondas', true)).toBe('APPLIED');
    expect(state.dmState().adventure!.endings.filter(ending => ending.selected)).toHaveLength(1);
  });

  it('recovers legacy objectives without inventing their outcomes or scores', () => {
    const state = game(), saved = state.captureDurable(); saved.progress = { wine: true, rose: true }; delete saved.storyNotes;
    const restored = game(); restored.restoreDurable(saved);
    expect(restored.dmState().adventure!.inventory).toHaveLength(2);
    expect(restored.dmState().adventure!.endings.map(ending => ending.score)).toEqual([0, 0, 0]);
  });

  it('rejects contradictory story saves atomically', () => {
    const state = game(), now = Date.now(), before = state.captureDurable(now), invalid = structuredClone(before);
    invalid.progress = { [choiceFlag('rose', 'peace')]: true, [choiceFlag('rose', 'attack')]: true };
    expect(() => state.restoreDurable(invalid, now)).toThrow('SAVE_STORY_CHOICES'); expect(state.captureDurable(now)).toEqual(before);
    invalid.progress = { [endingFlag('ending1')]: true, [endingFlag('ending2')]: true };
    expect(() => state.restoreDurable(invalid, now)).toThrow('SAVE_STORY_ENDINGS'); expect(state.captureDurable(now)).toEqual(before);
  });

  it('the scoring evaluator also works with unrelated campaign names', () => {
    const view = adventureView({ objectives: [{ id: 'key', sceneId: 'hall', label: 'Find key', item: 'Copper key', requires: [], choices: [{ id: 'trade', label: 'Trade', endingId: 'mercy' }] }], endings: [{ id: 'mercy', label: 'Mercy' }] }, { [choiceFlag('key', 'trade')]: true }, {});
    expect(view.complete).toBe(true); expect(view.endings[0]!.score).toBe(1);
  });
});

describe('D8 creature and rules closure', () => {
  for (const sourceId of ['maria', 'aoife']) it(`reveals ${sourceId}'s shape before combat, preserves independent injuries and resources`, () => {
    const state = game(); state.changeScene('mirror'); state.prepareMirrorEncounter(sourceId);
    const source = state.characters.get(sourceId)!, reflection = state.creature!;
    expect(reflection.tokenId).toBe(source.tokenId); expect(reflection.maxHp).toBe(Math.floor(source.maxHp * .75));
    reflection.hp = 1; state.setCombatCondition(reflection.id, 'envenenada', true);
    source.hp = 2; state.setCombatCondition(sourceId, 'derribada', true);
    if (sourceId === 'aoife') reflection.resources['spell-slot-1']!.current = 1;
    state.prepareMirrorEncounter(sourceId === 'maria' ? 'aoife' : 'maria');
    expect(reflection.hp).toBe(1); expect(reflection.mimicOfPlayerId).toBe(sourceId);
    expect(state.conditions[reflection.id]).toEqual(['envenenada']);
    const now = Date.now(), saved = state.captureDurable(now), restored = game(); restored.restoreDurable(saved, now);
    restored.prepareMirrorEncounter(); expect(restored.captureDurable(now)).toEqual(saved);
    expect(restored.creature!.resources).not.toBe(restored.characters.get(sourceId)!.combat.resources);
  });

  it('places the reflection after its original even with a second player and a high reflected initiative', () => {
    const state = game(); state.claim(secondToken, 'socket-aoife', 'aoife'); state.changeScene('mirror'); state.prepareMirrorEncounter('aoife'); state.creature!.visible = true;
    expect(state.startCombat()).toBe(true);
    expect(state.setInitiative([{ id: 'maria', initiative: 20 }, { id: 'aoife', initiative: 10 }, { id: 'reflection', initiative: 30 }])).toBe(true);
    expect(state.combat.order).toEqual(['maria', 'aoife', 'reflection']);
    expect(state.setInitiativeOrder(state.combat.order, true)).toBe(true);
    state.useBasicCombatAction('maria', 'dash'); state.nextCombatTurn();
    state.useBasicCombatAction('aoife', 'dodge'); state.nextCombatTurn();
    expect(state.dmState().mimicInstruction?.actionId).toBe('dodge');
    expect(state.useBasicCombatAction('reflection', 'dash').code).toBe('MIMIC_ACTION_MISMATCH');
    expect(state.declareCombatAction('reflection', 'maria', 'fire-bolt').code).toBe('MIMIC_ACTION_MISMATCH');
    expect(state.useBasicCombatAction('reflection', 'dodge').ok).toBe(true);
    const restored = game(); restored.restoreDurable(state.captureDurable());
    expect(restored.dmState().mimicInstruction).toEqual(state.dmState().mimicInstruction);
  });

  it('supports zero to six roses without healing them or corrupting older saves', () => {
    const state = game(), old = state.captureDurable(); old.npcs = old.npcs!.filter(npc => !/^rose-garden-[3-6]$/.test(npc.id));
    const restored = game(); restored.restoreDurable(old); restored.changeScene('garden');
    expect(restored.revealEncounterGroup('roses', 6)).toBe(true);
    expect(restored.dmState().encounterGroups?.[0]?.visibleCount).toBe(6);
    restored.npcs.get('rose-garden-1')!.hp = 3;
    expect(restored.revealEncounterGroup('roses', 0)).toBe(true); expect(restored.revealEncounterGroup('roses', 1)).toBe(true);
    expect(restored.npcs.get('rose-garden-1')!.hp).toBe(3);
    const final = game(); final.restoreDurable(restored.captureDurable()); expect(final.npcs.get('rose-garden-1')!.hp).toBe(3);
  });

  it('recharge failure permits only one physical die per turn, including after save/restore', () => {
    const state = game(); start(state, 'anteros-temple');
    state.combat.recharge['anteros-temple']!['radiant-arrows'] = false;
    expect(state.rechargeCombatAction('anteros-temple', 'radiant-arrows', 1)).toBe(true);
    expect(state.rechargeCombatAction('anteros-temple', 'radiant-arrows', 6)).toBe(false);
    const restored = game(); restored.restoreDurable(state.captureDurable());
    expect(restored.rechargeCombatAction('anteros-temple', 'radiant-arrows', 6)).toBe(false);
    expect(restored.nextCombatTurn()).toBe(true); expect(restored.nextCombatTurn()).toBe(true);
    expect(restored.rechargeCombatAction('anteros-temple', 'radiant-arrows', 6)).toBe(true);
  });

  it('reveals up to ten hostile patrons without turning conversation NPCs into combatants', () => {
    const state = game(); state.changeScene('cafe');
    expect(state.revealEncounterGroup('patrons', 10)).toBe(true);
    expect(state.startCombat()).toBe(true);
    expect(state.combat.participantIds.filter(id => id.startsWith('brawler-cafe-'))).toHaveLength(10);
    expect(state.combat.participantIds).not.toContain('woman-cafe');
    expect(state.combat.participantIds).not.toContain('bartender-cafe');
    const restored = game(); restored.restoreDurable(state.captureDurable());
    expect(restored.combat.participantIds).toEqual(state.combat.participantIds);
  });

  it('re-registering an identical outcome preserves the selected ending', () => {
    const state = game();
    for (const goal of state.campaign.adventure!.objectives) state.resolveAdventureChoice(goal.id, goal.choices[0]!.id, '');
    state.resolveAdventureEnding('ending1', '');
    state.resolveAdventureChoice('rose', 'peace', '');
    expect(state.dmState().adventure!.endings.find(ending => ending.id === 'ending1')!.selected).toBe(true);
  });

  it('does not expose enemy AC in snapshots or an attack prompt', () => {
    const state = game();
    // Privacy is tested from a legal unobstructed attack position, not through
    // the temple's newly authoritative walls from the distant entry bridge.
    const target = state.npcs.get('anteros-temple')!;
    state.characters.get('maria')!.cell = { col: target.cell.col, row: target.cell.row + 1 };
    start(state);
    expect(state.declareCombatAction('maria', 'anteros-temple', 'shortbow').ok).toBe(true);
    expect(state.combatPromptFor('player', 'maria')!.instruction).not.toMatch(/CA \d/);
    expect(state.combatPromptFor('dm')!.instruction).toContain('CA 16');
    expect(state.publicSnapshot(true).combat.participants.find(actor => actor.id === 'anteros-temple')!.armorClass).toBe(0);
  });

  it('uses physical wall geometry, not water or furniture masks, to reject blocked attacks before spending', () => {
    const bundle = structuredClone(oneShotBundle), scene = bundle.public.scenes.find(scene => scene.id === 'temple')!;
    const target = scene.stageActors!.find(actor => actor.id === 'anteros-temple')!.cell, from = scene.spawns[0]!;
    const middle = { col: (target.col + from.col) / 2 + .5, row: (target.row + from.row) / 2 + .5 };
    scene.effectWalls = [{ minCol: middle.col - .1, maxCol: middle.col + .1, minRow: middle.row - .1, maxRow: middle.row + .1 }];
    const state = new GameState(bundle); state.claim(token, 'socket-maria', 'maria');
    expect(state.startCombatFromAttack('maria', 'anteros-temple', 'shortbow').code).toBe('LINE_OF_EFFECT_BLOCKED');
    expect(state.combat.active).toBe(false);
    start(state);
    expect(state.declareCombatAction('maria', 'anteros-temple', 'shortbow').code).toBe('LINE_OF_EFFECT_BLOCKED');
    expect(state.combat.actionUsed.maria).toBeFalsy(); expect(state.combat.pending).toBeNull();
    expect(segmentCrossesBox({ col: 0, row: 0 }, { col: 4, row: 0 }, { minCol: 2, maxCol: 2.01, minRow: 0, maxRow: 1 })).toBe(true);
    expect(segmentCrossesBox({ col: 0, row: 2 }, { col: 4, row: 2 }, { minCol: 2, maxCol: 2.01, minRow: 0, maxRow: 1 })).toBe(false);
  });

  it('copies the dagger long range and preserves the locked multiattack target across restore', () => {
    const state = game(); state.claim(secondToken, 'socket-aoife', 'aoife'); start(state, 'anteros-temple');
    expect(state.characters.get('maria')!.combat.attacks.find(action => action.id === 'thrown-dagger')!.range!.longMeters).toBe(18);
    state.combat.sequences['anteros-temple'] = { actionId: 'radiant-arrows', remaining: 5, targetId: 'maria' };
    const restored = game(); restored.restoreDurable(state.captureDurable());
    expect(restored.combat.sequences['anteros-temple']!.targetId).toBe('maria');
    expect(restored.declareCombatAction('anteros-temple', 'aoife', 'radiant-arrows').code).toBe('INVALID_TARGET');
  });

  it('rejects incompatible action/recharge/audio references without partially replacing the world', () => {
    const state = game(); start(state);
    const now = Date.now(), before = state.captureDurable(now);
    const wrongAction = structuredClone(before);
    wrongAction.combat!.turnActions = { maria: { actionId: 'invented-attack', label: 'Invalid', kind: 'attack' } };
    expect(() => state.restoreDurable(wrongAction, now)).toThrow('SAVE_TURN_ACTION');
    expect(state.captureDurable(now)).toEqual(before);
    const wrongRecharge = structuredClone(before);
    wrongRecharge.combat!.rechargeAttemptTurn = { 'maria.shortbow': '1:0' };
    expect(() => state.restoreDurable(wrongRecharge, now)).toThrow('SAVE_RECHARGE_ATTEMPT');
    expect(state.captureDurable(now)).toEqual(before);
    const wrongAudio = structuredClone(before);
    wrongAudio.audio.sfxLoops = { 'unknown-loop': { playing: true, volume: 1, offsetSeconds: 0 } };
    expect(() => state.restoreDurable(wrongAudio, now)).toThrow('SAVE_AUDIO_LOOP');
    expect(state.captureDurable(now)).toEqual(before);
  });
});
