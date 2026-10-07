import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

async function freePort() {
  const probe = createServer(); probe.listen(0, '127.0.0.1'); await once(probe, 'listening');
  const address = probe.address(); const port = typeof address === 'object' && address ? address.port : 0;
  await new Promise(resolve => probe.close(resolve)); return port;
}

const port = await freePort();
const dataDir = await mkdtemp(path.join(tmpdir(), 'dungeons-alpha03-general-'));
const serverBuild = path.resolve(process.cwd(), process.env.DUNGEONS_SERVER_BUILD || 'dist/server');
const child = spawn(process.execPath, [path.join(serverBuild, 'apps/server/index.js')], { cwd: process.cwd(), env: { ...process.env, HOST: '127.0.0.1', PORT: String(port), DM_PASSWORD: 'TESTPASS', DUNGEONS_DATA_DIR: dataDir }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
let output = '', settled = false;
child.stdout.on('data', data => output += data); child.stderr.on('data', data => output += data);
const ready = new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(`Servidor no inició:\n${output}`)), 8_000);
  child.stdout.on('data', data => { if (String(data).includes('Acceso DM:')) { clearTimeout(timer); settled = true; resolve(); } });
  child.once('exit', code => { if (!settled) { clearTimeout(timer); reject(new Error(`Servidor terminó (${code}):\n${output}`)); } });
});
try { await ready; process.env.TEST_URL = `http://127.0.0.1:${port}`; await import('./integration-test.mjs'); }
finally { if (child.exitCode === null) { child.kill('SIGTERM'); await Promise.race([once(child, 'exit'), new Promise(resolve => setTimeout(resolve, 3_000))]); } if (path.resolve(dataDir).startsWith(path.resolve(tmpdir()) + path.sep)) await rm(dataDir, { recursive: true, force: true }); }
