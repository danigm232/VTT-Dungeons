import { io, type Socket } from 'socket.io-client';
import { OBJECT_MODEL_VERSION, PROTOCOL_VERSION } from '../../engine/shared/protocol';
import type { AudioState, BasicCombatAction, Cell, CommandResult, CombatAction, CombatParticipant, DmObject, DmState, WorldSnapshot } from '../../engine/shared/protocol';
import type { PublicCampaignDefinition } from '../../engine/shared/campaign';
import { footprintFor } from '../../engine/shared/geometry';
import { commandId } from '../../engine/client/uuid';
import { loadCampaign } from './campaign';
import { WorldRenderer } from './world';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
let socket: Socket | null = null, state: DmState | null = null, world: WorldRenderer | null = null, campaign: PublicCampaignDefinition | null = null;
let selectedId: string | null = null, draft: DmObject | null = null, latestSnapshot: WorldSnapshot | null = null, readyEpoch = -1, toastTimer = 0;
type CampPoint = NonNullable<PublicCampaignDefinition['scenes'][number]['camp']>['interactionPoints'][number];
let campInteractionMode = false, campPointSceneId: string | null = null;
let connectionGeneration = 0, pendingDraftCommand: { commandId: string; generation: number } | null = null;
let runtimeEpoch: string | null = null, csrfToken: string | null = null;
let lastSharedCameraKey: string | null = null;
let selectedCombatantId: string | null = null, selectedMapEntityId: string | null, lastCombatMoveAt = 0, combatConsoleMinimized = false;
const wreckC8Loot = [
  'Vino fino: 5 botellas, 10 po cada una (algunas pueden estar rotas)',
  'Clavo de olor: 10 kg, 60 po',
  'Lingotes de plata: 10 de medio kilo, 5 po cada uno',
  'Candelabros de hueso de dragón tallado: pareja, 25 po cada uno',
  'Laúd: 50 po',
  'Pergamino de Orden imperiosa'
];
type DmCombatActionCategory = 'attack' | 'magic' | 'bonus' | 'reaction' | 'utility' | 'dm';
let dmCombatActionCategory: DmCombatActionCategory = 'attack';
type SaveStatus = { mode: string; stateRevision: number; savedStateRevision: number | null; generation: number | null; savedAt: string | null; dirty: boolean; errorCode: string | null; runtimeEpoch: string };
let saveStatus: SaveStatus | null = null;
let draftAction: { type: 'transform' | 'detach' | 'structure'; outcome?: 'caught' | 'fallen'; structure?: 'damaged' | 'destroyed'; requestId?: string; objectRevision: number; sceneEpoch: number; connectionGeneration: number } | null = null;
const epochCommands = new Set(['scene', 'view:focus', 'entity:portal', 'creature', 'npc:visible', 'camera', 'environment', 'entity:move', 'combat:start', 'combat:participant', 'combat:initiative', 'combat:initiativeOrder', 'combat:condition', 'combat:endTurn', 'combat:next', 'combat:end', 'combat:declare', 'combat:basic', 'combat:escape', 'combat:rollAttack', 'combat:rollDamage', 'combat:rollSave', 'combat:rollDeathSave', 'combat:recharge', 'resolveInteraction', 'object:door', 'object:interact', 'object:transform', 'object:detach', 'object:structure', 'object:undo', 'pickup:take', 'camp:rest']);

type WindowLayout = { span?: number; height?: number };
type WorkspaceState = { closed: string[]; minimized: string[]; maximized: string[]; windows: Record<string, WindowLayout>; order: string[] };
const workspaceStorageKey = 'dnd-dm-workspace-v9', workspaceGap = 16, workspaceColumns = 12, minimumWindowHeight = 132;
const workspaceWindows = new Map<string, HTMLElement>();
let workspaceReady = false, hasSavedWorkspace = false;
function workspace() { return document.querySelector<HTMLElement>('.grid.workspace'); }
function readWorkspace(): WorkspaceState {
  try { const saved = JSON.parse(localStorage.getItem(workspaceStorageKey) ?? '{}') as Partial<WorkspaceState>; return { closed: saved.closed ?? [], minimized: saved.minimized ?? [], maximized: saved.maximized ?? [], windows: saved.windows ?? {}, order: saved.order ?? [] }; }
  catch { return { closed: [], minimized: [], maximized: [], windows: {}, order: [] }; }
}
function defaultWindowSpan(card: HTMLElement) { return card.id === 'mapWindow' || card.dataset.windowTitle === 'Jugadores' ? 12 : 4; }
function minimumWindowSpan(card: HTMLElement) {
  const desk = workspace(); if (!desk || desk.clientWidth <= 0) return card.id === 'mapWindow' ? 6 : 3;
  const track = (desk.clientWidth - (workspaceColumns - 1) * workspaceGap) / workspaceColumns;
  const minimumWidth = card.id === 'mapWindow' ? 620 : card.id === 'combatCard' ? 280 : 240;
  return Math.max(card.id === 'mapWindow' ? 6 : 3, Math.ceil((minimumWidth + workspaceGap) / (track + workspaceGap)));
}
function setWindowSpan(card: HTMLElement, requested: number) {
  const span = Math.max(minimumWindowSpan(card), Math.min(workspaceColumns, Math.round(requested)));
  card.style.setProperty('--window-span', String(span)); card.dataset.windowSpan = String(span);
}
function spanForWidth(card: HTMLElement, width: number) {
  const desk = workspace(); if (!desk || desk.clientWidth <= 0) return defaultWindowSpan(card);
  const track = (desk.clientWidth - (workspaceColumns - 1) * workspaceGap) / workspaceColumns;
  return Math.round((width + workspaceGap) / (track + workspaceGap));
}
function writeWorkspace() {
  if (!workspaceReady) return;
  const current: WorkspaceState = { closed: [], minimized: [], maximized: [], windows: {}, order: [] };
  current.order = Array.from(workspace()?.children ?? []).flatMap(child => child instanceof HTMLElement && child.dataset.windowId ? [child.dataset.windowId] : []);
  for (const [id, card] of workspaceWindows) {
    if (card.classList.contains('window-closed')) current.closed.push(id);
    if (card.classList.contains('window-minimized')) current.minimized.push(id);
    if (card.classList.contains('window-maximized')) current.maximized.push(id);
    const height = Number.parseFloat(card.style.getPropertyValue('--window-height'));
    current.windows[id] = { span: Number(card.style.getPropertyValue('--window-span') || defaultWindowSpan(card)), ...(Number.isFinite(height) ? { height } : {}) };
  }
  localStorage.setItem(workspaceStorageKey, JSON.stringify(current));
}
function snapWindowToGrid(card: HTMLElement, measuredWidth = card.getBoundingClientRect().width) {
  if (card.classList.contains('window-maximized')) return;
  setWindowSpan(card, spanForWidth(card, measuredWidth));
}
function visibleWorkspaceWindows() { return [...workspaceWindows.values()].filter(card => !card.classList.contains('window-closed') && !card.classList.contains('window-minimized') && !card.classList.contains('window-maximized')); }
function syncRowHeight(card: HTMLElement, height: number) {
  const top = card.getBoundingClientRect().top;
  for (const peer of visibleWorkspaceWindows()) if (Math.abs(peer.getBoundingClientRect().top - top) < 2) peer.style.setProperty('--window-height', `${Math.round(height)}px`);
}
function syncWorkspaceRowHeights() {
  const rows: HTMLElement[][] = [];
  for (const card of visibleWorkspaceWindows()) {
    const top = card.getBoundingClientRect().top;
    const row = rows.find(items => Math.abs(items[0]!.getBoundingClientRect().top - top) < 2);
    (row ?? rows[rows.push([]) - 1]!).push(card);
  }
  for (const row of rows) {
    const height = Math.max(...row.map(card => card.getBoundingClientRect().height));
    for (const card of row) card.style.setProperty('--window-height', `${Math.round(height)}px`);
  }
}
function arrangeWorkspace() {
  for (const card of workspaceWindows.values()) { card.classList.remove('window-maximized'); card.style.removeProperty('--window-height'); setWindowSpan(card, defaultWindowSpan(card)); }
  writeWorkspace(); requestAnimationFrame(() => world?.refreshLayout());
}
function windowTitle(card: HTMLElement) { return card.querySelector('h2')?.textContent?.trim() || 'Ventana'; }
function renderClosedWindows() {
  const list = $('closedWindows'); list.replaceChildren(); const closed = [...workspaceWindows.values()].filter(card => card.classList.contains('window-closed'));
  if (!closed.length) { const note = document.createElement('p'); note.className = 'note'; note.textContent = 'No hay ventanas cerradas.'; list.append(note); return; }
  for (const card of closed) { const row = document.createElement('div'), title = document.createElement('span'), restore = document.createElement('button'); row.className = 'closed-window'; title.textContent = card.dataset.windowTitle ?? 'Ventana'; restore.textContent = 'Recuperar'; restore.onclick = () => { card.classList.remove('window-closed'); setWindowSpan(card, Number(card.style.getPropertyValue('--window-span')) || defaultWindowSpan(card)); renderClosedWindows(); requestAnimationFrame(() => { syncWorkspaceRowHeights(); writeWorkspace(); world?.refreshLayout(); }); }; row.append(title, restore); list.append(row); }
}
function toggleMaximize(card: HTMLElement) {
  card.classList.toggle('window-maximized');
  requestAnimationFrame(() => { syncWorkspaceRowHeights(); writeWorkspace(); world?.refreshLayout(); });
}
function setupWorkspace() {
  const desk = document.querySelector<HTMLElement>('.grid'); if (!desk) return; desk.classList.add('workspace'); const saved = readWorkspace(), used = new Set<string>(); hasSavedWorkspace = Object.keys(saved.windows).length > 0;
  let draggedWindow: HTMLElement | null = null;
  const clearDropTargets = () => workspaceWindows.forEach(window => window.classList.remove('drop-target'));
  for (const [index, card] of Array.from(desk.children).entries()) {
    if (!(card instanceof HTMLElement) || !card.matches('section')) continue;
    const base = card.id || windowTitle(card).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `panel-${index}`; let id = base, copy = 2; while (used.has(id)) id = `${base}-${copy++}`; used.add(id);
    card.dataset.windowId = id; card.dataset.windowTitle = windowTitle(card); workspaceWindows.set(id, card); card.classList.add('workspace-window'); card.classList.remove('span'); if (id === 'mapWindow' || card.dataset.windowTitle === 'Jugadores') card.classList.add('window-wide');
    const content = document.createElement('div'); content.className = 'window-content'; content.append(...Array.from(card.childNodes)); const title = document.createElement('h2'); title.className = 'window-title'; title.textContent = card.dataset.windowTitle; const controls = document.createElement('div'); controls.className = 'window-controls';
    const control = (symbol: string, label: string, action: () => void, extra = '') => { const button = document.createElement('button'); button.type = 'button'; button.className = `window-control ${extra}`; button.textContent = symbol; button.title = label; button.setAttribute('aria-label', label); button.onclick = event => { event.stopPropagation(); action(); }; return button; };
    const minimize = control('—', 'Minimizar ventana', () => { card.classList.toggle('window-minimized'); minimize.title = card.classList.contains('window-minimized') ? 'Restaurar ventana' : 'Minimizar ventana'; requestAnimationFrame(() => { syncWorkspaceRowHeights(); writeWorkspace(); world?.refreshLayout(); }); });
    controls.append(minimize, control('□', 'Ampliar ventana', () => toggleMaximize(card)), control('×', 'Cerrar ventana', () => { card.classList.add('window-closed'); renderClosedWindows(); requestAnimationFrame(() => { syncWorkspaceRowHeights(); writeWorkspace(); world?.refreshLayout(); }); }, 'close'));
    const bar = document.createElement('div'); bar.className = 'window-titlebar'; bar.draggable = true; bar.title = 'Arrastra esta barra para recolocar la ventana'; bar.append(title, controls); card.replaceChildren(bar, content); card.querySelector('.window-content h2')?.classList.add('window-original-title');
    const resizeHandle = document.createElement('button'); resizeHandle.type = 'button'; resizeHandle.className = 'window-resize-handle'; resizeHandle.title = 'Redimensionar ventana'; resizeHandle.setAttribute('aria-label', 'Redimensionar ventana'); card.append(resizeHandle);
    resizeHandle.addEventListener('pointerdown', event => {
      if (matchMedia('(max-width: 760px)').matches || card.classList.contains('window-minimized') || card.classList.contains('window-maximized')) return;
      event.preventDefault(); event.stopPropagation(); const start = card.getBoundingClientRect(), startX = event.clientX, startY = event.clientY, pointerId = event.pointerId; card.classList.add('resizing'); resizeHandle.setPointerCapture(pointerId);
      let resizeFrame = 0;
      const move = (next: PointerEvent) => { if (next.pointerId !== pointerId) return; const width = Math.max(240, start.width + next.clientX - startX), height = Math.max(minimumWindowHeight, start.height + next.clientY - startY); cancelAnimationFrame(resizeFrame); resizeFrame = requestAnimationFrame(() => { snapWindowToGrid(card, width); card.style.setProperty('--window-height', `${Math.round(height)}px`); syncRowHeight(card, height); world?.refreshLayout(); }); };
      const finish = (next: PointerEvent) => { if (next.pointerId !== pointerId) return; cancelAnimationFrame(resizeFrame); card.classList.remove('resizing'); resizeHandle.removeEventListener('pointermove', move); resizeHandle.removeEventListener('pointerup', finish); resizeHandle.removeEventListener('pointercancel', finish); if (resizeHandle.hasPointerCapture(pointerId)) resizeHandle.releasePointerCapture(pointerId); writeWorkspace(); requestAnimationFrame(() => { syncWorkspaceRowHeights(); world?.refreshLayout(); }); };
      resizeHandle.addEventListener('pointermove', move); resizeHandle.addEventListener('pointerup', finish, { once: true }); resizeHandle.addEventListener('pointercancel', finish, { once: true });
    });
    bar.addEventListener('dragstart', event => {
      if (matchMedia('(max-width: 760px)').matches || event.target instanceof HTMLElement && event.target.closest('.window-controls')) { event.preventDefault(); return; }
      draggedWindow = card; card.classList.add('dragging'); event.dataTransfer?.setData('text/plain', id); if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
    });
    bar.addEventListener('dragend', () => { if (!draggedWindow) return; draggedWindow.classList.remove('dragging'); draggedWindow = null; clearDropTargets(); writeWorkspace(); requestAnimationFrame(() => world?.refreshLayout()); });
    card.addEventListener('dragover', event => { if (!draggedWindow || draggedWindow === card) return; event.preventDefault(); event.dataTransfer!.dropEffect = 'move'; clearDropTargets(); card.classList.add('drop-target'); });
    card.addEventListener('dragleave', event => { if (!card.contains(event.relatedTarget as Node | null)) card.classList.remove('drop-target'); });
    card.addEventListener('drop', event => {
      if (!draggedWindow || draggedWindow === card) return; event.preventDefault(); const bounds = card.getBoundingClientRect(), nearMiddle = Math.abs(event.clientY - (bounds.top + bounds.height / 2)) < bounds.height * .3, insertAfter = nearMiddle ? event.clientX > bounds.left + bounds.width / 2 : event.clientY > bounds.top + bounds.height / 2; desk.insertBefore(draggedWindow, insertAfter ? card.nextElementSibling : card); clearDropTargets(); requestAnimationFrame(() => { syncWorkspaceRowHeights(); writeWorkspace(); world?.refreshLayout(); });
    });
    if (id === 'mapWindow') new ResizeObserver(() => { if (workspaceReady) requestAnimationFrame(() => world?.refreshLayout()); }).observe(card);
    const bounds = saved.windows[id]; setWindowSpan(card, bounds?.span ?? defaultWindowSpan(card)); if (bounds?.height) card.style.setProperty('--window-height', `${Math.max(minimumWindowHeight, bounds.height)}px`); if (saved.closed.includes(id)) card.classList.add('window-closed'); if (saved.minimized.includes(id)) card.classList.add('window-minimized'); if (saved.maximized.includes(id)) card.classList.add('window-maximized');
  }
  const ordered = saved.order.map(id => workspaceWindows.get(id)).filter((card): card is HTMLElement => Boolean(card)); const remaining = [...workspaceWindows.values()].filter(card => !ordered.includes(card)); desk.append(...ordered, ...remaining);
  $('arrangeWorkspace').onclick = arrangeWorkspace; $('resetWorkspace').onclick = () => { localStorage.removeItem(workspaceStorageKey); location.reload(); }; document.querySelectorAll<HTMLButtonElement>('[data-drawer-tab]').forEach(button => button.onclick = () => { const tab = button.dataset.drawerTab; document.querySelectorAll<HTMLButtonElement>('[data-drawer-tab]').forEach(item => item.classList.toggle('active', item === button)); document.querySelectorAll<HTMLElement>('[data-drawer-panel]').forEach(panel => { panel.hidden = panel.dataset.drawerPanel !== tab; }); }); renderClosedWindows();
}
function activateWorkspace() { workspaceReady = true; if (!hasSavedWorkspace) arrangeWorkspace(); else requestAnimationFrame(() => world?.refreshLayout()); }

function toast(message: string) { const element = $('toast'); element.textContent = message; element.classList.add('show'); clearTimeout(toastTimer); toastTimer = window.setTimeout(() => element.classList.remove('show'), 2600); }
function command(body: Record<string, unknown>) {
  if (!socket?.connected || !runtimeEpoch) { toast('Sin conexión: el cambio no se ha enviado.'); return null; }
  const id = commandId();
  const epoch = epochCommands.has(String(body.type)) ? { sceneEpoch: state?.sceneEpoch } : {};
  const objectVersion = String(body.type).startsWith('object:') || body.type === 'resolveInteraction' ? { objectRevision: state?.objectRevision ?? 0 } : {};
  socket.emit('dm:command', { commandId: id, runtimeEpoch, ...epoch, ...objectVersion, ...body }); return id;
}

