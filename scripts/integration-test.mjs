import assert from 'node:assert/strict';
import { io } from 'socket.io-client';
import { OBJECT_MODEL_VERSION, PROTOCOL_VERSION } from '../dist/server/engine/shared/protocol.js';
import { GameState } from '../dist/server/engine/server/game.js';
import { footprintFor } from '../dist/server/engine/shared/geometry.js';
import { surfaceNeighbors, terrainTile } from '../dist/server/engine/shared/terrain.js';
import { stormwreckBundle } from '../dist/server/campaigns/stormwreck-isle/server.js';
import { retreatCellAtMeters, retreatTerrain } from '../dist/server/campaigns/stormwreck-isle/public/retreat-runtime.js';
import { wreckCellFromLocal, wreckRuntimeScenes } from '../dist/server/campaigns/stormwreck-isle/public/wreck-runtime.js';

const base = process.env.TEST_URL ?? 'http://127.0.0.1:3123';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let phase = 'initialization';
const wait = (socket, event, predicate = () => true, timeout = 5_000) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => { socket.off(event, handler); reject(new Error(`Timeout: ${event} during ${phase}`)); }, timeout);
  const handler = data => {
    if (!predicate(data)) return;
    clearTimeout(timer); socket.off(event, handler); resolve(data);
  };
  socket.on(event, handler);
});
const emitAck = (socket, event, data) => {
  const promise = wait(socket, 'command:result', result => result.commandId === data.commandId || (!data.commandId && !result.commandId));
  socket.emit(event, data);
  return promise;
};
const sid = value => value.toString(16).padStart(32, String(value));
const protect = socket => {
  socket.on('runtime:reset', packet => socket.__runtimeEpoch = packet.runtimeEpoch);
  const original = socket.emit.bind(socket);
  socket.emit = (event, payload, ...tail) => {
    if (['scene:ready', 'player:claim', 'input:move', 'player:interact', 'dm:command'].includes(event)) payload = { runtimeEpoch: socket.__runtimeEpoch, ...payload };
    if (event === 'projector:ready') payload = { runtimeEpoch: socket.__runtimeEpoch, ready: payload };
    return original(event, payload, ...tail);
  };
  return socket;
};
const connect = (auth, options = {}) => new Promise((resolve, reject) => {
  const socket = protect(io(base, { autoConnect: false, auth: { protocolVersion: PROTOCOL_VERSION, objectModelVersion: OBJECT_MODEL_VERSION, ...auth }, transports: ['websocket'], forceNew: true, ...options }));
  socket.once('world:snapshot', snapshot => socket.__initialSnapshot = snapshot);
  socket.once('dm:state', value => socket.__initialDmState = value);
  const timer = setTimeout(() => reject(new Error('connect timeout')), 3_000);
  socket.once('connect', () => { clearTimeout(timer); resolve(socket); });
  socket.once('connect_error', reject);
  socket.connect();
});
const rejectedConnection = (auth, options = {}) => new Promise((resolve, reject) => {
  const socket = io(base, { auth: { protocolVersion: PROTOCOL_VERSION, objectModelVersion: OBJECT_MODEL_VERSION, ...auth }, transports: ['websocket'], forceNew: true, ...options });
  const timer = setTimeout(() => reject(new Error('auth:error timeout')), 3_000);
  socket.once('auth:error', data => { clearTimeout(timer); socket.disconnect(); resolve(data); });
  socket.once('connect_error', error => { clearTimeout(timer); reject(error); });
});
const entity = (snapshot, id) => snapshot.entities.find(candidate => candidate.id === id);
const navigationState = new GameState(stormwreckBundle);
navigationState.focusScene('wreck-ship');
const shipTerrain = wreckRuntimeScenes[0].terrain;
const shipCell = (col, row) => wreckCellFromLocal(col, row);
let latestWorldSnapshot = null;
const addressKey = address => `${address.surfaceId}:${address.cell.col},${address.cell.row}`;
const sameAddress = (a, b) => a.surfaceId === b.surfaceId && a.cell.col === b.cell.col && a.cell.row === b.cell.row;
const canWalkTo = (sceneId, address) => {
  const terrain = sceneId === 'dragon-rest' ? retreatTerrain : shipTerrain;
  if (!terrainTile(terrain, address)) return false;
  const props = latestWorldSnapshot?.sceneId === sceneId ? latestWorldSnapshot.props : navigationState.publicObjectProps(sceneId);
  return !props.some(prop => prop.surfaceId === address.surfaceId
    && prop.structure !== 'destroyed' && (prop.kind !== 'door' || prop.state !== 'open')
    && footprintFor(prop.cell, prop.rotation, prop.footprint ?? prop.baseFootprint ?? [{ col: 0, row: 0 }])
      .some(cell => cell.col === address.cell.col && cell.row === address.cell.row));
};
const findPath = (terrain, sceneId, start, goal) => {
  const queue = [{ ...start, path: [] }], seen = new Set();
  while (queue.length) {
    const current = queue.shift(), key = addressKey(current);
    if (seen.has(key)) continue;
    seen.add(key);
    if (sameAddress(current, goal)) return current.path;
    for (const next of surfaceNeighbors(terrain, current)) {
      if (!canWalkTo(sceneId, next)) continue;
      const nextKey = addressKey(next);
      if (!seen.has(nextKey)) queue.push({ ...next, path: [...current.path, next] });
    }
  }
  throw new Error(`Sin ruta transitable en ${sceneId}: ${addressKey(start)} → ${addressKey(goal)}`);
};
let seq = 10;
const oneStep = async (socket, observer, epoch, id, facing, target) => {
  const vectors = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] };
  const [x, z] = vectors[facing];
  let latest = null;
  const rememberLatest = value => { latest = value; };
  observer.on('world:snapshot', rememberLatest);
  const completed = wait(observer, 'world:snapshot', value => {
    const current = entity(value, id);
    return current?.cell.col === target.col && current?.cell.row === target.row
      && (!target.surfaceId || current.surfaceId === target.surfaceId) && current.step === null;
  });
  socket.emit('input:move', { seq: seq++, sceneEpoch: epoch, x, z });
  // A one-cell test move models a key press followed by keyup. Without the
  // release, the server correctly interprets the input as held and may start
  // a second step as soon as the first 220 ms step finishes.
  socket.emit('input:move', { seq: seq++, sceneEpoch: epoch, x: 0, z: 0, end: true });
  try {
    return await completed;
  } catch (error) {
    const current = latest && entity(latest, id);
    const dmActor = latestDmState?.characters?.find(character => character.id === id);
    const occupant = latestDmState?.npcs?.find(npc => npc.visible && npc.surfaceId === target.surfaceId
      && npc.cell.col === target.col && npc.cell.row === target.row);
    throw new Error(`${error.message}; ${id} → ${target.surfaceId ?? '?'} ${target.col},${target.row} (${facing}); `
      + `actual=${current ? `${current.surfaceId} ${current.cell.col},${current.cell.row} step=${Boolean(current.step)}` : 'sin snapshot'}; `
      + `DM=${dmActor ? `${dmActor.surfaceId} ${dmActor.cell.col},${dmActor.cell.row}` : 'desconocido'}; `
      + `ocupante=${occupant?.id ?? 'ninguno'}; combate=${JSON.stringify(latestDmState?.combat?.active)}; pendiente=${JSON.stringify(latestDmState?.combat?.pending?.stage)}`);
  } finally {
    observer.off('world:snapshot', rememberLatest);
  }
};
const walkPath = async (socket, observer, epoch, id, start, goal, terrain, sceneId) => {
  const path = findPath(terrain, sceneId, start, goal);
  let previous = start, snapshot = null;
  for (const address of path) {
    const dx = address.cell.col - previous.cell.col, dz = address.cell.row - previous.cell.row;
    const facing = dx === 1 ? 'east' : dx === -1 ? 'west' : dz === 1 ? 'south' : dz === -1 ? 'north' : null;
    assert.ok(facing, `paso no adyacente ${addressKey(previous)} → ${addressKey(address)}`);
    snapshot = await oneStep(socket, observer, epoch, id, facing, { ...address.cell, surfaceId: address.surfaceId });
    previous = address;
  }
  return { address: previous, snapshot };
};

