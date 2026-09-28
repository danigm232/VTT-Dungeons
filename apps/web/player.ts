import { io } from 'socket.io-client';
import nipplejs from 'nipplejs';
import { OBJECT_MODEL_VERSION, PROTOCOL_VERSION, explorationBasicActionCatalogue } from '../../engine/shared/protocol';
import type { BasicCombatAction, CharacterPublic, CombatAction, CommandResult, ExplorationAction, ExplorationBasicAction, PlayerPrivate, WorldSnapshot } from '../../engine/shared/protocol';
import { commandId } from '../../engine/client/uuid';
import { WorldRenderer } from './world';
import { shipLootIconIndex } from '../../engine/client/ship-loot-art';
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
const socketAuth = () => ({ role: 'player', sessionToken, protocolVersion: PROTOCOL_VERSION, objectModelVersion: OBJECT_MODEL_VERSION });
// Register every listener before connecting. On slow phones this prevents the
// initial chooser packet from arriving before its renderer is ready.
const socket = io({ autoConnect: false, auth: socketAuth() });
const world = new WorldRenderer($('world'), campaign, { showStairMarker: false });
let privateState: PlayerPrivate | null = null;
let lastSnapshot: WorldSnapshot | null = null;
let readyEpoch = -1;
let runtimeEpoch: string | null = null;
let seq = 0;
let stick = { x: 0, up: 0 };
const keys = new Set<string>();
let toastTimer = 0;
let joystickManager: ReturnType<typeof nipplejs.create> | null = null;
let selectedTargetId: string | null = null, turnAnnouncementUntil = 0;
let renderedTargetMenuKey = '';
let resumedRuntimeEpoch: string | null = null, recoveringSession = false;
let sheetView: 'summary' | 'full' = 'summary';
const pendingCombatNotices = new Map<string, string>();
const pendingCombatCommands = new Set<string>();
let armedActionId: string | null = null;
let armedBasicAction: BasicCombatAction | null = null;
let actionsMenuOpen = false, combatWasActive = false;
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

