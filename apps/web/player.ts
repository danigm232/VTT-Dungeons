import { io } from 'socket.io-client';
import nipplejs from 'nipplejs';
import { OBJECT_MODEL_VERSION, PROTOCOL_VERSION, explorationBasicActionCatalogue } from '../../engine/shared/protocol';
import type { BasicCombatAction, CharacterPublic, CombatAction, CommandResult, ExplorationAction, ExplorationBasicAction, Facing, PlayerPrivate, WorldSnapshot } from '../../engine/shared/protocol';
import type { Cell } from '../../engine/shared/campaign';
import { supportsCameraOrientation } from '../../engine/shared/camera';
import { commandId } from '../../engine/client/uuid';
import { writeUiPreferences } from '../../engine/client/ui-preferences';
import { WorldRenderer } from './world';
import { SceneLoadRecovery } from '../../engine/client/scene-load-recovery';
import { conditionHelp } from '../../engine/client/condition-presentation';
import { campaignShipLootIconIndex } from '../../engine/client/ship-loot-art';
import { radialActionGlyph } from '../../engine/client/radial-action-icons';
import { jumpSummary } from '../../engine/shared/jumping';
import { keyboardMovementAxes } from '../../engine/client/movement-input';
import { CAMERA_DEFAULT_TILT } from '../../engine/client/camera-profile';
import { cameraTouchAxis, cameraTiltFromTouch, adjustCameraTiltForTouch, type CameraTouchAxis } from '../../engine/client/camera-touch';
import { combatActionDescription, combatTurnIndicators, compactCombatPrompt } from '../../engine/client/combat-presentation';
import { radialPagination, radialRadiusLimit } from '../../engine/client/radial-pagination';
import { loadCampaign } from './campaign';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const newSessionToken = () => [...crypto.getRandomValues(new Uint8Array(24))].map(value => value.toString(16).padStart(2, '0')).join('');
let sessionToken = localStorage.getItem('dnd-session');
if (!sessionToken || !/^[a-f0-9]{32,64}$/i.test(sessionToken)) {
  sessionToken = newSessionToken();
  localStorage.setItem('dnd-session', sessionToken);
}
const campaign = await loadCampaign();
const characterStorageKey = `dnd-character:${campaign.campaignId}`;
type PlayerDisplaySettings = {
  showGrid: boolean;
  showMovementHints: boolean;
  showSceneNotice: boolean;
  sceneNoticeSeconds: number;
  joystickOpacity: number;
  joystickX: number;
  joystickY: number;
  joystickSize: number;
  actionX: number;
  actionY: number;
  actionSize: number;
  identityMenuAlwaysOpen: boolean;
  identityMenuSeconds: number;
  sheetView: 'summary' | 'full';
};
const defaultPlayerDisplaySettings: PlayerDisplaySettings = {
  showGrid: true, showMovementHints: true, showSceneNotice: true, sceneNoticeSeconds: 8,
  joystickOpacity: 0.72, joystickX: 0.05, joystickY: 0, joystickSize: 2,
  actionX: 0.99, actionY: 0, actionSize: 2, identityMenuAlwaysOpen: false, identityMenuSeconds: 7, sheetView: 'summary'
};
type HudLayoutSettings = Pick<PlayerDisplaySettings, 'joystickX' | 'joystickY' | 'joystickSize' | 'actionX' | 'actionY' | 'actionSize'>;
const hudSizeScales = [0.75, 0.875, 1, 1.25, 1.5] as const;
const hudSizeLabels = ['Muy pequeño', 'Pequeño', 'Normal', 'Grande', 'Muy grande'] as const;
const playerDisplaySettingsKey = `dnd-player-display.v1:${campaign.campaignId}`;
const hudBottomAlignmentKey = `dnd-player-hud-bottom-aligned.v1:${campaign.campaignId}`;
function readPlayerDisplaySettings(): PlayerDisplaySettings {
  try {
    const saved = JSON.parse(localStorage.getItem(playerDisplaySettingsKey) ?? '{}') as Partial<PlayerDisplaySettings>;
    const seconds = Number(saved.identityMenuSeconds);
    const opacity = Number(saved.joystickOpacity);
    // La versión anterior calculaba mal la coordenada vertical real. Conserva
    // posición horizontal y tamaño, pero corrige una sola vez la altura guardada.
    const alignControlsAtBottom = localStorage.getItem(hudBottomAlignmentKey) !== '1';
    if (alignControlsAtBottom) localStorage.setItem(hudBottomAlignmentKey, '1');
    return {
      showGrid: saved.showGrid !== false,
      showMovementHints: saved.showMovementHints !== false,
      showSceneNotice: saved.showSceneNotice !== false,
      sceneNoticeSeconds: Number.isFinite(Number(saved.sceneNoticeSeconds)) ? Math.min(25, Math.max(3, Math.round(Number(saved.sceneNoticeSeconds)))) : 8,
      joystickOpacity: Number.isFinite(opacity) ? Math.min(1, Math.max(0.2, opacity)) : defaultPlayerDisplaySettings.joystickOpacity,
      joystickX: Number.isFinite(Number(saved.joystickX)) ? Math.min(1, Math.max(0, Number(saved.joystickX))) : defaultPlayerDisplaySettings.joystickX,
      joystickY: alignControlsAtBottom ? 0 : Number.isFinite(Number(saved.joystickY)) ? Math.min(1, Math.max(0, Number(saved.joystickY))) : defaultPlayerDisplaySettings.joystickY,
      joystickSize: Number.isFinite(Number(saved.joystickSize)) ? Math.min(4, Math.max(0, Math.round(Number(saved.joystickSize)))) : defaultPlayerDisplaySettings.joystickSize,
      actionX: Number.isFinite(Number(saved.actionX)) ? Math.min(1, Math.max(0, Number(saved.actionX))) : defaultPlayerDisplaySettings.actionX,
      actionY: alignControlsAtBottom ? 0 : Number.isFinite(Number(saved.actionY)) ? Math.min(1, Math.max(0, Number(saved.actionY))) : defaultPlayerDisplaySettings.actionY,
      actionSize: Number.isFinite(Number(saved.actionSize)) ? Math.min(4, Math.max(0, Math.round(Number(saved.actionSize)))) : defaultPlayerDisplaySettings.actionSize,
      identityMenuAlwaysOpen: saved.identityMenuAlwaysOpen === true,
      identityMenuSeconds: Number.isFinite(seconds) ? Math.min(30, Math.max(3, Math.round(seconds))) : defaultPlayerDisplaySettings.identityMenuSeconds,
      sheetView: saved.sheetView === 'full' ? 'full' : 'summary'
    };
  } catch { return { ...defaultPlayerDisplaySettings }; }
}
let playerDisplaySettings = readPlayerDisplaySettings();
let sceneNoticeTimer = 0;
let sceneNoticeKey = '';
function refreshSceneNotice(force = false) {
  const key = `${lastSnapshot?.sceneEpoch ?? ''}:${privateState?.rowboat?.aboard ?? false}`;
  if (!force && key === sceneNoticeKey) return;
  sceneNoticeKey = key;
  clearTimeout(sceneNoticeTimer);
  $('sceneNotice').hidden = !playerDisplaySettings.showSceneNotice;
  sceneNoticeTimer = window.setTimeout(() => { $('sceneNotice').hidden = true; }, playerDisplaySettings.sceneNoticeSeconds * 1000);
}
let identityMenuTimer = 0;
let hudLayoutDraft: HudLayoutSettings | null = null;
let savedSettingsVisibility: Map<HTMLElement, boolean> | null = null;
let joystickManager: ReturnType<typeof nipplejs.create> | null = null;
let joystickManagerSize = 0;
const joystickPointers = new Set<number>();
const joystickTouches = new Set<number>();
let joystickInputActive = false;

function setupCompactIdentity() {
  const identity = document.querySelector('.identity') as HTMLElement;
  const name = $('name');
  const hp = $('hp');
  const hpButton = $('combatHp') as HTMLButtonElement;
  const sheet = $('sheetButton') as HTMLButtonElement;
  const inventory = $('inventoryButton') as HTMLButtonElement;
  const settings = $('settingsButton') as HTMLButtonElement;
  const nameButton = document.createElement('button');
  nameButton.id = 'identityMenuToggle'; nameButton.type = 'button'; nameButton.className = 'identity-menu-toggle';
  nameButton.setAttribute('aria-controls', 'identityMenu'); nameButton.setAttribute('aria-expanded', 'false');
  nameButton.setAttribute('aria-haspopup', 'true');
  const caret = document.createElement('span'); caret.className = 'identity-chevron'; caret.setAttribute('aria-hidden', 'true'); caret.textContent = '⌄';
  nameButton.append(name, caret);
  hpButton.className = 'identity-hp'; hpButton.replaceChildren(hp); hpButton.setAttribute('aria-label', 'Puntos de golpe');
  for (const [button, label, icon] of [[sheet, 'Hoja de personaje', '▤'], [inventory, 'Mochila', '🎒'], [settings, 'Configuración', '⚙']] as const) {
    button.type = 'button'; button.className = 'identity-menu-item'; button.textContent = icon;
    button.setAttribute('aria-label', label); button.title = label;
  }
  const menu = document.createElement('nav');
  menu.id = 'identityMenu'; menu.className = 'identity-menu'; menu.hidden = true;
  menu.setAttribute('aria-label', 'Accesos del personaje');
  menu.append(sheet, inventory, settings);
  identity.replaceChildren(nameButton, hpButton, menu);
  $('combatHud').remove();
}

function openIdentityMenu() {
  const menu = $('identityMenu');
  const toggle = $('identityMenuToggle');
  menu.hidden = false;
  toggle.setAttribute('aria-expanded', 'true');
  window.clearTimeout(identityMenuTimer);
  identityMenuTimer = 0;
  if (!playerDisplaySettings.identityMenuAlwaysOpen) {
    identityMenuTimer = window.setTimeout(closeIdentityMenu, playerDisplaySettings.identityMenuSeconds * 1000);
  }
}

function closeIdentityMenu() {
  window.clearTimeout(identityMenuTimer);
  identityMenuTimer = 0;
  const menu = $('identityMenu');
  const toggle = $('identityMenuToggle');
  if (menu) menu.hidden = true;
  if (toggle) toggle.setAttribute('aria-expanded', 'false');
}

function addCompactHudSettings() {
  const controls = document.createElement('section');
  controls.className = 'player-hud-settings';
  controls.innerHTML = '<h3>Controles en pantalla</h3>' +
    '<label class="player-setting"><span><b>Transparencia del joystick</b><small>Ajusta cuánto se ve sobre el mapa: <span id="settingJoystickOpacityValue">72%</span>.</small></span><input id="settingJoystickOpacity" type="range" min="20" max="100" step="5"></label>' +
    '<button id="openHudLayoutEditor" class="hud-layout-launch" type="button">Cambiar configuración HUD</button>' +
    '<label class="player-setting"><span><b>Menú siempre abierto</b><small>Deja visibles los accesos junto al nombre.</small></span><input id="settingIdentityMenuAlwaysOpen" type="checkbox"></label>' +
    '<label class="player-setting"><span><b>Tiempo del menú</b><small id="settingIdentityMenuSecondsValue">7 segundos</small></span><input id="settingIdentityMenuSeconds" type="range" min="3" max="30" step="1"></label>';
  $('cameraSettings').before(controls);
}

function addHudLayoutEditor() {
  const editor = document.createElement('section');
  editor.id = 'hudLayoutEditor';
  editor.className = 'hud-layout-editor';
  editor.hidden = true;
  editor.innerHTML = '<h3>Distribución del HUD</h3>' +
    '<p>Arrastra los controles por la vista para ajustar su posición y altura. También puedes usar los deslizadores.</p>' +
    '<div id="hudLayoutPreview" class="hud-layout-preview" aria-label="Vista previa del HUD. Arrastra el joystick y el botón de acciones en horizontal y vertical">' +
      '<span class="hud-preview-map-label">VISTA DEL MAPA</span>' +
      '<button id="previewJoystick" class="hud-preview-control hud-preview-joystick" type="button" aria-label="Mover joystick en la vista previa">◉</button>' +
      '<button id="previewActionControl" class="hud-preview-control hud-preview-action" type="button" aria-label="Mover botón de acciones en la vista previa">✋︎</button>' +
      '<span class="hud-preview-hint">Arrastra para cambiar posición y altura</span>' +
    '</div>' +
    '<label class="hud-layout-setting"><span>Posición horizontal del joystick</span><input id="settingJoystickX" type="range" min="0" max="100" step="1"></label>' +
    '<label class="hud-layout-setting"><span>Altura del joystick <small>Abajo ↔ arriba</small></span><input id="settingJoystickY" type="range" min="0" max="100" step="1"></label>' +
    '<label class="hud-layout-setting"><span>Tamaño del joystick <b id="settingJoystickSizeValue">Normal</b></span><input id="settingJoystickSize" type="range" min="0" max="4" step="1"></label>' +
    '<label class="hud-layout-setting"><span>Posición horizontal de acciones</span><input id="settingActionX" type="range" min="0" max="100" step="1"></label>' +
    '<label class="hud-layout-setting"><span>Altura del botón de acciones <small>Abajo ↔ arriba</small></span><input id="settingActionY" type="range" min="0" max="100" step="1"></label>' +
    '<label class="hud-layout-setting"><span>Tamaño del botón de acciones <b id="settingActionSizeValue">Normal</b></span><input id="settingActionSize" type="range" min="0" max="4" step="1"></label>' +
    '<div class="button-row hud-layout-buttons"><button id="cancelHudLayout" type="button">Cancelar</button><button id="applyHudLayout" class="primary" type="button">Aplicar</button></div>';
  $('playerSettings').append(editor);
}

function addActionRadial() {
  const radial = document.createElement('div');
  radial.id = 'actionRadial';
  radial.className = 'action-radial';
  radial.hidden = true;
  radial.setAttribute('role', 'group');
  radial.setAttribute('aria-label', 'Rueda de acciones');
  document.body.append(radial);
}

function hudSizeLevel(level: number) { return Math.min(4, Math.max(0, Math.round(level))); }
function hudSizeScale(level: number) { return hudSizeScales[hudSizeLevel(level)] ?? 1; }
function hudSizeLabel(level: number) { return hudSizeLabels[hudSizeLevel(level)] ?? 'Normal'; }

function safeAreaInsets() {
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
  document.body.append(probe);
  const style = getComputedStyle(probe);
  const left = Number.parseFloat(style.paddingLeft) || 0;
  const right = Number.parseFloat(style.paddingRight) || 0;
  const top = Number.parseFloat(style.paddingTop) || 0;
  const bottom = Number.parseFloat(style.paddingBottom) || 0;
  probe.remove();
  return { left, right, top, bottom };
}

function applyHudControlLayout(settings: HudLayoutSettings = playerDisplaySettings) {
  const joystick = $('joystick');
  const action = $('actionToggle') as HTMLButtonElement;
  const compactLandscape = matchMedia('(orientation: landscape) and (max-height: 550px)').matches;
  const joystickSize = Math.round((compactLandscape ? 108 : 135) * hudSizeScale(settings.joystickSize));
  const actionSize = Math.round((compactLandscape ? 42 : 48) * hudSizeScale(settings.actionSize));
  const width = Math.max(1, window.innerWidth);
  const inset = safeAreaInsets();
  const position = (value: number, size: number) => {
    const min = Math.max(12, inset.left) + size / 2;
    const max = Math.max(min, width - Math.max(12, inset.right) - size / 2);
    return min + (max - min) * Math.min(1, Math.max(0, value));
  };
  const height = Math.max(1, window.innerHeight);
  const sharedCenterBottom = (value: number) => {
    const largestControl = Math.max(joystickSize, actionSize);
    const min = Math.max(4, inset.bottom + 4) + largestControl / 2;
    const max = Math.max(min, height - Math.max(12, inset.top) - 68 - largestControl / 2);
    return min + (max - min) * Math.min(1, Math.max(0, value));
  };

  joystick.style.position = 'fixed';
  joystick.style.left = `${position(settings.joystickX, joystickSize)}px`;
  joystick.style.right = 'auto';
  joystick.style.transform = 'translateX(-50%)';
  joystick.style.width = `${joystickSize}px`;
  joystick.style.height = `${joystickSize}px`;
  joystick.style.bottom = `${sharedCenterBottom(settings.joystickY) - joystickSize / 2}px`;
  action.style.position = 'fixed';
  action.style.left = `${position(settings.actionX, actionSize)}px`;
  action.style.right = 'auto';
  action.style.transform = actionsMenuOpen ? 'translate(-50%, -18px)' : 'translateX(-50%)';
  action.style.width = `${actionSize}px`;
  action.style.minWidth = `${actionSize}px`;
  action.style.height = `${actionSize}px`;
  action.style.minHeight = `${actionSize}px`;
  action.style.bottom = `${sharedCenterBottom(settings.actionY) - actionSize / 2}px`;
  action.style.fontSize = `${Math.max(14, Math.round(actionSize * 0.48))}px`;
  joystick.style.setProperty('--joystick-opacity', String(playerDisplaySettings.joystickOpacity));
  if (joystickManager && joystickManagerSize !== joystickSize) initializeJoystick(true);
}

function syncHudLayoutPreview() {
  if (!hudLayoutDraft) return;
  const preview = $('hudLayoutPreview');
  const previewWidth = preview.clientWidth || 320;
  const previewHeight = preview.clientHeight || 180;
  const inset = safeAreaInsets();
  const viewportHeight = Math.max(1, window.innerHeight);
  const layout = [
    { id: 'previewJoystick', position: hudLayoutDraft.joystickX, height: hudLayoutDraft.joystickY, size: hudLayoutDraft.joystickSize, base: 56 },
    { id: 'previewActionControl', position: hudLayoutDraft.actionX, height: hudLayoutDraft.actionY, size: hudLayoutDraft.actionSize, base: 48 }
  ] as const;
  const previewSizes = layout.map(item => Math.round(item.base * hudSizeScale(item.size)));
  const largestPreviewControl = Math.max(...previewSizes);
  const topLimit = previewHeight * (Math.max(12, inset.top) + 68) / viewportHeight + largestPreviewControl / 2;
  const bottomLimit = previewHeight - previewHeight * Math.max(4, inset.bottom + 4) / viewportHeight - largestPreviewControl / 2;
  const topCenter = Math.min(topLimit, bottomLimit);
  const bottomCenter = Math.max(topCenter, bottomLimit);
  for (const item of layout) {
    const control = $(item.id) as HTMLButtonElement;
    const size = Math.round(item.base * hudSizeScale(item.size));
    const edge = Math.min(20, (size / 2 + 7) / previewWidth * 100);
    const centerY = bottomCenter + (topCenter - bottomCenter) * item.height;
    control.style.left = `${edge + (100 - edge * 2) * item.position}%`;
    control.style.top = `${centerY - size / 2}px`;
    control.style.bottom = 'auto';
    control.style.width = `${size}px`;
    control.style.height = `${size}px`;
    control.style.fontSize = `${Math.max(14, Math.round(size * 0.45))}px`;
  }
  const joystickPositionInput = $('settingJoystickX') as HTMLInputElement;
  const joystickHeightInput = $('settingJoystickY') as HTMLInputElement;
  const actionPositionInput = $('settingActionX') as HTMLInputElement;
  const actionHeightInput = $('settingActionY') as HTMLInputElement;
  const joystickSizeInput = $('settingJoystickSize') as HTMLInputElement;
  const actionSizeInput = $('settingActionSize') as HTMLInputElement;
  joystickPositionInput.value = String(Math.round(hudLayoutDraft.joystickX * 100));
  joystickHeightInput.value = String(Math.round(hudLayoutDraft.joystickY * 100));
  actionPositionInput.value = String(Math.round(hudLayoutDraft.actionX * 100));
  actionHeightInput.value = String(Math.round(hudLayoutDraft.actionY * 100));
  joystickSizeInput.value = String(hudLayoutDraft.joystickSize);
  actionSizeInput.value = String(hudLayoutDraft.actionSize);
  joystickSizeInput.setAttribute('aria-valuetext', hudSizeLabel(hudLayoutDraft.joystickSize));
  actionSizeInput.setAttribute('aria-valuetext', hudSizeLabel(hudLayoutDraft.actionSize));
  $('settingJoystickSizeValue').textContent = hudSizeLabel(hudLayoutDraft.joystickSize);
  $('settingActionSizeValue').textContent = hudSizeLabel(hudLayoutDraft.actionSize);
}

function showHudLayoutEditor(show: boolean) {
  const dialog = $('playerSettings');
  const editor = $('hudLayoutEditor');
  if (show) {
    savedSettingsVisibility = new Map();
    for (const child of Array.from(dialog.children)) {
      if (!(child instanceof HTMLElement) || child === editor || child.classList.contains('close')) continue;
      savedSettingsVisibility.set(child, child.hidden);
      child.hidden = true;
    }
    editor.hidden = false;
    syncHudLayoutPreview();
    return;
  }
  editor.hidden = true;
  for (const [element, wasHidden] of savedSettingsVisibility ?? []) element.hidden = wasHidden;
  savedSettingsVisibility = null;
}

function finishHudLayoutEdit(apply: boolean) {
  if (!hudLayoutDraft) return;
  if (apply) {
    playerDisplaySettings = { ...playerDisplaySettings, ...hudLayoutDraft };
    applyPlayerDisplaySettings();
    toast('Distribución del HUD aplicada.');
  }
  hudLayoutDraft = null;
  showHudLayoutEditor(false);
}

