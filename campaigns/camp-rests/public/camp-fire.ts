import { strongWind } from '../../../engine/shared/weather.js';
import type { EnvironmentState } from '../../../engine/shared/protocol.js';
import type { CampRestState } from '../../../engine/shared/camp-rest.js';

/** Ambient fire only. Never changes rest eligibility, damage, inventory or rolls. */
export class CampFire {
  fuel = 1;
  heat = 1;
  private lastTending = '';
  constructor(readonly pointId: string, readonly sheltered = false) {}
  update(seconds: number, dark: number, environment?: EnvironmentState, interactions: CampRestState['interactions'] = [], now = Date.now()) {
    const dt = Math.max(0, Math.min(1, seconds));
    const kind = environment?.precipitation ?? (environment?.storm ? 'rain' : 'none');
    const windy=Boolean(environment&&strongWind(environment)&&!this.sheltered);
    const rain = kind === 'rain' && !this.sheltered ? environment?.precipitationLevel ?? 2 : 0;
    const lit = dark > .2;
    const entry = [...interactions].reverse().find(i => i.pointId === this.pointId && i.activityId === 'tend-fire');
    const key = entry ? `${entry.characterId}:${entry.at}` : '';
    if (entry && key !== this.lastTending && now >= entry.at) {
      this.lastTending = key;
      // The gesture may expire while a device compiles shaders. The accepted
      // tending action still replenishes the visual fire once when received.
      this.fuel = 1; this.heat = Math.max(this.heat, .55);
    }
    if (lit) {
      this.fuel = Math.max(0, this.fuel - dt * (rain === 3 || windy ? 1 / 6 : rain === 2 ? 1 / 45 : 0));
      this.heat = Math.max(0, this.heat - dt * (rain === 3 || windy ? 1 / 28 : rain === 2 ? 1 / 150 : 0));
    }
    const flame = lit ? this.fuel * (rain === 1 ? .85 : rain === 2 ? .62 : 1) : 0;
    return { flame, embers: lit ? this.heat : 0, smoke: lit ? (rain ? .6 + this.heat * (rain === 3 ? 2.8 : rain === 2 ? 2.3 : 1.5) : this.fuel) : 0, rain, lit };
  }
}
export type CampFireLevel = ReturnType<CampFire['update']>;
