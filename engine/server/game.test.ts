import { afterEach, describe, expect, it, vi } from 'vitest';
import { Server } from 'socket.io';
import { STEP_DURATION_MS, type DmCommand } from '../shared/protocol';
import type { CampaignServerBundle } from './campaign';
import { compileCampaignBundle } from './campaign';
import { GameServer, GameState } from './game';
import { isWalkable, resolveStep } from './navigation';
import { stormwreckBundle } from '../../campaigns/stormwreck-isle/server.js';

const cells = (cols: number, rows: number) => Array.from({ length: cols * rows }, (_, index) => ({ col: index % cols, row: Math.floor(index / cols) }));
const asset = { url: '/art/test.png', logicalWidth: 48, logicalHeight: 48, anchorX: .5, anchorY: .5 } as const;
const syntheticBundle = (): CampaignServerBundle => ({
  public: {
    schemaVersion: 2, campaignId: 'synthetic-campaign', version: 'test', title: 'Campaña sintética', initialSceneId: 'quiet-room',
    scenes: [
      { id: 'quiet-room', title: 'Sala quieta', surfaceId: 'quiet', movementEnabled: false, background: '/art/quiet.png', grid: { cols: 8, rows: 6, tileSize: 48, originX: 0, originY: 0, width: 384, height: 288 }, walkable: cells(8, 6), spawns: [{ col: 1, row: 1 }, { col: 1, row: 2 }], props: [], waves: false, stageActors: [{ id: 'quiet-npc', label: 'Guía', tokenId: 'hero', cell: { col: 4, row: 3 } }] },
      { id: 'open-floor', title: 'Suelo abierto', surfaceId: 'floor', movementEnabled: true, background: '/art/floor.png', grid: { cols: 8, rows: 6, tileSize: 48, originX: 0, originY: 0, width: 384, height: 288 }, walkable: cells(8, 6), spawns: [{ col: 1, row: 1 }, { col: 1, row: 2 }], props: [], waves: false },
      { id: 'workshop', title: 'Taller', surfaceId: 'workshop-floor', movementEnabled: true, background: '/art/workshop.png', grid: { cols: 8, rows: 6, tileSize: 48, originX: 0, originY: 0, width: 384, height: 288 }, walkable: cells(8, 6), spawns: [{ col: 1, row: 1 }, { col: 1, row: 2 }], props: [
        { id: 'test-door', kind: 'door', label: 'Puerta', assetId: 'door-art', cell: { col: 3, row: 2 }, rotation: 0, initialState: 'closed', baseFootprint: [{ col: 0, row: 0 }], allowedRotations: [0], capabilities: { transform: false, detach: false, structure: false }, sourceKind: 'addition' },
        { id: 'test-crate', kind: 'crate', label: 'Caja', assetId: 'crate-art', cell: { col: 5, row: 2 }, rotation: 0, baseFootprint: [{ col: 0, row: 0 }, { col: 1, row: 0 }], allowedRotations: [0, 90], capabilities: { transform: true, detach: false, structure: false }, sourceKind: 'addition' }
      ], waves: false }
    ],
    roster: [
      { id: 'alpha', label: 'Alpha', archetype: 'Exploradora', color: '#55b8d8', tokenId: 'hero' },
      { id: 'beta', label: 'Beta', archetype: 'Guardiana', color: '#d5a34b', tokenId: 'hero' }
    ],
    tokens: { hero: asset, beast: asset }, props: { 'door-art': { variants: { closed: asset, open: asset } }, 'crate-art': { variants: { '0': asset, '90': asset } } },
    audio: { music: '/audio/music.wav', layers: { ocean: '/audio/ocean.wav', wind: '/audio/wind.wav', wood: '/audio/wood.wav', storm: '/audio/storm.wav' }, sfx: { thunder: '/audio/thunder.wav', creak: '/audio/creak.wav', impact: '/audio/impact.wav' } }
  },
  characters: { alpha: { maxHp: 10, inventory: ['Mapa secreto'] }, beta: { maxHp: 8, inventory: ['Cuerda'] } }
});
const bundleWithOptionalFeatures = () => {
  const bundle = syntheticBundle();
  bundle.public.props['wheel-art'] = { variants: { attached: asset, 'detached:caught:0': asset, 'detached:caught:90': asset, 'detached:caught:180': asset, 'detached:caught:270': asset, 'detached:fallen:0': asset, 'detached:fallen:90': asset, 'detached:fallen:180': asset, 'detached:fallen:270': asset } };
  bundle.public.props['mount-art'] = { variants: { default: asset } };
  bundle.public.scenes[1]!.walkable = bundle.public.scenes[1]!.walkable.filter(cell => cell.col !== 3 || cell.row !== 3);
  bundle.public.scenes[1]!.props.push({ id: 'test-wheel', kind: 'wheel', label: 'Rueda', assetId: 'wheel-art', cell: { col: 3, row: 3 }, rotation: 0, baseFootprint: [{ col: 0, row: 0 }], allowedRotations: [0, 90, 180, 270], initialState: 'upright', capabilities: { transform: true, detach: true, structure: false }, mount: { cell: { col: 3, row: 3 }, footprint: [{ col: 0, row: 0 }], assetId: 'mount-art' }, sourceKind: 'addition' });
  bundle.encounter = { sceneId: 'open-floor', creature: { id: 'test-beast', label: 'Bestia', tokenId: 'beast', color: '#cc5555', cell: { col: 6, row: 4 } }, note: 'Nota privada' };
  bundle.wheelInteraction = { sceneId: 'open-floor', targetId: 'test-wheel', cells: [{ col: 3, row: 2 }], nearbyLabel: 'Rueda', note: 'CD privada' };
  return bundle;
};
const bundleWithStructureFeatures = () => {
  const bundle = bundleWithOptionalFeatures();
  const workshop = bundle.public.scenes.find(scene => scene.id === 'workshop')!;
  workshop.props.find(prop => prop.id === 'test-door')!.capabilities.structure = true;
  workshop.props.find(prop => prop.id === 'test-crate')!.capabilities.structure = true;
  bundle.public.scenes.find(scene => scene.id === 'open-floor')!.props.find(prop => prop.id === 'test-wheel')!.capabilities.structure = true;
  bundle.public.props['door-art'] = { variants: { 'intact:closed': asset, 'intact:open': asset, 'damaged:closed': asset, 'damaged:open': asset, destroyed: asset } };
  bundle.public.props['crate-art'] = { variants: { 'intact:0': asset, 'intact:90': asset, 'damaged:0': asset, 'damaged:90': asset, 'destroyed:0': asset, 'destroyed:90': asset } };
  bundle.public.props['wheel-art'] = { variants: Object.fromEntries([
    ['attached:intact', asset], ['attached:damaged', asset],
    ...(['intact', 'damaged'] as const).flatMap(structure => ([0, 90, 180, 270] as const).flatMap(rotation => ([
      [`detached:caught:${structure}:${rotation}`, asset], [`detached:fallen:${structure}:${rotation}`, asset]
    ] as const))),
    ...([0, 90, 180, 270] as const).map(rotation => [`debris:${rotation}`, asset] as const)
  ]) };
  return bundle;
};
const objectCommand = (state: GameState, body: Record<string, unknown>) => state.applyObjectCommand({ commandId: crypto.randomUUID(), sceneEpoch: state.sceneEpoch, objectRevision: state.objectRevision, ...body } as Parameters<GameState['applyObjectCommand']>[0]);
const confirmInitiative = (state: GameState, entries: Array<{ id: string; initiative: number }>) => {
  expect(state.setInitiative(entries)).toBe(true);
  expect(state.setInitiativeOrder(state.combat.order, true)).toBe(true);
};
const twoPlayerCombat = () => {
  const state = new GameState(bundleWithOptionalFeatures()); state.changeScene('open-floor');
  state.claim('a'.repeat(32), 'socket-a', 'alpha'); state.claim('b'.repeat(32), 'socket-b', 'beta'); state.creature!.visible = true;
  if (!state.startCombat()) throw new Error('No se pudo iniciar el combate sintético');
  confirmInitiative(state, [{ id: 'alpha', initiative: 20 }, { id: 'beta', initiative: 10 }, { id: 'test-beast', initiative: 0 }]);
  return state;
};