function startHudLayoutEdit() {
  hudLayoutDraft = {
    joystickX: playerDisplaySettings.joystickX,
    joystickY: playerDisplaySettings.joystickY,
    joystickSize: playerDisplaySettings.joystickSize,
    actionX: playerDisplaySettings.actionX,
    actionY: playerDisplaySettings.actionY,
    actionSize: playerDisplaySettings.actionSize
  };
  showHudLayoutEditor(true);
}

function updateHudPreviewPosition(controlId: 'previewJoystick' | 'previewActionControl', event: PointerEvent, pointerOffset = { x: 0, y: 0 }) {
  if (!hudLayoutDraft) return;
  const preview = $('hudLayoutPreview');
  const rect = preview.getBoundingClientRect();
  if (rect.width <= 0) return;
  const isJoystick = controlId === 'previewJoystick';
  const sizeLevel = isJoystick ? hudLayoutDraft.joystickSize : hudLayoutDraft.actionSize;
  const baseSize = isJoystick ? 56 : 48;
  const size = baseSize * hudSizeScale(sizeLevel);
  const marginX = Math.min(rect.width * 0.2, size / 2 + 7);
  const inset = safeAreaInsets();
  const viewportHeight = Math.max(1, window.innerHeight);
  const largestControl = Math.max(56 * hudSizeScale(hudLayoutDraft.joystickSize), 48 * hudSizeScale(hudLayoutDraft.actionSize));
  const topLimit = rect.height * (Math.max(12, inset.top) + 68) / viewportHeight + largestControl / 2;
  const bottomLimit = rect.height - rect.height * Math.max(4, inset.bottom + 4) / viewportHeight - largestControl / 2;
  const topCenter = Math.min(topLimit, bottomLimit);
  const bottomCenter = Math.max(topCenter, bottomLimit);
  const positionKey = isJoystick ? 'joystickX' : 'actionX';
  const heightKey = isJoystick ? 'joystickY' : 'actionY';
  hudLayoutDraft[positionKey] = Math.min(1, Math.max(0, (event.clientX + pointerOffset.x - rect.left - marginX) / Math.max(1, rect.width - marginX * 2)));
  const controlCenterY = event.clientY + pointerOffset.y - rect.top;
  hudLayoutDraft[heightKey] = Math.min(1, Math.max(0, (bottomCenter - controlCenterY) / Math.max(1, bottomCenter - topCenter)));
  syncHudLayoutPreview();
}

function bindHudPreviewDrag(controlId: 'previewJoystick' | 'previewActionControl') {
  const control = $(controlId) as HTMLButtonElement;
  let activePointer: number | null = null;
  let pointerOffset = { x: 0, y: 0 };
  control.addEventListener('pointerdown', event => {
    if (!hudLayoutDraft) return;
    event.preventDefault();
    activePointer = event.pointerId;
    const bounds = control.getBoundingClientRect();
    pointerOffset = { x: bounds.left + bounds.width / 2 - event.clientX, y: bounds.top + bounds.height / 2 - event.clientY };
    control.setPointerCapture(event.pointerId);
    updateHudPreviewPosition(controlId, event, pointerOffset);
  });
  control.addEventListener('pointermove', event => {
    if (activePointer === event.pointerId) updateHudPreviewPosition(controlId, event, pointerOffset);
  });
  const finishDrag = (event: PointerEvent) => {
    if (activePointer !== event.pointerId) return;
    activePointer = null;
    if (control.hasPointerCapture(event.pointerId)) control.releasePointerCapture(event.pointerId);
  };
  control.addEventListener('pointerup', finishDrag);
  control.addEventListener('pointercancel', finishDrag);
  control.addEventListener('click', event => event.preventDefault());
}

setupCompactIdentity();
addCompactHudSettings();
addHudLayoutEditor();
addActionRadial();
const socketAuth = () => ({ role: 'player', sessionToken, protocolVersion: PROTOCOL_VERSION, objectModelVersion: OBJECT_MODEL_VERSION });
// Register every listener before connecting. On slow phones this prevents the
// initial chooser packet from arriving before its renderer is ready.
const socket = io({ autoConnect: false, auth: socketAuth() });
const world = new WorldRenderer($('world'), campaign, { showStairMarker: false, showGrid: playerDisplaySettings.showGrid, showReachable: playerDisplaySettings.showMovementHints, persistCameraPreferences: true, cameraPreferenceNamespace: 'player', followSharedCameraOrientation: true });
let privateState: PlayerPrivate | null = null;
let lastSnapshot: WorldSnapshot | null = null;
let readyEpoch = -1;
let runtimeEpoch: string | null = null;
let seq = 0;
let stick = { x: 0, up: 0 };
const keys = new Set<string>();
let toastTimer = 0;
let selectedTargetId: string | null = null, turnAnnouncementUntil = 0;
let renderedTargetMenuKey = '';
let resumedRuntimeEpoch: string | null = null, recoveringSession = false, recoveryRequired = false;
let sheetView: 'summary' | 'full' = playerDisplaySettings.sheetView;
const pendingCombatNotices = new Map<string, string>();
const pendingCombatCommands = new Set<string>();
let armedActionId: string | null = null;
let armedBasicAction: BasicCombatAction | null = null;
let actionsMenuOpen = false, combatWasActive = false;
let actionRadialPage = 0;
let actionRadialCategory: string | null = null;
let armedExplorationActionId: string | null = null;
let armedExplorationAttackId: string | null = null;
let armedExplorationBasicActionId: ExplorationBasicAction | null = null;
type CombatBarMode = 'move' | 'attack' | 'magic' | 'bonus' | 'reaction' | 'rules' | null;
let combatBarMode: CombatBarMode = null;
// These are kept outside the DOM because snapshots can redraw the controls
// while a finger is still completing its tap on a category.
let openCombatCategory: string | null = null;
// Los snapshots llegan también mientras el jugador está quieto. Conservamos la
// categoría desplegada al redibujar el panel para que un toque en «Ataques» no
// vuelva a cerrarla inmediatamente.
let openExplorationCategory: 'Trucos' | 'Conjuros' | 'Ataques' | 'Acciones' | null = null;
const basicActionLabels: Record<BasicCombatAction, string> = { dash: 'Correr', disengage: 'Destrabarse', dodge: 'Esquivar', help: 'Ayudar', hide: 'Esconderse', influence: 'Influir', magic: 'Acción mágica', ready: 'Preparar', search: 'Buscar', study: 'Estudiar', 'use-object': 'Utilizar' };

const toast = (message: string) => {
  const element = $('toast');
  element.textContent = message;
  element.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => element.classList.remove('show'), 2600);
};

function syncPlayerSettingsDialog() {
  let noticeDuration = document.getElementById('settingSceneNoticeSeconds') as HTMLInputElement | null;
  if (!noticeDuration) {
    const label = document.createElement('label');
    label.textContent = 'Duración del nombre del mapa ';
    noticeDuration = document.createElement('input'); noticeDuration.type = 'range'; noticeDuration.id = 'settingSceneNoticeSeconds'; noticeDuration.min = '3'; noticeDuration.max = '25'; noticeDuration.step = '1';
    const value = document.createElement('output'); value.id = 'settingSceneNoticeSecondsValue';
    label.append(noticeDuration, value); $('settingSceneNotice').closest('label')?.after(label);
    noticeDuration.oninput = event => { updatePlayerDisplaySetting('sceneNoticeSeconds', Number((event.currentTarget as HTMLInputElement).value)); refreshSceneNotice(true); };
  }
  noticeDuration.value = String(playerDisplaySettings.sceneNoticeSeconds);
  $('settingSceneNoticeSecondsValue').textContent = `${playerDisplaySettings.sceneNoticeSeconds} segundos`;
  ($('settingGrid') as HTMLInputElement).checked = playerDisplaySettings.showGrid;
  ($('settingMovementHints') as HTMLInputElement).checked = playerDisplaySettings.showMovementHints;
  ($('settingSceneNotice') as HTMLInputElement).checked = playerDisplaySettings.showSceneNotice;
  ($('settingJoystickOpacity') as HTMLInputElement).value = String(Math.round(playerDisplaySettings.joystickOpacity * 100));
  $('settingJoystickOpacityValue').textContent = `${Math.round(playerDisplaySettings.joystickOpacity * 100)}%`;
  ($('settingIdentityMenuAlwaysOpen') as HTMLInputElement).checked = playerDisplaySettings.identityMenuAlwaysOpen;
  ($('settingIdentityMenuSeconds') as HTMLInputElement).value = String(playerDisplaySettings.identityMenuSeconds);
  ($('settingIdentityMenuSeconds') as HTMLInputElement).disabled = playerDisplaySettings.identityMenuAlwaysOpen;
  $('settingIdentityMenuSecondsValue').textContent = `${playerDisplaySettings.identityMenuSeconds} ${playerDisplaySettings.identityMenuSeconds === 1 ? 'segundo' : 'segundos'}`;
  $('cameraSettings').hidden = !supportsCameraOrbit();
}
function applyPlayerDisplaySettings() {
  world.setGridVisible(playerDisplaySettings.showGrid);
  world.setReachableVisible(playerDisplaySettings.showMovementHints);
  document.body.classList.toggle('player-hide-scene-notice', !playerDisplaySettings.showSceneNotice);
  applyHudControlLayout();
  writeUiPreferences(playerDisplaySettingsKey, playerDisplaySettings);
  syncPlayerSettingsDialog();
  if (playerDisplaySettings.identityMenuAlwaysOpen) openIdentityMenu();
  else if (!$('identityMenu').hidden) openIdentityMenu();
}
function updatePlayerDisplaySetting<K extends keyof PlayerDisplaySettings>(key: K, value: PlayerDisplaySettings[K]) {
  playerDisplaySettings = { ...playerDisplaySettings, [key]: value };
  applyPlayerDisplaySettings();
  if (key === 'showSceneNotice') refreshSceneNotice(true);
}
applyPlayerDisplaySettings();
addEventListener('resize', () => {
  applyHudControlLayout();
  syncHudLayoutPreview();
  if (lastSnapshot?.combat.active) renderCombatControls();
  if (actionsMenuOpen) renderExplorationControls();
});

socket.on('connect', () => {
  sceneLoadRecovery.reset();
  recoveringSession = false;
  $('connection').textContent = 'Conectado a la mesa';
  readyEpoch = -1;
  world.resetConnection();
  if (lastSnapshot) void prepareSnapshot(lastSnapshot);
});
socket.on('disconnect', reason => {
  sceneLoadRecovery.reset();
  $('connection').textContent = recoveryRequired ? 'La partida requiere recuperación. Avisa al DM y recarga cuando la restaure.' : recoveringSession ? 'Restableciendo sesión…' : reason === 'io server disconnect' && !privateState?.characterId
    ? 'Control finalizado en esta pestaña'
    : 'Reconectando…';
  stop();
  readyEpoch = -1;
});
socket.on('combat:animation', (event: { runtimeEpoch: string; sceneEpoch?: number; bodyState?: string; attackerId: string; targetId: string; type: 'melee' | 'arrow' | 'thrownWeapon' | 'radiantArrow' | 'vine' | 'fireProjectile' | 'magicalProjectile'; hit: boolean; frozen: boolean; sneakAttack?: boolean }) => { if (event.runtimeEpoch === runtimeEpoch && (event.sceneEpoch === undefined || event.sceneEpoch === lastSnapshot?.sceneEpoch)) world.playRangedAttack(event.attackerId, event.targetId, event.type, event.hit, event.frozen, event.sneakAttack, event.bodyState); });
socket.on('scene:animation', (event: { runtimeEpoch: string; sceneEpoch: number; entityId: string; state: string; durationMs: number }) => { if (event.runtimeEpoch === runtimeEpoch && event.sceneEpoch === lastSnapshot?.sceneEpoch) world.playTokenAnimation(event.entityId, event.state, event.durationMs); });
socket.on('scene:area-effect', (event: { runtimeEpoch: string; sceneEpoch: number; cell: { col: number; row: number }; type: 'fog'; radiusMeters: number; durationMs: number }) => { if (event.runtimeEpoch === runtimeEpoch && event.sceneEpoch === lastSnapshot?.sceneEpoch) world.playAreaEffect(event.cell, event.type, event.radiusMeters, event.durationMs); });
socket.on('mirror:transformation', (event: { runtimeEpoch: string; sceneEpoch: number; propId: string; sourceId: string; reflectionId: string; frames: string[]; durationMs: number }) => { if (event.runtimeEpoch === runtimeEpoch && event.sceneEpoch === lastSnapshot?.sceneEpoch) world.playMirrorTransformation(event.propId, event.sourceId, event.reflectionId, event.frames, event.durationMs); });
socket.on('auth:error', (error: { code?: string }) => {
  if (error.code === 'PROTOCOL_MISMATCH') { toast('La aplicación se ha actualizado. Recarga esta página.'); return; }
  if (error.code === 'RECOVERY_REQUIRED') {
    recoveryRequired = true;
    $('connection').textContent = 'La partida requiere recuperación. Avisa al DM y recarga cuando la restaure.';
    toast('La partida necesita que el DM la recupere.');
    return;
  }
  // A stale/localStorage token must never strand a player on a blank chooser.
  // Generate one clean token and reconnect automatically instead of asking a
  // non-technical player to clear browser storage or reload repeatedly.
  if (recoveringSession) { toast('No se pudo restablecer la sesión. Recarga esta página.'); return; }
  recoveringSession = true;
  sessionToken = newSessionToken();
  localStorage.setItem('dnd-session', sessionToken);
  socket.auth = socketAuth();
  toast('Sesión restablecida. Reconectando…');
  window.setTimeout(() => socket.connect(), 75);
});
socket.on('runtime:reset', (event: { runtimeEpoch: string; reason?: string }) => {
  sceneLoadRecovery.reset();
  stop(); runtimeEpoch = event.runtimeEpoch; readyEpoch = -1; seq = 0; lastSnapshot = null; privateState = null;
  resumedRuntimeEpoch = null; selectedTargetId = null; renderedTargetMenuKey = ''; pendingCombatNotices.clear(); pendingCombatCommands.clear(); armedActionId = null; armedBasicAction = null; actionsMenuOpen = false; actionRadialPage = 0; combatWasActive = false; combatBarMode = null; armedExplorationActionId = null; armedExplorationAttackId = null; armedExplorationBasicActionId = null; openCombatCategory = null; openExplorationCategory = null;
  $('actionRadial').hidden = true; $('actionRadial').replaceChildren(); $('interact').hidden = true;
  world.resetConnection(); world.setLocalPlayer(null); $('hud').hidden = true; $('join').hidden = false;
  if (event.reason && event.reason !== 'Conexión establecida.') toast(event.reason);
});
socket.on('characters:available', (packet: { runtimeEpoch: string; characters: CharacterPublic[] }) => {
  if (packet.runtimeEpoch !== runtimeEpoch) return;
  if (privateState?.characterId) return;
  const box = $('characters');
  box.replaceChildren(...packet.characters.map(character => {
    const button = document.createElement('button');
    button.className = 'choice';
    button.disabled = character.claimed;
    const swatch = document.createElement('span'); swatch.className = 'swatch'; swatch.style.background = character.color;
    const detail = document.createElement('span'), name = document.createElement('b'), archetype = document.createElement('small'), action = document.createElement('span');
    name.textContent = character.label; archetype.textContent = character.archetype; action.textContent = character.claimed ? 'Ocupado' : 'Elegir'; detail.append(name, archetype); button.append(swatch, detail, action);
    button.onclick = () => socket.emit('player:claim', { runtimeEpoch, characterId: character.id });
    return button;
  }));
  // After a server restart/load, sessions are intentionally not stored in the
  // save file. Remembering only this browser's prior character lets a player
  // return to the exact saved position without exposing DM data or requiring
  // the DM to reassign a one-player D8 table by hand.
  const rememberedCharacterId = localStorage.getItem(characterStorageKey);
  const remembered = packet.characters.find(character => character.id === rememberedCharacterId);
  if (remembered && !remembered.claimed && resumedRuntimeEpoch !== runtimeEpoch) {
    resumedRuntimeEpoch = runtimeEpoch;
    socket.emit('player:claim', { runtimeEpoch, characterId: remembered.id });
  }
});
socket.on('world:snapshot', (snapshot: WorldSnapshot) => {
  if (snapshot.runtimeEpoch !== runtimeEpoch) return;
  const previousCombatantId = lastSnapshot?.combat.currentId;
  const combatEndedNotice = combatWasActive && !snapshot.combat.active ? snapshot.combat.lastEvent?.text : undefined;
  if (lastSnapshot && snapshot.sceneEpoch !== lastSnapshot.sceneEpoch) {
    stop();
    clearCameraTouchContacts();
    readyEpoch = -1;
  }
  lastSnapshot = snapshot;
  void prepareSnapshot(snapshot);
  const scene = campaign.scenes.find(scene => scene.id === snapshot.sceneId);
  $('sceneNotice').textContent = privateState?.rowboat?.aboard
    ? privateState.rowboat.pilot ? 'Barca · rema con WASD o el mando · pulsa Bajar para nadar'
      : 'Barca · otro personaje lleva los remos · pulsa Bajar para nadar'
    : scene ? `${scene.title} · 1 casilla = 1,5 m${scene.movementEnabled ? '' : ' · espera la señal del DM'}` : 'Escena no disponible';
  refreshSceneNotice();
  document.body.classList.toggle('combat-active', snapshot.combat.active);
  if (snapshot.combat.active) { if (!combatWasActive) { actionsMenuOpen = false; combatBarMode = null; } armedExplorationActionId = null; armedExplorationAttackId = null; armedExplorationBasicActionId = null; }
  combatWasActive = snapshot.combat.active;
  const combat = $('combatNotice');
  combat.hidden = !snapshot.combat.active;
  if (snapshot.combat.active) {
    const current = snapshot.entities.find(entity => entity.id === snapshot.combat.currentId);
    const mine = snapshot.combat.currentId === privateState?.characterId;
    if (mine && snapshot.combat.currentId !== previousCombatantId) { turnAnnouncementUntil = Date.now() + 1300; window.setTimeout(() => renderCombatControls(), 1350); }
    combat.textContent = privateState?.combat?.initiative.pending ? '● Iniciativa: tira e introduce tu total' : mine ? Date.now() < turnAnnouncementUntil ? 'TU TURNO' : '● Tu turno' : `● Turno de ${current?.label ?? 'DM'}`;
  }
  renderCombatControls();
  renderExplorationControls();
  if (combatEndedNotice) toast(combatEndedNotice);
});
socket.on('camera:orientation', (event: { runtimeEpoch: string; sceneEpoch: number; sceneId: string; step: number | null }) => {
  if (event.runtimeEpoch !== runtimeEpoch || event.sceneEpoch < (lastSnapshot?.sceneEpoch ?? 0)) return;
  if (event.step === null) { world.clearSharedCameraOrientations(); return; }
  if (!Number.isInteger(event.step) || event.step < 0 || event.step > 7) return;
  world.setSharedCameraOrientation(event.sceneId, event.step);
  updatePlayerCameraControls(event.sceneId);
});
socket.on('player:private', (next: PlayerPrivate) => {
  if (next.runtimeEpoch !== runtimeEpoch) return;
  const previousCharacter = privateState?.characterId;
  privateState = next;
  if (!next.characterId) {
    stop();
    world.setLocalPlayer(null);
    world.setContextInteractionTarget(null);
    $('hud').hidden = true;
    $('campInteractions').hidden = true;
    $('join').hidden = false;
    if (next.notice) toast(next.notice);
    return;
  }
  localStorage.setItem(characterStorageKey, next.characterId);
  $('join').hidden = true;
  $('hud').hidden = false;
  initializeJoystick();
  world.setLocalPlayer(next.characterId);
  $('name').textContent = next.label ?? 'Aventurero';
  $('hp').textContent = `PG ${next.hp}/${next.maxHp}`;
  renderInventory(next.inventory);
  renderSheet(next);
  renderCombatControls();
  renderProximityButton();
  renderCampInteractions(next);
  renderExplorationControls();
  $('sceneNotice').textContent = next.rowboat?.aboard
    ? next.rowboat.pilot ? 'Barca · rema con WASD o el mando · pulsa Bajar para nadar'
      : 'Barca · otro personaje lleva los remos · pulsa Bajar para nadar'
    : lastSnapshot ? `${lastSnapshot.scene.title} · 1 casilla = 1,5 m` : 'Escena no disponible';
  refreshSceneNotice();
  const canMove = next.sceneMovementEnabled && (!next.combat || next.combat.isTurn) && (!next.rowboat?.aboard || next.rowboat.pilot);
  $('joystick').classList.toggle('disabled', !canMove);
  if (!canMove) stop();
  if (next.notice) toast(next.notice);
});
socket.on('command:result', (result: CommandResult) => {
  if (result.runtimeEpoch !== runtimeEpoch) return;
  const confirmation = result.commandId ? pendingCombatNotices.get(result.commandId) : undefined;
  if (result.commandId) { pendingCombatNotices.delete(result.commandId); pendingCombatCommands.delete(result.commandId); }
  if (result.ok) { renderCombatControls(); if (confirmation) toast(confirmation);
    if (result.code === 'ROWBOAT_BOARDED') toast('A bordo. Quien lleva los remos puede navegar con WASD o el mando.');
    if (result.code === 'ROWBOAT_LEFT') toast('Has bajado de la barca y puedes nadar.');
    return; }
  if (!result.ok) {
    const message: Record<string, string> = {
      NOT_YOUR_ACTION: 'Solo puedes cancelar tu propia selección.', ACTION_ALREADY_RESOLVING: 'Ya se ha confirmado una tirada; termina la resolución. El DM puede deshacer un error.',
      TOO_FAR: 'Estás demasiado lejos.', OUT_OF_RANGE: 'El objetivo está fuera de alcance.', NOT_YOUR_TURN: 'No es tu turno.', MOVEMENT_SPENT: 'No te queda suficiente movimiento para hacerlo.',
      ROLL_PENDING: 'Termina la tirada pendiente antes de continuar.', PROMPT_STALE: 'Esta tirada ya no está vigente.',
      LINE_OF_EFFECT_BLOCKED: 'Una pared o puerta cerrada bloquea el ataque.', INVENTORY_DEPLETED: 'No queda munición o una daga disponible para lanzar.', RECHARGE_REQUIRED: 'Esta acción todavía necesita recargarse.',
      PROMPT_STAGE_MISMATCH: 'Esta respuesta pertenece a otro paso de la acción.', WRONG_ACTOR: 'Esta tirada corresponde a otro personaje.',
      INVALID_DAMAGE_DICE: 'El resultado no es posible para esos dados.', INVALID_ROLL: 'El resultado introducido no es válido.', NO_LANDING: 'No hay una casilla libre junto a la barca para bajar.', JUMP_OUT_OF_RANGE: 'Ese destino supera tu salto largo máximo con carrera según tu FUE.',
      ACTION_USED: 'Ya has usado tu acción.', REACTION_USED: 'Ya has usado tu reacción.', RESOURCE_DEPLETED: 'No queda el recurso necesario.', SPELL_SLOT_USED_THIS_TURN: 'Ya has gastado un espacio de conjuro en este turno.', INVALID_TARGET: 'El objetivo ya no es válido.'
    };
    renderedTargetMenuKey = ''; renderCombatFrame(); renderTargetMenu(); toast(message[result.code] ?? result.code);
  }
});

