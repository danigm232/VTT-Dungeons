import type { ActorAnimation } from '../../../engine/client/skill-micro-scene';

type SpriteFrame = { url: string; x: number; y: number; width: number; height: number; anchorX: number; anchorY: number };
type Profile = { url: string; columns: number; rows: number; width: number; height: number; referenceHeight: number; sources: readonly string[] };

const profiles: readonly Profile[] = [
  { url: new URL('./art/skill-cleric-v2.webp', import.meta.url).href, columns: 4, rows: 6, width: 1024, height: 1536, referenceHeight: 234,
    sources: ['/art/tokens/cleric.png'] },
  { url: new URL('./art/skill-wizard-v2.webp', import.meta.url).href, columns: 4, rows: 6, width: 1024, height: 1536, referenceHeight: 231,
    sources: ['/art/tokens/wizard.png'] },
  { url: new URL('./art/skill-rogue-v2.webp', import.meta.url).href, columns: 4, rows: 6, width: 1024, height: 1536, referenceHeight: 246,
    sources: ['/art/m3/trinity/maria_base.png', '/art/tokens/Maria Trinity D8/maria_base.png'] }
];

const roleRows: Record<ActorAnimation, { row: number; fps: number; order?: readonly number[] }> = {
  run_loop: { row: 0, fps: 9 }, walk_loop: { row: 0, fps: 5 },
  idle_read: { row: 1, fps: 3.2 }, idle_inspect: { row: 1, fps: 3.6 },
  idle_talk: { row: 2, fps: 4 }, idle_listen: { row: 2, fps: 2.6, order: [3, 0, 3, 1] },
  idle_listen_away: { row: 2, fps: 2.6, order: [3, 0, 3, 1] },
  idle_breath: { row: 1, fps: 2.5 }, idle_prepare: { row: 3, fps: 4, order: [0, 0, 1, 0] },
  jump: { row: 3, fps: 6 }, slip: { row: 3, fps: 5, order: [1, 2, 3, 3] },
  hang: { row: 3, fps: 3, order: [2, 2, 2, 2] }, climb: { row: 3, fps: 6, order: [2, 1, 0, 3] },
  sneak_loop: { row: 4, fps: 5.5 }, idle_crouch: { row: 5, fps: 3.4 },
  hand_interact: { row: 1, fps: 5 }, reach: { row: 2, fps: 5, order: [0, 1, 2, 1] },
  point: { row: 2, fps: 3.5, order: [0, 1, 1, 2] }, idle_reach: { row: 2, fps: 3, order: [0, 1, 2, 0] },
  idle_play: { row: 1, fps: 6 }, idle_balance: { row: 2, fps: 3.3, order: [0, 1, 2, 3] },
  idle_brace: { row: 2, fps: 3, order: [0, 2, 3, 0] }
};

export function skillActorSequence(source: string, role: ActorAnimation) {
  const profile = profiles.find(profile => profile.sources.includes(source));
  if (!profile) return undefined;
  const { row, fps, order = [0, 1, 2, 3] } = roleRows[role];
  const width = profile.width / profile.columns, height = profile.height / profile.rows;
  const frames: SpriteFrame[] = order.map(column => ({ url: profile.url, x: column * width, y: row * height,
    width, height, anchorX: .5, anchorY: .9 }));
  return { clip: { frames, fps, loop: role !== 'jump' }, mirror: role === 'idle_listen_away', authored: true,
    referenceHeight: profile.referenceHeight };
}