const infoRes = await fetch(`${base}/api/info`);
assert.equal(infoRes.status, 200);
const info = await infoRes.json();
assert.match(info.playerUrl, /\/player$/);
assert.equal(new URL(info.playerUrl).hostname, '127.0.0.1', 'el servidor ligado a loopback no anuncia una IP LAN');
assert.deepEqual(info.addresses, [], 'loopback no publica direcciones de red');
assert.ok(info.qr.startsWith('data:image/png'));
assert.equal((await fetch(`${base}/art/objects-v3/wreck-deck-clean-v3.png`)).status, 200);
const publicCampaign = await (await fetch(`${base}/api/campaign`)).text();
for (const secret of ['Libro de conjuros', 'Destreza CD 10', 'La arpía está fuera', 'maxHp', 'privateNotes']) assert.ok(!publicCampaign.includes(secret), `secreto en /api/campaign: ${secret}`);
const publicCatalog = JSON.parse(publicCampaign);
assert.equal(publicCatalog.campaignId, 'stormwreck-isle');
for (const sceneId of ['camp-a1-rooms', 'camp-forest-pleamar', 'camp-wreck-beach', 'camp-cliffs-observatory', 'camp-coastal-refuge'])
  assert.ok(publicCatalog.scenes.some(scene => scene.id === sceneId && scene.camp), `falta escena de descanso integrada: ${sceneId}`);
