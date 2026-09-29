import { io, type Socket } from 'socket.io-client';
import { OBJECT_MODEL_VERSION, PROTOCOL_VERSION } from '../../engine/shared/protocol';
import type { AudioState, DmState } from '../../engine/shared/protocol';
import type { PublicCampaignDefinition } from '../../engine/shared/campaign';
import { commandId } from '../../engine/client/uuid';
import { readUiPreferences, writeUiPreferences } from '../../engine/client/ui-preferences';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
type Channel = 'music' | 'ocean' | 'wind' | 'wood' | 'storm';
type AmbienceChannel = Exclude<Channel, 'music'>;

let socket: Socket | null = null, state: DmState | null = null, runtimeEpoch: string | null = null, toastTimer = 0;
let sceneTitles = new Map<string, string>(), sceneBackgrounds = new Map<string, string>(), campSceneIds = new Set<string>();
let campaignAudio: PublicCampaignDefinition['audio'] | null = null;
const ambienceChannels: AmbienceChannel[] = ['ocean', 'wind', 'wood', 'storm'];
const ambienceOrderStorageKey = 'd8-night:dm-mobile:ambience-order';
function loadAmbienceOrder(): AmbienceChannel[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(ambienceOrderStorageKey) ?? 'null');
    if (!Array.isArray(saved)) return [...ambienceChannels];
    return [...new Set([
      ...saved.filter((channel): channel is AmbienceChannel => ambienceChannels.includes(channel)),
      ...ambienceChannels.filter(channel => !saved.includes(channel))
    ])];
  } catch { return [...ambienceChannels]; }
}
let ambienceOrder = loadAmbienceOrder();
let ambienceDrag: { channel: AmbienceChannel; pointerId: number; x: number; y: number; target: AmbienceChannel | null; after: boolean; started: boolean } | null = null;
// Un toque debe tener una respuesta visual inmediata, incluso cuando el
// proyector tarda un instante en devolver el nuevo estado por Socket.IO.
// Guardamos la intención por canal y solo la retiramos al recibir ese estado.
const pendingAudio = new Map<Channel, { commandId: string; playing: boolean }>();
type SfxLoopSetting = Pick<AudioState['music'], 'playing' | 'volume' | 'loop' | 'rate' | 'repeats'>;
const pendingSfxLoops = new Map<string, { commandId: string; setting: SfxLoopSetting }>();
type EffectFilter = 'recommended' | 'all' | 'movement' | 'combat' | 'magic' | 'creature' | 'object' | 'scene';
type SoundSection = 'ambience' | 'effects';
type DmMobileUiPreferences = { visualPageOpen: boolean; effectFilter: EffectFilter; soundSection: SoundSection };
const dmMobileUiPreferencesStorageKey = 'dnd-dm-mobile-ui-preferences.v1';
const effectFilters: EffectFilter[] = ['recommended', 'all', 'movement', 'combat', 'magic', 'creature', 'object', 'scene'];
const defaultDmMobileUiPreferences: DmMobileUiPreferences = { visualPageOpen: false, effectFilter: 'recommended', soundSection: 'ambience' };
const isDmMobileUiPreferences = (value: unknown): value is DmMobileUiPreferences => {
  if (!value || typeof value !== 'object') return false;
  const saved = value as Partial<DmMobileUiPreferences>;
  return typeof saved.visualPageOpen === 'boolean' && typeof saved.effectFilter === 'string'
    && effectFilters.includes(saved.effectFilter as EffectFilter)
    && (saved.soundSection === 'ambience' || saved.soundSection === 'effects');
};
let dmMobileUiPreferences = readUiPreferences(dmMobileUiPreferencesStorageKey, defaultDmMobileUiPreferences, isDmMobileUiPreferences);
let visualPageOpen = dmMobileUiPreferences.visualPageOpen, effectFilter: EffectFilter = dmMobileUiPreferences.effectFilter;
let soundSection: SoundSection = dmMobileUiPreferences.soundSection;
function persistDmMobileUiPreferences() { writeUiPreferences(dmMobileUiPreferencesStorageKey, dmMobileUiPreferences); }
let swipe: { pointerId: number; x: number; y: number; lastX: number; lastTime: number; velocityX: number; interactive: boolean; dragging: boolean; direction: 'pending' | 'horizontal' | 'vertical' } | null = null;

