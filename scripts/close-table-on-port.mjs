// Called only after the launcher asks the DM for confirmation. It closes only
// the selected campaign process whose PID, writer lock and process start time
// still agree. A dead or recycled PID is archived as recovery evidence; its new
// owner is never terminated.
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const processIdentityToleranceMs = 2_500;
const campaignIds = ['stormwreck-isle', 'd8-night-private'];
const [saveRoot, requestedPort = '3000', requestedCampaign] = process.argv.slice(2);
const port = Number(requestedPort);
if (!saveRoot || !path.isAbsolute(saveRoot) || !Number.isInteger(port) || port < 1 || port > 65535
    || (requestedCampaign && !campaignIds.includes(requestedCampaign))) {
  throw new Error('Uso: close-table-on-port.mjs <raíz-absoluta-de-saves> <puerto> [campaña]');
}

const root = path.resolve(saveRoot);
const realRoot = await fs.realpath(root);
if (realRoot !== root) throw new Error('La raíz de guardados no puede ser un enlace.');
const campaigns = requestedCampaign ? [requestedCampaign] : campaignIds;

async function listenerRows() {
  const { stdout } = await run('netstat', ['-ano'], { windowsHide: true });
  return stdout.split(/\r?\n/).flatMap(line => {
    const fields = line.trim().split(/\s+/);
    if (fields.length < 5 || !['LISTENING', 'LISTEN'].includes(fields[3]?.toUpperCase() ?? '')) return [];
    const local = fields[1] ?? '';
    const listenerPort = Number(local.slice(local.lastIndexOf(':') + 1));
    const pid = Number(fields.at(-1));
    return Number.isInteger(listenerPort) && Number.isSafeInteger(pid) && pid > 0 ? [{ port: listenerPort, pid }] : [];
  });
}

async function processStartTime(pid) {
  try { process.kill(pid, 0); }
  catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ESRCH') return null;
    throw new Error('No se puede comprobar de forma segura el proceso de la mesa.');
  }
  if (pid === process.pid) return performance.timeOrigin;
  if (process.platform !== 'win32') return undefined;
  const command = `$ErrorActionPreference='Stop'; $p=Get-Process -Id ${pid} -ErrorAction SilentlyContinue; if ($null -eq $p) { exit 4 }; [Console]::Out.Write($p.StartTime.ToUniversalTime().ToString('o'))`;
  try {
    const { stdout } = await run('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', command], { windowsHide: true, timeout: 5_000 });
    const startedAt = Date.parse(stdout.trim());
    if (!Number.isFinite(startedAt)) throw new Error('La fecha de creación del proceso no se puede validar.');
    return startedAt;
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 4) return null;
    throw new Error('No se puede comprobar de forma segura la identidad del proceso.');
  }
}

function lockMatchesProcess(lock, startedAt) {
  if (startedAt === null) return false;
  if (startedAt === undefined) return true;
  if (lock.processStartedAt) return Math.abs(startedAt - Date.parse(lock.processStartedAt)) <= processIdentityToleranceMs;
  // Legacy locks have no process start field. A process created after the lock
  // timestamp proves Windows reused that PID after the original table exited.
  return startedAt <= Date.parse(lock.createdAt);
}

async function archiveStaleLock(campaignId, lockPath, raw) {
  if ((await fs.readFile(lockPath, 'utf8')) !== raw) throw new Error('El bloqueo cambió durante la comprobación; no se ha tocado.');
  const recovery = path.join(realRoot, campaignId, 'recovery');
  await fs.mkdir(recovery, { recursive: true });
  const recoveryStat = await fs.lstat(recovery);
  if (!recoveryStat.isDirectory() || recoveryStat.isSymbolicLink() || (await fs.realpath(recovery)) !== recovery) throw new Error('La carpeta de recuperación no es segura.');
  await fs.rename(lockPath, path.join(recovery, `${randomUUID()}-writer.lock.json`));
}

const rows = await listenerRows();
const listeningByPid = new Map();
for (const row of rows) {
  const ports = listeningByPid.get(row.pid) ?? new Set();
  ports.add(row.port);
  listeningByPid.set(row.pid, ports);
}

