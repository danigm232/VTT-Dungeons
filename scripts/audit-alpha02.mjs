// Contract probes. Run against an isolated build, never an existing game server.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { writeFile } from 'node:fs/promises';
import { Server } from 'socket.io';
import { io as client } from 'socket.io-client';

const buildDir = process.env.AUDIT_BUILD_DIR ?? 'dist/server';
const moduleAt = file => import(pathToFileURL(resolve(buildDir, file)).href);
const { GameState, GameServer } = await moduleAt('engine/server/game.js');
const { stormwreckBundle } = await moduleAt('campaigns/stormwreck-isle/server.js');
const { isWalkable } = await moduleAt('engine/server/navigation.js');
const results = [];
async function probe(id, name, run) {
  try { await run(); results.push({ id, name, status: 'PASS' }); }
  catch (error) { results.push({ id, name, status: 'FAIL', detail: error.message }); }
  console.log(`${results.at(-1).status} ${id}: ${name}`);
}
// Alpha 0.2 probes start from the public "closed" baseline. Alpha 0.2.1 seeds the
// same public appearance as privately locked, so explicitly unlock before probing.
const fresh = () => { const s = new GameState(stormwreckBundle); s.changeScene('wreck-objects'); door(s, 'closed'); return s; };
const edit = (s, body) => s.applyObjectCommand({ commandId: randomUUID(), sceneEpoch: s.sceneEpoch, objectRevision: s.objectRevision, ...body });
const door = (s, state) => edit(s, { type: 'object:door', objectId: 'practice-door', state });
const moveCrate = (s, cell, rotation = 0) => edit(s, { type: 'object:transform', objectId: 'practice-crate', cell, rotation });
function reachable(s) {
  const queue = [{ col: 2, row: 4 }], visited = new Set();
  while (queue.length) {
    const cell = queue.shift(), key = `${cell.col},${cell.row}`;
    if (visited.has(key) || !isWalkable(s.currentScene(), cell, s.publicObjectProps())) continue;
    if (cell.col === 8 && cell.row === 4) return true;
    visited.add(key);
    for (const [x, y] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) queue.push({ col: cell.col + x, row: cell.row + y });
  }
  return false;
}

await probe('R01', 'Cuatro rutas del fixture usando la colisión real', () => {
  const s = fresh(); assert.equal(reachable(s), false);
  assert.equal(door(s, 'open').ok, true); assert.equal(reachable(s), true);
  assert.equal(moveCrate(s, { col: 5, row: 3 }, 90).ok, true); assert.equal(reachable(s), false);
  assert.equal(moveCrate(s, { col: 3, row: 4 }).ok, true); assert.equal(reachable(s), true);
});
await probe('R02', 'Abrir una puerta bloqueada exige desbloquear primero', () => {
  const s = fresh(); assert.equal(door(s, 'locked').ok, true);
  assert.equal(door(s, 'open').code, 'DOOR_LOCKED');
});
await probe('R03', 'DM ve locked; público sólo closed', () => {
  const s = fresh(); door(s, 'locked');
  assert.equal(s.publicObjectProps().find(p => p.kind === 'door').state, 'closed');
  assert.equal(s.dmState().objects.find(p => p.kind === 'door').state, 'locked');
});
await probe('R04', 'Caja no puede ocupar el marco de una puerta abierta', () => {
  const s = fresh(); door(s, 'open');
  assert.equal(moveCrate(s, { col: 6, row: 4 }).ok, false);
});
await probe('R05', 'Editar un objeto avanza la revisión pública del mundo', () => {
  const s = fresh(), before = s.publicSnapshot().revision; door(s, 'open');
  assert.ok(s.publicSnapshot().revision > before, 'revision pública no avanzó tras abrir');
});
await probe('R06', 'Volver a la escena conserva objetos, undo y su revisión', () => {
  const s = fresh(); door(s, 'open');
  const before = s.dmState(); s.changeScene('wreck-deck'); s.changeScene('wreck-objects');
  assert.deepEqual(s.dmState().objects, before.objects); assert.deepEqual(s.dmState().undo, before.undo);
  assert.equal(s.dmState().objectRevision, before.objectRevision);
});
await probe('R07', 'Snapshot público omite el contador privado de edición', () => {
  assert.equal(Object.hasOwn(fresh().publicSnapshot(), 'objectRevision'), false);
});
await probe('R08', 'Reservas origen/destino a 0/150/299 ms y liberación a 300 ms', () => {
  const realNow = Date.now;
  try {
    for (const outgoing of [false, true]) {
      let now = 1_000; Date.now = () => now;
      const s = fresh(); door(s, 'open'); const c = s.characters.get('mike');
      c.cell = { col: outgoing ? 6 : 5, row: 4 };
      assert.equal(s.startStep(c, 'east', now), true);
      for (const elapsed of [0, 150, 299]) {
        now = 1_000 + elapsed; s.tick();
        assert.equal(door(s, 'closed').code, 'OCCUPIED_CELL');
      }
      now = 1_300; s.tick();
      assert.equal(door(s, 'closed').ok, outgoing);
    }
  } finally { Date.now = realNow; }
});
await probe('R09', 'Undo ocupado rechaza y conserva historial/revisión', () => {
  const s = fresh(); door(s, 'open'); const before = s.dmState();
  s.characters.get('mike').cell = { col: 6, row: 4 };
  assert.equal(edit(s, { type: 'object:undo', entryId: before.undo.entryId }).ok, false);
  assert.deepEqual(s.dmState().undo, before.undo); assert.equal(s.objectRevision, before.objectRevision);
});

