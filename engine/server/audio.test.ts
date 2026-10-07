import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AudioState } from '../shared/protocol';

const fake = vi.hoisted(() => ({ instances: [] as any[], loaded: true }));

vi.mock('howler', () => ({
  Howl: class FakeHowl {
    src: string;
    pauseCalls = 0;
    stopCalls = 0;
    unloadCalls = 0;
    playCalls = 0;
    seekCalls: number[] = [];
    loopCalls: boolean[] = [];
    rateCalls: number[] = [];
    endHandlers: Array<() => void> = [];
    loadHandlers: Array<() => void> = [];
    currentVolume = 0;
    isPlaying = false;

    constructor(options: { src: string[]; volume?: number; loop?: boolean; rate?: number }) {
      this.src = options.src[0] ?? '';
      this.currentVolume = options.volume ?? 0;
      if (options.loop !== undefined) this.loopCalls.push(options.loop);
      if (options.rate !== undefined) this.rateCalls.push(options.rate);
      fake.instances.push(this);
    }
    state() { return fake.loaded ? 'loaded' : 'loading'; }
    play() { this.playCalls++; this.isPlaying = true; return 1; }
    pause() { this.pauseCalls++; this.isPlaying = false; }
    stop() { this.stopCalls++; this.isPlaying = false; }
    unload() { this.unloadCalls++; }
    playing() { return this.isPlaying; }
    duration() { return 20; }
    seek(value?: number) { if (typeof value === 'number') this.seekCalls.push(value); return value ?? 0; }
    fade(_from: number, to: number, _duration: number) { this.currentVolume = to; }
    volume() { return this.currentVolume; }
    loop(value?: boolean) { if (value !== undefined) this.loopCalls.push(value); return value ?? false; }
    rate(value?: number) { if (value !== undefined) this.rateCalls.push(value); return value ?? 1; }
    on(event: string, handler: () => void) { if (event === 'end') this.endHandlers.push(handler); }
    off(event: string) { if (event === 'end') this.endHandlers = []; }
    once(event: string, handler: () => void) { if (event === 'load') this.loadHandlers.push(handler); }
    fireLoad() { for (const handler of this.loadHandlers) handler(); this.loadHandlers = []; }
    fireEnd() { this.isPlaying = false; for (const handler of [...this.endHandlers]) handler(); }
  },
  Howler: { ctx: { state: 'running', resume: vi.fn() }, volume: vi.fn() }
}));

import { AudioDirector } from '../../apps/web/audio';

const catalog = {
  music: '/audio/music.wav', layers: { ocean: '/audio/ambient-ocean.wav', wind: '/audio/wind.wav', wood: '/audio/wood.wav', storm: '/audio/storm.wav' },
  sfx: { thunder: '/audio/thunder.wav', creak: '/audio/creak.wav', impact: '/audio/impact.wav' },
  library: { music: [], ambience: [], sfx: [{ id: 'd8-night-sfx-step-wood', label: 'Paso', description: 'Prueba', url: '/audio/step-wood.wav', category: 'movement', loopable: true }] }
};

const track = (playing = false, offset = 0) => ({ playing, volume: 0.4, startedAt: null, offset, loop: true, rate: 1, repeats: 1 });
const state = (): AudioState => ({
  music: track(),
  layers: { ocean: track(), wind: track(), wood: track(), storm: track() },
  sfxLoops: {}
});
const ocean = () => fake.instances.find(instance => instance.src.includes('ambient-ocean'))!;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(123);
  fake.instances.length = 0;
  fake.loaded = true;
});
afterEach(() => vi.useRealTimers());