const ambientMeta: Record<Exclude<Channel, 'music'>, { icon: string; description: string }> = {
  ocean: { icon: '≈', description: 'Oleaje y agua cercana' }, wind: { icon: '〰', description: 'Ráfagas y aire nocturno' }, wood: { icon: '⌇', description: 'Madera y aparejos' }, storm: { icon: '☁', description: 'Lluvia y tormenta lejana' }
};
const ambiencePresets: Array<{ id: string; icon: string; label: string; layers: Record<Exclude<Channel, 'music'>, { trackId: string; volume: number; playing: boolean }> }> = [
  { id: 'horse', icon: '♞', label: 'Cabalgar', layers: { ocean: { trackId: 'd8-night-loop-horse-trot', volume: .42, playing: true }, wind: { trackId: 'd8-night-loop-mirror-icy-wind', volume: .12, playing: true }, wood: { trackId: 'd8-night-loop-horse-trot', volume: .08, playing: false }, storm: { trackId: 'd8-night-loop-storm', volume: .25, playing: false } } },
  { id: 'tavern', icon: '♜', label: 'Taberna', layers: { ocean: { trackId: 'd8-night-loop-cafe-fireplace', volume: .25, playing: true }, wind: { trackId: 'd8-night-loop-tavern-voices', volume: .2, playing: true }, wood: { trackId: 'd8-night-loop-tavern-floor', volume: .1, playing: true }, storm: { trackId: 'd8-night-loop-storm', volume: .25, playing: false } } },
  { id: 'market', icon: '◈', label: 'Mercado', layers: { ocean: { trackId: 'd8-night-loop-market-footsteps', volume: .15, playing: true }, wind: { trackId: 'd8-night-loop-market-crowd', volume: .22, playing: true }, wood: { trackId: 'd8-night-loop-tavern-floor', volume: .06, playing: false }, storm: { trackId: 'd8-night-loop-storm', volume: .25, playing: false } } },
  { id: 'boat', icon: '≈', label: 'Barco', layers: { ocean: { trackId: 'd8-night-loop-boat-waves', volume: .36, playing: true }, wind: { trackId: 'd8-night-loop-mirror-icy-wind', volume: .16, playing: true }, wood: { trackId: 'd8-night-loop-boat-creak', volume: .1, playing: true }, storm: { trackId: 'd8-night-loop-storm', volume: .25, playing: false } } }
];
function hasAmbienceTrack(id: string) { return campaignAudio?.library?.ambience.some(track => track.id === id) ?? false; }
function weatherPreset(intensity: number) {
  // Cada campaña puede tener su propia biblioteca. No enviar un id de D8 a
  // Stormwreck evita que el servidor rechace el comando por pista desconocida.
  const stormwreck = hasAmbienceTrack('stormwreck-loop-rain');
  if (intensity <= .35) return { label: 'Llovizna', assetId: stormwreck ? 'stormwreck-loop-rain' : 'd8-night-loop-rain-drizzle' };
  if (intensity <= .7) return { label: 'Tormenta', assetId: stormwreck ? 'stormwreck-loop-storm' : 'd8-night-loop-storm' };
  return { label: 'Temporal', assetId: stormwreck ? 'stormwreck-loop-storm' : 'd8-night-loop-rain-tempest' };
}

function toast(message: string) { const element = $('toast'); element.textContent = message; element.classList.add('show'); clearTimeout(toastTimer); toastTimer = window.setTimeout(() => element.classList.remove('show'), 2600); }
function command(body: Record<string, unknown>) {
  if (!socket?.connected || !runtimeEpoch) { toast('La consola no está conectada.'); return null; }
  const id = commandId(), sceneScope = body.type === 'environment' && state ? { sceneEpoch: state.sceneEpoch } : {};
  socket.emit('dm:command', { commandId: id, runtimeEpoch, ...sceneScope, ...body }); return id;
}
function effectiveTrack(channel: Channel, track: AudioState['music']) {
  const pending = pendingAudio.get(channel);
  return pending ? { ...track, playing: pending.playing } : track;
}
function sendAudio(channel: Channel, next: Pick<AudioState['music'], 'playing' | 'volume'> & Partial<Pick<AudioState['music'], 'loop' | 'rate' | 'repeats'>>) {
  const id = command({ type: 'audio', channel, ...next });
  if (!id) return;
  pendingAudio.set(channel, { commandId: id, playing: next.playing });
  if (state) render(state, true);
}
function loopState(id: string, track: AudioState['music'] | undefined) {
  const base: AudioState['music'] = track ?? { playing: false, volume: .38, startedAt: null, offset: 0, assetId: id, loop: false, rate: 1, repeats: 4 };
  const pending = pendingSfxLoops.get(id);
  return pending ? { ...base, ...pending.setting } : base;
}
function sendSfxLoop(id: string, next: SfxLoopSetting) {
  const commandId = command({ type: 'sfx:loop', sfxId: id, ...next });
  if (!commandId) return;
  pendingSfxLoops.set(id, { commandId, setting: next });
  renderEffects(true);
}
function setStatus(ready: boolean) { const status = $('connectionStatus'); status.textContent = ready ? 'Mesa conectada' : 'Sin conexión'; status.classList.toggle('ready', ready); }

