import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { promises as fs } from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { io } from 'socket.io-client';
import { OBJECT_MODEL_VERSION, PROTOCOL_VERSION } from '../dist/server/engine/shared/protocol.js';

const root = path.resolve(import.meta.dirname, '..');
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'dungeons-d8-combat-'));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const freePort = async () => {
  const probe = net.createServer(); probe.listen(0, '127.0.0.1'); await once(probe, 'listening');
  const address = probe.address(), port = typeof address === 'object' && address ? address.port : 0;
  await new Promise(resolve => probe.close(resolve)); return port;
};
const port = await freePort(), base = `http://127.0.0.1:${port}`;
let child;
const wait = (socket, event, predicate = () => true, timeout = 5_000) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => { socket.off(event, handler); reject(new Error(`Timeout esperando ${event}`)); }, timeout);
  const handler = value => { if (!predicate(value)) return; clearTimeout(timer); socket.off(event, handler); resolve(value); };
  socket.on(event, handler);
});
const emitResult = (socket, event, payload) => {
  const result = wait(socket, 'command:result', value => value.commandId === payload.commandId);
  socket.emit(event, payload); return result;
};
const connect = (auth, extraHeaders) => new Promise((resolve, reject) => {
  const socket = io(base, { autoConnect: false, forceNew: true, transports: ['websocket'], auth: { protocolVersion: PROTOCOL_VERSION, objectModelVersion: OBJECT_MODEL_VERSION, ...auth }, ...(extraHeaders ? { extraHeaders } : {}) });
  socket.once('runtime:reset', value => socket.__runtime = value);
  socket.once('dm:state', value => socket.__dmState = value);
  socket.once('world:snapshot', value => socket.__world = value);
  const timer = setTimeout(() => reject(new Error('Timeout conectando socket')), 5_000);
  socket.once('connect', () => { clearTimeout(timer); resolve(socket); }); socket.once('connect_error', reject); socket.connect();
});
async function launch() {
  child = spawn(process.execPath, ['dist/server/apps/server/index.js'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe', 'ipc'], windowsHide: true,
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', DUNGEONS_DATA_DIR: temporary, DUNGEONS_CAMPAIGN: 'd8-night-private', DUNGEONS_TEST_CHILD: '1' } });
  let output = ''; child.stdout.on('data', chunk => output += chunk); child.stderr.on('data', chunk => output += chunk);
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null) throw new Error(`Servidor D8 terminó: ${output}`);
    try { if ((await fetch(`${base}/api/campaign`)).ok) return; } catch { /* starting */ }
    await delay(100);
  }
  throw new Error(`Servidor D8 no inició: ${output}`);
}
async function stop() {
  if (!child || child.exitCode !== null) return;
  const exited = once(child, 'exit'); child.send('shutdown'); await Promise.race([exited, delay(12_000).then(() => { throw new Error('Timeout de cierre'); })]);
}

