import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameServer, GameState } from './game';
import { Server } from 'socket.io';
import type { CampaignServerBundle } from './campaign';
import { dmCommandSchema, playerCombatSchema } from '../shared/protocol';

const asset = { url: '/art/hero.png', logicalWidth: 48, logicalHeight: 64, anchorX: .5, anchorY: 1 };
const bundle: CampaignServerBundle = {
  public: { schemaVersion: 2, campaignId: 'conditions-test', version: 'test', title: 'Conditions', initialSceneId: 'room',
    scenes: [{ id: 'room', title: 'Room', surfaceId: 'floor', movementEnabled: true, background: '/art/room.png', grid: { cols: 8, rows: 6, tileSize: 48, originX: 0, originY: 0, width: 384, height: 288 }, walkable: Array.from({ length: 48 }, (_, i) => ({ col: i % 8, row: Math.floor(i / 8) })), spawns: [{ col: 1, row: 1 }, { col: 2, row: 1 }], props: [], waves: false, stageActors: [{ id: 'npc', label: 'NPC', tokenId: 'hero', cell: { col: 6, row: 4 } }] }],
    roster: [{ id: 'hero', label: 'Hero', archetype: 'Hero', color: '#ffffff', tokenId: 'hero' }, { id: 'other', label: 'Other', archetype: 'Hero', color: '#ffffff', tokenId: 'hero' }], tokens: { hero: asset }, props: {},
    audio: { music: '/audio/music.wav', layers: { ocean: '/audio/ocean.wav', wind: '/audio/wind.wav', wood: '/audio/wood.wav', storm: '/audio/storm.wav' }, sfx: { thunder: '/audio/thunder.wav', creak: '/audio/creak.wav', impact: '/audio/impact.wav' } }
  }, characters: { hero: { maxHp: 10, inventory: [] }, other: { maxHp: 8, inventory: [] } }, combatProfiles: { npc: { maxHp: 20, armorClass: 10, speedMeters: 6, startsInCombat: true, attacks: [{ id: 'bite', label: 'Bite', attackBonus: 1, damageDice: '1d4' }] } }
};
const token = 'a'.repeat(32);
function setup(combat = false) {
  const clock = vi.spyOn(Date, 'now').mockReturnValue(1000), state = new GameState(bundle);
  state.claim(token, 'test-socket', 'hero');
  if (combat) begin(state);
  return { clock, state };
}
function begin(state: GameState) {
  expect(state.startCombat()).toBe(true);
  expect(state.setInitiative([{ id: 'hero', initiative: 20 }, { id: 'npc', initiative: 10 }])).toBe(true);
  expect(state.setInitiativeOrder(state.combat.order, true)).toBe(true);
}
afterEach(() => vi.restoreAllMocks());
describe('condition clocks and DM authority', () => {
  it('counts exploration seconds and emits expiry without healing', () => {
    const { clock, state } = setup(); state.characters.get('hero')!.hp = 4;
    state.setDmCondition('hero', 'envenenada', true, 12); clock.mockReturnValue(12999); expect(state.tick().has('hero')).toBe(false);
    clock.mockReturnValue(13000); const revision = state.stateRevision; expect(state.tick().has('hero')).toBe(true);
    expect(state.stateRevision).toBe(revision + 1); expect(state.conditionsFor('hero')).toEqual([]); expect(state.characters.get('hero')!.hp).toBe(4);
  });
  it('counts completed rounds, never real time waiting for dice', () => {
    const { clock, state } = setup(true); state.setDmCondition('hero', 'paralizada', true, 12);
    clock.mockReturnValue(900000); state.tick(); expect(state.conditionsFor('hero')).toContain('paralizada');
    state.nextCombatTurn(); expect(state.conditionSourcesFor('hero')[0]?.remainingMs).toBe(12000);
    state.nextCombatTurn(); expect(state.conditionSourcesFor('hero')[0]?.remainingMs).toBe(6000);
    state.nextCombatTurn(); state.nextCombatTurn(); expect(state.conditionsFor('hero')).toEqual([]);
  });
  it('preserves remaining time across ending and restarting combat', () => {
    const { clock, state } = setup(true); state.setDmCondition('hero', 'asustada', true, 18);
    state.nextCombatTurn(); state.nextCombatTurn(); state.endCombat(); expect(state.conditionSourcesFor('hero')[0]?.expiresAt).toBe(13000);
    clock.mockReturnValue(6000); begin(state); expect(state.conditionSourcesFor('hero')[0]?.remainingMs).toBe(7000);
    expect(state.conditionSourcesFor('hero')[0]?.expiresAt).toBeUndefined(); state.nextCombatTurn(); state.nextCombatTurn(); state.endCombat();
    expect(state.conditionSourcesFor('hero')[0]?.expiresAt).toBe(7000); clock.mockReturnValue(7000); state.tick(); expect(state.conditionsFor('hero')).toEqual([]);
  });
  it('waits a whole initiative cycle for effects applied late in the round', () => {
    const { state } = setup(true); state.nextCombatTurn();
    state.setDmCondition('hero', 'envenenada', true, 6); state.nextCombatTurn();
    expect(state.conditionsFor('hero')).toContain('envenenada');
    state.nextCombatTurn(); expect(state.conditionsFor('hero')).not.toContain('envenenada');
  });
  it('expires at the specified actor boundary, skipping the current turn end', () => {
    const { state } = setup(true); state.setDmCondition('hero', 'asustada', true, 6, 'end');
    state.nextCombatTurn(); expect(state.conditionsFor('hero')).toContain('asustada');
    state.nextCombatTurn(); expect(state.conditionsFor('hero')).toContain('asustada');
    state.nextCombatTurn(); expect(state.conditionsFor('hero')).toEqual([]);
    state.setDmCondition('hero', 'paralizada', true, 6, 'start'); state.nextCombatTurn(); expect(state.conditionsFor('hero')).toEqual([]);
  });
  it('keeps indefinite states and 0 HP unconsciousness when combat ends', () => {
    const { state, clock } = setup(true); state.setCombatCondition('hero', 'agarrada', true); state.applyHitPoints('hero', -10); state.combat.pending = null; state.endCombat();
    clock.mockReturnValue(9999999); state.tick(); expect(state.conditionsFor('hero')).toEqual(expect.arrayContaining(['agarrada', 'inconsciente', 'derribada']));
    state.setDmCondition('hero', 'inconsciente', false); expect(state.conditionsFor('hero')).not.toContain('inconsciente'); expect(state.characters.get('hero')!.hp).toBe(0);
  });
  it('does not erase another source when the short effect expires', () => {
    const { clock, state } = setup(); state.setCombatCondition('hero', 'envenenada', true, { condition: 'envenenada', sourceAbility: 'short', durationSeconds: 1 });
    state.setCombatCondition('hero', 'envenenada', true, { condition: 'envenenada', sourceAbility: 'long' });
    clock.mockReturnValue(2000); state.tick(); expect(state.conditionsFor('hero')).toEqual(['envenenada']); expect(state.conditionSourcesFor('hero')[0]?.sourceAbility).toBe('long');
    state.setDmCondition('hero', 'envenenada', false); expect(state.conditionSourcesFor('hero')).toEqual([]);
  });
  it('stores remaining time and reanchors after loading; upgrades old round metadata', () => {
    const { state, clock } = setup(); state.setDmCondition('hero', 'hechizada', true, 60); clock.mockReturnValue(11000);
    const saved = state.captureDurable(), restored = new GameState(bundle); restored.restoreDurable(saved, 900000);
    expect(restored.conditionSourcesFor('hero')[0]).toMatchObject({ remainingMs: 50000, expiresAt: 950000 });
    saved.conditionSources!.hero = [{ condition: 'hechizada', durationRounds: 2, appliedAtRound: 99 }];
    restored.restoreDurable(saved, 900000); expect(restored.conditionSourcesFor('hero')[0]?.expiresAt).toBe(912000);
  });
  it('never expires 0 HP unconsciousness and does not wake an unrelated sleeping effect on healing', () => {
    const { state, clock } = setup();
    state.setCombatCondition('hero', 'inconsciente', true, { condition: 'inconsciente', sourceAbility: 'sleep', durationSeconds: 10 });
    state.applyHitPoints('hero', -10); state.setDmCondition('hero', 'inconsciente', true, 1);
    clock.mockReturnValue(2000); state.tick(); expect(state.conditionsFor('hero')).toContain('inconsciente'); expect(state.characters.get('hero')!.hp).toBe(0);
    state.setCombatCondition('hero', 'inconsciente', true, { condition: 'inconsciente', sourceAbility: 'sleep', durationSeconds: 60 });
    state.applyHitPoints('hero', 1); expect(state.conditionsFor('hero')).toContain('inconsciente'); expect(state.conditionSourcesFor('hero').some(source => source.sourceAbility === 'zero-hp')).toBe(false);
    expect(() => state.captureDurable()).not.toThrow();
  });
  it('preserves source defeat cleanup, immunity and combat clocks when saved mid-battle', () => {
    const { state } = setup(true); state.npcs.get('npc')!.conditionImmunities = ['envenenada'];
    expect(state.setDmCondition('npc', 'envenenada', true, 60)).toBe(false);
    state.setCombatCondition('hero', 'restringida', true, { condition: 'restringida', sourceId: 'npc', escapeDc: 11, endsWhenSourceDefeated: true });
    state.setDmCondition('hero', 'asustada', true, 12); state.nextCombatTurn(); state.nextCombatTurn();
    const restored = new GameState(bundle); restored.restoreDurable(state.captureDurable(), 900000);
    expect(restored.conditionSourcesFor('hero').find(source => source.condition === 'asustada')).toMatchObject({ remainingMs: 6000 });
    state.applyHitPoints('npc', -20); expect(state.conditionsFor('hero')).not.toContain('restringida'); expect(state.conditionsFor('hero')).toContain('asustada');
    restored.nextCombatTurn(); restored.nextCombatTurn(); expect(restored.conditionsFor('hero')).not.toContain('asustada');
  });
  it('DM sees and removes player and NPC states outside combat, retaining source escape rules', () => {
    const { state } = setup(); state.setCombatCondition('hero', 'restringida', true, { condition: 'restringida', sourceId: 'npc', escapeDc: 13, endsWhenSourceDefeated: true });
    state.setDmCondition('hero', 'restringida', true, 30); expect(state.conditionSourcesFor('hero')[0]).toMatchObject({ escapeDc: 13, sourceId: 'npc', remainingMs: 30000 });
    state.setDmCondition('npc', 'asustada', true); expect(state.dmState().npcs[0]?.conditions).toContain('asustada');
    expect(state.dmState().characters[0]?.conditions).toContain('restringida'); expect(state.dmState().combat.participants).toEqual([]);
    state.setDmCondition('hero', 'restringida', true); expect(state.conditionSourcesFor('hero')[0]?.expiresAt).toBeUndefined();
    state.setDmCondition('hero', 'restringida', false); expect(state.playerPrivate(token).conditions).toEqual([]);
  });
  it('does not freeze nonparticipants in other scenes and protects the DM-only command', () => {
    const { state, clock } = setup(true); state.setDmCondition('other', 'envenenada', true, 1); clock.mockReturnValue(2000); state.tick(); expect(state.conditionsFor('other')).toEqual([]);
    const command = { type: 'combat:condition', commandId: crypto.randomUUID(), sceneEpoch: 0, entityId: 'hero', condition: 'asustada', active: true, durationSeconds: 6, expiryTurn: 'end' };
    expect(dmCommandSchema.safeParse(command).success).toBe(true); expect(playerCombatSchema.safeParse(command).success).toBe(false);
    expect(dmCommandSchema.safeParse({ ...command, durationSeconds: -1 }).success).toBe(false); expect(dmCommandSchema.safeParse({ ...command, durationSeconds: 86401 }).success).toBe(false);
  });
  it('carries authored durations through a saving throw, without inventing durations for other attacks', () => {
    const { state } = setup(true);
    state.npcs.get('npc')!.attacks.push({ id: 'hold', label: 'Hold', attackBonus: 0, damageDice: '1d1', damageBonus: 0, range: { kind: 'ranged', normalMeters: 30 }, save: { ability: 'wis', dc: 13, failureCondition: 'paralizada', durationRounds: 1, expiryTurn: 'end' } });
    state.nextCombatTurn(); expect(state.declareCombatAction('npc', 'hero', 'hold').ok).toBe(true);
    expect(state.submitCombatRoll('dm', null, 'save', state.combat.pending!.id, 1).ok).toBe(true);
    expect(state.conditionSourcesFor('hero')[0]).toMatchObject({ sourceId: 'npc', sourceAbility: 'hold', durationRounds: 1, remainingMs: 6000, expiryTurn: 'end' });
    state.nextCombatTurn(); expect(state.conditionsFor('hero')).toContain('paralizada'); state.nextCombatTurn(); expect(state.conditionsFor('hero')).not.toContain('paralizada');
  });
  it('accepts DM commands outside combat, broadcasts changes, deduplicates and removes all sources', () => {
    const io = new Server(), server = new GameServer(io, 'condition-test', bundle), emit = vi.fn(), socket = { emit: vi.fn() };
    vi.spyOn(io, 'to').mockReturnValue({ emit } as never); server.state.claim(token, 'test-socket', 'hero');
    const internal = server as unknown as { handleDm(socket: unknown, command: unknown): void };
    const command = { type: 'combat:condition', runtimeEpoch: server.state.runtimeEpoch, commandId: crypto.randomUUID(), sceneEpoch: server.state.sceneEpoch, entityId: 'hero', condition: 'asustada', active: true, durationSeconds: 12 };
    internal.handleDm(socket, command); const expiresAt = server.state.conditionSourcesFor('hero')[0]?.expiresAt; internal.handleDm(socket, command);
    expect(server.state.conditionSourcesFor('hero')).toHaveLength(1); expect(server.state.conditionSourcesFor('hero')[0]?.expiresAt).toBe(expiresAt);
    expect(emit).toHaveBeenCalledWith('dm:state', expect.anything());
    internal.handleDm(socket, { ...command, commandId: crypto.randomUUID(), active: false }); expect(server.state.conditionsFor('hero')).toEqual([]);
    expect(socket.emit).toHaveBeenLastCalledWith('command:result', expect.objectContaining({ ok: true }));
  });
});