function clearDraft() { draft = null; draftAction = null; pendingDraftCommand = null; world?.clearEditor(); }

async function loadInfo() {
  const info = await fetch('/api/info').then(response => response.json()); const player = $('playerUrl') as HTMLAnchorElement, projector = $('projectorUrl') as HTMLAnchorElement, mobile = $('dmMobileUrl') as HTMLAnchorElement;
  player.textContent = info.playerUrl; player.href = info.playerUrl; projector.href = info.projectorUrl; mobile.href = info.dmMobileUrl; mobile.textContent = info.dmMobileUrl; ($('qr') as HTMLImageElement).src = info.qr; ($('dmMobileQr') as HTMLImageElement).src = info.dmMobileQr;
}

function populateCampaign() {
  const scene = $('scene') as HTMLSelectElement;
  if (campaign!.campaignId === 'stormwreck-isle') {
    const nonPlayable = new Set(['wreck-approach', 'wreck-objects']);
    const selectable = campaign!.scenes.filter(item => !nonPlayable.has(item.id));
    const addGroup = (label: string, definitions: typeof selectable, names: Record<string, string> = {}) => {
      if (!definitions.length) return null;
      const group = document.createElement('optgroup'); group.label = label;
      for (const definition of definitions) {
        const option = document.createElement('option'); option.value = definition.id;
        option.textContent = names[definition.id] ?? definition.title; group.append(option);
      }
      return group;
    };
    const mainAdventure = selectable.filter(item => item.id === 'dragon-rest' || item.id === 'wreck-ship');
    const camps = selectable.filter(item => item.camp);
    const otherLocations = selectable.filter(item => !mainAdventure.includes(item) && !item.camp);
    scene.replaceChildren(
      ...[
        addGroup('Aventura · Isla de las Tempestades', mainAdventure, { 'dragon-rest': 'Retiro del Dragón', 'wreck-ship': 'Pecio · Rosa de los Vientos' }),
        addGroup('Campamentos y descansos', camps),
        addGroup('Otras localizaciones', otherLocations)
      ].filter((group): group is HTMLOptGroupElement => Boolean(group))
    );
    return;
  }
  scene.replaceChildren(...campaign!.scenes.map(item => { const option = document.createElement('option'); option.value = item.id; option.textContent = item.title; return option; }));
}

function selectCurrentScene(sceneId: string) {
  const select = $('scene') as HTMLSelectElement;
  for (const option of Array.from(select.querySelectorAll<HTMLOptionElement>('option[data-saved-scene]'))) if (option.value !== sceneId) option.remove();
  if (!Array.from(select.options).some(option => option.value === sceneId)) {
    const option = document.createElement('option'), savedTitle = campaign?.scenes.find(item => item.id === sceneId)?.title;
    option.value = sceneId; option.textContent = `${savedTitle ?? 'Escena guardada'} · solo para esta partida`; option.hidden = true; option.disabled = true; option.dataset.savedScene = 'true'; select.append(option);
  }
  select.value = sceneId;
}

function connect() {
  socket = io({ auth: { role: 'dm', protocolVersion: PROTOCOL_VERSION, objectModelVersion: OBJECT_MODEL_VERSION } });
  socket.on('connect', () => { connectionGeneration++; $('socketDot').classList.add('on'); readyEpoch = -1; latestSnapshot = null; lastSharedCameraKey = null; clearDraft(); world?.resetConnection(); });
  socket.on('disconnect', () => { connectionGeneration++; $('socketDot').classList.remove('on'); readyEpoch = -1; latestSnapshot = null; clearDraft(); });
  socket.on('auth:error', (error: { code?: string }) => { if (error.code === 'PROTOCOL_MISMATCH') toast('La aplicación se ha actualizado. Recarga esta página.'); else showLogin(); });
  socket.on('runtime:reset', (event: { runtimeEpoch: string; reason?: string }) => {
    connectionGeneration++; runtimeEpoch = event.runtimeEpoch; state = null; latestSnapshot = null; readyEpoch = -1; lastSharedCameraKey = null; clearDraft(); world?.resetConnection();
    void fetch('/api/dm/save/status', { cache: 'no-store' }).then(x => x.ok ? x.json() : null).then(next => { if (next?.runtimeEpoch === runtimeEpoch) { saveStatus = next; renderSave(); } });
  });
  socket.on('save:status', (next: SaveStatus) => { if (next.runtimeEpoch === runtimeEpoch) { saveStatus = next; renderSave(); if (next.mode === 'ready') void renderSaveHistory(); } });
  socket.on('world:snapshot', (snapshot: WorldSnapshot) => { if (snapshot.runtimeEpoch !== runtimeEpoch) return; latestSnapshot = snapshot; void installSnapshot(snapshot); });
  socket.on('dm:state', (next: DmState) => { if (next.runtimeEpoch !== runtimeEpoch) return; if (draftAction && (draftAction.objectRevision !== next.objectRevision || draftAction.sceneEpoch !== next.sceneEpoch || draftAction.connectionGeneration !== connectionGeneration)) clearDraft(); state = next; render(next); });
  socket.on('command:result', (result: CommandResult) => {
    if (result.runtimeEpoch !== runtimeEpoch) return;
    const pending = pendingDraftCommand;
    if (!result.ok) {
      toast(`No aplicado: ${friendlyErrorCode(result.code)}`);
      // Restaura de inmediato un botón de audio/efecto que hubiera mostrado
      // optimistamente una acción rechazada por el servidor.
      if (state) { renderAudio(state, true); renderSfx(state); }
    }
    else if (result.code === 'APPLIED' && pending && pending.commandId === result.commandId && pending.generation === connectionGeneration) { clearDraft(); toast('Cambio aplicado.'); }
  });
  socket.on('combat:animation', (event: { runtimeEpoch: string; attackerId: string; targetId: string; type: 'melee' | 'arrow' | 'thrownWeapon' | 'radiantArrow' | 'vine' | 'fireProjectile' | 'magicalProjectile'; hit: boolean; frozen: boolean; sneakAttack?: boolean }) => { if (event.runtimeEpoch === runtimeEpoch) world?.playRangedAttack(event.attackerId, event.targetId, event.type, event.hit, event.frozen, event.sneakAttack); });
  socket.on('scene:animation', (event: { runtimeEpoch: string; sceneEpoch: number; entityId: string; state: string; durationMs: number }) => { if (event.runtimeEpoch === runtimeEpoch && event.sceneEpoch === latestSnapshot?.sceneEpoch) world?.playTokenAnimation(event.entityId, event.state, event.durationMs); });
  socket.on('scene:area-effect', (event: { runtimeEpoch: string; sceneEpoch: number; cell: { col: number; row: number }; type: 'fog'; radiusMeters: number; durationMs: number }) => { if (event.runtimeEpoch === runtimeEpoch && event.sceneEpoch === latestSnapshot?.sceneEpoch) world?.playAreaEffect(event.cell, event.type, event.radiusMeters, event.durationMs); });
  socket.on('mirror:transformation', (event: { runtimeEpoch: string; sceneEpoch: number; propId: string; sourceId: string; reflectionId: string; frames: string[]; durationMs: number }) => { if (event.runtimeEpoch === runtimeEpoch && event.sceneEpoch === latestSnapshot?.sceneEpoch) world?.playMirrorTransformation(event.propId, event.sourceId, event.reflectionId, event.frames, event.durationMs); });
}

async function installSnapshot(snapshot: WorldSnapshot) {
  const installed = await world?.applySnapshot(snapshot);
  if (installed) { updateCameraOrbitControls(snapshot.sceneId); publishCameraOrientation(); }
  if (installed && socket?.connected && latestSnapshot?.sceneEpoch === snapshot.sceneEpoch && latestSnapshot?.runtimeEpoch === snapshot.runtimeEpoch && readyEpoch !== snapshot.sceneEpoch) { readyEpoch = snapshot.sceneEpoch; socket.emit('scene:ready', { runtimeEpoch, sceneEpoch: snapshot.sceneEpoch }); }
}

const cameraOrientationLabels = ['Vista inicial', '45° a la derecha', '90° a la derecha', '135° a la derecha', '180° · lado opuesto', '135° a la izquierda', '90° a la izquierda', '45° a la izquierda'];
function supportsCameraOrbit(sceneId?: string | null) {
  const scene = campaign?.scenes.find(candidate => candidate.id === sceneId);
  return scene?.renderer === 'babylon-hd2d' && Boolean(scene.terrain);
}
function updateCameraOrbitControls(sceneId = state?.sceneId ?? latestSnapshot?.sceneId) {
  $('cameraOrbitControls').hidden = !supportsCameraOrbit(sceneId);
  const step = world?.getCameraOrientationStep() ?? 0;
  $('cameraOrientationLabel').textContent = cameraOrientationLabels[step] ?? cameraOrientationLabels[0]!;
  const tilt = world?.getCameraTiltDegrees() ?? 30;
  const tiltInput = $('cameraTilt') as HTMLInputElement;
  if (document.activeElement !== tiltInput) tiltInput.value = String(tilt);
  $('cameraTiltValue').textContent = `${tilt}°`;
}
function publishCameraOrientation(force = false) {
  const snapshot = latestSnapshot;
  if (!(($('shareCameraOrientation') as HTMLInputElement | null)?.checked) || !socket?.connected || !runtimeEpoch || !snapshot || !supportsCameraOrbit(snapshot.sceneId)) return;
  const step = world?.getCameraOrientationStep() ?? 0, key = `${snapshot.sceneEpoch}:${snapshot.sceneId}:${step}`;
  if (!force && key === lastSharedCameraKey) return;
  socket.emit('camera:orientation', { runtimeEpoch, sceneEpoch: snapshot.sceneEpoch, sceneId: snapshot.sceneId, step });
  lastSharedCameraKey = key;
}
function stopSharingCameraOrientation() {
  lastSharedCameraKey = null;
  const snapshot = latestSnapshot;
  if (!socket?.connected || !runtimeEpoch || !snapshot || !supportsCameraOrbit(snapshot.sceneId)) return;
  socket.emit('camera:orientation', { runtimeEpoch, sceneEpoch: snapshot.sceneEpoch, sceneId: snapshot.sceneId, step: null });
}
function rotateCamera(delta: number) {
  const sceneId = state?.sceneId ?? latestSnapshot?.sceneId;
  if (!supportsCameraOrbit(sceneId)) return;
  world?.rotateCameraOrientation(delta); updateCameraOrbitControls(sceneId); publishCameraOrientation();
}

