import crypto from 'node:crypto';
import type { CampaignServerBundle } from '../campaign.js';
import { GameState } from '../game.js';
import { decode, seal } from './codec.js';
import type { SaveV1 } from './schema.js';
import { SaveStore } from './store.js';

type Preview = { token: string; epoch: string; expectedStateRevision: number; expiresAt: number; save: SaveV1; kind: 'file' | 'backup' | 'new' };
export type SaveStatus = { mode: 'ready' | 'saving' | 'error' | 'recovery' | 'incompatible' | 'restoring'; runtimeEpoch: string; stateRevision: number; savedStateRevision: number | null; generation: number | null; savedAt: string | null; dirty: boolean; errorCode: string | null };

export class PersistenceCoordinator {
  private generation = 0;
  private saveId: string = crypto.randomUUID();
  private savedStateRevision: number | null = null;
  private savedAt: string | null = null;
  private mode: SaveStatus['mode'] = 'ready';
  private errorCode: string | null = null;
  private chain: Promise<unknown> = Promise.resolve();
  private debounce?: NodeJS.Timeout;
  private maximum?: NodeJS.Timeout;
  private audioTimer?: NodeJS.Timeout;
  private previews = new Map<string, Preview>();
  private previewAttempts: number[] = [];
  private restoring = false;
  private lastSave: SaveV1 | null = null;
  private receipts = new Map<string, { at: number; fingerprint: string; result: Promise<unknown> }>();

  constructor(private store: SaveStore, private bundle: CampaignServerBundle, private current: () => GameState, private install: (candidate: GameState) => string, private epoch: () => string, private onStatus: (status: SaveStatus) => void) {}

