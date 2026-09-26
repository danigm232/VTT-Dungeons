import { Application, Assets, Container, Graphics, Rectangle, Sprite, Texture } from 'pixi.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Engine as BabylonEngine } from '@babylonjs/core/Engines/engine.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Texture as BabylonTexture } from '@babylonjs/core/Materials/Textures/texture.js';
import { Scene as BabylonScene } from '@babylonjs/core/scene.js';
import { PROTOCOL_VERSION } from '../../engine/shared/protocol';
import type { AttackAnimationType, Cell, CombatCondition, CombatEvent, DmObject, Facing, PublicEntity, PublicProp, WorldSnapshot } from '../../engine/shared/protocol';
import type { PublicCampaignDefinition, PublicSceneDefinition, VisualAsset } from '../../engine/shared/campaign';
import { footprintFor } from '../../engine/shared/geometry';
import { surfaceHeight, surfaceNeighbors, terrainTile } from '../../engine/shared/terrain';
import { buildTerrain3D, type Terrain3DView } from '../../engine/client/terrain3d';
import { buildShipPropVisual, shipPropVisualKey } from '../../engine/client/ship-props3d';
import { shipAmbientLightIntensity, shipWeatherLighting, shipWindStreaks } from '../../engine/client/ship-ambience';
import { campTerrainHardwareScalingLevel } from '../../engine/client/camp-render-quality';
import { createDragonRestVisuals } from '../../campaigns/stormwreck-isle/public/retreat-geometry.js';
import type { CampVisuals } from '../../campaigns/camp-rests/public/visuals.js';
import { combatCameraFrame } from '../../engine/client/combat-camera';
import { screenVectorToWorld as orientedScreenVectorToWorld } from '../../engine/client/camera-movement';
import { hasWreckProjection, nearestWreckCell, projectWreckPoint } from './wreck-projection';

type TokenView = { root: Container; ring: Graphics; sprite: Sprite; conditionVfx: Sprite; conditionIcon: Sprite; effects: Graphics; health: Graphics; states: Graphics; entity: PublicEntity; phase: number; animationState: string | null; animationStartedAt: number; animationUntil: number; frameUrl: string | null; conditionVfxUrl: string | null; conditionIconUrl: string | null };
type MapObject = PublicProp | DmObject;
type PropView = { root: Container; sprite: Sprite | null; variantUrl: string | null };
type WorldRendererOptions = { showGrid?: boolean; showReachable?: boolean; persistCameraPreferences?: boolean; showStairMarker?: boolean };
const TERRAIN_CAMERA_INITIAL_ALPHA = -Math.PI / 4;
const CAMERA_ORIENTATION_STEP = Math.PI / 4;
const CAMERA_ORIENTATION_COUNT = 8;
const CAMERA_ZOOM_MIN = 0.4;
const CAMERA_ZOOM_MAX = 8;
const CAMERA_TILT_MIN_DEGREES = 20;
const CAMERA_TILT_MAX_DEGREES = 65;
const clampCameraTilt = (degrees: number) => Math.max(CAMERA_TILT_MIN_DEGREES, Math.min(CAMERA_TILT_MAX_DEGREES, degrees));
const normalizeCameraOrientation = (step: number) => ((Math.trunc(step) % CAMERA_ORIENTATION_COUNT) + CAMERA_ORIENTATION_COUNT) % CAMERA_ORIENTATION_COUNT;
const facingDirections: Facing[] = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
const facingSuffix: Record<Facing, string> = { north: 'n', 'north-east': 'ne', east: 'e', 'south-east': 'se', south: 's', 'south-west': 'sw', west: 'w', 'north-west': 'nw' };

const conditionArtRoot = '/art/tokens/Condiciones universales D&D Stormwreck';
const conditionArt: Record<string, { icon: string; vfx: string }> = {
  agarrada: { icon: `${conditionArtRoot}/cond_01_agarrado_icon.png`, vfx: `${conditionArtRoot}/cond_01_agarrado_vfx.png` },
  apresada: { icon: `${conditionArtRoot}/cond_02_apresado_icon.png`, vfx: `${conditionArtRoot}/cond_02_apresado_vfx.png` },
  asustada: { icon: `${conditionArtRoot}/cond_03_asustado_icon.png`, vfx: `${conditionArtRoot}/cond_03_asustado_vfx.png` },
  derribada: { icon: `${conditionArtRoot}/cond_07_derribado_icon.png`, vfx: `${conditionArtRoot}/cond_07_derribado_vfx.png` },
  envenenada: { icon: `${conditionArtRoot}/cond_09_envenenado_icon.png`, vfx: `${conditionArtRoot}/cond_09_envenenado_vfx.png` },
  inconsciente: { icon: `${conditionArtRoot}/cond_12_inconsciente_icon.png`, vfx: `${conditionArtRoot}/cond_12_inconsciente_vfx.png` },
  invisible: { icon: `${conditionArtRoot}/cond_13_invisible_icon.png`, vfx: `${conditionArtRoot}/cond_13_invisible_vfx.png` },
  hechizada: { icon: `${conditionArtRoot}/cond_10_hechizado_icon.png`, vfx: `${conditionArtRoot}/cond_10_hechizado_vfx.png` },
  paralizada: { icon: `${conditionArtRoot}/cond_14_paralizado_icon.png`, vfx: `${conditionArtRoot}/cond_14_paralizado_vfx.png` }
};
const conditionPriority: CombatCondition[] = ['inconsciente', 'paralizada', 'hechizada', 'invisible', 'apresada', 'agarrada', 'derribada', 'asustada', 'envenenada'];

export class WorldRenderer {
  readonly ready: Promise<void>;
  private app = new Application();
  private map = new Container();
  private background = new Sprite(Texture.EMPTY);
  private effects = new Container();
  private grid = new Graphics();
  private dynamic = new Container();
  private editor = new Container();
  private selection = new Graphics();
  private reachable = new Graphics();
  private attackRange = new Graphics();
  private preview = new Container();
  private previewCells = new Graphics();
  private previewSprite = new Sprite(Texture.EMPTY);
  private tokenViews = new Map<string, TokenView>();
  private croppedTokenFrames = new Map<string, Texture>();
  private propViews = new Map<string, PropView>();
  private pickupViews = new Map<string, Container>();
  private snapshot: WorldSnapshot | null = null;
  private sceneId: string | null = null;
  private localId: string | null = null;
  private selectedEntityId: string | null = null;
  private clockOffset = 0;
  private storm = new Graphics();
  private waves = new Graphics();
  private waterShimmer = new Graphics();
  private boatWake = new Graphics();
  private wind = new Graphics();
  private rain = new Graphics();
  private rainNear = new Graphics();
  private resizeObserver: ResizeObserver;
  private resizeFrame = 0;
  private cameraCurrent = { x: 0, y: 0, scale: 1 };
  private cameraInitialized = false;
  private cameraZoom = 1;
  private cameraBaseZoom = 1;
  private cameraOffset = { x: 0, y: 0 };
  private terrainCameraOffset = { x: 0, y: 0, z: 0 };
  private cameraFocusScreenPoint: { x: number; y: number } | null = null;
  private cameraFocusWorldPoint: { x: number; y: number; z: number } | null = null;
  private cameraTiltDegrees = 30;
  private requestGeneration = 0;
  private connectionGeneration = 0;
  private accepted = { epoch: -1, revision: -1 };
  private mapClick: ((cell: Cell) => void) | null = null;
  private previewGeneration = 0;
  private lastCombatEventId: string | null = null;
  private attackRangePreview: { originId: string; normalMeters: number; longMeters: number } | null = null;
  private initialized = false;
  private terrainCanvas: HTMLCanvasElement | null = null;
  private terrainEngine: BabylonEngine | null = null;
  private terrainScene: BabylonScene | null = null;
  private terrainView: Terrain3DView | null = null;
  private retreatVisuals: ReturnType<typeof createDragonRestVisuals> | null = null;
  private campVisuals: CampVisuals | null = null;
  private campVisualGeneration = 0;
  private campInteractionHighlights = false;
  private terrainProps = new Map<string, TransformNode>();
  private shipPropWoodTexture: BabylonTexture | null = null;
  private terrainCameraInitialized = false;
  private stairMarker: HTMLDivElement | null = null;
  private stairPin: HTMLDivElement | null = null;
  private cameraOrientationStep = 0;
  private cameraOrientationInitialized = false;
  private sharedCameraOrientations = new Map<string, number>();
  private selectedObject: DmObject | null = null;
  private previewObject: DmObject | null = null;
  private previewValid = true;

