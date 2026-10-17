import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
async function regularDirectory(directory) {
  const stat = await fs.lstat(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink() || await fs.realpath(directory) !== directory) throw new Error('La carpeta de compilación no puede ser un enlace.');
}
async function checkedStage(root, requested) {
  root = path.resolve(root);
  await regularDirectory(root);
  const runtime = path.join(root, 'runtime'), stage = path.resolve(requested);
  if (path.dirname(stage) !== runtime || !/^prepared-[a-z0-9-]+$/i.test(path.basename(stage))) throw new Error('La candidata debe estar en runtime/prepared-… dentro del proyecto.');
  await fs.mkdir(runtime, { recursive: true }); await regularDirectory(runtime);
  return stage;
}
function runNode(root, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: root, stdio: 'inherit', windowsHide: true });
    child.on('error', reject);
    child.on('exit', (code, signal) => code === 0 ? resolve() : reject(new Error(`No se pudo compilar la candidata (${code ?? signal}). La mesa anterior no se ha modificado.`)));
  });
}
export async function prepareBuild(root, requested) {
  const stage = await checkedStage(root, requested);
  await fs.mkdir(stage); // Refuse to reuse or empty an existing candidate.
  const build = path.join(stage, 'dist');
  await runNode(root, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.client.json', '--noEmit']);
  await runNode(root, ['node_modules/vite/bin/vite.js', 'build', '--configLoader', 'runner', '--outDir', path.join(build, 'web')]);
  await runNode(root, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.server.json', '--outDir', path.join(build, 'server')]);
  await fs.writeFile(path.join(stage, 'prepared.json'), JSON.stringify({ root: path.resolve(root), preparedAt: new Date().toISOString() }), { flag: 'wx' });
  console.log('Candidata compilada. La versión activa todavía no se ha reemplazado.');
}
export async function noLiveWriter(saveRoot) {
  for (const campaign of ['stormwreck-isle', 'd8-night-private']) {
    let lock;
    try { lock = JSON.parse(await fs.readFile(path.join(saveRoot, campaign, 'writer.lock'), 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    if (!Number.isSafeInteger(lock.pid) || lock.pid <= 0) throw new Error('No se puede validar el bloqueo de la mesa.');
    try { process.kill(lock.pid, 0); }
    catch (error) { if (error.code === 'ESRCH') continue; throw error; }
    throw new Error(`La mesa ${campaign} sigue abierta. No se ha reemplazado la aplicación.`);
  }
}
export async function activateBuild(root, requested, saveRoot, move = fs.rename) {
  root = path.resolve(root);
  const stage = await checkedStage(root, requested);
  await regularDirectory(stage);
  const manifest = JSON.parse(await fs.readFile(path.join(stage, 'prepared.json'), 'utf8'));
  if (manifest.root !== root) throw new Error('La candidata pertenece a otro proyecto.');
  const prepared = path.join(stage, 'dist'), active = path.join(root, 'dist');
  await regularDirectory(prepared);
  for (const file of ['web/apps/web/dm.html', 'web/apps/web/player.html', 'web/apps/web/projector.html', 'server/apps/server/index.js']) {
    const filename = path.join(prepared, file), stat = await fs.lstat(filename);
    if (!stat.isFile() || stat.isSymbolicLink() || await fs.realpath(filename) !== filename) throw new Error('La candidata está incompleta.');
  }
  await noLiveWriter(path.resolve(saveRoot));
  const previous = path.join(root, 'runtime', `previous-build-${randomUUID()}`);
  let former = false;
  try { await regularDirectory(active); former = true; }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  // Every resolved source/target is inside root/dist or root/runtime. Both
  // renames are directory swaps, with rollback if installation fails.
  if (former) await move(active, previous);
  try { await move(prepared, active); }
  catch (error) { if (former) await move(previous, active); throw error; }
  console.log('Candidata instalada. La compilación anterior se conserva en runtime.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [mode, stage, saveRoot] = process.argv.slice(2);
  try {
    if (mode === 'prepare' && stage) await prepareBuild(workspace, stage);
    else if (mode === 'activate' && stage && saveRoot) await activateBuild(workspace, stage, saveRoot);
    else if (mode === 'check' && stage) await noLiveWriter(path.resolve(stage));
    else throw new Error('Uso: prepared-build.mjs prepare <candidata> | activate <candidata> <guardados> | check <guardados>');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
