import { io } from 'socket.io-client';
import { OBJECT_MODEL_VERSION, PROTOCOL_VERSION } from '../../engine/shared/protocol';
import type { AudioState, WorldSnapshot } from '../../engine/shared/protocol';
import { AudioDirector } from './audio';
import { WorldRenderer } from './world';
import { loadCampaign } from './campaign';
import { SceneLoadRecovery } from '../../engine/client/scene-load-recovery';

const campaign = await loadCampaign();
// El proyector es la vista inmersiva de la mesa: muestra escenario, fichas y
// efectos, pero nunca la cuadrícula ni las casillas alcanzables de combate.
const world = new WorldRenderer(document.getElementById('world')!, campaign, { showGrid: false, showReachable: false });
const socket = io({ auth: { role: 'projector', protocolVersion: PROTOCOL_VERSION, objectModelVersion: OBJECT_MODEL_VERSION } });
const audio = new AudioDirector(campaign.audio, (sfxId, startedAt) => {
  if (runtimeEpoch) socket.emit('sfx:loop:ended', { runtimeEpoch, sfxId, startedAt });
});
let pending: AudioState | null = null;
let ready = false;
let readyEpoch = -1;
let latestSceneEpoch = -1;
let runtimeEpoch: string | null = null;
let latestSnapshot: WorldSnapshot | null = null;
const sceneLoadRecovery = new SceneLoadRecovery();
const playedEvents = new Set<string>();
socket.on('runtime:reset', (event: { runtimeEpoch: string }) => {
  sceneLoadRecovery.reset(); latestSnapshot = null;
  runtimeEpoch = event.runtimeEpoch; readyEpoch = -1; playedEvents.clear(); pending = null; world.resetConnection(); audio.reset();
  if (ready && socket.connected) socket.emit('projector:ready', { runtimeEpoch, ready: true });
});

