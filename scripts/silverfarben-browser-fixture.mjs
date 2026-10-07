// Test preparation only. Never point this at a live table: combat, HP and
// resources are reset deliberately before the browser plays the actual duel.
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { io } from 'socket.io-client';
const base = process.env.DUNGEONS_REVIEW_BASE;
assert.ok(base, 'Supply the isolated review-session URL in DUNGEONS_REVIEW_BASE');
const url = new URL(base);
assert.equal(url.hostname, '127.0.0.1'); assert.ok(Number(url.port) > 40000, 'Refusing a normal game port');
const build = path.resolve(process.env.DUNGEONS_SERVER_BUILD || 'dist/server');
const { PROTOCOL_VERSION, OBJECT_MODEL_VERSION } = await import(pathToFileURL(path.join(build, 'engine/shared/protocol.js')));
const { surfaceNeighbors } = await import(pathToFileURL(path.join(build, 'engine/shared/terrain.js')));
const { segmentCrossesBox, footprintFor } = await import(pathToFileURL(path.join(build, 'engine/shared/geometry.js')));
const wait = (socket, event, predicate = () => true) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => { socket.off(event, listener); reject(new Error(`Timeout: ${event}`)); }, 10000);
  const listener = value => { if (!predicate(value)) return; clearTimeout(timer); socket.off(event, listener); resolve(value); };
  socket.on(event, listener);
});
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const login = await fetch(`${base}/api/dm/login`, { method: 'POST', headers: { 'content-type': 'application/json', origin: base }, body: '{}' });
assert.equal(login.status, 200);
const socket = io(base, { autoConnect: false, forceNew: true, transports: ['websocket'], auth: { role: 'dm', protocolVersion: PROTOCOL_VERSION, objectModelVersion: OBJECT_MODEL_VERSION }, extraHeaders: { Cookie: login.headers.get('set-cookie').split(';')[0] } });
let state, world;
socket.on('dm:state', value => state = value); socket.on('world:snapshot', value => world = value);
const initial = wait(socket, 'dm:state'); socket.connect(); await initial;
const command = async body => {
  const raw = { commandId: crypto.randomUUID(), runtimeEpoch: state.runtimeEpoch,
    ...(['hp', 'entity:hp', 'resource'].includes(body.type) ? {} : { sceneEpoch: state.sceneEpoch }), ...body };
  const result = wait(socket, 'command:result', value => value.commandId === raw.commandId || !value.commandId);
  const refreshed = wait(socket, 'dm:state');
  console.log(`Preparing ${body.type}`);
  socket.emit('dm:command', raw); const applied = await result; assert.equal(applied.ok, true, `${body.type}: ${applied.code}`);
  await refreshed; return applied;
};
try {
  const campaign = await (await fetch(`${base}/api/campaign`)).json();
  assert.equal(campaign.campaignId, 'd8-night-private');
  if (process.argv.includes('--closeout')) {
    const actor = state.characters.find(character => character.id === 'aoife');
    assert.ok(state.combat.active && !state.combat.prompt);
    const hp = actor.hp, slot = actor.resources['spell-slot-1'].current;
    await command({ type: 'combat:withdraw', entityId: 'aoife' });
    assert.equal(state.combat.active, false);
    assert.equal(state.characters.find(character => character.id === 'aoife').hp, hp);
    assert.equal(state.characters.find(character => character.id === 'aoife').resources['spell-slot-1'].current, slot);
    console.log(JSON.stringify({ withdrawal: 'PASS', hp, slot, active: state.combat.active }));
  } else {
  if (state.combat.active) await command({ type: 'combat:end' });
  const sceneId = process.env.DUNGEONS_REVIEW_SCENE ?? 'dinner';
  assert.ok(['temple', 'dinner'].includes(sceneId));
  if (world.sceneId !== sceneId) await command({ type: 'scene', sceneId });
  const enemyId = `anteros-${sceneId}`;
  await command({ type: 'npc:visible', entityId: enemyId, visible: true });
  await command({ type: 'entity:hp', entityId: enemyId, hp: 71 });
  await command({ type: 'hp', characterId: 'aoife', hp: 7 });
  await command({ type: 'resource', characterId: 'aoife', resourceId: 'spell-slot-1', current: 2 });
  const actor = world.entities.find(entity => entity.id === 'aoife'), enemy = world.entities.find(entity => entity.id === enemyId), scene = world.scene;
  assert.ok(actor && enemy, 'Claim Silverfarben in the review browser first');
  const key = cell => `${cell.col},${cell.row}`;
  const forbidden = new Set(world.entities.filter(entity => entity.id !== actor.id).map(entity => key(entity.cell)));
  for (const prop of world.props) if (prop.structure !== 'destroyed' && (prop.kind === 'door' ? prop.state !== 'open' : prop.kind === 'wheel' ? prop.attachment === 'detached' : true))
    for (const cell of footprintFor(prop.cell, prop.rotation, prop.footprint)) forbidden.add(key(cell));
  const paths = [[actor.cell]], visited = new Set([key(actor.cell)]);
  let route;
  for (let i = 0; i < paths.length; i++) {
    const candidate = paths[i], cell = candidate.at(-1);
    if (Math.hypot(cell.col - enemy.cell.col, cell.row - enemy.cell.row) <= 1 && !scene.effectWalls.some(wall => segmentCrossesBox(cell, enemy.cell, wall))) { route = candidate; break; }
    for (const address of surfaceNeighbors(scene.terrain, { surfaceId: scene.surfaceId, cell })) {
      const next = address.cell;
      if (Math.abs(next.col - cell.col) + Math.abs(next.row - cell.row) !== 1 || forbidden.has(key(next)) || visited.has(key(next))) continue;
      visited.add(key(next)); paths.push([...candidate, next]);
    }
  }
  assert.ok(route, 'No legal melee approach');
  for (const cell of route.slice(1)) { await command({ type: 'entity:move', entityId: actor.id, cell }); await delay(250); }
  console.log(JSON.stringify({ prepared: true, sceneId, enemyId, steps: route.length - 1, cell: world.entities.find(entity => entity.id === actor.id).cell, hp: 7, enemyHp: 71, initiative: 'Not rolled: enter it in the browser' }));
  }
} finally { socket.disconnect(); }
