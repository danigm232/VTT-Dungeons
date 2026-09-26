// Validates proposed fixture geometry, NOT the unimplemented 0.2.1 runtime.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const read = name => JSON.parse(readFileSync(name, 'utf8').replace(/^\uFEFF/, ''));
const fixture = read('docs/fixtures/alpha-0.2.1-objects.json');
const base = read(fixture.baseFixture);
const key = cell => `${cell.col},${cell.row}`;
const equal = (a, b) => key(a) === key(b);
const footprint = (cell, rotation, offsets) => {
  let points = offsets.map(point => ({ ...point }));
  for (let i = 0; i < rotation / 90; i++) {
    const height = Math.max(...points.map(point => point.row)) + 1;
    points = points.map(point => ({ col: height - 1 - point.row, row: point.col }));
  }
  return points.map(point => ({ col: cell.col + point.col, row: cell.row + point.row }));
};
const terrain = new Set();
for (let row = base.walkableRect.minRow; row <= base.walkableRect.maxRow; row++) {
  for (let col = base.walkableRect.minCol; col <= base.walkableRect.maxCol; col++) terrain.add(key({ col, row }));
}
for (const cell of [...base.staticBlocked, fixture.mount.cell]) terrain.delete(key(cell));
const door = [base.door.cell];
const crate = footprint(base.crate.cell, base.crate.rotation, base.crate.baseFootprint);
const wheelBlock = [fixture.placements.wheelBlocksPassage.cell];
const crateBlock = footprint(fixture.placements.crateBlocksPassage.cell, 90, base.crate.baseFootprint);
const reaches = obstacles => {
  const allowed = new Set(terrain);
  for (const cell of obstacles) allowed.delete(key(cell));
  if (!allowed.has(key(base.route.from)) || !allowed.has(key(base.route.to))) return false;
  const queue = [base.route.from], seen = new Set([key(base.route.from)]);
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const cell = queue[cursor];
    if (equal(cell, base.route.to)) return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = { col: cell.col + dx, row: cell.row + dy };
      if (allowed.has(key(next)) && !seen.has(key(next))) { seen.add(key(next)); queue.push(next); }
    }
  }
  return false;
};
const routes = {
  doorClosed: reaches([...door, ...crate]),
  doorOpenWheelAttached: reaches(crate),
  doorOpenWheelDetachedBlocking: reaches([...crate, ...wheelBlock]),
  doorOpenWheelDamagedBlocking: reaches([...crate, ...wheelBlock]),
  doorOpenWheelDestroyed: reaches(crate),
  doorOpenWheelReturnedToMount: reaches(crate),
  doorOpenCrateBlocking: reaches(crateBlock),
  doorOpenCrateDestroyed: reaches([]),
  doorDestroyed: reaches(crate)
};
assert.deepEqual(routes, fixture.expectedReachability);
const placementError = (location, blocking, otherLocations = [], actors = []) => {
  if (location.some(cell => !terrain.has(key(cell)))) return 'BLOCKED_CELL';
  if (location.some(cell => base.spawns.some(spawn => equal(spawn, cell)))) return 'SPAWN_RESERVED';
  if (location.some(cell => otherLocations.some(other => equal(other, cell)))) return 'BLOCKED_CELL';
  if (blocking.some(cell => actors.some(actor => equal(actor, cell)))) return 'OCCUPIED_CELL';
  return null;
};
const checks = {
  detachedOnMount: placementError([fixture.mount.cell], [fixture.mount.cell]),
  detachedOnSpawn: placementError([base.spawns[0]], [base.spawns[0]]),
  crateOnOpenDoor: placementError(footprint(base.door.cell, 0, base.crate.baseFootprint), footprint(base.door.cell, 0, base.crate.baseFootprint), door),
  crateOnWheelDebris: placementError(footprint(wheelBlock[0], 0, base.crate.baseFootprint), footprint(wheelBlock[0], 0, base.crate.baseFootprint), wheelBlock),
  restoreWheelOverActor: placementError(wheelBlock, wheelBlock, [], [fixture.placements.actorOnWheelDebris]),
  restoreDoorOverActor: placementError(door, door, [], [fixture.placements.actorOnDoorDebris])
};
assert.deepEqual(checks, fixture.expectedChecks);
for (const rotation of fixture.wheel.allowedRotations) {
  assert.deepEqual(footprint(fixture.placements.wheelSafe.cell, rotation, fixture.wheel.baseFootprint), [fixture.placements.wheelSafe.cell]);
}
assert.equal(placementError([fixture.placements.wheelSafe.cell], [fixture.placements.wheelSafe.cell], [...crate, ...door]), null);

// Read the existing compiled, accepted pack only to verify the concrete deck patch.
const { publicCampaignDefinition } = await import(pathToFileURL(path.resolve('dist/server/campaigns/stormwreck-isle/public/pack.js')).href);
const patch = fixture.campaignPatch;
const deck = publicCampaignDefinition.scenes.find(scene => scene.id === patch.sceneId);
assert.ok(deck);
assert.equal(deck.surfaceId, patch.surfaceId);
assert.deepEqual(deck.grid, patch.grid);
assert.deepEqual(deck.spawns, patch.spawns);
assert.ok(equal(deck.props.find(prop => prop.id === patch.objectId).cell, patch.mountCell));
assert.ok(!deck.walkable.some(cell => equal(cell, patch.mountCell)));
assert.ok(deck.walkable.some(cell => equal(cell, patch.suggestedDetachedCell)));
assert.ok(!deck.spawns.some(cell => equal(cell, patch.suggestedDetachedCell)));
assert.deepEqual({ x: deck.grid.originX + (patch.mountCell.col + .5) * deck.grid.tileSize, y: deck.grid.originY + (patch.mountCell.row + .5) * deck.grid.tileSize }, patch.mountCenterPx);
console.log(JSON.stringify({ scope: 'DESIGN ONLY; does not exercise Alpha 0.2.1 runtime', routes, checks, rotations: '4/4', existingDeckPatch: 'PASS' }, null, 2));