assert.equal((await fetch(`${base}/art/camp-rests/marker.svg`)).status, 200, 'assets de campamento servidos en la campaña unificada');
assert.equal((await fetch(`${base}/campaigns/stormwreck-isle/private/seed.ts`)).status, 404);
assert.equal((await fetch(`${base}/campaigns/stormwreck-isle/private/CAMPAIGN_NOTES.md`)).status, 404);

assert.equal((await rejectedConnection({ role: 'dm' })).code, 'DM_AUTH_REQUIRED');
assert.equal((await rejectedConnection({ role: 'dm' }, { extraHeaders: { Cookie: 'dnd_dm=%E0%A4%A' } })).code, 'DM_AUTH_REQUIRED');
assert.equal((await rejectedConnection({ role: 'admin' })).code, 'INVALID_ROLE');
assert.equal((await rejectedConnection({ role: 'player', protocolVersion: 2, sessionToken: sid(99) })).code, 'PROTOCOL_MISMATCH');
assert.equal((await fetch(`${base}/api/info`)).status, 200, 'el servidor cayó tras entradas inválidas');

const login = await fetch(`${base}/api/dm/login`, {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: 'TESTPASS' })
});
assert.equal(login.status, 200);
const cookie = login.headers.get('set-cookie').split(';')[0];

const projector = await connect({ role: 'projector' });
projector.on('world:snapshot', snapshot => { latestWorldSnapshot = snapshot; });
let p1 = await connect({ role: 'player', sessionToken: sid(1) });
const p2 = await connect({ role: 'player', sessionToken: sid(2) });
const dm = await connect({ role: 'dm' }, { extraHeaders: { Cookie: cookie } });
let latestDmState = dm.__initialDmState;
dm.on('dm:state', state => { latestDmState = state; });

const initial = p1.__initialSnapshot ?? await wait(p1, 'world:snapshot');
assert.equal(initial.v, PROTOCOL_VERSION);
assert.ok(!JSON.stringify(initial).includes('harpy'), 'la criatura oculta apareció en estado público');
p1.emit('scene:ready', { sceneEpoch: initial.sceneEpoch });
p2.emit('scene:ready', { sceneEpoch: initial.sceneEpoch });
projector.emit('scene:ready', { sceneEpoch: initial.sceneEpoch });
projector.emit('projector:ready', true);

const ownPromise = wait(p1, 'player:private', value => value.characterId === 'mike');
let result = await emitAck(p1, 'player:claim', { characterId: 'mike' });
assert.equal(result.ok, true);
result = await emitAck(p2, 'player:claim', { characterId: 'mike' });
assert.equal(result.code, 'CHARACTER_UNAVAILABLE');
const miaPrivate = wait(p2, 'player:private', value => value.characterId === 'mia');
result = await emitAck(p2, 'player:claim', { characterId: 'mia' });
assert.equal(result.ok, true);
const own = await ownPromise;
const miaOwn = await miaPrivate;
assert.ok(own.inventory.includes('Libro de conjuros'));
assert.ok(!miaOwn.inventory.includes('Libro de conjuros'));

// La selección de mapa del DM es una transición de grupo: las tres vistas
// cambian juntas y todos los personajes aparecen en los spawns del destino.
phase = 'sincronización DM / proyector / jugadores';
const resetState = wait(dm, 'dm:state', value => value.sceneId === 'dragon-rest' && value.sceneEpoch !== initial.sceneEpoch);
result = await emitAck(dm, 'dm:command', { type: 'scene', commandId: crypto.randomUUID(), sceneEpoch: initial.sceneEpoch, sceneId: 'dragon-rest' });
assert.equal(result.ok, true);
let reset = await resetState;
const shipStatePromise = wait(dm, 'dm:state', value => value.sceneId === 'wreck-ship' && value.sceneEpoch > reset.sceneEpoch);
const shipProjectorPromise = wait(projector, 'world:snapshot', value => value.sceneId === 'wreck-ship' && value.sceneEpoch > reset.sceneEpoch);
const shipMikePromise = wait(p1, 'world:snapshot', value => value.sceneId === 'wreck-ship' && value.sceneEpoch > reset.sceneEpoch);
const shipMiaPromise = wait(p2, 'world:snapshot', value => value.sceneId === 'wreck-ship' && value.sceneEpoch > reset.sceneEpoch);
result = await emitAck(dm, 'dm:command', { type: 'scene', commandId: crypto.randomUUID(), sceneEpoch: reset.sceneEpoch, sceneId: 'wreck-ship' });
assert.equal(result.ok, true);
const [shipState, shipProjector, shipMike, shipMia] = await Promise.all([shipStatePromise, shipProjectorPromise, shipMikePromise, shipMiaPromise]);
assert.equal(shipState.sceneId, shipProjector.sceneId);
assert.equal(shipState.sceneId, shipMike.sceneId);
assert.equal(shipState.sceneId, shipMia.sceneId);
assert.equal(shipState.characters.find(character => character.id === 'mike').sceneId, shipState.sceneId);
assert.equal(shipState.characters.find(character => character.id === 'mia').sceneId, shipState.sceneId);
assert.ok(entity(shipMike, 'mike'));
assert.ok(entity(shipMia, 'mia'));
p1.emit('scene:ready', { sceneEpoch: shipMike.sceneEpoch });
p2.emit('scene:ready', { sceneEpoch: shipMia.sceneEpoch });
projector.emit('scene:ready', { sceneEpoch: shipProjector.sceneEpoch });

