import { afterEach, describe, expect, it, vi } from 'vitest';
import crypto from 'node:crypto';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { stormwreckBundle } from '../../../campaigns/stormwreck-isle/server';
import { wreckCellFromLocal } from '../../../campaigns/stormwreck-isle/public/wreck-runtime';
import { GameState } from '../game';
import { checksum, decode, seal } from './codec';
import { SaveStore } from './store';
import { PersistenceCoordinator } from './coordinator';

const temporary: string[] = [];
afterEach(async () => {
  for (const directory of temporary.splice(0)) if (path.resolve(directory).startsWith(path.resolve(os.tmpdir()) + path.sep)) await fs.rm(directory, { recursive: true, force: true });
});
const saveOf = (state: GameState, generation = 1) => seal({ format: 'dungeons-save', schemaVersion: 1, campaignId: stormwreckBundle.public.campaignId,
  campaignVersion: stormwreckBundle.public.version, campaignStateVersion: 1, saveId: crypto.randomUUID(), generation,
  stateRevision: state.stateRevision, savedAt: new Date().toISOString(), payload: state.captureDurable() });

describe('Alpha 0.3 durable state', () => {
  it('round-trips objects from all scenes, a destroyed locked door, actor on debris and five audio channels', () => {
    const state = new GameState(stormwreckBundle); state.changeScene('wreck-objects');
    const now = Date.now(), payload = state.captureDurable(now);
    const deck = payload.scenes.find(x => x.sceneId === 'wreck-ship')!;
    const wheel = deck.objects.find(x => x.id === 'wheel')!;
    if (wheel.kind !== 'wheel') throw new Error('wheel fixture missing');
    Object.assign(wheel, { attachment: 'detached', state: 'caught', structure: 'damaged', rotation: 90, cell: wreckCellFromLocal(4, 8) });
    const objects = payload.scenes.find(x => x.sceneId === 'wreck-objects')!;
    const door = objects.objects.find(x => x.id === 'practice-door')!;
    if (door.kind !== 'door') throw new Error('door fixture missing');
    door.state = 'locked'; door.structure = 'destroyed';
    const crate = objects.objects.find(x => x.id === 'practice-crate')!;
    crate.structure = 'damaged';
    payload.characters.find(x => x.id === 'mike')!.cell = { ...door.cell };
    payload.characters.find(x => x.id === 'mike')!.hp = 2;
    payload.characters.find(x => x.id === 'mike')!.inventory.push('Carta de la mesa');
    if (!payload.creature) throw new Error('creature fixture missing');
    payload.creature.sceneId = 'wreck-objects'; payload.creature.surfaceId = 'objects-deck'; payload.creature.cell = { ...crate.cell }; payload.creature.visible = false;
    payload.camera = { mode: 'follow', focusId: 'mike' }; payload.environment.storm = true;
    payload.audio.music = { playing: true, volume: 0.7, offsetSeconds: 34, loop: true, rate: 1, repeats: 1 };
    for (const channel of ['ocean', 'wind', 'wood', 'storm'] as const) payload.audio.layers[channel] = { playing: true, volume: 0.3, offsetSeconds: 12, loop: true, rate: 1, repeats: 1 };
    const restored = new GameState(stormwreckBundle); restored.restoreDurable(payload, now);
    expect(restored.captureDurable(now)).toEqual(payload);
    expect(restored.publicSnapshot().props.find(x => x.id === 'practice-door')).toMatchObject({ state: 'open', structure: 'destroyed' });
    expect(restored.dmState().objects.find(x => x.id === 'practice-door')).toMatchObject({ state: 'locked', structure: 'destroyed' });
    expect(restored.publicSnapshot().entities.some(x => x.kind === 'creature')).toBe(false);
  });
  it('round-trips private state from every scene while clearing connections, steps and undo', () => {
    const state = new GameState(stormwreckBundle);
    state.changeScene('wreck-objects');
    const door = state.dmState().objects.find(x => x.id === 'practice-door')!;
    const opened = state.applyObjectCommand({ type: 'object:door', commandId: crypto.randomUUID(), sceneEpoch: state.sceneEpoch,
      objectRevision: state.objectRevision, objectId: door.id, state: 'closed' });
    expect(opened.ok).toBe(true);
    const mike = state.characters.get('mike')!; mike.hp = 4; mike.inventory.push('Nota privada de ensayo'); mike.sessionToken = 'private'; mike.socketId = 'socket';
    state.audio.music.playing = true; state.audio.music.startedAt = Date.now() - 1000;
    const save = saveOf(state), decoded = decode(JSON.stringify(save));
    const restored = new GameState(stormwreckBundle); restored.restoreDurable(decoded.payload);
    expect(restored.captureDurable().sceneId).toBe('wreck-objects');
    expect(restored.characters.get('mike')!.hp).toBe(4);
    expect(restored.characters.get('mike')!.inventory).toContain('Nota privada de ensayo');
    expect(restored.characters.get('mike')!.sessionToken).toBeNull();
    expect(restored.characters.get('mike')!.step).toBeNull();
    expect(restored.dmState().undo.canUndo).toBe(false);
    expect(restored.dmState().objects.find(x => x.id === 'practice-door')?.state).toBe('closed');
    expect(restored.creature?.visible).toBe(false);
    expect(restored.audio.music.playing).toBe(true);
  });
  it('opens an older Stormwreck save after scenes were added without changing its existing progress', () => {
    const state = new GameState(stormwreckBundle), payload = state.captureDurable();
    payload.characters.find(character => character.id === 'mike')!.hp = 4;
    const olderSceneIds = new Set(['wreck-approach', 'wreck-ship', 'wreck-objects']);
    const olderScenes = payload.scenes.filter(scene => olderSceneIds.has(scene.sceneId));
    payload.scenes = olderScenes;
    const restored = new GameState(stormwreckBundle); restored.restoreDurable(payload);
    const migrated = restored.captureDurable();
    expect(restored.characters.get('mike')!.hp).toBe(4);
    expect(migrated.scenes.map(scene => scene.sceneId).sort()).toEqual([...state.campaign.scenes.keys()].sort());
    for (const olderScene of olderScenes) expect(migrated.scenes.find(scene => scene.sceneId === olderScene.sceneId)?.objects).toEqual(olderScene.objects);
  });
  it('rejects duplicate keys and corrupted checksums before hydration', () => {
    const save = saveOf(new GameState(stormwreckBundle));
    const raw = JSON.stringify(save);
    expect(() => decode(raw.replace('"campaignId":', '"campaignId":"other","campaignId":'))).toThrow('JSON_KEY');
    expect(() => decode(raw.replace('"hp":', '"hp":99,"hp":'))).toThrow('JSON_KEY');
    expect(() => decode(raw.replace('"storm":false', '"storm":true'))).toThrow('BAD_CHECKSUM');
    expect(checksum(save)).toBe(save.checksum);
  });
  it('allows a concealed creature under a solid object, but rejects revealing it there', () => {
    const state = new GameState(stormwreckBundle); state.changeScene('wreck-objects');
    const payload = state.captureDurable();
    const door = payload.scenes.find(x => x.sceneId === 'wreck-objects')!.objects.find(x => x.id === 'practice-door')!;
    if (!payload.creature) throw new Error('fixture creature missing');
    payload.creature.sceneId = payload.sceneId; payload.creature.surfaceId = state.currentScene().surfaceId;
    payload.creature.cell = { ...door.cell }; payload.creature.visible = false;
    expect(() => new GameState(stormwreckBundle).restoreDurable(payload)).not.toThrow();
    payload.creature.visible = true;
    expect(() => new GameState(stormwreckBundle).restoreDurable(payload)).toThrow('SAVE_CREATURE_BLOCKED');
  });
  it('keeps a valid backup when the active checkpoint becomes corrupt', async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'dungeons-alpha03-store-')); temporary.push(directory);
    const store = new SaveStore(path.join(directory, 'campaign'));
    expect((await store.open()).mode).toBe('new');
    const state = new GameState(stormwreckBundle), first = saveOf(state, 1);
    await store.checkpoint(first);
    state.characters.get('mike')!.hp = 4;
    const second = seal({ ...saveOf(state, 2), saveId: first.saveId });
    await store.checkpoint(second);
    await store.close();
    expect(decode(await fs.readFile(store.backup)).checksum).toBe(first.checksum);
    await fs.writeFile(store.active, '{broken', 'utf8');
    const restarted = new SaveStore(path.join(directory, 'campaign'));
    const initial = await restarted.open();
    expect(initial.mode).toBe('ready'); expect(initial.backup?.checksum).toBe(first.checksum);
    expect(initial.candidates[0]).toMatchObject({ role: 'backup', save: { checksum: first.checksum } });
    await restarted.close();
  });
  it('restores only after preview, preserves the former memory and deduplicates a request', async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'dungeons-alpha03-restore-')); temporary.push(directory);
    const store = new SaveStore(path.join(directory, 'campaign'));
    let state = new GameState(stormwreckBundle);
    const coordinator = new PersistenceCoordinator(store, stormwreckBundle, () => state, candidate => {
      state = candidate; state.runtimeEpoch = crypto.randomUUID(); return state.runtimeEpoch;
    }, () => state.runtimeEpoch, () => {});
    await coordinator.open();
    const seed = saveOf(state);
    const preview = coordinator.preview(JSON.stringify(seed));
    state.characters.get('mike')!.hp = 3; state.stateRevision++;
    await expect(coordinator.restore(preview.token, preview.expectedStateRevision.toString(), preview.expectedStateRevision)).rejects.toThrow('STALE_RUNTIME');
    await expect(coordinator.restore(preview.token, state.runtimeEpoch, preview.expectedStateRevision)).rejects.toThrow('STALE_STATE');
    const fresh = coordinator.preview(JSON.stringify(seed));
    const formerEpoch = state.runtimeEpoch, requestId = crypto.randomUUID();
    const receipt = await coordinator.restore(fresh.token, formerEpoch, fresh.expectedStateRevision, requestId);
    expect(receipt.code).toBe('RESTORED'); expect(receipt.runtimeEpoch).not.toBe(formerEpoch);
    expect(state.characters.get('mike')!.hp).not.toBe(3);
    expect((await coordinator.restore(fresh.token, formerEpoch, fresh.expectedStateRevision, requestId)).generation).toBe(receipt.generation);
    await expect(coordinator.restore(fresh.token, formerEpoch, fresh.expectedStateRevision, crypto.randomUUID())).rejects.toThrow();
    const recovery = await fs.readdir(path.join(store.directory, 'recovery'));
    expect(recovery.some(name => name.endsWith('-before-restore.json'))).toBe(true);
    expect((await coordinator.result(requestId)).code).toBe('RESTORED');
    await coordinator.close();
    const restarted = new SaveStore(path.join(directory, 'campaign'));
    expect((await restarted.open()).save?.generation).toBe(receipt.generation);
    await restarted.close();
  });
  it('cancels a pending seed autosave so it cannot overwrite the restored generation', async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'dungeons-alpha03-restore-autosave-')); temporary.push(directory);
    const store = new SaveStore(path.join(directory, 'campaign'));
    let state = new GameState(stormwreckBundle);
    const coordinator = new PersistenceCoordinator(store, stormwreckBundle, () => state, candidate => {
      state = candidate; state.runtimeEpoch = crypto.randomUUID(); return state.runtimeEpoch;
    }, () => state.runtimeEpoch, () => {});
    vi.useFakeTimers();
    try {
      await coordinator.open();
      const seed = saveOf(state), preview = coordinator.preview(JSON.stringify(seed));
      const receipt = await coordinator.restore(preview.token, state.runtimeEpoch, preview.expectedStateRevision);
      await vi.advanceTimersByTimeAsync(6_000);
      expect(coordinator.status().generation).toBe(receipt.generation);
      await coordinator.close();
    } finally { vi.useRealTimers(); }
    const restarted = new SaveStore(path.join(directory, 'campaign'));
    expect((await restarted.open()).save?.generation).toBe(1);
    await restarted.close();
  });
  it('archives legacy format 0 before migrating the committed slot to format 1', async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'dungeons-alpha03-legacy-')); temporary.push(directory);
    const store = new SaveStore(path.join(directory, 'campaign'));
    await fs.mkdir(store.directory);
    const seed = saveOf(new GameState(stormwreckBundle));
    const { camera: _camera, ...withoutCamera } = seed.payload;
    const old = { ...seed, schemaVersion: 0, payload: withoutCamera, checksum: '' };
    old.checksum = checksum(old);
    await fs.writeFile(store.active, JSON.stringify(old));
    let state = new GameState(stormwreckBundle);
    const coordinator = new PersistenceCoordinator(store, stormwreckBundle, () => state, candidate => {
      state = candidate; state.runtimeEpoch = crypto.randomUUID(); return state.runtimeEpoch;
    }, () => state.runtimeEpoch, () => {});
    await coordinator.open();
    expect(coordinator.status().mode).toBe('ready');
    expect(coordinator.status().generation).toBe(seed.generation + 1);
    expect(decode(await fs.readFile(store.active)).schemaVersion).toBe(1);
    expect(state.camera).toEqual({ mode: 'fixed', focusId: null });
    const evidence = await fs.readdir(path.join(store.directory, 'recovery'));
    const original = await fs.readFile(path.join(store.directory, 'recovery', evidence.find(x => x.endsWith('-legacy-v0.json'))!));
    expect(JSON.parse(original.toString('utf8')).schemaVersion).toBe(0);
    await coordinator.close();
  });
  it('excludes a second writer on the same slot and reopens after the owner closes', async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'dungeons-alpha03-lock-')); temporary.push(directory);
    const first = new SaveStore(path.join(directory, 'partida con espacios'));
    const second = new SaveStore(first.directory);
    expect((await first.open()).mode).toBe('new');
    await expect(second.open()).rejects.toMatchObject({ code: 'SAVE_LOCK_ACTIVE' });
    await first.close();
    expect((await second.open()).mode).toBe('new');
    await second.close();
  });
  it('archives a verified stale writer lock, but never an active one', async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'dungeons-alpha03-stale-lock-')); temporary.push(directory);
    const store = new SaveStore(path.join(directory, 'slot')); await fs.mkdir(store.directory);
    await fs.writeFile(store.lockPath, JSON.stringify({ pid: 2_147_483_647, owner: crypto.randomUUID(), createdAt: new Date().toISOString() }));
    expect((await store.open()).mode).toBe('new');
    expect((await fs.readdir(path.join(store.directory, 'recovery'))).some(name => name.endsWith('-writer.lock.json'))).toBe(true);
    await store.close();
  });
  it('archives a lock when Windows has recycled its still-live PID', async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'dungeons-alpha03-reused-pid-')); temporary.push(directory);
    const store = new SaveStore(path.join(directory, 'slot')); await fs.mkdir(store.directory);
    const oldLock = { pid: process.pid, owner: crypto.randomUUID(), createdAt: new Date(Date.now() - 86_400_000).toISOString(), processStartedAt: new Date(Date.now() + 60_000).toISOString() };
    await fs.writeFile(store.lockPath, JSON.stringify(oldLock));
    expect((await store.open()).mode).toBe('new');
    const archived = (await fs.readdir(path.join(store.directory, 'recovery'))).find(name => name.endsWith('-writer.lock.json'))!;
    expect(JSON.parse(await fs.readFile(path.join(store.directory, 'recovery', archived), 'utf8'))).toEqual(oldLock);
    await store.close();
  });
  it('does not silently seed a future save, a lone temporary file or two corrupt checkpoints', async () => {
    for (const kind of ['future', 'temporary', 'both'] as const) {
      const directory = await fs.mkdtemp(path.join(os.tmpdir(), `dungeons-alpha03-${kind}-`)); temporary.push(directory);
      const store = new SaveStore(path.join(directory, 'slot')); await fs.mkdir(store.directory);
      if (kind === 'future') {
        const save = saveOf(new GameState(stormwreckBundle));
        await fs.writeFile(store.active, JSON.stringify({ ...save, schemaVersion: 99 }));
      } else if (kind === 'temporary') await fs.writeFile(path.join(store.directory, '.active-incomplete.tmp'), '{partial');
      else { await fs.writeFile(store.active, '{broken'); await fs.writeFile(store.backup, '{also broken'); }
      const initial = await store.open();
      expect(initial.mode).toBe(kind === 'future' ? 'incompatible' : 'recovery'); expect(initial.save).toBeNull();
      const evidence = await store.listEvidence();
      if (kind === 'both') expect(evidence.map(item => item.role)).toEqual(['active', 'backup']);
      await store.close();
    }
  });
  it('loads the newest semantically valid candidate and recommits it without overwriting evidence', async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'dungeons-alpha03-fallback-')); temporary.push(directory);
    const saveDirectory = path.join(directory, 'slot');
    const writer = new SaveStore(saveDirectory); await writer.open();
    const validState = new GameState(stormwreckBundle), valid = saveOf(validState, 1); await writer.checkpoint(valid);
    const invalidPayload = structuredClone(valid.payload); invalidPayload.characters[0]!.sceneId = 'missing-scene';
    const invalid = seal({ ...valid, generation: 2, savedAt: new Date(Date.now() + 1_000).toISOString(), payload: invalidPayload });
    await writer.checkpoint(invalid); await writer.close();
    let state = new GameState(stormwreckBundle);
    const store = new SaveStore(saveDirectory);
    const coordinator = new PersistenceCoordinator(store, stormwreckBundle, () => state, candidate => { state = candidate; state.runtimeEpoch = crypto.randomUUID(); return state.runtimeEpoch; }, () => state.runtimeEpoch, () => {});
    await coordinator.open();
    expect(coordinator.status()).toMatchObject({ mode: 'ready', generation: 3 });
    expect(state.characters.get('mike')!.cell).toEqual(valid.payload.characters.find(character => character.id === 'mike')!.cell);
    expect((await fs.readdir(path.join(saveDirectory, 'recovery'))).some(name => name.endsWith('-active.json'))).toBe(true);
    expect(decode(await fs.readFile(store.active)).generation).toBe(3);
    await coordinator.close();
  });
  it('keeps exactly ten recoverable points including the active save', async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'dungeons-alpha03-rotation-')); temporary.push(directory);
    const store = new SaveStore(path.join(directory, 'slot')); await store.open();
    const state = new GameState(stormwreckBundle); const saveId = crypto.randomUUID();
    for (let generation = 1; generation <= 11; generation++) {
      state.characters.get('mike')!.hp = Math.max(1, 12 - generation);
      const save = seal({ ...saveOf(state, generation), saveId, generation, savedAt: new Date(Date.UTC(2026, 0, 1, 0, 0, generation)).toISOString() });
      await store.checkpoint(save);
    }
    const history = await store.listHistory();
    expect(history).toHaveLength(9); expect(history[0]!.generation).toBe(10); expect(history.at(-1)!.generation).toBe(2);
    expect(decode(await fs.readFile(store.active)).generation).toBe(11);
    await store.close();
  });
  it('autoloads from history when active and backup are absent', async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'dungeons-alpha03-history-only-')); temporary.push(directory);
    const saveDirectory = path.join(directory, 'slot'), history = path.join(saveDirectory, 'history'); await fs.mkdir(history, { recursive: true });
    const historical = saveOf(new GameState(stormwreckBundle), 7); await fs.writeFile(path.join(history, '7.json'), JSON.stringify(historical));
    let state = new GameState(stormwreckBundle); const store = new SaveStore(saveDirectory);
    const coordinator = new PersistenceCoordinator(store, stormwreckBundle, () => state, candidate => { state = candidate; state.runtimeEpoch = crypto.randomUUID(); return state.runtimeEpoch; }, () => state.runtimeEpoch, () => {});
    await coordinator.open();
    expect(coordinator.status()).toMatchObject({ mode: 'ready', generation: 8 });
    expect((await coordinator.history()).map(item => item.generation)).toEqual([8, 7]);
    await coordinator.close();
  });
  it('reports a pre-commit disk error without discarding memory, and reconciles a confirmed commit', async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'dungeons-alpha03-fault-')); temporary.push(directory);
    const store = new SaveStore(path.join(directory, 'slot'));
    let state = new GameState(stormwreckBundle);
    const coordinator = new PersistenceCoordinator(store, stormwreckBundle, () => state, candidate => {
      state = candidate; state.runtimeEpoch = crypto.randomUUID(); return state.runtimeEpoch;
    }, () => state.runtimeEpoch, () => {});
    await coordinator.open();
    state.characters.get('mike')!.hp = 3; state.stateRevision++;
    const real = store.checkpoint.bind(store);
    store.checkpoint = async () => { throw Object.assign(new Error('Disk full before commit'), { code: 'ENOSPC' }); };
    await expect(coordinator.saveNow()).rejects.toThrow('Disk full');
    expect(coordinator.status().mode).toBe('error');
    expect(coordinator.exportMemory().payload.characters.find(x => x.id === 'mike')?.hp).toBe(3);
    expect(await fs.readdir(store.directory)).toContain('writer.lock');
    store.checkpoint = async (save, allowInvalid) => { await real(save, allowInvalid); throw Object.assign(new Error('Readback failed after commit'), { code: 'EIO' }); };
    const receipt = await coordinator.retry();
    expect(receipt.code).toBe('SAVED'); expect(coordinator.status().mode).toBe('ready');
    expect((await fs.readdir(store.directory)).includes('active.json')).toBe(true);
    expect(decode(await fs.readFile(store.active)).generation).toBe(receipt.generation);
    await coordinator.close();
  });
});
