import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { d8VillageRoads, oneShotBundle } from '../../campaigns/one-shot/server.js';
import { D8NIGHT, D8_VERSION } from '../../campaigns/one-shot/playground/d8night.config.js';
import { d8PublicRendererConfig } from '../../campaigns/one-shot/renderer-config.js';
import { supportsCameraOrientation } from '../shared/camera.js';
import { basicCombatActionAnimationStates, explorationBasicActionCatalogue } from '../shared/protocol.js';
import { compileCampaignBundle } from './campaign.js';
import { GameState } from './game.js';
import { STEP_DURATION_MS, type Facing } from '../shared/protocol.js';
import { surfaceNeighbors } from '../shared/terrain.js';

const beginCombat = (state: GameState, firstId: string) => {
  expect(state.startCombat()).toBe(true);
  expect(state.setInitiative(state.combat.participantIds.map(id => ({ id, initiative: id === firstId ? 20 : 0 })))).toBe(true);
  expect(state.setInitiativeOrder(state.combat.order, true)).toBe(true);
};

describe('protección de la pasada artística aprobada', () => {
  it('conserva el contenido jugable mientras el horizonte de Cena y Templo evoluciona', () => {
    expect(D8NIGHT.maps.dinner.MAP.objects.some((object: any) => object.asset === 'patio_round')).toBe(true);
    expect(D8NIGHT.maps.temple.MAP.objects.some((object: any) => object.asset === 'temple_gate')).toBe(true);
    expect(D8NIGHT.maps.dinner.VTT_AMBIENCE.horizon.style).toBe('estate');
    expect(D8NIGHT.maps.temple.VTT_AMBIENCE.horizon.style).toBe('coast');
  });

  it('mantiene escenarios nativos y presupuestos limitados de luz en los cuatro mapas', () => {
    for (const id of ['cafe', 'garden', 'market', 'mirror']) {
      const map = D8NIGHT.maps[id];
      expect(map.MAP.enableVisualComposition).toBe(false);
      expect(map.MAP.navigation.bounds).toHaveLength(4);
      expect(map.VTT_AMBIENCE.visual.maxMaterialLights).toBe(8);
      expect(map.VTT_AMBIENCE.visual.maxRealPointLights).toBeLessThanOrEqual(13);
      expect(map.camera.alpha).toBeGreaterThan(0);
    }
  });
});
const nearbyWalkableCell = (sceneId: string, center: { col: number; row: number }, excluded: { col: number; row: number }[] = []) => {
  const scene = oneShotBundle.public.scenes.find(candidate => candidate.id === sceneId)!;
  const excludedKeys = new Set(excluded.map(cell => `${cell.col},${cell.row}`));
  return [...scene.walkable].filter(cell => !excludedKeys.has(`${cell.col},${cell.row}`))
    .sort((a, b) => Math.abs(a.col - center.col) + Math.abs(a.row - center.row)
      - Math.abs(b.col - center.col) - Math.abs(b.row - center.row) || a.row - b.row || a.col - b.col)[0]!;
};
const placeAoifeNearNpc = (state: GameState, npcId = 'anteros-temple') => {
  const aoife = state.characters.get('aoife')!, npc = state.npcs.get(npcId)!;
  aoife.cell = nearbyWalkableCell(npc.sceneId, npc.cell, [npc.cell]);
  return aoife.cell;
};

