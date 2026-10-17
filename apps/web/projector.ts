import { io } from 'socket.io-client';
import { OBJECT_MODEL_VERSION, PROTOCOL_VERSION } from '../../engine/shared/protocol';
import type { AudioState, WorldSnapshot } from '../../engine/shared/protocol';
import { AudioDirector } from './audio';
import { WorldRenderer } from './world';
import { loadCampaign } from './campaign';
import { validCameraOrbitStep, validSharedCameraFrame, CAMERA_ORBIT_PROFILE, type SharedCameraOrientationEvent } from '../../engine/shared/camera';
import { validCameraTiltForScene } from '../../engine/shared/camera-profile';
import { SceneLoadRecovery } from '../../engine/client/scene-load-recovery';
import { shouldReloadAfterServerReconnect, type RuntimeReset } from '../../engine/client/runtime-reload';
import { shipAmbienceGains,shipPerspectiveAudio } from '../../engine/client/ship-acoustics';
import { GameClockOverlay } from '../../engine/client/game-clock-overlay.js';

const campaign = await loadCampaign();
// El proyector es la vista inmersiva de la mesa: muestra escenario, fichas y
// efectos, pero nunca la cuadrícula ni las casillas alcanzables de combate.
const world = new WorldRenderer(document.getElementById('world')!, campaign, { cameraRole: 'projector', showGrid: false, showReachable: false });
const gameClockOverlay = new GameClockOverlay(document.getElementById('world')!, 'left');
const socket = io({ auth: { role: 'projector', protocolVersion: PROTOCOL_VERSION, objectModelVersion: OBJECT_MODEL_VERSION } });
socket.on('scene:sign-read',(event:{runtimeEpoch:string;sceneEpoch:number;signId:string;text:string})=>{if(event.runtimeEpoch===runtimeEpoch&&event.sceneEpoch===latestSnapshot?.sceneEpoch)world.showSignBubble(event.signId,event.text);});
const audio = new AudioDirector(campaign.audio, (sfxId, startedAt) => {
  if (runtimeEpoch) socket.emit('sfx:loop:ended', { runtimeEpoch, sfxId, startedAt });
});
let pending: AudioState | null = null;
let ready = false;
let readyEpoch = -1;
let latestSceneEpoch = -1;
let runtimeEpoch: string | null = null;
let latestSnapshot: WorldSnapshot | null = null;
let acousticKey='';
const saveIcons: Record<string, string> = {
  'd8-night-private': '<svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="M32 4 54 19 48 46 32 60 16 46 10 19 32 4Z" fill="#d8b65f" fill-opacity=".14" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><path d="m32 4-4 18-18-3m22-15 4 18 18-3M28 22l4 38m4-38-20 24m20-24 12 24M28 22h8" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><text x="32" y="40" text-anchor="middle" fill="#f5e8c3" font-size="15" font-family="Georgia,serif" font-weight="700">8</text></svg>',
  'stormwreck-isle': '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M8 28 20 24 14 8l17 12 7-13 2 17 17-8-11 16 10 5-18 3-4 16-8-13-11 6 4-15-11-6Z" fill="#d8b65f" stroke="#f4e4b7" stroke-width="1.6" stroke-linejoin="round"/><path d="m21 28 13-4 9 7-8 10-12-2-6-6 4-5Z" fill="#213237"/><path d="m23 30 9-3 5 3-6 5-8-1Z" fill="#f0d98f"/><circle cx="29" cy="30" r="1.6" fill="#172529"/><path d="m18 36 9 8-5 8-2-9-7 3 5-10Z" fill="#c99f4c"/></svg>'
};
function updateSaveIndicator(event: { runtimeEpoch: string; active: boolean; campaignId: string }) {
  if (event.runtimeEpoch !== runtimeEpoch) return;
  const indicator = document.getElementById('saveIndicator')!;
  const icon = document.getElementById('saveIndicatorIcon')!;
  indicator.dataset.saveCampaign = event.campaignId;
  if (icon.dataset.campaign !== event.campaignId) {
    icon.dataset.campaign = event.campaignId;
    icon.innerHTML = saveIcons[event.campaignId] ?? saveIcons['stormwreck-isle']!;
  }
  indicator.hidden = !event.active;
}
const listener=()=>latestSnapshot?.entities.find(e=>e.id===latestSnapshot?.camera.focusId)??null;
const applyAudio=()=>{if(ready&&pending){audio.apply(shipPerspectiveAudio(pending,listener()));audio.setSceneAmbience(latestSnapshot&&readyEpoch===latestSnapshot.sceneEpoch?latestSnapshot:null);}};
const sceneLoadRecovery = new SceneLoadRecovery();
const playedEvents = new Set<string>();
socket.on('runtime:reset', (event: RuntimeReset) => {
  if (shouldReloadAfterServerReconnect(runtimeEpoch, event)) { location.reload(); return; }
  gameClockOverlay.reset();
  document.getElementById('saveIndicator')!.hidden = true;
  sceneLoadRecovery.reset(); latestSnapshot = null;
  runtimeEpoch = event.runtimeEpoch; readyEpoch = -1; playedEvents.clear(); pending = null; world.resetConnection(); audio.reset();
  if (ready && socket.connected) socket.emit('projector:ready', { runtimeEpoch, ready: true });
});
socket.on('save:activity', updateSaveIndicator);

