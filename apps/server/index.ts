import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import { spawn } from 'node:child_process';
import express from 'express';
import QRCode from 'qrcode';
import { Server } from 'socket.io';
import { GameServer } from '../../engine/server/game.js';
import { SaveStore } from '../../engine/server/persistence/store.js';
import { PersistenceCoordinator } from '../../engine/server/persistence/coordinator.js';
import { anonymousCampaignView } from '../../engine/shared/campaign-view.js';

const app = express();
const server = http.createServer(app);
const port = Number.parseInt(process.env.PORT ?? '3000', 10);
const host = process.env.HOST || '0.0.0.0';
const loopbackBind = ['localhost', '127.0.0.1', '::1'].includes(host.toLowerCase());
// Default for the table at home: opening /dm establishes its own short-lived local session.
// Setting DM_PASSWORD again deliberately restores the password gate without changing clients.
const dmPassword = process.env.DM_PASSWORD?.trim() || null;
const dmSessionToken = crypto.randomBytes(24).toString('hex');
const shutdownToken = crypto.randomBytes(32).toString('hex');
const isProduction = process.env.NODE_ENV === 'production' || process.argv[1]?.includes(`${path.sep}dist${path.sep}`);
const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), isProduction ? '../../../..' : '../..');
const configuredWebDir = process.env.DUNGEONS_WEB_DIR?.trim();
if (configuredWebDir && !path.isAbsolute(configuredWebDir)) throw new Error('DUNGEONS_WEB_DIR debe ser absoluto');
const webDir = configuredWebDir ? path.resolve(configuredWebDir) : path.join(appRoot, 'dist/web');
const requestedCampaign = process.env.DUNGEONS_CAMPAIGN ?? 'stormwreck-isle';
// Compatibility alias: old launch shortcuts now open the integrated island
// campaign and its shared Stormwreck save slot instead of a separate module.
const campaignChoice = requestedCampaign === 'camp-rests' ? 'stormwreck-isle' : requestedCampaign;
if (!['stormwreck-isle', 'd8-night-private'].includes(campaignChoice)) throw new Error('DUNGEONS_CAMPAIGN desconocida');
const campaignBundle = campaignChoice === 'd8-night-private'
  ? (await import('../../campaigns/one-shot/server.js')).oneShotBundle
  : (await import('../../campaigns/stormwreck-isle/server.js')).stormwreckBundle;
const assetFolders = campaignChoice === 'd8-night-private' ? ['one-shot'] : ['stormwreck-isle', 'camp-rests'];
const dataRoot = process.env.DUNGEONS_DATA_DIR ? path.resolve(process.env.DUNGEONS_DATA_DIR) : path.join(appRoot, 'data/saves');
if (process.env.DUNGEONS_DATA_DIR && !path.isAbsolute(process.env.DUNGEONS_DATA_DIR)) throw new Error('DUNGEONS_DATA_DIR debe ser absoluto');
const publicAssetDirs = assetFolders.flatMap(folder => ['art', 'audio'].map(kind => path.join(appRoot, 'campaigns', folder, 'public', kind)));
for (const forbidden of [webDir, ...publicAssetDirs, path.join(appRoot, 'dist')]) if (dataRoot === forbidden || dataRoot.startsWith(`${forbidden}${path.sep}`)) throw new Error('Datos privados dentro de ruta pública');
const csrfToken = crypto.randomUUID();
const shutdownTokenPath = path.join(dataRoot, campaignChoice === 'd8-night-private' ? 'd8-night-private' : 'stormwreck-isle', 'shutdown.token');
let shutdownTokenReady = false;

function lanAddresses() {
  if (loopbackBind) return [];
  return Object.values(os.networkInterfaces()).flat().filter((v): v is os.NetworkInterfaceInfo => Boolean(v && v.family === 'IPv4' && !v.internal && !v.address.startsWith('169.254.'))).map(v => v.address);
}
function trustedHost(value: string | undefined) {
  return Boolean(value && ['localhost', '127.0.0.1', ...lanAddresses()].some(address => value === `${address}:${port}`));
}
function sameOrigin(req: express.Request) {
  const origin = req.get('origin'); if (!origin) return true;
  try { return trustedHost(req.get('host')) && new URL(origin).protocol === 'http:' && new URL(origin).host === req.get('host'); } catch { return false; }
}