socket.on('world:snapshot', (snapshot: WorldSnapshot) => {
  if (snapshot.runtimeEpoch !== runtimeEpoch) return;
  latestSceneEpoch = snapshot.sceneEpoch;
  latestSnapshot = snapshot;
  const hud = document.getElementById('combatHud')!;
  hud.hidden = !snapshot.combat.active;
  if (snapshot.combat.active) {
    const current = snapshot.combat.participants.find(item => item.id === snapshot.combat.currentId);
    hud.textContent = `Ronda ${snapshot.combat.round} · turno de ${current?.label ?? '—'}${snapshot.combat.lastEvent ? ` · ${snapshot.combat.lastEvent.text}` : ''}`;
  }
  void installSnapshot(snapshot);
});
async function installSnapshot(snapshot: WorldSnapshot) {
  try {
    const installed = await world.applySnapshot(snapshot);
    if (installed) sceneLoadRecovery.reset();
    if (installed && socket.connected && snapshot.runtimeEpoch === runtimeEpoch && latestSceneEpoch === snapshot.sceneEpoch && readyEpoch !== snapshot.sceneEpoch) {
      readyEpoch = snapshot.sceneEpoch; socket.emit('scene:ready', { runtimeEpoch, sceneEpoch: snapshot.sceneEpoch });
    }
  } catch (error) {
    if (!socket.connected || snapshot.runtimeEpoch !== runtimeEpoch) return;
    if (sceneLoadRecovery.failed(() => { if (socket.connected && latestSnapshot?.runtimeEpoch === runtimeEpoch) void installSnapshot(latestSnapshot); })) console.error('No se pudo cargar el mapa del proyector', error);
  }
}
socket.on('camera:orientation', (event: { runtimeEpoch: string; sceneEpoch: number; sceneId: string; step: number | null }) => {
  if (event.runtimeEpoch !== runtimeEpoch || event.sceneEpoch < latestSceneEpoch) return;
  if (event.step === null) { world.clearSharedCameraOrientations(); return; }
  if (!Number.isInteger(event.step) || event.step < 0 || event.step > 7) return;
  world.setSharedCameraOrientation(event.sceneId, event.step);
});
socket.on('audio:state', (state: AudioState & { runtimeEpoch: string }) => {
  if (state.runtimeEpoch !== runtimeEpoch) return;
  pending = state;
  if (ready) audio.apply(state);
});
socket.on('sfx:play', (event: { eventId: string; sfxId: string; runtimeEpoch: string }) => {
  if (event.runtimeEpoch !== runtimeEpoch) return;
  if (!ready || playedEvents.has(event.eventId)) return;
  playedEvents.add(event.eventId);
  while (playedEvents.size > 100) playedEvents.delete(playedEvents.values().next().value!);
  audio.playSfx(event.sfxId);
});
socket.on('sfx:movement', (event: { entityId: string; sfxId: string; durationMs: number; runtimeEpoch: string }) => {
  if (event.runtimeEpoch !== runtimeEpoch || !ready) return;
  audio.playMovementSfx(event.entityId, event.sfxId, event.durationMs);
});
socket.on('combat:animation', (event: { runtimeEpoch: string; sceneEpoch?: number; bodyState?: string; attackerId: string; targetId: string; type: 'melee' | 'arrow' | 'thrownWeapon' | 'radiantArrow' | 'vine' | 'fireProjectile' | 'magicalProjectile'; hit: boolean; frozen: boolean; sneakAttack?: boolean }) => { if (event.runtimeEpoch === runtimeEpoch && (event.sceneEpoch === undefined || event.sceneEpoch === latestSceneEpoch)) world.playRangedAttack(event.attackerId, event.targetId, event.type, event.hit, event.frozen, event.sneakAttack, event.bodyState); });
socket.on('scene:animation', (event: { runtimeEpoch: string; sceneEpoch: number; entityId: string; state: string; durationMs: number }) => { if (event.runtimeEpoch === runtimeEpoch && event.sceneEpoch === latestSceneEpoch) world.playTokenAnimation(event.entityId, event.state, event.durationMs); });
socket.on('scene:area-effect', (event: { runtimeEpoch: string; sceneEpoch: number; cell: { col: number; row: number }; type: 'fog'; radiusMeters: number; durationMs: number }) => { if (event.runtimeEpoch === runtimeEpoch && event.sceneEpoch === latestSceneEpoch) world.playAreaEffect(event.cell, event.type, event.radiusMeters, event.durationMs); });
socket.on('mirror:transformation', (event: { runtimeEpoch: string; sceneEpoch: number; propId: string; sourceId: string; reflectionId: string; frames: string[]; durationMs: number }) => { if (event.runtimeEpoch === runtimeEpoch && event.sceneEpoch === latestSceneEpoch) world.playMirrorTransformation(event.propId, event.sourceId, event.reflectionId, event.frames, event.durationMs); });
socket.on('connect', () => {
  sceneLoadRecovery.reset(); latestSnapshot = null;
  document.getElementById('offline')!.classList.remove('show');
  readyEpoch = -1;
  world.resetConnection();
  if (ready && runtimeEpoch) socket.emit('projector:ready', { runtimeEpoch, ready: true });
});
socket.on('disconnect', () => { sceneLoadRecovery.reset(); document.getElementById('offline')!.classList.add('show'); });
socket.on('auth:error', (error: { code?: string }) => {
  const offline = document.getElementById('offline')!;
  offline.textContent = error.code === 'RECOVERY_REQUIRED'
    ? 'La partida requiere recuperación. Espera al DM y recarga después.'
    : error.code === 'PROTOCOL_MISMATCH' ? 'La aplicación se ha actualizado. Recarga esta página.' : 'No se pudo conectar con la mesa. Recarga esta página.';
  offline.classList.add('show');
});
document.getElementById('start')!.onclick = async () => {
  ready = true;
  socket.emit('projector:ready', { runtimeEpoch, ready: true });
  document.getElementById('prepare')!.remove();
  // Some embedded browsers leave AudioContext.resume pending. The scene can
  // be shown immediately while the independent sound permission resolves.
  document.getElementById('audioNotice')!.hidden = false;
  const unlocked = await audio.unlock();
  if (unlocked && pending) audio.apply(pending);
  document.getElementById('audioNotice')!.hidden = unlocked;
};
document.getElementById('retryAudio')!.onclick = async () => {
  const unlocked = await audio.unlock();
  if (unlocked) {
    if (pending) audio.apply(pending);
    document.getElementById('audioNotice')!.hidden = true;
  } else {
    document.getElementById('audioMessage')!.textContent = 'El navegador aún bloquea el sonido. La escena sigue disponible; vuelve a intentarlo después.';
  }
};
addEventListener('pagehide', () => socket.emit('projector:ready', { runtimeEpoch, ready: false }));
