import { describe, expect, it } from 'vitest';
import { readUiPreferences, writeUiPreferences, type PreferenceStorage } from './ui-preferences';

function memoryStorage(initial: Record<string, string> = {}): PreferenceStorage {
  const values = new Map(Object.entries(initial));
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); }
  };
}

describe('preferencias de interfaz', () => {
  it('restaura sólo valores guardados con la forma esperada', () => {
    const storage = memoryStorage({ 'dm-ui': JSON.stringify({ showGrid: false }) });
    const isValid = (value: unknown): value is { showGrid: boolean } => Boolean(value && typeof value === 'object' && typeof (value as { showGrid?: unknown }).showGrid === 'boolean');
    expect(readUiPreferences('dm-ui', { showGrid: true }, isValid, storage)).toEqual({ showGrid: false });
  });

  it('recupera valores por defecto ante JSON roto o preferencias antiguas inválidas', () => {
    const storage = memoryStorage({ broken: '{', old: JSON.stringify({ showGrid: 'false' }) });
    const fallback = { showGrid: true };
    const isValid = (value: unknown): value is typeof fallback => Boolean(value && typeof value === 'object' && typeof (value as { showGrid?: unknown }).showGrid === 'boolean');
    expect(readUiPreferences('broken', fallback, isValid, storage)).toBe(fallback);
    expect(readUiPreferences('old', fallback, isValid, storage)).toBe(fallback);
  });

  it('informa si las preferencias se guardaron y sigue funcionando si el almacenamiento falla', () => {
    const storage = memoryStorage();
    expect(writeUiPreferences('player-ui', { showGrid: false }, storage)).toBe(true);
    expect(readUiPreferences('player-ui', { showGrid: true }, (value): value is { showGrid: boolean } => Boolean(value && typeof value === 'object' && typeof (value as { showGrid?: unknown }).showGrid === 'boolean'), storage)).toEqual({ showGrid: false });
    const blocked: PreferenceStorage = { getItem: () => { throw new Error('bloqueado'); }, setItem: () => { throw new Error('bloqueado'); } };
    expect(readUiPreferences('blocked', { showGrid: true }, (_value): _value is { showGrid: boolean } => true, blocked)).toEqual({ showGrid: true });
    expect(writeUiPreferences('blocked', {}, blocked)).toBe(false);
  });
});