const sockets = [];
try {
  await launch();
  const login = await fetch(`${base}/api/dm/login`, { method: 'POST', headers: { 'content-type': 'application/json', origin: base }, body: '{}' });
  assert.equal(login.status, 200); const cookie = login.headers.get('set-cookie')?.split(';')[0]; assert.ok(cookie);
  const dm = await connect({ role: 'dm' }, { Cookie: cookie }); sockets.push(dm);
  const maria = await connect({ role: 'player', sessionToken: 'a'.repeat(32) }); sockets.push(maria);
  const aoife = await connect({ role: 'player', sessionToken: 'b'.repeat(32) }); sockets.push(aoife);
  const dmInitial = dm.__dmState ?? await wait(dm, 'dm:state'), initialWorld = dm.__world ?? await wait(dm, 'world:snapshot');
  const mariaClaimed = wait(maria, 'player:private', value => value.characterId === 'maria');
  assert.equal((await emitResult(maria, 'player:claim', { runtimeEpoch: dmInitial.runtimeEpoch, characterId: 'maria' })).code, 'CLAIMED'); await mariaClaimed;
  const aoifeClaimed = wait(aoife, 'player:private', value => value.characterId === 'aoife');
  assert.equal((await emitResult(aoife, 'player:claim', { runtimeEpoch: dmInitial.runtimeEpoch, characterId: 'aoife' })).code, 'CLAIMED'); await aoifeClaimed;
  let dmStatePromise = wait(dm, 'dm:state', value => value.combat.active);
  assert.equal((await emitResult(dm, 'dm:command', { runtimeEpoch: dmInitial.runtimeEpoch, type: 'combat:start', commandId: crypto.randomUUID(), sceneEpoch: initialWorld.sceneEpoch })).ok, true);
  let dmState = await dmStatePromise;
  assert.equal(dmState.combat.currentId, null, 'no hay turno antes de que la mesa registre iniciativa');
  let mariaInitiative = wait(maria, 'player:private', value => value.combat?.initiative.submitted === true);
  assert.equal((await emitResult(maria, 'player:combat', { runtimeEpoch: dmInitial.runtimeEpoch, type: 'combat:initiative', commandId: crypto.randomUUID(), sceneEpoch: dmState.sceneEpoch, total: 20 })).code, 'INITIATIVE_RECORDED'); await mariaInitiative;
  let aoifeInitiative = wait(aoife, 'player:private', value => value.combat?.initiative.submitted === true);
  assert.equal((await emitResult(aoife, 'player:combat', { runtimeEpoch: dmInitial.runtimeEpoch, type: 'combat:initiative', commandId: crypto.randomUUID(), sceneEpoch: dmState.sceneEpoch, total: 10 })).code, 'INITIATIVE_RECORDED'); await aoifeInitiative;
  dmStatePromise = wait(dm, 'dm:state', value => value.combat.initiativePending && value.combat.participants.every(participant => participant.initiativeSubmitted));
  assert.equal((await emitResult(dm, 'dm:command', { runtimeEpoch: dmInitial.runtimeEpoch, type: 'combat:initiative', commandId: crypto.randomUUID(), sceneEpoch: dmState.sceneEpoch, entries: [{ id: 'anteros-temple', initiative: 0 }] })).ok, true);
  dmState = await dmStatePromise;
  const initiativeOrder = dmState.combat.order.map(item => item.id);
  dmStatePromise = wait(dm, 'dm:state', value => value.combat.currentId === 'maria' && !value.combat.initiativePending);
  assert.equal((await emitResult(dm, 'dm:command', { runtimeEpoch: dmInitial.runtimeEpoch, type: 'combat:initiativeOrder', commandId: crypto.randomUUID(), sceneEpoch: dmState.sceneEpoch, order: initiativeOrder, confirm: true })).ok, true);
  dmState = await dmStatePromise;
  assert.equal(dmState.combat.currentId, 'maria');

  const declareId = crypto.randomUUID(), declare = { runtimeEpoch: dmInitial.runtimeEpoch, type: 'combat:declare', commandId: declareId, sceneEpoch: dmState.sceneEpoch, targetId: 'anteros-temple', actionId: 'shortbow', useSneakAttack: true };
  const mariaAttackPrompt = wait(maria, 'player:private', value => value.combat?.prompt?.stage === 'attack');
  const aoifeWithoutPrompt = wait(aoife, 'player:private', value => value.combat && value.combat.prompt === null);
  const declared = await emitResult(maria, 'player:combat', declare); assert.equal(declared.code, 'ROLL_REQUIRED');
  let attackPrivate = await mariaAttackPrompt; await aoifeWithoutPrompt;
  assert.equal((await emitResult(maria, 'player:combat', declare)).code, 'ROLL_REQUIRED', 'declaración duplicada no fue idempotente');
  assert.equal((await emitResult(aoife, 'player:combat', { runtimeEpoch: dmInitial.runtimeEpoch, type: 'combat:cancelAction', commandId: crypto.randomUUID(), sceneEpoch: dmState.sceneEpoch, promptId: attackPrivate.combat.prompt.id })).code, 'NOT_YOUR_ACTION');
  assert.equal((await emitResult(dm, 'dm:command', { runtimeEpoch: dmInitial.runtimeEpoch, type: 'combat:end', commandId: crypto.randomUUID(), sceneEpoch: dmState.sceneEpoch })).code, 'ROLL_PENDING');
  const cancelled = wait(maria, 'player:private', value => value.combat && !value.combat.prompt && !value.combat.pendingAction);
  assert.equal((await emitResult(maria, 'player:combat', { runtimeEpoch: dmInitial.runtimeEpoch, type: 'combat:cancelAction', commandId: crypto.randomUUID(), sceneEpoch: dmState.sceneEpoch, promptId: attackPrivate.combat.prompt.id })).code, 'ACTION_CANCELLED');
  assert.equal((await cancelled).combat.actionUsed, false);
  const redeclared = wait(maria, 'player:private', value => value.combat?.prompt?.stage === 'attack');
  assert.equal((await emitResult(maria, 'player:combat', { ...declare, commandId: crypto.randomUUID() })).code, 'ROLL_REQUIRED');
  attackPrivate = await redeclared;
  const promptId = attackPrivate.combat.prompt.id;
  const wrongActor = await emitResult(aoife, 'player:combat', { runtimeEpoch: dmInitial.runtimeEpoch, type: 'combat:rollAttack', commandId: crypto.randomUUID(), sceneEpoch: dmState.sceneEpoch, promptId, d20: 20 });
  assert.equal(wrongActor.code, 'WRONG_ACTOR');

  const attackCommand = { runtimeEpoch: dmInitial.runtimeEpoch, type: 'combat:rollAttack', commandId: crypto.randomUUID(), sceneEpoch: dmState.sceneEpoch, promptId, d20: 20 };
  const damagePrivatePromise = wait(maria, 'player:private', value => value.combat?.prompt?.stage === 'damage');
  assert.equal((await emitResult(maria, 'player:combat', attackCommand)).code, 'DAMAGE_REQUIRED');
  const damagePrivate = await damagePrivatePromise, damageId = damagePrivate.combat.prompt.id;
  assert.equal((await emitResult(maria, 'player:combat', { runtimeEpoch: dmInitial.runtimeEpoch, type: 'combat:cancelAction', commandId: crypto.randomUUID(), sceneEpoch: dmState.sceneEpoch, promptId: damageId })).code, 'ACTION_ALREADY_RESOLVING');
  assert.notEqual(damageId, promptId);
  assert.equal((await emitResult(maria, 'player:combat', attackCommand)).code, 'DAMAGE_REQUIRED', 'ataque repetido no conservó recibo');
  const wrongStage = await emitResult(maria, 'player:combat', { runtimeEpoch: dmInitial.runtimeEpoch, type: 'combat:rollAttack', commandId: crypto.randomUUID(), sceneEpoch: dmState.sceneEpoch, promptId: damageId, d20: 4 });
  assert.equal(wrongStage.code, 'PROMPT_STAGE_MISMATCH');

  const before = dmState.combat.participants.find(item => item.id === 'anteros-temple').hp;
  const damageCommand = { runtimeEpoch: dmInitial.runtimeEpoch, type: 'combat:rollDamage', commandId: crypto.randomUUID(), sceneEpoch: dmState.sceneEpoch, promptId: damageId, diceTotal: 12 };
  const afterDamagePromise = wait(dm, 'dm:state', value => value.combat.participants.find(item => item.id === 'anteros-temple')?.hp < before);
  assert.equal((await emitResult(maria, 'player:combat', damageCommand)).code, 'ATTACK_RESOLVED');
  const after = (await afterDamagePromise).combat.participants.find(item => item.id === 'anteros-temple').hp;
  assert.equal(before - after, 15, 'crítico de arco: suma física12 + modificador3; no debe aplicarse dos veces');
  const duplicateDamage = await emitResult(maria, 'player:combat', damageCommand); assert.equal(duplicateDamage.code, 'ATTACK_RESOLVED');
  assert.equal((await emitResult(maria, 'player:combat', { runtimeEpoch: dmInitial.runtimeEpoch, type: 'combat:flee', commandId: crypto.randomUUID(), sceneEpoch: dmState.sceneEpoch })).code, 'FLEE_REQUESTED');
  const afterWithdrawal = wait(dm, 'dm:state', value => value.combat.currentId === 'aoife' && !value.combat.participants.some(item => item.id === 'maria'));
  assert.equal((await emitResult(dm, 'dm:command', { runtimeEpoch: dmInitial.runtimeEpoch, type: 'combat:withdraw', commandId: crypto.randomUUID(), sceneEpoch: dmState.sceneEpoch, entityId: 'maria' })).ok, true);
  await afterWithdrawal;
  const ended = wait(dm, 'dm:state', value => !value.combat.active);
  assert.equal((await emitResult(dm, 'dm:command', { runtimeEpoch: dmInitial.runtimeEpoch, type: 'combat:withdraw', commandId: crypto.randomUUID(), sceneEpoch: dmState.sceneEpoch, entityId: 'aoife' })).ok, true); await ended;
  await delay(100);
  sockets.forEach(socket => socket.disconnect()); await stop();
  console.log('D8 combat integration PASS: private prompts, manual dice, idempotency, cancellation authority, pending-end guard and DM-approved withdrawal.');
} finally {
  sockets.forEach(socket => socket.disconnect());
  if (child?.exitCode === null) child.kill('SIGTERM');
  const resolved = path.resolve(temporary), tempRoot = path.resolve(os.tmpdir());
  if (resolved.startsWith(`${tempRoot}${path.sep}`)) await fs.rm(resolved, { recursive: true, force: true });
}
