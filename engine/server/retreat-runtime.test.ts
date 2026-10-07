import { afterEach, describe, expect, it } from 'vitest';
import { NullEngine, Scene } from '@babylonjs/core';
import { createDragonRestVisuals } from '../../campaigns/stormwreck-isle/public/retreat-geometry.js';
import { dragonRestScene, dragonRestPorts, retreatStageActorInteractions } from '../../campaigns/stormwreck-isle/public/retreat-runtime.js';
import { surfaceNeighbors, terrainSchema, terrainTile } from '../shared/terrain.js';
import { compileCampaignBundle } from './campaign.js';
import { GameState } from './game.js';
import { stormwreckBundle } from '../../campaigns/stormwreck-isle/server.js';

const engines: NullEngine[] = [];
afterEach(() => engines.splice(0).forEach(engine => engine.dispose()));
function oneSquareNeighbors(origin: { surfaceId: string; cell: { col: number; row: number } }) {
  const byCell = new Map<string, { surfaceId: string; cell: { col: number; row: number } }>();
  for (const candidate of surfaceNeighbors(dragonRestScene.terrain!, origin)) {
    if (Math.abs(candidate.cell.col - origin.cell.col) + Math.abs(candidate.cell.row - origin.cell.row) !== 1) continue;
    if (dragonRestScene.terrain!.transitions.some(edge => edge.mode === 'portal'
      && ((edge.from.surfaceId === origin.surfaceId && edge.from.cell.col === origin.cell.col && edge.from.cell.row === origin.cell.row
        && edge.to.surfaceId === candidate.surfaceId && edge.to.cell.col === candidate.cell.col && edge.to.cell.row === candidate.cell.row)
        || (edge.to.surfaceId === origin.surfaceId && edge.to.cell.col === origin.cell.col && edge.to.cell.row === origin.cell.row
          && edge.from.surfaceId === candidate.surfaceId && edge.from.cell.col === candidate.cell.col && edge.from.cell.row === candidate.cell.row)))) continue;
    const key = `${candidate.cell.col},${candidate.cell.row}`;
    const current = byCell.get(key);
    if (!current || current.surfaceId === origin.surfaceId && candidate.surfaceId !== origin.surfaceId) byCell.set(key, candidate);
  }
  return [...byCell.values()];
}

function reachable(start: { surfaceId: string; cell: { col: number; row: number } },
  goal: { surfaceId: string; cell: { col: number; row: number } }, blocked = new Set<string>()) {
  const key = (address: typeof start) => `${address.surfaceId}:${address.cell.col},${address.cell.row}`;
  const queue = [start], seen = new Map([[key(start), 0]]);
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head]!, distance = seen.get(key(current))!;
    if (key(current) === key(goal)) return distance;
    for (const next of oneSquareNeighbors(current)) {
      const nextKey = key(next);
      if (blocked.has(nextKey) || seen.has(nextKey)) continue;
      seen.set(nextKey, distance + 1); queue.push(next);
    }
  }
  return null;
}

