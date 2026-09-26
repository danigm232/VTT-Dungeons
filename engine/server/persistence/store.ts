import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { promisify } from 'node:util';
import { decode } from './codec.js';
import type { SaveV1 } from './schema.js';

const retryable = new Set(['EPERM', 'EACCES', 'EBUSY']);
async function retry<T>(action: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await action(); }
    catch (error) {
      if (attempt >= 4 || !retryable.has((error as NodeJS.ErrnoException).code ?? '')) throw error;
      await new Promise(resolve => setTimeout(resolve, [50, 100, 200, 400][attempt]));
    }
  }
}
async function syncedFile(filename: string, data: Buffer) {
  const handle = await retry(() => fs.open(filename, 'wx', 0o600));
  try { await handle.writeFile(data); await handle.sync(); } finally { await handle.close(); }
  if (!Buffer.from(await fs.readFile(filename)).equals(data)) throw new Error('SAVE_READBACK');
}
type WriterLock = { pid: number; owner: string; createdAt: string; processStartedAt?: string };
const run = promisify(execFile);
const processIdentityToleranceMs = 2_500;
function saveError(code: string) { return Object.assign(new Error(code), { code }); }
function parseWriterLock(raw: string): WriterLock {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw saveError('SAVE_LOCK_INVALID'); }
  if (!value || typeof value !== 'object') throw saveError('SAVE_LOCK_INVALID');
  const lock = value as Partial<WriterLock>;
  const { pid, owner, createdAt, processStartedAt } = lock;
  if (typeof pid !== 'number' || !Number.isSafeInteger(pid) || pid <= 0 || typeof owner !== 'string' || !/^[0-9a-f-]{36}$/i.test(owner) || typeof createdAt !== 'string' || Number.isNaN(Date.parse(createdAt)) || (processStartedAt !== undefined && (typeof processStartedAt !== 'string' || Number.isNaN(Date.parse(processStartedAt))))) throw saveError('SAVE_LOCK_INVALID');
  return { pid, owner, createdAt, ...(processStartedAt === undefined ? {} : { processStartedAt }) };
}

async function operatingSystemProcessStart(pid: number): Promise<number | null | undefined> {
  // The OS creation time catches a recycled Windows PID. An inaccessible or
  // unqueryable process stays "unknown" and therefore keeps the lock protected.
  if (pid === process.pid) return performance.timeOrigin;
  if (process.platform !== 'win32') return undefined;
  const command = `$ErrorActionPreference='Stop'; $p=Get-Process -Id ${pid} -ErrorAction SilentlyContinue; if ($null -eq $p) { exit 4 }; [Console]::Out.Write($p.StartTime.ToUniversalTime().ToString('o'))`;
  try {
    const { stdout } = await run('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', command], { windowsHide: true, timeout: 5_000 });
    const startedAt = Date.parse(stdout.trim());
    if (!Number.isFinite(startedAt)) throw saveError('SAVE_LOCK_ACTIVE');
    return startedAt;
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 4) return null;
    throw saveError('SAVE_LOCK_ACTIVE');
  }
}

async function writerProcessIsAlive(lock: WriterLock): Promise<boolean> {
  try { process.kill(lock.pid, 0); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ESRCH') return false;
    throw error;
  }
  const actualStart = await operatingSystemProcessStart(lock.pid);
  if (actualStart === null) return false;
  if (actualStart === undefined) return true;
  if (lock.processStartedAt) return Math.abs(actualStart - Date.parse(lock.processStartedAt)) <= processIdentityToleranceMs;
  // Older saves do not record processStartedAt. Their acquisition timestamp
  // still proves PID reuse when the current OS process began after the lock.
  return actualStart <= Date.parse(lock.createdAt);
}

export type SaveCandidate = { role: 'active' | 'backup' | 'history'; id: string; save: SaveV1; legacyOriginal: Buffer | null };
export type InitialSave = { mode: 'new' | 'ready' | 'recovery' | 'incompatible'; save: SaveV1 | null; backup: SaveV1 | null; legacyOriginal: Buffer | null; errorCode: string | null; candidates: SaveCandidate[] };
export class SaveStore {
  readonly directory: string;
  readonly active: string;
  readonly backup: string;
  readonly lockPath: string;
  private owner = crypto.randomUUID();
  private locked = false;
  private evidenceFiles = new Map<string, string>();