app.disable('x-powered-by');
function dmAuthorized(req: express.Request) {
  const cookie = String(req.headers.cookie ?? '').split(';').map(x => x.trim()).find(x => x.startsWith('dnd_dm='));
  return Boolean(cookie && cookie.slice('dnd_dm='.length) === dmSessionToken);
}
function privateGuard(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!dmAuthorized(req)) return res.status(401).json({ code: 'DM_AUTH_REQUIRED' });
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff');
  if (!trustedHost(req.get('host'))) return res.status(403).json({ code: 'DM_REQUEST_FORBIDDEN' });
  if (req.method !== 'GET') {
    if (!req.get('origin') || !sameOrigin(req) || req.get('x-dungeons-csrf') !== csrfToken || !req.is('application/json')) return res.status(403).json({ code: 'DM_REQUEST_FORBIDDEN' });
  }
  next();
}
function privateError(res: express.Response, error: unknown) {
  const candidate = error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' ? error.code : error instanceof Error ? error.message : 'SAVE_IO';
  const code = /^[A-Z][A-Z0-9_]{2,60}$/.test(candidate) ? candidate : 'INVALID_SAVE';
  const status = /STALE|BUSY|INCOMPATIBLE|REUSED|RATE_LIMIT|UNAVAILABLE/.test(code) ? 409 : /TOO_LARGE/.test(code) ? 413
    : code === 'ENOSPC' ? 507 : /^(EIO|EROFS|EPERM|EACCES|EBUSY|ENOENT|SAVE_IO|SAVE_COMMIT_UNCERTAIN|SAVE_READBACK|BACKUP_READBACK)$/.test(code) ? 503
      : /INVALID_REQUEST_ID|EVIDENCE_NOT_FOUND|PREVIEW_EXPIRED|INVALID_JSON|JSON_KEY/.test(code) ? 400 : 422;
  return res.status(status).json({ code });
}
let coordinator: PersistenceCoordinator;

// Preview uses a private 4 MiB limit before the normal 16 KiB JSON parser.
app.post('/api/dm/save/preview', privateGuard, express.raw({ type: 'application/json', limit: '4mb' }), (req, res) => {
  if (!coordinator || req.get('x-dungeons-runtime-epoch') !== game.state.runtimeEpoch) return res.status(409).json({ code: 'STALE_RUNTIME' });
  try { return res.json(coordinator.preview(req.body as Buffer)); } catch (error) { return privateError(res, error); }
});
// Authentication and origin checks run before parsing all other private JSON bodies.
app.use('/api/dm/save', privateGuard);
app.use(express.json({ limit: '16kb' }));
app.use('/assets', express.static(path.join(webDir, 'assets'), { fallthrough: false, maxAge: '1d' }));
for (const folder of assetFolders) {
  app.use('/audio', express.static(path.join(appRoot, 'campaigns', folder, 'public/audio'), { fallthrough: true, maxAge: '1d' }));
  app.use('/art', express.static(path.join(appRoot, 'campaigns', folder, 'public/art'), { fallthrough: true, maxAge: '1d', immutable: true }));
}

app.get('/api/info', async (_req, res) => {
  const addresses = lanAddresses(); const host = addresses[0] ?? '127.0.0.1'; const playerUrl = `http://${host}:${port}/player`;
  const dmMobileUrl = `http://${host}:${port}/dm-mobile`;
  const [qr, dmMobileQr] = await Promise.all([QRCode.toDataURL(playerUrl, { margin: 1, width: 240 }), QRCode.toDataURL(dmMobileUrl, { margin: 1, width: 240 })]);
  res.json({ playerUrl, projectorUrl: `http://${host}:${port}/projector`, dmUrl: `http://localhost:${port}/dm`, dmMobileUrl, addresses, qr, dmMobileQr });
});
app.get('/api/campaign', (req, res) => {
  if (dmAuthorized(req)) return res.json(campaignBundle.public);
  // Las vistas sin sesión reciben sólo el catálogo no restringido. La escena
  // autorizada concreta viaja después dentro de su snapshot de socket.
  return res.json(anonymousCampaignView(campaignBundle.public));
});
app.get('/api/d8/renderer-config', async (_req, res) => {
  if (campaignChoice !== 'd8-night-private') return res.sendStatus(404);
  const { d8PublicRendererConfig } = await import('../../campaigns/one-shot/renderer-config.js');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.json(d8PublicRendererConfig());
});
app.post('/__local/shutdown', (req, res) => {
  const remote = req.socket.remoteAddress ?? '';
  const localRequest = remote === '127.0.0.1' || remote === '::1' || remote.startsWith('::ffff:127.');
  const supplied = Buffer.from(req.get('x-dungeons-shutdown-token') ?? '');
  const expected = Buffer.from(shutdownToken);
  if (!localRequest || !trustedHost(req.get('host')) || supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) {
    return res.status(403).json({ ok: false });
  }
  res.status(202).json({ ok: true });
  setImmediate(() => void shutdown());
});
app.post('/api/dm/login', (req, res) => {
  if (!trustedHost(req.get('host')) || !sameOrigin(req)) return res.status(403).json({ ok: false });
  if (dmPassword) {
    const supplied = typeof req.body?.password === 'string' ? Buffer.from(req.body.password) : Buffer.alloc(0);
    const expected = Buffer.from(dmPassword);
    if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return res.status(401).json({ ok: false, code: 'DM_PASSWORD_REQUIRED' });
  }
  res.setHeader('Set-Cookie', `dnd_dm=${encodeURIComponent(dmSessionToken)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200`);
  res.json({ ok: true, csrfToken });
});

