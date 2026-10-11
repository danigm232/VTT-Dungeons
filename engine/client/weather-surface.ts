/** Shared deposition clock: wetness and snow build and recede independently. */
export function advanceWeatherSurface(wet: number, snow: number, kind: string, intensity: number, seconds: number) {
  const level = Math.max(0, Math.min(1, intensity)), dt = Math.max(0, Math.min(1, seconds));
  return {
    wet: Math.max(0, Math.min(1, wet + dt * (kind === 'rain' ? level / 20 : -1 / 120))),
    snow: Math.max(0, Math.min(1, snow + dt * (kind === 'snow' ? level / 60 : kind === 'rain' ? -1 / 90 : -1 / 240)))
  };
}
