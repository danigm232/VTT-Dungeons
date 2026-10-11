import type { CombatCondition, ConditionSource } from './protocol.js';

export const ROUND_DURATION_MS = 6_000;
export const conditionPresentation: Record<CombatCondition, { label: string; glyph: string; color: string }> = {
  envenenada: { label: 'Envenenado', glyph: '☠', color: '#8bc98c' },
  apresada: { label: 'Restringido', glyph: '⊠', color: '#c5a3df' },
  restringida: { label: 'Restringido', glyph: '⊠', color: '#c5a3df' },
  agarrada: { label: 'Agarrado', glyph: '⛓', color: '#8cb9d6' },
  derribada: { label: 'Derribado', glyph: '↧', color: '#dfbc80' },
  asustada: { label: 'Asustado', glyph: '!', color: '#e3ca87' },
  inconsciente: { label: 'Inconsciente', glyph: '☾', color: '#bbc5d6' },
  oculta: { label: 'Oculto', glyph: '◌', color: '#b7c6bd' },
  invisible: { label: 'Invisible', glyph: '◇', color: '#9cd1d6' },
  hechizada: { label: 'Hechizado', glyph: '♡', color: '#dda6bb' },
  paralizada: { label: 'Paralizado', glyph: '✣', color: '#a8b8e1' }
};
export const conditionOrder: CombatCondition[] = ['inconsciente', 'paralizada', 'restringida', 'apresada', 'agarrada', 'asustada', 'envenenada', 'hechizada', 'derribada', 'invisible', 'oculta'];
export function displayConditions(conditions: readonly CombatCondition[]) {
  return conditionOrder.filter(condition => conditions.includes(condition) && !(condition === 'apresada' && conditions.includes('restringida')));
}
/** Legacy round anchors are interpreted only when upgrading an old save. */
export function conditionRemainingMs(source: ConditionSource, now: number, round = 0): number | undefined {
  if (source.expiresAt !== undefined) return Math.max(0, source.expiresAt - now);
  if (source.remainingMs !== undefined) return source.remainingMs;
  if (source.durationSeconds !== undefined) return source.durationSeconds * 1000;
  if (source.durationRounds !== undefined) return Math.max(0, source.durationRounds - Math.max(0, round - (source.appliedAtRound ?? round))) * ROUND_DURATION_MS;
  return undefined;
}
export function conditionDurationLabel(source: ConditionSource, now = Date.now()) {
  if (source.sourceAbility === 'zero-hp') return 'Hasta recuperar PG o decisión del DM';
  const ms = conditionRemainingMs(source, now);
  if (ms === undefined) return source.escapeDc ? `Escapar · CD ${source.escapeDc}` : source.endsWhenSourceDefeated ? 'Hasta vencer al origen' : 'Sin caducidad automática';
  if (source.expiresAt === undefined) {
    const rounds = Math.ceil(ms / ROUND_DURATION_MS);
    return `${rounds} ${rounds === 1 ? 'ronda' : 'rondas'}${source.expiryTurn ? ` · ${source.expiryTurn === 'start' ? 'inicio' : 'final'} de su turno` : ''}`;
  }
  const seconds = Math.ceil(ms / 1000);
  return seconds >= 60 ? `${Math.floor(seconds / 60)} min ${String(seconds % 60).padStart(2, '0')} s` : `${seconds} s`;
}
