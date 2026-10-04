import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { io } from 'socket.io-client';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'dungeons-one-shot-smoke-'));
let child;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}
const port = await freePort(), base = `http://127.0.0.1:${port}`;
const protocol = await import(pathToFileURL(path.join(root, 'dist/server/engine/shared/protocol.js')).href);
async function launch() {
  const childEnvironment = { ...process.env, PORT: String(port), HOST: '127.0.0.1', DUNGEONS_DATA_DIR: temporary,
    DUNGEONS_CAMPAIGN: 'd8-night-private', DUNGEONS_TEST_CHILD: '1' };
  delete childEnvironment.DM_PASSWORD;
  child = spawn(process.execPath, ['dist/server/apps/server/index.js'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    env: childEnvironment });
  let output = '', healthFailure = '';
  child.stdout.on('data', data => { output += data.toString(); }); child.stderr.on('data', data => { output += data.toString(); });
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null) throw new Error(`One-shot server exited: ${output.slice(0, 1500)}`);
    try {
      const response = await fetch(`${base}/api/campaign`);
      if (response.ok) return;
      healthFailure = `health check HTTP ${response.status}: ${(await response.text()).slice(0, 500)}`;
    } catch (error) { healthFailure = `health check failed: ${error.message}`; }
    await delay(100);
  }
  throw new Error(`One-shot server did not start (${healthFailure}): ${output.slice(0, 1500)}`);
}
async function stop() {
  if (!child) return;
  const current = child;
  const finished = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('One-shot shutdown timed out')), 12_000);
    current.once('exit', code => { clearTimeout(timer); code === 0 ? resolve() : reject(new Error(`One-shot shutdown ${code}`)); });
  });
  current.send('shutdown'); await finished; child = undefined;
}
function waitFor(socket, eventName, timeoutMs = 5_000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.off('connect_error', failed); reject(new Error(`Timed out waiting for ${eventName}`)); }, timeoutMs);
    const failed = error => { clearTimeout(timer); reject(error); };
    socket.once('connect_error', failed);
    socket.once(eventName, value => { clearTimeout(timer); socket.off('connect_error', failed); resolve(value); });
  });
}
async function verifySharedD8Camera(cookie) {
  const common = { transports: ['websocket'], reconnection: false, auth: {
    protocolVersion: protocol.PROTOCOL_VERSION, objectModelVersion: protocol.OBJECT_MODEL_VERSION
  } };
  const dm = io(base, { ...common, autoConnect: false, auth: { ...common.auth, role: 'dm' }, extraHeaders: { Cookie: cookie } });
  const projector = io(base, { ...common, autoConnect: false, auth: { ...common.auth, role: 'projector' } });
  try {
    const dmConnected = waitFor(dm, 'connect'), projectorConnected = waitFor(projector, 'connect');
    const dmSnapshot = waitFor(dm, 'world:snapshot'), projectorSnapshot = waitFor(projector, 'world:snapshot');
    dm.connect(); projector.connect();
    await Promise.all([dmConnected, projectorConnected]);
    const [dmWorld, projectedWorld] = await Promise.all([dmSnapshot, projectorSnapshot]);
    assert.equal(dmWorld.scene.renderer, 'babylon-d8');
    assert.equal(projectedWorld.sceneId, dmWorld.sceneId);
    const receivedOrientation = waitFor(projector, 'camera:orientation');
    dm.emit('camera:orientation', { runtimeEpoch: dmWorld.runtimeEpoch, sceneEpoch: dmWorld.sceneEpoch,
      sceneId: dmWorld.sceneId, step: 3 });
    const orientation = await receivedOrientation;
    assert.equal(orientation.sceneId, dmWorld.sceneId);
    assert.equal(orientation.step, 3);
  } finally {
    dm.disconnect(); projector.disconnect();
  }
}
try {
  await launch();
  const campaign = await (await fetch(`${base}/api/campaign`)).json();
  assert.equal(campaign.campaignId, 'd8-night-private');
  assert.equal(campaign.version, '0.3.0-dev.2');
  assert.equal(campaign.scenes.length, 6);
  assert.deepEqual(campaign.scenes.map(scene => scene.id), ['temple', 'garden', 'cafe', 'market', 'mirror', 'dinner']);
  assert.equal(campaign.roster.length, 2);
  assert.deepEqual(campaign.roster.map(character => character.id), ['maria', 'aoife']);
  assert.ok(campaign.scenes.every(scene => scene.renderer === 'babylon-d8'));
  const rendererResponse = await fetch(`${base}/api/d8/renderer-config`);
  assert.equal(rendererResponse.status, 200);
  const renderer = await rendererResponse.json();
  assert.equal(renderer.version, 'V35');
  assert.deepEqual(Object.keys(renderer.maps).sort(), ['cafe', 'dinner', 'garden', 'market', 'mirror', 'temple']);
  assert.ok(Object.values(renderer.maps).every(map => Array.isArray(map.MAP.objects) && map.MAP.objects.length > 0));
  const forbiddenKeys = [];
  const inspect = value => {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (/canon|secret|interact|dialog|message|story|reveal|trigger|narrative|spoiler/i.test(key)) forbiddenKeys.push(key);
      inspect(child);
    }
  };
  inspect(renderer);
  assert.deepEqual(forbiddenKeys, []);
  assert.equal(JSON.stringify(renderer).includes('CANON'), false);
  for (const scene of campaign.scenes) assert.equal((await fetch(`${base}${scene.background}`)).status, 200, scene.id);
  for (const token of Object.values(campaign.tokens)) assert.equal((await fetch(`${base}${token.url}`)).status, 200, token.url);
  for (const animationSet of Object.values(campaign.tokenAnimations)) for (const animation of Object.values(animationSet)) for (const frame of animation.frames) assert.equal((await fetch(`${base}${frame}`)).status, 200, frame);
  const audioUrls = new Set();
  const collectAudioUrls = value => {
    if (Array.isArray(value)) return value.forEach(collectAudioUrls);
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (key === 'url' && typeof child === 'string' && child.startsWith('/audio/')) audioUrls.add(child);
      else collectAudioUrls(child);
    }
  };
  collectAudioUrls(campaign.audio);
  assert.ok(audioUrls.size > 0);
  for (const url of audioUrls) assert.equal((await fetch(`${base}${url}`)).status, 200, url);
  const login = await fetch(`${base}/api/dm/login`, { method: 'POST', headers: { 'content-type': 'application/json', origin: base }, body: JSON.stringify({}) });
  assert.equal(login.status, 200);
  const cookie = login.headers.get('set-cookie')?.split(';')[0]; const { csrfToken } = await login.json();
  await verifySharedD8Camera(cookie);
  const status = await fetch(`${base}/api/dm/save/status`, { headers: { cookie } });
  assert.equal(status.status, 200);
  const saved = await fetch(`${base}/api/dm/save`, { method: 'POST', headers: { cookie, origin: base, 'content-type': 'application/json',
    'x-dungeons-csrf': csrfToken, 'x-dungeons-runtime-epoch': (await status.json()).runtimeEpoch },
  body: JSON.stringify({ runtimeEpoch: (await (await fetch(`${base}/api/dm/save/status`, { headers: { cookie } })).json()).runtimeEpoch, requestId: crypto.randomUUID() }) });
  assert.equal(saved.status, 200);
  await stop();
  assert.ok(await fs.stat(path.join(temporary, 'd8-night-private', 'active.json')));
  console.log(`One-shot smoke PASS: six D8 maps, sanitized Babylon config, all tokens, ${audioUrls.size} audio assets, shared camera orientation, private save and isolated data folder.`);
} finally {
  if (child?.exitCode === null) child.kill('SIGTERM');
  const temporaryRoot = path.resolve(temporary), tempRoot = path.resolve(os.tmpdir());
  if (temporaryRoot.startsWith(`${tempRoot}${path.sep}`)) await fs.rm(temporaryRoot, { recursive: true, force: true });
}
