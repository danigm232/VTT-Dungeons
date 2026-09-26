import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { io } from 'socket.io-client';
import { OBJECT_MODEL_VERSION, PROTOCOL_VERSION } from '../dist/server/engine/shared/protocol.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'dungeons-alpha03-smoke-'));
const password = crypto.randomUUID();
let child;
let dmSocket, playerSocket;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function freePort() {
  const socket = net.createServer();
  await new Promise((resolve, reject) => socket.once('error', reject).listen(0, '127.0.0.1', resolve));
  const port = socket.address().port;
  await new Promise(resolve => socket.close(resolve));
  return port;
}
const port = await freePort(), base = `http://127.0.0.1:${port}`;
async function launch() {
  child = spawn(process.execPath, ['dist/server/apps/server/index.js'], {
    cwd: root, stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', DM_PASSWORD: password,
      DUNGEONS_DATA_DIR: temporary, DUNGEONS_TEST_CHILD: '1' }
  });
  let output = '';
  child.stdout.on('data', data => { output += data.toString().slice(0, 500); });
  child.stderr.on('data', data => { output += data.toString().slice(0, 500); });
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null) throw new Error(`Servidor de prueba salió: ${output.slice(0, 1500)}`);
    try { if ((await fetch(`${base}/api/info`)).ok) return; } catch { /* startup */ }
    await delay(100);
  }
  throw new Error(`Servidor de prueba no inició: ${output.slice(0, 1500)}`);
}
async function stop() {
  const running = child; if (!running) return;
  const stopped = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Graceful shutdown timed out')), 12_000);
    running.once('exit', (code, signal) => { clearTimeout(timer); code === 0 ? resolve() : reject(new Error(`Shutdown ${code ?? signal}`)); });
  });
  running.send('shutdown'); await stopped; child = undefined;
}
async function login() {
  const response = await fetch(`${base}/api/dm/login`, { method: 'POST', headers: { 'content-type': 'application/json', origin: base }, body: JSON.stringify({ password }) });
  assert.equal(response.status, 200);
  const cookie = response.headers.get('set-cookie')?.split(';')[0];
  assert.ok(cookie);
  const { csrfToken } = await response.json();
  return { cookie, csrfToken };
}
async function privateCall(route, session, { method = 'GET', body, epoch } = {}) {
  const response = await fetch(`${base}${route}`, { method,
    headers: { cookie: session.cookie, ...(method === 'POST' ? { origin: base, 'content-type': 'application/json', 'x-dungeons-csrf': session.csrfToken,
      'x-dungeons-runtime-epoch': epoch ?? '' } : {}) }, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) });
  const result = await response.json();
  assert.equal(response.status, 200, `${route}: ${response.status} ${JSON.stringify(result)}`);
  return result;
}
async function connectRole(role, session) {
  const socket = io(base, { autoConnect: false, transports: ['websocket'], forceNew: true,
    auth: { role, protocolVersion: PROTOCOL_VERSION, objectModelVersion: OBJECT_MODEL_VERSION, ...(role === 'player' ? { sessionToken: 'a'.repeat(32) } : {}) },
    ...(role === 'dm' ? { extraHeaders: { Cookie: session.cookie } } : {}) });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${role} socket timeout`)), 5_000);
    socket.once('connect', () => { clearTimeout(timer); resolve(); });
    socket.once('connect_error', reject);
    socket.connect();
  });
  return socket;
}
async function socketResult(socket, event, body) {
  const response = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`socket ${event} timeout`)), 5_000);
    socket.once('command:result', packet => { clearTimeout(timer); resolve(packet); });
  });
  socket.emit(event, body); return response;
}
try {
  await launch();
  let session = await login(), status = await privateCall('/api/dm/save/status', session);
  assert.equal(status.mode, 'ready');
  assert.equal((await fetch(`${base}/api/dm/save/status`)).status, 401);
  assert.equal((await fetch(`${base}/api/dm/save/preview`, { method: 'POST', headers: { origin: base, 'content-type': 'application/json' }, body: '{invalid' })).status, 401);
  assert.equal((await fetch(`${base}/api/dm/save`, { method: 'POST', headers: { cookie: session.cookie, origin: 'http://evil.invalid',
    'content-type': 'application/json', 'x-dungeons-csrf': session.csrfToken }, body: '{}' })).status, 403);
  const firstEpoch = status.runtimeEpoch, requestId = crypto.randomUUID();
  dmSocket = await connectRole('dm', session);
  playerSocket = await connectRole('player', session);
  assert.equal((await socketResult(playerSocket, 'player:claim', { runtimeEpoch: firstEpoch, characterId: 'mike' })).code, 'CLAIMED');
  const saved = await privateCall('/api/dm/save', session, { method: 'POST', epoch: firstEpoch, body: { runtimeEpoch: firstEpoch, requestId } });
  const repeat = await privateCall('/api/dm/save', session, { method: 'POST', epoch: firstEpoch, body: { runtimeEpoch: firstEpoch, requestId } });
  assert.deepEqual(repeat, saved);
  const exportSave = await privateCall('/api/dm/save/export', session);
  const preview = await privateCall('/api/dm/save/preview', session, { method: 'POST', epoch: firstEpoch, body: JSON.stringify(exportSave) });
  assert.equal(preview.summary.campaignId, exportSave.campaignId);
  const restoreRequest = crypto.randomUUID();
  const restored = await privateCall('/api/dm/save/restore', session, { method: 'POST', epoch: firstEpoch,
    body: { runtimeEpoch: firstEpoch, token: preview.token, expectedStateRevision: preview.expectedStateRevision, requestId: restoreRequest } });
  assert.equal(restored.code, 'RESTORED'); assert.notEqual(restored.runtimeEpoch, firstEpoch);
  const repeatedRestore = await privateCall('/api/dm/save/restore', session, { method: 'POST', epoch: firstEpoch,
    body: { runtimeEpoch: firstEpoch, token: preview.token, expectedStateRevision: preview.expectedStateRevision, requestId: restoreRequest } });
  assert.deepEqual(repeatedRestore, restored);
  const staleHp = await socketResult(dmSocket, 'dm:command', { type: 'hp', commandId: crypto.randomUUID(), runtimeEpoch: firstEpoch, characterId: 'mike', hp: 0 });
  assert.equal(staleHp.code, 'STALE_RUNTIME'); assert.equal(staleHp.runtimeEpoch, restored.runtimeEpoch);
  const staleAudio = await socketResult(dmSocket, 'dm:command', { type: 'sfx', commandId: crypto.randomUUID(), runtimeEpoch: firstEpoch, sfxId: 'thunder' });
  assert.equal(staleAudio.code, 'STALE_RUNTIME');
  const staleClaim = await socketResult(playerSocket, 'player:claim', { runtimeEpoch: firstEpoch, characterId: 'mike' });
  assert.equal(staleClaim.code, 'STALE_RUNTIME');
  const afterStale = await privateCall('/api/dm/save/status', session);
  assert.equal(afterStale.stateRevision, restored.stateRevision);
  dmSocket.disconnect(); playerSocket.disconnect(); dmSocket = undefined; playerSocket = undefined;
  await stop();
  await launch(); session = await login(); status = await privateCall('/api/dm/save/status', session);
  assert.equal(status.mode, 'ready'); assert.equal(status.generation, restored.generation);
  assert.notEqual(status.runtimeEpoch, restored.runtimeEpoch);
  assert.equal(status.savedStateRevision, restored.stateRevision);
  await stop();
  await fs.writeFile(path.join(temporary, 'stormwreck-isle', 'active.json'), '{truncated');
  await launch(); session = await login(); status = await privateCall('/api/dm/save/status', session);
  assert.equal(status.mode, 'ready'); assert.ok(status.generation >= restored.generation);
  const recoveryFiles = await fs.readdir(path.join(temporary, 'stormwreck-isle', 'recovery'));
  assert.ok(recoveryFiles.some(name => name.endsWith('-active.json')));
  assert.equal(JSON.parse(await fs.readFile(path.join(temporary, 'stormwreck-isle', 'active.json'), 'utf8')).generation, status.generation);
  await stop();
  console.log('Alpha 0.3 smoke PASS: private access, save idempotence, preview, restore, old socket commands rejected, graceful restart and automatic fallback from corrupt active.');
} finally {
  dmSocket?.disconnect(); playerSocket?.disconnect();
  if (child && child.exitCode === null) { child.kill('SIGTERM'); await delay(500); }
  const target = path.resolve(temporary), parent = path.resolve(os.tmpdir());
  if (target.startsWith(`${parent}${path.sep}`) && path.basename(target).startsWith('dungeons-alpha03-smoke-')) await fs.rm(target, { recursive: true, force: true });
}
