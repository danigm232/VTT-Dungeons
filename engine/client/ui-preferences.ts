export type PreferenceStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** Load one validated UI preference object without letting broken storage block a screen. */
export function readUiPreferences<T>(key: string, fallback: T, isValid: (value: unknown) => value is T, storage?: PreferenceStorage): T {
  try {
    const target = storage ?? localStorage;
    const raw = target.getItem(key);
    if (raw === null) return fallback;
    const value: unknown = JSON.parse(raw);
    return isValid(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

/** Store screen preferences only; campaign state continues to use the save system. */
export function writeUiPreferences<T>(key: string, value: T, storage?: PreferenceStorage): boolean {
  try {
    const target = storage ?? localStorage;
    target.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