  async open() {
    const initial = await this.store.open();
    if (initial.mode === 'recovery' || initial.mode === 'incompatible') { this.mode = initial.mode; this.errorCode = initial.errorCode; this.generation = initial.backup?.generation ?? 0; this.report(); return; }
    if (initial.candidates.length) {
      let selected: typeof initial.candidates[number] | null = null;
      let candidate: GameState | null = null;
      let migrated = false;
      let lastError: unknown = null;
      for (const option of initial.candidates) {
        try { const hydrated = this.candidate(option.save); candidate = hydrated.state; migrated = hydrated.migrated; selected = option; break; }
        catch (error) { lastError = error; }
      }
      if (!selected || !candidate) {
        this.mode = 'recovery'; this.errorCode = lastError instanceof Error ? lastError.message : 'SAVE_SEMANTICALLY_INVALID'; this.report(); return;
      }
      try {
        let installedSave = selected.save;
        const recoveredFromOlder = selected.role !== 'active' || selected !== initial.candidates[0];
        if (selected.legacyOriginal) await this.store.archive(selected.legacyOriginal, 'legacy-v0');
        if (recoveredFromOlder || selected.legacyOriginal || migrated) {
          const maximumGeneration = Math.max(...initial.candidates.map(option => option.save.generation));
          if (maximumGeneration >= Number.MAX_SAFE_INTEGER) throw new Error('SAVE_GENERATION_LIMIT');
          if (recoveredFromOlder) await this.store.archiveExisting();
          installedSave = seal({ ...selected.save, schemaVersion: 1, generation: maximumGeneration + 1, campaignVersion: this.bundle.public.version,
            ...(migrated ? { payload: candidate.captureDurable() } : {}), savedAt: new Date().toISOString() });
          await this.store.checkpoint(installedSave, recoveredFromOlder);
        }
        this.install(candidate);
        candidate.stateRevision = installedSave.stateRevision;
        this.generation = installedSave.generation; this.saveId = installedSave.saveId;
        this.savedStateRevision = installedSave.stateRevision; this.savedAt = installedSave.savedAt; this.lastSave = installedSave;
      } catch (error) { this.mode = 'recovery'; this.errorCode = error instanceof Error ? error.message : 'INCOMPATIBLE'; }
    } else this.markDirty();
    this.report();
    this.audioTimer = setInterval(() => {
      // Advancing playback alone is not a new game checkpoint. Otherwise an
      // idle table loses all ten useful saves after five minutes of music.
      if (this.mode === 'ready' && this.status().dirty) void this.saveNow().catch(() => {});
    }, 30_000);
  }
  private candidate(save: SaveV1) {
    if (save.campaignId !== this.bundle.public.campaignId || save.campaignStateVersion !== (this.bundle.campaignStateVersion ?? 1)) throw new Error('SAVE_CAMPAIGN_INCOMPATIBLE');
    const candidate = new GameState(this.bundle); const migrated = candidate.restoreDurable(save.payload);
    return { state: candidate, migrated };
  }
  status(): SaveStatus {
    const stateRevision = this.current().stateRevision;
    return { mode: this.mode, runtimeEpoch: this.epoch(), stateRevision, savedStateRevision: this.savedStateRevision, generation: this.generation || null, savedAt: this.savedAt,
      dirty: this.savedStateRevision === null || stateRevision > this.savedStateRevision, errorCode: this.errorCode };
  }
  private report() { this.onStatus(this.status()); }
  markDirty() {
    if (this.mode !== 'ready' || this.restoring) return;
    if (this.debounce) clearTimeout(this.debounce);
    this.debounce = setTimeout(() => { void this.saveNow().catch(() => {}); }, 1000);
    this.maximum ??= setTimeout(() => { void this.saveNow().catch(() => {}); }, 5000);
    this.report();
  }
  private clearScheduled() {
    if (this.debounce) clearTimeout(this.debounce);
    if (this.maximum) clearTimeout(this.maximum);
    this.debounce = undefined; this.maximum = undefined;
  }
  private makeSave(generation: number, now = Date.now()) {
    const state = this.current();
    return seal({ format: 'dungeons-save', schemaVersion: 1, campaignId: this.bundle.public.campaignId, campaignVersion: this.bundle.public.version,
      campaignStateVersion: this.bundle.campaignStateVersion ?? 1, saveId: this.saveId, generation, stateRevision: state.stateRevision, savedAt: new Date(now).toISOString(), payload: state.captureDurable(now) });
  }
  exportMemory() { return this.makeSave(Math.max(1, this.generation)); }
  private receipt<T>(requestId: string, fingerprint: string, action: () => Promise<T>): Promise<T> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) throw new Error('INVALID_REQUEST_ID');
    const now = Date.now();
    for (const [id, old] of this.receipts) if (now - old.at > 600_000) this.receipts.delete(id);
    const found = this.receipts.get(requestId);
    if (found) {
      if (found.fingerprint !== fingerprint) throw new Error('REQUEST_ID_REUSED');
      return found.result as Promise<T>;
    }
    if (this.receipts.size >= 1000) this.receipts.delete(this.receipts.keys().next().value!);
    const result = Promise.resolve().then(action);
    this.receipts.set(requestId, { at: now, fingerprint, result });
    return result;
  }
  async result(requestId: string) {
    const found = this.receipts.get(requestId);
    if (!found || Date.now() - found.at > 600_000) return { code: 'NOT_FOUND' };
    try { return await found.result; } catch (error) { return { code: error instanceof Error ? error.message : 'SAVE_IO' }; }
  }
  evidence() {
    if (this.mode !== 'recovery' && this.mode !== 'incompatible') throw new Error('EVIDENCE_NOT_AVAILABLE');
    return this.store.listEvidence();
  }
  evidenceFile(id: string) {
    if (this.mode !== 'recovery' && this.mode !== 'incompatible') throw new Error('EVIDENCE_NOT_AVAILABLE');
    return this.store.readEvidence(id);
  }
  private async checkpoint() {
    if (this.mode === 'recovery' || this.mode === 'incompatible' || this.restoring) throw new Error('SAVE_UNAVAILABLE');
    this.clearScheduled(); this.mode = 'saving'; this.report();
    let save: SaveV1 | null = null;
    const confirm = (committed: SaveV1) => {
      this.generation = committed.generation; this.savedStateRevision = committed.stateRevision; this.savedAt = committed.savedAt; this.lastSave = committed;
      this.mode = this.restoring ? 'restoring' : 'ready'; this.errorCode = null; this.report();
      if (!this.restoring && this.status().dirty) this.markDirty();
      return { code: 'SAVED', generation: committed.generation, stateRevision: committed.stateRevision, savedAt: committed.savedAt };
    };
    try {
      if (this.generation >= Number.MAX_SAFE_INTEGER) throw new Error('SAVE_GENERATION_LIMIT');
      save = this.makeSave(this.generation + 1);
      await this.store.checkpoint(save);
      return confirm(save);
    } catch (error) {
      if (save && await this.store.matchesCommitted(save)) return confirm(save);
      this.mode = this.restoring ? 'restoring' : 'error'; this.errorCode = error instanceof Error ? error.message : 'SAVE_IO'; this.report(); throw error;
    }
  }
  saveNow(requestId?: string, runtimeEpoch?: string): Promise<{ code: string; generation: number; stateRevision: number; savedAt: string }> {
    if (requestId) return this.receipt(requestId, `save:${runtimeEpoch}`, () => this.saveNow());
    const next = this.chain.catch(() => {}).then(() => this.checkpoint());
    this.chain = next; return next;
  }
  retry() { if (this.mode === 'error') this.mode = 'ready'; return this.saveNow(); }
  preview(input: string | Buffer, kind: Preview['kind'] = 'file') {
    const now = Date.now();
    this.previewAttempts = this.previewAttempts.filter(at => now - at < 60_000);
    if (this.previewAttempts.length >= 6) throw new Error('PREVIEW_RATE_LIMIT');
    this.previewAttempts.push(now);
    const save = decode(input); this.candidate(save);
    const token = crypto.randomUUID(), expectedStateRevision = this.current().stateRevision;
    this.previews.clear();
    this.previews.set(token, { token, epoch: this.epoch(), expectedStateRevision, expiresAt: now + 300_000, save, kind });
    return { token, expectedStateRevision, summary: { campaignId: save.campaignId, campaignVersion: save.campaignVersion, sceneId: save.payload.sceneId, savedAt: save.savedAt, characters: save.payload.characters.length, kind }, warnings: this.status().dirty ? ['Hay cambios sin guardar que se archivarán antes de reemplazar la mesa.'] : [] as string[] };
  }
  async previewBackup() { return this.preview(await this.store.readBackupBytes(), 'backup'); }
  async history() {
    const older = await this.store.listHistory();
    const active = this.lastSave ? [{ id: 'active', savedAt: this.lastSave.savedAt, generation: this.lastSave.generation, sceneId: this.lastSave.payload.sceneId,
      combat: Boolean(this.lastSave.payload.combat?.active), round: this.lastSave.payload.combat?.active ? this.lastSave.payload.combat.round : null,
      currentId: this.lastSave.payload.combat?.active ? this.lastSave.payload.combat.order[this.lastSave.payload.combat.turnIndex] ?? null : null }] : [];
    return [...active, ...older.filter(item => item.generation !== this.lastSave?.generation)].slice(0, 10);
  }
  async previewHistory(id: string) {
    if (id === 'active') {
      if (!this.lastSave) throw new Error('SAVE_HISTORY_ID');
      return this.preview(JSON.stringify(this.lastSave), 'file');
    }
    return this.preview(await this.store.readHistory(id), 'file');
  }
  previewNew() {
    const seed = new GameState(this.bundle);
    const save = seal({ format: 'dungeons-save', schemaVersion: 1, campaignId: this.bundle.public.campaignId, campaignVersion: this.bundle.public.version,
      campaignStateVersion: this.bundle.campaignStateVersion ?? 1, saveId: crypto.randomUUID(), generation: Math.max(1, this.generation), stateRevision: 0, savedAt: new Date().toISOString(), payload: seed.captureDurable() });
    return this.preview(JSON.stringify(save), 'new');
  }
  async restore(token: string, runtimeEpoch: string, expectedStateRevision: number, requestId?: string): Promise<{ code: string; runtimeEpoch: string; generation: number; stateRevision: number }> {
    if (requestId) return this.receipt(requestId, `restore:${token}:${runtimeEpoch}:${expectedStateRevision}`, () => this.restore(token, runtimeEpoch, expectedStateRevision));
    const preview = this.previews.get(token);
    if (!preview || preview.expiresAt < Date.now()) throw new Error('RESTORE_PREVIEW_EXPIRED');
    if (preview.epoch !== runtimeEpoch || runtimeEpoch !== this.epoch()) throw new Error('STALE_RUNTIME');
    if (preview.expectedStateRevision !== expectedStateRevision || expectedStateRevision !== this.current().stateRevision) throw new Error('STALE_STATE');
    if (this.restoring) throw new Error('BUSY');
    // A pending autosave from the state being replaced must not run after the
    // restore commits and silently advance the restored generation.
    this.clearScheduled();
    this.restoring = true; this.mode = 'restoring'; this.report();
    let committed = false;
    try {
      await this.chain.catch(() => {});
      if (runtimeEpoch !== this.epoch() || expectedStateRevision !== this.current().stateRevision) throw new Error('STALE_STATE');
      const candidate = this.candidate(preview.save).state;
      const former = this.exportMemory();
      await this.store.archive(Buffer.from(JSON.stringify(former)), 'before-restore');
      if (this.mode === 'restoring') await this.store.archiveExisting();
      if (this.generation >= Number.MAX_SAFE_INTEGER) throw new Error('SAVE_GENERATION_LIMIT');
      const next = seal({ ...preview.save, saveId: preview.kind === 'new' ? crypto.randomUUID() : preview.save.saveId,
        campaignVersion: this.bundle.public.version, generation: this.generation + 1, savedAt: new Date().toISOString(), stateRevision: preview.save.stateRevision });
      try { await this.store.checkpoint(next, true); }
      catch (error) { if (!await this.store.matchesCommitted(next)) throw error; }
      committed = true;
      this.generation = next.generation; this.saveId = next.saveId; this.savedStateRevision = next.stateRevision; this.savedAt = next.savedAt; this.lastSave = next;
      candidate.stateRevision = next.stateRevision;
      const newEpoch = this.install(candidate);
      this.previews.clear(); this.mode = 'ready'; this.errorCode = null; this.report();
      return { code: 'RESTORED', runtimeEpoch: newEpoch, generation: next.generation, stateRevision: next.stateRevision };
    } catch (error) { this.mode = committed ? 'recovery' : 'error'; this.errorCode = error instanceof Error ? error.message : 'RESTORE_IO'; this.report(); throw error; }
    finally { this.restoring = false; }
  }
  async close() {
    this.clearScheduled(); if (this.audioTimer) clearInterval(this.audioTimer);
    if (this.mode === 'ready' && this.status().dirty) await this.saveNow();
    await this.chain.catch(() => {}); await this.store.close();
  }
}
