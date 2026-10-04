import { auditActions, resolveVisualState, visibleAuditActors, visualFacingLabels } from '../../engine/client/d8-animation-audit';
import type { VisualAction } from '../../engine/client/d8-animation-audit';
import type { DmState, WorldSnapshot } from '../../engine/shared/protocol';
import type { PublicCampaignDefinition } from '../../engine/shared/campaign';
import type { WorldRenderer } from './world';

const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const coverageLabels = { own: 'Secuencia propia', reused: 'Reutilizada', missing: 'Falta secuencia' };
let snapshot: WorldSnapshot | null = null, dm: DmState | null = null, campaign: PublicCampaignDefinition | null = null, renderer: WorldRenderer | null = null;
let rosterKey = '', current: { actorId: string; action: VisualAction } | null = null;
const reviews = new Map<string, string>();
const input = (id: string) => element<HTMLInputElement>(id);
const select = (id: string) => element<HTMLSelectElement>(id);
function stop() { renderer?.stopVisualPreview(); current = null; element('animationAuditStatus').textContent = 'Prueba local · no altera la partida'; input('animationAuditFrame').max = '0'; input('animationAuditFrame').value = '0'; element('animationAuditFrameLabel').textContent = '—'; element('animationAuditPause').textContent = 'Pausar'; }
function play(actorId: string, action: VisualAction) {
  if (!snapshot || !campaign || !renderer || !visibleAuditActors(snapshot, campaign.campaignId).some(actor => actor.id === actorId)) return;
  const actor = snapshot.entities.find(entity => entity.id === actorId)!;
  const states = snapshot.tokenAssets.tokenAnimations[actor.tokenId] ?? campaign.tokenAnimations[actor.tokenId] ?? {};
  const state = resolveVisualState(states, action.state, select('animationAuditFacing').value);
  if (!state) { stop(); element('animationAuditStatus').textContent = `${actor.label} · ${action.label}: falta una secuencia, no se sustituye por reposo.`; return; }
  const targetId = select('animationAuditTarget').value;
  if (action.attackType && !action.effect && (!targetId || targetId === actorId)) { stop(); element('animationAuditStatus').textContent = 'Selecciona otro personaje visible como blanco para probar el ataque completo.'; return; }
  const target = snapshot.entities.find(entity => entity.id === targetId), targetStates = target ? snapshot.tokenAssets.tokenAnimations[target.tokenId] ?? campaign.tokenAnimations[target.tokenId] ?? {} : {};
  const targetState = resolveVisualState(targetStates, 'hit'), animation = states[state]!;
  let soundId = action.soundId;
  if (!soundId) soundId = action.state === 'hit' ? 'd8-night-sfx-creature-hurt' : action.state === 'fall' || action.state === 'defeated' ? 'd8-night-sfx-creature-defeat' : action.effect === 'mirror' ? 'd8-night-sfx-mirror' : action.state === 'moving' || action.state === 'running' ? (/cafe|tavern|dinner/.test(snapshot.sceneId) ? 'd8-night-sfx-step-wood' : 'd8-night-sfx-movement-gravel') : action.attackType === 'melee' ? 'd8-night-sfx-attack-blade-hit' : action.attackType === 'arrow' ? 'd8-night-sfx-bow-release' : action.attackType || action.effect ? 'd8-night-sfx-spell-arcane' : undefined;
  const sound = campaign.audio.library?.sfx.find(effect => effect.id === soundId);
  const started = renderer.startVisualPreview({ entityId: actorId, targetId: targetId || undefined, state, targetState: targetState ?? undefined, frames: animation.frames.length, fps: animation.fps, targetFrames: targetState ? targetStates[targetState]!.frames.length : undefined, targetFps: targetState ? targetStates[targetState]!.fps : undefined, action, rate: Number(select('animationAuditSpeed').value), loop: input('animationAuditLoop').checked, hit: input('animationAuditHit').checked, focusCamera: input('animationAuditFocus').checked, soundUrl: input('animationAuditSound').checked ? sound?.url ?? (action.attackType ? campaign.audio.sfx.impact : undefined) : undefined });
  if (!started) { element('animationAuditStatus').textContent = 'Esperando a que termine de cargar el mapa…'; return; }
  current = { actorId, action }; input('animationAuditFrame').max = String(Math.max(0, animation.frames.length - 1)); input('animationAuditFrame').value = '0';
  element('animationAuditStatus').textContent = `${actor.label} · ${action.label} · ${coverageLabels[action.coverage]}${input('animationAuditSound').checked && !sound ? ' · sonido genérico o no disponible' : ''}`;
  element('animationAuditPause').textContent = 'Pausar';
}
export function renderD8AnimationAudit(next: WorldSnapshot | null, state: DmState | null, definition: PublicCampaignDefinition | null, world: WorldRenderer | null, force = false) {
  const sceneChanged = snapshot?.sceneEpoch !== next?.sceneEpoch || snapshot?.sceneId !== next?.sceneId;
  snapshot = next; dm = state; campaign = definition; renderer = world;
  const panel = element('animationAuditCard'); panel.hidden = campaign?.campaignId !== 'd8-night-private';
  if (panel.hidden) { stop(); rosterKey = ''; return; }
  const actors = visibleAuditActors(snapshot, campaign!.campaignId);
  if (current && !actors.some(actor => actor.id === current!.actorId)) stop();
  const rows = actors.map(actor => ({ actor, actions: auditActions(actor, snapshot!, dm, campaign!) }));
  const key = JSON.stringify([snapshot?.sceneEpoch, snapshot?.sceneId, rows.map(row => [row.actor.id, row.actor.label, row.actor.tokenId, row.actions]), input('animationAuditSearch').value]);
  if (!force && key === rosterKey) return;
  rosterKey = key;
  const target = select('animationAuditTarget'), previousTarget = target.value;
  target.replaceChildren(new Option('Sin blanco (gesto o efecto propio)', ''));
  for (const actor of actors) target.add(new Option(actor.label, actor.id));
  if (actors.some(actor => actor.id === previousTarget)) target.value = previousTarget;
  const list = element('animationAuditList'), opened = new Set([...list.querySelectorAll<HTMLDetailsElement>('details[open]')].map(detail => detail.dataset.actorId));
  const hadRows = list.childElementCount > 0 && !!list.querySelector('details'); list.replaceChildren();
  const query = input('animationAuditSearch').value.trim().toLocaleLowerCase('es');
  let shown = 0;
  for (const { actor, actions } of rows) {
    const matches = `${actor.label} ${actor.tokenId}`.toLocaleLowerCase('es').includes(query);
    const filtered = actions.filter(action => matches || `${action.label} ${action.state} ${coverageLabels[action.coverage]}`.toLocaleLowerCase('es').includes(query));
    if (!filtered.length) continue;
    const detail = document.createElement('details'), summary = document.createElement('summary'), groups = document.createElement('div');
    detail.className = 'animation-audit-actor'; detail.dataset.actorId = actor.id; detail.open = opened.has(actor.id) || (!hadRows || sceneChanged) && shown === 0;
    const title = document.createElement('span'), counts = document.createElement('span'); title.textContent = actor.label;
    const expected = actions.filter(action => !action.id.startsWith('clip:')), missing = expected.filter(action => action.coverage === 'missing').length;
    counts.className = 'animation-audit-kind'; counts.textContent = `${expected.length} acciones · ${missing} pendientes`;
    summary.append(title, counts); groups.className = 'animation-audit-groups';
    for (const groupName of [...new Set(filtered.map(action => action.group))]) {
      const pngGroup = groupName.endsWith('PNG');
      const group = document.createElement(pngGroup ? 'details' : 'section'), heading = document.createElement(pngGroup ? 'summary' : 'h3'), buttons = document.createElement('div');
      heading.textContent = groupName; group.className = 'animation-audit-group'; buttons.className = 'animation-audit-actions';
      for (const action of filtered.filter(item => item.group === groupName)) {
        const button = document.createElement('button'); button.type = 'button'; button.textContent = `${action.label}${action.coverage === 'missing' ? ' · falta' : action.coverage === 'reused' ? ' · ≈' : ''}`;
        button.dataset.coverage = action.coverage; button.dataset.review = reviews.get(`${actor.id}:${action.id}`) ?? '';
        button.title = `${coverageLabels[action.coverage]} · ${action.state}${action.attackType ? ' · cuerpo + proyectil/ataque + impacto + sonido' : ''}`;
        button.setAttribute('aria-label', `${actor.label}: ${action.label}. ${coverageLabels[action.coverage]}`); button.onclick = () => play(actor.id, action); buttons.append(button);
      }
      group.append(heading, buttons); groups.append(group);
    }
    detail.append(summary, groups); list.append(detail); shown++;
  }
  if (!shown) { const empty = document.createElement('p'); empty.className = 'animation-audit-empty'; empty.textContent = !snapshot ? 'Esperando el mapa…' : !actors.length ? 'No hay personajes visibles en este mapa.' : 'No hay coincidencias con el filtro.'; list.append(empty); }
}

