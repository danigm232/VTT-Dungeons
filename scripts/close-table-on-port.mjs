// Called only after the launcher has asked the DM for confirmation. It closes
// a known D&D campaign process only when its writer lock PID owns the requested
// listening port. It never deletes a save or a lock.
import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const [saveRoot, requestedPort = '3000'] = process.argv.slice(2);
const port = Number(requestedPort);
if (!saveRoot || !path.isAbsolute(saveRoot) || !Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Uso: close-table-on-port.mjs <raíz-absoluta-de-saves> <puerto>');

const root = path.resolve(saveRoot);
const realRoot = await fs.realpath(root);
if (realRoot !== root) throw new Error('La raíz de guardados no puede ser un enlace.');

const { stdout } = await run('netstat', ['-ano'], { windowsHide: true });
const listeningPids = new Set(stdout.split(/\r?\n/).flatMap(line => {
  const fields = line.trim().split(/\s+/);
  return fields.length >= 5 && fields[1]?.endsWith(`:${port}`) && ['LISTENING', 'LISTEN'].includes(fields[3]?.toUpperCase() ?? '')
    ? [Number(fields.at(-1))] : [];
}).filter(pid => Number.isSafeInteger(pid) && pid > 0));

const owners = [];
for (const campaignId of ['stormwreck-isle', 'd8-night-private']) {
  const directory = path.join(realRoot, campaignId);
  let dirStat;
  try { dirStat = await fs.lstat(directory); }
  catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') continue;
    throw error;
  }
  if (!dirStat.isDirectory() || dirStat.isSymbolicLink()) throw new Error(`La carpeta de guardado de ${campaignId} no es segura. No se ha cerrado ningún proceso.`);
  const lockPath = path.join(directory, 'writer.lock');
  let stat;
  try { stat = await fs.lstat(lockPath); }
  catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') continue;
    throw error;
  }
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`El bloqueo de ${campaignId} no es un archivo regular. No se ha cerrado ningún proceso.`);
  const lock = JSON.parse((await fs.readFile(lockPath)).toString('utf8'));
  if (!Number.isSafeInteger(lock.pid) || lock.pid < 1 || typeof lock.owner !== 'string' || !Number.isFinite(Date.parse(lock.createdAt))) {
    throw new Error(`La identidad del bloqueo de ${campaignId} no es válida. No se ha cerrado ningún proceso.`);
  }
  if (!listeningPids.has(lock.pid)) continue;
  try { process.kill(lock.pid, 0); }
  catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ESRCH') continue;
    throw new Error('No se puede comprobar de forma segura la mesa anterior. Ciérrala manualmente.');
  }
  owners.push({ campaignId, pid: lock.pid });
}

if (owners.length === 0) throw new Error(`No hay una mesa D&D conocida escuchando en el puerto ${port}; no se ha cerrado ningún proceso. Cierra manualmente la aplicación que lo ocupa.`);
if (owners.length > 1) throw new Error('Hay más de un bloqueo asociado al puerto; no se ha cerrado ningún proceso.');
const { campaignId, pid } = owners[0];

let graceful = false;
const tokenPath = path.join(realRoot, campaignId, 'shutdown.token');
try {
  const tokenStat = await fs.lstat(tokenPath);
  if (!tokenStat.isFile() || tokenStat.isSymbolicLink()) throw new Error('El token local de cierre no es un archivo regular.');
  const token = (await fs.readFile(tokenPath, 'utf8')).trim();
  if (!/^[0-9a-f]{64}$/i.test(token)) throw new Error('El token local de cierre no es válido.');
  const response = await fetch(`http://127.0.0.1:${port}/__local/shutdown`, {
    method: 'POST', headers: { 'x-dungeons-shutdown-token': token }, signal: AbortSignal.timeout(2000)
  });
  graceful = response.status === 202;
} catch (error) {
  if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')
      && !(error instanceof TypeError) && !(error instanceof DOMException && error.name === 'TimeoutError')) throw error;
}

if (!graceful) {
  console.warn(`La mesa ${campaignId} no tiene el cierre ordenado de esta versión. Se confirmó el PID por su bloqueo y por el puerto; se finalizará esa instancia.`);
  if (process.platform === 'win32') await run('taskkill.exe', ['/PID', String(pid), '/F'], { windowsHide: true });
  else process.kill(pid, 'SIGTERM');
}

async function ownsPort() {
  const { stdout } = await run('netstat', ['-ano'], { windowsHide: true });
  return stdout.split(/\r?\n/).some(line => {
    const fields = line.trim().split(/\s+/);
    return fields.length >= 5 && fields[1]?.endsWith(`:${port}`) && ['LISTENING', 'LISTEN'].includes(fields[3]?.toUpperCase() ?? '') && fields.at(-1) === String(pid);
  });
}
async function lockStillExists() {
  try { await fs.lstat(path.join(realRoot, campaignId, 'writer.lock')); return true; }
  catch (error) { if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return false; throw error; }
}

for (let attempt = 0; attempt < 60; attempt++) {
  await new Promise(resolve => setTimeout(resolve, 150));
  const stillListening = await ownsPort();
  if (!stillListening && (!graceful || !(await lockStillExists()))) {
    console.log(graceful
      ? `Mesa anterior (${campaignId}) cerrada y guardado desbloqueado.`
      : `Mesa anterior (${campaignId}) cerrada tras confirmar su proceso y puerto.`);
    process.exit(0);
  }
}
throw new Error('La mesa anterior sigue ocupando el puerto. Ciérrala manualmente.');
