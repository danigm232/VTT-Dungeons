import type { PublicCampaignDefinition, VisualAsset } from '../shared/campaign';
import type { CombatCondition } from '../shared/protocol';
import { displayConditions } from '../shared/conditions';

type Animations = PublicCampaignDefinition['tokenAnimations'][string];
type Animation = Animations[string];
const playerConditionSprites: readonly string[] = ['rogue', 'silverfarben-hotel'];

/** New maps can opt other actors in; this table requests special poses only for these two players. */
export function conditionSpriteEnabled(tokenId: string, enabledTokens: readonly string[] = playerConditionSprites) {
  return enabledTokens.includes(tokenId);
}

/** Map-independent roles. An authored condition clip always takes precedence. */
const poseSources: Record<CombatCondition, readonly string[]> = {
  inconsciente: ['defeated', 'prone', 'fall', 'idle-standing', 'idle'],
  paralizada: ['ready', 'combat-idle', 'idle-standing', 'idle'],
  restringida: ['dodge', 'ready', 'hit', 'idle-standing', 'idle'],
  apresada: ['dodge', 'ready', 'hit', 'idle-standing', 'idle'],
  agarrada: ['hit', 'react', 'ready', 'idle-standing', 'idle'],
  asustada: ['react', 'dodge', 'hit', 'combat-idle', 'idle-standing', 'idle'],
  envenenada: ['hit', 'react', 'idle-standing', 'idle'],
  hechizada: ['talk', 'interact', 'idle-standing', 'idle'],
  derribada: ['prone', 'defeated', 'fall', 'idle-standing', 'idle'],
  invisible: ['stealth', 'idle-standing', 'idle'],
  oculta: ['stealth', 'dodge', 'idle-standing', 'idle']
};

export const conditionSpriteState = (condition: CombatCondition) => `condition-${condition === 'apresada' ? 'restringida' : condition}`;
export function conditionFromSpriteState(state: string): CombatCondition | undefined {
  return Object.keys(poseSources).find(condition => conditionSpriteState(condition as CombatCondition) === state) as CombatCondition | undefined;
}
export function conditionSpriteSelection(animations: Animations, condition: CombatCondition) {
  const state = conditionSpriteState(condition), authored = animations[state];
  if (authored) return { animation: authored, source: state, authored: true, groundPose: true };
  const source = poseSources[condition].find(candidate => animations[candidate]?.frames.length);
  const clip = source ? animations[source] : undefined;
  const index = source === 'fall' ? clip!.frames.length - 1 : source === 'hit' ? Math.min(1, clip!.frames.length - 1) : 0;
  const animation: Animation | undefined = clip ? { frames: [clip.frames[index]!], fps: 1, ...(clip.flipX !== undefined ? { flipX: clip.flipX } : {}) } : undefined;
  return { animation, source, authored: false, groundPose: Boolean(source && ['prone', 'defeated', 'fall'].includes(source)) };
}

/** Reuse the actor's own PNGs, including atlas crops, without loading new art. */
export function conditionSpriteAnimation(asset: VisualAsset, animations: Animations, state: string): Animation | null {
  const condition = conditionFromSpriteState(state);
  if (!condition) return null;
  return conditionSpriteSelection(animations, condition).animation ?? { frames: [asset.url], fps: 1 };
}

/** Incapacitating poses win; other poses never replace a valid attack or walk. */
export function persistentConditionState(conditions: readonly CombatCondition[], moving: boolean, acting: boolean): string | null {
  const ordered = displayConditions(conditions);
  if (ordered.includes('inconsciente')) return conditionSpriteState('inconsciente');
  if (ordered.includes('paralizada')) return conditionSpriteState('paralizada');
  if (ordered.includes('derribada')) return moving ? 'crawl' : conditionSpriteState('derribada');
  const held = ordered.some(condition => ['restringida', 'apresada', 'agarrada'].includes(condition));
  if (moving && !held || acting) return null;
  return ordered.length ? conditionSpriteState(ordered[0]!) : null;
}

/** Small, feet-pivoted gestures, also used by the 3D painted cards. */
export function conditionSpriteMotion(state: string, clockMs: number, height: number, groundPose = true, reducedMotion = false) {
  const condition = conditionFromSpriteState(state), wave = reducedMotion ? 0 : Math.sin(clockMs * .0016);
  const result = { x: 0, y: 0, lean: 0, scaleX: 1, scaleY: 1, tint: 0xffffff };
  if (!condition) return result;
  switch (condition) {
    case 'envenenada': result.lean = .028 + wave * .012; result.scaleY = .98; result.tint = 0xe9f4e5; break;
    case 'asustada': result.x = reducedMotion ? 0 : Math.sin(clockMs * .012) * height * .0025; result.lean = -.035; break;
    case 'paralizada': result.tint = 0xe9edf8; break;
    case 'restringida': case 'apresada': result.scaleY = .98; result.lean = wave * .007; break;
    case 'agarrada': result.lean = -.025 + wave * .006; break;
    case 'hechizada': result.lean = wave * .008; result.tint = 0xfff1f6; break;
    case 'oculta': result.scaleY = .96; break;
    case 'invisible': result.tint = 0xe5f5fa; break;
    case 'inconsciente': case 'derribada':
      if (!groundPose) { result.lean = 1.24; result.scaleX = .85; result.scaleY = .85; }
      break;
  }
  return result;
}
