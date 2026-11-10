import { climateSummary, lightPhaseLabel, renderWeatherRules } from '../../engine/client/weather-console.js';
import { mountClimateIconControls } from '../../engine/client/climate-icon-controls.js';
import { seaState, seaStateLabel, weatherMode, weatherModeLabels, weatherDescription } from '../../engine/shared/weather.js';
import { io, type Socket } from 'socket.io-client';
import { ConditionPanel, conditionStrip } from './ui/conditions';
import { conditionPresentation } from '../../engine/shared/conditions';
import { OBJECT_MODEL_VERSION, PROTOCOL_VERSION } from '../../engine/shared/protocol';
import type { AudioState, BasicCombatAction, Cell, CommandResult, CombatAction, CombatParticipant, DmObject, DmState, WorldSnapshot } from '../../engine/shared/protocol';
import type { PublicCampaignDefinition } from '../../engine/shared/campaign';
import { supportsCameraOrientation, cameraOrbitLabel, CAMERA_ORBIT_PROFILE } from '../../engine/shared/camera';
import {cameraProfileForScene} from '../../engine/client/camera-profile';
import {cameraTiltControl} from '../../engine/client/camera-tilt-input';
import { activitiesForCampPoint, campActivities, campPointInReach } from '../../engine/shared/camp-activities';
import { footprintFor } from '../../engine/shared/geometry';
import {journeyPortLabel,journeyReturnKey} from '../../engine/shared/journey';
import { commandId } from '../../engine/client/uuid';
import { worldVectorToCellDelta } from '../../engine/client/camera-movement';
import { readUiPreferences, writeUiPreferences } from '../../engine/client/ui-preferences';
import { DEFAULT_GRID_STYLE, normalizeGridStyle, type GridStyle } from '../../engine/client/grid-style.js';
import { loadCampaign } from './campaign';
import { WorldRenderer } from './world';
import { renderD8AnimationAudit } from './d8-animation-audit';
import { combatActionDescription, combatTurnIndicators, compactCombatPrompt } from '../../engine/client/combat-presentation';
import { combatTimeline } from '../../engine/client/combat-timeline';
import { packDmWorkspace, createDmWorkspacePreset, recommendedDmWorkspace, type DmWorkspacePresetId, type WorkspaceState, type WorkspaceMode, type WindowLayout } from '../../engine/client/dm-workspace';
import { SceneLoadRecovery } from '../../engine/client/scene-load-recovery';
import { advanceClimate, formatGameClock, gameClockAt, clockTimeSelection } from '../../engine/shared/game-time.js';
import { SnapshotClock } from '../../engine/client/snapshot-clock.js';
import { DmObjectRosette } from './ui/dm/object-rosette';
import { DmMapTargets } from './ui/dm/map-targets';
import {DmMapContextMenu,type MapContextAction} from './ui/dm/map-context-menu';
import type {DmMapHit} from '../../engine/client/dm-map-input';
import { chip, chips, disclosure, emptyState, localButton, preserveDisclosures, relativeTime, savePresentation, sceneBlock, sectionDeck } from './ui/dm/presentation';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const climateIcons = mountClimateIconControls(document);
let socket: Socket | null = null, state: DmState | null = null, world: WorldRenderer | null = null, campaign: PublicCampaignDefinition | null = null;
const sceneLoadRecovery = new SceneLoadRecovery();
const dmServerClock = new SnapshotClock();
let selectedId: string | null = null, draft: DmObject | null = null, latestSnapshot: WorldSnapshot | null = null, readyEpoch = -1, toastTimer = 0;
let inspectedPickupId: string | null = null;
let conditionSheetEntityId: string | null = null;
const dmConditionPanel = new ConditionPanel(change => {
  if (conditionSheetEntityId) command({ type: 'combat:condition', entityId: conditionSheetEntityId, ...change });
});
setInterval(() => { if (($('combatSheetDialog') as HTMLDialogElement).open) dmConditionPanel.updateTimers(); }, 1000);
let mapToolPanel: 'scene' | 'camera' | 'objects' | null = null;
let mapObjectsHighlighted = false;
let objectRosette: DmObjectRosette | null = null, mapTargets: DmMapTargets | null = null;
let selectedDmActor:{id:string;label:string;kind:string}|null=null;
let pendingDmExplore:{sceneId:string;cell:Cell;surfaceId:string}|null=null;
const mapContextMenu=new DmMapContextMenu();
let pendingPlacementId:string|null=null;
let rosetteSource = 'objects';
let campRosetteSelection: { sceneId: string; pointId: string } | null = null;
function setMapToolPanel(panel: typeof mapToolPanel) {
  mapToolPanel = panel;
  $('mapToolsPanel').hidden = panel === null;
  $('mapScenePanel').hidden = panel !== 'scene';
  $('mapCameraPanel').hidden = panel !== 'camera';
  $('mapHighlightPanel').hidden = panel !== 'objects';
  $('mapObjectsPanel').hidden = !draft;
  $('mapToolsToggle').setAttribute('aria-expanded', String(panel !== null));
  $('mapSceneButton').setAttribute('aria-expanded', String(panel === 'scene'));
  $('mapSceneToggle').setAttribute('aria-pressed', String(panel === 'scene'));
  $('mapCameraToggle').setAttribute('aria-expanded', String(panel === 'camera'));
  $('mapObjectsToggle').setAttribute('aria-pressed', String(panel === 'objects'));
  if (state) updateMapTargets(state);
}
function setMapHighlights(active: boolean) {
  mapObjectsHighlighted = active;
  $('mapHighlightToggle').setAttribute('aria-pressed', String(active));
  $('mapHighlightToggle').firstChild!.textContent = active ? '◇ Ocultar marcas ' : '◇ Resaltar objetos ';
  if (state) updateMapTargets(state);
}
type CampPoint = NonNullable<PublicCampaignDefinition['scenes'][number]['camp']>['interactionPoints'][number];
let campInteractionMode = false, campPointSceneId: string | null = null;
let connectionGeneration = 0, pendingDraftCommand: { commandId: string; generation: number } | null = null;
let runtimeEpoch: string | null = null, csrfToken: string | null = null;
let lastSharedCameraKey: string | null = null;
let selectedCombatantId: string | null = null, selectedMapEntityId: string | null, lastCombatMoveAt = 0, combatConsoleMinimized = false;
let armedDmCombatPoint: { actorId: string; action: CombatAction } | null = null;
const wreckC8Loot = [
  'Vino fino: 5 botellas, 10 po cada una (algunas pueden estar rotas)',
  'Clavo de olor: 10 kg, 60 po',
  'Lingotes de plata: 10 de medio kilo, 5 po cada uno',
  'Candelabros de hueso de dragón tallado: pareja, 25 po cada uno',
  'Laúd: 50 po',
  'Pergamino de Orden imperiosa'
];
type DmCombatActionCategory = 'attack' | 'magic' | 'bonus' | 'reaction' | 'utility' | 'dm';
type DmDrawerTab = 'windows' | 'ambience' | 'audio' | 'settings';
type DmConsoleDensity = 'compact' | 'comfortable' | 'spacious';
type DmConsoleTextSize = 'small' | 'standard' | 'large';
type DmUiPreferences = { navigationVersion?:1; showGrid: boolean; gridStyle: GridStyle; sideControlsOpen: boolean; drawerTab: DmDrawerTab; combatActionCategory: DmCombatActionCategory; shareCameraOrientation: boolean; consoleDensity?: DmConsoleDensity; consoleTextSize?: DmConsoleTextSize };
const dmUiPreferencesStorageKey = 'dnd-dm-ui-preferences.v1';
const defaultDmUiPreferences: DmUiPreferences = { showGrid: true, gridStyle: { ...DEFAULT_GRID_STYLE }, sideControlsOpen: false, drawerTab: 'windows', combatActionCategory: 'attack', shareCameraOrientation: false, navigationVersion:1, consoleDensity: 'comfortable', consoleTextSize: 'standard' };
const dmCombatCategories: DmCombatActionCategory[] = ['attack', 'magic', 'bonus', 'reaction', 'utility', 'dm'];
const dmConsoleDensities: DmConsoleDensity[] = ['compact', 'comfortable', 'spacious'];
const dmConsoleTextSizes: DmConsoleTextSize[] = ['small', 'standard', 'large'];
const isDmUiPreferences = (value: unknown): value is DmUiPreferences => {
  if (!value || typeof value !== 'object') return false;
  const saved = value as Partial<DmUiPreferences>;
  return typeof saved.showGrid === 'boolean' && typeof saved.sideControlsOpen === 'boolean'
    && (saved.gridStyle === undefined || Boolean(saved.gridStyle && typeof saved.gridStyle === 'object'
      && ['contrast','fixed'].includes(saved.gridStyle.mode) && /^#[0-9a-f]{6}$/i.test(saved.gridStyle.color)
      && Number.isFinite(saved.gridStyle.opacity) && [1,2,3].includes(saved.gridStyle.thickness)))
    && (saved.drawerTab === 'windows' || saved.drawerTab === 'ambience' || saved.drawerTab === 'audio' || saved.drawerTab === 'settings')
    && typeof saved.combatActionCategory === 'string' && dmCombatCategories.includes(saved.combatActionCategory as DmCombatActionCategory)
    && typeof saved.shareCameraOrientation === 'boolean'
    && (saved.consoleDensity === undefined || dmConsoleDensities.includes(saved.consoleDensity))
    && (saved.consoleTextSize === undefined || dmConsoleTextSizes.includes(saved.consoleTextSize));
};
const storedDmUiPreferences = readUiPreferences(dmUiPreferencesStorageKey, defaultDmUiPreferences, isDmUiPreferences);
let dmUiPreferences: DmUiPreferences = { ...defaultDmUiPreferences, ...storedDmUiPreferences,
  navigationVersion:1,shareCameraOrientation:storedDmUiPreferences.navigationVersion===1?storedDmUiPreferences.shareCameraOrientation:false,
  gridStyle: normalizeGridStyle(storedDmUiPreferences.gridStyle) };
let dmCombatActionCategory: DmCombatActionCategory = dmUiPreferences.combatActionCategory;
function updateDmUiPreferences<K extends keyof DmUiPreferences>(key: K, value: DmUiPreferences[K]) {
  dmUiPreferences = { ...dmUiPreferences, [key]: value };
  writeUiPreferences(dmUiPreferencesStorageKey, dmUiPreferences);
}
function syncDmGridSettings() {
  const style = dmUiPreferences.gridStyle;
  ($('dmGridMode') as HTMLSelectElement).value = style.mode;
  ($('dmGridColor') as HTMLInputElement).value = style.color;
  ($('dmGridColor') as HTMLInputElement).disabled = style.mode === 'contrast';
  ($('dmGridOpacity') as HTMLInputElement).value = String(Math.round(style.opacity * 100));
  $('dmGridOpacityValue').textContent = `${Math.round(style.opacity * 100)}%`;
  ($('dmGridThickness') as HTMLInputElement).value = String(style.thickness);
  $('dmGridThicknessValue').textContent = style.thickness === 1 ? 'Fina' : style.thickness === 2 ? 'Media' : 'Gruesa';
}
function updateDmGridStyle(change: Partial<GridStyle>) {
  const gridStyle = normalizeGridStyle({ ...dmUiPreferences.gridStyle, ...change });
  updateDmUiPreferences('gridStyle', gridStyle);
  world?.setGridStyle(gridStyle);
  syncDmGridSettings();
}
type SaveStatus = { mode: string; stateRevision: number; savedStateRevision: number | null; generation: number | null; savedAt: string | null; dirty: boolean; errorCode: string | null; runtimeEpoch: string; recoveryNotice?: string | null };
let saveStatus: SaveStatus | null = null;
let draftAction: { type: 'transform' | 'detach' | 'structure'; outcome?: 'caught' | 'fallen'; structure?: 'damaged' | 'destroyed'; requestId?: string; objectRevision: number; sceneEpoch: number; connectionGeneration: number } | null = null;
const epochCommands = new Set(['scene', 'view:focus', 'entity:portal', 'scene:animation', 'creature', 'npc:visible', 'camera', 'environment', 'entity:move', 'entity:place', 'entity:seat', 'combat:start', 'combat:participant', 'combat:initiative', 'combat:initiativeOrder', 'combat:condition', 'combat:endTurn', 'combat:next', 'combat:end', 'combat:declare', 'combat:basic', 'combat:escape', 'combat:rollAttack', 'combat:rollDamage', 'combat:rollSave', 'combat:rollDeathSave', 'combat:recharge', 'resolveInteraction', 'object:door', 'object:interact', 'object:transform', 'object:detach', 'object:structure', 'object:undo', 'pickup:take', 'camp:rest', 'camp:interact']);