describe('independent private one-shot pack', () => {
  it('une Templo, Café y Mercado solo tras recorrer cinco casillas de sus caminos extendidos, en ambos sentidos', () => {
    for(const road of d8VillageRoads)for(const reverse of [false,true]){
      const state=new GameState(oneShotBundle);state.claim('a'.repeat(32),'socket-road','maria');
      const from=reverse?road.to:road.from,to=reverse?road.from:road.to;state.changeScene(from.mapId);
      const scene=state.currentScene(),key=(cell:{col:number;row:number})=>`${cell.col},${cell.row}`;
      const queue=[scene.spawns[0]!],parents=new Map<string,{col:number;row:number}|null>([[key(queue[0]!),null]]);
      for(let i=0;i<queue.length&&!parents.has(key(from.cell));i++)for(const address of surfaceNeighbors(scene.terrain!,{surfaceId:scene.surfaceId,cell:queue[i]!})){
        if(!parents.has(key(address.cell))){parents.set(key(address.cell),queue[i]!);queue.push(address.cell);}
      }
      const path=[from.cell];while(parents.get(key(path[0]!)))path.unshift(parents.get(key(path[0]!))!);
      expect(path.length).toBeGreaterThan(6);const approach=path.slice(-6),maria=state.characters.get('maria')!;maria.cell={...approach[0]!};
      for(let i=1;i<approach.length;i++){const next=approach[i]!,dx=next.col-maria.cell.col,dy=next.row-maria.cell.row;
        const horizontal=dx>0?'east':dx<0?'west':'',vertical=dy>0?'south':dy<0?'north':'';
        const facing=(horizontal&&vertical?`${vertical}-${horizontal}`:horizontal||vertical) as Facing;
        expect(state.startStep(maria,facing)).toBe(true);maria.step!.startedAt=Date.now()-STEP_DURATION_MS-1;state.tick();
        if(i<5)expect(maria.sceneId).toBe(from.mapId);
      }
      expect(maria.sceneId).toBe(to.mapId);expect(maria.cell).toEqual(to.cell);
      const restored=new GameState(oneShotBundle);expect(()=>restored.restoreDurable(state.captureDurable())).not.toThrow();
      expect(restored.characters.get('maria')!.cell).toEqual(to.cell);
    }
  });

  it('mantiene el templo nativo, su eje de acceso y la decoración de fondo fuera del tablero', () => {
    const temple = D8NIGHT.maps.temple;
    expect(temple.MAP.enableVisualComposition).toBe(false);
    expect(temple.camera.alpha).toBeGreaterThan(0);
    expect(temple.MAP.objects.filter((object: any) => object.asset === 'temple_floor')).toHaveLength(3);
    for (const asset of ['bridge', 'stairs', 'temple_gate', 'long_table', 'statue', 'temple_sanctuary_details']) {
      expect(temple.MAP.objects.some((object: any) => object.asset === asset)).toBe(true);
    }
    expect(temple.MAP.objects.filter((object: any) => object.asset === 'temple_window')).toHaveLength(8);
    const woodland = temple.MAP.objects.filter((object: any) => object.asset === 'temple_tree' && object.position[1] < -14);
    expect(woodland).toHaveLength(14);
    expect(woodland.every((object: any) => object.position[1] < temple.MAP.navigation.bounds[2])).toBe(true);
  });

  it('sirve los mapas de Babylon sin enviar CANON ni interacciones privadas al navegador', () => {
    const renderer = d8PublicRendererConfig();
    const serialized = JSON.stringify(renderer);
    expect(renderer.version).toBe(D8_VERSION);
    expect(Object.keys(renderer.maps).sort()).toEqual(['cafe', 'dinner', 'garden', 'market', 'mirror', 'temple']);

    const forbiddenKeys: string[] = [];
    const visit = (value: unknown) => {
      if (!value || typeof value !== 'object') return;
      for (const [key, child] of Object.entries(value)) {
        if (/canon|secret|interact|dialog|message|story|reveal|trigger|narrative|spoiler/i.test(key)) forbiddenKeys.push(key);
        visit(child);
      }
    };
    visit(renderer);
    expect(forbiddenKeys).toEqual([]);

    const publicStrings = new Set<string>();
    const collect = (value: unknown, result: Set<string>) => {
      if (typeof value === 'string') result.add(value);
      else if (Array.isArray(value)) value.forEach(item => collect(item, result));
      else if (value && typeof value === 'object') Object.values(value).forEach(item => collect(item, result));
    };
    collect(renderer, publicStrings);
    const secretOnlyStrings: string[] = [];
    for (const map of Object.values(D8NIGHT.maps) as any[]) collect(map.CANON, {
      add(value: string) { if (value.length > 20 && !publicStrings.has(value)) secretOnlyStrings.push(value); }
    } as Set<string>);
    expect(secretOnlyStrings.some(secret => serialized.includes(secret))).toBe(false);
    expect(Object.values(renderer.maps).every((map: any) => map.MAP.objects.length > 0)).toBe(true);
  });

  it('compiles six locations, both level-1 characters and hidden encounters chosen by the DM', () => {
    const compiled = compileCampaignBundle(oneShotBundle);
    expect(compiled.public.campaignId).toBe('d8-night-private');
    expect(compiled.public.scenes.map(scene => scene.id)).toEqual(['temple', 'garden', 'cafe', 'market', 'mirror', 'dinner']);
    for (const scene of compiled.public.scenes) {
      expect(scene.renderer).toBe('babylon-d8');
      expect(supportsCameraOrientation(scene)).toBe(true);
      const legal = new Set(scene.walkable.map(cell => `${cell.col},${cell.row}`));
      const starts = [...scene.spawns, ...(scene.stageActors ?? []).map(actor => actor.cell), ...scene.props.map(prop => prop.cell)];
      expect(scene.walkable.length).toBeGreaterThan(20);
      expect(starts.every(cell => legal.has(`${cell.col},${cell.row}`))).toBe(true);
      expect(starts.every(cell => cell.col >= 0 && cell.row >= 0 && cell.col < scene.grid.cols && cell.row < scene.grid.rows)).toBe(true);
      expect((scene.stageActors ?? []).every(actor => !scene.spawns.some(spawn => spawn.col === actor.cell.col && spawn.row === actor.cell.row))).toBe(true);
    }
    expect(compiled.encounter?.creature.tokenId).toBe('reflection');
    expect(compiled.public.roster.map(character => character.id)).toEqual(['maria', 'aoife']);
    expect(compiled.characters.aoife?.sheet?.details?.find(section => section.title === 'Características')?.entries).toContain('FUE 10 (+0) · DES 14 (+2) · CON 14 (+2)');
    expect(compiled.characters.maria?.sheet).toMatchObject({ strengthScore: 8 });
    expect(compiled.characters.maria?.sheet?.details?.find(section => section.title === 'Datos confirmados')?.entries)
      .toContain('FUE 8 (−1) · DES 16 (+3) · CON 12 (+1) · INT 13 (+1) · SAB 10 (+0) · CAR 16 (+3)');
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
    for (const animationSet of Object.values(compiled.public.tokenAnimations)) for (const animation of Object.values(animationSet)) for (const frame of animation.frames) {
      const url = typeof frame === 'string' ? frame : frame.url;
      expect(existsSync(resolve('campaigns/one-shot/public', url.slice(1)))).toBe(true);
    }
    for (const asset of Object.values(compiled.public.props)) for (const variant of Object.values(asset.variants))
      expect(existsSync(resolve('campaigns/one-shot/public', variant.url.slice(1)))).toBe(true);
  });

  it('calcula el salto de Silverfarben y de María con la FUE transcrita de sus fichas', () => {
    const state = new GameState(oneShotBundle), silver = state.characters.get('aoife')!, maria = state.characters.get('maria')!;
    const scene = oneShotBundle.public.scenes.find(candidate => candidate.id === silver.sceneId)!;
    const direction = silver.cell.col + 3 < scene.grid.width ? 1 : -1;
    const withinStrength = { col: silver.cell.col + direction * 2, row: silver.cell.row };
    const beyondStrength = { col: silver.cell.col + direction * 3, row: silver.cell.row };

    expect(silver.sheet?.strengthScore).toBe(10);
    expect(state.declareExplorationBasicAction('aoife', 'jump', undefined, withinStrength)).toMatchObject({
      ok: true, guidance: expect.stringContaining('largo 10 pies (3 m) con carrera')
    });
    expect(state.declareExplorationBasicAction('aoife', 'jump', undefined, beyondStrength)).toMatchObject({ ok: false, code: 'JUMP_OUT_OF_RANGE' });
    expect(maria.sheet?.strengthScore).toBe(8);
  });

  it('anima caminar y correr de Silverfarben en los ocho rumbos sin perder orientación', () => {
    const movement = oneShotBundle.public.tokenAnimations['silverfarben-hotel']!;
    expect(movement['moving-s']).toMatchObject({ fps: 8, frames: expect.arrayContaining(['/art/tokens/Silverfarben Hotel/silverfarben_hotel_caminar_01.png']) });
    for (const direction of ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']) {
      expect(movement[`moving-${direction}`]?.frames).toHaveLength(4);
      expect(movement[`running-${direction}`]).toMatchObject({ fps: 10, frames: expect.any(Array) });
      expect(movement[`running-${direction}`]?.frames).toHaveLength(4);
    }
    expect(movement['moving-sw']).toMatchObject({ flipX: true, frames: expect.any(Array) });
    expect(movement['moving-nw']).toMatchObject({ flipX: true, frames: expect.any(Array) });
    expect(movement['moving-w']).toMatchObject({ flipX: true, frames: expect.any(Array) });
    expect(movement['running-sw']).toMatchObject({ flipX: true, frames: expect.any(Array) });
    expect(movement['running-nw']).toMatchObject({ flipX: true, frames: expect.any(Array) });
    expect(movement['running-w']).toMatchObject({ flipX: true, frames: expect.any(Array) });
    for (const state of ['moving-n', 'moving-ne', 'moving-e', 'running-n', 'running-ne', 'running-e']) {
      for (const frame of movement[state]!.frames) {
        expect(typeof frame).not.toBe('string');
        if (typeof frame !== 'string') {
          expect(frame.url).toContain(state.startsWith('moving-') ? 'walk_orientations_atlas.png' : 'run_orientations_atlas.png');
          expect(frame.x + frame.width).toBeLessThanOrEqual(state.startsWith('moving-') ? 1448 : 1122);
          expect(frame.y + frame.height).toBeLessThanOrEqual(state.startsWith('moving-') ? 1086 : 1402);
          expect(frame.logicalWidth).toBeGreaterThan(0);
          expect(frame.logicalHeight).toBeGreaterThan(0);
          expect(frame.logicalWidth!/frame.logicalHeight!).toBeCloseTo(frame.width/frame.height,2);
          expect(frame.alphaSeeds?.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('conecta acciones universales y ataques con sus ciclos visuales reales', () => {
    const animations = oneShotBundle.public.tokenAnimations['silverfarben-hotel']!;
    const declaredStates = [
      ...Object.values(explorationBasicActionCatalogue).map(action => action.animation),
      ...Object.values(basicCombatActionAnimationStates)
    ];
    for (const state of new Set(declaredStates)) {
      if (state === 'disengage') {
        for (const direction of ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'])
          expect(animations[`direction-${direction}`]).toBeDefined();
      } else expect(animations[state]).toBeDefined();
    }
    expect(animations.attack?.frames).toHaveLength(4);
    expect(animations['attack-arrow']?.frames).toHaveLength(4);
    expect(animations['attack-arrow-mirrored']).toMatchObject({ flipX: true, frames: expect.any(Array) });
    expect(animations['attack-throw']?.frames).toHaveLength(4);
    expect(animations['attack-throw-mirrored']).toMatchObject({ flipX: true, frames: expect.any(Array) });
    expect(animations.prone?.frames).toHaveLength(1);
    expect(animations.crawl?.frames).toHaveLength(4);
    expect(animations.defeated?.frames).toEqual([
      '/art/tokens/Silverfarben Hotel/silverfarben_hotel_derrotada.png'
    ]);
  });

  it('asigna a cada PNJ de D8 Night sus ciclos propios de movimiento, interacción y ataque', () => {
    const animations = oneShotBundle.public.tokenAnimations;
    const framesAtRow = (tokenId: string, state: string) => animations[tokenId]?.[state]?.frames.map(frame =>
      typeof frame === 'string' ? null : frame.y);

    expect(framesAtRow('anteros', 'moving')).toEqual([0, 0, 0, 0]);
    expect(framesAtRow('anteros', 'talk')).toEqual([280, 280, 280, 280]);
    expect(framesAtRow('anteros', 'attack')).toEqual([0, 0, 0, 0]);
    expect(framesAtRow('anteros', 'attack-arrow')).toEqual([362, 362, 362, 362]);
    expect(framesAtRow('anteros', 'spell')).toEqual([724, 724, 724, 724]);
    expect(animations.anteros?.defeated?.frames).toEqual(['/art/tokens/Anteros/anteros_defeated.png']);
    expect(animations['anteros-dinner']?.idle?.frames).toEqual(['/art/tokens/Anteros/anteros_dinner_idle.png']);
    expect(framesAtRow('anteros-dinner', 'react')).toEqual([1121, 1121, 1121, 1121]);

    expect(framesAtRow('patron-woman', 'talk')).toEqual([0, 0, 0, 0]);
    expect(framesAtRow('patron-woman', 'moving')).toEqual([362, 362, 362, 362]);
    expect(animations['patron-woman']?.hit?.frames).toHaveLength(4);
    expect(animations['patron-woman']?.hit?.frames.every(frame => typeof frame !== 'string' && frame.url.includes('generated-20261003/patron-woman-motion.png'))).toBe(true);
    expect(framesAtRow('bartender', 'serve')).toEqual([623, 623, 623, 623]);
    expect(framesAtRow('patron', 'moving')).toEqual([1086, 1086, 1086, 1086]);

    for (const [tokenId, row] of [['fritz', 0], ['ben', 303], ['margaret', 607], ['boris', 910]] as const)
      expect(framesAtRow(tokenId, 'attack')).toEqual(Array(4).fill(row));
    for (const tokenId of ['fritz', 'roses', 'patron-woman', 'bartender', 'patron', 'ben', 'margaret', 'boris', 'cow'])
      expect(animations[tokenId]?.idle?.frames.length).toBeGreaterThan(0);
  });

  it('recupera la FUE de María del perfil de campaña al abrir un guardado anterior', () => {
    const source = new GameState(oneShotBundle), saved = structuredClone(source.captureDurable());
    const mariaSave = saved.characters.find(character => character.id === 'maria')!;
    delete mariaSave.sheet?.strengthScore;
    const restored = new GameState(oneShotBundle);
    restored.restoreDurable(saved);
    expect(restored.characters.get('maria')?.sheet?.strengthScore).toBe(8);
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
    state.characters.get('aoife')!.cell = oneShotBundle.mirrorInteraction!.cells[0]!;
    expect(state.npcs.get('true-love-mirror')).toBeUndefined();
    expect(state.publicSnapshot().props.some(prop => prop.id === 'true-love-mirror')).toBe(true);
    expect(state.mirrorInteractionFor('aoife', 'true-love-mirror')?.nearbyLabel).toBe('Mirar en el espejo');
    state.prepareMirrorEncounter('aoife'); state.creature!.visible = true;
    expect(state.creature).toMatchObject({ label: 'Reflejo helado de Silverfarben Hotel', tokenId: 'silverfarben-hotel', mimicOfPlayerId: 'aoife' });
    expect(state.mirrorInteractionFor('aoife', 'true-love-mirror')).toBeNull();
  });

  it('configura el acercamiento y las reglas auditadas de Anteros sin automatizar el desenlace', () => {
    const state = new GameState(oneShotBundle), token = 'e'.repeat(32);
    state.claim(token, 'socket-aoife', 'aoife'); placeAoifeNearNpc(state);
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
    placeAoifeNearNpc(state);
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
    placeAoifeNearNpc(state);
    beginCombat(state, 'aoife');
    expect(state.declareCombatAction('aoife', 'anteros-temple', 'magic-missile')).toMatchObject({ ok: true, code: 'ROLL_REQUIRED' });
    const prompt = state.playerPrivate(token).combat?.prompt;
    expect(prompt).toMatchObject({ stage: 'damage', targetId: 'anteros-temple' });
    expect(state.submitCombatRoll('player', 'aoife', 'damage', prompt!.id, 2)).toMatchObject({ ok: true, code: 'ATTACK_RESOLVED' });
    expect(aoife.combat.resources['spell-slot-1']).toMatchObject({ current: 1, max: 2 });
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
    placeAoifeNearNpc(state);
    beginCombat(state, 'aoife');
    expect(state.declareCombatAction('aoife', undefined, 'fog-cloud', false, nearbyWalkableCell('temple', aoife.cell))).toMatchObject({ ok: true, code: 'GUIDED_RESOLUTION' });
    expect(aoife.combat.resources['spell-slot-1']).toMatchObject({ current: 1, max: 2 });
    expect(state.concentration.aoife?.actionId).toBe('fog-cloud');
    expect(state.publicSnapshot().combat.lastEvent?.text).toContain('casilla');
  });

  it('consume de la mochila las dagas lanzadas y las antorchas utilizadas', () => {
    const state = new GameState(oneShotBundle); state.claim('1'.repeat(32), 'socket-aoife', 'aoife');
    const aoife = state.characters.get('aoife')!; placeAoifeNearNpc(state);
    beginCombat(state, 'aoife');
    expect(state.declareCombatAction('aoife', undefined, 'light-torch', false, aoife.cell)).toMatchObject({ ok: true, code: 'GUIDED_RESOLUTION' });
    expect(aoife.inventory).toContain('antorchas ×1');
    state.combat.actionUsed.aoife = false;
    expect(state.declareCombatAction('aoife', 'anteros-temple', 'aoife-thrown-dagger')).toMatchObject({ ok: true });
    expect(state.submitCombatRoll('player', 'aoife', 'attack', state.combat.pending!.id, 1)).toMatchObject({ ok: true, code: 'ATTACK_MISSED' });
    expect(aoife.inventory).toContain('dagas ×3');
  });

  it('limita a un espacio de conjuro por turno y permite otro en un turno posterior', () => {
    const state = new GameState(oneShotBundle); state.claim('f'.repeat(32), 'socket-aoife', 'aoife');
    const aoife = state.characters.get('aoife')!; placeAoifeNearNpc(state);
    beginCombat(state, 'aoife');
    expect(state.declareCombatAction('aoife', undefined, 'fog-cloud', false, nearbyWalkableCell('temple', aoife.cell))).toMatchObject({ ok: true });
    state.combat.actionUsed.aoife = false;
    expect(state.declareCombatAction('aoife', 'aoife', 'feather-fall')).toMatchObject({ ok: false, code: 'SPELL_SLOT_USED_THIS_TURN' });
    do expect(state.nextCombatTurn()).toBe(true); while (state.publicSnapshot().combat.currentId !== 'aoife');
    expect(state.declareCombatAction('aoife', 'aoife', 'feather-fall')).toMatchObject({ ok: true });
  });

  it('solicita salvación de Constitución al dañar a quien se concentra', () => {
    const state = new GameState(oneShotBundle); state.claim('g'.repeat(32), 'socket-aoife', 'aoife');
    const aoife = state.characters.get('aoife')!; placeAoifeNearNpc(state);
    beginCombat(state, 'aoife'); state.setInitiative([{ id: 'aoife', initiative: 20 }, { id: 'anteros-temple', initiative: 10 }]);
    state.declareCombatAction('aoife', undefined, 'fog-cloud', false, nearbyWalkableCell('temple', aoife.cell));
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
    aoife.cell = oneShotBundle.public.scenes.find(scene => scene.id === 'temple')!.spawns[0]!;
    const target = nearbyWalkableCell('temple', aoife.cell);
    expect(state.declareExplorationAction('aoife', undefined, 'floating-disk', target)).toMatchObject({ ok: true });
    expect(aoife.combat.resources['spell-slot-1']?.current).toBe(2);
    expect(state.declareExplorationAction('aoife', undefined, 'fog-cloud-exploration', target)).toMatchObject({ ok: true });
    expect(aoife.combat.resources['spell-slot-1']?.current).toBe(1);
    expect(state.concentration.aoife?.actionId).toBe('fog-cloud-exploration');
  });

  it('recupera un guardado legado de D8 con la antigua plantilla y una casilla de PNJ reclasificada', () => {
    const original = new GameState(oneShotBundle); original.changeScene('mirror');
    const payload = original.captureDurable();
    payload.d8GridVersion = 1;
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

    const migrated = restored.captureDurable();
    expect(migrated.d8GridVersion).toBe(3);
    const restoredAgain = new GameState(oneShotBundle); restoredAgain.restoreDurable(migrated);
    expect(restoredAgain.characters.get('maria')?.cell).toEqual(restored.characters.get('maria')?.cell);
    expect(restoredAgain.npcs.get('boris-market')?.cell).toEqual(restored.npcs.get('boris-market')?.cell);
  });
});