const owners = [];
const archived = [];
const liveWithoutListener = [];
for (const campaignId of campaigns) {
  const directory = path.join(realRoot, campaignId);
  let dirStat;
  try { dirStat = await fs.lstat(directory); }
  catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') continue;
    throw error;
  }
  if (!dirStat.isDirectory() || dirStat.isSymbolicLink() || (await fs.realpath(directory)) !== directory) throw new Error(`La carpeta de guardado de ${campaignId} no es segura. No se ha cerrado ningún proceso.`);
  const lockPath = path.join(directory, 'writer.lock');
  let stat;
  try { stat = await fs.lstat(lockPath); }
  catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') continue;
    throw error;
  }
  if (!stat.isFile() || stat.isSymbolicLink() || (await fs.realpath(lockPath)) !== lockPath) throw new Error(`El bloqueo de ${campaignId} no es un archivo regular. No se ha cerrado ningún proceso.`);
  const raw = await fs.readFile(lockPath, 'utf8');
  let lock;
  try { lock = JSON.parse(raw); } catch { throw new Error(`La identidad del bloqueo de ${campaignId} no es válida. No se ha cerrado ningún proceso.`); }
  if (!lock || !Number.isSafeInteger(lock.pid) || lock.pid < 1 || typeof lock.owner !== 'string'
      || !Number.isFinite(Date.parse(lock.createdAt))
      || (lock.processStartedAt !== undefined && (typeof lock.processStartedAt !== 'string' || !Number.isFinite(Date.parse(lock.processStartedAt))))) {
    throw new Error(`La identidad del bloqueo de ${campaignId} no es válida. No se ha cerrado ningún proceso.`);
  }
  const startedAt = await processStartTime(lock.pid);
  if (!lockMatchesProcess(lock, startedAt)) {
    await archiveStaleLock(campaignId, lockPath, raw);
    archived.push(campaignId);
    continue;
  }
  const listeningPorts = listeningByPid.get(lock.pid);
  if (listeningPorts?.size) owners.push({ campaignId, pid: lock.pid, ports: [...listeningPorts] });
  else liveWithoutListener.push(campaignId);
}

if (owners.length === 0) {
  if (archived.length && liveWithoutListener.length === 0) {
    console.log(`Bloqueo antiguo archivado (${archived.join(', ')}); no se ha terminado ningún otro proceso.`);
    process.exit(0);
  }
  if (liveWithoutListener.length) throw new Error(`El bloqueo de ${liveWithoutListener.join(', ')} pertenece a un proceso vivo que no está escuchando; no se ha terminado ningún proceso.`);
  throw new Error(`No hay una mesa D&D conocida escuchando en el puerto ${port}; no se ha cerrado ningún proceso.`);
}
if (owners.length > 1) throw new Error('Hay más de una mesa D&D válida asociada; no se ha cerrado ningún proceso.');
const { campaignId, pid, ports } = owners[0];

let graceful = false;
const tokenPath = path.join(realRoot, campaignId, 'shutdown.token');
try {
  const tokenStat = await fs.lstat(tokenPath);
  if (!tokenStat.isFile() || tokenStat.isSymbolicLink() || (await fs.realpath(tokenPath)) !== tokenPath) throw new Error('El token local de cierre no es un archivo regular.');
  const token = (await fs.readFile(tokenPath, 'utf8')).trim();
  if (!/^[0-9a-f]{64}$/i.test(token)) throw new Error('El token local de cierre no es válido.');
  for (const ownerPort of ports) {
    try {
      const response = await fetch(`http://127.0.0.1:${ownerPort}/__local/shutdown`, {
        method: 'POST', headers: { 'x-dungeons-shutdown-token': token }, signal: AbortSignal.timeout(2_000)
      });
      if (response.status === 202) { graceful = true; break; }
    } catch { /* try the process's other local listener */ }
  }
} catch (error) {
  if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')) throw error;
}

if (!graceful) {
  console.warn(`La mesa ${campaignId} no aceptó el cierre ordenado. Se confirmó su PID, bloqueo y hora de inicio; se finalizará únicamente esa instancia.`);
  if (process.platform === 'win32') await run('taskkill.exe', ['/PID', String(pid), '/F'], { windowsHide: true });
  else process.kill(pid, 'SIGTERM');
}

async function stillOwnsListener() {
  return (await listenerRows()).some(row => row.pid === pid);
}
async function lockStillExists() {
  try { await fs.lstat(path.join(realRoot, campaignId, 'writer.lock')); return true; }
  catch (error) { if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return false; throw error; }
}

for (let attempt = 0; attempt < 60; attempt++) {
  await new Promise(resolve => setTimeout(resolve, 150));
  if (!(await stillOwnsListener()) && (!graceful || !(await lockStillExists()))) {
    console.log(graceful
      ? `Mesa anterior (${campaignId}) cerrada y guardado desbloqueado.`
      : `Mesa anterior (${campaignId}) cerrada tras confirmar su proceso y puerto.`);
    process.exit(0);
  }
}
throw new Error('La mesa anterior sigue ocupando su puerto. Ciérrala manualmente.');
