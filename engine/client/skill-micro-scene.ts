export const skillAbilities = {
  str: 'Fuerza', dex: 'Destreza', int: 'Inteligencia', wis: 'Sabiduría', cha: 'Carisma'
} as const;

export const defaultSkillDC = 12;

export type ActorAnimation = 'idle_balance' | 'run_loop' | 'idle_inspect' | 'idle_talk' | 'idle_read'
  | 'idle_play' | 'idle_brace' | 'idle_crouch' | 'idle_listen' | 'sneak_loop' | 'idle_reach' | 'hand_interact'
  | 'idle_prepare' | 'point' | 'jump' | 'slip' | 'walk_loop' | 'reach' | 'idle_breath' | 'idle_listen_away' | 'hang' | 'climb';

export type Motion = { x?: number; y?: number; tilt?: number; scale?: number; opacity?: number; cue?: number; facing?: 1 | -1 };
export type Track = readonly (readonly [at: number, motion: Motion])[];

export type SceneProp = {
  id: string;
  art: string;
  x: number;
  y: number;
  front?: boolean;
  anchor?: 'hand' | 'head';
  ambient?: Track;
  success?: Track;
  failure?: Track;
};

export type SkillAction = {
  animation: ActorAnimation;
  beats?: readonly (readonly [start: number, animation: ActorAnimation])[];
  actor?: Track;
  caption: string;
  /** A living final pose. The challenge never replays after a resolved roll. */
  settledAnimation?: ActorAnimation;
};

export type SkillMicroScene = {
  id: string;
  name: string;
  ability: keyof typeof skillAbilities;
  prompt: string;
  description: string;
  ambientAnimation: ActorAnimation;
  preparationAnimation: ActorAnimation;
  successAnimation: SkillAction;
  failureAnimation: SkillAction;
  recoveryAnimation: ActorAnimation;
  actor: { x: number; y: number; ambient?: Track };
  props: readonly SceneProp[];
  terrain?: 'chasm';
  sound?: 'instrument';
  defaultDC: number;
};

export function skillSceneRoles(scene: SkillMicroScene) {
  const roles = new Set<ActorAnimation>([scene.ambientAnimation, scene.preparationAnimation, scene.recoveryAnimation, 'idle_breath']);
  for (const action of [scene.successAnimation, scene.failureAnimation]) {
    roles.add(action.animation);
    for (const [, animation] of action.beats ?? []) roles.add(animation);
  }
  return roles;
}

const motionDefaults: Required<Motion> = { x: 0, y: 0, tilt: 0, scale: 1, opacity: 1, cue: 0, facing: 1 };

export function blendMotion(from: Motion, to: Motion, mix: number): Required<Motion> {
  const a = { ...motionDefaults, ...from }, b = { ...motionDefaults, ...to };
  const lerp = (start: number, end: number) => start + (end - start) * mix;
  return { x: lerp(a.x, b.x), y: lerp(a.y, b.y), tilt: lerp(a.tilt, b.tilt),
    scale: lerp(a.scale, b.scale), opacity: lerp(a.opacity, b.opacity), cue: lerp(a.cue, b.cue), facing: mix < .5 ? a.facing : b.facing };
}

export function sampleTrack(track: Track | undefined, at: number): Motion {
  if (!track?.length) return motionDefaults;
  const right = track.findIndex(([time]) => time > at);
  if (right === 0) return track[0]![1];
  if (right < 0) return track[track.length - 1]![1];
  const [start, from] = track[right - 1]!, [end, to] = track[right]!;
  const mix = (at - start) / (end - start);
  return blendMotion(from, to, mix * mix * (3 - 2 * mix));
}

export type SkillRoll = { natural: number; modifier?: number; total: number; success: boolean };
export type SkillPhase = 'INIT' | 'AMBIENT_LOOP' | 'D20_PRESSED' | 'ROLL' | 'ACTION_PREPARE'
  | 'SUCCESS' | 'FAILURE' | 'REACTION' | 'OUTCOME_LOOP';

export const skillTimings = { pressed: 85, roll: 1115, prepare: 400, action: 3800, reaction: 700 } as const;
export const skillOutcomeStartsAt = Object.values(skillTimings).reduce((sum, ms) => sum + ms, 0);

export class SkillMicroScenePlayback {
  private pressedAt: number | undefined;
  result: SkillRoll | undefined;
  readonly dc: number;

  constructor(readonly scene: SkillMicroScene, private readonly startedAt: number, dc = scene.defaultDC) {
    this.dc = Number.isSafeInteger(dc) && dc > 0 ? dc : scene.defaultDC;
  }

  roll(now: number, modifier?: number, random = Math.random): boolean {
    if (this.result) return false;
    const natural = 1 + Math.floor(random() * 20);
    const bonus = Number.isSafeInteger(modifier) ? modifier : undefined;
    const total = natural + (bonus ?? 0);
    this.result = { natural, modifier: bonus, total, success: total >= this.dc };
    this.pressedAt = now;
    return true;
  }

  frame(now: number): { phase: SkillPhase; progress: number; ambientMs: number; elapsedMs: number } {
    const ambientMs = Math.max(0, (this.pressedAt ?? now) - this.startedAt);
    if (now < this.startedAt) return { phase: 'INIT', progress: 0, ambientMs, elapsedMs: 0 };
    if (this.pressedAt !== undefined) {
      const timings: readonly (readonly [SkillPhase, number])[] = [
        ['D20_PRESSED', skillTimings.pressed], ['ROLL', skillTimings.roll], ['ACTION_PREPARE', skillTimings.prepare],
        [this.result?.success ? 'SUCCESS' : 'FAILURE', skillTimings.action], ['REACTION', skillTimings.reaction]
      ];
      let elapsed = Math.max(0, now - this.pressedAt);
      for (const [phase, duration] of timings) {
        if (elapsed < duration) return { phase, progress: elapsed / duration, ambientMs, elapsedMs: elapsed };
        elapsed -= duration;
      }
      return { phase: 'OUTCOME_LOOP', progress: 1, ambientMs, elapsedMs: elapsed };
    }
    return { phase: 'AMBIENT_LOOP', progress: 0, ambientMs, elapsedMs: ambientMs };
  }
}
