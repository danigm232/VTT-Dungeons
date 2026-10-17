import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import assembly from '../../campaigns/stormwreck-isle/public/retreat-zones/global-layout.json' with {type:'json'};
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
describe('Retiro del Dragón · integración global v2', () => {
  it('compiles as an independent Babylon scene with separate walkable and obstacle data', () => {
    const terrain = terrainSchema.parse(dragonRestScene.terrain);
    expect(dragonRestScene.id).toBe('dragon-rest');
    expect(terrain.tileMeters).toBe(1.5);
    expect(terrain.surfaces.map(surface => surface.id)).toEqual(expect.arrayContaining(
      ['beach', 'a1', 'a2', 'a3', 'a4', 'a5', 'pleamar', 'observatorio']));
    expect(terrain.surfaces.find(surface => surface.id === 'a1')!.tiles.length).toBeGreaterThan(150);
    expect(terrain.obstacles!.length).toBeGreaterThanOrEqual(29);
    expect(terrain.edgePaths!.length).toBeGreaterThan(100);
    expect(terrain.blockedEdges!.length).toBeGreaterThan(0);
    expect(dragonRestScene.props.find(prop => prop.id === 'a4-library-door')?.kind).toBe('door');
    expect(dragonRestScene.stageActors).toHaveLength(13);
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
    for (const [name,address] of Object.entries(assembly.walkTargets))
      expect(reachable(start,address),name).not.toBeNull();
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

  it('walks every zone using the authoritative mover, validates physical paths and preserves old saves',()=>{
    execFileSync(process.execPath,['node_modules/tsx/dist/cli.mjs','prototypes/retreat-global/verify_runtime.ts'],{cwd:process.cwd(),stdio:'pipe',timeout:25000});
    const result=JSON.parse(readFileSync('prototypes/retreat-global/artifacts/runtime-verification.json','utf8'));
    expect(result.authoritativeSteps).toBeGreaterThan(1400);
    expect(result.physicalSamples).toBeGreaterThan(7000);
    expect(result.doorChecks).toHaveLength(2);
    expect(result.doorChecks.every((d:any)=>d.closedBlocks&&d.manualOpen)).toBe(true);
    expect(result.legacySavePreserved).toBe(true);
    expect(result.interactionPoints).toHaveLength(13);
  });
});