type WorkspaceLayouts = Partial<Record<WorkspaceMode, WorkspaceState>>;
const workspaceStorageKey = 'dnd-dm-workspace-v12', legacyWorkspaceStorageKey = 'dnd-dm-workspace-v9', workspaceColumns = 12, minimumWindowHeight = 100;
let workspaceGap = 16;
const workspaceWindows = new Map<string, HTMLElement>();
let workspaceLayouts: WorkspaceLayouts = {};
let activeWorkspaceMode: WorkspaceMode = 'exploration', requestedWorkspaceMode: WorkspaceMode = 'exploration';
let workspaceReady = false;
function workspace() { return document.querySelector<HTMLElement>('.grid.workspace'); }
function applyConsoleCustomization() {
  const density = dmUiPreferences.consoleDensity ?? defaultDmUiPreferences.consoleDensity!;
  const textSize = dmUiPreferences.consoleTextSize ?? defaultDmUiPreferences.consoleTextSize!;
  workspaceGap = density === 'compact' ? 8 : density === 'spacious' ? 18 : 12;
  document.documentElement.dataset.dmDensity = density;
  document.documentElement.dataset.dmTextSize = textSize;
  document.documentElement.style.setProperty('--dm-gap', `${workspaceGap}px`);
}
applyConsoleCustomization();
function normalizeWorkspace(value: unknown): WorkspaceState | null {
  if (!value || typeof value !== 'object') return null;
  const saved = value as Partial<WorkspaceState>;
  if (!saved.windows || typeof saved.windows !== 'object' || Array.isArray(saved.windows)) return null;
  const windows: Record<string, WindowLayout> = {};
  for (const [id, bounds] of Object.entries(saved.windows)) {
    if (!bounds || typeof bounds !== 'object') continue;
    const layout: WindowLayout = {};
    if (Number.isFinite(bounds.span)) layout.span = bounds.span;
    if (Number.isFinite(bounds.height)) layout.height = bounds.height;
    windows[id] = layout;
  }
  return {
    closed: Array.isArray(saved.closed) ? saved.closed.filter((id): id is string => typeof id === 'string') : [],
    minimized: Array.isArray(saved.minimized) ? saved.minimized.filter((id): id is string => typeof id === 'string') : [],
    maximized: Array.isArray(saved.maximized) ? saved.maximized.filter((id): id is string => typeof id === 'string') : [],
    windows,
    order: Array.isArray(saved.order) ? saved.order.filter((id): id is string => typeof id === 'string') : []
  };
}
function readWorkspaceLayouts(): WorkspaceLayouts {
  try {
    const current = localStorage.getItem(workspaceStorageKey);
    const saved = JSON.parse(current ?? localStorage.getItem('dnd-dm-workspace-v11') ?? localStorage.getItem('dnd-dm-workspace-v10') ?? 'null') as Partial<WorkspaceLayouts> | null;
    if (saved && typeof saved === 'object' && ('exploration' in saved || 'combat' in saved)) {
      const exploration = normalizeWorkspace(saved.exploration), combat = normalizeWorkspace(saved.combat);
      // Old resizing copied one height to every neighbour, including empty panels.
      // Preserve order, widths and closed panels; migrate only these stale heights.
      if (!current) for (const layout of [exploration, combat]) if (layout) for (const [id, bounds] of Object.entries(layout.windows)) if (id !== 'mapWindow') delete bounds.height;
      return { ...(exploration ? { exploration } : {}), ...(combat ? { combat } : {}) };
    }
  } catch { /* Si el almacenamiento local no está disponible, se usan las disposiciones recomendadas. */ }
  try {
    // La disposición anterior era común a ambos modos y no guardaba en cuál
    // se editó por última vez. Se conserva en los dos como punto de partida;
    // desde ahora cada modo evoluciona de forma independiente.
    const legacy = normalizeWorkspace(JSON.parse(localStorage.getItem(legacyWorkspaceStorageKey) ?? 'null'));
    const copy = (layout: WorkspaceState): WorkspaceState => ({
      ...layout,
      closed: [...layout.closed], minimized: [...layout.minimized], maximized: [...layout.maximized], order: [...layout.order],
      windows: Object.fromEntries(Object.entries(layout.windows).map(([id, bounds]) => [id, { ...bounds }]))
    });
    if (legacy) for (const [id, bounds] of Object.entries(legacy.windows)) if (id !== 'mapWindow') delete bounds.height;
    return legacy ? { exploration: copy(legacy), combat: copy(legacy) } : {};
  } catch { return {}; }
}
function persistWorkspaceLayouts() {
  try { localStorage.setItem(workspaceStorageKey, JSON.stringify(workspaceLayouts)); }
  catch { /* La consola sigue funcionando aunque el navegador bloquee el almacenamiento local. */ }
}
function setDrawerTab(tab: DmDrawerTab, persist = true) {
  document.querySelectorAll<HTMLButtonElement>('[data-drawer-tab]').forEach(button => { button.classList.toggle('active', button.dataset.drawerTab === tab); button.setAttribute('aria-pressed', String(button.dataset.drawerTab === tab)); });
  document.querySelectorAll<HTMLElement>('[data-drawer-panel]').forEach(panel => { panel.hidden = panel.dataset.drawerPanel !== tab; });
  if (persist) updateDmUiPreferences('drawerTab', tab);
}
function defaultWindowSpan(card: HTMLElement) { return card.id === 'mapWindow' || card.dataset.windowTitle === 'Jugadores' ? 12 : card.id === 'animationAuditCard' ? 6 : 4; }
function minimumWindowSpan(card: HTMLElement) {
  const desk = workspace(); if (!desk || desk.clientWidth <= 0) return card.id === 'mapWindow' ? 6 : 2;
  const minimumWidth = card.id === 'mapWindow' ? 600 : ['combatCard', 'jugadores', 'pnj-de-escena', 'explorationCard'].includes(card.id) ? 250 : 210;
  return Math.min(workspaceColumns, Math.max(card.id === 'mapWindow' ? 6 : 1, Math.ceil((minimumWidth + workspaceGap) / desk.clientWidth * workspaceColumns * 5) / 5));
}
function setWindowSpan(card: HTMLElement, requested: number) {
  // Store the requested proportion, not the temporary minimum needed on a
  // narrow screen. Packing applies that minimum without changing preferences.
  const span = Math.max(1, Math.min(workspaceColumns, Math.round(requested * 5) / 5));
  card.style.setProperty('--window-span', String(span)); card.dataset.windowSpan = String(span);
}
function spanForWidth(card: HTMLElement, width: number) {
  const desk = workspace(); if (!desk || desk.clientWidth <= 0) return defaultWindowSpan(card);
  return Math.round((width + workspaceGap) / desk.clientWidth * workspaceColumns * 5) / 5;
}
function captureWorkspace(): WorkspaceState {
  const current: WorkspaceState = { closed: [], minimized: [], maximized: [], windows: {}, order: [] };
  current.order = Array.from(workspace()?.children ?? []).flatMap(child => child instanceof HTMLElement && child.dataset.windowId ? [child.dataset.windowId] : []);
  for (const [id, card] of workspaceWindows) {
    if (card.classList.contains('window-closed')) current.closed.push(id);
    if (card.classList.contains('window-minimized')) current.minimized.push(id);
    if (card.classList.contains('window-maximized')) current.maximized.push(id);
    const height = Number.parseFloat(card.style.getPropertyValue('--window-height'));
    current.windows[id] = { span: Number(card.style.getPropertyValue('--window-span') || defaultWindowSpan(card)), ...(Number.isFinite(height) ? { height } : {}) };
  }
  return current;
}
function writeWorkspace() {
  if (!workspaceReady) return;
  workspaceLayouts[activeWorkspaceMode] = captureWorkspace();
  persistWorkspaceLayouts();
}
function snapWindowToGrid(card: HTMLElement, measuredWidth = card.getBoundingClientRect().width) {
  if (card.classList.contains('window-maximized')) return;
  setWindowSpan(card, spanForWidth(card, measuredWidth));
}
function visibleWorkspaceWindows() { return [...workspaceWindows.values()].filter(card => !card.hidden && !card.classList.contains('window-closed') && !card.classList.contains('window-minimized') && !card.classList.contains('window-maximized')); }
function syncRowHeight(card: HTMLElement, height: number) {
  card.style.setProperty('--window-height', `${Math.round(height)}px`);
}
function syncWorkspaceRowHeights() {
  const desk = workspace(); if (!desk || !desk.clientWidth) return;
  const cards = Array.from(desk.children).filter((card): card is HTMLElement => card instanceof HTMLElement && workspaceWindows.has(card.id) && !card.hidden && !card.classList.contains('window-closed'));
  const singleColumn = matchMedia('(max-width: 900px)').matches;
  const columns = singleColumn ? 1 : 60;
  const deskStyle = getComputedStyle(desk);
  const width = desk.clientWidth - parseFloat(deskStyle.paddingLeft) - parseFloat(deskStyle.paddingRight);
  const entries = cards.map(card => ({ card, span: singleColumn || card.classList.contains('window-maximized') || card.id === 'mapWindow' && width < 1050 ? columns : Math.min(columns, Math.round(Math.max(minimumWindowSpan(card), Number(card.dataset.windowSpan) || 4) * 5)) }));
  // If a full-width panel splits off an otherwise short row, spread that row
  // across the available width. The original requested widths remain intact.
  let segmentStart = 0;
  for (let end = 0; end <= entries.length; end++) {
    if (end < entries.length && entries[end]!.span !== columns) continue;
    const segment = entries.slice(segmentStart, end);
    let spare = columns - segment.reduce((sum, entry) => sum + entry.span, 0);
    if (segment.length && spare > 0) segment.forEach((entry, index) => { const extra = Math.ceil(spare / (segment.length - index)); entry.span += extra; spare -= extra; });
    segmentStart = end + 1;
  }
  const items = entries.map(({ card, span }) => {
    const maximized = card.classList.contains('window-maximized'), minimized = card.classList.contains('window-minimized');
    card.style.gridColumn = `1 / span ${span}`;
    const cardWidth = width * span / columns - workspaceGap;
    const manualHeight = !maximized ? parseFloat(card.style.getPropertyValue('--window-height')) : NaN;
    let height: number;
    if (minimized) height = card.querySelector<HTMLElement>('.window-titlebar')!.offsetHeight + 2;
    else if (card.id === 'mapWindow') height = Math.max(340, Number.isFinite(manualHeight) ? manualHeight : Math.min(window.innerHeight * .66, cardWidth * .5));
    else {
      const content = card.querySelector<HTMLElement>('.window-content')!;
      card.style.height = 'auto'; content.style.flex = '0 0 auto';
      const naturalHeight = card.querySelector<HTMLElement>('.window-titlebar')!.offsetHeight + content.scrollHeight + 2;
      content.style.removeProperty('flex');
      height = Number.isFinite(manualHeight) ? manualHeight : Math.min(naturalHeight, Math.max(260, window.innerHeight * .64));
    }
    return { id: card.id, span, height: Math.max(2, height) };
  });
  const placements = packDmWorkspace(items, columns, workspaceGap);
  for (const placement of placements) {
    const card = workspaceWindows.get(placement.id)!;
    card.style.gridColumn = `${placement.column} / span ${placement.span}`;
    card.style.setProperty('--packed-column', `${placement.column} / span ${placement.span}`);
    card.style.gridRow = `${placement.row} / span ${placement.rowSpan}`;
    card.style.height = `${placement.height}px`;
  }
}
function updateMinimizeControl(card: HTMLElement) {
  const button = card.querySelector<HTMLButtonElement>('[data-window-action="minimize"]');
  if (!button) return;
  const label = card.classList.contains('window-minimized') ? 'Restaurar ventana' : 'Minimizar ventana';
  button.title = label; button.setAttribute('aria-label', label);
  button.setAttribute('aria-expanded', String(!card.classList.contains('window-minimized')));
  const maximize = card.querySelector<HTMLButtonElement>('[data-window-action="maximize"]');
  if (maximize) {
    const full = card.classList.contains('window-maximized');
    maximize.title = full ? 'Restaurar anchura anterior' : 'Ocupar toda la fila';
    maximize.setAttribute('aria-label', maximize.title); maximize.setAttribute('aria-pressed', String(full)); maximize.textContent = full ? '▣' : '□';
  }
}
function restoreWorkspaceLayout(saved: WorkspaceState | null) {
  const desk = workspace(); if (!desk) return;
  const layout = saved ?? recommendedDmWorkspace(activeWorkspaceMode, desk.clientWidth);
  for (const [id, card] of workspaceWindows) {
    const bounds = layout.windows[id];
    card.classList.remove('window-closed', 'window-minimized', 'window-maximized', 'dragging', 'resizing', 'drop-target');
    card.style.removeProperty('--window-height');
    setWindowSpan(card, bounds?.span ?? defaultWindowSpan(card));
    if (Number.isFinite(bounds?.height)) card.style.setProperty('--window-height', `${Math.max(minimumWindowHeight, bounds!.height!)}px`);
    if (layout.closed.includes(id)) card.classList.add('window-closed');
    if (layout.minimized.includes(id)) card.classList.add('window-minimized');
    if (layout.maximized.includes(id)) card.classList.add('window-maximized');
    updateMinimizeControl(card);
  }
  const ordered = layout.order.map(id => workspaceWindows.get(id)).filter((card): card is HTMLElement => Boolean(card));
  const remaining = [...workspaceWindows.values()].filter(card => !ordered.includes(card));
  desk.append(...ordered, ...remaining);
  renderClosedWindows();
}
function switchWorkspaceMode(mode: WorkspaceMode) {
  requestedWorkspaceMode = mode;
  if (!workspaceReady || mode === activeWorkspaceMode) return;
  // Guarda cualquier último cambio antes de cambiar de conjunto.
  writeWorkspace();
  activeWorkspaceMode = mode;
  restoreWorkspaceLayout(workspaceLayouts[mode] ?? null);
  requestAnimationFrame(() => { syncWorkspaceRowHeights(); writeWorkspace(); world?.refreshLayout(); });
}
function arrangeWorkspace() {
  restoreWorkspaceLayout(null);
  requestAnimationFrame(() => { syncWorkspaceRowHeights(); writeWorkspace(); world?.refreshLayout(); });
}
function applyWorkspacePreset(preset: DmWorkspacePresetId) {
  const current = captureWorkspace(), layout = createDmWorkspacePreset(activeWorkspaceMode, preset);
  const order = [...layout.order, ...current.order.filter(id => !layout.order.includes(id)), ...[...workspaceWindows.keys()].filter(id => !layout.order.includes(id) && !current.order.includes(id))];
  const windows = { ...current.windows, ...layout.windows };
  // Presets restore minimized windows and clear custom heights so the selected
  // arrangement can reflow around the current screen and each panel's content.
  for (const bounds of Object.values(windows)) delete bounds.height;
  restoreWorkspaceLayout({ closed: current.closed, minimized: [], maximized: [], order, windows });
  requestAnimationFrame(() => { syncWorkspaceRowHeights(); writeWorkspace(); world?.refreshLayout(); });
}
function windowTitle(card: HTMLElement) { return card.querySelector('h2')?.textContent?.trim() || 'Ventana'; }
function openWorkspaceWindow(id: string) {
  if (id === 'connectionPanel') {
    const panel = $('connectionPanel') as HTMLDetailsElement;
    panel.open = true; panel.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    panel.querySelector('summary')?.focus({ preventScroll: true });
    return;
  }
  const card = workspaceWindows.get(id);
  if (!card || card.hidden) { toast('Esta herramienta no está disponible en la escena actual.'); return; }
  card.classList.remove('window-closed', 'window-minimized'); updateMinimizeControl(card); renderClosedWindows();
  syncWorkspaceRowHeights(); writeWorkspace();
  card.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  card.querySelector<HTMLButtonElement>('.window-control')?.focus({ preventScroll: true });
  requestAnimationFrame(() => { writeWorkspace(); world?.refreshLayout(); });
}
function focusEntityOnMap(id: string, cell: Cell, surfaceId: string) {
  clearDraft();world?.clearDmNavigation(); selectedId = null; selectedMapEntityId = id;
  const actor=state?.characters.find(e=>e.id===id)??state?.npcs.find(e=>e.id===id);if(actor)selectedDmActor={id,label:actor.label,kind:state?.characters.some(e=>e.id===id)?'player':'npc'};
  const scene=state?.characters.find(e=>e.id===id)?.sceneId;if(scene&&scene!==state?.sceneId)browseDmScene(scene,cell,surfaceId);
  world?.setSelectedEntity(id); world?.setCameraFocusCell(cell, surfaceId); setMapToolPanel(null);
  openWorkspaceWindow('mapWindow'); if (state) renderObjects(state);
  toast('Ficha seleccionada. Muévela con WASD, un paso por pulsación.');
}
function renderClosedWindows() {
  const list = $('closedWindows'); list.replaceChildren(); const closed = [...workspaceWindows.values()].filter(card => !card.hidden && card.classList.contains('window-closed'));
  if (!closed.length) { const note = document.createElement('p'); note.className = 'note'; note.textContent = 'No hay ventanas cerradas.'; list.append(note); return; }
  for (const card of closed) { const row = document.createElement('div'), title = document.createElement('span'), restore = document.createElement('button'); row.className = 'closed-window'; title.textContent = card.dataset.windowTitle ?? 'Ventana'; restore.textContent = 'Recuperar'; restore.onclick = () => { card.classList.remove('window-closed', 'window-minimized'); updateMinimizeControl(card); setWindowSpan(card, Number(card.style.getPropertyValue('--window-span')) || defaultWindowSpan(card)); renderClosedWindows(); requestAnimationFrame(() => { syncWorkspaceRowHeights(); writeWorkspace(); world?.refreshLayout(); }); }; row.append(title, restore); list.append(row); }
}
function toggleMaximize(card: HTMLElement) {
  card.classList.remove('window-minimized');
  card.classList.toggle('window-maximized');
  updateMinimizeControl(card);
  requestAnimationFrame(() => { syncWorkspaceRowHeights(); writeWorkspace(); world?.refreshLayout(); });
}
function installWorkspaceScrolling(desk: HTMLElement) {
  $('app').addEventListener('wheel', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    const target = event.target instanceof Element ? event.target : null;
    if (!target || target.closest('dialog, .side-controls, select, textarea, input[type="range"]')) return;
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? desk.clientHeight : 1);
    const canScroll = (element: HTMLElement) => element.scrollHeight > element.clientHeight + 1 && (delta < 0 ? element.scrollTop > 0 : element.scrollTop + element.clientHeight < element.scrollHeight - 1);
    for (let parent = target instanceof HTMLElement ? target : target.parentElement; parent && parent !== desk && parent !== $('app'); parent = parent.parentElement) {
      if (/(auto|scroll)/.test(getComputedStyle(parent).overflowY) && canScroll(parent)) return;
    }
    if (canScroll(desk)) { event.preventDefault(); event.stopPropagation(); desk.scrollTop += delta; }
    else if (target.closest('#dmMap')) { event.preventDefault(); event.stopPropagation(); }
  }, { capture: true, passive: false });
}
function installWorkspaceDock() {
  const dock = document.querySelector<HTMLElement>('.dm-dock');
  if (!dock) return;
  const sensor = document.createElement('div'); sensor.className = 'dm-dock-sensor'; sensor.setAttribute('aria-hidden', 'true'); document.body.append(sensor);
  let timer = 0;
  const hide = () => { if (!dock.matches(':hover, :focus-within')) dock.classList.remove('is-visible'); };
  const reveal = () => { clearTimeout(timer); dock.classList.add('is-visible'); timer = window.setTimeout(hide, 2600); };
  sensor.addEventListener('pointerenter', reveal);
  dock.addEventListener('pointerenter', reveal); dock.addEventListener('pointerleave', reveal);
  dock.addEventListener('focusin', reveal); dock.addEventListener('focusout', reveal);
  document.addEventListener('pointermove', event => { if (event.clientY > window.innerHeight - 44) reveal(); }, { passive: true });
  const alerts = new Map<HTMLElement, string>();
  new MutationObserver(() => {
    dock.querySelectorAll<HTMLElement>('[data-open-window]').forEach(button => {
      const signature = button.classList.contains('has-attention') ? `alert:${button.querySelector('small')?.textContent ?? ''}` : '';
      if (signature && signature !== alerts.get(button)) {
        reveal(); button.classList.remove('dock-notify'); void button.offsetWidth; button.classList.add('dock-notify');
        button.addEventListener('animationend', () => button.classList.remove('dock-notify'), { once: true });
      }
      alerts.set(button, signature);
    });
  }).observe(dock, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class'] });
  reveal();
}
function setupWorkspace() {
  const desk = document.querySelector<HTMLElement>('.grid'); if (!desk) return; desk.classList.add('workspace'); workspaceLayouts = readWorkspaceLayouts(); const saved = workspaceLayouts.exploration ?? null, used = new Set<string>();
  let draggedWindow: HTMLElement | null = null;
  const clearDropTargets = () => workspaceWindows.forEach(window => window.classList.remove('drop-target'));
  for (const [index, card] of Array.from(desk.children).entries()) {
    if (!(card instanceof HTMLElement) || !card.matches('section')) continue;
    const base = card.id || windowTitle(card).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `panel-${index}`; let id = base, copy = 2; while (used.has(id)) id = `${base}-${copy++}`; used.add(id);
    card.dataset.windowId = id; card.dataset.windowTitle = windowTitle(card); workspaceWindows.set(id, card); card.classList.add('workspace-window'); card.classList.remove('span'); if (id === 'mapWindow' || card.dataset.windowTitle === 'Jugadores') card.classList.add('window-wide');
    const content = document.createElement('div'); content.className = 'window-content'; content.append(...Array.from(card.childNodes)); const title = document.createElement('h2'); title.className = 'window-title'; title.textContent = card.dataset.windowTitle; const controls = document.createElement('div'); controls.className = 'window-controls';
    const control = (symbol: string, label: string, action: () => void, extra = '', windowAction = '') => { const button = document.createElement('button'); button.type = 'button'; button.className = `window-control ${extra}`; button.textContent = symbol; button.title = label; button.setAttribute('aria-label', label); if (windowAction) button.dataset.windowAction = windowAction; button.onclick = event => { event.stopPropagation(); action(); }; return button; };
    const minimize = control('—', 'Minimizar ventana', () => { card.classList.toggle('window-minimized'); updateMinimizeControl(card); requestAnimationFrame(() => { syncWorkspaceRowHeights(); writeWorkspace(); world?.refreshLayout(); }); }, '', 'minimize');
    controls.append(minimize, control('□', 'Ocupar toda la fila', () => toggleMaximize(card), '', 'maximize'), control('×', 'Cerrar ventana', () => { card.classList.add('window-closed'); renderClosedWindows(); requestAnimationFrame(() => { syncWorkspaceRowHeights(); writeWorkspace(); world?.refreshLayout(); }); }, 'close'));
    const bar = document.createElement('div'); bar.className = 'window-titlebar'; bar.draggable = true; bar.title = 'Arrastra esta barra para recolocar la ventana'; bar.append(title, controls); card.replaceChildren(bar, content); card.querySelector('.window-content h2')?.classList.add('window-original-title');
    const resizeHandle = document.createElement('button'); resizeHandle.type = 'button'; resizeHandle.className = 'window-resize-handle'; resizeHandle.title = 'Redimensionar ventana'; resizeHandle.setAttribute('aria-label', 'Redimensionar ventana'); card.append(resizeHandle);
    resizeHandle.addEventListener('pointerdown', event => {
      if (matchMedia('(max-width: 760px)').matches || card.classList.contains('window-minimized') || card.classList.contains('window-maximized')) return;
      event.preventDefault(); event.stopPropagation(); const start = card.getBoundingClientRect(), startX = event.clientX, startY = event.clientY, pointerId = event.pointerId; card.classList.add('resizing'); resizeHandle.setPointerCapture(pointerId);
      let resizeFrame = 0;
      const applyResize = (next: PointerEvent) => { snapWindowToGrid(card, Math.max(240, start.width + next.clientX - startX)); syncRowHeight(card, Math.max(minimumWindowHeight, start.height + next.clientY - startY)); syncWorkspaceRowHeights(); world?.refreshLayout(); };
      const move = (next: PointerEvent) => { if (next.pointerId !== pointerId) return; cancelAnimationFrame(resizeFrame); resizeFrame = requestAnimationFrame(() => applyResize(next)); };
      const finish = (next: PointerEvent) => { if (next.pointerId !== pointerId) return; cancelAnimationFrame(resizeFrame); if (next.type !== 'pointercancel') applyResize(next); card.classList.remove('resizing'); resizeHandle.removeEventListener('pointermove', move); resizeHandle.removeEventListener('pointerup', finish); resizeHandle.removeEventListener('pointercancel', finish); if (resizeHandle.hasPointerCapture(pointerId)) resizeHandle.releasePointerCapture(pointerId); syncWorkspaceRowHeights(); writeWorkspace(); requestAnimationFrame(() => world?.refreshLayout()); };
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
      if (!draggedWindow || draggedWindow === card) return; event.preventDefault(); const bounds = card.getBoundingClientRect(), nearMiddle = Math.abs(event.clientY - (bounds.top + bounds.height / 2)) < bounds.height * .3, insertAfter = nearMiddle ? event.clientX > bounds.left + bounds.width / 2 : event.clientY > bounds.top + bounds.height / 2; desk.insertBefore(draggedWindow, insertAfter ? card.nextElementSibling : card); clearDropTargets(); syncWorkspaceRowHeights(); writeWorkspace(); requestAnimationFrame(() => world?.refreshLayout());
    });
    if (id === 'mapWindow') new ResizeObserver(() => { if (workspaceReady) requestAnimationFrame(() => world?.refreshLayout()); }).observe(card);
    const bounds = saved?.windows[id]; setWindowSpan(card, bounds?.span ?? defaultWindowSpan(card)); if (bounds?.height) card.style.setProperty('--window-height', `${Math.max(minimumWindowHeight, bounds.height)}px`); if (saved?.closed.includes(id)) card.classList.add('window-closed'); if (saved?.minimized.includes(id)) card.classList.add('window-minimized'); if (saved?.maximized.includes(id)) card.classList.add('window-maximized'); updateMinimizeControl(card);
  }
  const ordered = (saved?.order ?? []).map(id => workspaceWindows.get(id)).filter((card): card is HTMLElement => Boolean(card)); const remaining = [...workspaceWindows.values()].filter(card => !ordered.includes(card)); desk.append(...ordered, ...remaining);
  $('arrangeWorkspace').onclick = arrangeWorkspace; $('resetWorkspace').onclick = () => { localStorage.removeItem(workspaceStorageKey); localStorage.removeItem('dnd-dm-workspace-v11'); localStorage.removeItem('dnd-dm-workspace-v10'); localStorage.removeItem(legacyWorkspaceStorageKey); location.reload(); };
  document.querySelectorAll<HTMLButtonElement>('[data-drawer-tab]').forEach(button => button.onclick = () => { const tab = button.dataset.drawerTab; if (tab === 'windows' || tab === 'ambience' || tab === 'audio' || tab === 'settings') setDrawerTab(tab); });
  document.querySelectorAll<HTMLButtonElement>('[data-workspace-preset]').forEach(button => button.onclick = () => {
    const preset = button.dataset.workspacePreset;
    if (preset === 'map-scene' || preset === 'two-columns' || preset === 'tactical' || preset === 'overview') applyWorkspacePreset(preset);
  });
  const density = $('consoleDensity') as HTMLSelectElement, textSize = $('consoleTextSize') as HTMLSelectElement;
  density.value = dmUiPreferences.consoleDensity ?? 'comfortable'; textSize.value = dmUiPreferences.consoleTextSize ?? 'standard';
  density.onchange = () => {
    if (!dmConsoleDensities.includes(density.value as DmConsoleDensity)) return;
    updateDmUiPreferences('consoleDensity', density.value as DmConsoleDensity); applyConsoleCustomization();
    requestAnimationFrame(() => { syncWorkspaceRowHeights(); writeWorkspace(); world?.refreshLayout(); });
  };
  textSize.onchange = () => {
    if (!dmConsoleTextSizes.includes(textSize.value as DmConsoleTextSize)) return;
    updateDmUiPreferences('consoleTextSize', textSize.value as DmConsoleTextSize); applyConsoleCustomization();
    requestAnimationFrame(syncWorkspaceRowHeights);
  };
  $('resetConsoleSettings').onclick = () => {
    dmUiPreferences = { ...dmUiPreferences, consoleDensity: 'comfortable', consoleTextSize: 'standard' };
    writeUiPreferences(dmUiPreferencesStorageKey, dmUiPreferences); density.value = 'comfortable'; textSize.value = 'standard'; applyConsoleCustomization();
    requestAnimationFrame(() => { syncWorkspaceRowHeights(); writeWorkspace(); world?.refreshLayout(); });
  };
  setDrawerTab(dmUiPreferences.drawerTab, false); renderClosedWindows();
  let reflowFrame = 0;
  const reflow = () => { cancelAnimationFrame(reflowFrame); reflowFrame = requestAnimationFrame(syncWorkspaceRowHeights); };
  new ResizeObserver(reflow).observe(desk);
  new MutationObserver(reflow).observe(desk, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['hidden', 'open'] });
  desk.addEventListener('toggle', reflow, true);
  void document.fonts.ready.then(reflow);
  installWorkspaceScrolling(desk);
  installWorkspaceDock();
  desk.addEventListener('dragover', event => {
    if (!draggedWindow) return;
    event.preventDefault();
    const bounds = desk.getBoundingClientRect();
    if (event.clientY < bounds.top + 60) desk.scrollTop -= 18;
    else if (event.clientY > bounds.bottom - 60) desk.scrollTop += 18;
  });
  document.querySelectorAll<HTMLButtonElement>('[data-open-window]').forEach(button => button.onclick = () => openWorkspaceWindow(button.dataset.openWindow!));
  document.querySelectorAll<HTMLButtonElement>('[data-encounter-tab]').forEach(button => button.onclick = () => {
    const active = button.getAttribute('aria-expanded') !== 'true';
    document.querySelectorAll<HTMLButtonElement>('[data-encounter-tab]').forEach(tab => tab.setAttribute('aria-expanded', String(tab === button && active)));
    document.querySelectorAll<HTMLElement>('[data-encounter-panel]').forEach(panel => panel.hidden = !active || panel.id !== button.dataset.encounterTab);
  });
}
function activateWorkspace() {
  workspaceReady = true;
  if (requestedWorkspaceMode !== activeWorkspaceMode) { switchWorkspaceMode(requestedWorkspaceMode); return; }
  if (!workspaceLayouts[activeWorkspaceMode]) arrangeWorkspace();
  else requestAnimationFrame(() => { syncWorkspaceRowHeights(); writeWorkspace(); world?.refreshLayout(); });
}

function toast(message: string) { const element = $('toast'); element.textContent = message; element.classList.add('show'); clearTimeout(toastTimer); toastTimer = window.setTimeout(() => element.classList.remove('show'), 2600); }
function command(body: Record<string, unknown>) {
  if (!socket?.connected || !runtimeEpoch) { toast('Sin conexión: el cambio no se ha enviado.'); return null; }
  if(state?.tableSceneId&&state.tableSceneId!==state.sceneId&&(String(body.type).startsWith('object:')||['creature','combat:start','resolveInteraction'].includes(String(body.type)))){toast('Comparte esta escena antes de aplicar sus acciones de partida.');return null;}
  const id = commandId();
  const epoch = epochCommands.has(String(body.type)) || String(body.type)==='scene:resolveCheck' || String(body.type).startsWith('combat:') || String(body.type).startsWith('story:') || String(body.type).startsWith('encounter:') ? { sceneEpoch: state?.sceneEpoch } : {};
  const objectVersion = String(body.type).startsWith('object:') || body.type === 'resolveInteraction' ? { objectRevision: state?.objectRevision ?? 0 } : {};
  socket.emit('dm:command', { commandId: id, runtimeEpoch, ...epoch, ...objectVersion, ...body }); return id;
}

let decisionPauseInstalled = false, decisionPauseSequence = 0;
const activeDialogPauseIds = new WeakMap<HTMLDialogElement, string>();
function sendDecisionPause(action: 'open' | 'close', dialogId = `decision-${++decisionPauseSequence}`) {
  if (socket?.connected && runtimeEpoch) command({ type: 'clock:decision', action, dialogId });
  return dialogId;
}
function installDecisionClockPauses() {
  if (decisionPauseInstalled) return;
  decisionPauseInstalled = true;
  const showModal = HTMLDialogElement.prototype.showModal;
  HTMLDialogElement.prototype.showModal = function (...args: Parameters<typeof showModal>) {
    const alreadyOpen = this.open, result = showModal.apply(this, args);
    if (!alreadyOpen && this.open) {
      activeDialogPauseIds.set(this, sendDecisionPause('open'));
      this.addEventListener('close', () => {
        // Escape closes natively, without calling the patched close() method.
        if (this.open) return;
        const id = activeDialogPauseIds.get(this);
        if (id) { activeDialogPauseIds.delete(this); sendDecisionPause('close', id); }
      }, { once: true });
    }
    return result;
  };
  const close = HTMLDialogElement.prototype.close;
  HTMLDialogElement.prototype.close = function (...args: Parameters<typeof close>) {
    const pauseId = activeDialogPauseIds.get(this), result = close.apply(this, args);
    if (pauseId) { activeDialogPauseIds.delete(this); sendDecisionPause('close', pauseId); }
    return result;
  };
  const alert = window.alert.bind(window), confirm = window.confirm.bind(window), prompt = window.prompt.bind(window);
  window.alert = message => { const id = sendDecisionPause('open'); try { alert(message); } finally { sendDecisionPause('close', id); } };
  window.confirm = message => { const id = sendDecisionPause('open'); try { return confirm(message); } finally { sendDecisionPause('close', id); } };
  window.prompt = (message, defaultValue) => { const id = sendDecisionPause('open'); try { return prompt(message, defaultValue); } finally { sendDecisionPause('close', id); } };
}

function renderAnimationAudit(snapshot: WorldSnapshot | null, force = false) { renderD8AnimationAudit(snapshot, state, campaign, world, force); }
function syncAnimationAuditAvailability() { renderAnimationAudit(latestSnapshot, true); }

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
  const title = campaign?.scenes.find(item => item.id === sceneId)?.title ?? select.selectedOptions[0]?.textContent ?? sceneId;
  $('mapSceneButton').textContent = `⌖ ${title}`;
  $('mapSceneButton').title = `${title} · Cambiar de escena`;
}