phase = 'regreso sincronizado al Retiro del Dragón';
const restStatePromise = wait(dm, 'dm:state', value => value.sceneId === 'dragon-rest' && value.sceneEpoch > shipState.sceneEpoch);
const restProjectorPromise = wait(projector, 'world:snapshot', value => value.sceneId === 'dragon-rest' && value.sceneEpoch > shipState.sceneEpoch);
const restMikePromise = wait(p1, 'world:snapshot', value => value.sceneId === 'dragon-rest' && value.sceneEpoch > shipState.sceneEpoch);
const restMiaPromise = wait(p2, 'world:snapshot', value => value.sceneId === 'dragon-rest' && value.sceneEpoch > shipState.sceneEpoch);
result = await emitAck(dm, 'dm:command', { type: 'scene', commandId: crypto.randomUUID(), sceneEpoch: shipState.sceneEpoch, sceneId: 'dragon-rest' });
assert.equal(result.ok, true);
const [restState, restProjector, restMike, restMia] = await Promise.all([restStatePromise, restProjectorPromise, restMikePromise, restMiaPromise]);
assert.equal(restState.sceneId, restProjector.sceneId);
assert.equal(restState.sceneId, restMike.sceneId);
assert.equal(restState.sceneId, restMia.sceneId);
reset = restState;
const mikeSpawn = reset.characters.find(character => character.id === 'mike').cell;
const miaSpawn = reset.characters.find(character => character.id === 'mia').cell;
p1.emit('scene:ready', { sceneEpoch: restMike.sceneEpoch });
p2.emit('scene:ready', { sceneEpoch: restMia.sceneEpoch });
projector.emit('scene:ready', { sceneEpoch: restProjector.sceneEpoch });

// El foco de inspección conserva el encuadre DM/proyector sin recolocar al grupo.
phase = 'foco de inspección DM / proyector';
const focusStatePromise = wait(dm, 'dm:state', value => value.sceneId === 'wreck-ship' && value.sceneEpoch === reset.sceneEpoch);
const deckPromise = wait(projector, 'world:snapshot', value => value.sceneId === 'wreck-ship' && value.sceneEpoch === reset.sceneEpoch);
result = await emitAck(dm, 'dm:command', { type: 'view:focus', commandId: crypto.randomUUID(), sceneEpoch: reset.sceneEpoch, sceneId: 'wreck-ship' });
assert.equal(result.ok, true);
const focused = await focusStatePromise;
const deck = await deckPromise;
assert.equal(focused.characters.find(character => character.id === 'mike').sceneId, 'dragon-rest');
assert.equal(focused.characters.find(character => character.id === 'mia').sceneId, 'dragon-rest');
assert.equal(focused.characters.find(character => character.id === 'mike').surfaceId, 'beach');
assert.equal(focused.characters.find(character => character.id === 'mia').surfaceId, 'beach');
assert.deepEqual(focused.characters.find(character => character.id === 'mike').cell, mikeSpawn);
assert.deepEqual(focused.characters.find(character => character.id === 'mia').cell, miaSpawn);
p1.emit('scene:ready', { sceneEpoch: deck.sceneEpoch });
p2.emit('scene:ready', { sceneEpoch: deck.sceneEpoch });
projector.emit('scene:ready', { sceneEpoch: deck.sceneEpoch });

const boatOrigin = { surfaceId: 'beach', cell: retreatCellAtMeters('beach', -47.25, 20.25) };
const boatArrival = async (socket, id, spawn) => {
  const path = await walkPath(socket, socket, deck.sceneEpoch, id,
    { surfaceId: 'beach', cell: spawn }, boatOrigin, retreatTerrain, 'dragon-rest');
  assert.deepEqual(path.address, boatOrigin);
  const arrival = wait(socket, 'world:snapshot', value => value.sceneId === 'wreck-ship' && entity(value, id)?.surfaceId === 'sea');
  const moved = await emitAck(dm, 'dm:command', { type: 'entity:portal', commandId: crypto.randomUUID(), sceneEpoch: deck.sceneEpoch,
    entityId: id, portId: 'travel-pecio-boat', direction: 'forward', adjudicate: true });
  assert.equal(moved.ok, true);
  assert.equal(moved.code, 'APPLIED');
  const snapshot = await arrival;
  assert.deepEqual(entity(snapshot, id).cell, shipCell(24, 15), 'el viaje deja al personaje en la barca, junto a la jarcia');
  return snapshot;
};
const boardFromSea = async (socket, id) => {
  return oneStep(socket, projector, deck.sceneEpoch, id, 'west', { ...shipCell(23, 14), surfaceId: 'main' });
};

