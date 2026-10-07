import { describe, expect, it } from 'vitest';
import { relativeTime, savePresentation } from '../../apps/web/ui/dm/presentation';
const ready = { mode: 'ready', dirty: false, savedAt: '2026-10-06T10:00:00Z', errorCode: null, savedStateRevision: 7, stateRevision: 7 };
describe('DM save presentation without persistence changes', () => {
  it('shows successful saving only for the current revision', () => {
    expect(savePresentation(ready).tone).toBe('positive');
    for (const status of [{ ...ready, dirty: true }, { ...ready, stateRevision: 8 }, { ...ready, savedAt: null }]) expect(savePresentation(status).tone).toBe('pending');
  });
  it.each(['error', 'recovery', 'incompatible'])('never masks %s with an old successful copy', mode => {
    expect(savePresentation({ ...ready, mode }).alert).toBe(true);
    expect(savePresentation({ ...ready, mode }).tone).toBe('error');
  });
  it('distinguishes loading, saving and restoring', () => {
    expect(savePresentation(null).tone).toBe('pending');
    expect(savePresentation({ ...ready, mode: 'saving' }).title).toBe('Guardando…');
    expect(savePresentation({ ...ready, mode: 'restoring' }).title).toBe('Restaurando…');
  });
  it('formats elapsed times and invalid dates safely', () => {
    expect(relativeTime(ready.savedAt, Date.parse('2026-10-06T10:02:00Z'))).toBe('Hace 2 min');
    expect(relativeTime(ready.savedAt, Date.parse('2026-10-06T09:00:00Z'))).toBe('Hace un momento');
    expect(relativeTime('invalid')).toBe('Fecha no disponible');
  });
});
