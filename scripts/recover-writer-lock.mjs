// Local-only maintenance of a lock left by a crashed server. Never touches saves.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const [directory, instruction] = process.argv.slice(2);
if (!directory || !path.isAbsolute(directory)) throw new Error('Indica la carpeta absoluta de la partida');
const resolved = path.resolve(directory), real = await fs.realpath(resolved);
if (real !== resolved) throw new Error('La carpeta no puede ser un enlace');
const lockPath = path.join(real, 'writer.lock');
const stat = await fs.lstat(lockPath);
if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Bloqueo no es archivo regular');
const bytes = await fs.readFile(lockPath);
const lock = JSON.parse(bytes.toString('utf8'));
if (!Number.isSafeInteger(lock.pid) || lock.pid < 1 || typeof lock.owner !== 'string' || !Number.isFinite(Date.parse(lock.createdAt))) throw new Error('Identidad de bloqueo inválida');
try {
  process.kill(lock.pid, 0);
  throw new Error(`La mesa con PID ${lock.pid} todavía está activa. No se archiva el bloqueo.`);
} catch (error) {
  if (error.code !== 'ESRCH') throw error; // EPERM/uncertainty means do not claim the process is gone.
}
console.log(`Carpeta: ${real}\nPID anterior: ${lock.pid}\nCreado: ${lock.createdAt}\nNo se tocarán active.json ni active.bak.json.`);
if (instruction !== '--confirm') { console.log('Cierra todas las mesas y repite con --confirm para archivar únicamente writer.lock.'); process.exit(0); }
if (!Buffer.from(await fs.readFile(lockPath)).equals(bytes)) throw new Error('El bloqueo cambió durante la comprobación');
const recovery = path.join(real, 'recovery'); await fs.mkdir(recovery, { recursive: true });
const target = path.join(recovery, `${crypto.randomUUID()}-writer.lock.json`);
await fs.rename(lockPath, target);
console.log(`Bloqueo archivado en: ${target}`);