phase = 'embarque de Mia';
await boatArrival(p2, 'mia', miaSpawn);
await boardFromSea(p2, 'mia');
await oneStep(p2, projector, deck.sceneEpoch, 'mia', 'west', { ...shipCell(22, 14), surfaceId: 'main' });
phase = 'embarque de Mike';
await boatArrival(p1, 'mike', mikeSpawn);
phase = 'subida física de Mike del mar a C1';
await boardFromSea(p1, 'mike');
await oneStep(p1, projector, deck.sceneEpoch, 'mike', 'north', { ...shipCell(23, 13), surfaceId: 'main' });

// Ambos jugadores se mueven a la vez, en direcciones distintas y sin cambiar de foco.
phase = 'movimiento simultáneo y foco';
const bothMoved = wait(projector, 'world:snapshot', value => entity(value, 'mike')?.cell.col === shipCell(22, 13).col && entity(value, 'mike')?.cell.row === shipCell(22, 13).row
  && entity(value, 'mia')?.cell.col === shipCell(23, 14).col && entity(value, 'mia')?.cell.row === shipCell(23, 14).row
  && entity(value, 'mike')?.step === null && entity(value, 'mia')?.step === null);
p1.emit('input:move', { seq: seq++, sceneEpoch: deck.sceneEpoch, x: -1, z: 0 });
p2.emit('input:move', { seq: seq++, sceneEpoch: deck.sceneEpoch, x: 1, z: 0 });
p1.emit('input:move', { seq: seq++, sceneEpoch: deck.sceneEpoch, x: 0, z: 0, end: true });
p2.emit('input:move', { seq: seq++, sceneEpoch: deck.sceneEpoch, x: 0, z: 0, end: true });
await bothMoved;
await oneStep(p1, projector, deck.sceneEpoch, 'mike', 'east', { ...shipCell(23, 13), surfaceId: 'main' });

const focusRestState = wait(dm, 'dm:state', value => value.sceneId === 'dragon-rest' && value.sceneEpoch === deck.sceneEpoch);
await emitAck(dm, 'dm:command', { type: 'view:focus', commandId: crypto.randomUUID(), sceneEpoch: deck.sceneEpoch, sceneId: 'dragon-rest' });
const outOfFocus = await focusRestState;
assert.equal(outOfFocus.characters.find(character => character.id === 'mike').sceneId, 'wreck-ship');
assert.equal(outOfFocus.characters.find(character => character.id === 'mia').sceneId, 'wreck-ship');
assert.deepEqual(outOfFocus.characters.find(character => character.id === 'mike').cell, shipCell(23, 13));
assert.deepEqual(outOfFocus.characters.find(character => character.id === 'mia').cell, shipCell(23, 14));
const shipFocus = wait(projector, 'world:snapshot', value => value.sceneId === 'wreck-ship' && value.sceneEpoch === deck.sceneEpoch);
await emitAck(dm, 'dm:command', { type: 'view:focus', commandId: crypto.randomUUID(), sceneEpoch: deck.sceneEpoch, sceneId: 'wreck-ship' });
await shipFocus;

// Las escaleras son transiciones físicas dentro del mismo mapa, en ambos sentidos.
phase = 'subida a C2 y bajada a C8';
const miaC2 = await walkPath(p2, projector, deck.sceneEpoch, 'mia', { surfaceId: 'main', cell: shipCell(23, 14) },
  { surfaceId: 'c2', cell: shipCell(34, 14) }, shipTerrain, 'wreck-ship');
assert.equal(entity(miaC2.snapshot, 'mia').surfaceId, 'c2');
assert.deepEqual(entity(miaC2.snapshot, 'mike').cell, shipCell(23, 13));
await walkPath(p2, projector, deck.sceneEpoch, 'mia', { surfaceId: 'c2', cell: shipCell(34, 14) },
  { surfaceId: 'main', cell: shipCell(23, 14) }, shipTerrain, 'wreck-ship');
const miaLower = await walkPath(p2, projector, deck.sceneEpoch, 'mia', { surfaceId: 'main', cell: shipCell(23, 14) },
  { surfaceId: 'lower-deck', cell: shipCell(25, 11) }, shipTerrain, 'wreck-ship');
assert.equal(entity(miaLower.snapshot, 'mia').surfaceId, 'lower-deck');
assert.equal(entity(miaLower.snapshot, 'mike').surfaceId, 'main');
assert.deepEqual(entity(miaLower.snapshot, 'mike').cell, shipCell(23, 13));

// Mike continúa por C3 hasta el timón mientras Mia puede seguir en C8.
phase = 'camino al timón C3';
const mikeAtWheel = await walkPath(p1, projector, deck.sceneEpoch, 'mike', { surfaceId: 'main', cell: shipCell(23, 13) },
  { surfaceId: 'c3', cell: shipCell(3, 7) }, shipTerrain, 'wreck-ship');