afterEach(() => vi.useRealTimers());

describe('combat lifecycle and cancellation', () => {
  it('uses the creature own spell resources and does not demand a player backpack for copied attacks', () => {
    const state = twoPlayerCombat(), beast = state.creature!;
    beast.hp = 30; beast.resources['spell-slot-1'] = { label: 'Slots', current: 1, max: 1 };
    beast.attacks.push({ ...beast.attacks[0]!, id: 'copied-spell', magical: true, automaticHit: true, damageDice: '1d4', damageBonus: 0, resource: { id: 'spell-slot-1', cost: 1 } });
    state.nextCombatTurn(); state.nextCombatTurn();
    expect(state.declareCombatAction(beast.id, 'alpha', 'copied-spell').ok).toBe(true);
    state.submitCombatRoll('dm', null, 'damage', state.combat.pending!.id, 1);
    expect(beast.resources['spell-slot-1']!.current).toBe(0);
    state.combat.actionUsed[beast.id] = false;
    expect(state.declareCombatAction(beast.id, 'alpha', 'copied-spell')).toMatchObject({ ok: false, code: 'RESOURCE_DEPLETED' });
    beast.attacks[0]!.inventoryCost = 'arrow';
    expect(state.declareCombatAction(beast.id, 'alpha', beast.attacks[0]!.id).ok).toBe(true);
  });
  it('rejects reactions during initiative and from non-participants', () => {
    const state = twoPlayerCombat(), action = state.characters.get('alpha')!.combat.attacks[0]!;
    action.actionCost = 'reaction'; state.combat.initiativePending = true;
    expect(state.declareCombatAction('alpha', 'test-beast', action.id).ok).toBe(false);
    state.combat.initiativePending = false; state.combat.participantIds = state.combat.participantIds.filter(id => id !== 'alpha');
    expect(state.declareCombatAction('alpha', 'test-beast', action.id).ok).toBe(false);
  });
  it('cancels before rolling without revealing a hidden actor or spending resources', () => {
    const state = twoPlayerCombat();
    state.setCombatCondition('alpha', 'invisible', true);
    expect(state.declareCombatAction('alpha', 'test-beast', 'basic-attack').ok).toBe(true);
    const promptId = state.combat.pending!.id;
    expect(state.playerPrivate('a'.repeat(32)).combat?.pendingAction).toMatchObject({ promptId, cancellable: true });
    expect(state.conditionsFor('alpha')).toContain('invisible');
    expect(state.cancelCombatAction('beta', promptId)).toMatchObject({ ok: false, code: 'NOT_YOUR_ACTION' });
    expect(state.endCombat()).toBe(false);
    expect(state.cancelCombatAction('alpha', promptId).ok).toBe(true);
    expect(state.combat.pending).toBeNull();
    expect(state.combat.actionUsed.alpha).toBe(false);
    expect(state.conditionsFor('alpha')).toContain('invisible');
    expect(state.endCombat()).toBe(true);
  });

  it('cannot cancel after seeing an attack roll or erase the pending damage', () => {
    const state = twoPlayerCombat();
    state.declareCombatAction('alpha', 'test-beast', 'basic-attack');
    state.submitCombatRoll('player', 'alpha', 'attack', state.combat.pending!.id, 20);
    expect(state.canCancelCombatAction()).toBe(false);
    expect(state.cancelCombatAction('alpha', state.combat.pending!.id)).toMatchObject({ ok: false, code: 'ACTION_ALREADY_RESOLVING' });
    expect(state.endCombat()).toBe(false);
  });

  it('flee is an intention, not a teleport or a free action', () => {
    const state = twoPlayerCombat(), cell = { ...state.characters.get('alpha')!.cell };
    expect(state.requestCombatFlee('alpha').ok).toBe(true);
    expect(state.characters.get('alpha')!.cell).toEqual(cell);
    expect(state.combat.actionUsed.alpha).toBe(false);
    expect(state.combat.participantIds).toContain('alpha');
    expect(state.withdrawCombatant('alpha').ok).toBe(true);
    expect(state.publicSnapshot().combat.currentId).toBe('beta');
    expect(state.combat.round).toBe(1);
    expect(state.withdrawCombatant('beta').code).toBe('COMBAT_ENDED');
    expect(state.combat.active).toBe(false);
  });

  it('includes living unconscious players and allows DM cancellation of preparation', () => {
    const state = new GameState(bundleWithOptionalFeatures()); state.changeScene('open-floor');
    state.claim('a'.repeat(32), 'socket-a', 'alpha'); state.creature!.visible = true;
    state.applyHitPoints('alpha', -10);
    expect(state.startCombat()).toBe(true);
    expect(state.combat.participantIds).toContain('alpha');
    expect(state.cancelCombat()).toBe(true);
    expect(state.characters.get('alpha')!.hp).toBe(0);
  });

  it('spends the slot on the first missile and cannot refund it by abandoning the sequence', () => {
    const state = twoPlayerCombat(), alpha = state.characters.get('alpha')!;
    state.creature!.hp = 50; state.creature!.maxHp = 50;
    alpha.combat.resources['spell-slot-1'] = { label: 'Slots', current: 1, max: 1 };
    alpha.combat.attacks.push({ ...alpha.combat.attacks[0]!, id: 'missiles', magical: true, automaticHit: true, damageDice: '1d4', damageBonus: 1, attackCount: 3, resource: { id: 'spell-slot-1', cost: 1 } });
    expect(state.declareCombatAction('alpha', 'test-beast', 'missiles').ok).toBe(true);
    state.submitCombatRoll('player', 'alpha', 'damage', state.combat.pending!.id, 1);
    expect(alpha.combat.resources['spell-slot-1']!.current).toBe(0);
    expect(state.combat.actionUsed.alpha).toBe(true);
    expect(state.declareCombatAction('alpha', 'test-beast', 'missiles').ok).toBe(true);
    expect(state.canCancelCombatAction()).toBe(false);
    state.submitCombatRoll('player', 'alpha', 'damage', state.combat.pending!.id, 1);
    state.nextCombatTurn();
    expect(alpha.combat.resources['spell-slot-1']!.current).toBe(0);
  });

  it('readied weapon attack spends one reaction and does not grant Extra Attack', () => {
    const state = twoPlayerCombat(); state.characters.get('alpha')!.combat.attacks[0]!.attackCount = 2;
    state.useBasicCombatAction('alpha', 'ready'); state.nextCombatTurn();
    expect(state.declareCombatAction('alpha', 'test-beast', 'basic-attack').ok).toBe(true);
    state.submitCombatRoll('player', 'alpha', 'attack', state.combat.pending!.id, 1);
    expect(state.combat.reactionUsed.alpha).toBe(true);
    expect(state.combat.sequences.alpha).toBeUndefined();
    expect(state.declareCombatAction('alpha', 'test-beast', 'basic-attack').ok).toBe(false);
  });
});

