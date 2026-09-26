// Read-only design checks. NOT an implementation or acceptance test of Alpha 0.3.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { compileCampaignBundle } from '../dist/server/engine/server/campaign.js';
import { footprintFor } from '../dist/server/engine/shared/geometry.js';
import { publicCampaignDefinition } from '../dist/server/campaigns/stormwreck-isle/public/pack.js';

const read = name => JSON.parse(readFileSync(new URL(`../docs/fixtures/alpha03/${name}`, import.meta.url), 'utf8'));
const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
const checksum = value => {
  const { checksum: ignored, ...body } = value;
  return createHash('sha256').update(JSON.stringify(stable(body))).digest('hex');
};
const key = cell => `${cell.col},${cell.row}`;
const equalIds = (actual, expected) => {
  assert.equal(new Set(actual).size, actual.length, 'Duplicate ID');
  assert.deepEqual([...actual].sort(), [...expected].sort());
};
const bundle = read('bundle.json'), compiled = compileCampaignBundle(bundle);
const current = read('save-v1.json'), legacy = read('save-v0.json');
for (const save of [legacy, current]) {
  assert.equal(save.checksum, checksum(save));
  assert.equal(save.format, 'dungeons-save');
  assert.equal(save.campaignId, bundle.public.campaignId);
  assert.equal(save.campaignStateVersion, bundle.campaignStateVersion);
  assert.ok(Number.isSafeInteger(save.generation) && save.generation > 0);
  assert.ok(Number.isSafeInteger(save.stateRevision) && save.stateRevision >= 0);
  assert.equal(new Date(save.savedAt).toISOString(), save.savedAt);
}
const migrated = structuredClone(legacy);
migrated.schemaVersion = 1;
migrated.payload.camera = { mode: 'fixed', focusId: null };
migrated.checksum = checksum(migrated);
assert.deepEqual(migrated, current);
const modified = structuredClone(current); modified.payload.characters[0].hp++;
assert.notEqual(checksum(modified), current.checksum, 'Corruption must change checksum');
const payload = current.payload;
equalIds(payload.characters.map(x => x.id), bundle.public.roster.map(x => x.id));
equalIds(payload.scenes.map(x => x.sceneId), bundle.public.scenes.map(x => x.id));
const blockers = new Map();
for (const savedScene of payload.scenes) {
  const definition = compiled.scenes.get(savedScene.sceneId);
  equalIds(savedScene.objects.map(x => x.id), definition.props.map(x => x.id));
  const locations = new Set(), blocking = new Set();
  for (const prop of definition.props) if (prop.kind === 'wheel') {
    for (const cell of footprintFor(prop.mount.cell, 0, prop.mount.footprint)) locations.add(key(cell));
  }
  for (const object of savedScene.objects) {
    const prop = definition.props.find(x => x.id === object.id);
    assert.equal(object.kind, prop.kind);
    assert.ok(prop.allowedRotations.includes(object.rotation));
    if (!prop.capabilities.transform) assert.deepEqual(object.cell, prop.cell);
    if (object.structure !== 'intact') assert.ok(prop.capabilities.structure);
    const attached = object.kind === 'wheel' && object.attachment === 'attached';
    if (attached) {
      assert.deepEqual(object.cell, prop.mount.cell);
      assert.equal(object.state, 'upright'); assert.notEqual(object.structure, 'destroyed');
    } else if (object.kind === 'wheel') assert.ok(['caught', 'fallen'].includes(object.state));
    if (object.kind === 'door') assert.ok(['open', 'closed', 'locked'].includes(object.state));
    for (const cell of footprintFor(object.cell, object.rotation, prop.baseFootprint)) {
      if (!attached) {
        assert.ok(definition.terrainWalkable.has(key(cell)), 'Object on invalid terrain');
        assert.ok(!locations.has(key(cell)), 'Overlapping objects/mount');
      }
      assert.ok(!definition.spawns.some(spawn => key(spawn) === key(cell)));
      locations.add(key(cell));
      if (object.structure !== 'destroyed' && !(object.kind === 'door' && object.state === 'open')) blocking.add(key(cell));
    }
  }
  blockers.set(savedScene.sceneId, blocking);
}
const scene = compiled.scenes.get(payload.sceneId);
for (const actor of payload.characters) {
  assert.equal(actor.surfaceId, scene.surfaceId);
  assert.ok(scene.terrainWalkable.has(key(actor.cell)) && !blockers.get(scene.id).has(key(actor.cell)));
  assert.ok(Number.isInteger(actor.hp) && actor.hp >= 0 && actor.hp <= bundle.characters[actor.id].maxHp);
  assert.ok(actor.inventory.length <= 100 && actor.inventory.every(x => typeof x === 'string' && x.length > 0 && x.length <= 200));
}
assert.equal(payload.creature.id, bundle.encounter.creature.id);
assert.equal(payload.creature.surfaceId, compiled.scenes.get(payload.creature.sceneId).surfaceId);
assert.ok(compiled.scenes.get(payload.creature.sceneId).terrainWalkable.has(key(payload.creature.cell)));
for (const track of [payload.audio.music, ...Object.values(payload.audio.layers)]) {
  assert.ok(Number.isFinite(track.offsetSeconds) && track.offsetSeconds >= 0);
  assert.ok(track.volume >= 0 && track.volume <= 1);
  assert.equal(typeof track.playing, 'boolean');
}
const forbidden = /"(?:sessionToken|socketId|input|step|startedAt|undo|privateNotes|projectorReady)"/;
assert.ok(!forbidden.test(JSON.stringify(current)));

const geometry = read('door-geometry.json');
const realScene = publicCampaignDefinition.scenes.find(x => x.id === geometry.sceneId);
assert.deepEqual(realScene.props.find(x => x.id === geometry.doorId).cell, geometry.cell);
assert.equal(realScene.grid.tileSize, geometry.grid);
assert.deepEqual(geometry.center, { x: (geometry.cell.col + .5) * 48, y: (geometry.cell.row + .5) * 48 });
const origin = { x: geometry.center.x - geometry.canvas.anchorX * geometry.canvas.width,
  y: geometry.center.y - geometry.canvas.anchorY * geometry.canvas.height };
assert.deepEqual(origin, { x: 288, y: 168 });
assert.deepEqual({ x: geometry.hinge.x - origin.x, y: geometry.hinge.y - origin.y }, { x: 24, y: 24 });
for (const end of [geometry.closedEnd, geometry.openEnd]) assert.equal(Math.hypot(end.x - geometry.hinge.x, end.y - geometry.hinge.y), 48);
assert.equal((geometry.closedEnd.x - geometry.hinge.x) * (geometry.openEnd.x - geometry.hinge.x)
  + (geometry.closedEnd.y - geometry.hinge.y) * (geometry.openEnd.y - geometry.hinge.y), 0);
const deck = publicCampaignDefinition.scenes.find(x => x.props.some(p => p.kind === 'wheel'));
const wheel = deck.props.find(x => x.kind === 'wheel');
assert.deepEqual(wheel.mount.cell, geometry.mount.cell);
assert.deepEqual(geometry.mount.center, { x: deck.grid.originX + (wheel.cell.col + .5) * 48,
  y: deck.grid.originY + (wheel.cell.row + .5) * 48 });
console.log('PASS DISEÑO: bundle sintético compilable, hashes v0/v1, migración de ejemplo, referencias/huellas, exclusión de efímeros y geometría propuesta.');
console.log('NO acredita runtime 0.3, almacenamiento, red v4, arte corregido ni hardware.');