async function loadCampaign() {
  try { const campaign = await fetch('/api/campaign').then(response => response.json()) as PublicCampaignDefinition; sceneTitles = new Map(campaign.scenes.map(scene => [scene.id, scene.title])); sceneBackgrounds = new Map(campaign.scenes.map(scene => [scene.id, scene.background])); campSceneIds = new Set(campaign.scenes.filter(scene => Boolean(scene.camp)).map(scene => scene.id)); campaignAudio = campaign.audio; }
  catch { /* La consola puede seguir funcionando aunque no se lea el título. */ }
}
function connect() {
  socket = io({ auth: { role: 'dm', protocolVersion: PROTOCOL_VERSION, objectModelVersion: OBJECT_MODEL_VERSION } });
  socket.on('connect', () => setStatus(true));
  socket.on('disconnect', () => setStatus(false));
  socket.on('auth:error', () => { location.reload(); });
  socket.on('runtime:reset', (event: { runtimeEpoch: string }) => { if (runtimeEpoch && runtimeEpoch !== event.runtimeEpoch) { location.reload(); return; } runtimeEpoch = event.runtimeEpoch; });
  socket.on('dm:state', (next: DmState) => {
    if (next.runtimeEpoch !== runtimeEpoch) return;
    for (const [channel, pending] of pendingAudio) {
      const track = channel === 'music' ? next.audio.music : next.audio.layers[channel];
      if (track.playing === pending.playing) pendingAudio.delete(channel);
    }
    for (const [id, pending] of pendingSfxLoops) {
      const track = next.audio.sfxLoops[id];
      if (track && track.playing === pending.setting.playing && track.volume === pending.setting.volume && track.loop === pending.setting.loop && track.rate === pending.setting.rate && track.repeats === pending.setting.repeats) pendingSfxLoops.delete(id);
    }
    state = next; render(next);
  });
  socket.on('command:result', (result: { commandId: string; ok: boolean; code: string; runtimeEpoch: string }) => {
    if (result.runtimeEpoch !== runtimeEpoch) return;
    if (!result.ok) {
      for (const [channel, pending] of pendingAudio) if (pending.commandId === result.commandId) pendingAudio.delete(channel);
      for (const [id, pending] of pendingSfxLoops) if (pending.commandId === result.commandId) pendingSfxLoops.delete(id);
      if (state) render(state);
      toast(`No aplicado: ${result.code}`);
    }
  });
}
function showLogin(message = '') { socket?.disconnect(); socket = null; $('login').hidden = false; $('app').hidden = true; $('loginError').textContent = message; }
async function beginDm(password?: string) {
  const response = await fetch('/api/dm/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(password === undefined ? {} : { password }) });
  if (!response.ok) { showLogin(password === undefined ? 'Esta mesa requiere la clave del DM.' : 'Clave incorrecta.'); return; }
  $('login').hidden = true; $('app').hidden = false; await loadCampaign(); connect();
}

function render(current: DmState, forceAudio = false) {
  $('sceneTitle').textContent = sceneTitles.get(current.sceneId) ?? current.sceneId;
  const sceneBackground = sceneBackgrounds.get(current.sceneId);
  $('sceneArt').style.backgroundImage = sceneBackground?.startsWith('/art/') ? `url("${sceneBackground}")` : '';
  $('projectorStatus').textContent = current.projectorReady ? 'Proyector conectado' : 'Esperando al proyector.';
  const music = effectiveTrack('music', current.audio.music), toggle = $('musicToggle') as HTMLButtonElement, volume = $('musicVolume') as HTMLInputElement;
  const musicTracks = sceneMusicTracks(), selectedMusic = musicTracks.find(track => track.id === music.assetId) ?? musicTracks[0];
  $('musicTitle').textContent = selectedMusic?.label ?? 'Tema de campaña'; renderMusicTracks(selectedMusic?.id);
  const setMusicToggle = (playing: boolean) => {
    toggle.textContent = playing ? '⏸' : '▶';
    toggle.setAttribute('aria-label', playing ? 'Pausar música' : 'Reproducir música');
    toggle.setAttribute('aria-pressed', String(playing));
    toggle.title = playing ? 'Pausar música' : 'Reproducir música';
  };
  setMusicToggle(music.playing);
  toggle.onclick = () => {
    // Actualizamos el botón inmediatamente: una segunda pulsación alterna de
    // verdad a pausa aunque el estado del servidor tarde un instante en volver.
    const nextPlaying = toggle.getAttribute('aria-pressed') !== 'true';
    setMusicToggle(nextPlaying);
    sendAudio('music', { playing: nextPlaying, volume: Number(volume.value) });
  };
  if (!volume.matches(':focus')) volume.value = String(music.volume); $('musicLevel').textContent = `${Math.round(music.volume * 100)}%`; volume.oninput = () => { $('musicLevel').textContent = `${Math.round(Number(volume.value) * 100)}%`; }; volume.onchange = () => sendAudio('music', { playing: music.playing, volume: Number(volume.value) });
  const layers = Object.entries(current.audio.layers).map(([id, track]) => [id as AmbienceChannel, effectiveTrack(id as AmbienceChannel, track)] as const)
    .sort(([left], [right]) => ambienceOrder.indexOf(left) - ambienceOrder.indexOf(right));
  const box = $('ambience'); if (forceAudio || !box.contains(document.activeElement)) { box.replaceChildren(); for (const [id, track] of layers) box.append(ambienceRow(id, track)); }
  const allPlaying = layers.every(([, track]) => track.playing); const allButton = $('toggleAllAmbience') as HTMLButtonElement; allButton.textContent = allPlaying ? 'Apagar todo' : 'Encender todo'; allButton.onclick = () => { for (const [channel, track] of layers) sendAudio(channel, { playing: !allPlaying, volume: track.volume, loop: track.loop, rate: track.rate, repeats: track.repeats }); };
  renderWeather(current); renderTimeOfDay(current); renderEffects(); renderAmbiencePresets();
}

function renderTimeOfDay(current: DmState) {
  const toggle = $('timeOfDayToggle') as HTMLButtonElement;
  toggle.hidden = !campSceneIds.has(current.sceneId);
  const isNight = (current.environment.timeOfDay ?? 'auto') === 'night' || (current.environment.timeOfDay ?? 'auto') === 'auto' && current.campRest?.sceneId === current.sceneId && current.campRest.phase === 'night';
  $('timeOfDayIcon').textContent = isNight ? '☀' : '☾'; $('timeOfDayLabel').textContent = isNight ? 'Pasar a día' : 'Pasar a noche';
  toggle.setAttribute('aria-pressed', String(isNight)); toggle.title = isNight ? 'Cambiar la escena a día' : 'Cambiar la escena a noche';
  toggle.onclick = () => command({ type: 'environment', storm: current.environment.storm, intensity: current.environment.stormIntensity, timeOfDay: isNight ? 'day' : 'night' });
}

function renderAmbiencePresets() {
  const box = $('ambiencePresets'); if (box.contains(document.activeElement)) return; box.replaceChildren();
  const usablePresets = ambiencePresets.filter(preset => Object.values(preset.layers).every(layer => hasAmbienceTrack(layer.trackId)));
  box.hidden = usablePresets.length === 0;
  for (const preset of usablePresets) {
    const button = document.createElement('button'), icon = document.createElement('span'); icon.textContent = preset.icon; button.append(icon, preset.label);
    button.title = `Aplicar ambiente: ${preset.label}`; button.onclick = () => applyAmbiencePreset(preset); box.append(button);
  }
}
function applyAmbiencePreset(preset: typeof ambiencePresets[number]) {
  if (!state) return;
  // El servidor aplica la mezcla completa en una única actualización para que
  // no se oigan fuentes anteriores mientras se intercambian las capas.
  // El clima es independiente del lugar: si llueve, el preset no puede cortar
  // su audio mientras el proyector mantiene la lluvia visible.
  const layers = { ...preset.layers, storm: state.environment.storm
    ? { trackId: state.audio.layers.storm.assetId ?? weatherPreset(state.environment.stormIntensity).assetId, playing: true, volume: state.audio.layers.storm.volume }
    : preset.layers.storm };
  command({ type: 'audio:mix', music: { playing: false, volume: state.audio.music.volume }, layers });
  toast(`${preset.label}: ambiente aplicado.`);
}

function renderMusicTracks(selectedId?: string) {
  const select = $('musicTracks') as HTMLSelectElement; if (select === document.activeElement) return; select.replaceChildren();
  const tracks = sceneMusicTracks();
  const groups = [
    { label: 'Música de campaña', items: tracks.filter(track => !track.id.startsWith('camp-') && !track.id.startsWith('stormwreck-music-dragon') && !track.id.startsWith('stormwreck-music-rosa')) },
    { label: 'Campamento · 5 paradas', items: tracks.filter(track => track.id.startsWith('camp-') && track.id !== 'camp-rest-music') },
    { label: 'Escenas de Stormwreck', items: tracks.filter(track => track.id.startsWith('stormwreck-music-dragon') || track.id.startsWith('stormwreck-music-rosa')) }
  ];
  for (const group of groups) {
    if (!group.items.length) continue;
    const optgroup = document.createElement('optgroup'); optgroup.label = group.label;
    for (const track of group.items) {
      const option = document.createElement('option'); option.value = track.id; option.textContent = track.label; option.title = track.description; optgroup.append(option);
    }
    select.append(optgroup);
  }
  if (selectedId && tracks.some(track => track.id === selectedId)) select.value = selectedId;
  else if (select.options.length) select.selectedIndex = 0;
  select.onchange = () => command({ type: 'audio:select', channel: 'music', trackId: select.value });
}

function sceneMusicTracks() {
  // La pista heredada de perfiles de campamento no se elige desde la consola:
  // cada una de las cinco paradas tiene ahora su tema/ambiente explícito.
  return (campaignAudio?.library?.music ?? []).filter(track => track.id !== 'camp-rest-music');
}

function renderEffects(force = false) {
  const box = $('effects'); if (!force && box.contains(document.activeElement)) return; box.replaceChildren();
  type EffectCategory = Exclude<EffectFilter, 'all' | 'recommended'>;
  const groupFor = (effect: { id: string; category?: EffectCategory }): EffectCategory => effect.category ?? (effect.id.includes('step') ? 'movement' : effect.id.includes('attack') || effect.id.includes('creature') ? 'combat' : effect.id.includes('spell') || effect.id.includes('mirror') ? 'magic' : 'object');
  const iconFor = (category: EffectCategory) => ({ movement: '♟', combat: '⚔', magic: '✦', creature: '♞', object: '⌁', scene: '♜' })[category];
  const profile = state ? campaignAudio?.sceneProfiles?.[state.sceneId] : undefined, recommended = new Set(profile?.recommendedSfx ?? []);
  $('effectsTitle').textContent = effectFilter === 'recommended' ? `Recomendados · ${state ? (sceneTitles.get(state.sceneId) ?? state.sceneId) : 'mapa'}` : 'Biblioteca de acciones';
  const effects = (campaignAudio?.library?.sfx ?? []).filter(effect => effectFilter === 'recommended' ? recommended.has(effect.id) : effectFilter === 'all' || groupFor(effect) === effectFilter);
  for (const effect of effects) {
    const button = document.createElement('button'), icon = document.createElement('span'), label = document.createTextNode(effect.label), detail = document.createElement('small');
    icon.textContent = iconFor(groupFor(effect)); detail.textContent = effect.description; button.title = effect.description; button.className = 'effect-trigger'; button.append(icon, label, detail);
    if (!effect.loopable) {
      button.onclick = () => command({ type: 'sfx', sfxId: effect.id }); box.append(button); continue;
    }
    const track = loopState(effect.id, state?.audio.sfxLoops[effect.id]);
    const card = document.createElement('article'); card.className = `effect-loop${track.playing ? ' active' : ''}`;
    button.classList.add('repeatable'); button.setAttribute('aria-pressed', String(track.playing));
    button.title = track.playing ? `Detener ${effect.label}` : `Iniciar ${effect.label} en secuencia`;
    detail.textContent = track.playing ? 'Secuencia activa · pulsa para detener' : 'Pulsa para repetir pasos o carrera';
    button.onclick = () => sendSfxLoop(effect.id, { playing: !track.playing, volume: track.volume, loop: track.loop, rate: track.rate, repeats: track.repeats });
    card.append(button);
    if (track.playing) {
      const controls = document.createElement('div'), repeat = document.createElement('button'), speed = document.createElement('select'), amount = document.createElement('select'), volume = document.createElement('input');
      controls.className = 'loop-mini';
      repeat.type = 'button'; repeat.className = `loop-control${track.loop ? ' active' : ''}`; repeat.textContent = '∞'; repeat.title = track.loop ? 'Bucle infinito activo; tocar para limitarlo' : 'Activar bucle infinito'; repeat.setAttribute('aria-pressed', String(track.loop));
      repeat.onclick = () => sendSfxLoop(effect.id, { playing: true, volume: track.volume, loop: !track.loop, rate: track.rate, repeats: track.repeats });
      for (const value of [.75, 1, 1.25]) { const option = document.createElement('option'); option.value = String(value); option.textContent = `${value}×`; option.selected = value === track.rate; speed.append(option); }
      speed.setAttribute('aria-label', `Velocidad de ${effect.label}`); speed.title = 'Velocidad de los pasos'; speed.onchange = () => sendSfxLoop(effect.id, { playing: true, volume: track.volume, loop: track.loop, rate: Number(speed.value), repeats: track.repeats });
      for (const value of [1, 2, 3, 4, 6, 12]) { const option = document.createElement('option'); option.value = String(value); option.textContent = `${value} vez${value === 1 ? '' : 'es'}`; option.selected = value === track.repeats; amount.append(option); }
      amount.disabled = track.loop; amount.title = track.loop ? 'Desactiva ∞ para elegir repeticiones' : 'Número de repeticiones'; amount.setAttribute('aria-label', `Repeticiones de ${effect.label}`); amount.onchange = () => sendSfxLoop(effect.id, { playing: true, volume: track.volume, loop: false, rate: track.rate, repeats: Number(amount.value) });
      volume.type = 'range'; volume.min = '0'; volume.max = '1'; volume.step = '.05'; volume.value = String(track.volume); volume.title = 'Volumen de la secuencia'; volume.setAttribute('aria-label', `Volumen de ${effect.label}`); volume.onchange = () => sendSfxLoop(effect.id, { playing: true, volume: Number(volume.value), loop: track.loop, rate: track.rate, repeats: track.repeats });
      controls.append(repeat, speed, amount, volume); card.append(controls);
    }
    box.append(card);
  }
}

function renderWeather(current: DmState) {
  const { storm, stormIntensity } = current.environment, toggle = $('weatherToggle') as HTMLButtonElement, intensity = $('weatherIntensity') as HTMLInputElement;
  const preset = weatherPreset(stormIntensity); $('weatherTitle').textContent = `${preset.label} · lluvia`;
  $('weatherSummary').textContent = storm ? `${preset.label} activa · intensidad ${Math.round(stormIntensity * 100)}%.` : 'Sin efectos activos.';
  $('linkedSound').textContent = storm ? `${preset.label}: ambiente de lluvia sincronizado al ${Math.round(current.audio.layers.storm.volume * 100)}%.` : 'Se activará al iniciar el clima.';
  toggle.textContent = storm ? '❚❚' : '▶'; toggle.setAttribute('aria-label', storm ? 'Detener tormenta' : 'Activar tormenta'); toggle.setAttribute('aria-pressed', String(storm));
  if (!intensity.matches(':focus')) intensity.value = String(stormIntensity); $('weatherLevel').textContent = `${Math.round(stormIntensity * 100)}%`;
  intensity.oninput = () => { $('weatherLevel').textContent = `${Math.round(Number(intensity.value) * 100)}%`; };
  intensity.onchange = () => { const next = Number(intensity.value), source = weatherPreset(next); command({ type: 'environment', storm, intensity: next, trackId: source.assetId }); };
  toggle.onclick = () => { const next = Number(intensity.value), source = weatherPreset(next); command({ type: 'environment', storm: !storm, intensity: next, trackId: source.assetId }); };
}

function showVisualPage(open: boolean, focus = false) {
  visualPageOpen = open;
  dmMobileUiPreferences = { ...dmMobileUiPreferences, visualPageOpen: open }; persistDmMobileUiPreferences();
  const track = $('pageTrack'); track.classList.remove('dragging'); track.style.transform = open ? 'translate3d(0,0,0)' : 'translate3d(-50%,0,0)';
  document.querySelectorAll<HTMLButtonElement>('[data-page]').forEach(button => button.setAttribute('aria-selected', String(button.dataset.page === (open ? 'visual' : 'sound'))));
  if (focus && open) window.setTimeout(() => $('weatherToggle').focus(), 220);
}
function showSoundSection(section: SoundSection, focus = false) {
  soundSection = section;
  dmMobileUiPreferences = { ...dmMobileUiPreferences, soundSection: section }; persistDmMobileUiPreferences();
  document.querySelectorAll<HTMLButtonElement>('[data-audio-section]').forEach(button => {
    const selected = button.dataset.audioSection === section;
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
    if (selected && focus) button.focus();
  });
  document.querySelectorAll<HTMLElement>('.sound-section').forEach(panel => {
    panel.hidden = panel.id !== `${section}Panel`;
  });
}
function ambienceRow(id: AmbienceChannel, track: AudioState['music']) {
  const meta = ambientMeta[id], row = document.createElement('article'), heading = document.createElement('div'), icon = document.createElement('button'), info = document.createElement('div'), title = document.createElement('button'), description = document.createElement('small'), picker = document.createElement('div'), button = document.createElement('button'), label = document.createElement('label'), level = document.createElement('output'), range = document.createElement('input'), cadence = document.createElement('div'), loop = document.createElement('button'), speed = document.createElement('button'), repeats = document.createElement('button');
  const options = campaignAudio?.library?.ambience ?? [], selected = options.find(item => item.id === track.assetId) ?? options[0];
  const trackLabel = selected?.label ?? campaignAudio?.layerLabels?.[id] ?? (id === 'ocean' ? 'Océano' : id === 'wind' ? 'Viento' : id === 'wood' ? 'Madera' : 'Tormenta');
  row.className = `ambience-row${track.playing ? ' active' : ''}`; row.dataset.channel = id; heading.className = 'ambience-head'; icon.type = 'button'; icon.className = 'ambience-icon ambience-drag-handle'; icon.textContent = meta.icon; icon.title = `Arrastra para recolocar ${trackLabel}; usa las flechas para moverla`;
  icon.setAttribute('aria-label', `Mover ${trackLabel}. Usa flecha izquierda o arriba para adelantar y derecha o abajo para retrasar.`);
  icon.onkeydown = event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowUp' && event.key !== 'ArrowRight' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    const index = ambienceOrder.indexOf(id), offset = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1, destination = Math.max(0, Math.min(ambienceOrder.length - 1, index + offset));
    if (destination !== index) { const next = [...ambienceOrder]; next.splice(index, 1); next.splice(destination, 0, id); saveAmbienceOrder(next); refreshAmbienceOrder(id); }
  };
  icon.onpointerdown = event => {
    if (!event.isPrimary || event.button !== 0) return;
    event.preventDefault(); icon.setPointerCapture(event.pointerId);
    ambienceDrag = { channel: id, pointerId: event.pointerId, x: event.clientX, y: event.clientY, target: null, after: false, started: false };
  };
  icon.onpointermove = event => {
    if (!ambienceDrag || ambienceDrag.pointerId !== event.pointerId) return;
    const drag = ambienceDrag;
    if (!drag.started && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 8) return;
    drag.started = true; row.classList.add('is-dragging');
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('.ambience-row');
    document.querySelectorAll('.ambience-row.drop-target').forEach(card => card.classList.remove('drop-target'));
    if (target?.dataset.channel && target.dataset.channel !== id && ambienceChannels.includes(target.dataset.channel as AmbienceChannel)) {
      const bounds = target.getBoundingClientRect(), horizontal = Math.abs(event.clientX - (bounds.left + bounds.width / 2)) > Math.abs(event.clientY - (bounds.top + bounds.height / 2));
      drag.target = target.dataset.channel as AmbienceChannel;
      drag.after = horizontal ? event.clientX > bounds.left + bounds.width / 2 : event.clientY > bounds.top + bounds.height / 2;
      target.classList.add('drop-target');
    } else drag.target = null;
  };
  const finishDrag = (event: PointerEvent) => {
    if (!ambienceDrag || ambienceDrag.pointerId !== event.pointerId) return;
    const drag = ambienceDrag; ambienceDrag = null;
    document.querySelectorAll('.ambience-row.is-dragging, .ambience-row.drop-target').forEach(card => card.classList.remove('is-dragging', 'drop-target'));
    if (drag.started && drag.target) {
      const next = [...ambienceOrder], sourceIndex = next.indexOf(drag.channel), targetIndex = next.indexOf(drag.target);
      if (sourceIndex >= 0 && targetIndex >= 0) { next.splice(sourceIndex, 1); next.splice(targetIndex + (drag.after ? 1 : 0) - (sourceIndex < targetIndex + (drag.after ? 1 : 0) ? 1 : 0), 0, drag.channel); saveAmbienceOrder(next); refreshAmbienceOrder(drag.channel); }
    }
  };
  icon.onpointerup = finishDrag; icon.onpointercancel = event => { if (ambienceDrag?.pointerId === event.pointerId) { ambienceDrag = null; document.querySelectorAll('.ambience-row.is-dragging, .ambience-row.drop-target').forEach(card => card.classList.remove('is-dragging', 'drop-target')); } };
  info.className = 'ambience-copy'; title.type = 'button'; title.className = 'ambience-source'; title.textContent = trackLabel; title.setAttribute('aria-label', `Elegir ambiente. Actual: ${trackLabel}`); title.setAttribute('aria-expanded', 'false'); title.setAttribute('aria-controls', `ambience-picker-${id}`);
  description.textContent = selected?.description ?? meta.description; info.append(title, description);
  picker.id = `ambience-picker-${id}`; picker.className = 'ambience-track-menu'; picker.setAttribute('role', 'group'); picker.setAttribute('aria-label', `Ambientes disponibles para ${trackLabel}`); picker.hidden = true;
  for (const item of options) {
    const option = document.createElement('button'); option.type = 'button'; option.className = 'ambience-track-option'; option.textContent = item.label; option.setAttribute('aria-pressed', String(item.id === selected?.id));
    option.onclick = () => {
      title.textContent = item.label; title.setAttribute('aria-label', `Elegir ambiente. Actual: ${item.label}`); description.textContent = item.description ?? meta.description;
      picker.setAttribute('aria-label', `Ambientes disponibles para ${item.label}`); picker.querySelectorAll<HTMLButtonElement>('.ambience-track-option').forEach(choice => choice.setAttribute('aria-pressed', String(choice === option)));
      picker.hidden = true; title.setAttribute('aria-expanded', 'false'); title.focus({ preventScroll: true }); command({ type: 'audio:select', channel: id, trackId: item.id });
    };
    picker.append(option);
  }
  title.disabled = !options.length;
  title.onclick = () => {
    const open = title.getAttribute('aria-expanded') !== 'true';
    document.querySelectorAll<HTMLButtonElement>('.ambience-source[aria-expanded="true"]').forEach(toggle => { if (toggle !== title) { toggle.setAttribute('aria-expanded', 'false'); document.getElementById(toggle.getAttribute('aria-controls') ?? '')?.setAttribute('hidden', ''); } });
    title.setAttribute('aria-expanded', String(open)); picker.hidden = !open;
  };
  picker.onkeydown = event => { if (event.key === 'Escape') { event.preventDefault(); picker.hidden = true; title.setAttribute('aria-expanded', 'false'); title.focus(); } };
  button.type = 'button'; button.className = 'ambience-toggle'; button.textContent = track.playing ? 'Ⅱ' : '▶'; button.title = track.playing ? `Pausar ${trackLabel}` : `Reproducir ${trackLabel}`; button.setAttribute('aria-label', button.title); button.setAttribute('aria-pressed', String(track.playing));
  const send = (next: Partial<Pick<AudioState['music'], 'playing' | 'volume' | 'loop' | 'rate' | 'repeats'>> = {}) => sendAudio(id, { playing: next.playing ?? track.playing, volume: next.volume ?? Number(range.value), loop: next.loop ?? track.loop, rate: next.rate ?? track.rate, repeats: next.repeats ?? track.repeats });
  button.onclick = () => send({ playing: !track.playing }); range.type = 'range'; range.min = '0'; range.max = '1'; range.step = '.05'; range.value = String(track.volume); range.setAttribute('aria-label', `Volumen de ${trackLabel}`); level.textContent = `${Math.round(track.volume * 100)}%`; range.oninput = () => level.textContent = `${Math.round(Number(range.value) * 100)}%`; range.onchange = () => send({ volume: Number(range.value) }); label.append('Volumen', level, range);
  cadence.className = 'cadence'; loop.type = 'button'; loop.className = `loop-control${track.loop ? ' active' : ''}`; loop.textContent = '∞'; loop.title = track.loop ? 'Bucle infinito activo' : 'Repetir un número definido de veces'; loop.setAttribute('aria-pressed', String(track.loop)); loop.onclick = () => send({ loop: !track.loop });
  const rates = [.75, 1, 1.25], currentRate = Math.max(0, rates.indexOf(track.rate)), nextRate = rates[(currentRate + 1) % rates.length]!;
  speed.type = 'button'; speed.className = 'cadence-step'; speed.textContent = `${String(track.rate).replace('.', ',')}×`; speed.title = `Velocidad actual. Tocar para cambiar a ${String(nextRate).replace('.', ',')}×`; speed.setAttribute('aria-label', `Velocidad ${String(track.rate).replace('.', ',')} veces; cambiar a ${String(nextRate).replace('.', ',')} veces`); speed.onclick = () => send({ rate: nextRate });
  const repeatOptions = [1, 2, 3, 6, 12], currentRepeat = Math.max(0, repeatOptions.indexOf(track.repeats)), nextRepeat = repeatOptions[(currentRepeat + 1) % repeatOptions.length]!;
  repeats.type = 'button'; repeats.className = 'cadence-step'; repeats.textContent = `${track.repeats} vez${track.repeats === 1 ? '' : 'es'}`; repeats.disabled = track.loop; repeats.title = track.loop ? 'Desactiva el bucle infinito para elegir repeticiones' : `Tocar para cambiar a ${nextRepeat} veces`; repeats.setAttribute('aria-label', `Repeticiones: ${track.repeats}; cambiar a ${nextRepeat}`); repeats.onclick = () => send({ loop: false, repeats: nextRepeat });
  cadence.append(loop, speed, repeats); heading.append(icon, info, button); row.append(heading, picker, label, cadence); return row;
}