describe('inyección y privacidad', () => {
  it('emite las señales del epílogo solo tras confirmación del DM y mantiene privado el suspiro a bordo', () => {
    const io = new Server(), server = new GameServer(io, 'dm-test', stormwreckBundle), emit = vi.fn();
    const to = vi.spyOn(io, 'to').mockReturnValue({ emit } as never);
    const mike = server.state.characters.get('mike')!, mia = server.state.characters.get('mia')!;
    Object.assign(mike, { sessionToken: 'a'.repeat(32), socketId: 'socket-mike', sceneId: 'wreck-ship' });
    Object.assign(mia, { sessionToken: 'b'.repeat(32), socketId: 'socket-mia', sceneId: 'dragon-rest' });
    server.state.progress['wreck.talisman-found'] = true;
    const internal = server as unknown as { handleDm(socket: { emit: (...args: unknown[]) => void }, raw: unknown): void };
    const dmSocket = { emit: vi.fn() };
    const toggle = (flag: string) => internal.handleDm(dmSocket, {
      type: 'progress:toggle', runtimeEpoch: server.state.runtimeEpoch, sceneEpoch: server.state.sceneEpoch,
      commandId: crypto.randomUUID(), flag, value: true
    });

    toggle('wreck.curse-aboard');
    const shipNotice = emit.mock.calls.filter(([event, payload]) => event === 'player:private' && Boolean((payload as { notice?: string }).notice));
    expect(shipNotice).toHaveLength(1);
    expect(shipNotice[0]?.[0]).toBe('player:private');
    expect((shipNotice[0]?.[1] as { notice: string }).notice).toContain('suspiro');
    expect(JSON.stringify(emit.mock.calls)).not.toMatch(/diario|talismán/i);

    emit.mockClear(); to.mockClear();
    Object.assign(mike, { sceneId: 'dragon-rest' });
    toggle('wreck.curse-day-after');
    const dawnNotices = emit.mock.calls.filter(([event, payload]) => event === 'player:private' && Boolean((payload as { notice?: string }).notice));
    expect(dawnNotices).toHaveLength(2);
    expect(JSON.stringify(dawnNotices)).toContain('el pecio ha desaparecido');
  });

  it('entrega el sueño solo a Mia y actualiza el nivel del grupo según elección del DM', () => {
    const io = new Server(), server = new GameServer(io, 'dm-test', stormwreckBundle), emit = vi.fn();
    const to = vi.spyOn(io, 'to').mockReturnValue({ emit } as never);
    for (const [id, token, socketId] of [['mike', 'a'.repeat(32), 'socket-mike'], ['mia', 'b'.repeat(32), 'socket-mia'], ['maria', 'c'.repeat(32), 'socket-trinity']] as const)
      Object.assign(server.state.characters.get(id)!, { sessionToken: token, socketId });
    server.state.progress['wreck.curse-grave'] = true;
    server.state.progress['wreck.curse-day-after'] = true;
    const internal = server as unknown as { handleDm(socket: { emit: (...args: unknown[]) => void }, raw: unknown): void; emitWreckProgressNotice(flag: string): void };
    internal.emitWreckProgressNotice('wreck.cleric-dream');
    const dreamNotices = emit.mock.calls.filter(([event, payload]) => event === 'player:private' && String((payload as { notice?: string }).notice ?? '').includes('sueñas'));
    expect(dreamNotices).toHaveLength(1);
    expect(to.mock.calls.filter(([socketId]) => socketId === 'socket-mia')).toHaveLength(1);
    expect(JSON.stringify(dreamNotices)).not.toMatch(/diario|talismán/i);

    emit.mockClear(); to.mockClear();
    internal.handleDm({ emit: vi.fn() }, {
      type: 'wreck:level-up', runtimeEpoch: server.state.runtimeEpoch, commandId: crypto.randomUUID(), level: 3
    });
    expect([...server.state.characters.values()].every(character => character.sheet?.level === 3)).toBe(true);
    expect(server.state.progress['wreck.chapter-level-up']).toBe(true);
    const levelNotices = emit.mock.calls.filter(([event, payload]) => event === 'player:private' && String((payload as { notice?: string }).notice ?? '').includes('nivel 3'));
    expect(levelNotices).toHaveLength(3);
  });

  it('emite la animación de ataque correcta desde el servidor', () => {
    const io = new Server(), emit = vi.spyOn(io, 'emit'), server = new GameServer(io, 'dm-test', bundleWithOptionalFeatures());
    server.state.characters.get('alpha')!.combat.attacks.push({
      id: 'test-shot', label: 'Disparo', attackBonus: 2, damageDice: '1d6', damageBonus: 0, animationType: 'arrow'
    });
    const internal = server as unknown as { emitCombatAnimation(pending: never, hit: boolean): void };
    internal.emitCombatAnimation({ attackerId: 'alpha', targetId: 'test-beast', actionId: 'test-shot' } as never, true);
    expect(emit).toHaveBeenCalledWith('combat:animation', expect.objectContaining({ type: 'arrow', hit: true }));
  });

  it('inicia la música elegida desde la consola del DM', () => {
    const bundle = bundleWithOptionalFeatures();
    bundle.public.audio.library = {
      music: [{ id: 'test-theme', label: 'Tema de prueba', description: 'Prueba de selección musical.', url: '/audio/music.wav' }],
      ambience: [{ id: 'test-ocean', label: 'Ambiente de prueba', description: 'Prueba de ambiente.', url: '/audio/ocean.wav', category: 'scene', loopable: true }],
      sfx: [{ id: 'test-sfx', label: 'Efecto de prueba', description: 'Prueba de efecto.', url: '/audio/impact.wav', category: 'object' }]
    };
    const io = new Server(), server = new GameServer(io, 'dm-test', bundle);
    server.state.audio.music.playing = false;
    const result = server.applyDmCommand({ type: 'audio:select', commandId: crypto.randomUUID(), runtimeEpoch: server.state.runtimeEpoch, channel: 'music', trackId: 'test-theme' } as DmCommand);
    expect(result.ok).toBe(true);
    expect(server.state.audio.music).toMatchObject({ assetId: 'test-theme', playing: true });
    // Este Server sintético no escucha en ningún puerto; close() intenta
    // cerrar un servidor HTTP inexistente y produce un rechazo asíncrono.
  });

  it('persiste el horario de escena sin modificar el estado del descanso', () => {
    const server = new GameServer(new Server(), 'dm-test', stormwreckBundle);
    const result = server.applyDmCommand({
      type: 'environment', commandId: crypto.randomUUID(), runtimeEpoch: server.state.runtimeEpoch,
      sceneEpoch: server.state.sceneEpoch, storm: false, timeOfDay: 'night'
    } as DmCommand);
    expect(result).toMatchObject({ ok: true, code: 'APPLIED' });
    expect(server.state.environment.timeOfDay).toBe('night');
    expect(server.state.campRest).toBeNull();

    const saved = server.state.captureDurable();
    expect(saved.environment.timeOfDay).toBe('night');
    server.state.restoreDurable(saved);
    expect(server.state.environment.timeOfDay).toBe('night');
  });

  it('arranca una campaña sintética sin encuentro ni interacción especial', () => {
    const state = new GameState(syntheticBundle());
    expect(state.publicSnapshot().sceneId).toBe('quiet-room');
    expect(state.dmState().creature).toBeNull();
    expect(state.playerPrivate('x'.repeat(32)).canInteract).toBe(false);
  });

  it('omite criatura oculta, foco y objectRevision del mundo público', () => {
    const state = new GameState(bundleWithOptionalFeatures()); state.camera.focusId = state.creature!.id;
    const json = JSON.stringify(state.publicSnapshot());
    expect(json).not.toContain('test-beast'); expect(json).not.toContain('objectRevision'); expect(JSON.stringify(state.dmState())).toContain('test-beast');
  });

  it('muestra al jugador la CA que debe superar, pero no PG, velocidad ni ataques privados', () => {
    const state = twoPlayerCombat();
    const target = state.publicSnapshot(true).combat.participants.find(participant => participant.id === 'test-beast');
    expect(target).toMatchObject({ armorClass: 10, hp: 0, maxHp: 0, speedMeters: 0, attacks: [] });
  });

  it('entrega inventario sólo al propietario y no duplica una reclamación', () => {
    const state = new GameState(syntheticBundle()), token = 'a'.repeat(32);
    expect(state.claim(token, 'socket-a', 'alpha').ok).toBe(true); expect(state.claim('b'.repeat(32), 'socket-b', 'alpha').ok).toBe(false);
    expect(state.playerPrivate(token).inventory).toEqual(['Mapa secreto']); expect(state.playerPrivate('b'.repeat(32)).inventory).toEqual([]);
  });

  it('sólo publica PJ reclamados y deja al PNJ de escena bajo control del DM', () => {
    const state = new GameState(syntheticBundle()), token = 'a'.repeat(32);
    expect(state.publicSnapshot().entities.map(entity => entity.id)).toEqual(['quiet-npc']);
    expect(state.claim(token, 'socket-a', 'alpha').ok).toBe(true);
    expect(state.publicSnapshot().entities.map(entity => entity.id).sort()).toEqual(['alpha', 'quiet-npc']);
    const npc = state.npcs.get('quiet-npc')!; npc.cell = { col: 5, row: 3 };
    expect(state.publicSnapshot().entities.find(entity => entity.id === 'quiet-npc')?.cell).toEqual({ col: 5, row: 3 });
  });

  it('ofrece una interacción escénica sólo junto al PNJ visible y valida su reacción declarada', () => {
    const bundle = syntheticBundle();
    bundle.public.tokenAnimations = { hero: { talk: { frames: ['/art/guide-talk.png'], fps: 1 } } };
    bundle.stageActorInteractions = [{ sceneId: 'quiet-room', targetId: 'quiet-npc', cells: [{ col: 3, row: 3 }], nearbyLabel: 'Hablar con Guía', responseAnimation: 'talk', notice: 'La guía responde.' }];
    const state = new GameState(bundle), token = 'a'.repeat(32);
    state.claim(token, 'socket-a', 'alpha'); state.characters.get('alpha')!.cell = { col: 3, row: 3 };
    expect(state.playerPrivate(token)).toMatchObject({ canInteract: true, nearbyInteraction: 'Hablar con Guía', interactionTargetId: 'quiet-npc' });
    expect(state.stageActorInteractionFor('alpha', 'quiet-npc')).toMatchObject({ responseAnimation: 'talk' });
    state.npcs.get('quiet-npc')!.visible = false;
    expect(state.playerPrivate(token).canInteract).toBe(false);
    expect(state.stageActorInteractionFor('alpha', 'quiet-npc')).toBeNull();
  });

  it('declara trucos fuera de combate y abre combate al atacar una entidad tocada', () => {
    const bundle = syntheticBundle();
    bundle.characters.alpha!.explorationActions = [{ id: 'mending', label: 'Remendar', kind: 'cantrip', target: 'living', rangeMeters: 3, guidance: 'El DM decide el efecto.' }];
    const state = new GameState(bundle), token = 'a'.repeat(32);
    state.claim(token, 'socket-a', 'alpha'); state.characters.get('alpha')!.cell = { col: 3, row: 3 };
    expect(state.declareExplorationAction('alpha', 'quiet-npc', 'mending')).toMatchObject({ ok: true, code: 'EXPLORATION_ACTION_DECLARED' });
    expect(state.startCombatFromAttack('alpha', 'quiet-npc', 'basic-attack')).toMatchObject({ ok: true, code: 'COMBAT_STARTED' });
    expect(state.publicSnapshot().combat.active).toBe(true);
    expect(state.publicSnapshot().combat.participants.map(participant => participant.id)).toEqual(expect.arrayContaining(['alpha', 'quiet-npc']));
    confirmInitiative(state, [{ id: 'alpha', initiative: 20 }, { id: 'quiet-npc', initiative: 0 }]);
    while (!state.combat.pending) expect(state.nextCombatTurn()).toBe(true);
    expect(state.combat.pending).toMatchObject({ attackerId: 'alpha', targetId: 'quiet-npc', actionId: 'basic-attack', stage: 'attack' });
  });

  it('respeta la inmunidad de condición declarada para un PNJ', () => {
    const bundle = syntheticBundle();
    bundle.combatProfiles = { 'quiet-npc': { maxHp: 12, armorClass: 12, speedMeters: 9, conditionImmunities: ['envenenada'], attacks: [] } };
    const state = new GameState(bundle);
    expect(state.setCombatCondition('quiet-npc', 'envenenada', true)).toBe(false);
    expect(state.conditionsFor('quiet-npc')).toEqual([]);
  });

  it('inicia turnos de combate sólo con PJ reclamados y criatura revelada', () => {
    const state = new GameState(bundleWithOptionalFeatures()); state.changeScene('open-floor');
    expect(state.startCombat()).toBe(false);
    state.claim('a'.repeat(32), 'socket-a', 'alpha'); state.creature!.visible = true;
    expect(state.startCombat()).toBe(true);
    expect(state.publicSnapshot().combat).toMatchObject({ active: true, round: 0, currentId: null });
    expect(state.nextCombatTurn()).toBe(false);
    confirmInitiative(state, [{ id: 'alpha', initiative: 20 }, { id: 'test-beast', initiative: 0 }]);
    expect(state.publicSnapshot().combat).toMatchObject({ active: true, round: 1, currentId: 'alpha' });
    expect(state.publicSnapshot().entities.find(entity => entity.id === 'alpha')).toMatchObject({ hp: 10, maxHp: 10 });
    expect(state.nextCombatTurn()).toBe(true); expect(state.publicSnapshot().combat.currentId).toBe('test-beast');
  });

  it('limita cada turno a la velocidad en casillas y obliga al DM a mover por el grid', () => {
    const state = new GameState(bundleWithOptionalFeatures()); state.changeScene('open-floor');
    state.claim('a'.repeat(32), 'socket-a', 'alpha'); state.creature!.visible = true;
    expect(state.startCombat()).toBe(true);
    confirmInitiative(state, [{ id: 'alpha', initiative: 20 }, { id: 'test-beast', initiative: 0 }]);
    const alpha = state.characters.get('alpha')!;
    for (let step = 0; step < 6; step++) { expect(state.startStep(alpha, step % 2 ? 'west' : 'east', step * 1_000)).toBe(true); alpha.step = null; alpha.moving = false; }
    expect(state.publicSnapshot().combat.movement).toMatchObject({ actorId: 'alpha', maximumSquares: 6, spentSquares: 6, remainingSquares: 0 });
    expect(state.startStep(alpha, 'east', 9_000)).toBe(false);
    expect(state.nextCombatTurn()).toBe(true);
    expect(state.moveEntityOneSquare('test-beast', { col: 4, row: 4 })).toBe('GRID_STEP_REQUIRED');
    for (let step = 0; step < 6; step++) expect(state.moveEntityOneSquare('test-beast', { col: step % 2 ? 6 : 5, row: 4 })).toBe('MOVED');
    expect(state.moveEntityOneSquare('test-beast', { col: 5, row: 4 })).toBe('MOVEMENT_SPENT');
  });

  it('resuelve una acción contra CA, descuenta PG y deja fuera de combate al objetivo a cero', () => {
    const state = new GameState(bundleWithOptionalFeatures()); state.changeScene('open-floor');
    state.claim('a'.repeat(32), 'socket-a', 'alpha'); state.creature!.visible = true;
    expect(state.startCombat()).toBe(true);
    confirmInitiative(state, [{ id: 'alpha', initiative: 20 }, { id: 'test-beast', initiative: 0 }]);
    expect(state.resolveAttack('alpha', 'test-beast', 'basic-attack', { attack: 20, damage: 4 })).toMatchObject({ ok: true, code: 'ATTACK_RESOLVED' });
    const combat = state.publicSnapshot().combat;
    expect(combat.participants.find(participant => participant.id === 'test-beast')).toMatchObject({ hp: 0, active: false });
    expect(combat.lastEvent?.text).toContain('queda fuera de combate');
    expect(combat.lastEvent?.text).not.toContain('CA');
  });

  it('no genera una tirada de combate cuando no se le facilita un dado físico', () => {
    const state = new GameState(bundleWithOptionalFeatures()); state.changeScene('open-floor');
    state.claim('a'.repeat(32), 'socket-a', 'alpha'); state.creature!.visible = true;
    expect(state.startCombat()).toBe(true);
    confirmInitiative(state, [{ id: 'alpha', initiative: 20 }, { id: 'test-beast', initiative: 0 }]);
    expect(state.resolveAttack('alpha', 'test-beast', 'basic-attack')).toMatchObject({ ok: false, code: 'ROLL_REQUIRED' });
    expect(state.publicSnapshot().combat.pending).toBeUndefined();
  });

  it('entrega cada tirada únicamente al personaje que debe responder', () => {
    const state = twoPlayerCombat();
    expect(state.declareCombatAction('alpha', 'test-beast', 'basic-attack')).toMatchObject({ ok: true });
    expect(state.playerPrivate('a'.repeat(32)).combat?.prompt).toMatchObject({ actorId: 'alpha', stage: 'attack' });
    expect(state.playerPrivate('b'.repeat(32)).combat?.prompt).toBeNull();
    const prompt = state.combatPromptFor('player', 'alpha')!;
    expect(state.submitCombatRoll('player', 'beta', 'attack', prompt.id, 10)).toMatchObject({ ok: false, code: 'WRONG_ACTOR' });
  });

  it('usa un id nuevo por etapa y rechaza una respuesta de etapa anterior', () => {
    const state = twoPlayerCombat(); state.declareCombatAction('alpha', 'test-beast', 'basic-attack');
    const attackId = state.combat.pending!.id;
    expect(state.submitCombatRoll('player', 'alpha', 'attack', attackId, 20)).toMatchObject({ ok: true, code: 'DAMAGE_REQUIRED' });
    const damageId = state.combat.pending!.id;
    expect(damageId).not.toBe(attackId);
    expect(state.submitCombatRoll('player', 'alpha', 'attack', damageId, 4)).toMatchObject({ ok: false, code: 'PROMPT_STAGE_MISMATCH' });
    expect(state.submitCombatRoll('player', 'alpha', 'damage', attackId, 4)).toMatchObject({ ok: false, code: 'PROMPT_STALE' });
  });

  it('no permite pasar turno con una resolución pendiente ni acepta cero en un d4', () => {
    const state = twoPlayerCombat(); state.declareCombatAction('alpha', 'test-beast', 'basic-attack');
    expect(state.nextCombatTurn()).toBe(false);
    expect(state.submitCombatRoll('player', 'alpha', 'attack', state.combat.pending!.id, 20)).toMatchObject({ ok: true });
    expect(state.submitCombatRoll('player', 'alpha', 'damage', state.combat.pending!.id, 0)).toMatchObject({ ok: false, code: 'INVALID_DAMAGE_DICE' });
  });

  it('redacta la fórmula del monstruo en eventos para jugador y proyector', () => {
    const state = twoPlayerCombat();
    for (let i = 0; state.publicSnapshot().combat.currentId !== 'test-beast' && i < 4; i++) state.nextCombatTurn();
    state.creature!.attacks[0]!.label = 'Mordisco secreto · +99 · 9d9+9';
    expect(state.declareCombatAction('test-beast', 'alpha', 'basic-attack')).toMatchObject({ ok: true });
    expect(state.submitCombatRoll('dm', null, 'attack', state.combat.pending!.id, 1)).toMatchObject({ ok: true, code: 'ATTACK_MISSED' });
    expect(state.publicSnapshot().combat.lastEvent?.text).toContain('+99');
    expect(state.publicSnapshot(true).combat.lastEvent?.text).toBe('Bestia ataca: falla.');
  });

  it('aplica un rasgo de ataque furtivo a un PJ sintético sin depender de nombres D8', () => {
    const state = twoPlayerCombat(), alpha = state.characters.get('alpha')!, beast = state.creature!;
    alpha.combat.ruleTraits = { sneakAttackDice: '1d6' }; alpha.combat.attacks[0]!.finesse = true; beast.hp = beast.maxHp = 30;
    state.setCombatCondition('alpha', 'oculta', true, { condition: 'oculta', sourceLabel: 'Prueba sintética' });
    expect(state.declareCombatAction('alpha', 'test-beast', 'basic-attack', true)).toMatchObject({ ok: true });
    expect(state.combat.pending).toMatchObject({ useSneakAttack: true, sneakAttackDice: '1d6', advantage: 'advantage' });
    expect(state.submitCombatRoll('player', 'alpha', 'attack', state.combat.pending!.id, 20)).toMatchObject({ ok: true, code: 'DAMAGE_REQUIRED' });
    expect(state.combat.pending?.diceFormula).toBe('2d4+2d6');
    expect(state.submitCombatRoll('player', 'alpha', 'damage', state.combat.pending!.id, 4)).toMatchObject({ ok: true, code: 'ATTACK_RESOLVED' });
    expect(state.combat.sneakAttackUsed.alpha).toBe(true); expect(state.conditionsFor('alpha')).not.toContain('oculta');
  });

  it('cancela ventaja y desventaja y aplica resistencia e inmunidad al tipo de daño', () => {
    const state = twoPlayerCombat(), alpha = state.characters.get('alpha')!, beast = state.creature!;
    alpha.combat.attacks[0]!.damageType = 'fuego'; beast.hp = beast.maxHp = 30; beast.damageResistances = ['fuego'];
    state.setCombatCondition('alpha', 'envenenada', true); state.setCombatCondition('test-beast', 'restringida', true);
    expect(state.declareCombatAction('alpha', 'test-beast', 'basic-attack')).toMatchObject({ ok: true });
    expect(state.combat.pending?.advantage).toBe('normal');
    state.submitCombatRoll('player', 'alpha', 'attack', state.combat.pending!.id, 20);
    state.submitCombatRoll('player', 'alpha', 'damage', state.combat.pending!.id, 4);
    expect(beast.hp).toBe(28); // crítico 2d4=4, resistencia => 2.
    state.combat.actionUsed.alpha = false; state.combat.sneakAttackUsed.alpha = false; beast.damageResistances = []; beast.damageImmunities = ['fuego'];
    state.declareCombatAction('alpha', 'test-beast', 'basic-attack'); state.submitCombatRoll('player', 'alpha', 'attack', state.combat.pending!.id, 20); state.submitCombatRoll('player', 'alpha', 'damage', state.combat.pending!.id, 4);
    expect(beast.hp).toBe(28);
  });

  it('permite repartir las tiradas de un multiataque entre objetivos', () => {
    const state = twoPlayerCombat();
    state.creature!.attacks[0]!.attackCount = 2;
    state.setInitiative([{ id: 'test-beast', initiative: 20 }, { id: 'alpha', initiative: 10 }, { id: 'beta', initiative: 9 }]);
    while (state.publicSnapshot().combat.currentId !== 'test-beast') expect(state.nextCombatTurn()).toBe(true);
    expect(state.declareCombatAction('test-beast', 'alpha', 'basic-attack')).toMatchObject({ ok: true });
    expect(state.submitCombatRoll('dm', null, 'attack', state.combat.pending!.id, 1)).toMatchObject({ ok: true, code: 'ATTACK_MISSED' });
    expect(state.declareCombatAction('test-beast', 'beta', 'basic-attack')).toMatchObject({ ok: true, code: 'ROLL_REQUIRED' });
    expect(state.combat.pending).toMatchObject({ targetId: 'beta' });
  });

  it('guarda economía de turno y duplica movimiento al correr', () => {
    const state = twoPlayerCombat();
    const actions = state.playerPrivate('a'.repeat(32)).combat?.basicActions ?? [];
    expect(actions).toContain('magic'); expect(actions).toContain('use-object'); expect(actions).not.toContain('improvise');
    expect(state.publicSnapshot().combat.movement?.maximumSquares).toBe(6);
    expect(state.useBasicCombatAction('alpha', 'dash')).toMatchObject({ ok: true, code: 'ACTION_RESOLVED' });
    expect(state.useBasicCombatAction('alpha', 'dodge')).toMatchObject({ ok: false, code: 'ACTION_USED' });
    expect(state.publicSnapshot().combat.movement?.maximumSquares).toBe(12);
    const restored = new GameState(bundleWithOptionalFeatures()); restored.restoreDurable(state.captureDurable());
    expect(restored.combat).toMatchObject({ actionUsed: { alpha: true }, dashSquares: { alpha: 6 } });
    expect(restored.publicSnapshot().combat.movement?.maximumSquares).toBe(12);
  });

  it('interrumpe la salida del alcance con una reacción y mueve después de resolverla', () => {
    const state = twoPlayerCombat(), alpha = state.characters.get('alpha')!, beast = state.creature!;
    beast.attacks[0]!.range = { kind: 'melee', normalMeters: 1.5 };
    alpha.cell = { col: 5, row: 4 }; beast.cell = { col: 6, row: 4 };
    expect(state.startStep(alpha, 'west')).toBe(true);
    expect(alpha.cell).toEqual({ col: 5, row: 4 });
    expect(state.combat.pending).toMatchObject({ stage: 'reaction', attackerId: 'test-beast', targetId: 'alpha', opportunity: true });
    expect(state.submitCombatReaction('dm', null, state.combat.pending!.id, false)).toMatchObject({ ok: true, code: 'REACTION_DECLINED' });
    expect(alpha.cell).toEqual({ col: 4, row: 4 });
    expect(state.combat.spentSquares.alpha).toBe(1);
  });

  it('Destrabarse evita ataques de oportunidad durante todo el turno', () => {
    const state = twoPlayerCombat(), alpha = state.characters.get('alpha')!, beast = state.creature!;
    beast.attacks[0]!.range = { kind: 'melee', normalMeters: 1.5 };
    alpha.cell = { col: 5, row: 4 }; beast.cell = { col: 6, row: 4 };
    expect(state.useBasicCombatAction('alpha', 'disengage')).toMatchObject({ ok: true });
    expect(state.startStep(alpha, 'west')).toBe(true);
    expect(state.combat.pending).toBeNull();
    expect(alpha.cell).toEqual({ col: 4, row: 4 });
  });

  it('arrastrarse cuesta el doble y levantarse gasta la mitad de la velocidad sin acción', () => {
    const state = twoPlayerCombat(), alpha = state.characters.get('alpha')!;
    expect(state.changeCombatPosture('alpha', true)).toMatchObject({ ok: true, code: 'DROPPED_PRONE' });
    expect(state.startStep(alpha, 'east')).toBe(true); alpha.step = null; alpha.moving = false;
    expect(state.combat.spentSquares.alpha).toBe(2);
    expect(state.changeCombatPosture('alpha', false)).toMatchObject({ ok: true, code: 'STOOD_UP' });
    expect(state.combat.spentSquares.alpha).toBe(5);
    expect(state.combat.actionUsed.alpha).toBe(false);
  });

  it('un impacto cuerpo a cuerpo contra un PJ inconsciente es crítico y causa dos fallos de muerte', () => {
    const state = twoPlayerCombat(), alpha = state.characters.get('alpha')!, beast = state.creature!;
    alpha.cell = { col: 5, row: 4 }; beast.cell = { col: 6, row: 4 }; beast.attacks[0]!.range = { kind: 'melee', normalMeters: 1.5 };
    state.applyHitPoints('alpha', -alpha.hp);
    state.setInitiative([{ id: 'test-beast', initiative: 20 }, { id: 'alpha', initiative: 10 }, { id: 'beta', initiative: 0 }]);
    while (state.publicSnapshot().combat.currentId !== 'test-beast') expect(state.nextCombatTurn()).toBe(true);
    expect(state.declareCombatAction('test-beast', 'alpha', 'basic-attack')).toMatchObject({ ok: true });
    expect(state.submitCombatRoll('dm', null, 'attack', state.combat.pending!.id, 10)).toMatchObject({ ok: true, code: 'DAMAGE_REQUIRED' });
    expect(state.combat.pending).toMatchObject({ critical: true, diceFormula: '2d4' });
    expect(state.submitCombatRoll('dm', null, 'damage', state.combat.pending!.id, 2)).toMatchObject({ ok: true });
    expect(alpha.deathSaves.failures).toBe(2);
  });

  it('mantiene Ayudar tras alejarse y lo consume con el siguiente ataque aliado', () => {
    const state = twoPlayerCombat(), alpha = state.characters.get('alpha')!, beta = state.characters.get('beta')!, beast = state.creature!;
    alpha.cell = { col: 4, row: 4 }; beta.cell = { col: 5, row: 4 }; beast.cell = { col: 6, row: 4 };
    expect(state.setInitiative([{ id: 'beta', initiative: 20 }, { id: 'alpha', initiative: 10 }, { id: 'test-beast', initiative: 0 }])).toBe(true);
    while (state.publicSnapshot().combat.currentId !== 'beta') expect(state.nextCombatTurn()).toBe(true);
    expect(state.useBasicCombatAction('beta', 'help', 'test-beast')).toMatchObject({ ok: true });
    beta.cell = { col: 0, row: 0 };
    expect(state.nextCombatTurn()).toBe(true);
    expect(state.publicSnapshot().combat.currentId).toBe('alpha');
    expect(state.declareCombatAction('alpha', 'test-beast', 'basic-attack')).toMatchObject({ ok: true });
    expect(state.combat.pending?.advantage).toBe('advantage');
  });

  it('solicita, persiste y resuelve salvaciones de muerte físicas', () => {
    // Daño exactamente igual a los PG: queda a 0 sin el exceso que causa
    // muerte instantánea, por lo que corresponde iniciar salvaciones.
    const state = twoPlayerCombat(); state.applyHitPoints('alpha', -10);
    expect(state.characters.get('alpha')?.deathSaves).toEqual({ successes: 0, failures: 0, stable: false });
    do expect(state.nextCombatTurn()).toBe(true); while (state.publicSnapshot().combat.currentId !== 'alpha');
    expect(state.combat.pending).toMatchObject({ stage: 'death-save', attackerId: 'alpha' });
    const restored = new GameState(bundleWithOptionalFeatures()); restored.restoreDurable(state.captureDurable());
    const prompt = restored.combat.pending!;
    expect(restored.submitCombatRoll('player', 'alpha', 'death-save', prompt.id, 20)).toMatchObject({ ok: true, code: 'DEATH_SAVE_REVIVED' });
    expect(restored.characters.get('alpha')).toMatchObject({ hp: 1, deathSaves: { successes: 0, failures: 0, stable: false } });
    expect(restored.conditionsFor('alpha')).not.toContain('inconsciente');
  });

  it('rechaza bundles incoherentes antes de crear la partida', () => {
    const bundle = syntheticBundle(); bundle.public.scenes[0]!.spawns[0] = { col: 99, row: 99 };
    expect(() => compileCampaignBundle(bundle)).toThrow(/Campaña pública inválida|Spawn no transitable/);
  });
});