// Real authenticated sockets on a fresh loopback-only ephemeral port.
const http = createServer(), io = new Server(http), token = randomUUID();
const game = new GameServer(io, token, stormwreckBundle), sockets = [];
game.start(); http.listen(0, '127.0.0.1'); await once(http, 'listening');
const base = `http://127.0.0.1:${http.address().port}`;
function event(socket, name, predicate = () => true) {
  return new Promise((resolveEvent, reject) => {
    const timer = setTimeout(() => { socket.off(name, handler); reject(new Error(`Timeout: ${name}`)); }, 3_000);
    function handler(data) { if (!predicate(data)) return; clearTimeout(timer); socket.off(name, handler); resolveEvent(data); }
    socket.on(name, handler);
  });
}
async function openDm() {
  const socket = client(base, { autoConnect: false, reconnection: false, transports: ['websocket'], auth: { role: 'dm', protocolVersion: 4, objectModelVersion: 1 }, extraHeaders: { Cookie: `dnd_dm=${token}` } });
  sockets.push(socket); const ready = event(socket, 'dm:state'); socket.connect(); await ready; return socket;
}
async function command(socket, payload) {
  const pending = event(socket, 'command:result', result => result.commandId === payload.commandId);
  socket.emit('dm:command', payload); return pending;
}
try {
  const dm = await openDm(); game.state.changeScene('wreck-objects');
  const payload = { type: 'object:door', runtimeEpoch: game.state.runtimeEpoch, commandId: randomUUID(), sceneEpoch: game.state.sceneEpoch, objectRevision: 0, objectId: 'practice-door', state: 'closed' };
  const first = await command(dm, payload);
  await probe('R10', 'Reintento idéntico por socket conserva ACK y revisión', async () => {
    assert.equal(first.ok, true); const before = game.state.objectRevision;
    assert.deepEqual(await command(dm, payload), first); assert.equal(game.state.objectRevision, before);
  });
  await probe('R11', 'UUID reutilizado con otro payload se rechaza', async () => {
    const result = await command(dm, { ...payload, state: 'open' });
    assert.equal(result.code, 'COMMAND_ID_REUSED');
  });
  await probe('R12', 'Dos DM con igual revisión: un éxito y un STALE_OBJECTS', async () => {
    const other = await openDm(), revision = game.state.objectRevision;
    const [a, b] = await Promise.all([
      command(dm, { ...payload, commandId: randomUUID(), objectRevision: revision, state: 'open' }),
      command(other, { ...payload, commandId: randomUUID(), objectRevision: revision, state: 'locked' })
    ]);
    assert.equal([a, b].filter(r => r.ok).length, 1);
    assert.equal([a, b].find(r => !r.ok).code, 'STALE_OBJECTS');
  });
} finally {
  sockets.forEach(socket => socket.disconnect()); game.stop();
  await new Promise(resolveClose => io.close(resolveClose));
}
const report = { date: new Date().toISOString(), buildDir, scope: 'Contract probes, not physical or browser acceptance', results };
if (process.env.AUDIT_REPORT) await writeFile(process.env.AUDIT_REPORT, JSON.stringify(report, null, 2) + '\n');
const failures = results.filter(r => r.status === 'FAIL').length;
console.log(`${results.length - failures}/${results.length} PASS; ${failures} contract failures.`);
process.exitCode = failures ? 1 : 0;