function renderConnectionStatus() {
  const connected = Boolean(socket?.connected);
  $('serverStatus').textContent = connected ? 'Servidor conectado' : 'Servidor desconectado';
  $('serverBadge').className = `badge dm-${connected ? 'positive' : 'error'}`;
  const players = state?.characters.filter(character => character.connected).length ?? 0;
  $('connectionSummary').textContent = `${players} jugador${players === 1 ? '' : 'es'} conectado${players === 1 ? '' : 's'} · Proyector ${state?.projectorReady ? 'listo' : 'pendiente'} · Servidor ${connected ? 'conectado' : 'desconectado'}`;
}
function connect() {
  socket = io({ auth: { role: 'dm', protocolVersion: PROTOCOL_VERSION, objectModelVersion: OBJECT_MODEL_VERSION } });
  installDecisionClockPauses();
  socket.on('connect', () => { sceneLoadRecovery.reset(); connectionGeneration++;selectedMapEntityId=null;selectedDmActor=null;mapContextMenu.close(); $('socketDot').classList.add('on'); renderConnectionStatus(); readyEpoch = -1; latestSnapshot = null; lastSharedCameraKey = null; clearDraft(); world?.resetConnection(); });
  socket.on('disconnect', () => { sceneLoadRecovery.reset(); connectionGeneration++; $('socketDot').classList.remove('on'); renderConnectionStatus(); readyEpoch = -1; latestSnapshot = null; renderAnimationAudit(null, true); clearDraft(); });
  socket.on('auth:error', (error: { code?: string }) => { if (error.code === 'PROTOCOL_MISMATCH' || error.code === 'DM_AUTH_REQUIRED') { location.reload(); return; } showLogin(); });
  socket.on('runtime:reset', (event: { runtimeEpoch: string; reason?: string }) => {
    sceneLoadRecovery.reset();
    connectionGeneration++;selectedMapEntityId=null;selectedDmActor=null;pendingDmExplore=null;mapContextMenu.close(); runtimeEpoch = event.runtimeEpoch; state = null; latestSnapshot = null; renderAnimationAudit(null, true); readyEpoch = -1; lastSharedCameraKey = null; clearDraft(); world?.resetConnection();
    void fetch('/api/dm/save/status', { cache: 'no-store' }).then(x => x.ok ? x.json() : null).then(next => { if (next?.runtimeEpoch === runtimeEpoch) { saveStatus = next; renderSave(); } });
  });
  socket.on('save:status', (next: SaveStatus) => { if (next.runtimeEpoch === runtimeEpoch) { saveStatus = next; renderSave(); if (next.mode === 'ready' && ($('loadGameDialog') as HTMLDialogElement).open) void renderSaveHistory(); } });
  socket.on('world:snapshot', (snapshot: WorldSnapshot) => { if (snapshot.runtimeEpoch !== runtimeEpoch) return; latestSnapshot = snapshot; renderAnimationAudit(snapshot); void installSnapshot(snapshot); });
  socket.on('dm:state', (next: DmState) => { if (next.runtimeEpoch !== runtimeEpoch) return; if (draftAction && (draftAction.objectRevision !== next.objectRevision || draftAction.sceneEpoch !== next.sceneEpoch || draftAction.connectionGeneration !== connectionGeneration)) clearDraft(); state = next; render(next); });
  socket.on('command:result', (result: CommandResult) => {
    if (result.runtimeEpoch !== runtimeEpoch) return;
    if(result.commandId===pendingPlacementId){pendingPlacementId=null;if(result.ok)toast('Ficha colocada. Puedes deshacer con Ctrl + Z.');}
    const pending = pendingDraftCommand;
    if (!result.ok) {
      toast(`No aplicado: ${friendlyErrorCode(result.code)}`);
      // Restaura de inmediato un botón de audio/efecto que hubiera mostrado
      // optimistamente una acción rechazada por el servidor.
      if (state) { renderAudio(state, true); renderSfx(state); }
    }
    else if (result.code === 'APPLIED' && pending && pending.commandId === result.commandId && pending.generation === connectionGeneration) { clearDraft(); toast('Cambio aplicado.'); }
  });
socket.on('combat:animation', (event: { runtimeEpoch: string; sceneEpoch?: number; bodyState?: string; attackerId: string; targetId: string; type: 'melee' | 'arrow' | 'thrownWeapon' | 'radiantArrow' | 'vine' | 'fireProjectile' | 'magicalProjectile'; hit: boolean; frozen: boolean; sneakAttack?: boolean }) => { if (event.runtimeEpoch === runtimeEpoch && (event.sceneEpoch === undefined || event.sceneEpoch === latestSnapshot?.sceneEpoch)) world?.playRangedAttack(event.attackerId, event.targetId, event.type, event.hit, event.frozen, event.sneakAttack, event.bodyState); });
  socket.on('scene:animation', (event: { runtimeEpoch: string; sceneEpoch: number; entityId: string; state: string; durationMs: number }) => { if (event.runtimeEpoch === runtimeEpoch && event.sceneEpoch === latestSnapshot?.sceneEpoch) world?.playTokenAnimation(event.entityId, event.state, event.durationMs); });
  socket.on('scene:reward',(event:{runtimeEpoch:string;sceneEpoch:number;entityId:string;effect:string})=>{if(event.runtimeEpoch===runtimeEpoch&&event.sceneEpoch===latestSnapshot?.sceneEpoch&&event.effect==='inspiration')world?.playRewardEffect(event.entityId);});
  socket.on('scene:area-effect', (event: { runtimeEpoch: string; sceneEpoch: number; cell: { col: number; row: number }; type: 'fog'; radiusMeters: number; durationMs: number }) => { if (event.runtimeEpoch === runtimeEpoch && event.sceneEpoch === latestSnapshot?.sceneEpoch) world?.playAreaEffect(event.cell, event.type, event.radiusMeters, event.durationMs); });
  socket.on('mirror:transformation', (event: { eventId:string;serverTime:number;runtimeEpoch: string; sceneEpoch: number; propId: string; sourceId: string; reflectionId: string; frames: string[]; durationMs: number }) => { if (event.runtimeEpoch === runtimeEpoch && event.sceneEpoch === latestSnapshot?.sceneEpoch) world?.playMirrorTransformation(event.propId, event.sourceId, event.reflectionId, event.frames, event.durationMs,event); });
}

async function installSnapshot(snapshot: WorldSnapshot) {
  try {
  const installed = await world?.applySnapshot(snapshot);
  if (installed) sceneLoadRecovery.reset();
  if (installed) {
    if(pendingDmExplore?.sceneId===snapshot.sceneId){world?.exploreDmCell(pendingDmExplore.cell,pendingDmExplore.surfaceId);pendingDmExplore=null;}
    updateCameraOrbitControls(snapshot.sceneId);publishCameraOrientation();
  }
  if (installed && socket?.connected && latestSnapshot?.sceneEpoch === snapshot.sceneEpoch && latestSnapshot?.runtimeEpoch === snapshot.runtimeEpoch && readyEpoch !== snapshot.sceneEpoch) { readyEpoch = snapshot.sceneEpoch; socket.emit('scene:ready', { runtimeEpoch, sceneEpoch: snapshot.sceneEpoch }); }
  } catch (error) {
    if (!socket?.connected || snapshot.runtimeEpoch !== runtimeEpoch) return;
    if (sceneLoadRecovery.failed(() => { if (socket?.connected && latestSnapshot?.runtimeEpoch === runtimeEpoch) void installSnapshot(latestSnapshot); })) {
      console.error('No se pudo cargar el mapa DM', error); toast('No se pudo cargar el mapa. Reintentando…');
    }
  }
}

function supportsCameraOrbit(sceneId?: string | null) {
  const scene = campaign?.scenes.find(candidate => candidate.id === sceneId);
  return supportsCameraOrientation(scene);
}
function updateCameraOrbitControls(sceneId = state?.sceneId ?? latestSnapshot?.sceneId) {
  $('cameraOrbitControls').hidden = !supportsCameraOrbit(sceneId);
  const step = world?.getCameraOrientationStep() ?? 0;
  $('cameraOrientationLabel').textContent = cameraOrbitLabel(step);
  ($('cameraTurnLeft') as HTMLButtonElement).disabled = step <= -2;
  ($('cameraTurnRight') as HTMLButtonElement).disabled = step >= 2;
  const tiltProfile=cameraProfileForScene(sceneId??null);
  const tilt = world?.getCameraTiltDegrees() ?? tiltProfile.default;
  $('cameraTiltControls').title=`Inclinación: ${tiltProfile.stops.map(degrees=>`${degrees}°`).join(' / ')}`;
  ($('cameraTiltDown') as HTMLButtonElement).disabled = tilt <= tiltProfile.min;
  ($('cameraTiltUp') as HTMLButtonElement).disabled = tilt >= tiltProfile.max;
  $('cameraTiltValue').textContent = `${Number(tilt.toFixed(1))}°`;
}
function publishCameraOrientation(force = false) {
  const snapshot = latestSnapshot;
  if (!(($('shareCameraOrientation') as HTMLInputElement | null)?.checked) || !socket?.connected || !runtimeEpoch || !snapshot || !supportsCameraOrbit(snapshot.sceneId)) return;
  const step = world?.getCameraOrientationStep() ?? 0, tilt = world?.getCameraTiltDegrees() ?? cameraProfileForScene(snapshot.sceneId).default;
  const frame = world?.getSharedCameraFrame();
  const key = `${snapshot.sceneEpoch}:${snapshot.sceneId}:${step}:${tilt}:${JSON.stringify(frame)}`;
  if (!force && key === lastSharedCameraKey) return;
  socket.emit('camera:orientation', { runtimeEpoch, sceneEpoch: snapshot.sceneEpoch, sceneId: snapshot.sceneId, step, tilt, frame, profile: CAMERA_ORBIT_PROFILE });
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
const verticalCameraControl=cameraTiltControl(
  ()=>world?.getCameraTiltDegrees()??25,
  degrees=>{world?.setCameraTiltDegrees(degrees);updateCameraOrbitControls();publishCameraOrientation();},
  ()=>cameraProfileForScene(state?.sceneId??latestSnapshot?.sceneId??null)
);

addEventListener('keyup',event=>{if(['r','f'].includes(event.key.toLowerCase()))verticalCameraControl.end();});

function showLogin(message = '') { $('login').hidden = false; $('app').hidden = true; $('loginError').textContent = message; }
const campUpdatesStorageKey = 'dnd-camp-rests-updates-v1.4.8-seen';
function hasCampRestModule() {
  return campaign?.scenes.some(scene => scene.id === 'camp-a1-rooms');
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
    campaign = await loadCampaign(); syncAnimationAuditAvailability(); populateCampaign(); ($('showGrid') as HTMLInputElement).checked = dmUiPreferences.showGrid; ($('shareCameraOrientation') as HTMLInputElement).checked = dmUiPreferences.shareCameraOrientation; syncDmGridSettings(); world = new WorldRenderer($('dmMap'), campaign, { cameraRole: 'dm', persistCameraPreferences: true, showGrid: dmUiPreferences.showGrid, gridStyle: dmUiPreferences.gridStyle }); (window as any).world = world; world.setMapClick(onMapClick);world.setDmMapInteraction({canPan:()=>!selectedMapEntityId&&!selectedId&&!draft&&!armedDmCombatPoint,singleClick:()=>Boolean(draft||armedDmCombatPoint),context:openDmMapContext});await loadInfo();
    world.setCameraTiltChangeHandler(() => { updateCameraOrbitControls(); publishCameraOrientation(); });
    world.setCameraFrameChangeHandler(() => publishCameraOrientation());
    mapTargets = new DmMapTargets($('dmMap'));
    objectRosette = new DmObjectRosette($('dmMap'), () => Array.from($(rosetteSource).querySelectorAll<HTMLButtonElement>('button')));
  } catch (error) { console.error('Error al preparar la vista DM', error); showLogin('No se pudo cargar la campaña. Recarga la página.'); return; }
  $('login').hidden = true; $('app').hidden = false; setSideControlsOpen(dmUiPreferences.sideControlsOpen, false, false); showCampUpdatesIfNeeded(); requestAnimationFrame(activateWorkspace); connect(); void renderSaveHistory();
}
$('loginForm').onsubmit = event => { event.preventDefault(); void beginDm(($('password') as HTMLInputElement).value); };