describe('pasos durante el movimiento', () => {
  it('no pierde un aviso de paso cuando cada casilla dura menos de 250 ms', () => {
    vi.useFakeTimers();
    const io = new Server(), server = new GameServer(io, 'dm-test', stormwreckBundle), emit = vi.fn();
    vi.spyOn(io, 'to').mockReturnValue({ emit } as never);
    const internal = server as unknown as { emitMovementSfx(entityId: string, durationMs: number): void };

    internal.emitMovementSfx('maria', 220);
    vi.advanceTimersByTime(220);
    internal.emitMovementSfx('maria', 220);

    expect(emit.mock.calls.filter(([event]) => event === 'sfx:movement')).toHaveLength(2);
  });
});

describe('movimiento y escenas', () => {
  it('sincroniza DM, proyector y jugadores al elegir un mapa desde la consola', () => {
    const server = new GameServer(new Server(), 'dm-test', syntheticBundle());
    server.state.claim('a'.repeat(32), 'socket-a', 'alpha');
    server.state.claim('b'.repeat(32), 'socket-b', 'beta');
    const result = server.applyDmCommand({ type: 'scene', commandId: crypto.randomUUID(), runtimeEpoch: server.state.runtimeEpoch, sceneEpoch: server.state.sceneEpoch, sceneId: 'workshop' } as DmCommand);

    expect(result).toMatchObject({ ok: true, code: 'APPLIED' });
    const dmView = server.state.publicSnapshot(false), projectorView = server.state.publicSnapshot(true);
    expect(dmView.sceneId).toBe('workshop');
    expect(projectorView.sceneId).toBe(dmView.sceneId);
    for (const character of server.state.characters.values()) {
      const playerView = server.state.publicSnapshot(true, character.sceneId, character.surfaceId);
      expect(character.sceneId).toBe(dmView.sceneId);
      expect(playerView.sceneId).toBe(dmView.sceneId);
      expect(playerView.entities.map(entity => entity.id)).toContain(character.id);
    }
  });

  it('no gira ni camina si el movimiento está bloqueado', () => {
    const state = new GameState(syntheticBundle()), actor = state.characters.get('alpha')!;
    expect(state.startStep(actor, 'west')).toBe(false); expect(actor.facing).toBe('north'); expect(actor.step).toBeNull();
  });

  it('calcula terreno, puerta y un único paso cardinal', () => {
    const state = new GameState(syntheticBundle()); state.changeScene('workshop'); const scene = state.currentScene();
    expect(isWalkable(scene, { col: 3, row: 2 }, state.publicObjectProps())).toBe(false);
    expect(resolveStep(scene, { col: 2, row: 2 }, 'east', state.publicObjectProps())).toBeNull();
    expect(resolveStep(scene, { col: 1, row: 1 }, 'east', state.publicObjectProps())).toEqual({ col: 2, row: 1 });
  });

  it('mantiene el paso hasta su duración configurada y luego lo completa', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-13T12:00:00Z')); const state = new GameState(syntheticBundle()); state.changeScene('open-floor'); const actor = state.characters.get('alpha')!;
    expect(state.startStep(actor, 'east')).toBe(true); vi.advanceTimersByTime(STEP_DURATION_MS - 1); state.tick(); expect(actor.step).not.toBeNull(); vi.advanceTimersByTime(1); expect(state.tick()).toContain('alpha'); expect(actor.step).toBeNull();
  });

  it('cambia epoch, reinicia pasos y conserva objetos por escena', () => {
    const state = new GameState(syntheticBundle()); state.changeScene('workshop'); objectCommand(state, { type: 'object:door', objectId: 'test-door', state: 'open' }); const revision = state.objectRevision;
    state.changeScene('open-floor'); expect(state.objectRevision).toBe(0); state.changeScene('workshop'); expect(state.objectRevision).toBe(revision); expect(state.publicObjectProps().find(prop => prop.id === 'test-door')).toMatchObject({ state: 'open' });
  });

  it('cambia también la escena que reciben los jugadores al seleccionar un mapa como DM', () => {
    const state = new GameState(syntheticBundle()), actor = state.characters.get('alpha')!;
    actor.sessionToken = 'player-session';
    expect(state.changeScene('workshop')).toBe(true);
    const playerSnapshot = state.publicSnapshot(true, actor.sceneId, actor.surfaceId);
    expect(playerSnapshot.sceneId).toBe('workshop');
    expect(playerSnapshot.entities.some(entity => entity.id === actor.id)).toBe(true);
  });
});

