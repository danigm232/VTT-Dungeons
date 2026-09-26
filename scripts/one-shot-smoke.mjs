import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
async function launch() {
  const childEnvironment = { ...process.env, PORT: String(port), HOST: '127.0.0.1', DUNGEONS_DATA_DIR: temporary,
    DUNGEONS_CAMPAIGN: 'd8-night-private', DUNGEONS_TEST_CHILD: '1' };
  delete childEnvironment.DM_PASSWORD;
  child = spawn(process.execPath, ['dist/server/apps/server/index.js'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    env: childEnvironment });
  let output = '';
  child.stdout.on('data', data => { output += data.toString(); }); child.stderr.on('data', data => { output += data.toString(); });
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null) throw new Error(`One-shot server exited: ${output.slice(0, 1500)}`);
    try { if ((await fetch(`${base}/api/campaign`)).ok) return; } catch { /* startup */ }
    await delay(100);
  }
  throw new Error(`One-shot server did not start: ${output.slice(0, 1500)}`);
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
try {
  await launch();
  const campaign = await (await fetch(`${base}/api/campaign`)).json();
  assert.equal(campaign.campaignId, 'd8-night-private');
  assert.equal(campaign.scenes.length, 6);
  assert.deepEqual(campaign.scenes.map(scene => scene.id), ['temple', 'garden', 'cafe', 'market', 'mirror', 'dinner']);
  assert.equal(campaign.roster.length, 2);
  assert.deepEqual(campaign.roster.map(character => character.id), ['maria', 'aoife']);
  for (const scene of campaign.scenes) assert.equal((await fetch(`${base}${scene.background}`)).status, 200, scene.id);
  for (const token of Object.values(campaign.tokens)) assert.equal((await fetch(`${base}${token.url}`)).status, 200, token.url);
  for (const animationSet of Object.values(campaign.tokenAnimations)) for (const animation of Object.values(animationSet)) for (const frame of animation.frames) assert.equal((await fetch(`${base}${frame}`)).status, 200, frame);
  const login = await fetch(`${base}/api/dm/login`, { method: 'POST', headers: { 'content-type': 'application/json', origin: base }, body: JSON.stringify({}) });
  assert.equal(login.status, 200);
  const cookie = login.headers.get('set-cookie')?.split(';')[0]; const { csrfToken } = await login.json();
  const status = await fetch(`${base}/api/dm/save/status`, { headers: { cookie } });
  assert.equal(status.status, 200);
  const saved = await fetch(`${base}/api/dm/save`, { method: 'POST', headers: { cookie, origin: base, 'content-type': 'application/json',
    'x-dungeons-csrf': csrfToken, 'x-dungeons-runtime-epoch': (await status.json()).runtimeEpoch },
  body: JSON.stringify({ runtimeEpoch: (await (await fetch(`${base}/api/dm/save/status`, { headers: { cookie } })).json()).runtimeEpoch, requestId: crypto.randomUUID() }) });
  assert.equal(saved.status, 200);
  await stop();
  assert.ok(await fs.stat(path.join(temporary, 'd8-night-private', 'active.json')));
  console.log('One-shot smoke PASS: campaign selection, six maps, all tokens, private save and isolated data folder.');
} finally {
  if (child?.exitCode === null) child.kill('SIGTERM');
  const temporaryRoot = path.resolve(temporary), tempRoot = path.resolve(os.tmpdir());
  if (temporaryRoot.startsWith(`${tempRoot}${path.sep}`)) await fs.rm(temporaryRoot, { recursive: true, force: true });
}