function combatActionsAvailable(combat = privateState?.combat) {
  return Boolean(combat && (combat.initiative.pending || combat.isTurn || combat.ready || combat.prompt || !combat.reactionUsed && combat.attacks.some(action => action.actionCost === 'reaction')));
}

function compactActionLabel(label: string) { return label.split(' · ')[0]?.trim() || label; }

function closeActionPanel() {
  actionsMenuOpen = false; actionRadialPage = 0; renderedTargetMenuKey = '';
  renderActionToggle(); renderTargetMenu(); renderExplorationControls();
}

function actionPanelHeader(kicker: string, title: string, summary: string) {
  const header = document.createElement('header'), copy = document.createElement('div'), eyebrow = document.createElement('small'), heading = document.createElement('strong'), note = document.createElement('span'), minimize = document.createElement('button');
  header.className = 'action-panel-header'; eyebrow.textContent = kicker; heading.textContent = title; note.textContent = summary; copy.append(eyebrow, heading, note);
  minimize.type = 'button'; minimize.className = 'action-panel-minimize'; minimize.textContent = '—'; minimize.title = 'Minimizar acciones'; minimize.setAttribute('aria-label', 'Minimizar acciones'); minimize.onclick = closeActionPanel;
  header.append(copy, minimize); return header;
}

let actionTooltipSequence = 0;
function actionTooltip(text: string) {
  const tooltip = document.createElement('span');
  tooltip.className = 'action-tooltip'; tooltip.id = `action-tooltip-${++actionTooltipSequence}`; tooltip.setAttribute('role', 'tooltip'); tooltip.textContent = text;
  return tooltip;
}

function enableLongPressInfo(button: HTMLButtonElement, tooltip: HTMLElement) {
  let holdTimer = 0, hideTimer = 0, suppressClick = false, shown = false, origin: { x: number; y: number } | null = null, homeParent: Node | null = null, homeNext: Node | null = null, homeStyle: string | null = null;
  button.setAttribute('aria-describedby', tooltip.id);
  const clearHold = () => { if (holdTimer) { clearTimeout(holdTimer); holdTimer = 0; } };
  const hide = () => {
    tooltip.classList.remove('touch-visible');
    if (tooltip.parentNode === document.body) {
      if (homeParent?.isConnected) homeNext?.parentNode === homeParent ? homeParent.insertBefore(tooltip, homeNext) : homeParent.appendChild(tooltip);
      else tooltip.remove();
      if (homeStyle === null) tooltip.removeAttribute('style'); else tooltip.setAttribute('style', homeStyle);
    }
    shown = false; suppressClick = false;
  };
  button.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse') return;
    clearTimeout(hideTimer); hide(); origin = { x: event.clientX, y: event.clientY };
      holdTimer = window.setTimeout(() => {
        holdTimer = 0; shown = true; suppressClick = true; homeParent = tooltip.parentNode; homeNext = tooltip.nextSibling; homeStyle = tooltip.getAttribute('style');
        tooltip.removeAttribute('style'); document.body.append(tooltip); tooltip.classList.add('touch-visible');
      }, 650);
  });
  button.addEventListener('pointermove', event => {
    if (origin && Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > 14) clearHold();
  });
  const finish = () => {
    clearHold(); origin = null;
    if (shown) hideTimer = window.setTimeout(hide, 5000);
  };
  button.addEventListener('pointerup', finish); button.addEventListener('pointercancel', () => { clearHold(); origin = null; });
  button.addEventListener('contextmenu', event => { if (holdTimer || shown) event.preventDefault(); });
  button.addEventListener('click', event => {
    if (!suppressClick) return;
    event.preventDefault(); event.stopImmediatePropagation();
  }, { capture: true });
}

function renderActionToggle() {
  const button = $('actionToggle');
  const explorationActive = Boolean(privateState && (privateState.hp ?? 0) > 0 && !privateState.conditions.some(condition => condition === 'inconsciente' || condition === 'paralizada') && lastSnapshot && !lastSnapshot.combat.active);
  const combat = privateState?.combat;
  const combatActive = Boolean(combat && lastSnapshot?.combat.active);
  const active = explorationActive || combatActive;
  document.body.classList.toggle('combat-wheel-open', combatActive && actionsMenuOpen);
  button.setAttribute('aria-controls', 'actionRadial');
  button.hidden = !active;
  (button as HTMLButtonElement).disabled = combatActive && (!combatActionsAvailable() || Boolean(combat?.initiative.pending || combat?.prompt || combat?.pendingAction || pendingCombatCommands.size) || Boolean(combat?.conditions.some(condition => condition === 'inconsciente' || condition === 'paralizada')));
  button.textContent = actionsMenuOpen ? '×' : '✋︎';
  button.style.transform = active && actionsMenuOpen ? 'translate(-50%, -18px)' : 'translateX(-50%)';
  if (!active) { button.classList.remove('has-context'); button.setAttribute('aria-expanded', 'false'); return; }
  const selected = armedExplorationActionId ? privateState?.explorationActions.find(action => action.id === armedExplorationActionId)?.label : armedExplorationAttackId ? privateState?.explorationAttacks.find(action => action.id === armedExplorationAttackId)?.label : armedExplorationBasicActionId ? explorationBasicActionCatalogue[armedExplorationBasicActionId].label : undefined;
  const context = explorationActive ? contextualInteraction() : null;
  button.classList.toggle('has-context', Boolean(context));
  const actionLabel = [selected ? `seleccionada: ${compactActionLabel(selected)}` : '', context ? `interacción cercana: ${context.label}` : ''].filter(Boolean).join('; ');
  const accessibleLabel = actionLabel ? `¿Qué puedo hacer? ${actionLabel}` : '¿Qué puedo hacer?';
  button.setAttribute('aria-label', actionsMenuOpen ? `Cerrar ${accessibleLabel.toLowerCase()}` : accessibleLabel);
  button.title = actionsMenuOpen ? 'Cerrar rueda de acciones' : accessibleLabel;
  button.classList.remove('combat-actions-toggle'); button.setAttribute('aria-expanded', String(actionsMenuOpen));
}

function finishCombatTurn() {
  if (!lastSnapshot || !privateState?.combat?.isTurn || privateState.combat.prompt || privateState.combat.pendingAction || privateState.combat.initiative.pending || pendingCombatCommands.size) return;
  const id = commandId(); pendingCombatCommands.add(id);
  socket.emit('player:combat', { runtimeEpoch, type: 'combat:endTurn', commandId: id, sceneEpoch: lastSnapshot.sceneEpoch });
  renderCombatFrame();
}

function chooseCombatBarMode(mode: Exclude<CombatBarMode, null>) {
  const combat = privateState?.combat;
  if (!combat || combat.initiative.pending) return;
  combatBarMode = mode;
  actionRadialPage = 0;
  actionRadialCategory = ({ attack: 'Ataques', magic: 'Conjuros y trucos', bonus: 'Acciones adicionales', reaction: 'Reacciones', rules: 'Otras acciones y reglas', move: '' })[mode] || null;
  armedActionId = null; armedBasicAction = null; renderedTargetMenuKey = '';
  if (mode === 'move') {
    actionsMenuOpen = false; openCombatCategory = null;
    toast(combat.movement ? `Mover: te quedan ${(combat.movement.remainingSquares * 1.5).toFixed(1)} m. El mapa marca las casillas alcanzables.` : 'Mover: usa el mapa o los controles de desplazamiento.');
  } else {
    actionsMenuOpen = true;
    openCombatCategory = mode === 'rules' ? 'rules' : mode;
  }
  document.body.classList.toggle('combat-move-mode', mode === 'move');
  updateAttackRangePreview(); renderCombatControls();
}

function renderCombatFrame() {
  const active = Boolean(privateState?.combat && lastSnapshot?.combat.active && privateState);
  const initiative = $('combatInitiative'), legend = $('combatLegend'), hero = $('combatHero'), bar = $('combatCommandBar'), resources = $('combatResources');
  initiative.hidden = !active; legend.hidden = !active || !(armedActionId || armedBasicAction || playerDisplaySettings.showMovementHints && document.body.classList.contains('combat-move-mode')); hero.hidden = true; bar.hidden = true; resources.hidden = !active;
  document.body.classList.toggle('combat-resolving', Boolean(active && (privateState?.combat?.prompt || privateState?.combat?.initiative.pending)));
  document.body.classList.toggle('combat-targeting', Boolean(active && (armedActionId || armedBasicAction || privateState?.combat?.pendingAction)));
  if (!active || !privateState || !lastSnapshot || !privateState.combat) {
    initiative.replaceChildren(); hero.replaceChildren(); bar.replaceChildren(); resources.replaceChildren(); delete bar.dataset.renderKey; return;
  }
  const combat = privateState.combat;
  // Los snapshots se repiten mientras se mantiene el dedo sobre un retrato.
  // Conservar los nodos impide que desaparezca la pulsación larga o el foco.
  const renderKey = JSON.stringify([combat, privateState.hp, privateState.maxHp, privateState.label, privateState.concentration, lastSnapshot.combat, lastSnapshot.entities.map(entity => [entity.id, entity.tokenId, entity.cell]), combatBarMode, actionsMenuOpen, armedActionId, armedBasicAction, pendingCombatCommands.size, world.combatOverview, innerWidth, innerHeight, playerDisplaySettings.actionX, playerDisplaySettings.actionY, playerDisplaySettings.actionSize]);
  if (bar.dataset.renderKey === renderKey) return;
  bar.dataset.renderKey = renderKey;
  const currentId = lastSnapshot.combat.currentId;
  const heading = document.createElement('header'), title = document.createElement('strong'), round = document.createElement('span');
  heading.className = 'combat-initiative-header'; title.textContent = combat.initiative.pending ? 'Iniciativa' : combat.isTurn ? 'Tu turno' : lastSnapshot.combat.participants.find(participant => participant.id === currentId)?.label ?? 'Combate'; title.setAttribute('aria-live', 'polite'); round.textContent = combat.initiative.pending ? 'Esperando tiradas' : `Ronda ${lastSnapshot.combat.round}`; heading.append(title, round);
  const roster = document.createElement('div'); roster.className = 'combat-initiative-roster';
  const confirmedOrder = lastSnapshot.combat.order?.map(entry => lastSnapshot!.combat.participants.find(participant => participant.id === entry.id)).filter((participant): participant is NonNullable<typeof participant> => Boolean(participant)) ?? [];
  const participants = confirmedOrder.length ? confirmedOrder : [...lastSnapshot.combat.participants].sort((left, right) => right.initiative - left.initiative || left.label.localeCompare(right.label, 'es'));
  const selfEntity = lastSnapshot.entities.find(entity => entity.id === privateState!.characterId);
  const initiativeTooltip = (participant: typeof participants[number]) => {
    const tooltip = document.createElement('aside'), eyebrow = document.createElement('small'), title = document.createElement('strong'), facts = document.createElement('ul'), note = document.createElement('p');
    const entity = lastSnapshot!.entities.find(item => item.id === participant.id);
    const isSelf = participant.id === privateState!.characterId;
    const distance = selfEntity && entity && !isSelf ? Math.max(Math.abs(selfEntity.cell.col - entity.cell.col), Math.abs(selfEntity.cell.row - entity.cell.row)) * 1.5 : null;
    tooltip.className = 'initiative-tooltip'; tooltip.id = `initiative-info-${participant.id}`; tooltip.setAttribute('role', 'tooltip'); eyebrow.textContent = isSelf ? 'TU PERSONAJE' : participant.controller === 'player' ? 'ALIADO' : 'OPONENTE'; title.textContent = isSelf ? privateState!.label ?? participant.label : participant.label;
    const addFact = (text: string) => { const item = document.createElement('li'); item.textContent = text; facts.append(item); };
    if (isSelf) addFact(`CA ${privateState!.sheet?.armorClass ?? participant.armorClass}`);
    if (isSelf) addFact(`PG ${privateState!.hp}/${privateState!.maxHp}`);
    if (distance !== null) addFact(`A ${distance.toFixed(1)} m de ti`);
    if (participant.conditions.length) addFact(`Condiciones: ${participant.conditions.join(', ')}`);
    note.textContent = isSelf ? 'Datos de tu ficha.' : 'Sólo muestra información conocida en combate; no revela PG, velocidad, ataques ni rasgos ocultos.';
    tooltip.append(eyebrow, title, facts, note); return tooltip;
  };
  for (const participant of participants) {
    const row = document.createElement('button'), position = document.createElement('span'), portrait = document.createElement('span'), copy = document.createElement('span'), name = document.createElement('b'), detail = document.createElement('small');
    row.type = 'button';
    row.className = 'initiative-row'; row.classList.toggle('current', participant.id === currentId); row.classList.toggle('self', participant.id === privateState.characterId);
    row.setAttribute('aria-label', `Ver información conocida de ${participant.id === privateState.characterId ? 'tu personaje' : participant.label}`);
    position.textContent = combat.initiative.pending ? (participant.initiativeSubmitted ? '✓' : '…') : String(participants.indexOf(participant) + 1);
    portrait.className = 'initiative-portrait';
    const entity = lastSnapshot.entities.find(item => item.id === participant.id), token = entity ? campaign.tokens[entity.tokenId] : undefined, art = token?.portraitUrl ?? token?.url;
    if (art) { const image = document.createElement('img'); image.src = art; image.alt = ''; portrait.append(image); } else portrait.textContent = participant.label.slice(0, 1).toUpperCase();
    name.textContent = participant.id === privateState.characterId ? 'Tú' : participant.label;
    detail.textContent = combat.initiative.pending ? (participant.initiativeSubmitted ? 'lista' : 'por tirar') : participant.id === currentId ? 'en turno' : participant.controller === 'player' ? 'aliado' : 'oponente';
    copy.append(name, detail); const tooltip = initiativeTooltip(participant); row.append(position, portrait, copy, tooltip); enableLongPressInfo(row, tooltip); roster.append(row);
    row.onclick = () => {
      if (armedActionId || armedBasicAction) { selectCombatTarget(participant.id); return; }
      const expanded = !tooltip.classList.contains('tap-visible');
      initiative.querySelectorAll('.tap-visible').forEach(item => item.classList.remove('tap-visible'));
      tooltip.classList.toggle('tap-visible', expanded); row.setAttribute('aria-expanded', String(expanded));
    };
    if (armedActionId || armedBasicAction) row.setAttribute('aria-label', `Elegir objetivo: ${participant.label}`);
  }
  initiative.replaceChildren(heading, roster);

  const selfParticipant = lastSnapshot.combat.participants.find(item => item.id === privateState!.characterId);
  const incapacitated = Boolean(selfParticipant?.conditions.some(condition => condition === 'paralizada' || condition === 'inconsciente'));
  const any = (predicate: (action: CombatAction) => boolean) => combat.attacks.some(predicate);
  const actionAvailable = combat.isTurn && !incapacitated && !combat.prompt && !combat.pendingAction && !Boolean(pendingCombatCommands.size);
  const hasBonus = any(action => action.actionCost === 'bonus');
  const indicators = combatTurnIndicators({ pending: combat.initiative.pending, incapacitated, isTurn: combat.isTurn, remainingSquares: combat.movement?.remainingSquares, maximumSquares: combat.movement?.maximumSquares, actionUsed: combat.actionUsed, bonusActionUsed: combat.bonusActionUsed, reactionUsed: combat.reactionUsed, hasBonus });
  const resourceNodes = indicators.map(indicator => {
    const item = document.createElement('span'), label = document.createElement('small'), value = document.createElement('b');
    const symbols: Record<string, string> = { Movimiento: '➟', Acción: '◆', Adicional: '✦', Reacción: '⛨' };
    item.className = `turn-resource${indicator.ready ? ' ready' : ''}`; item.title = `${indicator.label}: ${indicator.value}`; item.setAttribute('aria-label', item.title); label.textContent = symbols[indicator.label] ?? indicator.label; value.textContent = indicator.label === 'Movimiento' ? combat.isTurn ? `${((combat.movement?.remainingSquares ?? 0) * 1.5).toFixed(1)} m` : '—' : indicator.value; item.append(label, value); return item;
  });
  const overview = document.createElement('button'); overview.type = 'button'; overview.className = 'combat-overview'; overview.textContent = '⌖'; overview.title = world.combatOverview ? 'Ver combate' : 'Mapa completo'; overview.setAttribute('aria-label', overview.title); overview.setAttribute('aria-pressed', String(world.combatOverview)); overview.onclick = () => { world.setCombatOverview(!world.combatOverview); renderCombatFrame(); }; heading.append(overview);
  const effect = document.createElement('span'); effect.className = 'combat-active-effects'; effect.textContent = [privateState.concentration ? `Concentración: ${compactActionLabel(privateState.concentration.label)}` : '', combat.conditions.join(', ')].filter(Boolean).join(' · '); effect.hidden = !effect.textContent;
  resources.replaceChildren(...resourceNodes, effect, ...(privateState.concentration ? [endConcentrationButton()] : []));
  const anchor = $('actionToggle').getBoundingClientRect();
  resources.style.left = `${Math.max(94, Math.min(innerWidth - 94, anchor.left + anchor.width / 2))}px`;
  resources.style.top = `${Math.max(112, anchor.top - 42)}px`; resources.style.bottom = 'auto';
  const legendDetails = document.createElement('details'), legendTitle = document.createElement('summary');
  const selectedAttack = combat.attacks.find(action => action.id === armedActionId);
  const bands: Array<[string, string]> = !armedActionId && !armedBasicAction ? [['legend-move', 'Movimiento disponible']] : [['legend-normal', 'Alcance normal'], ...(selectedAttack?.range?.longMeters && selectedAttack.range.longMeters > selectedAttack.range.normalMeters ? [['legend-long', 'Alcance largo · desventaja'] as [string, string]] : [])];
  // Only the currently displayed map overlays need a key.
  legendTitle.textContent = '◈ Colores del mapa'; legendDetails.append(legendTitle);
  for (const [className, text] of bands) { const row = document.createElement('span'), color = document.createElement('i'); color.className = className; row.append(color, text); legendDetails.append(row); }
  legend.replaceChildren(legendDetails);
  const continuingAction = combat.sequence?.remaining ? combat.attacks.find(action => action.id === combat.sequence!.actionId) : undefined;
  if (continuingAction) {
    const continuation = document.createElement('button'); continuation.type = 'button'; continuation.className = 'combat-overview';
    continuation.textContent = `Continuar ${compactActionLabel(continuingAction.label)} · quedan ${combat.sequence!.remaining}`;
    continuation.title = combatActionDescription(continuingAction, undefined, combat.sequence!.remaining);
    continuation.disabled = !actionAvailable; continuation.onclick = () => selectCombatAction(continuingAction); resources.append(continuation);
  }
  bar.replaceChildren();
}

function cancelActionSelection() {
  armedActionId = null; armedBasicAction = null; armedExplorationActionId = null; armedExplorationAttackId = null; armedExplorationBasicActionId = null;
  selectedTargetId = null; actionsMenuOpen = false; actionRadialPage = 0; actionRadialCategory = null; renderedTargetMenuKey = '';
  $('actionRadial').hidden = true; updateAttackRangePreview(); renderCombatControls(); renderExplorationControls(); renderSelectedAction();
}

