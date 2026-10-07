import { afterEach, describe, expect, it, vi } from 'vitest';
import { WorldRenderer } from '../../apps/web/world';

// Exercise the real scene loader without creating a GPU context. Only drawing
// operations and the asynchronous Babylon import boundary are substituted.
function sceneLoader() {
  const renderer = Object.create(WorldRenderer.prototype) as any;
  Object.assign(renderer, {
    campaign: { scenes: [{ id: 'garden', renderer: 'babylon-d8', grid: { width: 600, height: 400 } }] },
    options: {}, sceneId: null, installedSceneId: null,
    connectionGeneration: 0, requestGeneration: 1, d8ConfigRequest: null,
    background: { position: { set: vi.fn() } }, dynamic: { removeChildren: vi.fn() },
    reachable: { clear: vi.fn() }, areaEffects: { clear: vi.fn() }, occlusionCache: new Map(), combatOcclusionCues: new Map(), combatOcclusionCache: new Map(), tokenViews: new Map(), propViews: new Map(), pickupViews: new Map(), standingActors: new Set(), mirrorGeneration: 0,
    readCameraOrientation: vi.fn(() => 0), readCameraZoom: vi.fn(() => null),
    clearEditor: vi.fn(), clearAttackRange: vi.fn(), drawGrid: vi.fn(), drawWaves: vi.fn(), updateCamera: vi.fn(),
    installD8Renderer: vi.fn(async () => true), d8CameraMotion: { reset: vi.fn() }
  });
  vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
  return renderer;
}

afterEach(() => vi.unstubAllGlobals());

describe('scene loading recovery', () => {
  it('retries a cancelled initial D8 load instead of treating it as installed', async () => {
    const renderer = sceneLoader();
    let finishFirst!: (installed: boolean) => void;
    renderer.installD8Renderer.mockImplementationOnce(() => new Promise<boolean>(resolve => { finishFirst = resolve; }));
    const first = renderer.installScene('garden', 0, 1);
    renderer.requestGeneration = 2;
    finishFirst(false);
    expect(await first).toBe(false);
    expect(await renderer.installScene('garden', 0, 2)).toBe(true);
    expect(renderer.installD8Renderer).toHaveBeenCalledTimes(2);
    expect(await renderer.installScene('garden', 0, 2)).toBe(true);
    expect(renderer.installD8Renderer).toHaveBeenCalledTimes(2);
  });

  it('does not commit a scene after a newer snapshot or connection supersedes it', async () => {
    const renderer = sceneLoader();
    let finish!: (installed: boolean) => void;
    renderer.installD8Renderer.mockImplementationOnce(() => new Promise<boolean>(resolve => { finish = resolve; }));
    const pending = renderer.installScene('garden', 0, 1);
    renderer.connectionGeneration = 1;
    finish(true);
    expect(await pending).toBe(false);
    expect(renderer.drawGrid).not.toHaveBeenCalled();
    expect(await renderer.installScene('garden', 1, 1)).toBe(true);
    expect(renderer.installD8Renderer).toHaveBeenCalledTimes(2);
  });

  it('retries a scene after the renderer throws', async () => {
    const renderer = sceneLoader();
    renderer.installD8Renderer.mockRejectedValueOnce(new Error('offline'));
    await expect(renderer.installScene('garden', 0, 1)).rejects.toThrow('offline');
    expect(await renderer.installScene('garden', 0, 1)).toBe(true);
    expect(renderer.installD8Renderer).toHaveBeenCalledTimes(2);
  });

  it('shares an in-flight config download but retries after a network failure', async () => {
    const renderer = sceneLoader();
    const config = { version: 'V40', maps: { garden: {} } };
    const download = vi.fn().mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue({ ok: true, json: async () => config });
    vi.stubGlobal('fetch', download);
    const first = renderer.d8RendererConfig();
    expect(renderer.d8RendererConfig()).toBe(first);
    await expect(first).rejects.toThrow('offline');
    expect(await renderer.d8RendererConfig()).toEqual(config);
    expect(download).toHaveBeenCalledTimes(2);
  });

  it('disables the Playground avatar hierarchy so its direction arrow cannot cover a real token', async () => {
    const renderer = sceneLoader(), avatar = { setEnabled: vi.fn() };
    renderer.installD8Renderer = (WorldRenderer.prototype as any).installD8Renderer;
    renderer.d8RendererConfig = vi.fn(async () => ({ version: 'test', maps: { garden: {} } }));
    renderer.d8Scene = {
      metadata: { d8Vtt: { loadMap: vi.fn(), config: {} } }, meshes: [],
      getMeshByName: vi.fn((name: string) => name === 'player' ? avatar : null)
    };
    renderer.terrainCanvas = { hidden: true };
    renderer.terrainEngine = { setHardwareScalingLevel: vi.fn(), resize: vi.fn() };
    renderer.tokenOcclusionCache = new Map();
    renderer.terrainProps = new Map(); renderer.carriedLights = new Map();
    renderer.readCameraTilt = vi.fn(() => null);
    expect(await renderer.installD8Renderer(renderer.campaign.scenes[0], 0, 1)).toBe(true);
    expect(renderer.d8Scene.getMeshByName).toHaveBeenCalledWith('player');
    expect(avatar.setEnabled).toHaveBeenCalledWith(false);
  });
});
