import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { NullEngine, Scene } from '@babylonjs/core';
import { stormwreckBundle } from '../../campaigns/stormwreck-isle/server.js';
import { wreckCellFromLocal, wreckPorts, wreckRuntimeScenes } from '../../campaigns/stormwreck-isle/public/wreck-runtime.js';
import { retreatTerrain } from '../../campaigns/stormwreck-isle/public/retreat-runtime.js';
import { buildTerrain3D } from '../client/terrain3d.js';
import { surfaceHeight, surfaceNeighbors, terrainTile } from '../shared/terrain.js';
import { basicCombatActionAnimationStates, explorationBasicActionCatalogue } from '../shared/protocol.js';
import { GameState } from './game.js';

const objectCommand = (state: GameState, command: Record<string, unknown>) => state.applyObjectCommand({
  commandId: crypto.randomUUID(), sceneEpoch: state.sceneEpoch, objectRevision: state.objectRevision, ...command
} as Parameters<GameState['applyObjectCommand']>[0]);
const finishStep = (state: GameState, characterId = 'mike') => {
  const character = state.characters.get(characterId)!;
  if (!character.step) throw new Error('No hay paso que completar');
  character.step.startedAt = Date.now() - character.step.durationMs - 1;
  state.tick();
};
const cellKey = (cell: { col: number; row: number }) => `${cell.col},${cell.row}`;
const shipCell = (col: number, row: number) => wreckCellFromLocal(col, row);
const moveAcross = (state: GameState, characterId: string, from: { surfaceId: string; cell: { col: number; row: number } },
  to: { surfaceId: string; cell: { col: number; row: number } }) => {
  const actor = state.characters.get(characterId)!;
  Object.assign(actor, { sceneId: 'wreck-ship', surfaceId: from.surfaceId, cell: from.cell });
  expect(state.moveEntityOneSquare(characterId, to.cell)).toBe('MOVED');
  expect(actor.step).toMatchObject({ fromSurfaceId: from.surfaceId, toSurfaceId: to.surfaceId });
  finishStep(state, characterId);
  expect(actor).toMatchObject({ sceneId: 'wreck-ship', surfaceId: to.surfaceId, cell: to.cell });
};

