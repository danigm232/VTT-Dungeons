import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp } from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';

// A real browser review uses a disposable campaign folder and a free port.
// The normal table, save files and port 3000 are never involved.
const root = path.resolve(import.meta.dirname, '..');
const build = path.resolve(root, process.env.DUNGEONS_SERVER_BUILD || 'dist/d8-final-audit-server');
const web = path.resolve(root, process.env.DUNGEONS_WEB_DIR || 'output/d8-final-audit/web');
const data = await mkdtemp(path.join(os.tmpdir(), 'dungeons-review-'));
const probe = net.createServer();
probe.listen(0, '127.0.0.1'); await once(probe, 'listening');
const port = probe.address().port;
await new Promise(resolve => probe.close(resolve));
const env = { ...process.env, HOST: '127.0.0.1', PORT: String(port),
  DUNGEONS_CAMPAIGN: process.env.DUNGEONS_CAMPAIGN || 'd8-night-private',
  DUNGEONS_DATA_DIR: data, DUNGEONS_WEB_DIR: web, DUNGEONS_TEST_CHILD: '1' };
delete env.DM_PASSWORD;
const child = spawn(process.execPath, [path.join(build, 'apps/server/index.js')],
  { cwd: root, env, stdio: ['ignore', 'inherit', 'inherit', 'ipc'], windowsHide: true });
let closing = false;
const input = readline.createInterface({ input: process.stdin });
async function stop() {
  if (closing) return;
  closing = true; input.close();
  if (child.exitCode === null && child.connected) child.send('shutdown');
}
input.on('line', line => { if (line.trim() === 'quit') void stop(); });
process.on('SIGINT', stop); process.on('SIGTERM', stop);
child.on('exit', code => { input.close(); process.exitCode = code ?? 1; });
console.log(JSON.stringify({ dm: `http://127.0.0.1:${port}/dm`,
  player: `http://127.0.0.1:${port}/player`, projector: `http://127.0.0.1:${port}/projector`,
  data, campaign: env.DUNGEONS_CAMPAIGN }));
console.log('Type quit to save and close this review session.');
