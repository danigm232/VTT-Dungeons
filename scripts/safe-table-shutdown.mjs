/** Negotiate before sending a request that can close a running table. */
export async function requestSafeTableShutdown({ port, token, request = fetch }) {
  const url = `http://127.0.0.1:${port}/__local/shutdown`;
  const headers = { 'x-dungeons-shutdown-token': token };
  const capability = await request(url, { headers, signal: AbortSignal.timeout(5_000) });
  if (!capability.ok || (await capability.json()).saveBeforeShutdown !== true) {
    throw new Error('Esta mesa usa un servidor anterior sin cierre confirmado. Pulsa Guardar ahora en DM y ciérrala manualmente una vez antes de actualizar.');
  }
  const response = await request(url, { method: 'POST', headers, signal: AbortSignal.timeout(20_000) });
  if (response.status !== 202 || (await response.json()).safeToRestart !== true) {
    throw new Error('La mesa no confirmó el guardado final. Se ha cancelado la actualización; conserva la mesa abierta y exporta una copia desde DM.');
  }
}
