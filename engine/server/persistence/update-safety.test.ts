import { afterEach, describe, expect, it, vi } from 'vitest';
import crypto from 'node:crypto';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { stormwreckBundle } from '../../../campaigns/stormwreck-isle/server.js';
import { GameState } from '../game.js';
import { PersistenceCoordinator } from './coordinator.js';
import { checksum, decode, seal } from './codec.js';
import { SaveStore } from './store.js';

const temporary: string[] = [];
afterEach(async () => {
  vi.useRealTimers();
  for (const directory of temporary.splice(0)) if (path.resolve(directory).startsWith(path.resolve(os.tmpdir()) + path.sep))
    await fs.rm(directory, { recursive: true, force: true });
});
async function fixture() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'dungeons-save-update-')); temporary.push(directory);
  let state = new GameState(stormwreckBundle); state.applyClockControl('pause');
  const store = new SaveStore(path.join(directory, 'slot'));
  const coordinator = new PersistenceCoordinator(store, stormwreckBundle, () => state, candidate => {
    state = candidate; state.runtimeEpoch = crypto.randomUUID(); return state.runtimeEpoch;
  }, () => state.runtimeEpoch, () => {});
  await coordinator.open();
  return { store, coordinator, current: () => state };
}

describe('guardado seguro al actualizar el VTT', () => {
  it('keeps the exact imported legacy file before changing its format', async () => {
    const f = await fixture(), current = f.coordinator.exportMemory();
    const { camera: _camera, ...legacyPayload } = current.payload;
    const body = { ...current, schemaVersion: 0, payload: legacyPayload, checksum: '' };
    const original = JSON.stringify({ ...body, checksum: checksum(body) }, null, 2);
    const preview = f.coordinator.preview(original);
    expect(preview.warnings.some(warning => warning.includes('adaptará'))).toBe(true);
    await f.coordinator.restore(preview.token, f.current().runtimeEpoch, preview.expectedStateRevision);
    const files = await fs.readdir(path.join(f.store.directory, 'recovery'));
    const source = files.find(name => name.endsWith('-before-migration.json'))!;
    expect(await fs.readFile(path.join(f.store.directory, 'recovery', source), 'utf8')).toBe(original);
    expect(decode(await fs.readFile(f.store.active)).schemaVersion).toBe(1);
    await f.coordinator.close();
  });
  it.each(['campaign', 'geometry'] as const)('does not replace a newer %s save with an older compatible backup', async kind => {
    const f = await fixture(); await f.coordinator.saveNow();
    const prior = f.coordinator.exportMemory(); await f.coordinator.close();
    const future = seal({ ...prior, generation: prior.generation + 1,
      ...(kind === 'campaign' ? { campaignStateVersion: prior.campaignStateVersion + 1 } : { payload: { ...prior.payload, wreckGridVersion: 7 } }) });
    const bytes = JSON.stringify(future); await fs.writeFile(f.store.active, bytes);
    await fs.writeFile(f.store.backup, JSON.stringify(prior));
    let state = new GameState(stormwreckBundle);
    const store = new SaveStore(f.store.directory), coordinator = new PersistenceCoordinator(store, stormwreckBundle, () => state,
      candidate => { state = candidate; return state.runtimeEpoch; }, () => state.runtimeEpoch, () => {});
    await coordinator.open();
    expect(coordinator.status().mode).toBe('incompatible');
    await coordinator.close();
    expect(await fs.readFile(store.active, 'utf8')).toBe(bytes);
    expect(decode(await fs.readFile(store.backup)).checksum).toBe(prior.checksum);
  });
  it('refuses disk writes if another owner replaces the writer lock', async () => {
    const f = await fixture(); await f.coordinator.saveNow();
    const former = await fs.readFile(f.store.active), lock = await fs.readFile(f.store.lockPath);
    await fs.writeFile(f.store.lockPath, JSON.stringify({ pid: process.pid, owner: crypto.randomUUID(), createdAt: new Date().toISOString() }));
    f.current().characters.get('mike')!.hp = 4; f.current().stateRevision++;
    await expect(f.coordinator.saveNow()).rejects.toThrow('SAVE_LOCK_CHANGED');
    expect(await fs.readFile(f.store.active)).toEqual(former);
    await fs.writeFile(f.store.lockPath, lock); await f.coordinator.close();
  });
  it('does not release the writer or discard memory if final saving fails', async () => {
    const f = await fixture(); await f.coordinator.saveNow();
    const former = await fs.readFile(f.store.active, 'utf8');
    f.current().characters.get('mike')!.hp = 4; f.current().stateRevision++;
    const checkpoint = f.store.checkpoint.bind(f.store);
    f.store.checkpoint = async () => { throw new Error('DISK_FULL'); };
    await expect(f.coordinator.close()).rejects.toThrow('DISK_FULL');
    expect(f.coordinator.isClosing).toBe(false);
    expect(f.coordinator.status().mode).toBe('error');
    expect(f.current().characters.get('mike')!.hp).toBe(4);
    expect(await fs.readFile(f.store.active, 'utf8')).toBe(former);
    await expect(new SaveStore(f.store.directory).open()).rejects.toThrow('SAVE_LOCK_ACTIVE');
    f.store.checkpoint = checkpoint;
    await f.coordinator.close();
    expect(decode(await fs.readFile(f.store.active)).payload.characters.find(item => item.id === 'mike')!.hp).toBe(4);
  });

  it('blocks new saving requests while a final checkpoint is in progress', async () => {
    const f = await fixture(); await f.coordinator.saveNow();
    f.current().characters.get('mike')!.hp = 5; f.current().stateRevision++;
    const checkpoint = f.store.checkpoint.bind(f.store);
    let release!: () => void, started!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const entered = new Promise<void>(resolve => { started = resolve; });
    f.store.checkpoint = async (...args) => { started(); await gate; await checkpoint(...args); };
    const close = f.coordinator.close(); await entered;
    expect(f.coordinator.isClosing).toBe(true);
    await expect(f.coordinator.saveNow()).rejects.toThrow('SAVE_CLOSING');
    release(); await close;
  });

  it('flushes seconds and climate that elapsed since the last saved revision', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const f = await fixture(); f.current().applyClockControl('resume'); await f.coordinator.saveNow();
    const before = decode(await fs.readFile(f.store.active));
    vi.setSystemTime(Date.now() + 17_000);
    expect(f.coordinator.status().dirty).toBe(false);
    await f.coordinator.close();
    const after = decode(await fs.readFile(f.store.active));
    expect(after.payload.gameClock!.seconds).toBe(before.payload.gameClock!.seconds + 17);
    expect(after.payload.climates!.every(item => item.state.updatedAtGameSeconds === after.payload.gameClock!.seconds)).toBe(true);
  });

  it('keeps useful recovery points instead of filling history with idle clock snapshots', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const f = await fixture(); f.current().applyClockControl('resume'); await f.coordinator.saveNow();
    for (let index = 0; index < 12; index++) { vi.setSystemTime(Date.now() + 30_000); await f.coordinator.saveTime(); }
    expect((await f.coordinator.history()).map(item => item.generation)).toEqual([2,1]);
    f.current().characters.get('mike')!.hp = 4; f.current().stateRevision++;
    await f.coordinator.saveNow();
    for (let index = 0; index < 12; index++) { vi.setSystemTime(Date.now() + 30_000); await f.coordinator.saveTime(); }
    expect((await f.coordinator.history()).map(item => item.generation)).toEqual([4,3,2,1]);
    await f.coordinator.close();
  });

  it('waits for a useful quiet period and caps the wait during continuous changes', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
    const f = await fixture(); await f.coordinator.saveNow();
    const checkpoint = vi.spyOn(f.store, 'checkpoint');
    const change = () => { f.current().stateRevision++; f.coordinator.markDirty(); };
    try {
      change(); await vi.advanceTimersByTimeAsync(30_000);
      expect(checkpoint).not.toHaveBeenCalled();
      change(); await vi.advanceTimersByTimeAsync(44_000);
      expect(checkpoint).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1_000);
      expect(checkpoint).toHaveBeenCalledTimes(1);
      await f.coordinator.saveAutomaticNow();
      checkpoint.mockClear();
      for (let index = 0; index < 6; index++) { change(); await vi.advanceTimersByTimeAsync(30_000); }
      expect(checkpoint).toHaveBeenCalledTimes(1);
      await f.coordinator.saveAutomaticNow();
      expect(f.coordinator.status().dirty).toBe(false);
    } finally { await f.coordinator.close(); }
  });

  it('coalesces queued automatic saves of the same revision and preserves manual saves', async () => {
    const f = await fixture(); await f.coordinator.saveNow();
    try {
      f.current().characters.get('mike')!.hp = 4; f.current().stateRevision++;
      const generation = f.coordinator.status().generation!;
      await Promise.all([f.coordinator.saveAutomaticNow(), f.coordinator.saveAutomaticNow(), f.coordinator.saveAutomaticNow()]);
      expect(f.coordinator.status().generation).toBe(generation + 1);
      await f.coordinator.saveNow();
      expect(f.coordinator.status().generation).toBe(generation + 2);
    } finally { await f.coordinator.close(); }
  });

  it('commits imported migrations immediately and archives the pre-update source', async () => {
    const f = await fixture();
    const exported = f.coordinator.exportMemory(), payload = structuredClone(exported.payload);
    delete payload.gameClock; delete payload.climates;
    payload.characters.find(item => item.id === 'mike')!.hp = 4;
    payload.characters.find(item => item.id === 'mike')!.inventory.push('Recuerdo de la partida anterior');
    const legacy = seal({ ...exported, campaignVersion: 'earlier-release', payload });
    const preview = f.coordinator.preview(JSON.stringify(legacy));
    expect(preview.warnings.some(warning => warning.includes('adaptará'))).toBe(true);
    await f.coordinator.restore(preview.token, f.current().runtimeEpoch, preview.expectedStateRevision);
    const committed = decode(await fs.readFile(f.store.active));
    expect(committed.campaignVersion).toBe(stormwreckBundle.public.version);
    expect(committed.payload.gameClock).toBeDefined(); expect(committed.payload.climates).toBeDefined();
    expect(committed.payload.characters.find(item => item.id === 'mike')!).toMatchObject({ hp: 4, inventory: expect.arrayContaining(['Recuerdo de la partida anterior']) });
    expect((await fs.readdir(path.join(f.store.directory,'recovery'))).some(name => name.endsWith('-before-migration.json'))).toBe(true);
    await f.coordinator.close();
  });

  it('loads a newer valid historical checkpoint over an older active file', async () => {
    const f = await fixture(); await f.coordinator.saveNow();
    const earlier = await fs.readFile(f.store.active);
    f.current().characters.get('mike')!.hp = 4; f.current().stateRevision++; await f.coordinator.saveNow();
    const newer = await fs.readFile(f.store.active); await f.coordinator.close();
    await fs.writeFile(f.store.active, earlier);
    await fs.unlink(f.store.backup);
    await fs.writeFile(path.join(f.store.directory,'history','2.json'),newer);
    let state = new GameState(stormwreckBundle);
    const store = new SaveStore(f.store.directory), coordinator = new PersistenceCoordinator(store, stormwreckBundle, () => state,
      candidate => { state = candidate; return state.runtimeEpoch; }, () => state.runtimeEpoch, () => {});
    await coordinator.open();
    expect(coordinator.status()).toMatchObject({ mode: 'ready', generation: 3 });
    expect(coordinator.status().recoveryNotice).toContain('historial');
    expect((await fs.readdir(path.join(store.directory, 'recovery'))).some(name => name.endsWith('-history-source.json'))).toBe(true);
    expect(state.characters.get('mike')!.hp).toBe(4);
    await coordinator.close();
  });
});
