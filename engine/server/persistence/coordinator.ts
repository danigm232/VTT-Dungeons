import crypto from 'node:crypto';
import type { CampaignServerBundle } from '../campaign.js';
import { GameState } from '../game.js';
import { canonical, decode, seal } from './codec.js';
import type { SaveV1 } from './schema.js';
import { SaveStore } from './store.js';

type Preview = { token: string; epoch: string; expectedStateRevision: number; expiresAt: number; save: SaveV1; original: Buffer; legacy: boolean; kind: 'file' | 'new' };
type SaveKind = 'automatic' | 'manual';
const AUTOSAVE_IDLE_MS = 45_000, AUTOSAVE_MAX_WAIT_MS = 180_000, CLOCK_CHECKPOINT_MS = 300_000;
export type SaveStatus = { mode: 'ready' | 'saving' | 'error' | 'recovery' | 'incompatible' | 'restoring'; runtimeEpoch: string; stateRevision: number; savedStateRevision: number | null; generation: number | null; savedAt: string | null; dirty: boolean; errorCode: string | null; recoveryNotice: string | null };

export class PersistenceCoordinator {
  private generation = 0;
  private saveId: string = crypto.randomUUID();
  private savedStateRevision: number | null = null;
  private savedAt: string | null = null;
  private mode: SaveStatus['mode'] = 'ready';
  private errorCode: string | null = null;
  private recoveryNotice: string | null = null;
  private chain: Promise<unknown> = Promise.resolve();
  private debounce?: NodeJS.Timeout;
  private maximum?: NodeJS.Timeout;
  private previews = new Map<string, Preview>();
  private previewAttempts: number[] = [];
  private restoring = false;
  private lastSave: SaveV1 | null = null;
  private lastSaveWasTemporal = false;
  private lastAttemptKind: SaveKind = 'automatic';
  private receipts = new Map<string, { at: number; fingerprint: string; result: Promise<unknown> }>();
  private closing = false;
  private closed = false;
  private closeOperation: Promise<void> | null = null;
  get isClosing() { return this.closing || this.closed; }

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
        if (option === initial.candidates[0] && option.save.campaignId === this.bundle.public.campaignId
          && option.save.campaignStateVersion > (this.bundle.campaignStateVersion ?? 1)) {
          this.mode = 'incompatible'; this.errorCode = 'SAVE_CAMPAIGN_INCOMPATIBLE'; this.report(); return;
        }
        try { const hydrated = this.candidate(option.save); candidate = hydrated.state; migrated = hydrated.migrated; selected = option; break; }
        catch (error) {
          if (option === initial.candidates[0] && error instanceof Error && error.message === 'SAVE_GEOMETRY_INCOMPATIBLE') {
            this.mode = 'incompatible'; this.errorCode = error.message; this.report(); return;
          }
          lastError = error;
        }
      }
      if (!selected || !candidate) {
        this.mode = 'recovery'; this.errorCode = lastError instanceof Error ? lastError.message : 'SAVE_SEMANTICALLY_INVALID'; this.report(); return;
      }
      try {
        let installedSave = selected.save;
        const recoveredFromOlder = selected.role !== 'active' || selected !== initial.candidates[0];
        if (recoveredFromOlder) this.recoveryNotice = `Se recuperó una copia ${selected.role === 'history' ? 'del historial' : 'de respaldo'} (generación ${selected.save.generation}). Revisa el avance de la partida antes de continuar; los archivos anteriores se conservaron en recuperación.`;
        if (selected.legacyOriginal) await this.store.archive(selected.legacyOriginal, 'legacy-v0');
        if (recoveredFromOlder || selected.legacyOriginal || migrated) {
          const maximumGeneration = Math.max(...initial.candidates.map(option => option.save.generation));
          if (maximumGeneration >= Number.MAX_SAFE_INTEGER) throw new Error('SAVE_GENERATION_LIMIT');
          if (recoveredFromOlder || migrated) await this.store.archiveExisting();
          if (selected.role === 'history') await this.store.archive(await this.store.readHistory(selected.id), 'history-source');
          installedSave = seal({ ...selected.save, schemaVersion: 1, saveKind: selected.save.saveKind ?? 'manual', generation: maximumGeneration + 1, campaignVersion: this.bundle.public.version,
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
  }
  private candidate(save: SaveV1) {
    if (save.campaignId !== this.bundle.public.campaignId || save.campaignStateVersion !== (this.bundle.campaignStateVersion ?? 1)) throw new Error('SAVE_CAMPAIGN_INCOMPATIBLE');
    const candidate = new GameState(this.bundle); const migrated = candidate.restoreDurable(save.payload);
    return { state: candidate, migrated: migrated || save.campaignVersion !== this.bundle.public.version };
  }
  status(): SaveStatus {
    const stateRevision = this.current().stateRevision;
    return { mode: this.mode, runtimeEpoch: this.epoch(), stateRevision, savedStateRevision: this.savedStateRevision, generation: this.generation || null, savedAt: this.savedAt,
      dirty: this.savedStateRevision === null || stateRevision > this.savedStateRevision, errorCode: this.errorCode, recoveryNotice: this.recoveryNotice };
  }
  private report() { this.onStatus(this.status()); }
  markDirty() {
    if (this.mode !== 'ready' || this.restoring || this.isClosing || !this.status().dirty) return;
    if (this.debounce) clearTimeout(this.debounce);
    this.debounce = setTimeout(() => { void this.saveAutomaticNow().catch(() => {}); }, AUTOSAVE_IDLE_MS);
    this.maximum ??= setTimeout(() => { void this.saveAutomaticNow().catch(() => {}); }, AUTOSAVE_MAX_WAIT_MS);
    this.report();
  }
  private clearScheduled() {
    if (this.debounce) clearTimeout(this.debounce);
    if (this.maximum) clearTimeout(this.maximum);
    this.debounce = undefined; this.maximum = undefined;
  }
  private makeSave(generation: number, saveKind: SaveKind = 'automatic', now = Date.now()) {
    const state = this.current();
    return seal({ format: 'dungeons-save', schemaVersion: 1, campaignId: this.bundle.public.campaignId, campaignVersion: this.bundle.public.version,
      campaignStateVersion: this.bundle.campaignStateVersion ?? 1, saveId: this.saveId, generation, stateRevision: state.stateRevision, savedAt: new Date(now).toISOString(), saveKind, payload: state.captureDurable(now) });
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
  private async checkpoint(saveKind: SaveKind, temporal = false) {
    if (this.mode === 'recovery' || this.mode === 'incompatible' || this.restoring) throw new Error('SAVE_UNAVAILABLE');
    const timeOnly = temporal && !this.status().dirty;
    this.clearScheduled(); this.mode = 'saving'; this.report();
    let save: SaveV1 | null = null;
    const confirm = (committed: SaveV1) => {
      this.generation = committed.generation; this.savedStateRevision = committed.stateRevision; this.savedAt = committed.savedAt; this.lastSave = committed;
      this.lastSaveWasTemporal = timeOnly;
      this.mode = this.restoring ? 'restoring' : 'ready'; this.errorCode = null; this.report();
      if (!this.restoring && !this.isClosing && this.status().dirty) this.markDirty();
      return { code: 'SAVED', generation: committed.generation, stateRevision: committed.stateRevision, savedAt: committed.savedAt };
    };
    try {
      if (this.generation >= Number.MAX_SAFE_INTEGER) throw new Error('SAVE_GENERATION_LIMIT');
      this.lastAttemptKind = saveKind;
      save = this.makeSave(this.generation + 1, saveKind);
      await this.store.checkpoint(save, false, !timeOnly || !this.lastSaveWasTemporal);
      return confirm(save);
    } catch (error) {
      if (save && await this.store.matchesCommitted(save)) return confirm(save);
      this.mode = this.restoring ? 'restoring' : 'error'; this.errorCode = error instanceof Error ? error.message : 'SAVE_IO'; this.report(); throw error;
    }
  }
  saveNow(requestId?: string, runtimeEpoch?: string): Promise<{ code: string; generation: number; stateRevision: number; savedAt: string }> {
    if (this.isClosing) return Promise.reject(new Error('SAVE_CLOSING'));
    if (requestId) return this.receipt(requestId, `save:${runtimeEpoch}`, () => this.saveNow());
    return this.queueCheckpoint('manual');
  }
  saveAutomaticNow() {
    if (this.isClosing) return Promise.reject(new Error('SAVE_CLOSING'));
    return this.queueCheckpoint('automatic');
  }
  saveTime() {
    if (this.mode !== 'ready' || this.restoring || this.isClosing || this.status().dirty || this.savedAt && Date.now() - Date.parse(this.savedAt) < CLOCK_CHECKPOINT_MS) return Promise.resolve();
    return this.queueCheckpoint('automatic', true);
  }
  private queueCheckpoint(saveKind: SaveKind, temporal = false) {
    const next = this.chain.catch(() => {}).then(() => {
      // Several scene/turn events may arrive before disk IO finishes. Recheck
      // here so one revision is not committed repeatedly by queued autosaves.
      const dirty = this.status().dirty;
      if (saveKind === 'automatic' && this.mode === 'ready' && !this.isClosing && (!temporal && !dirty || temporal && (dirty || this.savedAt && Date.now() - Date.parse(this.savedAt) < CLOCK_CHECKPOINT_MS))) {
        return { code: 'UNCHANGED', generation: this.generation, stateRevision: this.current().stateRevision, savedAt: this.savedAt ?? new Date().toISOString() };
      }
      return this.checkpoint(saveKind, temporal);
    });
    this.chain = next; return next;
  }
  retry() { if (this.isClosing) return Promise.reject(new Error('SAVE_CLOSING')); if (this.mode === 'error') this.mode = 'ready'; return this.queueCheckpoint(this.lastAttemptKind); }
  preview(input: string | Buffer, kind: Preview['kind'] = 'file') {
    if (this.isClosing) throw new Error('SAVE_CLOSING');
    const now = Date.now();
    this.previewAttempts = this.previewAttempts.filter(at => now - at < 60_000);
    if (this.previewAttempts.length >= 6) throw new Error('PREVIEW_RATE_LIMIT');
    this.previewAttempts.push(now);
    const save = decode(input), candidate = this.candidate(save);
    const original = Buffer.from(input), legacy = JSON.parse(original.toString('utf8')).schemaVersion === 0;
    const token = crypto.randomUUID(), expectedStateRevision = this.current().stateRevision;
    this.previews.clear();
    this.previews.set(token, { token, epoch: this.epoch(), expectedStateRevision, expiresAt: now + 300_000, save, original, legacy, kind });
    const warnings: string[] = [];
    if (this.status().dirty) warnings.push('Hay cambios sin guardar que se archivarán antes de reemplazar la mesa.');
    if (candidate.migrated || legacy) warnings.push('Esta copia se adaptará a la versión actual del VTT. Se conservará una copia anterior a la adaptación.');
    return { token, expectedStateRevision, summary: { campaignId: save.campaignId, campaignVersion: save.campaignVersion, sceneId: candidate.state.sceneId, savedAt: save.savedAt, characters: save.payload.characters.length, kind }, warnings };
  }
  async history() {
    const older = await this.store.listHistory();
    const active = this.lastSave ? [{ id: 'active', savedAt: this.lastSave.savedAt, generation: this.lastSave.generation, saveKind: this.lastSave.saveKind ?? 'manual', sceneId: this.lastSave.payload.sceneId,
      combat: Boolean(this.lastSave.payload.combat?.active), round: this.lastSave.payload.combat?.active ? this.lastSave.payload.combat.round : null,
      currentId: this.lastSave.payload.combat?.active ? this.lastSave.payload.combat.order[this.lastSave.payload.combat.turnIndex] ?? null : null }] : [];
    return [...active, ...older.filter(item => item.generation !== this.lastSave?.generation)].sort((a, b) => b.generation - a.generation).slice(0, 5);
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
    if (this.isClosing) throw new Error('SAVE_CLOSING');
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
      const hydrated = this.candidate(preview.save), candidate = hydrated.state;
      const former = this.exportMemory();
      await this.store.archive(Buffer.from(JSON.stringify(former)), 'before-restore');
      if (hydrated.migrated || preview.legacy) await this.store.archive(preview.original, 'before-migration');
      if (this.mode === 'restoring') await this.store.archiveExisting();
      if (this.generation >= Number.MAX_SAFE_INTEGER) throw new Error('SAVE_GENERATION_LIMIT');
      const next = seal({ ...preview.save, saveKind: 'manual', saveId: preview.kind === 'new' ? crypto.randomUUID() : preview.save.saveId,
        campaignVersion: this.bundle.public.version, payload: candidate.captureDurable(), generation: this.generation + 1, savedAt: new Date().toISOString(), stateRevision: preview.save.stateRevision });
      try { await this.store.checkpoint(next, true); }
      catch (error) { if (!await this.store.matchesCommitted(next)) throw error; }
      committed = true;
      this.generation = next.generation; this.saveId = next.saveId; this.savedStateRevision = next.stateRevision; this.savedAt = next.savedAt; this.lastSave = next;
      this.lastSaveWasTemporal = false;
      candidate.stateRevision = next.stateRevision;
      const newEpoch = this.install(candidate);
      this.previews.clear(); this.mode = 'ready'; this.errorCode = null; this.recoveryNotice = null; this.report();
      return { code: 'RESTORED', runtimeEpoch: newEpoch, generation: next.generation, stateRevision: next.stateRevision };
    } catch (error) { this.mode = committed ? 'recovery' : 'error'; this.errorCode = error instanceof Error ? error.message : 'RESTORE_IO'; this.report(); throw error; }
    finally { this.restoring = false; }
  }
  async close() {
    if (this.closed) return;
    if (this.closeOperation) return this.closeOperation;
    if (this.restoring) throw new Error('BUSY');
    this.closing = true; this.clearScheduled();
    this.closeOperation = (async () => {
      try {
        await this.chain.catch(() => {});
        if (['ready', 'saving', 'error'].includes(this.mode)) {
          // The clock, climate and playback may advance between revisions.
          // Flush them as well, and retry a prior disk error before exiting.
          const temporalChanges = this.lastSave && canonical(this.current().captureDurable()) !== canonical(this.lastSave.payload);
          if (this.status().dirty || this.mode === 'error' || temporalChanges) await this.queueCheckpoint(this.mode === 'error' ? this.lastAttemptKind : 'automatic', true);
        }
        await this.store.close();
        this.closed = true;
      } catch (error) {
        this.closing = false; this.closeOperation = null;
        this.errorCode = error instanceof Error ? error.message : 'SAVE_IO';
        if (!['recovery','incompatible'].includes(this.mode)) this.mode = 'error';
        this.report(); throw error;
      }
    })();
    return this.closeOperation;
  }
}