describe('Rosa de los Vientos · mapa único explorable', () => {
  it('publica un solo mapa del barco con todas las cubiertas como superficies del mismo terreno', () => {
    expect(wreckRuntimeScenes.map(scene => scene.id)).toEqual(['wreck-ship']);
    const ship = wreckRuntimeScenes[0]!, terrain = ship.terrain!;
    expect(terrain.surfaces.map(surface => surface.id)).toEqual(expect.arrayContaining([
      'main', 'c2', 'c3', 'crow', 'lower-deck', 'hold-air', 'sea'
    ]));
    expect(wreckPorts.every(port => port.from.mapId === 'wreck-ship' && port.to.mapId === 'wreck-ship')).toBe(true);
    expect(ship.grid).toMatchObject({ cols: 56, rows: 32 });
    expect(terrain.transitions).toHaveLength(6);
    expect(terrain.transitions.every(link => cellKey(link.from.cell) !== cellKey(link.to.cell))).toBe(true);
  });

  it('da 9 m de agua transitable alrededor del casco y las rocas bloquean el movimiento', () => {
    const ship = wreckRuntimeScenes[0]!, terrain = ship.terrain!;
    const sea = terrain.surfaces.find(surface => surface.id === 'sea')!;
    const seaKeys = new Set(sea.tiles.map(tile => cellKey(tile.cell)));
    const obstacles = terrain.obstacles!.filter(obstacle => obstacle.surfaceId === 'sea');
    expect(sea.tiles.length).toBeGreaterThan(1_000);
    expect(obstacles.length).toBeGreaterThanOrEqual(25);
    expect(terrainTile(terrain, { surfaceId: 'sea', cell: { col: 1, row: 16 } })).toBeTruthy();
    expect(terrainTile(terrain, { surfaceId: 'sea', cell: { col: 54, row: 16 } })).toBeTruthy();
    expect(terrainTile(terrain, { surfaceId: 'sea', cell: { col: 28, row: 1 } })).toBeTruthy();
    expect(terrainTile(terrain, { surfaceId: 'sea', cell: { col: 28, row: 30 } })).toBeTruthy();
    for (const obstacle of obstacles) {
      expect(seaKeys.has(cellKey(obstacle.cell)), `${obstacle.obstacleId} no debe tener suelo`).toBe(false);
      const surrounding = [{ col: obstacle.cell.col - 1, row: obstacle.cell.row }, { col: obstacle.cell.col + 1, row: obstacle.cell.row },
        { col: obstacle.cell.col, row: obstacle.cell.row - 1 }, { col: obstacle.cell.col, row: obstacle.cell.row + 1 }]
        .filter(cell => seaKeys.has(cellKey(cell)));
      for (const cell of surrounding) expect(surfaceNeighbors(terrain, { surfaceId: 'sea', cell })
        .some(neighbor => cellKey(neighbor.cell) === cellKey(obstacle.cell))).toBe(false);
    }
    const boat = ship.stageActors!.find(actor => actor.id === 'wreck-rowboat')!;
    const breach = wreckPorts.find(port => port.id === 'P16')!.from;
    const reached = new Set([cellKey(boat.cell)]), queue = [boat.cell];
    for (let index = 0; index < queue.length; index++) for (const neighbor of surfaceNeighbors(terrain, { surfaceId: 'sea', cell: queue[index]! })) {
      const key = cellKey(neighbor.cell);
      if (reached.has(key)) continue;
      reached.add(key); queue.push(neighbor.cell);
    }
    expect(reached.has(cellKey(breach.cell)), 'debe poderse nadar desde la barca hasta la brecha de popa').toBe(true);
  });

  it('permite abordar, remar con dos pasajeros, guardar la posición y desembarcar sin activar el portal', () => {
    const state = new GameState(stormwreckBundle);
    const boat = state.npcs.get('wreck-rowboat')!;
    const mike = state.characters.get('mike')!, mia = state.characters.get('mia')!;
    const mikeToken = 'a'.repeat(32), miaToken = 'b'.repeat(32);
    state.claim(mikeToken, 'socket-mike', mike.id);
    state.claim(miaToken, 'socket-mia', mia.id);
    const boarding = wreckPorts.find(port => port.id === 'P01')!.from.cell;
    for (const actor of [mike, mia]) Object.assign(actor, { sceneId: 'wreck-ship', surfaceId: 'sea', cell: { ...boarding } });
    expect(state.rowboatInteraction(mike)?.label).toBe('Subir a la barca');
    expect(state.interactRowboat(mike.id)).toBe('ROWBOAT_BOARDED');
    expect(state.interactRowboat(mia.id)).toBe('ROWBOAT_BOARDED');
    expect(state.rowboatInteraction(mike)?.label).toBe('Bajar de la barca');
    expect(state.playerPrivate(mikeToken).rowboat).toEqual({ aboard: true, pilot: true });
    expect(state.playerPrivate(miaToken).rowboat).toEqual({ aboard: true, pilot: false });
    expect(state.moveEntityOneSquare(boat.id, { col: boat.cell.col - 1, row: boat.cell.row })).toBe('ENTITY_ABOARD_ROWBOAT');
    expect(state.startStep(mia, 'west')).toBe(false);
    expect(state.startStep(mike, 'west')).toBe(true);
    expect(mike.cell).toEqual(boat.cell);
    expect(mia.cell).toEqual(boat.cell);
    expect(state.publicSnapshot(false, 'wreck-ship').entities.find(entity => entity.id === boat.id)?.step).toBeTruthy();
    for (const actor of [mike, mia, boat]) actor.step!.startedAt = Date.now() - 1_000;
    state.tick();
    expect(mike.surfaceId).toBe('sea');
    expect(mia.surfaceId).toBe('sea');
    const restored = new GameState(stormwreckBundle);
    restored.restoreDurable(state.captureDurable());
    expect(restored.npcs.get(boat.id)!.cell).toEqual(boat.cell);
    expect(restored.rowboatInteraction(restored.characters.get(mia.id)!)?.label).toBe('Bajar de la barca');
    expect(restored.interactRowboat(mike.id)).toBe('ROWBOAT_LEFT');
    expect(restored.startStep(restored.characters.get(mia.id)!, 'east')).toBe(true);
  });

  it('mantiene conectadas todas las superficies jugables del barco mediante pasos y accesos', () => {
    const terrain = wreckRuntimeScenes[0]!.terrain!;
    const playable = terrain.surfaces.filter(surface => !surface.visualOnly)
      .flatMap(surface => surface.tiles.map(tile => ({ surfaceId: surface.id, cell: tile.cell })));
    const key = (address: { surfaceId: string; cell: { col: number; row: number } }) =>
      `${address.surfaceId}:${cellKey(address.cell)}`;
    const addressByKey = new Map(playable.map(address => [key(address), address]));
    const start = wreckPorts.find(port => port.id === 'P01')!.to;
    const reached = new Set([key(start)]), queue = [start];
    const accessEdges = wreckPorts.flatMap(port => [
      [port.from, port.to] as const,
      [port.to, port.from] as const
    ]);
    for (let index = 0; index < queue.length; index++) {
      const current = queue[index]!;
      const neighbors = surfaceNeighbors(terrain, current);
      for (const [from, to] of accessEdges) if (key(from) === key(current)) neighbors.push(to);
      for (const neighbor of neighbors) {
        const neighborKey = key(neighbor);
        if (!addressByKey.has(neighborKey) || reached.has(neighborKey)) continue;
        reached.add(neighborKey); queue.push(addressByKey.get(neighborKey)!);
      }
    }
    const unreachable = playable.filter(address => !reached.has(key(address))).map(key);
    expect(unreachable, `Casillas jugables aisladas: ${unreachable.slice(0, 12).join(', ')}`).toEqual([]);
  });

  it('carga los ataques reales de Trinity y registra sus gestos de exploración para arbitraje del DM', () => {
    const state = new GameState(stormwreckBundle), maria = state.characters.get('maria')!, token = 'b'.repeat(32);
    expect(maria.combat.attacks).toMatchObject([
      { id: 'shortbow', attackBonus: 5, damageDice: '1d6', damageBonus: 3, range: { normalMeters: 24, longMeters: 96 } },
      { id: 'dagger', attackBonus: 5, damageDice: '1d4', damageBonus: 3, finesse: true },
      { id: 'thrown-dagger', attackBonus: 5, damageDice: '1d4', damageBonus: 3, finesse: true, range: { normalMeters: 6, longMeters: 18 } }
    ]);
    expect(maria.combat.ruleTraits.sneakAttackDice).toBe('1d6');
    expect(maria.combat.attacks[0]?.label).not.toBe('Ataque básico');

    state.claim(token, 'socket-maria', 'maria');
    expect(state.playerPrivate(token).explorationBasics).toEqual(expect.arrayContaining(['talk', 'hide', 'search', 'study', 'use-object', 'pick-lock', 'disarm-trap', 'climb', 'swim', 'jump']));
    expect(state.declareExplorationBasicAction('maria', 'search', undefined, maria.cell)).toMatchObject({ ok: true, code: 'EXPLORATION_BASIC_DECLARED' });
    expect(state.dmState().lastExplorationAction).toMatchObject({ characterId: 'maria', action: 'search', targetLabel: expect.stringContaining('casilla') });
    expect(state.declareExplorationBasicAction('maria', 'climb', undefined, { col: 999, row: 999 })).toMatchObject({ ok: false, code: 'INVALID_TARGET' });
    expect(state.publicSnapshot().combat.active).toBe(false);
  });

  it('tiene una animación registrada y PNG existente para cada acción básica y de combate de Trinity', () => {
    const animations = stormwreckBundle.public.tokenAnimations.rogue!,
      directions = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'],
      actionStates = [
        ...Object.values(explorationBasicActionCatalogue).map(action => action.animation),
        ...Object.values(basicCombatActionAnimationStates).filter(state => state !== 'disengage'),
        ...directions.map(direction => `direction-${direction}`), ...directions.map(direction => `running-${direction}`),
        ...directions.map(direction => `attack-${direction}`), 'attack', 'attack-arrow', 'attack-arrow-mirrored',
        'attack-throw', 'attack-throw-mirrored', 'hit', 'prone', 'crawl', 'defeated'
      ];
    for (const state of actionStates) {
      const animation = animations[state];
      expect(animation?.frames.length, `Falta animación para ${state}`).toBeGreaterThan(0);
      for (const frame of animation!.frames) {
        const url = typeof frame === 'string' ? frame : frame.url;
        expect(existsSync(resolve('campaigns/stormwreck-isle/public', `.${url}`)), `Falta PNG servido para ${state}: ${url}`).toBe(true);
      }
    }
    for (const direction of directions) expect(animations[`direction-${direction}`]?.frames.length, `Destrabarse sin animación en ${direction}`).toBeGreaterThan(0);
    for (const url of ['/art/m3/trinity/maria_fx_ataque_furtivo_01.png', '/art/m3/trinity/maria_fx_ataque_furtivo_02.png'])
      expect(existsSync(resolve('campaigns/stormwreck-isle/public', `.${url}`)), `Falta VFX servido: ${url}`).toBe(true);
  });

  it('gasta una flecha tras resolver un ataque de arco, incluso si el objetivo no cae', () => {
    const state = new GameState(stormwreckBundle), maria = state.characters.get('maria')!, target = state.creature!;
    state.claim('c'.repeat(32), 'socket-maria', 'maria');
    target.visible = true; target.sceneId = maria.sceneId; target.surfaceId = maria.surfaceId;
    target.cell = { col: maria.cell.col + 1, row: maria.cell.row };
    expect(state.startCombat()).toBe(true);
    expect(state.setInitiative([{ id: 'maria', initiative: 20 }, { id: target.id, initiative: 1 }])).toBe(true);
    expect(state.setInitiativeOrder(state.combat.order, true)).toBe(true);
    expect(state.declareCombatAction('maria', target.id, 'shortbow')).toMatchObject({ ok: true, code: 'ROLL_REQUIRED' });
    const attackPrompt = state.combat.pending!;
    expect(state.submitCombatRoll('player', 'maria', 'attack', attackPrompt.id, 20).code).toBe('DAMAGE_REQUIRED');
    const damagePrompt = state.combat.pending!;
    expect(state.submitCombatRoll('player', 'maria', 'damage', damagePrompt.id, 3).code).toBe('ATTACK_RESOLVED');
    expect(maria.inventory).toContain('flechas ×19');
  });

  it('sube y baja por C2, C3, C8 y C9 sin cambiar de escena ni teletransportar a los demás', () => {
    const state = new GameState(stormwreckBundle), mike = state.characters.get('mike')!, mia = state.characters.get('mia')!;
    const terrain = wreckRuntimeScenes[0]!.terrain!;
    const c2 = terrain.transitions.find(link => link.from.surfaceId === 'main' && link.to.surfaceId === 'c2')!;
    const c3 = terrain.transitions.find(link => link.from.surfaceId === 'main' && link.to.surfaceId === 'c3')!;
    const c8 = terrain.transitions.find(link => link.from.surfaceId === 'main' && link.to.surfaceId === 'lower-deck')!;
    const c9 = terrain.transitions.find(link => link.from.surfaceId === 'lower-deck' && link.to.surfaceId === 'hold-air')!;
    Object.assign(mia, { sceneId: 'wreck-ship', surfaceId: 'main', cell: shipCell(20, 9) });

    moveAcross(state, 'mike', c2.from, c2.to);
    expect(mia).toMatchObject({ sceneId: 'wreck-ship', surfaceId: 'main', cell: shipCell(20, 9) });
    moveAcross(state, 'mike', c2.to, c2.from);
    moveAcross(state, 'mike', c3.from, c3.to);
    moveAcross(state, 'mike', c3.to, c3.from);
    moveAcross(state, 'mike', c8.from, c8.to);
    moveAcross(state, 'mike', c8.to, c8.from);
    moveAcross(state, 'mike', c9.from, c9.to);
    moveAcross(state, 'mike', c9.to, c9.from);

    const mikeAddress = { sceneId: mike.sceneId, surfaceId: mike.surfaceId, cell: { ...mike.cell } };
    const miaAddress = { sceneId: mia.sceneId, surfaceId: mia.surfaceId, cell: { ...mia.cell } };
    expect(state.focusScene('wreck-approach')).toBe(true);
    expect(mike).toMatchObject(mikeAddress);
    expect(mia).toMatchObject(miaAddress);
  });

  it('llega caminando desde C1 hasta C8 por todos los peldaños físicos', () => {
    const state = new GameState(stormwreckBundle), mike = state.characters.get('mike')!;
    Object.assign(mike, { sceneId: 'wreck-ship', surfaceId: 'main', cell: shipCell(24, 6) });
    const route = [
      shipCell(23, 6), shipCell(22, 6), shipCell(21, 6), shipCell(20, 6),
      shipCell(20, 7), shipCell(20, 8), shipCell(20, 9), shipCell(20, 10), shipCell(20, 11),
      shipCell(21, 11), shipCell(22, 11), shipCell(23, 11), shipCell(24, 11), shipCell(25, 11)
    ];
    for (const cell of route) {
      expect(state.moveEntityOneSquare('mike', cell), `No se puede pasar a ${cellKey(cell)}`).toBe('MOVED');
      finishStep(state);
    }
    expect(mike).toMatchObject({ sceneId: 'wreck-ship', surfaceId: 'lower-deck', cell: shipCell(25, 11) });
  });

  it('mantiene el rumbo diagonal junto al mástil si hay una ruta de esquina libre', () => {
    const state = new GameState(stormwreckBundle), mike = state.characters.get('mike')!;
    Object.assign(mike, { sceneId: 'wreck-ship', surfaceId: 'main', cell: shipCell(22, 6) });
    expect(state.startStep(mike, 'south-east')).toBe(true);
    expect(mike.step).toMatchObject({ from: shipCell(22, 6), to: shipCell(23, 7) });
  });

  it('conserva la diagonal WASD en la cofa al rodear el hueco central del mástil', () => {
    const state = new GameState(stormwreckBundle), mike = state.characters.get('mike')!;
    const ladder = wreckPorts.find(port => port.id === 'P10')!;
    Object.assign(mike, { sceneId: 'wreck-ship', surfaceId: 'crow', cell: { ...ladder.to.cell } });

    // W desde la vista inicial corresponde a south-west. El destino forma
    // parte del anillo; sólo el paso ortogonal interior está vacío porque allí
    // está el mástil. No debe sustituirse la orden por un paso hacia el sur.
    expect(state.startStep(mike, 'south-west')).toBe(true);
    expect(mike.step).toMatchObject({
      from: ladder.to.cell,
      to: { col: ladder.to.cell.col - 1, row: ladder.to.cell.row + 1 }
    });
  });

  it('no choca con un personaje que nadie ha elegido, pero respeta su casilla al entrar en la partida', () => {
    const state = new GameState(stormwreckBundle), mike = state.characters.get('mike')!, mia = state.characters.get('mia')!;
    Object.assign(mike, { sceneId: 'wreck-ship', surfaceId: 'main', cell: shipCell(24, 7) });
    Object.assign(mia, { sceneId: 'wreck-ship', surfaceId: 'main', cell: shipCell(24, 8), sessionToken: null });
    expect(state.startStep(mike, 'south')).toBe(true);
    expect(mike.step?.to).toEqual(shipCell(24, 8));
    finishStep(state);
    Object.assign(mike, { cell: shipCell(24, 7), step: null });
    mia.sessionToken = 'mia-session';
    expect(state.startStep(mike, 'south')).toBe(false);
  });

  it('mantiene una escena común y limita fichas, objetos y botín enviados a cada jugador a su cubierta', () => {
    const state = new GameState(stormwreckBundle), mike = state.characters.get('mike')!, mia = state.characters.get('mia')!;
    state.focusScene('wreck-ship');
    const actors = stormwreckBundle.privateActors!;
    Object.assign(mike, { sceneId: 'wreck-ship', surfaceId: 'main', sessionToken: 'mike-session' });
    Object.assign(mia, { sceneId: 'wreck-ship', surfaceId: 'lower-deck', sessionToken: 'mia-session' });
    for (const actor of actors.filter(actor => actor.surfaceId === 'lower-deck')) expect(state.setNpcVisible(actor.id, true)).toBe(true);

    const mainView = state.publicSnapshot(true, 'wreck-ship', 'main');
    const lowerView = state.publicSnapshot(true, 'wreck-ship', 'lower-deck');
    expect(mainView.scene.id).toBe('wreck-ship');
    expect(mainView.entities.map(entity => entity.id)).toContain('mike');
    expect(mainView.entities.map(entity => entity.id)).not.toContain('mia');
    expect(mainView.entities.map(entity => entity.id)).not.toContain('c8-ghoul');
    expect(mainView.props.map(prop => prop.id)).not.toContain('c8-container-01');
    expect(mainView.scene.pickups?.every(pickup => pickup.surfaceId === 'main')).toBe(true);
    expect(lowerView.entities.map(entity => entity.id)).toContain('mia');
    expect(lowerView.entities.map(entity => entity.id)).toContain('c8-ghoul');
    expect(lowerView.entities.map(entity => entity.id)).not.toContain('mike');
    expect(state.publicSnapshot(false, 'wreck-ship').entities.map(entity => entity.id)).toContain('mia');
  });

  it('sube por la escala visible hasta la cofa y puede volver caminando al mismo barco', () => {
    const state = new GameState(stormwreckBundle), mike = state.characters.get('mike')!;
    const terrain = wreckRuntimeScenes[0]!.terrain!, ladder = wreckPorts.find(port => port.id === 'P10')!;
    const mainNeighbors = surfaceNeighbors(terrain, ladder.from).filter(address => address.surfaceId === 'main' && address.cell.row !== 14);
    const approach = mainNeighbors[0]!;
    Object.assign(mike, { sceneId: 'wreck-ship', surfaceId: 'main', cell: approach.cell });
    expect(state.moveEntityOneSquare('mike', ladder.from.cell)).toBe('MOVED');
    finishStep(state);
    expect(mike).toMatchObject({ sceneId: 'wreck-ship', surfaceId: 'crow', cell: ladder.to.cell });

    const crowNeighbors = surfaceNeighbors(terrain, ladder.to).filter(address => address.surfaceId === 'crow');
    const crowLanding = crowNeighbors[0]!;
    Object.assign(mike, { cell: crowLanding.cell });
    expect(state.moveEntityOneSquare('mike', ladder.to.cell)).toBe('MOVED');
    finishStep(state);
    expect(mike).toMatchObject({ sceneId: 'wreck-ship', surfaceId: 'main', cell: ladder.from.cell });
    const boarding = wreckPorts.find(port => port.id === 'P01')!;
    expect(boarding.to.cell).not.toEqual(ladder.from.cell);
    expect(terrainTile(terrain, boarding.to)).toBeTruthy();

    const engine = new NullEngine(), scene = new Scene(engine);
    const terrainView = buildTerrain3D(scene, terrain, { shipDeck: true });
    expect(terrainView.lights.map(light => light.metadata.lightId)).toEqual([
      'main-daylight', 'c8-water-glimmer', 'c9-depth-glimmer'
    ]);
    expect(terrainView.lights.find(light => light.metadata.lightId === 'c9-depth-glimmer')?.range).toBe(1.8);
    expect(scene.meshes.some(mesh => mesh.metadata?.kind === 'mast-ladder')).toBe(true);
    expect(scene.meshes.some(mesh => mesh.name.startsWith('ship-hull-sides'))).toBe(true);
    expect(scene.meshes.some(mesh => mesh.name.startsWith('ship-deck-grate-slat:'))).toBe(true);
    expect(scene.meshes.some(mesh => mesh.name.startsWith('ship-deck-rope-coil:'))).toBe(true);
    expect(scene.meshes.filter(mesh => mesh.name.startsWith('c1-mast-iron-collar:'))).toHaveLength(3);
    expect(scene.meshes.filter(mesh => mesh.name.startsWith('c1-mast-frayed-rope:'))).toHaveLength(2);
    expect(scene.meshes.filter(mesh => mesh.name.startsWith('c1-mast-barnacle:'))).toHaveLength(8);
    expect(scene.meshes.filter(mesh => mesh.metadata?.kind === 'c1-mast-barnacle' || mesh.metadata?.kind === 'c1-mast-frayed-rope')
      .every(mesh => !mesh.isPickable && mesh.metadata.deckSurfaceId === 'main')).toBe(true);
    expect(scene.meshes.filter(mesh => mesh.metadata?.kind === 'ship-deck-grate' || mesh.metadata?.kind === 'ship-deck-rope-coil')
      .every(mesh => !mesh.isPickable)).toBe(true);
    expect(scene.meshes.filter(mesh => mesh.name.startsWith('terrain-grid:')).length).toBeGreaterThan(1);
    const backdrop = scene.meshes.filter(mesh => ['seabed-blockout', 'distant-wreck-silhouette', 'dragon-bone-silhouette', 'reef-rock-silhouette'].includes(String(mesh.metadata?.kind)));
    expect(backdrop.some(mesh => mesh.metadata?.kind === 'distant-wreck-silhouette')).toBe(true);
    expect(backdrop.some(mesh => mesh.metadata?.kind === 'dragon-bone-silhouette')).toBe(true);
    expect(backdrop.every(mesh => !mesh.isPickable)).toBe(true);
    expect(scene.meshes.find(mesh => mesh.name === 'wreck-silhouette:hull:west')?.isPickable).toBe(false);
    scene.dispose(); engine.dispose();
  });

  it('el grid y la geometría comparten las alturas exactas de las rampas y el casco', () => {
    const terrain = wreckRuntimeScenes[0]!.terrain!;
    const c8Stair = terrain.structures?.find(item => item.id === 'stairs-c8')!;
    expect(c8Stair?.kind).toBe('stair');
    if (c8Stair?.kind === 'stair') for (let step = 0; step < c8Stair.runCells; step++) {
      const cell = { col: c8Stair.cell.col + step, row: c8Stair.cell.row };
      expect(terrainTile(terrain, { surfaceId: 'main', cell })?.kind).toBe('stair');
      expect(terrainTile(terrain, { surfaceId: 'c1-hull', cell })).toBeNull();
    }
    for (const link of terrain.transitions) {
      const from = terrainTile(terrain, link.from)!, to = terrainTile(terrain, link.to)!;
      expect(from).toBeTruthy(); expect(to).toBeTruthy();
      const height = surfaceHeight(terrain, link.from);
      expect(Number.isFinite(height)).toBe(true);
      expect(surfaceNeighbors(terrain, link.from)).toContainEqual(link.to);
    }
    expect(terrain.structures?.filter(item => item.kind === 'stair').map(item => item.id)).toEqual(expect.arrayContaining([
      'stairs-c2-north', 'stairs-c2-south', 'stairs-c3-north', 'stairs-c3-south', 'stairs-c8', 'stairs-c9'
    ]));
    expect(terrain.occluders.some(item => item.id === 'c1-mast' && item.top >= 15)).toBe(true);
    expect(terrain.surfaces.find(surface => surface.id === 'main')!.tiles.some(tile => tile.kind === 'stair')).toBe(true);
  });

  it('conserva las huellas de los objetos artísticos como obstáculos reales', () => {
    const ship = wreckRuntimeScenes[0]!, table = ship.props.find(prop => prop.id === 'c7-table-blockout')!;
    expect(ship.props.filter(prop => prop.label.includes('blockout'))).toHaveLength(0);
    expect(table.surfaceId).toBe('main');
    expect(table.baseFootprint).toHaveLength(2);
    const terrain = ship.terrain!, approach = surfaceNeighbors(terrain, { surfaceId: 'main', cell: table.cell })
      .find(address => address.surfaceId === 'main' && address.cell.col < table.cell.col)!;
    const state = new GameState(stormwreckBundle), mike = state.characters.get('mike')!;
    Object.assign(mike, { sceneId: 'wreck-ship', surfaceId: 'main', cell: approach.cell });
    expect(state.moveEntityOneSquare('mike', table.cell)).toBe('BLOCKED_CELL');
  });

  it('alinea la brecha de popa con la entrada a C9 y conserva el gradiente de agua de C8', () => {
    const ship = wreckRuntimeScenes[0]!, terrain = ship.terrain!;
    const breach = terrain.hullOpenings?.find(opening => opening.id === 'c9-stern-breach')!;
    const entry = wreckPorts.find(port => port.id === 'P16')!;
    expect(breach).toMatchObject({ surfaceId: 'c1-hull', edge: 'west', bottom: -5.4, top: -3.2 });
    expect(entry.to).toMatchObject({ surfaceId: 'hold-air', cell: breach.cell });
    expect(entry.from.cell).toEqual({ col: breach.cell.col - 1, row: breach.cell.row });
    expect(terrainTile(terrain, { surfaceId: 'hold-air', cell: breach.cell })).toBeTruthy();
    expect(terrainTile(terrain, { surfaceId: 'hold-air', cell: breach.cell })?.corners).toEqual([-6.4, -6.4, -6.4, -6.4]);

    const lower = terrain.surfaces.find(surface => surface.id === 'lower-deck')!;
    const minRow = Math.min(...lower.tiles.map(tile => tile.cell.row));
    const maxRow = Math.max(...lower.tiles.map(tile => tile.cell.row));
    const hullCenterCol = shipCell(22, 0).col;
    const north = lower.tiles.find(tile => tile.cell.col === hullCenterCol && tile.cell.row === minRow)!;
    const south = lower.tiles.find(tile => tile.cell.col === hullCenterCol && tile.cell.row === maxRow)!;
    expect(north.movementCost).toBe(2); expect(south.movementCost).toBe(2);
    expect(-3.05 - surfaceHeight(terrain, { surfaceId: 'lower-deck', cell: north.cell }, .5, 0)).toBeCloseTo(.45, 2);
    expect(-3.05 - surfaceHeight(terrain, { surfaceId: 'lower-deck', cell: south.cell }, .5, 1)).toBeCloseTo(.15, 2);

    const shaft = terrain.structures?.find(structure => structure.id === 'c4-shaft')!;
    const chest = ship.props.find(prop => prop.id === 'c9-iron-chest')!;
    expect(chest.surfaceId).toBe('hold-air');
    expect(Math.abs(chest.cell.col - shaft.cell.col)).toBeLessThanOrEqual(1);
    expect(Math.abs(chest.cell.row - shaft.cell.row)).toBeLessThanOrEqual(1);
    expect(terrainTile(terrain, { surfaceId: 'hold-air', cell: chest.cell })).toBeTruthy();
  });

  it('recoge una antorcha de su cubierta una sola vez y conserva el resultado al guardar', () => {
    const state = new GameState(stormwreckBundle), mike = state.characters.get('mike')!;
    const ship = wreckRuntimeScenes[0]!;
    const torch = ship.pickups!.find(pickup => pickup.id === 'torch-c1-a')!;
    Object.assign(mike, { sceneId: 'wreck-ship', surfaceId: 'main', cell: torch.cell, sessionToken: 'mike-session' });
    expect(state.playerPrivate('mike-session').availableInteractions).toContainEqual({ targetId: 'torch-c1-a', label: 'Coger Antorcha apagada · C1' });
    expect(state.takePickup('mike', 'torch-c1-a')).toBe('PICKUP_TAKEN');
    expect(state.takePickup('mike', 'torch-c1-a')).toBe('ALREADY_TAKEN');
    expect(mike.inventory).toContain('Antorcha');
    const restored = new GameState(stormwreckBundle); restored.restoreDurable(state.captureDurable());
    expect(restored.characters.get('mike')?.inventory).toContain('Antorcha');
    expect(restored.publicSnapshot(true, 'wreck-ship', 'main').collectedPickups).toContain('torch-c1-a');
  });

  it('guarda el tesoro canónico de la cofa por piezas y solo lo muestra en esa superficie', () => {
    const state = new GameState(stormwreckBundle), mike = state.characters.get('mike')!;
    const ship = wreckRuntimeScenes[0]!, treasure = ship.pickups!.filter(pickup => pickup.id.startsWith('crow-'));
    expect(treasure).toHaveLength(5);
    expect(treasure.reduce((total, pickup) => total + Number(pickup.item.match(/\((\d+) po\)/)?.[1] ?? 0), 0)).toBe(120);
    expect(treasure.every(pickup => pickup.kind === 'treasure' && pickup.surfaceId === 'crow'
      && terrainTile(ship.terrain!, { surfaceId: 'crow', cell: pickup.cell }))).toBe(true);
    expect(state.publicSnapshot(true, 'wreck-ship', 'main').scene.pickups?.some(pickup => pickup.id.startsWith('crow-'))).toBe(false);
    const bracelet = treasure.find(pickup => pickup.id === 'crow-bracelet')!;
    Object.assign(mike, { sceneId: 'wreck-ship', surfaceId: 'crow', cell: bracelet.cell, sessionToken: 'mike-session' });
    expect(state.playerPrivate('mike-session').availableInteractions).toContainEqual({ targetId: bracelet.id, label: `Coger ${bracelet.label}` });
    expect(state.takePickup('mike', bracelet.id)).toBe('PICKUP_TAKEN');
    expect(state.takePickup('mike', bracelet.id)).toBe('ALREADY_TAKEN');
    expect(mike.inventory).toContain('Pulsera de oro (25 po)');
    const restored = new GameState(stormwreckBundle); restored.restoreDurable(state.captureDurable());
    expect(restored.publicSnapshot(true, 'wreck-ship', 'crow').collectedPickups).toContain(bracelet.id);
  });

  it('no expone el botín de C4 hasta abrir la puerta y permite recogerlo desde dentro', () => {
    const state = new GameState(stormwreckBundle), mike = state.characters.get('mike')!; state.focusScene('wreck-ship');
    const ship = wreckRuntimeScenes[0]!, money = ship.pickups!.find(pickup => pickup.id === 'c4-gold')!;
    Object.assign(mike, { sceneId: 'wreck-ship', surfaceId: 'main', cell: money.cell, sessionToken: 'mike-session' });
    expect(state.takePickup('mike', money.id)).toBe('PICKUP_LOCKED');
    expect(state.takePickup('mike', money.id, true)).toBe('PICKUP_LOCKED');
    expect(state.playerPrivate('mike-session').availableInteractions).not.toContainEqual({ targetId: money.id, label: `Coger ${money.label}` });
    expect(state.publicSnapshot(true, 'wreck-ship', 'main').scene.pickups?.some(pickup => pickup.id === money.id)).toBe(false);
    expect(state.publicSnapshot(true, 'wreck-ship').scene.pickups?.some(pickup => pickup.id === money.id)).toBe(false);
    expect(state.publicSnapshot(false, 'wreck-ship').scene.pickups?.some(pickup => pickup.id === money.id)).toBe(true);
    expect(state.dmState().pickups?.find(pickup => pickup.id === money.id)?.available).toBe(false);
    expect(objectCommand(state, { type: 'object:interact', objectId: 'c4-barred-door', action: 'remove-bar' }).code).toBe('APPLIED');
    expect(objectCommand(state, { type: 'object:door', objectId: 'c4-barred-door', state: 'open' }).code).toBe('APPLIED');
    expect(state.publicSnapshot(true, 'wreck-ship', 'main').scene.pickups?.some(pickup => pickup.id === money.id)).toBe(true);
    expect(state.publicSnapshot(true, 'wreck-ship', 'main').scene.pickups?.filter(pickup => pickup.id.startsWith('c4-'))).toHaveLength(4);
    expect(state.playerPrivate('mike-session').availableInteractions).toContainEqual({ targetId: money.id, label: `Coger ${money.label}` });
    expect(state.takePickup('mike', money.id)).toBe('PICKUP_TAKEN');
    expect(mike.inventory).toContain('50 po');
    expect(state.publicSnapshot(true, 'wreck-ship', 'main').collectedPickups).toContain(money.id);
    expect(JSON.stringify(state.publicSnapshot(true, 'wreck-ship', 'main'))).not.toContain('Botín C4:');
  });

  it('migra guardados de mapas antiguos conservando las posiciones y superficies dentro del mapa único', () => {
    const source = new GameState(stormwreckBundle).captureDurable();
    delete source.wreckGridVersion;
    const mike = source.characters.find(actor => actor.id === 'mike')!;
    mike.sceneId = 'wreck-main'; mike.surfaceId = 'main'; mike.cell = { col: 9, row: 6 };
    const mia = source.characters.find(actor => actor.id === 'mia')!;
    mia.sceneId = 'wreck-upper'; mia.surfaceId = 'c2'; mia.cell = { col: 38, row: 8 };
    const restored = new GameState(stormwreckBundle);
    expect(() => restored.restoreDurable(source)).not.toThrow();
    expect(restored.characters.get('mike')?.sceneId).toBe('wreck-ship');
    expect(restored.characters.get('mia')).toMatchObject({ sceneId: 'wreck-ship', surfaceId: 'c2' });
    expect(terrainTile(wreckRuntimeScenes[0]!.terrain!, { surfaceId: 'c2', cell: restored.characters.get('mia')!.cell })).toBeTruthy();
  });

  it('amplía sin perder las posiciones de guardados de la cuadrícula anterior del pecio', () => {
    const source = new GameState(stormwreckBundle).captureDurable();
    source.wreckGridVersion = 2;
    for (const actor of source.characters.filter(actor => actor.sceneId === 'wreck-ship')) {
      actor.cell.col -= 6; actor.cell.row -= 6;
    }
    for (const actor of (source.npcs ?? []).filter(actor => actor.sceneId === 'wreck-ship')) {
      actor.cell.col -= 6; actor.cell.row -= 6;
    }
    if (source.creature?.sceneId === 'wreck-ship') { source.creature.cell.col -= 6; source.creature.cell.row -= 6; }
    for (const object of source.scenes.find(scene => scene.sceneId === 'wreck-ship')!.objects) {
      object.cell.col -= 6; object.cell.row -= 6;
    }
    const mike = source.characters.find(actor => actor.id === 'mike')!;
    mike.sceneId = 'wreck-ship'; mike.surfaceId = 'main'; mike.cell = { col: 20, row: 9 };
    const mia = source.characters.find(actor => actor.id === 'mia')!;
    mia.sceneId = 'wreck-ship'; mia.surfaceId = 'main'; mia.cell = { col: 21, row: 9 };
    const restored = new GameState(stormwreckBundle);
    restored.restoreDurable(source);
    expect(restored.characters.get('mike')?.cell).toEqual(shipCell(20, 9));
    expect(restored.characters.get('mia')?.cell).toEqual(shipCell(21, 9));
    expect(restored.captureDurable().wreckGridVersion).toBe(3);
  });
});

