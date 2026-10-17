import type { PublicCampaignDefinition } from '../shared/campaign.js';
import { playerWalkFrames } from './player-walk-frames.js';

type Animation = PublicCampaignDefinition['tokenAnimations'][string][string];
const directions = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'] as const;
type Direction = typeof directions[number];
type Player = 'trinity' | 'silverfarben';
const profiles = new Map<Player, PublicCampaignDefinition['tokenAnimations'][string]>();

function profile(player: Player) {
  if (profiles.has(player)) return profiles.get(player)!;
  const result: PublicCampaignDefinition['tokenAnimations'][string] = {};
  for (const direction of directions) {
    // Two accepted mirror aliases; the generated alternatives faced the wrong way.
    const source: Direction = player === 'trinity' && direction === 'e' ? 'w'
      : player === 'silverfarben' && direction === 'sw' ? 'se' : direction;
    const key = `${player}-${source}-walk-v2` as keyof typeof playerWalkFrames;
    const walk: Animation = {
      frames: playerWalkFrames[key].frames.map(frame => ({ ...frame,
        url: `/art/player-walks-v2/${key}.png`,
        alphaSeeds: frame.alphaSeeds.map(seed => [seed[0], seed[1]] as [number, number]) })),
      fps: 16, flipX: source !== direction
    };
    result[`moving-${direction}`] = result[`direction-${direction}`] = walk;
    // A faster clean walk is intentional reuse, NOT a newly drawn sprint cycle.
    result[`running-${direction}`] = { ...walk, fps: 20 };
    const rest: Animation = { frames: [walk.frames[0]!], fps: 1, flipX: walk.flipX };
    for (const state of ['idle', 'idle-standing', 'combat-idle']) result[`${state}-${direction}`] = rest;
  }
  result.moving = result['moving-s']!; result.running = result['running-s']!;
  profiles.set(player, result); return result;
}

/** Install only on the two known skins. Does not add/reveal actors, change rules,
 * attacks, conditions, seats or authored camp interactions. Also handles an old
 * API catalogue from a server that must keep its in-memory game running. */
export function installPlayerLocomotion(campaign: PublicCampaignDefinition) {
  const candidates: Array<[string, Player, string[]]> = [
    ['rogue', 'trinity', ['/art/tokens/Maria Trinity D8/maria_base.png', '/art/m3/trinity/maria_base.png']],
    ['silverfarben-hotel', 'silverfarben', ['/art/tokens/Silverfarben Hotel/silverfarben_hotel_base.png']]
  ];
  for (const [tokenId, player, skins] of candidates) {
    if (!skins.includes(campaign.tokens[tokenId]?.url ?? '')) continue;
    const states = campaign.tokenAnimations[tokenId]; if (!states) continue;
    Object.assign(states, profile(player));
  }
  return campaign;
}

/** Turning and changing walk/run speed retain the normalized stride phase.
 * Starting/stopping or switching to an action always starts a fresh clock. */
export function locomotionEpoch(previousState: string | null | undefined, nextState: string,
  startedAt: number, now: number, previous?: Animation | null, next?: Animation | null) {
  const isLocomotion = (state?: string | null) => /^(moving|direction|running)(?:-(n|ne|e|se|s|sw|w|nw))?$/.test(state ?? '');
  if (!isLocomotion(previousState) || !isLocomotion(nextState) || !previous?.frames.length || !next?.frames.length) return now;
  const duration = previous.frames.length * 1000 / previous.fps;
  const phase = (Math.max(0, now - startedAt) % duration) / duration;
  return now - phase * next.frames.length * 1000 / next.fps;
}