function showLogin(message = '') { $('login').hidden = false; $('app').hidden = true; $('loginError').textContent = message; }
const campUpdatesStorageKey = 'dnd-camp-rests-updates-v1.4.0-seen';
function hasCampRestModule() {
  return campaign?.campaignId === 'stormwreck-isle' && campaign.scenes.some(scene => scene.id === 'camp-a1-rooms');
}
function showCampUpdatesIfNeeded() {
  const button = $('openCampUpdates') as HTMLButtonElement, dialog = $('campUpdatesDialog') as HTMLDialogElement;
  if (!hasCampRestModule()) { button.hidden = true; return; }
  button.hidden = false;
  button.onclick = () => { if (!dialog.open) dialog.showModal(); };
  dialog.addEventListener('close', () => { try { localStorage.setItem(campUpdatesStorageKey, 'seen'); } catch { /* La nota sigue disponible mientras la pestaña permanezca abierta. */ } }, { once: true });
  let alreadySeen = false;
  try { alreadySeen = localStorage.getItem(campUpdatesStorageKey) === 'seen'; } catch { /* Si el navegador bloquea el almacenamiento, se muestra en cada inicio. */ }
  if (!alreadySeen) dialog.showModal();
}
async function beginDm(password?: string) {
  const body = password === undefined ? {} : { password };
  const response = await fetch('/api/dm/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!response.ok) { showLogin(password === undefined ? 'Esta mesa requiere clave de DM.' : 'Clave incorrecta.'); return; }
  csrfToken = (await response.json()).csrfToken;
  try {
    campaign = await loadCampaign(); populateCampaign(); world = new WorldRenderer($('dmMap'), campaign, { persistCameraPreferences: true }); world.setMapClick(onMapClick); await loadInfo();
  } catch (error) { console.error('Error al preparar la vista DM', error); showLogin('No se pudo cargar la campaña. Recarga la página.'); return; }
  $('login').hidden = true; $('app').hidden = false; showCampUpdatesIfNeeded(); requestAnimationFrame(activateWorkspace); connect(); void renderSaveHistory();
}
$('loginForm').onsubmit = event => { event.preventDefault(); void beginDm(($('password') as HTMLInputElement).value); };

function render(current: DmState) {
  $('app').classList.toggle('combat-mode', current.combat.active);
  $('campaignTitle').textContent = current.campaignTitle; $('creatureNote').textContent = current.privateNotes.creature; $('wheelNote').textContent = current.privateNotes.wheel;
  selectCurrentScene(current.sceneId); ($('camera') as HTMLSelectElement).value = current.camera.mode; renderFocus(current); updateCameraOrbitControls(current.sceneId);
  $('storm').textContent = current.environment.storm ? 'Detener tormenta' : 'Activar tormenta';
  const stormIntensity = $('stormIntensity') as HTMLInputElement;
  if (!stormIntensity.matches(':focus')) stormIntensity.value = String(current.environment.stormIntensity);
  $('stormIntensityValue').textContent = `${Math.round(current.environment.stormIntensity * 100)}%`;
  const encounter = $('encounterCard'); encounter.hidden = !current.creature || current.sceneId !== current.creature.sceneId;
  if (current.creature) {
    $('creature').textContent = current.creature.visible ? `Ocultar ${current.creature.label}` : `Revelar ${current.creature.label}`;
    if (!($('harpyCol') as HTMLInputElement).matches(':focus')) ($('harpyCol') as HTMLInputElement).value = String(current.creature.cell.col);
    if (!($('harpyRow') as HTMLInputElement).matches(':focus')) ($('harpyRow') as HTMLInputElement).value = String(current.creature.cell.row);
  }
  $('wheelCard').hidden = !current.objects.some(object => object.kind === 'wheel');
  $('projectorDot').classList.toggle('on', current.projectorReady); $('projectorStatus').textContent = current.projectorReady ? 'Proyector conectado' : 'Proyector sin preparar';
  const gameUndo = $('gameUndo') as HTMLButtonElement; gameUndo.disabled = !current.gameUndo.canUndo; gameUndo.textContent = current.gameUndo.label ? `Deshacer: ${current.gameUndo.label}` : 'Deshacer última acción';
  renderMonsterSheet(current); renderPlayers(current); renderNpcs(current); renderCombat(current); renderExploration(current); renderObjects(current); renderAudio(current); renderSfx(current); renderRequests(current); renderCampRest(current);
}

const restPhaseLabels: Record<string, string> = { arrival: 'Llegada', dusk: 'Anochecer', night: 'Noche', dawn: 'Amanecer', finalization: 'Finalización' };
const campPointKindLabels: Record<CampPoint['kind'], string> = { bed: 'Cama', tent: 'Tienda', fire: 'Hoguera', seat: 'Asiento', guard: 'Puesto de guardia', chest: 'Baúl', personal: 'Objeto personal' };
const campPointPlayerActions: Record<CampPoint['kind'], string[]> = {
  bed: ['Usar la cama'], tent: ['Entrar o salir de la tienda'], fire: ['Acercarse a la hoguera'],
  seat: ['Sentarse'], guard: ['Ocupar el puesto de guardia'], chest: ['Abrir o cerrar el baúl'], personal: ['Usar el objeto del personaje']
};

function syncCampInteractionMode(isCamp: boolean) {
  const button = $('campInteractionToggle') as HTMLButtonElement;
  button.hidden = !isCamp;
  if (!isCamp) campInteractionMode = false;
  button.setAttribute('aria-pressed', String(campInteractionMode));
  button.textContent = campInteractionMode ? '◎ Ocultar marcas interactuables' : '◎ Resaltar objetos interactuables';
  world?.setCampInteractionHighlights(campInteractionMode && isCamp);
  if (!isCamp) {
    const dialog = $('campPointDialog') as HTMLDialogElement;
    if (dialog.open) dialog.close();
    campPointSceneId = null;
  }
}

function showCampPoint(point: CampPoint, sceneId: string) {
  const dialog = $('campPointDialog') as HTMLDialogElement;
  const actions = $('campPointActions'), history = $('campPointHistory');
  campPointSceneId = sceneId;
  $('campPointKind').textContent = campPointKindLabels[point.kind].toLocaleUpperCase('es-ES');
  $('campPointTitle').textContent = point.label;
  $('campPointDescription').textContent = point.description;
  const owner = $('campPointOwner');
  const character = point.ownerCharacterId ? state?.characters.find(item => item.id === point.ownerCharacterId) : null;
  owner.hidden = !point.ownerCharacterId;
  owner.textContent = character ? `Uso reservado para ${character.label}.` : point.ownerCharacterId ? 'Uso reservado para su personaje.' : '';
  actions.replaceChildren(...campPointPlayerActions[point.kind].map(label => { const item = document.createElement('li'); item.textContent = label; return item; }));
  const rest = state?.campRest?.sceneId === sceneId ? state.campRest : null;
  const entries = (rest?.interactions ?? []).filter(item => item.pointId === point.id).slice(-5).reverse();
  history.replaceChildren(...entries.map(entry => {
    const item = document.createElement('li');
    const verb = entry.action === 'opened' ? 'abrió' : entry.action === 'closed' ? 'cerró' : 'usó';
    item.textContent = `${entry.characterLabel} ${verb} · ${new Date(entry.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    return item;
  }));
  $('campPointHistorySection').hidden = entries.length === 0;
  if (!dialog.open) dialog.showModal();
}

function renderCampRest(current: DmState) {
  const card = $('campRestCard'), safety = $('campSafety'), status = $('campRestStatus'), actions = $('campRestActions'), pointsBox = $('campPoints'), log = $('campRestLog');
  const scene = campaign?.scenes.find(item => item.id === current.sceneId), camp = scene?.camp;
  card.hidden = !camp;
  syncCampInteractionMode(Boolean(camp && scene));
  if (!camp || !scene) return;
  if (campPointSceneId && campPointSceneId !== scene.id) {
    const dialog = $('campPointDialog') as HTMLDialogElement;
    if (dialog.open) dialog.close();
    campPointSceneId = null;
  }
  safety.textContent = `${camp.canonStatus === 'canon' ? 'Escenario canónico.' : 'Añadido VTT_AMBIENCE; su existencia no implica que sea seguro descansar.'} ${camp.safetyNotice}`;
  const rest = current.campRest?.sceneId === scene.id ? current.campRest : null;
  const restElsewhere = current.campRest && current.campRest.sceneId !== scene.id && current.campRest.phase !== null && current.campRest.phase !== 'finalization';
  status.textContent = restElsewhere ? `Descanso activo en ${campaign?.scenes.find(item => item.id === current.campRest!.sceneId)?.title ?? 'otro escenario'}; termínalo antes de preparar otro.`
    : !rest || rest.phase === null ? 'No hay descanso preparado.' : `${restPhaseLabels[rest.phase] ?? rest.phase}${rest.paused ? ' · Interrumpido; la fase está en pausa.' : ''}${rest.outcome ? ` · El DM decidió: ${rest.outcome === 'completed' ? 'completado' : 'no completado'}.` : ''}`;
  actions.replaceChildren();
  const addAction = (label: string, action: string, disabled = false, extra: Record<string, unknown> = {}, style = '') => {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = label; button.disabled = disabled; if (style) button.className = style;
    button.onclick = () => command({ type: 'camp:rest', action, sceneId: scene.id, ...extra }); actions.append(button); return button;
  };
  const activeElsewhere = Boolean(current.campRest && current.campRest.sceneId !== scene.id && current.campRest.phase !== null && current.campRest.phase !== 'finalization');
  if (!rest || rest.phase === null || rest.phase === 'finalization') addAction('Preparar descanso', 'prepare', activeElsewhere, {}, 'primary');
  else if (rest.paused) addAction('Reanudar', 'resume', false, {}, 'primary');
  else if (rest.phase === 'dawn') {
    addAction('Confirmar descanso completado', 'finalize', false, { completed: true }, 'primary');
    addAction('Finalizar sin completarlo', 'finalize', false, { completed: false }, 'danger');
  } else addAction(`Avanzar: ${restPhaseLabels[rest.phase === 'arrival' ? 'dusk' : rest.phase === 'dusk' ? 'night' : 'dawn']}`, 'advance', false, {}, 'primary');
  if (rest && rest.phase !== null && rest.phase !== 'finalization' && !rest.paused) {
    const interrupt = document.createElement('button'); interrupt.type = 'button'; interrupt.textContent = 'Registrar interrupción'; interrupt.className = 'danger';
    interrupt.onclick = () => { const input = $('campInterruptNote') as HTMLInputElement; if (!input.value.trim()) { input.focus(); toast('Escribe una nota breve sobre la interrupción.'); return; } command({ type: 'camp:rest', action: 'interrupt', sceneId: scene.id, note: input.value.trim() }); input.value = ''; };
    actions.append(interrupt);
  }
  const input = $('campInterruptLabel') as HTMLLabelElement; input.hidden = !(rest && rest.phase !== null && rest.phase !== 'finalization' && !rest.paused);
  pointsBox.replaceChildren();
  const playerNote = document.createElement('p'); playerNote.className = 'muted'; playerNote.textContent = 'Activa «Resaltar objetos interactuables» sobre el mapa y pulsa una marca para consultar sus acciones. Los jugadores las realizan desde su propia vista.'; pointsBox.append(playerNote);
  log.replaceChildren();
  const entries: Array<{ at: number; text: string }> = [];
  if (rest) {
    for (const item of rest.interactions) entries.push({ at: item.at, text: `${item.characterLabel} · ${item.action === 'opened' ? 'abrió' : item.action === 'closed' ? 'cerró' : 'usó'} · ${item.pointLabel}` });
    for (const item of rest.interruptions) entries.push({ at: item.at, text: `Interrupción · ${item.note}` });
  }
  entries.sort((a, b) => a.at - b.at);
  if (entries.length) {
    const heading = document.createElement('b'); heading.textContent = 'Registro'; log.append(heading);
    const list = document.createElement('ul'); for (const entry of entries) { const item = document.createElement('li'); item.textContent = `${new Date(entry.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · ${entry.text}`; list.append(item); } log.append(list);
  }
}

function wreckChapterEnding(current: DmState) {
  const endingDetails = document.createElement('details'), endingSummary = document.createElement('summary');
  endingSummary.textContent = 'C9, maldición y salida del capítulo'; endingDetails.append(endingSummary);
  const secret = document.createElement('p'); secret.textContent = 'El cofre pesa 60 kg y puede sacarse de C9 antes de abrirlo. Solo el DM conoce el contenido del paquete encerado hasta decidir abrirlo: diario y talismán. Tesoro: 55 po, tres turquesas de 10 po y botas élficas. Vencer o ahuyentar a la arpía no rompe la maldición.'; endingDetails.append(secret);
  const clue = document.createElement('p'); clue.className = 'note'; clue.textContent = 'Guía privada de la pista: al abrir el paquete, la bitácora relaciona la última plegaria de Aleitha a Orcus con la muerte de la tripulación; el talismán enlaza mechones de Aleitha y Brastos. Detectar magia revela nigromancia. El retrato de C6 ya anticipa su vínculo. Cuando le entreguen diario y talismán, Runara recuerda a Brastos y les indica su tumba en el cementerio de los acantilados del norte. Resume o lee estos datos solo cuando corresponda: no reveles el diario ni el talismán antes de abrir el paquete.'; endingDetails.append(clue);
  const tale = document.createElement('div'); tale.className = 'button-row';
  const oldEventCheck = (flag: string, label: string, ready = true, oneShot = true) => {
    const row = document.createElement('label'), input = document.createElement('input'); input.type = 'checkbox'; input.checked = Boolean(current.progress[flag]);
    input.disabled = oneShot && input.checked || !ready;
    if (!ready) input.title = 'Aún no se han cumplido los pasos previos de la aventura.';
    input.onchange = () => command({ type: 'progress:toggle', flag, value: input.checked }); row.append(input, label); tale.append(row);
  };
  const packageCanBeRevealed = Boolean(current.progress['wreck.c9-package-taken']
    && !current.progress['wreck.items-given-to-runara'] && !current.progress['wreck.curse-grave'] && !current.progress['wreck.curse-aboard']);
  oldEventCheck('wreck.package-opened', 'El DM abre el paquete encerado: revela el diario y el talismán', packageCanBeRevealed, false);
  oldEventCheck('wreck.items-given-to-runara', 'El DM confirma: diario y talismán entregados a Runara', Boolean(current.progress['wreck.journal-found'] && current.progress['wreck.talisman-found']));
  oldEventCheck('wreck.curse-grave', 'Talismán colocado/quemado en la tumba de Brastos (acantilado norte)', Boolean(current.progress['wreck.items-given-to-runara']));
  const aboard = current.characters.some(character => character.sceneId === 'wreck-ship');
  oldEventCheck('wreck.curse-aboard', 'El DM confirma: talismán destruido a bordo', Boolean(current.progress['wreck.talisman-found'] && !current.progress['wreck.items-given-to-runara'] && aboard));
  oldEventCheck('wreck.curse-day-after', 'El grupo está fuera del pecio y ha pasado la noche: el pecio desaparece al día siguiente', Boolean((current.progress['wreck.curse-grave'] || current.progress['wreck.curse-aboard']) && !aboard));
  oldEventCheck('wreck.cleric-dream', 'Tras resolver la maldición y dormir: la clériga recibe el sueño de aprobación', Boolean((current.progress['wreck.curse-grave'] || current.progress['wreck.curse-aboard']) && current.progress['wreck.curse-day-after']));
  const levelup = document.createElement('section'); levelup.className = 'note';
  const rosterLevels = document.createElement('p');
  rosterLevels.textContent = `Fichas: ${current.characters.map(character => `${character.label}, nivel ${character.sheet?.level ?? 'sin hoja'}`).join(' · ')}.`;
  const levelLabel = document.createElement('label'); levelLabel.textContent = 'Nivel del capítulo para el grupo: ';
  const levelSelect = document.createElement('select');
  const chooseLevel = document.createElement('option'); chooseLevel.value = ''; chooseLevel.textContent = 'Elegir nivel…'; chooseLevel.disabled = true; chooseLevel.selected = true; levelSelect.append(chooseLevel);
  for (const [value, label] of [[2, '2 · aún no jugaron las Cuevas de Pleamar'], [3, '3 · ya completaron las Cuevas']] as const) {
    const option = document.createElement('option'); option.value = String(value); option.textContent = label; levelSelect.append(option);
  }
  const canApplyLevel = Boolean(current.progress['wreck.curse-day-after'] && !current.progress['wreck.chapter-level-up']);
  levelSelect.disabled = !canApplyLevel;
  levelLabel.append(levelSelect);
  const applyLevel = document.createElement('button'); applyLevel.type = 'button';
  applyLevel.textContent = current.progress['wreck.chapter-level-up'] ? 'Nivel del capítulo aplicado' : 'Aplicar nivel a las fichas del grupo';
  applyLevel.disabled = !canApplyLevel || !levelSelect.value;
  levelSelect.onchange = () => { applyLevel.disabled = !canApplyLevel || !levelSelect.value; };
  applyLevel.onclick = () => {
    const level = Number(levelSelect.value);
    if ((level === 2 || level === 3) && window.confirm(`¿Actualizar las fichas del grupo al nivel ${level}? Solo cambiaremos el nivel; revisa con cada jugador PG, rasgos, conjuros y recursos.`))
      command({ type: 'wreck:level-up', level });
  };
  levelup.append(rosterLevels, levelLabel, applyLevel); tale.append(levelup);
  endingDetails.append(tale);
  const endingNote = document.createElement('p'); endingNote.textContent = 'Llevar el talismán a la tumba de Brastos y colocarlo/quemarlo produce un suspiro y niebla esa noche; la clériga recibe su sueño tras dormir. La alternativa es destruirlo a bordo: el suspiro y la niebla se manifiestan mientras reman de vuelta. En ambas rutas el pecio desaparece al día siguiente. El DM aplica el avance de nivel: nivel 2 si aún no jugaron las Cuevas; nivel 3 y Observatorio si ya las completaron.'; endingDetails.append(endingNote);
  return endingDetails;
}

function renderExploration(current: DmState) {
  const card = $('explorationCard'), box = $('exploration'); card.hidden = current.combat.active; box.replaceChildren();
  const actionRequest = current.lastExplorationAction;
  if (actionRequest?.sceneId === current.sceneId) {
    const request = document.createElement('section'), title = document.createElement('b'), action = document.createElement('p'), guidance = document.createElement('p');
    request.className = 'exploration-action-request'; title.textContent = `Petición de ${actionRequest.characterLabel} · ${actionRequest.actionLabel}`;
    action.textContent = `Objetivo: ${actionRequest.targetLabel}. Resuelve la tirada/resultado con la ficha y la situación; no se ha aplicado automáticamente.`;
    guidance.textContent = actionRequest.guidance; guidance.className = 'note'; request.append(title, action, guidance); box.append(request);
  }
  if (current.sceneId === 'wreck-ship') {
    const title = document.createElement('b'); title.textContent = 'Rosa de los Vientos · guía de escena para el DM';
    const intro = document.createElement('p'); intro.textContent = 'Llegada: desde el Retiro son unos 4 km remando (aprox. 1 h 40 min). La barca queda junto al costado de estribor; la entrada principal es trepar por la jarcia colgante hasta C1. Con la jarcia estable no hace falta inventar una prueba: pide Atletismo solo si la ficción presenta una dificultad concreta. En combate, trepar o nadar cuesta el doble de movimiento salvo velocidad especial adecuada. Alternativa: nadar por la brecha de popa y entrar directamente a C9.';
    const sea = document.createElement('p'); sea.textContent = 'Regreso: subir de C9 a C8 por la escalera, volver a C1 y bajar por la jarcia a la barca. El paso de la barca al Retiro lo confirma el DM. La entrada submarina es opcional; el DM controla movimiento/respiración y puede dejar que emerjan en C8, sin añadir un límite de tiempo que la aventura no impone.';
    const arrival = document.createElement('p'); arrival.textContent = `Viaje a bordo: ${current.progress['wreck.boat-arrived'] ? 'llegada registrada' : 'pendiente'} · Abordaje por jarcia o brecha: ${current.progress['wreck.boarded'] ? 'registrado' : 'pendiente'}.`;
    const arrivalDetails = document.createElement('details'), arrivalSummary = document.createElement('summary'); arrivalSummary.textContent = 'Llegada, rutas y encuentros'; arrivalDetails.append(arrivalSummary, intro, sea, arrival);
    const events = document.createElement('div'); events.className = 'button-row';
    const eventCheck = (flag: string, label: string, oneShot = true, ready = true, readyNotice = 'El grupo debe estar a bordo para registrar este suceso.') => {
      const row = document.createElement('label'), input = document.createElement('input'); input.type = 'checkbox'; input.checked = Boolean(current.progress[flag]);
      input.disabled = oneShot && input.checked || !ready; if (!ready) input.title = readyNotice;
      input.onchange = () => command({ type: 'progress:toggle', flag, value: input.checked }); row.append(input, label); events.append(row);
    };
    eventCheck('wreck.c4-second-force-failed', 'DM confirma: hizo falta más de una prueba de Fuerza para abrir C4');
    eventCheck('wreck.aboard-rest-completed', 'Registrar descanso completado a bordo (la arpía vuelve en la próxima entrada a C1)', true, current.characters.some(character => character.sceneId === 'wreck-ship'));
    eventCheck('wreck.harpy-resolved', 'Arpía resuelta: derrotada, ahuyentada o negociada', true,
      Boolean(current.progress['wreck.harpy-return-triggered']), 'La arpía debe haber regresado y aparecer en el barco antes de registrar su resolución.');
    const eventDetails = document.createElement('details'), eventSummary = document.createElement('summary'); eventSummary.textContent = 'Sucesos y criterio del DM';
    const c3 = document.createElement('p'); c3.textContent = `Timón C3: ${current.progress['wreck.c3-wheel-fell'] ? 'cayó; el golpe alerta a los zombis de C4 y se oye llamar tras la puerta cada 10–15 s' : 'salvación de Destreza CD 10 solo si deciden girarlo; el DM resuelve el dado físico'}. Si la puerta de C4 necesitó una segunda prueba de Fuerza, marca la casilla de arriba aunque ese segundo intento tuviera éxito. Al abrir C4 siempre aparecen 2 zombis (nivel 1) o 3 (nivel 2): con alerta esperan tras la puerta; sin ella deambulan por el camarote.`;
    const c4Nest = document.createElement('p'); c4Nest.textContent = 'Botín: al abrir C4 quedan accesibles una bolsa de 50 po, herramientas de cartógrafo, una daga y una brújula (25 po). La cofa contiene una pulsera de oro (25 po), un pendiente de oro (25 po), dos ojos de tigre (10 po cada uno) y un heliotropo (50 po): 120 po en total. Si la arpía vuelve y el grupo devuelve lo tomado de su nido, puede aceptar marcharse.';
    const c8 = document.createElement('p'); c8.textContent = 'C8: agua difícil (15–45 cm), 1 zombi + gul a nivel 1; a nivel 2, 3 zombis + gul. Abrir cada caja requiere 1 minuto con palanqueta o 10 minutos sin ella; el DM tira el d6. C5: los cangrejos pequeños mueven el esqueleto, pero no atacan. C6: alijo de 200 po; el dardo se resuelve solo cuando el DM confirma que se activó.';
    const harpy = document.createElement('p'); harpy.textContent = 'La arpía vuelve cuando encuentran el cofre de C9 y regresan a C8, o tras descansar a bordo; aparece al volver a C1. No es necesario abrir el cofre para registrar que lo hallaron. Primer turno: canto cautivador. A nivel 2 aparece además una arpía en C2; la rivalidad entre ambas permite al grupo intentar engañarlas o separarlas. La arpía habla común, puede negociar y puede huir si pierde más de la mitad de sus PG. El DM decide canción, tiradas, diálogo y resultado; vencerla o ahuyentarla no rompe la maldición.';
    eventDetails.append(eventSummary, c3, c4Nest, c8, harpy, events);

    const lootDetails = document.createElement('details'), lootSummary = document.createElement('summary'); lootSummary.textContent = 'Botín de C8 · resultados únicos del d6'; lootDetails.append(lootSummary);
    const lootIntro = document.createElement('p'); lootIntro.textContent = 'Tira el d6 al abrir cada caja, no los barriles decorativos, y asigna ese resultado en la fila de la caja abierta. El contenido pasa a la mochila al adjudicarlo; cada resultado solo puede aparecer una vez en C8.'; lootDetails.append(lootIntro);
    const lootList = document.createElement('ul');
    wreckC8Loot.forEach((label, index) => {
      const item = document.createElement('li'), used = Boolean(current.progress[`wreck.c8-loot-${index + 1}`]);
      item.textContent = `${index + 1}. ${label} · ${used ? 'ya asignado' : 'disponible'}`; lootList.append(item);
    });
    lootDetails.append(lootList);

    const endingDetails = wreckChapterEnding(current);

    const present = document.createElement('p'); present.textContent = `Personajes reclamados aquí: ${current.characters.filter(character => character.claimed && character.sceneId === current.sceneId).map(character => character.label).join(', ') || 'ninguno'}.`;
    box.append(title, present, arrivalDetails, eventDetails, lootDetails, endingDetails); return;
  }
  if (current.sceneId === 'dragon-rest') {
    const title = document.createElement('b'); title.textContent = 'Retiro del Dragón · puerto y desenlace del Pecio';
    const openingDetails = document.createElement('details'), openingSummary = document.createElement('summary'); openingSummary.textContent = 'Llegada a la isla · gancho del capítulo 3'; openingDetails.append(openingSummary);
    const opening = document.createElement('p'); opening.textContent = 'Después del encuentro de zombis en la playa, Runara puede explicar que Varnoth y Rix avistaron un naufragio reciente al norte y sospecha que los restos ocultan un barco mucho más antiguo: el Rosa de los Vientos. Ofréceles investigar el Pecio o ir antes a las Cuevas de Pleamar; la aventura permite que el grupo elija el orden.';
    const boat = document.createElement('p'); boat.textContent = 'Para ir al Pecio, prepara la barca del puerto: son unos 4 km (aprox. 1 h 40 min). Allí pueden amarrar a la jarcia caída de estribor y trepar a C1 —la vía normal, fácil y sin prueba forzada— o nadar hasta la brecha de popa y entrar por C9. En combate, trepar o nadar cuesta el doble de movimiento salvo que tengan la velocidad especial adecuada; pide Atletismo solo si la situación concreta lo dificulta. El viaje y el momento de salida los confirma el DM.';
    openingDetails.append(opening, boat);
    const objective = document.createElement('p'); objective.textContent = `La barca cubre unos 4 km en aproximadamente 1 h 40 min. La vía normal es trepar desde la barca por la jarcia caída hasta C1; la alternativa peligrosa es nadar por la brecha de popa hasta C9. Llegada registrada: ${current.progress['wreck.boat-arrived'] ? 'sí' : 'no'} · ya abordaron: ${current.progress['wreck.boarded'] ? 'sí' : 'no'}.`;
    const present = document.createElement('p'); present.textContent = `Personajes presentes: ${current.characters.filter(character => character.claimed && character.sceneId === current.sceneId).map(character => character.label).join(', ') || 'ninguno'}.`;
    box.append(title, openingDetails, objective, present, wreckChapterEnding(current)); return;
  }
  const campScene = campaign?.scenes.find(scene => scene.id === current.sceneId && scene.camp);
  if (campaign?.campaignId === 'stormwreck-isle' && campScene) {
    const title = document.createElement('b'); title.textContent = `${campScene.title} · campamento de la Isla de las Tempestades`;
    const note = document.createElement('p'); note.textContent = 'Este campamento pertenece a la misma campaña que el Retiro y el Rosa de los Vientos. El descanso se dirige en el panel de campamento; los hitos del pecio permanecen disponibles aquí para el DM.';
    const present = document.createElement('p'); present.textContent = `Personajes presentes: ${current.characters.filter(character => character.claimed && character.sceneId === current.sceneId).map(character => character.label).join(', ') || 'ninguno'}.`;
    box.append(title, note, present, wreckChapterEnding(current)); return;
  }
  const scenes: Record<string, { objective: string; relevant: string }> = {
    temple: { objective: 'Entrar en la historia.', relevant: 'Introducción / templo' }, garden: { objective: 'Conseguir la rosa.', relevant: 'Rosas asesinas y señorita Fritz' }, cafe: { objective: 'Hablar y buscar pistas.', relevant: 'Café No-Me-Olvides' }, market: { objective: 'Resolver los asuntos del mercado.', relevant: 'Mercado nocturno' }, mirror: { objective: 'Afrontar el Reflejo helado.', relevant: 'Espejo de Plata del Amor Verdadero' }, dinner: { objective: 'Resolver el final de la noche.', relevant: 'Cena con Anteros · desenlace' }
  };
  const scene = scenes[current.sceneId] ?? { objective: 'Explorar la escena.', relevant: current.sceneId };
  const title = document.createElement('b'); title.textContent = scene.relevant; const objective = document.createElement('p'); objective.textContent = `Objetivo actual: ${scene.objective}`;
  const present = document.createElement('p'); present.textContent = `Personajes presentes: ${current.characters.filter(character => character.claimed && character.sceneId === current.sceneId).map(character => character.label).join(', ') || 'ninguno'}.`;
  const interactables = document.createElement('p'); interactables.textContent = `Interactuables: ${current.objects.length ? current.objects.map(object => object.label).join(', ') : 'ninguno'}.`;
  const progress = document.createElement('details'), summary = document.createElement('summary'); summary.textContent = 'Progreso D8 Night'; progress.append(summary);
  for (const [flag, label] of Object.entries({ wine: 'Vino del Café', rose: 'Rosa de Fritz', steak: 'Filete del Mercado', mirror: 'Espejo de amor verdadero', ending1: 'Final 1', ending2: 'Final 2', ending3: 'Final 3' })) { const row = document.createElement('label'), input = document.createElement('input'); input.type = 'checkbox'; input.checked = Boolean(current.progress[flag]); input.onchange = () => command({ type: 'progress:toggle', flag, value: input.checked }); row.append(input, label); progress.append(row); }
  const currentDefinition = campaign?.scenes.find(candidate => candidate.id === current.sceneId);
  const stageActors = current.progress['wreck.curse-day-after'] && current.sceneId === 'wreck-ship' ? [] : currentDefinition?.stageActors ?? [];
  if (stageActors.length && campaign) {
    const cues = document.createElement('details'), cueTitle = document.createElement('summary'), cueButtons = document.createElement('div'); cueTitle.textContent = 'Gestos de PNJ'; cueButtons.className = 'button-row'; cues.append(cueTitle, cueButtons);
    for (const actor of stageActors) {
      const cueStates = Object.keys(campaign.tokenAnimations[actor.tokenId] ?? {}).filter(name =>
        !['idle', 'moving', 'running', 'combat-idle', 'hit', 'defeated', 'prone', 'crawl'].includes(name)
        && !name.startsWith('direction-') && !name.startsWith('running-')
        && !/^attack-(n|ne|e|se|s|sw|w|nw)$/.test(name) && !name.endsWith('-mirrored'));
      for (const stateName of cueStates) {
        const labels: Record<string, string> = { attack: 'atacar', 'attack-arrow': 'disparar con arco', 'attack-throw': 'lanzar daga', entangle: 'enredar', talk: 'hablar', sit: 'sentarse', argue: 'discutir', give: 'entregar', 'throw-cow': 'tirar vaca', 'guide-cow': 'guiar vaca', negotiate: 'negociar', 'receive-coins': 'recibir monedas', 'receive-cow': 'recibir vaca', 'give-beans': 'dar judías', 'give-steak': 'dar filete', react: 'reaccionar', resist: 'resistirse', activate: 'activar', transform: 'transformarse', copy: 'crear reflejo' };
        const button = document.createElement('button'); button.textContent = `${actor.label} · ${labels[stateName] ?? stateName}`; button.onclick = () => command({ type: 'scene:animation', entityId: actor.id, state: stateName, durationMs: 1_600 }); cueButtons.append(button);
      }
    }
    box.append(title, objective, present, interactables, progress, cues); return;
  }
  box.append(title, objective, present, interactables, progress);
}

function renderFocus(current: DmState) {
  const select = $('focus') as HTMLSelectElement; const previous = current.camera.focusId ?? ''; const options: Array<[string, string]> = [['', 'Centro del mapa'], ...current.characters.map(character => [character.id, character.label] as [string, string])];
  if (current.creature?.visible) options.push([current.creature.id, current.creature.label]);
  select.replaceChildren(...options.map(([value, label]) => { const option = document.createElement('option'); option.value = value; option.textContent = label; return option; })); select.value = previous;
}

function currentScene() { return campaign?.scenes.find(scene => scene.id === state?.sceneId) ?? null; }
function objectCells(object: DmObject) { return footprintFor(object.cell, object.rotation, object.footprint); }
function sameCell(a: Cell, b: Cell) { return a.col === b.col && a.row === b.row; }
function draftValid(object: DmObject) {
  const scene = currentScene(); if (!scene || !state) return false; const cells = objectCells(object), walkable = new Set(scene.walkable.map(cell => `${cell.col},${cell.row}`));
  if (object.kind === 'wheel' && object.attachment === 'attached') return object.structure !== 'destroyed' && cells.length === object.mount.footprint.length && cells.every(cell => footprintFor(object.mount.cell, 0, object.mount.footprint).some(mountCell => sameCell(cell, mountCell)));
  if (cells.some(cell => !walkable.has(`${cell.col},${cell.row}`) || scene.spawns.some(spawn => sameCell(spawn, cell)))) return false;
  if (state.objects.some(other => other.id !== object.id && cells.some(cell => objectCells(other).some(otherCell => sameCell(cell, otherCell))))) return false;
  if (state.objects.some(other => other.kind === 'wheel' && cells.some(cell => footprintFor(other.mount.cell, 0, other.mount.footprint).some(mountCell => sameCell(cell, mountCell))))) return false;
  const blocks = object.structure === 'destroyed' || object.kind === 'door' && object.state === 'open' ? [] : cells;
  if (blocks.some(cell => state!.characters.some(actor => actor.surfaceId === scene.surfaceId && (sameCell(actor.cell, cell) || Boolean(actor.step && sameCell(actor.step.from, cell)))) || Boolean(state!.creature?.visible && state!.creature.sceneId === state!.sceneId && state!.creature.surfaceId === scene.surfaceId && sameCell(state!.creature.cell, cell)))) return false;
  return true;
}

function selectObject(id: string | null) {
  selectedMapEntityId = null; world?.setSelectedEntity(null);
  selectedId = id; const object = state?.objects.find(item => item.id === id) ?? null;
  draft = object && object.structure !== 'destroyed' && (object.kind === 'crate' || (object.kind === 'wheel' && object.attachment === 'detached')) ? structuredClone(object) : null;
  draftAction = draft && state ? { type: 'transform', objectRevision: state.objectRevision, sceneEpoch: state.sceneEpoch, connectionGeneration } : null;
  renderObjects(state!);
}
function startWheelDraft(object: Extract<DmObject, { kind: 'wheel' }>, outcome: 'caught' | 'fallen', requestId?: string) {
  selectedId = object.id; draft = structuredClone(object); draft.attachment = 'detached'; draft.state = outcome; draft.cell = { col: object.mount.cell.col + 1, row: object.mount.cell.row };
  draftAction = { type: 'detach', outcome, requestId, objectRevision: state!.objectRevision, sceneEpoch: state!.sceneEpoch, connectionGeneration }; renderObjects(state!);
}

function startStructureDraft(object: DmObject, structure: 'damaged' | 'destroyed') {
  selectedId = object.id; draft = structuredClone(object); draft.structure = structure;
  draftAction = { type: 'structure', structure, objectRevision: state!.objectRevision, sceneEpoch: state!.sceneEpoch, connectionGeneration }; renderObjects(state!);
}

function onMapClick(cell: Cell) {
  if (!state) return;
  if (campInteractionMode) {
    const scene = currentScene(), camp = scene?.camp;
    if (scene && camp) {
      const point = camp.interactionPoints.find(candidate => sameCell(candidate.cell, cell) || candidate.objectCell && sameCell(candidate.objectCell, cell));
      if (point) showCampPoint(point, scene.id);
      else toast('Pulsa una marca resaltada para consultar ese objeto.');
    }
    return;
  }
  if (draft) { draft.cell = { ...cell }; renderDraft(); return; }
  const entity = [...(latestSnapshot?.entities ?? [])].reverse().find(candidate => sameCell(candidate.cell, cell));
  if (entity) {
    selectedMapEntityId = entity.id; selectedId = null; draft = null; draftAction = null;
    world?.setSelectedEntity(entity.id);
    world?.setCameraFocusCell(cell, entity.surfaceId);
    renderObjects(state); renderCombat(state);
    return;
  }
  selectedMapEntityId = null; world?.setSelectedEntity(null);
  const hit = [...state.objects].reverse().find(object => objectCells(object).some(occupied => sameCell(occupied, cell))); selectObject(hit?.id ?? null);
  world?.setCameraFocusCell(cell, hit?.surfaceId ?? currentScene()?.surfaceId);
}

function renderDraft() {
  const valid = draft ? draftValid(draft) : false, selectedEntity = latestSnapshot?.entities.find(entity => entity.id === selectedMapEntityId) ?? null;
  if (selectedMapEntityId && !selectedEntity) selectedMapEntityId = null;
  world?.setSelectedEntity(selectedMapEntityId); world?.showSelection(state?.objects.find(object => object.id === selectedId) ?? null); world?.showPreview(draft, valid);
  $('draftActions').hidden = !draft; ($('applyObject') as HTMLButtonElement).disabled = !valid;
  $('objectStatus').textContent = draft ? valid ? 'Destino válido. Pulsa Aplicar para confirmar.' : 'Ese destino está bloqueado.' : selectedEntity ? `${selectedEntity.label} seleccionado · WASD: una casilla por pulsación.` : state?.objects.length ? 'Haz clic en una ficha para moverla con WASD, o selecciona un objeto.' : 'Haz clic en una ficha para moverla con WASD.';
}

function renderObjects(current: DmState) {
  if (selectedId && !current.objects.some(object => object.id === selectedId)) { selectedId = null; draft = null; draftAction = null; }
  const box = $('objects'); box.replaceChildren();
  for (const pickup of current.pickups ?? []) {
    const row = document.createElement('div'); row.className = 'object-row';
    const label = document.createElement('b'); label.textContent = pickup.label;
    const status = document.createElement('span'); status.textContent = pickup.collected ? 'Recogido' : !pickup.available ? 'Tras la puerta de C4' : pickup.kind === 'unlit-torch' ? `Apagada · ${pickup.cell.col},${pickup.cell.row}` : `Disponible · ${pickup.cell.col},${pickup.cell.row}`;
    row.append(label, status);
    if (!pickup.collected && pickup.available) for (const character of current.characters.filter(character => character.sceneId === pickup.sceneId)) {
      const button = document.createElement('button'); button.textContent = `Dar a ${character.label}`;
      button.onclick = () => command({ type: 'pickup:take', pickupId: pickup.id, characterId: character.id });
      row.append(button);
    }
    box.append(row);
  }
  for (const object of current.objects) {
    const row = document.createElement('div'); row.className = `object-row${object.id === selectedId ? ' selected' : ''}`;
    const isC8LootObject = object.id.startsWith('c8-container-');
    const isC8Barrel = object.id.startsWith('c8-barrel-');
    const structureLabel = ({ intact: 'intacto', damaged: 'dañado', destroyed: 'roto' } as const)[object.structure];
    const interaction = object.kind === 'door' || object.kind === 'crate' ? object.interaction : undefined;
    const interactionStatus = !interaction ? '' : interaction.kind === 'barred-door' ? ` · listón ${interaction.barrier === 'barred' ? 'puesto' : 'retirado'}` : interaction.kind === 'trap-stash' ? ` · ${interaction.revealed ? interaction.open ? 'abierto' : 'descubierto' : 'oculto'} · trampa ${interaction.trap === 'armed' ? 'armada' : 'gastada'}` : interaction.kind === 'container' ? ` · ${interaction.open ? 'abierto' : 'cerrado'}${isC8LootObject ? interaction.lootId.startsWith('wreck-c8-result-') ? ` · ${interaction.lootLabel}` : ' · botín sin asignar' : isC8Barrel ? ' · sin tirada de la tabla d6' : ''}` : ` · ${interaction.location === 'submerged' ? 'sumergido' : 'fuera del agua'} · ${interaction.open ? 'abierto' : 'cerrado'} · ${current.progress['wreck.curse-aboard'] ? 'talismán destruido' : current.progress['wreck.items-given-to-runara'] ? 'entregado a Runara' : `paquete ${interaction.package}`}`;
    const label = document.createElement('b'); label.textContent = object.label; const status = document.createElement('span'); status.textContent = (object.kind === 'door' ? `${({ open: 'abierta', closed: 'cerrada', locked: 'bloqueada' } as const)[object.state]} · ${structureLabel}` : object.kind === 'wheel' ? `${object.attachment === 'attached' ? 'montado' : object.state === 'caught' ? 'sujeto' : 'caído'} · ${structureLabel} · ${object.rotation}°` : `${structureLabel} · ${object.rotation}°`) + interactionStatus;
    const choose = document.createElement('button'); choose.textContent = object.structure === 'destroyed' || object.kind === 'wheel' && object.attachment === 'attached' || interaction?.kind === 'trap-stash' ? 'Seleccionar' : 'Mover'; choose.disabled = interaction?.kind === 'trap-stash'; choose.onclick = () => selectObject(object.id); row.append(label, status, choose);
    if (object.kind === 'door') for (const [text, next] of [['Abrir', 'open'], ['Cerrar', 'closed'], ['Bloquear', 'locked']] as const) { const button = document.createElement('button'); button.textContent = text; button.disabled = object.structure === 'destroyed'; button.onclick = () => command({ type: 'object:door', objectId: object.id, state: next }); row.append(button); }
    const interact = (text: string, action: string, characterId?: string, resultId?: number) => { const button = document.createElement('button'); button.textContent = text; button.onclick = () => command({ type: 'object:interact', objectId: object.id, action, ...(characterId ? { characterId } : {}), ...(resultId ? { resultId } : {}) }); row.append(button); };
    if (interaction?.kind === 'barred-door') interact(interaction.barrier === 'barred' ? 'Retirar listón' : 'Reponer listón', interaction.barrier === 'barred' ? 'remove-bar' : 'replace-bar');
    if (interaction?.kind === 'trap-stash') {
      if (!interaction.revealed) interact('Descubrir', 'discover');
      else if (!interaction.open && interaction.trap === 'armed') interact('Resolver trampa y abrir', 'trigger-open');
      else if (!interaction.open) interact('Abrir', 'open');
      if (interaction.trap === 'spent') interact('Rearmar', 'rearm');
    }
    if (interaction && interaction.kind !== 'barred-door' && interaction.kind !== 'trap-stash' && !interaction.open) interact('Abrir', 'open');
    if (interaction && interaction.kind !== 'barred-door' && interaction.open) {
      if (interaction.lootOwnerId) interact('Devolver botín', 'return-loot');
      else if (isC8LootObject && interaction.kind === 'container' && !interaction.lootId.startsWith('wreck-c8-result-')) {
        const select = document.createElement('select'); select.setAttribute('aria-label', 'Resultado del d6 de botín C8');
        const empty = document.createElement('option'); empty.value = ''; empty.textContent = 'Resultado del d6…'; select.append(empty);
        wreckC8Loot.forEach((lootLabel, index) => {
          const resultId = index + 1;
          if (current.progress[`wreck.c8-loot-${resultId}`]) return;
          const option = document.createElement('option'); option.value = String(resultId); option.textContent = `${resultId} · ${lootLabel}`; select.append(option);
        });
        const assign = document.createElement('button'); assign.textContent = 'Asignar resultado'; assign.disabled = select.options.length < 2;
        assign.onclick = () => { const resultId = Number(select.value); if (Number.isInteger(resultId) && resultId >= 1 && resultId <= 6) interact('Asignar', 'assign-result', undefined, resultId); };
        row.append(select, assign);
      } else if (!isC8Barrel) for (const character of current.characters) interact(`Botín → ${character.label}`, 'take-loot', character.id);
    }
    if (interaction?.kind === 'chest') {
      const targetSurface = interaction.location === 'submerged' ? 'hold-air' : 'hold-water';
      const move = document.createElement('button'); move.textContent = interaction.location === 'submerged' ? 'Sacar del agua' : 'Volver a sumergir'; move.onclick = () => command({ type: 'object:transform', objectId: object.id, cell: object.cell, surfaceId: targetSurface, rotation: object.rotation }); row.append(move);
      if (interaction.open && !current.progress['wreck.items-given-to-runara'] && !current.progress['wreck.curse-aboard']) interaction.packageOwnerId ? interact('Devolver paquete', 'return-package') : current.characters.forEach(character => interact(`Paquete → ${character.label}`, 'take-package', character.id));
    }
    if (object.kind === 'wheel' && object.attachment === 'attached') for (const [text, outcome] of [['Separar · sujeto', 'caught'], ['Separar · caído', 'fallen']] as const) { const button = document.createElement('button'); button.textContent = text; button.onclick = () => startWheelDraft(object, outcome); row.append(button); }
    if (object.capabilities.structure && object.structure === 'intact') { const damage = document.createElement('button'); damage.textContent = 'Dañar'; damage.onclick = () => startStructureDraft(object, 'damaged'); row.append(damage); }
    if (object.capabilities.structure && object.structure !== 'destroyed') { const destroy = document.createElement('button'); destroy.textContent = 'Romper'; destroy.disabled = object.kind === 'wheel' && object.attachment === 'attached'; destroy.title = destroy.disabled ? 'Separa el timón antes de romperlo.' : ''; destroy.onclick = () => startStructureDraft(object, 'destroyed'); row.append(destroy); }
    box.append(row);
  }
  const undo = $('undoObject') as HTMLButtonElement; undo.disabled = !current.undo.canUndo; undo.textContent = current.undo.label ? `Deshacer: ${current.undo.label}` : 'Deshacer última acción'; renderDraft();
}

function renderPlayers(current: DmState) {
  const box = $('players'); if (box.contains(document.activeElement) && document.activeElement instanceof HTMLInputElement) return; box.replaceChildren();
  const present = current.characters.filter(character => character.claimed || character.connected);
  if (!present.length) { box.textContent = 'No hay jugadores seleccionados en esta sesión.'; return; }
  for (const character of present) {
    const article = document.createElement('article'); article.className = 'player-card'; const info = document.createElement('div'), heading = document.createElement('h3'), dot = document.createElement('span'), small = document.createElement('small');
    info.className = 'player-info';
    dot.className = `dot ${character.connected ? 'on' : ''}`; heading.append(dot, document.createTextNode(` ${character.label}`)); small.textContent = `${character.archetype} · ${character.claimed ? 'asignado' : 'libre'}`; info.append(heading, small);
    const hpLabel = document.createElement('label'), hp = document.createElement('input'); hpLabel.className = 'player-health'; hpLabel.append('PG', hp); hp.type = 'number'; hp.min = '0'; hp.max = String(character.maxHp); hp.value = String(character.hp); hp.onchange = () => command({ type: 'hp', characterId: character.id, hp: Number(hp.value) });
    const position = document.createElement('div'); position.className = 'player-position'; const col = coordinate('Col', character.cell.col), row = coordinate('Fila', character.cell.row), move = document.createElement('button'); move.textContent = 'Paso'; move.onclick = () => command({ type: 'entity:move', entityId: character.id, cell: { col: Number(col.input.value), row: Number(row.input.value) } }); position.append(col.label, row.label, move);
    const location = document.createElement('small'); location.className = 'player-location'; location.textContent = `${character.sceneId} · ${character.surfaceId} · ${character.cell.col},${character.cell.row}`;
    const resources = document.createElement('div'); resources.className = 'player-resources';
    const routes = document.createElement('div'); routes.className = 'player-routes';
    for (const port of current.ports) {
      if (port.return !== 'adjudicated') continue;
      const forward = character.sceneId === port.from.mapId && character.surfaceId === port.from.surfaceId && sameCell(character.cell, port.from.cell);
      const back = character.sceneId === port.to.mapId && character.surfaceId === port.to.surfaceId && sameCell(character.cell, port.to.cell);
      if (!forward && !back) continue;
      const direction = forward ? 'forward' : 'return', destination = forward ? port.to : port.from;
      const button = document.createElement('button'); button.textContent = `${port.id} · ${port.mode} → ${destination.zoneId}`;
      const adjudicate = Boolean(port.conditionId) || port.return === 'adjudicated';
      button.onclick = () => command({ type: 'entity:portal', entityId: character.id, portId: port.id, direction, ...(adjudicate ? { adjudicate: true } : {}) }); routes.append(button);
    }
    const release = document.createElement('button'); release.className = 'player-release'; release.textContent = 'Liberar'; release.disabled = !character.claimed; release.onclick = () => command({ type: 'release', characterId: character.id });
    const actions = document.createElement('div'); actions.className = 'player-actions'; actions.append(routes, release);
    for (const [resourceId, resource] of Object.entries(character.resources)) { const label = document.createElement('label'), input = document.createElement('input'); label.append(resource.label, input); input.type = 'number'; input.min = '0'; input.max = String(resource.max); input.value = String(resource.current); input.onchange = () => command({ type: 'resource', characterId: character.id, resourceId, current: Number(input.value) }); resources.append(label); }
    article.append(info, hpLabel, position, resources, location, actions); box.append(article);
  }
}
function renderMonsterSheet(current: DmState) {
  const box = $('monsterSheet'); box.replaceChildren(); const creature = current.creature;
  if (!creature) return;
  const details = document.createElement('details'), summary = document.createElement('summary'); summary.textContent = `Hoja · ${creature.label}`;
  const stats = document.createElement('p'); stats.textContent = `PG ${creature.hp}/${creature.maxHp} · CA ${creature.armorClass} · velocidad ${creature.speedMeters} m`;
  const hp = document.createElement('input'); hp.type = 'number'; hp.min = '0'; hp.max = String(creature.maxHp); hp.value = String(creature.hp); hp.setAttribute('aria-label', `PG de ${creature.label}`); hp.onchange = () => command({ type: 'entity:hp', entityId: creature.id, hp: Number(hp.value) });
  const list = (title: string, values: string[]) => { const heading = document.createElement('b'), items = document.createElement('ul'); heading.textContent = title; items.replaceChildren(...values.map(value => { const item = document.createElement('li'); item.textContent = value; return item; })); return [heading, items] as const; };
  details.append(summary, stats, hp, ...list('Rasgos', creature.traits), ...list('Acciones', creature.actions)); box.append(details);
}
function renderNpcs(current: DmState) {
  const box = $('npcs'); if (box.contains(document.activeElement) && document.activeElement instanceof HTMLInputElement) return; box.replaceChildren();
  const npcs = current.npcs.filter(npc => npc.id !== 'wreck-rowboat');
  if (!npcs.length) { box.textContent = 'No hay PNJ en esta escena.'; return; }
  for (const npc of npcs) {
    const row = document.createElement('div'); row.className = 'object-row'; const name = document.createElement('button'); name.className = 'link-button'; name.textContent = npc.label; name.title = `Abrir hoja de ${npc.label}`; name.onclick = () => openNpcSheet(npc);
    const reveal = document.createElement('button'); reveal.textContent = npc.visible ? 'Ocultar' : `Invocar ${npc.label}`; reveal.disabled = current.combat.active; reveal.onclick = () => command({ type: 'npc:visible', entityId: npc.id, visible: !npc.visible });
    const col = coordinate('Col', npc.cell.col), line = coordinate('Fila', npc.cell.row), move = document.createElement('button'); move.textContent = 'Paso'; move.disabled = !npc.visible; move.onclick = () => command({ type: 'entity:move', entityId: npc.id, cell: { col: Number(col.input.value), row: Number(line.input.value) } });
    const combat = document.createElement('button'); combat.textContent = npc.combatEnabled ? 'Quitar de combate' : 'Añadir al combate'; combat.disabled = current.combat.active; combat.onclick = () => command({ type: 'combat:participant', entityId: npc.id, active: !npc.combatEnabled });
    const recover = document.createElement('button'); recover.textContent = 'Recuperar 1 PG'; recover.hidden = npc.hp > 0; recover.onclick = () => command({ type: 'entity:hp', entityId: npc.id, hp: 1 });
    row.append(name, reveal, col.label, line.label, move, combat, recover); box.append(row);
  }
}
function renderCombatLegacy(current: DmState) {
  const box = $('combat'), combat = current.combat; box.replaceChildren();
  if (!combat.active) {
    selectedCombatantId = null; combatConsoleMinimized = false;
    const hasOpponent = Boolean(current.creature?.visible && current.creature.hp > 0) || current.npcs.some(npc => npc.visible && npc.combatEnabled && npc.hp > 0);
    const start = document.createElement('button'); start.className = 'primary'; start.textContent = 'Iniciar combate'; start.disabled = !hasOpponent || !current.characters.some(character => character.claimed); start.onclick = () => command({ type: 'combat:start' });
    const note = document.createElement('p'); note.className = 'note'; note.textContent = start.disabled ? 'Revela una criatura o invoca un enemigo y espera a que entre Trinity.' : 'Tira las iniciativas físicas y corrige el orden aquí si hace falta.';
    box.append(start, note); return;
  }
  const currentParticipant = combat.participants.find(entry => entry.id === combat.currentId);
  if (currentParticipant?.controller === 'dm' && currentParticipant.active) selectedCombatantId = currentParticipant.id;
  const status = document.createElement('p'); status.textContent = `Ronda ${combat.round} · turno de ${currentParticipant?.label ?? '—'}${combat.movement ? ` · movimiento ${combat.movement.remainingSquares}/${combat.movement.maximumSquares} casillas` : ''}`;
  const next = document.createElement('button'); next.className = 'primary'; next.textContent = 'Pasar turno'; next.onclick = () => command({ type: 'combat:endTurn' });
  const end = document.createElement('button'); end.textContent = 'Finalizar combate'; end.onclick = () => command({ type: 'combat:end' });
  const order = document.createElement('div'); order.className = 'note'; const entries: Array<{ id: string; initiative: number }> = [];
  for (const participant of combat.participants) {
    const row = document.createElement('details'); row.className = `combatant${participant.id === combat.currentId ? ' current' : ''}`; row.open = participant.id === combat.currentId || participant.id === selectedCombatantId; const summary = document.createElement('summary'); summary.textContent = `${participant.id === combat.currentId ? '● TURNO · ' : ''}${participant.label} · ❤️ ${participant.hp}/${participant.maxHp} · CA ${participant.armorClass} · Ini ${participant.initiative}${participant.conditions.length ? ` · ${participant.conditions.map(condition => ({ envenenada: '🟢', apresada: '🟣', agarrada: '🔵', derribada: '🟠', asustada: '🟡', inconsciente: '⚫', oculta: '⚪', invisible: '✨', restringida: '🟣', hechizada: '💛', paralizada: '🧊' } as Record<string, string>)[condition]).join('')}` : ''}`; const initiative = document.createElement('input'), hp = document.createElement('input'); initiative.type = 'number'; initiative.value = String(participant.initiative); hp.type = 'number'; hp.min = '0'; hp.max = String(participant.maxHp); hp.value = String(participant.hp);
    entries.push({ id: participant.id, initiative: participant.initiative }); initiative.onchange = () => { const target = entries.find(item => item.id === participant.id); if (target) target.initiative = Number(initiative.value); };
    const hpCommand = (nextHp: number) => command(participant.kind === 'player' ? { type: 'hp', characterId: participant.id, hp: nextHp } : { type: 'entity:hp', entityId: participant.id, hp: nextHp });
    hp.onchange = () => hpCommand(Number(hp.value));
    const damage = document.createElement('button'); damage.textContent = '−'; damage.onclick = () => hpCommand(Math.max(0, participant.hp - 1));
    const heal = document.createElement('button'); heal.textContent = '+'; heal.onclick = () => hpCommand(Math.min(participant.maxHp, participant.hp + 1));
    const main = document.createElement('div'); main.className = 'combatant-main'; const title = document.createElement('b'); title.textContent = `${participant.id === combat.currentId ? '▶ ' : ''}${participant.label}${participant.active ? '' : ' · fuera'}`; const stats = document.createElement('small'); stats.textContent = `CA ${participant.armorClass} · ${participant.speedMeters} m`; main.append(title, stats);
    const controls = document.createElement('div'); controls.className = 'combatant-controls'; const pg = document.createElement('label'); pg.append('PG', hp); const ini = document.createElement('label'); ini.append('Ini', initiative); controls.append(pg, damage, heal, ini);
    if (participant.controller === 'dm' && participant.active) { const select = document.createElement('button'); select.textContent = participant.id === selectedCombatantId ? 'Control WASD' : 'Controlar'; select.disabled = participant.id !== combat.currentId; select.onclick = () => { selectedCombatantId = participant.id; renderCombat(current); }; controls.append(select); }
    const conditionRow = document.createElement('div'); conditionRow.className = 'combatant-conditions'; for (const condition of ['envenenada', 'apresada', 'agarrada', 'derribada', 'asustada', 'hechizada', 'paralizada', 'inconsciente', 'oculta', 'invisible'] as const) { const toggle = document.createElement('button'), active = participant.conditions.includes(condition); toggle.textContent = active ? `Quitar ${condition}` : condition; toggle.onclick = () => command({ type: 'combat:condition', entityId: participant.id, condition, active: !active }); conditionRow.append(toggle); }
    row.append(summary, main, controls, conditionRow);
    if (participant.id === selectedCombatantId) {
      const attacks = document.createElement('div'); attacks.className = 'combatant-attacks'; const target = document.createElement('select'); target.append(...combat.participants.filter(item => item.id !== participant.id && item.active).map(item => { const option = document.createElement('option'); option.value = item.id; option.textContent = item.label; return option; }));
      const note = document.createElement('small'); note.textContent = 'Elige blanco. El sistema solicitará el dado físico al controlador correspondiente.'; attacks.append(note, target);
      for (const action of participant.attacks) { const use = document.createElement('button'), costUsed = action.actionCost === 'reaction' ? combat.reactionUsed[participant.id] : action.actionCost === 'bonus' ? combat.bonusActionUsed[participant.id] : combat.actionUsed[participant.id]; use.textContent = action.resolution === 'guided' ? `${action.label} · Resolver con el DM` : action.label; use.disabled = participant.id !== combat.currentId || Boolean(combat.prompt) || Boolean(costUsed) || (action.recharge !== undefined && combat.recharge[participant.id]?.[action.id] === false); use.onclick = () => command({ type: 'combat:declare', attackerId: participant.id, targetId: target.value, actionId: action.id, useSneakAttack: true }); attacks.append(use); if (action.recharge && combat.recharge[participant.id]?.[action.id] === false) { const recharge = document.createElement('button'); recharge.textContent = `${action.label} · tirar recarga`; recharge.onclick = () => { const roll = Number(prompt('D6 de recarga (1–6):') ?? ''); if (Number.isInteger(roll) && roll >= 1 && roll <= 6) command({ type: 'combat:recharge', attackerId: participant.id, actionId: action.id, d6: roll }); }; attacks.append(recharge); } }
      if (participant.controller === 'dm') {
        const basics = document.createElement('details'), summaryBasic = document.createElement('summary'), buttons = document.createElement('div'); summaryBasic.textContent = 'Otras acciones'; buttons.className = 'button-row';
        for (const [action, label] of [['dash', 'Correr'], ['disengage', 'Destrabarse'], ['dodge', 'Esquivar'], ['help', 'Ayudar'], ['hide', 'Esconderse'], ['influence', 'Influir'], ['magic', 'Acción mágica'], ['ready', 'Preparar'], ['search', 'Buscar'], ['study', 'Estudiar'], ['use-object', 'Utilizar']] as const) { const button = document.createElement('button'); button.textContent = label; button.disabled = participant.id !== combat.currentId || Boolean(combat.prompt) || Boolean(combat.actionUsed[participant.id]); button.onclick = () => command({ type: 'combat:basic', attackerId: participant.id, action, ...(action === 'help' ? { targetId: target.value } : {}) }); buttons.append(button); }
        basics.append(summaryBasic, buttons); attacks.append(basics);
      }
      if (participant.conditions.includes('restringida') || participant.conditions.includes('apresada')) { const escape = document.createElement('button'); escape.textContent = 'Liberarse · Acción'; escape.disabled = participant.id !== combat.currentId || Boolean(combat.prompt); escape.onclick = () => command({ type: 'combat:escape', attackerId: participant.id }); attacks.append(escape); }
      row.append(attacks);
    }
    order.append(row);
  }
  const applyInitiative = document.createElement('button'); applyInitiative.textContent = 'Aplicar iniciativa'; applyInitiative.onclick = () => command({ type: 'combat:initiative', entries });
  box.append(status, next, end);
  if (combat.prompt) {
    const promptBox = document.createElement('div'), title = document.createElement('b'), note = document.createElement('p'), input = document.createElement('input'), submit = document.createElement('button'); promptBox.className = 'combatant-attacks'; title.textContent = combat.prompt.title; note.textContent = combat.prompt.instruction; input.type = 'number'; input.min = String(combat.prompt.minimum ?? 0); input.max = String(combat.prompt.maximum ?? 200); input.placeholder = combat.prompt.stage === 'attack' || combat.prompt.stage === 'death-save' ? 'd20 natural' : combat.prompt.stage === 'damage' ? 'suma de dados' : 'total'; submit.className = 'primary'; submit.textContent = combat.prompt.stage === 'damage' ? 'Aplicar daño' : 'Confirmar dado'; submit.onclick = () => { const value = Number(input.value); if (!Number.isInteger(value)) return toast('Introduce un resultado entero.'); const type = combat.prompt!.stage === 'attack' ? 'combat:rollAttack' : combat.prompt!.stage === 'damage' ? 'combat:rollDamage' : combat.prompt!.stage === 'death-save' ? 'combat:rollDeathSave' : 'combat:rollSave'; const roll = type === 'combat:rollAttack' || type === 'combat:rollDeathSave' ? { d20: value } : type === 'combat:rollDamage' ? { diceTotal: value } : { total: value }; command({ type, promptId: combat.prompt!.id, ...roll }); }; promptBox.append(title, note, input, submit); box.append(promptBox);
  }
  box.append(order, applyInitiative);
  if (selectedCombatantId === combat.currentId && currentParticipant?.controller === 'dm' && currentParticipant.active) { const hint = document.createElement('p'); hint.className = 'note'; hint.textContent = `WASD mueve a ${currentParticipant.label} una casilla por pulsación.`; box.append(hint); }
}

addEventListener('keydown', event => {
  if (event.target instanceof Element && event.target.matches('input,textarea,select')) return;
  const key = event.key.toLowerCase();
  if (!event.repeat && (key === 'q' || key === 'e') && supportsCameraOrbit(state?.sceneId)) { event.preventDefault(); rotateCamera(key === 'q' ? -1 : 1); return; }
  const delta = key === 'w' ? { col: 0, row: -1 } : key === 'a' ? { col: -1, row: 0 } : key === 's' ? { col: 0, row: 1 } : key === 'd' ? { col: 1, row: 0 } : null;
  const current = state;
  if (!delta || !current || !selectedMapEntityId || Date.now() - lastCombatMoveAt < 180) return;
  const entity = latestSnapshot?.entities.find(item => item.id === selectedMapEntityId);
  if (!entity) return;
  if (current.combat.active && current.combat.currentId !== entity.id) { toast(`En combate solo se mueve a ${current.combat.participants.find(item => item.id === current.combat.currentId)?.label ?? 'la criatura de turno'}.`); return; }
  event.preventDefault(); lastCombatMoveAt = Date.now(); command({ type: 'entity:move', entityId: entity.id, cell: { col: entity.cell.col + delta.col, row: entity.cell.row + delta.row } });
});
function coordinate(text: string, value: number) { const label = document.createElement('label'), input = document.createElement('input'); input.type = 'number'; input.step = '1'; input.value = String(value); label.append(text, input); return { label, input }; }

const audioLabels: Record<string, string> = { music: 'Música', ocean: 'Océano', wind: 'Viento', wood: 'Madera', storm: 'Tormenta' };
function renderAudio(current: DmState, force = false) {
  const box = $('audio'); if (!force && box.contains(document.activeElement)) return; box.replaceChildren(); const entries: [string, AudioState['music']][] = [['music', current.audio.music], ...Object.entries(current.audio.layers)];
  const musicTracks = campaign?.audio.library?.music ?? [];
  if (musicTracks.length) {
    const label = document.createElement('label'), select = document.createElement('select'); label.textContent = 'Tema musical';
    for (const track of musicTracks) { const option = document.createElement('option'); option.value = track.id; option.textContent = track.label; option.selected = track.id === (current.audio.music.assetId ?? musicTracks[0]?.id); select.append(option); }
    select.onchange = () => command({ type: 'audio:select', channel: 'music', trackId: select.value }); label.append(select); box.append(label);
  }
  for (const [id, track] of entries) {
    const row = document.createElement('div'); row.className = 'audio-row';
    const button = document.createElement('button'), label = document.createElement('label'), range = document.createElement('input'), amount = document.createElement('span');
    const setPlaying = (playing: boolean) => { button.textContent = playing ? 'Pausar' : 'Iniciar'; button.setAttribute('aria-pressed', String(playing)); button.title = playing ? 'Pausar sonido' : 'Iniciar sonido'; };
    setPlaying(track.playing); range.type = 'range'; range.min = '0'; range.max = '1'; range.step = '.05'; range.value = String(track.volume);
    const layerLabel = id === 'music' ? undefined : campaign?.audio.layerLabels?.[id as keyof NonNullable<typeof campaign>['audio']['layers']]; label.append(layerLabel ?? audioLabels[id] ?? id, range); amount.textContent = `${Math.round(track.volume * 100)}%`;
    button.onclick = () => { const next = button.getAttribute('aria-pressed') !== 'true'; setPlaying(next); command({ type: 'audio', channel: id, playing: next, volume: Number(range.value) }); };
    range.onchange = () => command({ type: 'audio', channel: id, playing: button.getAttribute('aria-pressed') === 'true', volume: Number(range.value) }); row.append(button, label, amount); box.append(row);
  }
}

function renderSfx(current: DmState) {
  const box = $('sfx'); box.replaceChildren();
  for (const effect of campaign?.audio.library?.sfx ?? []) {
    const button = document.createElement('button'); button.type = 'button'; button.title = effect.description;
    if (!effect.loopable) { button.textContent = effect.label; button.onclick = () => command({ type: 'sfx', sfxId: effect.id }); box.append(button); continue; }
    const track = current.audio.sfxLoops[effect.id] ?? { playing: false, volume: .38, loop: false, rate: 1, repeats: 4 };
    const row = document.createElement('div'), options = document.createElement('div'), infinite = document.createElement('button'), speed = document.createElement('select'), repeats = document.createElement('select'), volume = document.createElement('input');
    row.className = `sfx-loop-row${track.playing ? ' active' : ''}`; button.className = 'sfx-loop-trigger'; button.textContent = track.playing ? `Detener · ${effect.label}` : `Iniciar · ${effect.label}`; button.setAttribute('aria-pressed', String(track.playing));
    const send = (next: { playing: boolean; volume: number; loop: boolean; rate: number; repeats: number }) => command({ type: 'sfx:loop', sfxId: effect.id, ...next });
    // Al estar parado, los controles se ocultan: conserva los valores de la
    // pista para que el primer toque siempre envíe un comando válido.
    const setting = () => ({ volume: Number(volume.value || track.volume), loop: infinite.getAttribute('aria-pressed') === 'true', rate: Number(speed.value || track.rate), repeats: Number(repeats.value || track.repeats) });
    button.onclick = () => send({ playing: button.getAttribute('aria-pressed') !== 'true', ...setting() });
    row.append(button);
    if (track.playing) {
      options.className = 'sfx-loop-options'; infinite.textContent = '∞'; infinite.title = track.loop ? 'Bucle infinito activo' : 'Activar bucle infinito'; infinite.setAttribute('aria-pressed', String(track.loop)); infinite.className = track.loop ? 'active' : ''; infinite.onclick = () => send({ playing: true, ...setting(), loop: infinite.getAttribute('aria-pressed') !== 'true' });
      for (const rate of [.75, 1, 1.25]) { const option = document.createElement('option'); option.value = String(rate); option.textContent = `${rate}×`; option.selected = rate === track.rate; speed.append(option); }
      speed.title = 'Velocidad'; speed.onchange = () => send({ playing: true, ...setting() });
      for (const total of [1, 2, 3, 4, 6, 12]) { const option = document.createElement('option'); option.value = String(total); option.textContent = `${total}×`; option.selected = total === track.repeats; repeats.append(option); }
      repeats.disabled = track.loop; repeats.title = 'Repeticiones'; repeats.onchange = () => send({ playing: true, ...setting(), loop: false });
      volume.type = 'range'; volume.min = '0'; volume.max = '1'; volume.step = '.05'; volume.value = String(track.volume); volume.title = 'Volumen'; volume.onchange = () => send({ playing: true, ...setting() });
      options.append(infinite, speed, repeats, volume); row.append(options);
    }
    box.append(row);
  }
}

function renderRequests(current: DmState) {
  const box = $('requests'), pending = current.interactions.filter(request => request.status === 'pending'); box.replaceChildren();
  if (!pending.length) { const empty = document.createElement('p'); empty.className = 'muted'; empty.textContent = 'No hay solicitudes.'; box.append(empty); return; }
  for (const request of pending) { const row = document.createElement('div'); row.className = 'request'; const label = document.createElement('b'); label.textContent = request.characterLabel; row.append(label, document.createTextNode(' solicita interactuar.')); const actions = document.createElement('div'); actions.className = 'button-row'; const wheel = current.objects.find((object): object is Extract<DmObject, { kind: 'wheel' }> => object.id === request.targetId && object.kind === 'wheel'); for (const [text, result] of [['Supera · sujetado', 'caught'], ['Falla · cae', 'fallen']] as const) { const button = document.createElement('button'); button.textContent = text; button.disabled = !wheel; button.onclick = () => { if (wheel) startWheelDraft(wheel, result, request.id); }; actions.append(button); } const cancel = document.createElement('button'); cancel.textContent = 'Cancelar solicitud'; cancel.onclick = () => command({ type: 'resolveInteraction', requestId: request.id, result: 'cancelled' }); actions.append(cancel); row.append(actions); box.append(row); }
}

function humanCode(code: string) { return ({ DOOR_LOCKED: 'la puerta está bloqueada', BLOCKED_CELL: 'casilla bloqueada', OCCUPIED_CELL: 'hay una criatura en la casilla', GRID_STEP_REQUIRED: 'cada movimiento debe ser a una casilla ortogonal contigua', MOVEMENT_SPENT: 'ese turno ya ha gastado todo su movimiento', ENTITY_MOVING: 'ese personaje ya está terminando un paso', NOT_YOUR_TURN: 'no es el turno de esa criatura', ACTION_USED: 'esa criatura ya ha usado su acción este turno', INVALID_TARGET: 'ese objetivo no puede recibir el ataque', UNKNOWN_ACTION: 'esa acción no está disponible', SPAWN_RESERVED: 'zona de aparición reservada', STALE_OBJECTS: 'otro cambio se aplicó antes; vuelve a intentarlo', STALE_SCENE: 'la escena cambió', REQUEST_STALE: 'la solicitud ya no es válida', OBJECT_ATTACHED: 'el timón sigue montado', INVALID_TRANSITION: 'esa transición no está permitida', CAPABILITY_UNAVAILABLE: 'el objeto no admite esa acción', COMMAND_ID_REUSED: 'petición repetida con datos distintos', PARTY_STILL_ABOARD: 'saca primero a todos los personajes del pecio; no debe desaparecer con nadie dentro', CAMP_FEATURE_UNAVAILABLE: 'esta escena no contiene interacciones de campamento', CAMP_INTERACTION_OUT_OF_REACH: 'el personaje debe estar junto al punto de interacción', CAMP_INTERACTION_NOT_YOURS: 'ese objeto pertenece a otro personaje', IN_COMBAT: 'no puedes usar objetos del campamento durante el combate', REST_ACTIVE_ELSEWHERE: 'ya hay un descanso en curso en otro campamento', REST_ALREADY_ACTIVE: 'el descanso ya está preparado', REST_NOT_ACTIVE: 'no hay descanso activo', REST_INTERRUPTED: 'reanuda el descanso antes de avanzar', REST_ALREADY_INTERRUPTED: 'el descanso ya está interrumpido', REST_NOT_INTERRUPTED: 'no hay una interrupción que reanudar', REST_NOT_AT_DAWN: 'la confirmación solo está disponible al amanecer', REST_NEEDS_FINAL_CONFIRMATION: 'confirma el resultado del descanso', INVALID_CAMP_ACTION: 'acción de descanso no válida' } as Record<string, string>)[code] ?? code; }

function friendlyErrorCode(code: string) {
  const chapterMessages: Record<string, string> = {
    WRECK_DISAPPEARED: 'el Rosa de los Vientos ya ha desaparecido',
    HARPY_NOT_RETURNED: 'la arpía aún no ha regresado al barco',
    CHAPTER_NOT_COMPLETE: 'completa primero el día siguiente al final de la maldición',
    USE_LEVEL_UP_ACTION: 'usa la acción de nivel del capítulo',
    SHEET_NOT_FOUND: 'falta la hoja de algún personaje',
    WRONG_CAMPAIGN: 'esta acción solo está disponible en Stormwreck'
  };
  return chapterMessages[code] ?? humanCode(code);
}

function renderSave() {
  const status = $('saveStatus');
  if (!saveStatus) { status.textContent = 'Comprobando guardado…'; return; }
  const last = saveStatus.savedAt ? new Date(saveStatus.savedAt).toLocaleString() : 'todavía no guardada';
  status.textContent = saveStatus.mode === 'recovery' || saveStatus.mode === 'incompatible'
    ? `Partida pendiente de recuperación (${saveStatus.errorCode ?? saveStatus.mode}). Revisa una copia anterior o inicia una nueva partida.`
    : saveStatus.mode === 'error' ? `Error al guardar (${saveStatus.errorCode ?? 'disco'}). La partida sigue en memoria; exporta una copia privada o reintenta.`
    : saveStatus.mode === 'saving' ? `Guardando… última copia ${last}.`
    : `Última copia ${last}${saveStatus.dirty ? ' · cambios pendientes' : ' · al día'}${saveStatus.generation ? ` · generación ${saveStatus.generation}` : ''}.`;
  ($('retrySave') as HTMLButtonElement).hidden = saveStatus.mode !== 'error';
  ($('showEvidence') as HTMLButtonElement).hidden = saveStatus.mode !== 'recovery' && saveStatus.mode !== 'incompatible';
  ($('saveNow') as HTMLButtonElement).disabled = !runtimeEpoch || saveStatus.mode === 'saving' || saveStatus.mode === 'restoring' || saveStatus.mode === 'recovery' || saveStatus.mode === 'incompatible';
}

async function renderSaveHistory() {
  const box = $('saveHistory');
  try {
    const entries = await fetch('/api/dm/save/history', { cache: 'no-store' }).then(response => response.ok ? response.json() : []);
    box.replaceChildren();
    if (!entries.length) { box.textContent = 'Aún no hay puntos de retorno.'; return; }
    for (const entry of entries) {
      const row = document.createElement('div'); row.className = 'object-row'; const label = document.createElement('span');
      label.textContent = `${new Date(entry.savedAt).toLocaleString()} · ${entry.sceneId} · ${entry.combat ? `Combate · ronda ${entry.round}` : 'Exploración'}`;
      const load = document.createElement('button'); load.textContent = 'Cargar'; load.onclick = async () => { try { await confirmRestore(await privatePost(`/api/dm/save/history/${encodeURIComponent(entry.id)}/preview`, { runtimeEpoch })); } catch (error) { toast(`No disponible: ${error instanceof Error ? error.message : error}`); } };
      row.append(label, load); box.append(row);
    }
  } catch { box.textContent = 'No se pudieron leer los puntos de retorno.'; }
}
async function privatePost(route: string, body: unknown, raw = false) {
  if (!runtimeEpoch || !csrfToken) throw new Error('Sesión DM no preparada');
  const headers: Record<string, string> = { 'content-type': 'application/json', 'x-dungeons-csrf': csrfToken, 'x-dungeons-runtime-epoch': runtimeEpoch };
  const response = await fetch(route, { method: 'POST', headers, body: raw ? body as BodyInit : JSON.stringify(body), cache: 'no-store' });
  const result = await response.json();
  if (!response.ok) throw new Error(result.code ?? 'No se completó la petición');
  return result;
}
async function confirmRestore(preview: { token: string; expectedStateRevision: number; summary: { campaignId: string; sceneId: string; savedAt: string; kind: string } }) {
  const message = `Restaurar ${preview.summary.kind === 'new' ? 'una partida nueva' : 'esta copia'} de ${preview.summary.campaignId}, escena ${preview.summary.sceneId}, fecha ${new Date(preview.summary.savedAt).toLocaleString()}? Se perderán los cambios posteriores de la mesa; los jugadores volverán a elegir personaje y Deshacer empezará vacío.`;
  if (!window.confirm(message)) return;
  try { const result = await privatePost('/api/dm/save/restore', { token: preview.token, expectedStateRevision: preview.expectedStateRevision, runtimeEpoch, requestId: commandId() }); toast(`Partida restaurada · copia ${result.generation}.`); }
  catch (error) { toast(`Restauración pendiente: ${error instanceof Error ? error.message : error}`); }
}
($('saveNow') as HTMLButtonElement).onclick = async () => {
  try { const saved = await privatePost('/api/dm/save', { runtimeEpoch, requestId: commandId() }); toast(`Guardado confirmado · copia ${saved.generation}.`); }
  catch (error) { toast(`No guardado: ${error instanceof Error ? error.message : error}`); }
};
($('retrySave') as HTMLButtonElement).onclick = async () => {
  try { const saved = await privatePost('/api/dm/save/retry', { runtimeEpoch }); toast(`Guardado confirmado · copia ${saved.generation}.`); }
  catch (error) { toast(`No guardado: ${error instanceof Error ? error.message : error}`); }
};
($('exportSave') as HTMLButtonElement).onclick = () => { location.href = '/api/dm/save/export'; };
($('showEvidence') as HTMLButtonElement).onclick = async () => {
  const box = $('recoveryEvidence'); box.hidden = false; box.textContent = 'Buscando evidencias privadas…';
  try {
    const response = await fetch('/api/dm/save/evidence', { cache: 'no-store' });
    const items: Array<{ id: string; role: string; bytes: number }> = await response.json();
    if (!response.ok) throw new Error('No se pudieron leer las evidencias');
    box.replaceChildren(...items.map(item => { const link = document.createElement('a'); link.href = `/api/dm/save/evidence/${encodeURIComponent(item.id)}`;
      link.textContent = `${item.role} · ${item.bytes} bytes · descargar copia`; link.style.display = 'block'; return link; }));
    if (!items.length) box.textContent = 'No hay archivos de evidencia en esta carpeta.';
  } catch { box.textContent = 'No se pudieron listar las evidencias privadas.'; }
};
($('backupPreview') as HTMLButtonElement).onclick = async () => {
  try { await confirmRestore(await privatePost('/api/dm/save/backup/preview', { runtimeEpoch })); }
  catch (error) { toast(`Copia no disponible: ${error instanceof Error ? error.message : error}`); }
};
($('newPreview') as HTMLButtonElement).onclick = async () => {
  try { await confirmRestore(await privatePost('/api/dm/save/new/preview', { runtimeEpoch })); }
  catch (error) { toast(`No disponible: ${error instanceof Error ? error.message : error}`); }
};
($('restoreFile') as HTMLInputElement).onchange = async () => {
  const input = $('restoreFile') as HTMLInputElement, file = input.files?.[0]; input.value = '';
  if (!file) return;
  if (file.size > 4 * 1024 * 1024) { toast('La copia supera 4 MiB.'); return; }
  try { await confirmRestore(await privatePost('/api/dm/save/preview', await file.arrayBuffer(), true)); }
  catch (error) { toast(`Copia inválida: ${error instanceof Error ? error.message : error}`); }
};

$('scene').onchange = () => {
    selectedId = null; draft = null; draftAction = null;
    campInteractionMode = false; world?.setCampInteractionHighlights(false);
    const campPointDialog = $('campPointDialog') as HTMLDialogElement; if (campPointDialog.open) campPointDialog.close(); campPointSceneId = null;
    const sceneId = ($('scene') as HTMLSelectElement).value;
    command({ type: 'scene', sceneId });
  };
($('campInteractionToggle') as HTMLButtonElement).onclick = () => {
  const isCamp = Boolean(currentScene()?.camp);
  if (!isCamp) return;
  campInteractionMode = !campInteractionMode;
  syncCampInteractionMode(isCamp);
};
$('showGrid').onchange = () => world?.setGridVisible(($('showGrid') as HTMLInputElement).checked);
$('cameraTurnLeft').onclick = () => rotateCamera(-1);
$('cameraTurnRight').onclick = () => rotateCamera(1);
$('cameraReset').onclick = () => { const sceneId = state?.sceneId ?? latestSnapshot?.sceneId; if (!supportsCameraOrbit(sceneId)) return; world?.resetCameraOrientation(); updateCameraOrbitControls(sceneId); publishCameraOrientation(); };
($('cameraTilt') as HTMLInputElement).oninput = event => {
  const input = event.currentTarget as HTMLInputElement;
  world?.setCameraTiltDegrees(Number(input.value));
  $('cameraTiltValue').textContent = `${world?.getCameraTiltDegrees() ?? Number(input.value)}°`;
};
($('shareCameraOrientation') as HTMLInputElement).onchange = event => {
  if ((event.currentTarget as HTMLInputElement).checked) publishCameraOrientation(true);
  else stopSharingCameraOrientation();
};
$('camera').onchange = $('focus').onchange = () => command({ type: 'camera', mode: ($('camera') as HTMLSelectElement).value, focusId: ($('focus') as HTMLSelectElement).value || null });
$('storm').onclick = () => command({ type: 'environment', storm: !state?.environment.storm, intensity: Number(($('stormIntensity') as HTMLInputElement).value) });
($('stormIntensity') as HTMLInputElement).oninput = () => { $('stormIntensityValue').textContent = `${Math.round(Number(($('stormIntensity') as HTMLInputElement).value) * 100)}%`; };
($('stormIntensity') as HTMLInputElement).onchange = () => command({ type: 'environment', storm: Boolean(state?.environment.storm), intensity: Number(($('stormIntensity') as HTMLInputElement).value) });
$('creature').onclick = () => { if (state?.creature) command({ type: 'creature', visible: !state.creature.visible }); };
$('moveHarpy').onclick = () => { if (state?.creature) command({ type: 'entity:move', entityId: state.creature.id, cell: { col: Number(($('harpyCol') as HTMLInputElement).value), row: Number(($('harpyRow') as HTMLInputElement).value) } }); };
function setSideControlsOpen(open: boolean) {
  const panel = $('sideControls'), toggle = $('sideControlToggle');
  panel.classList.toggle('open', open); panel.setAttribute('aria-hidden', String(!open)); toggle.setAttribute('aria-expanded', String(open));
  if (open) requestAnimationFrame(() => ($('sideControlClose') as HTMLButtonElement).focus());
  else toggle.focus();
}
$('sideControlToggle').onclick = () => setSideControlsOpen(!$('sideControls').classList.contains('open'));
$('sideControlClose').onclick = () => setSideControlsOpen(false);
$('undoObject').onclick = () => { if (state?.undo.entryId) command({ type: 'object:undo', entryId: state.undo.entryId }); };
($('gameUndo') as HTMLButtonElement).onclick = () => command({ type: 'game:undo' });
$('rotateObject').onclick = () => { if (!draft) return; const index = draft.allowedRotations.indexOf(draft.rotation); draft.rotation = draft.allowedRotations[(index + 1) % draft.allowedRotations.length]!; renderDraft(); };
$('applyObject').onclick = () => { if (!draft || !draftAction || !draftValid(draft) || draftAction.connectionGeneration !== connectionGeneration) return; const common = { objectRevision: draftAction.objectRevision, cell: draft.cell, rotation: draft.rotation }; const id = draftAction.type === 'detach' ? command(draftAction.requestId ? { type: 'resolveInteraction', requestId: draftAction.requestId, result: draftAction.outcome, ...common } : { type: 'object:detach', objectId: draft.id, outcome: draftAction.outcome, ...common }) : draftAction.type === 'structure' ? command({ type: 'object:structure', objectId: draft.id, structure: draftAction.structure, objectRevision: draftAction.objectRevision }) : command({ type: 'object:transform', objectId: draft.id, ...common }); if (id) pendingDraftCommand = { commandId: id, generation: connectionGeneration }; };
$('cancelObject').onclick = () => { clearDraft(); renderObjects(state!); };
addEventListener('keydown', event => { if (event.key === 'Escape' && $('sideControls').classList.contains('open')) { setSideControlsOpen(false); return; } if (event.key === 'Escape' && draft) { clearDraft(); renderObjects(state!); } });
function listSection(title: string, values: string[]) {
  const section = document.createElement('section'), heading = document.createElement('h3'), list = document.createElement('ul');
  heading.textContent = title; list.replaceChildren(...values.map(value => { const item = document.createElement('li'); item.textContent = value; return item; })); section.append(heading, list); return section;
}

function openCombatSheet(current: DmState, participant: DmState['combat']['participants'][number]) {
  const dialog = $('combatSheetDialog') as HTMLDialogElement, player = current.characters.find(character => character.id === participant.id), creature = current.creature?.id === participant.id ? current.creature : null, npc = current.npcs.find(candidate => candidate.id === participant.id);
  $('combatSheetKicker').textContent = participant.kind === 'player' ? 'HOJA DE PERSONAJE' : participant.kind === 'npc' ? 'HOJA DE PNJ' : 'HOJA DE CRIATURA';
  $('combatSheetName').textContent = participant.label;
  $('combatSheetSummary').textContent = `${participant.active ? 'En combate' : 'Fuera de combate'} · ${participant.controller === 'player' ? 'controlado por jugador' : 'controlado por DM'}`;
  const stats = $('combatSheetStats'); stats.replaceChildren(...[
    ['PG', `${participant.hp}/${participant.maxHp}`], ['Clase de armadura', String(participant.armorClass)], ['Velocidad', `${participant.speedMeters} m`], ['Iniciativa', `${participant.initiative >= 0 ? '+' : ''}${participant.initiative}`]
  ].map(([label, value]) => { const item = document.createElement('div'), title = document.createElement('b'), text = document.createElement('span'); title.textContent = label ?? ''; text.textContent = value ?? ''; item.append(title, text); return item; }));
  const body = $('combatSheetBody'); body.replaceChildren();
  if (player?.sheet) {
    body.append(listSection('Rasgos', player.sheet.features), listSection('Ataques', player.sheet.attacks));
    if (player.sheet.spells.length) body.append(listSection('Conjuros', player.sheet.spells));
    if (player.inventory.length) body.append(listSection('Mochila', player.inventory));
    for (const detail of player.sheet.details ?? []) body.append(listSection(detail.title, detail.entries));
  } else if (creature) body.append(listSection('Rasgos', creature.traits), listSection('Acciones', creature.actions));
  else if (npc) { if (npc.traits.length) body.append(listSection('Rasgos', npc.traits)); body.append(listSection('Acciones', npc.attacks.map(action => action.label))); }
  else body.append(listSection('Acciones', participant.attacks.map(action => action.label)));
  if (!dialog.open) dialog.showModal();
}

function openNpcSheet(npc: DmState['npcs'][number]) {
  const dialog = $('combatSheetDialog') as HTMLDialogElement;
  $('combatSheetKicker').textContent = 'HOJA DE PNJ';
  $('combatSheetName').textContent = npc.label;
  $('combatSheetSummary').textContent = npc.visible ? 'Presente en escena · controlado por DM' : 'Oculto · controlado por DM';
  const stats = $('combatSheetStats'); stats.replaceChildren(...[
    ['PG', `${npc.hp}/${npc.maxHp}`], ['Clase de armadura', String(npc.armorClass)], ['Velocidad', `${npc.speedMeters} m`], ['Estado', npc.combatEnabled ? 'Disponible para combate' : 'Escénico']
  ].map(([label = '', value = '']) => { const item = document.createElement('div'), title = document.createElement('b'), text = document.createElement('span'); title.textContent = label; text.textContent = value; item.append(title, text); return item; }));
  const body = $('combatSheetBody'); body.replaceChildren();
  if (npc.traits.length) body.append(listSection('Rasgos', npc.traits));
  body.append(listSection('Acciones', npc.attacks.map(action => action.label)));
  if (!dialog.open) dialog.showModal();
}

function combatantPortrait(current: DmState, participant: CombatParticipant) {
  const entity = latestSnapshot?.entities.find(item => item.id === participant.id);
  const actor = current.characters.find(item => item.id === participant.id) ?? current.npcs.find(item => item.id === participant.id);
  const tokenId = entity?.tokenId ?? actor?.tokenId ?? participant.id;
  const asset = campaign?.tokens[tokenId];
  const portrait = document.createElement('span'); portrait.className = 'combat-card-portrait'; portrait.setAttribute('aria-hidden', 'true');
  const url = asset?.portraitUrl ?? asset?.url;
  if (!url) { portrait.classList.add('portrait-fallback'); portrait.textContent = participant.label.trim().slice(0, 1).toLocaleUpperCase(); return portrait; }
  const image = document.createElement('img'); image.className = asset?.portraitUrl ? 'portrait-art' : 'portrait-token'; image.alt = ''; image.loading = 'lazy'; image.decoding = 'async'; image.draggable = false; image.src = url;
  image.onerror = () => { image.remove(); portrait.classList.add('portrait-fallback'); portrait.textContent = participant.label.trim().slice(0, 1).toLocaleUpperCase(); };
  portrait.append(image); return portrait;
}

function renderCombat(current: DmState) {
  const box = $('combat'), combat = current.combat; box.replaceChildren();
  if (!combat.active) {
    selectedCombatantId = null;
    const hasOpponent = Boolean(current.creature?.visible && current.creature.hp > 0) || current.npcs.some(npc => npc.visible && npc.combatEnabled && npc.hp > 0);
    const start = document.createElement('button'); start.className = 'primary'; start.textContent = 'Iniciar combate'; start.disabled = !hasOpponent || !current.characters.some(character => character.claimed); start.onclick = () => command({ type: 'combat:start' });
    const note = document.createElement('p'); note.className = 'note'; note.textContent = start.disabled ? 'Revela un oponente y asegúrate de que haya al menos un personaje conectado.' : 'Cuando comience, el mapa ocupará la parte superior y la consola táctica aparecerá debajo.';
    box.append(start, note); return;
  }
  if (combat.initiativePending) {
    const header = document.createElement('header'), title = document.createElement('div'), heading = document.createElement('h2'), note = document.createElement('p'), end = document.createElement('button');
    heading.textContent = 'Iniciativa'; note.className = 'combat-turn'; note.textContent = 'Cada participante tira físicamente 1d20 + su modificador e introduce el total. El programa no tira dados.'; title.append(heading, note);
    end.textContent = 'Finalizar combate'; end.onclick = () => command({ type: 'combat:end' }); header.className = 'combat-deck-header'; header.append(title, end); box.append(header);
    const roster = document.createElement('div'); roster.className = 'combat-roster';
    for (const participant of combat.participants) {
      const card = document.createElement('article'), name = document.createElement('div'), identity = document.createElement('div'), label = document.createElement('b'), status = document.createElement('p'), input = document.createElement('input'), save = document.createElement('button');
      card.className = 'combat-card initiative-card'; name.className = 'combat-card-init-name'; label.textContent = participant.label; identity.className = 'combat-card-identity'; identity.append(label); name.append(combatantPortrait(current, participant), identity);
      status.className = 'combat-card-meta'; status.textContent = participant.initiativeSubmitted ? `Registrada: ${participant.initiative}` : participant.controller === 'player' ? 'Pendiente del jugador (puede introducirla también el DM)' : 'Pendiente del DM';
      input.type = 'number'; input.min = '-20'; input.max = '40'; input.placeholder = 'Total'; input.value = participant.initiativeSubmitted ? String(participant.initiative) : '';
      save.textContent = participant.initiativeSubmitted ? 'Corregir' : 'Registrar';
      const submit = () => { const total = Number(input.value); if (!Number.isInteger(total) || total < -20 || total > 40) return toast('Introduce un total entero entre -20 y 40.'); command({ type: 'combat:initiative', entries: [{ id: participant.id, initiative: total }] }); };
      save.onclick = submit; input.onkeydown = event => { if (event.key === 'Enter') submit(); };
      card.append(name, status, input, save); roster.append(card);
    }
    box.append(roster);
    const allSubmitted = combat.participants.every(participant => participant.initiativeSubmitted);
    if (!allSubmitted) return;
    const orderPanel = document.createElement('section'), orderTitle = document.createElement('h3'), orderNote = document.createElement('p');
    orderPanel.className = 'combat-panel'; orderTitle.textContent = 'Orden de turnos'; orderNote.className = 'note'; orderNote.textContent = 'El orden se calcula con los totales anotados. Si hay empate, el DM decide entre los empatados antes de confirmarlo.'; orderPanel.append(orderTitle, orderNote);
    const orderedIds = combat.order.map(item => item.id);
    for (let index = 0; index < orderedIds.length; index++) {
      const id = orderedIds[index]!, participant = combat.participants.find(item => item.id === id)!;
      const row = document.createElement('div'), label = document.createElement('span'), up = document.createElement('button'), down = document.createElement('button');
      row.className = 'button-row'; label.textContent = `${index + 1}. ${participant.label} · ${participant.initiative}`;
      const previous = index > 0 ? combat.participants.find(item => item.id === orderedIds[index - 1]) : undefined;
      const following = index < orderedIds.length - 1 ? combat.participants.find(item => item.id === orderedIds[index + 1]) : undefined;
      up.textContent = '↑'; down.textContent = '↓'; up.title = 'Subir dentro de un empate'; down.title = 'Bajar dentro de un empate'; up.disabled = !previous || previous.initiative !== participant.initiative; down.disabled = !following || following.initiative !== participant.initiative;
      const move = (delta: -1 | 1) => { const next = [...orderedIds], other = index + delta; [next[index], next[other]] = [next[other]!, next[index]!]; command({ type: 'combat:initiativeOrder', order: next, confirm: false }); };
      up.onclick = () => move(-1); down.onclick = () => move(1); row.append(label, up, down); orderPanel.append(row);
    }
    const confirm = document.createElement('button'); confirm.className = 'primary'; confirm.textContent = 'Confirmar orden y empezar'; confirm.onclick = () => command({ type: 'combat:initiativeOrder', order: orderedIds, confirm: true }); orderPanel.append(confirm); box.append(orderPanel); return;
  }
  const active = combat.participants.find(participant => participant.id === combat.currentId), header = document.createElement('header'), title = document.createElement('div'), heading = document.createElement('h2'), turn = document.createElement('p'), controls = document.createElement('div');
  const activeIncapacitated = Boolean(active?.conditions.some(condition => condition === 'paralizada' || condition === 'inconsciente'));
  heading.textContent = `Ronda ${combat.round}`; turn.className = 'combat-turn'; turn.textContent = `Turno de ${active?.label ?? '—'}${activeIncapacitated ? ' · incapacitada' : combat.movement ? ` · ${combat.movement.remainingSquares}/${combat.movement.maximumSquares} casillas` : ''}`; title.append(heading, turn);
  const next = document.createElement('button'); next.className = 'primary'; next.textContent = 'Pasar turno'; next.onclick = () => command({ type: 'combat:endTurn' });
  const end = document.createElement('button'); end.textContent = 'Finalizar combate'; end.onclick = () => command({ type: 'combat:end' });
  controls.className = 'button-row'; controls.append(next, end); header.className = 'combat-deck-header'; header.append(title, controls); box.append(header);
  const roster = document.createElement('div'); roster.className = 'combat-roster';
  for (const participant of combat.participants) {
    const card = document.createElement('article'); card.className = `combat-card${participant.id === combat.currentId ? ' current' : ''}`;
    const name = document.createElement('button'), identity = document.createElement('span'), nameLabel = document.createElement('span'), sheetLabel = document.createElement('small'); name.className = 'combat-card-name'; nameLabel.textContent = `${participant.id === combat.currentId ? '✦ ' : ''}${participant.label}`; sheetLabel.textContent = 'Ver ficha'; identity.className = 'combat-card-identity'; identity.append(nameLabel, sheetLabel); name.append(combatantPortrait(current, participant), identity); name.onclick = () => openCombatSheet(current, participant);
    const meta = document.createElement('p'); meta.className = 'combat-card-meta'; meta.textContent = `PG ${participant.hp}/${participant.maxHp} · CA ${participant.armorClass} · Ini ${participant.initiative >= 0 ? '+' : ''}${participant.initiative}`;
    const bar = document.createElement('div'), fill = document.createElement('i'); bar.className = 'combat-card-hp'; fill.style.width = `${Math.max(0, Math.min(100, participant.hp / Math.max(1, participant.maxHp) * 100))}%`; bar.append(fill);
    const conditions = document.createElement('div'); conditions.className = 'condition-pills'; conditions.replaceChildren(...(participant.conditions.length ? participant.conditions : ['sin condiciones']).map(condition => { const pill = document.createElement('span'); pill.className = 'condition-pill'; pill.textContent = condition; return pill; }));
    const control = document.createElement('button'); control.className = 'combat-card-control'; control.textContent = participant.id === selectedCombatantId ? 'Controlando' : 'Seleccionar';
    control.onclick = () => { selectedCombatantId = participant.id; renderCombat(current); };
    card.append(name, meta, bar, conditions, control); roster.append(card);
  }
  box.append(roster);
  const panel = document.createElement('section'); panel.className = 'combat-panel';
  if (!active) { panel.textContent = 'Esperando al siguiente combatiente.'; box.append(panel); return; }
  const selected = combat.participants.find(participant => participant.id === selectedCombatantId) ?? active;
  const panelTitle = document.createElement('h3'); panelTitle.textContent = selected.id === active.id ? `Control de ${selected.label}` : `Consulta DM · ${selected.label}`; panel.append(panelTitle);
  const grid = document.createElement('div'); grid.className = 'combat-panel-grid'; const summary = document.createElement('div'), actions = document.createElement('div');
  const incapacitated = selected.conditions.some(condition => condition === 'paralizada' || condition === 'inconsciente');
  const stats = document.createElement('div'); stats.className = 'combat-stat-row'; for (const [label, value] of [['PG', `${selected.hp}/${selected.maxHp}`], ['CA', String(selected.armorClass)], ['Movimiento', incapacitated ? '0 m' : `${selected.speedMeters} m`]]) { const stat = document.createElement('div'), caption = document.createElement('b'), text = document.createElement('span'); stat.className = 'combat-stat'; caption.textContent = label ?? ''; text.textContent = value ?? ''; stat.append(caption, text); stats.append(stat); }
  summary.append(stats);
  const canControl = selected.active && selected.id === active.id;
  const enemies = combat.participants.filter(item => item.id !== selected.id && item.active && item.controller !== selected.controller);
  const target = document.createElement('select'); target.className = 'dm-combat-target'; target.setAttribute('aria-label', `Objetivo de ${selected.label}`);
  target.append(...enemies.map(item => { const option = document.createElement('option'); option.value = item.id; option.textContent = `${item.label} · CA ${item.armorClass}`; return option; }));
  const actionTips: Record<BasicCombatAction, string> = {
    dash: 'Ganas movimiento adicional igual a tu velocidad.', disengage: 'Evita ataques de oportunidad.', dodge: 'Los ataques contra ti tienen desventaja.',
    help: 'Da ventaja al próximo ataque aliado contra el enemigo elegido; se valida la proximidad al ayudar.',
    hide: 'Tira Sigilo CD 15 con oscuridad intensa o cobertura de tres cuartos o total y fuera de la línea de visión.',
    magic: 'Declara un conjuro o activa un objeto mágico; el DM resuelve el efecto.', ready: 'Reserva la reacción al desencadenante declarado.',
    'use-object': 'El DM resuelve el objeto.', search: 'El DM indica habilidad y CD contextual.', study: 'El DM indica habilidad y CD contextual.', influence: 'El DM indica habilidad y CD contextual.'
  };
  const basicActions: Array<{ action: BasicCombatAction; label: string; category: DmCombatActionCategory }> = [
    { action: 'dash', label: 'Correr', category: 'utility' }, { action: 'disengage', label: 'Destrabarse', category: 'utility' },
    { action: 'dodge', label: 'Esquivar', category: 'utility' }, { action: 'help', label: 'Ayudar', category: 'utility' },
    { action: 'hide', label: 'Esconderse', category: 'utility' }, { action: 'search', label: 'Buscar', category: 'utility' },
    { action: 'study', label: 'Estudiar', category: 'utility' }, { action: 'influence', label: 'Influir', category: 'utility' },
    { action: 'magic', label: 'Acción mágica', category: 'magic' }, { action: 'ready', label: 'Preparar', category: 'reaction' },
    { action: 'use-object', label: 'Utilizar objeto', category: 'dm' }
  ];
  const categoryFor = (action: CombatAction): DmCombatActionCategory => action.actionCost === 'reaction' ? 'reaction' : action.actionCost === 'bonus' ? 'bonus' : action.magical ? 'magic' : action.resolution === 'guided' || action.targeting === 'point' ? 'utility' : 'attack';
  const categories: Array<{ id: DmCombatActionCategory; icon: string; label: string }> = [
    { id: 'attack', icon: '⚔', label: 'Ataques' }, { id: 'magic', icon: '✦', label: 'Magia' },
    { id: 'bonus', icon: '↗', label: 'Adicional' }, { id: 'reaction', icon: '↻', label: 'Reacción' },
    { id: 'utility', icon: '➤', label: 'Utilidad' }, { id: 'dm', icon: '♟', label: 'DM' }
  ];
  const counts = new Map<DmCombatActionCategory, number>(categories.map(category => [category.id, 0]));
  for (const action of selected.attacks) counts.set(categoryFor(action), (counts.get(categoryFor(action)) ?? 0) + 1);
  for (const action of basicActions) counts.set(action.category, (counts.get(action.category) ?? 0) + 1);
  counts.set('dm', (counts.get('dm') ?? 0) + 1 + Number(selected.conditions.some(condition => condition === 'apresada' || condition === 'restringida')));
  const tabs = document.createElement('div'); tabs.className = 'dm-combat-tabs'; tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', `Acciones de ${selected.label}`);
  for (const category of categories) {
    const tab = document.createElement('button'), icon = document.createElement('i'), label = document.createElement('span'), count = document.createElement('small');
    tab.type = 'button'; tab.className = 'dm-combat-tab'; tab.setAttribute('role', 'tab'); tab.setAttribute('aria-selected', String(dmCombatActionCategory === category.id)); tab.setAttribute('aria-label', `${category.label}, ${counts.get(category.id) ?? 0} acciones`); tab.title = category.label;
    icon.setAttribute('aria-hidden', 'true'); icon.textContent = category.icon; label.textContent = category.label; count.textContent = String(counts.get(category.id) ?? 0); tab.append(icon, label, count);
    const choose = () => { if (dmCombatActionCategory !== category.id) { dmCombatActionCategory = category.id; renderCombat(current); } };
    tab.addEventListener('pointerdown', event => { if (event.pointerType === 'mouse' && event.button !== 0) return; event.preventDefault(); event.stopPropagation(); choose(); });
    tab.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); if (event.detail === 0) choose(); });
    tabs.append(tab);
  }
  actions.className = 'dm-combat-actions'; actions.append(tabs);
  const status = document.createElement('p'); status.className = 'dm-combat-action-meta';
  status.textContent = incapacitated ? 'Incapacitada · sin movimiento, acciones ni reacciones' : `Acción ${combat.actionUsed[selected.id] ? 'gastada' : 'lista'} · Adicional ${combat.bonusActionUsed[selected.id] ? 'gastada' : 'lista'} · Reacción ${combat.reactionUsed[selected.id] ? 'gastada' : 'lista'}`;
  actions.append(status);
  if (!canControl && dmCombatActionCategory !== 'dm') { const note = document.createElement('p'); note.className = 'note'; note.textContent = selected.controller === 'player' ? 'El personaje elige su objetivo desde su pantalla. El DM puede consultar la ficha y gestionar sus condiciones en la pestaña DM.' : `Las acciones de ${selected.label} estarán disponibles cuando llegue su turno.`; actions.append(note); }
  else {
    if (enemies.length) actions.append(target);
    const actionList = document.createElement('div'); actionList.className = 'combat-action-list';
    const appendAttack = (action: CombatAction) => {
      const button = document.createElement('button'), costUsed = action.actionCost === 'reaction' ? combat.reactionUsed[selected.id] : action.actionCost === 'bonus' ? combat.bonusActionUsed[selected.id] : combat.actionUsed[selected.id];
      const cost = action.actionCost === 'reaction' ? 'Reacción' : action.actionCost === 'bonus' ? 'Adicional' : 'Acción';
      const range = action.range ? `${action.range.normalMeters}${action.range.longMeters ? `/${action.range.longMeters}` : ''} m` : 'alcance no indicado';
      const detail = `${cost} · ${action.attackBonus >= 0 ? '+' : ''}${action.attackBonus} · ${action.damageDice}${action.damageBonus ? `${action.damageBonus >= 0 ? '+' : ''}${action.damageBonus}` : ''}${action.damageType ? ` ${action.damageType}` : ''} · ${range}${action.guidance ? ` · ${action.guidance}` : ''}`;
      button.type = 'button'; button.textContent = action.label; button.title = detail; button.setAttribute('aria-label', `${action.label}. ${detail}`);
      button.disabled = incapacitated || !enemies.length || Boolean(combat.prompt) || Boolean(costUsed) || Boolean(action.recharge && combat.recharge[selected.id]?.[action.id] === false);
      button.onclick = () => command({ type: 'combat:declare', attackerId: selected.id, targetId: target.value, actionId: action.id, useSneakAttack: true }); actionList.append(button);
    };
    const appendBasic = (action: BasicCombatAction, label: string) => {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = label; button.title = actionTips[action]; button.disabled = incapacitated || Boolean(combat.prompt) || Boolean(combat.actionUsed[selected.id]) || action === 'help' && !enemies.length;
      button.onclick = () => command({ type: 'combat:basic', attackerId: selected.id, action, ...(action === 'help' ? { targetId: target.value } : {}) }); actionList.append(button);
    };
    if (dmCombatActionCategory === 'dm') {
      const controls = document.createElement('div'); controls.className = 'dm-combat-dm-controls';
      const sheet = document.createElement('button'); sheet.textContent = 'Ver ficha del combatiente'; sheet.onclick = () => openCombatSheet(current, selected); controls.append(sheet);
      const conditionRow = document.createElement('div'); conditionRow.className = 'dm-combat-conditions'; conditionRow.setAttribute('aria-label', 'Condiciones del combatiente');
      for (const condition of ['envenenada', 'apresada', 'agarrada', 'derribada', 'asustada', 'hechizada', 'paralizada', 'inconsciente', 'oculta', 'invisible', 'restringida'] as const) {
        const button = document.createElement('button'), enabled = selected.conditions.includes(condition); button.type = 'button'; button.className = 'condition-pill'; button.textContent = enabled ? `✓ ${condition}` : condition; button.setAttribute('aria-pressed', String(enabled)); button.onclick = () => command({ type: 'combat:condition', entityId: selected.id, condition, active: !enabled }); conditionRow.append(button);
      }
      controls.append(conditionRow);
      const useObject = document.createElement('button'); useObject.textContent = 'Utilizar objeto'; useObject.title = actionTips['use-object']; useObject.disabled = !canControl || incapacitated || Boolean(combat.prompt) || Boolean(combat.actionUsed[selected.id]); useObject.onclick = () => command({ type: 'combat:basic', attackerId: selected.id, action: 'use-object' }); controls.append(useObject);
      if (canControl) {
        const prone = selected.conditions.includes('derribada'), posture = document.createElement('button'); posture.textContent = prone ? 'Levantarse · mitad del movimiento' : 'Tirarse al suelo'; posture.disabled = incapacitated || Boolean(combat.prompt); posture.onclick = () => command({ type: prone ? 'combat:stand' : 'combat:dropProne', attackerId: selected.id }); controls.append(posture);
        if (selected.conditions.includes('restringida') || selected.conditions.includes('apresada')) { const escape = document.createElement('button'); escape.textContent = 'Intentar liberarse · acción'; escape.disabled = incapacitated || Boolean(combat.prompt) || Boolean(combat.actionUsed[selected.id]); escape.onclick = () => command({ type: 'combat:escape', attackerId: selected.id }); controls.append(escape); }
      }
      actionList.append(controls);
    } else {
      for (const action of selected.attacks.filter(item => categoryFor(item) === dmCombatActionCategory)) appendAttack(action);
      for (const basic of basicActions.filter(item => item.category === dmCombatActionCategory)) appendBasic(basic.action, basic.label);
    }
    if (!actionList.childElementCount) { const empty = document.createElement('p'); empty.className = 'note'; empty.textContent = dmCombatActionCategory === 'reaction' ? 'No hay reacciones declaradas. Las reacciones pendientes aparecen en el recuadro de resolución.' : 'No hay acciones en esta categoría para este combatiente.'; actionList.append(empty); }
    actions.append(actionList);
  }
  grid.append(summary, actions); panel.append(grid);
  grid.append(summary, actions); panel.append(grid);
  if (combat.prompt) {
    const prompt = document.createElement('section'), text = document.createElement('p'); prompt.className = 'combat-prompt'; text.textContent = `${combat.prompt.title} · ${combat.prompt.instruction}`; prompt.append(text);
    if (combat.prompt.stage === 'reaction') {
      const choices = document.createElement('div'), accept = document.createElement('button'), decline = document.createElement('button'); choices.className = 'button-row'; accept.className = 'primary'; accept.textContent = 'Atacar · gastar reacción'; decline.textContent = 'Dejar pasar'; accept.onclick = () => command({ type: 'combat:reaction', promptId: combat.prompt!.id, accept: true }); decline.onclick = () => command({ type: 'combat:reaction', promptId: combat.prompt!.id, accept: false }); choices.append(accept, decline); prompt.append(choices);
    } else {
      const input = document.createElement('input'), submit = document.createElement('button'); input.type = 'number'; input.min = String(combat.prompt.minimum ?? 0); input.max = String(combat.prompt.maximum ?? 200); submit.className = 'primary'; submit.textContent = combat.prompt.stage === 'damage' ? 'Aplicar daño' : 'Confirmar dado'; submit.onclick = () => { const value = Number(input.value); if (!Number.isInteger(value)) return toast('Introduce un resultado entero.'); const type = combat.prompt!.stage === 'attack' ? 'combat:rollAttack' : combat.prompt!.stage === 'damage' ? 'combat:rollDamage' : combat.prompt!.stage === 'death-save' ? 'combat:rollDeathSave' : 'combat:rollSave'; command({ type, promptId: combat.prompt!.id, ...(type === 'combat:rollAttack' || type === 'combat:rollDeathSave' ? { d20: value } : type === 'combat:rollDamage' ? { diceTotal: value } : { total: value }) }); }; prompt.append(input, submit);
    }
    panel.append(prompt);
  }
  box.append(panel);
}

($('closeCombatSheet') as HTMLButtonElement).onclick = () => ($('combatSheetDialog') as HTMLDialogElement).close();
setupWorkspace();
void beginDm();