describe('M2 · interactivos del Pecio en el barco continuo', () => {
  it('permite al jugador abrir C5–C7 y retirar el listón de C4 sin cambiar el foco del DM', () => {
    const state = new GameState(stormwreckBundle), mike = state.characters.get('mike')!;
    state.focusScene('dragon-rest');
    Object.assign(mike, { sceneId: 'wreck-ship', surfaceId: 'main', sessionToken: 'mike-session' });
    for (const id of ['c5-door', 'c6-door', 'c7-door']) {
      const door = wreckRuntimeScenes[0]!.props.find(prop => prop.id === id)!;
      mike.cell = { col: door.cell.col + (id === 'c5-door' ? 1 : -1), row: door.cell.row };
      expect(state.playerPrivate('mike-session').availableInteractions.some(item => item.targetId === id)).toBe(true);
      expect(state.interactNearbyDoor('mike', id)).toEqual({ ok: true, code: 'DOOR_OPENED' });
      expect(state.publicSnapshot(true, 'wreck-ship', 'main').props.find(prop => prop.id === id)).toMatchObject({ state: 'open' });
      expect(state.interactNearbyDoor('mike', id)).toEqual({ ok: true, code: 'DOOR_CLOSED' });
      mike.cell = { col: 30, row: 13 };
      expect(state.interactNearbyDoor('mike', id)).toEqual({ ok: false, code: 'TOO_FAR' });
    }
    const c4 = wreckRuntimeScenes[0]!.props.find(prop => prop.id === 'c4-barred-door')!;
    mike.cell = { col: c4.cell.col + 1, row: c4.cell.row };
    expect(state.playerPrivate('mike-session').availableInteractions.find(item => item.targetId === c4.id)?.label).toContain('Retirar listón');
    expect(state.interactNearbyDoor('mike', c4.id)).toEqual({ ok: true, code: 'DOOR_BAR_REMOVED' });
    expect(state.interactNearbyDoor('mike', c4.id)).toEqual({ ok: true, code: 'DOOR_OPENED' });
    expect(state.npcs.get('c4-zombie-1')?.visible).toBe(true);
    expect(state.sceneId).toBe('dragon-rest');
  });

  it('hace depender C4 del listón y de la puerta sin crear un mapa o portal', () => {
    const state = new GameState(stormwreckBundle), mike = state.characters.get('mike')!;
    state.focusScene('wreck-ship');
    const door = wreckRuntimeScenes[0]!.props.find(prop => prop.id === 'c4-barred-door')!;
    const neighbors = surfaceNeighbors(wreckRuntimeScenes[0]!.terrain!, { surfaceId: 'main', cell: door.cell });
    Object.assign(mike, { sceneId: 'wreck-ship', surfaceId: 'main', cell: neighbors[0]!.cell });
    expect(state.moveEntityOneSquare('mike', door.cell)).toBe('BLOCKED_CELL');
    expect(objectCommand(state, { type: 'object:door', objectId: 'c4-barred-door', state: 'open' }).code).toBe('DOOR_BARRED');
    expect(objectCommand(state, { type: 'object:interact', objectId: 'c4-barred-door', action: 'remove-bar' }).code).toBe('APPLIED');
    expect(objectCommand(state, { type: 'object:door', objectId: 'c4-barred-door', state: 'open' }).code).toBe('APPLIED');
    expect(state.moveEntityOneSquare('mike', door.cell)).toBe('MOVED');
    expect(mike.sceneId).toBe('wreck-ship');
  });

  it('mantiene el alijo de C6 privado, idempotente y persistente', () => {
    const state = new GameState(stormwreckBundle); state.focusScene('wreck-ship');
    expect(JSON.stringify(state.publicSnapshot(true, 'wreck-ship', 'main'))).not.toContain('c6-trapped-stash');
    expect(objectCommand(state, { type: 'object:interact', objectId: 'c6-trapped-stash', action: 'discover' }).code).toBe('APPLIED');
    expect(JSON.stringify(state.publicSnapshot(true, 'wreck-ship', 'main'))).toContain('c6-trapped-stash');
    expect(JSON.stringify(state.publicSnapshot(true, 'wreck-ship', 'main'))).not.toContain('Bolsa con 200 po');
    expect(objectCommand(state, { type: 'object:interact', objectId: 'c6-trapped-stash', action: 'open' }).code).toBe('TRAP_ARMED');
    expect(objectCommand(state, { type: 'object:interact', objectId: 'c6-trapped-stash', action: 'trigger-open' }).code).toBe('APPLIED');
    expect(objectCommand(state, { type: 'object:interact', objectId: 'c6-trapped-stash', action: 'take-loot', characterId: 'mike' }).code).toBe('APPLIED');
    expect(objectCommand(state, { type: 'object:interact', objectId: 'c6-trapped-stash', action: 'take-loot', characterId: 'mia' }).code).toBe('LOOT_TAKEN');
    const restored = new GameState(stormwreckBundle); restored.restoreDurable(state.captureDurable());
    const stash = restored.dmState().objects.find(object => object.id === 'c6-trapped-stash');
    expect(stash?.kind === 'crate' ? stash.interaction : null).toMatchObject({ kind: 'trap-stash', trap: 'spent', open: true, lootOwnerId: 'mike' });
  });

  it('conserva cofre y paquete de C9 y evita duplicar botín de los contenedores C8', () => {
    const state = new GameState(stormwreckBundle); state.focusScene('wreck-ship');
    expect(state.applyWreckProgressToggle('wreck.package-opened', true)).toBe('PACKAGE_NOT_FOUND');
    expect(JSON.stringify(state.publicSnapshot(true, 'wreck-ship', 'main'))).not.toContain('c9-iron-chest');
    expect(objectCommand(state, { type: 'object:interact', objectId: 'c9-iron-chest', action: 'open' }).code).toBe('APPLIED');
    expect(objectCommand(state, { type: 'object:interact', objectId: 'c9-iron-chest', action: 'take-package', characterId: 'mia' }).code).toBe('APPLIED');
    expect(state.progress['wreck.c9-chest-found']).toBe(true);
    expect(state.progress['wreck.journal-found']).toBeUndefined();
    expect(state.characters.get('mia')?.inventory).toContain('Paquete encerado');
    expect(state.applyWreckProgressToggle('wreck.package-opened', true)).toBe('APPLIED');
    expect(state.progress['wreck.journal-found']).toBe(true);
    expect(state.progress['wreck.talisman-found']).toBe(true);
    expect(JSON.stringify(state.publicSnapshot(true, 'wreck-ship', 'hold-air'))).not.toContain('diario');
    expect(JSON.stringify(state.publicSnapshot(true, 'wreck-ship', 'hold-air'))).not.toContain('talismán');
    const payload = state.captureDurable(), restored = new GameState(stormwreckBundle); restored.restoreDurable(payload);
    const chest = restored.dmState().objects.find(object => object.id === 'c9-iron-chest');
    expect(chest?.kind === 'crate' ? chest.interaction : null).toMatchObject({ kind: 'chest', openedLocation: 'submerged', package: 'taken', packageOwnerId: 'mia' });
    expect(restored.characters.get('mia')?.inventory).toContain('Paquete encerado');
    expect(restored.progress['wreck.journal-found']).toBe(true);
    expect(restored.progress['wreck.c9-package-taken']).toBe(true);
    const legacyPayload = structuredClone(payload);
    delete legacyPayload.progress['wreck.package-opened']; delete legacyPayload.progress['wreck.c9-package-taken'];
    const migrated = new GameState(stormwreckBundle); migrated.restoreDurable(legacyPayload);
    expect(migrated.progress['wreck.package-opened']).toBe(true);
    expect(migrated.progress['wreck.c9-package-taken']).toBe(true);
    expect(restored.applyWreckProgressToggle('wreck.items-given-to-runara', true)).toBe('APPLIED');
    expect(restored.characters.get('mia')?.inventory).not.toContain('Paquete encerado');
    expect(objectCommand(restored, { type: 'object:interact', objectId: 'c9-iron-chest', action: 'return-package' }).code).toBe('STORY_EVENT_ALREADY_RECORDED');

    const containers = new GameState(stormwreckBundle); containers.focusScene('wreck-ship');
    expect(objectCommand(containers, { type: 'object:interact', objectId: 'c8-container-01', action: 'open' }).code).toBe('APPLIED');
    expect(objectCommand(containers, { type: 'object:interact', objectId: 'c8-container-01', action: 'take-loot', characterId: 'mike' }).code).toBe('C8_RESULT_REQUIRED');
    expect(objectCommand(containers, { type: 'object:interact', objectId: 'c8-container-01', action: 'assign-result', resultId: 1 }).code).toBe('APPLIED');
    expect(containers.progress['wreck.c8-loot-1']).toBe(true);
    expect(objectCommand(containers, { type: 'object:interact', objectId: 'c8-container-01', action: 'take-loot', characterId: 'mike' }).code).toBe('APPLIED');
    expect(containers.characters.get('mike')?.inventory).toContain('Vino fino: 5 botellas, 10 po cada una (algunas pueden estar rotas)');
    const undo = containers.dmState().undo.entryId!;
    expect(objectCommand(containers, { type: 'object:undo', entryId: undo }).code).toBe('APPLIED');
    expect(containers.characters.get('mike')?.inventory).not.toContain('Vino fino: 5 botellas, 10 po cada una (algunas pueden estar rotas)');
    expect(objectCommand(containers, { type: 'object:interact', objectId: 'c8-container-01', action: 'take-loot', characterId: 'mia' }).code).toBe('APPLIED');
    const container = containers.dmState().objects.find(object => object.id === 'c8-container-01');
    expect(container?.kind === 'crate' ? container.interaction : null).toMatchObject({ lootOwnerId: 'mia', lootLabel: 'Vino fino: 5 botellas, 10 po cada una (algunas pueden estar rotas)' });
    const restoredContainers = new GameState(stormwreckBundle); restoredContainers.restoreDurable(containers.captureDurable());
    expect(restoredContainers.characters.get('mia')?.inventory).toContain('Vino fino: 5 botellas, 10 po cada una (algunas pueden estar rotas)');
    expect(restoredContainers.progress['wreck.c8-loot-1']).toBe(true);
  });
});

