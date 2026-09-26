import assert from 'node:assert/strict';
import { io } from 'socket.io-client';
import { OBJECT_MODEL_VERSION, PROTOCOL_VERSION } from '../dist/server/engine/shared/protocol.js';

const base = process.env.TEST_URL ?? 'http://127.0.0.1:3124';
let phase = 'inicialización';
const wait = (socket, event, predicate = () => true, timeout = 5_000) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => { socket.off(event, handler); reject(new Error(`Timeout: ${event} durante ${phase}`)); }, timeout);
  const handler = data => { if (!predicate(data)) return; clearTimeout(timer); socket.off(event, handler); resolve(data); };
  socket.on(event, handler);
});
const protect = socket => {
  socket.on('runtime:reset', packet => socket.__runtimeEpoch = packet.runtimeEpoch);
  const original = socket.emit.bind(socket);
  socket.emit = (event, payload, ...tail) => original(event, event === 'dm:command' ? { runtimeEpoch: socket.__runtimeEpoch, ...payload } : payload, ...tail);
  return socket;
};
const connect = auth => new Promise((resolve, reject) => {
  const socket = protect(io(base, { autoConnect: false, auth: { protocolVersion: PROTOCOL_VERSION, objectModelVersion: OBJECT_MODEL_VERSION, ...auth }, transports: ['websocket'], forceNew: true }));
  socket.once('world:snapshot', snapshot => socket.__initialSnapshot = snapshot);
  const timer = setTimeout(() => reject(new Error('connect timeout')), 3_000);
  socket.once('connect', () => { clearTimeout(timer); resolve(socket); });
  socket.once('connect_error', reject);
  socket.connect();
});
const command = (socket, body) => {
  const commandId = crypto.randomUUID();
  const result = wait(socket, 'command:result', value => value.commandId === commandId);
  socket.emit('dm:command', { commandId, ...body });
  return result;
};

const login = await fetch(`${base}/api/dm/login`, {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: 'TESTPASS' })
});
assert.equal(login.status, 200);
const cookie = login.headers.get('set-cookie').split(';')[0];
const dm = await new Promise((resolve, reject) => {
  const socket = protect(io(base, { autoConnect: false, auth: { role: 'dm', protocolVersion: PROTOCOL_VERSION, objectModelVersion: OBJECT_MODEL_VERSION }, extraHeaders: { Cookie: cookie }, transports: ['websocket'], forceNew: true }));
  socket.once('dm:state', value => socket.__initialDmState = value);
  socket.once('connect', () => resolve(socket)); socket.once('connect_error', reject);
  socket.connect();
});
let state = dm.__initialDmState ?? await wait(dm, 'dm:state');
const player = await connect({ role: 'player', sessionToken: 'a'.repeat(32) });
const projector = await connect({ role: 'projector' });
phase = 'cambiar a la escena de objetos';
const objectsSceneState = wait(dm, 'dm:state', value => value.sceneId === 'wreck-objects' && value.sceneEpoch > state.sceneEpoch);
const scene = await command(dm, { type: 'scene', sceneEpoch: state.sceneEpoch, sceneId: 'wreck-objects' });
assert.equal(scene.ok, true);
state = await objectsSceneState;
const door = state.objects.find(value => value.id === 'practice-door');
const crate = state.objects.find(value => value.id === 'practice-crate');
assert.equal(door.state, 'locked');
assert.deepEqual(crate.cell, { col: 3, row: 4 });

const lockedOpen = await command(dm, { type: 'object:door', sceneEpoch: state.sceneEpoch, objectRevision: state.objectRevision, objectId: door.id, state: 'open' });
assert.equal(lockedOpen.code, 'DOOR_LOCKED');
phase = 'desbloquear y abrir puerta de prueba';
const unlockedState = wait(dm, 'dm:state', value => value.objectRevision > state.objectRevision);
const unlock = await command(dm, { type: 'object:door', sceneEpoch: state.sceneEpoch, objectRevision: state.objectRevision, objectId: door.id, state: 'closed' });
assert.equal(unlock.ok, true);
state = await unlockedState;
assert.equal(state.objectRevision, unlock.objectRevision);
const openedState = wait(dm, 'dm:state', value => value.objectRevision > state.objectRevision);
const open = await command(dm, { type: 'object:door', sceneEpoch: state.sceneEpoch, objectRevision: state.objectRevision, objectId: door.id, state: 'open' });
assert.equal(open.ok, true);
state = await openedState;
assert.equal(state.objectRevision, open.objectRevision);
assert.equal(state.objects.find(value => value.id === door.id).state, 'open');