socket.on('world:snapshot', (snapshot: WorldSnapshot) => {
  if (snapshot.runtimeEpoch !== runtimeEpoch) return;
  latestSceneEpoch = snapshot.sceneEpoch;
  latestSnapshot = snapshot;
  audio.setSceneAmbience(ready&&readyEpoch===snapshot.sceneEpoch?snapshot:null);
  gameClockOverlay.update(snapshot);
  const nextAcousticKey=JSON.stringify(shipAmbienceGains(listener()));
  if(nextAcousticKey!==acousticKey){acousticKey=nextAcousticKey;applyAudio();}
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
      if(ready)audio.setSceneAmbience(snapshot);
    }
  } catch (error) {
    if (!socket.connected || snapshot.runtimeEpoch !== runtimeEpoch) return;
    if (sceneLoadRecovery.failed(() => { if (socket.connected && latestSnapshot?.runtimeEpoch === runtimeEpoch) void installSnapshot(latestSnapshot); })) console.error('No se pudo cargar el mapa del proyector', error);
  }
}
socket.on('camera:orientation', (event: SharedCameraOrientationEvent) => {
  if (event.runtimeEpoch !== runtimeEpoch || event.sceneEpoch < latestSceneEpoch) return;
  if (event.step === null) { world.clearSharedCameraOrientations(); return; }
  if (event.profile !== CAMERA_ORBIT_PROFILE || !validCameraOrbitStep(event.step)) return;
  if (event.tilt !== undefined && !validCameraTiltForScene(event.sceneId,event.tilt)) return;
  if (event.frame !== undefined && !validSharedCameraFrame(event.frame)) return;
  world.setSharedCameraOrientation(event.sceneId, event.step, event.tilt, event.frame);
});
socket.on('disconnect',()=>audio.setSceneAmbience(null));
socket.on('audio:state', (state: AudioState & { runtimeEpoch: string }) => {
  if (state.runtimeEpoch !== runtimeEpoch) return;
  pending = state;
  applyAudio();
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
socket.on('scene:reward',(event:{runtimeEpoch:string;sceneEpoch:number;entityId:string;effect:string})=>{if(event.runtimeEpoch===runtimeEpoch&&event.sceneEpoch===latestSceneEpoch&&event.effect==='inspiration')world.playRewardEffect(event.entityId);});
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
  if (error.code === 'PROTOCOL_MISMATCH') { location.reload(); return; }
  const offline = document.getElementById('offline')!;
  offline.textContent = error.code === 'RECOVERY_REQUIRED'
    ? 'La partida requiere recuperación. Espera al DM y recarga después.'
    : 'No se pudo conectar con la mesa. Recarga esta página.';
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
  if (unlocked) applyAudio();
  document.getElementById('audioNotice')!.hidden = unlocked;
};
document.getElementById('retryAudio')!.onclick = async () => {
  const unlocked = await audio.unlock();
  if (unlocked) {
    applyAudio();
    document.getElementById('audioNotice')!.hidden = true;
  } else {
    document.getElementById('audioMessage')!.textContent = 'El navegador aún bloquea el sonido. La escena sigue disponible; vuelve a intentarlo después.';
  }
};
addEventListener('pagehide', () => socket.emit('projector:ready', { runtimeEpoch, ready: false }));
