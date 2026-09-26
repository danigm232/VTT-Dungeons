// Probes de regresión sobre el build compilado. No certifican hardware físico.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { GameState, GameServer } from '../dist/server/engine/server/game.js';
import { stormwreckBundle } from '../dist/server/campaigns/stormwreck-isle/server.js';

let failed = 0;
async function check(name, fn) {
  try { await fn(); console.log(`PASS ${name}`); }
  catch (error) { failed++; console.log(`FAIL ${name}: ${error.message}`); }
}
const transport = { to: () => ({ emit() {} }), sockets: { sockets: new Map() } };

await check('HTML DM sin notas privadas antes de autenticar', async () => {
  const html = await readFile(new URL('../dist/web/apps/web/dm.html', import.meta.url), 'utf8');
  assert.ok(!html.includes('La arpía está fuera al llegar'), 'nota privada en HTML público');
  assert.ok(!html.includes('Destreza CD 10'), 'resolución del timón en HTML público');
});
await check('Foco de cámara no revela una criatura oculta', () => {
  const state = new GameState(stormwreckBundle);
  state.camera.focusId = state.creature.id;
  assert.ok(!JSON.stringify(state.publicSnapshot()).includes(state.creature.id), 'camera.focusId filtra el id oculto');
});
await check('Teletransporte rechaza el palo mayor', () => {
  const game = new GameServer(transport, 'audit-only', stormwreckBundle);
  game.state.changeScene('wreck-deck');
  const result = game.applyDmCommand({ type: 'teleport', commandId: crypto.randomUUID(), sceneEpoch: game.state.sceneEpoch, entityId: 'mike', cell: { col: 15, row: 9 } });
  assert.equal(result.ok, false, 'se aceptó la casilla del palo mayor');
});
await check('Teletransporte valida límites durante aproximación', () => {
  const game = new GameServer(transport, 'audit-only', stormwreckBundle);
  const result = game.applyDmCommand({ type: 'teleport', commandId: crypto.randomUUID(), sceneEpoch: game.state.sceneEpoch, entityId: 'mike', cell: { col: 31, row: 1 } });
  assert.equal(result.ok, false, 'se aceptó una casilla fuera del bote');
});

console.log(`Auditoría: ${failed} fallo(s). Estos probes usan el build actual; móvil y proyector físicos requieren comprobación separada.`);
process.exitCode = failed ? 1 : 0;
