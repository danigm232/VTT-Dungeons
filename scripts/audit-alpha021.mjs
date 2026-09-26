import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { stormwreckBundle } from '../dist/server/campaigns/stormwreck-isle/server.js';

const results = [];
const record = (id, status, detail) => { results.push({ id, status, detail }); console.log(`${status} ${id}: ${detail}`); };
const run = (id, detail, args) => {
  const child = spawnSync(process.execPath, args, { cwd: process.cwd(), encoding: 'utf8', timeout: 60_000 });
  if (child.status === 0) return record(id, 'PASS', detail);
  const output = `${child.stdout ?? ''}\n${child.stderr ?? ''}`.trim().split('\n').slice(-12).join('\n');
  record(id, 'FAIL', `${detail}\n${output || `exit ${child.status}`}`);
};

run('T01-T06', 'Vitest: compilador, estados, geometría, reservas, undo y solicitudes internas', ['node_modules/vitest/vitest.mjs', 'run', '--config', 'vitest.config.ts', '--configLoader', 'runner']);
run('T01-geometry', 'Fixture de geometría Alpha 0.2.1', ['scripts/check-alpha021-design.mjs']);
run('T07', 'Auditoría CAS/idempotencia de sockets Alpha 0.2', ['scripts/audit-alpha02.mjs']);
run('T08-T10-T13', 'Integración real: solicitud, handshake, roles y regresión general', ['scripts/run-integration.mjs']);
run('T02-T04-T07-T09', 'Integración real de objetos: cuatro giros, estructura, privacidad, undo', ['scripts/run-object-integration.mjs']);
run('T13-baseline', 'Auditoría de regresión del build', ['scripts/audit-baseline.mjs']);

try {
  const pkg = JSON.parse(readFileSync(resolve('package.json'), 'utf8'));
  assert.equal(pkg.version, '0.3.0-dev.1');
  assert.equal(stormwreckBundle.public.version, pkg.version);
  const sourceBanners = [
    readFileSync(resolve('apps/web/dm.html'), 'utf8'),
    readFileSync(resolve('apps/web/projector.html'), 'utf8'),
    readFileSync(resolve('apps/web/player.html'), 'utf8'),
    readFileSync(resolve('apps/server/index.ts'), 'utf8')
  ].join('\n');
  assert.ok(!sourceBanners.includes('ALPHA 0.3 RC1'));
  assert.ok(sourceBanners.includes('Alpha 0.3 en desarrollo'));
  record('release', 'PASS', 'package, pack y banners coherentes en 0.3 DEV, sin declarar RC');
} catch (error) { record('release', 'FAIL', error.message); }

try {
  const urls = new Set();
  for (const scene of stormwreckBundle.public.scenes) urls.add(scene.background);
  for (const asset of Object.values(stormwreckBundle.public.tokens)) urls.add(asset.url);
  for (const catalog of Object.values(stormwreckBundle.public.props)) for (const asset of Object.values(catalog.variants)) urls.add(asset.url);
  const missing = [...urls].filter(url => !existsSync(resolve('campaigns/stormwreck-isle/public', `.${url}`)));
  assert.deepEqual(missing, []);
  const publicJson = JSON.stringify(stormwreckBundle.public);
  for (const privateTerm of ['privateNotes', 'interactions', 'undo', 'locked', 'Destreza CD 10']) assert.ok(!publicJson.includes(privateTerm), `filtración pública: ${privateTerm}`);
  record('T09-assets', 'PASS', `${urls.size} recursos públicos presentes y DTO público sin secretos operativos`);
} catch (error) { record('T09-assets', 'FAIL', error.message); }

record('T11', 'BROWSER', 'editor DM, giro, aplicar/cancelar/Escape, preview con sprite y consola se verifican en navegador');
record('T12', 'BROWSER', 'tres roles a 390×844, 844×390 y 1920×1080; perspectiva, restos y consolas se verifican en navegador');

const failures = results.filter(result => result.status === 'FAIL');
console.log(`${results.length - failures.length}/${results.length} bloques sin fallo automatizado; T11-T12 conservan evidencia de navegador separada.`);
process.exitCode = failures.length ? 1 : 0;