describe('AudioDirector', () => {
  it('does not revive expired finite effects when a player joins late', () => {
    const finished = vi.fn(), director = new AudioDirector(catalog, finished), playing = state();
    playing.sfxLoops['d8-night-sfx-step-wood'] = { ...track(true), startedAt: 123, loop: false, repeats: 2 };
    vi.setSystemTime(45_123); director.apply(playing); director.apply(playing);
    const sound = fake.instances.find(instance => instance.src.includes('step-wood'))!;
    expect(sound.playCalls).toBe(0); expect(finished).toHaveBeenCalledExactlyOnceWith('d8-night-sfx-step-wood', 123);
  });
  it('resumes only the remaining repetitions at the shared timeline position', () => {
    const director = new AudioDirector(catalog), playing = state();
    playing.layers.ocean = { ...track(true), startedAt: 123, loop: false, repeats: 3 };
    vi.setSystemTime(45_123); director.apply(playing);
    expect(ocean().seekCalls).toEqual([5]); ocean().fireEnd(); director.apply(playing);
    expect(ocean().playCalls).toBe(1);
  });
  it('uses load completion time and rejects obsolete SFX load callbacks', () => {
    fake.loaded = false;
    const finished = vi.fn(), director = new AudioDirector(catalog, finished), playing = state();
    playing.sfxLoops['d8-night-sfx-step-wood'] = { ...track(true), startedAt: 123, loop: false };
    director.apply(playing);
    const sound = fake.instances.find(instance => instance.src.includes('step-wood'))!;
    vi.setSystemTime(25_123); sound.fireLoad();
    expect(sound.playCalls).toBe(0); expect(finished).toHaveBeenCalledTimes(1);
    playing.sfxLoops['d8-night-sfx-step-wood']!.startedAt = 25_123; director.apply(playing);
    playing.sfxLoops = {}; director.apply(playing); sound.fireLoad();
    expect(sound.playCalls).toBe(0);
  });
  it('does not reset finite repetitions on unrelated mixer changes', () => {
    const finished = vi.fn(), director = new AudioDirector(catalog, finished), repeated = state();
    repeated.sfxLoops['d8-night-sfx-step-wood'] = { ...track(true), startedAt: 123, loop: false, repeats: 2 };
    director.apply(repeated);
    const sound = fake.instances.find(instance => instance.src.includes('step-wood'))!;
    sound.fireEnd();
    repeated.layers.wind.volume = .8; director.apply(repeated);
    sound.fireEnd(); director.apply(repeated);
    expect(sound.playCalls).toBe(2);
    expect(finished).toHaveBeenCalledExactlyOnceWith('d8-night-sfx-step-wood', 123);
  });
  it('finishes one-shot sequences once, including stale snapshots and a deliberate replay', () => {
    const finished = vi.fn(), director = new AudioDirector(catalog, finished), repeated = state();
    repeated.sfxLoops['d8-night-sfx-step-wood'] = { ...track(true), startedAt: 123, loop: false };
    director.apply(repeated);
    const sound = fake.instances.find(instance => instance.src.includes('step-wood'))!;
    sound.fireEnd(); director.apply(repeated); director.apply(repeated);
    expect(sound.playCalls).toBe(1); expect(finished).toHaveBeenCalledTimes(1);
    repeated.sfxLoops['d8-night-sfx-step-wood']!.playing = false; director.apply(repeated);
    repeated.sfxLoops['d8-night-sfx-step-wood']!.playing = true; director.apply(repeated);
    sound.fireEnd(); expect(sound.playCalls).toBe(2); expect(finished).toHaveBeenCalledTimes(2);
  });
  it('does not restart a completed finite ambience on a volume update', () => {
    const director = new AudioDirector(catalog), playing = state();
    playing.layers.ocean = { ...track(true), loop: false, repeats: 2 };
    director.apply(playing); ocean().fireEnd();
    playing.layers.wood.volume = .7; director.apply(playing); ocean().fireEnd();
    director.apply(playing); expect(ocean().playCalls).toBe(2);
  });
  it('mantiene la pausa pendiente de un canal cuando se actualiza otro', () => {
    const director = new AudioDirector(catalog);
    const playing = state();
    playing.layers.ocean.playing = true;
    director.apply(playing);
    const stopped = state();
    director.apply(stopped);
    const otherUpdate = state();
    otherUpdate.layers.wind.volume = 0.8;
    director.apply(otherUpdate);
    vi.advanceTimersByTime(210);
    expect(ocean().pauseCalls).toBe(1);
  });

  it('cancela la pausa si el mismo canal se reinicia rápidamente', () => {
    const director = new AudioDirector(catalog);
    const playing = state();
    playing.layers.ocean.playing = true;
    director.apply(playing);
    director.apply(state());
    vi.advanceTimersByTime(100);
    director.apply(playing);
    vi.advanceTimersByTime(130);
    expect(ocean().pauseCalls).toBe(0);
  });

  it('ignora el seek de una carga tardía que ya fue sustituida', () => {
    fake.loaded = false;
    const director = new AudioDirector(catalog);
    const first = state();
    first.layers.ocean = track(true, 2);
    director.apply(first);
    const sound = ocean();
    director.apply(state());
    const second = state();
    second.layers.ocean = track(true, 11);
    director.apply(second);
    sound.fireLoad();
    expect(sound.seekCalls).toEqual([11]);
  });

  it('aplica bucle, velocidad y repeticiones de una capa', () => {
    const director = new AudioDirector(catalog);
    const playing = state();
    playing.layers.ocean = { ...track(true), loop: false, rate: 1.25, repeats: 3 };
    director.apply(playing);
    expect(ocean().loopCalls.at(-1)).toBe(false);
    expect(ocean().rateCalls.at(-1)).toBe(1.25);
    expect(ocean().endHandlers).toHaveLength(1);
  });

  it('repite pasos sin usar ni cortar el canal de ambiente', () => {
    const director = new AudioDirector(catalog), repeated = state();
    repeated.sfxLoops['d8-night-sfx-step-wood'] = { ...track(true), assetId: 'd8-night-sfx-step-wood', loop: false, rate: 1.25, repeats: 2 };
    director.apply(repeated);
    const steps = fake.instances.find(instance => instance.src.includes('step-wood'))!;
    expect(steps.loopCalls.at(-1)).toBe(false);
    expect(steps.rateCalls.at(-1)).toBe(1.25);
    steps.endHandlers[0]!();
    expect(steps.playCalls).toBe(2);
  });

  it('notifica al terminar una secuencia finita para apagar su control', () => {
    const finished = vi.fn(), director = new AudioDirector(catalog, finished), repeated = state();
    repeated.sfxLoops['d8-night-sfx-step-wood'] = { ...track(true), assetId: 'd8-night-sfx-step-wood', startedAt: 123, loop: false, repeats: 2 };
    director.apply(repeated);
    const steps = fake.instances.find(instance => instance.src.includes('step-wood'))!;
    steps.endHandlers[0]!();
    steps.endHandlers[0]!();
    expect(finished).toHaveBeenCalledWith('d8-night-sfx-step-wood', 123);
  });

  it('mantiene un único paso durante una ruta y tolera la latencia entre casillas', () => {
    const director = new AudioDirector(catalog);
    director.playMovementSfx('heroina', 'd8-night-sfx-step-wood', 300);
    const steps = fake.instances.find(instance => instance.src.includes('step-wood'))!;
    expect(steps.playCalls).toBe(1);
    vi.advanceTimersByTime(200);
    director.playMovementSfx('heroina', 'd8-night-sfx-step-wood', 300);
    expect(steps.playCalls).toBe(1);
    vi.advanceTimersByTime(379);
    expect(steps.stopCalls).toBe(0);
    vi.advanceTimersByTime(1);
    expect(steps.stopCalls).toBe(1);
  });

  it('no reinicia el paso si el siguiente aviso llega justo después de completar la casilla', () => {
    const director = new AudioDirector(catalog);
    director.playMovementSfx('silverfarben', 'd8-night-sfx-step-wood', 220);
    const steps = fake.instances.find(instance => instance.src.includes('step-wood'))!;
    vi.advanceTimersByTime(233);
    director.playMovementSfx('silverfarben', 'd8-night-sfx-step-wood', 220);
    expect(steps.playCalls).toBe(1);
    expect(steps.stopCalls).toBe(0);
    vi.advanceTimersByTime(299);
    expect(steps.stopCalls).toBe(0);
    vi.advanceTimersByTime(1);
    expect(steps.stopCalls).toBe(1);
  });
});
