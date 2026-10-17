import { strongWind } from './weather.js';
import type { EnvironmentState } from './protocol.js';

export type GameClockMode = 'exploration' | 'combat' | 'paused';
export type GameClockPauseReason = 'dm' | 'decision' | null;

/** `seconds` is the authoritative campaign timeline; `serverTime` is its wall-clock anchor. */
export interface GameClockSnapshot {
  seconds: number;
  serverTime: number;
  running: boolean;
  mode: GameClockMode;
  pauseReason: GameClockPauseReason;
}

export interface ClimateState {
  updatedAtGameSeconds: number;
  snowCoverage: number;
  /** Physical depth in centimetres; coverage is an independent visual value. */
  snowDepthCm: number;
  wetness: number;
  puddleCoverage: number;
  fogDensity: number;
  floodLevel: number;
}

export type ClimateEnvironment = Pick<EnvironmentState,
  'precipitation' | 'precipitationLevel' | 'storm' | 'stormIntensity' | 'temperatureC' | 'fogTarget' | 'floodTarget' | 'windIntensity' | 'weatherRules'>;

export interface NaturalLightProfile {
  phase: 'night' | 'dawn' | 'morning' | 'midday' | 'sunset';
  ambient: number;
  direct: number;
  warmth: number;
}

export const SECONDS_PER_MINUTE = 60;
export const SECONDS_PER_HOUR = 3_600;
export const SECONDS_PER_DAY = 86_400;
export const SHORT_REST_SECONDS = SECONDS_PER_HOUR;
export const LONG_REST_SECONDS = 8 * SECONDS_PER_HOUR;
export const timeOfDayHours = { day: 12, sunset: 19, night: 22, dawn: 5 } as const;
export function nextTimeOfDaySeconds(current: number, phase: keyof typeof timeOfDayHours) {
  const target = Math.floor(current / SECONDS_PER_DAY) * SECONDS_PER_DAY + timeOfDayHours[phase] * SECONDS_PER_HOUR;
  return current >= target && current - target < 60 ? current : target < current ? target + SECONDS_PER_DAY : target;
}
export function clockTimeSelection(environment: EnvironmentState, seconds: number): NonNullable<EnvironmentState['timeOfDay']> {
  if (environment.timeOfDay && environment.timeOfDay !== 'auto') return environment.timeOfDay;
  return ({ midday: 'day', sunset: 'sunset', night: 'night', dawn: 'dawn', morning: 'auto' } as const)[naturalLightProfile(seconds).phase];
}

export function initialGameTimeSeconds(campaignId: string) {
  // Opening scenes are authored at morning in Stormwreck and evening in D8.
  // Legacy saves without a clock inherit this start and do not count downtime.
  return campaignId === 'd8-night-private' ? 19 * SECONDS_PER_HOUR : 8 * SECONDS_PER_HOUR;
}

export function gameClockAt(clock: GameClockSnapshot, serverNow = Date.now()) {
  return clock.seconds + (clock.running ? Math.max(0, serverNow - clock.serverTime) / 1_000 : 0);
}