assert.equal(entity(mikeAtWheel.snapshot, 'mike').surfaceId, 'c3');
assert.equal(entity(mikeAtWheel.snapshot, 'mia').surfaceId, 'lower-deck');

const requestPromise = wait(dm, 'dm:state', value => value.interactions.some(interaction => interaction.status === 'pending'));
const interactionId = crypto.randomUUID();
result = await emitAck(p1, 'player:interact', { commandId: interactionId, sceneEpoch: deck.sceneEpoch, targetId: 'wheel' });
assert.equal(result.code, 'REQUESTED');
const requestState = await requestPromise;
const request = requestState.interactions.find(interaction => interaction.characterId === 'mike' && interaction.status === 'pending');
assert.ok(request);
const duplicateInteraction = await emitAck(p1, 'player:interact', { commandId: interactionId, sceneEpoch: deck.sceneEpoch, targetId: 'wheel' });
assert.deepEqual(duplicateInteraction, result, 'el duplicado no conservó el resultado original');
const extraInteraction = await emitAck(p1, 'player:interact', { commandId: crypto.randomUUID(), sceneEpoch: deck.sceneEpoch, targetId: 'wheel' });
assert.equal(extraInteraction.code, 'INTERACTION_PENDING');

const resolvedNotice = wait(p1, 'player:private', value => value.notice?.includes('resuelto'));
const caughtCell = shipCell(4, 8);
const caughtSnapshot = wait(projector, 'world:snapshot', value => value.props.some(prop => prop.id === 'wheel' && prop.state === 'caught' && prop.attachment === 'detached' && prop.cell.col === caughtCell.col && prop.cell.row === caughtCell.row));
const catchResult = await emitAck(dm, 'dm:command', { type: 'resolveInteraction', commandId: crypto.randomUUID(), sceneEpoch: deck.sceneEpoch, objectRevision: requestState.objectRevision, requestId: request.id, result: 'caught', cell: caughtCell, rotation: 0 });
assert.equal(catchResult.ok, true);
await resolvedNotice;
await caughtSnapshot;

const blockedId = crypto.randomUUID();
const blockedCommand = { type: 'entity:move', commandId: blockedId, sceneEpoch: deck.sceneEpoch, entityId: 'mike', cell: shipCell(15, 9) };
const blocked = await emitAck(dm, 'dm:command', blockedCommand);
assert.equal(blocked.code, 'GRID_STEP_REQUIRED');
assert.deepEqual(await emitAck(dm, 'dm:command', blockedCommand), blocked, 'un rechazo duplicado se convirtió en éxito');
const stale = await emitAck(dm, 'dm:command', { type: 'object:transform', commandId: crypto.randomUUID(), sceneEpoch: deck.sceneEpoch - 1, objectRevision: requestState.objectRevision + 1, objectId: 'wheel', cell: shipCell(5, 8), rotation: 90 });
assert.equal(stale.code, 'STALE_SCENE');

const revealPromise = wait(projector, 'world:snapshot', value => value.entities.some(candidate => candidate.id === 'harpy'));
await emitAck(dm, 'dm:command', { type: 'creature', commandId: crypto.randomUUID(), sceneEpoch: deck.sceneEpoch, visible: true });
await revealPromise;
const hiddenPromise = wait(projector, 'world:snapshot', value => !value.entities.some(candidate => candidate.id === 'harpy'));
await emitAck(dm, 'dm:command', { type: 'creature', commandId: crypto.randomUUID(), sceneEpoch: deck.sceneEpoch, visible: false });
assert.ok(!JSON.stringify(await hiddenPromise).includes('harpy'));
const latePlayer = await connect({ role: 'player', sessionToken: sid(4) });
assert.ok(!JSON.stringify(await wait(latePlayer, 'world:snapshot')).includes('harpy'), 'un jugador tardío recibió la criatura oculta');
latePlayer.disconnect();

// Un jugador y el proyector no pueden ejecutar comandos de DM.
p1.emit('dm:command', { type: 'wheel', commandId: crypto.randomUUID(), sceneEpoch: deck.sceneEpoch, state: 'fallen' });
projector.emit('dm:command', { type: 'wheel', commandId: crypto.randomUUID(), sceneEpoch: deck.sceneEpoch, state: 'fallen' });
await delay(120);
const permissionProbe = wait(projector, 'world:snapshot', value => value.camera.mode === 'semiFixed');
await emitAck(dm, 'dm:command', { type: 'camera', commandId: crypto.randomUUID(), sceneEpoch: deck.sceneEpoch, mode: 'semiFixed', focusId: 'mike' });
const permissionState = await permissionProbe;
assert.equal(permissionState.props.find(prop => prop.id === 'wheel').state, 'caught');

const hpPrivate = wait(p1, 'player:private', value => value.hp === 5);
await emitAck(dm, 'dm:command', { type: 'hp', commandId: crypto.randomUUID(), characterId: 'mike', hp: 5 });
assert.equal((await hpPrivate).hp, 5);