function renderSelectedAction() {
  const tray = $('selectedAction'), combat = privateState?.combat;
  const action = armedActionId ? combat?.attacks.find(item => item.id === armedActionId) : armedExplorationActionId ? privateState?.explorationActions.find(item => item.id === armedExplorationActionId) : armedExplorationAttackId ? privateState?.explorationAttacks.find(item => item.id === armedExplorationAttackId) : undefined;
  const label = action?.label ?? (armedBasicAction ? basicActionLabels[armedBasicAction] : armedExplorationBasicActionId ? explorationBasicActionCatalogue[armedExplorationBasicActionId].label : undefined);
  const pending = combat?.pendingAction;
  tray.hidden = Boolean(combat?.prompt) || !label && !pending; tray.replaceChildren(); if (tray.hidden) return;
  const text = document.createElement('span'), cancel = document.createElement('button'), heading = document.createElement('strong');
  heading.textContent = pending ? `${compactActionLabel(pending.label)} · ${pending.cancellable ? 'sin tirada confirmada' : 'resolución en curso'}` : `${compactActionLabel(label!)} · elige objetivo en el mapa`;
  text.append(heading);
  if (action && 'attackBonus' in action) {
    const detail = document.createElement('small'), target = lastSnapshot?.combat.participants.find(item => item.id === selectedTargetId);
    const disclosure = document.createElement('details'), summary = document.createElement('summary'); summary.textContent = 'Detalle';
    detail.textContent = combatActionDescription(action, target?.armorClass); disclosure.append(summary, detail); text.append(disclosure);
  }
  cancel.type = 'button'; cancel.textContent = '× Cancelar'; cancel.disabled = Boolean(pendingCombatCommands.size) || Boolean(pending && !pending.cancellable);
  cancel.onclick = cancelPendingCombatSelection;
  tray.append(text, cancel);
}

function cancelPendingCombatSelection() {
  const pending = privateState?.combat?.pendingAction;
  if (pending && lastSnapshot) {
    if (!pending.cancellable || pendingCombatCommands.size) return;
    const id = commandId(); pendingCombatCommands.add(id);
    socket.emit('player:combat', { runtimeEpoch, type: 'combat:cancelAction', commandId: id, sceneEpoch: lastSnapshot.sceneEpoch, ...(pending.promptId ? { promptId: pending.promptId } : {}) });
  } else cancelActionSelection();
}

function showCombatFlee() {
  const dialog = $('combatFleeDialog') as HTMLDialogElement, combat = privateState?.combat;
  if (!combat || !lastSnapshot) return;
  const allowed = combat.isTurn && !combat.actionUsed && !combat.prompt && !combat.pendingAction;
  for (const [id, action] of [['fleeDash', 'dash'], ['fleeDisengage', 'disengage']] as const) {
    const button = $(id) as HTMLButtonElement; button.disabled = !allowed;
    button.onclick = () => { dialog.close(); useBasicCombatAction(action); chooseCombatBarMode('move'); };
  }
  $('fleeNotify').onclick = () => { dialog.close(); if (!lastSnapshot) return; socket.emit('player:combat', { runtimeEpoch, type: 'combat:flee', commandId: commandId(), sceneEpoch: lastSnapshot.sceneEpoch }); toast('El DM recibe tu intención de huir. Tu ficha sigue en combate hasta que confirme la salida.'); };
  dialog.showModal();
}

function renderCombatControls() {
  const combat = privateState?.combat, active = Boolean(combat && lastSnapshot?.combat.active && privateState);
  $('endTurn').hidden = !Boolean(active && combat!.isTurn && !combat!.initiative.pending);
  ($('endTurn') as HTMLButtonElement).disabled = Boolean(combat?.prompt || combat?.pendingAction || pendingCombatCommands.size);
  document.body.classList.toggle('combat-move-mode', Boolean(active && combat!.isTurn && !combat!.conditions.some(condition => condition === 'paralizada' || condition === 'inconsciente') && !combat!.initiative.pending && !combat!.prompt && !combat!.pendingAction && !actionsMenuOpen && !armedActionId && !armedBasicAction));
  renderActionToggle();
  if (!active || !privateState) { if (privateState) $('combatHp').title = `Puntos de golpe ${privateState.hp}/${privateState.maxHp}`; $('targetMenu').hidden = true; selectedTargetId = null; armedActionId = null; armedBasicAction = null; combatBarMode = null; document.body.classList.remove('combat-move-mode'); openCombatCategory = null; renderedTargetMenuKey = ''; updateAttackRangePreview(); renderCombatFrame(); return; }
  const armedAction = armedActionId ? combat!.attacks.find(action => action.id === armedActionId) : undefined;
  if ((armedBasicAction && !combat!.isTurn) || (armedAction && !combat!.isTurn && !combat!.ready && armedAction.actionCost !== 'reaction')) { armedActionId = null; armedBasicAction = null; renderedTargetMenuKey = ''; }
  const movement = combat!.movement;
  const conditions = combat!.conditions.length ? ` · ◉ ${combat!.conditions.join(', ')}` : '';
  const concentration = privateState.concentration ? ` · Concentración: ${privateState.concentration.label}` : '';
  const movementText = combat!.conditions.some(condition => condition === 'inconsciente' || condition === 'paralizada') ? ' · Movimiento 0 m' : movement ? ` · Movimiento ${movement.remainingSquares}/${movement.maximumSquares} casillas (${(movement.remainingSquares * 1.5).toFixed(1)} m)` : '';
  $('hp').textContent = `PG ${privateState.hp}/${privateState.maxHp}`;
  $('combatHp').title = [`Puntos de golpe ${privateState.hp}/${privateState.maxHp}`, movementText.replace(/^ · /, ''), conditions.replace(/^ · /, ''), concentration.replace(/^ · /, '')].filter(Boolean).join(' · ');
  if (combat!.initiative.pending) $('combatNotice').textContent = combat!.initiative.submitted ? '● Iniciativa registrada' : '● Iniciativa: tira e introduce tu total';
  else if (Date.now() >= turnAnnouncementUntil) $('combatNotice').textContent = combat!.isTurn ? '● Tu turno' : `● Turno de ${lastSnapshot!.combat.participants.find(item => item.id === lastSnapshot!.combat.currentId)?.label ?? 'DM'}`;
  updateAttackRangePreview();
  renderCombatFrame();
  renderTargetMenu();
}

function renderInventory(items: string[]) {
  const inventoryKey=JSON.stringify(items);if($('inventoryList').dataset.renderKey===inventoryKey)return;$('inventoryList').dataset.renderKey=inventoryKey;
  $('items').replaceChildren(...items.map(item => { const row = document.createElement('li'); row.textContent = item; return row; }));
  const list = $('inventoryList'); list.replaceChildren(...items.map((item, index) => {
    const row = document.createElement('article'), label = document.createElement('div'), name = document.createElement('span'), use = document.createElement('button');
    row.className = 'inventory-item'; label.className = 'inventory-item-label'; name.textContent = item;
    const iconIndex = campaignShipLootIconIndex(campaign.campaignId, item);
    if (iconIndex !== null) {
      const icon = document.createElement('span'); icon.className = 'inventory-art-icon'; icon.setAttribute('aria-hidden', 'true');
      icon.style.backgroundImage = "url('/art/ship/loot-atlas-m5.svg')";
      icon.style.backgroundPosition = `${iconIndex % 4 * 100 / 3}% ${Math.floor(iconIndex / 4) * 100 / 4}%`;
      label.append(icon);
    }
    label.append(name); row.append(label);
    if (/\bantorcha\s+encendida\b/i.test(item)) {
      use.textContent = 'Apagar'; use.title = 'Apagar la luz que llevas';
      use.onclick = () => setInventoryTorchLit(index, false); row.append(use);
    } else if (/\bantorchas?\b/i.test(item)) {
      use.textContent = 'Encender'; use.title = 'Marcar una antorcha como encendida cuando tengas cómo hacerlo';
      use.onclick = () => setInventoryTorchLit(index, true); row.append(use);
    } else if (/\b(aceite|poción|pocion|ración|racion)\b/i.test(item)) {
      use.textContent = 'Usar'; use.title = 'Consumir una unidad y actualizar la mochila';
      use.onclick = () => consumeInventoryItem(index); row.append(use);
    }
    return row;
  }));
  const dialog = $('inventory') as HTMLDialogElement;
  if (!dialog.open) ($('inventoryEditor') as HTMLTextAreaElement).value = items.join('\n');
}

function setInventoryTorchLit(index: number, lit: boolean) {
  if (!privateState) return;
  const next = [...privateState.inventory], item = next[index]; if (!item) return;
  if (lit) {
    const suffix = /^(.*?)\s*(?:×|x)\s*(\d+)\s*$/i.exec(item), prefix = /^(\d+)\s+(.+)$/.exec(item);
    const quantity = suffix ? Number(suffix[2]) : prefix ? Number(prefix[1]) : 1;
    if (quantity <= 1) next.splice(index, 1);
    else next[index] = `${(suffix?.[1] ?? prefix?.[2] ?? item).trim()} ×${quantity - 1}`;
    next.push('Antorcha encendida');
  } else next[index] = 'Antorcha';
  socket.emit('player:inventory', { runtimeEpoch, commandId: commandId(), items: next });
  toast(lit ? 'Antorcha encendida; el DM controla su duración.' : 'Antorcha apagada.');
}

function consumeInventoryItem(index: number) {
  if (!privateState) return;
  const next = [...privateState.inventory], item = next[index]; if (!item) return;
  const suffix = /^(.*?)\s*(?:×|x)\s*(\d+)\s*$/i.exec(item), prefix = /^(\d+)\s+(.+)$/.exec(item);
  const quantity = suffix ? Number(suffix[2]) : prefix ? Number(prefix[1]) : 1;
  if (quantity <= 1) next.splice(index, 1);
  else next[index] = `${(suffix?.[1] ?? prefix?.[2] ?? item).trim()} ×${quantity - 1}`;
  socket.emit('player:inventory', { runtimeEpoch, commandId: commandId(), items: next });
  toast(`Usado: ${item}`);
}

function actionCanTarget(action: CombatAction, targetId: string | null) {
  if (action.targeting === 'point') return false;
  if (!lastSnapshot || !privateState?.combat || !targetId) return false;
  const target = lastSnapshot.entities.find(entity => entity.id === targetId);
  const participant = lastSnapshot.combat.participants.find(item => item.id === targetId && item.active);
  const self = lastSnapshot.entities.find(entity => entity.id === privateState!.characterId);
  if (!target || !participant || !self || action.resolution !== 'guided' && participant.controller === 'player') return false;
  const meters = Math.max(Math.abs(self.cell.col - target.cell.col), Math.abs(self.cell.row - target.cell.row)) * 1.5;
  return meters <= (action.range?.longMeters ?? action.range?.normalMeters ?? Infinity);
}

function actionCanTargetPoint(action: CombatAction, cell: { col: number; row: number }) {
  if (action.targeting !== 'point' || !lastSnapshot || !privateState?.combat) return false;
  const self = lastSnapshot.entities.find(entity => entity.id === privateState!.characterId);
  if (!self) return false;
  const meters = Math.max(Math.abs(self.cell.col - cell.col), Math.abs(self.cell.row - cell.row)) * 1.5;
  return meters <= (action.range?.longMeters ?? action.range?.normalMeters ?? Infinity);
}

function updateAttackRangePreview() {
  renderSelectedAction();
  if (!lastSnapshot || !privateState?.characterId) { world.clearAttackRange(); return; }
  if (lastSnapshot.combat.active) {
    const action = armedActionId ? privateState.combat?.attacks.find(candidate => candidate.id === armedActionId) : undefined;
    if (action?.range) world.showAttackRange(privateState.characterId, action.range.normalMeters, action.range.longMeters);
    else world.clearAttackRange();
    return;
  }
  const attack = armedExplorationAttackId ? privateState.explorationAttacks.find(candidate => candidate.id === armedExplorationAttackId) : undefined;
  const action = armedExplorationActionId ? privateState.explorationActions.find(candidate => candidate.id === armedExplorationActionId) : undefined;
  if (attack?.range) world.showAttackRange(privateState.characterId, attack.range.normalMeters, attack.range.longMeters);
  else if (action && action.target !== 'self' && action.target !== 'none' && action.rangeMeters > 0) world.showAttackRange(privateState.characterId, action.rangeMeters);
  else world.clearAttackRange();
}

function declareCombatAction(action: CombatAction, targetId: string) {
  if (!lastSnapshot || !privateState?.combat) return;
  if (!actionCanTarget(action, targetId)) return toast('Elige un objetivo válido que esté dentro del alcance.');
  if (pendingCombatCommands.size) return toast('Esperando la confirmación de la acción anterior.');
  armedActionId = null; armedBasicAction = null; renderedTargetMenuKey = ''; updateAttackRangePreview();
  const id = commandId(); pendingCombatCommands.add(id);
  socket.emit('player:combat', { runtimeEpoch, type: 'combat:declare', commandId: id, sceneEpoch: lastSnapshot.sceneEpoch, targetId, actionId: action.id, useSneakAttack: true });
  toast(action.resolution === 'guided' ? 'Acción declarada al DM.' : action.save ? 'El objetivo debe hacer una salvación.' : action.automaticHit ? 'Preparando el daño automático…' : 'Preparando tirada de ataque…');
  renderTargetMenu();
}

function declareCombatPointAction(action: CombatAction, cell: { col: number; row: number }) {
  if (!lastSnapshot || !privateState?.combat) return;
  if (!actionCanTargetPoint(action, cell)) return toast('Elige una casilla dentro del alcance.');
  if (pendingCombatCommands.size) return toast('Esperando la confirmación de la acción anterior.');
  armedActionId = null; armedBasicAction = null; renderedTargetMenuKey = ''; updateAttackRangePreview();
  const id = commandId(); pendingCombatCommands.add(id);
  socket.emit('player:combat', { runtimeEpoch, type: 'combat:declare', commandId: id, sceneEpoch: lastSnapshot.sceneEpoch, targetCell: cell, actionId: action.id, useSneakAttack: true });
  toast(`${action.label} declarada sobre esa casilla; el DM resuelve el área.`);
  renderTargetMenu();
}

function selectCombatAction(action: CombatAction) {
  combatBarMode = action.actionCost === 'reaction' ? 'reaction' : action.actionCost === 'bonus' ? 'bonus' : action.magical ? 'magic' : 'attack';
  const deselect = armedActionId === action.id;
  // Also used by the direct "Continue" shortcut, not only an open wheel.
  actionsMenuOpen = false; armedActionId = deselect ? null : action.id; armedBasicAction = null; renderedTargetMenuKey = '';
  updateAttackRangePreview(); renderCombatFrame(); renderTargetMenu();
  if (deselect) return;
  if (action.targeting === 'point') { toast(`${action.label}: toca una casilla dentro del alcance.`); return; }
  const bands = action.range?.longMeters && action.range.longMeters > action.range.normalMeters ? ` Verde: alcance normal ${action.range.normalMeters} m; ámbar: alcance largo ${action.range.longMeters} m (desventaja).` : action.range ? ` Alcance marcado hasta ${action.range.normalMeters} m.` : '';
  toast(`${action.label}: toca una ficha objetivo para usarlo.${bands}`);
}

function useBasicCombatAction(action: BasicCombatAction, targetId?: string) {
  if (!lastSnapshot) return;
  if (pendingCombatCommands.size) return toast('Esperando la confirmación de la acción anterior.');
  const id = commandId();
  const notice = action === 'dash' ? 'Correr aplicada: ganas movimiento adicional igual a tu velocidad este turno.' : `${basicActionLabels[action]} aplicada.`;
  armedActionId = null; armedBasicAction = null; renderedTargetMenuKey = '';
  pendingCombatCommands.add(id); pendingCombatNotices.set(id, notice);
  socket.emit('player:combat', { runtimeEpoch, type: 'combat:basic', commandId: id, sceneEpoch: lastSnapshot.sceneEpoch, action, ...(targetId ? { targetId } : {}) });
  renderTargetMenu();
}

function selectBasicCombatAction(action: BasicCombatAction) {
  combatBarMode = 'rules';
  if (action !== 'help') { useBasicCombatAction(action); return; }
  const target = lastSnapshot?.combat.participants.find(item => item.id === selectedTargetId && item.active && item.controller !== 'player');
  if (target) { useBasicCombatAction(action, target.id); return; }
  if (armedBasicAction === action) { armedBasicAction = null; renderedTargetMenuKey = ''; renderTargetMenu(); return; }
  armedBasicAction = action; armedActionId = null; renderedTargetMenuKey = ''; renderTargetMenu();
  toast('Ayudar: toca al enemigo al que quieres distraer.');
}

function declareCombatEscape() {
  if (!lastSnapshot || pendingCombatCommands.size) return pendingCombatCommands.size ? toast('Esperando la confirmación de la acción anterior.') : undefined;
  const id = commandId(); pendingCombatCommands.add(id); renderedTargetMenuKey = '';
  socket.emit('player:combat', { runtimeEpoch, type: 'combat:escape', commandId: id, sceneEpoch: lastSnapshot.sceneEpoch });
  renderTargetMenu();
}

