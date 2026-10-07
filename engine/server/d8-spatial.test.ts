import { describe, expect, it } from 'vitest';
import { D8NIGHT } from '../../campaigns/one-shot/playground/d8night.config';
import { d8CellFromWorld, d8CellToWorld, d8SpatialNavigation, oneShotCampaignDefinition } from '../../campaigns/one-shot/public/pack';
import { oneShotBundle } from '../../campaigns/one-shot/server';
import { cellKey, segmentCrossesBox } from '../shared/geometry';
import { connectedSpatialCells } from '../shared/spatial-navigation';
import { surfaceNeighbors, terrainSchema } from '../shared/terrain';
import { GameState } from './game';

describe('D8 physical grid regression', () => {
  for (const scene of oneShotCampaignDefinition.scenes) it(`${scene.id}: exact squares, connected party and reachable actors/objectives`, () => {
    expect(terrainSchema.safeParse(scene.terrain).success).toBe(true);
    const a = d8CellToWorld(scene.id as any, { col: 0, row: 0 }), b = d8CellToWorld(scene.id as any, { col: 1, row: 1 });
    expect(b.x - a.x).toBeCloseTo(1.5); expect(b.z - a.z).toBeCloseTo(1.5);
    const reachable = new Set(connectedSpatialCells(scene.terrain!, scene.spawns[0]!).map(cellKey));
    for (const cell of [...scene.spawns, ...(scene.stageActors ?? []).map(actor => actor.cell), ...scene.props.map(prop => prop.cell)]) expect(reachable.has(cellKey(cell))).toBe(true);
    expect(new Set(scene.spawns.map(cellKey)).size).toBe(scene.spawns.length);
    const map=D8NIGHT.maps[scene.id as keyof typeof D8NIGHT.maps], [w,d]=map.MAP.size;
    const boxes=map.MAP.navigation.obstacles.map((o:any)=>({minCol:(o.position[0]-o.size[0]/2+w/2)/1.5,maxCol:(o.position[0]+o.size[0]/2+w/2)/1.5,minRow:(o.position[1]-o.size[1]/2+d/2)/1.5,maxRow:(o.position[1]+o.size[1]/2+d/2)/1.5}));
    for(const from of scene.walkable)for(const to of surfaceNeighbors(scene.terrain!,{surfaceId:scene.surfaceId,cell:from}))expect(boxes.some((box:any)=>segmentCrossesBox(from,to.cell,box))).toBe(false);
  });
  it('blocks the actual tavern bar, partitions, water and their thin crossing edges', () => {
    const data = d8SpatialNavigation('cafe');
    expect(data.walkable).not.toContainEqual(d8CellFromWorld('cafe', 0, -5.25));
    const map = D8NIGHT.maps.cafe, [w,d] = map.MAP.size;
    const boxes = map.MAP.navigation.obstacles.map((o: any) => ({ minCol: (o.position[0]-o.size[0]/2+w/2)/1.5, maxCol: (o.position[0]+o.size[0]/2+w/2)/1.5, minRow: (o.position[1]-o.size[1]/2+d/2)/1.5, maxRow: (o.position[1]+o.size[1]/2+d/2)/1.5 }));
    for (const from of data.walkable) for (const to of surfaceNeighbors(data.terrain, { surfaceId: 'cafe', cell: from })) expect(boxes.some((box: any) => segmentCrossesBox(from, to.cell, box))).toBe(false);
    const ice=d8CellFromWorld('mirror',2,.6);
    expect(d8SpatialNavigation('mirror').walkable).toContainEqual(ice);
    expect(oneShotCampaignDefinition.scenes.find(s=>s.id==='mirror')!.movementHazards![0]!.cells).toContainEqual(ice);
  });
  it('movement from player controls also respects live hostile NPC occupancy', () => {
    const state = new GameState(oneShotBundle); state.claim('a'.repeat(32), 'maria-socket', 'maria'); state.changeScene('cafe');
    expect(state.revealEncounterGroup('patrons', 1)).toBe(true);
    const npc = state.npcs.get('brawler-cafe-1')!, maria = state.characters.get('maria')!;
    const from = surfaceNeighbors(d8SpatialNavigation('cafe').terrain, { surfaceId: 'cafe', cell: npc.cell }).find(entry => entry.cell.row === npc.cell.row)!;
    expect(from).toBeDefined(); maria.cell = { ...from.cell };
    expect(state.startStep(maria, maria.cell.col < npc.cell.col ? 'east' : 'west')).toBe(false);
    expect(maria.cell).toEqual(from.cell);
  });
  it('upgrades v2 positions only when newly inside scenery, preserving resources and states', () => {
    const state = new GameState(oneShotBundle); state.claim('a'.repeat(32), 'maria-socket', 'maria'); state.changeScene('cafe');
    const now = Date.now(), payload = state.captureDurable(now); payload.d8GridVersion = 2;
    const maria = payload.characters.find(character => character.id === 'maria')!;
    maria.cell = d8CellFromWorld('cafe', 0, -5.25); maria.hp = 3;
    const legal = { ...payload.characters.find(character => character.id === 'aoife')!.cell };
    const restored = new GameState(oneShotBundle); restored.restoreDurable(payload, now);
    expect(restored.characters.get('maria')!.hp).toBe(3);
    expect(restored.characters.get('maria')!.cell).not.toEqual(maria.cell);
    expect(restored.characters.get('aoife')!.cell).toEqual(legal);
    const saved = restored.captureDurable(now); expect(saved.d8GridVersion).toBe(3);
    const again = new GameState(oneShotBundle); again.restoreDurable(saved, now); expect(again.captureDurable(now)).toEqual(saved);
  });
});
