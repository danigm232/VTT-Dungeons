import { describe, expect, it } from 'vitest';
import { shouldReloadAfterServerReconnect } from './runtime-reload';

describe('application refresh after restart', () => {
  it('keeps the initial connection and a Wi-Fi reconnection without reloading', () => {
    expect(shouldReloadAfterServerReconnect(null, { runtimeEpoch: 'a', cause: 'connection' })).toBe(false);
    expect(shouldReloadAfterServerReconnect('a', { runtimeEpoch: 'a', cause: 'connection' })).toBe(false);
  });
  it('refreshes the application after a server restart, including the previous event format', () => {
    expect(shouldReloadAfterServerReconnect('a', { runtimeEpoch: 'b', cause: 'connection' })).toBe(true);
    expect(shouldReloadAfterServerReconnect('a', { runtimeEpoch: 'b', reason: 'Conexión establecida.' })).toBe(true);
  });
  it('does not reload the browser when the DM restores a save', () => {
    expect(shouldReloadAfterServerReconnect('a', { runtimeEpoch: 'b', cause: 'restore' })).toBe(false);
    expect(shouldReloadAfterServerReconnect('a', { runtimeEpoch: 'b', reason: 'Partida restaurada. Sincronizando la mesa…' })).toBe(false);
  });
});