describe('M4 · secuencia del Pecio', () => {
  it('modela el viaje en barca, el abordaje por jarcia y el regreso al Retiro', () => {
    const state = new GameState(stormwreckBundle), mike = state.characters.get('mike')!, ship = wreckRuntimeScenes[0]!;
    const boarding = wreckPorts.find(port => port.id === 'P01')!;
    expect(boarding.mode).toBe('rigging');
    const rowboat = ship.stageActors?.find(actor => actor.id === 'wreck-rowboat')!;
    expect(rowboat).toMatchObject({ surfaceId: 'sea' });

    const outward = (stormwreckBundle.ports ?? []).find(port => port.id === 'travel-pecio-boat')!;
    expect(outward.to.cell).toEqual(rowboat.cell);
    expect(Math.abs(boarding.from.cell.col - rowboat.cell.col) + Math.abs(boarding.from.cell.row - rowboat.cell.row)).toBe(1);
    Object.assign(mike, { sceneId: outward.from.mapId, surfaceId: outward.from.surfaceId, cell: { ...outward.from.cell } });
    expect(state.traversePort('mike', outward.id, 'forward', true)).toBe('MOVED');
    expect(state.progress['wreck.boat-arrived']).toBe(true);
    expect(mike).toMatchObject({ sceneId: 'wreck-ship', surfaceId: 'sea' });
    expect(mike.cell).toEqual(rowboat.cell);
    expect(state.startStep(mike, 'west')).toBe(true);
    finishStep(state);
    expect(mike).toMatchObject({ sceneId: 'wreck-ship', surfaceId: 'main', cell: boarding.to.cell });
    expect(state.progress['wreck.boarded']).toBe(true);
    expect(state.publicSnapshot(true, 'wreck-ship', 'sea').entities.map(entity => entity.id)).toContain('wreck-rowboat');
    expect(state.publicSnapshot(true, 'wreck-ship', 'main').entities.map(entity => entity.id)).toContain('wreck-rowboat');
    expect(state.publicSnapshot(true, 'wreck-ship', 'lower-deck').entities.map(entity => entity.id)).not.toContain('wreck-rowboat');

    expect(state.traversePort('mike', 'P01', 'return')).toBe('MOVED');
    expect(state.startStep(mike, 'east')).toBe(true);
    finishStep(state);
    expect(mike.cell).toEqual(rowboat.cell);
    expect(state.traversePort('mike', outward.id, 'return', true)).toBe('MOVED');
    expect(mike.sceneId).toBe('dragon-rest');

    const swimmer = new GameState(stormwreckBundle), swimmerActor = swimmer.characters.get('mike')!;
    const arrival = (stormwreckBundle.ports ?? []).find(port => port.id === 'travel-pecio-boat')!;
    Object.assign(swimmerActor, { sceneId: arrival.from.mapId, surfaceId: arrival.from.surfaceId, cell: { ...arrival.from.cell } });
    expect(swimmer.traversePort('mike', arrival.id, 'forward', true)).toBe('MOVED');
    const breachEntry = wreckPorts.find(port => port.id === 'P16')!.from;
    const sternApproach = { col: breachEntry.cell.col - 1, row: breachEntry.cell.row };
    expect(swimmerActor.cell).toEqual(rowboat.cell);
    expect(terrainTile(wreckRuntimeScenes[0]!.terrain!, { surfaceId: 'sea', cell: shipCell(24, 16) })).toBeTruthy();
    expect(swimmer.startStep(swimmerActor, 'south')).toBe(true);
    finishStep(swimmer);
    while (swimmerActor.cell.col > sternApproach.col) {
      expect(swimmer.startStep(swimmerActor, 'west')).toBe(true);
      finishStep(swimmer);
    }
    while (swimmerActor.cell.row > sternApproach.row) {
      expect(swimmer.startStep(swimmerActor, 'north')).toBe(true);
      finishStep(swimmer);
    }
    expect(swimmer.startStep(swimmerActor, 'east')).toBe(true);
    finishStep(swimmer);
    expect(swimmerActor.surfaceId).toBe('hold-air');
    expect(swimmer.progress['wreck.boarded']).toBe(true);
    expect(swimmer.startStep(swimmerActor, 'west')).toBe(true);
    expect(swimmerActor).toMatchObject({ sceneId: 'wreck-ship', surfaceId: 'sea', cell: breachEntry.cell });
  });

  it('desembarca a varios personajes junto al Retiro aunque el primero ocupe la casilla de llegada', () => {
    const state = new GameState(stormwreckBundle);
    const port = (stormwreckBundle.ports ?? []).find(candidate => candidate.id === 'travel-pecio-boat')!;
    const mia = state.characters.get('mia')!, mike = state.characters.get('mike')!;
    mia.sessionToken = 'mia-session';
    Object.assign(mia, { sceneId: port.to.mapId, surfaceId: port.to.surfaceId, cell: { ...port.to.cell } });
    Object.assign(mike, { sceneId: port.to.mapId, surfaceId: port.to.surfaceId, cell: { ...port.to.cell } });
    expect(state.traversePort('mia', port.id, 'return', true)).toBe('MOVED');
    expect(mia.cell).toEqual(port.from.cell);
    expect(state.traversePort('mike', port.id, 'return', true)).toBe('MOVED');
    expect(mike).toMatchObject({ sceneId: 'dragon-rest', surfaceId: port.from.surfaceId });
    expect(mike.cell).not.toEqual(mia.cell);
    expect(terrainTile(retreatTerrain, { surfaceId: mike.surfaceId, cell: mike.cell })).toBeTruthy();
  });

  it('conecta el ruido del timón con la revelación correcta al abrir C4', () => {
    const state = new GameState(stormwreckBundle);
    state.focusScene('wreck-ship');
    expect(objectCommand(state, { type: 'object:detach', objectId: 'wheel', cell: shipCell(5, 7), rotation: 0, outcome: 'fallen' }).code).toBe('APPLIED');
    expect(state.progress['wreck.c3-wheel-fell']).toBe(true);
    expect(state.progress['wreck.c4-knocking-cue']).toBe(true);
    expect(objectCommand(state, { type: 'object:interact', objectId: 'c4-barred-door', action: 'remove-bar' }).code).toBe('APPLIED');
    expect(objectCommand(state, { type: 'object:door', objectId: 'c4-barred-door', state: 'open' }).code).toBe('APPLIED');
    const zombies = state.dmState().npcs.filter(npc => npc.id.startsWith('c4-zombie'));
    expect(zombies.filter(npc => npc.visible)).toHaveLength(2);
    expect(zombies.filter(npc => npc.visible).every(npc => npc.surfaceId === 'main'
      && npc.cell.row >= shipCell(0, 3).row && npc.cell.row <= shipCell(0, 6).row)).toBe(true);
    expect(zombies.find(npc => npc.id === 'c4-zombie-3')?.visible).toBe(false);
  });

  it('alerta C4 si hizo falta una segunda prueba de Fuerza aunque el timón no cayera', () => {
    const state = new GameState(stormwreckBundle);
    state.focusScene('wreck-ship');
    expect(state.progress['wreck.c3-wheel-fell']).toBeUndefined();
    // Historical save-key name is retained; the DM marks it when a second
    // check was needed, including a successful second check.
    expect(state.applyWreckProgressToggle('wreck.c4-second-force-failed', true)).toBe('APPLIED');
    expect(objectCommand(state, { type: 'object:interact', objectId: 'c4-barred-door', action: 'remove-bar' }).code).toBe('APPLIED');
    expect(objectCommand(state, { type: 'object:door', objectId: 'c4-barred-door', state: 'open' }).code).toBe('APPLIED');
    const zombies = state.dmState().npcs.filter(npc => npc.id.startsWith('c4-zombie') && npc.visible);
    expect(zombies).toHaveLength(2);
    const door = state.dmState().objects.find(object => object.id === 'c4-barred-door')!;
    expect(zombies.every(npc => Math.abs(npc.cell.col - door.cell.col) + Math.abs(npc.cell.row - door.cell.row) <= 2)).toBe(true);
  });

  it('revela los zombis de C4 dentro del camarote aunque nadie haya dado la alerta', () => {
    const state = new GameState(stormwreckBundle); state.focusScene('wreck-ship');
    expect(state.progress['wreck.c3-wheel-fell']).toBeUndefined();
    expect(state.progress['wreck.c4-second-force-failed']).toBeUndefined();
    expect(objectCommand(state, { type: 'object:interact', objectId: 'c4-barred-door', action: 'remove-bar' }).code).toBe('APPLIED');
    expect(objectCommand(state, { type: 'object:door', objectId: 'c4-barred-door', state: 'open' }).code).toBe('APPLIED');
    const zombies = state.dmState().npcs.filter(npc => npc.id.startsWith('c4-zombie') && npc.visible);
    expect(zombies).toHaveLength(2);
    const door = state.dmState().objects.find(object => object.id === 'c4-barred-door')!;
    expect(zombies.some(npc => Math.abs(npc.cell.col - door.cell.col) + Math.abs(npc.cell.row - door.cell.row) > 2)).toBe(true);
  });

  it('registra que encontraron el cofre de C9 al acercarse, sin exigir que lo abran', () => {
    const state = new GameState(stormwreckBundle), mike = state.characters.get('mike')!;
    state.focusScene('wreck-ship');
    Object.assign(mike, { sceneId: 'wreck-ship', surfaceId: 'hold-air', cell: shipCell(13, 4) });
    expect(state.progress['wreck.c9-chest-found']).toBeUndefined();
    expect(state.moveEntityOneSquare('mike', shipCell(14, 4))).toBe('MOVED');
    finishStep(state);
    expect(mike).toMatchObject({ surfaceId: 'hold-air', cell: shipCell(14, 4) });
    expect(state.progress['wreck.c9-chest-found']).toBe(true);
    expect(state.progress['wreck.harpy-return-pending']).toBeUndefined();
  });

  it('dispara la vuelta de la arpía al volver de C9 a C8 y después a C1, con refuerzo de nivel 2', () => {
    const state = new GameState(stormwreckBundle), mike = state.characters.get('mike')!, terrain = wreckRuntimeScenes[0]!.terrain!;
    mike.sheet!.level = 2;
    state.focusScene('wreck-ship');
    const c8 = terrain.transitions.find(link => link.from.surfaceId === 'main' && link.to.surfaceId === 'lower-deck')!;
    const c9 = terrain.transitions.find(link => link.from.surfaceId === 'lower-deck' && link.to.surfaceId === 'hold-air')!;
    moveAcross(state, 'mike', c8.from, c8.to);
    moveAcross(state, 'mike', c9.from, c9.to);
    expect(objectCommand(state, { type: 'object:interact', objectId: 'c9-iron-chest', action: 'open' }).code).toBe('APPLIED');
    expect(state.progress['wreck.c9-chest-found']).toBe(true);
    moveAcross(state, 'mike', c9.to, c9.from);
    expect(state.progress['wreck.c9-returned-to-c8']).toBe(true);
    expect(state.progress['wreck.harpy-return-pending']).toBe(true);
    moveAcross(state, 'mike', c8.to, c8.from);
    expect(state.progress['wreck.harpy-return-triggered']).toBe(true);
    expect(state.progress['wreck.harpy-return-pending']).toBe(false);
    expect(state.publicSnapshot(true, 'wreck-ship', 'main').entities.map(entity => entity.id)).toContain('upper-harpy-1');
    expect(state.publicSnapshot(true, 'wreck-ship', 'c2').entities.map(entity => entity.id)).toContain('upper-harpy-2');
  });

  it('también agenda el regreso de la arpía tras descansar a bordo y volver a C1', () => {
    const state = new GameState(stormwreckBundle), mike = state.characters.get('mike')!, terrain = wreckRuntimeScenes[0]!.terrain!;
    const c2Tiles = terrain.surfaces.find(surface => surface.id === 'c2')!.tiles;
    let stair: { from: { surfaceId: string; cell: { col: number; row: number } }; to: { surfaceId: string; cell: { col: number; row: number } } } | null = null;
    for (const tile of c2Tiles) {
      const neighbor = surfaceNeighbors(terrain, { surfaceId: 'c2', cell: tile.cell }).find(candidate => candidate.surfaceId === 'main');
      if (neighbor) { stair = { from: { surfaceId: 'c2', cell: tile.cell }, to: { surfaceId: neighbor.surfaceId, cell: neighbor.cell } }; break; }
    }
    expect(stair).not.toBeNull();
    state.focusScene('wreck-ship');
    Object.assign(mike, { sceneId: 'wreck-ship', surfaceId: 'c2', cell: { ...stair!.from.cell } });
    expect(state.applyWreckProgressToggle('wreck.aboard-rest-completed', true)).toBe('APPLIED');
    expect(state.progress['wreck.harpy-return-pending']).toBe(true);
    moveAcross(state, 'mike', stair!.from, stair!.to);
    expect(state.progress['wreck.harpy-return-triggered']).toBe(true);
    expect(state.publicSnapshot(true, 'wreck-ship', 'main').entities.map(entity => entity.id)).toContain('upper-harpy-1');
  });

  it('no permite resolver a la arpía antes de que haya regresado al pecio', () => {
    const state = new GameState(stormwreckBundle);
    expect(state.progress['wreck.harpy-return-triggered']).toBeUndefined();
    expect(state.applyWreckProgressToggle('wreck.harpy-resolved', true)).toBe('HARPY_NOT_RETURNED');
    expect(state.progress['wreck.harpy-resolved']).toBeUndefined();
    state.progress['wreck.harpy-return-triggered'] = true;
    expect(state.applyWreckProgressToggle('wreck.harpy-resolved', true)).toBe('APPLIED');
    expect(state.progress['wreck.harpy-resolved']).toBe(true);
    const restored = new GameState(stormwreckBundle);
    restored.restoreDurable(state.captureDurable());
    expect(restored.progress['wreck.harpy-return-triggered']).toBe(true);
    expect(restored.progress['wreck.harpy-resolved']).toBe(true);
    expect(restored.applyWreckProgressToggle('wreck.harpy-resolved', true)).toBe('APPLIED');
    expect(restored.progress['wreck.harpy-resolved']).toBe(true);
    expect(restored.progress['wreck.harpy-return-pending']).toBe(false);
  });

  it('conserva resultados únicos de botín y permite solo una de las dos resoluciones de maldición', () => {
    const state = new GameState(stormwreckBundle);
    expect(state.applyWreckProgressToggle('wreck.c8-loot-3', true)).toBe('APPLIED');
    expect(state.applyWreckProgressToggle('wreck.c8-loot-3', false)).toBe('STORY_EVENT_ALREADY_RECORDED');
    state.applyWreckProgressToggle('wreck.journal-found', true);
    state.applyWreckProgressToggle('wreck.talisman-found', true);
    expect(state.applyWreckProgressToggle('wreck.items-given-to-runara', true)).toBe('APPLIED');
    expect(state.applyWreckProgressToggle('wreck.curse-grave', true)).toBe('APPLIED');
    expect(state.applyWreckProgressToggle('wreck.curse-aboard', true)).toBe('CURSE_ALREADY_RESOLVED');
    expect(state.applyWreckProgressToggle('wreck.curse-day-after', true)).toBe('APPLIED');
    expect(state.applyWreckProgressToggle('wreck.cleric-dream', true)).toBe('APPLIED');
    const restored = new GameState(stormwreckBundle); restored.restoreDurable(state.captureDurable());
    expect(restored.progress).toMatchObject({ 'wreck.c8-loot-3': true, 'wreck.curse-grave': true, 'wreck.curse-ended': true, 'wreck.curse-day-after': true, 'wreck.cleric-dream': true });
  });

  it('impide marcar hallazgos o romper la maldición antes de cumplir los pasos narrativos', () => {
    const state = new GameState(stormwreckBundle);
    expect(state.applyWreckProgressToggle('wreck.items-given-to-runara', true)).toBe('CLUES_NOT_FOUND');
    expect(state.applyWreckProgressToggle('wreck.curse-grave', true)).toBe('ITEMS_NOT_GIVEN_TO_RUNARA');
    expect(state.applyWreckProgressToggle('wreck.curse-day-after', true)).toBe('CURSE_NOT_RESOLVED');
    expect(state.applyWreckProgressToggle('wreck.chapter-level-up', true)).toBe('CHAPTER_NOT_COMPLETE');
    state.applyWreckProgressToggle('wreck.journal-found', true);
    state.applyWreckProgressToggle('wreck.talisman-found', true);
    expect(state.applyWreckProgressToggle('wreck.items-given-to-runara', true)).toBe('APPLIED');
    expect(state.applyWreckProgressToggle('wreck.curse-grave', true)).toBe('APPLIED');
    expect(state.applyWreckProgressToggle('wreck.curse-day-after', true)).toBe('APPLIED');
    expect(state.applyWreckProgressToggle('wreck.cleric-dream', true)).toBe('APPLIED');
    expect(state.applyWreckProgressToggle('wreck.chapter-level-up', true)).toBe('USE_LEVEL_UP_ACTION');
  });

  it('aplica el nivel elegido por el DM solo tras el desenlace y no rebaja personajes ya avanzados', () => {
    const state = new GameState(stormwreckBundle);
    expect(state.applyWreckChapterLevelUp(2)).toBe('CHAPTER_NOT_COMPLETE');
    state.progress['wreck.curse-day-after'] = true;
    state.characters.get('mike')!.sheet!.level = 3;
    expect(state.applyWreckChapterLevelUp(2)).toBe('APPLIED');
    expect(state.characters.get('mike')!.sheet?.level).toBe(3);
    expect(state.characters.get('mia')!.sheet?.level).toBe(2);
    expect(state.applyWreckChapterLevelUp(3)).toBe('STORY_EVENT_ALREADY_RECORDED');
  });

  it('convierte el pecio en mar vacío al día siguiente y bloquea volver a embarcar', () => {
    const state = new GameState(stormwreckBundle);
    state.focusScene('wreck-ship');
    state.progress['wreck.curse-grave'] = true;
    expect(state.applyWreckProgressToggle('wreck.curse-day-after', true)).toBe('APPLIED');
    const snapshot = state.publicSnapshot(true, 'wreck-ship');
    expect(snapshot.story?.wreckDisappeared).toBe(true);
    expect(snapshot.props).toHaveLength(0);
    expect(snapshot.scene.pickups).toHaveLength(0);
    expect(snapshot.scene.stageActors).toHaveLength(0);
    expect(state.dmState().objects).toHaveLength(0);
    expect(state.changeScene('wreck-ship')).toBe(false);
    expect(state.traversePort('mike', 'travel-pecio-boat', 'forward', true)).toBe('WRECK_DISAPPEARED');
    expect(objectCommand(state, { type: 'object:interact', objectId: 'c9-iron-chest', action: 'open' }).code).toBe('WRECK_DISAPPEARED');
  });

  it('permite la resolución alternativa de la maldición solo mientras el grupo está a bordo', () => {
    const state = new GameState(stormwreckBundle), mike = state.characters.get('mike')!; state.focusScene('wreck-ship');
    Object.assign(mike, { sceneId: 'dragon-rest' });
    expect(objectCommand(state, { type: 'object:interact', objectId: 'c9-iron-chest', action: 'open' }).code).toBe('APPLIED');
    expect(objectCommand(state, { type: 'object:interact', objectId: 'c9-iron-chest', action: 'take-package', characterId: 'mike' }).code).toBe('APPLIED');
    expect(state.applyWreckProgressToggle('wreck.package-opened', true)).toBe('APPLIED');
    expect(state.applyWreckProgressToggle('wreck.curse-aboard', true)).toBe('PARTY_NOT_ABOARD');
    Object.assign(mike, { sceneId: 'wreck-ship' });
    expect(state.applyWreckProgressToggle('wreck.curse-aboard', true)).toBe('APPLIED');
    expect(mike.inventory).not.toContain('Paquete encerado');
    expect(state.applyWreckProgressToggle('wreck.cleric-dream', true)).toBe('DREAM_NOT_READY');
    expect(state.applyWreckProgressToggle('wreck.curse-day-after', true)).toBe('PARTY_STILL_ABOARD');
    Object.assign(mike, { sceneId: 'dragon-rest' });
    expect(state.applyWreckProgressToggle('wreck.curse-day-after', true)).toBe('APPLIED');
    expect(state.applyWreckProgressToggle('wreck.curse-grave', true)).toBe('CURSE_ALREADY_RESOLVED');
    expect(state.applyWreckProgressToggle('wreck.cleric-dream', true)).toBe('APPLIED');
  });

  it('no ofrece la tabla d6 a los barriles decorativos de C8', () => {
    const state = new GameState(stormwreckBundle); state.focusScene('wreck-ship');
    expect(objectCommand(state, { type: 'object:interact', objectId: 'c8-barrel-01', action: 'assign-result', resultId: 1 }).code)
      .toBe('CAPABILITY_UNAVAILABLE');
    expect(objectCommand(state, { type: 'object:interact', objectId: 'c8-barrel-01', action: 'open' }).code)
      .toBe('APPLIED');
    expect(objectCommand(state, { type: 'object:interact', objectId: 'c8-barrel-01', action: 'take-loot', characterId: 'mike' }).code)
      .toBe('CAPABILITY_UNAVAILABLE');
    expect(state.progress['wreck.c8-loot-1']).toBeUndefined();
  });

  it('deja libre un resultado d6 de C8 si el DM deshace su asignación', () => {
    const state = new GameState(stormwreckBundle); state.focusScene('wreck-ship');
    for (const objectId of ['c8-container-01', 'c8-container-02']) expect(objectCommand(state, { type: 'object:interact', objectId, action: 'open' }).code).toBe('APPLIED');
    expect(objectCommand(state, { type: 'object:interact', objectId: 'c8-container-01', action: 'assign-result', resultId: 2 }).code).toBe('APPLIED');
    expect(objectCommand(state, { type: 'object:interact', objectId: 'c8-container-02', action: 'assign-result', resultId: 2 }).code).toBe('LOOT_RESULT_ALREADY_USED');
    const undo = state.dmState().undo.entryId!;
    expect(objectCommand(state, { type: 'object:undo', entryId: undo }).code).toBe('APPLIED');
    expect(state.progress['wreck.c8-loot-2']).toBeUndefined();
    expect(objectCommand(state, { type: 'object:interact', objectId: 'c8-container-02', action: 'assign-result', resultId: 2 }).code).toBe('APPLIED');
  });
});
