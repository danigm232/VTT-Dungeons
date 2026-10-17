import type { PublicCampaignDefinition } from '../shared/campaign';

type Animations = PublicCampaignDefinition['tokenAnimations'][string];
type Animation = Animations[string];
const derived = new WeakMap<Animations, Map<string, { source: Animation; animation: Animation }>>();
const headingFixes = new WeakMap<Animation, Map<string, { source: Animation; animation: Animation }>>();

/** These legacy Silverfarben atlases were labelled with reversed rear diagonals.
 * Correct only the known files, including catalogues from an already running server. */
export function correctDirectionalClip(state: string, clip: Animation, animations: Animations): Animation {
  const first = clip.frames[0];
  if (!first || typeof first === 'string') return clip;
  const walk = first.url.endsWith('/Silverfarben Hotel/silverfarben_hotel_walk_orientations_atlas.png');
  const run = first.url.endsWith('/Silverfarben Hotel/silverfarben_hotel_run_orientations_atlas.png');
  const match = /^(moving|direction|running)-(n|ne|nw)$/.exec(state);
  if (!match || !walk && !run) return clip;
  const suffix = match[2]!;
  let source = clip, flipX = clip.flipX ?? false;
  if (walk && (suffix === 'ne' || suffix === 'nw')) flipX = suffix === 'ne';
  if (run && suffix === 'n') { source = animations['moving-n'] ?? animations['direction-n'] ?? clip; flipX = source.flipX ?? false; }
  if (run && (suffix === 'ne' || suffix === 'nw')) {
    const back = animations['running-n'], backFrame = back?.frames[0];
    if (first.y >= 750 && backFrame && typeof backFrame !== 'string' && backFrame.url === first.url && backFrame.y < 750) source = back!;
    flipX = suffix === 'ne';
  }
  if (source === clip && flipX === (clip.flipX ?? false)) return clip;
  let cache = headingFixes.get(clip); if (!cache) { cache = new Map(); headingFixes.set(clip, cache); }
  let entry = cache.get(state);
  if (!entry || entry.source !== source) { entry = { source, animation: { ...clip, frames: source.frames, flipX } }; cache.set(state, entry); }
  return entry.animation;
}

/** An older running server must not erase newly shipped visual directions.
 * Remote authored clips win. Only missing facing art survives, not old actions. */
export function mergeDirectionalArt(local: Animations, incoming: Animations): Animations {
  const result = { ...incoming };
  for (const [state, clip] of Object.entries(local)) {
    if (/^(idle|idle-standing|combat-idle|direction|moving|running)-(n|ne|e|se|s|sw|w|nw)$/.test(state) && !result[state]) result[state] = clip;
  }
  return result;
}

/** Rest clips are screen-relative, just like walks. Never loop a walk after release. */
export function directionalRestAnimation(animations: Animations, state: string): Animation | null {
  const match = /^(idle|idle-standing|combat-idle)-(n|ne|e|se|s|sw|w|nw)$/.exec(state);
  if (!match) return null;
  if (animations[state]?.frames.length) return animations[state]!;
  const suffix = match[2]!;
  const sourceState = animations[`moving-${suffix}`] ? `moving-${suffix}` : `direction-${suffix}`;
  const rawSource = animations[sourceState];
  if (!rawSource?.frames.length) return null;
  const source = correctDirectionalClip(sourceState, rawSource, animations);
  let cache = derived.get(animations);
  if (!cache) { cache = new Map(); derived.set(animations, cache); }
  let entry = cache.get(state);
  if (!entry || entry.source !== source) {
    // Keep the original crop/scale/anchor and explicit mirroring. Do not copy
    // a locomotion motion descriptor into a stationary pose.
    const animation: Animation = { frames: [source.frames[0]!], fps: 1, flipX: source.flipX ?? false };
    entry = { source, animation }; cache.set(state, entry);
  }
  return entry.animation;
}