function render(current: DmState) {
  renderAnimationAudit(latestSnapshot);
  switchWorkspaceMode(current.combat.active ? 'combat' : 'exploration');
  $('app').classList.toggle('combat-mode', current.combat.active);
  const timeOfDayButton = $('timeOfDayToggle') as HTMLButtonElement;
  timeOfDayButton.hidden = true;
  $('timeOfDaySection').hidden = true;
  const isNight = lightPhaseLabel(current.environment,current.gameClock.seconds)==='Noche';
  $('timeOfDayIcon').textContent = isNight ? '☀' : '☾'; $('timeOfDayLabel').textContent = isNight ? 'Pasar a día' : 'Pasar a noche';
  timeOfDayButton.setAttribute('aria-pressed', String(isNight));
  timeOfDayButton.title = isNight ? 'La escena está de noche. Cambiar a día.' : 'La escena está de día. Cambiar a noche.';
  $('campaignTitle').textContent = current.campaignTitle; $('creatureNote').textContent = current.privateNotes.creature; $('wheelNote').textContent = current.privateNotes.wheel;
  $('headerScene').textContent = (current.tableSceneId&&current.tableSceneId!==current.sceneId?'Privado · ':'')+(campaign?.scenes.find(scene => scene.id === current.sceneId)?.title ?? current.sceneId);
  $('headerCombat').textContent = current.combat.active ? current.combat.initiativePending ? '⚔ Iniciativa pendiente' : `⚔ Combate · ronda ${current.combat.round}` : '◎ Exploración';
  $('headerCombat').className = `dm-chip dm-${current.combat.active ? 'pending' : 'info'}`;
  const pendingCount = current.interactions.filter(request => request.status === 'pending').length;
  $('headerRequests').textContent = pendingCount ? `${pendingCount} solicitud${pendingCount === 1 ? '' : 'es'} pendiente${pendingCount === 1 ? '' : 's'}` : 'Sin solicitudes';
  $('headerRequests').className = `dm-chip dm-${pendingCount ? 'pending' : 'info'}`;
  $('dockRequests').textContent = String(pendingCount);
  $('interacciones').classList.toggle('has-attention', pendingCount > 0);
  renderConnectionStatus();
  const isPrivatePreview = Boolean(current.tableSceneId && current.tableSceneId !== current.sceneId);
  const moveToCurrentScene = $('moveToCurrentScene') as HTMLButtonElement | null;
  if (moveToCurrentScene) moveToCurrentScene.hidden = !isPrivatePreview;
  selectCurrentScene(current.sceneId); ($('camera') as HTMLSelectElement).value = current.camera.mode; renderFocus(current); updateCameraOrbitControls(current.sceneId);
  $('storm').textContent = current.environment.storm ? 'ϟ Detener' : 'ϟ Activar';
  $('storm').setAttribute('aria-pressed', String(current.environment.storm));
  const phaseNames={auto:'Ambiente de escena',day:'Mediodía',sunset:'Atardecer',night:'Noche',dawn:'Madrugada'};
  const precipitation=current.environment.precipitation??(current.environment.storm?'rain':'none');
  for(const [id,value] of Object.entries({weatherTime:current.environment.timeOfDay??'auto',weatherKind:current.environment.precipitation??(current.environment.storm?'rain':'none'),weatherLevel:String(current.environment.precipitationLevel??2),weatherWind:String(current.environment.windIntensity??0),weatherTemperature:String(current.environment.temperatureC??0),weatherFog:String(current.environment.fogTarget??0),weatherFlood:String(current.environment.floodTarget??0),weatherSea:String(seaState(current.environment,current.sceneId==='camp-wreck-beach'?.8:current.sceneId==='camp-coastal-refuge'?.22:.35))})){
    const input=$(id) as HTMLInputElement;if(!input.matches(':focus'))input.value=value;
  }
  const difficult = $('snowDifficultTerrain') as HTMLInputElement; if (!difficult.matches(':focus')) difficult.checked = Boolean(current.environment.snowDifficultTerrain);
  $('weatherTemperatureValue').textContent = `${current.environment.temperatureC ?? 0} °C`;
  $('weatherFogValue').textContent = `${Math.round((current.environment.fogTarget ?? 0) * 100)}%`;
  $('weatherFloodValue').textContent = `${Math.round((current.environment.floodTarget ?? 0) * 100)}%`;
  const stormIntensity = $('stormIntensity') as HTMLInputElement;
  if (!stormIntensity.matches(':focus')) stormIntensity.value = String(current.environment.stormIntensity);
  $('stormIntensityValue').textContent = `${Math.round(current.environment.stormIntensity * 100)}%`;
  const weatherTime = current.environment.timeOfDay ?? 'auto';
  document.querySelectorAll<HTMLButtonElement>('[data-weather-time]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.weatherTime === weatherTime)));
  document.querySelectorAll<HTMLButtonElement>('[data-weather-kind]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.weatherKind === precipitation)));
  $('weatherLevelValue').textContent = ['Suave', 'Media', 'Intensa'][Number(($('weatherLevel') as HTMLInputElement).value) - 1] ?? 'Media';
  const wind = Math.round(Number(($('weatherWind') as HTMLInputElement).value) * 100);
  $('weatherWindValue').textContent = `${wind}%`;
  $('weatherVisualIcon').textContent = weatherMode(current.environment) === 'tempest' ? '〰' : current.environment.storm ? 'ϟ' : precipitation === 'snow' ? '❄' : precipitation === 'rain' ? '☂' : isNight ? '☾' : '☀';
  $('weatherVisualTitle').textContent = lightPhaseLabel(current.environment,gameClockAt(current.gameClock,dmServerClock.now(Date.now())));
  $('weatherSeaCard').hidden=current.sceneId==='camp-forest-pleamar'||!current.sceneId.startsWith('camp-');
  $('weatherSeaValue').textContent=seaStateLabel(Number(($('weatherSea') as HTMLInputElement).value));
  $('weatherSeaAuto').setAttribute('aria-pressed',String(current.environment.seaIntensity===undefined));
  ($('weatherRulesEnabled') as HTMLInputElement).checked=Boolean(current.environment.weatherRules);
  ($('weatherKind') as HTMLSelectElement).value = weatherMode(current.environment);
  $('weatherModeHint').textContent = weatherDescription(current.environment);
  $('weatherLevel').closest<HTMLElement>('.climate-icon-section')!.hidden = weatherMode(current.environment) === 'clear';
  $('weatherVisualStatus').textContent = `${weatherModeLabels[weatherMode(current.environment)]} · ${wind ? `Viento ${wind}%` : 'Sin viento'}`;
  $('weatherVisual').dataset.weather = current.environment.storm ? 'storm' : isNight ? 'night' : precipitation;
  climateIcons.update();
  renderGameClock(current);
  const encounter = $('encounterCard'); encounter.hidden = !current.creature || current.sceneId !== current.creature.sceneId;
  if (current.creature) {
    $('creatureSummary').replaceChildren(...chips([current.creature.label, [current.creature.visible ? 'Visible' : 'Oculta', current.creature.visible ? 'positive' : 'info'], `PG ${current.creature.hp}/${current.creature.maxHp}`, `Casilla ${current.creature.cell.col},${current.creature.cell.row}`]).childNodes);
    $('creature').textContent = current.creature.visible ? `Ocultar ${current.creature.label}` : `Revelar ${current.creature.label}`;
    if (!($('harpyCol') as HTMLInputElement).matches(':focus')) ($('harpyCol') as HTMLInputElement).value = String(current.creature.cell.col);
    if (!($('harpyRow') as HTMLInputElement).matches(':focus')) ($('harpyRow') as HTMLInputElement).value = String(current.creature.cell.row);
  }
  $('wheelCard').hidden = !current.objects.some(object => object.kind === 'wheel');
  $('projectorDot').classList.toggle('on', current.projectorReady); $('projectorStatus').textContent = current.projectorReady ? 'Proyector conectado' : 'Proyector sin preparar';
  $('projectorStatus').textContent = current.projectorReady ? 'Proyector listo' : 'Proyector pendiente';
  $('projectorBadge').className = `badge dm-${current.projectorReady ? 'positive' : 'pending'}`;
  renderMonsterSheet(current); renderPlayers(current); renderNpcs(current); renderCombat(current); renderExploration(current); renderObjects(current); renderAudio(current); renderSfx(current); renderRequests(current); renderCampRest(current);
  refreshSheetConditions(current);
  requestAnimationFrame(() => syncWorkspaceRowHeights());
  if (rosetteSource === 'campPointActions' && objectRosette?.isOpen) {
    const point = campRosetteSelection?.sceneId === current.sceneId ? currentScene()?.camp?.interactionPoints.find(candidate => candidate.id === campRosetteSelection?.pointId) : null;
    if (point) { configureCampRosette(point, current.sceneId); objectRosette.refresh(); }
    else objectRosette.close();
  }
  // Availability follows the current render, not the previous scene/mode.
  document.querySelectorAll<HTMLElement>('[data-open-window]').forEach(button => {
    const id = button.dataset.openWindow!; button.classList.toggle('has-attention', id === 'interacciones' && pendingCount > 0 || id === 'combatCard' && Boolean(current.combat.prompt) || id === 'connectionPanel' && ['error', 'recovery', 'incompatible'].includes(saveStatus?.mode ?? ''));
    button.setAttribute('aria-current', String(id === (current.combat.active ? 'combatCard' : 'explorationCard')));
    if (button instanceof HTMLButtonElement) button.disabled = Boolean(workspaceWindows.get(id)?.hidden);
  });
}

function renderGameClock(current: DmState) {
  dmServerClock.observe(current.gameClock.serverTime, Date.now());
  const seconds = gameClockAt(current.gameClock, dmServerClock.now(Date.now()));
  $('gameClockValue').textContent = formatGameClock(seconds).text;
  const pause = $('clockPauseToggle') as HTMLButtonElement;
  if (current.combat.active) { pause.textContent = 'En combate'; pause.disabled = true; $('gameClockMode').textContent = 'El reloj está detenido · avanza 6 segundos al cerrar cada asalto.'; }
  else if (current.gameClock.pauseReason === 'decision') { pause.textContent = 'Pausa de decisión'; pause.disabled = true; $('gameClockMode').textContent = 'El reloj se reanuda al cerrar el diálogo del DM.'; }
  else if (current.gameClock.pauseReason === 'dm') { pause.textContent = 'Reanudar'; pause.disabled = false; $('gameClockMode').textContent = 'Pausado por el DM.'; }
  else { pause.textContent = 'Pausar'; pause.disabled = false; $('gameClockMode').textContent = 'Exploración · 1 segundo real = 1 segundo de juego.'; }
  const restInProgress = Boolean(current.combat.active || current.campRest?.phase && !current.campRest.outcome);
  ($('clockShortRest') as HTMLButtonElement).disabled = restInProgress;
  ($('clockLongRest') as HTMLButtonElement).disabled = restInProgress;
  const climate = advanceClimate(current.climate, current.environment, seconds);
  ($('weatherTime') as HTMLSelectElement).value = clockTimeSelection(current.environment, seconds);
  climateIcons.update();
  if (weatherMode(current.environment) === 'snow') $('weatherModeHint').textContent = `${weatherDescription(current.environment)} Cobertura ${Math.round(climate.snowCoverage * 100)}% · ${climate.snowDepthCm.toFixed(1)} cm.`;
  $('climateReadout').textContent=climateSummary(current.environment,climate,current.sceneId.startsWith('camp-')&&current.sceneId!=='camp-forest-pleamar');
  renderWeatherRules($('weatherRules'),current.environment,climate,current.sceneId.startsWith('camp-')&&current.sceneId!=='camp-forest-pleamar');
  const routes = current.ports.filter(port => port.travelSeconds && port.travelSeconds > 0);
  const routeRow = $('clockTravelRow'); routeRow.hidden = routes.length === 0;
  const select = $('clockTravelRoute') as HTMLSelectElement, selected = select.value;
  if (JSON.stringify(routes.map(route => route.id)) !== JSON.stringify(Array.from(select.options).map(option => option.value))) {
    select.replaceChildren(...routes.map(route => { const option = document.createElement('option'); option.value = route.id; const duration = Math.round((route.travelSeconds ?? 0) / 60); option.textContent = `${route.from.zoneId} → ${route.to.zoneId} · ${duration} min`; return option; }));
    if (routes.some(route => route.id === selected)) select.value = selected;
  }
}

const restPhaseLabels: Record<string, string> = { arrival: 'Llegada', dusk: 'Anochecer', night: 'Noche', dawn: 'Amanecer', finalization: 'Finalización' };
const campPointKindLabels: Record<CampPoint['kind'], string> = { bed: 'Cama', tent: 'Tienda', fire: 'Hoguera', seat: 'Asiento', guard: 'Puesto de guardia', chest: 'Baúl', personal: 'Objeto personal' };

function syncCampInteractionMode(isCamp: boolean) {
  const button = $('campInteractionToggle') as HTMLButtonElement;
  button.hidden = true;
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

function showCampPoint(point: CampPoint, sceneId: string, showDialog = true) {
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
  const reachable = latestSnapshot?.entities.filter(entity => entity.kind === 'player' && entity.surfaceId === point.surfaceId && !entity.step && !entity.moving
    && entity.hp !== 0 && !entity.defeated && !entity.conditions?.some(condition => ['inconsciente', 'paralizada'].includes(condition))
    && (!point.ownerCharacterId || point.ownerCharacterId === entity.id)
    && campPointInReach(entity, point)) ?? [];
  const actorSelect = $('campPointActor') as HTMLSelectElement;
  actorSelect.replaceChildren(...reachable.map(entity => new Option(entity.label, entity.id)));
  if (reachable.some(entity => entity.id === selectedMapEntityId)) actorSelect.value = selectedMapEntityId!;
  $('campPointActorHint').textContent = reachable.length ? 'Ejecutar con un personaje presente y próximo al objeto:' : 'No hay un personaje cercano que pueda actuar. Acércalo para probar este objeto.';
  actorSelect.hidden = reachable.length === 0;
  actions.replaceChildren(...activitiesForCampPoint(point).map(activity => {
    const item = document.createElement('li'), button = document.createElement('button'); button.type = 'button';
    button.textContent = activity.label; button.dataset.campActivity = activity.id; button.disabled = !reachable.length || Boolean(latestSnapshot?.combat.active);
    button.title = `${activity.guidance}${latestSnapshot?.combat.active ? ' No disponible durante el combate.' : !reachable.length ? ' Acerca un personaje al objeto para realizar esta acción.' : ''}`;
    button.onclick = () => { command({ type: 'camp:interact', characterId: actorSelect.value, pointId: point.id, activityId: activity.id }); dialog.close(); };
    item.append(button); return item;
  }));
  const rest = state?.campActivity?.sceneId === sceneId ? state.campActivity : state?.campRest?.sceneId === sceneId ? state.campRest : null;
  const entries = (rest?.interactions ?? []).filter(item => item.pointId === point.id).slice(-5).reverse();
  history.replaceChildren(...entries.map(entry => {
    const item = document.createElement('li');
    const verb = entry.action === 'opened' ? 'abrió' : entry.action === 'closed' ? 'cerró' : 'usó';
    item.textContent = `${entry.characterLabel} · ${entry.activityId ? campActivities[entry.activityId].label : verb} · ${new Date(entry.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    return item;
  }));
  $('campPointHistorySection').hidden = entries.length === 0;
  if (showDialog && !dialog.open) dialog.showModal();
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
  status.textContent = restElsewhere ? `Descanso pendiente en «${campaign?.scenes.find(item => item.id === current.campRest!.sceneId)?.title ?? current.campRest!.sceneId}». Cambiar de mapa no lo finaliza. Puedes usar los objetos de este campamento; para iniciar otro descanso, termina primero el anterior.`
    : !rest || rest.phase === null ? 'No hay descanso preparado.' : `${restPhaseLabels[rest.phase] ?? rest.phase}${rest.paused ? ' · Interrumpido; la fase está en pausa.' : ''}${rest.outcome ? ` · El DM decidió: ${rest.outcome === 'completed' ? 'completado' : 'no completado'}.` : ''}`;
  actions.replaceChildren();
  if (restElsewhere) actions.append(localButton('↩ Volver al descanso pendiente', () => command({ type: 'scene', sceneId: current.campRest!.sceneId })));
  const addAction = (label: string, action: string, disabled = false, extra: Record<string, unknown> = {}, style = '') => {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = label; button.disabled = disabled; if (style) button.className = style;
    button.onclick = () => command({ type: 'camp:rest', action, sceneId: scene.id, ...extra }); actions.append(button); return button;
  };
  const activeElsewhere = Boolean(current.campRest && current.campRest.sceneId !== scene.id && current.campRest.phase !== null && current.campRest.phase !== 'finalization');
  if (!rest || rest.phase === null || rest.phase === 'finalization') {
    addAction('Preparar descanso', 'prepare', activeElsewhere, {}, 'primary');
  }
  else if (rest.paused) {
    addAction('Reanudar', 'resume', false, {}, 'primary');
  }
  else if (rest.phase === 'dawn') {
    addAction('Confirmar descanso completado', 'finalize', false, { completed: true }, 'primary');
    addAction('Finalizar sin completarlo', 'finalize', false, { completed: false }, 'danger');
  } else {
    addAction(`Avanzar: ${restPhaseLabels[rest.phase === 'arrival' ? 'dusk' : rest.phase === 'dusk' ? 'night' : 'dawn']}`, 'advance', false, {}, 'primary');
  }
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
  for (const item of (current.campActivity?.interactions ?? rest?.interactions ?? [])) entries.push({ at: item.at, text: `${item.characterLabel} · ${item.action === 'opened' ? 'abrió' : item.action === 'closed' ? 'cerró' : 'usó'} · ${item.pointLabel}` });
  if (rest) {
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
  const card = $('explorationCard'), box = $('exploration'); card.hidden = current.combat.active;
  preserveDisclosures(box, `exploration:${current.sceneId}`);
  queueMicrotask(() => sectionDeck(box, `scene-${current.sceneId}`));
  if (current.adventure) {
    const key = JSON.stringify([current.runtimeEpoch, current.sceneEpoch, current.sceneId, current.combat.active, current.adventure, current.encounterGroups, current.lastExplorationAction, current.objects.map(object => [object.id, object.label]), current.characters.map(character => [character.id, character.claimed, character.sceneId]), current.npcs.map(npc => [npc.id, npc.visible]), current.creature && [current.creature.id, current.creature.visible, current.creature.sceneId]]);
    if (box.dataset.renderKey === key) return;
    box.dataset.renderKey = key;
  }
  box.replaceChildren();
  const actionRequest = current.lastExplorationAction;
  if (actionRequest?.sceneId === current.sceneId) {
    const request = document.createElement('section'), title = document.createElement('b'), action = document.createElement('p'), guidance = document.createElement('p');
    request.className = 'exploration-action-request'; title.textContent = `Petición de ${actionRequest.characterLabel} · ${actionRequest.actionLabel}`;
    action.textContent = actionRequest.action === 'jump'
      ? `Destino propuesto: ${actionRequest.targetLabel}. Comprueba carrera, distancia, movimiento disponible, obstáculo y aterrizaje; la ficha no se traslada automáticamente.`
      : `Objetivo: ${actionRequest.targetLabel}. Resuelve la tirada/resultado con la ficha y la situación; no se ha aplicado automáticamente.`;
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
    eventCheck('wreck.cofa-free-climb', 'Omitir Atletismo CD 10 para subir a la cofa (adaptación opcional; por defecto se pide la tirada)');
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

    const present = sceneBlock('PRESENTES', current.characters.filter(character => character.claimed && character.sceneId === current.sceneId).map(character => character.label));
    const objective = document.createElement('p'); objective.className = 'dm-scene-objective'; objective.textContent = 'Explorar el pecio y resolver su maldición.';
    const objects = sceneObjectAccess(current);
    box.append(title, objective, present, objects, arrivalDetails, eventDetails, lootDetails, endingDetails); return;
  }
  if (current.sceneId === 'dragon-rest') {
    const title = document.createElement('b'); title.textContent = 'Retiro del Dragón · puerto y desenlace del Pecio';
    const openingDetails = document.createElement('details'), openingSummary = document.createElement('summary'); openingSummary.textContent = 'Llegada a la isla · gancho del capítulo 3'; openingDetails.append(openingSummary);
    const opening = document.createElement('p'); opening.textContent = 'Después del encuentro de zombis en la playa, Runara puede explicar que Varnoth y Rix avistaron un naufragio reciente al norte y sospecha que los restos ocultan un barco mucho más antiguo: el Rosa de los Vientos. Ofréceles investigar el Pecio o ir antes a las Cuevas de Pleamar; la aventura permite que el grupo elija el orden.';
    const boat = document.createElement('p'); boat.textContent = 'Para ir al Pecio, prepara la barca del puerto: son unos 4 km (aprox. 1 h 40 min). Allí pueden amarrar a la jarcia caída de estribor y trepar a C1 —la vía normal, fácil y sin prueba forzada— o nadar hasta la brecha de popa y entrar por C9. En combate, trepar o nadar cuesta el doble de movimiento salvo que tengan la velocidad especial adecuada; pide Atletismo solo si la situación concreta lo dificulta. El viaje y el momento de salida los confirma el DM.';
    openingDetails.append(opening, boat);
    const objective = document.createElement('p'); objective.textContent = `La barca cubre unos 4 km en aproximadamente 1 h 40 min. La vía normal es trepar desde la barca por la jarcia caída hasta C1; la alternativa peligrosa es nadar por la brecha de popa hasta C9. Llegada registrada: ${current.progress['wreck.boat-arrived'] ? 'sí' : 'no'} · ya abordaron: ${current.progress['wreck.boarded'] ? 'sí' : 'no'}.`;
    const present = sceneBlock('PRESENTES', current.characters.filter(character => character.claimed && character.sceneId === current.sceneId).map(character => character.label));
    const shortObjective = document.createElement('p'); shortObjective.className = 'dm-scene-objective'; shortObjective.textContent = 'Preparar el viaje y resolver el desenlace del Pecio.';
    openingDetails.append(objective); box.append(title, shortObjective, present, openingDetails, wreckChapterEnding(current)); return;
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
  const currentObjective = current.adventure?.objectives.find(objective => objective.sceneId === current.sceneId);
  if (currentObjective) scene.objective = `${currentObjective.label} · ${currentObjective.complete ? '✓ completado' : 'pendiente'}`;
  const title = document.createElement('b'); title.textContent = campaign?.scenes.find(candidate => candidate.id === current.sceneId)?.title ?? scene.relevant; const objective = document.createElement('p'); objective.className = 'dm-scene-objective'; objective.textContent = scene.objective;
  const sceneGuidance = document.createElement('details'), guidanceSummary = document.createElement('summary'); guidanceSummary.textContent = 'Guía de esta escena · solo DM'; sceneGuidance.append(guidanceSummary);
  for (const text of current.adventure?.sceneGuidance[current.sceneId] ?? []) { const paragraph = document.createElement('p'); paragraph.className = 'note'; paragraph.textContent = text; sceneGuidance.append(paragraph); }
  const siteCues=new Set(campaign?.scenes.find(s=>s.id===current.sceneId)?.stageActors?.filter(a=>a.interactionOnly).map(a=>a.id));
  const presentNames = [...current.characters.filter(character => character.claimed && character.sceneId === current.sceneId).map(character => character.label), ...current.npcs.filter(npc => npc.visible&&!siteCues.has(npc.id)).map(npc => npc.label), ...(current.creature?.visible && current.creature.sceneId === current.sceneId ? [current.creature.label] : [])];
  const present = sceneBlock('PRESENTES', presentNames);
  const seatCount=campaign?.scenes.find(scene=>scene.id===current.sceneId)?.seats?.length??0;
  const interactables = sceneObjectAccess(current, seatCount ? [`${seatCount} asientos`] : []);
  const progress = document.createElement('details'), summary = document.createElement('summary'); summary.textContent = 'Progreso D8 Night'; progress.append(summary);
  for (const group of current.encounterGroups?.filter(group => group.sceneId === current.sceneId) ?? []) {
    const row = document.createElement('div'), select = document.createElement('select'), reveal = document.createElement('button');
    for (let count = 0; count <= group.maximum; count++) { const option = document.createElement('option'); option.value = String(count); option.textContent = String(count); select.append(option); }
    select.value = String(group.visibleCount); reveal.textContent = group.label; reveal.onclick = () => command({ type: 'encounter:reveal', groupId: group.id, count: Number(select.value) }); row.append(select, reveal); box.append(row);
  }
  if (current.adventure) {
    for (const goal of current.adventure.objectives) {
      const row = document.createElement('section'), label = document.createElement('p'), select = document.createElement('select'), save = document.createElement('button');
      label.textContent = `${goal.complete ? '✓' : '○'} ${goal.item}${goal.note ? ` · ${goal.note}` : ''}`;
      const empty = document.createElement('option'); empty.value = ''; empty.textContent = goal.complete && !goal.choice ? 'Guardado antiguo · elige el resultado' : 'Pendiente'; select.append(empty);
      for (const choice of goal.choices) { const option = document.createElement('option'); option.value = choice.id; option.textContent = choice.label; select.append(option); }
      select.value = goal.choice?.id ?? ''; save.textContent = 'Registrar resultado';
      save.onclick = () => {
        const override = Boolean(select.value && !goal.available);
        if (override && !confirm('El espejo debe ser la última prueba. ¿Registrar una excepción del DM?')) return;
        const note = prompt(override ? 'Explica la excepción (obligatorio):' : 'Nota de la decisión (opcional):', goal.note);
        if (note === null || override && !note.trim()) return;
        command({ type: 'story:choice', objectiveId: goal.id, choiceId: select.value || null, note, override });
      };
      row.append(label, select, save); progress.append(row);
    }
    const score = document.createElement('p'); score.textContent = current.adventure.endings.map(ending => `${ending.label}: ${ending.score}`).join(' · '); progress.append(score);
    const held = document.createElement('p'); held.textContent = `Objetos de misión: ${current.adventure.inventory.join(', ') || 'ninguno'}`; progress.append(held);
    for (const ending of current.adventure.endings) {
      const button = document.createElement('button'); button.textContent = `${ending.selected ? '✓ ' : ''}${ending.label}`;
      button.onclick = () => {
        const override = !current.adventure!.complete || !current.adventure!.candidates.includes(ending.id);
        if (override && !confirm('Este final no corresponde al progreso/puntuación actual. ¿Aplicar excepción del DM (por ejemplo rechazo de la misión)?')) return;
        const reason = prompt('Motivo del final (obligatorio en empate o excepción):', ending.reason);
        if (reason === null) return;
        command({ type: 'story:ending', endingId: ending.id, reason, override });
      }; progress.append(button);
    }
    const back = document.createElement('button'); back.textContent = 'Volver al templo'; back.onclick = () => command({ type: 'scene', sceneId: 'temple' });
    const inventory = document.createElement('p'); inventory.className = 'note'; inventory.textContent = `Componentes: ${current.adventure.inventory.length}/4. El DM registra el resultado tras abandonar cada lugar; después vuelve al templo. El espejo es la última prueba.`;
    progress.append(inventory, back);
  }
  const currentDefinition = campaign?.scenes.find(candidate => candidate.id === current.sceneId);
  const stageActors = current.progress['wreck.curse-day-after'] && current.sceneId === 'wreck-ship' ? [] : currentDefinition?.stageActors?.filter(a=>!a.interactionOnly) ?? [];
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
    box.append(title, objective, present, interactables, sceneGuidance, progress, cues); return;
  }
  box.append(title, objective, present, interactables, sceneGuidance, progress);
}

function renderFocus(current: DmState) {
  const select = $('focus') as HTMLSelectElement; const previous = current.camera.focusId ?? ''; const options: Array<[string, string]> = [['', 'Centro del mapa'], ...current.characters.map(character => [character.id, character.label] as [string, string])];
  if (current.creature?.visible) options.push([current.creature.id, current.creature.label]);
  select.replaceChildren(...options.map(([value, label]) => { const option = document.createElement('option'); option.value = value; option.textContent = label; return option; })); select.value = previous;
  $('cameraFocusChoices').replaceChildren(...options.map(([value, label]) => {
    const button = document.createElement('button'); button.type = 'button'; button.setAttribute('aria-pressed', String(value === previous));
    const actor = current.characters.find(character => character.id === value), token = campaign?.tokens[actor?.tokenId ?? value];
    if (token?.portraitUrl || token?.url) { const image = document.createElement('img'); image.src = token.portraitUrl ?? token.url; image.alt = ''; image.draggable = false; button.append(image); }
    else { const icon = document.createElement('span'); icon.textContent = value ? '◎' : '⌖'; icon.setAttribute('aria-hidden', 'true'); button.append(icon); }
    button.append(label); button.onclick = () => { select.value = value; select.dispatchEvent(new Event('change')); }; return button;
  }));
  document.querySelectorAll<HTMLButtonElement>('[data-camera-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.cameraMode === current.camera.mode)));
}

function currentScene() { return campaign?.scenes.find(scene => scene.id === state?.sceneId) ?? null; }
function objectCells(object: DmObject) { return footprintFor(object.cell, object.rotation, object.footprint); }
function projectDmObject(id: string) {
  const object = state?.objects.find(candidate => candidate.id === id);
  if (!object) return null;
  const cells = objectCells(object);
  const cell = object.kind === 'wheel' ? object.cell : { col: (Math.min(...cells.map(item => item.col)) + Math.max(...cells.map(item => item.col))) / 2, row: (Math.min(...cells.map(item => item.row)) + Math.max(...cells.map(item => item.row))) / 2 };
  return world?.mapCellScreenPoint(cell, object.surfaceId) ?? null;
}
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

function selectObject(id: string | null, edit = false) {
  inspectedPickupId = null;
  selectedMapEntityId = null;selectedDmActor=null; world?.setSelectedEntity(null);
  selectedId = id; const object = state?.objects.find(item => item.id === id) ?? null;
  draft = edit && object && object.structure !== 'destroyed' && (object.kind === 'crate' || (object.kind === 'wheel' && object.attachment === 'detached')) ? structuredClone(object) : null;
  draftAction = draft && state ? { type: 'transform', objectRevision: state.objectRevision, sceneEpoch: state.sceneEpoch, connectionGeneration } : null;
  renderObjects(state!);
  if (edit) objectRosette?.close();
}
function startWheelDraft(object: Extract<DmObject, { kind: 'wheel' }>, outcome: 'caught' | 'fallen', requestId?: string) {
  inspectedPickupId = null; setMapToolPanel(null);
  selectedId = object.id; draft = structuredClone(object); draft.attachment = 'detached'; draft.state = outcome; draft.cell = { col: object.mount.cell.col + 1, row: object.mount.cell.row };
  draftAction = { type: 'detach', outcome, requestId, objectRevision: state!.objectRevision, sceneEpoch: state!.sceneEpoch, connectionGeneration }; renderObjects(state!);
}

function startStructureDraft(object: DmObject, structure: 'damaged' | 'destroyed') {
  inspectedPickupId = null; setMapToolPanel(null);
  selectedId = object.id; draft = structuredClone(object); draft.structure = structure;
  draftAction = { type: 'structure', structure, objectRevision: state!.objectRevision, sceneEpoch: state!.sceneEpoch, connectionGeneration }; renderObjects(state!);
}

function browseDmScene(sceneId:string,cell?:Cell,surfaceId?:string){
  if(!socket?.connected||!runtimeEpoch)return;
  mapContextMenu.close();selectedId=null;clearDraft();objectRosette?.close();
  if(cell&&surfaceId)pendingDmExplore={sceneId,cell,surfaceId};
  if(($('shareCameraOrientation') as HTMLInputElement).checked)command({type:'view:focus',sceneId});
  socket.emit('dm:view',{runtimeEpoch,sceneId});
}
function openDmMapContext(hit:DmMapHit,x:number,y:number){
  if(!state||!latestSnapshot||latestSnapshot.sceneId!==state.sceneId||world?.getDisplayedSceneId()!==state.sceneId)return;
  const epoch=state.sceneEpoch,sceneId=state.sceneId,runtime=runtimeEpoch;
  const actor=selectedMapEntityId?(latestSnapshot.entities.find(e=>e.id===selectedMapEntityId)??selectedDmActor):null;
  const actions:MapContextAction[]=[];
  const current=()=>state?.sceneEpoch===epoch&&state?.sceneId===sceneId&&runtimeEpoch===runtime;
  const add=(label:string,run:()=>void,disabled=false)=>actions.push({label,run:()=>{if(current())run();else toast('El mapa ha cambiado. Elige de nuevo el destino.');},disabled});
  if(actor){
    add('Colocar aquí',()=>{pendingPlacementId=command({type:'entity:place',entityId:actor.id,sceneId,surfaceId:hit.surfaceId,cell:hit.cell});});
    add('Seguir ficha',()=>world?.followDmEntity(actor.id),!latestSnapshot.entities.some(e=>e.id===actor.id));
    add('Ficha y estado',()=>{if(!state)return;if(actor.kind==='player')openEntitySheet(state,actor.id);else {const npc=state.npcs.find(n=>n.id===actor.id);if(npc)openNpcSheet(npc);else openWorkspaceWindow('encounterCard');}},actor.kind==='npc'&&!state.npcs.some(n=>n.id===actor.id));
    const participant=state.combat.participants.find(p=>p.id===actor.id);
    if(participant)add('Retirar del combate',()=>command({type:'combat:withdraw',entityId:actor.id}),Boolean(state.combat.prompt));
    const npc=state.npcs.find(n=>n.id===actor.id);
    if(npc)add(npc.visible?'Ocultar PNJ':'Mostrar PNJ',()=>command({type:'npc:visible',entityId:npc.id,visible:!npc.visible}));
  }
  add('Mirar aquí · entrar al interior',()=>world?.exploreDmCell(hit.cell,hit.surfaceId));
  if(sceneId==='dragon-rest'&&hit.surfaceId==='a2')add(state.progress['retreat.winch.lowered']?'Subir plataforma del cabrestante':'Bajar plataforma al agua',()=>command({type:'progress:toggle',flag:'retreat.winch.lowered',value:!state!.progress['retreat.winch.lowered']}));
  if(!actor&&!selectedId){add('Acercar aquí',()=>{world?.exploreDmCell(hit.cell,hit.surfaceId);world?.zoomCameraBy(1.5);});add('Alejar cámara',()=>world?.zoomCameraBy(1/1.5));}
  for(const [direction,label] of [[-1,'Bajar una planta aquí'],[1,'Subir una planta aquí']] as const){const surface=world?.dmAdjacentLayer(hit.cell,direction);if(surface)add(label,()=>world?.exploreDmCell(hit.cell,surface));}
  const port=state.ports.find(p=>[p.from,p.to].some(a=>a.mapId===sceneId&&a.surfaceId===hit.surfaceId&&Math.abs(a.cell.col-hit.cell.col)+Math.abs(a.cell.row-hit.cell.row)<=1));
  if(port){const to=port.from.mapId===sceneId&&port.from.surfaceId===hit.surfaceId?port.to:port.from;add('Explorar al otro lado del acceso',()=>to.mapId===sceneId?world?.exploreDmCell(to.cell,to.surfaceId):browseDmScene(to.mapId,to.cell,to.surfaceId));}
  if(selectedId){const object=state.objects.find(o=>o.id===selectedId);if(object)add('Acciones del objeto',()=>{rosetteSource='objects';const anchor=projectDmObject(object.id);if(anchor)objectRosette?.show(object.label,anchor,()=>projectDmObject(object.id));});}
  if(actor||selectedId)add('Deseleccionar · volver a arrastrar',()=>{selectedMapEntityId=null;selectedDmActor=null;selectedId=null;world?.setSelectedEntity(null);clearDraft();objectRosette?.close();if(state)renderObjects(state);});
  if(state.tableSceneId&&state.tableSceneId!==state.sceneId)add('Trasladar partida y jugadores a esta escena',()=>command({type:'scene',sceneId:state!.sceneId}));
  if(state.gameUndo.canUndo)add('Deshacer último cambio',()=>command({type:'game:undo'}));
  mapContextMenu.show(actor?.label??'Cámara del DM',x,y,actions);
}

function onMapClick(cell: Cell, entityId?: string) {
  if (!state||world?.getDisplayedSceneId()!==state.sceneId||latestSnapshot?.sceneId!==state.sceneId) return;
  setMapToolPanel(null);
  if (armedDmCombatPoint) {
    const { actorId, action } = armedDmCombatPoint;
    if (state.combat.currentId !== actorId && action.actionCost !== 'reaction' || state.combat.prompt) { armedDmCombatPoint = null; world?.clearAttackRange(); return; }
    const target = latestSnapshot?.entities.find(entity => entityId ? entity.id === entityId : sameCell(entity.cell, cell));
    if (action.targeting !== 'point' && !target) { toast('Selecciona una ficha dentro del alcance marcado.'); return; }
    command({ type: 'combat:declare', attackerId: actorId, ...(action.targeting === 'point' ? { targetCell: cell } : { targetId: target!.id }), actionId: action.id, useSneakAttack: true });
    armedDmCombatPoint = null; world?.clearAttackRange(); renderCombat(state); return;
  }
  if (draft) { draft.cell = { ...cell }; renderDraft(); return; }
  if (mapObjectsHighlighted && currentScene()?.camp) {
    const scene = currentScene(), camp = scene?.camp;
    if (scene && camp) {
      const point = camp.interactionPoints.find(candidate => sameCell(candidate.cell, cell) || candidate.objectCell && sameCell(candidate.objectCell, cell));
      if (point) { openCampRosette(point, scene.id, world?.mapCellScreenPoint(cell, point.surfaceId) ?? { x: 150, y: 150 }); return; }
    }
  }
  const entity = [...(latestSnapshot?.entities ?? [])].reverse().find(candidate => entityId ? candidate.id === entityId : candidate.surfaceId===world?.getPickedSurfaceId()&&sameCell(candidate.cell, cell));
  if (entity) {
    objectRosette?.close();
    inspectedPickupId = null;
    selectedMapEntityId = entity.id; selectedDmActor={id:entity.id,label:entity.label,kind:entity.kind}; selectedId = null; draft = null; draftAction = null;
    world?.clearDmNavigation();
    world?.setSelectedEntity(entity.id);
    world?.setCameraFocusCell(cell, entity.surfaceId);
    renderObjects(state); renderCombat(state);
    return;
  }
  selectedMapEntityId = null;selectedDmActor=null; world?.setSelectedEntity(null);
  const hit = [...state.objects].reverse().find(object => object.surfaceId===world?.getPickedSurfaceId()&&objectCells(object).some(occupied => sameCell(occupied, cell))); selectObject(hit?.id ?? null);
  world?.exploreDmCell(cell,hit?.surfaceId??world?.getPickedSurfaceId());
  if (hit) { rosetteSource = 'objects'; const project = () => projectDmObject(hit.id); const anchor = project(); if (anchor) objectRosette?.show(hit.label, anchor, project); }
  else objectRosette?.close();
}

function renderDraft() {
  const valid = draft ? draftValid(draft) : false, selectedEntity = latestSnapshot?.entities.find(entity => entity.id === selectedMapEntityId) ?? null;
  if(selectedMapEntityId&&!selectedEntity&&selectedDmActor?.id!==selectedMapEntityId)selectedMapEntityId=null;
  world?.setSelectedEntity(selectedMapEntityId); world?.showSelection(state?.objects.find(object => object.id === selectedId) ?? null); world?.showPreview(draft, valid);
  $('draftActions').hidden = !draft; ($('applyObject') as HTMLButtonElement).disabled = !valid;
  $('mapObjectsPanel').hidden = !draft;
  if (draft) objectRosette?.close();
  $('objectStatus').textContent = draft ? valid ? 'Destino válido. Pulsa Aplicar para confirmar.' : 'Ese destino está bloqueado.' : selectedEntity ? `${selectedEntity.label} seleccionado · WASD: una casilla por pulsación.` : state?.objects.length ? 'Haz clic en una ficha para moverla con WASD, o selecciona un objeto.' : 'Haz clic en una ficha para moverla con WASD.';
}

function renderObjects(current: DmState) {
  if (selectedId && !current.objects.some(object => object.id === selectedId)) { selectedId = null; draft = null; draftAction = null; }
  if (inspectedPickupId && !current.pickups?.some(pickup => pickup.id === inspectedPickupId)) inspectedPickupId = null;
  const campPoints = currentScene()?.camp?.interactionPoints ?? [];
  const options: Array<[string, string]> = [['', 'Selecciona un objeto…'], ...current.objects.map(object => [`object:${object.id}`, object.label] as [string, string]), ...(current.pickups ?? []).map(pickup => [`pickup:${pickup.id}`, pickup.label] as [string, string]), ...campPoints.map(point => [`camp:${point.id}`, `Campamento · ${point.label}`] as [string, string])];
  $('mapObjectCount').textContent = String(options.length - 1);
  const box = $('objects'); box.replaceChildren();
  for (const pickup of (current.pickups ?? []).filter(pickup => pickup.id === inspectedPickupId)) {
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
  for (const object of current.objects.filter(object => object.id === selectedId)) {
    const row = document.createElement('div'); row.className = `object-row${object.id === selectedId ? ' selected' : ''}`;
    const isC8LootObject = object.id.startsWith('c8-container-');
    const isC8Barrel = object.id.startsWith('c8-barrel-');
    const structureLabel = ({ intact: 'intacto', damaged: 'dañado', destroyed: 'roto' } as const)[object.structure];
    const interaction = object.kind === 'door' || object.kind === 'crate' ? object.interaction : undefined;
    const interactionStatus = !interaction ? '' : interaction.kind === 'barred-door' ? ` · listón ${interaction.barrier === 'barred' ? 'puesto' : 'retirado'}` : interaction.kind === 'trap-stash' ? ` · ${interaction.revealed ? interaction.open ? 'abierto' : 'descubierto' : 'oculto'} · trampa ${interaction.trap === 'armed' ? 'armada' : 'gastada'}` : interaction.kind === 'container' ? ` · ${interaction.open ? 'abierto' : 'cerrado'}${isC8LootObject ? interaction.lootId.startsWith('wreck-c8-result-') ? ` · ${interaction.lootLabel}` : ' · botín sin asignar' : isC8Barrel ? ' · sin tirada de la tabla d6' : ''}` : ` · ${interaction.location === 'submerged' ? 'sumergido' : 'fuera del agua'} · ${interaction.open ? 'abierto' : 'cerrado'} · ${current.progress['wreck.curse-aboard'] ? 'talismán destruido' : current.progress['wreck.items-given-to-runara'] ? 'entregado a Runara' : `paquete ${interaction.package}`}`;
    const label = document.createElement('b'); label.textContent = object.label; const status = document.createElement('span'); status.textContent = (object.kind === 'door' ? `${({ open: 'abierta', closed: 'cerrada', locked: 'bloqueada' } as const)[object.state]} · ${structureLabel}` : object.kind === 'wheel' ? `${object.attachment === 'attached' ? 'montado' : object.state === 'caught' ? 'sujeto' : 'caído'} · ${structureLabel} · ${object.rotation}°` : `${structureLabel} · ${object.rotation}°`) + interactionStatus;
    const choose = document.createElement('button'); choose.textContent = 'Mover'; choose.disabled = object.structure === 'destroyed' || object.kind === 'door' || object.kind === 'wheel' && object.attachment === 'attached' || interaction?.kind === 'trap-stash'; choose.onclick = () => selectObject(object.id, true);
    const states = chips(status.textContent.split(' · ').map(text => [text, /roto|gastada/.test(text) ? 'error' : /bloqueada|dañado|armada/.test(text) ? 'pending' : /abierta|intacto/.test(text) ? 'positive' : 'info']));
    states.append(chip(({ door: 'Puerta', crate: 'Contenedor', wheel: 'Timón' } as const)[object.kind])); row.append(label, states, choose);
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
        wreckC8Loot.forEach((lootLabel, index) => {
          const resultId = index + 1;
          if (current.progress[`wreck.c8-loot-${resultId}`]) return;
          const button = document.createElement('button'); button.textContent = `Botín d6 · ${resultId}`; button.title = lootLabel;
          button.onclick = () => command({ type: 'object:interact', objectId: object.id, action: 'assign-result', resultId }); row.append(button);
        });
      } else if (!isC8Barrel) for (const character of current.characters) interact(`Botín → ${character.label}`, 'take-loot', character.id);
    }
    if (interaction?.kind === 'chest') {
      const targetSurface = interaction.location === 'submerged' ? 'hold-air' : 'hold-water';
      const move = document.createElement('button'); move.textContent = interaction.location === 'submerged' ? 'Sacar del agua' : 'Volver a sumergir'; move.onclick = () => command({ type: 'object:transform', objectId: object.id, cell: object.cell, surfaceId: targetSurface, rotation: object.rotation }); row.append(move);
      if (interaction.open && !current.progress['wreck.items-given-to-runara'] && !current.progress['wreck.curse-aboard']) interaction.packageOwnerId ? interact('Devolver paquete', 'return-package') : current.characters.forEach(character => interact(`Paquete → ${character.label}`, 'take-package', character.id));
    }
    if (object.kind === 'wheel' && object.attachment === 'attached') for (const [text, outcome] of [['Separar · sujeto', 'caught'], ['Separar · caído', 'fallen']] as const) { const button = document.createElement('button'); button.textContent = text; button.onclick = () => startWheelDraft(object, outcome); row.append(button); }
    if (object.capabilities.structure && object.structure === 'intact') { const damage = document.createElement('button'); damage.textContent = 'Dañar'; damage.onclick = () => startStructureDraft(object, 'damaged'); row.append(damage); }
    if (object.capabilities.structure && object.structure !== 'destroyed') { const destroy = document.createElement('button'); destroy.className = 'danger'; destroy.textContent = 'Romper'; destroy.disabled = object.kind === 'wheel' && object.attachment === 'attached'; destroy.title = destroy.disabled ? 'Separa el timón antes de romperlo.' : ''; destroy.onclick = () => startStructureDraft(object, 'destroyed'); row.append(destroy); }
    const inspect = localButton('Estado del objeto', () => {
      objectRosette?.close();
      $('objectInfoName').textContent = object.label;
      $('objectInfoStates').replaceChildren(states.cloneNode(true));
      const dialog = $('objectInfoDialog') as HTMLDialogElement; if (!dialog.open) dialog.showModal();
    }); row.append(inspect);
    box.append(row);
  }
  if (!box.childElementCount) box.append(emptyState(options.length === 1 ? 'Sin objetos editables en esta escena' : 'Selecciona un objeto', options.length === 1 ? 'El mapa y sus fichas siguen disponibles.' : 'Activa Resaltar objetos y pulsa una marca del mapa.'));
  const undo = $('undoObject') as HTMLButtonElement; undo.disabled = !current.undo.canUndo; undo.textContent = '↶ Deshacer'; undo.title = current.undo.label ? `Deshacer: ${current.undo.label}` : 'Deshacer última acción'; undo.setAttribute('aria-label', undo.title); renderDraft();
  updateMapTargets(current); objectRosette?.refresh();
}

function renderPlayers(current: DmState) {
  const box = $('players'); if (box.contains(document.activeElement) && document.activeElement instanceof HTMLInputElement) return; box.replaceChildren();
  const present = current.characters;
  if (!present.length) { box.append(emptyState('Sin jugadores asignados', 'Abre las conexiones para que el grupo elija personaje.'), localButton('Gestionar conexiones', () => { ($('connectionPanel') as HTMLDetailsElement).open = true; $('connectionPanel').scrollIntoView({ block: 'start' }); })); return; }
  for (const character of present) {
    const article = document.createElement('article'); article.className = 'player-card'; const info = document.createElement('div'), heading = document.createElement('h3'), dot = document.createElement('span'), small = document.createElement('small');
    info.className = 'player-info';
    const sheetButton = document.createElement('button'); sheetButton.className = 'link-button'; sheetButton.type = 'button'; sheetButton.textContent = character.label; sheetButton.title = `Abrir ficha y estados de ${character.label}`; sheetButton.onclick = () => openEntitySheet(current, character.id);
    dot.className = `dot ${character.connected ? 'on' : ''}`; heading.append(dot, sheetButton); small.textContent = `${character.archetype} · ${character.claimed ? 'asignado' : 'libre'}`; info.append(heading, small);
    const hpLabel = document.createElement('label'), hp = document.createElement('input'); hpLabel.className = 'player-health'; hpLabel.append('PG', hp); hp.type = 'number'; hp.min = '0'; hp.max = String(character.maxHp); hp.value = String(character.hp); hp.onchange = () => command({ type: 'hp', characterId: character.id, hp: Number(hp.value) });
    const position = document.createElement('div'); position.className = 'player-position'; const col = coordinate('Col', character.cell.col), row = coordinate('Fila', character.cell.row), move = document.createElement('button'); move.textContent = 'Paso'; move.onclick = () => command({ type: 'entity:move', entityId: character.id, cell: { col: Number(col.input.value), row: Number(row.input.value) } }); position.append(col.label, row.label, move);
    const location = document.createElement('small'); location.className = 'player-location'; location.textContent = `${character.sceneId} · ${character.surfaceId} · ${character.cell.col},${character.cell.row}`;
    const resources = document.createElement('div'); resources.className = 'player-resources';
    const routes = document.createElement('div'); routes.className = 'player-routes';
    for (const port of current.ports) {
      if (port.return !== 'adjudicated'&&port.id!=='P10') continue;
      const forward = character.sceneId === port.from.mapId && character.surfaceId === port.from.surfaceId && sameCell(character.cell, port.from.cell);
      const back = character.sceneId === port.to.mapId && character.surfaceId === port.to.surfaceId && sameCell(character.cell, port.to.cell);
      if (!forward && !back) continue;
      if(current.interactions.some(r=>r.kind==='journey'&&r.status==='pending'&&r.characterId===character.id&&r.journeyOptions?.some(o=>o.portId===port.id)))continue;
      if(back&&port.rememberReturn&&current.ports.some(p=>p.rememberReturn&&current.progress[journeyReturnKey(character.id,p.id)])&&!current.progress[journeyReturnKey(character.id,port.id)])continue;
      const direction = forward ? 'forward' : 'return', destination = forward ? port.to : port.from;
      const button = document.createElement('button'); button.textContent = journeyPortLabel(port,direction);
      if(port.id==='P10'&&forward&&!current.progress['wreck.cofa-free-climb']){
        const total=document.createElement('input');total.type='number';total.min='-30';total.max='100';total.placeholder='Total Atletismo';total.setAttribute('aria-label',`${character.label} · Atletismo CD 10`);button.textContent='Subir cofa · CD 10';button.disabled=true;
        total.oninput=()=>{button.disabled=total.value===''||!Number.isInteger(Number(total.value))||Number(total.value)<10||Number(total.value)>100;};
        button.onclick=()=>command({type:'entity:portal',entityId:character.id,portId:'P10',direction:'forward',checkTotal:Number(total.value)});routes.append(total,button);continue;
      }
      const adjudicate = Boolean(port.conditionId) || port.return === 'adjudicated';
      button.onclick = () => command({ type: 'entity:portal', entityId: character.id, portId: port.id, direction, ...(adjudicate ? { adjudicate: true } : {}) }); routes.append(button);
    }
    const release = document.createElement('button'); release.className = 'player-release'; release.textContent = 'Liberar'; release.disabled = !character.claimed; release.onclick = () => command({ type: 'release', characterId: character.id });
    const actions = document.createElement('div'); actions.className = 'player-actions'; actions.append(routes, release);
    if(!current.combat.active)for(const seat of campaign?.scenes.find(scene=>scene.id===character.sceneId)?.seats??[]){
      if(character.sceneId!==current.sceneId||Math.max(Math.abs(seat.cell.col-character.cell.col),Math.abs(seat.cell.row-character.cell.row))>1)continue;
      const seated=latestSnapshot?.entities.find(entity=>entity.id===character.id)?.seatId===seat.id;
      const button=document.createElement('button');button.textContent=`${seated?'Levantarte':'Sentarte'} · ${seat.label}`;button.onclick=()=>command({type:'entity:seat',entityId:character.id,seatId:seat.id});actions.append(button);
    }
    if (character.concentration) {
      const end = document.createElement('button'); end.textContent = `Terminar concentración · ${character.concentration.label}`;
      end.onclick = () => command({ type: 'combat:endConcentration', entityId: character.id }); actions.append(end);
    }
    for (const [resourceId, resource] of Object.entries(character.resources)) { const label = document.createElement('label'), input = document.createElement('input'); label.append(resource.label, input); input.type = 'number'; input.min = '0'; input.max = String(resource.max); input.value = String(resource.current); input.onchange = () => command({ type: 'resource', characterId: character.id, resourceId, current: Number(input.value) }); resources.append(label); }
    article.className = 'dm-entity-card'; actions.className = 'dm-entity-actions'; release.className = 'dm-ghost';
    actions.prepend(localButton('Mover en mapa', () => focusEntityOnMap(character.id, character.cell, character.surfaceId)));
    actions.prepend(localButton('Ficha y estados', () => openEntitySheet(current, character.id)));
    const fields = document.createElement('div'); fields.className = 'dm-editor-fields'; fields.append(hpLabel, position, resources, location);
    const summary = chips([`PG ${character.hp}/${character.maxHp}`, ...Object.values(character.resources).map(resource => `${resource.label}: ${resource.current}/${resource.max}`), `Casilla ${character.cell.col},${character.cell.row}`, [character.connected ? 'Conectado' : 'Desconectado', character.connected ? 'positive' : 'pending'], character.claimed ? 'Asignada' : 'Libre']);
    article.append(info, summary, conditionStrip(character, condition => command({ type: 'combat:condition', entityId: character.id, condition, active: false })), actions, disclosure(`player:${character.id}`, 'Editar ficha y posición', fields)); box.append(article);
  }
}
function renderMonsterSheet(current: DmState) {
  const box = $('monsterSheet'); box.replaceChildren(); const creature = current.creature;
  if (!creature) return;
  const details = document.createElement('details'), summary = document.createElement('summary'); summary.textContent = `Hoja · ${creature.label}`;
  details.open = true;
  const stats = document.createElement('p'); stats.textContent = `PG ${creature.hp}/${creature.maxHp} · CA ${creature.armorClass} · velocidad ${creature.speedMeters} m`;
  const hp = document.createElement('input'); hp.type = 'number'; hp.min = '0'; hp.max = String(creature.maxHp); hp.value = String(creature.hp); hp.setAttribute('aria-label', `PG de ${creature.label}`); hp.onchange = () => command({ type: 'entity:hp', entityId: creature.id, hp: Number(hp.value) });
  const list = (title: string, values: string[]) => { const heading = document.createElement('b'), items = document.createElement('ul'); heading.textContent = title; items.replaceChildren(...values.map(value => { const item = document.createElement('li'); item.textContent = value; return item; })); return [heading, items] as const; };
  details.append(summary, stats, hp, conditionStrip(creature, condition => command({ type: 'combat:condition', entityId: creature.id, condition, active: false })), localButton('Ficha y estados', () => openEntitySheet(current, creature.id)), ...list('Rasgos', creature.traits), ...list('Acciones', creature.actions)); box.append(details);
}
function renderNpcs(current: DmState) {
  const box = $('npcs'); if (box.contains(document.activeElement) && document.activeElement instanceof HTMLInputElement) return; box.replaceChildren();
  const siteCues=new Set(campaign?.scenes.find(s=>s.id===current.sceneId)?.stageActors?.filter(a=>a.interactionOnly).map(a=>a.id));
  const npcs = current.npcs.filter(npc => npc.id !== 'wreck-rowboat'&&!siteCues.has(npc.id));
  if (!npcs.length) { box.append(emptyState('Sin PNJ en esta escena', 'Los personajes de escena aparecerán aquí.')); return; }
  for (const npc of npcs) {
    const row = document.createElement('div'); row.className = 'object-row'; const name = document.createElement('button'); name.className = 'link-button'; name.textContent = npc.label; name.title = `Abrir hoja de ${npc.label}`; name.onclick = () => openNpcSheet(npc);
    row.append(conditionStrip(npc, condition => command({ type: 'combat:condition', entityId: npc.id, condition, active: false })));
    const reveal = document.createElement('button'); reveal.textContent = npc.visible ? 'Ocultar' : `Invocar ${npc.label}`; reveal.disabled = current.combat.active; reveal.onclick = () => command({ type: 'npc:visible', entityId: npc.id, visible: !npc.visible });
    const col = coordinate('Col', npc.cell.col), line = coordinate('Fila', npc.cell.row), move = document.createElement('button'); move.textContent = 'Paso'; move.disabled = !npc.visible; move.onclick = () => command({ type: 'entity:move', entityId: npc.id, cell: { col: Number(col.input.value), row: Number(line.input.value) } });
    const combat = document.createElement('button'); combat.textContent = npc.combatEnabled ? 'Quitar de combate' : 'Añadir al combate'; combat.disabled = current.combat.active; combat.onclick = () => command({ type: 'combat:participant', entityId: npc.id, active: !npc.combatEnabled });
    const recover = document.createElement('button'); recover.textContent = 'Recuperar 1 PG'; recover.hidden = npc.hp > 0; recover.onclick = () => command({ type: 'entity:hp', entityId: npc.id, hp: 1 });
    row.className = 'dm-entity-card'; name.className = 'link-button dm-npc-name';
    const states = chips([[npc.visible ? 'Visible' : 'Oculto', npc.visible ? 'positive' : 'info'], `PG ${npc.hp}/${npc.maxHp}`, `Casilla ${npc.cell.col},${npc.cell.row}`, [npc.combatEnabled ? 'Participa en combate' : 'Fuera de combate', npc.combatEnabled ? 'pending' : 'info']]);
    const fields = document.createElement('div'); fields.className = 'dm-editor-fields'; fields.append(col.label, line.label, move);
    const actions = document.createElement('div'); actions.className = 'dm-entity-actions';
    const focus = localButton('Mover en mapa', () => focusEntityOnMap(npc.id, npc.cell, npc.surfaceId)); focus.disabled = false;
    actions.append(reveal, focus, combat, recover); row.append(name, states, actions, disclosure(`npc:${npc.id}`, 'Editar posición · un paso', fields)); box.append(row);
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
    const promptBox = document.createElement('div'), title = document.createElement('b'), note = document.createElement('p'), input = document.createElement('input'), submit = document.createElement('button'); promptBox.className = 'combatant-attacks'; title.textContent = combat.prompt.title; note.textContent = combat.prompt.instruction; input.type = 'number'; input.min = String(combat.prompt.minimum ?? 0); input.max = String(combat.prompt.maximum ?? 200); input.placeholder = combat.prompt.stage === 'attack' || combat.prompt.stage === 'death-save' ? 'd20 natural' : combat.prompt.stage === 'damage' ? 'suma de dados' : 'total'; submit.className = 'primary'; submit.textContent = combat.prompt.stage === 'damage' ? 'Aplicar daño' : 'Confirmar dado'; submit.onclick = () => { const value = Number(input.value); if (!input.value.trim() || !Number.isInteger(value) || value < (combat.prompt!.minimum ?? -30) || value > (combat.prompt!.maximum ?? 200)) return toast('Introduce un resultado entero.'); const type = combat.prompt!.stage === 'attack' ? 'combat:rollAttack' : combat.prompt!.stage === 'damage' ? 'combat:rollDamage' : combat.prompt!.stage === 'death-save' ? 'combat:rollDeathSave' : 'combat:rollSave'; const roll = type === 'combat:rollAttack' || type === 'combat:rollDeathSave' ? { d20: value } : type === 'combat:rollDamage' ? { diceTotal: value } : { total: value }; command({ type, promptId: combat.prompt!.id, ...roll }); }; promptBox.append(title, note, input, submit); box.append(promptBox);
  }
  box.append(order, applyInitiative);
  if (selectedCombatantId === combat.currentId && currentParticipant?.controller === 'dm' && currentParticipant.active) { const hint = document.createElement('p'); hint.className = 'note'; hint.textContent = `WASD mueve a ${currentParticipant.label} una casilla por pulsación.`; box.append(hint); }
}

addEventListener('keydown', event => {
  if(event.key==='Escape'&&!armedDmCombatPoint){mapContextMenu.close();selectedMapEntityId=null;selectedDmActor=null;selectedId=null;world?.setSelectedEntity(null);objectRosette?.close();clearDraft();if(state)renderObjects(state);}
  if (event.key === 'Escape' && armedDmCombatPoint) { armedDmCombatPoint = null; world?.clearAttackRange(); if (state) renderCombat(state); event.preventDefault(); return; }
  if (event.target instanceof Element && event.target.closest('input,textarea,select,[contenteditable="true"],dialog[open]')) return;
  if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'z') {
    if (!event.repeat && state?.gameUndo.canUndo) { event.preventDefault(); command({ type: 'game:undo' }); }
    return;
  }
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const key = event.key.toLowerCase();
  if ((key === 'r' || key === 'f') && supportsCameraOrbit(state?.sceneId)) { event.preventDefault(); if(!event.repeat)verticalCameraControl.begin(key==='r'?1:-1); return; }
  if (!event.repeat && (key === 'q' || key === 'e') && supportsCameraOrbit(state?.sceneId)) { event.preventDefault(); rotateCamera(key === 'q' ? -1 : 1); return; }
  const axes = key === 'w' ? { x: 0, up: 1 } : key === 'a' ? { x: -1, up: 0 } : key === 's' ? { x: 0, up: -1 } : key === 'd' ? { x: 1, up: 0 } : null;
  const delta = axes ? worldVectorToCellDelta(world?.screenVectorToWorld(axes.x, axes.up) ?? { x: axes.x, z: -axes.up }) : null;
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
  const musicTracks = campaign?.audio.library?.music ?? [];
  const currentTrackId = current.audio.music.assetId ?? musicTracks[0]?.id;
  const currentTrack = musicTracks.find(track => track.id === currentTrackId);
  const sceneName = $('audioSceneName');
  const sceneStatus = $('audioSceneStatus');
  if (sceneName) sceneName.textContent = currentTrack?.label ?? 'Sin tema musical';
  if (sceneStatus) {
    const activeLayers = Object.values(current.audio.layers).filter(track => track.playing).length;
    sceneStatus.textContent = `${current.audio.music.playing ? 'Música activa' : 'Música en pausa'} · ${activeLayers} ${activeLayers === 1 ? 'ambiente activo' : 'ambientes activos'}`;
  }
  const box = $('audio'); if (!force && box.contains(document.activeElement)) return; box.replaceChildren(); const entries: [string, AudioState['music']][] = [['music', current.audio.music], ...Object.entries(current.audio.layers)];
  if (musicTracks.length) {
    const label = document.createElement('label'), select = document.createElement('select'); label.textContent = 'Tema musical';
    for (const track of musicTracks) { const option = document.createElement('option'); option.value = track.id; option.textContent = track.label; option.selected = track.id === (current.audio.music.assetId ?? musicTracks[0]?.id); select.append(option); }
    select.onchange = () => command({ type: 'audio:select', channel: 'music', trackId: select.value }); label.append(select); box.append(label);
  }
  for (const [id, track] of entries) {
    const row = document.createElement('div'); row.className = 'audio-row';
    const button = document.createElement('button'), label = document.createElement('label'), range = document.createElement('input'), amount = document.createElement('span');
    button.className = 'audio-toggle';
    const setPlaying = (playing: boolean) => { button.textContent = playing ? 'Ⅱ' : '▶'; button.setAttribute('aria-pressed', String(playing)); button.title = playing ? 'Pausar sonido' : 'Iniciar sonido'; button.setAttribute('aria-label', button.title); };
    setPlaying(track.playing); range.type = 'range'; range.min = '0'; range.max = '1'; range.step = '.05'; range.value = String(track.volume);
    const layerLabel = id === 'music' ? undefined : campaign?.audio.layerLabels?.[id as keyof NonNullable<typeof campaign>['audio']['layers']]; label.append(layerLabel ?? audioLabels[id] ?? id, range); amount.textContent = `${Math.round(track.volume * 100)}%`;
    button.onclick = () => { const next = button.getAttribute('aria-pressed') !== 'true'; setPlaying(next); command({ type: 'audio', channel: id, playing: next, volume: Number(range.value) }); };
    range.oninput = () => { amount.textContent = `${Math.round(Number(range.value) * 100)}%`; };
    range.onchange = () => command({ type: 'audio', channel: id, playing: button.getAttribute('aria-pressed') === 'true', volume: Number(range.value) }); row.append(button, label, amount); box.append(row);
  }
}

function renderSfx(current: DmState) {
  const box = $('sfx'); box.replaceChildren();
  for (const effect of campaign?.audio.library?.sfx ?? []) {
    if (effect.manual === false && !current.audio.sfxLoops[effect.id]?.playing) continue;
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
  if (!pending.length) { box.append(emptyState('Sin solicitudes activas', 'Las interacciones de los jugadores aparecerán aquí.')); return; }
  for (const request of pending) {
    if(request.kind==='journey'){
      const row=document.createElement('article');row.className='dm-request';
      const label=document.createElement('strong');label.textContent=`${request.characterLabel} · ${request.targetLabel??'Preparar viaje'}`;
      const help=document.createElement('p');help.textContent='Confirma la continuación acordada. Los campamentos son paradas opcionales; el tiempo, los encuentros y el descanso los decide el DM.';
      const character=current.characters.find(c=>c.id===request.characterId),choices=document.createElement('div');choices.className='button-row';
      for(const option of request.journeyOptions??[]){
        const port=current.ports.find(p=>p.id===option.portId);if(!port)continue;
        const origin=option.direction==='forward'?port.from:port.to;
        const approve=localButton(journeyPortLabel(port,option.direction),()=>command({type:'entity:portal',entityId:request.characterId,portId:port.id,direction:option.direction,adjudicate:true}));
        approve.disabled=!character||Boolean(character.step)||character.sceneId!==origin.mapId||character.surfaceId!==origin.surfaceId||!sameCell(character.cell,origin.cell);choices.append(approve);
      }
      choices.append(localButton('Cancelar solicitud',()=>command({type:'resolveInteraction',requestId:request.id,result:'cancelled'})));row.append(label,help,choices);box.append(row);continue;
    }
    if(request.kind==='prayer'){
      const row=document.createElement('article');row.className='dm-request';
      const label=document.createElement('strong');label.textContent=`${request.characterLabel} reza a Sylvania`;
      const character=current.characters.find(character=>character.id===request.characterId),help=document.createElement('p');
      help.textContent=`${character?.sheet?.background??''}. ${character?.sheet?.features.slice(0,3).join(' · ')??''}. El reglamento no concede un bono racial/de clase por rezar. Puedes premiar la interpretación con una Inspiración, utilizable una vez durante 24 h de juego (adaptación).`;
      row.append(label,help,localButton('Conceder Inspiración',()=>command({type:'scene:resolveCheck',requestId:request.id,total:1})),localButton('Sin bendición',()=>command({type:'scene:resolveCheck',requestId:request.id,total:null})));box.append(row);continue;
    }
    if(request.kind==='proximity-check'){
      const row=document.createElement('article');row.className='dm-request';
      const label=document.createElement('strong');label.textContent=`${request.characterLabel} · ${request.skill} CD ${request.dc}`;
      const help=document.createElement('p');help.textContent=`Pasas junto a ${request.targetLabel}. Introduce el total del dado físico. Molestar a dos clientes inicia el combate.`;
      const total=document.createElement('input');total.type='number';total.min='-30';total.max='100';total.setAttribute('aria-label',`${request.characterLabel} · total de ${request.skill}`);
      const resolve=localButton('Confirmar tirada',()=>command({type:'scene:resolveCheck',requestId:request.id,total:Number(total.value)}));resolve.disabled=true;
      if(request.playerTotal!==undefined){total.value=String(request.playerTotal);resolve.disabled=false;help.textContent=`El jugador ha introducido ${request.playerTotal}. Confirma el total del dado físico. Molestar a dos clientes inicia combate.`;}
      total.oninput=()=>{const value=Number(total.value);resolve.disabled=total.value===''||!Number.isInteger(value)||value< -30||value>100;};
      const cancel=localButton('Cancelar',()=>command({type:'scene:resolveCheck',requestId:request.id,total:null}));row.append(label,help,total,resolve,cancel);box.append(row);continue;
    }
    if(request.targetId==='P10'){
      const row=document.createElement('article');row.className='dm-request';const label=document.createElement('strong');label.textContent=`${request.characterLabel} · Subir a la cofa`;
      const help=document.createElement('p');help.textContent='Fuerza (Atletismo) CD 10 · adaptación por mástil inclinado. Introduce el total del dado físico. Un fallo permite reintentar; no aplica caída ni daño.';
      const total=document.createElement('input');total.type='number';total.min='-30';total.max='100';total.setAttribute('aria-label',`${request.characterLabel} · total de Atletismo`);
      const approve=localButton('Autorizar escalada',()=>command({type:'entity:portal',entityId:request.characterId,portId:'P10',direction:'forward',checkTotal:Number(total.value)}));approve.disabled=true;
      total.oninput=()=>{approve.disabled=total.value===''||!Number.isInteger(Number(total.value))||Number(total.value)<10||Number(total.value)>100;};
      const cancel=localButton('Cancelar o resolver fallo',()=>command({type:'resolveInteraction',requestId:request.id,result:'cancelled'}));row.append(label,help,total,approve,cancel);box.append(row);continue;
    }
    const row = document.createElement('article'), label = document.createElement('strong'), target = document.createElement('span'), age = document.createElement('small'); row.className = 'dm-request';
    const object = current.objects.find(object => object.id === request.targetId);
    label.textContent = request.characterLabel; target.textContent = `→ ${object?.label ?? 'Objeto de escena'}`;
    age.textContent = relativeTime(new Date(request.createdAt).toISOString());
    const actions = document.createElement('div'); actions.className = 'button-row';
    const wheel = object?.kind === 'wheel' ? object : null;
    const results = document.createElement('div'); results.className = 'button-row';
    for (const [text, result] of [['Supera · sujeto', 'caught'], ['Falla · cae', 'fallen']] as const) {
      const button = localButton(text, () => { if (wheel) { startWheelDraft(wheel, result, request.id); openWorkspaceWindow('mapWindow'); } });
      button.disabled = !wheel; results.append(button);
    }
    const resolver = disclosure(`request:${request.id}`, 'Resolver · resultado del dado físico', results);
    const cancel = localButton('Rechazar', () => { command({ type: 'resolveInteraction', requestId: request.id, result: 'cancelled' }); }); cancel.className = 'dm-ghost';
    const view = localButton('Ver en mapa', () => { if (object) { world?.setCameraFocusCell(object.cell, object.surfaceId); selectObject(object.id); openWorkspaceWindow('mapWindow'); } }); view.disabled = !object;
    actions.append(view, cancel); row.append(label, target, age, resolver, actions); box.append(row);
  }
}

function humanCode(code: string) { if (code === 'SAVE_UNAVAILABLE') return saveStatus?.mode === 'restoring' ? 'se está cargando una partida; espera a que termine' : saveStatus?.mode === 'saving' ? 'se está guardando para actualizar; espera a la reconexión' : 'la partida necesita recuperación: carga una de las últimas partidas o inicia una nueva'; if (code === 'SAVE_CLOSING') return 'la mesa se está guardando para actualizar'; return ({ MIMIC_ACTION_MISMATCH: 'el Reflejo debe imitar la última acción del original; si es imposible, resuelve la excepción con el DM', MIMIC_TARGET_REQUIRED: 'elige el personaje cuya forma copia el Reflejo', LINE_OF_EFFECT_BLOCKED: 'una pared o puerta cerrada bloquea el efecto', STORY_PREREQUISITES: 'faltan las pruebas previas o un motivo de excepción del DM', STORY_TIE_REASON: 'hay empate: indica por qué el DM elige ese final', RECHARGE_REQUIRED: 'esta acción necesita recargarse', INVENTORY_DEPLETED: 'no queda munición o una daga disponible', DOOR_LOCKED: 'la puerta está bloqueada', BLOCKED_CELL: 'casilla bloqueada', OCCUPIED_CELL: 'hay una criatura en la casilla', GRID_STEP_REQUIRED: 'cada movimiento debe ser a una casilla ortogonal contigua', MOVEMENT_SPENT: 'ese turno ya ha gastado todo su movimiento', ENTITY_MOVING: 'ese personaje ya está terminando un paso', NOT_YOUR_TURN: 'no es el turno de esa criatura', ACTION_USED: 'esa criatura ya ha usado su acción este turno', INVALID_TARGET: 'ese objetivo no puede recibir el ataque', UNKNOWN_ACTION: 'esa acción no está disponible', SPAWN_RESERVED: 'zona de aparición reservada', STALE_OBJECTS: 'otro cambio se aplicó antes; vuelve a intentarlo', STALE_SCENE: 'la escena cambió', REQUEST_STALE: 'la solicitud ya no es válida', OBJECT_ATTACHED: 'el timón sigue montado', INVALID_TRANSITION: 'esa transición no está permitida', CAPABILITY_UNAVAILABLE: 'el objeto no admite esa acción', COMMAND_ID_REUSED: 'petición repetida con datos distintos', PARTY_STILL_ABOARD: 'saca primero a todos los personajes del pecio; no debe desaparecer con nadie dentro', CAMP_FEATURE_UNAVAILABLE: 'esta escena no contiene interacciones de campamento', CAMP_INTERACTION_OUT_OF_REACH: 'el personaje debe estar junto al punto de interacción', CAMP_INTERACTION_NOT_YOURS: 'ese objeto pertenece a otro personaje', IN_COMBAT: 'no puedes usar objetos del campamento durante el combate', REST_ACTIVE_ELSEWHERE: 'ya hay un descanso en curso en otro campamento', REST_ALREADY_ACTIVE: 'el descanso ya está preparado', REST_NOT_ACTIVE: 'no hay descanso activo', REST_INTERRUPTED: 'reanuda el descanso antes de avanzar', REST_ALREADY_INTERRUPTED: 'no hay una interrupción que reanudar', REST_NOT_INTERRUPTED: 'no hay descanso activo', REST_NOT_AT_DAWN: 'la confirmación solo está disponible al amanecer', REST_NEEDS_FINAL_CONFIRMATION: 'confirma el resultado del descanso', INVALID_CAMP_ACTION: 'acción de descanso no válida' } as Record<string, string>)[code] ?? code; }

function friendlyErrorCode(code: string) {
  const chapterMessages: Record<string, string> = {
    COFA_CHECK_REQUIRED:'Introduce el total de Atletismo CD 10 para autorizar la subida; el DM puede omitir esta adaptación.',
    COFA_CHECK_FAILED:'No alcanza CD 10. El personaje permanece en la base; sin caída ni daño automáticos.',
    ROLL_PENDING: 'resuelve o cancela la acción pendiente antes de continuar',
    ACTION_ALREADY_RESOLVING: 'la primera tirada ya está confirmada; termina la resolución o usa Ctrl+Z para corregir un error',
    COMBAT_ALREADY_STARTED: 'los turnos ya han empezado; usa Finalizar combate cuando cese el peligro',
    NOT_YOUR_ACTION: 'sólo quien declaró la acción puede cancelar su selección',
    WRECK_DISAPPEARED: 'el Rosa de los Vientos ya ha desaparecido',
    HARPY_NOT_RETURNED: 'la arpía aún no ha regresado al barco',
    CHAPTER_NOT_COMPLETE: 'completa primero el día siguiente al final de la maldición',
    USE_LEVEL_UP_ACTION: 'usa la acción de nivel del capítulo',
    SHEET_NOT_FOUND: 'falta la hoja de algún personaje',
    WRONG_CAMPAIGN: 'esta acción solo está disponible en Stormwreck'
  };
  if (code === 'REST_ACTIVE_ELSEWHERE') {
    const title = campaign?.scenes.find(scene => scene.id === state?.campRest?.sceneId)?.title ?? 'el campamento anterior';
    return `hay un descanso pendiente en «${title}». Cambiar de mapa no lo termina; vuelve a él desde el panel de descanso antes de preparar otro`;
  }
  return chapterMessages[code] ?? humanCode(code);
}

function renderSave() {
  const status = $('saveStatus');
  const presentation = savePresentation(saveStatus);
  const saveLabel = `${presentation.alert ? '⚠' : presentation.tone === 'positive' ? '✓' : '◷'} ${presentation.title}`;
  $('saveHeaderSummary').textContent = saveLabel;
  $('saveHeaderSummary').className = `dm-save-inline dm-${presentation.tone}`;
  $('saveSummaryTitle').textContent = `${presentation.alert ? '⚠' : presentation.tone === 'positive' ? '✓' : '◷'} ${presentation.title}`;
  $('saveSummaryTime').textContent = saveStatus?.savedAt ? relativeTime(saveStatus.savedAt) : 'Todavía no hay una copia confirmada';
  $('saveSummaryTime').title = saveStatus?.savedAt ? new Date(saveStatus.savedAt).toLocaleString() : '';
  $('partida-y-copias').classList.toggle('has-error', presentation.alert);
  $('connectionPanel').classList.toggle('has-error', presentation.alert);
  document.querySelector('[data-open-window="connectionPanel"]')?.classList.toggle('has-attention', presentation.alert);
  $('saveSummary').setAttribute('role', presentation.alert ? 'alert' : 'status');
  status.hidden = !presentation.alert;
  if (presentation.alert && $('saveSummary').dataset.alert !== 'true') ($('connectionPanel') as HTMLDetailsElement).open = true;
  $('saveSummary').dataset.alert = String(presentation.alert);
  if (!saveStatus) { status.textContent = 'Comprobando guardado…'; return; }
  const last = saveStatus.savedAt ? new Date(saveStatus.savedAt).toLocaleString() : 'todavía no guardada';
  status.textContent = saveStatus.mode === 'recovery' || saveStatus.mode === 'incompatible'
    ? `Partida pendiente de recuperación (${saveStatus.errorCode ?? saveStatus.mode}). Carga una de las últimas partidas o inicia una nueva.`
    : saveStatus.mode === 'error' ? `Error al guardar (${saveStatus.errorCode ?? 'disco'}). La partida sigue en memoria; reintenta el guardado.`
    : saveStatus.mode === 'saving' ? `Guardando… última copia ${last}.`
    : `Última copia ${last}${saveStatus.dirty ? ' · cambios pendientes' : ' · al día'}${saveStatus.generation ? ` · generación ${saveStatus.generation}` : ''}.`;
  if (saveStatus.recoveryNotice) status.textContent += ` ${saveStatus.recoveryNotice}`;
  ($('retrySave') as HTMLButtonElement).hidden = saveStatus.mode !== 'error';
  ($('showEvidence') as HTMLButtonElement).hidden = saveStatus.mode !== 'recovery' && saveStatus.mode !== 'incompatible';
  ($('saveNow') as HTMLButtonElement).disabled = !runtimeEpoch || saveStatus.mode === 'saving' || saveStatus.mode === 'restoring' || saveStatus.mode === 'recovery' || saveStatus.mode === 'incompatible';
}

async function renderSaveHistory() {
  const box = $('saveHistory');
  try {
    const entries = await fetch('/api/dm/save/history', { cache: 'no-store' }).then(response => response.ok ? response.json() : []);
    box.replaceChildren();
    if (!entries.length) { box.textContent = 'Todavía no hay partidas guardadas.'; return; }
    for (const entry of entries) {
      const row = document.createElement('div'); row.className = 'save-history-row'; const label = document.createElement('span');
      const sceneTitle = campaign?.scenes.find(scene => scene.id === entry.sceneId)?.title ?? entry.sceneId;
      const actorLabel = entry.currentId ? state?.characters.find(actor => actor.id === entry.currentId)?.label
        ?? state?.npcs.find(actor => actor.id === entry.currentId)?.label
        ?? (state?.creature?.id === entry.currentId ? state?.creature?.label : undefined)
        ?? campaign?.scenes.flatMap(scene => scene.stageActors ?? []).find(actor => actor.id === entry.currentId)?.label
        ?? entry.currentId : null;
      const kindLabel = entry.saveKind === 'manual' ? 'Manual' : 'Automática';
      label.textContent = `${kindLabel} · ${new Date(entry.savedAt).toLocaleString()} · ${sceneTitle} · ${entry.combat ? `Combate · ronda ${entry.round}${actorLabel ? ` · turno de ${actorLabel}` : ' · iniciativa pendiente'}` : 'Exploración'}`;
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
async function confirmRestore(preview: { token: string; expectedStateRevision: number; summary: { campaignId: string; sceneId: string; savedAt: string; kind: string }; warnings?: string[] }) {
  const playerNotice = preview.summary.kind === 'new' ? 'los jugadores volverán a elegir personaje' : 'los jugadores conectados conservarán su personaje y se sincronizarán sin recargar';
  const message = `Restaurar ${preview.summary.kind === 'new' ? 'una partida nueva' : 'esta copia'} de ${preview.summary.campaignId}, escena ${preview.summary.sceneId}, fecha ${new Date(preview.summary.savedAt).toLocaleString()}? Los cambios posteriores se conservarán en una copia de recuperación; ${playerNotice}. El historial de Ctrl+Z empezará vacío.${preview.warnings?.length ? '\n\n' + preview.warnings.join('\n') : ''}`;
  if (!window.confirm(message)) return;
  try { const result = await privatePost('/api/dm/save/restore', { token: preview.token, expectedStateRevision: preview.expectedStateRevision, runtimeEpoch, requestId: commandId() }); toast(`Partida restaurada · copia ${result.generation}.`); const dialog = $('loadGameDialog') as HTMLDialogElement; if (dialog.open) dialog.close(); }
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
($('loadGame') as HTMLButtonElement).onclick = () => { const dialog = $('loadGameDialog') as HTMLDialogElement; if (!dialog.open) dialog.showModal(); void renderSaveHistory(); };
($('closeLoadGame') as HTMLButtonElement).onclick = () => ($('loadGameDialog') as HTMLDialogElement).close();
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
    selectedId = null; inspectedPickupId = null; draft = null; draftAction = null; setMapToolPanel(null); setMapHighlights(false); objectRosette?.close();
    campInteractionMode = false; world?.setCampInteractionHighlights(false);
    const campPointDialog = $('campPointDialog') as HTMLDialogElement; if (campPointDialog.open) campPointDialog.close(); campPointSceneId = null;
    const sceneId = ($('scene') as HTMLSelectElement).value;
    command({ type: 'scene', sceneId });
  };
$('moveToCurrentScene').onclick = () => {
  if (state) command({ type: 'scene', sceneId: state.sceneId });
};
($('campInteractionToggle') as HTMLButtonElement).onclick = () => {
  const isCamp = Boolean(currentScene()?.camp);
  if (!isCamp) return;
  campInteractionMode = !campInteractionMode;
  syncCampInteractionMode(isCamp);
};
($('showGrid') as HTMLInputElement).onchange = () => { const visible = ($('showGrid') as HTMLInputElement).checked; world?.setGridVisible(visible); updateDmUiPreferences('showGrid', visible); };
($('dmGridMode') as HTMLSelectElement).onchange = event => updateDmGridStyle({ mode: (event.currentTarget as HTMLSelectElement).value as GridStyle['mode'] });
($('dmGridColor') as HTMLInputElement).oninput = event => updateDmGridStyle({ color: (event.currentTarget as HTMLInputElement).value });
($('dmGridOpacity') as HTMLInputElement).oninput = event => updateDmGridStyle({ opacity: Number((event.currentTarget as HTMLInputElement).value) / 100 });
($('dmGridThickness') as HTMLInputElement).oninput = event => updateDmGridStyle({ thickness: Number((event.currentTarget as HTMLInputElement).value) as GridStyle['thickness'] });
$('cameraTurnLeft').onclick = () => rotateCamera(-1);
$('cameraTurnRight').onclick = () => rotateCamera(1);
$('cameraReset').onclick = () => { const sceneId = state?.sceneId ?? latestSnapshot?.sceneId; if (!supportsCameraOrbit(sceneId)) return; world?.resetCameraOrientation(); updateCameraOrbitControls(sceneId); publishCameraOrientation(); };
$('cameraDetail').onclick = () => { if (!world?.frameActorDetail(selectedMapEntityId ?? latestSnapshot?.entities.find(entity => entity.kind === 'player')?.id)) toast('Selecciona un personaje visible para acercar la vista.'); };
$('cameraOverview').onclick = () => world?.frameSceneOverview();
verticalCameraControl.bind($('cameraTiltDown') as HTMLButtonElement,-1);
verticalCameraControl.bind($('cameraTiltUp') as HTMLButtonElement,1);
($('shareCameraOrientation') as HTMLInputElement).onchange = event => {
  const share = (event.currentTarget as HTMLInputElement).checked;
  updateDmUiPreferences('shareCameraOrientation', share);
  if(share){if(state&&state.tableSceneId!==state.sceneId)command({type:'view:focus',sceneId:state.sceneId});else publishCameraOrientation(true);}
  else stopSharingCameraOrientation();
};
$('camera').onchange = $('focus').onchange = () => {world?.clearDmNavigation();command({ type: 'camera', mode: ($('camera') as HTMLSelectElement).value, focusId: ($('focus') as HTMLSelectElement).value || null });};
document.querySelectorAll<HTMLButtonElement>('[data-camera-mode]').forEach(button => button.onclick = () => {
  const select = $('camera') as HTMLSelectElement; select.value = button.dataset.cameraMode!; select.dispatchEvent(new Event('change'));
});
$('storm').onclick = () => command({ type: 'environment', storm: !state?.environment.storm, precipitation:state?.environment.storm?'none':'rain',intensity: Number(($('stormIntensity') as HTMLInputElement).value) });
$('clockPauseToggle').onclick = () => { if (!state || state.combat.active) return; command({ type: 'clock:control', action: state.gameClock.pauseReason === 'dm' ? 'resume' : 'pause' }); };
$('clockShortRest').onclick = () => command({ type: 'clock:control', action: 'short-rest' });
$('clockLongRest').onclick = () => command({ type: 'clock:control', action: 'long-rest' });
$('clockAdvance').onclick = () => { const minutes = Number(($('clockAdvanceMinutes') as HTMLInputElement).value); if (!Number.isInteger(minutes) || minutes < 1 || minutes > 525_600) return toast('Indica entre 1 minuto y un año de tiempo de juego.'); command({ type: 'clock:control', action: 'advance', seconds: minutes * 60 }); };
$('clockSet').onclick = () => { const [hours, minutes, seconds = '0'] = ($('clockSetTime') as HTMLInputElement).value.split(':'); if (hours === undefined || minutes === undefined) return toast('Indica una hora válida.'); command({ type: 'clock:control', action: 'set-time', secondsOfDay: Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds) }); };
$('clockTravel').onclick = () => { const portId = ($('clockTravelRoute') as HTMLSelectElement).value; if (portId) command({ type: 'clock:control', action: 'travel', portId }); };
$('mapSceneButton').onclick = () => setMapToolPanel(mapToolPanel === 'scene' ? null : 'scene');
$('mapSceneToggle').onclick = () => setMapToolPanel('scene');
$('mapToolsToggle').onclick = () => setMapToolPanel(mapToolPanel === null ? 'camera' : null);
$('mapToolsClose').onclick = () => { setMapToolPanel(null); $('mapToolsToggle').focus(); };
$('mapCameraToggle').onclick = () => setMapToolPanel(mapToolPanel === 'camera' ? null : 'camera');
$('mapObjectsToggle').onclick = () => setMapToolPanel(mapToolPanel === 'objects' ? null : 'objects');
$('mapHighlightToggle').onclick = () => setMapHighlights(!mapObjectsHighlighted);
document.addEventListener('pointerdown', event => { if (mapToolPanel && event.target instanceof Element && !event.target.closest('#mapToolsPanel, #mapToolsToggle, #mapSceneButton')) setMapToolPanel(null); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && mapToolPanel) { setMapToolPanel(null); $('mapToolsToggle').focus(); } });
for (const [attribute, id] of [['weather-time', 'weatherTime'], ['weather-kind', 'weatherKind']] as const) {
  document.querySelectorAll<HTMLButtonElement>(`[data-${attribute}]`).forEach(button => button.onclick = () => {
    const control = $(id) as HTMLSelectElement;
    control.value = button.getAttribute(`data-${attribute}`)!;
    control.dispatchEvent(new Event('change'));
  });
}
$('weatherLevel').oninput = () => { $('weatherLevelValue').textContent = ['Suave', 'Media', 'Intensa'][Number(($('weatherLevel') as HTMLInputElement).value) - 1] ?? 'Media'; };
$('weatherWind').oninput = () => { $('weatherWindValue').textContent = `${Math.round(Number(($('weatherWind') as HTMLInputElement).value) * 100)}%`; };
for(const id of ['weatherTime','weatherKind','weatherLevel','weatherWind'])$(id).onchange=()=>{
  // Send only the edited field: an earlier snapshot must not undo another
  // control changed while the previous command was in flight.
  const field={weatherTime:'timeOfDay',weatherKind:'weatherMode',weatherLevel:'precipitationLevel',weatherWind:'windIntensity'}[id]!;
  const value=($(id) as HTMLInputElement).value;
  command({type:'environment',[field]:id==='weatherLevel'||id==='weatherWind'?Number(value):value});
};
  $('timeOfDayToggle').onclick = () => {
    if (!state) return;
    const isNight = lightPhaseLabel(state.environment,gameClockAt(state.gameClock,dmServerClock.now(Date.now())))==='Noche';
    command({ type: 'environment', timeOfDay: isNight ? 'day' : 'night' });
  };
($('stormIntensity') as HTMLInputElement).oninput = () => { $('stormIntensityValue').textContent = `${Math.round(Number(($('stormIntensity') as HTMLInputElement).value) * 100)}%`; };
($('stormIntensity') as HTMLInputElement).onchange = () => command({ type: 'environment', intensity: Number(($('stormIntensity') as HTMLInputElement).value) });
for (const [id, field] of [['weatherTemperature', 'temperatureC'], ['weatherFog', 'fogTarget'], ['weatherFlood', 'floodTarget']] as const) {
  $(id).oninput = () => { const input = $(id) as HTMLInputElement, value = Number(input.value); $(`${id}Value`).textContent = field === 'temperatureC' ? `${value} °C` : `${Math.round(value * 100)}%`; };
  $(id).onchange = () => command({ type: 'environment', [field]: Number(($(id) as HTMLInputElement).value) });
}
($('snowDifficultTerrain') as HTMLInputElement).onchange = event => command({ type: 'environment', snowDifficultTerrain: (event.currentTarget as HTMLInputElement).checked });
$('creature').onclick = () => {
  if (!state?.creature) return;
  const candidates = state.characters.filter(character => character.claimed && character.sceneId === state!.sceneId);
  let sourceId = candidates[0]?.id;
  if (!state.creature.visible && campaign?.campaignId === 'd8-night-private' && candidates.length > 1) {
    const answer = prompt(`¿Quién afronta el espejo?\n${candidates.map((character, i) => `${i + 1}: ${character.label}`).join('\n')}`, '1');
    if (answer === null) return;
    sourceId = candidates[Number(answer) - 1]?.id;
    if (!sourceId) return toast('Elige uno de los personajes presentes.');
  }
  command({ type: 'creature', visible: !state.creature.visible, ...(sourceId ? { sourceId } : {}) });
};
$('moveHarpy').onclick = () => { if (state?.creature) command({ type: 'entity:move', entityId: state.creature.id, cell: { col: Number(($('harpyCol') as HTMLInputElement).value), row: Number(($('harpyRow') as HTMLInputElement).value) } }); };
function setSideControlsOpen(open: boolean, focus = true, persist = true) {
  const panel = $('sideControls'), toggle = $('sideControlToggle');
  panel.classList.toggle('open', open); panel.setAttribute('aria-hidden', String(!open)); toggle.setAttribute('aria-expanded', String(open));
  panel.inert = !open;
  if (persist) updateDmUiPreferences('sideControlsOpen', open);
  if (focus && open) requestAnimationFrame(() => ($('sideControlClose') as HTMLButtonElement).focus());
  else if (focus) toggle.focus();
}
$('sideControlToggle').onclick = () => setSideControlsOpen(!$('sideControls').classList.contains('open'));
$('sideControlClose').onclick = () => setSideControlsOpen(false);
$('undoObject').onclick = () => { if (state?.undo.entryId) command({ type: 'object:undo', entryId: state.undo.entryId }); };
$('rotateObject').onclick = () => { if (!draft) return; const index = draft.allowedRotations.indexOf(draft.rotation); draft.rotation = draft.allowedRotations[(index + 1) % draft.allowedRotations.length]!; renderDraft(); };
$('applyObject').onclick = () => { if (!draft || !draftAction || !draftValid(draft) || draftAction.connectionGeneration !== connectionGeneration) return; const common = { objectRevision: draftAction.objectRevision, cell: draft.cell, rotation: draft.rotation }; const id = draftAction.type === 'detach' ? command(draftAction.requestId ? { type: 'resolveInteraction', requestId: draftAction.requestId, result: draftAction.outcome, ...common } : { type: 'object:detach', objectId: draft.id, outcome: draftAction.outcome, ...common }) : draftAction.type === 'structure' ? command({ type: 'object:structure', objectId: draft.id, structure: draftAction.structure, objectRevision: draftAction.objectRevision }) : command({ type: 'object:transform', objectId: draft.id, ...common }); if (id) pendingDraftCommand = { commandId: id, generation: connectionGeneration }; };
$('cancelObject').onclick = () => { clearDraft(); renderObjects(state!); };
addEventListener('keydown', event => { if (event.key === 'Escape' && $('sideControls').classList.contains('open')) { setSideControlsOpen(false); return; } if (event.key === 'Escape' && draft) { clearDraft(); renderObjects(state!); } });
function listSection(title: string, values: string[]) {
  const section = document.createElement('section'), heading = document.createElement('h3'), list = document.createElement('ul');
  heading.textContent = title; list.replaceChildren(...values.map(value => { const item = document.createElement('li'); item.textContent = value; return item; })); section.append(heading, list); return section;
}

function openCombatSheet(current: DmState, participant: DmState['combat']['participants'][number]) {
  conditionSheetEntityId = participant.id;
  const dialog = $('combatSheetDialog') as HTMLDialogElement, player = current.characters.find(character => character.id === participant.id), creature = current.creature?.id === participant.id ? current.creature : null, npc = current.npcs.find(candidate => candidate.id === participant.id);
  $('combatSheetKicker').textContent = participant.kind === 'player' ? 'HOJA DE PERSONAJE' : participant.kind === 'npc' ? 'HOJA DE PNJ' : 'HOJA DE CRIATURA';
  $('combatSheetName').textContent = participant.label;
  $('combatSheetSummary').textContent = `${participant.active ? 'En combate' : 'Fuera de combate'} · ${participant.controller === 'player' ? 'controlado por jugador' : 'controlado por DM'}`;
  const stats = $('combatSheetStats'); stats.replaceChildren(...[
    ['PG', `${participant.hp}/${participant.maxHp}`], ['Clase de armadura', String(participant.armorClass)], ['Velocidad', `${participant.speedMeters} m`], ['Iniciativa', `${participant.initiative >= 0 ? '+' : ''}${participant.initiative}`]
  ].map(([label, value]) => { const item = document.createElement('div'), title = document.createElement('b'), text = document.createElement('span'); title.textContent = label ?? ''; text.textContent = value ?? ''; item.append(title, text); return item; }));
  const body = $('combatSheetBody'); body.replaceChildren();
  body.before(dmConditionPanel.root); refreshSheetConditions(current);
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
  conditionSheetEntityId = npc.id;
  const dialog = $('combatSheetDialog') as HTMLDialogElement;
  $('combatSheetKicker').textContent = 'HOJA DE PNJ';
  $('combatSheetName').textContent = npc.label;
  $('combatSheetSummary').textContent = npc.visible ? 'Presente en escena · controlado por DM' : 'Oculto · controlado por DM';
  const stats = $('combatSheetStats'); stats.replaceChildren(...[
    ['PG', `${npc.hp}/${npc.maxHp}`], ['Clase de armadura', String(npc.armorClass)], ['Velocidad', `${npc.speedMeters} m`], ['Estado', npc.combatEnabled ? 'Disponible para combate' : 'Escénico']
  ].map(([label = '', value = '']) => { const item = document.createElement('div'), title = document.createElement('b'), text = document.createElement('span'); title.textContent = label; text.textContent = value; item.append(title, text); return item; }));
  const body = $('combatSheetBody'); body.replaceChildren();
  body.before(dmConditionPanel.root); if (state) refreshSheetConditions(state);
  if (npc.traits.length) body.append(listSection('Rasgos', npc.traits));
  body.append(listSection('Acciones', npc.attacks.map(action => action.label)));
  if (!dialog.open) dialog.showModal();
}

function openEntitySheet(current: DmState, id: string) {
  const participant = current.combat.participants.find(entity => entity.id === id);
  if (participant) { openCombatSheet(current, participant); return; }
  const player = current.characters.find(entity => entity.id === id), npc = current.npcs.find(entity => entity.id === id), creature = current.creature?.id === id ? current.creature : null;
  if (npc) { openNpcSheet(npc); return; }
  const entity = player ?? creature; if (!entity) return;
  openCombatSheet(current, { id, label: entity.label, kind: player ? 'player' : 'creature', controller: player ? 'player' : 'dm', active: false, hp: entity.hp, maxHp: entity.maxHp, armorClass: player ? player.sheet?.armorClass ?? 10 : creature!.armorClass, speedMeters: player ? player.sheet?.speedMeters ?? 7.5 : creature!.speedMeters, initiative: 0, initiativeSubmitted: false, attacks: [], conditions: entity.conditions ?? [] });
}
function refreshSheetConditions(current: DmState) {
  if (!conditionSheetEntityId) return;
  const entity = current.characters.find(candidate => candidate.id === conditionSheetEntityId) ?? current.npcs.find(candidate => candidate.id === conditionSheetEntityId) ?? (current.creature?.id === conditionSheetEntityId ? current.creature : null);
  if (!entity) { ($('combatSheetDialog') as HTMLDialogElement).close(); conditionSheetEntityId = null; return; }
  dmConditionPanel.update(entity, 'sheet' in entity ? entity.sheet?.features : []);
  const hpValue = $('combatSheetStats').firstElementChild?.querySelector('span'); if (hpValue) hpValue.textContent = `${entity.hp}/${entity.maxHp}`;
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

function showCombatExit(cancel = false) {
  if (!state?.combat.active || state.combat.prompt) return;
  const dialog = $('combatExitDialog') as HTMLDialogElement;
  $('combatExitTitle').textContent = cancel ? 'Cancelar preparación del combate' : 'Volver a exploración';
  $('combatExitNote').textContent = cancel ? 'Todavía no han empezado los turnos. Se descartan las iniciativas y la acción hostil seleccionada.' : 'Confirma que ha cesado el enfrentamiento: enemigos derrotados, tregua, rendición o retirada. Si continúa una persecución, resuélvela en la mesa. Se conservan PG, recursos, condiciones y concentración.';
  $('confirmCombatExit').onclick = () => { dialog.close(); command({ type: cancel ? 'combat:cancel' : 'combat:end' }); };
  dialog.showModal();
}

function showCombatWithdrawal(entityId: string, label: string) {
  if (!state?.combat.active || state.combat.prompt || !state.combat.participants.some(actor => actor.id === entityId)) return;
  const dialog = $('combatExitDialog') as HTMLDialogElement;
  $('combatExitTitle').textContent = `Retirada de ${label}`;
  $('combatExitNote').textContent = 'Confirma que ya está fuera del enfrentamiento. Si sigue amenazado o perseguido, debe continuar en iniciativa. No se mueve ni se cura la ficha, ni se recuperan recursos.';
  $('confirmCombatExit').onclick = () => { dialog.close(); command({ type: 'combat:withdraw', entityId }); };
  if (!dialog.open) dialog.showModal();
}

function configureCampRosette(point: CampPoint, sceneId: string) {
  showCampPoint(point, sceneId, false);
  const actions = $('campPointActions');
  actions.append(localButton('Ficha del objeto', () => { objectRosette?.close(); showCampPoint(point, sceneId); }));
  if (($('campPointActor') as HTMLSelectElement).options.length > 1) {
    for (const button of actions.querySelectorAll<HTMLButtonElement>('li button')) button.onclick = () => { objectRosette?.close(); showCampPoint(point, sceneId); };
  }
}
function openCampRosette(point: CampPoint, sceneId: string, anchor: { x: number; y: number }) {
  campRosetteSelection = { sceneId, pointId: point.id };
  configureCampRosette(point, sceneId);
  rosetteSource = 'campPointActions'; objectRosette?.show(point.label, anchor, () => world?.mapCellScreenPoint(point.objectCell ?? point.cell, point.surfaceId) ?? null);
}

function updateMapTargets(current: DmState) {
  if (!mapTargets) return;
  const targets = current.objects.map(object => ({ id: object.id, label: object.label,
    project: () => projectDmObject(object.id),
    select: (anchor: { x: number; y: number }) => { clearDraft(); selectObject(object.id); rosetteSource = 'objects'; objectRosette?.show(object.label, anchor, () => projectDmObject(object.id)); } }));
  for (const pickup of current.pickups ?? []) if (!pickup.collected && pickup.available) targets.push({ id: pickup.id, label: pickup.label,
    project: () => world?.mapCellScreenPoint(pickup.cell, pickup.surfaceId) ?? null,
    select: anchor => { clearDraft(); selectedId = null; inspectedPickupId = pickup.id; renderObjects(state!); rosetteSource = 'objects'; objectRosette?.show(pickup.label, anchor, () => world?.mapCellScreenPoint(pickup.cell, pickup.surfaceId) ?? null); } });
  const scene = currentScene();
  for (const point of scene?.camp?.interactionPoints ?? []) targets.push({ id: point.id, label: point.label,
    project: () => world?.mapCellScreenPoint(point.objectCell ?? point.cell, point.surfaceId) ?? null,
    select: anchor => { clearDraft(); openCampRosette(point, scene!.id, anchor); } });
  mapTargets.update(targets, mapObjectsHighlighted && !draft && !armedDmCombatPoint);
}

function sceneObjectAccess(current: DmState, extra: string[] = []) {
  const count = current.objects.length + (current.pickups?.filter(pickup => !pickup.collected).length ?? 0) + (currentScene()?.camp?.interactionPoints.length ?? 0);
  const block = sceneBlock('INTERACTUABLES', [`${count} objetos`, ...extra]);
  if (count) block.append(localButton('◇ Resaltar en el mapa', () => { openWorkspaceWindow('mapWindow'); setMapToolPanel(null); setMapHighlights(true); }));
  return block;
}

const initiativeDrafts = new Map<string, string>();
let initiativeDraftEpoch = '';
let inspectedTurnId: string | null = null;
const combatConditionIcons: Record<string, string> = Object.fromEntries(Object.entries(conditionPresentation).map(([condition, presentation]) => [condition, presentation.glyph]));
function renderCombat(current: DmState) {
  const box = $('combat'), combat = current.combat;
  preserveDisclosures(box, `combat:${current.runtimeEpoch}:${current.sceneEpoch}`);
  // Follow the turn unless the DM explicitly inspected another participant.
  if (combat.currentId !== inspectedTurnId) {
    if (!selectedCombatantId || selectedCombatantId === inspectedTurnId) selectedCombatantId = combat.currentId;
    inspectedTurnId = combat.currentId;
  }
  const epoch = `${current.runtimeEpoch}:${current.sceneEpoch}:${combat.initiativePending}`;
  if (initiativeDraftEpoch !== epoch) { initiativeDrafts.clear(); initiativeDraftEpoch = epoch; }
  const renderKey = JSON.stringify([combat, current.sceneId, selectedCombatantId, dmCombatActionCategory, armedDmCombatPoint?.actorId, armedDmCombatPoint?.action.id, current.characters.map(character => [character.id, character.claimed, character.sceneId, character.hp]), current.creature?.visible, current.creature?.hp, current.npcs.map(npc => [npc.id, npc.visible, npc.combatEnabled, npc.hp])]);
  if (box.dataset.renderKey === renderKey && box.childElementCount) return;
  box.dataset.renderKey = renderKey; box.replaceChildren();
  if (armedDmCombatPoint && (!combat.active || Boolean(combat.prompt) || armedDmCombatPoint.actorId !== combat.currentId && armedDmCombatPoint.action.actionCost !== 'reaction')) { armedDmCombatPoint = null; world?.clearAttackRange(); }
  if (!combat.active) {
    selectedCombatantId = null;
    const hasOpponent = Boolean(current.creature?.visible && current.creature.hp > 0) || current.npcs.some(npc => npc.visible && npc.combatEnabled && npc.hp > 0);
    const start = document.createElement('button'); start.className = 'primary'; start.textContent = 'Iniciar combate'; start.disabled = !hasOpponent || !current.characters.some(character => character.claimed); start.onclick = () => command({ type: 'combat:start' });
    const note = document.createElement('p'); note.className = 'note'; note.textContent = start.disabled ? 'Revela un oponente y asegúrate de que haya al menos un personaje conectado en esta escena.' : 'Declara quién participa en el encuentro. Cada implicado tira iniciativa; el DM registra los PNJ, decide los empates y confirma el orden. Si alguien es sorprendido, tira iniciativa con desventaja (2024).';
    box.append(emptyState('Sin combate activo', start.disabled ? 'Prepara un oponente y un personaje asignado.' : 'Participantes listos. El DM decide cuándo empezar.'), start, disclosure('combat:start-help', 'Iniciativa y criterios del DM', note));
    if (combat.lastEvent?.kind === 'defeat') { const outcome = document.createElement('p'); outcome.className = 'combat-last-event'; outcome.textContent = combat.lastEvent.text; box.append(outcome); }
    return;
  }
  if (combat.initiativePending) {
    const header = document.createElement('header'), title = document.createElement('div'), heading = document.createElement('h2'), note = document.createElement('p'), end = document.createElement('button');
    heading.textContent = 'Iniciativa'; note.className = 'note'; note.textContent = 'Cada participante tira físicamente 1d20 + su modificador e introduce el total. El DM resuelve los empates. El programa no tira dados.';
    const help = document.createElement('details'), helpTitle = document.createElement('summary'); helpTitle.textContent = 'Dados físicos · cómo registrar'; help.append(helpTitle, note); title.append(heading, help);
    end.textContent = 'Cancelar'; end.onclick = () => showCombatExit(true); header.className = 'combat-deck-header'; header.append(title, end); box.append(header);
    const roster = document.createElement('div'); roster.className = 'combat-roster initiative-entry-list';
    for (const participant of combat.participants) {
      const card = document.createElement('article'), name = document.createElement('div'), identity = document.createElement('div'), label = document.createElement('b'), status = document.createElement('p'), input = document.createElement('input'), save = document.createElement('button');
      card.className = 'combat-card initiative-card'; name.className = 'combat-card-init-name'; label.textContent = participant.label; identity.className = 'combat-card-identity'; identity.append(label); name.append(combatantPortrait(current, participant), identity);
      status.className = 'combat-card-meta'; status.textContent = participant.initiativeSubmitted ? `✓ Registrada · ${participant.initiative}` : participant.controller === 'player' ? 'Jugador · pendiente' : 'DM · pendiente'; identity.append(status);
      input.type = 'number'; input.min = '-20'; input.max = '40'; input.placeholder = 'Total'; input.setAttribute('aria-label', `Iniciativa de ${participant.label}`); input.value = initiativeDrafts.get(participant.id) ?? (participant.initiativeSubmitted ? String(participant.initiative) : '');
      input.oninput = () => initiativeDrafts.set(participant.id, input.value);
      input.inputMode = 'numeric'; save.textContent = '✓'; save.title = `${participant.initiativeSubmitted ? 'Corregir' : 'Registrar'} iniciativa de ${participant.label}`; save.setAttribute('aria-label', save.title);
      const submit = () => { if (!input.value.trim()) return toast('Introduce el resultado de los dados.'); const total = Number(input.value); if (!Number.isInteger(total) || total < -20 || total > 40) return toast('Introduce un total entero entre -20 y 40.'); initiativeDrafts.delete(participant.id); command({ type: 'combat:initiative', entries: [{ id: participant.id, initiative: total }] }); };
      save.onclick = submit; input.onkeydown = event => { if (event.key === 'Enter') submit(); };
      card.append(name, input, save); roster.append(card);
    }
    box.append(roster);
    const allSubmitted = combat.participants.every(participant => participant.initiativeSubmitted);
    if (!allSubmitted) {
      const footer = document.createElement('footer'), waiting = document.createElement('span'), confirm = document.createElement('button'); footer.className = 'initiative-confirm';
      waiting.textContent = `${combat.participants.filter(participant => !participant.initiativeSubmitted).length} tiradas pendientes`; confirm.textContent = 'Empezar'; confirm.className = 'primary'; confirm.disabled = true; footer.append(waiting, confirm); box.append(footer); return;
    }
    const orderPanel = document.createElement('section'), orderTitle = document.createElement('h3'), orderNote = document.createElement('p');
    orderPanel.className = 'combat-panel initiative-order'; orderTitle.textContent = 'Orden de turnos'; orderNote.className = 'note'; orderNote.textContent = 'De mayor a menor. Las flechas solo ajustan empates.'; orderPanel.append(orderTitle, orderNote);
    const orderedIds = combat.order.map(item => item.id);
    for (let index = 0; index < orderedIds.length; index++) {
      const id = orderedIds[index]!, participant = combat.participants.find(item => item.id === id)!;
      const row = document.createElement('div'), label = document.createElement('span'), up = document.createElement('button'), down = document.createElement('button');
      row.className = 'button-row'; label.textContent = `${index + 1}. ${participant.label} · ${participant.initiative}`;
      const previous = index > 0 ? combat.participants.find(item => item.id === orderedIds[index - 1]) : undefined;
      const following = index < orderedIds.length - 1 ? combat.participants.find(item => item.id === orderedIds[index + 1]) : undefined;
      up.textContent = '↑'; down.textContent = '↓'; up.title = 'Subir dentro de un empate'; down.title = 'Bajar dentro de un empate'; up.disabled = !previous || previous.initiative !== participant.initiative; down.disabled = !following || following.initiative !== participant.initiative;
      const move = (delta: -1 | 1) => { const next = [...orderedIds], other = index + delta; [next[index], next[other]] = [next[other]!, next[index]!]; command({ type: 'combat:initiativeOrder', order: next, confirm: false }); };
      up.onclick = () => move(-1); down.onclick = () => move(1); row.className = 'initiative-order-row'; row.append(label); if (previous?.initiative === participant.initiative || following?.initiative === participant.initiative) row.append(up, down); orderPanel.append(row);
    }
    const footer = document.createElement('footer'), confirm = document.createElement('button'); footer.className = 'initiative-confirm'; confirm.className = 'primary'; confirm.textContent = 'Confirmar y empezar'; confirm.onclick = () => command({ type: 'combat:initiativeOrder', order: orderedIds, confirm: true }); footer.append(confirm); box.append(orderPanel, footer); return;
  }
  const active = combat.participants.find(participant => participant.id === combat.currentId), header = document.createElement('header'), title = document.createElement('div'), heading = document.createElement('h2'), turn = document.createElement('p'), controls = document.createElement('div');
  const activeIncapacitated = Boolean(active?.conditions.some(condition => condition === 'paralizada' || condition === 'inconsciente'));
  heading.textContent = `Ronda ${combat.round}`; turn.className = 'combat-turn'; turn.textContent = `Turno de ${active?.label ?? '—'}${activeIncapacitated ? ' · incapacitada' : combat.movement ? ` · ${(combat.movement.remainingSquares * 1.5).toFixed(1)} m disponibles` : ''}`; title.append(heading, turn);
  const next = document.createElement('button'); next.className = 'primary'; next.textContent = 'Siguiente →'; next.disabled = Boolean(combat.prompt); next.onclick = () => command({ type: 'combat:endTurn' });
  const end = document.createElement('button'); end.className = 'danger'; end.textContent = 'Finalizar combate'; end.disabled = Boolean(combat.prompt); end.title = combat.prompt ? 'Resuelve la acción pendiente antes de finalizar.' : 'El DM confirma el fin de las hostilidades.'; end.onclick = () => showCombatExit();
  const overview = document.createElement('button'); overview.textContent = '⌖'; overview.title = world?.combatOverview ? 'Ver combate' : 'Mapa completo'; overview.setAttribute('aria-label', overview.title); overview.setAttribute('aria-pressed', String(Boolean(world?.combatOverview))); overview.onclick = () => { world?.setCombatOverview(!world.combatOverview); delete box.dataset.renderKey; renderCombat(current); };
  const management = document.createElement('details'), managementTitle = document.createElement('summary'); management.className = 'combat-management'; managementTitle.textContent = '⋯'; managementTitle.setAttribute('aria-label', 'Gestionar combate'); management.append(managementTitle, end);
  controls.className = 'button-row'; controls.append(overview, next, management); header.className = 'combat-deck-header'; header.append(title, controls); box.append(header);
  const preview = document.createElement('nav'); preview.className = 'dm-turn-preview'; preview.setAttribute('aria-label', 'Turno actual, tres siguientes y previsión hasta siete');
  for (const entry of combatTimeline(combat.order, combat.participants, combat.currentId, combat.round)) {
    const button = document.createElement('button'), caption = document.createElement('small'); button.type = 'button'; button.className = `turn-preview-${entry.horizon}`;
    button.title = `${entry.participant.label} · ${entry.index === 0 ? 'ahora' : `dentro de ${entry.index} turnos · ronda ${entry.round}`} · previsión sin cambios de iniciativa`;
    button.setAttribute('aria-label', button.title); caption.textContent = entry.index === 0 ? 'Ahora' : `+${entry.index} · R${entry.round}`;
    button.append(combatantPortrait(current, entry.participant), caption); button.onclick = () => { selectedCombatantId = entry.participant.id; renderCombat(current); }; preview.append(button);
  }
  box.append(preview);
  const roster = document.createElement('div'); roster.className = 'combat-roster combat-participant-strip'; roster.setAttribute('aria-label', 'Orden de turnos · selecciona un combatiente');
  const orderedParticipants = combat.order.flatMap(entry => combat.participants.filter(participant => participant.id === entry.id));
  for (const participant of orderedParticipants) {
    const card = document.createElement('button'), name = document.createElement('span'), ordinal = document.createElement('small');
    card.type = 'button'; card.className = `combat-participant${participant.id === combat.currentId ? ' current' : ''}`;
    card.setAttribute('aria-pressed', String(participant.id === (selectedCombatantId ?? combat.currentId)));
    card.setAttribute('aria-label', `Seleccionar ${participant.label}, PG ${participant.hp}/${participant.maxHp}${participant.id === combat.currentId ? ', en turno' : ''}`);
    ordinal.textContent = String(orderedParticipants.indexOf(participant) + 1); name.textContent = participant.label;
    const bar = document.createElement('div'), fill = document.createElement('i'); bar.className = 'combat-card-hp'; fill.style.width = `${Math.max(0, Math.min(100, participant.hp / Math.max(1, participant.maxHp) * 100))}%`; bar.append(fill);
    card.append(ordinal, combatantPortrait(current, participant), name, bar);
    card.onclick = () => { selectedCombatantId = participant.id; renderCombat(current); }; roster.append(card);
  }
  box.append(roster);
  const panel = document.createElement('section'); panel.className = 'combat-panel';
  if (!active) { panel.textContent = 'Esperando al siguiente combatiente.'; box.append(panel); return; }
  const selected = combat.participants.find(participant => participant.id === selectedCombatantId) ?? active;
  const panelTitle = document.createElement('button'), panelIdentity = document.createElement('span'), panelName = document.createElement('strong'), panelHint = document.createElement('small'); panelTitle.type = 'button'; panelTitle.className = 'combat-inspector-name'; panelName.textContent = selected.label; panelHint.textContent = `${selected.id === active.id ? 'En turno' : 'Consulta'} · abrir ficha`; panelIdentity.append(panelName, panelHint); panelTitle.append(combatantPortrait(current, selected), panelIdentity); panelTitle.onclick = () => openCombatSheet(current, selected); panel.append(panelTitle);
  const grid = document.createElement('div'); grid.className = 'combat-panel-grid'; const summary = document.createElement('div'), actions = document.createElement('div');
  const incapacitated = selected.conditions.some(condition => condition === 'paralizada' || condition === 'inconsciente');
  const stats = document.createElement('div'); stats.className = 'combat-stat-row';
  const hpLabel = document.createElement('label'), hpInput = document.createElement('input'), hpMaximum = document.createElement('span'); hpLabel.className = 'combat-hp-editor'; hpLabel.append('PG '); hpInput.type = 'number'; hpInput.inputMode = 'numeric'; hpInput.min = '0'; hpInput.max = String(selected.maxHp); hpInput.value = String(selected.hp); hpInput.setAttribute('aria-label', `Puntos de golpe de ${selected.label}`); hpMaximum.textContent = `/ ${selected.maxHp}`;
  hpInput.onchange = () => { const hp = Number(hpInput.value); if (!hpInput.value.trim() || !Number.isInteger(hp) || hp < 0 || hp > selected.maxHp) { hpInput.value = String(selected.hp); toast('Introduce PG entre 0 y el máximo.'); return; } command(selected.kind === 'player' ? { type: 'hp', characterId: selected.id, hp } : { type: 'entity:hp', entityId: selected.id, hp }); };
  hpLabel.append(hpInput, hpMaximum); stats.append(hpLabel);
  for (const value of [`CA ${selected.armorClass}`, `${selected.speedMeters} m`]) { const stat = document.createElement('span'); stat.className = 'combat-stat-chip'; stat.textContent = value; stats.append(stat); }
  summary.append(stats);
  const economy = document.createElement('div'); economy.className = 'dm-turn-resources'; economy.setAttribute('aria-label', `Recursos de ${selected.label}`);
  for (const indicator of combatTurnIndicators({ pending: combat.initiativePending, incapacitated, isTurn: selected.id === combat.currentId, remainingSquares: combat.movement?.remainingSquares, maximumSquares: combat.movement?.maximumSquares, actionUsed: Boolean(combat.actionUsed[selected.id]), bonusActionUsed: Boolean(combat.bonusActionUsed[selected.id]), reactionUsed: Boolean(combat.reactionUsed[selected.id]), hasBonus: selected.attacks.some(action => action.actionCost === 'bonus') })) {
    const item = document.createElement('span'); item.className = indicator.ready ? 'ready' : ''; item.textContent = `${indicator.label}: ${indicator.value}`; economy.append(item);
  }
  summary.append(economy);
  if (selected.conditions.length || combat.concentration[selected.id]) {
    const states = document.createElement('button'); states.type = 'button'; states.className = 'combat-state-summary'; states.textContent = [selected.conditions.map(condition => combatConditionIcons[condition] ?? '◈').join(' '), combat.concentration[selected.id] ? '✦ Concentración' : ''].filter(Boolean).join(' · '); states.title = [...selected.conditions, ...(combat.concentration[selected.id] ? [combat.concentration[selected.id]!.label] : [])].join(', '); states.setAttribute('aria-label', `Gestionar estados: ${states.title}`); states.onclick = () => { dmCombatActionCategory = 'dm'; renderCombat(current); }; summary.append(states);
  }
  if (current.mimicInstruction?.entityId === selected.id) {
    const instruction = document.createElement('p'); instruction.className = 'note'; instruction.textContent = `Imita a ${combat.participants.find(actor => actor.id === current.mimicInstruction!.sourceId)?.label ?? current.mimicInstruction.sourceId}: ${current.mimicInstruction.label}`;
    summary.append(instruction);
    const exception = document.createElement('button'); exception.textContent = 'Resolver imitación imposible con el DM';
    exception.disabled = selected.id !== combat.currentId || Boolean(combat.prompt) || Boolean(combat.actionUsed[selected.id]);
    exception.onclick = () => { if (confirm('Usar la acción del Reflejo para una excepción narrada por el DM (sin daño ni efectos automáticos). Gestiona cualquier consecuencia desde la ficha.')) command({ type: 'combat:basic', attackerId: selected.id, action: 'magic' }); };
    summary.append(exception);
  }
  const withdraw = document.createElement('button'); withdraw.textContent = `Retirar a ${selected.label}`; withdraw.disabled = Boolean(combat.prompt); withdraw.title = 'Úsalo cuando haya escapado, se haya rendido o ya no participe. No mueve ni cura la ficha.';
  withdraw.onclick = () => showCombatWithdrawal(selected.id, selected.label); management.append(withdraw);
  if (combat.lastEvent?.text) { const history = document.createElement('details'), historyTitle = document.createElement('summary'), event = document.createElement('p'); history.className = 'combat-event-disclosure'; historyTitle.textContent = 'Último suceso'; event.className = 'combat-last-event'; event.textContent = combat.lastEvent.text; history.append(historyTitle, event); summary.append(history); }
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
  if (!counts.get(dmCombatActionCategory)) dmCombatActionCategory = categories.find(category => counts.get(category.id))?.id ?? 'dm';
  const tabs = document.createElement('div'); tabs.className = 'dm-combat-tabs'; tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', `Acciones de ${selected.label}`);
  for (const category of categories) {
    if (!counts.get(category.id)) continue;
    const tab = document.createElement('button'), icon = document.createElement('i'), label = document.createElement('span'), count = document.createElement('small');
    tab.type = 'button'; tab.className = 'dm-combat-tab'; tab.setAttribute('role', 'tab'); tab.setAttribute('aria-selected', String(dmCombatActionCategory === category.id)); tab.setAttribute('aria-label', `${category.label}, ${counts.get(category.id) ?? 0} acciones`); tab.title = category.label;
    icon.setAttribute('aria-hidden', 'true'); icon.textContent = category.icon; label.textContent = category.label; count.textContent = String(counts.get(category.id) ?? 0); tab.append(icon, label, count);
    const choose = () => { if (dmCombatActionCategory !== category.id) { dmCombatActionCategory = category.id; updateDmUiPreferences('combatActionCategory', category.id); renderCombat(current); } };
    tab.addEventListener('pointerdown', event => { if (event.pointerType === 'mouse' && event.button !== 0) return; event.preventDefault(); event.stopPropagation(); choose(); });
    tab.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); if (event.detail === 0) choose(); });
    tabs.append(tab);
  }
  actions.className = 'dm-combat-actions'; actions.append(tabs);
  const status = document.createElement('p'); status.className = 'dm-combat-action-meta';
  status.textContent = incapacitated ? 'Incapacitada · sin movimiento, acciones ni reacciones' : selected.id !== active.id ? 'Fuera de su turno · sólo reacciones con desencadenante válido' : 'Turno propio · consulta los recursos disponibles en el panel';
  actions.append(status);
  if (armedDmCombatPoint?.actorId === selected.id) {
    const choice = armedDmCombatPoint, selection = document.createElement('div'), note = document.createElement('p'), cancel = document.createElement('button'), rules = document.createElement('details'), rulesTitle = document.createElement('summary'), rulesText = document.createElement('p');
    rulesTitle.textContent = 'Reglas de la acción'; rules.append(rulesTitle, rulesText);
    const updateNote = () => { note.textContent = `${choice.action.label.split(' · ')[0]} · elige ${choice.action.targeting === 'point' ? 'una casilla' : 'una ficha'} en el mapa.`; rulesText.textContent = `${combatActionDescription(choice.action, enemies.find(enemy => enemy.id === target.value)?.armorClass)} Escape cancela sin gastar recursos.`; };
    updateNote(); target.onchange = updateNote;
    cancel.textContent = 'Cancelar selección'; cancel.onclick = () => { armedDmCombatPoint = null; world?.clearAttackRange(); renderCombat(current); };
    selection.className = 'combat-prompt'; selection.append(note, rules, cancel);
    if (choice.action.targeting !== 'point') {
      const confirm = document.createElement('button'); confirm.textContent = 'Declarar sobre el objetivo elegido'; confirm.disabled = !enemies.length || Boolean(combat.prompt);
      confirm.onclick = () => { command({ type: 'combat:declare', attackerId: selected.id, targetId: target.value, actionId: choice.action.id, useSneakAttack: true }); armedDmCombatPoint = null; world?.clearAttackRange(); renderCombat(current); };
      selection.append(confirm);
    }
    actions.append(selection);
  }
  if (!canControl && dmCombatActionCategory !== 'dm' && dmCombatActionCategory !== 'reaction') { const note = document.createElement('p'); note.className = 'note'; note.textContent = selected.controller === 'player' ? 'El personaje elige su objetivo desde su pantalla. El DM puede consultar la ficha y gestionar sus condiciones en la pestaña DM.' : `Las acciones de ${selected.label} estarán disponibles cuando llegue su turno.`; actions.append(note); }
  else {
    if (enemies.length) actions.append(target);
    const actionList = document.createElement('div'); actionList.className = 'combat-action-list';
    const appendAttack = (action: CombatAction) => {
      const button = document.createElement('button'), costUsed = action.actionCost === 'reaction' ? combat.reactionUsed[selected.id] : action.actionCost === 'bonus' ? combat.bonusActionUsed[selected.id] : combat.actionUsed[selected.id];
      const sequence = combat.sequences?.[selected.id];
      const detail = combatActionDescription(action, enemies.find(enemy => enemy.id === target.value)?.armorClass, sequence?.actionId === action.id ? sequence.remaining : undefined);
      button.type = 'button'; button.textContent = `${action.magical ? '✦' : action.range?.kind === 'ranged' ? '➶' : '⚔'} ${action.label.split(' · ')[0]}`; button.title = detail; button.setAttribute('aria-label', `${action.label}. ${detail}`);
      const continuing = combat.sequences?.[selected.id]?.actionId === action.id;
      button.disabled = incapacitated || action.targeting !== 'point' && !enemies.length || Boolean(combat.prompt) || !continuing && (Boolean(costUsed) || Boolean(action.recharge && combat.recharge[selected.id]?.[action.id] === false));
      button.onclick = () => {
        armedDmCombatPoint = { actorId: selected.id, action }; world?.showAttackRange(selected.id, action.range?.normalMeters ?? 0, action.range?.longMeters); renderCombat(current);
      }; actionList.append(button);
      if (action.recharge && combat.recharge[selected.id]?.[action.id] === false) {
        const recharge = document.createElement('button'); recharge.type = 'button'; recharge.textContent = 'Recarga · tirar 1d6';
        recharge.disabled = selected.id !== combat.currentId || Boolean(combat.prompt) || Boolean(combat.actionUsed[selected.id]);
        recharge.onclick = () => { const answer = prompt('D6 físico de recarga (1–6). Solo un intento por turno:'); if (answer === null) return; const d6 = Number(answer); if (Number.isInteger(d6) && d6 >= 1 && d6 <= 6) command({ type: 'combat:recharge', attackerId: selected.id, actionId: action.id, d6 }); };
        actionList.append(recharge);
      }
    };
    const appendBasic = (action: BasicCombatAction, label: string) => {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = label; button.title = actionTips[action]; button.disabled = !canControl || incapacitated || Boolean(combat.prompt) || Boolean(combat.actionUsed[selected.id]) || action === 'help' && !enemies.length;
      button.onclick = () => command({ type: 'combat:basic', attackerId: selected.id, action, ...(action === 'help' ? { targetId: target.value } : {}) }); actionList.append(button);
    };
    if (dmCombatActionCategory === 'dm') {
      const controls = document.createElement('div'); controls.className = 'dm-combat-dm-controls';
      const sheet = document.createElement('button'); sheet.textContent = 'Ver ficha del combatiente'; sheet.onclick = () => openCombatSheet(current, selected); controls.append(sheet);
      if (combat.concentration[selected.id]) {
        const end = document.createElement('button'); end.textContent = 'Terminar concentración';
        end.onclick = () => command({ type: 'combat:endConcentration', entityId: selected.id }); controls.append(end);
      }
      const conditionRow = document.createElement('div'); conditionRow.className = 'dm-combat-conditions'; conditionRow.setAttribute('aria-label', 'Condiciones del combatiente');
      for (const condition of ['envenenada', 'apresada', 'agarrada', 'derribada', 'asustada', 'hechizada', 'paralizada', 'inconsciente', 'oculta', 'invisible', 'restringida'] as const) {
        const button = document.createElement('button'), enabled = selected.conditions.includes(condition); button.type = 'button'; button.className = 'condition-pill'; button.textContent = combatConditionIcons[condition] ?? '◈'; button.title = `${enabled ? 'Quitar' : 'Añadir'} ${condition}`; button.setAttribute('aria-label', button.title); button.setAttribute('aria-pressed', String(enabled)); button.onclick = () => command({ type: 'combat:condition', entityId: selected.id, condition, active: !enabled }); conditionRow.append(button);
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
  if (combat.prompt) {
    const prompt = document.createElement('section'), text = document.createElement('strong'), instruction = document.createElement('p'), compact = compactCombatPrompt(combat.prompt); prompt.className = 'combat-prompt combat-roll-card'; text.textContent = `${compact.label} · ${compact.title}`; instruction.className = 'note'; instruction.textContent = compact.instruction; prompt.append(text, instruction);
    if (combat.prompt.stage === 'reaction') {
      const choices = document.createElement('div'), accept = document.createElement('button'), decline = document.createElement('button'); choices.className = 'button-row'; accept.className = 'primary'; accept.textContent = 'Atacar · gastar reacción'; decline.textContent = 'Dejar pasar'; accept.onclick = () => command({ type: 'combat:reaction', promptId: combat.prompt!.id, accept: true }); decline.onclick = () => command({ type: 'combat:reaction', promptId: combat.prompt!.id, accept: false }); choices.append(accept, decline); prompt.append(choices);
    } else {
      const input = document.createElement('input'), submit = document.createElement('button'), row = document.createElement('div'); row.className = 'combat-roll-input'; input.type = 'number'; input.inputMode = 'numeric'; input.placeholder = compact.placeholder; input.setAttribute('aria-label', `${compact.label} física`); input.min = String(combat.prompt.minimum ?? -30); input.max = String(combat.prompt.maximum ?? 200); submit.className = 'primary'; submit.textContent = 'Confirmar'; submit.onclick = () => { const value = Number(input.value); if (!input.value.trim() || !Number.isInteger(value) || value < (combat.prompt!.minimum ?? -30) || value > (combat.prompt!.maximum ?? 200)) return toast('Introduce un resultado entero.'); const type = combat.prompt!.stage === 'attack' ? 'combat:rollAttack' : combat.prompt!.stage === 'damage' ? 'combat:rollDamage' : combat.prompt!.stage === 'death-save' ? 'combat:rollDeathSave' : 'combat:rollSave'; command({ type, promptId: combat.prompt!.id, ...(type === 'combat:rollAttack' || type === 'combat:rollDeathSave' ? { d20: value } : type === 'combat:rollDamage' ? { diceTotal: value } : { total: value }) }); }; input.onkeydown = event => { if (event.key === 'Enter') submit.click(); }; row.append(input, submit); prompt.append(row);
    }
    const details = document.createElement('details'), caption = document.createElement('summary'), explanation = document.createElement('p'); caption.textContent = 'Detalles'; explanation.textContent = `${combat.prompt.title} · ${combat.prompt.instruction}`; details.append(caption, explanation); prompt.append(details);
    if (combat.prompt.cancellable) { const cancel = document.createElement('button'); cancel.className = 'combat-roll-cancel'; cancel.textContent = 'Cancelar'; cancel.onclick = () => command({ type: 'combat:cancelAction', attackerId: combat.prompt!.selectionActorId, promptId: combat.prompt!.id }); prompt.append(cancel); }
    box.insertBefore(prompt, roster);
  }
  box.append(panel);
}

($('closeCombatSheet') as HTMLButtonElement).onclick = () => ($('combatSheetDialog') as HTMLDialogElement).close();
window.setInterval(() => { if (state) renderGameClock(state); }, 250);
setupWorkspace();
void beginDm();

$('weatherSea').oninput=()=>{$('weatherSeaValue').textContent=seaStateLabel(Number(($('weatherSea') as HTMLInputElement).value));};
$('weatherSea').onchange=()=>command({type:'environment',seaIntensity:Number(($('weatherSea') as HTMLInputElement).value)});
$('weatherSeaAuto').onclick=()=>command({type:'environment',seaIntensity:null});
$('weatherRulesEnabled').onchange=()=>command({type:'environment',weatherRules:($('weatherRulesEnabled') as HTMLInputElement).checked});