const audioPromise = wait(projector, 'audio:state', value => value.layers.ocean.playing);
await emitAck(dm, 'dm:command', { type: 'audio', commandId: crypto.randomUUID(), channel: 'ocean', playing: true, volume: 0.4 });
await audioPromise;
for (const sfxId of ['thunder', 'creak', 'impact']) {
  const sfxPromise = wait(projector, 'sfx:play', value => value.sfxId === sfxId);
  await emitAck(dm, 'dm:command', { type: 'sfx', commandId: crypto.randomUUID(), sfxId });
  await sfxPromise;
}

// El token de sesión solo conserva un controlador activo y reinicia secuencias.
const oldDisconnected = wait(p1, 'disconnect');
const oldCleared = wait(p1, 'player:private', value => value.characterId === null && value.notice?.includes('otra pestaña'));
const replacement = await connect({ role: 'player', sessionToken: sid(1) });
await Promise.all([oldDisconnected, oldCleared]);
const replacementSnapshot = replacement.__initialSnapshot ?? await wait(replacement, 'world:snapshot');
assert.equal(replacementSnapshot.sceneEpoch, deck.sceneEpoch);
replacement.emit('scene:ready', { sceneEpoch: deck.sceneEpoch });
await wait(replacement, 'player:private', value => value.characterId === 'mike');
await oneStep(replacement, projector, deck.sceneEpoch, 'mike', 'south', { ...shipCell(3, 8), surfaceId: 'c3' });
p1 = replacement;

// Liberar limpia el HUD sin dejar una pestaña fantasma y permite elegir de nuevo.
const miaReleased = wait(p2, 'player:private', value => value.characterId === null);
const miaAvailable = wait(p2, 'characters:available', value => value.characters.some(character => character.id === 'mia' && !character.claimed));
await emitAck(dm, 'dm:command', { type: 'release', commandId: crypto.randomUUID(), characterId: 'mia' });
await Promise.all([miaReleased, miaAvailable]);
assert.equal(p2.connected, true, 'liberar no debe dejar una pestaña desconectada con HUD obsoleto');
result = await emitAck(p2, 'player:claim', { characterId: 'mia' });
assert.equal(result.code, 'CLAIMED');
p2.emit('scene:ready', { sceneEpoch: deck.sceneEpoch });

// Una jugadora puede regresar desde C8, dejar el pecio y volver al Retiro
// mientras Mike conserva su ubicación individual en C3.
phase = 'regreso a la barca y salida adjudicada por el DM';
await walkPath(p2, projector, deck.sceneEpoch, 'mia', { surfaceId: 'lower-deck', cell: shipCell(25, 11) },
  { surfaceId: 'main', cell: shipCell(23, 14) }, shipTerrain, 'wreck-ship');
await oneStep(p2, projector, deck.sceneEpoch, 'mia', 'south', { ...shipCell(23, 15), surfaceId: 'sea' });
await oneStep(p2, projector, deck.sceneEpoch, 'mia', 'east', { ...shipCell(24, 15), surfaceId: 'sea' });
const returnToRetreat = wait(dm, 'dm:state', value => value.characters.find(character => character.id === 'mia')?.sceneId === 'dragon-rest');
result = await emitAck(dm, 'dm:command', { type: 'entity:portal', commandId: crypto.randomUUID(), sceneEpoch: deck.sceneEpoch,
  entityId: 'mia', portId: 'travel-pecio-boat', direction: 'return', adjudicate: true });
assert.equal(result.ok, true);
assert.equal(result.code, 'APPLIED');
const afterReturn = await returnToRetreat;
assert.equal(afterReturn.characters.find(character => character.id === 'mike')?.sceneId, 'wreck-ship');
assert.equal(afterReturn.characters.find(character => character.id === 'mike')?.surfaceId, 'c3');
assert.equal(afterReturn.sceneId, 'wreck-ship', 'la salida individual no mueve el foco del DM/proyector');

// Continuación real del capítulo: Mike baja desde C3, encuentra el cofre de
// C9, abre el paquete con arbitraje del DM y vuelve por C8 a C1. La arpía no
// debe aparecer antes del regreso, y el epílogo no debe ejecutarse solo.
phase = 'hallazgo de C9 y paquete encerado';
const mikeC9 = await walkPath(p1, projector, deck.sceneEpoch, 'mike', { surfaceId: 'c3', cell: shipCell(3, 8) },
  { surfaceId: 'hold-air', cell: shipCell(14, 4) }, shipTerrain, 'wreck-ship');
