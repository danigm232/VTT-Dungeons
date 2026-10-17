import { describe, it, expect, vi, afterEach } from 'vitest';
import { Server } from 'socket.io';
import { existsSync } from 'node:fs';
import { GameServer, GameState } from './game.js';
import { stormwreckBundle } from '../../campaigns/stormwreck-isle/server.js';
import { oneShotBundle } from '../../campaigns/one-shot/server.js';
import { weatherMode, weatherDescription } from '../shared/weather.js';
import { SECONDS_PER_DAY, SECONDS_PER_HOUR, formatGameClock } from '../shared/game-time.js';
import { dmCommandSchema } from '../shared/protocol.js';

afterEach(() => vi.useRealTimers());
describe('climate across clock, controls, accumulation, saved games and audio', () => {
  it.each([1, 2, 3] as const)('accumulates snow level %i after two game hours, persists it and respects warm temperatures', level => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-12T08:00:00Z'));
    const state = new GameState(stormwreckBundle);
    state.environment.temperatureC = 18;
    state.applyEnvironmentChange({ weatherMode: 'snow', precipitationLevel: level });
    expect(state.environment.temperatureC).toBe(-4);
    state.applyClockControl('advance', 2 * SECONDS_PER_HOUR);
    const snow = state.publicSnapshot().climate;
    expect(snow.snowCoverage).toBeCloseTo(level === 1 ? 2 / 3 : 1);
    expect(snow.snowDepthCm).toBeCloseTo([1.2, 3.6, 10.8][level - 1]!);
    const restored = new GameState(stormwreckBundle); restored.restoreDurable(state.captureDurable());
    expect(restored.publicSnapshot().climate).toEqual(snow);
    restored.applyEnvironmentChange({ temperatureC: 15 });
    restored.applyClockControl('advance', SECONDS_PER_HOUR);
    expect(restored.publicSnapshot().climate.snowCoverage).toBeLessThan(snow.snowCoverage);
    expect(weatherDescription(restored.environment)).toContain('no cuaja');
  });
  it('keeps intense rain distinct from electrical storms and windy tempests with one intensity', () => {
    const state = new GameState(stormwreckBundle);
    state.applyEnvironmentChange({ weatherMode: 'rain', precipitationLevel: 3 });
    expect(state.environment).toMatchObject({ storm: false, lightning: false, precipitation: 'rain', precipitationLevel: 3 });
    state.applyEnvironmentChange({ weatherMode: 'storm' });
    expect(weatherMode(state.environment)).toBe('storm'); expect(state.environment.lightning).toBe(true);
    state.applyEnvironmentChange({ precipitationLevel: 1 });
    expect(state.environment).toMatchObject({ precipitationLevel: 1, stormIntensity: .35, lightning: true });
    state.applyEnvironmentChange({ weatherMode: 'tempest' });
    expect(state.environment).toMatchObject({ windIntensity: .75, stormIntensity: .8, lightning: false });
    expect(weatherMode(state.environment)).toBe('tempest');
    state.applyEnvironmentChange({ weatherMode: 'snow' });
    expect(state.environment).toMatchObject({ storm: false, lightning: false, precipitation: 'snow' });
  });
  it('hour icons advance the authoritative clock to 12, 19, 22 and 05 without freezing daylight or rewinding accumulation', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-12T08:00:00Z'));
    const state = new GameState(stormwreckBundle);
    state.applyEnvironmentChange({ weatherMode: 'snow' });
    for (const [phase, hours, day] of [['day', 12, 1], ['sunset', 19, 1], ['night', 22, 1], ['dawn', 5, 2]] as const) {
      const before = state.gameClockSnapshot().seconds;
      state.applyEnvironmentChange({ timeOfDay: phase });
      expect(state.gameClockSnapshot().seconds).toBe((day - 1) * SECONDS_PER_DAY + hours * SECONDS_PER_HOUR);
      expect(state.gameClockSnapshot().seconds).toBeGreaterThan(before);
      expect(state.environment.timeOfDay).toBe('auto');
      expect(formatGameClock(state.gameClockSnapshot().seconds)).toMatchObject({ day, hours });
      expect(state.publicSnapshot().climate.snowCoverage).toBe(1);
    }
    vi.advanceTimersByTime(2 * SECONDS_PER_HOUR * 1000);
    expect(formatGameClock(state.gameClockSnapshot().seconds).hours).toBe(7);
  });
  it.each([stormwreckBundle, oneShotBundle])('uses existing and distinct audible assets in $public.campaignId', bundle => {
    const state = new GameState(bundle);
    const tracks = new Set<string>();
    for (const mode of ['rain', 'snow', 'storm', 'tempest'] as const) {
      state.applyEnvironmentChange({ weatherMode: mode });
      const audio = state.audio.layers.storm;
      expect(audio.playing).toBe(true); expect(audio.volume).toBeGreaterThan(0);
      const asset = state.campaign.public.audio.library?.ambience.find(track => track.id === audio.assetId)!;
      expect(asset).toBeDefined();
      const root = bundle.public.campaignId === 'stormwreck-isle' ? 'campaigns/stormwreck-isle/public' : 'campaigns/one-shot/public';
      expect(existsSync(`${root}${asset.url}`), asset.url).toBe(true);
      tracks.add(asset.id);
    }
    expect(tracks.size).toBe(4);
    state.applyEnvironmentChange({ weatherMode: 'clear' }); expect(state.audio.layers.storm.playing).toBe(false);
  });
  it('accepts independent field changes and sends the same state to DM, players and projector', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-12T08:00:00Z'));
    const server = new GameServer(new Server(), 'climate-audit', stormwreckBundle);
    const command = (body: Record<string, unknown>) => {
      const parsed = dmCommandSchema.parse({ type: 'environment', commandId: crypto.randomUUID(), runtimeEpoch: server.state.runtimeEpoch, sceneEpoch: server.state.sceneEpoch, ...body });
      expect(server.applyDmCommand(parsed)).toMatchObject({ ok: true });
    };
    command({ weatherMode: 'snow' }); command({ precipitationLevel: 3 }); command({ fogTarget: .5 });
    expect(server.state.environment).toMatchObject({ precipitation: 'snow', precipitationLevel: 3, fogTarget: .5 });
    server.state.applyClockControl('advance', 7200);
    const dm = server.state.dmState(), world = server.state.publicSnapshot();
    expect(dm.environment).toEqual(world.environment); expect(dm.climate).toEqual(world.climate);
    expect(dm.climate.snowDepthCm).toBeGreaterThan(10);
  });
});
