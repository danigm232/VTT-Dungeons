// Read-only campaign audit. No sockets, live save reads or gameplay writes.
// Run: node node_modules/tsx/dist/cli.mjs scripts/audit-d8-animations.ts
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { oneShotBundle } from '../campaigns/one-shot/server.js';
import { GameState } from '../engine/server/game.js';
import { auditActions, visibleAuditActors } from '../engine/client/d8-animation-audit.js';

const state = new GameState(oneShotBundle);
state.claim('a'.repeat(32), 'audit-maria', 'maria'); state.claim('b'.repeat(32), 'audit-silver', 'aoife');
const report = { createdAt: new Date().toISOString(), scope: 'Defined D8 actions and clips, not human artistic approval or arbitrary improvised actions', scenes: [] as unknown[], missing: 0, checked: 0, uniquePngs: 0 };
const urls = new Set<string>();
for (const scene of state.campaign.public.scenes) {
  state.changeScene(scene.id);
  for (const npc of state.npcs.values()) if (npc.sceneId === scene.id) state.setNpcVisible(npc.id, true);
  if (scene.id === 'garden') state.revealEncounterGroup('roses', 6);
  if (scene.id === 'cafe') state.revealEncounterGroup('patrons', 10);
  if (scene.id === 'mirror') { state.prepareMirrorEncounter('maria'); if (state.creature) state.creature.visible = true; }
  const snapshot = state.publicSnapshot(true), dm = state.dmState();
  const auditNow = Date.now(), before = JSON.stringify(state.captureDurable(auditNow));
  const actors = visibleAuditActors(snapshot, state.campaign.public.campaignId).map(actor => {
    const actions = auditActions(actor, snapshot, dm, state.campaign.public);
    for (const animation of Object.values(snapshot.tokenAssets.tokenAnimations[actor.tokenId] ?? {})) for (const frame of animation.frames) {
      const url = typeof frame === 'string' ? frame : frame.url; urls.add(url);
      assert.ok(existsSync(path.resolve('campaigns/one-shot/public', url.slice(1))), `Asset missing: ${url}`);
    }
    report.checked += actions.length; report.missing += actions.filter(action => action.coverage === 'missing').length;
    return { id: actor.id, label: actor.label, tokenId: actor.tokenId, actions };
  });
  assert.equal(JSON.stringify(state.captureDurable(auditNow)), before, 'The audit changed game state');
  report.scenes.push({ id: scene.id, actors });
}
report.uniquePngs = urls.size;
mkdirSync('output/animation-closeout', { recursive: true });
writeFileSync('output/animation-closeout/coverage.json', `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ scenes: report.scenes.length, checked: report.checked, missing: report.missing, uniquePngs: report.uniquePngs }));
assert.equal(report.missing, 0, 'Defined visible actions lack animation coverage');