socket.on('connect', () => {
  recoveringSession = false;
  $('connection').textContent = 'Conectado a la mesa';
  readyEpoch = -1;
  world.resetConnection();
  if (lastSnapshot) void prepareSnapshot(lastSnapshot);
});
socket.on('disconnect', reason => {
  $('connection').textContent = recoveringSession ? 'Restableciendo sesión…' : reason === 'io server disconnect' && !privateState?.characterId
    ? 'Control finalizado en esta pestaña'
    : 'Reconectando…';
  stop();
  readyEpoch = -1;
});
socket.on('combat:animation', (event: { runtimeEpoch: string; attackerId: string; targetId: string; type: 'melee' | 'arrow' | 'thrownWeapon' | 'radiantArrow' | 'vine' | 'fireProjectile' | 'magicalProjectile'; hit: boolean; frozen: boolean; sneakAttack?: boolean }) => { if (event.runtimeEpoch === runtimeEpoch) world.playRangedAttack(event.attackerId, event.targetId, event.type, event.hit, event.frozen, event.sneakAttack); });
socket.on('scene:animation', (event: { runtimeEpoch: string; sceneEpoch: number; entityId: string; state: string; durationMs: number }) => { if (event.runtimeEpoch === runtimeEpoch && event.sceneEpoch === lastSnapshot?.sceneEpoch) world.playTokenAnimation(event.entityId, event.state, event.durationMs); });
socket.on('scene:area-effect', (event: { runtimeEpoch: string; sceneEpoch: number; cell: { col: number; row: number }; type: 'fog'; radiusMeters: number; durationMs: number }) => { if (event.runtimeEpoch === runtimeEpoch && event.sceneEpoch === lastSnapshot?.sceneEpoch) world.playAreaEffect(event.cell, event.type, event.radiusMeters, event.durationMs); });
socket.on('mirror:transformation', (event: { runtimeEpoch: string; sceneEpoch: number; propId: string; sourceId: string; reflectionId: string; frames: string[]; durationMs: number }) => { if (event.runtimeEpoch === runtimeEpoch && event.sceneEpoch === lastSnapshot?.sceneEpoch) world.playMirrorTransformation(event.propId, event.sourceId, event.reflectionId, event.frames, event.durationMs); });
socket.on('auth:error', (error: { code?: string }) => {
  if (error.code === 'PROTOCOL_MISMATCH') { toast('La aplicación se ha actualizado. Recarga esta página.'); return; }
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
  stop(); runtimeEpoch = event.runtimeEpoch; readyEpoch = -1; seq = 0; lastSnapshot = null; privateState = null;
  resumedRuntimeEpoch = null; selectedTargetId = null; renderedTargetMenuKey = ''; pendingCombatNotices.clear(); pendingCombatCommands.clear(); armedActionId = null; armedBasicAction = null; actionsMenuOpen = false; combatWasActive = false; combatBarMode = null; armedExplorationActionId = null; armedExplorationAttackId = null; armedExplorationBasicActionId = null; openCombatCategory = null; openExplorationCategory = null;
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
  if (lastSnapshot && snapshot.sceneEpoch !== lastSnapshot.sceneEpoch) {
    stop();
    readyEpoch = -1;
  }
  lastSnapshot = snapshot;
  void prepareSnapshot(snapshot);
  const scene = campaign.scenes.find(scene => scene.id === snapshot.sceneId);
  $('sceneNotice').textContent = privateState?.rowboat?.aboard
    ? privateState.rowboat.pilot ? 'Barca · rema con WASD o el mando · pulsa Bajar para nadar'
      : 'Barca · otro personaje lleva los remos · pulsa Bajar para nadar'
    : scene ? `${scene.title} · 1 casilla = 1,5 m${scene.movementEnabled ? '' : ' · espera la señal del DM'}` : 'Escena no disponible';
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
      TOO_FAR: 'Estás demasiado lejos.', OUT_OF_RANGE: 'El objetivo está fuera de alcance.', NOT_YOUR_TURN: 'No es tu turno.', MOVEMENT_SPENT: 'No te queda suficiente movimiento para hacerlo.',
      ROLL_PENDING: 'Termina la tirada pendiente antes de continuar.', PROMPT_STALE: 'Esta tirada ya no está vigente.',
      PROMPT_STAGE_MISMATCH: 'Esta respuesta pertenece a otro paso de la acción.', WRONG_ACTOR: 'Esta tirada corresponde a otro personaje.',
      INVALID_DAMAGE_DICE: 'El resultado no es posible para esos dados.', INVALID_ROLL: 'El resultado introducido no es válido.', NO_LANDING: 'No hay una casilla libre junto a la barca para bajar.',
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
  actionsMenuOpen = false; renderedTargetMenuKey = '';
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
  let holdTimer = 0, hideTimer = 0, suppressClick = false, shown = false, origin: { x: number; y: number } | null = null, homeParent: Node | null = null, homeNext: Node | null = null;
  button.setAttribute('aria-describedby', tooltip.id);
  const clearHold = () => { if (holdTimer) { clearTimeout(holdTimer); holdTimer = 0; } };
  const hide = () => {
    tooltip.classList.remove('touch-visible');
    if (tooltip.parentNode === document.body) {
      if (homeParent?.isConnected) homeNext?.parentNode === homeParent ? homeParent.insertBefore(tooltip, homeNext) : homeParent.appendChild(tooltip);
      else tooltip.remove();
    }
    shown = false; suppressClick = false;
  };
  button.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse') return;
    clearTimeout(hideTimer); hide(); origin = { x: event.clientX, y: event.clientY };
    holdTimer = window.setTimeout(() => {
      holdTimer = 0; shown = true; suppressClick = true; homeParent = tooltip.parentNode; homeNext = tooltip.nextSibling;
      document.body.append(tooltip); tooltip.classList.add('touch-visible');
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
  const explorationActive = Boolean(privateState && lastSnapshot && !lastSnapshot.combat.active);
  const combatActive = Boolean(lastSnapshot?.combat.active && combatActionsAvailable());
  const active = explorationActive || combatActive;
  // In combat the persistent command bar below replaces this floating menu.
  button.hidden = !active || combatActive;
  if (!active) { button.setAttribute('aria-expanded', 'false'); return; }
  const selected = combatActive
    ? armedActionId ? privateState?.combat?.attacks.find(action => action.id === armedActionId)?.label : armedBasicAction ? basicActionLabels[armedBasicAction] : undefined
    : armedExplorationActionId ? privateState?.explorationActions.find(action => action.id === armedExplorationActionId)?.label : armedExplorationAttackId ? privateState?.explorationAttacks.find(action => action.id === armedExplorationAttackId)?.label : armedExplorationBasicActionId ? explorationBasicActionCatalogue[armedExplorationBasicActionId].label : undefined;
  button.textContent = actionsMenuOpen ? '— Cerrar acciones' : selected ? `⚔ ${compactActionLabel(selected)}` : '⚔ Acciones';
  button.classList.toggle('combat-actions-toggle', combatActive); button.setAttribute('aria-expanded', String(actionsMenuOpen));
}

function finishCombatTurn() {
  if (!lastSnapshot || !privateState?.combat?.isTurn || pendingCombatCommands.size) return;
  const id = commandId(); pendingCombatCommands.add(id);
  socket.emit('player:combat', { runtimeEpoch, type: 'combat:endTurn', commandId: id, sceneEpoch: lastSnapshot.sceneEpoch });
  renderCombatFrame();
}

function chooseCombatBarMode(mode: Exclude<CombatBarMode, null>) {
  const combat = privateState?.combat;
  if (!combat || combat.initiative.pending) return;
  combatBarMode = mode;
  armedActionId = null; armedBasicAction = null; renderedTargetMenuKey = '';
  if (mode === 'move') {
    actionsMenuOpen = false; openCombatCategory = null;
    toast(combat.movement ? `Mover: te quedan ${(combat.movement.remainingSquares * 1.5).toFixed(1)} m. El mapa marca las casillas alcanzables.` : 'Mover: usa el mapa o los controles de desplazamiento.');
  } else {
    actionsMenuOpen = true;
    openCombatCategory = mode === 'rules' ? 'rules' : mode;
  }
  document.body.classList.toggle('combat-move-mode', mode === 'move');
  updateAttackRangePreview(); renderCombatFrame(); renderTargetMenu();
}

function renderCombatFrame() {
  const active = Boolean(privateState?.combat && lastSnapshot?.combat.active && privateState);
  const initiative = $('combatInitiative'), legend = $('combatLegend'), hero = $('combatHero'), bar = $('combatCommandBar');
  initiative.hidden = !active; legend.hidden = !active; hero.hidden = !active; bar.hidden = !active;
  if (!active || !privateState || !lastSnapshot || !privateState.combat) {
    initiative.replaceChildren(); hero.replaceChildren(); bar.replaceChildren(); return;
  }
  const combat = privateState.combat;
  const currentId = lastSnapshot.combat.currentId;
  const heading = document.createElement('header'), title = document.createElement('strong'), round = document.createElement('span');
  heading.className = 'combat-initiative-header'; title.textContent = combat.initiative.pending ? 'Iniciativa' : 'Orden de iniciativa'; round.textContent = combat.initiative.pending ? 'Esperando tiradas' : `Ronda ${lastSnapshot.combat.round}`; heading.append(title, round);
  const roster = document.createElement('div'); roster.className = 'combat-initiative-roster';
  const confirmedOrder = lastSnapshot.combat.order?.map(entry => lastSnapshot!.combat.participants.find(participant => participant.id === entry.id)).filter((participant): participant is NonNullable<typeof participant> => Boolean(participant)) ?? [];
  const participants = confirmedOrder.length ? confirmedOrder : [...lastSnapshot.combat.participants].sort((left, right) => right.initiative - left.initiative || left.label.localeCompare(right.label, 'es'));
  const selfEntity = lastSnapshot.entities.find(entity => entity.id === privateState!.characterId);
  const initiativeTooltip = (participant: typeof participants[number]) => {
    const tooltip = document.createElement('aside'), eyebrow = document.createElement('small'), title = document.createElement('strong'), facts = document.createElement('ul'), note = document.createElement('p');
    const entity = lastSnapshot!.entities.find(item => item.id === participant.id);
    const isSelf = participant.id === privateState!.characterId;
    const distance = selfEntity && entity && !isSelf ? Math.max(Math.abs(selfEntity.cell.col - entity.cell.col), Math.abs(selfEntity.cell.row - entity.cell.row)) * 1.5 : null;
    tooltip.className = 'initiative-tooltip'; eyebrow.textContent = isSelf ? 'TU PERSONAJE' : participant.controller === 'player' ? 'ALIADO' : 'OPONENTE'; title.textContent = isSelf ? privateState!.label ?? participant.label : participant.label;
    const addFact = (text: string) => { const item = document.createElement('li'); item.textContent = text; facts.append(item); };
    addFact(`CA ${participant.armorClass}`);
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
    const entity = lastSnapshot.entities.find(item => item.id === participant.id), art = entity ? campaign.tokens[entity.tokenId]?.url : undefined;
    if (art) { const image = document.createElement('img'); image.src = art; image.alt = ''; portrait.append(image); } else portrait.textContent = participant.label.slice(0, 1).toUpperCase();
    name.textContent = participant.id === privateState.characterId ? 'Tú' : participant.label;
    detail.textContent = combat.initiative.pending ? (participant.initiativeSubmitted ? 'lista' : 'por tirar') : participant.id === currentId ? 'en turno' : participant.controller === 'player' ? 'aliado' : 'oponente';
    copy.append(name, detail); const tooltip = initiativeTooltip(participant); row.append(position, portrait, copy, tooltip); enableLongPressInfo(row, tooltip); roster.append(row);
  }
  initiative.replaceChildren(heading, roster);

  const self = lastSnapshot.entities.find(entity => entity.id === privateState!.characterId);
  const selfParticipant = lastSnapshot.combat.participants.find(item => item.id === privateState!.characterId);
  const incapacitated = Boolean(selfParticipant?.conditions.some(condition => condition === 'paralizada' || condition === 'inconsciente'));
  const portrait = document.createElement('div'), copy = document.createElement('div'), name = document.createElement('strong'), stats = document.createElement('span'), hp = document.createElement('div'), hpFill = document.createElement('i');
  portrait.className = 'combat-hero-portrait';
  const art = self?.tokenId ? campaign.tokens[self.tokenId]?.url : undefined;
  if (art) { const image = document.createElement('img'); image.src = art; image.alt = ''; portrait.append(image); } else portrait.textContent = (privateState.label ?? 'A').slice(0, 1).toUpperCase();
  copy.className = 'combat-hero-copy'; name.textContent = privateState.label ?? 'Aventurero';
  stats.textContent = `CA ${selfParticipant?.armorClass ?? '—'} · Mov. ${incapacitated ? '0 m' : combat.movement ? `${(combat.movement.remainingSquares * 1.5).toFixed(1)} m` : '—'}`;
  hp.className = 'combat-hero-hp'; hpFill.style.width = `${Math.max(0, Math.min(100, (privateState.hp ?? 0) / Math.max(1, privateState.maxHp ?? 1) * 100))}%`; hp.append(hpFill);
  const hpLabel = document.createElement('b'); hpLabel.textContent = `${privateState.hp}/${privateState.maxHp} PG`; copy.append(name, stats, hp, hpLabel); hero.replaceChildren(portrait, copy); hero.onclick = () => $('combatHp').click();

  const makeCommand = (mode: Exclude<CombatBarMode, null>, icon: string, label: string, available: boolean, used = false) => {
    const button = document.createElement('button'), glyph = document.createElement('i'), text = document.createElement('span');
    button.type = 'button'; button.className = 'combat-command'; button.classList.toggle('selected', combatBarMode === mode && (mode === 'move' || actionsMenuOpen)); button.classList.toggle('spent', used); button.disabled = !available;
    glyph.textContent = icon; text.textContent = label; button.append(glyph, text); button.title = used ? `${label}: ya gastada este turno.` : label;
    button.onclick = () => chooseCombatBarMode(mode); return button;
  };
  const any = (predicate: (action: CombatAction) => boolean) => combat.attacks.some(predicate);
  const actionAvailable = combat.isTurn && !incapacitated && !Boolean(pendingCombatCommands.size);
  const hasAction = any(action => action.actionCost !== 'bonus' && action.actionCost !== 'reaction' && !action.magical);
  const hasMagic = any(action => Boolean(action.magical) && action.actionCost !== 'reaction');
  const hasBonus = any(action => action.actionCost === 'bonus');
  const hasReaction = any(action => action.actionCost === 'reaction');
  const label = document.createElement('div'), labelTitle = document.createElement('strong'), economy = document.createElement('small');
  label.className = 'combat-command-title'; labelTitle.textContent = combat.initiative.pending ? 'Preparando combate' : incapacitated ? 'Sin acciones: incapacitada' : combat.isTurn ? 'Tus acciones' : 'En espera'; economy.textContent = `Acción ${combat.actionUsed ? '0/1' : '1/1'} · Adicional ${combat.bonusActionUsed ? '0/1' : '1/1'} · Reacción ${combat.reactionUsed ? '0/1' : '1/1'}`; label.append(labelTitle, economy);
  const end = document.createElement('button'), endIcon = document.createElement('i'), endText = document.createElement('span');
  end.type = 'button'; end.className = 'combat-command combat-end-turn'; end.disabled = !combat.isTurn || Boolean(pendingCombatCommands.size); endIcon.textContent = '⌛'; endText.textContent = 'Fin de turno'; end.append(endIcon, endText); end.onclick = finishCombatTurn;
  bar.replaceChildren(label,
    makeCommand('move', '➟', 'Mover', actionAvailable && Boolean(combat.movement?.remainingSquares), false),
    makeCommand('attack', '⚔', 'Acción', actionAvailable && hasAction, combat.actionUsed),
    makeCommand('magic', '✦', 'Conjuros', actionAvailable && hasMagic, combat.actionUsed),
    makeCommand('bonus', '➤', 'Adicional', actionAvailable && hasBonus, combat.bonusActionUsed),
    makeCommand('reaction', '⛨', 'Reacción', hasReaction && !incapacitated && !combat.reactionUsed && !Boolean(pendingCombatCommands.size), combat.reactionUsed),
    makeCommand('rules', '⚗', 'Objeto', actionAvailable && combat.basicActions.includes('use-object'), combat.actionUsed), end);
}

function renderCombatControls() {
  const combat = privateState?.combat, active = Boolean(combat && lastSnapshot?.combat.active && privateState);
  $('combatHud').hidden = !active; $('endTurn').hidden = !Boolean(active && combat!.isTurn);
  renderActionToggle();
  if (!active || !privateState) { $('targetMenu').hidden = true; selectedTargetId = null; armedActionId = null; armedBasicAction = null; combatBarMode = null; document.body.classList.remove('combat-move-mode'); openCombatCategory = null; renderedTargetMenuKey = ''; updateAttackRangePreview(); renderCombatFrame(); return; }
  const armedAction = armedActionId ? combat!.attacks.find(action => action.id === armedActionId) : undefined;
  if ((armedBasicAction && !combat!.isTurn) || (armedAction && !combat!.isTurn && !combat!.ready && armedAction.actionCost !== 'reaction')) { armedActionId = null; armedBasicAction = null; renderedTargetMenuKey = ''; }
  const movement = combat!.movement;
  const conditions = combat!.conditions.length ? ` · ◉ ${combat!.conditions.join(', ')}` : '';
  const concentration = privateState.concentration ? ` · Concentración: ${privateState.concentration.label}` : '';
  const movementText = movement ? ` · Movimiento ${movement.remainingSquares}/${movement.maximumSquares} casillas (${(movement.remainingSquares * 1.5).toFixed(1)} m)` : '';
  $('combatHp').textContent = `❤️ ${privateState.hp}/${privateState.maxHp}${movementText}${conditions}${concentration}`;
  if (combat!.initiative.pending) $('combatNotice').textContent = combat!.initiative.submitted ? '● Iniciativa registrada' : '● Iniciativa: tira e introduce tu total';
  else if (Date.now() >= turnAnnouncementUntil && combat!.isTurn) $('combatNotice').textContent = '● Tu turno';
  updateAttackRangePreview();
  renderCombatFrame();
  renderTargetMenu();
}

function renderInventory(items: string[]) {
  $('items').replaceChildren(...items.map(item => { const row = document.createElement('li'); row.textContent = item; return row; }));
  const list = $('inventoryList'); list.replaceChildren(...items.map((item, index) => {
    const row = document.createElement('article'), label = document.createElement('div'), name = document.createElement('span'), use = document.createElement('button');
    row.className = 'inventory-item'; label.className = 'inventory-item-label'; name.textContent = item;
    const iconIndex = shipLootIconIndex(item);
    if (iconIndex !== null) {
      const icon = document.createElement('span'); icon.className = 'inventory-art-icon'; icon.setAttribute('aria-hidden', 'true');
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
  if (armedActionId === action.id) { armedActionId = null; renderedTargetMenuKey = ''; updateAttackRangePreview(); renderTargetMenu(); return; }
  if (action.targeting === 'point') { armedActionId = action.id; armedBasicAction = null; renderedTargetMenuKey = ''; updateAttackRangePreview(); renderTargetMenu(); toast(`${action.label}: toca una casilla dentro del alcance.`); return; }
  if (actionCanTarget(action, selectedTargetId)) { declareCombatAction(action, selectedTargetId!); return; }
  armedActionId = action.id; armedBasicAction = null; renderedTargetMenuKey = ''; updateAttackRangePreview(); renderTargetMenu();
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
  const visible = Boolean(privateState && (combat?.initiative.pending || ((combat?.isTurn || canResolvePrompt || canReact || canUsePrepared) && actionsMenuOpen)));
  box.hidden = !visible;
  if (!combat || !visible || !privateState) { renderedTargetMenuKey = ''; box.replaceChildren(); return; }
  const prompt = combat.prompt;
  const self = lastSnapshot?.entities.find(entity => entity.id === privateState!.characterId);
  const key = combat.initiative.pending
    ? `initiative:${combat.initiative.submitted}:${combat.initiative.total}:${combat.initiative.modifier}:${pendingCombatCommands.size}`
    : prompt
    ? `prompt:${prompt.id}:${prompt.stage}:${prompt.minimum}:${prompt.maximum}`
    : `target:${target?.id ?? '-'}:${target?.cell.col ?? '-'}:${target?.cell.row ?? '-'}:${self?.cell.col ?? '-'}:${self?.cell.row ?? '-'}:${combat.actionUsed}:${combat.bonusActionUsed}:${combat.reactionUsed}:${combat.ready}:${armedActionId ?? '-'}:${armedBasicAction ?? '-'}:${pendingCombatCommands.size}:${JSON.stringify(combat.resources)}`;
  if (key === renderedTargetMenuKey) return;
  renderedTargetMenuKey = key; box.replaceChildren();
  if (combat.initiative.pending) {
    box.append(actionPanelHeader('COMBATE', 'Iniciativa', 'Antes de que haya turnos'));
    const note = document.createElement('p'); note.className = 'combat-prompt-note';
    if (combat.initiative.submitted) {
      note.textContent = `Tu iniciativa (${combat.initiative.total}) está registrada. Esperando a los demás y la confirmación del DM.`;
      box.append(note); return;
    }
    note.textContent = `Tira físicamente 1d20 ${combat.initiative.modifier >= 0 ? '+' : ''}${combat.initiative.modifier} e introduce el total. El programa no tira el dado.`;
    const input = document.createElement('input'), submit = document.createElement('button'), controls = document.createElement('div');
    input.type = 'number'; input.min = '-20'; input.max = '40'; input.placeholder = 'Total de iniciativa'; submit.className = 'primary'; submit.textContent = 'Registrar iniciativa';
    input.className = 'combat-prompt-input'; submit.classList.add('combat-prompt-submit'); controls.className = 'combat-prompt-controls'; controls.append(input, submit);
    const send = () => {
      const total = Number(input.value);
      if (!Number.isInteger(total) || total < -20 || total > 40) return toast('Introduce un total entero entre -20 y 40.');
      const id = commandId(); input.disabled = true; submit.disabled = true; pendingCombatCommands.add(id);
      socket.emit('player:combat', { runtimeEpoch, type: 'combat:initiative', commandId: id, sceneEpoch: lastSnapshot!.sceneEpoch, total });
    };
    submit.onclick = send; input.onkeydown = event => { if (event.key === 'Enter') send(); };
    box.append(note, controls); return;
  }
  if (prompt) {
    box.append(actionPanelHeader('COMBATE', 'Acciones', 'Tirada pendiente'));
    if (prompt.stage === 'reaction') {
      const title = document.createElement('b'), note = document.createElement('p'), buttons = document.createElement('div'), accept = document.createElement('button'), decline = document.createElement('button');
      title.textContent = prompt.title; note.textContent = prompt.instruction; buttons.className = 'combat-basic-actions'; accept.className = 'primary'; accept.textContent = 'Atacar · gastar reacción'; decline.textContent = 'Dejar pasar';
      const respond = (choice: boolean) => { accept.disabled = true; decline.disabled = true; socket.emit('player:combat', { runtimeEpoch, type: 'combat:reaction', commandId: commandId(), sceneEpoch: lastSnapshot!.sceneEpoch, promptId: prompt.id, accept: choice }); };
      accept.onclick = () => respond(true); decline.onclick = () => respond(false); buttons.append(accept, decline); box.append(title, note, buttons); return;
    }
    const title = document.createElement('b'), note = document.createElement('p'), input = document.createElement('input'), submit = document.createElement('button'), controls = document.createElement('div');
    title.textContent = prompt.title; note.textContent = prompt.instruction; input.type = 'number'; input.min = String(prompt.minimum ?? 0); input.max = String(prompt.maximum ?? 200); input.placeholder = prompt.stage === 'attack' ? 'd20 natural (sin modificador)' : prompt.stage === 'death-save' ? 'd20 natural' : prompt.stage === 'damage' ? 'suma de dados (sin modificador)' : 'total'; submit.className = 'primary'; submit.textContent = prompt.stage === 'damage' ? 'Aplicar daño' : 'Confirmar dado';
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
    box.append(title, note, controls); return;
  }
  const targetParticipant = target ? lastSnapshot!.combat.participants.find(participant => participant.id === target.id && participant.active) : undefined;
  const meters = self && target ? Math.max(Math.abs(self.cell.col - target.cell.col), Math.abs(self.cell.row - target.cell.row)) * 1.5 : undefined;
  const armedAction = armedActionId ? combat.attacks.find(action => action.id === armedActionId) : undefined;
  const targetSummary = armedAction
    ? armedAction.targeting === 'point' ? `${armedAction.label} seleccionado · toca una casilla del mapa` : `${armedAction.label} seleccionado · toca una ficha objetivo`
    : armedBasicAction === 'help' ? 'Ayudar seleccionado · toca al enemigo que quieres distraer'
    : target && targetParticipant && meters !== undefined
    ? `${target.label} · CA ${targetParticipant.armorClass} · ${meters.toFixed(1)} m`
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
    const resource = action.resource ? combat.resources[action.resource.id] : undefined;
    const costKind = action.actionCost ?? 'action';
    const cost = costKind === 'reaction' ? 'Reacción' : costKind === 'bonus' ? 'Acción adicional' : 'Acción';
    const used = action.actionCost === 'reaction' ? combat.reactionUsed : action.actionCost === 'bonus' ? combat.bonusActionUsed : combat.actionUsed && !combat.ready;
    const range = action.range ? `${action.range.normalMeters}${action.range.longMeters ? `/${action.range.longMeters}` : ''} m` : 'sin alcance definido';
    const rangeBands = action.range?.longMeters && action.range.longMeters > action.range.normalMeters ? ` Verde hasta ${action.range.normalMeters} m; ámbar hasta ${action.range.longMeters} m con desventaja.` : action.range ? ` El mapa mostrará hasta ${action.range.normalMeters} m al seleccionarlo.` : '';
    const targetIsValid = action.targeting === 'point' || Boolean(targetParticipant && (action.resolution === 'guided' || targetParticipant.controller !== 'player'));
    const inRange = meters !== undefined && meters <= (action.range?.longMeters ?? action.range?.normalMeters ?? Infinity);
    const turnAllowsAction = combat.isTurn || action.actionCost === 'reaction' || combat.ready;
    const unavailableResource = Boolean(action.resource && (!resource || resource.current < action.resource.cost));
    const needsRecharge = Boolean(action.recharge && combat.recharge[action.id] === false);
    const button = document.createElement('button'), name = document.createElement('b'), row = document.createElement('div');
    button.className = `combat-action${armedActionId === action.id ? ' armed' : ''}`; button.setAttribute('aria-pressed', String(armedActionId === action.id)); name.textContent = compactActionLabel(action.label);
    const resolution = action.targeting === 'point'
      ? 'Elige una casilla del mapa; el DM coloca y resuelve el área.'
      : action.save
      ? `El objetivo tira salvación de ${action.save.ability.toUpperCase()}; debe obtener CD ${action.save.dc} o más.`
      : action.automaticHit ? 'Impacto automático; no hay CA que superar.'
      : action.resolution === 'guided' ? 'Efecto guiado: declara el objetivo y resuélvelo con el DM.'
      : targetParticipant ? `Tira d20 ${action.attackBonus >= 0 ? '+' : ''}${action.attackBonus} contra CA ${targetParticipant.armorClass}; impactas con un total igual o mayor.` : `Tira d20 ${action.attackBonus >= 0 ? '+' : ''}${action.attackBonus} contra la CA del objetivo.`;
    const damage = action.automaticHit ? 'impacto automático' : `${action.attackBonus >= 0 ? '+' : ''}${action.attackBonus} · ${action.damageDice}${action.damageBonus ? `${action.damageBonus >= 0 ? '+' : ''}${action.damageBonus}` : ''}${action.damageType ? ` ${action.damageType}` : ''}`;
    const tooltipText = `${cost} · ${damage} · Alcance ${range}.${rangeBands} ${resolution}${action.guidance ? ` ${action.guidance}` : ''}${resource ? ` ${resource.label}: ${resource.current}/${resource.max}.` : ''}`;
    button.append(name);
    button.disabled = used || !turnAllowsAction || unavailableResource || needsRecharge || Boolean(pendingCombatCommands.size);
    button.title = used ? 'Ya has usado este tipo de acción.' : unavailableResource ? 'No queda el recurso necesario.' : needsRecharge ? 'Esta acción debe recargarse.' : pendingCombatCommands.size ? 'Esperando confirmación de la acción anterior.' : tooltipText;
    button.onclick = () => selectCombatAction(action);
    const category = categoryFor(action), group = actionGroup(category); group.count++; group.summary.textContent = `${categoryTitles[category]} · ${group.count}`;
    if (armedActionId === action.id) { openCombatCategory = category; group.details.open = true; }
    const tooltip = actionTooltip(tooltipText); enableLongPressInfo(button, tooltip);
    row.className = 'action-choice'; row.append(button, tooltip); group.list.append(row);
  }

  const basics = document.createElement('details'), basicsTitle = document.createElement('summary'), basicsGrid = document.createElement('div'), rules = document.createElement('p');
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
  if (combat.conditions.includes('restringida') || combat.conditions.includes('apresada')) { const escape = document.createElement('button'); escape.textContent = 'Liberarse'; escape.disabled = combat.actionUsed || Boolean(pendingCombatCommands.size); escape.onclick = declareCombatEscape; appendBasicAction(escape, 'Liberarse: usa una acción para intentar escapar de estar apresado o restringido.'); }
  if (combat.isTurn) {
    const posture = document.createElement('button'), prone = combat.conditions.includes('derribada');
    posture.textContent = prone ? 'Levantarse' : 'Tirarse al suelo'; posture.disabled = Boolean(pendingCombatCommands.size) || Boolean(prone && (!combat.movement || combat.movement.remainingSquares <= 0));
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
    const button = document.createElement('button'); button.textContent = basicActionLabels[action]; button.disabled = combat.actionUsed || Boolean(pendingCombatCommands.size);
    button.classList.toggle('primary', armedBasicAction === action); button.setAttribute('aria-pressed', String(armedBasicAction === action));
    button.onclick = () => selectBasicCombatAction(action);
    appendBasicAction(button, basicActionHelp[action]);
  }
  if (combat.spellAttackBonus !== undefined || combat.spellSaveDc !== undefined) rules.textContent += ` Magia: ataque ${combat.spellAttackBonus !== undefined ? `${combat.spellAttackBonus >= 0 ? '+' : ''}${combat.spellAttackBonus}` : '—'} · CD ${combat.spellSaveDc ?? '—'}.`;
  if (armedBasicAction) { openCombatCategory = 'rules'; basics.open = true; }
  basics.append(basicsTitle, basicsGrid, rules); actionList.append(basics);
  box.append(actionList);
}

function renderExplorationControls() {
  const box = $('explorationMenu');
  const active = Boolean(privateState && lastSnapshot && !lastSnapshot.combat.active);
  box.hidden = !active || !actionsMenuOpen;
  renderActionToggle();
  updateAttackRangePreview();
  renderProximityButton();
  renderCampInteractions();
  if (!active || !privateState || !actionsMenuOpen) { if (!active) box.replaceChildren(); return; }
  box.replaceChildren();
  const selected = armedExplorationActionId
    ? privateState.explorationActions.find(action => action.id === armedExplorationActionId)?.label
    : armedExplorationAttackId ? privateState.explorationAttacks.find(action => action.id === armedExplorationAttackId)?.label
      : armedExplorationBasicActionId ? explorationBasicActionCatalogue[armedExplorationBasicActionId].label : undefined;
  const groups = document.createElement('div');
  groups.className = 'exploration-actions';
  box.append(actionPanelHeader('EXPLORACIÓN', 'Acciones', selected ? `${compactActionLabel(selected)} seleccionado` : 'Elige una acción'));
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
      const range = attack.range ? `${attack.range.normalMeters}${attack.range.longMeters ? `/${attack.range.longMeters}` : ''} m` : 'sin alcance definido';
      const damage = `${attack.attackBonus >= 0 ? '+' : ''}${attack.attackBonus} · ${attack.damageDice}${attack.damageBonus ? `${attack.damageBonus >= 0 ? '+' : ''}${attack.damageBonus}` : ''}${attack.damageType ? ` ${attack.damageType}` : ''}`;
      const description = `Inicia combate. Ataque ${damage}. Alcance ${range}. Toca al personaje, animal o monstruo objetivo.`;
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
      item.className = `exploration-action${isArmed ? ' armed' : ''}`; item.setAttribute('aria-pressed', String(isArmed)); name.textContent = action.label; item.append(name); item.title = `${action.guidance} Después, ${targetPrompt[id]}.`;
      item.onclick = () => {
        if (action.target === 'self') { armedExplorationBasicActionId = id; armedExplorationActionId = null; armedExplorationAttackId = null; useExplorationBasicAction(id); renderExplorationControls(); return; }
        armedExplorationBasicActionId = isArmed ? null : id; armedExplorationActionId = null; armedExplorationAttackId = null; renderExplorationControls();
        toast(armedExplorationBasicActionId ? `${action.label}: ${targetPrompt[id]}.` : 'Acción cancelada.');
      };
      const tooltip = actionTooltip(`${action.guidance} ${targetPrompt[id]}.`); enableLongPressInfo(item, tooltip);
      row.className = 'action-choice'; row.append(item, tooltip); list.append(row);
    }
  }
  box.append(groups);
  if (!cantrips.length && !spells.length && !privateState.explorationAttacks.length && !privateState.explorationBasics.length) { const empty = document.createElement('p'); empty.textContent = 'No tienes acciones disponibles fuera de combate.'; box.append(empty); }
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
  if (!privateState || lastSnapshot?.combat.active) { button.hidden = true; return; }
  const basic = armedExplorationBasicActionId ? explorationBasicActionCatalogue[armedExplorationBasicActionId] : undefined;
  const action = armedExplorationActionId ? privateState.explorationActions.find(candidate => candidate.id === armedExplorationActionId) : undefined;
  const attack = armedExplorationAttackId ? privateState.explorationAttacks.find(candidate => candidate.id === armedExplorationAttackId) : undefined;
  if (basic) {
    const target = basic.target === 'living' ? proximityTarget('living', Infinity) : basic.target === 'any' ? proximityTarget('any', Infinity) : null;
    button.hidden = basic.target === 'self' || basic.target === 'point'; button.disabled = !target;
    button.textContent = target ? `${basic.label} · ${target.label}` : basic.target === 'living' || basic.target === 'any' ? 'Acércate al objetivo' : basic.label;
    return;
  }
  const target = action && (action.target === 'object' || action.target === 'living' || action.target === 'any') ? proximityTarget(action.target, action.rangeMeters) : attack ? proximityTarget('living', attack.range?.longMeters ?? attack.range?.normalMeters ?? Infinity) : null;
  if (action || attack) {
    button.hidden = Boolean(action && (action.target === 'point' || action.target === 'self' || action.target === 'none')); button.disabled = !target;
    button.textContent = target ? `${action?.label ?? attack!.label} · ${target.label}` : 'Acércate al objetivo';
    return;
  }
  button.hidden = !privateState.interactionTargetId;
  button.textContent = privateState.canInteract ? (privateState.nearbyInteraction ?? 'INTERACTUAR').toUpperCase() : 'Acércate al objetivo';
  button.disabled = !privateState.canInteract;
}

function renderCampInteractions(state = privateState) {
  const panel = $('campInteractions'), list = $('campInteractionList');
  const nearby = state?.campInteractions ?? [];
  panel.hidden = !state?.characterId || !nearby.length || Boolean(lastSnapshot?.combat.active);
  if (panel.hidden) { list.replaceChildren(); return; }
  list.replaceChildren(...nearby.map(interaction => {
    const button = document.createElement('button'), label = document.createElement('b'), detail = document.createElement('small');
    button.type = 'button'; button.className = 'camp-player-action'; button.title = interaction.description;
    label.textContent = interaction.actionLabel; detail.textContent = interaction.description;
    button.append(label, detail);
    button.onclick = () => {
      if (!lastSnapshot || !privateState?.characterId) return;
      world.playTokenAnimation(privateState.characterId, 'interact');
      socket.emit('player:camp-interact', { runtimeEpoch, commandId: commandId(), sceneEpoch: lastSnapshot.sceneEpoch, pointId: interaction.pointId });
    };
    return button;
  }));
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
  selectedTargetId = target?.id ?? null;
  if (action && target) { declareCombatAction(action, target.id); return; }
  if (armedBasicAction === 'help' && target) {
    const enemy = snapshot.combat.participants.find(participant => participant.id === target.id && participant.active && participant.controller !== 'player');
    if (enemy) { useBasicCombatAction('help', enemy.id); return; }
    toast('Ayudar requiere elegir a un enemigo que esté junto a ti.'); return;
  }
  renderTargetMenu();
});

function changeOwnHp(sign: 1 | -1) {
  if (!lastSnapshot || !privateState?.combat) return;
  const amount = Math.max(1, Number(($('hpAmount') as HTMLInputElement).value) || 1);
  socket.emit('player:combat', { runtimeEpoch, type: 'combat:hp', commandId: commandId(), sceneEpoch: lastSnapshot.sceneEpoch, delta: sign * amount });
}
$('combatHp').onclick = () => { if (!privateState) return; $('hpDialogValue').textContent = `PG actuales: ${privateState.hp}/${privateState.maxHp}`; ($('hpDialog') as HTMLDialogElement).showModal(); };
$('closeHp').onclick = () => ($('hpDialog') as HTMLDialogElement).close();
$('takeDamage').onclick = () => changeOwnHp(-1);
$('healDamage').onclick = () => changeOwnHp(1);
$('combatSheet').onclick = () => { stop(); ($('characterSheet') as HTMLDialogElement).showModal(); };
$('endTurn').onclick = finishCombatTurn;

async function prepareSnapshot(snapshot: WorldSnapshot) {
  const installed = await world.applySnapshot(snapshot);
  if (installed) updatePlayerCameraControls(snapshot.sceneId);
  if (installed && socket.connected && readyEpoch !== snapshot.sceneEpoch && lastSnapshot?.sceneEpoch === snapshot.sceneEpoch) {
    readyEpoch = snapshot.sceneEpoch;
    socket.emit('scene:ready', { runtimeEpoch, sceneEpoch: snapshot.sceneEpoch });
  }
}

const cameraOrientationLabels = ['Vista inicial', '45° a la derecha', '90° a la derecha', '135° a la derecha', '180° · lado opuesto', '135° a la izquierda', '90° a la izquierda', '45° a la izquierda'];
function supportsCameraOrbit(sceneId = lastSnapshot?.sceneId) {
  const scene = campaign.scenes.find(candidate => candidate.id === sceneId);
  return scene?.renderer === 'babylon-hd2d' && Boolean(scene.terrain);
}
function supportsCameraZoom(sceneId = lastSnapshot?.sceneId) {
  return Boolean(campaign.scenes.find(candidate => candidate.id === sceneId));
}
function updatePlayerCameraControls(sceneId = lastSnapshot?.sceneId) {
  $('playerCameraControls').hidden = !supportsCameraOrbit(sceneId);
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
let cameraTouchGestureStartTilt = 30;
let cameraTouchGestureAxis: 'orbit' | 'tilt' | 'zoom' | null = null;
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
  cameraTouchGestureActive = false;
  cameraTouchGestureStartX = null;
  cameraTouchGestureStartY = null;
  cameraTouchGestureStartDistance = null;
  cameraTouchLastDistance = null;
  cameraTouchGestureAxis = null;
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
    cameraTouchGestureStartTilt = world.getCameraTiltDegrees();
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
    const center = cameraTouchCenter(), distance = cameraTouchDistance();
    const dx = center.x - (cameraTouchGestureStartX ?? center.x), dy = center.y - (cameraTouchGestureStartY ?? center.y);
    const pinchTravel = distance - (cameraTouchGestureStartDistance ?? distance);
    if (!cameraTouchGestureAxis && (Math.hypot(dx, dy) > 20 || Math.abs(pinchTravel) > 16)) {
      cameraTouchGestureAxis = Math.abs(pinchTravel) > 16 && Math.abs(pinchTravel) > Math.hypot(dx, dy) * .7
        ? 'zoom'
        : Math.abs(dx) >= Math.abs(dy) ? (supportsCameraOrbit() ? 'orbit' : null) : (supportsCameraOrbit() ? 'tilt' : null);
    }
    if (cameraTouchGestureAxis === 'tilt' && supportsCameraOrbit()) world.setCameraTiltDegrees(cameraTouchGestureStartTilt - dy * .32);
    if (cameraTouchGestureAxis === 'zoom' && cameraTouchLastDistance && distance > 0) world.zoomCameraBy(distance / cameraTouchLastDistance);
    cameraTouchLastDistance = distance;
  }
}, { capture: true, passive: false });

addEventListener('pointerup', event => {
  const point = cameraTouchPointers.get(event.pointerId);
  if (!point) return;
  point.x = event.clientX; point.y = event.clientY;
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

function initializeJoystick() {
  if (joystickManager) return;
  // NippleJS debe medir la zona una vez visible. Si se crea dentro de #hud[hidden],
  // conserva un centro (0,0) hasta el siguiente resize y queda desplazado en portrait.
  joystickManager = nipplejs.create({
    zone: $('joystick'), mode: 'static', position: { left: '50%', top: '50%' },
    size: 110, color: 'white', restOpacity: 0.35
  });
  joystickManager.on('move', (_event, data) => {
    stick = { x: data.vector?.x ?? 0, up: data.vector?.y ?? 0 };
    send();
  });
  joystickManager.on('end', () => { stick = { x: 0, up: 0 }; stop(); });
}

const movementKeys = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']);
addEventListener('keydown', event => {
  if (event.target instanceof Element && event.target.matches('input,textarea,select')) return;
  if (($('inventory') as HTMLDialogElement).open) return;
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
    if (firstPress) send();
  }
});

$('playerCameraLeft').onclick = () => rotatePlayerCamera(-1);
$('playerCameraRight').onclick = () => rotatePlayerCamera(1);
$('playerCameraReset').onclick = resetPlayerCamera;
addEventListener('keyup', event => {
  const key = event.key.toLowerCase();
  if (!movementKeys.has(key)) return;
  keys.delete(key);
  if (!keys.size) stop(); else send();
});

function vector() {
  let x = stick.x;
  let up = stick.up;
  if (keys.size) {
    x = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
    up = (keys.has('w') || keys.has('arrowup') ? 1 : 0) - (keys.has('s') || keys.has('arrowdown') ? 1 : 0);
  }
  return world.screenVectorToWorld(x, up);
}

function send(end = false) {
  if (!socket.connected || !lastSnapshot || !privateState?.characterId || readyEpoch !== lastSnapshot.sceneEpoch) return;
  if (!end && !privateState.sceneMovementEnabled) return;
  if (!end && (document.hidden || ($('inventory') as HTMLDialogElement).open)) return;
  const next = vector();
  if (!end && Math.hypot(next.x, next.z) < 0.2) return;
  socket.emit('input:move', { runtimeEpoch, seq: seq++, sceneEpoch: lastSnapshot.sceneEpoch, x: end ? 0 : next.x, z: end ? 0 : next.z, end });
}

function stop() {
  stick = { x: 0, up: 0 };
  keys.clear();
  send(true);
}
setInterval(() => send(), 80);
addEventListener('blur', stop);
addEventListener('pagehide', stop);
document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
const actionToggle = $('actionToggle');
for (const eventName of ['pointerdown', 'pointerup', 'click'] as const) actionToggle.addEventListener(eventName, event => event.stopPropagation());
// The map listens directly on its canvas. Keep taps made in either action tray
// entirely inside the tray, including the delayed click generated by a phone.
for (const panelId of ['targetMenu', 'explorationMenu'] as const) {
  const panel = $(panelId);
  for (const eventName of ['pointerdown', 'pointerup', 'pointercancel', 'click', 'contextmenu'] as const) panel.addEventListener(eventName, event => event.stopPropagation());
}
actionToggle.onclick = () => {
  actionsMenuOpen = !actionsMenuOpen; renderedTargetMenuKey = '';
  renderActionToggle(); renderTargetMenu(); renderExplorationControls();
};
$('interact').onclick = () => {
  const basic = armedExplorationBasicActionId ? explorationBasicActionCatalogue[armedExplorationBasicActionId] : undefined;
  const action = armedExplorationActionId ? privateState?.explorationActions.find(candidate => candidate.id === armedExplorationActionId) : undefined;
  const attack = armedExplorationAttackId ? privateState?.explorationAttacks.find(candidate => candidate.id === armedExplorationAttackId) : undefined;
  const target = basic?.target === 'living' ? proximityTarget('living', Infinity) : basic?.target === 'any' ? proximityTarget('any', Infinity)
    : action && (action.target === 'object' || action.target === 'living' || action.target === 'any') ? proximityTarget(action.target, action.rangeMeters) : attack ? proximityTarget('living', attack.range?.longMeters ?? attack.range?.normalMeters ?? Infinity) : null;
  if (basic && target && armedExplorationBasicActionId) { useExplorationBasicAction(armedExplorationBasicActionId, target.id); return; }
  if (target && useExplorationAction(target.id)) return;
  if (privateState?.interactionTargetId) interactWith(privateState.interactionTargetId);
};
$('campInteractionList').addEventListener('click', event => event.stopPropagation());
$('campInteractions').addEventListener('pointerdown', event => event.stopPropagation());
$('inventoryButton').onclick = () => {
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
$('sheetButton').onclick = () => { stop(); setSheetEditing(false); ($('characterSheet') as HTMLDialogElement).showModal(); };
$('closeSheet').onclick = () => ($('characterSheet') as HTMLDialogElement).close();
$('summarySheet').onclick = () => { sheetView = 'summary'; if (privateState) renderSheet(privateState); };
$('fullSheet').onclick = () => { sheetView = 'full'; if (privateState) renderSheet(privateState); };
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
function setSheetEditing(editing: boolean) {
  const sheet = privateState?.sheet; $('sheetReadOnly').hidden = editing; $('sheetEditor').hidden = !editing; $('editSheet').hidden = editing;
  if (!editing || !sheet) return;
  ($('editSheetLevel') as HTMLInputElement).value = String(sheet.level); ($('editSheetBackground') as HTMLInputElement).value = sheet.background;
  ($('editSheetArmorClass') as HTMLInputElement).value = String(sheet.armorClass); ($('editSheetSpeed') as HTMLInputElement).value = String(sheet.speedMeters);
  ($('editSheetFeatures') as HTMLTextAreaElement).value = sheet.features.join('\n'); ($('editSheetAttacks') as HTMLTextAreaElement).value = sheet.attacks.join('\n');
  ($('editSheetSpells') as HTMLTextAreaElement).value = sheet.spells.join('\n'); ($('editSheetDetails') as HTMLTextAreaElement).value = detailsToText(sheet.details);
}
function saveSheet() {
  if (!privateState?.sheet) return;
  const sheet = { level: Number(($('editSheetLevel') as HTMLInputElement).value), background: ($('editSheetBackground') as HTMLInputElement).value.trim(), armorClass: Number(($('editSheetArmorClass') as HTMLInputElement).value), speedMeters: Number(($('editSheetSpeed') as HTMLInputElement).value), features: sheetLines('editSheetFeatures'), attacks: sheetLines('editSheetAttacks'), spells: sheetLines('editSheetSpells'), details: textToDetails(($('editSheetDetails') as HTMLTextAreaElement).value) };
  if (!Number.isInteger(sheet.level) || sheet.level < 1 || !sheet.background || !Number.isInteger(sheet.armorClass) || sheet.armorClass < 1 || !Number.isFinite(sheet.speedMeters) || sheet.speedMeters <= 0) return toast('Revisa nivel, trasfondo, CA y velocidad.');
  socket.emit('player:sheet', { runtimeEpoch, commandId: commandId(), sheet }); setSheetEditing(false); toast('Guardando ficha…');
}

socket.connect();

function renderSheet(next: PlayerPrivate) {
  const sheet = next.sheet;
  $('sheetName').textContent = next.label ? `Hoja · ${next.label}` : 'Hoja de personaje';
  $('sheetSummary').textContent = sheet ? `${sheet.background} · nivel ${sheet.level}${sheetView === 'full' ? ' · vista completa' : ' · resumen de aventura'}` : 'La hoja aún no tiene datos de campaña.';
  $('summarySheet').classList.toggle('primary', sheetView === 'summary'); $('fullSheet').classList.toggle('primary', sheetView === 'full');
  const stats = $('sheetStats'); stats.replaceChildren();
  const field = (label: string, value: string) => { const box = document.createElement('div'), title = document.createElement('b'), detail = document.createElement('span'); title.textContent = label; detail.textContent = value; box.append(title, detail); return box; };
  stats.append(field('PG', `${next.hp ?? '—'} / ${next.maxHp ?? '—'}`));
  document.getElementById('activeStates')?.remove(); document.getElementById('stateLegend')?.remove();
  const states = next.conditions;
  const icons: Record<string, string> = { envenenada: '🟢', apresada: '🟣', agarrada: '🔵', derribada: '🟠', asustada: '🟡', hechizada: '💛', paralizada: '🧊', inconsciente: '⚫', oculta: '⚪', invisible: '✨', restringida: '🟣' };
  const descriptions: Record<string, string> = { envenenada: 'Desventaja en ataques y pruebas de característica.', apresada: 'Velocidad: 0 · ataques con desventaja · ataques contra ti con ventaja. Liberarse: acción → Atletismo o Acrobacias CD 11.', agarrada: 'Velocidad: 0.', derribada: 'Levántate gastando movimiento; ataques propios con desventaja.', asustada: 'No puedes acercarte voluntariamente a la fuente; Valiente da ventaja en la salvación.', hechizada: 'No puedes atacar al origen del encanto; el DM guía el canto y su duración.', paralizada: 'No puedes moverte ni actuar; fallas automáticamente salvaciones de Fuerza y Destreza. Ataques contra ti con ventaja; impacto cercano crítico.', inconsciente: 'Velocidad: 0 · no puedes actuar. Realiza salvaciones contra muerte físicas.', oculta: 'Silueta discreta; la visibilidad depende del DM.', invisible: 'Los ataques contra ti tienen desventaja y el tuyo tiene ventaja. Atacar revela tu posición.', restringida: 'Velocidad: 0.' };
  if (states.length) { const section = document.createElement('section'); section.id = 'activeStates'; const title = document.createElement('h3'); title.textContent = 'Estados activos'; section.append(title, ...states.map(state => { const item = document.createElement('p'), source = next.conditionSources.find(candidate => candidate.condition === state); const origin = source?.sourceLabel ?? source?.sourceAbility ?? source?.sourceId; const duration = source?.durationRounds !== undefined ? `\nDuración: ${source.durationRounds} rondas` : ''; item.textContent = `${icons[state] ?? '●'} ${state.toUpperCase()}${origin ? `\nOrigen: ${origin}` : ''}${duration}\n${descriptions[state] ?? ''}`; return item; })); stats.after(section); }
  const legend = document.createElement('details'); legend.id = 'stateLegend'; const summary = document.createElement('summary'); summary.textContent = 'Leyenda de estados'; const legendText = document.createElement('p'); legendText.textContent = '🟢 Envenenada · 🟣 Apresada · 🔵 Agarrada · 🟠 Derribada · 🟡 Asustada · ⚫ Inconsciente · ⚪ Oculta · ✨ Invisible'; legend.append(summary, legendText); (document.getElementById('activeStates') ?? stats).after(legend);
  document.getElementById('sheetDetails')?.replaceChildren();
  if (sheet) {
    stats.append(field('CA', String(sheet.armorClass)), field('Velocidad', `${sheet.speedMeters} m`));
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
