import { afterEach, describe, expect, it, vi } from 'vitest';
import { WorldRenderer } from '../../apps/web/world';

// Exercise the real scene loader without creating a GPU context. Only drawing
// operations and the asynchronous Babylon import boundary are substituted.
function sceneLoader() {
  const renderer = Object.create(WorldRenderer.prototype) as any;
  Object.assign(renderer, {
    campaign: { scenes: [{ id: 'garden', renderer: 'babylon-d8', grid: { width: 600, height: 400 } }] },
    options: {}, sceneId: null, installedSceneId: null, loadingGeneration: 0,
    connectionGeneration: 0, requestGeneration: 1, d8ConfigRequest: null,
    mirrorRevealAt:new Map(),mirrorTravel:new Map(),stageCameraLimits:new Map(),
    background: { position: { set: vi.fn() } }, dynamic: { removeChildren: vi.fn() },
    reachable: { clear: vi.fn() }, areaEffects: { clear: vi.fn() }, occlusionCache: new Map(), combatOcclusionCues: new Map(), combatOcclusionCache: new Map(), tokenViews: new Map(), propViews: new Map(), pickupViews: new Map(), standingActors: new Set(), mirrorGeneration: 0,
    readCameraOrientation: vi.fn(() => 0), readCameraZoom: vi.fn(() => null), readCameraTilt:vi.fn(()=>null),
    clearEditor: vi.fn(), clearAttackRange: vi.fn(), drawGrid: vi.fn(), drawWaves: vi.fn(), updateCamera: vi.fn(),
    installD8Renderer: vi.fn(async () => true), d8CameraMotion: { reset: vi.fn() }, d8InteriorTilt: {reset:vi.fn(),enterScene:vi.fn()}
  });
  vi.stubGlobal('window', { matchMedia: () => ({ matches: false }), addEventListener: vi.fn(), removeEventListener: vi.fn() });
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
  it('updates loading screen with destination scene title during applySnapshot', async () => {
    const renderer = sceneLoader();
    renderer.campaign.scenes.push({ id: 'wreck-ship', title: 'Pecio · Rosa de los Vientos', renderer: 'babylon-d8', grid: { width: 400, height: 400 } });
    renderer.installedSceneId = 'garden';
    renderer.showLoading = vi.fn();
    renderer.hideLoading = vi.fn();
    renderer.applyRenderedSnapshot = vi.fn(async () => true);

    const snapshot = {
      v: 1,
      runtimeEpoch: 'test-epoch',
      sceneEpoch: 1,
      sceneId: 'wreck-ship',
      entities: [],
      objects: [],
      ports: [],
      environment: {},
      combat: { active: false },
      tokenAssets: { tokens: {}, tokenAnimations: {} }
    } as any;

    const result = await renderer.applySnapshot(snapshot);
    expect(result).toBe(true);
    expect(renderer.showLoading).toHaveBeenCalledWith('Pecio · Rosa de los Vientos', 'Preparando escenario…');
    expect(renderer.hideLoading).toHaveBeenCalled();
  });

  it('waits for user to click continue before dismissing loading screen', async () => {
    const renderer = sceneLoader();
    const btn = { hidden: true, focus: vi.fn(), onclick: null as any };
    const hint = { hidden: true };
    const screen = { classList: { remove: vi.fn(), add: vi.fn(), contains: vi.fn(() => true) }, hidden: false };
    const barFill = { classList: { add: vi.fn() } };
    const msg = { textContent: '' };
    renderer.loadingScreen = screen;
    renderer.loadingContinueBtn = btn;
    renderer.loadingHint = hint;
    renderer.loadingBarFill = barFill;
    renderer.loadingMessage = msg;
    renderer.options = { requireContinue: true };
    renderer.hideLoading = vi.fn();

    let completed = false;
    const waitPromise = (WorldRenderer.prototype as any).waitForVisualsReadyAndContinue.call(renderer).then(() => { completed = true; });

    expect(btn.hidden).toBe(false);
    expect(hint.hidden).toBe(false);
    expect(completed).toBe(false);
    expect(renderer.hideLoading).not.toHaveBeenCalled();

    // Trigger user clicking Continue
    btn.onclick();
    await waitPromise;

    expect(completed).toBe(true);
    expect(renderer.hideLoading).toHaveBeenCalled();
  });
});
