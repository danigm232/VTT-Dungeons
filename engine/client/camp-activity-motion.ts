import { interactionTiming } from './interaction-animation.js';
/** Small, grounded gestures supplement the existing painted poses. */
export function campActivityMotion(state: string, elapsedMs: number, durationMs: number, height: number) {
  state = state.replace(/-(n|ne|e|se|s|sw|w|nw)$/, '');
  const timing = interactionTiming(elapsedMs, durationMs);
  const envelope = timing.reach, cycle = timing.seconds;
  let lean = 0, x = 0, y = 0;
  if (state === 'camp-warm') lean = .025 * Math.sin(cycle * 2) * envelope;
  else if (state === 'camp-cook') { lean = .035 * Math.sin(cycle * 5) * envelope; x = height * .012 * Math.sin(cycle * 5) * envelope; }
  else if (state === 'camp-tend-fire' || state === 'camp-prepare-bed' || state === 'camp-shelter') lean = .085 * Math.sin(cycle * 3) * envelope;
  else if (state === 'camp-study' || state === 'camp-tools' || state === 'camp-inspect') lean = .04 * envelope + .012 * Math.sin(cycle * 4) * envelope;
  else if (state === 'camp-pray') lean = .065 * envelope;
  else if (state === 'camp-rest') { lean = .11 * envelope; y = -height * .008 * Math.sin(cycle * 2) * envelope; }
  else if (state === 'camp-guard') lean = .025 * Math.sin(cycle * 1.7) * envelope;
  return { lean, x, y };
}