assert.equal(entity(mikeC9.snapshot, 'mike').surfaceId, 'hold-air');
assert.equal(latestDmState.progress['wreck.c9-chest-found'], true);
assert.equal(latestDmState.progress['wreck.harpy-return-triggered'], undefined);
const objectAction = async (objectId, action, extra = {}) => {
  const objectRevision = latestDmState.objectRevision;
  const nextState = wait(dm, 'dm:state', value => value.objectRevision > objectRevision);
  const response = await emitAck(dm, 'dm:command', { type: 'object:interact', commandId: crypto.randomUUID(),
    sceneEpoch: deck.sceneEpoch, objectRevision, objectId, action, ...extra });
  assert.equal(response.code, 'APPLIED', `${objectId}:${action} → ${response.code}`);
  await nextState;
};
await objectAction('c9-iron-chest', 'open');
const packagePrivate = wait(p1, 'player:private', value => value.characterId === 'mike' && value.inventory?.includes('Paquete encerado'));
await objectAction('c9-iron-chest', 'take-package', { characterId: 'mike' });
await packagePrivate;
assert.equal(latestDmState.progress['wreck.c9-package-taken'], true);

const progress = async (flag, value = true) => {
  const nextState = wait(dm, 'dm:state', state => state.progress[flag] === value);
  const response = await emitAck(dm, 'dm:command', { type: 'progress:toggle', commandId: crypto.randomUUID(),
    sceneEpoch: deck.sceneEpoch, flag, value });
  assert.equal(response.code, 'APPLIED', `${flag} → ${response.code}`);
  return nextState;
};
await progress('wreck.package-opened');
assert.equal(latestDmState.progress['wreck.journal-found'], true);
assert.equal(latestDmState.progress['wreck.talisman-found'], true);
phase = 'regreso C9 → C8 → C1 y aparición de la arpía';
await walkPath(p1, projector, deck.sceneEpoch, 'mike', { surfaceId: 'hold-air', cell: shipCell(14, 4) },
  { surfaceId: 'lower-deck', cell: shipCell(25, 11) }, shipTerrain, 'wreck-ship');
assert.equal(latestDmState.progress['wreck.c9-returned-to-c8'], true);
assert.equal(latestDmState.progress['wreck.harpy-return-pending'], true);
const harpyVisible = wait(projector, 'world:snapshot', value => value.entities.some(candidate => candidate.id === 'upper-harpy-1'));
await walkPath(p1, projector, deck.sceneEpoch, 'mike', { surfaceId: 'lower-deck', cell: shipCell(25, 11) },
  { surfaceId: 'main', cell: shipCell(23, 14) }, shipTerrain, 'wreck-ship');
await harpyVisible;
assert.equal(latestDmState.progress['wreck.harpy-return-triggered'], true);
assert.equal(latestDmState.characters.find(character => character.id === 'mia')?.sceneId, 'dragon-rest');
await progress('wreck.harpy-resolved'); // El DM decide si se la derrota, ahuyenta o negocia.

phase = 'salida del pecio y cierre adjudicado del capítulo';
await oneStep(p1, projector, deck.sceneEpoch, 'mike', 'south', { ...shipCell(23, 15), surfaceId: 'sea' });
await oneStep(p1, projector, deck.sceneEpoch, 'mike', 'east', { ...shipCell(24, 15), surfaceId: 'sea' });
const mikeReturned = wait(dm, 'dm:state', value => value.characters.find(character => character.id === 'mike')?.sceneId === 'dragon-rest');
result = await emitAck(dm, 'dm:command', { type: 'entity:portal', commandId: crypto.randomUUID(), sceneEpoch: deck.sceneEpoch,
  entityId: 'mike', portId: 'travel-pecio-boat', direction: 'return', adjudicate: true });
assert.equal(result.code, 'APPLIED');
await mikeReturned;
await progress('wreck.items-given-to-runara');
await progress('wreck.curse-grave');
const vanished = wait(projector, 'world:snapshot', value => value.story?.wreckDisappeared === true && value.props.length === 0);
await progress('wreck.curse-day-after');
await vanished;
const dreamForMia = wait(p2, 'player:private', value => value.notice?.includes('sueñas'));
await progress('wreck.cleric-dream');
await dreamForMia;
const leveled = wait(dm, 'dm:state', value => value.progress['wreck.chapter-level-up'] === true);
result = await emitAck(dm, 'dm:command', { type: 'wreck:level-up', commandId: crypto.randomUUID(), level: 2 });
assert.equal(result.code, 'APPLIED');
assert.ok((await leveled).characters.every(character => character.sheet?.level >= 2));
result = await emitAck(dm, 'dm:command', { type: 'scene', commandId: crypto.randomUUID(), sceneEpoch: deck.sceneEpoch, sceneId: 'wreck-ship' });
assert.equal(result.code, 'WRECK_DISAPPEARED');

for (const socket of [projector, p1, p2, dm]) socket.disconnect();
console.log('PASS integración ampliada: HTTP loopback privado, permisos, dos jugadores, playa→barca→C1, escaleras C2/C8/C9, posiciones separadas, timón, paquete, regreso de arpía, vuelta individual, maldición, sueño privado, nivel y desaparición del pecio.');