phase = 'mover y deshacer caja';
const movedState = wait(dm, 'dm:state', value => value.objectRevision > state.objectRevision);
const moved = await command(dm, { type: 'object:transform', sceneEpoch: state.sceneEpoch, objectRevision: state.objectRevision, objectId: crate.id, cell: { col: 5, row: 3 }, rotation: 90 });
assert.equal(moved.ok, true);
state = await movedState;
assert.equal(state.objectRevision, moved.objectRevision);
assert.deepEqual(state.objects.find(value => value.id === crate.id).cell, { col: 5, row: 3 });
assert.equal(state.objects.find(value => value.id === crate.id).rotation, 90);

const refreshAfterStale = wait(dm, 'dm:state', value => value.objectRevision === state.objectRevision);
const stale = await command(dm, { type: 'object:door', sceneEpoch: state.sceneEpoch, objectRevision: state.objectRevision - 1, objectId: door.id, state: 'closed' });
assert.equal(stale.code, 'STALE_OBJECTS');
const freshAfterStale = await refreshAfterStale;
assert.equal(freshAfterStale.sceneEpoch, state.sceneEpoch, 'STALE_OBJECTS debe refrescar el estado DM');

// Ninguna vista pública puede ejecutar ninguna variante de comando de objetos.
const beforeUnauthorized = state.objectRevision;
for (const socket of [player, projector]) {
  socket.emit('dm:command', { type: 'object:door', commandId: crypto.randomUUID(), sceneEpoch: state.sceneEpoch, objectRevision: beforeUnauthorized, objectId: door.id, state: 'closed' });
  socket.emit('dm:command', { type: 'object:transform', commandId: crypto.randomUUID(), sceneEpoch: state.sceneEpoch, objectRevision: beforeUnauthorized, objectId: crate.id, cell: { col: 4, row: 5 }, rotation: 0 });
  socket.emit('dm:command', { type: 'object:structure', commandId: crypto.randomUUID(), sceneEpoch: state.sceneEpoch, objectRevision: beforeUnauthorized, objectId: crate.id, structure: 'destroyed' });
  socket.emit('dm:command', { type: 'object:undo', commandId: crypto.randomUUID(), sceneEpoch: state.sceneEpoch, objectRevision: beforeUnauthorized, entryId: state.undo.entryId });
}
await new Promise(resolve => setTimeout(resolve, 120));
const stateProbe = wait(dm, 'dm:state', value => value.objectRevision === beforeUnauthorized);
await command(dm, { type: 'camera', sceneEpoch: state.sceneEpoch, mode: 'fixed', focusId: null });
state = await stateProbe;
assert.equal(state.objectRevision, beforeUnauthorized, 'un rol público alteró objetos');
const undoneState = wait(dm, 'dm:state', value => value.objectRevision > state.objectRevision);
const undo = await command(dm, { type: 'object:undo', sceneEpoch: state.sceneEpoch, objectRevision: state.objectRevision, entryId: state.undo.entryId });
assert.equal(undo.ok, true);
state = await undoneState;
assert.equal(state.objectRevision, undo.objectRevision);
assert.deepEqual(state.objects.find(value => value.id === crate.id).cell, { col: 3, row: 4 });
assert.equal(state.objects.find(value => value.id === crate.id).rotation, 0);