app.get('/api/dm/save/status', privateGuard, (_req, res) => res.json({ ...coordinator.status(), csrfToken }));
app.get('/api/dm/save/result/:requestId', privateGuard, async (req, res) => res.json(await coordinator.result(req.params.requestId as string)));
app.get('/api/dm/save/evidence', privateGuard, async (_req, res) => {
  try { return res.json(await coordinator.evidence()); } catch (error) { return privateError(res, error); }
});
app.get('/api/dm/save/evidence/:id', privateGuard, async (req, res) => {
  try { res.setHeader('Content-Disposition', 'attachment; filename="dungeons-recovery-evidence.json"'); return res.type('application/json').send(await coordinator.evidenceFile(req.params.id as string)); }
  catch (error) { return privateError(res, error); }
});
app.post('/api/dm/save', privateGuard, async (req, res) => {
  if (req.body?.runtimeEpoch !== game.state.runtimeEpoch || typeof req.body?.requestId !== 'string') return res.status(409).json({ code: 'STALE_RUNTIME' });
  try { return res.json(await coordinator.saveNow(req.body.requestId, req.body.runtimeEpoch)); } catch (error) { return privateError(res, error); }
});
app.post('/api/dm/save/retry', privateGuard, async (req, res) => {
  if (req.body?.runtimeEpoch !== game.state.runtimeEpoch) return res.status(409).json({ code: 'STALE_RUNTIME' });
  try { return res.json(await coordinator.retry()); } catch (error) { return privateError(res, error); }
});
app.get('/api/dm/save/export', privateGuard, (_req, res) => {
  try { res.setHeader('Content-Disposition', 'attachment; filename="dungeons-save.json"'); return res.type('application/json').send(JSON.stringify(coordinator.exportMemory())); }
  catch (error) { return privateError(res, error); }
});
app.post('/api/dm/save/backup/preview', privateGuard, async (req, res) => {
  if (req.body?.runtimeEpoch !== game.state.runtimeEpoch) return res.status(409).json({ code: 'STALE_RUNTIME' });
  try { return res.json(await coordinator.previewBackup()); } catch (error) { return privateError(res, error); }
});
app.get('/api/dm/save/history', privateGuard, async (_req, res) => { try { res.json(await coordinator.history()); } catch (error) { privateError(res, error); } });
app.post('/api/dm/save/history/:id/preview', privateGuard, async (req, res) => {
  if (req.body.runtimeEpoch !== game.state.runtimeEpoch) return privateError(res, new Error('STALE_RUNTIME'));
  try { res.json(await coordinator.previewHistory(String(req.params.id ?? ''))); } catch (error) { privateError(res, error); }
});
app.post('/api/dm/save/new/preview', privateGuard, (req, res) => {
  if (req.body?.runtimeEpoch !== game.state.runtimeEpoch) return res.status(409).json({ code: 'STALE_RUNTIME' });
  try { return res.json(coordinator.previewNew()); } catch (error) { return privateError(res, error); }
});
app.post('/api/dm/save/restore', privateGuard, async (req, res) => {
  const { runtimeEpoch, token, expectedStateRevision, requestId } = req.body ?? {};
  if (typeof requestId !== 'string' || typeof token !== 'string' || typeof expectedStateRevision !== 'number') return res.status(400).json({ code: 'INVALID_RESTORE' });
  try { return res.json(await coordinator.restore(token, runtimeEpoch, expectedStateRevision, requestId)); } catch (error) { return privateError(res, error); }
});

for (const route of ['dm', 'dm-mobile', 'player', 'projector'] as const) app.get(`/${route}`, (_req, res) => res.sendFile(path.join(webDir, 'apps', 'web', `${route}.html`)));
app.get('/', (_req, res) => res.redirect('/player'));
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const code = error && typeof error === 'object' && 'type' in error && error.type === 'entity.too.large' ? 'SAVE_TOO_LARGE' : 'INVALID_JSON';
  res.status(code === 'SAVE_TOO_LARGE' ? 413 : 400).json({ code });
});
app.use((_req, res) => res.status(404).send('No encontrado'));