  constructor(directory: string) {
    if (!path.isAbsolute(directory)) throw new Error('SAVE_DIRECTORY_ABSOLUTE_REQUIRED');
    this.directory = path.resolve(directory);
    this.active = path.join(this.directory, 'active.json');
    this.backup = path.join(this.directory, 'active.bak.json');
    this.lockPath = path.join(this.directory, 'writer.lock');
  }
  private async acquireWriterLock() {
    const write = async () => {
      const handle = await retry(() => fs.open(this.lockPath, 'wx', 0o600));
      try { await handle.writeFile(JSON.stringify({ pid: process.pid, owner: this.owner, createdAt: new Date().toISOString(), processStartedAt: new Date(performance.timeOrigin).toISOString() })); await handle.sync(); }
      finally { await handle.close(); }
    };
    try { await write(); return; }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    }
    // A lock is archived automatically only after checking that it is a regular,
    // well-formed lock and that its exact process has ended or its PID was reused.
    // Active or uncertain locks remain untouched, so two live tables can never
    // share a save folder.
    const stat = await fs.lstat(this.lockPath);
    if (!stat.isFile() || stat.isSymbolicLink() || (await fs.realpath(this.lockPath)) !== this.lockPath) throw saveError('SAVE_LOCK_INVALID');
    const raw = await fs.readFile(this.lockPath, 'utf8');
    const previous = parseWriterLock(raw);
    if (await writerProcessIsAlive(previous)) throw saveError('SAVE_LOCK_ACTIVE');
    // Re-read immediately before moving it: another launcher may have acquired
    // the slot between our PID check and this recovery attempt.
    if (await fs.readFile(this.lockPath, 'utf8') !== raw) throw saveError('SAVE_LOCK_CHANGED');
    const folder = await this.recoveryFolder();
    await retry(() => fs.rename(this.lockPath, path.join(folder, `${crypto.randomUUID()}-writer.lock.json`)));
    await write();
  }
  async open(): Promise<InitialSave> {
    await fs.mkdir(this.directory, { recursive: true });
    const resolved = await fs.realpath(this.directory);
    if (resolved !== this.directory) throw new Error('SAVE_DIRECTORY_LINK');
    await this.acquireWriterLock();
    this.locked = true;
    const read = async (filename: string) => {
      try {
        const stat = await fs.lstat(filename);
        if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('SAVE_FILE_LINK');
        const raw = await fs.readFile(filename);
        return { found: true, save: decode(raw), legacyOriginal: JSON.parse(raw.toString('utf8')).schemaVersion === 0 ? raw : null as Buffer | null, error: null as string | null };
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { found: false, save: null, legacyOriginal: null, error: null as string | null };
        return { found: true, save: null, legacyOriginal: null, error: error instanceof Error ? error.message : 'INVALID_SAVE' };
      }
    };
    const active = await read(this.active), backup = await read(this.backup);
    if (active.error === 'SAVE_FORMAT_INCOMPATIBLE') return { mode: 'incompatible', save: null, backup: backup.save, legacyOriginal: null, errorCode: active.error, candidates: [] };
    const candidates: SaveCandidate[] = [];
    if (active.save) candidates.push({ role: 'active', id: 'active', save: active.save, legacyOriginal: active.legacyOriginal });
    if (backup.save) candidates.push({ role: 'backup', id: 'backup', save: backup.save, legacyOriginal: backup.legacyOriginal });
    const historyFolder = await this.historyFolder();
    const historyCandidates: SaveCandidate[] = [];
    let historyFound = false;
    for (const name of await fs.readdir(historyFolder)) {
      if (!/^[0-9]+\.json$/.test(name)) continue;
      historyFound = true;
      const item = await read(path.join(historyFolder, name));
      if (item.save) historyCandidates.push({ role: 'history', id: name, save: item.save, legacyOriginal: item.legacyOriginal });
    }
    historyCandidates.sort((a, b) => b.save.generation - a.save.generation);
    candidates.push(...historyCandidates);
    const unique = candidates.filter((candidate, index, all) => all.findIndex(item => item.save.checksum === candidate.save.checksum) === index);
    if (unique.length) return { mode: 'ready', save: unique[0]!.save, backup: backup.save, legacyOriginal: unique[0]!.legacyOriginal, errorCode: active.error ?? backup.error, candidates: unique };
    const files = await fs.readdir(this.directory);
    if (active.found || backup.found || historyFound || files.some(name => name.startsWith('.active-') || name.startsWith('.backup-'))) return { mode: 'recovery', save: null, backup: null, legacyOriginal: null, errorCode: active.error ?? backup.error ?? (historyFound ? 'HISTORY_INVALID' : 'UNCOMMITTED_TEMPORARY'), candidates: [] };
    return { mode: 'new', save: null, backup: null, legacyOriginal: null, errorCode: null, candidates: [] };
  }
  async readBackupBytes() {
    const stat = await fs.lstat(this.backup);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 4 * 1024 * 1024 || (await fs.realpath(this.backup)) !== this.backup) throw new Error('SAVE_FILE_LINK');
    return fs.readFile(this.backup);
  }
  async matchesCommitted(save: SaveV1) {
    try {
      const stat = await fs.lstat(this.active);
      if (!stat.isFile() || stat.isSymbolicLink()) return false;
      const current = decode(await fs.readFile(this.active));
      return current.generation === save.generation && current.checksum === save.checksum;
    } catch { return false; }
  }
  private async recoveryFolder() {
    const folder = path.join(this.directory, 'recovery');
    await fs.mkdir(folder, { recursive: true });
    if ((await fs.realpath(folder)) !== folder || !(await fs.lstat(folder)).isDirectory()) throw new Error('SAVE_DIRECTORY_LINK');
    return folder;
  }
  private async historyFolder() {
    const folder = path.join(this.directory, 'history');
    await fs.mkdir(folder, { recursive: true });
    if ((await fs.realpath(folder)) !== folder || !(await fs.lstat(folder)).isDirectory()) throw new Error('SAVE_DIRECTORY_LINK');
    return folder;
  }
  async listHistory() {
    const folder = await this.historyFolder(), entries: Array<{ id: string; savedAt: string; generation: number; sceneId: string; combat: boolean; round: number | null; currentId: string | null }> = [];
    for (const name of await fs.readdir(folder)) {
      if (!/^[0-9]+\.json$/.test(name)) continue;
      try { const filename = path.join(folder, name), stat = await fs.lstat(filename); if (!stat.isFile() || stat.isSymbolicLink() || (await fs.realpath(filename)) !== filename) continue; const save = decode(await fs.readFile(filename)); entries.push({ id: name, savedAt: save.savedAt, generation: save.generation, sceneId: save.payload.sceneId, combat: Boolean(save.payload.combat?.active), round: save.payload.combat?.active ? save.payload.combat.round : null, currentId: save.payload.combat?.active ? save.payload.combat.order[save.payload.combat.turnIndex] ?? null : null }); } catch { /* corrupt history is ignored; active and backup remain authoritative */ }
    }
    return entries.sort((a, b) => b.generation - a.generation).slice(0, 9);
  }
  async readHistory(id: string) {
    if (!/^[0-9]+\.json$/.test(id)) throw new Error('SAVE_HISTORY_ID');
    const filename = path.join(await this.historyFolder(), id), stat = await fs.lstat(filename);
    if (!stat.isFile() || stat.isSymbolicLink() || (await fs.realpath(filename)) !== filename) throw new Error('SAVE_HISTORY_ID');
    return fs.readFile(filename);
  }
  private async archiveHistory(save: SaveV1, bytes: Buffer) {
    const folder = await this.historyFolder(), filename = path.join(folder, `${save.generation}.json`);
    try { await fs.lstat(filename); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') await syncedFile(filename, bytes); else throw error; }
    const names = (await fs.readdir(folder)).filter(name => /^[0-9]+\.json$/.test(name)).sort((a, b) => Number(b.slice(0, -5)) - Number(a.slice(0, -5)));
    // El slot activo es el décimo punto recuperable; el historial conserva nueve anteriores.
    for (const stale of names.slice(9)) await fs.unlink(path.join(folder, stale));
  }
  async listEvidence() {
    this.evidenceFiles.clear();
    const candidates: Array<[string, string]> = [['active', this.active], ['backup', this.backup]];
    const folder = await this.recoveryFolder();
    try {
      for (const filename of await fs.readdir(folder)) if (/^[0-9a-f-]{36}-[a-z0-9-]+\.json$/i.test(filename)) candidates.push(['archive', path.join(folder, filename)]);
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    const result: Array<{ id: string; role: string; bytes: number }> = [];
    for (const [role, filename] of candidates) {
      try {
        const stat = await fs.lstat(filename);
        if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 4 * 1024 * 1024 || (await fs.realpath(filename)) !== filename) continue;
        const id = crypto.randomUUID(); this.evidenceFiles.set(id, filename);
        result.push({ id, role, bytes: stat.size });
      } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    }
    return result;
  }
  async readEvidence(id: string) {
    const filename = this.evidenceFiles.get(id);
    if (!filename || !/^[0-9a-f-]{36}$/i.test(id)) throw new Error('EVIDENCE_NOT_FOUND');
    const stat = await fs.lstat(filename);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 4 * 1024 * 1024 || (await fs.realpath(filename)) !== filename) throw new Error('EVIDENCE_NOT_FOUND');
    return fs.readFile(filename);
  }
  async archive(data: Buffer, role: string) {
    const folder = await this.recoveryFolder();
    const filename = path.join(folder, `${crypto.randomUUID()}-${role}.json`);
    await syncedFile(filename, data);
    return filename;
  }
  async checkpoint(save: SaveV1, allowInvalidActive = false): Promise<void> {
    if (!this.locked) throw new Error('SAVE_LOCK_REQUIRED');
    const bytes = Buffer.from(JSON.stringify(save), 'utf8');
    if (bytes.length > 4 * 1024 * 1024) throw new Error('SAVE_TOO_LARGE');
    const id = crypto.randomUUID();
    const pending = path.join(this.directory, `.active-${id}.tmp`), pendingBackup = path.join(this.directory, `.backup-${id}.tmp`);
    await syncedFile(pending, bytes);
    if (decode(await fs.readFile(pending)).checksum !== save.checksum) throw new Error('SAVE_READBACK');
    let former: Buffer | null = null;
    try { const stat = await fs.lstat(this.active); if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('SAVE_FILE_LINK'); former = await fs.readFile(this.active); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    if (former) {
      let recognized: SaveV1 | null = null;
      try { recognized = decode(former); } catch (error) { if (!allowInvalidActive) throw error; }
      if (recognized) {
        if (recognized.generation >= save.generation) throw new Error('SAVE_GENERATION');
        await syncedFile(pendingBackup, former);
        if (decode(await fs.readFile(pendingBackup)).checksum !== recognized.checksum) throw new Error('BACKUP_READBACK');
        await retry(() => fs.rename(pendingBackup, this.backup));
        await this.archiveHistory(recognized, former);
      }
    }
    try { await retry(() => fs.rename(pending, this.active)); }
    catch (error) {
      try { if (decode(await fs.readFile(this.active)).checksum === save.checksum) return; } catch { /* uncertain commit */ }
      throw error;
    }
    const committed = decode(await fs.readFile(this.active));
    if (committed.generation !== save.generation || committed.checksum !== save.checksum) throw new Error('SAVE_COMMIT_UNCERTAIN');
    try { const folder = await fs.open(this.directory, 'r'); try { await folder.sync(); } finally { await folder.close(); } }
    catch { /* Windows may not support directory fsync; file fsync and readback still happened. */ }
  }
  async archiveExisting() {
    for (const [name, filename] of [['active', this.active], ['backup', this.backup]] as const) {
      try { const stat = await fs.lstat(filename); if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('SAVE_FILE_LINK'); await this.archive(await fs.readFile(filename), name); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    }
  }
  async close() {
    if (!this.locked) return;
    const raw = await fs.readFile(this.lockPath, 'utf8');
    const lock = JSON.parse(raw) as { owner?: string };
    if (lock.owner !== this.owner) throw new Error('SAVE_LOCK_CHANGED');
    await retry(() => fs.unlink(this.lockPath)); this.locked = false;
  }
}