input('animationAuditSearch').oninput = () => renderD8AnimationAudit(snapshot, dm, campaign, renderer, true);
for (const [value, label] of Object.entries(visualFacingLabels)) select('animationAuditFacing').add(new Option(label, value));
select('animationAuditFacing').value = 's';
for (const id of ['animationAuditFacing', 'animationAuditSpeed', 'animationAuditTarget', 'animationAuditLoop', 'animationAuditSound', 'animationAuditHit', 'animationAuditFocus']) element(id).onchange = () => { if (current) play(current.actorId, current.action); };
element('animationAuditStop').onclick = stop;
element('animationAuditPause').onclick = () => { const status = renderer?.getVisualPreviewStatus(); if (!status) return; renderer?.pauseVisualPreview(!status.paused); element('animationAuditPause').textContent = status.paused ? 'Pausar' : 'Continuar'; };
input('animationAuditFrame').oninput = () => { renderer?.seekVisualPreview(Number(input('animationAuditFrame').value)); element('animationAuditPause').textContent = 'Continuar'; };
for (const [id, step] of [['animationAuditPrevious', -1], ['animationAuditNext', 1]] as const) element(id).onclick = () => {
  const status = renderer?.getVisualPreviewStatus(); if (!status) return; renderer?.seekVisualPreview(Math.max(0, Math.min(status.frames - 1, status.frame + step))); element('animationAuditPause').textContent = 'Continuar';
};
for (const [id, value] of [['animationAuditGood', 'ok'], ['animationAuditBad', 'review']] as const) element(id).onclick = () => { if (!current) return; reviews.set(`${current.actorId}:${current.action.id}`, value); renderD8AnimationAudit(snapshot, dm, campaign, renderer, true); };
element('animationAuditExport').onclick = () => {
  const report = { scene: snapshot?.sceneId, createdAt: new Date().toISOString(), actors: visibleAuditActors(snapshot, campaign?.campaignId ?? '').map(actor => ({ id: actor.id, label: actor.label, actions: auditActions(actor, snapshot!, dm, campaign!).map(action => ({ ...action, review: reviews.get(`${actor.id}:${action.id}`) ?? 'untested' })) })) };
  const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })), anchor = document.createElement('a'); anchor.href = url; anchor.download = `d8-animaciones-${snapshot?.sceneId ?? 'mapa'}.json`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1_000);
};
setInterval(() => { const status = renderer?.getVisualPreviewStatus(); if (current && !status) { stop(); return; } if (!status) return; input('animationAuditFrame').value = String(status.frame); element('animationAuditFrameLabel').textContent = `${status.frame + 1}/${status.frames}${status.finished ? ' · terminada' : status.paused ? ' · pausa' : ''}`; }, 150);
