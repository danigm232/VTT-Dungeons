// Read-only gameplay audit: isolated in-memory states, no server or user saves.
// Observations, NOT regression assertions: Sol must turn these into desired-behaviour tests.
import { GameState } from '../engine/server/game.js';
import { oneShotBundle } from '../campaigns/one-shot/server.js';

const results: Array<{ id: string; expected: string; observed: unknown }> = [];
function observe(id: string, expected: string, run: () => unknown) {
  try { results.push({ id, expected, observed: run() }); }
  catch (error) { results.push({ id, expected, observed: { error: String(error) } }); }
}
function setup() {
  const state = new GameState(oneShotBundle);
  state.claim('a'.repeat(32), 'audit-maria', 'maria');
  state.claim('b'.repeat(32), 'audit-aoife', 'aoife');
  state.characters.get('maria')!.cell = { col: 14, row: 16 };
  state.characters.get('aoife')!.cell = { col: 14, row: 17 };
  state.npcs.get('anteros-temple')!.cell = { col: 15, row: 16 };
  if (!state.startCombat()) throw Error('Harness could not start combat');
  if (!state.setInitiative(state.combat.participantIds.map(id => ({ id, initiative: id === 'maria' ? 20 : 0 }))) || !state.setInitiativeOrder(state.combat.order, true)) throw Error('Harness could not establish initiative');
  for (let i = 0; state.publicSnapshot().combat.currentId !== 'maria' && i < 10; i++) state.nextCombatTurn();
  if (state.publicSnapshot().combat.currentId !== 'maria') throw Error('Harness could not select turn');
  return state;
}
observe('A01-shared-prompt', 'Only Maria receives her attack prompt; Aoife receives null', () => {
  const s = setup(); s.declareCombatAction('maria', 'anteros-temple', 'dagger');
  return { maria: s.playerPrivate('a'.repeat(32)).combat?.prompt?.actorId, aoife: s.playerPrivate('b'.repeat(32)).combat?.prompt?.actorId };
});
observe('A02-reused-phase-id', 'Attack and damage have distinct step identity; stale attack cannot resolve damage', () => {
  const s = setup(); s.declareCombatAction('maria', 'anteros-temple', 'dagger');
  const id = s.combat.pending!.id; const first = s.submitCombatRoll('player', 'maria', 'attack', id, 12);
  const sameId = s.combat.pending?.id === id;
  return { first, sameId, staleStepValueAccepted: s.submitCombatRoll('player', 'maria', 'attack', id, 4) };
});
observe('A03-unconscious-action', 'An unconscious creature cannot declare an attack', () => {
  const s = setup(); s.setCombatCondition('maria', 'inconsciente', true);
  return s.declareCombatAction('maria', 'anteros-temple', 'dagger');
});
observe('A04-advantage-cancellation', 'Poisoned attacker + restrained target => normal roll', () => {
  const s = setup(); s.setCombatCondition('maria', 'envenenada', true); s.setCombatCondition('anteros-temple', 'restringida', true);
  s.declareCombatAction('maria', 'anteros-temple', 'dagger'); return s.combat.pending?.advantage;
});
observe('A05-end-combat-state', 'Poison remains active in exploration and is persisted', () => {
  const s = setup(); s.setCombatCondition('maria', 'envenenada', true); s.endCombat();
  const save = s.captureDurable(); return { conditions: s.combat.conditions, savedCombat: save.combat, character: save.characters.find(c => c.id === 'maria') };
});
observe('A06-next-turn-pending', 'Pending damage must be resolved or explicitly cancelled with defined costs', () => {
  const s = setup(); s.declareCombatAction('maria', 'anteros-temple', 'dagger'); s.submitCombatRoll('player', 'maria', 'attack', s.combat.pending!.id, 12);
  return { advanced: s.nextCombatTurn(), pending: s.combat.pending, actionUsed: s.combat.actionUsed.maria };
});
observe('A07-zero-damage-dice', 'Zero cannot be a rolled d4 sum', () => {
  const s = setup(); s.declareCombatAction('maria', 'anteros-temple', 'dagger'); s.submitCombatRoll('player', 'maria', 'attack', s.combat.pending!.id, 12);
  return s.submitCombatRoll('player', 'maria', 'damage', s.combat.pending!.id, 0);
});
observe('A08-mirror-roundtrip', 'Mirror identity, max HP, AC and attacks survive save/restore', () => {
  const s = new GameState(oneShotBundle); s.changeScene('mirror'); s.claim('a'.repeat(32), 'audit', 'maria'); s.prepareMirrorEncounter(); s.creature!.visible = true;
  const select = (g: GameState) => ({ label: g.creature!.label, token: g.creature!.tokenId, maxHp: g.creature!.maxHp, hp: g.creature!.hp, attacks: g.creature!.attacks.map(a => a.id) });
  const before = select(s), restored = new GameState(oneShotBundle); restored.restoreDurable(s.captureDurable());
  return { before, after: select(restored) };
});
observe('A09-mirror-reveal-healing', 'Preparing an already-existing mirror must not heal it silently', () => {
  const s = new GameState(oneShotBundle); s.prepareMirrorEncounter(); s.creature!.hp = 1; s.prepareMirrorEncounter(); return s.creature!.hp;
});
observe('A10-mirror-spell-resource', 'An Aoife mimic has its own documented resource policy, not an unavailable copied spell', () => {
  const s = new GameState(oneShotBundle); s.changeScene('mirror'); s.claim('b'.repeat(32), 'audit', 'aoife'); s.prepareMirrorEncounter(); s.creature!.visible = true; s.startCombat();
  s.setInitiative(s.combat.participantIds.map(id => ({ id, initiative: id === 'reflection' ? 20 : 0 }))); s.setInitiativeOrder(s.combat.order, true);
  for (let i = 0; s.publicSnapshot().combat.currentId !== 'reflection' && i < 10; i++) s.nextCombatTurn();
  return s.declareCombatAction('reflection', 'aoife', 'magic-missile');
});
observe('A11-resource-save-validation', 'Saved current resource cannot exceed its defined maximum', () => {
  const s = new GameState(oneShotBundle), save = s.captureDurable();
  save.characters.find(c => c.id === 'aoife')!.resources!['spell-slot-1']!.current = 99;
  const restored = new GameState(oneShotBundle); restored.restoreDurable(save);
  return restored.characters.get('aoife')!.combat.resources['spell-slot-1'];
});
observe('A12-private-stat-event', 'Public outcome must not disclose the monster attack stat line', () => {
  const s = setup(); for (let i = 0; s.publicSnapshot().combat.currentId !== 'anteros-temple' && i < 10; i++) s.nextCombatTurn();
  s.declareCombatAction('anteros-temple', 'maria', 'longsword'); s.submitCombatRoll('dm', null, 'attack', s.combat.pending!.id, 1);
  return s.publicSnapshot().combat.lastEvent;
});
console.log(JSON.stringify({ date: '2026-09-18', scope: 'in-memory diagnostics only; not browser or network acceptance', results }, null, 2));