for (const [objectId, structure] of [[door.id, 'damaged'], [door.id, 'destroyed'], [crate.id, 'damaged'], [crate.id, 'destroyed']]) {
  phase = `deterioro de ${objectId}`;
  const structureState = wait(dm, 'dm:state', value => value.objectRevision > state.objectRevision);
  const changed = await command(dm, { type: 'object:structure', sceneEpoch: state.sceneEpoch, objectRevision: state.objectRevision, objectId, structure });
  assert.equal(changed.ok, true);
  state = await structureState;
  assert.equal(state.objectRevision, changed.objectRevision);
}
assert.equal(state.objects.find(value => value.id === door.id).structure, 'destroyed');
assert.equal(state.objects.find(value => value.id === crate.id).structure, 'destroyed');

phase = 'cambiar al barco único y probar timón';
const deckState = wait(dm, 'dm:state', value => value.sceneId === 'wreck-ship' && value.sceneEpoch > state.sceneEpoch);
const deckChange = await command(dm, { type: 'scene', sceneEpoch: state.sceneEpoch, sceneId: 'wreck-ship' });
assert.equal(deckChange.ok, true);
state = await deckState;
const wheel = state.objects.find(value => value.id === 'wheel');
assert.equal(wheel.surfaceId, 'c3', 'el timón pertenece a la cubierta elevada C3 del mapa continuo');
const wheelCell = { col: wheel.cell.col + 1, row: wheel.cell.row };
const damagedWheelState = wait(dm, 'dm:state', value => value.objectRevision > state.objectRevision);
const wheelDamaged = await command(dm, { type: 'object:structure', sceneEpoch: state.sceneEpoch, objectRevision: state.objectRevision, objectId: wheel.id, structure: 'damaged' });
assert.equal(wheelDamaged.ok, true);
state = await damagedWheelState;
assert.equal(state.objectRevision, wheelDamaged.objectRevision);
const attachedDestroy = await command(dm, { type: 'object:structure', sceneEpoch: state.sceneEpoch, objectRevision: state.objectRevision, objectId: wheel.id, structure: 'destroyed' });
assert.equal(attachedDestroy.code, 'INVALID_TRANSITION');
const detachedState = wait(dm, 'dm:state', value => value.objectRevision > state.objectRevision);
const detached = await command(dm, { type: 'object:detach', sceneEpoch: state.sceneEpoch, objectRevision: state.objectRevision, objectId: wheel.id, cell: wheelCell, rotation: 0, outcome: 'fallen' });
assert.equal(detached.ok, true, `no se pudo soltar el timón en su celda C3: ${detached.code}`);
state = await detachedState;
assert.equal(state.objectRevision, detached.objectRevision);
for (const rotation of [90, 180, 270, 0]) {
  phase = `girar timón a ${rotation} grados`;
  const rotatedState = wait(dm, 'dm:state', value => value.objectRevision > state.objectRevision);
  const rotated = await command(dm, { type: 'object:transform', sceneEpoch: state.sceneEpoch, objectRevision: state.objectRevision, objectId: wheel.id, cell: wheelCell, rotation });
  assert.equal(rotated.ok, true);
  state = await rotatedState;
  assert.equal(state.objectRevision, rotated.objectRevision);
  assert.equal(state.objects.find(value => value.id === wheel.id).rotation, rotation);
}
phase = 'romper timón';
const destroyedWheelState = wait(dm, 'dm:state', value => value.objectRevision > state.objectRevision);
const wheelDestroyed = await command(dm, { type: 'object:structure', sceneEpoch: state.sceneEpoch, objectRevision: state.objectRevision, objectId: wheel.id, structure: 'destroyed' });
assert.equal(wheelDestroyed.ok, true);
state = await destroyedWheelState;
assert.equal(state.objectRevision, wheelDestroyed.objectRevision);
assert.equal(state.objects.filter(value => value.id === wheel.id).length, 1);
assert.equal(state.objects.find(value => value.id === wheel.id).structure, 'destroyed');
for (const socket of [player, projector, dm]) socket.disconnect();
console.log('PASS objetos del Pecio continuo: puerta privada, permisos de tres roles, daño/rotura, caja, revisión, deshacer y timón C3 en cuatro rotaciones.');