function renderTargetMenu() {
  const box = $('targetMenu'), combat = privateState?.combat;
  updateAttackRangePreview();
  renderActionToggle();
  const canResolvePrompt = Boolean(combat?.prompt);
  const canReact = Boolean(combat && !combat.reactionUsed && combat.attacks.some(action => action.actionCost === 'reaction'));
  const canUsePrepared = Boolean(combat?.ready);
  const target = lastSnapshot?.entities.find(entity => entity.id === selectedTargetId);
  const promptMode = Boolean(combat?.initiative.pending || combat?.prompt);
  box.classList.toggle('combat-prompt-menu', promptMode);
  // La iniciativa y las tiradas pendientes no pueden quedar escondidas tras
  // la barra de acciones; el resto de elecciones se abre desde dicha barra.
  const visible = Boolean(privateState && (combat?.initiative.pending || canResolvePrompt || ((combat?.isTurn || canReact || canUsePrepared) && actionsMenuOpen)));
  box.hidden = !visible;
  if (!combat || !visible || !privateState) { renderedTargetMenuKey = ''; box.replaceChildren(); if (lastSnapshot?.combat.active) $('actionRadial').hidden = true; return; }
  const prompt = combat.prompt;
  const self = lastSnapshot?.entities.find(entity => entity.id === privateState!.characterId);
  const key = combat.initiative.pending
    ? `initiative:${combat.initiative.submitted}:${combat.initiative.total}:${combat.initiative.modifier}:${pendingCombatCommands.size}`
    : prompt
    ? `prompt:${prompt.id}:${prompt.stage}:${prompt.minimum}:${prompt.maximum}`
    : `target:${target?.id ?? '-'}:${target?.cell.col ?? '-'}:${target?.cell.row ?? '-'}:${self?.cell.col ?? '-'}:${self?.cell.row ?? '-'}:${combat.actionUsed}:${combat.bonusActionUsed}:${combat.reactionUsed}:${combat.ready}:${armedActionId ?? '-'}:${armedBasicAction ?? '-'}:${pendingCombatCommands.size}:${JSON.stringify(combat.resources)}:${JSON.stringify(combat.sequence)}:${JSON.stringify(combat.recharge)}`;
  if (key === renderedTargetMenuKey) { renderCombatRadial(box); return; }
  renderedTargetMenuKey = key; box.replaceChildren();
  if (combat.initiative.pending) {
    box.append(actionPanelHeader('COMBATE', 'Iniciativa', 'Dados físicos'));
    const note = document.createElement('p'); note.className = 'combat-prompt-note';
    if (combat.initiative.submitted) {
      note.textContent = `Tu iniciativa (${combat.initiative.total}) está registrada. Esperando a los demás y la confirmación del DM.`;
      box.append(note); return;
    }
    note.textContent = `1d20 ${combat.initiative.modifier >= 0 ? '+' : ''}${combat.initiative.modifier} · introduce el total.`;
    const input = document.createElement('input'), submit = document.createElement('button'), controls = document.createElement('div');
    input.type = 'number'; input.min = '-20'; input.max = '40'; input.placeholder = 'Total de iniciativa'; submit.className = 'primary'; submit.textContent = 'Registrar iniciativa';
    input.inputMode = 'numeric'; input.setAttribute('aria-label', 'Total de iniciativa');
    input.className = 'combat-prompt-input'; submit.classList.add('combat-prompt-submit'); controls.className = 'combat-prompt-controls'; controls.append(input, submit);
    const send = () => {
      if (!input.value.trim()) return toast('Introduce el resultado de los dados.'); const total = Number(input.value);
      if (!Number.isInteger(total) || total < -20 || total > 40) return toast('Introduce un total entero entre -20 y 40.');
      const id = commandId(); input.disabled = true; submit.disabled = true; pendingCombatCommands.add(id);
      socket.emit('player:combat', { runtimeEpoch, type: 'combat:initiative', commandId: id, sceneEpoch: lastSnapshot!.sceneEpoch, total });
    };
    submit.onclick = send; input.onkeydown = event => { if (event.key === 'Enter') send(); };
    box.append(note, controls); return;
  }
  if (prompt) {
    $('actionRadial').hidden = true;
    const compact = compactCombatPrompt(prompt);
    const header = actionPanelHeader('COMBATE', compact.label, 'Dados físicos');
    header.querySelector('.action-panel-minimize')?.remove();
    if (combat.pendingAction?.cancellable) {
      const cancel = document.createElement('button'); cancel.type = 'button'; cancel.textContent = 'Cancelar ataque';
      cancel.className = 'combat-prompt-submit'; cancel.disabled = Boolean(pendingCombatCommands.size); cancel.onclick = cancelPendingCombatSelection; header.append(cancel);
    }
    box.append(header);
    if (prompt.stage === 'reaction') {
      const title = document.createElement('b'), note = document.createElement('p'), buttons = document.createElement('div'), accept = document.createElement('button'), decline = document.createElement('button');
      title.textContent = prompt.title; note.textContent = prompt.instruction; buttons.className = 'combat-basic-actions'; accept.className = 'primary'; accept.textContent = 'Atacar · gastar reacción'; decline.textContent = 'Dejar pasar';
      const respond = (choice: boolean) => { accept.disabled = true; decline.disabled = true; socket.emit('player:combat', { runtimeEpoch, type: 'combat:reaction', commandId: commandId(), sceneEpoch: lastSnapshot!.sceneEpoch, promptId: prompt.id, accept: choice }); };
      accept.onclick = () => respond(true); decline.onclick = () => respond(false); buttons.append(accept, decline); box.append(title, note, buttons); return;
    }
    const title = document.createElement('b'), note = document.createElement('p'), input = document.createElement('input'), submit = document.createElement('button'), controls = document.createElement('div');
    title.textContent = compact.title; note.textContent = compact.instruction; input.type = 'number'; input.inputMode = 'numeric'; input.setAttribute('aria-label', compact.instruction); input.min = String(prompt.minimum ?? -30); input.max = String(prompt.maximum ?? 200); input.placeholder = compact.placeholder; submit.className = 'primary'; submit.textContent = 'Confirmar';
    title.className = 'combat-prompt-title'; note.className = 'combat-prompt-note'; input.className = 'combat-prompt-input'; submit.classList.add('combat-prompt-submit'); controls.className = 'combat-prompt-controls'; controls.append(input, submit);
    const send = () => {
      const raw = input.value.trim(); if (!raw) return toast('Introduce el resultado de los dados.');
      const value = Number(raw), minimum = prompt.minimum ?? Number.MIN_SAFE_INTEGER, maximum = prompt.maximum ?? Number.MAX_SAFE_INTEGER;
      if (!Number.isInteger(value) || value < minimum || value > maximum) return toast(`Introduce un entero entre ${minimum} y ${maximum}.`);
      const type = prompt.stage === 'attack' ? 'combat:rollAttack' : prompt.stage === 'damage' ? 'combat:rollDamage' : prompt.stage === 'death-save' ? 'combat:rollDeathSave' : 'combat:rollSave';
      const data = type === 'combat:rollAttack' || type === 'combat:rollDeathSave' ? { d20: value } : type === 'combat:rollDamage' ? { diceTotal: value } : { total: value };
      submit.disabled = true; input.disabled = true;
      socket.emit('player:combat', { runtimeEpoch, type, commandId: commandId(), sceneEpoch: lastSnapshot!.sceneEpoch, promptId: prompt.id, ...data });
    };
    submit.onclick = send; input.onkeydown = event => { if (event.key === 'Enter') send(); };
    const details = document.createElement('details'), detailsTitle = document.createElement('summary'), explanation = document.createElement('p');
    details.className = 'combat-roll-details'; detailsTitle.textContent = 'Detalles'; explanation.textContent = `${prompt.title} · ${prompt.instruction}`; details.append(detailsTitle, explanation);
    box.append(title, note, controls, details); return;
  }
  const targetParticipant = target ? lastSnapshot!.combat.participants.find(participant => participant.id === target.id && participant.active) : undefined;
  const meters = self && target ? Math.max(Math.abs(self.cell.col - target.cell.col), Math.abs(self.cell.row - target.cell.row)) * 1.5 : undefined;
  const armedAction = armedActionId ? combat.attacks.find(action => action.id === armedActionId) : undefined;
  const targetSummary = armedAction
    ? armedAction.targeting === 'point' ? `${armedAction.label} seleccionado · toca una casilla del mapa` : `${armedAction.label} seleccionado · toca una ficha objetivo`
    : armedBasicAction === 'help' ? 'Ayudar seleccionado · toca al enemigo que quieres distraer'
    : target && targetParticipant && meters !== undefined
    ? `${target.label} · ${meters.toFixed(1)} m`
    : 'Elige una ficha enemiga';
  box.append(actionPanelHeader('COMBATE', 'Acciones', targetSummary));

  const status = document.createElement('p'); status.className = 'action-status';
  status.textContent = `Acción ${combat.actionUsed ? 'gastada' : 'lista'} · Adicional ${combat.bonusActionUsed ? 'gastada' : 'lista'} · Reacción ${combat.reactionUsed ? 'gastada' : 'lista'}`;
  box.append(status);

  const actionList = document.createElement('div'); actionList.className = 'combat-actions';
  type CombatActionCategory = 'attack' | 'magic' | 'utility' | 'bonus' | 'reaction';
  const categoryTitles: Record<CombatActionCategory, string> = { attack: 'Ataques', magic: 'Conjuros y trucos', utility: 'Utilidades', bonus: 'Acciones adicionales', reaction: 'Reacciones' };
  const categoryFor = (action: CombatAction): CombatActionCategory => {
    if (action.actionCost === 'reaction') return 'reaction';
    if (action.actionCost === 'bonus') return 'bonus';
    if (action.magical) return 'magic';
    if (action.resolution === 'guided' || action.targeting === 'point') return 'utility';
    return 'attack';
  };
  const actionGroups = new Map<CombatActionCategory, { details: HTMLDetailsElement; summary: HTMLElement; list: HTMLDivElement; count: number }>();
  const actionGroup = (category: CombatActionCategory) => {
    const existing = actionGroups.get(category); if (existing) return existing;
    const details = document.createElement('details'), summary = document.createElement('summary'), list = document.createElement('div');
    details.className = 'action-category combat-action-group'; details.open = openCombatCategory === category; list.className = 'action-category-list';
    // Do not leave this to the browser's native <details> timing: on touch
    // screens a state refresh can otherwise replace the element between the
    // release of the finger and its delayed toggle event.
    const toggleCategory = () => {
      openCombatCategory = openCombatCategory === category ? null : category;
      renderedTargetMenuKey = ''; renderTargetMenu();
    };
    summary.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      event.preventDefault(); event.stopPropagation(); toggleCategory();
    });
    summary.addEventListener('click', event => {
      event.preventDefault(); event.stopPropagation();
      // Keyboard activation has no preceding pointer event.
      if (event.detail === 0) toggleCategory();
    });
    details.append(summary, list);
    const entry = { details, summary, list, count: 0 }; actionGroups.set(category, entry); actionList.append(details); return entry;
  };
  for (const action of combat.attacks) {
    const continuing = combat.sequence?.actionId === action.id;
    const resource = action.resource ? combat.resources[action.resource.id] : undefined;
    const used = !continuing && (action.actionCost === 'reaction' ? combat.reactionUsed : action.actionCost === 'bonus' ? combat.bonusActionUsed : combat.actionUsed && !(combat.ready && !combat.reactionUsed));
    const rangeBands = action.range?.longMeters && action.range.longMeters > action.range.normalMeters ? ` Verde hasta ${action.range.normalMeters} m; ámbar hasta ${action.range.longMeters} m con desventaja.` : action.range ? ` El mapa mostrará hasta ${action.range.normalMeters} m al seleccionarlo.` : '';
    const targetIsValid = action.targeting === 'point' || Boolean(targetParticipant && (action.resolution === 'guided' || targetParticipant.controller !== 'player'));
    const inRange = meters !== undefined && meters <= (action.range?.longMeters ?? action.range?.normalMeters ?? Infinity);
    const turnAllowsAction = combat.isTurn || action.actionCost === 'reaction' || combat.ready;
    const unavailableResource = !continuing && Boolean(action.resource && (!resource || resource.current < action.resource.cost));
    const needsRecharge = !continuing && Boolean(action.recharge && combat.recharge[action.id] === false);
    const button = document.createElement('button'), name = document.createElement('b'), row = document.createElement('div');
    button.className = `combat-action${armedActionId === action.id ? ' armed' : ''}`; button.setAttribute('aria-pressed', String(armedActionId === action.id)); name.textContent = compactActionLabel(action.label);
    const tooltipText = `${combatActionDescription(action, targetParticipant?.armorClass, continuing ? combat.sequence?.remaining : undefined)}${rangeBands}${resource ? ` ${resource.label}: ${resource.current}/${resource.max}.` : ''}`;
    button.append(name);
    button.disabled = used || !turnAllowsAction || unavailableResource || needsRecharge || combat.conditions.some(condition => condition === 'inconsciente' || condition === 'paralizada') || Boolean(pendingCombatCommands.size);
    button.title = used ? 'Ya has usado este tipo de acción.' : unavailableResource ? 'No queda el recurso necesario.' : needsRecharge ? 'Esta acción debe recargarse.' : pendingCombatCommands.size ? 'Esperando confirmación de la acción anterior.' : tooltipText;
    button.onclick = () => selectCombatAction(action);
    const category = categoryFor(action), group = actionGroup(category); group.count++; group.summary.textContent = `${categoryTitles[category]} · ${group.count}`;
    if (armedActionId === action.id) { openCombatCategory = category; group.details.open = true; }
    const tooltip = actionTooltip(tooltipText); enableLongPressInfo(button, tooltip);
    row.className = 'action-choice'; row.append(button, tooltip); group.list.append(row);
  }

  const basics = document.createElement('details'), basicsTitle = document.createElement('summary'), basicsGrid = document.createElement('div'), rules = document.createElement('p');
  const incapacitated = combat.conditions.some(condition => condition === 'inconsciente' || condition === 'paralizada');
  basics.className = 'action-category action-rules'; basics.open = openCombatCategory === 'rules'; basicsTitle.textContent = 'Otras acciones y reglas'; basicsGrid.className = 'combat-basic-actions'; rules.textContent = 'Hablar e interactuar con algo sencillo es gratis. Una segunda interacción u objeto complejo usa Utilizar.';
  const toggleRules = () => {
    openCombatCategory = openCombatCategory === 'rules' ? null : 'rules';
    renderedTargetMenuKey = ''; renderTargetMenu();
  };
  basicsTitle.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault(); event.stopPropagation(); toggleRules();
  });
  basicsTitle.addEventListener('click', event => {
    event.preventDefault(); event.stopPropagation();
    if (event.detail === 0) toggleRules();
  });
  const appendBasicAction = (button: HTMLButtonElement, detail: string) => {
    const choice = document.createElement('div'), tooltip = actionTooltip(detail);
    choice.className = 'basic-action-choice'; button.title = detail; enableLongPressInfo(button, tooltip); choice.append(button, tooltip); basicsGrid.append(choice);
  };
  if (combat.conditions.includes('restringida') || combat.conditions.includes('apresada')) { const escape = document.createElement('button'); escape.textContent = 'Liberarse'; escape.disabled = !combat.isTurn || incapacitated || combat.actionUsed || Boolean(pendingCombatCommands.size); escape.onclick = declareCombatEscape; appendBasicAction(escape, 'Liberarse: usa una acción para intentar escapar de estar apresado o restringido.'); }
  if (combat.isTurn) {
    const posture = document.createElement('button'), prone = combat.conditions.includes('derribada');
    posture.textContent = prone ? 'Levantarse' : 'Tirarse al suelo'; posture.disabled = incapacitated || Boolean(pendingCombatCommands.size) || Boolean(prone && (!combat.movement || combat.movement.remainingSquares <= 0));
    posture.onclick = () => { if (!lastSnapshot) return; const id = commandId(); pendingCombatCommands.add(id); socket.emit('player:combat', { runtimeEpoch, type: prone ? 'combat:stand' : 'combat:dropProne', commandId: id, sceneEpoch: lastSnapshot.sceneEpoch }); };
    appendBasicAction(posture, prone ? 'Levantarse: gasta movimiento equivalente a la mitad de tu velocidad.' : 'Tirarse al suelo: quedas derribado sin gastar una acción.');
  }
  const basicActionHelp: Record<BasicCombatAction, string> = {
    dash: 'Correr: ganas movimiento adicional igual a tu velocidad.',
    disengage: 'Destrabarse: tu movimiento no provoca ataques de oportunidad este turno.',
    dodge: 'Esquivar: los ataques contra ti tienen desventaja hasta tu próximo turno.',
    help: 'Ayudar: toca a un enemigo para dar ventaja a un aliado contra él.',
    hide: 'Esconderse: intenta ocultarte si hay cobertura o escondite.',
    magic: 'Acción mágica: usa una dote, objeto o rasgo mágico que requiera una acción.',
    ready: 'Preparar: declara una acción y su desencadenante para usarla como reacción.',
    'use-object': 'Utilizar: una interacción adicional u objeto complejo.',
    search: 'Buscar: examina, escucha o inspecciona un área.',
    study: 'Estudiar: recuerda, interpreta o investiga información.',
    influence: 'Influir: intenta modificar la actitud o conducta de una criatura.'
  };
  for (const action of combat.basicActions) {
    const button = document.createElement('button'); button.textContent = basicActionLabels[action]; button.disabled = !combat.isTurn || combat.actionUsed || combat.conditions.some(condition => condition === 'inconsciente' || condition === 'paralizada') || Boolean(pendingCombatCommands.size);
    button.classList.toggle('primary', armedBasicAction === action); button.setAttribute('aria-pressed', String(armedBasicAction === action));
    button.onclick = () => selectBasicCombatAction(action);
    appendBasicAction(button, basicActionHelp[action]);
  }
  if (combat.spellAttackBonus !== undefined || combat.spellSaveDc !== undefined) rules.textContent += ` Magia: ataque ${combat.spellAttackBonus !== undefined ? `${combat.spellAttackBonus >= 0 ? '+' : ''}${combat.spellAttackBonus}` : '—'} · CD ${combat.spellSaveDc ?? '—'}.`;
  if (armedBasicAction) { openCombatCategory = 'rules'; basics.open = true; }
  const flee = document.createElement('button'); flee.textContent = 'Huir'; flee.disabled = combat.conditions.some(condition => condition === 'inconsciente' || condition === 'paralizada'); flee.onclick = showCombatFlee; appendBasicAction(flee, 'Declarar una retirada al DM; no te saca automáticamente del combate.');
  if (combat.isTurn) { const move = document.createElement('button'); move.textContent = 'Mover'; move.disabled = !combat.movement?.remainingSquares || combat.conditions.some(condition => condition === 'inconsciente' || condition === 'paralizada'); move.onclick = () => chooseCombatBarMode('move'); appendBasicAction(move, 'Usa el joystick o las teclas. El mapa resalta el movimiento disponible.'); }
  basics.append(basicsTitle, basicsGrid, rules); actionList.append(basics);
  box.append(actionList);
  renderCombatRadial(box);
}

function radialActionLabel(label: string) {
  const compact = compactActionLabel(label)
    .replace(/^(?:interactuar|interactúa)\s+con\s+(?:(?:el|la|los|las|un|una)\s+)?/i, '')
    .replace(/^(?:acercarte|acercarse)\s+a\s+(?:(?:el|la|los|las|un|una)\s+)?/i, '')
    .replace(/^(?:atacar|ataque|disparar|disparo)\s+con\s+/i, '')
    .replace(/^usar\s+/i, '')
    .trim();
  return compact ? compact.charAt(0).toLocaleUpperCase('es') + compact.slice(1) : 'Acción';
}

function radialArc(anchorX: number, anchorY: number, width: number, height: number) {
  const left = anchorX < width * 0.28, right = anchorX > width * 0.72;
  const top = anchorY < height * 0.28, bottom = anchorY > height * 0.72;
  if (left && top) return { kind: 'quarter' as const, start: 0, end: 90 };
  if (right && top) return { kind: 'quarter' as const, start: 90, end: 180 };
  if (left && bottom) return { kind: 'quarter' as const, start: 270, end: 360 };
  if (right && bottom) return { kind: 'quarter' as const, start: 180, end: 270 };
  if (left) return { kind: 'half' as const, start: -90, end: 90 };
  if (right) return { kind: 'half' as const, start: 90, end: 270 };
  if (bottom) return { kind: 'half' as const, start: 180, end: 360 };
  if (top) return { kind: 'half' as const, start: 0, end: 180 };
  return anchorY > height / 2
    ? { kind: 'half' as const, start: 180, end: 360 }
    : { kind: 'half' as const, start: 0, end: 180 };
}

function actionRadialSourceLabel(source: HTMLButtonElement) {
  return source.querySelector('.contextual-action-label, strong, b')?.textContent?.trim()
    || source.textContent?.trim().replace(/^[^\p{L}\p{N}]+/u, '').replace(/[›+]+$/u, '').trim()
    || 'Acción';
}