function movementRoute(start: { surfaceId: string; cell: { col: number; row: number } },
  goal: { surfaceId: string; cell: { col: number; row: number } }, blocked = new Set<string>()) {
  const key = (address: typeof start) => `${address.surfaceId}:${address.cell.col},${address.cell.row}`;
  const queue = [start], parent = new Map<string, typeof start | null>([[key(start), null]]);
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head]!;
    if (key(current) === key(goal)) {
      const route = [current]; let previous = parent.get(key(current));
      while (previous) { route.push(previous); previous = parent.get(key(previous)) ?? null; }
      return route.reverse();
    }
    for (const next of oneSquareNeighbors(current)) {
      const nextKey = key(next);
      if (blocked.has(nextKey) || parent.has(nextKey)) continue;
      parent.set(nextKey, current); queue.push(next);
    }
  }
  return null;
}
describe('Retiro del Dragón · V5.2', () => {
  it('compiles as an independent Babylon scene with separate walkable and obstacle data', () => {
    const terrain = terrainSchema.parse(dragonRestScene.terrain);
    expect(dragonRestScene.id).toBe('dragon-rest');
    expect(terrain.tileMeters).toBe(1.5);
    expect(terrain.surfaces.map(surface => surface.id)).toEqual(expect.arrayContaining(
      ['beach', 'a1', 'a2', 'a3', 'a4', 'a5', 'pleamar', 'observatorio']));
    expect(terrain.surfaces.find(surface => surface.id === 'a1')!.tiles.length).toBeGreaterThan(150);
    expect(terrain.obstacles!.length).toBeGreaterThan(100);
    expect(terrain.blockedEdges!.length).toBeGreaterThan(0);
    expect(dragonRestScene.props.find(prop => prop.id === 'a4-library-door')?.kind).toBe('door');
    expect(dragonRestScene.stageActors).toHaveLength(12);
  });

  it('routes from the beach to the monastery, both cliff paths and the harbor; A4 respects its door state', () => {
    const start = { surfaceId: 'beach', cell: dragonRestScene.spawns[0]! };
    const actor = (id: string) => dragonRestScene.stageActors!.find(candidate => candidate.id === id)!;
    const door = dragonRestScene.props.find(prop => prop.id === 'a4-library-door')!;
    const doorAddress = `${door.surfaceId}:${door.cell.col},${door.cell.row}`;
    const targets = ['retreat-tarak', 'retreat-varnoth', 'retreat-winch', 'retreat-community',
      'retreat-runara', 'exit-pleamar', 'exit-observatorio', 'travel-pecio-boat'];
    for (const id of targets) {
      const destination = actor(id);
      const goal = { surfaceId: destination.surfaceId!, cell: destination.cell };
      expect(reachable(start, goal), `Ruta hasta ${id}`).not.toBeNull();
    }
    const library = actor('retreat-library');
    expect(reachable(start, { surfaceId: library.surfaceId!, cell: library.cell }, new Set([doorAddress]))).toBeNull();
    for (const col of [44, 48, 52, 55, 59, 63])
      expect(reachable(start, { surfaceId: 'a1', cell: { col, row: 53 } }), `Entrada A1 ${col}`).not.toBeNull();
    expect(dragonRestPorts).toHaveLength(1);
    expect(dragonRestPorts[0]!.to.mapId).toBe('wreck-ship');
    expect(dragonRestPorts[0]!.autoDirection).toBe('manual');
  });

  it('keeps the imported V5.2 meshes in Babylon and batches static geometry for rendering', () => {
    const engine = new NullEngine(); engines.push(engine);
    const scene = new Scene(engine);
    const visuals = createDragonRestVisuals(scene);
    expect(visuals.root.position.asArray()).toEqual([96, 0, 91.5]);
    expect(visuals.stats.source).toBe('Retiro_Dragon_V5_2');
    expect(visuals.stats.mergedBatches).toBeGreaterThan(0);
    expect(visuals.stats.sourceMeshes).toBeLessThan(450);
    expect(scene.getMaterialByName('rock_grey_basalt')).not.toBeNull();
    expect(scene.getMaterialByName('aged_wood')).not.toBeNull();
    for (const mesh of visuals.root.getChildMeshes()) {
      const material = mesh.material;
      if (!material) continue;
      const paints = material.getClassName() === 'MultiMaterial' ? (material as any).subMaterials : [material];
      for (const paint of paints) if (paint) expect(scene.materials, `${mesh.name}: ${paint.name}`).toContain(paint);
    }
    const west = scene.getMeshByName('A1_VARNOTH_ENTRY_W')!;
    const east = scene.getMeshByName('A1_VARNOTH_ENTRY_E')!;
    const opening = east.position.x - 1.78 * east.scaling.x / 2 - (west.position.x + 1.78 * west.scaling.x / 2);
    expect(opening).toBeCloseTo(2, 5);
    const hinge = scene.getTransformNodeByName('A4_DOOR_HINGE')!;
    expect(hinge.parent).toBe(visuals.root);
    expect(hinge.rotation.y).toBeCloseTo(-Math.PI / 2);
    visuals.openLibraryDoor(true);
    expect(hinge.rotation.y).toBe(0);
  });

  it('uses the existing campaign movement, interaction and travel systems without resolving narrative actions', () => {
    const compiled = compileCampaignBundle(stormwreckBundle);
    expect(compiled.public.initialSceneId).toBe('dragon-rest');
    expect(compiled.stageActorInteractions).toHaveLength(retreatStageActorInteractions.length);
    expect(compiled.privateActors!.filter(actor => actor.sceneId === 'dragon-rest')).toHaveLength(3);
    expect(compiled.doorStates!['dragon-rest']!['a4-library-door']).toBe('closed');
    expect(terrainTile(dragonRestScene.terrain!, { surfaceId: 'beach', cell: dragonRestScene.spawns[0]! })).not.toBeNull();
  });

  it('moves a character through every zone and each monastic cell with the authoritative one-square mover', () => {
    const state = new GameState(stormwreckBundle);
    state.focusScene('dragon-rest');
    const character = state.characters.get('mike')!;
    state.characters.get('mia')!.sceneId = 'wreck-ship';
    Object.assign(character, { sceneId: 'dragon-rest', surfaceId: 'beach', cell: { ...dragonRestScene.spawns[0]! } });
    const key = (address: { surfaceId: string; cell: { col: number; row: number } }) =>
      `${address.surfaceId}:${address.cell.col},${address.cell.row}`;
    const closedDoor = dragonRestScene.props.find(prop => prop.id === 'a4-library-door')!;
    const doorAddress = { surfaceId: closedDoor.surfaceId!, cell: closedDoor.cell };
    const occupiedActors = new Set([...state.npcs.values()].filter(actor => actor.blocksMovement && actor.visible && actor.sceneId === 'dragon-rest')
      .map(actor => key({ surfaceId: actor.surfaceId, cell: actor.cell })));
    const blockedClosed = new Set([...occupiedActors, key(doorAddress)]);
    const targets = [44, 48, 52, 55, 59, 63].map(col => ({ surfaceId: 'a1', cell: { col, row: 53 } }));
    let current = { surfaceId: character.surfaceId, cell: { ...character.cell } };
    const walkTo = (target: typeof current, blocked = blockedClosed) => {
      const route = movementRoute(current, target, blocked);
      expect(route, `Ruta jugable ${key(target)}`).not.toBeNull();
      for (const address of route!.slice(1)) {
        expect(state.moveEntityOneSquare('mike', address.cell), `Paso ${key(current)} → ${key(address)}; actor=${key({ surfaceId: character.surfaceId, cell: character.cell })}`).toBe('MOVED');
        character.step!.startedAt = Date.now() - character.step!.durationMs - 1;
        state.tick();
        expect(character).toMatchObject({ sceneId: 'dragon-rest', surfaceId: address.surfaceId, cell: address.cell });
      }
      current = target;
    };
    for (const target of targets) walkTo(target);
    for (const id of ['retreat-tarak', 'retreat-varnoth', 'retreat-winch', 'retreat-community',
      'retreat-runara', 'exit-pleamar', 'exit-observatorio', 'travel-pecio-boat']) {
      const actor = state.npcs.get(id)!;
      const candidates = oneSquareNeighbors({ surfaceId: actor.surfaceId, cell: actor.cell });
      const goal = candidates
        .find(address => address.surfaceId === actor.surfaceId
          && Math.abs(address.cell.col - actor.cell.col) + Math.abs(address.cell.row - actor.cell.row) === 1
          && !occupiedActors.has(key(address)) && movementRoute(current, address, blockedClosed));
      expect(goal, `Casilla de interacción libre junto a ${id}`).toBeDefined();
      walkTo(goal!);
      expect(state.stageActorInteractionFor('mike', id)?.notice, `Interacción sin automatizar: ${id}`).toBeTruthy();
    }

    const neighbor = surfaceNeighbors(dragonRestScene.terrain!, doorAddress).find(address =>
      Math.abs(address.cell.col - doorAddress.cell.col) + Math.abs(address.cell.row - doorAddress.cell.row) === 1
      && !occupiedActors.has(key(address)) && movementRoute(current, address, blockedClosed))!;
    walkTo(neighbor, blockedClosed);
    expect(state.moveEntityOneSquare('mike', doorAddress.cell)).toBe('BLOCKED_CELL');
    const result = state.applyObjectCommand({ type: 'object:door', commandId: crypto.randomUUID(),
      sceneEpoch: state.sceneEpoch, objectRevision: state.objectRevision, objectId: closedDoor.id, state: 'open' });
    expect(result.code).toBe('APPLIED');
    expect(state.moveEntityOneSquare('mike', doorAddress.cell)).toBe('MOVED');
    character.step!.startedAt = Date.now() - character.step!.durationMs - 1;
    state.tick();
    current = doorAddress;
    const library = state.npcs.get('retreat-library')!;
    const libraryApproach = oneSquareNeighbors({ surfaceId: library.surfaceId, cell: library.cell })
      .find(address => Math.abs(address.cell.col - library.cell.col) + Math.abs(address.cell.row - library.cell.row) === 1
        && !occupiedActors.has(key(address)) && movementRoute(current, address, occupiedActors))!;
    walkTo(libraryApproach, occupiedActors);

    const wall = dragonRestScene.terrain!.obstacles!.find(obstacle => obstacle.obstacleId === 'a4_west_wall')!;
    const wallApproach = [{ col: wall.cell.col - 1, row: wall.cell.row }, { col: wall.cell.col + 1, row: wall.cell.row },
      { col: wall.cell.col, row: wall.cell.row - 1 }, { col: wall.cell.col, row: wall.cell.row + 1 }]
      .find(cell => terrainTile(dragonRestScene.terrain!, { surfaceId: wall.surfaceId, cell }));
    expect(wallApproach).toBeDefined();
    Object.assign(character, { surfaceId: wall.surfaceId, cell: { ...wallApproach! }, step: null, moving: false });
    expect(state.moveEntityOneSquare('mike', wall.cell)).toBe('BLOCKED_CELL');

    const cliffEdge = dragonRestScene.terrain!.blockedEdges!.find(edge => edge.surfaceId === 'a5')!;
    Object.assign(character, { surfaceId: cliffEdge.surfaceId, cell: { ...cliffEdge.from }, step: null, moving: false });
    expect(state.moveEntityOneSquare('mike', cliffEdge.to)).toBe('BLOCKED_CELL');
  });
});
