import { afterEach, expect, it } from 'vitest';
import { NullEngine, Scene } from '@babylonjs/core';
import { wreckRuntimeScenes } from '../../campaigns/stormwreck-isle/public/wreck-runtime.js';
import { buildShipRowboat, rowboatHullClearance, rowboatYaw } from './ship-rowboat3d.js';

const engines: NullEngine[] = [];
afterEach(() => engines.splice(0).forEach(engine => engine.dispose()));

it('builds an open, oared 3D boat without pickable or colliding geometry', () => {
  const engine = new NullEngine(); engines.push(engine);
  const scene = new Scene(engine);
  const boat = buildShipRowboat(scene), parts = boat.getChildMeshes();
  expect(parts.some(mesh => mesh.name === 'rowboat:curved-hull')).toBe(true);
  expect(parts.filter(mesh => mesh.name.includes('oar-blade'))).toHaveLength(2);
  expect(parts.filter(mesh => mesh.name.includes('thwart') && !mesh.name.includes('support'))).toHaveLength(3);
  expect(parts.filter(mesh => mesh.name.includes('cockpit-floorboard'))).toHaveLength(11);
  expect(parts.every(mesh => !mesh.isPickable && !mesh.checkCollisions)).toBe(true);
  expect(rowboatYaw('north')).toBeCloseTo(Math.PI / 2);
  expect(rowboatYaw('south')).toBeCloseTo(-Math.PI / 2);
});

it('keeps the visible boat hull outside C1 when its navigation cell is beside the boarding rail', () => {
  const ship = wreckRuntimeScenes[0]!, terrain = ship.terrain!, boat = ship.stageActors!.find(actor => actor.id === 'wreck-rowboat')!;
  const cells = terrain.surfaces.find(surface => surface.id === 'c1-hull')!.tiles.map(tile => tile.cell);
  const tile = terrain.tileMeters, x = (boat.cell.col + .5) * tile, z = (boat.cell.row + .5) * tile;
  const clearance = rowboatHullClearance(x, z, rowboatYaw('south'), cells, tile);
  expect(Math.hypot(clearance.x, clearance.z)).toBeGreaterThan(.5);
  const center = { x: x + clearance.x, z: z + clearance.z };
  expect(cells.some(cell => center.x + 1.28 > cell.col * tile && center.x - 1.28 < (cell.col + 1) * tile
    && center.z + 2.82 > cell.row * tile && center.z - 2.82 < (cell.row + 1) * tile)).toBe(false);
});