function renderActionRadial(sourceBox: HTMLElement) {
  const radial = $('actionRadial');
  const inCombat = Boolean(lastSnapshot?.combat.active);
  const leafSources = Array.from(sourceBox.querySelectorAll<HTMLButtonElement>('.contextual-action, .exploration-action, .combat-action, .combat-basic-actions button'));
  const categoryFor = (button: HTMLButtonElement) => button.closest('.action-category')?.querySelector('summary')?.textContent?.split(' · ')[0] ?? 'Cerca de ti';
  const refresh = () => inCombat ? renderCombatRadial(sourceBox) : renderExplorationControls();
  const categories = [...new Set(leafSources.map(categoryFor))];
  if (actionRadialCategory && !categories.includes(actionRadialCategory)) actionRadialCategory = null;
  const sources = actionRadialCategory ? leafSources.filter(source => categoryFor(source) === actionRadialCategory) : categories.map(category => {
    const button = document.createElement('button'), count = leafSources.filter(source => categoryFor(source) === category);
    button.textContent = category; button.title = `${category}: ${count.length} opciones. Pulsa para abrir.`; button.disabled = count.every(source => source.disabled);
    button.onclick = () => { actionsMenuOpen = true; actionRadialCategory = category; actionRadialPage = 0; refresh(); };
    return button;
  });
  if (!actionsMenuOpen) { radial.hidden = true; radial.replaceChildren(); return; }
  radial.hidden = false;
  const anchor = $('actionToggle').getBoundingClientRect();
  const compact = matchMedia('(orientation: landscape) and (max-height: 550px)').matches;
  const origin = { x: anchor.left + anchor.width / 2, y: anchor.top + anchor.height / 2 };
  const width = Math.max(1, window.innerWidth), height = Math.max(1, window.innerHeight);
  // Labels are wider than the round origin button. Reserve their half-width at
  // both edges instead of forcing a perfectly spacious desktop wheel to page.
  origin.x = Math.max(68, Math.min(width - 68, origin.x));
  const renderKey = JSON.stringify([inCombat, actionRadialCategory, actionRadialPage, origin, width, height, sources.map(source => [source.textContent, source.title, source.disabled, source.className])]);
  if (radial.dataset.renderKey === renderKey && radial.childElementCount) return;
  radial.dataset.renderKey = renderKey;
  const arc = radialArc(origin.x, origin.y, width, height);
  radial.dataset.arc = arc.kind;
  radial.setAttribute('aria-label', `Rueda de acciones · ${arc.kind === 'quarter' ? 'un cuarto' : 'medio círculo'}`);
  const compactLandscape = matchMedia('(orientation: landscape) and (max-height: 550px)').matches;
  const nodeSize = compactLandscape ? 40 : width <= 560 ? 42 : 46;
  const labelGap = 6;
  const marginX = 10, marginY = Math.max(12, safeAreaInsets().top + 8);
  // Clearance includes the origin's 10px hit-box buffer and the 5px collision gap.
  const paginationWidth = 104, paginationHeight = 40, paginationGap = 16;
  const labelWidthFor = (label: string) => Math.min(Math.max(90, label.length * (compactLandscape ? 5.7 : 6.1) + 16), Math.min(116, width - marginX * 2));
  const labelHeightFor = (label: string) => {
    const charsPerLine = Math.max(10, Math.floor((labelWidthFor(label) - 14) / (compactLandscape ? 5.7 : 6.1)));
    return label.length > charsPerLine ? (compactLandscape ? 29 : 31) : (compactLandscape ? 17 : 19);
  };
  const paginationPosition = () => {
    const safeBottom = height - Math.max(8, safeAreaInsets().bottom + 8);
    return {
      x: Math.min(width - marginX - paginationWidth / 2, Math.max(marginX + paginationWidth / 2, origin.x)),
      y: Math.min(safeBottom - paginationHeight / 2, origin.y + anchor.height / 2 + paginationGap + paginationHeight / 2)
    };
  };
  type Box = { left: number; top: number; right: number; bottom: number };
  type RadialLayout = { radius: number; points: { x: number; y: number }[]; labelsVisible: boolean; fits: boolean };
  const overlap = (a: Box, b: Box, gap = 0) => a.left < b.right + gap && a.right + gap > b.left && a.top < b.bottom + gap && a.bottom + gap > b.top;
  const rectAt = (x: number, y: number, w: number, h: number): Box => ({ left: x - w / 2, right: x + w / 2, top: y - h / 2, bottom: y + h / 2 });
  const findLayout = (count: number, labels: string[], withPagination: boolean): RadialLayout | null => {
    const backBox = actionRadialCategory ? rectAt(origin.x - 24, origin.y - 49, 94, 32) : null;
    const interval = Math.abs(arc.end - arc.start) * Math.PI / 180 / Math.max(1, count - 1);
    const minRadius = Math.max(nodeSize + 22, count >= 8 ? nodeSize + 128 : nodeSize + 22, count > 1 ? (nodeSize + 16) / (2 * Math.sin(interval / 2)) : nodeSize + 22);
    const maxRadius = radialRadiusLimit(width, height);
    const pagePoint = withPagination ? paginationPosition() : null;
    const pageBox = pagePoint ? rectAt(pagePoint.x, pagePoint.y, paginationWidth, paginationHeight) : null;
    const safeBottom = height - Math.max(8, safeAreaInsets().bottom + 8);
    const pageFits = !pageBox || (pageBox.left >= marginX && pageBox.right <= width - marginX && pageBox.top >= marginY && pageBox.bottom <= safeBottom
      && !overlap(pageBox, rectAt(origin.x, origin.y, anchor.width + 10, anchor.height + 10), 5));
    let best: RadialLayout | null = null, bestScore = Number.POSITIVE_INFINITY;
    for (let radius = minRadius; radius <= maxRadius; radius += 6) {
      const points = Array.from({ length: count }, (_, index) => {
        const angle = (arc.start + (arc.end - arc.start) * (count === 1 ? .5 : index / Math.max(1, count - 1))) * Math.PI / 180;
        return { x: origin.x + Math.cos(angle) * radius, y: origin.y + Math.sin(angle) * radius };
      });
      const nodeBoxes = points.map(point => rectAt(point.x, point.y, nodeSize, nodeSize));
      const anchorBox = rectAt(origin.x, origin.y, anchor.width + 10, anchor.height + 10);
      let score = 0, nodeFits = true;
      for (let index = 0; index < nodeBoxes.length; index++) {
        const box = nodeBoxes[index]!;
        const overflow = Math.max(0, marginX - box.left) + Math.max(0, box.right - (width - marginX)) + Math.max(0, marginY - box.top) + Math.max(0, box.bottom - (height - Math.max(8, safeAreaInsets().bottom + 8)));
        if (overflow) { score += overflow * 1000; nodeFits = false; }
        if (overlap(box, anchorBox, 6)) { score += 10000; nodeFits = false; }
        if (backBox && overlap(box, backBox, 6)) { score += 10000; nodeFits = false; }
        for (let other = 0; other < index; other++) if (overlap(box, nodeBoxes[other]!, 7)) { score += 10000; nodeFits = false; }
      }
      const labelBoxes: Box[] = [];
      let labelsFit = pageFits;
      for (let index = 0; index < points.length; index++) {
        const point = points[index]!, label = labels[index] ?? '';
        const labelWidth = labelWidthFor(label);
        const labelHeight = labelHeightFor(label);
        const centerX = point.x, centerY = point.y + nodeSize / 2 + labelGap + labelHeight / 2;
        const box = rectAt(centerX, centerY, labelWidth, labelHeight);
        const overflow = Math.max(0, marginX - box.left) + Math.max(0, box.right - (width - marginX)) + Math.max(0, marginY - box.top) + Math.max(0, box.bottom - safeBottom);
        const collidesWithNodes = nodeBoxes.some((nodeBox, nodeIndex) => nodeIndex !== index && overlap(box, nodeBox, 5)) || overlap(box, anchorBox, 4) || Boolean(backBox && overlap(box, backBox, 5));
        const collidesWithLabels = labelBoxes.some(previous => overlap(box, previous, 6));
        const collidesWithPagination = Boolean(pageBox && overlap(box, pageBox, 6));
        const candidateScore = overflow * 1000 + (collidesWithNodes ? 1000 : 0) + (collidesWithLabels ? 1000 : 0) + (collidesWithPagination ? 1000 : 0);
        labelBoxes.push(box);
        if (candidateScore) { labelsFit = false; score += candidateScore; }
      }
      const layout: RadialLayout = { radius, points, labelsVisible: labelsFit, fits: nodeFits && labelsFit };
      score += radius * .01; // si varias distribuciones caben, usar la más compacta
      if (layout.fits) return layout;
      if (score < bestScore) { best = layout; bestScore = score; }
    }
    return best;
  };

  const allLabels=sources.map(source=>radialActionLabel(actionRadialSourceLabel(source)));
  const {capacity,pages,page}=radialPagination(sources.length,arc.kind==='quarter'?4:8,actionRadialPage,
    (start,count,pages)=>Boolean(findLayout(count,allLabels.slice(start,start+count),pages>1)?.fits));
  actionRadialPage=page;
  const visibleSources=sources.slice(page*capacity,(page+1)*capacity);
  const labels=allLabels.slice(page*capacity,(page+1)*capacity);
  const layout=findLayout(visibleSources.length,labels,pages>1);
  const radius = layout?.radius ?? Math.max(nodeSize + 22, Math.min(180, Math.min(width, height) * .32));
  const visiblePoints = layout?.points ?? [];

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('action-radial-spokes'); svg.setAttribute('viewBox', `0 0 ${width} ${height}`); svg.setAttribute('aria-hidden', 'true');
  const points: { x: number; y: number }[] = [];
  for (let index = 0; index < visibleSources.length; index++) {
    const point = visiblePoints[index] ?? { x: origin.x, y: origin.y };
    points.push(point);
    const directionX = (point.x - origin.x) / Math.max(1, radius), directionY = (point.y - origin.y) / Math.max(1, radius);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', String(origin.x + directionX * anchor.width * .42)); line.setAttribute('y1', String(origin.y + directionY * anchor.height * .42));
    line.setAttribute('x2', String(point.x - directionX * (nodeSize / 2 + 4))); line.setAttribute('y2', String(point.y - directionY * (nodeSize / 2 + 4))); line.classList.add('action-radial-spoke'); svg.append(line);
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); dot.setAttribute('cx', String(point.x - directionX * (nodeSize / 2 + 4))); dot.setAttribute('cy', String(point.y - directionY * (nodeSize / 2 + 4))); dot.setAttribute('r', '2.4'); dot.classList.add('action-radial-dot'); svg.append(dot);
  }
  radial.replaceChildren(svg);
  const navigation = document.createElement('div'); navigation.className = 'radial-navigation';
  navigation.style.left = `${origin.x-nodeSize/2}px`;
  navigation.style.top = `${origin.y-nodeSize/2}px`;
  navigation.style.transform = 'none';
  const back = document.createElement('button'), heading = document.createElement('strong'), close = document.createElement('button');
  back.type = 'button'; back.textContent = '‹ Atrás'; back.className='radial-back';back.hidden = !actionRadialCategory; back.onclick = () => { actionRadialCategory = null; actionRadialPage = 0; refresh(); };
  heading.textContent = actionRadialCategory ?? (inCombat ? 'Tu turno' : '¿Qué quieres hacer?');
  close.type = 'button'; close.textContent = '×';close.className='radial-close';close.setAttribute('aria-label','Cerrar acciones'); close.onclick = () => { actionsMenuOpen = false; radial.hidden = true; renderActionToggle(); renderCombatControls(); };
  navigation.append(back, heading, close); radial.append(navigation);
  if (!sources.length) {
    const empty = document.createElement('p'); empty.className = 'action-radial-empty'; empty.textContent = 'No hay acciones disponibles ahora.'; empty.style.left = `${origin.x}px`; empty.style.top = `${origin.y - 76}px`; radial.append(empty); return;
  }
  for (let index = 0; index < visibleSources.length; index++) {
    const source = visibleSources[index]!, point = points[index]!;
    const label = actionRadialSourceLabel(source);
    const shortLabel = labels[index] ?? radialActionLabel(label);
    const contextual = source.classList.contains('contextual-action');
    const icon = contextual ? source.querySelector('.contextual-action-icon')?.textContent?.trim() || '✦' : radialActionGlyph(source.className, label);
    const description = source.title || source.getAttribute('aria-label') || label;
    const button = document.createElement('button'), glyph = document.createElement('span'), caption = document.createElement('span');
    button.type = 'button'; button.className = `radial-action${source.classList.contains('armed') ? ' selected' : ''}`; button.style.left = `${point.x}px`; button.style.top = `${point.y}px`;
    button.disabled = source.disabled; button.setAttribute('aria-label', `${label}. Mantén pulsado para ver detalles.`); button.title = description;
    glyph.className = 'radial-action-glyph'; glyph.setAttribute('aria-hidden', 'true'); glyph.textContent = icon;
    caption.className = 'radial-action-label'; caption.textContent = shortLabel; caption.title = label;
    caption.hidden = false;
    caption.style.width = `${labelWidthFor(shortLabel)}px`;
    const tooltip = actionTooltip(description), tooltipHalfWidth = Math.min(140, width / 2 - 12);
    tooltip.style.position = 'fixed'; tooltip.style.left = `${Math.min(width - tooltipHalfWidth - 12, Math.max(tooltipHalfWidth + 12, point.x))}px`;
    const tooltipBelow = point.y < 120;
    tooltip.style.top = `${tooltipBelow ? point.y + 34 : point.y - 34}px`; tooltip.dataset.placement = tooltipBelow ? 'below' : 'above';
    button.append(glyph, caption, tooltip); enableLongPressInfo(button, tooltip);
    button.onclick = event => {
      event.stopPropagation();
      actionsMenuOpen = false; actionRadialPage = 0; radial.hidden = true; renderActionToggle();
      source.click();
      if (inCombat) { renderCombatControls(); renderSelectedAction(); }
    };
    radial.append(button);
  }
  if (pages > 1) {
    const pagination = document.createElement('div');
    pagination.className = 'radial-pagination'; pagination.setAttribute('aria-label', `Página ${actionRadialPage + 1} de ${pages}`);
    const pageButton = (direction: -1 | 1) => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'radial-page-control'; button.textContent = direction < 0 ? '‹' : '›';
      button.setAttribute('aria-label', direction < 0 ? 'Acciones anteriores' : 'Más acciones');
      button.disabled = direction < 0 ? actionRadialPage === 0 : actionRadialPage >= pages - 1;
      button.onclick = event => {
        event.stopPropagation();
        if (button.disabled) return;
        actionRadialPage += direction;
        refresh();
      };
      return button;
    };
    const number = document.createElement('span'); number.className = 'radial-page-number'; number.textContent = `${actionRadialPage + 1}/${pages}`;
    pagination.append(pageButton(-1), number, pageButton(1));
    const pagePosition = paginationPosition();
    pagination.style.left = `${pagePosition.x}px`;
    pagination.style.top = `${pagePosition.y}px`;
    radial.append(pagination);
  }
}

function renderCombatRadial(box: HTMLElement) {
  const combat = privateState?.combat;
  if (!combat || combat.initiative.pending || combat.prompt || combat.pendingAction || !actionsMenuOpen || armedActionId || armedBasicAction) {
    $('actionRadial').hidden = true; return;
  }
  renderActionRadial(box); box.hidden = true;
}

function endConcentrationButton() {
  const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Terminar concentración';
  button.title = 'Termina el conjuro y su efecto visual, sin gastar una acción.';
  button.onclick = () => {
    if (!lastSnapshot) return;
    const id = commandId(); pendingCombatCommands.add(id);
    socket.emit('player:combat', { runtimeEpoch, type: 'combat:endConcentration', commandId: id, sceneEpoch: lastSnapshot.sceneEpoch });
  };
  return button;
}
function renderExplorationControls() {
  const box = $('explorationMenu');
  const active = Boolean(privateState && (privateState.hp ?? 0) > 0 && !privateState.conditions.some(condition => condition === 'inconsciente' || condition === 'paralizada') && lastSnapshot && !lastSnapshot.combat.active);
  box.hidden = true;
  const context = active ? contextualInteraction() : null;
  world.setContextInteractionTarget(context?.targetId ?? null, context?.pointId ?? null);
  renderActionToggle();
  updateAttackRangePreview();
  renderProximityButton();
  renderCampInteractions();
  if (!active || !privateState || !actionsMenuOpen) { if (!active) box.replaceChildren(); if (!lastSnapshot?.combat.active) $('actionRadial').hidden = true; return; }
  box.replaceChildren();
  const selected = armedExplorationActionId
    ? privateState.explorationActions.find(action => action.id === armedExplorationActionId)?.label
    : armedExplorationAttackId ? privateState.explorationAttacks.find(action => action.id === armedExplorationAttackId)?.label
      : armedExplorationBasicActionId ? explorationBasicActionCatalogue[armedExplorationBasicActionId].label : undefined;
  const groups = document.createElement('div');
  groups.className = 'exploration-actions';
    box.append(actionPanelHeader('EXPLORACIÓN', 'Acciones', selected ? `${compactActionLabel(selected)} seleccionado` : 'Elige una acción'));
    if (privateState.concentration) box.append(endConcentrationButton());
  if (context) {
    const item = document.createElement('button'), icon = document.createElement('span'), label = document.createElement('strong'), arrow = document.createElement('span');
    item.type = 'button'; item.className = 'contextual-action';
    item.setAttribute('aria-label', `${context.icon} ${context.label}`);
    item.title = context.description || `Interactúa con ${context.label.toLocaleLowerCase('es')}.`;
    icon.className = 'contextual-action-icon'; icon.setAttribute('aria-hidden', 'true'); icon.textContent = context.icon;
    label.className = 'contextual-action-label'; label.textContent = context.label; arrow.className = 'contextual-action-arrow'; arrow.setAttribute('aria-hidden', 'true'); arrow.textContent = '›';
    item.append(icon, label, arrow); item.onclick = () => useContextualInteraction(context); box.append(item);
  }
  const intro = document.createElement('p'); intro.className = 'action-status'; intro.textContent = 'Después toca su objetivo o una casilla del mapa.'; box.append(intro);
  const createGroup = (title: 'Trucos' | 'Conjuros' | 'Ataques' | 'Acciones', count: number, selected = false) => {
    const details = document.createElement('details'), summary = document.createElement('summary'), list = document.createElement('div');
    details.className = 'action-category exploration-action-group'; summary.textContent = `${title} · ${count}`; list.className = 'action-category-list'; details.open = selected || openExplorationCategory === title;
    const toggleCategory = () => {
      openExplorationCategory = openExplorationCategory === title ? null : title;
      renderExplorationControls();
    };
    summary.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      event.preventDefault(); event.stopPropagation(); toggleCategory();
    });
    summary.addEventListener('click', event => {
      event.preventDefault(); event.stopPropagation();
      if (event.detail === 0) toggleCategory();
    });
    details.append(summary, list); groups.append(details); return list;
  };
  const targetLabel: Record<ExplorationAction['target'], string> = { self: 'a ti', none: 'sin objetivo', object: 'un objeto', living: 'un ser vivo', point: 'una casilla', any: 'un objetivo' };
  const addAction = (list: HTMLDivElement, action: ExplorationAction) => {
    const item = document.createElement('button'), name = document.createElement('b'), row = document.createElement('div');
    const description = `${action.rangeMeters ? `Alcance ${action.rangeMeters} m. ` : ''}${action.guidance} Objetivo: ${targetLabel[action.target]}.`;
    item.className = `exploration-action${armedExplorationActionId === action.id ? ' armed' : ''}`; item.setAttribute('aria-pressed', String(armedExplorationActionId === action.id));
    name.textContent = compactActionLabel(action.label); item.append(name); item.title = description;
    item.onclick = () => {
      if (action.target === 'self' || action.target === 'none') { armedExplorationActionId = action.id; armedExplorationAttackId = null; armedExplorationBasicActionId = null; useExplorationAction(); renderExplorationControls(); return; }
      armedExplorationActionId = armedExplorationActionId === action.id ? null : action.id; armedExplorationAttackId = null; armedExplorationBasicActionId = null; renderExplorationControls();
      const targetText = targetLabel[action.target];
      toast(armedExplorationActionId ? `${action.label}: toca ${targetText} dentro del alcance.` : 'Acción cancelada.');
    };
    const tooltip = actionTooltip(description); enableLongPressInfo(item, tooltip);
    row.className = 'action-choice'; row.append(item, tooltip); list.append(row);
  };
  const cantrips = privateState.explorationActions.filter(action => action.kind === 'cantrip');
  const spells = privateState.explorationActions.filter(action => action.kind === 'spell');
  if (cantrips.length) { const list = createGroup('Trucos', cantrips.length, cantrips.some(action => action.id === armedExplorationActionId)); cantrips.forEach(action => addAction(list, action)); }
  if (spells.length) { const list = createGroup('Conjuros', spells.length, spells.some(action => action.id === armedExplorationActionId)); spells.forEach(action => addAction(list, action)); }
  if (privateState.explorationAttacks.length) {
    const list = createGroup('Ataques', privateState.explorationAttacks.length, privateState.explorationAttacks.some(attack => attack.id === armedExplorationAttackId));
    for (const attack of privateState.explorationAttacks) {
      const item = document.createElement('button'), name = document.createElement('b'), row = document.createElement('div');
      const description = `Inicia combate. ${combatActionDescription(attack)} Toca al personaje, animal o monstruo objetivo.`;
      item.className = `exploration-action${armedExplorationAttackId === attack.id ? ' armed' : ''}`; item.setAttribute('aria-pressed', String(armedExplorationAttackId === attack.id)); name.textContent = compactActionLabel(attack.label); item.append(name); item.title = description;
      item.onclick = () => { armedExplorationAttackId = armedExplorationAttackId === attack.id ? null : attack.id; armedExplorationActionId = null; armedExplorationBasicActionId = null; renderExplorationControls(); toast(armedExplorationAttackId ? `${attack.label}: toca el personaje, animal o monstruo que quieres atacar.` : 'Ataque cancelado.'); };
      const tooltip = actionTooltip(description); enableLongPressInfo(item, tooltip);
      row.className = 'action-choice'; row.append(item, tooltip); list.append(row);
    }
  }
  if (privateState.explorationBasics.length) {
    const list = createGroup('Acciones', privateState.explorationBasics.length, Boolean(armedExplorationBasicActionId && privateState.explorationBasics.includes(armedExplorationBasicActionId)));
    const targetPrompt: Record<ExplorationBasicAction, string> = {
      talk: 'toca el personaje o PNJ', influence: 'toca la criatura/personaje', help: 'toca a quien vas a ayudar', hide: 'no necesita objetivo',
      search: 'toca una casilla, persona u objeto', study: 'toca la pista, persona u objeto', 'use-object': 'toca el objetivo; el DM confirma el objeto usado',
      'pick-lock': 'toca la cerradura; el DM confirma herramientas y CD', 'disarm-trap': 'toca la trampa descubierta; el DM confirma herramientas y CD',
      climb: 'toca la casilla de destino propuesta', swim: 'toca la casilla de destino propuesta', jump: 'toca la casilla de destino propuesta'
    };
    for (const id of privateState.explorationBasics) {
      const action = explorationBasicActionCatalogue[id], row = document.createElement('div'), item = document.createElement('button'), name = document.createElement('b');
      const isArmed = armedExplorationBasicActionId === id;
      const jumpHelp = id === 'jump' ? jumpSummary(privateState.sheet?.strengthScore) : action.guidance;
      item.className = `exploration-action${isArmed ? ' armed' : ''}`; item.setAttribute('aria-pressed', String(isArmed)); name.textContent = action.label; item.append(name); item.title = `${jumpHelp} Después, ${targetPrompt[id]}.`;
      item.onclick = () => {
        if (action.target === 'self') { armedExplorationBasicActionId = id; armedExplorationActionId = null; armedExplorationAttackId = null; useExplorationBasicAction(id); renderExplorationControls(); return; }
        armedExplorationBasicActionId = isArmed ? null : id; armedExplorationActionId = null; armedExplorationAttackId = null; renderExplorationControls();
        toast(armedExplorationBasicActionId ? `${action.label}: ${targetPrompt[id]}.` : 'Acción cancelada.');
      };
      const tooltip = actionTooltip(`${jumpHelp} ${targetPrompt[id]}.`); enableLongPressInfo(item, tooltip);
      row.className = 'action-choice'; row.append(item, tooltip);
      if (id === 'jump') { const summary = document.createElement('small'); summary.className = 'muted'; summary.textContent = jumpHelp; row.append(summary); }
      list.append(row);
    }
  }
  box.append(groups);
  if (!cantrips.length && !spells.length && !privateState.explorationAttacks.length && !privateState.explorationBasics.length) { const empty = document.createElement('p'); empty.textContent = 'No tienes acciones disponibles fuera de combate.'; box.append(empty); }
  renderActionRadial(box);
}

function proximityTarget(kind: 'object' | 'living' | 'any', rangeMeters: number) {
  const self = lastSnapshot?.entities.find(entity => entity.id === privateState?.characterId);
  if (!self || !lastSnapshot) return null;
  const candidates = [
    ...lastSnapshot.entities.filter(entity => entity.id !== self.id).map(entity => ({ id: entity.id, label: entity.label, kind: 'living' as const, cell: entity.cell })),
    ...lastSnapshot.props.map(prop => ({ id: prop.id, label: prop.label, kind: 'object' as const, cell: prop.cell }))
  ].filter(candidate => (kind === 'any' || candidate.kind === kind) && Math.max(Math.abs(self.cell.col - candidate.cell.col), Math.abs(self.cell.row - candidate.cell.row)) * 1.5 <= rangeMeters + .001);
  return candidates[0] ?? null;
}

function renderProximityButton() {
  const button = $('interact') as HTMLButtonElement;
  // The radial wheel is the sole exploration action entry point. Keep the
  // legacy proximity button inert so it cannot create a second HUD control.
  button.hidden = true; button.disabled = true;
}

