import { afterEach, describe, expect, it, vi } from 'vitest';
import { Assets, Texture } from 'pixi.js';
import { WorldRenderer } from '../../apps/web/world';
import { SnapshotClock } from './snapshot-clock';
import { MovementTimeline } from './movement-timeline';
import { PROTOCOL_VERSION } from '../shared/protocol';

// Run the snapshot reconciler, substituting drawing only (no GPU required).
function fixture() {
  vi.spyOn(Assets, 'load').mockResolvedValue({});
  vi.spyOn(Texture, 'from').mockReturnValue(Texture.EMPTY);
  const entity = { id: 'enemy', tokenId: 'enemy', defeated: false };
  const snapshot: any = { v: PROTOCOL_VERSION, sceneId: 'garden', scene: { id: 'garden' }, sceneEpoch: 1, revision: 2, serverTime: Date.now(), gameClock: {seconds:0}, entities: [], tokenAssets: { tokens: {}, tokenAnimations: {} }, props: [], environment: {}, combat: { active: false, lastEvent: { id: 'final-hit', kind: 'defeat', targetId: 'enemy' } } };
  const renderer: any = Object.create(WorldRenderer.prototype);
  const view = { entity, root: { destroy: vi.fn() } };
  Object.assign(renderer, {
    campaign: { campaignId: 'd8-night-private', scenes: [snapshot.scene], tokens: {}, tokenAnimations: {} },
    sceneId: 'garden', installedSceneId: 'garden', ready: Promise.resolve(),
    snapshot: { ...snapshot, revision: 1, entities: [entity], combat: { active: true, lastEvent: null } },
    connectionGeneration: 0, requestGeneration: 0, loadingGeneration: 0, accepted: { epoch: 1, revision: 1 },
    presentationClock:new SnapshotClock(), movementTimeline:new MovementTimeline(), preparedTextureUrls:new Set(),
    tokenViews: new Map([['enemy', view]]), retiringTokens: new Map(), standingActors: new Set(['enemy']),
    combatOcclusionCues: new Map(), combatOcclusionCache: new Map(),
    billboardSourceUrls: new Map(), areaEffects: { sync: vi.fn() },
    sceneBillboards: { remove: vi.fn() }, lastCombatEventId: null,
    storm: {}, rain: {}, rainNear: {},
    installScene: vi.fn(async () => true), drawReachable: vi.fn(), drawAttackRange: vi.fn(),
    playCombatTokenAnimation: vi.fn(), renderProps: vi.fn(async () => {}), renderPickups: vi.fn(), updateCamera: vi.fn(),
    upsertEntity: vi.fn(), animationFor: vi.fn(() => null)
  });
  return { renderer, snapshot, view };
}

afterEach(() => vi.restoreAllMocks());

describe('defeated creature visual handoff', () => {
  it('does not return a fallen body to its old chair when combat ends', () => {
    const renderer: any = Object.create(WorldRenderer.prototype);
    Object.defineProperty(renderer, 'scene', { value: { terrain: { tileMeters: 1.5, surfaces: [] }, seats: [{ id: 'chair', cell: { col: 3, row: 4 }, surfaceId: 'floor', position: { x: 99, z: 99, height: 1 } }] } });
    Object.assign(renderer, { sceneId: 'room', snapshot: { combat: { active: false } } });
    const entity = { id: 'actor', kind: 'player', tokenId: 'rogue', cell: { col: 3, row: 4 }, surfaceId: 'floor', seatId: 'chair', moving: false, step: null };
    expect(renderer.interpolatedWorldPosition(entity).x).toBe(99);
    for (const style of ['blood', 'unconscious']) {
      const point = renderer.interpolatedWorldPosition({ ...entity, defeated: true, defeatStyle: style });
      expect(point.x).toBe(5.25); expect(point.z).toBe(6.75); expect(point.y).toBe(0);
    }
  });
  it('retains an authoritative body after combat across repeated snapshots', async () => {
    const { renderer, snapshot, view } = fixture();
    const body = { id: 'enemy', tokenId: 'enemy', defeated: true, defeatStyle: 'blood' };
    for (const revision of [2, 3, 4]) {
      await renderer.applySnapshot({ ...snapshot, revision, entities: [body] });
      expect(renderer.retiringTokens.size).toBe(0); expect(view.root.destroy).not.toHaveBeenCalled();
      expect(renderer.upsertEntity).toHaveBeenCalledWith(body);
    }
  });
  it('keeps the previously visible silhouette briefly, not the logical entity, and does not replay the hit', async () => {
    const { renderer, snapshot, view } = fixture();
    expect(await renderer.applySnapshot(snapshot)).toBe(true);
    expect(renderer.snapshot.entities).toEqual([]);
    expect(renderer.retiringTokens.has('enemy')).toBe(true);
    expect(view.entity.defeated).toBe(true);
    expect(view.root.destroy).not.toHaveBeenCalled();
    await renderer.applySnapshot({ ...snapshot, revision: 3 });
    expect(renderer.playCombatTokenAnimation).toHaveBeenCalledTimes(1);
    renderer.removeTokenVisual('enemy');
    expect(renderer.sceneBillboards.remove).toHaveBeenCalledWith('enemy');
    expect(renderer.tokenViews.size).toBe(0);
    expect(renderer.retiringTokens.size).toBe(0);
  });
  it('does not carry the corpse visual into another scene or a restored epoch', async () => {
    const { renderer, snapshot, view } = fixture();
    await renderer.applySnapshot(snapshot);
    await renderer.applySnapshot({ ...snapshot, sceneEpoch: 2, revision: 4 });
    expect(view.root.destroy).toHaveBeenCalledTimes(1);
    expect(renderer.tokenViews.size).toBe(0);
    expect(renderer.retiringTokens.size).toBe(0);
  });
  it('cancels visual retirement when an undo restores the creature', async () => {
    const { renderer, snapshot } = fixture();
    await renderer.applySnapshot(snapshot);
    const restored = { id: 'enemy', tokenId: 'enemy', defeated: false };
    await renderer.applySnapshot({ ...snapshot, revision: 3, entities: [restored], combat: { active: true, lastEvent: null } });
    expect(renderer.retiringTokens.size).toBe(0);
    expect(renderer.upsertEntity).toHaveBeenCalledWith(restored);
  });
});
