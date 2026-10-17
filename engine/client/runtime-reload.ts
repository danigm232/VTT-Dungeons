export type RuntimeReset = {
  runtimeEpoch: string;
  cause?: 'connection' | 'restore';
  reason?: string;
};

// A restore replaces game state; a new server also replaces the application
// and campaign catalogue, which must be fetched again by connected browsers.
export function shouldReloadAfterServerReconnect(previous: string | null, event: RuntimeReset): boolean {
  return previous !== null && previous !== event.runtimeEpoch
    && (event.cause === 'connection' || (!event.cause && event.reason === 'Conexión establecida.'));
}