  constructor(private host: HTMLElement, private campaign: PublicCampaignDefinition, private options: WorldRendererOptions = {}) {
    this.ready = this.initialize();
    // El tamaño del canvas debe actualizarse después de que el navegador haya
    // terminado de resolver el grid/flex de las ventanas del DM. Hacerlo en el
    // propio ResizeObserver podía usar una resolución de canvas anterior.
    this.resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(this.resizeFrame);
      this.resizeFrame = requestAnimationFrame(() => this.refreshLayout());
    });
    this.resizeObserver.observe(host);
  }

  private get scene(): PublicSceneDefinition | null { return this.campaign.scenes.find(scene => scene.id === this.sceneId) ?? null; }

  private async initialize() {
    await this.app.init({ resizeTo: this.host, antialias: false, autoDensity: true, resolution: Math.min(devicePixelRatio, 2), background: '#06151c', backgroundAlpha: 0, preference: 'webgl' });
    this.initialized = true;
    this.app.canvas.className = 'world';
    this.app.canvas.setAttribute('aria-label', 'Mapa táctico de la campaña');
    this.host.style.position ||= 'relative';
    this.app.canvas.style.position = 'absolute'; this.app.canvas.style.inset = '0'; this.app.canvas.style.zIndex = '2';
    this.app.canvas.style.touchAction = 'none';
    this.host.appendChild(this.app.canvas);
    const stairMarker = document.createElement('div');
    stairMarker.setAttribute('aria-label', 'Acceso a la cubierta inferior');
    stairMarker.style.cssText = 'position:absolute;left:0;top:0;z-index:3;pointer-events:none;display:none;padding:5px 10px;border:2px solid #e5ba69;border-radius:7px;background:#142a30ed;color:#ffe3a6;font:700 16px Arial,sans-serif;white-space:nowrap;box-shadow:0 3px 12px #000b';
    this.host.appendChild(stairMarker);
    this.stairMarker = stairMarker;
    const stairPin = document.createElement('div');
    stairPin.style.cssText = 'position:absolute;left:0;top:0;z-index:3;pointer-events:none;display:none;width:24px;height:24px;border:3px solid #ffe3a6;border-radius:50%;background:#142a3055;box-shadow:0 0 0 3px #10252a,0 0 18px #ffe3a6';
    this.host.appendChild(stairPin);
    this.stairPin = stairPin;
    this.app.canvas.addEventListener('wheel', event => this.zoomAtPointer(event), { passive: false });
    this.map.sortableChildren = true; this.dynamic.sortableChildren = true;
    this.background.zIndex = 0; this.effects.zIndex = 5; this.grid.zIndex = 10; this.dynamic.zIndex = 20; this.editor.zIndex = 30;
    this.map.addChild(this.background, this.effects, this.grid, this.dynamic, this.editor);
    this.preview.addChild(this.previewSprite, this.previewCells); this.previewSprite.visible = false; this.previewSprite.alpha = 0.68;
    this.effects.addChild(this.waves, this.waterShimmer, this.boatWake, this.wind, this.storm, this.rain, this.rainNear); this.editor.addChild(this.reachable, this.attackRange, this.selection, this.preview); this.app.stage.addChild(this.map);
    const activeTouchPointers = new Set<number>();
    let touchGestureActive = false;
    let pendingTouchTap: { pointerId: number; cell: Cell | null; x: number; y: number; moved: boolean } | null = null;
    const cellAtPointer = (clientX: number, clientY: number): Cell | null => {
      if (!this.mapClick || !this.scene) return null;
      const rect = this.app.canvas.getBoundingClientRect();
      const global = { x: (clientX - rect.left) * this.app.screen.width / rect.width, y: (clientY - rect.top) * this.app.screen.height / rect.height };
      if (this.terrainScene && this.terrainView) return this.terrainCellAt(global);
      const local = this.map.toLocal(global), grid = this.scene.grid;
      const projected = this.sceneId && hasWreckProjection(this.sceneId)
        ? nearestWreckCell(this.sceneId, local, this.projectedCells(), grid.width, grid.height) : null;
      if (this.sceneId && hasWreckProjection(this.sceneId) && !projected) return null;
      const cell = projected ?? { col: Math.floor((local.x - grid.originX) / grid.tileSize), row: Math.floor((local.y - grid.originY) / grid.tileSize) };
      return cell.col >= 0 && cell.row >= 0 && cell.col < grid.cols && cell.row < grid.rows ? cell : null;
    };
    this.app.canvas.addEventListener('pointerdown', event => {
      if (event.pointerType === 'touch') {
        if (!this.mapClick || !this.scene) return;
        if (!activeTouchPointers.size) { touchGestureActive = false; pendingTouchTap = null; }
        activeTouchPointers.add(event.pointerId);
        if (activeTouchPointers.size > 1) { touchGestureActive = true; pendingTouchTap = null; return; }
        pendingTouchTap = { pointerId: event.pointerId, cell: cellAtPointer(event.clientX, event.clientY), x: event.clientX, y: event.clientY, moved: false };
        return;
      }
      const cell = cellAtPointer(event.clientX, event.clientY);
      if (cell) this.mapClick?.(cell);
    });
    this.app.canvas.addEventListener('pointermove', event => {
      if (event.pointerType !== 'touch' || !activeTouchPointers.has(event.pointerId) || !pendingTouchTap || pendingTouchTap.pointerId !== event.pointerId) return;
      if (Math.hypot(event.clientX - pendingTouchTap.x, event.clientY - pendingTouchTap.y) > 12) pendingTouchTap.moved = true;
    });
    this.app.canvas.addEventListener('pointerup', event => {
      if (event.pointerType !== 'touch' || !activeTouchPointers.has(event.pointerId)) return;
      activeTouchPointers.delete(event.pointerId);
      if (!touchGestureActive && pendingTouchTap?.pointerId === event.pointerId && !pendingTouchTap.moved && pendingTouchTap.cell) this.mapClick?.(pendingTouchTap.cell);
      if (!activeTouchPointers.size) { touchGestureActive = false; pendingTouchTap = null; }
    });
    this.app.canvas.addEventListener('pointercancel', event => {
      if (event.pointerType !== 'touch') return;
      activeTouchPointers.delete(event.pointerId);
      pendingTouchTap = null;
      if (!activeTouchPointers.size) touchGestureActive = false;
    });
    this.app.ticker.add(ticker => this.animate(ticker.deltaMS));
  }

  setLocalPlayer(id: string | null) { this.localId = id; }
  /** DM-only selection; clients can use it too without changing game state. */
  setSelectedEntity(id: string | null) { this.selectedEntityId = id; }
  /** Remembers a DM-selected map location as the zoom anchor without moving game pieces. */
  setCameraFocusCell(cell: Cell | null, surfaceId = this.scene?.surfaceId) {
    if (!cell || !this.scene) {
      this.cameraFocusScreenPoint = null; this.cameraFocusWorldPoint = null;
      return;
    }
    this.cameraFocusScreenPoint = this.cellToPixel(cell, surfaceId);
    const terrain = this.scene.terrain;
    if (terrain) {
      const address = { surfaceId: surfaceId ?? this.scene.surfaceId, cell };
      const height = terrainTile(terrain, address) ? surfaceHeight(terrain, address) : 0;
      this.cameraFocusWorldPoint = { x: (cell.col + .5) * terrain.tileMeters, y: height, z: (cell.row + .5) * terrain.tileMeters };
      if (this.cameraZoom > this.cameraBaseZoom + .01 && this.snapshot?.camera.mode === 'fixed') {
        this.focusTerrainZoomOnTarget(); this.updateCamera(0);
      }
    }
  }
  setMapClick(handler: ((cell: Cell) => void) | null) { this.mapClick = handler; }
  /** Visual-only toggle; terrain navigation and collision data remain installed. */
  setGridVisible(visible: boolean) { this.options.showGrid = visible; this.drawGrid(); }
  setCampInteractionHighlights(enabled: boolean) {
    this.campInteractionHighlights = Boolean(enabled && this.scene?.camp);
    this.campVisuals?.setInteractionHighlights(this.campInteractionHighlights);
  }
  /** Refit immediately after a DM workspace window is resized, restored, or revealed. */
  refreshLayout() {
    const width = this.host.clientWidth, height = this.host.clientHeight;
    if (!this.initialized || !width || !height) return;
    this.app.renderer.resize(width, height); this.terrainEngine?.resize(); this.cameraInitialized = false; this.updateCamera(0);
    if (this.terrainView) { this.drawReachable(); this.drawAttackRange(); }
  }
  resetConnection() { this.connectionGeneration++; this.requestGeneration++; this.accepted = { epoch: -1, revision: -1 }; this.lastCombatEventId = null; this.sharedCameraOrientations.clear(); }

  async applySnapshot(snapshot: WorldSnapshot): Promise<boolean> {
    if (snapshot.v !== PROTOCOL_VERSION) return false;
    Object.assign(this.campaign.tokens, snapshot.tokenAssets.tokens);
    Object.assign(this.campaign.tokenAnimations, snapshot.tokenAssets.tokenAnimations);
    if (this.sceneId !== snapshot.sceneId) { this.cameraZoom = 1; this.cameraBaseZoom = 1; this.cameraOffset = { x: 0, y: 0 }; this.terrainCameraOffset = { x: 0, y: 0, z: 0 }; this.cameraFocusScreenPoint = null; this.cameraFocusWorldPoint = null; this.cameraInitialized = false; }
    const knownScene = this.campaign.scenes.findIndex(scene => scene.id === snapshot.scene.id);
    if (knownScene >= 0) this.campaign.scenes[knownScene] = snapshot.scene;
    else this.campaign.scenes.push(snapshot.scene);
    const connection = this.connectionGeneration, request = ++this.requestGeneration;
    await this.ready;
    if (connection !== this.connectionGeneration || request !== this.requestGeneration) return false;
    if (snapshot.sceneEpoch < this.accepted.epoch || (snapshot.sceneEpoch === this.accepted.epoch && snapshot.revision < this.accepted.revision)) return false;
    if (!await this.installScene(snapshot.sceneId, connection, request)) return false;
    if (connection !== this.connectionGeneration || request !== this.requestGeneration) return false;
    const tokenUrls = [...new Set(snapshot.entities.flatMap(entity => {
      const base = this.campaign.tokens[entity.tokenId]?.url;
      return [...(base ? [base] : []), ...this.tokenFrameUrls(entity.tokenId)];
    }))];
    const conditionUrls = Object.values(conditionArt).flatMap(art => [art.icon, art.vfx]);
    await Promise.all([...tokenUrls, ...conditionUrls].map(url => Assets.load<Texture>(url)));
    if (connection !== this.connectionGeneration || request !== this.requestGeneration) return false;
    // Entrar o salir de combate cambia de seguimiento individual a plano
    // táctico; se encuadra de inmediato, sin dejar que una interpolación
    // oculte enemigos durante varios fotogramas.
    if (this.snapshot?.combat.active !== snapshot.combat.active) this.cameraInitialized = false;
    this.snapshot = snapshot; this.accepted = { epoch: snapshot.sceneEpoch, revision: snapshot.revision }; this.clockOffset = Date.now() - snapshot.serverTime;
    // Keep following the moving character in the animation loop. Snapping the
    // Babylon camera on every network snapshot made each 220 ms step jerk.
    if (this.terrainView && !this.terrainCameraInitialized) this.updateCamera(0);
    this.drawReachable(); this.drawAttackRange();
    for (const entity of snapshot.entities) this.upsertEntity(entity);
    const event = snapshot.combat.lastEvent;
    if (event?.id && event.id !== this.lastCombatEventId) { this.lastCombatEventId = event.id; this.playCombatTokenAnimation(event); }
    else if (!event) this.lastCombatEventId = null;
    for (const [id, view] of this.tokenViews) if (!snapshot.entities.some(entity => entity.id === id)) { view.root.destroy({ children: true }); this.tokenViews.delete(id); }
    await this.renderProps(snapshot.props, connection, request);
    if (connection !== this.connectionGeneration || request !== this.requestGeneration) return false;
    this.renderPickups(snapshot);
    this.storm.visible = snapshot.environment.storm; this.rain.visible = snapshot.environment.storm; this.rainNear.visible = snapshot.environment.storm;
    if (!this.terrainView) this.updateCamera();
    return true;
  }

  getCameraOrientationStep() { return this.cameraOrientationStep; }
  getCameraTiltDegrees() { return Math.round(this.cameraTiltDegrees); }
  setCameraTiltDegrees(degrees: number) {
    if (!Number.isFinite(degrees) || !this.terrainView) return;
    this.cameraTiltDegrees = clampCameraTilt(degrees);
    if (this.options.persistCameraPreferences && this.sceneId) localStorage.setItem(this.cameraTiltPreferenceKey(this.sceneId), String(this.cameraTiltDegrees));
  }
  zoomCameraBy(factor: number) {
    if (!Number.isFinite(factor) || factor <= 0 || !this.snapshot || !this.scene) return;
    const nextZoom = Math.max(CAMERA_ZOOM_MIN, Math.min(CAMERA_ZOOM_MAX, this.cameraZoom * factor));
    if (Math.abs(nextZoom - this.cameraZoom) < 0.001) return;
    if (this.terrainView) {
      this.cameraZoom = nextZoom;
      this.focusTerrainZoomOnTarget();
      this.updateCamera(0); this.drawReachable(); this.drawAttackRange();
      return;
    }
    const anchor = this.flatZoomAnchor();
    this.applyFlatZoom(nextZoom, anchor?.x ?? 0, anchor?.y ?? 0);
  }
  rotateCameraOrientation(delta: number) { this.setCameraOrientation(this.cameraOrientationStep + delta); }
  resetCameraOrientation() { this.setCameraOrientation(0); }
  setCameraOrientation(step: number, persist = this.options.persistCameraPreferences === true) {
    if (!Number.isInteger(step)) return;
    this.cameraOrientationStep = normalizeCameraOrientation(step);
    if (persist && this.sceneId) this.saveCameraOrientation(this.sceneId, this.cameraOrientationStep);
  }
  setSharedCameraOrientation(sceneId: string, step: number) {
    if (!Number.isInteger(step)) return;
    const normalized = normalizeCameraOrientation(step);
    this.sharedCameraOrientations.set(sceneId, normalized);
    if (sceneId === this.sceneId && !this.options.persistCameraPreferences) this.setCameraOrientation(normalized, false);
  }
  clearSharedCameraOrientations() { this.sharedCameraOrientations.clear(); }
  showSelection(object: DmObject | null) { this.selectedObject = object; this.drawSelection(); }
  /** Shows the legal distance bands for an armed attack without deciding a target. */
  showAttackRange(originId: string, normalMeters: number, longMeters?: number) {
    this.attackRangePreview = { originId, normalMeters: Math.max(0, normalMeters), longMeters: Math.max(normalMeters, longMeters ?? normalMeters) };
    this.drawAttackRange();
  }
  clearAttackRange() { this.attackRangePreview = null; this.attackRange.clear(); }
  private entityScreenPosition(entityId: string, fallback: { x: number; y: number }) {
    const position = this.tokenViews.get(entityId)?.root.position;
    return position ? { x: position.x, y: position.y } : fallback;
  }
  playRangedAttack(attackerId: string, targetId: string, type: AttackAnimationType, hit: boolean, frozen = false, sneakAttack = false) {
    const attacker = this.tokenViews.get(attackerId), target = this.tokenViews.get(targetId); if (!attacker || !target) return;
    if (hit && sneakAttack) this.playSneakAttackEffect(targetId);
    const actorAnimation = type === 'arrow' || type === 'radiantArrow' ? 'attack-arrow' : type === 'thrownWeapon' ? 'attack-throw' : type === 'melee' ? 'attack' : 'spell';
    this.playTokenAnimation(attackerId, actorAnimation, type === 'arrow' || type === 'radiantArrow' ? 850 : 700);
    const from = attacker.root.position, to = target.root.position, dx = to.x - from.x, dy = to.y - from.y, length = Math.hypot(dx, dy) || 1;
    const color = frozen ? '#9deaff' : type === 'radiantArrow' ? '#ffe991' : type === 'fireProjectile' ? '#ff8a32' : type === 'magicalProjectile' ? '#bb8cff' : type === 'vine' ? '#7aaf55' : type === 'thrownWeapon' ? '#d4d7dc' : '#f4ead0';
    if (type === 'melee') {
      const slash = new Graphics().moveTo(-18, -12).lineTo(18, 12).stroke({ color, width: 5, alpha: .9 }).moveTo(-12, -18).lineTo(12, 18).stroke({ color, width: 2, alpha: .55 });
      slash.position.set(to.x - dx / length * 13, to.y - 24 - dy / length * 13); slash.rotation = Math.atan2(dy, dx); slash.zIndex = Math.max(from.y, to.y) + 3; this.effects.addChild(slash);
      const started = performance.now(), tick = () => { const currentFrom = this.entityScreenPosition(attackerId, from), currentTo = this.entityScreenPosition(targetId, to), currentDx = currentTo.x - currentFrom.x, currentDy = currentTo.y - currentFrom.y, currentLength = Math.hypot(currentDx, currentDy) || 1, t = Math.min(1, (performance.now() - started) / 260); slash.position.set(currentTo.x - currentDx / currentLength * 13, currentTo.y - 24 - currentDy / currentLength * 13); slash.rotation = Math.atan2(currentDy, currentDx); slash.zIndex = Math.max(currentFrom.y, currentTo.y) + 3; slash.alpha = hit ? 1 - t : (1 - t) * .5; slash.scale.set(.7 + t * .55); if (t < 1) requestAnimationFrame(tick); else slash.destroy(); }; tick(); return;
    }
    const textured = type === 'fireProjectile' || type === 'magicalProjectile';
    const projectile: Graphics | Sprite = textured ? new Sprite(Texture.from(type === 'fireProjectile' ? '/art/vfx/d8-night/particles/d8-night-vfx-fire-flame.png' : '/art/vfx/d8-night/particles/d8-night-vfx-arcane-spark.png')) : new Graphics();
    if (projectile instanceof Sprite) { projectile.anchor.set(.5); projectile.width = 28; projectile.height = 28; projectile.tint = color; }
    else if (type === 'vine') projectile.moveTo(0, 0).lineTo(14, 0).stroke({ color, width: 5 }); else projectile.moveTo(-10, 0).lineTo(10, 0).stroke({ color, width: type === 'thrownWeapon' ? 4 : 2 });
    projectile.rotation = Math.atan2(dy, dx); projectile.position.set(from.x, from.y - 18); projectile.zIndex = Math.max(from.y, to.y) + 2; this.effects.addChild(projectile);
    const duration = Math.max(250, Math.min(500, length * 1.6)), started = performance.now();
    const tick = () => { const currentFrom = this.entityScreenPosition(attackerId, from), currentTo = this.entityScreenPosition(targetId, to), currentDx = currentTo.x - currentFrom.x, currentDy = currentTo.y - currentFrom.y, t = Math.min(1, (performance.now() - started) / duration), startX = currentFrom.x, startY = currentFrom.y - 18, endX = hit ? currentTo.x : currentTo.x + (-currentDy / (Math.hypot(currentDx, currentDy) || 1)) * 28, endY = hit ? currentTo.y - 18 : currentTo.y + (currentDx / (Math.hypot(currentDx, currentDy) || 1)) * 28 - 18; projectile.position.set(startX + (endX - startX) * t, startY + (endY - startY) * t); projectile.zIndex = Math.max(currentFrom.y, currentTo.y) + 2; projectile.rotation = Math.atan2(currentDy, currentDx) + (type === 'thrownWeapon' ? t * Math.PI * 4 : 0); if (t < 1) requestAnimationFrame(tick); else { if (hit) { const impact = new Graphics().circle(0, 0, 12).fill({ color, alpha: .85 }); impact.position.set(currentTo.x, currentTo.y - 18); impact.zIndex = projectile.zIndex; this.effects.addChild(impact); setTimeout(() => impact.destroy(), 180); } projectile.destroy(); } }; requestAnimationFrame(tick);
  }
  private playSneakAttackEffect(targetId: string) {
    const target = this.tokenViews.get(targetId); if (!target) return;
    const frames = ['/art/m3/trinity/maria_fx_ataque_furtivo_01.png', '/art/m3/trinity/maria_fx_ataque_furtivo_02.png'];
    const effect = new Sprite(Texture.from(frames[0]!)); effect.anchor.set(.5); effect.width = 92; effect.height = 92;
    effect.zIndex = Math.round(target.root.y) + 4; effect.alpha = .92; this.effects.addChild(effect);
    const started = performance.now(), tick = () => {
      const progress = Math.min(1, (performance.now() - started) / 360), current = this.tokenViews.get(targetId);
      if (!current) { effect.destroy(); return; }
      effect.texture = Texture.from(frames[Math.min(frames.length - 1, Math.floor(progress * frames.length))]!);
      effect.position.set(current.root.x, current.root.y - 24); effect.zIndex = Math.round(current.root.y) + 4;
      effect.alpha = .92 * (1 - progress); effect.scale.set(.78 + progress * .55); effect.rotation = Math.sin(progress * Math.PI) * .08;
      if (progress < 1) requestAnimationFrame(tick); else effect.destroy();
    };
    requestAnimationFrame(tick);
  }
  playAreaEffect(cell: Cell, type: 'fog', radiusMeters: number, durationMs = 5_000) {
    if (type !== 'fog' || !this.scene) return;
    const center = this.cellToPixel(cell), diameter = Math.max(this.scene.grid.tileSize, radiusMeters / 1.5 * this.scene.grid.tileSize * 2), fog = new Sprite(Texture.from('/art/vfx/d8-night/particles/d8-night-vfx-fog-smoke.png'));
    fog.anchor.set(.5); fog.position.set(center.x, center.y); fog.width = diameter; fog.height = diameter; fog.alpha = .64; fog.tint = '#dce8e2'; fog.zIndex = Math.round(center.y) + 1; this.effects.addChild(fog);
    const started = performance.now(), tick = () => { const point = this.cellToPixel(cell); fog.position.set(point.x, point.y); fog.zIndex = Math.round(point.y) + 1; const t = Math.min(1, (performance.now() - started) / Math.max(400, durationMs)); fog.rotation = t * .22; fog.scale.set(1 + Math.sin(t * Math.PI) * .08); fog.alpha = t < .72 ? .64 : .64 * (1 - (t - .72) / .28); if (t < 1) requestAnimationFrame(tick); else fog.destroy(); }; tick();
  }
  /** Starts a short, local token sequence (for example, using an object). */
  playTokenAnimation(entityId: string, state: string, durationMs = 650) {
    const view = this.tokenViews.get(entityId); if (!view) return;
    const tokenId = view.entity.tokenId, facing = this.cameraRelativeFacing(view.entity.facing), suffix = facingSuffix[facing];
    if (state === 'running' || state === 'attack' || state === 'disengage') {
      const directionalState = state === 'disengage' ? `direction-${suffix}` : `${state === 'running' ? 'running' : 'attack'}-${suffix}`;
      if (this.animationFor(tokenId, directionalState)) state = directionalState;
      else if (state === 'disengage' && this.animationFor(tokenId, 'moving')) state = 'moving';
    }
    if (state === 'attack-arrow' || state === 'attack-throw') {
      const facingLeft = facing === 'west' || facing === 'north-west' || facing === 'south-west';
      const mirroredState = `${state}-mirrored`;
      if (facingLeft && this.animationFor(tokenId, mirroredState)) state = mirroredState;
    }
    if (!this.animationFor(tokenId, state)) {
      if (state === 'attack-arrow' || state === 'attack-arrow-mirrored' || state === 'attack-throw' || state === 'attack-throw-mirrored') state = 'attack';
      else return;
    }
    view.animationState = state; view.animationStartedAt = performance.now(); view.animationUntil = view.animationStartedAt + durationMs;
  }
  /** The mirror is a prop, never an NPC. This transient scene effect lets its
   * surface bloom into the exact player who touched it before the server's
   * independent reflection token takes over. */
  playMirrorTransformation(propId: string, sourceId: string, reflectionId: string, frames: string[], durationMs = 1_600) {
    const prop = this.propViews.get(propId), source = this.tokenViews.get(sourceId);
    if (!prop?.sprite || !source || !frames.length) return;
    const originalTexture = prop.sprite.texture, apparition = new Sprite(source.sprite.texture), frost = new Graphics();
    apparition.anchor.set(source.sprite.anchor.x, source.sprite.anchor.y); apparition.width = source.sprite.width; apparition.height = source.sprite.height;
    apparition.position.set(prop.root.x, prop.root.y); apparition.alpha = 0; apparition.tint = '#bfefff'; apparition.zIndex = Math.round(prop.root.y) + 3;
    frost.position.set(prop.root.x, prop.root.y); frost.zIndex = apparition.zIndex - 1; this.effects.addChild(frost, apparition);
    const started = performance.now(), duration = Math.max(250, durationMs), tick = () => {
      const elapsed = performance.now() - started, progress = Math.min(1, elapsed / duration), frame = frames[Math.min(frames.length - 1, Math.floor(progress * frames.length))]!;
      prop.sprite!.texture = Texture.from(frame); prop.root.alpha = progress < .72 ? 1 : Math.max(.24, 1 - (progress - .72) * 2.1);
      const reflection = this.tokenViews.get(reflectionId), end = reflection?.root.position ?? prop.root.position;
      apparition.position.set(prop.root.x + (end.x - prop.root.x) * Math.max(0, (progress - .45) / .55), prop.root.y + (end.y - prop.root.y) * Math.max(0, (progress - .45) / .55));
      apparition.alpha = progress < .35 ? 0 : Math.min(.82, (progress - .35) * 2.2);
      apparition.scale.set(0.72 + progress * .28); frost.clear().circle(0, -42, 18 + progress * 42).fill({ color: '#a7eaff', alpha: (1 - progress) * .36 }).stroke({ color: '#eafcff', width: 2, alpha: (1 - progress) * .7 });
      if (progress < 1) requestAnimationFrame(tick);
      else { prop.sprite!.texture = originalTexture; prop.root.alpha = 1; frost.destroy(); apparition.destroy(); }
    };
    tick();
  }
  showPreview(object: DmObject | null, valid = true) {
    const generation = ++this.previewGeneration; this.previewCells.clear(); this.previewSprite.visible = false;
    this.previewObject = object; this.previewValid = valid;
    if (!object) return;
    this.drawFootprint(this.previewCells, object, valid ? '#63e6a5' : '#ff6868', 0.32);
    const asset = this.variantFor(object); if (!asset) return;
    void Assets.load<Texture>(asset.url).then(texture => {
      if (generation !== this.previewGeneration) return;
      const center = this.objectCenter(object); this.previewSprite.texture = texture; this.previewSprite.anchor.set(asset.anchorX, asset.anchorY);
      this.previewSprite.width = asset.logicalWidth; this.previewSprite.height = asset.logicalHeight; this.previewSprite.position.set(center.x, center.y); this.previewSprite.tint = valid ? '#ffffff' : '#ff8b8b'; this.previewSprite.visible = true;
    });
  }
  clearEditor() { this.selectedObject = null; this.previewObject = null; this.selection.clear(); this.previewCells.clear(); this.previewSprite.visible = false; this.previewGeneration++; }
  screenVectorToWorld(x: number, up: number) {
    if (!this.terrainView) return { x, z: -up };
    return orientedScreenVectorToWorld(x, up, this.cameraOrientationStep, this.terrainView.camera.beta);
  }
  dispose() { this.campVisualGeneration++; cancelAnimationFrame(this.resizeFrame); this.resizeObserver.disconnect(); this.terrainScene?.dispose(); this.terrainEngine?.dispose(); this.app.destroy(true, { children: true, texture: false, textureSource: false }); this.host.replaceChildren(); }

  private installTerrain(definition: PublicSceneDefinition) {
    const campVisualGeneration = ++this.campVisualGeneration;
    this.terrainCameraInitialized = false;
    this.cameraOrientationInitialized = false;
    const enabled = definition.renderer === 'babylon-hd2d' && Boolean(definition.terrain);
    if (!enabled) {
      if (this.terrainCanvas) this.terrainCanvas.hidden = true;
      this.terrainScene?.dispose(); this.terrainScene = null; this.terrainView = null; this.terrainProps.clear();
      this.retreatVisuals = null; this.campVisuals = null;
      this.campInteractionHighlights = false;
      this.background.visible = true;
      return;
    }
    if (!this.terrainCanvas) {
      this.terrainCanvas = document.createElement('canvas'); this.terrainCanvas.className = 'world terrain-world';
      this.terrainCanvas.setAttribute('aria-label', 'Terreno HD-2D Babylon');
      this.terrainCanvas.style.position = 'absolute'; this.terrainCanvas.style.inset = '0'; this.terrainCanvas.style.width = '100%'; this.terrainCanvas.style.height = '100%'; this.terrainCanvas.style.zIndex = '1';
      this.host.prepend(this.terrainCanvas); this.terrainEngine = new BabylonEngine(this.terrainCanvas, true, { preserveDrawingBuffer: false, stencil: true });
      this.terrainEngine.runRenderLoop(() => this.terrainScene?.render());
    }
    // Camp ambience is intentionally inexpensive on tablet/phone screens:
    // render fewer pixels on coarse/narrow displays while leaving projector
    // and desktop scenes at native canvas resolution.
    const compactDisplay = typeof window !== 'undefined' && window.matchMedia('(max-width: 820px), (pointer: coarse)').matches;
    this.terrainEngine!.setHardwareScalingLevel(campTerrainHardwareScalingLevel(Boolean(definition.camp), compactDisplay));
    this.terrainScene?.dispose(); this.terrainProps.clear(); this.retreatVisuals = null; this.campVisuals = null; this.terrainScene = new BabylonScene(this.terrainEngine!);
    if (!definition.camp) this.campInteractionHighlights = false;
    this.terrainScene.clearColor.set(.025, .07, .09, 1);
    const deckTexture = definition.id === 'wreck-ship'
      ? new BabylonTexture('/art/ship/deck-planks-art06.png', this.terrainScene, false, true, BabylonTexture.TRILINEAR_SAMPLINGMODE)
      : undefined;
    this.shipPropWoodTexture = deckTexture ?? null;
    const hullTexture = definition.id === 'wreck-ship'
      ? new BabylonTexture('/art/ship/hull-planks-art04.png', this.terrainScene, false, true, BabylonTexture.TRILINEAR_SAMPLINGMODE)
      : undefined;
    const reefTexture = definition.id === 'wreck-ship'
      ? new BabylonTexture('/art/ship/reef-rock-art05.png', this.terrainScene, false, true, BabylonTexture.TRILINEAR_SAMPLINGMODE)
      : undefined;
    const waterTexture = definition.id === 'wreck-ship'
      ? new BabylonTexture('/art/ship/water-ripples-m5-candidate.png', this.terrainScene, false, true, BabylonTexture.TRILINEAR_SAMPLINGMODE)
      : undefined;
    const floodedDeckTexture = definition.id === 'wreck-ship'
      ? new BabylonTexture('/art/ship/water-ripples-m5-candidate.png', this.terrainScene, false, true, BabylonTexture.TRILINEAR_SAMPLINGMODE)
      : undefined;
    const waterBackdropTexture = definition.id === 'wreck-ship'
      ? new BabylonTexture('/art/ship/deep-sea-background-v1.png', this.terrainScene, false, true, BabylonTexture.TRILINEAR_SAMPLINGMODE)
      : undefined;
    const scenicWaterTexture = definition.id === 'wreck-ship'
      ? new BabylonTexture('/art/ship/deep-sea-background-art02.png', this.terrainScene, false, true, BabylonTexture.TRILINEAR_SAMPLINGMODE)
      : undefined;
    const foamTexture = definition.id === 'wreck-ship'
      ? new BabylonTexture('/art/ship/sea-foam-art03.png', this.terrainScene, false, true, BabylonTexture.TRILINEAR_SAMPLINGMODE)
      : undefined;
    const wreckageTexture = definition.id === 'wreck-ship'
      ? new BabylonTexture('/art/ship/c1-wreckage-detail-v1.png', this.terrainScene, false, true, BabylonTexture.TRILINEAR_SAMPLINGMODE)
      : undefined;
    if (deckTexture) {
      deckTexture.wrapU = BabylonTexture.WRAP_ADDRESSMODE; deckTexture.wrapV = BabylonTexture.WRAP_ADDRESSMODE;
      deckTexture.anisotropicFilteringLevel = 4;
    }
    if (hullTexture) {
      hullTexture.wrapU = BabylonTexture.WRAP_ADDRESSMODE; hullTexture.wrapV = BabylonTexture.WRAP_ADDRESSMODE;
      hullTexture.anisotropicFilteringLevel = 4;
    }
    if (reefTexture) {
      reefTexture.wrapU = BabylonTexture.WRAP_ADDRESSMODE; reefTexture.wrapV = BabylonTexture.WRAP_ADDRESSMODE;
      reefTexture.anisotropicFilteringLevel = 4;
    }
    if (waterTexture) {
      waterTexture.wrapU = BabylonTexture.WRAP_ADDRESSMODE; waterTexture.wrapV = BabylonTexture.WRAP_ADDRESSMODE;
      waterTexture.anisotropicFilteringLevel = 4;
    }
    if (floodedDeckTexture) {
      floodedDeckTexture.wrapU = BabylonTexture.WRAP_ADDRESSMODE; floodedDeckTexture.wrapV = BabylonTexture.WRAP_ADDRESSMODE;
    }
    if (waterBackdropTexture) {
      waterBackdropTexture.wrapU = BabylonTexture.CLAMP_ADDRESSMODE; waterBackdropTexture.wrapV = BabylonTexture.CLAMP_ADDRESSMODE;
      waterBackdropTexture.anisotropicFilteringLevel = 4;
    }
    if (scenicWaterTexture) {
      scenicWaterTexture.wrapU = BabylonTexture.WRAP_ADDRESSMODE; scenicWaterTexture.wrapV = BabylonTexture.WRAP_ADDRESSMODE;
      scenicWaterTexture.anisotropicFilteringLevel = 4;
    }
    if (foamTexture) {
      foamTexture.wrapU = BabylonTexture.WRAP_ADDRESSMODE; foamTexture.wrapV = BabylonTexture.WRAP_ADDRESSMODE;
      foamTexture.hasAlpha = true;
    }
    if (wreckageTexture) {
      wreckageTexture.wrapU = BabylonTexture.CLAMP_ADDRESSMODE; wreckageTexture.wrapV = BabylonTexture.CLAMP_ADDRESSMODE;
      wreckageTexture.hasAlpha = true;
      wreckageTexture.anisotropicFilteringLevel = 4;
    }
    this.terrainView = buildTerrain3D(this.terrainScene, definition.terrain!, {
      ambientIntensity: Math.max(.08, 1 - (definition.visibility?.darkness ?? 0)),
      shipDeck: definition.id === 'wreck-ship',
      deckTexture,
      hullTexture,
      reefTexture,
      waterTexture,
      floodedDeckTexture,
      waterBackdropTexture,
      scenicWaterTexture,
      foamTexture,
      wreckageTexture,
      renderTiles: definition.id !== 'dragon-rest', batchTiles: Boolean(definition.camp)
    });
    const defaultTilt = clampCameraTilt(90 - this.terrainView.camera.beta * 180 / Math.PI);
    this.cameraTiltDegrees = this.readCameraTilt(definition.id) ?? defaultTilt;
    this.restoreCameraOrientation(definition.id);
    if (definition.id === 'dragon-rest') this.retreatVisuals = createDragonRestVisuals(this.terrainScene);
      if (definition.camp) {
        const campScene = this.terrainScene;
        void import('../../campaigns/camp-rests/public/visuals.js').then(({ createCampVisuals }) => {
          if (this.campVisualGeneration === campVisualGeneration && this.terrainScene === campScene && this.sceneId === definition.id) {
            this.campVisuals = createCampVisuals(campScene, definition);
            if (this.campInteractionHighlights) this.campVisuals?.setInteractionHighlights(true);
          }
        }).catch(error => console.error('No se pudieron cargar los efectos del campamento', error));
      }
    this.terrainCanvas.hidden = false; this.background.visible = false; this.terrainEngine!.resize();
  }

  private async installScene(sceneId: string, connection: number, request: number) {
    const definition = this.campaign.scenes.find(scene => scene.id === sceneId); if (!definition) return false;
    if (this.sceneId === sceneId) return true;
    const texture = definition.renderer === 'babylon-hd2d' ? Texture.EMPTY : await Assets.load<Texture>(definition.background);
    if (connection !== this.connectionGeneration || request !== this.requestGeneration) return false;
    this.sceneId = sceneId; this.cameraInitialized = false;
    this.cameraOrientationStep = this.readCameraOrientation(sceneId);
    this.cameraBaseZoom = definition.renderer === 'babylon-hd2d' ? definition.camp ? 2.4 : 1.8 : 1;
    this.cameraZoom = this.cameraBaseZoom;
    this.background.texture = texture; this.background.position.set(0, 0); this.background.width = definition.grid.width; this.background.height = definition.grid.height;
    this.installTerrain(definition);
    this.tokenViews.forEach(view => view.root.destroy({ children: true })); this.propViews.forEach(view => view.root.destroy({ children: true })); this.pickupViews.forEach(view => view.destroy({ children: true }));
    this.tokenViews.clear(); this.propViews.clear(); this.pickupViews.clear();
    this.dynamic.removeChildren(); this.clearEditor(); this.reachable.clear(); this.clearAttackRange(); this.drawGrid(); this.drawWaves();
    this.updateCamera(0); return true;
  }

  private drawGrid() {
    const grid = this.scene!.grid; this.grid.clear();
    if (this.terrainView) {
      const wreckDisappeared = this.sceneId === 'wreck-ship' && Boolean(this.snapshot?.story?.wreckDisappeared);
      for (const [surfaceId, grid] of this.terrainView.grids) grid.isVisible = this.options.showGrid !== false && (!wreckDisappeared || surfaceId === 'sea');
      return;
    }
    if (this.options.showGrid === false) return;
    if (this.sceneId && hasWreckProjection(this.sceneId)) {
      for (const cell of this.projectedCells()) this.traceProjectedCell(this.grid, cell.col, cell.row);
      this.grid.stroke({ color: '#e4f0e9', width: 1.1, alpha: .23 });
      // Gold edges distinguish an elevation route from ordinary floor grid.
      const stairs = this.sceneId === 'wreck-main' ? [{ col: 11, row: 6 }, { col: 10, row: 6 }, { col: 11, row: 12 }, { col: 10, row: 12 }, { col: 16, row: 6 }, { col: 17, row: 6 }, { col: 16, row: 12 }, { col: 17, row: 12 }, { col: 14, row: 10 }]
        : this.sceneId === 'wreck-upper' ? [{ col: 9, row: 6 }, { col: 9, row: 12 }, { col: 18, row: 6 }, { col: 18, row: 12 }]
        : this.sceneId === 'wreck-crow' ? [{ col: 14, row: 11 }] : [{ col: 14, row: 10 }];
      for (const cell of stairs) this.traceProjectedCell(this.grid, cell.col, cell.row);
      this.grid.stroke({ color: '#f7d795', width: 2.4, alpha: .8 });
      return;
    }
    const bottom = grid.originY + grid.rows * grid.tileSize, right = grid.originX + grid.cols * grid.tileSize;
    for (let col = 0; col <= grid.cols; col++) { const x = grid.originX + col * grid.tileSize; this.grid.moveTo(x, grid.originY).lineTo(x, bottom); }
    for (let row = 0; row <= grid.rows; row++) { const y = grid.originY + row * grid.tileSize; this.grid.moveTo(grid.originX, y).lineTo(right, y); }
    this.grid.stroke({ color: '#d9e5d2', width: 1.2, alpha: 0.31, pixelLine: true });
  }

  private projectedCells(): Cell[] {
    const scene = this.scene; if (!scene) return [];
    const cells = scene.terrain?.surfaces.filter(surface => !surface.visualOnly)
      .flatMap(surface => surface.tiles.map(tile => tile.cell)) ?? scene.walkable;
    return [...new Map(cells.map(cell => [`${cell.col},${cell.row}`, cell])).values()];
  }

  private terrainCellAt(point: { x: number; y: number }): Cell | null {
    // Hit-test exactly the quadrilaterals drawn by the terrain grid. Browser
    // canvas scaling and Babylon hardware scaling must not produce a second
    // coordinate system for DM selection or tactical targets.
    const surfaces = this.scene?.terrain?.surfaces.filter(surface => !surface.visualOnly) ?? [];
    const candidates = surfaces.flatMap(surface => surface.tiles.filter(tile => {
      const floor = this.terrainView?.tiles.get(`${surface.id}:${tile.cell.col},${tile.cell.row}`);
      return !floor || floor.isVisible;
    })
      .map(tile => ({ surfaceId: surface.id, cell: tile.cell, height: Math.max(...tile.corners) }))).sort((a, b) => b.height - a.height);
    for (const candidate of candidates) {
      const corners = [this.projectedCellCorner(candidate.cell, 0, 0, candidate.surfaceId), this.projectedCellCorner(candidate.cell, 1, 0, candidate.surfaceId),
        this.projectedCellCorner(candidate.cell, 1, 1, candidate.surfaceId), this.projectedCellCorner(candidate.cell, 0, 1, candidate.surfaceId)];
      if (corners.some(corner => !corner)) continue;
      let side = 0, inside = true;
      for (let index = 0; index < 4; index++) {
        const a = corners[index]!, b = corners[(index + 1) % 4]!;
        const cross = (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x);
        if (Math.abs(cross) < .001) continue;
        if (!side) side = Math.sign(cross);
        else if (Math.sign(cross) !== side) { inside = false; break; }
      }
      if (inside) return candidate.cell;
    }
    return null;
  }

  private projectedPoint(col: number, row: number, surfaceId = this.scene?.surfaceId) {
    const scene = this.scene!;
    if (this.terrainScene && this.terrainView && scene.terrain) {
      const cell = { col: Math.floor(col), row: Math.floor(row) };
      const address = { surfaceId: surfaceId ?? scene.surfaceId, cell };
      const height = terrainTile(scene.terrain, address)
        ? surfaceHeight(scene.terrain, address, col - cell.col, row - cell.row) : 0;
      const camera = this.terrainView.camera;
      const point = Vector3.Project(new Vector3(col * scene.terrain.tileMeters, height + .035, row * scene.terrain.tileMeters), Matrix.Identity(),
        this.terrainScene.getTransformMatrix(), camera.viewport.toGlobal(this.app.screen.width, this.app.screen.height));
      return { x: point.x, y: point.y };
    }
    return this.sceneId ? projectWreckPoint(this.sceneId, col, row, scene.grid.width, scene.grid.height) : null;
  }

  private projectedCellCorner(cell: Cell, u: number, v: number, surfaceId = this.scene?.surfaceId) {
    const terrain = this.scene?.terrain;
    if (!this.terrainScene || !this.terrainView || !terrain) return this.projectedPoint(cell.col + u, cell.row + v, surfaceId);
    const address = { surfaceId: surfaceId ?? this.scene!.surfaceId, cell };
    const height = terrainTile(terrain, address) ? surfaceHeight(terrain, address, u, v) : 0;
    const point = Vector3.Project(new Vector3((cell.col + u) * terrain.tileMeters, height + .035, (cell.row + v) * terrain.tileMeters),
      Matrix.Identity(), this.terrainScene.getTransformMatrix(), this.terrainView.camera.viewport.toGlobal(this.app.screen.width, this.app.screen.height));
    return { x: point.x, y: point.y };
  }

  private traceProjectedCell(graphics: Graphics, col: number, row: number, surfaceId = this.scene?.surfaceId) {
    const cell = { col, row };
    const a = this.projectedCellCorner(cell, 0, 0, surfaceId), b = this.projectedCellCorner(cell, 1, 0, surfaceId), c = this.projectedCellCorner(cell, 1, 1, surfaceId), d = this.projectedCellCorner(cell, 0, 1, surfaceId);
    if (!a || !b || !c || !d) return;
    graphics.moveTo(a.x, a.y).lineTo(b.x, b.y).lineTo(c.x, c.y).lineTo(d.x, d.y).closePath();
  }

  private drawReachable() {
    this.reachable.clear(); if (this.options.showReachable === false) return; const snapshot = this.snapshot, scene = this.scene, movement = snapshot?.combat.movement;
    if (!snapshot?.combat.active || !scene || !movement) return;
    const origin = snapshot.entities.find(entity => entity.id === movement.actorId); if (!origin) return;
    if (scene.terrain) {
      type Address = { surfaceId: string; cell: Cell; distance: number };
      const keyOf = (address: Pick<Address, 'surfaceId' | 'cell'>) => `${address.surfaceId}:${address.cell.col},${address.cell.row}`;
      const blocked = new Set(snapshot.props.filter(prop => prop.structure !== 'destroyed'
        && (prop.kind !== 'door' || prop.state !== 'open') && (prop.kind !== 'wheel' || prop.attachment === 'detached'))
        .flatMap(prop => footprintFor(prop.cell, prop.rotation, prop.footprint).map(cell => `${prop.surfaceId}:${cell.col},${cell.row}`)));
      for (const entity of snapshot.entities) if (entity.id !== origin.id) blocked.add(`${entity.surfaceId}:${entity.cell.col},${entity.cell.row}`);
      const visited = new Map<string, number>(), queue: Address[] = [{ surfaceId: origin.surfaceId, cell: origin.cell, distance: 0 }];
      visited.set(keyOf(queue[0]!), 0);
      while (queue.length) {
        queue.sort((a, b) => a.distance - b.distance);
        const current = queue.shift()!, currentKey = keyOf(current);
        if (visited.get(currentKey) !== current.distance) continue;
        if (current.distance > 0) {
          this.traceProjectedCell(this.reachable, current.cell.col, current.cell.row, current.surfaceId);
          this.reachable.fill({ color: '#63e6a5', alpha: .14 }).stroke({ color: '#a6f2cb', width: 1.4, alpha: .52 });
        }
        if (current.distance >= movement.remainingSquares) continue;
        for (const next of surfaceNeighbors(scene.terrain, { surfaceId: current.surfaceId, cell: current.cell })) {
          const destinationKey = `${next.surfaceId}:${next.cell.col},${next.cell.row}`;
          const tile = terrainTile(scene.terrain, next), distance = current.distance + (tile?.movementCost ?? 1);
          if (!tile || blocked.has(destinationKey) || distance > movement.remainingSquares || distance >= (visited.get(destinationKey) ?? Infinity)) continue;
          visited.set(destinationKey, distance); queue.push({ ...next, distance });
        }
      }
      return;
    }
    const surfaceCells = scene.walkable;
    const walkable = new Set(surfaceCells.map(cell => `${cell.col},${cell.row}`));
    const blocked = new Set(snapshot.props.filter(prop => prop.surfaceId === origin.surfaceId && prop.structure !== 'destroyed'
      && (prop.kind !== 'door' || prop.state !== 'open') && (prop.kind !== 'wheel' || prop.attachment === 'detached'))
      .flatMap(prop => footprintFor(prop.cell, prop.rotation, prop.footprint).map(cell => `${cell.col},${cell.row}`)));
    for (const entity of snapshot.entities) if (entity.id !== origin.id && entity.surfaceId === origin.surfaceId)
      blocked.add(`${entity.cell.col},${entity.cell.row}`);
    const costs = new Map<string, number>();
    const visited = new Map<string, number>(), queue: Array<{ col: number; row: number; distance: number }> = [{ ...origin.cell, distance: 0 }];
    visited.set(`${origin.cell.col},${origin.cell.row}`, 0);
    while (queue.length) {
      queue.sort((a, b) => a.distance - b.distance);
      const current = queue.shift()!;
      if (visited.get(`${current.col},${current.row}`) !== current.distance) continue;
      if (current.distance > 0) {
        if (this.sceneId && hasWreckProjection(this.sceneId)) this.traceProjectedCell(this.reachable, current.col, current.row);
        else { const grid = scene.grid; this.reachable.rect(grid.originX + current.col * grid.tileSize + 3, grid.originY + current.row * grid.tileSize + 3, grid.tileSize - 6, grid.tileSize - 6); }
        this.reachable.fill({ color: '#63e6a5', alpha: .14 }).stroke({ color: '#a6f2cb', width: 1.4, alpha: .52 });
      }
      if (current.distance >= movement.remainingSquares) continue;
      const neighbors = [{ col: current.col + 1, row: current.row }, { col: current.col - 1, row: current.row }, { col: current.col, row: current.row + 1 }, { col: current.col, row: current.row - 1 }];
      for (const next of neighbors) {
        const key = `${next.col},${next.row}`, distance = current.distance + (costs.get(key) ?? 1);
        if (!walkable.has(key) || blocked.has(key) || distance > movement.remainingSquares || distance >= (visited.get(key) ?? Infinity)) continue;
        visited.set(key, distance); queue.push({ ...next, distance });
      }
    }
  }

  private drawAttackRange() {
    this.attackRange.clear();
    const preview = this.attackRangePreview, scene = this.scene, snapshot = this.snapshot;
    if (!preview || !scene || !snapshot) return;
    const origin = snapshot.entities.find(entity => entity.id === preview.originId);
    if (!origin) return;
    const normalSquares = Math.floor((preview.normalMeters + .001) / 1.5), longSquares = Math.floor((preview.longMeters + .001) / 1.5);
    if (longSquares < 1) return;
    const grid = scene.grid;
    for (let row = Math.max(0, origin.cell.row - longSquares); row <= Math.min(grid.rows - 1, origin.cell.row + longSquares); row++) for (let col = Math.max(0, origin.cell.col - longSquares); col <= Math.min(grid.cols - 1, origin.cell.col + longSquares); col++) {
      const distance = Math.max(Math.abs(origin.cell.col - col), Math.abs(origin.cell.row - row));
      if (!distance || distance > longSquares) continue;
      if (scene.terrain && !terrainTile(scene.terrain, { surfaceId: origin.surfaceId, cell: { col, row } })) continue;
      const longRange = distance > normalSquares, color = longRange ? '#f0bd58' : '#62d9b0';
      if (this.terrainView || (this.sceneId && hasWreckProjection(this.sceneId))) this.traceProjectedCell(this.attackRange, col, row, origin.surfaceId);
      else this.attackRange.rect(grid.originX + col * grid.tileSize + 4, grid.originY + row * grid.tileSize + 4, grid.tileSize - 8, grid.tileSize - 8);
      this.attackRange
        .fill({ color, alpha: longRange ? .12 : .2 })
        .stroke({ color, width: longRange ? 1.2 : 1.8, alpha: longRange ? .56 : .78 });
    }
  }

  private drawWaves() {
    const scene = this.scene!; this.waves.clear(); this.waterShimmer.clear(); this.wind.clear();
    if (this.terrainView) {
      // La maqueta tiene su propio horizonte; no superponemos oleaje 2D de una imagen.
    } else if (hasWreckProjection(scene.id)) {
      if (scene.id === 'wreck-lower') {
        for (let row = 6; row <= 12; row += 2) for (let col = 3; col <= 25; col += 3) {
          const point = this.projectedPoint(col + .5, row + .5); if (point) this.waterShimmer.ellipse(point.x, point.y, 17, 4);
        }
        this.waterShimmer.stroke({ color: '#a9e5e7', width: 1.4, alpha: .23 });
      } else {
        for (let band = 0; band < 2; band++) for (let x = 45; x < scene.grid.width - 30; x += 95) {
          const y = band ? scene.grid.height * .82 + Math.sin(x * .02) * 19 : scene.grid.height * .075 + Math.cos(x * .018) * 12;
          this.waves.moveTo(x, y).lineTo(x + 22, y - 3);
        }
        this.waves.stroke({ color: '#e1fbfc', width: 2.4, alpha: .22 });
        for (let i = 0; i < 28; i++) {
          const x = (i * 283) % scene.grid.width, y = 52 + ((i * 137) % Math.round(scene.grid.height * .65));
          this.wind.moveTo(x, y).lineTo(x + 25, y - 7);
        }
        this.wind.stroke({ color: '#d4edf4', width: 1.1, alpha: scene.id === 'wreck-crow' ? .2 : .12 });
      }
    } else {
      if (scene.waves) for (let line = 0; line < 7; line++) { const y = 65 + line * 135; this.waves.moveTo(-60, y); for (let x = -60; x <= scene.grid.width + 80; x += 80) this.waves.lineTo(x, y + Math.sin(x * 0.025 + line) * 7); }
      this.waves.stroke({ color: '#9cdeea', width: 2, alpha: 0.14 });
    }
    this.storm.clear().rect(0, 0, scene.grid.width, scene.grid.height).fill({ color: '#071827', alpha: 0.72 }); this.storm.visible = false;
    this.rain.clear(); for (let y = -80; y < scene.grid.height + 80; y += 48) for (let x = -80; x < scene.grid.width + 80; x += 86) this.rain.moveTo(x, y).lineTo(x - 14, y + 32); this.rain.stroke({ color: '#bde8f2', width: 1.5, alpha: 0.58 }); this.rain.visible = false;
    this.rainNear.clear(); for (let y = -120; y < scene.grid.height + 120; y += 86) for (let x = -100; x < scene.grid.width + 100; x += 142) this.rainNear.moveTo(x, y).lineTo(x - 24, y + 58); this.rainNear.stroke({ color: '#e6f7ff', width: 2.2, alpha: 0.62 }); this.rainNear.visible = false;
  }

  private drawShipWind(timeSeconds: number) {
    this.wind.clear();
    const scene = this.scene;
    if (!this.terrainView || this.sceneId !== 'wreck-ship' || !scene?.terrain) return;
    const focusId = this.localId ?? this.snapshot?.camera.focusId;
    const focus = focusId ? this.snapshot?.entities.find(entity => entity.id === focusId) : undefined;
    let drawn = 0;
    for (const streak of shipWindStreaks(scene.terrain, timeSeconds, focus?.surfaceId)) {
      const from = this.projectedPoint(streak.from.col, streak.from.row, 'sea');
      const to = this.projectedPoint(streak.to.col, streak.to.row, 'sea');
      if (!from || !to) continue;
      this.wind.moveTo(from.x, from.y).lineTo(to.x, to.y); drawn++;
    }
    if (drawn) this.wind.stroke({ color: '#d9f4f4', width: 1.1, alpha: 0.11 });
  }

  private animateShipLights(timeSeconds: number) {
    if (!this.terrainView || this.sceneId !== 'wreck-ship') return;
    const weather = this.snapshot?.environment;
    const lighting = shipWeatherLighting(Boolean(weather?.storm), weather?.stormIntensity ?? 0,
      Boolean(weather?.lightning), timeSeconds);
    for (const id of ['terrain-ambient', 'ship-key-light']) {
      const light = this.terrainScene?.getLightByName(id);
      const baseIntensity = Number(light?.metadata?.baseIntensity);
      if (light && Number.isFinite(baseIntensity))
        light.intensity = baseIntensity * (id === 'terrain-ambient' ? lighting.ambientScale : lighting.keyScale);
    }
    if (this.terrainScene) this.terrainScene.fogDensity = lighting.fogDensity;
    for (const light of this.terrainView.lights) {
      const id = String(light.metadata?.lightId ?? '');
      const baseIntensity = Number(light.metadata?.baseIntensity);
      if (!Number.isFinite(baseIntensity)) continue;
      light.intensity = shipAmbientLightIntensity(id, baseIntensity, timeSeconds);
    }
  }

  private drawBoatWake(timeSeconds: number) {
    this.boatWake.clear();
    if (this.sceneId !== 'wreck-ship' || !this.snapshot || this.snapshot.story?.wreckDisappeared) return;
    const focusId = this.localId ?? this.snapshot.camera.focusId;
    const focus = focusId ? this.snapshot.entities.find(entity => entity.id === focusId) : undefined;
    if (focus && ['lower-deck', 'lower-water', 'hold-air', 'hold-water'].includes(focus.surfaceId)) return;
    for (const actor of this.snapshot.entities.filter(entity => entity.tokenId === 'wreck-rowboat' && entity.surfaceId === 'sea')) {
      const point = this.interpolatedScreenPoint(actor);
      const pulse = Math.sin(timeSeconds * 1.6) * 2.5;
      for (const side of [-1, 1]) {
        this.boatWake.moveTo(point.x - 42, point.y + side * (11 + pulse))
          .quadraticCurveTo(point.x, point.y + side * (23 + pulse), point.x + 42, point.y + side * (11 + pulse));
      }
      this.boatWake.stroke({ color: '#d8f6f1', width: 2, alpha: .38 });
    }
    for (const swimmer of this.snapshot.entities.filter(entity => entity.surfaceId === 'sea' && entity.moving && entity.tokenId !== 'wreck-rowboat')) {
      const point = this.interpolatedScreenPoint(swimmer);
      this.boatWake.ellipse(point.x, point.y + 6, 15, 5).stroke({ color: '#a8e1df', width: 1.4, alpha: .35 });
    }
  }

  private renderPickups(snapshot: WorldSnapshot) {
    const collected = new Set(snapshot.collectedPickups ?? []);
    const available = new Set((snapshot.scene.pickups ?? []).filter(pickup => !collected.has(pickup.id)).map(pickup => pickup.id));
    for (const [id, root] of this.pickupViews) if (!available.has(id)) { root.destroy({ children: true }); this.pickupViews.delete(id); }
    for (const pickup of snapshot.scene.pickups ?? []) {
      if (collected.has(pickup.id) || this.pickupViews.has(pickup.id)) continue;
      const root = new Container(), marker = new Graphics();
      if (pickup.kind === 'unlit-torch') {
        marker.moveTo(-5, 0).lineTo(4, -27).stroke({ color: '#302923', width: 9 });
        marker.moveTo(-5, 0).lineTo(4, -27).stroke({ color: '#936942', width: 5 });
        marker.moveTo(-5, -17).lineTo(8, -19).stroke({ color: '#c4a975', width: 3 });
        marker.moveTo(-2, -22).lineTo(9, -25).stroke({ color: '#c4a975', width: 3 });
        marker.circle(4, -28, 5).fill({ color: '#393530' }).stroke({ color: '#ab8b5a', width: 1.5 });
      } else if (pickup.id.includes('tiger-eye') || pickup.id.includes('heliotrope')) {
        const heliotrope = pickup.id.includes('heliotrope');
        marker.moveTo(0, -25).lineTo(11, -14).lineTo(6, -3).lineTo(-7, -4).lineTo(-10, -14).closePath()
          .fill({ color: heliotrope ? '#335c52' : '#a06434' }).stroke({ color: '#e3c688', width: 2 });
        marker.moveTo(-6, -15).lineTo(0, -21).lineTo(6, -15).lineTo(0, -8).closePath()
          .fill({ color: heliotrope ? '#ba5554' : '#e7b55c', alpha: .72 });
      } else if (pickup.id.includes('bracelet') || pickup.id.includes('earring')) {
        marker.circle(0, -14, pickup.id.includes('bracelet') ? 11 : 7)
          .stroke({ color: '#edc56c', width: pickup.id.includes('bracelet') ? 4 : 3 });
        marker.circle(5, -7, 3).fill({ color: '#d9a34d' });
        marker.circle(-5, -20, 2).fill({ color: '#f7df9e' });
      } else if (pickup.id.includes('dagger')) {
        marker.moveTo(-8, -4).lineTo(6, -23).lineTo(9, -28).lineTo(7, -19).lineTo(-5, -2).closePath()
          .fill({ color: '#b9cac8' }).stroke({ color: '#485a5a', width: 1 });
        marker.moveTo(-10, -8).lineTo(-2, -1).stroke({ color: '#8d6845', width: 4 });
      } else if (pickup.id.includes('compass')) {
        marker.circle(0, -14, 11).fill({ color: '#987447' }).stroke({ color: '#e3c278', width: 3 });
        marker.moveTo(0, -22).lineTo(4, -10).lineTo(-2, -12).closePath().fill({ color: '#ce764d' });
        marker.circle(0, -14, 2).fill({ color: '#f7e9b2' });
      } else if (pickup.id.includes('cartographer')) {
        marker.rect(-10, -24, 20, 19).fill({ color: '#c8b68d' }).stroke({ color: '#5b4636', width: 2 });
        marker.moveTo(-7, -19).lineTo(2, -17).lineTo(7, -11).stroke({ color: '#866c4d', width: 1.5 });
        marker.circle(-1, -14, 3).stroke({ color: '#986f4f', width: 1.5 });
      } else if (pickup.id.includes('gold')) {
        marker.moveTo(-9, -17).lineTo(-6, -5).lineTo(6, -5).lineTo(9, -17).lineTo(3, -22).lineTo(-3, -22).closePath()
          .fill({ color: '#866244' }).stroke({ color: '#d8ad69', width: 2 });
        marker.circle(0, -12, 5).fill({ color: '#e0b75a' }).stroke({ color: '#fff0a3', width: 1 });
      } else {
        marker.circle(0, -8, 13).fill({ color: '#d6a842', alpha: .18 });
        marker.moveTo(0, -22).lineTo(10, -12).lineTo(0, -2).lineTo(-10, -12).closePath().fill({ color: '#e4bd62' }).stroke({ color: '#fff0b5', width: 2 });
        marker.circle(0, -12, 3).fill({ color: '#fff3c0' });
      }
      root.addChild(marker); const point = this.cellToPixel(pickup.cell, pickup.surfaceId); root.position.set(point.x, point.y); root.zIndex = Math.round(point.y) + 2;
      this.dynamic.addChild(root); this.pickupViews.set(pickup.id, root);
    }
  }

  private tokenFrameUrls(tokenId: string) { return Object.values(this.campaign.tokenAnimations[tokenId] ?? {}).flatMap(animation => animation.frames.map(frame => typeof frame === 'string' ? frame : frame.url)); }
  private animationFor(tokenId: string, state: string) { return this.campaign.tokenAnimations[tokenId]?.[state] ?? null; }
  private cameraRelativeFacing(facing: Facing): Facing {
    const worldFacingStep = facingDirections.indexOf(facing);
    return facingDirections[normalizeCameraOrientation(worldFacingStep - this.cameraOrientationStep)]!;
  }
  private playCombatTokenAnimation(event: CombatEvent) {
    if (event.actorId) this.playTokenAnimation(event.actorId, event.animation ?? 'attack', 700);
    if (event.targetId && (event.kind === 'damage' || event.kind === 'defeat')) this.playTokenAnimation(event.targetId, 'hit', 460);
  }
  private activeTokenState(view: TokenView, now: number) {
    const conditions = new Set(view.entity.conditions ?? []);
    if (view.entity.defeated || conditions.has('inconsciente') && this.animationFor(view.entity.tokenId, 'defeated')) return 'defeated';
    if (conditions.has('derribada') && this.animationFor(view.entity.tokenId, 'prone')) return view.entity.moving && this.animationFor(view.entity.tokenId, 'crawl') ? 'crawl' : 'prone';
    if (view.animationState && now < view.animationUntil) return view.animationState;
    if (view.entity.moving) {
      const suffix = facingSuffix[this.cameraRelativeFacing(view.entity.facing)], facing = `direction-${suffix}`;
      const movement = this.snapshot?.combat.movement, participant = this.snapshot?.combat.participants.find(item => item.id === view.entity.id);
      const normalSquares = participant ? Math.floor(participant.speedMeters / 1.5) : 0;
      if (movement?.actorId === view.entity.id && movement.maximumSquares > normalSquares) {
        if (this.animationFor(view.entity.tokenId, `running-${suffix}`)) return `running-${suffix}`;
        if (this.animationFor(view.entity.tokenId, 'running')) return 'running';
      }
      if (this.animationFor(view.entity.tokenId, facing)) return facing;
      return 'moving';
    }
    return this.snapshot?.combat.active ? 'combat-idle' : 'idle';
  }
  private updateTokenFrame(view: TokenView, now: number) {
    const state = this.activeTokenState(view, now), animation = this.animationFor(view.entity.tokenId, state);
    const base = this.campaign.tokens[view.entity.tokenId] ?? Object.values(this.campaign.tokens)[0]!;
    const frame = animation ? animation.frames[Math.floor((now - (state === view.animationState ? view.animationStartedAt : 0)) / (1000 / animation.fps)) % animation.frames.length]! : base.url;
    const key = typeof frame === 'string' ? frame : `${frame.url}#${frame.x},${frame.y},${frame.width},${frame.height}`;
    if (view.frameUrl !== key) {
      if (typeof frame === 'string') view.sprite.texture = Texture.from(frame);
      else {
        let cropped = this.croppedTokenFrames.get(key);
        if (!cropped) {
          cropped = new Texture({ source: Texture.from(frame.url).source, frame: new Rectangle(frame.x, frame.y, frame.width, frame.height) });
          this.croppedTokenFrames.set(key, cropped);
        }
        view.sprite.texture = cropped;
      }
      view.sprite.width = typeof frame === 'string' ? base.logicalWidth : frame.logicalWidth ?? base.logicalWidth;
      view.sprite.height = typeof frame === 'string' ? base.logicalHeight : frame.logicalHeight ?? base.logicalHeight;
      view.sprite.anchor.y = typeof frame === 'string' ? base.anchorY : frame.anchorY ?? base.anchorY;
      view.frameUrl = key;
    }
  }
  private updateConditionArt(view: TokenView) {
    const condition = conditionPriority.find(candidate => view.entity.conditions?.includes(candidate));
    const art = condition ? conditionArt[condition] : null;
    view.conditionVfx.visible = Boolean(art); view.conditionIcon.visible = Boolean(art);
    if (!art) return;
    if (view.conditionVfxUrl !== art.vfx) { view.conditionVfx.texture = Texture.from(art.vfx); view.conditionVfxUrl = art.vfx; }
    if (view.conditionIconUrl !== art.icon) { view.conditionIcon.texture = Texture.from(art.icon); view.conditionIconUrl = art.icon; }
    const span = Math.max(view.sprite.width, view.sprite.height);
    view.conditionVfx.width = span * 1.18; view.conditionVfx.height = span * 1.18; view.conditionVfx.position.set(0, -view.sprite.height * .42);
    view.conditionIcon.width = 22; view.conditionIcon.height = 22; view.conditionIcon.position.set(view.sprite.width * .34, -view.sprite.height * .8);
  }

  private terrainTokenScale(view: TokenView) {
    const camera = this.terrainView?.camera;
    if (!camera) return 1;
    const top = camera.orthoTop, bottom = camera.orthoBottom;
    if (top === null || bottom === null) return 1;
    const viewHeight = top - bottom;
    if (!Number.isFinite(viewHeight) || viewHeight <= 0 || this.app.screen.height <= 0 || view.sprite.height <= 0) return 1;
    const asset = this.campaign.tokens[view.entity.tokenId];
    const worldHeightMeters = asset?.worldHeightMeters ?? 1.65;
    const pixelsPerMeter = this.app.screen.height / viewHeight;
    return worldHeightMeters * pixelsPerMeter / view.sprite.height;
  }

  private upsertEntity(entity: PublicEntity) {
    let view = this.tokenViews.get(entity.id);
    if (!view) {
      const asset = this.campaign.tokens[entity.tokenId] ?? Object.values(this.campaign.tokens)[0]!; const root = new Container();
      const ring = new Graphics().ellipse(0, 7, 27, 12).fill({ color: entity.color, alpha: 0.28 }).stroke({ color: entity.color, width: 4, alpha: 0.98 });
      const sprite = Sprite.from(asset.url); sprite.anchor.set(asset.anchorX, asset.anchorY); sprite.width = asset.logicalWidth; sprite.height = asset.logicalHeight;
      const conditionVfx = new Sprite(Texture.EMPTY), conditionIcon = new Sprite(Texture.EMPTY), effects = new Graphics(), health = new Graphics(), states = new Graphics(); conditionVfx.anchor.set(.5); conditionIcon.anchor.set(.5); root.addChild(ring, sprite, conditionVfx, effects, health, states, conditionIcon); this.dynamic.addChild(root); view = { root, ring, sprite, conditionVfx, conditionIcon, effects, health, states, entity, phase: Math.random() * Math.PI * 2, animationState: null, animationStartedAt: 0, animationUntil: 0, frameUrl: asset.url, conditionVfxUrl: null, conditionIconUrl: null }; this.tokenViews.set(entity.id, view);
    }
    const asset = this.campaign.tokens[entity.tokenId] ?? Object.values(this.campaign.tokens)[0]!;
    view.sprite.texture = Texture.from(asset.url); view.frameUrl = asset.url; view.sprite.anchor.set(asset.anchorX, asset.anchorY); view.sprite.width = asset.logicalWidth; view.sprite.height = asset.logicalHeight;
    view.entity = entity; view.ring.tint = entity.color;
    this.updateTokenFrame(view, performance.now());
    view.root.scale.set(this.terrainTokenScale(view));
    view.health.clear();
    const visible = this.snapshot?.combat.active && entity.hp !== undefined && entity.maxHp !== undefined;
    view.health.visible = Boolean(visible);
    if (visible) {
      const ratio = Math.max(0, Math.min(1, entity.hp! / Math.max(1, entity.maxHp!)));
      const top = -view.sprite.height * view.sprite.anchor.y;
      view.health.roundRect(-28, top - 18, 56, 8, 3).fill({ color: '#160b0b', alpha: .9 });
      view.health.roundRect(-26, top - 16, 52 * ratio, 4, 2).fill({ color: ratio > .5 ? '#55c978' : ratio > .25 ? '#e0b34f' : '#d85656' });
    }
    const colors: Record<string, string> = { envenenada: '#54c978', apresada: '#a56de8', agarrada: '#4d9ee8', derribada: '#e6953f', asustada: '#e6cc45', inconsciente: '#252525', oculta: '#e8e8e8', invisible: '#a9e8ff', restringida: '#a56de8' };
    const stateTop = -view.sprite.height * view.sprite.anchor.y;
    view.states.clear(); (entity.conditions ?? []).slice(0, 3).forEach((condition, index) => view.states.circle(21 - index * 9, stateTop - 5, 4).fill({ color: colors[condition] ?? '#ffffff' }).stroke({ color: '#071115', width: 1 }));
    const conditions = new Set(entity.conditions ?? []), effect = view.effects; effect.clear();
    if (conditions.has('envenenada')) effect.circle(0, stateTop / 2, Math.max(24, view.sprite.width * .25)).fill({ color: '#54c978', alpha: .18 });
    if (conditions.has('apresada')) { for (let x = -18; x <= 18; x += 12) effect.moveTo(x, 8).lineTo(x - 8, -44).stroke({ color: '#9c6b42', width: 3, alpha: .9 }); }
    if (conditions.has('agarrada')) effect.roundRect(-25, -5, 50, 18, 8).stroke({ color: '#4d9ee8', width: 3, alpha: .9 });
    if (conditions.has('asustada')) effect.poly([0, stateTop - 8, -9, stateTop + 8, 9, stateTop + 8]).fill({ color: '#e6cc45', alpha: .85 });
    if (conditions.has('derribada') || conditions.has('inconsciente')) effect.ellipse(0, 8, 32, 10).fill({ color: conditions.has('inconsciente') ? '#252525' : '#e6953f', alpha: .3 });
  }

  private variantFor(object: MapObject): VisualAsset | null {
    if (!object.assetId) return null; const catalog = this.campaign.props[object.assetId]; if (!catalog) return null;
    const key = object.kind === 'wheel'
      ? object.structure === 'destroyed' ? `debris:${object.rotation}` : object.attachment === 'attached' ? `attached:${object.structure}` : `detached:${object.state}:${object.structure}:${object.rotation}`
      : object.kind === 'door' ? object.structure === 'destroyed' ? 'destroyed' : `${object.structure}:${object.state === 'open' ? 'open' : 'closed'}`
      : `${object.structure}:${object.rotation}`;
    return catalog.variants[key] ?? null;
  }

  private mountVariant(object: Extract<MapObject, { kind: 'wheel' }>): VisualAsset | null {
    return this.campaign.props[object.mount.assetId]?.variants.default ?? null;
  }

  private upsertPropView(id: string, asset: VisualAsset | null) {
    let view = this.propViews.get(id);
    if (!view) { const root = new Container(); this.dynamic.addChild(root); view = { root, sprite: null, variantUrl: null }; this.propViews.set(id, view); }
    if (view.variantUrl !== asset?.url) {
      view.sprite?.destroy(); view.sprite = null; view.variantUrl = asset?.url ?? null;
      if (asset) { view.sprite = Sprite.from(asset.url); view.root.addChild(view.sprite); }
    }
    if (asset && view.sprite) { view.sprite.anchor.set(asset.anchorX, asset.anchorY); view.sprite.width = asset.logicalWidth; view.sprite.height = asset.logicalHeight; }
    return view;
  }

  private async renderProps(props: PublicProp[], connection: number, request: number) {
    if (this.terrainScene && this.terrainView && this.scene?.terrain) {
      this.renderTerrainProps(props);
      return;
    }
    const live = new Set(props.flatMap(prop => prop.kind === 'wheel' ? [prop.id, `${prop.id}:mount`] : [prop.id]));
    for (const [id, view] of this.propViews) if (!live.has(id)) { view.root.destroy({ children: true }); this.propViews.delete(id); }
    const assets = props.flatMap(object => object.kind === 'wheel' ? [this.mountVariant(object), this.variantFor(object)] : [this.variantFor(object)]).filter((asset): asset is VisualAsset => Boolean(asset));
    await Promise.all([...new Set(assets.map(asset => asset.url))].map(url => Assets.load<Texture>(url)));
    if (connection !== this.connectionGeneration || request !== this.requestGeneration) return;
    for (const object of props) {
      if (object.kind === 'wheel') {
        const mountView = this.upsertPropView(`${object.id}:mount`, this.mountVariant(object)); const mountCenter = this.cellToPixel(object.mount.cell, object.surfaceId);
        mountView.root.position.set(mountCenter.x, mountCenter.y); mountView.root.zIndex = Math.round(mountCenter.y) - 2;
      }
      const asset = this.variantFor(object); const view = this.upsertPropView(object.id, asset); const center = this.objectCenter(object);
      view.root.position.set(center.x, center.y); view.root.zIndex = Math.round(center.y + (asset?.sortOffsetY ?? 0)) - (object.structure === 'destroyed' ? 12 : 0);
    }
  }

  private renderTerrainProps(props: PublicProp[]) {
    const scene = this.terrainScene!, terrain = this.scene!.terrain!, tileMeters = terrain.tileMeters;
    const live = new Set(props.map(prop => prop.id));
    for (const [id, mesh] of this.terrainProps) if (!live.has(id)) { mesh.dispose(); this.terrainProps.delete(id); }
    for (const prop of props) {
      if (prop.id === 'a4-library-door' && this.retreatVisuals) {
        this.retreatVisuals.openLibraryDoor(prop.kind === 'door' && prop.state === 'open');
        continue;
      }
      let mesh = this.terrainProps.get(prop.id);
      const occupied = footprintFor(prop.cell, prop.rotation, prop.footprint);
      const minCol = Math.min(...occupied.map(cell => cell.col)), maxCol = Math.max(...occupied.map(cell => cell.col));
      const minRow = Math.min(...occupied.map(cell => cell.row)), maxRow = Math.max(...occupied.map(cell => cell.row));
      const width = (maxCol - minCol + 1) * tileMeters, depth = (maxRow - minRow + 1) * tileMeters;
      if (this.sceneId === 'wreck-ship') {
        const visualKey = shipPropVisualKey(prop);
        if (mesh?.metadata?.visualKey !== visualKey) { mesh?.dispose(false, false); mesh = undefined; }
        if (!mesh) {
          mesh = buildShipPropVisual(scene, prop, width, depth, this.shipPropWoodTexture ?? undefined);
          this.terrainProps.set(prop.id, mesh);
        }
        const floor = terrainTile(terrain, { surfaceId: prop.surfaceId, cell: prop.cell });
        const floorHeight = floor ? surfaceHeight(terrain, { surfaceId: prop.surfaceId, cell: prop.cell }) : 0;
        mesh.position.set((minCol + maxCol + 1) * tileMeters / 2, floorHeight,
          (minRow + maxRow + 1) * tileMeters / 2);
        mesh.metadata = { visualKey, surfaceId: prop.surfaceId, cell: prop.cell,
          destroyed: prop.structure === 'destroyed', floorHeight, bottom: floorHeight };
        mesh.setEnabled(prop.structure !== 'destroyed');
        continue;
      }
      if (!mesh) {
        mesh = MeshBuilder.CreateBox(`prop:${prop.id}`, { size: 1 }, scene);
        const material = new StandardMaterial(`prop-material:${prop.id}`, scene);
        material.diffuseColor = Color3.FromHexString(prop.kind === 'door' ? '#b99259' : '#655740');
        (mesh as Mesh).material = material; (mesh as Mesh).isPickable = false;
        this.terrainProps.set(prop.id, mesh);
      }
      const open = prop.kind === 'door' && prop.state === 'open';
      mesh.setEnabled(prop.structure !== 'destroyed');
      mesh.scaling.set(prop.kind === 'door' ? (open ? .55 : .18) : width * .8,
        prop.kind === 'door' ? 2.1 : .8,
        prop.kind === 'door' ? (open ? .18 : tileMeters * .88) : depth * .8);
      const floor = terrainTile(terrain, { surfaceId: prop.surfaceId, cell: prop.cell });
      const floorHeight = floor ? surfaceHeight(terrain, { surfaceId: prop.surfaceId, cell: prop.cell }) : 0;
      mesh.position.set((minCol + maxCol + 1) * tileMeters / 2 + (open ? -.55 : 0), floorHeight + mesh.scaling.y / 2,
        (minRow + maxRow + 1) * tileMeters / 2 + (open ? -.5 : 0));
      mesh.metadata = { surfaceId: prop.surfaceId, cell: prop.cell, destroyed: prop.structure === 'destroyed', floorHeight, bottom: floorHeight };
    }
  }

  private objectCenter(object: MapObject) {
    if (object.kind === 'wheel') return this.cellToPixel(object.cell, object.surfaceId);
    const cells = footprintFor(object.cell, object.rotation, object.footprint); const minCol = Math.min(...cells.map(cell => cell.col)), maxCol = Math.max(...cells.map(cell => cell.col)); const minRow = Math.min(...cells.map(cell => cell.row)), maxRow = Math.max(...cells.map(cell => cell.row));
    return this.cellToPixel({ col: (minCol + maxCol) / 2, row: (minRow + maxRow) / 2 }, object.surfaceId);
  }

  private drawFootprint(graphics: Graphics, object: DmObject, color: string, alpha: number) {
    const grid = this.scene?.grid; if (!grid) return;
    for (const cell of footprintFor(object.cell, object.rotation, object.footprint)) {
      if (this.terrainView || (this.sceneId && hasWreckProjection(this.sceneId))) this.traceProjectedCell(graphics, cell.col, cell.row, object.surfaceId);
      else graphics.rect(grid.originX + cell.col * grid.tileSize + 2, grid.originY + cell.row * grid.tileSize + 2, grid.tileSize - 4, grid.tileSize - 4);
      graphics.fill({ color, alpha }).stroke({ color, width: 3, alpha: 0.95 });
    }
  }

  private drawSelection() {
    this.selection.clear();
    if (this.selectedObject) this.drawFootprint(this.selection, this.selectedObject, '#ffd36a', 0.15);
  }

  private redrawProjectedOverlays() {
    this.drawReachable(); this.drawAttackRange(); this.drawSelection();
    this.previewCells.clear();
    if (this.previewObject) this.drawFootprint(this.previewCells, this.previewObject, this.previewValid ? '#63e6a5' : '#ff6868', 0.32);
    if (this.previewObject && this.previewSprite.visible) {
      const center = this.objectCenter(this.previewObject); this.previewSprite.position.set(center.x, center.y);
    }
  }

  private cameraPreferenceKey(sceneId: string) { return `dungeons.camera-orientation.v1:${this.campaign.campaignId}:${sceneId}`; }
  private cameraTiltPreferenceKey(sceneId: string) { return `dungeons.camera-tilt.v1:${this.campaign.campaignId}:${sceneId}`; }
  private readCameraTilt(sceneId: string) {
    if (!this.options.persistCameraPreferences) return null;
    const stored = Number(localStorage.getItem(this.cameraTiltPreferenceKey(sceneId)));
    return Number.isFinite(stored) && stored >= CAMERA_TILT_MIN_DEGREES && stored <= CAMERA_TILT_MAX_DEGREES ? stored : null;
  }
  private readCameraOrientation(sceneId: string) {
    if (this.options.persistCameraPreferences) {
      const stored = Number(localStorage.getItem(this.cameraPreferenceKey(sceneId)));
      if (Number.isInteger(stored) && stored >= 0 && stored < CAMERA_ORIENTATION_COUNT) return stored;
    }
    return this.sharedCameraOrientations.get(sceneId) ?? 0;
  }
  private restoreCameraOrientation(sceneId: string) { this.cameraOrientationStep = this.readCameraOrientation(sceneId); }
  private saveCameraOrientation(sceneId: string, step: number) {
    if (this.options.persistCameraPreferences) localStorage.setItem(this.cameraPreferenceKey(sceneId), String(step));
  }

  private cellToPixel(cell: Cell, surfaceId = this.scene?.surfaceId) { const grid = this.scene!.grid; return this.projectedPoint(cell.col + .5, cell.row + .5, surfaceId) ?? { x: grid.originX + (cell.col + 0.5) * grid.tileSize, y: grid.originY + (cell.row + 0.5) * grid.tileSize }; }
  private stepProgress(entity: PublicEntity) { return !entity.step ? 1 : Math.max(0, Math.min(1, (Date.now() - this.clockOffset - entity.step.startedAt) / entity.step.durationMs)); }
  private interpolatedCell(entity: PublicEntity) { if (!entity.step) return entity.cell; const progress = this.stepProgress(entity); return { col: entity.step.from.col + (entity.step.to.col - entity.step.from.col) * progress, row: entity.step.from.row + (entity.step.to.row - entity.step.from.row) * progress }; }
  private interpolatedScreenPoint(entity: PublicEntity) {
    const step = entity.step, progress = this.stepProgress(entity);
    if (step && step.fromSurfaceId && step.toSurfaceId && step.fromSurfaceId !== step.toSurfaceId) {
      const from = this.cellToPixel(step.from, step.fromSurfaceId), to = this.cellToPixel(step.to, step.toSurfaceId);
      return { x: from.x + (to.x - from.x) * progress, y: from.y + (to.y - from.y) * progress };
    }
    return this.cellToPixel(this.interpolatedCell(entity), entity.surfaceId);
  }
  private interpolatedWorldPosition(entity: PublicEntity) {
    const terrain = this.scene?.terrain;
    if (!terrain) return new Vector3(entity.cell.col + .5, 0, entity.cell.row + .5);
    const point = (cell: Cell, surfaceId: string) => {
      const address = { surfaceId, cell }, height = terrainTile(terrain, address) ? surfaceHeight(terrain, address) : 0;
      return new Vector3((cell.col + .5) * terrain.tileMeters, height, (cell.row + .5) * terrain.tileMeters);
    };
    const step = entity.step, progress = this.stepProgress(entity);
    if (step) return Vector3.Lerp(point(step.from, step.fromSurfaceId ?? entity.surfaceId),
      point(step.to, step.toSurfaceId ?? entity.surfaceId), progress);
    return point(entity.cell, entity.surfaceId);
  }

  private zoomFocusEntity() {
    const focusId = this.localId ?? this.selectedEntityId ?? (this.cameraFocusScreenPoint ? null : this.snapshot?.camera.focusId);
    return focusId ? this.snapshot?.entities.find(entity => entity.id === focusId) : undefined;
  }
  private flatZoomAnchor() {
    const entity = this.zoomFocusEntity(), view = entity ? this.tokenViews.get(entity.id) : undefined;
    if (this.cameraCurrent.scale <= 0) return null;
    const pitch = this.cameraPitch();
    if (view) return { x: (view.root.x - this.cameraCurrent.x) * this.cameraCurrent.scale, y: (view.root.y - this.cameraCurrent.y) * this.cameraCurrent.scale * pitch };
    if (this.cameraFocusScreenPoint) return { x: (this.cameraFocusScreenPoint.x - this.cameraCurrent.x) * this.cameraCurrent.scale, y: (this.cameraFocusScreenPoint.y - this.cameraCurrent.y) * this.cameraCurrent.scale * pitch };
    return null;
  }
  private applyFlatZoom(nextZoom: number, pointX: number, pointY: number) {
    const previousZoom = this.cameraZoom, oldScale = this.cameraCurrent.scale, newScale = oldScale * nextZoom / previousZoom;
    if (oldScale > 0 && newScale > 0) {
      const pitch = this.cameraPitch();
      const offsetX = pointX * (1 / oldScale - 1 / newScale), offsetY = pointY * (1 / (oldScale * pitch) - 1 / (newScale * pitch));
      this.cameraCurrent.x += offsetX; this.cameraCurrent.y += offsetY;
      this.cameraOffset.x += offsetX; this.cameraOffset.y += offsetY;
      this.cameraCurrent.scale = newScale;
    }
    this.cameraZoom = nextZoom;
  }
  private focusTerrainZoomOnTarget() {
    const terrain = this.scene?.terrain, entity = this.zoomFocusEntity();
    if (!terrain || (!entity && !this.cameraFocusWorldPoint) || this.cameraZoom <= this.cameraBaseZoom + 0.01 || this.snapshot?.camera.mode !== 'fixed') {
      this.terrainCameraOffset = { x: 0, y: 0, z: 0 };
      return;
    }
    const position = entity ? this.interpolatedWorldPosition(entity) : this.cameraFocusWorldPoint!;
    this.terrainCameraOffset = {
      x: position.x - terrain.cols * terrain.tileMeters / 2,
      y: position.y + .85 - .8,
      z: position.z - terrain.rows * terrain.tileMeters / 2
    };
  }
  private zoomAtPointer(event: WheelEvent) {
    if (!this.snapshot || !this.scene || !this.host.clientWidth || !this.host.clientHeight) return;
    event.preventDefault();
    const nextZoom = Math.max(CAMERA_ZOOM_MIN, Math.min(CAMERA_ZOOM_MAX, this.cameraZoom * Math.exp(-event.deltaY * .0015)));
    if (Math.abs(nextZoom - this.cameraZoom) < .001) return;
    if (this.terrainView) {
      this.cameraZoom = nextZoom; this.focusTerrainZoomOnTarget();
      this.updateCamera(0); this.drawReachable(); this.drawAttackRange(); return;
    }
    const focusAnchor = this.flatZoomAnchor();
    const rect = this.app.canvas.getBoundingClientRect();
    const pointX = focusAnchor?.x ?? event.clientX - rect.left - rect.width / 2;
    const pointY = focusAnchor?.y ?? event.clientY - rect.top - rect.height / 2;
    this.applyFlatZoom(nextZoom, pointX, pointY);
  }

  private animate(deltaMs: number) {
    if (!this.snapshot || !this.scene) return; const time = performance.now() / 1000; this.waves.x = Math.sin(time * 0.55) * 12; this.waves.y = Math.cos(time * 0.42) * 3;
    this.waterShimmer.alpha = .55 + Math.sin(time * 1.8) * .3; this.waterShimmer.x = Math.sin(time * .8) * 7;
    this.wind.x = Math.sin(time * .35) * 28; this.wind.alpha = .45 + Math.sin(time * .7) * .18;
    if (this.terrainView) { this.drawShipWind(time); this.drawBoatWake(time); this.animateShipLights(time); }
    for (const [id, root] of this.pickupViews) { root.rotation = Math.sin(time * 1.5 + id.length) * .025; if (this.terrainView) { const pickup = this.snapshot.scene.pickups?.find(item => item.id === id); if (pickup) { const point = this.cellToPixel(pickup.cell, pickup.surfaceId); root.position.set(point.x, point.y); } } }
    if (this.snapshot.environment.storm) { const intensity = this.snapshot.environment.stormIntensity, lightning = this.snapshot.environment.lightning ? Math.max(0, Math.sin(time * .9 - 1.25)) * intensity * .24 : 0; this.storm.alpha = .12 + intensity * .66 + lightning; this.rain.alpha = .1 + intensity * .72; this.rain.x = (time * (6 + intensity * 24)) % 86; this.rain.y = (time * (16 + intensity * 64)) % 48; this.rainNear.alpha = Math.max(0, intensity - .16) * .95; this.rainNear.x = (time * (14 + intensity * 42)) % 142; this.rainNear.y = (time * (32 + intensity * 95)) % 86; }
    const cameraFocusId = this.localId ?? this.snapshot.camera.focusId;
    const cameraFocus = cameraFocusId ? this.snapshot.entities.find(entity => entity.id === cameraFocusId) : undefined;
    for (const view of this.tokenViews.values()) {
      const now = performance.now(), position = this.interpolatedScreenPoint(view.entity), conditions = new Set(view.entity.conditions ?? []), selected = view.entity.id === this.selectedEntityId;
      this.updateTokenFrame(view, now); this.updateConditionArt(view);
      view.phase += deltaMs * (view.entity.moving ? 0.018 : 0.003);
      view.root.position.set(position.x, position.y + Math.sin(view.phase) * (view.entity.moving ? 3 : 1));
      // Keep the sprite's physical height stable in map units, regardless of
      // its PNG/frame pixel dimensions or the current orthographic zoom.
      view.root.scale.set(this.terrainTokenScale(view));
      // Passengers share the boat's cell. Keep its hull behind their sprites
      // even when Pixi's stable sort would otherwise draw the later NPC last.
      view.root.zIndex = Math.round(position.y) - (view.entity.tokenId === 'wreck-rowboat' ? 2 : 0);
      view.root.visible = this.entityVisibleFromFocus(view.entity, cameraFocus);
      const visualFacing = this.cameraRelativeFacing(view.entity.facing), directional = this.animationFor(view.entity.tokenId, `direction-${facingSuffix[visualFacing]}`);
      const activeAnimation = this.animationFor(view.entity.tokenId, this.activeTokenState(view, now));
      const flipX = activeAnimation?.flipX ?? (visualFacing === 'west' && !directional);
      view.sprite.scale.x = Math.abs(view.sprite.scale.x) * (flipX ? -1 : 1);
      view.root.alpha = view.entity.defeated ? .36 : conditions.has('invisible') ? .2 : conditions.has('oculta') ? .45 : 1;
      view.ring.tint = selected ? '#ffd36a' : view.entity.color;
      view.ring.alpha = selected ? 1 : view.entity.id === this.snapshot?.combat.currentId ? 1 : view.entity.id === this.localId ? .9 : .65;
      view.ring.scale.set(selected ? 1.18 : 1);
    }
    if (this.campVisuals && this.sceneId) {
      const campRest = this.snapshot.campRest?.sceneId === this.sceneId ? this.snapshot.campRest : null;
      this.campVisuals.update(performance.now() / 1000, campRest?.phase ?? null, campRest?.interactions ?? []);
    }
    this.updateCamera(deltaMs);
  }

  private updateCamera(deltaMs = 0) {
    if (!this.snapshot || !this.scene || !this.host.clientWidth || !this.host.clientHeight) return; const grid = this.scene.grid, viewWidth = this.host.clientWidth, viewHeight = this.host.clientHeight;
    if (this.sceneId !== 'wreck-ship') {
      if (this.stairMarker) this.stairMarker.style.display = 'none';
      if (this.stairPin) this.stairPin.style.display = 'none';
    }
    if (this.terrainView && this.scene.terrain) {
      const camera = this.terrainView.camera, terrain = this.scene.terrain, aspect = viewWidth / viewHeight;
      const followsCameraFocus = !this.snapshot.combat.active && this.snapshot.camera.mode !== 'fixed';
      const cameraFocusId = this.localId ?? this.selectedEntityId ?? this.snapshot.camera.focusId;
      const cameraFocus = followsCameraFocus && cameraFocusId ? this.snapshot.entities.find(entity => entity.id === cameraFocusId) : undefined;
      const halfHeight = Math.max(terrain.rows * terrain.tileMeters * .75, terrain.cols * terrain.tileMeters / (2 * aspect)) * 1.2 / this.cameraZoom * (cameraFocus ? .72 : 1);
      camera.orthoTop = halfHeight; camera.orthoBottom = -halfHeight;
      camera.orthoLeft = -halfHeight * aspect; camera.orthoRight = halfHeight * aspect;
      const alphaTarget = TERRAIN_CAMERA_INITIAL_ALPHA + this.cameraOrientationStep * CAMERA_ORIENTATION_STEP;
      const previousAlpha = camera.alpha;
      if (!this.cameraOrientationInitialized) { camera.alpha = alphaTarget; this.cameraOrientationInitialized = true; }
      else if (deltaMs > 0) {
        const difference = Math.atan2(Math.sin(alphaTarget - camera.alpha), Math.cos(alphaTarget - camera.alpha));
        const blend = 1 - Math.pow(0.002, deltaMs / 1000);
        camera.alpha = Math.abs(difference) < 0.001 ? alphaTarget : camera.alpha + difference * blend;
      }
      const cameraAngleChanged = Math.abs(camera.alpha - previousAlpha) > 0.0001;
      const betaTarget = (90 - this.cameraTiltDegrees) * Math.PI / 180;
      const previousBeta = camera.beta;
      if (deltaMs <= 0) camera.beta = betaTarget;
      else {
        const blend = 1 - Math.pow(.002, deltaMs / 1000);
        camera.beta += (betaTarget - camera.beta) * blend;
      }
      const cameraTiltChanged = Math.abs(camera.beta - previousBeta) > 0.0001;
      const wreckView = this.sceneId?.startsWith('wreck-') ?? false;
      const visibilityFocusId = this.localId ?? this.snapshot.camera.focusId;
      const visibilityFocus = wreckView && visibilityFocusId ? this.snapshot.entities.find(entity => entity.id === visibilityFocusId) : undefined;
      let target = new Vector3(terrain.cols * terrain.tileMeters / 2, .8, terrain.rows * terrain.tileMeters / 2);
      if (cameraFocus) {
        const position = this.interpolatedWorldPosition(cameraFocus);
        target = new Vector3(position.x, position.y + .85, position.z);
        if (this.snapshot.camera.mode === 'semiFixed') {
          const centerX = terrain.cols * terrain.tileMeters / 2, centerZ = terrain.rows * terrain.tileMeters / 2;
          const followX = terrain.cols * terrain.tileMeters * .18, followZ = terrain.rows * terrain.tileMeters * .18;
          target.x = Math.max(centerX - followX, Math.min(centerX + followX, target.x));
          target.z = Math.max(centerZ - followZ, Math.min(centerZ + followZ, target.z));
        }
      } else if (!this.snapshot.combat.active && this.snapshot.camera.mode === 'fixed') {
        const zoomTarget = this.cameraZoom > this.cameraBaseZoom + 0.01 ? this.zoomFocusEntity() : undefined;
        if (zoomTarget) {
          const position = this.interpolatedWorldPosition(zoomTarget);
          target = new Vector3(position.x, position.y + .85, position.z);
        } else {
          target.addInPlace(new Vector3(this.terrainCameraOffset.x, this.terrainCameraOffset.y, this.terrainCameraOffset.z));
        }
      }
      if (!this.terrainCameraInitialized || deltaMs <= 0) {
        camera.target.copyFrom(target); this.terrainCameraInitialized = true;
      } else {
        // Follow eases toward the selected focus. Semi-fixed uses the same
        // easing but clamps its travel to the central portion of the map.
        const blend = 1 - Math.pow(.002, deltaMs / 1000);
        camera.target.copyFrom(Vector3.Lerp(camera.target, target, blend));
      }
      this.updateDeckCutaway(visibilityFocus);
      camera.getViewMatrix(true); camera.getProjectionMatrix(true);
      this.terrainScene?.updateTransformMatrix();
      this.updateStairMarker(visibilityFocus);
      if (cameraAngleChanged || cameraTiltChanged) this.redrawProjectedOverlays();
      this.map.scale.set(1); this.map.position.set(0); this.cameraInitialized = true;
      return;
    }
    const combatFrame = this.snapshot.combat.active ? combatCameraFrame(grid, { width: viewWidth, height: viewHeight }) : null;
    const pitch = this.cameraPitch();
    const fit = Math.min(viewWidth / grid.width, viewHeight / (grid.height * pitch)); let scale = combatFrame?.scale ?? fit; let target = { x: grid.width / 2, y: grid.height / 2 }; let center = { x: combatFrame?.centerX ?? viewWidth / 2, y: combatFrame?.centerY ?? viewHeight / 2 }; const focusId = this.localId ?? this.selectedEntityId ?? this.snapshot.camera.focusId;
    // En combate siempre se usa el plano fijo oblicuo. Fuera de combate se
    // conserva el seguimiento que haya elegido el DM para la exploración.
    if (!combatFrame && this.snapshot.camera.mode !== 'fixed' && focusId) { const view = this.tokenViews.get(focusId); if (view) { target = { x: view.root.x, y: view.root.y }; if (this.snapshot.camera.mode === 'semiFixed') { target.x = Math.max(grid.width / 2 - 260, Math.min(grid.width / 2 + 260, target.x)); target.y = Math.max(grid.height / 2 - 150, Math.min(grid.height / 2 + 150, target.y)); } } scale = Math.max(fit, Math.min(1.1, viewWidth / 850)); }
    target.x += this.cameraOffset.x; target.y += this.cameraOffset.y; scale *= this.cameraZoom;
    if (!this.cameraInitialized) { this.cameraCurrent = { ...target, scale }; this.cameraInitialized = true; }
    else if (deltaMs > 0) { const alpha = 1 - Math.pow(0.002, deltaMs / 1000); this.cameraCurrent.x += (target.x - this.cameraCurrent.x) * alpha; this.cameraCurrent.y += (target.y - this.cameraCurrent.y) * alpha; this.cameraCurrent.scale += (scale - this.cameraCurrent.scale) * alpha; }
    const current = this.cameraCurrent; this.map.scale.set(current.scale, current.scale * pitch); this.map.position.set(center.x - current.x * current.scale, center.y - current.y * current.scale * pitch);
  }

  /** Abre únicamente las paredes de la estancia ocupada para mantener la ficha visible. */
  private updateStairMarker(focus?: PublicEntity) {
    const marker = this.stairMarker, terrain = this.scene?.terrain;
    const pin = this.stairPin;
    const hide = () => { if (marker) marker.style.display = 'none'; if (pin) pin.style.display = 'none'; };
    if (this.options.showStairMarker === false || !marker || this.sceneId !== 'wreck-ship' || !terrain || !this.terrainView) {
      hide();
      return;
    }
    const lowerDeck = focus?.surfaceId === 'lower-deck';
    if (focus && focus.surfaceId !== 'main' && !lowerDeck) { hide(); return; }
    const stair = terrain.structures?.find(item => item.id === (lowerDeck ? 'stairs-c9' : 'stairs-c8'));
    if (!stair) { hide(); return; }
    const point = this.cellToPixel(stair.cell, lowerDeck ? 'lower-deck' : 'main');
    const x = point.x * this.host.clientWidth / this.app.screen.width;
    const y = point.y * this.host.clientHeight / this.app.screen.height;
    if (x < -40 || y < -40 || x > this.host.clientWidth + 40 || y > this.host.clientHeight + 40) {
      hide(); return;
    }
    const label = lowerDeck ? '↓ C9 · bodega' : '↓ C8 · cubierta inferior';
    if (marker.textContent !== label) marker.textContent = label;
    marker.style.transform = `translate3d(${x}px,${y}px,0) translate(${x > this.host.clientWidth - 240 ? '-105%' : '18px'},-105%)`;
    marker.style.display = 'block';
    if (pin) { pin.style.transform = `translate3d(${x}px,${y}px,0) translate(-50%,-50%)`; pin.style.display = 'block'; }
  }

  private updateDeckCutaway(focus?: PublicEntity) {
    if (!this.terrainView || this.sceneId !== 'wreck-ship' || !this.scene?.terrain) return;
    if (this.snapshot?.story?.wreckDisappeared) {
      for (const mesh of this.terrainView.tiles.values()) {
        const address = mesh.metadata?.address as { surfaceId: string } | undefined;
        mesh.isVisible = address?.surfaceId === 'sea';
      }
      for (const [surfaceId, grid] of this.terrainView.grids) grid.isVisible = this.options.showGrid !== false && surfaceId === 'sea';
      for (const detail of this.terrainView.deckDetails) detail.isVisible = detail.metadata?.deckSurfaceId === 'sea';
      for (const mesh of [...this.terrainView.occluders, ...this.terrainView.structures]) mesh.isVisible = false;
      for (const prop of this.terrainProps.values()) prop.setEnabled(false);
      for (const pickup of this.pickupViews.values()) pickup.visible = false;
      return;
    }
    const focusPosition = focus ? this.interpolatedWorldPosition(focus) : null;
    const opensOverhead = focus?.surfaceId === 'lower-deck' || focus?.surfaceId === 'hold-air';
    const visibleFloorSurfaces = focus?.surfaceId === 'lower-deck' ? new Set(['lower-deck', 'lower-water'])
      : focus?.surfaceId === 'hold-air' ? new Set(['hold-air', 'hold-water'])
        : new Set(['main', 'c1-hull', 'c2', 'c3', 'crow', 'sea']);
    const cutawayHeight = focusPosition ? focusPosition.y + 1.4 : Number.NEGATIVE_INFINITY;
    for (const [key, mesh] of this.terrainView.tiles) {
      const address = mesh.metadata?.address as { surfaceId: string; cell: Cell } | undefined;
      const tile = address ? terrainTile(this.scene.terrain, address) : null;
      mesh.isVisible = !opensOverhead || !tile || Math.max(...tile.corners) <= cutawayHeight;
    }
    for (const [surfaceId, grid] of this.terrainView.grids) {
      // A grid is one mesh per floor. A single descending ramp tile must not
      // reveal the entire upper-deck grid over C8 or C9.
      grid.isVisible = this.options.showGrid !== false && visibleFloorSurfaces.has(surfaceId);
    }
    for (const detail of this.terrainView.deckDetails) {
      const surfaceId = String(detail.metadata?.deckSurfaceId ?? '');
      detail.isVisible = visibleFloorSurfaces.has(surfaceId);
    }
    for (const mesh of [...this.terrainView.occluders, ...this.terrainView.structures]) {
      const bottom = Number(mesh.metadata?.bottom ?? mesh.metadata?.height ?? Number.NEGATIVE_INFINITY);
      mesh.isVisible = !opensOverhead || bottom <= cutawayHeight;
    }
    const cell = focus?.surfaceId === 'main' ? focus.cell : null;
    const room = cell && cell.col >= 12 && cell.col <= 17 && cell.row >= 3 && cell.row <= 6 ? 'c4'
      : cell && cell.col >= 12 && cell.col <= 17 && cell.row >= 8 && cell.row <= 12 ? 'c5'
      : cell && cell.col >= 27 && cell.col <= 32 && cell.row >= 3 && cell.row <= 6 ? 'c6'
      : cell && cell.col >= 27 && cell.col <= 32 && cell.row >= 8 && cell.row <= 12 ? 'c7' : null;
    const roomBounds = room === 'c4' ? { minCol: 11, maxCol: 18, minRow: 2, maxRow: 7 }
      : room === 'c5' ? { minCol: 11, maxCol: 18, minRow: 7, maxRow: 13 }
        : room === 'c6' ? { minCol: 26, maxCol: 33, minRow: 2, maxRow: 7 }
          : room === 'c7' ? { minCol: 26, maxCol: 33, minRow: 7, maxRow: 13 } : null;
    for (const wall of this.terrainView.occluders) {
      const id = String(wall.metadata?.occluderId ?? '');
      const wallCell = wall.metadata?.cell as Cell | undefined;
      const insideRoomWall = Boolean(roomBounds && wallCell && wallCell.col >= roomBounds.minCol && wallCell.col <= roomBounds.maxCol
        && wallCell.row >= roomBounds.minRow && wallCell.row <= roomBounds.maxRow);
      const bottom = Number(wall.metadata?.bottom ?? Number.NEGATIVE_INFINITY);
      wall.isVisible = (!opensOverhead || bottom <= cutawayHeight) && !(room && insideRoomWall);
    }
    for (const prop of this.terrainProps.values()) {
      const floorHeight = Number(prop.metadata?.floorHeight ?? 0), destroyed = Boolean(prop.metadata?.destroyed);
      prop.setEnabled(!destroyed && (!opensOverhead || floorHeight <= cutawayHeight));
    }
  }
  private entityVisibleFromFocus(entity: PublicEntity, focus?: PublicEntity) {
    if (this.snapshot?.story?.wreckDisappeared && entity.surfaceId !== 'sea') return false;
    if (!focus || this.sceneId !== 'wreck-ship') return true;
    if (focus.surfaceId === 'hold-air') return entity.surfaceId === 'hold-air';
    if (focus.surfaceId === 'lower-deck') return !['main', 'c1-hull', 'c2', 'c3', 'crow', 'hold-air'].includes(entity.surfaceId);
    return !['lower-deck', 'lower-water', 'hold-air', 'hold-water'].includes(entity.surfaceId);
  }
  private cameraPitch() { return this.sceneId === 'wreck-ship' ? .77 : .92; }
}
