import type { CombatParticipant } from '../shared/protocol';

/** A prediction, not a new initiative roll. Repeated portraits cross round boundaries. */
export function combatTimeline(order: readonly { id: string }[], participants: readonly CombatParticipant[], currentId: string | null, round: number, limit = 7) {
  const byId = new Map(participants.map(actor => [actor.id, actor]));
  const turns = order.map(entry => byId.get(entry.id)).filter((actor): actor is CombatParticipant => Boolean(actor?.active));
  if (!turns.length || !currentId || !turns.some(actor => actor.id === currentId)) return [];
  const start = turns.findIndex(actor => actor.id === currentId);
  return Array.from({ length: Math.min(7, Math.max(0, Math.floor(limit))) }, (_, index) => ({
    participant: turns[(start + index) % turns.length]!, index,
    round: round + Math.floor((start + index) / turns.length),
    horizon: index === 0 ? 'current' : index <= 3 ? 'next' : 'later'
  }));
}

/** Open once per own turn, never on every repeated network snapshot. */
export function combatWheelTurnKey(input: { active: boolean; pending: boolean; isTurn: boolean; blocked: boolean; runtimeEpoch: string; sceneEpoch: number; round: number; actorId: string | null }) {
  return input.active && !input.pending && input.isTurn && !input.blocked && input.actorId
    ? `${input.runtimeEpoch}:${input.sceneEpoch}:${input.round}:${input.actorId}` : null;
}