function activateAvailableProximityAction() {
  if (!privateState || lastSnapshot?.combat.active) return;
  const basic = armedExplorationBasicActionId ? explorationBasicActionCatalogue[armedExplorationBasicActionId] : undefined;
  const action = armedExplorationActionId ? privateState.explorationActions.find(candidate => candidate.id === armedExplorationActionId) : undefined;
  const attack = armedExplorationAttackId ? privateState.explorationAttacks.find(candidate => candidate.id === armedExplorationAttackId) : undefined;
  const target = basic?.target === 'living' ? proximityTarget('living', Infinity) : basic?.target === 'any' ? proximityTarget('any', Infinity)
    : action && (action.target === 'object' || action.target === 'living' || action.target === 'any') ? proximityTarget(action.target, action.rangeMeters)
      : attack ? proximityTarget('living', attack.range?.longMeters ?? attack.range?.normalMeters ?? Infinity) : null;
  if (basic && target && armedExplorationBasicActionId) { useExplorationBasicAction(armedExplorationBasicActionId, target.id); return; }
  if (action || attack) { if (target) useExplorationAction(target.id); return; }
}

function renderCampInteractions(state = privateState) {
  const panel = $('campInteractions'), list = $('campInteractionList');
  panel.hidden = true;
  list.replaceChildren();
  if (!state?.characterId || lastSnapshot?.combat.active) world.setContextInteractionTarget(null);
}

type ContextualInteraction = {
  targetId: string;
  pointId?: string;
  label: string;
  icon: string;
  description?: string;
  cell: Cell;
  surfaceId: string;
  distance: number;
  facing: number;
  order: number;
};

const contextualFacingVectors: Record<Facing, { col: number; row: number }> = {
  north: { col: 0, row: -1 }, 'north-east': { col: 1, row: -1 }, east: { col: 1, row: 0 },
  'south-east': { col: 1, row: 1 }, south: { col: 0, row: 1 }, 'south-west': { col: -1, row: 1 },
  west: { col: -1, row: 0 }, 'north-west': { col: -1, row: -1 }
};

function contextualInteraction(): ContextualInteraction | null {
  const state = privateState, snapshot = lastSnapshot;
  if (!state?.characterId || !snapshot || snapshot.combat.active) return null;
  const self = snapshot.entities.find(entity => entity.id === state.characterId);
  if (!self) return null;
  const facing = contextualFacingVectors[self.facing];
  const candidates: ContextualInteraction[] = [];
  const makeCandidate = (targetId: string, label: string, icon: string, cell: Cell, surfaceId: string, order: number, description?: string, pointId?: string) => {
    if (surfaceId !== self.surfaceId) return;
    const dc = cell.col - self.cell.col, dr = cell.row - self.cell.row;
    const distance = Math.max(Math.abs(dc), Math.abs(dr));
    const length = Math.hypot(dc, dr) || 1, facingLength = Math.hypot(facing.col, facing.row) || 1;
    candidates.push({ targetId, label, icon, cell, surfaceId, distance, facing: (facing.col * dc + facing.row * dr) / (length * facingLength), order, ...(description ? { description } : {}), ...(pointId ? { pointId } : {}) });
  };
  for (const [order, interaction] of (state.campInteractions ?? []).entries()) {
    const point = snapshot.scene.camp?.interactionPoints.find(item => item.id === interaction.pointId);
    if (!point) continue;
    const label = interaction.kind === 'fire' ? 'Interactuar con la hoguera' : interaction.actionLabel;
    const icon = ({ fire: '🔥', chest: '🧰', bed: '🛏️', tent: '⛺', seat: '🪑', guard: '🛡️', personal: '🎒' } as const)[interaction.kind];
    makeCandidate(interaction.pointId, label, icon, point.cell, point.surfaceId, order, interaction.description, interaction.pointId);
  }
  for (const [index, interaction] of (state.availableInteractions ?? []).entries()) {
    const prop = snapshot.props.find(item => item.id === interaction.targetId);
    const entity = snapshot.entities.find(item => item.id === interaction.targetId);
    const actor = snapshot.scene.stageActors?.find(item => item.id === interaction.targetId);
    const pickup = snapshot.scene.pickups?.find(item => item.id === interaction.targetId);
    const cell = entity?.cell ?? prop?.cell ?? actor?.cell ?? pickup?.cell;
    const surfaceId = entity?.surfaceId ?? prop?.surfaceId ?? actor?.surfaceId ?? pickup?.surfaceId ?? snapshot.scene.surfaceId;
    if (!cell) continue;
    const icon = entity || actor ? '🗣️' : interaction.targetId.includes('rowboat') ? '🚣' : pickup ? '✨' : prop?.kind === 'door' ? '🚪' : prop?.kind === 'wheel' ? '⚙️' : prop ? '✦' : '✦';
    makeCandidate(interaction.targetId, interaction.label, icon, cell, surfaceId, (state.campInteractions?.length ?? 0) + index);
  }
  candidates.sort((a, b) => a.distance - b.distance || b.facing - a.facing || a.order - b.order);
  return candidates[0] ?? null;
}

function useContextualInteraction(context: ContextualInteraction) {
  if (!lastSnapshot || !privateState?.characterId) return;
  let used = false;
  if (context.pointId) {
    if (!privateState.campInteractions.some(item => item.pointId === context.pointId)) return;
    world.playTokenAnimation(privateState.characterId, 'interact');
    socket.emit('player:camp-interact', { runtimeEpoch, commandId: commandId(), sceneEpoch: lastSnapshot.sceneEpoch, pointId: context.pointId });
    used = true;
  } else used = interactWith(context.targetId);
  if (used) closeActionPanel();
}

function targetAtCell(cell: { col: number; row: number }) {
  const entity = lastSnapshot?.entities.find(candidate => candidate.cell.col === cell.col && candidate.cell.row === cell.row && candidate.id !== privateState?.characterId);
  if (entity) return entity;
  return lastSnapshot?.props.find(prop => prop.footprint.some(part => part.col === cell.col && part.row === cell.row));
}

function interactWith(targetId: string) {
  if (!lastSnapshot || !privateState?.availableInteractions.some(interaction => interaction.targetId === targetId)) return false;
  world.playTokenAnimation(privateState.characterId!, 'interact');
  socket.emit('player:interact', { runtimeEpoch, commandId: commandId(), sceneEpoch: lastSnapshot.sceneEpoch, targetId });
  return true;
}

function useExplorationAction(targetId?: string, targetCell?: { col: number; row: number }) {
  if (!lastSnapshot || !privateState) return false;
  if (armedExplorationActionId) {
    const actionId = armedExplorationActionId; armedExplorationActionId = null; updateAttackRangePreview();
    socket.emit('player:exploration', { runtimeEpoch, type: 'exploration:action', commandId: commandId(), sceneEpoch: lastSnapshot.sceneEpoch, ...(targetId ? { targetId } : {}), ...(targetCell ? { targetCell } : {}), actionId });
    return true;
  }
  if (armedExplorationAttackId && targetId) {
    const actionId = armedExplorationAttackId; armedExplorationAttackId = null; updateAttackRangePreview();
    socket.emit('player:exploration', { runtimeEpoch, type: 'exploration:attack', commandId: commandId(), sceneEpoch: lastSnapshot.sceneEpoch, targetId, actionId });
    return true;
  }
  return false;
}

function useExplorationBasicAction(actionId: ExplorationBasicAction, targetId?: string, targetCell?: { col: number; row: number }) {
  if (!lastSnapshot || !privateState) return false;
  armedExplorationBasicActionId = null; updateAttackRangePreview();
  socket.emit('player:exploration', { runtimeEpoch, type: 'exploration:basic', commandId: commandId(), sceneEpoch: lastSnapshot.sceneEpoch, action: actionId, ...(targetId ? { targetId } : {}), ...(targetCell ? { targetCell } : {}) });
  renderExplorationControls();
  return true;
}

function selectCombatTarget(targetId: string | null) {
  if (!lastSnapshot || !privateState?.combat) return;
  if (!(privateState.combat.isTurn || privateState.combat.ready || !privateState.combat.reactionUsed && privateState.combat.attacks.some(action => action.actionCost === 'reaction'))) return;
  const target = lastSnapshot.combat.participants.find(item => item.id === targetId && item.active);
  selectedTargetId = target?.id ?? null;
  const action = armedActionId ? privateState.combat.attacks.find(candidate => candidate.id === armedActionId) : undefined;
  if (action?.targeting === 'point') return toast('Esta acción requiere elegir una casilla en el mapa.');
  if (action && target) { declareCombatAction(action, target.id); return; }
  if (armedBasicAction === 'help' && target) {
    if (target.controller !== 'player') { useBasicCombatAction('help', target.id); return; }
    toast('Ayudar requiere elegir a un enemigo que esté junto a ti.'); return;
  }
  renderTargetMenu();
}

world.setMapClick(cell => {
  if (!lastSnapshot || !privateState) return;
  if (!privateState.combat) {
    const explorationBasic = armedExplorationBasicActionId ? explorationBasicActionCatalogue[armedExplorationBasicActionId] : undefined;
    if (explorationBasic) {
      const target = targetAtCell(cell);
      if (explorationBasic.target === 'point') { useExplorationBasicAction(armedExplorationBasicActionId!, undefined, cell); return; }
      if (explorationBasic.target === 'living' && (!target || !lastSnapshot.entities.some(entity => entity.id === target.id))) { toast('Selecciona una criatura, PNJ o personaje.'); return; }
      if (target) { useExplorationBasicAction(armedExplorationBasicActionId!, target.id); return; }
      if (explorationBasic.target === 'any') { useExplorationBasicAction(armedExplorationBasicActionId!, undefined, cell); return; }
      toast('Selecciona un objetivo válido.'); return;
    }
    const explorationAction = armedExplorationActionId ? privateState.explorationActions.find(candidate => candidate.id === armedExplorationActionId) : undefined;
    if (explorationAction?.target === 'point') { useExplorationAction(undefined, cell); renderExplorationControls(); return; }
    const target = targetAtCell(cell);
    if (!target) return;
    if (useExplorationAction(target.id) || interactWith(target.id)) return;
    toast('Ese objetivo no tiene una interacción disponible ahora.');
    return;
  }
  if (!(privateState.combat.isTurn || privateState.combat.ready || !privateState.combat.reactionUsed && privateState.combat.attacks.some(action => action.actionCost === 'reaction'))) return;
  const action = armedActionId ? privateState.combat.attacks.find(candidate => candidate.id === armedActionId) : undefined;
  if (action?.targeting === 'point') { declareCombatPointAction(action, cell); return; }
  const snapshot = lastSnapshot, target = snapshot.entities.find(entity => entity.cell.col === cell.col && entity.cell.row === cell.row && snapshot.combat.participants.some(participant => participant.id === entity.id && participant.active));
  selectCombatTarget(target?.id ?? null);
});

function changeOwnHp(sign: 1 | -1) {
  if (!lastSnapshot || !privateState?.combat) return;
  const amount = Math.max(1, Number(($('hpAmount') as HTMLInputElement).value) || 1);
  socket.emit('player:combat', { runtimeEpoch, type: 'combat:hp', commandId: commandId(), sceneEpoch: lastSnapshot.sceneEpoch, delta: sign * amount });
}
$('combatHp').onclick = () => { if (!privateState || !lastSnapshot?.combat.active) return; $('hpDialogValue').textContent = `PG actuales: ${privateState.hp}/${privateState.maxHp}`; ($('hpDialog') as HTMLDialogElement).showModal(); };
$('closeHp').onclick = () => ($('hpDialog') as HTMLDialogElement).close();
$('takeDamage').onclick = () => changeOwnHp(-1);
$('healDamage').onclick = () => changeOwnHp(1);
$('endTurn').onclick = finishCombatTurn;

const sceneLoadRecovery = new SceneLoadRecovery();
async function prepareSnapshot(snapshot: WorldSnapshot) {
  try {
    const installed = await world.applySnapshot(snapshot);
    if (!installed) return;
    sceneLoadRecovery.reset();
    updatePlayerCameraControls(snapshot.sceneId);
    if (socket.connected && readyEpoch !== snapshot.sceneEpoch && lastSnapshot?.sceneEpoch === snapshot.sceneEpoch) {
      readyEpoch = snapshot.sceneEpoch;
      socket.emit('scene:ready', { runtimeEpoch, sceneEpoch: snapshot.sceneEpoch });
    }
  } catch (error) {
    if (!socket.connected || lastSnapshot?.runtimeEpoch !== runtimeEpoch) return;
    if (sceneLoadRecovery.failed(() => {
      if (socket.connected && lastSnapshot?.runtimeEpoch === runtimeEpoch) void prepareSnapshot(lastSnapshot);
    })) { console.error('No se pudo cargar el mapa del jugador', error); toast('No se pudo cargar el mapa. Reintentando…'); }
  }
}

const cameraOrientationLabels = ['Vista inicial', '45° a la derecha', '90° a la derecha', '135° a la derecha', '180° · lado opuesto', '135° a la izquierda', '90° a la izquierda', '45° a la izquierda'];
function supportsCameraOrbit(sceneId = lastSnapshot?.sceneId) {
  const scene = campaign.scenes.find(candidate => candidate.id === sceneId);
  return supportsCameraOrientation(scene);
}
function supportsCameraZoom(sceneId = lastSnapshot?.sceneId) {
  return Boolean(campaign.scenes.find(candidate => candidate.id === sceneId));
}
function updatePlayerCameraControls(sceneId = lastSnapshot?.sceneId) {
  $('playerCameraControls').hidden = !supportsCameraOrbit(sceneId);
  $('cameraSettings').hidden = !supportsCameraOrbit(sceneId);
  const step = world.getCameraOrientationStep();
  $('playerCameraLabel').textContent = cameraOrientationLabels[step] ?? cameraOrientationLabels[0]!;
}
function rotatePlayerCamera(delta: number) {
  if (!supportsCameraOrbit()) return;
  world.rotateCameraOrientation(delta);
  updatePlayerCameraControls();
}
function resetPlayerCamera() {
  if (!supportsCameraOrbit()) return;
  world.resetCameraOrientation();
  updatePlayerCameraControls();
}

const cameraTouchPointers = new Map<number, { x: number; y: number }>();
let cameraTouchPairSeen = false;
let cameraTouchGestureActive = false;
let cameraTouchGestureStartX: number | null = null;
let cameraTouchGestureStartY: number | null = null;
let cameraTouchGestureStartDistance: number | null = null;
let cameraTouchLastDistance: number | null = null;
let cameraTouchTiltDegrees = CAMERA_DEFAULT_TILT;
let cameraTouchLastCenterY: number | null = null;
let cameraTouchGestureAxis: CameraTouchAxis | null = null;
let cameraTouchFrame: number | null = null;
const cameraTouchPair = () => [...cameraTouchPointers.values()].slice(0, 2);
const cameraTouchCenter = () => {
  const pair = cameraTouchPair();
  return { x: pair.reduce((sum, point) => sum + point.x, 0) / pair.length, y: pair.reduce((sum, point) => sum + point.y, 0) / pair.length };
};
const cameraTouchDistance = () => {
  const [first, second] = cameraTouchPair();
  return first && second ? Math.hypot(second.x - first.x, second.y - first.y) : 0;
};
function resetCameraTouchGesture() {
  if (cameraTouchFrame !== null) cancelAnimationFrame(cameraTouchFrame);
  cameraTouchFrame = null;
  cameraTouchGestureActive = false;
  cameraTouchGestureStartX = null;
  cameraTouchGestureStartY = null;
  cameraTouchGestureStartDistance = null;
  cameraTouchLastDistance = null;
  cameraTouchLastCenterY = null;
  cameraTouchGestureAxis = null;
}
function clearCameraTouchContacts() {
  cameraTouchPointers.clear(); cameraTouchPairSeen = false; resetCameraTouchGesture();
}
function applyCameraTouchGesture() {
  if (!cameraTouchGestureActive || cameraTouchPointers.size !== 2) return;
  const center = cameraTouchCenter(), distance = cameraTouchDistance();
  const dx = center.x - (cameraTouchGestureStartX ?? center.x), dy = center.y - (cameraTouchGestureStartY ?? center.y);
  const pinchTravel = distance - (cameraTouchGestureStartDistance ?? distance);
  const previousAxis = cameraTouchGestureAxis;
  cameraTouchGestureAxis ??= cameraTouchAxis(dx, dy, pinchTravel, supportsCameraOrbit());
  if (cameraTouchGestureAxis === 'tilt' && supportsCameraOrbit()) {
    cameraTouchTiltDegrees = previousAxis === 'tilt'
      ? adjustCameraTiltForTouch(cameraTouchTiltDegrees, center.y - (cameraTouchLastCenterY ?? center.y))
      : cameraTiltFromTouch(cameraTouchTiltDegrees, dy);
    world.setCameraTiltDegrees(cameraTouchTiltDegrees);
  }
  if (cameraTouchGestureAxis === 'zoom' && cameraTouchLastDistance && distance > 0) world.zoomCameraBy(distance / cameraTouchLastDistance);
  cameraTouchLastDistance = distance;
  cameraTouchLastCenterY = center.y;
}
const worldCanvasTarget = (target: EventTarget | null): target is HTMLCanvasElement => target instanceof HTMLCanvasElement && target.classList.contains('world');

addEventListener('pointerdown', event => {
  if (event.pointerType !== 'touch' || !worldCanvasTarget(event.target) || !supportsCameraZoom()) return;
  if (cameraTouchPointers.size >= 2) return;
  cameraTouchPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (cameraTouchPointers.size === 2 && !cameraTouchPairSeen) {
    cameraTouchPairSeen = true;
    cameraTouchGestureActive = true;
    const center = cameraTouchCenter();
    cameraTouchGestureStartX = center.x;
    cameraTouchGestureStartY = center.y;
    cameraTouchGestureStartDistance = cameraTouchDistance();
    cameraTouchLastDistance = cameraTouchGestureStartDistance;
    cameraTouchTiltDegrees = world.getCameraTiltDegrees();
    cameraTouchLastCenterY = center.y;
    cameraTouchGestureAxis = null;
    event.preventDefault();
  }
}, { capture: true, passive: false });

addEventListener('pointermove', event => {
  const point = cameraTouchPointers.get(event.pointerId);
  if (!point) return;
  point.x = event.clientX; point.y = event.clientY;
  if (cameraTouchGestureActive && cameraTouchPointers.size === 2) {
    if (event.cancelable) event.preventDefault();
    // Mobile browsers dispatch one event per finger. Read the pair together
    // once per frame, so a parallel swipe is not mistaken for a pinch.
    cameraTouchFrame ??= requestAnimationFrame(() => { cameraTouchFrame = null; applyCameraTouchGesture(); });
  }
}, { capture: true, passive: false });

addEventListener('pointerup', event => {
  const point = cameraTouchPointers.get(event.pointerId);
  if (!point) return;
  point.x = event.clientX; point.y = event.clientY;
  applyCameraTouchGesture();
  if (cameraTouchGestureActive && cameraTouchGestureAxis === 'orbit' && cameraTouchGestureStartX !== null) {
    const horizontalTravel = cameraTouchCenter().x - cameraTouchGestureStartX;
    if (Math.abs(horizontalTravel) >= 52) rotatePlayerCamera(horizontalTravel < 0 ? -1 : 1);
  }
  cameraTouchPointers.delete(event.pointerId);
  resetCameraTouchGesture();
  if (!cameraTouchPointers.size) cameraTouchPairSeen = false;
}, { capture: true });

addEventListener('pointercancel', event => {
  if (!cameraTouchPointers.has(event.pointerId)) return;
  cameraTouchPointers.delete(event.pointerId);
  resetCameraTouchGesture();
  if (!cameraTouchPointers.size) cameraTouchPairSeen = false;
}, { capture: true });

function initializeJoystick(force = false) {
  if (joystickManager && !force) return;
  if (joystickManager) {
    releaseJoystickInput();
    joystickManager.destroy();
    joystickManager = null;
  }
  // NippleJS debe medir la zona una vez visible. Si se crea dentro de #hud[hidden],
  // conserva un centro (0,0) hasta el siguiente resize y queda desplazado en portrait.
  joystickManagerSize = Math.max(1, Math.round(Number.parseFloat($('joystick').style.width) || 100));
  joystickManager = nipplejs.create({
    zone: $('joystick'), mode: 'static', position: { left: '50%', top: '50%' },
    size: joystickManagerSize, color: 'white', restOpacity: 0.35
  });
  joystickManager.on('move', (_event, data) => {
    joystickInputActive = true;
    stick = { x: data.vector?.x ?? 0, up: data.vector?.y ?? 0 };
    send();
  });
  joystickManager.on('end', () => releaseJoystickInput());
}

function releaseJoystickInput(forceEnd = false) {
  const wasActive = joystickInputActive;
  joystickInputActive = false;
  stick = { x: 0, up: 0 };
  if (keys.size) { send(); return; }
  if (wasActive || forceEnd) send(true);
}

