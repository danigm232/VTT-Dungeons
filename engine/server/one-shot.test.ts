import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { oneShotBundle } from '../../campaigns/one-shot/server.js';
import { compileCampaignBundle } from './campaign.js';
import { GameState } from './game.js';

const beginCombat = (state: GameState, firstId: string) => {
  expect(state.startCombat()).toBe(true);
  expect(state.setInitiative(state.combat.participantIds.map(id => ({ id, initiative: id === firstId ? 20 : 0 })))).toBe(true);
  expect(state.setInitiativeOrder(state.combat.order, true)).toBe(true);
};

describe('independent private one-shot pack', () => {
  it('compiles six locations, both level-1 characters and hidden encounters chosen by the DM', () => {
    const compiled = compileCampaignBundle(oneShotBundle);
    expect(compiled.public.campaignId).toBe('d8-night-private');
    expect(compiled.public.scenes.map(scene => scene.id)).toEqual(['temple', 'garden', 'cafe', 'market', 'mirror', 'dinner']);
    expect(compiled.encounter?.creature.tokenId).toBe('reflection');
    expect(compiled.public.roster.map(character => character.id)).toEqual(['maria', 'aoife']);
    expect(compiled.characters.aoife?.sheet?.details?.find(section => section.title === 'Características')?.entries).toContain('FUE 10 (+0) · DES 14 (+2) · CON 14 (+2)');
    expect(compiled.characters.aoife?.sheet?.speedMeters).toBe(7.5);
    expect(compiled.characters.aoife?.combat?.attacks.find(action => action.id === 'aoife-unarmed')).toMatchObject({ attackBonus: 2, damageDice: '1d1', animationType: 'melee' });
    expect(compiled.characters.aoife?.combat?.attacks.find(action => action.id === 'aoife-shortbow')).toMatchObject({ attackBonus: 2, animationType: 'arrow' });
    expect(compiled.characters.aoife?.combat?.attacks.find(action => action.id === 'fire-bolt')?.animationType).toBe('fireProjectile');
    expect(compiled.combatProfiles?.['rose-garden-1']?.startsVisible).toBe(false);
    expect(compiled.combatProfiles?.['rose-garden-1']?.attacks.find(action => action.id === 'thorn-bite')).toMatchObject({ damageDice: '1d1', damageBonus: 0 });
    expect(compiled.combatProfiles?.['rose-garden-1']?.attacks.find(action => action.id === 'entangle')?.save).toMatchObject({ ability: 'dex', dc: 11, escapeDc: 11 });
    for (const npcId of ['fritz-garden', 'bartender-cafe', 'patron-cafe', 'woman-cafe', 'ben-market', 'margaret-market', 'boris-market']) {
      expect(compiled.combatProfiles?.[npcId]).toMatchObject({ maxHp: 4, armorClass: 10, startsInCombat: false });
      expect(compiled.combatProfiles?.[npcId]?.attacks.map(action => action.actionCost ?? 'action')).toEqual(['action', 'bonus']);
    }
    expect(compiled.public.scenes.find(scene => scene.id === 'market')?.stageActors?.map(actor => actor.label))
      .toEqual(['Ben', 'Margaret', 'Vaca', 'Boris el Carnicero']);
    for (const scene of compiled.public.scenes)
      expect(existsSync(resolve('campaigns/one-shot/public', scene.background.slice(1)))).toBe(true);
    for (const token of Object.values(compiled.public.tokens))
      expect(existsSync(resolve('campaigns/one-shot/public', token.url.slice(1)))).toBe(true);
    for (const asset of Object.values(compiled.public.tokens)) if (asset.portraitUrl)
      expect(existsSync(resolve('campaigns/one-shot/public', asset.portraitUrl.slice(1)))).toBe(true);
    expect(compiled.public.tokens['silverfarben-hotel']?.portraitUrl).toContain('silverfarben_hotel_portrait_normal.png');
    expect(compiled.public.tokens.anteros?.portraitUrl).toContain('anteros_portrait_normal.png');
    for (const animationSet of Object.values(compiled.public.tokenAnimations)) for (const animation of Object.values(animationSet)) for (const frame of animation.frames)
      expect(existsSync(resolve('campaigns/one-shot/public', frame.slice(1)))).toBe(true);
    for (const asset of Object.values(compiled.public.props)) for (const variant of Object.values(asset.variants))
      expect(existsSync(resolve('campaigns/one-shot/public', variant.url.slice(1)))).toBe(true);
  });

  it('configura el reflejo como la réplica de María y lo coloca después de ella', () => {
    const state = new GameState(oneShotBundle); state.changeScene('mirror');
    state.claim('a'.repeat(32), 'socket-maria', 'maria'); state.prepareMirrorEncounter(); state.creature!.visible = true;
    expect(state.creature).toMatchObject({ label: 'Reflejo helado de Maria Piesligeros', maxHp: 6, hp: 6, armorClass: 14, speedMeters: 7.5 });
    beginCombat(state, 'maria');
    expect(state.publicSnapshot().combat.currentId).toBe('maria');
  });

  it('trata el espejo como objeto y copia al jugador que lo activa, no al primer PJ conectado', () => {
    const state = new GameState(oneShotBundle), mariaToken = 'f'.repeat(32), silverToken = '9'.repeat(32);
    state.changeScene('mirror'); state.claim(mariaToken, 'socket-maria', 'maria'); state.claim(silverToken, 'socket-silver', 'aoife');
    state.characters.get('aoife')!.cell = { col: 16, row: 10 };
    expect(state.npcs.get('true-love-mirror')).toBeUndefined();
    expect(state.publicSnapshot().props.some(prop => prop.id === 'true-love-mirror')).toBe(true);
    expect(state.mirrorInteractionFor('aoife', 'true-love-mirror')?.nearbyLabel).toBe('Mirar en el espejo');
    state.prepareMirrorEncounter('aoife'); state.creature!.visible = true;
    expect(state.creature).toMatchObject({ label: 'Reflejo helado de Silverfarben Hotel', tokenId: 'silverfarben-hotel', mimicOfPlayerId: 'aoife' });
    expect(state.mirrorInteractionFor('aoife', 'true-love-mirror')).toBeNull();
  });

  it('configura el acercamiento y las reglas auditadas de Anteros sin automatizar el desenlace', () => {
    const state = new GameState(oneShotBundle), token = 'e'.repeat(32);
    state.claim(token, 'socket-aoife', 'aoife'); state.characters.get('aoife')!.cell = { col: 22, row: 11 };
    expect(state.playerPrivate(token)).toMatchObject({ canInteract: true, nearbyInteraction: 'Hablar con Anteros', interactionTargetId: 'anteros-temple' });
    expect(state.stageActorInteractionFor('aoife', 'anteros-temple')).toMatchObject({ responseAnimation: 'talk' });
    const anteros = state.npcs.get('anteros-temple')!;
    expect(anteros.traits).toContain('Resistencia mágica: ventaja en salvaciones contra conjuros y efectos mágicos.');
    expect(anteros.ruleTraits).toMatchObject({ magicResistance: true, flightMeters: 18 });
    expect(state.setCombatCondition('anteros-temple', 'envenenada', true)).toBe(false);
    expect(anteros.attacks.find(action => action.id === 'radiant-arrows')?.recharge).toEqual({ minimum: 6, maximum: 6 });
    expect(anteros.attacks.find(action => action.id === 'radiant-arrows')?.lockSequenceTarget).toBe(true);
    state.applyHitPoints('anteros-temple', -13);
    expect(state.npcs.get('anteros-dinner')?.hp).toBe(58);
    const restored = new GameState(oneShotBundle); restored.restoreDurable(state.captureDurable());
    expect(restored.npcs.get('anteros-dinner')?.hp).toBe(58);
  });

  it('resuelve Enredar con dados físicos, guarda la fuente y permite liberarse con CD 11', () => {
    const state = new GameState(oneShotBundle); state.changeScene('garden');
    state.claim('b'.repeat(32), 'socket-maria', 'maria');
    expect(state.setNpcVisible('rose-garden-1', true)).toBe(true);
    expect(state.setCombatParticipant('rose-garden-1', true)).toBe(true);
    const rose = state.npcs.get('rose-garden-1')!;
    state.characters.get('maria')!.cell = { col: rose.cell.col, row: rose.cell.row - 1 };
    beginCombat(state, 'rose-garden-1');
    expect(state.declareCombatAction('rose-garden-1', 'maria', 'entangle')).toMatchObject({ ok: true, code: 'ROLL_REQUIRED' });
    const savePrompt = state.combatPromptFor('player', 'maria')!;
    expect(savePrompt.stage).toBe('save');
    expect(state.playerPrivate('b'.repeat(32)).combat?.prompt).toMatchObject({ id: savePrompt.id, stage: 'save', targetId: 'maria' });
    expect(state.submitCombatRoll('player', 'maria', 'save', savePrompt.id, 0)).toMatchObject({ ok: true, code: 'SAVE_FAILED' });
    expect(state.conditions.maria).toContain('restringida');
    expect(state.conditionSources.maria?.[0]).toMatchObject({ sourceId: 'rose-garden-1', escapeDc: 11, endsWhenSourceDefeated: true });
    while (state.publicSnapshot().combat.currentId !== 'maria') expect(state.nextCombatTurn()).toBe(true);
    expect(state.declareEscape('maria')).toMatchObject({ ok: true, code: 'ROLL_REQUIRED' });
    const escapePrompt = state.combatPromptFor('player', 'maria')!;
    expect(escapePrompt.stage).toBe('escape');
    expect(state.submitCombatRoll('player', 'maria', 'escape', escapePrompt.id, 11)).toMatchObject({ ok: true, code: 'ESCAPE_SUCCESS' });
    expect(state.conditionsFor('maria')).not.toContain('restringida');
  });

  it('pide D20 y después daño al usar un arco corto; no resuelve el ataque al pulsar la acción', () => {
    const state = new GameState(oneShotBundle); const token = 'c'.repeat(32);
    state.claim(token, 'socket-aoife', 'aoife');
    const aoife = state.characters.get('aoife')!, anteros = state.npcs.get('anteros-temple')!;
    aoife.cell = { col: 14, row: 16 }; anteros.cell = { col: 15, row: 16 };
    beginCombat(state, 'aoife');
    expect(state.declareCombatAction('aoife', 'anteros-temple', 'aoife-shortbow')).toMatchObject({ ok: true, code: 'ROLL_REQUIRED' });
    const attackPrompt = state.playerPrivate(token).combat?.prompt;
    expect(attackPrompt).toMatchObject({ stage: 'attack', targetId: 'anteros-temple' });
    expect(attackPrompt?.instruction).toContain('resultado natural');
    expect(state.submitCombatRoll('player', 'aoife', 'attack', attackPrompt!.id, 20)).toMatchObject({ ok: true, code: 'DAMAGE_REQUIRED' });
    const damagePrompt = state.playerPrivate(token).combat?.prompt;
    expect(damagePrompt).toMatchObject({ stage: 'damage' });
    const before = anteros.hp;
    expect(state.submitCombatRoll('player', 'aoife', 'damage', damagePrompt!.id, 6)).toMatchObject({ ok: true, code: 'ATTACK_RESOLVED' });
    expect(anteros.hp).toBe(before - 8);
  });

  it('resuelve los tres dardos de Misil mágico sin D20 y permite repartirlos', () => {
    const state = new GameState(oneShotBundle); const token = 'd'.repeat(32);
    state.claim(token, 'socket-aoife', 'aoife');
    const aoife = state.characters.get('aoife')!, anteros = state.npcs.get('anteros-temple')!;
    aoife.cell = { col: 14, row: 16 }; anteros.cell = { col: 15, row: 16 };
    beginCombat(state, 'aoife');
    expect(state.declareCombatAction('aoife', 'anteros-temple', 'magic-missile')).toMatchObject({ ok: true, code: 'ROLL_REQUIRED' });
    const prompt = state.playerPrivate(token).combat?.prompt;
    expect(prompt).toMatchObject({ stage: 'damage', targetId: 'anteros-temple' });
    expect(state.submitCombatRoll('player', 'aoife', 'damage', prompt!.id, 2)).toMatchObject({ ok: true, code: 'ATTACK_RESOLVED' });
    expect(aoife.combat.resources['spell-slot-1']).toMatchObject({ current: 2, max: 2 });
    expect(state.declareCombatAction('aoife', 'anteros-temple', 'magic-missile')).toMatchObject({ ok: true, code: 'ROLL_REQUIRED' });
    expect(state.submitCombatRoll('player', 'aoife', 'damage', state.combat.pending!.id, 3)).toMatchObject({ ok: true, code: 'ATTACK_RESOLVED' });
    expect(state.declareCombatAction('aoife', 'anteros-temple', 'magic-missile')).toMatchObject({ ok: true, code: 'ROLL_REQUIRED' });
    expect(state.submitCombatRoll('player', 'aoife', 'damage', state.combat.pending!.id, 4)).toMatchObject({ ok: true, code: 'ATTACK_RESOLVED' });
    expect(aoife.combat.resources['spell-slot-1']).toMatchObject({ current: 1, max: 2 });
    const durable = state.captureDurable(), restored = new GameState(oneShotBundle); restored.restoreDurable(durable);
    expect(restored.characters.get('aoife')?.combat.resources['spell-slot-1']?.current).toBe(1);
  });

  it('declara Nube de niebla sobre una casilla, no sobre una ficha', () => {
    const state = new GameState(oneShotBundle);
    state.claim('e'.repeat(32), 'socket-aoife', 'aoife');
    const aoife = state.characters.get('aoife')!, anteros = state.npcs.get('anteros-temple')!;
    aoife.cell = { col: 14, row: 16 }; anteros.cell = { col: 15, row: 16 };
    beginCombat(state, 'aoife');
    expect(state.declareCombatAction('aoife', undefined, 'fog-cloud', false, { col: 16, row: 16 })).toMatchObject({ ok: true, code: 'GUIDED_RESOLUTION' });
    expect(aoife.combat.resources['spell-slot-1']).toMatchObject({ current: 1, max: 2 });
    expect(state.concentration.aoife?.actionId).toBe('fog-cloud');
    expect(state.publicSnapshot().combat.lastEvent?.text).toContain('casilla 17, 17');
  });

  it('consume de la mochila las dagas lanzadas y las antorchas utilizadas', () => {
    const state = new GameState(oneShotBundle); state.claim('1'.repeat(32), 'socket-aoife', 'aoife');
    const aoife = state.characters.get('aoife')!, anteros = state.npcs.get('anteros-temple')!; aoife.cell = { col: 14, row: 16 }; anteros.cell = { col: 15, row: 16 };
    beginCombat(state, 'aoife');
    expect(state.declareCombatAction('aoife', undefined, 'light-torch', false, { col: 14, row: 16 })).toMatchObject({ ok: true, code: 'GUIDED_RESOLUTION' });
    expect(aoife.inventory).toContain('antorchas ×1');
    state.combat.actionUsed.aoife = false;
    expect(state.declareCombatAction('aoife', 'anteros-temple', 'aoife-thrown-dagger')).toMatchObject({ ok: true });
    expect(state.submitCombatRoll('player', 'aoife', 'attack', state.combat.pending!.id, 1)).toMatchObject({ ok: true, code: 'ATTACK_MISSED' });
    expect(aoife.inventory).toContain('dagas ×3');
  });

  it('limita a un espacio de conjuro por turno y permite otro en un turno posterior', () => {
    const state = new GameState(oneShotBundle); state.claim('f'.repeat(32), 'socket-aoife', 'aoife');
    const aoife = state.characters.get('aoife')!, anteros = state.npcs.get('anteros-temple')!; aoife.cell = { col: 14, row: 16 }; anteros.cell = { col: 15, row: 16 };
    beginCombat(state, 'aoife');
    expect(state.declareCombatAction('aoife', undefined, 'fog-cloud', false, { col: 16, row: 16 })).toMatchObject({ ok: true });
    state.combat.actionUsed.aoife = false;
    expect(state.declareCombatAction('aoife', 'aoife', 'feather-fall')).toMatchObject({ ok: false, code: 'SPELL_SLOT_USED_THIS_TURN' });
    do expect(state.nextCombatTurn()).toBe(true); while (state.publicSnapshot().combat.currentId !== 'aoife');
    expect(state.declareCombatAction('aoife', 'aoife', 'feather-fall')).toMatchObject({ ok: true });
  });

  it('solicita salvación de Constitución al dañar a quien se concentra', () => {
    const state = new GameState(oneShotBundle); state.claim('g'.repeat(32), 'socket-aoife', 'aoife');
    const aoife = state.characters.get('aoife')!, anteros = state.npcs.get('anteros-temple')!; aoife.cell = { col: 14, row: 16 }; anteros.cell = { col: 15, row: 16 };
    beginCombat(state, 'aoife'); state.setInitiative([{ id: 'aoife', initiative: 20 }, { id: 'anteros-temple', initiative: 10 }]);
    state.declareCombatAction('aoife', undefined, 'fog-cloud', false, { col: 16, row: 16 });
    expect(state.nextCombatTurn()).toBe(true);
    state.declareCombatAction('anteros-temple', 'aoife', 'longsword');
    state.submitCombatRoll('dm', null, 'attack', state.combat.pending!.id, 20);
    state.submitCombatRoll('dm', null, 'damage', state.combat.pending!.id, 4);
    expect(state.combat.pending).toMatchObject({ stage: 'concentration', attackerId: 'aoife', concentrationDc: 10 });
    expect(state.submitCombatRoll('player', 'aoife', 'concentration', state.combat.pending!.id, 9)).toMatchObject({ ok: true, code: 'CONCENTRATION_BROKEN' });
    expect(state.concentration.aoife).toBeUndefined();
  });

  it('lanza rituales y conjuros de punto fuera de combate con sus recursos correctos', () => {
    const state = new GameState(oneShotBundle); state.claim('h'.repeat(32), 'socket-aoife', 'aoife'); const aoife = state.characters.get('aoife')!;
    aoife.cell = { col: 14, row: 16 };
    expect(state.declareExplorationAction('aoife', undefined, 'floating-disk', { col: 16, row: 16 })).toMatchObject({ ok: true });
    expect(aoife.combat.resources['spell-slot-1']?.current).toBe(2);
    expect(state.declareExplorationAction('aoife', undefined, 'fog-cloud-exploration', { col: 16, row: 16 })).toMatchObject({ ok: true });
    expect(aoife.combat.resources['spell-slot-1']?.current).toBe(1);
    expect(state.concentration.aoife?.actionId).toBe('fog-cloud-exploration');
  });

  it('recupera un guardado legado de D8 con la antigua plantilla y una casilla de PNJ reclasificada', () => {
    const original = new GameState(oneShotBundle); original.changeScene('mirror');
    const payload = original.captureDurable();
    const mirrorScene = payload.scenes.find(scene => scene.sceneId === 'mirror')!;
    mirrorScene.objects = []; // save created before the mirror was an object
    const maria = payload.characters.find(character => character.id === 'maria')!;
    payload.characters.push({ ...structuredClone(maria), id: 'mia' }, { ...structuredClone(maria), id: 'mike' });
    payload.npcs = payload.npcs!.filter(npc => !npc.id.startsWith('rose-'));
    const legacyMirror = structuredClone(payload.npcs[0]!);
    payload.npcs.push({ ...legacyMirror, id: 'true-love-mirror', sceneId: 'mirror', surfaceId: 'ice', cell: { col: 17, row: 10 } });
    const boris = payload.npcs.find(npc => npc.id === 'boris-market')!;
    boris.cell = { col: 25, row: 12 }; // antiguo puesto verde, ahora bloqueado.

    const restored = new GameState(oneShotBundle); restored.restoreDurable(payload);
    expect(restored.currentScene().id).toBe('mirror');
    expect([...restored.characters.keys()]).toEqual(['maria', 'aoife']);
    expect(restored.characters.get('aoife')?.surfaceId).toBe('ice');
    expect(restored.npcs.get('boris-market')?.cell).not.toEqual({ col: 25, row: 12 });
    expect(restored.npcs.get('rose-garden-1')).toBeDefined();
    expect(restored.publicSnapshot().props.some(prop => prop.id === 'true-love-mirror')).toBe(true);
  });
});