describe('transacciones de objetos', () => {
  it('separa, mueve y gira el timón sin dejar una copia lógica en el soporte', () => {
    const state = new GameState(bundleWithOptionalFeatures()); state.changeScene('open-floor');
    expect(state.publicSnapshot().props.filter(prop => prop.id === 'test-wheel')).toHaveLength(1);
    const detached = objectCommand(state, { type: 'object:detach', objectId: 'test-wheel', cell: { col: 4, row: 3 }, rotation: 90, outcome: 'caught' });
    expect(detached).toMatchObject({ ok: true, code: 'APPLIED', objectRevision: 1 });
    expect(state.publicSnapshot().props.filter(prop => prop.id === 'test-wheel')).toHaveLength(1);
    expect(state.publicObjectProps().find(prop => prop.id === 'test-wheel')).toMatchObject({ attachment: 'detached', state: 'caught', cell: { col: 4, row: 3 }, rotation: 90, mount: { cell: { col: 3, row: 3 } } });
    expect(isWalkable(state.currentScene(), { col: 4, row: 3 }, state.publicObjectProps())).toBe(false);
    expect(objectCommand(state, { type: 'object:transform', objectId: 'test-wheel', cell: { col: 5, row: 3 }, rotation: 270 })).toMatchObject({ ok: true, code: 'APPLIED', objectRevision: 2 });
    expect(state.publicObjectProps().find(prop => prop.id === 'test-wheel')).toMatchObject({ cell: { col: 5, row: 3 }, rotation: 270 });
  });

  it('rechaza mover el timón montado, separarlo dos veces o dejarlo sobre el soporte', () => {
    const state = new GameState(bundleWithOptionalFeatures()); state.changeScene('open-floor');
    expect(objectCommand(state, { type: 'object:transform', objectId: 'test-wheel', cell: { col: 4, row: 3 }, rotation: 0 }).code).toBe('OBJECT_ATTACHED');
    expect(objectCommand(state, { type: 'object:detach', objectId: 'test-wheel', cell: { col: 3, row: 3 }, rotation: 0, outcome: 'fallen' }).code).toBe('BLOCKED_CELL');
    expect(objectCommand(state, { type: 'object:detach', objectId: 'test-wheel', cell: { col: 4, row: 3 }, rotation: 0, outcome: 'fallen' }).ok).toBe(true);
    expect(objectCommand(state, { type: 'object:detach', objectId: 'test-wheel', cell: { col: 5, row: 3 }, rotation: 0, outcome: 'fallen' }).code).toBe('INVALID_TRANSITION');
  });
  it('mantiene locked privado, lo publica cerrado y exige desbloquear antes de abrir', () => {
    const state = new GameState(syntheticBundle()); state.changeScene('workshop'); expect(objectCommand(state, { type: 'object:door', objectId: 'test-door', state: 'locked' }).ok).toBe(true);
    expect(state.dmState().objects.find(object => object.id === 'test-door')).toMatchObject({ state: 'locked' }); expect(state.publicObjectProps().find(object => object.id === 'test-door')).toMatchObject({ state: 'closed' });
    expect(objectCommand(state, { type: 'object:door', objectId: 'test-door', state: 'open' }).code).toBe('DOOR_LOCKED');
  });

  it('cada commit y undo incrementa revisiones de objetos y mundo', () => {
    const state = new GameState(syntheticBundle()); state.changeScene('workshop'); const world = state.revision;
    expect(objectCommand(state, { type: 'object:door', objectId: 'test-door', state: 'open' }).ok).toBe(true); expect(state.objectRevision).toBe(1); expect(state.revision).toBe(world + 1);
    const entryId = state.dmState().undo.entryId!; expect(objectCommand(state, { type: 'object:undo', entryId }).ok).toBe(true); expect(state.objectRevision).toBe(2); expect(state.revision).toBe(world + 2);
  });

  it('una caja no puede ocupar el marco de una puerta abierta', () => {
    const state = new GameState(syntheticBundle()); state.changeScene('workshop'); objectCommand(state, { type: 'object:door', objectId: 'test-door', state: 'open' });
    expect(objectCommand(state, { type: 'object:transform', objectId: 'test-crate', cell: { col: 3, row: 2 }, rotation: 90 }).code).toBe('BLOCKED_CELL');
  });

  it('reserva origen y destino de un paso al editar', () => {
    const state = new GameState(syntheticBundle()); state.changeScene('workshop'); objectCommand(state, { type: 'object:door', objectId: 'test-door', state: 'open' }); const actor = state.characters.get('alpha')!;
    actor.cell = { col: 3, row: 2 }; actor.step = { from: { col: 2, row: 2 }, to: { col: 3, row: 2 }, startedAt: Date.now(), durationMs: 300 };
    expect(objectCommand(state, { type: 'object:door', objectId: 'test-door', state: 'closed' }).code).toBe('OCCUPIED_CELL');
    actor.cell = { col: 4, row: 4 }; actor.step = { from: { col: 4, row: 3 }, to: { col: 4, row: 4 }, startedAt: Date.now(), durationMs: 300 };
    expect(objectCommand(state, { type: 'object:transform', objectId: 'test-crate', cell: { col: 4, row: 3 }, rotation: 0 }).code).toBe('OCCUPIED_CELL');
  });

  it('la criatura oculta no reserva casilla y la visible sí', () => {
    const state = new GameState(bundleWithOptionalFeatures()); state.changeScene('workshop'); state.creature!.cell = { col: 4, row: 3 }; state.creature!.sceneId = state.sceneId; state.creature!.surfaceId = state.currentScene().surfaceId;
    expect(objectCommand(state, { type: 'object:transform', objectId: 'test-crate', cell: { col: 4, row: 3 }, rotation: 0 }).ok).toBe(true);
    const state2 = new GameState(bundleWithOptionalFeatures()); state2.changeScene('workshop'); state2.creature!.cell = { col: 4, row: 3 }; state2.creature!.sceneId = state2.sceneId; state2.creature!.surfaceId = state2.currentScene().surfaceId; state2.creature!.visible = true;
    expect(objectCommand(state2, { type: 'object:transform', objectId: 'test-crate', cell: { col: 4, row: 3 }, rotation: 0 }).code).toBe('OCCUPIED_CELL');
  });

  it('daña y rompe puerta y caja, dejando restos no bloqueantes', () => {
    const state = new GameState(bundleWithStructureFeatures()); state.changeScene('workshop');
    expect(objectCommand(state, { type: 'object:structure', objectId: 'test-door', structure: 'damaged' })).toMatchObject({ ok: true, code: 'APPLIED' });
    expect(objectCommand(state, { type: 'object:structure', objectId: 'test-door', structure: 'destroyed' })).toMatchObject({ ok: true, code: 'APPLIED' });
    expect(state.publicObjectProps().find(object => object.id === 'test-door')).toMatchObject({ structure: 'destroyed', state: 'open' });
    expect(isWalkable(state.currentScene(), { col: 3, row: 2 }, state.publicObjectProps())).toBe(true);
    expect(objectCommand(state, { type: 'object:door', objectId: 'test-door', state: 'closed' }).code).toBe('INVALID_TRANSITION');
    expect(objectCommand(state, { type: 'object:structure', objectId: 'test-crate', structure: 'damaged' }).ok).toBe(true);
    expect(objectCommand(state, { type: 'object:structure', objectId: 'test-crate', structure: 'destroyed' }).ok).toBe(true);
    expect(isWalkable(state.currentScene(), { col: 5, row: 2 }, state.publicObjectProps())).toBe(true);
  });

  it('permite dañar el timón montado pero exige separarlo antes de romperlo', () => {
    const state = new GameState(bundleWithStructureFeatures()); state.changeScene('open-floor');
    expect(objectCommand(state, { type: 'object:structure', objectId: 'test-wheel', structure: 'damaged' })).toMatchObject({ ok: true, code: 'APPLIED' });
    expect(objectCommand(state, { type: 'object:structure', objectId: 'test-wheel', structure: 'destroyed' }).code).toBe('INVALID_TRANSITION');
    expect(objectCommand(state, { type: 'object:detach', objectId: 'test-wheel', cell: { col: 4, row: 3 }, rotation: 180, outcome: 'fallen' }).ok).toBe(true);
    expect(objectCommand(state, { type: 'object:structure', objectId: 'test-wheel', structure: 'destroyed' })).toMatchObject({ ok: true, code: 'APPLIED' });
    expect(state.publicObjectProps().find(object => object.id === 'test-wheel')).toMatchObject({ attachment: 'detached', structure: 'destroyed', rotation: 180 });
    expect(isWalkable(state.currentScene(), { col: 4, row: 3 }, state.publicObjectProps())).toBe(true);
  });

  it('no deshace una recolocación si devolvería el objeto encima de un personaje', () => {
    const state = new GameState(syntheticBundle()); state.changeScene('workshop');
    expect(objectCommand(state, { type: 'object:transform', objectId: 'test-crate', cell: { col: 4, row: 3 }, rotation: 0 }).ok).toBe(true);
    const entryId = state.dmState().undo.entryId!, revision = state.objectRevision;
    state.characters.get('alpha')!.cell = { col: 5, row: 2 };
    expect(objectCommand(state, { type: 'object:undo', entryId }).code).toBe('OCCUPIED_CELL');
    expect(state.objectRevision).toBe(revision);
    expect(state.dmState().undo.entryId).toBe(entryId);
    expect(state.publicObjectProps().find(object => object.id === 'test-crate')).toMatchObject({ cell: { col: 4, row: 3 } });
  });

  it('un undo inválido conserva historial y revisión', () => {
    const state = new GameState(syntheticBundle()); state.changeScene('workshop'); objectCommand(state, { type: 'object:door', objectId: 'test-door', state: 'open' }); const before = state.dmState();
    const result = objectCommand(state, { type: 'object:undo', entryId: crypto.randomUUID() }); expect(result.code).toBe('UNDO_STALE'); expect(state.objectRevision).toBe(before.objectRevision); expect(state.dmState().undo).toEqual(before.undo);
  });

  it('todo rechazo de objeto identifica escena, epoch y revisión vigentes', () => {
    const state = new GameState(syntheticBundle()); state.changeScene('workshop');
    const result = state.applyObjectCommand({ type: 'object:door', commandId: crypto.randomUUID(), sceneEpoch: state.sceneEpoch - 1, objectRevision: 0, objectId: 'test-door', state: 'open' });
    expect(result).toMatchObject({ ok: false, code: 'STALE_SCENE', sceneId: 'workshop', sceneEpoch: state.sceneEpoch, objectRevision: 0 });
  });

  it('restaura un combate completo, incluidos turno, movimiento, iniciativa y estados', () => {
    const state = new GameState(bundleWithOptionalFeatures()); state.changeScene('open-floor');
    state.claim('a'.repeat(32), 'socket-a', 'alpha'); state.creature!.visible = true;
    expect(state.startCombat()).toBe(true);
    confirmInitiative(state, [{ id: 'alpha', initiative: 20 }, { id: 'test-beast', initiative: 0 }]);
    expect(state.declareCombatAction('alpha', 'test-beast', 'basic-attack')).toMatchObject({ ok: true, code: 'ROLL_REQUIRED' });
    state.combat.round = 2; state.combat.spentSquares.alpha = 3; state.conditions.alpha = ['apresada']; state.conditionSources.alpha = [{ condition: 'apresada', sourceLabel: 'Atadura de prueba' }];
    const restored = new GameState(bundleWithOptionalFeatures()); restored.restoreDurable(state.captureDurable());
    expect(restored.combat).toMatchObject({ active: true, round: 2, turnIndex: 0, spentSquares: { alpha: 3 }, pending: { stage: 'attack', attackerId: 'alpha', targetId: 'test-beast' } });
    expect(restored.conditions.alpha).toEqual(['apresada']); expect(restored.conditionSources.alpha).toEqual([{ condition: 'apresada', sourceLabel: 'Atadura de prueba' }]);
    expect(restored.combat.order).toEqual(state.combat.order); expect(restored.combat.initiative).toEqual(state.combat.initiative);
  });

  it('mantiene una condición duradera con su origen al terminar combate y cambiar de escena', () => {
    const state = new GameState(bundleWithOptionalFeatures()); state.changeScene('open-floor');
    state.claim('a'.repeat(32), 'socket-a', 'alpha'); state.creature!.visible = true; expect(state.startCombat()).toBe(true);
    confirmInitiative(state, [{ id: 'alpha', initiative: 20 }, { id: 'test-beast', initiative: 0 }]);
    expect(state.setCombatCondition('alpha', 'envenenada', true, { condition: 'envenenada', sourceId: 'test-beast', sourceLabel: 'Mordisco tóxico', durationRounds: 3 })).toBe(true);
    expect(state.endCombat()).toBe(true); expect(state.changeScene('workshop')).toBe(true);
    expect(state.conditionsFor('alpha')).toEqual(['envenenada']);
    expect(state.conditionSourcesFor('alpha')).toEqual([{ condition: 'envenenada', sourceId: 'test-beast', sourceLabel: 'Mordisco tóxico', durationRounds: 3, appliedAtRound: 1 }]);
    expect(state.publicSnapshot().entities.find(entity => entity.id === 'alpha')?.conditions).toEqual(['envenenada']);
    expect(state.playerPrivate('a'.repeat(32))).toMatchObject({ conditions: ['envenenada'], conditionSources: [{ sourceLabel: 'Mordisco tóxico' }] });
  });

  it('vacía el historial general de deshacer cuando se instala una restauración', () => {
    const io = new Server(), server = new GameServer(io, 'dm-test', bundleWithOptionalFeatures());
    const internal = server as unknown as { gameplayUndo: Array<{ label: string; payload: ReturnType<GameState['captureDurable']> }> };
    internal.gameplayUndo.push({ label: 'Cambio anterior', payload: server.state.captureDurable() });
    server.installState(new GameState(bundleWithOptionalFeatures()));
    expect(internal.gameplayUndo).toEqual([]);
  });
});