function bindJoystickReleaseSafety() {
  const zone = $('joystick');
  const releaseIfAllContactsEnded = () => {
    if (!joystickPointers.size && !joystickTouches.size) releaseJoystickInput(true);
  };
  addEventListener('pointerdown', event => {
    if (zone.contains(event.target as Node)) joystickPointers.add(event.pointerId);
  }, { capture: true });
  addEventListener('pointerup', event => {
    if (joystickPointers.delete(event.pointerId)) releaseIfAllContactsEnded();
  }, { capture: true });
  addEventListener('pointercancel', event => {
    if (!joystickPointers.has(event.pointerId)) return;
    // Los navegadores móviles pueden cancelar el puntero sin enviar pointerup.
    // Soltamos el contacto completo para no dejar movimiento retenido.
    joystickPointers.clear(); joystickTouches.clear(); releaseJoystickInput(true);
  }, { capture: true });
  addEventListener('lostpointercapture', event => {
    if (!joystickPointers.delete(event.pointerId)) return;
    releaseIfAllContactsEnded();
  }, { capture: true });
  addEventListener('touchstart', event => {
    if (!zone.contains(event.target as Node)) return;
    for (const touch of Array.from(event.changedTouches)) joystickTouches.add(touch.identifier);
  }, { capture: true, passive: true });
  addEventListener('touchend', event => {
    let releasedJoystickTouch = false;
    for (const touch of Array.from(event.changedTouches)) releasedJoystickTouch = joystickTouches.delete(touch.identifier) || releasedJoystickTouch;
    if (!releasedJoystickTouch) return;
    if (!joystickTouches.size) joystickPointers.clear();
    releaseIfAllContactsEnded();
  }, { capture: true, passive: true });
  addEventListener('touchcancel', event => {
    if (!joystickTouches.size) return;
    for (const touch of Array.from(event.changedTouches)) joystickTouches.delete(touch.identifier);
    joystickPointers.clear(); joystickTouches.clear(); releaseJoystickInput(true);
  }, { capture: true, passive: true });
}
bindJoystickReleaseSafety();

const movementKeys = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']);
const KEYBOARD_CHORD_WINDOW_MS = 32;
let keyboardMoveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingKeyboardAxes: ReturnType<typeof keyboardMovementAxes> | null = null;

function clearPendingKeyboardMove() {
  if (keyboardMoveTimer !== null) clearTimeout(keyboardMoveTimer);
  keyboardMoveTimer = null;
  pendingKeyboardAxes = null;
}

function queueKeyboardMove() {
  if (keyboardMoveTimer !== null) clearTimeout(keyboardMoveTimer);
  pendingKeyboardAxes = keyboardMovementAxes(keys);
  keyboardMoveTimer = setTimeout(() => {
    keyboardMoveTimer = null;
    const axes = pendingKeyboardAxes;
    pendingKeyboardAxes = null;
    if (axes) sendScreenVector(axes.x, axes.up);
  }, KEYBOARD_CHORD_WINDOW_MS);
}

addEventListener('keydown', event => {
  if (event.key === 'Escape' && !(event.target instanceof Element && event.target.closest('dialog'))) { event.preventDefault(); cancelActionSelection(); return; }
  if (event.target instanceof Element && event.target.matches('input,textarea,select')) return;
  if (($('inventory') as HTMLDialogElement).open || ($('playerSettings') as HTMLDialogElement).open) return;
  const key = event.key.toLowerCase();
  if (!event.repeat && (key === 'q' || key === 'e') && supportsCameraOrbit()) {
    event.preventDefault(); rotatePlayerCamera(key === 'q' ? -1 : 1); return;
  }
  if (!event.repeat && (key === 'r' || key === 'f') && supportsCameraOrbit()) {
    event.preventDefault(); world.setCameraTiltDegrees(world.getCameraTiltDegrees() + (key === 'r' ? 5 : -5)); return;
  }
  if (movementKeys.has(key)) {
    event.preventDefault();
    const firstPress = !keys.has(key);
    keys.add(key);
    if (firstPress) queueKeyboardMove();
  }
});

$('playerCameraLeft').onclick = () => rotatePlayerCamera(-1);
$('playerCameraRight').onclick = () => rotatePlayerCamera(1);
$('playerCameraReset').onclick = resetPlayerCamera;
const openPlayerSettings = () => { stop(); syncPlayerSettingsDialog(); ($('playerSettings') as HTMLDialogElement).showModal(); };
$('openHudLayoutEditor').onclick = startHudLayoutEdit;
$('cancelHudLayout').onclick = () => finishHudLayoutEdit(false);
$('applyHudLayout').onclick = () => finishHudLayoutEdit(true);
bindHudPreviewDrag('previewJoystick');
bindHudPreviewDrag('previewActionControl');
($('settingJoystickX') as HTMLInputElement).oninput = event => {
  if (!hudLayoutDraft) return;
  hudLayoutDraft.joystickX = Number((event.currentTarget as HTMLInputElement).value) / 100;
  syncHudLayoutPreview();
};
($('settingJoystickY') as HTMLInputElement).oninput = event => {
  if (!hudLayoutDraft) return;
  hudLayoutDraft.joystickY = Number((event.currentTarget as HTMLInputElement).value) / 100;
  syncHudLayoutPreview();
};
($('settingActionX') as HTMLInputElement).oninput = event => {
  if (!hudLayoutDraft) return;
  hudLayoutDraft.actionX = Number((event.currentTarget as HTMLInputElement).value) / 100;
  syncHudLayoutPreview();
};
($('settingActionY') as HTMLInputElement).oninput = event => {
  if (!hudLayoutDraft) return;
  hudLayoutDraft.actionY = Number((event.currentTarget as HTMLInputElement).value) / 100;
  syncHudLayoutPreview();
};
($('settingJoystickSize') as HTMLInputElement).oninput = event => {
  if (!hudLayoutDraft) return;
  hudLayoutDraft.joystickSize = Number((event.currentTarget as HTMLInputElement).value);
  syncHudLayoutPreview();
};
($('settingActionSize') as HTMLInputElement).oninput = event => {
  if (!hudLayoutDraft) return;
  hudLayoutDraft.actionSize = Number((event.currentTarget as HTMLInputElement).value);
  syncHudLayoutPreview();
};
$('identityMenuToggle').onclick = () => {
  const isOpen = !$('identityMenu').hidden;
  if (isOpen && !playerDisplaySettings.identityMenuAlwaysOpen) closeIdentityMenu();
  else if (!isOpen) openIdentityMenu();
};
$('settingsButton').onclick = () => { closeIdentityMenu(); openPlayerSettings(); };
$('closeSettings').onclick = () => ($('playerSettings') as HTMLDialogElement).close();
$('playerSettings').addEventListener('click', event => { if (event.target === $('playerSettings')) ($('playerSettings') as HTMLDialogElement).close(); });
$('playerSettings').addEventListener('close', () => {
  if (hudLayoutDraft) finishHudLayoutEdit(false);
});
for (const dialogId of ['playerSettings', 'characterSheet', 'inventory'] as const) {
  $(dialogId).addEventListener('close', () => { if (playerDisplaySettings.identityMenuAlwaysOpen) openIdentityMenu(); });
}
($('settingGrid') as HTMLInputElement).onchange = event => updatePlayerDisplaySetting('showGrid', (event.currentTarget as HTMLInputElement).checked);
($('settingMovementHints') as HTMLInputElement).onchange = event => updatePlayerDisplaySetting('showMovementHints', (event.currentTarget as HTMLInputElement).checked);
($('settingSceneNotice') as HTMLInputElement).onchange = event => updatePlayerDisplaySetting('showSceneNotice', (event.currentTarget as HTMLInputElement).checked);
$('settingJoystickOpacity').oninput = event => updatePlayerDisplaySetting('joystickOpacity', Number((event.currentTarget as HTMLInputElement).value) / 100);
$('settingIdentityMenuAlwaysOpen').onchange = event => updatePlayerDisplaySetting('identityMenuAlwaysOpen', (event.currentTarget as HTMLInputElement).checked);
$('settingIdentityMenuSeconds').oninput = event => updatePlayerDisplaySetting('identityMenuSeconds', Number((event.currentTarget as HTMLInputElement).value));
$('resetDisplaySettings').onclick = () => { playerDisplaySettings = { ...defaultPlayerDisplaySettings }; applyPlayerDisplaySettings(); toast('Opciones restablecidas.'); };
$('resetPlayerCamera').onclick = resetPlayerCamera;
addEventListener('keyup', event => {
  const key = event.key.toLowerCase();
  if (!movementKeys.has(key)) return;
  keys.delete(key);
  if (!keys.size) {
    const pending = pendingKeyboardAxes;
    clearPendingKeyboardMove();
    if (pending) sendScreenVector(pending.x, pending.up);
    stop();
  } else if (keyboardMoveTimer === null) send();
});

function vector() {
  let x = stick.x;
  let up = stick.up;
  if (keys.size) {
    ({ x, up } = keyboardMovementAxes(keys));
  }
  return world.screenVectorToWorld(x, up);
}

function sendWorldVector(next: { x: number; z: number }, end = false) {
  if (!socket.connected || !lastSnapshot || !privateState?.characterId || readyEpoch !== lastSnapshot.sceneEpoch) return;
  if (!end && !privateState.sceneMovementEnabled) return;
  if (!end && (document.hidden || ($('inventory') as HTMLDialogElement).open || ($('playerSettings') as HTMLDialogElement).open)) return;
  if (!end && Math.hypot(next.x, next.z) < 0.2) return;
  socket.emit('input:move', { runtimeEpoch, seq: seq++, sceneEpoch: lastSnapshot.sceneEpoch, x: end ? 0 : next.x, z: end ? 0 : next.z, end });
}

function sendScreenVector(x: number, up: number) { sendWorldVector(world.screenVectorToWorld(x, up)); }
function send(end = false) { sendWorldVector(end ? { x: 0, z: 0 } : vector(), end); }

function stop() {
  clearPendingKeyboardMove();
  stick = { x: 0, up: 0 };
  joystickInputActive = false;
  joystickPointers.clear(); joystickTouches.clear();
  keys.clear();
  send(true);
}
setInterval(() => { if (keyboardMoveTimer === null) send(); }, 80);
addEventListener('blur', () => { stop(); clearCameraTouchContacts(); });
addEventListener('pagehide', () => { stop(); clearCameraTouchContacts(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { stop(); clearCameraTouchContacts(); } });
const actionToggle = $('actionToggle');
for (const eventName of ['pointerdown', 'pointerup', 'click'] as const) actionToggle.addEventListener(eventName, event => event.stopPropagation());
// The map listens directly on its canvas. Keep taps made in either action tray
// entirely inside the tray, including the delayed click generated by a phone.
for (const panelId of ['targetMenu', 'explorationMenu', 'actionRadial'] as const) {
  const panel = $(panelId);
  for (const eventName of ['pointerdown', 'pointerup', 'pointercancel', 'click', 'contextmenu'] as const) panel.addEventListener(eventName, event => event.stopPropagation());
}
actionToggle.onclick = () => {
  if (lastSnapshot?.combat.active && !actionsMenuOpen) { actionRadialCategory = null; actionRadialPage = 0; }
  actionsMenuOpen = !actionsMenuOpen; renderedTargetMenuKey = '';
  renderActionToggle(); renderTargetMenu(); renderExplorationControls(); renderCombatControls();
};
$('interact').onclick = () => {
  activateAvailableProximityAction();
};
$('campInteractionList').addEventListener('click', event => event.stopPropagation());
$('campInteractions').addEventListener('pointerdown', event => event.stopPropagation());
$('inventoryButton').onclick = () => {
  closeIdentityMenu();
  stop();
  if (privateState) ($('inventoryEditor') as HTMLTextAreaElement).value = privateState.inventory.join('\n');
  setInventoryEditing(false);
  ($('inventory') as HTMLDialogElement).showModal();
};
$('closeInventory').onclick = () => ($('inventory') as HTMLDialogElement).close();
$('editInventory').onclick = () => setInventoryEditing(true);
$('cancelInventory').onclick = () => setInventoryEditing(false);
$('inventoryEditor').oninput = () => { $('inventorySummary').textContent = 'Estás editando. Guarda para aplicar los cambios a la partida.'; };
$('saveInventory').onclick = () => {
  if (!privateState?.characterId) return;
  const items = ($('inventoryEditor') as HTMLTextAreaElement).value.split(/\r?\n/).map(item => item.trim()).filter(Boolean);
  if (items.some(item => item.length > 180) || items.length > 80) return toast('La mochila admite hasta 80 objetos de 180 caracteres.');
  socket.emit('player:inventory', { runtimeEpoch, commandId: commandId(), items });
  setInventoryEditing(false); toast('Guardando mochila…');
};
$('sheetButton').onclick = () => { closeIdentityMenu(); stop(); setSheetEditing(false); ($('characterSheet') as HTMLDialogElement).showModal(); };
$('closeSheet').onclick = () => ($('characterSheet') as HTMLDialogElement).close();
$('summarySheet').onclick = () => { sheetView = 'summary'; playerDisplaySettings = { ...playerDisplaySettings, sheetView }; writeUiPreferences(playerDisplaySettingsKey, playerDisplaySettings); if (privateState) renderSheet(privateState); };
$('fullSheet').onclick = () => { sheetView = 'full'; playerDisplaySettings = { ...playerDisplaySettings, sheetView }; writeUiPreferences(playerDisplaySettingsKey, playerDisplaySettings); if (privateState) renderSheet(privateState); };
$('editSheet').onclick = () => setSheetEditing(true);
$('cancelSheetEdit').onclick = () => setSheetEditing(false);
$('saveSheet').onclick = () => saveSheet();

function setInventoryEditing(editing: boolean) {
  const editor = $('inventoryEditor') as HTMLTextAreaElement;
  editor.hidden = !editing; $('inventoryList').hidden = editing;
  $('editInventory').hidden = editing; $('saveInventory').hidden = !editing; $('cancelInventory').hidden = !editing;
  $('inventorySummary').textContent = editing ? 'Una línea por objeto. Guardar es la única forma de modificar la mochila.' : 'Consulta el equipo o consume un objeto. La edición solo se abre al pulsar Editar.';
  if (editing && privateState) editor.value = privateState.inventory.join('\n');
}
function sheetLines(id: string) { return ($(id) as HTMLTextAreaElement).value.split(/\r?\n/).map(value => value.trim()).filter(Boolean); }
function detailsToText(details: NonNullable<PlayerPrivate['sheet']>['details']) { return (details ?? []).flatMap(section => [`# ${section.title}`, ...section.entries, '']).join('\n').trim(); }
function textToDetails(value: string) {
  const sections: Array<{ title: string; entries: string[] }> = []; let current: { title: string; entries: string[] } | null = null;
  for (const line of value.split(/\r?\n/).map(line => line.trim()).filter(Boolean)) {
    if (line.startsWith('# ')) { current = { title: line.slice(2).trim(), entries: [] }; if (current.title) sections.push(current); }
    else if (current) current.entries.push(line);
  }
  return sections.filter(section => section.entries.length);
}
function sheetStrengthInput() {
  let input = document.getElementById('editSheetStrength') as HTMLInputElement | null;
  if (!input) {
    const speed = $('editSheetSpeed'), label = document.createElement('label');
    label.append(document.createTextNode('Fuerza (FUE, 1–30)'));
    input = document.createElement('input'); input.id = 'editSheetStrength'; input.type = 'number'; input.min = '1'; input.max = '30'; input.placeholder = 'Sin registrar';
    label.append(input); speed.parentElement?.after(label);
  }
  return input;
}
function setSheetEditing(editing: boolean) {
  const sheet = privateState?.sheet; $('sheetReadOnly').hidden = editing; $('sheetEditor').hidden = !editing; $('editSheet').hidden = editing;
  if (!editing || !sheet) return;
  ($('editSheetLevel') as HTMLInputElement).value = String(sheet.level); ($('editSheetBackground') as HTMLInputElement).value = sheet.background;
  ($('editSheetArmorClass') as HTMLInputElement).value = String(sheet.armorClass); ($('editSheetSpeed') as HTMLInputElement).value = String(sheet.speedMeters);
  sheetStrengthInput().value = sheet.strengthScore === undefined ? '' : String(sheet.strengthScore);
  ($('editSheetFeatures') as HTMLTextAreaElement).value = sheet.features.join('\n'); ($('editSheetAttacks') as HTMLTextAreaElement).value = sheet.attacks.join('\n');
  ($('editSheetSpells') as HTMLTextAreaElement).value = sheet.spells.join('\n'); ($('editSheetDetails') as HTMLTextAreaElement).value = detailsToText(sheet.details);
}
function saveSheet() {
  if (!privateState?.sheet) return;
  const rawStrength = sheetStrengthInput().value.trim(), strengthScore = rawStrength ? Number(rawStrength) : undefined;
  const sheet = { level: Number(($('editSheetLevel') as HTMLInputElement).value), background: ($('editSheetBackground') as HTMLInputElement).value.trim(), armorClass: Number(($('editSheetArmorClass') as HTMLInputElement).value), speedMeters: Number(($('editSheetSpeed') as HTMLInputElement).value), ...(strengthScore !== undefined ? { strengthScore } : {}), features: sheetLines('editSheetFeatures'), attacks: sheetLines('editSheetAttacks'), spells: sheetLines('editSheetSpells'), details: textToDetails(($('editSheetDetails') as HTMLTextAreaElement).value) };
  if (!Number.isInteger(sheet.level) || sheet.level < 1 || !sheet.background || !Number.isInteger(sheet.armorClass) || sheet.armorClass < 1 || !Number.isFinite(sheet.speedMeters) || sheet.speedMeters <= 0 || strengthScore !== undefined && (!Number.isInteger(strengthScore) || strengthScore < 1 || strengthScore > 30)) return toast('Revisa nivel, trasfondo, CA, velocidad y Fuerza (1–30).');
  socket.emit('player:sheet', { runtimeEpoch, commandId: commandId(), sheet }); setSheetEditing(false); toast('Guardando ficha…');
}

socket.connect();

function renderSheet(next: PlayerPrivate) {
  const sheetKey=JSON.stringify([next.characterId,next.label,next.hp,next.maxHp,next.conditions,next.conditionSources,next.resources,next.sheet,sheetView]);
  if($('sheetStats').dataset.renderKey===sheetKey)return;$('sheetStats').dataset.renderKey=sheetKey;
  const sheet = next.sheet;
  $('sheetName').textContent = next.label ? `Hoja · ${next.label}` : 'Hoja de personaje';
  $('sheetSummary').textContent = sheet ? `${sheet.background} · nivel ${sheet.level}${sheetView === 'full' ? ' · vista completa' : ' · resumen de aventura'}` : 'La hoja aún no tiene datos de campaña.';
  $('summarySheet').classList.toggle('primary', sheetView === 'summary'); $('fullSheet').classList.toggle('primary', sheetView === 'full');
  const stats = $('sheetStats'); stats.replaceChildren();
  const field = (label: string, value: string) => { const box = document.createElement('div'), title = document.createElement('b'), detail = document.createElement('span'); if (label === 'Salto') box.className = 'sheet-stat-wide'; title.textContent = label; detail.textContent = value; box.append(title, detail); return box; };
  stats.append(field('PG', `${next.hp ?? '—'} / ${next.maxHp ?? '—'}`));
  document.getElementById('activeStates')?.remove(); document.getElementById('stateLegend')?.remove();
  const states = next.conditions;
  const icons: Record<string, string> = { envenenada: '🟢', apresada: '🟣', agarrada: '🔵', derribada: '🟠', asustada: '🟡', hechizada: '💛', paralizada: '🧊', inconsciente: '⚫', oculta: '⚪', invisible: '✨', restringida: '🟣' };
  if (states.length) { const section = document.createElement('section'); section.id = 'activeStates'; const title = document.createElement('h3'); title.textContent = 'Estados activos'; section.append(title, ...states.map(state => { const item = document.createElement('p'), source = next.conditionSources.find(candidate => candidate.condition === state); const origin = source?.sourceLabel ?? source?.sourceAbility ?? source?.sourceId; const duration = source?.durationRounds !== undefined ? `\nDuración: ${source.durationRounds} rondas` : ''; item.textContent = `${icons[state] ?? '●'} ${state.toUpperCase()}${origin ? `\nOrigen: ${origin}` : ''}${duration}\n${conditionHelp(state, source, sheet?.features, next.hp)}`; return item; })); stats.after(section); }
  const legend = document.createElement('details'); legend.id = 'stateLegend'; const summary = document.createElement('summary'); summary.textContent = 'Leyenda de estados'; const legendText = document.createElement('p'); legendText.textContent = '🟢 Envenenada · 🟣 Apresada · 🔵 Agarrada · 🟠 Derribada · 🟡 Asustada · ⚫ Inconsciente · ⚪ Oculta · ✨ Invisible'; legend.append(summary, legendText); (document.getElementById('activeStates') ?? stats).after(legend);
  document.getElementById('sheetDetails')?.replaceChildren();
  if (sheet) {
    stats.append(field('CA', String(sheet.armorClass)), field('Velocidad', `${sheet.speedMeters} m`));
    if (sheet.strengthScore !== undefined) stats.append(field('FUE', String(sheet.strengthScore)), field('Salto', jumpSummary(sheet.strengthScore)));
    for (const resource of Object.values(next.resources)) stats.append(field(resource.label, `${resource.current}/${resource.max}`));
    const list = (id: string, values: string[]) => $(id).replaceChildren(...values.map(value => { const row = document.createElement('li'); row.textContent = value; return row; }));
    list('sheetFeatures', sheet.features); list('sheetAttacks', sheet.attacks); list('sheetSpells', sheet.spells);
    $('sheetSummaryBody').hidden = sheetView === 'full';
    if (sheetView === 'full' && sheet.details?.length) {
      const details = $('sheetDetails');
      for (const section of sheet.details) {
        const heading = document.createElement('h3'), entries = document.createElement('ul');
        heading.textContent = section.title;
        entries.append(...section.entries.map(entry => { const item = document.createElement('li'); item.textContent = entry; return item; }));
        details.append(heading, entries);
      }
    }
  } else {
    $('sheetSummaryBody').hidden = false;
    for (const id of ['sheetFeatures', 'sheetAttacks', 'sheetSpells']) $(id).replaceChildren();
  }
}