const io = new Server(server, { serveClient: true, maxHttpBufferSize: 16_384, allowRequest: (req, callback) => {
  const origin = req.headers.origin; callback(null, trustedHost(req.headers.host) && (!origin || (() => { try { return new URL(origin).protocol === 'http:' && new URL(origin).host === req.headers.host; } catch { return false; } })()));
} });
const game = new GameServer(io, dmSessionToken, campaignBundle);
const saveStore = new SaveStore(path.join(dataRoot, campaignBundle.public.campaignId));
coordinator = new PersistenceCoordinator(saveStore, campaignBundle, () => game.state, candidate => game.installState(candidate), () => game.state.runtimeEpoch, status => io.to('dm').emit('save:status', status));
game.persistence = coordinator;

async function boot() {
  await coordinator.open();
  await fs.writeFile(shutdownTokenPath, shutdownToken, { encoding: 'utf8', mode: 0o600 });
  shutdownTokenReady = true;
  if (['recovery', 'incompatible'].includes(coordinator.status().mode)) console.error(`Partida pendiente de recuperación: ${coordinator.status().errorCode ?? coordinator.status().mode}`);
  game.start();
  server.listen(port, host, () => {
  console.log('\nD&D Immersive Engine — Alpha 0.3 en desarrollo');
  console.log(`Campaña:   ${campaignBundle.public.title}`);
  console.log(`DM:        http://localhost:${port}/dm`);
  console.log(`Consola DM: http://localhost:${port}/dm-mobile`);
  console.log(`Proyector: http://localhost:${port}/projector`);
    const addresses = lanAddresses();
    for (const address of addresses) console.log(`Jugadores: http://${address}:${port}/player`);
    if (!addresses.length) console.log(`Jugadores (solo este equipo): http://localhost:${port}/player`);
  console.log(dmPassword ? 'Acceso DM: contraseña configurada\n' : 'Acceso DM: sin contraseña temporalmente\n');
  if (process.env.DUNGEONS_OPEN_DM === '1') {
    const dmUrl = `http://localhost:${port}/dm`;
    if (process.platform === 'win32') {
      const opener = spawn('cmd.exe', ['/d', '/s', '/c', 'start', '', dmUrl], { detached: true, stdio: 'ignore', windowsHide: true });
      opener.unref();
    } else console.log(`Abre el DM en: ${dmUrl}`);
  }
  });
}
void boot().catch(async error => {
  const code = (error as NodeJS.ErrnoException).code;
  if (code === 'SAVE_LOCK_ACTIVE') console.error('Esta campaña ya está abierta en otra mesa. Cierra esa mesa antes de volver a iniciarla.');
  else if (code === 'SAVE_LOCK_INVALID' || code === 'SAVE_LOCK_CHANGED') console.error('El bloqueo de esta campaña no se puede validar de forma segura. El guardado no se ha tocado.');
  else console.error('No se pudo iniciar la carpeta privada de partidas:', error);
  process.exitCode = 1; game.stop();
  await removeShutdownToken();
  try { await saveStore.close(); } catch { /* only our own writer lock can be released */ }
});
server.on('error', error => {
  const code = (error as NodeJS.ErrnoException).code;
  console.error(code === 'EADDRINUSE' ? `El puerto ${port} ya está ocupado. Cierra la otra instancia o usa PORT=otro_puerto.` : error);
  process.exitCode = 1;
  void shutdown();
});

let stopping = false;
async function shutdown() {
  if (stopping) return; stopping = true; game.stop();
  try { await Promise.race([coordinator.close(), new Promise((_, reject) => setTimeout(() => reject(new Error('SAVE_SHUTDOWN_TIMEOUT')), 10_000))]); }
  catch (error) { console.error('No se pudo confirmar el último guardado:', error); process.exitCode = 1; }
  await removeShutdownToken();
  io.close();
  const finished = () => {
    if (process.exitCode === undefined) process.exitCode = 0;
    if (process.env.DUNGEONS_TEST_CHILD === '1' && process.send) { process.send({ type: 'stopped', exitCode: process.exitCode }); process.disconnect(); }
  };
  if (server.listening) server.close(finished); else finished();
}

async function removeShutdownToken() {
  if (!shutdownTokenReady) return;
  try {
    if (await fs.readFile(shutdownTokenPath, 'utf8') === shutdownToken) await fs.unlink(shutdownTokenPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') console.error('No se pudo retirar el token local de cierre.');
  } finally { shutdownTokenReady = false; }
}
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
if (process.env.DUNGEONS_TEST_CHILD === '1') process.on('message', message => { if (message === 'shutdown') void shutdown(); });