function saveAmbienceOrder(order: AmbienceChannel[]) {
  ambienceOrder = order;
  try { localStorage.setItem(ambienceOrderStorageKey, JSON.stringify(order)); } catch { /* La consola sigue funcionando aunque el navegador no permita guardar preferencias. */ }
}
function refreshAmbienceOrder(focusChannel?: AmbienceChannel) {
  if (!state) return;
  render(state, true);
  if (focusChannel) document.querySelector<HTMLButtonElement>(`.ambience-row[data-channel="${focusChannel}"] .ambience-drag-handle`)?.focus({ preventScroll: true });
}

$('loginForm').onsubmit = event => { event.preventDefault(); void beginDm(($('password') as HTMLInputElement).value); };
document.querySelectorAll<HTMLButtonElement>('[data-page]').forEach(button => button.onclick = () => showVisualPage(button.dataset.page === 'visual', true));
const audioSectionTabs = [...document.querySelectorAll<HTMLButtonElement>('[data-audio-section]')];
document.addEventListener('pointerdown', event => {
  if (event.target instanceof Element && event.target.closest('.ambience-copy, .ambience-track-menu')) return;
  document.querySelectorAll<HTMLButtonElement>('.ambience-source[aria-expanded="true"]').forEach(toggle => {
    toggle.setAttribute('aria-expanded', 'false'); document.getElementById(toggle.getAttribute('aria-controls') ?? '')?.setAttribute('hidden', '');
  });
});
audioSectionTabs.forEach((button, index) => {
  button.onclick = () => showSoundSection(button.dataset.audioSection as SoundSection);
  button.onkeydown = event => {
    const offset = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
    const destination = event.key === 'Home' ? 0 : event.key === 'End' ? audioSectionTabs.length - 1 : (index + offset + audioSectionTabs.length) % audioSectionTabs.length;
    if (offset || event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      showSoundSection(audioSectionTabs[destination]!.dataset.audioSection as SoundSection, true);
    }
  };
});
showSoundSection(soundSection);
showVisualPage(visualPageOpen);
document.querySelectorAll<HTMLButtonElement>('[data-effect-filter]').forEach(button => button.onclick = () => {
  const next = button.dataset.effectFilter;
  if (!effectFilters.includes(next as EffectFilter)) return;
  effectFilter = next as EffectFilter;
  dmMobileUiPreferences = { ...dmMobileUiPreferences, effectFilter }; persistDmMobileUiPreferences();
  document.querySelectorAll<HTMLButtonElement>('[data-effect-filter]').forEach(filter => filter.setAttribute('aria-pressed', String(filter === button)));
  renderEffects();
});
document.querySelectorAll<HTMLButtonElement>('[data-effect-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.effectFilter === effectFilter)));
document.querySelectorAll<HTMLButtonElement>('[data-weather-intensity]').forEach(button => button.onclick = () => {
  if (!state) return; const intensity = Number(button.dataset.weatherIntensity), preset = weatherPreset(intensity);
  command({ type: 'environment', storm: true, intensity, trackId: preset.assetId });
});
const swipeSurface = $('swipeSurface'), pageTrack = $('pageTrack');
swipeSurface.addEventListener('pointerdown', event => {
  if (!event.isPrimary || event.pointerType === 'mouse') return;
  const target = event.target;
  swipe = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, lastX: event.clientX, lastTime: event.timeStamp, velocityX: 0, dragging: false, direction: 'pending', interactive: target instanceof Element && Boolean(target.closest('input,button,select,option,textarea,label,a,[contenteditable="true"]')) };
});
swipeSurface.addEventListener('pointermove', event => {
  if (!swipe || swipe.pointerId !== event.pointerId || swipe.interactive) return;
  const dx = event.clientX - swipe.x, dy = event.clientY - swipe.y;
  if (swipe.direction === 'pending') {
    if (Math.hypot(dx, dy) < 10) return;
    swipe.direction = Math.abs(dx) > Math.abs(dy) * 1.2 ? 'horizontal' : 'vertical';
  }
  if (swipe.direction === 'vertical') { swipe = null; return; }
  swipe.dragging = true; event.preventDefault(); swipe.velocityX = (event.clientX - swipe.lastX) / Math.max(1, event.timeStamp - swipe.lastTime); swipe.lastX = event.clientX; swipe.lastTime = event.timeStamp;
  if (!swipeSurface.hasPointerCapture(event.pointerId)) swipeSurface.setPointerCapture(event.pointerId);
  const width = Math.max(swipeSurface.clientWidth, 1), base = visualPageOpen ? 0 : -50;
  const position = Math.max(-50, Math.min(0, base + (dx / width) * 50));
  pageTrack.classList.add('dragging'); pageTrack.style.transform = `translate3d(${position}%,0,0)`;
});
swipeSurface.addEventListener('pointerup', event => {
  if (!swipe || swipe.pointerId !== event.pointerId) return;
  const dx = event.clientX - swipe.x, dy = event.clientY - swipe.y, velocityX = swipe.velocityX;
  const horizontal = swipe.direction === 'horizontal' && swipe.dragging && Math.abs(dx) > Math.abs(dy);
  const committed = Math.abs(dx) >= Math.max(42, swipeSurface.clientWidth * .14) || Math.abs(velocityX) > .45 && Math.abs(dx) > 24;
  if (horizontal && committed && !visualPageOpen && dx > 0) showVisualPage(true);
  else if (horizontal && committed && visualPageOpen && dx < 0) showVisualPage(false);
  else showVisualPage(visualPageOpen);
  swipe = null;
});
swipeSurface.addEventListener('pointercancel', event => { if (swipe?.pointerId === event.pointerId) { showVisualPage(visualPageOpen); swipe = null; } });
addEventListener('keydown', event => { if (event.key === 'Escape' && visualPageOpen) showVisualPage(false); });
void beginDm();