export function formatGameClock(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(Number.isFinite(totalSeconds) ? totalSeconds : 0));
  const day = Math.floor(safe / SECONDS_PER_DAY) + 1;
  const secondOfDay = safe % SECONDS_PER_DAY;
  const hours = Math.floor(secondOfDay / SECONDS_PER_HOUR);
  const minutes = Math.floor((secondOfDay % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
  const seconds = secondOfDay % SECONDS_PER_MINUTE;
  return { day, hours, minutes, seconds, text: `Día ${day} · ${pad(hours)}:${pad(minutes)}:${pad(seconds)}` };
}

function pad(value: number) { return String(value).padStart(2, '0'); }

const daylightStops = [
  { hour: 0, ambient: .13, direct: 0, warmth: .08, phase: 'night' as const },
  { hour: 4, ambient: .14, direct: 0, warmth: .12, phase: 'night' as const },
  { hour: 5, ambient: .23, direct: .04, warmth: .38, phase: 'dawn' as const },
  { hour: 6, ambient: .48, direct: .24, warmth: .72, phase: 'dawn' as const },
  { hour: 8, ambient: .82, direct: .78, warmth: .30, phase: 'morning' as const },
  { hour: 12, ambient: 1, direct: 1, warmth: .08, phase: 'midday' as const },
  { hour: 16, ambient: .92, direct: .84, warmth: .25, phase: 'midday' as const },
  { hour: 18, ambient: .70, direct: .55, warmth: .72, phase: 'sunset' as const },
  { hour: 19, ambient: .43, direct: .18, warmth: .95, phase: 'sunset' as const },
  { hour: 20, ambient: .20, direct: .02, warmth: .48, phase: 'night' as const },
  { hour: 24, ambient: .13, direct: 0, warmth: .08, phase: 'night' as const }
];

export function naturalLightProfile(gameSeconds: number, override: EnvironmentState['timeOfDay'] = 'auto'): NaturalLightProfile {
  let seconds = Math.max(0, gameSeconds);
  if (override && override !== 'auto') {
    const forcedHour = timeOfDayHours[override];
    seconds = Math.floor(seconds / SECONDS_PER_DAY) * SECONDS_PER_DAY + forcedHour * SECONDS_PER_HOUR;
  }
  const hour = (seconds % SECONDS_PER_DAY) / SECONDS_PER_HOUR;
  let left = daylightStops[0]!, right = daylightStops.at(-1)!;
  for (let index = 1; index < daylightStops.length; index++) {
    if (hour <= daylightStops[index]!.hour) { left = daylightStops[index - 1]!; right = daylightStops[index]!; break; }
  }
  const amount = right.hour === left.hour ? 0 : (hour - left.hour) / (right.hour - left.hour);
  const phase = hour < 5 ? 'night' : hour < 7 ? 'dawn' : hour < 11 ? 'morning' : hour < 17 ? 'midday' : hour < 20 ? 'sunset' : 'night';
  return {
    phase,
    ambient: left.ambient + (right.ambient - left.ambient) * amount,
    direct: left.direct + (right.direct - left.direct) * amount,
    warmth: left.warmth + (right.warmth - left.warmth) * amount
  };
}

export function emptyClimateState(atGameSeconds = 0): ClimateState {
  return { updatedAtGameSeconds: Math.max(0, atGameSeconds), snowCoverage: 0, snowDepthCm: 0, wetness: 0, puddleCoverage: 0, fogDensity: 0, floodLevel: 0 };
}

const snowCoverFullSeconds = { 1: 3 * SECONDS_PER_HOUR, 2: SECONDS_PER_HOUR, 3: 20 * SECONDS_PER_MINUTE } as const;
const snowDepthCmPerHour = { 1: .6, 2: 1.8, 3: 5.4 } as const;
const puddleFullSeconds = { 1: 2 * SECONDS_PER_HOUR, 2: 45 * SECONDS_PER_MINUTE, 3: 15 * SECONDS_PER_MINUTE } as const;
const wetFullSeconds = { 1: 45 * SECONDS_PER_MINUTE, 2: 20 * SECONDS_PER_MINUTE, 3: 8 * SECONDS_PER_MINUTE } as const;

function approach(current: number, target: number, elapsed: number, timeConstant: number) {
  if (elapsed <= 0) return current;
  return current + (target - current) * (1 - Math.exp(-elapsed / timeConstant));
}

/** Deterministic, scene-local climate progression. It changes ambience only. */
export function advanceClimate(state: ClimateState, environment: ClimateEnvironment, targetGameSeconds: number): ClimateState {
  const target = Math.max(state.updatedAtGameSeconds, Number.isFinite(targetGameSeconds) ? targetGameSeconds : state.updatedAtGameSeconds);
  const elapsed = target - state.updatedAtGameSeconds;
  if (elapsed <= 0) return { ...state };

  const kind = environment.precipitation ?? (environment.storm ? 'rain' : 'none');
  const level = Math.max(1, Math.min(3, Math.round(environment.precipitationLevel ?? 2))) as 1 | 2 | 3;
  const temperature = environment.temperatureC ?? 10;
  let snowCoverage = state.snowCoverage;
  let snowDepthCm = state.snowDepthCm;
  let wetness = state.wetness;
  let puddleCoverage = state.puddleCoverage;

  if (kind === 'snow' && temperature <= 2) {
    snowCoverage += elapsed / snowCoverFullSeconds[level];
    snowDepthCm += elapsed / SECONDS_PER_HOUR * snowDepthCmPerHour[level];
  } else if (kind !== 'rain') {
    const thawPerHour = Math.max(0, temperature) * .035;
    snowCoverage -= elapsed / SECONDS_PER_HOUR * thawPerHour;
    snowDepthCm -= elapsed / SECONDS_PER_HOUR * Math.max(0, temperature) * .35;
  }
  if (kind === 'rain') {
    wetness += elapsed / wetFullSeconds[level];
    puddleCoverage += elapsed / puddleFullSeconds[level];
    if (temperature > 0 && snowDepthCm > 0) {
      snowDepthCm -= elapsed / SECONDS_PER_HOUR * Math.min(4, temperature * .7);
      snowCoverage -= elapsed / SECONDS_PER_HOUR * Math.min(.35, temperature * .06);
    }
  } else {
    wetness -= elapsed / SECONDS_PER_HOUR * (.06 + Math.max(0, temperature) * .008);
    puddleCoverage -= elapsed / SECONDS_PER_HOUR * (.015 + Math.max(0, temperature) * .004);
  }

  const windy=strongWind(environment as EnvironmentState);
  const fogTarget = windy ? 0 : Math.max(0, Math.min(1, environment.fogTarget ?? 0));
  const floodTarget = Math.max(0, Math.min(1, environment.floodTarget ?? 0));
  return {
    updatedAtGameSeconds: target,
    snowCoverage: clamp01(snowCoverage), snowDepthCm: Math.max(0, Math.min(500, snowDepthCm)),
    wetness: clamp01(wetness), puddleCoverage: clamp01(puddleCoverage),
    fogDensity: clamp01(approach(state.fogDensity, fogTarget, elapsed, windy ? 60 : fogTarget > state.fogDensity ? 20 * SECONDS_PER_MINUTE : 45 * SECONDS_PER_MINUTE)),
    floodLevel: clamp01(approach(state.floodLevel, floodTarget, elapsed, floodTarget > state.floodLevel ? 2 * SECONDS_PER_HOUR : 4 * SECONDS_PER_HOUR))
  };
}

export function climateUsesDifficultTerrain(climate: ClimateState, enabled: boolean) {
  return enabled && climate.snowDepthCm >= 15;
}

function clamp01(value: number) { return Math.max(0, Math.min(1, value)); }
